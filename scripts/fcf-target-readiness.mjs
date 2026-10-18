import {createHash} from 'node:crypto'
const fail=m=>{throw Error(`FCF_READINESS: ${m}`)},quotas=[2,5,5,3],roles=['GK','DEF','MID','FWD']
const vector=p=>({id:p.id,value:Number(p.value),value_start:p.value_start==null?null:Number(p.value_start),position:p.position,position_source:p.position_source})
/** Exact bounded club/position DP; actual IDs form a separately checked witness. */
export function cheapestFcfLegal15(players){
 if(!Array.isArray(players)||new Set(players.map(p=>p.id)).size!==players.length||players.some(p=>!Number.isSafeInteger(p.id)||p.id<1||!Number.isSafeInteger(p.team_id)||p.team_id<1||p.position!==null&&!roles.includes(p.position)||!Number.isFinite(Number(p.value))||Number(p.value)<=0))fail('unique actual pool/roles/values required')
 const clubs=new Map();for(const p of players){if(p.active===false||p.position===null)continue;if(!clubs.has(p.team_id))clubs.set(p.team_id,[]);clubs.get(p.team_id).push(p)}
 let dp=new Map([['0,0,0,0',{n:[0,0,0,0],cost:0,squad:[]}]])
 for(const members of clubs.values()){
  const lists=roles.map(role=>members.filter(p=>p.position===role).sort((a,b)=>Number(a.value)-Number(b.value)||a.id-b.id).slice(0,3)),options=[]
  function enumerate(i,n,chosen,cost){if(i===4){options.push({n,squad:chosen,cost});return}for(let take=0;take<=Math.min(lists[i].length,3-chosen.length,quotas[i]);take++)enumerate(i+1,[...n,take],[...chosen,...lists[i].slice(0,take)],cost+lists[i].slice(0,take).reduce((s,p)=>s+Math.round(Number(p.value)*10),0))}
  enumerate(0,[],[],0);const next=new Map()
  for(const state of dp.values())for(const option of options){const n=state.n.map((v,i)=>v+option.n[i]);if(n.some((v,i)=>v>quotas[i]))continue;const k=n.join(','),cost=state.cost+option.cost,old=next.get(k);if(!old||cost<old.cost)next.set(k,{n,cost,squad:[...state.squad,...option.squad]})}
  dp=next
 }
 const r=dp.get(quotas.join(','));return r?{cost:r.cost/10,squad:r.squad.map(p=>({...p}))}:null
}
export function verifyFcfPriceReplay({targetSlug,snapshot,replay,modelSha256}){
 const cid={'es-ct-segona-g1':783,'es-ct-tercera-g9':797}[targetSlug]
 if(!cid||!snapshot||!Array.isArray(snapshot.players)||replay?.schemaVersion!==1||replay.kind!=='fcf-target-price-replay'||replay.targetSlug!==targetSlug||replay.competitionId!==cid||replay.season!=='2026/27'||replay.modelSha256!==modelSha256||!/^[a-f0-9]{64}$/.test(modelSha256??'')||!Number.isInteger(replay.computedCount)||replay.computedCount<1||!Array.isArray(replay.players))fail('complete unchanged pricing replay required')
 const actual=snapshot.players.map(vector).sort((a,b)=>a.id-b.id),expected=replay.players.map(vector).sort((a,b)=>a.id-b.id)
 if(new Set(actual.map(p=>p.id)).size!==actual.length||new Set(expected.map(p=>p.id)).size!==expected.length||JSON.stringify(actual)!==JSON.stringify(expected)||actual.some(p=>!Number.isFinite(p.value)||p.value<=0||p.value_start!==null&&!Number.isFinite(p.value_start)))fail('full persisted pricing/position provenance vector differs')
 return expected
}
export function buildFcfTargetReadiness({targetSlug,pricingSnapshot,replay,modelSha256,sourceData,now=Date.now()}){
 const text=pricingSnapshot?.snapshotText,hash=pricingSnapshot?.snapshotSha256
 if(typeof text!=='string'||Buffer.byteLength(text)>32*1024*1024||createHash('sha256').update(text).digest('hex')!==hash)fail('exact SQL dependency snapshot TEXT/SHA required')
 let snapshot;try{snapshot=JSON.parse(text)}catch{fail('invalid SQL dependency snapshot')}
 const priceVector=verifyFcfPriceReplay({targetSlug,snapshot,replay,modelSha256})
 if(sourceData?.targetSlug!==targetSlug||sourceData.clubs?.length!==16||sourceData.fixtures?.length!==240)fail('complete authenticated selected source target required')
 const pool=snapshot.players.filter(p=>p.active),squad=cheapestFcfLegal15(pool)
 if(new Set(pool.map(p=>p.team_id)).size!==16||!squad||squad.cost>100||Math.max(...pool.map(p=>Number(p.value)))<8||pool.filter(p=>Number(p.value)===4.5).length/pool.length>.7)fail('actual varied prices and affordable legal15 required')
 const r6=sourceData.fixtures.filter(f=>f.round===6)
 if(r6.length!==8||r6.some(f=>f.statisticsStatus!=='pending'||!f.time||f.date<'2026-10-24')||!Number.isFinite(now))fail('genuine future source R6 required')
 // Exact timezone/deadline and source keepers are recomputed under SQL locks.
 return{modelSha256,pricingSnapshotText:text,pricingSnapshotSha256:hash,priceVector,squad:squad.squad.map(p=>({id:p.id})),cheapestLegal15:squad.cost}
}
