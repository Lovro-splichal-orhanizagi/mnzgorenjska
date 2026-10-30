import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const text=readFileSync(new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url),'utf8'),jobs=Object.fromEntries([...text.matchAll(/^  ([a-z0-9-]+):\n([\s\S]*?)(?=^  [a-z0-9-]+:\n|$(?![\s\S]))/gm)].map(m=>[m[1],m[2]]))
test('only reviewed legacy staging and the explicit refresh800 job have bounded draft access',()=>{
 const writable=Object.entries(jobs).filter(([,body])=>/contents: write/.test(body)).map(([name])=>name).sort();assert.deepEqual(writable,['cleanup-originals','future-target-approval','missing-inventory-approval','missing-inventory-seed','refresh800-capture','target-approval'])
 for(const name of writable)assert.doesNotMatch(jobs[name],/SUPABASE|SERVICE_ROLE|DEPLOY_SSH_KEY|--mode capture/)
 for(const name of['missing-inventory-consume','missing-inventory-g1','missing-inventory-g9','missing-inventory-receipt'])assert.doesNotMatch(jobs[name],/SUPABASE|SERVICE_ROLE|secrets\.|contents: write/)
})
test('exact cleanup reader job/step/artifact contracts and explicit unchanged default',()=>{
 assert.match(text,/default: cache-export/);assert.match(text,/group: fcf-reviewed-history-main\n  cancel-in-progress: false/)
 for(const [name,op,ret,artifact]of[['cleanup-prepare','Prepare exact four FCF cleanup before-image','Retain exact FCF cleanup before-image','fcf-history-cleanup-prepared'],['cleanup-apply','Apply exact four FCF cleanup','Retain exact FCF cleanup receipt','fcf-history-cleanup-applied']]){assert.ok(jobs[name].includes(op));assert.ok(jobs[name].includes(ret));assert.ok(jobs[name].includes(artifact+'-${{ github.run_id }}-${{ github.run_attempt }}'));assert.match(jobs[name],/permissions:\n      contents: read\n      actions: read/)}
})
test('every writer is explicit main-only, independently approved, DB-tunnel scoped and records actual target artifact',()=>{
 for(const name of['target-mapping','cleanup-prepare','cleanup-apply','target-import','target-price','target-check','target-activate','target-recover']){const body=jobs[name];assert.match(body,new RegExp(`inputs.mode == '${name}'`));assert.match(body,/github.ref == 'refs\/heads\/main'/);for(const k of['ID','RUN_ID','ATTEMPT','DIGEST','SHA256'])assert.ok(body.includes('FCF_TARGET_APPROVAL_'+k+':'));assert.match(body,/SUPABASE_DB_URL:.*secrets.SUPABASE_DB_URL/);assert.match(body,/-L 5432:127.0.0.1:5432 deploy@2.31.6.53/);assert.match(body,/persist-credentials: false/);assert.doesNotMatch(body,/contents: write|--dovoli-aktivno|cache\/save|include-all/)}
})

test('approved refresh800 draft read remains GET-only, no-DB and behind the protected one-shot claim',()=>{
 const job=jobs['refresh800-capture'];assert.ok(job)
 assert.match(job,/permissions:\n      contents: write\n      actions: read/)
 assert.match(job,/if: github.ref == 'refs\/heads\/main' && inputs.mode == 'missing-inventory' && inputs.preset == 'fcf-fixed-target-refresh800-v1' && github.run_attempt == 1/)
 assert.doesNotMatch(job,/SUPABASE|SERVICE_ROLE|DEPLOY_SSH_KEY|DEPLOY_KNOWN_HOSTS|secrets\./)
 const reserve=job.indexOf('run: node scripts/fcf-refresh800-actions.mjs reserve'),claim=job.indexOf('run: node scripts/fcf-refresh800-actions.mjs wait-claim'),capture=job.indexOf('run: node scripts/fcf-refresh800-actions.mjs capture');assert.ok(reserve>=0&&reserve<claim&&claim<capture)
 const execution=readFileSync(new URL('./fcf-refresh800-execution.mjs',import.meta.url),'utf8'),collector=readFileSync(new URL('./fcf-refresh800-capture.mjs',import.meta.url),'utf8'),transport=readFileSync(new URL('./fcf-inventory-github.mjs',import.meta.url),'utf8')
 assert.ok(execution.includes('refs/tags/fcf-inventory-claim/refresh800-after-'));assert.ok(execution.includes("claim.kind==='fcf-refresh800-one-shot-claim'"));assert.ok(execution.includes("claim.runAttempt==='1'"));assert.ok(execution.includes('claim.planSha256===a.plan.planSha256'))
 assert.ok(transport.includes("'--method','GET'"));assert.ok(collector.includes("await fetch(a.url,{method:'GET',redirect:'manual'"));assert.doesNotMatch(execution+collector+transport,/SUPABASE|SERVICE_ROLE|['"](?:POST|PUT|PATCH|DELETE)['"]/)
 const consumed=collector.indexOf("durable(join(root,'consumed-claim.json')"),get=collector.indexOf('await fetch(a.url');assert.ok(consumed>=0&&get>consumed)
})
