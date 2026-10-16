import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { preberiRezervo } from './viri/rezervni-predpomnilnik.mjs'
test('legacy schedule fallback respects the source cache validator',()=>{
 const dir=mkdtempSync(join(tmpdir(),'slff-reserve-')),pot=join(dir,'round.html')
 try{
  assert.equal(preberiRezervo(pot,{},'round.html'),null)
  writeFileSync(pot,'<html>old legacy schedule</html>')
  assert.equal(preberiRezervo(pot,{zaPredpomnilnik:()=>false},'round.html'),null)
  assert.equal(preberiRezervo(pot,{zaPredpomnilnik:h=>h.includes('valid report')},'round.html'),null)
  assert.equal(preberiRezervo(pot,{},'round.html'),'<html>old legacy schedule</html>')
  writeFileSync(pot,'valid report')
  assert.equal(preberiRezervo(pot,{zaPredpomnilnik:(h,ime)=>h==='valid report'&&ime==='round.html'},'round.html'),'valid report')
 }finally{rmSync(dir,{recursive:true,force:true})}
})
