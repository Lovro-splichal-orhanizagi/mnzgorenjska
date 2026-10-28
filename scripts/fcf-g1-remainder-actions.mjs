// Explicit source-only G1 route. Production entry uses real GitHub GET/fetch and
// current clock; dependency parameters are the existing offline Actions harness.
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,realpathSync,lstatSync,appendFileSync} from 'node:fs'
import {join,resolve,dirname} from 'node:path'
import {readFcfG1RemainderParent,getFcfG1RemainderParent} from './fcf-g1-remainder-parent.mjs'
import * as source from './fcf-g1-remainder-source.mjs'
import {auditFcfG1QuarantineDocuments} from './fcf-g1-quarantine-audit.mjs'
import {readFcfDraftAsset} from './fcf-missing-inventory-actions.mjs'
import {snapshotFcfInventoryRuleset} from './fcf-missing-inventory-claim.mjs'
import {waitForFcfInventorySourceSlot} from './fcf-inventory-source-coordination.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {inventoryFail as fail,exactKeys,jsonBytes,rawSha256,nativeId,commitId,verifyInventoryExecution,readInventoryZip} from './fcf-missing-inventory-artifact.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',repo=`repos/${repository}/`,workflow='.github/workflows/uvoz-fcf-zgodovina.yml',preset=source.FCF_G1_REMAINDER_PROTOCOL,frozenName='.fcf-g1-frozen-parent'
const normalize=x=>x?.startsWith('sha256:')?x:'sha256:'+x
function safeRead(path){if(realpathSync(path)!==path||!lstatSync(path).isFile()||lstatSync(path).size>8388608)fail('safe bounded G1 input required');const a=lstatSync(path),b=readFileSync(path),z=lstatSync(path);if(['dev','ino','size','mtimeMs','ctimeMs'].some(k=>a[k]!==z[k]))fail('G1 input changed');return b}
function write(path,value){if(realpathSync(dirname(path))!==dirname(path))fail('canonical exclusive G1 output parent required');const b=Buffer.from(JSON.stringify(value,null,2)+'\n');if(b.length>8388608)fail('G1 output bound exceeded');writeFileSync(path,b,{flag:'wx',mode:0o600});return rawSha256(b)}
function flags(args){const f={};for(let i=0;i<args.length;i+=2){if(!/^--[a-z-]+$/.test(args[i])||typeof args[i+1]!=='string'||Object.hasOwn(f,args[i].slice(2)))fail('closed G1 flags required');f[args[i].slice(2)]=args[i+1]}return f}
function output(env,value){if(env.GITHUB_OUTPUT)for(const [k,v]of Object.entries(value)){if(!/^[a-z_]+$/.test(k)||!/^[-a-zA-Z0-9_./:]+$/.test(String(v)))fail('safe G1 Actions output required');appendFileSync(env.GITHUB_OUTPUT,`${k}=${v}\n`)}}
async function pages(github,path,key){const out=[];let total=null;for(let p=1;p<=100;p++){const x=await github(repo+path+`per_page=100&page=${p}`);if(!Number.isSafeInteger(x?.total_count)||x.total_count<0||x.total_count>10000||!Array.isArray(x[key])||x[key].length>100||total!==null&&x.total_count!==total)fail('complete stable G1 GitHub pagination required');total=x.total_count;out.push(...x[key]);if(new Set(out.map(v=>v.id)).size!==out.length)fail('duplicate G1 metadata identity');if(out.length===total)return out;if(out.length>total||x[key].length<100)fail('G1 GitHub page incomplete')}fail('G1 GitHub page bound')}
async function bundle(github,id){return{run:await github(repo+`actions/runs/${id}`),jobs:await pages(github,`actions/runs/${id}/attempts/1/jobs?`,'jobs')}}
function job(jobs,name){const j=jobs.filter(x=>x.name===name);if(j.length!==1||!nativeId(String(j[0].id)))fail('exact G1 actual job required');return j[0]}
async function artifact(github,expected,b){return{...b,expected,artifact:await github(repo+`actions/artifacts/${expected.artifactId}`),zipBytes:await github(repo+`actions/artifacts/${expected.artifactId}/zip`,true)}}
async function claim(plan,execution,github){const ref=await github(repo+'git/ref/'+source.fcfG1RemainderClaimRef(plan).slice(5)),commit=await github(repo+`git/commits/${ref.object.sha}`),tree=await github(repo+`git/trees/${commit.tree.sha}`),entries=tree.tree?.filter(x=>x.path==='.fcf-inventory-claim.json');if(entries?.length!==1)fail('actual G1 claim tree required');const blob=await github(repo+`git/blobs/${entries[0].sha}`),claimBytes=Buffer.from(blob.content,'base64'),ruleset=await github(repo+'rulesets/25355545');return source.readFcfG1RemainderClaim({plan,execution,ref,commit,tree,blob,claimBytes,ruleset})}
async function absent(plan,github){try{await github(repo+'git/ref/'+source.fcfG1RemainderClaimRef(plan).slice(5))}catch(error){if(error.status===404)return;throw error}fail('spent or existing remainder claim held')}
async function appendLink({data,parentProof,appendProofs,github}){
 exactKeys(data,['plan','claim','consumption','child','finalReceipt'],'G1 append source references');const plan=source.validateFcfG1RemainderPlan({plan:data.plan,parentProof,appendProofs}),execution=data.claim.execution,c=await claim(plan,execution,github),b=await bundle(github,execution.runId)
 if(b.run.status!=='completed'||!['success','failure'].includes(b.run.conclusion))fail('terminal append run required')
 const consumptionProof=source.readFcfG1RemainderConsumption({claimProof:c,...await artifact(github,data.consumption,b)}),rawProof=source.readFcfG1RemainderArtifact({plan,claimProof:c,consumptionProof,...await artifact(github,data.child,b)})
 return source.readFcfG1RemainderFinalReceipt({rawProof,...await artifact(github,data.finalReceipt,b)})
}
async function approval(bytes,sourceCommit,frozenDirectory,github){
 const a=jsonBytes(bytes,'G1 remainder approval');exactKeys(a,['schemaVersion','kind','sourceCommit','plan','parent','appendSources','rulesetId','rulesetSnapshot','mainCiRunId'],'G1 remainder approval')
 if(a.schemaVersion!==7||a.kind!=='fcf-g1-remainder-quarantine-approval'||a.sourceCommit!==sourceCommit||a.rulesetId!=='25355545'||!nativeId(a.mainCiRunId)||!Array.isArray(a.appendSources)||a.appendSources.length>217)fail('exact source-only schema7 approval required')
 exactKeys(a.parent,['source','parentRecords'],'G1 parent locators');const parentProof=await readFcfG1RemainderParent({...a.parent,frozenDirectory,github}),appendProofs=[]
 for(const data of a.appendSources)appendProofs.push(await appendLink({data,parentProof,appendProofs,github}))
 const snapshot=snapshotFcfInventoryRuleset({ruleset:a.rulesetSnapshot?.ruleset,checkedUTC:a.rulesetSnapshot?.checkedUTC});if(hash(snapshot)!==a.plan.rulesetSnapshotSha256)fail('root protected G1 snapshot differs')
 source.validateFcfG1RemainderPlan({plan:a.plan,parentProof,appendProofs});return{a,parentProof,appendProofs}
}
function actionsScope(env){if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==repository||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_RUN_ATTEMPT!=='1'||!nativeId(env.GITHUB_RUN_ID)||!commitId(env.GITHUB_SHA)||env.FCF_INVENTORY_PRESET!==preset||['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_DB_URL','SUPABASE_DB_PASSWORD','DATABASE_URL','PGPASSWORD'].some(k=>env[k]))fail('exact no-DB G1 source attempt1 required')}
function running(env,b){const r=b.run;if(String(r?.id)!==env.GITHUB_RUN_ID||r.repository?.full_name!==repository||r.path!==workflow||r.event!=='workflow_dispatch'||r.head_branch!=='main'||r.head_sha!==env.GITHUB_SHA||r.run_attempt!==1||r.status!=='in_progress'||r.conclusion!==null||[r.actor,r.triggering_actor].some(a=>a?.login!=='nejcar20'||a.id!==25134229))fail('actual root actor/main G1 source run required')}
async function readiness({a,github,root}){
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();execFileSync('git',['diff','--quiet','HEAD','--'],{cwd:root,stdio:'pipe'})
 const main=await github(repo+'commits/main'),ci=await github(repo+'actions/runs/'+a.mainCiRunId)
 if(head!==a.sourceCommit||main.sha!==head||ci.head_sha!==head||ci.path!=='.github/workflows/ci.yml'||ci.event!=='push'||ci.head_branch!=='main'||ci.repository?.full_name!==repository||ci.status!=='completed'||ci.conclusion!=='success')fail('exact clean current main/CI required')
 const response=await fetch('https://slff.eu',{redirect:'error',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(30000)});if(!response.ok)fail('served source identity unavailable');const raw=Buffer.from(await response.arrayBuffer());if(raw.length>2097152)fail('served identity bound');const matches=[...raw.toString().matchAll(/<meta\b[^>]*name=["']slff-commit["'][^>]*content=["']([a-f0-9]{40})["']/g)];if(matches.length!==1||matches[0][1]!==head)fail('served source identity differs')
}
async function history(github,parentProof){
 const parent=getFcfG1RemainderParent(parentProof),accounted=new Set(parent.sourceReferences.accountedRunIds),all=[]
 // The fixed83 anchor proves only its authenticated run IDs, never an age
 // cutoff. Every other run/attempt must obtain an actual zero witness or HOLD.
 for(const w of ['uvoz-fcf-zgodovina.yml','fcf-javni-dokazi.yml'])for(const r of await pages(github,`actions/workflows/${w}/runs?`,'workflow_runs')){
  if(accounted.has(String(r.id)))continue
  const run=await github(repo+`actions/runs/${r.id}`)
  if(!nativeId(String(r.id))||String(run?.id)!==String(r.id)||run.repository?.full_name!==repository||run.path!==`.github/workflows/${w}`||!commitId(run.head_sha)||!Number.isSafeInteger(run.run_attempt)||run.run_attempt<1||run.run_attempt>100)fail('actual FCF history run/attempt unknown; held')
  for(let attempt=1;attempt<=run.run_attempt;attempt++){const jobs=await pages(github,`actions/runs/${run.id}/attempts/${attempt}/jobs?`,'jobs');all.push({...run,observedAttempt:attempt,jobs})}
 }

 return all
}
export async function runFcfG1RemainderActions({argv,env=process.env,root=process.cwd(),github,sourceFetch=fetch,pause,clock}){
 const mode=argv?.[0]
 if(mode==='prepare-g1-remainder-approval'){
  const f=flags(argv.slice(1));exactKeys(f,['history-source','frozen-directory','source-commit','ruleset-id','main-ci-run-id','output',...(Object.hasOwn(f,'append-sources')?['append-sources']:[])],'G1 remainder preparation flags');if(f['ruleset-id']!=='25355545')fail('fixed protected ruleset required')
  const appendSources=Object.hasOwn(f,'append-sources')?jsonBytes(safeRead(resolve(f['append-sources'])),'G1 append source locators'):[];if(!Array.isArray(appendSources)||appendSources.length>217)fail('bounded ordered append sources required')
  const reference=jsonBytes(safeRead(resolve(f['history-source'])),'G1 parent references'),parent={source:reference.prior,parentRecords:reference.latest},parentProof=await readFcfG1RemainderParent({...parent,frozenDirectory:resolve(f['frozen-directory']),github}),owner=await github(repo+'rulesets/25355545'),rulesetSnapshot=snapshotFcfInventoryRuleset({ruleset:owner,checkedUTC:new Date().toISOString()}),plan=source.buildFcfG1RemainderPlan({parentProof,sourceCommit:f['source-commit'],rulesetSnapshotSha256:hash(rulesetSnapshot),appendProofs:await (async()=>{const proofs=[];for(const data of appendSources)proofs.push(await appendLink({data,parentProof,appendProofs:proofs,github}));return proofs})()}),a={schemaVersion:7,kind:'fcf-g1-remainder-quarantine-approval',sourceCommit:f['source-commit'],plan,parent,appendSources,rulesetId:'25355545',rulesetSnapshot,mainCiRunId:f['main-ci-run-id']}
  await approval(Buffer.from(JSON.stringify(a)),a.sourceCommit,resolve(f['frozen-directory']),github);await absent(plan,github);const digest=write(resolve(f.output),a);return{code:0,result:{digest:'sha256:'+digest,planSha256:plan.planSha256,claimRef:source.fcfG1RemainderClaimRef(plan)}}
 }
 if(mode==='g1-remainder-claim-template'){
  const f=flags(argv.slice(1));exactKeys(f,['approval','frozen-directory','run-id','output'],'G1 claim flags');const bytes=safeRead(resolve(f.approval)),parsed=jsonBytes(bytes,'G1 approval'),{a}=await approval(bytes,parsed.sourceCommit,resolve(f['frozen-directory']),github),claim=source.createFcfG1RemainderClaimTemplate({plan:a.plan,runId:f['run-id'],rulesetSnapshot:a.rulesetSnapshot});await absent(a.plan,github);const digest=write(resolve(f.output),claim);return{code:0,result:{claimRef:source.fcfG1RemainderClaimRef(a.plan),claimJsonSha256:digest}}
 }
 actionsScope(env);if(argv.length!==1||!['approval-stage','consume','capture','audit','receipt'].includes(mode))fail('exact G1 remainder command required')
 const b=await bundle(github,env.GITHUB_RUN_ID);running(env,b);const frozenDirectory=join(root,frozenName)
 if(mode==='approval-stage'){
  const j=job(b.jobs,'missing-inventory-approval'),step=j.steps?.filter(x=>x.name==='Stage reviewed FCF inventory approval');if(env.GITHUB_JOB!=='missing-inventory-approval'||j.status!=='in_progress'||step?.length!==1||step[0].status!=='in_progress')fail('actual G1 approval step required')
  const bytes=await readFcfDraftAsset({id:env.FCF_INVENTORY_ASSET_ID,digest:normalize(env.FCF_INVENTORY_ASSET_SHA),github,maximumBytes:8388608});await approval(bytes,env.GITHUB_SHA,frozenDirectory,github);mkdirSync(join(root,'fcf-inventory-approval'),{mode:0o700});writeFileSync(join(root,'fcf-inventory-approval','manifest.json'),bytes,{flag:'wx',mode:0o600});output(env,{evidence_ready:'true',manifest_sha:rawSha256(bytes)});return{code:0}
 }
 const expected={runId:env.GITHUB_RUN_ID,runAttempt:'1',sourceCommit:env.GITHUB_SHA,jobId:String(job(b.jobs,'missing-inventory-approval').id),artifactId:env.FCF_APPROVAL_ID,artifactDigest:normalize(env.FCF_APPROVAL_DIGEST),manifestSha256:env.FCF_APPROVAL_MANIFEST_SHA,name:`fcf-inventory-approval-${env.GITHUB_RUN_ID}-1`},input=await artifact(github,expected,b)
 verifyInventoryExecution({...input,jobName:'missing-inventory-approval',stepNames:['Stage reviewed FCF inventory approval','Retain reviewed FCF inventory approval'],artifactName:expected.name,runPhase:'inventory-record'})
 const files=readInventoryZip({...input,members:{'manifest.json':8388608}}),bytes=files.get('manifest.json');if('sha256:'+rawSha256(bytes)!==normalize(env.FCF_INVENTORY_ASSET_SHA))fail('actual root approval SHA differs')
 const ctx=await approval(bytes,env.GITHUB_SHA,frozenDirectory,github),{a,parentProof}=ctx,execution={repository,workflow,ref:'refs/heads/main',sourceCommit:a.sourceCommit,runId:env.GITHUB_RUN_ID,runAttempt:'1'}
 let claimProof
 if(mode==='consume'){const begin=Date.now();for(;;){try{claimProof=await claim(a.plan,execution,github);break}catch(error){if(error.status!==404||Date.now()-begin>=300*60000)throw error;await new Promise(r=>setTimeout(r,30000))}}}else claimProof=await claim(a.plan,execution,github)
 if(mode==='consume'){if(env.GITHUB_JOB!=='missing-inventory-consume'||job(b.jobs,'missing-inventory-consume').status!=='in_progress')fail('actual consume job required');const m=source.fcfG1RemainderConsumptionManifest({claimProof,jobId:String(job(b.jobs,'missing-inventory-consume').id)}),dir=join(root,'fcf-inventory-consumption');mkdirSync(dir,{mode:0o700});const sha=write(join(dir,'manifest.json'),m);output(env,{evidence_ready:'true',manifest_sha:sha,plan_sha:a.plan.planSha256});return{code:0}}
 const consumeExpected={runId:execution.runId,runAttempt:'1',sourceCommit:a.sourceCommit,jobId:String(job(b.jobs,'missing-inventory-consume').id),artifactId:env.FCF_CONSUMPTION_ID,artifactDigest:normalize(env.FCF_CONSUMPTION_DIGEST),manifestSha256:env.FCF_CONSUMPTION_MANIFEST_SHA,name:`fcf-inventory-consumption-${execution.runId}-1`},consumptionProof=source.readFcfG1RemainderConsumption({claimProof,...await artifact(github,consumeExpected,b)})
 if(mode==='capture'){
  if(env.GITHUB_JOB!=='missing-inventory-g1'||env.FCF_INVENTORY_TARGET!=='es-ct-segona-g1')fail('fixed G1 capture only')
  const sourceSlotProof=await waitForFcfInventorySourceSlot({execution:{...execution,startedUTC:b.run.run_started_at??b.run.created_at},listRuns:async(w,p)=>github(repo+`actions/workflows/${w}/runs?per_page=100&page=${p}`),listJobs:async(id,p)=>github(repo+`actions/runs/${id}/jobs?per_page=100&page=${p}`)})
  await readiness({a,github,root});await claim(a.plan,execution,github);const actual=await bundle(github,execution.runId);running(env,actual)
  const runningProof=source.readFcfG1RemainderRunningExecution({claimProof,consumptionProof,...actual,history:await history(github,parentProof)}),recheckExecution=async()=>{await readiness({a,github,root});await claim(a.plan,execution,github);const b=await bundle(github,execution.runId);running(env,b);source.readFcfG1RemainderRunningExecution({claimProof,consumptionProof,...b,history:await history(github,parentProof)})},result=await source.collectFcfG1Remainder({plan:a.plan,consumptionProof,runningProof,sourceSlotProof,root,request:sourceFetch,recheckExecution,...(pause?{pause}:{}),...(clock?{clock}:{})});output(env,{evidence_ready:'true',status:result.status,manifest_sha:result.manifestSHA});return{code:result.status==='inventory-complete'?0:1}
 }
 const prefix=mode==='audit'?'CURRENT':'G1',diagnostic=mode==='receipt'&&Boolean(env.FCF_G1_DIAGNOSTIC_ID),id=env[`FCF_${prefix}_${diagnostic?'DIAGNOSTIC':'INVENTORY'}_ID`],digest=env[`FCF_${prefix}_${diagnostic?'DIAGNOSTIC':'INVENTORY'}_DIGEST`]
 const childExpected={runId:execution.runId,runAttempt:'1',sourceCommit:a.sourceCommit,jobId:String(job(b.jobs,'missing-inventory-g1').id),artifactId:id,artifactDigest:normalize(digest),manifestSha256:env[`FCF_${prefix}_MANIFEST_SHA`],name:`fcf-missing-inventory-${diagnostic?'diagnostic-':''}es-ct-segona-g1-${execution.runId}-1`}
 try{
  const rawProof=source.readFcfG1RemainderArtifact({plan:a.plan,claimProof,consumptionProof,...await artifact(github,childExpected,b)}),m=mode==='audit'?auditFcfG1QuarantineDocuments({documents:source.getFcfG1RemainderRawData(rawProof).documents}):source.buildFcfG1RemainderFinalReceipt({rawProof}),dir=join(root,mode==='audit'?'fcf-inventory-audit-es-ct-segona-g1':'fcf-inventory-final');mkdirSync(dir,{mode:0o700});const sha=write(join(dir,'manifest.json'),m);output(env,{evidence_ready:'true',manifest_sha:sha});return{code:0}
 }catch(error){if(mode!=='receipt')throw error;const dir=join(root,'fcf-inventory-final');mkdirSync(dir,{mode:0o700});const sha=write(join(dir,'manifest.json'),{schemaVersion:1,kind:'fcf-g1-remainder-final-receipt-diagnostic',status:'UNKNOWN',priorSourceGETs:a.plan.priorSourceGETs,newSourceGETs:null,actualSourceGETs:null,maximumCumulativeSourceGETs:478,admissible:false,nativeAdmission:false,activationEligible:false});output(env,{evidence_ready:'true',manifest_sha:sha});return{code:0}}
}
