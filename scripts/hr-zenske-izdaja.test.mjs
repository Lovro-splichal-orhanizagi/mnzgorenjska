import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,mkdtempSync,rmSync,writeFileSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {spawnSync} from 'node:child_process'
import {validateHnsWomenActionsContext,validateHnsWomenStaging,extractHnsWomenArchive,runHnsWomenImports,runHnsWomenReleaseGate,refreshHnsWomenDerivedState} from './hr-zenske-izdaja.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',commit='a'.repeat(40),hash=x=>createHash('sha256').update(x).digest('hex'),bytes=Buffer.from('TEST ONLY archive metadata')
const environment=()=>({GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_SHA:commit,GITHUB_REPOSITORY:repo})
const stage=()=>({repository:repo,releaseId:12,assetId:34,reviewedSha:commit,manifestSha256:'b'.repeat(64),archiveSha256:hash(bytes),assetBytes:bytes,release:{id:12,draft:true,url:`https://api.github.com/repos/${repo}/releases/12`,assets:[{id:34,name:`hns-women-${commit}.tar.gz`,state:'uploaded',size:bytes.length,url:`https://api.github.com/repos/${repo}/releases/assets/34`}]}})
test('Actions authority requires exact reviewed main/repository and rejects local or fork execution',()=>{
 assert.doesNotThrow(()=>validateHnsWomenActionsContext(environment(),commit,commit))
 for(const change of [{GITHUB_ACTIONS:'false'},{GITHUB_EVENT_NAME:'push'},{GITHUB_REF:'refs/heads/other'},{GITHUB_SHA:'c'.repeat(40)},{GITHUB_REPOSITORY:'attacker/fork'}])assert.throws(()=>validateHnsWomenActionsContext({...environment(),...change},commit,commit),/HNS|review|main|Actions|repository/i)
 assert.throws(()=>validateHnsWomenActionsContext(environment(),commit,'d'.repeat(40)),/HNS|checkout|review/i)
})
test('draft release proof binds repository, asset ID/name/bytes and both reviewed hashes',()=>{
 assert.doesNotThrow(()=>validateHnsWomenStaging(stage()))
 for(const change of [x=>x.repository='attacker/fork',x=>x.release.draft=false,x=>x.release.id=13,x=>x.assetId=35,x=>x.release.assets[0].url='https://example.invalid/file',x=>x.release.assets[0].name='different.tar.gz',x=>x.assetBytes=Buffer.from('changed'),x=>x.manifestSha256='unknown']){const value=stage();change(value);assert.throws(()=>validateHnsWomenStaging(value),/HNS|release|asset|hash|repository/i)}
})
function archive(directory,kind){const path=join(directory,`${kind.replaceAll('/','_')}.tar.gz`),r=spawnSync('python3',['-c',`import tarfile,io,sys\nwith tarfile.open(sys.argv[1],'w:gz') as t:\n for name,kind in [('manifest.json','file'),('documents/match-123.html','file')]+([('${kind}','${kind}')] if '${kind}'!='normal' else []):\n  i=tarfile.TarInfo(name if kind not in ['symlink','hardlink'] else 'documents/link');i.size=1\n  if kind in ['symlink','hardlink']:i.type=tarfile.SYMTYPE if kind=='symlink' else tarfile.LNKTYPE;i.linkname='/etc/hosts';i.size=0\n  t.addfile(i,io.BytesIO(b'x'))\n`,path],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return path}
test('archive extraction checks every member before writing and refuses traversal, links and unexpected files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'hns-stage-test-'))
 try{const out=join(dir,'valid');extractHnsWomenArchive(archive(dir,'normal'),out);assert.equal(readFileSync(join(out,'manifest.json'),'utf8'),'x')
 for(const kind of ['../escape','symlink','hardlink','unexpected.txt']){const destination=join(dir,kind.replaceAll('/','_')+'-out');assert.throws(()=>extractHnsWomenArchive(archive(dir,kind),destination),/HNS|archive|member|link|path/i);assert.equal(existsSync(destination),false)}}finally{rmSync(dir,{recursive:true,force:true})}
})
test('initial imports use only archive75 then full current schedule and strict current reports with closed preloader',()=>{
 const calls=[];runHnsWomenImports('/tmp/TEST-ONLY-packet','b'.repeat(64),{run:(file,args,options)=>calls.push({file,args,env:options.env})})
 assert.deepEqual(calls.map(c=>c.args.slice(2)),[['scripts/uvoz-zapisnikov.mjs','--tekmovanje','hr-prva-hnlz','--liga','108043476'],['scripts/uvoz-razporeda.mjs','--tekmovanje','hr-prva-hnlz','--pisi'],['scripts/uvoz-zapisnikov.mjs','--tekmovanje','hr-prva-hnlz'],['scripts/ugani-pozicije.mjs','--tekmovanje','hr-prva-hnlz','--pisi'],['scripts/ovrednoti-igralce.mjs','--tekmovanje','hr-prva-hnlz','--pisi']])
 for(const call of calls){assert.equal(call.args[0],'--import');assert.ok(call.args[1].endsWith('/scripts/hr-zenske-offline.mjs'));assert.equal(call.env.SLFF_HNS_WOMEN_PACKET_DIR,'/tmp/TEST-ONLY-packet');assert.equal(call.env.SLFF_HNS_WOMEN_PACKET_SHA256,'b'.repeat(64))}
})

test('dedicated workflow shares HNS league concurrency and verifies evidence before each writer receives credentials',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/uvoz-hr-zenske.yml',import.meta.url),'utf8')
 assert.match(workflow,/group: uvoz-lige-hr-prva-hnlz/)
 const reader=workflow.slice(workflow.indexOf('  evidence:'),workflow.indexOf('  writer:'))
 assert.match(reader,/\bstage\s/);assert.ok(!reader.includes('SUPABASE_SERVICE_ROLE_KEY'))
 const writer=workflow.slice(workflow.indexOf('  writer:'))
 assert.ok(writer.search(/\bverify\s/)>=0&&writer.search(/\bverify\s/)<writer.indexOf('SUPABASE_SERVICE_ROLE_KEY'))
 assert.match(workflow,/options: \[prepare, import, check, activate\]/)
 const generic=readFileSync(new URL('../.github/workflows/uvoz-lige.yml',import.meta.url),'utf8')
 assert.ok(generic.indexOf("inputs.liga == 'hr-prva-hnlz'")<generic.indexOf('SUPABASE_SERVICE_ROLE_KEY'))
})

const captureDir=process.env.SLFF_HNS_WOMEN_CAPTURE_DIR,pilotDir=process.env.SLFF_HNS_WOMEN_PILOT_DIR
test('actual Actions writer rejects retained source HOLD before the first database request',{skip:!captureDir||!pilotDir},async()=>{
 const {buildHnsWomenPacket,readHnsWomenCaptures,writeHnsWomenPacket}=await import('./hr-zenske-paket.mjs'),{execFileSync,spawn}=await import('node:child_process'),{createServer}=await import('node:http'),{once}=await import('node:events'),dir=mkdtempSync(join(tmpdir(),'hns-held-writer-'))
 let requests=0;const server=createServer((_request,response)=>{requests++;response.writeHead(500,{'content-type':'application/json'});response.end('{"message":"TEST ONLY writer sink"}')})
 server.listen(0,'127.0.0.1');await once(server,'listening')
 try{
  const reviewedSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),packet=buildHnsWomenPacket({...readHnsWomenCaptures({captureDir,pilotDir,currentFile:'current-refresh-20261018-final.html'}),sourceCommit:reviewedSha,now:Date.parse('2026-10-18T16:00:00Z')}),manifestSha256=writeHnsWomenPacket(packet,dir)
  assert.equal(packet.manifest.releaseReady,false)
  for(const mode of ['prepare','import','check','activate']){
  const child=spawn(process.execPath,['scripts/hr-zenske-izdaja.mjs',mode,'--reviewed-sha',reviewedSha,'--manifest-sha256',manifestSha256,'--packet-dir',dir],{env:{...process.env,...environment(),GITHUB_SHA:reviewedSha,SUPABASE_URL:`http://127.0.0.1:${server.address().port}`,SUPABASE_SERVICE_ROLE_KEY:'TEST-ONLY-NOT-A-REAL-KEY'},stdio:['ignore','pipe','pipe']}),errors=[]
  child.stderr.on('data',data=>errors.push(data));const [code]=await once(child,'close')
  assert.notEqual(code,0);assert.match(Buffer.concat(errors).toString(),/elapsed prelaunch round still has unpublished reports/);assert.equal(requests,0)
  }
 }finally{server.close();rmSync(dir,{recursive:true,force:true})}
})

test('archive duplicates and oversized regular members fail before an extraction tree exists',()=>{
 const dir=mkdtempSync(join(tmpdir(),'hns-tar-limits-'))
 try{for(const kind of ['duplicate','oversized']){
  const path=join(dir,kind+'.tar.gz'),out=join(dir,kind),created=spawnSync('python3',['-c',"import tarfile,io,sys\nwith tarfile.open(sys.argv[1],'w:gz') as t:\n for name,size in [('manifest.json',1)]+([('manifest.json',1)] if sys.argv[2]=='duplicate' else [('documents/match-124.html',2000001)]):\n  i=tarfile.TarInfo(name);i.size=size;t.addfile(i,io.BytesIO(b'x'*size))",path,kind],{encoding:'utf8'})
  assert.equal(created.status,0,created.stderr);assert.throws(()=>extractHnsWomenArchive(path,out),kind==='duplicate'?/duplicate/:/oversized/);assert.equal(existsSync(out),false)
 }}finally{rmSync(dir,{recursive:true,force:true})}
})


test('Actions check and activation call the same canonical service gate with an explicit boolean',async()=>{
 const manifest={sourceCommit:commit,parserSha256:'d'.repeat(64),firstFantasyRound:9,statisticsPolicy:{id:'reviewed-policy',sha256:'e'.repeat(64),firstFantasyPlayedOn:'2026-10-25'},sourceBudget:{hnsRequests:142,otherRequests:1,total:143,refusalObserved:false},schedules:[{code:'108043476',capturedAt:'2026-10-18T12:00:00Z',sha256:'1'.repeat(64)},{code:'114471579',capturedAt:'2026-10-18T15:55:00Z',sha256:'2'.repeat(64)}],coverage:{normalComplete:103,pending:25},future:{deadlineAt:new Date(Date.now()+7*86400000).toISOString()}},calls=[]
 const response=active=>({verified:true,active,manifestSha256:'b'.repeat(64),sourceCommit:commit,parserSha256:manifest.parserSha256,fixtures:131,archiveFixtures:75,currentFixtures:56,unavailableHistorical:3,normalComplete:103,pending:25,eligibleCurrentClubs:8,activePlayers:96,firstFantasyRound:9,deadlineAt:manifest.future.deadlineAt,defaultPricePercent:8.3,maxPrice:12,cheapestLegal15:74,statisticsPolicyId:manifest.statisticsPolicy.id,statisticsPolicySha256:manifest.statisticsPolicy.sha256,firstFantasyPlayedOn:manifest.statisticsPolicy.firstFantasyPlayedOn,sourceBudget:structuredClone(manifest.sourceBudget),originalCaptures:structuredClone(manifest.schedules),deadlineReason:'fantasy_midnight_date_only'})
 for(const activate of [false,true]){const result=await runHnsWomenReleaseGate({async rpc(name,args){calls.push([name,args]);return{data:response(activate),error:null}}},manifest,'b'.repeat(64),{activate});assert.equal(result.active,activate)}
 assert.deepEqual(calls.map(c=>[c[0],c[1].p_activate]),[['check_hns_women_release',false],['check_hns_women_release',true]])
 for(const change of [x=>x.verified=false,x=>x.cheapestLegal15=101,x=>x.unavailableHistorical=4,x=>x.deadlineAt=new Date(0).toISOString(),x=>x.sourceCommit='f'.repeat(40),x=>x.statisticsPolicySha256='f'.repeat(64),x=>x.originalCaptures[1].capturedAt='2026-10-18T16:00:00Z']){const value=response(false);change(value);await assert.rejects(()=>runHnsWomenReleaseGate({async rpc(){return{data:value,error:null}}},manifest,'b'.repeat(64)),/HNS|readiness|gate/i)}
})
test('post-valuation refresh touches only the prepared league rounds and players',async()=>{
 const calls=[],db={from(table){const query={select(){return query},eq(key,id){assert.equal(key,'competition_id');assert.equal(id,99);return query},order(){return query},range(){return Promise.resolve({data:table==='rounds'?[{id:100},{id:101}]:[{id:200},{id:201}],error:null})}};return query},async rpc(...args){calls.push(args);return{data:null,error:null}}}
 await refreshHnsWomenDerivedState(db,99)
 assert.deepEqual(calls,[['recompute_round_scores',{p_round_id:100}],['recompute_round_scores',{p_round_id:101}],['osvezi_statistiko_igralcev',{p_igralci:[200,201]}]])
})
