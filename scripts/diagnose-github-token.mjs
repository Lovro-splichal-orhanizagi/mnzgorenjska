// NEVER MERGE. Fixed, bounded GitHub REST diagnostic; no source or database access.
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {readFcfG9ArchivedR1Log} from './fcf-g9-archived-r1-log.mjs'

const repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska'
const result={diagnostic:'github-archived-r1-log-readonly-v3',mergeable:false,execution:null,ghVersion:null,apiCalls:[],failure:null}
const safeHash=b=>createHash('sha256').update(b).digest('hex')
const releasePath=`${repo}/releases/416653899`,assetListPrefix=releasePath+'/assets?per_page=100&page=',rawAssetPath=`${repo}/releases/assets/690729624`

function gate(){
 const expected={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/codex-github-token-diagnostic-e925-20261030',GITHUB_ACTOR:'nejcar20',GITHUB_ACTOR_ID:'25134229',GITHUB_TRIGGERING_ACTOR:'nejcar20',GITHUB_RUN_ATTEMPT:'1',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska'}
 for(const [key,value] of Object.entries(expected))if(process.env[key]!==value)throw Error('workflow identity gate failed')
 if(!/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA||'')||process.env.EXPECTED_SHA!==process.env.GITHUB_SHA)throw Error('expected frozen head SHA mismatch')
 if(!process.env.GH_TOKEN)throw Error('github.token unavailable')
}
function safeStderr(stderr){
 return stderr.toString('utf8')
  .replace(/\bhttps?:\/\/[^\s"'<>]+/gi,'[URL]')
  .replace(/\b(?:authorization|proxy-authorization)\s*[:=]\s*[^\s,;]+(?:\s+[^\s,;]+)?/gi,'[AUTHORIZATION REDACTED]')
  .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/-]+=*/gi,'[AUTH REDACTED]')
  .replace(/\b(?:token|access[_-]?token|refresh[_-]?token|api[_-]?key|secret|password|passwd|auth|signature|x-amz-[\w-]+)\s*[:=]\s*["']?[^\s,;"']+/gi,'[VALUE REDACTED]')
  .replace(/\b(?:github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9_]+|gh_[A-Za-z0-9_]{20,})\b/gi,'[GITHUB TOKEN REDACTED]')
  .replace(/\b[A-Fa-f0-9]{40,}\b/g,'[LONG HEX REDACTED]')
  .replace(/\b[A-Za-z0-9+/_=-]{40,}\b/g,'[LONG TOKEN REDACTED]')
  .replace(/[^\x20-\x7E]/g,' ').replace(/\s+/g,' ').trim().slice(0,400)
}
function getGhVersion(){
 try{
  const output=execFileSync('gh',['--version'],{encoding:null,maxBuffer:4096,timeout:5000,stdio:['ignore','pipe','pipe']})
  const line=output.toString('utf8').split(/\r?\n/,1)[0]||''
  return safeStderr(Buffer.from(line)).slice(0,120)||'unavailable'
 }catch{return 'unavailable'}
}
function safeFailure(error){
 const stderr=Buffer.isBuffer(error?.stderr)?error.stderr:Buffer.from('')
 const match=stderr.toString('utf8').match(/HTTP\s+(\d{3})/i)
 const status=match?Number(match[1]):null
 const code=typeof error?.code==='string'&&/^(?:ETIMEDOUT|ENOBUFS|ENOENT|EPIPE|EAGAIN|ECONNRESET|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH)$/.test(error.code)?error.code:null
 const safeText=safeStderr(stderr)
 return {status,processCode:Number.isInteger(error?.status)?error.status:null,signal:typeof error?.signal==='string'?error.signal:null,code,stderrBytes:stderr.length,stderrSha256:safeHash(stderr),stderrSafeText:safeText,resourceTemporarilyUnavailable:/resource temporarily unavailable/i.test(safeText),eagain:/\bEAGAIN\b/i.test(safeText),stdoutWriteFailure:/write[^.\n]{0,80}stdout/i.test(safeText),brokenPipe:/broken pipe|\bEPIPE\b/i.test(safeText)}
}
function get(endpoint,{accept,binary=false,maxBytes=1024*1024}={}){
 const page=typeof endpoint==='string'&&endpoint.startsWith(assetListPrefix)?endpoint.slice(assetListPrefix.length):''
 const allowed=endpoint==='rate_limit'||endpoint===releasePath||/^(?:[1-9]|10)$/.test(page)||endpoint===rawAssetPath
 if(!allowed)throw Error('fixed diagnostic GitHub path refused')
 if(result.apiCalls.length>=13)throw Error('fixed API call budget exceeded')
 const args=['api','--method','GET',endpoint]
 if(accept)args.push('-H',`Accept: ${accept}`)
 if(accept!==undefined&&accept!=='application/octet-stream')throw Error('fixed diagnostic Accept header refused')
 const record={endpoint,method:'GET',status:null,bytes:null,sha256:null,ghArgumentCount:args.length,acceptHeader:accept||null,error:null}
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
function classify(stage,error,recordError=null){
 const s=error?.safe||recordError||{}
 let category='transport_or_process_failure'
 if(s.status===401)category='unauthenticated'
 else if(s.status===403)category=result.core?.remaining===0?'primary_rate_limit':'forbidden_or_secondary_limit'
 else if(s.status===404)category='private_asset_or_not_found'
 else if(s.status===429)category='rate_limited'
 else if(typeof error?.message==='string'&&error.message.startsWith('FCF_G9_ARCHIVED_R1_LOG:'))category='archive_validation_failed'
 result.failure={stage,category,...s}
}
async function main(){
 try{gate()}catch(error){result.failure={stage:'identity_gate',category:'gate_failed'};writeFileSync('github-token-diagnostic.json',JSON.stringify(result,null,2)+'\n',{mode:0o600});return}
 result.execution={repository:process.env.GITHUB_REPOSITORY,ref:process.env.GITHUB_REF,sha:process.env.GITHUB_SHA,actor:process.env.GITHUB_ACTOR,actorId:process.env.GITHUB_ACTOR_ID,attempt:Number(process.env.GITHUB_RUN_ATTEMPT),runId:process.env.GITHUB_RUN_ID||null}
 result.ghVersion=getGhVersion()
 try{
  // This must be first: the unauthenticated-looking quota endpoint itself is
  // also diagnostic evidence, even if the core quota has already reached zero.
  const rate=json(get('rate_limit',{maxBytes:65536}))
  const core=rate?.resources?.core
  if(!core||!['limit','remaining','reset','used'].every(k=>Number.isSafeInteger(core[k])&&core[k]>=0))throw Error('core rate-limit fields unavailable')
  result.core={limit:core.limit,remaining:core.remaining,reset:core.reset,used:core.used}
  if(core.remaining===0)result.failure={stage:'rate_limit',category:'primary_rate_limit'}
  if(!result.failure){
   const bytes=await readFcfG9ArchivedR1Log({github:async(endpoint,binary=false)=>{const response=get(endpoint,{binary,accept:binary?'application/octet-stream':undefined,maxBytes:binary?24885:1024*1024});return binary?response:json(response)}})
   result.archivedR1Log={verified:true,releaseIdentityVerified:true,assetMembershipVerified:true,rootUploaderVerified:true,rawDigestVerified:true,bytes:bytes.length,sha256:safeHash(bytes)}
  }
 }catch(error){const last=result.apiCalls.at(-1);classify(last?.endpoint||'diagnostic',error,last?.error)}
}
await main()
writeFileSync('github-token-diagnostic.json',JSON.stringify(result,null,2)+'\n',{mode:0o600})
process.stdout.write(JSON.stringify({diagnostic:result.diagnostic,apiCalls:result.apiCalls.length,failure:result.failure?.category||null})+'\n')
