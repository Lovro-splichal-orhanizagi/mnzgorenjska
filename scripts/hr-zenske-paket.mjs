// Immutable, offline-only source packet. Capture timestamps are original receipt times.
import {createHash} from 'node:crypto'
import {readFileSync,lstatSync,existsSync,mkdirSync,readdirSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {normalizeHnsWomenFixtures} from './viri/hns-zenske.mjs'
import {parseHnsWomenReport,HNS_WOMEN_CLUBS} from './viri/hns-zenske-quality.mjs'
import {hnsWomenRoundCutoff} from './hr-zenske-deadline.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
import {zaprtje} from './odtis-kode.mjs'
import {hnsWomenPersistedEvidence} from './hr-zenske-dokazi.mjs'
export const HNS_WOMEN_SLUG='hr-prva-hnlz'
const fail=message=>{throw Error(`HNS women packet: ${message}`)}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const iso=value=>typeof value==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value))
const archiveCatalog=JSON.parse(readFileSync(new URL('./vzorci/hns-zenske-archive-phase-fixtures.json',import.meta.url))).fixtures
const currentCatalog=JSON.parse(readFileSync(new URL('./vzorci/hns-zenske-current-fixtures.json',import.meta.url))).fixtures
function canonicalURL(raw) {
 let url;try{url=new URL(raw)}catch{fail('invalid capture request identity')}
 const path=/^\/(natjecanja|utakmice)\/([1-9]\d*)\/[a-z0-9-]+\/$/.exec(url.pathname)
 if(url.origin!=='https://semafor.hns.family'||url.username||url.password||url.search||url.hash||!path)fail('foreign capture request identity')
 return{canonicalUrl:`https://semafor.hns.family/${path[1]}/${path[2]}/x/`,kind:path[1],id:path[2]}
}
export function validateHnsWomenDocument(d) {
 const identity=canonicalURL(d?.url)
 const expected=identity.kind==='utakmice'?`documents/match-${identity.id}.html`:`documents/schedule-${identity.id}.html`
 if(d.file!==expected||d.file.includes('..'))fail('unsafe or foreign document path')
 if(d.status!==200||!iso(d.capturedAt))fail('invalid capture status/time')
 if(typeof d.body!=='string'||!Number.isSafeInteger(d.bytes)||d.bytes<1||d.bytes>2000000||Buffer.byteLength(d.body)!==d.bytes)fail('capture bytes/size differ')
 if(!/^[a-f0-9]{64}$/.test(d.sha256??'')||sha(d.body)!==d.sha256)fail('capture SHA differs from original bytes')
 return{...d,...identity}
}
export function validateHnsWomenFixtureSet(fixtures,code) {
 const expected=code==='114471579'?currentCatalog:code==='108043476'?archiveCatalog:null
 if(!expected||fixtures.length!==expected.length||new Set(fixtures.map(f=>f.id)).size!==expected.length)fail('incomplete/foreign published fixture set')
 for(const f of fixtures) {
  const e=expected.find(e=>e.id===f.id)
  const expectedPhase=code==='114471579'?null:({'base':'Magenta liga - Liga','playoff':'Magenta liga 25/26 Play off','playout':'Magenta liga 25/26 Play out'})[e?.publishedPhase]
  const offset=code==='108043476'&&e?.publishedPhase!=='base'?14:0
  if(!e||f.sourcePhase!==expectedPhase||f.krog!==e.krog+offset||e.krog!==f.sourceRound||e.domaciId!==f.domaciId||e.gostjeId!==f.gostjeId||HNS_WOMEN_CLUBS[f.domaciId]!==f.domaci||HNS_WOMEN_CLUBS[f.gostjeId]!==f.gostje)fail('published fixture source ID/round/club identity differs')
 }
 if(code==='114471579')for(let round=1;round<=14;round++) {
  const rows=fixtures.filter(f=>f.krog===round)
  if(rows.length!==4||new Set(rows.flatMap(f=>[f.domaciId,f.gostjeId])).size!==8)fail('current round must contain all8clubs in4unique fixtures')
 }
 return fixtures
}
export function hnsWomenScheduleFixtures(html,code) {
 return validateHnsWomenFixtureSet(normalizeHnsWomenFixtures(html,code),code).map(f=>{
  const row=new RegExp(`data-match="${f.id}"[\\s\\S]*?<div class="date">([^<]*)<`).exec(html)
  const postponed=f.datum==null&&row?.[1]?.trim()==='Odgođeno'
  if(f.datum==null&&!postponed)fail('unpublished source date is not an explicit postponement')
  return{...f,postponed}
 })
}
export function hnsWomenParserSha256() {
 const files=[...new Set(['scripts/hr-zenske-paket.mjs','scripts/uvoz-zapisnikov.mjs','scripts/uvoz-razporeda.mjs','scripts/viri/index.mjs','scripts/tekmovanje.mjs','scripts/hr-zenske-import.mjs','scripts/klubi.mjs','scripts/hr-zenske-izdaja.mjs','scripts/hr-zenske-stage.py','.github/workflows/uvoz-hr-zenske.yml','supabase/migrations/20261018210100_hns_women_reviewed_release.sql',
 ...zaprtje('scripts/viri/hns-zenske-runtime.mjs'),...zaprtje('scripts/hr-zenske-offline.mjs'),...zaprtje('scripts/viri/hns-zenske-quality.mjs'),...zaprtje('scripts/hr-zenske-deadline.mjs'),...zaprtje('scripts/lib/historical-statistics-import.mjs'),
 'scripts/policies/historical-statistics-exclusions.json','scripts/vzorci/hns-zenske-archive-phase-fixtures.json','scripts/vzorci/hns-zenske-current-fixtures.json'])].sort()
 const hash=createHash('sha256');for(const file of files)hash.update(file).update(readFileSync(file));return hash.digest('hex')
}
export function buildHnsWomenPacket({documents,sourceBudget,sourceCommit,firstFantasyRound=9,now=Date.now()}) {
 if(!/^[a-f0-9]{40}$/.test(sourceCommit??''))fail('reviewed source commit required')
 if(!sourceBudget||!Number.isInteger(sourceBudget.hnsRequests)||sourceBudget.hnsRequests<137||sourceBudget.otherRequests!==1||sourceBudget.hnsRequests+sourceBudget.otherRequests!==sourceBudget.total||sourceBudget.total>160||sourceBudget.total<138||sourceBudget.refusalObserved!==false)fail('source budget/refusal binding differs')
 if(!Number.isFinite(now)||!Number.isInteger(firstFantasyRound)||firstFantasyRound<9||firstFantasyRound>14)fail('valid first fantasy round/time required')
 if(!Array.isArray(documents)||documents.length>133)fail('invalid document set')
 const checked=documents.map(validateHnsWomenDocument),map=new Map(checked.map(d=>[d.canonicalUrl,d]))
 if(map.size!==checked.length||checked.reduce((n,d)=>n+d.bytes,0)>20000000)fail('duplicate document or expanded size exceeded')
 const schedules=['108043476','114471579'].map((code,index)=>{
  const d=map.get(`https://semafor.hns.family/natjecanja/${code}/x/`)
  if(!d)fail('missing main archive/current schedule')
  const age=now-Date.parse(d.capturedAt)
  // Existing DFB release convention: original archive <=168h, current <=12h, future skew <=5min.
  if(age< -300000||age>(index?12:168)*3600000)fail('stale/invalid original schedule capture time')
  return{code,season:index?'2026/27':'2025/26',file:d.file,sha256:d.sha256,capturedAt:d.capturedAt,fixtures:hnsWomenScheduleFixtures(d.body,code)}
 })
 const current=schedules[1],first=current.fixtures.filter(f=>f.krog===firstFantasyRound)
 if(first.length!==4||first.some(f=>f.izid||f.postponed))fail('complete unplayed future round required')
 const future={round:firstFantasyRound,...hnsWomenRoundCutoff(first,{policy:'midnight-local-v1',offsetHours:6})}
 if(Date.parse(future.deadlineAt)<=now)fail('first fantasy cutoff already expired')
 const policy=getHistoricalStatisticsPolicy(HNS_WOMEN_SLUG),competition={slug:HNS_WOMEN_SLUG,source:'hns',source_policy:policy.sourcePolicy,firstFantasyPlayedOn:future.playedOn}
 const reports=[],expectedURLs=new Set(schedules.map(s=>`https://semafor.hns.family/natjecanja/${s.code}/x/`))
 for(const schedule of schedules)for(const f of schedule.fixtures.filter(f=>f.izid)) {
  const url=`https://semafor.hns.family/utakmice/${f.id}/x/`,d=map.get(url)
  if(!d)fail(`missing published played report ${f.id}`)
  expectedURLs.add(url)
  if(Date.parse(d.capturedAt)>now+300000)fail('future report capture time')
  const report=parseHnsWomenReport(d.body,{competition,fixture:f,sourceCompetitionId:schedule.code})
  reports.push({...report,appearances:report.appearances??null,capturedAt:d.capturedAt,file:d.file,internalRound:f.krog})
 }
 if(checked.some(d=>!expectedURLs.has(d.canonicalUrl)))fail('unexpected supplemental/unplayed source document')
 const unavailable=reports.filter(r=>r.statisticsStatus==='unavailable_historical')
 if(unavailable.length!==3||policy.entries.some(e=>!unavailable.some(r=>r.id===e.sourceMatchId))||reports.filter(r=>r.fixture.sourceCompetitionId==='108043476').length!==75)fail('exact75archive/3historical exceptions required')
 const normal=reports.filter(r=>r.statisticsStatus==='available'),pending=current.fixtures.filter(f=>f.krog<firstFantasyRound&&!f.izid&&!f.postponed).map(f=>f.id).sort()
 const manifest={version:1,slug:HNS_WOMEN_SLUG,source:'hns',sourcePolicy:policy.sourcePolicy,dateOnlyDeadlinePolicy:'midnight-local-v1',sourceCommit,parserSha256:hnsWomenParserSha256(),
  statisticsPolicy:{id:policy.id,sha256:historicalStatisticsPolicySha256(policy),firstFantasyPlayedOn:future.playedOn},sourceBudget:{...sourceBudget},firstFantasyRound,future,
  documents:checked.map(({body,kind,id,...record})=>record),schedules,reports,persistedFixtures:hnsWomenPersistedEvidence({schedules,reports}),
  coverage:{fixtureCount:131,archiveComplete:75,currentPublishedPlayed:reports.length-75,normalComplete:normal.length,unavailableHistorical:3,pending:131-reports.length,explicitPostponed:current.fixtures.filter(f=>f.postponed).length,eligibleCurrentClubs:new Set(normal.filter(r=>r.fixture.sourceCompetitionId==='114471579').flatMap(r=>[r.fixture.homeSourceClubId,r.fixture.awaySourceClubId])).size},
  releaseBlockingPendingIds:pending,releaseReady:pending.length===0,currentPhase:'initial14rounds_only',laterPhaseHandover:'requires separate published-phase review',
  nativeReportIdentity:'capture request URL plus original-byte receipt; HNS raw report does not embed native match ID'}
 return{manifest,documents:checked.map(({kind,id,...d})=>d)}
}
export function validateHnsWomenPacket(packet,{approvedSha256,now=Date.now(),requireReady=false}={}) {
 if(!/^[a-f0-9]{64}$/.test(approvedSha256??'')||sha(JSON.stringify(packet?.manifest))!==approvedSha256)fail('approved manifest SHA differs')
 const rebuilt=buildHnsWomenPacket({documents:packet.documents,sourceBudget:packet.manifest.sourceBudget,sourceCommit:packet.manifest.sourceCommit,firstFantasyRound:packet.manifest.firstFantasyRound,now})
 if(JSON.stringify(rebuilt.manifest)!==JSON.stringify(packet.manifest))fail('manifest facts differ from full strict raw replay')
 if(requireReady&&!rebuilt.manifest.releaseReady)fail('elapsed prelaunch round still has unpublished reports')
 return rebuilt.manifest
}
export function readHnsWomenCaptures({captureDir,pilotDir,currentFile}) {
 if(!/^[a-z0-9-]+\.html$/.test(currentFile??''))fail('explicit current capture filename required')
 const records=[]
 for(const [dir,file]of [[captureDir,'manifest.jsonl'],[pilotDir,'hns-manifest.jsonl']])for(const raw of readFileSync(resolve(dir,file),'utf8').trim().split('\n').map(JSON.parse))records.push({...raw,dir})
 const load=r=>{
  if(!r||!/^[-a-z0-9]+\.html$/.test(r.file??''))fail('missing/unsafe original capture receipt')
  const path=resolve(r.dir,r.file),st=lstatSync(path)
  if(!st.isFile()||st.isSymbolicLink())fail('capture file/symlink unsafe')
  const identity=canonicalURL(r.url),body=readFileSync(path,'utf8')
  return validateHnsWomenDocument({url:r.url,file:identity.kind==='natjecanja'?`documents/schedule-${identity.id}.html`:`documents/match-${identity.id}.html`,capturedAt:r.capturedUTC??r.captureUTC,status:r.status??r.httpStatus,bytes:r.bytes,sha256:r.sha256,body})
 }
 const current=load(records.find(r=>r.dir===captureDir&&r.file===currentFile)),archive=load(records.find(r=>r.dir===captureDir&&r.file==='spring-magenta.html'))
 if(current.id!=='114471579'||archive.id!=='108043476')fail('wrong main source containers')
 const documents=[archive,current]
 for(const [d,code]of [[archive,'108043476'],[current,'114471579']])for(const f of hnsWomenScheduleFixtures(d.body,code).filter(f=>f.izid)) {
  // Rechecks never replace the original receipt or manufacture freshness.
  // Select the most recent captured bytes for each currently published report.
  const candidates=records.filter(r=>/^https:\/\/semafor\.hns\.family\/utakmice\//.test(r.url)&&canonicalURL(r.url).id===f.id)
  if(candidates.some(r=>!iso(r.capturedUTC??r.captureUTC)))fail('invalid original report capture time')
  const r=candidates.sort((a,b)=>Date.parse(b.capturedUTC??b.captureUTC)-Date.parse(a.capturedUTC??a.captureUTC))[0]
  documents.push(load(r))
 }
 return{documents,sourceBudget:{hnsRequests:records.length,otherRequests:1,total:records.length+1,refusalObserved:existsSync(resolve(captureDir,'STOP'))||records.some(r=>[401,403,429].includes(r.status??r.httpStatus))}}
}
export function readHnsWomenPacket(directory,{approvedSha256,now=Date.now(),requireReady=false}={}) {
 const root=resolve(directory),folder=lstatSync(root),documentFolder=lstatSync(join(root,'documents'))
 if(!folder.isDirectory()||folder.isSymbolicLink()||!documentFolder.isDirectory()||documentFolder.isSymbolicLink())fail('unsafe packet directory/symlink')
 const read=(file,max)=>{const path=join(root,file),stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>max)fail('unsafe packet file/symlink/size');return readFileSync(path,'utf8')}
 const raw=read('manifest.json',10000000)
 if(!/^[a-f0-9]{64}$/.test(approvedSha256??'')||sha(raw)!==approvedSha256)fail('approved manifest bytes SHA differs')
 const manifest=JSON.parse(raw)
 if(!Array.isArray(manifest.documents)||manifest.documents.length>133)fail('invalid packet documents')
 const names=manifest.documents.map(d=>d.file)
 if(names.some(file=>!/^documents\/(?:match|schedule)-[1-9]\d*\.html$/.test(file))||new Set(names).size!==names.length)fail('unsafe/duplicate packet document path')
 if(readdirSync(root).sort().join(',')!=='documents,manifest.json'||readdirSync(join(root,'documents')).sort().join(',')!==names.map(file=>file.slice(10)).sort().join(','))fail('unexpected packet files')
 const packet={manifest,documents:manifest.documents.map(d=>({...d,body:read(d.file,2000000)}))}
 validateHnsWomenPacket(packet,{approvedSha256,now,requireReady});return packet
}
export function writeHnsWomenPacket(packet,directory) {
 mkdirSync(directory,{recursive:true,mode:0o700});if(readdirSync(directory).length)fail('packet output directory must be empty')
 mkdirSync(join(directory,'documents'),{mode:0o700})
 for(const d of packet.documents)writeFileSync(join(directory,d.file),d.body,{mode:0o600})
 const raw=JSON.stringify(packet.manifest);writeFileSync(join(directory,'manifest.json'),raw,{mode:0o600});return sha(raw)
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 const [mode,captureDir,pilotDir,currentFile,sourceCommit,out]=process.argv.slice(2)
 if(mode!=='prepare'||!out)fail('usage: prepare captureDir pilotDir currentFilename sourceCommit outputDir')
 const packet=buildHnsWomenPacket({...readHnsWomenCaptures({captureDir,pilotDir,currentFile}),sourceCommit}),approvedSha256=writeHnsWomenPacket(packet,out)
 console.log(JSON.stringify({approvedSha256,coverage:packet.manifest.coverage,releaseReady:packet.manifest.releaseReady,pending:packet.manifest.releaseBlockingPendingIds,future:packet.manifest.future,capturedAt:packet.manifest.schedules.map(s=>s.capturedAt)}))
}
