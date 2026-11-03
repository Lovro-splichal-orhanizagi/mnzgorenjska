import {parseFussballLeagueCode} from './fussball-import.mjs'
import {mainDriftAllowed} from './provider-league-batch.mjs'
const requireProof=(ok,reason)=>{if(!ok)throw Error(`fussball action: ${reason}`)}

// A newer main is admitted only as a descendant without migrations (as #644);
// the capture replay still requires today's exact capture code fingerprint.
function admitAuditArtifact(run,inventory,{repository,headSha,runId,mainDrift}={},archive=false,completion=false){
 requireProof(typeof runId==='string'&&/^[1-9]\d{0,14}$/.test(runId)&&Number.isSafeInteger(Number(runId))&&typeof repository==='string'&&/^[\w.-]+\/[\w.-]+$/.test(repository)&&/^[a-f0-9]{40}$/.test(headSha??''),'invalid audit admission identity')
 const approvedPath=run?.path==='.github/workflows/preveri-fussball-sezono.yml'||completion&&run?.path==='.github/workflows/preveri-fussball-dopolni.yml'
 requireProof(run?.id===Number(runId)&&run.status==='completed'&&run.conclusion==='success'&&run.event==='workflow_dispatch'&&run.head_branch==='main'&&/^[a-f0-9]{40}$/.test(run.head_sha??'')&&(run.head_sha===headSha||!archive&&!completion&&mainDriftAllowed(run.head_sha,headSha,mainDrift))&&run.head_repository?.full_name===repository&&approvedPath,'audit must be successful same-repository main workflow at the checked-out commit')
 const name=`fussball-season-${archive?'archive-':''}${runId}`
 const artifacts=inventory?.artifacts?.filter(a=>a.name===name)
 requireProof(artifacts?.length===1,'expected exactly one named audit artifact')
 const artifact=artifacts[0]
 requireProof(Number.isSafeInteger(artifact.id)&&artifact.id>0&&artifact.expired===false&&Number.isSafeInteger(artifact.size_in_bytes)&&artifact.size_in_bytes>0&&artifact.size_in_bytes<=512*1024**2&&artifact.workflow_run?.id===Number(runId)&&artifact.workflow_run.head_sha===run.head_sha,'invalid, expired or cross-run artifact')
 return {runId,artifactId:artifact.id,artifactName:name,headSha,repository}
}

export function assertFussballImportCompetition(row,{slug,code}={}){
 parseFussballLeagueCode(code)
 requireProof(typeof slug==='string'&&/^de-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&row?.slug===slug&&Number.isSafeInteger(row.id)&&row.id>0&&Number.isSafeInteger(row.country_id)&&row.country_id>0&&row.country_code==='DE'&&row.source==='fussball-public'&&row.source_league_code===code&&(row.source_policy===null||row.source_policy==='fussball-community-cards-v1'&&row.fussball_current_only===true)&&row.active===false,'manual import requires the exact inactive German competition without policy or with a current-only card policy')
 return row
}

export function admitFussballAudit(run,inventory,options){return admitAuditArtifact(run,inventory,options)}
export function admitFussballPairedAudit(run,inventory,options){
 requireProof(run?.run_attempt===1,'paired audit requires its first attempt')
 const current=admitAuditArtifact(run,inventory,options,false,true),archive=admitAuditArtifact(run,inventory,options,true,true)
 requireProof(current.artifactId!==archive.artifactId,'paired artifacts must be distinct')
 return {current,archive}
}

/** Path-B activation consumes only a successful owner import of the same league. */
export function admitFussballImportRun(run,inventory,{repository,runId,slug}={}){
 requireProof(typeof runId==='string'&&/^[1-9]\d{0,14}$/.test(runId)&&/^de-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug??'')&&/^[\w.-]+\/[\w.-]+$/.test(repository??''),'invalid import admission identity')
 requireProof(run?.id===Number(runId)&&run.status==='completed'&&run.conclusion==='success'&&run.event==='workflow_dispatch'&&run.head_branch==='main'&&run.head_repository?.full_name===repository&&run.path==='.github/workflows/uvoz-fussball-public.yml'&&run.display_title===`Uvoz lige ${slug} FUSSBALL public`&&run.actor?.login==='nejcar20'&&run.triggering_actor?.login==='nejcar20','import must be a successful owner run of uvoz-fussball-public.yml for this league')
 const artifacts=inventory?.artifacts?.filter(a=>a.name===`fussball-import-${runId}`)
 requireProof(artifacts?.length===1&&artifacts[0].expired===false&&artifacts[0].workflow_run?.id===Number(runId),'expected exactly one unexpired import artifact')
 return {runId,artifactId:artifacts[0].id,headSha:run.head_sha,slug}
}
