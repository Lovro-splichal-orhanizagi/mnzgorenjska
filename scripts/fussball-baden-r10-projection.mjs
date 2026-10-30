// Pure R10 DATA projection extracted from reviewed native partition checks.
// This module never authenticates or issues source/native authority.
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {normalizeFussballReport,parseFussballLeagueCode,fussballPlayerKey} from './fussball-import.mjs'
import {validateFussballNativeRoleEnvelope as validateFussballCardEnvelope,razberiNativeFantasyZapisnik as razberiFantasyZapisnik} from './viri/fussball-native-role-parser.mjs'
import {replayFussballNativeRoles,fussballNativeOriginalResultBytes as originalResultBytes} from './fussball-native-role-replay.mjs'
import {inspectFussballPage,fussballFontUrl} from './viri/fussball-discovery.mjs'
import {inspectFussballLineup} from './viri/fussball-statistika.mjs'
import {validateFussballFixture} from './fussball-season.mjs'
const profile='germany-retained-fussball-native-v1',sourcePolicy='fussball-community-cards-v1'
const completedCatalogKind='baden-fussball-completed-stages-native-catalog',completedSourceKind='authenticated-fussball-baden-completed-stages-source'
const freshCatalogKind='baden-fussball-fresh-pair-native-catalog',freshSourceKind='authenticated-fussball-baden-fresh-pair-source'
const MiB=1024*1024,HASH=/^[a-f0-9]{64}$/
const hash=b=>createHash('sha256').update(b).digest('hex')
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x)
const digest=v=>hash(canonical(v)),json=v=>Buffer.from(JSON.stringify(v)+'\n'),same=(a,b)=>isDeepStrictEqual(a,b)
const need=(ok,message)=>{if(!ok)throw Object.assign(Error('fussball native composition: '+message),{code:'FUSSBALL_NATIVE_COMPOSITION_HOLD',reason_code:'FUSSBALL_NATIVE_COMPOSITION_HOLD',dataHold:true})}
const plain=v=>v&&Object.getPrototypeOf(v)===Object.prototype
function closed(v,keys,why){need(plain(v)&&same(Object.keys(v).sort(),[...keys].sort()),why)}
const date=v=>typeof v==='string'&&/^20\d\d-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v
const utc=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))
const apiEnd=v=>Date.parse(v)+(v.includes('.')?0:999)
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
const scopes=[{stage:'current',staffel:'03188V27L800000JVS5489BTVU7GTVLE-G',season:'2026/27'},{stage:'archive',staffel:'02TGLSVQ1800000IVS5489BTVTLPPK10-G',season:'2025/26'}]
const categories=['unplayed','complete','community-pending','reviewed-known-result-unavailable','reviewed-unknown-administrative-result']
function fresh(source){need(utc(source?.currentCreatedAt)&&utc(source.currentFreshUntil)&&Date.parse(source.currentCreatedAt)<=Date.now()&&Date.parse(source.currentFreshUntil)===Date.parse(source.currentCreatedAt)+24*3600_000&&Date.now()<=Date.parse(source.currentFreshUntil),'original current freshness expired or differs')}
function fixture(f,rounds){
 closed(f,['id','zapisnikId','url','krog','datum','ura','domaci','gostje','rezultat',...(Object.hasOwn(f??{},'administrativeResult')?['administrativeResult']:[])],'closed source fixture required')
 validateFussballFixture(f,{round:f.krog})
 need(/^[A-Z0-9]{32}$/.test(f.id??'')&&f.zapisnikId===`de-fussball-${f.id}`&&typeof f.url==='string'&&f.url.match(/^https:\/\/www\.fussball\.de\/spiel\/(?:[a-z0-9]+(?:-{1,2}[a-z0-9]+)*\/)?-\/spiel\/([A-Z0-9]{32})$/)?.[1]===f.id,'fixture/report source identity differs')
 need(rounds.includes(f.krog)&&date(f.datum)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(f.ura??'')&&typeof f.domaci==='string'&&f.domaci.trim()&&typeof f.gostje==='string'&&f.gostje.trim()&&f.domaci!==f.gostje,'invalid source fixture header')
 if(f.rezultat!==null){closed(f.rezultat,['domaci','gostje'],'closed official score required');need(Object.values(f.rezultat).every(n=>Number.isInteger(n)&&n>=0&&n<=99),'invalid official score')}
 if(Object.hasOwn(f,'administrativeResult')){
  const a=f.administrativeResult;closed(a,['schemaVersion','kind','marker','displayedScores',...(a.marker==='W'?['rawMarker']:[])],'closed administrative source result required')
  need(f.rezultat===null&&a.schemaVersion===1&&((a.kind==='confirmed-administrative-decision'&&a.marker==='V')||(a.kind==='confirmed-sports-court-decision'&&a.marker==='U'&&f.id==='02TNBSVIMS000000VS5489BUVSSD35NB'&&f.krog===21&&f.datum==='2026-03-31'&&same(a.displayedScores,[{domaci:4,gostje:1},{domaci:1,gostje:4}]))||(a.kind==='confirmed-match-authority-decision'&&a.marker==='W'&&['w','W'].includes(a.rawMarker)&&f.id==='02TNBSVEEG000000VS5489BUVSSD35NB'&&f.krog===29&&f.datum==='2026-05-25'&&f.ura==='17:00'&&f.domaci==='TSG 1862/09 Weinheim'&&f.gostje==='GU-Türk. SV Pforzheim zg.'&&same(a.displayedScores,[{domaci:3,gostje:0},{domaci:0,gostje:3}])))&&Array.isArray(a.displayedScores)&&a.displayedScores.length===2,'invalid unknown administrative result')
  for(const s of a.displayedScores){closed(s,['domaci','gostje'],'closed displayed score required');need(Object.values(s).every(n=>Number.isInteger(n)&&n>=0&&n<=99),'invalid displayed score')}
 }
}
/** Pure closed-schema validation confers no capability. Only the fixed file is
 * consumed by the private source/hosted builders; caller catalogs are never used. */
export function validateFussballNativeCatalog(c){
 
 closed(c,['version','kind','profile','status','sourcePolicy','approval','firstFantasyPlayedOn','sourceRunId','sourceHead','captureCodeSha256','clubDescriptors','nativePreparation','seasons'],'closed catalog required')
 need(c.nativePreparation===null,'native preparation cannot be supplied as catalog authority')
 need(c.version===1&&c.profile===profile&&c.sourcePolicy===sourcePolicy&&c.kind==='baden-fussball-r10-native-catalog'&&HASH.test(c.captureCodeSha256??''),'exact R10 catalog DATA required')
 need(c.status==='FINALIZED','production catalog UNFINALIZED: exhaustive archive, immutable cutoff and source club descriptors required')
 need(/^[1-9]\d{0,15}$/.test(c.sourceRunId??'')&&/^[a-f0-9]{40}$/.test(c.sourceHead??''),'actual authenticated source run/head required')
 closed(c.approval,['reference','permissionTimestamp'],'closed approval reference required')
 need(c.approval.reference==='call_e8c944e47b7c42a38afa4f08fda48c23'&&(c.approval.permissionTimestamp===null||utc(c.approval.permissionTimestamp))&&date(c.firstFantasyPlayedOn),'reviewed catalog approval/cutoff required')
 need(Array.isArray(c.clubDescriptors)&&c.clubDescriptors.length>0&&c.clubDescriptors.length<=128,'complete source club descriptors required')
 const clubs=new Set()
 for(const d of c.clubDescriptors){closed(d,['sourceCompetitionId','season','name'],'closed source club descriptor required');const s=scopes.find(s=>s.season===d.season);need(s&&d.sourceCompetitionId===`${s.staffel}:${s.season}`&&typeof d.name==='string'&&d.name.trim()&&!clubs.has(canonical(d)),'unique exact Baden source club descriptor required');clubs.add(canonical(d))}
 need(Array.isArray(c.seasons)&&c.seasons.length===2,'complete exact current/archive catalog required')
 for(const [i,s]of c.seasons.entries()){
  closed(s,['stage','staffel','season','fixtureInventorySha256','resultSha256','rejectionsSha256','administrativeSha256','nativeRoleReplaySha256','reviews'],'closed seasonal catalog required')
  need(Object.entries(scopes[i]).every(([k,v])=>s[k]===v)&&['fixtureInventorySha256','resultSha256','rejectionsSha256','administrativeSha256','nativeRoleReplaySha256'].every(k=>HASH.test(s[k]??''))&&Array.isArray(s.reviews)&&s.reviews.length<=612,'finalized seasonal inventory hashes required')
  parseFussballLeagueCode(`${s.staffel}:${s.season}`);const ids=new Set()
  for(const e of s.reviews){
   closed(e,['kind','fixture','sourceCompetitionId','season','defect','documents','sourceRawSha256','observedFontIds','missingObservedFonts','approvalReference','resultKnown','retainedBundleSha256'],'closed per-fixture reviewed exclusion required')
   need(plain(e.fixture)&&Array.isArray(e.documents),'reviewed source fixture and document inventory required')
   need(e.approvalReference===c.approval.reference&&e.resultKnown===(e.kind==='reviewed-known-result-unavailable')&&e.retainedBundleSha256===digest(e.documents),'reviewed approval/result/bundle binding differs')
   need(categories.slice(3).includes(e.kind)&&e.sourceCompetitionId===`${s.staffel}:${s.season}`&&e.season===s.season&&!ids.has(e.fixture?.id),'unique per-season reviewed tuple required');ids.add(e.fixture.id)
   fixture(e.fixture,Array.from({length:80},(_,n)=>n+1));need(e.fixture.datum<c.firstFantasyPlayedOn,'postlaunch unavailable fixture refused')
   closed(e.defect,['code','reason','kind'],'closed strict defect required');need(['code','reason','kind'].every(k=>typeof e.defect[k]==='string'&&e.defect[k].length>0),'exact reviewed strict defect required')
   need(Array.isArray(e.documents)&&e.documents.length>0&&e.documents.length<=260&&Array.isArray(e.observedFontIds)&&Array.isArray(e.missingObservedFonts),'bounded retained document/font inventory required')
   need(e.kind==='reviewed-known-result-unavailable'?e.fixture.rezultat!==null&&HASH.test(e.sourceRawSha256??''):e.fixture.rezultat===null&&Object.hasOwn(e.fixture,'administrativeResult')&&e.sourceRawSha256===null,'known/unknown official result scope differs')
  }
 }
 return freeze(structuredClone(c))
}
function documentMap(stage){
 const out=new Map()
 for(const d of stage.manifest.documents){need(!out.has(d.url),'duplicate latest original document URL');const b=stage.files.get(d.file);need(Buffer.isBuffer(b)&&b.length===d.bytes&&hash(b)===d.sha256,'original document bytes differ');out.set(d.url,{metadata:d,bytes:b})}
 return out
}
function originalReportBundle(f,documents){
 const main=documents.get(f.url);need(main?.metadata.kind==='report','original main report required')
 const info=inspectFussballPage(main.bytes.toString('utf8'),{kind:'report',matchId:f.id}),lineup=documents.get(info.lineupUrl);need(lineup?.metadata.kind==='lineup','original latest lineup required')
 const observedFontIds=[...new Set([...info.fontIds,...inspectFussballLineup(lineup.bytes.toString('utf8'))])].sort(),missingObservedFonts=[],items=[main,lineup]
 for(const id of observedFontIds){const css=documents.get(info.cssTemplate.replace('%ID%',id)),url=`https://www.fussball.de/export.fontface/-/format/woff/id/${id}/type/font`,font=documents.get(url),missing=[]
  if(css){need(css.metadata.kind==='css'&&fussballFontUrl(css.bytes.toString('utf8'),id)===url,'retained observed CSS identity differs');items.push(css)}else missing.push('css')
  if(font){need(font.metadata.kind==='font','retained observed WOFF identity differs');items.push(font)}else missing.push('font')
  if(missing.length)missingObservedFonts.push({id,missing})
 }
 const descriptors=items.map(d=>({url:d.metadata.url,kind:d.metadata.kind,sha256:hash(d.bytes),bytes:d.bytes.length,metadataSha256:digest(d.metadata),originalReceiptSha256:digest(d.metadata.originalReceipt??null)}))
 return {sourceMatchId:f.id,sourceRawSha256:hash(main.bytes),latestLineupSha256:hash(lineup.bytes),observedFontIds,missingObservedFonts,fontEvidenceComplete:missingObservedFonts.length===0,documents:descriptors,receiptsSha256:digest(descriptors.map(d=>({url:d.url,originalReceiptSha256:d.originalReceiptSha256}))),retainedBundleSha256:digest(descriptors)}
}
function reviewedEntry(e,rejection,stage,documents){
 const f=e.fixture;need(same(rejection,{fixture:f,code:e.defect.code,reason:e.defect.reason}),'original strict rejection/administrative inventory differs')
 const bundle=new Map(),urls=new Set()
 for(const d of e.documents){
  closed(d,['url','kind','sha256','byteLength','file','metadataSha256','metadata'],'closed original document descriptor required')
  const actual=documents.get(d.url);need(!urls.has(d.url)&&actual&&same(actual.metadata,d.metadata)&&d.file===d.metadata.file&&d.kind===d.metadata.kind&&d.sha256===hash(actual.bytes)&&d.byteLength===actual.bytes.length&&d.metadataSha256===digest(actual.metadata),'reviewed raw/lineup/font/receipt identity differs');urls.add(d.url);bundle.set(d.url,{kind:d.kind,bytes:actual.bytes})
 }
 if(e.kind==='reviewed-known-result-unavailable'){
  const main=bundle.get(f.url);need(main?.kind==='report'&&hash(main.bytes)===e.sourceRawSha256,'main-report SHA differs')
  const info=inspectFussballPage(main.bytes.toString('utf8'),{kind:'report',matchId:f.id}),lineup=bundle.get(info.lineupUrl);need(lineup?.kind==='lineup','observed latest lineup required')
  const ids=[...new Set([...info.fontIds,...inspectFussballLineup(lineup.bytes.toString('utf8'))])].sort();need(same(ids,e.observedFontIds),'observed font identity set differs')
  const fonts=Object.create(null),missing=[],used=new Set([f.url,info.lineupUrl])
  for(const id of ids){const cssUrl=info.cssTemplate.replace('%ID%',id),fontUrl=`https://www.fussball.de/export.fontface/-/format/woff/id/${id}/type/font`,css=bundle.get(cssUrl),font=bundle.get(fontUrl),absent=[]
   if(!css)absent.push('css');if(!font)absent.push('font');if(absent.length)missing.push({id,missing:absent})
   if(css){need(css.kind==='css'&&fussballFontUrl(css.bytes.toString('utf8'),id)===fontUrl,'observed CSS/font URL differs');used.add(cssUrl)}
   if(font){need(font.kind==='font','retained WOFF kind differs');used.add(fontUrl);fonts[id]={bytes:font.bytes,sha256:hash(font.bytes)}}
  }
  need(same(missing,e.missingObservedFonts)&&used.size===bundle.size,'missing observed font or extra bundle inventory differs')
  let error;try{razberiFantasyZapisnik(main.bytes.toString('utf8'),lineup.bytes.toString('utf8'),{fonts,id:f.id,lineupId:f.id,cardPolicy:'community-v1',season:e.season})}catch(ex){error=ex}
  need(error?.code===e.defect.code&&error.message===e.defect.reason,'reviewed strict defect no longer reproduces')
 }else{
  // The collector deliberately never fetched an administrative report. Its
  // original round pages, displayed pair order and null final score are retained.
  need(e.observedFontIds.length===0&&e.missingObservedFonts.length===0&&[...bundle.values()].every(d=>d.kind==='round'),'administrative evidence must bind original round pages only')
  const rounds=stage.manifest.documents.filter(d=>d.kind==='round');need(rounds.length===bundle.size&&rounds.every(d=>urls.has(d.url)),'complete administrative round evidence required')
 }
 return {kind:e.kind,sourceMatchId:f.id,reportId:f.zapisnikId,round:f.krog,date:f.datum,time:f.ura,homeName:f.domaci,awayName:f.gostje,resultKnown:e.resultKnown,approvalReference:e.approvalReference,defect:structuredClone(e.defect),fixture:structuredClone(f),sourceCompetitionId:e.sourceCompetitionId,season:e.season,statisticsStatus:'unavailable_historical',statisticsReason:e.defect.kind,sourceRawSha256:e.sourceRawSha256,retainedBundleSha256:digest(e.documents),observedFontIds:structuredClone(e.observedFontIds),missingObservedFonts:structuredClone(e.missingObservedFonts),officialResultKnown:e.kind==='reviewed-known-result-unavailable',officialScore:structuredClone(f.rezultat),administrativeResult:structuredClone(f.administrativeResult??null),importedAt:null,starters:null,nastopi:null,goli:null,appearances:null,goals:null,individualPoints:null,goalkeeperCoverage:0}
}
function pendingHeader(entry,f,season,identities){
 const e=entry.result.cardEnvelope,verified=validateFussballCardEnvelope(e),r=verified.result,z=r.z
 need(same(entry.fixture,f)&&same(entry.result,r)&&r.statisticsPending===true&&r.reportStatistikaPripravljena===false&&!Object.hasOwn(r,'nastopi')&&!Object.hasOwn(z,'goli'),'typed pending original-byte equivalence differs')
 const teams=[z.domaci,z.gostje].map(t=>({...structuredClone(t),postava:t.postava.map(p=>({...structuredClone(p),regSt:fussballPlayerKey(p.virId)})),rezerve:t.rezerve.map(p=>({...structuredClone(p),regSt:fussballPlayerKey(p.virId)}))}))
 for(const p of e.roster){const k=fussballPlayerKey(p.sourceId);need(!identities.has(k)||identities.get(k)===p.sourceId,'source identity collision');identities.set(k,p.sourceId)}
 return {id:f.zapisnikId,url:f.url,statisticsPending:true,cardEnvelope:structuredClone(e),z:{zapisnikId:f.zapisnikId,sezona:season,datum:z.datum,ura:z.ura,krog:z.krog,domaci:teams[0],gostje:teams[1],rezultat:structuredClone(z.rezultat),nepopoln:true,opozorila:['SLFF_FUSSBALL_CARDS_PENDING_V1']}}
}
function cardEntry(entry,f,season,documents){
 const e=entry?.result?.cardEnvelope;need(e&&same(entry.fixture,f),'complete/pending card envelope required')
 const verified=validateFussballCardEnvelope(e)
 need(same(verified.result,entry.result)&&e.matchId===f.id&&e.reportId===f.zapisnikId&&e.sourceUrl===f.url&&e.season===season&&e.round===f.krog&&e.date===f.datum&&e.time===f.ura&&e.homeName===f.domaci&&e.awayName===f.gostje&&same(e.score,f.rezultat),'card envelope source/header differs')
 const main=documents.get(f.url),info=inspectFussballPage(verified.mainHtml,{kind:'report',matchId:f.id}),lineup=documents.get(info.lineupUrl)
 need(main?.metadata.kind==='report'&&main.bytes.equals(Buffer.from(e.bundle.report.base64,'base64'))&&lineup?.metadata.kind==='lineup'&&lineup.bytes.equals(Buffer.from(e.bundle.lineup.base64,'base64')),'envelope main/latest lineup differs from authenticated originals')
 for(const font of e.bundle.fonts){const url=`https://www.fussball.de/export.fontface/-/format/woff/id/${font.fontId}/type/font`,d=documents.get(url);need(d?.metadata.kind==='font'&&d.bytes.equals(Buffer.from(font.base64,'base64')),'card envelope font differs from original bytes')}
 return e
}
function partitionState(state,c){
 validateFussballNativeCatalog(c)
 need(state.proof.source.sourceRunId===c.sourceRunId&&state.proof.source.sourceHead===c.sourceHead&&state.proof.source.captureCodeSha256===c.captureCodeSha256&&state.proof.source.nativeEligible===false&&state.proof.source.activationEligible===false,'source-only capability scope differs')
 const seasons=[],clubs=[],roleReplay=replayFussballNativeRoles(state.originals.stages)
 for(const s of c.seasons){
  const stage=state.originals.stages[s.stage],original=stage.result,replay=roleReplay[s.stage],r=replay.result,sch=r.schedule,scope=r.scope,cov=r.coverage
  need(s.nativeRoleReplaySha256===replay.nativeRoleReplaySha256,'finalized native role replay witness differs')
  need(stage.manifest.success===true&&stage.manifest.error===null&&stage.manifest.options.reportLimit===null&&scope?.provider==='fussball'&&scope.staffel===s.staffel&&scope.season===s.season&&scope.cardPolicy==='community-v1'&&sch?.staffel===s.staffel&&sch.season===s.season&&r.version===1&&r.activationEligible===false&&date(scope.asOfDate),'complete replayed seasonal scope required')
  need(stage.manifest.resultSha256===s.resultSha256&&hash(stage.manifest.version===8?originalResultBytes(stage):stage.files.get('result.json'))===s.resultSha256&&digest(sch.fixtures)===s.fixtureInventorySha256&&digest(original.rejectedReports)===s.rejectionsSha256&&digest(r.administrativeFixtures??[])===s.administrativeSha256,'finalized source fixture/result/rejection/admin inventory differs')
  need(Array.isArray(sch.rounds)&&sch.rounds.length>0&&sch.rounds.length<=80&&sch.rounds.every((n,i)=>n===i+1)&&Array.isArray(sch.fixtures)&&sch.fixtures.length>0&&sch.fixtures.length<=4000,'full bounded contiguous source schedule required')
  const byId=new Map(),assigned=new Set(),partition=Object.fromEntries(categories.map(k=>[k,[]])),identities=new Map(),reports=[],pendingReports=[],unavailable=[]
  for(const f of sch.fixtures){fixture(f,sch.rounds);need(!byId.has(f.id),'duplicate source fixture');byId.set(f.id,f)}
  for(const name of new Set(sch.fixtures.flatMap(f=>[f.domaci,f.gostje])))clubs.push({sourceCompetitionId:`${s.staffel}:${s.season}`,season:s.season,name})
  const put=(f,kind)=>{need(byId.has(f.id)&&same(byId.get(f.id),f)&&!assigned.has(f.id),'partition overlap or foreign fixture');assigned.add(f.id);partition[kind].push(f.id)}
  const localDocuments=documentMap(stage),affected=new Set(replay.nativeRoleReplay.affected.map(e=>e.sourceMatchId)),documentsFor=f=>affected.has(f.id)?replay.documents:localDocuments,reviews=new Map(s.reviews.map(e=>[e.fixture.id,e]))
  need(['reports','pendingReports','rejectedReports','cardEnvelopes'].every(k=>Array.isArray(r[k])),'complete report inventories required')
  for(const entry of r.reports){const f=byId.get(entry?.fixture?.id);need(f?.rezultat!==null&&f&&!Object.hasOwn(f,'administrativeResult'),'complete report outside ordinary played set');cardEntry(entry,f,s.season,documentsFor(f));reports.push(normalizeFussballReport(entry,f,s.season,identities));put(f,'complete')}
  for(const entry of r.pendingReports){const f=byId.get(entry?.fixture?.id);need(f?.rezultat!==null&&f&&!Object.hasOwn(f,'administrativeResult'),'pending report outside ordinary played set');cardEntry(entry,f,s.season,documentsFor(f));pendingReports.push(pendingHeader(entry,f,s.season,identities));put(f,'community-pending')}
  need(same(r.cardEnvelopes,[...r.reports,...r.pendingReports].map(e=>e.result.cardEnvelope)),'source card envelope inventory differs')
  for(const rejection of [...r.rejectedReports,...(r.administrativeFixtures??[])]){
   const f=byId.get(rejection?.fixture?.id),review=reviews.get(f?.id);need(f&&review&&same(review.fixture,f),'unreviewed source defect or changed fixture');const expected=Object.hasOwn(f,'administrativeResult')?'reviewed-unknown-administrative-result':'reviewed-known-result-unavailable';need(review.kind===expected,'reviewed defect category differs')
   unavailable.push(reviewedEntry(review,rejection,stage,documentsFor(f)));put(f,expected);reviews.delete(f.id)
  }
  need(reviews.size===0,'extra reviewed exclusion not in original inventories')
  for(const f of sch.fixtures)if(!assigned.has(f.id)){need(f.rezultat===null&&!Object.hasOwn(f,'administrativeResult')&&f.datum>=scope.asOfDate,'missing played/administrative/past fixture partition');put(f,'unplayed')}
  const played=sch.fixtures.filter(f=>f.rezultat!==null),unplayed=sch.fixtures.filter(f=>f.rezultat===null&&!Object.hasOwn(f,'administrativeResult')),admin=sch.fixtures.filter(f=>Object.hasOwn(f,'administrativeResult'))
  const unscored={total:unplayed.length,past:unplayed.filter(f=>f.datum<scope.asOfDate).length,current:unplayed.filter(f=>f.datum===scope.asOfDate).length,future:unplayed.filter(f=>f.datum>scope.asOfDate).length,unknownDate:0}
  need(assigned.size===sch.fixtures.length&&cov?.sampled===false&&cov.expectedRounds===sch.rounds.length&&cov.capturedRounds===sch.rounds.length&&cov.fixtures===sch.fixtures.length&&cov.playedFixtures===played.length&&cov.attemptedReports===played.length&&cov.completeReports===r.reports.length&&cov.pendingReports===r.pendingReports.length&&cov.rejectedReports===r.rejectedReports.length&&(cov.administrativeFixtures??0)===admin.length&&same(cov.unscoredFixtures,unscored),'original full coverage differs from exact partition')
  const counts=Object.fromEntries(categories.map(k=>[k,partition[k].length])),inventory={scope:{stage:s.stage,staffel:s.staffel,season:s.season},fixtureInventorySha256:s.fixtureInventorySha256,rejectionsSha256:s.rejectionsSha256,administrativeSha256:s.administrativeSha256,partition,counts}
  const sourceBundles=played.map(f=>originalReportBundle(f,documentsFor(f)))
  seasons.push({code:`${s.staffel}:${s.season}`,season:s.season,cardPolicy:'community-v1',inventory,partitionSha256:digest(inventory),sourceDocumentInventorySha256:digest(stage.manifest.documents),sourceBundles,nativeRoleReplay:structuredClone(replay.nativeRoleReplay),nativeRoleReplaySha256:replay.nativeRoleReplaySha256,originalCoverage:structuredClone(original.coverage),derivedCoverage:structuredClone(cov),reports,pendingReports,cardEnvelopes:structuredClone(r.cardEnvelopes),unavailable,fixtures:structuredClone(sch.fixtures),identities:[...identities].map(([reg_st,source_id])=>({source_id,reg_st})).sort((a,b)=>a.source_id.localeCompare(b.source_id))})
 }
 need(same(clubs.sort((a,b)=>canonical(a).localeCompare(canonical(b))),[...c.clubDescriptors].sort((a,b)=>canonical(a).localeCompare(canonical(b)))),'source club descriptor inventory differs')
 return seasons
}

export function projectBadenR10CompositionData(input){
 closed(input,['stages','catalog','source'],'closed pure projection DATA required')
 const state={proof:{source:input.source},originals:{stages:input.stages}},seasons=partitionState(state,input.catalog)
 return freeze({seasons,catalog:structuredClone(input.catalog),nativeAdmission:false,activationEligible:false})
}
