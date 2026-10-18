import test from 'node:test'
import assert from 'node:assert/strict'
import {hnsWomenRoundCutoff} from './hr-zenske-deadline.mjs'
const options={policy:'midnight-local-v1',offsetHours:6}
const fixture=(date='2026-10-25',time=null)=>({id:'future-id',datum:date,ura:time})
test('published date-only fixture gives conservative fantasy midnight Zagreb before DST changes',()=>{
 const f=fixture(),r=hnsWomenRoundCutoff([f],options)
 assert.equal(r.deadlineAt,'2026-10-24T22:00:00.000Z');assert.equal(r.reason,'fantasy_midnight_date_only')
 assert.equal(r.candidates[0].sourceKickoff,null);assert.equal(f.ura,null)
})
test('winter and spring-transition midnight retain the actual local offset',()=>{
 assert.equal(hnsWomenRoundCutoff([fixture('2026-12-06')],options).deadlineAt,'2026-12-05T23:00:00.000Z')
 assert.equal(hnsWomenRoundCutoff([fixture('2027-03-28')],options).deadlineAt,'2027-03-27T23:00:00.000Z')
})
test('known kickoff keeps configured6hour offset and does not claim date-only fallback',()=>{
 const r=hnsWomenRoundCutoff([fixture('2026-10-25','15:00')],options)
 assert.equal(r.deadlineAt,'2026-10-25T08:00:00.000Z');assert.equal(r.reason,'published_kickoff_offset')
 assert.equal(r.candidates[0].sourceKickoff,'15:00')
})
test('round chooses earliest candidate over all dates and source time completeness',()=>{
 const r=hnsWomenRoundCutoff([fixture('2026-10-25'),fixture('2026-10-24','22:00')],options)
 assert.equal(r.deadlineAt,'2026-10-24T14:00:00.000Z')
 assert.equal(hnsWomenRoundCutoff([fixture('2026-10-25'),fixture('2026-10-25','03:00')],options).deadlineAt,'2026-10-24T20:00:00.000Z')
})
for(const f of [fixture(null),fixture('bad'),fixture('2026-02-31'),fixture('2026-10-25','25:00'),fixture('2027-03-28','02:30'),fixture('2026-10-25','02:30')])test(`unknown/invalid/nonexistent local source clock blocks ${JSON.stringify(f)}`,()=>assert.throws(()=>hnsWomenRoundCutoff([f],options),/hns women|date|clock|local/i))
test('only persisted explicit policy opts in, empty fixtures and invalid offset fail',()=>{
 for(const opts of [{},{...options,policy:null},{...options,offsetHours:-1}])assert.throws(()=>hnsWomenRoundCutoff([fixture()],opts),/policy|offset/i)
 assert.throws(()=>hnsWomenRoundCutoff([],options),/fixture/i)
})
