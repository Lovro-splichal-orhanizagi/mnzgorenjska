-- Forward compatibility only: exact immutable Baden tables join the existing
-- complete FCF dependency projection. Never edit/reapply deployed migration17.
-- Preserve every old predicate, shape/FK check, private G1 marker/receipt and ACL.
do $compat$
declare body text;definition text;patched text;
 addition text:=$addition$ -- Exact forward Baden delta; all rows are untargeted immutable protected state.
 registry:=registry||'{"private_baden_history.catalog":{"where":"true","user":false,"round":"false","match":"false"},"private_baden_history.prepared":{"where":"true","user":false,"round":"false","match":"false"},"private_baden_history.club_bindings":{"where":"true","user":false,"round":"false","match":"false"}}'::jsonb;
 shapes:=shapes||'{"private_baden_history.catalog":[["singleton","boolean"],["manifest","jsonb"],["manifest_sha256","text"]],"private_baden_history.prepared":[["competition_id","bigint"],["manifest_sha256","text"],["bindings","jsonb"],["opening_round_id","bigint"]],"private_baden_history.club_bindings":[["competition_id","bigint"],["source_competition_id","text"],["season","text"],["source_club_id","text"],["name","text"],["team_id","bigint"]]}'::jsonb;
 expected_fk:=expected_fk||'[{"rel":"private_baden_history.prepared","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},{"rel":"private_baden_history.prepared","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (opening_round_id) REFERENCES rounds(id)"},{"rel":"private_baden_history.club_bindings","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},{"rel":"private_baden_history.club_bindings","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id)"}]'::jsonb;
$addition$;
 guard text:=$guard$ -- Baden preparation may never reference any of the three Spanish targets,
 -- including the native IDs stored in its immutable JSON binding inventory.
 perform private_fcf_six_target_release.require(not exists(select 1 from private_baden_history.prepared where jsonb_typeof(bindings)is distinct from 'array'),'invalid Baden prepared binding inventory');
 perform private_fcf_six_target_release.require(not exists(
  select 1 from private_baden_history.prepared p cross join lateral jsonb_array_elements(p.bindings)b
  where jsonb_typeof(b)is distinct from 'object' or exists(select 1 from unnest(array['matchId','roundId','homeTeamId','awayTeamId'])k where jsonb_typeof(b->k)is distinct from 'number'or(b->>k)!~'^-?[1-9][0-9]*$')
 ),'invalid Baden prepared binding references');
 perform private_fcf_six_target_release.require(not exists(
  select 1 from private_baden_history.prepared p where p.competition_id in(783,790,797)or p.opening_round_id in(select id from public.rounds where competition_id in(783,790,797))
  union all select 1 from private_baden_history.club_bindings b where b.competition_id in(783,790,797)or b.team_id in(select m.home_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797)union select m.away_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797))
  union all select 1 from private_baden_history.prepared p cross join lateral jsonb_array_elements(p.bindings)b where
   (b->>'matchId')::bigint in(select m.id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797))or
   (b->>'roundId')::bigint in(select id from public.rounds where competition_id in(783,790,797))or
   (b->>'homeTeamId')::bigint in(select m.home_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797)union select m.away_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797))or
   (b->>'awayTeamId')::bigint in(select m.home_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797)union select m.away_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797))
 ),'Baden state references FCF target identities');
$guard$;
begin
 select prosrc into strict body from pg_proc where oid='private_fcf_future_projection.capture(text,text[])'::regprocedure;
 if encode(sha256(convert_to(body,'UTF8')),'hex')='ef80eb6449eb91f4e12c24ec2db13ae13a2b595a7c97ca65b60215af0876a99f'then return;end if;
 if encode(sha256(convert_to(body,'UTF8')),'hex')<>'1d7d488ebaa2e871b04e87978ab8549864b2e8e09e4d0bfc97800007ea8fbfb1'then raise exception 'BADEN_FCF_PROJECTION: reviewed migration17 capture body required';end if;
 if to_regclass('private_baden_history.catalog')is null or to_regclass('private_baden_history.prepared')is null or to_regclass('private_baden_history.club_bindings')is null then raise exception 'BADEN_FCF_PROJECTION: complete Baden180 schema required';end if;
 patched:=replace(body,E'\nbegin\n',E'\nbegin\n'||addition);
 patched:=replace(patched,' -- Removed cleanup goal identities retain target/match association for deleted',guard||' -- Removed cleanup goal identities retain target/match association for deleted');
 if encode(sha256(convert_to(patched,'UTF8')),'hex')<>'ef80eb6449eb91f4e12c24ec2db13ae13a2b595a7c97ca65b60215af0876a99f'then raise exception 'BADEN_FCF_PROJECTION: exact additive capture delta required';end if;
 definition:=pg_get_functiondef('private_fcf_future_projection.capture(text,text[])'::regprocedure);
 execute replace(definition,body,patched);
end $compat$;
