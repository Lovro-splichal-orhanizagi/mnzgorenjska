import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
import {tokRsc,vrsticeRsc} from './viri/fcf.mjs'
const proof=await import('./fcf-current-source-proof.mjs').catch(()=>({}))
const now=Date.parse('2026-10-18T14:00:00Z'),base=readFileSync(new URL('./vzorci/es-fcf-acta-primera-3791085.html',import.meta.url),'utf8')
const walk=(x,f)=>f(Array.isArray(x)?x.map(v=>walk(v,f)):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,walk(v,f)])):x)
function fixture(mutate=x=>x){
 let root=[...vrsticeRsc(tokRsc(base))]
 root=walk(root,x=>typeof x==='string'?x==='PRIMERA CATALANA'?'TERCERA CATALANA':x==='GRUP 1'?'GRUP 2':x==='2025 / 26'?'2026 / 27':x==='2025/26'?'2026/27':x==='30'?'1':/^Jornada 30$/.test(x)?'Jornada 1':/^\d{2}\.\d{2}\.2026$/.test(x)?'20.09.2026':x:x)
 root.find(([key])=>key==='0')[1].c=['','ca','competicio','acta','4116203'];root=mutate(root)
 const html=`<!doctype html><title>Acta: SYNTHETIC source-proof control | FCF</title><script>self.__next_f.push([1,${JSON.stringify(root.map(([key,value])=>key+':'+JSON.stringify(value)).join('\n')+'\n')}])</script>`
 return{id:'4116203',competitionSlug:'es-ct-tercera-g2',expectedSourceRound:1,html,now,receipt:{id:'4116203',competitionSlug:'es-ct-tercera-g2',sourceUrl:'https://www.fcf.cat/ca/competicio/acta/4116203',rawSha256:createHash('sha256').update(html).digest('hex'),bytes:Buffer.byteLength(html)}}
}
function parse(f){assert.equal(typeof proof.parseFcfCurrentAuditDocument,'function','strict existing-parser source proof adapter must exist');return proof.parseFcfCurrentAuditDocument(f)}
test('strict source proof uses existing report/statistics parser for explicit XI and goalkeeper evidence',()=>{
 const r=parse(fixture());assert.equal(r.status,'complete');assert.deepEqual([r.report.domaci.postava.length,r.report.gostje.postava.length],[11,11]);assert.equal(r.appearances.length,34);assert.equal(r.report.opozorila.length,0)
})
for(const[name,mutate]of[
 ['raw hash drift',f=>f.receipt.rawSha256='0'.repeat(64)],['raw length drift',f=>f.receipt.bytes++],['foreign report',f=>f.id='4118352'],['changed expected round',f=>f.expectedSourceRound=6],['unknown group',f=>f.competitionSlug='es-ct-quarta-g1'],['wrong receipt URL',f=>f.receipt.sourceUrl='https://example.com/'],
])test(`strict normal proof refuses ${name}`,()=>{const f=fixture();mutate(f);assert.throws(()=>parse(f),/FCF_SOURCE_PROOF|fcf:/)})
test('exact historical id is never routed through individual parsing',()=>assert.throws(()=>parse({...fixture(),id:'4116215',html:null}),/FCF_SOURCE_PROOF/))
test('a newly defective normal report is refused without receiving a new exception',()=>{
 const f=fixture(root=>walk(root,x=>x&&typeof x==='object'&&!Array.isArray(x)&&x.player?{...x,player:{...x.player,portero:'0'}}:x))
 assert.throws(()=>parse(f),/FCF_SOURCE_PROOF/)
})
test('incomplete new starting XI is refused',()=>{
 let changed=false
 const f=fixture(root=>walk(root,x=>{if(!changed&&x?.player&&String(x.player.titular)==='1'){changed=true;return{...x,player:{...x.player,titular:'0'}}}return x}))
 assert.equal(changed,true);assert.throws(()=>parse(f),/FCF_SOURCE_PROOF/)
})
const retained=process.env.FCF_HISTORICAL_RETAINED_DIR
test('private retained actual Calonge bytes preserve the corrected75/75 clocks and four goals',{skip:!retained},()=>{
 const html=readFileSync(join(retained,'request-1-acta-4116202.html'),'utf8'),r=parse({id:'4116202',competitionSlug:'es-ct-tercera-g2',expectedSourceRound:2,html,now,receipt:{id:'4116202',competitionSlug:'es-ct-tercera-g2',sourceUrl:'https://www.fcf.cat/ca/competicio/acta/4116202',rawSha256:'ffe7a5e9dd542b92f2050e7357acf8d16a7f788acef3485ed8d193b2001a87f1',bytes:491934}})
 assert.equal(r.report.goli.length,4);assert.deepEqual(r.appearances.filter(a=>[31287135,48680949].includes(a.regSt)).map(a=>[a.regSt,a.minutaOd,a.minutaDo]).sort((a,b)=>a[0]-b[0]),[[31287135,75,90],[48680949,0,75]])
})
function pendingFixture({day='24.10.2026',time='16.00 H',closed=false}={}){
 const e=(type,children,props={})=>['$',type,null,{...props,children}]
 const root={c:['','ca','competicio','acta','4116228'],header:[e('section',e('div',[e('a','SYNTHETIC HOME',{href:'/ca/clubs/1/categories/2'}),e('div',[e('span',closed?'Acta Tancada':'Pendent'),e('span','- - -')]),e('a','SYNTHETIC AWAY',{href:'/ca/clubs/3/categories/4'})]),{title:'Acta del partit'}),e('div',['COMPETICIÓ','/','TERCERA CATALANA','/','GRUP 2','/','Jornada 6'].map(x=>e('span',x))),e('span',['Temporada',': ','2026 / 27']),e('span',['Data',': ',day]),e('span',['Hora',': ',time])]}
 const html=`<!doctype html><title>Acta: SYNTHETIC pending control | FCF</title><script>self.__next_f.push([1,${JSON.stringify('0:'+JSON.stringify(root)+'\n')}])</script>`
 return{id:'4116228',competitionSlug:'es-ct-tercera-g2',expectedSourceRound:6,html,now,receipt:{id:'4116228',competitionSlug:'es-ct-tercera-g2',sourceUrl:'https://www.fcf.cat/ca/competicio/acta/4116228',rawSha256:createHash('sha256').update(html).digest('hex'),bytes:Buffer.byteLength(html)}}
}
test('genuine future pending source remains pending with no individual-statistics claim',()=>{
 const r=parse(pendingFixture());assert.equal(r.status,'pending');assert.equal(r.report,null);assert.equal(r.appearances,null);assert.equal(r.header.krog,6)
})
for(const[name,patch]of[['closed without result',{closed:true}],['past R6 date',{day:'17.10.2026'}],['missing official R6 kickoff',{time:'TBD'}]])test(`strict future-header proof refuses ${name}`,()=>assert.throws(()=>parse(pendingFixture(patch)),/FCF_SOURCE_PROOF/))
