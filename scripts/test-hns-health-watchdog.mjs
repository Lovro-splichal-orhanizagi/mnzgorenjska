import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {monitorFreshness,ARTIFACT} from './hns-health-watchdog.mjs'

const now=Date.parse('2026-11-21T05:00:20Z')
const ago=min=>new Date(now-min*60000).toISOString()
const art=(min,extra={})=>({name:ARTIFACT,expired:false,created_at:ago(min),workflow_run:{id:1000+min,head_branch:'main'},...extra})
const list=(...a)=>({total_count:a.length,artifacts:a})

test('previous hourly execution within the deadline is fresh',()=>{
  const r=monitorFreshness(list(art(61),art(121)),{now})
  assert.equal(r.state,'fresh')
  assert.equal(r.previousCheckAt,ago(61))
  assert.equal(r.ageMinutes,61)
  assert.equal(r.deadlineMinutes,90)
})
test('one skipped hourly slot is a missed check',()=>{
  assert.equal(monitorFreshness(list(art(121)),{now}).state,'missed')
  assert.equal(monitorFreshness(list(art(91)),{now}).state,'missed')
  assert.equal(monitorFreshness(list(art(90)),{now}).state,'fresh')
})
test('the current run never counts as its own previous check',()=>{
  const r=monitorFreshness(list(art(1,{workflow_run:{id:7,head_branch:'main'}}),art(200)),{now,excludeRunId:'7'})
  assert.equal(r.state,'missed')
  assert.equal(r.previousCheckAt,ago(200))
})
test('expired, renamed, branch and future artifacts cannot fake freshness',()=>{
  for(const fake of [
    art(5,{expired:true}),
    art(5,{name:'hns-source-health'}),
    art(5,{workflow_run:{id:5,head_branch:'feature'}}),
    art(5,{workflow_run:null}),
    art(-30),
    art(5,{created_at:'not a date'}),
  ])assert.equal(monitorFreshness(list(fake,art(300)),{now}).state,'missed',JSON.stringify(fake))
})
test('no previous execution: watcher fails, only the hourly job may bootstrap',()=>{
  assert.equal(monitorFreshness(list(),{now}).state,'missed')
  assert.equal(monitorFreshness(list(),{now,mode:'self'}).state,'first-check')
  assert.equal(monitorFreshness(list(art(300)),{now,mode:'self'}).state,'missed')
})
test('invalid or failed artifact listing is unknown, never fresh',()=>{
  for(const bad of [null,{},{artifacts:'x'}])assert.equal(monitorFreshness(bad,{now}).state,'unknown')
})
test('CLI exits non-zero on missed or unreadable listings and writes a record',()=>{
  const dir=fs.mkdtempSync(path.join(process.env.PAPERCLIP_RUN_SCRATCH_DIR||os.tmpdir(),'hns-watchdog-'))
  try{
    const script=fileURLToPath(new URL('./hns-health-watchdog.mjs',import.meta.url))
    const run=(body,...args)=>{
      fs.writeFileSync(path.join(dir,'a.json'),body)
      return spawnSync(process.execPath,[script,path.join(dir,'a.json'),...args,'--out',path.join(dir,'o.json')],{env:{...process.env,GITHUB_STEP_SUMMARY:''}})
    }
    const fresh=JSON.stringify(list({...art(0),created_at:new Date(Date.now()-60000).toISOString()}))
    assert.equal(run(fresh).status,0)
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'o.json'))).state,'fresh')
    assert.equal(run(JSON.stringify(list(art(0,{created_at:'2026-01-01T00:00:00Z'})))).status,1)
    assert.equal(run('{"message":"Bad credentials"').status,1)
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'o.json'))).state,'unknown')
    assert.equal(run('{"artifacts":[]}','--mode','self').status,0)
    assert.equal(run('{"artifacts":[]}').status,1)
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('hourly job rides the VM-dispatched uptime run and stays source-free',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/zivost.yml',import.meta.url),'utf8')
  const job=workflow.split('  hns-zdravje:\n')[1]
  assert.ok(job,'hourly health job missing')
  assert.match(job,/needs: zivost\n    if: \$\{\{ !cancelled\(\) && needs\.zivost\.outputs\.ura == 'true' \}\}/)
  assert.doesNotMatch(job,/cakaj-na-uvoze|SUPABASE|recovery-import|collector\.py|hns-recurring\.py|DISCORD_WEBHOOK|curl /)
  assert.match(job,/--mode self --exclude-run "\$GITHUB_RUN_ID"/)
  assert.match(job,/HNS_EVIDENCE_OUTCOME: \$\{\{ steps\.evidence\.outcome \}\}/)
  assert.match(job,/name: hns-source-health-hourly\n/)
  assert.match(job,/if-no-files-found: error/)
  assert.doesNotMatch(job,/path: private-hns-health/)
  const watcher=fs.readFileSync(new URL('../.github/workflows/preveri-podatke.yml',import.meta.url),'utf8')
  assert.match(watcher,/hns-health-watchdog\.mjs hns-artifacts\.json --mode watch/)
})
