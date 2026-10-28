// TEST ONLY: genuine raw offline evidence; no fabricated production success.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {deserialize,serialize} from 'node:v8'
import {execFileSync} from 'node:child_process'
import {rawSha256 as sha} from './fcf-missing-inventory-artifact.mjs'
const evidenceDirectory=process.env.FCF_POST_SIX_EVIDENCE_DIR
let cached
export function postSixAccountingWire(){
 if(cached)return deserialize(serialize(cached))
 const json=name=>JSON.parse(readFileSync(join(evidenceDirectory,name),'utf8'))
 const approval=json('approval-manifest.json'),run=json('run.json'),jobs=json('jobs.json').jobs,artifacts=json('artifacts.json').artifacts
 const claimBytes=readFileSync(join(evidenceDirectory,'claim.json')),claim=JSON.parse(claimBytes)
 const manifest=id=>JSON.parse(execFileSync('unzip',['-p',join(evidenceDirectory,`${id}.zip`),'manifest.json']))
 const bundle=(id,jobId)=>{
  const artifact=artifacts.find(a=>String(a.id)===id),m=manifest(id)
  assert.ok(artifact,`retained artifact ${id} metadata required`)
  return {zipBytes:readFileSync(join(evidenceDirectory,`${id}.zip`)),artifact,run,jobs,expected:{
   runId:'39238757730',runAttempt:'1',sourceCommit:approval.sourceCommit,artifactId:id,jobId,artifactDigest:artifact.digest,
   manifestSha256:sha(execFileSync('unzip',['-p',join(evidenceDirectory,`${id}.zip`),'manifest.json'])),name:artifact.name,
   ...(m.childPlanSha256?{planSha256:m.planSha256,childPlanSha256:m.childPlanSha256}:{})}}
 }
 cached={prior:deserialize(readFileSync(join(evidenceDirectory,'prior-history-input.v8'))),latest:{
  plan:approval.plan,
  claim:{execution:{repository:claim.repository,workflow:claim.workflow,ref:'refs/heads/main',sourceCommit:claim.sourceCommit,runId:claim.runId,runAttempt:claim.runAttempt},ref:json('claim-ref.json'),claimCommit:{commit:json('claim-commit.json'),tree:json('claim-tree.json'),blob:json('claim-blob.json')},claimBytes,rulesets:[json('ruleset.json')],expected:{runId:'39238757730',runAttempt:'1',sourceCommit:approval.sourceCommit,planSha256:approval.plan.planSha256,claimCommit:'ba9fbf21405296f9f73552618b76d7b7fbe86c96',claimJsonSha256:sha(claimBytes),rulesetId:approval.rulesetId}},
  consumption:bundle('12179959409','118014326185'),children:[bundle('12180422913','118016079028'),bundle('12181255579','118016893375')],finalReceipt:bundle('12180274909','118017966735')
 },now:Date.parse('2026-10-27T12:00:00Z')}
 return deserialize(serialize(cached))
}
