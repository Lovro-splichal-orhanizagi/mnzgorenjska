// Native normalization is deliberately separate from the report-only parser.
// The runtime loads only a complete, replay-verified original-byte capture.
import {createHash} from 'node:crypto'
import {readFileSync,lstatSync} from 'node:fs'
import {join} from 'node:path'
import {verifyFussballDirectory} from './fussball-capture-evidence.mjs'
import {encodeUnattributedYellow} from '../src/lib/nepripisaniRumeni.mjs'
import {parseFussballEventClock} from './viri/fussball.mjs'
import {validateFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'
import {FUSSBALL_SOURCE_ID} from './lib/fussball-identity.mjs'

const SOURCE_ID=FUSSBALL_SOURCE_ID
const MATCH_ID=/^[A-Z0-9]{32}$/
const HASH=/^[a-f0-9]{64}$/
const requireProof=(ok,reason)=>{if(!ok)throw Error(`fussball import: ${reason}`)}
const clone=value=>structuredClone(value)
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const sameScore=(a,b)=>a&&b&&a.domaci===b.domaci&&a.gostje===b.gostje
const validDate=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s
const reportUrlId=url=>typeof url==='string'&&url.match(/^https:\/\/www\.fussball\.de\/spiel\/(?:[a-z0-9]+(?:-{1,2}[a-z0-9]+)*\/)?-\/spiel\/([A-Z0-9]{32})$/)?.[1]
const headerEqual=(a,b)=>['id','zapisnikId','url','krog','datum','ura','domaci','gostje'].every(k=>a?.[k]===b?.[k])&&sameScore(a?.rezultat,b?.rezultat)

export function parseFussballLeagueCode(code){
 const m=typeof code==='string'&&code.match(/^([A-Z0-9]{32}-G):(20\d{2})\/(\d{2})$/)
 requireProof(m&&(+m[2]+1)%100===+m[3],'league code must be an exact staffel:YYYY/YY')
 return {staffel:m[1],season:`${m[2]}/${m[3]}`}
}

/** Internal adapter key, never an official DFB registration number. */
export function fussballPlayerKey(sourceId){
 requireProof(typeof sourceId==='string'&&SOURCE_ID.test(sourceId),'invalid published player identity')
 return parseInt(hash(sourceId).slice(0,13),16)+2**52
}

function yellowWarning(event,fixture){
 requireProof(event?.vrsta==='rumeni'&&event.virId===null&&Array.isArray(event.virIds)&&event.virIds.length===0&&event.zapisnikId===fixture.zapisnikId&&event.virUrl===fixture.url,'unassigned yellow has wrong report identity')
 requireProof(Number.isInteger(event.osnovnaMinuta)&&Number.isInteger(event.dodatek)&&event.minuta===event.osnovnaMinuta,'unassigned yellow has invalid time')
 return encodeUnattributedYellow({source:'fussball',matchId:fixture.zapisnikId,sourceUrl:fixture.url,side:event.ekipaIdx,clock:`${event.osnovnaMinuta}${event.dodatek?'+'+event.dodatek:''}'`,minute:event.minuta,reason:'not-published',eventSha256:event.eventSha256,ordinal:event.ordinal,profileId:null})
}

function nativeDiscipline(result,fixture,roster,remember){
 const {z}=result,raw=result.dogodki
 requireProof(Array.isArray(z.rumeni??[])&&Array.isArray(z.rdeci??[])&&Array.isArray(raw),'missing source discipline evidence')
 const counts=new Map(),seen=new Set(),active=new Set([...roster].filter(([,p])=>p.starter).map(([id])=>id)),entered=new Set(active),dismissed=new Set(),byOrdinal=new Map()
 const clock=e=>e.polcas*100000+e.osnovnaMinuta*100+e.dodatek
 let previous=-1
 for(const [i,e]of raw.entries()){
  const parsed=parseFussballEventClock(e.cas)
  requireProof(e.ordinal===i+1&&parsed&&parsed.base===e.osnovnaMinuta&&parsed.added===e.dodatek&&[1,2].includes(e.polcas)&&e.minuta===Math.min(90,parsed.base)&&clock(e)>=previous&&e.zapisnikId===fixture.zapisnikId&&e.virUrl===fixture.url&&HASH.test(e.eventSha256??''),'invalid source discipline clock/order/provenance')
  previous=clock(e);byOrdinal.set(e.ordinal,e)
 }
 const convert=(event,type)=>{
  const p=roster.get(event.virId),source=byOrdinal.get(event.ordinal)
  requireProof(p&&event.regSt===null&&event.vrsta===type&&event.ime===p.ime&&event.st===p.st&&event.ekipaIdx===p.side&&event.ekipa===[z.domaci,z.gostje][p.side].ime&&!seen.has(event.ordinal),'card recipient/historical side differs')
  const fields=['vrsta','virId','virIds','ekipaIdx','cas','osnovnaMinuta','dodatek','minuta','polcas','ordinal','eventSha256','zapisnikId','virUrl',...(type==='rdeci'?['drugiRumeni','naIgriscu']:[])]
  requireProof(source&&fields.every(k=>JSON.stringify(source[k])===JSON.stringify(event[k]))&&event.virIds?.length===1&&event.virIds[0]===event.virId,'card differs from authoritative raw event')
  if(type==='rdeci')requireProof(typeof event.drugiRumeni==='boolean'&&typeof event.naIgriscu==='boolean','red-card type/on-field proof missing')
  seen.add(event.ordinal)
  const own=counts.get(event.virId)??{yellow:[],red:[]};own[type==='rumeni'?'yellow':'red'].push(event);counts.set(event.virId,own)
  requireProof(own.yellow.length<=1&&own.red.length<=1,'duplicate source caution/dismissal')
  return {...clone(event),regSt:remember(event.virId)}
 }
 const rumeni=(z.rumeni??[]).map(e=>convert(e,'rumeni')),rdeci=(z.rdeci??[]).map(e=>convert(e,'rdeci'))
 requireProof(raw.filter(e=>['rumeni','rdeci'].includes(e.vrsta)&&e.virId!==null).length===seen.size,'source cards missing from card inventory')
 for(const e of raw){
  if(e.vrsta==='gol')requireProof(active.has(e.virId),'goal outside authoritative raw active interval')
  if(e.vrsta==='menjava'){
   const [incoming,outgoing]=e.virIds??[]
   requireProof(e.virIds.length===2&&active.has(outgoing)&&roster.get(incoming)?.side===e.ekipaIdx&&roster.get(outgoing)?.side===e.ekipaIdx&&!entered.has(incoming)&&!dismissed.has(incoming),'substitution outside authoritative raw active interval')
   active.delete(outgoing);active.add(incoming);entered.add(incoming)
  }
  if(['rumeni','rdeci'].includes(e.vrsta)&&e.virId!==null){
   requireProof(seen.has(e.ordinal)&&!dismissed.has(e.virId),'card after dismissal or outside source inventory')
   if(e.vrsta==='rdeci'){
    const first=counts.get(e.virId).yellow[0]
    requireProof(!e.drugiRumeni||first&&first.ordinal<e.ordinal&&clock(first)<=clock(e),'second yellow lacks published prior caution')
    requireProof(e.naIgriscu===active.has(e.virId),'red on-field proof differs from source timeline')
    dismissed.add(e.virId);active.delete(e.virId)
   }
  }
 }
 return {rumeni,rdeci,counts}
}

export function normalizeFussballReport(entry,fixture,season,identities=new Map()){
 const result=entry?.result,z=result?.z
 requireProof(headerEqual(entry?.fixture,fixture),'report fixture differs from schedule')
 requireProof(result.reportStatistikaPripravljena===true&&result.sezonskiUvozPodprt===false&&result.activationEligible===false&&z?.nepopoln===true,'missing report-only parser proof')
 requireProof(z.zapisnikId===fixture.zapisnikId&&z.datum===fixture.datum&&z.ura===fixture.ura&&z.krog===fixture.krog&&z.domaci?.ime===fixture.domaci&&z.gostje?.ime===fixture.gostje&&sameScore(z.rezultat,fixture.rezultat),'report header differs from schedule')
 requireProof(Array.isArray(z.goli)&&Array.isArray(result.nastopi)&&Array.isArray(result.nepripisaniRumeni),'missing report statistics')
 const roster=new Map()
 const remember=sourceId=>{
  const key=fussballPlayerKey(sourceId),existing=identities.get(key)
  requireProof(!existing||existing===sourceId,'numeric player identity collision')
  identities.set(key,sourceId);return key
 }
 const teams=[z.domaci,z.gostje].map((team,side)=>{
  requireProof(Array.isArray(team.postava)&&team.postava.length===11&&Array.isArray(team.rezerve)&&team.postava.filter(p=>p.vratar===true).length===1,'incomplete starting lineup or goalkeeper')
  const convert=(p,starter)=>{
   requireProof(!roster.has(p.virId)&&typeof p.ime==='string'&&p.ime.trim()&&Number.isInteger(p.st)&&typeof p.vratar==='boolean','invalid or duplicate roster player')
   roster.set(p.virId,{...p,side,starter})
   return {...clone(p),regSt:remember(p.virId)}
  }
  return {ime:team.ime,postava:team.postava.map(p=>convert(p,true)),rezerve:team.rezerve.map(p=>convert(p,false))}
 })
 const discipline=nativeDiscipline(result,fixture,roster,remember)
 const appeared=new Map(),totals=[0,0]
 const nastopi=result.nastopi.map(a=>{
  const p=roster.get(a.virId)
  requireProof(p&&!appeared.has(a.virId)&&a.regSt===null&&a.ekipaIdx===p.side&&a.ekipa===teams[p.side].ime&&a.ime===p.ime&&a.st===p.st&&a.vratar===p.vratar&&a.zacetnik===p.starter,'appearance identity or historical side differs')
  requireProof(['minutaOd','minutaDo','minute','goli','goliIzEnajstmetrovke','avtogoli','zgreseneEnajstmetrovke','rumeni','rdeci','prejetiGoli'].every(k=>Number.isInteger(a[k])&&a[k]>=0),'invalid numeric appearance field')
  const cards=discipline.counts.get(a.virId)??{yellow:[],red:[]},red=cards.red[0]
  requireProof(a.minutaDo<=90&&a.minutaOd<=a.minutaDo&&a.minute===a.minutaDo-a.minutaOd&&(!a.zacetnik||a.minutaOd===0)&&a.rumeni===cards.yellow.length&&a.rdeci===cards.red.length&&(a.redCardMinute??null)===(red?.minuta??null)&&a.zgreseneEnajstmetrovke===0,'invalid or unsupported appearance interval/discipline')
  if(red)requireProof(red.naIgriscu?a.minutaDo===red.minuta&&a.minutaOd<=red.minuta:a.minutaDo<=red.minuta,'red-card interval differs')
  const conceded=p.side===0?z.rezultat.gostje:z.rezultat.domaci
  requireProof(a.prejetiGoli===conceded&&a.cleanSheet===(conceded===0)&&a.pozicija===(a.vratar?'GK':null),'appearance scoring policy differs')
  totals[p.side]+=a.minute
  const native={...clone(a),regSt:remember(a.virId)};appeared.set(a.virId,native);return native
 })
 requireProof(totals.every((n,side)=>n===990-discipline.rdeci.filter(e=>e.ekipaIdx===side&&e.naIgriscu).reduce((loss,e)=>loss+90-e.minuta,0))&&[...roster.entries()].filter(([,p])=>p.starter).every(([id])=>appeared.has(id))&&[...discipline.counts.keys()].every(id=>appeared.has(id)),'incomplete appearance coverage/dismissal minute totals')
 let home=0,away=0
 const goli=z.goli.map(g=>{
  const a=appeared.get(g.virId)
  requireProof(a&&g.ime===a.ime&&g.ekipa===a.ekipa&&Number.isInteger(g.minuta)&&g.minuta>=a.minutaOd&&g.minuta<=a.minutaDo&&typeof g.avtogol==='boolean'&&typeof g.enajstmetrovka==='boolean'&&!(g.avtogol&&g.enajstmetrovka),'goal has unknown or inconsistent scorer')
  const beneficiary=g.avtogol?1-a.ekipaIdx:a.ekipaIdx
  if(beneficiary===0)home++;else away++
  requireProof(sameScore(g.rezultat,{domaci:home,gostje:away}),'goal progression differs from published score')
  return {...clone(g),ekipaIdx:a.ekipaIdx,st:a.st,regSt:a.regSt,rezultat:[home,away]}
 })
 requireProof(sameScore(z.rezultat,{domaci:home,gostje:away}),'goals differ from final score')
 for(const a of nastopi){
  const goals=goli.filter(g=>g.virId===a.virId)
  requireProof(a.goli===goals.filter(g=>!g.avtogol).length&&a.avtogoli===goals.filter(g=>g.avtogol).length&&a.goliIzEnajstmetrovke===goals.filter(g=>g.enajstmetrovka&&!g.avtogol).length,'appearance goal totals differ')
 }
 const warnings=result.nepripisaniRumeni.map(e=>yellowWarning(e,fixture))
 return {id:fixture.zapisnikId,url:fixture.url,nastopi,...(result.cardEnvelope?{cardEnvelope:clone(result.cardEnvelope)}:{}),z:{zapisnikId:fixture.zapisnikId,sezona:season,datum:z.datum,ura:z.ura,krog:z.krog,domaci:teams[0],gostje:teams[1],rezultat:clone(z.rezultat),goli,menjave:clone(z.menjave),rumeni:discipline.rumeni,rdeci:discipline.rdeci,nepopoln:false,opozorila:warnings}}
}

/** Pure normalization. Trust is added only by complete original-byte replay. */
export function buildFussballImportBatch(result,{staffel,season,cardPolicy}={}){
 parseFussballLeagueCode(`${staffel}:${season}`)
 const s=result?.schedule,c=result?.coverage,scope=result?.scope
 const community=cardPolicy==='community-v1'
 requireProof((cardPolicy===undefined||community)&&scope?.cardPolicy===cardPolicy,'capture card policy differs')
 const pending=community?result.pendingReports:[]
 if(community)requireProof(Array.isArray(pending)&&Array.isArray(result.cardEnvelopes),'missing pending/card evidence')
 requireProof(result?.version===1&&result.activationEligible===false&&scope?.provider==='fussball'&&scope.staffel===staffel&&scope.season===season&&s?.staffel===staffel&&s.season===season&&validDate(scope.asOfDate),'capture scope differs')
 requireProof(typeof scope.seedUrl==='string'&&new RegExp(`^https://www\\.fussball\\.de/spieltag/(?:[a-z0-9]+(?:-[a-z0-9]+)*/)?-/staffel/${staffel}$`).test(scope.seedUrl),'invalid seed scope')
 requireProof(Array.isArray(s.rounds)&&s.rounds.length>0&&s.rounds.length<=80&&s.rounds.every((r,i)=>r===i+1),'missing or noncontiguous advertised rounds')
 requireProof(Array.isArray(s.fixtures)&&s.fixtures.length>0&&Array.isArray(result.reports)&&Array.isArray(result.rejectedReports)&&result.rejectedReports.length===0,'missing fixtures or rejected reports')
 const fixtures=new Map()
 for(const f of s.fixtures){
  requireProof(!f||!Object.hasOwn(f,'administrativeResult'),'administrative result requires explicit native policy; import refused')
  requireProof(MATCH_ID.test(f.id??'')&&f.zapisnikId===`de-fussball-${f.id}`&&reportUrlId(f.url)===f.id&&!fixtures.has(f.id),'invalid or duplicate fixture identity')
  requireProof(s.rounds.includes(f.krog)&&validDate(f.datum)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(f.ura??'')&&typeof f.domaci==='string'&&f.domaci.trim()&&typeof f.gostje==='string'&&f.gostje.trim()&&f.domaci!==f.gostje,'invalid fixture header')
  requireProof(f.rezultat===null||['domaci','gostje'].every(k=>Number.isInteger(f.rezultat?.[k])&&f.rezultat[k]>=0&&f.rezultat[k]<=99),'invalid fixture score')
  requireProof(f.rezultat!==null||f.datum>=scope.asOfDate,'past fixture has no verified official result')
  fixtures.set(f.id,f)
 }
 const played=s.fixtures.filter(f=>f.rezultat!==null),unscored=s.fixtures.filter(f=>f.rezultat===null)
 const unscoredCounts={total:unscored.length,past:0,current:unscored.filter(f=>f.datum===scope.asOfDate).length,future:unscored.filter(f=>f.datum>scope.asOfDate).length,unknownDate:0}
 requireProof(c?.sampled===false&&c.expectedRounds===s.rounds.length&&c.capturedRounds===s.rounds.length&&c.fixtures===s.fixtures.length&&c.playedFixtures===played.length&&c.attemptedReports===played.length&&c.completeReports===result.reports.length&&c.rejectedReports===0&&result.reports.length+pending.length===played.length&&(!community||c.pendingReports===pending.length)&&Object.keys(unscoredCounts).every(k=>c.unscoredFixtures?.[k]===unscoredCounts[k]),'incomplete or inconsistent full-season coverage')
 requireProof(played.length>0,'no verified played reports')
 const identities=new Map(),seen=new Set(),reports=[]
 for(const entry of result.reports){
  const f=fixtures.get(entry?.fixture?.id)
  requireProof(f&&f.rezultat!==null&&!seen.has(f.id),'duplicate or out-of-scope report')
  seen.add(f.id);reports.push(normalizeFussballReport(entry,f,season,identities))
 }
 const pendingReports=[]
 if(community){
  const allEnvelopes=[]
  for(const entry of [...result.reports,...pending]){
   const f=fixtures.get(entry?.fixture?.id),e=entry?.result?.cardEnvelope
   requireProof(f&&headerEqual(entry.fixture,f)&&e,'missing/out-of-scope card report')
   const verified=validateFussballCardEnvelope(e),rz=verified.result.z
   requireProof(e.matchId===f.id&&e.reportId===f.zapisnikId&&e.sourceUrl===f.url&&e.season===season&&e.round===f.krog&&e.date===f.datum&&e.time===f.ura&&e.homeName===f.domaci&&e.awayName===f.gostje&&sameScore(e.score,f.rezultat),'card evidence header differs')
   requireProof(JSON.stringify(entry.result)===JSON.stringify(verified.result),'card evidence differs from original-byte replay')
   allEnvelopes.push(e)
   for(const p of e.roster){const key=fussballPlayerKey(p.sourceId);requireProof(!identities.has(key)||identities.get(key)===p.sourceId,'numeric player identity collision');identities.set(key,p.sourceId)}
   if(!pending.includes(entry))continue
   requireProof(!seen.has(f.id)&&entry.result.statisticsPending===true&&entry.result.reportStatistikaPripravljena===false&&verified.result.statisticsPending===true&&!Object.hasOwn(entry.result,'nastopi')&&!Object.hasOwn(entry.result.z,'goli'),'invalid pending statistics envelope')
   seen.add(f.id)
   const teams=[rz.domaci,rz.gostje].map(t=>({...clone(t),postava:t.postava.map(p=>({...clone(p),regSt:fussballPlayerKey(p.virId)})),rezerve:t.rezerve.map(p=>({...clone(p),regSt:fussballPlayerKey(p.virId)}))}))
   pendingReports.push({id:f.zapisnikId,url:f.url,statisticsPending:true,cardEnvelope:clone(e),z:{zapisnikId:f.zapisnikId,sezona:season,datum:rz.datum,ura:rz.ura,krog:rz.krog,domaci:teams[0],gostje:teams[1],rezultat:clone(rz.rezultat),nepopoln:true,opozorila:['SLFF_FUSSBALL_CARDS_PENDING_V1']}})
  }
  requireProof(JSON.stringify(result.cardEnvelopes)===JSON.stringify(allEnvelopes),'card envelope inventory differs')
 }
 const schedule=s.rounds.map(stevilka=>({stevilka,tekme:s.fixtures.filter(f=>f.krog===stevilka).map(f=>({...clone(f),izid:f.rezultat?[f.rezultat.domaci,f.rezultat.gostje]:null,odigrana:f.rezultat!==null,kontumacija:false}))}))
 return {provider:'fussball-public',staffel,season,asOfDate:scope.asOfDate,reports,...(community?{cardPolicy,pendingReports,cardEnvelopes:clone(result.cardEnvelopes)}:{}),schedule,identities:[...identities].map(([reg_st,source_id])=>({source_id,reg_st})).sort((a,b)=>a.source_id.localeCompare(b.source_id)),activationEligible:false}
}

/** Complete capture verification, with no source or database network fallback. */
export async function loadFussballImportCapture(directory,{staffel,season,current=true,now=Date.now(),cardPolicy}={}, {verifyDirectory=verifyFussballDirectory}={}){
 const receipt=await verifyDirectory(directory)
 requireProof(receipt.scope?.staffel===staffel&&receipt.scope?.season===season,'verified capture belongs to another league or season')
 const file=join(directory,'result.json'),manifestFile=join(directory,'manifest.json')
 requireProof(lstatSync(file).isFile()&&!lstatSync(file).isSymbolicLink()&&lstatSync(manifestFile).isFile()&&!lstatSync(manifestFile).isSymbolicLink(),'capture result must be a regular file')
 const bytes=readFileSync(file),manifest=JSON.parse(readFileSync(manifestFile,'utf8'))
 requireProof(HASH.test(receipt.resultSha256)&&hash(bytes)===receipt.resultSha256&&manifest.resultSha256===receipt.resultSha256,'verified capture changed after replay')
 requireProof(manifest.options?.cardPolicy===cardPolicy,'capture card policy differs')
 requireProof(manifest.options?.reportLimit===null,'sample capture cannot be imported')
 if(current){
  const start=Date.parse(manifest.createdAt),end=Date.parse(manifest.completedAt)
  requireProof(Number.isFinite(now)&&Number.isFinite(start)&&Number.isFinite(end)&&start<=end&&end<=now&&now-start<=24*3600_000,'current capture is stale or has future timestamps')
 }
 const batch=buildFussballImportBatch(JSON.parse(bytes),{staffel,season,cardPolicy})
 return {...batch,provenance:{resultSha256:receipt.resultSha256,codeSha256:receipt.codeSha256,createdAt:manifest.createdAt,completedAt:manifest.completedAt,requests:receipt.requests}}
}
