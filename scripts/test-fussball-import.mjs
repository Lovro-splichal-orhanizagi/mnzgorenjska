import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,writeFileSync,rmSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'

const api=await import('./fussball-import.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const read=name=>readFileSync(new URL(`./vzorci/${name}`,import.meta.url))
const manifest=JSON.parse(read('de-fussball-zapisnik.json'))
const fonts=Object.fromEntries(Object.entries(manifest.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const id='031EQBPLF4000000VS5489BTVUS470OH',staffel='031EKNM2HG00000LVS5489BUVUR5FS5A-G'
const url='https://www.fussball.de/spiel/spvgg-03-ilvesheim-sg-oftersheim/-/spiel/'+id
const scope={staffel,season:'2026/27'}
const clone=x=>structuredClone(x)
function season(){
 const result=razberiFantasyZapisnik(read('de-fussball-ilvesheim-main.html').toString(),read('de-fussball-ilvesheim-lineup.html').toString(),{fonts,id,lineupId:id})
 const fixture={id,zapisnikId:'de-fussball-'+id,url,krog:8,datum:'2026-10-11',ura:'15:00',domaci:result.z.domaci.ime,gostje:result.z.gostje.ime,rezultat:{domaci:2,gostje:3}}
 const future={...fixture,id:'031EQBPLIO000000VS5489BTVUS470OH',zapisnikId:'de-fussball-031EQBPLIO000000VS5489BTVUS470OH',url:'https://www.fussball.de/spiel/-/spiel/031EQBPLIO000000VS5489BTVUS470OH',krog:9,datum:'2026-10-28',rezultat:null}
 return {version:1,scope:{provider:'fussball',...scope,seedUrl:'https://www.fussball.de/spieltag/-/staffel/'+staffel,asOfDate:'2026-10-24'},schedule:{...scope,rounds:[1,2,3,4,5,6,7,8,9],fixtures:[fixture,future],rescheduledIds:[]},reports:[{fixture:clone(fixture),result}],rejectedReports:[],coverage:{expectedRounds:9,capturedRounds:9,fixtures:2,playedFixtures:1,attemptedReports:1,completeReports:1,rejectedReports:0,sampled:false,unscoredFixtures:{total:1,past:0,current:0,future:1,unknownDate:0}},activationEligible:false}
}
function build(s=season(),o=scope){assert.equal(typeof api.buildFussballImportBatch,'function','native batch adapter exists');return api.buildFussballImportBatch(s,o)}

test('authentic decoded report becomes exact native schedule, identities, goals and appearances',()=>{
 const original=season(),before=clone(original),batch=build(original)
 assert.deepEqual(original,before,'normalizing never mutates report-only evidence')
 assert.equal(batch.reports.length,1);assert.equal(batch.schedule.length,9)
 const {z,id:reportId,url:sourceUrl,nastopi}=batch.reports[0]
 assert.equal(reportId,'de-fussball-'+id);assert.equal(sourceUrl,url)
 assert.equal(z.sezona,'2026/27');assert.equal(z.nepopoln,false)
 assert.equal(nastopi.length,30);assert.equal(nastopi.filter(a=>a.zacetnik).length,22)
 assert.deepEqual([0,1].map(side=>nastopi.filter(a=>a.ekipaIdx===side).reduce((s,a)=>s+a.minute,0)),[990,990])
 assert.deepEqual(nastopi.filter(a=>a.vratar&&a.zacetnik).map(a=>a.ime),['Patrick Obsada','Simon Felix Knauf'])
 assert.deepEqual(z.goli.map(g=>[g.ime,g.minuta,g.ekipaIdx,g.rezultat]),[['Patrick Schleich',56,1,[0,1]],['Tobias Baumann',57,0,[1,1]],['Tobias Baumann',69,0,[2,1]],['Farzad Hamidi',71,1,[2,2]],['Patrick Schleich',83,1,[2,3]]])
 for(const goal of z.goli)assert.equal(goal.regSt,nastopi.find(a=>a.virId===goal.virId).regSt)
 assert.equal(z.opozorila.filter(w=>w.startsWith('SLFF_UNATTRIBUTED_YELLOW_V1:')).length,3)
 assert.ok(z.opozorila.every(w=>!w.startsWith('zapisnik nepopoln')))
 const future=batch.schedule.find(r=>r.stevilka===9).tekme[0]
 assert.equal(future.odigrana,false);assert.equal(future.izid,null);assert.equal(future.ura,'15:00')
 assert.ok(batch.identities.length>=30)
 for(const identity of batch.identities){assert.ok(Number.isSafeInteger(identity.reg_st));assert.ok(identity.reg_st>=2**52);assert.ok(identity.reg_st<2**53)}
 assert.equal(batch.activationEligible,false,'normalization does not activate')
})

test('source keys preserve the entire namespace and never use display names or shirts',()=>{
 assert.equal(typeof api.fussballPlayerKey,'function')
 const a='de-fussball-player-id-00NKAUN7HO000000VV0AG85VVUH1CIQU',b=a.replace('player-id','userid')
 const expected=parseInt(createHash('sha256').update(a).digest('hex').slice(0,13),16)+2**52
 assert.equal(api.fussballPlayerKey(a),expected);assert.notEqual(api.fussballPlayerKey(a),api.fussballPlayerKey(b))
 for(const bad of [null,'','Patrick Schleich','de-fussball-player-id-short',a.toLowerCase(),a+' '])assert.throws(()=>api.fussballPlayerKey(bad))
})

test('full coverage is independently recomputed before any report is released',()=>{
 assert.equal(typeof api.buildFussballImportBatch,'function')
 const mutations=[
  s=>{s.coverage.sampled=true},s=>{s.reports=[]},s=>{s.reports.push(clone(s.reports[0]))},
  s=>{s.rejectedReports.push({fixture:s.schedule.fixtures[0],reason:'unknown recipient'})},
  s=>{s.coverage.playedFixtures=0},s=>{s.coverage.capturedRounds--},
  s=>{s.schedule.rounds=[1,3]},s=>{s.schedule.fixtures.push(clone(s.schedule.fixtures[0]))},
  s=>{s.reports[0].result.reportStatistikaPripravljena=false},s=>{s.reports[0].result.z.nepopoln=false},
  s=>{s.reports[0].fixture.domaci='Other'},s=>{s.reports[0].result.z.krog=7},
  s=>{s.reports[0].result.z.rezultat.domaci=9},s=>{s.schedule.fixtures[1].datum='2026-10-01'},
  s=>{s.reports[0].result.nastopi[0].regSt=123},s=>{s.reports[0].result.z.goli[0].virId='de-fussball-userid-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'},
  s=>{s.reports[0].result.nastopi[0].minute=80},s=>{s.reports[0].result.nastopi[0].virId=s.reports[0].result.nastopi[1].virId},
 ]
 for(const mutation of mutations){const s=season();mutation(s);assert.throws(()=>build(s),undefined,mutation.toString())}
 assert.throws(()=>build(season(),{...scope,staffel:staffel.replace('5A-G','5Z-G')}))
 assert.throws(()=>build(season(),{...scope,season:'2025/26'}))
})

test('native goals and appearance totals must match their published side and progression',()=>{
 assert.equal(typeof api.buildFussballImportBatch,'function')
 for(const mutation of [
  s=>{s.reports[0].result.z.goli[0].rezultat={domaci:1,gostje:0}},
  s=>{s.reports[0].result.nastopi[0].ekipaIdx=1},
  s=>{s.reports[0].result.nastopi.find(a=>a.ime==='Patrick Schleich').goli=0},
  s=>{s.reports[0].result.nepripisaniRumeni[0].zapisnikId='de-fussball-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'},
 ]){const s=season();mutation(s);assert.throws(()=>build(s))}
})

test('strict season codes require an exact observed staffel and consecutive season',()=>{
 assert.equal(typeof api.parseFussballLeagueCode,'function')
 assert.deepEqual(api.parseFussballLeagueCode(staffel+':2026/27'),scope)
 for(const code of [staffel,staffel+':2026/28',staffel+':2026/2027',staffel+':26/27','https://evil.test/',staffel+':2026/27 '])assert.throws(()=>api.parseFussballLeagueCode(code))
})

test('capture loader requires replay, full-capture intent, exact scope, original digest and fresh current evidence',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'slff-fussball-loader-'))
 const now=Date.parse('2026-10-24T12:00:00Z'),createdAt='2026-10-24T10:00:00Z',completedAt='2026-10-24T11:00:00Z'
 const raw=JSON.stringify(season())+'\n',digest=createHash('sha256').update(raw).digest('hex')
 const manifest={options:{reportLimit:null},createdAt,completedAt,resultSha256:digest}
 const receipt={scope,resultSha256:digest,codeSha256:'b'.repeat(64),requests:20}
 let verified=0
 const verifyDirectory=async path=>{assert.equal(path,directory);verified++;return receipt}
 const save=m=>{writeFileSync(join(directory,'result.json'),raw);writeFileSync(join(directory,'manifest.json'),JSON.stringify(m))}
 try{
  save(manifest)
  const loaded=await api.loadFussballImportCapture(directory,{...scope,now},{verifyDirectory})
  assert.equal(verified,1);assert.equal(loaded.reports.length,1);assert.equal(loaded.provenance.resultSha256,digest)
  await assert.rejects(api.loadFussballImportCapture(directory,{...scope,now},{verifyDirectory:async()=>{throw Error('full replay failed')}}),/replay failed/)
  await assert.rejects(api.loadFussballImportCapture(directory,{...scope,season:'2025/26',now},{verifyDirectory}),/scope|league|season/)
  for(const patch of [{createdAt:'2026-10-22T10:00:00Z'},{completedAt:'2026-10-25T10:00:00Z'},{createdAt:'invalid'},{options:{reportLimit:1}},{resultSha256:'c'.repeat(64)}]){
   save({...manifest,...patch});await assert.rejects(api.loadFussballImportCapture(directory,{...scope,now},{verifyDirectory}))
  }
  save(manifest);writeFileSync(join(directory,'result.json'),raw.replace('Patrick Obsada','Wrong Person'))
  await assert.rejects(api.loadFussballImportCapture(directory,{...scope,now},{verifyDirectory}),/changed/)
  save(manifest);rmSync(join(directory,'result.json'));writeFileSync(join(directory,'other.json'),raw);symlinkSync(join(directory,'other.json'),join(directory,'result.json'))
  await assert.rejects(api.loadFussballImportCapture(directory,{...scope,now},{verifyDirectory}),/regular/)
 }finally{rmSync(directory,{recursive:true,force:true})}
})
