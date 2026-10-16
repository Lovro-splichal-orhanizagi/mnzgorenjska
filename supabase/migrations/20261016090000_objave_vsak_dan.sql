-- Samodejne objave vsak dan (lastnik, 16. 10. 2026). Poleg ponedeljka (države),
-- četrtka (dosežki) in mejnika še torek, sreda, petek, sobota in nedelja; vsak
-- dan ima dve vrsti, ki se menjata po sodem in lihem tednu ISO (scripts/objave.mjs,
-- TERMINI). Torek in sobota sta reela (video z glasbo).
--
-- Vse funkcije so servisne in vrnejo jsonb dejstev. Kot pri objava_drzave in
-- objava_dosezki štejejo le tekme z uvoženim zapisnikom (`imported_at`), ne
-- kontumacije. Nikoli: mladinske lige, neaktivne lige, anonimizirani igralci,
-- hišne ekipe (le pri štetju upraviteljev), imena uporabnikov ali ekip.
-- Izjema je prava lestvica lige (lestvica_lige), ki kontumacijo šteje z
-- dodeljenim izidom — taka je uradna lestvica.
--
-- Hitrost (~3,7 milijona nastopov): vse začnejo pri ligah (pogled objava_lige,
-- ki ga načrtovalec vidi skozi) in tekoči sezoni ali oknu krogov; nastopi se
-- berejo prek tekem (appearances_match_id_player_id_key) ali igralca
-- (appearances_player_idx), nikoli vsi. Sezonska seštevka (strelci, čiste
-- mreže) najprej izbereta kandidate iz statistika_igralcev, nato jih natančno
-- preštejeta le iz uvoženih tekem.

-- Novi termini, vrsta objave (A/B tedna) in skladba reela (najmanj nedavno rabljena).
alter table public.objave drop constraint objave_slot_check;
alter table public.objave add constraint objave_slot_check
  check (slot in ('pon', 'cet', 'mejnik', 'tor', 'sre', 'pet', 'sob', 'ned'));
alter table public.objave add column vrsta text, add column glasba text;

-- Lige, ki smejo v objavo: aktivne, ne mladinske. Pogled (ne funkcija), da ga
-- načrtovalec vključi v poizvedbo in pozna število lig.
create view public.objava_lige as
  select c.id, c.slug, c.name as ime, coalesce(nullif(c.short_name, ''), c.name) as kratko, co.code as drzava
    from competitions c
    join countries co on co.id = c.country_id
   where c.active and not je_mladinski_slug(c.slug);
revoke all on public.objava_lige from public, anon, authenticated;
grant select on public.objava_lige to service_role;

-- Torek A: ekipa tedna. Po poziciji pet najboljših igralcev zadnjega kroga
-- vsake lige z uvoženo tekmo v oknu; postavo (formacijo) izbere objave.mjs.
create or replace function public.objava_ekipa_tedna(p_od date, p_do date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with krogi as (
    select distinct on (r.competition_id) r.id, r.competition_id, r.number
      from objava_lige l
      join rounds r on r.competition_id = l.id
     where exists (select 1 from matches m
                    where m.round_id = r.id and m.played_on >= p_od and m.played_on < p_do
                      and m.imported_at is not null and not m.kontumacija)
     order by r.competition_id, r.season desc, r.number desc
  ),
  rang as (
    select k.id as round_id, k.competition_id, k.number as krog, p.id as player_id, p.full_name, p.position, p.team_id, ps.points,
           row_number() over (partition by p.position order by ps.points desc, p.id) as rn
      from krogi k
      join player_scores ps on ps.round_id = k.id
      join players p on p.id = ps.player_id and p.anonimiziran_at is null and p.position is not null
  ),
  -- Goli le za izbrane (največ 20), ne za vse igralce vseh krogov.
  izbrani as (
    select r.*, t.name as klub, t.logo_url as grb, l.kratko as liga, l.drzava,
           coalesce((select sum(a.goals) from appearances a join matches m on m.id = a.match_id
                      where m.round_id = r.round_id and a.player_id = r.player_id), 0)::int as goli
      from rang r
      join objava_lige l on l.id = r.competition_id
      join teams t on t.id = r.team_id
     where r.rn <= 5
  )
  select jsonb_build_object(
    'od', p_od,
    'do', p_do,
    'igralci', coalesce((select jsonb_agg(jsonb_build_object(
        'ime', r.full_name, 'klub', r.klub, 'grb', r.grb, 'liga', r.liga, 'drzava', r.drzava,
        'pozicija', r.position, 'krog', r.krog, 'tocke', r.points, 'goli', r.goli)
        order by r.position, r.rn) from izbrani r), '[]')
  )
$$;

-- Torek B: strelci sezone v Evropi (sezona vsake lige na p_do). Kandidati iz
-- statistika_igralcev (indeks liga, sezona), goli pa le iz uvoženih tekem.
create or replace function public.objava_strelci(p_do date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lige as (select l.*, sezona_lige(l.id, p_do - 1) as sezona from objava_lige l),
  kandidati as (
    select s.player_id, l.id as liga_id, l.sezona
      from lige l
      join statistika_igralcev s on s.competition_id = l.id and s.season = l.sezona
     where s.goals > 0
     order by s.goals desc, s.player_id
     limit 60
  ),
  goli as (
    select k.player_id, k.liga_id, sum(a.goals)::int as goli, count(*)::int as tekem_z_goli
      from kandidati k
      join appearances a on a.player_id = k.player_id and a.goals > 0
      join matches m on m.id = a.match_id and m.imported_at is not null and not m.kontumacija and m.played_on < p_do
      join rounds r on r.id = m.round_id and r.competition_id = k.liga_id and r.season = k.sezona
     group by k.player_id, k.liga_id
  )
  select jsonb_build_object(
    'do', p_do,
    'igralci', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('ime', p.full_name, 'klub', t.name, 'grb', t.logo_url, 'liga', l.kratko,
                                  'drzava', l.drzava, 'pozicija', p.position, 'goli', g.goli) as x
          from goli g
          join players p on p.id = g.player_id and p.anonimiziran_at is null
          join lige l on l.id = g.liga_id
          join teams t on t.id = p.team_id
         order by g.goli desc, g.tekem_z_goli, p.id
         limit 10) s), '[]')
  )
$$;

-- Sreda A: liga tedna. Med ligami z uvoženo tekmo v oknu tista z največ
-- upravitelji (brez hišnih), ki je ni na seznamu p_izkljuci (zadnjih osem
-- tednov) in ima vsaj tri klube s tremi odigranimi tekmami sezone. Lestvica
-- (lestvica_lige) se izračuna enkrat, le za izbrano ligo.
create or replace function public.objava_liga(p_od date, p_do date, p_izkljuci text[] default '{}')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lige as (
    select l.*, sezona_lige(l.id, p_do - 1) as sezona from objava_lige l
     where not (l.slug = any (coalesce(p_izkljuci, '{}')))
  ),
  zive as (
    select l.id, l.slug, l.ime, l.kratko, l.drzava, l.sezona, max(r.number) as krog
      from lige l
      join rounds r on r.competition_id = l.id and r.season = l.sezona
      join matches m on m.round_id = r.id
     where m.played_on >= p_od and m.played_on < p_do and m.imported_at is not null and not m.kontumacija
     group by l.id, l.slug, l.ime, l.kratko, l.drzava, l.sezona
  ),
  -- Klubi s tremi odigranimi tekmami sezone, en prehod čez tekme živih lig.
  klubi as (
    select x.liga_id, count(*) filter (where x.tekem >= 3) as klubov
      from (select z.id as liga_id, k.team_id, count(*) as tekem
              from zive z
              join rounds r on r.competition_id = z.id and r.season = z.sezona
              join matches m on m.round_id = r.id and (m.imported_at is not null or m.kontumacija)
              cross join lateral (values (m.home_team_id), (m.away_team_id)) k(team_id)
             group by z.id, k.team_id) x
     group by x.liga_id
  ),
  upr as (
    select ft.competition_id, count(distinct ft.owner_id) as upraviteljev, count(*) as ekip
      from fantasy_teams ft
      join zive z on z.id = ft.competition_id
     where not ft.hisna
     group by ft.competition_id
  ),
  izbrana as (
    select z.*, coalesce(u.upraviteljev, 0) as upraviteljev, coalesce(u.ekip, 0) as ekip
      from zive z
      join klubi k on k.liga_id = z.id and k.klubov >= 3
      left join upr u on u.competition_id = z.id
     order by coalesce(u.upraviteljev, 0) desc, coalesce(u.ekip, 0) desc, z.slug
     limit 1
  ),
  strelec as (
    select p.full_name, t.name as klub, sum(a.goals)::int as goli
      from izbrana i
      join rounds r on r.competition_id = i.id and r.season = i.sezona
      join matches m on m.round_id = r.id and m.imported_at is not null and not m.kontumacija and m.played_on < p_do
      join appearances a on a.match_id = m.id and a.goals > 0
      join players p on p.id = a.player_id and p.anonimiziran_at is null
      join teams t on t.id = p.team_id
     group by p.id, p.full_name, t.name
     order by sum(a.goals) desc, p.id
     limit 1
  )
  select jsonb_build_object(
    'od', p_od,
    'do', p_do,
    'liga', (select jsonb_build_object(
        'slug', i.slug, 'ime', i.ime, 'kratko', i.kratko, 'drzava', i.drzava, 'krog', i.krog,
        'upraviteljev', i.upraviteljev, 'ekip', i.ekip,
        'lestvica', (select jsonb_agg(jsonb_build_object('mesto', t.mesto, 'ime', t.ime, 'grb', t.grb,
                                                         'tekme', t.tekme, 'zmage', t.zmage, 'tocke', t.tocke,
                                                         'razlika', t.razlika) order by t.mesto)
                       from lestvica_lige(i.id, i.sezona) t where t.mesto <= 3),
        'strelec', (select jsonb_build_object('ime', s.full_name, 'klub', s.klub, 'goli', s.goli) from strelec s))
      from izbrana i)
  )
$$;

-- Sreda B: država tedna. Prva država iz objava_drzave (po upraviteljih), ki je
-- ni na seznamu p_izkljuci; zraven število aktivnih lig in ekip (brez hišnih).
create or replace function public.objava_drzava(p_od date, p_do date, p_izkljuci text[] default '{}')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with d as (
    select e
      from jsonb_array_elements(objava_drzave(p_od, p_do) -> 'drzave') with ordinality as x(e, n)
     where not ((e ->> 'drzava') = any (coalesce(p_izkljuci, '{}')))
     order by n
     limit 1
  )
  select jsonb_build_object(
    'od', p_od,
    'do', p_do,
    'drzava', (select d.e || jsonb_build_object(
        'aktivnih_lig', (select count(*) from objava_lige l where l.drzava = d.e ->> 'drzava'),
        'ekip', (select count(*) from fantasy_teams ft join objava_lige l on l.id = ft.competition_id
                  where not ft.hisna and l.drzava = d.e ->> 'drzava'))
      from d)
  )
$$;

-- Petek A: kapetani — igralci v formi, vsota točk zadnjih treh krogov svoje
-- lige (krog z uvoženo tekmo v zadnjih petih tednih pred p_do). Le igralci, ki
-- jih je mogoče kupiti (aktivni, klub ni izstopil).
create or replace function public.objava_forma(p_do date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with krogi as (
    select r.id, r.competition_id,
           row_number() over (partition by r.competition_id order by r.season desc, r.number desc) as rn
      from objava_lige l
      join rounds r on r.competition_id = l.id
     where exists (select 1 from matches m
                    where m.round_id = r.id and m.played_on < p_do and m.played_on >= p_do - 35
                      and m.imported_at is not null and not m.kontumacija)
  ),
  vsota as (
    select ps.player_id, sum(ps.points) as tocke, count(*) as krogov,
           jsonb_agg(ps.points order by k.rn desc) as po_krogih
      from krogi k
      join player_scores ps on ps.round_id = k.id
     where k.rn <= 3
     group by ps.player_id
  )
  select jsonb_build_object(
    'do', p_do,
    'igralci', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('ime', p.full_name, 'klub', t.name, 'grb', t.logo_url, 'liga', l.kratko,
                                  'drzava', l.drzava, 'pozicija', p.position, 'cena', p.value,
                                  'tocke', v.tocke, 'po_krogih', v.po_krogih) as x
          from vsota v
          join players p on p.id = v.player_id and p.anonimiziran_at is null and p.active and p.izstopil_at is null
          join objava_lige l on l.id = p.competition_id
          join teams t on t.id = p.team_id
         where v.krogov >= 2
         order by v.tocke desc, p.id
         limit 6) s), '[]')
  )
$$;

-- Petek B: največji dvigi cene tedna (le dvigi; krog z uvoženo tekmo v oknu).
create or replace function public.objava_cene(p_od date, p_do date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with krogi as (
    select distinct r.id
      from objava_lige l
      join rounds r on r.competition_id = l.id
      join matches m on m.round_id = r.id
     where m.played_on >= p_od and m.played_on < p_do and m.imported_at is not null and not m.kontumacija
  ),
  dvigi as (
    select distinct on (pc.player_id) pc.player_id, pc.old_value, pc.new_value
      from price_changes pc
      join krogi k on k.id = pc.round_id
     where pc.new_value > pc.old_value
     order by pc.player_id, pc.new_value - pc.old_value desc
  )
  select jsonb_build_object(
    'od', p_od,
    'do', p_do,
    'igralci', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('ime', p.full_name, 'klub', t.name, 'grb', t.logo_url, 'liga', l.kratko,
                                  'drzava', l.drzava, 'pozicija', p.position,
                                  'staro', d.old_value, 'novo', d.new_value) as x
          from dvigi d
          join players p on p.id = d.player_id and p.anonimiziran_at is null
          join objava_lige l on l.id = p.competition_id
          join teams t on t.id = p.team_id
         order by d.new_value - d.old_value desc, d.new_value desc, p.id
         limit 6) s), '[]')
  )
$$;

-- Sobota A: predogled vikenda. Neodigrane tekme v oknu, kjer igra vsaj en
-- klub z vrha lestvice (oba z vsaj tremi tekmami); najzanimivejša na ligo
-- (najmanjša vsota mest, nato razlika točk), nato po upraviteljih lige.
-- Mesto je po pravilu lestvica_lige (točke, gol razlika, dani goli, ime), a
-- izračunano v enem prehodu za vse lige s tekmo. Forme (W/D/L) ni: objava le slavi.
create or replace function public.objava_tekme(p_od date, p_do date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lige as (select l.*, sezona_lige(l.id, p_od) as sezona from objava_lige l),
  tekme as (
    select m.id, m.played_on, m.home_team_id, m.away_team_id, r.competition_id
      from lige l
      join rounds r on r.competition_id = l.id and r.season = l.sezona
      join matches m on m.round_id = r.id
     where m.played_on >= p_od and m.played_on < p_do and m.imported_at is null and not m.kontumacija
  ),
  odigrane as (
    select r.competition_id, m.home_team_id, m.away_team_id, m.home_goals, m.away_goals
      from (select distinct competition_id from tekme) x
      join lige l on l.id = x.competition_id
      join rounds r on r.competition_id = l.id and r.season = l.sezona
      join matches m on m.round_id = r.id and (m.imported_at is not null or m.kontumacija)
  ),
  izidi as (
    select competition_id, home_team_id as team_id, home_goals as za, away_goals as proti from odigrane
    union all
    select competition_id, away_team_id, away_goals, home_goals from odigrane
  ),
  lestvice as (
    select s.*, row_number() over (partition by s.competition_id
                                   order by s.tocke desc, s.dani - s.prejeti desc, s.dani desc, t.name) as mesto,
           t.name as ime, t.logo_url as grb
      from (select competition_id, team_id, count(*) as tekme,
                   sum(case when za > proti then 3 when za = proti then 1 else 0 end) as tocke,
                   sum(za) as dani, sum(proti) as prejeti
              from izidi group by competition_id, team_id) s
      join teams t on t.id = s.team_id
  ),
  kandidati as (
    select t.*, d.mesto as md, d.ime as dime, d.grb as dgrb, d.tocke as dtocke,
           g.mesto as mg, g.ime as gime, g.grb as ggrb, g.tocke as gtocke,
           d.mesto + g.mesto as vsota, abs(d.tocke - g.tocke) as razlika
      from tekme t
      join lestvice d on d.competition_id = t.competition_id and d.team_id = t.home_team_id
      join lestvice g on g.competition_id = t.competition_id and g.team_id = t.away_team_id
     where d.tekme >= 3 and g.tekme >= 3 and least(d.mesto, g.mesto) <= 3
  ),
  po_ligi as (
    select distinct on (k.competition_id) k.*
      from kandidati k
     order by k.competition_id, k.vsota, k.razlika, k.id
  ),
  upr as (
    select ft.competition_id, count(distinct ft.owner_id) as n
      from fantasy_teams ft
      join po_ligi p on p.competition_id = ft.competition_id
     where not ft.hisna
     group by ft.competition_id
  )
  select jsonb_build_object(
    'od', p_od,
    'do', p_do,
    'tekme', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('liga', l.kratko, 'drzava', l.drzava, 'datum', k.played_on,
                                  'domaci', jsonb_build_object('ime', k.dime, 'grb', k.dgrb, 'mesto', k.md, 'tocke', k.dtocke),
                                  'gostje', jsonb_build_object('ime', k.gime, 'grb', k.ggrb, 'mesto', k.mg, 'tocke', k.gtocke)) as x
          from po_ligi k
          join lige l on l.id = k.competition_id
          left join upr u on u.competition_id = k.competition_id
         order by k.vsota, k.razlika, coalesce(u.n, 0) desc, k.id
         limit 6) s), '[]')
  )
$$;

-- Nedelja A: številka tedna. Goli, tekme, lige in države tedna; "tekma tedna"
-- le, če sta oba kluba dala vsaj tri gole (slavi oba, nikogar ne zasmehuje).
create or replace function public.objava_stat(p_od date, p_do date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with tekme as (
    select m.id, m.home_goals, m.away_goals, m.home_team_id, m.away_team_id, l.kratko, l.drzava, l.id as liga_id
      from objava_lige l
      join rounds r on r.competition_id = l.id
      join matches m on m.round_id = r.id
     where m.played_on >= p_od and m.played_on < p_do and m.imported_at is not null and not m.kontumacija
  )
  select jsonb_build_object(
    'od', p_od,
    'do', p_do,
    'golov', (select coalesce(sum(home_goals + away_goals), 0) from tekme),
    'tekem', (select count(*) from tekme),
    'lig', (select count(distinct liga_id) from tekme),
    'drzav', (select count(distinct drzava) from tekme),
    'tekma', (select jsonb_build_object('liga', t.kratko, 'drzava', t.drzava,
                                        'domaci', d.name, 'domaci_grb', d.logo_url, 'gostje', g.name, 'gostje_grb', g.logo_url,
                                        'goli_domaci', t.home_goals, 'goli_gostje', t.away_goals)
                from tekme t
                join teams d on d.id = t.home_team_id
                join teams g on g.id = t.away_team_id
               where least(t.home_goals, t.away_goals) >= 3
               order by t.home_goals + t.away_goals desc, t.id
               limit 1)
  )
$$;

-- Nedelja B: najboljše obrambe sezone (najmanj prejetih na tekmo, vsaj pet
-- tekem; le tekme, ne nastopi) in vratarji z največ čistimi mrežami (vsaj
-- 60 minut, vsaj tri): kandidati iz statistika_igralcev, štetje iz uvoženih tekem.
create or replace function public.objava_obramba(p_do date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lige as (select l.*, sezona_lige(l.id, p_do - 1) as sezona from objava_lige l),
  tekme as (
    select m.id, m.home_team_id, m.away_team_id, m.home_goals, m.away_goals, l.id as liga_id
      from lige l
      join rounds r on r.competition_id = l.id and r.season = l.sezona
      join matches m on m.round_id = r.id
     where m.imported_at is not null and not m.kontumacija and m.played_on < p_do
  ),
  po_klubih as (
    select liga_id, team_id, count(*) as tekem, sum(prejeti) as prejeti
      from (select liga_id, home_team_id as team_id, away_goals as prejeti from tekme
            union all
            select liga_id, away_team_id, home_goals from tekme) x
     group by liga_id, team_id
    having count(*) >= 5
  ),
  kandidati as (
    select s.player_id, l.id as liga_id, l.sezona
      from lige l
      join statistika_igralcev s on s.competition_id = l.id and s.season = l.sezona
      join players p on p.id = s.player_id and p.position = 'GK' and p.anonimiziran_at is null
     where s.clean_sheets >= 3
     order by s.clean_sheets desc, s.player_id
     limit 40
  ),
  ciste as (
    select k.player_id, k.liga_id, count(*) as ciste
      from kandidati k
      join appearances a on a.player_id = k.player_id and a.clean_sheet and a.minutes_played >= 60
      join matches m on m.id = a.match_id and m.imported_at is not null and not m.kontumacija and m.played_on < p_do
      join rounds r on r.id = m.round_id and r.competition_id = k.liga_id and r.season = k.sezona
     group by k.player_id, k.liga_id
    having count(*) >= 3
  )
  select jsonb_build_object(
    'do', p_do,
    'ekipe', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('ime', t.name, 'grb', t.logo_url, 'liga', l.kratko, 'drzava', l.drzava,
                                  'tekem', k.tekem, 'prejeti', k.prejeti) as x
          from po_klubih k
          join lige l on l.id = k.liga_id
          join teams t on t.id = k.team_id
         order by k.prejeti::numeric / k.tekem, k.tekem desc, t.id
         limit 5) s), '[]'),
    'vratarji', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('ime', p.full_name, 'klub', t.name, 'grb', t.logo_url, 'liga', l.kratko,
                                  'drzava', l.drzava, 'ciste', c.ciste) as x
          from ciste c
          join players p on p.id = c.player_id
          join lige l on l.id = c.liga_id
          join teams t on t.id = p.team_id
         order by c.ciste desc, p.id
         limit 5) s), '[]')
  )
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'objava_ekipa_tedna(date, date)', 'objava_strelci(date)',
    'objava_liga(date, date, text[])', 'objava_drzava(date, date, text[])', 'objava_forma(date)',
    'objava_cene(date, date)', 'objava_tekme(date, date)', 'objava_stat(date, date)', 'objava_obramba(date)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
