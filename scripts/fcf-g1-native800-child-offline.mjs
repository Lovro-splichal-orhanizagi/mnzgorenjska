// Dedicated G1/native800 offline child boundary. GitHub authenticates the
// terminal source run inside this process; the owner file carries locators and
// retained rollout DATA only, never a serialized source capability.
import {readFileSync,lstatSync,realpathSync,existsSync,openSync,fstatSync,closeSync,constants} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import http from 'node:http'
import https from 'node:https'
import {syncBuiltinESMExports} from 'node:module'
import {readFcfDraftAsset} from './fcf-inventory-github.mjs'
import {getFcfReliableGithub} from './lib/fcf-reliable-github.mjs'
import {readFcfRefresh800Ledger} from './fcf-refresh800-contract.mjs'
import {jsonBytes,exactKeys} from './fcf-missing-inventory-artifact.mjs'
import {readFcfG1Native800Source,getFcfG1Native800Source,FCF_G1_NATIVE800_PROTOCOL} from './fcf-g1-native800-source.mjs'
import {fcfOfflineFetch} from './fcf-target-offline.mjs'

const repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',slug='es-ct-segona-g1',fail=m=>{throw Error(`FCF_G1_NATIVE800_CHILD: ${m}`)},need=(v,m)=>{if(!v)fail(m)},sha=x=>createHash('sha256').update(x).digest('hex'),same=(a,b)=>sha(JSON.stringify(a))===sha(JSON.stringify(b)),hex=(v,n=64)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v)
function keys(x,names,label){exactKeys(x,names,label)}
function privateFile(env){
 const path=env.FCF_G1_NATIVE800_OFFLINE_FILE,expected=env.FCF_G1_NATIVE800_OFFLINE_SHA256;let fd
 try{
  if(typeof path!=='string'||resolve(path)!==path||realpathSync(path)!==path||!lstatSync(path).isFile()||!hex(expected))fail('exact owner-only G1 parent evidence file required')
  fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);const s=fstatSync(fd)
  if(!s.isFile()||(s.mode&0o077)!==0||s.uid!==process.getuid()||s.size<1||s.size>64*1024*1024)fail('owner-only bounded regular G1 parent evidence file required')
  const bytes=readFileSync(fd);if(bytes.length!==s.size||sha(bytes)!==expected)fail('exact parent file hash differs')
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))
 }catch{fail('exact owner-only canonical parent evidence file/TEXT/SHA required')}finally{if(fd!==undefined)closeSync(fd)}
}
function captureLocator(locator){
 keys(locator,['runId','sourceCommit','artifactId','artifactDigest','manifestSha256','approval','disposition'],'terminal G1 capture locator')
 keys(locator.approval,['assetId','assetDigest'],'root approval locator')
 need(/^[1-9]\d{0,19}$/.test(locator.runId??'')&&hex(locator.sourceCommit,40)&&/^[1-9]\d{0,19}$/.test(locator.artifactId??'')&&/^sha256:[a-f0-9]{64}$/.test(locator.artifactDigest??'')&&hex(locator.manifestSha256)&&/^[1-9]\d{0,19}$/.test(locator.approval.assetId??'')&&/^sha256:[a-f0-9]{64}$/.test(locator.approval.assetDigest??'')&&locator.disposition==='capture','complete typed terminal capture locator required')
 return locator
}
export function validateFcfG1Native800ChildInvocation({env,nativeExecutionCommit,script,args}){
 need(env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_WORKFLOW_REF==='Lovro-splichal-orhanizagi/mnzgorenjska/.github/workflows/fcf-g1-native800.yml@refs/heads/main'&&env.GITHUB_JOB==='native800-price'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_RUN_ATTEMPT==='1'&&/^[1-9]\d{0,19}$/.test(env.GITHUB_RUN_ID??'')&&env.GITHUB_SHA===nativeExecutionCommit&&env.GITHUB_ACTOR==='nejcar20'&&env.GITHUB_ACTOR_ID==='25134229','exact root-dispatched G1 native800 price workflow/run required')
 if(env.GITHUB_TRIGGERING_ACTOR!==undefined||env.GITHUB_TRIGGERING_ACTOR_ID!==undefined)need(env.GITHUB_TRIGGERING_ACTOR==='nejcar20'&&env.GITHUB_TRIGGERING_ACTOR_ID==='25134229','exact root-triggered G1 native800 price run required')
 const scripts=dirname(fileURLToPath(import.meta.url));need(typeof script==='string'&&resolve(script)===script&&Array.isArray(args),'exact stock script path and argv required')
 if(script===resolve(scripts,'ugani-pozicije.mjs'))need(JSON.stringify(args)===JSON.stringify(['--tekmovanje',slug,'--pisi']),'only exact G1 position-write CLI invocation allowed')
 else if(script===resolve(scripts,'ovrednoti-igralce.mjs')){
  const base=['--tekmovanje',slug,'--sezona','2026/27']
  if(args.length===base.length+1&&args.slice(0,base.length).join('\0')===base.join('\0')&&args.at(-1)==='--pisi')return true
  const planPath=args.at(-1),privatePath=env.FCF_G1_NATIVE800_OFFLINE_FILE
  need(args.length===base.length+2&&args.slice(0,base.length).join('\0')===base.join('\0')&&args[base.length]==='--release-plan'&&typeof planPath==='string'&&resolve(planPath)===planPath&&typeof privatePath==='string'&&dirname(planPath)===dirname(privatePath)&&planPath===resolve(dirname(privatePath),'g1-native800-price-replay.json')&&!existsSync(planPath),'only G1 season replay to the private owner file is allowed')
  const dir=lstatSync(dirname(privatePath));need(dir.isDirectory()&&(dir.mode&0o077)===0&&dir.uid===process.getuid()&&realpathSync(dirname(privatePath))===dirname(privatePath),'owner-only canonical price replay directory required')
 }else fail('only exact native800 G1 position/pricing CLI entrypoints allowed')
 return true
}
function checkedRollout({sourceProof,rolloutText,rolloutSha256,nativeExecutionCommit}){
 const source=getFcfG1Native800Source(sourceProof);need(hex(nativeExecutionCommit,40),'separate exact native execution commit required')
 need(typeof rolloutText==='string'&&Buffer.byteLength(rolloutText)>0&&Buffer.byteLength(rolloutText)<=32*1024*1024&&hex(rolloutSha256)&&sha(rolloutText)===rolloutSha256,'exact bounded original rollout TEXT/SHA required')
 let rollout;try{rollout=JSON.parse(rolloutText)}catch{fail('valid original rollout JSON required')}
 keys(rollout,['schemaVersion','kind','protocol','targetSlug','sourceCommit','execution','targetPacketText','targetPacketSha256','inventoryBinding','cleanupBinding','supplementalBindings','identityPlan','scoreBeforeimages','nativeSnapshotText','nativeSnapshotSha256','readiness'],'original G1 rollout')
 keys(rollout.execution,['repository','ref','commit','runId','runAttempt'],'original native execution')
 need(rollout.schemaVersion===1&&rollout.kind==='fcf-g1-native800-import-rollout'&&rollout.protocol===FCF_G1_NATIVE800_PROTOCOL&&rollout.targetSlug===slug&&rollout.sourceCommit===nativeExecutionCommit&&rollout.execution.repository==='Lovro-splichal-orhanizagi/mnzgorenjska'&&rollout.execution.ref==='refs/heads/main'&&rollout.execution.commit===nativeExecutionCommit&&/^[1-9]\d{0,19}$/.test(rollout.execution.runId??'')&&rollout.execution.runAttempt==='1'&&same(rollout.inventoryBinding,source.binding),'original rollout native commit/full authenticated source binding differs')
 need(typeof rollout.targetPacketText==='string'&&Buffer.byteLength(rollout.targetPacketText)>0&&Buffer.byteLength(rollout.targetPacketText)<=16*1024*1024&&hex(rollout.targetPacketSha256)&&sha(rollout.targetPacketText)===rollout.targetPacketSha256,'exact bounded original packet TEXT/SHA required')
 let packet;try{packet=JSON.parse(rollout.targetPacketText)}catch{fail('valid original packet JSON required')}
 keys(packet,['schemaVersion','kind','protocol','targetSlug','sourceCommit','captureSourceCommit','auditedUTC','cleanupBinding','supplementalBindings','databaseInventory','target','identityPlan','scoreBeforeimages','nativeSnapshotText','nativeSnapshotSha256'],'original G1 packet')
 need(packet.schemaVersion===1&&packet.kind==='fcf-g1-native800-import-packet'&&packet.protocol===FCF_G1_NATIVE800_PROTOCOL&&packet.targetSlug===slug&&packet.sourceCommit===nativeExecutionCommit&&packet.captureSourceCommit===source.binding.sourceCommit&&packet.target?.competitionId===783&&packet.target.competitionSlug===slug&&same(packet.target.sourceEvidence,source.binding)&&same(packet.target.fixtures,source.fixtures)&&same(packet.target.clubs,source.clubs)&&same(packet.target.verifiedKeeperClubs,source.verifiedKeeperClubs)&&same(packet.cleanupBinding,rollout.cleanupBinding)&&same(packet.supplementalBindings,rollout.supplementalBindings)&&same(packet.identityPlan,rollout.identityPlan)&&same(packet.scoreBeforeimages,rollout.scoreBeforeimages)&&packet.nativeSnapshotText===rollout.nativeSnapshotText&&packet.nativeSnapshotSha256===rollout.nativeSnapshotSha256&&hex(rollout.nativeSnapshotSha256)&&sha(rollout.nativeSnapshotText)===rollout.nativeSnapshotSha256,'original packet/full source binding differs from current authenticated capture')
 need(source.targetSlug===slug&&source.competitionId===783&&source.binding.protocol===FCF_G1_NATIVE800_PROTOCOL&&source.currentCapture.sourceCommit===packet.captureSourceCommit&&source.documents.length===240,'complete current G1 source proof required')
 const inventoryPlayers=packet.databaseInventory?.players
 need(Array.isArray(inventoryPlayers)&&inventoryPlayers.length>0&&inventoryPlayers.length<=10000&&inventoryPlayers.every(p=>p?.competition_id===783&&Number.isSafeInteger(p.id)&&p.id>0)&&new Set(inventoryPlayers.map(p=>p.id)).size===inventoryPlayers.length,'complete exact G1 player inventory required for child write scope')
 return {source,rollout,packet,targetPlayerIds:new Set(inventoryPlayers.map(p=>p.id))}
}

// Accepts only an issuer-created WeakMap proof. This exported seam is useful
// for the isolated synthetic fixture runner; callers cannot mint that proof.
export function createFcfG1Native800OfflineProvider(input={}){
 keys(input,['sourceProof','rolloutText','rolloutSha256','nativeExecutionCommit'],'G1 provider input')
 const first=checkedRollout(input),documents=first.source.documents.map(d=>({sourceUrl:d.url,html:d.html})),fixed=new Map(documents.map(d=>[d.sourceUrl,d.html]))
 need(fixed.size===240&&documents.every((d,i)=>d.sourceUrl===`https://www.fcf.cat/ca/competicio/acta/${4109388+i}`),'exact ordered fixed G1 document map required')
 return Object.freeze({targetSlug:slug,sourceEvidence:first.source.binding,documents:Object.freeze(documents.map(Object.freeze)),targetPlayerIds:Object.freeze([...first.targetPlayerIds]),admissible:false,nativeAdmission:false,activationEligible:false,schedule(){const fresh=getFcfG1Native800Source(input.sourceProof);need(same(fresh.binding,first.source.binding)&&same(fresh.currentCapture,first.source.currentCapture)&&same(fresh.fixtures,first.source.fixtures),'current authenticated G1 source/capture changed');return fresh.fixtures}})
}

async function authenticatedProvider(e,env){
 need(typeof env.GH_TOKEN==='string'&&env.GH_TOKEN.length>0,'workflow GitHub token required for source reauthentication')
 const locator=captureLocator(e.captureLocator),github=getFcfReliableGithub,approvalBytes=await readFcfDraftAsset({id:locator.approval.assetId,digest:locator.approval.assetDigest,github,maximumBytes:8*1024*1024}),approval=jsonBytes(approvalBytes,'approved refresh800 root approval')
 keys(approval,['schemaVersion','kind','profileSha256','plan','rulesetSnapshot','runtimeFiles','workflowJobNames','mainCiRunId','probeLocators','refreshLocators'],'root refresh800 approval')
 need(approval.kind==='fcf-refresh800-root-approval'&&approval.schemaVersion===1&&approval.plan?.target?.targetSlug===slug&&approval.plan?.target?.calendarAuthority==='full-report-derived-240-v1'&&approval.plan?.sourceCommit===locator.sourceCommit&&Array.isArray(approval.probeLocators)&&Array.isArray(approval.refreshLocators)&&approval.refreshLocators.length<20&&!approval.refreshLocators.some(x=>x.runId===locator.runId),'approved fixed G1 full-report capture plan and prior locators required')
 const ledgerProof=await readFcfRefresh800Ledger({github,probeLocators:approval.probeLocators,refreshLocators:[...approval.refreshLocators,locator]}),sourceProof=readFcfG1Native800Source({ledgerProof,runId:locator.runId})
 return createFcfG1Native800OfflineProvider({sourceProof,rolloutText:e.originalRolloutText,rolloutSha256:e.originalRolloutSha256,nativeExecutionCommit:e.nativeExecutionCommit})
}

export async function installFcfG1Native800ChildOffline(){
 if(existsSync(resolve(dirname(fileURLToPath(import.meta.url)),'.predpomnilnik')))fail('source cache must be absent')
 const env=process.env,e=privateFile(env);keys(e,['schemaVersion','kind','captureLocator','nativeExecutionCommit','originalRolloutText','originalRolloutSha256'],'G1 owner-only parent envelope')
 need(e.schemaVersion===1&&e.kind==='fcf-g1-native800-offline-child'&&hex(e.nativeExecutionCommit,40),'exact G1 offline parent envelope required')
 validateFcfG1Native800ChildInvocation({env,nativeExecutionCommit:e.nativeExecutionCommit,script:resolve(process.argv[1]??''),args:process.argv.slice(2)})
 const provider=await authenticatedProvider(e,env)
 let base;try{base=new URL(env.SUPABASE_URL??env.VITE_SUPABASE_URL)}catch{fail('exact HTTPS database origin required')}
 if(base.protocol!=='https:'||base.username||base.password||base.port||base.pathname!=='/'||base.search||base.hash)fail('exact HTTPS database origin required')
 const tables=new Set(['competitions','countries','players','player_overview','player_season_stats','federations','rounds','matches','appearances','position_priors','position_confidence'])
 function destination(input,options={}){
  const raw=typeof input==='string'?input:input instanceof URL?input.href:input?.url;let u;try{u=new URL(raw)}catch{fail('closed network destination required')}
  if(u.origin!==base.origin||u.protocol!=='https:'||u.username||u.password||u.hash||typeof raw!=='string'||raw.includes('\\')||/%(?:2e|2f|5c)/i.test(u.pathname)||options.dispatcher||options.agent||options.createConnection||options.lookup||options.socketPath)fail('only fixed database REST transport may leave child')
  const m=u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/),method=options.method??input?.method??'GET'
  if(!m||!tables.has(m[1]))fail('only ordinary inactive position/pricing REST tables allowed; no RPC')
  if(!['GET','HEAD'].includes(method)&&!(m[1]==='players'&&method==='PATCH'||m[1]==='position_priors'&&['POST','DELETE'].includes(method)))fail('only ordinary position/pricing operations allowed')
  if(m[1]==='players'&&method==='PATCH'){
   const params=[...u.searchParams.keys()],ids=u.searchParams.getAll('id'),cids=u.searchParams.getAll('competition_id')
   if(params.some(k=>!['id','competition_id'].includes(k))||ids.length!==1||!/^eq\.[1-9]\d{0,19}$/.test(ids[0])||!provider.targetPlayerIds.includes(Number(ids[0].slice(3)))||cids.length>1||cids.length===1&&cids[0]!=='eq.783')fail('G1 player PATCH requires one retained G1 id and no foreign competition filter')
   if(cids.length===0)u.searchParams.append('competition_id','eq.783')
  }
  if(m[1]==='position_priors'&&method==='DELETE'){
   const params=[...u.searchParams.keys()],ids=u.searchParams.getAll('player_id')
   if(params.length!==1||ids.length!==1||!ids[0].startsWith('in.(')||!ids[0].endsWith(')'))fail('G1 prior deletion requires one closed player id list')
   const values=ids[0].slice(4,-1).split(',');if(values.length<1||values.length>200||values.some(x=>!/^[1-9]\d{0,19}$/.test(x)||!provider.targetPlayerIds.includes(Number(x))))fail('G1 prior deletion IDs must belong to the retained G1 inventory')
  }
  return {u,method,table:m[1]}
 }
 async function db(input,options={}){
  const {method,table,u}=destination(input,options)
  if(method==='PATCH'||method==='POST'){
   let body=options.body;if(body===undefined&&input instanceof Request)body=await input.clone().text()
   if(typeof body!=='string'||Buffer.byteLength(body)>2*1024*1024)fail('bounded ordinary pricing/position JSON body required')
   let parsed;try{parsed=JSON.parse(body)}catch{fail('ordinary pricing/position JSON body required')}
   if(table==='players'){
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Object.keys(parsed).length||Object.keys(parsed).some(k=>!['position','position_source','value','value_start'].includes(k)))fail('only ordinary inactive player position/price fields allowed')
    for(const k of ['value','value_start'])if(Object.hasOwn(parsed,k)&&(!Number.isFinite(parsed[k])||parsed[k]<=0))fail('positive ordinary player prices required')
    if(Object.hasOwn(parsed,'position')&&!['GK','DEF','MID','FWD'].includes(parsed.position)||Object.hasOwn(parsed,'position_source')&&parsed.position_source!=='ugibanje')fail('ordinary guessed position fields required')
   }else if(!Array.isArray(parsed)||!parsed.length||parsed.length>200||parsed.some(p=>!p||Object.keys(p).sort().join(',')!=='player_id,position,score,updated_at'||!Number.isSafeInteger(p.player_id)||!provider.targetPlayerIds.includes(p.player_id)||!['GK','DEF','MID','FWD'].includes(p.position)||!Number.isFinite(p.score)||p.score<0||p.score>1||typeof p.updated_at!=='string'||!Number.isFinite(Date.parse(p.updated_at))))fail('ordinary G1 inventory-bounded position-prior upsert required')
  }
  return network(table==='players'&&method==='PATCH'?u.href:input,{...options,redirect:'manual'})
 }
 const documents=new Map(provider.documents.map(d=>[d.sourceUrl,d.html])),offline=fcfOfflineFetch(documents,db),network=globalThis.fetch
 globalThis.fetch=async(input,options={})=>{
  const raw=typeof input==='string'?input:input instanceof URL?input.href:input?.url;let u;try{u=new URL(raw)}catch{fail('closed network destination required')}
  const host=u.hostname.toLowerCase().replace(/\.+$/,'');if(host==='fcf.cat'||host.endsWith('.fcf.cat'))provider.schedule()
  return offline(input,options)
 }
 for(const module of [http,https])for(const method of ['request','get']){
  const original=module[method]
  module[method]=function(input,...args){
   let options={},url=input
   if(typeof input==='object'&&!(input instanceof URL)){
    options=input;const protocol=input.protocol??(module===https?'https:':'http:')
    if(input.auth||input.headers?.host||input.headers?.Host)fail('native database host/auth override refused')
    url=`${protocol}//${input.hostname??input.host}${input.port?':'+input.port:''}${input.path??'/'}`
   }else if(args[0]&&typeof args[0]==='object')options=args[0]
   if(options.auth||options.headers?.host||options.headers?.Host)fail('native database host/auth override refused')
   const d=destination(url,options)
   if(!['GET','HEAD'].includes(d.method)||options.hostname||options.host||options.protocol||options.port||options.path){if(!(typeof input==='object'&&!(input instanceof URL)&&['GET','HEAD'].includes(d.method)))fail('native client only fixed database readonly operations allowed')}
   return original.call(this,input,...args)
  }
 }
 syncBuiltinESMExports();return provider
}
