// Bounded public Dribl collection and closed original-byte replay. No database access.
import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync,appendFileSync,readFileSync,lstatSync,readdirSync,realpathSync,existsSync} from 'node:fs'
import {join,resolve,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseDriblCatalog,parseDriblSchedule,parseDriblReport} from './viri/dribl.mjs'
import {zaprtje} from './odtis-kode.mjs'
const API='https://mc-api.dribl.com/api/',TENANT='1RwNlWemjr',ROOT=fileURLToPath(new URL('../',import.meta.url))
const ID=/^[A-Za-z0-9]{1,80}$/,HASH=/^[a-f0-9]{64}$/,MAX_BYTES=2_000_000
const digest=x=>createHash('sha256').update(x).digest('hex'),json=x=>JSON.stringify(x)+'\n',clone=x=>structuredClone(x)
const proof=(ok,message)=>{if(!ok)throw Error('dribl capture: '+message)}
const wait=ms=>new Promise(r=>setTimeout(r,ms)),iso=t=>new Date(t).toISOString()
export class DriblCaptureStop extends Error{constructor(message){super('dribl capture: '+message);this.name='DriblCaptureStop';this.zavrnitev=true;this.exitCode=4}}
export const driblScopeCode=s=>['tenant','season','competition','league'].map(k=>s[k]).join(':')
export function parseDriblScopeCode(code){const p=typeof code==='string'?code.split(':'):[];proof(p.length===4&&p.every(x=>ID.test(x))&&p[0]===TENANT,'expected verified NSW tenant:season:competition:league');return Object.fromEntries(['tenant','season','competition','league'].map((k,i)=>[k,p[i]]))}
export const driblInventoryUrl=s=>API+`fixtures?season=${s.season}&competition=${s.competition}&league=${s.league}&date_range=all&tenant=${s.tenant}&timezone=Europe%2FLjubljana`
const catalogUrls=s=>({tenant:API+'tenants?mc_link=competitions.footballnsw.com.au&slug=competitions',seasons:API+`list/seasons?disable_paging=true&tenant=${s.tenant}`,competitions:API+`list/competitions?disable_paging=true&tenant=${s.tenant}&season=${s.season}`,leagues:API+`list/leagues?disable_paging=true&tenant=${s.tenant}&competition=${s.competition}&sort=%2Bname`})
function route(url,kind){
 proof(typeof url==='string'&&!/[\\\s]/.test(url),'invalid public URL');const u=new URL(url)
 proof(u.origin==='https://mc-api.dribl.com'&&!u.port&&!u.username&&!u.password&&!u.hash&&u.href===url,'public API host required')
 for(const k of new Set(u.searchParams.keys()))proof(u.searchParams.getAll(k).length===1,'duplicate query parameter')
 const expected={tenant:['mc_link','slug'],seasons:['disable_paging','tenant'],competitions:['disable_paging','tenant','season'],leagues:['disable_paging','tenant','competition','sort'],inventory:['tenant','season','competition','league','date_range','timezone','cursor'],report:['tenant'],roster:[]}[kind]
 proof(expected&&[...u.searchParams.keys()].every(k=>expected.includes(k)),'unobserved public query')
 if(kind==='tenant')proof(u.pathname==='/api/tenants'&&u.searchParams.get('mc_link')==='competitions.footballnsw.com.au'&&u.searchParams.get('slug')==='competitions','tenant discovery differs')
 else if(['seasons','competitions','leagues'].includes(kind)){
  proof(u.pathname==='/api/list/'+kind&&u.searchParams.get('tenant')===TENANT&&u.searchParams.get('disable_paging')==='true','catalog route differs')
  for(const k of kind==='competitions'?['season']:kind==='leagues'?['competition']:[])proof(ID.test(u.searchParams.get(k)??''),'catalog identity missing')
  if(kind==='leagues')proof(u.searchParams.get('sort')==='+name','catalog ordering differs')
 }else if(kind==='inventory'){
  proof(u.pathname==='/api/fixtures'&&u.searchParams.get('tenant')===TENANT&&['season','competition','league'].every(k=>ID.test(u.searchParams.get(k)??''))&&u.searchParams.get('date_range')==='all'&&u.searchParams.get('timezone')==='Europe/Ljubljana','full public inventory required')
  if(u.searchParams.has('cursor'))proof(/^[A-Za-z0-9_-]{1,2000}$/.test(u.searchParams.get('cursor')),'invalid cursor')
 }else if(kind==='report')proof(/^\/api\/matchcentre\/[A-Za-z0-9]{1,80}$/.test(u.pathname)&&u.searchParams.get('tenant')===TENANT,'report route differs')
 else proof(/^\/api\/matchcentre-match-members\/match\/[A-Za-z0-9]{1,80}\/team\/[A-Za-z0-9]{1,80}$/.test(u.pathname)&&!u.search,'roster route differs')
 return u
}
async function boundedBody(response){
 const declared=response.headers.get('content-length'),encoding=response.headers.get('content-encoding')??''
 proof(!encoding||encoding.split(',').every(x=>['identity','gzip','br','deflate'].includes(x.trim().toLowerCase())),'unsupported content encoding')
 if(declared!==null)proof(/^\d+$/.test(declared)&&Number(declared)<=MAX_BYTES,'declared byte bound exceeded')
 proof(response.body,'missing response body');const reader=response.body.getReader(),chunks=[];let length=0
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_BYTES){await reader.cancel();throw Error('byte bound exceeded')}chunks.push(value)}}finally{reader.releaseLock()}
 proof(length>0&&length<=MAX_BYTES,'empty or oversized response')
 if(declared!==null&&(!encoding||encoding==='identity'))proof(length===Number(declared),'content length differs')
 return Buffer.concat(chunks.map(x=>Buffer.from(x)))
}
export function createDriblCaptureClient({maxRequests,fetchFn=globalThis.fetch,now=Date.now,sleep=wait,onAttempt=()=>{},onDocument=()=>{}}={}){
 proof(Number.isInteger(maxRequests)&&maxRequests>=1&&maxRequests<=1000,'request budget must be 1..1000');proof([fetchFn,now,sleep,onAttempt,onDocument].every(x=>typeof x==='function'),'invalid client dependencies')
 const cache=new Map(),attempts=[];let queue=Promise.resolve(),last=null,stopped=null
 const read=async(url,kind)=>{
  if(stopped)throw new DriblCaptureStop('client already stopped: '+stopped)
  let response=null,attempt=null
  try{
   route(url,kind)
   if(cache.has(url)){const r=cache.get(url);return {...r,bytes:Buffer.from(r.bytes)}}
   proof(attempts.length<maxRequests,'total request budget exhausted')
   if(last!==null){const delay=3000-(now()-last);if(delay>0)await sleep(delay);proof(now()-last>=3000,'minimum serialized source gap not respected')}
   last=now();attempt={number:attempts.length+1,url,kind,startedAt:iso(last),status:'pending',httpStatus:null,error:null};attempts.push(attempt)
   // Persist intent before fetch. Callback failure prevents the source request.
   await onAttempt({...attempt})
   response=await fetchFn(url,{method:'GET',headers:{'User-Agent':'SLFF fantasy (https://slff.eu)','Accept':'application/json'},credentials:'omit',redirect:'manual',signal:AbortSignal.timeout(20_000)})
   proof(response instanceof Response,'fetch must return a Web Response');attempt.httpStatus=response.status
   proof(response.status===200,'HTTP '+response.status+' stops collection');proof(!response.redirected&&(!response.url||response.url===url),'redirected response refused')
   const contentType=response.headers.get('content-type');proof(/^application\/json(?:\s*;|$)/i.test(contentType??''),'unexpected MIME / possible login or challenge')
   const bytes=await boundedBody(response),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes)
   proof(!/"(?:message|error|detail)"\s*:\s*"[^"]*(?:captcha|login required|unauthenticated|authentication required|access denied|challenge required)/i.test(text),'source login or challenge detected')
   proof(!/<title>\s*(?:Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|"(?:login_required|authentication_required)"\s*:\s*true|"message"\s*:\s*"(?:Unauthenticated|Login required|Authentication required)/i.test(text),'source login or challenge detected')
   JSON.parse(text)
   const document={url,kind,status:200,contentType,sha256:digest(bytes),byteLength:bytes.length,capturedAt:attempt.startedAt,bytes}
   await onDocument({...document,bytes:Buffer.from(bytes)});cache.set(url,{...document,bytes:Buffer.from(bytes)});attempt.status='success'
   return {...document,bytes:Buffer.from(bytes)}
  }catch(e){try{if(response?.body&&!response.body.locked)await response.body.cancel()}catch{};stopped=e.message;if(attempt){attempt.status='failed';attempt.error=e.message}throw new DriblCaptureStop(e.message)}
 }
 return {read(url,kind){const p=queue.then(()=>read(url,kind));queue=p.catch(()=>{});return p},snapshot(){return {requests:attempts.length,attempts:clone(attempts),stopped:stopped!==null,stopReason:stopped}}}
}
export function validateDriblCaptureOptions(o){
 proof(o&&Object.keys(o).every(k=>['scopes','maxRequests','reportLimit','maxPages','asOfDate'].includes(k)),'unobserved capture option')
 proof(Array.isArray(o.scopes)&&o.scopes.length>=1&&o.scopes.length<=5,'explicit scope count must be 1..5')
 const scopes=o.scopes.map(s=>{proof(s&&Object.keys(s).length===4&&['tenant','season','competition','league'].every(k=>Object.hasOwn(s,k)),'exact scope keys required');return parseDriblScopeCode(driblScopeCode(s))})
 proof(new Set(scopes.map(driblScopeCode)).size===scopes.length,'duplicate league scopes')
 proof(Number.isInteger(o.maxRequests)&&o.maxRequests>=1&&o.maxRequests<=1000,'total request budget must be 1..1000')
 proof(o.reportLimit===null||Number.isInteger(o.reportLimit)&&o.reportLimit>=1&&o.reportLimit<=3,'report limit must be null(all) or 1..3')
 const maxPages=o.maxPages??100;proof(Number.isInteger(maxPages)&&maxPages>=1&&maxPages<=100,'page budget must be 1..100')
 proof(typeof o.asOfDate==='string'&&/^20\d\d-\d\d-\d\d$/.test(o.asOfDate)&&new Date(o.asOfDate+'T00:00:00Z').toISOString().slice(0,10)===o.asOfDate,'pinned capture date required')
 return {scopes,maxRequests:o.maxRequests,reportLimit:o.reportLimit,maxPages,asOfDate:o.asOfDate}
}
function phasePolicy(fixtures,issues){
 const regular=new Set(),finals=new Set()
 for(const f of fixtures){let m=typeof f.round==='string'?f.round.match(/^R([1-9]\d{0,2})$/):null;if(m){f.phase='regular';f.sourceRound=+m[1];regular.add(+m[1]);continue}m=typeof f.round==='string'?f.round.match(/^F([1-9]\d{0,1})#([1-9]\d{0,2})$/):null;if(m){f.phase='finals';f.sourceRound=+m[1];f.sourceFixtureNumber=+m[2];finals.add(+m[1]);continue}issues.push({code:'ROUND_PHASE_UNKNOWN',matchId:f.matchId})}
 const contiguous=s=>s.size>0&&Math.max(...s)===s.size,regularMax=regular.size?Math.max(...regular):0,finalsMax=finals.size?Math.max(...finals):0
 if(!contiguous(regular)||finals.size&&!contiguous(finals))issues.push({code:'ROUND_PHASE_GAP'})
 for(const f of fixtures)f.fantasyRound=f.phase==='regular'?f.sourceRound:f.phase==='finals'&&regularMax?regularMax+f.sourceRound:null
 return {regularMax,finalsMax,derivedFinals:finals.size>0}
}
const parsed=d=>JSON.parse(Buffer.from(d.bytes))
export async function collectDriblScopes({options,client}){
 const o=validateDriblCaptureOptions(options),result={version:1,provider:'dribl-public',asOfDate:o.asOfDate,activationEligible:false,leagues:[]}
 for(const scope of o.scopes){
  const league={code:driblScopeCode(scope),scope,catalog:{},inventory:{pageUrls:[],fixtures:[],complete:false,fullInventoryEvidence:false,roundPolicy:null},reports:[],issues:[],coverage:{sampled:o.reportLimit!==null,playedFixtures:0,attemptedReports:0,completeReports:0,unscoredFixtures:{past:0,current:0,future:0}},fullImportEligible:false,verdict:'HOLD'};result.leagues.push(league)
  const urls=catalogUrls(scope),tenant=parsed(await client.read(urls.tenant,'tenant'))?.data
  if(tenant?.id!==TENANT||tenant.type!=='tenants'||tenant.attributes?.mc_link!=='competitions.footballnsw.com.au'||tenant.attributes?.tenantable_name!=='Football New South Wales'){league.issues.push({code:'TENANT_NOT_VERIFIED'});continue}
  league.catalog.tenant={id:tenant.id,name:tenant.attributes.tenantable_name}
  let bad=false
  for(const kind of ['seasons','competitions','leagues']){const d=await client.read(urls[kind],kind),p=parseDriblCatalog(d.bytes,{kind,url:d.url,scope});league.catalog[kind]=p.rows;if(p.verdict!=='PASS'){league.issues.push(...p.issues.map(i=>({...i,stage:kind})));bad=true;break}}
  if(bad)continue
  const season=league.catalog.seasons.find(x=>x.id===scope.season),competition=league.catalog.competitions.find(x=>x.id===scope.competition),division=league.catalog.leagues.find(x=>x.id===scope.league)
  if(!season||!Number.isInteger(season.year)||season.name!==String(season.year)||!competition||!division||division.competitionName!==competition.name||division.seasonName!==season.name){league.issues.push({code:'CATALOG_SCOPE_NOT_FOUND'});continue}
  league.catalog.selected={season,competition,league:division}
  let url=driblInventoryUrl(scope);const cursors=new Set(),ids=new Set(),recordIds=new Set()
  for(let page=0;page<o.maxPages;page++){
   const d=await client.read(url,'inventory'),p=parseDriblSchedule(d.bytes,{url:d.url,scope}),raw=parsed(d)
   league.inventory.pageUrls.push(url)
   if(!p.fullInventoryEvidence||p.issues.some(i=>i.code!=='SCHEDULE_INCOMPLETE')){league.issues.push(...p.issues,{code:'INVENTORY_NOT_FULL_MODE'});break}
   league.inventory.fullInventoryEvidence=true
   for(const [i,f]of p.rows.entries()){
    const a=raw.data[i].attributes
    if(ids.has(f.matchId)||recordIds.has(f.resultId)||a.competition_name!==competition.name||a.league_name!==division.name){league.issues.push({code:'INVENTORY_IDENTITY_OR_SCOPE',matchId:f.matchId});bad=true;break}
    ids.add(f.matchId);recordIds.add(f.resultId)
    const score=Number.isInteger(f.score.home)&&f.score.home>=0&&Number.isInteger(f.score.away)&&f.score.away>=0?f.score:null
    if((score!==null)!==(f.status==='complete')||score===null&&(f.score.home!==null||f.score.away!==null))league.issues.push({code:'FIXTURE_SCORE_STATUS',matchId:f.matchId})
    if(a.bye_flag!==false&&a.bye_flag!==0||a.forfeit_team_hash_id!==null||['home_score_extra','away_score_extra','home_score_penalty','away_score_penalty'].some(k=>a[k]!==null))league.issues.push({code:'FIXTURE_UNSUPPORTED',matchId:f.matchId})
    const fixture={...f,score,audit:Object.fromEntries(['round','full_round','round_label','round_abbreviation','fixture_reference','leg_number','status','bye_flag','is_unstructured','league_result_access','forfeit_team_hash_id','competition_name','league_name','date'].map(k=>[k,a[k]??null]))}
    league.inventory.fixtures.push(fixture)
    if(score===null){const day=f.dateUtc.slice(0,10),when=day<o.asOfDate?'past':day===o.asOfDate?'current':'future';league.coverage.unscoredFixtures[when]++;if(when==='past')league.issues.push({code:'PAST_UNSCORED_FIXTURE',matchId:f.matchId})}
   }
   if(bad)break
   if(p.nextCursor===null){league.inventory.complete=true;break}
   if(cursors.has(p.nextCursor)){league.issues.push({code:'CURSOR_LOOP'});break}
   cursors.add(p.nextCursor);url=p.nextUrl
   if(page===o.maxPages-1)league.issues.push({code:'PAGINATION_LIMIT'})
  }
  if(!league.inventory.fixtures.length)league.issues.push({code:'EMPTY_INVENTORY'})
  league.inventory.roundPolicy=phasePolicy(league.inventory.fixtures,league.issues)
  if(!league.inventory.complete)league.issues.push({code:'INVENTORY_INCOMPLETE'})
  const played=league.inventory.fixtures.filter(f=>f.score!==null);league.coverage.playedFixtures=played.length
  if(league.issues.length){if(o.reportLimit!==null)league.issues.push({code:'SAMPLE_ONLY'});continue}
  const wanted=o.reportLimit===null?played:played.slice(0,o.reportLimit)
  for(const f of wanted){
   league.coverage.attemptedReports++
   const match=await client.read(API+`matchcentre/${f.matchId}?tenant=${scope.tenant}`,'report'),a=parsed(match)?.data?.attributes
   if(!a||!ID.test(a.home_team_hash_id??'')||!ID.test(a.away_team_hash_id??'')){league.issues.push({code:'REPORT_HEADER_MISSING',matchId:f.matchId});break}
   const home=await client.read(API+`matchcentre-match-members/match/${f.matchId}/team/${a.home_team_hash_id}`,'roster'),away=await client.read(API+`matchcentre-match-members/match/${f.matchId}/team/${a.away_team_hash_id}`,'roster')
   const report=parseDriblReport({match,home,away},{scope}),h=report.header
   const bound=h&&h.matchId===f.matchId&&h.dateUtc===f.dateUtc&&['home','away'].every(s=>h[s].teamId===f[s].teamId&&h[s].name===f[s].name&&h.score[s]===f.score[s])&&h.displayRound===(f.phase==='finals'?'F':'R')+f.sourceRound&&h.round===f.sourceRound&&h.matchType===(f.phase==='finals'?'finals':'roundrobin')
   if(!bound)league.issues.push({code:'REPORT_FIXTURE_MISMATCH',matchId:f.matchId})
   if(report.reportStatistikaPripravljena&&bound)league.coverage.completeReports++;else league.issues.push({code:'REPORT_HELD',matchId:f.matchId,reasons:report.issues})
   league.reports.push({matchId:f.matchId,result:report})
   if(!report.reportStatistikaPripravljena||!bound)break
  }
  if(o.reportLimit!==null)league.issues.push({code:'SAMPLE_ONLY'})
  if(!played.length)league.issues.push({code:'NO_PLAYED_REPORTS'})
  league.fullImportEligible=league.issues.length===0&&league.inventory.complete&&league.inventory.fullInventoryEvidence&&o.reportLimit===null&&league.coverage.completeReports===played.length
  league.verdict=league.fullImportEligible?'PASS':'HOLD'
 }
 return result
}
export function driblCaptureCodeSha256(){
 const roots=['scripts/dribl-capture.mjs','scripts/dribl-import.mjs','scripts/viri/dribl-public.mjs','scripts/zajemi-dribl.mjs']
 for(const p of roots)proof(existsSync(join(ROOT,p)),'required code closure module missing: '+p)
 const files=[...new Set(roots.flatMap(p=>zaprtje(p,p=>readFileSync(join(ROOT,p),'utf8'),p=>existsSync(join(ROOT,p)))))].sort()
 return digest(files.map(p=>p+'\0'+digest(readFileSync(join(ROOT,p)))).join('\n'))
}
export async function captureDriblDirectory({directory,options,fetchFn=globalThis.fetch,now=Date.now,sleep=wait}){
 const createdAt=iso(now()),o=validateDriblCaptureOptions({...options,asOfDate:options?.asOfDate??createdAt.slice(0,10)})
 proof(o.asOfDate===createdAt.slice(0,10),'capture day must equal creation day');const codeSha256=driblCaptureCodeSha256(),documents=[]
 mkdirSync(directory);mkdirSync(join(directory,'documents'));writeFileSync(join(directory,'attempts.jsonl'),'')
 const client=createDriblCaptureClient({maxRequests:o.maxRequests,fetchFn,now,sleep,onAttempt:a=>appendFileSync(join(directory,'attempts.jsonl'),json(a),{flush:true}),onDocument:d=>{const file=`documents/${d.sha256}.json`;writeFileSync(join(directory,file),d.bytes);const {bytes,...metadata}=d;documents.push({...metadata,file})}})
 let result=null,error=null
 try{result=await collectDriblScopes({options:o,client})}catch(e){error=e}
 const raw=result===null?null:json(result);if(raw!==null)writeFileSync(join(directory,'result.json'),raw)
 const manifest={version:1,provider:'dribl-public',createdAt,completedAt:iso(now()),options:o,codeSha256,success:error===null,error:error?.message??null,snapshot:client.snapshot(),documents,resultSha256:raw===null?null:digest(raw),activationEligible:false}
 writeFileSync(join(directory,'manifest.json'),json(manifest));if(error)throw error;return manifest
}
function regular(directory,path){
 const base=realpathSync(directory),full=resolve(base,path),rel=relative(base,full)
 proof(rel&&!rel.startsWith('..')&&!path.startsWith('/'),'unsafe artifact path');const stat=lstatSync(full);proof(stat.isFile()&&!stat.isSymbolicLink(),'regular artifact file required');proof(stat.size<=20_000_000,'artifact size bound exceeded');return readFileSync(full)
}
/** Pure closed-map replay shared by verification and native normalization. Never falls back to fetch. */
export async function replayDriblDocuments({options,documents}){
 const o=validateDriblCaptureOptions(options);proof(Array.isArray(documents)&&documents.length>0&&documents.length<=o.maxRequests,'missing bounded original receipts')
 const map=new Map()
 for(const d of documents){route(d.url,d.kind);proof(d.bytes instanceof Uint8Array&&d.bytes.length>0&&d.bytes.length<=MAX_BYTES&&d.byteLength===d.bytes.length&&digest(d.bytes)===d.sha256&&HASH.test(d.sha256)&&d.status===200&&/^application\/json(?:\s*;|$)/i.test(d.contentType??'')&&!map.has(d.url),'original document identity/bytes/hash differs');map.set(d.url,d)}
 let clock=0;const used=new Set(),client=createDriblCaptureClient({maxRequests:o.maxRequests,now:()=>clock,sleep:async ms=>{clock+=ms},fetchFn:async url=>{const d=map.get(url);proof(d,'missing closed-map source document');used.add(url);return new Response(d.bytes,{status:d.status,headers:{'content-type':d.contentType}})}})
 const result=await collectDriblScopes({options:o,client});proof(used.size===map.size,'unused captured documents rejected');return result
}
export async function verifyDriblDirectory(directory){
 proof(lstatSync(directory).isDirectory()&&!lstatSync(directory).isSymbolicLink(),'regular capture directory required')
 const m=JSON.parse(regular(directory,'manifest.json'));proof(m.version===1&&m.provider==='dribl-public'&&m.success===true&&m.error===null&&m.activationEligible===false,'failed or unsupported capture')
 proof(m.codeSha256===driblCaptureCodeSha256(),'code closure fingerprint differs');const o=validateDriblCaptureOptions(m.options)
 proof(json(o)===json(m.options),'capture options differ');const start=Date.parse(m.createdAt),end=Date.parse(m.completedAt)
 proof(Number.isFinite(start)&&Number.isFinite(end)&&start<=end&&m.createdAt.slice(0,10)===o.asOfDate,'capture timestamps differ')
 const s=m.snapshot;proof(s&&s.stopped===false&&s.stopReason===null&&Number.isInteger(s.requests)&&s.requests>=1&&s.requests<=o.maxRequests&&s.attempts?.length===s.requests&&m.documents?.length===s.requests,'source accounting differs')
 proof(lstatSync(join(directory,'documents')).isDirectory()&&!lstatSync(join(directory,'documents')).isSymbolicLink(),'regular documents directory required')
 const journal=regular(directory,'attempts.jsonl').toString().trim().split('\n').map(x=>JSON.parse(x));proof(journal.length===s.requests,'pending journal differs')
 const documents=[],urls=new Set(),files=new Set();let last=null
 for(const [i,d]of m.documents.entries()){
  const a=s.attempts[i],pending=journal[i],time=Date.parse(d.capturedAt)
  proof(a?.number===i+1&&a.status==='success'&&a.httpStatus===200&&a.error===null&&a.url===d.url&&a.kind===d.kind&&a.startedAt===d.capturedAt&&pending?.number===a.number&&pending.status==='pending'&&pending.url===a.url&&pending.kind===a.kind&&pending.startedAt===a.startedAt,'request journal/document binding differs')
  proof(Number.isFinite(time)&&time>=start&&time<=end&&(last===null||time-last>=3000),'source request timing differs');last=time
  proof(HASH.test(d.sha256??'')&&d.file===`documents/${d.sha256}.json`&&!urls.has(d.url),'document path/identity differs')
  const bytes=regular(directory,d.file);proof(bytes.length===d.byteLength&&digest(bytes)===d.sha256,'document bytes/hash differs');documents.push({...d,bytes});urls.add(d.url);files.add(d.file.slice(10))
 }
 proof(readdirSync(join(directory,'documents')).every(f=>files.has(f))&&readdirSync(join(directory,'documents')).length===files.size,'unlisted document files rejected')
 const raw=regular(directory,'result.json');proof(HASH.test(m.resultSha256??'')&&digest(raw)===m.resultSha256,'parsed result digest differs')
 const result=await replayDriblDocuments({options:o,documents});proof(json(result)===raw.toString(),'parsed result differs from closed original-byte replay')
 return {verified:true,options:o,documents,result,manifest:m,resultSha256:m.resultSha256,codeSha256:m.codeSha256,requests:s.requests,activationEligible:false}
}
