// Country diagnostics only. This module neither collects provider data nor authorizes release.
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {readFileSync,mkdirSync,writeFileSync,renameSync,realpathSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {approvalDigest,createTransport,runBatch,validateSelection} from './vklopi-obstojece-lige.mjs'

const REPOSITORY='Lovro-splichal-orhanizagi/mnzgorenjska'
const PAGE_SIZE=500,MAX_INVENTORY_ROWS=10000
const READ_METHODS=['competition','state','season','rounds','matches','fantasyData']
const TUPLE=['id','slug','source','source_league_code']
const hash=value=>createHash('sha256').update(value).digest('hex')
const fail=message=>{throw Error(message)}
const validSha=value=>/^[a-f0-9]{40}$/.test(value??'')
function requireOptions({country,limit,offset,expectedSha}) {
 if(!/^[A-Z]{2}$/.test(country??''))fail('Country must be two uppercase letters.')
 if(!Number.isSafeInteger(limit)||limit<1||limit>5)fail('Limit must be 1–5.')
 if(!Number.isSafeInteger(offset)||offset<0||offset>10000)fail('Offset must be 0–10000.')
 if(!validSha(expectedSha))fail('Exact 40-character expected main SHA required.')
}
export function parseArguments(args) {
 const options={limit:5,offset:0,output:'release/country-preview'},seen=new Set()
 const names={'--country':'country','--limit':'limit','--offset':'offset','--expected-sha':'expectedSha','--output':'output'}
 for(let i=0;i<args.length;i+=2) {
  const key=names[args[i]],value=args[i+1]
  if(!key||seen.has(key)||typeof value!=='string'||!value.length||value.startsWith('--'))fail('Invalid or duplicate preview argument.')
  seen.add(key)
  if(['limit','offset'].includes(key)&&!/^\d+$/.test(value))fail(`Invalid ${key}.`)
  options[key]=['limit','offset'].includes(key)?Number(value):value
 }
 requireOptions(options)
 return options
}
export function assertExecution({expectedSha,headSha,env=process.env}) {
 if(!validSha(expectedSha)||headSha!==expectedSha||env.GITHUB_ACTIONS!=='true'||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_SHA!==expectedSha||env.GITHUB_REPOSITORY!==REPOSITORY||! /^[1-9]\d*$/.test(env.GITHUB_RUN_ID??''))
  fail('Country preview requires GitHub Actions on exact main commit in the reviewed repository.')
}
export function loadRegistry() {
 const bytes=readFileSync(new URL('./policies/existing-league-candidates-20261018.json',import.meta.url))
 return {registry:JSON.parse(bytes),registrySha256:hash(bytes)}
}
export function createReadOnlyTransport({url,key,fetch:request=globalThis.fetch}) {
 const base=new URL(url)
 if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||!key)fail('Exact HTTPS database origin and Actions database key required.')
 const safeFetch=async(target,options={})=>{
  const address=new URL(target),method=options.method??'GET'
  const readTable=/^\/rest\/v1\/(competitions|rounds|matches|fantasy_teams|fantasy_lineups)$/.test(address.pathname)
  const readRPC=/^\/rest\/v1\/rpc\/(stanje_lige|sezona_lige)$/.test(address.pathname)
  if(address.origin!==base.origin||address.username||address.password||address.hash||!(method==='GET'&&readTable||method==='POST'&&readRPC))fail('Only allowlisted database reads are permitted.')
  return request(address,{...options,redirect:'error'})
 }
 const native=createTransport({url:base.href,key,fetch:safeFetch})
 return {
  ...Object.fromEntries(READ_METHODS.map(name=>[name,native[name]])),
  inventory:async({country,offset,limit})=>{
   if(!/^[A-Z]{2}$/.test(country??'')||!Number.isSafeInteger(offset)||offset<0||offset>MAX_INVENTORY_ROWS||limit!==PAGE_SIZE)fail('Invalid bounded inventory request.')
   const target=new URL('/rest/v1/competitions',base)
   target.search=new URLSearchParams({select:'id,slug,active,source,source_league_code,source_policy,date_only_deadline_policy,countries!inner(code)','countries.code':`eq.${country}`,order:'id',offset:String(offset),limit:String(limit)}).toString()
   const response=await safeFetch(target,{method:'GET',headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)})
   if(!response.ok)fail(`Inventory database request failed (HTTP ${response.status}).`)
   return response.json()
  },
 }
}
function validateRegistry(registry) {
 if(!registry||!Array.isArray(registry.candidates)||!registry.source_contracts||typeof registry.source_contracts!=='object')fail('Invalid reviewed registry.')
 const ids=new Set(),slugs=new Set()
 for(const c of registry.candidates) {
  if(!Number.isSafeInteger(c.id)||c.id<1||typeof c.slug!=='string'||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.slug)||typeof c.source!=='string'||!c.source.length||typeof c.source_league_code!=='string'||!c.source_league_code.length||ids.has(c.id)||slugs.has(c.slug))fail('Invalid or duplicate registry tuple.')
  ids.add(c.id);slugs.add(c.slug)
 }
}
function candidateReason(c,row,country) {
 if(!row)return 'MISSING_INVENTORY_CANDIDATE'
 if(TUPLE.some(key=>row[key]!==c[key]))return 'TUPLE_DRIFT'
 if(!row.countries||typeof row.countries.code!=='string'||! /^[A-Z]{2}$/.test(row.countries.code))return 'INVALID_COUNTRY_METADATA'
 if(row.countries.code!==country)return 'COUNTRY_MISMATCH'
 if(typeof row.active!=='boolean')return 'INVALID_ACTIVE_METADATA'
 if(row.active)return 'ALREADY_ACTIVE'
 if(!Object.hasOwn(row,'source_policy')||!Object.hasOwn(row,'date_only_deadline_policy'))return 'INVALID_POLICY_METADATA'
 if(row.source_policy!==null)return 'CUSTOM_SOURCE_POLICY'
 if(row.date_only_deadline_policy!==null)return 'CUSTOM_DEADLINE_POLICY'
 return null
}
export async function runCountryPreview({country,limit=5,offset=0,expectedSha,registry,registrySha256,inventory,transport={},previewRunner=runBatch,now=()=>new Date(),onCheckpoint=()=>{}}) {
 requireOptions({country,limit,offset,expectedSha})
 const report={version:1,mode:'preview',country,expected_sha:expectedSha,limit,offset,catalog_scope:'REVIEWED_GENERIC_CANDIDATES_ONLY',autoActivationAllowed:false,source_freshness:'NOT_CHECKED',inventory_capture_started_at:null,inventory_capture_completed_at:null,pagination:{page_size:PAGE_SIZE,maximum_rows:MAX_INVENTORY_ROWS,pages:[],complete:false,inventory_count:0},selected:[],skipped:[],children:[],results:[],not_processed:[],status:'PLANNING'}
 const checkpoint=async()=>onCheckpoint(structuredClone(report))
 try {
  validateRegistry(registry)
  report.registry_sha256=registrySha256??hash(JSON.stringify(registry))
  if(!/^[a-f0-9]{64}$/.test(report.registry_sha256))fail('Invalid registry SHA256.')
  const candidates=registry.candidates.filter(c=>c.slug.startsWith(country.toLowerCase()+'-')).sort((a,b)=>a.slug<b.slug?-1:a.slug>b.slug?1:0)
  const seal=()=>{
   report.source_contracts=Object.fromEntries([...new Set(report.selected.map(c=>c.source))].sort().map(source=>[source,registry.source_contracts[source]]))
   report.plan_sha256=hash(JSON.stringify({expected_sha:expectedSha,registry_sha256:report.registry_sha256,country,limit,offset,selected:report.selected,source_contracts:report.source_contracts}))
  }
  if(!candidates.length) {
   seal();report.status='NO_GENERIC_CATALOG';report.reason_code=country==='DE'?'FUSSBALL_CAPTURE_REQUIRED':'NO_GENERIC_CATALOG'
   report.guidance=country==='DE'?'fussball-capture-required':'No reviewed generic candidates; this is not a whole-country inventory.'
   await checkpoint();return report
  }
  report.inventory_capture_started_at=now().toISOString();await checkpoint()
  const rows=[],ids=new Set(),slugs=new Set()
  for(let pageOffset=0;pageOffset<MAX_INVENTORY_ROWS;pageOffset+=PAGE_SIZE) {
   const page=await inventory({country,offset:pageOffset,limit:PAGE_SIZE})
   if(!Array.isArray(page)||page.length>PAGE_SIZE)fail('Invalid inventory page.')
   for(const row of page) {
    if(!Number.isSafeInteger(row?.id)||row.id<1||typeof row.slug!=='string'||ids.has(row.id)||slugs.has(row.slug)||rows.length&&row.id<=rows.at(-1).id)fail('Invalid, duplicate or unordered inventory identity.')
    ids.add(row.id);slugs.add(row.slug);rows.push(row)
   }
   report.pagination.pages.push({offset:pageOffset,count:page.length});report.pagination.inventory_count=rows.length
   await checkpoint()
   if(page.length<PAGE_SIZE){report.pagination.complete=true;break}
  }
  if(!report.pagination.complete)fail('Inventory pagination bound reached; completeness unknown.')
  report.inventory_capture_completed_at=now().toISOString()
  const byId=new Map(rows.map(row=>[row.id,row])),eligible=[]
  for(const c of candidates) {
   let reason=candidateReason(c,byId.get(c.id),country)
   if(!reason)try {
    validateSelection(registry,[c.slug])
    const contract=registry.source_contracts[c.source]
    if(!contract||typeof contract.document!=='string'||typeof contract.permission!=='string')fail('Missing source contract.')
   } catch {reason='OUTSIDE_GENERIC_SCOPE'}
   if(reason)report.skipped.push({candidate:c,slug:c.slug,status:'SKIPPED',reason_code:reason,activationEligible:false})
   else eligible.push(c)
  }
  report.eligible_count=eligible.length
  report.selected=eligible.slice(offset,offset+limit)
  report.remaining_after_batch=Math.max(0,eligible.length-offset-limit)
  seal();report.status=report.selected.length?'PREVIEWING':'EMPTY_SELECTION';await checkpoint()
  for(let index=0;index<report.selected.length;index++) {
   const candidate=report.selected[index]
   let infrastructureError=null
   // Existing preview catches data failures per league. Preserve transport failures separately.
   const readOnly=Object.fromEntries(READ_METHODS.filter(name=>typeof transport[name]==='function').map(name=>[name,async(...args)=>{
    try {return await transport[name](...args)}catch(error){infrastructureError=error;throw error}
   }]))
   const sourceContracts={[candidate.source]:registry.source_contracts[candidate.source]}
   const child={scope:{sha:expectedSha,mode:'preview',candidates:[candidate],source_contracts:sourceContracts,approval_sha256:approvalDigest(expectedSha,[candidate],sourceContracts)},results:[]}
   report.children.push(child);await checkpoint()
   try {
    const results=await previewRunner({candidates:[candidate],transport:readOnly,apply:false,now})
    if(Array.isArray(results))child.results=results
    if(infrastructureError)throw infrastructureError
    if(!Array.isArray(results)||results.length!==1||results[0]?.slug!==candidate.slug||!['READY','HOLD','ALREADY_ACTIVE'].includes(results[0].status))fail('Invalid child preview result.')
    const result=results[0]
    report.results.push({slug:candidate.slug,status:result.status==='READY'?'PROVISIONAL_READY':result.status,reason_code:result.status==='READY'?'NEEDS_STRICT_SOURCE_AUDIT':result.status==='HOLD'?'CHILD_HOLD':'ALREADY_ACTIVE_DURING_PREVIEW',activationEligible:false,child_result:result})
    await checkpoint()
   } catch(error) {
    report.results.push({slug:candidate.slug,status:'HOLD',reason_code:'INFRASTRUCTURE_ERROR',activationEligible:false})
    report.not_processed=report.selected.slice(index+1).map(c=>c.slug)
    throw error
   }
  }
  if(report.status==='PREVIEWING')report.status='PREVIEW_COMPLETE'
 } catch(error) {
  report.status='INFRASTRUCTURE_ERROR';report.infrastructure_error=String(error?.message??'Country preview infrastructure failed.')
 }
 await checkpoint();return report
}
async function main() {
 const options=parseArguments(process.argv.slice(2))
 const headSha=execFileSync('git',['-C',fileURLToPath(new URL('..',import.meta.url)),'rev-parse','HEAD'],{encoding:'utf8'}).trim()
 const output=resolve(options.output);mkdirSync(output,{recursive:true})
 const save=(name,value)=>{const path=resolve(output,name);writeFileSync(path+'.tmp',JSON.stringify(value,null,2)+'\n');renameSync(path+'.tmp',path)}
 const checkpoint=report=>{save('plan.json',report);save('child-previews.json',report.children)}
 try {
  assertExecution({expectedSha:options.expectedSha,headSha})
  const {registry,registrySha256}=loadRegistry()
  const transport=createReadOnlyTransport({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY})
  const report=await runCountryPreview({...options,registry,registrySha256,inventory:transport.inventory,transport,onCheckpoint:checkpoint})
  save('summary.json',{country:report.country,status:report.status,selected:report.selected.map(c=>c.slug),counts:report.results.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{}),autoActivationAllowed:false,source_freshness:'NOT_CHECKED',plan_sha256:report.plan_sha256})
  console.log(`${report.country}: ${report.status}; ${report.selected.length} reviewed candidates; activation disabled.`)
  if(report.status==='INFRASTRUCTURE_ERROR')process.exitCode=1
 } catch(error) {
  save('failure.json',{status:'INFRASTRUCTURE_ERROR',country:options.country,expected_sha:options.expectedSha,autoActivationAllowed:false,reason:String(error?.message??'Preview failed.')})
  process.exitCode=1
 }
}
if(process.argv[1]&&realpathSync(resolve(process.argv[1]))===fileURLToPath(import.meta.url))main().catch(error=>{console.error(`::error::${error.message}`);process.exitCode=1})
