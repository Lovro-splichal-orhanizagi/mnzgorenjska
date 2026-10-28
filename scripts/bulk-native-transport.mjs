// Actions-only wrapper; native readiness and activation remain the existing RPCs.
import {parseFussballLeagueCode} from './fussball-import.mjs'
import {isFussballCommunityCandidate,FUSSBALL_COMMUNITY_SOURCE_POLICY} from './fussball-community-policy.mjs'
import {assertReviewedFussballCommunityCandidate} from './fussball-community-release.mjs'
const hold=message=>Object.assign(Error(message),{dataHold:true,reason_code:'REGISTRATION_SCOPE_HOLD'})
export function createBulkTransport({url,key,base,fetch:request=globalThis.fetch}){
 const origin=new URL('/rest/v1/',url)
 async function call(path,body){
  const r=await request(new URL(path,origin),{method:body?'POST':'GET',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json',prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(60000)})
  if(!r.ok)throw Error(`Native batch database HTTP ${r.status}.`)
  return r.json()
 }
 async function country(id,code){
  const q=new URLSearchParams({select:'id,code',...(id?{id:`eq.${id}`}:{code:`eq.${code}`}),limit:'2'})
  const rows=await call('countries?'+q)
  if(!Array.isArray(rows)||rows.length!==1||rows[0].code!==code)throw hold('Exact registered country binding missing.')
  return rows[0]
 }
 const find=async c=>{
  const rows=await call('competitions?'+new URLSearchParams({select:'id,slug,source,source_league_code,country_id,active,source_policy,date_only_deadline_policy',or:`(slug.eq.${c.slug},and(source.eq.${c.source},source_league_code.eq.${c.source_league_code}))`,limit:'2'}))
  if(!Array.isArray(rows)||rows.length>1)throw hold('Candidate registration is ambiguous or already owned.')
  if(!rows.length)return null
  const row=rows[0];if(['slug','source','source_league_code'].some(k=>row[k]!==c[k]))throw hold('Existing candidate registration identity differs.')
  await country(row.country_id,c.country_code);return row
 }
 return {...base,find,prepareFussballHistory:async({manifest,sha256})=>call('rpc/prepare_fussball_historical_statistics',{p_manifest:manifest,p_sha256:sha256}),readFussballHistory:async id=>call('rpc/get_fussball_historical_preparation',{p_competition_id:id}),snapshot:async c=>{
  const snapshot=await base.snapshot(c)
  await country(snapshot.competition.country_id,c.country_code)
  snapshot.competition.country_code=c.country_code
  if(isFussballCommunityCandidate(c)&&snapshot.competition.source_policy===FUSSBALL_COMMUNITY_SOURCE_POLICY)snapshot.fussball_cards=await call('rpc/check_fussball_card_readiness',{p_competition_id:c.id,p_code:c.source_league_code})
  return snapshot
 },installCommunityPolicy:async c=>{
  try{assertReviewedFussballCommunityCandidate(c);if(!Number.isSafeInteger(c.id)||c.id<=0)throw hold('Registered community identity required.')}catch(error){error.writeNotStarted=true;throw error}
  return call('rpc/install_fussball_card_policy',{p_competition_id:c.id,p_current_code:c.source_league_code,p_archive_codes:c.archives.map(a=>a.code)})
 },recordCommunityAdmission:async(c,{manifest,sha256})=>{
  try{assertReviewedFussballCommunityCandidate(c);if(!Number.isSafeInteger(c.id)||c.id<=0||!/^[a-f0-9]{64}$/.test(sha256??''))throw hold('Exact community admission identity/digest required.')}catch(error){error.writeNotStarted=true;throw error}
  return call('rpc/record_fussball_card_admission',{p_competition_id:c.id,p_code:c.source_league_code,p_manifest:manifest,p_sha256:sha256})
 },register:async c=>{
  let writing=false
  try{
  if(c.id||c.country_code!=='DE'||c.source!=='fussball-public'||!/^de-[a-z0-9-]+$/.test(c.slug))throw hold('Only new reviewed German public candidates may be registered.')
  parseFussballLeagueCode(c.source_league_code)
  if(await find(c))throw hold('Registration changed before insertion.')
  const r=c.registration
  if(!r||Object.keys(r).some(k=>!['name','short_name','vir_ime','vir_url','sort_order','rok_pomak_ur'].includes(k))||!['name','short_name','vir_ime'].every(k=>typeof r[k]==='string'&&r[k].trim()&&r[k].length<160)||!Number.isSafeInteger(r.sort_order)||!Number.isSafeInteger(r.rok_pomak_ur)||r.rok_pomak_ur<0||r.rok_pomak_ur>48||r.vir_url!==c.seedUrl)throw hold('Reviewed inactive registration metadata missing.')
  const countryRow=await country(null,'DE')
  writing=true
  const rows=await call('competitions',{...r,slug:c.slug,source:c.source,source_league_code:c.source_league_code,country_id:countryRow.id,active:false,prvi_fantasy_krog:1,source_policy:null,date_only_deadline_policy:null})
  if(!Array.isArray(rows)||rows.length!==1||!Number.isSafeInteger(rows[0].id)||rows[0].active!==false||['slug','source','source_league_code'].some(k=>rows[0][k]!==c[k]))throw Error('Ambiguous inactive registration response.')
  return rows[0].id
  }catch(error){if(!writing)error.writeNotStarted=true;throw error}
 }}
}
