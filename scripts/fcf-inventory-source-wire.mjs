// Repository-scoped GET-only raw evidence transport. This issues no capability.
import {inventoryFail as fail,exactKeys,nativeId} from './fcf-missing-inventory-artifact.mjs'
const repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/'
export async function readFcfInventorySourceWire({source,github,now=Date.now()}){
 if(typeof github!=='function')fail('explicit GitHub GET adapter required')
 const get=(path,binary=false)=>github(repo+path,binary)
 const jobs=async(run,attempt)=>{const out=[];for(let p=1;p<=100;p++){const r=await get(`actions/runs/${run}/attempts/${attempt}/jobs?per_page=100&page=${p}`);if(!Number.isSafeInteger(r.total_count)||!Array.isArray(r.jobs)||r.jobs.length>100)fail('actual job pagination required');out.push(...r.jobs);if(out.length===r.total_count)return out;if(r.jobs.length<100||out.length>r.total_count)fail('incomplete actual jobs')}fail('job pagination bound exceeded')}
 const record=async expected=>{if(!expected||!['runId','runAttempt','artifactId'].every(k=>nativeId(expected[k])))fail('explicit artifact/run identity required');const [artifact,run,js,zipBytes]=await Promise.all([get(`actions/artifacts/${expected.artifactId}`),get(`actions/runs/${expected.runId}`),jobs(expected.runId,expected.runAttempt),get(`actions/artifacts/${expected.artifactId}/zip`,true)]);return{zipBytes,artifact,run,jobs:js,expected}}
 const fresh=source?.protocol==='g9-only-after-held-parent-v1'
 exactKeys(source,fresh?['protocol','accounting','plan','claim','consumption','child','finalReceipt']:['plan','claim','consumption','children','finalReceipt'],'source references')
 if(fresh&&source.accounting?.protocol!==undefined)fail('old accounting must use the exact original protocol')
 const e=source.claim?.expected,execution=source.claim?.execution
 if(!e||!nativeId(e.rulesetId)||!/^[a-f0-9]{64}$/.test(source.plan?.planSha256??''))fail('actual protected source claim pins required')
 const parentHash=source.plan?.accountingBinding?.planSha256;if(fresh&&!/^[a-f0-9]{64}$/.test(parentHash??''))fail('exact old parent hash required')
 const ref=await get(`git/ref/tags/fcf-inventory-claim/${fresh?'g9-after-'+parentHash:source.plan.planSha256}`),commit=await get(`git/commits/${ref.object.sha}`),tree=await get(`git/trees/${commit.tree.sha}`),entries=tree.tree?.filter(x=>x.path==='.fcf-inventory-claim.json')
 if(entries?.length!==1)fail('exact protected source claim entry required')
 const blob=await get(`git/blobs/${entries[0].sha}`),rule=await get(`rulesets/${e.rulesetId}`),claim={execution,ref,claimCommit:{commit,tree,blob},claimBytes:Buffer.from(blob.content,'base64'),rulesets:[rule],expected:e},consumption=await record(source.consumption),finalReceipt=await record(source.finalReceipt)
 if(fresh){exactKeys(source.child,['targetSlug','inventory','audit'],'new G9 source references');return{protocol:source.protocol,accounting:await readFcfInventorySourceWire({source:source.accounting,github,now}),plan:source.plan,claim,consumption,child:{targetSlug:source.child.targetSlug,inventory:await record(source.child.inventory),audit:await record(source.child.audit)},finalReceipt,now}}
 if(!Array.isArray(source.children)||source.children.length!==2)fail('exact two original child references required')
 const children=[]
 for(const c of source.children){exactKeys(c,['targetSlug','inventory','audit','unstarted'],'original child references');let unstarted=null;if(c.unstarted){const x=c.unstarted;if(!nativeId(x.runId)||!nativeId(x.runAttempt))fail('actual skipped child run required');unstarted={run:await get(`actions/runs/${x.runId}`),jobs:await jobs(x.runId,x.runAttempt),expected:x.expected}}children.push({targetSlug:c.targetSlug,inventory:c.inventory?await record(c.inventory):null,audit:c.audit?await record(c.audit):null,unstarted})}
 return{plan:source.plan,claim,consumption,children,finalReceipt,now}
}
