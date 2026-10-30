import test from 'node:test'
import assert from 'node:assert/strict'
import {badenR10NightlyProjection,badenR10NightlyRunProjection} from './fussball-baden-r10-nightly.mjs'
import {readFileSync} from 'node:fs'
const E=process.env.FUSSBALL_R10_FOUNDATION_EVIDENCE,D=E&&E+'/evidence/baden-r10-budget-reconciliation-20261030/checkout-closure/'
test('actual complete45-country graph freezes German provenance while foreign progress stays outside scope',{skip:!E},()=>{
 const jobs=JSON.parse(readFileSync(D+'jobs-41060320786-1-page1.json')),run=JSON.parse(readFileSync(D+'run-41060320786.json')),base=badenR10NightlyProjection(run,jobs),changed=structuredClone(jobs)
 const foreign=changed.jobs.find(j=>j.name!=='uvoz DE'&&j.name!=='zacni');foreign.status='completed';foreign.conclusion='failure';foreign.steps=[]
 assert.deepEqual(badenR10NightlyProjection(run,changed),base)
 assert.deepEqual(badenR10NightlyRunProjection({...run,status:'completed',conclusion:'failure'}),badenR10NightlyRunProjection(run))
 for(const mode of ['de-step','new-de','country','attempt']){
  const j=structuredClone(jobs),r=structuredClone(run)
  if(mode==='de-step')j.jobs.find(j=>j.name==='uvoz DE').steps[0].conclusion='failure'
  if(mode==='new-de'){j.jobs.push({...j.jobs.find(j=>j.name==='uvoz DE'),id:999999999});j.total_count++}
  if(mode==='country')j.jobs.find(j=>j.name==='uvoz TH').name='uvoz DE 2/2'
  if(mode==='attempt')r.run_attempt=2
  if(mode==='de-step')assert.notDeepEqual(badenR10NightlyProjection(r,j),base)
  else assert.throws(()=>badenR10NightlyProjection(r,j),/BADEN_NIGHTLY_/)
 }
})
