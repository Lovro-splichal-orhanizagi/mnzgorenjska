import test from 'node:test'
import assert from 'node:assert/strict'
import {writeFcfMissingInventoryCliDiagnostic} from './fcf-missing-inventory-actions.mjs'

test('CLI diagnostics classify known static errors and never print unknown exception data',()=>{
 const output=[]
 writeFcfMissingInventoryCliDiagnostic({stage:'approval-stage',error:Object.assign(new Error('private-token-value'),{stderr:Buffer.from('authorization: secret') ,cause:new Error('stack-secret')}),write:text=>output.push(text)})
 assert.deepEqual(output,['FCF_INVENTORY: approval staging failed closed (unknown).\n'])
 assert.equal(output.join('').includes('secret'),false)
 output.length=0
 writeFcfMissingInventoryCliDiagnostic({stage:'approval-stage',error:new Error('FCF_INVENTORY: actual current approval staging step required'),write:text=>output.push(text)})
 assert.deepEqual(output,['FCF_INVENTORY: approval staging failed closed (step-metadata).\n'])
})
