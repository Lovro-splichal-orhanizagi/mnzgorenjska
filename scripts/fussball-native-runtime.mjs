// Installed Baden history orchestration. The immutable source collector stays
// strict and unchanged; only this private prepared capability can omit a report.
import {createHash} from 'node:crypto'
import {isDeepStrictEqual as same} from 'node:util'
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,lstatSync} from 'node:fs'
import {join} from 'node:path'
import {reauthenticateFussballNativePreparation} from './prepare-fussball-native-history.mjs'
import {getFussballNativeComposition,reauthenticateFussballNativeComposition,validateFussballNativeCatalog} from './fussball-native-composition.mjs'
import {getFussballCompletedSourceV7} from './fussball-completed-source-v7.mjs'
import {createFussballParserSession,assembleFussballSchedule,validateFussballFixture} from './fussball-season.mjs'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'
import {normalizeFussballReport,parseFussballLeagueCode,fussballPlayerKey} from './fussball-import.mjs'
import {validateFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'
import {BADEN_CURRENT,BADEN_ARCHIVE,BADEN_SLUG,BADEN_CARDS,badenCanonical,badenClubKey,compiledBadenHistoricalPolicy} from './lib/fussball-native-history-policy.mjs'
const contexts=new WeakMap(),sha=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:badenCanonical(v)).digest('hex')
const catalogBytes=readFileSync(new URL('./policies/fussball-baden-native-composition.json',import.meta.url)),catalog=JSON.parse(catalogBytes)
const need=(ok,m)=>{if(!ok)throw Object.assign(Error('Baden runtime: '+m),{dataHold:true,reason_code:'FUSSBALL_NATIVE_RUNTIME_HOLD'})}
export const isBadenNativeCompetition=c=>c?.slug===BADEN_SLUG&&c.source==='fussball-public'&&c.source_league_code===BADEN_CURRENT&&c.source_policy===BADEN_CARDS&&c.country_code==='DE'
function tuple(c,id){need(isBadenNativeCompetition(c)&&c.id===id&&Number.isSafeInteger(c.country_id)&&c.country_id>0,'exact prepared native competition required')}
/** Only Task 2's issuer, after its source AND complete native readback, grants
 * this context. Plain RPC results and serialized cache summaries never do. */
async function readBound(db,competition){
 need(db&&typeof db.rpc==='function','actual installed runtime database reader required')
 const {data,error}=await db.rpc('get_fussball_historical_runtime',{p_competition_id:competition.id})
 need(!error&&data?.kind==='baden-bound-installed-runtime'&&data.competitionId===competition.id,'combined installed history/cards runtime getter failed')
 return data
}
function validateBound(competition,v,pack){
 tuple(competition,v.competitionId);validateFussballNativeCatalog(catalog)
 const policy=compiledBadenHistoricalPolicy(),m=v.manifest,{derivedPackSha256,...body}=pack
 need(policy&&same(m?.policy,policy)&&v.manifestSha256===sha(m)&&pack.catalogSha256===sha(catalogBytes)&&sha(body)===derivedPackSha256&&derivedPackSha256===m.derivedPackSha256&&pack.sourceCertificateSha256===m.sourceCertificateSha256,'compiled catalog/source/prepared manifest differs')
 need(m.slug===BADEN_SLUG&&m.currentCode===BADEN_CURRENT&&m.archiveCode===BADEN_ARCHIVE&&m.firstFantasyPlayedOn===pack.firstFantasyPlayedOn&&v.firstFantasyPlayedOn===m.firstFantasyPlayedOn&&v.registrationEligible===false&&v.activationEligible===false,'runtime purpose/cutoff differs')
 need(Array.isArray(v.bindings)&&v.bindingSha256===sha(v.bindings)&&Array.isArray(v.history?.markers)&&v.markerInventorySha256===sha(v.history.markers)&&v.policySha256===sha(policy)&&v.history.installed===true&&v.history.policySha256===v.policySha256&&v.history.firstFantasyPlayedOn===v.firstFantasyPlayedOn,'complete installed marker inventory/hash required')
 need(v.cards?.installed===true&&v.cards.enabled===true&&v.cards.source_policy===BADEN_CARDS&&v.cards.current_code===BADEN_CURRENT&&same(v.cards.archive_codes,[BADEN_ARCHIVE]),'complete installed community binding required')
 const fixtures=pack.seasons.flatMap(s=>s.fixtures.map(f=>({sourceCompetitionId:s.code,season:s.season,sourceMatchId:f.id,reportId:f.zapisnikId,sourceUrl:f.url,round:f.krog,date:f.datum,time:f.ura,homeName:f.domaci,awayName:f.gostje,homeSourceClubId:badenClubKey(s.code,s.season,f.domaci),awaySourceClubId:badenClubKey(s.code,s.season,f.gostje),score:f.rezultat,administrativeResult:f.administrativeResult??null,unavailable:s.unavailable.some(e=>e.sourceMatchId===f.id)})))
 need(same(fixtures,m.fixtures)&&v.bindings.length===fixtures.length&&new Set(v.bindings.map(b=>b.matchId)).size===fixtures.length,'complete unique native fixture inventory required')
 const seen=new Set()
 for(const b of v.bindings){const f=fixtures.find(f=>f.sourceCompetitionId===b.sourceCompetitionId&&f.sourceMatchId===b.sourceMatchId),key=b.sourceCompetitionId+':'+b.sourceMatchId;need(f&&!seen.has(key)&&same(f,b.fixture)&&['matchId','roundId','homeTeamId','awayTeamId'].every(k=>Number.isSafeInteger(b[k])&&b[k]>0)&&b.homeTeamId!==b.awayTeamId,'full source/native binding differs');seen.add(key)}
 need(v.history.markers.length===policy.entries.length,'complete policy marker set required')
 const markers=new Set()
 for(const k of v.history.markers){const e=policy.entries.find(e=>e.sourceMatchId===k.sourceMatchId),b=v.bindings.find(b=>b.sourceMatchId===k.sourceMatchId),{rawSha256,reasonCode,...fixture}=e??{};need(e&&b&&!markers.has(k.sourceMatchId)&&same(k.fixture,fixture)&&k.rawSha256===rawSha256&&k.reportId===b.fixture.reportId&&k.policyId===policy.id&&k.policySha256===v.policySha256&&k.statisticsStatus==='unavailable_historical'&&k.importedAt===null&&k.individualRowCount===0&&k.voteCount===0&&['matchId','roundId','homeTeamId','awayTeamId'].every(key=>k[key]===b[key]),'immutable unavailable marker/empty individual/card binding differs');markers.add(k.sourceMatchId)}
}
function issue(competition,db,v,pack,extra={}){
 validateBound(competition,v,pack)
 const receipt={kind:'baden-bound-installed-runtime',competitionId:v.competitionId,manifestSha256:v.manifestSha256,bindingSha256:v.bindingSha256,policySha256:v.policySha256,markerInventorySha256:v.markerInventorySha256,registrationEligible:false,activationEligible:false}
 const state={receipt,manifest:structuredClone(v.manifest),readback:structuredClone(v)}
 const token=Object.freeze({kind:'baden-installed-runtime-context',competitionId:competition.id})
 contexts.set(token,{competition:{...competition},db,state,pack:structuredClone(pack),...extra})
 return {competition:{...competition,firstFantasyPlayedOn:state.readback.firstFantasyPlayedOn,communityCardBinding:structuredClone(state.readback.cards),fussballHistoricalContext:token},installedHistoricalMarkers:token}
}
export async function loadFussballNativeImportContext({competition,preparation,composition,db}={}){
 // A COLD receipt is consumed once here; later imports use the distinct read-only
 // bound RPC. Active durable loads use the authenticated seed path below.
 if(preparation)composition=(await reauthenticateFussballNativePreparation(preparation)).composition
 need(composition,'fresh private hosted composition required for initial import')
 composition=await reauthenticateFussballNativeComposition(composition)
 const {pack,sourceProof}=getFussballNativeComposition(composition),v=await readBound(db,competition)
 return issue(competition,db,v,pack,{composition,sourceProof})
}
function privateContext(context,competition){
 const s=contexts.get(context);need(s,'private prepared runtime context required')
 if(s.composition)getFussballNativeComposition(s.composition)
 tuple(competition??s.competition,s.state.receipt.competitionId)
 return s
}
export function getFussballNativeRuntimeContext(context,competition){
 const s=privateContext(context,competition)
 const {originals,...view}=s
 return {...view,competition:{...s.competition},state:{...s.state,receipt:structuredClone(s.state.receipt),manifest:structuredClone(s.state.manifest),readback:structuredClone(s.state.readback)},pack:structuredClone(s.pack)}
}
export async function reauthenticateFussballNativeRuntimeContext(context,competition){
 const s=privateContext(context,competition),observed=await readBound(s.db,competition??s.competition)
 validateBound(competition??s.competition,observed,s.pack)
 need(same(observed.manifest,s.state.manifest)&&['bindings','history','cards','bindingSha256','policySha256','markerInventorySha256'].every(k=>same(observed[k],s.state.readback[k])),'installed history/cards/native bindings drift')
 s.state.readback.active=observed.active
 return getFussballNativeRuntimeContext(context,competition)
}
function markerFor(s,code,f){
 const matches=s.state.readback.history.markers.filter(m=>m.sourceMatchId===f.id)
 need(matches.length<=1,'duplicate installed marker')
 if(!matches.length)return null
 const marker=matches[0],binding=s.state.readback.bindings.find(b=>b.sourceMatchId===f.id&&b.sourceCompetitionId===code)
 const original=s.pack.seasons.find(x=>x.code===code)?.fixtures.find(x=>x.id===f.id)
 need(binding&&original&&same(original,f)&&marker.fixture.sourceCompetitionId===code&&marker.reportId===f.zapisnikId&&['matchId','roundId','homeTeamId','awayTeamId'].every(k=>marker[k]===binding[k]),'immutable marker full source/native header drift')
 return structuredClone(marker)
}
export function bindFussballHistoricalSchedule(context,competition,code,schedule){
 const s=privateContext(context,competition),season=s.pack.seasons.find(x=>x.code===code)
 need(season&&Array.isArray(schedule),'complete bound seasonal schedule required')
 const seen=new Set(),expected=new Set(season.fixtures.map(f=>f.id)),marked=new Set()
 const out=structuredClone(schedule)
 for(const round of out){need(Number.isInteger(round.stevilka)&&Array.isArray(round.tekme),'invalid schedule round')
  for(const f of round.tekme){
   validateFussballFixture(f,{round:round.stevilka});need(expected.has(f.id)&&!seen.has(f.id),'missing/extra/duplicate source fixture inventory');seen.add(f.id)
   need(!Object.hasOwn(f,'historicalMarker'),'caller schedule cannot supply historical marker authority')
   // Native presentation fields are not part of the original source header.
   const {izid,odigrana,kontumacija,...header}=f,marker=markerFor(s,code,header)
   if(marker){f.historicalMarker=marker;marked.add(f.id)}
   else need(!Object.hasOwn(f,'administrativeResult'),'unreviewed administrative result')
  }
 }
 need(seen.size===expected.size&&season.fixtures.every(f=>seen.has(f.id)),'complete fresh fixture inventory required')
 const markers=s.state.readback.history.markers.filter(m=>m.fixture.sourceCompetitionId===code)
 need(markers.every(m=>marked.has(m.sourceMatchId))&&marked.size===markers.length,'complete installed marker inventory required')
 return out
}
const nativeSchedule=season=>[...new Set(season.fixtures.map(f=>f.krog))].sort((a,b)=>a-b).map(stevilka=>({stevilka,tekme:season.fixtures.filter(f=>f.krog===stevilka).map(f=>({...structuredClone(f),izid:f.rezultat?[f.rezultat.domaci,f.rezultat.gostje]:null,odigrana:f.rezultat!==null,kontumacija:false}))}))
function originalSeason(s,code){
 const source=s.pack.seasons.find(x=>x.code===code),originals=s.originals??getFussballCompletedSourceV7(s.sourceProof).originals.stages
 const stage=originals[source?.inventory.scope.stage],candidate=GERMANY_BULK_CANDIDATES.find(c=>c.slug===BADEN_SLUG)
 const reviewed=code===candidate?.source_league_code?candidate:candidate?.archives.find(a=>a.code===code)
 need(source&&stage&&reviewed&&stage.result.scope.staffel+':'+stage.result.scope.season===code&&stage.result.scope.seedUrl===reviewed.seedUrl&&stage.manifest.options.seedUrl===reviewed.seedUrl,'authenticated canonical seasonal seed required')
 return stage
}
/** Native factory gate occurs AFTER registration/preparation, exactly once per
 * source instance. The source-only bulk profile cannot register itself. */
export async function loadPreparedFussballNativePack({competition,context,preparation,composition,db}={}){
 if(!context)context=(await loadFussballNativeImportContext({competition,preparation,composition,db})).installedHistoricalMarkers
 const s=await reauthenticateFussballNativeRuntimeContext(context,competition)
 need(s.state.readback.active===false&&s.composition,'inactive bulk import requires fresh private hosted composition')
 getFussballNativeComposition(s.composition)
 const {GERMANY_BULK_CANDIDATES}=await import('./bulk-germany-source.mjs')
 const candidate=GERMANY_BULK_CANDIDATES.find(c=>c.slug===BADEN_SLUG)
 need(candidate&&candidate.source_league_code===competition.source_league_code,'reviewed candidate required')
 return {...structuredClone(s.pack),candidate:structuredClone(candidate),fussballHistoricalContext:context,seasons:s.pack.seasons.map(season=>({...structuredClone(season),schedule:bindFussballHistoricalSchedule(context,competition,season.code,nativeSchedule(season))}))}
}
function pending(entry,f,season,identities){
 const e=entry.result.cardEnvelope,r=validateFussballCardEnvelope(e).result,z=r.z
 need(same(entry.result,r)&&r.statisticsPending===true&&r.reportStatistikaPripravljena===false&&!Object.hasOwn(r,'nastopi')&&!Object.hasOwn(z,'goli'),'ordinary typed pending envelope differs')
 const teams=[z.domaci,z.gostje].map(t=>({...structuredClone(t),postava:t.postava.map(p=>({...structuredClone(p),regSt:fussballPlayerKey(p.virId)})),rezerve:t.rezerve.map(p=>({...structuredClone(p),regSt:fussballPlayerKey(p.virId)}))}))
 for(const p of e.roster){const id=fussballPlayerKey(p.sourceId);need(!identities.has(id)||identities.get(id)===p.sourceId,'identity collision');identities.set(id,p.sourceId)}
 return {id:f.zapisnikId,url:f.url,statisticsPending:true,cardEnvelope:structuredClone(e),z:{zapisnikId:f.zapisnikId,sezona:season,datum:z.datum,ura:z.ura,krog:z.krog,domaci:teams[0],gostje:teams[1],rezultat:structuredClone(z.rezultat),nepopoln:true,opozorila:['SLFF_FUSSBALL_CARDS_PENDING_V1']}}
}
/** Fresh full round pages are always fetched. The marker decision precedes the
 * first report GET, strict report parse, card envelope and individual derivation.
 * No injected parser or caller skip-ID list is accepted in production. */
export async function collectFussballNativeRuntime({context,competition,code,client,asOfDate}={}){
 await reauthenticateFussballNativeRuntimeContext(context,competition)
 const s=privateContext(context,competition),scope=parseFussballLeagueCode(code)
 need(s.pack.seasons.some(x=>x.code===code)&&client&&typeof client.read==='function','bound source client/season required')
 need(/^20\d\d-\d\d-\d\d$/.test(asOfDate??''),'explicit as-of date required')
 const session=createFussballParserSession((url,kind)=>client.read(url,kind),{},{cardPolicy:'community-v1',season:scope.season})
 const seedUrl=originalSeason(s,code).result.scope.seedUrl,pages=[]
 async function page(url){const document=await client.read(url,'round');need(document?.bytes&&Number.isFinite(Date.parse(document.capturedAt)),'source round receipt required');const {info,parsed}=await session.round(new TextDecoder('utf8',{fatal:true}).decode(document.bytes),{staffel:scope.staffel,url});need(typeof info.url==='string'&&new RegExp('^https://www\\.fussball\\.de/spieltag/(?:[a-z0-9]+(?:-[a-z0-9]+)*/)?-/(?:spieltag/[1-9]\\d{0,2}/)?staffel/'+scope.staffel+'$').test(info.url),'round canonical source identity differs');pages.push({url,parsed});return parsed}
 const seed=await page(seedUrl)
 need(Array.isArray(seed.krogi)&&seed.krogi.length>0&&seed.krogi.length<=80,'bounded full source selector required')
 for(const item of seed.krogi)if(item.krog!==seed.krog)await page(item.url)
 const full=assembleFussballSchedule(pages,scope)
 const schedule=bindFussballHistoricalSchedule(context,competition,code,nativeSchedule(full)),reports=[],pendingReports=[],identities=new Map(),cardEnvelopes=[]
 for(const round of schedule)for(const row of round.tekme){
  if(row.historicalMarker)continue
  if(row.rezultat===null){need(row.datum>=asOfDate,'past unplayed fixture without immutable review');continue}
  const {historicalMarker,izid,odigrana,kontumacija,...f}=row,entry=await session.report(f),e=entry.result.cardEnvelope
  need(e&&same(validateFussballCardEnvelope(e).result,entry.result)&&e.matchId===f.id&&e.reportId===f.zapisnikId&&e.sourceUrl===f.url&&e.season===scope.season&&e.round===f.krog&&e.date===f.datum&&e.time===f.ura&&e.homeName===f.domaci&&e.awayName===f.gostje&&same(e.score,f.rezultat),'ordinary strict card/header envelope differs')
  if(entry.result.statisticsPending===true)pendingReports.push(pending(entry,f,scope.season,identities))
  else reports.push(normalizeFussballReport(entry,f,scope.season,identities))
  cardEnvelopes.push(structuredClone(e))
 }
 await reauthenticateFussballNativeRuntimeContext(context,competition)
 return {provider:'fussball-public',...scope,asOfDate,cardPolicy:'community-v1',reports,pendingReports,cardEnvelopes,schedule,identities:[...identities].map(([reg_st,source_id])=>({reg_st,source_id})),activationEligible:false}
}
function regular(root,path){need(typeof path==='string'&&!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(x=>x&&x!=='.'&&x!=='..'),'unsafe retained path');let current=root;need(lstatSync(current).isDirectory()&&!lstatSync(current).isSymbolicLink(),'regular retained directory required');for(const part of path.split('/')){current=join(current,part);need(!lstatSync(current).isSymbolicLink(),'retained symlink refused')}need(lstatSync(current).isFile(),'retained original missing');return readFileSync(current)}
function seedState(s){
 const originals=s.originals??getFussballCompletedSourceV7(s.sourceProof).originals.stages
 const files=new Map()
 for(const [stage,value]of Object.entries(originals))for(const [path,bytes]of value.files)files.set(stage+'/'+path,Buffer.from(bytes))
 const seal={version:1,kind:'baden-prepared-originals-seed',receipt:s.state.receipt,manifest:s.state.manifest,readback:s.state.readback,pack:s.pack,source:s.pack.source,sourceCertificateSha256:s.pack.sourceCertificateSha256,derivedPackSha256:s.pack.derivedPackSha256,captured_at:s.pack.captured_at,currentFreshUntil:s.pack.currentFreshUntil,files:[...files].map(([path,b])=>({path,bytes:b.length,sha256:sha(b)})).sort((a,b)=>a.path.localeCompare(b.path))}
 return {files,seal}
}
/** Durable copies retain the original source clock and every byte, including
 * unavailable reports. A seed is evidence, never a replacement issuer. */
export async function seedFussballNativeRuntime({context,competition,directory}={}){
 await reauthenticateFussballNativeRuntimeContext(context,competition)
 const s=privateContext(context,competition),{files,seal}=seedState(s)
 mkdirSync(directory);for(const [path,bytes]of files){const target=join(directory,path);mkdirSync(join(target,'..'),{recursive:true});writeFileSync(target,bytes,{flag:'wx'})}
 writeFileSync(join(directory,'native-history-seed.json'),JSON.stringify(seal)+'\n',{flag:'wx'})
 await loadFussballNativeRuntimeSeed({context,competition,directory});return {directory,seeded:true,captured_at:seal.captured_at,currentFreshUntil:seal.currentFreshUntil}
}
/** Authentication must come from the real private preparation loader supplied
 * by the caller. Missing authority/cache/binding is a HOLD, never a reread. */
export async function loadFussballNativeRuntimeSeed({context,competition,directory,db,composition}={}){
 const seal=JSON.parse(regular(directory,'native-history-seed.json'))
 need(seal.kind==='baden-prepared-originals-seed'&&seal.version===1&&Array.isArray(seal.files)&&seal.files.length<=50000,'bounded durable source seed required')
 if(!context){
  const v=await readBound(db,competition)
  if(v.active!==true){need(composition,'fresh hosted composition required for inactive child rehydration');composition=await reauthenticateFussballNativeComposition(composition);need(same(getFussballNativeComposition(composition).pack,seal.pack),'fresh hosted source/seed differs')}
  const issued=issue(competition,db,v,seal.pack,composition?{composition,sourceProof:getFussballNativeComposition(composition).sourceProof}:{})
  context=issued.installedHistoricalMarkers
 }
 const s=await reauthenticateFussballNativeRuntimeContext(context,competition)
 need(same(seal.pack,s.pack)&&same(seal.receipt,s.state.receipt)&&same(seal.manifest,s.state.manifest)&&['bindings','history','cards','bindingSha256','markerInventorySha256','policySha256'].every(k=>same(seal.readback[k],s.state.readback[k]))&&seal.captured_at===s.pack.captured_at&&seal.currentFreshUntil===s.pack.currentFreshUntil&&same(seal.source,s.pack.source)&&seal.derivedPackSha256===s.pack.derivedPackSha256&&seal.sourceCertificateSha256===s.pack.sourceCertificateSha256,'durable source/marker/card binding differs')
 const files=new Map()
 for(const d of seal.files){need(!files.has(d.path),'duplicate durable path');const bytes=regular(directory,d.path);need(bytes.length===d.bytes&&sha(bytes)===d.sha256,'durable original bytes missing or changed');files.set(d.path,bytes)}
 const originals={}
 for(const season of s.pack.seasons){
  const stage=season.inventory.scope.stage,m=JSON.parse(regular(directory,stage+'/manifest.json')),resultBytes=regular(directory,stage+'/result.json'),pinned=catalog.seasons.find(x=>x.stage===stage)
  need(pinned&&sha(resultBytes)===pinned.resultSha256&&m.resultSha256===pinned.resultSha256&&sha(m.documents)===season.sourceDocumentInventorySha256&&m.options.staffel+':'+m.options.season===season.code&&m.success===true&&(stage!=='current'||m.createdAt===s.pack.captured_at),'sealed original source provenance differs')
  for(const d of m.documents){const bytes=regular(directory,stage+'/'+d.file);need(bytes.length===d.bytes&&sha(bytes)===d.sha256&&files.has(stage+'/'+d.file),'complete sealed source original missing')}
  originals[stage]={manifest:m,result:JSON.parse(resultBytes),files:new Map([...files].filter(([path])=>path.startsWith(stage+'/')).map(([path,b])=>[path.slice(stage.length+1),b]))}
 }
 privateContext(context,competition).originals=originals
 return {context,competition:{...competition,firstFantasyPlayedOn:s.state.readback.firstFantasyPlayedOn,communityCardBinding:structuredClone(s.state.readback.cards),fussballHistoricalContext:context},seal:structuredClone(seal)}
}
const runtimeCode=()=>sha(readFileSync(new URL('./fussball-native-runtime.mjs',import.meta.url)))
const documentReceipt=d=>Object.fromEntries(['url','kind','bytes','sha256','status','contentType','capturedAt'].map(k=>[k,d[k]]))
function runtimeOriginal(d){
 const r=d.originalReceipt,a=r?.attempt,c=r?.capture
 need(r?.version===1&&same(r.document,documentReceipt(d))&&a?.status==='success'&&a.httpStatus===200&&a.error===null&&a.url===d.url&&a.kind===d.kind&&a.startedAt===d.capturedAt&&Number.isInteger(a.number)&&a.number>0&&c?.kind==='baden-marker-aware-runtime'&&c.codeSha256===runtimeCode()&&c.asOfDate===c.createdAt?.slice(0,10)&&Date.parse(c.createdAt)<=Date.parse(d.capturedAt)&&Date.parse(d.capturedAt)<=Date.parse(c.completedAt),'cached runtime original receipt differs')
 return r
}
/** Separate marker-aware capture format. Never call the frozen collector with
 * fake fixtures/HTML or disguise this as its complete ordinary capture. */
export async function captureFussballNativeRuntimeDirectory({context,competition,directory,seedDirectory,reuseDirectory,code=BADEN_CURRENT,maxRequests=4000,asOfDate=new Date().toISOString().slice(0,10),fetchFn}={}){
 await loadFussballNativeRuntimeSeed({context,competition,directory:seedDirectory})
 const s=privateContext(context,competition),stage=originalSeason(s,code)
 const cached=new Map(stage.manifest.documents.filter(d=>d.kind!=='round').map(d=>[d.url,{...d,bytes:Buffer.from(stage.files.get(d.file))}]))
 if(reuseDirectory){
  await loadFussballNativeRuntimeCapture({context,competition,directory:reuseDirectory,code,requireFresh:false})
  const prior=JSON.parse(regular(reuseDirectory,'native-runtime.json'))
  for(const d of prior.documents)if(d.kind!=='round')cached.set(d.url,{...d,bytes:regular(reuseDirectory,d.file)})
 }
 const cachedDocuments=[...cached.values()]
 mkdirSync(directory);mkdirSync(join(directory,'documents'))
 const documents=[],createdAt=new Date().toISOString(),save=(d,origin)=>{
  const bytes=Buffer.from(d.bytes);need(sha(bytes)===d.sha256&&!documents.some(x=>x.url===d.url),'source document digest/identity differs')
  const file='documents/'+d.sha256;writeFileSync(join(directory,file),bytes)
  documents.push({...d,bytes:bytes.length,file,origin})
 }
 need(asOfDate===createdAt.slice(0,10),'capture as-of calendar must equal original current execution day')
 writeFileSync(join(directory,'attempts.jsonl'),'');writeFileSync(join(directory,'outcomes.jsonl'),'')
 const client=createFussballCaptureClient({maxRequests,...(fetchFn?{fetchFn}:{}),cachedDocuments,onAttempt:a=>appendFileSync(join(directory,'attempts.jsonl'),JSON.stringify(a)+'\n'),onDocument:d=>save(d,'network'),onCachedDocument:d=>save(d,'cache')})
 const batch=await collectFussballNativeRuntime({context,competition,code,client,asOfDate}),body=JSON.stringify(batch)+'\n'
 writeFileSync(join(directory,'result.json'),body,{flag:'wx'})
 const snapshot=client.snapshot(),completedAt=new Date().toISOString(),codeSha256=runtimeCode()
 writeFileSync(join(directory,'outcomes.jsonl'),snapshot.attempts.map(a=>JSON.stringify(a)+'\n').join(''))
 for(const d of documents.filter(d=>d.origin==='network')){const attempt=snapshot.attempts.find(a=>a.url===d.url&&a.kind===d.kind&&a.startedAt===d.capturedAt);need(attempt?.status==='success','network document has no completed successful outcome');d.originalReceipt={version:1,document:documentReceipt(d),attempt,capture:{kind:'baden-marker-aware-runtime',code,createdAt,completedAt,codeSha256,asOfDate}}}
 const manifest={version:2,kind:'baden-marker-aware-runtime',code,createdAt,completedAt,runtimeCodeSha256:codeSha256,preparation:s.state.receipt,resultSha256:sha(body),snapshot,intentsSha256:sha(regular(directory,'attempts.jsonl')),outcomesSha256:sha(regular(directory,'outcomes.jsonl')),maxRequests,documents,asOfDate}
 writeFileSync(join(directory,'native-runtime.json'),JSON.stringify(manifest)+'\n',{flag:'wx'})
 // Preserve the authenticated originals+marker seal with every latest cache.
 await seedFussballNativeRuntime({context,competition,directory:join(directory,'seed')})
 return loadFussballNativeRuntimeCapture({context,competition,directory,code})
}
export async function loadFussballNativeRuntimeCapture({context,competition,directory,code=BADEN_CURRENT,requireFresh=true}={}){
 await loadFussballNativeRuntimeSeed({context,competition,directory:join(directory,'seed')})
 const s=privateContext(context,competition),m=JSON.parse(regular(directory,'native-runtime.json')),now=Date.now()
 need(m.kind==='baden-marker-aware-runtime'&&m.version===2&&m.code===code&&same(m.preparation,s.state.receipt)&&m.runtimeCodeSha256===runtimeCode()&&Date.parse(m.createdAt)<=Date.parse(m.completedAt)&&Date.parse(m.completedAt)<=now,'marker-aware runtime provenance required')
 need(m.asOfDate===m.createdAt.slice(0,10),'runtime as-of calendar differs from original execution day')
 const intentsBytes=regular(directory,'attempts.jsonl'),outcomesBytes=regular(directory,'outcomes.jsonl'),parseJournal=b=>b.toString().trim().split('\n').filter(Boolean).map(line=>JSON.parse(line))
 need(sha(intentsBytes)===m.intentsSha256&&sha(outcomesBytes)===m.outcomesSha256,'runtime intent/outcome journal changed')
 const intents=parseJournal(intentsBytes),outcomes=parseJournal(outcomesBytes),snapshot=m.snapshot
 need(Array.isArray(m.documents)&&m.documents.length<=20000&&snapshot?.stopped===false&&snapshot.stopReason===null&&Number.isInteger(m.maxRequests)&&m.maxRequests>=1&&m.maxRequests<=4000&&Number.isInteger(snapshot.requests)&&snapshot.requests>0&&snapshot.requests<=m.maxRequests&&intents.length===snapshot.requests&&outcomes.length===snapshot.requests&&same(outcomes,snapshot.attempts),'complete runtime intent/outcome accounting required')
 const network=m.documents.filter(d=>d.origin==='network'),cached=m.documents.filter(d=>d.origin==='cache'),docs=new Map(),originals=originalSeason(privateContext(context,competition),code).manifest.documents
 need(network.length===outcomes.length&&network.length+cached.length===m.documents.length,'complete runtime network/cache accounting required')
 for(const [i,a]of outcomes.entries()){
  const p=intents[i],d=network[i]
  need(same(Object.keys(p).sort(),['error','kind','number','startedAt','status','url'])&&same(Object.keys(a).sort(),['error','httpStatus','kind','number','startedAt','status','url'])&&p.number===i+1&&p.number===a.number&&p.url===a.url&&p.kind===a.kind&&p.status==='pending'&&p.startedAt===null&&p.error===null&&a.status==='success'&&a.httpStatus===200&&a.error===null&&a.url===d.url&&a.kind===d.kind&&a.startedAt===d.capturedAt&&Date.parse(m.createdAt)<=Date.parse(a.startedAt)&&Date.parse(a.startedAt)<=Date.parse(m.completedAt)&&(i===0||Date.parse(a.startedAt)-Date.parse(outcomes[i-1].startedAt)>=6000),'runtime pending intent/successful outcome/document interval differs')
  need(same(runtimeOriginal(d).capture,{kind:'baden-marker-aware-runtime',code,createdAt:m.createdAt,completedAt:m.completedAt,codeSha256:m.runtimeCodeSha256,asOfDate:m.asOfDate})&&same(d.originalReceipt.attempt,a),'network original receipt differs from execution interval')
 }
 const rounds=network.filter(d=>d.kind==='round')
 need(rounds.length>0&&rounds.every(d=>d.capturedAt.slice(0,10)===m.asOfDate&&(!requireFresh||now-Date.parse(d.capturedAt)<=24*3600_000)),'fresh original round network receipts required')
 for(const d of m.documents){
  need(d.file==='documents/'+d.sha256&&!docs.has(d.url)&&d.status===200,'unique runtime document identity required')
  if(d.origin==='cache'){
   need(d.kind!=='round'&&Date.parse(d.capturedAt)<=Date.parse(m.createdAt),'cached rounds or future originals refused')
   const source=originals.find(o=>o.url===d.url&&same(documentReceipt(o),documentReceipt(d))&&same(o.originalReceipt,d.originalReceipt))
   if(!source){const r=runtimeOriginal(d);need(r.capture.code===code&&Date.parse(r.capture.completedAt)<=Date.parse(m.createdAt),'cached original execution provenance differs')}
  }
  const bytes=regular(directory,d.file);need(bytes.length===d.bytes&&sha(bytes)===d.sha256,'runtime source original changed');docs.set(d.url,{...d,bytes})
 }
 // Reuse the real client offline: exact routes, MIME, body limits, challenge
 // checks, cache refusal for rounds and the original successful request clock.
 let clock=Date.parse(outcomes[0].startedAt),next=0
 const usedNetwork=new Set(),usedCached=new Set(),replay=createFussballCaptureClient({maxRequests:m.maxRequests,cachedDocuments:cached.map(d=>docs.get(d.url)),now:()=>clock,sleep:async ms=>{clock+=ms},onAttempt:p=>{need(same(p,intents[next]),'replayed intent differs');clock=Date.parse(outcomes[next++].startedAt)},onCachedDocument:d=>usedCached.add(d.url),onDocument:d=>{need(same(documentReceipt({...d,bytes:d.bytes.length}),documentReceipt({...docs.get(d.url),bytes:docs.get(d.url).bytes.length})),'replayed network receipt differs');usedNetwork.add(d.url)},fetchFn:async url=>{const d=docs.get(url);need(d?.origin==='network','runtime replay network original missing');return new Response(d.bytes,{status:d.status,headers:{'content-type':d.contentType}})}})
 const batch=await collectFussballNativeRuntime({context,competition,code,asOfDate:m.asOfDate,client:replay})
 const bytes=regular(directory,'result.json');need(same(replay.snapshot(),snapshot)&&usedNetwork.size===network.length&&usedCached.size===cached.length&&sha(bytes)===m.resultSha256&&same(JSON.parse(bytes),batch),'complete runtime replay differs')
 return {...batch,provenance:{createdAt:m.createdAt,completedAt:m.completedAt,resultSha256:m.resultSha256,codeSha256:m.runtimeCodeSha256,requests:m.snapshot.requests,originalCurrentCreatedAt:s.pack.captured_at}}
}
