import test from 'node:test'
import assert from 'node:assert/strict'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {calendarFixture} from './fcf-release-test-fixture.mjs'
import {now,commit,manualPlan,seedFixture,headerBytes,policies,sha,zip} from './fcf-missing-inventory-test-fixture.mjs'
const api=await import('./fcf-missing-inventory-plan.mjs').catch(()=>({}))
const call=(name,args)=>{assert.equal(typeof api[name],'function',`${name} required`);return api[name](args)}
const validate=plan=>call('validateFcfMissingInventoryPlan',{plan,expectedPlanSha256:plan.planSha256,now})
function rehash(p){delete p.planSha256;p.planSha256=hash(p);return p}
function rewriteSeed(f,mutate){mutate(f);f.entries[0].body=Buffer.from(JSON.stringify(f.manifest));f.zipBytes=zip(f.entries);f.artifact.size_in_bytes=f.zipBytes.length;f.artifact.digest='sha256:'+sha(f.zipBytes);f.expected.artifactDigest=f.artifact.digest;f.expected.manifestSha256=sha(f.entries[0].body)}
test('fixed missing inventory validates exact239+238 partition and actual child plan hashes',()=>{
 const p=manualPlan(),children=validate(p)
 assert.deepEqual(children.map(c=>c.maximumSourceGETs),[239,238]);assert.equal(p.maximumSourceGETs,477)
 assert.equal(children[0].fetchIds[0],'4109389');assert.equal(children[1].fetchIds[0],'4118349')
 for(const c of children)assert.equal(c.childPlanSha256,hash({...p.children.find(x=>x.targetSlug===c.targetSlug),parentPlanSha256:p.planSha256}))
})
for(const [name,change] of [
 ['expanded budget',p=>p.maximumSourceGETs=478],['extra target',p=>p.children.push(p.children[0])],['G2',p=>p.children[0].targetSlug='es-ct-tercera-g2'],['policy drift',p=>p.policyHashes['es-ct-segona-g1']='0'.repeat(64)],['unknown property',p=>p.verified=true],['non-main commit',p=>p.sourceCommit='bad'],['wrong original capture commit',p=>p.children[0].reuse[0].sourceCaptureCommit=commit],['marker GET',p=>p.children[0].fetchIds[0]='4109388'],['foreign ID',p=>p.children[0].fetchIds[0]='4109387'],['ID ordinal round',p=>p.children[0].fetchIds[0]={id:'4109389',sourceRound:1}],['duplicate ID',p=>p.children[1].fetchIds[1]=p.children[1].fetchIds[0]],['reordered requests',p=>p.children[1].fetchIds.reverse()],['missing target',p=>p.children.pop()],['false source time',p=>p.children[0].reuse[0].receipt.startedUTC=p.createdUTC],['changed limit',p=>p.limits.pauseMs=1],['stale plan',p=>p.createdUTC='2026-10-16T13:00:00.000Z'],['future plan',p=>p.createdUTC='2099-01-01T00:00:00.000Z'],['seed fake lineage',p=>p.seedBinding.verified=true],['zero artifact ID',p=>p.seedBinding.artifactId='0'],
])test(`missing inventory plan rejects ${name} even after canonical rehash`,()=>{const p=manualPlan();change(p);rehash(p);assert.throws(()=>validate(p),/FCF_INVENTORY/)})
test('plan requires explicitly expected hash and an actual authenticated seed proof for building',()=>{
 const p=manualPlan();assert.throws(()=>call('validateFcfMissingInventoryPlan',{plan:p,expectedPlanSha256:'0'.repeat(64),now}),/FCF_INVENTORY/)
 assert.throws(()=>call('buildFcfMissingInventoryPlan',{sourceCommit:commit,seedEvidence:{verified:true,...p.seedBinding},policyHashes:policies(),now}),/FCF_INVENTORY/)
})
test('seed rejects synthetic bodies even with pinned descriptor hashes and authenticated-style test metadata',()=>assert.throws(()=>call('readFcfMissingInventorySeed',seedFixture()),/FCF_INVENTORY.*raw/))
for(const [name,change]of[
 ['wrong selected artifact',f=>f.expected.artifactId='999'],['wrong actual ZIP digest',f=>f.artifact.digest='sha256:'+'0'.repeat(64)],['failed seed job',f=>f.jobs[0].conclusion='failure'],['in-progress seed run',f=>f.run.status='in_progress'],['expired artifact',f=>f.artifact.expired=true],['mixed job attempt',f=>f.jobs[0].run_attempt=2],['wrong workflow',f=>f.run.path='.github/workflows/ci.yml'],['unknown manifest property',f=>rewriteSeed(f,x=>x.manifest.verified=true)],['refreshed original time',f=>rewriteSeed(f,x=>x.manifest.originals[0].receipt.endedUTC='2026-10-18T13:00:00Z')],['missing original receipt member',f=>rewriteSeed(f,x=>x.entries.splice(1,1))],['unrelated raw member',f=>rewriteSeed(f,x=>x.entries.push({name:'acta-4116202.html',body:Buffer.from('control')}))],['duplicate member',f=>rewriteSeed(f,x=>x.entries.push(x.entries[0]))],['symlink raw',f=>rewriteSeed(f,x=>x.entries[2].symlink=true)],['oversized raw',f=>rewriteSeed(f,x=>{delete x.entries[2].body;x.entries[2].size=2097153})],
])test(`seed refuses ${name}`,()=>{const f=seedFixture();change(f);assert.throws(()=>call('readFcfMissingInventorySeed',f),/FCF_INVENTORY/)})
const retained=process.env.FCF_HISTORICAL_RETAINED_DIR
test('exact retained original seed authenticates bytes and builds immutable fixed source plan',{skip:!retained},()=>{
 const f=seedFixture(retained),seed=call('readFcfMissingInventorySeed',f),plan=call('buildFcfMissingInventoryPlan',{sourceCommit:commit,seedEvidence:seed,policyHashes:policies(),now})
 assert.equal(seed.binding.sourceCaptureCommit,'f7efba26c31f76372b5aab1e976061631fbaebda');assert.equal(seed.binding.retentionCommit,commit);assert.equal(seed.binding.artifactDigest,f.artifact.digest)
 assert.deepEqual(validate(plan).map(c=>c.fetchIds.length),[239,238]);assert.ok(Object.isFrozen(seed));assert.ok(Object.isFrozen(plan.children[0].reuse[0].receipt))
 const bytes=call('getFcfMissingInventorySeedOriginals',seed);bytes[0].bytes.fill(0);assert.notEqual(call('getFcfMissingInventorySeedOriginals',seed)[0].bytes[0],0)
 assert.throws(()=>call('buildFcfMissingInventoryPlan',{sourceCommit:commit,seedEvidence:structuredClone(seed),policyHashes:policies(),now}),/FCF_INVENTORY/)
})
const derive=(bytes,args={})=>call('deriveFcfInventoryHeader',{targetSlug:'es-ct-segona-g1',id:'4109389',bytes,...args})
test('header proof uses actual source round and exact native side links without individual parsing',()=>{
 const h=derive(headerBytes({round:23}));assert.equal(h.round,23);assert.equal(h.status,'pending');assert.equal(h.home.sourceClubId,'1');assert.equal(h.home.sourceCategoryId,'101');assert.equal(h.home.name,'SYNTHETIC CLUB 0');assert.equal(h.playedOn,'2026-10-24');assert.equal(h.kickoff,'16:00')
 assert.equal(Object.hasOwn(h,'appearances'),false)
})
for(const[name,bytes]of[
 ['wrong route',()=>headerBytes({id:'4109390'})],['conflicting route',()=>headerBytes({change:r=>({...r,other:{c:['','ca','competicio','acta','4109390']}})})],['wrong group',()=>headerBytes({slug:'es-ct-tercera-g9'})],['old season',()=>headerBytes({season:'2025 / 26'})],['round31',()=>headerBytes({round:31})],['invalid calendar date',()=>headerBytes({day:'31.02.2027'})],['unknown status',()=>headerBytes({status:'WHAT'})],['closed missing result',()=>headerBytes({status:'Acta Tancada'})],['pending result',()=>headerBytes({score:'1 - 0'})],['no club link',()=>headerBytes({change:r=>{r.headers[0][3].children[3].children[0][3].href='/not-club';return r}})],['self fixture',()=>headerBytes({away:0})],['invalidUTF8',()=>Buffer.from([255])],['BOM',()=>Buffer.concat([Buffer.from([239,187,191]),headerBytes()])],['challenge',()=>Buffer.from('<title>Just a moment</title>')],['oversized',()=>Buffer.alloc(2097153)],
])test(`header capture refuses ${name}`,()=>assert.throws(()=>derive(bytes()),/FCF_INVENTORY/))
function calendar(){return calendarFixture().map((f,i)=>({id:String(4109388+i),targetSlug:'es-ct-segona-g1',round:f.round,playedOn:'2026-10-24',kickoff:'16:00',status:'pending',homeGoals:null,awayGoals:null,home:{...f.clubs[0],href:`/ca/clubs/${f.clubs[0].sourceClubId}/categories/${f.clubs[0].sourceCategoryId}`},away:{...f.clubs[1],href:`/ca/clubs/${f.clubs[1].sourceClubId}/categories/${f.clubs[1].sourceCategoryId}`}}))}
const close=(headers,complete=true)=>call('validateFcfInventoryHeaders',{targetSlug:'es-ct-segona-g1',headers,complete})
test('header calendar closes240 actual IDs/30 rounds/8 matches/16 native clubs and directed pairs',()=>{
 const hs=calendar(),out=close(hs);assert.equal(out.clubs.length,16);assert.equal(out.rounds.length,30);assert.equal(out.documentCount,240);assert.equal(close(hs.slice(0,2),false).documentCount,2);assert.throws(()=>close(hs.slice(0,239)),/FCF_INVENTORY/)
})
for(const[name,change]of[
 ['duplicate source ID',h=>h[1].id=h[0].id],['duplicate directed pairing',h=>{h[8].home={...h[0].home};h[8].away={...h[0].away}}],['native name drift',h=>h[8].home.name='RENAMED'],['seventeenth native club',h=>h[9].home={sourceClubId:'999',sourceCategoryId:'998',name:'EXTRA',href:'/ca/clubs/999/categories/998'}],['repeated club within round',h=>h[1].home={...h[0].home}],['ninth match in round',h=>h[8].round=1],['foreign target',h=>h[0].targetSlug='es-ct-tercera-g9'],
])test(`header calendar rejects ${name} incrementally`,()=>{const hs=calendar();change(hs);assert.throws(()=>close(hs,false),/FCF_INVENTORY/)})
test('nested three-column score is not a second native header-side row',()=>{
 const bytes=headerBytes({status:'Acta Tancada',score:'0 - 3',change:r=>{r.headers[0][3].children[3].children[1][3].children[1][3].children=['$','div',null,{children:[['$','span',null,{children:'0'}],['$','span',null,{children:'-'}],['$','span',null,{children:'3'}]]}];return r}})
 const header=derive(bytes);assert.equal(header.status,'published');assert.equal(header.homeGoals,0);assert.equal(header.awayGoals,3)
})
test('a nested route cannot replace the actual root acta route',()=>{
 const bytes=headerBytes({change:r=>({...r,c:['','ca','clubs','1'],navigation:{c:['','ca','competicio','acta','4109389']}})})
 assert.throws(()=>derive(bytes),/FCF_INVENTORY.*route/)
})
test('conflicting distinct native side links fail rather than selecting one',()=>{
 const bytes=headerBytes({change:r=>{const side=r.headers[0][3].children[3].children[0];side[3].children=[side[3].children,['$','a',null,{href:'/ca/clubs/99/categories/99',children:'foreign'}]];return r}})
 assert.throws(()=>derive(bytes),/FCF_INVENTORY/)
})
test('duplicate Acta header wrappers are ambiguous even if IDs and bytes are rehashed',()=>{
 const bytes=headerBytes({change:r=>({...r,headers:[...r.headers,r.headers[0]]})})
 assert.throws(()=>derive(bytes),/FCF_INVENTORY/)
})
