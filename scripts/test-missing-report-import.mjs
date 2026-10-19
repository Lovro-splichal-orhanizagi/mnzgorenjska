import test from 'node:test'
import assert from 'node:assert/strict'
import { requireMissingReportImportScope, completedReportIds } from './missing-report-import.mjs'
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
