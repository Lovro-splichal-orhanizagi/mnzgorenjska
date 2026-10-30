// Durable installed authority only. The service-only RPC independently rechecks
// private marker/receipt/current native row and zero appearances/goals on each load.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {historicalStatisticsPolicySha256 as hash} from './historical-statistics-policy.mjs'
const policy=JSON.parse(readFileSync(new URL('../policies/fcf-g1-4109410-supplement.json',import.meta.url),'utf8'))
const policySha='7e72c15684c02ce7556921224971bc0f302acc19c786852f92920832f318eaac',contexts=new WeakSet(),markers=new WeakSet()
const fail=m=>{throw Error(`FCF G1 installed supplement: ${m}; HOLD`)},same=(a,b)=>hash(a)===hash(b),sha=s=>createHash('sha256').update(s).digest('hex'),digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s),positive=n=>Number.isSafeInteger(n)&&n>0
const keys=(o,ks)=>o!=null&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...ks].sort().join(',')
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
if(hash(policy)!==policySha)fail('reviewed policy hash differs')
freeze(policy)
export const isFcfG1Supplement4109410Competition=c=>c?.slug==='es-ct-segona-g1'
function tuple(c){if(c?.id!==783||c.slug!==policy.competitionSlug||c.source!=='fcf'||c.source_policy!=='es-fcf-six-reviewed-history-v1'||c.source_league_code!=='4109388-4109627'||c.sezona_koledarska!==false||!/^\d{4}-\d\d-\d\d$/.test(c.firstFantasyPlayedOn??'')||c.firstFantasyPlayedOn<=policy.fixture.playedOn)fail('exact G1 competition/code/season/prelaunch tuple required')}
const rowKeys=['id','round_id','home_team_id','away_team_id','played_on','zapisnik_id','source_url','source_phase','source_round','home_goals','away_goals','imported_at','kontumacija','vir_brez_izida','import_warnings','statistics_status','statistics_reason']
function rowIdentity(m,n){return keys(m,rowKeys)&&m.id===n.matchId&&m.round_id===n.roundId&&m.home_team_id===n.homeTeamId&&m.away_team_id===n.awayTeamId&&m.played_on===policy.fixture.playedOn&&m.source_phase===null&&m.imported_at===null&&m.kontumacija===false&&Array.isArray(m.import_warnings)&&m.import_warnings.length===0}
function installedData(data){
 if(!keys(data,['binding','afterImage','receipt']))fail('complete installed getter result required')
 const {binding:b,afterImage:m,receipt:r}=data,bk=['schemaVersion','kind','policyId','policySha256','approvalReference','approvedOriginalSha256','fixture','native','sourceCommit','sourceFingerprintSha256']
 if(!keys(b,[...bk,...(Object.hasOwn(b??{},'prelaunch')?['prelaunch']:[])])||b.schemaVersion!==1||b.kind!=='fcf-g1-native-supplement-4109410'||b.policyId!==policy.id||b.policySha256!==policySha||b.approvalReference!==policy.approvalReference||b.approvedOriginalSha256!==policy.approvedOriginalSha256||!same(b.fixture,policy.fixture)||!keys(b.native,['matchId','roundId','homeTeamId','awayTeamId'])||!Object.values(b.native).every(positive)||b.native.homeTeamId===b.native.awayTeamId||!/^[a-f0-9]{40}$/.test(b.sourceCommit??'')||!digest(b.sourceFingerprintSha256))fail('exact approved binding/native identity required')
 if(!rowIdentity(m,b.native)||m.zapisnik_id!=='es4109410'||m.source_url!==policy.fixture.sourceUrl||m.source_round!==3||m.home_goals!==null||m.away_goals!==null||m.vir_brez_izida!==false||m.statistics_status!=='unavailable_historical'||m.statistics_reason!==policy.reasonCode)fail('immutable native NULL afterimage differs')
 if(!keys(r,['schemaVersion','kind','sourceCommit','sourceFingerprintSha256','policySha256','beforeSha256','afterSha256'])||r.schemaVersion!==1||r.kind!=='fcf-g1-supplement-4109410-installed'||r.sourceCommit!==b.sourceCommit||r.sourceFingerprintSha256!==b.sourceFingerprintSha256||r.policySha256!==policySha||!digest(r.beforeSha256)||!digest(r.afterSha256))fail('installed receipt differs')
 // Receipt before/after hashes cover SQL jsonb text and are checked by the RPC;
 // optional original placeholder TEXT has its own byte digest, preserved verbatim.
 if(Object.hasOwn(b,'prelaunch')){
  const p=b.prelaunch
  if(!keys(p,['kind','beforeImageText','beforeSha256'])||p.kind!=='exact-legacy-placeholder-v1'||typeof p.beforeImageText!=='string'||Buffer.byteLength(p.beforeImageText)<2||Buffer.byteLength(p.beforeImageText)>8192||!digest(p.beforeSha256)||sha(p.beforeImageText)!==p.beforeSha256)fail('original prelaunch TEXT/SHA differs')
  let before;try{before=JSON.parse(p.beforeImageText)}catch{fail('original prelaunch TEXT is not JSON')}
  if(!rowIdentity(before,b.native)||before.zapisnik_id!==null||before.source_url!=='https://www.fcf.cat/ca/competicio/acta/4109388'||before.source_round!==null||before.home_goals!==0||before.away_goals!==0||before.vir_brez_izida!==true||before.statistics_status!=='available'||before.statistics_reason!==null)fail('original placeholder identity differs')
 }
 return data
}
export async function loadFcfG1Installed4109410Supplement(db,competition){
 tuple(competition)
 const {data,error}=await db.rpc('get_installed_fcf_g1_4109410_supplement')
 if(error)fail('cannot verify installed9410 RPC')
 if(data===null)return null
 const verified=freeze(structuredClone(installedData(data))),b=verified.binding,n=b.native
 const marker=freeze({sourceMatchId:'4109410',reportId:'es4109410',fixture:policy.fixture,policyId:policy.id,policySha256:policySha,approvedOriginalSha256:policy.approvedOriginalSha256,...n,statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0})
 markers.add(marker)
 const context=freeze({kind:'fcf-g1-installed-4109410-context',verified,marker})
 contexts.add(context)
 return context
}
export function requireFcfG1Installed4109410Supplement({competition,installedG1Supplement}){tuple(competition);if(!contexts.has(installedG1Supplement))fail('genuine service-loaded private context required');return installedG1Supplement}
export function isFcfG1Supplement4109410Report({competition,installedG1Supplement,id}){
 if(String(id)!=='es4109410')return false
 requireFcfG1Installed4109410Supplement({competition,installedG1Supplement});return true
}
export function isFcfG1Supplement4109410UnknownResultMarker(marker){return markers.has(marker)}
export function isFcfG1Supplement4109410CalendarIdentity({marker,g,code}){
 return markers.has(marker)&&code==='4109388-4109627'&&same(g,{domaci:policy.homeName,gostje:policy.awayName,datum:policy.fixture.playedOn,ura:policy.fixture.kickoff,izid:null,krog:3,sezona:policy.season,tekmovanje:'SEGONA CATALANA',skupina:'GRUP 1'})
}
export function fcfG1Supplement4109410Calendar(input){
 const {marker}=requireFcfG1Installed4109410Supplement(input),f=marker.fixture
 return {id:4109410,historicalMarker:marker,g:{domaci:policy.homeName,gostje:policy.awayName,datum:f.playedOn,ura:f.kickoff,izid:null,krog:f.sourceRound,sezona:f.season,tekmovanje:'SEGONA CATALANA',skupina:'GRUP 1'}}
}
