// Pure memory-only fetch guard; no admission/preloader/CLI is enabled here.
// The future reviewed wrapper must supply only Task5-authenticated documents.
const fail=message=>{throw Error(`FCF_OFFLINE: ${message}`)}
const canonical=/^https:\/\/www\.fcf\.cat\/ca\/competicio\/acta\/([1-9]\d*)$/
const allowed=id=>id>=4109388&&id<=4109627||id>=4118349&&id<=4118588
export function fcfOfflineFetch(documents,network){
 if(!(documents instanceof Map)||typeof network!=='function')fail('fixed document map and database transport required')
 const fixed=new Map()
 for(const [url,html]of documents){
  const match=typeof url==='string'&&url.match(canonical)
  if(!match||!allowed(Number(match[1]))||typeof html!=='string'||!html.length||Buffer.byteLength(html)>2*1024*1024||html.charCodeAt(0)===0xfeff)fail('exact G1/G9 bounded document required')
  fixed.set(url,html)
 }
 return async(input,options={})=>{
  const raw=typeof input==='string'?input:input instanceof URL?input.href:input?.url
  const url=new URL(raw),hostname=url.hostname.toLowerCase().replace(/\.+$/,'')
  if(hostname==='fcf.cat'||hostname.endsWith('.fcf.cat')){
   if((options.method??input?.method??'GET')!=='GET'||options.body!=null||url.username||url.password||url.hash||!canonical.test(raw)||!fixed.has(raw))fail('unpacketized source URL/method refused')
   return new Response(fixed.get(raw),{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}})
  }
  return network(input,options)
 }
}
