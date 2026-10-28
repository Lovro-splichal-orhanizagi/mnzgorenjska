import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
const path=new URL('../.github/workflows/uvoz-fcf-zgodovina.yml',import.meta.url).pathname,yaml=JSON.parse(execFileSync('ruby',['-ryaml','-rjson','-e','print JSON.generate(YAML.load_file(ARGV[0]))',path],{encoding:'utf8'})),preset='g1-post83-remainder-quarantine-v1'
const evaluate=x=>Function('github','inputs','needs','always','cancelled',`return (${x.replace(/needs\.([a-z0-9-]+)\.result/g,"needs['$1'].result")})`)({ref:'refs/heads/main',run_attempt:1},{mode:'missing-inventory',preset},{'missing-inventory-approval':{result:'success'},'missing-inventory-consume':{result:'success'},'missing-inventory-g1':{result:'success'}},()=>true,()=>false)
test('new route runs only G1, fixed old verifier and unchanged source coordination workflow',()=>{
 assert.ok((yaml.on??yaml.true).workflow_dispatch.inputs.preset.options.includes(preset));assert.equal(evaluate(yaml.jobs['missing-inventory-g1'].if),true);assert.equal(evaluate(yaml.jobs['missing-inventory-g9'].if),false)
 for(const key of ['missing-inventory-approval','missing-inventory-consume','missing-inventory-g1','missing-inventory-receipt']){const j=yaml.jobs[key],steps=j.steps.filter(s=>s.name==='Checkout immutable failed G1 verifier');assert.equal(steps.length,1);assert.equal(steps[0].with.ref,'3ed1e852166398bb1429621a89c197ab6f77cb1e');assert.equal(steps[0].with.path,'.fcf-g1-frozen-parent');assert.equal(steps[0].if,`inputs.preset == '${preset}'`);assert.ok(!Object.keys(j.env).some(k=>/SUPABASE|PASSWORD|DATABASE/.test(k)))}
 const actions=readFileSync(new URL('./fcf-missing-inventory-actions.mjs',import.meta.url),'utf8');assert.ok(actions.includes("env.FCF_INVENTORY_PRESET==='g1-post83-remainder-quarantine-v1'"));assert.ok(actions.includes("await import('./fcf-g1-remainder-actions.mjs')"))
})
