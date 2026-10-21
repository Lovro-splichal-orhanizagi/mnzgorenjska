import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {viraZa} from './viri/index.mjs'
import mfa from './viri/mfa.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256,validateHistoricalStatisticsRegistry,classifyHistoricalStatistics,validateInstalledHistoricalStatisticsMarkers} from './lib/historical-statistics-policy.mjs'
import {assertHistoricalReportImportable} from './lib/historical-statistics-import.mjs'
const registry=JSON.parse(readFileSync(new URL('./policies/historical-statistics-exclusions.json',import.meta.url)))
const policy=()=>getHistoricalStatisticsPolicy('mt-premier')
const competition=()=>({id:971,slug:'mt-premier',source:'mfa',source_policy:policy()?.sourcePolicy,source_league_code:'58539/2027',firstFantasyPlayedOn:'2026-10-21'})
const installed=()=>{const p=policy(),sha=historicalStatisticsPolicySha256(p);return{installed:true,policyId:p.id,policySha256:sha,firstFantasyPlayedOn:'2026-10-21',markers:p.entries.map((e,i)=>{const{rawSha256,reasonCode,...fixture}=e;return{sourceMatchId:e.sourceMatchId,reportId:`mt${e.sourceMatchId}`,fixture,rawSha256,matchId:517066+i,roundId:34000+i,homeTeamId:10678+i,awayTeamId:10689+i,policyId:p.id,policySha256:sha,statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})}}
test('MFA registry has only the two user-approved reports, correct per-entry seasons and original raw hashes',()=>{
 const p=policy();assert.ok(p,'exact reviewed MFA policy must exist')
 assert.equal(p.provider,'mfa');assert.equal(p.season,'2026/27');assert.equal(p.sourcePolicy,'mt-mfa-reviewed-history-v1')
 assert.deepEqual(p.entries.map(e=>[e.sourceMatchId,e.season,e.sourceRound,e.rawSha256]),[['52581524','2025/26',28,'a81da11a4fdad7c6cca90acc28e02248566ae044653b905435acb2f0fbbaa949'],['53142122','2026/27',1,'dc0d717b5be05389e72f081df04bac8ee93fe93384ff31f51817d6faaf0b5399']])
 assert.ok(Object.isFrozen(p.entries[0]))
})
test('per-entry season overrides are unavailable to all other policies',()=>{
 const r=structuredClone(registry);r.policies[0].entries[0].season=r.policies[0].season
 assert.throws(()=>validateHistoricalStatisticsRegistry(r),/season/i)
})
test('MFA exact report classifier keeps scores and binds each season; wrong season/hash fail',()=>{
 const p=policy();assert.ok(p)
 for(const e of p.entries){assert.equal(classifyHistoricalStatistics({competition:competition(),fixture:e,rawSha256:e.rawSha256}).kind,'unavailable_historical');assert.throws(()=>classifyHistoricalStatistics({competition:competition(),fixture:{...e,season:'2024/25'},rawSha256:e.rawSha256}),/season|identity/);assert.throws(()=>classifyHistoricalStatistics({competition:competition(),fixture:e,rawSha256:'0'.repeat(64)}),/SHA/)}
})
test('MFA complete installed binding validates exact mt namespace and refuses partial/foreign state',()=>{
 assert.ok(policy());const b=installed();assert.deepEqual(validateInstalledHistoricalStatisticsMarkers({competition:competition(),binding:b}),b)
 for(const mutate of [b=>b.markers.pop(),b=>{b.markers[0].reportId='52581524'},b=>{b.markers[0].fixture.season='2026/27'},b=>{b.installed=false}]){const x=installed();mutate(x);assert.throws(()=>validateInstalledHistoricalStatisticsMarkers({competition:competition(),binding:x}),/binding|marker|fixture/)}
 assert.throws(()=>viraZa({...competition(),source_policy:null}),/policy|tuple/)
 assert.throws(()=>viraZa(competition()),/binding|installed|marker/)
})
test('MFA selected installed report skips before any schedule or per-report provider read',async()=>{
 assert.ok(policy());const b=installed(),vir=viraZa(competition(),{installedHistoricalMarkers:b})
 for(const marker of b.markers)assert.deepEqual(await vir.zapisniki('58539/2027',()=>{throw Error('provider forbidden')},{samoZapisnik:marker.reportId}),[])
})
test('MFA real adapter skips installed IDs before per-report reads, still parses ordinary reports strictly',async()=>{
 assert.ok(policy());const b=installed(),vir=viraZa(competition(),{installedHistoricalMarkers:b}),reads=[]
 const fixture={id:53142122,competitionId:'53109748',competitionTypeId:58539,status:'PLAYED',startDate:'2026-08-17T16:00:00Z',homeTeam:{id:39636,name:'Birkirkara'},awayTeam:{id:39615,name:'Gzira United'}}
 const read=async(url)=>{reads.push(url);if(url.includes('/standings'))return JSON.stringify({phases:[{groups:[{id:'53109748',competitionName:'Opening',data:[]}]}]});if(url.includes('/pastMatches'))return JSON.stringify(url.includes('page=1')?[fixture]:[]);if(url.includes('/upcomingMatches'))return '[]';throw Error(`per-report fetch forbidden ${url}`)}
 // A tiny retained-style list is sufficient: Premier has fewer than100 current reports.
 assert.deepEqual(await vir.zapisniki('58539/2027',read),[])
 assert.ok(!reads.some(url=>url.includes('/matches/')))
 assert.equal(viraZa({slug:'mt-nl1',source:'mfa'}),mfa)
 for(const e of policy().entries)assert.throws(()=>assertHistoricalReportImportable({competition:competition(),report:{id:`mt${e.sourceMatchId}`,z:{}}}),/fixture|historical|identity/)
 assert.doesNotThrow(()=>assertHistoricalReportImportable({competition:competition(),report:{id:'mt99999999',z:{}}}))
})
test('normal future MFA on-field dismissal needs a clock; ordinary YC and never-used bench dismissal remain valid',async()=>{
 const {assertMfaReportTiming}=await import('./viri/mfa-report-validation.mjs')
 const body=()=>({domaci:{postava:[{regSt:1}],rezerve:[{regSt:2}]},gostje:{postava:[{regSt:3}],rezerve:[]},menjave:[],goli:[],zgresene:[],rdeci:[],rumeni:[{ekipaIdx:0,regSt:1,minuta:null}]})
 assert.doesNotThrow(()=>assertMfaReportTiming(body()))
 const field=body();field.rdeci=[{ekipaIdx:0,regSt:1,minuta:null}];assert.throws(()=>assertMfaReportTiming(field),/dismissal.*minute/i)
 const unused=body();unused.rdeci=[{ekipaIdx:0,regSt:2,minuta:null}];assert.doesNotThrow(()=>assertMfaReportTiming(unused))
 unused.menjave=[{ekipaIdx:0,minuta:79,noter:{regSt:2},ven:{regSt:1}}];assert.throws(()=>assertMfaReportTiming(unused),/dismissal.*minute/i)
 const unknownSub=body();unknownSub.menjave=[{ekipaIdx:0,minuta:null,noter:{regSt:2},ven:{regSt:1}}];assert.throws(()=>assertMfaReportTiming(unknownSub),/substitution/i)
 const unknownGoal=body();unknownGoal.goli=[{ekipaIdx:0,minuta:10,regSt:999}];assert.throws(()=>assertMfaReportTiming(unknownGoal),/scorer/i)
})
test('MFA schedule uses real mfaId markers so generic writer preserves protected fixture',async()=>{
 assert.ok(policy());const b=installed(),vir=viraZa(competition(),{installedHistoricalMarkers:b})
 const fixture={id:53142122,competitionId:'53109748',competitionTypeId:58539,status:'PLAYED',startDate:'2026-08-17T16:00:00Z',homeTeam:{id:39636,name:'Birkirkara'},awayTeam:{id:39615,name:'Gzira United'}}
 const read=async url=>url.includes('/standings')?JSON.stringify({phases:[{groups:[{id:'53109748',data:[]}]}]}):JSON.stringify(url.includes('/pastMatches')&&url.includes('page=1')?[fixture]:[])
 const rounds=await vir.razporedVseStrani('58539/2027',read)
 assert.deepEqual(rounds[0].tekme[0].historicalMarker,b.markers[1])
})
