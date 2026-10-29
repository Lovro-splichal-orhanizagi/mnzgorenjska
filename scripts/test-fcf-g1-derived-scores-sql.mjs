// No local DB path. The only executable SQL target is the fresh CI job database.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync,spawn} from 'node:child_process'
export function g1ScoresDisposableTarget(e=process.env){
 if(e.FCF_G1_SCORES_CI_SQL_TEST!=='1'||e.CI!=='true'||e.GITHUB_ACTIONS!=='true'||e.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||e.GITHUB_JOB!=='varnost'||e.SUPABASE_DB_CONTAINER!=='supabase_db_mnzgorenjska'||e.SUPABASE_TEST_DB!=='postgres')throw Error('fresh disposable GHA varnost database required; local SQL forbidden')
 return {container:'supabase_db_mnzgorenjska',database:'postgres'}
}
test('SQL harness refuses local, alternate database/container and partial CI claims',()=>{assert.throws(()=>g1ScoresDisposableTarget({}));const ci={FCF_G1_SCORES_CI_SQL_TEST:'1',CI:'true',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_JOB:'varnost',SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska',SUPABASE_TEST_DB:'postgres'};assert.equal(g1ScoresDisposableTarget(ci).database,'postgres');for(const k of Object.keys(ci))assert.throws(()=>g1ScoresDisposableTarget({...ci,[k]:'wrong'}))})
test('fresh GHA synthetic924 score rederivation and durable9410 guards roll back',{skip:process.env.FCF_G1_SCORES_CI_SQL_TEST!=='1'},()=>{
 const target=g1ScoresDisposableTarget(),base=readFileSync(new URL('../supabase/tests/fcf-g1-readonly-projection.sql',import.meta.url),'utf8').split('-- All fixture changes already happened')[0],fixture=readFileSync(new URL('../supabase/tests/fcf-g1-derived-scores-9410.sql',import.meta.url),'utf8')
 const output=execFileSync('docker',['exec','-i',target.container,'psql','-U','supabase_admin','-d',target.database,'-X','-qAt','-v','ON_ERROR_STOP=1'],{input:'BEGIN;\n'+base+'\n'+fixture+'\nROLLBACK;\n',encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024})
 assert.match(output,/FCF_G1_SCORES_9410_SERVICE_PASS/)
})

test('joined migrations have no expired protocol dependency or unresolved new private helpers',()=>{
 const files=['20261029140000_fcf_g1_derived_scores.sql','20261029141000_fcf_g1_9410_durable.sql'],sql=files.map(f=>readFileSync(new URL('../supabase/migrations/'+f,import.meta.url),'utf8')).join('\n')
 assert.doesNotMatch(sql,/private_fcf_g1_native301|20261029140100/)
 const definitions=new Set([...sql.matchAll(/create (?:function|table) (private_fcf_g1_(?:scores|9410)\.\w+)\(/g)].map(m=>m[1]))
 for(const [,reference]of sql.matchAll(/(private_fcf_g1_(?:scores|9410)\.\w+)\(/g))assert.ok(definitions.has(reference),'unresolved '+reference)
})
test('9410 reader waits for a concurrent marker writer lock and observes rollback only',{skip:process.env.FCF_G1_SCORES_CI_SQL_TEST!=='1'},async()=>{
 const t=g1ScoresDisposableTarget(),args=['exec','-i',t.container,'psql','-U','supabase_admin','-d',t.database,'-X','-qAt','-v','ON_ERROR_STOP=1']
 const writer=spawn('docker',args),reader=spawn('docker',args);let output='',errors='',done=false
 const completion=p=>new Promise((resolve,reject)=>{p.once('error',reject);p.once('close',code=>code===0?resolve():reject(Error('psql failed '+code+' '+errors)))})
 const wd=completion(writer),rd=completion(reader);rd.then(()=>{done=true},()=>{done=true})
 writer.stderr.on('data',b=>{errors+=b});reader.stderr.on('data',b=>{errors+=b});reader.stdout.on('data',b=>{output+=b})
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('marker lock timeout')),15000);writer.stdout.on('data',b=>{if(String(b).includes('MARKER_LOCK_READY')){clearTimeout(timer);resolve()}});writer.stdin.write("BEGIN; LOCK TABLE private_fcf_g1_9410.markers IN ACCESS EXCLUSIVE MODE; SELECT 'MARKER_LOCK_READY';\n")})
  reader.stdin.end("BEGIN READ ONLY; SELECT public.get_installed_fcf_g1_4109410_supplement()::text; ROLLBACK;\n")
  await new Promise(r=>setTimeout(r,250));assert.equal(done,false,'reader must wait while writer lock is held')
  writer.stdin.end('ROLLBACK;\n');await Promise.all([wd,rd]);assert.match(output,/null/)
 }finally{writer.kill();reader.kill()}
})
