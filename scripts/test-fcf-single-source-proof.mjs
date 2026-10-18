import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const fcf=await import('./viri/fcf.mjs')
const competition={slug:'es-ct-tercera-g2',source:'fcf',sezona_koledarska:false,source_league_code:'4116188-4116427'}
const options={id:'es4116202',tekmovanje:competition,sezona:'2026/27',danes:Date.parse('2026-10-18T14:00:00Z')}
const e=(type,children,props={})=>['$',type,null,{...props,children}]
function page({route='4116202',group='GRUP 2',season='2026 / 27',home='/ca/clubs/1/categories/2',away='/ca/clubs/3/categories/4'}={}){
 const root={c:['','ca','competicio','acta',route],headers:[e('section',e('div',[e('a','SYNTHETIC HOME',{href:home}),e('div',[e('span','Pendent'),e('span','- - -')]),e('a','SYNTHETIC AWAY',{href:away})]),{title:'Acta del partit'}),e('div',['COMPETICIÓ','/','TERCERA CATALANA','/',group,'/','Jornada 6'].map(x=>e('span',x))),e('span',['Temporada',': ',season]),e('span',['Data',': ','24.10.2026']),e('span',['Hora',': ','16.00 H'])]}
 return`<!doctype html><title>Acta: SYNTHETIC header test | FCF</title><script>self.__next_f.push([1,${JSON.stringify('0:'+JSON.stringify(root)+'\n')}])</script>`
}
function validate(html=page(),patch={}){assert.equal(typeof fcf.validateFcfSingleReportSource,'function','pure shared source-identity validator must exist');return fcf.validateFcfSingleReportSource(html,competition.source_league_code,{...options,...patch})}
test('pure single-report header validation retains exact existing pending source semantics without cache or transport',()=>{
 const oldFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('transport forbidden')}
 try{const g=validate();assert.deepEqual([g.krog,g.sezona,g.skupina,g.datum,g.ura,g.izid],[6,'2026/27','GRUP 2','2026-10-24','16:00',null])}finally{globalThis.fetch=oldFetch}
})
for(const[name,html]of[['route',page({route:'4116203'})],['group',page({group:'GRUP 9'})],['season',page({season:'2025 / 26'})],['missing native category',page({home:'/ca/clubs/1'})],['challenge','<title>Just a moment</title>cf_chl_opt']])test(`shared pure validator refuses ${name}`,()=>assert.throws(()=>validate(html),/fcf|zapisnik|koledar/))
for(const patch of [{id:'4116202'},{id:'es4109388'},{sezona:'2025/26'},{tekmovanje:{...competition,source:'hns'}},{tekmovanje:{...competition,sezona_koledarska:true}},{tekmovanje:{...competition,source_league_code:'4116187-4116426'}}])test(`shared pure validator preserves context refusal ${JSON.stringify(patch)}`,()=>assert.throws(()=>validate(page(),patch),/fcf|zapisnik/))
const retained=process.env.FCF_HISTORICAL_RETAINED_DIR
test('private actual Calonge raw validates exact official source header without individual parsing',{skip:!retained},()=>{
 const html=readFileSync(join(retained,'request-1-acta-4116202.html'),'utf8'),g=validate(html)
 assert.deepEqual([g.krog,g.domaci,g.gostje,g.izid.domaci,g.izid.gostje],[2,'CALONGE, U.E.','VILABLAREIX FUTBOL CLUB',2,2])
})

test('the actual selected reader still binds the validated report id after pure header validation',async t=>{
 const oldCwd=process.cwd(),dir=mkdtempSync(join(tmpdir(),'fcf-single-proof-'))
 process.chdir(dir);mkdirSync('scripts/.predpomnilnik/fcf',{recursive:true})
 t.after(()=>{process.chdir(oldCwd);rmSync(dir,{recursive:true,force:true})})
 const html=readFileSync(new URL('./vzorci/es-fcf-acta-rdeci-4139542.html',import.meta.url),'utf8')
 const c={slug:'es-ct-quarta-g1',source:'fcf',sezona_koledarska:false,source_league_code:'4139542-4139779'},opts={...options,id:'es4139542',tekmovanje:c}
 assert.equal(fcf.validateFcfSingleReportSource(html,c.source_league_code,opts).skupina,'GRUP 1')
 writeFileSync('scripts/.predpomnilnik/fcf/acta-4139542.html',html)
 let reports
 await assert.doesNotReject(async()=>{reports=await fcf.posamezniZapisnik(c.source_league_code,opts)(()=>{throw Error('source transfer forbidden')})})
 assert.deepEqual(reports.map(r=>[r.id,r.z.zapisnikId,r.url]),[['es4139542','es4139542','https://www.fcf.cat/ca/competicio/acta/4139542']])
})
