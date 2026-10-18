// Dedicated release preloader. Unknown HNS requests never fall through to live
// source; all original bytes are verified before the global fetch is replaced.
import {readHnsWomenPacket} from './hr-zenske-paket.mjs'
const fail=message=>{throw Error(`HNS women closed packet: ${message}`)}
export function createHnsWomenOfflineFetch(documents,originalFetch) {
 const byURL=new Map()
 for(const d of documents)for(const url of [d.url,d.canonicalUrl])if(url){if(byURL.has(url)&&byURL.get(url)!==d)fail('duplicate source URL');byURL.set(url,d)}
 return async(input,init={})=>{
  const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url,url=new URL(raw)
  const host=url.hostname.replace(/\.+$/,'')
  if(host==='hns.family'||host.endsWith('.hns.family')) {
   const d=byURL.get(raw)
   if(!d||url.protocol!=='https:'||(init.method??input?.method??'GET')!=='GET')fail(`source request absent from approved packet: ${raw}`)
   return new Response(d.body,{status:200,headers:{'content-type':'text/html; charset=utf-8'}})
  }
  return originalFetch(input,init)
 }
}
let active=null
export function hnsWomenOfflineDocument(url) {
 if(!active)return null
 const d=active.documents.find(d=>d.url===url||d.canonicalUrl===url)
 if(!d)fail('source/cache identity absent from approved packet')
 return d
}
if(process.env.SLFF_HNS_WOMEN_PACKET_DIR) {
 const approvedSha256=process.env.SLFF_HNS_WOMEN_PACKET_SHA256
 active=readHnsWomenPacket(process.env.SLFF_HNS_WOMEN_PACKET_DIR,{approvedSha256,requireReady:true})
 globalThis.fetch=createHnsWomenOfflineFetch(active.documents,globalThis.fetch)
}
