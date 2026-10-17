// Regional release is deliberately separate from the live Nordost gate.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import vir, { konfiguracijaDfb } from './viri/dfb.mjs'
import { preveriPokritost } from './preveri-vir-sezono.mjs'
import { preveriPosnetek as preveriSuroviPosnetek } from './vklopi-nemcijo.mjs'
export function preveriPosnetek(dir,records){
 const snapshot=preveriSuroviPosnetek(dir,records)
 if(records.some(r=>Date.parse(r.at)>Date.now()+300000))throw Error('DFB capture timestamp is in the future')
 return snapshot
}
export const sourceFiles=['scripts/viri/dfb.mjs','scripts/viri/dfb-lige.json','scripts/viri/dfb-korekcije.json','scripts/viri/dfb-rezerve.json','scripts/viri/fussball.mjs','scripts/viri/fussball-pisava.mjs','scripts/viri/fussball-datumski-glifi.json','scripts/viri/fss.mjs','scripts/klubi.mjs','scripts/preveri-vir-sezono.mjs']
export const sha=x=>createHash('sha256').update(x).digest('hex')
const fail=x=>{throw Error(`DFB regional release: ${x}`)}
export function configuration(slug,season='2026/27'){
 if(!/^de-regionalliga-(nord|west|suedwest|bayern)$/.test(slug)||!['2025/26','2026/27'].includes(season))fail('invalid scope')
 const code=`${slug.slice(3)}/${season.slice(0,4)}-20${season.slice(-2)}`
 return {code,...konfiguracijaDfb(code)}
}
export const parserSha256=()=>sha(JSON.stringify(sourceFiles.map(p=>[p,sha(readFileSync(new URL(`../${p}`,import.meta.url)))])))
const canonical=rows=>rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'))
// Exact values written by uvoz-zapisnikov: identity uses historical side + name.
export function kanonicniNastopi(z){return canonical(vir.nastopi(z).map(x=>({side:x.ekipaIdx,name:x.ime,
 shirt_number:x.st??null,started:x.zacetnik,minute_on:x.minutaOd,minute_off:x.minutaDo,minutes_played:x.minute,
 goals:x.goli,own_goals:x.avtogoli,penalties_scored:x.goliIzEnajstmetrovke,penalties_missed:x.zgreseneEnajstmetrovke,
 yellow_cards:x.rumeni,red_cards:x.rdeci,goals_conceded:x.prejetiGoli,clean_sheet:x.cleanSheet,is_goalkeeper:Boolean(x.vratar)})))}
export function kanonicniGoli(z){return canonical(z.goli.map(g=>({side:g.ekipaIdx,name:g.ime,minute:g.minuta,is_own_goal:g.avtogol,is_penalty:g.enajstmetrovka,score_home:g.rezultat?.[0]??null,score_away:g.rezultat?.[1]??null})))}
export function sestaviSezono({slug,sezona,razpored,zapisniki,nepopolni=[],capturedAt,runId,jobId,documentsSha256}){
 const c=configuration(slug,sezona),coverage=preveriPokritost({sezona,razpored,zapisniki,nepopolni})
 if(!coverage.pripravljeno)fail(`coverage/keepers: ${JSON.stringify(coverage)}`)
 const fixtures=razpored.flatMap(r=>r.tekme.map(t=>({...t,round:r.stevilka}))),pairs=new Set(),ids=new Set(),clubs=new Set(fixtures.flatMap(t=>[t.domaci,t.gostje]))
 if(razpored.length!==c.rounds||fixtures.length!==c.teams*(c.teams-1)||clubs.size!==c.teams)fail('season shape')
 for(let n=1;n<=c.rounds;n++){
  const f=fixtures.filter(t=>t.round===n)
  if(f.length!==Math.floor(c.teams/2)||new Set(f.flatMap(t=>[t.domaci,t.gostje])).size!==f.length*2)fail('round participants/byes')
 }
 const reports=new Map(zapisniki.map(r=>[r.id,r]))
 const out=fixtures.map(t=>{
  const id=`de-dfb-${t.dfbId??t.id}`,pair=JSON.stringify([t.domaci,t.gostje]),r=reports.get(id),played=t.odigrana===true
  if(!/^de-dfb-[1-9]\d{0,9}$/.test(id)||ids.has(id)||pairs.has(pair)||t.domaci===t.gostje)fail('duplicate fixture/pair')
  ids.add(id);pairs.add(pair)
  if(played!==!!r||sezona==='2025/26'&&!played)fail('complete archive/current reports required')
  const starters=[]
  if(r)for(const [side,e]of[r.z.domaci,r.z.gostje].entries()){
   if(e.postava.length!==11||e.postava.filter(p=>p.vratar===true&&p.vratarVir==='oznaka-T').length!==1)fail('explicit keeper proof required')
   for(const p of e.postava)starters.push({side,name:p.ime,keeper:p.vratar===true,proof:p.vratar===true?p.vratarVir:null})
  }
  return {id,round:t.round,date:t.datum,time:t.ura??null,home:t.domaci,away:t.gostje,played,
   homeGoals:r?.z.rezultat.domaci??null,awayGoals:r?.z.rezultat.gostje??null,url:r?.url??t.url,
   starters:canonical(starters),warnings:r?.z.opozorila??[],appearances:r?kanonicniNastopi(r.z):[],goals:r?kanonicniGoli(r.z):[]}
 }).sort((a,b)=>a.round-b.round||a.id.localeCompare(b.id))
 return {season:sezona,code:c.code,capturedAt,runId,jobId,documentsSha256,fixtures:out}
}
export function preveriOdobritev(raw,approvedSha,now=Date.now()){
 if(Buffer.byteLength(raw)>8*1024*1024||!/^[a-f0-9]{64}$/.test(approvedSha)||sha(raw)!==approvedSha)fail('approved manifest SHA/size mismatch')
 const m=JSON.parse(raw);configuration(m.slug)
 if(m.version!==1||!/^[a-f0-9]{40}$/.test(m.sourceCommit)||m.parserSha256!==parserSha256()||m.seasons?.length!==2)fail('scope/parser provenance mismatch')
 for(const [i,season]of['2025/26','2026/27'].entries()){
  const s=m.seasons[i],c=configuration(m.slug,season),age=now-Date.parse(s.capturedAt)
  if(s.season!==season||s.code!==c.code||!Number.isFinite(age)||age< -300000||age>(i?12:168)*3600000||!/^\d{1,20}$/.test(s.runId)||!/^\d{1,20}$/.test(s.jobId)||!/^[a-f0-9]{64}$/.test(s.documentsSha256)||s.fixtures?.length!==c.teams*(c.teams-1))fail('invalid/stale capture provenance')
 }
 return m
}
export async function pripravi({slug,archiveDir,currentDir,sourceCommit,proof}){
 configuration(slug)
 if(!/^[a-f0-9]{40}$/.test(sourceCommit)||proof?.sourceCommit!==sourceCommit||proof.slug!==slug||proof.sourceFilesIdentical!==true)fail('verified job provenance required')
 const seasons=[]
 for(const [i,dir]of[archiveDir,currentDir].entries()){
  const season=['2025/26','2026/27'][i],p=proof.proof?.[i]
  if(p?.season!==season||p.captureCommit!==sourceCommit||p.seasonJobPassed!==true)fail('season capture job mismatch')
  const snapshot=preveriPosnetek(dir,JSON.parse(readFileSync(resolve(dir,'prenosi.json'),'utf8')))
  const read=async url=>{if(!snapshot.documents.has(url))fail(`missing captured URL ${url}`);return snapshot.documents.get(url)}
  const code=configuration(slug,season).code,razpored=await vir.razporedVseStrani(code,read),zapisniki=await vir.zapisniki(code,read,{zberiNapake:true})
  seasons.push(sestaviSezono({slug,sezona:season,razpored,zapisniki,nepopolni:vir.nepopolni??[],...snapshot,runId:p.runId,jobId:p.jobId}))
 }
 const m={version:1,slug,sourceCommit,parserSha256:parserSha256(),seasons};const raw=JSON.stringify(m)+'\n';preveriOdobritev(raw,sha(raw));return m
}
export function actionsOnly(){if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska')fail('database operations require repository Actions')}
export async function databaseCheck(raw,approvedSha,activate=false){
 const m=preveriOdobritev(raw,approvedSha);actionsOnly()
 if(activate&&process.env.SERVER_READY!=='true')fail('verified German server deployment required')
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!key||!base||new URL(base).protocol!=='https:')fail('Actions database configuration required')
 const response=await fetch(new URL('/rest/v1/rpc/varen_vklop_dfb_regije',base),{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({p_manifest:raw,p_sha256:approvedSha,p_aktiviraj:activate}),signal:AbortSignal.timeout(120000)})
 const data=await response.json();if(!response.ok||data.preverjeno!==true||data.slug!==m.slug||data.vklopljena!==activate)fail(`database check refused: ${data.message??response.status}`)
 return data
}
async function main(){
 const [mode,...a]=process.argv.slice(2)
 if(mode==='prepare'&&a.length===6){const [slug,archiveDir,currentDir,sourceCommit,proofFile,out]=a;const m=await pripravi({slug,archiveDir,currentDir,sourceCommit,proof:JSON.parse(readFileSync(proofFile,'utf8'))}),raw=JSON.stringify(m)+'\n';writeFileSync(out,raw);console.log(JSON.stringify({sha256:sha(raw),slug,sourceCommit,seasons:m.seasons.map(s=>({season:s.season,capturedAt:s.capturedAt,runId:s.runId,jobId:s.jobId,fixtures:s.fixtures.length,played:s.fixtures.filter(f=>f.played).length}))}));return}
 if(['check','activate'].includes(mode)&&a.length===2){console.log(JSON.stringify(await databaseCheck(readFileSync(a[0],'utf8'),a[1],mode==='activate')));return}
 fail('prepare <slug> <archive> <current> <sourceCommit> <proof.json> <out> | check|activate <manifest> <approvedSHA>')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
