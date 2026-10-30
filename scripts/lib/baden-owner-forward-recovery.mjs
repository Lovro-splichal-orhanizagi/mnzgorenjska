// Exact reviewed failure/reconciliation DATA. No generic retry or source authority.
import {createHash} from 'node:crypto'
const prefix='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',sha=b=>createHash('sha256').update(b).digest('hex'),need=(v,m)=>{if(!v)throw Error('BADEN_OWNER_RECOVERY: '+m)}
export const BADEN_RECONCILED_FAILED_RUN=40971795981
const failedHead='2d5dbc3fb4a38d8bcd342c9016f80abec57af947',naturalHead='85a130cd8ea657f9189d1c37a0f978b0d5f7bf73'
function executionSha(r,v){
 need(v&&Number.isSafeInteger(v.total_count)&&Array.isArray(v.jobs)&&v.total_count===v.jobs.length&&new Set(v.jobs.map(j=>j.id)).size===v.jobs.length,'complete exact job inventory')
 const header=Object.fromEntries(['id','run_attempt','head_sha','head_branch','path','event','status','conclusion'].map(k=>[k,r[k]]));for(const k of ['repository','head_repository'])header[k]={full_name:r[k]?.full_name};for(const k of ['actor','triggering_actor'])header[k]=Object.fromEntries(['id','login','type'].map(x=>[x,r[k]?.[x]]))
 const jobs=v.jobs.map(j=>{need(Array.isArray(j.steps)&&new Set(j.steps.map(s=>s.number)).size===j.steps.length,'complete distinct steps');return {...Object.fromEntries(['id','run_id','run_attempt','head_sha','name','status','conclusion'].map(k=>[k,j[k]])),steps:j.steps.map(s=>Object.fromEntries(['number','name','status','conclusion'].map(k=>[k,s[k]]))).sort((a,b)=>a.number-b.number)}}).sort((a,b)=>a.id-b.id)
 return sha(JSON.stringify({run:header,jobs})+'\n')
}
async function body(get,head,path,bytes,digest){const r=await get(prefix+`contents/${path}?ref=${head}`),b=Buffer.from(r?.content??'','base64');need(r?.type==='file'&&r.path===path&&r.encoding==='base64'&&r.size===bytes&&b.length===bytes&&sha(b)===digest,'exact historical source body')}
async function archive(get,{id,name,size,digest,runId,head,branch}){
 const a=await get(prefix+`actions/artifacts/${id}`);need(a?.id===id&&a.name===name&&a.size_in_bytes===size&&a.digest==='sha256:'+digest&&a.expired===false&&a.workflow_run?.id===runId&&a.workflow_run?.head_sha===head&&a.workflow_run?.head_branch===branch&&a.workflow_run?.repository_id===1348452092&&a.workflow_run?.head_repository_id===1348452092,'exact reviewed artifact metadata')
 const b=await get(prefix+`actions/artifacts/${id}/zip`,true);need(Buffer.isBuffer(b)&&b.length===size&&sha(b)===digest,'exact reviewed archive/member bytes')
 // Whole immutable ZIP digest pins every reviewed member/field, including the
 // UNKNOWN owner result and nine natural read-only JSON facts. No source replay.
}
export async function authenticateBadenReconciledFailure({get,run,jobs}){
 need(typeof get==='function'&&run?.id===BADEN_RECONCILED_FAILED_RUN&&executionSha(run,jobs)==='e94223f4c73bbe5440154edca13fc71182d7d41d6524904171d9acf3738e9eef','exact failed owner execution (not skipped/success)')
 await body(get,failedHead,'scripts/install-baden-native-catalog.mjs',28929,'17ec18184138d80edd9b33c5b19c8e01c138cefda2adb0a975c93ddd3420186e');await body(get,failedHead,'.github/workflows/install-baden-native-catalog.yml',6245,'9da40a55f63165c3bc5b7546684bca3c57cdc8e49d39a6db46ff9e22826e5772')
 await archive(get,{id:12943141622,name:'baden-catalog-owner-install-40971795981-1',size:174726,digest:'42f013f1850a8d54c9285f442623a2c83442694148051df5c8d44e792cb0411a',runId:40971795981,head:failedHead,branch:'main'})
 const r=await get(prefix+'actions/runs/40983656379'),j=await get(prefix+'actions/runs/40983656379/attempts/1/jobs?per_page=100&page=1');need(r?.id===40983656379&&executionSha(r,j)==='c27c74643f99324f2eba01b5330aca240655e2bf0a1ba0dd922c062d717d4a80','exact independent natural reconciliation execution')
 await body(get,naturalHead,'scripts/baden-owner-readonly-reconcile.mjs',23277,'64dba3d9b9752c27ecc253d9c3c2d14f2a1423f42f67d239e2b69937ed4ef865');await body(get,naturalHead,'.github/workflows/ci.yml',3343,'f1d61752b0224f0dfd401b30f5db93f078f9c1c8631395149fe89c6ff8e8d452')
 await archive(get,{id:12944989118,name:'baden-owner-readonly-40983656379-1',size:177283,digest:'25a13f49b137feb498c6818c4623684449191f03ca82971ebfd304bb54c1b8f4',runId:40983656379,head:naturalHead,branch:'codex/baden-owner-reconcile-20261030'})
 return {kind:'reconciled-failed-owner-empty',failedRunId:40971795981,failedExecutionSha256:'e94223f4c73bbe5440154edca13fc71182d7d41d6524904171d9acf3738e9eef',originalOutcome:'UNKNOWN_PERMANENT_HOLD',reconciliationRunId:40983656379,reconciliationArtifactSha256:'25a13f49b137feb498c6818c4623684449191f03ca82971ebfd304bb54c1b8f4',originalCause:'UNPROVEN',automaticRetry:false,nativeAdmission:false}
}
export function badenOwnerReadOnlyPreflightSQL(manifest,digest){
 need(typeof manifest==='string'&&Buffer.byteLength(manifest)<=64*1024*1024&&/^[a-f0-9]{64}$/.test(digest)&&sha(manifest)===digest,'exact manifest TEXT/SHA before readonly preflight')
 return `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='30s';SET LOCAL lock_timeout='3s';SET LOCAL idle_in_transaction_session_timeout='30s';SET LOCAL search_path=pg_catalog;
WITH approved AS(SELECT convert_from(decode('${Buffer.from(manifest).toString('hex')}','hex'),'UTF8')body)
SELECT jsonb_build_object('schemaVersion',1,'serverUTC',clock_timestamp(),'transactionReadOnly',current_setting('transaction_read_only'),'defaultTransactionReadOnly',current_setting('default_transaction_read_only'),'currentUser',current_user,'currentDatabase',current_database(),'inRecovery',pg_is_in_recovery(),
'ownerEligible',EXISTS(SELECT 1 FROM pg_class c JOIN pg_roles r ON r.rolname=current_user WHERE c.oid='private_baden_history.catalog'::regclass AND(r.rolsuper OR r.oid=c.relowner)) AND current_user NOT IN('service_role','authenticated','anon','authenticator','agent_bralec'),
'catalogRows',(SELECT count(*)FROM private_baden_history.catalog),'preparedRows',(SELECT count(*)FROM private_baden_history.prepared),'clubBindingRows',(SELECT count(*)FROM private_baden_history.club_bindings),'competitionRows',(SELECT count(*)FROM public.competitions WHERE slug='de-verbandsliga-baden'),
'otherOwnerBackends',(SELECT count(*)FROM pg_stat_activity WHERE application_name='slff-baden-catalog-owner-install' AND pid<>pg_backend_pid()),
'catalogWriterBackends',(SELECT count(DISTINCT pid)FROM pg_locks WHERE database=(SELECT oid FROM pg_database WHERE datname=current_database())AND relation='private_baden_history.catalog'::regclass AND pid<>pg_backend_pid()AND mode IN('RowExclusiveLock','ShareRowExclusiveLock','ExclusiveLock','AccessExclusiveLock')),
'manifestShaMatches',private_baden_history.sha(body::jsonb)='${digest}','manifestCanonical',private_fussball.canonical_json(body::jsonb)=body,'manifestKindMatches',body::jsonb->>'kind'='baden-atomic-history-cards-preparation','manifestSlugMatches',body::jsonb->>'slug'='de-verbandsliga-baden','manifestFresh',(body::jsonb->>'currentFreshUntil')::timestamptz>clock_timestamp())FROM approved;
ROLLBACK;
`
}
export function safeBadenOwnerPreflightObservation(v){
 const keys=['schemaVersion','serverUTC','transactionReadOnly','defaultTransactionReadOnly','currentUser','currentDatabase','inRecovery','ownerEligible','catalogRows','preparedRows','clubBindingRows','competitionRows','otherOwnerBackends','catalogWriterBackends','manifestShaMatches','manifestCanonical','manifestKindMatches','manifestSlugMatches','manifestFresh']
 need(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join(',')===keys.sort().join(','),'closed readonly preflight')
 need(v.schemaVersion===1&&typeof v.serverUTC==='string'&&v.serverUTC.length<=40&&Number.isFinite(Date.parse(v.serverUTC))&&['transactionReadOnly','defaultTransactionReadOnly'].every(k=>['on','off'].includes(v[k]))&&['currentUser','currentDatabase'].every(k=>typeof v[k]==='string'&&/^[A-Za-z_][A-Za-z0-9_-]{0,62}$/.test(v[k]))&&['inRecovery','ownerEligible','manifestShaMatches','manifestCanonical','manifestKindMatches','manifestSlugMatches','manifestFresh'].every(k=>typeof v[k]==='boolean')&&['catalogRows','preparedRows','clubBindingRows','competitionRows','otherOwnerBackends','catalogWriterBackends'].every(k=>Number.isSafeInteger(v[k])&&v[k]>=0),'bounded typed readonly preflight observation');return {...v}
}
export function assertBadenOwnerReadOnlyPreflight(v,{user,database}){
 safeBadenOwnerPreflightObservation(v)
 const age=Date.now()-Date.parse(v.serverUTC);need(v.schemaVersion===1&&typeof v.serverUTC==='string'&&Number.isFinite(age)&&age>=-5000&&age<=30000&&v.transactionReadOnly==='on'&&v.defaultTransactionReadOnly==='off'&&v.currentUser===user&&v.currentDatabase===database&&v.inRecovery===false,'fresh natural owner primary/read-only transaction required')
 need(['ownerEligible','manifestShaMatches','manifestCanonical','manifestKindMatches','manifestSlugMatches','manifestFresh'].every(k=>v[k]===true)&&['catalogRows','preparedRows','clubBindingRows','competitionRows','otherOwnerBackends','catalogWriterBackends'].every(k=>v[k]===0),'exact empty/fresh manifest/no competing owner/catalog writer required');return true
}
export function safeBadenOwnerProcessResult(e,stage){
 need(['PREFLIGHT_PROCESS','PREFLIGHT_PARSE','SQL','READBACK_PARSE','READBACK_MATCH'].includes(stage),'closed process diagnostic stage');const err=Buffer.from(e?.stderr??''),out=Buffer.from(e?.stdout??'')
 return {stage,exitStatus:Number.isInteger(e?.status)&&e.status>=0&&e.status<=255?e.status:null,signal:['SIGTERM','SIGKILL','SIGABRT','SIGINT'].includes(e?.signal)?e.signal:null,processCode:['ETIMEDOUT','ENOBUFS','ENOENT','EACCES','ECONNRESET','EPIPE'].includes(e?.code)?e.code:null,sqlstate:/(?:ERROR|FATAL|PANIC):\s+([0-9A-Z]{5})\b/.exec(err.toString('utf8'))?.[1]??null,stdoutBytes:out.length,stdoutSha256:sha(out),stderrBytes:err.length,stderrSha256:sha(err)}
}
