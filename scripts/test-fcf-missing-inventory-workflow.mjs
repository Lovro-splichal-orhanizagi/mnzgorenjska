import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
const text=readFileSync(new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url),'utf8')
test('new mode holds source behind exact plan/claim/consumption and sequential child audits',()=>{
 for(const token of['missing-inventory-consume:','missing-inventory-g1:','missing-inventory-g9:','missing-inventory-receipt:','seed-stage','g1-then-g9-missing-v1','Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption','Capture missing target inventory','Retain complete target inventory','Audit retained target inventory offline','Retain target inventory offline audit','Retain final FCF inventory receipt','fcf-missing-inventory-actions.mjs'])assert.ok(text.includes(token),token)
 assert.match(text,/needs:.*missing-inventory-g1/);assert.match(text,/always\(\)/);assert.match(text,/overwrite: false/)
 const source=text.slice(text.indexOf('missing-inventory-consume:'));assert.doesNotMatch(source,/SUPABASE|SERVICE_ROLE|cache\/save|uvozi-zapisnike|fcfFetch|secrets\./);assert.match(source,/actions: read/)
})
test('actual capture entry point has an explicit source-free staging route and no repository mutation client',()=>{const path=new URL('./fcf-missing-inventory-actions.mjs',import.meta.url);assert.ok(existsSync(path));const source=readFileSync(path,'utf8');for(const token of['prepare-approval','pack-seed','seed-stage','consume','capture','audit','receipt','claim-template'])assert.ok(source.includes(token),token);assert.doesNotMatch(source,/['"]POST['"]|['"]PATCH['"]|['"]DELETE['"]|SUPABASE_SERVICE_ROLE_KEY\s*:/)})
test('old cache-export contract remains exact and source-free',()=>{assert.match(text,/inputs.mode == 'cache-export'/);assert.match(text,/Restore only the reviewed exact cache/);assert.match(text,/fcf-history-cache-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/);assert.match(text,/persist-credentials: false/);assert.match(text,/cancel-in-progress: false/)})
