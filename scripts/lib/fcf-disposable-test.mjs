// Safety boundary for local/CI test runners only; never a product database helper.
export function assertFcfDisposableTest(env=process.env){
 const container=env.SUPABASE_DB_CONTAINER
 const owned=/^(?:supabase_db_)?slff_fcf_historical_test_[a-z0-9_]+$/.test(container??'')
 const ci=env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&container==='supabase_db_mnzgorenjska'
 if(env.FCF_HISTORY_DISPOSABLE_TEST!=='1'||!(owned||ci))throw Error('Explicit owned FCF disposable container required')
 return container
}
export function fcfDisposableCloneDumpArgs(env=process.env){
 return['exec',assertFcfDisposableTest(env),'pg_dump','-U','supabase_admin','-d','postgres','--no-owner','--no-privileges','--exclude-schema=cron','--exclude-schema=vault','--exclude-schema=realtime']
}
export function fcfPostgrestSchemaReady(body){
 try{
  const schema=JSON.parse(body)
  return schema?.swagger==='2.0'&&typeof schema.paths?.['/rpc/prepare_fcf_historical_cleanup']?.post==='object'&&typeof schema.paths?.['/rpc/apply_fcf_historical_cleanup']?.post==='object'
 }catch{return false}
}
