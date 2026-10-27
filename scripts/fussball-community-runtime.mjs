// Retained-source card correction only: no football fetch or inferred identities.
import {validateFussballCardEnvelope,replayFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'
import {parseFussballLeagueCode} from './fussball-import.mjs'
const requireProof=(ok,message)=>{if(!ok)throw Error('FUSSBALL card runtime: '+message)}
const id=n=>Number.isSafeInteger(n)&&n>0
const hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s)
async function invoke(db,name,args){
 const {data,error}=await db.rpc(name,args)
 if(error)throw Error(`${name}: ${error.message??'database error'}`)
 return data
}
function mappings(envelope,candidates){
 requireProof(Array.isArray(candidates)&&candidates.length===envelope.roster.length,'complete candidate mapping required')
 const bySource=new Map(),players=new Set(),sides=[new Set(),new Set()]
 for(const c of candidates){
  const p=envelope.roster.find(p=>p.sourceId===c.source_id)
  requireProof(p&&id(c.player_id)&&id(c.team_id)&&!bySource.has(c.source_id)&&!players.has(c.player_id),'invalid/duplicate native candidate')
  bySource.set(c.source_id,c);players.add(c.player_id);sides[p.side].add(c.team_id)
 }
 requireProof(sides.every(s=>s.size===1)&&[...sides[0]][0]!==[...sides[1]][0],'historical team mapping differs')
 return bySource
}
export function buildFussballCardNativeRows({envelope,report,candidates,matchId}={}){
 requireProof(id(matchId),'exact native match required')
 const bySource=mappings(envelope,candidates),z=report?.z
 requireProof(report?.id===envelope.reportId&&report.url===envelope.sourceUrl&&z?.zapisnikId===envelope.reportId&&z.nepopoln===false&&z.sezona===envelope.season&&z.datum===envelope.date&&z.krog===envelope.round&&z.domaci?.ime===envelope.homeName&&z.gostje?.ime===envelope.awayName&&z.rezultat?.domaci===envelope.score.domaci&&z.rezultat?.gostje===envelope.score.gostje,'replayed report header differs')
 requireProof(Array.isArray(report.nastopi)&&report.nastopi.length>=22&&Array.isArray(z.goli)&&Array.isArray(z.opozorila),'complete replayed statistics required')
 const used=new Set()
 const appearances=report.nastopi.map(a=>{
  const c=bySource.get(a.virId),p=envelope.roster.find(p=>p.sourceId===a.virId)
  requireProof(c&&p&&a.regSt===p.regSt&&a.ekipaIdx===p.side&&a.st===p.shirt&&a.zacetnik===p.starter&&a.vratar===p.goalkeeper&&!used.has(c.player_id),'replayed appearance identity differs')
  for(const k of ['minutaOd','minutaDo','minute','goli','avtogoli','goliIzEnajstmetrovke','zgreseneEnajstmetrovke','rumeni','rdeci','prejetiGoli'])requireProof(Number.isSafeInteger(a[k])&&a[k]>=0,'missing replayed numeric statistic '+k)
  requireProof(a.minutaOd<=a.minutaDo&&a.minutaDo<=90&&a.minute===a.minutaDo-a.minutaOd&&typeof a.cleanSheet==='boolean'&&(!a.rdeci||Number.isSafeInteger(a.redCardMinute)),'inconsistent replayed interval/discipline')
  used.add(c.player_id)
  return {match_id:matchId,player_id:c.player_id,team_id:c.team_id,shirt_number:p.shirt,started:p.starter,minute_on:a.minutaOd,minute_off:a.minutaDo,minutes_played:a.minute,goals:a.goli,own_goals:a.avtogoli,penalties_scored:a.goliIzEnajstmetrovke,penalties_missed:a.zgreseneEnajstmetrovke,
   // The strict event grammar rejects saved/missed-penalty source shapes.
   penalties_saved:0,yellow_cards:a.rumeni,red_cards:a.rdeci,red_card_minute:a.redCardMinute??null,goals_conceded:a.prejetiGoli,clean_sheet:a.cleanSheet,is_goalkeeper:p.goalkeeper}
 })
 const goals=z.goli.map(g=>{
  const c=bySource.get(g.virId),p=envelope.roster.find(p=>p.sourceId===g.virId)
  requireProof(c&&p&&used.has(c.player_id)&&g.regSt===p.regSt&&g.ekipaIdx===p.side&&Array.isArray(g.rezultat)&&g.rezultat.length===2&&Number.isSafeInteger(g.minuta)&&typeof g.avtogol==='boolean'&&typeof g.enajstmetrovka==='boolean','replayed goal identity/score differs')
  return {match_id:matchId,minute:g.minuta,scorer_id:c.player_id,team_id:c.team_id,is_own_goal:g.avtogol,is_penalty:g.enajstmetrovka,score_home:g.rezultat[0],score_away:g.rezultat[1]}
 })
 return {appearances,goals,warnings:z.opozorila.slice()}
}
export async function processFussballCardJob({db,competitionId,code,job}={}){
 requireProof(db&&typeof db.rpc==='function'&&id(competitionId)&&id(job?.match_id)&&hash(job.revision_sha256)&&hash(job.resolution_sha256),'complete scoped replay job required')
 const scope=parseFussballLeagueCode(code),e=job.envelope
 requireProof(scope.season===e?.season&&e.revisionSha256===job.revision_sha256,'job season/revision differs')
 validateFussballCardEnvelope(e) // Corrupt originals are fatal, never queued as vote disagreement.
 mappings(e,job.candidates)
 requireProof(job.resolutions&&typeof job.resolutions==='object'&&!Array.isArray(job.resolutions),'recipient map required')
 for(const [key,source]of Object.entries(job.resolutions)){
  const card=e.cards.find(c=>c.eventKey===key),p=e.roster.find(p=>p.sourceId===source)
  requireProof(card&&card.officialSourceId===null&&p&&p.side===card.side,'foreign or authoritative recipient override')
 }
 let report
 try{report=replayFussballCardEnvelope(e,job.resolutions)}catch(error){
  const deferred=await invoke(db,'defer_fussball_card_replay',{p_competition_id:competitionId,p_code:code,p_match_id:job.match_id,p_revision_sha:job.revision_sha256,p_resolution_sha:job.resolution_sha256,p_reason:String(error.message).slice(0,1000)})
  requireProof(deferred===true,'vote disagreement deferral not acknowledged')
  return {status:'HOLD',matchId:job.match_id,reason:'Recipient votes require review'}
 }
 const rows=buildFussballCardNativeRows({envelope:e,report,candidates:job.candidates,matchId:job.match_id})
 const receipt=await invoke(db,'apply_fussball_card_report',{p_competition_id:competitionId,p_code:code,p_match_id:job.match_id,p_revision_sha:job.revision_sha256,p_resolution_sha:job.resolution_sha256,p_nastopi:rows.appearances,p_goli:rows.goals,p_warnings:rows.warnings})
 requireProof(receipt?.applied===true&&receipt.match_id===job.match_id&&receipt.revision_sha256===job.revision_sha256&&receipt.resolution_sha256===job.resolution_sha256,'atomic apply receipt differs')
 return {status:'APPLIED',matchId:job.match_id}
}
export async function stageAndReplayFussballCardReport({db,competitionId,code,matchId,envelope,candidates}={}){
 requireProof(id(competitionId)&&id(matchId)&&parseFussballLeagueCode(code).season===envelope?.season,'exact report scope required')
 validateFussballCardEnvelope(envelope);mappings(envelope,candidates)
 const registration=await invoke(db,'register_fussball_card_report',{p_competition_id:competitionId,p_code:code,p_match_id:matchId,p_envelope:envelope,p_candidates:candidates})
 requireProof(registration?.match_id===matchId&&registration.revision_sha256===envelope.revisionSha256&&typeof registration.statistics_pending==='boolean','source registration receipt differs')
 const jobs=await invoke(db,'get_fussball_card_replay_jobs',{p_competition_id:competitionId,p_code:code,p_limit:1,p_match_id:matchId})
 requireProof(Array.isArray(jobs)&&jobs.length<=1&&jobs.every(j=>j.match_id===matchId&&j.revision_sha256===envelope.revisionSha256),'exact registered replay job differs')
 if(jobs.length)return processFussballCardJob({db,competitionId,code,job:jobs[0]})
 if(registration.statistics_pending)return {status:'PENDING',matchId}
 requireProof(registration.unchanged===true,'new complete report did not queue its initial atomic write')
 return {status:'UNCHANGED',matchId}
}
