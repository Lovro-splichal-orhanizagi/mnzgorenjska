// Fixed source301 hosted proof. References are reviewed DATA locators only;
// actual private readers authenticate source/claim/history/ZIPs under real time.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {readFcfDraftAsset} from './fcf-inventory-github.mjs'
import {readFcfG1RemainderParent} from './fcf-g1-remainder-parent.mjs'
import {readFcfG1RemainderAppendLink} from './fcf-g1-remainder-actions.mjs'
import {getFcfG1FinalizedRemainderData} from './fcf-g1-remainder-source.mjs'
import {readFcfG1QuarantineNativeReadiness,getFcfG1QuarantineNativeReadiness} from './fcf-g1-quarantine-native-readiness.mjs'
import {verifyFcfG1TerminalJobInventory} from './fcf-g1-remainder-job-inventory.mjs'
import {verifyInventoryExecution,readInventoryZip,exactKeys} from './fcf-missing-inventory-artifact.mjs'
import {auditFcfG1QuarantineDocuments} from './fcf-g1-quarantine-audit.mjs'
const pins=JSON.parse(readFileSync(new URL('./fcf-g1-native-preflight-source.json',import.meta.url))),repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',sha=b=>createHash('sha256').update(b).digest('hex'),fail=m=>{throw Error('FCF_G1_PREFLIGHT_SOURCE: '+m)},need=(v,m)=>{if(!v)fail(m)},actor=a=>a?.id===25134229&&a.login==='nejcar20'&&a.type==='User'
export async function readFcfG1NativePreflightSource(input){
 exactKeys(input,['github','frozenDirectory'],'fixed G1 source301 reader');const {github,frozenDirectory}=input
 const get=(p,b=false)=>{need(typeof p==='string'&&p.startsWith(repo),'fixed repository GET required');return github(p,b)}
 const approvalBytes=await readFcfDraftAsset({id:pins.approvalAssetId,digest:'sha256:'+pins.approvalSha256,maximumBytes:8388608,github:get}),a=JSON.parse(approvalBytes)
 need(a.schemaVersion===7&&a.kind==='fcf-g1-remainder-quarantine-approval'&&a.sourceCommit===pins.sourceCommit&&a.plan?.planSha256===pins.planSha256&&Array.isArray(a.appendSources)&&a.appendSources.length===1,'fixed genuine original approval required')
 const run=await get(repo+'actions/runs/'+pins.sourceRunId),js=await get(repo+`actions/runs/${pins.sourceRunId}/attempts/1/jobs?per_page=100&page=1`)
 need(run.status==='completed'&&run.conclusion==='success'&&String(run.id)===pins.sourceRunId&&run.head_sha===pins.sourceCommit&&run.run_attempt===1&&actor(run.actor)&&actor(run.triggering_actor)&&js.total_count===19&&js.jobs?.length===19,'actual completed successful source301 required')
 verifyFcfG1TerminalJobInventory({run,jobs:js.jobs,execution:pins.records.claim.execution})
 const listed=await get(repo+`actions/runs/${pins.sourceRunId}/artifacts?per_page=100&page=1`),expected=[pins.staged,pins.records.consumption,pins.records.child,pins.audit,pins.records.finalReceipt]
 need(listed.total_count===5&&listed.artifacts?.length===5&&new Set(listed.artifacts.map(x=>x.id)).size===5&&expected.every(e=>listed.artifacts.some(x=>String(x.id)===e.artifactId&&x.name===e.name&&x.digest===e.artifactDigest)),'complete exact5 source artifact inventory required')
 const bundle=async expected=>({run,jobs:js.jobs,expected,artifact:await get(repo+'actions/artifacts/'+expected.artifactId),zipBytes:await get(repo+'actions/artifacts/'+expected.artifactId+'/zip',true)})
 const staged=await bundle(pins.staged);verifyInventoryExecution({...staged,jobName:'missing-inventory-approval',stepNames:['Stage reviewed FCF inventory approval','Retain reviewed FCF inventory approval'],artifactName:pins.staged.name,runPhase:'inventory-record'});need(readInventoryZip({...staged,members:{'manifest.json':8388608}}).get('manifest.json').equals(approvalBytes),'actual staged approval differs')
 const parentProof=await readFcfG1RemainderParent({...a.parent,frozenDirectory,github:get}),appendProofs=[]
 for(const data of a.appendSources)appendProofs.push(await readFcfG1RemainderAppendLink({data,parentProof,appendProofs,github:get}))
 const rawProof=await readFcfG1RemainderAppendLink({data:{plan:a.plan,...pins.records},parentProof,appendProofs,github:get}),raw=getFcfG1FinalizedRemainderData(rawProof)
 need(raw.manifest.actualSourceGETs===301&&raw.manifest.priorSourceGETs===232&&raw.manifest.newSourceGETs===69&&raw.manifest.sourceFreshUntil===pins.sourceFreshUntil&&raw.manifest.firstSourceUTC===pins.firstSourceUTC&&raw.binding.claimCommit===pins.claimCommit&&raw.binding.claimJsonSha256===pins.claimJsonSha256,'actual private232/69/301 original clocks/claim required')
 const ref=await get(repo+'git/ref/'+raw.binding.claimRef.slice(5)),commit=await get(repo+'git/commits/'+ref.object.sha),tree=await get(repo+'git/trees/'+commit.tree.sha),base=await get(repo+'git/commits/'+pins.sourceCommit),baseTree=await get(repo+'git/trees/'+base.tree.sha),entry=tree.tree?.filter(e=>e.path==='.fcf-inventory-claim.json'),entries=t=>JSON.stringify(t.map(({path,mode,type,sha})=>({path,mode,type,sha})).sort((a,b)=>a.path.localeCompare(b.path)))
 need(ref.object.type==='commit'&&ref.object.sha===pins.claimCommit&&commit.parents?.length===1&&commit.parents[0].sha===pins.sourceCommit&&tree.truncated===false&&baseTree.truncated===false&&entry?.length===1&&entries(tree.tree)===entries([...baseTree.tree,entry[0]]),'actual source base plus claim-only tree required')
 const audit=await bundle(pins.audit);verifyInventoryExecution({...audit,jobName:'missing-inventory-g1',stepNames:['Audit retained target inventory offline','Retain target inventory offline audit'],artifactName:pins.audit.name,runPhase:'inventory-record'});const actual=readInventoryZip({...audit,members:{'manifest.json':8388608}}).get('manifest.json'),rebuilt=Buffer.from(JSON.stringify(auditFcfG1QuarantineDocuments({documents:raw.documents}),null,2)+'\n');need(sha(actual)===pins.audit.manifestSha256&&actual.equals(rebuilt),'actual hosted original quarantine audit differs')
 const proof=readFcfG1QuarantineNativeReadiness({rawProof});getFcfG1QuarantineNativeReadiness(proof);return proof
}
