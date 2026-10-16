import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,writeFileSync}from'node:fs'
import {tmpdir}from'node:os'
import{join}from'node:path'
import{NovanetPredpomnilnik,starostZapisnika,URA,DAN}from'./viri/novanet-predpomnilnik.mjs'
test('validated cache ages and rejects corrupt/future entries',()=>{
 const dir=mkdtempSync(join(tmpdir(),'novanet-cache-'));let now=1000
 try{
  const c=new NovanetPredpomnilnik(dir,{danes:()=>now})
  assert.equal(c.beri('a'),null);c.shrani('a','full validated page');now+=123
  assert.deepEqual(c.beri('a'),{html:'full validated page',starost:123})
  writeFileSync(c.pot('a'),'{broken');assert.equal(c.beri('a'),null)
  c.shrani('a','valid');now=0;assert.equal(c.beri('a'),null)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('recent or unclosed reports refresh hourly; older finalized reports expire monthly',()=>{
 const now=Date.parse('2026-10-16T12:00Z')
 assert.equal(starostZapisnika({datum:'2026-10-15',zaprt:true},now),URA)
 assert.equal(starostZapisnika({datum:'2026-10-01',zaprt:false},now),URA)
 assert.equal(starostZapisnika({datum:'2026-10-01',zaprt:true},now),30*DAN)
 assert.equal(starostZapisnika({datum:'2026-10-01',zaprt:true,nepopoln:true},now),0)
})
