// Native normalization is released only after closed original-byte replay.
import {createHash} from 'node:crypto'
import {readFileSync,lstatSync} from 'node:fs'
import {join} from 'node:path'
import {replayDriblDocuments,verifyDriblDirectory,parseDriblScopeCode,driblScopeCode} from './dribl-capture.mjs'
const API='https://mc-api.dribl.com/api/',SITE='https://competitions.footballnsw.com.au'
const SOURCE_ID=/^dribl:[A-Za-z0-9]{10}:user:[A-Za-z0-9]{10}$/
const proof=(ok,message)=>{if(!ok)throw Error('dribl import: '+message)}
const hash=x=>createHash('sha256').update(x).digest('hex'),clone=x=>structuredClone(x)
export const parseDriblLeagueCode=parseDriblScopeCode
/** Internal adapter key, never an official registration number. */
export function driblPlayerKey(sourceId){proof(typeof sourceId==='string'&&SOURCE_ID.test(sourceId),'invalid complete tenant/user source identity');return parseInt(hash(sourceId).slice(0,13),16)+2**52}
export function assertDriblIdentityCollisions(identities){
 proof(Array.isArray(identities)&&identities.length>0&&identities.length<=5000,'identity reservation batch must contain 1..5000 identities')
 const keys=new Map(),sources=new Set()
 for(const row of identities){proof(SOURCE_ID.test(row?.source_id??'')&&Number.isSafeInteger(row.reg_st)&&row.reg_st>=2**52&&row.reg_st<2**53&&!sources.has(row.source_id),'invalid or duplicate identity mapping');const old=keys.get(row.reg_st);proof(old===undefined||old===row.source_id,'numeric player identity collision');keys.set(row.reg_st,row.source_id);sources.add(row.source_id)}
 for(const row of identities)proof(row.reg_st===driblPlayerKey(row.source_id),'identity key differs from complete source identity')
}
function localTime(utc){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Ljubljana',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(utc)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return {datum:`${parts.year}-${parts.month}-${parts.day}`,ura:`${parts.hour}:${parts.minute}`}}
const matchKey=(tenant,id)=>`au-dribl:${tenant}:match:${id}`
/** Does not consume capture.result: edited parsed JSON is never import evidence. */
export async function buildDriblImportBatch(capture,{scope}={}){
 const target=parseDriblScopeCode(driblScopeCode(scope??{})),code=driblScopeCode(target)
 proof(Array.isArray(capture?.documents),'original document receipts required')
 const documents=capture.documents.map(d=>({...d,bytes:d.bytes instanceof Uint8Array?Buffer.from(d.bytes):d.bytes})),options=clone(capture.options)
 const replay=await replayDriblDocuments({options,documents})
 const league=replay.leagues.find(l=>l.code===code)
 proof(league&&league.fullImportEligible===true&&league.verdict==='PASS'&&league.coverage.sampled===false&&league.inventory.complete&&league.inventory.fullInventoryEvidence,'complete eligible nonsampled league capture required; held reports cannot import')
 const raw=new Map(documents.map(d=>[d.url,JSON.parse(Buffer.from(d.bytes).toString('utf8'))])),identities=new Map(),teamNames=new Map(),teamIds=new Map()
 const remember=p=>{proof(p.sourcePlayerId===`dribl:${target.tenant}:user:${p.profileId}`,'player identity differs from tenant/profile namespace');const key=driblPlayerKey(p.sourcePlayerId),old=identities.get(key);proof(old===undefined||old===p.sourcePlayerId,'numeric player identity collision');identities.set(key,p.sourcePlayerId);return key}
 const reports=[]
 for(const entry of league.reports){
  const f=league.inventory.fixtures.find(f=>f.matchId===entry.matchId),r=entry.result,h=r.header,m=raw.get(API+`matchcentre/${entry.matchId}?tenant=${target.tenant}`)?.data?.attributes
  proof(f&&r.reportStatistikaPripravljena===true&&r.verdict==='PASS'&&r.activationEligible===false&&r.sezonskiUvozPodprt===false&&m,'complete report-only parser proof required')
  proof(h.matchId===f.matchId&&h.dateUtc===f.dateUtc&&h.round===f.sourceRound&&h.displayRound===(f.phase==='regular'?'R':'F')+f.sourceRound&&h.matchType===(f.phase==='finals'?'finals':'roundrobin')&&['home','away'].every(s=>h[s].teamId===f[s].teamId&&h[s].name===f[s].name&&h.score[s]===f.score[s]),'report differs from exact native fixture team/date/score/phase binding')
  proof(Number.isInteger(f.fantasyRound)&&f.fantasyRound>=1&&league.inventory.roundPolicy.regularMax>=1,'complete source phase policy required')
  const players=new Map(),teams=r.diagnostics.teams.map(t=>{
   const teamId=h[t.side].teamId,clubId=h[t.side].clubId,teamName=h[t.side].name
   proof(!teamNames.has(teamId)||teamNames.get(teamId)===teamName,'published team ID changed name inside batch');proof(!teamIds.has(teamName)||teamIds.get(teamName)===teamId,'same team name belongs to distinct source teams');teamNames.set(teamId,teamName);teamIds.set(teamName,teamId)
   const original=raw.get(API+`matchcentre-match-members/match/${entry.matchId}/team/${teamId}`)
   proof(Array.isArray(original),'original roster receipt missing')
   const converted=t.players.map(p=>{
    const source=original.filter(q=>q.role_slug==='player'&&q.available===true&&q.user_hash_id===p.profileId)
    proof(source.length===1&&typeof source[0].is_captain==='boolean'&&!players.has(p.profileId),'unambiguous original player/captain evidence required')
    const st=Number(p.shirt);proof(Number.isSafeInteger(st)&&st>=0&&st<=9999,'invalid native shirt number')
    const q={ime:p.name,st,regSt:remember(p),virId:p.sourcePlayerId,profileId:p.profileId,profileUrl:p.profileUrl,zacetnik:p.starter,vratar:p.goalkeeper,pozicija:p.goalkeeper?'GK':null,kapetan:source[0].is_captain,preklopi:r.substitutions.filter(s=>s.inProfileId===p.profileId||s.outProfileId===p.profileId).map(s=>s.effectiveMinute)}
    players.set(p.profileId,{...p,native:q});return q
   })
   proof(converted.filter(p=>p.zacetnik).length===11&&converted.filter(p=>p.zacetnik&&p.vratar).length===1,'native starting XI or GK incomplete')
   return {ime:teamName,sourceTeamId:teamId,sourceClubId:clubId,postava:converted.filter(p=>p.zacetnik),rezerve:converted.filter(p=>!p.zacetnik)}
  })
  const eventActor=e=>{
   const p=players.get(e.profileId);proof(p&&p.sourcePlayerId===e.sourcePlayerId&&p.teamId===e.teamId,'native event recipient differs from published profile')
   return {ime:p.name,st:p.native.st,regSt:p.native.regSt,virId:p.sourcePlayerId,profileId:p.profileId,ekipaIdx:p.side==='home'?0:1,ekipa:h[p.side].name,minuta:e.effectiveMinute,sourceMinute:e.minute,sourceSection:e.section}
  }
  let home=0,away=0;const goals=[]
  for(const e of m.match_events.filter(e=>e.type==='goal').slice().sort((a,b)=>(a.game_section==='ft-second-half'?1000:0)+Number(a.minute)-((b.game_section==='ft-second-half'?1000:0)+Number(b.minute)))){
   const candidates=r.goals.filter(g=>g.teamId===e.team_id&&g.name===e.name&&g.minute===e.minute&&g.section===e.game_section)
   proof(candidates.length===1,'native goal order/recipient is ambiguous');const g=candidates[0],a=eventActor(g),beneficiary=g.ownGoal?1-a.ekipaIdx:a.ekipaIdx
   if(beneficiary===0)home++;else away++
   proof(home===e.home_score&&away===e.away_score,'native goal progression differs')
   goals.push({...a,avtogol:g.ownGoal,enajstmetrovka:g.penalty,sourceMemberId:g.sourceMemberId,rezultat:[home,away]})
  }
  proof(home===f.score.home&&away===f.score.away,'native goal totals differ from published result')
  const sourceCards=r.cards.map(e=>{proof(e.kind==='yellow'||e.kind==='red'&&['R5','R7'].includes(e.code),'unsupported native card');return {...eventActor(e),kind:e.kind,code:e.code,secondYellow:e.secondYellow}})
  const reds=sourceCards.filter(c=>c.kind==='red').map(c=>({...c,drugiRumeni:c.secondYellow}))
  const secondYellowRows=new Set()
  for(const red of reds.filter(c=>c.secondYellow)){const candidates=sourceCards.filter(c=>c.kind==='yellow'&&red.profileId===c.profileId&&red.sourceMinute===c.sourceMinute&&red.sourceSection===c.sourceSection);proof(candidates.length>=1,'second caution source record missing');secondYellowRows.add(candidates.at(-1))}
  const yellows=sourceCards.filter(c=>c.kind==='yellow'&&!secondYellowRows.has(c))
  const changes=r.substitutions.map(e=>{const pin=players.get(e.inProfileId),pout=players.get(e.outProfileId);proof(pin&&pout&&pin.teamId===pout.teamId&&pin.teamId===e.teamId,'native substitution identity differs');return {ekipaIdx:e.side==='home'?0:1,minuta:e.effectiveMinute,sourceMinute:e.minute,sourceSection:e.section,noter:{...pin.native},ven:{...pout.native}}})
  const appearances=r.appearances.map(a=>{
   const p=players.get(a.profileId),g=goals.filter(g=>g.profileId===a.profileId),idx=a.side==='home'?0:1,conceded=idx===0?f.score.away:f.score.home
   proof(p&&p.sourcePlayerId===a.sourcePlayerId&&a.minutes===a.to-a.from&&a.from>=0&&a.to<=90,'native appearance identity or interval differs')
   return {ekipaIdx:idx,ekipa:h[a.side].name,st:p.native.st,ime:a.name,regSt:p.native.regSt,virId:a.sourcePlayerId,profileId:a.profileId,pozicija:a.goalkeeper?'GK':null,vratar:a.goalkeeper,kapetan:p.native.kapetan,zacetnik:a.starter,minutaOd:a.from,minutaDo:a.to,minute:a.minutes,goli:g.filter(g=>!g.avtogol).length,goliIzEnajstmetrovke:g.filter(g=>g.enajstmetrovka&&!g.avtogol).length,avtogoli:g.filter(g=>g.avtogol).length,zgreseneEnajstmetrovke:0,rumeni:yellows.filter(c=>c.profileId===a.profileId).length,rdeci:reds.filter(c=>c.profileId===a.profileId).length,prejetiGoli:conceded,cleanSheet:conceded===0}
  })
  proof([0,1].every(s=>appearances.filter(a=>a.ekipaIdx===s).reduce((n,a)=>n+a.minute,0)===r.diagnostics.teamMinutesExpected[s===0?'home':'away']),'native team minutes differ')
  const when=localTime(f.dateUtc),id=matchKey(target.tenant,f.matchId),url=SITE+'/matchcentre/?m='+f.matchId
  const audit={sourcePhase:f.phase,sourceRound:f.sourceRound,sourceFullRound:f.fullRound,sourceRoundLabel:f.roundLabel,sourceMatchType:h.matchType,sourceDateUtc:f.dateUtc,derivedFantasyRound:f.phase==='finals',sourceInventoryMetadata:clone(f.audit)}
  reports.push({id,url,matchId:f.matchId,...audit,nastopi:appearances,z:{zapisnikId:id,url,sezona:String(league.catalog.selected.season.year),datum:when.datum,ura:when.ura,krog:f.fantasyRound,domaci:teams[0],gostje:teams[1],rezultat:{domaci:f.score.home,gostje:f.score.away},polcas:{domaci:m.home_score_ht,gostje:m.away_score_ht},goli:goals,rumeni:yellows,rdeci:reds,sourceCards,menjave:changes,zgresene:[],nepopoln:false,prazen:false,opozorila:[],...audit}})
 }
 proof(reports.length===league.coverage.playedFixtures,'native report coverage differs')
 const rounds=new Map()
 for(const f of league.inventory.fixtures){const when=localTime(f.dateUtc);if(!rounds.has(f.fantasyRound))rounds.set(f.fantasyRound,[]);rounds.get(f.fantasyRound).push({id:f.matchId,zapisnikId:matchKey(target.tenant,f.matchId),url:f.matchUrl,krog:f.fantasyRound,datum:when.datum,ura:when.ura,domaci:f.home.name,gostje:f.away.name,domaciId:f.home.teamId,gostjeId:f.away.teamId,izid:f.score?[f.score.home,f.score.away]:null,odigrana:f.score!==null,kontumacija:false,sourcePhase:f.phase,sourceRound:f.sourceRound,sourceFullRound:f.fullRound,sourceDateUtc:f.dateUtc,derivedFantasyRound:f.phase==='finals'})}
 const identityRows=[...identities].map(([reg_st,source_id])=>({source_id,reg_st})).sort((a,b)=>a.source_id.localeCompare(b.source_id));assertDriblIdentityCollisions(identityRows)
 return {provider:'dribl-public',scope:target,code,season:String(league.catalog.selected.season.year),asOfDate:replay.asOfDate,catalog:clone(league.catalog),roundPolicy:clone(league.inventory.roundPolicy),reports,schedule:[...rounds].sort(([a],[b])=>a-b).map(([stevilka,tekme])=>({stevilka,tekme})),identities:identityRows,activationEligible:false}
}
export async function loadDriblImportCapture(directory,{tenant,season,competition,league,current=true,now=Date.now()}={},{verifyDirectory=verifyDriblDirectory}={}){
 const scope=parseDriblScopeCode(driblScopeCode({tenant,season,competition,league})),receipt=await verifyDirectory(directory)
 proof(receipt.verified===true&&receipt.activationEligible===false&&receipt.options.reportLimit===null,'complete non-sampled replay proof required')
 for(const name of ['manifest.json','result.json'])proof(lstatSync(join(directory,name)).isFile()&&!lstatSync(join(directory,name)).isSymbolicLink(),'regular capture files required')
 const bytes=readFileSync(join(directory,'result.json')),manifest=JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8'))
 proof(hash(bytes)===receipt.resultSha256&&manifest.resultSha256===receipt.resultSha256&&manifest.codeSha256===receipt.codeSha256,'verified capture changed after replay')
 const start=Date.parse(manifest.createdAt),end=Date.parse(manifest.completedAt)
 if(current)proof(Number.isFinite(now)&&Number.isFinite(start)&&Number.isFinite(end)&&start<=end&&end<=now&&now-start<=24*3600_000,'current capture is stale or has future timestamps')
 const batch=await buildDriblImportBatch({options:receipt.options,documents:receipt.documents},{scope})
 return {...batch,provenance:{resultSha256:receipt.resultSha256,codeSha256:receipt.codeSha256,createdAt:manifest.createdAt,completedAt:manifest.completedAt,requests:receipt.requests}}
}
