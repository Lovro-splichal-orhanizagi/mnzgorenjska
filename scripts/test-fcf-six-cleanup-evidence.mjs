import test from 'node:test'
import assert from 'node:assert/strict'
import {readFcfSixCleanupEvidence,isVerifiedFcfSixCleanupEvidence,readFcfSixCleanupOriginals} from './fcf-six-cleanup-evidence.mjs'
import {unpackVerifiedArchive} from './dfb-artifacts.mjs'
import {zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
test('six cleanup capability cannot be asserted or borrowed from oldfour',()=>{assert.equal(isVerifiedFcfSixCleanupEvidence({phase:'applied',verified:true}),false);assert.throws(()=>readFcfSixCleanupEvidence({}),/FCF_TARGET_EVIDENCE/);assert.throws(()=>readFcfSixCleanupOriginals({legacy:{},historyProof:{priorSourceGETs:22}}),/FCF_INVENTORY/)})
test('six prepared ZIP namespace accepts exact six IDs while old namespace remains four-only',()=>{const bytes=zip([{name:'acta-4109404.html',body:Buffer.from('synthetic envelope control')}]),digest='sha256:'+sha(bytes);assert.throws(()=>unpackVerifiedArchive(bytes,digest,'fcf-cleanup-prepared'),/entry/);assert.equal(unpackVerifiedArchive(bytes,digest,'fcf-six-cleanup-prepared').size,1);const foreign=zip([{name:'acta-4118355.html',body:Buffer.from('synthetic foreign control')}]);assert.throws(()=>unpackVerifiedArchive(foreign,'sha256:'+sha(foreign),'fcf-six-cleanup-prepared'),/entry/)})
