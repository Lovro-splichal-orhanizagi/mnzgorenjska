// Static parsed workflow contracts only. No Actions dispatch, source or DB IO.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {fcfFutureTargetStageContract} from './fcf-future-target-stage-evidence.mjs'
const path=fileURLToPath(new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url)),text=readFileSync(path,'utf8')
// Ruby's installed Psych parser validates actual YAML; its YAML1.1 resolver calls
// the unquoted GitHub `on` key true, which is normalized only in this test reader.
const doc=JSON.parse(execFileSync('ruby',['-ryaml','-rjson','-e','print JSON.generate(YAML.load_file(ARGV[0]))',path],{encoding:'utf8'})),jobs=doc.jobs,trigger=doc.on??doc.true
const modes={'future-target-mapping':'mapping','future-cleanup-prepare':'cleanup-prepare','future-cleanup-apply':'cleanup-apply','future-target-import':'import','future-target-price':'price','future-target-check':'check','future-target-activate':'activate','future-target-recover':'recover'}
const map=value=>JSON.parse(value.match(/fromJSON\('([^']+)'\)\[inputs\.mode\]/)?.[1]??'null')
const operation=job=>job.steps.find(s=>s.id==='operation'),retain=job=>job.steps.find(s=>s.uses==='actions/upload-artifact@v4')
test('parsed workflow exposes exactly the nine new future routes and preserves old defaults/source guards',()=>{
 const choices=trigger.workflow_dispatch.inputs.mode.options
 assert.deepEqual(choices.filter(m=>m.startsWith('future-')).sort(),['future-target-approval-stage',...Object.keys(modes)].sort())
 assert.equal(trigger.workflow_dispatch.inputs.mode.default,'cache-export');assert.equal(doc.concurrency.group,'fcf-reviewed-history-main');assert.equal(doc.concurrency['cancel-in-progress'],false)
 for(const mode of ['cache-export','seed-stage','missing-inventory','target-approval-stage','cleanup-originals','target-mapping','cleanup-prepare','cleanup-apply','target-import','target-price','target-check','target-activate','target-recover'])assert.ok(choices.includes(mode))
 assert.deepEqual(Object.keys(trigger),['workflow_dispatch']);assert.match(jobs['missing-inventory-consume'].if,/inputs.mode == 'missing-inventory'/);assert.equal(jobs['missing-inventory-consume'].if,"github.ref == 'refs/heads/main' && inputs.mode == 'missing-inventory'")
 assert.match(jobs['missing-inventory-g9'].if,/inputs.mode == 'missing-inventory'/);assert.match(jobs['missing-inventory-g9'].if,/github.run_attempt == 1/)
})
test('future approval is main/attempt1 GET-only staging with no DB/tunnel/write authority',()=>{
 const job=jobs['future-target-approval'];assert.ok(job);assert.equal(job.name,'future-target-approval');assert.match(job.if,/github.ref == 'refs\/heads\/main'/);assert.match(job.if,/github.run_attempt == 1/);assert.match(job.if,/inputs.mode == 'future-target-approval-stage'/)
 assert.deepEqual(job.permissions,{contents:'read',actions:'read'});assert.doesNotMatch(JSON.stringify(job),/SUPABASE|SERVICE_ROLE|DEPLOY_SSH_KEY|DEPLOY_KNOWN_HOSTS|contents.*write/)
 const op=operation(job);assert.equal(op.name,'Stage reviewed future FCF target approval');assert.equal(op.run,'node scripts/uvozi-fcf-prihodnji-cilj.mjs --mode approval-stage');assert.equal(op.env.GH_TOKEN,'${{ github.token }}');assert.equal(op.env.FCF_TARGET_ASSET_ID,'${{ inputs.asset_id }}');assert.equal(op.env.FCF_TARGET_ASSET_SHA256,'${{ inputs.asset_sha256 }}');assert.equal(retain(job).name,'Retain reviewed future FCF target approval')
})
test('future operational job has the exact closed mode/API-job/step contracts',()=>{
 const job=jobs['future-target'];assert.ok(job);assert.equal(job.name,'${{ inputs.mode }}');assert.match(job.if,/github.ref == 'refs\/heads\/main'/);assert.match(job.if,/github.run_attempt == 1/)
 const allowed=JSON.parse(job.if.match(/contains\(fromJSON\('([^']+)'\), inputs\.mode\)/)?.[1]??'null');assert.deepEqual(allowed.slice().sort(),Object.keys(modes).sort());assert.deepEqual(job.permissions,{contents:'read',actions:'read'})
 const op=operation(job),ret=retain(job),internal=map(op.env.FCF_FUTURE_TARGET_MODE),operationNames=map(op.name),retentionNames=map(ret.name);assert.deepEqual(internal,modes)
 for(const [mode,stage]of Object.entries(modes)){
  if(stage.startsWith('cleanup-')){assert.equal(operationNames[mode],stage==='cleanup-prepare'?'Prepare exact future six FCF cleanup before-image':'Apply exact future six FCF cleanup');assert.equal(retentionNames[mode],stage==='cleanup-prepare'?'Retain exact future FCF cleanup before-image':'Retain exact future FCF cleanup receipt')}
  else{const contract=fcfFutureTargetStageContract(stage);assert.equal(mode,contract.job);assert.equal(operationNames[mode],contract.steps[0]);assert.equal(retentionNames[mode],contract.steps[1])}
 }
 assert.equal(op.run,'node scripts/uvozi-fcf-prihodnji-cilj.mjs --mode "$FCF_FUTURE_TARGET_MODE"');assert.doesNotMatch(op.run,/\$\{\{.*inputs|eval|source |curl|wget/)
 for(const k of ['ID','RUN_ID','ATTEMPT','DIGEST','SHA256'])assert.ok(op.env['FCF_TARGET_APPROVAL_'+k])
})
test('future database authority is scoped by mutation mode and tunnel uses only the existing forward',()=>{
 const job=jobs['future-target'];assert.ok(job);const op=operation(job),service=op.env.SUPABASE_SERVICE_ROLE_KEY
 const mutation=JSON.parse(service.match(/contains\(fromJSON\('([^']+)'\), inputs\.mode\)/)?.[1]??'null');assert.deepEqual(mutation.slice().sort(),['future-cleanup-prepare','future-cleanup-apply','future-target-import','future-target-price','future-target-check','future-target-activate'].sort());assert.match(service,/&& secrets\.SUPABASE_SERVICE_ROLE_KEY \|\| ''/)
 assert.equal(op.env.SUPABASE_DB_URL,'${{ secrets.SUPABASE_DB_URL }}');assert.equal(op.env.SUPABASE_URL,'${{ secrets.SUPABASE_URL }}')
 const decision=job.steps.find(s=>s.id==='database'),tunnel=job.steps.find(s=>s.name==='Tunel do baze na VM');assert.match(decision.run,/@127\.0\.0\.1/);assert.match(decision.run,/exit 1/);assert.equal(tunnel.if,"steps.database.outputs.tunel == 'da'");assert.deepEqual(Object.keys(tunnel.env).sort(),['KLJUC','ZNANI']);assert.match(tunnel.run,/ssh -fN -o ExitOnForwardFailure=yes -L 5432:127\.0\.0\.1:5432 deploy@2\.31\.6\.53/);assert.doesNotMatch(tunnel.run,/scp|rsync|ssh .* (?:bash|sh|sudo|docker)/)
 assert.doesNotMatch(JSON.stringify(job),/fcf\.cat|--dovoli-aktivno|cache\/save|include-all|contents.*write/)
})
test('both future jobs pin checkout/Node22 and retain only safe ready writer output',()=>{
 for(const name of ['future-target-approval','future-target']){const job=jobs[name];assert.ok(job);const checkout=job.steps.find(s=>s.uses==='actions/checkout@v4'),node=job.steps.find(s=>s.uses==='actions/setup-node@v4'),ret=retain(job);assert.equal(checkout.with['persist-credentials'],false);assert.equal(checkout.with.ref,'${{ github.sha }}');assert.equal(node.with['node-version'],'22');assert.ok(job.steps.some(s=>s.run==='npm ci'));assert.equal(ret.if,"success() && steps.operation.outputs.evidence_ready == 'true'");assert.equal(ret.with.name,'${{ steps.operation.outputs.artifact_name }}');assert.equal(ret.with.path,'${{ steps.operation.outputs.artifact_directory }}');assert.equal(ret.with['if-no-files-found'],'error');assert.equal(ret.with['retention-days'],30);assert.equal(job.outputs.manifest_sha,'${{ steps.operation.outputs.manifest_sha }}')}
})
