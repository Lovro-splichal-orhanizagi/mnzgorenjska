// Pure post-import/repricing DATA checks. No source/native authentication,
// activation capability, writes, transport or launch replacement is supplied.
import {createHash} from 'node:crypto'
import {verifyFcfPriceReplay,cheapestFcfLegal15} from './fcf-target-readiness.mjs'
import {verifyFcfFutureLaunch} from './fcf-future-launch.mjs'

const slug='es-ct-tercera-g9',code='4118349-4118588',season='2026/27',protocol='future-g9-after-six-v1'
const fail=m=>{throw Error(`FCF_FUTURE_READINESS: ${m}`)}
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype
const positive=n=>Number.isSafeInteger(n)&&n>0
const hex=(s,n)=>typeof s==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(s)
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
function canonical(x){
 if(x===null||typeof x==='string'||typeof x==='boolean'||typeof x==='number'&&Number.isFinite(x))return x
 if(Array.isArray(x)){if(Object.keys(x).length!==x.length)fail('dense JSON arrays required');return x.map(canonical)}
 if(object(x))return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]))
 fail('finite plain JSON data required')
}
const json=x=>JSON.stringify(canonical(x))
const sortedFixtures=rows=>rows.slice().sort((a,b)=>typeof a?.id==='string'&&typeof b?.id==='string'?a.id.localeCompare(b.id):0)
function club(c){
 if(!object(c)||typeof c.sourceClubId!=='string'||!/^[1-9]\d*$/.test(c.sourceClubId)||typeof c.sourceCategoryId!=='string'||!/^[1-9]\d*$/.test(c.sourceCategoryId)||typeof c.name!=='string'||!c.name.trim())fail('complete canonical source club identity required')
 return {sourceClubId:c.sourceClubId,sourceCategoryId:c.sourceCategoryId,name:c.name}
}
const clubKey=c=>`${c.sourceClubId}/${c.sourceCategoryId}`
const sortedClubs=rows=>rows.map(club).sort((a,b)=>clubKey(a).localeCompare(clubKey(b)))

/**
 * Closed input: {targetSlug,pricingSnapshot,replay,modelSha256,sourceData,
 * launchInput,launchProposal,now?}. SQL snapshotText is returned byte-for-byte.
 * Source DATA is {targetSlug,competition,fixtures,clubs,verifiedKeeperClubs,
 * binding}; binding uses sourceCommit,sourceFingerprintSha256,protocol,
 * sourceClaimState,maximumSourceGETs,priorSourceGETs,newSourceGETs,actualSourceGETs.
 * The eventual authenticated future source getter must supply that data.
 * Its structural validation here does not brand it or establish admission.
 * The supplied proposal describes the actual post-import inactive native
 * beforeimage. SQL must later verify and apply its intended opening transition.
 */
export function buildFcfFutureTargetReadiness(input){
 const keys=['targetSlug','pricingSnapshot','replay','modelSha256','sourceData','launchInput','launchProposal',...(Object.hasOwn(input??{},'now')?['now']:[])]
 if(!object(input)||Object.keys(input).sort().join(',')!==keys.sort().join(','))fail('closed future readiness input required')
 const {targetSlug,pricingSnapshot,replay,modelSha256,sourceData,launchInput,launchProposal}=input,now=input.now===undefined?Date.now():input.now
 if(targetSlug!==slug||!Number.isSafeInteger(now)||!Number.isFinite(new Date(now).getTime()))fail('exact G9 target/current helper clock required')
 const text=pricingSnapshot?.snapshotText,hash=pricingSnapshot?.snapshotSha256
 if(typeof text!=='string'||!text.length||Buffer.byteLength(text)>32*1024*1024||!hex(hash,64)||createHash('sha256').update(text).digest('hex')!==hash)fail('exact SQL dependency snapshot TEXT/SHA required')
 let snapshot;try{snapshot=JSON.parse(text)}catch{fail('invalid SQL dependency snapshot')}
 const priceVector=verifyFcfPriceReplay({targetSlug,snapshot,replay,modelSha256})
 const s=sourceData,c=s?.competition,b=s?.binding
 if(!object(s)||s.targetSlug!==slug||!object(c)||c.id!==797||c.slug!==slug||c.source!=='fcf'||c.source_league_code!==code||c.source_policy!=='es-fcf-six-reviewed-history-v1'||c.active!==false||c.sezona_koledarska!==false||Object.hasOwn(c,'season')&&c.season!==season||!Array.isArray(s.fixtures)||s.fixtures.length!==240||!Array.isArray(s.clubs)||s.clubs.length!==16||!Array.isArray(s.verifiedKeeperClubs)||s.verifiedKeeperClubs.length!==16)fail('complete exact G9 source240/16/keeper data required')
 if(!object(b)||b.protocol!==protocol||b.sourceClaimState!=='consumed'||!hex(b.sourceFingerprintSha256,64)||!hex(b.sourceCommit,40)||b.priorSourceGETs!==37||b.newSourceGETs!==240||b.actualSourceGETs!==277||b.maximumSourceGETs!==478)fail('future consumed source SHA/fingerprint/37+240 ledger required')
 if(!object(launchInput)||launchInput.targetSlug!==slug||launchInput.competitionId!==797||launchInput.sourceCode!==code||launchInput.season!==season||!hex(launchInput.writerCommit,40)||launchInput.sourceFingerprintSha256!==b.sourceFingerprintSha256||!Array.isArray(launchInput.fixtures)||json(sortedFixtures(s.fixtures))!==json(sortedFixtures(launchInput.fixtures)))fail('source and launch canonical scope/fingerprint/fixtures differ')
 // Override any earlier caller clock. Verification holds the same proposal;
 // it never selects a replacement round or applies a native transition.
 const verifiedProposal=verifyFcfFutureLaunch({...launchInput,now},launchProposal)
 const fixtureClubs=new Map(),clubs=sortedClubs(s.clubs),clubKeys=clubs.map(clubKey)
 for(const c of s.fixtures.flatMap(f=>f.clubs)){
  const value=club(c),key=clubKey(value),previous=fixtureClubs.get(key)
  if(previous&&json(previous)!==json(value))fail('source club identity/name differs inside canonical calendar')
  fixtureClubs.set(key,value)
 }
 if(fixtureClubs.size!==16||new Set(clubKeys).size!==16||json(clubs)!==json(sortedClubs([...fixtureClubs.values()]))||new Set(s.verifiedKeeperClubs).size!==16||json(s.verifiedKeeperClubs.slice().sort())!==json(clubKeys.slice().sort()))fail('source clubs and complete verified keeper clubs differ')
 const players=snapshot.players
 if(players.some(p=>!object(p)||!positive(p.id)||p.competition_id!==797||typeof p.active!=='boolean'||!Object.hasOwn(p,'position')||p.position!==null&&!['GK','DEF','MID','FWD'].includes(p.position)||!Object.hasOwn(p,'position_source')||p.position_source!==null&&typeof p.position_source!=='string'||p.active&&!positive(p.team_id)))fail('complete target797 persisted players/boolean activity/positions required')
 const pool=players.filter(p=>p.active),teams=new Set(launchInput.mapping.flatMap(m=>[m.homeTeamId,m.awayTeamId])),activeTeams=new Set(pool.map(p=>p.team_id))
 if(teams.size!==16||activeTeams.size!==16||[...activeTeams].some(id=>!teams.has(id)))fail('actual active clubs differ from validated sixteen-team mapping')
 if([...teams].some(id=>!pool.some(p=>p.team_id===id&&p.position==='GK'&&p.position_source==='zapisnik')))fail('every mapped active club needs an active official source goalkeeper')
 const squad=cheapestFcfLegal15(pool)
 if(!squad||squad.cost>100||Math.max(...pool.map(p=>Number(p.value)))<8||pool.filter(p=>Number(p.value)===4.5).length/pool.length>.7)fail('actual varied prices/default share and affordable legal15 required')
 return freeze({modelSha256,pricingSnapshotText:text,pricingSnapshotSha256:hash,priceVector,squad:squad.squad.map(p=>({id:p.id})),cheapestLegal15:squad.cost,launchProposal:verifiedProposal})
}
