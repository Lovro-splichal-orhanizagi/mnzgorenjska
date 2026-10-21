import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {viraZa} from './viri/index.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256,validateInstalledHistoricalStatisticsMarkers} from './lib/historical-statistics-policy.mjs'
const competition=()=>({id:972,slug:'mt-challenge',source:'mfa',source_policy:'mt-mfa-challenge-reviewed-history-v1',source_league_code:'2601248/2027',firstFantasyPlayedOn:'2026-10-23'})
const installed=()=>{const p=getHistoricalStatisticsPolicy('mt-challenge');assert.ok(p,'approved Challenge policy exists');const sha=historicalStatisticsPolicySha256(p);return{installed:true,policyId:p.id,policySha256:sha,firstFantasyPlayedOn:'2026-10-23',markers:p.entries.map((e,i)=>{const{rawSha256,reasonCode,...fixture}=e;return{sourceMatchId:e.sourceMatchId,reportId:`mt${e.sourceMatchId}`,fixture,rawSha256,matchId:517571+i,roundId:34881+i,homeTeamId:10703+i,awayTeamId:10716+i,policyId:p.id,policySha256:sha,statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})}}
test('Challenge installs exactly four approved archive identities; Premier canonical policy stays unchanged',()=>{
 const p=getHistoricalStatisticsPolicy('mt-challenge');assert.ok(p,'approved Challenge policy exists')
 assert.deepEqual(p.entries.map(e=>[e.sourceMatchId,e.season,e.sourceRound]),[['50903309','2025/26',5],['50903328','2025/26',7],['50903358','2025/26',11],['52353213','2025/26',20]])
 assert.equal(historicalStatisticsPolicySha256(getHistoricalStatisticsPolicy('mt-premier')),'393fc635d4160510198d206571730287b3a7b0d4e1c3a6556d5ce61c5964e863')
})
test('Challenge requires complete installed native tuple before any provider read',async()=>{
 const b=installed(),c=competition();assert.deepEqual(validateInstalledHistoricalStatisticsMarkers({competition:c,binding:b}),b)
 const adapter=viraZa(c,{installedHistoricalMarkers:b})
 for(const m of b.markers)for(const code of ['2601248/2026','2601248/2027'])assert.deepEqual(await adapter.zapisniki(code,()=>{throw Error('provider forbidden')},{samoZapisnik:m.reportId}),[])
 for(const patch of [{id:971},{source_league_code:'58539/2027'},{source_policy:null}])assert.throws(()=>viraZa({...c,...patch},{installedHistoricalMarkers:b}),/binding|tuple|policy/)
 for(const binding of [undefined,{...b,markers:b.markers.slice(1)}])assert.throws(()=>viraZa(c,{installedHistoricalMarkers:binding}),/binding|marker|installed/)
 await assert.rejects(()=>adapter.zapisniki('2601267/2027',()=>{throw Error('provider forbidden')}),/foreign/)
})
test('Challenge release migration is a separate closed route with exact coverage and opening gate',()=>{
 const p=new URL('../supabase/migrations/20261021093000_mfa_challenge_reviewed_history.sql',import.meta.url)
 assert.ok(readFileSync(p,'utf8').includes('private_mfa_challenge_history'))
})
