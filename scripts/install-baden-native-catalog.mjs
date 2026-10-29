// Same-writer owner installation of independently reviewed DATA, never native
// registration/import/admission. No import-time IO or public transport overrides.
import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {githubGetAdapter} from './stage-fussball-native-composition.mjs'
import {loadFussballNativeComposition,getFussballNativeComposition} from './fussball-native-composition.mjs'
import {describeFussballNativePreparation} from './prepare-fussball-native-history.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',prefix=`repos/${repository}/`,workflow='.github/workflows/install-baden-native-catalog.yml',releaseTag='baden-native-staging-v1',output='baden-native-catalog-install'
const maximum=64*1024*1024,sha=b=>createHash('sha256').update(b).digest('hex'),json=v=>JSON.stringify(v)+'\n'
const need=(v,m)=>{if(!v)throw Object.assign(Error('Baden catalog HOLD: '+m),{dataHold:true,code:'BADEN_CATALOG_INSTALL_HOLD'})}
const closed=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join(',')===keys.slice().sort().join(',')
const id=v=>typeof v==='string'&&/^[1-9]\d{0,15}$/.test(v)&&Number.isSafeInteger(Number(v))
const owner=a=>a?.id===25134229&&a.login==='nejcar20'&&a.type==='User'
// Exact historical validation-only R1; never evidence of owner installation.
const skippedH1={runId:40796083954,head:'47d46f3a91813a7e720f3affccee056c1462ab07',validationJob:123192784514,installationJob:123193495657,files:{'scripts/install-baden-native-catalog.mjs':{bytes:18662,sha256:'a5f004f79bc6635b0392ed28711f5ec71fdd7d1d86ef8cf05833e34d4a84050e'},'.github/workflows/install-baden-native-catalog.yml':{bytes:6039,sha256:'65016f04f94512f234ac60f750c8f953cd38c1c51692e5ebef4235efe9de92f5'}}}
let diagnostic={phase:'INPUT',code:'CHECK_REFUSED'}
const phase=name=>{diagnostic={phase:name,code:'CHECK_REFUSED'}}
const safeGetCode=v=>typeof v==='string'&&/^(ARTIFACT_ZIP|CONTENTS_RAW|CONTENTS_OBJECT|REPOSITORY_JSON)_(TIMEOUT|BUFFER|FAILED|HTTP_(401|403|404|429|500|502|503|504))$/.test(v)?v:'GITHUB_GET_FAILED'
function catalogHoldDiagnostic(){return {status:'HOLD',phase:diagnostic.phase,code:diagnostic.code}}
const write=(name,bytes)=>writeFileSync(join(output,name),bytes,{flag:'wx',mode:0o600})
function pins(){
 const e=process.env
 need(e.GITHUB_ACTIONS==='true'&&e.GITHUB_REPOSITORY===repository&&e.GITHUB_REF==='refs/heads/main'&&e.GITHUB_EVENT_NAME==='workflow_dispatch'&&e.GITHUB_RUN_ATTEMPT==='1'&&['validate','install'].includes(e.GITHUB_JOB)&&/^[a-f0-9]{40}$/.test(e.GITHUB_SHA??'')&&e.EXPECTED_SHA===e.GITHUB_SHA,'manual main first-attempt exact writer required')
 need([e.GITHUB_RUN_ID,e.DERIVED_RUN_ID,e.MAIN_CI_RUN_ID,e.REVIEWED_ASSET_ID].every(id)&&new Set([e.GITHUB_RUN_ID,e.DERIVED_RUN_ID,e.MAIN_CI_RUN_ID]).size===3&&/^[a-f0-9]{64}$/.test(e.REVIEWED_MANIFEST_SHA256??'')&&e.FROZEN_DE77_DIRECTORY==='frozen-de77'&&e.FROZEN_V6_DIRECTORY==='frozen-v6'&&e.MIGRACIJE_PREMOR!=='1','closed reviewed run/asset/SHA/frozen pins required')
 need(realpathSync(process.cwd())===realpathSync(fileURLToPath(new URL('../',import.meta.url)))&&execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===e.GITHUB_SHA,'exact installed writer checkout required')
 return {runId:e.GITHUB_RUN_ID,head:e.GITHUB_SHA,derivedRunId:e.DERIVED_RUN_ID,mainCiRunId:e.MAIN_CI_RUN_ID,assetId:e.REVIEWED_ASSET_ID,sha256:e.REVIEWED_MANIFEST_SHA256}
}
function runIdentity(r,p,id=p.runId){
 need(r?.id===Number(id)&&r.run_attempt===1&&r.head_sha===p.head&&r.head_branch==='main'&&r.path===workflow&&r.event==='workflow_dispatch'&&r.repository?.full_name===repository&&r.head_repository?.full_name===repository&&owner(r.actor)&&owner(r.triggering_actor),'actual root installer run/actor/triggering actor differs')
}
const validationSteps=new Set(['Set up job','Checkout exact reviewed writer','Checkout frozen DE77','Checkout frozen failed V6','Set up Node22','Install locked dependencies','Authenticate source, root review, writer and deployed main','Preserve validation evidence','Post Set up Node22','Post Checkout frozen failed V6','Post Checkout frozen DE77','Post Checkout exact reviewed writer','Complete job'])
const installSteps=new Set(['Set up job','Checkout exact reviewed writer','Checkout frozen DE77','Checkout frozen failed V6','Set up Node22','Install locked dependencies','Validate again before owner connection','Owner connection prerequisite','Tunnel to owner database','Install reviewed immutable catalog once','Preserve owner installation evidence','Post Set up Node22','Post Checkout frozen failed V6','Post Checkout frozen DE77','Post Checkout exact reviewed writer','Complete job'])
function jobsShape(v,p,runId){
 need(v?.total_count===2&&Array.isArray(v.jobs)&&v.jobs.length===2&&new Set(v.jobs.map(j=>j.id)).size===2,'closed two-job installer inventory required')
 for(const j of v.jobs){need(Number.isSafeInteger(j.id)&&j.id>0&&['validate','install'].includes(j.name)&&j.run_id===Number(runId)&&j.run_attempt===1&&j.head_sha===p.head&&Array.isArray(j.steps),'actual known installer job required');const names=j.steps.map(s=>s.name);need(new Set(names).size===names.length&&j.steps.every(s=>(j.name==='validate'?validationSteps:installSteps).has(s.name)),'unknown installer step refuses nonconsumption witness')}
 need(v.jobs.filter(j=>j.name==='validate').length===1&&v.jobs.filter(j=>j.name==='install').length===1,'exact validation and owner jobs required');return {validation:v.jobs.find(j=>j.name==='validate'),installation:v.jobs.find(j=>j.name==='install')}
}
async function history(get,p){
 const v=await get(prefix+`actions/workflows/install-baden-native-catalog.yml/runs?event=workflow_dispatch&per_page=100&page=1`)
 need(Number.isSafeInteger(v?.total_count)&&v.total_count>=1&&v.total_count<=100&&Array.isArray(v.workflow_runs)&&v.workflow_runs.length===v.total_count&&new Set(v.workflow_runs.map(r=>r.id)).size===v.total_count&&v.workflow_runs.filter(r=>r.id===Number(p.runId)).length===1,'complete bounded installer history required')
 for(const listed of v.workflow_runs){
  need(/^[a-f0-9]{40}$/.test(listed.head_sha??''),'prior installer head missing');const prior={...p,head:listed.head_sha}
  runIdentity(listed,prior,String(listed.id));if(listed.id===Number(p.runId)){need(listed.head_sha===p.head,'current history head drift');continue}
  const r=await get(prefix+`actions/runs/${listed.id}`);runIdentity(r,prior,String(listed.id))
  need(r.status==='completed'&&['failure','cancelled','timed_out'].includes(r.conclusion),'earlier live/success/unknown installer holds for reconciliation')
  const {validation,installation}=jobsShape(await get(prefix+`actions/runs/${listed.id}/attempts/1/jobs?per_page=100&page=1`),prior,String(listed.id))
  need(installation.status==='completed'&&installation.conclusion==='skipped'&&installation.steps.length===0&&validation.status==='completed'&&['failure','cancelled','timed_out'].includes(validation.conclusion)&&validation.steps.length>0&&validation.steps.every(s=>s.status==='completed'&&['success','failure','skipped','cancelled'].includes(s.conclusion)),'earlier owner job not explicitly skipped; permanent HOLD')
  const known=r.id===skippedH1.runId
  if(known){need(r.head_sha===skippedH1.head&&validation.id===skippedH1.validationJob&&installation.id===skippedH1.installationJob,'exact historical skipped-owner identity differs');const artifacts=await get(prefix+`actions/runs/${r.id}/artifacts?per_page=100&page=1`);need(artifacts?.total_count===0&&Array.isArray(artifacts.artifacts)&&artifacts.artifacts.length===0,'historical validation-only artifact inventory must be empty')}
  for(const file of ['scripts/install-baden-native-catalog.mjs',workflow]){const bytes=readFileSync(new URL('../'+file,import.meta.url)),remote=await get(prefix+`contents/${file}?ref=${prior.head}`),body=Buffer.from(remote?.content??'','base64'),expected=known?skippedH1.files[file]:{bytes:bytes.length,sha256:sha(bytes)};need(remote?.type==='file'&&remote.path===file&&remote.encoding==='base64'&&remote.size===expected.bytes&&body.length===expected.bytes&&sha(body)===expected.sha256,'prior validation-only installer body differs')}
 }
}
async function identity(get,p,beforeOwner=false){
 const r=await get(prefix+`actions/runs/${p.runId}`);runIdentity(r,p);need(r.status==='in_progress'&&r.conclusion===null,'actual installer must be running')
 const main=await get(prefix+'branches/main');need(main?.name==='main'&&main.commit?.sha===p.head,'actual main drift')
 const ci=await get(prefix+`actions/runs/${p.mainCiRunId}`)
 need(ci?.id===Number(p.mainCiRunId)&&ci.run_attempt===1&&ci.head_sha===p.head&&ci.head_branch==='main'&&ci.event==='push'&&ci.path==='.github/workflows/ci.yml'&&ci.status==='completed'&&ci.conclusion==='success'&&ci.repository?.full_name===repository&&ci.head_repository?.full_name===repository,'actual successful writer CI required')
 for(const file of ['scripts/install-baden-native-catalog.mjs',workflow]){const bytes=readFileSync(new URL('../'+file,import.meta.url)),remote=await get(prefix+`contents/${file}?ref=${p.head}`);need(remote?.type==='file'&&remote.path===file&&remote.encoding==='base64'&&remote.size===bytes.length&&Buffer.from(remote.content,'base64').equals(bytes),'installed installer/workflow body drift')}
 const response=await fetch('https://slff.eu/',{headers:{'Cache-Control':'no-cache'},redirect:'error',signal:AbortSignal.timeout(30000)});need(response.ok,'served writer unavailable');const html=await response.text();need(Buffer.byteLength(html)<=4*1024*1024,'bounded served HTML required')
 const matches=[...html.matchAll(/<meta\b[^>]*name=["']slff-commit["'][^>]*content=["']([a-f0-9]{40})["']/g)];need(matches.length===1&&matches[0][1]===p.head,'exact single served writer identity required')
 await history(get,p)
 if(process.env.GITHUB_JOB==='install'){
  const {validation,installation}=jobsShape(await get(prefix+`actions/runs/${p.runId}/attempts/1/jobs?per_page=100&page=1`),p,p.runId)
  need(validation.status==='completed'&&validation.conclusion==='success'&&validation.steps.every(s=>s.status==='completed'&&['success','skipped'].includes(s.conclusion))&&validation.steps.filter(s=>s.name==='Authenticate source, root review, writer and deployed main'&&s.conclusion==='success').length===1&&installation.status==='in_progress'&&installation.conclusion===null,'successful credential-free validation job before owner job required')
  if(beforeOwner)need(['Validate again before owner connection','Owner connection prerequisite'].every(name=>installation.steps.filter(s=>s.name===name&&s.status==='completed'&&s.conclusion==='success').length===1)&&installation.steps.filter(s=>s.name==='Install reviewed immutable catalog once'&&s.status==='in_progress'&&s.conclusion===null).length===1,'actual owner step and successful pre-connection guards required')
 }
 return {runId:p.runId,head:p.head,mainCiRunId:p.mainCiRunId,served:p.head}
}
async function reviewedAsset(get,p){
 // Draft visibility requires push access; the by-tag API is for published releases.
 const releases=[]
 for(let page=1;page<=10;page++){const rows=await get(prefix+`releases?per_page=100&page=${page}`);need(Array.isArray(rows)&&rows.length<=100,'bounded private release inventory required');releases.push(...rows);if(rows.length<100)break;need(page<10,'private release inventory truncated')}
 const matchesByTag=releases.filter(r=>r.tag_name===releaseTag),release=matchesByTag[0];need(matchesByTag.length===1&&Number.isSafeInteger(release?.id)&&release.id>0&&release.draft===true,'unique exact private draft staging release required')
 const assets=[]
 for(let page=1;page<=10;page++){const rows=await get(prefix+`releases/${release.id}/assets?per_page=100&page=${page}`);need(Array.isArray(rows)&&rows.length<=100,'bounded draft asset inventory required');assets.push(...rows);if(rows.length<100)break;need(page<10,'draft asset inventory truncated')}
 const name=`baden-native-catalog-${p.derivedRunId}-${p.sha256}.json`,matches=assets.filter(a=>a.name===name),asset=await get(prefix+'releases/assets/'+p.assetId)
 need(matches.length===1&&matches[0].id===Number(p.assetId)&&['id','name','state','size','url'].every(k=>matches[0][k]===asset[k])&&owner(matches[0].uploader)&&asset.name===name&&asset.state==='uploaded'&&owner(asset.uploader)&&Number.isSafeInteger(asset.size)&&asset.size>0&&asset.size<=maximum&&asset.url===`https://api.github.com/${prefix}releases/assets/${p.assetId}`,'unique root-uploaded reviewed manifest asset required')
 let bytes;try{bytes=execFileSync('gh',['api','--method','GET',prefix+'releases/assets/'+p.assetId,'-H','Accept: application/octet-stream'],{timeout:60000,maxBuffer:maximum+1,stdio:['ignore','pipe','pipe']})}catch{diagnostic.code='REVIEWED_ASSET_BINARY_GET_FAILED';need(false,'reviewed asset GET unavailable')}
 need(Buffer.isBuffer(bytes)&&bytes.length===asset.size&&sha(bytes)===p.sha256,'reviewed asset bytes/SHA differ');return {bytes,releaseId:release.id,assetId:p.assetId,name,sha256:p.sha256}
}
async function authenticate(p,beforeOwner){
 const adapter=githubGetAdapter(process.env.GH_TOKEN),get=async(path,binary=false)=>{try{return await adapter(path,binary)}catch(error){diagnostic.code=safeGetCode(error?.githubDiagnostic);throw error}}
 phase('IDENTITY');const first=await identity(get,p,false)
 phase('COMPOSITION');const composition=await loadFussballNativeComposition({derivedRunId:p.derivedRunId,derivedHead:p.head,frozenDirectory:'frozen-de77',v6FrozenDirectory:'frozen-v6',github:get})
 phase('MANIFEST');const description=await describeFussballNativePreparation(composition)
 phase('REVIEWED_ASSET');const asset=await reviewedAsset(get,p)
 need(description.catalogStatus==='FINALIZED'&&description.nativeImportEligible===false&&description.activationEligible===false&&typeof description.manifest==='string'&&Buffer.byteLength(description.manifest)<=maximum&&description.sha256===p.sha256&&sha(description.manifest)===p.sha256&&asset.bytes.equals(Buffer.from(description.manifest)),'independently reviewed DATA differs from genuine canonical source rebuild')
 phase('MANIFEST_REAUTH');const again=await describeFussballNativePreparation(composition),state=getFussballNativeComposition(composition),manifest=JSON.parse(again.manifest)
 need(again.manifest===description.manifest&&again.sha256===description.sha256&&state.proof.derivedHead===p.head&&state.pack.expectedSha===p.head&&state.pack.replayHead===p.head&&manifest.currentFreshUntil===state.proof.currentFreshUntil&&Date.now()<Date.parse(manifest.currentFreshUntil),'source/manifest/writer freshness drift')
 phase('FINAL_IDENTITY');const final=await identity(get,p,beforeOwner);need(JSON.stringify(first)===JSON.stringify(final),'writer/root identity drift');getFussballNativeComposition(composition)
 return {manifest:description.manifest,sha256:p.sha256,asset:{releaseId:asset.releaseId,assetId:asset.assetId,name:asset.name},identity:final}
}
function installationSQL(manifest,digest){
 need(typeof manifest==='string'&&Buffer.byteLength(manifest)<=maximum&&/^[a-f0-9]{64}$/.test(digest)&&sha(manifest)===digest,'closed canonical SQL DATA required')
 // Hex transports text as DATA. No caller SQL, filename, identifier or target.
 const hex=Buffer.from(manifest).toString('hex')
 return `BEGIN ISOLATION LEVEL READ COMMITTED;
set local lock_timeout='10s';set local statement_timeout='120s';set local idle_in_transaction_session_timeout='120s';set local search_path=pg_catalog;
lock table private_baden_history.catalog in access exclusive mode;
DO $install$ declare body text:=convert_from(decode('${hex}','hex'),'UTF8');digest text:='${digest}';begin
 if not exists(select 1 from pg_class c join pg_roles r on r.rolname=current_user where c.oid='private_baden_history.catalog'::regclass and (r.rolsuper or r.oid=c.relowner)) or current_user in('service_role','authenticated','anon','authenticator','agent_bralec')then raise exception 'BADEN_CATALOG: owner connection required';end if;
 if (select count(*)from private_baden_history.catalog)<>0 then raise exception 'BADEN_CATALOG: empty immutable catalog required';end if;
 if private_baden_history.sha(body::jsonb) is distinct from digest or private_fussball.canonical_json(body::jsonb) is distinct from body or body::jsonb->>'kind' is distinct from 'baden-atomic-history-cards-preparation' or body::jsonb->>'slug' is distinct from 'de-verbandsliga-baden' or (body::jsonb->>'currentFreshUntil')::timestamptz<=clock_timestamp()then raise exception 'BADEN_CATALOG: canonical source manifest/freshness differs';end if;
 insert into private_baden_history.catalog(singleton,manifest,manifest_sha256)values(true,body::jsonb,digest);
 if (select count(*)from private_baden_history.catalog)<>1 or not exists(select 1 from private_baden_history.catalog where singleton and manifest_sha256=digest and private_fussball.canonical_json(manifest)=body)then raise exception 'BADEN_CATALOG: exact transactional readback required';end if;
end $install$;
COMMIT;
BEGIN READ ONLY;
select jsonb_build_object('rows',(select count(*)from private_baden_history.catalog),'sha256',manifest_sha256,'manifest',private_fussball.canonical_json(manifest))from private_baden_history.catalog where singleton;
ROLLBACK;
`
}
function ownerEnvironment(){
 const uri=process.env.SUPABASE_DB_URL;need(typeof uri==='string'&&uri.length>0,'owner connection prerequisite missing')
 let u;try{u=new URL(uri)}catch{need(false,'invalid owner connection prerequisite')}
 need(['postgres:','postgresql:'].includes(u.protocol)&&u.hostname&&u.username,'valid owner connection prerequisite required')
 return {PATH:process.env.PATH,HOME:process.env.HOME,LANG:'C.UTF-8',PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:decodeURIComponent(u.pathname.slice(1)||'postgres'),PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGSSLMODE:u.searchParams.get('sslmode')||'prefer',PGCONNECT_TIMEOUT:'15',PGAPPNAME:'slff-baden-catalog-owner-install'}
}
export async function runBadenNativeCatalogInstaller(input){
 phase('INPUT')
 need(closed(input,['command']),'closed input: command only; no IO/proof/clock overrides');need(['validate','install'].includes(input.command),'validate or install required')
 phase('PINS');const p=pins();need(input.command!=='install'||process.env.GITHUB_JOB==='install','owner install job required')
 if(input.command==='install')need(existsSync(join(output,'preflight.json'))&&!existsSync(join(output,'write-intent.json')),'one-shot owner intent absent and successful local preflight required')
 const authenticated=await authenticate(p,input.command==='install'),binding={...p,...authenticated.asset}
 if(input.command==='validate'){
  mkdirSync(output,{mode:0o700});write('manifest.json',authenticated.manifest);write('preflight.json',json({binding,identity:authenticated.identity,sha256:authenticated.sha256,at:new Date().toISOString()}))
  return {status:'VALIDATED',sha256:p.sha256,nativeImportEligible:false,activationEligible:false}
 }
 phase('LOCAL_PREFLIGHT');const preflight=JSON.parse(readFileSync(join(output,'preflight.json'),'utf8'))
 need(JSON.stringify(preflight.binding)===JSON.stringify(binding)&&readFileSync(join(output,'manifest.json')).equals(Buffer.from(authenticated.manifest)),'local preflight/manifest reread drift')
 write('write-intent.json',json({binding,sha256:p.sha256,at:new Date().toISOString(),status:'SENDING_ONCE_NO_RETRY'}))
 try{
  phase('OWNER_TRANSACTION');const env=ownerEnvironment(),raw=execFileSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{env,input:installationSQL(authenticated.manifest,p.sha256),encoding:'utf8',timeout:150000,maxBuffer:maximum+1024*1024,stdio:['pipe','pipe','pipe']}),v=JSON.parse(raw.trim())
  need(closed(v,['rows','sha256','manifest'])&&v.rows===1&&v.sha256===p.sha256&&v.manifest===authenticated.manifest,'exact committed catalog readback required')
  const result={status:'INSTALLED',binding,sha256:p.sha256,at:new Date().toISOString(),nativeImportEligible:false,activationEligible:false};write('result.json',json(result));return result
 }catch{
  diagnostic.code='OWNER_OUTCOME_UNKNOWN'
  write('result.json',json({status:'UNKNOWN_PERMANENT_HOLD',binding,at:new Date().toISOString(),reason:'owner transaction or readback ambiguous; no automatic retry',nativeImportEligible:false,activationEligible:false}));need(false,'UNKNOWN owner outcome; permanent one-shot HOLD, reconcile read-only')
 }
}
// CLI entry. No automatic invocation on import.
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 if(process.argv.length!==3){console.error('Baden catalog HOLD: exact validate/install command required');process.exitCode=1}
 else runBadenNativeCatalogInstaller({command:process.argv[2]}).then(v=>console.log(JSON.stringify(v))).catch(()=>{console.error(JSON.stringify(catalogHoldDiagnostic()));process.exitCode=1})
}
