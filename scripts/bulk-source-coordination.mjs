// Readers share a host even when they do not mutate database rows. Order by run
// creation, before source requests; newer readers never hold an older reader up.
import {execFileSync} from 'node:child_process'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
export const GERMAN_READERS=['preveri-fussball-vzorec.yml','preveri-fussball-sezono.yml','preveri-fussball-paket.yml','uvoz-pl-de-paketa.yml','uvoz-zapisnikov.yml']
export function olderGermanReaders(runs,own){
 if(!Number.isSafeInteger(own.id)||!Number.isFinite(Date.parse(own.created_at)))throw Error('Unknown reader identity.')
 return runs.filter(r=>{
  if(!Number.isSafeInteger(r.id)||!Number.isFinite(Date.parse(r.created_at))||!['completed','queued','in_progress','waiting','pending','requested'].includes(r.status))throw Error('Unproven reader inventory.')
  const earlier=Date.parse(r.created_at)<Date.parse(own.created_at)||r.created_at===own.created_at&&r.id<own.id
  return r.id!==own.id&&r.status!=='completed'&&earlier
 })
}
export async function waitForGermanSource({env=process.env,api,sleep=ms=>new Promise(r=>setTimeout(r,ms)),maxAttempts=40}={}){
 const repository=env.GITHUB_REPOSITORY,id=env.GITHUB_RUN_ID
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository??'')||! /^[1-9]\d*$/.test(id??''))throw Error('Actions reader identity required.')
 api??=(path=>JSON.parse(execFileSync('gh',['api',`repos/${repository}/${path}`],{encoding:'utf8',timeout:30000})))
 const own=await api(`actions/runs/${id}`)
 if(own.id!==Number(id)||own.run_attempt!==1||env.GITHUB_RUN_ATTEMPT&&env.GITHUB_RUN_ATTEMPT!=='1')throw Error('Source reruns are forbidden; dispatch a new reviewed run.')
 for(let attempt=0;attempt<maxAttempts;attempt++){
  const runs=[]
  for(const workflow of GERMAN_READERS){
   for(const status of ['queued','in_progress','waiting','pending','requested']){
    let total=null,received=0;const seen=new Set()
    for(let page=1;page<=10;page++){
    const data=await api(`actions/workflows/${workflow}/runs?status=${status}&per_page=100&page=${page}`)
    if(!Array.isArray(data.workflow_runs)||!Number.isSafeInteger(data.total_count)||data.total_count<0||data.total_count>1000||total!==null&&total!==data.total_count||data.workflow_runs.length!==Math.min(100,data.total_count-received)||data.workflow_runs.some(r=>seen.has(r.id)||!Number.isSafeInteger(r.id)))throw Error('Incomplete reader enumeration.')
    total=data.total_count;received+=data.workflow_runs.length
    for(const run of data.workflow_runs){seen.add(run.id);runs.push(run)}
    if(received===total)break
    if(page===10)throw Error('Reader inventory exceeds bounded enumeration.')
    }
   }
  }
  const blockers=olderGermanReaders(runs,own)
  const pending=[]
  for(const run of blockers){
   if(run.path?.endsWith('/uvoz-pl-de-paketa.yml')&&/^Bulk leagues PL$/.test(run.display_title??''))continue
   if(run.path?.endsWith('/uvoz-zapisnikov.yml')){
    const jobs=await api(`actions/runs/${run.id}/jobs?per_page=100&filter=latest`)
    if(!Array.isArray(jobs.jobs)||jobs.total_count!==jobs.jobs.length)throw Error('Incomplete nightly reader job enumeration.')
    const de=jobs.jobs.filter(j=>j.name==='uvoz DE'||j.name?.startsWith('uvoz DE '))
    if(de.length&&de.every(j=>j.status==='completed'))continue
   }
   pending.push(run.id)
  }
  if(!pending.length){await sleep(6000);return}
  if(attempt===maxAttempts-1)throw Error('Older German source readers did not finish within the bounded wait.')
  console.log(`Waiting for older German source readers: ${[...new Set(pending)].join(', ')}`)
  await sleep(180000)
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))waitForGermanSource().catch(e=>{console.error(e.message);process.exitCode=1})
