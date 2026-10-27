// Creates/replaces ONLY the exact owned local, no-network/no-port card test DB.
// No .env, source requests, host databases or running developer stacks are used.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
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
