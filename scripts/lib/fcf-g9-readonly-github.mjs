// Diagnostic-only bounded GitHub GET transport. Never used by production readers.
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {parseBadenGithubResponse,BADEN_GITHUB_HEADER_BYTES} from './baden-github-read-cache.mjs'

const repository='Lovro-splichal-orhanizagi/mnzgorenjska',prefix=`repos/${repository}/`,MiB=1024*1024,maxAttempts=2
let allowsEscapeSequences=null
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),need=(v,c)=>{if(!v)throw Object.assign(Error(c),{code:c})}
function childEnvironment(){need(typeof process.env.PATH==='string'&&typeof process.env.HOME==='string'&&typeof process.env.GH_TOKEN==='string'&&process.env.GH_TOKEN.length>0,'G9_GITHUB_CREDENTIAL_CONTEXT');return {PATH:process.env.PATH,HOME:process.env.HOME,GH_TOKEN:process.env.GH_TOKEN,GH_HOST:'github.com',GH_PROMPT_DISABLED:'1'}}
function supportsEscapeSequences(env){if(allowsEscapeSequences!==null)return allowsEscapeSequences;try{const help=execFileSync('gh',['api','--help'],{env,encoding:null,maxBuffer:2*MiB,timeout:10000,stdio:['ignore','pipe','pipe']});allowsEscapeSequences=help.toString('utf8').includes('--allow-escape-sequences')}catch{allowsEscapeSequences=false}return allowsEscapeSequences}
function safeTransportCode(error){const text=Buffer.isBuffer(error?.stderr)?error.stderr.toString('utf8'):String(error?.stderr??'');if(error?.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER')return 'G9_GITHUB_BODY_BOUND';if(error?.code==='ECONNRESET'||/ECONNRESET|connection reset by peer/i.test(text))return 'G9_GITHUB_CONNECTION_RESET';if(error?.code==='ETIMEDOUT'||error?.killed===true||/ETIMEDOUT|i\/o timeout|context deadline exceeded|TLS handshake timeout|timeout awaiting response headers/i.test(text))return 'G9_GITHUB_TIMEOUT';if(error?.code==='EPIPE'||/EPIPE|broken pipe/i.test(text))return 'G9_GITHUB_IO_FAILURE';if(/unexpected EOF|unexpectedEOF/i.test(text))return 'G9_GITHUB_UNEXPECTED_EOF';return 'G9_GITHUB_PROCESS_FAILURE'}
function safeError(code,status=null){return Object.assign(Error(code),{code,status})}
function requestArgs(path,binary,env){const args=['api','--include',...(binary&&supportsEscapeSequences(env)?['--allow-escape-sequences']:[]),'--method','GET',path];if(binary)args.push('-H',`Accept: ${path.startsWith(prefix+'releases/assets/')?'application/octet-stream':'application/vnd.github+json'}`);return args}
export async function getFcfG9ReadonlyGithub(path,binary=false,{onAttempt=()=>{}}={}){
 need(typeof path==='string'&&path.startsWith(prefix)&&!path.includes('..')&&!/[\x00-\x20\x7f#\\]/.test(path)&&!path.includes('://')&&typeof binary==='boolean','G9_GITHUB_FIXED_REPOSITORY_PATH');need(typeof onAttempt==='function','G9_GITHUB_ATTEMPT_OBSERVER');const env=childEnvironment(),limit=(binary?100:8)*MiB,attemptMaxBuffer=limit+BADEN_GITHUB_HEADER_BYTES+1,args=requestArgs(path,binary,env)
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  const started=performance.now();onAttempt({event:'PHYSICAL_GET_STARTED',attempt,binary,path,at:new Date().toISOString()});let raw
  try{raw=execFileSync('gh',args,{env,encoding:null,maxBuffer:attemptMaxBuffer,timeout:60000,stdio:['ignore','pipe','pipe']})}
  catch(error){
   const stdout=Buffer.isBuffer(error?.stdout)?error.stdout:Buffer.alloc(0);let response=null
   if(stdout.length){try{response=parseBadenGithubResponse(stdout,limit)}catch(parseError){const code=parseError?.code==='BADEN_GITHUB_BODY_BOUND'?'G9_GITHUB_BODY_BOUND':'G9_GITHUB_RESPONSE_INVALID';onAttempt({event:'PHYSICAL_GET_FINISHED',attempt,binary,path,outcome:'failure',status:null,safeErrorCode:code,elapsedMs:Math.round(performance.now()-started),bytes:stdout.length,bodySha256:null});throw safeError(code)}}
   const status=response?.status??null,transportCode=response?null:safeTransportCode(error),retryStatus=[502,503,504].includes(status),retryTransport=['G9_GITHUB_CONNECTION_RESET','G9_GITHUB_TIMEOUT','G9_GITHUB_IO_FAILURE','G9_GITHUB_UNEXPECTED_EOF'].includes(transportCode),retryable=retryStatus||retryTransport,willRetry=retryable&&attempt<maxAttempts
   onAttempt({event:'PHYSICAL_GET_FINISHED',attempt,binary,path,outcome:willRetry?(retryStatus?'retryable_http':'retryable_transport'):'failure',status,safeErrorCode:retryStatus?`G9_GITHUB_HTTP_${status}`:transportCode,elapsedMs:Math.round(performance.now()-started),bytes:response?.body.length??0,bodySha256:response?sha(response.body):null})
   if(willRetry)continue
   if(status!==null&&status!==200)throw safeError(`G9_GITHUB_HTTP_${status}`,status)
   if(status===200)throw safeError('G9_GITHUB_PROCESS_FAILURE',200)
   throw safeError(transportCode??'G9_GITHUB_PROCESS_FAILURE')
  }
  let response
  try{response=parseBadenGithubResponse(raw,limit)}catch(error){const code=error?.code==='BADEN_GITHUB_BODY_BOUND'?'G9_GITHUB_BODY_BOUND':'G9_GITHUB_RESPONSE_INVALID';onAttempt({event:'PHYSICAL_GET_FINISHED',attempt,binary,path,outcome:'failure',status:null,safeErrorCode:code,elapsedMs:Math.round(performance.now()-started),bytes:raw.length,bodySha256:null});throw safeError(code)}
  if(response.status!==200){const retryable=[502,503,504].includes(response.status),willRetry=retryable&&attempt<maxAttempts;onAttempt({event:'PHYSICAL_GET_FINISHED',attempt,binary,path,outcome:willRetry?'retryable_http':'failure',status:response.status,safeErrorCode:`G9_GITHUB_HTTP_${response.status}`,elapsedMs:Math.round(performance.now()-started),bytes:response.body.length,bodySha256:sha(response.body)});if(willRetry)continue;throw safeError(`G9_GITHUB_HTTP_${response.status}`,response.status)}
  let value;if(binary)value=response.body;else{try{value=JSON.parse(response.body.toString('utf8'))}catch{onAttempt({event:'PHYSICAL_GET_FINISHED',attempt,binary,path,outcome:'failure',status:200,safeErrorCode:'G9_GITHUB_JSON_INVALID',elapsedMs:Math.round(performance.now()-started),bytes:response.body.length,bodySha256:sha(response.body)});throw safeError('G9_GITHUB_JSON_INVALID')}}
  onAttempt({event:'PHYSICAL_GET_FINISHED',attempt,binary,path,outcome:'success',status:200,elapsedMs:Math.round(performance.now()-started),bytes:response.body.length,bodySha256:sha(response.body)});return value
 }
 throw safeError('G9_GITHUB_ATTEMPT_BOUND')
}
