import test from 'node:test'
import assert from 'node:assert/strict'
import {existsSync,readFileSync} from 'node:fs'

test('native composition exists and rejects copied source capabilities',async()=>{
 assert.ok(existsSync(new URL('./fussball-native-composition.mjs',import.meta.url)),'Task 1 composition contract must exist')
 const api=await import('./fussball-native-composition.mjs')
 for(const name of ['partitionFussballNativeSource','buildFussballNativeComposition'])assert.throws(()=>api[name]({sourceEligible:true,nativeEligible:true}),/reader-issued/)
 assert.throws(()=>api.getFussballNativeComposition({registrationEligible:true}),/reader-issued/)
})
test('production catalog is explicitly unfinalized and cannot mint preparation authority',async()=>{
 assert.ok(existsSync(new URL('./fussball-native-composition.mjs',import.meta.url)),'composition implementation missing')
 const api=await import('./fussball-native-composition.mjs'),catalog=JSON.parse(readFileSync(new URL('./policies/fussball-baden-native-composition.json',import.meta.url)))
 assert.equal(catalog.status,'UNFINALIZED');assert.equal(catalog.firstFantasyPlayedOn,null);assert.equal(catalog.clubDescriptors,null)
 assert.equal(catalog.seasons[0].reviews.length,9);assert.equal(catalog.seasons[1].fixtureInventorySha256,null)
 assert.throws(()=>api.validateFussballNativeCatalog(catalog),/UNFINALIZED/)
 for(const key of ['skipIds','nativeBinding','sourceProof'])assert.throws(()=>api.validateFussballNativeCatalog({...catalog,[key]:[]}),/closed catalog/)
})
test('native hosted loader and CLI reject public overrides before any GET',async()=>{
 assert.ok(existsSync(new URL('./fussball-native-composition.mjs',import.meta.url)),'composition implementation missing')
 const api=await import('./fussball-native-composition.mjs');let calls=0
 await assert.rejects(api.loadFussballNativeComposition({derivedRunId:'123',derivedHead:'a'.repeat(40),github:async()=>{calls++},requireFresh:false}),/exact derived/)
 assert.equal(calls,0)
 const stage=await import('./stage-fussball-native-composition.mjs')
 await assert.rejects(stage.stageFussballNativeComposition({command:'produce',directory:'unused',env:{}}));assert.equal(calls,0)
})

test('closed catalog validator rejects incomplete finalized archive, arbitrary exclusions and fabricated native preparation',async()=>{
 assert.ok(existsSync(new URL('./fussball-native-composition.mjs',import.meta.url)))
 const {validateFussballNativeCatalog}=await import('./fussball-native-composition.mjs')
 const c=JSON.parse(readFileSync(new URL('./policies/fussball-baden-native-composition.json',import.meta.url)))
 c.status='FINALIZED';c.firstFantasyPlayedOn='2026-10-31'
 assert.throws(()=>validateFussballNativeCatalog(c),/catalog|inventory|club|run\/head/)
 c.nativePreparation={prepared:true,competitionId:1};assert.throws(()=>validateFussballNativeCatalog(c),/native preparation/)
})

test('dedicated workflow is manual read-only and cannot perform football or native writes',()=>{
 const path=new URL('../.github/workflows/replay-fussball-native-composition.yml',import.meta.url)
 assert.ok(existsSync(path),'derived workflow must exist')
 const w=readFileSync(path,'utf8')
 for(const re of [/workflow_dispatch:/,/contents: read/,/actions: read/,/github.run_attempt == 1/,/inputs.expected_sha == github.sha/,/npm ci --ignore-scripts/,/compression-level: 0/,/Preserve derived Baden composition proof/])assert.match(w,re)
 assert.doesNotMatch(w,/secrets\.|SUPABASE|DATABASE|ssh |actions: write|contents: write|capture-current|capture-archive|dispatches|schedule:/)
})

test('explicit native bulk profile authenticates before filesystem/native use; legacy still follows admission file',async()=>{
 const {loadBulkPack}=await import('./bulk-source-packs.mjs')
 await assert.rejects(loadBulkPack('/definitely-missing',{profile:'germany-retained-fussball-native-v1',composition:{}}),/exact derived/)
 await assert.rejects(loadBulkPack('/definitely-missing'),/ENOENT/)
})

import {partitionFixture,isolatedComposition,hostedDerivedFixture,derivedHead,derivedRunId,canonical,json,hash} from './fussball-native-composition-test-fixture.mjs'
import {buildFussballImportBatch} from './fussball-import.mjs'

test('TEST ONLY isolated exact partition covers all five categories and preserves source evidence',()=>{
 const f=partitionFixture(),before=canonical(f.state.originals.stages.current.result),api=isolatedComposition(f),pack=api.buildFussballNativeComposition(f.proof)
 assert.deepEqual(pack.seasons[0].inventory.counts,{'unplayed':1,'complete':1,'community-pending':1,'reviewed-known-result-unavailable':1,'reviewed-unknown-administrative-result':0})
 assert.equal(pack.seasons[1].inventory.counts['reviewed-unknown-administrative-result'],1)
 const admin=pack.seasons[1].unavailable[0];assert.equal(admin.officialResultKnown,false);assert.equal(admin.officialScore,null);assert.deepEqual(admin.administrativeResult.displayedScores,[{domaci:0,gostje:3},{domaci:3,gostje:0}])
 for(const row of pack.seasons.flatMap(s=>s.unavailable)){for(const key of ['nastopi','goli','appearances','goals','individualPoints','importedAt'])assert.equal(row[key],null);assert.equal(row.goalkeeperCoverage,0)}
 assert.equal(pack.registrationEligible,false);assert.equal(pack.nativeImportEligible,false);assert.equal(pack.actualReady,false);assert.equal(canonical(f.state.originals.stages.current.result),before)
 assert.throws(()=>api.buildFussballNativeComposition({...f.proof}),/reader-issued/)
})
test('TEST ONLY retained complete and pending parser sample normalization equals unchanged default valid sample',()=>{
 const f=partitionFixture(),api=isolatedComposition(f),pack=api.buildFussballNativeComposition(f.proof),r=structuredClone(f.state.originals.stages.current.result)
 r.schedule.fixtures=r.schedule.fixtures.filter(f=>r.reports.some(e=>e.fixture.id===f.id)||r.pendingReports.some(e=>e.fixture.id===f.id));r.rejectedReports=[]
 Object.assign(r.coverage,{fixtures:2,playedFixtures:2,attemptedReports:2,rejectedReports:0,unscoredFixtures:{total:0,past:0,current:0,future:0,unknownDate:0}})
 const ordinary=buildFussballImportBatch(r,{staffel:r.scope.staffel,season:r.scope.season,cardPolicy:'community-v1'})
 assert.deepEqual(pack.seasons[0].reports,ordinary.reports);assert.deepEqual(pack.seasons[0].pendingReports,ordinary.pendingReports);assert.deepEqual(pack.seasons[0].cardEnvelopes,ordinary.cardEnvelopes);assert.deepEqual(pack.seasons[0].identities,ordinary.identities)
})
test('TEST ONLY source partition rejects missing/extra/overlap/exclusion, wrong receipts, heads and postlaunch unavailable',()=>{
 const mutations=[
  f=>f.state.originals.stages.current.result.reports.push(f.state.originals.stages.current.result.reports[0]),
  f=>f.state.originals.stages.current.result.reports.splice(0,1),
  f=>f.catalog.seasons[0].reviews.push(structuredClone(f.catalog.seasons[0].reviews[0])),
  f=>f.catalog.seasons[0].reviews.splice(0,1),
  f=>f.catalog.seasons[0].reviews[0].fixture.domaci='Wrong club',
  f=>f.catalog.seasons[0].reviews[0].defect.reason='Wrong defect',
  f=>f.catalog.seasons[0].reviews[0].documents[0].metadata.originalReceipt.sha256='0'.repeat(64),
  f=>f.catalog.seasons[0].reviews[0].documents[0].sha256='0'.repeat(64),
  f=>f.catalog.seasons[0].reviews[0].missingObservedFonts.push({id:'aaaaaaaa',missing:['font']}),
  f=>f.catalog.firstFantasyPlayedOn=f.catalog.seasons[0].reviews[0].fixture.datum,
  f=>f.proof.source.sourceHead='c'.repeat(40),
  f=>f.proof.source.currentFreshUntil=new Date(Date.now()+24*3600_000).toISOString(),
  f=>f.state.originals.stages.archive.manifest.success=false,
  f=>f.catalog.seasons[1].fixtureInventorySha256=null,
  f=>f.catalog.clubDescriptors.pop(),
  f=>f.state.originals.stages.current.result.coverage.sampled=true,
  f=>f.state.originals.stages.current.result.pendingReports[0].result.cardEnvelope.bundle.lineup.base64='dGFtcGVy',
  f=>f.state.originals.stages.archive.result.schedule.fixtures[0].rezultat={domaci:0,gostje:0},
 ]
 for(const mutate of mutations){const f=partitionFixture();mutate(f);const api=isolatedComposition(f);assert.throws(()=>api.buildFussballNativeComposition(f.proof),undefined,mutate.toString())}
})
test('TEST ONLY hosted derived reader issues only cold preparation scope after independent source reauthentication',async t=>{
 const f=await hostedDerivedFixture(t),before=f.sourceReads,p=await f.api.loadFussballNativeComposition({derivedRunId,derivedHead,frozenDirectory:'TEST-ONLY-frozen',github:f.github})
 assert.equal(f.sourceReads-before,2);assert.equal(p.kind,'source-partition-verified-awaiting-native-preparation');assert.equal(p.registrationEligible,false);assert.equal(p.nativeImportEligible,false);assert.equal(p.activationEligible,false);assert.equal(p.actualReady,false)
 const state=f.api.getFussballNativeComposition(p);assert.equal(state.pack.sourceHead,'b'.repeat(40));assert.equal(state.pack.replayHead,derivedHead);assert.equal(state.pack.expectedSha,derivedHead);assert.equal(state.pack.nativeAdmission,false);state.pack.seasons=[];assert.equal(f.api.getFussballNativeComposition(p).pack.seasons.length,2)
 assert.throws(()=>f.api.getFussballNativeComposition({...p}),/reader-issued/)
 const reread=await f.api.reauthenticateFussballNativeComposition(p);assert.notEqual(reread,p);assert.equal(f.sourceReads-before,4)
})

for(const [name,change]of[
 ['wrong run repository',f=>f.run.head_repository.full_name='other/repo'],
 ['wrong head',f=>f.run.head_sha='b'.repeat(40)],
 ['rerun',f=>f.run.run_attempt=2],
 ['failed run',f=>f.run.conclusion='failure'],
 ['live run',f=>f.run.status='in_progress'],
 ['changed main',f=>f.main.commit.sha='b'.repeat(40)],
 ['wrong job binding',f=>f.jobs.jobs[0].run_id=1],
 ['missing derive job',f=>f.jobs={total_count:0,jobs:[]}],
 ['missing critical step',f=>f.jobs.jobs[0].steps.splice(1,1)],
 ['failed critical step',f=>f.jobs.jobs[0].steps[1].conclusion='failure'],
 ['expired artifact',f=>f.artifact.expired=true],
 ['wrong artifact name',f=>f.artifact.name='other'],
 ['wrong artifact head',f=>f.artifact.workflow_run.head_sha='b'.repeat(40)],
 ['wrong artifact upload time',f=>f.artifact.created_at='2020-01-01T00:00:00Z'],
 ['ZIP digest tamper',f=>f.zipBytes[0]^=1],
 ['extra artifact member',f=>{f.files.set('exclusions.json',Buffer.from('[]'));f.refresh()}],
 ['missing pack',f=>{f.files.delete('pack.json');f.refresh()}],
 ['pack raw byte tamper',f=>{f.files.get('pack.json')[20]^=1;f.refresh()}],
 ['forged completed source identity',f=>f.recertify(c=>c.sourceRunId='123')],
 ['forged certificate head',f=>f.recertify(c=>c.expectedSha='b'.repeat(40))],
 ['runtime digest tamper',f=>f.recertify(c=>c.runtimeSha256='0'.repeat(64))],
 ['policy digest tamper',f=>f.recertify(c=>c.policySha256='0'.repeat(64))],
 ['club descriptor digest tamper',f=>f.recertify(c=>c.clubDescriptorsSha256='0'.repeat(64))],
 ['restarted original clock',f=>f.recertify(c=>c.currentFreshUntil=new Date(Date.now()+24*3600_000).toISOString())],
 ['native binding object',f=>f.recertify(c=>c.nativePreparation={prepared:true,competitionId:1})],
 ['promoted native permission',f=>f.recertify(c=>c.nativeImportEligible=true)],
 ['source failure on reread',f=>{f.sourceFailure=true}],
])test(`TEST ONLY derived proof rejects ${name}`,async t=>{
 const f=await hostedDerivedFixture(t);change(f)
 await assert.rejects(f.api.loadFussballNativeComposition({derivedRunId,derivedHead,frozenDirectory:'TEST-ONLY-frozen',github:f.github}))
})

test('TEST ONLY self-consistent forged pack/certificate digests cannot replace exact source partition',async t=>{
 const f=await hostedDerivedFixture(t),pack=JSON.parse(f.files.get('pack.json'))
 pack.seasons[0].inventory.partition['reviewed-known-result-unavailable'].push('FORGED')
 const b=json(pack);f.files.set('pack.json',b);f.recertify(c=>{c.packBytes=b.length;c.packSha256=hash(b);c.partitions=pack.seasons.map(s=>({inventory:s.inventory,partitionSha256:s.partitionSha256}))})
 await assert.rejects(f.api.loadFussballNativeComposition({derivedRunId,derivedHead,frozenDirectory:'TEST-ONLY-frozen',github:f.github}),/fresh authenticated rebuild/)
})

test('TEST ONLY current expiry and source/runtime drift are rechecked at final proof and child factory boundaries',async t=>{
 const f=await hostedDerivedFixture(t),p=await f.api.loadFussballNativeComposition({derivedRunId,derivedHead,frozenDirectory:'TEST-ONLY-frozen',github:f.github}),real=Date.now
 Date.now=()=>Date.parse(p.currentFreshUntil)+1
 try{assert.throws(()=>f.api.getFussballNativeComposition(p),/freshness/);await assert.rejects(f.api.reauthenticateFussballNativeComposition(p),/freshness/)}finally{Date.now=real}
 const g=await hostedDerivedFixture(t);let runReads=0;g.controls.change=(path,v)=>path.endsWith('/runs/'+derivedRunId)&&++runReads===2?{...v,updated_at:'2000-01-01T00:00:00Z'}:v
 await assert.rejects(g.api.loadFussballNativeComposition({derivedRunId,derivedHead,frozenDirectory:'TEST-ONLY-frozen',github:g.github}),/metadata\/main\/runtime drift/)
 const h=await hostedDerivedFixture(t);h.controls.change=(path,v)=>path.includes('/contents/')?{...v,content:Buffer.from('changed runtime').toString('base64')}:v
 await assert.rejects(h.api.loadFussballNativeComposition({derivedRunId,derivedHead,frozenDirectory:'TEST-ONLY-frozen',github:h.github}),/installed runtime/)
})

test('TEST ONLY per-report bundles bind main SHA separately from latest lineup, observed fonts and receipts',()=>{
 const f=partitionFixture(),p=isolatedComposition(f).buildFussballNativeComposition(f.proof),season=p.seasons[0]
 assert.ok(Array.isArray(season.sourceBundles),'explicit per-report source bundles required')
 assert.equal(season.sourceBundles.length,3)
 for(const b of season.sourceBundles){assert.match(b.sourceRawSha256,/^[a-f0-9]{64}$/);assert.match(b.latestLineupSha256,/^[a-f0-9]{64}$/);assert.match(b.receiptsSha256,/^[a-f0-9]{64}$/);assert.match(b.retainedBundleSha256,/^[a-f0-9]{64}$/);assert.equal(b.fontEvidenceComplete,b.missingObservedFonts.length===0)}
 const unavailable=season.unavailable[0];assert.equal(unavailable.starters,null)
 assert.equal(season.sourceBundles.find(b=>b.sourceMatchId===unavailable.fixture.id).sourceRawSha256,unavailable.sourceRawSha256)
})

for(const [name,mutate,expected]of[
 ['overlapping successful source report',f=>{const r=f.state.originals.stages.current.result;r.reports.push(r.reports[0])},/partition overlap/],
 ['missing played source report',f=>f.state.originals.stages.current.result.reports.splice(0,1),/missing played/],
 ['past unplayed source fixture',f=>{f.state.originals.stages.current.result.schedule.fixtures.at(-1).datum='2026-10-01'},/missing played/],
 ['extra otherwise valid reviewed exclusion',f=>{const r=structuredClone(f.catalog.seasons[0].reviews[0]);r.fixture.id='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';r.fixture.zapisnikId='de-fussball-'+r.fixture.id;r.fixture.url='https://www.fussball.de/spiel/-/spiel/'+r.fixture.id;f.catalog.seasons[0].reviews.push(r)},/extra reviewed exclusion/],
 ['empty archive schedule',f=>{f.state.originals.stages.archive.result.schedule.fixtures=[]},/full bounded contiguous/],
])test(`TEST ONLY independently repinned source still rejects ${name}`,()=>{
 const f=partitionFixture();mutate(f);f.repin();assert.throws(()=>isolatedComposition(f).buildFussballNativeComposition(f.proof),expected)
})

test('TEST ONLY unavailable descriptor binds the exact reviewed tuple, defect, approval and separate bundle hash',()=>{
 const f=partitionFixture(),pack=isolatedComposition(f).buildFussballNativeComposition(f.proof)
 for(const r of pack.seasons.flatMap(s=>s.unavailable)){
  assert.equal(r.approvalReference,'call_e8c944e47b7c42a38afa4f08fda48c23')
  assert.equal(r.sourceMatchId,r.fixture.id);assert.equal(r.reportId,r.fixture.zapisnikId)
  assert.equal(r.resultKnown,r.officialResultKnown);assert.equal(r.defect.kind,r.statisticsReason)
 }
 const wrong=partitionFixture();wrong.catalog.seasons[0].reviews[0].approvalReference='unreviewed';assert.throws(()=>isolatedComposition(wrong).buildFussballNativeComposition(wrong.proof),/approval|closed/)
})

test('TEST ONLY malformed finalized review is a typed HOLD rather than a malformed-input crash',()=>{
 for(const change of [e=>{e.documents=undefined},e=>{e.fixture=undefined}]){
  const f=partitionFixture();change(f.catalog.seasons[0].reviews[0])
  assert.throws(()=>isolatedComposition(f).validateFussballNativeCatalog(f.catalog),e=>e.dataHold===true&&e.code==='FUSSBALL_NATIVE_COMPOSITION_HOLD')
 }
})
