// DANGER: DIAGNOSTIC BRANCH ONLY. NEVER MERGE. No production DB, SSH or provider.
import {createHash} from 'node:crypto'
import {spawnSync,execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',branch='codex/baden-install-sql-disposable-probe-20261030',output='baden-install-sql-disposable-probe',base='2d5dbc3fb4a38d8bcd342c9016f80abec57af947'
const approved={assetId:690215937,releaseId:427342437,derivedRunId:40969041702,bytes:1988159,sha256:'c69468853bf1d8ba011749fbc56142b4d25aecb5ea777f3991e7b77b3b10876b'}
const sha=b=>createHash('sha256').update(b).digest('hex'),need=(ok,code)=>{if(!ok)throw Object.assign(Error(code),{diagnosticCode:code})},flags={disposableOnly:true,productionWriteAuthorized:false,nativeAdmission:false,activationEligible:false,automaticRetry:false}
let hostedProbeAuthenticated=false // Private latch; mocked tests cannot authorize real Docker.
const root=a=>a?.login==='nejcar20'&&a.id===25134229&&a.type==='User',prefix=`repos/${repo}/`,read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const readbackSQL="BEGIN READ ONLY; SELECT jsonb_build_object('serverUTC',clock_timestamp(),'rows',(select count(*)from private_baden_history.catalog),'sha256',(select manifest_sha256 from private_baden_history.catalog where singleton),'canonicalSha256',(select private_baden_history.sha(manifest)from private_baden_history.catalog where singleton),'currentUser',current_user,'superuser',(select rolsuper from pg_roles where rolname=current_user),'tableOwner',(select pg_get_userbyid(relowner)from pg_class where oid='private_baden_history.catalog'::regclass),'rowSecurity',(select relrowsecurity from pg_class where oid='private_baden_history.catalog'::regclass),'defaultReadOnly',current_setting('default_transaction_read_only'),'serverVersion',current_setting('server_version')); ROLLBACK;\n"
export function probeSources(){
 const installer=read('scripts/install-baden-native-catalog.mjs');need(sha(installer)==='17ec18184138d80edd9b33c5b19c8e01c138cefda2adb0a975c93ddd3420186e','INSTALLER_EXACT2D5')
 const start=installer.indexOf('function installationSQL('),end=installer.indexOf('function ownerEnvironment('),fn=installer.slice(start,end),functionSha256=sha(fn)
 need(start>0&&end>start&&functionSha256==='e169876905189bc07394fc0442cf9d953a3d62557bfa4b2fdd0c04e886004a4e','EXACT_INSTALLATION_FUNCTION')
 const fragments=[['supabase/migrations/20261027030000_fussball_community_cards.sql',/create function private_fussball\.canonical_json\(v jsonb\).*?end\$\$;/gs,'501808b8727982ac15868ed7b895aea6a92a6369889d3b8a4d1967600a375908'],['supabase/migrations/20261028180000_baden_history_cards_composition.sql',/create table private_baden_history\.catalog\(.*?;/gs,'8ea6a07c3f2faaf2f18efc4785507f58daca233300a5a0efac1ffb40237b9ef2'],['supabase/migrations/20261028180000_baden_history_cards_composition.sql',/create function private_baden_history\.sha\(v jsonb\).*?\$\$;/gs,'1660faf84486e0b2ff618a8beb29be50b20fbdbc17eae1cd1b220561f68b74e8']].map(([path,pattern,digest])=>{const found=[...read(path).matchAll(pattern)];need(found.length===1&&sha(found[0][0])===digest,'EXACT_MINIMAL_DDL');return found[0][0]})
 need(/^major_version = 17$/m.test(read('supabase/config.toml')),'EXACT_PG_MAJOR17')
 const fixtureSQL="CREATE ROLE supabase_admin LOGIN SUPERUSER; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA private_fussball; CREATE SCHEMA private_baden_history;\n"+fragments.join('\n')+'\n'
 // Evaluate only the fully pinned pure original generator; never import installer CLI.
 const installationSQL=new Function('need','maximum','sha',fn+';return installationSQL;')(need,64*1024*1024,sha)
 return {installationSQL,fixtureSQL,functionSha256,installerSha256:sha(installer),ddlSha256:fragments.map(sha),fixtureSha256:sha(fixtureSQL)}
}
export function safeProcessResult(r){
 const err=Buffer.from(r.stderr??''),out=Buffer.from(r.stdout??''),text=err.toString('utf8'),sqlstate=/(?:ERROR|FATAL|PANIC):\s+([0-9A-Z]{5}):?\b/.exec(text)?.[1]??null
 // Never retain QUERY/STATEMENT/LINE or stdout (the exact SQL prints the manifest).
 const stderrExcerpt=text.split('\n').filter(x=>/^(?:ERROR|FATAL|PANIC|HINT|LOCATION|CONTEXT):/.test(x)).map(x=>x.replace(/[a-f0-9]{128,}/gi,'[HEX_REDACTED]').slice(0,384)).join('\n').slice(0,2048)
 return {exitStatus:Number.isInteger(r.status)?r.status:null,signal:r.signal??null,processCode:['ETIMEDOUT','ENOBUFS','ENOENT'].includes(r.error?.code)?r.error.code:null,sqlstate,stderrExcerpt,stderrBytes:err.length,stderrSha256:sha(err),stdoutBytes:out.length,stdoutSha256:sha(out)}
}
export function disposablePlan(mode){
 need(['rw','ro'].includes(mode),'FIXED_CASE_ONLY');const name='slff-baden-install-sql-probe-'+mode
 return {name,run:['run','--detach','--name',name,'--network','none','--label','slff.baden.disposable=exact2d5-install-sql','--env','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17'],psql:['exec','--interactive',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose']}
}
const dockerEnvironment=()=>({PATH:process.env.PATH,HOME:process.env.HOME,LANG:'C.UTF-8',DOCKER_HOST:'unix:///var/run/docker.sock'})
function docker(args,{input,timeout=150000}={}){need(hostedProbeAuthenticated,'AUTHENTICATED_HOSTED_PROBE_REQUIRED');return spawnSync('docker',args,{env:dockerEnvironment(),input,encoding:'utf8',timeout,maxBuffer:12*1024*1024,stdio:['pipe','pipe','pipe']})}
function inspectCreated(command,name,id){const r=command(['inspect',name]);need(r.status===0,'CREATED_CONTAINER_INSPECT');const [c]=JSON.parse(r.stdout);need(c.Id===id&&c.Name==='/'+name&&c.HostConfig.NetworkMode==='none'&&!c.HostConfig.Privileged&&(!c.HostConfig.PortBindings||Object.keys(c.HostConfig.PortBindings).length===0)&&(!c.HostConfig.Binds||c.HostConfig.Binds.length===0)&&c.Mounts.every(m=>m.Type==='volume')&&c.Config.Labels?.['slff.baden.disposable']==='exact2d5-install-sql','DISPOSABLE_CONTAINER_IDENTITY');return true}
export async function runDisposableCases({command=docker,sql,fixtureSQL,onCase=()=>{},inspectCreated:inspect=inspectCreated}={}){
 need(typeof sql==='string'&&sql.length>0&&typeof fixtureSQL==='string','SQL_GENERATION_REQUIRED');const results=[]
 for(const mode of ['rw','ro']){
  const plan=disposablePlan(mode);need(command(['inspect',plan.name]).status!==0,'EXISTING_CONTAINER_HOLD');let createdId
  try{
   const started=command(plan.run,{timeout:90000});need(started.status===0&&/^[a-f0-9]{64}$/.test(started.stdout.trim()),'DISPOSABLE_START');createdId=started.stdout.trim();need(inspect(command,plan.name,createdId),'DISPOSABLE_INSPECTION')
   let ready=false;for(let i=0;i<45;i++){if(command(['exec',plan.name,'pg_isready','-h','127.0.0.1','-U','postgres','-d','postgres'],{timeout:5000}).status===0){ready=true;break}await new Promise(resolve=>setTimeout(resolve,1000))}need(ready,'DISPOSABLE_READINESS')
   const psql=(user,input)=>command([...plan.psql.slice(0,4),'--username',user,'--dbname','postgres',...plan.psql.slice(4)],{input})
   // Fixture ONLY: postgres owns the real catalog DDL; supabase_admin is super.
   const setup=psql('postgres',fixtureSQL);need(setup.status===0,'MINIMAL_FIXTURE_FAILED')
   if(mode==='ro'){const setting=psql('postgres',"ALTER ROLE supabase_admin SET default_transaction_read_only=on;\n");need(setting.status===0,'DISPOSABLE_RO_SETTING')}
   const before=psql('supabase_admin',readbackSQL);need(before.status===0,'DISPOSABLE_BEFORE_READBACK');const pre=JSON.parse(before.stdout.trim());need(pre.rows===0&&pre.currentUser==='supabase_admin'&&pre.superuser===true&&pre.tableOwner==='postgres'&&pre.rowSecurity===false&&pre.defaultReadOnly===(mode==='ro'?'on':'off'),'DISPOSABLE_BEFORE_IDENTITY')
   const execution=psql('supabase_admin',sql),after=psql('supabase_admin',readbackSQL);need(after.status===0,'DISPOSABLE_AFTER_READBACK');const state=JSON.parse(after.stdout.trim()),result={mode,containerName:plan.name,containerId:createdId,before:pre,execution:safeProcessResult(execution),state,...flags};onCase(result);results.push(result)
   if(execution.status!==0)break // RO contrast is conditional on successful RW.
  }finally{if(createdId){const removed=command(['rm','--force','--volumes',createdId],{timeout:30000});need(removed.status===0,'DISPOSABLE_CLEANUP_FAILED')}}
 }
 return results
}
function gh(path,binary=false){need(path===prefix+'actions/runs/'+process.env.GITHUB_RUN_ID||[prefix+'releases/'+approved.releaseId,prefix+'releases/assets/'+approved.assetId].includes(path),'FIXED_OWN_GET');return execFileSync('gh',['api','--method','GET',path,...(binary?['-H','Accept: application/octet-stream']:[])],{env:{PATH:process.env.PATH,HOME:process.env.HOME,GH_TOKEN:process.env.GH_TOKEN,GH_HOST:'github.com',GH_PROMPT_DISABLED:'1'},timeout:60000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']})}
function authenticate(){
 const e=process.env;need(process.platform==='linux'&&e.RUNNER_ENVIRONMENT==='github-hosted'&&e.RUNNER_OS==='Linux'&&e.GITHUB_ACTIONS==='true'&&e.GITHUB_REPOSITORY===repo&&e.GITHUB_JOB==='disposable'&&e.GITHUB_EVENT_NAME==='workflow_dispatch'&&e.GITHUB_REF==='refs/heads/'+branch&&e.GITHUB_RUN_ATTEMPT==='1'&&e.GITHUB_ACTOR==='nejcar20'&&e.GITHUB_ACTOR_ID==='25134229'&&e.GITHUB_TRIGGERING_ACTOR==='nejcar20'&&/^[a-f0-9]{40}$/.test(e.GITHUB_SHA??'')&&e.EXPECTED_PROBE_SHA===e.GITHUB_SHA&&/^[1-9]\d+$/.test(e.GITHUB_RUN_ID??'')&&typeof e.GH_TOKEN==='string'&&e.GH_TOKEN.length>0,'EXACT_ROOT_GHA_ONLY')
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===e.GITHUB_SHA,'EXACT_CHECKOUT');need(!Object.keys(e).some(k=>/^(?:SUPABASE|PGHOST|PGPORT|PGDATABASE|PGUSER|PGPASSWORD|DATABASE_URL|DEPLOY_SSH|KLJUC|DOCKER_CONTEXT)/.test(k)),'PRODUCTION_ENV_FORBIDDEN')
 const r=JSON.parse(gh(prefix+'actions/runs/'+e.GITHUB_RUN_ID));need(r.id===Number(e.GITHUB_RUN_ID)&&r.run_attempt===1&&r.head_sha===e.GITHUB_SHA&&r.head_branch===branch&&r.event==='workflow_dispatch'&&r.path==='.github/workflows/ci.yml'&&r.status==='in_progress'&&r.repository?.full_name===repo&&r.head_repository?.full_name===repo&&root(r.actor)&&root(r.triggering_actor),'ACTUAL_ROOT_RUN')
 const release=JSON.parse(gh(prefix+'releases/'+approved.releaseId)),a=JSON.parse(gh(prefix+'releases/assets/'+approved.assetId)),name=`baden-native-catalog-${approved.derivedRunId}-${approved.sha256}.json`
 need(release.id===approved.releaseId&&release.draft===true&&release.tag_name==='baden-native-staging-v1'&&release.assets.filter(x=>x.id===approved.assetId&&x.name===name).length===1&&a.id===approved.assetId&&a.name===name&&a.state==='uploaded'&&a.size===approved.bytes&&a.digest==='sha256:'+approved.sha256&&root(a.uploader),'FIXED_REVIEWED_ASSET')
 const bytes=gh(prefix+'releases/assets/'+approved.assetId,true);need(bytes.length===approved.bytes&&sha(bytes)===approved.sha256,'APPROVED_RAW_ASSET_SHA');hostedProbeAuthenticated=true;return bytes
}
export async function runBadenDisposableProbe(){
 const bytes=authenticate(),sources=probeSources(),sql=sources.installationSQL(bytes.toString('utf8'),approved.sha256);mkdirSync(output,{mode:0o700})
 const write=(name,v)=>writeFileSync(output+'/'+name,JSON.stringify(v)+'\n',{flag:'wx',mode:0o600})
 write('inputs.json',{base,probeHead:process.env.GITHUB_SHA,probeRunId:process.env.GITHUB_RUN_ID,approved,installationFunctionSha256:sources.functionSha256,installerSha256:sources.installerSha256,ddlSha256:sources.ddlSha256,fixtureSha256:sources.fixtureSha256,exactSqlSha256:sha(sql),exactSqlBytes:Buffer.byteLength(sql),currentFreshUntil:JSON.parse(bytes).currentFreshUntil,postgresImage:'postgres:17',hostPorts:[],network:'none',...flags})
 const cases=await runDisposableCases({sql,fixtureSQL:sources.fixtureSQL,onCase:r=>write(r.mode+'.json',r)})
 const rw=cases[0];if(rw.execution.exitStatus===0)need(rw.state.rows===1&&rw.state.sha256===approved.sha256&&rw.state.canonicalSha256===approved.sha256,'RW_EXACT_READBACK')
 else need(rw.state.rows===0,'FAILED_RW_PARTIAL_STATE')
 if(cases[1])need(cases[1].execution.exitStatus!==0&&cases[1].state.rows===0&&cases[1].execution.sqlstate==='25006','RO_CONTRAST_NOT_REPRODUCED')
 const result={status:'DISPOSABLE_FACTS_RETAINED',rwExit:rw.execution.exitStatus,rwSqlstate:rw.execution.sqlstate,roContrastRun:cases.length===2,...flags};write('result.json',result);return result
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){try{need(process.argv.length===3&&process.argv[2]==='probe','FIXED_PROBE_COMMAND');console.log(JSON.stringify(await runBadenDisposableProbe()))}catch(e){const safe={status:'HOLD',code:e.diagnosticCode??'UNCLASSIFIED_DIAGNOSTIC_FAILURE',...flags};try{mkdirSync(output,{recursive:true,mode:0o700});writeFileSync(output+'/diagnostic.json',JSON.stringify(safe)+'\n',{flag:'wx',mode:0o600})}catch{}console.error(JSON.stringify(safe));process.exitCode=1}}
