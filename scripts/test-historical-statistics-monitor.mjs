import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {NEPOPOLN} from './viri/frf.mjs'
const source=readFileSync(new URL('./preveri-podatke.mjs',import.meta.url),'utf8')
const body=source.slice(source.indexOf('const PRAG_DNI ='),source.indexOf('// --- vratar, ki zabija'))
const fixture=(id,status='available',patch={})=>({id,played_on:'2020-09-20',imported_at:null,kontumacija:false,statistics_status:status,statistics_reason:status==='unavailable_historical'?'reviewed_source_gap':null,vir_brez_izida:false,import_warnings:[],rounds:{competitions:{slug:'test-league',active:true}},...patch})
async function monitor(rows,{coverageError=null}={}) {
 const queries=[],tezave=[],opozorila=[]
 const db={from(table){assert.equal(table,'matches');const filters=[];let coverage=false
  const q={select(){return q},is(k,v){filters.push([k,v]);return q},eq(k,v){filters.push([k,v]);if(k==='statistics_status'&&v==='unavailable_historical')coverage=true;return q},lt(){return q},or(){return q},order(){return q},limit(){return q},range(){return q},then(resolve){queries.push(filters);return Promise.resolve(resolve({data:rows.filter(row=>filters.every(([key,value])=>key.split('.').reduce((v,k)=>v?.[k],row)===value)),error:coverage?coverageError:null}))}}
  return q
 }}
 await runInNewContext(`(async()=>{${body}})()`,{db,tezave,opozorila,NEPOPOLN,Date,Map,console:{log(){}}})
 return{tezave,opozorila,queries}
}
test('known unavailable history stays visible as coverage warning and never as overdue/imported statistics',async()=>{
 const result=await monitor([fixture(1,'unavailable_historical')])
 assert.equal(result.tezave.length,0);assert.equal(result.opozorila.length,1)
 assert.equal(result.opozorila[0].kljuc,'zgodovinska-statistika-nedosegljiva')
 assert.match(result.opozorila[0].opis,/nedosegljiv|ni na voljo|nedostopn/i)
 assert.match(result.opozorila[0].primer,/test-league.*tekma 1.*reviewed_source_gap/)
 assert.ok(result.queries.some(q=>q.some(([k,v])=>k==='statistics_status'&&v==='available')))
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
