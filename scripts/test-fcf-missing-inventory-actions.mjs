import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,rmSync,readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {runInNewContext} from 'node:vm'
import {rulesetSnapshot,rulesetSnapshotSha256,seedFixture,commit,now,manualPlan,sha,metadata,zip,repository,workflow,claimFixture} from './fcf-missing-inventory-test-fixture.mjs'
import {buildFcfMissingInventoryPlan} from './fcf-missing-inventory-plan.mjs'
const api=await import('./fcf-missing-inventory-actions.mjs').catch(()=>({})),planApi=await import('./fcf-missing-inventory-plan.mjs')
const call=(name,args)=>{assert.equal(typeof api[name],'function',`${name} required`);return api[name](args)}
const retained=process.env.FCF_HISTORICAL_RETAINED_DIR
test('draft staging resolves its unique release from the authenticated paginated list, not the published-tag endpoint',async()=>{
 const bytes=Buffer.from('root-reviewed seed'),calls=[],github=async(path,binary)=>{
  calls.push(path)
  if(path.endsWith('/releases?per_page=100&page=1'))return Array.from({length:100},(_,i)=>({id:100+i,tag_name:`other-${i}`,draft:false}))
  if(path.endsWith('/releases?per_page=100&page=2'))return[{id:11,tag_name:'fcf-inventory-staging-v1',draft:true}]
  if(path.includes('/releases/11/assets?'))return[{id:22,state:'uploaded',size:bytes.length}]
  if(path.endsWith('/releases/assets/22')){assert.equal(binary,true);return bytes}
  throw Error('unplanned API path '+path)
 }
 assert.deepEqual(await call('readFcfDraftAsset',{id:'22',digest:'sha256:'+sha(bytes),github}),bytes)
 assert.ok(!calls.some(p=>p.includes('/releases/tags/')))
})
test('draft staging refuses missing, published, duplicate and unbounded release listings',async()=>{
 const draft={id:11,tag_name:'fcf-inventory-staging-v1',draft:true}
 for(const rows of[[],[{...draft,draft:false}],[draft,{...draft,id:12}],null,Array.from({length:101},()=>draft)]){
  let downloads=0
  await assert.rejects(()=>call('readFcfDraftAsset',{id:'22',digest:'sha256:'+'a'.repeat(64),github:async path=>{if(path.includes('/assets'))downloads++;return rows}}),/FCF_INVENTORY/)
  assert.equal(downloads,0)
 }
 let pages=0
 await assert.rejects(()=>call('readFcfDraftAsset',{id:'22',digest:'sha256:'+'a'.repeat(64),github:async()=>{pages++;return Array.from({length:100},(_,i)=>({id:100+i,tag_name:`other-${i}`,draft:false}))}}),/FCF_INVENTORY/)
 assert.equal(pages,10)
})
const approval=()=>{const plan=manualPlan(),b=plan.seedBinding;return{schemaVersion:1,kind:'fcf-missing-inventory-approval',sourceCommit:commit,plan,seedExpected:{runId:b.runId,runAttempt:b.runAttempt,sourceCommit:b.retentionCommit,jobId:b.jobId,artifactId:b.artifactId,artifactDigest:b.artifactDigest,manifestSha256:b.manifestSha256,originalManifestSha256:b.originalManifestSha256,policyHashes:plan.policyHashes,name:`fcf-inventory-seed-${b.runId}-${b.runAttempt}`},rulesetId:'12',rulesetSnapshot:structuredClone(rulesetSnapshot)}}
test('prepare-approval binds actual owner snapshot hash into authenticated genuine-seed source plan',{skip:!retained},async t=>{
 const root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-plan-protection-')));t.after(()=>rmSync(root,{recursive:true,force:true}));const f=seedFixture(retained),out=join(root,'approval.json'),calls=[],owner=claimFixture().rulesets[0]
 const github=async(path,binary)=>{calls.push(path);if(path===`repos/${repository}/rulesets/12`)return owner;if(path.endsWith('/zip')){assert.equal(binary,true);return f.zipBytes}if(path.includes('/actions/artifacts/'))return f.artifact;if(path.includes('/jobs?'))return{total_count:f.jobs.length,jobs:f.jobs};if(path===`repos/${repository}/actions/runs/123`)return f.run;assert.fail('unexpected owner preparation GET '+path)}
 await call('runFcfMissingInventoryActions',{argv:['prepare-approval','--seed-run-id','123','--seed-attempt','1','--seed-artifact-id',f.expected.artifactId,'--seed-digest',f.expected.artifactDigest,'--seed-commit',commit,'--seed-manifest-sha',f.expected.manifestSha256,'--original-manifest-sha',f.expected.originalManifestSha256,'--source-commit',commit,'--ruleset-id','12','--output',out],root,github,clock:()=>now,sourceFetch:()=>assert.fail('preparation cannot read source')})
 const a=JSON.parse(readFileSync(out)),{historicalStatisticsPolicySha256:hash}=await import('./lib/historical-statistics-policy.mjs')
 assert.equal(a.plan.rulesetSnapshotSha256,hash(a.rulesetSnapshot));assert.equal(a.rulesetSnapshot.checkedUTC,new Date(now).toISOString());assert.deepEqual(a.rulesetSnapshot.ruleset.bypass_actors,[]);assert.ok(calls.includes(`repos/${repository}/rulesets/12`));assert.equal(call('readFcfInventoryApproval',{bytes:readFileSync(out),sourceCommit:commit,now}).plan.planSha256,a.plan.planSha256)
})
test('root claim template fetches owner-visible protection and central reader replays fresh redacted GET',async t=>{
 const root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-claim-template-')));t.after(()=>rmSync(root,{recursive:true,force:true}));const input=join(root,'approval.json'),out=join(root,'claim.json');writeFileSync(input,JSON.stringify(approval()))
 const f=claimFixture(),full={...f.rulesets[0],name:'actual additional GitHub metadata'},calls=[],github=async(path)=>{calls.push(path);if(path===`repos/${repository}/actions/runs/123`)return{id:123,path:workflow,event:'workflow_dispatch',head_sha:commit,head_branch:'main',run_attempt:1,status:'in_progress'};if(path===`repos/${repository}/rulesets/12`)return full;assert.fail('unexpected root GET '+path)}
 const r=await call('runFcfMissingInventoryActions',{argv:['claim-template','--approval',input,'--run-id','123','--output',out],root,github,clock:()=>now,sourceFetch:()=>assert.fail('claim template cannot read source')})
 const claim=JSON.parse(readFileSync(out));assert.equal(claim.schemaVersion,2);assert.deepEqual(claim.rulesetSnapshot.ruleset.bypass_actors,[]);assert.equal(Object.hasOwn(claim.rulesetSnapshot.ruleset,'name'),false);assert.equal(r.result.claimJsonSha256,sha(readFileSync(out)))
 f.claimBytes=readFileSync(out);const blobSha=createHash('sha1').update(`blob ${f.claimBytes.length}\0`).update(f.claimBytes).digest('hex');f.claimCommit.tree.tree[0].sha=blobSha;Object.assign(f.claimCommit.blob,{sha:blobSha,size:f.claimBytes.length,content:f.claimBytes.toString('base64')});f.expected.claimJsonSha256=sha(f.claimBytes)
 const fresh={...full};delete fresh.bypass_actors;f.rulesets=[fresh];const{readFcfInventoryExecutionClaim}=await import('./fcf-missing-inventory-claim.mjs');assert.equal(readFcfInventoryExecutionClaim(f).runId,'123')
 assert.deepEqual(calls,[`repos/${repository}/actions/runs/123`,`repos/${repository}/rulesets/12`])
 delete full.bypass_actors;await assert.rejects(()=>call('runFcfMissingInventoryActions',{argv:['claim-template','--approval',input,'--run-id','123','--output',join(root,'refused.json')],root,github,clock:()=>now}),/actual owner-visible/)
})
function approvalArtifact(){
 const manifestBytes=Buffer.from(JSON.stringify(approval(),null,2)+'\n'),bytes=zip([{name:'manifest.json',body:manifestBytes}]),f=metadata({bytes,name:'fcf-inventory-approval-123-1',jobName:'missing-inventory-approval',steps:['Stage reviewed FCF inventory approval','Retain reviewed FCF inventory approval'],run:'in_progress'})
 return {...f,manifestBytes,rootApprovalDigest:'sha256:'+sha(manifestBytes),expected:{...f.expected,manifestSha256:sha(manifestBytes)}}
}
test('approval artifact authenticates the actual same-run successful job and byte-exact root approval',()=>{
 const f=approvalArtifact(),a=call('readFcfInventoryApprovalArtifact',f)
 assert.equal(a.plan.planSha256,approval().plan.planSha256)
 assert.equal(a.plan.maximumSourceGETs,477)
})
test('approval artifact rejects foreign execution, unsuccessful stage, rewritten root bytes and extra ZIP members',()=>{
 for(const change of[
  f=>{f.expected.runAttempt='2'},f=>{f.run.id=124},f=>{f.run.head_sha='b'.repeat(40)},f=>{f.run.repository.full_name='foreign/repo'},
  f=>{f.jobs[0].name='missing-inventory-consume'},f=>{f.jobs.push({...f.jobs[0]})},f=>{f.jobs[0].status='in_progress'},f=>{f.jobs[0].conclusion='failure'},f=>{f.jobs[0].steps[0].name='Other stage'},f=>{f.jobs[0].steps[1].conclusion='skipped'},
  f=>{f.artifact.expired=true},f=>{f.artifact.name='fcf-inventory-approval-124-1'},f=>{f.expected.artifactId='790'},f=>{f.expected.manifestSha256='0'.repeat(64)},f=>{f.rootApprovalDigest='sha256:'+'0'.repeat(64)},f=>{f.zipBytes=Buffer.from(f.zipBytes);f.zipBytes[0]^=1},
  f=>{f.zipBytes=zip([{name:'manifest.json',body:f.manifestBytes},{name:'extra.json',text:'{}'}]);f.artifact.size_in_bytes=f.zipBytes.length;f.artifact.digest=f.expected.artifactDigest='sha256:'+sha(f.zipBytes)},
  f=>{const a=approval();a.rulesetId='13';f.manifestBytes=Buffer.from(JSON.stringify(a));f.zipBytes=zip([{name:'manifest.json',body:f.manifestBytes}]);f.artifact.size_in_bytes=f.zipBytes.length;f.artifact.digest=f.expected.artifactDigest='sha256:'+sha(f.zipBytes);f.expected.manifestSha256=sha(f.manifestBytes)},
 ]){const f=approvalArtifact();change(f);assert.throws(()=>call('readFcfInventoryApprovalArtifact',f),/FCF_INVENTORY/)}
})
test('source-free approval staging preserves reviewed JSON bytes and validates active exact main before claim polling',async t=>{
 const root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-approval-stage-')));t.after(()=>rmSync(root,{recursive:true,force:true}))
 const bytes=Buffer.from(JSON.stringify(approval(),null,2)+'\n'),calls=[],run={id:123,path:workflow,repository:{full_name:repository},event:'workflow_dispatch',head_branch:'main',head_sha:commit,run_attempt:1,status:'in_progress',conclusion:null},job={id:455,run_id:123,run_attempt:1,head_sha:commit,name:'missing-inventory-approval',status:'in_progress',conclusion:null,steps:[{name:'Stage reviewed FCF inventory approval',status:'in_progress',conclusion:null}]}
 const github=async(path,binary)=>{const q=path.replace(`repos/${repository}/`,'');calls.push(q);if(q==='actions/runs/123')return run;if(q.startsWith('actions/runs/123/attempts/1/jobs?'))return{total_count:1,jobs:[job]};if(q==='releases?per_page=100&page=1')return[{id:11,tag_name:'fcf-inventory-staging-v1',draft:true}];if(q.startsWith('releases/11/assets?'))return[{id:22,state:'uploaded',size:bytes.length}];if(q==='releases/assets/22'){assert.equal(binary,true);return bytes}throw Error('unplanned path '+q)}
 const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repository,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123',GITHUB_SHA:commit,GITHUB_JOB:'missing-inventory-approval',FCF_INVENTORY_PRESET:'g1-then-g9-missing-v1',FCF_INVENTORY_ASSET_ID:'22',FCF_INVENTORY_ASSET_SHA:'sha256:'+sha(bytes)},base={argv:['approval-stage'],env,root,github,clock:()=>now,sourceFetch:async()=>{assert.fail('approval staging cannot call source')}}
 assert.equal((await call('runFcfMissingInventoryActions',base)).code,0)
 assert.deepEqual(readFileSync(join(root,'fcf-inventory-approval/manifest.json')),bytes)
 assert.ok(!calls.some(q=>q.startsWith('git/')||q.startsWith('rulesets/')))
 for(const alter of[e=>{e.GITHUB_RUN_ATTEMPT='2'},e=>{e.GITHUB_JOB='missing-inventory-consume'},e=>{e.DATABASE_URL='present'}]){const invalid={...env};alter(invalid);calls.length=0;await assert.rejects(()=>call('runFcfMissingInventoryActions',{...base,env:invalid}),/FCF_INVENTORY/);assert.equal(calls.length,0)}
 run.head_sha='b'.repeat(40);calls.length=0;await assert.rejects(()=>call('runFcfMissingInventoryActions',base),/FCF_INVENTORY/);assert.ok(!calls.some(q=>q.startsWith('releases')))
})
test('read-only consume verifies approval artifact before polling claim and never reads private drafts',async()=>{
 const f=approvalArtifact(),calls=[],env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repository,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123',GITHUB_SHA:commit,GITHUB_JOB:'missing-inventory-consume',FCF_INVENTORY_PRESET:'g1-then-g9-missing-v1',FCF_INVENTORY_ASSET_SHA:f.rootApprovalDigest,FCF_APPROVAL_ID:f.expected.artifactId,FCF_APPROVAL_DIGEST:f.expected.artifactDigest,FCF_APPROVAL_MANIFEST_SHA:f.expected.manifestSha256}
 const github=async path=>{const q=path.replace(`repos/${repository}/`,'');calls.push(q);if(q==='actions/runs/123')return f.run;if(q.startsWith('actions/runs/123/attempts/1/jobs?'))return{total_count:f.jobs.length,jobs:f.jobs};if(q===`actions/artifacts/${f.expected.artifactId}`)return f.artifact;if(q===`actions/artifacts/${f.expected.artifactId}/zip`)return f.zipBytes;if(q.startsWith('git/ref/tags/'))throw Error('CLAIM_BOUNDARY_REACHED');throw Error('unexpected API path '+q)}
 await assert.rejects(()=>call('runFcfMissingInventoryActions',{argv:['consume'],env,github,clock:()=>now,sourceFetch:async()=>assert.fail('no source before claim')}),/CLAIM_BOUNDARY_REACHED/)
 assert.ok(!calls.some(q=>q.startsWith('releases')))
 calls.length=0;f.jobs[0].conclusion='failure';await assert.rejects(()=>call('runFcfMissingInventoryActions',{argv:['consume'],env,github,clock:()=>now}),/FCF_INVENTORY/);assert.ok(!calls.some(q=>q.startsWith('git/')))
})
test('non-Actions source command fails before any GitHub or native source request',async()=>{let calls=0;await assert.rejects(async()=>call('runFcfMissingInventoryActions',{argv:['capture'],env:{},root:'/private/tmp',github:async()=>calls++,sourceFetch:async()=>calls++}),/FCF_INVENTORY/);assert.equal(calls,0)})
test('approval closes fixed reviewed plan/main without accepting new URLs or budgets',()=>{const f=approval();assert.equal(call('readFcfInventoryApproval',{bytes:Buffer.from(JSON.stringify(f)),sourceCommit:commit,now}).plan.maximumSourceGETs,477);f.url='https://other.example';assert.throws(()=>call('readFcfInventoryApproval',{bytes:Buffer.from(JSON.stringify(f)),sourceCommit:commit,now}),/FCF_INVENTORY/);delete f.url;assert.throws(()=>call('readFcfInventoryApproval',{bytes:Buffer.from(JSON.stringify(f)),sourceCommit:'b'.repeat(40),now}),/FCF_INVENTORY/)})
test('draft asset transport uses only authenticated fixed repository API and independently pinned bytes',async()=>{const bytes=Buffer.from('approved JSON'),calls=[],github=async(path,binary)=>{calls.push(path);if(path.includes('/releases?'))return[{id:11,tag_name:'fcf-inventory-staging-v1',draft:true}];if(path.includes('/releases/11/assets'))return[{id:22,name:'approval-control.json',state:'uploaded',size:bytes.length}];if(path.endsWith('/releases/assets/22'))return binary?bytes:{id:22,name:'approval-control.json',state:'uploaded',size:bytes.length};throw Error('unplanned')};assert.deepEqual(await call('readFcfDraftAsset',{id:'22',digest:'sha256:'+sha(bytes),github,maximumBytes:8388608}),bytes);assert.ok(calls.every(p=>p.startsWith('repos/Lovro-splichal-orhanizagi/mnzgorenjska/')));await assert.rejects(async()=>call('readFcfDraftAsset',{id:'22',digest:'sha256:'+'0'.repeat(64),github,maximumBytes:8388608}),/FCF_INVENTORY/)})
test('staging validates genuine seed bytes without manufacturing authenticated Actions SeedEvidence',{skip:!retained},()=>{const f=seedFixture(retained);assert.equal(typeof planApi.validateFcfMissingInventorySeedBytes,'function');const staged=planApi.validateFcfMissingInventorySeedBytes({zipBytes:f.zipBytes,expected:f.expected,now});assert.equal(staged.kind,'fcf-missing-inventory-validated-seed-bytes');assert.throws(()=>buildFcfMissingInventoryPlan({rulesetSnapshotSha256,sourceCommit:commit,seedEvidence:staged,policyHashes:f.expected.policyHashes,now}),/FCF_INVENTORY/)})
test('local seed packing is source-free and preserves the original receipt manifest',{skip:!retained},async t=>{const root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-seed-pack-')));t.after(()=>rmSync(root,{recursive:true,force:true}));const output=join(root,'seed.zip'),result=await call('packFcfInventorySeed',{originalsDir:retained,retentionCommit:commit,output,now});assert.equal(result.digest,'sha256:'+sha(readFileSync(output)));assert.equal(result.originalManifestSha256,sha(readFileSync(join(retained,'manifest.json'))));await assert.rejects(async()=>call('packFcfInventorySeed',{originalsDir:retained,retentionCommit:commit,output,now}),/FCF_INVENTORY/)})

test('actual command chain consumes an authenticated claim then retains a single refused source body',{skip:!retained},async t=>{
 const {readFcfMissingInventorySeed}=planApi,{claimFixture,repository,workflow}=await import('./fcf-missing-inventory-test-fixture.mjs'),root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-actions-flow-')));t.after(()=>rmSync(root,{recursive:true,force:true}))
 const sf=seedFixture(retained);sf.run.id=124;sf.jobs[0].run_id=124;sf.artifact.workflow_run.id=124;sf.artifact.name=sf.expected.name='fcf-inventory-seed-124-1';sf.expected.runId='124'
 const proof=readFcfMissingInventorySeed(sf),plan=buildFcfMissingInventoryPlan({rulesetSnapshotSha256,sourceCommit:commit,seedEvidence:proof,policyHashes:sf.expected.policyHashes,now:Date.parse('2026-10-18T13:00:00Z')}),claim=claimFixture(plan),a={schemaVersion:1,kind:'fcf-missing-inventory-approval',sourceCommit:commit,plan,seedExpected:sf.expected,rulesetId:'12',rulesetSnapshot:structuredClone(rulesetSnapshot)},approvalBytes=Buffer.from(JSON.stringify(a)),approvalZip=zip([{name:'manifest.json',body:approvalBytes}]);let time=now,phase='consume',consumptionBytes,sourceCalls=0,claimReads=0,cancelAfterWait=false,coordinationObserved=false
 const run={id:123,path:workflow,repository:{full_name:repository},event:'workflow_dispatch',head_branch:'main',head_sha:commit,run_attempt:1,status:'in_progress',conclusion:null,run_started_at:'2026-10-18T13:59:00Z'},approvalJob={id:455,run_id:123,run_attempt:1,head_sha:commit,name:'missing-inventory-approval',status:'completed',conclusion:'success',steps:['Stage reviewed FCF inventory approval','Retain reviewed FCF inventory approval'].map(name=>({name,status:'completed',conclusion:'success'}))},consumeJob={id:456,run_id:123,run_attempt:1,head_sha:commit,name:'missing-inventory-consume',status:'in_progress',conclusion:null,steps:['Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption'].map(name=>({name,status:'completed',conclusion:'success'}))},captureJob={id:555,run_id:123,run_attempt:1,head_sha:commit,name:'missing-inventory-g1',status:'in_progress',conclusion:null,steps:[{name:'Capture missing target inventory',status:'in_progress',conclusion:null}]}
 const github=async(path,binary)=>{const q=path.replace(`repos/${repository}/`,'');if(q.startsWith('releases'))assert.fail('read-only jobs cannot read private drafts');if(q==='actions/artifacts/788')return{id:788,name:'fcf-inventory-approval-123-1',digest:'sha256:'+sha(approvalZip),expired:false,size_in_bytes:approvalZip.length,workflow_run:{id:123,head_sha:commit}};if(q==='actions/artifacts/788/zip')return approvalZip;if(q==='actions/runs/123')return cancelAfterWait&&coordinationObserved?{...run,status:'completed',conclusion:'cancelled'}:run;if(q==='actions/runs/124')return sf.run;if(q.startsWith('actions/runs/124/attempts/1/jobs?'))return{total_count:1,jobs:sf.jobs};if(q.startsWith('actions/runs/123/attempts/1/jobs?'))return{total_count:phase==='consume'?2:3,jobs:phase==='consume'?[approvalJob,consumeJob]:[approvalJob,consumeJob,captureJob]};if(q==='actions/artifacts/789')return sf.artifact;if(q==='actions/artifacts/789/zip')return sf.zipBytes;if(q.startsWith('git/ref/tags/')){claimReads++;return claim.ref}if(q.startsWith('git/commits/'))return claim.claimCommit.commit;if(q.startsWith('git/trees/'))return claim.claimCommit.tree;if(q.startsWith('git/blobs/'))return claim.claimCommit.blob;if(q==='rulesets/12')return claim.rulesets[0];if(q==='actions/artifacts/790')return{id:790,name:'fcf-inventory-consumption-123-1',digest:'sha256:'+sha(consumptionBytes),expired:false,size_in_bytes:consumptionBytes.length,workflow_run:{id:123,head_sha:commit}};if(q==='actions/artifacts/790/zip')return consumptionBytes;if(q.startsWith('actions/workflows/')){coordinationObserved=true;return{total_count:0,workflow_runs:[]}};throw Error('unplanned mock path '+q)}
 const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repository,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123',GITHUB_SHA:commit,GITHUB_JOB:'missing-inventory-consume',FCF_INVENTORY_PRESET:plan.preset,FCF_APPROVAL_ID:'788',FCF_APPROVAL_DIGEST:'sha256:'+sha(approvalZip),FCF_APPROVAL_MANIFEST_SHA:sha(approvalBytes),FCF_INVENTORY_ASSET_SHA:'sha256:'+sha(approvalBytes)},base={env,root,github,clock:()=>time,pause:async ms=>{time+=ms},sourceFetch:async()=>{sourceCalls++;time+=5;assert.ok(claimReads>=3);return new Response('retained refusal',{status:403})}}
 assert.equal((await call('runFcfMissingInventoryActions',{...base,argv:['consume']})).code,0);assert.equal(sourceCalls,0)
 const manifestBytes=readFileSync(join(root,'fcf-inventory-consumption/manifest.json'));consumptionBytes=zip([{name:'manifest.json',body:manifestBytes}]);phase='capture';consumeJob.status='completed';consumeJob.conclusion='success';Object.assign(env,{GITHUB_JOB:'missing-inventory-g1',FCF_INVENTORY_TARGET:'es-ct-segona-g1',FCF_CONSUMPTION_ID:'790',FCF_CONSUMPTION_DIGEST:'sha256:'+sha(consumptionBytes),FCF_CONSUMPTION_MANIFEST_SHA:sha(manifestBytes)})
 cancelAfterWait=true;await assert.rejects(()=>call('runFcfMissingInventoryActions',{...base,argv:['capture']}),/FCF_INVENTORY/);assert.equal(sourceCalls,0);cancelAfterWait=false;coordinationObserved=false
 const result=await call('runFcfMissingInventoryActions',{...base,argv:['capture']});assert.equal(result.code,1);assert.equal(sourceCalls,1);const m=JSON.parse(readFileSync(join(root,'fcf-missing-es-ct-segona-g1/manifest.json')));assert.equal(m.actualSourceGETs,1);assert.equal(m.status,'failed');assert.equal(readFileSync(join(root,m.documents[1].artifactFile===null?'missing':'fcf-missing-es-ct-segona-g1/'+m.documents[1].artifactFile),'utf8'),'retained refusal')
})

// Execute the actual private transport with an in-memory child-process boundary.
// This covers emitted CLI arguments without a subprocess, token, or HTTP request.
const transport=(execute)=>{
 const source=readFileSync(new URL('./fcf-inventory-github.mjs',import.meta.url),'utf8')
 const start=source.indexOf('let allowsEscapeSequences=null'),end=source.indexOf('\nexport async function readFcfDraftAsset',start)
 assert.ok(start>=0&&end>start)
 return runInNewContext(`${source.slice(start,end).replace('export ','')};getFcfInventoryGithub`,{repo:`repos/${repository}/`,execFileSync:execute,fail(message){throw Error('FCF_INVENTORY: '+message)}})
}
test('GitHub GET boundary requests Actions ZIP with GitHub JSON Accept and preserves binary bytes and bounds',async()=>{
 const zipBytes=Buffer.from([0x50,0x4b,3,4,0xff,0,0x80]),path=`repos/${repository}/actions/artifacts/12150332401/zip`
 let request
 const github=transport((command,args,options)=>{if(args[1]==='--help')return Buffer.from('older gh api help with no escape option');request={command,args:Array.from(args),options};return zipBytes})
 assert.equal(await github(path,true),zipBytes)
 assert.equal(request.command,'gh');assert.deepEqual(request.args,['api','--method','GET',path,'-H','Accept: application/vnd.github+json'])
 assert.equal(request.options.maxBuffer,100*1024*1024+1);assert.equal(request.options.timeout,60000);assert.deepEqual(Array.from(request.options.stdio),['ignore','pipe','pipe'])
})
test('GitHub GET boundary preserves release-asset octet-stream and JSON metadata behavior',async()=>{
 const bytes=Buffer.from([0xff,0,0x80]),paths=[`repos/${repository}/releases/assets/22`,`repos/${repository}/actions/artifacts/12150332401`],calls=[]
 const github=transport((command,args,options)=>{if(args[1]==='--help')return Buffer.from('older gh api help with no escape option');calls.push(Array.from(args));if(args[args.indexOf('--method')+2]===paths[0]){assert.equal(options.maxBuffer,100*1024*1024+1);return bytes}assert.equal(options.maxBuffer,8*1024*1024+1);return Buffer.from('{"id":12150332401}')})
 assert.equal(await github(paths[0],true),bytes);assert.equal((await github(paths[1])).id,12150332401)
 assert.deepEqual(calls,[['api','--method','GET',paths[0],'-H','Accept: application/octet-stream'],['api','--method','GET',paths[1]]])
})
test('GitHub GET boundary rejects foreign and malformed API paths before execution',async()=>{
 let calls=0;const github=transport(()=>{calls++;throw Error('must not execute')})
 for(const path of ['https://api.github.com/repos/'+repository+'/actions/artifacts/1/zip','repos/foreign/repo/actions/artifacts/1/zip',`repos/${repository}/../actions/artifacts/1/zip`,`repos/${repository}/actions/artifacts/1/zip#fragment`,`repos/${repository}/actions/artifacts/1/zip\n`])await assert.rejects(()=>github(path,true),/fixed repository/)
 assert.equal(calls,0)
})
test('GitHub GET boundary keeps sanitized failures and exact 404 classification',async()=>{
 const path=`repos/${repository}/actions/artifacts/1/zip`
 for(const status of [404,415]){
  const github=transport((command,args)=>{if(args[1]==='--help')return Buffer.from('older gh api help with no escape option');const e=Error('private details');e.stderr=Buffer.from('HTTP '+status);throw e})
  await assert.rejects(()=>github(path,true),e=>e.message==='FCF_INVENTORY: authenticated GitHub GET failed'&&e.status===(status===404?404:undefined))
 }
})
