import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {runInNewContext} from 'node:vm'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {buildFussballImportBatch,fussballPlayerKey} from './fussball-import.mjs'
import {createFussballPublicSource} from './viri/fussball-public.mjs'
import {assertHistoricalReportImportable,skipIncompleteArchiveReport} from './lib/historical-statistics-import.mjs'
import {isFussballCommunityCompetition} from './fussball-community-policy.mjs'
import {completedReportIds} from './missing-report-import.mjs'
import {zaprtje} from './odtis-kode.mjs'
import {dodajStrelceSKlopi} from './zapisnik.mjs'
import {unattributedYellowEvents} from '../src/lib/nepripisaniRumeni.mjs'

const read=n=>readFileSync(new URL('./vzorci/'+n,import.meta.url))
const manifest=JSON.parse(read('de-fussball-zapisnik.json'))
const fonts=Object.fromEntries(Object.entries(manifest.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const id='031EQBPLF4000000VS5489BTVUS470OH',staffel='031EKNM2HG00000LVS5489BUVUR5FS5A-G',season='2026/27'
const competition={id:99,slug:'de-test-card-import',source:'fussball-public',country_id:1,country_code:'DE',source_policy:null,source_league_code:staffel+':'+season}
function syntheticNamedCardBatch(player){
 const result=razberiFantasyZapisnik(read('de-fussball-ilvesheim-main.html').toString(),read('de-fussball-ilvesheim-lineup.html').toString(),{id,lineupId:id,fonts})
 const fixture={id,zapisnikId:'de-fussball-'+id,url:result.dogodki[0].virUrl,krog:8,datum:'2026-10-11',ura:'15:00',domaci:result.z.domaci.ime,gostje:result.z.gostje.ime,rezultat:{domaci:2,gostje:3}}
 const batch=buildFussballImportBatch({version:1,scope:{provider:'fussball',staffel,season,seedUrl:manifest.provenance.roundUrl,asOfDate:'2026-10-26'},schedule:{staffel,season,rounds:[1,2,3,4,5,6,7,8],fixtures:[fixture],rescheduledIds:[]},reports:[{fixture:structuredClone(fixture),result}],rejectedReports:[],coverage:{expectedRounds:8,capturedRounds:8,fixtures:1,playedFixtures:1,attemptedReports:1,completeReports:1,rejectedReports:0,sampled:false,unscoredFixtures:{total:0,past:0,current:0,future:0,unknownDate:0}},activationEligible:false},{staffel,season})
 // TEST ONLY normalized-input composition: actual captured identities, roster,
 // goals and other statistics; the named red below is synthetic. No live named
 // card format or source capture is claimed by this importer-boundary test.
 const report=batch.reports[0],a=report.nastopi.find(a=>a.ime===player)
 assert.ok(a)
 const onField=a.minutaDo>85
 a.rdeci=1;a.redCardMinute=85
 if(onField){a.minutaDo=85;a.minute=85-a.minutaOd}
 report.z.rdeci=[{virId:a.virId,regSt:a.regSt,ime:a.ime,st:a.st,ekipa:a.ekipa,ekipaIdx:a.ekipaIdx,minuta:85,drugiRumeni:false,naIgriscu:onField}]
 return {batch,a}
}

for(const [player,minuteOff,minutes,teamMinutes]of [['Tobias Baumann',85,85,985],['Tobias Schneider',59,59,990]])test(`ordinary FUSSBALL factory persists synthetic named red for ${player}`,async()=>{
 const {batch,a}=syntheticNamedCardBatch(player)
 let row=null,appearanceRows=[],reservations=0,replacements=0,fingerprint='{}'
 const playerIds=new Map(),playerId=reg=>{if(!playerIds.has(reg))playerIds.set(reg,1000+playerIds.size);return playerIds.get(reg)}
 const db={from(table){let op='read',values;const q={
  select(){return q},eq(){return q},not(){return q},in(){return q},order(){return q},range(){return q},single(){return q},
  upsert(v){op='upsert';values=v;return q},update(v){op='update';values=v;return q},
  then(resolve){
   if(table==='matches'&&op!=='read'){row={...row,...values,id:7};resolve({data:{id:7},error:null})}
   else if(table==='matches')resolve({data:row?[row]:[],error:null})
   else if(table==='goals')resolve({data:[],error:null})
   else throw Error(`unexpected DB table ${table}`)
  },
 };return q},async rpc(name,args){
  if(name==='fussball_reserve_player_ids'){
   reservations++;assert.deepEqual(args.p_source_ids,batch.identities.map(p=>p.source_id))
   return {data:args.p_source_ids.map(source_id=>({source_id,reg_st:fussballPlayerKey(source_id)})),error:null}
  }
  assert.equal(name,'zamenjaj_nastope_tekme');assert.equal(args.p_match_id,7)
  replacements++;appearanceRows=structuredClone(args.p_nastopi)
  assert.equal(args.p_goli.length,5)
  return {error:null}
 }}
 const vir=createFussballPublicSource({competition,db,directory:'test-only-verified-current-capture',loadCapture:async(directory,scope)=>{
  assert.equal(directory,'test-only-verified-current-capture');assert.equal(scope.staffel,staffel);assert.equal(scope.season,season);assert.equal(scope.current,true)
  return batch
 }})
 assert.equal(vir.ime,'fussball-public');assert.notEqual(vir.bulkCaptured,true,'exercise the ordinary/nightly factory, not the bulk adapter')
 // Override is only for local RED→GREEN verification against a separately
 // reviewed importer checkout. CI/default always reads the installed importer.
 const source=readFileSync(process.env.SLFF_FUSSBALL_TEST_IMPORTER??new URL('./uvoz-zapisnikov.mjs',import.meta.url),'utf8')
 const start=source.indexOf('// --- seznam zapisnikov'),end=source.indexOf('// --- preračun točk po krogih')
 assert.ok(start>=0&&end>start)
 await runInNewContext(`(async()=>{${source.slice(start,end)};if(napak)throw Error('import failed')})()`,{
  samoManjkajoce:false,completedReportIds,assertHistoricalReportImportable,skipIncompleteArchiveReport,isFussballCommunityCompetition,db,tekmovanje:competition,vir,liga:competition.source_league_code,
  prenesi(){assert.fail('no source HTTP in capture-bound import')},arg:()=>null,samoZapisnik:null,preberiPosamezniZapisnik:null,omeji:null,tekocaSezona:true,virIme:null,unattributedYellowEvents,
  console:{log(){},warn(){},error(...args){throw Error(args.join(' '))}},process:{stdout:{write(){}}},Date,Set,Map,createHash,readdirSync,zaprtje,dodajStrelceSKlopi,MAPA:'memory',
  readFileSync:(path,...args)=>String(path)==='memory/odtisi-de-test-card-import.json'?fingerprint:readFileSync(path,...args),
  writeFileSync:(path,data)=>{assert.equal(path,'memory/odtisi-de-test-card-import.json');fingerprint=data},
  vseVrstice:async build=>(await build(0,999)).data,klubId:async name=>name===batch.reports[0].z.domaci.ime?201:202,krogId:async()=>5,
  igralecId:async(team,name,options)=>{const expected=batch.reports[0].nastopi.find(a=>a.regSt===options.regSt);assert.ok(expected);assert.equal(name,expected.ime);assert.equal(team,expected.ekipaIdx===0?201:202);return playerId(options.regSt)},
 })
 assert.equal(reservations,1);assert.equal(replacements,1)
 const stored=appearanceRows.find(r=>r.player_id===playerId(a.regSt))
 assert.ok(stored);assert.equal(stored.team_id,201);assert.equal(stored.red_cards,1)
 assert.equal(stored.red_card_minute,85,'ordinary adapter must persist the published red clock')
 assert.equal(stored.minute_off,minuteOff);assert.equal(stored.minutes_played,minutes)
 assert.equal(appearanceRows.filter(r=>r.team_id===201).reduce((n,r)=>n+r.minutes_played,0),teamMinutes)
 assert.equal(appearanceRows.length,30);assert.ok(row.imported_at)
 if(player==='Tobias Schneider')assert.ok(stored.red_card_minute>stored.minute_off,'bench dismissal clock must not be replaced by substitution time')
})

test('ordinary import fingerprint invalidates changed raw card revisions even when pending normalized data is identical',()=>{
 const source=readFileSync(new URL('./uvoz-zapisnikov.mjs',import.meta.url),'utf8')
 const start=source.indexOf('const odtisZapisnika ='),end=source.indexOf('let odtisi =',start)
 assert.ok(start>=0&&end>start)
 const fingerprint=runInNewContext(`(()=>{${source.slice(start,end)};return odtisZapisnika})()`,{createHash,odtisKode:'code',isFussballCommunityCompetition,tekmovanje:{...competition,source_policy:'fussball-community-cards-v1'}})
 const pending={nepopoln:true,opozorila:['SLFF_FUSSBALL_CARDS_PENDING_V1'],domaci:{ime:'Home'},gostje:{ime:'Away'}}
 assert.notEqual(fingerprint(pending,{revisionSha256:'a'.repeat(64)}),fingerprint(pending,{revisionSha256:'b'.repeat(64)}))
 assert.equal(fingerprint(pending,{revisionSha256:'a'.repeat(64)}),fingerprint(structuredClone(pending),{revisionSha256:'a'.repeat(64)}))
 assert.throws(()=>fingerprint(pending),/revision required/)
})
