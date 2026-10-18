import {readFileSync,lstatSync,realpathSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import http from 'node:http'
import https from 'node:https'
import {syncBuiltinESMExports} from 'node:module'
import {readFcfCapturedTargetEvidence} from './fcf-target-evidence.mjs'
import {loadFcfTargetOfflineProvider} from './fcf-target-native-adapter.mjs'
import {fcfOfflineFetch} from './fcf-target-offline.mjs'
const fail=m=>{throw Error(`FCF_CHILD_OFFLINE: ${m}`)}
export function encodeFcfTargetWire(wire){
 const visit=x=>Buffer.isBuffer(x)?{$fcfBuffer:x.toString('base64')}:Array.isArray(x)?x.map(visit):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,visit(v)])):x
 return visit(wire)
}
export function decodeFcfTargetWire(wire){
 const visit=x=>{if(x&&typeof x==='object'&&Object.keys(x).join(',')==='$fcfBuffer'){if(typeof x.$fcfBuffer!=='string'||Buffer.byteLength(x.$fcfBuffer)>140*1024*1024||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(x.$fcfBuffer))fail('invalid raw evidence buffer');return Buffer.from(x.$fcfBuffer,'base64')}return Array.isArray(x)?x.map(visit):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,visit(v)])):x}
 return visit(wire)
}
export function installFcfTargetChildOffline({env=process.env,network=globalThis.fetch,now=Date.now()}={}){
 const path=env.FCF_TARGET_OFFLINE_FILE,expected=env.FCF_TARGET_OFFLINE_SHA256
 if(!path||resolve(path)!==path||realpathSync(path)!==path||!lstatSync(path).isFile()||(lstatSync(path).mode&0o077)!==0||lstatSync(path).size>384*1024*1024||!/^[a-f0-9]{64}$/.test(expected??''))fail('exact private parent evidence file required')
 if(existsSync(resolve(dirname(fileURLToPath(import.meta.url)),'.predpomnilnik')))fail('source cache must be absent')
 const bytes=readFileSync(path);if(createHash('sha256').update(bytes).digest('hex')!==expected)fail('parent evidence file changed')
 const e=JSON.parse(bytes),wire=decodeFcfTargetWire(e.wire),inventoryAdmission=readFcfCapturedTargetEvidence({...wire,targetSlug:e.targetSlug,now}),provider=loadFcfTargetOfflineProvider({targetSlug:e.targetSlug,inventoryAdmission,targetPacketText:e.targetPacketText,targetPacketSha256:e.targetPacketSha256,now})
 const base=new URL(env.SUPABASE_URL??env.VITE_SUPABASE_URL??'')
 if(base.protocol!=='https:'||base.username||base.password||base.port||base.pathname!=='/'||base.search||base.hash)fail('exact HTTPS database origin required')
 const allow=input=>{const raw=typeof input==='string'?input:input instanceof URL?input.href:input?.url;let u;try{u=new URL(raw)}catch{fail('closed network destination required')};if(u.origin!==base.origin||u.username||u.password)fail('only database transport may leave child');return u}
 const documents=new Map(provider.documents.map(d=>[d.receipt.sourceUrl,d.html]))
 globalThis.fetch=fcfOfflineFetch(documents,(input,options={})=>{allow(input);return network(input,{...options,redirect:'manual'})})
 for(const module of[http,https])for(const method of['request','get']){const original=module[method];module[method]=function(input,...args){if(typeof input==='object'&&!(input instanceof URL)){const protocol=input.protocol??(module===https?'https:':'http:');allow(`${protocol}//${input.hostname??input.host}${input.port?':'+input.port:''}${input.path??'/'}`)}else allow(input);return original.call(this,input,...args)}}
 syncBuiltinESMExports();return provider
}
