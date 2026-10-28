import test from 'node:test'
import assert from 'node:assert/strict'
const plan=await import('./fcf-future-source-plan.mjs')
test('post-failed-G1 is an explicit separate full240 source protocol',()=>{
 assert.equal(plan.FCF_G1_POST_FAILURE_SOURCE_PROTOCOL,'future-g1-after-failed-g1-v1')
 assert.equal(typeof plan.buildFcfG1PostFailureSourcePlan,'function')
 assert.equal(plan.isFcfFutureSourceProtocol('future-g1-after-failed-g1-v1'),true)
 for(const accountingProof of [null,{}, {priorSourceGETs:60,admissible:false}])assert.throws(()=>plan.buildFcfG1PostFailureSourcePlan({sourceCommit:'e'.repeat(40),accountingProof,rulesetSnapshotSha256:'a'.repeat(64),now:Date.parse('2026-10-28T12:00:00Z')}),/FCF_/)
})
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {deriveFcfFutureInventoryHeader} from './fcf-future-source-header.mjs'
const supplement=await import('./fcf-g1-4109409-policy.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e}),actual={skip:!process.env.FCF_G1_POST_FAILURE_EVIDENCE_DIR&&'Explicit retained actual failed-G1 evidence required'},protocol='future-g1-after-failed-g1-v1'
const approvedBody=()=>{const b=execFileSync('unzip',['-p',join(process.env.FCF_G1_POST_FAILURE_EVIDENCE_DIR,'get-0008.zip'),'acta-4109409.html']);assert.equal(createHash('sha256').update(b).digest('hex'),'b3737490800a28588fbc4b6eb1d06b26913dcb31149b5ee82a7ae96379d69871');return b}
test('exact supplemental API is separate from original six and ordinary default rejects4109409',()=>{assert.equal(typeof supplement.verifyFcfG1SupplementalObservation,'function');assert.equal(typeof supplement.fcfG1SupplementalPolicySha256,'function')})
test('approved exact4109409 body yields only new-protocol unavailable NULL header, never0:0',actual,()=>{
 const bytes=approvedBody(),input={targetSlug:'es-ct-segona-g1',id:'4109409',bytes}
 assert.throws(()=>deriveFcfFutureInventoryHeader(input),/status|result/)
 const h=deriveFcfFutureInventoryHeader({...input,protocol});assert.equal(h.status,'published-result-unavailable');assert.equal(h.homeGoals,null);assert.equal(h.awayGoals,null);assert.equal(h.round,3);assert.equal(h.home.sourceClubId,'21434932');assert.equal(h.away.sourceCategoryId,'37524')
 const observation=supplement.verifyFcfG1SupplementalObservation({targetSlug:input.targetSlug,id:input.id,html:bytes.toString()});assert.equal(observation.approvedOriginalSha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(observation.fixture.observedHomeScore,null)
 for(const changed of [{...input,id:'4109410'},{...input,targetSlug:'es-ct-tercera-g9'}])assert.throws(()=>deriveFcfFutureInventoryHeader({...changed,protocol}),/FCF_/)
})
import {postG1RetainedFixture} from './fcf-post-g1-test-fixture.mjs'
import * as historyAPI from './fcf-future-source-approval.mjs'
const ledgerAPI=await import('./fcf-post-g1-accounting.mjs')
let actualPromise
async function ledgerFixture(){return actualPromise??=(async()=>{const f=postG1RetainedFixture();assert.equal(typeof historyAPI.readFcfPostG1HistoryWire,'function');f.raw=await historyAPI.readFcfPostG1HistoryWire({source:f.history,github:f.github,now:f.now});f.proof=ledgerAPI.readFcfPostG1Accounting(f.raw);return f})()}
test('actual recursive38+G1diagnostic22 creates accounting-only60 and preserves DA ancestor',actual,async()=>{
 const f=await ledgerFixture(),p=f.proof;assert.equal(p.priorSourceGETs,60);assert.equal(p.latestSourceGETs,22);assert.equal(p.remainingSourceGETs,418);assert.equal(p.admissible,false);assert.equal(ledgerAPI.getFcfPostG1CleanupIssuer(p),'da8516a66084926ebddd3f065fc90d85c2bdf9b9');assert.equal(p.latest.sourceCommit,'ec3405898b628f9e88b7a2908f5f21881ceb836f')
 assert.throws(()=>ledgerAPI.requireFcfPostG1Accounting(structuredClone(p)),/reader-issued/)
 const built=plan.buildFcfG1PostFailureSourcePlan({sourceCommit:'b'.repeat(40),accountingProof:p,rulesetSnapshotSha256:'a'.repeat(64),now:f.now});assert.equal(built.priorSourceGETs,60);assert.equal(built.plannedCumulativeSourceGETs,300);assert.equal(built.maximumNewSourceGETs,240);assert.equal(built.child.fetchIds.length,240);assert.deepEqual(built.child.reuse,[]);assert.equal(plan.getFcfFutureSourceCleanupIssuer(built),'da8516a66084926ebddd3f065fc90d85c2bdf9b9');assert.equal(built.supplementalPolicySha256,supplement.fcfG1SupplementalPolicySha256());assert.match(plan.fcfFutureSourceClaimRef(built),/^refs\/tags\/fcf-inventory-claim\/g1-after-failed-/);const alternative=plan.buildFcfG1PostFailureSourcePlan({sourceCommit:'d'.repeat(40),accountingProof:p,rulesetSnapshotSha256:'a'.repeat(64),now:f.now+1});assert.notEqual(alternative.planSha256,built.planSha256);assert.equal(plan.fcfFutureSourceClaimRef(alternative),plan.fcfFutureSourceClaimRef(built))
 for(const sourceCommit of [p.latest.sourceCommit,ledgerAPI.getFcfPostG1CleanupIssuer(p)])assert.throws(()=>plan.buildFcfG1PostFailureSourcePlan({sourceCommit,accountingProof:p,rulesetSnapshotSha256:'a'.repeat(64),now:f.now}),/FCF_/)
 assert.throws(()=>plan.buildFcfG1SourceContinuationPlan({sourceCommit:'b'.repeat(40),accountingProof:p,rulesetSnapshotSha256:'a'.repeat(64),now:f.now}),/FCF_/)
})
import {proveFcfFutureSourceDocument} from './fcf-future-source-proof.mjs'
import {validateFcfFutureInventoryHeaders} from './fcf-future-source-header.mjs'
test('supplement canonical is NULL/unavailable only under new source protocol; original six hashes remain exact',actual,()=>{
 const bytes=approvedBody(),now=Date.parse('2026-10-28T12:00:00Z'),competition={id:783,slug:'es-ct-segona-g1',source:'fcf',source_policy:'es-fcf-six-reviewed-history-v1',source_league_code:'4109388-4109627',active:false,sezona_koledarska:false},document={id:'4109409',expectedSourceRound:3,html:bytes.toString(),receipt:{id:'4109409',competitionSlug:'es-ct-segona-g1',sourceUrl:'https://www.fcf.cat/ca/competicio/acta/4109409',startedUTC:'2026-10-28T11:14:00.000Z',capturedUTC:'2026-10-28T11:14:01.000Z',cacheMtimeUTC:null,bytes:bytes.length,rawSha256:createHash('sha256').update(bytes).digest('hex')},lineage:{kind:'actions-artifact',verified:true,repository:'Lovro-splichal-orhanizagi/mnzgorenjska',workflow:'.github/workflows/uvoz-fcf-zgodovina.yml',runId:'40675710752',artifactId:'12812020476',artifactDigest:'sha256:'+'a'.repeat(64),commit:'e'.repeat(40)}}
 // This pure document test's constructed receipt/lineage is NOT an authenticated future capture.
 assert.throws(()=>proveFcfFutureSourceDocument({competition,document,now}),/FCF_/)
 const f=proveFcfFutureSourceDocument({competition,document,protocol,now});assert.equal(f.homeGoals,null);assert.equal(f.awayGoals,null);assert.equal(f.report,null);assert.equal(f.appearances,null);assert.equal(f.goals,null);assert.equal(f.statisticsStatus,'unavailable_historical');assert.equal(f.policyId,supplement.getFcfG1SupplementalPolicy().id);assert.equal(f.source.supplementalObservation.sourceMatchId,'4109409')
 assert.throws(()=>proveFcfFutureSourceDocument({competition,document,protocol,now:now+86400001}),/FCF_/)
 const header=deriveFcfFutureInventoryHeader({targetSlug:competition.slug,id:document.id,bytes,protocol});assert.equal(validateFcfFutureInventoryHeaders({targetSlug:competition.slug,headers:[header],complete:false,protocol}).documentCount,1);assert.throws(()=>validateFcfFutureInventoryHeaders({targetSlug:competition.slug,headers:[header],complete:false}),/FCF_/)
})
import {g1AdmissionWire} from './fcf-g1-source-test-fixture.mjs'
import {readFcfFutureCapturedTargetEvidence,getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
const full={skip:!process.env.FCF_G1_POST_FAILURE_EVIDENCE_DIR||!process.env.FCF_POST_SIX_EVIDENCE_DIR||!process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR?'Explicit genuine history/body fixtures required; future capture is synthetic':false}
test('TEST ONLY synthetic fresh240 after genuine failed60 yields300 and private supplement/DA binding',full,async t=>{
 const h=await ledgerFixture(),{wire,f}=await g1AdmissionWire(t,{postFailure:h.raw});assert.equal(wire.plan.preset,protocol)
 const proof=readFcfFutureCapturedTargetEvidence(wire),data=getFcfFutureCapturedTargetData({targetEvidence:proof,now:wire.now})
 assert.equal(f.calls.length,240);assert.equal(f.calls[0].url.endsWith('/4109388'),true);assert.equal(f.calls.at(-1).url.endsWith('/4109627'),true);assert.equal(data.binding.priorSourceGETs,60);assert.equal(data.binding.newSourceGETs,240);assert.equal(data.binding.actualSourceGETs,300);assert.equal(data.binding.cleanupIssuerSourceCommit,'da8516a66084926ebddd3f065fc90d85c2bdf9b9');assert.equal(data.binding.supplementalPolicySha256,supplement.fcfG1SupplementalPolicySha256());assert.equal(data.fixtures.length,240);assert.equal(data.clubs.length,16);assert.equal(data.verifiedKeeperClubs.length,16)
 const unknown=data.fixtures.find(f=>f.id==='es4109409');assert.equal(unknown.homeGoals,null);assert.equal(unknown.awayGoals,null);assert.equal(unknown.appearances,null);assert.equal(unknown.policyId,supplement.getFcfG1SupplementalPolicy().id);assert.equal(data.fixtures.find(f=>f.id==='es4109404').source.historicalObservation.sourceMatchId,'4109404')
 assert.throws(()=>getFcfFutureCapturedTargetData({targetEvidence:structuredClone(proof),now:wire.now}),/FCF_/);assert.throws(()=>getFcfFutureCapturedTargetData({targetEvidence:proof,now:wire.now+86400001}),/FCF_/);assert.throws(()=>getFcfFutureCapturedTargetData({targetEvidence:h.proof,now:wire.now}),/FCF_/)
})
import {g1TransportFixture,g1ActionsFixture} from './fcf-g1-source-test-fixture.mjs'
import {readFcfFutureTargetSourceWire} from './fcf-future-target-source-wire.mjs'
import {runFcfMissingInventoryActions} from './fcf-missing-inventory-actions.mjs'
import {writeFileSync} from 'node:fs'
test('TEST ONLY new schema6 root approval, protected claim CLI, source wire and audit/final Actions preserve60+240',full,async t=>{
 const h=await ledgerFixture(),f=await g1ActionsFixture(t,{postFailure:h.raw}),clock=()=>f.wire.now
 const a=await historyAPI.readFcfFutureSourceApproval({bytes:f.approvalBytes,sourceCommit:f.approval.sourceCommit,github:f.github,now:clock()});assert.equal(a.schemaVersion,6);assert.equal(a.plan.preset,protocol)
 // Source-wire authentication uses terminal synthetic metadata, while Actions below uses its running view.
 const terminal=f.map.get(f.repo+'actions/runs/124');f.run.status='completed';f.run.conclusion='success';f.receiptJob.status='completed';f.receiptJob.conclusion='success'
 const wire=await readFcfFutureTargetSourceWire({source:f.source,github:f.github,now:clock()}),data=getFcfFutureCapturedTargetData({targetEvidence:readFcfFutureCapturedTargetEvidence(wire),now:wire.now});assert.equal(data.binding.actualSourceGETs,300)
 f.run.status='in_progress';f.run.conclusion=null;f.receiptJob.status='in_progress';f.receiptJob.conclusion=null
 const historyPath=join(f.root,'post-G1.json'),approvalPath=join(f.root,'new-approval.json'),claimPath=join(f.root,'new-claim.json');writeFileSync(historyPath,JSON.stringify(f.history))
 const prepared=await runFcfMissingInventoryActions({...f.base(),argv:['prepare-g1-post-failure-approval','--history-source',historyPath,'--source-commit',f.approval.sourceCommit,'--ruleset-id',f.approval.rulesetId,'--output',approvalPath]});assert.equal(prepared.code,0)
 const templated=await runFcfMissingInventoryActions({...f.base(),argv:['claim-template','--approval',approvalPath,'--run-id','124','--output',claimPath]});assert.equal(templated.code,0);assert.match(templated.result.claimRef,/g1-after-failed-/);const claim=JSON.parse(readFileSync(claimPath));assert.equal(claim.priorSourceGETs,60);assert.equal(claim.plannedCumulativeSourceGETs,300);assert.equal(claim.preset,protocol)
 Object.assign(f.env,{GITHUB_JOB:'missing-inventory-g1',FCF_INVENTORY_TARGET:'es-ct-segona-g1',FCF_CURRENT_INVENTORY_ID:f.source.child.inventory.artifactId,FCF_CURRENT_INVENTORY_DIGEST:f.source.child.inventory.artifactDigest,FCF_CURRENT_MANIFEST_SHA:f.source.child.inventory.manifestSha256});assert.equal((await runFcfMissingInventoryActions({...f.base(),argv:['audit']})).code,0)
 Object.assign(f.env,{GITHUB_JOB:'missing-inventory-receipt',FCF_G1_INVENTORY_ID:f.source.child.inventory.artifactId,FCF_G1_INVENTORY_DIGEST:f.source.child.inventory.artifactDigest,FCF_G1_MANIFEST_SHA:f.source.child.inventory.manifestSha256,FCF_G1_AUDIT_ID:f.source.child.audit.artifactId,FCF_G1_AUDIT_DIGEST:f.source.child.audit.artifactDigest,FCF_G1_AUDIT_MANIFEST_SHA:f.source.child.audit.manifestSha256});delete f.env.FCF_INVENTORY_TARGET
 assert.equal((await runFcfMissingInventoryActions({...f.base(),argv:['receipt']})).code,0);const receipt=JSON.parse(readFileSync(join(f.root,'fcf-inventory-final/manifest.json')));assert.equal(receipt.actualSourceGETs,300);assert.equal(receipt.protocol,protocol);assert.equal(f.sourceCalls.length,0)
})
test('new historical transport rejects unknown/missing final pins before GET and accounting cannot authorize source',async()=>{
 let calls=0;for(const source of [null,{}, {priorSourceGETs:60,verified:true}])await assert.rejects(()=>historyAPI.readFcfPostG1HistoryWire({source,github:async()=>{calls++;throw Error('forbidden GET')},now:Date.parse('2026-10-28T12:00:00Z')}),/FCF_/);assert.equal(calls,0)
})
import {tokRsc,vrsticeRsc} from './viri/fcf.mjs'
const walk=(v,fn)=>fn(Array.isArray(v)?v.map(v=>walk(v,fn)):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,v])=>[k,walk(v,fn)])):v)
test('TEST ONLY supplemental route/date/season/club/score/individual drift stays closed and fresh presentation is separate',actual,()=>{
 const bytes=approvedBody(),rewrite=fn=>{const rows=walk([...vrsticeRsc(tokRsc(bytes.toString()))],fn);return `<!doctype html><title>Acta: SYNTHETIC DRIFT</title><script>self.__next_f.push([1,${JSON.stringify(rows.map(([k,v])=>k+':'+JSON.stringify(v)).join('\n')+'\n')}])</script>`}
 const verify=html=>supplement.verifyFcfG1SupplementalObservation({targetSlug:'es-ct-segona-g1',id:'4109409',html})
 const presentation=verify(bytes.toString()+'\n<!-- SYNTHETIC fresh presentation -->');assert.notEqual(presentation.freshRawSha256,presentation.approvedOriginalSha256)
 for(const fn of [x=>x==='04.10.2026'?'05.10.2026':x,x=>x==='GRUP 1'?'GRUP 2':x,x=>x==='-'?'0':x,x=>x==='2026 / 27'?'2025 / 26':x,x=>x==='/ca/clubs/5002/categories/37524'?'/ca/clubs/5002/categories/37525':x,x=>x&&typeof x==='object'&&!Array.isArray(x)&&Array.isArray(x.c)?{...x,c:['','ca','competicio','acta','4109410']}:x,x=>x&&typeof x==='object'&&!Array.isArray(x)&&typeof x.className==='string'?{...x,player:{id:123,nombre:'SYNTHETIC'}}:x])assert.throws(()=>verify(rewrite(fn)),/FCF_/)
})
import {g1Bundle} from './fcf-g1-source-test-fixture.mjs'
import {readdirSync} from 'node:fs'
test('TEST ONLY fresh403 is spent61 and cannot refund prior60 or retry the consumed source',full,async t=>{
 const h=await ledgerFixture(),f=await g1ActionsFixture(t,{capture:false,postFailure:h.raw});Object.assign(f.env,{GITHUB_JOB:'missing-inventory-g1',FCF_INVENTORY_TARGET:'es-ct-segona-g1'});Object.assign(f.captureJob,{status:'in_progress',conclusion:null});Object.assign(f.captureJob.steps[0],{status:'in_progress',conclusion:null})
 assert.equal((await runFcfMissingInventoryActions({...f.base(),argv:['capture']})).code,1);assert.equal(f.sourceCalls.length,1)
 const directory=join(f.root,'fcf-missing-es-ct-segona-g1'),m=JSON.parse(readFileSync(join(directory,'manifest.json')));assert.equal(m.priorSourceGETs,60);assert.equal(m.actualSourceGETs,1);assert.equal(m.attempts[0].sequence,61)
 const entries=readdirSync(directory).map(name=>({name,body:readFileSync(join(directory,name))})),diagnostic=g1Bundle({entries,name:'fcf-missing-inventory-diagnostic-es-ct-segona-g1-124-1'});f.addArtifact(diagnostic);Object.assign(f.captureJob,{status:'completed',conclusion:'failure'});f.captureJob.steps=[{name:'Capture missing target inventory',status:'completed',conclusion:'failure'},{name:'Retain failed target inventory diagnostic',status:'completed',conclusion:'success'}]
 Object.assign(f.env,{GITHUB_JOB:'missing-inventory-receipt',FCF_G1_DIAGNOSTIC_ID:diagnostic.expected.artifactId,FCF_G1_DIAGNOSTIC_DIGEST:diagnostic.expected.artifactDigest,FCF_G1_MANIFEST_SHA:diagnostic.expected.manifestSha256});delete f.env.FCF_INVENTORY_TARGET
 assert.equal((await runFcfMissingInventoryActions({...f.base(),argv:['receipt']})).code,0);const final=JSON.parse(readFileSync(join(f.root,'fcf-inventory-final/manifest.json')));assert.equal(final.priorSourceGETs,60);assert.equal(final.newSourceGETs,1);assert.equal(final.actualSourceGETs,61);assert.equal(final.admissible,false);assert.equal(f.sourceCalls.length,1)
})
import {fcfSixPolicyIdHashes} from './fcf-six-historical-policy.mjs'
test('all three original six-entry policy hashes remain unchanged',()=>assert.deepEqual(fcfSixPolicyIdHashes(),{'es-ct-segona-g1-six-reviewed-2026-10-19-v1':'fbe3dbba425837b28a5fd7f99fa170a249e169a2f84d6c17921f202f7b25c6d9','es-ct-tercera-g2-six-reviewed-2026-10-19-v1':'69cf7d1406b1306ab1aa31413cdd37bf11b502e5f17f9cb7eab295502578fc52','es-ct-tercera-g9-six-reviewed-2026-10-19-v1':'38eca907c6b0f4df03a989778099f00b356d03626895de3961bad5e266bd3912'}))
const yaml=JSON.parse(execFileSync('ruby',['-ryaml','-rjson','-e','print JSON.generate(YAML.load_file(ARGV[0]))',new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url).pathname],{encoding:'utf8'}))
test('parsed workflow routes only one new-protocol G1 child with no DB or sibling source',()=>{
 const trigger=yaml.on??yaml.true;assert.equal(trigger.workflow_dispatch.inputs.preset.default,'g1-then-g9-missing-v1');assert.ok(trigger.workflow_dispatch.inputs.preset.options.includes(protocol));const inputs={mode:'missing-inventory',preset:protocol},needs=Object.fromEntries(['missing-inventory-approval','missing-inventory-consume','missing-inventory-g1'].map(k=>[k,{result:'success'}])),evalIf=x=>Function('github','inputs','needs','always','cancelled',`return (${x.replace(/needs\.([a-z0-9-]+)\.result/g,"needs['$1'].result")})`)({ref:'refs/heads/main',run_attempt:1},inputs,needs,()=>true,()=>false)
 assert.equal(evalIf(yaml.jobs['missing-inventory-g1'].if),true);assert.equal(evalIf(yaml.jobs['missing-inventory-g9'].if),false)
 for(const key of ['missing-inventory-g1','missing-inventory-consume','missing-inventory-receipt'])assert.doesNotMatch(JSON.stringify(yaml.jobs[key]),/SUPABASE|SERVICE_ROLE|DEPLOY_SSH_KEY|secrets\./)
})
