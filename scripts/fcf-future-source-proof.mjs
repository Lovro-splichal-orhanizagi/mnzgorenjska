// Pure per-document G9 canonicalization. Caller-authored receipt/lineage fields
// are checked structurally; they are NOT authenticated reader capabilities.
// No source requests, source admission, claim, launch choice or database writes.
import {createHash} from 'node:crypto'
import {deriveFcfInventoryHeader} from './fcf-missing-inventory-plan.mjs'
import {parseFcfFutureAuditDocument} from './fcf-current-source-proof.mjs'
import {getFcfSixPolicy,FCF_SIX_SOURCE_POLICY,verifyFcfSixFreshHistoricalSource} from './fcf-six-historical-policy.mjs'
import {validateFcfSingleReportSource,najvecStarost} from './viri/fcf.mjs'
import {validUTC,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
import {historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'

const slug='es-ct-tercera-g9',code='4118349-4118588',season='2026/27'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-fcf-zgodovina.yml'
const fail=message=>{throw Error(`FCF_FUTURE_SOURCE_PROOF: ${message}`)}
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const nativeId=x=>typeof x==='string'&&/^[1-9]\d{0,19}$/.test(x)
const hex=(x,length)=>typeof x==='string'&&new RegExp(`^[a-f0-9]{${length}}$`).test(x)

function source(document,competition,now){
 const {id,html,receipt:r,lineage:l}=document
 if(typeof html!=='string'||html.charCodeAt(0)===0xfeff||!Buffer.byteLength(html)||Buffer.byteLength(html)>2097152||Buffer.from(html,'utf8').toString('utf8')!==html||!record(r)||r.id!==id||r.competitionSlug!==competition.slug||r.sourceUrl!==`https://www.fcf.cat/ca/competicio/acta/${id}`||r.bytes!==Buffer.byteLength(html)||!hex(r.rawSha256,64)||sha(html)!==r.rawSha256)fail('actual raw bytes/receipt binding differs')
 if(!record(l)||l.kind!=='actions-artifact'||l.verified!==true||l.repository!==repository||l.workflow!==workflow||!nativeId(l.runId)||!nativeId(l.artifactId)||typeof l.artifactDigest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(l.artifactDigest)||!hex(l.commit,40))fail('structural Actions artifact lineage differs; reader authentication remains required')
 if(r.cacheMtimeUTC!==null||!validUTC(r.startedUTC)||!validUTC(r.capturedUTC))fail('actual UTC source capture required; cache timestamps are not capture evidence')
 const start=Date.parse(r.startedUTC),captured=Date.parse(r.capturedUTC)
 if(start>captured||captured>now||now-start>86400000||now-captured>86400000)fail('stale/future or reversed source capture timestamps')
 // Return detached data, never the caller's mutable receipt or lineage.
 return {...structuredClone(r),lineage:structuredClone(l)}
}

/**
 * Input is {competition,document,now?}; document has id (numeric source string),
 * expectedSourceRound, html, flat receipt and Actions-shaped lineage, as on the
 * existing pure document prover. Scope is only inactive G9/797 current2026/27.
 * Every source observation is an actual <=24h capture with cacheMtimeUTC:null.
 * A firstFantasyPlayedOn field is neither required nor used. This function
 * cannot establish completeness of a240-fixture calendar or a future opening.
 *
 * Historical canonicals keep null individual statistics and separately bind
 * the immutable approved original SHA and the fresh observation SHA under
 * source.historicalObservation. The latter grants no installation authority:
 * authenticated new source evidence AND original cleanup proof remain separate.
 */
export function proveFcfFutureSourceDocument({competition:c,document:d,now=Date.now()}){
 if(!record(c)||c.id!==797||c.slug!==slug||c.source!=='fcf'||c.source_policy!==FCF_SIX_SOURCE_POLICY||c.source_league_code!==code||c.active!==false||c.sezona_koledarska!==false||Object.hasOwn(c,'season')&&c.season!==season||!Number.isFinite(now)||!Number.isFinite(new Date(now).getTime()))fail('exact inactive G9 current source/policy/calendar/clock required')
 if(!record(d)||!nativeId(d.id)||Number(d.id)<4118349||Number(d.id)>4118588||!Number.isInteger(d.expectedSourceRound)||d.expectedSourceRound<1||d.expectedSourceRound>30)fail('exact G9 source ID and actual round1–30 required')
 const provenance=source(d,c,now),header=deriveFcfInventoryHeader({targetSlug:slug,id:d.id,bytes:Buffer.from(d.html,'utf8')})
 // Preserve the shared current-season/source identity check for historical as
 // well as normal pages; no expired prelaunch-date or R6 choice is involved.
 const providerHeader=validateFcfSingleReportSource(d.html,code,{id:`es${d.id}`,tekmovanje:c,sezona:season,danes:now})
 if(now-Date.parse(d.receipt.capturedUTC)>najvecStarost(providerHeader,now,false))fail('provider source freshness expired')
 if(header.round!==d.expectedSourceRound)fail('actual source round differs from inventory')
 const policy=getFcfSixPolicy(slug),entry=policy.entries.find(e=>e.sourceMatchId===d.id)
 let canonical
 if(entry){
  const observation=verifyFcfSixFreshHistoricalSource({targetSlug:slug,id:d.id,html:d.html})
  provenance.historicalObservation=observation
  canonical={statisticsStatus:'unavailable_historical',statisticsReason:entry.reasonCode,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),sourceFixture:observation.fixture,report:null,appearances:null,goals:null}
 }else{
  const parsed=parseFcfFutureAuditDocument({id:d.id,competitionSlug:slug,expectedSourceRound:d.expectedSourceRound,html:d.html,receipt:d.receipt,now})
  canonical={statisticsStatus:parsed.status==='complete'?'available':'pending',statisticsReason:null,policyId:null,policySha256:null,sourceFixture:null,report:parsed.report,appearances:parsed.appearances,goals:parsed.report?.goli??null}
 }
 const clubs=[header.home,header.away].map(({sourceClubId,sourceCategoryId,name})=>({sourceClubId,sourceCategoryId,name}))
 return frozenJSON({id:`es${d.id}`,round:header.round,date:header.playedOn,time:header.kickoff,homeGoals:header.homeGoals,awayGoals:header.awayGoals,clubs,source:provenance,...canonical})
}
