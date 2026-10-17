import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { configuration, sourceFiles } from './vklopi-dfb-regijo.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska'
export function preveriZagon(run,id,commit,{slug,season,jobs}){
 configuration(slug,season)
 const matches=jobs?.filter(j=>j.name==='DFB regionalni audit')??[],j=matches[0],name=season==='2025/26'?'Arhiv sezona — brez baze':'Tekoča sezona — brez baze',steps=j?.steps?.filter(s=>s.name===name)??[]
 if(!/^[1-9]\d{0,19}$/.test(id)||!/^[a-f0-9]{40}$/.test(commit)||String(run.id)!==id||run.head_sha!==commit||run.repository?.full_name!==repo||run.path!=='.github/workflows/preveri-dfb-ligo.yml'||run.event!=='workflow_dispatch'||run.status!=='completed'||!['success','failure','cancelled'].includes(run.conclusion)||matches.length!==1||!Number.isSafeInteger(j.id)||String(j.run_id)!==id||j.head_sha!==commit||j.status!=='completed'||j.conclusion!=='success'||steps.length!==1||steps[0].status!=='completed'||steps[0].conclusion!=='success')throw Error('Invalid regional capture provenance/job/season step')
 return {season,runId:id,jobId:String(j.id),captureCommit:commit,seasonJobPassed:true}
}
function main(){
 const [slug,commit,archive,current,out]=process.argv.slice(2)
 configuration(slug)
 if(process.env.GITHUB_REPOSITORY!==repo||!/^[a-f0-9]{40}$/.test(commit??'')||!out)throw Error('Invalid repository/commit/output')
 const proof=[],captures=new Map()
 for(const [season,id]of[['2025/26',archive],['2026/27',current]]){
  if(!/^[1-9]\d{0,19}$/.test(id??''))throw Error('Invalid run ID')
  if(!captures.has(id))captures.set(id,{run:JSON.parse(execFileSync('gh',['api',`repos/${repo}/actions/runs/${id}`],{encoding:'utf8'})),jobs:JSON.parse(execFileSync('gh',['api',`repos/${repo}/actions/runs/${id}/jobs?per_page=100`],{encoding:'utf8'})).jobs})
  const {run,jobs}=captures.get(id);proof.push(preveriZagon(run,id,commit,{slug,season,jobs}))
 }
 execFileSync('git',['diff','--exit-code',commit,'HEAD','--',...sourceFiles],{stdio:'inherit'})
 writeFileSync(out,JSON.stringify({slug,sourceCommit:commit,sourceFilesIdentical:true,proof})+'\n')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)try{main()}catch(e){console.error(e.message);process.exitCode=1}
