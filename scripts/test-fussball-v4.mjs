import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import * as checkpoint from './fussball-checkpoint.mjs'
const directory=process.env.FUSSBALL_V4_EVIDENCE_DIR
const actual={skip:directory===undefined?'set FUSSBALL_V4_EVIDENCE_DIR to retained actual run40614233934 bytes':false}
const input=()=>({...JSON.parse(readFileSync(join(directory,'current-metadata.json'))),zipBytes:readFileSync(join(directory,'current.zip'))})
const read=parent=>{assert.equal(typeof checkpoint.readFussballTransportV4,'function','authenticated v4 reader exists');return checkpoint.readFussballTransportV4({parent})}

test('caller JSON cannot issue v4 cache authority or replace actual spent requests',()=>{
 assert.throws(()=>checkpoint.getFussballCheckpointDocuments({preset:'baden-reviewed-transports-v4',priorRequests:1517}),/reader-issued/)
})
test('actual failed94th request is spent and all raw embedded history remains authenticated',actual,()=>{
 const parent=input(),proof=read(parent),documents=checkpoint.getFussballCheckpointDocuments(proof),bundle=checkpoint.exportFussballTransportCheckpoint(proof)
 assert.equal(proof.preset,'baden-reviewed-transports-v4');assert.equal(proof.priorRequests,1517);assert.equal(proof.totalRequestCap,5000)
 assert.equal(proof.parents[0].requests,94);assert.equal(proof.parents[0].documentsCount,303)
 assert.equal(proof.documentsCount,691);assert.equal(documents.length,691);assert.equal(documents.some(d=>d.kind==='round'),false)
 assert.deepEqual(bundle.parents.map(p=>p.run.id),[40614233934]);assert.ok(bundle.parents[0].zipBytes.equals(parent.zipBytes))
 assert.equal(documents.find(d=>d.url.endsWith('/031DS4G7UK000000VS5489BUVUR5FS5A')).sha256,'f4c2cbcc835c09c0cd46befc002dda18c60e450375bea61e58c33649e0e7ba34')
 assert.equal(documents.find(d=>d.url.endsWith('/031DS4G6GK000000VS5489BUVUR5FS5A/ticker-id/selectedTickerId')).sha256,'3e3d694e0595d64fe49b684cdc465a4a552742c310817dcd9ac6d32cfb09a7bb')
 assert.equal(documents.some(d=>d.url.endsWith('/format/woff/id/tzhzfgt8/type/font')),false,'failed request invented no body')
 const updated=documents.find(d=>d.sha256==='f4c2cbcc835c09c0cd46befc002dda18c60e450375bea61e58c33649e0e7ba34')
 assert.equal(updated.originalReceipt.capture.createdAt,'2026-10-28T01:20:17.086Z');assert.equal(updated.originalReceipt.attempt.httpStatus,200)
 const history=checkpoint.exportFussballV4AccountedHistory(proof)
 assert.deepEqual(Object.values(history).map(p=>p.run.id),[40566792786,40577717778,40577717778,40614233934])
 assert.throws(()=>checkpoint.exportFussballV4AccountedHistory({...proof}),/reader-issued/)
 bundle.parents[0].run.id=0;assert.equal(checkpoint.exportFussballTransportCheckpoint(proof).parents[0].run.id,40614233934)
})
for(const [name,change]of [
 ['ZIP body digest',p=>{p.zipBytes[100]^=1}],['artifact digest',p=>{p.artifact.digest='sha256:'+'0'.repeat(64)}],['artifact identity',p=>{p.artifact.id++}],['rerun',p=>{p.run.run_attempt=2}],['source code',p=>{p.run.head_sha='a'.repeat(40)}],['HTTP-independent terminal run',p=>{p.run.conclusion='success'}],['archive executed',p=>{p.jobs.jobs.find(j=>j.name==='archive').conclusion='success'}],['source step skipped',p=>{p.jobs.jobs.find(j=>j.name==='capture').steps.find(s=>s.name==='Capture fresh rounds and missing originals without database credentials').conclusion='skipped'}],
])test(`v4 rejects changed ${name}`,actual,()=>{assert.equal(typeof checkpoint.readFussballTransportV4,'function');const p=input();change(p);assert.throws(()=>read(p))})

// TEST ONLY outer-pin rebinding: genuine inner histories/bodies still have to
// authenticate. Production reader has no pin override or JSON capability path.
async function modifiedInner(t,mutate,expected){
 const {execFileSync}=await import('node:child_process'),{mkdtempSync,writeFileSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{createHash}=await import('node:crypto'),{unpackVerifiedArchive,sha256,repository}=await import('./dfb-artifacts.mjs'),{createFussballCaptureClient,fussballRoundScope}=await import('./lib/fussball-capture.mjs')
 const base=mkdtempSync(join(tmpdir(),'fussball-v4-inner-'));t.after(()=>rmSync(base,{recursive:true,force:true}))
 const p=input(),m=JSON.parse(readFileSync(join(directory,'current-manifest.json')));mutate(m)
 const manifest=Buffer.from(JSON.stringify(m)+'\n'),zipFile=join(base,'modified.zip')
 const zip=execFileSync('python3',['-c',`import sys,zipfile,io
original,out=sys.argv[1:]
with zipfile.ZipFile(original) as src,zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as dst:
 for info in src.infolist(): dst.writestr(info,sys.stdin.buffer.read() if info.filename=='manifest.json' else src.read(info.filename))
`,join(directory,'current.zip'),zipFile],{input:manifest,maxBuffer:1024})
 assert.equal(zip.length,0)
 p.zipBytes=readFileSync(zipFile);p.artifact.digest='sha256:'+sha256(p.zipBytes);p.artifact.size_in_bytes=p.zipBytes.length
 const registry=JSON.parse(readFileSync(new URL('./policies/fussball-transport-v4.json',import.meta.url)))
 Object.assign(registry.parent,{artifactDigest:p.artifact.digest,artifactSize:p.zipBytes.length,manifestSha256:createHash('sha256').update(manifest).digest('hex')})
 const path=new URL('./fussball-checkpoint.mjs',import.meta.url),source=readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {readFussballTransportV4};'
 const read=(path,...args)=>String(path).endsWith('/policies/fussball-transport-v4.json')?JSON.stringify(registry):readFileSync(path,...args)
 const isolated=new Function('readFileSync','unpackVerifiedArchive','sha256','repository','createFussballCaptureClient','fussballRoundScope',source)(read,unpackVerifiedArchive,sha256,repository,createFussballCaptureClient,fussballRoundScope)
 assert.throws(()=>isolated.readFussballTransportV4({parent:p}),expected)
}
for(const [name,mutate,expected]of[
 ['failed request refund',m=>{m.snapshot.requests=93},/all94 spent/],
 ['cached flat receipt',m=>{m.documents.find(d=>d.origin==='cache').originalReceipt.capture.codeSha256='0'.repeat(64)},/v4 cached original\/receipt differs/],
 ['network attempt receipt',m=>{m.documents.find(d=>d.origin==='network').originalReceipt.attempt.number=94},/v4 network body\/flat receipt differs/],
 ['embedded ledger',m=>{m.checkpoint.proof.priorRequests=1517},/v4 embedded proof\/spent ledger differs/],
])test(`v4 independently refuses ${name} with rebound outer hashes`,actual,t=>modifiedInner(t,mutate,expected))
