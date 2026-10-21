// Fixed Actions coordinator: retained public source only, ordinary sealed CLI replay.
import {execFileSync} from 'node:child_process'
import {mkdirSync,writeFileSync,existsSync,mkdtempSync,chmodSync,utimesSync,renameSync,cpSync,rmSync,readdirSync,lstatSync} from 'node:fs'
import {join,resolve,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL,fileURLToPath} from 'node:url'
import {github,githubJson,sha256,repository} from './dfb-artifacts.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256 as canonicalSha} from './lib/historical-statistics-policy.mjs'
import {runMfaRegistrationSmoke} from './mfa-registration-smoke.mjs'
import {NL_REVIEWED_SOURCES,NL_REVIEWED_PRIOR,NL_REVIEWED_WORKFLOW,requireNl,nlTarget,assertNlActionsExecution,verifyNlReviewedContract,verifyNlPreparedArtifactIdentity,readNlPreparedArchive,verifyNlPreparedFiles} from './mfa-nl-reviewed-evidence.mjs'

export function nlReplayCommands(league){const t=nlTarget(league);return[
 ['scripts/uvoz-zapisnikov.mjs','--tekmovanje',league,'--liga',`${t.type}/2026`],
 ['scripts/uvoz-razporeda.mjs','--tekmovanje',league,'--pisi'],
 ['scripts/uvoz-zapisnikov.mjs','--tekmovanje',league,'--liga',`${t.type}/2027`],
]}
export function nlPricingCommands(league){nlTarget(league);return['lazni-vratarji','ugani-pozicije','ovrednoti-igralce'].map(n=>[`scripts/${n}.mjs`,'--tekmovanje',league,'--pisi'])}
function sameOpening(actual,expected){requireNl(actual?.round===expected?.round&&actual.playedOn===expected.playedOn&&Number.isFinite(Date.parse(actual.deadlineAt))&&Date.parse(actual.deadlineAt)===Date.parse(expected.deadlineAt),'reviewed source opening differs')}

/** Dependency boundaries make stage ordering testable without credentials or network. */
export async function runNlReviewedStage(options,deps){
 const{mode,league,commit,contractSha,runId}=options,t=nlTarget(league)
 requireNl(['prepare','bootstrap','import','reprice','preview','activate','receipt'].includes(mode)&&/^[a-f0-9]{40}$/.test(commit??'')&&/^[a-f0-9]{64}$/.test(contractSha??'')&&/^[1-9]\d*$/.test(runId??''),'fixed stage, main and contract pins required')
 if(mode==='activate')requireNl(/^[a-f0-9]{64}$/.test(options.previewSha??''),'externally reviewed preview SHA required')
 await deps.assertMain()
 const policy=deps.policy(league),response=await deps.rpc('get_mfa_nl_reviewed_source_contract',{p_competition_id:t.competitionId,p_contract_sha:contractSha})
 const contract=verifyNlReviewedContract(response,{league,contractSha,policy}),policySha=canonicalSha(policy)
 const manifest={schemaVersion:1,kind:`mfa-nl-reviewed-${mode}`,league,competitionId:t.competitionId,mainCommit:commit,runId,runAttempt:'1',contractSha256:contractSha,policySha256:policySha,sourceArtifact:t.artifact}
 const params={p_competition_id:t.competitionId,p_main_sha:commit,p_contract_sha:contractSha}
 const writeRpc=async(name,args)=>{await deps.assertMain();return deps.rpc(name,args)}
 if(mode==='receipt')manifest.result=await deps.rpc('get_mfa_nl_reviewed_release_receipt',{p_competition_id:t.competitionId})
 else{
  const source=await deps.source(league,contract),model=await deps.derive({league,cache:source.cache,firstFantasyPlayedOn:contract.opening.playedOn})
  deps.verifyContract(model,contract);manifest.sourceProof=source.proof
  const opening=(value,competition)=>{const found=deps.verifyOpening(model,value,competition);sameOpening(found,contract.opening);return found}
  const beforeProof=text=>{
   const image=JSON.parse(text)
   requireNl(image.competitionId===t.competitionId&&image.policySha256===policySha,'bootstrap native identity differs')
   const parity=deps.verifyFootball(model,image.current,{currentOnly:true});return{parity,opening:opening(image.opening,image.competition)}
  }
  const native=async()=>{
   const state=await deps.rpc('get_mfa_nl_reviewed_source_state',params)
   requireNl(typeof state.footballImageText==='string'&&sha256(Buffer.from(state.footballImageText))===state.footballSha256,'exact native football bytes/SHA differ')
   const image=JSON.parse(state.footballImageText),parity=deps.verifyFootball(model,image)
   manifest.nativeProof={...parity,footballSha256:state.footballSha256,opening:opening(state.opening,image.competition)}
   return state
  }
  if(mode==='prepare'){
   const prepared=await deps.rpc('prepare_mfa_nl_reviewed_bootstrap',{p_competition_id:t.competitionId,p_main_sha:commit,p_policy_sha:policySha})
   requireNl(typeof prepared.beforeImageText==='string'&&sha256(Buffer.from(prepared.beforeImageText))===prepared.beforeSha256,'SQL beforeimage text hash differs')
   manifest.beforeSha256=prepared.beforeSha256;manifest.currentProof=beforeProof(prepared.beforeImageText)
   deps.write('before-image.json',prepared.beforeImageText);deps.write('source-contract.json',JSON.stringify(contract,null,2)+'\n')
  }else if(mode==='bootstrap'){
   const expected={...options.prepareArtifact,commit,branch:'main',workflow:NL_REVIEWED_WORKFLOW,name:`mfa-nl-reviewed-prepare-${league}-${options.prepareArtifact?.runId}-1`}
   const files=await deps.prepared(expected),text=verifyNlPreparedFiles(files,{league,commit,runId:expected.runId,contractSha,policy,contract,beforeSha:options.beforeSha})
   manifest.currentProof=beforeProof(text);manifest.prepareArtifact=expected
   manifest.result=await writeRpc('apply_mfa_nl_reviewed_bootstrap',{p_competition_id:t.competitionId,p_main_sha:commit,p_policy_sha:policySha,p_before_sha:options.beforeSha,p_before_image_text:text})
  }else if(mode==='import'){
   const installed=await deps.rpc('get_mfa_nl_reviewed_bootstrap_receipt',{p_competition_id:t.competitionId})
   requireNl(installed.bootstrap?.competition_id===t.competitionId&&installed.bootstrap.policy_sha===policySha&&installed.installed?.installed===true&&installed.installed.policyId===policy.id&&installed.installed.policySha256===policySha,'complete installed bootstrap required before ordinary archive replay')
   manifest.bootstrapCurrentProof=beforeProof(installed.bootstrap.before_image_text)
   await deps.assertMain();await deps.importSource(league,source)
   const state=await native()
   manifest.result=await writeRpc('record_mfa_nl_reviewed_import',{...params,p_football_sha:state.footballSha256})
   await deps.promoteCache()
  }else if(mode==='reprice'){
   await native();await deps.assertMain();await deps.price(league,source)
   await native();manifest.result=await writeRpc('record_mfa_nl_reviewed_prices',params)
  }else{
   await native();manifest.normalRegistrationSmoke=await deps.smoke({competitionId:t.competitionId})
   manifest.result=await writeRpc('check_mfa_nl_reviewed_release',{...params,p_expected_preview_sha:mode==='activate'?options.previewSha:null,p_activate:mode==='activate'})
  }
 }
 manifest.complete=true;deps.write('manifest.json',JSON.stringify(manifest,null,2)+'\n');return manifest
}

/** GitHub metadata and every source byte are authenticated before exposing a cache. */
export async function authenticateNlSource(league,{json=githubJson,binary=path=>github(path,true)}={}){
 const t=nlTarget(league),{verifyNlArtifactIdentity,unpackNlSourceArchive,verifyNlAuditCache,verifyNlCaptureLedger}=await import('./mfa-nl-source-evidence.mjs')
 const download=(expected,priorCapture=false)=>{
  const artifact=json(`actions/artifacts/${expected.artifactId}`),run=json(`actions/runs/${expected.runId}`)
  verifyNlArtifactIdentity({artifact,run,expected,priorCapture});const bytes=binary(`actions/artifacts/${expected.artifactId}/zip`)
  requireNl(bytes.length===artifact.size_in_bytes,'actual source ZIP size differs');return unpackNlSourceArchive(bytes,expected.digest)
 }
 const archive=download(t.artifact),audited=verifyNlAuditCache(archive,{league,sourceRunId:t.sourceRunId,prefix:t.prefix})
 if(league==='mt-nl1'){
  const run=JSON.parse(archive.files.get('source-run.json'))
  requireNl(String(run.id)===t.sourceRunId&&run.head_sha===t.artifact.commit&&run.head_branch==='main'&&run.path==='.github/workflows/uvoz-lige.yml'&&run.event==='workflow_dispatch'&&run.run_attempt===1&&run.status==='completed'&&run.conclusion==='failure'&&run.repository?.full_name===repository&&run.head_repository?.full_name===repository,'fixed original NL I current-import provenance differs')
 }
 let ledger=null
 if(league==='mt-nl2')ledger=verifyNlCaptureLedger(archive,{runId:t.artifact.runId,commit:t.artifact.commit,priorCapture:{runId:NL_REVIEWED_PRIOR.runId,archive:download(NL_REVIEWED_PRIOR,true)}})
 return{cache:audited.cache,catalog:audited.manifest.cacheCatalog,proof:{sourceArtifact:t.artifact,sourceRunId:t.sourceRunId,cacheFiles:audited.files,cacheBytes:audited.bytes,...(ledger?{priorArtifact:NL_REVIEWED_PRIOR,ledger}:{})}}
}

// Restored country data is preserved, never read by replay. Only authenticated bodies feed it.
export function prepareNlReplayCache(source,{cacheRoot=resolve('scripts/.predpomnilnik')}={}){
 requireNl(source.cache instanceof Map&&Array.isArray(source.catalog),'authenticated source catalog required')
 for(const row of source.catalog)requireNl(/^[A-Za-z0-9_-]+[.]json$/.test(row.file)&&Buffer.isBuffer(source.cache.get(row.file))&&sha256(source.cache.get(row.file))===row.sha256&&source.cache.get(row.file).length===row.bytes&&Number.isFinite(Date.parse(row.mtime)),'verified source cache bytes/mtime differ')
 mkdirSync(dirname(cacheRoot),{recursive:true})
 const work=mkdtempSync(join(dirname(cacheRoot),'.mfa-nl-replay-')),previous=join(work,'previous'),sealed=join(work,'sealed'),ordinary=join(cacheRoot,'mfa')
 if(existsSync(cacheRoot))renameSync(cacheRoot,previous)
 mkdirSync(ordinary,{recursive:true});mkdirSync(sealed)
 const seed=dir=>{for(const row of source.catalog){const path=join(dir,row.file);writeFileSync(path,source.cache.get(row.file));utimesSync(path,new Date(row.mtime),new Date(row.mtime))}}
 seed(ordinary);seed(sealed)
 for(const row of source.catalog)chmodSync(join(sealed,row.file),0o444)
 chmodSync(sealed,0o555)
 return{sealed,promote(){
  // Restore raw files after CLI processing with exact original bytes and mtimes.
  seed(ordinary)
  const plain=dir=>{for(const name of readdirSync(dir)){const path=join(dir,name),s=lstatSync(path);requireNl(!s.isSymbolicLink()&&(s.isFile()||s.isDirectory()),'unsafe previous country cache');if(s.isDirectory())plain(path)}}
  if(existsSync(previous)){plain(previous);cpSync(cacheRoot,previous,{recursive:true,force:true,preserveTimestamps:true});rmSync(cacheRoot,{recursive:true});renameSync(previous,cacheRoot)}
 }}
}

async function cli(){
 const env=process.env,mode=process.argv[2],league=env.MFA_NL_LEAGUE,commit=env.EXPECTED_SHA
 // Validate local authority before even contacting GitHub or parsing credentials.
 const local={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),originMain:execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim(),liveMain:commit}
 assertNlActionsExecution(env,local);nlTarget(league)
 const assertMain=async()=>assertNlActionsExecution(env,{...local,liveMain:githubJson('commits/main').sha})
 await assertMain()
 let endpoint
 try{endpoint=new URL(env.SUPABASE_URL)}catch{requireNl(false,'database endpoint required')}
 requireNl(endpoint.protocol==='https:'&&!endpoint.username&&!endpoint.password&&!endpoint.port&&!endpoint.search&&!endpoint.hash&&endpoint.pathname==='/'&&Boolean(env.SUPABASE_SERVICE_ROLE_KEY),'fixed database HTTPS/service key required')
 const dir=`mfa-nl-reviewed-${mode}`;requireNl(!existsSync(dir),'fresh artifact output required');mkdirSync(dir)
 const write=(name,body)=>writeFileSync(join(dir,name),body)
 const rpc=async(name,args)=>{
  let response
  try{response=await fetch(new URL(`/rest/v1/rpc/${name}`,endpoint),{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(200000)})}catch{throw Error(`MFA NL route: RPC ${name} transport ambiguous; read receipt before retrying writes`)}
  requireNl(response.ok,`native RPC ${name} HTTP${response.status}; read receipt before retrying writes`)
  const bytes=Buffer.from(await response.arrayBuffer());requireNl(bytes.length<=64*1024*1024,'native RPC response too large');return JSON.parse(bytes)
 }
 const model=await import('./mfa-nl-source-model.mjs')
 let replayCache
 const runCommands=async(commands,source)=>{
  requireNl(!replayCache,'one fixed replay/pricing sequence per job required')
  replayCache=prepareNlReplayCache(source)
  const childEnv={...env,NODE_OPTIONS:'',MFA_NL_SEALED_CACHE:replayCache.sealed,MFA_NL_LEAGUE:league,MFA_NL_READ_LOG:resolve(dir,'sealed-reads.jsonl')}
  for(const command of commands){await assertMain();execFileSync(process.execPath,['--import',fileURLToPath(new URL('./mfa-nl-offline-guard.mjs',import.meta.url)),...command],{env:childEnv,stdio:'inherit',timeout:45*60*1000})}
 }

 const deps={assertMain,policy:getHistoricalStatisticsPolicy,rpc,write,source:authenticateNlSource,derive:model.deriveNlSourceModel,verifyContract:model.verifyNlSourceContract,verifyFootball:model.verifyNlNativeFootball,verifyOpening:model.verifyNlOpening,
  prepared:async expected=>{const artifact=githubJson(`actions/artifacts/${expected.artifactId}`),run=githubJson(`actions/runs/${expected.runId}`);verifyNlPreparedArtifactIdentity({expected,artifact,run});const bytes=github(`actions/artifacts/${expected.artifactId}/zip`,true);requireNl(bytes.length===artifact.size_in_bytes,'actual prepare ZIP size differs');return readNlPreparedArchive(bytes,expected.digest)},
  promoteCache:async()=>{requireNl(replayCache,'verified ordinary replay required');replayCache.promote()},importSource:(slug,source)=>runCommands(nlReplayCommands(slug),source),price:(slug,source)=>runCommands(nlPricingCommands(slug),source),smoke:options=>runMfaRegistrationSmoke(endpoint,env,options)}
 try{
  const manifest=await runNlReviewedStage({mode,league,commit,runId:env.GITHUB_RUN_ID,contractSha:env.CONTRACT_SHA256,beforeSha:env.BEFORE_SHA256,previewSha:env.PREVIEW_SHA256,prepareArtifact:{runId:env.PREPARE_RUN_ID,artifactId:env.PREPARE_ARTIFACT_ID,digest:env.PREPARE_ARTIFACT_DIGEST}},deps)
  console.log(JSON.stringify({mode,league,mainCommit:commit,contractSha256:manifest.contractSha256,beforeSha256:manifest.beforeSha256,previewSha256:manifest.result?.previewSha256,active:manifest.result?.active??false}))
 }catch(error){write('failure.json',JSON.stringify({complete:false,mode,league,mainCommit:commit,runId:env.GITHUB_RUN_ID,error:String(error.message),readReceiptBeforeRetry:true},null,2)+'\n');throw error}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await cli()
