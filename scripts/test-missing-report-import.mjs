import test from 'node:test'
import assert from 'node:assert/strict'
import { requireMissingReportImportScope, completedReportIds } from './missing-report-import.mjs'
import { vseVrstice } from './strani.mjs'
const competition={id:783,active:false,source:'eps',source_league_code:'epsana.gr:748',source_policy:null,date_only_deadline_policy:null}
test('missing-only import is limited to inactive current-season EPS without override or custom policy',()=>{
 assert.doesNotThrow(()=>requireMissingReportImportScope({competition,leagueCode:'epsana.gr:748'}))
 for(const patch of [{competition:{...competition,active:true}},{competition:{...competition,source:'pzpn'}},{competition:{...competition,source_policy:'pending'}},{competition:{...competition,date_only_deadline_policy:'custom'}},{leagueCode:'epsana.gr:700'},{sourceOverride:'eps'},{singleReport:'gr2-30813'}]){
  assert.throws(()=>requireMissingReportImportScope({competition,leagueCode:'epsana.gr:748',...patch}))
 }
})
test('incomplete or missing reports are never included in the completed skip set',()=>{
 assert.deepEqual([...completedReportIds([{zapisnik_id:'gr2-1',imported_at:'2026-10-10'},{zapisnik_id:'gr2-2',imported_at:null},{zapisnik_id:null,imported_at:'2026-10-10'},{zapisnik_id:'gr2-1',imported_at:'2026-10-10'}])],['gr2-1'])
})

test('actual importer passes every completed ID to EPS before traversal while incomplete IDs remain eligible',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm')
 const {assertHistoricalReportImportable}=await import('./lib/historical-statistics-import.mjs')
 const source=readFileSync(new URL('./uvoz-zapisnikov.mjs',import.meta.url),'utf8')
 const body=source.slice(source.indexOf('// --- seznam zapisnikov'),source.indexOf('// --- nespremenjeni zapisniki'))
 const rows=[{zapisnik_id:'gr2-1',imported_at:'2026-10-18T00:00:00Z'},{zapisnik_id:'gr2-2',imported_at:null}]
 const db={from(table){assert.equal(table,'matches');const query={select(){return query},eq(k,v){assert.equal(k,'rounds.competition_id');assert.equal(v,783);return query},not(){return query},lt(){assert.fail('Missing-only import must skip all completed reports, including recent ones')},order(){return query},range(){return query},then(resolve){resolve({data:rows,error:null})}};return query}}
 let observed=false
 const result=await runInNewContext(`(async()=>{${body};return zapisniki.map(r=>r.id)})()`,{
  samoManjkajoce:true,completedReportIds,vseVrstice,db,tekmovanje:competition,liga:'epsana.gr:748',arg:()=>null,samoZapisnik:null,preberiPosamezniZapisnik:null,omeji:null,console:{log(){}},Date,Set,assertHistoricalReportImportable,
  vir:{ime:'eps',async zapisniki(code,read,options){observed=true;assert.equal(options.preskoci.has('gr2-1'),true);assert.equal(options.preskoci.has('gr2-2'),false);return[{id:'gr2-2',z:{}}]}},prenesi:()=>assert.fail('Source boundary must be controlled by EPS')
 })
 assert.equal(observed,true);assert.deepEqual(Array.from(result),['gr2-2'])
})
