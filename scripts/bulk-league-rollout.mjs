// Collect all selected sources first. Only replayed complete packs reach native writes.
import {isBadenCompositionCandidate,loadBadenHostedComposition,loadBadenLaunchPack} from './bulk-baden-native.mjs'
import {prepareFussballNativeHistory} from './prepare-fussball-native-history.mjs'
import {createHash} from 'node:crypto'
import {readFileSync,existsSync,mkdirSync,appendFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn,execFileSync} from 'node:child_process'
import {atomicCheckpoint,assertBatchExecution,createBatchTransport} from './provider-league-batch.mjs'
import {runBatch} from './vklopi-obstojece-lige.mjs'
import {createBulkSourceBudget} from './bulk-source-budget.mjs'
import {isFussballCommunityCandidate,FUSSBALL_COMMUNITY_SOURCE_POLICY} from './fussball-community-policy.mjs'
import {assertReviewedFussballCommunityCandidate,inspectFussballCommunityReadiness,buildFussballCardAdmission} from './fussball-community-release.mjs'
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const hold=(message,code='LEAGUE_DATA_HOLD')=>Object.assign(Error(message),{dataHold:true,reason_code:code})
const sameTuple=(a,b)=>['slug','source','source_league_code'].every(k=>a?.[k]===b?.[k])&&(!a.id||a.id===b.id)
function selection(candidates){
 if(!Array.isArray(candidates)||!candidates.length||candidates.length>500||new Set(candidates.map(c=>c.slug)).size!==candidates.length||candidates.some(c=>! /^[a-z]{2}-[a-z0-9-]+$/.test(c.slug??'')))throw Error('Expected 1–500 distinct catalog candidates.')
 const archiveOwners=new Map()
 for(const c of candidates)for(const a of c.archives??[]){const key=c.source+'|'+a.code;if(archiveOwners.has(key))throw Error('Shared archive ownership requires separate review.');archiveOwners.set(key,c.slug)}
}
export async function collectBulkBatch({candidates,expectedSha,directory,capture,saveAdmission=async()=>{},onCheckpoint=async()=>{}}){
 selection(candidates)
 const report={version:1,phase:'source',expected_sha:expectedSha,scope_sha256:hash(candidates),status:'RUNNING',results:[],host_stops:{},infrastructure_stop:null}
 const save=()=>onCheckpoint(structuredClone(report))
 await save()
 for(const candidate of candidates){
  const result={candidate,slug:candidate.slug,directory:join(directory,candidate.slug),status:'RUNNING'};report.results.push(result);await save()
  if(report.infrastructure_stop){result.status='SKIPPED_INFRASTRUCTURE_STOP';await save();continue}
  if(report.host_stops[candidate.host]){result.status='SKIPPED_SOURCE_STOP';result.reason=report.host_stops[candidate.host];await save();continue}
  try{
   await capture(candidate,{directory:result.directory})
   await saveAdmission(result.directory,{version:1,candidate,expected_sha:expectedSha})
   result.status='STAGED'
  }catch(error){
   result.reason=error.message;result.reason_code=error.reason_code??'UNCLASSIFIED_COLLECTION_FAILURE'
   if(error.sourceStop){result.status='SOURCE_STOP';report.host_stops[candidate.host]=error.message}
   else if(error.dataHold)result.status='HOLD'
   else {result.status='INFRASTRUCTURE_STOP';report.infrastructure_stop=error.message}
  }
  await save()
 }
 report.status=report.infrastructure_stop?'STOPPED':report.results.every(r=>r.status==='STAGED')?'STAGED':'COMPLETED_WITH_HOLDS';await save();return report
}
function requireInactive(candidate,snapshot,{allowUninstalled=false}={}){
 const community=isFussballCommunityCandidate(candidate)
 if(community)assertReviewedFussballCommunityCandidate(candidate)
 if(!sameTuple(candidate,snapshot?.competition))throw hold('Native competition identity changed.')
 if(snapshot.competition.active===true)throw hold('League already active.','ALREADY_ACTIVE')
 if(snapshot.competition.active!==false||(community?!((allowUninstalled&&snapshot.competition.source_policy===null)||snapshot.competition.source_policy===FUSSBALL_COMMUNITY_SOURCE_POLICY):snapshot.competition.source_policy!==null)||snapshot.competition.date_only_deadline_policy!==null)throw hold('Inactive league with standard policies required.')
 if(!Array.isArray(snapshot.fantasy?.teams)||!Array.isArray(snapshot.fantasy?.lineups)||snapshot.fantasy.teams.length||snapshot.fantasy.lineups.length)throw hold('Existing or unproven fantasy data prevents mutation.')
}
export async function runBulkRollout({sourceReport,expectedSha,transport,guard,runCommand,loadPack,verifyNative,activationRunner=runBatch,onCheckpoint=async()=>{},now=()=>new Date(),importOnly=false,activationOnly=false,seedCacheReceipt,runId,loadComposition=loadBadenHostedComposition,prepareComposition=prepareFussballNativeHistory,loadCompositionPack=loadBadenLaunchPack}){
 if(!sourceReport||sourceReport.expected_sha!==expectedSha||sourceReport.phase&&sourceReport.phase!=='source')throw Error('Source batch provenance differs.')
 selection(sourceReport.results.map(r=>r.candidate))
 if(typeof guard!=='function')throw Error('Exact main execution guard required.')
 const report={version:1,phase:'native',expected_sha:expectedSha,source_scope_sha256:sourceReport.scope_sha256,status:'RUNNING',results:[],infrastructure_stop:null}
 const save=()=>onCheckpoint(structuredClone(report))
 const ensureGuard=async()=>{try{await guard()}catch(error){error.dataHold=false;error.infrastructure=true;throw error}}
 await save()
 for(const staged of sourceReport.results){
  const result={slug:staged.slug,candidate:staged.candidate,status:'RUNNING',steps:[]};report.results.push(result);await save()
  if(staged.status!=='STAGED'){result.status=staged.status;result.reason=staged.reason;result.reason_code=staged.reason_code;await save();continue}
  if(report.infrastructure_stop){result.status='SKIPPED_INFRASTRUCTURE_STOP';await save();continue}
  if(activationOnly)result.steps=structuredClone(staged.steps??[])
  let candidate=staged.candidate,mutating=false
  try{
   await ensureGuard()
   // Full byte replay precedes registration or any other mutation.
   const baden=staged.profile==='germany-retained-fussball-native-v1'
   if(baden&&!isBadenCompositionCandidate(candidate))throw hold('Composition profile requires exact Baden candidate.')
   let pack
   if(baden){
    const composition=await loadComposition(staged.directory)
    if(!activationOnly){
     const receipt={stage:'history-cards-prepare',status:'RUNNING',started_at:now().toISOString()};result.steps.push(receipt);await save()
     const preparedTransport={...transport}
     for(const name of ['register','prepareFussballHistory'])preparedTransport[name]=async(...args)=>{await ensureGuard();mutating=true;const answer=await transport[name](...args);mutating=false;return answer}
     const preparation=await prepareComposition({composition,transport:preparedTransport})
     candidate={...candidate,id:preparation.competitionId};result.candidate=candidate;result.profile=staged.profile
     const competition=(await transport.snapshot(candidate)).competition
     pack=await loadCompositionPack({competition,composition,preparation,db:transport,seedDirectory:join(staged.directory,'native-seed')})
     receipt.status='COMPLETED';receipt.completed_at=now().toISOString();await save()
    }else{
     const found=await transport.find(candidate);if(!found)throw hold('Prepared Baden registration missing.')
     candidate={...candidate,id:found.id};result.candidate=candidate;result.profile=staged.profile
     pack=await loadCompositionPack({competition:(await transport.snapshot(candidate)).competition,composition,db:transport})
    }
   }else pack=await loadPack(staged.directory,{candidate,now:now(),requireFresh:true})
   if(!candidate.id){
    if(!transport.register)throw hold('Inactive registration route unavailable.','NEEDS_REGISTRATION')
    await ensureGuard();const found=await transport.find(candidate)
    if(found){candidate={...candidate,id:found.id};requireInactive(candidate,await transport.snapshot(candidate),{allowUninstalled:!activationOnly})}
    else {
     const receipt={stage:'register',status:'RUNNING',started_at:now().toISOString()};result.steps.push(receipt);await save()
     mutating=true;candidate={...candidate,id:await transport.register(candidate)};mutating=false
     receipt.status='COMPLETED';receipt.completed_at=now().toISOString();await save()
    }
    result.candidate=candidate
   }
   const community=isFussballCommunityCandidate(candidate)
   requireInactive(candidate,await transport.snapshot(candidate),{allowUninstalled:!activationOnly})
   if(community&&!baden&&!activationOnly){
    if(typeof transport.installCommunityPolicy!=='function')throw hold('Installed community policy route unavailable.')
    await ensureGuard();requireInactive(candidate,await transport.snapshot(candidate),{allowUninstalled:true})
    const receipt={stage:'community-policy',status:'RUNNING',started_at:now().toISOString()};result.steps.push(receipt);await save()
    mutating=true;const answer=await transport.installCommunityPolicy(candidate)
    if(answer?.installed!==true||answer.source_policy!==FUSSBALL_COMMUNITY_SOURCE_POLICY)throw Error('Ambiguous community policy installation response.')
    mutating=false;receipt.status='COMPLETED';receipt.completed_at=now().toISOString();await save()
   }
   const guarded=async()=>{await ensureGuard();requireInactive(candidate,await transport.snapshot(candidate))}
   const stage=async(stage,file,args)=>{
    await guarded()
    const receipt={stage,status:'RUNNING',started_at:now().toISOString()};result.steps.push(receipt);await save()
    mutating=true
    const output=await runCommand(file,args,{directory:staged.directory,candidate})
    if(output?.code!==0)throw Error(`${stage}: incomplete write (exit ${output?.code??'unknown'}); inspect native state before another run.`)
    mutating=false;receipt.status='COMPLETED';receipt.completed_at=now().toISOString();await save()
   }
   if(!activationOnly){
   for(const [i,a]of candidate.archives.entries())await stage(`archive-${i+1}`,'scripts/uvoz-zapisnikov.mjs',['--tekmovanje',candidate.slug,'--liga',a.code])
   await stage('schedule','scripts/uvoz-razporeda.mjs',['--tekmovanje',candidate.slug,'--pisi'])
   await stage('current','scripts/uvoz-zapisnikov.mjs',['--tekmovanje',candidate.slug])
   for(const [name,file]of [['keepers','lazni-vratarji'],['positions','ugani-pozicije'],['prices','ovrednoti-igralce']])await stage(name,`scripts/${file}.mjs`,['--tekmovanje',candidate.slug,'--pisi'])
   }
   await guarded()
   const snapshot=await transport.snapshot(candidate)
   const receipts={expected_sha:expectedSha,slug:candidate.slug,snapshot_sha256:hash(snapshot),steps:result.steps.filter(s=>['keepers','positions','prices'].includes(s.stage))}
   result.proof=await verifyNative({candidate,pack,snapshot,receipts,expectedSha,now:now(),directory:staged.directory,loadPack})
   if(!activationOnly&&candidate.source==='fussball-public')await stage('nightly-seed','scripts/prepare-fussball-nightly.mjs',['seed','--tekmovanje',candidate.slug,'--bulk-capture',staged.directory])
   await guarded()
   // Detect any intervening native update; source verification is tied to this exact snapshot.
   const finalSnapshot=await transport.snapshot(candidate)
   if(hash(finalSnapshot)!==hash(snapshot))throw hold('Native snapshot changed after strict source proof.')
   if(baden){result.native_check=inspectFussballCommunityReadiness({candidate,snapshot:finalSnapshot,state:await transport.state(candidate)})}
   if(importOnly){result.status='VERIFIED';result.directory=staged.directory;await save();continue}
   if(community){
    const state=await transport.state(candidate),readiness=inspectFussballCommunityReadiness({candidate,snapshot:finalSnapshot,state})
    const admission=buildFussballCardAdmission({candidate,pack,snapshot:finalSnapshot,proof:result.proof,seedCacheReceipt,expectedSha,runId,now:now()})
    await guarded();if(hash(await transport.snapshot(candidate))!==hash(finalSnapshot))throw hold('Native community snapshot changed before admission.')
    if(typeof transport.recordCommunityAdmission!=='function')throw hold('Native community admission route unavailable.')
    // Activation has not started yet; persist the service admission write first.
    const receipt={stage:'community-admission',status:'RUNNING',started_at:now().toISOString()};result.steps.push(receipt);await save();mutating=true
    const registered=await transport.recordCommunityAdmission(candidate,admission)
    if(registered?.registered!==true||registered.manifest_sha256!==admission.sha256||registered.pending_inventory_sha256!==admission.manifest.pendingInventorySha256||registered.opening_round_id!==admission.openingRound.id)throw Error('Ambiguous community admission response.')
    if(baden&&(registered.historical_policy_sha256!==result.proof.historicalPolicySha256||registered.historical_inventory_sha256!==result.proof.historicalInventorySha256))throw Error('Ambiguous composed history admission readback.')
    mutating=false;receipt.status='COMPLETED';receipt.completed_at=now().toISOString();result.community_admission={manifest:admission.manifest,sha256:admission.sha256,receipt:registered};await save()
    await guarded();const admittedSnapshot=await transport.snapshot(candidate),expectedSnapshot=structuredClone(finalSnapshot);expectedSnapshot.competition.prvi_fantasy_krog=admission.openingRound.number
    if(hash(admittedSnapshot)!==hash(expectedSnapshot))throw hold('Native community snapshot changed after admission.')
    const activationReceipt={stage:'activate',status:'RUNNING',started_at:now().toISOString()};result.steps.push(activationReceipt);await save();mutating=true
    const answer=await transport.activate(candidate)
    if(answer?.vklopljena===false){mutating=false;throw hold(answer.razlog??'Native community activation refused.')}
    result.readback=await transport.competition(candidate)
    if(answer?.vklopljena!==true||answer.razlika!==0||answer.prvi_krog!==admission.openingRound.number||result.readback?.active!==true||result.readback.prvi_fantasy_krog!==admission.openingRound.number||result.readback.source_policy!==FUSSBALL_COMMUNITY_SOURCE_POLICY)throw Error('Community activation result/readback differs; inspect persisted state.')
    if(baden&&(answer.historical_policy_sha256!==result.proof.historicalPolicySha256||answer.historical_inventory_sha256!==result.proof.historicalInventorySha256||answer.composition_proof_sha256!==result.proof.compositionProofSha256))throw Error('Composed activation history/source readback differs.')
    if(baden){const activeSnapshot=await transport.snapshot(candidate);const before=structuredClone(finalSnapshot.fussball_history),after=activeSnapshot.fussball_history;before.active=true;if(hash(after)!==hash(before))throw Error('Active Baden history/cards/source binding readback differs.')}
    mutating=false;activationReceipt.status='COMPLETED';activationReceipt.completed_at=now().toISOString();result.activation={status:'ACTIVE',first_round:admission.openingRound,...readiness,activation:answer};result.status='ACTIVE';await save();continue
   }
   const receipt={stage:'activate',status:'RUNNING',started_at:now().toISOString()};result.steps.push(receipt);await save()
   let gateError=null,activationAnswer=null
   const native={...transport}
   for(const name of ['competition','state','season','rounds','matches','fantasyData'])if(transport[name])native[name]=async(...args)=>{try{return await transport[name](...args)}catch(error){gateError=error;throw error}}
   native.activate=async c=>{mutating=true;activationAnswer=await transport.activate(c);if(activationAnswer?.vklopljena===false)mutating=false;return activationAnswer}
   const [activation]=await activationRunner({candidates:[candidate],transport:native,apply:true,now})
   result.activation=activation;result.readback=await transport.competition(candidate)
   if(gateError)throw Error('Native gate database read failed; stop all writes.')
   if(activation?.status!=='ACTIVE'||result.readback?.active!==true)throw hold(activation?.reason??'Native activation refused.','NATIVE_READINESS_HOLD')
   mutating=false
   receipt.status='COMPLETED';receipt.completed_at=now().toISOString();result.status='ACTIVE'
  }catch(error){
   if(error.writeNotStarted===true){mutating=false;const running=result.steps.findLast(s=>s.status==='RUNNING');if(running)running.status=error.dataHold?'HOLD':'FAILED'}
   result.reason=error.message;result.reason_code=error.reason_code??'INFRASTRUCTURE_STOP'
   if(mutating){result.status='UNKNOWN';report.infrastructure_stop='Ambiguous native write; no automatic replay.';const running=result.steps.findLast(s=>s.status==='RUNNING');if(running)running.status='UNKNOWN';try{result.readback=await transport.competition(candidate)}catch{result.readback_error='Readback unavailable.'}}
   else if(error.dataHold)result.status=error.reason_code==='ALREADY_ACTIVE'?'SKIPPED_ACTIVE':'HOLD'
   else {result.status='INFRASTRUCTURE_STOP';report.infrastructure_stop=error.message}
  }
  await save()
 }
 report.status=report.infrastructure_stop?'STOPPED':report.results.every(r=>['ACTIVE','SKIPPED_ACTIVE'].includes(r.status))?'ACTIVE':importOnly&&report.results.every(r=>r.status==='VERIFIED')?'VERIFIED':'COMPLETED_WITH_HOLDS';await save();return report
}

export function runOfflineImport(file,args,{directory,logDirectory,slug}={}){
 const allowed=new Set(['uvoz-zapisnikov','uvoz-razporeda','lazni-vratarji','ugani-pozicije','ovrednoti-igralce','prepare-fussball-nightly'].map(n=>`scripts/${n}.mjs`))
 if(!allowed.has(file))throw Error('Unreviewed native child command.')
 return new Promise((resolvePromise,reject)=>{
  const child=spawn(process.execPath,['--import',resolve('scripts/bulk-offline-network.mjs'),file,...args],{env:{...process.env,SLFF_BULK_CAPTURE:resolve(directory)},stdio:['ignore','pipe','pipe'],timeout:45*60_000})
  if(logDirectory)mkdirSync(logDirectory,{recursive:true})
  const logPath=logDirectory?join(logDirectory,`${slug}-${file.split('/').at(-1)}-${Date.now()}.log`):null
  const output=(stream,b)=>{stream.write(b);if(logPath)appendFileSync(logPath,b)}
  child.stdout.on('data',b=>output(process.stdout,b));child.stderr.on('data',b=>output(process.stderr,b))
  child.once('error',reject);child.once('close',(code,signal)=>{
   signal?reject(Error('Native child interrupted.')):resolvePromise({code})
  })
 })
}

async function main(){
 const [mode,...args]=process.argv.slice(2),options={output:'release/pl-de-bulk'}
 for(let i=0;i<args.length;i+=2){const k=args[i],v=args[i+1];if(!['--country','--expected-sha','--max-requests','--output','--candidate'].includes(k)||!v||options[k])throw Error('Invalid bulk arguments.');options[k]=v}
 if(!['collect','import','activate'].includes(mode)||!['PL','DE','ALL'].includes(options['--country'])||!/^[a-f0-9]{40}$/.test(options['--expected-sha']??''))throw Error('collect|import|activate, country and exact current main SHA required.')
 const expectedSha=options['--expected-sha'],directory=resolve(options['--output']??options.output),sha=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
 const guard=async()=>assertBatchExecution({expectedSha,headSha:sha(),mainSha:execFileSync('git',['ls-remote','--exit-code','origin','refs/heads/main'],{encoding:'utf8',timeout:30000}).split(/\s/)[0],envFileExists:existsSync('.env')})
 const {selectBulkCandidates,captureBulkCandidate,saveBulkAdmission,loadBulkPack}=await import('./bulk-source-packs.mjs')
 if(mode==='collect'&&options['--candidate'])throw Error('Paired candidates must be staged from an admitted audit, never recollected by this option.')
 const candidates=selectBulkCandidates(options['--country'],options['--candidate']);selection(candidates)
 mkdirSync(directory,{recursive:true})
 if(mode==='collect'){
  if(existsSync(join(directory,'source-report.json')))throw Error('Existing collection checkpoint; automatic replay forbidden.')
  // Collection has no database credential requirement and never invokes native writers.
  if(sha()!==expectedSha||process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REF!=='refs/heads/main'||process.env.GITHUB_SHA!==expectedSha||process.env.GITHUB_RUN_ATTEMPT!=='1'||process.env.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||! /^[1-9]\d*$/.test(process.env.GITHUB_RUN_ID??'')||existsSync('.env'))throw Error('Source collection requires first exact-main Actions attempt.')
  if(execFileSync('git',['ls-remote','--exit-code','origin','refs/heads/main'],{encoding:'utf8',timeout:30000}).split(/\s/)[0]!==expectedSha)throw Error('Main changed before source collection.')
  const maxRequests=Number(options['--max-requests']);if(!Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>4000)throw Error('Explicit per-host source cap 1–4000 required.')
  const limits=Object.fromEntries(candidates.map(c=>[c.host,maxRequests]))
  const budget=createBulkSourceBudget({limits,onCheckpoint:s=>atomicCheckpoint(join(directory,'source-budget.json'),s)})
  atomicCheckpoint(join(directory,'source-budget.json'),budget.snapshot())
  const report=await collectBulkBatch({candidates,expectedSha,directory:join(directory,'packs'),capture:(c,o)=>captureBulkCandidate(c,{...o,maxRequests,fetch:budget.fetch,now:new Date()}),saveAdmission:saveBulkAdmission,onCheckpoint:r=>atomicCheckpoint(join(directory,'source-report.json'),r)})
  console.log(JSON.stringify({phase:'source',status:report.status,counts:counts(report)}));if(report.status==='STOPPED')process.exitCode=1
 }else{
  const reportName=mode==='import'?'native-import-report.json':'native-report.json'
  if(existsSync(join(directory,reportName)))throw Error('Existing native checkpoint; automatic write replay forbidden.')
  await guard()
  const report=JSON.parse(readFileSync(join(directory,'source-report.json'),'utf8'))
  if(report.scope_sha256!==hash(candidates)||report.results.length!==candidates.length||report.results.some((r,i)=>hash(r.candidate)!==hash(candidates[i])||r.slug!==r.candidate.slug||resolve(r.directory)!==join(directory,'packs',r.slug)))throw Error('Collected catalog or pack directory scope differs.')
  const {loadAndVerifyBulkNative}=await import('./bulk-native-proof.mjs')
  const {createBulkTransport}=await import('./bulk-native-transport.mjs')
  const transport=createBulkTransport({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY,base:createBatchTransport({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY})})
  let selected=report,seedCacheReceipt
  if(mode==='activate'){
   const prepared=JSON.parse(readFileSync(join(directory,'native-import-report.json'),'utf8'))
   if(prepared.expected_sha!==expectedSha||prepared.source_scope_sha256!==report.scope_sha256||['RUNNING','STOPPED'].includes(prepared.status)||prepared.infrastructure_stop||prepared.results?.length!==report.results.length)throw Error('Incomplete or changed native preparation receipt.')
   for(let i=0;i<prepared.results.length;i++){const row=prepared.results[i],original=report.results[i].candidate,scope={...row.candidate};if(!original.id)delete scope.id;if(hash(scope)!==hash(original)||row.slug!==original.slug||row.status==='VERIFIED'&&resolve(row.directory)!==join(directory,'packs',row.slug))throw Error('Prepared candidate or directory changed.')}
   if(prepared.results.some(r=>r.status==='VERIFIED'&&r.candidate.source==='fussball-public')){
    const persisted=JSON.parse(readFileSync(join(directory,'seed-cache-receipt.json'),'utf8'));seedCacheReceipt=persisted
    if(persisted.expected_sha!==expectedSha||persisted.run_id!==process.env.GITHUB_RUN_ID||persisted.persisted!==true)throw Error('Verified nightly seed cache was not persisted before activation.')
   }
   selected={...report,results:prepared.results.map(r=>({...r,status:r.status==='VERIFIED'?'STAGED':r.status}))}
  }
  const result=await runBulkRollout({sourceReport:selected,importOnly:mode==='import',activationOnly:mode==='activate',seedCacheReceipt,runId:process.env.GITHUB_RUN_ID,expectedSha,transport,guard,loadPack:loadBulkPack,verifyNative:loadAndVerifyBulkNative,runCommand:(file,args,o)=>runOfflineImport(file,args,{...o,slug:o.candidate.slug,logDirectory:join(directory,'logs')}),onCheckpoint:r=>atomicCheckpoint(join(directory,reportName),r)})
  if(mode==='import'&&process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'needs_seed_cache='+String(result.results.some(r=>r.status==='VERIFIED'&&r.candidate.source==='fussball-public'))+'\n')
  console.log(JSON.stringify({phase:mode,status:result.status,counts:counts(result)}));if(result.status==='STOPPED')process.exitCode=1
 }
}
function counts(report){return report.results.reduce((v,r)=>(v[r.status]=(v[r.status]??0)+1,v),{})}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(`::error::${e.message}`);process.exitCode=1})
