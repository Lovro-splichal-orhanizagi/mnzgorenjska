import test from 'node:test'
import assert from 'node:assert/strict'
import dfb from './viri/dfb.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
const api=await import('./viri/dfb-historical.mjs').catch(()=>({}))
const policy=getHistoricalStatisticsPolicy('de-regionalliga-suedwest'),competition={slug:policy.competitionSlug,source:'dfb',source_policy:policy.sourcePolicy,firstFantasyPlayedOn:'2026-10-23'}
function installed(){return {installed:true,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),firstFantasyPlayedOn:competition.firstFantasyPlayedOn,markers:policy.entries.map((e,i)=>({sourceMatchId:e.sourceMatchId,reportId:'de-dfb-'+e.sourceMatchId,fixture:{...Object.fromEntries(Object.entries(e).filter(([k])=>!['rawSha256','reasonCode'].includes(k))),season:policy.season},rawSha256:e.rawSha256,matchId:100+i,roundId:200+i,homeTeamId:300+i,awayTeamId:400+i,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}))}}
test('exact installed single report returns before real DFB source traversal or fetch',async()=>{
 assert.equal(typeof api.withDfbHistoricalStatistics,'function')
 const provider=api.withDfbHistoricalStatistics(dfb,competition)
 for(const e of policy.entries)assert.deepEqual(await provider.zapisniki('regionalliga-suedwest/2025-2026',()=>{throw Error('must not fetch')},{samoZapisnik:'de-dfb-'+e.sourceMatchId,installedHistoricalMarkers:installed()}),[])
})
test('stream merges exact installed IDs into preskoci and preserves normal strict options/output',async()=>{
 const normal=[{id:'de-dfb-9999999',z:{authentic:true},url:'retained'}];let calls=0
 const base={...dfb,async zapisniki(code,fetch,options){calls++;assert.equal(code,'regionalliga-suedwest/2025-2026');assert.equal(options.zberiNapake,false);assert.deepEqual([...options.preskoci].sort(),['de-dfb-2402929','de-dfb-2403004','de-dfb-8888888']);return normal}}
 const provider=api.withDfbHistoricalStatistics(base,competition),preskoci=new Set(['de-dfb-8888888'])
 assert.equal(await provider.zapisniki('regionalliga-suedwest/2025-2026',null,{preskoci,zberiNapake:false,installedHistoricalMarkers:installed()}),normal)
 assert.equal(calls,1);assert.deepEqual([...preskoci],['de-dfb-8888888'])
})
test('uninstalled partial drifted foreign or guessed marker bindings fail before base traversal',async()=>{
 let calls=0;const base={...dfb,async zapisniki(){calls++;throw Error('strict provider reached')}}
 const provider=api.withDfbHistoricalStatistics(base,competition)
 for(const change of[x=>x.installed=false,x=>x.markers.pop(),x=>x.policySha256='0'.repeat(64),x=>x.markers[0].rawSha256='0'.repeat(64),x=>x.markers[0].fixture.homeSourceClubId='other',x=>x.markers[0].individualRowCount=1,x=>x.markers[0].importedAt='2026-10-18T00:00:00Z',x=>x.markers[0].reportId='de-dfb-2403004',x=>x.firstFantasyPlayedOn='2026-10-24']){
  const binding=installed();change(binding);await assert.rejects(()=>provider.zapisniki('regionalliga-suedwest/2025-2026',null,{installedHistoricalMarkers:binding}))
 }
 await assert.rejects(()=>provider.zapisniki('regionalliga-suedwest/2025-2026',null,{}));assert.equal(calls,0)
 for(const patch of[{slug:'de-regionalliga-west'},{source:'hns'},{source_policy:'short-policy'}])assert.throws(()=>api.withDfbHistoricalStatistics(base,{...competition,...patch}))
 await assert.rejects(()=>provider.zapisniki('regionalliga-west/2026-2027',null,{installedHistoricalMarkers:installed()}));assert.equal(calls,0)
})
test('ordinary new report remains on strict parser and existing diagnostics are delegated',async()=>{
 const base={...dfb,nepopolni:[],async zapisniki(){this.nepopolni=[{id:'de-dfb-9999999'}];throw Error('new report invalid')}}
 const provider=api.withDfbHistoricalStatistics(base,competition)
 await assert.rejects(()=>provider.zapisniki('regionalliga-suedwest/2026-2027',null,{samoZapisnik:'de-dfb-9999999',installedHistoricalMarkers:installed()}),/new report invalid/)
 assert.equal(provider.nepopolni,base.nepopolni)
})
test('installed single-report skip clears a reused provider previous strict diagnostics',async()=>{
 const base={...dfb,nepopolni:[],async zapisniki(){this.nepopolni=[{id:'de-dfb-9999999',razlog:'previous strict failure'}];throw Error('previous strict failure')}}
 const provider=api.withDfbHistoricalStatistics(base,competition),options={installedHistoricalMarkers:installed()}
 await assert.rejects(()=>provider.zapisniki('regionalliga-suedwest/2026-2027',null,options),/previous strict failure/)
 assert.equal(provider.nepopolni.length,1)
 assert.deepEqual(await provider.zapisniki('regionalliga-suedwest/2025-2026',()=>{throw Error('fetch forbidden')},{...options,samoZapisnik:'de-dfb-2402929'}),[])
 assert.deepEqual(provider.nepopolni,[]);assert.deepEqual(base.nepopolni,[])
})

test('mixed-season West markers skip only in their exact source season',async()=>{
 const west=getHistoricalStatisticsPolicy('de-regionalliga-west'),c={slug:west.competitionSlug,source:'dfb',source_policy:west.sourcePolicy,firstFantasyPlayedOn:'2026-10-23'},sha=historicalStatisticsPolicySha256(west)
 const binding={installed:true,policyId:west.id,policySha256:sha,firstFantasyPlayedOn:c.firstFantasyPlayedOn,markers:west.entries.map((e,i)=>{const{rawSha256,reasonCode,...fixture}=e;return{sourceMatchId:e.sourceMatchId,reportId:`de-dfb-${e.sourceMatchId}`,fixture:{...fixture,season:e.season??west.season},rawSha256,matchId:100+i,roundId:200+i,homeTeamId:300+i,awayTeamId:400+i,policyId:west.id,policySha256:sha,statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})}
 const currentId='de-dfb-2425409',archiveId='de-dfb-2402287',calls=[]
 const base={ime:'dfb',nepopolni:[],async zapisniki(code,read,options){calls.push({code,options});return [{id:`result:${code}`} ]}}
 const provider=api.withDfbHistoricalStatistics(base,c)
 assert.deepEqual(await provider.zapisniki('regionalliga-west/2025-2026',null,{samoZapisnik:currentId,installedHistoricalMarkers:binding}),[{id:'result:regionalliga-west/2025-2026'}])
 assert.deepEqual([...calls.at(-1).options.preskoci].sort(),west.entries.filter(e=>(e.season??west.season)==='2025/26').map(e=>`de-dfb-${e.sourceMatchId}`).sort())
 assert(!calls.at(-1).options.preskoci.has(currentId))
 assert.deepEqual(await provider.zapisniki('regionalliga-west/2026-2027',null,{samoZapisnik:archiveId,installedHistoricalMarkers:binding}),[{id:'result:regionalliga-west/2026-2027'}])
 assert.deepEqual([...calls.at(-1).options.preskoci].sort(),west.entries.filter(e=>(e.season??west.season)==='2026/27').map(e=>`de-dfb-${e.sourceMatchId}`).sort())
 assert(!calls.at(-1).options.preskoci.has(archiveId))
 const before=calls.length
 assert.deepEqual(await provider.zapisniki('regionalliga-west/2025-2026',null,{samoZapisnik:archiveId,installedHistoricalMarkers:binding}),[])
 assert.deepEqual(await provider.zapisniki('regionalliga-west/2026-2027',null,{samoZapisnik:currentId,installedHistoricalMarkers:binding}),[])
 assert.equal(calls.length,before)
})
