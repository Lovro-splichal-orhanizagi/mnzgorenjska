import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {fixture,isolatedReader,sourceRunId,sourceHead,sourceStep,archiveStep,handoffStep,verifyFussballDirectory,hash,fingerprint} from './fussball-retained-audit-test-fixture.mjs'
const ancestryDirectory=process.env.FUSSBALL_RETAINED_AUDIT_PARENT_DIR,currentDirectory=process.env.FUSSBALL_RETAINED_AUDIT_CURRENT_DIR

test('retained audit accepts no serialized capability, flags or caller freshness override',async()=>{
 const api=await import('./fussball-retained-audit.mjs')
 assert.equal(typeof api.readFussballRetainedAudit,'function')
 assert.throws(()=>api.getFussballRetainedAudit({sourceRunId:'40641606028',sourceEligible:true}),/reader-issued/)
 let calls=0
 for(const patch of [{sourceRunId:'1'},{success:true},{now:Date.now()},{requireFresh:false},{verifyDirectory:()=>true}]){
  await assert.rejects(api.readFussballRetainedAudit({sourceRunId:'40641606028',github:async()=>{calls++;throw Error('no GET')},...patch}))
 }
 assert.equal(calls,0)
})

test('TEST CONTROL exact GET metadata stages mint only private source capability with defensive bytes',async()=>{
 const f=fixture(),api=isolatedReader(),proof=await api.readFussballRetainedAudit({sourceRunId,github:f.github})
 assert.equal(proof.sourceHead,sourceHead);assert.equal(proof.priorRequests,1568);assert.deepEqual(proof.requests,{current:1,archive:1});assert.equal(proof.cumulativeRequests,1570)
 assert.equal(proof.sourceEligible,true);assert.equal(proof.nativeEligible,false);assert.equal(proof.activationEligible,false);assert.equal(proof.handoff.nativeSideEffectsVerified,false)
 assert.equal(proof.currentCreatedAt,f.stages.current.manifest.createdAt)
 const bytes=api.getFussballRetainedAudit(proof);bytes.stages.current.zipBytes[0]^=1;bytes.stages.current.manifest.createdAt='forged';bytes.stages.current.files.get('manifest.json')[0]^=1
 assert.ok(api.getFussballRetainedAudit(proof).stages.current.zipBytes.equals(f.stages.current.zipBytes));assert.equal(api.getFussballRetainedAudit(proof).stages.current.manifest.createdAt,proof.currentCreatedAt)
 assert.throws(()=>api.getFussballRetainedAudit({...proof}),/reader-issued/);assert.ok(Object.isFrozen(proof)&&Object.isFrozen(proof.requests))
 assert.ok(f.calls.every(c=>c.path.startsWith('repos/Lovro-splichal-orhanizagi/mnzgorenjska/actions/')))
 assert.equal(f.calls.filter(c=>c.binary).length,2)
})

for(const [label,change]of[
 ['live run',f=>f.run.status='in_progress'],['rerun',f=>f.run.run_attempt=2],['wrong source head',f=>f.run.head_sha='a'.repeat(40)],['canceled run',f=>f.run.conclusion='cancelled'],['wrong repository',f=>f.run.repository.full_name='other/repo'],['wrong workflow',f=>f.run.path='.github/workflows/other.yml'],
 ['missing source job',f=>{f.jobs.jobs.pop();f.jobs.total_count=2}],['wrong job binding',f=>f.jobs.jobs[0].run_id=1],['failed source job',f=>f.jobs.jobs[0].conclusion='failure'],['failed archive',f=>f.jobs.jobs[1].conclusion='failure'],['missing replay',f=>f.jobs.jobs[0].steps=f.jobs.jobs[0].steps.filter(s=>s.name!=='Independently replay only retained original documents')],['skipped upload',f=>f.jobs.jobs[1].steps.find(s=>s.name==='Preserve separate archive originals and request journal').conclusion='skipped'],
 ['source artifact from another commit',f=>f.stages.current.artifact.workflow_run.head_sha='b'.repeat(40)],['expired archive artifact',f=>f.stages.archive.artifact.expired=true],['ZIP digest tamper',f=>f.stages.current.zipBytes[0]^=1],['source artifact name',f=>f.stages.archive.artifact.name='other'],
 ['oversize artifact',f=>f.stages.archive.artifact.size_in_bytes=513*1024*1024],
])test(`retained audit rejects ${label} before source capability`,async()=>{
 const f=fixture();change(f);await assert.rejects(isolatedReader().readFussballRetainedAudit({sourceRunId,github:f.github}),{code:'FUSSBALL_RETAINED_AUDIT_HOLD'})
})

for(const [label,change]of[
 ['failed manifest',s=>s.manifest.success=false],['wrong V5 ledger',s=>s.manifest.checkpoint.proof.priorRequests=1517],['wrong profile',s=>s.manifest.checkpoint.proof.preset='baden-reviewed-transports-v4'],['wrong fingerprint',s=>s.manifest.codeSha256='0'.repeat(64)],['wrong report intent',s=>s.manifest.options.reportLimit=1],['current budget exceeded',s=>s.manifest.options.maxRequests=433],['wrong raw parent path',s=>s.manifest.checkpoint.parentFiles[0].runId='1'],['outcome removed',s=>s.files.set('outcomes.jsonl',Buffer.from('\n'))],['outcome changed',s=>s.files.set('outcomes.jsonl',Buffer.from('{}\n'))],['incomplete intents',s=>s.files.set('attempts.jsonl',Buffer.from('{}'))],['extra member',s=>s.files.set('extra.json',Buffer.from('{}'))],['missing body',s=>s.files.delete(s.manifest.documents[0].file)],
])test(`retained audit rejects rebound ${label}`,async()=>{
 const f=fixture();change(f.stages.current);f.refresh('current');await assert.rejects(isolatedReader().readFussballRetainedAudit({sourceRunId,github:f.github}),{code:'FUSSBALL_RETAINED_AUDIT_HOLD'})
})

test('TEST CONTROL failed handoff needs unchanged before-dispatch strict-data witness',async()=>{
 const f=fixture();f.run.conclusion='failure';f.jobs.jobs[2].conclusion='failure';f.jobs.jobs[2].steps[0].conclusion='failure'
 const api=isolatedReader()
 await assert.rejects(api.readFussballRetainedAudit({sourceRunId,github:f.github}),/no pinned before-dispatch/)
 f.stages.current.result.rejectedReports=[{testOnlySynthetic:true,code:'strict-rejection'}];f.refresh('current')
 const proof=await api.readFussballRetainedAudit({sourceRunId,github:f.github})
 assert.deepEqual(proof.handoff.witness,{stage:'current',kind:'strict-rejected-reports',resultSha256:f.stages.current.manifest.resultSha256,count:1})
 assert.equal(proof.nativeEligible,false);assert.equal(proof.handoff.nativeSideEffectsVerified,false)
 f.jobs.jobs[2].steps.push({...f.jobs.jobs[2].steps[0],name:'other failure'})
 await assert.rejects(api.readFussballRetainedAudit({sourceRunId,github:f.github}),/only the strict handoff/)
})

test('TEST CONTROL rejects cross-pair seed receipts and terminal metadata drift',async()=>{
 const f=fixture(),api=isolatedReader();f.stages.archive.manifest.archiveParent.originalReceipt={forged:true};f.refresh('archive')
 await assert.rejects(api.readFussballRetainedAudit({sourceRunId,github:f.github}),/original current seed/)
 const g=fixture(),original=g.github;let reads=0
 g.github=async(path,binary)=>{const value=await original(path,binary);if(path.endsWith('/runs/'+sourceRunId)&&++reads===2)value.updated_at=g.stamp(153);return value}
 await assert.rejects(api.readFussballRetainedAudit({sourceRunId,github:g.github}),/metadata changed/)
})

test('TEST CONTROL original 24h expiry is enforced on read and private getter without refreshing timestamps',async t=>{
 const f=fixture(),api=isolatedReader(),proof=await api.readFussballRetainedAudit({sourceRunId,github:f.github}),real=Date.now
 Date.now=()=>Date.parse(f.stages.current.manifest.createdAt)+24*3600_000+1;t.after(()=>{Date.now=real})
 assert.throws(()=>api.getFussballRetainedAudit(proof),/freshness expired/)
 await assert.rejects(api.readFussballRetainedAudit({sourceRunId,github:f.github}),/freshness expired/)
})

test('source default reader is mandatory; synthetic source success never grants real capability',async()=>{
 const api=await import('./fussball-retained-audit.mjs'),f=fixture()
 await assert.rejects(api.readFussballRetainedAudit({sourceRunId,github:f.github}),/current original-byte replay failed/)
})

test('genuine retained V5 ancestry reaches real default body replay and rejects missing body evidence',{skip:ancestryDirectory?false:'set genuine FUSSBALL_RETAINED_AUDIT_PARENT_DIR; no actual ancestry claim'},async t=>{
 const dir=ancestryDirectory+'/'
 const {readFussballTransportV5}=await import('./fussball-checkpoint.mjs')
 const f=fixture(),parent={...JSON.parse(readFileSync(dir+'current-metadata.json')),zipBytes:readFileSync(dir+'current.zip')},proof=readFussballTransportV5({parent})
 for(const s of Object.values(f.stages)){s.manifest.checkpoint.proof=proof;s.files.set('checkpoint/parents/40633575248.json',Buffer.from(JSON.stringify({run:parent.run,artifact:parent.artifact,jobs:parent.jobs})+'\n'));s.files.set('checkpoint/parents/40633575248.zip',parent.zipBytes)}
 // Hashes/receipt remain consistent. The real collector must still reject a
 // synthetic round lacking actual retained fixture/report source bodies.
 f.refresh('current');f.refresh('archive');const failures=[];let fetches=0;const originalFetch=globalThis.fetch
 globalThis.fetch=async()=>{fetches++;throw Error('football network forbidden')};t.after(()=>{globalThis.fetch=originalFetch})
 const api=isolatedReader(async path=>{try{return await verifyFussballDirectory(path)}catch(e){failures.push(e.message);throw e}})
 await assert.rejects(api.readFussballRetainedAudit({sourceRunId,github:f.github}),/current original-byte replay failed/)
 assert.equal(failures.length,1);assert.equal(failures[0],'fussball statistika: manjka enolična živa glava HTML')
 assert.equal(fetches,0)
})

test('genuine live-run current half verifies166 counted attempts and67MB result without minting a paired capability',{skip:currentDirectory?false:'set genuine FUSSBALL_RETAINED_AUDIT_CURRENT_DIR; no actual pair readiness claim'},async t=>{
 const dir=currentDirectory+'/'
 const run=JSON.parse(readFileSync(dir+'actual-run.json')),jobs=JSON.parse(readFileSync(dir+'actual-jobs.json')),inventory=JSON.parse(readFileSync(dir+'actual-artifacts.json')),artifact=inventory.artifacts.find(a=>a.id===12796721322),zipBytes=readFileSync(dir+'current.zip')
 assert.notEqual(run.status,'completed');assert.equal(zipBytes.length,94166881);assert.equal('sha256:'+hash(zipBytes),'sha256:ee92e87a844d22b6c1359eeb24e8c4c3eaed4e65687819d6e36fc28a3da2d8c9')
 const actual=await import('./fussball-retained-audit.mjs');let calls=0
 await assert.rejects(actual.readFussballRetainedAudit({sourceRunId,github:async()=>{calls++;return structuredClone(run)}}),/terminal first-attempt/);assert.equal(calls,1)
 // Expose only extraction/inspection to this source-isolated test harness.
 // The production module exports neither a half-reader nor verifier injection.
 const helper=isolatedReader(verifyFussballDirectory,true),root=mkdtempSync(join(tmpdir(),'actual-current-half-'));t.after(()=>rmSync(root,{recursive:true,force:true}))
 helper.unchangedCode();const job=jobs.jobs.find(j=>j.name==='capture');helper.artifactIdentity(artifact,`fussball-season-${sourceRunId}`,job)
 const extracted=helper.extract(zipBytes,root,false),half=helper.inspect('current',extracted.files,job)
 assert.equal(extracted.files.get('result.json').length,67785002)
 let fetches=0;const originalFetch=globalThis.fetch
 globalThis.fetch=async()=>{fetches++;throw Error('football network forbidden')};t.after(()=>{globalThis.fetch=originalFetch})
 const receipt=await verifyFussballDirectory(extracted.directory)
 assert.equal(receipt.verified,true);assert.equal(receipt.requests,166);assert.equal(receipt.priorRequests,1568);assert.equal(receipt.activationEligible,false)
 assert.equal(half.manifest.snapshot.attempts.filter(a=>a.status==='failed').length,2);assert.equal(half.result.rejectedReports.length,9)
 assert.equal(1568+receipt.requests,1734,'known subtotal only; archive spend remains unknown')
 assert.throws(()=>actual.getFussballRetainedAudit({sourceRunId,current:receipt}),/reader-issued/)
 const document=half.manifest.documents.find(d=>d.kind==='css'),path=join(extracted.directory,document.file),body=readFileSync(path);body[0]^=1;writeFileSync(path,body)
 await assert.rejects(verifyFussballDirectory(extracted.directory),/original body\/hash differs/)
 assert.equal(fetches,0)
})
