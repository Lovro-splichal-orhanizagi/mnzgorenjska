// TEST ONLY: genuine immutable37-spent accounting; all NEW execution, Git,
// ruleset and consumption metadata below is synthetic, with no source reads.
import {createHash} from 'node:crypto'
import {readFcfPostSixAccounting} from './fcf-post-six-accounting.mjs'
import {postSixAccountingWire} from './fcf-post-six-accounting-test-fixture.mjs'
import {buildFcfFutureSourcePlan,fcfFutureSourceClaimRef} from './fcf-future-source-plan.mjs'
import {claimFixture,consumptionFixture,rulesetSnapshot,sha,zip} from './fcf-missing-inventory-test-fixture.mjs'
import {snapshotFcfInventoryRuleset,readFcfInventoryExecutionClaim} from './fcf-missing-inventory-claim.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
let sequence=0,accounting
export function futureClaimFixture(){
 const now=Date.parse('2026-10-27T12:00:00Z')+(++sequence)
 accounting??=readFcfPostSixAccounting(postSixAccountingWire())
 const ruleset={...structuredClone(rulesetSnapshot.ruleset),updated_at:new Date(now-2000).toISOString()}
 const snapshot=snapshotFcfInventoryRuleset({ruleset,checkedUTC:new Date(now-1000).toISOString(),now})
 const plan=buildFcfFutureSourcePlan({sourceCommit:'a'.repeat(40),accountingProof:accounting,rulesetSnapshotSha256:hash(snapshot),now}),f=claimFixture(plan)
 f.now=now+300000;f.rulesets=[ruleset]
 Object.assign(f.claim,{schemaVersion:5,kind:'fcf-future-source-execution-claim',rulesetSnapshot:snapshot,claimedUTC:new Date(now+1000).toISOString(),maximumSourceGETs:478,accountingSha256:hash(plan.accountingBinding),priorSourceGETs:37,maximumNewSourceGETs:240,plannedCumulativeSourceGETs:277})
 f.ref.ref=fcfFutureSourceClaimRef(plan)
 f.claimBytes=Buffer.from(JSON.stringify(f.claim))
 const blobSha=createHash('sha1').update(`blob ${f.claimBytes.length}\0`).update(f.claimBytes).digest('hex')
 f.claimCommit.tree.tree[0].sha=blobSha;Object.assign(f.claimCommit.blob,{sha:blobSha,size:f.claimBytes.length,content:f.claimBytes.toString('base64')});f.expected.claimJsonSha256=sha(f.claimBytes)
 return f
}
export function futureConsumptionFixture(f){
 const claimProof=readFcfInventoryExecutionClaim(f),c=consumptionFixture(claimProof)
 Object.assign(c.manifest,{schemaVersion:4,kind:'fcf-future-source-consumed',consumedUTC:new Date(f.now).toISOString()})
 c.manifestBytes=Buffer.from(JSON.stringify(c.manifest));c.zipBytes=zip([{name:'manifest.json',body:c.manifestBytes}]);c.artifact.size_in_bytes=c.zipBytes.length;c.artifact.digest=c.expected.artifactDigest=`sha256:${sha(c.zipBytes)}`;c.expected.manifestSha256=sha(c.manifestBytes);c.now=f.now
 return c
}
