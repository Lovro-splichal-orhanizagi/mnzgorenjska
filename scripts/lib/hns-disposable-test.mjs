// Test-only clone ownership and target ACL boundary. Never resets a source DB.
import {execFileSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
export function assertHnsDisposableTarget(env=process.env){
 const container=env.SUPABASE_DB_CONTAINER,source=env.HNS_WOMEN_BASE_DB??'postgres'
 const local=container==='slff_hr_historical_test_20261018'&&(source==='postgres'||/^hns_ci_baseline_[a-f0-9]{16}$/.test(source))
 const ci=container==='supabase_db_mnzgorenjska'&&env.GITHUB_ACTIONS==='true'&&env.CI==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&env.GITHUB_JOB==='varnost'&&source==='postgres'
 if(env.HNS_WOMEN_DISPOSABLE_TEST!=='1'||env.SUPABASE_TEST_DB||!(local||ci))throw Error('Explicit owned HNS disposable container/source required; caller-selected test databases forbidden')
 return{container,source}
}
export function hnsRestoreToc(toc){
 return toc.split('\n').filter(line=>{
  if(line.includes(' DEFAULT ACL ')||line.includes('EXTENSION')&&/ pg_cron(?: |$)/.test(line))return false
  // Explicit target public/private/auth ACLs are retained. Unrelated managed
  // extensions/catalogs and their default ACLs cannot be restored as postgres.
  if(/\bACL\b/.test(line))return /\bACL (?:public|auth|private_[a-z_]+) /.test(line)||/\bACL - SCHEMA (?:public|auth|private_[a-z_]+) /.test(line)
  return true
 }).join('\n')
}
export async function withHnsDisposableDatabase(env,body,{run=execFileSync}={}){
 const{container,source}=assertHnsDisposableTarget(env)
 const docker=(args,options={})=>run('docker',args,{maxBuffer:128*1024*1024,...options})
 const identity=JSON.parse(docker(['inspect',container,'--format','{"name":{{json .Name}},"image":{{json .Config.Image}}}']).toString())
 if(identity.name!==`/${container}`||!/^(?:public\.ecr\.aws|ghcr\.io)\/supabase\/postgres:[0-9]+(?:\.[0-9]+)*$/.test(identity.image))throw Error('Owned HNS container identity/image mismatch')
 const ready=docker(['exec',container,'psql','-U','postgres','-d',source,'-X','-At','-v','ON_ERROR_STOP=1','-c',"select to_regprocedure('public.check_hns_women_release(text,text,boolean)')is not null and not exists(select 1 from public.competitions where slug='hr-prva-hnlz');"]).toString().trim()
 if(ready!=='t')throw Error('HNS row-free fully migrated source required')
 const name=`hns_ci_${process.pid}_${randomBytes(8).toString('hex')}`,directory=mkdtempSync(join(tmpdir(),'slff-hns-ci-')),files=[]
 let created=false
 try{
  const dump=docker(['exec',container,'pg_dump','-U','supabase_admin','-d',source,'-Fc','--exclude-schema=cron','--exclude-schema=vault','--exclude-schema=realtime'])
  const spool=(suffix,bytes)=>{
   const host=join(directory,`clone.${suffix}`),remote=`/tmp/${name}.${suffix}`
   writeFileSync(host,bytes,{mode:0o600});files.push(remote)
   docker(['cp',host,`${container}:${remote}`]);return remote
  }
  const dumpFile=spool('dump',dump)
  // A TOC reader may exit before consuming the archive; use its owned file,
  // never pipe the whole custom dump into a process that can close stdin early.
  const toc=docker(['exec',container,'pg_restore','-l',dumpFile]).toString()
  const listFile=spool('list',hnsRestoreToc(toc))
  docker(['exec',container,'createdb','-U','postgres','-T','template0',name]);created=true
  docker(['exec',container,'psql','-U','postgres','-d',name,'-X','-v','ON_ERROR_STOP=1','-c','create schema vault;'])
  docker(['exec',container,'pg_restore','-U','postgres','-d',name,'--no-owner','--exit-on-error','-L',listFile,dumpFile])
  return await body({...env,SUPABASE_DB_CONTAINER:container,SUPABASE_TEST_DB:name,HISTORICAL_STATISTICS_DISPOSABLE_TEST:'1'})
 }finally{
  try{if(created)docker(['exec',container,'dropdb','-U','postgres','--force',name])}
  finally{try{if(files.length)docker(['exec',container,'rm','-f','--',...files])}finally{rmSync(directory,{recursive:true,force:true})}}
 }
}
