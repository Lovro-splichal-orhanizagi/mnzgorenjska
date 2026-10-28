// TEST ONLY new G9/G1 execution records; old37 history alone is genuine.
import test from 'node:test'
import assert from 'node:assert/strict'
import {postG9AccountingWire} from './fcf-post-g9-accounting-test-fixture.mjs'
import {readFcfPostG9Accounting} from './fcf-post-g9-accounting.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {fcfFutureSourceClaimRef,validateFcfFutureSourcePlan} from './fcf-future-source-plan.mjs'
const api=await import('./fcf-future-source-plan.mjs'),enabled={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR&&process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR?false:'Genuine OLD37 fixtures required; all new execution records are synthetic'}
const build=x=>{assert.equal(typeof api.buildFcfG1SourceContinuationPlan,'function','closed G1 source plan required');return api.buildFcfG1SourceContinuationPlan(x)}
test('closed G1 plan requires private post-G9 proof and refuses a complete240 predecessor under cap478',enabled,async t=>{
 const raw=await postG9AccountingWire(t,'completed'),proof=readFcfPostG9Accounting(raw),input={sourceCommit:'b'.repeat(40),accountingProof:proof,rulesetSnapshotSha256:'c'.repeat(64),now:raw.now+1000}
 assert.equal(proof.priorSourceGETs,277)
 assert.throws(()=>build(input),/478|budget|remaining/)
 for(const accountingProof of [structuredClone(proof),{priorSourceGETs:38,maximumCumulativeSourceGETs:478}])assert.throws(()=>build({...input,accountingProof}),/FCF_INVENTORY/)
})
test('G1 exact fresh240 plan preserves actual partial spend and history-only one-use key across new writers',enabled,async t=>{
 const raw=await postG9AccountingWire(t,'diagnostic'),proof=readFcfPostG9Accounting(raw),input={sourceCommit:'b'.repeat(40),accountingProof:proof,rulesetSnapshotSha256:'c'.repeat(64),now:raw.now+1000},p=build(input)
 assert.equal(p.preset,'future-g1-after-g9-v1');assert.equal(p.maximumCumulativeSourceGETs,478);assert.equal(p.priorSourceGETs,38);assert.equal(p.plannedCumulativeSourceGETs,278);assert.equal(p.child.targetSlug,'es-ct-segona-g1');assert.equal(p.child.competitionId,783);assert.equal(p.child.sourceCode,'4109388-4109627');assert.equal(p.child.season,'2026/27');assert.equal(p.child.fetchIds.length,240);assert.equal(p.child.fetchIds[0],'4109388');assert.equal(p.child.fetchIds.at(-1),'4109627');assert.deepEqual(p.child.reuse,[])
 assert.equal(fcfFutureSourceClaimRef(p),`refs/tags/fcf-inventory-claim/future-after-${hash(p.accountingBinding)}`)
 const q=build({...input,sourceCommit:'d'.repeat(40),now:input.now+1});assert.notEqual(p.planSha256,q.planSha256);assert.equal(fcfFutureSourceClaimRef(p),fcfFutureSourceClaimRef(q))
 const changed=structuredClone(p);changed.maximumCumulativeSourceGETs=517;const {planSha256,...body}=changed;changed.planSha256=hash(body)
 assert.throws(()=>validateFcfFutureSourcePlan({plan:changed,accountingProof:proof,expectedPlanSha256:changed.planSha256,now:input.now}),/FCF_INVENTORY/)
})

import {g1CaptureFixture,g1AdmissionWire,g1HistoryReferences} from './fcf-g1-source-test-fixture.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
import {readFcfFutureCapturedTargetEvidence,getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
import {readFcfInventoryExecutionClaim} from './fcf-missing-inventory-claim.mjs'
test('TEST ONLY full G1 fresh capture, offline audit and terminal source admission bind actual38+240',enabled,async t=>{
 const {wire,f}=await g1AdmissionWire(t),evidence=readFcfFutureCapturedTargetEvidence(wire),data=getFcfFutureCapturedTargetData({targetEvidence:evidence,now:wire.now})
 assert.equal(f.calls.length,240);assert.equal(data.competition.id,783);assert.equal(data.targetSlug,'es-ct-segona-g1');assert.equal(data.fixtures.length,240);assert.equal(data.clubs.length,16);assert.equal(data.verifiedKeeperClubs.length,16);assert.equal(data.binding.priorSourceGETs,38);assert.equal(data.binding.actualSourceGETs,278)
 const unknown=data.fixtures.find(f=>f.id==='es4109404');assert.equal(unknown.homeGoals,null);assert.equal(unknown.awayGoals,null);assert.equal(unknown.appearances,null);assert.equal(unknown.statisticsStatus,'unavailable_historical');assert.notEqual(unknown.source.historicalObservation.freshRawSha256,unknown.source.historicalObservation.approvedOriginalSha256)
 assert.throws(()=>getFcfFutureCapturedTargetData({targetEvidence:structuredClone(evidence),now:wire.now}),/FCF_INVENTORY/)
 assert.throws(()=>getFcfFutureCapturedTargetData({targetEvidence:evidence,now:wire.now+86400001}),/FCF_/)
 await assert.rejects(()=>collectFcfMissingInventoryChild(f),/one-shot|preexisting/)
 const replay={...f.claimWire,execution:{...f.claimWire.execution,runId:'125'},expected:{...f.claimWire.expected,runId:'125'}};assert.throws(()=>readFcfInventoryExecutionClaim(replay),/FCF_INVENTORY/)
})

import {g1TransportFixture} from './fcf-g1-source-test-fixture.mjs'
import {readFcfFutureSourceApproval,readFcfPostG9HistoryWire} from './fcf-future-source-approval.mjs'
import {readFcfFutureTargetSourceWire} from './fcf-future-target-source-wire.mjs'
test('TEST ONLY GET-only post-G9 history, schema5 approval and full G1 wire authenticate exact target and ledger',enabled,async t=>{
 const f=await g1TransportFixture(t),history=await readFcfPostG9HistoryWire({source:f.history,github:f.github,now:f.wire.now});assert.equal(readFcfPostG9Accounting(history).priorSourceGETs,38)
 const a=await readFcfFutureSourceApproval({bytes:f.approvalBytes,sourceCommit:f.approval.sourceCommit,github:f.github,now:f.wire.now});assert.equal(a.plan.preset,'future-g1-after-g9-v1')
 const wire=await readFcfFutureTargetSourceWire({source:f.source,github:f.github,now:f.wire.now}),data=getFcfFutureCapturedTargetData({targetEvidence:readFcfFutureCapturedTargetEvidence(wire),now:wire.now});assert.equal(data.binding.actualSourceGETs,278);assert.equal(data.targetSlug,'es-ct-segona-g1')
 for(const change of [s=>s.child.inventory.sourceCommit='c'.repeat(40),s=>s.claim.expected.runAttempt='2',s=>s.child.audit.name='fcf-missing-inventory-audit-es-ct-tercera-g9-124-1',s=>s.plan.maximumCumulativeSourceGETs=517]){const source=structuredClone(f.source);change(source);let calls=0;await assert.rejects(()=>readFcfFutureTargetSourceWire({source,github:async()=>{calls++;throw Error('forbidden GET')},now:f.wire.now}),/FCF_/);assert.equal(calls,0)}
 const overflow=structuredClone(f.approval);overflow.plan.priorSourceGETs=277;overflow.plan.plannedCumulativeSourceGETs=517;let calls=0;await assert.rejects(()=>readFcfFutureSourceApproval({bytes:Buffer.from(JSON.stringify(overflow)),sourceCommit:overflow.sourceCommit,github:async()=>{calls++;throw Error('forbidden GET')},now:f.wire.now}),/478|budget/);assert.equal(calls,0)
 for(const change of [s=>s.latest.claim.expected.claimCommit='bad',s=>s.latest.child.diagnostic.manifestSha256='bad',s=>s.latest.child.unstarted={priorSourceGETs:0}]){const source=structuredClone(f.history);change(source);let calls=0;await assert.rejects(()=>readFcfPostG9HistoryWire({source,github:async()=>{calls++;throw Error('forbidden GET')},now:f.wire.now}),/FCF_/);assert.equal(calls,0)}
 const moved=async(path,binary)=>path.includes('git/ref/tags/fcf-inventory-claim/future-after-')?{...f.wire.claim.ref,object:{type:'commit',sha:'e'.repeat(40)}}:f.github(path,binary)
 await assert.rejects(()=>readFcfFutureTargetSourceWire({source:f.source,github:moved,now:f.wire.now}),/claim|ref/)
})

import {g1ActionsFixture,g1Bundle} from './fcf-g1-source-test-fixture.mjs'
import {runFcfMissingInventoryActions} from './fcf-missing-inventory-actions.mjs'
import {readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
const run=(f,mode)=>runFcfMissingInventoryActions({...f.base(),argv:[mode]}),manifest=(f,path)=>JSON.parse(readFileSync(join(f.root,path,'manifest.json')))
test('TEST ONLY G1 source Actions stage/consume/audit/final and root claim template retain one closed selected child',enabled,async t=>{
 const f=await g1ActionsFixture(t)
 f.env.GITHUB_JOB='missing-inventory-approval';Object.assign(f.approvalJob,{status:'in_progress',conclusion:null});Object.assign(f.approvalJob.steps[0],{status:'in_progress',conclusion:null})
 assert.equal((await run(f,'approval-stage')).code,0);assert.deepEqual(readFileSync(join(f.root,'fcf-inventory-approval/manifest.json')),f.approvalBytes)
 Object.assign(f.approvalJob,{status:'completed',conclusion:'success'});Object.assign(f.approvalJob.steps[0],{status:'completed',conclusion:'success'});Object.assign(f.consumeJob,{status:'in_progress',conclusion:null});f.env.GITHUB_JOB='missing-inventory-consume'
 assert.equal((await run(f,'consume')).code,0);const consumed=manifest(f,'fcf-inventory-consumption');assert.equal(consumed.schemaVersion,4);assert.equal(consumed.claimRef,f.wire.claim.ref.ref)
 Object.assign(f.consumeJob,{status:'completed',conclusion:'success'});Object.assign(f.env,{GITHUB_JOB:'missing-inventory-g1',FCF_INVENTORY_TARGET:'es-ct-segona-g1',FCF_CURRENT_INVENTORY_ID:f.source.child.inventory.artifactId,FCF_CURRENT_INVENTORY_DIGEST:f.source.child.inventory.artifactDigest,FCF_CURRENT_MANIFEST_SHA:f.source.child.inventory.manifestSha256})
 assert.equal((await run(f,'audit')).code,0);assert.equal(manifest(f,'fcf-inventory-audit-es-ct-segona-g1').actualSourceGETs,278)
 Object.assign(f.env,{GITHUB_JOB:'missing-inventory-receipt',FCF_G1_INVENTORY_ID:f.source.child.inventory.artifactId,FCF_G1_INVENTORY_DIGEST:f.source.child.inventory.artifactDigest,FCF_G1_MANIFEST_SHA:f.source.child.inventory.manifestSha256,FCF_G1_AUDIT_ID:f.source.child.audit.artifactId,FCF_G1_AUDIT_DIGEST:f.source.child.audit.artifactDigest,FCF_G1_AUDIT_MANIFEST_SHA:f.source.child.audit.manifestSha256});delete f.env.FCF_INVENTORY_TARGET
 assert.equal((await run(f,'receipt')).code,0);const m=manifest(f,'fcf-inventory-final');assert.equal(m.protocol,'future-g1-after-g9-v1');assert.equal(m.actualSourceGETs,278);assert.equal(m.children.length,1);assert.equal(m.children[0].targetSlug,'es-ct-segona-g1');assert.equal(m.admissible,true);assert.equal(f.sourceCalls.length,0)
 const history=join(f.root,'history.json'),approval=join(f.root,'prepared-approval.json'),claim=join(f.root,'claim-template.json');writeFileSync(history,JSON.stringify(f.history))
 const prepared=await runFcfMissingInventoryActions({...f.base(),argv:['prepare-g1-approval','--history-source',history,'--source-commit',f.approval.sourceCommit,'--ruleset-id','12','--output',approval]})
 assert.equal(prepared.code,0);const templated=await runFcfMissingInventoryActions({...f.base(),argv:['claim-template','--approval',approval,'--run-id','124','--output',claim]});const c=JSON.parse(readFileSync(claim));assert.equal(c.preset,'future-g1-after-g9-v1');assert.equal(c.priorSourceGETs,38);assert.equal(c.plannedCumulativeSourceGETs,278);assert.equal(templated.result.claimRef,prepared.result.claimRef);assert.equal(f.sourceCalls.length,0)
})
test('TEST ONLY G1 source Actions refuse wrong/sibling scope before IO and retain counted403 without retry or refund',enabled,async t=>{
 const f=await g1ActionsFixture(t,{capture:false});Object.assign(f.env,{GITHUB_JOB:'missing-inventory-g1',FCF_INVENTORY_TARGET:'es-ct-segona-g1'});Object.assign(f.captureJob,{status:'in_progress',conclusion:null});Object.assign(f.captureJob.steps[0],{status:'in_progress',conclusion:null})
 for(const change of [e=>e.FCF_INVENTORY_TARGET='es-ct-tercera-g9',e=>e.GITHUB_JOB='missing-inventory-g9',e=>e.FCF_G9_INVENTORY_ID='898',e=>e.SUPABASE_SERVICE_ROLE_KEY='TEST ONLY',e=>e.FCF_INVENTORY_SEED_ID='1']){const env={...f.env};change(env);let calls=0;await assert.rejects(()=>runFcfMissingInventoryActions({...f.base(),env,argv:['capture'],github:async()=>{calls++;throw Error('forbidden GET')}}),/FCF_INVENTORY/);assert.equal(calls,0);assert.equal(f.sourceCalls.length,0)}
 assert.equal((await run(f,'capture')).code,1);assert.equal(f.sourceCalls.length,1);assert.ok(f.sourceCalls[0].url.endsWith('/4109388'));const m=manifest(f,'fcf-missing-es-ct-segona-g1');assert.equal(m.actualSourceGETs,1);assert.equal(m.priorSourceGETs,38);assert.equal(m.attempts[0].sequence,39)
 const entries=readdirSync(join(f.root,'fcf-missing-es-ct-segona-g1')).map(name=>({name,body:readFileSync(join(f.root,'fcf-missing-es-ct-segona-g1',name))})),diagnostic=g1Bundle({entries,name:'fcf-missing-inventory-diagnostic-es-ct-segona-g1-124-1'});f.addArtifact(diagnostic)
 Object.assign(f.captureJob,{status:'completed',conclusion:'failure'});f.captureJob.steps=[{name:'Capture missing target inventory',status:'completed',conclusion:'failure'},{name:'Retain failed target inventory diagnostic',status:'completed',conclusion:'success'}]
 Object.assign(f.env,{GITHUB_JOB:'missing-inventory-receipt',FCF_G1_DIAGNOSTIC_ID:diagnostic.expected.artifactId,FCF_G1_DIAGNOSTIC_DIGEST:diagnostic.expected.artifactDigest,FCF_G1_MANIFEST_SHA:diagnostic.expected.manifestSha256});delete f.env.FCF_INVENTORY_TARGET
 assert.equal((await run(f,'receipt')).code,0);const final=manifest(f,'fcf-inventory-final');assert.equal(final.kind,'fcf-future-source-final-receipt');assert.equal(final.actualSourceGETs,39);assert.equal(final.admissible,false);assert.equal(final.children[0].newSourceGETs,1)
 await assert.rejects(()=>runFcfMissingInventoryActions({...f.base(),argv:['capture'],env:{...f.env,GITHUB_JOB:'missing-inventory-g1',FCF_INVENTORY_TARGET:'es-ct-segona-g1',FCF_G1_DIAGNOSTIC_ID:'',FCF_G1_DIAGNOSTIC_DIGEST:'',FCF_G1_MANIFEST_SHA:''}}),/active|sole|capture/);assert.equal(f.sourceCalls.length,1)
})

import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
const workflowPath=fileURLToPath(new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url))
const workflow=JSON.parse(execFileSync('ruby',['-ryaml','-rjson','-e','print JSON.generate(YAML.load_file(ARGV[0]))',workflowPath],{encoding:'utf8'}))
const condition=(expression,inputs,needs)=>Function('github','inputs','needs','always','cancelled',`return (${expression.replace(/needs\.([a-z0-9-]+)\.result/g,"needs['$1'].result")})`)({ref:'refs/heads/main',run_attempt:1},inputs,needs,()=>true,()=>false)
test('parsed source workflow selects only one G1 continuation child and preserves prior G9/six routing',()=>{
 const jobs=workflow.jobs,trigger=workflow.on??workflow.true;assert.ok(trigger.workflow_dispatch.inputs.preset.options.includes('future-g1-after-g9-v1'));assert.equal(trigger.workflow_dispatch.inputs.preset.default,'g1-then-g9-missing-v1')
 for(const [preset,wantG1,wantG9]of [['future-g1-after-g9-v1',true,false],['future-g9-after-six-v1',false,true],['g9-only-after-held-parent-v1',false,true],['six-reviewed-continuation-v1',true,true],['g1-then-g9-missing-v1',true,true]]){
  const inputs={mode:'missing-inventory',preset},needs=Object.fromEntries(['missing-inventory-approval','missing-inventory-consume','missing-inventory-g1'].map(k=>[k,{result:'success'}]))
  assert.equal(condition(jobs['missing-inventory-g1'].if,inputs,needs),wantG1,preset+' first child');assert.equal(condition(jobs['missing-inventory-g9'].if,inputs,needs),wantG9,preset+' second child')
 }
 const inputs={mode:'missing-inventory',preset:'future-g1-after-g9-v1'},needs={'missing-inventory-g1':{outputs:{inventory_id:'TEST-G1'}},'missing-inventory-g9':{outputs:{}}},receipt=jobs['missing-inventory-receipt']
 const env=k=>Function('inputs','needs',`return (${receipt.env[k].slice(3,-2)})`)(inputs,needs)
 assert.equal(env('FCF_G1_INVENTORY_ID'),'TEST-G1');assert.equal(env('FCF_G9_INVENTORY_ID'),undefined)
 for(const name of ['missing-inventory-g1','missing-inventory-g9','missing-inventory-receipt']){assert.deepEqual(jobs[name].permissions,{contents:'read',actions:'read'});assert.doesNotMatch(JSON.stringify(jobs[name]),/SUPABASE|SERVICE_ROLE|DEPLOY_SSH_KEY|secrets\./)}
})

test('missing/ asserted actual post-G9 references hold before any repository or source request',async()=>{
 let calls=0;const github=async()=>{calls++;throw Error('forbidden GET')}
 for(const source of [null,{}, {priorSourceGETs:38,verified:true}])await assert.rejects(()=>readFcfPostG9HistoryWire({source,github,now:Date.parse('2026-10-28T12:00:00Z')}),/FCF_INVENTORY/)
 assert.equal(calls,0)
 for(const accountingProof of [null,{}, {kind:'fcf-post-g9-accounting-only',priorSourceGETs:38,maximumCumulativeSourceGETs:478}])assert.throws(()=>build({sourceCommit:'b'.repeat(40),accountingProof,rulesetSnapshotSha256:'c'.repeat(64),now:Date.parse('2026-10-28T12:00:00Z')}),/FCF_INVENTORY/)
})

for(const [mode,want]of [['unstarted',37],['failed-audit',277]])test(`TEST ONLY post-G9 reference replay authenticates ${mode} spend without source admission`,enabled,async t=>{
 const f=await g1TransportFixture(t,{capture:false}),raw=await postG9AccountingWire(t,mode);f.addWire(raw)
 const source=g1HistoryReferences(raw),wire=await readFcfPostG9HistoryWire({source,github:f.github,now:raw.now}),proof=readFcfPostG9Accounting(wire)
 assert.equal(proof.priorSourceGETs,want);assert.equal(proof.admissible,false);assert.throws(()=>getFcfFutureCapturedTargetData({targetEvidence:proof,now:raw.now}),/FCF_INVENTORY/)
 const input={sourceCommit:'b'.repeat(40),accountingProof:proof,rulesetSnapshotSha256:'c'.repeat(64),now:raw.now+1000}
 if(mode==='failed-audit')assert.throws(()=>build(input),/478|budget|remaining/);else assert.equal(build(input).plannedCumulativeSourceGETs,277)
 f.map.get(f.repo+'actions/runs/123').conclusion='cancelled';await assert.rejects(()=>readFcfPostG9HistoryWire({source,github:f.github,now:raw.now}),/FCF_INVENTORY/)
})
