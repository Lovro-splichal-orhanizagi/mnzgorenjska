import test from 'node:test'
import assert from 'node:assert/strict'
test('native V7 bridge requires a distinct private completed-source capability',async()=>{
 const api=await import('./fussball-completed-source-v7.mjs')
 assert.equal(typeof api.readFussballCompletedSourceV7,'function');assert.equal(typeof api.getFussballCompletedSourceV7,'function')
 assert.throws(()=>api.getFussballCompletedSourceV7({sourceOnly:true}),/reader-issued/)
})
import * as fs from 'node:fs'
import {join,dirname,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual as same} from 'node:util'
import {zaprtje} from './odtis-kode.mjs'
import {sha256,unpackFussballV6Archive,unpackFussballV6Parent} from './dfb-artifacts.mjs'
import {fussballCaptureCodeSha256} from './fussball-capture-evidence.mjs'
import {reviewedFussballArchiveV7,fussballArchiveV7CodeSha256} from './fussball-archive-v7.mjs'
import {assertFussballV6CurrentFresh} from './fussball-archive-v6.mjs'
import {V7_FROZEN_AUTH_STEP,V7_ARCHIVE_SOURCE_STEP} from './fussball-archive-v7-actions.mjs'
import {zip} from './fussball-native-composition-test-fixture.mjs'
const json=v=>Buffer.from(JSON.stringify(v)+'\n'),repo='Lovro-splichal-orhanizagi/mnzgorenjska',prefix=`repos/${repo}/`,sourceRunId='98888888888',head='e'.repeat(40)
function synthetic(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'completed-source7-TEST-ONLY-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));for(const name of ['de77','four-e'])fs.mkdirSync(join(root,name))
 const start=Date.now()-30000,stamp=n=>new Date(start+n*1000).toISOString(),policy=reviewedFussballArchiveV7(),controls={},calls=[]
 const run={id:Number(sourceRunId),run_attempt:1,status:'completed',conclusion:'success',head_sha:head,head_branch:'main',event:'workflow_dispatch',path:policy.workflow,repository:{full_name:repo},head_repository:{full_name:repo},created_at:stamp(0),updated_at:stamp(20)}
 const names=['Validate exact archive-only V7 scope and1952 spent budget','Focused offline V7 boundary checks',V7_FROZEN_AUTH_STEP,'Exercise genuine V7 ledger and resource boundaries offline','Share host pacing immediately before V7 source guard',V7_ARCHIVE_SOURCE_STEP,'Reauthenticate V7 detached originals and replay without network','Preserve V7 originals and every counted partial attempt','Preserve V7 source-only attestation separately']
 const job={id:9001,run_id:run.id,run_attempt:1,head_sha:head,name:'archive-continuation',status:'completed',conclusion:'success',started_at:stamp(0),completed_at:stamp(20),steps:names.map((name,i)=>({name,status:'completed',conclusion:'success',started_at:stamp(i+1),completed_at:stamp(i+2)}))},jobs={total_count:4,jobs:[...['capture','archive','handoff'].map((name,i)=>({id:9010+i,run_id:run.id,run_attempt:1,head_sha:head,name,status:'completed',conclusion:'skipped',steps:[]})),job]}
 const manifest={version:7,success:true,error:null,codeSha256:fussballArchiveV7CodeSha256(),createdAt:stamp(6),completedAt:stamp(7),checkpoint:{version:6,proof:{priorRequests:1952,currentRequests:0,totalRequestCap:5000,failedV6:{runId:policy.failedV6.runId}}}},result={version:1,activationEligible:false,TEST_ONLY_SYNTHETIC_SOURCE:true},verified={verified:true,sourceOnly:true,activationEligible:false,nativeAdmission:false,requests:3,priorRequests:1952,cumulativeRequests:1955,totalRequestCap:5000,resultSha256:sha256(json(result)),codeSha256:fussballArchiveV7CodeSha256(),current:{createdAt:policy.current.createdAt},administrativeFixtures:[]}
 let archiveZip,attZip,artifact,att,inventory
 function repack(){archiveZip=zip(new Map([['manifest.json',json(manifest)],['result.json',json(result)]]));attZip=zip(new Map([['archive-v7-source-attestation.json',json(controls.attestation??verified)]]));artifact={id:9020,name:`fussball-season-archive-v7-${sourceRunId}`,expired:false,size_in_bytes:archiveZip.length,digest:'sha256:'+sha256(archiveZip),workflow_run:{id:run.id,head_sha:head,head_branch:'main'},created_at:stamp(8),updated_at:stamp(9)};att={...artifact,id:9021,name:`fussball-archive-v7-source-attestation-${sourceRunId}`,size_in_bytes:attZip.length,digest:'sha256:'+sha256(attZip),created_at:stamp(9),updated_at:stamp(10)};inventory={total_count:2,artifacts:[artifact,att]}}
 repack();let replays=0
 const path=new URL('./fussball-completed-source-v7.mjs',import.meta.url),code=fs.readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {readFussballCompletedSourceV7,getFussballCompletedSourceV7,reauthenticateFussballCompletedSourceV7,fussballCompletedV7RuntimeInventory};'
 const deps={readFileSync:fs.readFileSync,mkdtempSync:fs.mkdtempSync,mkdirSync:fs.mkdirSync,writeFileSync:fs.writeFileSync,rmSync:fs.rmSync,realpathSync:fs.realpathSync,join,dirname,tmpdir,execFileSync,same,zaprtje,sha256,unpackFussballV6Archive,unpackFussballV6Parent:()=>new Map([['manifest.json',json({TEST_ONLY_CURRENT:true})],['result.json',json({TEST_ONLY_CURRENT:true})]]),fussballCaptureCodeSha256,reviewedFussballArchiveV7,fussballArchiveV7CodeSha256,assertFussballV6CurrentFresh,verifyFussballArchiveV7:async options=>{replays++;assert.equal(options.frozenDirectory,join(root,'de77'));assert.equal(options.v6FrozenDirectory,join(root,'four-e'));assert.ok(fs.existsSync(join(options.failedDirectory,'archive.zip')));if(controls.replayFailure)throw Error('TEST ONLY failed actual1952/cache/source replay');return structuredClone(verified)},V7_FROZEN_AUTH_STEP,V7_ARCHIVE_SOURCE_STEP}
 const api=new Function(...Object.keys(deps),code)(...Object.values(deps))
 const github=async(path,binary=false)=>{calls.push(path);let v;assert.ok(path.startsWith(prefix));const p=path.slice(prefix.length)
  if(p===`actions/runs/${sourceRunId}`)v=run;else if(p===`actions/runs/${sourceRunId}/attempts/1/jobs?per_page=100`)v=jobs;else if(p===`actions/runs/${sourceRunId}/artifacts?per_page=100`)v=inventory
  else if(p===`actions/artifacts/${artifact.id}`)v=artifact;else if(p===`actions/artifacts/${artifact.id}/zip`)v=archiveZip;else if(p===`actions/artifacts/${att.id}`)v=att;else if(p===`actions/artifacts/${att.id}/zip`)v=attZip
  else if(p.startsWith('contents/')){const file=p.slice(9).split('?')[0],bytes=fs.readFileSync(new URL('../'+file,import.meta.url));v={type:'file',path:file,size:bytes.length,encoding:'base64',content:bytes.toString('base64')}}
  else if(p.endsWith('/zip')&&binary)v=Buffer.from('TEST ONLY parent replay delegated, never genuine authority')
  else if(p.startsWith('actions/runs/')||p.startsWith('actions/artifacts/'))v={TEST_ONLY:'old frozen authority delegated to verifier boundary'}
  else throw Error('unexpected TEST ONLY GET '+p)
  v=controls.change?.(p,v,binary)??v;return Buffer.isBuffer(v)?Buffer.from(v):structuredClone(v)
 }
 return {api,input:{sourceRunId,frozenDirectory:join(root,'de77'),v6FrozenDirectory:join(root,'four-e'),github},controls,calls,run,jobs,manifest,result,verified,repack,get replays(){return replays}}
}
test('TEST ONLY synthetic successful schema7 hosted chain retains private source-only authority and exact original current clock',async t=>{
 const f=synthetic(t),p=await f.api.readFussballCompletedSourceV7(f.input);assert.equal(p.kind,'authenticated-completed-fussball-v7-source');assert.equal(p.source.priorRequests,1952);assert.equal(p.source.cumulativeRequests,1955);assert.equal(p.source.currentCreatedAt,'2026-10-28T06:06:59.785Z');assert.equal(p.source.currentFreshUntil,'2026-10-29T06:06:59.785Z');assert.equal(p.source.currentCodeSha256,reviewedFussballArchiveV7().sourceCodeSha256);assert.equal(p.source.sourceHead,head);assert.equal(p.source.nativeEligible,false);assert.equal(f.replays,1)
 assert.throws(()=>f.api.getFussballCompletedSourceV7({...p}),/reader-issued/);const view=f.api.getFussballCompletedSourceV7(p);view.originals.stages.archive.files.get('result.json')[0]^=1;view.certificate.attestation.verified=false;assert.equal(f.api.getFussballCompletedSourceV7(p).certificate.attestation.verified,true)
 await f.api.reauthenticateFussballCompletedSourceV7(p);assert.equal(f.replays,2)
})
for(const [name,mutate]of [
 ['failed old execution',f=>f.run.conclusion='failure'],['rerun',f=>f.run.run_attempt=2],['wrong source workflow',f=>f.run.path='other.yml'],['missing source critical step',f=>f.jobs.jobs.at(-1).steps.pop()],['missing parent authentication',f=>f.jobs.jobs.at(-1).steps[2].conclusion='skipped'],['schema6',f=>{f.manifest.version=6;f.repack()}],['checkpoint5',f=>{f.manifest.checkpoint.version=5;f.repack()}],['unaccounted114',f=>{f.verified.priorRequests=1838;f.repack()}],['count exceeds reviewed3000',f=>{f.verified.requests=3001;f.verified.cumulativeRequests=4953;f.repack()}],['incomplete or cache drift',f=>f.controls.replayFailure=true],['attestation drift',f=>{f.controls.attestation={...f.verified,requests:4};f.repack()}],['artifact byte drift',f=>f.controls.change=(p,v,b)=>p===`actions/artifacts/9020/zip`?Buffer.from('changed'):v],['producer drift',f=>f.controls.change=(p,v)=>p.startsWith('contents/')?{...v,content:Buffer.from('changed').toString('base64')}:v]
])test('TEST ONLY hosted source7 refuses '+name,async t=>{const f=synthetic(t);mutate(f);await assert.rejects(f.api.readFussballCompletedSourceV7(f.input))})
test('source7 rejects public clocks, old failed run IDs and source6 receipts without network access',async()=>{
 const api=await import('./fussball-completed-source-v7.mjs');let calls=0;const input={sourceRunId:'999',frozenDirectory:'unused',v6FrozenDirectory:'unused',github:async()=>calls++}
 for(const change of [{now:0},{requireFresh:false},{sourceRunId:'40694431918'},{sourceRunId:'40641606028'},{v6FrozenDirectory:null}])await assert.rejects(api.readFussballCompletedSourceV7({...input,...change}));assert.equal(calls,0)
})
// Real private1952 authority and raw ZIP boundary; only the new hosted execution
// and its one-HTML source response are TEST ONLY. No source request is made.
const genuineEnabled=Boolean(process.env.FUSSBALL_V7_TEST_INPUT&&process.env.FUSSBALL_V7_TEST_DE77&&process.env.FUSSBALL_V7_TEST_V6&&process.env.FUSSBALL_V7_TEST_FAILED)
test('TEST ONLY hosted success authenticates genuine failed1952 parents through real schema7 replay', {skip:!genuineEnabled},async t=>{
 const m=await import('./fussball-archive-v7.mjs'),api=await import('./fussball-completed-source-v7.mjs'),authority={parentDirectory:fs.realpathSync(process.env.FUSSBALL_V7_TEST_INPUT),frozenDirectory:fs.realpathSync(process.env.FUSSBALL_V7_TEST_DE77),v6FrozenDirectory:fs.realpathSync(process.env.FUSSBALL_V7_TEST_V6),failedDirectory:fs.realpathSync(process.env.FUSSBALL_V7_TEST_FAILED)},p=m.readFussballArchiveContinuationV7(authority),policy=m.reviewedFussballArchiveV7()
 assert.equal(p.priorRequests,1952);assert.equal(new Set(Object.values(m.getFussballV7History(p)).map(x=>x.run.id)).size,6)
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'bridge7-genuine1952-TEST-ONLY-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}))
 const body=fs.readFileSync(new URL('./vzorci/de-fussball-confirmed-w-40694431918/28b752208241779ae14554aac3475818a3183f65ad994c7b6504e4b7d646ca07.html',import.meta.url),'utf8'),opt=body.match(/<option[^>]*data-href="[^"]*\/spieltag\/29\/staffel\/[^>]*>29\. Spieltag<\/option>/)?.[0];assert.ok(opt)
 let tiny=body.replace(/(<select\b[^>]*name="spieltag"[^>]*>)[\s\S]*?(<\/select>)/,(_,a,b)=>a+opt.replace('/spieltag/29/','/spieltag/1/').replace('29. Spieltag','1. Spieltag')+b),table=tiny.slice(tiny.indexOf('<div class="fixtures-matches-table">')).match(/<table\b[^>]*>[\s\S]*?<\/table>/)[0]
 tiny=tiny.replace(table,table.replace(/(<tbody>)([\s\S]*?)(<\/tbody>)/,(_,a,b,c)=>a+[...b.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(x=>x[0]).filter(r=>!r.includes('column-club')||r.includes('score-special')).join('')+c))
 let calls=0;t.mock.method(globalThis,'fetch',async url=>{calls++;assert.equal(url,policy.archive.options.seedUrl);return new Response(tiny,{status:200,headers:{'content-type':'text/html'}})})
 const directory=join(root,'archive');await m.captureFussballArchiveV7({directory,proof:p,maxRequests:1});const verified=await m.verifyFussballArchiveV7({directory,...authority});assert.equal(calls,1);assert.equal(verified.cumulativeRequests,1953)
 const manifest=JSON.parse(fs.readFileSync(join(directory,'manifest.json'))),all=fs.readdirSync(directory,{recursive:true,withFileTypes:true}).filter(x=>x.isFile()).map(x=>join(x.parentPath??x.path,x.name).slice(directory.length+1));execFileSync('zip',['-q','-0',join(root,'archive.zip'),...all],{cwd:directory});const bytes=fs.readFileSync(join(root,'archive.zip')),attBytes=zip(new Map([['archive-v7-source-attestation.json',json(verified)]]))
 const f=synthetic(t),run=f.run,jobs=f.jobs,job=jobs.jobs.at(-1),start=Date.parse(manifest.createdAt)-1000,completed=Date.parse(manifest.completedAt),finish=Date.now(),at=x=>new Date(x).toISOString()
 run.created_at=at(start);run.updated_at=at(finish);job.started_at=at(start);job.completed_at=at(finish)
 job.steps.forEach((s,i)=>{s.started_at=at(i<5?start:i===5?Date.parse(manifest.createdAt):completed);s.completed_at=at(i<5?start:i===5?completed:finish)})
 // Ordered synthetic critical-step timestamps around the actual local capture.
 for(let i=6;i<9;i++)job.steps[i].started_at=job.steps[i].completed_at=at(finish)
 const a={id:9020,name:`fussball-season-archive-v7-${sourceRunId}`,expired:false,size_in_bytes:bytes.length,digest:'sha256:'+sha256(bytes),workflow_run:{id:run.id,head_sha:head,head_branch:'main'},created_at:at(finish),updated_at:at(finish)},att={...a,id:9021,name:`fussball-archive-v7-source-attestation-${sourceRunId}`,size_in_bytes:attBytes.length,digest:'sha256:'+sha256(attBytes)},inventory={total_count:2,artifacts:[a,att]},raw=new Map()
 for(const stage of ['current','archive']){const base=join(authority.parentDirectory,'parents',`${policy.sourceRunId}-${stage}`),v=JSON.parse(fs.readFileSync(base+'.json'));raw.set(`actions/runs/${policy.sourceRunId}`,v.run);raw.set(`actions/runs/${policy.sourceRunId}/attempts/1/jobs?per_page=100`,v.jobs);raw.set(`actions/artifacts/${v.artifact.id}`,v.artifact);raw.set(`actions/artifacts/${v.artifact.id}/zip`,fs.readFileSync(base+'.zip'))}
 for(const [key,file]of [['run','terminal-run.json'],['jobs','terminal-jobs.json'],['artifact','archive-metadata.json']]){const v=JSON.parse(fs.readFileSync(join(authority.failedDirectory,file)));raw.set(key==='run'?`actions/runs/${policy.failedV6.runId}`:key==='jobs'?`actions/runs/${policy.failedV6.runId}/attempts/1/jobs?per_page=100`:`actions/artifacts/${policy.failedV6.artifactId}`,v)}raw.set(`actions/artifacts/${policy.failedV6.artifactId}/zip`,fs.readFileSync(join(authority.failedDirectory,'archive.zip')))
 for(const [path,v]of [[`actions/runs/${sourceRunId}`,run],[`actions/runs/${sourceRunId}/attempts/1/jobs?per_page=100`,jobs],[`actions/runs/${sourceRunId}/artifacts?per_page=100`,inventory],['actions/artifacts/9020',a],['actions/artifacts/9020/zip',bytes],['actions/artifacts/9021',att],['actions/artifacts/9021/zip',attBytes]])raw.set(path,v)
 const github=async(path,binary)=>{assert.ok(path.startsWith(prefix));const key=path.slice(prefix.length);if(raw.has(key)){const v=raw.get(key);return Buffer.isBuffer(v)?Buffer.from(v):structuredClone(v)}assert.ok(key.startsWith('contents/'));const file=key.slice(9).split('?')[0],b=fs.readFileSync(new URL('../'+file,import.meta.url));return {type:'file',path:file,size:b.length,encoding:'base64',content:b.toString('base64')}}
 const cap=await api.readFussballCompletedSourceV7({sourceRunId,frozenDirectory:authority.frozenDirectory,v6FrozenDirectory:authority.v6FrozenDirectory,github}),view=api.getFussballCompletedSourceV7(cap)
 assert.equal(cap.source.priorRequests,1952);assert.equal(cap.source.cumulativeRequests,1953);assert.equal(cap.source.currentCreatedAt,'2026-10-28T06:06:59.785Z');assert.equal(view.originals.stages.archive.manifest.version,7);assert.equal(view.originals.stages.archive.result.administrativeFixtures[0].fixture.administrativeResult.rawMarker,'w');assert.equal(cap.nativeAdmission,false);assert.equal(calls,1)
})

test('actual default current-source freshness expires at original clock without GET or caller waiver',async t=>{
 const api=await import('./fussball-completed-source-v7.mjs');let calls=0;t.mock.method(Date,'now',()=>Date.parse('2026-10-29T06:06:59.786Z'))
 await assert.rejects(api.readFussballCompletedSourceV7({sourceRunId,frozenDirectory:'unused',v6FrozenDirectory:'unused',github:async()=>calls++}),/fresh|24|current|stale/i);assert.equal(calls,0)
})
