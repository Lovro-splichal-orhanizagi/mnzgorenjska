// Bounded byte-first collector. Native request is an explicit injected boundary.
import {lstatSync,fstatSync,mkdirSync,openSync,closeSync,writeFileSync,readFileSync,readdirSync,fsyncSync} from 'node:fs'
import {parse,relative,resolve,join,sep,isAbsolute} from 'node:path'
import {deflateRawSync} from 'node:zlib'
import {validateFcfMissingInventoryPlan,getFcfMissingInventorySeedOriginals,deriveFcfInventoryHeader,validateFcfInventoryHeaders} from './fcf-missing-inventory-plan.mjs'
import {requireFcfInventoryConsumption} from './fcf-missing-inventory-claim.mjs'
import {parseFcfCurrentAuditDocument} from './fcf-current-source-proof.mjs'
import {inventoryFail as fail,rawSha256,exactKeys,nativeId,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
const contexts=new Map(),usedConsumptions=new Set()
const statKeys=['dev','ino','size','mtimeMs','ctimeMs']
function inspect(path,directory=false){let current=parse(path).root;const parts=relative(current,path).split(sep).filter(Boolean);for(const[i,part]of parts.entries()){current=join(current,part);let stat;try{stat=lstatSync(current)}catch(error){if(error.code==='ENOENT')return null;throw error}if(stat.isSymbolicLink()||(i<parts.length-1||directory)&&!stat.isDirectory())fail('unsafe output ancestor');if(i===parts.length-1)return stat}return lstatSync(current)}
function ownedDirectory(path){if(inspect(path))fail('preexisting output');mkdirSync(path,{mode:0o700});const owner=inspect(path,true),files=new Map();const check=()=>{const actual=inspect(path,true);if(!actual||actual.dev!==owner.dev||actual.ino!==owner.ino||readdirSync(path).length!==files.size)fail('output-write-failed');for(const[name,expected]of files){const s=inspect(join(path,name));if(!s?.isFile()||statKeys.some(k=>s[k]!==expected[k]))fail('output-write-failed')}};const write=(name,bytes,append=false)=>{check();let fd;try{fd=openSync(join(path,name),append?'a':'wx',0o600);if(append){const expected=files.get(name),actual=fstatSync(fd);if(!expected||actual.dev!==expected.dev||actual.ino!==expected.ino)fail('output-write-failed')}writeFileSync(fd,bytes);fsyncSync(fd);files.set(name,fstatSync(fd));closeSync(fd);fd=undefined;check()}finally{if(fd!==undefined)closeSync(fd)}};return{path,files,check,write}}
const time=clock=>{const n=clock();if(!Number.isFinite(n))fail('invalid clock');return new Date(n).toISOString()}
function safeHeaders(headers){const get=n=>{const v=headers?.get?.(n);return typeof v==='string'&&v.length<=160?v:null};return{contentType:get('content-type'),contentEncoding:get('content-encoding'),contentLength:get('content-length'),date:get('date'),lastModified:get('last-modified')}}
async function withSignal(operation,signal){let listener;const aborted=new Promise((_,reject)=>{listener=()=>reject(signal.reason??Object.assign(Error('timeout'),{name:'TimeoutError'}));signal.addEventListener('abort',listener,{once:true});if(signal.aborted)listener()});try{return await Promise.race([operation(),aborted])}finally{signal.removeEventListener('abort',listener)}}
async function retainBody(response,signal,maxBytes){const reader=response.body?.getReader();if(!reader)return{bytes:Buffer.alloc(0),complete:true,reason:null};const chunks=[];let length=0;try{for(;;){const part=await withSignal(()=>reader.read(),signal);if(part.done)return{bytes:Buffer.concat(chunks,length),complete:true,reason:null};const chunk=Buffer.from(part.value),take=Math.min(chunk.length,maxBytes-length);if(take){chunks.push(Buffer.from(chunk.subarray(0,take)));length+=take}if(take!==chunk.length){try{void reader.cancel().catch(()=>{})}catch{};return{bytes:Buffer.concat(chunks,length),complete:false,reason:'body-too-large'}}}}catch(error){return{bytes:Buffer.concat(chunks,length),complete:false,reason:['TimeoutError','AbortError'].includes(error?.name)?'timeout':'stream-failed'}}finally{try{reader.releaseLock()}catch{}}}
const binding=proof=>({artifactId:proof.artifactId,artifactDigest:proof.artifactDigest,manifestSha256:proof.manifestSha256,runId:proof.runId,runAttempt:proof.runAttempt,jobId:proof.jobId,claimRef:proof.claimRef,claimCommit:proof.claimCommit,claimJsonSha256:proof.claimJsonSha256})
function sourceReceipt(row,bytes){return{id:row.id,competitionSlug:row.targetSlug,sourceUrl:row.sourceUrl,startedUTC:row.startedUTC,capturedUTC:row.capturedUTC,bytes:bytes.length,rawSha256:rawSha256(bytes)}}
/** Rehash invocation-owned files and seal once. No reused output authorizes upload. */
export function sealFcfMissingInventoryChild({root,plan,targetSlug,execution}){
 const key=join(root,`fcf-missing-${targetSlug}`),context=contexts.get(key)
 if(!context||context.plan!==plan||context.execution!==execution||context.sealed)fail('invocation-owned unsealed output required')
 context.output.check();context.journal.check()
 for(const doc of context.manifest.documents){if(!doc.artifactFile)continue;const bytes=readFileSync(join(key,doc.artifactFile));const receipt=doc.receipt;if(rawSha256(bytes)!==(receipt?.bodyState==='truncated'?receipt.prefixSha256:doc.rawSha256)||bytes.length!==doc.bytes)fail('retained raw hash changed')}
 const bytes=Buffer.from(JSON.stringify(context.manifest,null,2)+'\n')
 if(bytes.length>plan.limits.maximumManifestBytes||context.expanded+bytes.length>plan.limits.maximumExpandedBytes||context.compressed+deflateRawSync(bytes).length+65536>plan.limits.maximumZipBytes)fail('retention bounds exceeded')
 context.output.write('manifest.json',bytes);context.sealed=true
 return{manifestSHA:rawSha256(bytes),outputDirectory:key}
}
export async function collectFcfMissingInventoryChild({plan,targetSlug,seedEvidence,execution,consumptionProof,batchState,root,request,pause=ms=>new Promise(r=>setTimeout(r,ms)),clock=Date.now,pauseFactor=1}){
 const children=validateFcfMissingInventoryPlan({plan,expectedPlanSha256:plan?.planSha256,now:clock()}),child=children.find(c=>c.targetSlug===targetSlug),consumption=requireFcfInventoryConsumption(consumptionProof),originals=getFcfMissingInventorySeedOriginals(seedEvidence)
 if(!child||typeof request!=='function'||typeof pause!=='function'||!Number.isFinite(pauseFactor)||pauseFactor<1||plan.limits.pauseMs*pauseFactor>2147483647||!isAbsolute(root??'')||resolve(root)!==root||!inspect(root,true))fail('exact bounded collector preflight required')
 exactKeys(execution,['repository','workflow','ref','sourceCommit','runId','runAttempt','jobId'],'capture execution')
 if(execution.repository!=='Lovro-splichal-orhanizagi/mnzgorenjska'||execution.workflow!=='.github/workflows/uvoz-fcf-zgodovina.yml'||execution.ref!=='refs/heads/main'||execution.sourceCommit!==plan.sourceCommit||execution.sourceCommit!==consumption.sourceCommit||execution.runId!==consumption.runId||execution.runAttempt!=='1'||!nativeId(execution.jobId)||seedEvidence.binding.artifactDigest!==plan.seedBinding.artifactDigest||seedEvidence.binding.artifactId!==plan.seedBinding.artifactId||consumption.planSha256!==plan.planSha256)fail('reserved execution/seed/consumption differs')
 let priorSourceGETs=0,firstSourceUTC=null,lastCompletedUTC=null
 if(targetSlug==='es-ct-tercera-g9'){
  // Task3 supplies the independently authenticated completed-G1 capability.
  const {requireFcfInventoryContinuation}=await import('./fcf-missing-inventory-evidence.mjs').catch(()=>({}))
  if(typeof requireFcfInventoryContinuation!=='function')fail('authenticated G1 continuation unavailable')
  const prior=requireFcfInventoryContinuation(batchState)
  if(prior.planSha256!==plan.planSha256||prior.runId!==execution.runId||prior.runAttempt!=='1'||prior.claimCommit!==consumption.claimCommit||prior.actualSourceGETs!==239||prior.stopReason!==null)fail('G1 continuation differs')
  priorSourceGETs=prior.actualSourceGETs;firstSourceUTC=prior.firstSourceUTC;lastCompletedUTC=prior.lastCompletedUTC
 }else if(batchState!==undefined)fail('G1 cannot accept prior batch state')
 const consumptionKey=`${consumption.planSha256}/${consumption.runId}/${consumption.claimCommit}/${targetSlug}`
 if(usedConsumptions.has(consumptionKey))fail('one-shot child cannot restart')
 const outputPath=join(root,`fcf-missing-${targetSlug}`),journalPath=outputPath+'-journal'
 if(inspect(outputPath)||inspect(journalPath))fail('preexisting output or journal')
 const output=ownedDirectory(outputPath),journal=ownedDirectory(journalPath);journal.write('attempts.jsonl',Buffer.alloc(0));journal.write('receipts.jsonl',Buffer.alloc(0));usedConsumptions.add(consumptionKey)
 const startedUTC=time(clock),documents=Array.from({length:240},(_,i)=>({id:String(Number(child.sourceCode.split('-')[0])+i),kind:'not-attempted',artifactFile:null,bytes:null,rawSha256:null,receipt:null,header:null,validation:null})),manifest={schemaVersion:1,kind:'fcf-missing-target-inventory',status:'running',statisticsAudit:'not-run',preset:plan.preset,targetSlug,competitionId:child.competitionId,sourceCode:child.sourceCode,season:child.season,planSha256:plan.planSha256,childPlanSha256:child.childPlanSha256,sourceCommit:plan.sourceCommit,execution:{...execution},claimBinding:{claimRef:consumption.claimRef,claimCommit:consumption.claimCommit,claimJsonSha256:consumption.claimJsonSha256},consumptionBinding:binding(consumption),seedBinding:structuredClone(plan.seedBinding),policyHashes:structuredClone(plan.policyHashes),limits:{...plan.limits},maximumSourceGETs:child.maximumSourceGETs,priorSourceGETs,actualSourceGETs:0,firstSourceUTC,lastCompletedUTC,startedUTC,endedUTC:null,stopReason:null,attempts:[],documents}
 const context={output,journal,manifest,plan,execution,expanded:0,compressed:0,sealed:false};contexts.set(outputPath,context);let safe=true
 const retain=(name,bytes)=>{output.write(name,bytes);context.expanded+=bytes.length;context.compressed+=deflateRawSync(bytes,{level:6}).length+512}
 const stop=reason=>{manifest.status='failed';manifest.stopReason??=reason}
 try{
  for(const original of child.reuse){const bytes=originals.find(row=>row.id===original.id)?.bytes;if(!bytes||rawSha256(bytes)!==original.rawSha256)fail('seed original bytes differ');retain(original.artifactFile,bytes);const header=deriveFcfInventoryHeader({targetSlug,id:original.id,bytes});Object.assign(documents.find(d=>d.id===original.id),{kind:'reviewed-original',artifactFile:original.artifactFile,bytes:bytes.length,rawSha256:original.rawSha256,receipt:structuredClone(original.receipt),header,validation:{header:'valid',earlyStrictCheck:'not-applicable-historical',reason:null}})}
  for(const id of child.fetchIds){
   output.check();journal.check()
   const current=clock();if(manifest.firstSourceUTC!==null&&current-Date.parse(manifest.firstSourceUTC)+plan.limits.attemptTimeoutMs+plan.limits.retentionMarginMs>plan.limits.sourceWindowMs){stop('source-window-expired');break}
   if(manifest.actualSourceGETs>=child.maximumSourceGETs||priorSourceGETs+manifest.actualSourceGETs>=477){stop('source-budget-exhausted');break}
   if(context.expanded+plan.limits.maximumBodyBytes+plan.limits.maximumManifestBytes>plan.limits.maximumExpandedBytes||context.compressed+plan.limits.maximumBodyBytes+plan.limits.maximumManifestBytes+65536>plan.limits.maximumZipBytes){stop('retention-budget-exhausted');break}
   const delay=Math.max(plan.limits.pauseMs*pauseFactor,lastCompletedUTC===null?0:Date.parse(lastCompletedUTC)+plan.limits.pauseMs*pauseFactor-clock());await pause(delay)
   if(manifest.firstSourceUTC!==null&&clock()-Date.parse(manifest.firstSourceUTC)+105000>plan.limits.sourceWindowMs){stop('source-window-expired');break}
   const startedUTC=time(clock);manifest.firstSourceUTC??=startedUTC
   const attempt={sequence:priorSourceGETs+manifest.actualSourceGETs+1,id,targetSlug,sourceUrl:`https://www.fcf.cat/ca/competicio/acta/${id}`,method:'GET',startedUTC}
   journal.write('attempts.jsonl',Buffer.from(JSON.stringify(attempt)+'\n'),true);manifest.attempts.push(attempt);manifest.actualSourceGETs++
   const receipt={...attempt,headersUTC:null,capturedUTC:null,httpStatus:null,responseURL:null,redirected:false,responseHeaders:null,bodyState:'unavailable',bytes:null,rawSha256:null,prefixBytes:null,prefixSha256:null,artifactFile:null},doc=documents.find(d=>d.id===id);Object.assign(doc,{kind:'captured',receipt,validation:{header:'not-run',earlyStrictCheck:'not-run',reason:null}})
   try{
    const signal=AbortSignal.timeout(plan.limits.attemptTimeoutMs),response=await withSignal(()=>request(attempt.sourceUrl,{method:'GET',redirect:'manual',headers:{'User-Agent':'SLFF fantasy (slff.eu; splih.94@gmail.com)'},signal}),signal)
    receipt.headersUTC=time(clock);receipt.httpStatus=Number.isInteger(response.status)?response.status:null;receipt.responseURL=response.url||attempt.sourceUrl;receipt.redirected=response.redirected===true;receipt.responseHeaders=safeHeaders(response.headers)
    if(receipt.redirected||receipt.responseURL!==attempt.sourceUrl||response.status>=300&&response.status<400)stop('redirect')
    else if([401,403,429].includes(response.status))stop('source-refusal')
    else if(response.status!==200)stop('http-status')
    const body=await retainBody(response,signal,plan.limits.maximumBodyBytes),bytes=body.bytes
    receipt.bodyState=body.complete?'complete':'truncated';receipt.bytes=body.complete?bytes.length:null;receipt.rawSha256=body.complete?rawSha256(bytes):null;receipt.capturedUTC=body.complete?time(clock):null;receipt.prefixBytes=body.complete?null:bytes.length;receipt.prefixSha256=body.complete?null:rawSha256(bytes);receipt.artifactFile=body.complete?`acta-${id}.html`:`prefix-${id}.bin`
    retain(receipt.artifactFile,bytes);Object.assign(doc,{artifactFile:receipt.artifactFile,bytes:bytes.length,rawSha256:receipt.rawSha256})
    journal.write('receipts.jsonl',Buffer.from(JSON.stringify(receipt)+'\n'),true)
    if(!body.complete)stop(body.reason)
    if(manifest.stopReason)break
    const header=deriveFcfInventoryHeader({targetSlug,id,bytes});doc.header=header;doc.validation.header='valid'
    journal.write('receipts.jsonl',Buffer.from(JSON.stringify({id,header})+'\n'),true)
    validateFcfInventoryHeaders({targetSlug,headers:documents.filter(d=>d.header).map(d=>d.header),complete:false})
    if(header.status==='published'){
     try{parseFcfCurrentAuditDocument({id,competitionSlug:targetSlug,expectedSourceRound:header.round,html:bytes.toString('utf8'),receipt:sourceReceipt(receipt,bytes),now:clock()});doc.validation.earlyStrictCheck='passed'}catch{doc.validation.earlyStrictCheck='failed';doc.validation.reason='strict-normal-defect';stop('strict-normal-defect');break}
    }else doc.validation.earlyStrictCheck='not-applicable-pending'
   }catch(error){stop(['TimeoutError','AbortError'].includes(error?.name)?'timeout':String(error?.message).includes('FCF_INVENTORY:')?'source-or-output-invalid':'network-error');doc.validation.reason=manifest.stopReason;try{journal.write('receipts.jsonl',Buffer.from(JSON.stringify(receipt)+'\n'),true)}catch{safe=false}}
   finally{lastCompletedUTC=time(clock);manifest.lastCompletedUTC=lastCompletedUTC}
   if(manifest.stopReason)break
  }
  if(!manifest.stopReason){validateFcfInventoryHeaders({targetSlug,headers:documents.map(d=>d.header),complete:true});if(manifest.actualSourceGETs!==child.maximumSourceGETs)fail('complete attempt count differs');manifest.status='inventory-complete'}
 }catch{stop('source-or-output-invalid')}
 manifest.endedUTC=time(clock)
 try{const sealed=sealFcfMissingInventoryChild({root,plan,targetSlug,execution});return frozenJSON({status:manifest.status,evidenceReady:safe,manifestSHA:sealed.manifestSHA,outputDirectory:sealed.outputDirectory,actualSourceGETs:manifest.actualSourceGETs,firstSourceUTC:manifest.firstSourceUTC,lastCompletedUTC:manifest.lastCompletedUTC,stopReason:manifest.stopReason})}catch{return frozenJSON({status:'failed',evidenceReady:false,manifestSHA:null,outputDirectory:outputPath,actualSourceGETs:manifest.actualSourceGETs,firstSourceUTC:manifest.firstSourceUTC,lastCompletedUTC:manifest.lastCompletedUTC,stopReason:manifest.stopReason??'output-write-failed'})}
}
