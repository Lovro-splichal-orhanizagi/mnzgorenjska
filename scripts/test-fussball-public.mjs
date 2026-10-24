import test from 'node:test'
import assert from 'node:assert/strict'
import {buildFussballImportBatch} from './fussball-import.mjs'
import {readFileSync} from 'node:fs'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {encodeUnattributedYellow,parseUnattributedYellow} from '../src/lib/nepripisaniRumeni.mjs'
import {mapaKlubov} from './klubi.mjs'

const api=await import('./viri/fussball-public.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const read=n=>readFileSync(new URL('./vzorci/'+n,import.meta.url))
const manifest=JSON.parse(read('de-fussball-zapisnik.json')),fonts=Object.fromEntries(Object.entries(manifest.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const id='031EQBPLF4000000VS5489BTVUS470OH',staffel='031EKNM2HG00000LVS5489BUVUR5FS5A-G',code=staffel+':2026/27'
const url='https://www.fussball.de/spiel/spvgg-03-ilvesheim-sg-oftersheim/-/spiel/'+id
const competition={id:9999,slug:'de-test',country_id:44,country_code:'DE',source:'fussball-public',source_league_code:code,source_policy:null,active:false}
function batch(){
 const result=razberiFantasyZapisnik(read('de-fussball-ilvesheim-main.html').toString(),read('de-fussball-ilvesheim-lineup.html').toString(),{fonts,id,lineupId:id})
 const fixture={id,zapisnikId:'de-fussball-'+id,url,krog:8,datum:'2026-10-11',ura:'15:00',domaci:result.z.domaci.ime,gostje:result.z.gostje.ime,rezultat:{domaci:2,gostje:3}}
 const scope={staffel,season:'2026/27'}
 return buildFussballImportBatch({version:1,activationEligible:false,scope:{provider:'fussball',...scope,seedUrl:'https://www.fussball.de/spieltag/-/staffel/'+staffel,asOfDate:'2026-10-24'},schedule:{...scope,rounds:[1,2,3,4,5,6,7,8],fixtures:[fixture]},reports:[{fixture,result}],rejectedReports:[],coverage:{expectedRounds:8,capturedRounds:8,fixtures:1,playedFixtures:1,attemptedReports:1,completeReports:1,rejectedReports:0,sampled:false,unscoredFixtures:{total:0,past:0,current:0,future:0,unknownDate:0}}},scope)
}
function factory(options={}){assert.equal(typeof api.createFussballPublicSource,'function','runtime source factory exists');return api.createFussballPublicSource({competition,...options})}

test('native club mapping reuses exact German names and keeps reserve teams distinct',async()=>{
 const source=factory()
 const db={from(table){
  const rows={teams:[{id:10,name:'SpVgg 03 Ilvesheim'},{id:11,name:'SpVgg 03 Ilvesheim II'}],competitions:[{id:9999}],competition_teams:[{team_id:10,competition_id:9999},{team_id:11,competition_id:9999}]}
  const q={select(){return this},order(){return this},eq(key,value){if(table==='countries'){assert.equal(key,'code');assert.equal(value,'DE')}if(table==='teams'){assert.equal(key,'country_id');assert.equal(value,44)};return this},in(){return this},range:async()=>({data:rows[table],error:null}),maybeSingle:async()=>({data:{id:44},error:null}),then(resolve){resolve({data:rows[table],error:null})}}
  return q
 }}
 const clubs=await mapaKlubov(db,source)
 assert.equal(clubs.get(source.kljucKluba('SpVgg 03 Ilvesheim')),10)
 assert.equal(clubs.get(source.kljucKluba('SpVgg 03 Ilvesheim II')),11)
 assert.equal(source.kratkoIme('  FV 03 Ladenburg  '),'FV 03 Ladenburg')
 assert.equal(source.kljucKluba('FC MÜNCHEN'),source.kljucKluba('FC München'))
})

test('runtime loads complete evidence before reserving exact identities and releasing reports',async()=>{
 const b=batch(),calls=[]
 const db={rpc:async(name,args)=>{calls.push({name,args});return {data:b.identities,error:null}}}
 const source=factory({db,directory:'/unused',loadCapture:async(dir,scope)=>{calls.push({dir,scope});return b}})
 const rows=await source.zapisniki(code,()=>assert.fail('no source network fallback'))
 assert.equal(calls.length,2);assert.equal(calls[0].dir,'/unused')
 assert.deepEqual(calls[0].scope,{staffel,season:'2026/27',current:true})
 assert.equal(calls[1].name,'fussball_reserve_player_ids')
 assert.deepEqual(calls[1].args,{p_source_ids:b.identities.map(i=>i.source_id)})
 assert.equal(rows.length,1);assert.equal(rows[0].z.nepopoln,false)
 const appearances=source.nastopi(rows[0].z);assert.equal(appearances.length,30)
 appearances[0].minute=0;assert.equal(source.nastopi(rows[0].z)[0].minute,90)
 assert.throws(()=>source.nastopi(structuredClone(rows[0].z)),/bound|identity|report/i)
 const rounds=await source.razporedVseStrani(code);assert.equal(rounds.length,8)
 assert.equal(calls.length,2,'same invocation shares verified evidence')
})

test('reservation failure, missing client and wrong returned mapping release no reports',async()=>{
 const b=batch()
 for(const response of [{data:null,error:{message:'collision'}},{data:[],error:null},{data:[...b.identities,b.identities[0]],error:null},{data:b.identities.map((x,i)=>i?x:{...x,reg_st:1}),error:null}]){
  const source=factory({directory:'/unused',loadCapture:async()=>b,db:{rpc:async()=>response}})
  await assert.rejects(source.zapisniki(code),/identity|reservation|collision/i)
 }
 await assert.rejects(factory({directory:'/unused',loadCapture:async()=>b}).zapisniki(code),/database|client/i)
})

test('capture faults and wrong competition scope fail before identity reservation',async()=>{
 let writes=0;const db={rpc:async()=>{writes++;throw Error('must not reserve')}}
 const source=factory({directory:'/unused',db,loadCapture:async()=>{throw Error('capture incomplete')}})
 await assert.rejects(source.zapisniki(code),/incomplete/);assert.equal(writes,0)
 await assert.rejects(factory({directory:null,db}).zapisniki(code),/capture/i)
 for(const patch of [{source:'dfb'},{country_code:'PL'},{country_id:'DE'},{country_id:0},{country_id:null},{country_code:undefined},{slug:'pl-test'},{source_policy:'other-policy'}])assert.throws(()=>factory({competition:{...competition,...patch}}))
 await assert.rejects(factory({directory:'/unused',db,loadCapture:async()=>batch()}).zapisniki(staffel+':2025/26'),/archive|scope|season/i)
 assert.equal(writes,0)
})

test('FUSSBALL yellow evidence round-trips while wrong source, timing and recipient fail',()=>{
 const event={source:'fussball',matchId:'de-fussball-'+id,sourceUrl:url,side:0,clock:"43'",minute:43,reason:'not-published',eventSha256:'a'.repeat(64),ordinal:1,profileId:null}
 assert.deepEqual(parseUnattributedYellow(encodeUnattributedYellow(event)),event)
 for(const patch of [{source:'dfb'},{sourceUrl:url+'?other=1'},{sourceUrl:'https://evil.test/'},{matchId:'de-fussball-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'},{profileId:'some-player'},{clock:"46+2'",minute:46},{clock:"90+31'",minute:90},{ordinal:-1},{side:2},{reason:'red'},{minute:0}])assert.throws(()=>encodeUnattributedYellow({...event,...patch}))
})
