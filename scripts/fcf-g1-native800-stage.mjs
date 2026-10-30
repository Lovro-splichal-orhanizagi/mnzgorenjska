// Source-stage attestation for the separate fixed G1 native800 SQL path.
// Reader-issued WeakMap brand only; never serializable as mutation authority.
import {createHash} from 'node:crypto'
import {getFcfG1Native800Source} from './fcf-g1-native800-source.mjs'
import {exactKeys,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const states=new WeakMap(),sha=t=>createHash('sha256').update(t).digest('hex'),need=(v,m)=>{if(!v)throw Error('FCF_G1_NATIVE800_STAGE: '+m)},flags={admissible:false,nativeAdmission:false,activationEligible:false}
function current(input){
 const d=getFcfG1Native800Source(input.sourceProof),t=input.rolloutText
 need(typeof t==='string'&&Buffer.byteLength(t)<=33554432&&sha(t)===input.rolloutSha256,'exact bounded original G1 rollout TEXT/SHA')
 let r,p;try{r=JSON.parse(t);p=JSON.parse(r.targetPacketText)}catch{need(false,'valid original G1 rollout/packet')}
 need(r.kind==='fcf-g1-native800-import-rollout'&&r.protocol==='fcf-g1-native800-v1'&&r.targetSlug==='es-ct-segona-g1'&&r.readiness===null&&r.sourceCommit===r.execution?.commit&&sha(r.targetPacketText)===r.targetPacketSha256&&hash(r.inventoryBinding)===hash(d.binding)&&hash(r.cleanupBinding)===hash(p.cleanupBinding)&&sha(r.nativeSnapshotText)===r.nativeSnapshotSha256&&p.kind==='fcf-g1-native800-import-packet'&&p.protocol===r.protocol&&p.targetSlug===r.targetSlug&&p.target?.competitionId===783&&p.sourceCommit===r.sourceCommit&&p.captureSourceCommit===d.binding.sourceCommit&&hash(p.target?.sourceEvidence)===hash(d.binding)&&hash(p.target?.fixtures)===hash(d.fixtures)&&hash(p.target?.clubs)===hash(d.clubs)&&hash(p.supplementalBindings)===hash(r.supplementalBindings)&&hash(p.identityPlan)===hash(r.identityPlan),'current private G1 source equals complete frozen import packet')
 const e=input.execution;exactKeys(e,['repository','ref','commit','runId','runAttempt'],'G1 native execution DATA')
 need(e.repository==='Lovro-splichal-orhanizagi/mnzgorenjska'&&e.ref==='refs/heads/main'&&/^[a-f0-9]{40}$/.test(e.commit??'')&&/^[1-9]\d{0,19}$/.test(e.runId??'')&&e.runAttempt==='1'&&(input.stage!=='import'||hash(e)===hash(r.execution)),'fixed main/attempt1 G1 SQL execution DATA')
 return{schemaVersion:1,kind:'fcf-g1-native800-stage-attestation',stage:input.stage,targetSlug:r.targetSlug,sourceCommit:r.sourceCommit,execution:structuredClone(e),rolloutSha256:input.rolloutSha256,sourceBindingSha256:hash(d.binding),counter:d.currentCounter}
}
export function readFcfG1Native800StageAttestation(input){exactKeys(input,['sourceProof','rolloutText','rolloutSha256','stage','execution'],'G1 source-stage input');need(['import','check'].includes(input.stage),'closed G1 import/check stage required');const data=current(input),proof=Object.freeze({kind:'fcf-g1-private-native800-stage',...flags});states.set(proof,{input:{...input,execution:structuredClone(input.execution)},data});return proof}
export function getFcfG1Native800StageAttestation(proof){const s=states.get(proof);need(s,'private actual G1 source-stage attestation required');const now=current(s.input);need(sha(JSON.stringify(now))===sha(JSON.stringify(s.data)),'G1 source/counter/stage changed; obtain fresh attestation');const attestationText=JSON.stringify(now);return frozenJSON({attestationText,attestationSha256:sha(attestationText),stage:now.stage,execution:now.execution,rolloutText:s.input.rolloutText,rolloutSha256:s.input.rolloutSha256,...flags})}
