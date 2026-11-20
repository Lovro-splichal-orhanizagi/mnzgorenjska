import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {vrsticePreverbe} from './vrstice-preverbe.mjs'
import {NEPOPOLN} from './viri/frf.mjs'
const source=readFileSync(new URL('./preveri-podatke.mjs',import.meta.url),'utf8')
const body=source.slice(source.indexOf('const PRAG_DNI ='),source.indexOf('// --- vratar, ki zabija'))
const fixture=(id,status='available',patch={})=>({id,played_on:'2020-09-20',imported_at:null,kontumacija:false,statistics_status:status,statistics_reason:status==='unavailable_historical'?'reviewed_source_gap':null,vir_brez_izida:false,import_warnings:[],rounds:{competitions:{slug:'test-league',active:true}},...patch})
function database(rows, {coverageError=null, failPage, missingPage, table='matches'}={}) {
 const queries=[]
 return {queries, db:{from(name){assert.equal(name,table);const filters=[],orders=[];let coverage=false,from=0,to=999
  const get=(row,key)=>key.split('.').reduce((v,k)=>v?.[k],row)
  const q={select(){return q},is(k,v){filters.push([k,v]);return q},eq(k,v){filters.push([k,v]);if(k==='statistics_status'&&v==='unavailable_historical')coverage=true;return q},lt(){return q},or(){return q},order(k){orders.push(k);return q},limit(n){to=n-1;return q},range(a,b){from=a;to=b;return q},then(resolve){
   queries.push({filters,orders,from,to})
   let data=rows.filter(row=>filters.every(([key,value])=>get(row,key)===value))
   data.sort((a,b)=>{for(const k of orders){if(get(a,k)<get(b,k))return -1;if(get(a,k)>get(b,k))return 1}return 0})
   // Simulate Postgres' unspecified order among equal keys between pages.
   if(from>0&&!orders.includes('id'))data.reverse()
   const error=coverage?coverageError:from===failPage?{message:'later page failed'}:null
   return Promise.resolve(resolve({data:from===missingPage?null:data.slice(from,Math.min(to+1,from+1000)),error}))
  }}
  return q
 }}}
}
async function monitor(rows,options={}) {
 const {db,queries}=database(rows,options),tezave=[],opozorila=[]
 await runInNewContext(`(async()=>{${body}})()`,{db,tezave,opozorila,vrsticePreverbe,NEPOPOLN,Date,Map,console:{log(){}}})
 return{tezave,opozorila,queries}
}
test('known unavailable history stays visible as coverage warning and never as overdue/imported statistics',async()=>{
 const result=await monitor([fixture(1,'unavailable_historical')])
 assert.equal(result.tezave.length,0);assert.equal(result.opozorila.length,1)
 assert.equal(result.opozorila[0].kljuc,'zgodovinska-statistika-nedosegljiva')
 assert.match(result.opozorila[0].opis,/nedosegljiv|ni na voljo|nedostopn/i)
 assert.match(result.opozorila[0].primer,/test-league.*tekma 1.*reviewed_source_gap/)
 assert.ok(result.queries.some(q=>q.filters.some(([k,v])=>k==='statistics_status'&&v==='available')))
})
test('ordinary overdue, incomplete and source-no-result behavior remains strict',async()=>{
 const result=await monitor([fixture(1),fixture(2,'available',{import_warnings:[`${NEPOPOLN} missing lineup`]}),fixture(3,'available',{vir_brez_izida:true}),fixture(4,'unavailable_historical')])
 assert.deepEqual(result.tezave.map(t=>t.kljuc).sort(),['tekma-brez-izida','tekma-ni-uvozena','zapisnik-nepopoln'])
 assert.ok(result.tezave.every(t=>t.koliko===1));assert.equal(result.opozorila.length,1)
})
test('unknown coverage remains a monitor error and inactive history is not announced',async()=>{
 assert.equal((await monitor([],{coverageError:{message:'coverage DB error'}})).tezave[0]?.kljuc,'zgodovinska-pokritost-neznana')
 assert.equal((await monitor([fixture(1,'unavailable_historical',{rounds:{competitions:{slug:'inactive',active:false}}})])).opozorila.length,0)
})
test('coverage output does not claim full data or trigger an error exit for approved omissions',()=>{
 const output=source.slice(source.indexOf('// --- izpis'),source.indexOf('// --- javi na Discord'))
 const messages=[],stop=Error('exit'),warning={kljuc:'zgodovinska-statistika-nedosegljiva',opis:'Statistika ni na voljo',koliko:1,primer:'test-league: tekma1'}
 assert.throws(()=>runInNewContext(output,{tezave:[],opozorila:[warning],lige:[{}],console:{log(message){messages.push(message)}},process:{exit(code){assert.equal(code,0);throw stop}}}),e=>e===stop)
 assert.match(messages.join('\n'),/zgodovinska-statistika-nedosegljiva/)
 assert.doesNotMatch(messages.join('\n'),/Vse v redu/)
})

test('over 200 inactive old matches cannot hide active overdue fixtures across 1000-row pages',async()=>{
 const inactive=Array.from({length:250},(_,i)=>fixture(i+1,'available',{rounds:{competitions:{slug:'inactive',active:false}}}))
 const active=Array.from({length:1205},(_,i)=>fixture(i+1000))
 const result=await monitor([...inactive,...active])
 assert.equal(result.tezave.length,1)
 assert.equal(result.tezave[0].koliko,1205)
 const pages=result.queries.filter(q=>q.filters.some(([k,v])=>k==='statistics_status'&&v==='available'))
 assert.deepEqual(pages.map(q=>q.from),[0,1000])
 assert.ok(pages.every(q=>q.filters.some(([k,v])=>k==='rounds.competitions.active'&&v===true)))
})
test('same-date page boundaries preserve every fixture and league exactly once',async()=>{
 const rows=Array.from({length:2001},(_,i)=>fixture(i+1,'available',{rounds:{competitions:{slug:`league-${i}`,active:true}}}))
 const result=await monitor(rows)
 assert.equal(result.tezave.length,2001)
 assert.equal(new Set(result.tezave.map(t=>t.primer)).size,2001)
 assert.ok(result.tezave.every(t=>t.koliko===1))
})
test('historical omissions paginate while remaining coverage warnings',async()=>{
 const result=await monitor(Array.from({length:1001},(_,i)=>fixture(i+1,'unavailable_historical')))
 assert.equal(result.tezave.length,0)
 assert.equal(result.opozorila[0].koliko,1001)
})
test('a failed or missing later page discards partial observations and reports unknown',async()=>{
 const rows=Array.from({length:1001},(_,i)=>fixture(i+1))
 for(const options of [{failPage:1000},{missingPage:1000}]){
  const result=await monitor(rows,options)
  assert.equal(result.tezave.length,1)
  assert.equal(result.tezave[0].kljuc,'zamude-neznane')
 }
})
test('active league inventory reads more than 1000 leagues in stable order',async()=>{
 const rows=Array.from({length:1205},(_,i)=>({id:i+1,slug:`league-${i}`,active:true}))
 rows.unshift({id:0,slug:'inactive',active:false})
 const {db,queries}=database(rows,{table:'competitions'})
 const leagueBody=source.slice(source.indexOf('let lige'),source.indexOf('for (const l of lige'))
 const result=await runInNewContext(`(async()=>{${leagueBody};return lige})()`,{db,vrsticePreverbe,console,process:{exit(){throw Error('unexpected exit')}}})
 assert.deepEqual(result.map(r=>r.id),Array.from({length:1205},(_,i)=>i+1))
 assert.deepEqual(queries.map(q=>q.from),[0,1000])
})
test('active league page failure cannot return a partial healthy inventory',async()=>{
 const rows=Array.from({length:1001},(_,i)=>({id:i+1,active:true}))
 const {db}=database(rows,{table:'competitions',failPage:1000}),messages=[]
 const leagueBody=source.slice(source.indexOf('let lige'),source.indexOf('for (const l of lige'))
 await assert.rejects(runInNewContext(`(async()=>{${leagueBody};return lige})()`,{db,vrsticePreverbe,console:{error(m){messages.push(m)}},process:{exit(code){assert.equal(code,1);throw Error('expected exit')}}}),/expected exit/)
 assert.match(messages.join(' '),/later page failed/)
})
