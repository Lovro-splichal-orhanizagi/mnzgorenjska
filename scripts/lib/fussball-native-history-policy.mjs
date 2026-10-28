// Outside the immutable V6 producer closure. No caller catalog grants authority.
import {readFileSync} from 'node:fs'
export const BADEN_HISTORY_ID='de-fussball-baden-mixed-history-v1'
export const BADEN_CURRENT='03188V27L800000JVS5489BTVU7GTVLE-G:2026/27'
export const BADEN_ARCHIVE='02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26'
export const BADEN_SLUG='de-verbandsliga-baden'
export const BADEN_CARDS='fussball-community-cards-v1'
export const badenCanonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x)
export const badenClubKey=(sourceCompetitionId,season,name)=>badenCanonical({sourceCompetitionId,season,name})
export const exactBadenHistory=p=>p?.id===BADEN_HISTORY_ID&&p.provider==='fussball-public'&&p.competitionSlug===BADEN_SLUG&&p.sourcePolicy===BADEN_CARDS&&p.sourceLeagueCode===BADEN_CURRENT&&p.season==='2026/27'
/** Deterministic projection only. Its caller must authenticate the fixed catalog
 * and original source; this public pure function cannot grant a capability. */
export function projectBadenHistoricalPolicy(c){
 if(c?.status!=='FINALIZED'||c.approval?.reference!=='call_e8c944e47b7c42a38afa4f08fda48c23'||c.seasons?.length!==2)throw Error('Baden history: finalized reviewed catalog required')
 return {id:BADEN_HISTORY_ID,provider:'fussball-public',competitionSlug:BADEN_SLUG,sourcePolicy:BADEN_CARDS,sourceLeagueCode:BADEN_CURRENT,season:'2026/27',approvalReference:c.approval.reference,permissionTimestamp:c.approval.permissionTimestamp,entries:c.seasons.flatMap(s=>s.reviews.map(e=>({
  sourceMatchId:e.fixture.id,sourceCompetitionId:e.sourceCompetitionId,season:e.season,sourcePhase:null,sourceRound:e.fixture.krog,playedOn:e.fixture.datum,
  homeSourceClubId:badenClubKey(e.sourceCompetitionId,e.season,e.fixture.domaci),awaySourceClubId:badenClubKey(e.sourceCompetitionId,e.season,e.fixture.gostje),sourceUrl:e.fixture.url,
  rawSha256:e.sourceRawSha256,observedHomeScore:e.fixture.rezultat?.domaci??null,observedAwayScore:e.fixture.rezultat?.gostje??null,reasonCode:e.defect.kind,
  ...(e.fixture.administrativeResult?.marker==='W'?{sourceTime:e.fixture.ura}:{}),resultKnown:e.resultKnown,retainedBundleSha256:e.retainedBundleSha256,defect:e.defect,documents:e.documents,observedFontIds:e.observedFontIds,missingObservedFonts:e.missingObservedFonts,administrativeResult:e.fixture.administrativeResult??null,approvalReference:e.approvalReference
 })))}
}
const compiled=JSON.parse(readFileSync(new URL('../policies/fussball-baden-native-composition.json',import.meta.url)))
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
const compiledPolicy=compiled.status==='FINALIZED'?freeze(projectBadenHistoricalPolicy(compiled)):null
export function compiledBadenHistoricalPolicy(){return compiledPolicy}
