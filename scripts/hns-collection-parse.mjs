// Offline bridge: body identity is bound to the schedule and request envelope.
import {readFileSync} from 'node:fs'
import {schedule,report} from './hns-recovery-validation.mjs'
const i=JSON.parse(readFileSync(0,'utf8')),html=readFileSync(i.path,'utf8')
console.log(JSON.stringify(i.kind==='schedule'?{fixtures:schedule(html)}:report(html,i.fixture,i.code).quality))
