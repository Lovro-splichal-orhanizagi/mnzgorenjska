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
  for(const r of reports)assert.deepEqual(p.nastopi(r.z),byID.get(r.id).n)
 }
 assert.equal(calls.length,101);assert.ok(binding().markers.every(m=>!calls.some(c=>c.url.includes(`/utakmice/${m.reportId}/`))))
 const rounds=await p.razporedVseStrani('114471579',read)
 assert.equal(rounds.length,14);assert.equal(rounds.reduce((n,r)=>n+r.tekme.length,0),56)
 assert.equal(rounds.flatMap(r=>r.tekme).filter(t=>t.historicalMarker).length,3)
 assert.equal(calls.length,102) // schedule only, no 3:0 report guessing
 const selected=await p.posamezniZapisnik('114471579',{id:'114471616'})(read)
 assert.equal(selected.length,1);assert.deepEqual(p.nastopi(selected[0].z),byID.get('114471616').n)
 const schedule=documents.get('https://semafor.hns.family/natjecanja/114471579/x/')
 await assert.rejects(()=>p.zapisniki('114471579',async()=>schedule.replace('data-match="114471617"','data-match="999999999"')),/fixture|identity/i)
})
