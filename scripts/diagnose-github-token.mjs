// NEVER MERGE. Fixed, bounded GitHub REST diagnostic; no source or database access.
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {writeFileSync} from 'node:fs'

const repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska'
const releaseId=416653899,assetId=690671037
const expectedAssetSha='e9b7d58e47239cd6d19109e43af49e4980b62b6339d21a1879c5b2a7fdb72a51'
const expectedAssetBytes=17582
const result={diagnostic:'github-token-readonly-v1',mergeable:false,execution:null,apiCalls:[],failure:null}
const safeHash=b=>createHash('sha256').update(b).digest('hex')

function gate(){
 const expected={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/codex-github-token-diagnostic-e925-20261030',GITHUB_ACTOR:'nejcar20',GITHUB_ACTOR_ID:'25134229',GITHUB_TRIGGERING_ACTOR:'nejcar20',GITHUB_RUN_ATTEMPT:'1',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska'}
 for(const [key,value] of Object.entries(expected))if(process.env[key]!==value)throw Error('workflow identity gate failed')
 if(!/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA||'')||process.env.EXPECTED_SHA!==process.env.GITHUB_SHA)throw Error('expected frozen head SHA mismatch')
 if(!process.env.GH_TOKEN)throw Error('github.token unavailable')
}
function safeFailure(error){
 const stderr=Buffer.isBuffer(error?.stderr)?error.stderr:Buffer.from('')
 const match=stderr.toString('utf8').match(/HTTP\s+(\d{3})/i)
 const status=match?Number(match[1]):null
 const code=typeof error?.code==='string'&&/^(?:ETIMEDOUT|ENOBUFS|ENOENT|EPIPE|ECONNRESET|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH)$/.test(error.code)?error.code:null
 return {status,processCode:Number.isInteger(error?.status)?error.status:null,signal:typeof error?.signal==='string'?error.signal:null,code,stderrBytes:stderr.length,stderrSha256:safeHash(stderr)}
}
function get(endpoint,{accept,binary=false,maxBytes=1024*1024}={}){
 if(result.apiCalls.length>=5)throw Error('fixed API call budget exceeded')
 const args=['api','--method','GET',endpoint]
 if(accept)args.push('-H',`Accept: ${accept}`)
 const record={endpoint,method:'GET',status:null,bytes:null,sha256:null,error:null}
 result.apiCalls.push(record)
 try{
  const body=execFileSync('gh',args,{encoding:null,maxBuffer:maxBytes+1,timeout:30000,stdio:['ignore','pipe','pipe']})
  const bytes=Buffer.isBuffer(body)?body:Buffer.from(body)
  if(bytes.length>maxBytes)throw Object.assign(new Error('bounded response exceeded'),{code:'ENOBUFS',stdout:bytes,stderr:Buffer.alloc(0)})
  record.status=200;record.bytes=bytes.length;record.sha256=safeHash(bytes)
  return bytes
 }catch(error){
  const safe=safeFailure(error);record.status=safe.status;record.bytes=Number.isSafeInteger(error?.stdout?.length)?error.stdout.length:null;record.sha256=Buffer.isBuffer(error?.stdout)?safeHash(error.stdout):null;record.error=safe
  throw Object.assign(new Error('GitHub API request failed safely'),{safe})
 }
}
function json(bytes){try{return JSON.parse(bytes.toString('utf8'))}catch{throw Error('GitHub response was not valid JSON')}}
function classify(stage,error){
 const s=error?.safe||{}
 let category='transport_or_process_failure'
 if(s.status===401)category='unauthenticated'
 else if(s.status===403)category=result.core?.remaining===0?'primary_rate_limit':'forbidden_or_secondary_limit'
 else if(s.status===404)category='private_asset_or_not_found'
 else if(s.status===429)category='rate_limited'
 result.failure={stage,category,...s}
}
async function main(){
 try{gate()}catch(error){result.failure={stage:'identity_gate',category:'gate_failed'};writeFileSync('github-token-diagnostic.json',JSON.stringify(result,null,2)+'\n',{mode:0o600});return}
 result.execution={repository:process.env.GITHUB_REPOSITORY,ref:process.env.GITHUB_REF,sha:process.env.GITHUB_SHA,actor:process.env.GITHUB_ACTOR,actorId:process.env.GITHUB_ACTOR_ID,attempt:Number(process.env.GITHUB_RUN_ATTEMPT),runId:process.env.GITHUB_RUN_ID||null}
 try{
  // This must be first: the unauthenticated-looking quota endpoint itself is
  // also diagnostic evidence, even if the core quota has already reached zero.
  const rate=json(get('rate_limit',{maxBytes:65536}))
  const core=rate?.resources?.core
  if(!core||!['limit','remaining','reset','used'].every(k=>Number.isSafeInteger(core[k])&&core[k]>=0))throw Error('core rate-limit fields unavailable')
  result.core={limit:core.limit,remaining:core.remaining,reset:core.reset,used:core.used}
  if(core.remaining===0)result.failure={stage:'rate_limit',category:'primary_rate_limit'}
  if(!result.failure){
   const release=json(get(`${repo}/releases/${releaseId}`,{maxBytes:256*1024}))
   result.release={id:release?.id??null,tag:typeof release?.tag_name==='string'?release.tag_name:null,draft:release?.draft??null}
   if(release?.id!==releaseId||release?.tag_name!=='fcf-inventory-staging-v1'||release?.draft!==true)result.failure={stage:'release_metadata',category:'release_identity_mismatch'}
  }
  if(!result.failure){
   const asset=json(get(`${repo}/releases/assets/${assetId}`,{accept:'application/vnd.github+json',maxBytes:256*1024}))
   result.assetMetadata={id:asset?.id??null,state:asset?.state??null,size:asset?.size??null,digest:asset?.digest??null}
   if(asset?.id!==assetId||asset?.state!=='uploaded'||asset?.size!==expectedAssetBytes||asset?.digest!==`sha256:${expectedAssetSha}`)result.failure={stage:'asset_metadata',category:'asset_identity_mismatch'}
  }
  if(!result.failure){
   const raw=get(`${repo}/releases/assets/${assetId}`,{accept:'application/octet-stream',binary:true,maxBytes:expectedAssetBytes+1})
   result.assetBytes={bytes:raw.length,sha256:safeHash(raw),matchesExpected:raw.length===expectedAssetBytes&&safeHash(raw)===expectedAssetSha}
   if(!result.assetBytes.matchesExpected)result.failure={stage:'asset_bytes',category:'asset_digest_mismatch'}
  }
  // Optional fifth fixed GET, only after all four primary checks pass. Retain
  // only byte count and digest; never persist or print the old job log itself.
  if(!result.failure){try{const log=get(`${repo}/actions/jobs/123509832634/logs`,{binary:true,maxBytes:2*1024*1024});result.oldR1JobLog={bytes:log.length,sha256:safeHash(log)}}catch(error){classify('old_r1_job_log',error)}}
 }catch(error){classify(result.apiCalls.at(-1)?.endpoint||'diagnostic',error)}
}
await main()
writeFileSync('github-token-diagnostic.json',JSON.stringify(result,null,2)+'\n',{mode:0o600})
process.stdout.write(JSON.stringify({diagnostic:result.diagnostic,apiCalls:result.apiCalls.length,failure:result.failure?.category||null})+'\n')
