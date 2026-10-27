// TEST ONLY GitHub GET map: genuine retained failed37 history, synthetic future
// proposal/root approval. This never asserts a successful fresh capture.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {deserialize,serialize} from 'node:v8'
import {postSixAccountingWire} from './fcf-post-six-accounting-test-fixture.mjs'
import {readFcfPostSixAccounting} from './fcf-post-six-accounting.mjs'
import {buildFcfFutureSourcePlan,fcfFutureSourceClaimRef,getFcfFutureSourcePlanAccounting} from './fcf-future-source-plan.mjs'
import {snapshotFcfInventoryRuleset,requireFcfInventoryConsumption,requireFcfInventoryExecutionClaim} from './fcf-missing-inventory-claim.mjs'
import {getFcfCapturedTargetData} from './fcf-missing-inventory-evidence.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const api=await import('./fcf-future-source-approval.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}})
const call=(name,input)=>{assert.equal(typeof api[name],'function',`${name} required`);return api[name](input)}
const copy=x=>deserialize(serialize(x)),repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',now=Date.parse('2026-10-27T12:00:00Z'),sourceCommit='a'.repeat(40)
const genuine={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR?false:'Explicit genuine retained37 evidence directory required; no live reauthentication claimed'}
let cached
function fixture(){
 if(!cached){
  const raw=postSixAccountingWire(),prior=JSON.parse(readFileSync(join(process.env.FCF_POST_SIX_EVIDENCE_DIR,'approval-manifest.json'))).history
  const g=raw.latest,source={prior,latest:{plan:g.plan,claim:{execution:g.claim.execution,expected:g.claim.expected},consumption:g.consumption.expected,children:g.children.map(b=>b.expected),finalReceipt:g.finalReceipt.expected}}
  const map=new Map(),jobs=new Map(),runs=new Map(),put=(p,v)=>map.set(repo+p,v)
  function visit(v){
   if(!v||typeof v!=='object'||Buffer.isBuffer(v))return
   if(v.zipBytes&&v.expected){put(`actions/artifacts/${v.expected.artifactId}`,v.artifact);put(`actions/artifacts/${v.expected.artifactId}/zip`,v.zipBytes)}
   if(v.run&&v.jobs){const id=String(v.run.id),key=`${id}/attempts/${v.run.run_attempt}`,rows=jobs.get(key)??new Map();for(const j of v.jobs){const prev=rows.get(j.id);if(!prev||j.status==='completed'||prev.status!=='completed')rows.set(j.id,j)}jobs.set(key,rows);const prev=runs.get(id);if(!prev||v.run.status==='completed'||prev.status!=='completed')runs.set(id,v.run)}
   if(v.claimCommit&&v.ref){put(`git/ref/${v.ref.ref.slice(5)}`,v.ref);for(const [key,path]of [['commit','commits'],['tree','trees'],['blob','blobs']])put(`git/${path}/${v.claimCommit[key].sha}`,v.claimCommit[key]);for(const r of v.rulesets)put(`rulesets/${r.id}`,r)}
   Object.values(v).forEach(visit)
  }
  visit(raw)
  for(const [id,r]of runs)put(`actions/runs/${id}`,r)
  for(const [key,rows]of jobs)put(`actions/runs/${key}/jobs?per_page=100&page=1`,{total_count:rows.size,jobs:[...rows.values()]})
  const snapshot=snapshotFcfInventoryRuleset({ruleset:g.claim.rulesets[0],checkedUTC:new Date(now).toISOString(),now})
  const plan=buildFcfFutureSourcePlan({sourceCommit,accountingProof:readFcfPostSixAccounting(raw),rulesetSnapshotSha256:hash(snapshot),now})
  cached={source,map,approval:{schemaVersion:4,kind:'fcf-future-source-approval',sourceCommit,plan,history:source,rulesetId:String(snapshot.ruleset.id),rulesetSnapshot:snapshot}}
 }
 const f=copy(cached);f.calls=[];f.github=async(path,binary=false)=>{f.calls.push([path,binary]);assert.ok(path.startsWith(repo));assert.equal(binary,path.endsWith('/zip'));assert.ok(f.map.has(path),`unexpected test GET ${path}`);return copy(f.map.get(path))};return f
}
const read=f=>call('readFcfPostSixHistoryWire',{source:f.source,github:f.github,now})
const approval=(f,overrides={})=>call('readFcfFutureSourceApproval',{bytes:Buffer.from(JSON.stringify(f.approval)),sourceCommit,github:f.github,now,...overrides})
const rehash=p=>{const {planSha256,...body}=p;p.planSha256=hash(body)}

test('new history and approval APIs reject caller assertions',async()=>{
 for(const name of ['readFcfPostSixHistoryWire','readFcfFutureSourceApproval'])assert.equal(typeof api[name],'function',`${name} required`)
 for(const source of [null,{}, {priorSourceGETs:37,verified:true}])await assert.rejects(()=>call('readFcfPostSixHistoryWire',{source,github:async()=>assert.fail('GET forbidden'),now}),/FCF_INVENTORY/)
})
test('GET-only actual terminal history reconstructs37 and preserves original source timestamps',genuine,async()=>{
 const f=fixture(),wire=await read(f),p=readFcfPostSixAccounting(wire)
 assert.equal(p.priorSourceGETs,37);assert.equal(p.remainingSourceGETs,441);assert.equal(p.admissible,false)
 assert.deepEqual(wire.latest.plan,f.source.latest.plan);assert.equal(wire.latest.children[0].expected.artifactId,'12180422913')
 assert.ok(f.calls.some(([p])=>p===repo+`git/ref/tags/fcf-inventory-claim/six-after-${f.source.latest.plan.historySha256}`))
 assert.ok(f.calls.every(([p])=>/^repos\/Lovro-splichal-orhanizagi\/mnzgorenjska\/(?:actions|git|rulesets)\//.test(p)))
 assert.equal(wire.latest.finalReceipt.run.status,'completed');assert.equal(wire.latest.finalReceipt.run.conclusion,'failure')
})
test('schema4 approval registers exact future plan with actual37 but grants no capture or claim',genuine,async()=>{
 const f=fixture(),a=await approval(f)
 assert.deepEqual(a,f.approval);assert.equal(getFcfFutureSourcePlanAccounting(a.plan).priorSourceGETs,37)
 assert.equal(fcfFutureSourceClaimRef(a.plan),`refs/tags/fcf-inventory-claim/future-g9-after-${a.plan.historySha256}`)
 for(const require of [requireFcfInventoryConsumption,requireFcfInventoryExecutionClaim])assert.throws(()=>require(a),/FCF_INVENTORY/)
 assert.throws(()=>getFcfCapturedTargetData({targetEvidence:a,targetSlug:'es-ct-tercera-g9',now}),/FCF_INVENTORY/)
 assert.throws(()=>getFcfFutureSourcePlanAccounting(structuredClone(a.plan)),/FCF_INVENTORY/)
})
for(const [name,mutate]of[
 ['unknown root flag',s=>s.verified=true],['missing latest',s=>delete s.latest],['claim hash',s=>s.latest.claim.expected.claimJsonSha256='b'.repeat(64)],
 ['claim source SHA',s=>s.latest.claim.execution.sourceCommit='b'.repeat(40)],['claim attempt2',s=>s.latest.claim.expected.runAttempt='2'],
 ['plan hash',s=>s.latest.plan.planSha256='b'.repeat(64)],['plan history hash',s=>s.latest.plan.historySha256='b'.repeat(64)],
 ['missing artifact pin',s=>delete s.latest.consumption.manifestSha256],['changed artifact ID',s=>s.latest.children[0].artifactId='123'],
 ['changed ZIP pin',s=>s.latest.children[1].artifactDigest='sha256:'+'b'.repeat(64)],['wrong job',s=>s.latest.finalReceipt.jobId='123'],
 ['swapped children',s=>s.latest.children.reverse()],['missing child',s=>s.latest.children.pop()],['extra latest flag',s=>s.latest.admissible=false],
])test(`preflight refuses ${name} before any GET`,genuine,async()=>{const f=fixture();mutate(f.source);await assert.rejects(()=>read(f),/FCF_INVENTORY/);assert.equal(f.calls.length,0)})
for(const [name,mutate]of[
 ['incomplete jobs',f=>{const k=repo+'actions/runs/39238757730/attempts/1/jobs?per_page=100&page=1';f.map.get(k).total_count++}],
 ['changed claim ref',f=>{const k=repo+`git/ref/tags/fcf-inventory-claim/six-after-${f.source.latest.plan.historySha256}`;f.map.get(k).object.sha='b'.repeat(40)}],
 ['changed claim bytes',f=>{const row=[...f.map.entries()].find(([k])=>k===repo+`git/blobs/${postSixAccountingWire().latest.claim.claimCommit.blob.sha}`);row[1].content=Buffer.from('{}').toString('base64')}],
 ['changed no-bypass rule',f=>f.map.get(repo+'rulesets/25355545').bypass_actors=[{actor_id:1,actor_type:'RepositoryRole',bypass_mode:'always'}]],
 ['changed raw ZIP',f=>f.map.get(repo+'actions/artifacts/12180422913/zip')[400]^=1],
 ['changed actual digest',f=>f.map.get(repo+'actions/artifacts/12181255579').digest='sha256:'+'b'.repeat(64)],
 ['historical count refund',f=>f.source.prior.g9.plan.priorSourceGETs=0],
 ['asserted prior proof',f=>f.source.prior={priorSourceGETs:22}],
])test(`history independently refuses ${name}`,genuine,async()=>{const f=fixture();mutate(f);await assert.rejects(()=>read(f))})
test('jobs pagination obtains the whole run without accepting a truncated page',genuine,async()=>{
 const f=fixture(),key=repo+'actions/runs/39238757730/attempts/1/jobs?per_page=100&page=',actual=f.map.get(key+'1').jobs
 const filler=Array.from({length:101-actual.length},(_,i)=>({id:900000+i,name:`TEST ONLY unrelated job ${i}`})),all=[...actual,...filler]
 f.map.set(key+'1',{total_count:101,jobs:all.slice(0,100)});f.map.set(key+'2',{total_count:101,jobs:all.slice(100)})
 const p=readFcfPostSixAccounting(await read(f));assert.equal(p.priorSourceGETs,37);assert.ok(f.calls.some(([p])=>p===key+'2'))
})
for(const [name,mutate]of[
 ['schema3',a=>a.schemaVersion=3],['wrong kind',a=>a.kind='fcf-six-continuation-approval'],['source SHA mismatch',a=>a.sourceCommit='b'.repeat(40)],
 ['plan source SHA mismatch',a=>{a.plan.sourceCommit='b'.repeat(40);rehash(a.plan)}],['caller readiness',a=>a.admissible=true],
 ['ruleset ID mismatch',a=>a.rulesetId='123'],['missing bypass metadata',a=>delete a.rulesetSnapshot.ruleset.bypass_actors],
 ['ruleset snapshot hash mismatch',a=>a.rulesetSnapshot.checkedUTC='2026-10-27T11:59:00.000Z'],
 ['37 reset to22',a=>{a.plan.priorSourceGETs=22;rehash(a.plan)}],['517 cap',a=>{a.plan.maximumCumulativeSourceGETs=517;rehash(a.plan)}],
 ['serialized proof in history',a=>a.history=structuredClone(a.plan.accountingBinding)],
])test(`root approval refuses ${name}`,genuine,async()=>{const f=fixture();mutate(f.approval);await assert.rejects(()=>approval(f),/FCF_INVENTORY/)})
test('stale future plan is refused',genuine,async()=>{
 const f=fixture();await assert.rejects(()=>approval(f,{now:now+86400001}),/FCF_INVENTORY/)
})
test('read-only current API may omit bypass actors only with unchanged full root attestation',genuine,async()=>{
 const f=fixture();delete f.map.get(repo+'rulesets/25355545').bypass_actors
 const a=await approval(f)
 assert.deepEqual(a.rulesetSnapshot.ruleset.bypass_actors,[])
 assert.equal(Object.hasOwn(f.map.get(repo+'rulesets/25355545'),'bypass_actors'),false)
 assert.equal(getFcfFutureSourcePlanAccounting(a.plan).priorSourceGETs,37)
})
for(const [name,mutate]of[
 ['exposed bypass actor',r=>r.bypass_actors=[{actor_id:1,actor_type:'RepositoryRole',bypass_mode:'always'}]],
 ['nonarray exposed bypass actors',r=>r.bypass_actors=null],
 ['changed updated_at',r=>r.updated_at='2026-10-27T11:59:00.000Z'],
 ['changed visible rules',r=>r.rules.push({type:'creation'})],
])test(`current root check refuses ${name}`,genuine,async()=>{
 const f=fixture(),get=f.github;let rulesetReads=0
 f.github=async(path,binary)=>{
  const result=await get(path,binary)
  // The first three reads replay exact historical claims. Change only the
  // fourth/current approval read so the new root verifier is what rejects it.
  if(path===repo+'rulesets/25355545'&&++rulesetReads===4)mutate(result)
  return result
 }
 await assert.rejects(()=>approval(f),/FCF_INVENTORY/)
 assert.equal(rulesetReads,4)
})
for(const [name,mutate]of[
 ['changed pagination total',(first,second)=>second.total_count++],
 ['duplicate job across pages',(first,second)=>second.jobs[0]=first.jobs[0]],
 ['oversized jobs page',first=>first.jobs.push(first.jobs[0])],
])test(`complete jobs pagination refuses ${name}`,genuine,async()=>{
 const f=fixture(),key=repo+'actions/runs/39238757730/attempts/1/jobs?per_page=100&page=',actual=f.map.get(key+'1').jobs
 const all=[...actual,...Array.from({length:101-actual.length},(_,i)=>({id:900000+i,name:`TEST ONLY unrelated ${i}`}))]
 const first={total_count:101,jobs:all.slice(0,100)},second={total_count:101,jobs:all.slice(100)};mutate(first,second)
 f.map.set(key+'1',first);f.map.set(key+'2',second);await assert.rejects(()=>read(f),/FCF_INVENTORY/)
})
test('nested prior transport cannot forward an arbitrary path from API metadata',genuine,async()=>{
 const f=fixture(),claim=postSixAccountingWire().prior.g9.claim
 f.map.get(repo+`git/commits/${claim.claimCommit.commit.sha}`).tree.sha='../../outside-repository'
 await assert.rejects(()=>read(f),/FCF_INVENTORY: fixed GitHub GET path/)
 assert.ok(f.calls.every(([p])=>!p.includes('..')))
})
