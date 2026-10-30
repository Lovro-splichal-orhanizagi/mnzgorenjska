import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdtempSync,writeFileSync,symlinkSync,rmSync,realpathSync,readFileSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {isolatedNativeG9Tree,nativeG9Documents} from './fcf-g9-native800-test-fixture.mjs'
import {createFcfG9Native800OfflineProvider} from './fcf-g9-native800-child-offline.mjs'

function isolatedGuardTree(t){
 const root=isolatedNativeG9Tree(t),path=join(root,'scripts/fcf-g9-native800-child-offline.mjs'),source=readFileSync(path,'utf8'),start=source.indexOf('async function authenticatedProvider(e,env){'),end=source.indexOf('\n}\n\nexport async function installFcfG9Native800ChildOffline()',start)
 assert.ok(start>=0&&end>start,'known production authentication function boundary')
 // TEST ONLY: preserve the real owner-file/identity/argv/DB/network guards;
 // replace only terminal authentication with a separately validated fixture proof.
 writeFileSync(path,source.slice(0,start)+'async function authenticatedProvider(){return globalThis.__TEST_PROVIDER}'+source.slice(end+2))
 return root
}

test('TEST ONLY synthetic captured G9 source creates a closed offline child provider',t=>{
 const root=isolatedNativeG9Tree(t)
 const result=JSON.parse(execFileSync(process.execPath,['scripts/fcf-g9-native800-fixture-runner.mjs'],{cwd:root,input:JSON.stringify({variant:'good',probeOffline:true,documents:nativeG9Documents()}),encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024}).trim())
 assert.equal(result.ok,true);assert.equal(result.offlineProviderAccepted,true);assert.equal(result.offlineDocuments,240);assert.equal(result.actualHistoryAuthority,false)
})

test('child provider refuses detached original rollout source binding',t=>{
 const root=isolatedNativeG9Tree(t)
 const result=JSON.parse(execFileSync(process.execPath,['scripts/fcf-g9-native800-fixture-runner.mjs'],{cwd:root,input:JSON.stringify({variant:'good',probeOffline:'detached',documents:nativeG9Documents()}),encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024}).trim())
 assert.equal(result.offlineProviderAccepted,false)
 assert.match(result.offlineProviderError,/source binding/)
})

test('child provider rechecks actual freshness before serving a captured source request',t=>{
 const root=isolatedNativeG9Tree(t)
 const result=JSON.parse(execFileSync(process.execPath,['scripts/fcf-g9-native800-fixture-runner.mjs'],{cwd:root,input:JSON.stringify({variant:'good',probeOffline:'expired',documents:nativeG9Documents()}),encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024}).trim())
 assert.equal(result.offlineProviderAccepted,false)
 assert.match(result.offlineProviderError,/provider freshness expired|current ledger clock differs/)
 assert.equal(result.actualHistoryAuthority,false)
})

test('preload requires a private exact-hash regular file before any GitHub authentication',t=>{
 const dir=mkdtempSync(join(tmpdir(),'g9-child-envelope-SYNTHETIC-'));t.after(()=>rmSync(dir,{recursive:true,force:true}))
 const file=join(dir,'input.json'),link=join(dir,'linked.json'),bytes=Buffer.from(JSON.stringify({schemaVersion:1,kind:'fcf-g9-native800-offline-child',captureLocator:{},nativeExecutionCommit:'b'.repeat(40),originalRolloutText:'{}',originalRolloutSha256:'c'.repeat(64)})),digest=createHash('sha256').update(bytes).digest('hex')
 writeFileSync(file,bytes,{mode:0o600});symlinkSync(file,link)
 const canonical=realpathSync(file),run=(path,hash)=>{try{execFileSync(process.execPath,['--import',resolve('scripts/fcf-g9-native800-preload.mjs'),'scripts/ugani-pozicije.mjs','--tekmovanje','es-ct-tercera-g9','--pisi'],{cwd:process.cwd(),env:{...process.env,FCF_G9_NATIVE800_OFFLINE_FILE:path,FCF_G9_NATIVE800_OFFLINE_SHA256:hash,GITHUB_SHA:'b'.repeat(40),GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_REF:'refs/heads/main',GITHUB_WORKFLOW_REF:'Lovro-splichal-orhanizagi/mnzgorenjska/.github/workflows/fcf-native800.yml@refs/heads/main',GITHUB_JOB:'native800-price',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'234',GITHUB_ACTOR:'nejcar20',GITHUB_ACTOR_ID:'25134229',GITHUB_TRIGGERING_ACTOR:'nejcar20',GITHUB_TRIGGERING_ACTOR_ID:'25134229',GH_TOKEN:''},encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:10000});assert.fail('preload unexpectedly accepted test file')}catch(error){return String(error.stderr??error.message)}}
 assert.match(run(canonical,digest),/workflow GitHub token required/)
 assert.match(run(canonical,'d'.repeat(64)),/owner-only canonical parent evidence/)
 assert.match(run(link,digest),/owner-only canonical parent evidence/)
})

for(const [mode,accepted]of [['guardPosition',true],['guardPrice',true],['guardBadArgv',false],['guardBadIdentity',false]])test(`TEST ONLY installed child guard ${mode}`,t=>{
 const root=isolatedGuardTree(t),result=JSON.parse(execFileSync(process.execPath,['scripts/fcf-g9-native800-fixture-runner.mjs'],{cwd:root,input:JSON.stringify({variant:'good',probeOffline:mode,documents:nativeG9Documents()}),encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024}).trim())
 assert.equal(result.ok,true,result.message);assert.equal(result.offlineProviderAccepted,true)
 if(accepted){assert.equal(result.guardAccepted,true);assert.equal(result.guardNetworkCalls,2)}else{assert.equal(result.guardRefused,true);assert.match(result.guardError,mode==='guardBadArgv'?/only exact G9 position-write CLI invocation/:/exact root-dispatched G9 native800 price workflow/)}
 assert.equal(result.actualHistoryAuthority,false);assert.equal(result.actualProviderRequests,0)
})
