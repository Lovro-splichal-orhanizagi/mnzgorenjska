// One-off branch diagnostic. GET only; never a cleanup/native authority.
import {mkdirSync, writeFileSync} from 'node:fs'

const repository='Lovro-splichal-orhanizagi/mnzgorenjska'
const deployed='d25c9b0bac906e2b9f7ad13e749a724e7b6fac77'
const branch='refs/heads/codex/g9-readonly-endpoint-diagnostic-20261028'
const env=process.env, sha=value=>/^[a-f0-9]{40}$/.test(value??'')
const result={schemaVersion:1,kind:'fcf-endpoint-readonly-diagnostic',nativeAuthority:false,
  capturedUTC:new Date().toISOString(),runId:/^[1-9]\d*$/.test(env.GITHUB_RUN_ID??'')?env.GITHUB_RUN_ID:null,
  runAttempt:/^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT??'')?env.GITHUB_RUN_ATTEMPT:null,
  diagnosticSha:sha(env.GITHUB_SHA)?env.GITHUB_SHA:null,mainSha:null,
  databaseUrlConfigured:env.DB_URL_CONFIGURED==='true',serviceKeyConfigured:!!env.SUPABASE_SERVICE_ROLE_KEY,
  identityVerified:false,originHost:null,requests:[],status:'held'}
const fail=code=>{const error=new Error();error.code=code;throw error}
const safeCodes=new Set(['identity_refused','main_identity_refused','invalid_origin',
  'missing_service_key','body_bound_exceeded','invalid_json','invalid_schema','invalid_competitions',
  'ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ETIMEDOUT','EHOSTUNREACH',
  'ENETUNREACH','CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET'])
function safeError(error){
  const name=['Error','TypeError','SyntaxError','AbortError','TimeoutError'].includes(error?.name)?error.name:'Error'
  const code=[error?.code,error?.cause?.code].find(value=>safeCodes.has(value))??'unclassified'
  return {name,code} // Never include message, stack, URL, headers, or response body.
}
async function boundedJSON(response,maximum){
  const reader=response.body?.getReader();if(!reader)fail('invalid_json')
  const chunks=[];let size=0
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength
      if(size>maximum)fail('body_bound_exceeded');chunks.push(Buffer.from(value))}
    try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{fail('invalid_json')}
  }finally{await reader.cancel().catch(()=>{})}
}
async function get(url,headers,maximum,entry){
  result.requests.push(entry)
  try{
    const response=await fetch(url,{method:'GET',redirect:'manual',headers,signal:AbortSignal.timeout(20000)})
    entry.httpStatus=response.status;entry.ok=response.ok;entry.jsonParsed=false
    if(!response.ok){await response.body?.cancel();return null}
    const body=await boundedJSON(response,maximum);entry.jsonParsed=true;return body
  }catch(error){entry.error=safeError(error);throw error}
}

try{
  if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==repository||env.GITHUB_REF!==branch||
    env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_RUN_ATTEMPT!=='1'||
    env.EXPECTED_MAIN_SHA!==deployed||!sha(env.EXPECTED_DIAGNOSTIC_SHA)||
    env.GITHUB_SHA!==env.EXPECTED_DIAGNOSTIC_SHA||env.GITHUB_SHA===deployed||!env.GH_TOKEN)fail('identity_refused')
  const main=await get(`https://api.github.com/repos/${repository}/git/ref/heads/main`,
    {Authorization:`Bearer ${env.GH_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
    64*1024,{purpose:'main-sha-check'})
  if(main?.ref!=='refs/heads/main'||main?.object?.type!=='commit'||main.object.sha!==deployed)fail('main_identity_refused')
  result.mainSha=main.object.sha;result.identityVerified=true

  let base;try{base=new URL(env.SUPABASE_URL)}catch{fail('invalid_origin')}
  // Match the actual writer's exact configured HTTPS origin; no fallback origin.
  if(base.protocol!=='https:'||base.username||base.password||base.port||base.pathname!=='/'||base.search||base.hash)fail('invalid_origin')
  result.originHost=base.hostname
  if(!env.SUPABASE_SERVICE_ROLE_KEY)fail('missing_service_key')
  const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    Accept:'application/openapi+json'}
  const schemaEntry={purpose:'rest-openapi',rpcPaths:null}
  const schema=await get(new URL('/rest/v1/',base),headers,8*1024*1024,schemaEntry)
  if(schemaEntry.ok){
    if(!schema||typeof schema!=='object'||Array.isArray(schema)||!schema.paths||typeof schema.paths!=='object'||Array.isArray(schema.paths))fail('invalid_schema')
    schemaEntry.rpcPaths=Object.fromEntries(['fcf_future_historical_six_prepare','fcf_future_historical_six_apply',
      'fcf_future_current_target_import','fcf_future_current_target_check'].map(name=>[name,Object.hasOwn(schema.paths,`/rpc/${name}`)]))

    // Only after a successful parsed schema, read three fixed native identities.
    const entry={purpose:'selected-competitions',rows:null}
    const url=new URL('/rest/v1/competitions',base)
    url.searchParams.set('id','in.(783,790,797)')
    url.searchParams.set('select','id,slug,active,prvi_fantasy_krog')
    url.searchParams.set('order','id.asc');url.searchParams.set('limit','3')
    const rows=await get(url,{...headers,Accept:'application/json'},64*1024,entry)
    if(entry.ok){
      const slugs=new Map([[783,'es-ct-segona-g1'],[790,'es-ct-tercera-g2'],[797,'es-ct-tercera-g9']])
      if(!Array.isArray(rows)||rows.length>3||new Set(rows.map(row=>row?.id)).size!==rows.length||rows.some(row=>
        !row||Object.keys(row).sort().join(',')!=='active,id,prvi_fantasy_krog,slug'||
        !slugs.has(row.id)||row.slug!==slugs.get(row.id)||typeof row.active!=='boolean'||
        row.prvi_fantasy_krog!==null&&!Number.isSafeInteger(row.prvi_fantasy_krog)))fail('invalid_competitions')
      entry.rows=rows.map(({id,slug,active,prvi_fantasy_krog})=>({id,slug,active,prvi_fantasy_krog}))
    }
  }
  result.status=result.requests.every(request=>request.ok===true)?'observed':'http-refused'
  if(result.status!=='observed')process.exitCode=1
}catch(error){result.error=safeError(error);process.exitCode=1}
finally{
  mkdirSync('fcf-endpoint-readonly',{mode:0o700})
  writeFileSync('fcf-endpoint-readonly/result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600})
  process.stdout.write(`FCF endpoint read-only diagnostic: ${result.status}; sanitized result retained.\n`)
}
