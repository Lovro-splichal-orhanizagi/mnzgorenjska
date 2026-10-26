import {parseFussballLeagueCode} from './fussball-import.mjs'
const requireProof=(ok,reason)=>{if(!ok)throw Error(`fussball action: ${reason}`)}

function admitAuditArtifact(run,inventory,{repository,headSha,runId}={},archive=false){
 requireProof(typeof runId==='string'&&/^[1-9]\d{0,14}$/.test(runId)&&Number.isSafeInteger(Number(runId))&&typeof repository==='string'&&/^[\w.-]+\/[\w.-]+$/.test(repository)&&/^[a-f0-9]{40}$/.test(headSha??''),'invalid audit admission identity')
 requireProof(run?.id===Number(runId)&&run.status==='completed'&&run.conclusion==='success'&&run.event==='workflow_dispatch'&&run.head_branch==='main'&&run.head_sha===headSha&&run.head_repository?.full_name===repository&&run.path==='.github/workflows/preveri-fussball-sezono.yml','audit must be successful same-repository main workflow at the checked-out commit')
 const name=`fussball-season-${archive?'archive-':''}${runId}`
 const artifacts=inventory?.artifacts?.filter(a=>a.name===name)
 requireProof(artifacts?.length===1,'expected exactly one named audit artifact')
 const artifact=artifacts[0]
 requireProof(Number.isSafeInteger(artifact.id)&&artifact.id>0&&artifact.expired===false&&Number.isSafeInteger(artifact.size_in_bytes)&&artifact.size_in_bytes>0&&artifact.size_in_bytes<=512*1024**2&&artifact.workflow_run?.id===Number(runId)&&artifact.workflow_run.head_sha===headSha,'invalid, expired or cross-run artifact')
 return {runId,artifactId:artifact.id,artifactName:name,headSha,repository}
}

export function assertFussballImportCompetition(row,{slug,code}={}){
 parseFussballLeagueCode(code)
 requireProof(typeof slug==='string'&&/^de-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&row?.slug===slug&&Number.isSafeInteger(row.id)&&row.id>0&&Number.isSafeInteger(row.country_id)&&row.country_id>0&&row.country_code==='DE'&&row.source==='fussball-public'&&row.source_league_code===code&&row.source_policy===null&&row.active===false,'manual import requires the exact inactive German competition without another source policy')
 return row
}

export function admitFussballAudit(run,inventory,options){return admitAuditArtifact(run,inventory,options)}
export function admitFussballPairedAudit(run,inventory,options){
 requireProof(run?.run_attempt===1,'paired audit requires its first attempt')
 const current=admitAuditArtifact(run,inventory,options),archive=admitAuditArtifact(run,inventory,options,true)
 requireProof(current.artifactId!==archive.artifactId,'paired artifacts must be distinct')
 return {current,archive}
}
