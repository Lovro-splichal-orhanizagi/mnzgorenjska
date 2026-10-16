import test from 'node:test'
import assert from 'node:assert/strict'
import { sestaviSezono, preveriOdobritev, preveriPosnetek } from './vklopi-nemcijo.mjs'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const sha=s=>createHash('sha256').update(s).digest('hex')
function season(sezona='2025/26') {
 const ring=Array.from({length:18},(_,i)=>i),razpored=[],zapisniki=[]
 for(let leg=0;leg<2;leg++)for(let k=0;k<17;k++){
  const round=leg*17+k+1,tekme=[]
  for(let i=0;i<9;i++){
   let a=ring[i],b=ring[17-i];if(leg)[a,b]=[b,a]
   const id=String((sezona==='2025/26'?8000000:9000000)+round*10+i)
   const home=`Club ${a}`,away=`Club ${b}`,datum=sezona==='2025/26'?'2025-10-01':'2026-10-01'
   tekme.push({dfbId:id,domaci:home,gostje:away,datum,ura:'18:00',odigrana:true,izid:{domaci:0,gostje:0}})
   const team=(name)=>({ime:name,postava:Array.from({length:11},(_,j)=>({ime:`${name} Player ${j}`,vratar:j===0,vratarVir:j===0?'oznaka-T':null})),rezerve:[]})
   const z={zapisnikId:`de-dfb-${id}`,sezona,krog:round,datum,ura:'18:00',domaci:team(home),gostje:team(away),rezultat:{domaci:0,gostje:0},goli:[],rumeni:[],rdeci:[],menjave:[],opozorila:[]}
   zapisniki.push({id:z.zapisnikId,z,url:`https://datencenter.dfb.de/datencenter/regionalliga-nordost/${sezona==='2025/26'?'2025-2026':'2026-2027'}/${round}-spieltag/home-away-${id}`})
  }
  razpored.push({stevilka:round,tekme})
  ring.splice(1,0,ring.pop())
 }
 return {sezona,razpored,zapisniki,capturedAt:new Date().toISOString(),runId:'12345'}
}
test('complete 18-club archive produces exact per-match identities, starters and explicit keeper proof',()=>{
 const m=sestaviSezono(season())
 assert.equal(m.fixtures.length,306)
 assert.equal(m.fixtures.filter(x=>x.played).length,306)
 assert.equal(m.fixtures[0].starters.length,22)
 assert.equal(m.fixtures[0].starters.filter(x=>x.keeper&&x.proof==='oznaka-T').length,2)
})
test('305 reports, duplicate report or a fabricated score cannot produce a release manifest',()=>{
 for(const change of [s=>s.zapisniki.pop(),s=>s.zapisniki.push(s.zapisniki[0]),s=>s.zapisniki[0].z.rezultat.domaci=1]){
  const s=season();change(s);assert.throws(()=>sestaviSezono(s),/pokrit|zapisnik|izid|goli/)
 }
})
test('a complete archive without explicit starting keeper evidence is rejected',()=>{
 const s=season();s.zapisniki[0].z.domaci.postava[0].vratarVir='menjava-vratarja'
 assert.throws(()=>sestaviSezono(s),/vratar/)
})
test('closed archive cannot be declared unplayed to disguise a missing report',()=>{
 const s=season();s.razpored[0].tekme[0].odigrana=false;s.zapisniki.shift()
 assert.throws(()=>sestaviSezono(s),/306|arhiv/)
})
test('reviewed hash, fixed scope and capture freshness are mandatory',()=>{
 const m={version:1,slug:'de-regionalliga-nordost',sourceCommit:'a'.repeat(40),parserSha256:'b'.repeat(64),seasons:[sestaviSezono(season()),sestaviSezono(season('2026/27'))]}
 const raw=JSON.stringify(m)
 assert.equal(preveriOdobritev(raw,sha(raw),'b'.repeat(64)).slug,m.slug)
 assert.throws(()=>preveriOdobritev(raw+' ',sha(raw),'b'.repeat(64)),/SHA/)
 assert.throws(()=>preveriOdobritev(raw,sha(raw),'c'.repeat(64)),/razčlenjeval/)
 m.seasons[1].capturedAt='2020-01-01T00:00:00Z';const stale=JSON.stringify(m)
 assert.throws(()=>preveriOdobritev(stale,sha(stale),'b'.repeat(64)),/svež/)
})
test('snapshot replay rejects missing files, mismatched hashes and nonofficial URLs before parsing',()=>{
 const dir=mkdtempSync(join(tmpdir(),'slff-de-snapshot-'))
 try{
  const body='<html>official capture</html>',file=sha(body)+'.html'
  writeFileSync(join(dir,file),body)
  const records=[{url:'https://datencenter.dfb.de/example',file,sha256:sha(body),at:new Date().toISOString()}]
  assert.equal(preveriPosnetek(dir,records).documents.get(records[0].url),body)
  writeFileSync(join(dir,file),'changed');assert.throws(()=>preveriPosnetek(dir,records),/SHA/)
  records[0].url='https://evil.example/x';assert.throws(()=>preveriPosnetek(dir,records),/uradn/)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
