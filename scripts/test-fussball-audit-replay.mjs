import test from 'node:test'
import assert from 'node:assert/strict'
test('replay module exposes source-only producer/reader and rejects serialized capabilities',async()=>{
 const api=await import('./fussball-audit-replay.mjs')
 assert.equal(typeof api.produceFussballAuditReplay,'function')
 assert.equal(typeof api.readFussballAuditReplay,'function')
 assert.throws(()=>api.getFussballAuditReplay({sourceEligible:true}),/reader-issued/)
 let calls=0
 await assert.rejects(api.readFussballAuditReplay({replayRunId:'1',replayHead:'a'.repeat(40),github:async()=>{calls++;throw Error('not authorized')},requireFresh:false}))
 assert.equal(calls,0)
})
import {readFileSync} from 'node:fs'
import {hostedFixture,replayRunId,replayHead,prefix,replayStep,uploadStep,isolatedReplay,hash} from './fussball-audit-replay-test-fixture.mjs'
const input=f=>({replayRunId,replayHead,github:f.github})

test('TEST CONTROL producer and synthetic GET protocol reader preserve original source identity, bytes and clock',async t=>{
 const f=await hostedFixture(t),proof=await f.api.readFussballAuditReplay(input(f))
 assert.equal(proof.sourceAuthenticationOnly,true);assert.equal(proof.nativeEligible,false);assert.equal(proof.activationEligible,false)
 assert.equal(proof.source.sourceHead,'de77b661cbc11d95256a500e57c2fdea861a0647');assert.equal(proof.replayHead,replayHead)
 assert.equal(proof.source.currentCreatedAt,f.source.stages.current.manifest.createdAt);assert.equal(proof.source.currentFreshUntil,f.certificate.source.currentFreshUntil)
 assert.deepEqual(proof.source.requests,{current:1,archive:1});assert.equal(proof.source.priorRequests,1568)
 const state=f.api.getFussballAuditReplay(proof);assert.deepEqual(Object.keys(state.source.stages.current).sort(),['artifact','zipBytes']);assert.ok(state.source.stages.current.zipBytes.equals(f.source.stages.current.zipBytes))
 state.zipBytes[0]^=1;state.source.stages.archive.zipBytes[0]^=1;state.certificate.replayHead='forged'
 const again=f.api.getFussballAuditReplay(proof);assert.equal(again.certificate.replayHead,replayHead);assert.ok(again.source.stages.archive.zipBytes.equals(f.source.stages.archive.zipBytes))
 assert.throws(()=>f.api.getFussballAuditReplay({...proof}),/reader-issued/)
 assert.ok(f.calls.every(c=>c.path.startsWith(prefix)));assert.equal(f.source.calls.filter(c=>c.binary).length,2,'source ZIP GETs occur once in producer; reader reuses digest-authenticated wire')
})

for(const [label,change]of[
 ['wrong replay head',f=>f.run.head_sha='b'.repeat(40)],['rerun',f=>f.run.run_attempt=2],['live replay',f=>f.run.status='in_progress'],['failed replay',f=>f.run.conclusion='failure'],['wrong repository',f=>f.run.head_repository.full_name='other/repo'],['wrong workflow',f=>f.run.path='.github/workflows/other.yml'],['changed main',f=>f.main.commit.sha='b'.repeat(40)],
 ['missing replay job',f=>f.jobs={total_count:0,jobs:[]}],['wrong job binding',f=>f.jobs.jobs[0].run_id=4],['wrong job head',f=>f.jobs.jobs[0].head_sha='b'.repeat(40)],['failed replay step',f=>f.jobs.jobs[0].steps[1].conclusion='failure'],['missing stage replay',f=>f.jobs.jobs[0].steps=f.jobs.jobs[0].steps.filter(s=>s.name!==replayStep)],['missing upload',f=>f.jobs.jobs[0].steps=f.jobs.jobs[0].steps.filter(s=>s.name!==uploadStep)],
 ['expired artifact',f=>f.artifact.expired=true],['wrong artifact head',f=>f.artifact.workflow_run.head_sha='b'.repeat(40)],['wrong artifact name',f=>f.artifact.name='other'],['artifact digest tamper',f=>f.zipBytes[0]^=1],['oversize combined artifact',f=>f.artifact.size_in_bytes=1024*1024*1024+1],
 ['extra certificate member',f=>{f.files.set('arbitrary.json',Buffer.from('{}'));f.refresh()}],['missing archive originals',f=>{f.files.delete('archive.zip');f.refresh()}],['original ZIP body changed',f=>{f.files.get('current.zip')[0]^=1;f.refresh()}],
 ['rebound source summary',f=>f.recertify(c=>c.source.sourceHead='b'.repeat(40))],['native eligibility',f=>f.recertify(c=>c.nativeEligible=true)],['runtime hash tamper',f=>f.recertify(c=>c.runtime['scripts/fussball-audit-replay.mjs']='0'.repeat(64))],['restart freshness clock',f=>f.recertify(c=>c.source.currentFreshUntil=new Date(Date.now()+24*3600_000).toISOString())],
])test(`hosted certificate rejects ${label}`,async t=>{const f=await hostedFixture(t);change(f);await assert.rejects(f.api.readFussballAuditReplay(input(f)))})

test('TEST CONTROL metadata bytes, immutable runtime code, and final replay metadata drift are authenticated',async t=>{
 const f=await hostedFixture(t);f.files.get('source-metadata.json')[2]^=1;f.refresh();await assert.rejects(f.api.readFussballAuditReplay(input(f)))
 const g=await hostedFixture(t);g.controls.change=(path,v)=>path.includes('/contents/')?{...v,content:Buffer.from('wrong code').toString('base64')}:v;await assert.rejects(g.api.readFussballAuditReplay(input(g)),/installed runtime differs/)
 const h=await hostedFixture(t);let reads=0;h.controls.change=(path,v)=>path.endsWith('/runs/'+replayRunId)&&++reads===2?{...v,updated_at:new Date(Date.now()).toISOString()}:v
 await assert.rejects(h.api.readFussballAuditReplay(input(h)),/metadata\/main\/runtime changed/)
})

test('TEST CONTROL genuine source metadata is fetched anew; failed/missing source stages cannot be laundered',async t=>{
 for(const change of [f=>f.source.run.status='in_progress',f=>f.source.jobs.jobs[1].conclusion='failure',f=>f.source.stages.current.artifact.digest='sha256:'+'0'.repeat(64)]){
  const f=await hostedFixture(t);change(f);await assert.rejects(f.api.readFussballAuditReplay(input(f)))
 }
})

test('TEST CONTROL private replay getter and reread retain original source expiry',async t=>{
 const f=await hostedFixture(t),proof=await f.api.readFussballAuditReplay(input(f)),real=Date.now
 Date.now=()=>Date.parse(proof.source.currentFreshUntil)+1;t.after(()=>{Date.now=real})
 assert.throws(()=>f.api.getFussballAuditReplay(proof),/freshness expired/)
 await assert.rejects(f.api.readFussballAuditReplay(input(f)),/freshness expired/)
})

test('production certificate reader retains real default source verifier; synthetic paired evidence cannot mint authority',async t=>{
 const f=await hostedFixture(t),api=await import('./fussball-audit-replay.mjs')
 await assert.rejects(api.readFussballAuditReplay(input(f)),/current original-byte replay failed/)
})

test('source-only CLI fails closed before network on unexpected runtime and unsupported commands',async()=>{
 const {stageFussballRetainedAudit,githubGetAdapter}=await import('./stage-fussball-retained-audit.mjs');let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw Error('network forbidden')}
 try{await assert.rejects(stageFussballRetainedAudit({command:'produce',directory:'unused',env:{}}));await assert.rejects(stageFussballRetainedAudit({command:'capture',directory:'unused',env:{}}));await assert.rejects(githubGetAdapter('test')('https://football.invalid/'));assert.equal(calls,0)}finally{globalThis.fetch=original}
})

test('hosted workflow has read-only scope and no source/native fallback',()=>{
 const text=readFileSync(new URL('../.github/workflows/replay-fussball-audit.yml',import.meta.url),'utf8')
 assert.match(text,/actions: read/);assert.match(text,/contents: read/);assert.match(text,/npm ci --ignore-scripts/);assert.match(text,/github.run_attempt == 1/);assert.match(text,/inputs.expected_sha == github.sha/);assert.match(text,/compression-level: 0/)
 assert.doesNotMatch(text,/actions: write|secrets\.|SUPABASE|DATABASE|dispatches|capture-current|capture-archive|ssh /)
})

test('TEST CONTROL source-metadata values are compared to fresh authoritative GETs after genuine source replay',async t=>{
 const f=await hostedFixture(t),metadata=JSON.parse(f.files.get('source-metadata.json'));metadata.jobs.jobs[0].id=999
 const bytes=Buffer.from(JSON.stringify(metadata)+'\n');f.files.set('source-metadata.json',bytes);f.recertify(c=>c.metadataSha256=hash(bytes))
 await assert.rejects(f.api.readFussballAuditReplay(input(f)),/genuine source proof differs/)
})

test('TEST CONTROL source ZIP body cannot be rebound by rewriting all certificate-local digest fields',async t=>{
 const f=await hostedFixture(t),body=f.files.get('current.zip');body[0]^=1
 const metadata=JSON.parse(f.files.get('source-metadata.json'));metadata.artifacts.current.digest='sha256:'+hash(body)
 const bytes=Buffer.from(JSON.stringify(metadata)+'\n');f.files.set('source-metadata.json',bytes)
 f.recertify(c=>{c.metadataSha256=hash(bytes);c.originals.current.sha256=hash(body);c.source.artifacts.current.digest='sha256:'+hash(body)})
 await assert.rejects(f.api.readFussballAuditReplay(input(f)),/original artifact size\/digest differs/)
})

test('TEST CONTROL failed handoff survives replay only with the first-phase before-dispatch data witness',async t=>{
 const f=await hostedFixture(t);f.source.run.conclusion='failure';f.source.jobs.jobs[2].conclusion='failure';f.source.jobs.jobs[2].steps[0].conclusion='failure'
 // Existing certificate cannot be relabeled to cover changed source execution.
 await assert.rejects(f.api.readFussballAuditReplay(input(f)),/no pinned before-dispatch/)
})

test('source wire getter refuses forgeries and exposes no expanded derived data',async()=>{
 const {getFussballRetainedAuditWire}=await import('./fussball-retained-audit.mjs')
 assert.throws(()=>getFussballRetainedAuditWire({sourceEligible:true}),/reader-issued/)
})

test('GitHub GET adapter bounds JSON streams and sends only GET to the fixed repository',async()=>{
 const {githubGetAdapter}=await import('./stage-fussball-retained-audit.mjs'),original=globalThis.fetch,calls=[]
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({ok:true}),{status:200})}
 try{
  assert.deepEqual(await githubGetAdapter('test')(prefix+'branches/main'),{ok:true});assert.equal(calls[0].url,'https://api.github.com/'+prefix+'branches/main');assert.equal(calls[0].options.method,'GET')
  globalThis.fetch=async()=>new Response('{}',{status:200,headers:{'content-length':String(16*1024*1024+1)}})
  await assert.rejects(githubGetAdapter('test')(prefix+'branches/main'),/content length exceeded/)
 }finally{globalThis.fetch=original}
})

test('TEST CONTROL producer requires exclusive output and never rewrites already retained originals',async t=>{
 const f=await hostedFixture(t),before=readFileSync(f.root+'/wire/current.zip')
 f.run.status='in_progress';f.run.conclusion=null
 await assert.rejects(f.api.produceFussballAuditReplay({sourceRunId:'40641606028',replayRunId,replayHead,github:f.github,directory:f.root+'/wire'}),/EEXIST/)
 assert.ok(readFileSync(f.root+'/wire/current.zip').equals(before))
})
