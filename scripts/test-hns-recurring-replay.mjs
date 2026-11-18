import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {loadRecovery} from './viri/recovery-captured.mjs'

const now=Date.now(),today=new Date(now).toISOString().slice(0,10)
const base=()=>({schema:2,mode:'recurring',source:'hns',season:'2026/27',createdAt:new Date(now).toISOString(),expiresAt:new Date(now+86400000).toISOString(),updatedAt:new Date(now).toISOString(),fromDate:new Date(now-13*86400000).toISOString().slice(0,10),throughDate:today,status:'complete',leagues:[{id:1,slug:'hr-test',code:'123',reports:[],pending:[]}]})
function read(t,s,opts){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hns-recurring-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));fs.writeFileSync(path.join(dir,'latest.json'),JSON.stringify(s));return loadRecovery(dir,'hns',opts)}
test('recurring replay requires explicit opt-in; historical replay stays frozen',t=>{
 assert.throws(()=>read(t,base()))
 assert.equal(read(t,base(),{recurring:true}).mode,'recurring')
 const incident={...base(),schema:1,incident:'hns-20261117',fromDate:'2026-11-06',throughDate:'2026-11-17'}
 assert.throws(()=>read(t,incident,{recurring:true}))
})
test('recurring replay rejects stale, future, invalid-window and stopped batches',t=>{
 for(const change of [{createdAt:new Date(now-25*3600000).toISOString()},{createdAt:new Date(now+3600000).toISOString()},{fromDate:'2026-01-01'},{fromDate:'2026-11-01',throughDate:'2026-11-14'},{expiresAt:new Date(now-1000).toISOString()},{throughDate:'2030-01-01'},{status:'stopped: source refusal'},{leagues:[{id:1,slug:'pl-wrong',code:'123'}]}]) assert.throws(()=>read(t,{...base(),...change},{recurring:true}),JSON.stringify(change))
 assert.equal(read(t,{...base(),status:'pending'},{recurring:true}).status,'pending')
})

test('partial batch needs explicit replay opt-in and retains its unhealthy status',t=>{
 const s={...base(),status:'paused'}
 assert.throws(()=>read(t,s,{recurring:true}))
 assert.equal(read(t,s,{recurring:true,allowPartial:true}).status,'paused')
 assert.throws(()=>read(t,{...s,status:'collecting'},{recurring:true,allowPartial:true}))
})

test('retained scoring retry can replay a three-day-old batch but never refresh its source age',t=>{
 const created=now-3*86400000,day=new Date(created).toISOString().slice(0,10)
 const s={...base(),createdAt:new Date(created).toISOString(),expiresAt:new Date(created+86400000).toISOString(),fromDate:new Date(created-13*86400000).toISOString().slice(0,10),throughDate:day}
 assert.throws(()=>read(t,s,{recurring:true}))
 assert.equal(read(t,s,{recurring:true,retained:true}).createdAt,s.createdAt)
 assert.throws(()=>read(t,{...s,createdAt:new Date(now-8*86400000).toISOString()},{recurring:true,retained:true}))
})
