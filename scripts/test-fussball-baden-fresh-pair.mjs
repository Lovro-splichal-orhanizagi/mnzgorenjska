import test from 'node:test'
import assert from 'node:assert/strict'
const api=await import('./fussball-baden-fresh-pair.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
test('hosted pair reader rejects copied receipts and all public proof/clock/IO overrides',async()=>{
 assert.equal(typeof api.readFussballBadenFreshPair,'function');assert.equal(typeof api.getFussballBadenFreshPair,'function')
 for(const value of [{},{sourceOnly:true,kind:'authenticated-fussball-baden-fresh-pair-source'},JSON.parse('{"nativeAdmission":true}')])assert.throws(()=>api.getFussballBadenFreshPair(value),/reader-issued/)
 for(const key of ['proof','clock','now','sourceCodeSha256','io','loader','nativeAdmission']){let calls=0;await assert.rejects(api.readFussballBadenFreshPair({sourceRunId:'99999999999',sourceHead:'a'.repeat(40),github:async()=>{calls++},[key]:true}),/closed/);assert.equal(calls,0)}
})
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {deflateRawSync} from 'node:zlib'
import {collectFussballSeason} from './fussball-season.mjs'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {FUSSBALL_V4_RETRY_POLICY} from './lib/fussball-v4-retry.mjs'
import {inspectFussballArchivePage,extractFussballSeasonLinks} from './fussball-season-links.mjs'
import {inspectFussballPage} from './viri/fussball-discovery.mjs'
import {fussballFreshPairProfile,fussballFreshPairCodeSha256,readFussballFreshBudget,getFussballFreshBudget,replayFussballFreshPair,FRESH_PAIR_SOURCE_STEP,FRESH_PAIR_REPLAY_STEP} from './fussball-fresh-pair.mjs'
const pins=JSON.parse(readFileSync(new URL('./fussball-fresh-pair-history.json',import.meta.url))),profile=fussballFreshPairProfile(),sha=b=>createHash('sha256').update(b).digest('hex'),json=x=>Buffer.from(JSON.stringify(x)+'\n'),repo=profile.repository,prefix=`repos/${repo}/`,sourceRunId='99999999999',sourceHead='e'.repeat(40),ciId='99999999998',actor={id:25134229,login:'nejcar20',type:'User'},at=n=>new Date(n).toISOString()
function tinyPage(stage){
 let html=readFileSync(new URL(`./vzorci/de-fussball-baden-${stage}-20261026.html`,import.meta.url),'utf8'),scope=profile[stage]
 html=html.replace(/(<select\b[^>]*name="spieltag"[^>]*>)[\s\S]*?(<\/select>)/,(_,a,b)=>a+`<option selected="selected" data-href="${scope.seedUrl.replace('/-/staffel/','/-/spieltag/1/staffel/')}">1. Spieltag</option>`+b)
 const table=html.slice(html.indexOf('<div class="fixtures-matches-table">')).match(/<table\b[^>]*>[\s\S]*?<\/table>/)[0]
 let row=[...table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(x=>x[0]).find(x=>x.includes('column-club')&&x.includes('column-score')&&x.includes('/spiel/'))
 const url=row.match(/href="(https:\/\/www.fussball.de\/spiel\/[^"#]+)(?:#[^"]*)?"/)[1]
 row=row.replace(/<td class="column-date">[\s\S]*?<\/td>/,'<td class="column-date">12:00</td>').replace(/<td class="column-score">[\s\S]*?<\/td>/,`<td class="column-score"><a href="${url}"><span class="info-text">Ausfall</span></a></td>`)
 return Buffer.from(html.replace(table,table.replace(/<tbody>[\s\S]*?<\/tbody>/,`<tbody><tr><td>22.10.2026</td></tr>${row}</tbody>`)))
}
async function stageFiles(stage,time,codeSha256){
 const files=new Map(),attempts=[],outcomes=[],documents=[],createdAt=at(time),options={...profile[stage],maxRequests:profile.caps[stage],asOfDate:createdAt.slice(0,10)},body=tinyPage(stage)
 const client=createFussballCaptureClient({maxRequests:profile.caps[stage],retryPolicy:FUSSBALL_V4_RETRY_POLICY,now:()=>time,sleep:async ms=>{time+=ms},onAttempt:a=>attempts.push(a),onOutcome:a=>outcomes.push(a),onDocument:d=>{const b=Buffer.from(d.bytes),file=`documents/${d.sha256}.${d.kind==='font'?'woff':d.kind==='css'?'css':'html'}`;files.set(file,b);documents.push({...d,bytes:b.length,file,origin:'network'})},fetchFn:async url=>{assert.equal(url,options.seedUrl);return new Response(body,{status:200,headers:{'content-type':'text/html'}})}})
 const result=await collectFussballSeason({...options,client},stage==='archive'?{inspectPage:(html,scope)=>scope.kind==='round'?inspectFussballArchivePage(html,{archive:profile.archive,current:profile.current}):inspectFussballPage(html,scope)}:{})
 files.set('attempts.jsonl',Buffer.from(attempts.map(a=>JSON.stringify(a)+'\n').join('')));files.set('outcomes.jsonl',Buffer.from(outcomes.map(a=>JSON.stringify(a)+'\n').join('')));files.set('progress.jsonl',Buffer.alloc(0))
 const raw=json(result),commitment={version:1,kind:'fussball-full-semantic-result-commitment',resultSha256:sha(raw),semanticBytes:raw.length,scope:result.scope,coverage:result.coverage,sourceOnly:true,nativeAdmission:false,activationEligible:false};files.set('result-commitment.json',json(commitment))
 const m={version:8,protocol:profile.protocol,stage,createdAt,completedAt:at(time+1),options,codeSha256,success:true,error:null,snapshot:client.snapshot(),documents,resultSha256:sha(raw),resultCommitmentSha256:sha(files.get('result-commitment.json')),retryPolicy:FUSSBALL_V4_RETRY_POLICY.id,intentsSha256:sha(files.get('attempts.jsonl')),outcomesSha256:sha(files.get('outcomes.jsonl')),sourceOnly:true,nativeAdmission:false,activationEligible:false}
 for(const d of documents)d.originalReceipt={version:1,document:Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,d[k]])),attempt:m.snapshot.attempts.find(a=>a.url===d.url&&a.status==='success'&&a.startedAt===d.capturedAt),capture:{createdAt:m.createdAt,codeSha256,staffel:options.staffel,season:options.season}}
 files.set('manifest.json',json(m));return {files,m,result}
}
function zip(t,files){const root=mkdtempSync(join(tmpdir(),'pair-reader-TEST-ONLY-'));t.after(()=>rmSync(root,{recursive:true,force:true}));for(const [p,b]of files){mkdirSync(dirname(join(root,p)),{recursive:true});writeFileSync(join(root,p),b)}execFileSync('zip',['-q',join(root,'artifact.zip'),...files.keys()],{cwd:root});return readFileSync(join(root,'artifact.zip'))}
async function fixture(t){
 const calls=[],controls={},historicalGet=async(path,binary)=>{const p=pins.records.find(p=>path.includes('/'+p.run.id)||path.includes('/'+p.artifact.id));assert.ok(p,'known historical GET '+path);if(binary)return readFileSync(new URL(`./vzorci/baden-fresh-budget-${p.name}.zip`,import.meta.url));if(path.includes('/jobs?'))return structuredClone(p.jobs);if(path.includes('/artifacts/'))return {...p.artifact,expired:false,expires_at:at(Date.now()+86400000),workflow_run:{id:p.run.id,head_sha:p.run.head_sha}};return structuredClone(p.run)}
 const budget=getFussballFreshBudget(await readFussballFreshBudget({github:historicalGet})),codeSha256=fussballFreshPairCodeSha256(),start=Date.now()-120000,current=await stageFiles('current',start,codeSha256),archive=await stageFiles('archive',start+7000,codeSha256),files=new Map(budget.files)
 for(const [stage,s]of [['current',current],['archive',archive]])for(const [k,b]of s.files)files.set(stage+'/'+k,b)
 const run={id:Number(sourceRunId),workflow_id:701,head_sha:sourceHead,head_branch:'main',run_attempt:1,path:profile.workflow,event:'workflow_dispatch',repository:{full_name:repo},head_repository:{full_name:repo},actor,triggering_actor:actor,display_title:'Baden fresh paired source audit',created_at:at(start-15000),updated_at:at(start+21000),status:'completed',conclusion:'success'},w={id:701,path:profile.workflow,state:'active'},ci={...run,id:Number(ciId),path:'.github/workflows/ci.yml',event:'push'},ciJobs={total_count:10,jobs:Array.from({length:10},(_,i)=>({id:800+i,run_id:ci.id,head_sha:sourceHead,run_attempt:1,status:'completed',conclusion:i<2?'skipped':'success'}))}
 files.set('budget.json',json(budget.receipt));const guards={}
 for(const [name,time]of [['initial',start-1000],['between',start+2000],['final',start+9000]]){const g={version:1,verifiedAt:at(time),head:sourceHead,runId:sourceRunId,mainCiRunId:ciId,ownRun:{...run,status:'in_progress',conclusion:null},main:{name:'main',commit:{sha:sourceHead}},ci,ciJobs,servedSha256:'a'.repeat(64),historySha256:'b'.repeat(64)};files.set('guard-'+name+'.json',json(g));guards[name]=sha(files.get('guard-'+name+'.json'))}
 const seed=current.m.documents.find(d=>d.url===profile.current.seedUrl),previous=extractFussballSeasonLinks(current.files.get(seed.file).toString(),profile.current).previous,menu={currentRawSha256:seed.sha256,observedSeedUrl:previous.seedUrl,canonicalArchiveSeedUrl:profile.archive.seedUrl,currentCode:profile.current.staffel+':'+profile.current.season,archiveCode:profile.archive.staffel+':'+profile.archive.season}
 // TEST ONLY serializer for actual private producer retention-summary helpers;
 // no producer/runtime/clock injection is exposed by the production reader.
 const source=readFileSync(new URL('./fussball-fresh-pair.mjs',import.meta.url),'utf8'),functions=['retentionCost','retentionTotals','retainedPairSummary'].map(n=>source.split('\n').find(s=>s.startsWith('function '+n+'('))).join('\n'),summary=new Function('profile','deflateRawSync','check',functions+'\nreturn retainedPairSummary')(profile,deflateRawSync,(v,m)=>assert.ok(v,m))
 const manifest={version:8,protocol:profile.protocol,createdAt:at(start-2000),completedAt:at(start+10000),codeSha256,budget:budget.receipt,reservation:{current:780,archive:1200,priorRequests:3020,totalRequestCap:5000},execution:{runId:sourceRunId,head:sourceHead,repository:repo,workflow:profile.workflow,runAttempt:1},guards,retention:summary(files),stages:{current:sha(current.files.get('manifest.json')),archive:sha(archive.files.get('manifest.json'))},accounting:{known:true,priorRequests:3020,currentRequests:1,archiveRequests:1,newRequests:2,cumulativeRequests:3022,totalRequestCap:5000},menu,success:true,error:null,sourceOnly:true,nativeAdmission:false,activationEligible:false};files.set('pair-manifest.json',json(manifest))
 const replay=await replayFussballFreshPair({files,codeSha256}),{manifest:ignored,stages:ignoredStages,...small}=replay,bytes=zip(t,files),att=zip(t,new Map([['fresh-pair-source-attestation.json',json(small)]]))
 const stepNames=['Set up job','Checkout exact reviewed fixed writer','Set up Node22','Install locked dependencies','Focused source-free fixed pair controls',FRESH_PAIR_SOURCE_STEP,FRESH_PAIR_REPLAY_STEP,'Preserve all originals, partial attempts and historical budget receipts','Preserve separate source-only replay attestation','Post Set up Node22','Post Checkout exact reviewed fixed writer','Complete job']
 const steps=stepNames.map((name,i)=>({number:i+1,name,status:'completed',conclusion:'success',started_at:at(i<5?start-10000:i===5?start-3000:start+11000+(i-6)*1000),completed_at:at(i<5?start-10000:i===5?start+10000:start+11500+(i-6)*1000)})),jobs={total_count:1,jobs:[{id:711,name:'capture-pair',run_id:run.id,head_sha:sourceHead,run_attempt:1,status:'completed',conclusion:'success',started_at:run.created_at,completed_at:run.updated_at,steps}]}
 const artifacts=[{id:721,name:`baden-fresh-pair-${sourceRunId}`,bytes,step:steps[7]},{id:722,name:`baden-fresh-pair-attestation-${sourceRunId}`,bytes:att,step:steps[8]}].map(a=>({...a,metadata:{id:a.id,name:a.name,expired:false,size_in_bytes:a.bytes.length,digest:'sha256:'+sha(a.bytes),workflow_run:{id:run.id,head_sha:sourceHead,head_branch:'main'},created_at:a.step.started_at,updated_at:a.step.completed_at}})),inventory={total_count:2,artifacts:artifacts.map(a=>a.metadata)}
 const github=async(path,binary=false)=>{calls.push(path);let v
  if(path===prefix+'actions/workflows/preveri-baden-fresh-pair.yml')v=w
  else if(path===prefix+`actions/runs/${sourceRunId}`)v=run
  else if(path===prefix+`actions/runs/${sourceRunId}/attempts/1/jobs?per_page=100&page=1`)v=jobs
  else if(path===prefix+`actions/runs/${sourceRunId}/artifacts?per_page=100&page=1`)v=inventory
  else if(path===prefix+`actions/runs/${ciId}`)v=ci
  else if(path===prefix+`actions/runs/${ciId}/attempts/1/jobs?per_page=100&page=1`)v=ciJobs
  else if(path.startsWith(prefix+'contents/')){const p=path.slice((prefix+'contents/').length).split('?')[0],b=readFileSync(new URL('../'+p,import.meta.url));v={type:'file',path:p,size:b.length,encoding:'base64',content:b.toString('base64')}}
  else{const a=artifacts.find(a=>path===prefix+`actions/artifacts/${a.id}`||path===prefix+`actions/artifacts/${a.id}/zip`);if(a)v=binary?a.bytes:a.metadata;else v=await historicalGet(path,binary)}
  v=controls.change?.(path,v,binary)??v;return Buffer.isBuffer(v)?Buffer.from(v):structuredClone(v)
 }
 return {files,manifest,run,w,ci,jobs,inventory,artifacts,github,calls,controls}
}
test('hosted pair issues honest new kind from actual private historical3020 and independent tiny full raw replay',async t=>{
 const f=await fixture(t),p=await api.readFussballBadenFreshPair({sourceRunId,sourceHead,github:f.github}),v=api.getFussballBadenFreshPair(p)
 assert.equal(p.version,8);assert.equal(p.kind,'authenticated-fussball-baden-fresh-pair-source');assert.equal(p.nativeAdmission,false);assert.equal(p.admissible,false);assert.equal(p.activationEligible,false);assert.equal(p.source.sourceRunId,sourceRunId);assert.equal(p.source.sourceHead,sourceHead);assert.equal(p.source.captureCodeSha256,fussballFreshPairCodeSha256());assert.equal(p.source.priorRequests,3020);assert.equal(p.source.requests,2);assert.equal(p.source.cumulativeRequests,3022);const legacy=await import('./fussball-completed-source-v7.mjs');assert.throws(()=>legacy.getFussballCompletedSourceV7(p),/reader-issued/)
 assert.equal(v.originals.stages.current.result.schedule.fixtures.length,1);assert.equal(v.originals.stages.archive.result.schedule.fixtures.length,1);assert.notEqual(v.originals.stages.current.manifest.createdAt,v.originals.stages.archive.manifest.createdAt);assert.equal(v.originals.stages.current.files.has('result.json'),false);assert.equal(v.originals.stages.current.files.has('result-commitment.json'),true)
 v.originals.stages.current.result.schedule.fixtures.length=0;v.originals.stages.current.files.get('manifest.json').fill(0);assert.equal(api.getFussballBadenFreshPair(p).originals.stages.current.result.schedule.fixtures.length,1)
 for(const copy of [{...p},JSON.parse(JSON.stringify(p))])assert.throws(()=>api.getFussballBadenFreshPair(copy),/reader-issued/)
 const now=Date.now();t.mock.method(Date,'now',()=>now+25*3600_000);assert.throws(()=>api.getFussballBadenFreshPair(p),/expired/)
})
test('hosted pair refuses source identity, complete graph, runtime, CI and artifact drift',async t=>{
 const f=await fixture(t)
 for(const mode of ['head','actor','attempt','workflow','missingJob','unknownStep','runtime','CI','size','expired','budgetZIP'])await t.test(mode,async()=>{
  f.controls.change=(path,v,binary)=>{
   if(path===prefix+`actions/runs/${sourceRunId}`){if(mode==='head')return {...v,head_sha:'f'.repeat(40)};if(mode==='actor')return {...v,actor:{...actor,id:1}};if(mode==='attempt')return {...v,run_attempt:2}}
   if(mode==='workflow'&&path.endsWith('actions/workflows/preveri-baden-fresh-pair.yml'))return {...v,id:v.id+1}
   if(path.endsWith(`actions/runs/${sourceRunId}/attempts/1/jobs?per_page=100&page=1`)){if(mode==='missingJob')return {total_count:0,jobs:[]};if(mode==='unknownStep'){const x=structuredClone(v);x.jobs[0].steps.push({number:99,name:'TEST ONLY unknown executed source',status:'completed',conclusion:'success'});return x}}
   if(mode==='runtime'&&path.includes('/contents/package.json?'))return {...v,content:Buffer.from('{}').toString('base64')}
   if(mode==='CI'&&path.endsWith(`actions/runs/${ciId}`))return {...v,conclusion:'failure'}
   if(path.endsWith('actions/artifacts/721')){if(mode==='size')return {...v,size_in_bytes:profile.limits.pair.zip+1};if(mode==='expired')return {...v,expired:true}}
   if(mode==='budgetZIP'&&path.endsWith(`actions/artifacts/${pins.records[1].artifact.id}/zip`))return Buffer.from('TEST ONLY wrong historical bytes')
   return v
  }
  await assert.rejects(api.readFussballBadenFreshPair({sourceRunId,sourceHead,github:f.github}))
 });f.controls.change=undefined
})
test('hosted pair denies hash-consistent counterfeit commitments/attestation and unsafe ZIP members',async t=>{
 for(const mode of ['commitment','attestation','member','rawDigest'])await t.test(mode,async t=>{
  const f=await fixture(t)
  if(mode==='rawDigest')f.controls.change=(path,v,binary)=>path.endsWith('actions/artifacts/721/zip')?Buffer.from('bad ZIP'):v
  else if(mode==='attestation'){const raw=new Map([['fresh-pair-source-attestation.json',json({verified:true,nativeAdmission:true})]]);f.artifacts[1].bytes=zip(t,raw);f.artifacts[1].metadata.size_in_bytes=f.artifacts[1].bytes.length;f.artifacts[1].metadata.digest='sha256:'+sha(f.artifacts[1].bytes)}
  else{if(mode==='member')f.files.set('../outside.json',Buffer.from('{}'));else{const leaf=JSON.parse(f.files.get('current/result-commitment.json'));leaf.resultSha256='f'.repeat(64);f.files.set('current/result-commitment.json',json(leaf));const m=JSON.parse(f.files.get('current/manifest.json'));m.resultSha256=leaf.resultSha256;m.resultCommitmentSha256=sha(f.files.get('current/result-commitment.json'));f.files.set('current/manifest.json',json(m));const pair=JSON.parse(f.files.get('pair-manifest.json'));pair.stages.current=sha(f.files.get('current/manifest.json'));f.files.set('pair-manifest.json',json(pair))}
   // Foreign regular member avoids writing outside the temporary fixture tree.
   if(mode==='member'){f.files.delete('../outside.json');f.files.set('foreign.json',Buffer.from('{}'))}
   f.artifacts[0].bytes=zip(t,f.files);f.artifacts[0].metadata.size_in_bytes=f.artifacts[0].bytes.length;f.artifacts[0].metadata.digest='sha256:'+sha(f.artifacts[0].bytes)
  }
  await assert.rejects(api.readFussballBadenFreshPair({sourceRunId,sourceHead,github:f.github}),mode==='commitment'?/independent|commitment/:mode==='member'?/safe regular/:mode==='rawDigest'?/bytes\/digest/:/attestation/)
 })
})
test('hosted pair repeats actual mutable source/artifact metadata after replay before issuing private scope',async t=>{
 const f=await fixture(t);let reads=0
 f.controls.change=(path,v)=>path.endsWith(`actions/runs/${sourceRunId}`)&&++reads>1?{...v,run_attempt:2}:v
 await assert.rejects(api.readFussballBadenFreshPair({sourceRunId,sourceHead,github:f.github}),/late source/)
})
