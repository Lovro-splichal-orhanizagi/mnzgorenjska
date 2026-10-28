// Separate fixed future G9 DB transport. No caller SQL, retry or legacy mutation.
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {fcfSixPolicyIdHashes} from './fcf-six-historical-policy.mjs'
import {historicalStatisticsPolicySha256 as fingerprint} from './lib/historical-statistics-policy.mjs'
const fail=m=>{throw Error(`FCF_FUTURE_DB: ${m}`)},sha=t=>createHash('sha256').update(t).digest('hex'),literal=s=>"'"+s.replaceAll("'","''")+"'",limit=32*1024*1024
function keys(x,fields,label){if(!x||Object.getPrototypeOf(x)!==Object.prototype||Object.keys(x).sort().join(',')!==fields.slice().sort().join(','))fail(`${label} closed fields required`)}
function text(value,expected,label){if(typeof value!=='string'||!value.length||Buffer.byteLength(value)>8*1024*1024||value.charCodeAt(0)===0xfeff||!/^[a-f0-9]{64}$/.test(expected??'')||sha(value)!==expected)fail(`${label} exact bounded TEXT/SHA required`);let p;try{p=JSON.parse(value)}catch{fail(`${label} JSON required`)}return p}
function ambiguous(){const e=Error('FCF_FUTURE_DB: ambiguous database response; read back receipt before retry');e.ambiguous=true;return e}
export function createFcfFutureTargetDatabase(input={}){
 keys(input,Object.keys(input).filter(k=>['env','execute','network'].includes(k)),'database options')
 const {env=process.env,execute=execFileSync,network=globalThis.fetch}=input
 if(typeof execute!=='function'||typeof network!=='function')fail('fixed database adapters required')
 if(env.SUPABASE_DB_URL){let u;try{u=new URL(env.SUPABASE_DB_URL)}catch{fail('invalid database endpoint')};if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!=='127.0.0.1'||u.port!=='5432'||u.hash||[...u.searchParams].some(([k,v])=>k!=='sslmode'||!['disable','prefer','require'].includes(v)))fail('existing localhost5432 SSH tunnel required')}
 const selected=s=>{if(s!=='es-ct-tercera-g9')fail('exact selected future G9 required');return literal(s)}
 const privacy=values=>{if(!Array.isArray(values)||values.length>20000||new Set(values).size!==values.length||values.some(v=>typeof v!=='string'||!/^[a-f0-9]{64}$/.test(v)))fail('unique bounded privacy SHA keys required');return `ARRAY[${values.map(literal).join(',')}]::text[]`}
 function read(expression){
  if(!env.SUPABASE_DB_URL)fail('existing database URL required')
  // URI host validation alone does not constrain libpq's actual destination:
  // inherited hostaddr/service settings must not bypass the existing tunnel.
  const readEnv={...env,PGDATABASE:env.SUPABASE_DB_URL,PGHOSTADDR:'127.0.0.1',PGCONNECT_TIMEOUT:'15'}
  for(const key of ['PGSERVICE','PGSERVICEFILE','PGSYSCONFDIR'])delete readEnv[key]
  let raw;try{raw=execute('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{env:readEnv,input:`BEGIN READ ONLY;\nSET LOCAL ROLE service_role;\nSET LOCAL statement_timeout='180s';\nSELECT ${expression};\nROLLBACK;\n`,timeout:200000,maxBuffer:limit,stdio:['pipe','pipe','pipe']})}catch{fail('readonly database query failed')}
  try{const value=String(raw).trim();if(Buffer.byteLength(value)>limit)fail('readonly result bound exceeded');return JSON.parse(value)}catch{fail('invalid bounded readonly database result')}
 }
 function parameters(stage,p){
  const fields={prepare:['p_main_sha','p_policy_hashes'],apply:['p_main_sha','p_policy_hashes','p_before_sha','p_before_image_text'],import:['p_rollout_text','p_sha256'],check:['p_activation_text','p_sha256','p_activate']},names={prepare:'fcf_future_historical_six_prepare',apply:'fcf_future_historical_six_apply',import:'fcf_future_current_target_import',check:'fcf_future_current_target_check'}
  if(!Object.hasOwn(fields,stage))fail('closed future mutation stage required');keys(p,fields[stage],'mutation parameters')
  if(['prepare','apply'].includes(stage)&&(!/^[a-f0-9]{40}$/.test(p.p_main_sha??'')||fingerprint(p.p_policy_hashes)!==fingerprint(fcfSixPolicyIdHashes())))fail('reviewed main SHA/immutable six policy hashes required')
  if(stage==='apply'){const before=text(p.p_before_image_text,p.p_before_sha,'cleanup before-image');if(before?.schemaVersion!==3)fail('future schema3 cleanup before-image required')}
  if(stage==='import'){const r=text(p.p_rollout_text,p.p_sha256,'future import rollout');if(r.schemaVersion!==3||r.kind!=='fcf-future-current-target-import-rollout'||r.targetSlug!=='es-ct-tercera-g9')fail('separate future import rollout required')}
  if(stage==='check'){const a=text(p.p_activation_text,p.p_sha256,'future activation packet');if(a.schemaVersion!==4||a.kind!=='fcf-future-current-target-activation'||a.targetSlug!=='es-ct-tercera-g9'||typeof p.p_activate!=='boolean')fail('separate future activation packet/boolean required')}
  return names[stage]
 }
 async function mutate(stage,p){
  const name=parameters(stage,p);let base;try{base=new URL(env.SUPABASE_URL??env.VITE_SUPABASE_URL)}catch{fail('fixed database HTTPS origin required')}
  if(base.protocol!=='https:'||base.username||base.password||base.port||base.pathname!=='/'||base.search||base.hash||!env.SUPABASE_SERVICE_ROLE_KEY)fail('fixed database HTTPS origin/service key required')
  let response;try{response=await network(new URL(`/rest/v1/rpc/${name}`,base).href,{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(p),signal:AbortSignal.timeout(200000)})}catch{throw ambiguous()}
  if(response.status>=300&&response.status<400)fail('database redirect refused')
  if(response.status>=500)throw ambiguous()
  if(!response.ok)fail(`database transaction refused HTTP${response.status}`)
  let bytes;try{bytes=Buffer.from(await response.arrayBuffer())}catch{throw ambiguous()}
  if(bytes.length>limit)throw ambiguous()
  let result;try{result=JSON.parse(bytes.toString('utf8'))}catch{throw ambiguous()}
  if(!result||typeof result!=='object'||Array.isArray(result))throw ambiguous()
  return result
 }
 return Object.freeze({inventory(s,k){const value=read(`public.fcf_six_current_target_inventory(${selected(s)},${privacy(k)})`);if(!value||!Array.isArray(value.players))fail('complete readonly player inventory required');const fields=['id','competition_id','team_id','reg_st','full_name','position','position_source','anonimiziran_at','anonimiziran_razlog'];return {...value,players:value.players.map(p=>Object.fromEntries(fields.filter(k=>Object.hasOwn(p,k)).map(k=>[k,p[k]]))) }},projection:(s,k)=>read(`public.fcf_future_current_target_projection(${selected(s)},${privacy(k)})`),pricingSnapshot:s=>read(`public.fcf_six_current_target_pricing(${selected(s)})`),receipt:s=>read(`public.fcf_future_current_target_receipt(${selected(s)})`),mutate})
}
