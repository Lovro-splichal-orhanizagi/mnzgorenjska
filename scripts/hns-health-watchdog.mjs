// Missed-check detection for the hourly Croatian source-health monitor (SLF-664).
// Reads only GitHub's artifact list: when did the monitor last actually execute?
// The artifact's server-side creation time is used, never its contents, so an old
// green artifact can never stand in for a current check.
import fs from 'node:fs'
import {pathToFileURL} from 'node:url'

export const ARTIFACT='hns-source-health-hourly'
// Hourly cadence plus 30 minutes of dispatch/queue slack: one skipped hour fails.
export const DEADLINE_MINUTES=90

export function monitorFreshness(list, {now=Date.now(), mode='watch', excludeRunId=null, deadlineMinutes=DEADLINE_MINUTES}={}){
  const result={schema:1, kind:'hns-health-monitor', mode, checkedAt:new Date(now).toISOString(), deadlineMinutes}
  if(!list||!Array.isArray(list.artifacts))return {...result,state:'unknown',reason:'artifact-list-invalid'}
  const checks=list.artifacts
    // Only main-branch runs count; a branch or PR run must not fake freshness.
    .filter(a=>a&&a.name===ARTIFACT&&!a.expired&&a.workflow_run?.head_branch==='main')
    .filter(a=>excludeRunId==null||String(a.workflow_run?.id)!==String(excludeRunId))
    .map(a=>({at:Date.parse(a.created_at),runId:a.workflow_run?.id??null}))
    .filter(a=>Number.isFinite(a.at)&&a.at<=now+60000)
    .sort((a,b)=>b.at-a.at)
  const last=checks[0]
  if(!last){
    // The hourly job itself tolerates its very first execution; the independent
    // watcher never does, so a monitor that never uploads cannot stay silent.
    return {...result,state:mode==='self'?'first-check':'missed',previousCheckAt:null,previousRunId:null}
  }
  const ageMinutes=Math.round((now-last.at)/6000)/10
  return {...result,state:ageMinutes<=deadlineMinutes?'fresh':'missed',
    previousCheckAt:new Date(last.at).toISOString(),previousRunId:last.runId,ageMinutes}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [file,...rest]=process.argv.slice(2)
  const opt=k=>{const i=rest.indexOf(k);return i<0?undefined:rest[i+1]}
  let list=null
  try{list=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}
  const result=monitorFreshness(list,{mode:opt('--mode')==='self'?'self':'watch',excludeRunId:opt('--exclude-run')??null})
  const json=JSON.stringify(result,null,2)
  if(opt('--out'))fs.writeFileSync(opt('--out'),json+'\n')
  console.log(json)
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '### Hourly Croatian health monitor: previous execution\n\n```json\n'+json+'\n```\n')
  process.exitCode=['fresh','first-check'].includes(result.state)?0:1
}
