// Actions-only wrapper; native readiness and activation remain the existing RPCs.
import {parseFussballLeagueCode} from './fussball-import.mjs'
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
 return {...base,find,snapshot:async c=>{
  const snapshot=await base.snapshot(c)
  await country(snapshot.competition.country_id,c.country_code)
  snapshot.competition.country_code=c.country_code
  return snapshot
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
