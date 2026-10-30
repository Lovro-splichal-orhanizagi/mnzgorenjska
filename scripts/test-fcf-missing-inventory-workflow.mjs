import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
const text=readFileSync(new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url),'utf8')
test('new mode holds source behind exact plan/claim/consumption and sequential child audits',()=>{
 for(const token of['missing-inventory-consume:','missing-inventory-g1:','missing-inventory-g9:','missing-inventory-receipt:','seed-stage','g1-then-g9-missing-v1','Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption','Capture missing target inventory','Retain complete target inventory','Audit retained target inventory offline','Retain target inventory offline audit','Retain final FCF inventory receipt','fcf-missing-inventory-actions.mjs'])assert.ok(text.includes(token),token)
 assert.match(text,/needs:.*missing-inventory-g1/);assert.match(text,/always\(\)/);assert.match(text,/overwrite: false/)
 const source=text.slice(text.indexOf('missing-inventory-consume:'),text.indexOf('\n  target-approval:'));assert.doesNotMatch(source,/SUPABASE|SERVICE_ROLE|cache\/save|uvozi-zapisnike|fcfFetch|secrets\./);assert.match(source,/actions: read/)
})
test('actual capture entry point has an explicit source-free staging route and no repository mutation client',()=>{const path=new URL('./fcf-missing-inventory-actions.mjs',import.meta.url);assert.ok(existsSync(path));const source=readFileSync(path,'utf8');for(const token of['prepare-approval','pack-seed','seed-stage','consume','capture','audit','receipt','claim-template'])assert.ok(source.includes(token),token);assert.doesNotMatch(source,/['"]POST['"]|['"]PATCH['"]|['"]DELETE['"]|SUPABASE_SERVICE_ROLE_KEY\s*:/)})
test('old cache-export contract remains exact and source-free',()=>{assert.match(text,/inputs.mode == 'cache-export'/);assert.match(text,/Restore only the reviewed exact cache/);assert.match(text,/fcf-history-cache-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/);assert.match(text,/persist-credentials: false/);assert.match(text,/cancel-in-progress: false/)})

test('private draft bridges and explicit GET-only refresh have contents write; legacy consumers keep immutable approval',()=>{
 const jobs=Object.fromEntries([...text.matchAll(/^  ([a-z0-9-]+):\n([\s\S]*?)(?=^  [a-z0-9-]+:\n|$(?![\s\S]))/gm)].map(m=>[m[1],m[2]]))
 for(const name of['missing-inventory-seed','missing-inventory-approval']){assert.match(jobs[name]??'',/permissions:\n      contents: write\n      actions: read/);assert.doesNotMatch(jobs[name],/SUPABASE|SERVICE_ROLE|secrets\.|capture|consume/)}
 assert.match(jobs['missing-inventory-approval'],/Stage reviewed FCF inventory approval/);assert.match(jobs['missing-inventory-approval'],/Retain reviewed FCF inventory approval/);assert.match(jobs['missing-inventory-approval'],/fcf-inventory-approval-\$\{\{ github.run_id \}\}-1/);assert.match(jobs['missing-inventory-approval'],/overwrite: false/)
 for(const name of['missing-inventory-consume','missing-inventory-g1','missing-inventory-g9','missing-inventory-receipt']){
  const job=jobs[name];assert.match(job,/needs: \[[^\n]*missing-inventory-approval/);assert.match(job,/permissions:\n      contents: read\n      actions: read/);assert.doesNotMatch(job,/contents: write|FCF_INVENTORY_ASSET_ID/)
  for(const key of['ID','DIGEST','MANIFEST_SHA'])assert.match(job,new RegExp(`FCF_APPROVAL_${key}: \\$\\{\\{ needs\\.missing-inventory-approval\\.outputs\\.`))
 }
 assert.match(jobs['refresh800-capture'],/Private draft visibility requires push permission; transport is GET-only/);assert.doesNotMatch(jobs['refresh800-capture'],/SUPABASE|SERVICE_ROLE|secrets\./)
 const transport=readFileSync(new URL('./fcf-inventory-github.mjs',import.meta.url),'utf8'),getStart=transport.indexOf('export async function getFcfInventoryGithub('),getEnd=transport.indexOf('\nexport async function readFcfDraftAsset',getStart),getSource=transport.slice(getStart,getEnd)
 assert.ok(getStart>=0&&getEnd>getStart,'fixed inventory GET transport exists');assert.match(getSource,/!path\.startsWith\(repo\).*path\.includes\('\.\.'\)/);assert.ok(getSource.includes("'--method'")&&getSource.includes("'GET'"));assert.doesNotMatch(getSource,/['"](?:POST|PATCH|PUT|DELETE)['"]/)
 const writeJobs=Object.entries(jobs).filter(([,job])=>/^      contents: write$/m.test(job)).map(([name])=>name).sort()
 assert.deepEqual(writeJobs,['missing-inventory-seed','missing-inventory-approval','target-approval','cleanup-originals','future-target-approval','refresh800-capture'].sort())
})
