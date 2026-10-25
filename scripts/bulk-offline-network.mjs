// Native children can only call this deployment's database, never a source host.
const original=globalThis.fetch
const base=new URL(process.env.SUPABASE_URL??'https://invalid.invalid')
if(base.protocol!=='https:'||base.username||base.password||base.hostname==='invalid.invalid')throw Error('Exact HTTPS database origin required for offline bulk import.')
globalThis.fetch=(input,init)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url)
 if(url.origin!==base.origin||url.username||url.password||url.hash||!url.pathname.startsWith('/rest/v1/'))throw Error('Offline bulk child refused non-database network access.')
 return original(input,{...init,redirect:'error'})
}
