// Closed versioned future proposals after authenticated terminal accounting. This module creates
// no claim, source/retry permission, admission, capture or activation capability.
import {requireFcfPostG9Accounting,getFcfPostG9SourceHistory} from './fcf-post-g9-accounting.mjs'
import {getFcfFutureTarget} from './fcf-future-target-catalog.mjs'
import {requireFcfPostSixAccounting} from './fcf-post-six-accounting.mjs'
import {fcfSixPolicyHashes} from './fcf-six-historical-policy.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {exactKeys,inventoryFail as fail,frozenJSON,commitId,sha256Id,validUTC} from './fcf-missing-inventory-artifact.mjs'

export const FCF_FUTURE_SOURCE_PROTOCOL='future-g9-after-six-v1'
export const FCF_G1_SOURCE_PROTOCOL='future-g1-after-g9-v1'
export const isFcfFutureSourceProtocol=p=>p===FCF_FUTURE_SOURCE_PROTOCOL||p===FCF_G1_SOURCE_PROTOCOL
const plans=new WeakMap(),same=(a,b)=>hash(a)===hash(b)
const limits=frozenJSON({maximumBodyBytes:2097152,maximumManifestBytes:8388608,maximumExpandedBytes:201326592,maximumZipBytes:104857600,pauseMs:3000,attemptTimeoutMs:90000,sourceWindowMs:2700000,retentionMarginMs:15000,maximumPlanAgeMs:86400000})
const fixedChild=(protocol=FCF_FUTURE_SOURCE_PROTOCOL)=>{const t=getFcfFutureTarget({targetSlug:protocol===FCF_G1_SOURCE_PROTOCOL?'es-ct-segona-g1':'es-ct-tercera-g9'});return {targetSlug:t.targetSlug,competitionId:t.competitionId,sourceCode:t.sourceCode,season:t.season,fetchIds:Array.from({length:240},(_,i)=>String(t.start+i)),reuse:[],maximumSourceGETs:240}}
const historyBinding=(proof,protocol)=>protocol===FCF_G1_SOURCE_PROTOCOL?getFcfPostG9SourceHistory(proof):proof
const clock=now=>Number.isFinite(now)&&Number.isFinite(new Date(now).getTime())
function history(proof,protocol=FCF_FUTURE_SOURCE_PROTOCOL){
 if(protocol===FCF_G1_SOURCE_PROTOCOL){const old=requireFcfPostG9Accounting(proof);if(old.maximumCumulativeSourceGETs!==478||old.admissible!==false||old.priorSourceGETs+old.remainingSourceGETs!==478)fail('actual post-G9 spent history with unchanged478 cap required');return old}
 if(protocol!==FCF_FUTURE_SOURCE_PROTOCOL)fail('closed future source protocol required')
 const old=requireFcfPostSixAccounting(proof)
 if(old.kind!=='fcf-post-six-accounting-only'||old.priorSourceGETs!==37||old.maximumCumulativeSourceGETs!==478||old.remainingSourceGETs!==441||old.admissible!==false)fail('exact37 spent/478 cap/441 remaining accounting required')
 return old
}

/**
 * Closed input: {sourceCommit,accountingProof,rulesetSnapshotSha256,now?}.
 * `now` is the current caller clock, default Date.now(); it never replaces any
 * original source timestamp. All240 selected-target documents require a new capture.
 * The ruleset SHA is a data pin only. Later approval/claim integration must
 * authenticate the actual current protected snapshot and reviewed source SHA.
 */
export function buildFcfFutureSourcePlan(input){return build(input,FCF_FUTURE_SOURCE_PROTOCOL)}
export function buildFcfG1SourceContinuationPlan(input){return build(input,FCF_G1_SOURCE_PROTOCOL)}
function build(input,protocol){
 exactKeys(input,['sourceCommit','accountingProof','rulesetSnapshotSha256',...(Object.hasOwn(input??{},'now')?['now']:[])],'future source proposal input')
 const {sourceCommit,rulesetSnapshotSha256}=input,old=history(input.accountingProof,protocol),now=Object.hasOwn(input,'now')?input.now:Date.now()
 if(!commitId(sourceCommit)||sourceCommit===old.latest.sourceCommit||!sha256Id(rulesetSnapshotSha256)||!clock(now)||now<Date.parse(old.latest.completedUTC))fail('new source SHA/ruleset hash/current proposal clock required')
 const child=fixedChild(protocol),priorSourceGETs=old.priorSourceGETs,maximumNewSourceGETs=child.maximumSourceGETs
 if(maximumNewSourceGETs>old.remainingSourceGETs)fail('fresh target exceeds remaining478 source budget; HOLD awaiting explicit budget approval')
 const binding=historyBinding(old,protocol)
 const body={schemaVersion:1,kind:'fcf-future-source-plan',preset:protocol,sourceCommit,createdUTC:new Date(now).toISOString(),rulesetSnapshotSha256,maximumCumulativeSourceGETs:old.maximumCumulativeSourceGETs,maximumNewSourceGETs,priorSourceGETs,plannedCumulativeSourceGETs:priorSourceGETs+maximumNewSourceGETs,stopOnDefect:true,accountingBinding:structuredClone(binding),historySha256:hash(binding),policyHashes:fcfSixPolicyHashes(),limits:{...limits},child}
 const plan=frozenJSON({...body,planSha256:hash(body)})
 validateFcfFutureSourcePlan({plan,accountingProof:old,expectedPlanSha256:plan.planSha256,now})
 return plan
}

/** Reauthenticate against a reader-issued ledger. Only an already registered
 * plan may reuse its private ledger; serialized plans must reauthenticate it.
 */
export function validateFcfFutureSourcePlan(input){
 exactKeys(input,['plan','expectedPlanSha256',...(Object.hasOwn(input??{},'accountingProof')?['accountingProof']:[]),...(Object.hasOwn(input??{},'now')?['now']:[])],'future source validation input')
 const {plan,expectedPlanSha256}=input,old=history(input.accountingProof??plans.get(plan),plan?.preset),now=Object.hasOwn(input,'now')?input.now:Date.now()
 exactKeys(plan,['schemaVersion','kind','preset','sourceCommit','createdUTC','rulesetSnapshotSha256','maximumCumulativeSourceGETs','maximumNewSourceGETs','priorSourceGETs','plannedCumulativeSourceGETs','stopOnDefect','accountingBinding','historySha256','policyHashes','limits','child','planSha256'],'future source proposal')
 const {planSha256,...body}=plan
 if(plan.schemaVersion!==1||plan.kind!=='fcf-future-source-plan'||!isFcfFutureSourceProtocol(plan.preset)||!sha256Id(expectedPlanSha256)||planSha256!==expectedPlanSha256||hash(body)!==planSha256||!commitId(plan.sourceCommit)||plan.sourceCommit===old.latest.sourceCommit||!sha256Id(plan.rulesetSnapshotSha256)||!clock(now)||!validUTC(plan.createdUTC)||Date.parse(plan.createdUTC)<Date.parse(old.latest.completedUTC)||Date.parse(plan.createdUTC)>now||now-Date.parse(plan.createdUTC)>limits.maximumPlanAgeMs||plan.maximumCumulativeSourceGETs!==478||plan.maximumNewSourceGETs!==240||plan.priorSourceGETs!==old.priorSourceGETs||plan.plannedCumulativeSourceGETs!==old.priorSourceGETs+240||plan.maximumNewSourceGETs>old.remainingSourceGETs||plan.stopOnDefect!==true||!same(plan.accountingBinding,historyBinding(old,plan.preset))||plan.historySha256!==hash(historyBinding(old,plan.preset))||!same(plan.policyHashes,fcfSixPolicyHashes())||!same(plan.limits,limits)||!same(plan.child,fixedChild(plan.preset)))fail('fixed fresh future proposal/hash/clock/accounting/policy/bounds differ')
 frozenJSON(plan);plans.set(plan,old)
 return frozenJSON({...structuredClone(plan.child),childPlanSha256:hash({...plan.child,parentPlanSha256:planSha256})})
}

export function getFcfFutureSourcePlanAccounting(plan){return history(plans.get(plan),plan?.preset)}

/** One string namespace per spent history, regardless of proposal alternatives.
 * No tag is created and this helper does not establish claim eligibility.
 */
export function fcfFutureSourceClaimRef(plan){
 const old=getFcfFutureSourcePlanAccounting(plan)
 return `refs/tags/fcf-inventory-claim/${plan.preset===FCF_G1_SOURCE_PROTOCOL?'future-after-':'future-g9-after-'}${hash(historyBinding(old,plan.preset))}`
}

/** Reader-registered plan scope only; data catalog membership grants nothing. */
export function getFcfFutureSourcePlanScope(plan){const old=getFcfFutureSourcePlanAccounting(plan);return frozenJSON({...plan.child,protocol:plan.preset,priorSourceGETs:old.priorSourceGETs,plannedCumulativeSourceGETs:old.priorSourceGETs+240,maximumCumulativeSourceGETs:478,jobName:plan.child.targetSlug.endsWith('-g1')?'missing-inventory-g1':'missing-inventory-g9'})}
