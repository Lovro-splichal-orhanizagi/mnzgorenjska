import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const workflow=readFileSync(new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url),'utf8'),jobs=Object.fromEntries([...workflow.matchAll(/^  ([a-z0-9-]+):\n([\s\S]*?)(?=^  [a-z0-9-]+:\n|$(?![\s\S]))/gm)].map(m=>[m[1],m[2]]))
test('explicit new preset skips G1 and permits G9 only after its own approval and consumption',()=>{
 assert.match(workflow,/- g9-only-after-held-parent-v1/)
 assert.equal(jobs['missing-inventory-g1'].match(/^    if: (.+)$/m)?.[1],"github.ref == 'refs/heads/main' && inputs.mode == 'missing-inventory' && (inputs.preset == 'g1-then-g9-missing-v1' || inputs.preset == 'six-reviewed-continuation-v1' || inputs.preset == 'future-g1-after-g9-v1' || inputs.preset == 'future-g1-after-failed-g1-v1') && github.run_attempt == 1")
 // The separately approved future G9 branch does not remove the held-parent
 // bypass or permit either branch to evade main/attempt/approval/consumption.
 assert.equal(jobs['missing-inventory-g9'].match(/^    if: (.+)$/m)?.[1],[
  'always()','!cancelled()',"github.ref == 'refs/heads/main'","inputs.mode == 'missing-inventory'",'github.run_attempt == 1',
  "needs.missing-inventory-approval.result == 'success'","needs.missing-inventory-consume.result == 'success'",
  "(inputs.preset == 'six-reviewed-continuation-v1' || inputs.preset == 'g9-only-after-held-parent-v1' || inputs.preset == 'future-g9-after-six-v1' || inputs.preset == 'g1-then-g9-missing-v1' && needs.missing-inventory-g1.result == 'success')",
 ].join(' && '))
 for(const name of ['missing-inventory-consume','missing-inventory-g1','missing-inventory-g9','missing-inventory-receipt'])assert.doesNotMatch(jobs[name],/contents: write|SUPABASE|secrets\./)
 assert.match(jobs['missing-inventory-receipt'],/if: always\(\)/)
})
test('new trusted source modules are included in writer runtime closure and source-free CI',()=>{
 const actions=readFileSync(new URL('./fcf-target-actions.mjs',import.meta.url),'utf8'),ci=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8')
 for(const name of ['fcf-held-parent-accounting','fcf-g9-held-parent-plan','fcf-inventory-source-protocol','fcf-inventory-source-wire','fcf-g9-held-parent-approval','fcf-missing-inventory-claim','fcf-missing-inventory-evidence'])assert.ok(actions.includes(`'scripts/${name}.mjs'`),name)
 for(const name of ['accounting','plan','claim','capture','evidence','actions','workflow'])assert.ok(ci.includes(`scripts/test-fcf-${name==='accounting'?'held-parent-accounting':'g9-held-parent-'+name}.mjs`),name)
})
