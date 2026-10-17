-- Real SQL v2 path over the same complete persisted fixtures and all mutations.
update de_manifest set raw=jsonb_set(jsonb_set(raw::jsonb,'{version}','2'),'{seasons}',(
 select jsonb_agg(s||jsonb_build_object('lineage',jsonb_build_object(
  'capture',jsonb_build_object('runId','11111','jobId','22222','commit',repeat('d',40),'workflow','.github/workflows/preveri-dfb-ligo.yml',
   'step',case s->>'season' when '2025/26' then 'Arhiv sezona — brez baze' else 'Tekoča sezona — brez baze' end,'conclusion','failure',
   'workflowSha256',repeat('e',64),'parserSha256',repeat('f',64),'artifactId','33333','artifactDigest','sha256:'||repeat('a',64),
   'indexSha256',repeat('b',64),'documentsSha256',s->>'documentsSha256','capturedAt',s->>'capturedAt'),
  'replay',jsonb_build_object('runId',s->>'runId','jobId',s->>'jobId','commit',repeat('a',40),'workflow','.github/workflows/ponovi-dfb-regijo.yml',
   'step','Ponovi sezono — brez omrežja in baze','workflowSha256',repeat('e',64),'parserSha256',repeat('b',64),
   'artifactId','44444','artifactDigest','sha256:'||repeat('b',64),'generatedAt',clock_timestamp())
 ))) from jsonb_array_elements(raw::jsonb->'seasons')s
))::text;
