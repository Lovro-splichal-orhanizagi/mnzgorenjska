// TEST ONLY: execute the real authentication writer/common gate with real files.
// GitHub responses are synthetic; no provider, SQL, credentials or network IO.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import {compileFunction} from 'node:vm'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'

const checkout=fileURLToPath(new URL('..',import.meta.url))
const source=readFileSync(new URL('./fcf-g1-native800-operator.mjs',import.meta.url),'utf8')
function between(start,end){
 const at=source.indexOf(start),until=source.indexOf(end,at)
 assert.ok(at>=0&&until>at,'production handoff source must be available')
 return source.slice(at,until).replace(/^export /gm,'')
}
// Execute production statements, rather than asserting that a path string exists.
const gateSource=between('const repository=','export function fcfG1Native800RuntimeFiles')+
 between('export function native800Execution(','export function assertNative800Freshness(')+
 between('const get=path=>github(', 'function bootstrapData(')+
 between('function write(directory,','function stageFile(')
const authenticateBranch=between("if(command==='authenticate'){write(",'\n let writeIntent=false')
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:checkout,encoding:'utf8'}).trim()
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',prefix=`repos/${repository}/`
const workflow='.github/workflows/fcf-g1-native800.yml'
const rootActor={id:25134229,login:'nejcar20',type:'User'}
const stages=['import','price','check','activate']

function harness(t,stage='import'){
 const directory=mkdtempSync(join(tmpdir(),'g1-authentication-handoff-'))
 t.after(()=>rmSync(directory,{recursive:true,force:true}))
 const runtimeFiles=[{path:'scripts/fcf-g1-native800-operator.mjs',sha256:'a'.repeat(64)}]
 const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repository,GITHUB_REF:'refs/heads/main',GITHUB_SHA:commit,GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_JOB:'native800-'+stage,GITHUB_WORKFLOW_REF:repository+'/'+workflow+'@refs/heads/main'}
 const stamp=new Date(Date.now()-10000).toISOString()
 const run={id:123,run_attempt:1,head_sha:commit,head_branch:'main',path:workflow,event:'workflow_dispatch',status:'in_progress',conclusion:null,repository:{full_name:repository},head_repository:{full_name:repository},actor:rootActor,triggering_actor:rootActor}
 const jobs=stages.slice(0,stages.indexOf(stage)+1).map((s,i)=>({id:100+i,run_id:123,run_attempt:1,head_sha:commit,name:'native800-'+s,status:s===stage?'in_progress':'completed',conclusion:s===stage?null:'success',steps:[{name:'Authenticate exact native800 epoch',status:'completed',conclusion:'success'}]}))
 const ci={...run,id:456,path:'.github/workflows/ci.yml',event:'push',status:'completed',conclusion:'success',created_at:stamp,run_started_at:stamp,updated_at:stamp}
 const names=['novi-viri','diagnostika-virov','Tipi, build, izris','Pravice in roki v svezi bazi','Migracije baze','Objava na Vercel','Objava na Hetzner VM','Je nova različica res v zraku?','Objava Club na Hetzner VM','Objava Trgovine na Hetzner VM']
 const ciJobs=names.map((name,i)=>({id:200+i,run_id:456,head_sha:commit,run_attempt:1,name,status:'completed',conclusion:i<2?'skipped':'success',started_at:stamp,completed_at:stamp,steps:[]}))
 const responses=new Map([[prefix+'actions/runs/123',run],[prefix+'actions/runs/456',ci]])
 const github=async path=>{assert.ok(responses.has(path),'unexpected GitHub request: '+path);return structuredClone(responses.get(path))}
 const bootstrap={mainCiRunId:'456'}
 // Bind relative file IO to a real private directory; Git still reads the real
 // checkout. No production path, comparison, or filesystem behavior is replaced.
 const bindings={Buffer,createHash,hash,join,env,bootstrap,runtimeFiles,
  process:{env:{}},github,
  existsSync:path=>existsSync(resolve(directory,path)),
  readFileSync:(path,...args)=>readFileSync(resolve(directory,path),...args),
  mkdirSync:(path,...args)=>mkdirSync(resolve(directory,path),...args),
  writeFileSync:(path,...args)=>writeFileSync(resolve(directory,path),...args),
  execFileSync:(command,args,options)=>execFileSync(command,args,{...options,cwd:checkout}),
  fcfRefresh800Pages:async(_github,path,key)=>{assert.equal(key,'jobs');if(path==='actions/runs/123/attempts/1/jobs?')return structuredClone(jobs);assert.equal(path,'actions/runs/456/attempts/1/jobs?');return structuredClone(ciJobs)},
  authenticateNative800RuntimeTree:async()=>{},assertNative800NoActiveWriters:async()=>{},assertFcfRefresh800LiveEpoch:async()=>{}
 }
 const {produce,consume}=compileFunction(gateSource+`\nasync function produce(){const command='authenticate',boot={bootstrapSha256:'b'.repeat(64)},e=(await common(env,'${stage}',bootstrap,runtimeFiles,true)).execution;${authenticateBranch}}\nreturn {produce,consume:()=>common(env,'${stage}',bootstrap,runtimeFiles)}`,[],{contextExtensions:[bindings]})()
 return {
  produce,consume,
  alter:change=>{const path=join(directory,'g1-native800-authentication/epoch.json'),data=JSON.parse(readFileSync(path));change(data);writeFileSync(path,JSON.stringify(data))}
 }
}

test('each G1 stage consumes the epoch file produced by its authentication step',async t=>{
 for(const stage of stages){
  const h=harness(t,stage)
  assert.equal((await h.produce()).status,'AUTHENTICATED_ONLY')
  const result=await h.consume()
  assert.equal(result.execution.runId,'123');assert.equal(result.execution.commit,commit)
  assert.equal(result.jobId,String(100+stages.indexOf(stage)))
 }
})
test('G1 stages reject an absent authentication file',async t=>{
 await assert.rejects(harness(t).consume(),{code:'ENOENT'})
})
test('G1 stages reject an authentication file from another execution',async t=>{
 const h=harness(t);await h.produce();h.alter(data=>{data.execution.runId='999'})
 await assert.rejects(h.consume(),{operatorCode:'AUTHENTICATED_IMMUTABLE_JOB_RUNTIME'})
})
test('G1 stages reject an authentication file with a different runtime manifest',async t=>{
 const h=harness(t);await h.produce();h.alter(data=>{data.runtimeFiles[0].sha256='c'.repeat(64)})
 await assert.rejects(h.consume(),{operatorCode:'AUTHENTICATED_IMMUTABLE_JOB_RUNTIME'})
})
