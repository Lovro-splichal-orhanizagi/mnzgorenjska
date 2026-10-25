// Closed Poland source packs. Transport is always injected; this module has no DB/env access.
import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import pzpn,{vZapisnik as pzpnReport,nastopi as pzpnAppearances,razbijKodo as pzpnCode,jePauza,jeWalkower,izid,stevilkaKroga,casTekme,sezonaIzDatuma,minuta} from './viri/pzpn.mjs'
import wmzpn,{wmzpnFetch,tekmeStrani,vZapisnik as wmReport,naslovLige,naslovZapisnika,jeIzziv} from './viri/wmzpn.mjs'
const clone=x=>structuredClone(x),hash=x=>createHash('sha256').update(x).digest('hex'),json=x=>JSON.stringify(x)+'\n'
export const POLAND_BULK_CANDIDATES=Object.freeze(JSON.parse(readFileSync(new URL('./policies/pl-bulk-candidates.json',import.meta.url),'utf8')).candidates.map(c=>Object.freeze({...c,archives:Object.freeze(c.archives.map(a=>Object.freeze(a)))})))
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/,MAX_BYTES=4*1024*1024
const hold=(code,message)=>{throw Object.assign(Error(`Poland source HOLD: ${message}`),{dataHold:true,reason_code:code})}
const require=(ok,code,message)=>{if(!ok)hold(code,message)}
const stop=(candidate,code,message)=>{throw Object.assign(Error(`Poland source stopped: ${message}`),{sourceStop:true,host:candidate.host,reason_code:code})}
const normalized=x=>Array.isArray(x)?x.map(normalized):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalized(x[k])])):x
const same=(a,b)=>json(normalized(a))===json(normalized(b))
const fileStat=path=>{try{return lstatSync(path)}catch(error){if(['ENOENT','ENOTDIR'].includes(error.code))hold('CAPTURE_FILES','source evidence missing');throw error}}
const publishedMinute=value=>typeof value==='string'&&/^\d{1,3}'?(?:\s*\+\s*\d+'?)?$/.test(value)&&minuta(value)!==null
const clock=now=>new Date(typeof now==='function'?now():now??Date.now()).toISOString()
function scope(candidate){require(POLAND_BULK_CANDIDATES.some(c=>same(c,candidate)),'CANDIDATE_SCOPE','exact reviewed candidate mapping required');require(candidate.archives.length>0,'MISSING_ARCHIVE','no reviewed archive exists for this league')}
const requestKey=(url,init={})=>json([String(init.method??'GET').toUpperCase(),String(url),String(init.body??'')])
function jsonResponse(bytes,candidate){let d;try{d=JSON.parse(bytes.toString('utf8'))}catch{stop(candidate,'SOURCE_PROTOCOL','provider did not return JSON')};if(d?.success===false)stop(candidate,'SOURCE_REFUSAL','provider refused public request');return d}
async function bytesOf(response,candidate){
 const declared=response.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BYTES))stop(candidate,'SOURCE_SIZE','response byte bound exceeded')
 const chunks=[];let length=0;const reader=response.body?.getReader();if(!reader)stop(candidate,'SOURCE_PROTOCOL','missing response body')
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_BYTES){await reader.cancel();stop(candidate,'SOURCE_SIZE','response byte bound exceeded')}chunks.push(value)}}finally{reader.releaseLock()}
 return Buffer.concat(chunks,length)
}
function pagedUrl(code,type,page){const {api,play}=pzpnCode(code);return `${api}/matches.json?play_id=${play}&type=${type}&limit=500&page=${page}&tz=Europe/Warsaw`}
async function inventory(code,type,read,candidate){
 const rows=[],ids=new Set();let total=null
 for(let page=1;page<=21;page++){
  const d=jsonResponse(await read(pagedUrl(code,type,page)),candidate)
  require(Array.isArray(d?.data)&&d.data.length<=500,'PAGINATION_SHAPE','bounded results/schedule data array required')
  const meta=d.meta
  if(meta&&['current_page','last_page','total','per_page'].some(k=>Object.hasOwn(meta,k))){require(['current_page','last_page','total','per_page'].every(k=>Number.isSafeInteger(meta[k]))&&meta.current_page===page&&meta.last_page>=1&&meta.last_page<=20&&meta.total>=0&&meta.total<=10000&&meta.per_page>0&&meta.per_page<=500&&(total===null||total===meta.total),'PAGINATION_META','contradictory pagination metadata');total=meta.total}
  if(d.data.length===0){require(total===null||rows.length===total,'PAGINATION_TRUNCATED','terminal empty page contradicts provider total');return rows}
  require(page<=20,'PAGINATION_BOUND','results/schedule inventory exceeds bounded pages')
  for(const t of d.data){require(UUID.test(t?.id??'')&&!ids.has(t.id),'PAGINATION_DUPLICATE','repeated, anonymous or duplicate inventory row');ids.add(t.id);rows.push(t)}
 }
 hold('PAGINATION_BOUND','missing terminal empty inventory page')
}
function strictReport(t,body,season,identities){
 const raw=jsonResponse(body,{host:'szpnkielce.pl'})
 for(const side of ['host','guest']){
  const squad=raw?.events?.[side]?.squad
  require(Array.isArray(squad)&&squad.length>=7,'REPORT_SQUAD','published complete squad missing')
  require(squad.every(p=>p&&typeof p==='object'),'REPORT_SQUAD','malformed squad row');const starters=squad.filter(p=>p.type==='Starter')
  require(starters.length>=7&&starters.length<=11&&starters.filter(p=>p.isKeeper===true).length===1,'REPORT_KEEPER','7–11 starters and one explicit published keeper required')
  const sourceIds=new Set()
  for(const p of squad){
   require(UUID.test(p.id??'')&&!sourceIds.has(p.id)&&typeof p.isKeeper==='boolean'&&['Starter','Substitute'].includes(p.type)&&Number.isSafeInteger(Number(p.number))&&p.firstname&&p.lastname,'REPORT_IDENTITY','source profile/role/shirt facts missing or ambiguous');sourceIds.add(p.id)
   require(Array.isArray(p.substitutions)&&Array.isArray(p.goals)&&Array.isArray(p.cards),'REPORT_EVENTS','individual source event arrays required')
   for(const event of [...p.goals,...p.cards])require(event&&typeof event==='object'&&typeof event.type==='string'&&publishedMinute(event.minute),'REPORT_EVENTS','source event type or published minute missing')
   let active=p.type==='Starter',last=-1
   for(const change of p.substitutions){require(change&&typeof change==='object'&&publishedMinute(change.minute),'REPORT_SUBSTITUTION','source substitution minute missing or malformed');const minute=minuta(change.minute);require(minute!==null&&minute>=last&&change.type===(active?'Out':'In'),'REPORT_SUBSTITUTION','missing, untimed or contradictory source substitution');last=minute;active=!active}
  }
 }
 const z=pzpnReport(t,raw);require(z&&!z.nepopoln&&z.sezona===season&&z.krog===stevilkaKroga(t.round_label),'REPORT_BINDING','report/current/archive season or round differs')
 const nastopi=pzpnAppearances(z)
 for(const warning of z.opozorila)require([z.domaci,z.gostje].some(e=>e.postava.length>=7&&e.postava.length<=10&&warning===`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`),'REPORT_WARNING','unexplained or inferred source statistics')
 const bySide=[0,1].map(side=>nastopi.filter(a=>a.ekipaIdx===side))
 for(const [side,rows]of bySide.entries()){
  const starters=rows.filter(a=>a.zacetnik),loss=rows.filter(a=>a.rdeci&&(a.zacetnik||a.minute>0)).reduce((sum,a)=>sum+90-a.minutaDo,0)
  require(rows.every(a=>Number.isSafeInteger(a.regSt)&&a.regSt>0&&Number.isSafeInteger(a.minute)&&a.minutaOd>=0&&a.minutaDo<=90&&a.minutaDo>=a.minutaOd&&a.minute===a.minutaDo-a.minutaOd)&&rows.reduce((sum,a)=>sum+a.minute,0)===90*starters.length-loss,'REPORT_MINUTES','individual/team source minute intervals do not reconcile')
  const times=[...new Set([0,90,...rows.flatMap(a=>[a.minutaOd,a.minutaDo])])].sort((a,b)=>a-b)
  for(let i=1;i<times.length;i++){const time=(times[i-1]+times[i])/2;require(rows.filter(a=>a.minutaOd<=time&&a.minutaDo>time).length===starters.length-rows.filter(a=>a.rdeci&&(a.zacetnik||a.minute>0)&&a.minutaDo<=time).length,'REPORT_MINUTES','timed substitutions do not reconcile')}
  const rawSquad=raw.events[side===0?'host':'guest'].squad
  for(const a of rows){const p=rawSquad.filter(p=>p.number===a.st&&`${p.lastname} ${p.firstname}`.replace(/\s+/g,' ').trim()===a.ime);require(p.length===1,'REPORT_IDENTITY','normalized appearance does not resolve to a unique full profile');const old=identities.get(a.regSt);require(!old||old===p[0].id,'PROFILE_COLLISION','numeric source-profile collision');identities.set(a.regSt,p[0].id);a.source_profile_id=p[0].id}
 }
 for(const g of z.goli){const actor=nastopi.filter(a=>a.ekipaIdx===g.ekipaIdx&&a.regSt===g.regSt);require(actor.length===1&&Number.isInteger(g.minuta)&&g.minuta>=actor[0].minutaOd&&g.minuta<=actor[0].minutaDo,'REPORT_SCORER','source scorer identity or interval missing')}
 return {z,nastopi}
}
async function normalize(candidate,read){
 const seasons=[],identities=new Map()
 for(const {code,season}of [{code:candidate.source_league_code,season:candidate.season},...candidate.archives]){
  if(candidate.source==='wmzpn'){
   const page=(await read(naslovLige(code))).toString('utf8');if(jeIzziv(page))stop(candidate,'SOURCE_REFUSAL','provider challenge')
   const rows=tekmeStrani(page);require(rows.length>0,'WMZPN_INVENTORY','complete published timetable missing')
   const match=rows.find(t=>t.odigrana&&!t.walkower);require(match,'REPORTS_MISSING','no complete played reports')
   const response=await wmzpnFetch(naslovZapisnika(code,match.id),{redirect:'manual'},async(url,init)=>new Response(await read(url,init)))
   const text=await response.text();if(jeIzziv(text))stop(candidate,'SOURCE_REFUSAL','provider report challenge')
   const z=wmReport(text,match);require(z,'REPORT_UNAVAILABLE','published WMZPN report missing')
   if(z.brezMenjav?.some(Boolean))hold('WMZPN_ROLLING_SUBSTITUTIONS','source has no proven player entry/exit intervals')
   hold('WMZPN_KEEPER_EVIDENCE_MISSING','WMZPN does not publish keeper role evidence; never infer it')
  }
  const results=await inventory(code,'results',read,candidate),scheduled=await inventory(code,'schedule',read,candidate),merged=new Map()
  for(const t of [...results,...scheduled]){const previous=merged.get(t.id);require(!previous||same(previous,t),'INVENTORY_CONTRADICTION','results and schedule contradict the same match');merged.set(t.id,t)}
  const rows=[...merged.values()].filter(t=>!jePauza(t));require(rows.length>0,'INVENTORY_EMPTY','full source inventory empty')
  const reports=[]
  for(const t of rows){
   require(UUID.test(t.host?.id??'')&&UUID.test(t.guest?.id??'')&&t.host.id!==t.guest.id&&t.host.name&&t.guest.name&&stevilkaKroga(t.round_label)&&casTekme(t.kickoff_at).datum&&Number.isFinite(Date.parse(t.kickoff_at))&&sezonaIzDatuma(casTekme(t.kickoff_at).datum)===season,'FIXTURE_BINDING','fixture team/date/season/round missing or contradictory')
   const final=izid(t.score?.final),full=izid(t.score?.full_time);require(!final||!full||same(final,full),'PUBLISHED_SCORE_CONTRADICTION','published score fields contradict')
   require(t.state==='Rozegrany'||t.state==='Nierozegrany'||jeWalkower(t),'FIXTURE_STATE','unknown published match state')
   if(t.state==='Rozegrany')require(final||full,'PUBLISHED_SCORE_MISSING','played label is not a published result')
   if(jeWalkower(t)){require(final||full,'PUBLISHED_SCORE_MISSING','walkover without published score');continue}
   if(t.state!=='Rozegrany'){require(!final&&!full,'FIXTURE_STATE','unplayed state contradicts published score');continue}
   const url=pzpn.naslovZapisnika(code,t.id),{z,nastopi}=strictReport(t,await read(url),season,identities);z.url=url;reports.push({id:String(t.id),url,z,nastopi})
  }
  require(reports.length>0,'REPORTS_MISSING','season has no complete reports')
  const schedule=await pzpn.razporedVseStrani(code,async url=>json({success:true,data:new URL(url).searchParams.get('type')==='results'?results:scheduled}))
  require(schedule.reduce((n,r)=>n+r.tekme.length,0)===rows.length,'INVENTORY_DROPPED','adapter dropped a published fixture')
  seasons.push({code,season,schedule,reports})
 }
 return seasons
}
export async function capturePolandCandidate(candidate,{directory,maxRequests,now,fetch:request}={}){
 scope(candidate);if(typeof request!=='function'||!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>1000)throw Error('Injected bounded fetch and maxRequests1..1000 required')
 require(!existsSync(directory),'CAPTURE_EXISTS','capture directory must be new');mkdirSync(directory,{recursive:true})
 const captured_at=clock(now),documents=[],cache=new Map();let requests=0
 const read=async(url,init={})=>{
  const key=requestKey(url,init);if(cache.has(key))return Buffer.from(cache.get(key))
  if(requests>=maxRequests)stop(candidate,'SOURCE_BUDGET','request budget exhausted')
  const u=new URL(url);if(u.protocol!=='https:'||u.hostname!==candidate.host||u.username||u.password||u.hash)stop(candidate,'SOURCE_ORIGIN','unreviewed source origin')
  requests++;let response
  try{response=await request(url,{...init,redirect:'manual',credentials:'omit',headers:{'User-Agent':'SLFF fantasy (https://slff.eu)',...(init.headers??{})},signal:AbortSignal.timeout(30000)})}catch{stop(candidate,'SOURCE_TRANSPORT','source transport failed')}
  if(!(response instanceof Response)||response.status!==200||response.redirected)stop(candidate,'SOURCE_REFUSAL','source HTTP refusal/failure or redirect')
  let bytes;try{bytes=await bytesOf(response,candidate)}catch(error){if(error.sourceStop)throw error;stop(candidate,'SOURCE_TRANSPORT','source body failed')}
  const sha256=hash(bytes),file=sha256+'.bin';writeFileSync(join(directory,file),bytes,{mode:0o600})
  documents.push({url:String(url),status:200,content_type:response.headers.get('content-type'),method:String(init.method??'GET').toUpperCase(),body:String(init.body??''),file,sha256,bytes:bytes.length,captured_at:clock(now)});cache.set(key,bytes);return Buffer.from(bytes)
 }
 const manifest={version:1,candidate:clone(candidate),captured_at,documents,status:'RUNNING',requests:0}
 try{const seasons=await normalize(candidate,read),pack={version:1,candidate:clone(candidate),seasons,captured_at,original_bytes_sha256:hash(json(documents))};manifest.status='COMPLETE';manifest.pack_sha256=hash(json(pack));return pack}
 catch(error){manifest.status=error.dataHold?'HOLD':'STOPPED';manifest.reason_code=error.reason_code??'TECHNICAL_FAILURE';throw error}
 finally{manifest.requests=requests;manifest.completed_at=clock(now);writeFileSync(join(directory,'manifest.json'),json(manifest),{mode:0o600})}
}
export async function loadPolandPack(directory,{candidate,now,requireFresh=true}={}){
 scope(candidate);require(fileStat(directory).isDirectory()&&!fileStat(directory).isSymbolicLink(),'CAPTURE_FILES','regular capture directory required')
 const path=join(directory,'manifest.json');require(fileStat(path).isFile()&&!fileStat(path).isSymbolicLink(),'CAPTURE_FILES','regular manifest required')
 let m;try{m=JSON.parse(readFileSync(path,'utf8'))}catch(error){if(error instanceof SyntaxError)hold('CAPTURE_MANIFEST','invalid source manifest');throw error};require(m.version===1&&same(m.candidate,candidate)&&m.status==='COMPLETE'&&Array.isArray(m.documents)&&m.requests===m.documents.length,'CAPTURE_SCOPE','complete exact candidate manifest required')
 const started=Date.parse(m.captured_at),ended=Date.parse(m.completed_at),current=Date.parse(clock(now));require(Number.isFinite(started)&&started<=ended&&ended<=current&&(!requireFresh||current-started<=24*3600_000),'CAPTURE_STALE','capture stale, future or invalid')
 const docs=new Map(),used=new Set(),files=new Set(['manifest.json'])
 for(const d of m.documents){require(/^[a-f0-9]{64}\.bin$/.test(d.file)&&d.file===d.sha256+'.bin'&&['GET','POST'].includes(d.method)&&d.status===200&&typeof d.body==='string'&&Date.parse(d.captured_at)>=started&&Date.parse(d.captured_at)<=ended,'CAPTURE_FILES','invalid document receipt');const f=join(directory,d.file);require(fileStat(f).isFile()&&!fileStat(f).isSymbolicLink(),'CAPTURE_FILES','regular source bytes required');const bytes=readFileSync(f);require(bytes.length===d.bytes&&hash(bytes)===d.sha256,'CAPTURE_DIGEST','source bytes changed');const key=requestKey(d.url,{method:d.method,body:d.body});require(!docs.has(key),'CAPTURE_DUPLICATE','duplicate document receipt');docs.set(key,bytes);files.add(d.file)}
 require(same(readdirSync(directory).sort(),[...files].sort()),'CAPTURE_FILES','extra or missing source evidence file')
 const read=async(url,init={})=>{const key=requestKey(url,init);require(docs.has(key),'CAPTURE_MISSING','source document missing; offline replay cannot fetch');used.add(key);return Buffer.from(docs.get(key))}
 const seasons=await normalize(candidate,read);require(used.size===docs.size,'CAPTURE_UNUSED','unbound source evidence document')
 const pack={version:1,candidate:clone(candidate),seasons,captured_at:m.captured_at,original_bytes_sha256:hash(json(m.documents))};require(hash(json(pack))===m.pack_sha256,'CAPTURE_NORMALIZATION','normalized pack changed after source replay');return pack
}
