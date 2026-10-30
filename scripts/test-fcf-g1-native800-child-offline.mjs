// TEST ONLY: fixed G1 price-child authorization/argv; no network, SQL or source IO.
import test from 'node:test'
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {mkdtempSync,rmSync,chmodSync,realpathSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {validateFcfG1Native800ChildInvocation} from './fcf-g1-native800-child-offline.mjs'

const commit='a'.repeat(40),base={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_REF:'refs/heads/main',GITHUB_WORKFLOW_REF:'Lovro-splichal-orhanizagi/mnzgorenjska/.github/workflows/fcf-g1-native800.yml@refs/heads/main',GITHUB_JOB:'native800-price',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123',GITHUB_SHA:commit,GITHUB_ACTOR:'nejcar20',GITHUB_ACTOR_ID:'25134229'}
const scripts=resolve('scripts'),writeScript=resolve(scripts,'ugani-pozicije.mjs'),priceScript=resolve(scripts,'ovrednoti-igralce.mjs')
test('G1 stock position CLI requires exact root price job and exact G1 argv',()=>{
 assert.equal(validateFcfG1Native800ChildInvocation({env:base,nativeExecutionCommit:commit,script:writeScript,args:['--tekmovanje','es-ct-segona-g1','--pisi']}),true)
 for(const [key,value]of Object.entries({GITHUB_ACTIONS:'false',GITHUB_REPOSITORY:'other/repo',GITHUB_REF:'refs/heads/feature',GITHUB_WORKFLOW_REF:'wrong',GITHUB_JOB:'native800-import',GITHUB_EVENT_NAME:'push',GITHUB_RUN_ATTEMPT:'2',GITHUB_RUN_ID:'0',GITHUB_SHA:'b'.repeat(40),GITHUB_ACTOR:'someone',GITHUB_ACTOR_ID:'7'}))assert.throws(()=>validateFcfG1Native800ChildInvocation({env:{...base,[key]:value},nativeExecutionCommit:commit,script:writeScript,args:['--tekmovanje','es-ct-segona-g1','--pisi']}),/FCF_G1_NATIVE800_CHILD/)
 assert.throws(()=>validateFcfG1Native800ChildInvocation({env:{...base,GITHUB_TRIGGERING_ACTOR:'someone',GITHUB_TRIGGERING_ACTOR_ID:'7'},nativeExecutionCommit:commit,script:writeScript,args:['--tekmovanje','es-ct-segona-g1','--pisi']}),/triggered/)
 for(const args of [['--tekmovanje','es-ct-tercera-g9','--pisi'],['--tekmovanje','es-ct-segona-g1','--pisi','--dry-run']])assert.throws(()=>validateFcfG1Native800ChildInvocation({env:base,nativeExecutionCommit:commit,script:writeScript,args}),/position-write/)
 assert.throws(()=>validateFcfG1Native800ChildInvocation({env:base,nativeExecutionCommit:commit,script:resolve(scripts,'other.mjs'),args:[]}),/entrypoints/)
})
test('G1 season pricing accepts only exact G1 stock argv and a same-owner bounded replay path',()=>{
 assert.equal(validateFcfG1Native800ChildInvocation({env:base,nativeExecutionCommit:commit,script:priceScript,args:['--tekmovanje','es-ct-segona-g1','--sezona','2026/27','--pisi']}),true)
 const created=mkdtempSync(resolve(tmpdir(),'g1-child-'));chmodSync(created,0o700);const directory=realpathSync(created),privateFile=resolve(directory,'evidence.json'),replay=resolve(directory,'g1-native800-price-replay.json'),env={...base,FCF_G1_NATIVE800_OFFLINE_FILE:privateFile}
 try{
  assert.equal(validateFcfG1Native800ChildInvocation({env,nativeExecutionCommit:commit,script:priceScript,args:['--tekmovanje','es-ct-segona-g1','--sezona','2026/27','--release-plan',replay]}),true)
  for(const args of [['--tekmovanje','es-ct-tercera-g9','--sezona','2026/27','--pisi'],['--tekmovanje','es-ct-segona-g1','--sezona','2025/26','--pisi'],['--tekmovanje','es-ct-segona-g1','--sezona','2026/27','--release-plan',resolve('/tmp/foreign.json')]])assert.throws(()=>validateFcfG1Native800ChildInvocation({env,nativeExecutionCommit:commit,script:priceScript,args}),/exact G1|G1 season replay/)
 }finally{rmSync(directory,{recursive:true,force:true})}
})
