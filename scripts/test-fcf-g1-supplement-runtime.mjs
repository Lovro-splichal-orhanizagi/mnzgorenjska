// Synthetic installed RPC/source IO only. No fixture establishes actual rollout authority.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {runInNewContext} from 'node:vm'
import {loadHistoricalStatisticsImportContext,assertHistoricalReportImportable} from './lib/historical-statistics-import.mjs'
import {requireFcfG1InstalledSupplement,isFcfG1SupplementReport,isFcfG1SupplementUnknownResultMarker,fcfG1SupplementCalendar} from './lib/fcf-g1-supplement-installed.mjs'
import {withFcfG1InstalledSupplement} from './viri/fcf-g1-supplement-runtime.mjs'
import {withFcfSixHistoricalStatistics} from './viri/fcf-six-historical.mjs'
import {getFcfSixPolicy,FCF_SIX_SOURCE_POLICY} from './fcf-six-historical-policy.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {viraZa} from './viri/index.mjs'
import fcf,{preberiBlok} from './viri/fcf.mjs'
import {sixTestSchedule} from './fcf-six-test-fixture.mjs'
import {syntheticFcfRaw} from './fcf-release-test-fixture.mjs'
const p=JSON.parse(readFileSync(new URL('./policies/fcf-g1-4109409-supplement.json',import.meta.url))),six=getFcfSixPolicy(p.competitionSlug)
const competition={id:783,slug:p.competitionSlug,source:'fcf',source_policy:FCF_SIX_SOURCE_POLICY,source_league_code:'4109388-4109627',sezona_koledarska:false,active:true}
const old=()=>({installed:true,policyId:six.id,policySha256:hash(six),firstFantasyPlayedOn:'2026-10-30',markers:six.entries.map((e,i)=>{const{rawSha256,reasonCode,...fixture}=e;return {sourceMatchId:e.sourceMatchId,reportId:`es${e.sourceMatchId}`,fixture:{...fixture,season:six.season},rawSha256,matchId:101+i,roundId:201+i,homeTeamId:301+i*2,awayTeamId:302+i*2,policyId:six.id,policySha256:hash(six),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})})
function installed({prelaunch=true,fingerprint='c'.repeat(64)}={}){
 const native={matchId:9901,roundId:9902,homeTeamId:9903,awayTeamId:9904}
 const afterImage={id:native.matchId,round_id:native.roundId,home_team_id:native.homeTeamId,away_team_id:native.awayTeamId,played_on:p.fixture.playedOn,zapisnik_id:'es4109409',source_url:p.fixture.sourceUrl,source_phase:null,source_round:3,home_goals:null,away_goals:null,imported_at:null,kontumacija:false,vir_brez_izida:false,import_warnings:[],statistics_status:'unavailable_historical',statistics_reason:p.reasonCode}
 const beforeImageText=JSON.stringify({...afterImage,zapisnik_id:null,source_url:'https://www.fcf.cat/ca/competicio/acta/4109388',source_round:null,home_goals:0,away_goals:0,vir_brez_izida:true,statistics_status:'available',statistics_reason:null})
 const binding={schemaVersion:1,kind:'fcf-g1-native-supplement',policyId:p.id,policySha256:hash(p),approvalReference:p.approvalReference,approvedOriginalSha256:p.approvedOriginalSha256,fixture:structuredClone(p.fixture),native,sourceCommit:'b'.repeat(40),sourceFingerprintSha256:fingerprint,...(prelaunch?{prelaunch:{kind:'exact-legacy-placeholder-v1',beforeImageText,beforeSha256:createHash('sha256').update(beforeImageText).digest('hex')}}:{})}
 return {binding,afterImage,receipt:{schemaVersion:1,kind:'fcf-g1-supplement-installed',sourceCommit:binding.sourceCommit,sourceFingerprintSha256:fingerprint,policySha256:hash(p),beforeSha256:'d'.repeat(64),afterSha256:'e'.repeat(64)}}
}
function database(data=installed(),original=old()) {const calls=[];return{calls,async rpc(name,args){calls.push([name,args]);return {data:name==='get_installed_fcf_six_statistics_markers'?original:data,error:null}},from(){throw Error('SQL writes forbidden')}}}
async function loaded(data=installed(),c=competition){const db=database(data),context=await loadHistoricalStatisticsImportContext(db,c);return {...context,db}}
const input=c=>({competition:c.competition,installedG1Supplement:c.installedG1Supplement})
test('service loader/factory keep original G1 two markers and separate durable private supplement after launch',async()=>{
 const c=await loaded();assert.deepEqual(c.db.calls,[['get_installed_fcf_six_statistics_markers',{p_competition_id:783}],['get_installed_fcf_g1_supplement',undefined]])
 assert.equal(c.installedHistoricalMarkers.markers.length,2);assert.deepEqual(c.installedHistoricalMarkers,old())
 const provider=viraZa(c.competition,c),read=()=>{throw Error('source forbidden')}
 assert.deepEqual(await provider.posamezniZapisnik(competition.source_league_code,{id:'es4109409'})(read),[])
 assert.deepEqual(await provider.zapisniki(competition.source_league_code,read,{samoZapisnik:'es4109409'}),[])
 assert.deepEqual(await provider.posamezniZapisnik(competition.source_league_code,{id:'es4109404'})(read),[])
 assert.ok(provider.historicalSourceFiles.includes('scripts/lib/fcf-g1-supplement-installed.mjs'));assert.ok(provider.historicalSourceFiles.includes('scripts/policies/fcf-g1-4109409-supplement.json'))
 assert.equal(isFcfG1SupplementUnknownResultMarker(c.installedG1Supplement.marker),true)
 assert.equal(c.installedG1Supplement.marker.approvedOriginalSha256,p.approvedOriginalSha256)
 assert.equal(Object.hasOwn(c.installedG1Supplement.marker,'rawSha256'),false)
 assert.throws(()=>withFcfG1InstalledSupplement({ime:'hns'},c.competition,{installedG1Supplement:c.installedG1Supplement}),/provider/)
 for(const clone of [structuredClone(c.installedG1Supplement),{...c.installedG1Supplement},installed()])assert.throws(()=>requireFcfG1InstalledSupplement({...input(c),installedG1Supplement:clone}),/private context/)
 assert.equal(isFcfG1SupplementUnknownResultMarker(structuredClone(c.installedG1Supplement.marker)),false)
 assert.throws(()=>viraZa(c.competition,{installedHistoricalMarkers:c.installedHistoricalMarkers}),/private context/)
 assert.throws(()=>requireFcfG1InstalledSupplement({...input(c),competition:{...c.competition,id:784}}),/tuple/)
 assert.throws(()=>provider.posamezniZapisnik('4118298-4118537',{id:'es4109409'}),/foreign/)
 // No 24h/current-source clock is consulted; users/active state do not revoke history.
 assert.ok(requireFcfG1InstalledSupplement({...input(c),competition:{...c.competition,active:true,users:42}}))
 for(const fingerprint of ['f'.repeat(64),p.approvedOriginalSha256])assert.ok((await loaded(installed({fingerprint}))).installedG1Supplement)
 assert.ok((await loaded(installed({prelaunch:false}))).installedG1Supplement)
})
test('missing, copied/drifted getter DATA and foreign tuple hold before any source access',async()=>{
 const changes=[x=>x.binding.policySha256='0'.repeat(64),x=>x.binding.approvalReference='copied',x=>x.binding.approvedOriginalSha256='f'.repeat(64),x=>x.binding.fixture.sourceCompetitionId='1818',x=>x.binding.fixture.homeSourceCategoryId='other',x=>x.binding.fixture.playedOn='2026-10-05',x=>x.binding.native.homeTeamId++,x=>x.binding.native.extra=1,x=>x.afterImage.home_goals=0,x=>x.afterImage.imported_at='2026-10-28',x=>x.afterImage.import_warnings=['drift'],x=>x.receipt.sourceCommit='e'.repeat(40),x=>x.receipt.extra=1,x=>x.binding.prelaunch.beforeImageText+=' ',x=>x.binding.prelaunch.beforeSha256='0'.repeat(64),x=>x.binding.prelaunch.extra=1]
 for(const change of changes){const data=installed();change(data);await assert.rejects(()=>loaded(data),/supplement.*HOLD/)}
 for(const data of [null,{}, {installed:true,statisticsStatus:'unavailable_historical'}])await assert.rejects(()=>loaded(data),/HOLD/)
 await assert.rejects(()=>loadHistoricalStatisticsImportContext({async rpc(name){return name==='get_installed_fcf_six_statistics_markers'?{data:old()}:{error:{message:'DB drift'}}}},competition),/DB drift/)
 for(const patch of [{id:784},{source_league_code:'4109388-4109628'},{source:'dfb'},{sezona_koledarska:true},{sezona_koledarska:undefined}])await assert.rejects(()=>loaded(installed(),{...competition,...patch}),/FCF|six|tuple/)
})
test('composed report/schedule adapters skip before base/parser and merge three calendar identities without changing old binding',async()=>{
 const c=await loaded(),calls=[],base={ime:'fcf',async zapisniki(code,read,options){calls.push(options);return []},posamezniZapisnik(){throw Error('direct base forbidden')}}
 const supplemental=withFcfG1InstalledSupplement(base,c.competition,{installedG1Supplement:c.installedG1Supplement,async readBlock(code,read,options){calls.push(options);return {skupina:'SEGONA CATALANA|GRUP 1|2026/27',tekme:options.historicalFixtures.map(x=>({...x,html:null}))}}})
 const provider=withFcfSixHistoricalStatistics(supplemental.provider,c.competition,{installedHistoricalMarkers:c.installedHistoricalMarkers,readBlock:supplemental.readBlock})
 await provider.zapisniki(competition.source_league_code,()=>{throw Error('source forbidden')})
 const rounds=await provider.razporedVseStrani(competition.source_league_code,()=>{throw Error('source forbidden')})
 for(const options of calls){assert.deepEqual([...options.preskoci],['es4109388','es4109404','es4109409']);assert.equal(options.historicalFixtures.length,3);const t=options.historicalFixtures[2];assert.equal(t.g.izid,null);assert.equal(t.g.domaci,p.homeName);assert.equal(t.g.gostje,p.awayName);assert.deepEqual(t.historicalMarker.fixture,p.fixture)}
 assert.equal(rounds.flatMap(r=>r.tekme).length,3);assert.equal(rounds.find(r=>r.stevilka===3).tekme[0].izid,null)
 assert.equal(c.installedHistoricalMarkers.markers.length,2)
})
test('actual raw full240 calendar retains verified NULL fixture and never requests4109409; copied marker refuses before reads',async()=>{
 const c=await loaded(),headers=[...six.entries.map(e=>({id:e.sourceMatchId,round:e.sourceRound,home:{sourceClubId:e.homeSourceClubId,sourceCategoryId:e.homeSourceCategoryId,name:'TEST HOME'},away:{sourceClubId:e.awaySourceClubId,sourceCategoryId:e.awaySourceCategoryId,name:'TEST AWAY'}})),{id:'4109409',round:3,home:{sourceClubId:p.fixture.homeSourceClubId,sourceCategoryId:p.fixture.homeSourceCategoryId,name:p.homeName},away:{sourceClubId:p.fixture.awaySourceClubId,sourceCategoryId:p.fixture.awaySourceCategoryId,name:p.awayName}}]
 // Use exact adapter-created historical names for the forced source headers.
 let oldCalendar
 const supplemental=withFcfG1InstalledSupplement({ime:'fcf',async zapisniki(_c,_r,o){oldCalendar=o.historicalFixtures;return[]}},c.competition,{installedG1Supplement:c.installedG1Supplement})
 await withFcfSixHistoricalStatistics(supplemental.provider,c.competition,{installedHistoricalMarkers:c.installedHistoricalMarkers}).zapisniki(competition.source_league_code,()=>{})
 for(const h of headers){const g=oldCalendar.find(t=>String(t.id)===h.id).g;h.home.name=g.domaci;h.away.name=g.gostje}
 const schedule=sixTestSchedule(headers),assigned=new Map();for(const[r,fs]of schedule.rounds.entries())for(const f of fs)if(f.id)assigned.set(f.id,{...f,round:r+1})
 const rest=schedule.rounds.flatMap((fs,r)=>fs.filter(f=>!f.id).map(f=>({...f,round:r+1}))),documents=new Map(Array.from({length:240},(_,i)=>{const id=String(4109388+i),f=assigned.get(id)??rest.shift();return[id,syntheticFcfRaw({id,slug:p.competitionSlug,round:f.round,home:schedule.clubs[f.pair[0]],away:schedule.clubs[f.pair[1]],played:false})]}))
 const root=mkdtempSync(join(tmpdir(),'g1-runtime-')),cwd=process.cwd(),calls=[];process.chdir(root)
 try{
  const read=async url=>{const id=url.split('/').at(-1);calls.push(id);if(['4109388','4109404','4109409'].includes(id))throw Error('excluded source forbidden');return documents.get(id)}
  const rounds=await viraZa(c.competition,c).razporedVseStrani(competition.source_league_code,read)
  assert.equal(rounds.length,30);assert.equal(rounds.flatMap(r=>r.tekme).length,240);assert.equal(calls.length,237);assert.equal(calls.includes('4109409'),false)
  const target=rounds.flatMap(r=>r.tekme).find(t=>t.historicalMarker?.reportId==='es4109409');assert.equal(target.izid,null);assert.equal(target.odigrana,false);assert.equal(target.historicalMarker.matchId,9901)
  assert.deepEqual(await viraZa(c.competition,c).zapisniki(competition.source_league_code,read),[])
  assert.equal(calls.some(id=>['4109388','4109404','4109409'].includes(id)),false)
  for(const patch of [{domaci:'guessed'},{gostje:'other'},{tekmovanje:'TERCERA CATALANA'},{skupina:'GRUP 9'},{ura:null},{izid:{domaci:0,gostje:0}}]){
   const exact=fcfG1SupplementCalendar(input(c));exact.g={...exact.g,...patch};await assert.rejects(()=>preberiBlok(competition.source_league_code,()=>{throw Error('source reached')},{preskoci:new Set(['es4109409']),historicalFixtures:[exact]}),/zgodovinska identiteta/)
  }
  const copied=structuredClone(oldCalendar);await assert.rejects(()=>preberiBlok(competition.source_league_code,()=>{throw Error('source reached')},{preskoci:new Set(oldCalendar.map(x=>x.historicalMarker.reportId)),historicalFixtures:copied}),/zgodovinska identiteta/)
 }finally{process.chdir(cwd);rmSync(root,{recursive:true,force:true})}
})
test('normal CLI loader/destructure/direct guard and batch guard retain genuine context; ordinary errors remain strict',async()=>{
 const source=readFileSync(new URL('./uvoz-zapisnikov.mjs',import.meta.url),'utf8'),body=source.slice(source.indexOf('const originalCompetition'),source.indexOf('const liga =')),stop=Error('STOP'),db=database()
 await assert.rejects(()=>runInNewContext(`(async()=>{${body}})()`,{db,najdiTekmovanje:async()=>competition,arg:key=>key==='zapisnik'?'es4109409':null,pocisti:false,loadHistoricalStatisticsImportContext,isFcfG1SupplementReport,viraZa(){throw Error('factory reached')},console:{log(){}},process:{exit(code){assert.equal(code,0);throw stop}}}),e=>e===stop)
 assert.equal(db.calls.length,2)
 await assert.rejects(()=>runInNewContext(`(async()=>{${body}})()`,{db:database(null),najdiTekmovanje:async()=>competition,arg:key=>key==='zapisnik'?'es4109409':null,pocisti:false,loadHistoricalStatisticsImportContext,isFcfG1SupplementReport,viraZa(){throw Error('factory reached')},console:{log(){}},process:{exit(){throw Error('exit reached')}}}),/HOLD/)
 const c=await loaded();assert.throws(()=>assertHistoricalReportImportable({...input(c),report:{id:'es4109409',z:{}}}),/cannot derive/)
 assert.throws(()=>assertHistoricalReportImportable({competition:c.competition,report:{id:'es4109410',z:{}}}),/private context/)
 assert.doesNotThrow(()=>assertHistoricalReportImportable({...input(c),report:{id:'es4109410',z:{}}}))
 for(const report of [{id:'es4109410',z:{},statisticsStatus:'unknown'},{id:'es4109410',z:{},statisticsStatus:'unavailable_historical'}])assert.throws(()=>assertHistoricalReportImportable({...input(c),report}),/status/)
 const adapter=withFcfG1InstalledSupplement({ime:'fcf',async zapisniki(){throw Error('ordinary postlaunch source failure')}},c.competition,{installedG1Supplement:c.installedG1Supplement})
 await assert.rejects(()=>adapter.provider.zapisniki(competition.source_league_code,()=>{}),/ordinary postlaunch source failure/)
 assert.equal(viraZa({slug:'ordinary',source:'fcf'}),fcf)
 const schedule=readFileSync(new URL('./uvoz-razporeda.mjs',import.meta.url),'utf8'),scheduleBody=schedule.slice(schedule.indexOf('const originalCompetition'),schedule.indexOf('const liga ='))
 let received
 await runInNewContext(`(async()=>{${scheduleBody}})()`,{db:database(),najdiTekmovanje:async()=>competition,arg:()=>null,loadHistoricalStatisticsImportContext,viraZa(comp,options){received=options;return{}}})
 assert.ok(requireFcfG1InstalledSupplement({competition:c.competition,installedG1Supplement:received.installedG1Supplement}))
 const start=schedule.indexOf('      if(t.historicalMarker) {'),end=schedule.indexOf('// Kontumacija, označena',start),preserve=schedule.slice(start,end)
 const marker=c.installedG1Supplement.marker
 runInNewContext(`for(const t of fixtures){${preserve};write()}`,{fixtures:[{historicalMarker:marker}],obstojeca:{id:marker.matchId},krogId:marker.roundId,write(){throw Error('match write forbidden')}})
 assert.throws(()=>runInNewContext(`for(const t of fixtures){${preserve}}`,{fixtures:[{historicalMarker:marker}],obstojeca:{id:marker.matchId+1},krogId:marker.roundId}),/identity/)

})
