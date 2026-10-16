// Anonymous public HTTP sessions only. Never imports browser or caller cookies.
export const jeJavniCookieGate=s=>String(s).replace(/\s+/g,'').toLowerCase()==='<html><head><title></title></head><body><!--<h1>nosehaaceptadoelcookie</h1>--></body></html>'
const zavrni=(message,status=null)=>Object.assign(new Error(`novanet: ${message}`),{zavrnitev:true,status})
export function ustvariAnonimniPrenos({fetchFn=(...args)=>globalThis.fetch(...args),jeIzziv=()=>false,zavrnitev=zavrni,maxPreusmeritev=5,najvecBajtov=5_000_000}={}){
 const jars=new Map()
 return async function prenesi(input,options={}){
  let url=new URL(input),redirects=0,retried=false,fresh=new Set()
  const origin=url.origin,headers=new Headers(options.headers)
  if(url.username||url.password||!['https:','http:'].includes(url.protocol))throw zavrnitev('neanonimen URL')
  headers.delete('cookie');headers.delete('authorization');headers.delete('proxy-authorization')
  const jar=jars.get(origin)??new Map();jars.set(origin,jar)
  const signal=options.signal??AbortSignal.timeout(60000)
  const cookieHeader=(u,onlyFresh=false)=>[...jar.values()].filter(c=>{
   if(c.expires<=Date.now()){jar.delete(c.key);return false}
   return (!onlyFresh||fresh.has(c.key))&&(!c.secure||u.protocol==='https:')&&(u.pathname===c.path||u.pathname.startsWith(c.path.endsWith('/')?c.path:c.path+'/'))
  }).sort((a,b)=>b.path.length-a.path.length).map(c=>`${c.name}=${c.value}`).join('; ')
  while(true){
   const requestHeaders=new Headers(headers),cookie=cookieHeader(url)
   if(cookie)requestHeaders.set('cookie',cookie)
   const response=await fetchFn(url.href,{...options,headers:requestHeaders,redirect:'manual',signal})
   if([401,403,429].includes(response.status)){
    // Disposal is best-effort: an errored body must never replace a refusal
    // with a transient transport error that the shared downloader retries.
    try{await response.body?.cancel()}catch{}
    throw zavrnitev(`HTTP ${response.status}`,response.status)
   }
   for(const raw of response.headers.getSetCookie?.()??[]){
    const [pair,...parts]=raw.split(';'),eq=pair.indexOf('=')
    if(eq<1)continue
    const name=pair.slice(0,eq).trim(),value=pair.slice(eq+1).trim()
    if(!/^[!#$%&'*+.^_`|~\w-]+$/.test(name)||/[\x00-\x20\x7f;,]/.test(value)||raw.length>4096)continue
    const attrs=Object.fromEntries(parts.map(p=>{const i=p.indexOf('=');return i<0?[p.trim().toLowerCase(),true]:[p.slice(0,i).trim().toLowerCase(),p.slice(i+1).trim()]}))
    const domain=String(attrs.domain??url.hostname).replace(/^\./,'').toLowerCase()
    // Keep even Domain cookies strictly inside the issuing origin.
    if(domain!==url.hostname&&!url.hostname.endsWith('.'+domain))continue
    const path=typeof attrs.path==='string'&&attrs.path.startsWith('/')?attrs.path:url.pathname.slice(0,url.pathname.lastIndexOf('/')+1)||'/'
    const key=`${name}:${path}`,previous=jar.get(key)
    let expires=attrs.expires?Date.parse(attrs.expires):Infinity
    if(Number.isNaN(expires))expires=Infinity
    if(typeof attrs['max-age']==='string'&&/^-?\d+$/.test(attrs['max-age']))expires=Date.now()+Number(attrs['max-age'])*1000
    if(expires<=Date.now()){jar.delete(key);continue}
    jar.set(key,{key,name,value,path,secure:!!attrs.secure,expires})
    if(!previous||previous.value!==value)fresh.add(key)
   }
   if([301,302,303,307,308].includes(response.status)){
    await response.body?.cancel()
    const location=response.headers.get('location')
    if(!location)throw zavrnitev('preusmeritev brez cilja')
    const next=new URL(location,url)
    if(next.origin!==origin||next.username||next.password)throw zavrnitev('preusmeritev mora ostati same-origin')
    if(redirects++>=maxPreusmeritev)throw zavrnitev('preveč preusmeritev')
    url=next;continue
   }
   // Preserve status-only failures for the shared transient retry contract.
   if(!response.ok)return response
   const chunks=[];let size=0
   if(response.body){const reader=response.body.getReader();while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>najvecBajtov){await reader.cancel();throw zavrnitev('prevelik dokument')}chunks.push(value)}}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
   const body=new TextDecoder().decode(bytes)
   if(jeIzziv(body))throw zavrnitev('izziv')
   if(jeJavniCookieGate(body)){
    if(retried||!cookieHeader(url,true))throw zavrnitev('javni cookie gate brez uporabne nove seje')
    retried=true;fresh.clear();continue
   }
   return new Response([204,205,304].includes(response.status)?null:bytes,{status:response.status,statusText:response.statusText,headers:response.headers})
  }
 }
}
