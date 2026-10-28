// Actual retained original-six authority; NEW presentation/drift controls are
// explicitly SYNTHETIC and establish no source capture or admission.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {deserialize} from 'node:v8'
import {createHash} from 'node:crypto'
import {readFcfSixAccounting} from './fcf-six-accounting.mjs'
import {readFcfSixCleanupOriginals} from './fcf-six-cleanup-evidence.mjs'
import {deriveFcfInventoryHeader} from './fcf-missing-inventory-plan.mjs'
import {deriveFcfSixInventoryHeader} from './fcf-six-source-proof.mjs'
import {fcfSixPolicyIdHashes,verifyFcfSixFreshHistoricalSource} from './fcf-six-historical-policy.mjs'
import {requireFcfInventoryConsumption} from './fcf-missing-inventory-claim.mjs'
import {tokRsc,vrsticeRsc} from './viri/fcf.mjs'
const api=await import('./fcf-future-source-header.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const derive=i=>{assert.equal(typeof api.deriveFcfFutureInventoryHeader,'function','future historical header derivation required');return api.deriveFcfFutureInventoryHeader(i)}
const validate=i=>{assert.equal(typeof api.validateFcfFutureInventoryHeaders,'function','future header validator required');return api.validateFcfFutureInventoryHeaders(i)}
const available=!!process.env.FCF_SIX_ORIGINAL_AUTHORIZATION_WIRE&&!!process.env.FCF_SIX_ACCOUNTING_WIRE&&!!process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR
const actual={skip:available?false:'Explicit genuine retained six-original authority and raw diagnostics required'}
const hash=b=>createHash('sha256').update(b).digest('hex')
let authority
function originals(){return authority??=readFcfSixCleanupOriginals({legacy:deserialize(readFileSync(process.env.FCF_SIX_ORIGINAL_AUTHORIZATION_WIRE)),historyProof:readFcfSixAccounting(deserialize(readFileSync(process.env.FCF_SIX_ACCOUNTING_WIRE))),now:Date.parse('2026-10-19T08:00:00Z')})}
const slug=id=>id.startsWith('410')?'es-ct-segona-g1':'es-ct-tercera-g9'
const input=(id,bytes)=>({targetSlug:slug(id),id,bytes:bytes??originals().originals.get(id)})
const raw=id=>readFileSync(join(process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR,`fcf-missing-inventory-diagnostic-${slug(id)}-39238757730-1`,`acta-${id}.html`))
const walk=(x,fn)=>fn(Array.isArray(x)?x.map(v=>walk(v,fn)):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,walk(v,fn)])):x)
function rewrite(i,fn){const rows=walk([...vrsticeRsc(tokRsc(i.bytes.toString('utf8')))],fn);return {...i,bytes:Buffer.from(`<!doctype html><title>Acta: TEST ONLY historical header drift | FCF</title><script>self.__next_f.push([1,${JSON.stringify(rows.map(([k,v])=>k+':'+JSON.stringify(v)).join('\n')+'\n')}])</script>`)}}

test('actual six immutable policies and genuine original authority remain exact',actual,()=>{
 assert.deepEqual(fcfSixPolicyIdHashes(),{
  'es-ct-segona-g1-six-reviewed-2026-10-19-v1':'fbe3dbba425837b28a5fd7f99fa170a249e169a2f84d6c17921f202f7b25c6d9',
  'es-ct-tercera-g2-six-reviewed-2026-10-19-v1':'69cf7d1406b1306ab1aa31413cdd37bf11b502e5f17f9cb7eab295502578fc52',
  'es-ct-tercera-g9-six-reviewed-2026-10-19-v1':'38eca907c6b0f4df03a989778099f00b356d03626895de3961bad5e266bd3912',
 })
 assert.deepEqual(originals().descriptors.map(d=>d.sourceMatchId).sort(),['4109388','4109404','4116215','4118352','4118354','4118358'])
 for(const d of originals().descriptors)assert.equal(hash(originals().originals.get(d.sourceMatchId)),d.receipt.rawSha256)
 assert.throws(()=>derive(input('4116215',originals().originals.get('4116215'))),/FCF_FUTURE_TARGET/)
})
test('4109404 changed fresh presentation preserves NULL official score and original SHA separately',actual,()=>{
 const original=input('4109404'),changed={...original,bytes:Buffer.concat([original.bytes,Buffer.from('\n<!-- TEST ONLY new presentation -->')])},before=Buffer.from(changed.bytes),r=derive(changed)
 assert.deepEqual(r,{id:'4109404',targetSlug:'es-ct-segona-g1',round:3,playedOn:'2026-10-04',kickoff:'16:30',status:'published-result-unavailable',homeGoals:null,awayGoals:null,home:{sourceClubId:'5057',sourceCategoryId:'35522',name:'BEGUR, C.F.',href:'/ca/clubs/5057/categories/35522'},away:{sourceClubId:'5029',sourceCategoryId:'33592',name:'BESCANO, C.D.',href:'/ca/clubs/5029/categories/33592'}})
 assert.deepEqual(changed.bytes,before);assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.home))
 const o=verifyFcfSixFreshHistoricalSource({targetSlug:changed.targetSlug,id:changed.id,html:changed.bytes.toString('utf8')})
 assert.equal(o.approvedOriginalSha256,'1a42a49bd0b55d0bd3a654a6e15b65f430a2c132e28813899205d394f05244dc');assert.equal(o.freshRawSha256,hash(changed.bytes));assert.notEqual(o.freshRawSha256,o.approvedOriginalSha256)
 assert.equal(validate({targetSlug:changed.targetSlug,headers:[r],complete:false}).documentCount,1);assert.equal(r.status,'published-result-unavailable');assert.equal(r.homeGoals,null)
 assert.throws(()=>deriveFcfSixInventoryHeader(changed),/approved raw SHA differs/);assert.throws(()=>requireFcfInventoryConsumption(r),/FCF_INVENTORY/)
 for(const k of ['admissible','statisticsStatus','appearances','winner','historicalObservation'])assert.equal(Object.hasOwn(r,k),false)
})
for(const id of ['4109388','4118352','4118354','4118358'])test(`actual approved ${id} future header equals ordinary header exactly`,actual,()=>{
 const i=input(id),changed={...i,bytes:Buffer.concat([i.bytes,Buffer.from('\n<!-- TEST ONLY presentation -->')])}
 assert.deepEqual(derive(i),deriveFcfInventoryHeader(i));assert.deepEqual(derive(changed),deriveFcfInventoryHeader(changed))
})
for(const [label,fn]of[
 ['date',x=>x==='04.10.2026'?'05.10.2026':x],['season',x=>x==='2026 / 27'?'2025 / 26':x==='2026/27'?'2025/26':x],['group',x=>x==='GRUP 1'?'GRUP 2':x],
 ['source route',x=>x&&typeof x==='object'&&!Array.isArray(x)&&Array.isArray(x.c)?{...x,c:['','ca','competicio','acta','4109409']}:x],
 ['home club',x=>x==='/ca/clubs/5057/categories/35522'?'/ca/clubs/9999/categories/35522':x],['away category',x=>x==='/ca/clubs/5029/categories/33592'?'/ca/clubs/5029/categories/99999':x],['invented score',x=>x&&typeof x==='object'&&!Array.isArray(x)&&x.className?.includes('text-3xl')&&x.className.includes('text-white')&&x.children==='-'?{...x,children:'0'}:x],
])test(`TEST ONLY 4109404 ${label} drift is held`,actual,()=>assert.throws(()=>derive(rewrite(input('4109404'),fn)),/FCF_SIX_POLICY|FCF_INVENTORY/))
test('unapproved closed no-score4109409 and4118365 remain ordinary refusals',actual,()=>{
 for(const id of ['4109409','4118365'])assert.throws(()=>derive(input(id,raw(id))),/status|result|score/)
})
test('normal G9 header output stays exactly unchanged',actual,()=>{
 const i=input('4118349',raw('4118349'));assert.deepEqual(derive(i),deriveFcfInventoryHeader(i));assert.equal(derive(i).status,'published')
})
test('unknown result cannot cross target, score or source-ID boundaries',actual,()=>{
 const i=input('4109404'),h=derive(i)
 for(const changed of [{...i,targetSlug:'es-ct-tercera-g9'},{...i,id:'4109409'},{...i,id:'4109388'}])assert.throws(()=>derive(changed),/FCF_FUTURE_TARGET|FCF_SIX_POLICY|FCF_INVENTORY/)
 for(const changed of [{...h,id:'4109409'},{...h,targetSlug:'es-ct-tercera-g9'},{...h,homeGoals:0},{...h,awayGoals:0}])assert.throws(()=>validate({targetSlug:i.targetSlug,headers:[changed],complete:false}),/FCF_INVENTORY|FCF_FUTURE_TARGET/)
 assert.throws(()=>validate({targetSlug:i.targetSlug,headers:[h],complete:true}),/complete240/)
})
test('future header input rejects malformed bytes and caller assertions',()=>{
 for(const i of [{targetSlug:'es-ct-segona-g1',id:'4109404',bytes:'html'},{targetSlug:'es-ct-tercera-g2',id:'4116215',bytes:Buffer.from('html')},{targetSlug:'es-ct-segona-g1',id:'4109404',bytes:Buffer.from('html'),verified:true}])assert.throws(()=>derive(i),/FCF_FUTURE_TARGET|FCF_INVENTORY/)
})

// Ordinary header parsing alone accepts a changed historical date. The future
// seam must compare it with the immutable approved G9 historical fixture first.
test('TEST ONLY G9 historical factual drift cannot hide behind an ordinary valid header',actual,()=>{
 const i=rewrite(input('4118354'),x=>x==='19.09.2026'?'20.09.2026':x)
 assert.equal(deriveFcfInventoryHeader(i).playedOn,'2026-09-20')
 assert.throws(()=>derive(i),/fresh historical factual identity differs/)
})

// These NEW malicious RSC controls retain the first approved fixture. The
// existing fresh-facts verifier alone sees it; the header seam must also reject
// conflicting routes and ambiguous wrappers/side rows like ordinary headers.
for(const [label,fn]of[
 ['conflicting nested acta route',x=>x&&typeof x==='object'&&!Array.isArray(x)&&Array.isArray(x.c)?{...x,conflictingRoute:{c:['','ca','competicio','acta','4109409']}}:x],
 ['duplicate acta wrappers',x=>Array.isArray(x)&&x[0]==='$'&&x[3]?.title==='Acta del partit'?[x,structuredClone(x)]:x],
 ['duplicate side rows',x=>Array.isArray(x)&&x[0]==='$'&&x[1]==='div'&&x[3]?.className?.startsWith('flex flex-row items-start')?[x,structuredClone(x)]:x],
])test(`TEST ONLY unknown-result header rejects ${label}`,actual,()=>{
 const i=rewrite(input('4109404'),fn)
 assert.equal(verifyFcfSixFreshHistoricalSource({targetSlug:i.targetSlug,id:i.id,html:i.bytes.toString('utf8')}).fixture.sourceMatchId,'4109404','first approved fixture still passes existing fresh factual verifier')
 assert.throws(()=>derive(i),/route|ambiguous header/)
})
