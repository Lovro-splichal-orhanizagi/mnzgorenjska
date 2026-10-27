// Service-only retained replay. No football transport, local env loading, raw
// evidence output, or retry after a database write is uncertain.
import {existsSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {GERMANY_BULK_CANDIDATES,validateGermanyCandidate} from './bulk-germany-source.mjs'
import {isFussballCommunityCandidate,FUSSBALL_COMMUNITY_SOURCE_POLICY} from './fussball-community-policy.mjs'
import {processFussballCardJob} from './fussball-community-runtime.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska'
const require=(ok,message)=>{if(!ok)throw Error('FUSSBALL card worker: '+message)}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const nativeId=id=>Number.isSafeInteger(id)&&id>0
function reviewed(slug){
 const candidates=GERMANY_BULK_CANDIDATES.filter(isFussballCommunityCandidate)
 require(candidates.length<=16&&(!slug||candidates.some(c=>c.slug===slug)),'unknown or unbounded reviewed selection')
 return candidates.filter(c=>!slug||c.slug===slug).map(c=>validateGermanyCandidate(c))
}
async function rpc(db,name,args){const {data,error}=await db.rpc(name,args);if(error)throw Error('FUSSBALL card worker database operation failed');return data}
async function scopesFor(db,slug){
 const scopes=[];let competitions=0
 for(const c of reviewed(slug)){
  const {data:row,error}=await db.from('competitions').select('id,slug,source,source_league_code,source_policy,country_id').eq('slug',c.slug).maybeSingle()
  require(!error,'competition lookup failed')
  if(!row||row.source_policy==null)continue
  require(nativeId(row.id)&&nativeId(row.country_id)&&row.source_policy===FUSSBALL_COMMUNITY_SOURCE_POLICY&&['slug','source','source_league_code'].every(k=>row[k]===c[k]),'native reviewed tuple differs')
  const {data:country,error:countryError}=await db.from('countries').select('code').eq('id',row.country_id).maybeSingle()
  require(!countryError&&country?.code==='DE','actual registered country differs')
  const installed=await rpc(db,'get_fussball_card_policy',{p_competition_id:row.id})
  require(installed?.installed===true&&typeof installed.enabled==='boolean'&&installed.source_policy===FUSSBALL_COMMUNITY_SOURCE_POLICY&&installed.current_code===c.source_league_code&&Array.isArray(installed.archive_codes)&&same([...installed.archive_codes].sort(),c.archives.map(a=>a.code).sort()),'exact installed current/archive policy required')
  if(!installed.enabled)continue
  competitions++
  for(const code of [c.source_league_code,...c.archives.map(a=>a.code)])scopes.push({competitionId:row.id,code})
 }
 return {scopes,competitions}
}
export async function runFussballCardReplayWorker({db,slug,maxJobs=10,runId,processJob=processFussballCardJob}={}){
 require(db&&typeof db.rpc==='function'&&typeof db.from==='function'&&Number.isSafeInteger(maxJobs)&&maxJobs>=1&&maxJobs<=10&&/^[1-9]\d{0,15}$/.test(runId??''),'bounded native worker scope required')
 const {scopes,competitions}=await scopesFor(db,slug),summary={competitions,scopes:scopes.length,processed:0,applied:0,held:0}
 const exhausted=new Set(),seen=new Set(),offset=scopes.length?Number(BigInt(runId)%BigInt(scopes.length)):0
 while(summary.processed<maxJobs&&exhausted.size<scopes.length){
  for(let i=0;i<scopes.length&&summary.processed<maxJobs;i++){
   const index=(i+offset)%scopes.length;if(exhausted.has(index))continue
   const scope=scopes[index],jobs=await rpc(db,'get_fussball_card_replay_jobs',{p_competition_id:scope.competitionId,p_code:scope.code,p_limit:1})
   require(Array.isArray(jobs)&&jobs.length<=1,'bounded replay job inventory differs')
   if(!jobs.length){exhausted.add(index);continue}
   const job=jobs[0],key=JSON.stringify([scope.competitionId,scope.code,job.match_id,job.revision_sha256,job.resolution_sha256])
   require(!seen.has(key),'unchanged replay job returned after acknowledged write; no retry');seen.add(key)
   const result=await processJob({db,...scope,job})
   require(result?.status==='APPLIED'||result?.status==='HOLD','replay job outcome unacknowledged')
   summary.processed++;summary[result.status==='APPLIED'?'applied':'held']++
  }
 }
 return summary
}
export function createFussballCardReplayFetch(baseUrl,request=globalThis.fetch){
 const base=new URL(baseUrl)
 require(base.protocol==='https:'&&!base.username&&!base.password,'HTTPS service origin required')
 const endpoints=new Set(['get_fussball_card_policy','get_fussball_card_replay_jobs','defer_fussball_card_replay','apply_fussball_card_report'])
 return async(input,options={})=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url),method=(options.method??input?.method??'GET').toUpperCase()
  const rpcName=url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1]
  require(url.origin===base.origin&&(method==='GET'&&['/rest/v1/competitions','/rest/v1/countries'].includes(url.pathname)||method==='POST'&&endpoints.has(rpcName)),'request outside retained native replay boundary')
  return request(input,{...options,redirect:'error',signal:AbortSignal.timeout(60000)})
 }
}
export async function runFussballCardReplay(args,{env=process.env,headSha,envFileExists=existsSync('.env'),db,processJob}={}){
 args=[...args];const mode=args.shift();require(['check','run'].includes(mode),'check or run required')
 let slug
 if(args.length){require(args.length===2&&args[0]==='--liga'&&/^de-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args[1]),'only one exact manual league is accepted');slug=args[1]}
 reviewed(slug)
 headSha??=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
 require(!envFileExists&&env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY===repository&&env.GITHUB_REF==='refs/heads/main'&&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')&&env.GITHUB_SHA===headSha&&env.GITHUB_RUN_ATTEMPT==='1'&&/^[1-9]\d{0,15}$/.test(env.GITHUB_RUN_ID??'')&&['schedule','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)&&env.GITHUB_WORKFLOW_REF===repository+'/.github/workflows/replay-fussball-cards.yml@refs/heads/main','exact main first-attempt Actions execution without local env required')
 if(mode==='check')return {allowed:true}
 if(!db){
  require(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY,'Actions service configuration required')
  const {createClient}=await import('@supabase/supabase-js')
  db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{db:{retry:false},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:createFussballCardReplayFetch(env.SUPABASE_URL)}})
 }
 return runFussballCardReplayWorker({db,slug,runId:env.GITHUB_RUN_ID,...(processJob?{processJob}:{})})
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))runFussballCardReplay(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result))).catch(()=>{console.error('FUSSBALL card replay stopped; inspect private native state before a distinct run.');process.exitCode=1})
