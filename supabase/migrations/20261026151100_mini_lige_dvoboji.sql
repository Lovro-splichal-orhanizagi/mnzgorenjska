-- Dvoboji v mini ligah.
--
-- Lestvica mini lige je seštevek: kdor po petem krogu zaostaja za sto točk,
-- ve, da ga ne bo ujel, in neha gledati. Dvoboj da vsak krog novo tekmo:
-- člani so razporejeni v pare, kdor ima v krogu več točk, zmaga (3 točke,
-- remi 1, poraz 0). Igralci ne naredijo ničesar — pari in izidi nastanejo
-- sami iz točk kroga, ki jih že računa `fantasy_round_points`.
--
-- **Krog je številka, kot v tedenskem pregledu** (20260928150000): mini liga
-- gre čez lige, zato "5. krog" pomeni peti krog sezone v ligi vsake ekipe.
-- Ekipa igra s točkami svojega kroga s to številko; ekipa, katere krog še ni
-- končan, ima izid "v teku" (pravilo končanega kroga je isto kot v pregledu).
-- Sezona je oznaka iz `rounds.season`; ekipe iz lig z različno oznako
-- sezone (koledarska "2026" proti "2026/27") imajo vsaka svoje dvoboje.
--
-- **Pari se ne spreminjajo za nazaj.** Shranijo se ob prvem zaklepu kroga s
-- to številko v kateri od lig članov (sprožilec na `rounds.lineups_locked_at`,
-- ki ga nastavi `zakleni_krog`). V krogu nastopijo le ekipe, ki so bile v
-- mini ligi in obstajale pred tem zaklepom; kdor se pridruži kasneje, igra
-- od naslednjega kroga naprej.
--
-- **Razpored je krožni (round robin, "circle method").** Člani po vrstnem
-- redu vstopa; prvi stoji, ostali se vsak krog zavrtijo za eno mesto, zato
-- se v n−1 krogih vsak sreča z vsakim natanko enkrat. Liho število dobi
-- "duha": kdor je v paru z njim, igra proti povprečju mini lige v tem krogu
-- (kot AVERAGE v FPL) in tudi to mesto kroži. Ko se članstvo spremeni, se
-- vrtenje nadaljuje na novem seznamu — že shranjeni pari ostanejo.
--
-- **Kdo vidi.** Kdor vidi mini ligo: člani (`sem_v_mini_ligi`, tudi neposredno
-- iz tabele), pri javni ligi pa vsak prek `dvoboji_mini_lige` — enako kot
-- `lestvica_javne_mini_lige`. Dvoboj razkrije le ime ekipe in točke kroga, ki
-- sta na lestvici že javna.

create table public.mini_liga_dvoboji (
  id           bigint generated always as identity primary key,
  mini_liga_id bigint not null references public.mini_lige(id) on delete cascade,
  sezona       text   not null,
  krog         int    not null,
  ekipa_a      bigint not null references public.fantasy_teams(id) on delete cascade,
  -- NULL: ekipa A igra proti povprečju mini lige v tem krogu.
  ekipa_b      bigint references public.fantasy_teams(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint mini_liga_dvoboji_razlicni check (ekipa_b is null or ekipa_b <> ekipa_a),
  constraint mini_liga_dvoboji_a unique (mini_liga_id, sezona, krog, ekipa_a)
);
create unique index mini_liga_dvoboji_b
  on public.mini_liga_dvoboji (mini_liga_id, sezona, krog, ekipa_b) where ekipa_b is not null;
-- Proti povprečju igra v krogu največ ena ekipa.
create unique index mini_liga_dvoboji_povprecje
  on public.mini_liga_dvoboji (mini_liga_id, sezona, krog) where ekipa_b is null;
create index mini_liga_dvoboji_ekipa_b on public.mini_liga_dvoboji (ekipa_b);
create index mini_liga_dvoboji_ekipa_a on public.mini_liga_dvoboji (ekipa_a);

comment on table public.mini_liga_dvoboji is
  'Pari dvobojev mini lige po krogih (številka kroga v sezoni). Piše jih le sestavi_dvoboje ob prvem zaklepu kroga; bere se prek dvoboji_mini_lige.';

alter table public.mini_liga_dvoboji enable row level security;
revoke all on public.mini_liga_dvoboji from public, anon, authenticated;
grant select on public.mini_liga_dvoboji to authenticated;
grant all on public.mini_liga_dvoboji to service_role;

create policy "clan bere dvoboje svoje mini lige" on public.mini_liga_dvoboji
  for select to authenticated using (public.sem_v_mini_ligi(mini_liga_id));

-- ---------------------------------------------------------------------------
-- Sestava parov kroga
-- ---------------------------------------------------------------------------
-- `p_ob` je trenutek zaklepa: kdor je vstopil ali ekipo ustvaril pozneje, v
-- krogu ne nastopi. Krog, ki že ima pare, ostane, kot je. Vrne število parov.
create or replace function public.sestavi_dvoboje(p_liga bigint, p_sezona text, p_krog int, p_ob timestamptz)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ekipe bigint[];
  v_kolo  bigint[];
  v_m     int;
  v_zamik int;
  v_a     bigint;
  v_b     bigint;
  v_parov int := 0;
begin
  -- Dva hkratna zaklepa (dve ligi z istim krogom) ne smeta sestaviti dveh razporedov.
  perform pg_advisory_xact_lock(hashtextextended('slff-dvoboji:' || p_liga, 0));

  if exists (select 1 from mini_liga_dvoboji d
              where d.mini_liga_id = p_liga and d.sezona = p_sezona and d.krog = p_krog) then
    return 0;
  end if;

  -- Ekipe, ki v tem krogu sploh lahko igrajo: liga ima krog s to številko v
  -- tej sezoni in ga šteje za fantasy (`prvi_fantasy_krog`).
  select array_agg(c.fantasy_team_id order by c.joined_at, c.fantasy_team_id)
    into v_ekipe
    from mini_liga_clani c
    join fantasy_teams ft on ft.id = c.fantasy_team_id
    join competitions co on co.id = ft.competition_id
   where c.mini_liga_id = p_liga
     and c.joined_at <= p_ob
     and ft.created_at <= p_ob
     and not coalesce(ft.hisna, false)
     and p_krog >= coalesce(co.prvi_fantasy_krog, 1)
     and exists (select 1 from rounds r
                  where r.competition_id = ft.competition_id
                    and r.season = p_sezona and r.number = p_krog);

  if coalesce(cardinality(v_ekipe), 0) < 2 then
    return 0;
  end if;

  -- Liho število: duh na koncu seznama. Kdor je z njim v paru, igra proti povprečju.
  if cardinality(v_ekipe) % 2 = 1 then
    v_ekipe := v_ekipe || null::bigint;
  end if;
  v_m := cardinality(v_ekipe);

  -- Koliko krogov te sezone je ta mini liga že odigrala: za toliko mest se
  -- zavrti vse razen prvega.
  select count(distinct d.krog) % (v_m - 1)
    into v_zamik
    from mini_liga_dvoboji d
   where d.mini_liga_id = p_liga and d.sezona = p_sezona;

  v_kolo := array[v_ekipe[1]];
  for j in 2..v_m loop
    v_kolo := v_kolo || v_ekipe[2 + ((j - 2 + v_zamik) % (v_m - 1))];
  end loop;

  for i in 1..v_m / 2 loop
    v_a := v_kolo[i];
    v_b := v_kolo[v_m + 1 - i];
    if v_a is null then
      v_a := v_b;
      v_b := null;
    end if;
    insert into mini_liga_dvoboji (mini_liga_id, sezona, krog, ekipa_a, ekipa_b)
    values (p_liga, p_sezona, p_krog, v_a, v_b);
    v_parov := v_parov + 1;
  end loop;

  return v_parov;
end;
$$;

revoke all on function public.sestavi_dvoboje(bigint, text, int, timestamptz) from public, anon, authenticated;
grant execute on function public.sestavi_dvoboje(bigint, text, int, timestamptz) to service_role;

-- Ob zaklepu kroga: pari vseh mini lig, v katerih je ekipa te lige. Le
-- tekoča sezona — zaklep arhivskega kroga ob uvozu zgodovine ni dvoboj.
-- Napaka pri eni mini ligi ne sme ustaviti zaklepa (posnetki postav so
-- pomembnejši od dvobojev), zato se le zabeleži.
create or replace function public.dvoboji_ob_zaklepu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liga bigint;
begin
  if new.season is distinct from sezona_lige(new.competition_id) then
    return null;
  end if;
  for v_liga in
    select distinct c.mini_liga_id
      from mini_liga_clani c
      join fantasy_teams ft on ft.id = c.fantasy_team_id
     where ft.competition_id = new.competition_id
     order by 1
  loop
    begin
      perform sestavi_dvoboje(v_liga, new.season, new.number, new.lineups_locked_at);
    exception when others then
      raise warning 'Dvoboji mini lige % (krog %) niso sestavljeni: %', v_liga, new.number, sqlerrm;
    end;
  end loop;
  return null;
end;
$$;

revoke all on function public.dvoboji_ob_zaklepu() from public, anon, authenticated;

create trigger rounds_dvoboji_mini_lig
  after update of lineups_locked_at on public.rounds
  for each row
  when (old.lineups_locked_at is null and new.lineups_locked_at is not null)
  execute function public.dvoboji_ob_zaklepu();

-- ---------------------------------------------------------------------------
-- Izidi
-- ---------------------------------------------------------------------------
-- Krog je končan po istem pravilu kot v `koncani_krogi_mini_lige`: rok je
-- mimo, tekme imajo zapisnik ali kontumacijo (tekma brez zapisnika teden po
-- datumu je prestavljena in ne zadržuje), DFB nima čakajočih zapisnikov.
create or replace function public.krog_dvoboja_koncan(p_round_id bigint)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
      from rounds r
     where r.id = p_round_id
       and r.lineups_locked_at is not null
       and r.deadline_at < now()
       and not public.dfb_round_has_pending(r.id)
       and exists (select 1 from matches m where m.round_id = r.id)
       and not exists (
             select 1 from matches m
              where m.round_id = r.id
                and m.zapisnik_id is null
                and not m.kontumacija
                and coalesce(m.played_on, r.played_on, r.deadline_at::date) >= current_date - 7
           )
  );
$$;

revoke all on function public.krog_dvoboja_koncan(bigint) from public, anon, authenticated;
grant execute on function public.krog_dvoboja_koncan(bigint) to service_role;

-- Vsi dvoboji sezone mini lige, po vrstica za vsako ekipo v dvoboju (par z
-- dvema ekipama da dve vrstici, `prva` pove ekipo A). `nasprotnik` NULL je
-- povprečje. Točke so NULL, dokler krog ekipe ni zaklenjen.
create or replace function public.izidi_dvobojev(p_liga bigint, p_sezona text)
returns table (krog int, ekipa bigint, nasprotnik bigint, tocke numeric,
               tocke_nasprotnika numeric, koncan boolean, prva boolean)
language sql
stable
set search_path = public
as $$
  with par as (
    select d.krog, d.ekipa_a, d.ekipa_b
      from mini_liga_dvoboji d
     where d.mini_liga_id = p_liga and d.sezona = p_sezona
  ),
  strani as (
    select p.krog, p.ekipa_a as ekipa from par p
    union all
    select p.krog, p.ekipa_b from par p where p.ekipa_b is not null
  ),
  stanje as (
    select s.krog, s.ekipa, frp.points, coalesce(krog_dvoboja_koncan(r.id), false) as koncan
      from strani s
      join fantasy_teams ft on ft.id = s.ekipa
      -- Številka kroga je v ligi ekipe ena; ob podvojenem krogu šteje zaklenjeni.
      left join lateral (
        select r.id from rounds r
         where r.competition_id = ft.competition_id
           and r.season = p_sezona and r.number = s.krog
         order by r.lineups_locked_at nulls last, r.id
         limit 1
      ) r on true
      left join fantasy_round_points frp
        on frp.fantasy_team_id = s.ekipa and frp.round_id = r.id
  ),
  tocke as (
    select st.krog, st.ekipa, st.koncan,
           case when st.koncan then coalesce(st.points, 0) else st.points end as tocke
      from stanje st
  ),
  povprecje as (
    select t.krog, round(avg(t.tocke), 1) as tocke, bool_and(t.koncan) as koncan
      from tocke t
     group by t.krog
  )
  select p.krog, p.ekipa_a, p.ekipa_b, a.tocke,
         case when p.ekipa_b is null then v.tocke else b.tocke end,
         a.koncan and case when p.ekipa_b is null then v.koncan else b.koncan end,
         true
    from par p
    join tocke a on a.krog = p.krog and a.ekipa = p.ekipa_a
    left join tocke b on b.krog = p.krog and b.ekipa = p.ekipa_b
    join povprecje v on v.krog = p.krog
  union all
  select p.krog, p.ekipa_b, p.ekipa_a, b.tocke, a.tocke, a.koncan and b.koncan, false
    from par p
    join tocke a on a.krog = p.krog and a.ekipa = p.ekipa_a
    join tocke b on b.krog = p.krog and b.ekipa = p.ekipa_b;
$$;

revoke all on function public.izidi_dvobojev(bigint, text) from public, anon, authenticated;
grant execute on function public.izidi_dvobojev(bigint, text) to service_role;

-- Dvoboji mini lige za vmesnik: pari izbranega kroga (privzeto zadnjega) in
-- lestvica dvobojev sezone. Lestvica šteje le končane dvoboje; razvrsti jo
-- po točkah dvobojev, nato po točkah kroga (`tocke_za`).
create or replace function public.dvoboji_mini_lige(p_liga bigint, p_krog int default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sezona text;
  v_krogi  int[];
  v_krog   int;
begin
  if not exists (select 1 from mini_lige ml
                  where ml.id = p_liga and (ml.javna or sem_v_mini_ligi(ml.id))) then
    return null;
  end if;

  select max(d.sezona) into v_sezona from mini_liga_dvoboji d where d.mini_liga_id = p_liga;
  if v_sezona is null then
    return jsonb_build_object('sezona', null, 'krog', null, 'krogi', '[]'::jsonb,
                              'pari', '[]'::jsonb, 'lestvica', '[]'::jsonb);
  end if;

  select array_agg(distinct d.krog order by d.krog desc) into v_krogi
    from mini_liga_dvoboji d where d.mini_liga_id = p_liga and d.sezona = v_sezona;
  v_krog := case when p_krog = any (v_krogi) then p_krog else v_krogi[1] end;

  return (
    with izidi as (
      select * from izidi_dvobojev(p_liga, v_sezona)
    ),
    imena as (
      select ft.id, coalesce(s.team_name, ft.name) as ekipa, s.owner_name as lastnik, s.owner_id as lastnik_id
        from fantasy_teams ft
        left join fantasy_team_standings s on s.fantasy_team_id = ft.id
       where ft.id in (select i.ekipa from izidi i
                       union select c.fantasy_team_id from mini_liga_clani c where c.mini_liga_id = p_liga)
    ),
    -- Lestvica: vsi sedanji člani, tudi brez odigranega dvoboja.
    lestvica as (
      select c.fantasy_team_id as ekipa,
             count(i.krog) as odigranih,
             count(*) filter (where i.tocke > i.tocke_nasprotnika) as zmage,
             count(*) filter (where i.tocke = i.tocke_nasprotnika) as remiji,
             count(*) filter (where i.tocke < i.tocke_nasprotnika) as porazi,
             coalesce(sum(i.tocke), 0) as tocke_za
        from mini_liga_clani c
        left join izidi i on i.ekipa = c.fantasy_team_id and i.koncan
       where c.mini_liga_id = p_liga
       group by c.fantasy_team_id
    )
    select jsonb_build_object(
      'sezona', v_sezona,
      'krog', v_krog,
      'krogi', to_jsonb(v_krogi),
      'pari', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'a', jsonb_build_object('ekipa_id', i.ekipa, 'ekipa', na.ekipa, 'lastnik', na.lastnik,
                                         'lastnik_id', na.lastnik_id, 'tocke', i.tocke),
                 'b', case when i.nasprotnik is null then null
                           else jsonb_build_object('ekipa_id', i.nasprotnik, 'ekipa', nb.ekipa, 'lastnik', nb.lastnik,
                                                   'lastnik_id', nb.lastnik_id, 'tocke', i.tocke_nasprotnika) end,
                 'povprecje', case when i.nasprotnik is null then i.tocke_nasprotnika end,
                 'koncan', i.koncan)
                 order by na.ekipa, i.ekipa)
          from izidi i
          join imena na on na.id = i.ekipa
          left join imena nb on nb.id = i.nasprotnik
         where i.krog = v_krog and i.prva
      ), '[]'::jsonb),
      'lestvica', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'ekipa_id', l.ekipa, 'ekipa', n.ekipa, 'lastnik', n.lastnik, 'lastnik_id', n.lastnik_id,
                 'odigranih', l.odigranih, 'zmage', l.zmage, 'remiji', l.remiji, 'porazi', l.porazi,
                 'tocke_za', l.tocke_za, 'tocke', 3 * l.zmage + l.remiji)
                 order by 3 * l.zmage + l.remiji desc, l.tocke_za desc, n.ekipa, l.ekipa)
          from lestvica l
          join imena n on n.id = l.ekipa
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.dvoboji_mini_lige(bigint, int) from public;
grant execute on function public.dvoboji_mini_lige(bigint, int) to anon, authenticated, service_role;

-- Dvoboji ene ekipe v krogu, za pošto ("tvoj dvoboj: ti proti X, 54:41").
-- Krog je številka v tekoči sezoni lige ekipe; brez nje zadnji krog s pari.
-- Vrstica na mini ligo, v kateri ima ekipa v tem krogu dvoboj. Servisna.
create or replace function public.dvoboji_ekipe(p_ekipa bigint, p_krog int default null)
returns table (mini_liga_id bigint, mini_liga text, krog int, nasprotnik_id bigint, nasprotnik text,
               tocke numeric, tocke_nasprotnika numeric, koncan boolean, izid text)
language sql
stable
security definer
set search_path = public
as $$
  with ekipa as (
    select ft.id, sezona_lige(ft.competition_id) as sezona
      from fantasy_teams ft where ft.id = p_ekipa
  ),
  lige as (
    select d.mini_liga_id, e.sezona,
           coalesce(p_krog, max(d.krog)) as krog
      from mini_liga_dvoboji d
      join ekipa e on e.sezona = d.sezona
     where p_ekipa in (d.ekipa_a, d.ekipa_b)
     group by d.mini_liga_id, e.sezona
  )
  select l.mini_liga_id, ml.name, i.krog, i.nasprotnik,
         coalesce(s.team_name, ft.name),
         i.tocke, i.tocke_nasprotnika, i.koncan,
         case when not i.koncan then null
              when i.tocke > i.tocke_nasprotnika then 'zmaga'
              when i.tocke = i.tocke_nasprotnika then 'remi'
              else 'poraz' end
    from lige l
    join mini_lige ml on ml.id = l.mini_liga_id
    cross join lateral izidi_dvobojev(l.mini_liga_id, l.sezona) i
    left join fantasy_teams ft on ft.id = i.nasprotnik
    left join fantasy_team_standings s on s.fantasy_team_id = i.nasprotnik
   where i.ekipa = p_ekipa and i.krog = l.krog
   order by ml.name, l.mini_liga_id;
$$;

revoke all on function public.dvoboji_ekipe(bigint, int) from public, anon, authenticated;
grant execute on function public.dvoboji_ekipe(bigint, int) to service_role;

-- ---------------------------------------------------------------------------
-- Že zaklenjeni krogi tekoče sezone
-- ---------------------------------------------------------------------------
-- Po vrstnem redu zaklepa, da se razpored zavrti, kot bi se ob vsakem krogu.
-- Članstvo šteje ob zaklepu (`joined_at`), zato pari niso drugačni, kot bi
-- bili, če bi dvoboji obstajali od začetka sezone.
do $$
declare
  v record;
begin
  for v in
    select c.mini_liga_id, r.season, r.number, min(r.lineups_locked_at) as ob
      from mini_liga_clani c
      join fantasy_teams ft on ft.id = c.fantasy_team_id
      join rounds r on r.competition_id = ft.competition_id
     where r.lineups_locked_at is not null
       and r.season = sezona_lige(r.competition_id)
     group by c.mini_liga_id, r.season, r.number
     order by c.mini_liga_id, min(r.lineups_locked_at), r.number
  loop
    perform sestavi_dvoboje(v.mini_liga_id, v.season, v.number, v.ob);
  end loop;
end;
$$;
