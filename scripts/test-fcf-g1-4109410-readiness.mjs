// Exact approved policy and DATA-only readiness boundaries. No network/DB.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {getFcfG1Approved4109410Policy,verifyFcfG1Approved4109410Observation} from './fcf-g1-4109410-policy.mjs'
import {describeFcfG1QuarantineNativeData,readFcfG1QuarantineNativeReadiness,getFcfG1QuarantineNativeReadiness} from './fcf-g1-quarantine-native-readiness.mjs'
import {getFcfG1FinalizedRemainderData} from './fcf-g1-remainder-source.mjs'
import {getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
const fixture=process.env.FCF_G1_4109410_BODY
const load=()=>readFileSync(fixture,'utf8')
test('new exact policy binds actual official sides and leaves six/a914 separate',()=>{const p=getFcfG1Approved4109410Policy();assert.equal(p.fixture.sourceMatchId,'4109410');assert.equal(p.fixture.homeSourceClubId,'5056');assert.equal(p.fixture.homeSourceCategoryId,'33220');assert.equal(p.fixture.awaySourceClubId,'5227');assert.equal(p.fixture.awaySourceCategoryId,'34936');assert.equal(p.goalEventCount,0);assert.equal(p.fixture.observedHomeScore,null);assert.equal(p.fixture.observedAwayScore,null);assert.equal(p.approvedOriginalSha256,'7c2335342065b7e0a77b54be97fe544c3549e165bd504ef1197a2d377fbe4b28');assert.throws(()=>{p.fixture.sourceMatchId='4109420'})})
test('actual approved retained9410 exactNULL+empty individuals verifies',{skip:!fixture},()=>{const html=load(),p=getFcfG1Approved4109410Policy();assert.equal(createHash('sha256').update(html).digest('hex'),p.approvedOriginalSha256);const o=verifyFcfG1Approved4109410Observation({targetSlug:p.competitionSlug,id:'4109410',html});assert.equal(o.header.homeGoals,null);assert.equal(o.header.awayGoals,null);assert.equal(o.fixture.sourceCompetitionId,null);assert.equal(o.approvedOriginalSha256,p.approvedOriginalSha256)})
test('actual9410 side/date/round/source-ID/score mutations reject;9420/25 never approved',{skip:!fixture},()=>{
 const html=load(),verify=html=>verifyFcfG1Approved4109410Observation({targetSlug:'es-ct-segona-g1',id:'4109410',html})
 for(const id of ['4109420','4109425'])assert.throws(()=>verifyFcfG1Approved4109410Observation({targetSlug:'es-ct-segona-g1',id,html}))
 const encoded=s=>JSON.stringify(s).slice(1,-1)
 for(const [from,to]of [['5056','5057'],['33220','33221'],['5227','5228'],['34936','34937'],['04.10.2026','05.10.2026'],['17.00','18.00'],['4109410','4109411'],[encoded('"children":"-"'),encoded('"children":"0"')],[encoded('"Jornada ","3"'),encoded('"Jornada ","4"')]]){
  const changed=html.replaceAll(from,to);assert.ok(changed!==html,'fixture token absent: '+from);assert.throws(()=>verify(changed))
 }
})
test('copied or flag-authored raw/readiness/final capabilities never issue native authority',()=>{for(const proof of [{},{kind:'fcf-g1-remainder-raw-proof'},{kind:'fcf-g1-native-readiness-proof',nativeAdmission:true}]){assert.throws(()=>getFcfG1FinalizedRemainderData(proof));assert.throws(()=>readFcfG1QuarantineNativeReadiness({rawProof:proof}));assert.throws(()=>getFcfG1QuarantineNativeReadiness(proof));assert.throws(()=>getFcfFutureCapturedTargetData({targetEvidence:proof}))}assert.throws(()=>readFcfG1QuarantineNativeReadiness({rawProof:{},now:0}),/fields/);assert.throws(()=>describeFcfG1QuarantineNativeData({documents:[],now:0}),/fields/);assert.throws(()=>describeFcfG1QuarantineNativeData({documents:[]}),/240/)} )
test('genuine finalized301 private source becomes only heldreadiness, preserves ancestry/expiry and oldnative refusal',{skip:!process.env.FCF_G1_NATIVE_READINESS_TERMINAL},async t=>{
 const {retainedG1NativeReadinessFixture}=await import('./fcf-g1-native-readiness-test-fixture.mjs'),f=await retainedG1NativeReadinessFixture()
 assert.throws(()=>getFcfG1FinalizedRemainderData(f.appendProofs[0]),/complete240/)
 const original=getFcfG1FinalizedRemainderData(f.rawProof);assert.equal(original.manifest.actualSourceGETs,301);assert.equal(original.ancestry.cleanupIssuerSourceCommit,'da8516a66084926ebddd3f065fc90d85c2bdf9b9');assert.equal(original.ancestry.failedG1SourceCommit,'ec3405898b628f9e88b7a2908f5f21881ceb836f')
 const proof=readFcfG1QuarantineNativeReadiness({rawProof:f.rawProof}),data=getFcfG1QuarantineNativeReadiness(proof);assert.deepEqual(data.classificationCounts,{available:43,pending:191,unavailable_historical:4,unresolved:2});assert.deepEqual(data.unresolvedReportIds,['4109420','4109425']);assert.equal(data.verifiedKeeperClubs.length,16);assert.equal(data.sourceFreshUntil,'2026-10-29T18:09:27.203Z');assert.equal(data.nativeAdmission,false);assert.equal(data.sourceBinding.actualSourceGETs,301)
 const approved=data.fixtures.find(f=>f.id==='es4109410');assert.equal(approved.homeGoals,null);assert.equal(approved.awayGoals,null);assert.equal(approved.report,null);assert.equal(approved.appearances,null);assert.equal(approved.source.supplementalObservation.fixture.homeSourceClubId,'5056')
 assert.throws(()=>getFcfG1QuarantineNativeReadiness(structuredClone(proof)));assert.throws(()=>getFcfFutureCapturedTargetData({targetEvidence:proof}));data.fixtures[0].source.receipt.sequence=0;assert.notEqual(getFcfG1QuarantineNativeReadiness(proof).fixtures[0].source.receipt.sequence,0)
 await t.test('original source expiry+1 remains a hard privategetter refusal',t=>{t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-29T18:09:27.204Z')});try{assert.throws(()=>getFcfG1QuarantineNativeReadiness(proof),/expired|freshness/)}finally{t.mock.timers.reset()}})
 console.log(JSON.stringify({genuineOfflineGETs:f.offlineGETs,network:0,actualSourceGETs:301,counts:data.classificationCounts,sourceGKClubs:data.verifiedKeeperClubs.length,providerStaleIds:data.providerStaleDocuments.map(x=>x.id)}))
 if(process.env.FCF_G1_NATIVE_READINESS_RESULT){const {writeFileSync}=await import('node:fs');writeFileSync(process.env.FCF_G1_NATIVE_READINESS_RESULT,JSON.stringify(getFcfG1QuarantineNativeReadiness(proof),null,2)+'\n',{flag:'wx',mode:0o600})}
})
