import test from 'node:test'
import assert from 'node:assert/strict'
import {createBulkSourceBudget} from './bulk-source-budget.mjs'

test('shared host cap counts attempts, spaces starts, and isolates stopped hosts',async()=>{
 let time=0;const calls=[],receipts=[]
 const budget=createBulkSourceBudget({limits:{'wmzpn.pl':2,'www.fussball.de':2},now:()=>time,sleep:async ms=>{time+=ms},fetch:async(url)=>{calls.push([url,time]);return new Response('ok',{headers:{'content-type':'text/html'}})},onCheckpoint:s=>receipts.push(s)})
 const pl='https://wmzpn.pl/?page_id=1625&leagueN=a&play=b&season=c'
 await budget.fetch(pl);await budget.fetch(pl)
 assert.equal(calls[1][1]-calls[0][1],3000)
 await assert.rejects(budget.fetch(pl),e=>e.sourceStop&&e.reason_code==='SOURCE_BUDGET_EXHAUSTED')
 await budget.fetch('https://www.fussball.de/spieltag/-/staffel/'+'A'.repeat(32)+'-G')
 assert.equal(calls.length,3);assert.equal(budget.snapshot().hosts['wmzpn.pl'].requests,2)
 assert.ok(receipts.some(s=>s.hosts['wmzpn.pl'].pending))
})
test('refusal is durable, no retry, and no credentials or redirects are forwarded',async()=>{
 let count=0
 const b=createBulkSourceBudget({limits:{'wmzpn.pl':3},fetch:async(_,init)=>{count++;assert.equal(init.redirect,'manual');assert.equal(new Headers(init.headers).has('authorization'),false);return new Response('blocked',{status:403})}})
 const url='https://wmzpn.pl/?page_id=1625&leagueN=a&play=b&season=c'
 await assert.rejects(b.fetch(url,{headers:{authorization:'secret'}}),e=>e.sourceStop)
 await assert.rejects(b.fetch(url),e=>e.sourceStop)
 assert.equal(count,1);assert.equal(b.snapshot().hosts['wmzpn.pl'].requests,1)
})
test('only observed public origins/routes/methods are admitted before request',async()=>{
 let count=0;const b=createBulkSourceBudget({limits:{'wmzpn.pl':3},fetch:async()=>{count++;return new Response('ok')}})
 for(const url of ['https://user:pass@wmzpn.pl/','http://wmzpn.pl/','https://wmzpn.pl/wp-admin/','https://other.test/'])await assert.rejects(b.fetch(url))
 assert.equal(count,0)
})
test('public report POST is metered and oversized streaming body cancels',async()=>{
 let cancelled=false
 const b=createBulkSourceBudget({limits:{'wmzpn.pl':2},maxBytes:4,fetch:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(5))},cancel(){cancelled=true}}))})
 await assert.rejects(b.fetch('https://wmzpn.pl/wp-admin/admin-ajax.php',{method:'POST',body:'action=match_history&matchid=11111111-1111-4111-8111-111111111111'}),e=>e.sourceStop)
 assert.equal(cancelled,true);assert.equal(b.snapshot().hosts['wmzpn.pl'].requests,1)
})
