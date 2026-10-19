import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import eps, { tekmeMreze, razporedStrani, sifraZapisnika, EpsZavrnitev } from './viri/eps.mjs'

const fixture = name => readFileSync(new URL(`./vzorci/${name}`,import.meta.url),'utf8')
const schedule=fixture('gr-eps-razpored-epsana-748.html')
const matrix=fixture('gr-eps-mreza-epsana-748.html')
const ids=new Set(tekmeMreze(matrix).filter(t=>t.izid&&!t.kontumacija).map(t=>sifraZapisnika('epsana.gr',t.gameId)))
for(const k of razporedStrani(schedule).krogi)for(const t of k.tekme)if(t.gameId&&t.izid&&!t.kontumacija)ids.add(sifraZapisnika('epsana.gr',t.gameId))
function reader(){const calls=[];return{calls,read:async url=>{calls.push(url);if(url.includes('display_schedule'))return schedule;if(url.includes('display_results'))return matrix;throw new EpsZavrnitev('Unexpected report read in skipped scope',403)}}}
test('real EPS inventory skips completed reports before fetching any report page',async()=>{
 assert.ok(ids.size>5)
 const r=reader();const reports=await eps.zapisniki('epsana.gr:748',r.read,{preskoci:ids})
 assert.deepEqual(reports,[]);assert.equal(r.calls.length,2)
})
test('one missing report remains eligible while completed reports are skipped',async()=>{
 const id=[...ids][0],skip=new Set(ids);skip.delete(id)
 const r=reader();await assert.rejects(()=>eps.zapisniki('epsana.gr:748',r.read,{preskoci:skip}),/Unexpected report read/)
 assert.equal(r.calls.length,3);assert.equal(new URL(r.calls[2]).searchParams.get('game_id'),id.split('-')[1])
})
test('single-report selection avoids reads of every other report in the real league inventory',async()=>{
 const id=[...ids].at(-1),r=reader()
 await assert.rejects(()=>eps.zapisniki('epsana.gr:748',r.read,{samoZapisnik:id}),/Unexpected report read/)
 assert.equal(r.calls.length,3);assert.equal(new URL(r.calls[2]).searchParams.get('game_id'),id.split('-')[1])
})
test('foreign namespace does not skip an identically numbered EPS report',async()=>{
 const target=[...ids][0],r=reader(),foreign=new Set([...ids].map(id=>id.replace('gr2-','gr1-')))
 await assert.rejects(()=>eps.zapisniki('epsana.gr:748',r.read,{preskoci:foreign,samoZapisnik:target}),/Unexpected report read/)
 assert.equal(r.calls.length,3)
})
