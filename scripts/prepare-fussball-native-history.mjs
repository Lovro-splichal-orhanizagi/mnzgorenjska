// Task 2 only: inactive COLD pre-import registration and atomic preparation.
// This capability deliberately holds after any imports or activation. Task 3
// runtime authority must be a separate source/catalog/native installed context.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {getFussballNativeComposition,reauthenticateFussballNativeComposition,validateFussballNativeCatalog} from './fussball-native-composition.mjs'
import {BADEN_CURRENT,BADEN_ARCHIVE,BADEN_SLUG,BADEN_CARDS,badenCanonical,projectBadenHistoricalPolicy,badenClubKey} from './lib/fussball-native-history-policy.mjs'
const catalog=JSON.parse(readFileSync(new URL('./policies/fussball-baden-native-composition.json',import.meta.url)))
const candidate=JSON.parse(readFileSync(new URL('./policies/de-bulk-candidates.json',import.meta.url))).candidates.find(c=>c.slug===BADEN_SLUG)
const receipts=new WeakMap(),sha=v=>createHash('sha256').update(typeof v==='string'?v:badenCanonical(v)).digest('hex')
const need=(ok,m)=>{if(!ok)throw Object.assign(Error('Baden preparation: '+m),{dataHold:true,reason_code:'FUSSBALL_NATIVE_PREPARATION_HOLD'})}
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
function manifest(proof){
 const {pack}=getFussballNativeComposition(proof);validateFussballNativeCatalog(catalog)
 const policy=projectBadenHistoricalPolicy(catalog),fixtures=pack.seasons.flatMap(s=>s.fixtures.map(f=>({sourceCompetitionId:s.code,season:s.season,sourceMatchId:f.id,reportId:f.zapisnikId,sourceUrl:f.url,round:f.krog,date:f.datum,time:f.ura,homeName:f.domaci,awayName:f.gostje,homeSourceClubId:badenClubKey(s.code,s.season,f.domaci),awaySourceClubId:badenClubKey(s.code,s.season,f.gostje),score:f.rezultat,administrativeResult:f.administrativeResult??null,unavailable:s.unavailable.some(e=>e.sourceMatchId===f.id)})))
 const rounds=[...new Set(fixtures.filter(f=>f.season==='2026/27'&&f.date===pack.firstFantasyPlayedOn).map(f=>f.round))]
 need(rounds.length===1,'unique authenticated opening round required')
 const opening=fixtures.filter(f=>f.season==='2026/27'&&f.round===rounds[0])
 need(opening.length>0&&opening.every(f=>f.score===null&&f.administrativeResult===null&&f.date>=pack.firstFantasyPlayedOn),'opening must be a wholly unplayed source round')
 return {version:1,kind:'baden-atomic-history-cards-preparation',slug:BADEN_SLUG,currentCode:BADEN_CURRENT,archiveCode:BADEN_ARCHIVE,catalogSha256:pack.catalogSha256,derivedPackSha256:pack.derivedPackSha256,sourceCertificateSha256:pack.sourceCertificateSha256,currentFreshUntil:pack.currentFreshUntil,firstFantasyPlayedOn:pack.firstFantasyPlayedOn,openingRound:rounds[0],deadlineOffsetHours:candidate.registration.rok_pomak_ur,policy,fixtures}
}
function readback(v,m,id){
 need(v?.prepared===true&&v.competitionId===id&&v.active===false&&v.noUsers===true&&v.sourcePolicy===BADEN_CARDS,'actual inactive no-user prepared readback required')
 need(isDeepStrictEqual(v.coldState,{playerCount:0,importedMatchCount:0,appearanceCount:0,goalCount:0,playerScoreCount:0,roundPointsCount:0}),'cold pre-import preparation requires no players/imported matches/individual statistics or points')
 need(v.firstFantasyPlayedOn===m.firstFantasyPlayedOn&&Number.isSafeInteger(v.openingRoundId)&&v.openingRoundId>0&&v.policySha256===sha(m.policy),'policy/cutoff/opening binding differs')
 need(Array.isArray(v.bindings)&&Array.isArray(v.history?.markers),'complete native binding and marker arrays required')
 need(v.manifestSha256===sha(m)&&v.bindingSha256===sha(v.bindings)&&v.markerInventorySha256===sha(v.history.markers),'full native inventory digest differs')
 need(v.cards?.installed===true&&v.cards.enabled===true&&v.cards.current_code===BADEN_CURRENT&&isDeepStrictEqual(v.cards.archive_codes,[BADEN_ARCHIVE])&&v.cards.source_policy===BADEN_CARDS,'complete community policy readback required')
 need(v.history?.installed===true&&v.history.policyId===m.policy.id&&v.history.policySha256===v.policySha256&&v.history.firstFantasyPlayedOn===m.firstFantasyPlayedOn,'complete immutable history readback required')
 need(Array.isArray(v.bindings)&&v.bindings.length===m.fixtures.length&&Array.isArray(v.history.markers)&&v.history.markers.length===m.policy.entries.length,'full exact native inventory required')
 need(v.bindings.some(b=>b.fixture?.season==='2026/27'&&b.fixture.round===m.openingRound&&b.roundId===v.openingRoundId),'opening round must be an actual full source/native binding')
 const ids=new Set(),sources=new Set(),marked=new Set()
 for(const b of v.bindings){const f=m.fixtures.find(f=>f.sourceMatchId===b.sourceMatchId&&f.sourceCompetitionId===b.sourceCompetitionId)
  const sourceKey=b.sourceCompetitionId+':'+b.sourceMatchId
  need(f&&!sources.has(sourceKey)&&isDeepStrictEqual(b.fixture,f)&&!ids.has(b.matchId)&&['matchId','roundId','homeTeamId','awayTeamId'].every(k=>Number.isSafeInteger(b[k])&&b[k]>0)&&b.homeTeamId!==b.awayTeamId,'unique full-tuple native binding differs');ids.add(b.matchId);sources.add(sourceKey)
 }
 for(const k of v.history.markers){const e=m.policy.entries.find(e=>e.sourceMatchId===k.sourceMatchId),b=v.bindings.find(b=>b.sourceMatchId===k.sourceMatchId)
  need(e&&b&&!marked.has(k.sourceMatchId)&&k.reportId===`de-fussball-${e.sourceMatchId}`&&k.rawSha256===e.rawSha256&&k.policyId===m.policy.id&&k.policySha256===v.policySha256&&k.statisticsStatus==='unavailable_historical'&&k.importedAt===null&&k.individualRowCount===0&&k.voteCount===0,'unavailable marker identity or empty-statistics invariant differs')
  const {rawSha256,reasonCode,...fixture}=e;need(isDeepStrictEqual(k.fixture,fixture)&&['matchId','roundId','homeTeamId','awayTeamId'].every(key=>k[key]===b[key]),'marker full-tuple binding differs');marked.add(k.sourceMatchId)
 }
 return structuredClone(v)
}
/** Canonical review DATA from an already issued private capability. The manifest
 * getter enforces issuer identity and original freshness; this does not refresh
 * hosted metadata or authorize registration, installation or import. */
export function describeIssuedFussballNativePreparation(composition){
 const m=manifest(composition),body=badenCanonical(m)
 return freeze({manifest:body,sha256:sha(body),catalogStatus:'FINALIZED',nativeImportEligible:false,activationEligible:false})
}
/** Review material after full asynchronous source/composition reauthentication.
 * These returned bytes never authorize a registration, installation or import. */
export async function describeFussballNativePreparation(composition){
 getFussballNativeComposition(composition)
 const authenticated=await reauthenticateFussballNativeComposition(composition)
 return describeIssuedFussballNativePreparation(authenticated)
}
/** Requires a private actual completed-source/hosted-composition capability before
 * even find/register. No preparation capability is required to cold-register. */
export async function prepareFussballNativeHistory({composition,transport}){
 getFussballNativeComposition(composition)
 const authenticated=await reauthenticateFussballNativeComposition(composition),m=manifest(authenticated)
 need(transport&&['find','register','prepareFussballHistory','readFussballHistory'].every(k=>typeof transport[k]==='function'),'native preparation transport required')
 let c=await transport.find(candidate)
 if(c)need(c.active===false&&c.source==='fussball-public'&&c.slug===BADEN_SLUG&&c.source_league_code===BADEN_CURRENT,'exact inactive native registration required')
 const id=c?.id??await transport.register(candidate);need(Number.isSafeInteger(id)&&id>0,'actual registered competition ID required')
 const body=badenCanonical(m),prepared=readback(await transport.prepareFussballHistory({manifest:body,sha256:sha(body)}),m,id)
 const again=await reauthenticateFussballNativeComposition(authenticated);need(isDeepStrictEqual(manifest(again),m),'source/catalog changed during preparation')
 const observed=readback(await transport.readFussballHistory(id),m,id);need(isDeepStrictEqual(observed,prepared),'native preparation changed after commit')
 const receipt=freeze({version:1,kind:'baden-native-history-cards-prepared',competitionId:id,bindingSha256:observed.bindingSha256,policySha256:observed.policySha256,markerInventorySha256:observed.markerInventorySha256,firstFantasyPlayedOn:observed.firstFantasyPlayedOn,openingRoundId:observed.openingRoundId,manifestSha256:observed.manifestSha256,nativeImportEligible:false,activationEligible:false,actualReady:false})
 receipts.set(receipt,{composition:again,transport,manifest:m,readback:observed});return receipt
}
export function getFussballNativePreparation(receipt){const s=receipts.get(receipt);need(s,'issuer-issued native preparation capability required');getFussballNativeComposition(s.composition);return {receipt,composition:s.composition,manifest:structuredClone(s.manifest),readback:structuredClone(s.readback)}}
/** Revalidate only before the first import. Import/runtime/active-nightly phases
 * need their own authenticated installed context; no phase flag bypasses cold. */
export async function reauthenticateFussballNativePreparation(receipt){const s=receipts.get(receipt);need(s,'issuer-issued native preparation capability required');const p=await reauthenticateFussballNativeComposition(s.composition);need(isDeepStrictEqual(manifest(p),s.manifest),'source/catalog changed');const v=readback(await s.transport.readFussballHistory(receipt.competitionId),s.manifest,receipt.competitionId);need(isDeepStrictEqual(v,s.readback),'native preparation drift');return getFussballNativePreparation(receipt)}
