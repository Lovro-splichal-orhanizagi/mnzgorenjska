// Actual retained outer/nested bytes are positives. Modified ZIPs are TEST ONLY
// rejection controls, never source completeness or source execution authority.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {unpackVerifiedArchive,sha256} from './dfb-artifacts.mjs'
import * as api from './fussball-checkpoint.mjs'
const dir=process.env.FUSSBALL_RESUMPTION_EVIDENCE_DIR,genuine={skip:dir?false:'Actual fourth raw artifact required; set FUSSBALL_RESUMPTION_EVIDENCE_DIR'}
const fixture=()=>({parent:{...Object.fromEntries(['run','artifact','jobs'].map(k=>[k,JSON.parse(readFileSync(join(dir,k+'.json')))])),zipBytes:readFileSync(join(dir,'source.zip'))},now:Date.parse('2026-10-28T00:00:00Z')})
const read=input=>{assert.equal(typeof api.readFussballTransportResumption,'function');return api.readFussballTransportResumption(input)}
const registry=()=>JSON.parse(readFileSync(new URL('./policies/fussball-transport-resumption.json',import.meta.url)))
function zip(entries){return execFileSync('python3',['-c',`import sys,io,json,zipfile,stat,warnings
warnings.simplefilter('ignore',UserWarning)
out=io.BytesIO()
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for e in json.load(sys.stdin):
  i=zipfile.ZipInfo(e['name']);i.create_system=3;i.compress_type=zipfile.ZIP_DEFLATED;i.external_attr=((stat.S_IFLNK if e.get('symlink') else stat.S_IFREG)|0o600)<<16
  z.writestr(i,b'x'*e.get('size',2))
sys.stdout.buffer.write(out.getvalue())`],{input:JSON.stringify(entries),maxBuffer:105*1024*1024})}
function repack(bytes,changes){return execFileSync('python3',['-c',`import sys,io,json,zipfile,base64
v=json.load(sys.stdin);out=io.BytesIO()
with zipfile.ZipFile(io.BytesIO(base64.b64decode(v['zip']))) as old,zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as new:
 for info in old.infolist():new.writestr(info,base64.b64decode(v['changes'][info.filename]) if info.filename in v['changes'] else old.read(info.filename))
sys.stdout.buffer.write(out.getvalue())`],{input:JSON.stringify({zip:bytes.toString('base64'),changes:Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,Buffer.from(v).toString('base64')]))}),maxBuffer:105*1024*1024})}
// Isolated copied reader + deliberately altered local pins exercises inner gates
// behind outer cryptographic pins. Production reader never accepts these pins.
async function isolated(t,input,changes){
 const temp=mkdtempSync(join(tmpdir(),'fussball-resumption-reject-'));t.after(()=>rmSync(temp,{recursive:true,force:true}));mkdirSync(join(temp,'policies'))
 const r=registry();input.parent.zipBytes=repack(input.parent.zipBytes,changes);r.parent.artifactDigest=input.parent.artifact.digest='sha256:'+sha256(input.parent.zipBytes);r.parent.artifactSize=input.parent.artifact.size_in_bytes=input.parent.zipBytes.length
 for(const [key,file]of [['manifestSha256','manifest.json'],['attemptsSha256','attempts.jsonl'],['progressSha256','progress.jsonl']])if(changes[file])r.parent[key]=sha256(changes[file])
 let source=readFileSync(new URL('./fussball-checkpoint.mjs',import.meta.url),'utf8')
 for(const path of ['./dfb-artifacts.mjs','./lib/fussball-capture.mjs','./policies/fussball-transport-checkpoints.json'])source=source.replaceAll("'"+path+"'",JSON.stringify(new URL(path,import.meta.url).href))
 writeFileSync(join(temp,'reader.mjs'),source);writeFileSync(join(temp,'policies/fussball-transport-resumption.json'),JSON.stringify(r))
 return (await import(pathToFileURL(join(temp,'reader.mjs')).href)).readFussballTransportResumption
}
function files(f){return unpackVerifiedArchive(f.parent.zipBytes,f.parent.artifact.digest,'fussball-resumption')}
test('resumption has distinct closed API and rejects caller capability/pins/counts',()=>{
 assert.equal(typeof api.readFussballTransportResumption,'function');assert.equal(typeof api.reviewedFussballResumptionParent,'function')
 for(const v of [{},{parent:{}},{parent:{},priorRequests:1212},{parent:{},registry:{}},{parent:{},now:null}])assert.throws(()=>read(v),/checkpoint/)
 assert.throws(()=>api.getFussballCheckpointDocuments({preset:'baden-reviewed-transports-v2',documentsCount:631}),/checkpoint/)
 const pin=api.reviewedFussballResumptionParent();assert.equal(pin.runId,'40566792786');assert.ok(Object.isFrozen(pin)&&Object.isFrozen(pin.options));assert.throws(()=>pin.requests=0,TypeError)
})
test('actual fourth parent reauthenticates nested v1 and yields631 cache-only candidates without either conflict pair',genuine,()=>{
 const f=fixture(),original=globalThis.fetch;globalThis.fetch=()=>{throw Error('NETWORK FORBIDDEN')}
 try{
  const p=read(f),docs=api.getFussballCheckpointDocuments(p),r=registry();assert.deepEqual(Object.keys(p).sort(),['documentsCount','documentsSha256','parents','preset','priorRequests','scope','totalRequestCap']);assert.equal(p.preset,'baden-reviewed-transports-v2');assert.equal(p.priorRequests,1212);assert.equal(p.totalRequestCap,5000);assert.equal(docs.length,631);assert.equal(new Set(docs.map(d=>d.url)).size,631);assert.equal(p.parents.length,1);assert.equal(p.parents[0].runId,'40566792786');assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.parents[0]));assert.equal(p.documentsSha256,'ce374d05ce4bf4a0d887ca41c7c237a178c46fe1a6c044ae3f65235b8af13ffa')
  for(const d of docs){assert.notEqual(d.kind,'round');assert.equal(sha256(d.bytes),d.sha256);assert.equal(d.capturedAt,d.originalReceipt.document.capturedAt);assert.equal(d.capturedAt,d.originalReceipt.attempt.startedAt);assert.equal(d.originalReceipt.attempt.httpStatus,200)}
  assert.equal(docs.filter(d=>d.originalReceipt.capture.createdAt==='2026-10-27T19:12:30.777Z').length,63)
  for(const c of r.conflicts)assert.ok(!docs.some(d=>d.url===c.url||d.sha256===c.oldSha256||d.sha256===c.newSha256))
  const saved=api.exportFussballTransportCheckpoint(p);assert.equal(saved.parents.length,1);assert.deepEqual(read({parent:saved.parents[0],now:f.now}),p);saved.parents[0].zipBytes[0]^=1;docs[0].bytes[0]^=1;assert.equal(api.exportFussballTransportCheckpoint(p).parents[0].zipBytes[0],f.parent.zipBytes[0]);assert.equal(sha256(api.getFussballCheckpointDocuments(p)[0].bytes),api.getFussballCheckpointDocuments(p)[0].sha256)
  assert.throws(()=>api.getFussballCheckpointDocuments(structuredClone(p)),/checkpoint/)
 }finally{globalThis.fetch=original}
})
for(const [name,mutate]of[
 ['attempt2',f=>f.parent.run.run_attempt=2],['cancelled',f=>f.parent.run.conclusion='cancelled'],['success',f=>f.parent.run.conclusion='success'],['wrong workflow',f=>f.parent.run.path='.github/workflows/preveri-fussball-sezono.yml'],['wrong commit',f=>f.parent.run.head_sha='a'.repeat(40)],['future clock',f=>f.now=Date.parse('2026-10-27T19:22:13Z')],['missing jobs',f=>f.parent.jobs.total_count++],['wrong job',f=>f.parent.jobs.jobs[0].id++],['upload failed',f=>f.parent.jobs.jobs[0].steps.find(s=>s.name==='Preserve source originals, checkpoint provenance and request journal').conclusion='failure'],['replay ran',f=>f.parent.jobs.jobs[0].steps.find(s=>s.name==='Independently replay only retained original documents').conclusion='success'],['raw zip swap',f=>f.parent.zipBytes[500]^=1],['caller flags',f=>f.parent.verified=true],['cap downgrade',f=>f.totalRequestCap=5000],
])test(`actual resumption refuses ${name}`,genuine,()=>{const f=fixture();mutate(f);assert.throws(()=>read(f),/checkpoint|[Aa]rtifact/)} )
for(const [name,mutate]of[
 ['HTTP403',m=>m.snapshot.attempts.at(-1).httpStatus=403],['challenge',m=>m.error=m.snapshot.stopReason=m.snapshot.attempts.at(-1).error='source challenge detected'],['timeout',m=>m.error=m.snapshot.stopReason=m.snapshot.attempts.at(-1).error='TimeoutError'],['budget refund',m=>m.snapshot.requests=97],['wrong season',m=>m.options.season='2025/26'],['wrong max allowance',m=>m.options.maxRequests=788],['copied checkpoint',m=>m.checkpoint.proof.priorRequests=1212],['missing journal attempt',m=>m.snapshot.attempts.pop()],['cached receipt time',m=>m.documents.find(d=>d.origin==='cache').originalReceipt.document.capturedAt='2026-10-27T19:12:30.777Z'],['missing network receipt',m=>delete m.documents.find(d=>d.origin==='network').originalReceipt],
])test(`isolated TEST ONLY repinned control refuses ${name}`,genuine,async t=>{
 const f=fixture(),m=JSON.parse(files(f).get('manifest.json'));mutate(m);const changes={'manifest.json':Buffer.from(JSON.stringify(m)+'\n')},reader=await isolated(t,f,changes);assert.throws(()=>reader(f),/checkpoint|[Aa]rtifact/)
})
test('isolated repinned nested metadata and cached body swaps still fail independent authentication',genuine,async t=>{
 for(const type of ['nested','body']){
  const f=fixture(),map=files(f),m=JSON.parse(map.get('manifest.json'));let changes
  if(type==='nested'){const path='checkpoint/parents/40416972177.json',v=JSON.parse(map.get(path));v.run.conclusion='success';changes={[path]:Buffer.from(JSON.stringify(v))}}
  else{const d=m.documents.find(d=>d.origin==='cache'),b=Buffer.from(map.get(d.file));b[0]^=1;changes={[d.file]:b}}
  const reader=await isolated(t,f,changes);assert.throws(()=>reader(f),/checkpoint|[Aa]rtifact/)
 }
})
test('separate resumption ZIP permits exact nested paths without widening v1',()=>{
 const bytes=zip([{name:'manifest.json'},{name:'checkpoint/parents/40416972177.json'},{name:'checkpoint/parents/40416972177.zip'}]);assert.equal(unpackVerifiedArchive(bytes,'sha256:'+sha256(bytes),'fussball-resumption').size,3);assert.throws(()=>unpackVerifiedArchive(bytes,'sha256:'+sha256(bytes),'fussball-checkpoint'),/checkpoint/)
})
for(const [name,entries]of[
 ['arbitrary nested parent',[{name:'checkpoint/parents/40566792786.zip'}]],['recursive nesting',[{name:'checkpoint/parents/40416972177/checkpoint.zip'}]],['traversal',[{name:'checkpoint/parents/../manifest.json'}]],['absolute',[{name:'/manifest.json'}]],['directory',[{name:'checkpoint/parents/'}]],['symlink',[{name:'manifest.json',symlink:true}]],['duplicate',[{name:'manifest.json'},{name:'manifest.json'}]],['result',[{name:'result.json'}]],['large CSS',[{name:'documents/'+'a'.repeat(64)+'.css',size:65537}]],
])test(`resumption ZIP refuses ${name}`,()=>{const bytes=zip(entries);assert.throws(()=>unpackVerifiedArchive(bytes,'sha256:'+sha256(bytes),'fussball-resumption'),/[Aa]rtifact|[Rr]esumption/)} )
test('isolated TEST ONLY unexpected CSS overlap reaches conflict gate; no generic latest wins',genuine,async t=>{
 const f=fixture(),map=files(f),m=JSON.parse(map.get('manifest.json')),parents=m.checkpoint.parentFiles.map(p=>({...JSON.parse(map.get(p.metadataFile)),zipBytes:map.get(p.zipFile)})),old=api.getFussballCheckpointDocuments(api.readFussballTransportCheckpoint({parents,now:f.now}))
 const prior=old.find(d=>d.kind==='css'&&!m.documents.some(e=>e.url===d.url)),d=m.documents.find(d=>d.origin==='network'&&d.kind==='css'),attempt=m.snapshot.attempts.find(a=>a.url===d.url),journal=map.get('attempts.jsonl').toString().trimEnd().split('\n').map(JSON.parse)
 assert.ok(prior&&prior.sha256!==d.sha256);d.url=attempt.url=journal[attempt.number-1].url=prior.url;d.originalReceipt.document.url=prior.url;d.originalReceipt.attempt.url=prior.url
 const changes={'manifest.json':Buffer.from(JSON.stringify(m)+'\n'),'attempts.jsonl':Buffer.from(journal.map(x=>JSON.stringify(x)+'\n').join(''))},reader=await isolated(t,f,changes)
 assert.throws(()=>reader(f),/unexpected retained URL\/kind\/body conflict requires review/)
})
test('isolated TEST ONLY cached old revision cannot replace an excluded fresh pair',genuine,async t=>{
 const f=fixture(),map=files(f),m=JSON.parse(map.get('manifest.json')),d=m.documents.find(d=>d.origin==='network'&&d.kind==='report');d.origin='cache'
 const reader=await isolated(t,f,{'manifest.json':Buffer.from(JSON.stringify(m)+'\n')})
 assert.throws(()=>reader(f),/cached body\/flat receipt must match authenticated old original/)
})
