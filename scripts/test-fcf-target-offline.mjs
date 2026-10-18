import test from 'node:test'
import assert from 'node:assert/strict'
const api=await import('./fcf-target-offline.mjs').catch(()=>({}))
const url='https://www.fcf.cat/ca/competicio/acta/4109389'
function guard(){
 assert.equal(typeof api.fcfOfflineFetch,'function','source-closed FCF fetch transformer exists')
 const calls=[],documents=new Map([[url,'<html>SYNTHETIC retained packet</html>']])
 return{fetch:api.fcfOfflineFetch(documents,async(...args)=>{calls.push(args);return new Response('DB')}),calls,documents}
}
test('exact packet GET serves memory and database transport stays available',async()=>{
 const g=guard();assert.equal(await(await g.fetch(url)).text(),'<html>SYNTHETIC retained packet</html>');assert.equal(g.calls.length,0)
 assert.equal(await(await g.fetch('https://example.supabase.co/rest/v1/players')).text(),'DB');assert.equal(g.calls.length,1)
})
test('Request and URL inputs cannot bypass source closure',async()=>{
 const g=guard();assert.equal((await g.fetch(new URL(url))).status,200);assert.equal((await g.fetch(new Request(url))).status,200)
 for(const input of[new Request(url,{method:'POST',body:'x'}),new URL(url+'?unexpected=1'),new Request(url.replace('www.fcf.cat','www.fcf.cat.'))])await assert.rejects(g.fetch(input),/FCF_OFFLINE/)
 assert.equal(g.calls.length,0)
})
test('all unpacketized FCF host/path/method variants refuse without network fallback',async()=>{
 const g=guard()
 for(const bad of[url.replace('www.fcf.cat','fcf.cat'),url.replace('www.fcf.cat','other.fcf.cat.'),url.replace('www.fcf.cat','www.fcf.cat:444'),url.replace('https:','http:'),url.replace('www.fcf.cat','user:pass@www.fcf.cat'),url+'#hash','https://www.fcf.cat/api/anything','https://www.fcf.cat/_next/anything',url.replace('4109389','4116189')])await assert.rejects(g.fetch(bad),/FCF_OFFLINE/)
 for(const method of['POST','HEAD','DELETE','UNKNOWN','get'])await assert.rejects(g.fetch(url,{method}),/FCF_OFFLINE/)
 assert.equal(g.calls.length,0)
})
test('packet source map is copied and cannot later gain an extra FCF route',async()=>{
 const g=guard();g.documents.set(url.replace('4109389','4109390'),'unapproved later addition')
 await assert.rejects(g.fetch(url.replace('4109389','4109390')),/FCF_OFFLINE/);assert.equal(g.calls.length,0)
})
