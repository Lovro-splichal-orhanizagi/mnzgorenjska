// TEST ONLY: source-free synthetic G9 cut3 readiness DATA; no current authority.
import test from 'node:test'
import assert from 'node:assert/strict'
import {buildFcfG9Native800Readiness} from './fcf-g9-native800-readiness.mjs'

test('G9 native800 readiness rejects copied source DATA instead of a reader-issued proof',()=>{
 assert.throws(()=>buildFcfG9Native800Readiness({sourceProof:{kind:'TEST ONLY copied source'},originalRolloutText:'{}',originalRolloutSha256:'a'.repeat(64),importReceipt:{},nativePreparation:{},pricingReplay:{}}),/reader-issued private native800 source proof required/)
})
