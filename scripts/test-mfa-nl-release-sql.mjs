import test from 'node:test'
import assert from 'node:assert/strict'
import {fileURLToPath} from 'node:url'
import {mfaNlDisposableDb,mfaNlDisposableTarget} from './lib/mfa-nl-disposable-test.mjs'

test('NL release runner requires exact owned DB or complete disposable CI authority',()=>{
 assert.equal(mfaNlDisposableTarget({SUPABASE_DB_CONTAINER:'supabase_db_slff_mfa_nl_release_20261021'}).project,'slff_mfa_nl_release_20261021')
 const ci={SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska',GITHUB_ACTIONS:'true',CI:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_JOB:'varnost'}
 assert.equal(mfaNlDisposableTarget(ci).project,'mnzgorenjska')
 for(const key of Object.keys(ci))assert.throws(()=>mfaNlDisposableTarget({...ci,[key]:'wrong'}),/owned|disposable/)
 assert.throws(()=>mfaNlDisposableTarget({SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska'}),/owned|disposable/)
})
test('MFA NL closed source/import/prices/release actual SQL rollback contract',{skip:process.env.MFA_NL_RELEASE_DISPOSABLE_TEST!=='1'},()=>{
 const{container,docker,sql}=mfaNlDisposableDb(process.env)
 const snapshot=()=>sql(`select encode(sha256(convert_to(jsonb_build_object(
 'contracts',(select jsonb_agg(to_jsonb(t)order by competition_id)from private_mfa_nl_history.source_contract t),
 'bootstrap',(select jsonb_agg(to_jsonb(t)order by competition_id)from private_mfa_nl_history.bootstrap_receipt t),
 'imports',(select jsonb_agg(to_jsonb(t)order by competition_id,main_sha)from private_mfa_nl_history.import_receipt t),
 'prices',(select jsonb_agg(to_jsonb(t)order by competition_id,main_sha)from private_mfa_nl_history.price_receipt t),
 'releases',(select jsonb_agg(to_jsonb(t)order by competition_id)from private_mfa_nl_history.release_receipt t),
 'policies',(select jsonb_agg(to_jsonb(t)order by id)from private_historical_statistics.policies t),
 'clubs',(select jsonb_agg(to_jsonb(t)order by provider,source_club_id,source_category_id)from private_historical_statistics.source_club_bindings t))::text,'UTF8')),'hex');`)
 const before=snapshot()
 docker(['exec',container,'mkdir','-p','/tmp/slff-mfa-nl-release-tests'])
 for(const name of ['mfa-nl-release.sql','mfa-nl-release-fixture.sql','mfa-nl-bootstrap-fixture.sql'])docker(['cp',fileURLToPath(new URL(`../supabase/tests/${name}`,import.meta.url)),`${container}:/tmp/slff-mfa-nl-release-tests/${name}`])
 docker(['exec',container,'psql','-U','postgres','-d','postgres','-X','-v','ON_ERROR_STOP=1','-f','/tmp/slff-mfa-nl-release-tests/mfa-nl-release.sql'],{stdio:['pipe','inherit','inherit']})
 assert.equal(snapshot(),before,'rollback must preserve real source contracts/receipts and immutable approval/catalog rows')
})
