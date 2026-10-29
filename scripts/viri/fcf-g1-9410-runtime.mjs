// Native-only9410 overlay. Frozen FCF parser/old409 brands remain unchanged.
import {requireFcfG1Installed4109410Supplement,fcfG1Supplement4109410Calendar} from '../lib/fcf-g1-9410-installed.mjs'
import {historicalStatisticsPolicySha256 as hash} from '../lib/historical-statistics-policy.mjs'
import {preberiBlok,vZapisnik,naslovZapisnika} from './fcf.mjs'
const fail=()=>{throw Error('FCF G1 installed9410: exact private calendar/coverage required; HOLD')},same=(a,b)=>hash(a)===hash(b)
export function withFcfG1Installed4109410(base,competition,{installedG1Supplement=competition?.fcfG1Installed4109410,readBlock=preberiBlok}={}){
 if(installedG1Supplement===undefined||installedG1Supplement===null)return {provider:base,readBlock}
 const input={competition,installedG1Supplement},check=code=>{requireFcfG1Installed4109410Supplement(input);if(base?.ime!=='fcf'||typeof readBlock!=='function'||code!==competition.source_league_code)fail()}
 requireFcfG1Installed4109410Supplement(input)
 const bridge=()=>{const t=fcfG1Supplement4109410Calendar(input);return {...t,g:{...t.g,izid:{domaci:null,gostje:null}}}}
 const merge=options=>{if((options.historicalFixtures??[]).some(t=>t?.id===4109410||t?.historicalMarker?.reportId==='es4109410'))fail();return {...options,preskoci:new Set([...(options.preskoci??[]),'es4109410']),historicalFixtures:[...(options.historicalFixtures??[]),bridge()]}}
 const block=async(code,read,options={})=>{
  check(code);const before=await readBlock(code,read,merge(options)),expected=bridge()
  if(before?.skupina!=='SEGONA CATALANA|GRUP 1|2026/27'||before.tujih!==0||before.ni?.length!==0||before.tekme?.length!==240||before.tekme.some((t,i)=>t.id!==4109388+i))fail()
  const old=before.tekme.find(t=>t.id===4109410);if(old.historicalMarker!==expected.historicalMarker||old.html!==null||!same(old.g,expected.g))fail()
  // This exact nullable container is internal only. Never clear an unexpected
  // known score: the equality above must pass before the unchanged finalizer.
  const result={...before,tekme:before.tekme.map(t=>t===old?{...t,g:{...t.g,izid:null}}:t)}
  if(result.tekme.length!==240||!same(before.tekme.filter(t=>t!==old),result.tekme.filter(t=>t.id!==4109410)))fail()
  check(code);return result
 }
 return {readBlock:block,provider:{...base,
  async zapisniki(code,read,options={}){
   check(code);if(String(options.samoZapisnik)==='es4109410')return []
   if(String(options.samoZapisnik)==='es4109409')return base.zapisniki(code,read,options)
   const b=await block(code,read,{...options,svezi:true}),out=[]
   // Same ordinary-report loop as the frozen provider, using its real parser.
   for(const t of b.tekme){if(t.historicalMarker||!t.g.izid)continue;const url=naslovZapisnika(t.id),z=vZapisnik(t.html,{id:'es'+t.id,url});if(!z||z.prazen&&(Date.now()-Date.parse(z.datum+'T00:00:00Z'))/86400000>7)continue;out.push({id:z.zapisnikId,z,url})}return out
  },
  posamezniZapisnik(code,options){check(code);if(String(options?.id)==='es4109410')return async()=>[];return base.posamezniZapisnik(code,options)},
 }}
}
