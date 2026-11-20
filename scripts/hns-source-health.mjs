// Source-free observation. Never consult writer activity, replay receipts or the DB.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {collectionObservation} from './hns-recurring-observation.mjs'

export function sourceHealth(dir, {acquired, now=Date.now()}={}) {
  const result={schema:1, source:'hns', checkedAt:new Date(now).toISOString(), state:'unknown'}
  // A failed/partial transfer must not certify whatever files happened to arrive.
  if(acquired!=='success')return {...result,reason:'evidence-transfer-incomplete'}
  try {
    const raw=JSON.parse(fs.readFileSync(path.join(dir,'collector-status.json')))
    assert.ok(['complete','pending','paused','stopped'].includes(raw.status))
    const times=[raw.createdAt,raw.updatedAt].map(Date.parse)
    assert.ok(times.every(Number.isFinite)&&times[1]>=times[0])
    const fresh=times.every(t=>now-t>=-60000&&now-t<86400000)
    const heartbeat={status:raw.status,createdAt:new Date(times[0]).toISOString(),updatedAt:new Date(times[1]).toISOString(),fresh}
    const observation=collectionObservation(dir,now)
    const healthy=fresh&&['complete','pending'].includes(heartbeat.status)&&observation.healthy
    return {...result,state:healthy?'healthy':'degraded',heartbeat,observation}
  } catch {
    // Do not copy raw reason text, file contents, or errors into public artifacts.
    return {...result,reason:'evidence-missing-or-invalid'}
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=sourceHealth(process.argv[2],{acquired:process.env.HNS_EVIDENCE_OUTCOME})
  const json=JSON.stringify(result,null,2)
  fs.writeFileSync('hns-source-health.json',json+'\n')
  console.log(json)
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '### Croatian collection health (independent of imports)\n\n```json\n'+json+'\n```\nHealthy collection does not certify missing source lineups or resolve correction holds.\n')
  process.exitCode=result.state==='healthy'?0:1
}
