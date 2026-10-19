import {readFcfSixAccounting} from './fcf-six-accounting.mjs'
import {readFcfSixCleanupOriginals,readFcfSixCleanupEvidence} from './fcf-six-cleanup-evidence.mjs'
import {FCF_SIX_SOURCE_POLICY,fcfSixPolicyIdHashes} from './fcf-six-historical-policy.mjs'
// Actions-only, source-closed writer control plane. GitHub requests are GET only.
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,appendFileSync,existsSync,mkdtempSync,rmSync,realpathSync,lstatSync} from 'node:fs'
import {join,resolve,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {readFcfDraftAsset} from './fcf-missing-inventory-actions.mjs'
import {readFcfCapturedTargetEvidence,getFcfCapturedTargetData,readFcfCleanupEvidence} from './fcf-target-evidence.mjs'
import {readFcfCleanupOriginalStage,readFcfTargetApprovalArtifact,readFcfTargetStageArtifact,fcfTargetStageContract,describeFcfCleanupOriginals} from './fcf-target-stage-evidence.mjs'
import {deriveFcfTargetNativeMapping} from './fcf-target-native-adapter.mjs'
import {verifyFcfNativeMappingProposal} from './fcf-target-native-plan.mjs'
import {compileFcfTargetReleasePacket,validateFcfTargetReleaseInventory} from './fcf-target-release.mjs'
import {buildFcfTargetRollout,replayFcfTargetRollout,advanceFcfTargetRollout} from './fcf-target-rollout.mjs'
import {createFcfTargetDatabase} from './fcf-target-db.mjs'
import {buildFcfTargetReadiness} from './fcf-target-readiness.mjs'
import {fcfTargetPricingModelSha256} from './fcf-target-pricing-model.mjs'
import {encodeFcfTargetWire} from './fcf-target-child-offline.mjs'
import {imeHash,regHash} from './anonimizacija.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-fcf-zgodovina.yml',repo=`repos/${repository}/`,sha=x=>createHash('sha256').update(x).digest('hex')
const fail=m=>{throw Error(`FCF_WRITER: ${m}`)},id=x=>typeof x==='string'&&/^[1-9]\d*$/.test(x),same=(a,b)=>hash(a)===hash(b),digest=x=>x?.startsWith('sha256:')?x:'sha256:'+x
const modes=['mapping','cleanup-prepare','cleanup-apply','import','price','check','activate','recover']
const runtime=['scripts/lib/historical-statistics-import.mjs','scripts/viri/index.mjs','scripts/fcf-six-accounting.mjs','scripts/fcf-six-approval.mjs','scripts/fcf-six-continuation-plan.mjs','scripts/fcf-six-historical-policy.mjs','scripts/fcf-six-source-proof.mjs','scripts/fcf-six-cleanup-evidence.mjs','scripts/viri/fcf-six-historical.mjs','scripts/policies/fcf-six-reviewed-exclusions.json','supabase/migrations/20261019150000_fcf_six_reviewed_native.sql','scripts/viri/fcf.mjs','scripts/viri/hlf.mjs','scripts/viri/frf.mjs','scripts/viri/fcf-calonge-pair.mjs','scripts/klubi.mjs','scripts/anonimizacija.mjs','scripts/dfb-artifacts.mjs','scripts/fcf-final-audit.mjs','scripts/lib/historical-statistics-policy.mjs','scripts/policies/historical-statistics-exclusions.json','scripts/policies/historical-statistics-club-bindings.json','scripts/vzorci/fcf-reviewed-history/receipts.json','scripts/fcf-held-parent-accounting.mjs','scripts/fcf-g9-held-parent-plan.mjs','scripts/fcf-inventory-source-protocol.mjs','scripts/fcf-inventory-source-wire.mjs','scripts/fcf-g9-held-parent-approval.mjs','scripts/fcf-missing-inventory-plan.mjs','scripts/fcf-missing-inventory-artifact.mjs','scripts/fcf-missing-inventory-claim.mjs','scripts/fcf-missing-inventory-capture.mjs','scripts/fcf-missing-inventory-evidence.mjs','scripts/fcf-missing-inventory-actions.mjs','scripts/fcf-inventory-source-coordination.mjs','scripts/fcf-historical-release.mjs','scripts/fcf-historical-policy.mjs','scripts/fcf-current-source-proof.mjs','.github/workflows/uvoz-fcf-zgodovina.yml','scripts/fcf-target-release.mjs','scripts/fcf-target-evidence.mjs','scripts/fcf-target-actions.mjs','scripts/uvozi-fcf-cilj.mjs','scripts/fcf-target-db.mjs','scripts/fcf-target-rollout.mjs','scripts/fcf-target-native-plan.mjs','scripts/fcf-target-native-adapter.mjs','scripts/fcf-target-stage-evidence.mjs','scripts/fcf-target-readiness.mjs','scripts/fcf-target-offline.mjs','scripts/fcf-target-child-offline.mjs','scripts/fcf-target-preload.mjs','scripts/fcf-target-pricing-model.mjs','scripts/ovrednoti-igralce.mjs','scripts/ugani-pozicije.mjs','scripts/lazni-vratarji.mjs','scripts/visja-liga.mjs','scripts/strani.mjs','scripts/tekmovanje.mjs','scripts/prenos.mjs','supabase/migrations/20261018232000_fcf_current_target_release.sql']
export function fcfTargetWriterHashes(root=process.cwd()){return Object.fromEntries(runtime.map(f=>[f,sha(readFileSync(join(root,f)))]))}
/** Source-free local packer. The Actions staging job authenticates its raw digest. */
export function packFcfTargetOriginals({originalsDir,output,now=Date.now()}){
 if(!originalsDir||realpathSync(originalsDir)!==originalsDir||!lstatSync(originalsDir).isDirectory()||resolve(output)!==output||realpathSync(dirname(output))!==dirname(output)||existsSync(output))fail('exact original directory and new canonical ZIP output required')
 const receipts=JSON.parse(readFileSync(new URL('./vzorci/fcf-reviewed-history/receipts.json',import.meta.url))),originals=new Map(['4109388','4116215','4118352','4118358'].map(n=>{const path=join(originalsDir,receipts.find(r=>r.sourceMatchId===n).captureFile);if(realpathSync(path)!==path||!lstatSync(path).isFile()||lstatSync(path).size>2*1024*1024)fail('regular original bytes required');return[n,readFileSync(path)]}))
 describeFcfCleanupOriginals({originals,now});const temporary=realpathSync(mkdtempSync(join(tmpdir(),'fcf-original-pack-')))
 try{for(const[n,b]of originals)writeFileSync(join(temporary,`acta-${n}.html`),b,{flag:'wx',mode:0o600});execFileSync('python3',['-c',`import sys,zipfile,os\nwith zipfile.ZipFile(sys.argv[2],'x',compression=zipfile.ZIP_DEFLATED) as z:\n for n in sorted(os.listdir(sys.argv[1])): z.write(os.path.join(sys.argv[1],n),n)`,temporary,output],{timeout:30000,maxBuffer:100000,stdio:['ignore','pipe','pipe']});const bytes=readFileSync(output);return{output,sha256:sha(bytes),bytes:bytes.length}}
 finally{rmSync(temporary,{recursive:true,force:true})}
}
export async function githubGet(path,binary=false,execute=execFileSync){if(!path.startsWith(repo)||path.includes('..')||/[\s#]/.test(path))fail('fixed repository GET path required');try{return binary?execute('gh',['api','--method','GET',path,'-H',path.startsWith(repo+'releases/assets/')?'Accept: application/octet-stream':'Accept: application/vnd.github+json'],{maxBuffer:100*1024*1024,timeout:60000,stdio:['ignore','pipe','pipe']}):JSON.parse(execute('gh',['api','--method','GET',path],{maxBuffer:8*1024*1024,timeout:60000,stdio:['ignore','pipe','pipe']}))}catch{fail('authenticated GitHub GET failed')}}
async function jobs(github,run,attempt){const out=[];for(let page=1;page<=100;page++){const r=await github(repo+`actions/runs/${run}/attempts/${attempt}/jobs?per_page=100&page=${page}`);if(!Number.isSafeInteger(r.total_count)||!Array.isArray(r.jobs))fail('actual jobs unavailable');out.push(...r.jobs);if(out.length===r.total_count)return out;if(r.jobs.length<100||out.length>r.total_count)fail('incomplete job pagination')}fail('job pagination bound')}
async function record(github,e){if(!e||!id(e.runId)||!id(e.runAttempt)||!id(e.artifactId))fail('explicit artifact/run pins required');const [artifact,run,js,zipBytes]=await Promise.all([github(repo+`actions/artifacts/${e.artifactId}`),github(repo+`actions/runs/${e.runId}`),jobs(github,e.runId,e.runAttempt),github(repo+`actions/artifacts/${e.artifactId}/zip`,true)]);return{zipBytes,metadata:{artifact,run,jobs:js},artifact,run,jobs:js,expected:e}}
import {readFcfInventorySourceWire} from './fcf-inventory-source-wire.mjs'
export async function readFcfTargetSourceWire({source,github=githubGet,now=Date.now()}){
 if(['g9-only-after-held-parent-v1','six-reviewed-continuation-v1'].includes(source?.protocol))return readFcfInventorySourceWire({source,github,now})
 if(!source||Object.keys(source).sort().join(',')!=='children,claim,consumption,finalReceipt,plan'||!Array.isArray(source.children)||source.children.length!==2)fail('closed actual source evidence references required')
 const e=source.claim?.expected,execution=source.claim?.execution
 if(!e||!id(e.rulesetId)||!/^[a-f0-9]{64}$/.test(source.plan?.planSha256??''))fail('original protected source claim pins required')
 const ref=await github(repo+`git/ref/tags/fcf-inventory-claim/${source.plan.planSha256}`),commit=await github(repo+`git/commits/${ref.object.sha}`),tree=await github(repo+`git/trees/${commit.tree.sha}`),entries=tree.tree?.filter(x=>x.path==='.fcf-inventory-claim.json')
 if(entries?.length!==1)fail('exact protected source claim tree required')
 const blob=await github(repo+`git/blobs/${entries[0].sha}`),ruleset=await github(repo+`rulesets/${e.rulesetId}`),claim={execution,ref,claimCommit:{commit,tree,blob},claimBytes:Buffer.from(blob.content,'base64'),rulesets:[ruleset],expected:e}
 const consumption=await record(github,source.consumption),finalReceipt=await record(github,source.finalReceipt),children=[]
 const bundle=r=>({zipBytes:r.zipBytes,artifact:r.artifact,run:r.run,jobs:r.jobs,expected:r.expected})
 for(const c of source.children){let unstarted=null;if(c.unstarted){const x=c.unstarted;if(!id(x.runId)||!id(x.runAttempt))fail('actual skipped-child run pins required');unstarted={run:await github(repo+`actions/runs/${x.runId}`),jobs:await jobs(github,x.runId,x.runAttempt),expected:x.expected}}
  children.push({targetSlug:c.targetSlug,inventory:c.inventory?bundle(await record(github,c.inventory)):null,audit:c.audit?bundle(await record(github,c.audit)):null,unstarted})}
 return{plan:source.plan,claim,consumption:bundle(consumption),children,finalReceipt:bundle(finalReceipt),now}
}
function environment(env){if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==repository||env.GITHUB_REF!=='refs/heads/main'||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')||!id(env.GITHUB_RUN_ID)||!id(env.GITHUB_RUN_ATTEMPT))fail('actual main Actions execution required');return{repository,ref:env.GITHUB_REF,commit:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT}}
function output(env,values){if(!env.GITHUB_OUTPUT)return;for(const[k,v]of Object.entries(values)){if(!/^[a-z_]+$/.test(k)||!/^[-a-zA-Z0-9_./:]+$/.test(String(v)))fail('unsafe output');appendFileSync(env.GITHUB_OUTPUT,`${k}=${v}\n`)}}
function directory(root,name){const d=join(root,name);if(existsSync(d))fail('preexisting stage output refused');mkdirSync(d,{mode:0o700});return d}
function json(path,value){const text=JSON.stringify(value,null,2)+'\n';writeFileSync(path,text,{mode:0o600,flag:'wx'});return sha(text)}
function policyHashes(six=false){if(six)return fcfSixPolicyIdHashes();return Object.fromEntries(['es-ct-segona-g1','es-ct-tercera-g2','es-ct-tercera-g9'].map(slug=>{const p=getHistoricalStatisticsPolicy(slug);return[p.id,hash(p)]}))}
function closedApproval(a,{env,mode,root}){
 if(!a||Object.keys(a).sort().join(',')!=='cleanup,kind,mapping,modelSha256,originals,previous,runtimeHashes,schemaVersion,source,sourceCommit,stage,targetSlug'||a.schemaVersion!==1||a.kind!=='fcf-current-target-rollout-approval'||a.sourceCommit!==env.GITHUB_SHA||a.stage!==mode||!['es-ct-segona-g1','es-ct-tercera-g9'].includes(a.targetSlug)||!same(a.runtimeHashes,fcfTargetWriterHashes(root))||a.modelSha256!==fcfTargetPricingModelSha256())fail('exact reviewed new-inventory writer approval/closure required')
 return a
}
async function nativeInventory(db,data,slug){const first=await db.inventory(slug,[]),country=first.groups.find(g=>g.slug===slug)?.country_id;if(!Number.isSafeInteger(country)||country<1)fail('actual selected country required');const keys=[...new Set(data.fixtures.flatMap(f=>(f.appearances??[]).flatMap(a=>[regHash(country,a.regSt),imeHash(country,a.ime)])))].sort();return db.inventory(slug,keys)}
function stageRecord({mode,a,execution,inputs,result,rollout}){return{schemaVersion:1,kind:fcfTargetStageContract(mode).kind,targetSlug:a.targetSlug,sourceCommit:a.sourceCommit,execution,inputs,result,rolloutText:rollout.rolloutText,rolloutSha256:rollout.rolloutSha256}}
async function activeJob(github,execution,jobName,stepName){const [r,js]=await Promise.all([github(repo+`actions/runs/${execution.runId}`),jobs(github,execution.runId,execution.runAttempt)]),selected=js.filter(j=>j.name===jobName),j=selected[0],steps=j?.steps?.filter(s=>s.name===stepName);if(r.repository?.full_name!==repository||r.path!==workflow||r.event!=='workflow_dispatch'||r.head_branch!=='main'||r.head_sha!==execution.commit||String(r.run_attempt)!==execution.runAttempt||r.status!=='in_progress'||selected.length!==1||j.run_attempt!==r.run_attempt||j.head_sha!==execution.commit||j.status!=='in_progress'||steps?.length!==1||steps[0].status!=='in_progress')fail('actual current operation job/step required')}
export async function runFcfTargetActions({mode,env=process.env,root=process.cwd(),github=githubGet,clock=Date.now,database,child=execFileSync}={}){
 const execution=environment(env)
 if(['approval-stage','originals-stage'].includes(mode)){
  if(env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_DB_URL)fail('staging must have no database authority')
  const bytes=await readFcfDraftAsset({id:env.FCF_TARGET_ASSET_ID,digest:digest(env.FCF_TARGET_ASSET_SHA256),github,maximumBytes:mode==='approval-stage'?8*1024*1024:100*1024*1024}),d=directory(root,mode==='approval-stage'?'fcf-target-approval':'fcf-cleanup-originals')
  if(mode==='approval-stage'){const a=JSON.parse(bytes);closedApproval(a,{env,mode:a.stage,root});writeFileSync(join(d,'manifest.json'),bytes,{flag:'wx',mode:0o600});output(env,{evidence_ready:'true',manifest_sha:sha(bytes)});return{code:0}}
  // Original ZIP staging is authenticated by its independently reviewed raw SHA.
  const {unpackVerifiedArchive}=await import('./dfb-artifacts.mjs'),files=unpackVerifiedArchive(bytes,digest(env.FCF_TARGET_ASSET_SHA256),'fcf-cleanup-prepared'),originals=new Map(['4109388','4116215','4118352','4118358'].map(n=>[n,files.get(`acta-${n}.html`)]))
  if(files.size!==4)fail('exact four original ZIP members required');const originalsDesc=describeFcfCleanupOriginals({originals,now:clock()});for(const[n,b]of originals)writeFileSync(join(d,`acta-${n}.html`),b,{mode:0o600,flag:'wx'});const manifestSha=json(join(d,'manifest.json'),{schemaVersion:1,kind:'fcf-exact-four-originals',sourceCommit:env.GITHUB_SHA,execution,originals:originalsDesc});output(env,{evidence_ready:'true',manifest_sha:manifestSha});return{code:0}
 }
 if(!modes.includes(mode))fail('closed explicit writer stage required')
 const expected={runId:env.FCF_TARGET_APPROVAL_RUN_ID,runAttempt:env.FCF_TARGET_APPROVAL_ATTEMPT,commit:env.GITHUB_SHA,artifactId:env.FCF_TARGET_APPROVAL_ID,artifactDigest:digest(env.FCF_TARGET_APPROVAL_DIGEST),rawSha256:env.FCF_TARGET_APPROVAL_SHA256},approvalRecord=await record(github,expected),{approval}=readFcfTargetApprovalArtifact({...approvalRecord,expected,now:clock()}),a=closedApproval(approval,{env,mode,root})
 const six=a.source?.protocol==='six-reviewed-continuation-v1',sourcePolicy=six?FCF_SIX_SOURCE_POLICY:'es-fcf-reviewed-history-v1'
 const contract=fcfTargetStageContract(mode),jobName=contract?.job??mode,stepName=contract?.steps[0]??(mode==='cleanup-prepare'?`Prepare exact ${six?'six':'four'} FCF cleanup before-image`:`Apply exact ${six?'six':'four'} FCF cleanup`)
 if(env.GITHUB_JOB!==jobName)fail('selected current writer job required');await activeJob(github,execution,jobName,stepName)
 const db=database??createFcfTargetDatabase({env,sourcePolicy}),inputs={approvalArtifact:approvalRecord.expected,rootApprovalSha256:expected.rawSha256},slug=a.targetSlug
 output(env,{target_slug:slug})
 let previous
 if(a.previous){const r=await record(github,a.previous.expected);previous=readFcfTargetStageArtifact({...r,stage:a.previous.stage,targetSlug:slug,now:clock()});inputs.previousArtifact=previous.artifact}
 if(mode==='recover'){
  const r=await db.receipt(slug);if(!r||typeof r.rolloutText!=='string'||sha(r.rolloutText)!==r.rolloutSha256)fail('no authentic committed target envelope; do not retry blindly');const old=JSON.parse(r.rolloutText)
  if(old.targetSlug!==slug||old.inventoryBinding?.planSha256!==a.source?.plan?.planSha256||old.inventoryBinding?.sourceCommit!==a.source?.plan?.sourceCommit||r.packet_sha256!==old.targetPacketSha256||previous&&a.previous.stage!=='mapping'&&JSON.parse(previous.rolloutText).targetPacketSha256!==r.packet_sha256)fail('committed source/target receipt differs from explicit root pins')
  const {rolloutText,rolloutSha256,...metadata}=r,d=directory(root,'fcf-target-recover'),manifestSha=json(join(d,'manifest.json'),stageRecord({mode,a,execution,inputs,result:{...metadata,targetSlug:slug,readbackOnly:true},rollout:{rolloutText,rolloutSha256}}));output(env,{evidence_ready:'true',manifest_sha:manifestSha});return{code:0}
 }
 const wire=await readFcfTargetSourceWire({source:a.source,github,now:clock()}),inventoryAdmission=readFcfCapturedTargetEvidence({...wire,targetSlug:slug,now:clock()}),data=getFcfCapturedTargetData({targetEvidence:inventoryAdmission,targetSlug:slug,now:clock()}),databaseInventory=await nativeInventory(db,data,slug),base={targetSlug:slug,inventoryAdmission,databaseInventory,existingExceptionBindings:databaseInventory.existingExceptionBindings,sourceCommit:a.sourceCommit,execution,now:clock()}
 inputs.sourceFingerprintSha256=data.binding.sourceFingerprintSha256
 if(previous&&['price','check','activate'].includes(mode)){const original=JSON.parse(previous.rolloutText);base.sourceCommit=original.sourceCommit;base.execution=original.execution}
 const originalRecord=await record(github,a.originals),originalsProof=six?readFcfSixCleanupOriginals({legacy:originalRecord,historyProof:readFcfSixAccounting({...wire.history,now:clock()}),now:clock()}):readFcfCleanupOriginalStage({...originalRecord,now:clock()});inputs.originalsArtifact=six?originalRecord.expected:originalsProof.artifact
 let mapping
 if(mode==='mapping')mapping=deriveFcfTargetNativeMapping(base)
 else{if(!a.mapping)fail('actual root-reviewed native mapping required');const r=await record(github,a.mapping.expected),m=readFcfTargetStageArtifact({...r,stage:'mapping',targetSlug:slug,now:clock()});if(m.rolloutSha256!==a.mapping.mappingSha256)fail('reviewed mapping SHA differs');mapping=verifyFcfNativeMappingProposal({targetSlug:slug,sourceData:data,databaseInventory,existingExceptionBindings:base.existingExceptionBindings,writerCommit:base.sourceCommit,now:clock(),proposalText:m.rolloutText,proposalSha256:m.rolloutSha256});inputs.mappingArtifact=m.artifact}
 if(mode==='mapping'){const d=directory(root,'fcf-target-mapping'),manifestSha=json(join(d,'manifest.json'),stageRecord({mode,a,execution,inputs,result:{targetSlug:slug,mappingSha256:mapping.proposalSha256,nativeClubs:16,fixtures:240},rollout:{rolloutText:mapping.proposalText,rolloutSha256:mapping.proposalSha256}}));output(env,{evidence_ready:'true',manifest_sha:manifestSha});return{code:0}}
 if(mode==='cleanup-prepare'){
  if(a.cleanup!==null||a.previous!==null)fail('one-use cleanup preparation only');const r=await db.mutate('prepare',{p_main_sha:a.sourceCommit,p_policy_hashes:policyHashes(six)});if(typeof r.beforeImageText!=='string'||sha(r.beforeImageText)!==r.beforeSha256)fail('opaque SQL before-image TEXT/SHA differs')
  const d=directory(root,'fcf-cleanup-prepared');writeFileSync(join(d,'before-image.json'),r.beforeImageText,{flag:'wx',mode:0o600});for(const[n,b]of originalsProof.originals)writeFileSync(join(d,`acta-${n}.html`),b,{flag:'wx',mode:0o600});const manifestSha=json(join(d,'manifest.json'),{schemaVersion:six?2:1,kind:six?'fcf-exact-six-cleanup-prepared':'fcf-exact-four-cleanup-prepared',sourceCommit:a.sourceCommit,capturedUTC:new Date(clock()).toISOString(),execution,beforeSha256:r.beforeSha256,policyHashes:policyHashes(six),originals:originalsProof.descriptors});output(env,{evidence_ready:'true',manifest_sha:manifestSha});return{code:0}
 }
 if(!a.cleanup?.prepare)fail('actual all-four cleanup prepare artifact required');const prep=await record(github,a.cleanup.prepare),applied=a.cleanup.applied?await record(github,a.cleanup.applied):null,cleanupEvidence=(six?readFcfSixCleanupEvidence:readFcfCleanupEvidence)({prepareZipBytes:prep.zipBytes,prepareMetadata:prep.metadata,...(applied?{appliedZipBytes:applied.zipBytes,appliedMetadata:applied.metadata}:{}),expected:{prepare:a.cleanup.prepare,...(applied?{applied:a.cleanup.applied}:{})},...(six?{originalsProof}:{originals:originalsProof.originals}),now:clock()});base.cleanupEvidence=cleanupEvidence;inputs.cleanupBeforeSha256=cleanupEvidence.beforeSha256
 if(mode==='cleanup-apply'){
  if(cleanupEvidence.phase!=='prepared'||cleanupEvidence.sourceCommit!==a.sourceCommit||a.cleanup.applied!==null||a.previous!==null)fail('one atomic all-four cleanup apply only')
  if(databaseInventory.groups.every(g=>g.source_policy===null))compileFcfTargetReleasePacket({targetSlug:slug,sourceCommit:a.sourceCommit,targetEvidence:inventoryAdmission,cleanupEvidence,databaseInventory,now:clock()})
  else{
   // A committed cleanup may have lost its response or retained artifact. Keep
   // the authentic original preparation unchanged and validate actual applied
   // scope; the locked SQL wrapper returns its exact saved result for these
   // same TEXT/SHA/policy/commit pins without running cleanup again.
   validateFcfTargetReleaseInventory({targetSlug:slug,databaseInventory,cleanupPhase:'applied',sourcePolicy,now:clock()})
  }
  const result=await db.mutate('apply',{p_main_sha:cleanupEvidence.sourceCommit,p_policy_hashes:cleanupEvidence.policyHashes,p_before_sha:cleanupEvidence.beforeSha256,p_before_image_text:cleanupEvidence.beforeImageText}),after=await db.inventory(slug,[]),markers=after.installedMarkers?.flatMap(x=>x.markers)
  if(result.removedAppearances!==(six?157:126)||result.removedGoals!==(six?18:14)||result.unavailableMatches!==(six?6:4)||markers?.length!==(six?6:4))fail('committed cleanup requires exact readback; recover before retry')
  const d=directory(root,'fcf-cleanup-applied'),manifestSha=json(join(d,'manifest.json'),{schemaVersion:six?2:1,kind:six?'fcf-exact-six-cleanup-applied':'fcf-exact-four-cleanup-applied',sourceCommit:cleanupEvidence.sourceCommit,execution,prepareArtifactId:cleanupEvidence.prepareArtifact.id,prepareArtifactDigest:cleanupEvidence.prepareArtifact.digest,beforeSha256:cleanupEvidence.beforeSha256,policyHashes:cleanupEvidence.policyHashes,result,markers});output(env,{evidence_ready:'true',manifest_sha:manifestSha});return{code:0}
 }
 if(cleanupEvidence.phase!=='applied')fail('atomic all-four applied receipt required')
 let rollout,result
 if(mode==='import'){
  if(previous)fail('new import cannot overwrite a previous stage');rollout=buildFcfTargetRollout({...base,mappingText:mapping.proposalText,mappingSha256:mapping.proposalSha256});result=await db.mutate('import',{p_rollout_text:rollout.rolloutText,p_sha256:rollout.rolloutSha256})
 }else{
  const required={price:'import',check:'price',activate:'check'}[mode];if(!previous||a.previous.stage!==required&&!(mode==='price'&&a.previous.stage==='recover'&&previous.result.stage==='imported'&&previous.result.readbackOnly===true&&previous.result.currentActive===false))fail('exact previous target stage required');const prior=JSON.parse(previous.rolloutText);if(prior.identityPlan.mappingSha256!==mapping.proposalSha256||prior.identityPlan.mappingText!==mapping.proposalText)fail('approved original target mapping differs')
  const replay={...base,rolloutText:previous.rolloutText,rolloutSha256:previous.rolloutSha256};replayFcfTargetRollout(replay)
  if(mode==='price'){
   const original=JSON.parse(previous.rolloutText),temporary=realpathSync(mkdtempSync(join(tmpdir(),'fcf-writer-offline-')))
   try{if(existsSync(join(root,'scripts/.predpomnilnik')))fail('source cache must be absent');const path=join(temporary,'evidence.json'),bytes=Buffer.from(JSON.stringify({wire:encodeFcfTargetWire(wire),targetSlug:slug,targetPacketText:original.targetPacketText,targetPacketSha256:original.targetPacketSha256}));writeFileSync(path,bytes,{flag:'wx',mode:0o600});const childEnv={...env,FCF_TARGET_OFFLINE_FILE:path,FCF_TARGET_OFFLINE_SHA256:sha(bytes)},options={cwd:root,env:childEnv,timeout:240000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']},run=(file,args)=>child(process.execPath,['--import',join(root,'scripts/fcf-target-preload.mjs'),join(root,file),'--tekmovanje',slug,...args],options)
    run('scripts/ugani-pozicije.mjs',['--pisi']);run('scripts/ovrednoti-igralce.mjs',['--sezona','2026/27','--pisi'])
    const before=await db.pricingSnapshot(slug),pricePath=join(temporary,'prices.json');run('scripts/ovrednoti-igralce.mjs',['--sezona','2026/27','--release-plan',pricePath]);const after=await db.pricingSnapshot(slug);if(before.snapshotText!==after.snapshotText||before.snapshotSha256!==after.snapshotSha256)fail('pricing dependency raced during read-only replay')
    const readiness=buildFcfTargetReadiness({targetSlug:slug,pricingSnapshot:after,replay:JSON.parse(readFileSync(pricePath)),modelSha256:a.modelSha256,sourceData:data,now:clock()});rollout=advanceFcfTargetRollout({...replay,execution:base.execution,readiness})
   }finally{rmSync(temporary,{recursive:true,force:true})}
  }else rollout=advanceFcfTargetRollout({...replay,execution:base.execution,readiness:JSON.parse(previous.rolloutText).readiness})
  result=await db.mutate('check',{p_rollout_text:rollout.rolloutText,p_sha256:rollout.rolloutSha256,p_activate:mode==='activate'})
 }
 if(result.targetSlug!==slug)fail('exact SQL target readback required');const d=directory(root,`fcf-target-${mode}`),manifestSha=json(join(d,'manifest.json'),stageRecord({mode,a,execution,inputs,result,rollout}));output(env,{evidence_ready:'true',manifest_sha:manifestSha});return{code:0}
}
