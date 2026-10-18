// Pure closed current-season packet. No source/DB transport or mutation on import.
import {createHash} from 'node:crypto'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
import {classifyFcfHistoricalStatistics} from './fcf-historical-policy.mjs'
import {parseFcfCurrentAuditDocument} from './fcf-current-source-proof.mjs'
import {fcfFinalAuditScope} from './fcf-final-audit.mjs'
import {validateFcfSingleReportSource,drevoRsc,elementi,jeElement,besedilo,najvecStarost} from './viri/fcf.mjs'
export const FCF_HISTORICAL_GROUPS=Object.freeze(['es-ct-segona-g1','es-ct-tercera-g2','es-ct-tercera-g9'])
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-fcf-zgodovina.yml'
const SHA=/^[a-f0-9]{64}$/,COMMIT=/^[a-f0-9]{40}$/,ID=/^[1-9]\d{0,19}$/
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const fail=message=>{throw Error(`FCF_RELEASE: ${message}`)}
const original=Object.freeze({
 '4109388':['2026-10-18T12:31:53.340Z','2026-10-18T12:31:53.882Z'],
 '4116215':['2026-10-18T12:31:49.885Z','2026-10-18T12:31:50.338Z'],
 '4118352':['2026-10-18T12:32:03.718Z','2026-10-18T12:32:04.175Z'],
 '4118358':['2026-10-18T12:32:07.176Z','2026-10-18T12:32:07.646Z'],
})
const competitionIds=Object.freeze({'es-ct-segona-g1':783,'es-ct-tercera-g2':790,'es-ct-tercera-g9':797})
function sourceClubs(html){
 const top=[...elementi(drevoRsc(html))].find(e=>e.props?.title==='Acta del partit')
 const row=top&&[...elementi(top)].find(e=>e.tip==='div'&&e.otroci.filter(jeElement).length===3&&/-/.test(besedilo(e.otroci.filter(jeElement)[1])))
 if(!row)fail('official native club header missing')
 const sides=row.otroci.filter(jeElement)
 return[sides[0],sides[2]].map(side=>{
  const links=[...new Set([...elementi(side)].map(e=>e.props?.href).filter(href=>/^\/ca\/clubs\/[1-9]\d*\/categories\/[1-9]\d*$/.test(href??'')))]
  if(links.length!==1)fail('ambiguous native club/category header')
  const parts=links[0].split('/'),name=besedilo(side).trim()
  if(!name)fail('official club name missing')
  return{sourceClubId:parts[3],sourceCategoryId:parts[5],name}
 })
}
function provenance(document,competition,header,now,isMarker){
 const{id,html,receipt:r,lineage:l}=document,url=`https://www.fcf.cat/ca/competicio/acta/${id}`
 if(typeof html!=='string'||html.charCodeAt(0)===0xfeff||!Buffer.byteLength(html)||Buffer.byteLength(html)>2*1024*1024||!r||r.id!==id||r.competitionSlug!==competition.slug||r.sourceUrl!==url||r.bytes!==Buffer.byteLength(html)||!SHA.test(r.rawSha256??'')||sha(html)!==r.rawSha256)fail('actual raw bytes/receipt binding differs')
 if(isMarker){
  if(l?.kind!=='reviewed-original'||l.sourceCommit!=='f7efba26c31f76372b5aab1e976061631fbaebda'||r.startedUTC!==original[id]?.[0]||r.capturedUTC!==original[id]?.[1]||r.cacheMtimeUTC!==null)fail('original reviewed marker receipt changed')
 }else{
  if(l?.kind!=='actions-artifact'||l.verified!==true||l.repository!==repository||l.workflow!==workflow||!ID.test(l.runId??'')||!ID.test(l.artifactId??'')||!/^sha256:[a-f0-9]{64}$/.test(l.artifactDigest??'')||!COMMIT.test(l.commit??''))fail('authenticated Actions artifact lineage required')
  const captured=Date.parse(r.capturedUTC),cached=Date.parse(r.cacheMtimeUTC),started=Date.parse(r.startedUTC)
  let stamp
  if(r.capturedUTC!==null){
   if(r.cacheMtimeUTC!==null||!Number.isFinite(captured)||!Number.isFinite(started)||started>captured)fail('original source capture timestamp differs')
   stamp=captured
  }else{
   if(r.startedUTC!==null||!Number.isFinite(cached))fail('original cache timestamp required without invented source capture')
   stamp=cached
  }
  if(stamp>now||now-stamp>najvecStarost(header,now,false))fail('stale/future original source evidence')
  if(header.krog<=6&&!header.izid&&(r.capturedUTC===null||now-stamp>24*3600000))fail('pending prelaunch/R6 fixture requires fresh actual source capture')
 }
 return{...r,lineage:JSON.parse(JSON.stringify(l))}
}
export function validateFcfCurrentReleaseCalendar(fixtures){
 if(!Array.isArray(fixtures))fail('closed canonical calendar required')
 const clubs=new Map(),pairs=new Set(),keepers=new Set()
 for(const f of fixtures){
  const keys=f.clubs.map(c=>`${c.sourceClubId}/${c.sourceCategoryId}`)
  if(keys[0]===keys[1]||pairs.has(keys.join('|')))fail('duplicate/self native calendar pairing')
  pairs.add(keys.join('|'))
  f.clubs.forEach((c,i)=>{
   const previous=clubs.get(keys[i])
   if(previous&&previous.name!==c.name)fail('official native club name changes inside calendar')
   clubs.set(keys[i],c)
  })
  if(f.statisticsStatus==='available')for(const side of[0,1])if(f.appearances.some(a=>a.ekipaIdx===side&&a.zacetnik&&a.vratar))keepers.add(keys[side])
 }
 if(clubs.size!==16||pairs.size!==240||[...clubs.keys()].some(c=>!keepers.has(c)))fail('sixteen-club full calendar and explicit verified keeper coverage required')
 for(let round=1;round<=30;round++){
  const rows=fixtures.filter(f=>f.round===round),participation=rows.flatMap(f=>f.clubs.map(c=>`${c.sourceClubId}/${c.sourceCategoryId}`))
  if(rows.length!==8||new Set(participation).size!==16)fail('eight fixtures and every club exactly once per actual source round required')
 }
 return{clubs:[...clubs.values()].sort((a,b)=>`${a.sourceClubId}/${a.sourceCategoryId}`.localeCompare(`${b.sourceClubId}/${b.sourceCategoryId}`)),verifiedKeeperClubs:[...keepers].sort()}
}
/** Pure single-document proof for the closed packet and later offline consumers. */
export function proveFcfCurrentReleaseDocument({competition:c,document:d,now=Date.now()}){
 const scope=fcfFinalAuditScope(c?.slug),policy=getHistoricalStatisticsPolicy(c?.slug),id=d?.id
 if(!scope||!policy||c.id!==competitionIds[c.slug]||c.source!=='fcf'||c.source_policy!=='es-fcf-reviewed-history-v1'||c.source_league_code!==scope.code||c.active!==false||c.sezona_koledarska!==false||c.firstFantasyPlayedOn!=='2026-10-24'||typeof id!=='string'||!ID.test(id)||!Number.isInteger(d.expectedSourceRound)||d.expectedSourceRound<1||d.expectedSourceRound>30||!Number.isFinite(now))fail('exact approved scope and actual source round required')
 const entry=policy.entries.find(e=>e.sourceMatchId===id)
 const header=validateFcfSingleReportSource(d.html,scope.code,{id:`es${id}`,tekmovanje:c,sezona:'2026/27',danes:now})
 if(header.krog!==d.expectedSourceRound)fail('actual source round differs from inventory')
 const source=provenance(d,c,header,now,!!entry),clubs=sourceClubs(d.html)
 let canonical
 if(entry){
  const classified=classifyFcfHistoricalStatistics({competition:c,id,html:d.html})
  canonical={statisticsStatus:'unavailable_historical',statisticsReason:entry.reasonCode,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),sourceFixture:classified.fixture,report:null,appearances:null,goals:null}
 }else{
  const parsed=parseFcfCurrentAuditDocument({id,competitionSlug:c.slug,expectedSourceRound:d.expectedSourceRound,html:d.html,receipt:d.receipt,now})
  canonical={statisticsStatus:parsed.status==='complete'?'available':'pending',statisticsReason:null,policyId:null,policySha256:null,sourceFixture:null,report:parsed.report,appearances:parsed.appearances,goals:parsed.report?.goli??null}
 }
 return{id:`es${id}`,round:header.krog,date:header.datum,time:header.ura,homeGoals:header.izid?.domaci??null,awayGoals:header.izid?.gostje??null,clubs,source,...canonical}
}
function compile({sourceCommit,groups,beforeImageText,beforeSha256,databaseInventory,now=Date.now()},auditedUTC){
 if(!Number.isFinite(now)||!COMMIT.test(sourceCommit??'')||typeof beforeImageText!=='string'||!SHA.test(beforeSha256??'')||sha(beforeImageText)!==beforeSha256||!Array.isArray(groups)||groups.length!==3||new Set(groups.map(g=>g.competition?.slug)).size!==3)fail('exact main, SQL backup text/SHA and closed three-group input required')
 let backup
 try{backup=JSON.parse(beforeImageText)}catch{fail('SQL-produced before-image text is not JSON')}
 if(!backup||Array.isArray(backup)||typeof backup!=='object')fail('SQL-produced before-image object required')
 auditedUTC??=new Date(now).toISOString()
 const captured=Date.parse(databaseInventory?.capturedUTC)
 if(databaseInventory?.method!=='explicitBEGIN_READ_ONLY_ROLLBACK'||!Number.isFinite(captured)||captured>now||now-captured>24*3600000||!Array.isArray(databaseInventory.groups)||databaseInventory.groups.length!==3||new Set(databaseInventory.groups.map(c=>c.slug)).size!==3)fail('fresh exact read-only database inventory required')
 historicalStatisticsPolicySha256(databaseInventory) // Reject values outside finite JSON before retaining the evidence.
 const audit=Date.parse(auditedUTC)
 if(!Number.isFinite(audit)||audit>now||now-audit>24*3600000)fail('packet audit is stale/future')
 let totalBytes=0
 const output=FCF_HISTORICAL_GROUPS.map(slug=>{
  const g=groups.find(g=>g.competition?.slug===slug),c=g?.competition,scope=fcfFinalAuditScope(slug),policy=getHistoricalStatisticsPolicy(slug)
  if(!c||c.id!==competitionIds[slug]||c.source!=='fcf'||c.active!==false||c.source_policy!=='es-fcf-reviewed-history-v1'||c.sezona_koledarska!==false||c.source_league_code!==scope.code||c.firstFantasyPlayedOn!=='2026-10-24'||!Array.isArray(g.documents)||g.documents.length!==240)fail('exact approved inactive current scope/full document set required')
  const inventory=databaseInventory.groups.find(c=>c.slug===slug)
  if(!inventory||inventory.id!==c.id||inventory.active!==false||inventory.source!=='fcf'||inventory.sourceLeagueCode!==scope.code||inventory.sezona_koledarska!==false||!Object.hasOwn(inventory,'source_policy')||![null,c.source_policy].includes(inventory.source_policy)||!Array.isArray(inventory.nativeImportedIDs)||new Set(inventory.nativeImportedIDs).size!==inventory.nativeImportedIDs.length)fail('actual database source/calendar/policy inventory differs')
  const[start,end]=scope.code.split('-').map(Number),documents=new Map(g.documents.map(d=>[d.id,d]))
  if(documents.size!==240||[...documents.keys()].some(id=>typeof id!=='string'||!ID.test(id)||Number(id)<start||Number(id)>end))fail('foreign/missing/duplicate native source document')
  const fixtures=[]
  for(let n=start;n<=end;n++){
   const fixture=proveFcfCurrentReleaseDocument({competition:c,document:documents.get(String(n)),now})
   totalBytes+=fixture.source.bytes;if(totalBytes>192*1024*1024)fail('bounded expanded raw packet size exceeded')
   fixtures.push(fixture)
  }
  const canonicalById=new Map(fixtures.map(f=>[f.id,f]))
  if(inventory.nativeImportedIDs.some(id=>typeof id!=='string'||!ID.test(id)||!canonicalById.has(`es${id}`)||canonicalById.get(`es${id}`).statisticsStatus==='pending'))fail('known imported report cannot be missing, foreign or downgraded to pending')
  const r6=fixtures.filter(f=>f.round===6)
  if(r6.length!==8||r6.some(f=>f.statisticsStatus!=='pending')||r6.map(f=>f.date).sort()[0]!==c.firstFantasyPlayedOn)fail('genuine future first fantasy R6 required')
  return{competitionId:c.id,competitionSlug:slug,sourceCode:scope.code,season:'2026/27',firstFantasyPlayedOn:c.firstFantasyPlayedOn,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),...validateFcfCurrentReleaseCalendar(fixtures),fixtures}
 })
 const manifest={schemaVersion:1,kind:'fcf-current-only-release',sourceCommit,auditedUTC,beforeImageText,beforeSha256,databaseInventory,groups:output},manifestText=JSON.stringify(manifest)
 if(Buffer.byteLength(manifestText)>8*1024*1024)fail('bounded canonical manifest size exceeded')
 return{manifestText,manifestSha256:sha(manifestText)}
}
/** Input descriptors must originate in authenticated artifact readers. Raw bytes are always reparsed. */
export function compileFcfCurrentReleasePacket(input){return compile(input)}
/** Rebuild from the closed raw set and compare exact UTF8 text, including opaque SQL numeric formatting. */
export function verifyFcfCurrentReleasePacket(input){
 const{manifestText,manifestSha256}=input??{}
 if(typeof manifestText!=='string'||Buffer.byteLength(manifestText)>8*1024*1024||!SHA.test(manifestSha256??'')||sha(manifestText)!==manifestSha256)fail('exact packet text/SHA differs')
 let manifest
 try{manifest=JSON.parse(manifestText)}catch{fail('invalid packet JSON')}
 const rebuilt=compile(input,manifest?.auditedUTC)
 if(rebuilt.manifestText!==manifestText||rebuilt.manifestSha256!==manifestSha256)fail('packet differs from independently reparsed raw canonicals')
 return rebuilt
}
