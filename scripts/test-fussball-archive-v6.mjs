import test from 'node:test'
import assert from 'node:assert/strict'
const load=()=>import('./fussball-archive-v6.mjs')
test('V6 fixes archive-only1838/5000 budget and refuses new current requests',async()=>{
 const m=await load()
 assert.deepEqual(m.validateFussballV6Allowance({currentRequests:'0',archiveRequests:'3000'}),{priorRequests:1838,totalRequestCap:5000,currentRequests:0,archiveRequests:3000,cumulativeReserved:4838})
 for(const x of [{currentRequests:'1',archiveRequests:'1'},{currentRequests:'0',archiveRequests:'3001'},{currentRequests:'0',archiveRequests:'0'},{currentRequests:'0',archiveRequests:'01'}])assert.throws(()=>m.validateFussballV6Allowance(x))
})
test('V6 keeps the original current24h cutoff without rewriting dates',async()=>{
 const m=await load(),expiry=Date.parse('2026-10-29T06:06:59.785Z')
 assert.doesNotThrow(()=>m.assertFussballV6CurrentFresh(expiry))
 assert.throws(()=>m.assertFussballV6CurrentFresh(expiry+1),/stale/)
 assert.throws(()=>m.assertFussballV6CurrentFresh(Date.parse('2026-10-28T06:00:00Z')),/future/)
})
test('a serialized V6 proof grants no source or cache capability',async()=>{
 const m=await load();assert.throws(()=>m.getFussballV6Resources({preset:'baden-reviewed-archive-v6',priorRequests:1838}),/reader-issued/)
})
test('hosted V6 identity rejects current refetch, non-main and rewritten ledger',async()=>{
 const m=await import('./fussball-archive-v6-actions.mjs'),head='a'.repeat(40),e={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:'Lovro-splichal-orhanizagi/mnzgorenjska/.github/workflows/preveri-fussball-dopolni.yml@refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'999',GITHUB_SHA:head,EXPECTED_SHA:head,COMPLETION_PRESET:'baden-reviewed-archive-v6',COMPLETION_CURRENT_REQUESTS:'0',COMPLETION_ARCHIVE_REQUESTS:'3000'}
 assert.equal(m.validateFussballV6Hosted(e,{headSha:head}).priorRequests,1838)
 for(const change of [{GITHUB_REF:'refs/heads/test'},{COMPLETION_CURRENT_REQUESTS:'1'},{PRIOR_REQUESTS:'0'},{TOTAL_REQUEST_CAP:'6000'},{GITHUB_RUN_ATTEMPT:'2'}])assert.throws(()=>m.validateFussballV6Hosted({...e,...change},{headSha:head}))
})
import {readFileSync} from 'node:fs'
test('V6 workflow provides pinned frozen checkout, archive-only source and always preservation',()=>{
 const y=readFileSync(new URL('../.github/workflows/preveri-fussball-dopolni.yml',import.meta.url),'utf8')
 assert.match(y,/baden-reviewed-archive-v6/)
 assert.match(y,/ref: de77b661cbc11d95256a500e57c2fdea861a0647/)
 assert.match(y,/path: frozen-de77/)
 assert.match(y,/archive-continuation:/)
 assert.match(y,/fussball-archive-v6-actions\.mjs capture continuation-input frozen-de77 capture-archive-v6/)
 assert.match(y,/if: always\(\)[\s\S]*fussball-season-archive-v6-/)
 assert.equal((y.match(/inputs\.checkpoint_preset != 'baden-reviewed-archive-v6'/g)??[]).length,3)
})
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {unpackFussballV6Parent} from './dfb-artifacts.mjs'
const retained=process.env.FUSSBALL_V6_TEST_PARENTS,frozen=process.env.FUSSBALL_V6_TEST_FROZEN
// These tests consume genuine authenticated historical sources, with no source
// socket or database. The single-round variant is an explicit synthetic test.
test('genuine pair grants86 archive resources; real collector captures/replays a bounded source-only variant and retains failures',{skip:!retained||!frozen},async()=>{
 const m=await load(),parents=m.loadFussballV6Parents(retained),proof=m.readFussballArchiveContinuationV6({...parents,frozenDirectory:frozen}),resources=m.getFussballV6Resources(proof)
 assert.equal(resources.length,86);assert.equal(resources.filter(d=>d.kind==='css').length,43);assert.equal(resources.filter(d=>d.kind==='font').length,43)
 assert.ok(resources.every(d=>d.originalReceipt.capture.season==='2025/26'&&d.originalReceipt.capture.staffel==='02TGLSVQ1800000IVS5489BTVTLPPK10-G'))
 assert.ok(Object.isFrozen(proof.current),'nested source provenance is immutable');assert.equal(proof.priorRequests,1838);assert.equal(proof.current.createdAt,'2026-10-28T06:06:59.785Z');await exerciseHistory(m,proof)
 const policy=m.reviewedFussballArchiveV6(),files=unpackFussballV6Parent(parents.archive.zipBytes,policy.archive.artifactSha256,'archive'),manifest=JSON.parse(files.get('manifest.json')),seed=manifest.documents.find(d=>d.kind==='round'&&!/\/spieltag\/\d+\//.test(d.url))
 const original=files.get(seed.file).toString(),option=original.match(/<option[^>]*data-href="[^"]*\/spieltag\/30\/staffel\/[^>]*>30\. Spieltag<\/option>/)?.[0]
 assert.ok(option,'genuine selected30 option exists')
 let synthetic=original.replace(/(<select\b[^>]*name="spieltag"[^>]*>)[\s\S]*?(<\/select>)/,(_,a,b)=>a+option.replace('/spieltag/30/','/spieltag/1/').replace('30. Spieltag','1. Spieltag')+b)
 const table=synthetic.slice(synthetic.indexOf('<div class="fixtures-matches-table">')).match(/<table\b[^>]*>[\s\S]*?<\/table>/)[0]
 const tiny=table.replace(/(<tbody>)([\s\S]*?)(<\/tbody>)/,(_,a,body,b)=>a+[...body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(x=>x[0]).filter(row=>!row.includes('column-club')||row.includes('score-special')).join('')+b)
 synthetic=synthetic.replace(table,tiny)
 const scratch=mkdtempSync(join(tmpdir(),'slff-v6-focused-'));let clock=Date.now(),calls=[]
 try{
  const output=join(scratch,'success'),before=parents.current.zipBytes
  const captured=await m.captureFussballArchiveV6({directory:output,proof,maxRequests:3,now:()=>clock,sleep:async ms=>{clock+=ms},fetchFn:async url=>{calls.push(url);if(calls.length===1){const cause=Object.assign(new Error('reset'),{code:'ECONNRESET'});throw new TypeError('fetch failed',{cause})}assert.equal(url,policy.archive.options.seedUrl);return new Response(synthetic,{status:200,headers:{'content-type':'text/html; charset=UTF-8'}})}})
  assert.equal(captured.snapshot.requests,2);assert.equal(captured.snapshot.attempts[0].status,'failed');assert.ok(Date.parse(captured.snapshot.attempts[1].startedAt)-Date.parse(captured.snapshot.attempts[0].startedAt)>=6000)
  assert.deepEqual(calls,[policy.archive.options.seedUrl,policy.archive.options.seedUrl]);assert.ok(captured.documents.filter(d=>d.origin==='cache').every(d=>['css','font'].includes(d.kind)))
  assert.equal(captured.activationEligible,false);assert.ok(before.equals(parents.current.zipBytes))
  const verified=await m.verifyFussballArchiveV6({directory:output,parentDirectory:retained,frozenDirectory:frozen,now:clock+1000})
  assert.equal(verified.requests,2);assert.equal(verified.cumulativeRequests,1840);assert.equal(verified.nativeAdmission,false);assert.equal(verified.current.createdAt,proof.current.createdAt)
  assert.ok(verified.administrativeFixtures.length===1&&verified.administrativeFixtures[0].fixture.rezultat===null)
  const raw=readFileSync(join(output,'manifest.json'));const bad=JSON.parse(raw);bad.documents.find(d=>d.origin==='cache').originalReceipt.capture.codeSha256='0'.repeat(64);writeFileSync(join(output,'manifest.json'),JSON.stringify(bad)+'\n')
  await assert.rejects(m.verifyFussballArchiveV6({directory:output,parentDirectory:retained,frozenDirectory:frozen,now:clock+1000}),/receipt differs/);writeFileSync(join(output,'manifest.json'),raw)
  calls=[];const partial=join(scratch,'partial')
  await assert.rejects(m.captureFussballArchiveV6({directory:partial,proof,maxRequests:1,now:()=>clock,sleep:async ms=>{clock+=ms},fetchFn:async url=>{calls.push(url);assert.equal(url,policy.archive.options.seedUrl);return new Response(original,{status:200,headers:{'content-type':'text/html'}})}}),/budget exhausted/)
  const failed=JSON.parse(readFileSync(join(partial,'manifest.json')));assert.equal(failed.success,false);assert.equal(failed.snapshot.requests,1);assert.equal(failed.resultSha256,null);assert.equal(failed.checkpoint.proof.priorRequests,1838);assert.equal(calls.length,1)
  const terminal=join(scratch,'terminal')
  await assert.rejects(m.captureFussballArchiveV6({directory:terminal,proof,maxRequests:1,now:()=>clock,sleep:async ms=>{clock+=ms},fetchFn:async()=>{throw new TypeError('fetch failed',{cause:Object.assign(new Error('reset'),{code:'ECONNRESET'})})}}),/fetch failed/)
  const stopped=JSON.parse(readFileSync(join(terminal,'manifest.json')));assert.equal(stopped.success,false);assert.equal(stopped.snapshot.requests,1);assert.equal(stopped.snapshot.attempts[0].status,'failed');assert.equal(stopped.snapshot.attempts[0].error,'connect failure');assert.equal(stopped.error,'fetch failed');assert.equal(stopped.documents.length,0);assert.ok(stopped.snapshot.attempts[0].transportFailure)
 }finally{rmSync(scratch,{recursive:true,force:true})}
 const corrupted={...parents.archive,zipBytes:Buffer.from(parents.archive.zipBytes)};corrupted.zipBytes[0]^=1
 assert.throws(()=>m.readFussballArchiveContinuationV6({...parents,archive:corrupted,frozenDirectory:frozen}),/ZIP identity/)
})
async function exerciseHistory(m,proof){
 const actions=await import('./fussball-archive-v6-actions.mjs'),history=Object.values(m.getFussballV6History(proof)),head='a'.repeat(40),policy=m.reviewedFussballArchiveV6(),runId=99999999999
 const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:policy.repository,GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:`${policy.repository}/${policy.workflow}@refs/heads/main`,GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:String(runId),GITHUB_SHA:head,EXPECTED_SHA:head,COMPLETION_PRESET:policy.preset,COMPLETION_CURRENT_REQUESTS:'0',COMPLETION_ARCHIVE_REQUESTS:'3000',GITHUB_JOB:'archive-continuation'}
 const own={id:runId,head_sha:head,head_branch:'main',path:policy.workflow,event:'workflow_dispatch',run_attempt:1,status:'in_progress',conclusion:null,created_at:new Date().toISOString(),repository:{full_name:policy.repository},head_repository:{full_name:policy.repository}}
 const ownJobs={total_count:4,jobs:['capture','archive','handoff','archive-continuation'].map((name,i)=>({id:runId+i+1,run_id:runId,run_attempt:1,head_sha:head,name,status:name==='archive-continuation'?'in_progress':'completed',conclusion:name==='archive-continuation'?null:'skipped',steps:name==='archive-continuation'?[{name:actions.V6_FROZEN_AUTH_STEP,status:'completed',conclusion:'success'},{name:actions.V6_ARCHIVE_SOURCE_STEP,status:'in_progress',conclusion:null}]:[]}))}
 const known=new Map(history.map(x=>[x.run.id,x])),artifacts=new Map(history.map(x=>[x.artifact.id,x.artifact]));let missing=false,unknown=false,authFailure=false,extraV6=false
 const extra={...own,id:runId-1,status:'completed',conclusion:'failure'},api=async path=>{
  if(path==='commits/main')return {sha:head}
  if(path.startsWith('actions/workflows/')){const rows=[own,...[...known.values()].map(x=>x.run),...(unknown?[extra]:[])];if(missing)rows.pop();return {total_count:rows.length,workflow_runs:rows}}
  const a=path.match(/^actions\/artifacts\/(\d+)$/);if(a)return structuredClone(artifacts.get(Number(a[1])))
  const r=path.match(/^actions\/runs\/(\d+)(.*)$/);assert.ok(r,'only bounded known GET APIs');const id=Number(r[1])
  if(r[2]==='')return structuredClone(id===runId?own:id===extra.id?extra:known.get(id).run)
  if(id===runId){const j=structuredClone(ownJobs);if(authFailure)j.jobs.at(-1).steps[0].conclusion='failure';return j}
  if(id===extra.id&&extraV6){const j=structuredClone(ownJobs);for(const job of j.jobs){job.run_id=extra.id;job.status='completed';if(job.name==='archive-continuation'){job.conclusion='failure';job.steps.at(-1).status='completed';job.steps.at(-1).conclusion='failure'}}return j}
  if(id===extra.id)return {total_count:3,jobs:['capture','archive','handoff'].map((name,i)=>({id:id+i+100,run_id:id,run_attempt:1,head_sha:head,name,status:'completed',conclusion:name==='capture'?'failure':'skipped',steps:name==='capture'?[{name:'Capture fresh rounds and missing originals without database credentials',status:'completed',conclusion:'failure'}]:[]}))}
  return structuredClone(known.get(id).jobs)
 }
 assert.equal((await actions.assertFussballV6Unspent({env,headSha:head,proof,api})).priorRequests,1838)
 missing=true;await assert.rejects(actions.assertFussballV6Unspent({env,headSha:head,proof,api}),/five consumed/);missing=false
 authFailure=true;await assert.rejects(actions.assertFussballV6Unspent({env,headSha:head,proof,api}),/critical step/);authFailure=false
 unknown=true;await assert.rejects(actions.assertFussballV6Unspent({env,headSha:head,proof,api}),/unaccounted source-started/)
 extraV6=true;await assert.rejects(actions.assertFussballV6Unspent({env,headSha:head,proof,api}),/unaccounted source-started/)
}
test('new schema6 archive has separately bounded large-result readback; old parent limits stay fixed',async()=>{
 const m=await load(),p=m.reviewedFussballArchiveV6();assert.deepEqual(p.archiveLimits,{compressedBytes:100*1024*1024,resultBytes:384*1024*1024,expandedBytes:1024*1024*1024})
 const artifacts=await import('./dfb-artifacts.mjs');assert.equal(typeof artifacts.unpackFussballV6Archive,'function')
 assert.throws(()=>artifacts.unpackFussballV6Archive(Buffer.from('invalid'),'sha256:'+'0'.repeat(64)),/identity/)
})
import {execFileSync} from 'node:child_process'
import {sha256,unpackFussballV6Archive} from './dfb-artifacts.mjs'
test('new archive extractor admits a result beyond the old72MiB cap but rejects duplicate, unsafe and symlink members',()=>{
 const build=mode=>execFileSync('python3',['-c',`import io,zipfile,sys,stat,warnings
warnings.simplefilter('ignore')
b=io.BytesIO()
with zipfile.ZipFile(b,'w',compression=zipfile.ZIP_DEFLATED) as z:
 if sys.argv[1]=='large':
  i=zipfile.ZipInfo('result.json');i.compress_type=zipfile.ZIP_DEFLATED;i.external_attr=(stat.S_IFREG|0o644)<<16;z.writestr(i,b'0'*(72*1024*1024+1))
 elif sys.argv[1]=='duplicate':
  z.writestr('manifest.json','{}');z.writestr('manifest.json','{}')
 elif sys.argv[1]=='unsafe':z.writestr('../manifest.json','{}')
 else:
  i=zipfile.ZipInfo('manifest.json');i.create_system=3;i.external_attr=(stat.S_IFLNK|0o777)<<16;z.writestr(i,'target')
sys.stdout.buffer.write(b.getvalue())`,mode],{maxBuffer:100*1024*1024})
 const large=build('large');assert.equal(unpackFussballV6Archive(large,'sha256:'+sha256(large)).get('result.json').length,72*1024*1024+1)
 for(const mode of ['duplicate','unsafe','symlink']){const b=build(mode);assert.throws(()=>unpackFussballV6Archive(b,'sha256:'+sha256(b)),/inventory|unsafe|regular/)}
})
