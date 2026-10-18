import test from 'node:test'
import assert from 'node:assert/strict'
const api=await import('./fcf-target-readiness.mjs').catch(()=>({}))
function pool(){return Array.from({length:16},(_,club)=>['GK','DEF','DEF','MID','MID','FWD'].map((position,i)=>({id:club*10+i+1,team_id:club+1,position,value:4+i/2,active:true}))).flat()}
test('cheapest legal15 returns actual quotas and maximum3 perclub',()=>{
 assert.equal(typeof api.cheapestFcfLegal15,'function');const players=pool(),r=api.cheapestFcfLegal15(players)
 assert.equal(r.squad.length,15);assert.ok(r.cost<=100)
 for(const[pos,n]of Object.entries({GK:2,DEF:5,MID:5,FWD:3}))assert.equal(r.squad.filter(p=>p.position===pos).length,n)
 for(const team of new Set(r.squad.map(p=>p.team_id)))assert.ok(r.squad.filter(p=>p.team_id===team).length<=3)
 assert.equal(r.cost,r.squad.reduce((a,p)=>a+p.value,0))
})
test('cheap wrong positions, oneclub, duplicates, unknown roles and unaffordable pool never pass',()=>{
 assert.equal(api.cheapestFcfLegal15(pool().map(p=>({...p,position:'MID'}))),null)
 assert.equal(api.cheapestFcfLegal15(pool().map(p=>({...p,team_id:1}))),null)
 assert.throws(()=>api.cheapestFcfLegal15([...pool(),pool()[0]]),/FCF_READINESS/)
 assert.throws(()=>api.cheapestFcfLegal15(pool().map(p=>({...p,position:'INVENTED'}))),/FCF_READINESS/)
 assert.ok(api.cheapestFcfLegal15(pool().map(p=>({...p,value:12}))).cost>100)
 assert.equal(api.cheapestFcfLegal15([...pool(),{id:9999,team_id:1,position:null,value:4.5,active:true}]).cost,api.cheapestFcfLegal15(pool()).cost,'ordinary unknown field position is not invented or used in the legal witness')
})
test('full recomputed pricing vector binds every unchanged/protected position and price',()=>{
 assert.equal(typeof api.verifyFcfPriceReplay,'function')
 const players=pool().map(p=>({...p,value_start:p.value,position_source:'ugibanje'})),replay={schemaVersion:1,kind:'fcf-target-price-replay',targetSlug:'es-ct-segona-g1',competitionId:783,season:'2026/27',modelSha256:'a'.repeat(64),computedCount:96,players:players.map(({id,value,value_start,position,position_source})=>({id,value,value_start,position,position_source}))}
 assert.equal(api.verifyFcfPriceReplay({targetSlug:replay.targetSlug,snapshot:{players},replay,modelSha256:replay.modelSha256}).length,96)
 for(const mutate of[r=>r.players.pop(),r=>r.players[0].value+=.5,r=>r.players[0].position_source='admin',r=>r.computedCount=0]){
  const bad=structuredClone(replay);mutate(bad);assert.throws(()=>api.verifyFcfPriceReplay({targetSlug:replay.targetSlug,snapshot:{players},replay:bad,modelSha256:replay.modelSha256}),/FCF_READINESS/)
 }
})
