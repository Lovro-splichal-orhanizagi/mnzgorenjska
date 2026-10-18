// Node --import preloader. It never falls back to live DFB. Database fetch is untouched.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { preveriOdobritev, preveriPosnetek, sha } from './vklopi-dfb-regijo.mjs'
export function offlineFetch(documents,network){
 return async(input,options={})=>{
  const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url,url=new URL(raw)
  const hostname=url.hostname.replace(/\.+$/,'')
  if(hostname==='dfb.de'||hostname.endsWith('.dfb.de')){
   if(url.origin!=='https://datencenter.dfb.de'||url.username||url.password||url.hash||(options.method??input.method??'GET')!=='GET'||!documents.has(raw))throw Error(`Offline DFB: missing/unapproved URL or method ${raw}`)
   return new Response(documents.get(raw),{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}})
  }
  return network(input,options)
 }
}
export function loadApprovedDocuments(manifest,approvedSha,dirs){
 const m=preveriOdobritev(manifest,approvedSha),documents=new Map()
 if(dirs.length!==2)throw Error('Two captured seasons required')
 for(const [i,dir]of dirs.entries()){
  const index=readFileSync(resolve(dir,'prenosi.json')),s=preveriPosnetek(dir,JSON.parse(index))
  if(m.version>=2&&sha(index)!==m.seasons[i].lineage.capture.indexSha256)throw Error('Offline DFB: original index bytes changed')
  if(s.documentsSha256!==m.seasons[i].documentsSha256||s.capturedAt!==m.seasons[i].capturedAt)throw Error('Offline DFB: captured source changed')
  for(const [url,body]of s.documents){if(documents.has(url)&&documents.get(url)!==body)throw Error('Conflicting captured documents');documents.set(url,body)}
 }
 return documents
}
if(process.env.SLFF_DFB_MANIFEST){
 const raw=readFileSync(process.env.SLFF_DFB_MANIFEST,'utf8'),documents=loadApprovedDocuments(raw,process.env.SLFF_DFB_APPROVED_SHA,[process.env.SLFF_DFB_ARCHIVE,process.env.SLFF_DFB_CURRENT])
 globalThis.fetch=offlineFetch(documents,globalThis.fetch)
}
