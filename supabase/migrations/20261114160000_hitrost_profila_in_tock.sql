-- Javni profil (/u/:id) je trajal 2–3,5 s in anonimnim (meja 3 s) občasno
-- padel. Ekipe in mini lige se drugim ne računajo več (prej izračunane in
-- zavržene), mesto v ligi bere lestvico po ligi, dosežki pa tocke_krogov
-- namesto pogleda fantasy_round_points. Izid je enak.
create or replace function public.javni_profil(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Dosežki iz obstoječih točk: poceni seštevki ene osebe.
    'dosezki', (
      with krogi as (
        -- Neposredno iz tocke_krogov: fantasy_round_points ima drugo vejo
        -- (krogi s čakajočimi kartoni FUSSBALL), ki prebere vse postave, in
        -- tak krog itak nima točk.
        select r.season, r.number as round_number, tk.points, k.short_name as liga
          from fantasy_teams ft
          join tocke_krogov tk on tk.fantasy_team_id = ft.id
          join rounds r on r.id = tk.round_id
          join competitions k on k.id = ft.competition_id
         where ft.owner_id = p_id and not ft.hisna
           and not fussball_round_has_pending(r.id)
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
  -- Ekipe in mini lige vidi le lastnik: drugim jih sploh ne računamo.
  if v_jaz then
    v := v || jsonb_build_object(
    'ekipe', coalesce((
      with moje as (
        select ft.id, ft.competition_id
          from fantasy_teams ft
          join competitions c on c.id = ft.competition_id
         where ft.owner_id = p_id and not ft.hisna and c.active
      ),
      lestvica as (
        -- Mesto kot na lestvici lige: vse ekipe lige, tudi hišne. LATERAL po
        -- ligi: pogled z GROUP BY filter dobi le kot enakost, ne iz IN.
        select s.*
          from (select distinct competition_id from moje) mm
          cross join lateral (
            select s.fantasy_team_id, s.team_name, s.total_points, s.rounds_played,
                   s.best_round, s.competition_id,
                   rank() over (order by s.total_points desc) as mesto,
                   count(*) over () as ekip
              from fantasy_team_standings s
             where s.competition_id = mm.competition_id
          ) s
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
    ), '[]'::jsonb)
    );
  end if;
  return v;
end;
$function$;

revoke all on function public.javni_profil(uuid) from public;
grant execute on function public.javni_profil(uuid) to anon, authenticated;

-- fantasy_round_points: druga veja (krogi s čakajočimi kartoni FUSSBALL) je
-- klicala fussball_round_has_pending za vsak krog in brala vse postave
-- (~1 M vrstic) ne glede na filter. Zdaj začne pri tekmah s 'pending_cards'
-- (isti pogoj kot v funkciji). Vrstice so enake (preverjeno na produkciji).
create or replace view public.fantasy_round_points as
SELECT tk.fantasy_team_id,
    tk.round_id,
    r.season,
    r.number AS round_number,
        CASE
            WHEN fussball_round_has_pending(r.id) THEN NULL::numeric
            ELSE tk.points
        END AS points,
    tk.transfers,
    tk.penalty,
    ft.competition_id,
    fussball_round_has_pending(r.id) AS statistics_pending
   FROM tocke_krogov tk
     JOIN rounds r ON r.id = tk.round_id
     JOIN fantasy_teams ft ON ft.id = tk.fantasy_team_id
UNION ALL
 SELECT ft.id AS fantasy_team_id,
    r.id AS round_id,
    r.season,
    r.number AS round_number,
    NULL::numeric AS points,
    COALESCE(tr.transfers, 0) AS transfers,
    COALESCE(tr.penalty, 0) AS penalty,
    ft.competition_id,
    true AS statistics_pending
   FROM fantasy_teams ft
     JOIN rounds r ON r.competition_id = ft.competition_id
     LEFT JOIN fantasy_transfers tr ON tr.fantasy_team_id = ft.id AND tr.round_id = r.id
  WHERE (r.id IN ( SELECT m.round_id FROM matches m WHERE m.statistics_status = 'pending_cards'::text)) AND (EXISTS ( SELECT 1
           FROM fantasy_lineups fl
          WHERE fl.round_id = r.id AND fl.fantasy_team_id = ft.id)) AND NOT (EXISTS ( SELECT 1
           FROM tocke_krogov tk
          WHERE tk.fantasy_team_id = ft.id AND tk.round_id = r.id));
