import {getFcfFutureTarget} from './fcf-future-target-catalog.mjs'
import {fcfFutureProtocolForTarget} from './fcf-future-native-scope.mjs'
// Pure future writer/approval RECORD authentication. No network/database/source
// transport, native/source reader brands, launch or retry capability is issued.
import {verifyArtifact,unpackVerifiedArchive,sha256} from './dfb-artifacts.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-fcf-zgodovina.yml',limit=8*1024*1024
const rows={mapping:['fcf-future-current-target-mapping','Derive exact future FCF native mapping','Retain exact future FCF native mapping'],import:['fcf-future-current-target-imported','Import exact future FCF target offline','Retain exact future FCF target import'],price:['fcf-future-current-target-priced','Price exact future FCF target','Retain exact future FCF target pricing'],check:['fcf-future-current-target-checked','Check exact future FCF target release','Retain exact future FCF target check'],activate:['fcf-future-current-target-activated','Activate exact future FCF target','Retain exact future FCF target activation'],recover:['fcf-future-current-target-recovered','Read back exact future FCF target receipt','Retain exact future FCF target recovery']}
const approvalStages=new Set(['mapping','cleanup-prepare','cleanup-apply','import','price','check','activate','recover'])
const fail=m=>{throw Error(`FCF_FUTURE_STAGE: ${m}`)},id=x=>typeof x==='string'&&/^[1-9]\d{0,19}$/.test(x),hex=(x,n)=>typeof x==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(x)
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype
function exact(x,fields){return object(x)&&Object.keys(x).sort().join(',')===fields.slice().sort().join(',')}
function canonical(x){
 if(x===null||typeof x==='string'||typeof x==='boolean'||typeof x==='number'&&Number.isFinite(x))return x
 if(Array.isArray(x)){if(Object.keys(x).length!==x.length)fail('dense plain JSON required');return x.map(canonical)}
 if(object(x))return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]))
 fail('finite plain JSON required')
}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
const contracts=freeze(Object.fromEntries(Object.entries(rows).map(([stage,r])=>[stage,{job:`future-target-${stage}`,kind:r[0],steps:r.slice(1)}])))
export const fcfFutureTargetStageContract=stage=>typeof stage==='string'&&Object.hasOwn(contracts,stage)?contracts[stage]:null
function authenticate(input,jobName,steps,name){
 const {zipBytes,metadata,expected:e}=input??{},{artifact:a,run:r,jobs}=metadata??{}
 if(!Buffer.isBuffer(zipBytes)||!zipBytes.length||!object(e)||!id(e.runId)||e.runAttempt!=='1'||!id(e.artifactId)||!hex(e.commit,40)||typeof e.artifactDigest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(e.artifactDigest)||!Number.isSafeInteger(r?.id)||String(r.id)!==e.runId||r.run_attempt!==1||r.repository?.full_name!==repository||r.path!==workflow||r.event!=='workflow_dispatch'||r.head_branch!=='main'||r.head_sha!==e.commit||r.status!=='completed'||r.conclusion!=='success'||!Array.isArray(jobs))fail('exact successful future main run/attempt1/ZIP required')
 const selected=jobs.filter(j=>j?.name===jobName),job=selected[0]
 if(selected.length!==1||!Number.isSafeInteger(job.id)||job.id<1||String(job.run_id)!==e.runId||job.run_attempt!==1||job.head_sha!==e.commit||job.status!=='completed'||job.conclusion!=='success'||!Array.isArray(job.steps))fail('exact successful future stage API job/attempt required')
 const found=steps.map(name=>job.steps.filter(s=>s?.name===name))
 if(found.some(s=>s.length!==1||s[0].status!=='completed'||s[0].conclusion!=='success'))fail('exact successful operation and retention steps required')
 // The actual API operation must precede retention; no duplicate named step or
 // reordered retention record can stand in for successful writer execution.
 if(job.steps.indexOf(found[0][0])>=job.steps.indexOf(found[1][0]))fail('operation must precede retention')
 let identity,files
 try{
  identity=verifyArtifact(a,{runId:e.runId,commit:e.commit,name})
  if(identity.id!==e.artifactId||identity.digest!==e.artifactDigest||identity.size!==zipBytes.length)fail('actual artifact identity/ZIP pins differ')
  // Existing safe single-regular-manifest kind only. No ZIP allowlist changes.
  files=unpackVerifiedArchive(zipBytes,identity.digest,'fcf-cleanup-applied')
 }catch(error){fail(error.message)}
 if(files.size!==1||!files.has('manifest.json'))fail('one exact regular manifest required')
 return{bytes:files.get('manifest.json'),identity:{...identity,runId:e.runId,runAttempt:'1',commit:e.commit,jobId:String(job.id)},execution:{repository,ref:'refs/heads/main',commit:e.commit,runId:e.runId,runAttempt:'1'}}
}
function parse(bytes){
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>limit||bytes[0]===239&&bytes[1]===187&&bytes[2]===191)fail('bounded exact UTF8/noBOM manifest required')
 const text=bytes.toString('utf8');if(!Buffer.from(text).equals(bytes))fail('invalid UTF8 manifest')
 let value;try{value=JSON.parse(text);canonical(value)}catch{fail('invalid finite plain manifest JSON')}
 return value
}
export function readFcfFutureTargetStageArtifact(input={}){
 const {stage,targetSlug,expected:e}=input,c=fcfFutureTargetStageContract(stage)
 const slug=getFcfFutureTarget({targetSlug}).targetSlug
 if(!c)fail('closed future G9 stage required')
 const {bytes,identity,execution}=authenticate(input,c.job,c.steps,`fcf-future-target-${stage}-${slug}-${e?.runId}-1`),m=parse(bytes)
 if(!exact(m,['schemaVersion','kind','targetSlug','sourceCommit','execution','inputs','result','payloadText','payloadSha256'])||m.schemaVersion!==2||m.kind!==c.kind||m.targetSlug!==slug||m.sourceCommit!==e.commit||!same(m.execution,execution)||!object(e.inputs)||!object(m.inputs)||!same(m.inputs,e.inputs)||!object(m.result)||m.result.targetSlug!==slug)fail('exact future stage manifest/execution/input/result binding required')
 if(typeof m.payloadText!=='string'||!m.payloadText.length||Buffer.byteLength(m.payloadText)>limit||m.payloadText.charCodeAt(0)===0xfeff||Buffer.from(m.payloadText).toString('utf8')!==m.payloadText||!hex(m.payloadSha256,64)||sha256(Buffer.from(m.payloadText))!==m.payloadSha256)fail('exact bounded opaque payload TEXT/SHA required')
 // Consumers must replay the opaque mapping/import/activation/pricing/receipt
 // payload separately. Never rewrite the execution embedded in original bytes.
 return freeze({...m,artifact:identity})
}
export function readFcfFutureTargetApprovalArtifact(input={}){
 const e=input.expected,{bytes,identity}=authenticate(input,'future-target-approval',['Stage reviewed future FCF target approval','Retain reviewed future FCF target approval'],`fcf-future-target-approval-${e?.runId}-1`)
 if(!hex(e.rawSha256,64)||sha256(bytes)!==e.rawSha256)fail('exact root approval raw manifest SHA required')
 const a=parse(bytes),slug=getFcfFutureTarget({targetSlug:a?.targetSlug}).targetSlug
 if(!exact(a,['schemaVersion','kind','stage','targetSlug','sourceCommit','source','originals','cleanup','mapping','previous','runtimeHashes','modelSha256'])||a.schemaVersion!==2||a.kind!=='fcf-future-current-target-approval'||!approvalStages.has(a.stage)||a.targetSlug!==slug||a.sourceCommit!==e.commit||!object(a.runtimeHashes)||!hex(a.modelSha256,64))fail('closed future target approval schema2/stage/target/commit required')
 if(a.source===null?!['cleanup-prepare','cleanup-apply','recover'].includes(a.stage):!object(a.source)||a.source.protocol!==fcfFutureProtocolForTarget(slug))fail('future protocol data or explicit cleanup/recovery null source required')
 if(slug==='es-ct-segona-g1'&&(a.stage.startsWith('cleanup-')||a.source===null))fail('G1 requires its protocol/history and original APPLIED cleanup; no cleanup rerun')
 // Runtime/source/originals/cleanup semantics remain the independent Actions
 // reader/closure boundary; this authenticated record grants no such capability.
 return freeze({approval:a,artifact:identity})
}
