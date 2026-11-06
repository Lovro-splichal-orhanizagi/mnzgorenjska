-- objava_dosezki je 5. 11. 2026 trikrat padla z "upstream request timeout" (SLF-305,
-- četrtkova objava je izpadla): prehod je klic odrezal pri ~30 s, statement_timeout
-- za service_role je 60 s. Manj je dela, rezultat je enak razen pri vratarjih (spodaj):
-- * tocke le od šestih točk naprej (pod šest ni ne najvec_tock ne rekorda),
-- * goli le za igralce z največ točkami, ne za vseh 208 tisoč vrstic tedna,
-- * prejšnji krogi rekorda enkrat na krog, ne enkrat na igralca,
-- * zgodovina čistih mrež le za vratarje s čisto mrežo v oknu.

create or replace function public.objava_dosezki(p_od date, p_do date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lige as (
    select c.id, c.slug, coalesce(nullif(c.short_name, ''), c.name) as kratko, co.code as drzava
      from competitions c
      join countries co on co.id = c.country_id
     where c.active and not je_mladinski_slug(c.slug)
  ),
  tekme as (
    select m.id, m.round_id, r.competition_id, r.season, r.number
      from matches m
      join rounds r on r.id = m.round_id
      join lige l on l.id = r.competition_id
     where m.played_on >= p_od and m.played_on < p_do
       and m.imported_at is not null and not m.kontumacija
  ),
  krogi as (
    select distinct round_id, competition_id, season, number from tekme
  ),
  -- Nastopi tekem okna; klub je klub nastopa.
  nastopi as (
    select a.player_id, a.goals, a.is_goalkeeper, a.clean_sheet, p.position, p.full_name,
           tm.name as klub, tm.logo_url as grb, l.kratko as liga, l.drzava
      from appearances a
      join tekme t on t.id = a.match_id
      join lige l on l.id = t.competition_id
      join players p on p.id = a.player_id and p.anonimiziran_at is null
      join teams tm on tm.id = a.team_id
     where a.minutes_played > 0
  ),
  -- Pod šest točk ni ne najvec_tock ne rekorda: 34 tisoč vrstic namesto 208 tisoč.
  tocke as (
    select k.round_id, k.competition_id, k.season, k.number, ps.points, p.id as player_id,
           p.full_name, t.name as klub, t.logo_url as grb, l.kratko as liga, l.drzava
      from krogi k
      join lige l on l.id = k.competition_id
      join player_scores ps on ps.round_id = k.round_id and ps.points >= 6
      join players p on p.id = ps.player_id and p.anonimiziran_at is null
      join teams t on t.id = p.team_id
  ),
  -- Goli le za najboljše, ne za vse igralce vseh krogov.
  najboljsi as (
    select t.*, coalesce((select sum(a.goals) from appearances a join matches m on m.id = a.match_id
                           where m.round_id = t.round_id and a.player_id = t.player_id), 0)::int as goli
      from tocke t
     where t.points = (select max(x.points) from tocke x)
  ),
  -- Rekord lige v sezoni: več točk kot kdorkoli v prejšnjih (vsaj štirih) krogih.
  -- Prejšnji krogi se preberejo enkrat na krog, ne enkrat na igralca.
  prejsnji as materialized (
    select k.round_id, pr.prej
      from krogi k
      cross join lateral (
        select max(ps2.points) as prej, count(distinct r2.id) as krogov
          from player_scores ps2
          join rounds r2 on r2.id = ps2.round_id
         where r2.competition_id = k.competition_id and r2.season = k.season and r2.number < k.number
      ) pr
     where pr.krogov >= 4
  ),
  rekordi as (
    select x.*, pr.prej
      from tocke x
      join prejsnji pr on pr.round_id = x.round_id
     where x.points > pr.prej
  ),
  -- Niz čistih mrež: zaporedni nastopi vratarja s čisto mrežo, zadnji v oknu.
  -- Vratar brez čiste mreže v oknu niza nima: zgodovina le za ostale.
  vratarji as (
    select distinct n.player_id from nastopi n where n.clean_sheet and (n.is_goalkeeper or n.position = 'GK')
  ),
  zgodovina as (
    select a.player_id, coalesce(a.clean_sheet, false) as cista,
           row_number() over (partition by a.player_id order by m.played_on desc, m.id desc) as rn
      from appearances a
      join vratarji v on v.player_id = a.player_id
      join players p on p.id = a.player_id
      join matches m on m.id = a.match_id
     where a.minutes_played > 0 and (a.is_goalkeeper or p.position = 'GK')
       and m.imported_at is not null and not m.kontumacija
       and m.played_on < p_do and m.played_on >= p_do - 400
  ),
  nizi as (
    select z.player_id, coalesce(min(z.rn) filter (where not z.cista) - 1, count(*)) as niz
      from zgodovina z group by z.player_id
  ),
  manager as (
    select tk.points, l.drzava
      from tocke_krogov tk
      join krogi k on k.round_id = tk.round_id
      join fantasy_teams ft on ft.id = tk.fantasy_team_id and not ft.hisna
      join lige l on l.id = ft.competition_id
     where tk.points > 0
     order by tk.points desc, tk.fantasy_team_id
     limit 1
  )
  select jsonb_build_object(
    'od', p_od,
    'do', p_do,
    'hattrick', coalesce((select jsonb_agg(x order by (x->>'goli')::int desc) from (
        select jsonb_build_object('ime', n.full_name, 'klub', n.klub, 'grb', n.grb, 'liga', n.liga,
                                  'drzava', n.drzava, 'goli', n.goals) as x
          from nastopi n where n.goals >= 3 order by n.goals desc, n.player_id limit 3) s), '[]'),
    'vratar_gol', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('ime', n.full_name, 'klub', n.klub, 'grb', n.grb, 'liga', n.liga,
                                  'drzava', n.drzava, 'goli', n.goals) as x
          from nastopi n where n.goals > 0 and (n.is_goalkeeper or n.position = 'GK')
         order by n.goals desc, n.player_id limit 3) s), '[]'),
    'najvec_tock', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('ime', t.full_name, 'klub', t.klub, 'grb', t.grb, 'liga', t.liga,
                                  'drzava', t.drzava, 'krog', t.number, 'tocke', t.points, 'goli', t.goli) as x
          from najboljsi t order by t.goli desc, t.player_id limit 1) s), '[]'),
    'rekord_lige', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('ime', r.full_name, 'klub', r.klub, 'grb', r.grb, 'liga', r.liga,
                                  'drzava', r.drzava, 'krog', r.number, 'tocke', r.points, 'prej', r.prej) as x
          from rekordi r order by r.points desc, r.player_id limit 3) s), '[]'),
    'skok', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('ime', p.full_name, 'klub', tm.name, 'grb', tm.logo_url, 'liga', l.kratko,
                                  'drzava', l.drzava, 'staro', pc.old_value, 'novo', pc.new_value) as x
          from price_changes pc
          join krogi k on k.round_id = pc.round_id
          join lige l on l.id = k.competition_id
          join players p on p.id = pc.player_id and p.anonimiziran_at is null
          join teams tm on tm.id = p.team_id
         where pc.new_value > pc.old_value
         order by pc.new_value - pc.old_value desc, pc.new_value desc, p.id limit 1) s), '[]'),
    'cista_mreza', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('ime', n.full_name, 'klub', n.klub, 'grb', n.grb, 'liga', n.liga,
                                  'drzava', n.drzava, 'niz', z.niz) as x
          from nizi z
          join lateral (select * from nastopi n where n.player_id = z.player_id limit 1) n on true
         where z.niz >= 3 order by z.niz desc, z.player_id limit 3) s), '[]'),
    'manager_tedna', (select jsonb_build_object('tocke', m.points, 'drzava', m.drzava) from manager m),
    'novih_upraviteljev', (select count(*) from profiles p
                            where p.created_at >= p_od and p.created_at < p_do
                              and not exists (select 1 from fantasy_teams h where h.owner_id = p.id and h.hisna)),
    'uporabnikov', skupaj_uporabnikov()
  )
$$;
