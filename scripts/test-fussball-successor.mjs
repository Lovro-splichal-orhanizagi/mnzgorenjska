// Genuine retained bytes are required, never synthetic source-completeness proof.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {join} from 'node:path'
import * as api from './fussball-checkpoint.mjs'
import {unpackVerifiedArchive,sha256} from './dfb-artifacts.mjs'
const dir=process.env.FUSSBALL_SUCCESSOR_EVIDENCE_DIR
const genuine={skip:dir?false:'GENUINE SUCCESSOR EVIDENCE ABSENT: set FUSSBALL_SUCCESSOR_EVIDENCE_DIR to actual retained run40577717778; no actual parent authentication claimed'}
function fixture(){
 const run=JSON.parse(readFileSync(join(dir,'run.json'))),jobs=JSON.parse(readFileSync(join(dir,'jobs.json'))),artifacts=JSON.parse(readFileSync(join(dir,'artifacts.json'))).artifacts
 return Object.fromEntries([['current','fussball-season-40577717778'],['archive','fussball-season-archive-40577717778']].map(([stage,name])=>[stage,{run:structuredClone(run),jobs:structuredClone(jobs),artifact:artifacts.find(a=>a.name===name),zipBytes:readFileSync(join(dir,name+'.zip'))}]))
}
const read=input=>{assert.equal(typeof api.readFussballTransportSuccessor,'function');return api.readFussballTransportSuccessor(input)}
test('actual successful current and failed archive carry all211 spent requests and latest-only634 candidates',genuine,()=>{
 const f=fixture(),fetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('NO NETWORK')}
 try{
 const proof=read(f),docs=api.getFussballCheckpointDocuments(proof),bundle=api.exportFussballTransportCheckpoint(proof)
 assert.equal(proof.priorRequests,1423);assert.equal(proof.totalRequestCap,5000);assert.equal(proof.documentsCount,634);assert.equal(proof.preset,'baden-reviewed-transports-v3')
 assert.equal(docs.filter(d=>d.kind==='round').length,0);assert.equal(docs.filter(d=>d.kind==='report').length,76);assert.equal(docs.filter(d=>d.kind==='font').length,241)
 assert.deepEqual(bundle.parents.map(p=>p.artifact.id),[12769641870,12770031223]);assert.ok(bundle.parents[0].zipBytes.equals(f.current.zipBytes));assert.ok(bundle.parents[1].zipBytes.equals(f.archive.zipBytes))
 assert.ok(docs.find(d=>d.url.endsWith('/031DS4G7UK000000VS5489BUVUR5FS5A'))?.sha256==='d9de4b4bdbfa7027f487b895cb2f9f73e89cdf848b09741f428b2bf5a980be85')
 }finally{globalThis.fetch=fetch}
})
test('serialized caller proof cannot issue a capability or override ledger',genuine,()=>{
 assert.throws(()=>api.getFussballCheckpointDocuments({preset:'baden-reviewed-transports-v3',priorRequests:1423}),/reader-issued/)
 const f=fixture();assert.throws(()=>read({...f,priorRequests:1212}),/closed fields/)
})
for(const [label,mutate] of [
 ['missing archive',f=>{delete f.archive}],['swapped stages',f=>{[f.current,f.archive]=[f.archive,f.current]}],
 ['rerun',f=>{f.current.run.run_attempt=2}],['different source commit',f=>{f.archive.run.head_sha='0'.repeat(40)}],
 ['cancelled source',f=>{f.archive.jobs.jobs.find(j=>j.name==='archive').conclusion='cancelled'}],
 ['skipped archive accounting',f=>{f.current.jobs.jobs.find(j=>j.name==='archive').conclusion='skipped'}],
 ['altered current body ZIP',f=>{f.current.zipBytes[100]^=1}],['altered archive ZIP',f=>{f.archive.zipBytes[100]^=1}],
 ['forged artifact identity',f=>{f.archive.artifact.id=12769641870}],
])test(`successor refuses ${label}`,genuine,()=>{const f=fixture();mutate(f);assert.throws(()=>read(f),/checkpoint|digest|artifact/i)})
test('successor metadata exposes both frozen stage pins without becoming a capability',()=>{
 assert.equal(typeof api.reviewedFussballSuccessorParents,'function');assert.throws(()=>api.exportFussballSuccessorAccountedHistory({preset:'baden-reviewed-transports-v3'}),/reader-issued/);const pins=api.reviewedFussballSuccessorParents();assert.deepEqual(pins.map(p=>p.artifactId),['12769641870','12770031223']);assert.ok(Object.isFrozen(pins[0].options));assert.throws(()=>pins[0].requests=0,TypeError)
})

test('accounted history exports copied raw prior and both same-run stages only for branded successor',genuine,()=>{
 const proof=read(fixture()),h=api.exportFussballSuccessorAccountedHistory(proof)
 assert.deepEqual(Object.keys(h),['prior','current','archive']);assert.equal(h.prior.run.id,40566792786);assert.equal(h.current.artifact.id,12769641870);assert.equal(h.archive.artifact.id,12770031223)
 h.prior.zipBytes[0]^=1;h.archive.run.id=0
 const again=api.exportFussballSuccessorAccountedHistory(proof);assert.notEqual(h.prior.zipBytes[0],again.prior.zipBytes[0]);assert.equal(again.archive.run.id,40577717778)
 assert.throws(()=>api.exportFussballSuccessorAccountedHistory({...proof}),/reader-issued/)
})
function zip(entries){return execFileSync('python3',['-c',`import io,sys,json,zipfile,stat,warnings
warnings.simplefilter('ignore',UserWarning)
b=io.BytesIO()
with zipfile.ZipFile(b,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for e in json.load(sys.stdin):
  i=zipfile.ZipInfo(e['name']);i.create_system=3;i.external_attr=((stat.S_IFLNK if e.get('symlink') else stat.S_IFREG)|0o600)<<16;i.compress_type=zipfile.ZIP_DEFLATED
  z.writestr(i,b'x'*e.get('size',1))
sys.stdout.buffer.write(b.getvalue())`],{input:JSON.stringify(entries),maxBuffer:105*1024*1024})}
for(const [label,entries]of [
 ['traversal',[{name:'../manifest.json'}]],['duplicate',[{name:'manifest.json'},{name:'manifest.json'}]],['symlink',[{name:'manifest.json',symlink:true}]],['foreign nested parent',[{name:'checkpoint/parents/40577717778.zip'}]],['oversize CSS',[{name:'documents/'+'a'.repeat(64)+'.css',size:65537}]],['archive result',[{name:'result.json'}]],
])test(`closed successor ZIP refuses ${label}`,()=>{const b=zip(entries);assert.throws(()=>unpackVerifiedArchive(b,'sha256:'+sha256(b),label==='archive result'?'fussball-successor-archive':'fussball-successor-current'),/successor|ENOBUFS/i)})
// Rebind outer cryptographic pins ONLY in an isolated copied test reader. This
// exercises independent inner provenance checks; production accepts no pins.
async function inner(t,stage,mutate){
 const f=fixture(),name=stage==='current'?'fussball-season-40577717778':'fussball-season-archive-40577717778',m=JSON.parse(readFileSync(join(dir,name,'manifest.json'))),changes={}
 mutate(m,changes);changes['manifest.json']=JSON.stringify(m)+'\n'
 const bytes=execFileSync('python3',['-c',`import io,sys,json,zipfile,base64
v=json.load(sys.stdin);out=io.BytesIO()
with zipfile.ZipFile(io.BytesIO(base64.b64decode(v['zip']))) as old,zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as new:
 for i in old.infolist():new.writestr(i,base64.b64decode(v['changes'][i.filename]) if i.filename in v['changes'] else old.read(i.filename))
sys.stdout.buffer.write(out.getvalue())`],{input:JSON.stringify({zip:f[stage].zipBytes.toString('base64'),changes:Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,Buffer.from(v).toString('base64')]))}),maxBuffer:105*1024*1024})
 const r=JSON.parse(readFileSync(new URL('./policies/fussball-transport-successor.json',import.meta.url))),p=r.parents.find(p=>p.stage===stage)
 p.artifactDigest=f[stage].artifact.digest='sha256:'+sha256(bytes);p.artifactSize=f[stage].artifact.size_in_bytes=bytes.length;f[stage].zipBytes=bytes
 for(const [file,key]of [['manifest.json','manifestSha256'],['attempts.jsonl','attemptsSha256'],['progress.jsonl','progressSha256']])if(changes[file]!==undefined)p[key]=sha256(changes[file])
 const temp=mkdtempSync(join(tmpdir(),'fussball-successor-negative-'));t.after(()=>rmSync(temp,{recursive:true,force:true}));mkdirSync(join(temp,'policies'))
 let source=readFileSync(new URL('./fussball-checkpoint.mjs',import.meta.url),'utf8')
 for(const path of ['./dfb-artifacts.mjs','./lib/fussball-capture.mjs','./policies/fussball-transport-checkpoints.json','./policies/fussball-transport-resumption.json'])source=source.replaceAll("'"+path+"'",JSON.stringify(new URL(path,import.meta.url).href))
 writeFileSync(join(temp,'reader.mjs'),source);writeFileSync(join(temp,'policies/fussball-transport-successor.json'),JSON.stringify(r))
 const reader=await import(pathToFileURL(join(temp,'reader.mjs')).href)
 assert.throws(()=>reader.readFussballTransportSuccessor(f),/checkpoint|artifact|client/i)
}
for(const [label,stage,mutate]of [
 ['current HTTP403','current',m=>{m.snapshot.attempts[0].httpStatus=403}],
 ['archive spent intent missing','archive',(m,c)=>{c['attempts.jsonl']=readFileSync(join(dir,'fussball-season-archive-40577717778/attempts.jsonl'),'utf8').split('\n').slice(1).join('\n')}],
 ['archive unpaced finals','archive',m=>{m.snapshot.attempts[1].startedAt=m.snapshot.attempts[0].startedAt}],
 ['cached flat receipt forgery','current',m=>{m.documents.find(d=>d.origin==='cache').originalReceipt.attempt.number=0}],
 ['nested public proof forgery','current',m=>{m.checkpoint.proof.priorRequests=1114}],
 ['archive parent receipt forgery','archive',m=>{m.archiveParent.originalReceipt.attempt.number=0}],
 ['archive source body changed','archive',(m,c)=>{c[m.documents[0].file]='changed source original'}],
])test(`inner successor gate refuses ${label}`,genuine,async t=>inner(t,stage,mutate))
test('legacy-only copied reader does not require the unrelated successor registry',async t=>{
 const temp=mkdtempSync(join(tmpdir(),'fussball-successor-legacy-'));t.after(()=>rmSync(temp,{recursive:true,force:true}))
 let source=readFileSync(new URL('./fussball-checkpoint.mjs',import.meta.url),'utf8')
 for(const path of ['./dfb-artifacts.mjs','./lib/fussball-capture.mjs','./policies/fussball-transport-checkpoints.json','./policies/fussball-transport-resumption.json'])source=source.replaceAll("'"+path+"'",JSON.stringify(new URL(path,import.meta.url).href))
 writeFileSync(join(temp,'reader.mjs'),source)
 const reader=await import(pathToFileURL(join(temp,'reader.mjs')).href);assert.equal(reader.reviewedFussballResumptionParent().runId,'40566792786')
})
