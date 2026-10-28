// Separate one-entry native DATA contract. This never issues source/SQL authority.
import {createHash} from 'node:crypto'
import {getFcfG1SupplementalPolicy,fcfG1SupplementalPolicySha256} from './fcf-g1-4109409-policy.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const fail=m=>{throw Error(`FCF_G1_SUPPLEMENT_NATIVE: ${m}`)},p=getFcfG1SupplementalPolicy(),same=(a,b)=>hash(a)===hash(b),positive=n=>Number.isSafeInteger(n)&&n>0
export function verifyFcfG1SupplementCanonical(f){
 const o=f?.source?.supplementalObservation,fixture=p.fixture
 if(f?.id!=='es4109409'||f.statisticsStatus!=='unavailable_historical'||f.statisticsReason!==p.reasonCode||f.policyId!==p.id||f.policySha256!==fcfG1SupplementalPolicySha256()||f.homeGoals!==null||f.awayGoals!==null||f.report!==null||f.appearances!==null||f.goals!==null||f.round!==3||f.date!==fixture.playedOn||!same(f.sourceFixture,fixture)||f.source?.sourceUrl!==fixture.sourceUrl||!/^[a-f0-9]{64}$/.test(f.source?.rawSha256??'')||!o||o.kind!=='fcf-g1-supplemental-observation'||o.targetSlug!==p.competitionSlug||o.sourceMatchId!=='4109409'||o.policyId!==p.id||o.policySha256!==fcfG1SupplementalPolicySha256()||o.approvalReference!==p.approvalReference||o.approvedOriginalSha256!==p.approvedOriginalSha256||o.freshRawSha256!==f.source.rawSha256||!same(o.fixture,fixture)||!same(f.clubs.map(c=>[c.sourceClubId,c.sourceCategoryId,c.name]),[[fixture.homeSourceClubId,fixture.homeSourceCategoryId,p.homeName],[fixture.awaySourceClubId,fixture.awaySourceCategoryId,p.awayName]]))fail('exact approved supplemental canonical/null individual facts required')
 return f
}
const placeholderFields=['id','round_id','home_team_id','away_team_id','played_on','zapisnik_id','source_url','source_phase','source_round','home_goals','away_goals','imported_at','kontumacija','vir_brez_izida','import_warnings','statistics_status','statistics_reason']
function legacyPlaceholder(m){
 return m&&Object.keys(m).sort().join(',')===[...placeholderFields].sort().join(',')&&m.zapisnik_id===null&&m.source_url==='https://www.fcf.cat/ca/competicio/acta/4109388'&&m.source_phase===null&&m.source_round===null&&m.home_goals===0&&m.away_goals===0&&m.imported_at===null&&m.kontumacija===false&&m.vir_brez_izida===true&&Array.isArray(m.import_warnings)&&m.import_warnings.length===0&&m.statistics_status==='available'&&m.statistics_reason===null
}
function anchoredTeam(data,d,club){
 const ids=new Set()
 for(const m of d.matches){
  if(m.zapisnik_id===null)continue
  const fs=data.fixtures.filter(f=>f.id===m.zapisnik_id),f=fs[0],r=d.rounds.find(r=>r.id===m.round_id)
  if(fs.length!==1||r?.number!==f.round||r.competition_id!==783||r.season!=='2026/27'||m.played_on!==f.date)continue
  f.clubs.forEach((c,side)=>{if(c.sourceClubId===club.sourceClubId&&c.sourceCategoryId===club.sourceCategoryId)ids.add(side?m.away_team_id:m.home_team_id)})
 }
 if(ids.size!==1||!positive([...ids][0]))fail('unique persisted source-backed club/category side anchor required; HOLD')
 return [...ids][0]
}
export function buildFcfG1NativeSupplementBinding({data,databaseInventory:d}){
 const f=verifyFcfG1SupplementCanonical(data?.fixtures?.find(f=>f.id==='es4109409')),keyed=d?.matches?.filter(m=>m.zapisnik_id==='es4109409')??[],installed=d?.supplementalMarker
 let m=keyed[0],prelaunch
 if(keyed.length===0){
  if(installed!=null||d?.groups?.find(g=>g.slug==='es-ct-segona-g1')?.active!==false)fail('inactive exact uninstalled native placeholder required; HOLD')
  const rs=d?.rounds?.filter(r=>r.competition_id===783&&r.season==='2026/27'&&r.number===3)??[],home=anchoredTeam(data,d,f.clubs[0]),away=anchoredTeam(data,d,f.clubs[1])
  const candidates=d.matches.filter(m=>m.round_id===rs[0]?.id&&m.home_team_id===home&&m.away_team_id===away&&m.played_on==='2026-10-04')
  if(rs.length!==1||candidates.length!==1||!legacyPlaceholder(candidates[0]))fail('exact full legacy placeholder row required; HOLD')
  m=candidates[0];const beforeImageText=JSON.stringify(m);prelaunch={kind:'exact-legacy-placeholder-v1',beforeImageText,beforeSha256:createHash('sha256').update(beforeImageText).digest('hex')}
 }
 const r=d?.rounds?.find(r=>r.id===m?.round_id)
 if(keyed.length>1||!positive(m?.id)||!positive(m.home_team_id)||!positive(m.away_team_id)||m.home_team_id===m.away_team_id||r?.competition_id!==783||r.season!=='2026/27'||r.number!==3||m.played_on!=='2026-10-04')fail('genuine exact persisted report/round/side native mapping required; HOLD')
 const binding={schemaVersion:1,kind:'fcf-g1-native-supplement',policyId:p.id,policySha256:fcfG1SupplementalPolicySha256(),approvalReference:p.approvalReference,approvedOriginalSha256:p.approvedOriginalSha256,fixture:structuredClone(p.fixture),native:{matchId:m.id,roundId:m.round_id,homeTeamId:m.home_team_id,awayTeamId:m.away_team_id},sourceCommit:data.binding.sourceCommit,sourceFingerprintSha256:data.binding.sourceFingerprintSha256,...(prelaunch?{prelaunch}:{})}
 if(installed!=null){
  const {prelaunch:original,...identity}=installed.binding??{}
  if(!same(identity,binding)||installed.afterImage==null||!same(installed.afterImage,m)||!installed.receipt||installed.receipt.sourceFingerprintSha256!==binding.sourceFingerprintSha256)fail('immutable separate installed supplemental marker/receipt drift')
  // jsonb getters reorder object keys. Rebuild the same constructor order,
  // preserving original before-image TEXT bytes rather than serializing its row.
  if(Object.hasOwn(installed.binding,'prelaunch')){
   if(!original||Object.keys(original).sort().join(',')!=='beforeImageText,beforeSha256,kind'||original.kind!=='exact-legacy-placeholder-v1'||typeof original.beforeImageText!=='string'||Buffer.byteLength(original.beforeImageText)>8192||!/^[a-f0-9]{64}$/.test(original.beforeSha256??'')||createHash('sha256').update(original.beforeImageText).digest('hex')!==original.beforeSha256)fail('installed supplemental prelaunch drift')
   let before;try{before=JSON.parse(original.beforeImageText)}catch{fail('installed supplemental prelaunch drift')}
   if(!legacyPlaceholder(before)||before.id!==m.id||before.round_id!==m.round_id||before.home_team_id!==m.home_team_id||before.away_team_id!==m.away_team_id||before.played_on!==m.played_on)fail('installed supplemental prelaunch drift')
   return {...binding,prelaunch:{kind:original.kind,beforeImageText:original.beforeImageText,beforeSha256:original.beforeSha256}}
  }
  return binding
 }
 return binding
}
