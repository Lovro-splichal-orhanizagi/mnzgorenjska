// Read-only provenance check before downloading official audit artifacts.
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska'
const files=['scripts/viri/dfb.mjs','scripts/viri/dfb-korekcije.json','scripts/viri/dfb-rezerve.json','scripts/viri/fussball.mjs','scripts/viri/fussball-pisava.mjs','scripts/viri/fussball-datumski-glifi.json','scripts/viri/fss.mjs','scripts/klubi.mjs','scripts/preveri-vir-sezono.mjs']
export function preveriZagon(run,id,commit){
 if(!/^[1-9][0-9]{0,19}$/.test(id)||!/^[a-f0-9]{40}$/.test(commit)
  ||String(run.id)!==id||run.repository?.full_name!==repo
  ||run.path!=='.github/workflows/preveri-nova-vira.yml'||run.head_sha!==commit
  ||run.event!=='workflow_dispatch'||run.status!=='completed'||run.conclusion!=='success')throw Error('Neveljaven izvor: potreben je uspešen uradni source audit na pregledanem commitu')
}
function main(){
 const [commit,archive,current]=process.argv.slice(2)
 if(process.env.GITHUB_REPOSITORY!==repo||!/^[a-f0-9]{40}$/.test(commit??''))throw Error('Neveljaven repozitorij ali source commit')
 for(const id of new Set([archive,current])){
  if(!/^[1-9][0-9]{0,19}$/.test(id??''))throw Error('Neveljaven run ID')
  const run=JSON.parse(execFileSync('gh',['api',`repos/${repo}/actions/runs/${id}`],{encoding:'utf8'}))
  preveriZagon(run,id,commit)
 }
 // The guard may be added after the source audit. Only equal parser/source
 // files are permitted; the audit's full SHA remains the evidence lineage.
 execFileSync('git',['diff','--exit-code',commit,'HEAD','--',...files],{stdio:'inherit'})
 console.log(JSON.stringify({sourceCommit:commit,archiveRun:archive,currentRun:current,sourceFilesIdentical:true}))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)try{main()}catch(e){console.error(e.message);process.exitCode=1}
