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
 const{container,docker}=mfaNlDisposableDb(process.env)
 docker(['exec',container,'mkdir','-p','/tmp/slff-mfa-nl-release-tests'])
 for(const name of ['mfa-nl-release.sql','mfa-nl-release-fixture.sql','mfa-nl-bootstrap-fixture.sql'])docker(['cp',fileURLToPath(new URL(`../supabase/tests/${name}`,import.meta.url)),`${container}:/tmp/slff-mfa-nl-release-tests/${name}`])
 docker(['exec',container,'psql','-U','postgres','-d','postgres','-X','-v','ON_ERROR_STOP=1','-f','/tmp/slff-mfa-nl-release-tests/mfa-nl-release.sql'],{stdio:['pipe','inherit','inherit']})
})
