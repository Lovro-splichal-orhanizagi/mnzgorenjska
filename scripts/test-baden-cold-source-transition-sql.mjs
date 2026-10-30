// Actual SQL hook ONLY for future fresh hosted CI; never local SQL or prod keys.
import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {badenColdTransitionPreviewSQL} from './lib/baden-cold-source-transition.mjs'
import {coldTransitionSyntheticFixture} from './baden-cold-source-transition-test-fixture.mjs'
export function badenColdHostedTarget(e=process.env,platform=process.platform){
 if(platform!=='linux'||e.CI!=='true'||e.GITHUB_ACTIONS!=='true'||e.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||e.GITHUB_JOB!=='varnost'||e.RUNNER_ENVIRONMENT!=='github-hosted'||e.RUNNER_OS!=='Linux'||e.BADEN_COLD_TRANSITION_CI_SQL_TEST!=='1'||e.SUPABASE_DB_CONTAINER!=='supabase_db_mnzgorenjska'||e.BADEN_COLD_TRANSITION_TEST_DB!=='slff_baden_cold_transition_test')throw Error('fresh hosted varnost dedicated database only; local SQL forbidden')
 return {container:'supabase_db_mnzgorenjska',database:'slff_baden_cold_transition_test'}
}
const env={CI:'true',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_JOB:'varnost',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux',BADEN_COLD_TRANSITION_CI_SQL_TEST:'1',SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska',BADEN_COLD_TRANSITION_TEST_DB:'slff_baden_cold_transition_test'}
test('hosted hook rejects local/partial/different database or container claims',()=>{assert.throws(()=>badenColdHostedTarget({}));assert.deepEqual(badenColdHostedTarget(env,'linux'),{container:'supabase_db_mnzgorenjska',database:'slff_baden_cold_transition_test'});for(const k of Object.keys(env))assert.throws(()=>badenColdHostedTarget({...env,[k]:'wrong'},'linux'));assert.throws(()=>badenColdHostedTarget(env,'darwin'))})
test('actual fixed coherent RO query retains expired M1 and exposes human/card/native drift without writes',{skip:process.env.BADEN_COLD_TRANSITION_CI_SQL_TEST!=='1'},()=>{
 const target=badenColdHostedTarget(),run=(database,sql)=>{try{return execFileSync('docker',['exec','-i',target.container,'psql','-X','-qAt','-U','postgres','-d',database,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate'],{input:sql,encoding:'utf8',timeout:180000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']})}catch(e){throw Error('HOSTED_COLD_QUERY_FAILED status='+e.status)}};
 const f=coldTransitionSyntheticFixture(),s=JSON.parse(f.snapshotText),fixture=readFileSync(new URL('./vzorci/baden-cold-transition-minimal-TESTONLY.sql',import.meta.url),'utf8'),hex=Buffer.from(JSON.stringify(s)).toString('hex');
 // A new database is mandatory: do not drop/reset a pre-existing database.
 run('postgres','CREATE DATABASE slff_baden_cold_transition_test;');
 try{
  run(target.database,fixture.replace('TEST_ONLY_SNAPSHOT_HEX',hex));
  const observe=()=>{const raw=JSON.parse(run(target.database,badenColdTransitionPreviewSQL()).trim());return{raw,data:JSON.parse(raw.snapshotText)}};
  const before=observe();assert.equal(before.data.transactionReadOnly,'on');assert.equal(before.data.catalog[0].manifest_sha256,f.oldManifestBytes&&'781b1784038fef6bdf223a8d127430d8ed37f76031126db62e3f1ef20d6e019e');assert.equal(before.data.catalog[0].manifest.currentFreshUntil,'2026-10-30T10:43:41.514Z');const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);assert.equal(createHash('sha256').update(canonical(before.data.catalog[0].manifest)).digest('hex'),before.data.catalog[0].manifest_sha256);assert.equal(before.data.prepared[0].bindings.length,450);assert.ok(Object.values(before.data.counts).every(n=>n===0));
  const initial=run(target.database,"SELECT md5(string_agg(to_jsonb(x)::text,''ORDER BY x.id))FROM public.matches x;");
  observe();assert.equal(run(target.database,"SELECT md5(string_agg(to_jsonb(x)::text,''ORDER BY x.id))FROM public.matches x;"),initial,'RO preview writes no native rows');
  run(target.database,'INSERT INTO public.fantasy_teams(id,competition_id)VALUES(999,1132);');assert.equal(observe().data.counts.fantasyTeams,1);run(target.database,'DELETE FROM public.fantasy_teams WHERE id=999;');
  run(target.database,'INSERT INTO private_fussball.card_admissions(competition_id)VALUES(1132);');assert.equal(observe().data.counts.cardAdmissions,1);run(target.database,'DELETE FROM private_fussball.card_admissions WHERE competition_id=1132;');
  run(target.database,"UPDATE public.matches SET imported_at=clock_timestamp()WHERE id=(SELECT min(id)FROM public.matches);");assert.equal(observe().data.counts.importedMatches,1);
  // Every negative DML above is explicitly synthetic fixture setup, never an
  // implementation of a transition or permission to mutate an existing target.
 }finally{run('postgres','DROP DATABASE slff_baden_cold_transition_test WITH (FORCE);')}
})
