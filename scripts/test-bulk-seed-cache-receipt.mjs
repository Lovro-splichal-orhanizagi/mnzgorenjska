import test from 'node:test'
import assert from 'node:assert/strict'
import {admitSeedCache} from './bulk-seed-cache-receipt.mjs'
const options={expectedSha:'a'.repeat(40),runId:'123',runAttempt:'1'},cache={id:5,key:'zapisniki-DE-bulk-123-1',ref:'refs/heads/main',version:'hash',size_in_bytes:5000}
test('a best-effort upload warning cannot authorize activation without a durable exact-key cache',()=>{
 for(const inventory of [{total_count:0,actions_caches:[]},{total_count:1,actions_caches:[]},...['key','ref','size_in_bytes'].map(k=>({total_count:1,actions_caches:[{...cache,[k]:k==='size_in_bytes'?0:'wrong'}]}))])assert.throws(()=>admitSeedCache({...options,inventory}))
 const receipt=admitSeedCache({...options,inventory:{total_count:1,actions_caches:[cache]}})
 assert.equal(receipt.cache.key,cache.key);assert.equal(receipt.persisted,true)
})
