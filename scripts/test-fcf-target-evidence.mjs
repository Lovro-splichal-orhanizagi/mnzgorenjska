import test from 'node:test'
import assert from 'node:assert/strict'
import {cleanupFixture,zipFixture,sha,now} from './fcf-target-test-fixture.mjs'
import {unpackVerifiedArchive} from './dfb-artifacts.mjs'
const evidence=await import('./fcf-target-evidence.mjs').catch(()=>({})),retained=process.env.FCF_HISTORICAL_RETAINED_DIR
const read=input=>{assert.equal(typeof evidence.readFcfCleanupEvidence,'function','authenticated exact-four cleanup reader must exist');return evidence.readFcfCleanupEvidence(input)}
test('cleanup ZIP protocols are separate and preserve exact SQL text bytes',t=>{
 const entries=[{name:'manifest.json'},{name:'before-image.json',body:'{"points":8.10}'},...['4109388','4116215','4118352','4118358'].map(id=>({name:`acta-${id}.html`,body:'SYNTHETIC source'}))],bytes=zipFixture(t,entries)
 assert.equal(unpackVerifiedArchive(bytes,'sha256:'+sha(bytes),'fcf-cleanup-prepared').get('before-image.json').toString(),'{"points":8.10}')
 assert.throws(()=>unpackVerifiedArchive(bytes,'sha256:'+sha(bytes),'fcf-cleanup-applied'),/entry/)
 const applied=zipFixture(t,[{name:'manifest.json'}]);assert.equal(unpackVerifiedArchive(applied,'sha256:'+sha(applied),'fcf-cleanup-applied').size,1)
})
test('reader exists and rejects caller-asserted verification without authenticated ZIP inputs',()=>{
 assert.equal(typeof evidence.readFcfCleanupEvidence,'function','authenticated exact-four cleanup reader must exist')
 assert.throws(()=>read({verified:true,phase:'applied'}),/FCF_TARGET_EVIDENCE/)
})
test('genuine four originals and opaque before image bind a prepared cleanup record',{skip:!retained},t=>{
 const f=cleanupFixture(t),r=read(f.input)
 assert.equal(r.phase,'prepared');assert.equal(r.beforeImageText,f.beforeImageText);assert.ok(r.beforeImageText.includes('"points":8.10'))
 assert.equal(r.originals.length,4);assert.equal(r.prepareArtifact.id,'200');assert.equal(r.appliedReceipt,null)
 assert.equal(evidence.isVerifiedFcfCleanupEvidence(r),true);assert.equal(evidence.isVerifiedFcfCleanupEvidence({...r}),false)
 assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.originals)&&Object.isFrozen(r.originals[0]))
})
test('separately authenticated applied dispatch links immutable prepare receipt without a shared run/attempt',{skip:!retained},t=>{
 const f=cleanupFixture(t,{applied:true}),r=read({...f.input,now:now+25*3600000})
 assert.equal(r.phase,'applied');assert.equal(r.prepareArtifact.runId,'100');assert.equal(r.appliedReceipt.artifact.runId,'300')
 assert.equal(r.prepareArtifact.runAttempt,'2');assert.equal(r.appliedReceipt.artifact.runAttempt,'3')
 assert.equal(r.appliedReceipt.result.removedAppearances,126);assert.equal(r.appliedReceipt.markers.length,4)
})
for(const[name,mutate,reason]of[
 ['wrong run',f=>f.input.prepareMetadata.run.id=101,/execution/],['wrong run attempt',f=>f.input.prepareMetadata.jobs[0].run_attempt=1,/execution/],
 ['feature ref',f=>f.input.prepareMetadata.run.head_branch='feature',/execution/],['wrong workflow',f=>f.input.prepareMetadata.run.path='.github/workflows/other.yml',/execution/],
 ['failed step',f=>f.input.prepareMetadata.jobs[0].steps[0].conclusion='failure',/step/],['duplicate job',f=>f.input.prepareMetadata.jobs.push({...f.input.prepareMetadata.jobs[0]}),/execution/],
 ['expired artifact',f=>f.input.prepareMetadata.artifact.expired=true,/artifact|identity/],['wrong ZIP digest',f=>f.input.prepareZipBytes=Buffer.from('changed'),/ZIP|size|digest/],
 ['same-size ZIP byte drift',f=>{f.input.prepareZipBytes=Buffer.from(f.input.prepareZipBytes);f.input.prepareZipBytes[f.input.prepareZipBytes.length-1]^=1},/digest/],
 ['altered original capture receipt',f=>{f.prepare.originals[1].receipt.capturedUTC='2026-10-18T13:00:00Z';f.rebuildPrepare()},/original|receipt/],
 ['missing G2 original',f=>{f.prepare.originals.splice(1,1);f.rebuildPrepare()},/original/],
 ['backup text normalization',f=>{f.prepareEntries[1].body=f.beforeImageText.replaceAll('8.10','8.1');f.rebuildPrepare()},/before.image|SHA/],
 ['missing backup array',f=>{delete f.backup.otherGoals;f.prepareEntries[1].body=JSON.stringify(f.backup);f.prepare.beforeSha256=sha(f.prepareEntries[1].body);f.rebuildPrepare()},/before.image|capture/],
 ['foreign backup competition',f=>{f.backup.competitions[0].source='dfb';f.prepareEntries[1].body=JSON.stringify(f.backup);f.prepare.beforeSha256=sha(f.prepareEntries[1].body);f.rebuildPrepare()},/competition|scope/],
 ['fake applied phase',f=>{f.prepare.phase='applied';f.rebuildPrepare()},/manifest|field/],
])test(`cleanup reader refuses ${name} before accepting source proof`,t=>{const f=cleanupFixture(t,{retained:null});mutate(f);assert.throws(()=>read(f.input),reason)})
for(const[name,edit]of[
 ['symlink',es=>es[1].symlink=true],['duplicate',es=>es.push({...es[0]})],['foreign',es=>es.push({name:'acta-4116202.html',body:'not an approved exception'})],['traversal',es=>es[1].name='../before-image.json'],
])test(`cleanup ZIP rejects ${name} members`,t=>{
 const es=[{name:'manifest.json'},{name:'before-image.json'},{name:'acta-4109388.html'}];edit(es);const bytes=zipFixture(t,es)
 assert.throws(()=>unpackVerifiedArchive(bytes,'sha256:'+sha(bytes),'fcf-cleanup-prepared'),/entry|regular|symlink/)
})
test('genuine cleanup classifier refuses invented source bodies despite correct metadata',t=>{const f=cleanupFixture(t,{retained:null});assert.throws(()=>read(f.input),/original|raw|SHA/)})
for(const[name,mutate]of[
 ['different prepare artifact',f=>f.applyManifest.prepareArtifactId='999'],['different beforeimage hash',f=>f.applyManifest.beforeSha256='f'.repeat(64)],['wrong removal count',f=>f.applyManifest.result.removedAppearances=125],['missing installed marker',f=>f.applyManifest.markers.pop()],['altered installed marker',f=>f.applyManifest.markers[0].individualRowCount=1],
])test(`applied cleanup refuses ${name}`,{skip:!retained},t=>{const f=cleanupFixture(t,{applied:true});mutate(f);f.rebuildApplied();assert.throws(()=>read(f.input),/FCF_TARGET_EVIDENCE|marker/)})
