import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const text=readFileSync(new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url),'utf8'),jobs=Object.fromEntries([...text.matchAll(/^  ([a-z0-9-]+):\n([\s\S]*?)(?=^  [a-z0-9-]+:\n|$(?![\s\S]))/gm)].map(m=>[m[1],m[2]]))
test('only source-free seed/approval/originals stages have bounded draft access',()=>{
 const writable=Object.entries(jobs).filter(([,body])=>/contents: write/.test(body)).map(([name])=>name).sort();assert.deepEqual(writable,['cleanup-originals','future-target-approval','missing-inventory-approval','missing-inventory-seed','target-approval'])
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
