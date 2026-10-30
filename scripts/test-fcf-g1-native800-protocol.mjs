// TEST ONLY: capability-boundary negatives; no source/DB/provider/network.
import test from 'node:test'
import assert from 'node:assert/strict'
import {compileFcfG1Native800ImportPacket,buildFcfG1Native800ImportRollout,verifyFcfG1Native800ImportRollout} from './fcf-g1-native800-packet.mjs'
import {buildFcfG1Native800Readiness} from './fcf-g1-native800-readiness.mjs'
import {readFcfG1Native800StageAttestation} from './fcf-g1-native800-stage.mjs'
import {createFcfG1Native800Database} from './fcf-g1-native800-db.mjs'
import {validateNative800LaunchResult} from './fcf-g1-native800-operator.mjs'
import {createHash} from 'node:crypto'
const sha=x=>createHash('sha256').update(x).digest('hex')
const sourceProof={kind:'TEST ONLY copied private-source data',targetSlug:'es-ct-segona-g1',competitionId:783,binding:{protocol:'fcf-g1-native800-v1',maximumSourceGETs:800}}
test('G1 import packet/rollout/readiness require the genuine WeakMap source reader brand',()=>{
 const execution={repository:'Lovro-splichal-orhanizagi/mnzgorenjska',ref:'refs/heads/main',commit:'a'.repeat(40),runId:'123',runAttempt:'1'},cleanupEvidence={},nativePreparation={admissible:false,nativeAdmission:false,activationEligible:false}
 for(const f of [()=>compileFcfG1Native800ImportPacket({sourceProof,cleanupEvidence,nativePreparation,execution}),()=>buildFcfG1Native800ImportRollout({sourceProof,cleanupEvidence,nativePreparation,execution}),()=>verifyFcfG1Native800ImportRollout({sourceProof,cleanupEvidence,nativePreparation,execution,rolloutText:'{}',rolloutSha256:sha('{}')}),()=>buildFcfG1Native800Readiness({sourceProof,originalRolloutText:'{}',originalRolloutSha256:sha('{}'),importReceipt:{},nativePreparation,pricingReplay:{}}),()=>readFcfG1Native800StageAttestation({sourceProof,rolloutText:'{}',rolloutSha256:sha('{}'),stage:'import',execution})])assert.throws(f,/reader-issued|private|actual G1 native800|current G1/i)
})
test('fixed G1 mutation facade exposes closed methods and refuses fake proof before any HTTPS call',async()=>{
 const original=globalThis.fetch,calls=[];globalThis.fetch=async()=>{calls.push('fetch');return new Response('{}')}
 try{
  const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_REF:'refs/heads/main',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_JOB:'native800-import',GITHUB_WORKFLOW_REF:'Lovro-splichal-orhanizagi/mnzgorenjska/.github/workflows/fcf-g1-native800.yml@refs/heads/main',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'TEST_ONLY'}
  const db=createFcfG1Native800Database({env});assert.deepEqual(Object.keys(db),['import','check','dryCheck','activate','receipt','launchReceipt'])
  for(const bad of [{network:globalThis.fetch},{targetSlug:'es-ct-tercera-g9'},{execute:()=>{}}])assert.throws(()=>createFcfG1Native800Database(bad))
  await assert.rejects(db.import({stageProof:{kind:'TEST ONLY copied stage'}}),/private|actual G1 source-stage/i);assert.deepEqual(calls,[])
 }finally{globalThis.fetch=original}
})
test('G1 launch result is bound to readiness, import identity, exact deadline, activation digest and false capability flags',()=>{
 const readiness={readinessSha256:'a'.repeat(64),readinessText:JSON.stringify({launchProposal:{roundNumber:1,firstFantasyPlayedOn:'2027-01-15',deadlineUTC:'2027-01-15T12:00:00.000Z'},cheapestLegal15:94})},importReceipt={receiptId:'42',targetPacketSha256:'b'.repeat(64),sourceFingerprintSha256:'c'.repeat(64)}
 const result={schemaVersion:1,kind:'fcf-g1-native800-launch-result',stage:'checked',targetSlug:'es-ct-segona-g1',receiptId:'42',activationSha256:'d'.repeat(64),targetPacketSha256:importReceipt.targetPacketSha256,sourceFingerprintSha256:importReceipt.sourceFingerprintSha256,firstFantasyRound:1,firstFantasyPlayedOn:'2027-01-15',deadlineAt:'2027-01-15T12:00:00.000Z',active:false,cheapestLegal15:94,readinessSha256:readiness.readinessSha256,admissible:false,nativeAdmission:false,activationEligible:false}
 assert.equal(validateNative800LaunchResult(result,{readiness,importReceipt,activate:false}),result)
 for(const change of [{activationSha256:'invalid'},{sourceFingerprintSha256:'e'.repeat(64)},{deadlineAt:'2027-01-15T12:00:01.000Z'},{active:true},{nativeAdmission:true}])assert.throws(()=>validateNative800LaunchResult({...result,...change},{readiness,importReceipt,activate:false}),/EXACT_FINAL_G1_LAUNCH_RESULT/)
})
