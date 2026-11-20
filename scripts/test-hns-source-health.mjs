import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {sourceHealth} from './hns-source-health.mjs'

const now=Date.parse('2026-11-20T16:00:00Z'),fresh=new Date(now-3600000).toISOString()
const privateText='private-name-and-source-error-must-not-be-exported'
function evidence(t,{heartbeat={},snapshot={}}={}){
  const root=process.env.PAPERCLIP_RUN_SCRATCH_DIR||os.tmpdir()
  fs.mkdirSync(root,{recursive:true})
  const dir=fs.mkdtempSync(path.join(root,'hns-health-'))
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}))
  fs.mkdirSync(path.join(dir,'snapshots'))
  fs.writeFileSync(path.join(dir,'collector-status.json'),JSON.stringify({status:'pending',createdAt:fresh,updatedAt:fresh,reason:privateText,...heartbeat}))
  const body=JSON.stringify({schema:2,source:'hns',mode:'recurring',status:'pending',createdAt:fresh,updatedAt:fresh,reason:privateText,
    leagues:Array.from({length:139},()=>({finished:true})),holds:[{reason:privateText}],...snapshot})
  const hash=createHash('sha256').update(body).digest('hex')
  fs.writeFileSync(path.join(dir,'snapshots',hash+'.json'),body)
  return dir
}
const check=dir=>sourceHealth(dir,{acquired:'success',now})

test('full fresh pending scan is healthy without reading receipts or database',t=>{
  const dir=evidence(t),result=check(dir)
  assert.equal(result.state,'healthy')
  assert.equal(result.observation.observations[0].leagues,139)
  assert.ok(!JSON.stringify(result).includes(privateText))
})
for(const [name,changes]of [
  ['stale heartbeat',{heartbeat:{createdAt:new Date(now-86400000).toISOString()}}],
  ['future heartbeat',{heartbeat:{createdAt:new Date(now+120000).toISOString(),updatedAt:new Date(now+120000).toISOString()}}],
  ['refusal heartbeat',{heartbeat:{status:'paused'}}],
  ['stopped observation',{snapshot:{status:'stopped',leagues:[]}}],
  ['incomplete observation',{snapshot:{leagues:[{finished:true}]}}],
  ['stale observation',{snapshot:{createdAt:new Date(now-86400000).toISOString(),updatedAt:new Date(now-86400000).toISOString()}}],
])test(name+' remains degraded despite otherwise healthy evidence',t=>{
  assert.equal(check(evidence(t,changes)).state,'degraded')
})
test('failed, skipped or unknown acquisition never certifies partial files',t=>{
  const dir=evidence(t)
  for(const acquired of ['failure','skipped',undefined]){
    assert.deepEqual(sourceHealth(dir,{acquired,now}),{schema:1,source:'hns',checkedAt:new Date(now).toISOString(),state:'unknown',reason:'evidence-transfer-incomplete'})
  }
})
for(const kind of ['missing-heartbeat','malformed-heartbeat','unknown-status','invalid-time','invalid-snapshot']){
  test(kind+' fails closed without exposing raw evidence',t=>{
    const dir=evidence(t),heartbeat=path.join(dir,'collector-status.json')
    if(kind==='missing-heartbeat')fs.unlinkSync(heartbeat)
    if(kind==='malformed-heartbeat')fs.writeFileSync(heartbeat,privateText)
    if(kind==='unknown-status')fs.writeFileSync(heartbeat,JSON.stringify({status:privateText}))
    if(kind==='invalid-time')fs.writeFileSync(heartbeat,JSON.stringify({status:'complete',createdAt:privateText,updatedAt:fresh}))
    if(kind==='invalid-snapshot')fs.writeFileSync(path.join(dir,'snapshots',fs.readdirSync(path.join(dir,'snapshots'))[0]),privateText)
    const result=check(dir)
    assert.equal(result.state,'unknown');assert.equal(result.reason,'evidence-missing-or-invalid')
    assert.ok(!JSON.stringify(result).includes(privateText))
  })
}
test('CLI writes sanitized artifact and fails unknown/degraded checks',t=>{
  const time=new Date().toISOString(),dir=evidence(t,{heartbeat:{createdAt:time,updatedAt:time},snapshot:{createdAt:time,updatedAt:time}})
  const script=fileURLToPath(new URL('./hns-source-health.mjs',import.meta.url))
  for(const outcome of ['success','failure']){
    const run=spawnSync(process.execPath,[script,dir],{cwd:dir,encoding:'utf8',env:{HNS_EVIDENCE_OUTCOME:outcome,GITHUB_STEP_SUMMARY:path.join(dir,'summary.md')}})
    assert.equal(run.status,outcome==='success'?0:1,run.stderr)
    const json=fs.readFileSync(path.join(dir,'hns-source-health.json'),'utf8')
    assert.equal(JSON.parse(json).state,outcome==='success'?'healthy':'unknown')
    assert.ok(!(json+run.stdout+run.stderr+fs.readFileSync(path.join(dir,'summary.md'),'utf8')).includes(privateText))
  }
  fs.writeFileSync(path.join(dir,'collector-status.json'),JSON.stringify({status:'stopped',createdAt:time,updatedAt:time}))
  const run=spawnSync(process.execPath,[script,dir],{cwd:dir,encoding:'utf8',env:{HNS_EVIDENCE_OUTCOME:'success'}})
  assert.equal(run.status,1);assert.equal(JSON.parse(run.stdout).state,'degraded')
})
test('source-health job is independent of active writers and preserves read-only pull direction',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/preveri-podatke.yml',import.meta.url),'utf8')
  const job=workflow.split('  hns-source-health:\n')[1]?.split('  preveri:\n')[0]
  assert.ok(job,'independent health job missing')
  assert.doesNotMatch(job,/^    (needs|if|concurrency):/m)
  assert.doesNotMatch(job,/cakaj-na-uvoze|SUPABASE|recovery-import|collector\.py|workflow_dispatch|DISCORD_WEBHOOK/)
  assert.match(job,/HNS_EVIDENCE_OUTCOME: \$\{\{ steps\.evidence\.outcome \}\}/)
  assert.match(job,/Report independent collection health\n        if: \$\{\{ !cancelled\(\) \}\}/)
  assert.match(job,/scp .*deploy@[^ ]+:\/srv\/slff-recovery\/hns-recurring\/collector-status\.json private-hns-health\/collector-status\.json/)
  assert.match(job,/rsync .*--safe-links.*deploy@[^ ]+:\/srv\/slff-recovery\/hns-recurring\/snapshots\/ private-hns-health\/snapshots\//)
  assert.match(job,/path: hns-source-health\.json\n          if-no-files-found: error/)
  assert.doesNotMatch(job,/path: private-hns-health/)
  assert.match(workflow,/if: steps\.uvoz\.outputs\.tece != '1'/,'consistency checks still need idle writers')
})
