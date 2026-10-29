// Real CLI subprocess regression. All data is synthetic; gh is a local closed
// GET shim and fetch is denied. No source, DB, credentials or network are used.
import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
const root=fileURLToPath(new URL('../',import.meta.url)),entry=join(root,'scripts/fcf-missing-inventory-actions.mjs'),repository='Lovro-splichal-orhanizagi/mnzgorenjska',head='a'.repeat(40),preset='g1-post83-remainder-quarantine-v1',asset=Buffer.from('{"schemaVersion":7,"kind":"invalid-synthetic-approval"}'),digest=createHash('sha256').update(asset).digest('hex')
function child(t,argv,alter={}){
 const directory=realpathSync(mkdtempSync(join(tmpdir(),'fcf-remainder-cli-')));t.after(()=>rmSync(directory,{recursive:true,force:true}))
 const calls=join(directory,'gh.ndjson'),network=join(directory,'network.log'),guard=join(directory,'deny-network.mjs')
 writeFileSync(guard,"import {appendFileSync} from 'node:fs';globalThis.fetch=()=>{appendFileSync(process.env.TEST_NETWORK_LOG,'fetch\\n');throw Error('NETWORK_FORBIDDEN')}")
 writeFileSync(join(directory,'gh'),`#!${process.execPath}
import {appendFileSync} from 'node:fs';
const args=process.argv.slice(2),path=args[3],prefix='repos/${repository}/';appendFileSync(process.env.TEST_GH_LOG,JSON.stringify(args)+'\\n');
if(args.slice(0,3).join(' ')!=='api --method GET'||!path?.startsWith(prefix)){process.stderr.write('UNPLANNED_MUTATION');process.exit(91)}
const q=path.slice(prefix.length),actor={login:'nejcar20',id:25134229,type:'User'},run={id:123,repository:{full_name:'${repository}'},path:'.github/workflows/uvoz-fcf-zgodovina.yml',event:'workflow_dispatch',head_branch:'main',head_sha:'${head}',run_attempt:1,status:'in_progress',conclusion:null,actor,triggering_actor:actor},job={id:456,run_id:123,run_attempt:1,head_sha:'${head}',name:'missing-inventory-approval',status:'in_progress',conclusion:null,steps:[{name:'Stage reviewed FCF inventory approval',status:'in_progress',conclusion:null}]};
let value;if(q==='actions/runs/123')value=run;
else if(q==='actions/runs/123/attempts/1/jobs?per_page=100&page=1')value={total_count:1,jobs:[job]};
else if(q==='releases?per_page=100&page=1')value=[{id:11,tag_name:'fcf-inventory-staging-v1',draft:true}];
else if(q==='releases/11/assets?per_page=100&page=1')value=[{id:22,state:'uploaded',size:${asset.length}}];
else if(q==='releases/assets/22'){process.stdout.write(Buffer.from('${asset.toString('base64')}','base64'));process.exit(0)}
else if(q==='actions/artifacts/789'){process.stderr.write('HTTP 403 synthetic boundary');process.exit(1)}
else{process.stderr.write('UNPLANNED_GET '+q);process.exit(92)}process.stdout.write(JSON.stringify(value));
`,{mode:0o700})
 const env={PATH:directory+':'+dirname(process.execPath),TEST_GH_LOG:calls,TEST_NETWORK_LOG:network,GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repository,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123',GITHUB_SHA:head,GITHUB_JOB:'missing-inventory-approval',FCF_INVENTORY_PRESET:preset,FCF_INVENTORY_ASSET_ID:'22',FCF_INVENTORY_ASSET_SHA:digest,FCF_APPROVAL_ID:'789',...alter}
 const result=spawnSync(process.execPath,['--import',guard,entry,...argv],{cwd:directory,env,encoding:'utf8',timeout:15000,maxBuffer:1048576}),observed=existsSync(calls)?readFileSync(calls,'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)):[]
 assert.equal(result.error,undefined);assert.equal(result.signal,null);assert.equal(existsSync(network),false,'no source/other fetch');assert.equal(result.stdout,'');assert.equal(existsSync(join(directory,'fcf-inventory-approval')),false);assert.equal(existsSync(join(directory,'fcf-inventory-final')),false)
 return{...result,observed}
}
function diagnostic(result,label,code='unknown'){
 assert.equal(result.status,1,`expected caught diagnostic, received exit${result.status}: ${result.stderr}`)
 assert.equal(result.stderr,`FCF_INVENTORY: ${label} failed closed (${code}).\n`)
 assert.ok(!result.stderr.includes('unsettled top-level await'))
}
test('real schema7 approval-stage CLI reaches verified draft bytes then refuses malformed approval',t=>{
 const r=child(t,['approval-stage']);diagnostic(r,'approval staging')
 assert.deepEqual(r.observed.map(a=>a[3]),['actions/runs/123','actions/runs/123/attempts/1/jobs?per_page=100&page=1','releases?per_page=100&page=1','releases/11/assets?per_page=100&page=1','releases/assets/22'].map(p=>'repos/'+repository+'/'+p))
 assert.deepEqual(r.observed.at(-1).slice(4),['-H','Accept: application/octet-stream'])
})
test('real schema7 receipt CLI reaches authenticated artifact GET and reports failure rather than exit13',t=>{
 const r=child(t,['receipt'],{GITHUB_JOB:'missing-inventory-receipt'});diagnostic(r,'receipt','github-read')
 assert.deepEqual(r.observed.map(a=>a[3]),['actions/runs/123','actions/runs/123/attempts/1/jobs?per_page=100&page=1','actions/artifacts/789'].map(p=>'repos/'+repository+'/'+p))
})
test('real prepare command dynamically routes without preset and rejects incomplete flags before IO',t=>{
 const r=child(t,['prepare-g1-remainder-approval'],{FCF_INVENTORY_PRESET:''});diagnostic(r,'command');assert.deepEqual(r.observed,[])
})
test('real schema7 CLI still refuses non-Actions and DB-bearing contexts before GET',t=>{
 for(const alter of [{GITHUB_ACTIONS:''},{DATABASE_URL:'synthetic-forbidden'}]){const r=child(t,['approval-stage'],alter);diagnostic(r,'approval staging');assert.deepEqual(r.observed,[])}
})
