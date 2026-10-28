// TEST ONLY capture controls: authentic spent37 + retained historical bytes,
// with constructed remaining source pages, current claims and Actions metadata.
// These files do not prove a live source capture or launch readiness.
import {readFileSync,mkdtempSync,realpathSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {futureClaimFixture,futureConsumptionFixture} from './fcf-future-source-test-fixture.mjs'
import {readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
import {waitForFcfInventorySourceSlot} from './fcf-inventory-source-coordination.mjs'
import {deriveFcfInventoryHeader} from './fcf-missing-inventory-plan.mjs'
import {sixTestSchedule} from './fcf-six-test-fixture.mjs'
import {syntheticFcfRaw} from './fcf-release-test-fixture.mjs'
let source
export function futureTestDocuments(){
 if(source)return new Map(source)
 const targetSlug='es-ct-tercera-g9',retained=process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR
 const kept=new Map(['4118349','4118350','4118351','4118352','4118353','4118354','4118358'].map(id=>[id,readFileSync(join(retained,'fcf-missing-inventory-diagnostic-es-ct-tercera-g9-39238757730-1',`acta-${id}.html`))]))
 const headers=[...kept].map(([id,bytes])=>deriveFcfInventoryHeader({targetSlug,id,bytes})),s=sixTestSchedule(headers),assigned=new Map()
 for(const [r,rows]of s.rounds.entries())for(const f of rows)if(f.id)assigned.set(f.id,{...f,round:r+1})
 const rest=s.rounds.flatMap((rows,r)=>rows.filter(f=>!f.id).map(f=>({...f,round:r+1})))
 source=new Map(Array.from({length:240},(_,i)=>{const id=String(4118349+i),f=assigned.get(id)??rest.shift();return [id,kept.get(id)??Buffer.from(syntheticFcfRaw({id,slug:targetSlug,round:f.round,home:s.clubs[f.pair[0]],away:s.clubs[f.pair[1]],played:f.round===3,nativePlayers:true}))]}))
 return new Map(source)
}
export async function futureCaptureFixture(t){
 const claimWire=futureClaimFixture(),consumptionWire=futureConsumptionFixture(claimWire),root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-future-')))
 t.after(()=>rmSync(root,{recursive:true,force:true}))
 let time=claimWire.now;const calls=[],docs=futureTestDocuments()
 const f={plan:claimWire.plan,root,claimWire,consumptionWire,targetSlug:'es-ct-tercera-g9',execution:{...claimWire.execution,jobId:'555'},claimProof:readFcfInventoryExecutionClaim(claimWire),consumptionProof:readFcfInventoryConsumptionArtifact(consumptionWire),clock:()=>time,pause:async ms=>{time+=ms},advance:ms=>time+=ms,calls,docs}
 f.request=async(url,init)=>{calls.push({url,init,time});time+=5;return new Response(docs.get(url.split('/').at(-1)))}
 f.sourceSlotProof=await waitForFcfInventorySourceSlot({execution:{...claimWire.execution,startedUTC:new Date(time).toISOString()},listRuns:async()=>({total_count:0,workflow_runs:[]}),listJobs:async()=>({total_count:0,jobs:[]}),clock:f.clock,pause:f.pause})
 return f
}
