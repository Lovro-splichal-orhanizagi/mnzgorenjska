// One-off diagnostic: fixed prepare PERFORM, discarded image, unconditional ROLLBACK.
import {mkdirSync,writeFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'

const env=process.env,repository='Lovro-splichal-orhanizagi/mnzgorenjska'
const deployed='d25c9b0bac906e2b9f7ad13e749a724e7b6fac77'
const branch='refs/heads/codex/g9-prepare-sql-diagnostic-20261028'
const sha=value=>/^[a-f0-9]{40}$/.test(value??''),mode=process.argv[2]
const result={schemaVersion:1,kind:'fcf-prepare-rollback-diagnostic',nativeAuthority:false,
  capturedUTC:new Date().toISOString(),diagnosticSha:sha(env.GITHUB_SHA)?env.GITHUB_SHA:null,
  runId:/^[1-9]\d*$/.test(env.GITHUB_RUN_ID??'')?env.GITHUB_RUN_ID:null,
  runAttempt:env.GITHUB_RUN_ATTEMPT==='1'?'1':null,mainSha:null,
  identityVerified:false,rollbackConfirmed:false,status:'held'}
const fail=code=>{const error=new Error();error.code=code;throw error}
// Only exact static exception messages from the reviewed prepare call graph.
const conditions={
  'FCF_TARGET: READ COMMITTED required':'target_isolation',
  'FCF_TARGET: exact G1/G9 target required':'target_identity',
  'FCF_TARGET: unreviewed individual-row FK dependency':'target_fk_dependency',
  'FCF_TARGET: unreviewed individual reference column':'target_reference_column',
  'FCF_HISTORY: READ COMMITTED required':'history_isolation',
  'FCF_HISTORY: exact reviewed main commit required':'main_commit',
  'FCF_HISTORY: exact three immutable policy hashes required':'policy_hashes',
  'FCF_HISTORY: future cleanup exact immutable six policy hashes':'future_policy_hashes',
  'FCF_HISTORY: future cleanup original six report hashes':'original_report_hashes',
  'FCF_HISTORY: unreviewed Scout reference type':'scout_reference_type',
  'FCF_HISTORY: Scout target dependency prevents historical cleanup/restore':'scout_dependency',
  'FCF_HISTORY: cleanup is one-use; installed policy already exists':'installed_policy',
  'FCF_HISTORY: inactive exact FCF competition identity required':'competition_identity',
  'FCF_HISTORY: exact current round identity required':'round_identity',
  'FCF_HISTORY: exact original match/result/source identity required':'match_identity',
  'FCF_HISTORY: reviewed policy fixture identity differs':'policy_fixture',
  'FCF_HISTORY: exact native club/category identity required':'club_identity',
  'FCF_HISTORY: exact approved 157 appearances and 18 goals required':'individual_counts',
  'FCF_HISTORY: new fantasy team activity':'fantasy_teams',
  'FCF_HISTORY: new roster activity':'fantasy_roster',
  'FCF_HISTORY: new lineup activity':'fantasy_lineups',
  'FCF_HISTORY: new round fantasy activity':'fantasy_rounds',
  'FCF_HISTORY: new position vote activity':'position_votes',
  'FCF_HISTORY: new assist vote activity':'assist_votes',
  'FCF_HISTORY: new confirmed assist activity':'confirmed_assists',
  'FCF_HISTORY: unexpected individual-row foreign key dependency':'history_fk_dependency',
  'FCF_HISTORY: unexpected individual-row reference column':'history_reference_column',
  'FCF_HISTORY: privacy suppression dependency':'privacy_dependency',
  'FCF_HISTORY: exact unknown report absence required':'unknown_report_absence',
  'FCF_HISTORY: exact empty native321663 placeholder required':'empty_placeholder',
  'FCF_HISTORY: single exact native fixture required':'single_fixture',
  'FCF_HISTORY: unique native round3 required':'unique_round',
  'FCF_HISTORY: home club exact retained report/header-side native provenance':'home_provenance',
  'FCF_HISTORY: away club exact retained report/header-side native provenance':'away_provenance',
  'FCF_HISTORY: source/native club conflict':'club_conflict'
}
const engineCodes={'42703':'undefined_column','42883':'undefined_function','42P01':'undefined_table',
  '42501':'insufficient_privilege','55P03':'lock_not_available','57014':'query_canceled',
  '40P01':'deadlock_detected','P0001':'unclassified_raise_exception'}
const localCodes=new Set(['identity_refused','main_identity_refused','github_http_refused','github_body_bound',
  'invalid_database_endpoint','psql_failed','invalid_diagnostic_marker','rollback_unconfirmed'])
function safeError(error){return {name:['Error','TypeError','AbortError','TimeoutError'].includes(error?.name)?error.name:'Error',
  code:localCodes.has(error?.code)?error.code:'diagnostic_failed'}}
function clientDiagnostic(child){
  const spawnCode=['ENOENT','EACCES','EPERM','ETIMEDOUT','ENOBUFS','ENOMEM'].includes(child.error?.code)?child.error.code:null
  const signal=['SIGTERM','SIGKILL','SIGINT','SIGABRT','SIGSEGV','SIGHUP','SIGPIPE'].includes(child.signal)?child.signal:null
  const sqlstates=[...new Set((child.stderr??'').split(/\r?\n/).flatMap(line=>{
    const match=/\b(?:ERROR|FATAL|PANIC):\s+([0-9A-Z]{5})\s*$/.exec(line)
    return match&&/^(?:00|01|02|03|08|09|0A|0B|0F|0L|0P|0Z|20|21|22|23|24|25|26|27|28|2B|2D|2F|34|38|39|3B|3D|3F|40|42|44|53|54|55|57|58|72|F0|HV|P0|XX)[0-9A-Z]{3}$/.test(match[1])?[match[1]]:[]
  }))].slice(0,8)
  const categories={'28P01':'password_authentication','28000':'invalid_authorization','3D000':'missing_database',
    '42501':'insufficient_privilege','42601':'syntax_error','42704':'undefined_object','42703':'undefined_column',
    '42883':'undefined_function','42P01':'undefined_table','55P03':'lock_not_available','57014':'query_canceled'}
  const stderr=child.stderr??''
  // Inspect private stderr only to choose fixed labels; never return its text.
  const category=spawnCode==='ENOENT'?'missing_psql':['EACCES','EPERM'].includes(spawnCode)?'psql_not_executable':
    spawnCode==='ETIMEDOUT'?'client_timeout':spawnCode==='ENOBUFS'?'output_bound':
    /password authentication failed|no password supplied|fe_sendauth/i.test(stderr)?'password_authentication':
    /connection refused/i.test(stderr)?'connection_refused':
    /connection timed out|timeout expired/i.test(stderr)?'connection_timeout':
    /could not translate host name|name or service not known|temporary failure in name resolution/i.test(stderr)?'name_resolution':
    /database [^\r\n]* does not exist/i.test(stderr)?'missing_database':
    /role [^\r\n]* does not exist/i.test(stderr)?'missing_role':
    sqlstates.map(state=>categories[state]).find(Boolean)??(child.status===0?'completed':signal?'terminated':'unclassified_client_failure')
  return {exitStatus:Number.isInteger(child.status)&&child.status>=0&&child.status<=255?child.status:null,
    signal,spawnCode,sqlstates,category}
}
const literal=value=>"'"+value.replaceAll("'","''")+"'"
const caseExpression=(expression,pairs,fallback)=>`CASE ${expression} ${Object.entries(pairs).map(([key,value])=>`WHEN ${literal(key)} THEN ${literal(value)}`).join(' ')} ELSE ${fallback} END`
const policies='{"es-ct-segona-g1-six-reviewed-2026-10-19-v1":"fbe3dbba425837b28a5fd7f99fa170a249e169a2f84d6c17921f202f7b25c6d9","es-ct-tercera-g2-six-reviewed-2026-10-19-v1":"69cf7d1406b1306ab1aa31413cdd37bf11b502e5f17f9cb7eab295502578fc52","es-ct-tercera-g9-six-reviewed-2026-10-19-v1":"38eca907c6b0f4df03a989778099f00b356d03626895de3961bad5e266bd3912"}'
const sql=`BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL ROLE service_role;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='15s';
SET LOCAL client_min_messages=warning;
DO $fcf_diagnostic$
DECLARE diag_state text; diag_message text; diag_code text; diag_safe_message text; diag_status text:='sql_error';
BEGIN
  BEGIN
    PERFORM public.fcf_future_historical_six_prepare('${deployed}','${policies}'::jsonb);
    diag_status:='prepare_returned';
  EXCEPTION
    WHEN query_canceled THEN GET STACKED DIAGNOSTICS diag_state=RETURNED_SQLSTATE,diag_message=MESSAGE_TEXT;
    WHEN OTHERS THEN GET STACKED DIAGNOSTICS diag_state=RETURNED_SQLSTATE,diag_message=MESSAGE_TEXT;
  END;
  IF diag_status='sql_error' THEN
    diag_code:=${caseExpression('diag_message',conditions,caseExpression('diag_state',engineCodes,"'unclassified_sql_error'"))};
    diag_safe_message:=${caseExpression('diag_message',Object.fromEntries(Object.keys(conditions).map(message=>[message,message])),'NULL')};
  END IF;
  PERFORM set_config('slff.fcf_prepare_diag',json_build_object('status',diag_status,'sqlstate',diag_state,'code',diag_code,'message',diag_safe_message)::text,true);
END;
$fcf_diagnostic$;
SELECT current_setting('slff.fcf_prepare_diag');
ROLLBACK;
\\echo FCF_PREPARE_ROLLBACK_DONE
`
try{
  if(process.argv.length!==3||!['--identity','--probe'].includes(mode)||env.GITHUB_ACTIONS!=='true'||
    env.GITHUB_REPOSITORY!==repository||env.GITHUB_REF!==branch||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||
    env.GITHUB_RUN_ATTEMPT!=='1'||env.EXPECTED_MAIN_SHA!==deployed||!sha(env.EXPECTED_DIAGNOSTIC_SHA)||
    env.GITHUB_SHA!==env.EXPECTED_DIAGNOSTIC_SHA||env.GITHUB_SHA===deployed||!env.GH_TOKEN)fail('identity_refused')
  const response=await fetch(`https://api.github.com/repos/${repository}/git/ref/heads/main`,{method:'GET',redirect:'manual',
    signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${env.GH_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}})
  if(!response.ok){await response.body?.cancel();fail('github_http_refused')}
  const reader=response.body.getReader(),chunks=[];let length=0
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength
    if(length>64*1024)fail('github_body_bound');chunks.push(Buffer.from(value))}}
  finally{await reader.cancel().catch(()=>{})}
  const main=JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if(main?.ref!=='refs/heads/main'||main?.object?.type!=='commit'||main.object.sha!==deployed)fail('main_identity_refused')
  result.mainSha=main.object.sha;result.identityVerified=true;result.status='identity_verified'
  if(mode==='--probe'){
    let endpoint;try{endpoint=new URL(env.SUPABASE_DB_URL)}catch{fail('invalid_database_endpoint')}
    if(!['postgres:','postgresql:'].includes(endpoint.protocol)||endpoint.hostname!=='127.0.0.1'||endpoint.port!=='5432'||
      endpoint.hash||[...endpoint.searchParams].some(([key,value])=>key!=='sslmode'||!['disable','prefer','require'].includes(value)))fail('invalid_database_endpoint')
    // A fresh allowlist environment excludes every inherited PGSERVICE* setting.
    const pgEnv={PATH:env.PATH,LANG:'C',LC_ALL:'C',PGDATABASE:env.SUPABASE_DB_URL,
      PGHOSTADDR:'127.0.0.1',PGCONNECT_TIMEOUT:'15',PGPASSFILE:'/dev/null'}
    const child=spawnSync('psql',['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-v','SHOW_CONTEXT=never'],
      {env:pgEnv,input:sql,encoding:'utf8',timeout:35000,maxBuffer:64*1024,stdio:['pipe','pipe','pipe']})
    // No raw stdout/stderr, connection string, SQL input, DETAIL or CONTEXT escapes.
    result.client=clientDiagnostic(child)
    if(child.error||child.status!==0)fail('psql_failed')
    const lines=child.stdout.trim().split(/\r?\n/)
    if(lines.length!==2||lines[1]!=='FCF_PREPARE_ROLLBACK_DONE')fail('rollback_unconfirmed')
    result.rollbackConfirmed=true
    if(!/^\{[^\r\n]{1,2048}\}$/.test(lines[0]))fail('invalid_diagnostic_marker')
    const record=JSON.parse(lines[0])
    if(Object.keys(record).sort().join(',')!=='code,message,sqlstate,status'||
      !['prepare_returned','sql_error'].includes(record.status))fail('invalid_diagnostic_marker')
    if(record.status==='prepare_returned'){
      if(record.sqlstate!==null||record.code!==null||record.message!==null)fail('invalid_diagnostic_marker')
    }else if(!/^[A-Z0-9]{5}$/.test(record.sqlstate??'')||
      ![...Object.values(conditions),...Object.values(engineCodes),'unclassified_sql_error'].includes(record.code)||
      record.message!==null&&!Object.hasOwn(conditions,record.message))fail('invalid_diagnostic_marker')
    result.status=record.status;result.diagnostic=record
  }
}catch(error){result.status='held';result.error=safeError(error);process.exitCode=1}
finally{
  mkdirSync('fcf-prepare-rollback',{mode:0o700,recursive:true})
  writeFileSync('fcf-prepare-rollback/result.json',JSON.stringify(result,null,2)+'\n',{mode:0o600})
  process.stdout.write(`FCF prepare rollback diagnostic: ${result.status}; sanitized result retained.\n`)
}
