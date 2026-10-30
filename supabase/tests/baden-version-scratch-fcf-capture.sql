-- NEVER MERGE. Disposable hosted DB only; synthetic source-free G1/G9 geometry.
BEGIN;
DO $seed$
BEGIN
  IF (SELECT count(*) FROM private_baden_transition.versions) <> 1
     OR (SELECT count(*) FROM private_baden_history.catalog) <> 1
     OR EXISTS (SELECT 1 FROM competitions WHERE id IN (783, 797))
  THEN RAISE EXCEPTION 'SCRATCH: populated Baden M2 and empty Spanish targets required'; END IF;
END $seed$;
CREATE TEMP TABLE scratch_baden_version AS
  SELECT manifest_sha256, source_binding FROM private_baden_transition.versions;
INSERT INTO competitions(id,slug,name,short_name,source,source_league_code,
                         sezona_koledarska,country_id,active,prvi_fantasy_krog,
                         source_policy,rok_pomak_ur)
OVERRIDING SYSTEM VALUE VALUES
  (783,'es-ct-segona-g1','TEST ONLY synthetic G1','G1','fcf',
   '4109388-4109627',false,(SELECT id FROM countries WHERE code='ES'),
   false,1,'es-fcf-six-reviewed-history-v1',6),
  (797,'es-ct-tercera-g9','TEST ONLY synthetic G9','G9','fcf',
   '4118349-4118588',false,(SELECT id FROM countries WHERE code='ES'),
   false,1,'es-fcf-six-reviewed-history-v1',6);
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
  g1 := private_fcf_g1_native800.capture_current('es-ct-segona-g1',ARRAY[]::text[]);
  g9 := private_fcf_native800.capture_current('es-ct-tercera-g9',ARRAY[]::text[]);
  IF jsonb_array_length(g1#>'{native,rounds}') <> 30
     OR jsonb_array_length(g1#>'{native,matches}') <> 240
     OR jsonb_array_length(g9#>'{native,rounds}') <> 30
     OR jsonb_array_length(g9#>'{native,matches}') <> 240
     OR g1#>>'{native,dependencies,complete}' <> 'true'
     OR g9#>>'{native,dependencies,complete}' <> 'true'
     OR g1->>'dependencySnapshotSha256' IS NULL
     OR g9->>'dependencySnapshotSha256' IS NULL
  THEN RAISE EXCEPTION 'SCRATCH: actual G1/G9 capture incomplete'; END IF;
END $capture$;
SELECT 'BADEN_M2_FCF_G1_G9_ACTUAL_READ_ONLY_CAPTURE_PASS';
ROLLBACK;
