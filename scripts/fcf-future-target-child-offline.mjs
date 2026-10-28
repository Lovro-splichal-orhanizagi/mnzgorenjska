import {getFcfFutureTarget} from './fcf-future-target-catalog.mjs'
// Future-only child preload boundary. Reader-owned source is reauthenticated at
// EVERY source request's actual clock; no stale provider/documents capability.
import {readFileSync,lstatSync,realpathSync,existsSync,openSync,fstatSync,closeSync,constants} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import http from 'node:http'
import https from 'node:https'
import {syncBuiltinESMExports} from 'node:module'
import {decodeFcfTargetWire} from './fcf-target-child-offline.mjs'
import {readFcfFutureCapturedTargetEvidence} from './fcf-future-source-admission.mjs'
import {loadFcfFutureTargetOfflineProvider} from './fcf-future-target-native-adapter.mjs'
import {fcfOfflineFetch} from './fcf-target-offline.mjs'
const fail=m=>{throw Error(`FCF_FUTURE_CHILD: ${m}`)},sha=t=>createHash('sha256').update(t).digest('hex')
function keys(x,fields,label){if(!x||Object.getPrototypeOf(x)!==Object.prototype||Object.keys(x).sort().join(',')!==fields.slice().sort().join(','))fail(`${label} closed fields required`)}
function privateFile(env){
 const path=env.FCF_FUTURE_TARGET_OFFLINE_FILE,expected=env.FCF_FUTURE_TARGET_OFFLINE_SHA256
 let fd
 try{
  if(typeof path!=='string'||resolve(path)!==path||realpathSync(path)!==path||!lstatSync(path).isFile()||!/^[a-f0-9]{64}$/.test(expected??''))fail('exact private parent evidence file required')
  fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);const s=fstatSync(fd)
  if(!s.isFile()||(s.mode&0o077)!==0||s.uid!==process.getuid()||s.size<1||s.size>384*1024*1024)fail('owner-only bounded regular parent evidence file required')
  const bytes=readFileSync(fd);if(bytes.length!==s.size||sha(bytes)!==expected)fail('exact parent file hash differs')
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))
 }catch{fail('exact owner-only canonical parent evidence file/TEXT/SHA required')}
 finally{if(fd!==undefined)closeSync(fd)}
}
export function installFcfFutureTargetChildOffline(input={}){
 keys(input,Object.keys(input).filter(k=>['env','network','now'].includes(k)),'child options')
 const {env=process.env,network=globalThis.fetch}=input,now=Object.hasOwn(input,'now')?input.now:Date.now()
 if(typeof network!=='function'||!Number.isSafeInteger(now))fail('actual child clock/transport required')
 if(existsSync(resolve(dirname(fileURLToPath(import.meta.url)),'.predpomnilnik')))fail('source cache must be absent')
 const e=privateFile(env);keys(e,['wire','targetSlug','sourceCommit','targetPacketText','targetPacketSha256'],'parent envelope')
 getFcfFutureTarget({targetSlug:e.targetSlug})
 if(!/^[a-f0-9]{40}$/.test(e.sourceCommit??''))fail('future G9 selected writer scope required')
 const wire=decodeFcfTargetWire(e.wire),inventoryAdmission=readFcfFutureCapturedTargetEvidence({...wire,now}),provider=loadFcfFutureTargetOfflineProvider({targetSlug:e.targetSlug,sourceCommit:e.sourceCommit,inventoryAdmission,targetPacketText:e.targetPacketText,targetPacketSha256:e.targetPacketSha256,now})
 let base;try{base=new URL(env.SUPABASE_URL??env.VITE_SUPABASE_URL)}catch{fail('exact HTTPS database origin required')}
 if(base.protocol!=='https:'||base.username||base.password||base.port||base.pathname!=='/'||base.search||base.hash)fail('exact HTTPS database origin required')
 const tables=new Set(['competitions','countries','players','player_overview','player_season_stats','federations','rounds','matches','appearances','position_priors','position_confidence'])
 function destination(input,options={}){
  const raw=typeof input==='string'?input:input instanceof URL?input.href:input?.url
  let u;try{u=new URL(raw)}catch{fail('closed network destination required')}
  if(u.origin!==base.origin||u.protocol!=='https:'||u.username||u.password||u.hash||typeof raw!=='string'||raw.includes('\\')||/%(?:2e|2f|5c)/i.test(u.pathname)||options.dispatcher||options.agent||options.createConnection||options.lookup||options.socketPath)fail('only fixed database REST transport may leave child')
  const m=u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/),method=options.method??input?.method??'GET'
  if(!m||!tables.has(m[1]))fail('only ordinary inactive position/pricing REST tables allowed; no RPC')
  if(!['GET','HEAD'].includes(method)&&!(m[1]==='players'&&method==='PATCH'||m[1]==='position_priors'&&['POST','DELETE'].includes(method)))fail('only ordinary position/pricing operations allowed')
  return {u,method,table:m[1]}
 }
 async function db(input,options={}){
  const {method,table}=destination(input,options)
  if(method==='PATCH'||method==='POST'){
   let body=options.body;if(body===undefined&&input instanceof Request)body=await input.clone().text()
   if(typeof body!=='string'||Buffer.byteLength(body)>2*1024*1024)fail('bounded ordinary pricing/position JSON body required')
   let parsed;try{parsed=JSON.parse(body)}catch{fail('ordinary pricing/position JSON body required')}
   if(table==='players'){
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Object.keys(parsed).length||Object.keys(parsed).some(k=>!['position','position_source','value','value_start'].includes(k)))fail('only ordinary inactive player position/price fields allowed')
    for(const k of ['value','value_start'])if(Object.hasOwn(parsed,k)&&(!Number.isFinite(parsed[k])||parsed[k]<=0))fail('positive ordinary player prices required')
    if(Object.hasOwn(parsed,'position')&&!['GK','DEF','MID','FWD'].includes(parsed.position)||Object.hasOwn(parsed,'position_source')&&parsed.position_source!=='ugibanje')fail('ordinary guessed position fields required')
   }else{
    if(!Array.isArray(parsed)||!parsed.length||parsed.length>200||parsed.some(p=>!p||Object.keys(p).sort().join(',')!=='player_id,position,score,updated_at'||!Number.isSafeInteger(p.player_id)||p.player_id<1||!['GK','DEF','MID','FWD'].includes(p.position)||!Number.isFinite(p.score)||p.score<0||p.score>1||typeof p.updated_at!=='string'||!Number.isFinite(Date.parse(p.updated_at))))fail('ordinary bounded position-prior upsert required')
   }
  }
  return network(input,{...options,redirect:'manual'})
 }
 const documents=new Map(provider.documents.map(d=>[d.receipt.sourceUrl,d.html])),offline=fcfOfflineFetch(documents,db)
 globalThis.fetch=async(input,options={})=>{
  const raw=typeof input==='string'?input:input instanceof URL?input.href:input?.url
  let u;try{u=new URL(raw)}catch{fail('closed network destination required')}
  const host=u.hostname.toLowerCase().replace(/\.+$/,'')
  if(host==='fcf.cat'||host.endsWith('.fcf.cat'))provider.schedule() // Date.now(), SAME proof+packet; no input.now reuse.
  return offline(input,options)
 }
 // Ordinary programs use fetch. Native HTTP clients may only read the same DB
 // REST tables; source endpoints and arbitrary/native write transports refuse.
 for(const module of [http,https])for(const method of ['request','get']){
  const original=module[method]
  module[method]=function(input,...args){
   let options={},url=input
   if(typeof input==='object'&&!(input instanceof URL)){
    options=input
    const protocol=input.protocol??(module===https?'https:':'http:')
    if(input.auth||input.headers?.host||input.headers?.Host)fail('native database host/auth override refused')
    url=`${protocol}//${input.hostname??input.host}${input.port?':'+input.port:''}${input.path??'/'}`
   }else if(args[0]&&typeof args[0]==='object')options=args[0]
   if(options.auth||options.headers?.host||options.headers?.Host)fail('native database host/auth override refused')
   const d=destination(url,options)
   if(!['GET','HEAD'].includes(d.method)||options.hostname||options.host||options.protocol||options.port||options.path){
    // Object-style options already constructed their URL above; the original
    // fields are checked against that exact origin by destination.
    if(!(typeof input==='object'&&!(input instanceof URL)&&['GET','HEAD'].includes(d.method)))fail('native client only fixed database readonly operations allowed')
   }
   return original.call(this,input,...args)
  }
 }
 syncBuiltinESMExports()
 return provider
}
