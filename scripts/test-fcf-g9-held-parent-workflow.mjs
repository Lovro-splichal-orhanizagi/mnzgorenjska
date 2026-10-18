import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const workflow=readFileSync(new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url),'utf8'),jobs=Object.fromEntries([...workflow.matchAll(/^  ([a-z0-9-]+):\n([\s\S]*?)(?=^  [a-z0-9-]+:\n|$(?![\s\S]))/gm)].map(m=>[m[1],m[2]]))
test('explicit new preset skips G1 and permits G9 only after its own approval and consumption',()=>{
 assert.match(workflow,/- g9-only-after-held-parent-v1/)
 assert.match(jobs['missing-inventory-g1'],/inputs\.preset == 'g1-then-g9-missing-v1'/)
 const g9=jobs['missing-inventory-g9'];assert.match(g9,/if: always\(\)/);assert.match(g9,/needs\.missing-inventory-approval\.result == 'success'/);assert.match(g9,/needs\.missing-inventory-consume\.result == 'success'/);assert.match(g9,/inputs\.preset == 'g9-only-after-held-parent-v1' \|\| needs\.missing-inventory-g1\.result == 'success'/)
 for(const name of ['missing-inventory-consume','missing-inventory-g1','missing-inventory-g9','missing-inventory-receipt'])assert.doesNotMatch(jobs[name],/contents: write|SUPABASE|secrets\./)
 assert.match(jobs['missing-inventory-receipt'],/if: always\(\)/)
})
test('new trusted source modules are included in writer runtime closure and source-free CI',()=>{
 const actions=readFileSync(new URL('./fcf-target-actions.mjs',import.meta.url),'utf8'),ci=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8')
 for(const name of ['fcf-held-parent-accounting','fcf-g9-held-parent-plan','fcf-inventory-source-protocol','fcf-inventory-source-wire','fcf-g9-held-parent-approval','fcf-missing-inventory-claim','fcf-missing-inventory-evidence'])assert.ok(actions.includes(`'scripts/${name}.mjs'`),name)
 for(const name of ['accounting','plan','claim','capture','evidence','actions','workflow'])assert.ok(ci.includes(`scripts/test-fcf-${name==='accounting'?'held-parent-accounting':'g9-held-parent-'+name}.mjs`),name)
})
