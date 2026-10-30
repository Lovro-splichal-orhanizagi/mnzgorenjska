-- NEVER MERGE. Disposable hosted DB only; synthetic source-free G1/G9 geometry.
-- Print only bounded aggregate facts and exact competition routing headers.
-- This precedes the strict guard so a fresh disposable run identifies the
-- specific state mismatch without exposing any user or football row content.
BEGIN READ ONLY;
SELECT 'SCRATCH_STATE_DIAGNOSTIC ' || jsonb_build_object(
  'badenVersionCount',(SELECT count(*) FROM private_baden_transition.versions),
  'badenVersionKindCount',(SELECT count(*) FROM private_baden_transition.versions
                           WHERE source_binding->>'kind'='baden-cold-source-binding-DATA'),
  'badenCatalogCount',(SELECT count(*) FROM private_baden_history.catalog),
  'headers',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id',c.id,'slug',c.slug,'source',c.source,
      'sourceLeagueCode',c.source_league_code,'countryCode',co.code,
      'active',c.active,'firstRound',c.prvi_fantasy_krog,
      'offset',c.rok_pomak_ur,'calendar',c.sezona_koledarska,
      'sourcePolicy',c.source_policy) ORDER BY c.id),'[]'::jsonb)
    FROM competitions c LEFT JOIN countries co ON co.id=c.country_id
    WHERE c.id IN (783,797) OR c.slug IN ('es-ct-segona-g1','es-ct-tercera-g9')),
  'exactHeaderCount',(SELECT count(*) FROM competitions c JOIN countries co ON co.id=c.country_id
    WHERE (c.id=783 AND c.slug='es-ct-segona-g1' AND c.source_league_code='4109388-4109627'
           OR c.id=797 AND c.slug='es-ct-tercera-g9' AND c.source_league_code='4118349-4118588')
      AND co.code='ES' AND c.source='fcf' AND c.source_policy IS NULL
      AND NOT c.active AND NOT c.sezona_koledarska AND c.prvi_fantasy_krog=1
      AND c.rok_pomak_ur=6 AND c.date_only_deadline_policy IS NULL),
  'dateOnlyPolicyNullFixedIdCount',(SELECT count(*) FROM competitions
                                    WHERE id IN (783,797) AND date_only_deadline_policy IS NULL),
  'roundsFixedIdCount',(SELECT count(*) FROM rounds WHERE competition_id IN (783,797)),
  'roundsTargetSlugCount',(SELECT count(*) FROM rounds r JOIN competitions c ON c.id=r.competition_id
                           WHERE c.slug IN ('es-ct-segona-g1','es-ct-tercera-g9')),
  'playersFixedIdCount',(SELECT count(*) FROM players WHERE competition_id IN (783,797)),
  'playersTargetSlugCount',(SELECT count(*) FROM players p JOIN competitions c ON c.id=p.competition_id
                            WHERE c.slug IN ('es-ct-segona-g1','es-ct-tercera-g9')),
  'fantasyTeamsFixedIdCount',(SELECT count(*) FROM fantasy_teams WHERE competition_id IN (783,797)),
  'installedPoliciesFixedIdCount',(SELECT count(*) FROM private_historical_statistics.installed_policies
                                    WHERE competition_id IN (783,797)),
  'futureReceiptsFixedIdCount',(SELECT count(*) FROM private_fcf_future_target_release.receipts
                                 WHERE competition_id IN (783,797)),
  'teamIdCollisionCount',(SELECT count(*) FROM teams WHERE id BETWEEN 971000 AND 971115),
  'roundIdCollisionCount',(SELECT count(*) FROM rounds WHERE id BETWEEN 972000 AND 972130),
  'matchIdCollisionCount',(SELECT count(*) FROM matches WHERE id BETWEEN 973000 AND 974239)
)::text;
ROLLBACK;
BEGIN;
-- TEST ONLY: actual fresh-run diagnostic 41119907523 proves the catalog's
-- auto IDs differ from the fixed production IDs. Preserve all four headers
-- while swapping their IDs only after checking every actual incoming FK.
CREATE TEMP TABLE scratch_header_rekey AS
SELECT c.id old_id, m.new_id, to_jsonb(c)-'id' header
FROM competitions c JOIN (VALUES
  (752::bigint,783::bigint,'es-ct-segona-g1','fcf','4109388-4109627'),
  (766::bigint,797::bigint,'es-ct-tercera-g9','fcf','4118349-4118588'),
  (783::bigint,752::bigint,'hr-u19-2nl-centar','hns','114985034'),
  (797::bigint,766::bigint,'hr-bj-u19-sjever','hns','114681204')
)m(old_id,new_id,slug,source,code)
ON c.id=m.old_id AND c.slug=m.slug AND c.source=m.source
 AND c.source_league_code=m.code AND NOT c.active AND c.source_policy IS NULL;
DO $rekey$
DECLARE dependency record; dependent_count bigint;
BEGIN
 IF (SELECT count(*) FROM scratch_header_rekey)<>4
    OR EXISTS(SELECT 1 FROM competitions WHERE id IN(-971783,-971797))
 THEN RAISE EXCEPTION 'SCRATCH: exact four witnessed empty-header mappings required'; END IF;
 FOR dependency IN
  SELECT ns.nspname,t.relname,a.attname,cardinality(fk.conkey) children,
         cardinality(fk.confkey) parents,pa.attname parent_column
  FROM pg_constraint fk JOIN pg_class t ON t.oid=fk.conrelid
  JOIN pg_namespace ns ON ns.oid=t.relnamespace
  JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=fk.conkey[1]
  JOIN pg_attribute pa ON pa.attrelid=fk.confrelid AND pa.attnum=fk.confkey[1]
  WHERE fk.contype='f' AND fk.confrelid='public.competitions'::regclass
 LOOP
  IF dependency.children<>1 OR dependency.parents<>1 OR dependency.parent_column<>'id'
  THEN RAISE EXCEPTION 'SCRATCH: unsupported competition FK before header rekey'; END IF;
  EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I=ANY($1)',
    dependency.nspname,dependency.relname,dependency.attname)
    INTO dependent_count USING ARRAY[752,766,783,797]::bigint[];
  IF dependent_count<>0 THEN RAISE EXCEPTION 'SCRATCH: dependent rows prevent header rekey'; END IF;
 END LOOP;
 UPDATE competitions SET id=-971783 WHERE id=783;
 UPDATE competitions SET id=-971797 WHERE id=797;
 UPDATE competitions SET id=783 WHERE id=752;
 UPDATE competitions SET id=797 WHERE id=766;
 UPDATE competitions SET id=752 WHERE id=-971783;
 UPDATE competitions SET id=766 WHERE id=-971797;
 IF EXISTS(SELECT 1 FROM scratch_header_rekey b LEFT JOIN competitions c ON c.id=b.new_id
           WHERE c.id IS NULL OR to_jsonb(c)-'id' IS DISTINCT FROM b.header)
    OR EXISTS(SELECT 1 FROM competitions WHERE id IN(-971783,-971797))
 THEN RAISE EXCEPTION 'SCRATCH: header fields or exact rekey membership changed'; END IF;
END $rekey$;
DO $seed$
DECLARE changed integer;
BEGIN
  IF (SELECT count(*) FROM private_baden_transition.versions
      WHERE source_binding->>'kind'='baden-cold-source-binding-DATA') <> 1
     OR (SELECT count(*) FROM private_baden_history.catalog) <> 1
     OR (SELECT count(*) FROM competitions c JOIN countries co ON co.id=c.country_id
         WHERE (c.id=783 AND c.slug='es-ct-segona-g1' AND c.source_league_code='4109388-4109627'
                OR c.id=797 AND c.slug='es-ct-tercera-g9' AND c.source_league_code='4118349-4118588')
           AND co.code='ES' AND c.source='fcf' AND c.source_policy IS NULL
           AND NOT c.active AND NOT c.sezona_koledarska AND c.prvi_fantasy_krog=1
           AND c.rok_pomak_ur=6 AND c.date_only_deadline_policy IS NULL) <> 2
     OR EXISTS (SELECT 1 FROM rounds WHERE competition_id IN (783,797))
     OR EXISTS (SELECT 1 FROM players WHERE competition_id IN (783,797))
     OR EXISTS (SELECT 1 FROM fantasy_teams WHERE competition_id IN (783,797))
     OR EXISTS (SELECT 1 FROM private_historical_statistics.installed_policies
                WHERE competition_id IN (783,797))
     OR EXISTS (SELECT 1 FROM private_fcf_future_target_release.receipts
                WHERE competition_id IN (783,797))
     OR EXISTS (SELECT 1 FROM teams WHERE id BETWEEN 971000 AND 971115)
     OR EXISTS (SELECT 1 FROM rounds WHERE id BETWEEN 972000 AND 972130)
     OR EXISTS (SELECT 1 FROM matches WHERE id BETWEEN 973000 AND 974239)
  THEN RAISE EXCEPTION 'SCRATCH: exact seeded Spanish headers, empty target rows and populated Baden M2 required'; END IF;
  -- The fresh catalog seeds both competitions before six-history is installed.
  -- Set only this reviewed routing field for the disposable capture fixture.
  UPDATE competitions SET source_policy='es-fcf-six-reviewed-history-v1'
    WHERE id IN (783,797) AND source_policy IS NULL;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 2 THEN RAISE EXCEPTION 'SCRATCH: exact two header policy updates required'; END IF;
END $seed$;
CREATE TEMP TABLE scratch_baden_version AS
  SELECT manifest_sha256, source_binding FROM private_baden_transition.versions;
INSERT INTO teams(id,name,short_name,country_id)
OVERRIDING SYSTEM VALUE
SELECT 971000 + g*100 + i,'TEST ONLY '||g||' club '||i,
       'S'||g||'-'||i,(SELECT id FROM countries WHERE code='ES')
FROM generate_series(0,1) g CROSS JOIN generate_series(0,15) i;
INSERT INTO rounds(id,competition_id,season,number,played_on,deadline_at)
OVERRIDING SYSTEM VALUE
SELECT 972000 + g*100 + n,CASE g WHEN 0 THEN 783 ELSE 797 END,
       '2026/27',n,'2026-09-19'::date + 7*(n-1),
       '2026-09-19T04:00Z'::timestamptz + interval '7 days'*(n-1)
FROM generate_series(0,1) g CROSS JOIN generate_series(1,30) n;
INSERT INTO matches(id,round_id,home_team_id,away_team_id,played_on,
                    zapisnik_id,source_url,source_round)
OVERRIDING SYSTEM VALUE
SELECT 973000 + g*1000 + i,
       972001 + g*100 + i/8,
       971000 + g*100 + 2*(i%8),
       971001 + g*100 + 2*(i%8),
       '2026-09-19'::date + 7*(i/8),
       'es'||(CASE g WHEN 0 THEN 4109388 ELSE 4118349 END + i),
       'https://www.fcf.cat/ca/competicio/acta/'||
         (CASE g WHEN 0 THEN 4109388 ELSE 4118349 END + i),
       1 + i/8
FROM generate_series(0,1) g CROSS JOIN generate_series(0,239) i;
INSERT INTO players(competition_id,team_id,first_name,last_name,position)
SELECT CASE g WHEN 0 THEN 783 ELSE 797 END,971000 + g*100,
       'TEST ONLY','capture player '||g,'MID'
FROM generate_series(0,1) g;
COMMIT;

BEGIN READ ONLY;
DO $capture$
DECLARE g1 jsonb; g9 jsonb;
BEGIN
  IF (SELECT count(*) FROM private_baden_transition.versions) <> 1
     OR NOT EXISTS (SELECT 1 FROM private_baden_transition.versions v
                    JOIN scratch_baden_version b
                      ON b.manifest_sha256=v.manifest_sha256
                     AND b.source_binding=v.source_binding)
  THEN RAISE EXCEPTION 'SCRATCH: installed Baden M2 changed before captures'; END IF;
  IF EXISTS (SELECT 1 FROM appearances a JOIN matches m ON m.id=a.match_id
             JOIN rounds r ON r.id=m.round_id WHERE r.competition_id IN (783,797))
     OR EXISTS (SELECT 1 FROM goals g JOIN matches m ON m.id=g.match_id
                JOIN rounds r ON r.id=m.round_id WHERE r.competition_id IN (783,797))
     OR EXISTS (SELECT 1 FROM fantasy_teams WHERE competition_id IN (783,797))
  THEN RAISE EXCEPTION 'SCRATCH: no target appearances, goals or users required'; END IF;
  g1 := private_fcf_g1_native800.capture_current('es-ct-segona-g1',ARRAY[]::text[]);
  g9 := private_fcf_native800.capture_current('es-ct-tercera-g9',ARRAY[]::text[]);
  IF jsonb_array_length(g1#>'{native,rounds}') IS DISTINCT FROM 30
     OR jsonb_array_length(g1#>'{native,matches}') IS DISTINCT FROM 240
     OR jsonb_array_length(g9#>'{native,rounds}') IS DISTINCT FROM 30
     OR jsonb_array_length(g9#>'{native,matches}') IS DISTINCT FROM 240
     OR jsonb_array_length(g1#>'{databaseInventory,teams}') IS DISTINCT FROM 16
     OR jsonb_array_length(g9#>'{databaseInventory,teams}') IS DISTINCT FROM 16
     OR jsonb_array_length(g1#>'{databaseInventory,players}') IS DISTINCT FROM 1
     OR jsonb_array_length(g9#>'{databaseInventory,players}') IS DISTINCT FROM 1
     OR g1#>>'{native,dependencies,complete}' IS DISTINCT FROM 'true'
     OR g9#>>'{native,dependencies,complete}' IS DISTINCT FROM 'true'
     OR g1#>>'{native,dependencies,competitionUserRows}' IS DISTINCT FROM '0'
     OR g9#>>'{native,dependencies,competitionUserRows}' IS DISTINCT FROM '0'
     OR (g1->>'dependencySnapshotSha256') IS NULL
     OR (g9->>'dependencySnapshotSha256') IS NULL
     OR g1->>'dependencySnapshotSha256' !~ '^[a-f0-9]{64}$'
     OR g9->>'dependencySnapshotSha256' !~ '^[a-f0-9]{64}$'
  THEN RAISE EXCEPTION 'SCRATCH: actual G1/G9 capture incomplete'; END IF;
END $capture$;
SELECT 'BADEN_M2_FCF_G1_G9_ACTUAL_READ_ONLY_CAPTURE_PASS';
ROLLBACK;
