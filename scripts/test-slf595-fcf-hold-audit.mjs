import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {manifest,validateManifest,auditSql,retainedReport,classifyCandidate,summarize} from './slf595-fcf-hold-audit.mjs'
const c={id:500,slug:'es-ct-elit',source:'fcf',source_league_code:'4106968-4107207',sezona_koledarska:false}
const t={slug:c.slug,report_id:'es4107024'}
const load=kind=>gunzipSync(readFileSync(new URL(`./vzorci/es-fcf-current-4107024-${kind}.html.gz`,import.meta.url))).toString()
function setup(test){
 const dir=mkdtempSync(join(process.env.PAPERCLIP_RUN_SCRATCH_DIR||tmpdir(),'fcf-hold-audit-'))
 test.after(()=>rmSync(dir,{recursive:true,force:true}))
 test.mock.method(globalThis,'fetch',()=>assert.fail('network forbidden'))
 const html=load('report'),proof={id:t.report_id,url:'https://www.fcf.cat/ca/competicio/acta/4107024',sha256:createHash('sha256').update(html).digest('hex'),redirectHtml:load('redirect')}
 writeFileSync(join(dir,'acta-4107024.html'),html)
 writeFileSync(join(dir,'acta-4107024.redirect.json'),JSON.stringify(proof))
 return {dir,source:retainedReport(dir,t,c),proof}
}
const fixture=()=>({id:700,zapisnik_id:null,source_url:null,imported_at:null,kontumacija:false,played_on:'2026-11-08',home:{id:800,name:'VIC UNIÓ ESPORTIVA CLUB'},away:{id:801,name:'ATLETIC SANT JUST . F. C.'},rounds:{id:900,competition_id:500,season:'2026/27',number:8}})
test('fixed 163-report selection rejects duplicate, expansion, malformed ids and another cache',()=>{
 validateManifest(manifest)
 for(const change of [m=>m.targets.push(m.targets[0]),m=>m.targets[1]=m.targets[0],m=>m.targets[0].slug="'; select 1;--",m=>m.targets[0].report_id='../private',m=>m.cache_key+='fallback',m=>m.from='2026-10-01']){
  const m=structuredClone(manifest);change(m);assert.throws(()=>validateManifest(m))
 }
})
test('SQL is a bounded read-only rollback without RPC or names in shared output',()=>{
 const sql=auditSql();assert.match(sql,/repeatable read read only/);assert.match(sql,/statement_timeout='25s'/)
 assert.match(sql,/lock_timeout='3s'/);assert.match(sql,/ON_ERROR_STOP on/);assert.match(sql,/limit 30001/)
 assert.match(sql,/rollback;/);assert.match(sql,/or m.zapisnik_id in/);assert.doesNotMatch(sql,/\b(update|insert|delete|call)\b/i)
})
test('real retained parser accepts exact digest-bound redirect without network',test=>{
 const {source}=setup(test);assert.equal(source.state,'complete');assert.equal(source.z.zapisnikId,t.report_id)
 const r=classifyCandidate(t,c,source,[fixture()]);assert.equal(r.classification,'unique-exact-pending-now')
 assert.deepEqual(r.exact_ids,[700]);assert.deepEqual(r.eligible_pending_ids,[700])
 const text=JSON.stringify(r);assert.ok(!text.includes('VIC'));assert.ok(!text.includes('regSt'));assert.ok(!text.includes('opozorila'))
})
test('missing or tampered evidence stays unknown with no raw parser error',test=>{
 const {dir,proof}=setup(test)
 assert.equal(retainedReport(dir,{...t,report_id:'es4107025'},c).state,'missing-retained-capture')
 proof.sha256='0'.repeat(64);proof.redirectHtml+='PRIVATE';writeFileSync(join(dir,'acta-4107024.redirect.json'),JSON.stringify(proof))
 const result=retainedReport(dir,t,c);assert.equal(result.state,'unproven-retained-identity-or-parser')
 assert.ok(!JSON.stringify(result).includes('PRIVATE'))
 assert.equal(classifyCandidate(t,c,result,[fixture()]).classification,'missing-or-unproven-source-evidence')
})
for(const [label,edit,expected] of [
 ['already completed',f=>({...f,imported_at:'2026-11-09',zapisnik_id:t.report_id}),'already-imported-exact'],
 ['other completed',f=>({...f,imported_at:'2026-11-09',zapisnik_id:'es4107025'}),'completed-exact-other-report'],
 ['ownership conflict',f=>({...f,zapisnik_id:'es4107025'}),'exact-tuple-ownership-conflict'],
 ['wrong date owner',f=>({...f,played_on:'2026-11-09',zapisnik_id:t.report_id}),'report-owned-by-different-fixture'],
 ['wrong round',f=>({...f,rounds:{...f.rounds,number:9}}),'no-exact-native-fixture'],
 ['wrong team',f=>({...f,home:{...f.home,name:'OTHER PRIVATE'}}),'no-exact-native-fixture'],
 ['walkover',f=>({...f,kontumacija:true}),'held-walkover'],
 ])test(`classifies ${label} without treating it as a repair`,test=>{
 const {source}=setup(test),r=classifyCandidate(t,c,source,[edit(fixture())]);assert.equal(r.classification,expected)
 assert.ok(!JSON.stringify(r).includes('PRIVATE'))
})
test('two exact pending tuples remain ambiguous, duplicate owners fail separately',test=>{
 const {source}=setup(test),f=fixture()
 assert.equal(classifyCandidate(t,c,source,[f,{...f,id:701}]).classification,'multiple-exact-pending')
 assert.equal(classifyCandidate(t,c,source,[{...f,zapisnik_id:t.report_id},{...f,id:701,zapisnik_id:t.report_id}]).classification,'duplicate-report-ownership')
})
test('known ownership pins the report, cross-league owner cannot disappear',test=>{
 const {source}=setup(test),f=fixture(),wrong={...f,id:701,zapisnik_id:t.report_id,rounds:{...f.rounds,competition_id:999}}
 assert.equal(classifyCandidate(t,c,source,[f,wrong]).classification,'report-owned-by-different-fixture')
})
test('window boundary is inclusive; out-of-window exact tuple remains held',test=>{
 const {source}=setup(test)
 for(const [date,classification]of [['2026-10-30','unique-exact-pending-now'],['2026-11-20','unique-exact-pending-now'],['2026-10-29','outside-run-window'],['2026-11-21','outside-run-window']]){
  const s=structuredClone(source);s.z.datum=date
  assert.equal(classifyCandidate(t,c,s,[{...fixture(),played_on:date}]).classification,classification)
 }
})
test('summary requires all leagues, read-only snapshot, bounded complete rows; source gaps are explicit',()=>{
 const competitions=[...new Set(manifest.targets.map(t=>t.slug))].map((slug,i)=>({...c,slug,id:i+1}))
 const db={checked_at:'2026-11-20T21:00:00Z',read_only:'on',competitions,fixtures:[]}
 const read=()=>({state:'missing-retained-capture'})
 const s=summarize(db,'unused',manifest,read)
 assert.equal(s.rows.length,163);assert.equal(s.counts['missing-or-unproven-source-evidence'],163)
 assert.equal(s.database_basis,'current-readback-not-run-time-snapshot');assert.match(s.scope,/not a classification of all 203/)
 for(const patch of [{read_only:'off'},{competitions:[]},{fixtures:Array.from({length:30001},(_,id)=>({id}))},{fixtures:[{id:1},{id:1}]}])assert.throws(()=>summarize({...db,...patch},'unused',manifest,read))
})
test('workflow is dispatch-only, restores exact cache without save, exports summary only',()=>{
 const w=readFileSync(new URL('../.github/workflows/slf595-fcf-hold-audit.yml',import.meta.url),'utf8')
 assert.match(w,/workflow_dispatch:/);assert.doesNotMatch(w,/schedule:|restore-keys:|actions\/cache@|actions\/cache\/save/)
 assert.match(w,/actions\/cache\/restore@v4/);assert.match(w,/fail-on-cache-miss: true/)
 assert.match(w,/key: zapisniki-ES-k1od1-44693766098-1/)
 assert.match(w,/test "\$CACHE_HIT" = true/);assert.match(w,/cache-matched-key/)
 assert.match(w,/path: rezultat\/summary.json/);assert.doesNotMatch(w,/uvoz-zapisnikov|workflow_run:|curl |wget /)
})
test('CLI passes the connection URI to psql and writes the sanitized summary offline',test=>{
 const {dir}=setup(test),bin=join(dir,'bin'),out=join(dir,'output'),cache=join(dir,'empty-cache')
 for(const path of [bin,cache])mkdirSync(path)
 const db={checked_at:'2026-11-20T21:00:00Z',read_only:'on',fixtures:[],
  competitions:[...new Set(manifest.targets.map(t=>t.slug))].map((slug,i)=>({...c,slug,id:i+1}))}
 const argvFile=join(dir,'argv.json'),dbFile=join(dir,'db.json')
 writeFileSync(dbFile,JSON.stringify(db))
 writeFileSync(join(bin,'psql'),`#!${process.execPath}\nimport {readFileSync,writeFileSync} from 'node:fs';\nwriteFileSync(process.env.TEST_ARGV_FILE,JSON.stringify(process.argv.slice(2)));\nprocess.stdout.write(readFileSync(process.env.TEST_DB_FILE));\n`,{mode:0o700})
 const uri='postgresql://offline:fake-password@127.0.0.1:6543/offline?sslmode=disable'
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('./slf595-fcf-hold-audit.mjs',import.meta.url)),cache,out],{
  env:{...process.env,PATH:bin,SUPABASE_DB_URL:uri,RETAINED_CACHE_KEY:manifest.cache_key,TEST_ARGV_FILE:argvFile,TEST_DB_FILE:dbFile},
  encoding:'utf8',timeout:10000})
 assert.equal(result.status,0,result.stderr)
 assert.deepEqual(JSON.parse(readFileSync(argvFile,'utf8')),['-X','-A','-t','-q','-f',join(out,'audit.sql'),uri])
 const summaryText=readFileSync(join(out,'summary.json'),'utf8'),summary=JSON.parse(summaryText)
 assert.equal(summary.rows.length,163);assert.equal(summary.read_only,'on')
 assert.equal(summary.counts['missing-or-unproven-source-evidence'],163)
 assert.doesNotMatch(result.stdout+result.stderr+summaryText,/postgresql:|fake-password/)
})
