// Native children can call the deployment database and the one fixed served-head marker.
const original=globalThis.fetch
const base=new URL(process.env.SUPABASE_URL??'https://invalid.invalid')
if(base.protocol!=='https:'||base.username||base.password||base.hostname==='invalid.invalid')throw Error('Exact HTTPS database origin required for offline bulk import.')
globalThis.fetch=(input,init)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url)
 if(url.href==='https://slff.eu/'&&(init?.method===undefined||init?.method==='GET')){
  const headers=new Headers(init?.headers)
  const allowedOptions=new Set(['headers','credentials','redirect','signal'])
  if((typeof input==='string'||input instanceof URL)&&Object.keys(init??{}).every(k=>allowedOptions.has(k))&&init?.credentials==='omit'&&init?.redirect==='error'&&[...headers].length===1&&headers.get('Cache-Control')==='no-cache')return original(input,{...init,method:'GET',signal:AbortSignal.any([...(init.signal?[init.signal]:[]),AbortSignal.timeout(30000)]),redirect:'error'})
  throw Error('Offline bulk child refused unsafe served-head request.')
 }
 if(url.origin!==base.origin||url.username||url.password||url.hash||!url.pathname.startsWith('/rest/v1/'))throw Error('Offline bulk child refused non-database network access.')
 return original(input,{...init,redirect:'error'})
}
