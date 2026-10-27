import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync,renameSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {captureFussballDirectory,verifyFussballDirectory} from './fussball-capture-evidence.mjs'
import {inspectFussballPage} from './viri/fussball-discovery.mjs'

const runs=['40416972177','40509926697','40531709101']
const evidenceDir=process.env.FUSSBALL_CHECKPOINT_EVIDENCE_DIR
const options={seedUrl:'https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2627-baden/-/staffel/03188V27L800000JVS5489BTVU7GTVLE-G',staffel:'03188V27L800000JVS5489BTVU7GTVLE-G',season:'2026/27',maxRequests:2,reportLimit:null,cardPolicy:'community-v1'}
const roundBytes=Buffer.from('<html><body>TEST ONLY SYNTHETIC fresh round, not production readiness</body></html>')
const hash=b=>createHash('sha256').update(b).digest('hex')
const save=(directory,m)=>writeFileSync(join(directory,'manifest.json'),JSON.stringify(m)+'\n')
const load=directory=>JSON.parse(readFileSync(join(directory,'manifest.json')))
async function temporary(fn){const base=mkdtempSync(join(tmpdir(),'fussball-completion-'));try{return await fn(join(base,'capture'),base)}finally{rmSync(base,{recursive:true,force:true})}}

// Existing collectFn seam is TEST ONLY. It exercises byte capture/replay, does
// not parse a complete season, and cannot establish source/native admission.
function syntheticCollector(cached=[]){return async({client,...o})=>{
 const round=await client.read(o.seedUrl,'round')
 assert.deepEqual(Buffer.from(round.bytes),roundBytes)
 for(const d of cached){const read=await client.read(d.url,d.kind);assert.deepEqual(Buffer.from(read.bytes),Buffer.from(d.bytes))}
 return {version:1,testOnlySynthetic:true,scope:{provider:'fussball',seedUrl:o.seedUrl,staffel:o.staffel,season:o.season},coverage:{sampled:true},activationEligible:false}
}}
async function genuine(t){
 if(!evidenceDir||!runs.every(id=>['run.json','artifact.json','jobs.json','source.zip'].every(f=>existsSync(join(evidenceDir,id,f))))){t.skip('genuine private checkpoint originals unavailable; set FUSSBALL_CHECKPOINT_EVIDENCE_DIR');return null}
 const api=await import('./fussball-checkpoint.mjs')
 const parents=runs.map(id=>({run:JSON.parse(readFileSync(join(evidenceDir,id,'run.json'))),artifact:JSON.parse(readFileSync(join(evidenceDir,id,'artifact.json'))),jobs:JSON.parse(readFileSync(join(evidenceDir,id,'jobs.json'))),zipBytes:readFileSync(join(evidenceDir,id,'source.zip'))}))
 const proof=api.readFussballTransportCheckpoint({parents,now:Date.now()}),docs=api.getFussballCheckpointDocuments(proof)
 assert.ok(docs.length>2)
 return {proof,docs,parents}
}
async function captured(t,fn){const input=await genuine(t);if(!input)return;return temporary(async(directory,base)=>{
 const report=input.docs.find(d=>d.kind==='report'),id=report.url.match(/\/spiel\/([A-Z0-9]{32})$/)[1],info=inspectFussballPage(Buffer.from(report.bytes).toString('utf8'),{kind:'report',matchId:id})
 const selected=[report,input.docs.find(d=>d.kind==='lineup'&&d.url===info.lineupUrl)];assert.ok(selected.every(Boolean))
 const collectFn=syntheticCollector(selected),calls=[]
 const m=await captureFussballDirectory({directory,options,completionProof:input.proof,collectFn,fetchFn:async url=>{calls.push(url);assert.equal(url,options.seedUrl,'only the fresh round may use the fake network');return new Response(roundBytes,{headers:{'content-type':'text/html'}})}})
 return fn({directory,base,m,collectFn,calls,selected,...input})
})}

test('unbranded completion proof is refused before fake network or output creation',async()=>temporary(async directory=>{
 let calls=0
 await assert.rejects(captureFussballDirectory({directory,options,completionProof:{preset:'baden-reviewed-transports-v1'},collectFn:syntheticCollector(),fetchFn:async()=>{calls++;return new Response(roundBytes,{headers:{'content-type':'text/html'}})}}),/checkpoint|proof|capability/)
 assert.equal(calls,0);assert.equal(existsSync(directory),false)
}))

test('SYNTHETIC collector v4 reauthenticates genuine cache originals, preserves receipts and fetches its round fresh',async t=>captured(t,async({directory,m,collectFn,calls,selected,docs})=>{
 assert.equal(m.version,4);assert.equal(m.success,true);assert.deepEqual(calls,[options.seedUrl]);assert.equal(m.snapshot.requests,1)
 assert.equal(m.documents.length,3);assert.ok(m.documents.length<docs.length)
 assert.equal(m.checkpoint.version,1);assert.equal(m.checkpoint.proof.priorRequests,1114)
 assert.deepEqual(m.checkpoint.parentFiles.map(p=>p.runId),runs)
 for(const p of m.checkpoint.parentFiles){assert.equal(p.metadataFile,`checkpoint/parents/${p.runId}.json`);assert.equal(p.zipFile,`checkpoint/parents/${p.runId}.zip`);assert.ok(existsSync(join(directory,p.zipFile)))}
 const network=m.documents.find(d=>d.origin==='network');assert.equal(network.kind,'round');assert.equal(network.originalReceipt.capture.codeSha256,m.codeSha256)
 for(const d of selected){const stored=m.documents.find(x=>x.url===d.url);assert.equal(stored.origin,'cache');assert.equal(stored.capturedAt,d.capturedAt);assert.deepEqual(stored.originalReceipt,d.originalReceipt);assert.deepEqual(readFileSync(join(directory,stored.file)),Buffer.from(d.bytes))}
 const verified=await verifyFussballDirectory(directory,{collectFn})
 assert.equal(verified.verified,true);assert.equal(verified.activationEligible,false);assert.equal(verified.checkpointPreset,'baden-reviewed-transports-v1');assert.equal(verified.priorRequests,1114);assert.equal(verified.requests,1)
}))

test('completion mode cannot mix reuse or archive authority and rejects wrong scope/policy/budget',async t=>{
 const input=await genuine(t);if(!input)return
 for(const extra of [{reuseDirectory:'never-read'},{reuseBulkDirectory:'never-read'},{archiveParent:{}},{options:{...options,cardPolicy:undefined}},{options:{...options,reportLimit:1}},{options:{...options,maxRequests:887}},{options:{...options,season:'2025/26'}}])await temporary(async directory=>{
  let calls=0
  await assert.rejects(captureFussballDirectory({directory,options,completionProof:input.proof,...extra,collectFn:syntheticCollector(),fetchFn:async()=>{calls++;throw Error('no network')}}))
  assert.equal(calls,0);assert.equal(existsSync(directory),false)
 })
})

test('tampered public checkpoint proof and parent metadata cannot replace reauthentication',async t=>captured(t,async({directory,m,collectFn})=>{
 const raw=readFileSync(join(directory,'manifest.json'))
 for(const mutate of [x=>x.checkpoint.proof.priorRequests--,x=>x.checkpoint.proof.documentsCount++,x=>x.checkpoint.proof.documentsSha256='0'.repeat(64),x=>x.checkpoint.parentFiles[0].metadataFile='../outside.json',x=>delete x.checkpoint,x=>x.version=2]){
  const altered=JSON.parse(raw);mutate(altered);save(directory,altered);await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/checkpoint|proof|path|version/)
 }
 writeFileSync(join(directory,'manifest.json'),raw)
 const file=join(directory,m.checkpoint.parentFiles[0].metadataFile),metadata=JSON.parse(readFileSync(file));metadata.run.conclusion='success';writeFileSync(file,JSON.stringify(metadata))
 await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/checkpoint|parent|run|terminal|failure/)
}))

test('v4 rejects cached body swaps even when the child document hash/path/receipt are rewritten consistently',async t=>captured(t,async({directory,m,collectFn})=>{
 const d=m.documents.find(x=>x.origin==='cache'),bytes=Buffer.from('TEST ONLY swapped source body')
 d.sha256=hash(bytes);d.bytes=bytes.length;d.file=`documents/${d.sha256}.html`;Object.assign(d.originalReceipt.document,{sha256:d.sha256,bytes:d.bytes});writeFileSync(join(directory,d.file),bytes);save(directory,m)
 await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/checkpoint|original|cache/)
}))

test('v4 rejects changed original cache timestamps and fabricated network receipts',async t=>captured(t,async({directory,m,collectFn})=>{
 const raw=readFileSync(join(directory,'manifest.json'))
 for(const mutate of [x=>{const d=x.documents.find(d=>d.origin==='cache');d.capturedAt=x.createdAt;d.originalReceipt.document.capturedAt=x.createdAt;d.originalReceipt.attempt.startedAt=x.createdAt},x=>{x.documents.find(d=>d.origin==='network').originalReceipt.capture.codeSha256='0'.repeat(64)}]){
  const changed=JSON.parse(raw);mutate(changed);save(directory,changed);await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/original|cache|receipt|checkpoint/)
 }
 writeFileSync(join(directory,'manifest.json'),raw)
}))

test('v4 fails code mismatch, missing used cache documents and unused retained child documents',async t=>captured(t,async({directory,m,collectFn,selected})=>{
 const raw=readFileSync(join(directory,'manifest.json'))
 m.codeSha256='0'.repeat(64);save(directory,m);await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/code/)
 writeFileSync(join(directory,'manifest.json'),raw);const missing=load(directory);missing.documents=missing.documents.filter(d=>d.url!==selected[0].url);save(directory,missing)
 await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/missing|document|budget/)
 writeFileSync(join(directory,'manifest.json'),raw)
 await assert.rejects(verifyFussballDirectory(directory,{collectFn:syntheticCollector(selected.slice(0,1))}),/unused|missing/)
}))

test('v4 rejects nested checkpoint symlinks and lexical traversal before following their targets',async t=>captured(t,async({directory,m,collectFn})=>{
 const manifest=readFileSync(join(directory,'manifest.json')),parentDir=join(directory,'checkpoint','parents'),realDir=join(directory,'checkpoint','actual-parents')
 renameSync(parentDir,realDir);symlinkSync(realDir,parentDir)
 await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/symbolic|symlink|regular/)
 rmSync(parentDir);renameSync(realDir,parentDir)
 const leaf=join(directory,m.checkpoint.parentFiles[0].zipFile),original=readFileSync(leaf),target=join(directory,'foreign-parent.zip')
 rmSync(leaf);writeFileSync(target,original);symlinkSync(target,leaf)
 await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/regular|symlink/)
 rmSync(leaf);writeFileSync(leaf,original)
 m.checkpoint.parentFiles[0].zipFile=`checkpoint/parents/../parents/${runs[0]}.zip`;save(directory,m)
 await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/path/)
 writeFileSync(join(directory,'manifest.json'),manifest)
}))

test('v4 binds the complete child journal, source origin and successful request accounting',async t=>captured(t,async({directory,collectFn})=>{
 const raw=readFileSync(join(directory,'manifest.json')),journalFile=join(directory,'attempts.jsonl'),journal=readFileSync(journalFile)
 for(const mutate of [x=>x.snapshot.requests++,x=>x.snapshot.attempts[0].httpStatus=403,x=>x.documents[0].origin='unknown']){
  const m=JSON.parse(raw);mutate(m);save(directory,m);await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/request|document|status/)
 }
 writeFileSync(join(directory,'manifest.json'),raw)
 const pending=JSON.parse(journal.toString().trim());pending.startedAt='2026-10-27T16:00:00Z';writeFileSync(journalFile,JSON.stringify(pending)+'\n')
 await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/journal/)
 writeFileSync(journalFile,journal)
}))

test('new source refusal is terminal and a v4 failed child never verifies',async t=>{
 const input=await genuine(t);if(!input)return
 await temporary(async directory=>{
  let calls=0
  await assert.rejects(captureFussballDirectory({directory,options,completionProof:input.proof,collectFn:syntheticCollector(),fetchFn:async()=>{calls++;return new Response('refused',{status:403})}}),/403/)
  const m=load(directory);assert.equal(m.version,4);assert.equal(m.success,false);assert.equal(m.snapshot.requests,1);assert.equal(calls,1)
  await assert.rejects(verifyFussballDirectory(directory,{collectFn:syntheticCollector()}),/incomplete|failed/)
 })
})

test('ordinary v1 synthetic collector retains the existing scope and verification result',async()=>temporary(async directory=>{
 const collectFn=syntheticCollector(),m=await captureFussballDirectory({directory,options,collectFn,fetchFn:async()=>new Response(roundBytes,{headers:{'content-type':'text/html'}})})
 assert.equal(m.version,1);assert.equal(Object.hasOwn(m,'checkpoint'),false);assert.equal(Object.hasOwn(m.documents[0],'origin'),false)
 const verified=await verifyFussballDirectory(directory,{collectFn});assert.equal(verified.verified,true);assert.equal(Object.hasOwn(verified,'checkpointPreset'),false)
}))

test('actual retained 7UK private-starter pair uses fresh ordinary report and lineup reads, never old cached bytes',async t=>{
 const input=await genuine(t);if(!input)return
 const report=input.docs.find(d=>d.kind==='report'&&d.url.endsWith('/031DS4G7UK000000VS5489BUVUR5FS5A'));assert.ok(report)
 const info=inspectFussballPage(Buffer.from(report.bytes).toString('utf8'),{kind:'report',matchId:'031DS4G7UK000000VS5489BUVUR5FS5A'}),lineup=input.docs.find(d=>d.url===info.lineupUrl&&d.kind==='lineup');assert.ok(lineup)
 let clock=Date.now();t.mock.method(Date,'now',()=>clock);t.mock.method(globalThis,'setTimeout',(fn,ms)=>{clock+=ms;queueMicrotask(fn);return 1})
 await temporary(async directory=>{
  const calls=[],selected=[report,lineup],collectFn=syntheticCollector(selected),bodies=new Map([[options.seedUrl,roundBytes],...selected.map(d=>[d.url,Buffer.from(d.bytes)])])
  const m=await captureFussballDirectory({directory,options:{...options,maxRequests:3},completionProof:input.proof,collectFn,fetchFn:async url=>{calls.push(url);assert.ok(bodies.has(url));return new Response(bodies.get(url),{headers:{'content-type':'text/html'}})}})
  assert.deepEqual(calls,[options.seedUrl,report.url,lineup.url])
  assert.equal(m.snapshot.requests,3);assert.equal(m.documents.filter(d=>d.origin==='cache').length,0)
  assert.ok(m.documents.every(d=>d.origin==='network'))
  assert.equal((await verifyFussballDirectory(directory,{collectFn})).verified,true,'synthetic traversal only, not admission of this invalid report')
  // Even genuine old receipts cannot relabel an ineligible pair as cache.
  for(const original of selected){const d=m.documents.find(d=>d.url===original.url);Object.assign(d,original.originalReceipt.document,{origin:'cache',originalReceipt:original.originalReceipt})}
  m.snapshot.requests=1;m.snapshot.attempts=m.snapshot.attempts.slice(0,1)
  writeFileSync(join(directory,'attempts.jsonl'),readFileSync(join(directory,'attempts.jsonl'),'utf8').split('\n')[0]+'\n');save(directory,m)
  await assert.rejects(verifyFussballDirectory(directory,{collectFn}),/checkpoint cached original/)
 })
})
