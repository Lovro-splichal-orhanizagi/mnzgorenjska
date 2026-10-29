// Current-season-only READ-ONLY readiness. No import packet, source/native
// admission, installed marker, SQL, pricing or activation authority is issued.
import {createHash} from 'node:crypto'
import {getFcfG1FinalizedRemainderData} from './fcf-g1-remainder-source.mjs'
import {getFcfG1Approved4109410Policy,verifyFcfG1Approved4109410Observation,fcfG1Approved4109410PolicySha256} from './fcf-g1-4109410-policy.mjs'
import {getFcfG1SupplementalPolicy,verifyFcfG1SupplementalObservation} from './fcf-g1-4109409-policy.mjs'
import {getFcfSixPolicy,verifyFcfSixFreshHistoricalSource} from './fcf-six-historical-policy.mjs'
import {deriveFcfInventoryHeader} from './fcf-missing-inventory-plan.mjs'
import {classifyFcfG1QuarantineDocument} from './fcf-g1-quarantine-audit.mjs'
import {parseFcfFutureAuditDocument} from './fcf-current-source-proof.mjs'
import {validateFcfSingleReportSource,najvecStarost} from './viri/fcf.mjs'
import {validateFcfCurrentReleaseCalendar} from './fcf-historical-release.mjs'
import {exactKeys,frozenJSON,validUTC} from './fcf-missing-inventory-artifact.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const slug='es-ct-segona-g1',code='4109388-4109627',flags={admissible:false,nativeAdmission:false,activationEligible:false},states=new WeakMap(),sha=b=>createHash('sha256').update(b).digest('hex'),fail=m=>{throw Error('FCF_G1_NATIVE_READINESS: '+m)},url=id=>`https://www.fcf.cat/ca/competicio/acta/${id}`
function document(d){
 const r=d?.receipt,o=d?.origin,b=d?.raw
 if(!d||!Buffer.isBuffer(b)||!b.length||b.length>2097152||d.url!==url(d.id)||sha(b)!==d.sha256||b.length!==d.byteLength||r?.id!==d.id||r.sequence!==o?.sequence||r.method!=='GET'||r.responseURL!==d.url||r.redirected!==false||!validUTC(r.startedUTC))fail('original complete byte/receipt/origin binding required')
 const ended=r.capturedUTC??r.endedUTC
 if(!validUTC(ended)||Date.parse(r.startedUTC)>Date.parse(ended)||Date.parse(ended)>Date.now()||Date.now()-Date.parse(r.startedUTC)>86400000||r.bytes!==b.length||!(r.httpStatus===200&&r.bodyState==='complete'&&r.rawSha256===d.sha256||r.status===200&&r.bodyComplete===true&&r.sha256===d.sha256)||!/^\d+$/.test(o.runId??'')||!/^\d+$/.test(o.jobId??'')||!/^[a-f0-9]{40}$/.test(o.sourceCommit??''))fail('original body completion/capture clock required')
 const html=new TextDecoder('utf-8',{fatal:true}).decode(b)
 if(html.charCodeAt(0)===0xfeff)fail('original UTF8 without BOM required')
 return {html,source:{sourceUrl:d.url,rawSha256:d.sha256,receipt:structuredClone(r),origin:structuredClone(o)},capturedUTC:ended}
}
/** Pure source DATA analysis, including fixtures that remain blocked. Never an
 * authority API: callers can supply documents, but cannot mint the private cap. */
export function describeFcfG1QuarantineNativeData(input){
 exactKeys(input,['documents'],'read-only G1 DATA');const {documents}=input
 if(!Array.isArray(documents)||documents.length!==240||documents.some((d,i)=>d?.id!==String(4109388+i)))fail('whole ordered240 required')
 const fixtures=[],stale=[],unresolved=[],policy=getFcfSixPolicy(slug),keepers=new Map()
 for(const d of documents){
  const {html,source,capturedUTC}=document(d),provider=validateFcfSingleReportSource(html,code,{id:'es'+d.id,tekmovanje:{slug,source:'fcf',source_league_code:code,sezona_koledarska:false},sezona:'2026/27',danes:Date.now()}),ttl=najvecStarost(provider,Date.now(),false)
  if(Date.now()-Date.parse(capturedUTC)>ttl)stale.push({id:d.id,capturedUTC,maximumAgeMs:ttl})
  let header,canonical
  const old=policy.entries.find(e=>e.sourceMatchId===d.id)
  if(old||d.id==='4109409'||d.id==='4109410'){
   const p=old?policy:d.id==='4109409'?getFcfG1SupplementalPolicy():getFcfG1Approved4109410Policy(),observation=old?verifyFcfSixFreshHistoricalSource({targetSlug:slug,id:d.id,html}):d.id==='4109409'?verifyFcfG1SupplementalObservation({targetSlug:slug,id:d.id,html}):verifyFcfG1Approved4109410Observation({targetSlug:slug,id:d.id,html})
   // Old original observations carry immutable fixture metadata but no header.
   header=old?classifyFcfG1QuarantineDocument({id:d.id,bytes:d.raw}).calendarHeader:observation.header
   source[old?'historicalObservation':'supplementalObservation']=observation
   canonical={statisticsStatus:'unavailable_historical',statisticsReason:old?.reasonCode??p.reasonCode,policyId:p.id,policySha256:hash(p),sourceFixture:observation.fixture,report:null,appearances:null,goals:null}
  }else if(provider.zaprt&&provider.izid===null){
   const c=classifyFcfG1QuarantineDocument({id:d.id,bytes:d.raw});if(c.classification!=='closed-result-unavailable')fail('unrecognized closed unknown score')
   header=c.calendarHeader;unresolved.push(d.id);canonical={statisticsStatus:'unresolved',statisticsReason:'unapproved_closed_result_unavailable',policyId:null,policySha256:null,sourceFixture:null,report:null,appearances:null,goals:null}
  }else{
   header=deriveFcfInventoryHeader({targetSlug:slug,id:d.id,bytes:d.raw});const p=parseFcfFutureAuditDocument({id:d.id,competitionSlug:slug,expectedSourceRound:header.round,html,receipt:{id:d.id,competitionSlug:slug,sourceUrl:d.url,bytes:d.byteLength,rawSha256:d.sha256},now:Date.now()})
   canonical={statisticsStatus:p.status==='complete'?'available':'pending',statisticsReason:null,policyId:null,policySha256:null,sourceFixture:null,report:p.report,appearances:p.appearances,goals:p.report?.goli??null}
  }
  const clubs=[header.home,header.away].map(({sourceClubId,sourceCategoryId,name})=>({sourceClubId,sourceCategoryId,name}))
  if(canonical.statisticsStatus==='available')for(const side of[0,1]){const key=clubs[side].sourceClubId+'/'+clubs[side].sourceCategoryId;if(!keepers.has(key))keepers.set(key,new Set());for(const a of canonical.appearances.filter(a=>a.ekipaIdx===side&&a.vratar===true&&a.minute>0))keepers.get(key).add(a.regSt)}
  fixtures.push({id:'es'+d.id,round:header.round,date:header.playedOn,time:header.kickoff,homeGoals:header.homeGoals,awayGoals:header.awayGoals,clubs,source,...canonical})
 }
 const calendar=validateFcfCurrentReleaseCalendar(fixtures),firstSourceUTC=new Date(Math.min(...documents.map(d=>Date.parse(d.receipt.startedUTC)))).toISOString(),sourceFreshUntil=new Date(Date.parse(firstSourceUTC)+86400000).toISOString()
 return frozenJSON({schemaVersion:1,kind:'fcf-g1-quarantine-native-read-only-plan',targetSlug:slug,competitionId:783,sourceCode:code,season:'2026/27',firstSourceUTC,sourceFreshUntil,supplement4109410PolicySha256:fcfG1Approved4109410PolicySha256(),classificationCounts:Object.fromEntries(['available','pending','unavailable_historical','unresolved'].map(k=>[k,fixtures.filter(f=>f.statisticsStatus===k).length])),unresolvedReportIds:unresolved,providerStaleDocuments:stale,clubs:calendar.clubs,verifiedKeeperClubs:calendar.verifiedKeeperClubs,keeperCoverage:calendar.clubs.map(c=>({...c,officialKeeperRegistrations:[...(keepers.get(c.sourceClubId+'/'+c.sourceCategoryId)??[])].sort((a,b)=>a-b)})),fixtures,blockers:[...unresolved.map(id=>'UNAPPROVED_CLOSED_RESULT:'+id),...(stale.length?['PROVIDER_FRESHNESS_EXPIRED']:[]),'NATIVE_SOURCE_PROTOCOL_AND_4109410_FORWARD_SQL_NOT_INSTALLED','FRESH_LOCKED_NATIVE_INVENTORY_NOT_OBSERVED','GK_NATIVE_POSITION_AND_PRICE_REPLAY_NOT_PROVEN','LEGAL15_BUDGET100_MAX3_NOT_PROVEN','AFFECTED_TEAMS_VOTES_PRIVACY_NOT_PROVEN','FUTURE_OFFICIAL_OPENING_AND_DEADLINE_NOT_PROVEN'],nativeIdentity4109410:{matchId:null,roundId:null,homeTeamId:null,awayTeamId:null},...flags})
}
/** The private source getter requires finalized hosted accounting, actual claim,
 * consumption and complete240. It is not the legacy native-admission issuer. */
export function readFcfG1QuarantineNativeReadiness(input){
 exactKeys(input,['rawProof'],'private G1 readiness input');const raw=getFcfG1FinalizedRemainderData(input.rawProof),data=describeFcfG1QuarantineNativeData({documents:raw.documents}),proof=Object.freeze({kind:'fcf-g1-native-readiness-proof',...flags})
 if(data.firstSourceUTC!==raw.manifest.firstSourceUTC||data.sourceFreshUntil!==raw.manifest.sourceFreshUntil)fail('original oldest source clock differs')
 states.set(proof,{rawProof:input.rawProof,data,binding:{...raw.binding,finalReceipt:raw.finalReceipt,ancestry:raw.ancestry,firstSourceUTC:raw.manifest.firstSourceUTC,sourceFreshUntil:raw.manifest.sourceFreshUntil,actualSourceGETs:raw.manifest.actualSourceGETs,maximumCumulativeSourceGETs:raw.manifest.maximumCumulativeSourceGETs}});return proof
}
export function getFcfG1QuarantineNativeReadiness(proof){
 const state=states.get(proof);if(!state)fail('private read-only readiness proof required');const raw=getFcfG1FinalizedRemainderData(state.rawProof)
 if(raw.binding.manifestSha256!==state.binding.manifestSha256||Date.now()>Date.parse(state.binding.sourceFreshUntil))fail('original source binding/freshness changed')
 const data=structuredClone(state.data);data.providerStaleDocuments=data.fixtures.flatMap(f=>{const stamp=f.source.receipt.capturedUTC??f.source.receipt.endedUTC,h={datum:f.date,izid:f.homeGoals===null?null:{domaci:f.homeGoals,gostje:f.awayGoals},zaprt:f.statisticsStatus!=='pending'},ttl=najvecStarost(h,Date.now(),false);return Date.now()-Date.parse(stamp)>ttl?[{id:f.id.slice(2),capturedUTC:stamp,maximumAgeMs:ttl}]:[]})
 if(data.providerStaleDocuments.length&&!data.blockers.includes('PROVIDER_FRESHNESS_EXPIRED'))data.blockers.push('PROVIDER_FRESHNESS_EXPIRED')
 return{...data,sourceBinding:structuredClone(state.binding),...flags}
}
