import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'

// Never choose the developer's default DB. CI authority is exact, not a flag alone.
export function mfaNlDisposableTarget(env) {
 const container=env.SUPABASE_DB_CONTAINER
 const local=container==='supabase_db_slff_mfa_nl_release_20261021'
 const ci=container==='supabase_db_mnzgorenjska'&&env.GITHUB_ACTIONS==='true'&&env.CI==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&env.GITHUB_JOB==='varnost'
 assert.ok(local||ci,'explicit owned release DB or exact disposable CI job required')
 return {container,project:local?'slff_mfa_nl_release_20261021':'mnzgorenjska'}
}
export function mfaNlDisposableDb(env) {
 const target=mfaNlDisposableTarget(env)
 const docker=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',maxBuffer:16*1024*1024,...options})
 const labels=JSON.parse(docker(['inspect',target.container,'--format','{{json .Config.Labels}}']))
 assert.equal(labels['com.supabase.cli.project'],target.project)
 const args=['exec','-i',target.container,'psql','-U','postgres','-d','postgres','-X','-At','-v','ON_ERROR_STOP=1']
 return {...target,docker,args,sql:q=>docker(args,{input:q}).trim()}
}
