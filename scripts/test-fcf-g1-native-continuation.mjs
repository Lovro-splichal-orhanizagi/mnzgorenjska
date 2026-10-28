// New G1/G9 source, cleanup and native records are TEST ONLY controls. Genuine
// retained old37/original bytes do not establish current native readiness.
import test from 'node:test'
import assert from 'node:assert/strict'
import {g1AdmissionWire} from './fcf-g1-source-test-fixture.mjs'
import {readFcfFutureCapturedTargetEvidence} from './fcf-future-source-admission.mjs'
const api=await import('./fcf-future-native-scope.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const enabled={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR&&process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR?false:'Genuine old37/retained fixture bytes required; NEW native controls synthetic'}
test('native source scope binds reader-issued G1 to exact783 and rejects cross-target or copied capabilities',enabled,async t=>{
 const {wire}=await g1AdmissionWire(t),proof=readFcfFutureCapturedTargetEvidence(wire)
 assert.equal(typeof api.readFcfFutureNativeSource,'function','closed native source scope required')
 const result=api.readFcfFutureNativeSource({targetSlug:'es-ct-segona-g1',inventoryAdmission:proof,now:wire.now})
 assert.equal(result.target.competitionId,783);assert.equal(result.data.binding.protocol,'future-g1-after-g9-v1');assert.equal(result.data.binding.maximumSourceGETs,478)
 assert.throws(()=>api.readFcfFutureNativeSource({targetSlug:'es-ct-tercera-g9',inventoryAdmission:proof,now:wire.now}),/FCF_/)
 assert.throws(()=>api.readFcfFutureNativeSource({targetSlug:'es-ct-segona-g1',inventoryAdmission:structuredClone(proof),now:wire.now}),/FCF_/)
})

import {g1NativeActivationFixture} from './fcf-g1-native-test-fixture.mjs'
import {buildFcfFutureTargetActivation,verifyFcfFutureTargetActivation} from './fcf-future-target-activation.mjs'
const nativeEnabled={skip:enabled.skip===false&&process.env.FCF_SIX_ORIGINAL_AUTHORIZATION_WIRE&&process.env.FCF_SIX_ACCOUNTING_WIRE&&process.env.FCF_HISTORICAL_RETAINED_DIR?false:'Genuine old original-authority fixtures required; NEW cleanup/native records synthetic'}
test('G1 mapping/import/activation reuse original APPLIED issuer across writer SHA and preserve NULL original markers',nativeEnabled,async t=>{
 const f=await g1NativeActivationFixture(t),a=buildFcfFutureTargetActivation(f.input),p=JSON.parse(a.activationText),r=JSON.parse(f.original.rolloutText)
 assert.equal(r.targetSlug,'es-ct-segona-g1');assert.equal(r.cleanupBinding.sourceCommit,'a'.repeat(40));assert.equal(r.sourceCommit,'b'.repeat(40));assert.equal(r.inventoryBinding.accountingBinding.latest.sourceCommit,r.cleanupBinding.sourceCommit)
 assert.equal(p.launchProposal.competitionId,783);assert.ok(p.launchProposal.roundNumber>=7);assert.ok(p.readiness.cheapestLegal15<=100)
 const unknown=JSON.parse(r.targetPacketText).target.fixtures.find(f=>f.id==='es4109404');assert.equal(unknown.homeGoals,null);assert.equal(unknown.awayGoals,null);assert.equal(unknown.appearances,null);assert.equal(unknown.goals,null)
 assert.deepEqual(verifyFcfFutureTargetActivation({...f.input,...a}),a)
 // The SAME real source wire/packet must also compose through the private
 // offline pricing child; no fresh-source fetch or alternate target fallback.
 const dir=realpathSync(mkdtempSync(join(tmpdir(),'g1-native-child-'))),path=join(dir,'parent.json'),bytes=Buffer.from(JSON.stringify({wire:encodeFcfTargetWire(f.wire),targetSlug:'es-ct-segona-g1',sourceCommit:f.base.sourceCommit,targetPacketText:r.targetPacketText,targetPacketSha256:r.targetPacketSha256}))
 writeFileSync(path,bytes,{mode:0o600});t.after(()=>rmSync(dir,{recursive:true,force:true}))
 const originalFetch=globalThis.fetch,methods=[http,https].flatMap(m=>['get','request'].map(k=>[m,k,m[k]]));t.after(()=>{globalThis.fetch=originalFetch;for(const[m,k,v]of methods)m[k]=v;syncBuiltinESMExports()})
 let childNow=f.base.now,networkCalls=0;t.mock.method(Date,'now',()=>childNow)
 const provider=installFcfFutureTargetChildOffline({env:{SUPABASE_URL:'https://synthetic.supabase.co',FCF_FUTURE_TARGET_OFFLINE_FILE:path,FCF_FUTURE_TARGET_OFFLINE_SHA256:createHash('sha256').update(bytes).digest('hex')},now:childNow,network:async()=>{networkCalls++;throw Error('TEST ONLY forbidden network')}})
 assert.equal(provider.competition.id,783);assert.equal((await globalThis.fetch(f.data.documents[0].receipt.sourceUrl)).status,200);assert.equal(networkCalls,0)
 childNow+=25*3600000;await assert.rejects(globalThis.fetch(f.data.documents[0].receipt.sourceUrl),/FCF_/);assert.equal(networkCalls,0)

 for(const mutate of [x=>x.importReceipt.competition_id=797,x=>x.targetSlug='es-ct-tercera-g9',x=>x.nativeProjection.native.competition.id=797,x=>x.nativeProjection.databaseInventory.groups.find(g=>g.slug==='es-ct-tercera-g9').active=true,x=>x.nativeProjection.databaseInventory.installedMarkers[0].markers[0].homeTeamId++,x=>x.cleanupEvidence=structuredClone(f.input.cleanupEvidence),x=>x.nativeProjection.native.rounds.find(r=>r.number===p.launchProposal.roundNumber).lineups_locked_at=new Date(f.base.now).toISOString()]){const x=structuredClone({...f.input,inventoryAdmission:null,cleanupEvidence:null});x.inventoryAdmission=f.input.inventoryAdmission;x.cleanupEvidence=f.input.cleanupEvidence;mutate(x);assert.throws(()=>buildFcfFutureTargetActivation(x),/FCF_/)}
})

import {createFcfFutureTargetDatabase} from './fcf-future-target-db.mjs'
test('G1 database transport is explicitly target-bound and refuses old-G9 packet scope before any effect',()=>{
 let calls=0;const db=createFcfFutureTargetDatabase({targetSlug:'es-ct-segona-g1',env:{SUPABASE_DB_URL:'postgresql://TEST@127.0.0.1:5432/TEST'},execute:()=>{calls++;return Buffer.from('null')},network:async()=>{calls++;throw Error('TEST ONLY forbidden network')}})
 assert.throws(()=>db.receipt('es-ct-tercera-g9'),/FCF_/);assert.equal(calls,0)
 assert.equal(db.receipt('es-ct-segona-g1'),null);assert.equal(calls,1)
})

import {futureStageFixture} from './fcf-future-stage-test-fixture.mjs'
import {readFcfFutureTargetApprovalArtifact,readFcfFutureTargetStageArtifact} from './fcf-future-target-stage-evidence.mjs'
test('G1 approval/stage records bind selected protocol, preserve opaque payload and forbid cleanup reruns',t=>{
 const slug='es-ct-segona-g1',approval=futureStageFixture(t,'mapping',true)
 approval.manifest.targetSlug=slug;approval.manifest.source.protocol='future-g1-after-g9-v1';approval.repack()
 assert.equal(readFcfFutureTargetApprovalArtifact(approval.input).approval.targetSlug,slug)
 for(const stage of ['cleanup-prepare','cleanup-apply']){approval.manifest.stage=stage;approval.repack();assert.throws(()=>readFcfFutureTargetApprovalArtifact(approval.input),/no cleanup rerun/)}
 const f=futureStageFixture(t,'mapping');f.manifest.targetSlug=slug;f.manifest.result.targetSlug=slug;f.input.targetSlug=slug;f.repack();f.input.metadata.artifact.name='fcf-future-target-mapping-'+slug+'-500-1'
 assert.equal(readFcfFutureTargetStageArtifact(f.input).payloadText,f.manifest.payloadText)
 f.input.targetSlug='es-ct-tercera-g9';assert.throws(()=>readFcfFutureTargetStageArtifact(f.input),/FCF_/)
})

import {writerFixture} from './fcf-future-actions-writer-test-fixture.mjs'
import {g1TransportFixture} from './fcf-g1-source-test-fixture.mjs'
import {g1NativeBase} from './fcf-g1-native-test-fixture.mjs'
import {runFcfFutureTargetActions} from './fcf-future-target-actions.mjs'
import {readFileSync,writeFileSync,mkdtempSync,realpathSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import http from 'node:http'
import https from 'node:https'
import {syncBuiltinESMExports} from 'node:module'
import {encodeFcfTargetWire} from './fcf-target-child-offline.mjs'
import {installFcfFutureTargetChildOffline} from './fcf-future-target-child-offline.mjs'
import {join} from 'node:path'
test('G1 Actions mapping reauthenticates original APPLIED cleanup and full post-G9 wire before native planning',nativeEnabled,async t=>{
 const f=await writerFixture(t,'mapping'),g=await g1TransportFixture(t),n=await g1NativeBase(t)
 for(const[k,v]of g.map)f.map.set(k,v)
 f.run=g.map.get(g.repo+'actions/runs/123');f.jobs=g.map.get(g.repo+'actions/runs/123/attempts/1/jobs?per_page=100&page=1').jobs
 f.time=Math.max(g.wire.now,n.base.now);f.approval.manifest.targetSlug='es-ct-segona-g1';f.approval.manifest.source=g.source;f.approval.manifest.cleanup=f.cleanup();f.db.inventory=async()=>{const d=structuredClone(n.base.databaseInventory);d.capturedUTC=new Date(f.time).toISOString();d.identityPrivacy.capturedUTC=d.capturedUTC;return d};f.repack()
 await runFcfFutureTargetActions({...f.args(),github:(p,b)=>g.map.has(p)?g.github(p,b):f.github(p,b)})
 const m=JSON.parse(readFileSync(join(f.root,'fcf-future-target-mapping/manifest.json')));assert.equal(m.targetSlug,'es-ct-segona-g1');assert.equal(JSON.parse(m.payloadText).targetSlug,'es-ct-segona-g1');assert.equal(f.calls.length,0)
})
