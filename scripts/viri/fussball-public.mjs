// Native import from an explicitly supplied, complete original-byte capture.
// Public source collection is handled separately, without database credentials.
import {loadFussballImportCapture,parseFussballLeagueCode} from '../fussball-import.mjs'

import {GERMANY_BULK_CANDIDATES,validateGermanyCandidate} from '../bulk-germany-source.mjs'
import {isFussballCommunityCompetition,isFussballCommunityCandidate,FUSSBALL_COMMUNITY_CARD_POLICY,FUSSBALL_COMMUNITY_SOURCE_POLICY} from '../fussball-community-policy.mjs'

const requireProof=(ok,reason)=>{if(!ok)throw Error(`fussball public: ${reason}`)}
const clubText=name=>String(name??'').normalize('NFC').replace(/\s+/g,' ').trim()
const clubKey=name=>clubText(name).toLocaleLowerCase('de').replace(/[^\p{L}\p{N}]+/gu,' ').trim()

export async function reserveFussballIdentities(db,identities){
 requireProof(db&&typeof db.rpc==='function','report import requires the writer database client')
 const expected=new Map(identities.map(i=>[i.source_id,i.reg_st]))
 requireProof(expected.size===identities.length&&expected.size>0,'invalid identity reservation batch')
 const {data,error}=await db.rpc('fussball_reserve_player_ids',{p_source_ids:[...expected.keys()]})
 requireProof(!error,`identity reservation failed: ${error?.message??''}`)
 requireProof(Array.isArray(data)&&data.length===expected.size,'identity reservation returned incomplete mapping')
 const seen=new Set()
 for(const row of data){
  requireProof(typeof row?.source_id==='string'&&!seen.has(row.source_id)&&Number.isSafeInteger(row.reg_st)&&expected.get(row.source_id)===row.reg_st,'identity reservation differs from published IDs')
  seen.add(row.source_id)
 }
}

export function reviewedFussballCommunityCompetition(competition){
 const community=isFussballCommunityCompetition(competition)
 const candidates=GERMANY_BULK_CANDIDATES.filter(c=>c.slug===competition?.slug&&c.source===competition?.source&&c.country_code===competition?.country_code&&c.source_league_code===competition?.source_league_code)
 const reviewed=candidates.length===1?candidates[0]:null
 requireProof(community?isFussballCommunityCandidate(reviewed):competition?.source_policy==null&&!isFussballCommunityCandidate(reviewed),'competition card policy differs from reviewed tuple')
 if(community)validateGermanyCandidate(reviewed)
 return community?reviewed:null
}
export async function assertFussballCommunityScope(db,competition,code){
 const reviewed=reviewedFussballCommunityCompetition(competition)
 if(!reviewed)return
 requireProof(db&&typeof db.rpc==='function'&&Number.isSafeInteger(competition.id)&&competition.id>0,'installed card policy requires native database scope')
 const {data,error}=await db.rpc('get_fussball_card_policy',{p_competition_id:competition.id})
 const archives=reviewed.archives.map(a=>a.code)
 requireProof(!error&&data?.installed===true&&data.enabled===true&&data.source_policy===FUSSBALL_COMMUNITY_SOURCE_POLICY&&data.current_code===competition.source_league_code&&Array.isArray(data.archive_codes)&&JSON.stringify([...data.archive_codes].sort())===JSON.stringify([...archives].sort())&&(code===data.current_code||data.archive_codes.includes(code)),'exact installed enabled card policy scope required')
}

export function createFussballPublicSource({competition,db,directory=process.env.SLFF_FUSSBALL_CAPTURE,archiveCode=process.env.SLFF_FUSSBALL_ARCHIVE_CODE,loadCapture=loadFussballImportCapture}={}){
 requireProof(competition?.source==='fussball-public'&&Number.isSafeInteger(competition.country_id)&&competition.country_id>0&&competition.country_code==='DE'&&/^de-/.test(competition.slug??''),'invalid competition/provider/policy scope')
 const community=reviewedFussballCommunityCompetition(competition),cardPolicy=community?FUSSBALL_COMMUNITY_CARD_POLICY:undefined
 const currentScope=parseFussballLeagueCode(competition.source_league_code)
 if(archiveCode){const archive=parseFussballLeagueCode(archiveCode);requireProof(+archive.season.slice(0,4)===+currentScope.season.slice(0,4)-1,'archive must be the explicitly bound previous season')}
 let loaded=null,reservation=null,boundCode=null
 const appearances=new WeakMap()
 const getBatch=async code=>{
  const scope=parseFussballLeagueCode(code),current=code===competition.source_league_code
  requireProof(current||code===archiveCode,'archive/season scope is not explicitly configured')
  requireProof(typeof directory==='string'&&directory.length>0,'SLFF_FUSSBALL_CAPTURE must identify a complete capture directory')
  requireProof(boundCode===null||boundCode===code,'one source instance cannot mix capture seasons')
  boundCode=code
  loaded??=(async()=>{await assertFussballCommunityScope(db,competition,code);return loadCapture(directory,{...scope,current,...(cardPolicy?{cardPolicy}:{})})})()
  const batch=await loaded
  requireProof(batch.provider==='fussball-public'&&batch.staffel===scope.staffel&&batch.season===scope.season&&batch.activationEligible===false&&batch.cardPolicy===cardPolicy&&(!community?!(batch.pendingReports?.length):Array.isArray(batch.pendingReports)&&Array.isArray(batch.cardEnvelopes)),'capture batch scope differs')
  return batch
 }
 return {
  ime:'fussball-public',polnoIme:'FUSSBALL.DE — public match reports',drzava:'DE',
  osnovniNaslov:'https://www.fussball.de',imaRegistracije:true,razporedBrezUvodnegaPrenosa:true,premorMs:6000,
  kljucKluba:clubKey,poenostavi:clubKey,kratkoIme:clubText,
  naslovRazporeda(code){return 'https://www.fussball.de/spieltag/-/staffel/'+parseFussballLeagueCode(code).staffel},
  async razporedVseStrani(code){return structuredClone((await getBatch(code)).schedule)},
  async zapisniki(code){
   const batch=await getBatch(code)
   reservation??=reserveFussballIdentities(db,batch.identities)
   await reservation
   return [...batch.reports,...(batch.pendingReports??[])].map(report=>{
    const z=structuredClone(report.z)
    if(report.statisticsPending!==true)appearances.set(z,structuredClone(report.nastopi))
    return {id:report.id,url:report.url,z,...(report.cardEnvelope?{cardEnvelope:structuredClone(report.cardEnvelope)}:{}),...(report.statisticsPending===true?{statisticsPending:true}:{})}
   })
  },
  nastopi(z){
   requireProof(appearances.has(z),'appearance statistics require this source instance’s bound report identity')
   return structuredClone(appearances.get(z))
  },
 }
}
