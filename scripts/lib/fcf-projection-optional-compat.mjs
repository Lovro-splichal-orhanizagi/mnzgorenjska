// Optional disposable-fixture setup only. Applied migrations are immutable.
// The exact9410 epoch already contains Baden183; never reapply183 over it.
import {readFileSync} from 'node:fs'
const shapes={
 'private_fcf_g1_9410.markers':[['match_id','bigint'],['round_id','bigint'],['home_team_id','bigint'],['away_team_id','bigint'],['binding','jsonb'],['before_image_text','text'],['before_sha256','text'],['authorized_xid','bigint'],['installed_at','timestamp with time zone'],['singleton','boolean']],
 'private_fcf_g1_9410.receipts':[['match_id','bigint'],['after_image','jsonb'],['receipt','jsonb']],
}
const fks=[['private_fcf_g1_9410.markers','matches','match_id','id'],['private_fcf_g1_9410.markers','rounds','round_id','id'],['private_fcf_g1_9410.markers','teams','home_team_id','id'],['private_fcf_g1_9410.markers','teams','away_team_id','id'],['private_fcf_g1_9410.receipts','private_fcf_g1_9410.markers','match_id','match_id']].map(([rel,parent,col,key])=>({rel,parent,deferred:false,validated:true,deferrable:false,definition:`FOREIGN KEY (${col}) REFERENCES ${parent}(${key})`}))
function legacyOptionalSQL(){
 const legacy=readFileSync(new URL('../../supabase/migrations/20261028183000_baden_fcf_projection_compat.sql',import.meta.url),'utf8')
 return `select encode(sha256(convert_to(prosrc,'UTF8')),'hex')='f607b30f1cfbad5b57d7259c6aa1c561c8de8ff78ccb40101446256d0954e5ea' as fcf_exact9410 from pg_proc where oid='private_fcf_future_projection.capture(text,text[])'::regprocedure \\gset
\\if :fcf_exact9410
do $exact9410$
declare body text;actual_shapes jsonb;expected_fk jsonb:='${JSON.stringify(fks)}'::jsonb;
begin
 select prosrc into strict body from pg_proc where oid='private_fcf_future_projection.capture(text,text[])'::regprocedure;
 perform private_fcf_six_target_release.require(encode(sha256(convert_to(body,'UTF8')),'hex')='f607b30f1cfbad5b57d7259c6aa1c561c8de8ff78ccb40101446256d0954e5ea','exact9410 projection body required; no rewrite');
 perform private_fcf_six_target_release.require(to_regclass('private_baden_history.catalog')is not null and to_regclass('private_baden_history.prepared')is not null and to_regclass('private_baden_history.club_bindings')is not null,'complete preserved Baden183 schema required');
 select jsonb_object_agg(rel,cols)into actual_shapes from(select n.nspname||'.'||c.relname rel,jsonb_agg(jsonb_build_array(a.attname,a.atttypid::regtype::text)order by a.attnum)cols from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid where n.nspname='private_fcf_g1_9410'and c.relname in('markers','receipts')and c.relkind='r'and a.attnum>0 and not a.attisdropped group by n.nspname,c.relname)x;
 perform private_fcf_six_target_release.require(actual_shapes='${JSON.stringify(shapes)}'::jsonb,'complete exact9410 protected two-table shapes required');
 perform private_fcf_six_target_release.require(not exists(with actual as(select jsonb_build_object('rel',conrelid::regclass::text,'parent',confrelid::regclass::text,'deferred',condeferred,'validated',convalidated,'deferrable',condeferrable,'definition',pg_get_constraintdef(oid))j from pg_constraint where contype='f'and(conrelid in('private_fcf_g1_9410.markers'::regclass,'private_fcf_g1_9410.receipts'::regclass)or confrelid in('private_fcf_g1_9410.markers'::regclass,'private_fcf_g1_9410.receipts'::regclass))),expected as(select value j from jsonb_array_elements(expected_fk))(select j from actual except all select j from expected)union all(select j from expected except all select j from actual)),'complete exact9410 five FK definitions/validation/deferrability required');
 -- The independently reconstructed whole-body hash binds both9410 relations as
 -- where=true/user=false protected full-row snapshots and retains Baden guards.
end $exact9410$;
\\else
${legacy}
\\endif
`
}

// Exact additional schema epoch only, no applied migration rewrite.
export function fcfProjectionOptionalBadenCompatibilitySQL(){
 const migration=readFileSync(new URL('../../supabase/migrations/20261030143000_baden_cold_source_version.sql',import.meta.url),'utf8'),part=migration.split('do $vfcf$')[1],hashes=[...part.matchAll(/<>'([a-f0-9]{64})'/g)].map(m=>m[1]);if(hashes.length!==2)throw Error('missing exact Baden version projection profile');
 return `select encode(sha256(convert_to(prosrc,'UTF8')),'hex')='${hashes[1]}' as fcf_exact_baden_version from pg_proc where oid='private_fcf_future_projection.capture(text,text[])'::regprocedure \\gset
\\if :fcf_exact_baden_version
do $versionepoch$begin
 perform private_fcf_six_target_release.require(to_regclass('private_baden_transition.versions')is not null,'complete append-only Baden version schema required');
 perform private_baden_transition.closure();
end$versionepoch$;
\\else
${legacyOptionalSQL()}
\\endif
`
}
