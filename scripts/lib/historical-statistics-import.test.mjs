import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {loadHistoricalStatisticsImportContext,assertHistoricalReportImportable} from './historical-statistics-import.mjs'
import {historicalStatisticsPolicySha256} from './historical-statistics-policy.mjs'
const policy=JSON.parse(readFileSync(new URL('../policies/historical-statistics-exclusions.json',import.meta.url))).policies[0]
const competition={id:99,slug:policy.competitionSlug,source:policy.provider,source_policy:policy.sourcePolicy}
const binding=()=>({installed:true,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),firstFantasyPlayedOn:'2026-10-25',markers:policy.entries.map((e,i)=>{
 const {rawSha256,reasonCode,...identity}=e
 return {sourceMatchId:e.sourceMatchId,reportId:e.sourceMatchId,fixture:{...identity,season:policy.season},rawSha256,matchId:100+i,roundId:200+i,homeTeamId:300+i*2,awayTeamId:301+i*2,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}
})})
test('ordinary import keeps provider override and never calls marker RPC',async()=>{
 const original={id:1,slug:'ordinary',source:'mnzg',name:'Ordinary'}
 const result=await loadHistoricalStatisticsImportContext({rpc(){throw Error('unexpected RPC')}},original,{sourceOverride:'mnzms'})
 assert.deepEqual(result,{competition:{...original,source:'mnzms'},installedHistoricalMarkers:null})
})
test('complete service marker binding supplies source options and first fantasy date before traversal',async()=>{
 const calls=[],source=binding()
 const result=await loadHistoricalStatisticsImportContext({async rpc(...args){calls.push(args);return{data:source,error:null}}},competition)
 assert.deepEqual(calls,[['get_installed_historical_statistics_markers',{p_competition_id:99}]])
 assert.equal(result.competition.firstFantasyPlayedOn,'2026-10-25')
 assert.deepEqual(result.installedHistoricalMarkers,source)
 assert.ok(Object.isFrozen(result.installedHistoricalMarkers))
 assert.equal(competition.firstFantasyPlayedOn,undefined)
})
for(const patch of [{sourceOverride:'dfb'},{competition:{...competition,source_policy:null}},{competition:{...competition,source_policy:'unknown'}},{competition:{...competition,slug:'unknown'}}])test(`invalid historical tuple stops before marker RPC ${JSON.stringify(patch)}`,async()=>{
 await assert.rejects(()=>loadHistoricalStatisticsImportContext({rpc(){throw Error('RPC reached before tuple rejection')}},patch.competition??competition,patch),/historical|policy|tuple/i)
})
for(const response of [{data:null,error:{message:'DB denied'}},{data:{installed:false,markers:[]},error:null},{data:{...binding(),markers:[]},error:null}])test(`marker error or incomplete bootstrap stops before source ${JSON.stringify(response.error??response.data.markers)}`,async()=>{
 await assert.rejects(()=>loadHistoricalStatisticsImportContext({async rpc(){return response}},competition),/historical|marker|binding|DB denied/i)
})
test('runtime individual import accepts only ordinary complete report envelopes',()=>{
 assert.doesNotThrow(()=>assertHistoricalReportImportable({competition,report:{id:'unregistered',z:{datum:'2026-10-18'}}}))
 for(const report of [{id:policy.entries[0].sourceMatchId,z:{}},{id:'unregistered',z:null,statisticsStatus:'unavailable_historical'},{id:'unregistered',z:{},historicalStatistics:{}},{id:'unregistered',z:{},statisticsStatus:'unknown'}])assert.throws(()=>assertHistoricalReportImportable({competition,report}),/historical|unavailable|marker|status/i)
})
test('wrong competition cannot derive individual statistics for another registered provider report',()=>assert.throws(()=>assertHistoricalReportImportable({competition:{slug:'ordinary',source:'fcf'},report:{id:'es4109388',z:{}}}),/historical|marker/i))
