import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import * as parser from './fcf-current-source-proof.mjs'
import {tokRsc,vrsticeRsc} from './viri/fcf.mjs'

const now=Date.parse('2026-10-27T14:00:00Z')
const retained=process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR
const base=readFileSync(new URL('./vzorci/es-fcf-acta-primera-3791085.html',import.meta.url),'utf8')
const walk=(x,fn)=>fn(Array.isArray(x)?x.map(v=>walk(v,fn)):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,walk(v,fn)])):x)
function bound({id,competitionSlug,expectedSourceRound,html,...other}){
 return {id,competitionSlug,expectedSourceRound,html,now,...other,receipt:{id,competitionSlug,sourceUrl:`https://www.fcf.cat/ca/competicio/acta/${id}`,bytes:Buffer.byteLength(html),rawSha256:createHash('sha256').update(html).digest('hex')}}
}
function parse(input){assert.equal(typeof parser.parseFcfFutureAuditDocument,'function','separate future normal-report parser must exist');return parser.parseFcfFutureAuditDocument(input)}

// TEST ONLY: this RSC is explicitly modified from a public retained report.
// Changed group/season/route/date/round fields are not genuine source evidence,
// authenticated canonicals or admission. The real parser still checks all rows.
function synthetic({round=6,slug='es-ct-segona-g1',day='20.10.2026',mutate=x=>x}={}){
 const id=slug==='es-ct-tercera-g9'?'4118397':'4109436'
 let rows=walk([...vrsticeRsc(tokRsc(base))],x=>{
  if(Array.isArray(x)&&x[0]==='Jornada '&&x[1]==='30')return ['Jornada ',String(round)]
  if(typeof x!=='string')return x
  return x==='PRIMERA CATALANA'?(slug==='es-ct-tercera-g9'?'TERCERA CATALANA':'SEGONA CATALANA'):x==='GRUP 1'?(slug==='es-ct-tercera-g9'?'GRUP 9':'GRUP 1'):x==='2025 / 26'?'2026 / 27':x==='2025/26'?'2026/27':x==='Jornada 30'?`Jornada ${round}`:/^\d\d\.\d\d\.2026$/.test(x)?day:x
 })
 rows.find(([key])=>key==='0')[1].c=['','ca','competicio','acta',id]
 rows=mutate(rows)
 const html=`<!doctype html><title>Acta: TEST ONLY SYNTHETIC future parser control | FCF</title><script>self.__next_f.push([1,${JSON.stringify(rows.map(([key,value])=>key+':'+JSON.stringify(value)).join('\n')+'\n')}])</script>`
 return bound({id,competitionSlug:slug,expectedSourceRound:round,html})
}
function pending({round=6,day='20.10.2026',time='TBD',closed=false}={}){
 const id='4109436',e=(type,children,props={})=>['$',type,null,{...props,children}]
 const root={c:['','ca','competicio','acta',id],headers:[e('section',e('div',[e('a','TEST ONLY HOME',{href:'/ca/clubs/1/categories/2'}),e('div',[e('span',closed?'Acta Tancada':'Pendent'),e('span','- - -')]),e('a','TEST ONLY AWAY',{href:'/ca/clubs/3/categories/4'})]),{title:'Acta del partit'}),e('div',['COMPETICIÓ','/','SEGONA CATALANA','/','GRUP 1','/',`Jornada ${round}`].map(x=>e('span',x))),e('span',['Temporada',': ','2026 / 27']),e('span',['Data',': ',day]),e('span',['Hora',': ',time])]}
 const html=`<!doctype html><title>Acta: TEST ONLY SYNTHETIC pending | FCF</title><script>self.__next_f.push([1,${JSON.stringify('0:'+JSON.stringify(root)+'\n')}])</script>`
 return bound({id,competitionSlug:'es-ct-segona-g1',expectedSourceRound:round,html})
}
function actual(id,slug,round){return bound({id,competitionSlug:slug,expectedSourceRound:round,html:readFileSync(join(retained,`fcf-missing-inventory-diagnostic-${slug}-39238757730-1`,`acta-${id}.html`),'utf8')})}

for(const round of [6,7,30])test(`TEST ONLY completed R${round}: legacy remains closed, future parser preserves strict complete statistics`,()=>{
 const f=synthetic({round})
 assert.throws(()=>parser.parseFcfCurrentAuditDocument(f),/completed reviewed prelaunch/)
 const r=parse(f);assert.equal(r.status,'complete');assert.equal(r.header.krog,round);assert.equal(r.appearances.length,34);assert.equal(r.report.opozorila.length,0)
 assert.deepEqual([r.report.domaci.postava.length,r.report.gostje.postava.length],[11,11])
})
test('TEST ONLY G9 completed R7 uses its exact current target identity',()=>{const r=parse(synthetic({slug:'es-ct-tercera-g9',round:7}));assert.equal(r.status,'complete');assert.equal(r.header.skupina,'GRUP 9')})
test('unchanged actual normal G1 R3 bytes retain six goals and33 appearances',{skip:!retained},()=>{
 const f=actual('4109405','es-ct-segona-g1',3),r=parse(f)
 assert.equal(r.status,'complete');assert.equal(r.header.datum,'2026-10-03');assert.equal(r.header.krog,3);assert.equal(r.report.goli.length,6);assert.equal(r.appearances.length,33)
 assert.deepEqual(r,parser.parseFcfCurrentAuditDocument(f))
})
for(const [id,slug] of [['4109409','es-ct-segona-g1'],['4118365','es-ct-tercera-g9']])test(`actual unapproved closed no-score report${id} stays refused`,{skip:!retained},()=>assert.throws(()=>parse(actual(id,slug,3)),/closed source lacks an official result/))
for(const round of [1,6,7,30])test(`TEST ONLY official unplayed R${round} stays pending without fabricated statistics or kickoff`,()=>{
 const r=parse(pending({round}));assert.equal(r.status,'pending');assert.equal(r.header.ura,null);assert.equal(r.header.izid,null);assert.equal(r.report,null);assert.equal(r.appearances,null)
})
test('legacy R6 pending restrictions remain exactly in force',()=>{
 assert.throws(()=>parser.parseFcfCurrentAuditDocument(pending()),/R6 requires an explicit future official kickoff/)
 assert.equal(parse(pending()).status,'pending')
})
for(const round of [1,6,7,30])test(`TEST ONLY closed no-score R${round} never becomes pending or a new exclusion`,()=>assert.throws(()=>parse(pending({round,closed:true})),/closed source lacks an official result/))
test('TEST ONLY tomorrow closed scored report is refused',()=>assert.throws(()=>parse(synthetic({day:'28.10.2026'})),/completed reviewed prelaunch|future/))
test('TEST ONLY current-day closed scored report may parse without changing its source day',()=>assert.equal(parse(synthetic({day:'27.10.2026'})).status,'complete'))

for(const [id,slug] of [['4109388','es-ct-segona-g1'],['4109404','es-ct-segona-g1'],['4116215','es-ct-segona-g1'],['4118352','es-ct-tercera-g9'],['4118354','es-ct-tercera-g9'],['4118358','es-ct-tercera-g9']])test(`historical ID${id} never enters future normal individual parsing`,()=>{
 assert.throws(()=>parse({...synthetic(),id,competitionSlug:slug,html:null}),/historical/)
})
for(const [label,change] of [
 ['foreign G2 target',f=>{f.competitionSlug='es-ct-tercera-g2'}],
 ['wrong raw hash',f=>{f.receipt.rawSha256='0'.repeat(64)}],
 ['wrong raw length',f=>{f.receipt.bytes++}],
 ['wrong receipt ID',f=>{f.receipt.id='4109435'}],
 ['wrong receipt group',f=>{f.receipt.competitionSlug='es-ct-tercera-g9'}],
 ['wrong receipt route',f=>{f.receipt.sourceUrl='https://www.fcf.cat/api/4109436'}],
 ['foreign route ID',f=>{f.id='4118397'}],
 ['wrong expected source round',f=>{f.expectedSourceRound=8}],
 ['round outside1–30',f=>{f.expectedSourceRound=31}],
 ['invalid clock',f=>{f.now=NaN}],
 ['BOM bytes',f=>{f.html='\ufeff'+f.html}],
])test(`future normal parser holds ${label}`,()=>{const f=synthetic();change(f);assert.throws(()=>parse(f),/FCF_SOURCE_PROOF|fcf:/)})

test('TEST ONLY missing explicit goalkeepers remains refused after removing the R6 boundary',()=>{
 const f=synthetic({mutate:rows=>walk(rows,x=>x?.player?{...x,player:{...x.player,portero:'0'}}:x)})
 assert.throws(()=>parse(f),/goalkeeper/)
})
test('TEST ONLY incomplete starting XI remains refused',()=>{
 let changed=false
 const f=synthetic({mutate:rows=>walk(rows,x=>{if(!changed&&x?.player&&String(x.player.titular)==='1'){changed=true;return {...x,player:{...x.player,titular:'0'}}}return x})})
 assert.ok(changed);assert.throws(()=>parse(f),/starters|incomplete|warning/)
})
test('TEST ONLY invalid native player identity remains refused',()=>{
 let changed=false
 const f=synthetic({mutate:rows=>walk(rows,x=>{if(!changed&&x?.player){changed=true;return {...x,player:{...x.player,id:'not-an-id'}}}return x})})
 assert.ok(changed);assert.throws(()=>parse(f),/identit|incomplete|warning|goal/)
})

test('TEST ONLY a source goalkeeper leaving61 without explicit replacement still fails continuous0–90 coverage',()=>{
 const control=parse(synthetic()),outgoing=control.appearances.find(a=>a.ekipaIdx===0&&a.zacetnik&&a.minutaDo===61),original=control.appearances.find(a=>a.ekipaIdx===0&&a.zacetnik&&a.vratar)
 assert.ok(outgoing&&original)
 const f=synthetic({mutate:rows=>walk(rows,x=>x?.player?{...x,player:{...x.player,portero:String(x.player.id)===String(outgoing.regSt)?'1':String(x.player.id)===String(original.regSt)?'0':x.player.portero}}:x)})
 assert.throws(()=>parse(f),/continuous exactly one explicit goalkeeper/)
})

test('TEST ONLY a scorer goal before his recorded entrance fails the strict minute/event proof',()=>{
 const control=parse(synthetic()),goal=control.report.goli.find(g=>g.regSt===15055957),appearance=control.appearances.find(a=>a.regSt===15055957)
 assert.equal(goal.minuta,56);assert.equal(appearance.minutaOd,46)
 let changes=0
 const f=synthetic({mutate:rows=>walk(rows,x=>{if(x==='46’'){changes++;return '61’'}return x})})
 assert.ok(changes>0)
 assert.throws(()=>parse(f),/normal minute\/event canonical proof differs|warning\/goal mismatch/)
})
test('TEST ONLY a goal scorer absent from the native lineups remains a warning and is refused',()=>{
 let changed=false
 const f=synthetic({mutate:rows=>walk(rows,x=>{if(x?.player&&String(x.player.id)==='15055957'&&JSON.stringify(x.children).includes('"GOL"')){changed=true;return {...x,player:{...x.player,id:'999999999'}}}return x})})
 assert.ok(changed)
 assert.throws(()=>parse(f),/unresolved normal source warning\/goal mismatch/)
})
