import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,rmSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
const api=await import('./dfb-pending.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const competition={id:88,slug:'de-regionalliga-nordost',source:'dfb',country_code:'DE',active:true,source_league_code:'regionalliga-nordost/2026-2027'}
const fixture={id:'2425990',url:'https://datencenter.dfb.de/datencenter/regionalliga-nordost/2026-2027/1-spieltag/fc-rot-weiss-erfurt-bfc-dynamo-2425990',sezona:'2026/27',krog:1,datum:'2026-07-24',ura:'19:00',domaci:'FC Rot-Weiß Erfurt',gostje:'BFC Dynamo',domaciId:'fc-rot-weiss-erfurt',gostjeId:'bfc-dynamo',izid:{domaci:4,gostje:1}}
const now=new Date('2026-10-26T12:00:00Z')
test('nightly pending scope rejects inactive, archive, overridden, limited and single-report imports',()=>{
 assert.equal(typeof api.requireDfbPendingScope,'function')
 const options={competition,leagueCode:competition.source_league_code}
 assert.doesNotThrow(()=>api.requireDfbPendingScope(options))
 for(const patch of [{competition:{...competition,active:false}},{leagueCode:'regionalliga-nordost/2025-2026'},{sourceOverride:'dfb'},{singleReport:'de-dfb-2425990'},{limit:1},{cleanup:true}])assert.throws(()=>api.requireDfbPendingScope({...options,...patch}))
})
test('quarantine preserves exact rejected bytes and hash; failed persistence is fatal; retries wait and bound exact IDs',async()=>{
 assert.equal(typeof api.createDfbPendingContext,'function')
 const directory=mkdtempSync(join(tmpdir(),'dfb-pending-')),raw=Buffer.from([0x3c,0x68,0x3e,0xff,0x00,0x0a]),calls=[]
 const db={async rpc(name,p){calls.push({name,p});if(name==='get_dfb_pending_reports')return {data:[],error:null};if(name==='complete_dfb_pending_report')return {data:true,error:null};return {data:{match_id:7,round_id:2},error:null}}}
 try{
  const c=await api.createDfbPendingContext({db,competition,leagueCode:competition.source_league_code,directory,now:()=>now,rawByUrl:new Map([[fixture.url,raw]])})
  await c.reject({fixture,status:'DFB_UNSUPPORTED_FORMAT',reason:'dfb: unsupported clock',html:'decoded text'})
  assert.equal(c.remaining.size,1)
  const p=calls.at(-1).p
  assert.equal(p.p_raw_base64,raw.toString('base64'));assert.equal(p.p_sha256,createHash('sha256').update(raw).digest('hex'))
  assert.deepEqual(readFileSync(join(directory,competition.slug,'de-dfb-2425990',p.p_sha256+'.bin')),raw)
  const meta=JSON.parse(readFileSync(join(directory,competition.slug,'de-dfb-2425990',p.p_sha256+'.json')))
  assert.equal(meta.fixture.url,fixture.url);assert.equal(meta.observed_at,'2026-10-26T12:00:00.000Z')
  await c.complete({id:'de-dfb-2425990',matchId:7,warnings:[]});assert.equal(c.remaining.size,0)
  assert.equal(calls.at(-1).name,'complete_dfb_pending_report')
  const fail={async rpc(name){return name==='get_dfb_pending_reports'?{data:[],error:null}:{error:{message:'DB unavailable'}}}}
  const broken=await api.createDfbPendingContext({db:fail,competition,leagueCode:competition.source_league_code,directory,now:()=>now,rawByUrl:new Map([[fixture.url,raw]])})
  await assert.rejects(()=>broken.reject({fixture,status:'DFB_INVALID_REPORT',reason:'bad',html:''}),/DB unavailable/)
  const rows=Array.from({length:13},(_,i)=>({report_id:'de-dfb-'+(2425990+i),raw_sha256:'a'.repeat(64),next_retry_at:i===0?'2026-10-26T13:00:00Z':'2026-10-26T11:00:00Z'}))
  const r=await api.createDfbPendingContext({db:{async rpc(){return {data:rows,error:null}}},competition,leagueCode:competition.source_league_code,directory,now:()=>now,rawByUrl:new Map()})
  assert.equal(r.due.size,10);assert.equal(r.deferred.size,3);assert.ok(r.deferred.has('de-dfb-2425990'))
  await assert.rejects(()=>r.reject({fixture,status:'DFB_INVALID_REPORT',reason:'bad'}),/original bytes/)
 }finally{rmSync(directory,{recursive:true,force:true})}
})
import vir from './viri/dfb.mjs'
import {runInNewContext} from 'node:vm'
// Reuse the independent round-robin fixture generator from the existing adapter suite.
const adapterTests=readFileSync(new URL('./test-dfb.mjs',import.meta.url),'utf8')
const seasonPages=runInNewContext('('+adapterTests.slice(adapterTests.indexOf('function fullSeasonPages()'),adapterTests.indexOf("test('season discovery"))+')')
async function sourceFixture(){
 const pages=seasonPages(),rounds=await vir.razporedVseStrani(competition.source_league_code,async url=>pages.get(url)),fixtures=rounds[0].tekme.slice(0,4),reports=new Map()
 const original=readFileSync(new URL('./vzorci/de-dfb-2425990.html',import.meta.url),'utf8')
 for(const t of fixtures){
  for(const [url,html]of pages)pages.set(url,html.replace(`${t.id}">- : -</a>`,`${t.id}">4 : 1</a>`))
  const body=original.replaceAll('2425990',t.id).replaceAll('FC Rot-Weiß Erfurt','__HOME__').replaceAll('BFC Dynamo','__AWAY__').replaceAll('fc-rot-weiss-erfurt','__HOMEID__').replaceAll('bfc-dynamo','__AWAYID__').replaceAll('__HOME__',t.domaci).replaceAll('__AWAY__',t.gostje).replaceAll('__HOMEID__',t.domaciId).replaceAll('__AWAYID__',t.gostjeId).replaceAll('24. Juli 2026','1. August 2026').replaceAll('19:00 Uhr','14:00 Uhr')
  reports.set(t.url,body)
 }
 return {pages,fixtures,reports,read:async url=>pages.get(url)??reports.get(url)}
}
test('actual parser quarantines bad/good/bad/good and rejects wrong-header or quarantine DB failure before sibling writes',async()=>{
 const f=await sourceFixture(),rejected=[]
 for(const i of [0,2])f.reports.set(f.fixtures[i].url,f.reports.get(f.fixtures[i].url).replaceAll("26'","89 12'"))
 const out=await vir.zapisniki(competition.source_league_code,f.read,{zberiNapake:true,onRejected:async r=>rejected.push(r)})
 assert.deepEqual(out.map(r=>r.id),f.fixtures.filter((_,i)=>i%2).map(t=>'de-dfb-'+t.id))
 assert.equal(rejected.length,2)
 assert.equal(rejected[0].fixture.url,f.fixtures[0].url)
 await assert.rejects(()=>vir.zapisniki(competition.source_league_code,f.read),/nepodprta minuta/)
 const wrong=new Map(f.reports);wrong.set(f.fixtures[0].url,wrong.get(f.fixtures[0].url).replaceAll('1. August 2026','2. August 2026'))
 await assert.rejects(()=>vir.zapisniki(competition.source_league_code,async u=>f.pages.get(u)??wrong.get(u),{zberiNapake:true,onRejected:async()=>{throw Error('must not quarantine wrong header')}}),/razpored: neujemanje datum/)
 await assert.rejects(()=>vir.zapisniki(competition.source_league_code,f.read,{zberiNapake:true,onRejected:async()=>{throw Error('DB down')}}),/DB down/)
})
import {completedReportIds} from './missing-report-import.mjs'
import {assertHistoricalReportImportable,skipIncompleteArchiveReport} from './lib/historical-statistics-import.mjs'
import {isFussballCommunityCompetition} from './fussball-community-policy.mjs'
import {unattributedYellowEvents} from '../src/lib/nepripisaniRumeni.mjs'
import {zaprtje} from './odtis-kode.mjs'
import {dodajStrelceSKlopi} from './zapisnik.mjs'
test('actual importer preserves rejected old rows, imports good siblings, and later clears only a fully successful repair',async()=>{
 const f=await sourceFixture(),directory=mkdtempSync(join(tmpdir(),'dfb-native-pending-')),pending=new Map(),matches=new Map(),stats=new Map(),goals=new Map(),ids=new Map(),rawByUrl=new Map(),completed=[]
 const idFor=key=>{if(!ids.has(key))ids.set(key,ids.size+1);return ids.get(key)}
 for(const t of f.fixtures){const id=idFor(t.id);matches.set('de-dfb-'+t.id,{id,zapisnik_id:'de-dfb-'+t.id,imported_at:'2026-08-02T00:00:00Z',import_warnings:[]});stats.set(id,[{old_verified:true}]);goals.set(id,[{old_verified:true}])}
 const previous=f.reports.get(f.fixtures[0].url)
 for(const i of [0,2])f.reports.set(f.fixtures[i].url,f.reports.get(f.fixtures[i].url).replaceAll("26'","89 12'"))
 let failRepair=false,fingerprint='{}'
 const db={from(table){let op='read',v,single=false,filters=[];const q={select(){return q},eq(k,x){filters.push([k,x]);return q},not(){return q},in(k,x){filters.push([k,x]);return q},order(){return q},range(){return q},lt(){filters.push(['old',true]);return q},gte(){return q},upsert(x){op='upsert';v=x;return q},insert(x){op='insert';v=x;return q},delete(){op='delete';return q},update(x){op='update';v=x;return q},single(){single=true;return q},then(resolve){
  const mid=filters.find(([k])=>['id','match_id'].includes(k))?.[1]
  if(table==='matches'){
   if(op==='upsert'){const row=matches.get(v.zapisnik_id);Object.assign(row,v);resolve({data:{id:row.id},error:null})}
   else if(op==='update'){const row=[...matches.values()].find(r=>r.id===mid);Object.assign(row,v);resolve({error:null})}
   else resolve({data:filters.some(([k])=>k==='old')?[]:[...matches.values()],error:null})
  }else if(table==='goals'){
   if(op==='read')resolve({data:[],error:null})
   else{if(op==='insert'||op==='upsert'){for(const g of Array.isArray(v)?v:[v]){if(!goals.has(g.match_id))goals.set(g.match_id,[]);goals.get(g.match_id).push(structuredClone(g))}}resolve({error:null})}
  }else if(table==='appearances')resolve({data:(stats.get(mid)??[]).filter(a=>a.player_id),error:null})
  else throw Error('unexpected table '+table)
 }};return q},async rpc(name,p){
  if(name==='get_dfb_pending_reports')return {data:[...pending].map(([report_id,r])=>({report_id,raw_sha256:r.sha,next_retry_at:r.next})),error:null}
  if(name==='mark_dfb_report_pending'){const id='de-dfb-'+p.p_fixture.id,row=matches.get(id);row.imported_at=null;row.import_warnings=['zapisnik nepopoln: DFB pending'];pending.set(id,{sha:p.p_sha256,next:'2026-10-26T18:00:00Z'});return {data:{match_id:row.id,round_id:5},error:null}}
  if(name==='complete_dfb_pending_report'){if(failRepair)return {error:{message:'resolution DB failed'}};const row=matches.get(p.p_report_id);row.imported_at='2026-10-27T12:00:00Z';row.import_warnings=p.p_warnings;pending.delete(p.p_report_id);completed.push(p.p_report_id);return {data:true,error:null}}
  if(name==='zamenjaj_nastope_tekme'){stats.set(p.p_match_id,structuredClone(p.p_nastopi));return {error:null}}
  throw Error('unexpected rpc '+name)
 }}
 const script=readFileSync(new URL('./uvoz-zapisnikov.mjs',import.meta.url),'utf8'),body=script.slice(script.indexOf('// --- seznam zapisnikov'),script.indexOf('// --- preračun točk po krogih'))
 let clock=now
 const run=()=>runInNewContext(`(async()=>{${body};return {napak,pending:typeof dfbPendingContext==='undefined'?0:dfbPendingContext?.remaining.size??0}})()`,{
  samoManjkajoce:false,completedReportIds,assertHistoricalReportImportable,skipIncompleteArchiveReport,isFussballCommunityCompetition,db,tekmovanje:competition,vir,liga:competition.source_league_code,prenesi:async(url,...rest)=>{const html=await f.read(url,...rest);rawByUrl.set(url,Buffer.from(html));return html},arg:k=>k==='dfb-pending'?true:k==='sveze'?'21':null,samoZapisnik:null,preberiPosamezniZapisnik:null,omeji:null,tekocaSezona:true,virIme:null,unattributedYellowEvents,createDfbPendingContext:o=>api.createDfbPendingContext({...o,now:()=>clock}),dfbRawResponses:rawByUrl,
  console:{log(){},warn(){},error(){}},process:{stdout:{write(){}}},Date,Set,Map,createHash,readdirSync,zaprtje,dodajStrelceSKlopi,MAPA:directory,
  readFileSync:(path,...args)=>String(path).endsWith('/odtisi-'+competition.slug+'.json')?fingerprint:readFileSync(path,...args),writeFileSync:(path,data)=>{if(String(path).endsWith('/odtisi-'+competition.slug+'.json'))fingerprint=data;else throw Error('unexpected write '+path)},
  vseVrstice:async build=>{const r=await build(0,999);if(r.error)throw Error(r.error.message);return r.data},klubId:async name=>idFor(name),krogId:async()=>5,igralecId:async(team,name)=>idFor(`${team}|${name}`),
 })
 try{
  const a=await run();assert.equal(a.napak,0);assert.equal(a.pending,2)
  for(const i of [0,2]){const row=matches.get('de-dfb-'+f.fixtures[i].id);assert.equal(row.imported_at,null);assert.deepEqual(stats.get(row.id),[{old_verified:true}]);assert.deepEqual(goals.get(row.id),[{old_verified:true}])}
  for(const i of [1,3]){const row=matches.get('de-dfb-'+f.fixtures[i].id);assert.ok(row.imported_at);assert.equal(stats.get(row.id).filter(a=>a.started).length,22)}
  // An unchanged old fingerprint cannot suppress recovery after quarantine.
  f.reports.set(f.fixtures[0].url,previous);clock=new Date('2026-10-27T12:00:00Z')
  failRepair=true;const b=await run();assert.ok(b.napak>0);assert.equal(pending.has('de-dfb-'+f.fixtures[0].id),true);assert.equal(matches.get('de-dfb-'+f.fixtures[0].id).imported_at,null)
  failRepair=false;await run();assert.deepEqual(completed,['de-dfb-'+f.fixtures[0].id]);assert.equal(pending.size,1)
 }finally{rmSync(directory,{recursive:true,force:true})}
})
