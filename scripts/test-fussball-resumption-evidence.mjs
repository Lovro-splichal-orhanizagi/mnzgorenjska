// Genuine failed outer/embedded parent bytes; injected NEW requests/collector
// are TEST ONLY transport controls, never a complete season or native witness.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {runInNewContext} from 'node:vm'
import {captureFussballDirectory,verifyFussballDirectory} from './fussball-capture-evidence.mjs'
import * as checkpoint from './fussball-checkpoint.mjs'
import {inspectFussballPage,fussballFontUrl} from './viri/fussball-discovery.mjs'
import {inspectFussballLineup,razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
const evidenceDir=process.env.FUSSBALL_RESUMPTION_EVIDENCE_DIR
const actual={skip:evidenceDir?false:'Explicit genuine outer/embedded checkpoint bytes required; no live source success claimed'}
const runs=['40416972177','40509926697','40531709101'],outer='40566792786',preset='baden-reviewed-transports-v2'
const sha=b=>createHash('sha256').update(b).digest('hex'),json=b=>JSON.parse(b),copy=x=>structuredClone(x)
const seedUrl='https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2627-baden/-/staffel/03188V27L800000JVS5489BTVU7GTVLE-G'
const options={seedUrl,staffel:'03188V27L800000JVS5489BTVU7GTVLE-G',season:'2026/27',maxRequests:788,reportLimit:null,cardPolicy:'community-v1'}
const roundBytes=Buffer.from('<html><body>TEST ONLY SYNTHETIC fresh schedule transport; no source/calendar admission</body></html>')
const conflicts=['031DS4G7UK000000VS5489BUVUR5FS5A','031DS4G74K000000VS5489BUVUR5FS5A']
let saved
function genuine(){
 if(saved)return saved
 assert.equal(typeof checkpoint.readFussballTransportResumption,'function','new authenticated outer resumption reader required')
 const path=join(evidenceDir,'source.zip'),read=name=>readFileSync(join(evidenceDir,name)),member=name=>execFileSync('unzip',['-p',path,name],{maxBuffer:100*1024*1024})
 const parent={run:json(read('run.json')),artifact:json(read('artifact.json')),jobs:json(read('jobs.json')),zipBytes:read('source.zip')},now=Date.parse('2026-10-28T00:00:00Z')
 const proof=checkpoint.readFussballTransportResumption({parent,now}),parents=runs.map(id=>({...json(member(`checkpoint/parents/${id}.json`)),zipBytes:member(`checkpoint/parents/${id}.zip`)})),old=checkpoint.readFussballTransportCheckpoint({parents,now}),manifest=json(member('manifest.json'))
 const outerDocs=manifest.documents.map(d=>({...d,bytes:member(d.file)}))
 saved={parent,proof,parents,old,docs:checkpoint.getFussballCheckpointDocuments(proof),oldDocs:checkpoint.getFussballCheckpointDocuments(old),outerDocs};return saved
}
function temporary(t){const base=mkdtempSync(join(tmpdir(),'fussball-resumption-'));t.after(()=>rmSync(base,{recursive:true,force:true}));return join(base,'capture')}
function fakeClock(t){let clock=Date.now();t.mock.method(Date,'now',()=>clock);t.mock.method(globalThis,'setTimeout',(fn,ms)=>{clock+=ms;queueMicrotask(fn);return 1})}
const collector=(docs=[])=>async({client,...o})=>{
 const round=await client.read(o.seedUrl,'round');assert.deepEqual(Buffer.from(round.bytes),roundBytes)
 for(const d of docs){const actual=await client.read(d.url,d.kind);assert.deepEqual(Buffer.from(actual.bytes),Buffer.from(d.bytes))}
 return {version:1,testOnlySynthetic:true,scope:{provider:'fussball',seedUrl:o.seedUrl,staffel:o.staffel,season:o.season},coverage:{sampled:true},activationEligible:false}
}
async function captured(t,{version=2,all=false,extraPairs=false}={}){
 const f=genuine(),directory=temporary(t),proof=version===2?f.proof:f.old,docs=all?(version===2?f.docs:f.oldDocs):[],pairs=extraPairs?f.outerDocs.filter(d=>['report','lineup'].includes(d.kind)&&conflicts.some(id=>d.url.includes(id))):[]
 const traversal=[...docs,...pairs],bodies=new Map([[seedUrl,{bytes:roundBytes,contentType:'text/html'}],...traversal.map(d=>[d.url,d])]),calls=[],collectFn=collector(traversal)
 const manifest=await captureFussballDirectory({directory,options:{...options,maxRequests:version===2?788:886},completionProof:proof,collectFn,fetchFn:async url=>{calls.push(url);const d=bodies.get(url);assert.ok(d,'unplanned TEST ONLY source request '+url);return new Response(d.bytes,{headers:{'content-type':d.contentType}})}})
 return {...f,directory,manifest,calls,collectFn,proof,traversal}
}
const writeManifest=(directory,m)=>writeFileSync(join(directory,'manifest.json'),JSON.stringify(m)+'\n')

test('forged or copied public resumption assertions cannot authorize cache/source or create output',async t=>{
 for(const completionProof of [{preset,priorRequests:1212,totalRequestCap:5000},{preset,verified:true,documentsCount:631}]){
  const directory=temporary(t);let calls=0
  await assert.rejects(()=>captureFussballDirectory({directory,options,completionProof,collectFn:collector(),fetchFn:async()=>{calls++;throw Error('source forbidden')}}),/checkpoint|reader|proof/)
  assert.equal(calls,0);assert.equal(existsSync(directory),false)
 }
})

test('capture code fingerprint seals the new fixed resumption registry bytes',()=>{
 const source=readFileSync(new URL('./fussball-capture-evidence.mjs',import.meta.url),'utf8'),start=source.indexOf('export function fussballCaptureCodeSha256(){'),end=source.indexOf('\nexport function validateFussballCaptureOptions',start)
 assert.ok(start>=0&&end>start);let changed=false,reads=0
 // Run the actual exported hash function with local-only fixture bytes. The
 // recursive JS closure is a separate concern; this isolates policy-byte seal.
 const fingerprint=runInNewContext(source.slice(start,end).replace('export ','')+';fussballCaptureCodeSha256',{hash:sha,root:'/TEST_ONLY_ROOT',resolve,zaprtje:()=>[],readFileSync:path=>{if(path.endsWith('/policies/fussball-transport-resumption.json')){reads++;return Buffer.from(changed?'TEST ONLY registry revision2':'TEST ONLY registry revision1')}return Buffer.from('TEST ONLY unchanged '+path)}})
 const original=fingerprint();changed=true;assert.notEqual(fingerprint(),original);assert.equal(reads,2)
})

test('v2 persists one actual raw parent and replays its reader-issued1212 proof, without freshening originals',actual,async t=>{
 fakeClock(t);const f=await captured(t)
 assert.equal(f.manifest.version,4);assert.equal(f.manifest.checkpoint.version,2);assert.deepEqual(f.calls,[seedUrl]);assert.equal(f.manifest.snapshot.requests,1)
 assert.deepEqual(f.manifest.checkpoint.proof,f.proof);assert.equal(f.proof.documentsCount,631);assert.equal(f.proof.priorRequests,1212);assert.equal(f.proof.totalRequestCap,5000)
 assert.deepEqual(f.manifest.checkpoint.parentFiles,[{runId:outer,metadataFile:`checkpoint/parents/${outer}.json`,zipFile:`checkpoint/parents/${outer}.zip`}])
 assert.deepEqual(readFileSync(join(f.directory,f.manifest.checkpoint.parentFiles[0].zipFile)),f.parent.zipBytes)
 assert.deepEqual(json(readFileSync(join(f.directory,f.manifest.checkpoint.parentFiles[0].metadataFile))),{run:f.parent.run,artifact:f.parent.artifact,jobs:f.parent.jobs})
 assert.equal(f.proof.parents.length,1);assert.ok(f.docs.every(d=>d.kind!=='round'&&!conflicts.some(id=>d.url.includes(id))))
 const verified=await verifyFussballDirectory(f.directory,{collectFn:f.collectFn});assert.equal(verified.checkpointPreset,preset);assert.equal(verified.priorRequests,1212);assert.equal(verified.activationEligible,false)
 const sourceCalls=f.calls.length;await assert.rejects(()=>captureFussballDirectory({directory:temporary(t),options,completionProof:copy(f.proof),collectFn:f.collectFn,fetchFn:async()=>{f.calls.push('FORBIDDEN')}}),/checkpoint|reader/);assert.equal(f.calls.length,sourceCalls)
})
test('v1 remains triple-parent1114 with its unchanged886 limit and payload version1',actual,async t=>{
 fakeClock(t);const f=await captured(t,{version:1})
 assert.equal(f.manifest.version,4);assert.equal(f.manifest.checkpoint.version,1);assert.equal(f.manifest.checkpoint.proof.priorRequests,1114);assert.equal(f.manifest.checkpoint.proof.documentsCount,572);assert.deepEqual(f.manifest.checkpoint.parentFiles.map(p=>p.runId),runs)
 const verified=await verifyFussballDirectory(f.directory,{collectFn:f.collectFn});assert.equal(verified.priorRequests,1114);assert.equal(verified.checkpointPreset,'baden-reviewed-transports-v1')
 for(const [proof,maxRequests]of [[f.proof,887],[genuine().proof,789]]){let calls=0;const directory=temporary(t);await assert.rejects(()=>captureFussballDirectory({directory,options:{...options,maxRequests},completionProof:proof,collectFn:collector(),fetchFn:async()=>calls++}),/bound|checkpoint/);assert.equal(calls,0);assert.equal(existsSync(directory),false)}
})
test('v2 refuses alternate scope/policy/limited capture or mixed authority before source and output',actual,async t=>{
 const f=genuine()
 for(const extra of [{options:{...options,season:'2025/26'}},{options:{...options,cardPolicy:undefined}},{options:{...options,reportLimit:1}},{reuseDirectory:'never-read'},{reuseBulkDirectory:'never-read'},{archiveParent:{}}]){
  let calls=0;const directory=temporary(t);await assert.rejects(()=>captureFussballDirectory({directory,options,completionProof:f.proof,...extra,collectFn:collector(),fetchFn:async()=>calls++}),/checkpoint|scope|community|mix|reuse|archive/);assert.equal(calls,0);assert.equal(existsSync(directory),false)
 }
})
test('actual full candidate cache uses only strict complete/community pairs; held private pairs are always freshly read',actual,async t=>{
 fakeClock(t);const f=await captured(t,{all:true,extraPairs:true}),m=f.manifest,byUrl=new Map(m.documents.map(d=>[d.url,d]))
 assert.equal(m.version,4);assert.ok(m.documents.length>=631);assert.ok(f.calls.includes(seedUrl));assert.equal(m.documents.find(d=>d.url===seedUrl).origin,'network')
 const cached=m.documents.filter(d=>d.origin==='cache');assert.ok(cached.some(d=>d.kind==='report'));assert.ok(cached.some(d=>d.kind==='font'))
 for(const original of f.docs){const d=byUrl.get(original.url);assert.ok(d);if(['css','font'].includes(original.kind))assert.equal(d.origin,'cache','retained actual assets must not be needlessly refetched');if(d.origin==='cache'){assert.equal(d.capturedAt,original.capturedAt);assert.equal(d.sha256,original.sha256);assert.deepEqual(d.originalReceipt,original.originalReceipt)}}
 for(const id of conflicts){const pair=m.documents.filter(d=>['report','lineup'].includes(d.kind)&&d.url.includes(id));assert.equal(pair.length,2);assert.ok(pair.every(d=>d.origin==='network'&&f.calls.includes(d.url)),'no old pair revision fallback')}
 // Independently run the actual strict parser on each admitted cached pair.
 for(const report of cached.filter(d=>d.kind==='report')){
  const id=report.url.match(/\/spiel\/([A-Z0-9]{32})$/)[1],html=readFileSync(join(f.directory,report.file),'utf8'),info=inspectFussballPage(html,{kind:'report',matchId:id}),lineup=byUrl.get(info.lineupUrl);assert.equal(lineup?.origin,'cache')
  const lineupHtml=readFileSync(join(f.directory,lineup.file),'utf8'),fontIds=[...new Set([...info.fontIds,...inspectFussballLineup(lineupHtml)])],fonts=Object.create(null)
  for(const fontId of fontIds){const css=byUrl.get(info.cssTemplate.replace('%ID%',fontId));if(!css)continue;const url=fussballFontUrl(readFileSync(join(f.directory,css.file),'utf8'),fontId),font=byUrl.get(url);if(font)fonts[fontId]={bytes:readFileSync(join(f.directory,font.file)),sha256:font.sha256}}
  const result=razberiFantasyZapisnik(html,lineupHtml,{fonts,id,lineupId:id,cardPolicy:'community-v1',season:'2026/27'})
  assert.ok(result.reportStatistikaPripravljena===true&&Array.isArray(result.nastopi)||result.statisticsPending===true&&result.reportStatistikaPripravljena===false&&result.cardEnvelope&&!Object.hasOwn(result,'nastopi')&&!Object.hasOwn(result.z??{},'goli'))
  assert.equal(result.activationEligible,false);assert.equal(result.sezonskiUvozPodprt,false);assert.equal(result.z?.nepopoln,true);assert.ok(Array.isArray(result.nepripisaniRumeni))
 }
 const verified=await verifyFussballDirectory(f.directory,{collectFn:f.collectFn});assert.equal(verified.priorRequests,1212);assert.equal(verified.requests,m.snapshot.requests);assert.equal(verified.activationEligible,false)
 await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:collector([])}),/result differs|unused|missing/)
 const manifestBytes=readFileSync(join(f.directory,'manifest.json')),journalFile=join(f.directory,'attempts.jsonl'),journal=readFileSync(journalFile)
 for(const mutate of [
  x=>{const d=x.documents.find(d=>d.origin==='cache');d.capturedAt=x.createdAt;d.originalReceipt.document.capturedAt=x.createdAt;d.originalReceipt.attempt.startedAt=x.createdAt},
  x=>x.documents.find(d=>d.origin==='network').originalReceipt.capture.codeSha256='0'.repeat(64),
  x=>x.snapshot.requests++,x=>x.snapshot.attempts[0].httpStatus=403,x=>x.documents[0].origin='unknown',
 ]){const altered=json(manifestBytes);mutate(altered);writeManifest(f.directory,altered);await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:f.collectFn}),/original|cache|receipt|checkpoint|request|document|status/)}
 writeFileSync(join(f.directory,'manifest.json'),manifestBytes)
 const firstLine=JSON.parse(journal.toString().split('\n')[0]);firstLine.startedAt='2026-10-27T16:00:00Z';writeFileSync(journalFile,JSON.stringify(firstLine)+'\n'+journal.toString().split('\n').slice(1).join('\n'))
 await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:f.collectFn}),/journal/);writeFileSync(journalFile,journal)
 const swapped=json(manifestBytes),d=swapped.documents.find(d=>d.origin==='cache'),bytes=Buffer.from('TEST ONLY swapped cache body');d.sha256=sha(bytes);d.bytes=bytes.length;d.file=`documents/${d.sha256}.${d.kind==='font'?'woff':d.kind==='css'?'css':'html'}`;Object.assign(d.originalReceipt.document,{sha256:d.sha256,bytes:d.bytes});writeFileSync(join(f.directory,d.file),bytes);writeManifest(f.directory,swapped)
 await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:f.collectFn}),/checkpoint|original|cache/)
 writeFileSync(join(f.directory,'manifest.json'),manifestBytes)
})
test('v2 public proof, payload paths and nested originals cannot be substituted during offline replay',actual,async t=>{
 fakeClock(t);const f=await captured(t),raw=readFileSync(join(f.directory,'manifest.json'))
 for(const mutate of [m=>m.checkpoint.version=1,m=>m.checkpoint.proof.preset='baden-reviewed-transports-v1',m=>m.checkpoint.proof.priorRequests=1114,m=>m.checkpoint.proof.documentsCount=632,m=>m.checkpoint.proof.documentsSha256='0'.repeat(64),m=>m.checkpoint.proof.scope.season='2025/26',m=>m.checkpoint.proof.parents[0].requests=0,m=>m.checkpoint.parentFiles[0].zipFile='../source.zip',m=>m.checkpoint.parentFiles.push(m.checkpoint.parentFiles[0])]){
  const changed=json(raw);mutate(changed);writeManifest(f.directory,changed);await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:f.collectFn}),/checkpoint|parent|proof|paths|version/)
 }
 writeFileSync(join(f.directory,'manifest.json'),raw)
 const file=join(f.directory,f.manifest.checkpoint.parentFiles[0].zipFile),bytes=readFileSync(file),changed=Buffer.from(bytes);changed[changed.length>>1]^=1;writeFileSync(file,changed)
 await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:f.collectFn}),/checkpoint|resumption|[Aa]rtifact|parent/);writeFileSync(file,bytes)
 const metaFile=join(f.directory,f.manifest.checkpoint.parentFiles[0].metadataFile),meta=json(readFileSync(metaFile));meta.run.conclusion='success';writeFileSync(metaFile,JSON.stringify(meta));await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:f.collectFn}),/checkpoint|resumption|parent|terminal/)
})
test('terminal new refusal stays spent and cannot become a successful v4 or archive-parent witness',actual,async t=>{
 const f=genuine(),directory=temporary(t);let calls=0
 await assert.rejects(()=>captureFussballDirectory({directory,options,completionProof:f.proof,collectFn:collector(),fetchFn:async()=>{calls++;return new Response('TEST ONLY refusal',{status:403})}}),/403/)
 const m=json(readFileSync(join(directory,'manifest.json')));assert.equal(m.version,4);assert.equal(m.checkpoint.version,2);assert.equal(m.checkpoint.proof.priorRequests,1212);assert.equal(m.success,false);assert.equal(m.snapshot.requests,1);assert.equal(calls,1);assert.equal(m.resultSha256,null)
 await assert.rejects(()=>verifyFussballDirectory(directory,{collectFn:collector()}),/incomplete|failed/)
 await assert.rejects(()=>captureFussballDirectory({directory:temporary(t),options,completionProof:f.proof,archiveParent:{},fetchFn:async()=>{calls++;throw Error('forbidden')}}),/mix|archive|checkpoint/);assert.equal(calls,1)
})
