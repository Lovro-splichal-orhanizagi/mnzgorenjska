// The current reviewed parser must refuse every authority of the one-time Baden
// native chain that pins scripts/viri/fussball.mjs at main 80406b24
// (sha256 816617fb…). The chain's own happy-path tests run only in the explicit
// TEST ONLY historical-bytes context (#582/V6 pattern); this file proves the
// real current bytes never inherit that authority and that the context
// reproduces exactly the pinned fingerprints, not new ones.
import {PINNED_FUSSBALL_SHA256,PINNED_CAPTURE_CODE_SHA256,usePinnedFussballBytes,withCurrentFussballBytes,currentFussballSha256} from './lib/test-only-pinned-fussball.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fussballCaptureCodeSha256} from './fussball-capture-evidence.mjs'
import {fussballFreshPairCodeSha256} from './fussball-fresh-pair.mjs'
import {fussballCompletedV7RuntimeInventory} from './fussball-completed-source-v7.mjs'
import {readFussballBadenCompletedStages,fussballBadenCompletedStagesDescriptor} from './fussball-baden-completed-stages.mjs'
import {readFussballBadenFreshPair} from './fussball-baden-fresh-pair.mjs'
import {validateFussballNativeCatalog} from './fussball-native-composition.mjs'
const freshPairCode='f9eeb9ecff417b24a599038ee1d0aa9f4c8fd09f8b47cdd71a6c79fb9e823dca'
const catalog=JSON.parse(readFileSync(new URL('./policies/fussball-baden-native-composition.json',import.meta.url)))
const pins=JSON.parse(readFileSync(new URL('./fussball-baden-completed-stages.json',import.meta.url)))
const history=JSON.parse(readFileSync(new URL('./fussball-fresh-pair-history.json',import.meta.url)))

test('historical pin records are unchanged and still name the old parser bytes',()=>{
 assert.equal(history.sourceFiles['scripts/viri/fussball.mjs'],PINNED_FUSSBALL_SHA256)
 for(const stage of ['current','archive'])assert.equal(pins.runtime[stage]['scripts/viri/fussball.mjs'],PINNED_FUSSBALL_SHA256)
 assert.equal(catalog.captureCodeSha256,freshPairCode)
})

test('current parser bytes differ from the pinned bytes and change every pinned fingerprint',async()=>{
 assert.notEqual(await currentFussballSha256(),PINNED_FUSSBALL_SHA256)
 await withCurrentFussballBytes(()=>{
  assert.notEqual(fussballCaptureCodeSha256(),PINNED_CAPTURE_CODE_SHA256)
  assert.notEqual(fussballFreshPairCodeSha256(),freshPairCode)
 })
})

test('current parser refuses old V7, fresh-pair, completed-stage and native catalog authority before any source GET',async t=>{
 // Same fixed clock as test-fussball-baden-completed-stages: inside the original
 // freshness window, so only the code fingerprint can cause the refusal.
 const expiry=Date.parse('2026-10-30T10:43:41.514Z');t.mock.method(Date,'now',()=>expiry-1)
 assert.equal(fussballBadenCompletedStagesDescriptor().current.run.id,pins.current.run.id)
 await withCurrentFussballBytes(async()=>{
  assert.throws(()=>fussballCompletedV7RuntimeInventory(),/reviewed V7 capture closure changed/)
  assert.throws(()=>validateFussballNativeCatalog(structuredClone(catalog)),/exact Baden catalog\/source scope required/)
  let calls=0
  await assert.rejects(readFussballBadenFreshPair({sourceRunId:'40859714195',sourceHead:'f3669300087c5f8df926a599d86f03b1269215c5',github:()=>{calls++}}),/reviewed fresh-pair producer closure changed/)
  await assert.rejects(readFussballBadenCompletedStages({sourceRunId:String(pins.current.run.id),sourceHead:pins.current.run.head_sha,github:()=>{calls++}}),e=>/LOCAL_SOURCE_CODE/.test(e.code??e.message))
  assert.equal(calls,0)
 })
})

test('TEST ONLY context reproduces exactly the pinned fingerprints (no new authority)',()=>{
 usePinnedFussballBytes()
 assert.equal(fussballCaptureCodeSha256(),PINNED_CAPTURE_CODE_SHA256)
 assert.equal(fussballFreshPairCodeSha256(),freshPairCode)
 assert.doesNotThrow(()=>fussballCompletedV7RuntimeInventory())
})
