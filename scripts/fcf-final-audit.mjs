// Pure fixed inventory compiler + explicit bounded collector. No source call on import.
import {createHash}from'node:crypto'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256}from'./lib/historical-statistics-policy.mjs'
import fcf,{razberiKodo,najvecStarost,jeIzziv,fcfFetch}from'./viri/fcf.mjs'
const scopes=Object.freeze({
 'es-ct-segona-g1':{code:'4109388-4109627',maximum:19},
 'es-ct-tercera-g2':{code:'4116188-4116427',maximum:20},
 'es-ct-tercera-g9':{code:'4118349-4118588',maximum:22},
})
export const fcfFinalAuditScope=slug=>scopes[slug]?{...scopes[slug]}:null
const SHA=/^[a-f0-9]{64}$/,ID=/^[1-9]\d{0,19}$/
const fail=message=>{throw Error(`FCF_AUDIT: ${message}`)}
function assertAuditPlan(plan){
 const{planSha256,...body}=plan??{}
 if(!SHA.test(planSha256??'')||historicalStatisticsPolicySha256(body)!==planSha256||plan.schemaVersion!==1||plan.kind!=='fcf-final-current-audit'||plan.stopOnRefusal!==true||!/^[a-f0-9]{40}$/.test(plan.sourceCommit??'')||!Number.isFinite(Date.parse(plan.createdUTC))||!Number.isInteger(plan.maximumSourceGETs)||plan.maximumSourceGETs<24||plan.maximumSourceGETs>61||!Array.isArray(plan.groups)||plan.groups.length!==3||new Set(plan.groups.map(g=>g.competitionSlug)).size!==3)fail('approved immutable inventory required')
 const selected=[]
 for(const g of plan.groups){
  const scope=scopes[g.competitionSlug],policy=getHistoricalStatisticsPolicy(g.competitionSlug)
  if(!scope||!policy||g.sourceCode!==scope.code||g.policyId!==policy.id||g.policySha256!==historicalStatisticsPolicySha256(policy)||!Array.isArray(g.fetchIds)||!Array.isArray(g.fetch)||g.fetch.length!==g.fetchIds.length||!Array.isArray(g.reuseIds)||g.fetchIds.length>scope.maximum)fail('unreviewed collector group/policy')
  const{od:start,do:end}=razberiKodo(scope.code),all=[...g.fetchIds,...g.reuseIds]
  if(all.length!==240||new Set(all).size!==240||all.some(id=>typeof id!=='string'||!ID.test(id)||Number(id)<start||Number(id)>end)||g.fetchIds.some(id=>policy.entries.some(e=>e.sourceMatchId===id)))fail('foreign/duplicate/missing collector source identity')
  if(g.fetch.some((f,i)=>f.id!==g.fetchIds[i]||!Number.isInteger(f.sourceRound)||f.sourceRound<1||f.sourceRound>6||!SHA.test(f.rawSha256??'')||!Number.isFinite(Date.parse(f.cacheMtimeUTC))||f.lineage?.verified!==true)||g.fetch.filter(f=>f.sourceRound===6).length!==8)fail('selected cache round/hash/lineage differs')
  selected.push(...g.fetch.map(f=>({id:f.id,competitionSlug:g.competitionSlug,expectedSourceRound:f.sourceRound})))
 }
 if(selected.length!==plan.maximumSourceGETs||new Set(selected.map(x=>x.id)).size!==selected.length)fail('changed collector source budget')
 return selected
}
export function buildFcfFinalAuditPlan({groups,sourceCommit,now=Date.now()}){
 if(!/^[a-f0-9]{40}$/.test(sourceCommit??'')||!Array.isArray(groups)||groups.length!==3||new Set(groups.map(g=>g.competition?.slug)).size!==3)fail('exact main and three-group inventory required')
 const planned=[]
 for(const {competition:c,verifiedSourceIds,cache}of groups){
  const scope=scopes[c?.slug],policy=getHistoricalStatisticsPolicy(c?.slug)
  if(!scope||!policy||c.source!=='fcf'||c.active!==false||c.sezona_koledarska!==false||c.source_league_code!==scope.code)fail('unreviewed source block/competition')
  if(!Array.isArray(verifiedSourceIds)||new Set(verifiedSourceIds).size!==verifiedSourceIds.length||!Array.isArray(cache))fail('duplicate/missing verified source inventory')
  const {od:start,do:end}=razberiKodo(scope.code),verified=new Set(verifiedSourceIds),entries=new Map(cache.map(e=>[e.id,e])),exceptions=new Map(policy.entries.map(e=>[e.sourceMatchId,e]))
  if(entries.size!==cache.length||[...verified,...entries.keys()].some(id=>typeof id!=='string'||!ID.test(id)||Number(id)<start||Number(id)>end))fail('foreign/duplicate source cache identity')
  const fetchIds=[],fetch=[],reuseIds=[],reuse=[],roundCounts=new Map()
  for(let numeric=start;numeric<=end;numeric++){
   const id=String(numeric),exception=exceptions.get(id)
   if(exception){roundCounts.set(exception.sourceRound,(roundCounts.get(exception.sourceRound)??0)+1);reuseIds.push(id);reuse.push({id,kind:'reviewed-historical-policy',rawSha256:exception.rawSha256,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy)});continue}
   const entry=entries.get(id),g=entry?.header,l=entry?.lineage,stamp=Date.parse(entry?.cacheMtimeUTC),round=g?.krog
   if(!entry||!SHA.test(entry.rawSha256??'')||!g||!Number.isInteger(round)||round<1||round>30||g.sezona!=='2026/27'||g.tekmovanje!==(c.slug.includes('segona')?'SEGONA CATALANA':'TERCERA CATALANA')||g.skupina!==`GRUP ${c.slug.split('-g')[1]}`)fail(`missing/foreign retained header ${id}`)
   if(!l||l.verified!==true||l.repository!=='Lovro-splichal-orhanizagi/mnzgorenjska'||!ID.test(l.artifactId??'')||!ID.test(l.runId??'')||!/^sha256:[a-f0-9]{64}$/.test(l.artifactDigest??'')||!/^[a-f0-9]{40}$/.test(l.commit??''))fail(`unauthenticated cache lineage ${id}`)
   roundCounts.set(round,(roundCounts.get(round)??0)+1)
   if(!Number.isFinite(stamp)||stamp>now)fail(`invalid original source timestamp ${id}`)
   if(verified.has(id)&&round>5)fail(`verified current report outside reviewed played rounds ${id}`)
   if(round===6&&g.izid)fail(`R6 already published result ${id}; future launch gate must be re-reviewed`)
   if(round===6||round<=5&&!verified.has(id)){fetchIds.push(id);fetch.push({id,sourceRound:round,rawSha256:entry.rawSha256,cacheMtimeUTC:entry.cacheMtimeUTC,lineage:l});continue}
   if(now-stamp>najvecStarost(g,now,false))fail(`stale retained source cache ${id}; no budget expansion`)
   if(verified.has(id)&&!g.izid)fail(`known complete report has no retained published result ${id}`)
   reuseIds.push(id);reuse.push({id,kind:'retained-cache',rawSha256:entry.rawSha256,cacheMtimeUTC:entry.cacheMtimeUTC,lineage:l})
  }
  if(roundCounts.size!==30||[...roundCounts.values()].some(n=>n!==8))fail('validated calendar must contain exactly eight fixtures in every round')
  if(fetchIds.length>scope.maximum)fail('rederived inventory exceeds approved per-group source budget')
  planned.push({competitionSlug:c.slug,sourceCode:scope.code,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),fetchIds,fetch,reuseIds,reuse})
 }
 planned.sort((a,b)=>a.competitionSlug.localeCompare(b.competitionSlug))
 const maximumSourceGETs=planned.reduce((n,g)=>n+g.fetchIds.length,0)
 if(maximumSourceGETs>61)fail('approved source budget exceeded')
 const plan={schemaVersion:1,kind:'fcf-final-current-audit',sourceCommit,createdUTC:new Date(now).toISOString(),maximumSourceGETs,stopOnRefusal:true,groups:planned}
 return {...plan,planSha256:historicalStatisticsPolicySha256(plan)}
}
export async function collectFcfFinalAudit({plan,request,parse,pause=ms=>new Promise(r=>setTimeout(r,ms)),clock=Date.now,onCapture}){
 const ids=assertAuditPlan(plan),planSha256=plan.planSha256
 if(typeof request!=='function'||typeof parse!=='function'||typeof onCapture!=='function')fail('explicit transport/parser/raw retention callback required')
 const captures=[];let actualSourceGETs=0
 for(const {id,competitionSlug,expectedSourceRound}of ids){
  if(actualSourceGETs)await pause(fcf.premorMs)
  const url=`https://www.fcf.cat/ca/competicio/acta/${id}`,startedUTC=new Date(clock()).toISOString()
  actualSourceGETs++
  const response=await request(url)
  if(response.status!==200||response.redirected)fail(`source refused HTTP${response.status}; stop without fallback`)
  const bytes=Buffer.from(await response.arrayBuffer())
  if(!bytes.length||bytes.length>2*1024*1024)fail('empty/oversized source document; stop without fallback')
  const html=bytes.toString('utf8')
  if(!Buffer.from(html).equals(bytes)||jeIzziv(html))fail('source challenged/invalid encoding; stop without fallback')
  const receipt={id,competitionSlug,expectedSourceRound,sourceUrl:url,startedUTC,capturedUTC:new Date(clock()).toISOString(),bytes:bytes.length,rawSha256:createHash('sha256').update(bytes).digest('hex')}
  await onCapture(receipt,bytes)
  const canonical=await parse({id,competitionSlug,expectedSourceRound,html,receipt})
  captures.push({...receipt,canonical})
 }
 return {schemaVersion:1,planSha256,sourceCommit:plan.sourceCommit,actualSourceGETs,captures}
}
/** Reuse FCF's refusal-aware HTTP transport, but count/deny its possible empty-body retry before a second real GET. */
export async function withBoundedFcfTransport(plan,operation,{network=globalThis.fetch}={}){
 const allowed=new Set(assertAuditPlan(plan).map(({id})=>`https://www.fcf.cat/ca/competicio/acta/${id}`)),seen=new Set(),previous=globalThis.fetch
 globalThis.fetch=async(input,options={})=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url
  if(!allowed.has(url)||(options.method??input.method??'GET')!=='GET'||seen.has(url)||seen.size>=plan.maximumSourceGETs)fail('unplanned/repeated request; source budget cannot expand')
  seen.add(url)
  // Native fetch must not follow an unbudgeted redirect before this boundary can see it.
  const response=await network(input,{...options,redirect:'manual'})
  if(response.status!==200||response.redirected||response.url&&response.url!==url){
   try{await response.body?.cancel()}catch{}
   fail(`source refused/redirected HTTP${response.status}; stop without fallback`)
  }
  const reader=response.body?.getReader(),chunks=[];let length=0
  if(!reader)fail('empty source body; stop without fallback')
  for(;;){
   const{done,value}=await reader.read();if(done)break
   length+=value.byteLength
   if(length>2*1024*1024){try{await reader.cancel()}catch{};fail('oversized source body; stop without fallback')}
   chunks.push(Buffer.from(value))
  }
  const bytes=Buffer.concat(chunks,length),html=bytes.toString('utf8')
  if(!length||html.charCodeAt(0)===0xfeff||!Buffer.from(html).equals(bytes)||jeIzziv(html))fail('empty/challenged/BOM/invalid UTF8 source body; stop without fallback')
  // FCF's normal text transport now receives only byte-preserving valid UTF8.
  return new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers})
 }
 try{return await operation(url=>fcfFetch(url,{headers:fcf.glave}))}finally{globalThis.fetch=previous}
}
