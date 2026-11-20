import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {withBenchScorers,compareAppearances,FIELDS} from './slf595-audit-appearances.mjs'

function fixture(){
 return {domaci:{ime:'PRIVATE club',rezerve:[{st:7,ime:'PRIVATE name',regSt:'PRIVATE registration'}]},
  gostje:{ime:'away',rezerve:[]},rezultat:{domaci:1,gostje:1},
  goli:[{ekipaIdx:0,st:7,minuta:61}],rumeni:[],rdeci:[],zgresene:[]}
}
function dbRow(a){return {team_id:a.ekipaIdx===0?10:20,shirt_number:a.st,reg_st:a.regSt,
 ...Object.fromEntries(FIELDS.map(([col,src])=>[col,a[src]]))}}
const compare=(s,d)=>compareAppearances(s,d,10,20)

test('bench scorer is inferred from retained goal and reserve; all DB fields still checked',()=>{
 const z=fixture(),before=structuredClone(z),parsed=[]
 const s=withBenchScorers(z,parsed),a=s.apps[0]
 assert.equal(s.rawCount,0);assert.equal(s.apps.length,1);assert.equal(parsed.length,0)
 assert.deepEqual(z,before)
 assert.deepEqual(s.bench,{warning_count:1,added:[{side:0,shirt:7,minute_on:61,goals:1,own_goals:0,source_goal_minutes:[61]}]})
 assert.equal(a.minute,29);assert.equal(a.zacetnik,false)
 assert.deepEqual(compare(s.apps,[dbRow(a)]),[])
 for(const [col] of FIELDS){
  const d=dbRow(a);d[col]=typeof d[col]==='boolean'?!d[col]:d[col]+1
  assert.ok(compare(s.apps,[d]).some(x=>x.field===col),col)
 }
 const d=dbRow(a);d.reg_st='wrong'
 assert.ok(compare(s.apps,[d]).some(x=>x.field==='reg_st'))
 assert.ok(!JSON.stringify(s.bench).includes('PRIVATE'))
 assert.ok(!JSON.stringify(compare(s.apps,[d])).includes('PRIVATE'))
})

test('no scorer, wrong side or missing reserve cannot justify an extra DB appearance',()=>{
 const original=withBenchScorers(fixture(),[]).apps[0]
 for(const kind of ['no-goal','wrong-side','no-reserve']){
  const z=fixture()
  if(kind==='no-goal')z.goli=[]
  if(kind==='wrong-side')z.goli[0].ekipaIdx=1
  if(kind==='no-reserve')z.domaci.rezerve=[]
  const s=withBenchScorers(z,[])
  assert.equal(s.bench.added.length,0)
  assert.ok(compare(s.apps,[dbRow(original)]).some(d=>d.problem==='extra-in-db'))
 }
})

test('existing appearance stays unchanged and bench step is idempotent',()=>{
 const z=fixture(),s=withBenchScorers(z,[]),again=withBenchScorers(z,s.apps)
 assert.deepEqual(again.apps,s.apps);assert.equal(again.bench.added.length,0)
 assert.equal(again.bench.warning_count,0)
})

test('multiple goals use earliest minute and preserve penalty/own-goal semantics',()=>{
 const z=fixture();z.goli.push({ekipaIdx:0,st:7,minuta:52,enajstmetrovka:true},{ekipaIdx:0,st:7,minuta:80,avtogol:true})
 const s=withBenchScorers(z,[]),a=s.apps[0]
 assert.equal(s.apps.length,1);assert.equal(a.minutaOd,52)
 assert.equal(a.goli,2)
 assert.equal(a.goliIzEnajstmetrovke,1);assert.equal(a.avtogoli,1)
})

test('extra duplicate DB appearance cannot disappear in side+shirt map',()=>{
 const s=withBenchScorers(fixture(),[]),a=dbRow(s.apps[0])
 const diffs=compare(s.apps,[a,{...a}])
 assert.ok(diffs.some(d=>d.problem==='count-mismatch'))
 assert.ok(diffs.some(d=>d.problem==='duplicate-key'&&d.origin==='db'))
})

test('equal-count duplicate keys on either side remain review',()=>{
 const a=withBenchScorers(fixture(),[]).apps[0],b={...a,st:8}
 for(const [source,db,origin] of [ [[a,a],[dbRow(a),dbRow(b)],'source'],[[a,b],[dbRow(a),dbRow(a)],'db'] ]){
  assert.ok(compare(source,db).some(d=>d.problem==='duplicate-key'&&d.origin===origin))
 }
})

test('missing shirts, unknown teams and missing DB rows cannot pass',()=>{
 const a=withBenchScorers(fixture(),[]).apps[0]
 assert.ok(compare([{...a,st:null}],[{...dbRow(a),shirt_number:null}]).some(d=>d.problem==='ambiguous-key'))
 assert.ok(compare([a],[{...dbRow(a),team_id:99}]).some(d=>d.problem==='ambiguous-key'))
 assert.ok(compare([a],[]).some(d=>d.problem==='missing-in-db'))
})

test('one-off audit uses normalization and guarded comparator, and CI runs this test',()=>{
 const audit=fs.readFileSync(new URL('./slf595-audit.mjs',import.meta.url),'utf8')
 assert.match(audit,/withBenchScorers\(z,nastopi\(z\)\)/)
 assert.match(audit,/compareAppearances\(s\?\.apps\?\?\[\],dbApps,n.home_team_id,n.away_team_id\)/)
 assert.match(audit,/!m.appearances.differences.length/)
 assert.match(audit,/raw_source:s\?\.rawCount/)
 assert.match(fs.readFileSync(new URL('./test-dodatni.txt',import.meta.url),'utf8'),/scripts\/test-slf595-audit-appearances.mjs/)
})
