// Fixed DB-only transport. No caller SQL, retries, redirects or source endpoint.
import {execFileSync} from 'node:child_process'
const targets=['es-ct-segona-g1','es-ct-tercera-g9']
const fail=m=>{throw Error(`FCF_DB: ${m}`)},literal=s=>"'"+String(s).replaceAll("'","''")+"'"
export function createFcfTargetDatabase({env=process.env,execute=execFileSync,network=fetch,sourcePolicy}={}){
 if(env.SUPABASE_DB_URL){let u;try{u=new URL(env.SUPABASE_DB_URL)}catch{fail('invalid database endpoint')};if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!=='127.0.0.1'||u.port!=='5432'||u.hash)fail('existing localhost5432 SSH tunnel required')}
 const selected=slug=>{if(!targets.includes(slug))fail('exact selected G1/G9 required');return literal(slug)}
 function read(expression){
  if(!env.SUPABASE_DB_URL)fail('existing database URL required')
  let raw
  try{raw=execute('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{env:{...env,PGDATABASE:env.SUPABASE_DB_URL,PGCONNECT_TIMEOUT:'15'},input:`BEGIN READ ONLY;\nSET LOCAL ROLE service_role;\nSET LOCAL statement_timeout='180s';\nSELECT ${expression};\nROLLBACK;\n`,timeout:200000,maxBuffer:32*1024*1024,stdio:['pipe','pipe','pipe']})}catch{fail('readonly database query failed')}
  try{const text=String(raw).trim();if(Buffer.byteLength(text)>32*1024*1024)fail('readonly result bound exceeded');return JSON.parse(text)}catch{fail('invalid readonly database result')}
 }
 const six=sourcePolicy==='es-fcf-six-reviewed-history-v1'
 if(sourcePolicy!==undefined&&!six&&sourcePolicy!=='es-fcf-reviewed-history-v1')fail('unknown source policy')
 const functions=six?{prepare:'fcf_historical_six_prepare',apply:'fcf_historical_six_apply',import:'fcf_six_current_target_import',check:'fcf_six_current_target_check'}:{prepare:'prepare_fcf_historical_cleanup',apply:'apply_fcf_current_target_cleanup',import:'import_fcf_current_target',check:'check_fcf_current_target'}
 async function mutate(stage,parameters){
  const name=functions[stage];if(!name)fail('closed mutation stage required')
  let base;try{base=new URL(env.SUPABASE_URL??env.VITE_SUPABASE_URL)}catch{fail('database HTTPS endpoint required')}
  if(base.protocol!=='https:'||base.username||base.password||base.port||base.search||base.hash||base.pathname!=='/'||!env.SUPABASE_SERVICE_ROLE_KEY)fail('fixed database HTTPS endpoint/service key required')
  let response
  try{response=await network(new URL(`/rest/v1/rpc/${name}`,base).href,{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(parameters),signal:AbortSignal.timeout(200000)})}catch{const e=Error('FCF_DB: ambiguous database response; read back receipt before retry');e.ambiguous=true;throw e}
  if(response.status>=300&&response.status<400)fail('database redirect refused')
  if(response.status>=500){const e=Error('FCF_DB: ambiguous database response; read back receipt before retry');e.ambiguous=true;throw e}
  let bytes;try{bytes=Buffer.from(await response.arrayBuffer())}catch{const e=Error('FCF_DB: ambiguous database response; read back receipt before retry');e.ambiguous=true;throw e}if(bytes.length>32*1024*1024)fail('database response bound exceeded')
  if(!response.ok)fail(`database transaction refused HTTP${response.status}`)
  try{return JSON.parse(bytes.toString('utf8'))}catch{const e=Error('FCF_DB: ambiguous database response; read back receipt before retry');e.ambiguous=true;throw e}
 }
 return Object.freeze({
  inventory(slug,keys){selected(slug);if(!Array.isArray(keys)||keys.length>20000||new Set(keys).size!==keys.length||keys.some(k=>!/^[a-f0-9]{64}$/.test(k)))fail('closed privacy keys required');return read(`public.${six?'fcf_six_current_target_inventory':'get_fcf_current_target_inventory'}(${selected(slug)},ARRAY[${keys.map(literal).join(',')}]::text[])`)},
  pricingSnapshot:slug=>read(`public.${six?'fcf_six_current_target_pricing':'get_fcf_target_pricing_snapshot'}(${selected(slug)})`),
  receipt:slug=>read(`public.${six?'fcf_six_current_target_receipt':'read_fcf_current_target_receipt'}(${selected(slug)})`),mutate,
 })
}
