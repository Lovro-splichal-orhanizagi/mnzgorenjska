// Prepare from captured official source documents; database access runs only in Actions.
// prepare <archive-dir> <current-dir> <source-commit> <archive-run> <current-run> <output>
// check|activate <manifest.json> <reviewed-sha256>
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { preveriPokritost } from './preveri-vir-sezono.mjs'
const sha=s=>createHash('sha256').update(s).digest('hex')
const fail=s=>{throw Error(`Vklop Nemčije: ${s}`)}
const scope={ '2025/26':'regionalliga-nordost/2025-2026', '2026/27':'regionalliga-nordost/2026-2027' }
const fingerprintFiles=['dfb-calendar.mjs','dfb-calendar-receipts.json','dfb.mjs','dfb-korekcije.json','dfb-rezerve.json','fussball.mjs','fussball-pisava.mjs','fussball-datumski-glifi.json','fss.mjs']
export function parserSha256(){
 return sha(JSON.stringify([...fingerprintFiles.map(p=>[`viri/${p}`,sha(readFileSync(new URL(`./viri/${p}`,import.meta.url)))]),...['klubi.mjs','preveri-vir-sezono.mjs'].map(p=>[p,sha(readFileSync(new URL(`./${p}`,import.meta.url)))])]))
}
export function preveriPosnetek(dir,records){
 if(!Array.isArray(records)||!records.length||records.length>1500)fail('manjka omejen seznam prenosov')
 const documents=new Map(),proof=[]
 for(const r of records){
  const url=new URL(r.url)
  if(url.origin!=='https://datencenter.dfb.de'||url.username||url.password||url.hash||r.napaka)fail('neveljaven uradni zajem')
  if(!/^[a-f0-9]{64}\.html$/.test(r.file)||r.file!==`${r.sha256}.html`)fail('neveljaven SHA dokumenta')
  const bytes=readFileSync(resolve(dir,r.file))
  if(bytes.length>5_000_000||sha(bytes)!==r.sha256)fail('SHA dokumenta se ne ujema')
  if(!Number.isFinite(Date.parse(r.at)))fail('manjka čas uradnega zajema')
  const body=bytes.toString('utf8')
  if(documents.has(r.url)&&documents.get(r.url)!==body)fail('nasprotujoča zajema iste strani')
  documents.set(r.url,body);proof.push({url:r.url,sha256:r.sha256,at:r.at})
 }
 proof.sort((a,b)=>a.url.localeCompare(b.url)||a.at.localeCompare(b.at))
 return {documents,documentsSha256:sha(JSON.stringify(proof)),capturedAt:proof.map(r=>r.at).sort()[0]}
}
export function sestaviSezono({sezona,razpored,zapisniki,nepopolni=[],dovoliCakajociDfb=false,capturedAt,runId,documentsSha256='0'.repeat(64)}){
 if(!scope[sezona]||!/^\d+$/.test(runId))fail('neveljavna sezona ali zagon')
 const result=preveriPokritost({sezona,razpored,zapisniki,nepopolni,dovoliCakajociDfb})
 if(!result.pripravljeno)fail(`pokritost/vratarji: ${JSON.stringify(result.napake)} ${result.klubiBrezVratarja}`)
 const fixtures=razpored.flatMap(r=>r.tekme.map(t=>({...t,round:r.stevilka}))),pairs=new Set()
 if(razpored.length!==34||fixtures.length!==306||result.klubov!==18)fail('sezona zahteva 34 krogov, 18 klubov in 306 tekem')
 for(let round=1;round<=34;round++){
  const f=fixtures.filter(t=>t.round===round)
  if(f.length!==9||new Set(f.flatMap(t=>[t.domaci,t.gostje])).size!==18)fail(`nepopoln krog ${round}`)
 }
 const reports=new Map(zapisniki.map(r=>[r.id,r]))
 const out=fixtures.map(t=>{
  const id=`de-dfb-${t.dfbId??t.id}`
  if(!/^de-dfb-[1-9]\d{0,9}$/.test(id)||pairs.has(JSON.stringify([t.domaci,t.gostje])))fail('podvojena identiteta para ali zapisnika')
  pairs.add(JSON.stringify([t.domaci,t.gostje]))
  const r=reports.get(id),played=t.odigrana===true,pending=result.cakajoci.some(n=>n.id===id)
  if(played!==!!r&&!pending)fail('zapisnik in stanje odigrane tekme se ne ujemata')
  const starters=[]
  if(r)for(const [side,e] of [r.z.domaci,r.z.gostje].entries()){
   const gk=e.postava.filter(p=>p.vratar===true)
   if(gk.length!==1||gk[0].vratarVir!=='oznaka-T')fail('začetni vratar potrebuje izrecno oznako-T')
   for(const p of e.postava)starters.push({side,name:p.ime,keeper:p.vratar===true,proof:p.vratar===true?p.vratarVir:null})
  }
  return {id,round:t.round,date:t.datum,home:t.domaci,away:t.gostje,played,
   ...(pending?{pending:true,pendingReason:'official-report-unpublished'}:{}),
   homeGoals:r?.z.rezultat.domaci??(pending?t.izid.domaci:null),awayGoals:r?.z.rezultat.gostje??(pending?t.izid.gostje:null),url:r?.url??t.url??(pending?result.cakajoci.find(n=>n.id===id).url:null),
   starters:starters.sort((a,b)=>a.side-b.side||a.name.localeCompare(b.name)),warnings:r?.z.opozorila??[]}
 }).sort((a,b)=>a.round-b.round||a.id.localeCompare(b.id))
 if(sezona==='2025/26'&&out.some(f=>!f.played))fail('arhiv potrebuje vseh 306 zapisnikov')
 return {season:sezona,code:scope[sezona],capturedAt,runId,documentsSha256,fixtures:out}
}
export function preveriOdobritev(raw,approvedSha,fingerprint,now=Date.now()){
 if(!/^[a-f0-9]{64}$/.test(approvedSha)||sha(raw)!==approvedSha)fail('odobreni SHA256 manifesta se ne ujema')
 if(Buffer.byteLength(raw)>2_500_000)fail('prevelik manifest')
 const m=JSON.parse(raw)
 if(![1,2].includes(m.version)||m.slug!=='de-regionalliga-nordost'||!/^[a-f0-9]{40}$/.test(m.sourceCommit)||m.seasons?.length!==2)fail('neveljaven obseg manifesta')
 const pending=m.seasons.flatMap(s=>s.fixtures.filter(f=>f.pending===true).map(f=>({...f,season:s.season})))
 if(m.version===1&&pending.length||m.version===2&&(m.launchPolicy!=='future-round-with-pending-history'||pending.length!==1||pending.some(f=>f.id!=='de-dfb-2426099'||f.season!=='2026/27'||f.round!==13||f.date!=='2026-10-16'||f.home!=='Hertha BSC II'||f.away!=='RSV Eintracht 1949'||f.homeGoals!==0||f.awayGoals!==1||f.played!==true||f.pendingReason!=='official-report-unpublished'||f.starters.length!==0||f.warnings.length!==0)))fail('neveljaven obseg čakajočega zgodovinskega zapisnika')
 if(m.parserSha256!==fingerprint)fail('razčlenjevalnik ni isti kot pri odobrenem manifestu')
 for(const [index,season] of ['2025/26','2026/27'].entries()){
  const s=m.seasons[index],age=now-Date.parse(s.capturedAt)
  if(s.season!==season||s.code!==scope[season]||!/^\d+$/.test(s.runId)||!/^[a-f0-9]{64}$/.test(s.documentsSha256))fail('manjka izvor sezone')
  if(!Number.isFinite(age)||age< -300000||age>(index===1?12:168)*3600000)fail('zajem ni dovolj svež (tekoča 12 h, arhiv 7 dni)')
 }
 return m
}
export async function pripravi({archiveDir,currentDir,sourceCommit,archiveRun,currentRun,vir}){
 if(!/^[a-f0-9]{40}$/.test(sourceCommit))fail('potreben je celoten pregledani commit SHA')
 const seasons=[]
 for(const [dir,season,runId] of [[archiveDir,'2025/26',archiveRun],[currentDir,'2026/27',currentRun]]){
  const snapshot=preveriPosnetek(dir,JSON.parse(readFileSync(resolve(dir,'prenosi.json'),'utf8')))
  const read=async url=>{if(!snapshot.documents.has(url))fail(`v zajemu manjka uradna stran: ${url}`);return snapshot.documents.get(url)}
  const razpored=await vir.razporedVseStrani(scope[season],read)
  const zapisniki=await vir.zapisniki(scope[season],read,{zberiNapake:true})
  seasons.push(sestaviSezono({sezona:season,razpored,zapisniki,nepopolni:vir.nepopolni??[],dovoliCakajociDfb:season==='2026/27',runId,...snapshot}))
 }
 const pending=seasons.some(s=>s.fixtures.some(f=>f.pending))
 return {version:pending?2:1,...(pending?{launchPolicy:'future-round-with-pending-history'}:{}),slug:'de-regionalliga-nordost',sourceCommit,parserSha256:parserSha256(),seasons}
}
async function main(){
 const [mode,...args]=process.argv.slice(2)
 if(mode==='prepare'&&args.length===6){
  const [archiveDir,currentDir,sourceCommit,archiveRun,currentRun,out]=args
  const {default:vir}=await import('./viri/dfb.mjs')
  const m=await pripravi({archiveDir,currentDir,sourceCommit,archiveRun,currentRun,vir}),raw=JSON.stringify(m)+'\n'
  // Preparation also refuses stale captures; the reviewed digest binds the raw snapshot AND replay code.
  preveriOdobritev(raw,sha(raw),m.parserSha256)
  writeFileSync(out,raw);console.log(JSON.stringify({manifest:out,sha256:sha(raw),sourceCommit,parserSha256:m.parserSha256,launchPolicy:m.launchPolicy??'complete-history',seasons:m.seasons.map(s=>({season:s.season,fixtures:s.fixtures.length,played:s.fixtures.filter(f=>f.played).length,pending:s.fixtures.filter(f=>f.pending).map(f=>({id:f.id,round:f.round,home:f.home,away:f.away})),capturedAt:s.capturedAt,runId:s.runId}))},null,2));return
 }
 if(['check','activate'].includes(mode)&&args.length===2){
  const raw=readFileSync(args[0],'utf8');preveriOdobritev(raw,args[1],parserSha256())
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska')fail('servisni klic teče samo v GitHub Actions tega repozitorija')
  const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!base||!key)fail('manjka nastavitev baze v Actions')
  const url=new URL('/rest/v1/rpc/varen_vklop_nemcije',base)
  if(url.protocol!=='https:')fail('baza mora uporabljati HTTPS')
  const response=await fetch(url,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({p_manifest:raw,p_sha256:args[1],p_aktiviraj:mode==='activate'}),signal:AbortSignal.timeout(60000)})
  const data=await response.json();if(!response.ok)fail(`preverba baze zavrnjena: ${data.message??response.status}`)
  if(data.preverjeno!==true||mode==='activate'&&data.vklopljena!==true)fail('baza ni potrdila zahtevane operacije')
  console.log(JSON.stringify(data,null,2));return
 }
 fail('Uporaba: prepare <arhiv-mapa> <tekoča-mapa> <commit-sha> <arhiv-run> <tekoča-run> <manifest.json> | check|activate <manifest.json> <odobreni-sha256>')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
