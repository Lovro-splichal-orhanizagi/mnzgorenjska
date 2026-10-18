import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {packetFixture} from './fcf-release-test-fixture.mjs'
import {cleanupFixture,sha,now} from './fcf-target-test-fixture.mjs'
import {readFcfCleanupEvidence} from './fcf-target-evidence.mjs'
import {tokRsc,vrsticeRsc} from './viri/fcf.mjs'
import {verifyFcfCurrentReleasePacket} from './fcf-historical-release.mjs'
const api=await import('./fcf-target-release.mjs').catch(()=>({})),retained=process.env.FCF_HISTORICAL_RETAINED_DIR
const G1='es-ct-segona-g1',G2='es-ct-tercera-g2',G9='es-ct-tercera-g9'
function fixture(t,{targetSlug=G1,applied=false}={}){
 const current=packetFixture(),cleanup=cleanupFixture(t,{applied}),g=current.groups.find(g=>g.competition.slug===targetSlug)
 if(applied)for(const c of current.databaseInventory.groups)c.source_policy='es-fcf-reviewed-history-v1'
 return{...current,targetSlug,targetEvidence:{evidenceKind:'fcf-target-cache-audit',targetSlug,competition:g.competition,documents:g.documents},cleanupEvidence:readFcfCleanupEvidence(cleanup.input)}
}
const compile=input=>{assert.equal(typeof api.compileFcfTargetReleasePacket,'function','independent v2 target packet compiler must exist');return api.compileFcfTargetReleasePacket(input)}
const inspect=(databaseInventory,cleanupPhase='prepared',targetSlug=G1)=>{assert.equal(typeof api.validateFcfTargetReleaseInventory,'function','scoped inventory validator must exist');return api.validateFcfTargetReleaseInventory({targetSlug,databaseInventory,cleanupPhase,now})}
test('target compiler is a separate closed v2 entrypoint and refuses caller assertion of cleanup verification',()=>{
 assert.equal(typeof api.compileFcfTargetReleasePacket,'function','independent v2 target packet compiler must exist')
 assert.throws(()=>compile({targetSlug:G1,sourceCommit:'a'.repeat(40),cleanupEvidence:{phase:'applied',verified:true},now}),/FCF_TARGET_RELEASE/)
})
test('target inventory permits already active non-target only after cleanup, without claiming its readiness',()=>{
 const p=packetFixture(null),inv=p.databaseInventory
 assert.equal(inspect(inv).target.id,783)
 for(const c of inv.groups)c.source_policy='es-fcf-reviewed-history-v1'
 inv.groups[0].active=true;inv.groups[0].prvi_fantasy_krog=8;inv.groups[0].hasUserActivity=true;inv.groups[0].prices={changed:true}
 const r=inspect(inv,'applied',G9)
 assert.equal(r.target.id,797);assert.equal(r.inventory.groups.find(g=>g.slug===G1).active,true)
 assert.equal(Object.hasOwn(r.inventory.groups.find(g=>g.slug===G1),'prices'),false)
 assert.throws(()=>inspect(inv,'prepared',G9),/prepared|inactive|policy/)
 assert.throws(()=>inspect(inv,'applied',G1),/target.*inactive/)
})
for(const[name,mutate]of[
 ['stale inventory',f=>f.capturedUTC='2026-10-16T00:00:00Z'],['foreign non-target source',f=>f.groups[1].source='dfb'],['missing calendar flag',f=>delete f.groups[2].sezona_koledarska],['duplicate native import',f=>f.groups[0].nativeImportedIDs.push(f.groups[0].nativeImportedIDs[0])],['foreign non-target native ID',f=>f.groups[1].nativeImportedIDs.push('4109389')],['missing non-target scope',f=>f.groups.pop()],
])test(`target inventory refuses ${name}`,()=>{const inv=packetFixture(null).databaseInventory;mutate(inv);assert.throws(()=>inspect(inv),/FCF_TARGET_RELEASE/)})
for(const targetSlug of[G1,G9])test(`v2 ${targetSlug} derives one full target and binds all4 cleanup originals without reading G2 normal bait`,{skip:!retained},t=>{
 const f=fixture(t,{targetSlug}),g2=f.databaseInventory.groups.find(c=>c.slug===G2)
 Object.defineProperty(f.targetEvidence,'nonTargetReports',{get(){throw Error('non-target normal source must not be parsed')}})
 Object.defineProperty(g2,'normalReports',{get(){throw Error('non-target normal source must not be parsed')}})
 const p=compile(f),m=JSON.parse(p.manifestText)
 assert.equal(m.schemaVersion,2);assert.equal(m.kind,'fcf-current-target-release');assert.equal(m.targetSlug,targetSlug);assert.equal(m.target.fixtures.length,240)
 assert.equal(m.cleanupBinding.originals.length,4);assert.equal(m.cleanupBinding.beforeImageText,f.cleanupEvidence.beforeImageText);assert.ok(m.cleanupBinding.beforeImageText.includes('8.10'))
 assert.equal(Object.hasOwn(m,'groups'),false);assert.equal(m.target.competitionSlug,targetSlug);assert.equal(m.target.verifiedKeeperClubs.length,16)
 assert.equal(m.target.fixtures.filter(f=>f.statisticsStatus==='unavailable_historical').length,targetSlug===G9?2:1)
 assert.ok(m.cleanupBinding.originals.every(o=>!Object.hasOwn(o,'html')))
 assert.equal(sha(p.manifestText),p.manifestSha256)
 assert.deepEqual(api.verifyFcfTargetReleasePacket({...f,...p,now:now+1000}),p)
})
test('later G9 packet accepts earlier G1 activity with separate cleanup commit and newer target main',{skip:!retained},t=>{
 const f=fixture(t,{targetSlug:G9,applied:true}),g1=f.databaseInventory.groups.find(c=>c.slug===G1)
 g1.active=true;g1.prvi_fantasy_krog=8;g1.hasUserActivity=true;g1.prices={changed:true};f.sourceCommit='d'.repeat(40)
 const m=JSON.parse(compile(f).manifestText)
 assert.equal(m.sourceCommit,'d'.repeat(40));assert.equal(m.cleanupBinding.sourceCommit,'a'.repeat(40));assert.equal(m.cleanupBinding.phase,'applied')
 assert.equal(m.target.competitionSlug,G9)
})
test('G2 target holds actual Calonge keeper overlap without silently skipping or extending exceptions',{skip:!retained},t=>{
 const f=fixture(t,{targetSlug:G2}),html=readFileSync(join(retained,'request-1-acta-4116202.html'),'utf8'),d=f.targetEvidence.documents.find(d=>d.id==='4116202')
 Object.assign(d,{expectedSourceRound:2,html,receipt:{...d.receipt,bytes:Buffer.byteLength(html),rawSha256:sha(html),startedUTC:'2026-10-18T12:31:46.226Z',capturedUTC:'2026-10-18T12:31:46.880Z',cacheMtimeUTC:null}})
 assert.throws(()=>compile(f),/continuous exactly one explicit goalkeeper/)
})
for(const[name,mutate,reason]of[
 ['absent target',f=>delete f.targetSlug,/FCF_TARGET_RELEASE/],['foreign target',f=>f.targetSlug='es-ct-tercera-g4',/FCF_TARGET_RELEASE/],
 ['multiple target groups',f=>f.targetEvidence.groups=f.groups,/FCF_TARGET_RELEASE/],['missing target raw',f=>f.targetEvidence.documents.pop(),/FCF_TARGET_RELEASE/],['duplicate target raw',f=>f.targetEvidence.documents[1]=f.targetEvidence.documents[0],/FCF_TARGET_RELEASE/],
 ['known target complete downgraded to pending',f=>f.databaseInventory.groups[0].nativeImportedIDs.push(f.targetEvidence.documents.find(d=>d.expectedSourceRound===5).id),/known.*pending/],
 ['copied cleanup verification',f=>f.cleanupEvidence={...f.cleanupEvidence},/reader-issued/],['new inventory assertion without authenticated bridge',f=>f.targetEvidence.evidenceKind='fcf-missing-target-inventory',/inventory.*admission/],
 ['target active',f=>f.databaseInventory.groups[0].active=true,/target.*inactive/],['future original source age',f=>f.targetEvidence.documents[1].receipt.capturedUTC='2027-01-01T00:00:00Z',/FCF_RELEASE/],
 ['changed actual source round',f=>f.targetEvidence.documents[1].expectedSourceRound=30,/actual source round/],['changed historical original raw',f=>f.targetEvidence.documents[0].html+=' ',/cleanup.*original|FCF_RELEASE/],
])test(`v2 target packet refuses ${name}`,{skip:!retained},t=>{const f=fixture(t);mutate(f);assert.throws(()=>compile(f),reason)})
test('copied current canonical or protocol changes cannot pass exact-text replay after rehash',{skip:!retained},t=>{
 const f=fixture(t),p=compile(f),m=JSON.parse(p.manifestText)
 m.target.fixtures.find(f=>f.appearances?.length).appearances[0].minutaDo=1
 let manifestText=JSON.stringify(m);assert.throws(()=>api.verifyFcfTargetReleasePacket({...f,manifestText,manifestSha256:sha(manifestText)}),/FCF_TARGET_RELEASE/)
 m.schemaVersion=1;m.kind='fcf-current-only-release';manifestText=JSON.stringify(m)
 assert.throws(()=>api.verifyFcfTargetReleasePacket({...f,manifestText,manifestSha256:sha(manifestText)}),/FCF_TARGET_RELEASE/)
 assert.throws(()=>verifyFcfCurrentReleasePacket({...f,...p}),/FCF_RELEASE/)
})
test('prepared cleanup proof cannot be relabeled fresh at a later compile audit',{skip:!retained},t=>{
 const f=fixture(t);f.now=now+25*3600000;f.databaseInventory.capturedUTC=new Date(f.now).toISOString()
 assert.throws(()=>compile(f),/prepared cleanup.*stale/)
})

function replaceRaw(d,html){d.html=html;d.receipt.bytes=Buffer.byteLength(html);d.receipt.rawSha256=sha(html)}
for(const[name,mutate,reason]of[
 ['R6 cache time relabeled as fresh capture',d=>{d.receipt.startedUTC=null;d.receipt.capturedUTC=null;d.receipt.cacheMtimeUTC='2026-10-18T13:00:00Z'},/pending prelaunch\/R6/],
 ['R6 already past',d=>replaceRaw(d,d.html.replace('24.10.2026','17.10.2026')),/R6 requires an explicit future official kickoff/],
 ['R6 missing official kickoff',d=>replaceRaw(d,d.html.replace('16.00 H','TBD')),/R6 requires an explicit future official kickoff/],
])test(`v2 target refuses ${name}`,{skip:!retained},t=>{const f=fixture(t),d=f.targetEvidence.documents.find(d=>d.expectedSourceRound===6);mutate(d);assert.throws(()=>compile(f),reason)})
test('synthetic4116314 control uses its actual header round rather than a numeric ID prefix',{skip:!retained},t=>{
 const f=fixture(t,{targetSlug:G2}),d=f.targetEvidence.documents.find(d=>d.id==='4116314'),m=JSON.parse(compile(f).manifestText)
 assert.equal(m.target.fixtures.find(r=>r.id==='es4116314').round,d.expectedSourceRound)
 assert.notEqual(d.expectedSourceRound,1)
 d.expectedSourceRound=1;assert.throws(()=>compile(f),/actual source round differs/)
})
test('v2 target retains strict continuous keeper coverage through the existing source parser',{skip:!retained},t=>{
 const f=fixture(t),d=f.targetEvidence.documents.find(d=>d.expectedSourceRound===3),walk=(x,fn)=>fn(Array.isArray(x)?x.map(v=>walk(v,fn)):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,walk(v,fn)])):x)
 const roots=walk([...vrsticeRsc(tokRsc(d.html))],x=>x&&typeof x==='object'&&!Array.isArray(x)&&x.player?{...x,player:{...x.player,portero:String(x.player.id)==='15555569'?'1':String(x.player.id)==='694885'?'0':x.player.portero}}:x)
 const html=`<!doctype html><title>Acta: SYNTHETIC target GK gap | FCF</title><script>self.__next_f.push([1,${JSON.stringify(roots.map(([k,v])=>k+':'+JSON.stringify(v)).join('\n')+'\n')}])</script>`
 replaceRaw(d,html);assert.throws(()=>compile(f),/continuous exactly one explicit goalkeeper/)
})
