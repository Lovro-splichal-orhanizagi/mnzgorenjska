import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync,spawn} from 'node:child_process'
import {readFileSync,mkdtempSync,writeFileSync,rmSync,mkdirSync,statSync,existsSync,chmodSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import vm from 'node:vm'
import {repository,sha256} from './dfb-artifacts.mjs'
import {historicalStatisticsPolicySha256 as canonicalSha} from './lib/historical-statistics-policy.mjs'
import {NL_REVIEWED_SOURCES,NL_REVIEWED_PRIOR,NL_REVIEWED_WORKFLOW,assertNlActionsExecution,verifyNlReviewedContract,readNlPreparedArchive,verifyNlPreparedFiles,verifyNlPreparedArtifactIdentity} from './mfa-nl-reviewed-evidence.mjs'
import {runNlReviewedStage,nlReplayCommands,nlPricingCommands,prepareNlReplayCache,authenticateNlSource,callNlReviewedRpc} from './mfa-nl-reviewed-history.mjs'

const commit='a'.repeat(40),runId='555'
const env=()=>({GITHUB_ACTIONS:'true',CI:'true',GITHUB_REPOSITORY:repository,GITHUB_REF:'refs/heads/main',GITHUB_SHA:commit,EXPECTED_SHA:commit,GITHUB_RUN_ID:runId,GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:`${repository}/${NL_REVIEWED_WORKFLOW}@refs/heads/main`})
test('NL execution requires first-attempt exact current main and fixed Actions authority',()=>{
 assert.equal(assertNlActionsExecution(env(),{head:commit,originMain:commit,liveMain:commit}),commit)
 for(const key of Object.keys(env()))assert.throws(()=>assertNlActionsExecution({...env(),[key]:'wrong'},{head:commit,originMain:commit,liveMain:commit}),/MFA NL/)
 for(const key of ['head','originMain','liveMain'])assert.throws(()=>assertNlActionsExecution(env(),{head:commit,originMain:commit,liveMain:commit,[key]:'b'.repeat(40)}),/MFA NL/)
})
function fixture(league='mt-nl1'){
 const cid=league==='mt-nl1'?973:974,policy={id:`mt-nl${cid-972}-reviewed-history-2026-10-21-v1`,sourcePolicy:`mt-mfa-nl${cid-972}-reviewed-history-v1`,entries:[{sourceMatchId:'123'}]}
 const policySha=canonicalSha(policy),contract={schemaVersion:1,competitionId:cid,policyId:policy.id,policySha256:policySha,sourceArtifact:NL_REVIEWED_SOURCES[league].artifact,opening:{round:5,playedOn:'2026-11-13',deadlineAt:'2026-11-13T13:30:00Z'}},contractSha=canonicalSha(contract)
 const image={schemaVersion:1,competitionId:cid,mainCommit:commit,policySha256:policySha,policyDocument:policy,competition:{id:cid,slug:league,source:'mfa',source_league_code:`${league==='mt-nl1'?'2601267':'6234492'}/2027`,source_policy:null,active:false},current:{players:[],rounds:[],matches:[],teams:[],appearances:[],goals:[]},opening:{round:{number:5,played_on:'2026-11-13',deadline_at:'2026-11-13T13:30:00+00:00'},fixtures:[]}}
 const text=JSON.stringify(image),beforeSha=sha256(Buffer.from(text)),football=JSON.stringify({...image.current,competition:image.competition}),footballSha=sha256(Buffer.from(football))
 const options={mode:'prepare',league,commit,contractSha,runId},calls=[],written=new Map()
 const sourceState={footballImageText:football,footballSha256:footballSha,opening:image.opening}
 const deps={
  assertMain:async()=>calls.push(['main']),policy:()=>policy,
  source:async()=>{calls.push(['source']);return{cache:new Map(),proof:{authenticated:true}}},
  derive:async()=>{calls.push(['derive']);return{reports:[],currentFixtures:[],schedules:[]}},
  verifyContract:()=>calls.push(['contract']),verifyFootball:(_model,_image,opts)=>{calls.push(['parity',opts]);return{exactParity:true}},
  verifyOpening:()=>contract.opening,
  rpc:async(name,args)=>{calls.push([name,args]);if(name==='get_mfa_nl_reviewed_source_contract')return{competitionId:cid,contractSha256:contractSha,policySha256:policySha,contractDocument:contract};if(name==='prepare_mfa_nl_reviewed_bootstrap')return{beforeImageText:text,beforeSha256:beforeSha};if(name==='get_mfa_nl_reviewed_source_state')return sourceState;if(name==='get_mfa_nl_reviewed_bootstrap_receipt')return{bootstrap:{competition_id:cid,policy_sha:policySha,before_image_text:text},installed:{installed:true,policyId:policy.id,policySha256:policySha}};return{previewSha256:'d'.repeat(64)}},
  write:(name,body)=>written.set(name,body),prepared:async()=>written,
  promoteCache:async()=>calls.push(['cache-promoted']),importSource:async()=>calls.push(['replay']),price:async()=>calls.push(['price']),smoke:async opts=>{calls.push(['smoke',opts]);return[{competitionId:cid}]},
 }
 return{options,deps,calls,written,contract,contractSha,policy,policySha,text,beforeSha,image,sourceState}
}
test('contract authentication binds all seven actual source artifact fields and canonical document SHA',()=>{
 for(const league of ['mt-nl1','mt-nl2']){
  const f=fixture(league);assert.equal(verifyNlReviewedContract({competitionId:f.contract.competitionId,contractSha256:f.contractSha,policySha256:f.policySha,contractDocument:f.contract},{league,contractSha:f.contractSha,policy:f.policy}),f.contract)
  for(const key of Object.keys(f.contract.sourceArtifact)){
   const doc={...f.contract,sourceArtifact:{...f.contract.sourceArtifact,[key]:'wrong'}},sha=canonicalSha(doc)
   assert.throws(()=>verifyNlReviewedContract({competitionId:doc.competitionId,contractSha256:sha,policySha256:f.policySha,contractDocument:doc},{league,contractSha:sha,policy:f.policy}),/MFA NL/)
  }
 }
 assert.equal(NL_REVIEWED_PRIOR.runId,'39654307070')
})
async function prepared(league='mt-nl1'){
 const f=fixture(league);await runNlReviewedStage(f.options,f.deps);return f
}
test('prepare authenticates full source and exact current native/opening before emitting review artifact',async()=>{
 const f=await prepared();assert.deepEqual([...f.written.keys()].sort(),['before-image.json','manifest.json','source-contract.json'])
 assert.equal(f.written.get('before-image.json'),f.text)
 const manifest=JSON.parse(f.written.get('manifest.json'));assert.equal(manifest.beforeSha256,f.beforeSha);assert.deepEqual(manifest.sourceArtifact,f.contract.sourceArtifact)
 assert.ok(f.calls.findIndex(c=>c[0]==='derive')<f.calls.findIndex(c=>c[0]==='prepare_mfa_nl_reviewed_bootstrap'))
 assert.equal(f.calls.find(c=>c[0]==='parity')[1].currentOnly,true)
})
test('unapproved source timing/header failures stop before bootstrap/import/price/activation mutations',async()=>{
 for(const mode of ['prepare','bootstrap','import','reprice','preview','activate']){
  const f=fixture();f.options.mode=mode;f.options.previewSha='d'.repeat(64);f.deps.derive=async()=>{throw Error('unapproved red clock')}
  await assert.rejects(()=>runNlReviewedStage(f.options,f.deps),/red clock/)
  assert.ok(!f.calls.some(c=>/^(apply_|record_|replay$|price$|check_)/.test(c[0])))
 }
})
test('bootstrap consumes only exact reviewed prepared text; drift never reaches atomic apply',async()=>{
 const f=await prepared();f.options={...f.options,mode:'bootstrap',beforeSha:f.beforeSha,prepareArtifact:{runId,artifactId:'777',digest:'sha256:'+'e'.repeat(64)}}
 await runNlReviewedStage(f.options,f.deps)
 const call=f.calls.find(c=>c[0]==='apply_mfa_nl_reviewed_bootstrap');assert.equal(call[1].p_before_image_text,f.text);assert.equal(call[1].p_before_sha,f.beforeSha)
 const bad=await prepared();bad.options={...f.options};bad.written.set('before-image.json','{}');await assert.rejects(()=>runNlReviewedStage(bad.options,bad.deps),/MFA NL/);assert.ok(!bad.calls.some(c=>c[0]==='apply_mfa_nl_reviewed_bootstrap'))
})
test('ordinary import requires bootstrap then full native parity and unchanged SQL bytes before record_import',async()=>{
 const f=fixture();f.options.mode='import';await runNlReviewedStage(f.options,f.deps)
 const names=f.calls.map(c=>c[0]);assert.ok(names.indexOf('get_mfa_nl_reviewed_bootstrap_receipt')<names.indexOf('replay'));assert.ok(names.indexOf('replay')<names.indexOf('get_mfa_nl_reviewed_source_state'));assert.ok(names.lastIndexOf('parity')<names.indexOf('record_mfa_nl_reviewed_import'))
 assert.equal(f.calls.find(c=>c[0]==='record_mfa_nl_reviewed_import')[1].p_football_sha,f.sourceState.footballSha256)
 for(const failure of ['parity','bytes']){
  const x=fixture();x.options.mode='import';if(failure==='bytes')x.sourceState.footballSha256='0'.repeat(64);else x.deps.verifyFootball=()=>{throw Error('changed appearance')}
  await assert.rejects(()=>runNlReviewedStage(x.options,x.deps));assert.ok(!x.calls.some(c=>c[0]==='record_mfa_nl_reviewed_import'))
 }
})
test('pricing is same fixed sequence; preview/activate bind source parity, native opening, smoke and reviewed digest',async()=>{
 const f=fixture();f.options.mode='reprice';await runNlReviewedStage(f.options,f.deps);assert.ok(f.calls.findIndex(c=>c[0]==='parity')<f.calls.findIndex(c=>c[0]==='price'));assert.ok(f.calls.some(c=>c[0]==='record_mfa_nl_reviewed_prices'))
 for(const league of ['mt-nl1','mt-nl2'])for(const mode of ['preview','activate']){
  const x=fixture(league);x.options.mode=mode;x.options.previewSha='d'.repeat(64);await runNlReviewedStage(x.options,x.deps)
  assert.deepEqual(x.calls.find(c=>c[0]==='smoke')[1],{competitionId:x.contract.competitionId})
  const call=x.calls.find(c=>c[0]==='check_mfa_nl_reviewed_release');assert.equal(call[1].p_activate,mode==='activate');assert.equal(call[1].p_expected_preview_sha,mode==='activate'?'d'.repeat(64):null)
 }
 const x=fixture();x.options.mode='activate';await assert.rejects(()=>runNlReviewedStage(x.options,x.deps),/preview/i);assert.ok(!x.calls.some(c=>c[0]==='check_mfa_nl_reviewed_release'))
})
test('receipt recovery needs fixed contract but performs no source download or mutating child',async()=>{
 const f=fixture();f.options.mode='receipt';await runNlReviewedStage(f.options,f.deps);assert.ok(f.calls.some(c=>c[0]==='get_mfa_nl_reviewed_release_receipt'));assert.ok(!f.calls.some(c=>['source','derive','replay','price'].includes(c[0])))
})
test('every ordinary replay command is fixed league/season and has no cleanup or override bypass',()=>{
 for(const league of ['mt-nl1','mt-nl2']){
  assert.deepEqual(nlReplayCommands(league).map(c=>c[0]),['scripts/uvoz-zapisnikov.mjs','scripts/uvoz-razporeda.mjs','scripts/uvoz-zapisnikov.mjs'])
  assert.deepEqual(nlPricingCommands(league).map(c=>c[0]),['scripts/lazni-vratarji.mjs','scripts/ugani-pozicije.mjs','scripts/ovrednoti-igralce.mjs'])
  assert.ok(nlReplayCommands(league).every(c=>c.includes(league)&&!c.some(a=>/pocisti|dovoli|vir/.test(a))))
 }
 assert.throws(()=>nlReplayCommands('mt-premier'),/MFA NL/)
})
function zip(entries){
 const dir=mkdtempSync(join(tmpdir(),'slff-nl-prepare-test-'))
 try{const file=join(dir,'entries.json');writeFileSync(file,JSON.stringify(entries));return execFileSync('python3',['-c',"import json,zipfile,io,sys; b=io.BytesIO(); z=zipfile.ZipFile(b,'w'); [(z.writestr(n,s)) for n,s in json.load(open(sys.argv[1]))]; z.close(); sys.stdout.buffer.write(b.getvalue())",file])}finally{rmSync(dir,{recursive:true,force:true})}
}
test('prepare ZIP accepts exact files and rejects traversal, duplicates, foreign files and digest drift',async()=>{
 const f=await prepared(),bytes=zip([...f.written]);assert.equal(readNlPreparedArchive(bytes,'sha256:'+sha256(bytes)).size,3)
 for(const rows of [[...f.written,['../outside.json','{}']],[...f.written,['before-image.json','{}']],[['manifest.json','{}']]]){const b=zip(rows);assert.throws(()=>readNlPreparedArchive(b,'sha256:'+sha256(b)),/MFA NL|Command failed/)}
 assert.throws(()=>readNlPreparedArchive(bytes,'sha256:'+'0'.repeat(64)),/MFA NL/)
 assert.equal(verifyNlPreparedFiles(f.written,{league:'mt-nl1',commit,runId,contractSha:f.contractSha,policy:f.policy,contract:f.contract,beforeSha:f.beforeSha}),f.text)
})
test('prepared artifact authority requires successful first-attempt exact-main route and head repository',()=>{
 const expected={runId,artifactId:'777',digest:'sha256:'+'e'.repeat(64),commit,branch:'main',workflow:NL_REVIEWED_WORKFLOW,name:`mfa-nl-reviewed-prepare-mt-nl1-${runId}-1`},run={id:555,head_sha:commit,head_branch:'main',path:NL_REVIEWED_WORKFLOW,event:'workflow_dispatch',status:'completed',conclusion:'success',run_attempt:1,repository:{full_name:repository},head_repository:{full_name:repository}},artifact={id:777,digest:expected.digest,name:expected.name,expired:false,size_in_bytes:100,workflow_run:{id:555,head_sha:commit}}
 assert.equal(verifyNlPreparedArtifactIdentity({expected,run,artifact}),expected)
 for(const patch of [{head_branch:'foreign'},{conclusion:'failure'},{run_attempt:2},{head_repository:{full_name:'foreign'}}])assert.throws(()=>verifyNlPreparedArtifactIdentity({expected,run:{...run,...patch},artifact}),/MFA NL/)
})
test('NL workflow is pinned main, fixed two leagues, sealed replay and retained evidence',()=>{
 const w=readFileSync(new URL('../.github/workflows/mfa-nl-reviewed-history.yml',import.meta.url),'utf8')
 assert.match(w,/options: \[mt-nl1, mt-nl2\]/);assert.match(w,/options: \[prepare, bootstrap, import, reprice, preview, activate, receipt\]/);assert.match(w,/persist-credentials: false/);assert.match(w,/npm ci --ignore-scripts/);assert.match(w,/cakaj-na-uvoze\.mjs --drzava MT/);assert.match(w,/cancel-in-progress: false/);assert.match(w,/if: always\(\)/);assert.doesNotMatch(w,/workflow_run:/);assert.match(w,/success\(\) && inputs.mode == 'import' && steps.stage.outcome == 'success'/);assert.match(w,/key: zapisniki-MT-k1od1-/)
})
test('NL writes share Malta and global coordination; exact readonly stages retain exemptions',()=>{
 const source=readFileSync(new URL('./cakaj-na-uvoze.mjs',import.meta.url),'utf8'),workflow='mfa-nl-reviewed-history.yml'
 const decide=(country,title)=>vm.runInNewContext(source.slice(source.indexOf('function seKrize('),source.indexOf('\nif (samoTece)'))+`\nseKrize(${JSON.stringify(workflow)},${JSON.stringify(title)},10)`,{mojaDrzava:country})
 for(const mode of ['bootstrap','import','reprice','activate'])for(const league of ['mt-nl1','mt-nl2']){
  assert.equal(decide('MT',`MFA NL reviewed history ${mode} ${league}`),true);assert.equal(decide('DE',`MFA NL reviewed history ${mode} ${league}`),false);assert.equal(decide(null,`MFA NL reviewed history ${mode} ${league}`),true)
 }
 for(const mode of ['prepare','preview','receipt'])assert.equal(decide('MT',`MFA NL reviewed history ${mode} mt-nl1`),false)
 assert.equal(decide('MT','Unknown previous title'),true)
 // Both run discovery loops and health-check filtering must include the route.
 assert.equal((source.match(/'mfa-nl-reviewed-history.yml'/g)??[]).length,4)
 for(const name of ['zdruzi-klube.yml','tedensko-cene.yml'])assert.match(readFileSync(new URL(`../.github/workflows/${name}`,import.meta.url),'utf8'),/for wf in[^\n]*mfa-nl-reviewed-history\.yml/)
})
test('changed live main stops a pending writer before ordinary replay or atomic apply',async()=>{
 const f=fixture();f.options.mode='import';let n=0;f.deps.assertMain=async()=>{if(++n===2)throw Error('main changed')}
 await assert.rejects(()=>runNlReviewedStage(f.options,f.deps),/main changed/);assert.ok(!f.calls.some(c=>c[0]==='replay'))
})
test('NL workflow correction scope also waits for older inactive Malta ordinary import',()=>{
 const source=readFileSync(new URL('./cakaj-na-uvoze.mjs',import.meta.url),'utf8'),w=readFileSync(new URL('../.github/workflows/mfa-nl-reviewed-history.yml',import.meta.url),'utf8')
 assert.match(w,/--drzava MT --popravek --tekmovanje "\$MFA_NL_LEAGUE"/)
 const result=vm.runInNewContext(source.slice(source.indexOf('function seKrize('),source.indexOf('\nif (samoTece)'))+"\nseKrize('uvoz-lige.yml','Uvoz lige mt-nl2',10)",{mojaDrzava:'MT',popravek:true,mojaLiga:null,ligaPoSlugu:new Map([['mt-nl2',{drzava:'MT',aktivna:false}]])})
 assert.equal(result,true)
})
test('both replay caches preserve authenticated bytes/mtimes; promotion preserves other country leagues',()=>{
 const dir=mkdtempSync(join(tmpdir(),'slff-nl-cache-test-')),cacheRoot=join(dir,'cache'),mtime='2026-10-21T12:34:56Z',body=Buffer.from('{"source":"retained"}'),file='tekma-123-izid.json'
 mkdirSync(join(cacheRoot,'mfa'),{recursive:true});writeFileSync(join(cacheRoot,'mfa','premier-retained.json'),'preserve Premier');writeFileSync(join(cacheRoot,'mfa',file),'stale unverified')
 const cache=prepareNlReplayCache({cache:new Map([[file,body]]),catalog:[{file,mtime,bytes:body.length,sha256:sha256(body)}]},{cacheRoot})
 try{
  for(const root of [join(cacheRoot,'mfa'),cache.sealed]){assert.deepEqual(readFileSync(join(root,file)),body);assert.equal(statSync(join(root,file)).mtimeMs,Date.parse(mtime))}
  assert.equal(existsSync(join(cacheRoot,'mfa','premier-retained.json')),false)
  writeFileSync(join(cacheRoot,'mfa',file),'CLI scratch mutation');cache.promote()
  assert.equal(readFileSync(join(cacheRoot,'mfa','premier-retained.json'),'utf8'),'preserve Premier');assert.deepEqual(readFileSync(join(cacheRoot,'mfa',file)),body);assert.equal(statSync(join(cacheRoot,'mfa',file)).mtimeMs,Date.parse(mtime))
 }finally{chmodSync(cache.sealed,0o755);rmSync(join(cache.sealed,'..'),{recursive:true,force:true});rmSync(dir,{recursive:true,force:true})}
})
const retainedRoot=process.env.MFA_NL_RETAINED_ROOT
test('actual fixed NLI/NLII ZIPs and sole prior chain authenticate without any network',{skip:!retainedRoot},async()=>{
 const dirs={'39654281589':'mt-nl1-cache-audit-39654281589','39655969899':'nl2-public-capture-39655969899','39654307070':'nl2-failed-capture-39654307070'},artifacts=new Map(Object.entries(dirs).map(([id,dir])=>[id,JSON.parse(readFileSync(join(retainedRoot,dir,'artifact.json')))]))
 const transport={json:path=>{const id=path.split('/').at(-1);if(path.startsWith('actions/runs/'))return JSON.parse(readFileSync(join(retainedRoot,dirs[id],'run.json')));const [run]=[...artifacts].find(([,a])=>String(a.id)===id)??[];assert.ok(run,'only compiled artifact IDs');return artifacts.get(run)},binary:path=>{const id=path.split('/').at(-2),[run]=[...artifacts].find(([,a])=>String(a.id)===id)??[];assert.ok(run,'only compiled ZIP IDs');return readFileSync(join(retainedRoot,dirs[run],'artifact.zip'))}}
 for(const league of ['mt-nl1','mt-nl2']){const source=await authenticateNlSource(league,transport);assert.ok(source.cache.size>0);assert.equal(source.proof.sourceArtifact,NL_REVIEWED_SOURCES[league].artifact);if(league==='mt-nl2'){assert.equal(source.proof.priorArtifact,NL_REVIEWED_PRIOR);assert.ok(source.proof.ledger.priorRequests>0)}}
})


async function localRpcServer(run){
 const dir=mkdtempSync(join(tmpdir(),'slff-nl-rpc-')),log=join(dir,'requests.jsonl')
 const server=spawn(process.execPath,['--input-type=module','-e',`
  import{createServer}from'node:http';import{appendFileSync}from'node:fs';const sockets=new Set();
  const server=createServer((req,res)=>{
   if(req.url==='/expire'){setTimeout(()=>{for(const socket of sockets)if(!socket.destroyed)socket.resetAndDestroy();res.setHeader('Connection','close');res.end('expired')},75);return}
   sockets.add(req.socket);
   appendFileSync(${JSON.stringify(log)},JSON.stringify({path:req.url,connection:req.headers.connection,port:req.socket.remotePort})+'\\n');
   if(req.url.endsWith('/drop')){req.socket.destroy();return}
   req.resume();req.on('end',()=>{
    res.setHeader('Content-Type','application/json');res.setHeader('Keep-Alive','timeout=600');res.end('{"ok":true}');
   });
  });server.keepAliveTimeout=300000;server.listen(0,'127.0.0.1',()=>console.log(server.address().port));
 `],{stdio:['ignore','pipe','pipe']})
 let stderr='';server.stderr.on('data',x=>stderr+=x)
 try{
  const port=await new Promise((resolve,reject)=>{server.once('error',reject);server.once('exit',code=>reject(Error('local RPC server exited '+code+': '+stderr)));server.stdout.once('data',x=>resolve(Number(String(x).trim())))})
  await run({endpoint:new URL('http://127.0.0.1:'+port),log})
 }finally{const done=new Promise(resolve=>server.once('close',resolve));server.kill();await done;rmSync(dir,{recursive:true,force:true})}
}
test('parent RPC remains usable after a synchronous child crosses stale keepalive reset',{timeout:10000},async()=>{
 await localRpcServer(async({endpoint,log})=>{
  for(let i=0;i<4;i++){assert.deepEqual(await callNlReviewedRpc(endpoint,'local-test-key','read',{}),{ok:true});await new Promise(resolve=>setTimeout(resolve,10))}
  // The server resets idle RPC sockets only after the synchronous child starts.
  // Its control response is sent after reset, so this boundary has no timing race.
  execFileSync(process.execPath,['--input-type=module','-e',`import{get}from'node:http';get(${JSON.stringify(new URL('/expire',endpoint).href)},{agent:false},res=>{res.resume();res.on('end',()=>{if(res.statusCode!==200)process.exitCode=1})}).on('error',()=>{process.exitCode=1})`],{timeout:5000})
  assert.deepEqual(await callNlReviewedRpc(endpoint,'local-test-key','after_child',{}),{ok:true})
  const requests=readFileSync(log,'utf8').trim().split('\n').map(JSON.parse)
  assert.equal(requests.length,5);assert.ok(requests.every(r=>r.connection==='close'));assert.equal(new Set(requests.map(r=>r.port)).size,5)
 })
})
test('parent RPC never retries an ambiguous write transport failure',{timeout:10000},async()=>{
 await localRpcServer(async({endpoint,log})=>{
  await assert.rejects(callNlReviewedRpc(endpoint,'local-test-key','drop',{write:true}),error=>{assert.match(error.message,/RPC drop transport ambiguous; read receipt before retrying writes/);assert.ok(error.cause instanceof TypeError);return true})
  assert.equal(readFileSync(log,'utf8').trim().split('\n').length,1)
 })
})
