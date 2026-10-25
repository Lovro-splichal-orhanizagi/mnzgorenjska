// A synchronous factory for an offline, source-replayed pack. No source transport exists here.
import {assertBulkCandidate,bulkClubKey,bulkAppearances} from '../bulk-native-proof.mjs'
import {reserveFussballIdentities} from './fussball-public.mjs'
import {fussballPlayerKey} from '../fussball-import.mjs'
const proof=(ok,message)=>{if(!ok)throw Error(`bulk captured: ${message}`)}
const countries={pzpn:'PL',wmzpn:'PL','fussball-public':'DE'}
export function createBulkCapturedSource({competition,db,directory=process.env.SLFF_BULK_CAPTURE,loadPack}={}){
 proof(competition&&countries[competition.source]===competition.country_code&&Number.isSafeInteger(competition.id)&&competition.id>0&&Number.isSafeInteger(competition.country_id)&&competition.country_id>0&&competition.active===false&&competition.source_policy===null&&competition.date_only_deadline_policy===null,'exact inactive source/country/NULL-policy competition required')
 proof(typeof directory==='string'&&directory.length>0,'explicit bulk capture directory required')
 const key=bulkClubKey(competition.source),appearances=new WeakMap();let loaded=null,boundCode=null,reservation=null
 const get=async code=>{
  proof(typeof code==='string'&&code,'explicit source season code required');proof(boundCode===null||boundCode===code,'one source instance cannot mix source season codes');boundCode=code
  loaded??=(async()=>{const loader=loadPack??(await import('../bulk-source-packs.mjs')).loadBulkPack;const pack=await loader(directory,{competition,now:new Date(),requireFresh:true});assertBulkCandidate(pack.candidate)
   const c=pack.candidate;proof(['slug','source','source_league_code','country_code'].every(k=>c[k]===competition[k])&&(c.id===undefined||c.id===competition.id),'pack candidate differs from exact registered tuple');return pack})()
  const pack=await loaded,scopes=assertBulkCandidate(pack.candidate),scope=scopes.find(s=>s.code===code)
  proof(scope&&Array.isArray(pack.seasons),'source code not bound to admitted current/archive scope')
  const entries=pack.seasons.filter(s=>s.code===code&&s.season===scope.season);proof(entries.length===1&&Array.isArray(entries[0].schedule)&&Array.isArray(entries[0].reports),'exact source season missing')
  const season=entries[0],names=new Map()
  for(const round of season.schedule)for(const f of round.tekme)for(const name of [f.domaci,f.gostje]){proof(typeof name==='string'&&key(name),'source club name missing');const old=names.get(key(name));proof(old===undefined||old===name,'source clubs collapse into the native canonical club key');names.set(key(name),name)}
  return {pack,season}
 }
 const reserve=async(pack,season)=>{
  const mappings=new Map(),keys=new Map()
  const add=(source_id,reg_st)=>{proof(typeof source_id==='string'&&Number.isSafeInteger(reg_st)&&fussballPlayerKey(source_id)===reg_st,'DE identity differs from full published profile');proof(!mappings.has(source_id)||mappings.get(source_id)===reg_st,'DE profile changed key');proof(!keys.has(reg_st)||keys.get(reg_st)===source_id,'DE numeric identity collision');mappings.set(source_id,reg_st);keys.set(reg_st,source_id)}
  for(const i of [...(pack.identities??[]),...(season.identities??[])])add(i.source_id,i.reg_st)
  for(const r of season.reports){for(const a of r.nastopi)add(a.virId??a.sourcePlayerId,a.regSt);for(const side of [r.z.domaci,r.z.gostje])for(const p of [...side.postava,...side.rezerve])add(p.virId??p.sourcePlayerId,p.regSt)}
  proof(mappings.size>0&&mappings.size<=5000,'bounded complete DE identities missing')
  await reserveFussballIdentities(db,[...mappings].map(([source_id,reg_st])=>({source_id,reg_st})))
 }
 return {ime:competition.source,bulkCaptured:true,drzava:competition.country_code,polnoIme:competition.source==='fussball-public'?'FUSSBALL.DE — captured public reports':'Polish federation — captured official reports',osnovniNaslov:competition.source==='fussball-public'?'https://www.fussball.de':'https://'+(competition.source==='pzpn'?'szpnkielce.pl':'wmzpn.pl'),imaRegistracije:true,razporedBrezUvodnegaPrenosa:true,kljucKluba:key,poenostavi:key,kratkoIme:s=>String(s??'').normalize('NFC').replace(/\s+/gu,' ').trim(),
  naslovRazporeda(){return 'offline:bulk-captured'},
  async razporedVseStrani(code){return structuredClone((await get(code)).season.schedule)},
  async zapisniki(code){const {pack,season}=await get(code);if(competition.source==='fussball-public'){reservation??=reserve(pack,season);await reservation}return season.reports.map(r=>{const z=structuredClone(r.z);appearances.set(z,bulkAppearances(r));return {id:r.id,url:r.url,z}})},
  nastopi(z){proof(appearances.has(z),'statistics require this source instance bound report identity');return structuredClone(appearances.get(z))},
 }
}
