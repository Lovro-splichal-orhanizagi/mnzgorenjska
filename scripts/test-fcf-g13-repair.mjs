import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import fcf, * as names from './viri/fcf.mjs'
import { mapaKlubov } from './klubi.mjs'

// The fake ends at the external DB transport; the real country/alias precedence runs.
function dbFixture() {
 const rows = {
  countries: [{id:13,code:'ES'}, {id:2,code:'DE'}],
  teams: [{id:1,name:'FUTBOL CLUB ATLETIC VNG PASIFAE',country_id:2},
   {id:8371,name:'FUTBOL CLUB ATLETIC VNG PASIFAE',country_id:13},
   {id:10388,name:'VILANOVA ATLETIC',country_id:13},
   {id:11000,name:'VILANOVA ATLETIC B',country_id:13}],
  competitions: [{id:801,source:'fcf'}],
  competition_teams: [{competition_id:801,team_id:8371},{competition_id:801,team_id:10388}],
 }
 return {from(table) {let data=[...rows[table]];const q={select(){return q},eq(k,v){data=data.filter(r=>r[k]===v);return q},in(k,v){data=data.filter(r=>v.includes(r[k]));return q},order(){return q},range(a,b){return Promise.resolve({data:data.slice(a,b+1)})},maybeSingle(){return Promise.resolve({data:data[0]})},then(resolve){return Promise.resolve({data}).then(resolve)}};return q}}
}
test('FCF exact proven names resolve to canonical Spanish 8371 through actual map', async()=>{
 const map=await mapaKlubov(dbFixture(),fcf)
 for(const name of ['VILANOVA ATLETIC','FUTBOL CLUB ATLETIC VNG PASIFAE','Vilanóva  Atletic']) assert.equal(map.get(fcf.kljucKluba(name)),8371)
 assert.equal(map.get(fcf.kljucKluba('VILANOVA ATLETIC B')),11000)
})
test('raw normalization keeps exact name precedence and reserves are not aliases',()=>{
 assert.equal(typeof names.poenostaviKlubEs,'function')
 assert.equal(fcf.poenostavi('VILANOVA ATLETIC'),'vilanova atletic')
 for(const name of ['Vilanova','Atletic','VNG','Vilanova Cami','Vilanova Atletic B','Futbol Club Atletic VNG Pasifae B']) assert.notEqual(fcf.kljucKluba(name),'futbol club atletic vng pasifae')
})
test('fixed repair runner rejects unsafe inputs before opening a database',async()=>{
 assert.ok(existsSync(new URL('./fcf-g13-repair.mjs',import.meta.url)),'fixed runner missing')
 const { validateInput }=await import('./fcf-g13-repair.mjs')
 const valid={odvecni:'10388',obdrzi:'8371',pisi:'false',approved_sha256:'',ref:'refs/heads/main'}
 assert.equal(validateInput(valid).apply,false)
 assert.equal(validateInput({...valid,pisi:'true',approved_sha256:'a'.repeat(64)}).apply,true)
 for(const patch of [{odvecni:'8371'},{obdrzi:'10388'},{pisi:'yes'},{ref:'refs/heads/other'},{pisi:'true'},{pisi:'true',approved_sha256:'A'.repeat(64)},{approved_sha256:'x;select 1'},{pisi:'true',approved_sha256:'a'.repeat(63)}]) assert.throws(()=>validateInput({...valid,...patch}))
})
test('workflow keeps default legacy path exclusive and fixed repair guarded',()=>{
 const y=readFileSync(new URL('../.github/workflows/zdruzi-klube.yml',import.meta.url),'utf8')
 assert.match(y,/options: \[standard, fcf-g13\]/)
 assert.match(y,/default: standard/)
 assert.match(y,/group: zdruzi-klube\s+cancel-in-progress: false/)
 assert.match(y,/if:.*inputs\.nacin.*!= 'fcf-g13'/)
 assert.match(y,/if:.*inputs\.nacin.*== 'fcf-g13'/)
 assert.match(y,/refs\/heads\/main/)
 assert.match(y,/--drzava ES --najvec 300/)
 assert.match(y,/timeout-minutes: 360/)
 assert.match(y,/seq 1 120/)
 assert.match(y,/MIGRACIJE_PREMOR/)
 assert.match(y,/actions\/upload-artifact@/)
 assert.doesNotMatch(y,/echo.*\$SUPABASE_DB_URL|psql.*\$SUPABASE_DB_URL/)
})

test('immutable football plan pins exact drops and a full coherent directed calendar',()=>{
 const p=JSON.parse(readFileSync(new URL('./fcf-g13-plan.json',import.meta.url)))
 assert.deepEqual(p.drop.map(x=>x.id),[309356,309381,309527,427258,427259,427261,427262,427264,427265,427266,427268,427269,427270,427271,427272,427273,427274,427275,427276,427277,427278,427279,427280,427281,427283,427284,427285,427286,427288,427289,427290,427291])
 assert.equal(p.retained.length,240)
 const norm=id=>id===10388?8371:id
 assert.equal(new Set(p.retained.map(m=>`${norm(m.home_team_id)}:${norm(m.away_team_id)}`)).size,240)
 for(let n=1;n<=30;n++) {
  const round=p.retained.filter(m=>m.round===n)
  assert.equal(round.length,8)
  assert.equal(new Set(round.flatMap(m=>[norm(m.home_team_id),norm(m.away_team_id)])).size,16)
 }
 assert.deepEqual(p.retained.filter(m=>[427267,427282].includes(m.id)).map(m=>[m.id,m.round,m.home_team_id,m.away_team_id,m.played_on]),[[427267,8,8385,8378,'2026-11-07'],[427282,23,8378,8385,'2027-03-20']])
 assert.equal(p.drop.find(m=>m.id===309356).keep,427263)
 assert.equal(new Set(p.players.map(p=>p.reg_st)).size,21)
 assert.equal(new Set(p.players.map(p=>p.id)).size,21)
})
test('fixed waiter has installed dependency and league-read prerequisites',()=>{
 const fixed=readFileSync(new URL('../.github/workflows/zdruzi-klube.yml',import.meta.url),'utf8').split('\n  fcf-g13:')[1]
 assert.match(fixed,/run: npm ci --ignore-scripts/)
 const waiter=fixed.split('- name: Pocakaj na starejse ES uvoze')[1].split('- name: Tunel')[0]
 assert.match(waiter,/SUPABASE_URL: \$\{\{ secrets\.SUPABASE_URL \}\}/)
 assert.match(waiter,/SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/)
})

test('CLI commits only explicit apply, rolls back preview and never exposes database diagnostics',async t=>{
 const {mkdtempSync,writeFileSync,mkdirSync,rmSync}=await import('node:fs')
 const {tmpdir}=await import('node:os')
 const {join}=await import('node:path')
 const {spawnSync}=await import('node:child_process')
 const root=mkdtempSync(join(tmpdir(),'fcf-g13-cli-'));t.after(()=>rmSync(root,{recursive:true,force:true}))
 const bin=join(root,'bin');mkdirSync(bin)
 const script=new URL('./fcf-g13-repair.mjs',import.meta.url).pathname
 const stub=`#!${process.execPath}
const fs=require('node:fs');
fs.writeFileSync('received.sql',fs.readFileSync(0,'utf8'));
fs.writeFileSync('received-args.json',JSON.stringify(process.argv));
if(process.env.STUB_FAIL){console.error(process.env.STUB_FAIL==='timeout'?'psql:<stdin>:1: ERROR:  canceling statement due to statement timeout\\nDETAIL: SECRET-password PRIVATE-user':'ERROR: private credential SECRET-password user row PRIVATE-user\\nDETAIL: canceling statement due to statement timeout');process.exit(1)}
console.log(JSON.stringify({sha256:'a'.repeat(64),mode:process.env.PISI==='true'?'apply':'preview'}));
`
 writeFileSync(join(bin,'psql'),stub,{mode:0o700})
 const preload=join(root,'timeout.cjs')
 writeFileSync(preload,`const fs=require('node:fs');require('node:child_process').execFileSync=(cmd,args,options)=>{if(cmd!=='psql')throw Error('Unexpected command');fs.writeFileSync('timeout.json',JSON.stringify({timeout:options.timeout}));throw Object.assign(Error('SECRET-password PRIVATE-user'),{code:'ETIMEDOUT',stderr:Buffer.from('SECRET-password PRIVATE-user')})};require('node:module').syncBuiltinESMExports();`)
 for(const mode of ['preview','apply','failure','statement-timeout','process-timeout','wrong-ref','wrong-id','missing-hash','extra-argument','paused']) {
  const cwd=join(root,mode);mkdirSync(cwd)
  const env={PATH:bin,GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/main',ODVECNI:'10388',OBDRZI:'8371',PISI:mode==='apply'||mode==='missing-hash'?'true':'false',APPROVED_SHA256:mode==='apply'?'a'.repeat(64):'',SUPABASE_DB_URL:'postgresql://fake:SECRET-password@localhost/postgres'}
  if(mode==='failure')env.STUB_FAIL='1'
  if(mode==='statement-timeout')env.STUB_FAIL='timeout'
  if(mode==='wrong-ref')env.GITHUB_REF='refs/heads/other'
  if(mode==='wrong-id')env.ODVECNI='8372'
  if(mode==='paused')env.MIGRACIJE_PREMOR='1'
  const result=spawnSync(process.execPath,[...(mode==='process-timeout'?['--require',preload]:[]),script,...(mode==='extra-argument'?['--sql=select 1']:[])],{cwd,env,encoding:'utf8'})
  assert.equal(result.status,['preview','apply'].includes(mode)?0:1,mode+result.stderr)
  assert.doesNotMatch(result.stdout+result.stderr,/SECRET-password|PRIVATE-user/)
  if(['preview','apply','failure','statement-timeout'].includes(mode)) {
   const sql=readFileSync(join(cwd,'received.sql'),'utf8')
   assert.match(sql,/begin isolation level read committed/)
   assert.match(sql,/set local lock_timeout='10s'/)
   assert.match(sql,/set local idle_in_transaction_session_timeout='120s'/)
   assert.match(sql,/set local statement_timeout='180s'/)
   assert.ok(sql.endsWith(mode==='apply'?'commit;\n':'rollback;\n'))
   assert.doesNotMatch(readFileSync(join(cwd,'received-args.json'),'utf8'),/postgresql|SECRET/)
   assert.doesNotMatch(readFileSync(join(cwd,'fcf-g13-repair/result.json'),'utf8'),/SECRET|PRIVATE/)
  } else assert.equal(existsSync(join(cwd,'received.sql')),false,mode)
  if(['statement-timeout','process-timeout'].includes(mode)) {
   const evidence=JSON.parse(readFileSync(join(cwd,'fcf-g13-repair/result.json'),'utf8'))
   assert.deepEqual(evidence,{version:1,status:'failed-or-unknown',reason:`database ${mode==='process-timeout'?'process':'statement'} timeout; inspect state before retry`})
   assert.doesNotMatch(JSON.stringify(evidence),/SECRET|PRIVATE/)
  }
  if(mode==='failure') assert.equal(JSON.parse(readFileSync(join(cwd,'fcf-g13-repair/result.json'),'utf8')).reason,'database execution failed; inspect state before retry')
  if(mode==='process-timeout') assert.deepEqual(JSON.parse(readFileSync(join(cwd,'timeout.json'),'utf8')),{timeout:300000})
 }
})
