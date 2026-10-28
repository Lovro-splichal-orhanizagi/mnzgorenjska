// Genuine retained originals plus injected NEW transport/collector only.
// This is neither a live season capture nor a native admission witness.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {runInNewContext} from 'node:vm'
import {captureFussballDirectory,verifyFussballDirectory} from './fussball-capture-evidence.mjs'
import * as checkpoint from './fussball-checkpoint.mjs'

const evidenceDir=process.env.FUSSBALL_SUCCESSOR_EVIDENCE_DIR
const actual={skip:evidenceDir?false:'Explicit genuine current/archive successor bytes required through FUSSBALL_SUCCESSOR_EVIDENCE_DIR; no live source success claimed'}
const preset='baden-reviewed-transports-v3',runId='40577717778'
const sha=b=>createHash('sha256').update(b).digest('hex'),json=b=>JSON.parse(b)
const seedUrl='https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2627-baden/-/staffel/03188V27L800000JVS5489BTVU7GTVLE-G'
const options={seedUrl,staffel:'03188V27L800000JVS5489BTVU7GTVLE-G',season:'2026/27',maxRequests:577,reportLimit:null,cardPolicy:'community-v1'}
const rejected=['031DS4G7UK000000VS5489BUVUR5FS5A','031DS4G3DC000000VS5489BUVUR5FS5A','031DS4G74K000000VS5489BUVUR5FS5A','031DS4G6GK000000VS5489BUVUR5FS5A','031DS4G5R4000000VS5489BUVUR5FS5A','031DS4G5K8000000VS5489BUVUR5FS5A','031DS4G4N0000000VS5489BUVUR5FS5A','031DS4G384000000VS5489BUVUR5FS5A','031DS4G2N4000000VS5489BUVUR5FS5A']
const parentFiles=['current','archive'].map(stage=>({runId,metadataFile:`checkpoint/parents/${runId}-${stage}.json`,zipFile:`checkpoint/parents/${runId}-${stage}.zip`}))
let saved
function genuine(){
 if(saved)return saved
 assert.equal(typeof checkpoint.readFussballTransportSuccessor,'function','authenticated successor reader required')
 const read=name=>readFileSync(join(evidenceDir,name)),run=json(read('run.json')),jobs=json(read('jobs.json')),artifacts=json(read('artifacts.json')).artifacts
 const parents=['fussball-season','fussball-season-archive'].map(prefix=>({run,artifact:artifacts.find(a=>a.name===`${prefix}-${runId}`),jobs,zipBytes:read(`${prefix}-${runId}.zip`)}))
 const proof=checkpoint.readFussballTransportSuccessor({current:parents[0],archive:parents[1],now:Date.parse('2026-10-28T00:00:00Z')})
 const currentDir=join(evidenceDir,`fussball-season-${runId}`),manifest=json(readFileSync(join(currentDir,'manifest.json'))),documents=manifest.documents.map(d=>({...d,bytes:readFileSync(join(currentDir,d.file))}))
 saved={parents,proof,documents,candidates:checkpoint.getFussballCheckpointDocuments(proof)};return saved
}
function temporary(t){const base=mkdtempSync(join(tmpdir(),'fussball-successor-'));t.after(()=>rmSync(base,{recursive:true,force:true}));return join(base,'capture')}
function fakeClock(t){let clock=Date.now();t.mock.method(Date,'now',()=>clock);t.mock.method(globalThis,'setTimeout',(fn,ms)=>{clock+=ms;queueMicrotask(fn);return 1})}
const collector=documents=>async({client,...o})=>{
 for(const d of documents){const actual=await client.read(d.url,d.kind);assert.deepEqual(Buffer.from(actual.bytes),Buffer.from(d.bytes))}
 return {version:1,testOnlySynthetic:true,scope:{provider:'fussball',seedUrl:o.seedUrl,staffel:o.staffel,season:o.season},coverage:{sampled:true},activationEligible:false}
}
async function captured(t,{all=false}={}){
 const f=genuine(),directory=temporary(t),traversal=all?f.documents:f.documents.filter(d=>d.url===seedUrl),bodies=new Map(traversal.map(d=>[d.url,d])),calls=[],collectFn=collector(traversal)
 const manifest=await captureFussballDirectory({directory,options,completionProof:f.proof,collectFn,fetchFn:async url=>{calls.push(url);const d=bodies.get(url);assert.ok(d,'unplanned injected request '+url);return new Response(d.bytes,{headers:{'content-type':d.contentType}})}})
 return {...f,directory,manifest,calls,collectFn,traversal}
}
const writeManifest=(directory,m)=>writeFileSync(join(directory,'manifest.json'),JSON.stringify(m)+'\n')

test('fingerprint changes when the fixed successor policy changes',()=>{
 const source=readFileSync(new URL('./fussball-capture-evidence.mjs',import.meta.url),'utf8'),start=source.indexOf('export function fussballCaptureCodeSha256(){'),end=source.indexOf('\nexport function validateFussballCaptureOptions',start)
 assert.ok(start>=0&&end>start);let changed=false,reads=0
 const fingerprint=runInNewContext(source.slice(start,end).replace('export ','')+';fussballCaptureCodeSha256',{hash:sha,root:'/TEST_ONLY_ROOT',resolve,zaprtje:()=>[],readFileSync:path=>{if(path.endsWith('/policies/fussball-transport-successor.json')){reads++;return Buffer.from(changed?'TEST ONLY changed registry':'TEST ONLY original registry')}return Buffer.from('TEST ONLY unchanged '+path)}})
 const original=fingerprint();changed=true;assert.notEqual(fingerprint(),original);assert.equal(reads,2)
})
test('v3 persists both same-run raw stage parents and replays the full1423 proof',actual,async t=>{
 fakeClock(t);const f=await captured(t),m=f.manifest
 assert.equal(m.version,4);assert.equal(m.checkpoint.version,3);assert.deepEqual(m.checkpoint.parentFiles,parentFiles);assert.deepEqual(m.checkpoint.proof,f.proof)
 assert.equal(f.proof.priorRequests,1423);assert.equal(f.proof.totalRequestCap,5000);assert.equal(f.candidates.length,634);assert.equal(f.proof.documentsCount,634)
 for(const [i,paths]of parentFiles.entries()){
  assert.deepEqual(readFileSync(join(f.directory,paths.zipFile)),f.parents[i].zipBytes)
  const {run,artifact,jobs}=f.parents[i];assert.deepEqual(json(readFileSync(join(f.directory,paths.metadataFile))),{run,artifact,jobs})
 }
 assert.deepEqual(f.calls,[seedUrl]);assert.equal(m.snapshot.requests,1);assert.equal(m.documents[0].origin,'network')
 const verified=await verifyFussballDirectory(f.directory,{collectFn:f.collectFn});assert.equal(verified.checkpointPreset,preset);assert.equal(verified.priorRequests,1423);assert.equal(verified.activationEligible,false)
})
test('all30 schedules are fresh; only67 strict pairs and482 assets reuse latest flat originals',actual,async t=>{
 fakeClock(t);const f=await captured(t,{all:true}),m=f.manifest,cached=m.documents.filter(d=>d.origin==='cache'),network=m.documents.filter(d=>d.origin==='network'),byUrl=new Map(m.documents.map(d=>[d.url,d]))
 assert.equal(cached.length,616);assert.equal(network.length,48);assert.equal(m.snapshot.requests,48)
 const selected=new Set(cached.map(d=>d.url));t.diagnostic(`strict eligible616 descriptor sha256: ${sha(JSON.stringify(f.candidates.filter(d=>selected.has(d.url)).map(({bytes,...d})=>({...d,bytes:bytes.length}))))}`)
 for(const [kind,count]of [['report',67],['lineup',67],['css',241],['font',241]])assert.equal(cached.filter(d=>d.kind===kind).length,count)
 assert.equal(network.filter(d=>d.kind==='round').length,30);assert.ok(cached.every(d=>d.kind!=='round'))
 for(const id of rejected){const pair=m.documents.filter(d=>['report','lineup'].includes(d.kind)&&d.url.includes(id));assert.equal(pair.length,2);assert.ok(pair.every(d=>d.origin==='network'),'both latest rejected halves refetch, including old conflicts')}
 for(const original of f.candidates){const d=byUrl.get(original.url);assert.ok(d);if(d.origin==='cache'){assert.equal(d.capturedAt,original.capturedAt);assert.equal(d.sha256,original.sha256);assert.deepEqual(d.originalReceipt,original.originalReceipt)}}
 assert.ok(cached.every(d=>d.originalReceipt.capture.codeSha256!==m.codeSha256),'historical fingerprint remains original')
 const verified=await verifyFussballDirectory(f.directory,{collectFn:f.collectFn});assert.equal(verified.requests,48);assert.equal(verified.activationEligible,false)
 await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:collector(f.traversal.slice(0,-1))}),/unused|missing/)
 const raw=readFileSync(join(f.directory,'manifest.json'))
 for(const mutate of [x=>x.documents.find(d=>d.origin==='cache').originalReceipt.capture.codeSha256='0'.repeat(64),x=>x.documents.find(d=>d.origin==='cache').capturedAt=x.createdAt,x=>x.snapshot.requests++,x=>x.documents.find(d=>d.origin==='network').origin='cache']){
  const changed=json(raw);mutate(changed);writeManifest(f.directory,changed);await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:f.collectFn}),/receipt|cache|request|document|original/)
 }
 writeFileSync(join(f.directory,'manifest.json'),raw)
 const body=join(f.directory,cached[0].file),bytes=readFileSync(body);writeFileSync(body,Buffer.from('TEST ONLY tamper'));await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:f.collectFn}),/bytes|hash/);writeFileSync(body,bytes)
})
test('v3 rejects downgraded bounds, copied authority and mixed capture before output/source',actual,async t=>{
 const {proof}=genuine()
 for(const extra of [{options:{...options,maxRequests:578}},{options:{...options,season:'2025/26'}},{options:{...options,cardPolicy:undefined}},{options:{...options,reportLimit:1}},{completionProof:structuredClone(proof)},{reuseDirectory:'never-read'},{reuseBulkDirectory:'never-read'},{archiveParent:{}}]){
  const directory=temporary(t);let calls=0
  await assert.rejects(()=>captureFussballDirectory({directory,options,completionProof:proof,...extra,collectFn:collector([]),fetchFn:async()=>calls++}),/checkpoint|scope|community|mix|reuse|archive|reader/)
  assert.equal(calls,0);assert.equal(existsSync(directory),false)
 }
})
test('offline replay refuses altered v3 proof, same-run collisions and either raw parent substitution',actual,async t=>{
 fakeClock(t);const f=await captured(t),raw=readFileSync(join(f.directory,'manifest.json'))
 for(const mutate of [m=>m.checkpoint.version=2,m=>m.checkpoint.proof.priorRequests=1212,m=>m.checkpoint.proof.documentsCount=616,m=>m.checkpoint.proof.documentsSha256='0'.repeat(64),m=>m.checkpoint.proof.parents.reverse(),m=>m.checkpoint.parentFiles[1]=m.checkpoint.parentFiles[0],m=>m.checkpoint.parentFiles[0].zipFile='../source.zip']){
  const changed=json(raw);mutate(changed);writeManifest(f.directory,changed);await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:f.collectFn}),/checkpoint|parent|proof|paths|version/)
 }
 writeFileSync(join(f.directory,'manifest.json'),raw)
 for(const paths of parentFiles){
  const path=join(f.directory,paths.zipFile),bytes=readFileSync(path),changed=Buffer.from(bytes);changed[changed.length>>1]^=1;writeFileSync(path,changed)
  await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:f.collectFn}),/checkpoint|successor|[Aa]rtifact|parent|digest/);writeFileSync(path,bytes)
  const metaPath=join(f.directory,paths.metadataFile),metaBytes=readFileSync(metaPath),meta=json(metaBytes);meta.artifact.id=1;writeFileSync(metaPath,JSON.stringify(meta))
  await assert.rejects(()=>verifyFussballDirectory(f.directory,{collectFn:f.collectFn}),/checkpoint|successor|[Aa]rtifact|parent/);writeFileSync(metaPath,metaBytes)
 }
})
test('terminal new HTTP and parser failures retain v3 proof and spent network journals',actual,async t=>{
 const {proof,documents}=genuine(),seed=documents.find(d=>d.url===seedUrl)
 for(const parserFailure of [false,true]){
  const directory=temporary(t);let calls=0
  const collectFn=async({client})=>{await client.read(seedUrl,'round');throw Error('TEST ONLY parser hold')}
  await assert.rejects(()=>captureFussballDirectory({directory,options,completionProof:proof,collectFn,fetchFn:async()=>{calls++;return new Response(parserFailure?seed.bytes:'TEST ONLY refusal',{status:parserFailure?200:403,headers:{'content-type':'text/html'}})}}),parserFailure?/parser hold/:/403/)
  const m=json(readFileSync(join(directory,'manifest.json')));assert.equal(m.version,4);assert.equal(m.checkpoint.version,3);assert.equal(m.checkpoint.proof.priorRequests,1423);assert.equal(m.success,false);assert.equal(m.snapshot.requests,1);assert.equal(calls,1);assert.equal(m.resultSha256,null)
  assert.equal(readFileSync(join(directory,'attempts.jsonl'),'utf8').trim().split('\n').length,1)
  await assert.rejects(()=>verifyFussballDirectory(directory,{collectFn}),/incomplete|failed/)
 }
})
