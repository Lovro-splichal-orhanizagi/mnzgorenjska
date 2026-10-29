// Fixed G1 byte-first remainder protocol. No native/DB authority is issued here.
import {createHash} from 'node:crypto'
import {assertReviewedFcfG1HistoricalZero} from './fcf-g1-historical-zero-witness.mjs'
import {verifyFcfG1CurrentJobInventory,verifyFcfG1TerminalJobInventory} from './fcf-g1-remainder-job-inventory.mjs'
import {assertFcfG1PrebudgetHistory} from './fcf-g1-prebudget-audit.mjs'
import {mkdirSync,writeFileSync,appendFileSync,lstatSync,realpathSync,openSync,closeSync,fsyncSync,readFileSync} from 'node:fs'
import {join,resolve,dirname,isAbsolute} from 'node:path'
import {getFcfG1RemainderParent,reauthenticateFcfG1RemainderParent} from './fcf-g1-remainder-parent.mjs'
import {classifyFcfG1QuarantineDocument} from './fcf-g1-quarantine-audit.mjs'
import {requireFcfInventorySourceSlot} from './fcf-inventory-source-coordination.mjs'
import {snapshotFcfInventoryRuleset,verifyFcfInventoryRulesetSnapshot} from './fcf-missing-inventory-claim.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {fcfSixPolicyHashes} from './fcf-six-historical-policy.mjs'
import {fcfG1SupplementalPolicySha256} from './fcf-g1-4109409-policy.mjs'
import {inventoryFail as fail,exactKeys,rawSha256,jsonBytes,validUTC,commitId,nativeId,sha256Id,frozenJSON,verifyInventoryExecution,readInventoryZip} from './fcf-missing-inventory-artifact.mjs'
export const FCF_G1_REMAINDER_PROTOCOL='g1-post83-remainder-quarantine-v1'
export const FCF_G1_REMAINDER_LIMITS=Object.freeze({maximumBodyBytes:2097152,maximumManifestBytes:8388608,maximumExpandedBytes:201326592,maximumZipBytes:104857600,pauseMs:3000,attemptTimeoutMs:90000,sourceWindowMs:2700000,retentionMarginMs:15000,maximumPlanAgeMs:86400000})
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-fcf-zgodovina.yml',slug='es-ct-segona-g1',flags={admissible:false,nativeAdmission:false,activationEligible:false},plans=new WeakMap(),claims=new WeakMap(),consumptions=new WeakMap(),runs=new WeakMap(),children=new WeakMap(),finalized=new WeakMap(),used=new Set()
const clean=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>hash(clean(a))===hash(clean(b)),url=id=>`https://www.fcf.cat/ca/competicio/acta/${id}`,ids=Array.from({length:240},(_,i)=>String(4109388+i)),cloneDoc=d=>({...structuredClone({...d,raw:undefined}),raw:Buffer.from(d.raw)})
function authority(plan){const p=plans.get(plan);if(!p)fail('private G1 remainder plan required');getFcfG1RemainderParent(p.parentProof);return p}
function ledger(parentProof,links=[]){
 const parent=getFcfG1RemainderParent(parentProof);if(parent.accounting.priorSourceGETs!==83||parent.accounting.maximumCumulativeSourceGETs!==478||parent.prefix.length!==23||!sha256Id(parent.ledgerSha256))fail('private83/23/478 parent required')
 let prior=83,documents=parent.prefix.map(cloneDoc),bindings=[],previous=parent.ledgerSha256
 for(const proof of links){const link=children.get(proof);if(!link||!finalized.has(proof)||link.manifest.status!=='PARTIAL_QUARANTINE'||link.manifest.accountingKnown!==true||link.plan.ledgerSha256!==previous||link.manifest.priorSourceGETs!==prior)fail('ordered privately authenticated counted partial links required');prior+=link.manifest.newSourceGETs;if(prior>478)fail('source cap exceeded');documents.push(...link.documents.map(cloneDoc));bindings.push({...link.binding,finalReceipt:finalized.get(proof)});previous=hash({anchorLedgerSha256:parent.ledgerSha256,links:bindings})}
 if(documents.some((d,i)=>d.id!==ids[i])||new Set(documents.map(d=>d.id)).size!==documents.length||documents.length>240)fail('append-only exact G1 raw prefix required')
 return {parent,prior,documents,bindings,ledgerSha256:previous,remainingIds:ids.slice(documents.length)}
}
export function buildFcfG1RemainderPlan(input){
 exactKeys(input,['parentProof','sourceCommit','rulesetSnapshotSha256',...(Object.hasOwn(input??{},'appendProofs')?['appendProofs']:[])],'G1 remainder plan inputs');const {parentProof,sourceCommit,rulesetSnapshotSha256,appendProofs=[]}=input;if(!Array.isArray(appendProofs)||appendProofs.length>217)fail('bounded append proof list required')
 const l=ledger(parentProof,appendProofs),now=Date.now();if(!commitId(sourceCommit)||sourceCommit==='3ed1e852166398bb1429621a89c197ab6f77cb1e'||!sha256Id(rulesetSnapshotSha256)||!l.remainingIds.length||l.remainingIds.length>217||l.prior+l.remainingIds.length>478)fail('fixed G1 source continuation/cap required')
 const body={schemaVersion:1,kind:'fcf-g1-remainder-source-plan',preset:FCF_G1_REMAINDER_PROTOCOL,sourceCommit,createdUTC:new Date(now).toISOString(),targetSlug:slug,competitionId:783,sourceCode:'4109388-4109627',season:'2026/27',anchorLedgerSha256:l.parent.ledgerSha256,ledgerSha256:l.ledgerSha256,appendBindings:l.bindings,priorSourceGETs:l.prior,maximumNewSourceGETs:l.remainingIds.length,plannedCumulativeSourceGETs:l.prior+l.remainingIds.length,maximumCumulativeSourceGETs:478,firstSourceUTC:l.parent.firstSourceUTC,sourceFreshUntil:l.parent.sourceFreshUntil,fetchIds:l.remainingIds,prefix:l.documents.map(({raw,...d})=>({...d,raw:undefined})),rulesetSnapshotSha256,policyHashes:fcfSixPolicyHashes(),supplementalPolicySha256:fcfG1SupplementalPolicySha256(),limits:FCF_G1_REMAINDER_LIMITS,...flags}
 // Strip undefined fields before hashing/serialization; receipts and clocks stay exact.
 const normalized=clean(body),plan=frozenJSON({...normalized,planSha256:hash(normalized)});plans.set(plan,{parentProof,appendProofs:[...appendProofs]});return plan
}
export function validateFcfG1RemainderPlan({plan,parentProof,appendProofs=[]}){
 const {planSha256,...body}=plan??{},fresh=buildFcfG1RemainderPlan({parentProof,sourceCommit:plan?.sourceCommit,rulesetSnapshotSha256:plan?.rulesetSnapshotSha256,appendProofs}),{createdUTC:ignored,planSha256:ignoredHash,...expected}=fresh
 if(!validUTC(plan?.createdUTC)||Date.parse(plan.createdUTC)>Date.now()||Date.now()-Date.parse(plan.createdUTC)>86400000||!same({...body,createdUTC:undefined},{...expected,createdUTC:undefined})||hash(body)!==planSha256)fail('closed G1 remainder plan differs')
 plans.set(plan,{parentProof,appendProofs:[...appendProofs]});return plan
}
export function fcfG1RemainderClaimRef(plan){authority(plan);return`refs/tags/fcf-inventory-claim/g1-quarantine-after-${plan.ledgerSha256}`}
export function getFcfG1RemainderPlanData(plan){const p=authority(plan),l=ledger(p.parentProof,p.appendProofs);return{plan:structuredClone(plan),documents:l.documents.map(cloneDoc)}}
export function createFcfG1RemainderClaimTemplate({plan,runId,rulesetSnapshot}){
 authority(plan);if(!nativeId(runId)||hash(snapshotFcfInventoryRuleset({ruleset:rulesetSnapshot?.ruleset,checkedUTC:rulesetSnapshot?.checkedUTC}))!==plan.rulesetSnapshotSha256)fail('root protected claim snapshot required')
 return frozenJSON({schemaVersion:1,kind:'fcf-g1-remainder-execution-claim',repository,workflow,sourceCommit:plan.sourceCommit,runId,runAttempt:'1',preset:FCF_G1_REMAINDER_PROTOCOL,planSha256:plan.planSha256,ledgerSha256:plan.ledgerSha256,priorSourceGETs:plan.priorSourceGETs,maximumNewSourceGETs:plan.maximumNewSourceGETs,maximumCumulativeSourceGETs:478,claimedUTC:new Date().toISOString(),rulesetSnapshot})
}
export function readFcfG1RemainderClaim({plan,execution,ref,commit,tree,blob,claimBytes,ruleset}){
 authority(plan);exactKeys(execution,['repository','workflow','ref','sourceCommit','runId','runAttempt'],'remainder execution')
 if(execution.repository!==repository||execution.workflow!==workflow||execution.ref!=='refs/heads/main'||execution.sourceCommit!==plan.sourceCommit||execution.runAttempt!=='1'||!nativeId(execution.runId)||ref?.ref!==fcfG1RemainderClaimRef(plan)||ref.object?.type!=='commit'||!commitId(ref.object.sha)||commit?.sha!==ref.object.sha||commit.sha===plan.sourceCommit||commit.parents?.length!==1||commit.parents[0].sha!==plan.sourceCommit||!commitId(commit.tree?.sha)||tree?.sha!==commit.tree.sha||tree.truncated!==false||!Array.isArray(tree.tree))fail('actual protected G1 remainder claim source/tree required')
 const entries=tree.tree.filter(x=>x.path==='.fcf-inventory-claim.json'),entry=entries[0]
 if(entries.length!==1||entry.type!=='blob'||entry.mode!=='100644'||!commitId(entry.sha)||blob?.sha!==entry.sha||blob.encoding!=='base64'||!Buffer.isBuffer(claimBytes)||blob.size!==claimBytes.length||typeof blob.content!=='string'||!Buffer.from(blob.content.replace(/\n/g,''),'base64').equals(claimBytes)||createHash('sha1').update(`blob ${claimBytes.length}\0`).update(claimBytes).digest('hex')!==entry.sha)fail('actual G1 remainder claim blob required')
 const c=jsonBytes(claimBytes,'G1 remainder claim',65536),expected=createFcfG1RemainderClaimTemplate({plan,runId:execution.runId,rulesetSnapshot:c.rulesetSnapshot})
 if(!validUTC(c.claimedUTC)||Date.parse(c.claimedUTC)<Date.parse(plan.createdUTC)||Date.parse(c.claimedUTC)>Date.now()||!same({...c,claimedUTC:undefined},{...expected,claimedUTC:undefined}))fail('exact G1 remainder execution claim required')
 verifyFcfInventoryRulesetSnapshot({snapshot:c.rulesetSnapshot,actual:ruleset});if(String(ruleset.id)!=='25355545')fail('fixed protected inventory ruleset required')
 const proof=Object.freeze({kind:'fcf-g1-remainder-claim-proof'});claims.set(proof,{plan,execution:structuredClone(execution),claimRef:ref.ref,claimCommit:commit.sha,claimJsonSha256:rawSha256(claimBytes),claimedUTC:c.claimedUTC});return proof
}
export function fcfG1RemainderConsumptionManifest({claimProof,jobId}){
 const c=claims.get(claimProof);if(!c||!nativeId(jobId))fail('private remainder claim required')
 return frozenJSON({schemaVersion:1,kind:'fcf-g1-remainder-consumed',planSha256:c.plan.planSha256,ledgerSha256:c.plan.ledgerSha256,claimRef:c.claimRef,claimCommit:c.claimCommit,claimJsonSha256:c.claimJsonSha256,...c.execution,jobId,consumedUTC:new Date().toISOString(),...flags})
}
export function readFcfG1RemainderConsumption({claimProof,...input}){
 const c=claims.get(claimProof);if(!c||input.expected?.runId!==c.execution.runId||input.expected?.sourceCommit!==c.plan.sourceCommit||!actor(input.run?.actor)||!actor(input.run?.triggering_actor))fail('private remainder claim required')
 verifyInventoryExecution({...input,jobName:'missing-inventory-consume',stepNames:['Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption'],artifactName:`fcf-inventory-consumption-${c.execution.runId}-1`,runPhase:'consumption-record'})
 const files=readInventoryZip({...input,members:{'manifest.json':8388608}}),m=jsonBytes(files.get('manifest.json'),'remainder consumption'),expected=fcfG1RemainderConsumptionManifest({claimProof,jobId:input.expected.jobId})
 if(!same({...m,consumedUTC:undefined},{...expected,consumedUTC:undefined})||!validUTC(m.consumedUTC)||Date.parse(m.consumedUTC)<Date.parse(c.claimedUTC)||Date.parse(m.consumedUTC)>Date.now())fail('actual remainder consumption differs')
 const proof=Object.freeze({kind:'fcf-g1-remainder-consumption-proof'});consumptions.set(proof,{...c,manifest:m,binding:structuredClone(input.expected)});return proof
}
const actor=a=>a?.login==='nejcar20'&&a.id===25134229
/** Exact compiled historical witnesses only; unknown/new executions HOLD. */
export function assertFcfG1RemainderZeroSourceRun(h){assertReviewedFcfG1HistoricalZero(h)}
/** Private own-execution exclusion. It is issued only after complete actual
 * workflow history and current capture-step metadata have been authenticated. */
export function readFcfG1RemainderRunningExecution({claimProof,consumptionProof,run,jobs,history,prebudgetProof}){
 const c=claims.get(claimProof),s=consumptions.get(consumptionProof);if(!c||!s||s.plan!==c.plan||s.execution.runId!==c.execution.runId)fail('private claim and consumption required')
 const checked=verifyFcfG1CurrentJobInventory({run,jobs,execution:c.execution});if(checked.phase!=='capture')fail('actual capture inventory phase required');jobs=checked.jobs
 const e=c.execution,j=jobs?.filter(j=>j.name==='missing-inventory-g1'),step=j?.[0]?.steps?.filter(s=>s.name==='Capture missing target inventory')
 if(String(run?.id)!==e.runId||run.repository?.full_name!==repository||run.path!==workflow||run.head_sha!==e.sourceCommit||run.head_branch!=='main'||run.event!=='workflow_dispatch'||run.run_attempt!==1||run.status!=='in_progress'||run.conclusion!==null||!actor(run.actor)||!actor(run.triggering_actor)||j?.length!==1||!nativeId(String(j[0].id))||String(j[0].run_id)!==e.runId||j[0].run_attempt!==1||j[0].head_sha!==e.sourceCommit||j[0].status!=='in_progress'||step?.length!==1||step[0].status!=='in_progress'||step[0].conclusion!==null)fail('actual own main attempt1 actors/capture required')
 if(!Array.isArray(history)||history.some(r=>!nativeId(String(r?.id))))fail('complete actual FCF history required')
 const p=authority(c.plan),l=ledger(p.parentProof,p.appendProofs);if(!Array.isArray(l.parent.sourceReferences.accountedRunIds)||!l.parent.sourceReferences.accountedRunIds.includes('40737060608'))fail('private complete anchor run IDs required');const accounted=new Set([...l.parent.sourceReferences.accountedRunIds,...l.bindings.map(b=>b.runId)])
 // Only conclusively source-free skipped capture jobs may be unaccounted. A
 // completed/failed run is not assumed zero; unknown steps/jobs fail closed.
 const unaccounted=new Map()
 for(const h of history){
  if(String(h.id)===e.runId){
   const freshInventory=verifyFcfG1CurrentJobInventory({run:h,jobs:h.jobs,execution:e});if(freshInventory.phase!=='capture')fail('fresh actual own capture phase differs; held');const freshJobs=freshInventory.jobs,own=freshJobs?.filter(x=>x.name==='missing-inventory-g1'),active=own?.[0]?.steps?.filter(x=>x.name==='Capture missing target inventory')
   if(h.repository?.full_name!==repository||h.path!==workflow||h.event!=='workflow_dispatch'||h.head_branch!=='main'||h.head_sha!==e.sourceCommit||h.run_attempt!==1||h.observedAttempt!==1||h.status!=='in_progress'||h.conclusion!==null||!actor(h.actor)||!actor(h.triggering_actor)||own?.length!==1||String(own[0].id)!==String(j[0].id)||String(own[0].run_id)!==e.runId||own[0].run_attempt!==1||own[0].head_sha!==e.sourceCommit||own[0].status!=='in_progress'||active?.length!==1||active[0].status!=='in_progress'||active[0].conclusion!==null)fail('fresh actual private own execution differs; held')
   continue
  }
  if(accounted.has(String(h.id)))continue
  if(h.path==='.github/workflows/fcf-javni-dokazi.yml'){if(!prebudgetProof||h.observedAttempt!==1)fail('unaccounted historical public-source scope held');assertFcfG1PrebudgetHistory({proof:prebudgetProof,run:h,jobs:h.jobs});continue}
  assertFcfG1RemainderZeroSourceRun(h)
  const observed=unaccounted.get(String(h.id))??[];observed.push(h);unaccounted.set(String(h.id),observed)
 }
 for(const attempts of unaccounted.values()){const count=attempts[0].run_attempt;if(attempts.length!==count||new Set(attempts.map(h=>h.observedAttempt)).size!==count||attempts.some(h=>h.run_attempt!==count))fail('incomplete actual FCF attempt history held')}


 const proof=Object.freeze({kind:'fcf-g1-remainder-running-proof'});runs.set(proof,{...c,consumptionProof,run:structuredClone(run),jobId:String(j[0].id),checkedAt:Date.now()});return proof
}
function ownedDirectory(directory){if(!isAbsolute(directory)||resolve(directory)!==directory||realpathSync(dirname(directory))!==dirname(directory))fail('safe absolute remainder output required');mkdirSync(directory,{mode:0o700});const before=lstatSync(directory);if(!before.isDirectory()||before.isSymbolicLink())fail('exclusive remainder directory required');return()=>{const a=lstatSync(directory);if(a.dev!==before.dev||a.ino!==before.ino||a.isSymbolicLink())fail('remainder output ownership changed')}}
function immutable(path,bytes){writeFileSync(path,bytes,{flag:'wx',mode:0o600});const fd=openSync(path,'r');try{fsyncSync(fd)}finally{closeSync(fd)}}
/** Internal collector: production Actions uses real fetch/Date.now. Fake request
 * and timing belong to focused offline tests, never a public root proof loader. */
export async function collectFcfG1Remainder({plan,consumptionProof,runningProof,sourceSlotProof,root,request=fetch,pause=ms=>new Promise(r=>setTimeout(r,ms)),clock=Date.now,recheckExecution}){
 const a=authority(plan),s=consumptions.get(consumptionProof),r=runs.get(runningProof),useKey=s?`${s.execution.runId}:${s.claimCommit}:${s.claimJsonSha256}`:null;requireFcfInventorySourceSlot(sourceSlotProof)
 if(!s||!r||s.plan!==plan||r.plan!==plan||r.consumptionProof!==consumptionProof||used.has(useKey)||Date.now()-r.checkedAt>30000||sourceSlotProof.runId!==r.execution.runId||sourceSlotProof.sourceCommit!==plan.sourceCommit||typeof request!=='function')fail('fresh private same-run source clearance required')
 used.add(useKey);await reauthenticateFcfG1RemainderParent(a.parentProof);if(recheckExecution)await recheckExecution()
 const l=ledger(a.parentProof,a.appendProofs),directory=join(root,'fcf-missing-es-ct-segona-g1'),check=ownedDirectory(directory),attempts=[],documents=[],started=clock();let lastEnd=null,reason=null,known=true,newBytes=0,expanded=l.documents.reduce((n,d)=>n+d.raw.length,0)
 const stamp=()=>new Date(clock()).toISOString(),journal=join(directory,'attempts.ndjson'),append=v=>{check();appendFileSync(journal,JSON.stringify(v)+'\n',{mode:0o600});const fd=openSync(journal,'r');try{fsyncSync(fd)}finally{closeSync(fd)}}
 immutable(journal,Buffer.alloc(0))
 for(const id of plan.fetchIds){
  getFcfG1RemainderParent(a.parentProof);check()
  // Incompressible-byte upper bound leaves16MiB for both journals/manifest and ZIP headers.
  if(newBytes+2097152+16777216>104857600||expanded+2097152+16777216>201326592){reason='artifact-retention-budget';break}
  if(clock()<started||clock()-started+90000+15000>2700000||clock()+90000+15000>Date.parse(plan.sourceFreshUntil)){reason='clock-or-retention-budget';break}
  if(lastEnd!==null)await pause(Math.max(0,3000-(clock()-lastEnd)))
  getFcfG1RemainderParent(a.parentProof)
  if(clock()<started||clock()-started+105000>2700000||clock()+105000>Date.parse(plan.sourceFreshUntil)){reason='clock-or-retention-budget';break}
  const attempt={id,url:url(id),method:'GET',sequence:plan.priorSourceGETs+attempts.length+1,startedUTC:stamp(),endedUTC:null,status:null,responseURL:null,redirected:null,bodyComplete:false,bytes:null,sha256:null,file:null,classification:null,error:null,partialFile:null,partialBytes:null,partialSha256:null};attempts.push(attempt)
  try{append({kind:'intent',...attempt})}catch{known=false;reason='intent-output-unknown';break}
  let receivedChunks=[]
  try{
   const response=await request(url(id),{method:'GET',redirect:'manual',headers:{'User-Agent':'SLFF fantasy (slff.eu; splih.94@gmail.com)'},signal:AbortSignal.timeout(90000)})
   attempt.status=response.status;attempt.responseURL=response.url||url(id);attempt.redirected=response.redirected
   if(response.status!==200||attempt.responseURL!==url(id)||response.redirected!==false){attempt.error='transport-refusal-or-non200';reason=attempt.error;break}
   const chunks=receivedChunks;let size=0;for await(const chunk of response.body??[]){const b=Buffer.from(chunk);size+=b.length;if(size>2097152)throw Error('BODY_LIMIT');chunks.push(b)}
   const raw=Buffer.concat(chunks),length=response.headers?.get('content-length');if(!raw.length||length!==null&&length!==undefined&&(!/^\d+$/.test(length)||Number(length)!==raw.length))throw Error('BODY_PARTIAL')
   expanded+=raw.length;newBytes+=raw.length;if(expanded>201326592)throw Error('UNION_LIMIT')
   attempt.bytes=raw.length;attempt.sha256=rawSha256(raw);attempt.file=`acta-${id}.html`;immutable(join(directory,attempt.file),raw);attempt.bodyComplete=true
   // Closed DATA defects are retained and do not stop the raw batch. Any
   // unexpected exception or unknown source layout stops and remains a HOLD.
   const classification=classifyFcfG1QuarantineDocument({id,bytes:raw});attempt.classification=classification.classification
   documents.push({id,url:url(id),raw,sha256:attempt.sha256,byteLength:raw.length,receipt:attempt,origin:{runId:r.execution.runId,jobId:r.jobId,sourceCommit:plan.sourceCommit,sequence:attempt.sequence}})
  }catch(error){attempt.error=error?.message==='BODY_LIMIT'?'body-size':error?.message==='BODY_PARTIAL'?'partial-body':error?.message==='UNION_LIMIT'?'union-size':'source-or-program-held';reason=attempt.error;if(!attempt.bodyComplete&&receivedChunks.length){const partial=Buffer.concat(receivedChunks);attempt.partialFile=`partial-acta-${id}.bin`;attempt.partialBytes=partial.length;attempt.partialSha256=rawSha256(partial);try{immutable(join(directory,attempt.partialFile),partial)}catch{known=false;reason='partial-output-unknown'}}}
  finally{attempt.endedUTC=stamp();lastEnd=clock();try{append({kind:'outcome',...attempt})}catch{known=false;reason='outcome-output-unknown'}}
  if(reason)break
 }
 let parentAuthenticated=true;try{await reauthenticateFcfG1RemainderParent(a.parentProof);if(recheckExecution)await recheckExecution()}catch{parentAuthenticated=false;reason='parent-reauthentication-held'}
 const complete=!reason&&documents.length===plan.fetchIds.length,status=complete?'COMPLETE_QUARANTINE':'PARTIAL_QUARANTINE',manifest={schemaVersion:1,kind:'fcf-g1-remainder-raw',preset:FCF_G1_REMAINDER_PROTOCOL,status,planSha256:plan.planSha256,ledgerSha256:plan.ledgerSha256,sourceCommit:plan.sourceCommit,...r.execution,jobId:r.jobId,claimRef:r.claimRef,claimCommit:r.claimCommit,claimJsonSha256:r.claimJsonSha256,startedUTC:new Date(started).toISOString(),completedUTC:stamp(),firstSourceUTC:plan.firstSourceUTC,sourceFreshUntil:plan.sourceFreshUntil,priorSourceGETs:plan.priorSourceGETs,newSourceGETs:known?attempts.length:null,actualSourceGETs:known?plan.priorSourceGETs+attempts.length:null,maximumCumulativeSourceGETs:478,accountingKnown:known,parentAuthenticated,reason,attempts,documents:documents.map(({raw,...d})=>d),attemptJournalSha256:rawSha256(readFileSync(journal)),...flags}
 const bytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');if(bytes.length>8388608)fail('manifest bound exceeded');check();immutable(join(directory,'manifest.json'),bytes)
 return {status:complete?'inventory-complete':'failed',evidenceReady:true,outputDirectory:directory,manifestSHA:rawSha256(bytes),manifest}
}
/** Authenticate a raw terminal/retained child, including every counted intent,
 * outcome and raw digest. A failed child grants only append/accounting authority. */
export function readFcfG1RemainderArtifact({plan,claimProof,consumptionProof,...input}){
 const c=claims.get(claimProof),s=consumptions.get(consumptionProof);if(!c||!s||c.plan!==plan||s.plan!==plan||input.expected?.runId!==c.execution.runId||input.expected?.sourceCommit!==plan.sourceCommit||!actor(input.run?.actor)||!actor(input.run?.triggering_actor))fail('private same-plan claim/consumption required')
 if(input.run?.status==='completed')verifyFcfG1TerminalJobInventory({run:input.run,jobs:input.jobs,execution:c.execution})
 const diagnostic=input.artifact?.name?.startsWith('fcf-missing-inventory-diagnostic-')
 verifyInventoryExecution({...input,jobName:'missing-inventory-g1',stepNames:[diagnostic?'Retain failed target inventory diagnostic':'Capture missing target inventory',diagnostic?'Retain failed target inventory diagnostic':'Retain complete target inventory'],artifactName:`fcf-missing-inventory-${diagnostic?'diagnostic-':''}${slug}-${c.execution.runId}-1`,runPhase:'inventory-record',jobPhase:diagnostic?'diagnostic':'captured-uploaded'})
 const members={'manifest.json':8388608,'attempts.ndjson':8388608,...Object.fromEntries(plan.fetchIds.flatMap(id=>[[`acta-${id}.html`,2097152],[`partial-acta-${id}.bin`,2097152]]))},files=readInventoryZip({...input,members,allowMissing:true}),m=jsonBytes(files.get('manifest.json'),'remainder raw'),journal=files.get('attempts.ndjson')
 if(!m||m.schemaVersion!==1||m.kind!=='fcf-g1-remainder-raw'||m.preset!==FCF_G1_REMAINDER_PROTOCOL||m.planSha256!==plan.planSha256||m.ledgerSha256!==plan.ledgerSha256||m.sourceCommit!==plan.sourceCommit||m.runId!==c.execution.runId||m.runAttempt!=='1'||m.jobId!==input.expected.jobId||m.claimRef!==c.claimRef||m.claimCommit!==c.claimCommit||m.claimJsonSha256!==c.claimJsonSha256||m.firstSourceUTC!==plan.firstSourceUTC||m.sourceFreshUntil!==plan.sourceFreshUntil||m.priorSourceGETs!==plan.priorSourceGETs||m.maximumCumulativeSourceGETs!==478||m.admissible!==false||m.nativeAdmission!==false||m.activationEligible!==false||!Array.isArray(m.attempts)||m.attempts.length>plan.fetchIds.length||!Buffer.isBuffer(journal)||rawSha256(journal)!==m.attemptJournalSha256)fail('actual G1 remainder manifest/claim/ledger differs')
 exactKeys(m,['schemaVersion','kind','preset','status','planSha256','ledgerSha256','sourceCommit','repository','workflow','ref','runId','runAttempt','jobId','claimRef','claimCommit','claimJsonSha256','startedUTC','completedUTC','firstSourceUTC','sourceFreshUntil','priorSourceGETs','newSourceGETs','actualSourceGETs','maximumCumulativeSourceGETs','accountingKnown','parentAuthenticated','reason','attempts','documents','attemptJournalSha256','admissible','nativeAdmission','activationEligible'],'G1 raw manifest');if(m.repository!==repository||m.workflow!==workflow||m.ref!=='refs/heads/main')fail('exact raw execution required')
 const rows=journal.toString('utf8').trimEnd().split('\n').filter(Boolean).map(x=>JSON.parse(x));if(rows.length!==m.attempts.length*2||m.accountingKnown!==true||m.newSourceGETs!==m.attempts.length||m.actualSourceGETs!==plan.priorSourceGETs+m.attempts.length||m.actualSourceGETs>478)fail('complete exact attempt accounting required; UNKNOWN never zero')
 let previous=null
 const docs=[];for(const [i,a]of m.attempts.entries()){
  exactKeys(a,['id','url','method','sequence','startedUTC','endedUTC','status','responseURL','redirected','bodyComplete','bytes','sha256','file','classification','error','partialFile','partialBytes','partialSha256'],'source attempt')
  const intent={...a,endedUTC:null,status:null,responseURL:null,redirected:null,bodyComplete:false,bytes:null,sha256:null,file:null,classification:null,error:null,partialFile:null,partialBytes:null,partialSha256:null};if(!same(rows[i*2],{kind:'intent',...intent}))fail('immutable exact request intent differs')
  if(a.id!==plan.fetchIds[i]||a.url!==url(a.id)||a.method!=='GET'||a.sequence!==plan.priorSourceGETs+i+1||!validUTC(a.startedUTC)||!validUTC(a.endedUTC)||Date.parse(a.endedUTC)<Date.parse(a.startedUTC)||Date.parse(a.startedUTC)<Date.parse(s.manifest.consumedUTC)||Date.parse(a.endedUTC)-Date.parse(a.startedUTC)>90000||previous!==null&&Date.parse(a.startedUTC)-previous<3000||rows[i*2].kind!=='intent'||!same({...rows[i*2],kind:undefined,endedUTC:a.endedUTC,status:a.status,responseURL:a.responseURL,redirected:a.redirected,bodyComplete:a.bodyComplete,bytes:a.bytes,sha256:a.sha256,file:a.file,classification:a.classification,error:a.error,partialFile:a.partialFile,partialBytes:a.partialBytes,partialSha256:a.partialSha256},{...a})||!same({...rows[i*2+1],kind:undefined},a))fail('ordered actual source intent/outcome differs')
  previous=Date.parse(a.endedUTC)
  if(a.partialFile!==null){const partial=files.get(a.partialFile);if(a.bodyComplete||a.partialFile!==`partial-acta-${a.id}.bin`||!partial||!partial.length||partial.length!==a.partialBytes||rawSha256(partial)!==a.partialSha256)fail('actual partial raw receipt differs')}else if(a.partialBytes!==null||a.partialSha256!==null)fail('partial receipt without actual bytes')
  if(a.bodyComplete){const raw=files.get(`acta-${a.id}.html`);if(!raw||a.status!==200||a.responseURL!==url(a.id)||a.redirected!==false||a.file!==`acta-${a.id}.html`||a.bytes!==raw.length||rawSha256(raw)!==a.sha256)fail('actual raw source receipt differs');if(a.classification!==null){const classification=classifyFcfG1QuarantineDocument({id:a.id,bytes:raw});if(classification.classification!==a.classification)fail('raw classification differs');docs.push({id:a.id,url:a.url,raw,sha256:a.sha256,byteLength:raw.length,receipt:a,origin:{runId:m.runId,jobId:m.jobId,sourceCommit:m.sourceCommit,sequence:a.sequence}})}}
 }
 const privatePlan=authority(plan),oldLedger=ledger(privatePlan.parentProof,privatePlan.appendProofs);if([...files.values()].reduce((n,b)=>n+b.length,0)+oldLedger.documents.reduce((n,d)=>n+d.raw.length,0)>201326592)fail('union expanded bound exceeded')
 const expectedFiles=new Set(['manifest.json','attempts.ndjson',...m.attempts.filter(a=>a.bodyComplete).map(a=>a.file),...m.attempts.filter(a=>a.partialFile!==null).map(a=>a.partialFile)]);if(files.size!==expectedFiles.size||[...files.keys()].some(k=>!expectedFiles.has(k))||!same(m.documents,docs.map(({raw,...d})=>d)))fail('closed raw member/document set differs')
 const complete=m.status==='COMPLETE_QUARANTINE';if(complete&&(diagnostic||docs.length!==plan.fetchIds.length||m.reason!==null||m.parentAuthenticated!==true)||!complete&&(m.status!=='PARTIAL_QUARANTINE'||!diagnostic))fail('raw completion/quarantine status differs')
 if(!validUTC(m.startedUTC)||!validUTC(m.completedUTC)||Date.parse(m.startedUTC)<Date.parse(s.manifest.consumedUTC)||Date.parse(m.completedUTC)<Date.parse(m.startedUTC)||Date.parse(m.completedUTC)>Date.now()+1000||Date.parse(m.completedUTC)-Date.parse(m.startedUTC)>2700000||m.attempts.some(a=>Date.parse(a.startedUTC)<Date.parse(m.startedUTC)||Date.parse(a.endedUTC)>Date.parse(m.completedUTC))||Date.now()>Date.parse(plan.sourceFreshUntil))fail('original source/composite freshness/window differs')
 const binding={runId:m.runId,sourceCommit:m.sourceCommit,artifactId:input.expected.artifactId,artifactDigest:input.expected.artifactDigest,manifestSha256:input.expected.manifestSha256,newSourceGETs:m.newSourceGETs,priorSourceGETs:m.priorSourceGETs,claimRef:m.claimRef,claimCommit:m.claimCommit,claimJsonSha256:m.claimJsonSha256},proof=Object.freeze({kind:'fcf-g1-remainder-raw-proof'});children.set(proof,{plan,manifest:m,documents:docs,binding});return proof
}
export function getFcfG1RemainderRawData(proof){const d=children.get(proof);if(!d)fail('private G1 raw quarantine proof required');authority(d.plan);if(Date.now()>Date.parse(d.plan.sourceFreshUntil))fail('original composite24h expired');const a=authority(d.plan),l=ledger(a.parentProof,a.appendProofs);return{manifest:structuredClone(d.manifest),binding:structuredClone(d.binding),documents:[...l.documents,...d.documents].map(cloneDoc),...flags}}
export function buildFcfG1RemainderFinalReceipt({rawProof}){
 const d=children.get(rawProof);if(!d)fail('private raw remainder proof required')
 return frozenJSON({schemaVersion:1,kind:'fcf-g1-remainder-final-receipt',preset:FCF_G1_REMAINDER_PROTOCOL,planSha256:d.plan.planSha256,ledgerSha256:d.plan.ledgerSha256,child:d.binding,status:d.manifest.status,accountingKnown:true,priorSourceGETs:d.manifest.priorSourceGETs,newSourceGETs:d.manifest.newSourceGETs,actualSourceGETs:d.manifest.actualSourceGETs,maximumCumulativeSourceGETs:478,firstSourceUTC:d.plan.firstSourceUTC,sourceFreshUntil:d.plan.sourceFreshUntil,...flags})
}
export function readFcfG1RemainderFinalReceipt({rawProof,...input}){
 const d=children.get(rawProof);if(!d||input.run?.status!=='completed'||!['success','failure'].includes(input.run?.conclusion)||String(input.run.id)!==d.binding.runId||input.expected?.sourceCommit!==d.plan.sourceCommit||!actor(input.run?.actor)||!actor(input.run?.triggering_actor))fail('private terminal raw child required')
 verifyFcfG1TerminalJobInventory({run:input.run,jobs:input.jobs,execution:{repository,workflow,ref:'refs/heads/main',sourceCommit:d.plan.sourceCommit,runId:d.binding.runId,runAttempt:'1'}})
 verifyInventoryExecution({...input,jobName:'missing-inventory-receipt',stepNames:['Retain final FCF inventory receipt'],artifactName:`fcf-missing-inventory-final-${d.binding.runId}-1`,runPhase:'inventory-record'})
 const files=readInventoryZip({...input,members:{'manifest.json':8388608}}),m=jsonBytes(files.get('manifest.json'),'remainder final receipt');if(!same(m,buildFcfG1RemainderFinalReceipt({rawProof})))fail('actual final source accounting differs');finalized.set(rawProof,structuredClone(input.expected));return rawProof
}
