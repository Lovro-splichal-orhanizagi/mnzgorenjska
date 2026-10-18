import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync,realpathSync,symlinkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {runFcfTargetActions,readFcfTargetSourceWire,packFcfTargetOriginals,fcfTargetWriterHashes} from './fcf-target-actions.mjs'
import {admissionFixture,retained} from './fcf-missing-inventory-admission-fixture.mjs'
import {readFcfCapturedTargetEvidence,getFcfCapturedTargetData} from './fcf-target-evidence.mjs'
import {unpackVerifiedArchive} from './dfb-artifacts.mjs'
import {zipFixture,sha} from './fcf-target-test-fixture.mjs'
import {fcfTargetPricingModelSha256} from './fcf-target-pricing-model.mjs'
const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_REF:'refs/heads/main',GITHUB_SHA:'b'.repeat(40),GITHUB_RUN_ID:'999',GITHUB_RUN_ATTEMPT:'1'}
test('ordinary process, unknown mode and missing actual approval refuse before database access',async()=>{
 let db=0,gh=0;const database={inventory(){db++;throw Error('unexpected database')}},github=async()=>{gh++;throw Error('unexpected GitHub')}
 await assert.rejects(runFcfTargetActions({mode:'import',env:{},database,github}),/actual main Actions/)
 await assert.rejects(runFcfTargetActions({mode:'legacy',env,database,github}),/closed explicit writer/)
 await assert.rejects(runFcfTargetActions({mode:'import',env,database,github}),/explicit artifact\/run pins/)
 assert.equal(db,0);assert.equal(gh,0)
})
test('missing first-import artifact recovers only the immutable SQL envelope without source access or another mutation',async t=>{
 const actual=realpathSync(new URL('..',import.meta.url).pathname),root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-recovery-test-')));t.after(()=>rmSync(root,{recursive:true,force:true}));for(const name of['scripts','supabase','.github'])symlinkSync(join(actual,name),join(root,name),'dir')
 const targetSlug='es-ct-segona-g1',plan={planSha256:'a'.repeat(64),sourceCommit:'a'.repeat(40)},approval={schemaVersion:1,kind:'fcf-current-target-rollout-approval',sourceCommit:env.GITHUB_SHA,targetSlug,stage:'recover',runtimeHashes:fcfTargetWriterHashes(root),modelSha256:fcfTargetPricingModelSha256(),source:{plan},originals:null,cleanup:null,mapping:null,previous:null},raw=Buffer.from(JSON.stringify(approval)),zipBytes=zipFixture(t,[{name:'manifest.json',body:raw}]),artifact={id:500,name:'fcf-target-approval-998-1',expired:false,size_in_bytes:zipBytes.length,digest:'sha256:'+sha(zipBytes),workflow_run:{id:998,head_sha:env.GITHUB_SHA}},run=id=>({id,run_attempt:1,repository:{full_name:env.GITHUB_REPOSITORY},path:'.github/workflows/uvoz-fcf-zgodovina.yml',event:'workflow_dispatch',head_branch:'main',head_sha:env.GITHUB_SHA,status:id===998?'completed':'in_progress',conclusion:id===998?'success':null}),job=id=>({id:id+1,run_id:id,run_attempt:1,head_sha:env.GITHUB_SHA,name:id===998?'target-approval':'target-recover',status:id===998?'completed':'in_progress',conclusion:id===998?'success':null,steps:(id===998?['Stage reviewed FCF target approval','Retain reviewed FCF target approval']:['Read back exact FCF target receipt']).map(name=>({name,status:id===998?'completed':'in_progress',conclusion:id===998?'success':null}))})
 let reads=0;const rolloutText=JSON.stringify({targetSlug,targetPacketSha256:'c'.repeat(64),inventoryBinding:{planSha256:plan.planSha256,sourceCommit:plan.sourceCommit}}),receipt={stage:'imported',packet_sha256:'c'.repeat(64),rolloutText,rolloutSha256:sha(rolloutText),currentActive:false,currentStateSha256:'d'.repeat(64),canonicalVerified:false},database={receipt:slug=>{reads++;assert.equal(slug,targetSlug);return receipt},mutate(){assert.fail('recovery attempted mutation')}},github=async(path,binary)=>{if(path.endsWith('/actions/artifacts/500/zip'))return zipBytes;if(path.endsWith('/actions/artifacts/500'))return artifact;const id=Number(path.match(/actions\/runs\/(\d+)/)?.[1]);if([998,999].includes(id))return path.includes('/jobs?')?{total_count:1,jobs:[job(id)]}:run(id);assert.fail('recovery attempted source/claim/draft access '+path)}
 const result=await runFcfTargetActions({mode:'recover',root,database,github,env:{...env,GITHUB_JOB:'target-recover',FCF_TARGET_APPROVAL_RUN_ID:'998',FCF_TARGET_APPROVAL_ATTEMPT:'1',FCF_TARGET_APPROVAL_ID:'500',FCF_TARGET_APPROVAL_DIGEST:artifact.digest,FCF_TARGET_APPROVAL_SHA256:sha(raw)}})
 assert.equal(result.code,0);assert.equal(reads,1);const m=JSON.parse(readFileSync(join(root,'fcf-target-recover/manifest.json')));assert.equal(m.rolloutText,rolloutText);assert.equal(m.result.readbackOnly,true);assert.equal(m.result.canonicalVerified,false)
})
test('writer closure is separate from original captured source and binds workflow/preloader/pricer/SQL',()=>{
 const h=fcfTargetWriterHashes(new URL('..',import.meta.url).pathname)
 for(const f of['.github/workflows/uvoz-fcf-zgodovina.yml','scripts/fcf-target-preload.mjs','scripts/ovrednoti-igralce.mjs','supabase/migrations/20261018232000_fcf_current_target_release.sql'])assert.match(h[f],/^[a-f0-9]{64}$/)
})
test('all4 original packer retains genuine bytes without capture or database',{skip:!retained},t=>{
 const dir=realpathSync(mkdtempSync(join(tmpdir(),'fcf-original-pack-test-')));t.after(()=>rmSync(dir,{recursive:true,force:true}));const output=join(dir,'originals.zip'),r=packFcfTargetOriginals({originalsDir:realpathSync(retained),output}),files=unpackVerifiedArchive(readFileSync(output),'sha256:'+r.sha256,'fcf-cleanup-prepared')
 assert.equal(files.size,4);assert.ok(files.has('acta-4116215.html'),'G2 original remains mandatory for G1/G9');assert.throws(()=>packFcfTargetOriginals({originalsDir:realpathSync(retained),output}),/new canonical ZIP/)
})
test('actual GET-only metadata assembly reauthenticates source A into reusable writer B capability',{skip:!retained},async t=>{
 const f=await admissionFixture(t),w=f.wire,bundles=[w.consumption,w.finalReceipt,...w.children.flatMap(c=>[c.inventory,c.audit]).filter(Boolean)],allJobs=[...new Map(bundles.flatMap(b=>b.jobs).map(j=>[j.id,j])).values()],paths=[]
 const source={plan:w.plan,claim:{execution:w.claim.execution,expected:w.claim.expected},consumption:w.consumption.expected,finalReceipt:w.finalReceipt.expected,children:w.children.map(c=>({targetSlug:c.targetSlug,inventory:c.inventory?.expected??null,audit:c.audit?.expected??null,unstarted:null}))}
 const github=async(path,binary=false)=>{paths.push(path);if(path.includes('/git/ref/tags/'))return w.claim.ref;if(path.includes('/git/commits/'))return w.claim.claimCommit.commit;if(path.includes('/git/trees/'))return w.claim.claimCommit.tree;if(path.includes('/git/blobs/'))return w.claim.claimCommit.blob;if(path.includes('/rulesets/'))return w.claim.rulesets[0];if(path.includes('/jobs?'))return{total_count:allJobs.length,jobs:allJobs};const artifact=path.match(/actions\/artifacts\/(\d+)(\/zip)?$/);if(artifact){const b=bundles.find(b=>String(b.artifact.id)===artifact[1]);assert.ok(b);return binary?b.zipBytes:b.artifact}if(/actions\/runs\/\d+$/.test(path))return bundles[0].run;throw Error('unexpected GET path '+path)}
 const wire=await readFcfTargetSourceWire({source,github,now:f.now}),proof=readFcfCapturedTargetEvidence({...wire,targetSlug:'es-ct-segona-g1'}),data=getFcfCapturedTargetData({targetEvidence:proof,targetSlug:'es-ct-segona-g1',now:f.now})
 assert.equal(data.documents.length,240);assert.equal(data.binding.sourceCommit,w.plan.sourceCommit);assert.equal(data.binding.sourceClaimState,'consumed');assert.equal(data.binding.actualSourceGETs,477)
 assert.equal(paths.some(p=>/fcf\.cat|POST|PATCH/.test(p)),false)
})

test('cleanup retry retains original saved result after a committed response or retention loss',{skip:!retained},async t=>{
 const {cleanupRecoveryFixture,cleanupRecoveryDatabase}=await import('./fcf-target-cleanup-recovery-test-fixture.mjs'),f=await cleanupRecoveryFixture(t)
 for(const lostResponse of[true,false])await t.test(lostResponse?'lost committed response':'lost retained artifact',async()=>{
  const database=cleanupRecoveryDatabase(f,{lostResponse}),root=f.newRoot(),first={mode:'cleanup-apply',env:f.envFor('999'),root,github:f.github,clock:()=>f.now,database}
  if(lostResponse)await assert.rejects(runFcfTargetActions(first),/lost committed cleanup response/)
  else assert.equal((await runFcfTargetActions(first)).code,0)
  assert.equal(database.cleanupCommits,1)
  const retryRoot=f.newRoot(),retry={...first,env:f.envFor('1000'),root:retryRoot}
  assert.equal((await runFcfTargetActions(retry)).code,0)
  const m=JSON.parse(readFileSync(join(retryRoot,'fcf-cleanup-applied/manifest.json')))
  assert.deepEqual(m.result,f.cleanup.applyManifest.result);assert.deepEqual(m.markers,f.cleanup.applyManifest.markers)
  assert.equal(m.prepareArtifactId,f.cleanup.input.expected.prepare.artifactId);assert.equal(m.prepareArtifactDigest,f.cleanup.input.expected.prepare.artifactDigest);assert.equal(m.beforeSha256,f.cleanup.prepare.beforeSha256)
  assert.equal(database.applyCalls,2);assert.equal(database.cleanupCommits,1);assert.deepEqual(database.params[0],database.params[1])
  assert.ok(database.snapshots.slice(-3).every(d=>d.groups.every(g=>g.source_policy==='es-fcf-reviewed-history-v1')))
  const calls=database.applyCalls;await assert.rejects(runFcfTargetActions({...retry,root:f.newRoot(),env:{...retry.env,FCF_TARGET_APPROVAL_SHA256:'0'.repeat(64)}}),/exact root approval bytes/);assert.equal(database.applyCalls,calls)
 })
})

test('GitHub binary GET uses artifact JSON Accept and release-asset octet-stream at the process boundary',async()=>{
 const {githubGet}=await import('./fcf-target-actions.mjs');assert.equal(typeof githubGet,'function')
 const prefix='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',calls=[],zip=Buffer.from([0x50,0x4b,3,4,0,255]),execute=(command,args,options)=>{calls.push({command,args,options});return args.includes('-H')?zip:Buffer.from('{"id":17}')}
 const artifactPath=prefix+'actions/artifacts/12150332401/zip'
 assert.deepEqual(await githubGet(artifactPath,true,execute),zip)
 assert.deepEqual(calls[0].args,['api','--method','GET',artifactPath,'-H','Accept: application/vnd.github+json']);assert.equal(calls[0].command,'gh');assert.equal(calls[0].options.maxBuffer,100*1024*1024);assert.equal(calls[0].options.timeout,60000);assert.deepEqual(calls[0].options.stdio,['ignore','pipe','pipe'])
 const assetPath=prefix+'releases/assets/654400457'
 assert.deepEqual(await githubGet(assetPath,true,execute),zip);assert.deepEqual(calls[1].args,['api','--method','GET',assetPath,'-H','Accept: application/octet-stream'])
 assert.deepEqual(await githubGet(prefix+'actions/artifacts/12150332401',false,execute),{id:17});assert.deepEqual(calls[2].args,['api','--method','GET',prefix+'actions/artifacts/12150332401']);assert.equal(calls[2].options.maxBuffer,8*1024*1024)
 for(const path of['repos/other/repo/actions/artifacts/17/zip',prefix+'../actions/artifacts/17/zip',prefix+'actions/artifacts/17/zip#fragment',prefix+'actions/artifacts/17/ zip'])await assert.rejects(githubGet(path,true,execute),/fixed repository GET path/)
 assert.equal(calls.length,3)
})
