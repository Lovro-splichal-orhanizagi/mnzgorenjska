// Separate offline bridge keeps the historical incident collector unchanged.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {report} from './hns-recovery-validation.mjs'
import {recurringSchedule} from './hns-recurring-validation.mjs'
const i=JSON.parse(readFileSync(0,'utf8')),html=readFileSync(i.path,'utf8')
assert.ok(['schedule','report'].includes(i.kind),'invalid parser operation')
if(i.kind==='schedule'){
  console.log(JSON.stringify(recurringSchedule(html,i.code)))
}else{
  assert.ok(typeof i.parentName==='string'&&i.parentName.trim(),'captured parent competition name required')
  console.log(JSON.stringify(report(html,i.fixture,i.code,i.parentName).quality))
}
