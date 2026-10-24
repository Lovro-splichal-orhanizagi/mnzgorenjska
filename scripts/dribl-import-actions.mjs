import {loadDriblImportCapture,parseDriblLeagueCode} from './dribl-import.mjs'
const REPOSITORY='Lovro-splichal-orhanizagi/mnzgorenjska',DAY=24*3600_000
const proof=(ok,message)=>{if(!ok)throw Error('dribl import action: '+message)}
const scopeEqual=(a,b)=>['tenant','season','competition','league'].every(k=>a?.[k]===b[k])
export function assertDriblImportExecution({expectedSha,headSha,env=process.env,envFileExists=false}) {
 proof(/^[a-f0-9]{40}$/.test(expectedSha??'')&&headSha===expectedSha&&env.GITHUB_SHA===expectedSha&&env.GITHUB_ACTIONS==='true'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_REPOSITORY===REPOSITORY&&/^[1-9]\d*$/.test(env.GITHUB_RUN_ID??'')&&env.GITHUB_RUN_ATTEMPT==='1'&&!envFileExists,'first Actions attempt on exact reviewed main required; repository .env forbidden')
}
export function admitDriblCapture(run,inventory,{repository,headSha,runId,now=new Date()}={}) {
 proof(repository===REPOSITORY&&/^[a-f0-9]{40}$/.test(headSha??'')&&/^[1-9]\d{0,14}$/.test(runId??'')&&Number.isSafeInteger(Number(runId)),'invalid capture identity')
 proof(run?.id===Number(runId)&&run.status==='completed'&&run.conclusion==='success'&&run.event==='workflow_dispatch'&&run.head_branch==='main'&&run.head_sha===headSha&&run.head_repository?.full_name===repository&&run.repository?.full_name===repository&&run.path==='.github/workflows/preveri-dribl-paket.yml','capture must be successful same-repository main at this exact commit')
 const timestamp=value=>{const time=Date.parse(value);proof(typeof value==='string'&&value.endsWith('Z')&&Number.isFinite(time)&&Number.isFinite(Number(now))&&time<=Number(now)&&Number(now)-time<=DAY,'capture or artifact is stale/future or missing timestamps');return time}
 const start=timestamp(run.created_at)
 proof(Number.isSafeInteger(inventory?.total_count)&&inventory.total_count>=1&&inventory.total_count<=100&&Array.isArray(inventory.artifacts)&&inventory.artifacts.length===inventory.total_count&&new Set(inventory.artifacts.map(a=>a.id)).size===inventory.total_count,'artifact enumeration incomplete or ambiguous')
 const name=`dribl-batch-${runId}`,matches=inventory.artifacts.filter(a=>a.name===name);proof(matches.length===1,'expected exactly one named capture artifact')
 const a=matches[0]
 proof(Number.isSafeInteger(a.id)&&a.id>0&&a.expired===false&&Number.isSafeInteger(a.size_in_bytes)&&a.size_in_bytes>0&&a.size_in_bytes<=512*1024**2&&a.workflow_run?.id===Number(runId)&&a.workflow_run.head_sha===headSha,'invalid, expired, oversized or cross-run artifact')
 proof(timestamp(a.created_at)>=start,'artifact predates capture run')
 return {runId,artifactId:a.id,artifactName:name,headSha,repository,activationEligible:false}
}
export function assertDriblImportCompetition(row,{slug,code}={}) {
 parseDriblLeagueCode(code)
 proof(/^au-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug??'')&&row?.slug===slug&&Number.isSafeInteger(row.id)&&row.id>0&&Number.isSafeInteger(row.country_id)&&row.country_id>0&&row.country_code==='AU'&&row.source==='dribl-public'&&row.source_league_code===code&&row.source_policy===null&&row.date_only_deadline_policy===null&&row.sezona_koledarska===true&&row.active===false,'exact inactive Australian calendar competition with no custom policy required')
 return row
}
export async function checkDriblImportCompetition({db,slug,code}) {
 parseDriblLeagueCode(code)
 const {data,error}=await db.from('competitions').select('id,slug,country_id,source,source_league_code,source_policy,date_only_deadline_policy,sezona_koledarska,active,countries!inner(code)').eq('slug',slug).maybeSingle()
 proof(!error&&data,'competition database lookup failed')
 const row={...data,country_code:data.countries?.code};assertDriblImportCompetition(row,{slug,code})
 for(const [table,columns,filter]of [['fantasy_teams','id','competition_id'],['fantasy_lineups','round_id,rounds!inner(competition_id)','rounds.competition_id']]) {
  const {count,error}=await db.from(table).select(columns,{count:'exact',head:true}).eq(filter,row.id)
  proof(!error&&count===0,`empty fantasy bootstrap required; ${table} lookup failed or rows exist`)
 }
 return {competition:row,verified:true,activationEligible:false}
}
export async function previewDriblImport({directory,code,archiveCode=null,now=Date.now(),loadCapture=loadDriblImportCapture}) {
 const scope=parseDriblLeagueCode(code),archiveScope=archiveCode?parseDriblLeagueCode(archiveCode):null
 proof(!archiveCode||archiveCode!==code,'archive must be an explicitly distinct source season')
 const load=async(s,current)=>{
  const batch=await loadCapture(directory,{...s,current,now:Number(now)})
  proof(batch?.provider==='dribl-public'&&scopeEqual(batch.scope,s)&&batch.code===['tenant','season','competition','league'].map(k=>s[k]).join(':')&&batch.activationEligible===false&&Array.isArray(batch.reports)&&batch.reports.length>0&&Array.isArray(batch.schedule)&&batch.schedule.length>0,'complete selected native capture scope required')
  return batch
 }
 const current=await load(scope,true),selected=current.catalog?.seasons?.find(s=>s.id===scope.season)
 proof(selected?.isCurrent===true&&Number.isInteger(selected.year)&&current.season===String(selected.year),'published current source year missing')
 let archive=null
 if(archiveScope){
  archive=await load(archiveScope,false)
  const old=archive.catalog?.seasons?.find(s=>s.id===archiveScope.season),present=archive.catalog?.seasons?.find(s=>s.id===scope.season)
  proof(archiveScope.tenant===scope.tenant&&old&&present?.year===selected.year&&old.year===selected.year-1&&archive.season===String(old.year),'archive must be the explicitly bound previous published year')
 }
 return {verified:true,code,archiveCode,current,archive,activationEligible:false}
}
export function createDriblDatabaseOnlyFetch({databaseOrigin,fetch:request=globalThis.fetch}) {
 const base=new URL(databaseOrigin)
 proof(base.protocol==='https:'&&!base.username&&!base.password&&base.pathname==='/'&&!base.search&&!base.hash&&!['mc-api.dribl.com','competitions.footballnsw.com.au'].includes(base.hostname),'exact HTTPS database origin required')
 return async(input,options={})=>{
  const url=new URL(input instanceof Request?input.url:String(input))
  proof(url.origin===base.origin&&!url.username&&!url.password&&!url.hash,'offline Dribl import permits only the exact database origin')
  return request(input,{...options,redirect:'error'})
 }
}
