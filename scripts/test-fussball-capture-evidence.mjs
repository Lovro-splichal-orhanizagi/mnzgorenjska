import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'

const api=await import('./fussball-capture-evidence.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error})
const seedUrl='https://www.fussball.de/spieltag/-/staffel/031EKNM2HG00000LVS5489BUVUR5FS5A-G'
const options={seedUrl,staffel:'031EKNM2HG00000LVS5489BUVUR5FS5A-G',season:'2026/27',maxRequests:2,reportLimit:0}
const fixture=Buffer.from('<html><head></head><body>retained source bytes</body></html>')
const collector=async({client,...input})=>{
 const doc=await client.read(input.seedUrl,'round')
 assert.deepEqual(Buffer.from(doc.bytes),fixture)
 return {version:1,scope:{provider:'fussball',seedUrl:input.seedUrl,staffel:input.staffel,season:input.season},coverage:{sampled:true},activationEligible:false}
}
async function sample(run){
 assert.equal(typeof api.captureFussballDirectory,'function')
 const parent=mkdtempSync(join(tmpdir(),'slff-fussball-evidence-')),directory=join(parent,'capture')
 try{return await run({parent,directory})}finally{rmSync(parent,{recursive:true,force:true})}
}
const network=async()=>new Response(fixture,{headers:{'content-type':'text/html; charset=UTF-8'}})

test('capture retains exact content-addressed bytes and can replay without network',async()=>sample(async({directory})=>{
 const manifest=await api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:collector})
 assert.equal(manifest.success,true);assert.equal(manifest.snapshot.requests,1);assert.equal(manifest.documents.length,1)
 assert.deepEqual(readFileSync(join(directory,manifest.documents[0].file)),fixture)
 const replay=await api.verifyFussballDirectory(directory,{collectFn:collector})
 assert.equal(replay.verified,true);assert.equal(replay.activationEligible,false)
 assert.equal(readFileSync(join(directory,'attempts.jsonl'),'utf8').trim().split('\n').length,1)
 assert.match(manifest.options.asOfDate,/^20\d{2}-\d{2}-\d{2}$/)
}))
test('a source failure preserves partial journal and original documents with false success',async()=>sample(async({directory})=>{
 await assert.rejects(()=>api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:async args=>{await collector(args);throw Error('source traversal stopped')}}),/source traversal stopped/)
 const m=JSON.parse(readFileSync(join(directory,'manifest.json')))
 assert.equal(m.success,false);assert.equal(m.documents.length,1);assert.equal(m.resultSha256,null)
 await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:collector}),/incomplete|failed/)
}))
test('capture refuses an existing output directory before any source request',async()=>sample(async({directory})=>{
 await api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:collector})
 let requests=0
 await assert.rejects(()=>api.captureFussballDirectory({directory,options,fetchFn:()=>{requests++;throw Error('must not request')},collectFn:collector}),/exist|fresh/)
 assert.equal(requests,0)
}))
test('offline verification rejects changed raw bytes before replay',async()=>sample(async({directory})=>{
 const m=await api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:collector})
 writeFileSync(join(directory,m.documents[0].file),'changed')
 await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:()=>assert.fail('no replay')}),/hash|bytes|digest/)
}))
test('offline verification rejects unsafe paths and symlinked source documents',async()=>sample(async({directory,parent})=>{
 const m=await api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:collector})
 const path=join(directory,m.documents[0].file);rmSync(path);writeFileSync(join(parent,'foreign'),fixture);symlinkSync(join(parent,'foreign'),path)
 await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:collector}),/regular|symbolic|symlink/)
 rmSync(path);writeFileSync(path,fixture);m.documents[0].file='../foreign';writeFileSync(join(directory,'manifest.json'),JSON.stringify(m))
 await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:collector}),/path|document/)
}))
test('offline verification rejects altered result, code fingerprint, request accounting and source status',async()=>sample(async({directory})=>{
 const m=await api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:collector})
 const original=readFileSync(join(directory,'manifest.json'),'utf8'),result=readFileSync(join(directory,'result.json'))
 writeFileSync(join(directory,'result.json'),'{}\n');await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:collector}),/result|digest/);writeFileSync(join(directory,'result.json'),result)
 for(const mutate of [x=>x.codeSha256='0'.repeat(64),x=>x.snapshot.requests++,x=>x.documents[0].status=403]){
  const changed=JSON.parse(original);mutate(changed);writeFileSync(join(directory,'manifest.json'),JSON.stringify(changed))
  await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:collector}),/code|request|document|status/)
 }
 writeFileSync(join(directory,'manifest.json'),original)
 assert.equal((await api.verifyFussballDirectory(directory,{collectFn:collector})).verified,true)
}))
test('capture pins an explicit calendar day and refuses invalid day values before network',async()=>sample(async({directory})=>{
 let calls=0
 await assert.rejects(()=>api.captureFussballDirectory({directory,options:{...options,asOfDate:'2026-02-30'},fetchFn:()=>{calls++;throw Error('no request')},collectFn:collector}),/date|day/)
 assert.equal(calls,0)
 const m=await api.captureFussballDirectory({directory,options:{...options,asOfDate:'2026-10-22'},fetchFn:network,collectFn:collector})
 assert.equal(m.options.asOfDate,'2026-10-22')
}))
