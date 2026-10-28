import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {tokRsc,vrsticeRsc} from './viri/fcf.mjs'
import {getFcfSixPolicy,FCF_SIX_SOURCE_POLICY} from './fcf-six-historical-policy.mjs'
const api=await import('./fcf-future-source-proof.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error})
const now=Date.parse('2026-10-27T12:00:00Z'),retained=process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR
const genuine={skip:retained?false:'Retained actual G9 raw bytes unavailable; set FCF_FUTURE_SOURCE_EVIDENCE_DIR'}
const competition=()=>({id:797,slug:'es-ct-tercera-g9',source:'fcf',source_policy:FCF_SIX_SOURCE_POLICY,source_league_code:'4118349-4118588',active:false,sezona_koledarska:false})
const hash=x=>createHash('sha256').update(x).digest('hex')
function input(html,id='4118397',round=7){
 // TEST ONLY fresh receipts and Actions-looking lineage: these fields are
 // explicitly constructed and confer NO genuine capture/reader authority.
 return {competition:competition(),now,document:{id,expectedSourceRound:round,html,receipt:{id,competitionSlug:'es-ct-tercera-g9',sourceUrl:`https://www.fcf.cat/ca/competicio/acta/${id}`,startedUTC:'2026-10-27T11:59:50.000Z',capturedUTC:'2026-10-27T12:00:00.000Z',cacheMtimeUTC:null,bytes:Buffer.byteLength(html),rawSha256:hash(html)},lineage:{kind:'actions-artifact',verified:true,repository:'Lovro-splichal-orhanizagi/mnzgorenjska',workflow:'.github/workflows/uvoz-fcf-zgodovina.yml',runId:'123',artifactId:'456',artifactDigest:'sha256:'+'a'.repeat(64),commit:'b'.repeat(40)}}}
}
const walk=(x,fn)=>fn(Array.isArray(x)?x.map(v=>walk(v,fn)):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,walk(v,fn)])):x)
function synthetic(mutate=x=>x){
 // TEST ONLY modified canonical RSC; not a fresh capture or official fixture.
 const base=readFileSync(new URL('./vzorci/es-fcf-acta-primera-3791085.html',import.meta.url),'utf8')
 let rows=walk([...vrsticeRsc(tokRsc(base))],x=>Array.isArray(x)&&x[0]==='Jornada '&&x[1]==='30'?['Jornada ','7']:typeof x==='string'?x==='PRIMERA CATALANA'?'TERCERA CATALANA':x==='GRUP 1'?'GRUP 9':x==='2025 / 26'?'2026 / 27':x==='2025/26'?'2026/27':x==='Jornada 30'?'Jornada 7':/^\d\d\.\d\d\.2026$/.test(x)?'20.10.2026':x:x)
 rows.find(([key])=>key==='0')[1].c=['','ca','competicio','acta','4118397'];rows=mutate(rows)
 return input(`<!doctype html><title>Acta: TEST ONLY SYNTHETIC future canonical | FCF</title><script>self.__next_f.push([1,${JSON.stringify(rows.map(([k,v])=>k+':'+JSON.stringify(v)).join('\n')+'\n')}])</script>`)
}
function raw(id,round){return input(readFileSync(join(retained,'fcf-missing-inventory-diagnostic-es-ct-tercera-g9-39238757730-1',`acta-${id}.html`),'utf8'),id,round)}
function prove(i){assert.equal(typeof api.proveFcfFutureSourceDocument,'function','separate future document prover required');return api.proveFcfFutureSourceDocument(i)}

test('TEST ONLY synthetic R7 normal document yields strict canonicals without any launch field or admission',()=>{
 const i=synthetic(),before=JSON.stringify(i),r=prove(i)
 assert.equal(r.id,'es4118397');assert.equal(r.round,7);assert.equal(r.date,'2026-10-20');assert.equal(r.statisticsStatus,'available');assert.equal(r.policyId,null);assert.equal(r.sourceFixture,null)
 assert.equal(r.appearances.length,34);assert.equal(r.goals.length,3);assert.equal(r.report.opozorila.length,0)
 assert.equal(r.clubs.length,2);assert.ok(r.clubs.every(c=>typeof c.sourceClubId==='string'&&typeof c.sourceCategoryId==='string'&&typeof c.name==='string'))
 assert.equal(r.source.rawSha256,i.document.receipt.rawSha256);assert.deepEqual(r.source.lineage,i.document.lineage)
 assert.equal(Object.hasOwn(r,'verified'),false);assert.equal(Object.hasOwn(r,'admissible'),false);assert.equal(Object.hasOwn(r,'firstFantasyPlayedOn'),false)
 assert.equal(JSON.stringify(i),before)
})
test('actual retained G9 normal bytes retain strict report/GK facts under explicitly synthetic fresh receipts',genuine,()=>{
 const r=prove(raw('4118349',1));assert.equal(r.id,'es4118349');assert.equal(r.round,1);assert.equal(r.statisticsStatus,'available');assert.equal(r.report.opozorila.length,0)
 for(const side of [0,1]){const keepers=r.appearances.filter(a=>a.ekipaIdx===side&&a.vratar);assert.equal(keepers.reduce((sum,a)=>sum+a.minute,0),90)}
})
for(const [id,round]of [['4118352',1],['4118354',1],['4118358',2]])test(`actual approved marker${id} preserves original authorization SHA separately from fresh observed bytes`,genuine,()=>{
 const i=raw(id,round);i.document.html+='\n<!-- TEST ONLY presentation variation -->';Object.assign(i.document.receipt,{bytes:Buffer.byteLength(i.document.html),rawSha256:hash(i.document.html)})
 const r=prove(i),p=getFcfSixPolicy(i.competition.slug),e=p.entries.find(e=>e.sourceMatchId===id)
 assert.equal(r.statisticsStatus,'unavailable_historical');assert.equal(r.statisticsReason,e.reasonCode);assert.equal(r.policyId,p.id)
 assert.equal(r.report,null);assert.equal(r.appearances,null);assert.equal(r.goals,null);assert.equal(r.sourceFixture.sourceMatchId,id)
 assert.equal(r.source.historicalObservation.approvedOriginalSha256,e.rawSha256);assert.equal(r.source.historicalObservation.freshRawSha256,i.document.receipt.rawSha256)
 assert.equal(r.source.rawSha256,i.document.receipt.rawSha256);assert.notEqual(r.source.rawSha256,e.rawSha256)
 assert.equal(r.source.startedUTC,i.document.receipt.startedUTC);assert.equal(r.source.capturedUTC,i.document.receipt.capturedUTC)
})
test('actual unapproved4118365 closed no-score report is refused rather than marked unavailable',genuine,()=>assert.throws(()=>prove(raw('4118365',3)),/source|status|result|score/))

for(const [name,change]of [
 ['foreign league',i=>i.competition.slug='es-ct-segona-g1'],['wrong competition ID',i=>i.competition.id=783],['wrong source',i=>i.competition.source='hns'],['wrong policy',i=>i.competition.source_policy=null],['wrong block',i=>i.competition.source_league_code='4118348-4118587'],['active competition',i=>i.competition.active=true],['calendar-year season',i=>i.competition.sezona_koledarska=true],['wrong explicit season',i=>i.competition.season='2025/26'],
 ['wrong document ID',i=>i.document.id='4118398'],['ID outside G9',i=>i.document.id='4109436'],['wrong expected round',i=>i.document.expectedSourceRound=6],['wrong raw hash',i=>i.document.receipt.rawSha256='0'.repeat(64)],['wrong byte length',i=>i.document.receipt.bytes++],['wrong URL',i=>i.document.receipt.sourceUrl='https://www.fcf.cat/api/4118397'],['wrong receipt group',i=>i.document.receipt.competitionSlug='es-ct-segona-g1'],['wrong receipt ID',i=>i.document.receipt.id='4118398'],
 ['missing receipt',i=>i.document.receipt=null],['BOM bytes',i=>i.document.html='\ufeff'+i.document.html],['no HTML',i=>i.document.html=null],['invalid clock',i=>i.now=NaN],
 ['cache mtime substitution',i=>i.document.receipt.cacheMtimeUTC='2026-10-27T11:00:00Z'],['missing cache mtime field',i=>delete i.document.receipt.cacheMtimeUTC],['missing capture timestamp',i=>i.document.receipt.capturedUTC=null],['missing start timestamp',i=>i.document.receipt.startedUTC=null],['capture before start',i=>i.document.receipt.startedUTC='2026-10-27T12:00:01.000Z'],['future capture',i=>i.document.receipt.capturedUTC='2026-10-27T12:00:01.000Z'],['stale capture',i=>{i.document.receipt.startedUTC='2026-10-26T11:59:58.999Z';i.document.receipt.capturedUTC='2026-10-26T11:59:59.999Z'}],['stale start',i=>i.document.receipt.startedUTC='2026-10-26T11:59:59.999Z'],['non-UTC timestamp',i=>i.document.receipt.startedUTC='2026-10-27T12:59:50+01:00'],
 ['no lineage',i=>i.document.lineage=null],['reviewed-original lineage',i=>i.document.lineage.kind='reviewed-original'],['missing structural verified field',i=>delete i.document.lineage.verified],['foreign repository',i=>i.document.lineage.repository='elsewhere/repo'],['wrong workflow',i=>i.document.lineage.workflow='.github/workflows/other.yml'],['invalid run ID',i=>i.document.lineage.runId='main'],['invalid artifact ID',i=>i.document.lineage.artifactId=456],['invalid artifact digest',i=>i.document.lineage.artifactDigest='a'.repeat(64)],['invalid source commit',i=>i.document.lineage.commit='main'],
])test(`future canonical prover rejects ${name}`,()=>{const i=synthetic();change(i);assert.throws(()=>prove(i),/FCF_FUTURE_SOURCE|FCF_INVENTORY|fcf:/)})

test('24-hour source clock boundary is inclusive and remains actual capture data',()=>{
 const i=synthetic();i.document.receipt.startedUTC=i.document.receipt.capturedUTC='2026-10-26T12:00:00.000Z'
 const r=prove(i);assert.equal(r.source.capturedUTC,'2026-10-26T12:00:00.000Z');assert.equal(r.source.cacheMtimeUTC,null)
})
test('legacy-looking firstFantasyPlayedOn metadata supplies no opening choice or alternate parse cutoff',()=>{
 const i=synthetic(),r=prove(i);i.competition.firstFantasyPlayedOn='2026-10-24';assert.deepEqual(prove(i),r)
})
test('TEST ONLY missing explicit normal-report keeper evidence remains refused',()=>{
 const i=synthetic(rows=>walk(rows,x=>x?.player?{...x,player:{...x.player,portero:'0'}}:x))
 assert.throws(()=>prove(i),/goalkeeper/)
})
test('TEST ONLY a future-scored closed report remains refused',()=>{
 const i=synthetic(rows=>walk(rows,x=>x==='20.10.2026'?'28.10.2026':x))
 assert.throws(()=>prove(i),/completed|future/)
})

test('TEST ONLY source route drift is refused even when the receipt coherently follows the changed ID',()=>{
 const i=synthetic();i.document.id=i.document.receipt.id='4118398';i.document.receipt.sourceUrl='https://www.fcf.cat/ca/competicio/acta/4118398'
 assert.throws(()=>prove(i),/route/)
})
test('TEST ONLY a different raw group cannot borrow the approved G9 receipt scope',()=>{
 const i=synthetic(rows=>walk(rows,x=>x==='GRUP 9'?'GRUP 8':x))
 assert.throws(()=>prove(i),/group/)
})
test('actual historical category drift is refused despite a matching synthetic fresh raw receipt',genuine,()=>{
 const original=raw('4118354',1),rows=walk([...vrsticeRsc(tokRsc(original.document.html))],x=>x==='/ca/clubs/1372/categories/19610692'?'/ca/clubs/1372/categories/99999999':x)
 const html=`<!doctype html><title>Acta: TEST ONLY historical category drift | FCF</title><script>self.__next_f.push([1,${JSON.stringify(rows.map(([k,v])=>k+':'+JSON.stringify(v)).join('\n')+'\n')}])</script>`
 assert.throws(()=>prove(input(html,'4118354',1)),/historical factual identity/)
})
test('TEST ONLY elapsed pending R6 yields unknown result and no individual statistics or launch choice',()=>{
 const e=(type,children,props={})=>['$',type,null,{...props,children}],id='4118397'
 const root={c:['','ca','competicio','acta',id],headers:[e('section',e('div',[e('a','TEST ONLY HOME',{href:'/ca/clubs/1/categories/2'}),e('div',[e('span','Pendent'),e('span','- - -')]),e('a','TEST ONLY AWAY',{href:'/ca/clubs/3/categories/4'})]),{title:'Acta del partit'}),e('div',['COMPETICIÓ','/','TERCERA CATALANA','/','GRUP 9','/','Jornada 6'].map(x=>e('span',x))),e('span',['Temporada',': ','2026 / 27']),e('span',['Data',': ','20.10.2026']),e('span',['Hora',': ','TBD'])]}
 const html=`<!doctype html><title>Acta: TEST ONLY pending canonical | FCF</title><script>self.__next_f.push([1,${JSON.stringify('0:'+JSON.stringify(root)+'\n')}])</script>`,r=prove(input(html,id,6))
 assert.equal(r.statisticsStatus,'pending');assert.equal(r.round,6);assert.equal(r.time,null);assert.equal(r.homeGoals,null);assert.equal(r.awayGoals,null);assert.equal(r.report,null);assert.equal(r.appearances,null);assert.equal(r.goals,null);assert.equal(r.sourceFixture,null)
})
test('canonical data is detached from input receipts and frozen without becoming an authentication capability',()=>{
 const i=synthetic(),r=prove(i);i.document.lineage.commit='c'.repeat(40);i.document.receipt.rawSha256='d'.repeat(64)
 assert.equal(r.source.lineage.commit,'b'.repeat(40));assert.notEqual(r.source.rawSha256,i.document.receipt.rawSha256)
 assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.source)&&Object.isFrozen(r.appearances));assert.throws(()=>r.appearances.push({}),TypeError)
})

// Existing provider freshness for near/elapsed pending fixtures is stricter
// than the continuation's outer24-hour capture cap and must remain intact.
import {headerBytes} from './fcf-missing-inventory-test-fixture.mjs'
test('TEST ONLY pending report retains existing one-hour provider freshness',()=>{
 const i=input(headerBytes({id:'4118397',slug:'es-ct-tercera-g9',round:6,day:'20.10.2026'}).toString('utf8'),'4118397',6)
 i.now=now+3600000;assert.equal(prove(i).statisticsStatus,'pending')
 i.now++;assert.throws(()=>prove(i),/provider source freshness/)
})
