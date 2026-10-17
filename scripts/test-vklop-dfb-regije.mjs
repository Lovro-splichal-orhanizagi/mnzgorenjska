import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const api=await import('./vklopi-dfb-regijo.mjs').catch(()=>({}))
const sha=x=>createHash('sha256').update(x).digest('hex')
export function season(liga='regionalliga-nord',year=2025){
 const n=liga==='regionalliga-bayern'&&year===2026?19:18,size=n+n%2,ring=Array.from({length:size},(_,i)=>i),razpored=[],zapisniki=[]
 for(let leg=0;leg<2;leg++)for(let k=0;k<size-1;k++){
  const round=leg*(size-1)+k+1,tekme=[]
  for(let i=0;i<size/2;i++){
   let a=ring[i],b=ring[size-1-i];if(a>=n||b>=n)continue;if(leg)[a,b]=[b,a]
   const id=String((year===2025?8000000:9000000)+round*10+i),home=`Club ${a}`,away=`Club ${b}`,datum=`${year}-10-01`
   const url=`https://datencenter.dfb.de/datencenter/${liga}/${year}-${year+1}/${round}-spieltag/home-away-${id}`
   tekme.push({id,domaci:home,gostje:away,datum,ura:'18:00',odigrana:true,izid:{domaci:0,gostje:0},url})
   const team=name=>({ime:name,postava:Array.from({length:11},(_,j)=>({ime:`${name} Player ${j}`,st:j+1,zacetnik:true,vratar:j===0,vratarVir:j===0?'oznaka-T':null})),rezerve:[]})
   const z={zapisnikId:`de-dfb-${id}`,sezona:`${year}/${String(year+1).slice(2)}`,krog:round,datum,ura:'18:00',domaci:team(home),gostje:team(away),rezultat:{domaci:0,gostje:0},goli:[],rumeni:[],rdeci:[],menjave:[],zgresene:[],opozorila:[]}
   zapisniki.push({id:z.zapisnikId,z,url})
  }
  razpored.push({stevilka:round,tekme});ring.splice(1,0,ring.pop())
 }
 return {slug:`de-${liga}`,sezona:`${year}/${String(year+1).slice(2)}`,razpored,zapisniki,capturedAt:new Date().toISOString(),runId:'12345',jobId:'54321',documentsSha256:'c'.repeat(64)}
}
test('regional gate exposes a separate manifest builder',()=>assert.equal(typeof api.sestaviSezono,'function'))
test('complete 18/19-club seasons preserve every imported appearance and nullable kickoff',()=>{
 for(const [liga,year,count] of [['regionalliga-nord',2025,306],['regionalliga-bayern',2026,342]]){
  const s=season(liga,year),m=api.sestaviSezono(s)
  assert.equal(m.fixtures.length,count);assert.equal(m.fixtures[0].appearances.length,22)
  assert.equal(m.fixtures[0].time,'18:00');assert.equal(m.fixtures[0].appearances[0].minutes_played,90)
  const t=s.razpored[0].tekme[0];t.ura=null;t.odigrana=false;t.izid=null;s.zapisniki.shift()
  if(year===2026)assert.equal(api.sestaviSezono(s).fixtures[0].time,null)
 }
})
test('missing history, false keeper proof, duplicate pairs and wrong scope block preparation',()=>{
 for(const change of [s=>s.zapisniki.pop(),s=>s.zapisniki[0].z.domaci.postava[0].vratarVir='guess',s=>s.razpored[0].tekme.push(s.razpored[0].tekme[0]),s=>s.slug='de-regionalliga-nordost']){
  const s=season();change(s);assert.throws(()=>api.sestaviSezono(s))
 }
})
test('raw manifest approval binds scope, parser, captures and all statistics',()=>{
 const m={version:1,slug:'de-regionalliga-nord',sourceCommit:'a'.repeat(40),parserSha256:api.parserSha256(),seasons:[api.sestaviSezono(season()),api.sestaviSezono(season('regionalliga-nord',2026))]}
 const raw=JSON.stringify(m);assert.equal(api.preveriOdobritev(raw,sha(raw)).slug,m.slug)
 for(const change of [x=>x.slug='de-regionalliga-nordost',x=>x.parserSha256='0'.repeat(64),x=>x.seasons[1].capturedAt='2020-01-01',x=>x.seasons[0].jobId=null,x=>x.seasons[0].code='regionalliga-west/2025-2026']){
  const bad=structuredClone(m);change(bad);const b=JSON.stringify(bad);assert.throws(()=>api.preveriOdobritev(b,sha(b)))
 }
 assert.throws(()=>api.preveriOdobritev(raw+' ',sha(raw)))
 assert.throws(()=>api.preveriOdobritev(' '.repeat(8*1024*1024+1),sha(' '.repeat(8*1024*1024+1))))
})
test('real source appearance/event canonicalization includes cards, scorers and intermediate scores',async()=>{
 const {default:vir,vZapisnik}=await import('./viri/dfb.mjs')
 const z=vZapisnik(readFileSync(new URL('./vzorci/de-dfb-regije-report-west-current.html',import.meta.url),'utf8'),{liga:'regionalliga-west'})
 const a=api.kanonicniNastopi(z),g=api.kanonicniGoli(z)
 assert.equal(a.length,vir.nastopi(z).length);assert.equal(g.length,z.goli.length)
 assert.ok(g.every(x=>x.name&&Number.isInteger(x.score_home)))
 assert.ok(a.every(x=>Object.hasOwn(x,'shirt_number')&&Object.hasOwn(x,'penalties_missed')&&Object.hasOwn(x,'minute_off')))
})
