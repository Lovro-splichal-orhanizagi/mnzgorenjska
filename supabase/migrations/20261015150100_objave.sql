-- Samodejne objave na Instagramu in Facebooku, faza 1 (osnutki, brez objave).
-- Načrt: docs/superpowers/specs/2026-10-15-samodejne-objave-design.md.
--
-- `objave` hrani osnutek (dejstva, napis, slike) in stanje; piše in bere ga
-- le servis (scripts/objave.mjs). `objava_dejstva` vrne dejstva tedna za
-- državo (ponedeljek) ali vse države (četrtek). Nikoli: mladinske lige,
-- anonimizirani igralci, imena uporabnikov ali ekip, hišne ekipe.

create table public.objave (
  id bigint generated always as identity primary key,
  slot text not null check (slot in ('pon', 'cet')),
  -- Ponedeljek tedna objave (ljubljanski); en osnutek na termin in teden.
  teden date not null,
  drzava text,
  jezik text not null,
  liga text,
  dejstva jsonb not null,
  napis text not null,
  -- Kako je napis nastal: 'claude' ali 'predloga' (preverba ni uspela).
  napis_vir text not null default 'predloga' check (napis_vir in ('claude', 'predloga')),
  mediji text[] not null default '{}',
  stanje text not null default 'osnutek'
    check (stanje in ('osnutek', 'odobreno', 'ustavljeno', 'objavljeno', 'napaka')),
  objava_ob timestamptz not null,
  -- sha256 enkratnega žetona povezave "Ustavi objavo" (faza 2).
  ustavi_zeton_hash text unique,
  napaka text,
  ustvarjeno timestamptz not null default now(),
  unique (slot, teden)
);

alter table public.objave enable row level security;
revoke all on public.objave from anon, authenticated;

-- Ustavi objavo z žetonom iz Discorda. Servisna: povezavo bo v fazi 2
-- odprla funkcija, ki jo kliče s servisnim ključem.
create or replace function public.ustavi_objavo(p_zeton text)
returns boolean
language sql
security definer
set search_path = public
as $$
  with u as (
    update objave set stanje = 'ustavljeno'
     where ustavi_zeton_hash = encode(sha256(convert_to(p_zeton, 'UTF8')), 'hex')
       and stanje in ('osnutek', 'odobreno')
       and objava_ob > now()
    returning 1
  )
  select exists (select 1 from u)
$$;

revoke all on function public.ustavi_objavo(text) from public, anon, authenticated;
grant execute on function public.ustavi_objavo(text) to service_role;

-- Dejstva za objavo. p_drzava null = vse države (četrtek).
-- Okno [p_od, p_do): krog lige šteje, če je imel tekmo v oknu in točke.
create or replace function public.objava_dejstva(p_drzava text, p_od date, p_do date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lige as (
    select c.id, c.slug, c.name, c.short_name, co.code as drzava
      from competitions c
      join countries co on co.id = c.country_id
     where c.active
       and not je_mladinski_slug(c.slug)
       and (p_drzava is null or co.code = p_drzava)
  ),
  -- Zadnji krog lige v oknu (s točkami).
  krogi as (
    select distinct on (r.competition_id) r.id, r.competition_id, r.number, r.season
      from rounds r
      join lige l on l.id = r.competition_id
     where exists (select 1 from matches m
                    where m.round_id = r.id and m.played_on >= p_od and m.played_on < p_do)
       and exists (select 1 from player_scores ps where ps.round_id = r.id)
     order by r.competition_id, r.season desc, r.number desc
  ),
  ekipe as (
    select ft.competition_id,
           count(*) as ekip,
           count(*) filter (where ft.created_at >= p_od and ft.created_at < p_do) as novih
      from fantasy_teams ft
      join lige l on l.id = ft.competition_id
     where not ft.hisna
     group by ft.competition_id
  ),
  -- Točke igralcev kroga (brez anonimiziranih), z goli in vratarji.
  tocke as (
    select k.competition_id, k.id as round_id, p.id as player_id, p.full_name, p.position,
           t.name as team_name, t.short_name as team_short, t.logo_url as team_logo,
           ps.points,
           coalesce((select sum(a.goals) from appearances a join matches m on m.id = a.match_id
                      where m.round_id = k.id and a.player_id = p.id), 0)::int as goli,
           coalesce((select bool_or(a.is_goalkeeper) from appearances a join matches m on m.id = a.match_id
                      where m.round_id = k.id and a.player_id = p.id), false) as v_vratih
      from krogi k
      join player_scores ps on ps.round_id = k.id
      join players p on p.id = ps.player_id and p.anonimiziran_at is null
      join teams t on t.id = p.team_id
  ),
  cene as (
    select k.competition_id, p.full_name, t.name as team_name,
           pc.old_value, pc.new_value, pc.new_value - pc.old_value as razlika
      from krogi k
      join price_changes pc on pc.round_id = k.id
      join players p on p.id = pc.player_id and p.anonimiziran_at is null
      join teams t on t.id = p.team_id
     where pc.new_value <> pc.old_value
  ),
  -- Kapetani kroga: le seštevek in le pri vsaj petih človeških ekipah (kot
  -- izbranost), sicer bi izdal ekipo.
  kapetani as (
    select k.competition_id, fl.player_id, count(*) as izbir,
           sum(count(*)) over (partition by k.competition_id) as vseh
      from krogi k
      join fantasy_lineups fl on fl.round_id = k.id and fl.is_captain
      join fantasy_teams ft on ft.id = fl.fantasy_team_id and not ft.hisna
     group by k.competition_id, fl.player_id
  ),
  kapetan_lige as (
    select distinct on (kp.competition_id) kp.competition_id, p.full_name, t.name as team_name,
           coalesce(ps.points, 0) as points, kp.izbir, kp.vseh,
           round(100.0 * kp.izbir / kp.vseh) as delez
      from kapetani kp
      join krogi k on k.competition_id = kp.competition_id
      join players p on p.id = kp.player_id and p.anonimiziran_at is null
      join teams t on t.id = p.team_id
      left join player_scores ps on ps.round_id = k.id and ps.player_id = kp.player_id
     where kp.vseh >= 5
     order by kp.competition_id, kp.izbir desc, p.id
  ),
  po_ligah as (
    select l.slug, l.name, l.short_name, l.drzava, k.number as krog, k.season as sezona,
           coalesce(e.ekip, 0) as ekip, coalesce(e.novih, 0) as novih_ekip,
           (select jsonb_build_object('ime', x.full_name, 'klub', x.team_name, 'pozicija', x.position,
                                      'tocke', x.points, 'goli', x.goli, 'grb', x.team_logo)
              from tocke x where x.competition_id = l.id
             order by x.points desc, x.goli desc, x.player_id limit 1) as igralec_kroga,
           (select coalesce(jsonb_agg(jsonb_build_object(
                      'player_id', y.player_id, 'full_name', y.full_name, 'position', y.position,
                      'points', y.points, 'team_name', y.team_name, 'team_short', y.team_short,
                      'team_logo', y.team_logo) order by y.points desc), '[]')
              from (select x.*, row_number() over (partition by x.position order by x.points desc, x.player_id) as rn
                      from tocke x where x.competition_id = l.id) y
             where (y.position = 'GK' and y.rn <= 1) or (y.position in ('DEF', 'MID') and y.rn <= 4)
                or (y.position = 'FWD' and y.rn <= 2)) as idealna,
           (select jsonb_build_object('ime', c.full_name, 'klub', c.team_name, 'staro', c.old_value, 'novo', c.new_value)
              from cene c where c.competition_id = l.id and c.razlika > 0
             order by c.razlika desc, c.new_value desc limit 1) as skok,
           (select jsonb_build_object('ime', c.full_name, 'klub', c.team_name, 'staro', c.old_value, 'novo', c.new_value)
              from cene c where c.competition_id = l.id and c.razlika < 0
             order by c.razlika, c.new_value limit 1) as padec,
           (select jsonb_build_object('ime', kl.full_name, 'klub', kl.team_name, 'tocke', kl.points, 'delez', kl.delez)
              from kapetan_lige kl where kl.competition_id = l.id and kl.points <= 2) as kapetan_spodrsljaj,
           (select coalesce(jsonb_agg(jsonb_build_object('ime', x.full_name, 'klub', x.team_name, 'goli', x.goli)
                                       order by x.goli desc), '[]')
              from tocke x where x.competition_id = l.id and x.goli > 0
               and (x.position = 'GK' or x.v_vratih)) as vratar_gol,
           (select coalesce(jsonb_agg(jsonb_build_object('ime', x.full_name, 'klub', x.team_name, 'goli', x.goli)
                                       order by x.goli desc), '[]')
              from tocke x where x.competition_id = l.id and x.goli >= 3) as hattrick
      from lige l
      join krogi k on k.competition_id = l.id
      left join ekipe e on e.competition_id = l.id
  )
  select jsonb_build_object(
    'drzava', p_drzava,
    'od', p_od,
    'do', p_do,
    -- Najprej lige z največ ekipami: prva je glavna liga objave.
    'lige', coalesce((select jsonb_agg(to_jsonb(pl) order by pl.ekip desc, pl.slug) from po_ligah pl), '[]'),
    'liga_tedna', (select jsonb_build_object('slug', l.slug, 'ime', l.name, 'novih_ekip', e.novih)
                     from ekipe e join lige l on l.id = e.competition_id
                    where e.novih > 0 order by e.novih desc, l.slug limit 1),
    'ekip', (select coalesce(sum(ekip), 0) from ekipe),
    'novih_ekip', (select coalesce(sum(novih), 0) from ekipe)
  )
$$;

revoke all on function public.objava_dejstva(text, date, date) from public, anon, authenticated;
grant execute on function public.objava_dejstva(text, date, date) to service_role;
