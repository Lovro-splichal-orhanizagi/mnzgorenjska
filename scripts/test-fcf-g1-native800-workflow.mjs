// TEST ONLY: fixed workflow authorization/job/artifact contract; no API or database.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const text=readFileSync('.github/workflows/fcf-g1-native800.yml','utf8')
test('G1 native800 workflow has one root-only manual fixed-head four-job chain',()=>{
 assert.match(text,/^permissions:\s*\{\}\s*$/m)
 assert.match(text,/workflow_dispatch:/)
 assert.match(text,/expected_sha:[\s\S]*?required:\s*true/)
 assert.match(text,/github\.event_name == 'workflow_dispatch'[\s\S]*?github\.ref == 'refs\/heads\/main'[\s\S]*?github\.run_attempt == 1[\s\S]*?inputs\.expected_sha == github\.sha[\s\S]*?github\.actor == 'nejcar20'[\s\S]*?github\.actor_id == '25134229'[\s\S]*?github\.triggering_actor == 'nejcar20'/)
 const jobs=[...text.matchAll(/^  (native800-[a-z]+):\n/gm)].map(x=>x[1])
 assert.deepEqual(jobs,['native800-import','native800-price','native800-check','native800-activate'])
 assert.match(text,/native800-price:\n    needs: native800-import/)
 assert.match(text,/native800-check:\n    needs: native800-price/)
 assert.match(text,/native800-activate:\n    needs: native800-check/)
 assert.match(text,/&& inputs\.activate_if_ready/)
 assert.doesNotMatch(text,/pull_request:|schedule:|workflow_run:/)
})
test('G1 native800 jobs use only bounded G1 operator and private artifact names',()=>{
 assert.equal((text.match(/scripts\/fcf-g1-native800-operator\.mjs/g)||[]).length,9)
 assert.doesNotMatch(text,/scripts\/fcf-native800-operator\.mjs/)
 for(const stage of ['preview','import','price','check','activate']){
  assert.match(text,new RegExp(`name: g1-native800-${stage}-\\$\\{\\{ github\\.run_id \\}\\}-1`))
  assert.match(text,new RegExp(`path: g1-native800-${stage}\\/(?:manifest\\.json)?`))
 }
 for(const job of ['native800-import','native800-price','native800-check','native800-activate']){
  const body=text.split(`  ${job}:`)[1].split(/^  native800-/m)[0]
  assert.match(body,/contents: write/)
  assert.match(body,/actions: read/)
  assert.doesNotMatch(body,/id-token: write|packages: write|deployments: write/)
 }
})
