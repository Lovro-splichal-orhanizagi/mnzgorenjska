import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {selectBatch} from './hns-recurring-queue.mjs'
const sha=b=>createHash('sha256').update(b).digest('hex')
function fixture(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'hns-queue-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));for(const p of ['snapshots','receipts'])fs.mkdirSync(path.join(d,p));return d}
function add(d,time,status='complete'){const body=JSON.stringify({source:'hns',schema:2,mode:'recurring',createdAt:time,status,leagues:[{id:1}]}),id=sha(body);fs.writeFileSync(path.join(d,'snapshots',id+'.json'),body);return id}
test('failed or unacknowledged scoring batch stays ahead of fresh captures',t=>{
 const d=fixture(t),old=add(d,'2026-11-17T12:00:00Z'),fresh=add(d,'2026-11-18T12:00:00Z')
 assert.equal(selectBatch(d).sha256,old)
 // Partial imports do not create a receipt. Only the successful three-shard worker does.
 fs.writeFileSync(path.join(d,'receipts',old+'.json'),JSON.stringify({sha256:old,status:'import-and-scoring-complete'}))
 assert.equal(selectBatch(d).sha256,fresh)
 fs.writeFileSync(path.join(d,'receipts',fresh+'.json'),JSON.stringify({sha256:fresh,status:'import-and-scoring-complete'}))
 assert.equal(selectBatch(d),null)
})
test('tampered snapshots and mismatched receipts stop queue admission',t=>{
 const d=fixture(t),id=add(d,'2026-11-18T12:00:00Z')
 fs.writeFileSync(path.join(d,'receipts',id+'.json'),JSON.stringify({sha256:'a'.repeat(64),status:'import-and-scoring-complete'}))
 assert.throws(()=>selectBatch(d))
 fs.unlinkSync(path.join(d,'receipts',id+'.json'));fs.appendFileSync(path.join(d,'snapshots',id+'.json'),' ')
 assert.throws(()=>selectBatch(d),/hash/)
})

test('old zero-progress snapshot cannot block later real work',t=>{
 const d=fixture(t),body=JSON.stringify({schema:2,mode:'recurring',source:'hns',createdAt:'2026-11-17T00:00:00Z',status:'paused',leagues:[]})
 fs.writeFileSync(path.join(d,'snapshots',sha(body)+'.json'),body)
 const next=add(d,'2026-11-18T12:00:00Z')
 assert.equal(selectBatch(d).sha256,next)
})
