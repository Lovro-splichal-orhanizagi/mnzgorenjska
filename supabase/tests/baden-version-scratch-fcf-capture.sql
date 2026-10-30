-- NEVER MERGE. Disposable hosted DB only; synthetic source-free G1/G9 geometry.
BEGIN;
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
