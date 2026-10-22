import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {vZapisnik} from './viri/dfb.mjs'
import {sestaviSezono} from './vklopi-dfb-regijo.mjs'
import {season} from './test-vklop-dfb-regije.mjs'
import {collectDfbHistorical,dfbHistoricalScope,unavailableDfbFixture} from './dfb-historical-policy.mjs'
const source=id=>readFileSync(new URL(`./vzorci/de-dfb-suedwest-${id}.html`,import.meta.url),'utf8')
const sha=x=>createHash('sha256').update(x).digest('hex')
const policyId='de-dfb-suedwest-2025-historical-unavailable-v1'
const competition={slug:'de-regionalliga-suedwest',source:'dfb',source_policy:policyId,firstFantasyPlayedOn:'2026-10-25'}
const fixed=[{id:'2402929',round:11,day:'2025-10-04',home:'TSG Balingen',away:'Kickers Offenbach',homeId:'tsg-balingen',awayId:'kickers-offenbach',score:[1,1],reason:'contradictory_starting_xi'},{id:'2403004',round:19,day:'2025-11-29',home:'TSV Steinbach Haiger',away:'TSG Balingen',homeId:'tsv-steinbach-haiger',awayId:'tsg-balingen',score:[0,0],reason:'contradictory_discipline'}]
function fixture(){
 const s=season('regionalliga-suedwest'),first=s.razpored[10].tekme,second=s.razpored[18].tekme
 const a=first.find(x=>second.some(y=>y.gostje===x.domaci)),b=second.find(y=>y.gostje===a.domaci)
 assert(a&&b)
 const names=new Map([[a.domaci,fixed[0].home],[a.gostje,fixed[0].away],[b.domaci,fixed[1].home]])
 assert.equal(names.size,3)
 const documents=new Map()
 for(const r of s.razpored)for(const t of r.tekme){t.domaci=names.get(t.domaci)??t.domaci;t.gostje=names.get(t.gostje)??t.gostje}
 for(const r of s.zapisniki)for(const side of ['domaci','gostje']){const t=r.z[side];t.ime=names.get(t.ime)??t.ime;for(const p of t.postava)p.ime=`${t.ime} Player ${p.st}`}
 const nepopolni=[]
 for(const [i,t]of[a,b].entries()){
  const f=fixed[i],oldId='de-dfb-'+t.id,html=source(f.id),url=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
  assert(url)
  Object.assign(t,{id:f.id,dfbId:f.id,domaciId:f.homeId,gostjeId:f.awayId,datum:f.day,ura:'14:00',izid:{domaci:f.score[0],gostje:f.score[1]},url})
  s.zapisniki=s.zapisniki.filter(x=>x.id!==oldId);documents.set(url,html)
  try{vZapisnik(html,{id:f.id,liga:'regionalliga-suedwest'});assert.fail('source remains invalid')}catch(e){assert.match(e.message,i?/podvojen rumeni/:/postava|vratar/);nepopolni.push({id:'de-dfb-'+f.id,url,razlog:e.message,status:e.koda})}
 }
 return {...s,nepopolni,historicalPolicy:{competition,documents}}
}
test('authentic two invalid archive reports become unavailable evidence, never report rows or zero statistics',()=>{
 const s=fixture(),out=sestaviSezono(s)
 assert.equal(out.fixtures.length,306)
 assert.deepEqual(out.statisticsCoverage,{fixtureCount:306,playedCount:306,availableStatisticsCount:304,unavailableHistoricalCount:2,strictStatisticsCoverage:false,policyCoverage:true})
 for(const f of out.fixtures.filter(x=>x.statisticsStatus==='unavailable_historical')){
  assert.equal(f.played,true);assert.equal(f.starters,null);assert.equal(f.appearances,null);assert.equal(f.goals,null)
  assert.equal(f.statisticsPolicyId,policyId);assert.equal(f.sourceRawSha256,sha(source(f.id.replace('de-dfb-',''))))
 }
})
test('default strict builder still rejects this exact archive without the explicit historical context',()=>{
 const s=fixture();delete s.historicalPolicy;assert.throws(()=>sestaviSezono(s),/coverage|complete/)
})

test('exact raw/fixture/diagnostic/keeper coverage and scope drift cannot acquire an exclusion',()=>{
 const changes=[
  s=>s.historicalPolicy.documents.set(fixed[0]&&[...s.historicalPolicy.documents.keys()][0],source('2402929')+'changed'),
  s=>s.historicalPolicy.documents.delete([...s.historicalPolicy.documents.keys()][0]),
  s=>s.nepopolni[0].razlog='different defect',s=>s.nepopolni[0].status='DFB_UNSUPPORTED_FORMAT',
  s=>s.nepopolni.push({...s.nepopolni[0]}),s=>s.nepopolni[0].url+='?different',
  s=>s.slug='de-regionalliga-nord',s=>s.sezona='2026/27',
  s=>s.historicalPolicy.competition={...competition,source_policy:'wrong'},
  s=>s.historicalPolicy.competition={...competition,firstFantasyPlayedOn:'2025-10-04'},
  s=>{const t=s.razpored[10].tekme.find(t=>t.id==='2402929');t.domaci='Changed Club'},
  s=>{const t=s.razpored[10].tekme.find(t=>t.id==='2402929');t.domaciId='wrong'},
  s=>{const t=s.razpored[10].tekme.find(t=>t.id==='2402929');t.izid.domaci=2},
  s=>{const t=s.razpored[10].tekme.find(t=>t.id==='2402929');t.ura='15:00'},
  s=>s.zapisniki.pop(),
  s=>{for(const r of s.zapisniki)for(const t of[r.z.domaci,r.z.gostje])if(t.ime==='TSG Balingen')t.postava[0].vratar=false},
 ]
 for(const [i,change]of changes.entries()){const s=fixture();change(s);assert.throws(()=>sestaviSezono(s),undefined,`mutation ${i}`)}
})

test('current reports stay complete and never inherit archive missing-statistics policy',()=>{
 const s=season('regionalliga-suedwest',2026);s.historicalPolicy={competition,documents:new Map()}
 const out=sestaviSezono(s)
 assert.equal(out.statisticsCoverage.availableStatisticsCount,306);assert.equal(out.statisticsCoverage.unavailableHistoricalCount,0);assert.equal(out.statisticsCoverage.strictStatisticsCoverage,true)
 s.zapisniki.pop();assert.throws(()=>sestaviSezono(s),/coverage/)
})

const westCurrent=[
 {id:'2425409',round:4,day:'2026-08-21',time:'19:00',home:'SG Wattenscheid 09',away:'FC Schalke 04 II',homeId:'sg-wattenscheid-09-13217',awayId:'fc-schalke-04-ii',score:[3,0],reason:'dfb: nepopolna začetna postava ali vratar',sha256:'d53f88bed78e469a53896ca6646d6e8c2cc4a47e0516e31bd2e40341b104f573'},
 {id:'2425474',round:11,day:'2026-10-20',time:'16:00',home:'FC Schalke 04 II',away:'1. FC Köln II',homeId:'fc-schalke-04-ii',awayId:'1-fc-koeln-ii',score:[1,3],reason:'dfb: nepopolna postava ali klop',sha256:'9cefa3a5cb4e70b919fca7ffc4b9ad95544e330b6443efc5bac6dab7d609e8a1'},
]
const westRaw=match=>readFileSync(new URL(`./vzorci/de-dfb-west-current-${match.id}.html`,import.meta.url),'utf8')
const westFixture=match=>({id:match.id,dfbId:match.id,datum:match.day,ura:match.time,odigrana:true,izid:{domaci:match.score[0],gostje:match.score[1]},url:`https://datencenter.dfb.de/datencenter/regionalliga-west/2026-2027/${match.round}-spieltag/${match.id}`,domaci:match.home,gostje:match.away,domaciId:match.homeId,gostjeId:match.awayId})
const westCompetition={slug:'de-regionalliga-west',source:'dfb',source_policy:'de-dfb-west-prelaunch-unavailable-v2',firstFantasyPlayedOn:'2026-10-23'}
function westCurrentContext(){
 const documents=new Map(),nepopolni=[],razpored=westCurrent.map(match=>{
  const t=westFixture(match),raw=westRaw(match);t.url=match.id==='2425409'?`https://datencenter.dfb.de/datencenter/regionalliga-west/2026-2027/4-spieltag/sg-wattenscheid-09-fc-schalke-04-ii-${match.id}`:`https://datencenter.dfb.de/datencenter/regionalliga-west/2026-2027/11-spieltag/fc-schalke-04-ii-1-fc-koeln-ii-${match.id}`
  documents.set(t.url,raw);nepopolni.push({id:`de-dfb-${match.id}`,url:t.url,status:'DFB_INVALID_REPORT',razlog:match.reason})
  return{stevilka:match.round,tekme:[t]}
 })
 return{slug:westCompetition.slug,sezona:'2026/27',razpored,zapisniki:[],nepopolni,historicalPolicy:{competition:westCompetition,documents}}
}
test('exact two West current prelaunch reports classify only with their bytes, identity and strict failures',()=>{
 const scope=dfbHistoricalScope(westCompetition.slug),context=westCurrentContext(),out=collectDfbHistorical({...context})
 assert.equal(out.size,2)
 assert.equal(scope.policyId,westCompetition.source_policy)
 assert.deepEqual([...out.keys()].sort(),westCurrent.map(x=>`de-dfb-${x.id}`).sort())
 for(const match of westCurrent){
  const t=context.razpored.find(r=>r.stevilka===match.round).tekme[0],classification=out.get(`de-dfb-${match.id}`)
  assert.equal(sha(westRaw(match)),match.sha256)
  assert.equal(classification.kind,'unavailable_historical')
  const unavailable=unavailableDfbFixture(t,match.round,classification)
  assert.equal(unavailable.sourceFixture.season,'2026/27')
  assert.equal(unavailable.statisticsPolicyId,'de-dfb-west-prelaunch-unavailable-v2')
  assert.equal(unavailable.homeGoals,match.score[0]);assert.equal(unavailable.awayGoals,match.score[1])
 }
})
test('West current prelaunch exceptions reject changed dates, identity, bytes, diagnostics, and postlaunch cutoff',()=>{
 const changes=[
  x=>{x.razpored[0].tekme[0].datum='2026-08-22'},
  x=>{x.razpored[0].tekme[0].ura='19:01'},
  x=>{x.razpored[0].tekme[0].domaciId='changed-home-source-id'},
  x=>{x.razpored[0].tekme[0].gostjeId='changed-away-source-id'},
  x=>{x.razpored[0].tekme[0].gostje='Changed Club'},
  x=>{x.razpored[0].tekme[0].izid.domaci=4},
  x=>{x.razpored[0].tekme[0].izid.gostje=1},
  x=>{x.razpored[0].tekme[0].dfbId='2425408'},
  x=>{x.razpored[0].stevilka=5},
  x=>{x.sezona='2025/26'},
  x=>{x.razpored[0].tekme[0].url+='?changed'},
  x=>x.historicalPolicy.documents.set(x.razpored[0].tekme[0].url,westRaw(westCurrent[0])+'changed'),
  x=>{x.nepopolni[0].razlog='different strict defect'},
  x=>{x.nepopolni[0].status='DFB_OTHER'},
  x=>{x.nepopolni.push({...x.nepopolni[0]})},
  x=>{x.nepopolni[1].url+='?changed'},
  x=>{x.historicalPolicy.competition={...westCompetition,firstFantasyPlayedOn:'2026-08-21'}},
  x=>{x.razpored[0].tekme[0].odigrana=false},
  x=>{x.zapisniki.push({id:'de-dfb-2425409'})},
  x=>{x.razpored.push({stevilka:12,tekme:[{...x.razpored[1].tekme[0],id:'2425409',dfbId:'2425409'}]})},
 ]
 const valid=westCurrentContext();assert.equal(collectDfbHistorical(valid).size,2)
 for(const [i,change]of changes.entries()){const context=westCurrentContext();change(context);assert.throws(()=>collectDfbHistorical(context),undefined,`mutation ${i}`)}
})

test('manifest unavailable records bind null-vs-empty, exact rows, observed results and canonical policy hash',async()=>{
 const {verifyDfbPolicySeason,dfbPolicyBinding}=await import('./dfb-historical-policy.mjs'),s=sestaviSezono(fixture()),binding=dfbPolicyBinding(competition)
 assert.equal(verifyDfbPolicySeason(s,binding),true)
 for(const change of [
  x=>x.fixtures.find(f=>f.statisticsStatus==='unavailable_historical').appearances=[],
  x=>x.fixtures.find(f=>f.statisticsStatus==='unavailable_historical').home='Wrong Club',
  x=>x.fixtures.find(f=>f.statisticsStatus==='unavailable_historical').homeGoals=2,
  x=>x.fixtures.find(f=>f.statisticsStatus==='unavailable_historical').time='13:00',
  x=>x.fixtures.find(f=>f.statisticsStatus==='unavailable_historical').sourceRawSha256='0'.repeat(64),
  x=>x.fixtures.find(f=>f.statisticsStatus==='unavailable_historical').statisticsReason='wrong',
  x=>x.fixtures.find(f=>f.statisticsStatus==='unavailable_historical').statisticsPolicySha256='0'.repeat(64),
  x=>x.fixtures.find(f=>f.statisticsStatus==='unavailable_historical').sourceFixture.sourceRound=12,
  x=>x.fixtures.find(f=>f.statisticsStatus==='available').statisticsStatus='unavailable_historical',
  x=>x.statisticsCoverage.strictStatisticsCoverage=true,
  x=>x.statisticsCoverage.unavailableHistoricalCount=0,
  x=>x.fixtures.pop(),
 ]){const bad=structuredClone(s);change(bad);assert.throws(()=>verifyDfbPolicySeason(bad,binding))}
 assert.throws(()=>verifyDfbPolicySeason(s,{...binding,sha256:'0'.repeat(64)}))
})

function manifest3(){
 const current=season('regionalliga-suedwest',2026),t=current.razpored.at(-1).tekme.at(-1)
 t.odigrana=false;t.izid=null;t.datum=competition.firstFantasyPlayedOn;current.zapisniki=current.zapisniki.filter(r=>r.id!=='de-dfb-'+t.id);current.historicalPolicy={competition,documents:new Map()}
 return import('./dfb-historical-policy.mjs').then(async({dfbPolicyBinding})=>{
  const release=await import('./vklopi-dfb-regijo.mjs'),proof=await import('./dfb-replay-proof.mjs'),binding=dfbPolicyBinding(competition),parserSha256=release.parserSha256(),sourceCommit='a'.repeat(40),at=new Date(Date.now()-60000).toISOString()
  const seasons=[sestaviSezono(fixture()),sestaviSezono(current)].map((s,i)=>{
   s.capturedAt=at;s.runId=String(500+i);s.jobId=String(600+i);s.evidenceMode='policy-replay'
   s.lineage={capture:{runId:String(100+i),jobId:String(200+i),commit:'b'.repeat(40),workflow:proof.captureWorkflow,step:proof.captureStep(s.season),conclusion:i?'success':'failure',workflowSha256:'c'.repeat(64),parserSha256:'d'.repeat(64),artifactId:String(300+i),artifactDigest:'sha256:'+'e'.repeat(64),indexSha256:'f'.repeat(64),documentsSha256:s.documentsSha256,capturedAt:at},replay:{runId:s.runId,jobId:s.jobId,commit:sourceCommit,workflow:proof.replayWorkflow,step:proof.policyReplayStep,workflowSha256:'1'.repeat(64),parserSha256,artifactId:String(700+i),artifactDigest:'sha256:'+'2'.repeat(64),generatedAt:new Date().toISOString(),statisticsPolicyId:binding.id,statisticsPolicySha256:binding.sha256,firstFantasyPlayedOn:binding.firstFantasyPlayedOn}}
   return s
  })
  return {version:3,provenanceVersion:2,slug:competition.slug,sourceCommit,parserSha256,statisticsPolicy:binding,seasons}
 })
}
test('version3 approval binds honest coverage, both actual replay modes, immutable policy and original age',async()=>{
 const {preveriOdobritev}=await import('./vklopi-dfb-regijo.mjs'),m=await manifest3(),check=x=>{const raw=JSON.stringify(x);return preveriOdobritev(raw,sha(raw))}
 assert.equal(check(m).version,3)
 for(const change of [
  x=>x.version=2,x=>x.provenanceVersion=1,x=>x.slug='de-regionalliga-west',
  x=>x.statisticsPolicy.sha256='0'.repeat(64),x=>x.statisticsPolicy.id='wrong',
  x=>x.statisticsPolicy.firstFantasyPlayedOn='2026-10-26',
  x=>x.seasons[0].evidenceMode='direct',x=>x.seasons[0].lineage.replay.step='Ponovi sezono — brez omrežja in baze',
  x=>x.seasons[0].lineage.replay.statisticsPolicySha256='0'.repeat(64),
  x=>x.seasons[1].lineage.replay.firstFantasyPlayedOn='2026-10-26',
  x=>x.seasons[0].statisticsCoverage.strictStatisticsCoverage=true,
  x=>{x.seasons[0].capturedAt='2020-01-01T00:00:00Z';x.seasons[0].lineage.capture.capturedAt=x.seasons[0].capturedAt},
 ]){const bad=structuredClone(m);change(bad);assert.throws(()=>check(bad))}
})

test('normal manifest rows cannot erase played evidence or duplicate season identities',async()=>{
 const {verifyDfbPolicySeason,dfbStatisticsCoverage}=await import('./dfb-historical-policy.mjs'),{preveriOdobritev}=await import('./vklopi-dfb-regijo.mjs'),m=await manifest3()
 const changes=[
  s=>{const f=s.fixtures.find(f=>f.statisticsStatus==='available');f.starters=[];f.appearances=[];f.goals=[]},
  s=>{s.fixtures.find(f=>f.statisticsStatus==='available').played=false;s.statisticsCoverage=dfbStatisticsCoverage(s.fixtures)},
  s=>{const indexes=s.fixtures.flatMap((f,i)=>f.statisticsStatus==='available'?[i]:[]);s.fixtures[indexes[1]]=structuredClone(s.fixtures[indexes[0]])},
  s=>{s.fixtures.find(f=>f.statisticsStatus==='available').starters[0].proof='guessed'},
  s=>{s.fixtures.find(f=>f.statisticsStatus==='available').appearances.pop()},
  s=>{s.fixtures.find(f=>f.statisticsStatus==='available').homeGoals=1},
 ]
 for(const [i,change]of changes.entries()){
  const bad=structuredClone(m);change(bad.seasons[0]);assert.throws(()=>verifyDfbPolicySeason(bad.seasons[0],bad.statisticsPolicy),undefined,`season mutation ${i}`)
  const raw=JSON.stringify(bad);assert.throws(()=>preveriOdobritev(raw,sha(raw)),undefined,`manifest mutation ${i}`)
 }
 const bad=structuredClone(m);bad.seasons[1].lineage.capture.conclusion='failure';const raw=JSON.stringify(bad)
 assert.throws(()=>preveriOdobritev(raw,sha(raw)),/current.*capture|capture.*current/)
})

test('policy replay artifact cannot be fabricated from a strict replay success',async()=>{
 const m=await manifest3(),s=m.seasons[0],{verifyReplayRecord}=await import('./preveri-zagona-dfb-regije.mjs')
 const record={version:2,slug:m.slug,season:s.season,statisticsPolicy:m.statisticsPolicy,capture:s.lineage.capture,replay:s.lineage.replay}
 const args={slug:m.slug,season:s.season,actual:s.lineage.replay,artifact:{id:s.lineage.replay.artifactId,digest:s.lineage.replay.artifactDigest},workflowSha256:s.lineage.replay.workflowSha256,parserSha256:m.parserSha256,historical:true}
 assert.equal(verifyReplayRecord(record,args).replay.statisticsPolicyId,m.statisticsPolicy.id)
 for(const change of [x=>x.version=1,x=>x.statisticsPolicy.sha256='0'.repeat(64),x=>x.replay.step='Ponovi sezono — brez omrežja in baze',x=>delete x.replay.statisticsPolicySha256]){const bad=structuredClone(record);change(bad);assert.throws(()=>verifyReplayRecord(bad,args))}
})

test('actual policy replay job requires its distinct successful step; strict proof cannot impersonate it',async()=>{
 const {verifyReplayExecution,policyReplayStep,replayStep,replayWorkflow}=await import('./dfb-replay-proof.mjs'),commit='a'.repeat(40)
 const run={id:500,head_sha:commit,path:replayWorkflow,event:'workflow_dispatch',status:'completed',conclusion:'success',repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'}}
 const job={id:600,run_id:500,head_sha:commit,name:'DFB regionalni replay',status:'completed',conclusion:'success',steps:[{name:policyReplayStep,status:'completed',conclusion:'success'}]}
 assert.equal(verifyReplayExecution(run,[job],{runId:'500',commit,historical:true}).step,policyReplayStep)
 assert.throws(()=>verifyReplayExecution(run,[job],{runId:'500',commit}))
 for(const patch of[{name:replayStep},{conclusion:'skipped'},{status:'in_progress'}])assert.throws(()=>verifyReplayExecution(run,[{...job,steps:[{...job.steps[0],...patch}]}],{runId:'500',commit,historical:true}))
 const workflow=readFileSync(new URL('../.github/workflows/ponovi-dfb-regijo.yml',import.meta.url),'utf8')
 assert(workflow.includes(`- name: ${policyReplayStep}`));assert(workflow.includes('capture-policy'));assert(workflow.includes('unshare --net -- node scripts/ponovi-dfb-regijo.mjs replay-policy'))
})

test('version3 database release still requires repository Actions before any request',async()=>{
 const {databaseCheck}=await import('./vklopi-dfb-regijo.mjs'),m=await manifest3(),raw=JSON.stringify(m),before=process.env.GITHUB_ACTIONS
 process.env.GITHUB_ACTIONS='false'
 try{await assert.rejects(()=>databaseCheck(raw,sha(raw),false,{fetchFn(){throw Error('request forbidden')}}),/repository Actions/)}finally{if(before===undefined)delete process.env.GITHUB_ACTIONS;else process.env.GITHUB_ACTIONS=before}
})
