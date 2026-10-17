// Read-only provenance check before downloading official audit artifacts.
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska'
const files=['scripts/viri/dfb.mjs','scripts/viri/dfb-korekcije.json','scripts/viri/dfb-rezerve.json','scripts/viri/fussball.mjs','scripts/viri/fussball-pisava.mjs','scripts/viri/fussball-datumski-glifi.json','scripts/viri/fss.mjs','scripts/klubi.mjs','scripts/preveri-vir-sezono.mjs']
// This exact archive was independently reviewed and merged at its capture
// commit. Replaying all 306 raw reports with today's parser is still mandatory.
const reviewedArchive={id:'38970734064',commit:'6defb2484c9c2caaf7a217cf6763b4bca2e65a7a'}
export function preveriZagon(run,id,commit,{sezona,jobs}={}){
 const olderArchive=sezona==='2025/26'&&id===reviewedArchive.id&&run.head_sha===reviewedArchive.commit
 const requested=sezona!==undefined||jobs!==undefined
 const seasonProof=['2025/26','2026/27'].includes(sezona)&&Array.isArray(jobs)
 // Historical matrix jobs already bind their capture to the season in the name.
 // Combined jobs need the exact capture step: an upload or the other season
 // cannot establish that the requested season actually ran successfully.
 const candidates=seasonProof?jobs.filter(j=>j&&(j.name===`Zivi vir — dfb ${sezona}`||j.name==='Zivi vir — dfb')):[]
 const job=candidates.length===1?candidates[0]:null
 const captureStep=sezona==='2026/27'?'Tekoča sezona — brez baze':'Arhiv sezona — brez baze'
 const steps=Array.isArray(job?.steps)?job.steps.filter(s=>s?.name===captureStep):[]
 const passedJob=!!job&&String(job.run_id)===id&&job.head_sha===run.head_sha&&job.status==='completed'&&job.conclusion==='success'
  &&(job.name!=='Zivi vir — dfb'||(steps.length===1&&steps[0].status==='completed'&&steps[0].conclusion==='success'))
 if(requested&&!seasonProof||!/^[1-9][0-9]{0,19}$/.test(id)||!/^[a-f0-9]{40}$/.test(commit)
  ||String(run.id)!==id||run.repository?.full_name!==repo
  ||run.path!=='.github/workflows/preveri-nova-vira.yml'||(run.head_sha!==commit&&!olderArchive)
  ||run.event!=='workflow_dispatch'||run.status!=='completed'
  ||(seasonProof?(!passedJob||!['success','failure','cancelled'].includes(run.conclusion)):run.conclusion!=='success'))throw Error('Neveljaven izvor: potreben je končan uspešen uradni sezonski audit na pregledanem commitu')
}
function main(){
 const [commit,archive,current]=process.argv.slice(2)
 if(process.env.GITHUB_REPOSITORY!==repo||!/^[a-f0-9]{40}$/.test(commit??''))throw Error('Neveljaven repozitorij ali source commit')
 const captures=new Map(),proof=[]
 for(const [sezona,id] of [['2025/26',archive],['2026/27',current]]){
  if(!/^[1-9][0-9]{0,19}$/.test(id??''))throw Error('Neveljaven run ID')
  if(!captures.has(id)){
   const run=JSON.parse(execFileSync('gh',['api',`repos/${repo}/actions/runs/${id}`],{encoding:'utf8'}))
   const {jobs}=JSON.parse(execFileSync('gh',['api',`repos/${repo}/actions/runs/${id}/jobs?per_page=100`],{encoding:'utf8'}))
   captures.set(id,{run,jobs})
  }
  const {run,jobs}=captures.get(id)
  preveriZagon(run,id,commit,{sezona,jobs});proof.push({season:sezona,runId:id,captureCommit:run.head_sha,seasonJobPassed:true})
 }
 // The guard may be added after the source audit. Only equal parser/source
 // files are permitted; the audit's full SHA remains the evidence lineage.
 execFileSync('git',['diff','--exit-code',commit,'HEAD','--',...files],{stdio:'inherit'})
 console.log(JSON.stringify({sourceCommit:commit,archiveRun:archive,currentRun:current,sourceFilesIdentical:true,proof}))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)try{main()}catch(e){console.error(e.message);process.exitCode=1}
