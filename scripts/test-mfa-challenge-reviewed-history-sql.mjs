import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
const sql=readFileSync(new URL('../supabase/migrations/20261021093000_mfa_challenge_reviewed_history.sql',import.meta.url),'utf8')
test('Challenge closes private clock/schema access and uses exact four archive counts and native opening',()=>{
 for(const expected of ['private_mfa_challenge_history','r.id=t.round_id','t.appearance_count','t.goal_count',"n=118","n=14","number=5","id=34903","2026-10-23T10:15:00Z","172archive/32current available plus4markers","::int=16","p_expected_preview_sha=preview_sha"])assert.ok(sql.includes(expected),expected)
 assert.doesNotMatch(sql,/create or replace function public\.(apply_historical|upsert_unavailable)|disable trigger/)
 assert.ok(sql.includes('from public,anon,authenticated,service_role'))
})
test('Challenge rollback fixture executes actual native route on owned fresh database',{skip:process.env.MFA_CHALLENGE_HISTORY_DISPOSABLE_TEST!=='1'},()=>{
 const container=process.env.SUPABASE_DB_CONTAINER;assert.match(container??'',/^supabase_db_[a-zA-Z0-9_-]+$/)
 execFileSync('docker',['exec','-i',container,'psql','-U',process.env.SUPABASE_DB_USER??'supabase_admin','-d',process.env.SUPABASE_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1'],{input:readFileSync(new URL('../supabase/tests/mfa-challenge-reviewed-history.sql',import.meta.url),'utf8'),timeout:180000,maxBuffer:8*1024*1024,stdio:['pipe','inherit','inherit']})
})
test('Challenge synthetic complete fixture counts and unique pairs match actual constraints',()=>{
 const archive=Array.from({length:22},()=>new Set()),current=Array.from({length:11},()=>new Set())
 const fixture=readFileSync(new URL('../supabase/tests/mfa-challenge-reviewed-history.sql',import.meta.url),'utf8')
 const targets=[['517571',5,10703,10716],['517590',7,10708,10704],['517620',11,10705,10708],['517703',20,10711,10691]]
 for(const[,n,a,b]of targets)archive[n-1].add(`${a}:${b}`)
 const pairs=[...fixture.matchAll(/\((\d+)::bigint,(\d+)::bigint\)/g)].map(m=>m.slice(1).join(':'))
 assert.equal(pairs.length,8)
 for(const round of archive)for(const pair of pairs){if(round.size<8)round.add(pair)}
 for(const round of current)for(const pair of pairs)round.add(pair)
 assert.equal(archive.reduce((n,r)=>n+r.size,0),176);assert.equal(current.reduce((n,r)=>n+r.size,0),88)
 assert.doesNotMatch(fixture,/\(tid\*100\+i\)::text/)
})
