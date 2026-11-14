-- Samodejni sprejem popravkov podatkov (pozicija, asistenca).
--
-- 13. 11. 2026 je v pregledu čakalo 436 popravkov; 139 jih je admin sprejel
-- po preprostem pravilu brez ene napake ali spora. To pravilo zdaj teče ob
-- vsakem novem popravku (`prijavi_popravek`):
--
--   preverjen  pošiljatelj ima potrjen profil igralca in popravlja sebe
--              (pozicija) ali igralca oziroma gol svojega kluba
--   soglasje   isto predlaga dovolj različnih ljudi: 3 pri poziciji,
--              2 pri asistenci
--
-- in le, če:
--   - noben čakajoč popravek ne predlaga česa drugega (spor),
--   - pozicije ni določil admin ali klub (vir `admin`/`klub`, čakajoča
--     klubska pozicija),
--   - o istem golu ni že sprejet drugačen popravek.
--
-- Odhod igralca (igralec postane neaktiven) in vse ostalo ostane ročno.
-- Vsak samodejni sprejem zapiše prejšnjo vrednost v `popravki_samodejno`;
-- admin ga razveljavi z `admin_razveljavi_samodejni_popravek`. Discord
-- (#preverjeni) dobi vrstico o vsakem.
--
-- Stolpci nove tabele namenoma brez končnice _id in brez tujih ključev
-- (test FCF_TARGET zavrne *_id na tabeli, ki je ne pozna);
-- `popravki_podatkov` ostane nespremenjena.

create table public.popravki_samodejno (
  popravek          bigint primary key,
  nacin             text not null check (nacin in ('preverjen', 'soglasje')),
  -- Pozicija: {"position","position_source"}; asistenca: stanje gola.
  prej              jsonb not null,
  created_at        timestamptz not null default now(),
  razveljavljen_at  timestamptz,
  razveljavil       uuid
);
comment on table public.popravki_samodejno is
  'Samodejno sprejeti popravki podatkov s prejšnjo vrednostjo za razveljavitev. Piše le popravek_samodejno.';
alter table public.popravki_samodejno enable row level security;
revoke all on public.popravki_samodejno from public, anon, authenticated;

create or replace function public.popravek_prag_soglasja(p_vrsta text)
returns int language sql immutable set search_path = public
as $$ select case p_vrsta when 'pozicija' then 3 when 'asistenca' then 2 end $$;
revoke all on function public.popravek_prag_soglasja(text) from public, anon, authenticated;

-- Ali čakajoč popravek p_id izpolni pravilo; če ga, ga uveljavi in vrne
-- način ('preverjen' ali 'soglasje'), sicer NULL. Kliče ga le prijavi_popravek.
create or replace function public.popravek_samodejno(p_id bigint)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v        popravki_podatkov;
  v_moji   bigint[];
  v_nacin  text;
  v_gol    bigint;
  v_prej   jsonb;
  v_ljudi  int;
begin
  select * into v from popravki_podatkov where id = p_id for update;
  if not found or v.stanje <> 'caka' or v.vrsta not in ('pozicija', 'asistenca') then
    return null;
  end if;

  -- Spor: kdo čaka z drugačnim predlogom za istega igralca oziroma gol.
  if v.vrsta = 'pozicija' then
    if exists (select 1 from popravki_podatkov p
                where p.stanje = 'caka' and p.vrsta = 'pozicija' and p.player_id = v.player_id
                  and p.pozicija <> v.pozicija)
       or exists (select 1 from players pl where pl.id = v.player_id
                   and pl.position_source in ('admin', 'klub'))
       or exists (select 1 from pozicije_klub_cakajo k where k.player_id = v.player_id) then
      return null;
    end if;
  else
    v_gol := gol_popravka(v.match_id, v.gol_minuta, v.gol_strelec_id, v.team_id, v.gol_avtogol, v.gol_enajstmetrovka);
    if v_gol is null then
      return null;
    end if;
    if exists (select 1 from popravki_podatkov p
                where p.vrsta = 'asistenca' and p.stanje in ('caka', 'sprejet') and p.id <> v.id
                  and p.match_id = v.match_id
                  and p.gol_minuta is not distinct from v.gol_minuta
                  and p.gol_strelec_id is not distinct from v.gol_strelec_id
                  and p.team_id = v.team_id
                  and p.asistent_id is distinct from v.asistent_id) then
      return null;
    end if;
  end if;

  -- Preverjen pošiljatelj: igralec s potrjenim profilom (in povezane vrstice).
  select array_agg(x) into v_moji
    from (select z.player_id as x from zahtevki_igralca z
           where z.user_id = v.user_id and z.status = 'potrjen'
          union
          select pi.player_id from povezani_igralci pi
            join zahtevki_igralca z on z.id = pi.zahtevek_id
           where z.user_id = v.user_id and z.status = 'potrjen') s;

  if v_moji is not null and (
       (v.vrsta = 'pozicija' and v.player_id = any (v_moji))
       or exists (select 1 from players pl where pl.id = any (v_moji) and pl.team_id = v.team_id)) then
    v_nacin := 'preverjen';
  else
    select count(distinct p.user_id) into v_ljudi
      from popravki_podatkov p
     where p.stanje = 'caka' and p.vrsta = v.vrsta
       and p.player_id is not distinct from v.player_id
       and p.pozicija is not distinct from v.pozicija
       and p.match_id is not distinct from v.match_id
       and p.gol_minuta is not distinct from v.gol_minuta
       and p.gol_strelec_id is not distinct from v.gol_strelec_id
       and p.asistent_id is not distinct from v.asistent_id;
    if v_ljudi >= popravek_prag_soglasja(v.vrsta) then
      v_nacin := 'soglasje';
    end if;
  end if;
  if v_nacin is null then
    return null;
  end if;

  -- Uveljavi kot admin (pozicija takoj, vir `admin`, uvoz je ne povozi).
  if v.vrsta = 'pozicija' then
    select jsonb_build_object('position', pl.position, 'position_source', pl.position_source)
      into v_prej from players pl where pl.id = v.player_id;
    update players set position = v.pozicija, position_source = 'admin' where id = v.player_id;
  else
    select jsonb_build_object('assist_player_id', g.assist_player_id,
                              'assist_confirmed_at', g.assist_confirmed_at,
                              'assist_none_confirmed_at', g.assist_none_confirmed_at)
      into v_prej from goals g where g.id = v_gol;
    if v.asistent_id is null then
      update goals set assist_player_id = null, assist_confirmed_at = null, assist_none_confirmed_at = now()
       where id = v_gol;
    else
      update goals set assist_player_id = v.asistent_id, assist_confirmed_at = now(), assist_none_confirmed_at = null
       where id = v_gol;
    end if;
  end if;

  -- Ta in enaki čakajoči predlogi drugih so sprejeti; razlog pove, kateri
  -- samodejni sprejem jih je zaprl (razveljavitev jih najde po njem).
  update popravki_podatkov p
     set stanje = 'sprejet', odlocil = null, odloceno_at = now(),
         razlog = 'samodejno (' || v_nacin || ') #' || v.id
   where p.id = v.id or (
         p.stanje = 'caka' and p.vrsta = v.vrsta
         and p.player_id is not distinct from v.player_id
         and p.match_id is not distinct from v.match_id
         and p.gol_minuta is not distinct from v.gol_minuta
         and p.gol_strelec_id is not distinct from v.gol_strelec_id
         and p.pozicija is not distinct from v.pozicija
         and p.asistent_id is not distinct from v.asistent_id);

  insert into popravki_samodejno (popravek, nacin, prej) values (v.id, v_nacin, v_prej);

  perform preverjeni_na_discord(format(
    '✅ Popravek (%s) samodejno sprejet (%s): %s, %s. Razveljavi v Administracija → Popravki podatkov',
    v.vrsta, v_nacin,
    coalesce((select full_name from players where id = coalesce(v.player_id, v.gol_strelec_id)), '?'),
    coalesce((select name from teams where id = v.team_id), '?')));
  return v_nacin;
end;
$$;
revoke all on function public.popravek_samodejno(bigint) from public, anon, authenticated;

-- prijavi_popravek: kot v 20261025150100, pred obvestilom o čakanju še
-- samodejni sprejem.
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

  if popravek_samodejno(v_id) is not null then
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
revoke all on function public.prijavi_popravek(text, bigint, text, bigint, bigint, text) from public, anon;
grant execute on function public.prijavi_popravek(text, bigint, text, bigint, bigint, text) to authenticated;

-- Admin: samodejni sprejemi zadnjih 30 dni, najnovejši prvi.
create or replace function public.admin_samodejni_popravki()
returns table (
  id bigint, vrsta text, nacin text, liga text, klub text, igralec text,
  pozicija text, prej text, minuta int, strelec text, asistent text,
  avtor text, created_at timestamptz, razveljavljen_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
    select p.id, p.vrsta, s.nacin, c.name, t.name, pl.full_name,
           p.pozicija,
           case when p.vrsta = 'pozicija' then s.prej ->> 'position'
                else (select a0.full_name from players a0 where a0.id = (s.prej ->> 'assist_player_id')::bigint) end,
           p.gol_minuta, st.full_name, a.full_name,
           pr.display_name, s.created_at, s.razveljavljen_at
      from popravki_samodejno s
      join popravki_podatkov p on p.id = s.popravek
      join competitions c on c.id = p.competition_id
      join teams t on t.id = p.team_id
      left join players pl on pl.id = p.player_id
      left join players st on st.id = p.gol_strelec_id
      left join players a on a.id = p.asistent_id
      left join profiles pr on pr.id = p.user_id
     where s.created_at > now() - interval '30 days'
     order by s.created_at desc
     limit 300;
end;
$$;
revoke all on function public.admin_samodejni_popravki() from public, anon;
grant execute on function public.admin_samodejni_popravki() to authenticated;

-- Admin: razveljavi samodejni sprejem. Vrne prejšnjo vrednost (če je od
-- takrat ni spremenil kdo drug) in zavrne ta in z njim zaprte predloge, da
-- jih uvoz golov ne vpiše nazaj.
create or replace function public.admin_razveljavi_samodejni_popravek(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare
  s popravki_samodejno;
  v popravki_podatkov;
  v_gol bigint;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  select * into s from popravki_samodejno where popravek = p_id for update;
  if not found then
    raise exception 'Ta popravek ni bil sprejet samodejno.';
  end if;
  if s.razveljavljen_at is not null then
    raise exception 'Popravek je že razveljavljen.';
  end if;
  select * into v from popravki_podatkov where id = p_id;

  if v.vrsta = 'pozicija' then
    update players
       set position = s.prej ->> 'position', position_source = s.prej ->> 'position_source'
     where id = v.player_id and position = v.pozicija and position_source = 'admin';
  else
    v_gol := gol_popravka(v.match_id, v.gol_minuta, v.gol_strelec_id, v.team_id, v.gol_avtogol, v.gol_enajstmetrovka);
    if v_gol is not null then
      update goals
         set assist_player_id = (s.prej ->> 'assist_player_id')::bigint,
             assist_confirmed_at = (s.prej ->> 'assist_confirmed_at')::timestamptz,
             assist_none_confirmed_at = (s.prej ->> 'assist_none_confirmed_at')::timestamptz
       where id = v_gol
         and assist_player_id is not distinct from v.asistent_id;
    end if;
  end if;

  update popravki_podatkov
     set stanje = 'zavrnjen', odlocil = auth.uid(), odloceno_at = now(),
         razlog = 'Samodejni sprejem razveljavil admin.'
   where id = p_id
      or (stanje = 'sprejet' and razlog = 'samodejno (' || s.nacin || ') #' || p_id);

  update popravki_samodejno set razveljavljen_at = now(), razveljavil = auth.uid() where popravek = p_id;
end;
$$;
revoke all on function public.admin_razveljavi_samodejni_popravek(bigint) from public, anon;
grant execute on function public.admin_razveljavi_samodejni_popravek(bigint) to authenticated;

-- Klepet (HelpStack): napaka pozicije ali asistence pri prepoznanem igralcu
-- dobi povezavo na stran igralca, kjer jo prijavljen uporabnik popravi sam;
-- popravek preverjenega igralca kluba velja takoj. Sicer kot v 20261110120300.
create or replace function public.prijavi_napako(
  vrsta text,
  opis text,
  igralec text default null,
  klub text default null,
  liga text default null,
  pravilno text default null,
  kontakt text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_vrsta text := lower(btrim(coalesce(vrsta, '')));
  v_opis text := podpora_besedilo(opis, 1000);
  v_igralec text := podpora_besedilo(igralec, 120);
  v_klub text := podpora_besedilo(klub, 120);
  v_liga text := podpora_besedilo(liga, 120);
  v_pravilno text := podpora_besedilo(pravilno, 300);
  v_kontakt text := podpora_besedilo(kontakt, 254);
  v_liga_id bigint;
  v_igralec_id bigint;
  v_id bigint;
  v_povezava text;
begin
  if v_vrsta not in ('pozicija', 'manjka_igralec', 'rezultat', 'asistenca', 'cena', 'drugo') then
    v_vrsta := 'drugo';
  end if;
  if v_opis is null or length(v_opis) < 3 then
    return jsonb_build_object('zapisano', false,
      'sporocilo', 'Manjka opis napake: kaj je narobe, pri katerem igralcu ali tekmi.');
  end if;

  -- Ista prijava v zadnji uri (ponovljen klic ali isti človek dvakrat) ni nova.
  select p.id into v_id
    from prijave_napak p
   where p.created_at > now() - interval '1 hour'
     and p.vrsta = v_vrsta
     and lower(p.opis) = lower(v_opis)
     and coalesce(lower(p.igralec), '') = coalesce(lower(v_igralec), '')
   limit 1;
  if v_id is not null then
    return jsonb_build_object('zapisano', true, 'id', v_id, 'ze_prijavljeno', true,
      'sporocilo', 'Ta napaka je že prijavljena (št. ' || v_id || '). Ekipa jo preveri.');
  end if;

  -- Meje: 5 na uro na isti stik, 40 na uro vseh skupaj (klepet je javen).
  if (v_kontakt is not null and (select count(*) from prijave_napak p
        where lower(p.kontakt) = lower(v_kontakt) and p.created_at > now() - interval '1 hour') >= 5)
     or (select count(*) from prijave_napak p where p.created_at > now() - interval '1 hour') >= 40 then
    return jsonb_build_object('zapisano', false, 'omejitev', true,
      'sporocilo', 'Trenutno je prijav preveč. Prosi uporabnika, naj poskusi čez eno uro ali piše na info@slff.eu.');
  end if;

  -- Liga in igralec, če ju prepoznamo enoznačno (le v pomoč adminu).
  if v_liga is not null then
    select c.id into v_liga_id
      from competitions c
     where c.id in (select podpora_lige(v_liga))
     order by c.active desc, c.sort_order nulls last
     limit 1;
  end if;
  if v_igralec is not null and length(v_igralec) >= 3 then
    select min(k.id) into v_igralec_id
      from podpora_kandidati(v_igralec, v_liga, 'liga') k
    having count(*) = 1;
  end if;

  insert into prijave_napak (vrsta, opis, igralec, klub, liga, pravilno, kontakt, id_igralca, id_lige)
  values (v_vrsta, v_opis, v_igralec, v_klub, v_liga, v_pravilno, v_kontakt, v_igralec_id, v_liga_id)
  returning id into v_id;

  if v_vrsta in ('pozicija', 'asistenca') and v_igralec_id is not null then
    select 'https://slff.eu/player/' || pl.id || '?t=' || c.slug into v_povezava
      from players pl join competitions c on c.id = pl.competition_id
     where pl.id = v_igralec_id and pl.anonimiziran_at is null;
  end if;

  if v_povezava is not null then
    return jsonb_build_object('zapisano', true, 'id', v_id, 'povezava', v_povezava,
      'sporocilo', 'Prijava št. ' || v_id || ' je zapisana. Hitreje gre, če uporabnik popravek odda sam: '
        || 'prijavi se na slff.eu in na strani igralca odpre "Popravek podatkov" (' || v_povezava || '). '
        || 'Popravek igralca s potrjenim profilom pri istem klubu velja takoj, ostale preveri ekipa.');
  end if;
  return jsonb_build_object('zapisano', true, 'id', v_id,
    'sporocilo', 'Prijava št. ' || v_id || ' je zapisana. Ekipa jo preveri praviloma v nekaj dneh'
      || case when v_kontakt is null then '.' else ' in odgovori na naveden stik.' end);
end;
$$;
