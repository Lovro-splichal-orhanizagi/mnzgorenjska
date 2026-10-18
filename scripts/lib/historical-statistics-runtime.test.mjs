import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {viraZa} from '../viri/index.mjs'
import fcf from '../viri/fcf.mjs'
import {loadHistoricalStatisticsImportContext,assertHistoricalReportImportable} from './historical-statistics-import.mjs'
import {historicalStatisticsPolicySha256} from './historical-statistics-policy.mjs'
const policies=JSON.parse(readFileSync(new URL('../policies/historical-statistics-exclusions.json',import.meta.url))).policies
const binding=p=>({installed:true,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),firstFantasyPlayedOn:'2026-10-25',markers:p.entries.map((e,i)=>{const {rawSha256,reasonCode,...identity}=e;return {sourceMatchId:e.sourceMatchId,reportId:p.provider==='dfb'?`de-dfb-${e.sourceMatchId}`:`es${e.sourceMatchId}`,fixture:{...identity,season:p.season},rawSha256,matchId:100+i,roundId:200+i,homeTeamId:300+i*2,awayTeamId:301+i*2,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})})
const competition=p=>({id:99,slug:p.competitionSlug,source:p.provider,source_policy:p.sourcePolicy,firstFantasyPlayedOn:'2026-10-25',source_league_code:p.provider==='dfb'?'regionalliga-suedwest/2026-2027':`${p.entries[0].sourceMatchId}-${Number(p.entries[0].sourceMatchId)+239}`})
test('ordinary factory returns the unchanged base provider',()=>assert.equal(viraZa({slug:'es-ct-quarta-g1',source:'fcf'}),fcf))
for(const p of policies.filter(p=>['dfb','fcf'].includes(p.provider)))test(`actual factory skips selected installed report before provider reads ${p.competitionSlug}`,async()=>{
 const c=competition(p),b=binding(p),vir=viraZa(c,{installedHistoricalMarkers:b}),read=()=>{throw Error('source forbidden')}
 const reports=p.provider==='dfb'?await vir.zapisniki(c.source_league_code,read,{samoZapisnik:b.markers[0].reportId}):await vir.posamezniZapisnik(c.source_league_code,{id:b.markers[0].reportId})(read)
 assert.deepEqual(reports,[]);assert.ok(vir.historicalSourceFiles.some(f=>f.endsWith('historical-statistics-policy.mjs')))
})
for(const c of [{slug:'es-ct-segona-g1',source:'fcf'}, {slug:'es-ct-segona-g1',source:'hns',source_policy:'es-fcf-reviewed-history-v1'}, {slug:'ordinary',source:'dfb',source_policy:'unknown'}])test(`actual factory rejects incorrect policy tuple ${JSON.stringify(c)}`,()=>assert.throws(()=>viraZa(c),/historical|policy|tuple/i))
const importer=readFileSync(new URL('../uvoz-zapisnikov.mjs',import.meta.url),'utf8')
test('actual CLI installed single-report exits before factory/preparation/cache/database writes',async()=>{
 const p=policies.find(p=>p.provider==='fcf'),c=competition(p),b=binding(p),calls=[],stop=Error('STOP')
 const body=importer.slice(importer.indexOf('const originalCompetition'),importer.indexOf('const liga ='))
 await assert.rejects(()=>runInNewContext(`(async()=>{${body}})()`,{
  najdiTekmovanje:async()=>c,arg:key=>key==='zapisnik'?b.markers[0].reportId:key==='tekmovanje'?c.slug:null,pocisti:false,
  db:{async rpc(name,args){calls.push([name,args]);return{data:b,error:null}},from(){throw Error('DB write forbidden')}},
  loadHistoricalStatisticsImportContext,viraZa(){throw Error('factory preparation forbidden')},console:{log(){}},process:{exit(code){assert.equal(code,0);throw stop}},
 }),e=>e===stop)
 assert.deepEqual(calls,[['get_installed_historical_statistics_markers',{p_competition_id:99}]])
})
test('actual loaded-batch guard refuses leaked unavailable ID before any individual writes',()=>{
 const body=importer.slice(importer.indexOf('// Validate the complete loaded batch'),importer.indexOf('// Sources that do not implement'))
 let writes=0
 assert.throws(()=>runInNewContext(`${body};write()`,{zapisniki:[{id:'unregistered',z:{}},{id:'es4109388',z:{}}],tekmovanje:{slug:'ordinary',source:'fcf'},assertHistoricalReportImportable,write(){writes++}}),/historical|fixture|policy/i)
 assert.equal(writes,0)
})
test('actual schedule path skips initial raw/cache read for installed FCF wrapper',async()=>{
 const source=readFileSync(new URL('../uvoz-razporeda.mjs',import.meta.url),'utf8')
 const body=source.slice(source.indexOf('const rezerva ='),source.indexOf('// Stari CMS'))
 const result=await runInNewContext(`(async()=>{${body};return {html,rezerva}})()`,{vir:{razporedBrezUvodnegaPrenosa:true},potRezerve:'excluded',url:'excluded',imeRazporeda:'excluded',existsSync(){throw Error('cache forbidden')},readFileSync(){throw Error('raw forbidden')},prenesi(){throw Error('source forbidden')}})
 assert.equal(result.html,null);assert.equal(result.rezerva,null)
})

test('actual schedule branch preserves installed official header without match writes',()=>{
 const source=readFileSync(new URL('../uvoz-razporeda.mjs',import.meta.url),'utf8')
 const start=source.indexOf('      if(t.historicalMarker) {'),end=source.indexOf('// Kontumacija, označena',start)
 const body=source.slice(start,end),marker={matchId:11,roundId:22},writes=[]
 runInNewContext(`for(const t of fixtures){${body};write()}`,{fixtures:[{historicalMarker:marker}],obstojeca:{id:11},krogId:22,write(){writes.push('unexpected')}})
 assert.deepEqual(writes,[])
 for(const patch of [{obstojeca:{id:12},krogId:22},{obstojeca:{id:11},krogId:23}])assert.throws(()=>runInNewContext(`for(const t of fixtures){${body};write()}`,{fixtures:[{historicalMarker:marker}],...patch,write(){throw Error('write reached')}}),/historical schedule.*identity/i)
})
