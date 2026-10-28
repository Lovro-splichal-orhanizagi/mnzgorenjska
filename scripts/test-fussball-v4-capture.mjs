import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import * as checkpoint from './fussball-checkpoint.mjs'
import {captureFussballDirectory,verifyFussballDirectory} from './fussball-capture-evidence.mjs'
const directory=process.env.FUSSBALL_V4_EVIDENCE_DIR,actual={skip:directory===undefined?'set FUSSBALL_V4_EVIDENCE_DIR to actual partial raw artifact':false}
const seed='https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2627-baden/-/staffel/03188V27L800000JVS5489BTVU7GTVLE-G'
const options={seedUrl:seed,staffel:'03188V27L800000JVS5489BTVU7GTVLE-G',season:'2026/27',maxRequests:483,reportLimit:null,cardPolicy:'community-v1'}
const bytes=Buffer.from('<html><body>SYNTHETIC retry round only, no source/native admission</body></html>')
const collector=async({client,...scope})=>{assert.deepEqual(Buffer.from((await client.read(seed,'round')).bytes),bytes);return{version:1,testOnlySynthetic:true,scope:{provider:'fussball',seedUrl:scope.seedUrl,staffel:scope.staffel,season:scope.season},coverage:{sampled:true},activationEligible:false}}
const transient=()=>new TypeError('fetch failed',{cause:Object.assign(new Error('connect timeout'),{code:'ETIMEDOUT'})})

test('v4 schema5 counts failed retry, durably binds every outcome, and replays without network',actual,async t=>{
 const parent={...JSON.parse(readFileSync(join(directory,'current-metadata.json'))),zipBytes:readFileSync(join(directory,'current.zip'))},proof=checkpoint.readFussballTransportV4({parent}),base=mkdtempSync(join(tmpdir(),'fussball-v4-capture-'));t.after(()=>rmSync(base,{recursive:true,force:true}));let calls=0
 const output=join(base,'capture'),m=await captureFussballDirectory({directory:output,options,completionProof:proof,collectFn:collector,fetchFn:async url=>{assert.equal(url,seed);if(++calls===1)throw transient();return new Response(bytes,{headers:{'content-type':'text/html'}})}})
 assert.equal(m.version,5);assert.equal(m.snapshot.requests,2);assert.equal(m.documents.length,1);assert.equal(m.documents[0].originalReceipt.attempt.number,2)
 assert.equal(m.checkpoint.version,4);assert.equal(m.retryPolicy,'baden-v4-transient-v1');assert.equal(m.success,true)
 const outcomes=readFileSync(join(output,'outcomes.jsonl')),rows=outcomes.toString().trim().split('\n').map(JSON.parse)
 assert.deepEqual(rows.map(r=>r.status),['failed','success']);assert.deepEqual(rows,m.snapshot.attempts);assert.equal(m.outcomesSha256,createHash('sha256').update(outcomes).digest('hex'))
 const verified=await verifyFussballDirectory(output,{collectFn:collector});assert.equal(verified.requests,2);assert.equal(verified.priorRequests,1517);assert.equal(verified.checkpointPreset,'baden-reviewed-transports-v4')
 const original=readFileSync(join(output,'manifest.json'))
 for(const mutation of [
  x=>{x.snapshot.requests=1},x=>{x.snapshot.attempts[0].transportFailure.chain.cause.code='EPERM'},x=>{x.documents[0].originalReceipt.attempt.number=1},
 ]){const altered=JSON.parse(original);mutation(altered);writeFileSync(join(output,'manifest.json'),JSON.stringify(altered)+'\n');await assert.rejects(verifyFussballDirectory(output,{collectFn:collector}))}
 const coordinated=JSON.parse(original);coordinated.snapshot.attempts[0].transportFailure.chain.cause.code='EPERM'
 const forged=Buffer.from(coordinated.snapshot.attempts.map(a=>JSON.stringify(a)+'\n').join(''));coordinated.outcomesSha256=createHash('sha256').update(forged).digest('hex')
 writeFileSync(join(output,'outcomes.jsonl'),forged);writeFileSync(join(output,'manifest.json'),JSON.stringify(coordinated)+'\n')
 await assert.rejects(verifyFussballDirectory(output,{collectFn:collector}),/transport|evidence/)
 writeFileSync(join(output,'manifest.json'),original);writeFileSync(join(output,'outcomes.jsonl'),outcomes.subarray(0,outcomes.length-2));await assert.rejects(verifyFussballDirectory(output,{collectFn:collector}),/outcome/)
})

test('latest defective report AND lineup remain in raw proof but neither is reused as cached source',actual,async t=>{
 const parent={...JSON.parse(readFileSync(join(directory,'current-metadata.json'))),zipBytes:readFileSync(join(directory,'current.zip'))},proof=checkpoint.readFussballTransportV4({parent}),docs=checkpoint.getFussballCheckpointDocuments(proof),base=mkdtempSync(join(tmpdir(),'fussball-v4-invalid-pairs-'));t.after(()=>rmSync(base,{recursive:true,force:true}))
 const pair=docs.filter(d=>['report','lineup'].includes(d.kind)&&d.url.includes('031DS4G7UK000000VS5489BUVUR5FS5A'));assert.equal(pair.length,2)
 for(const d of pair){
  const calls=[],output=join(base,d.kind)
  await assert.rejects(captureFussballDirectory({directory:output,options,completionProof:proof,collectFn:async({client})=>{await client.read(d.url,d.kind);assert.fail('defective cache leaked')},fetchFn:async url=>{calls.push(url);throw Error('TEST ONLY stop before any source access')}}),/TEST ONLY stop/)
  assert.deepEqual(calls,[d.url]);const m=JSON.parse(readFileSync(join(output,'manifest.json')));assert.equal(m.snapshot.requests,1);assert.equal(m.documents.length,0)
  await assert.rejects(verifyFussballDirectory(output,{collectFn:collector}),/successful/)
 }
})

test('archive schema5 keeps adjacent parent and v4 raw history without current-season cache reuse',actual,async t=>{
 const {execFileSync}=await import('node:child_process'),raw=JSON.parse(readFileSync(join(directory,'current-manifest.json'))),seedDocument=raw.documents.find(d=>d.kind==='round'&&d.url===seed),parent={...JSON.parse(readFileSync(join(directory,'current-metadata.json'))),zipBytes:readFileSync(join(directory,'current.zip'))},proof=checkpoint.readFussballTransportV4({parent})
 const document=Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,seedDocument[k]])),archiveParent={current:{seedUrl:seed,staffel:options.staffel,season:'2026/27'},observedSeedUrl:'https://www.fussball.de/spieltag/-/staffel/02TGLSVQ1800000IVS5489BTVTLPPK10-G',document,originalReceipt:seedDocument.originalReceipt,bytes:execFileSync('unzip',['-p',join(directory,'current.zip'),seedDocument.file],{maxBuffer:8*1024*1024})}
 const archive={seedUrl:'https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2526-baden/-/staffel/02TGLSVQ1800000IVS5489BTVTLPPK10-G',staffel:'02TGLSVQ1800000IVS5489BTVTLPPK10-G',season:'2025/26',maxRequests:3000,reportLimit:null,cardPolicy:'community-v1'},base=mkdtempSync(join(tmpdir(),'fussball-v4-archive-'));t.after(()=>rmSync(base,{recursive:true,force:true}));let calls=0
 const collectFn=async({client,...scope})=>{assert.deepEqual(Buffer.from((await client.read(scope.seedUrl,'round')).bytes),bytes);return{version:1,testOnlySynthetic:true,scope:{provider:'fussball',seedUrl:scope.seedUrl,staffel:scope.staffel,season:scope.season},coverage:{sampled:true},activationEligible:false}}
 const output=join(base,'capture'),m=await captureFussballDirectory({directory:output,options:archive,archiveParent,retryProof:proof,collectFn,fetchFn:async url=>{assert.equal(url,archive.seedUrl);calls++;return new Response(bytes,{headers:{'content-type':'text/html'}})}})
 assert.equal(calls,1);assert.equal(m.version,5);assert.equal(m.documents.length,1);assert.equal(m.documents[0].origin,'network');assert.equal(m.checkpoint.version,4);assert.equal(m.archiveParent.document.sha256,seedDocument.sha256)
 const receipt=await verifyFussballDirectory(output,{collectFn});assert.equal(receipt.requests,1);assert.equal(receipt.priorRequests,1517);assert.equal(receipt.scope.season,'2025/26')
})
