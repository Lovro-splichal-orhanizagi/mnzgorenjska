import test from 'node:test'
import assert from 'node:assert/strict'
import { preveriZagon } from './preveri-zagona-nemcije.mjs'
const commit='a'.repeat(40)
const run={id:12345,path:'.github/workflows/preveri-nova-vira.yml',head_sha:commit,event:'workflow_dispatch',status:'completed',conclusion:'success',repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'}}
test('only a completed successful official source audit on the reviewed commit qualifies',()=>assert.doesNotThrow(()=>preveriZagon(run,'12345',commit)))
test('failed, unfinished, foreign, wrong-workflow or wrong-commit runs cannot establish provenance',()=>{
 for(const patch of [{id:42},{path:'.github/workflows/ci.yml'},{head_sha:'b'.repeat(40)},{event:'pull_request'},{status:'in_progress'},{conclusion:'failure'},{repository:{full_name:'other/repo'}}]){
  assert.throws(()=>preveriZagon({...run,...patch},'12345',commit),/izvor/)
 }
})
