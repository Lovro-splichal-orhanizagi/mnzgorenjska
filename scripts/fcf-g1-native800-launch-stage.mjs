// Private G1 launch-stage attestation. This binds current source/readiness but
// carries no admission/activation authority outside its SQL RPC job.
import {createHash} from 'node:crypto'
import {getFcfG1Native800Source} from './fcf-g1-native800-source.mjs'
import {exactKeys,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const states=new WeakMap(),sha=t=>createHash('sha256').update(t).digest('hex'),need=(v,m)=>{if(!v)throw Error('FCF_G1_NATIVE800_LAUNCH_STAGE: '+m)},flags={admissible:false,nativeAdmission:false,activationEligible:false}
function actual(input){
 const source=getFcfG1Native800Source(input.sourceProof),t=input.readinessText
 need(typeof t==='string'&&Buffer.byteLength(t)<=33554432&&sha(t)===input.readinessSha256,'exact bounded final G1 readiness TEXT/SHA')
 let d;try{d=JSON.parse(t)}catch{need(false,'valid final G1 readiness')}
 need(d.schemaVersion===1&&d.kind==='fcf-g1-native800-readiness-data'&&d.protocol==='fcf-g1-native800-v1'&&d.targetSlug==='es-ct-segona-g1'&&d.sourceBinding&&hash(d.sourceBinding)===hash(source.binding)&&d.capture?.sourceCommit===source.currentCapture.sourceCommit&&d.originalImport?.stage==='imported'&&typeof d.originalImport.rolloutText==='string'&&sha(d.originalImport.rolloutText)===d.originalImport.rolloutSha256&&Object.keys(flags).every(k=>d[k]===false),'actual G1 source-bound readiness DATA; no native flags')
 const r=JSON.parse(d.originalImport.rolloutText);need(r.kind==='fcf-g1-native800-import-rollout'&&r.protocol===d.protocol&&r.targetSlug===d.targetSlug&&r.inventoryBinding&&hash(r.inventoryBinding)===hash(source.binding),'original G1 import and current source binding')
 const e=input.execution;exactKeys(e,['repository','ref','commit','runId','runAttempt'],'G1 launch execution DATA');need(e.repository==='Lovro-splichal-orhanizagi/mnzgorenjska'&&e.ref==='refs/heads/main'&&/^[a-f0-9]{40}$/.test(e.commit??'')&&/^[1-9]\d{0,19}$/.test(e.runId??'')&&e.runAttempt==='1','fixed current main/attempt1 G1 launch execution')
 need(['check','activate'].includes(input.stage),'closed G1 launch stage required')
 return {schemaVersion:1,kind:'fcf-g1-native800-launch-stage-attestation',stage:input.stage,targetSlug:d.targetSlug,sourceCommit:r.sourceCommit,execution:structuredClone(e),rolloutSha256:d.originalImport.rolloutSha256,readinessSha256:input.readinessSha256,sourceBindingSha256:hash(source.binding),counter:source.currentCounter}
}
export function readFcfG1Native800LaunchStageAttestation(input){exactKeys(input,['sourceProof','readinessText','readinessSha256','stage','execution'],'G1 launch stage input');const data=actual(input),proof=Object.freeze({kind:'fcf-g1-private-native800-launch-stage',...flags});states.set(proof,{input:{...input,execution:structuredClone(input.execution)},data});return proof}
export function getFcfG1Native800LaunchStageAttestation(proof){const s=states.get(proof);need(s,'private actual G1 launch-stage attestation required');const now=actual(s.input);need(hash(now)===hash(s.data),'G1 source/counter/readiness changed; rederive without changing capture');const attestationText=JSON.stringify(now);return frozenJSON({attestationText,attestationSha256:sha(attestationText),stage:now.stage,execution:now.execution,rolloutSha256:now.rolloutSha256,readinessText:s.input.readinessText,readinessSha256:s.input.readinessSha256,...flags})}
