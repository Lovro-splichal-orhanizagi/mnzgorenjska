// Creates/replaces ONLY the exact owned local, no-network/no-port card test DB.
// No .env, source requests, host databases or running developer stacks are used.
import assert from 'node:assert/strict'
import {execFileSync,spawn} from 'node:child_process'
import {appendFileSync,readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
const container='slff-community-cards-20261027',owner='community-cards-20261027'
const image='public.ecr.aws/supabase/postgres:17.11.0.006'
const log='/tmp/slff-community-cards-fresh-bootstrap.log'
const root=new URL('../../',import.meta.url)
const docker=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:32*1024*1024,...options})
export async function bootstrapCommunityCardDatabase(env=process.env){
 assert.equal(env.FUSSBALL_COMMUNITY_DISPOSABLE_TEST,'1','explicit disposable bootstrap opt-in required')
 assert.equal(env.SUPABASE_DB_CONTAINER,container,'exact owned community-card container required')
 const known=JSON.parse(docker(['ps','-a','--filter',`name=^/${container}$`,'--format','{{json .}}'])||'null')
 if(known){
  const [state]=JSON.parse(docker(['inspect',container]))
  assert.equal(state.Config.Labels?.['slff.test.owner'],owner)
  assert.equal(state.HostConfig.NetworkMode,'none')
  assert.deepEqual(state.HostConfig.PortBindings,{})
  assert.equal(state.Mounts.length,0,'owned fixture must not mount any user data')
  if(state.State.Running)docker(['stop',container])
  docker(['container','rm',container])
 }
 writeFileSync(log,'Owned community-card fresh migration verification\n')
 docker(['run','-d','--name',container,'--label',`slff.test.owner=${owner}`,'--network','none','-e','POSTGRES_PASSWORD=slff-community-disposable-only',image,'postgres','-c','shared_preload_libraries=pg_stat_statements,pg_cron,pg_net','-c','cron.database_name=postgres','-c','cron.launch_active_jobs=off'])
 let ready=false
 for(let attempt=0;attempt<120;attempt++){
  try{docker(['exec',container,'pg_isready','-h','127.0.0.1','-p','5432','-U','supabase_admin','-d','postgres'],{stdio:'pipe'});ready=true;break}catch{}
  await new Promise(resolve=>setTimeout(resolve,250))
 }
 assert.ok(ready,'owned PostgreSQL did not become ready')
 const sql=query=>docker(['exec','-i',container,'psql','-U','supabase_admin','-d','postgres','-X','-v','ON_ERROR_STOP=1'],{input:query,timeout:300000})
 // Bare Supabase image auth.users predates these two GoTrue columns. Real
 // migration views need them; no authentication/RLS behavior is stubbed.
 sql('alter table auth.users add column if not exists email_confirmed_at timestamptz;alter table auth.users add column if not exists deleted_at timestamptz;')
 const dir=new URL('supabase/migrations/',root)
 const baseline=readdirSync(dir).filter(n=>/^\d{14}.*\.sql$/.test(n)&&n.slice(0,14)<='20261026213100').sort()
 assert.equal(baseline.length,389,'review changed baseline before recreating this fixture')
 for(const name of [...baseline,'20261027030000_fussball_community_cards.sql']){
  appendFileSync(log,`\nMIGRATION ${name}\n`)
  try{appendFileSync(log,sql('begin;\n'+readFileSync(new URL(name,dir),'utf8')+'\n;\ncommit;'))}catch(error){appendFileSync(log,error.stderr||String(error));throw Error(`Owned bootstrap failed at ${name}; see ${log}`,{cause:error})}
 }
 const [state]=JSON.parse(docker(['inspect',container]))
 assert.equal(state.HostConfig.NetworkMode,'none');assert.deepEqual(state.HostConfig.PortBindings,{})
 const result={container,image,baselineMigrations:baseline.length,featureMigration:'20261027030000_fussball_community_cards.sql',network:'none',hostPorts:false,log}
 writeFileSync('/tmp/slff-community-cards-fresh-ready.json',JSON.stringify(result)+'\n')
 return result
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(await bootstrapCommunityCardDatabase()))

// pg_cron can be installed only in its configured database. Its extension-owned
// queue/ACL objects are irrelevant to native card voting; retain every app object
// and all app RLS/grants, including extension grant event-trigger functions.
export function communityCloneRestoreList(toc){
 return toc.split('\n').filter(line=>!(/\b(?:pg_cron|cron)\b/.test(line))).join('\n')
}
export function communityCloneTarget(env,source,target){
 const name=env.SUPABASE_DB_CONTAINER
 const local=name===container
 const ci=name==='supabase_db_mnzgorenjska'&&env.CI==='true'&&env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&env.GITHUB_JOB==='varnost'
 assert.ok(env.FUSSBALL_COMMUNITY_DISPOSABLE_TEST==='1'&&(local||ci),'explicit owned community-card clone required')
 assert.match(source,/^(postgres|community_cards_[a-z0-9_]+)$/)
 assert.match(target,/^community_cards_race_[0-9]+_[0-9]+$/)
 assert.notEqual(source,target)
 return name
}
// A logical snapshot works while cron/net remain connected. Never disallow
// source connections or terminate a worker: killing pg_net can crash the server.
export async function cloneCommunityCardDatabase(env,source,target){
 const name=communityCloneTarget(env,source,target)
 const [state]=JSON.parse(docker(['inspect',name]))
 if(name===container)assert.equal(state.Config.Labels?.['slff.test.owner'],owner)
 else assert.equal(state.Config.Labels?.['com.supabase.cli.project'],'mnzgorenjska')
 const dump=`/tmp/${target}.dump`,list=`/tmp/${target}.list`
 const sql=(query,db='template1',timeout=300000)=>docker(['exec','-i',name,'psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],{input:query,timeout}).trim()
 let created=false
 const cleanup=async()=>{
  if(created){
   await waitForCommunityCloneWorkers(()=>JSON.parse(sql(`select coalesce(json_agg(json_build_object('pid',pid,'backend_type',backend_type,'state',state)), '[]'::json)from pg_stat_activity where datname='${target}'and backend_type<>'client backend';`,'template1',2000)))
   sql(`drop database ${target} with(force);`)
   created=false
  }
  for(const path of [dump,list]){
   let exists=false
   try{docker(['exec',name,'test','-f',path]);exists=true}catch{}
   if(exists)docker(['exec',name,'rm','--',path])
  }
 }
 try{
  docker(['exec',name,'pg_dump','-U','supabase_admin','-d',source,'--format=custom','--exclude-schema=cron','--exclude-schema=net','--exclude-schema=vault',`--file=${dump}`],{timeout:300000})
  const toc=communityCloneRestoreList(docker(['exec',name,'pg_restore','--list',dump]))
  // Filename is generated and validated above; bytes travel on stdin, never in
  // a shell command or host file. No credentials/configuration files are read.
  docker(['exec','-i',name,'sh','-c','cat > "$1"','community-card-clone-list',list],{input:toc})
  sql(`create database ${target} template template0;`);created=true
  sql('create schema vault;',target)
  docker(['exec',name,'pg_restore','-U','supabase_admin','-d',target,'--exit-on-error','--single-transaction',`--use-list=${list}`,dump],{timeout:300000})
  return cleanup
 }catch(error){
  try{await cleanup()}catch(cleanupError){throw new AggregateError([error,cleanupError],'community clone failed and cleanup refused',{cause:error})}
  throw error
 }
}

// Passive polling only: a transient backend may finish naturally. Persistent
// workers keep the clone intact and retain their identity in the failure.
export async function waitForCommunityCloneWorkers(readWorkers,{timeoutMs=5000,intervalMs=100}={}){
 const deadline=Date.now()+timeoutMs
 for(;;){
  const workers=readWorkers()
  if(workers.length===0)return
  assert.ok(Date.now()<deadline,`refusing to terminate database workers: ${JSON.stringify(workers)}`)
  await new Promise(resolve=>setTimeout(resolve,Math.min(intervalMs,Math.max(1,deadline-Date.now()))))
 }
}

// Own only the spawned client process. Never signal PostgreSQL or find/kill
// unrelated processes. Node's spawn deadline also covers missing chunk markers.
export function communityTestSession(command,args,{timeoutMs=30000,closingInput=''}={}){
 const child=spawn(command,args,{stdio:['pipe','pipe','pipe'],timeout:timeoutMs,killSignal:'SIGKILL'})
 let stdout='',stderr='',spawnError
 child.stdout.on('data',chunk=>{stdout+=chunk})
 child.stderr.on('data',chunk=>{stderr+=chunk})
 child.stdin.on('error',error=>{stderr+=`\nstdin: ${error.message}`})
 child.on('error',error=>{spawnError=error})
 const finished=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal,error:spawnError})))
 return {
  child,finished,get stdout(){return stdout},get stderr(){return stderr},
  async waitFor(marker){
   if(stdout.includes(marker))return
   await new Promise((resolve,reject)=>{
    const check=()=>{if(stdout.includes(marker)){child.stdout.off('data',check);resolve()}}
    child.stdout.on('data',check)
    finished.then(result=>{
     child.stdout.off('data',check)
     if(stdout.includes(marker))resolve()
     else reject(Error(`owned session ended before ${marker}: ${JSON.stringify(result)}; stdout: ${stdout}; stderr: ${stderr}`))
    })
   })
  },
  async close(){
   if(!child.stdin.destroyed&&!child.stdin.writableEnded)child.stdin.end(closingInput)
   return finished
  }
 }
}
export async function cleanupCommunityTestSessions(cleanup,sessions){
 const errors=[]
 try{await cleanup?.()}catch(error){errors.push(error)}
 const results=await Promise.allSettled(sessions.map(session=>session.close()))
 for(let index=0;index<results.length;index++){
  const result=results[index],session=sessions[index]
  if(result.status==='rejected')errors.push(result.reason)
  else if(result.value.signal||result.value.error)errors.push(Error(`owned session failed: ${JSON.stringify(result.value)}; stdout: ${session.stdout}; stderr: ${session.stderr}`))
 }
 if(errors.length===1)throw errors[0]
 if(errors.length)throw new AggregateError(errors,'community fixture cleanup failed')
}
