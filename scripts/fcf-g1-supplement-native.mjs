// Separate one-entry native DATA contract. This never issues source/SQL authority.
import {getFcfG1SupplementalPolicy,fcfG1SupplementalPolicySha256} from './fcf-g1-4109409-policy.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const fail=m=>{throw Error(`FCF_G1_SUPPLEMENT_NATIVE: ${m}`)},p=getFcfG1SupplementalPolicy(),same=(a,b)=>hash(a)===hash(b),positive=n=>Number.isSafeInteger(n)&&n>0
export function verifyFcfG1SupplementCanonical(f){
 const o=f?.source?.supplementalObservation,fixture=p.fixture
 if(f?.id!=='es4109409'||f.statisticsStatus!=='unavailable_historical'||f.statisticsReason!==p.reasonCode||f.policyId!==p.id||f.policySha256!==fcfG1SupplementalPolicySha256()||f.homeGoals!==null||f.awayGoals!==null||f.report!==null||f.appearances!==null||f.goals!==null||f.round!==3||f.date!==fixture.playedOn||!same(f.sourceFixture,fixture)||f.source?.sourceUrl!==fixture.sourceUrl||!/^[a-f0-9]{64}$/.test(f.source?.rawSha256??'')||!o||o.kind!=='fcf-g1-supplemental-observation'||o.targetSlug!==p.competitionSlug||o.sourceMatchId!=='4109409'||o.policyId!==p.id||o.policySha256!==fcfG1SupplementalPolicySha256()||o.approvalReference!==p.approvalReference||o.approvedOriginalSha256!==p.approvedOriginalSha256||o.freshRawSha256!==f.source.rawSha256||!same(o.fixture,fixture)||!same(f.clubs.map(c=>[c.sourceClubId,c.sourceCategoryId,c.name]),[[fixture.homeSourceClubId,fixture.homeSourceCategoryId,p.homeName],[fixture.awaySourceClubId,fixture.awaySourceCategoryId,p.awayName]]))fail('exact approved supplemental canonical/null individual facts required')
 return f
}
export function buildFcfG1NativeSupplementBinding({data,databaseInventory:d}){
 const f=verifyFcfG1SupplementCanonical(data?.fixtures?.find(f=>f.id==='es4109409')),matches=d?.matches?.filter(m=>m.zapisnik_id==='es4109409'),m=matches?.[0],r=d?.rounds?.find(r=>r.id===m?.round_id)
 // A persisted exact report anchor is required. A title/name match cannot invent
 // the supplement's native identity; unavailable mappings deliberately HOLD.
 if(matches?.length!==1||!positive(m.id)||!positive(m.home_team_id)||!positive(m.away_team_id)||m.home_team_id===m.away_team_id||r?.competition_id!==783||r.season!=='2026/27'||r.number!==3||m.played_on!=='2026-10-04')fail('genuine exact persisted report/round/side native mapping required; HOLD')
 const binding={schemaVersion:1,kind:'fcf-g1-native-supplement',policyId:p.id,policySha256:fcfG1SupplementalPolicySha256(),approvalReference:p.approvalReference,approvedOriginalSha256:p.approvedOriginalSha256,fixture:structuredClone(p.fixture),native:{matchId:m.id,roundId:m.round_id,homeTeamId:m.home_team_id,awayTeamId:m.away_team_id},sourceCommit:data.binding.sourceCommit,sourceFingerprintSha256:data.binding.sourceFingerprintSha256}
 const installed=d.supplementalMarker
 if(installed!=null){if(!same(installed.binding,binding)||installed.afterImage==null||!same(installed.afterImage,m)||!installed.receipt||installed.receipt.sourceFingerprintSha256!==binding.sourceFingerprintSha256)fail('immutable separate installed supplemental marker/receipt drift')}
 return binding
}
