// One ledger per batch, including failed requests and public AJAX POSTs.
import {fussballRoundScope} from './lib/fussball-capture.mjs'
const UUID='[a-f0-9-]{36}',gap={'wmzpn.pl':3000,'szpnkielce.pl':3000,'www.fussball.de':6000}
const stop=(host,reason,code='SOURCE_STOP')=>Object.assign(Error(reason),{sourceStop:true,host,reason_code:code})
function publicRequest(input,init){
 const u=new URL(input),method=(init.method??'GET').toUpperCase(),keys=[...u.searchParams.keys()]
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||u.href!==String(input)||!(u.hostname in gap))throw Error('Unapproved public source origin.')
 let ok=false
 if(u.hostname==='www.fussball.de')ok=method==='GET'&&!u.search&&(fussballRoundScope(u.href)||/^\/spiel\/(?:[a-z0-9]+(?:-{1,2}[a-z0-9]+)*\/)?-\/spiel\/[A-Z0-9]{32}$/.test(u.pathname)||/^\/ajax\.match\.lineup\/-\/mode\/PAGE\/spiel\/[A-Z0-9]{32}(?:\/ticker-id\/selectedTickerId)?$/.test(u.pathname)||/^\/export\.fontface\/-\/(?:id\/[a-z0-9]{8}\/type\/css|format\/woff\/id\/[a-z0-9]{8}\/type\/font)$/.test(u.pathname))
 if(u.hostname==='wmzpn.pl'){
  if(method==='GET')ok=u.pathname==='/'&&keys.length===4&&new Set(keys).size===4&&keys.every(k=>['page_id','leagueN','play','season'].includes(k))&&u.searchParams.get('page_id')==='1625'
  if(method==='POST'){const body=new URLSearchParams(init.body);ok=u.pathname==='/wp-admin/admin-ajax.php'&&!u.search&&[...body.keys()].length===2&&body.get('action')==='match_history'&&new RegExp('^'+UUID+'$').test(body.get('matchid')??'')}
 }
 if(u.hostname==='szpnkielce.pl')ok=method==='GET'&&u.pathname.startsWith('/wp-json/szpn/v1/proxy/')&&(/\/matches\.json$/.test(u.pathname)&&keys.every(k=>['play_id','type','limit','page','tz'].includes(k))||new RegExp('/pzpn/shared/matches/'+UUID+'/events\\.json$').test(u.pathname)&&!u.search)
 if(!ok)throw Error('Unapproved public source route or method.')
 return {u,method}
}
export function createBulkSourceBudget({limits,fetch:request=globalThis.fetch,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),onCheckpoint=()=>{},maxBytes=8*1024*1024}={}){
 if(!limits||!Object.keys(limits).length||Object.entries(limits).some(([host,n])=>!(host in gap)||!Number.isSafeInteger(n)||n<1||n>4000))throw Error('Explicit supported-host request limits 1–4000 required.')
 const state={version:1,hosts:Object.fromEntries(Object.entries(limits).map(([h,limit])=>[h,{limit,requests:0,pending:null,stopped:null,last_started_at:null}]))};let queue=Promise.resolve()
 const snapshot=()=>structuredClone(state),save=()=>onCheckpoint(snapshot())
 async function perform(input,init={}){
  const {u,method}=publicRequest(input,init),host=u.hostname,s=state.hosts[host]
  if(!s)throw Error('Source host outside selected request scope.')
  if(s.stopped)throw stop(host,s.stopped)
  if(s.requests>=s.limit){s.stopped='Source request budget exhausted.';await save();throw stop(host,s.stopped,'SOURCE_BUDGET_EXHAUSTED')}
  if(s.last_started_at!==null)await sleep(Math.max(0,gap[host]-(now()-s.last_started_at)))
  s.requests++;s.last_started_at=now();s.pending={number:s.requests,method,url:u.href,started_at:new Date(now()).toISOString()};await save()
  let response,reader
  try{
   response=await request(u.href,{method,body:method==='POST'?String(init.body):undefined,headers:{'user-agent':'SLFF/1.0 (+https://slff.eu; info@slff.eu)',accept:'text/html,application/json,text/css,font/woff',...(method==='POST'?{'content-type':'application/x-www-form-urlencoded'}:{})},redirect:'manual',signal:AbortSignal.timeout(30000)})
   if(response.status!==200)throw Error(`Public source HTTP ${response.status}; no retry.`)
   const declared=response.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>maxBytes))throw Error('Source response exceeds byte limit.')
   if(!response.body)throw Error('Source body absent.')
   reader=response.body.getReader();const chunks=[];let size=0
   while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>maxBytes)throw Error('Source response exceeds byte limit.');chunks.push(r.value)}
   if(!size)throw Error('Empty source response.')
   const bytes=Buffer.concat(chunks),type=response.headers.get('content-type')??''
   if(/html|json/i.test(type)&&/cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|<title>\s*(?:Just a moment|Attention Required)/i.test(bytes.toString('utf8')))throw Error('Public source challenge; no retry.')
   s.pending=null;await save()
   const headers=new Headers(response.headers);headers.delete('content-encoding');headers.set('content-length',String(size))
   const result=new Response(bytes,{status:200,headers});Object.defineProperty(result,'url',{value:u.href});return result
  }catch(error){await reader?.cancel().catch(()=>{});await response?.body?.cancel().catch(()=>{});s.stopped=error.message;await save();throw stop(host,error.message)}
 }
 return {snapshot,fetch:(...args)=>{const result=queue.then(()=>perform(...args));queue=result.catch(()=>{});return result}}
}
