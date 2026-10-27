import {proveFcfFutureSourceDocument} from './fcf-future-source-proof.mjs'
import {validateFcfSingleReportSource} from './viri/fcf.mjs'
import {deriveFcfSixInventoryHeader,validateFcfSixInventoryHeaders} from './fcf-six-source-proof.mjs'
import {readFcfSixAccounting} from './fcf-six-accounting.mjs'
import {validateFcfSixContinuationPlan} from './fcf-six-continuation-plan.mjs'
import {FCF_SIX_SOURCE_POLICY} from './fcf-six-historical-policy.mjs'
// Explicit staged/continuation/final raw evidence protocols. No network or DB client.
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {deriveFcfInventoryHeader,validateFcfInventoryHeaders} from './fcf-missing-inventory-plan.mjs'
import {requireFcfInventoryConsumption,readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
import {proveFcfCurrentReleaseDocument,proveFcfG9FreshReleaseDocument,proveFcfSixReleaseDocument,validateFcfCurrentReleaseCalendar} from './fcf-historical-release.mjs'
import {inventoryFail as fail,exactKeys,rawSha256,jsonBytes,validUTC,frozenJSON,verifyInventoryExecution,readInventoryZip,nativeId} from './fcf-missing-inventory-artifact.mjs'
import {validateFcfInventorySourcePlan,isFcfG9HeldParentPlan,isFcfIndependentSourcePlan,isFcfSixPlan,isFcfFutureSourcePlan,fcfInventorySeedBinding} from './fcf-inventory-source-protocol.mjs'
import {readFcfHeldParentAccounting} from './fcf-held-parent-accounting.mjs'
import {validateFcfG9HeldParentPlan} from './fcf-g9-held-parent-plan.mjs'
const futureStages=new WeakMap()
const sixContinuations=new WeakMap(),stages=new WeakMap(),children=new WeakMap(),continuations=new WeakMap(),finalReceipts=new WeakMap(),finals=new WeakMap(),audited=new WeakMap(),targets=new WeakMap()
const equal=(a,b)=>hash(a)===hash(b),clone=value=>structuredClone(value)
const steps=['Capture missing target inventory','Retain complete target inventory','Audit retained target inventory offline','Retain target inventory offline audit']
const manifestKeys='schemaVersion kind status statisticsAudit preset targetSlug competitionId sourceCode season planSha256 childPlanSha256 sourceCommit execution claimBinding consumptionBinding seedBinding policyHashes limits maximumSourceGETs priorSourceGETs actualSourceGETs firstSourceUTC lastCompletedUTC startedUTC endedUTC stopReason attempts documents'.split(' ')
const docKeys='id kind artifactFile bytes rawSha256 receipt header validation'.split(' ')
const receiptKeys='sequence id targetSlug sourceUrl method startedUTC headersUTC capturedUTC httpStatus responseURL redirected responseHeaders bodyState bytes rawSha256 prefixBytes prefixSha256 artifactFile'.split(' ')
const consumptionBinding=p=>({artifactId:p.artifactId,artifactDigest:p.artifactDigest,manifestSha256:p.manifestSha256,runId:p.runId,runAttempt:p.runAttempt,jobId:p.jobId,claimRef:p.claimRef,claimCommit:p.claimCommit,claimJsonSha256:p.claimJsonSha256})
const childJob=slug=>`missing-inventory-${slug==='es-ct-segona-g1'?'g1':'g9'}`
function scope(input,future=false){if(isFcfFutureSourcePlan(input?.plan)!==future)fail('future source requires its separate evidence admission');const {plan,targetSlug,expected,consumptionProof,now=Date.now()}=input,p=requireFcfInventoryConsumption(consumptionProof),child=validateFcfInventorySourcePlan({plan,expectedPlanSha256:expected?.planSha256??plan?.planSha256,now}).find(c=>c.targetSlug===targetSlug);if(!child||p.planSha256!==plan.planSha256||p.sourceCommit!==plan.sourceCommit)fail('exact target/consumption required');return{child,consumption:p,now}}
function bindingMatches(m,child,input,consumption,future=false){
 exactKeys(m,[...manifestKeys,...(isFcfIndependentSourcePlan(input.plan)?['sourceClearanceUTC']:[])],'inventory manifest')
 const {plan,expected}=input,e=m.execution
 exactKeys(e,['repository','workflow','ref','sourceCommit','runId','runAttempt','jobId'],'inventory execution')
 if(m.schemaVersion!==(future?4:isFcfSixPlan(plan)?3:isFcfIndependentSourcePlan(plan)?2:1)||m.kind!==(future?'fcf-future-source-inventory':isFcfSixPlan(plan)?'fcf-six-inventory':isFcfIndependentSourcePlan(plan)?'fcf-g9-held-parent-inventory':'fcf-missing-target-inventory')||m.statisticsAudit!=='not-run'||m.preset!==plan.preset||m.targetSlug!==child.targetSlug||m.competitionId!==child.competitionId||m.sourceCode!==child.sourceCode||m.season!=='2026/27'||m.planSha256!==plan.planSha256||m.childPlanSha256!==child.childPlanSha256||expected.childPlanSha256!==child.childPlanSha256||m.sourceCommit!==plan.sourceCommit||m.maximumSourceGETs!==child.maximumSourceGETs||!equal(m.seedBinding,fcfInventorySeedBinding(plan))||!equal(m.policyHashes,plan.policyHashes)||!equal(m.limits,plan.limits)||!equal(m.consumptionBinding,consumptionBinding(consumption))||!equal(m.claimBinding,{claimRef:consumption.claimRef,claimCommit:consumption.claimCommit,claimJsonSha256:consumption.claimJsonSha256})||e.repository!=='Lovro-splichal-orhanizagi/mnzgorenjska'||e.workflow!=='.github/workflows/uvoz-fcf-zgodovina.yml'||e.ref!=='refs/heads/main'||e.sourceCommit!==plan.sourceCommit||e.runId!==expected.runId||e.runId!==consumption.runId||e.runAttempt!=='1'||e.jobId!==expected.jobId)fail('inventory plan/execution/claim binding differs')
}
function rawDocument(m,doc,bytes,originalDescriptor){const original=doc.kind==='reviewed-original',receipt=original?{id:doc.id,competitionSlug:m.targetSlug,sourceUrl:doc.receipt.sourceUrl??doc.receipt.url,startedUTC:doc.receipt.startedUTC,capturedUTC:doc.receipt.capturedUTC??doc.receipt.endedUTC,cacheMtimeUTC:null,bytes:doc.bytes,rawSha256:doc.rawSha256}:{id:doc.id,competitionSlug:m.targetSlug,sourceUrl:doc.receipt.sourceUrl,startedUTC:doc.receipt.startedUTC,capturedUTC:doc.receipt.capturedUTC,cacheMtimeUTC:null,bytes:doc.bytes,rawSha256:doc.rawSha256};return{id:doc.id,expectedSourceRound:doc.header.round,html:bytes.toString('utf8'),receipt,lineage:original?(originalDescriptor?.lineage??{kind:'reviewed-original',sourceCommit:m.seedBinding.sourceCaptureCommit}):null}}
function prove(ctx,now){const c={id:ctx.manifest.competitionId,slug:ctx.manifest.targetSlug,source:'fcf',source_policy:isFcfSixPlan(ctx.plan)?FCF_SIX_SOURCE_POLICY:'es-fcf-reviewed-history-v1',source_league_code:ctx.manifest.sourceCode,active:false,sezona_koledarska:false,firstFantasyPlayedOn:'2026-10-24'},fixtures=ctx.documents.map(d=>(isFcfSixPlan(ctx.plan)?proveFcfSixReleaseDocument:isFcfIndependentSourcePlan(ctx.plan)?proveFcfG9FreshReleaseDocument:proveFcfCurrentReleaseDocument)({competition:c,document:d,now}));return{fixtures,calendar:validateFcfCurrentReleaseCalendar(fixtures)}}
function readChild(input,diagnostic=false,future=false){
 const {child,consumption,now}=scope(input,future),{artifact,run,jobs,expected,zipBytes,plan}=input,artifactName=`fcf-missing-inventory-${diagnostic?'diagnostic-':''}${child.targetSlug}-${expected.runId}-1`
 if(expected.runAttempt!=='1'||expected.runId!==consumption.runId||expected.sourceCommit!==plan.sourceCommit)fail('reserved artifact execution differs')
 const binding=verifyInventoryExecution({artifact,run,jobs,expected,jobName:childJob(child.targetSlug),stepNames:diagnostic?['Retain failed target inventory diagnostic']:steps.slice(0,2),artifactName,runPhase:'inventory-record',jobPhase:diagnostic?'diagnostic':'captured-uploaded'})
 const ids=[...child.fetchIds,...child.reuse.map(d=>d.id)],members={'manifest.json':plan.limits.maximumManifestBytes,...Object.fromEntries(ids.map(id=>[`acta-${id}.html`,plan.limits.maximumBodyBytes])),...(diagnostic?Object.fromEntries(child.fetchIds.map(id=>[`prefix-${id}.bin`,plan.limits.maximumBodyBytes])):{})},files=readInventoryZip({zipBytes,artifact,expected,members,allowMissing:diagnostic}),m=jsonBytes(files.get('manifest.json'),'inventory manifest')
 bindingMatches(m,child,input,consumption,future)
 if(m.status!==(diagnostic?'failed':'inventory-complete')||(diagnostic?!m.stopReason:m.stopReason!==null))fail('complete/diagnostic inventory status differs')
 if(!Array.isArray(m.attempts)||!Number.isInteger(m.actualSourceGETs)||m.actualSourceGETs<0||m.actualSourceGETs>child.maximumSourceGETs||m.actualSourceGETs!==m.attempts.length||!diagnostic&&m.actualSourceGETs!==child.maximumSourceGETs||m.priorSourceGETs!==(future?37:isFcfSixPlan(plan)?22+(child.targetSlug==='es-ct-segona-g1'?requireFcfSixSourceContinuation(input.continuationProof).actualSourceGETs:0):isFcfIndependentSourcePlan(plan)?16:child.targetSlug==='es-ct-segona-g1'?0:239)||m.priorSourceGETs+m.actualSourceGETs>((future||isFcfSixPlan(plan))?478:477)||!Array.isArray(m.documents)||m.documents.length!==240||!validUTC(m.startedUTC)||!validUTC(m.endedUTC)||Date.parse(m.startedUTC)>Date.parse(m.endedUTC)||Date.parse(m.endedUTC)>now)fail('inventory attempts/clock/closed membership differs')
 if(isFcfSixPlan(plan)&&child.targetSlug==='es-ct-segona-g1'&&m.sourceClearanceUTC!==requireFcfSixSourceContinuation(input.continuationProof).sourceClearanceUTC)fail('global six source window cannot restart');
 if(isFcfIndependentSourcePlan(plan)){if(!validUTC(m.sourceClearanceUTC)||Date.parse(m.sourceClearanceUTC)>Date.parse(m.startedUTC)||Date.parse(m.sourceClearanceUTC)<Date.parse(consumption.consumedUTC)||Date.parse(m.sourceClearanceUTC)<Date.parse(plan.createdUTC))fail('actual source clearance clock differs');if((!isFcfSixPlan(plan)||child.targetSlug==='es-ct-tercera-g9')&&input.continuationProof!==undefined||consumption.protocol!==plan.preset||consumption.accountingSha256!==hash(plan.accountingBinding))fail('new G9 requires its own accounted consumption without G1 continuation')}
 else if(child.targetSlug==='es-ct-tercera-g9'){const prior=requireFcfInventoryContinuation(input.continuationProof);if(prior.planSha256!==plan.planSha256||prior.runId!==expected.runId||prior.claimCommit!==consumption.claimCommit||prior.firstSourceUTC!==m.firstSourceUTC||Date.parse(m.startedUTC)<Date.parse(prior.lastCompletedUTC))fail('actual G1 clock/count continuation differs')}
 if(m.actualSourceGETs&&(!validUTC(m.firstSourceUTC)||!validUTC(m.lastCompletedUTC)||Date.parse(m.lastCompletedUTC)>Date.parse(m.endedUTC)||Date.parse(m.firstSourceUTC)>Date.parse(m.lastCompletedUTC)))fail('individual source window stamps differ')
 let previousEnd=isFcfSixPlan(plan)&&child.targetSlug==='es-ct-segona-g1'?Date.parse(requireFcfSixSourceContinuation(input.continuationProof).lastCompletedUTC):!isFcfIndependentSourcePlan(plan)&&child.targetSlug==='es-ct-tercera-g9'?Date.parse(requireFcfInventoryContinuation(input.continuationProof).lastCompletedUTC):null;const attempted=new Map()
 for(const[a,attempt]of m.attempts.entries()){
  exactKeys(attempt,['sequence','id','targetSlug','sourceUrl','method','startedUTC'],'source attempt')
  if(attempt.id!==child.fetchIds[a]||attempt.sequence!==m.priorSourceGETs+a+1||attempt.targetSlug!==child.targetSlug||attempt.sourceUrl!==`https://www.fcf.cat/ca/competicio/acta/${attempt.id}`||attempt.method!=='GET'||!validUTC(attempt.startedUTC)||Date.parse(attempt.startedUTC)<Date.parse(m.firstSourceUTC)||isFcfIndependentSourcePlan(plan)&&Date.parse(attempt.startedUTC)<Date.parse(m.startedUTC)||Date.parse(attempt.startedUTC)-Date.parse(isFcfIndependentSourcePlan(plan)?m.sourceClearanceUTC:m.firstSourceUTC)+105000>plan.limits.sourceWindowMs||a===0&&(m.priorSourceGETs===0||isFcfIndependentSourcePlan(plan))&&attempt.startedUTC!==m.firstSourceUTC)fail('ordered native source attempt differs')
  attempted.set(attempt.id,attempt)
 }
 let providerSafe=true;const headers=[],documents=[],expectedNames=new Set(['manifest.json']),start=Number(child.sourceCode.split('-')[0])
 for(const[i,doc]of m.documents.entries()){
  exactKeys(doc,docKeys,'raw document')
  if(doc.id!==String(start+i))fail('closed native source ID order differs')
  const original=child.reuse.find(r=>r.id===doc.id),attempt=attempted.get(doc.id)
  if(original){if(doc.kind!=='reviewed-original'||!equal(doc.receipt,original.receipt)||doc.bytes!==original.bytes||doc.rawSha256!==original.rawSha256||doc.artifactFile!==original.artifactFile)fail('immutable original source receipt differs')}
  else if(!attempt){if(!diagnostic||doc.kind!=='not-attempted'||docKeys.filter(k=>!['id','kind'].includes(k)).some(k=>doc[k]!==null))fail('unattempted source cannot become proof');continue}
  else {
   if(doc.kind!=='captured')fail('attempt lacks corresponding captured descriptor')
   const r=doc.receipt;exactKeys(r,receiptKeys,'source receipt')
   if(r.responseHeaders!==null){exactKeys(r.responseHeaders,['contentType','contentEncoding','contentLength','date','lastModified'],'response headers');if(Object.values(r.responseHeaders).some(v=>v!==null&&(typeof v!=='string'||v.length>160)))fail('bounded response headers differ')}
   exactKeys(doc.validation,['header','earlyStrictCheck','reason'],'source validation')
   if(r.id!==doc.id||r.sequence!==attempt.sequence||r.targetSlug!==child.targetSlug||r.sourceUrl!==attempt.sourceUrl||r.method!=='GET'||r.startedUTC!==attempt.startedUTC||r.artifactFile!==doc.artifactFile)fail('actual attempt/receipt binding differs')
   if(r.headersUTC!==null&&(!validUTC(r.headersUTC)||Date.parse(r.headersUTC)<Date.parse(r.startedUTC)))fail('actual headers timestamp differs')
   if(r.bodyState==='complete'){
    if(isFcfIndependentSourcePlan(plan)&&!validUTC(r.headersUTC))fail('new G9 complete body requires actual headers clock')
    if(!validUTC(r.capturedUTC)||Date.parse(r.capturedUTC)<Date.parse(r.headersUTC)||Date.parse(r.capturedUTC)>Date.parse(m.lastCompletedUTC)||Date.parse(r.capturedUTC)>Date.parse(m.endedUTC)||r.bytes!==doc.bytes||r.rawSha256!==doc.rawSha256||r.prefixBytes!==null||r.prefixSha256!==null||r.artifactFile!==`acta-${doc.id}.html`)fail('complete body receipt/hash/time differs')
   }else if(r.bodyState==='truncated'){if(!diagnostic||r.capturedUTC!==null||r.rawSha256!==null||r.bytes!==null||doc.rawSha256!==null||r.prefixBytes!==doc.bytes||r.artifactFile!==`prefix-${doc.id}.bin`)fail('partial source cannot claim complete body')}
   else if(r.bodyState!=='unavailable'||!diagnostic||doc.artifactFile!==null||doc.bytes!==null||doc.rawSha256!==null)fail('unavailable source cannot become proof')
   const position=child.fetchIds.indexOf(doc.id),last=position===m.actualSourceGETs-1
   if(previousEnd!==null&&Date.parse(r.startedUTC)<previousEnd+3000)fail('actual global source pacing differs')
   previousEnd=Date.parse(r.capturedUTC??r.headersUTC??r.startedUTC)
   if(!diagnostic&&(r.httpStatus!==200||r.redirected!==false||r.responseURL!==r.sourceUrl||r.bodyState!=='complete'))fail('refused/redirected/partial source cannot enter inventory')
   if(diagnostic&&!last&&(r.httpStatus!==200||r.redirected||r.bodyState!=='complete'))fail('source request continued after earlier refusal')
  }
  if(doc.artifactFile===null)continue
  const bytes=files.get(doc.artifactFile),digest=doc.receipt?.bodyState==='truncated'?doc.receipt.prefixSha256:doc.rawSha256
  expectedNames.add(doc.artifactFile)
  if(!Buffer.isBuffer(bytes)||bytes.length!==doc.bytes||bytes.length>plan.limits.maximumBodyBytes||rawSha256(bytes)!==digest)fail('retained raw source bytes/hash differ')
  if((future||isFcfSixPlan(plan))&&!original){try{if(doc.receipt.bodyState!=='complete'||doc.receipt.httpStatus!==200)throw Error('untrusted source');validateFcfSingleReportSource(bytes.toString('utf8'),child.sourceCode,{id:`es${doc.id}`,tekmovanje:{slug:child.targetSlug,source:'fcf',source_league_code:child.sourceCode,sezona_koledarska:false},sezona:'2026/27',danes:now})}catch{providerSafe=false}}
  // Refusals stop before header parsing. Retain/hash their last body without
  // turning recognizable error-page content into a successful source header.
  if(diagnostic&&!original&&doc.id===child.fetchIds[m.actualSourceGETs-1]){
   const r=doc.receipt,status=r.httpStatus,redirect=r.redirected===true||typeof r.responseURL==='string'&&r.responseURL!==r.sourceUrl||status>=300&&status<400,reason=redirect?'redirect':[401,403,429].includes(status)?'source-refusal':Number.isInteger(status)&&status>=100&&status<=599&&status!==200?'http-status':null
   if(reason){if(!validUTC(r.headersUTC)||!Number.isInteger(status)||status<100||status>599||typeof r.responseURL!=='string'||!r.responseURL||typeof r.redirected!=='boolean'||m.stopReason!==reason||doc.header!==null||!equal(doc.validation,{header:'not-run',earlyStrictCheck:'not-run',reason:null}))fail('refused diagnostic cannot claim a parsed header');continue}
  }
  let header
  try{header=(isFcfSixPlan(plan)?deriveFcfSixInventoryHeader:deriveFcfInventoryHeader)({targetSlug:child.targetSlug,id:doc.id,bytes})}catch(error){if(!diagnostic||original||doc.id!==child.fetchIds[m.actualSourceGETs-1])throw error;continue}
  if(!equal(header,doc.header))fail('stored header differs from actual source')
  headers.push(header)
  const document=rawDocument(m,doc,bytes,original);if(!original)document.lineage={kind:'actions-artifact',verified:true,repository:'Lovro-splichal-orhanizagi/mnzgorenjska',workflow:'.github/workflows/uvoz-fcf-zgodovina.yml',runId:binding.runId,artifactId:binding.artifactId,artifactDigest:binding.artifactDigest,commit:binding.retentionCommit}
  documents.push(document)
 }
 if(files.size!==expectedNames.size||[...files.keys()].some(name=>!expectedNames.has(name)))fail('unreferenced or missing artifact member')
 (isFcfSixPlan(plan)?validateFcfSixInventoryHeaders:validateFcfInventoryHeaders)({targetSlug:child.targetSlug,headers,complete:!diagnostic})
 return{future,manifest:clone(m),documents,binding,providerSafe,plan:isFcfIndependentSourcePlan(plan)?plan:clone(plan),consumption,child,now,input}
}
export function readFcfMissingInventoryStagingArtifact(input){const ctx=readChild(input),m=ctx.manifest,proof=frozenJSON({kind:'fcf-missing-inventory-staged-proof',targetSlug:m.targetSlug,planSha256:m.planSha256,statisticsAudit:'not-run',binding:clone(ctx.binding),actualSourceGETs:m.actualSourceGETs,firstSourceUTC:m.firstSourceUTC,lastCompletedUTC:m.lastCompletedUTC});stages.set(proof,ctx);return proof}
export function auditFcfMissingInventoryOffline({stagingProof,policyHashes,now=Date.now()}){const ctx=stages.get(stagingProof);if(!ctx||!equal(policyHashes,ctx.plan.policyHashes)||!Number.isFinite(now))fail('authenticated staged inventory/current policies required');const {fixtures,calendar}=prove(ctx,now),m=ctx.manifest;return frozenJSON({schemaVersion:1,kind:'fcf-missing-inventory-offline-audit',status:'passed',targetSlug:m.targetSlug,sourceCommit:m.sourceCommit,planSha256:m.planSha256,childPlanSha256:m.childPlanSha256,auditedUTC:new Date(now).toISOString(),execution:clone(m.execution),inventoryBinding:clone(ctx.binding),policyHashes:clone(policyHashes),canonicalSha256:hash(fixtures),calendarSha256:hash(calendar)})}
export function readFcfMissingInventoryCompletedChildArtifact(input){
 const {inventoryMetadata,auditMetadata,inventoryZipBytes,auditZipBytes,plan,consumptionProof,continuationProof,now=Date.now()}=input,targetSlug=inventoryMetadata?.expected?.name?.match(/^fcf-missing-inventory-(es-ct-(?:segona-g1|tercera-g9))-\d+-1$/)?.[1]
 const staged=readFcfMissingInventoryStagingArtifact({...inventoryMetadata,zipBytes:inventoryZipBytes,plan,targetSlug,consumptionProof,continuationProof,now}),ctx=stages.get(staged),e=auditMetadata?.expected,jobName=childJob(targetSlug)
 const inventoryJob=inventoryMetadata.jobs.filter(j=>j.name===jobName)
 if(inventoryJob.length!==1||inventoryJob[0].status!=='completed'||inventoryJob[0].conclusion!=='success')fail('successful complete target job required for continuation')
 const binding=verifyInventoryExecution({...auditMetadata,expected:e,jobName,stepNames:steps,artifactName:`fcf-missing-inventory-audit-${targetSlug}-${e?.runId}-1`,runPhase:'inventory-record'})
 if(binding.runId!==ctx.binding.runId||binding.runAttempt!=='1'||binding.jobId!==ctx.binding.jobId||binding.retentionCommit!==ctx.binding.retentionCommit)fail('audit and inventory execution differs')
 const files=readInventoryZip({zipBytes:auditZipBytes,artifact:auditMetadata.artifact,expected:e,members:{'manifest.json':8*1024*1024}}),a=jsonBytes(files.get('manifest.json'),'offline audit manifest')
 if(!validUTC(a.auditedUTC)||Date.parse(a.auditedUTC)>now||!equal(a,auditFcfMissingInventoryOffline({stagingProof:staged,policyHashes:plan.policyHashes,now:Date.parse(a.auditedUTC)})))fail('actual offline audit cannot be independently reproduced')
 prove(ctx,now)
 const proof=frozenJSON({kind:'fcf-missing-inventory-completed-child-proof',targetSlug,planSha256:plan.planSha256,sourceCommit:plan.sourceCommit,runId:ctx.binding.runId,runAttempt:'1',claimCommit:ctx.consumption.claimCommit,status:'audited',actualSourceGETs:ctx.manifest.actualSourceGETs,firstSourceUTC:ctx.manifest.firstSourceUTC,lastCompletedUTC:ctx.manifest.lastCompletedUTC,stopReason:null,inventoryBinding:clone(ctx.binding),auditBinding:binding})
 children.set(proof,{ctx,staged,audit:a,auditBinding:binding});return proof
}
export function readFcfMissingInventoryContinuation(input){const child=readFcfMissingInventoryCompletedChildArtifact(input);if(child.targetSlug!=='es-ct-segona-g1')fail('only completed G1 permits fixed G9 continuation');const proof=frozenJSON({...child,kind:'fcf-missing-inventory-continuation-proof'});continuations.set(proof,children.get(child));return proof}
export function requireFcfInventoryContinuation(proof){if(!continuations.has(proof))fail('authenticated completed G1 source continuation required');return proof}
export function readFcfMissingInventoryDiagnosticArtifact(input){const ctx=readChild(input,true),m=ctx.manifest;const proof=frozenJSON({kind:'fcf-missing-inventory-diagnostic-proof',targetSlug:m.targetSlug,planSha256:m.planSha256,sourceCommit:m.sourceCommit,runId:ctx.binding.runId,runAttempt:'1',claimCommit:ctx.consumption.claimCommit,status:'failed',actualSourceGETs:m.actualSourceGETs,firstSourceUTC:m.firstSourceUTC,lastCompletedUTC:m.lastCompletedUTC,stopReason:m.stopReason,inventoryBinding:ctx.binding,auditBinding:null});children.set(proof,{ctx});return proof}
export function buildFcfMissingInventoryFinalReceipt({plan,claimProof,consumptionProof,childRecords,execution,now=Date.now()}){
 if(isFcfFutureSourcePlan(plan))fail('future source requires its separate evidence admission')
 const p=requireFcfInventoryConsumption(consumptionProof),g9=isFcfIndependentSourcePlan(plan),six=isFcfSixPlan(plan)
 validateFcfInventorySourcePlan({plan,expectedPlanSha256:plan?.planSha256,now})
 exactKeys(execution,['repository','workflow','ref','sourceCommit','runId','runAttempt','jobId'],'final receipt execution')
 if(execution.repository!=='Lovro-splichal-orhanizagi/mnzgorenjska'||execution.workflow!=='.github/workflows/uvoz-fcf-zgodovina.yml'||execution.ref!=='refs/heads/main')fail('exact final receipt repository/workflow required')
 if(!claimProof||claimProof.claimCommit!==p.claimCommit||claimProof.planSha256!==plan.planSha256||!Array.isArray(childRecords)||childRecords.length!==(!six&&g9?1:2)||execution.runId!==p.runId||execution.runAttempt!=='1'||execution.sourceCommit!==plan.sourceCommit||!nativeId(execution.jobId))fail('actual parent claim/child records required')
 const summaries=childRecords.map((proof,i)=>{if(!children.has(proof)||proof.planSha256!==plan.planSha256||proof.runId!==p.runId||proof.claimCommit!==p.claimCommit||proof.targetSlug!==(!six&&g9?plan.child:plan.children[i]).targetSlug)fail('authenticated ordered child record required');const {kind,...summary}=proof;return clone(summary)})
 const newSourceGETs=summaries.reduce((n,c)=>n+c.actualSourceGETs,0),actualSourceGETs=(six?22:g9?16:0)+newSourceGETs
 if(actualSourceGETs>(six?478:477)||g9&&newSourceGETs>(six?456:240)||!g9&&summaries[1].actualSourceGETs>0&&summaries[0].status!=='audited')fail('source continued after failed G1')
 return frozenJSON({schemaVersion:six?3:g9?2:1,kind:six?'fcf-six-final-receipt':g9?'fcf-g9-held-parent-final-receipt':'fcf-missing-inventory-final-receipt',...(g9?{protocol:plan.preset,priorSourceGETs:plan.priorSourceGETs,newSourceGETs,accountingBinding:clone(plan.accountingBinding)}:{}),planSha256:plan.planSha256,sourceCommit:plan.sourceCommit,execution:clone(execution),claimBinding:{claimRef:p.claimRef,claimCommit:p.claimCommit,claimJsonSha256:p.claimJsonSha256},consumptionBinding:consumptionBinding(p),completedUTC:new Date(now).toISOString(),children:summaries,actualSourceGETs,admissible:six?childRecords.every(proof=>sixChildSafe(proof))&&summaries.some(c=>c.status==='audited'):g9?newSourceGETs===240&&summaries.every(c=>c.status==='audited'):summaries.some(c=>c.status==='audited')})
}
export function readFcfMissingInventoryFinalReceipt(input){const {plan,claimProof,consumptionProof,childRecords,expected,now=Date.now()}=input,p=requireFcfInventoryConsumption(consumptionProof),binding=verifyInventoryExecution({...input,jobName:'missing-inventory-receipt',stepNames:['Retain final FCF inventory receipt'],artifactName:`fcf-missing-inventory-final-${p.runId}-1`,runPhase:'inventory-record'})
 if(input.run.status!=='completed'||expected.runId!==p.runId||expected.runAttempt!=='1')fail('terminal reserved parent required')
 const files=readInventoryZip({...input,members:{'manifest.json':8*1024*1024}}),m=jsonBytes(files.get('manifest.json'),'final receipt')
 if(!validUTC(m.completedUTC)||Date.parse(m.completedUTC)>now||!equal(m,buildFcfMissingInventoryFinalReceipt({plan,claimProof,consumptionProof,childRecords,execution:{...m.execution,jobId:binding.jobId},now:Date.parse(m.completedUTC)}))||!m.admissible)fail('immutable parent receipt cannot admit these children')
 const proof=frozenJSON({kind:'fcf-missing-inventory-final-receipt-proof',planSha256:plan.planSha256,runId:p.runId,runAttempt:'1',binding,actualSourceGETs:m.actualSourceGETs,children:clone(m.children)});finalReceipts.set(proof,{manifest:clone(m),childRecords:[...childRecords]});return proof}
export function readFcfMissingInventoryArtifact(input){const receipt=finalReceipts.get(input.finalReceipt);if(!receipt||input.run?.status!=='completed')fail('terminal authenticated final receipt required');const ctx=readChild(input);verifyInventoryExecution({...input,jobName:childJob(ctx.manifest.targetSlug),stepNames:steps,artifactName:input.expected.name,runPhase:'inventory-record'});const summary=receipt.manifest.children.find(c=>c.targetSlug===ctx.manifest.targetSlug);if(!summary||summary.status!=='audited'||!equal(summary.inventoryBinding,ctx.binding))fail('selected child is not finally audited');const child=receipt.childRecords.find(c=>c.targetSlug===ctx.manifest.targetSlug),record=children.get(child);if(!record?.audit)fail('complete authenticated offline child audit required');prove(ctx,input.now??Date.now());const proof=frozenJSON({kind:'fcf-missing-inventory-final-proof',targetSlug:ctx.manifest.targetSlug,planSha256:ctx.plan.planSha256,binding:clone(ctx.binding),receiptBinding:clone(input.finalReceipt.binding)});finals.set(proof,{ctx,record,receipt:receipt.manifest,receiptBinding:clone(input.finalReceipt.binding)});return proof}
export function readFcfMissingInventoryAuditArtifact({inventoryProof,...input}){const final=finals.get(inventoryProof);if(input.run?.status!=='completed')fail('terminal parent required for final audit');if(!final)fail('final-admitted inventory proof required');const binding=verifyInventoryExecution({...input,jobName:childJob(final.ctx.manifest.targetSlug),stepNames:steps,artifactName:`fcf-missing-inventory-audit-${final.ctx.manifest.targetSlug}-${final.ctx.binding.runId}-1`,runPhase:'inventory-record'});if(!equal(binding,final.record.auditBinding))fail('final offline audit artifact differs');const files=readInventoryZip({...input,members:{'manifest.json':8*1024*1024}});if(!equal(jsonBytes(files.get('manifest.json'),'final offline audit'),final.record.audit))fail('final offline audit bytes differ');prove(final.ctx,input.now??Date.now());const proof=frozenJSON({kind:'fcf-missing-inventory-audited-proof',targetSlug:inventoryProof.targetSlug,inventoryBinding:clone(final.ctx.binding),binding});audited.set(proof,final);return proof}
/** Authenticated job metadata proves that its sole source step never ran. */
export function readFcfMissingInventoryNotStartedChild({plan,targetSlug,run,jobs,expected,consumptionProof,now=Date.now()}){
 const p=requireFcfInventoryConsumption(consumptionProof),child=validateFcfInventorySourcePlan({plan,expectedPlanSha256:expected?.planSha256,now}).find(c=>c.targetSlug===targetSlug),matching=jobs?.filter(j=>j.name===childJob(targetSlug)),job=matching?.[0]
 if(!child||!expected||run?.path!=='.github/workflows/uvoz-fcf-zgodovina.yml'||run.repository?.full_name!=='Lovro-splichal-orhanizagi/mnzgorenjska'||String(run.id)!==p.runId||run.run_attempt!==1||run.head_sha!==plan.sourceCommit||!['in_progress','completed'].includes(run.status)||matching?.length!==1||String(job.id)!==expected.jobId||String(job.run_id)!==p.runId||job.run_attempt!==1||job.head_sha!==plan.sourceCommit||job.status!=='completed'||!['skipped','failure'].includes(job.conclusion)||!Array.isArray(job.steps))fail('actual unstarted source child metadata required')
 const capture=job.steps.filter(s=>s.name===steps[0]);if(job.conclusion==='skipped'?capture.some(s=>s.status!=='completed'||s.conclusion!=='skipped'):capture.length!==1||capture[0].status!=='completed'||capture[0].conclusion!=='skipped')fail('unknown source attempt count; cannot claim zero')
 const proof=frozenJSON({kind:'fcf-missing-inventory-unstarted-child-proof',targetSlug,planSha256:plan.planSha256,sourceCommit:plan.sourceCommit,runId:p.runId,runAttempt:'1',claimCommit:p.claimCommit,status:'not-started',actualSourceGETs:0,firstSourceUTC:null,lastCompletedUTC:null,stopReason:'source-not-started',inventoryBinding:null,auditBinding:null});children.set(proof,{job:clone(job)});return proof
}
export function readFcfMissingInventoryFailedAuditArtifact(input){
 const staged=readFcfMissingInventoryStagingArtifact(input),ctx=stages.get(staged),job=input.jobs.find(j=>j.name===childJob(ctx.manifest.targetSlug)),auditSteps=job?.steps.filter(s=>s.name===steps[2])
 if(job?.status!=='completed'||job.conclusion!=='failure'||auditSteps.length!==1||auditSteps[0].status!=='completed'||auditSteps[0].conclusion!=='failure')fail('actual failed offline audit job required')
 const m=ctx.manifest,proof=frozenJSON({kind:'fcf-missing-inventory-failed-audit-proof',targetSlug:m.targetSlug,planSha256:m.planSha256,sourceCommit:m.sourceCommit,runId:ctx.binding.runId,runAttempt:'1',claimCommit:ctx.consumption.claimCommit,status:'failed',actualSourceGETs:m.actualSourceGETs,firstSourceUTC:m.firstSourceUTC,lastCompletedUTC:m.lastCompletedUTC,stopReason:'offline-audit-failed',inventoryBinding:ctx.binding,auditBinding:null});children.set(proof,{ctx});return proof
}

/** Reusable capability from the matching terminal inventory and offline-audit readers. */
export function composeFcfCapturedTargetEvidence({inventoryProof,auditProof,targetSlug,now=Date.now()}){
 const final=finals.get(inventoryProof)
 if(!final||audited.get(auditProof)!==final||!['es-ct-segona-g1','es-ct-tercera-g9'].includes(targetSlug)||final.ctx.manifest.targetSlug!==targetSlug||!Number.isFinite(now))fail('matching final inventory/audit target admission required')
 validateFcfInventorySourcePlan({plan:final.ctx.plan,expectedPlanSha256:final.ctx.manifest.planSha256,now});prove(final.ctx,now)
 const m=final.ctx.manifest,competition={id:m.competitionId,slug:targetSlug,source:'fcf',source_policy:isFcfSixPlan(final.ctx.plan)?FCF_SIX_SOURCE_POLICY:'es-fcf-reviewed-history-v1',source_league_code:m.sourceCode,active:false,sezona_koledarska:false,firstFantasyPlayedOn:'2026-10-24'},proof=frozenJSON({evidenceKind:'fcf-missing-target-inventory',targetSlug,competition,documents:clone(final.ctx.documents)})
 targets.set(proof,final);return proof
}
/** Returns only independently reparsed data from this reader's capability. */
export function getFcfCapturedTargetData({targetEvidence,targetSlug,now=Date.now()}){
 const final=targets.get(targetEvidence)
 if(!final||targetEvidence.evidenceKind!=='fcf-missing-target-inventory'||targetEvidence.targetSlug!==targetSlug||!Number.isFinite(now))fail('reader-issued inventory target admission required')
 const {ctx,record,receipt,receiptBinding}=final,m=ctx.manifest
 validateFcfInventorySourcePlan({plan:ctx.plan,expectedPlanSha256:m.planSha256,now})
 const {fixtures,calendar}=prove(ctx,now),headers=m.documents.map(d=>clone(d.header)),binding={schemaVersion:1,kind:'fcf-missing-target-admission',targetSlug,sourceCommit:m.sourceCommit,planSha256:m.planSha256,childPlanSha256:m.childPlanSha256,sourceClaimState:'consumed',maximumSourceGETs:isFcfSixPlan(ctx.plan)?478:477,actualSourceGETs:receipt.actualSourceGETs,claimBinding:clone(m.claimBinding),consumptionBinding:clone(m.consumptionBinding),seedBinding:clone(m.seedBinding),inventoryBinding:clone(ctx.binding),auditBinding:clone(record.auditBinding),finalReceiptBinding:clone(receiptBinding),policyHashes:clone(m.policyHashes),...(isFcfIndependentSourcePlan(ctx.plan)?{protocol:ctx.plan.preset,priorSourceGETs:ctx.plan.priorSourceGETs,newSourceGETs:receipt.newSourceGETs,accountingBinding:clone(ctx.plan.accountingBinding)}:{})}
 if(headers.length!==240||fixtures.length!==240||calendar.clubs.length!==16||headers.some((h,i)=>fixtures[i].id!==`es${h.id}`||fixtures[i].round!==h.round||fixtures[i].date!==h.playedOn||fixtures[i].time!==h.kickoff||fixtures[i].homeGoals!==h.homeGoals||fixtures[i].awayGoals!==h.awayGoals||[h.home,h.away].some((c,j)=>fixtures[i].clubs[j].sourceClubId!==c.sourceClubId||fixtures[i].clubs[j].sourceCategoryId!==c.sourceCategoryId||fixtures[i].clubs[j].name.replace(/\s+/g,' ').trim()!==c.name)))fail('authenticated header/fixture native bijection differs')
 binding.sourceFingerprintSha256=hash({binding,documents:ctx.documents.map((d,i)=>({id:d.id,expectedSourceRound:d.expectedSourceRound,receipt:d.receipt,lineage:d.lineage,header:headers[i]}))})
 return frozenJSON({evidenceKind:'fcf-missing-target-inventory',targetSlug,competition:clone(targetEvidence.competition),documents:clone(ctx.documents),headers,fixtures,clubs:calendar.clubs,verifiedKeeperClubs:calendar.verifiedKeeperClubs,binding})
}
function transportBundle(value,kind){
 exactKeys(value,['zipBytes','artifact','run','jobs','expected'],`${kind} transport`)
 exactKeys(value.expected,['runId','runAttempt','sourceCommit','jobId','artifactId','artifactDigest','manifestSha256','name',...(kind==='inventory'?['planSha256','childPlanSha256']:[])],`${kind} expected pins`)
 return value
}
/** Cross-process entrypoint: actual ZIPs/metadata and independently pinned identities, no callbacks. */
export function readFcfCapturedTargetEvidence(input){
 if(!input||typeof input!=='object')fail('closed target admission transport required')
 if(input.protocol==='six-reviewed-continuation-v1')return readFcfSixTargetEvidence(input)
 if(input.protocol==='g9-only-after-held-parent-v1')return readFcfG9HeldParentTargetEvidence(input)
 exactKeys(input,['plan','claim','consumption','children','finalReceipt','targetSlug',...(Object.hasOwn(input,'now')?['now']:[])],'target admission transport')
 const {plan,claim,consumption,children:wire,finalReceipt:receiptWire,targetSlug,now=Date.now()}=input
 if(isFcfIndependentSourcePlan(plan)||!['es-ct-segona-g1','es-ct-tercera-g9'].includes(targetSlug)||!Number.isFinite(now)||!Array.isArray(wire)||wire.length!==2)fail('one allowlisted target and two closed parent records required')
 exactKeys(claim,['execution','ref','claimCommit','claimBytes','rulesets','expected'],'claim transport')
 exactKeys(claim.expected,['claimCommit','claimJsonSha256','rulesetId','planSha256','sourceCommit','runId','runAttempt'],'claim expected pins')
 const claimProof=readFcfInventoryExecutionClaim({...claim,plan,now}),consumptionProof=readFcfInventoryConsumptionArtifact({...transportBundle(consumption,'consumption'),claimProof,now}),childRecords=[]
 let continuationProof
 for(const [i,raw]of wire.entries()){
  exactKeys(raw,['targetSlug','inventory','audit','unstarted'],'parent child transport')
  if(raw.targetSlug!==plan.children[i].targetSlug)fail('ordered exact parent targets required')
  let child
  if(raw.inventory===null){if(raw.audit!==null)fail('unstarted child cannot have audit');exactKeys(raw.unstarted,['run','jobs','expected'],'unstarted transport');exactKeys(raw.unstarted.expected,['planSha256','jobId'],'unstarted pins');child=readFcfMissingInventoryNotStartedChild({...raw.unstarted,plan,targetSlug:raw.targetSlug,consumptionProof,now})}
  else{
   if(raw.unstarted!==null)fail('captured child cannot assert unstarted')
   const inventory={...transportBundle(raw.inventory,'inventory'),plan,targetSlug:raw.targetSlug,consumptionProof,continuationProof,now}
   if(raw.inventory.expected.name.startsWith('fcf-missing-inventory-diagnostic-')){if(raw.audit!==null)fail('diagnostic cannot assert audit');child=readFcfMissingInventoryDiagnosticArtifact(inventory)}
   else if(raw.audit===null)child=readFcfMissingInventoryFailedAuditArtifact(inventory)
   else{const audit=transportBundle(raw.audit,'audit'),completed={inventoryMetadata:raw.inventory,auditMetadata:audit,inventoryZipBytes:raw.inventory.zipBytes,auditZipBytes:audit.zipBytes,plan,consumptionProof,continuationProof,now};child=readFcfMissingInventoryCompletedChildArtifact(completed);if(i===0)continuationProof=readFcfMissingInventoryContinuation(completed)}
  }
  childRecords.push(child)
 }
 const finalReceipt=readFcfMissingInventoryFinalReceipt({...transportBundle(receiptWire,'receipt'),plan,claimProof,consumptionProof,childRecords,now}),selected=wire.find(c=>c.targetSlug===targetSlug)
 if(!selected?.inventory||!selected.audit)fail('selected target requires final successful inventory and audit')
 const inventoryProof=readFcfMissingInventoryArtifact({...selected.inventory,plan,targetSlug,consumptionProof,continuationProof:targetSlug==='es-ct-tercera-g9'?continuationProof:undefined,finalReceipt,now}),auditProof=readFcfMissingInventoryAuditArtifact({...selected.audit,inventoryProof,now})
 return composeFcfCapturedTargetEvidence({inventoryProof,auditProof,targetSlug,now})
}

/** Closed fresh-G9 transport. The old failure is reauthenticated budget only. */
export function readFcfG9HeldParentTargetEvidence(input){
 exactKeys(input,['protocol','accounting','plan','claim','consumption','child','finalReceipt','targetSlug',...(Object.hasOwn(input,'now')?['now']:[])],'G9 held-parent target transport')
 const {plan,claim,consumption,child,targetSlug,now=Date.now()}=input
 if(input.protocol!=='g9-only-after-held-parent-v1'||targetSlug!=='es-ct-tercera-g9')fail('exact new G9 protocol/target required')
 const accountingProof=readFcfHeldParentAccounting({...input.accounting,now})
 validateFcfG9HeldParentPlan({plan,accountingProof,expectedPlanSha256:plan?.planSha256,now})
 exactKeys(claim,['execution','ref','claimCommit','claimBytes','rulesets','expected'],'G9 claim transport')
 exactKeys(claim.expected,['claimCommit','claimJsonSha256','rulesetId','planSha256','sourceCommit','runId','runAttempt'],'G9 claim expected pins')
 const claimProof=readFcfInventoryExecutionClaim({...claim,plan,now}),consumptionProof=readFcfInventoryConsumptionArtifact({...transportBundle(consumption,'consumption'),claimProof,now})
 exactKeys(child,['targetSlug','inventory','audit'],'G9 child transport')
 if(child.targetSlug!==targetSlug||!child.inventory||!child.audit)fail('new G9 requires full inventory and successful audit')
 const inventory=transportBundle(child.inventory,'inventory'),audit=transportBundle(child.audit,'audit'),completed=readFcfMissingInventoryCompletedChildArtifact({inventoryMetadata:inventory,auditMetadata:audit,inventoryZipBytes:inventory.zipBytes,auditZipBytes:audit.zipBytes,plan,consumptionProof,now})
 const finalReceipt=readFcfMissingInventoryFinalReceipt({...transportBundle(input.finalReceipt,'receipt'),plan,claimProof,consumptionProof,childRecords:[completed],now}),inventoryProof=readFcfMissingInventoryArtifact({...inventory,plan,targetSlug,consumptionProof,finalReceipt,now}),auditProof=readFcfMissingInventoryAuditArtifact({...audit,inventoryProof,now})
 return composeFcfCapturedTargetEvidence({inventoryProof,auditProof,targetSlug,now})
}

function sixChildSafe(proof){const record=children.get(proof);if(!record)return false;if(proof.status==='not-started')return proof.actualSourceGETs===0;const m=record.ctx?.manifest;if(!m||record.ctx.providerSafe!==true)return false;return m.attempts.length===m.actualSourceGETs&&m.documents.filter(d=>d.kind==='captured').every(d=>d.receipt.bodyState==='complete'&&d.receipt.httpStatus===200&&d.receipt.redirected===false&&d.receipt.responseURL===d.receipt.sourceUrl)&&(!m.stopReason||['strict-normal-defect','source-or-output-invalid','offline-audit-failed'].includes(m.stopReason))}
/** Sibling permission comes from actual retained complete200 attempts, never status assertions. */
export function readFcfSixSourceContinuation(input){const proof=input.expected?.name?.startsWith('fcf-missing-inventory-diagnostic-')?readFcfMissingInventoryDiagnosticArtifact(input):readFcfMissingInventoryStagingArtifact(input);const record=children.get(proof),ctx=record?.ctx??stages.get(proof);if(!isFcfSixPlan(input.plan)||ctx.manifest.targetSlug!=='es-ct-tercera-g9')fail('six first child required');const candidate=record?proof:frozenJSON({kind:'fcf-six-source-child',actualSourceGETs:ctx.manifest.actualSourceGETs});if(!record)children.set(candidate,{ctx});if(!sixChildSafe(candidate)||ctx.manifest.actualSourceGETs<1)fail('refusal/unknown/empty sibling cannot grant source permission');const result=frozenJSON({kind:'fcf-six-source-continuation',planSha256:ctx.plan.planSha256,runId:ctx.binding.runId,claimCommit:ctx.consumption.claimCommit,actualSourceGETs:ctx.manifest.actualSourceGETs,lastCompletedUTC:ctx.manifest.lastCompletedUTC,sourceClearanceUTC:ctx.manifest.sourceClearanceUTC});sixContinuations.set(result,ctx);return result}
export function requireFcfSixSourceContinuation(proof){if(!sixContinuations.has(proof))fail('authenticated six sibling source accounting required');return proof}
export function readFcfSixTargetEvidence(input){exactKeys(input,['protocol','history','plan','claim','consumption','children','finalReceipt','targetSlug',...(Object.hasOwn(input,'now')?['now']:[])],'six target transport');const {plan,claim,targetSlug,now=Date.now()}=input;if(input.protocol!=='six-reviewed-continuation-v1')fail('six target protocol required');const accountingProof=readFcfSixAccounting({...input.history,now});validateFcfSixContinuationPlan({plan,accountingProof,expectedPlanSha256:plan?.planSha256,now});const claimProof=readFcfInventoryExecutionClaim({...claim,plan,now}),consumptionProof=readFcfInventoryConsumptionArtifact({...transportBundle(input.consumption,'consumption'),claimProof,now});if(!Array.isArray(input.children)||input.children.length!==2)fail('both six attempt records required');const childRecords=[];let continuationProof;for(const [i,c]of input.children.entries()){exactKeys(c,['targetSlug','inventory','audit','unstarted'],'six child transport');if(c.targetSlug!==plan.children[i].targetSlug)fail('ordered six children required');let proof;if(!c.inventory){if(c.audit)fail('unstarted child cannot audit');proof=readFcfMissingInventoryNotStartedChild({...c.unstarted,plan,targetSlug:c.targetSlug,consumptionProof,now})}else{const inv={...transportBundle(c.inventory,'inventory'),plan,targetSlug:c.targetSlug,consumptionProof,continuationProof,now};if(c.audit){const a=transportBundle(c.audit,'audit');proof=readFcfMissingInventoryCompletedChildArtifact({inventoryMetadata:c.inventory,auditMetadata:a,inventoryZipBytes:c.inventory.zipBytes,auditZipBytes:a.zipBytes,plan,consumptionProof,continuationProof,now})}else proof=c.inventory.expected.name.startsWith('fcf-missing-inventory-diagnostic-')?readFcfMissingInventoryDiagnosticArtifact(inv):readFcfMissingInventoryFailedAuditArtifact(inv);if(i===0)continuationProof=readFcfSixSourceContinuation(inv)}childRecords.push(proof)}const finalReceipt=readFcfMissingInventoryFinalReceipt({...transportBundle(input.finalReceipt,'receipt'),plan,claimProof,consumptionProof,childRecords,now}),c=input.children.find(c=>c.targetSlug===targetSlug);if(!c?.inventory||!c.audit)fail('selected six child requires full successful audit');const inventoryProof=readFcfMissingInventoryArtifact({...c.inventory,plan,targetSlug,consumptionProof,continuationProof:targetSlug==='es-ct-segona-g1'?continuationProof:undefined,finalReceipt,now}),auditProof=readFcfMissingInventoryAuditArtifact({...c.audit,inventoryProof,now});return composeFcfCapturedTargetEvidence({inventoryProof,auditProof,targetSlug,now})}


// Separate future-only source audit. Legacy entry points keep refusing this
// protocol. These proofs authorize neither a launch selection nor native writes.
export function readFcfFutureSourceStagingArtifact(input){
 const ctx=readChild(input,false,true),m=ctx.manifest
 const proof=frozenJSON({kind:'fcf-future-source-staged-proof',targetSlug:m.targetSlug,planSha256:m.planSha256,statisticsAudit:'not-run',binding:clone(ctx.binding),priorSourceGETs:37,actualSourceGETs:m.actualSourceGETs,firstSourceUTC:m.firstSourceUTC,lastCompletedUTC:m.lastCompletedUTC})
 futureStages.set(proof,ctx);return proof
}
export function auditFcfFutureSourceOffline({stagingProof,policyHashes,now=Date.now()}){
 const ctx=futureStages.get(stagingProof)
 if(!ctx||!equal(policyHashes,ctx.plan.policyHashes)||!Number.isFinite(now))fail('authenticated future staged inventory/current policies required')
 validateFcfInventorySourcePlan({plan:ctx.plan,expectedPlanSha256:ctx.manifest.planSha256,now})
 const m=ctx.manifest,c={id:797,slug:'es-ct-tercera-g9',source:'fcf',source_policy:FCF_SIX_SOURCE_POLICY,source_league_code:'4118349-4118588',active:false,sezona_koledarska:false}
 const fixtures=ctx.documents.map(document=>proveFcfFutureSourceDocument({competition:c,document,now})),calendar=validateFcfCurrentReleaseCalendar(fixtures)
 return frozenJSON({schemaVersion:2,kind:'fcf-future-source-offline-audit',status:'passed',targetSlug:m.targetSlug,sourceCommit:m.sourceCommit,planSha256:m.planSha256,childPlanSha256:m.childPlanSha256,auditedUTC:new Date(now).toISOString(),execution:clone(m.execution),inventoryBinding:clone(ctx.binding),policyHashes:clone(policyHashes),canonicalSha256:hash(fixtures),calendarSha256:hash(calendar),priorSourceGETs:37,newSourceGETs:m.actualSourceGETs,actualSourceGETs:37+m.actualSourceGETs})
}
export function readFcfFutureSourceDiagnosticArtifact(input){
 const ctx=readChild(input,true,true),m=ctx.manifest
 return frozenJSON({kind:'fcf-future-source-diagnostic-proof',targetSlug:m.targetSlug,planSha256:m.planSha256,sourceCommit:m.sourceCommit,runId:ctx.binding.runId,runAttempt:'1',claimCommit:ctx.consumption.claimCommit,status:'failed',priorSourceGETs:37,newSourceGETs:m.actualSourceGETs,actualSourceGETs:37+m.actualSourceGETs,firstSourceUTC:m.firstSourceUTC,lastCompletedUTC:m.lastCompletedUTC,stopReason:m.stopReason,inventoryBinding:clone(ctx.binding),auditBinding:null,admissible:false})
}
