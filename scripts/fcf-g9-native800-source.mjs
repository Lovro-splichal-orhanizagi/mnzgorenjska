// Additive G9 semantic source capability. Only the real refresh800 getter can
// supply authenticated originals. No SQL/native/activation authority is issued.
import {createHash} from 'node:crypto'
import {getFcfRefresh800CapturedData,FCF_REFRESH800_PROFILE} from './fcf-refresh800-contract.mjs'
import {validateFcfSingleReportSource,najvecStarost} from './viri/fcf.mjs'
import {classifyFcfG9Native800Document} from './fcf-g9-native800-classifier.mjs'
import {parseFcfFutureAuditDocument} from './fcf-current-source-proof.mjs'
import {validateFcfCurrentReleaseCalendar} from './fcf-historical-release.mjs'
import {getFcfSixPolicy} from './fcf-six-historical-policy.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {exactKeys,frozenJSON,validUTC} from './fcf-missing-inventory-artifact.mjs'
export const FCF_G9_NATIVE800_PROTOCOL='fcf-g9-native800-v1'
const states=new WeakMap(),slug='es-ct-tercera-g9',code='4118349-4118588',sha=b=>createHash('sha256').update(b).digest('hex'),same=(a,b)=>hash(a)===hash(b),url=id=>`https://www.fcf.cat/ca/competicio/acta/${id}`
const flags={admissible:false,nativeAdmission:false,activationEligible:false,sourceOnly:true,databaseFactsObserved:false}
function hold(reason,diagnostic={}){const error=Error('FCF_G9_NATIVE800_SOURCE: '+reason);error.diagnostic=frozenJSON({reason,...diagnostic,...flags});throw error}
const need=(ok,reason)=>{if(!ok)hold(reason)},hex=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v),positive=v=>typeof v==='string'&&/^[1-9]\d{0,19}$/.test(v)
function capture(input){
 const c=getFcfRefresh800CapturedData(input),b=c.currentCapture,now=Date.now()
 need(c.targetSlug===slug&&same(c.anchor,FCF_REFRESH800_PROFILE.anchor)&&c.cleanupIssuerSourceCommit===FCF_REFRESH800_PROFILE.cleanupIssuerSourceCommit,'exact G9/immutable301/DA lineage required')
 need(b.runId===input.runId&&positive(b.runId)&&hex(b.sourceCommit,40)&&positive(b.artifactId)&&/^sha256:[a-f0-9]{64}$/.test(b.artifactDigest)&&hex(b.manifestSha256,64)&&hex(b.planSha256,64)&&hex(b.runtimeSha256,64)&&b.complete===true&&b.newSourceGETs===240&&b.sourceRefusal===false,'complete authenticated fresh240 capture required')
 need(c.currentCounter.maximumCumulativeSourceGETs===800&&c.currentCounter.actualSourceGETs>=b.actualSourceGETs&&b.actualSourceGETs>=541&&b.actualSourceGETs<=800,'actual cumulative800 accounting required')
 need(Array.isArray(c.documents)&&c.documents.length===240&&c.documents.every((d,i)=>d.id===String(4118349+i)),'whole ordered exact240 source IDs required')
 let previous=null,job=null;const documents=[]
 for(const d of c.documents){
  const r=d.receipt,o=d.origin;exactKeys(r,['id','startedUTC','capturedUTC','httpStatus','bodyState','bytes','rawSha256'],'800 actual receipt');exactKeys(o,['runId','jobId','sourceCommit'],'800 actual origin')
  need(Buffer.isBuffer(d.bytes)&&d.bytes.length>0&&d.bytes.length<=2097152&&r.id===d.id&&r.bytes===d.bytes.length&&r.rawSha256===sha(d.bytes)&&r.httpStatus===200&&r.bodyState==='complete','actual complete body/hash/receipt required')
  need(o.runId===b.runId&&o.sourceCommit===b.sourceCommit&&positive(o.jobId)&&(!job||job===o.jobId),'same actual source run/job/commit required');job=o.jobId
  need(validUTC(r.startedUTC)&&validUTC(r.capturedUTC)&&Date.parse(r.startedUTC)<=Date.parse(r.capturedUTC)&&Date.parse(r.capturedUTC)<=now&&(!previous||Date.parse(r.startedUTC)-Date.parse(previous)>=3000),'actual ordered source receipt clocks required');previous=r.capturedUTC
  let html;try{html=new TextDecoder('utf8',{fatal:true}).decode(d.bytes)}catch{hold('actual UTF8 required')}
  need(html.charCodeAt(0)!==0xfeff&&Buffer.from(html,'utf8').equals(d.bytes),'actual UTF8 without BOM required')
  documents.push({id:d.id,html,url:url(d.id),rawSha256:r.rawSha256,byteLength:r.bytes,receipt:structuredClone(r),origin:structuredClone(o)})
 }
 const first=documents[0].receipt.startedUTC,last=documents.at(-1).receipt.capturedUTC,until=new Date(Date.parse(first)+86400000).toISOString()
 need(b.firstSourceUTC===first&&b.lastSourceEndedUTC===last&&b.sourceFreshUntil===until&&now<=Date.parse(until),'fresh actual24h lease required; never historical301 clock')
 return {c,documents,identity:hash({anchor:c.anchor,cleanupIssuerSourceCommit:c.cleanupIssuerSourceCommit,currentCapture:b,documents:documents.map(d=>({id:d.id,rawSha256:d.rawSha256,receipt:d.receipt,origin:d.origin}))})}
}
function stale(providers){const now=Date.now();return providers.flatMap(p=>{const maximumAgeMs=najvecStarost(p.header,now,false);return now-Date.parse(p.capturedUTC)>maximumAgeMs?[{id:p.id,capturedUTC:p.capturedUTC,maximumAgeMs}]:[]})}
function describe({c,documents}){
 const fixtures=[],providers=[],unresolved=[],policy=getFcfSixPolicy(slug)
 for(const d of documents){
  const provider=validateFcfSingleReportSource(d.html,code,{id:'es'+d.id,tekmovanje:{slug,source:'fcf',source_league_code:code,sezona_koledarska:false},sezona:'2026/27',danes:Date.now()});providers.push({id:d.id,header:provider,capturedUTC:d.receipt.capturedUTC})
  const classification=classifyFcfG9Native800Document({id:d.id,bytes:Buffer.from(d.html)}),header=classification.calendarHeader,old=policy.entries.find(e=>e.sourceMatchId===d.id),source={sourceUrl:d.url,rawSha256:d.rawSha256,capturedUTC:d.receipt.capturedUTC,receipt:d.receipt,origin:d.origin};let canonical
  if(classification.unresolved){unresolved.push({id:d.id,reason:'unapproved_closed_result_unavailable'});continue}
  if(old){const observation=classification.observation;source.historicalObservation=observation;canonical={statisticsStatus:'unavailable_historical',statisticsReason:old.reasonCode,policyId:policy.id,policySha256:hash(policy),sourceFixture:observation.fixture,report:null,appearances:null,goals:null}}
  else{try{const p=parseFcfFutureAuditDocument({id:d.id,competitionSlug:slug,expectedSourceRound:header.round,html:d.html,receipt:{id:d.id,competitionSlug:slug,sourceUrl:d.url,bytes:d.byteLength,rawSha256:d.rawSha256},now:Date.now()});canonical={statisticsStatus:p.status==='complete'?'available':'pending',statisticsReason:null,policyId:null,policySha256:null,sourceFixture:null,report:p.report,appearances:p.appearances,goals:p.report?.goli??null}}catch{unresolved.push({id:d.id,reason:'normal_statistics_unverified'});canonical={statisticsStatus:'unresolved'}}}
  fixtures.push({id:'es'+d.id,round:header.round,date:header.playedOn,time:header.kickoff,homeGoals:header.homeGoals,awayGoals:header.awayGoals,clubs:[header.home,header.away].map(({sourceClubId,sourceCategoryId,name})=>({sourceClubId,sourceCategoryId,name})),source,...canonical})
 }
 if(unresolved.length)hold('unresolved source; no private source capability',{unresolvedReportIds:unresolved.map(x=>x.id),unresolvedReports:unresolved})
 const expired=stale(providers);if(expired.length)hold('provider freshness expired',{providerStaleDocuments:expired})
 let calendar;try{calendar=validateFcfCurrentReleaseCalendar(fixtures)}catch{hold('full30x8/16-club calendar and official GK coverage required')}
 const keeperCoverage=calendar.clubs.map(c=>({...c,officialKeeperRegistrations:[...new Set(fixtures.flatMap(f=>f.statisticsStatus==='available'?f.clubs.flatMap((club,side)=>club.sourceClubId===c.sourceClubId&&club.sourceCategoryId===c.sourceCategoryId?f.appearances.filter(a=>a.ekipaIdx===side&&a.vratar===true&&a.minute>0).map(a=>a.regSt):[]):[]))].sort((a,b)=>a-b)}))
 need(keeperCoverage.length===16&&keeperCoverage.every(c=>c.officialKeeperRegistrations.length>0),'all16 explicit official keeper registrations required')
 const policyHashes={six:hash(policy)},sourceFingerprintSha256=hash({targetSlug:slug,currentCapture:c.currentCapture,policyHashes,fixtures})
 const binding={schemaVersion:1,kind:'fcf-g9-native800-source',protocol:FCF_G9_NATIVE800_PROTOCOL,targetSlug:slug,calendarAuthority:'full-report-derived-240-v1',sourceCommit:c.currentCapture.sourceCommit,sourceClaimState:'consumed',sourceFingerprintSha256,maximumSourceGETs:800,anchor:c.anchor,cleanupIssuerSourceCommit:c.cleanupIssuerSourceCommit,currentCapture:c.currentCapture,policyHashes,firstSourceUTC:c.currentCapture.firstSourceUTC,sourceFreshUntil:c.currentCapture.sourceFreshUntil}
 return {providers,data:frozenJSON({schemaVersion:1,kind:'fcf-g9-native800-source-data',sourceReady:true,expectedTargetOnly:true,competition:{id:797,slug,source:'fcf',source_league_code:code,source_policy:'es-fcf-six-reviewed-history-v1',active:false,sezona_koledarska:false},targetSlug:slug,competitionId:797,sourceCode:code,season:'2026/27',binding,anchor:c.anchor,cleanupIssuerSourceCommit:c.cleanupIssuerSourceCommit,currentCapture:c.currentCapture,firstSourceUTC:binding.firstSourceUTC,sourceFreshUntil:binding.sourceFreshUntil,documents,fixtures,...calendar,keeperCoverage,classificationCounts:Object.fromEntries(['available','pending','unavailable_historical','unresolved'].map(k=>[k,fixtures.filter(f=>f.statisticsStatus===k).length])),unresolvedReportIds:[],unresolvedReports:[],providerStaleDocuments:[],...flags})}
}
export function readFcfG9Native800Source(input){exactKeys(input,['ledgerProof','runId'],'native800 source input');const observed=capture(input),semantic=describe(observed),proof=Object.freeze({kind:'fcf-g9-native800-source-proof',...flags});states.set(proof,{input:{...input},identity:observed.identity,...semantic});return proof}
export function getFcfG9Native800Source(proof){const s=states.get(proof);need(s,'reader-issued private native800 source proof required');const observed=capture(s.input);need(observed.identity===s.identity,'authenticated source identity changed');const expired=stale(s.providers);if(expired.length)hold('provider freshness expired',{providerStaleDocuments:expired});return frozenJSON({...structuredClone(s.data),currentCounter:observed.c.currentCounter})}
