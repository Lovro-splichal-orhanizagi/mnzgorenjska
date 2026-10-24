// Capture-bound runtime adapter. Source transport is available only in the separate collector.
import {loadDriblImportCapture,parseDriblLeagueCode,assertDriblIdentityCollisions} from '../dribl-import.mjs'
import {driblScopeCode} from '../dribl-capture.mjs'
const proof=(ok,message)=>{if(!ok)throw Error('dribl public: '+message)}
const text=s=>String(s??'').normalize('NFC').replace(/\s+/gu,' ').trim()
const key=s=>text(s).toLocaleLowerCase('en-AU').replace(/[^\p{L}\p{N}]+/gu,' ').trim()
export async function reserveDriblIdentities(db,identities){
 proof(db&&typeof db.rpc==='function','writer database client required for identity reservation');assertDriblIdentityCollisions(identities)
 const expected=new Map(identities.map(i=>[i.source_id,i.reg_st])),{data,error}=await db.rpc('dribl_reserve_player_ids',{p_source_ids:[...expected.keys()]})
 proof(!error,'identity reservation failed: '+(error?.message??''));proof(Array.isArray(data)&&data.length===expected.size,'identity reservation returned incomplete mapping')
 const seen=new Set();for(const row of data){proof(typeof row?.source_id==='string'&&!seen.has(row.source_id)&&Number.isSafeInteger(row.reg_st)&&expected.get(row.source_id)===row.reg_st,'identity reservation mapping differs from full published source identities');seen.add(row.source_id)}
}
export function createDriblPublicSource({competition,db,directory=process.env.SLFF_DRIBL_CAPTURE,archiveCode=process.env.SLFF_DRIBL_ARCHIVE_CODE,loadCapture=loadDriblImportCapture}={}){
 proof(competition?.source==='dribl-public'&&Number.isSafeInteger(competition.country_id)&&competition.country_id>0&&competition.country_code==='AU'&&/^au-/.test(competition.slug??'')&&competition.source_policy==null,'invalid competition/country/provider/policy scope')
 const currentScope=parseDriblLeagueCode(competition.source_league_code)
 if(archiveCode){parseDriblLeagueCode(archiveCode);proof(archiveCode!==competition.source_league_code,'archive must be an explicitly different source season')}
 let loaded=null,reservation=null,boundCode=null;const appearances=new WeakMap()
 const getBatch=async code=>{
  const scope=parseDriblLeagueCode(code),current=code===competition.source_league_code;proof(current||code===archiveCode,'source season/archive scope is not explicitly bound')
  proof(typeof directory==='string'&&directory.length>0,'SLFF_DRIBL_CAPTURE must name a complete capture directory');proof(boundCode===null||boundCode===code,'one source instance cannot mix capture scopes');boundCode=code
  loaded??=loadCapture(directory,{...scope,current});const b=await loaded
  proof(b.provider==='dribl-public'&&b.code===code&&driblScopeCode(b.scope)===code&&b.activationEligible===false,'capture batch scope differs')
  const years=b.catalog?.seasons,selected=years?.find(s=>s.id===scope.season),currentSeason=years?.find(s=>s.id===currentScope.season)
  proof(selected&&currentSeason&&(current?selected.isCurrent===true:selected.year===currentSeason.year-1),'archive must be the explicitly bound previous published season')
  const names=new Map();for(const r of b.schedule)for(const f of r.tekme)for(const [name,team]of[[f.domaci,f.domaciId],[f.gostje,f.gostjeId]]){const k=key(name);proof(!names.has(k)||names.get(k)===team,'distinct source teams collapse into one native club key');names.set(k,team)}
  return b
 }
 return {ime:'dribl-public',polnoIme:'Dribl — Football NSW public match reports',drzava:'AU',osnovniNaslov:'https://competitions.footballnsw.com.au',imaRegistracije:true,razporedBrezUvodnegaPrenosa:true,premorMs:3000,kljucKluba:key,poenostavi:key,kratkoIme:text,
  naslovRazporeda(code){const s=parseDriblLeagueCode(code);return `https://competitions.footballnsw.com.au/fixtures?season=${s.season}&competition=${s.competition}&league=${s.league}&date_range=all&timezone=Europe%2FLjubljana`},
  async razporedVseStrani(code){return structuredClone((await getBatch(code)).schedule)},
  async zapisniki(code){const b=await getBatch(code);reservation??=reserveDriblIdentities(db,b.identities);await reservation;return b.reports.map(r=>{const z=structuredClone(r.z);appearances.set(z,structuredClone(r.nastopi));return {id:r.id,url:r.url,z}})},
  nastopi(z){proof(appearances.has(z),'appearance statistics require this source instance bound report identity');return structuredClone(appearances.get(z))},
 }
}
