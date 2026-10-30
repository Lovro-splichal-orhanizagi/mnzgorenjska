import {getFcfG9Native800LaunchStageAttestation,describeFcfG9Native800LaunchReadback} from './fcf-g9-native800-launch-stage.mjs'
import {getFcfG9Native800StageAttestation,describeFcfG9Native800Readback} from './fcf-g9-native800-stage.mjs'
import {getFcfFutureTarget} from './fcf-future-target-catalog.mjs'
import {isFcfFutureNativeProtocol} from './fcf-future-native-scope.mjs'
// Separate fixed future G9 DB transport. No caller SQL, retry or legacy mutation.
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {fcfSixPolicyIdHashes} from './fcf-six-historical-policy.mjs'
import {historicalStatisticsPolicySha256 as fingerprint} from './lib/historical-statistics-policy.mjs'
const fail=m=>{throw Error(`FCF_FUTURE_DB: ${m}`)},sha=t=>createHash('sha256').update(t).digest('hex'),literal=s=>"'"+s.replaceAll("'","''")+"'",limit=32*1024*1024
function keys(x,fields,label){if(!x||Object.getPrototypeOf(x)!==Object.prototype||Object.keys(x).sort().join(',')!==fields.slice().sort().join(','))fail(`${label} closed fields required`)}
function text(value,expected,label){if(typeof value!=='string'||!value.length||Buffer.byteLength(value)>8*1024*1024||value.charCodeAt(0)===0xfeff||!/^[a-f0-9]{64}$/.test(expected??'')||sha(value)!==expected)fail(`${label} exact bounded TEXT/SHA required`);let p;try{p=JSON.parse(value)}catch{fail(`${label} JSON required`)}return p}
function ambiguous(){const e=Error('FCF_FUTURE_DB: ambiguous database response; read back receipt before retry');e.ambiguous=true;return e}
export function createFcfFutureTargetDatabase(input={}){return createDatabase(input,false)}
// Fixed diagnostic facade: no mutation/receipt API and no caller SQL or mode.
export function createFcfG1ReadOnlyDatabase(input={}){
 keys(input,Object.keys(input).filter(k=>['env','execute'].includes(k)),'G1 readonly options')
 const {inventory,projection,pricingSnapshot}=createDatabase({...input,targetSlug:'es-ct-segona-g1'},true)
 return Object.freeze({inventory,projection,pricingSnapshot})
}
// Fixed G9 preparation only: no caller SQL, target, clock, execute or network override.
export function createFcfG9Native800PreparationDatabase(input={}){
 keys(input,Object.hasOwn(input,'env')?['env']:[],'G9 native800 preparation options')
 return createDatabase({...input,targetSlug:'es-ct-tercera-g9'},false,true)
}
// Fixed native800 bridge. No CLI or operator approval issuer; cut3 runner absent.
export function createFcfG9Native800BridgeDatabase(input={}){
 keys(input,Object.hasOwn(input,'env')?['env']:[],'G9 native800 bridge options')
 return createDatabase({...input,targetSlug:'es-ct-tercera-g9'},false,false,true)
}
export function createFcfG9Native800LaunchDatabase(input={}){
 keys(input,Object.hasOwn(input,'env')?['env']:[],'G9 native800 launch options');return createDatabase({...input,targetSlug:'es-ct-tercera-g9'},false,false,false,true)
}
function createDatabase(input,g1Observer,g9Preparation=false,g9Bridge=false,g9Launch=false){
 keys(input,Object.keys(input).filter(k=>['env','execute','network','targetSlug'].includes(k)),'database options')
 const {env=process.env,execute=execFileSync,network=globalThis.fetch,targetSlug='es-ct-tercera-g9'}=input,target=getFcfFutureTarget({targetSlug})
 if(typeof execute!=='function'||typeof network!=='function')fail('fixed database adapters required')
 let connection
 if(env.SUPABASE_DB_URL){
  let u;try{u=new URL(env.SUPABASE_DB_URL)}catch{fail('invalid database endpoint')}
  if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!=='127.0.0.1'||u.port!=='5432'||u.hash||[...u.searchParams].some(([k,v])=>k!=='sslmode'||!['disable','prefer','require'].includes(v)))fail('existing localhost5432 SSH tunnel required')
  // PGDATABASE does not expand a connection URI. Decode individual libpq
  // values; preserve the original database path rather than URL dot normalization.
  const path=env.SUPABASE_DB_URL.trim().match(/^[^:]+:\/\/[^/?#]*(\/[^?#]*)?/)?.[1]??''
  let components;try{components=[u.username,u.password,path.slice(1)].map(decodeURIComponent);if(components.some(v=>v.includes('\0')))throw Error()}catch{fail('invalid database endpoint encoding')}
  const [PGUSER,PGPASSWORD,PGDATABASE]=components
  connection={PGUSER,PGPASSWORD,PGDATABASE,PGHOST:'127.0.0.1',PGPORT:'5432',PGSSLMODE:u.searchParams.getAll('sslmode').at(-1)??'prefer'}
 }
 const selected=s=>{if(s!==target.targetSlug)fail('exact selected future G9 required');return literal(s)}
 const privacy=values=>{if(!Array.isArray(values)||values.length>20000||new Set(values).size!==values.length||values.some(v=>typeof v!=='string'||!/^[a-f0-9]{64}$/.test(v)))fail('unique bounded privacy SHA keys required');return `ARRAY[${values.map(literal).join(',')}]::text[]`}
 function read(expression){
  if(!connection)fail('existing database URL required')
  // URI host validation alone does not constrain libpq's actual destination:
  // inherited hostaddr/service settings must not bypass the existing tunnel.
  const readEnv={...env,...connection,PGHOSTADDR:'127.0.0.1',PGCONNECT_TIMEOUT:'15'}
  for(const key of ['PGSERVICE','PGSERVICEFILE','PGSYSCONFDIR'])delete readEnv[key]
  let raw;try{raw=execute('psql',['-X','-w','-qAt','-v','ON_ERROR_STOP=1',...(g1Observer?['-v','VERBOSITY=verbose']:[])],{env:readEnv,input:`BEGIN READ ONLY;\nSET LOCAL ROLE service_role;\nSET LOCAL statement_timeout='180s';\nSELECT ${expression};\nROLLBACK;\n`,timeout:200000,maxBuffer:g9Launch?67108864:limit,stdio:['pipe','pipe','pipe']})}catch(cause){
   if(!g1Observer)fail('readonly database query failed')
   // Raw stderr stays in memory only. Never expose a message, URI or detail.
   const raw=Buffer.isBuffer(cause?.stderr)?cause.stderr.toString('utf8'):typeof cause?.stderr==='string'?cause.stderr:''
   const match=raw.match(/^ERROR:\s+([A-Z0-9]{5}): ([^\r\n]*)$/m),known={
    'FCF_TARGET: unknown/missing relevant FK definition, validation or deferrability':'FK_CATALOG_DRIFT',
    'FCF_TARGET: unknown relevant non-FK/Scout relation':'UNKNOWN_DEPENDENCY',
    'FCF_TARGET: explicit readonly transaction required':'READONLY_REQUIRED'
   },error=Error('FCF_FUTURE_DB: readonly database query failed')
   const states=['P0001','42501','57014','55P03','42883','08001','08006','53200','54000','22P02','42P01','42703','0A000','25006','25P02']
   error.readonlyDiagnostic=Object.freeze({sqlState:states.includes(match?.[1])?match[1]:'UNKNOWN',guard:known[match?.[2]]??'UNKNOWN'});throw error
  }
  try{const value=String(raw).trim();if(Buffer.byteLength(value)>(g9Launch?67108864:limit))fail('readonly result bound exceeded');return JSON.parse(value)}catch{fail('invalid bounded readonly database result')}
 }
 if(g9Launch){
  async function stage(activate,input){
   keys(input,['stageProof'],'native800 launch mutation');const s=getFcfG9Native800LaunchStageAttestation(input.stageProof),e=s.execution
   if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==e.repository||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_SHA!==e.commit||env.GITHUB_RUN_ID!==e.runId||env.GITHUB_RUN_ATTEMPT!=='1'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_JOB!==(activate?'native800-activate':'native800-check')||env.GITHUB_WORKFLOW_REF!==e.repository+'/.github/workflows/fcf-native800.yml@refs/heads/main')fail('exact current main native800 launch execution required')
   let origin;try{origin=new URL(env.SUPABASE_URL??env.VITE_SUPABASE_URL)}catch{fail('native800 launch database HTTPS origin required')}
   if(origin.protocol!=='https:'||origin.username||origin.password||origin.port||origin.pathname!=='/'||origin.search||origin.hash||!env.SUPABASE_SERVICE_ROLE_KEY)fail('fixed native800 launch database origin/service key required')
   let response;try{response=await network(new URL('/rest/v1/rpc/fcf_native800_launch',origin).href,{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_readiness_text:s.readinessText,p_sha256:s.readinessSha256,p_activate:activate,p_stage_text:s.attestationText,p_stage_sha256:s.attestationSha256}),signal:AbortSignal.timeout(200000)})}catch{throw ambiguous()}
   if(response.status>=300&&response.status<400)fail('native800 launch database redirect refused');if(response.status>=500)throw ambiguous();if(!response.ok)fail('native800 launch transaction refused HTTP'+response.status)
   try{const b=Buffer.from(await response.arrayBuffer());if(b.length>limit)throw Error();const r=JSON.parse(b.toString('utf8'));if(!r||typeof r!=='object'||Array.isArray(r))throw Error();return r}catch{throw ambiguous()}
  }
  return Object.freeze({dryCheck:input=>stage(false,input),activate:input=>stage(true,input),receipt:()=>read("public.fcf_native800_launch_receipt('es-ct-tercera-g9')"),readback(input){keys(input,['readinessText','readinessSha256'],'launch readback input');return describeFcfG9Native800LaunchReadback({...input,receipt:read("public.fcf_native800_launch_receipt('es-ct-tercera-g9')")})}})
 }
 if(g9Bridge){
  async function stage(mode,input){
   keys(input,['stageProof'],'native800 bridge input');const a=getFcfG9Native800StageAttestation(input.stageProof),e=a.execution
   if(a.stage!==mode||env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==e.repository||env.GITHUB_REF!==e.ref||env.GITHUB_SHA!==e.commit||env.GITHUB_RUN_ID!==e.runId||env.GITHUB_RUN_ATTEMPT!=='1'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_JOB!=='native800-'+mode||env.GITHUB_WORKFLOW_REF!==e.repository+'/.github/workflows/fcf-native800.yml@refs/heads/main')fail('actual fixed native800 main workflow epoch required; future operator approval gates remain mandatory')
   let origin;try{origin=new URL(env.SUPABASE_URL??env.VITE_SUPABASE_URL)}catch{fail('fixed native800 database origin required')}
   if(origin.protocol!=='https:'||origin.username||origin.password||origin.port||origin.pathname!=='/'||origin.search||origin.hash||!env.SUPABASE_SERVICE_ROLE_KEY)fail('fixed native800 database HTTPS/service identity required')
   const name=mode==='import'?'fcf_native800_import':'fcf_native800_check',parameters={p_rollout_text:a.rolloutText,p_sha256:a.rolloutSha256,p_stage_text:a.attestationText,p_stage_sha256:a.attestationSha256,...(mode==='check'?{p_activate:false}:{})}
   let response;try{response=await network(new URL('/rest/v1/rpc/'+name,origin).href,{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(parameters),signal:AbortSignal.timeout(200000)})}catch{throw ambiguous()}
   if(response.status>=300&&response.status<400)fail('native800 database redirect refused');if(response.status>=500)throw ambiguous();if(!response.ok)fail('native800 database transaction refused HTTP'+response.status)
   try{const b=Buffer.from(await response.arrayBuffer());if(b.length>limit)throw Error();const value=JSON.parse(b.toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value}catch{throw ambiguous()}
  }
  return Object.freeze({import:input=>stage('import',input),check:input=>stage('check',input),receipt:()=>read("public.fcf_native800_receipt('es-ct-tercera-g9')"),readback(input){keys(input,['rolloutText','rolloutSha256'],'native800 readback input');return describeFcfG9Native800Readback({...input,receipt:read("public.fcf_native800_receipt('es-ct-tercera-g9')")})}})
 }
 if(g9Preparation)return Object.freeze({prepare(input={}){
  keys(input,Object.hasOwn(input,'privacyKeys')?['privacyKeys']:[],'G9 native800 preparation input');const checked=privacy(input.privacyKeys??[])
  // One SELECT snapshot: the existing stable projection and both exact complete
  // score vectors observe the same SQL statement, never sequential RPC clocks.
  const scope=cid=>`(select jsonb_build_object('competitionId',${cid},'roundIds',(select coalesce(jsonb_agg(id order by id),'[]')from public.rounds where competition_id=${cid}),'playerIds',(select coalesce(jsonb_agg(id order by id),'[]')from public.players where competition_id=${cid}),'count',jsonb_array_length(rows),'snapshotText',rows::text,'snapshotSha256',encode(sha256(convert_to(rows::text,'UTF8')),'hex'))from(select coalesce(jsonb_agg(to_jsonb(ps)order by to_jsonb(ps)::text collate "C"),'[]'::jsonb)rows from public.player_scores ps where ps.round_id in(select id from public.rounds where competition_id=${cid})or ps.player_id in(select id from public.players where competition_id=${cid}))scores)`
  return read(`(WITH projection AS MATERIALIZED(SELECT public.fcf_future_current_target_projection('es-ct-tercera-g9',${checked})p),scores AS MATERIALIZED(SELECT ${scope(797)}g9,${scope(783)}g1)SELECT jsonb_build_object('projection',p,'scoreBeforeimages',jsonb_build_object('selectedG9',g9||jsonb_build_object('roundCounts',(select jsonb_agg(jsonb_build_object('roundId',r.id,'scoreRows',(select count(*)from public.player_scores ps where ps.round_id=r.id),'priceChangeRows',(select count(*)from public.price_changes pc where pc.round_id=r.id))order by r.id)from public.rounds r where r.competition_id=797)),'offTargetG1',g1))FROM projection CROSS JOIN scores)`)
 }})
 function parameters(stage,p){
  const fields={prepare:['p_main_sha','p_policy_hashes'],apply:['p_main_sha','p_policy_hashes','p_before_sha','p_before_image_text'],import:['p_rollout_text','p_sha256'],check:['p_activation_text','p_sha256','p_activate']},names={prepare:'fcf_future_historical_six_prepare',apply:'fcf_future_historical_six_apply',import:'fcf_future_current_target_import',check:'fcf_future_current_target_check'}
  if(!Object.hasOwn(fields,stage))fail('closed future mutation stage required');keys(p,fields[stage],'mutation parameters')
  if(['prepare','apply'].includes(stage)&&target.competitionId===783)fail('G1 cannot rerun all-six cleanup')
  if(['prepare','apply'].includes(stage)&&(!/^[a-f0-9]{40}$/.test(p.p_main_sha??'')||fingerprint(p.p_policy_hashes)!==fingerprint(fcfSixPolicyIdHashes())))fail('reviewed main SHA/immutable six policy hashes required')
  if(stage==='apply'){const before=text(p.p_before_image_text,p.p_before_sha,'cleanup before-image');if(before?.schemaVersion!==3)fail('future schema3 cleanup before-image required')}
  if(stage==='import'){const r=text(p.p_rollout_text,p.p_sha256,'future import rollout');if(r.schemaVersion!==(r.inventoryBinding?.protocol==='future-g1-after-failed-g1-v1'?4:3)||r.kind!=='fcf-future-current-target-import-rollout'||r.targetSlug!==target.targetSlug)fail('separate future import rollout required');if(r.inventoryBinding&&(r.inventoryBinding.targetSlug!==targetSlug||!isFcfFutureNativeProtocol(targetSlug,r.inventoryBinding.protocol)))fail('cross-target import source binding');if(target.competitionId===783){const packet=text(r.targetPacketText,r.targetPacketSha256,'G1 import packet');if(packet.targetSlug!==targetSlug||packet.target?.competitionId!==783||packet.target?.sourceCode!==target.sourceCode||!isFcfFutureNativeProtocol(targetSlug,packet.target?.sourceEvidence?.protocol)||packet.target?.sourceEvidence?.targetSlug!==targetSlug||fingerprint(packet.target.sourceEvidence)!==fingerprint(r.inventoryBinding))fail('exact closed G1 packet/source/native tuple required')}}
  if(stage==='check'){const a=text(p.p_activation_text,p.p_sha256,'future activation packet');if(a.schemaVersion!==(JSON.parse(a.importRolloutText??'null')?.inventoryBinding?.protocol==='future-g1-after-failed-g1-v1'?5:4)||a.kind!=='fcf-future-current-target-activation'||a.targetSlug!==target.targetSlug||typeof p.p_activate!=='boolean')fail('separate future activation packet/boolean required');if(target.competitionId===783){const r=text(a.importRolloutText,a.importRolloutSha256,'G1 original rollout');if(r.targetSlug!==targetSlug||!isFcfFutureNativeProtocol(targetSlug,r.inventoryBinding?.protocol)||r.inventoryBinding?.targetSlug!==targetSlug||a.launchProposal?.targetSlug!==targetSlug||a.launchProposal?.competitionId!==783||a.launchProposal?.sourceCode!==target.sourceCode)fail('exact G1 activation/import/source tuple required')}}
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
 return Object.freeze({inventory(s,k){const value=read(`public.fcf_six_current_target_inventory(${selected(s)},${privacy(k)})`);if(!value||!Array.isArray(value.players))fail('complete readonly player inventory required');const fields=['id','competition_id','team_id','reg_st','full_name','position','position_source','anonimiziran_at','anonimiziran_razlog'];return {...value,...(getFcfFutureTarget({targetSlug:s}).competitionId===783?{supplementalMarker:read('public.get_installed_fcf_g1_supplement()')}:{}),players:value.players.map(p=>Object.fromEntries(fields.filter(k=>Object.hasOwn(p,k)).map(k=>[k,p[k]]))) }},projection:(s,k)=>{const route=selected(s),keys=privacy(k);return read(g1Observer?`public.fcf_g1_readonly_projection(${keys})`:`public.fcf_future_current_target_projection(${route},${keys})`)},pricingSnapshot:s=>read(`public.fcf_six_current_target_pricing(${selected(s)})`),receipt:s=>read(`public.fcf_future_current_target_receipt(${selected(s)})`),mutate})
}
