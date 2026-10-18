// Source-free approval authentication, with explicit GET-only repository transport.
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {readFcfInventorySourceWire} from './fcf-inventory-source-wire.mjs'
import {readFcfHeldParentAccounting} from './fcf-held-parent-accounting.mjs'
import {validateFcfG9HeldParentPlan} from './fcf-g9-held-parent-plan.mjs'
import {snapshotFcfInventoryRuleset} from './fcf-missing-inventory-claim.mjs'
import {inventoryFail as fail,exactKeys,jsonBytes,nativeId} from './fcf-missing-inventory-artifact.mjs'
export async function readFcfG9HeldParentApproval({bytes,sourceCommit,github,now=Date.now()}){
 const a=jsonBytes(bytes,'new G9 approval')
 exactKeys(a,['schemaVersion','kind','sourceCommit','plan','accounting','rulesetId','rulesetSnapshot'],'new G9 approval')
 if(a.schemaVersion!==2||a.kind!=='fcf-g9-held-parent-approval'||a.sourceCommit!==sourceCommit||a.plan?.sourceCommit!==sourceCommit||!nativeId(a.rulesetId)||a.accounting?.protocol!==undefined)fail('exact new G9 root approval required')
 const accounting=await readFcfInventorySourceWire({source:a.accounting,github,now}),accountingProof=readFcfHeldParentAccounting(accounting)
 validateFcfG9HeldParentPlan({plan:a.plan,accountingProof,expectedPlanSha256:a.plan?.planSha256,now})
 const protection=snapshotFcfInventoryRuleset({ruleset:a.rulesetSnapshot?.ruleset,checkedUTC:a.rulesetSnapshot?.checkedUTC,now})
 if(hash(protection)!==hash(a.rulesetSnapshot)||String(protection.ruleset.id)!==a.rulesetId||hash(protection)!==a.plan.rulesetSnapshotSha256)fail('new G9 approved ruleset snapshot differs')
 return a
}
