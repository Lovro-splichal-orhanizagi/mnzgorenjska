-- Profil drugega uporabnika ne kaže njegovih ekip ne mini lig (odločitev 11. 10. 2026):
-- vidi le ime, avatar, navijaški klub in dosežke. Ekipe in mini lige vrne le lastniku.

create or replace function public.javni_profil(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p public.profiles%rowtype;
  v_jaz boolean := auth.uid() is not null and auth.uid() = p_id;
  v jsonb;
begin
  select * into p from profiles where id = p_id;
  if not found then
    return null;
  end if;
  if exists (select 1 from fantasy_teams where owner_id = p_id and hisna) then
    return null;
  end if;

  v := jsonb_build_object(
    'id', p.id,
    'ime', p.display_name,
    'javen', p.javni_profil,
    'jaz', v_jaz
  );
  if not p.javni_profil and not v_jaz then
    return v;
  end if;

  v := v || jsonb_build_object(
    'avatar_barva', p.avatar_barva,
    'avatar_ikona', p.avatar_ikona,
    'clan_od', p.created_at,
    'navijam', (
      select jsonb_build_object('id', t.id, 'ime', t.name, 'kratko', t.short_name, 'grb', t.logo_url)
        from teams t where t.id = p.navijam_team_id
    ),
    'ekipe', coalesce((
      with moje as (
        select ft.id, ft.competition_id
          from fantasy_teams ft
          join competitions c on c.id = ft.competition_id
         where ft.owner_id = p_id and not ft.hisna and c.active
      ),
      lestvica as (
        -- Mesto kot na lestvici lige: vse ekipe lige, tudi hišne.
        select s.fantasy_team_id, s.team_name, s.total_points, s.rounds_played,
               s.best_round, s.competition_id,
               rank() over (partition by s.competition_id order by s.total_points desc) as mesto,
               count(*) over (partition by s.competition_id) as ekip
          from fantasy_team_standings s
         where s.competition_id in (select competition_id from moje)
      )
      select jsonb_agg(jsonb_build_object(
               'id', l.fantasy_team_id,
               'ime', l.team_name,
               'tocke', l.total_points,
               'mesto', l.mesto,
               'ekip', l.ekip,
               'krogov', l.rounds_played,
               'liga', k.slug,
               'liga_ime', k.name,
               'liga_kratko', k.short_name,
               'drzava', k.country_code
             ) order by l.total_points desc, k.sort_order)
        from lestvica l
        join moje m on m.id = l.fantasy_team_id
        join competitions_view k on k.id = l.competition_id
    ), '[]'::jsonb),
    'mini_lige', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', ml.id,
               'ime', ml.name,
               'clanov', (select count(*) from mini_liga_clani c2 where c2.mini_liga_id = ml.id)
             ) order by ml.name)
        from mini_lige ml
       where auth.uid() is not null
         and exists (
               select 1 from mini_liga_clani c
                 join fantasy_teams ft on ft.id = c.fantasy_team_id
                where c.mini_liga_id = ml.id and ft.owner_id = p_id
             )
         and sem_v_mini_ligi(ml.id)
    ), '[]'::jsonb),
    -- Dosežki iz obstoječih točk: poceni seštevki ene osebe.
    'dosezki', (
      with krogi as (
        select frp.season, frp.round_number, frp.points, k.short_name as liga
          from fantasy_round_points frp
          join fantasy_teams ft on ft.id = frp.fantasy_team_id
          join competitions k on k.id = ft.competition_id
         where ft.owner_id = p_id and not ft.hisna
      )
      select jsonb_build_object(
        'sezon', (select count(distinct season) from krogi where points > 0),
        'krogov', (select count(*) from krogi where points > 0),
        'najboljsi', (
          select jsonb_build_object('tocke', points, 'krog', round_number, 'sezona', season, 'liga', liga)
            from krogi where points > 0
           order by points desc, season desc, round_number desc
           limit 1
        )
      )
    )
  );
  if not v_jaz then
    v := v - 'ekipe' - 'mini_lige';
  end if;
  return v;
end;
$$;

