// One-off Scout inventory: fixed read-only count predicates, unconditional ROLLBACK.
import {mkdirSync,writeFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'

const env=process.env,repository='Lovro-splichal-orhanizagi/mnzgorenjska'
const deployed='de77b661cbc11d95256a500e57c2fdea861a0647'
const branch='refs/heads/codex/g9-prepare-sql-diagnostic-20261028'
const sha=value=>/^[a-f0-9]{40}$/.test(value??''),mode=process.argv[2]
const result={schemaVersion:1,kind:'fcf-scout-readonly-inventory',nativeAuthority:false,
  capturedUTC:new Date().toISOString(),diagnosticSha:sha(env.GITHUB_SHA)?env.GITHUB_SHA:null,
  runId:/^[1-9]\d*$/.test(env.GITHUB_RUN_ID??'')?env.GITHUB_RUN_ID:null,
  runAttempt:env.GITHUB_RUN_ATTEMPT==='1'?'1':null,mainSha:null,
  identityVerified:false,rollbackConfirmed:false,status:'held'}
const fail=code=>{const error=new Error();error.code=code;throw error}
const engineCodes={'42703':'undefined_column','42883':'undefined_function','42P01':'undefined_table',
  '42501':'insufficient_privilege','55P03':'lock_not_available','57014':'query_canceled',
  '40P01':'deadlock_detected','54000':'inventory_bound','P0001':'unclassified_raise_exception'}
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
const sql=`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='15s';
SET LOCAL client_min_messages=warning;
SET LOCAL row_security=off;
SET LOCAL TIME ZONE 'UTC';
DO $fcf_diagnostic$
DECLARE t record; a record; predicate text; matching bigint;
  refs jsonb:='[]'; unsupported jsonb:='[]'; aggregate_metadata jsonb;
  diag_state text; diag_code text; diag_status text:='scout_inventory';
BEGIN
  BEGIN
    FOR t IN SELECT c.oid,n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='scout' AND c.relkind IN('r','p') ORDER BY c.oid LOOP
      FOR a IN SELECT attname,atttypid FROM pg_attribute WHERE attrelid=t.oid AND attnum>0 AND NOT attisdropped
        AND attname IN('player_id','competition_id','team_id','podobni') ORDER BY attnum LOOP
        IF a.atttypid<>(CASE WHEN a.attname='podobni' THEN 'bigint[]'::regtype ELSE 'bigint'::regtype END) THEN
          unsupported:=unsupported||jsonb_build_array(jsonb_build_object('schema',t.nspname,'table',t.relname,
            'column',a.attname,'type',format_type(a.atttypid,NULL)));
        ELSE
          predicate:=CASE a.attname
            WHEN 'competition_id' THEN 'x.competition_id in(783,790,797)'
            WHEN 'player_id' THEN 'x.player_id in(select id from public.players where competition_id in(783,790,797))'
            WHEN 'team_id' THEN 'x.team_id in(select team_id from public.players where competition_id in(783,790,797))'
            WHEN 'podobni' THEN 'x.podobni && array(select id from public.players where competition_id in(783,790,797))' END;
          EXECUTE format('select count(*) from %I.%I x where %s',t.nspname,t.relname,predicate) INTO matching;
          IF matching>0 THEN
            refs:=refs||jsonb_build_array(jsonb_build_object('schema',t.nspname,'table',t.relname,
              'column',a.attname,'type',format_type(a.atttypid,NULL),'matchingRows',matching));
          END IF;
        END IF;
        IF jsonb_array_length(refs)+jsonb_array_length(unsupported)>128 THEN
          RAISE EXCEPTION USING ERRCODE='54000';
        END IF;
      END LOOP;
    END LOOP;
    IF jsonb_array_length(unsupported)=0 THEN
      WITH scoped AS (
        SELECT l.* FROM scout.lige_moc l WHERE l.competition_id IN(783,790,797)
      ), parents AS (
        SELECT DISTINCT m.* FROM scout.modeli m JOIN scoped l ON l.model_id=m.id
      )
      SELECT jsonb_build_object(
        'countsByCompetition',jsonb_build_object('783',count(*) FILTER(WHERE l.competition_id=783),
          '790',count(*) FILTER(WHERE l.competition_id=790),'797',count(*) FILTER(WHERE l.competition_id=797)),
        'totalRows',count(*),
        'orphanParentRows',count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM scout.modeli m WHERE m.id=l.model_id)),
        'allVirBrez',coalesce(bool_and(l.vir IS NOT DISTINCT FROM 'brez'),false),
        'allPrestopovZero',coalesce(bool_and(l.prestopov IS NOT DISTINCT FROM 0),false),
        'allMocZeroFinite',coalesce(bool_and(l.moc IS NOT NULL AND l.moc=0 AND
          l.moc NOT IN('NaN'::double precision,'Infinity'::double precision,'-Infinity'::double precision)),false),
        'publishedParentRows',(SELECT count(*) FROM parents m WHERE m.objavljen IS TRUE),
        'rowsSha256',encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.model_id,l.competition_id),'[]'::jsonb)::text,'UTF8')),'hex'),
        'modelParentsSha256',(SELECT encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.id),'[]'::jsonb)::text,'UTF8')),'hex') FROM parents m)
      ) INTO aggregate_metadata FROM scoped l;
    END IF;
  EXCEPTION
    WHEN query_canceled THEN GET STACKED DIAGNOSTICS diag_state=RETURNED_SQLSTATE;
    WHEN OTHERS THEN GET STACKED DIAGNOSTICS diag_state=RETURNED_SQLSTATE;
  END;
  IF diag_state IS NOT NULL THEN
    diag_status:='sql_error'; refs:='[]'; unsupported:='[]'; aggregate_metadata:=NULL;
    diag_code:=${caseExpression('diag_state',engineCodes,"'unclassified_sql_error'")};
  ELSIF jsonb_array_length(unsupported)>0 THEN
    diag_status:='unsupported_types';
  END IF;
  PERFORM set_config('slff.fcf_scout_diag',json_build_object('status',diag_status,'sqlstate',diag_state,
    'code',diag_code,'references',refs,'unsupportedTypes',unsupported,'aggregateMetadata',aggregate_metadata)::text,true);
END;
$fcf_diagnostic$;
SELECT current_setting('slff.fcf_scout_diag');
ROLLBACK;
\\echo FCF_SCOUT_ROLLBACK_DONE
`
try{
  if(process.argv.length!==3||!['--identity','--scout-inventory'].includes(mode)||env.GITHUB_ACTIONS!=='true'||
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
  if(mode==='--scout-inventory'){
    if(typeof env.SUPABASE_DB_URL!=='string'||/[\u0000-\u0020\u007f]/.test(env.SUPABASE_DB_URL))fail('invalid_database_endpoint')
    let endpoint;try{endpoint=new URL(env.SUPABASE_DB_URL)}catch{fail('invalid_database_endpoint')}
    const databasePath=/^postgres(?:ql)?:\/\/[^/?#]+(\/[^/?#]+)(?:\?[^#]*)?$/i.exec(env.SUPABASE_DB_URL)?.[1]
    if(!['postgres:','postgresql:'].includes(endpoint.protocol)||endpoint.hostname!=='127.0.0.1'||endpoint.port!=='5432'||
      endpoint.hash||!databasePath||endpoint.searchParams.getAll('sslmode').length>1||
      [...endpoint.searchParams].some(([key,value])=>key!=='sslmode'||!['disable','prefer','require'].includes(value)))fail('invalid_database_endpoint')
    let databaseUser,databasePassword,databaseName
    try{
      databaseUser=decodeURIComponent(endpoint.username)
      databasePassword=decodeURIComponent(endpoint.password)
      databaseName=decodeURIComponent(databasePath.slice(1))
    }catch{fail('invalid_database_endpoint')}
    if(!databaseUser||!databaseName||[databaseUser,databasePassword,databaseName].some(value=>/[\u0000-\u001f\u007f]/.test(value)))fail('invalid_database_endpoint')
    // A fresh allowlist environment excludes every inherited PGSERVICE* setting.
    // PGDATABASE is a literal database name; it does not expand a connection URI.
    const pgEnv={PATH:env.PATH,LANG:'C',LC_ALL:'C',PGUSER:databaseUser,PGPASSWORD:databasePassword,
      PGDATABASE:databaseName,PGHOST:'127.0.0.1',PGHOSTADDR:'127.0.0.1',PGPORT:'5432',
      PGSSLMODE:endpoint.searchParams.get('sslmode')??'prefer',PGCONNECT_TIMEOUT:'15',PGPASSFILE:'/dev/null'}
    const child=spawnSync('psql',['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-v','SHOW_CONTEXT=never'],
      {env:pgEnv,input:sql,encoding:'utf8',timeout:35000,maxBuffer:64*1024,stdio:['pipe','pipe','pipe']})
    // No raw stdout/stderr, connection string, SQL input, DETAIL or CONTEXT escapes.
    result.client=clientDiagnostic(child)
    if(child.error||child.status!==0)fail('psql_failed')
    const lines=child.stdout.trim().split(/\r?\n/)
    if(lines.length!==2||lines[1]!=='FCF_SCOUT_ROLLBACK_DONE')fail('rollback_unconfirmed')
    result.rollbackConfirmed=true
    if(!/^\{[^\r\n]{1,49152}\}$/.test(lines[0]))fail('invalid_diagnostic_marker')
    const record=JSON.parse(lines[0])
    if(!record||Object.keys(record).sort().join(',')!=='aggregateMetadata,code,references,sqlstate,status,unsupportedTypes'||
      !['scout_inventory','unsupported_types','sql_error'].includes(record.status)||
      !Array.isArray(record.references)||!Array.isArray(record.unsupportedTypes)||
      record.references.length+record.unsupportedTypes.length>128)fail('invalid_diagnostic_marker')
    for(const [rows,positive]of [[record.references,true],[record.unsupportedTypes,false]])for(const row of rows){
      if(!row||Object.keys(row).sort().join(',')!==(positive?'column,matchingRows,schema,table,type':'column,schema,table,type')||
        row.schema!=='scout'||typeof row.table!=='string'||!/^[a-z_][a-z0-9_$]{0,62}$/.test(row.table)||
        !['player_id','competition_id','team_id','podobni'].includes(row.column)||typeof row.type!=='string'||
        row.type.length<1||row.type.length>128||/[\u0000-\u001f\u007f]/.test(row.type)||
        positive&&(row.type!==(row.column==='podobni'?'bigint[]':'bigint')||!Number.isSafeInteger(row.matchingRows)||row.matchingRows<1)||
        !positive&&row.type===(row.column==='podobni'?'bigint[]':'bigint'))fail('invalid_diagnostic_marker')
    }
    const keys=[...record.references,...record.unsupportedTypes].map(row=>`${row.table}/${row.column}`)
    if(new Set(keys).size!==keys.length)fail('invalid_diagnostic_marker')
    if(record.status==='sql_error'){
      if(!/^[A-Z0-9]{5}$/.test(record.sqlstate??'')||
        ![...Object.values(engineCodes),'unclassified_sql_error'].includes(record.code)||keys.length||record.aggregateMetadata!==null)fail('invalid_diagnostic_marker')
    }else if(record.sqlstate!==null||record.code!==null||
      (record.status==='unsupported_types')!==(record.unsupportedTypes.length>0))fail('invalid_diagnostic_marker')
    const metadata=record.aggregateMetadata
    if(record.status==='unsupported_types'&&metadata!==null)fail('invalid_diagnostic_marker')
    if(record.status==='scout_inventory'){
      if(!metadata||Object.keys(metadata).sort().join(',')!=='allMocZeroFinite,allPrestopovZero,allVirBrez,countsByCompetition,modelParentsSha256,orphanParentRows,publishedParentRows,rowsSha256,totalRows'||
        !metadata.countsByCompetition||Object.keys(metadata.countsByCompetition).sort().join(',')!=='783,790,797'||
        [...Object.values(metadata.countsByCompetition),metadata.totalRows,metadata.orphanParentRows,metadata.publishedParentRows]
          .some(value=>!Number.isSafeInteger(value)||value<0)||
        Object.values(metadata.countsByCompetition).reduce((sum,value)=>sum+value,0)!==metadata.totalRows||
        metadata.orphanParentRows>metadata.totalRows||metadata.publishedParentRows>metadata.totalRows||
        [metadata.allVirBrez,metadata.allPrestopovZero,metadata.allMocZeroFinite].some(value=>typeof value!=='boolean')||
        [metadata.rowsSha256,metadata.modelParentsSha256].some(value=>typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value)))fail('invalid_diagnostic_marker')
      const strengthReference=record.references.find(row=>row.table==='lige_moc'&&row.column==='competition_id')
      if((strengthReference?.matchingRows??0)!==metadata.totalRows)fail('invalid_diagnostic_marker')
    }
    result.status=record.status;result.diagnostic=record
    if(record.status!=='scout_inventory')process.exitCode=1
  }
}catch(error){result.status='held';result.error=safeError(error);process.exitCode=1}
finally{
  mkdirSync('fcf-scout-readonly',{mode:0o700,recursive:true})
  writeFileSync('fcf-scout-readonly/result.json',JSON.stringify(result,null,2)+'\n',{mode:0o600})
  process.stdout.write(`FCF Scout read-only inventory: ${result.status}; sanitized result retained.\n`)
}
