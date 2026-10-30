// Operator-owned outer gate. The unchanged stock preload authenticates source
// and installs its exact G9/offline DB guards before this first-write gate.
import './fcf-g9-native800-preload.mjs'
import {execFileSync} from 'node:child_process'
import {appendFileSync} from 'node:fs'
import {resolve} from 'node:path'
const underlying=globalThis.fetch,env=process.env
const allowed=['PATH','HOME','GH_TOKEN','GITHUB_ACTIONS','GITHUB_REPOSITORY','GITHUB_REF','GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_EVENT_NAME','GITHUB_JOB','GITHUB_WORKFLOW_REF','GITHUB_ACTOR','GITHUB_ACTOR_ID','GITHUB_TRIGGERING_ACTOR','GITHUB_TRIGGERING_ACTOR_ID','FCF_NATIVE800_BOOTSTRAP_ID','FCF_NATIVE800_BOOTSTRAP_DIGEST','FCF_NATIVE800_PREVIOUS_SHA']
const childEnv=Object.fromEntries(allowed.filter(k=>typeof env[k]==='string').map(k=>[k,env[k]]));childEnv.FCF_NATIVE800_CHILD_LIVE='1'
const journal=env.FCF_NATIVE800_CHILD_GATE_JOURNAL
if(typeof journal!=='string'||journal!==resolve(journal)||!/^child-[01]-gate\.jsonl$/.test(journal.split('/').at(-1))||!journal.startsWith(resolve('native800-price')+'/'))throw Error('NATIVE800_CHILD_GATE_JOURNAL')
let checked=false
function stamp(status){appendFileSync(journal,JSON.stringify({status,at:new Date().toISOString(),runId:env.GITHUB_RUN_ID,commit:env.GITHUB_SHA,automaticRetry:false})+'\n',{mode:0o600})}
globalThis.fetch=async(input,options={})=>{
 const method=options.method??(input instanceof Request?input.method:'GET')
 if(!['GET','HEAD'].includes(method)&&!checked){stamp('LIVE_GATE_RUNNING');try{const bytes=execFileSync(process.execPath,[resolve('scripts/fcf-native800-operator.mjs'),'child-live-check'],{cwd:process.cwd(),env:childEnv,timeout:180000,maxBuffer:MiB(),stdio:['ignore','pipe','pipe']}),result=JSON.parse(bytes);if(result.status!=='CHILD_LIVE_VERIFIED'||result.execution?.runId!==env.GITHUB_RUN_ID||result.execution?.commit!==env.GITHUB_SHA)throw Error();checked=true;stamp('LIVE_GATE_VERIFIED_BEFORE_FIRST_MUTATION')}catch{stamp('LIVE_GATE_HOLD_NO_HTTP');throw Error('NATIVE800_CHILD_LIVE_GATE_HOLD')}}
 return underlying(input,options)
}
function MiB(){return 1048576}
