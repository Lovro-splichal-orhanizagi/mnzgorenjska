import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getFcfSixPolicy,FCF_SIX_SOURCE_POLICY,classifyFcfSixHistoricalStatistics} from './fcf-six-historical-policy.mjs'
const base=process.env.FCF_SIX_RETAINED_ROOT,retained={skip:!base}
test('six namespace preserves exact identities and honest unavailable result',()=>{
 const policies=['es-ct-segona-g1','es-ct-tercera-g2','es-ct-tercera-g9'].map(getFcfSixPolicy)
 assert.deepEqual(policies.flatMap(p=>p.entries.map(e=>e.sourceMatchId)).sort(),['4109388','4109404','4116215','4118352','4118354','4118358'])
 const e=policies[0].entries.find(e=>e.sourceMatchId==='4109404');assert.equal(e.observedHomeScore,null);assert.equal(e.observedAwayScore,null);assert.equal(e.sourceCompetitionId,null)
 assert.equal(getFcfSixPolicy('de-regionalliga-west'),null)
})
test('genuine retained4118354 is whole-statistics unavailable with official3:1',retained,()=>{
 const html=readFileSync(base+'g9-budget-ops/acta-4118354-retained.html','utf8'),competition={slug:'es-ct-tercera-g9',source:'fcf',source_policy:FCF_SIX_SOURCE_POLICY,firstFantasyPlayedOn:'2026-10-24'}
 const p=classifyFcfSixHistoricalStatistics({competition,id:'4118354',html});assert.equal(p.statisticsStatus,'unavailable_historical');assert.equal(p.fixture.observedHomeScore,3);assert.equal(p.fixture.observedAwayScore,1);assert.equal(p.z,null)
 assert.throws(()=>classifyFcfSixHistoricalStatistics({competition,id:'4118354',html:html+' '}))
 assert.throws(()=>classifyFcfSixHistoricalStatistics({competition:{...competition,source_policy:'es-fcf-reviewed-history-v1'},id:'4118354',html}))
 assert.equal(classifyFcfSixHistoricalStatistics({competition,id:'4118355',html:''}).kind,'normal')
})
test('genuine retained4109404 remains null without player-derived group identity',retained,()=>{
 const html=readFileSync(base+'budget-ops/acta-4109404-retained.html','utf8'),competition={slug:'es-ct-segona-g1',source:'fcf',source_policy:FCF_SIX_SOURCE_POLICY,firstFantasyPlayedOn:'2026-10-24'},p=classifyFcfSixHistoricalStatistics({competition,id:'4109404',html})
 assert.equal(p.fixture.sourceCompetitionId,null);assert.equal(p.fixture.observedHomeScore,null);assert.equal(p.fixture.observedAwayScore,null);assert.equal(p.z,null)
})
import {withFcfSixHistoricalStatistics} from './viri/fcf-six-historical.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
test('nightly exact six marker skip happens before any provider read; unknown result stays null',async()=>{
 const policy=getFcfSixPolicy('es-ct-segona-g1'),competition={id:783,slug:policy.competitionSlug,source:'fcf',source_policy:FCF_SIX_SOURCE_POLICY,source_league_code:'4109388-4109627',firstFantasyPlayedOn:'2026-10-24'},binding={installed:true,policyId:policy.id,policySha256:hash(policy),firstFantasyPlayedOn:'2026-10-24',markers:policy.entries.map((e,i)=>{const{rawSha256,reasonCode,...identity}=e;return{sourceMatchId:e.sourceMatchId,reportId:`es${e.sourceMatchId}`,fixture:{...identity,season:policy.season},rawSha256,matchId:100+i,roundId:200+i,homeTeamId:300+i*2,awayTeamId:301+i*2,policyId:policy.id,policySha256:hash(policy),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})},calls=[]
 const p=withFcfSixHistoricalStatistics({ime:'fcf',posamezniZapisnik(){throw Error('must skip before base')},async zapisniki(...args){calls.push(args);return[]}},competition,{installedHistoricalMarkers:binding})
 assert.deepEqual(await p.posamezniZapisnik(competition.source_league_code,{id:'es4109404'})(()=>{throw Error('source forbidden')}),[])
 await p.zapisniki(competition.source_league_code,()=>{throw Error('source forbidden')})
 assert.deepEqual([...calls[0][2].preskoci],['es4109388','es4109404']);assert.equal(calls[0][2].historicalFixtures[1].g.izid,null)
})
