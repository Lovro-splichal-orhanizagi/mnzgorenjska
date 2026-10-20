import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
const sql=()=>readFileSync(new URL('../supabase/migrations/20261020223000_mfa_reviewed_history.sql',import.meta.url),'utf8')
test('MFA closed native route retains common API meaning and closes service ACLs',()=>{
 const s=sql()
 for(const fn of ['prepare_mfa_reviewed_cleanup','apply_mfa_reviewed_cleanup','record_mfa_reviewed_prices','check_mfa_reviewed_release'])assert.match(s,new RegExp(`function public\\.${fn}\\(`))
 assert.doesNotMatch(s,/create or replace function public\.(?:apply_historical_statistics_policy|upsert_unavailable_historical_match)|disable trigger/i)
 assert.match(s,/private_historical_statistics\.authorize_release\(/)
 assert.match(s,/p_expected_preview_sha/)
 assert.match(s,/deadline_at>p_clock/);assert.match(s,/release_core\(p_main_sha,p_expected_preview_sha,p_activate,clock_timestamp\(\)\)/)
})
test('MFA actual SQL rollback contract',{skip:process.env.MFA_HISTORY_DISPOSABLE_TEST!=='1'},()=>{
 const container=process.env.SUPABASE_DB_CONTAINER
 assert.ok(container&&/^supabase_db_[a-zA-Z0-9_-]+$/.test(container),'explicit owned disposable database required')
 execFileSync('docker',['exec','-i',container,'psql','-U',process.env.SUPABASE_DB_USER??'supabase_admin','-d',process.env.SUPABASE_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1'],{input:readFileSync(new URL('../supabase/tests/mfa-reviewed-history.sql',import.meta.url),'utf8'),timeout:180000,maxBuffer:8*1024*1024,stdio:['pipe','inherit','inherit']})
})
