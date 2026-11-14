-- Izbranost le za preverjene (SLF-360, Nejc 9. 11. 2026).
--
-- `owners` (v koliko človeških ekipah zadnjega zaklenjenega kroga je igralec)
-- je bil javen: anonimni ga je bral prek PostgREST iz `player_standings` in
-- `player_season_standings`, vmesnik pa ga je kazal na profilu, seznamu
-- igralcev, strani kluba in kartici. Odslej ga pogleda vrneta le, kdor sme:
--   * preverjen igralec (aktivna, nepotekla pravica istega uporabnika, potrjen
--     profil, stikalo `preverjeni_racuni`, odrasla oseba brez mladinske ali
--     anonimizirane vrstice: `je_preverjen` + `izlozba_odrasla_oseba`),
--   * admin,
--   * strežnik (service_role, postgres brez JWT).
-- Vsi ostali dobijo NULL, kot pred prvim rokom. Prag 5 človeških ekip in
-- izpust hišnih ekip ostaneta. Pravilo je v bazi, ne v vmesniku, zato velja
-- za API, seznam, profil, klub in kartico enako.
--
-- `izbranost_igralca(id)` vrne preverjenemu razčlenitev po ligah (števec,
-- imenovalec, krog in čas posnetka). Svoj profil: vse povezane vrstice osebe.
-- Tuj profil: vrstice osebe le v državi gledane vrstice. Imen ekip ne vrne:
-- sestave ostajajo zasebne (20261012137100), dokler lastniki ekip ne privolijo.

create or replace function public.vidi_izbranost()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_admin()
      or (auth.uid() is null
          and (current_setting('role', true) = 'service_role'
               or (current_setting('role', true) in ('none', 'postgres', 'supabase_admin')
                   and session_user in ('postgres', 'supabase_admin'))))
      or (auth.uid() is not null and exists (
            select 1 from public.preverjeni_racuni r
             where r.user_id = auth.uid()
               and r.status = 'aktiven'
               and (r.velja_do is null or r.velja_do > now())
               and public.je_preverjen(r.player_id)
               and public.izlozba_odrasla_oseba(r.player_id)))
$$;
revoke all on function public.vidi_izbranost() from public;
grant execute on function public.vidi_izbranost() to anon, authenticated, service_role;

-- Pogleda: enaka kot v 20261012137100 / 20261014000100, le `owners` gre skozi
-- `(select vidi_izbranost())` (InitPlan: en klic na poizvedbo, ne na vrstico),
-- štetje pa se pri NE preskoči.
create or replace view public.player_standings as
 SELECT po.id,
    po.full_name,
    po."position",
    po.position_source,
    po.team_id,
    po.team_name,
    po.team_short,
    po.value,
    po.matches,
    po.minutes,
    po.goals,
    po.clean_sheets,
    COALESCE(t.points, (0)::numeric) AS points,
    COALESCE(f.points, (0)::numeric) AS form,
    COALESCE(z.points, (0)::numeric) AS last_round,
        CASE
            WHEN (po.matches > 0) THEN round((COALESCE(t.points, (0)::numeric) / (po.matches)::numeric), 2)
            ELSE (0)::numeric
        END AS points_per_match,
        CASE
            WHEN (po.value > (0)::numeric) THEN round((COALESCE(t.points, (0)::numeric) / po.value), 2)
            ELSE (0)::numeric
        END AS points_per_value,
        CASE
            WHEN NOT (SELECT public.vidi_izbranost()) OR (zk.id IS NULL) OR (zk.ekip < 5) THEN NULL::integer
            ELSE COALESCE(l.owners, 0)
        END AS owners,
    rank() OVER (PARTITION BY po.competition_id ORDER BY COALESCE(t.points, (0)::numeric) DESC) AS rank,
    po.team_logo,
    po.competition_id,
    po.assists
   FROM (((((public.player_overview po
     LEFT JOIN LATERAL ( SELECT sum(ps.points) AS points
           FROM public.player_scores ps
          WHERE (ps.player_id = po.id)) t ON (true))
     LEFT JOIN LATERAL ( SELECT sum(zadnji.points) AS points
           FROM ( SELECT ps.points
                   FROM (public.player_scores ps
                     JOIN public.rounds r ON ((r.id = ps.round_id)))
                  WHERE (ps.player_id = po.id)
                  ORDER BY r.number DESC
                 LIMIT 3) zadnji) f ON (true))
     LEFT JOIN LATERAL ( SELECT ps.points
           FROM (public.player_scores ps
             JOIN public.rounds r ON ((r.id = ps.round_id)))
          WHERE (ps.player_id = po.id)
          ORDER BY r.number DESC
         LIMIT 1) z ON (true))
     LEFT JOIN ( SELECT z.competition_id, z.id,
            ( SELECT count(DISTINCT fl.fantasy_team_id)::integer
                FROM public.fantasy_lineups fl
               WHERE fl.round_id = z.id
                 AND NOT EXISTS (SELECT 1 FROM public.fantasy_teams h
                                  WHERE h.id = fl.fantasy_team_id AND h.hisna)) AS ekip
           FROM ( SELECT DISTINCT ON (r.competition_id) r.competition_id, r.id
                    FROM public.rounds r
                   WHERE r.lineups_locked_at IS NOT NULL
                   ORDER BY r.competition_id, r.season DESC, r.number DESC) z) zk
       ON (zk.competition_id = po.competition_id))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS owners
           FROM public.fantasy_lineups fl
          WHERE ((fl.player_id = po.id) AND (fl.round_id = zk.id)
            AND (SELECT public.vidi_izbranost())
            AND NOT EXISTS (SELECT 1 FROM public.fantasy_teams h
                             WHERE h.id = fl.fantasy_team_id AND h.hisna))) l ON (true));

create or replace view public.player_season_standings as
select po.id,
       po.full_name,
       po.position,
       po.position_source,
       po.team_id,
       po.team_name,
       po.team_short,
       po.team_logo,
       po.value,
       ss.season,
       ss.matches,
       ss.minutes,
       ss.goals,
       ss.clean_sheets,
       ss.points,
       case when ss.matches > 0 then round(ss.points / ss.matches::numeric, 2)
            else 0::numeric end as points_per_match,
       case when po.value > 0::numeric then round(ss.points / po.value, 2)
            else 0::numeric end as points_per_value,
       ss.last_round,
       ss.form,
       case when not (select public.vidi_izbranost()) or zk.id is null or zk.ekip < 5 then null::integer
            else coalesce(l.owners, 0) end as owners,
       rank() over (partition by po.competition_id, ss.season order by ss.points desc) as rank,
       po.competition_id,
       ss.assists
  from public.player_overview po
  join public.statistika_igralcev ss
    on ss.player_id = po.id
  left join (
    select z.competition_id, z.id,
           (select count(distinct fl.fantasy_team_id)::integer
              from public.fantasy_lineups fl
             where fl.round_id = z.id
               and not exists (select 1 from public.fantasy_teams h
                                where h.id = fl.fantasy_team_id and h.hisna)) as ekip
      from (select distinct on (r.competition_id) r.competition_id, r.id
              from public.rounds r
             where r.lineups_locked_at is not null
             order by r.competition_id, r.season desc, r.number desc) z
  ) zk on zk.competition_id = po.competition_id
  left join lateral (
    select count(*)::integer as owners
      from public.fantasy_lineups fl
     where fl.player_id = po.id and fl.round_id = zk.id
       and (select public.vidi_izbranost())
       and not exists (select 1 from public.fantasy_teams h
                        where h.id = fl.fantasy_team_id and h.hisna)
  ) l on true;

-- Razčlenitev po ligah za preverjene. Vrstica na ligo osebe:
--   ekip    človeške ekipe s posnetkom zadnjega zaklenjenega kroga (imenovalec)
--   owners  med njimi tiste z igralcem; NULL pod 5 ekipami
--   krog/sezona/zaklenjen  kateri posnetek se šteje
-- Brez mladinskih in anonimiziranih vrstic; potrjen profil še skozi
-- `izlozba_odrasla_oseba` (oseba z mladinsko vrstico ne dobi nič).
-- Vsaka fantasy ekipa je v eni ligi, zato se vrstice ne podvajajo.
create or replace function public.izbranost_igralca(p_player_id bigint)
returns table (player_id bigint, competition_id bigint, liga text, sezona text, krog integer,
               zaklenjen timestamptz, ekip integer, owners integer, lastni boolean)
language plpgsql stable security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_zahtevek bigint;
  v_lastni boolean := false;
  v_drzava bigint;
begin
  if p_player_id is null or not vidi_izbranost() then
    return;
  end if;
  select c.country_id into v_drzava
    from players p join competitions c on c.id = p.competition_id
   where p.id = p_player_id and p.anonimiziran_at is null and not je_mladinski_slug(c.slug);
  if not found then
    return;
  end if;
  v_zahtevek := prevzem_zahtevek_igralca(p_player_id);
  if v_zahtevek is not null then
    if not izlozba_odrasla_oseba(p_player_id) then
      return;
    end if;
    v_lastni := exists (select 1 from zahtevki_igralca z where z.id = v_zahtevek and z.user_id = auth.uid());
  end if;

  return query
  with vrstice as (
    select p_player_id as id
     where v_zahtevek is null
    union
    select z.player_id from zahtevki_igralca z where z.id = v_zahtevek
    union
    select pi.player_id from povezani_igralci pi where pi.zahtevek_id = v_zahtevek
  ), osebe as (
    select p.id, p.competition_id, c.name as liga
      from vrstice v
      join players p on p.id = v.id and p.anonimiziran_at is null
      join competitions c on c.id = p.competition_id and not je_mladinski_slug(c.slug)
     where v_lastni or c.country_id = v_drzava
  ), krogi as (
    select distinct on (r.competition_id) r.competition_id, r.id, r.season, r.number, r.lineups_locked_at
      from rounds r
     where r.lineups_locked_at is not null
       and r.competition_id in (select o.competition_id from osebe o)
     order by r.competition_id, r.season desc, r.number desc
  )
  select o.id, o.competition_id, o.liga, k.season, k.number, k.lineups_locked_at, s.ekip,
         case when k.id is null or s.ekip < 5 then null::integer else s.owners end,
         v_lastni
    from osebe o
    left join krogi k on k.competition_id = o.competition_id
    left join lateral (
      select count(distinct fl.fantasy_team_id)::integer as ekip,
             count(distinct fl.fantasy_team_id) filter (where fl.player_id = o.id)::integer as owners
        from fantasy_lineups fl
        join fantasy_teams ft on ft.id = fl.fantasy_team_id and not ft.hisna
       where fl.round_id = k.id
    ) s on k.id is not null
   order by s.owners desc nulls last, o.competition_id;
end;
$$;
revoke all on function public.izbranost_igralca(bigint) from public;
grant execute on function public.izbranost_igralca(bigint) to anon, authenticated, service_role;
