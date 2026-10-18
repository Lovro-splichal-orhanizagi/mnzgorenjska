import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {withHnsWomenStatistics} from './hns-zenske-runtime.mjs'
import base from './hns.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from '../lib/historical-statistics-policy.mjs'
import {readHnsWomenCaptures} from '../hr-zenske-paket.mjs'
const policy=getHistoricalStatisticsPolicy('hr-prva-hnlz'),competition={slug:policy.competitionSlug,source:'hns',source_policy:policy.sourcePolicy,date_only_deadline_policy:'midnight-local-v1',source_league_code:'114471579',firstFantasyPlayedOn:'2026-10-25'}
const binding=()=>({installed:true,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),firstFantasyPlayedOn:'2026-10-25',markers:policy.entries.map((e,i)=>{const{rawSha256,reasonCode,...identity}=e;return{sourceMatchId:e.sourceMatchId,reportId:e.sourceMatchId,fixture:{...identity,season:policy.season},rawSha256,matchId:100+i,roundId:200+i,homeTeamId:300+i*2,awayTeamId:301+i*2,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})})
const wrapped=(patch={},markers=binding())=>withHnsWomenStatistics(base,{...competition,...patch},{installedHistoricalMarkers:markers})
test('HNS installed single selection does not traverse or fetch source',async()=>{
 const p=wrapped();assert.deepEqual(await p.posamezniZapisnik('114471579',{id:'114471617'})(()=>{throw Error('source forbidden')}),[])
})
test('HNS wrapper validates tuple/deadline and complete markers before any source read',()=>{
 for(const patch of [{slug:'wrong'},{source_policy:null},{date_only_deadline_policy:null},{source_league_code:'100511683'}])assert.throws(()=>wrapped(patch),/HNS women|historical|policy|tuple/i)
 for(const b of [null,{...binding(),markers:[]},{...binding(),policySha256:'0'.repeat(64)}])assert.throws(()=>wrapped({},b),/historical|binding|marker|policy/i)
})
test('foreign scope and report selection refuse before source and appearance derivation cannot use legacy data',async()=>{
 const p=wrapped(),read=()=>{throw Error('source forbidden')}
 await assert.rejects(()=>p.zapisniki('100511683',read),/scope|container/i)
 assert.throws(()=>p.posamezniZapisnik('114471579',{id:'unknown'}),/selection/i)
 assert.throws(()=>p.nastopi({}),/strict|unverified/i)
})
test('HNS source refusal and redirect are final without a shared retry or fallback',async()=>{
 const p=wrapped(),original=globalThis.fetch;let calls=0
 try{
  for(const status of [401,403,429,302,500]){
   globalThis.fetch=async()=>{calls++;return new Response('',{status})}
   await assert.rejects(()=>p.fetch('https://semafor.hns.family/natjecanja/114471579/x/'),e=>e.status===status&&([401,403,429].includes(status)?e.zavrnitev:true))
  }
  assert.equal(calls,5)
  await assert.rejects(()=>p.fetch('https://semafor.hns.family/natjecanja/114471579/x/',{method:'POST'}),/GET|method|request/i)
  assert.equal(calls,5)
  globalThis.fetch=async()=>new Response('<title>Just a moment...</title>')
  await assert.rejects(()=>p.fetch('https://semafor.hns.family/natjecanja/114471579/x/'),e=>e.zavrnitev===true)
 }finally{globalThis.fetch=original}
})
const captureDir=process.env.SLFF_HNS_WOMEN_CAPTURE_DIR,pilotDir=process.env.SLFF_HNS_WOMEN_PILOT_DIR
test('actual main102 replay uses strict99normal appearances and skips3installed reports without raw reads',{skip:!captureDir||!pilotDir},async()=>{
 const captures=readHnsWomenCaptures({captureDir,pilotDir,currentFile:'current-refresh-20261018-final.html'}),documents=new Map(captures.documents.map(d=>[d.canonicalUrl,d.body])),calls=[],p=wrapped()
 const read=async(url,name,fresh)=>{calls.push({url,name,fresh});assert.ok(documents.has(url));return documents.get(url)}
 const audit=JSON.parse(readFileSync(`${captureDir}/audit.json`)),byID=new Map(audit.map(r=>[r.id,r]))
 for(const code of ['108043476','114471579']){
  const reports=await p.zapisniki(code,read)
  assert.equal(reports.length,code==='108043476'?75:24)
  for(const r of reports){assert.deepEqual(p.nastopi(r.z),byID.get(r.id).n);assert.deepEqual(p.matchSourceFields(r.z),{source_round:r.z.sourceRound,source_phase:r.z.sourcePhase})}
 }
 assert.equal(calls.length,101);assert.ok(binding().markers.every(m=>!calls.some(c=>c.url.includes(`/utakmice/${m.reportId}/`))))
 const rounds=await p.razporedVseStrani('114471579',read)
 assert.equal(rounds.length,14);assert.equal(rounds[0].hnsWomenSource.rawSha256,(await import('node:crypto')).createHash('sha256').update(documents.get('https://semafor.hns.family/natjecanja/114471579/x/')).digest('hex'));assert.equal(rounds[0].hnsWomenSource.fixtures.length,4);assert.equal(rounds.reduce((n,r)=>n+r.tekme.length,0),56)
 assert.equal(rounds.flatMap(r=>r.tekme).filter(t=>t.historicalMarker).length,3)
 assert.equal(calls.length,102) // schedule only, no 3:0 report guessing
 const selected=await p.posamezniZapisnik('114471579',{id:'114471616'})(read)
 assert.equal(selected.length,1);assert.deepEqual(p.nastopi(selected[0].z),byID.get('114471616').n)
 const schedule=documents.get('https://semafor.hns.family/natjecanja/114471579/x/')
 await assert.rejects(()=>p.zapisniki('114471579',async()=>schedule.replace('data-match="114471617"','data-match="999999999"')),/fixture|identity/i)
})
test('retained15:15R8 delta preserves published keeper-role blocker and clean new report',{skip:!captureDir||!process.env.SLFF_HNS_WOMEN_DELTA_FILE},async()=>{
 const {hnsWomenScheduleFixtures}=await import('../hr-zenske-paket.mjs'),{parseHnsWomenReport}=await import('./hns-zenske-quality.mjs'),{createHash}=await import('node:crypto')
 const fixtures=hnsWomenScheduleFixtures(readFileSync(process.env.SLFF_HNS_WOMEN_DELTA_FILE,'utf8'),'114471579')
 const parse=id=>{const raw=readFileSync(`${captureDir}/delta-1515-match-${id}.html`,'utf8');if(id==='114471645')assert.equal(createHash('sha256').update(raw).digest('hex'),'5a8b97b305a1031e5c3992d44beb87ee9cfecf9c8fe36d3aa71a5f16e6ecd9e0');return parseHnsWomenReport(raw,{competition,fixture:fixtures.find(f=>f.id===id),sourceCompetitionId:'114471579'})}
 assert.throws(()=>parse('114471645'),/explicit keeper coverage missing/)
 const clean=parse('114471643');assert.equal(clean.appearances.length,30);assert.equal(clean.z.goli.length,4)
 assert.deepEqual(fixtures.filter(f=>f.krog<9&&!f.izid&&!f.postponed).map(f=>f.id).sort(),['114471642','114471644'])
})

test('retained15:55publication result alone never supplies missing full report or keeper facts',{skip:!captureDir||!process.env.SLFF_HNS_WOMEN_PUBLICATION_FILE},async()=>{
 const {hnsWomenScheduleFixtures}=await import('../hr-zenske-paket.mjs'),{parseHnsWomenReport}=await import('./hns-zenske-quality.mjs'),fixtures=hnsWomenScheduleFixtures(readFileSync(process.env.SLFF_HNS_WOMEN_PUBLICATION_FILE,'utf8'),'114471579'),fixture=fixtures.find(f=>f.id==='114471644')
 assert.ok(fixture.izid);assert.equal(fixtures.find(f=>f.id==='114471642').izid,null)
 assert.throws(()=>parseHnsWomenReport(readFileSync(`${captureDir}/publication-1555-match-114471644.html`,'utf8'),{competition,fixture,sourceCompetitionId:'114471579'}),/full report required/)
})
