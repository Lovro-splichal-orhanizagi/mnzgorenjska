import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {vZapisnik,nastopi} from './viri/fcf.mjs'
import {nativePlanFixture,privacyProjection} from './fcf-native-plan-test-fixture.mjs'
import {planFcfNativeMatchRows} from './fcf-target-native-plan.mjs'

const html=name=>readFileSync(new URL(`./vzorci/${name}`,import.meta.url),'utf8')
const primera='es-fcf-acta-primera-3791085.html'
// Literal public Gols rows in retained official HTML: actor, minute, score after
// that event. These inputs are unmodified; no score is synthesized or appended.
test('retained official 3791085 goals preserve each published numeric score tuple',()=>{
 const report=vZapisnik(html(primera))
 assert.deepEqual(report.goli,[
  {ekipaIdx:1,st:9,ime:'Baldeh Baldeh Jam',regSt:733530,minuta:32,avtogol:false,enajstmetrovka:false,rezultat:[0,1]},
  {ekipaIdx:1,st:9,ime:'Baldeh Baldeh Jam',regSt:733530,minuta:44,avtogol:false,enajstmetrovka:false,rezultat:[0,2]},
  {ekipaIdx:0,st:9,ime:'Sánchez Díaz Àlex',regSt:15055957,minuta:56,avtogol:false,enajstmetrovka:false,rezultat:[1,2]},
 ])
 assert.notEqual(report.goli[0].rezultat,report.goli[1].rezultat)
 report.goli[0].rezultat[0]=99
 assert.deepEqual(report.goli[1].rezultat,[0,2])
 assert.deepEqual(vZapisnik(html(primera)).goli[0].rezultat,[0,1])
})

for(const [file,expected] of [
 ['es-fcf-acta-rdeci-4139542.html',{ekipaIdx:0,st:12,ime:'Amahdi Abdelrahman',regSt:32693625,minuta:80,avtogol:false,enajstmetrovka:true,rezultat:[2,4]}],
 ['es-fcf-acta-avtogol-4139572.html',{ekipaIdx:1,st:3,ime:'Navarra Barbosa Pau',regSt:19703228,minuta:89,avtogol:true,enajstmetrovka:false,rezultat:[2,1]}],
])test(`retained official ${file} keeps score, actor, minute and special goal flags`,()=>{
 assert.deepEqual(vZapisnik(html(file)).goli.at(-1),expected)
})

test('real retained goals reach existing native row mapper as numeric official scores in TEST ONLY synthetic calendar/DB context',()=>{
 const report=vZapisnik(html(primera)),f=nativePlanFixture(),match=f.sourceData.fixtures.find(m=>m.round===3)
 // Only the surrounding mapping/calendar/privacy inventory is synthetic. The
 // report, appearances and goals come directly from unchanged retained HTML.
 Object.assign(match,{statisticsStatus:'available',appearances:nastopi(report),goals:report.goli,homeGoals:1,awayGoals:2})
 f.databaseInventory.groups.find(g=>g.slug===f.targetSlug).country_id=34
 f.databaseInventory.identityPrivacy=privacyProjection(783,match.appearances,f.databaseInventory.capturedUTC)
 const rows=planFcfNativeMatchRows({...f,sourceMatchId:match.id})
 assert.deepEqual(rows.goals.map(g=>[g.scorer_reg_st,g.minute,g.is_own_goal,g.is_penalty,g.score_home,g.score_away]),[
  [733530,32,false,false,0,1],[733530,44,false,false,0,2],[15055957,56,false,false,1,2],
 ])
})
