// TEST ONLY genuine OLD history, synthetic NEW GitHub/source control metadata.
import {futureActionsFixture} from './fcf-future-actions-test-fixture.mjs'
import {futureAdmissionWire} from './fcf-future-admission-test-fixture.mjs'
const repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/'
export async function futureTransportFixture(t){
 const wire=await futureAdmissionWire(t),f=futureActionsFixture(t,{wire}),all=[wire.consumption,wire.child.inventory,wire.child.audit,wire.finalReceipt],jobs=new Map()
 for(const b of all){f.addArtifact(b);for(const j of b.jobs)jobs.set(j.id,j)}
 f.run=wire.finalReceipt.run;f.jobs=[...jobs.values()]
 const source={protocol:'future-g9-after-six-v1',history:f.history,plan:wire.plan,claim:{execution:wire.claim.execution,expected:wire.claim.expected},consumption:wire.consumption.expected,child:{inventory:wire.child.inventory.expected,audit:wire.child.audit.expected},finalReceipt:wire.finalReceipt.expected}
 return {...f,wire,source,repo}
}
