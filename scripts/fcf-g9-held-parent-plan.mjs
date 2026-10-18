// Distinct fixed source plan. Validation grants no claim or source execution.
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {fcfMissingInventoryPolicyHashes} from './fcf-missing-inventory-plan.mjs'
import {requireFcfHeldParentAccounting,requireFcfHeldParentContinuationEligibility,fcfCumulativeSourceGETs} from './fcf-held-parent-accounting.mjs'
import {inventoryFail as fail,exactKeys,frozenJSON,commitId,sha256Id,validUTC} from './fcf-missing-inventory-artifact.mjs'
export const FCF_G9_HELD_PARENT_PROTOCOL='g9-only-after-held-parent-v1'
const plans=new WeakMap(),same=(a,b)=>hash(a)===hash(b)
const limits={maximumBodyBytes:2097152,maximumManifestBytes:8388608,maximumExpandedBytes:201326592,maximumZipBytes:104857600,pauseMs:3000,attemptTimeoutMs:90000,sourceWindowMs:2700000,retentionMarginMs:15000,maximumPlanAgeMs:86400000}
const fixedChild=()=>({targetSlug:'es-ct-tercera-g9',competitionId:797,sourceCode:'4118349-4118588',season:'2026/27',fetchIds:Array.from({length:240},(_,i)=>String(4118349+i)),reuse:[],maximumSourceGETs:240})
export function buildFcfG9HeldParentPlan({sourceCommit,accountingProof,rulesetSnapshotSha256,now=Date.now()}){
 const old=requireFcfHeldParentContinuationEligibility(accountingProof)
 if(!commitId(sourceCommit)||sourceCommit===old.sourceCommit||!sha256Id(rulesetSnapshotSha256)||!Number.isFinite(now)||now<Date.parse(old.completedUTC))fail('new reviewed source commit/ruleset/current clock required')
 const body={schemaVersion:1,kind:'fcf-g9-held-parent-plan',preset:FCF_G9_HELD_PARENT_PROTOCOL,sourceCommit,createdUTC:new Date(now).toISOString(),rulesetSnapshotSha256,maximumCumulativeSourceGETs:477,maximumNewSourceGETs:240,priorSourceGETs:old.actualSourceGETs,plannedCumulativeSourceGETs:fcfCumulativeSourceGETs({priorSourceGETs:old.actualSourceGETs,newSourceGETs:240}),stopOnDefect:true,accountingBinding:structuredClone(old),policyHashes:fcfMissingInventoryPolicyHashes(),limits:{...limits},child:fixedChild()}
 const plan=frozenJSON({...body,planSha256:hash(body)})
 validateFcfG9HeldParentPlan({plan,accountingProof,expectedPlanSha256:plan.planSha256,now});return plan
}
export function validateFcfG9HeldParentPlan({plan,accountingProof,expectedPlanSha256,now=Date.now()}){
 const old=requireFcfHeldParentContinuationEligibility(accountingProof??plans.get(plan))
 exactKeys(plan,['schemaVersion','kind','preset','sourceCommit','createdUTC','rulesetSnapshotSha256','maximumCumulativeSourceGETs','maximumNewSourceGETs','priorSourceGETs','plannedCumulativeSourceGETs','stopOnDefect','accountingBinding','policyHashes','limits','child','planSha256'],'G9 held-parent plan')
 const {planSha256,...body}=plan
 if(plan.schemaVersion!==1||plan.kind!=='fcf-g9-held-parent-plan'||plan.preset!==FCF_G9_HELD_PARENT_PROTOCOL||!sha256Id(expectedPlanSha256)||planSha256!==expectedPlanSha256||hash(body)!==planSha256||!commitId(plan.sourceCommit)||plan.sourceCommit===old.sourceCommit||!sha256Id(plan.rulesetSnapshotSha256)||!validUTC(plan.createdUTC)||!Number.isFinite(now)||Date.parse(plan.createdUTC)>now||now-Date.parse(plan.createdUTC)>limits.maximumPlanAgeMs||Date.parse(plan.createdUTC)<Date.parse(old.completedUTC)||plan.maximumCumulativeSourceGETs!==477||plan.maximumNewSourceGETs!==240||plan.priorSourceGETs!==16||plan.plannedCumulativeSourceGETs!==256||plan.stopOnDefect!==true||!same(plan.limits,limits)||!same(plan.accountingBinding,old)||!same(plan.policyHashes,fcfMissingInventoryPolicyHashes())||!same(plan.child,fixedChild()))fail('fixed G9 plan/hash/time/accounting/policy/limits differ')
 frozenJSON(plan);plans.set(plan,old)
 return frozenJSON({...structuredClone(plan.child),childPlanSha256:hash({...plan.child,parentPlanSha256:planSha256})})
}
export function getFcfG9HeldParentAccounting(plan){return requireFcfHeldParentAccounting(plans.get(plan))}
/** Flat create-once ref is keyed by spent parent, preventing plan-hash fan-out. */
export function fcfG9HeldParentClaimRef(plan){
 const old=getFcfG9HeldParentAccounting(plan)
 return `refs/tags/fcf-inventory-claim/g9-after-${old.planSha256}`
}
