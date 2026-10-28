// TEST ONLY isolated evaluation: real hosted composition/describer implementations,
// synthetic source adapter and external GitHub/site/psql transports. No live IO.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import * as history from './lib/fussball-native-history-policy.mjs'
import {hostedDerivedFixture,derivedHead,derivedRunId,hash} from './fussball-native-composition-test-fixture.mjs'
const file=new URL('./install-baden-native-catalog.mjs',import.meta.url),workflowFile=new URL('../.github/workflows/install-baden-native-catalog.yml',import.meta.url)
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',prefix=`repos/${repo}/`,runId='40661111111',ciId='40662222222',assetId='40663333333'
const actor=()=>({id:25134229,login:'nejcar20',type:'User'})
function preparationAPI(f){
 const path=new URL('./prepare-fussball-native-history.mjs',import.meta.url),code=readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {describeFussballNativePreparation};'
 const localRead=(url,...a)=>url.href.endsWith('/policies/fussball-baden-native-composition.json')?Buffer.from(JSON.stringify(f.catalog)):readFileSync(url,...a)
 const keys=['BADEN_CURRENT','BADEN_ARCHIVE','BADEN_SLUG','BADEN_CARDS','badenCanonical','projectBadenHistoricalPolicy','badenClubKey']
 return new Function('readFileSync','createHash','isDeepStrictEqual','getFussballNativeComposition','reauthenticateFussballNativeComposition','validateFussballNativeCatalog',...keys,code)(localRead,createHash,isDeepStrictEqual,f.api.getFussballNativeComposition,f.api.reauthenticateFussballNativeComposition,f.api.validateFussballNativeCatalog,...keys.map(k=>history[k]))
}
async function fixture(t){
 assert.ok(existsSync(file),'bounded installer entry must exist')
 const f=await hostedDerivedFixture(t),prep=preparationAPI(f),input={derivedRunId,derivedHead,frozenDirectory:'TEST-ONLY-frozen',v6FrozenDirectory:'TEST-ONLY-4e',github:f.github},cap=await f.api.loadFussballNativeComposition(input),description=await prep.describeFussballNativePreparation(cap)
 const calls=[],controls={},prior=[],env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repo,GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:derivedHead,GITHUB_RUN_ID:runId,GITHUB_JOB:'validate',EXPECTED_SHA:derivedHead,DERIVED_RUN_ID:derivedRunId,MAIN_CI_RUN_ID:ciId,REVIEWED_ASSET_ID:assetId,REVIEWED_MANIFEST_SHA256:description.sha256,FROZEN_DE77_DIRECTORY:'frozen-de77',FROZEN_V6_DIRECTORY:'frozen-v6',GH_TOKEN:'TEST_ONLY',MIGRACIJE_PREMOR:'0'}
 let ownerReads=0;Object.defineProperty(env,'SUPABASE_DB_URL',{get(){ownerReads++;return 'postgresql://TEST_ONLY_OWNER:TEST_ONLY_PASSWORD@127.0.0.1:5432/postgres'}})
 const currentRun={id:Number(runId),run_attempt:1,head_sha:derivedHead,head_branch:'main',path:'.github/workflows/install-baden-native-catalog.yml',event:'workflow_dispatch',status:'in_progress',conclusion:null,repository:{full_name:repo},head_repository:{full_name:repo},actor:actor(),triggering_actor:actor()}
 const ci={...currentRun,id:Number(ciId),path:'.github/workflows/ci.yml',event:'push',status:'completed',conclusion:'success'}
 const asset={id:Number(assetId),name:`baden-native-catalog-${derivedRunId}-${description.sha256}.json`,state:'uploaded',size:Buffer.byteLength(description.manifest),uploader:actor(),url:`https://api.github.com/${prefix}releases/assets/${assetId}`}
 const release={id:901,draft:true,tag_name:'baden-native-staging-v1',assets:[asset]}
 const github=async(path,binary=false)=>{calls.push({kind:'github',path});let v
  if(path===prefix+`actions/runs/${runId}`)v=currentRun
  else if(path===prefix+`actions/runs/${ciId}`)v=ci
  else if(path===prefix+`actions/runs/${runId}/attempts/1/jobs?per_page=100&page=1`)v={total_count:2,jobs:[{id:701,name:'validate',run_id:Number(runId),run_attempt:1,head_sha:derivedHead,status:'completed',conclusion:'success',steps:[{name:'Authenticate source, root review, writer and deployed main',status:'completed',conclusion:'success'}]},{id:702,name:'install',run_id:Number(runId),run_attempt:1,head_sha:derivedHead,status:'in_progress',conclusion:null,steps:[{name:'Validate again before owner connection',status:'completed',conclusion:'success'},{name:'Owner connection prerequisite',status:'completed',conclusion:'success'},{name:'Install reviewed immutable catalog once',status:'in_progress',conclusion:null}]}]}
  else if(path.startsWith(prefix+'actions/workflows/install-baden-native-catalog.yml/runs?'))v={total_count:1+prior.length,workflow_runs:[currentRun,...prior.map(x=>x.run)]}
  else if(prior.some(x=>path===prefix+`actions/runs/${x.run.id}`))v=prior.find(x=>path===prefix+`actions/runs/${x.run.id}`).run
  else if(prior.some(x=>path===prefix+`actions/runs/${x.run.id}/attempts/1/jobs?per_page=100&page=1`))v=prior.find(x=>path===prefix+`actions/runs/${x.run.id}/attempts/1/jobs?per_page=100&page=1`).jobs
  else if(path===prefix+'releases/tags/baden-native-staging-v1')v=release
  else if(path===prefix+'releases/901/assets?per_page=100&page=1')v=[asset]
  else if(path===prefix+'releases/assets/'+assetId)v=asset
  else return f.github(path,binary)
  return structuredClone(controls.change?.(path,v)??v)
 }
 const fetch=async(url,options)=>{calls.push({kind:'served',url,options});assert.equal(url,'https://slff.eu/');assert.equal(options.redirect,'error');assert.equal(options.headers['Cache-Control'],'no-cache');return {ok:true,status:200,text:async()=>controls.html??`<meta name="slff-commit" content="${derivedHead}">`}}
 const execute=(cmd,args,options={})=>{
  calls.push({kind:cmd,args,sql:options.input})
  if(cmd==='git')return derivedHead+'\n'
  if(cmd==='gh'){assert.ok(args.includes('--method')&&args.includes('GET'));assert.ok(args.includes(prefix+'releases/assets/'+assetId));return Buffer.from(controls.assetBytes??description.manifest)}
  if(cmd==='psql'){
   if(controls.ownerFailure)throw Error('TEST ONLY private owner/SQL diagnostic must not escape')
   const response={manifest:description.manifest,sha256:description.sha256,rows:1};controls.readback?.(response);return JSON.stringify(response)+'\n'
  }
  throw Error('TEST ONLY unexpected external execution '+cmd)
 }
 const local=p=>typeof p==='string'&&!p.startsWith('/')?join(f.root,p):p
 const localRead=(p,...a)=>readFileSync(local(p),...a),localWrite=(p,...a)=>writeFileSync(local(p),...a),localMkdir=(p,...a)=>mkdirSync(local(p),...a),localExists=p=>existsSync(local(p))
 const load=async input=>{assert.equal(input.frozenDirectory,'frozen-de77');assert.equal(input.v6FrozenDirectory,'frozen-v6');return f.api.loadFussballNativeComposition({...input,frozenDirectory:'TEST-ONLY-frozen',v6FrozenDirectory:'TEST-ONLY-4e'})}
 const process={env,argv:[],cwd:()=>fileURLToPath(new URL('../',import.meta.url)),exitCode:undefined}
 const code=readFileSync(file,'utf8').split('// CLI entry')[0].replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(file.href)).replace(/\bexport /g,'')+'\nreturn {runBadenNativeCatalogInstaller,installationSQL};'
 const api=new Function('readFileSync','writeFileSync','mkdirSync','existsSync','realpathSync','join','resolve','fileURLToPath','createHash','execFileSync','githubGetAdapter','loadFussballNativeComposition','getFussballNativeComposition','describeFussballNativePreparation','fetch','process',code)(localRead,localWrite,localMkdir,localExists,realpathSync,join,resolve,fileURLToPath,createHash,execute,()=>github,load,f.api.getFussballNativeComposition,prep.describeFussballNativePreparation,fetch,process)
 return {f,api,env,calls,controls,prior,currentRun,ci,release,asset,description,cap,get ownerReads(){return ownerReads}}
}
test('installer uses actual private hosted rebuild/describer and exact root asset before the only owner INSERT',async t=>{
 const f=await fixture(t),before=f.f.sourceReads
 const pre=await f.api.runBadenNativeCatalogInstaller({command:'validate'});assert.equal(pre.sha256,f.description.sha256);assert.equal(f.ownerReads,0);assert.equal(f.calls.filter(c=>c.kind==='psql').length,0)
 f.env.GITHUB_JOB='install';const r=await f.api.runBadenNativeCatalogInstaller({command:'install'});assert.equal(r.status,'INSTALLED');assert.equal(r.nativeImportEligible,false);assert.equal(r.activationEligible,false);assert.ok(f.f.sourceReads-before>=8)
 const writes=f.calls.filter(c=>c.kind==='psql');assert.equal(writes.length,1);assert.equal(f.ownerReads,1)
 const sql=writes[0].sql;assert.match(sql,/lock table private_baden_history.catalog in access exclusive mode/i);assert.match(sql,/count\(\*\).*private_baden_history.catalog/is);assert.equal((sql.match(/insert into private_baden_history.catalog/gi)??[]).length,1);assert.doesNotMatch(sql,/\b(update|delete|truncate|drop|alter|grant|revoke|create)\b/i)
 assert.match(sql,/BEGIN ISOLATION LEVEL READ COMMITTED/i);assert.match(sql,/COMMIT;[\s\S]*BEGIN READ ONLY/i);assert.match(sql,/ROLLBACK;/i)
 await assert.rejects(f.api.runBadenNativeCatalogInstaller({command:'install'}),/one-shot|intent|already|permanent/i);assert.equal(f.calls.filter(c=>c.kind==='psql').length,1)
})
test('production APIs reject copied capability and public IO/proof/clock overrides without owner access',async()=>{
 assert.ok(existsSync(file),'installer entry missing');const api=await import('./install-baden-native-catalog.mjs')
 for(const extra of [{env:{}},{io:{}},{proof:{}},{now:Date.now()},{manifest:'{}'}])await assert.rejects(api.runBadenNativeCatalogInstaller({command:'install',...extra}),/closed input/)
 const {describeFussballNativePreparation}=await import('./prepare-fussball-native-history.mjs');await assert.rejects(describeFussballNativePreparation({nativeImportEligible:true}),/reader-issued/)
})
test('root run, CI, served head, pins, draft asset and source drift hold before owner secret or connection',async t=>{
 const cases=[f=>{f.env.EXPECTED_SHA='c'.repeat(40)},f=>{f.env.GITHUB_RUN_ATTEMPT='2'},f=>{f.env.MAIN_CI_RUN_ID=runId},f=>{f.env.REVIEWED_MANIFEST_SHA256='0'.repeat(64)},f=>{f.env.FROZEN_V6_DIRECTORY='other'},f=>{f.env.MIGRACIJE_PREMOR='1'},f=>{f.currentRun.actor.id=1},f=>{f.currentRun.actor.login='other'},f=>{f.currentRun.triggering_actor.id=1},f=>{f.currentRun.triggering_actor.type='Bot'},f=>{f.ci.head_sha='b'.repeat(40)},f=>{f.ci.run_attempt=2},f=>{f.ci.path='other'},f=>{f.ci.conclusion='failure'},f=>{f.controls.html='<meta name="slff-commit" content="'+'b'.repeat(40)+'">'},f=>{f.controls.html=`<meta name="slff-commit" content="${derivedHead}"><meta name="slff-commit" content="${derivedHead}">`},f=>{f.release.draft=false},f=>{f.release.tag_name='other'},f=>{f.asset.uploader.id=1},f=>{f.asset.name='other.json'},f=>{f.asset.state='new'},f=>{f.controls.assetBytes=f.description.manifest+'\n'},f=>{f.f.sourceFailure=true},f=>{f.f.proof.source.currentFreshUntil=new Date(Date.now()-1000).toISOString()},f=>{f.f.main.commit.sha='c'.repeat(40)},f=>{f.controls.change=(p,v)=>p.includes('/workflows/')?{total_count:2,workflow_runs:[f.currentRun,f.currentRun]}:v}]
 for(const [i,mutate]of cases.entries())await t.test(String(i),async t=>{const f=await fixture(t);mutate(f);await assert.rejects(f.api.runBadenNativeCatalogInstaller({command:'validate'}));assert.equal(f.ownerReads,0);assert.equal(f.calls.filter(c=>c.kind==='psql').length,0)})
})
test('committed/unknown owner result, nonempty refusal and readback drift are permanent local holds without mutation retries',async t=>{
 for(const [label,change]of [['ambiguous',f=>{f.controls.ownerFailure=true}],['nonempty SQL refusal',f=>{f.controls.ownerFailure=true}],['extra row',f=>{f.controls.readback=x=>x.rows=2}],['wrong manifest',f=>{f.controls.readback=x=>x.manifest+=' '}],['wrong hash',f=>{f.controls.readback=x=>x.sha256='0'.repeat(64)}],['extra key',f=>{f.controls.readback=x=>x.extra=true}]])await t.test(label,async t=>{
  const f=await fixture(t);await f.api.runBadenNativeCatalogInstaller({command:'validate'});f.env.GITHUB_JOB='install';change(f)
  await assert.rejects(f.api.runBadenNativeCatalogInstaller({command:'install'}),/UNKNOWN|HOLD/);assert.equal(f.calls.filter(c=>c.kind==='psql').length,1)
  await assert.rejects(f.api.runBadenNativeCatalogInstaller({command:'install'}));assert.equal(f.calls.filter(c=>c.kind==='psql').length,1)
 })
})
test('install rereads source, root review and served/runtime bindings after preflight and before owner connection',async t=>{
 for(const change of [f=>{f.f.sourceFailure=true},f=>{f.controls.assetBytes='{}'},f=>{f.controls.html='no identity'},f=>{f.ci.status='in_progress'},f=>{f.currentRun.triggering_actor.login='other'}])await t.test(change.toString(),async t=>{const f=await fixture(t);await f.api.runBadenNativeCatalogInstaller({command:'validate'});f.env.GITHUB_JOB='install';change(f);await assert.rejects(f.api.runBadenNativeCatalogInstaller({command:'install'}));assert.equal(f.ownerReads,0);assert.equal(f.calls.filter(c=>c.kind==='psql').length,0)})
})
test('workflow scopes owner/tunnel secrets after read-only authentication and pins exact frozen checkouts',()=>{
 assert.ok(existsSync(workflowFile),'owner installer workflow missing');const w=readFileSync(workflowFile,'utf8')
 assert.match(w,/command -v psql/);assert.match(w,/workflow_dispatch:/);assert.match(w,/github.run_attempt == 1/);assert.match(w,/inputs.expected_sha == github.sha/);assert.match(w,/github.actor == 'nejcar20'/);assert.match(w,/contents: read/);assert.match(w,/actions: read/);assert.match(w,/cancel-in-progress: false/)
 for(const pin of ['de77b661cbc11d95256a500e57c2fdea861a0647','4e1e7caac02aa6e12c789c7cea7aac699d3c2566'])assert.ok(w.includes(pin))
 assert.ok(w.indexOf('catalog.mjs validate')<w.indexOf('secrets.SUPABASE_DB_URL'));assert.ok(w.indexOf('catalog.mjs validate')<w.indexOf('secrets.DEPLOY_SSH_KEY'));assert.match(w,/ExitOnForwardFailure=yes/);assert.match(w,/5432:127.0.0.1:5432 deploy@2.31.6.53/)
 assert.doesNotMatch(w,/SUPABASE_SERVICE_ROLE_KEY|actions: write|contents: write|schedule:|bulk-league-rollout|capture-archive|collect|--clobber/)
})

function skippedOwnerWitness(f){
 const run={...structuredClone(f.currentRun),id:40660000000,status:'completed',conclusion:'failure'}
 const base={run_id:run.id,run_attempt:1,head_sha:derivedHead,status:'completed'}
 return {run,jobs:{total_count:2,jobs:[{...base,id:801,name:'validate',conclusion:'failure',steps:[{name:'Authenticate source, root review, writer and deployed main',status:'completed',conclusion:'failure'}]},{...base,id:802,name:'install',conclusion:'skipped',steps:[]}]}}
}
test('only explicit closed skipped-owner witness permits retry after credential-free validation failure',async t=>{
 const good=await fixture(t),old=skippedOwnerWitness(good);old.run.head_sha='c'.repeat(40);old.jobs.jobs.forEach(j=>j.head_sha=old.run.head_sha);good.prior.push(old);await good.api.runBadenNativeCatalogInstaller({command:'validate'});assert.equal(good.ownerReads,0)
 for(const change of [v=>{v.run.status='in_progress';v.run.conclusion=null},v=>{v.run.conclusion='success'},v=>{v.jobs.jobs.pop();v.jobs.total_count=1},v=>{v.jobs.jobs[1].conclusion='failure'},v=>{v.jobs.jobs[1].status='in_progress'},v=>{v.jobs.jobs[1].steps=[{name:'Install reviewed immutable catalog once',status:'completed',conclusion:'skipped'}]},v=>{v.jobs.jobs[0].steps.push({name:'Unknown executed code',status:'completed',conclusion:'success'})},v=>{v.jobs.total_count=3},v=>{v.run.run_attempt=2}])await t.test(change.toString(),async t=>{const f=await fixture(t),v=skippedOwnerWitness(f);change(v);f.prior.push(v);await assert.rejects(f.api.runBadenNativeCatalogInstaller({command:'validate'}));assert.equal(f.ownerReads,0);assert.equal(f.calls.filter(c=>c.kind==='psql').length,0)})
})

test('saved preflight bytes and binding drift refuse before any owner access',async t=>{
 for(const name of ['manifest.json','preflight.json'])await t.test(name,async t=>{const f=await fixture(t);await f.api.runBadenNativeCatalogInstaller({command:'validate'});f.env.GITHUB_JOB='install';const path=join(f.f.root,'baden-native-catalog-install',name);if(name==='manifest.json')writeFileSync(path,f.description.manifest+'\n');else{const v=JSON.parse(readFileSync(path));v.binding.extra='foreign';writeFileSync(path,JSON.stringify(v))}await assert.rejects(f.api.runBadenNativeCatalogInstaller({command:'install'}),/reread drift/);assert.equal(f.ownerReads,0);assert.equal(f.calls.filter(c=>c.kind==='psql').length,0)})
})
