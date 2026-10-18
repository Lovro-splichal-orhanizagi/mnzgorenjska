-- SLFF Scout, stran Klub (del 1): pregled kluba za trenerja in skavta.
-- Spec: docs/superpowers/specs/2026-10-18-scout-klub-design.md

alter table scout.dnevnik drop constraint dnevnik_vrsta_check;
alter table scout.dnevnik add constraint dnevnik_vrsta_check
  check (vrsta = any (array['isci', 'igralec', 'podobni', 'vrzeli', 'opazuj', 'opazovani', 'klub']));

create or replace function scout.klub_jedro(p_model bigint, p_country bigint, p_team bigint)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_liga bigint;
  v_moc double precision;
  v_sezona text;
  v_leto int;
  v_glava jsonb;
  v_ekipa jsonb;
  v_kader jsonb;
begin
  -- Liga kluba: odrasla liga, v kateri klub igra tekoče sezone (največ tekem, nato id);
  -- šele brez tekem najmočnejša odrasla liga zadnjega leta z Elo (kot drugod v Scoutu).
  select r.competition_id into v_liga
    from matches m join rounds r on r.id = m.round_id join competitions c on c.id = r.competition_id
   where p_team in (m.home_team_id, m.away_team_id)
     and r.season = public.sezona_lige(r.competition_id)
     and not je_mladinski_slug(c.slug) and c.country_id = p_country
   group by r.competition_id
   order by count(*) desc, r.competition_id
   limit 1;
  if v_liga is null then
    select l.competition_id into v_liga from scout.liga_kluba(p_model, p_team) l;
  end if;
  select m.moc into v_moc from scout.lige_moc m where m.model_id = p_model and m.competition_id = v_liga;

  if v_liga is not null then
    -- Tekoča sezona lige (koledarska ali 2026/27), ne zadnja z odigrano tekmo.
    v_sezona := public.sezona_lige(v_liga);
    with lt as (select * from public.lestvica_lige(v_liga, v_sezona))
    select jsonb_build_object(
             'competition_id', v_liga,
             'liga', (select c.name from competitions c where c.id = v_liga),
             'sezona', lt.sezona,
             'mesto', lt.mesto,
             'klubov', (select count(*) from lt),
             'tekme', lt.tekme,
             'tocke', lt.tocke,
             'forma', lt.forma)
      into v_glava
      from lt where lt.team_id = p_team;

    select max(e.leto) into v_leto
      from scout.ekipe_elo e join competitions c on c.id = e.competition_id
     where e.model_id = p_model and e.team_id = p_team and not je_mladinski_slug(c.slug);
    v_glava := coalesce(v_glava, jsonb_build_object('competition_id', v_liga, 'sezona', v_sezona,
                 'liga', (select c.name from competitions c where c.id = v_liga)))
      || jsonb_build_object(
           'elo', (select e.elo from scout.ekipe_elo e join competitions c on c.id = e.competition_id
                    where e.model_id = p_model and e.team_id = p_team and e.leto = v_leto
                      and not je_mladinski_slug(c.slug)
                    order by (e.competition_id = v_liga) desc, e.elo desc, e.competition_id limit 1),
           'elo_lani', (select e.elo from scout.ekipe_elo e join competitions c on c.id = e.competition_id
                         where e.model_id = p_model and e.team_id = p_team and e.leto = v_leto - 1
                           and not je_mladinski_slug(c.slug)
                         order by (e.competition_id = v_liga) desc, e.elo desc, e.competition_id limit 1),
           'moc_mesto', case when v_moc is not null then
                          1 + (select count(*) from scout.lige_moc m join competitions c on c.id = m.competition_id
                                where m.model_id = p_model and c.country_id = p_country
                                  and not je_mladinski_slug(c.slug) and m.moc > v_moc) end,
           'lig', (select count(*) from scout.lige_moc m join competitions c on c.id = m.competition_id
                    where m.model_id = p_model and c.country_id = p_country and not je_mladinski_slug(c.slug)));
  end if;

  if v_liga is not null then
    with tekme as (
      select m.* from matches m join rounds r on r.id = m.round_id
       where r.competition_id = v_liga and r.season = v_sezona
         and (m.imported_at is not null or m.kontumacija)
    ),
    izidi as (
      select home_team_id as team_id, true as doma, home_goals as za, away_goals as proti from tekme
      union all
      select away_team_id, false, away_goals, home_goals from tekme
    ),
    po_klubu as (
      select i.team_id,
             count(*)::float as tekme,
             avg(case when za > proti then 3 when za = proti then 1 else 0 end) as tocke,
             avg(za) as za,
             avg(proti) as proti,
             avg((proti = 0)::int) as ciste,
             avg(case when za > proti then 3 when za = proti then 1 else 0 end) filter (where doma) as tocke_doma,
             avg(case when za > proti then 3 when za = proti then 1 else 0 end) filter (where not doma) as tocke_gost,
             avg(za) filter (where doma) as za_doma,
             avg(proti) filter (where doma) as proti_doma,
             avg(za) filter (where not doma) as za_gost,
             avg(proti) filter (where not doma) as proti_gost
        from izidi i group by i.team_id
    ),
    kartoni as (
      select a.team_id, sum(a.yellow_cards + a.red_cards)::float / nullif(count(distinct a.match_id), 0) as kartoni
        from appearances a join tekme t on t.id = a.match_id group by a.team_id
    ),
    vse as (select p.*, k.kartoni from po_klubu p left join kartoni k on k.team_id = p.team_id)
    select jsonb_build_object(
             'klub', (select to_jsonb(v) - 'team_id' from vse v where v.team_id = p_team),
             'liga', (select jsonb_build_object(
                        'tekme', avg(v.tekme), 'tocke', avg(v.tocke), 'za', avg(v.za), 'proti', avg(v.proti),
                        'ciste', avg(v.ciste), 'tocke_doma', avg(v.tocke_doma), 'tocke_gost', avg(v.tocke_gost),
                        'za_doma', avg(v.za_doma), 'proti_doma', avg(v.proti_doma),
                        'za_gost', avg(v.za_gost), 'proti_gost', avg(v.proti_gost),
                        'kartoni', avg(v.kartoni))
                        from vse v))
      into v_ekipa;

    select coalesce(jsonb_agg(jsonb_build_object(
             'player_id', k.player_id, 'ime', p.full_name, 'skupina', k.skupina,
             'nastopi', coalesce(s.nastopi, 0), 'minute', k.minute, 'delez_minut', k.delez_minut,
             'zacetki_delez', k.zacetki_delez, 'goli', coalesce(s.goli, 0),
             'onoff_ref_90', k.onoff_ref_90, 'kartoni_90', k.kartoni_90, 'trend_minut', k.trend_minut)
             order by k.minute desc), '[]'::jsonb)
      into v_kader
      from scout.kazalniki k
      join players p on p.id = k.player_id
      -- Lateral z offset 0: vidni po igralcu, ne za celo državo (kot vrzeli_jedro).
      join lateral (select true as ok from scout.vidni(p_model, p_country) v
                     where v.player_id = k.player_id offset 0) w on true
      left join lateral (
        select (count(*) filter (where a.minutes_played > 0))::int as nastopi, sum(a.goals)::int as goli
          from appearances a join matches m on m.id = a.match_id join rounds r on r.id = m.round_id
         where a.player_id = k.player_id and a.team_id = p_team
           and r.competition_id = v_liga and r.season = v_sezona) s on true
     where k.model_id = p_model and k.team_id = p_team and k.competition_id = v_liga
       and k.sezona = v_sezona and k.minute > 0;
  end if;

  return jsonb_build_object(
    'team_id', p_team,
    'ime', (select t.name from teams t where t.id = p_team),
    'country_id', p_country,
    'admin', is_admin(),
    'glava', v_glava,
    'ekipa', v_ekipa,
    'kader', coalesce(v_kader, '[]'::jsonb),
    'vrzeli', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
                 from scout.vrzeli_jedro(p_model, p_country, p_team) r));
end;
$$;

create or replace function public.scout_klub(p_team_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d record;
  v_team bigint;
begin
  select * into d from scout.dostop('klub', null, jsonb_build_object('team', p_team_id));
  v_team := coalesce(p_team_id, d.team_id);
  -- Tuj klub le administratorju in le v državi naročnine; nikoli tiho nazaj na svoj klub.
  if v_team <> d.team_id and not (is_admin()
       and exists (select 1 from teams t where t.id = v_team and t.country_id = d.country_id)) then
    raise insufficient_privilege using message = 'Scout: le pregled svojega kluba.';
  end if;
  return scout.klub_jedro(d.model_id, d.country_id, v_team);
end;
$$;

revoke all on function scout.klub_jedro(bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.scout_klub(bigint) from public, anon;
grant execute on function public.scout_klub(bigint) to authenticated;
