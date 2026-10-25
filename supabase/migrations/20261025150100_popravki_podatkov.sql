-- Klubski računi, faza 4: prijave napak v podatkih (popravki), ki preživijo
-- nočni uvoz.
--
-- Prijave o igralcih ("drugo") so bile prosto besedilo in niso šle nikamor:
-- "je obrambni", "3 asistence proti Kiskanizsi", "ne igra več za klub".
-- Zdaj so tri strukturirane vrste:
--
--   pozicija   igralec ima napačno pozicijo (tudi `zapisnik`, kjer glasovanja
--              ni: Slovaška, Avstrija)
--   odhod      igralec ni več v klubu ali je končal
--   asistenca  gol ima napačno ali manjkajočo asistenco (tudi po zaprtem
--              glasovanju)
--
-- Popravek čaka na pregled. Odloči admin (vse) ali klubski račun (le podatki
-- svojega kluba). Popravek admina ali kluba o svojem klubu velja takoj.
-- Uradni podatki imajo prednost: gola, minut in kartonov se ne popravlja,
-- odšel igralec z novim nastopom spet igra (`trg_nastop_obudi_igralca`).
--
-- Preživetje uvoza:
--   pozicija   vir `admin` ali `klub` (klub prek tedenskega
--              `pozicije_klub_cakajo`) uvoz ne povozi
--   odhod      `odsel_at` igralca ne obudi uvoz razporeda ne zapisnika
--   asistenca  uvoz ob spremenjeni vsebini gole tekme pobriše in vpiše znova
--              (`zamenjaj_nastope_tekme`); sprejeti popravek se po ključu gola
--              (minuta, strelec, klub, avtogol, enajstmetrovka) vpiše nazaj.

create table public.popravki_podatkov (
  id                 bigint generated always as identity primary key,
  vrsta              text not null check (vrsta in ('pozicija', 'odhod', 'asistenca')),
  competition_id     bigint not null references public.competitions on delete cascade,
  -- Klub, čigar podatke popravek spreminja: igralčev oziroma klub strelca.
  team_id            bigint not null references public.teams on delete cascade,
  player_id          bigint references public.players on delete cascade,
  pozicija           text check (pozicija in ('GK', 'DEF', 'MID', 'FWD')),
  match_id           bigint references public.matches on delete cascade,
  -- Gol je določen s ključem (tekma, minuta, strelec, klub, avtogol, 11 m), ne z
  -- vrstico: uvoz gole briše in vpiše znova (zamenjaj_nastope_tekme). Stolpec
  -- goal_id bi tudi zlomil pregledano čiščenje MFA (20261021093000).
  gol_minuta         int,
  gol_strelec_id     bigint references public.players on delete set null,
  gol_avtogol        boolean,
  gol_enajstmetrovka boolean,
  asistent_id        bigint references public.players on delete set null,
  opomba             text check (char_length(opomba) <= 300),
  user_id            uuid not null references public.profiles on delete cascade,
  created_at         timestamptz not null default now(),
  stanje             text not null default 'caka' check (stanje in ('caka', 'sprejet', 'zavrnjen')),
  odlocil            uuid references public.profiles on delete set null,
  odloceno_at        timestamptz,
  razlog             text check (char_length(razlog) <= 300),
  check (case vrsta
           when 'pozicija' then player_id is not null and pozicija is not null
           when 'odhod' then player_id is not null
           when 'asistenca' then match_id is not null
         end)
);
create index popravki_podatkov_caka on public.popravki_podatkov (team_id) where stanje = 'caka';
create index popravki_podatkov_tekma on public.popravki_podatkov (match_id) where vrsta = 'asistenca' and stanje = 'sprejet';
create index popravki_podatkov_uporabnik on public.popravki_podatkov (user_id, created_at desc);

-- Gol popravka po ključu; NULL, če ni natanko enega.
create or replace function public.gol_popravka(p_match_id bigint, p_minuta int, p_strelec bigint,
                                               p_team_id bigint, p_avtogol boolean, p_enajstmetrovka boolean)
returns bigint
language sql stable
set search_path = public
as $$
  select min(g.id)
    from goals g
   where g.match_id = p_match_id
     and g.minute is not distinct from p_minuta
     and g.scorer_id is not distinct from p_strelec
     and g.team_id = p_team_id
     and g.is_own_goal = coalesce(p_avtogol, false)
     and g.is_penalty = coalesce(p_enajstmetrovka, false)
  having count(*) = 1
$$;
revoke all on function public.gol_popravka(bigint, int, bigint, bigint, boolean, boolean) from public, anon, authenticated;
alter table public.popravki_podatkov enable row level security;
revoke all on public.popravki_podatkov from anon, authenticated;

-- Omejen račun ne prijavlja (migracija 20261025111100).
create trigger zavrni_omejenega before insert on public.popravki_podatkov
  for each row execute function public.zavrni_omejenega();

-- Uveljavi popravek v imenu `auth.uid()` (admin ali klubski račun kluba).
-- Kliče ga le prijavi_popravek in odloci_popravek, ki sta pravice že preverila.
create or replace function public.uveljavi_popravek(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v popravki_podatkov;
  v_gol bigint;
begin
  select * into v from popravki_podatkov where id = p_id for update;
  if v.vrsta = 'pozicija' then
    if is_admin() then
      update players set position = v.pozicija, position_source = 'admin' where id = v.player_id;
    else
      -- Klub: kot klub_nastavi_pozicijo, velja ob ponedeljkovem uveljavljanju.
      insert into pozicije_klub_cakajo(player_id, position, user_id)
      values (v.player_id, v.pozicija, auth.uid())
      on conflict (player_id) do update
        set position = excluded.position, user_id = excluded.user_id, created_at = now();
    end if;

  elsif v.vrsta = 'odhod' then
    -- Isto pravilo kot oznaci_odhod_igralca: ne v 24 urah pred rokom.
    if not is_admin() and exists (
         select 1
           from rounds r
           join competitions c on c.id = r.competition_id
          where r.competition_id = v.competition_id
            and r.lineups_locked_at is null
            and r.deadline_at is not null
            and r.number >= coalesce(c.prvi_fantasy_krog, 1)
            and r.deadline_at <= now() + interval '24 hours'
            and r.deadline_at > now() - interval '7 days'
       ) then
      raise insufficient_privilege using message =
        'Odhod lahko označiš najkasneje 24 ur pred rokom kroga.';
    end if;
    update players
       set active = false, odsel_at = now(), odsel_by = auth.uid()
     where id = v.player_id and active;

  elsif v.vrsta = 'asistenca' then
    v_gol := gol_popravka(v.match_id, v.gol_minuta, v.gol_strelec_id, v.team_id, v.gol_avtogol, v.gol_enajstmetrovka);
    if v_gol is null then
      raise exception 'Gola ni več v zapisniku.';
    end if;
    if v.asistent_id is null then
      update goals
         set assist_player_id = null, assist_confirmed_at = null, assist_none_confirmed_at = now()
       where id = v_gol;
    else
      update goals
         set assist_player_id = v.asistent_id, assist_confirmed_at = now(), assist_none_confirmed_at = null
       where id = v_gol;
    end if;
  end if;

  -- Enake čakajoče prijave drugih so s tem rešene.
  update popravki_podatkov p
     set stanje = 'sprejet', odlocil = auth.uid(), odloceno_at = now()
   where (p.id = p_id or (
           p.stanje = 'caka'
           and p.vrsta = v.vrsta
           and p.player_id is not distinct from v.player_id
           and p.match_id is not distinct from v.match_id
           and p.gol_minuta is not distinct from v.gol_minuta
           and p.gol_strelec_id is not distinct from v.gol_strelec_id
           and p.pozicija is not distinct from v.pozicija
           and p.asistent_id is not distinct from v.asistent_id));
end;
$$;
revoke all on function public.uveljavi_popravek(bigint) from public, anon, authenticated;

-- Prijava popravka. Vrne 'sprejet' (admin ali klub o svojem klubu, velja
-- takoj) ali 'caka'. Pri asistenci p_asistent_id NULL pomeni "brez asistence".
create or replace function public.prijavi_popravek(
  p_vrsta text,
  p_player_id bigint default null,
  p_pozicija text default null,
  p_goal_id bigint default null,
  p_asistent_id bigint default null,
  p_opomba text default null
)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_opomba  text := nullif(btrim(coalesce(p_opomba, '')), '');
  v_igralec players;
  v_gol     goals;
  v_team    bigint;
  v_liga    bigint;
  v_tekma   bigint;
  v_sezona  text;
  v_id      bigint;
begin
  if v_uid is null then
    raise insufficient_privilege using message = 'Za popravek se prijavi.';
  end if;
  if char_length(v_opomba) > 300 then
    raise exception 'Opomba ima največ 300 znakov.';
  end if;
  if prepovedane_besede(v_opomba) is not null then
    raise exception 'Opomba vsebuje neprimerne besede.';
  end if;

  if p_vrsta in ('pozicija', 'odhod') then
    select * into v_igralec from players where id = p_player_id;
    if not found then
      raise exception 'Igralec ne obstaja.';
    end if;
    if v_igralec.anonimiziran_at is not null then
      raise exception 'Podatkov tega igralca ni mogoče popraviti.';
    end if;
    v_team := v_igralec.team_id;
    v_liga := v_igralec.competition_id;
    if p_vrsta = 'pozicija' then
      if p_pozicija is null or p_pozicija not in ('GK', 'DEF', 'MID', 'FWD') then
        raise exception 'Pozicija je GK, DEF, MID ali FWD.';
      end if;
      if v_igralec.position = p_pozicija then
        raise exception 'Igralec že ima to pozicijo.';
      end if;
    else
      if not v_igralec.active or v_igralec.odsel_at is not null then
        raise exception 'Igralec je že označen kot odšel.';
      end if;
    end if;

  elsif p_vrsta = 'asistenca' then
    select * into v_gol from goals where id = p_goal_id;
    if not found then
      raise exception 'Gol ne obstaja.';
    end if;
    if v_gol.is_own_goal or v_gol.is_penalty then
      raise exception 'Enajstmetrovka in avtogol nimata asistence.';
    end if;
    select m.id, r.competition_id, r.season into v_tekma, v_liga, v_sezona
      from matches m join rounds r on r.id = m.round_id
     where m.id = v_gol.match_id
       and m.statistics_status = 'available';
    if v_tekma is null then
      raise exception 'Te tekme ni mogoče popraviti.';
    end if;
    if v_sezona is distinct from sezona_lige(v_liga) then
      raise exception 'Popravek je mogoč le za tekočo sezono.';
    end if;
    v_team := v_gol.team_id;
    if p_asistent_id is not null and (
         p_asistent_id = v_gol.scorer_id
         or not exists (select 1 from appearances a
                         where a.match_id = v_tekma and a.player_id = p_asistent_id
                           and a.team_id = v_gol.team_id and a.minutes_played > 0)) then
      raise exception 'Podajalec mora igrati za klub strelca na tej tekmi.';
    end if;
    if (p_asistent_id is null and v_gol.assist_none_confirmed_at is not null)
       or (p_asistent_id is not null and v_gol.assist_player_id = p_asistent_id) then
      raise exception 'Asistenca je že taka.';
    end if;

  else
    raise exception 'Vrsta popravka je pozicija, odhod ali asistenca.';
  end if;

  if exists (select 1 from popravki_podatkov
              where user_id = v_uid and stanje = 'caka' and vrsta = p_vrsta
                and player_id is not distinct from (case when p_vrsta = 'asistenca' then null else p_player_id end)
                and (p_vrsta <> 'asistenca' or (match_id = v_gol.match_id
                     and gol_minuta is not distinct from v_gol.minute
                     and gol_strelec_id is not distinct from v_gol.scorer_id
                     and team_id = v_gol.team_id))) then
    raise exception 'Tak popravek že čaka na pregled.';
  end if;
  if (select count(*) from popravki_podatkov
       where user_id = v_uid and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'Danes si oddal že 20 popravkov.';
  end if;

  insert into popravki_podatkov (
    vrsta, competition_id, team_id, player_id, pozicija, match_id,
    gol_minuta, gol_strelec_id, gol_avtogol, gol_enajstmetrovka, asistent_id, opomba, user_id
  ) values (
    p_vrsta, v_liga, v_team,
    case when p_vrsta = 'asistenca' then null else p_player_id end,
    case when p_vrsta = 'pozicija' then p_pozicija end,
    v_tekma, v_gol.minute, v_gol.scorer_id, v_gol.is_own_goal, v_gol.is_penalty,
    case when p_vrsta = 'asistenca' then p_asistent_id end,
    v_opomba, v_uid
  ) returning id into v_id;

  if is_admin() or je_klubski_racun(v_uid, v_team) then
    perform uveljavi_popravek(v_id);
    return 'sprejet';
  end if;

  perform preverjeni_na_discord(format(
    '🛠️ Popravek (%s) čaka na pregled: %s, %s. Administracija → Popravki podatkov',
    p_vrsta,
    coalesce((select full_name from players where id = coalesce(p_player_id, v_gol.scorer_id)), '?'),
    coalesce((select name from teams where id = v_team), '?')));
  return 'caka';
end;
$$;

-- Odločitev o čakajočem popravku: admin ali klubski račun kluba.
create or replace function public.odloci_popravek(p_id bigint, p_sprejmi boolean, p_razlog text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v popravki_podatkov;
begin
  select * into v from popravki_podatkov where id = p_id for update;
  if not found then
    raise exception 'Popravka ni.';
  end if;
  if not (is_admin() or (auth.uid() is not null and je_klubski_racun(auth.uid(), v.team_id))) then
    raise insufficient_privilege using message = 'O popravku odloči administrator ali klubski račun kluba.';
  end if;
  if v.stanje <> 'caka' then
    raise exception 'O popravku je že odločeno.';
  end if;
  if char_length(btrim(coalesce(p_razlog, ''))) > 300 then
    raise exception 'Razlog ima največ 300 znakov.';
  end if;
  if p_sprejmi then
    perform uveljavi_popravek(p_id);
  else
    update popravki_podatkov
       set stanje = 'zavrnjen', odlocil = auth.uid(), odloceno_at = now(),
           razlog = nullif(btrim(coalesce(p_razlog, '')), '')
     where id = p_id;
  end if;
end;
$$;

-- Čakajoči popravki: admin vidi vse (ali enega kluba), klubski račun le svoje.
create or replace function public.popravki_v_pregledu(p_team_id bigint default null)
returns table (
  id bigint, vrsta text, liga text, klub text, team_id bigint,
  igralec_id bigint, igralec text, pozicija_zdaj text, vir_pozicije text, pozicija text,
  tekma_id bigint, minuta int, strelec text, asistenca_zdaj text, asistent text,
  opomba text, avtor text, created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (is_admin() or (p_team_id is not null and auth.uid() is not null
                         and je_klubski_racun(auth.uid(), p_team_id))) then
    raise insufficient_privilege using message = 'O popravku odloči administrator ali klubski račun kluba.';
  end if;
  return query
    select p.id, p.vrsta, c.name, t.name, p.team_id,
           p.player_id, pl.full_name, pl.position, pl.position_source, p.pozicija,
           p.match_id, p.gol_minuta, s.full_name,
           case when g.assist_none_confirmed_at is not null then '—' else a0.full_name end,
           a.full_name,
           p.opomba, pr.display_name, p.created_at
      from popravki_podatkov p
      join competitions c on c.id = p.competition_id
      join teams t on t.id = p.team_id
      left join players pl on pl.id = p.player_id
      left join players s on s.id = p.gol_strelec_id
      left join players a on a.id = p.asistent_id
      left join goals g on g.id = gol_popravka(p.match_id, p.gol_minuta, p.gol_strelec_id, p.team_id, p.gol_avtogol, p.gol_enajstmetrovka)
      left join players a0 on a0.id = g.assist_player_id
      left join profiles pr on pr.id = p.user_id
     where p.stanje = 'caka'
       and (p_team_id is null or p.team_id = p_team_id)
     order by p.created_at;
end;
$$;

revoke all on function public.prijavi_popravek(text, bigint, text, bigint, bigint, text) from public, anon;
revoke all on function public.odloci_popravek(bigint, boolean, text) from public, anon;
revoke all on function public.popravki_v_pregledu(bigint) from public, anon;
grant execute on function public.prijavi_popravek(text, bigint, text, bigint, bigint, text) to authenticated;
grant execute on function public.odloci_popravek(bigint, boolean, text) to authenticated;
grant execute on function public.popravki_v_pregledu(bigint) to authenticated;

-- Uvoz: sprejeti popravki asistenc se po zamenjavi golov vpišejo nazaj. Gol
-- najdemo po ključu (minuta, strelec, klub, avtogol, enajstmetrovka); če ga ni
-- ali jih je več, ostane, kot pravi vir. Podajalec mora na tekmi še igrati.
create or replace function public.zamenjaj_nastope_tekme(p_match_id bigint, p_nastopi jsonb, p_goli jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_pop record;
  v_gol bigint;
begin
  delete from appearances where match_id = p_match_id;
  insert into appearances (
    match_id, player_id, team_id, shirt_number, started, minute_on, minute_off,
    minutes_played, goals, own_goals, penalties_scored, penalties_missed,
    penalties_saved, yellow_cards, red_cards, red_card_minute, goals_conceded, clean_sheet, is_goalkeeper
  )
  select p_match_id, r.player_id, r.team_id, r.shirt_number,
         coalesce(r.started, false), coalesce(r.minute_on, 0), coalesce(r.minute_off, 90),
         coalesce(r.minutes_played, 0), coalesce(r.goals, 0), coalesce(r.own_goals, 0),
         coalesce(r.penalties_scored, 0), coalesce(r.penalties_missed, 0),
         coalesce(r.penalties_saved, 0), coalesce(r.yellow_cards, 0), coalesce(r.red_cards, 0), r.red_card_minute,
         coalesce(r.goals_conceded, 0), coalesce(r.clean_sheet, false), coalesce(r.is_goalkeeper, false)
    from jsonb_to_recordset(coalesce(p_nastopi, '[]'::jsonb)) as r(
      player_id bigint, team_id bigint, shirt_number integer, started boolean,
      minute_on integer, minute_off integer, minutes_played integer, goals integer,
      own_goals integer, penalties_scored integer, penalties_missed integer,
      penalties_saved integer, yellow_cards integer, red_cards integer, red_card_minute integer,
      goals_conceded integer, clean_sheet boolean, is_goalkeeper boolean
    );

  if p_goli is not null then
    delete from goals where match_id = p_match_id;
    insert into goals (match_id, scorer_id, team_id, minute, is_own_goal, is_penalty, score_home, score_away)
    select p_match_id, r.scorer_id, r.team_id, r.minute,
           coalesce(r.is_own_goal, false), coalesce(r.is_penalty, false), r.score_home, r.score_away
      from jsonb_to_recordset(p_goli) as r(
        scorer_id bigint, team_id bigint, minute integer, is_own_goal boolean,
        is_penalty boolean, score_home integer, score_away integer
      );

    for v_pop in
      select distinct on (p.gol_minuta, p.gol_strelec_id, p.team_id, p.gol_avtogol, p.gol_enajstmetrovka)
             p.id, p.gol_minuta, p.gol_strelec_id, p.team_id, p.gol_avtogol, p.gol_enajstmetrovka, p.asistent_id
        from popravki_podatkov p
       where p.match_id = p_match_id and p.vrsta = 'asistenca' and p.stanje = 'sprejet'
       order by p.gol_minuta, p.gol_strelec_id, p.team_id, p.gol_avtogol, p.gol_enajstmetrovka, p.odloceno_at desc
    loop
      v_gol := gol_popravka(p_match_id, v_pop.gol_minuta, v_pop.gol_strelec_id, v_pop.team_id, v_pop.gol_avtogol, v_pop.gol_enajstmetrovka);
      continue when v_gol is null;
      if v_pop.asistent_id is null then
        update goals set assist_none_confirmed_at = now() where id = v_gol;
      elsif exists (select 1 from appearances a
                     where a.match_id = p_match_id and a.player_id = v_pop.asistent_id
                       and a.team_id = v_pop.team_id and a.minutes_played > 0) then
        update goals set assist_player_id = v_pop.asistent_id, assist_confirmed_at = now() where id = v_gol;
      else
        continue;
      end if;
    end loop;
  end if;
end;
$function$;
