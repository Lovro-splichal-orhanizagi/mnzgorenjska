// Genuine positives require explicitly supplied private raw Actions evidence.
// Constructed ZIPs are rejection controls and never claim source completeness.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {unpackVerifiedArchive,sha256} from './dfb-artifacts.mjs'
const api=await import('./fussball-checkpoint.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}})
const call=(name,...args)=>{assert.equal(typeof api[name],'function',`${name} required`);return api[name](...args)}
const read=input=>call('readFussballTransportCheckpoint',input)
const directory=process.env.FUSSBALL_CHECKPOINT_EVIDENCE_DIR
const genuine={skip:directory?false:'GENUINE CHECKPOINT EVIDENCE ABSENT: set FUSSBALL_CHECKPOINT_EVIDENCE_DIR; no actual parent authentication claimed'}
const runs=['40416972177','40509926697','40531709101']
const fixture=()=>({parents:runs.map(id=>{const p=join(directory,id),json=f=>JSON.parse(readFileSync(join(p,f),'utf8'));return {run:json('run.json'),artifact:json('artifact.json'),jobs:json('jobs.json'),zipBytes:readFileSync(join(p,'source.zip'))}}),now:Date.parse('2026-10-28T00:00:00Z')})
function zip(entries){return execFileSync('python3',['-c',`import sys,io,json,zipfile,stat,warnings
warnings.simplefilter('ignore',UserWarning)
out=io.BytesIO()
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for e in json.load(sys.stdin):
  i=zipfile.ZipInfo(e['name']);i.create_system=3;i.compress_type=zipfile.ZIP_DEFLATED;i.external_attr=((stat.S_IFLNK if e.get('symlink') else stat.S_IFREG)|0o600)<<16
  z.writestr(i,b'x'*e.get('size',2))
sys.stdout.buffer.write(out.getvalue())`],{input:JSON.stringify(entries),maxBuffer:105*1024*1024})}
function replaceManifest(id,manifest){return execFileSync('python3',['-c',`import sys,io,zipfile
out=io.BytesIO()
with zipfile.ZipFile(sys.argv[1]) as old, zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as new:
 replacement=sys.stdin.buffer.read()
 for entry in old.infolist(): new.writestr(entry,replacement if entry.filename=='manifest.json' else old.read(entry.filename))
sys.stdout.buffer.write(out.getvalue())`,join(directory,id,'source.zip')],{input:JSON.stringify(manifest)+'\n',maxBuffer:105*1024*1024})}

test('checkpoint reader refuses caller-written counts, pins and capabilities',()=>{
 assert.equal(typeof api.readFussballTransportCheckpoint,'function','reader required')
 for(const f of [null,{}, {parents:[],now:Date.now()}, {parents:[],priorRequests:1114,verified:true}])assert.throws(()=>read(f),/checkpoint/)
 for(const f of [{},Object.freeze({preset:'baden-reviewed-transports-v1',priorRequests:1114})])for(const method of ['getFussballCheckpointDocuments','exportFussballTransportCheckpoint'])assert.throws(()=>call(method,f),/checkpoint/)
})
test('download pin metadata cannot be edited into a new approved parent set',()=>{
 const pins=call('reviewedFussballCheckpointParents');assert.deepEqual(pins.map(p=>p.runId),runs)
 assert.ok(Object.isFrozen(pins)&&pins.every(Object.isFrozen));assert.throws(()=>{pins[0].requests=0},TypeError)
 assert.equal(call('reviewedFussballCheckpointParents')[0].requests,508)
})
test('genuine reviewed failures provide only 572 immutable nonround originals and all1114 spent requests',genuine,()=>{
 const f=fixture(),p=read(f)
 assert.equal(p.preset,'baden-reviewed-transports-v1');assert.equal(p.priorRequests,1114);assert.equal(p.totalRequestCap,5000);assert.equal(p.documentsCount,572)
 assert.deepEqual(p.parents.map(x=>[x.runId,x.requests]),[['40416972177',508],['40509926697',48],['40531709101',105]])
 assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.parents)&&Object.isFrozen(p.scope)&&p.parents.every(Object.isFrozen))
 const docs=call('getFussballCheckpointDocuments',p)
 assert.equal(docs.length,572);assert.equal(new Set(docs.map(d=>d.url)).size,572)
 for(const d of docs){assert.notEqual(d.kind,'round');assert.ok(Buffer.isBuffer(d.bytes));assert.equal(sha256(d.bytes),d.sha256);assert.equal(d.originalReceipt.document.bytes,d.bytes.length);assert.equal(d.originalReceipt.attempt.status,'success');assert.equal(d.originalReceipt.attempt.httpStatus,200);assert.equal(d.capturedAt,d.originalReceipt.attempt.startedAt)}
 assert.equal(Object.hasOwn(p,'verified'),false);assert.equal(Object.hasOwn(p,'success'),false);assert.equal(Object.hasOwn(p,'activationEligible'),false)
 for(const copy of [{...p},structuredClone(p)])assert.throws(()=>call('getFussballCheckpointDocuments',copy),/checkpoint/)
})
test('export independently authenticates complete raw parents and copies all byte ownership',genuine,()=>{
 const f=fixture(),p=read(f),saved=call('exportFussballTransportCheckpoint',p)
 assert.equal(saved.proof,p);assert.notEqual(saved.parents[0],f.parents[0]);assert.ok(Buffer.isBuffer(saved.parents[0].zipBytes))
 assert.deepEqual(read({parents:saved.parents,now:f.now}),p)
 const docs=call('getFussballCheckpointDocuments',p),first=docs[0].bytes[0];docs[0].bytes[0]^=1;docs[0].originalReceipt.attempt.number=999
 assert.equal(call('getFussballCheckpointDocuments',p)[0].bytes[0],first)
 saved.parents[0].zipBytes[0]^=1;saved.parents[0].run.id=0
 assert.equal(call('exportFussballTransportCheckpoint',p).parents[0].run.id,40416972177)
 assert.equal(call('getFussballCheckpointDocuments',p)[0].originalReceipt.attempt.number,call('getFussballCheckpointDocuments',read(f))[0].originalReceipt.attempt.number)
})
test('identical overlapping originals use latest genuine receipt without refreshing its time',genuine,()=>{
 const p=read(fixture()),docs=call('getFussballCheckpointDocuments',p),all=[]
 for(const id of runs){const m=JSON.parse(execFileSync('unzip',['-p',join(directory,id,'source.zip'),'manifest.json']));for(const d of m.documents)if(d.kind!=='round')all.push({...d,parent:id})}
 const repeated=all.find(d=>all.some(e=>d.url===e.url&&d.capturedAt<e.capturedAt));assert.ok(repeated,'genuine overlap required')
 const latest=all.filter(d=>d.url===repeated.url).sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt))[0],chosen=docs.find(d=>d.url===latest.url)
 assert.equal(chosen.capturedAt,latest.capturedAt);assert.equal(chosen.originalReceipt.document.capturedAt,latest.capturedAt)
})
test('reader is offline and retained spend does not expire with artifact download availability',genuine,()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('NETWORK FORBIDDEN')}
 try{const f=fixture();f.now=Date.parse('2030-01-01T00:00:00Z');for(const p of f.parents)p.artifact.expired=true;assert.equal(read(f).priorRequests,1114)}finally{globalThis.fetch=original}
})
for(const [name,mutate]of[
 ['missing parent',f=>f.parents.pop()],['duplicate parent',f=>f.parents[1]=f.parents[0]],['swapped parents',f=>f.parents.reverse()],
 ['unreviewed caller pins',f=>f.registry={}],['parent proof flag',f=>f.parents[0].verified=true],['null clock',f=>f.now=null],['nonfinite clock',f=>f.now=NaN],['future parent',f=>f.now=Date.parse('2026-10-27T15:42:14Z')],
 ['run attempt2',f=>f.parents[0].run.run_attempt=2],['cancelled parent',f=>f.parents[0].run.conclusion='cancelled'],['wrong source code',f=>f.parents[1].run.head_sha='a'.repeat(40)],
 ['source capture not failed',f=>f.parents[0].jobs.jobs[0].steps.find(s=>s.name==='Capture ordinary public source, without database credentials').conclusion='success'],
 ['missing successful upload',f=>f.parents[0].jobs.jobs[0].steps.find(s=>s.name==='Source bytes, request journal and coverage').conclusion='failure'],
 ['incomplete jobs envelope',f=>f.parents[0].jobs.total_count++],['duplicate capture job',f=>{f.parents[0].jobs.jobs.push(f.parents[0].jobs.jobs[0]);f.parents[0].jobs.total_count++}],
 ['wrong artifact ID',f=>f.parents[0].artifact.id++],['wrong artifact hash',f=>f.parents[0].artifact.digest='sha256:'+'a'.repeat(64)],['tampered raw ZIP',f=>f.parents[0].zipBytes[500]^=1],
])test(`fixed genuine checkpoint refuses ${name}`,genuine,()=>{const f=fixture();mutate(f);assert.throws(()=>read(f),/checkpoint|[Aa]rtifact/)} )

for(const [name,mutate]of[
 ['HTTP refusal',m=>{m.snapshot.attempts.at(-1).httpStatus=403;m.snapshot.attempts.at(-1).error='source request failed (HTTP 403)'}],
 ['HTTP429',m=>m.snapshot.attempts.at(-1).httpStatus=429],['challenge',m=>m.error=m.snapshot.stopReason=m.snapshot.attempts.at(-1).error='source challenge detected'],
 ['unknown terminal cause',m=>m.error=m.snapshot.stopReason=m.snapshot.attempts.at(-1).error='unknown'],['request refund',m=>m.snapshot.requests--],
 ['missing successful document',m=>m.documents.pop()],['duplicate successful document',m=>m.documents[1]=m.documents[0]],
 ['changed successful body binding',m=>m.documents[0].sha256='a'.repeat(64)],['conflicting nonround URL',m=>m.documents.find(d=>d.kind!=='round').url=m.documents.find(d=>d.kind==='font').url],
])test(`caller rehash cannot authorize ${name}`,genuine,()=>{
 const f=fixture(),m=JSON.parse(execFileSync('unzip',['-p',join(directory,runs[0],'source.zip'),'manifest.json']));mutate(m)
 // Replacement is deliberately unauthentic; registry pins must reject it.
 f.parents[0].zipBytes=replaceManifest(runs[0],m);f.parents[0].artifact.size_in_bytes=f.parents[0].zipBytes.length;f.parents[0].artifact.digest='sha256:'+sha256(f.parents[0].zipBytes)
 assert.throws(()=>read(f),/checkpoint|[Aa]rtifact/)
})

test('new ZIP kind accepts only bounded regular checkpoint members',()=>{
 const entries=[{name:'manifest.json'},{name:'attempts.jsonl'},{name:'progress.jsonl'},{name:'documents/'+'a'.repeat(64)+'.html'}],bytes=zip(entries)
 assert.equal(unpackVerifiedArchive(bytes,'sha256:'+sha256(bytes),'fussball-checkpoint').size,4)
})
for(const [name,entries]of[
 ['path traversal',[{name:'../manifest.json'}]],['directory',[{name:'documents/'}]],['absolute path',[{name:'/manifest.json'}]],
 ['symlink',[{name:'manifest.json',symlink:true}]],['duplicate member',[{name:'manifest.json'},{name:'manifest.json'}]],
 ['unknown file',[{name:'result.json'}]],['oversizedCSS',[{name:'documents/'+'a'.repeat(64)+'.css',size:65537}]],
])test(`checkpoint ZIP rejects ${name}`,()=>{const bytes=zip(entries);assert.throws(()=>unpackVerifiedArchive(bytes,'sha256:'+sha256(bytes),'fussball-checkpoint'),/[Aa]rtifact|checkpoint/)})
