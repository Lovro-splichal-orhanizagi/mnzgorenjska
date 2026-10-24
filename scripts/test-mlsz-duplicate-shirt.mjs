import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {vZapisnik,nastopi} from './viri/mlsz.mjs'

const raw=readFileSync(new URL('./vzorci/hu-adatbank-bp1-2121979.html',import.meta.url))
const parse=html=>vZapisnik(html??raw.toString('utf8'),{id:'2121979'})
const player=(apps,id)=>apps.find(a=>a.regSt===id)
function editPlayer(id,edit){
 let found=0
 const html=raw.toString('utf8').replace(/<tr class="template-tr-selectable">[\s\S]*?<\/tr>/g,row=>{
  if(!row.includes(`href="https://adatbank.mlsz.hu/player/${id}.html"`))return row
  found++;return edit(row)
 })
 assert.equal(found,1)
 return html
}
const event=(type,minute)=>`<span style="background-image: url(timeline/event_${type}.png)">${minute}&apos;</span>`

test('authentic BP1 duplicate shirt keeps all 31 appearances and both full team-minute totals',()=>{
 assert.equal(raw.length,257207)
 assert.equal(createHash('sha256').update(raw).digest('hex'),'267bcefe84ed2c9ae0465d79a63cc110931f7f0fd9a423cf73063432f4dcaaaf')
 const z=parse(),before=structuredClone(z),apps=nastopi(z)
 assert.deepEqual(z,before,'temporary source-ID projection never changes the parsed source report')
 assert.deepEqual(z.rezultat,{domaci:5,gostje:1});assert.equal(z.goli.length,6);assert.deepEqual(z.opozorila,[])
 assert.equal(apps.length,31)
 assert.ok(apps.every(a=>Number.isInteger(a.st)),'internal actor keys never replace published output shirts')
 assert.deepEqual([0,1].map(side=>apps.filter(a=>a.ekipaIdx===side).reduce((sum,a)=>sum+a.minute,0)),[990,990])
 for(const [id,shirt,on,off,minutes] of [[510664,5,0,90,90],[757108,5,62,90,28],[781426,14,0,62,62]]){
  const a=player(apps,id);assert.deepEqual([a.st,a.minutaOd,a.minutaDo,a.minute],[shirt,on,off,minutes])
 }
})

for(const [id,clock,bounds] of [[510664,78,[[0,78,78],[62,90,28]]],[757108,83,[[0,90,90],[62,83,21]]]]){
 test(`same-shirt goal and cards belong only to exact source player ${id}`,()=>{
  const html=editPlayer(id,row=>row.replace(/(<td class="match_players_cards">)/,`$1${event('goal',70)}${event('yellowcard',74)}${event('redcard',clock)}`))
  const z=parse(html),apps=nastopi(z)
  const goal=z.goli.find(g=>g.minuta===70)
  assert.equal(goal.regSt,id,'the native writer can bind a same-shirt scorer by exact source ID')
  // Exercise the actual writer's registration-first scorer expression, with
  // the published-shirt fallback deliberately overwritten by the other player.
  const writer=readFileSync(new URL('./uvoz-zapisnikov.mjs',import.meta.url),'utf8')
  const expression=writer.match(/let pId =\s*([\s\S]*?)\n      if \(!pId && g\.ime\)/)[1]
  const bind=new Function('g','idPoStevilki',`return (${expression})`)
  const nativeIDs=new Map()
  for(const a of apps){nativeIDs.set(`${a.ekipaIdx}|${a.st}`,a.regSt+10000000);nativeIDs.set(`${a.ekipaIdx}|r${a.regSt}`,a.regSt+10000000)}
  nativeIDs.set('0|5',(id===510664?757108:510664)+10000000)
  assert.equal(bind(goal,nativeIDs),id+10000000)
  for(const [index,pid] of [510664,757108].entries()){
   const a=player(apps,pid)
   assert.deepEqual([a.minutaOd,a.minutaDo,a.minute],bounds[index])
   assert.deepEqual([a.goli,a.rumeni,a.rdeci,a.redCardMinute],pid===id?[1,1,1,clock]:[0,0,0,null])
  }
 })
}

test('a duplicate goalkeeper shirt cannot transfer keeper role or substitution to an outfield entrant',()=>{
 const html=editPlayer(757108,row=>row.replace(/class="playerNum">\s*5/, 'class="playerNum">92'))
 const apps=nastopi(parse(html))
 assert.deepEqual([player(apps,1057742).minutaOd,player(apps,1057742).minutaDo,player(apps,1057742).minute],[0,46,46])
 assert.deepEqual([player(apps,757108).st,player(apps,757108).minute,player(apps,757108).vratar],[92,28,false])
 assert.equal(apps.filter(a=>a.ekipaIdx===0&&a.vratar).reduce((sum,a)=>sum+a.minute,0),90)
})

test('ambiguous actors without exact source identity fail instead of choosing a same-shirt player',()=>{
 const z=parse();z.rumeni.push({ekipaIdx:0,st:5,ime:'Roha Levente',minuta:70})
 assert.throws(()=>nastopi(z),/identity|identit|reg/i)
 const missing=parse();missing.domaci.postava.find(p=>p.regSt===510664).regSt=null
 assert.throws(()=>nastopi(missing),/identity|identit|reg/i)
})

test('a same-shirt scorer without a source entry cannot fall back to the active shirt owner',()=>{
 const z=parse(),micki=z.domaci.rezerve.find(p=>p.regSt===757108)
 micki.preklopi=[]
 z.menjave=z.menjave.filter(m=>m.noter.regSt!==757108)
 z.goli.push({ekipaIdx:0,st:5,ime:micki.ime,regSt:757108,minuta:70,avtogol:false,enajstmetrovka:false})
 assert.throws(()=>nastopi(z),/appearance|nastop|interval/i)
})

test('the unique-shirt authentic Baranya report retains its complete previous parser output',()=>{
 const z=vZapisnik(readFileSync(new URL('./vzorci/hu-adatbank-baranya-2111691.html',import.meta.url),'utf8'),{id:'2111691'})
 // Golden legacy bytes protect the requested no-collision compatibility contract.
 assert.equal(createHash('sha256').update(JSON.stringify({z,apps:nastopi(z)})).digest('hex'),'2945586bc5f206831e2107d72685d2eaf332ddfaae6b8b7fb8699411abbacda3')
})
