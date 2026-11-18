// Separate offline bridge keeps the historical incident collector unchanged.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {schedule,report,competitionName} from './hns-recovery-validation.mjs'
const i=JSON.parse(readFileSync(0,'utf8')),html=readFileSync(i.path,'utf8')
assert.ok(['schedule','report'].includes(i.kind),'invalid parser operation')
if(i.kind==='schedule'){
  const parentName=competitionName(html)
  assert.match(parentName,/26\/27$/,'schedule is not explicitly current season')
  console.log(JSON.stringify({fixtures:schedule(html),parentName}))
}else{
  assert.match(i.parentName,/26\/27$/,'parent competition season required')
  console.log(JSON.stringify(report(html,i.fixture,i.code,i.parentName).quality))
}
