// Reviewed MLSZ source contract. GK basis is published order inference, never an official role label.
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync,utimesSync,realpathSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import mlsz,{krogiStrani,vrsticeKroga,vZapisnik,nastopi,jeKontumacija,brezPostav,sezonaIzKode,sezonaStrani,naslovKroga,naslovTekme,kljucKlubaHu,razbijKodo} from './viri/mlsz.mjs'
import {razpakiraj} from './klubi.mjs'
import {rokKroga} from './razporedi.mjs'
export const MLSZ_BATCH_MAPPINGS=[
 {id:635,slug:'hu-pe-u19-e',source:'mlsz',source_league_code:'67/14/34252',host:'adatbank.mlsz.hu',archives:[{code:'65/14/32325',season:'2025/26'}]},
 {id:475,slug:'hu-za-3-kozep',source:'mlsz',source_league_code:'67/20/34240',host:'adatbank.mlsz.hu',archives:[{code:'63/20/29515',season:'2024/25'}]},
]
const CONTRACT='mlsz-published-order-source-replay-v1',KEEPER='mlsz-published-order-inference'
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),bytesHash=v=>createHash('sha256').update(v).digest('hex')
const hold=message=>{throw Object.assign(Error(`MLSZ provider HOLD: ${message}`),{dataHold:true,reason_code:'MLSZ_PROVIDER_SOURCE_HOLD'})}
const require=(condition,message)=>{if(!condition)hold(message)}
const same=(a,b)=>digest(a)===digest(b)
const parsed=fn=>{try{return fn()}catch(error){if(/^MLSZ duplicate shirt:/.test(error.message))hold(`source identity parser refusal: ${error.message}`);throw error}}
function candidateScope(candidate){require(MLSZ_BATCH_MAPPINGS.some(c=>same(c,candidate)),'outside exact reviewed tuple/archive mappings')}
function nativeScope(candidate,snapshot){
 require(snapshot&&['id','slug','source','source_league_code'].every(k=>candidate[k]===snapshot.competition?.[k]),'native candidate tuple changed')
 require(snapshot.competition.active===false&&snapshot.competition.source_policy===null&&snapshot.competition.date_only_deadline_policy===null,'active/custom policy requires separate route')
 require(Array.isArray(snapshot.fantasy?.teams)&&!snapshot.fantasy.teams.length&&Array.isArray(snapshot.fantasy?.lineups)&&!snapshot.fantasy.lineups.length,'fantasy data changed')
 require(['teams','players','matches','rounds'].every(k=>Array.isArray(snapshot[k])),'incomplete native source snapshot')
 require(!snapshot.matches.some(m=>m.statistics_status==='unavailable_historical'),'historical exclusions cannot enter generic source contract')
 require(snapshot.season===sezonaIzKode(candidate.source_league_code),'current source season mismatch')
}
function metadata(html,code,round) {
 const {ev,sz,verseny}=razbijKodo(code)
 for(const [id,value]of [['hiddenEvad',ev],['hiddenSzervezet',sz],['hiddenVerseny',verseny],['hiddenFordulo',round]]) {
  const input=[...html.matchAll(/<input\b[^>]*>/gi)].map(m=>m[0]).filter(s=>new RegExp(`\\bid=["']${id}["']`).test(s))
  require(input.length===1&&input[0].match(/\bvalue=["'](\d+)["']/)?.[1]===String(value),`source page ${id} binding mismatch`)
 }
 require(sezonaStrani(html)===sezonaIzKode(code),'source page season binding mismatch')
}
function strictSchedule(html,code,round) {
 const start=html.indexOf('id="match_panel"'),end=html.indexOf('team_lapbar',start),panel=html.slice(start,end<0?undefined:end)
 let expected=0
 for(const block of panel.split(/<div class="schedule[ "]/).slice(1)) {
  const name=side=>razpakiraj(block.match(new RegExp(`<div class="${side}_team">[\\s\\S]*?<span>([^<]*)</span>`))?.[1]??'')
  const home=name('home'),away=name('away')
  require(home&&away,'unparsed published source row team names')
  if(/^szabadnap(?:os)?$/i.test(home)||/^szabadnap(?:os)?$/i.test(away))continue
  expected++
  const link=block.match(/\/match\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\.html/)
  if(link)require(link.slice(1,4).join('/')===code&&Number(link[4])===round,'published source row league/round binding differs')
 }
 const fixtures=vrsticeKroga(html,round)
 require(expected===fixtures.length,'unparsed published source row; inventory incomplete')
 return fixtures
}
function fresh(page,now){const age=now.getTime()-Date.parse(page.captured_at);require(page.obtained==='network'&&Number.isFinite(age)&&age>=0&&age<=15*60_000,'schedule needs fresh original network capture')}
function requirePrices({candidate,snapshot,receipts,expectedSha,now}) {
 require(receipts?.expected_sha===expectedSha&&receipts.slug===candidate.slug&&receipts.snapshot_sha256===digest(snapshot),'fresh pricing receipt binding mismatch')
 for(const stage of ['keepers','positions','prices']) {
  const steps=receipts.steps?.filter(s=>s.stage===stage)
  const at=Date.parse(steps?.[0]?.completed_at)
  require(steps?.length===1&&steps[0].status==='COMPLETED'&&Number.isFinite(at)&&at<=now.getTime()&&now.getTime()-at<=60*60_000,`fresh ${stage} pricing receipt missing`)
 }
}
function compareReport({z,match,snapshot,fixture,round}) {
 require(z&&z.sezona===round.season&&z.krog===round.number&&z.datum===fixture.datum,'report season/round/date differs from schedule/native binding')
 const teams=[z.domaci,z.gostje],ids=[match.home_team_id,match.away_team_id]
 for(let i=0;i<2;i++)require(kljucKlubaHu(teams[i].ime)===kljucKlubaHu(i===0?fixture.domaci:fixture.gostje),'report team differs from schedule')
 require(z.rezultat.domaci===match.home_goals&&z.rezultat.gostje===match.away_goals,'report score differs from native score')
 // 7–10 starters are published facts, already allowed by the existing HU contract.
 for(const warning of z.opozorila)require(teams.some(t=>t.postava.length>=7&&t.postava.length<=10&&warning===`${t.ime}: v postavi je ${t.postava.length} igralcev namesto 11`),'unexplained source parser warning')
 require(Array.isArray(match.import_warnings)&&same([...match.import_warnings].sort(),[...z.opozorila].sort()),'unexplained or differing native import warnings')
 const source=parsed(()=>nastopi(z)),players=new Map(snapshot.players.map(p=>[p.id,p])),native=match.appearance_rows
 require(Array.isArray(native)&&native.length===source.length,'individual appearance count differs')
 const observed=new Set()
 for(const n of source) {
  require(Number.isSafeInteger(n.regSt)&&n.regSt>0,'source profile identity missing')
  const rows=native.filter(a=>a.team_id===ids[n.ekipaIdx]&&players.get(a.player_id)?.reg_st===n.regSt)
  require(rows.length===1,'source profile does not resolve to exactly one native appearance')
  const a=rows[0];require(!observed.has(a.player_id),'duplicate native source appearance');observed.add(a.player_id)
  const fields={shirt_number:n.st,started:n.zacetnik,is_goalkeeper:n.vratar,minute_on:n.minutaOd,minute_off:n.minutaDo,minutes_played:n.minute,goals:n.goli,own_goals:n.avtogoli,penalties_scored:n.goliIzEnajstmetrovke,yellow_cards:n.rumeni,red_cards:n.rdeci,red_card_minute:n.redCardMinute,goals_conceded:n.prejetiGoli,clean_sheet:n.cleanSheet}
  for(const [key,value]of Object.entries(fields))require(a[key]===value,`source individual ${key} differs (profile ${n.regSt})`)
 }
 for(let i=0;i<2;i++) {
  const first=teams[i].postava[0]
  require(first?.vratar===true&&source.filter(n=>n.ekipaIdx===i&&n.zacetnik&&n.vratar).length===1,'published first-starter keeper convention differs')
 }
 const normalizedSource=z.goli.map(g=>{
  const actors=source.filter(n=>n.ekipaIdx===g.ekipaIdx&&(g.regSt?n.regSt===g.regSt:n.st===g.st&&n.ime===g.ime))
  require(actors.length===1,'source scorer identity ambiguous or missing')
  return {reg:actors[0].regSt,team:ids[g.ekipaIdx],minute:g.minuta,own:g.avtogol,penalty:g.enajstmetrovka}
 }).map(digest).sort()
 require(Array.isArray(match.goal_rows),'native individual goals missing')
 const normalizedNative=match.goal_rows.map(g=>({reg:players.get(g.scorer_id)?.reg_st,team:g.team_id,minute:g.minute,own:g.is_own_goal,penalty:g.is_penalty})).map(digest).sort()
 require(same(normalizedSource,normalizedNative),'source individual scorer/team/own-goal side differs')
}
function replayPages({candidate,expectedSha,snapshot,receipts,pages,read,now}) {
 candidateScope(candidate);nativeScope(candidate,snapshot);requirePrices({candidate,snapshot,receipts,expectedSha,now})
 const byUrl=new Map(),used=new Set(),seenNative=new Set(),seenReport=new Set()
 for(const page of pages){require(!byUrl.has(page.url),'duplicate evidence URL');byUrl.set(page.url,page)}
 const load=(url,kind,code,round,reportId)=>{
  const page=byUrl.get(url);require(page&&page.kind===kind&&page.code===code&&page.round===round&&(kind!=='report'||page.report_id===reportId),'missing exact source evidence page')
  const bytes=read(page);require(bytesHash(bytes)===page.sha256,'retained source bytes digest mismatch');used.add(url)
  const html=bytes.toString('utf8');require(mlsz.zaPredpomnilnik(html),'invalid or denied source evidence');metadata(html,code,round)
  if(kind==='schedule')fresh(page,now)
  return html
 }
 let reportCount=0,fixtureCount=0
 const codes=[{code:candidate.source_league_code,season:snapshot.season},...candidate.archives]
 for(const {code,season}of codes) {
  require(sezonaIzKode(code)===season,'archive source season binding differs')
  const first=load(naslovKroga(code,1),'schedule',code,1),numbers=krogiStrani(first)
  require(numbers.length>0&&numbers.length<=60&&numbers[0]===1,'full official round selector missing or exceeds bound')
  for(const number of numbers) {
   const html=number===1?first:load(naslovKroga(code,number),'schedule',code,number)
   require(same(krogiStrani(html),numbers),'source round selectors changed during capture')
   const fixtures=strictSchedule(html,code,number);require(fixtures.length>0,'empty or incomplete published source round')
   const nativeRounds=snapshot.rounds.filter(r=>r.season===season&&r.number===number)
   if(code===candidate.source_league_code)require(nativeRounds.length===1,'current published source round missing in native calendar')
   const round=nativeRounds[0],roundDate=fixtures.map(f=>f.datum).filter(Boolean).sort()[0],roundTime=fixtures.filter(f=>f.datum===roundDate&&f.ura).map(f=>f.ura).sort()[0]
   if(code===candidate.source_league_code) {
    require(round.played_on?.slice(0,10)===roundDate,'native future/current round date differs')
    const deadline=rokKroga(roundDate,roundTime,Number(snapshot.competition.rok_pomak_ur??6))
    if(Date.parse(deadline)>now.getTime()||Date.parse(round.deadline_at)>now.getTime())require(Date.parse(deadline)===Date.parse(round.deadline_at),'native future deadline differs from published calendar')
   }
   for(const fixture of fixtures) {
    fixtureCount++;require(fixture.datum,'source fixture date missing')
    const teamId=name=>{const matches=snapshot.teams.filter(t=>kljucKlubaHu(t.name)===kljucKlubaHu(name));require(matches.length===1,'source club missing or ambiguous in native mapping');return matches[0].id}
    const home=teamId(fixture.domaci),away=teamId(fixture.gostje)
    const native=snapshot.matches.filter(m=>m.round_id===round?.id&&m.home_team_id===home&&m.away_team_id===away)
    if(code===candidate.source_league_code||fixture.izid)require(native.length===1,'published source fixture/report missing or archive ownership collision')
    if(!native.length)continue
    const match=native[0];require(!seenNative.has(match.id),'duplicate source fixture/native mapping');seenNative.add(match.id)
    require(match.played_on?.slice(0,10)===fixture.datum,'source fixture/native played date differs')
    if(!fixture.izid){require(!match.imported_at&&!match.kontumacija&&match.home_goals===0&&match.away_goals===0,'unpublished source score differs from native result');continue}
    require(fixture.id&&match.zapisnik_id===fixture.id&&!seenReport.has(fixture.id),'published report ID differs, duplicated or belongs elsewhere');seenReport.add(fixture.id)
    require(match.home_goals===fixture.izid.domaci&&match.away_goals===fixture.izid.gostje,'published source fixture score differs')
    const reportHtml=load(naslovTekme(code,number,fixture.id),'report',code,number,fixture.id),z=parsed(()=>vZapisnik(reportHtml,{id:fixture.id,url:naslovTekme(code,number,fixture.id)}))
    if(!z){const oldEnough=(now.getTime()-Date.parse(fixture.datum))/86400000>7;require(jeKontumacija(reportHtml,fixture.izid)&&(!brezPostav(reportHtml,fixture.izid)||oldEnough)&&match.kontumacija===true,'published source report unavailable or unexplained forfeit');require(!match.appearance_rows?.length&&!match.goal_rows?.length,'forfeit has native statistics');continue}
    require(match.imported_at&&!match.kontumacija,'complete source report not fully imported')
    compareReport({z,match,snapshot,fixture,round});reportCount++
   }
  }
 }
 require(snapshot.matches.every(m=>seenNative.has(m.id)),'native fixture/report absent from complete published source inventory')
 require(used.size===pages.length,'unbound extra source evidence pages')
 return {report_count:reportCount,fixture_count:fixtureCount}
}
export async function produceMlszProof({candidate,expectedSha,snapshot,receipts,evidenceRoot,loadPage,now}) {
 const clock=now?()=>now:()=>new Date();const started=clock()
 candidateScope(candidate);nativeScope(candidate,snapshot);require(/^[a-f0-9]{40}$/.test(expectedSha),'exact main SHA missing');requirePrices({candidate,snapshot,receipts,expectedSha,now:started})
 require(!existsSync(evidenceRoot),'source proof evidence directory already exists; automatic replay forbidden');mkdirSync(evidenceRoot,{recursive:true})
 const pages=[],seen=new Set()
 const capture=async(url,kind,code,round,reportId)=>{
  if(seen.has(url))return readFileSync(join(evidenceRoot,pages.find(p=>p.url===url).file),'utf8')
  const result=await loadPage(url,{kind,code,round,report_id:reportId}),bytes=Buffer.from(result.bytes),sha256=bytesHash(bytes),file=sha256+'.html'
  require(bytes.length>0&&bytes.length<=4*1024*1024&&Number.isFinite(Date.parse(result.captured_at))&&Date.parse(result.captured_at)<=clock().getTime(),'source bytes/capture timestamp invalid')
  const entry={url,kind,code,round,...(reportId?{report_id:reportId}:{}),sha256,file,captured_at:result.captured_at,obtained:result.obtained,capture_basis:result.capture_basis??(result.obtained==='cache'?'legacy-cache-filesystem-mtime':'network-response')}
  if(kind==='schedule')fresh(entry,clock())
  writeFileSync(join(evidenceRoot,file),bytes,{mode:0o600});const at=new Date(result.captured_at);utimesSync(join(evidenceRoot,file),at,at);pages.push(entry);seen.add(url)
  const html=bytes.toString('utf8');require(mlsz.zaPredpomnilnik(html),'invalid source response');metadata(html,code,round);return html
 }
 for(const {code}of [{code:candidate.source_league_code},...candidate.archives]) {
  const first=await capture(naslovKroga(code,1),'schedule',code,1),numbers=krogiStrani(first)
  require(numbers.length&&numbers.length<=60&&numbers[0]===1,'full source round selector missing')
  for(const round of numbers) {
   const html=round===1?first:await capture(naslovKroga(code,round),'schedule',code,round)
   require(same(krogiStrani(html),numbers),'source round selectors changed during capture')
   for(const fixture of strictSchedule(html,code,round))if(fixture.izid){require(fixture.id,'published source report ID missing');await capture(naslovTekme(code,round,fixture.id),'report',code,round,fixture.id)}
  }
 }
 const generated=clock(),summary=replayPages({candidate,expectedSha,snapshot,receipts,pages,read:p=>readFileSync(join(evidenceRoot,p.file)),now:generated})
 const proof={contract_id:CONTRACT,candidate,expected_sha:expectedSha,snapshot_sha256:digest(snapshot),captured_at:generated.toISOString(),generated_at:generated.toISOString(),keeper_basis:KEEPER,schedule_complete:true,archives:candidate.archives,archive_collisions:[],original_bytes_sha256:digest(pages),evidence_root:realpathSync(evidenceRoot),pages,receipts,...summary}
 writeFileSync(join(evidenceRoot,'manifest.json'),JSON.stringify(proof,null,2)+'\n',{mode:0o600});return proof
}
export function replayMlszProof({candidate,expectedSha,snapshot,proof,now=new Date()}) {
 candidateScope(candidate);nativeScope(candidate,snapshot)
 require(proof?.contract_id===CONTRACT&&proof.keeper_basis===KEEPER&&proof.expected_sha===expectedSha&&same(proof.candidate,candidate)&&proof.snapshot_sha256===digest(snapshot)&&proof.schedule_complete===true&&same(proof.archives,candidate.archives)&&same(proof.archive_collisions,[])&&Array.isArray(proof.pages)&&proof.original_bytes_sha256===digest(proof.pages),'source proof tuple/commit/snapshot/manifest binding differs')
 require(now.getTime()-Date.parse(proof.generated_at)>=0&&now.getTime()-Date.parse(proof.generated_at)<=15*60_000,'source proof generation stale')
 const result=replayPages({candidate,expectedSha,snapshot,receipts:proof.receipts,pages:proof.pages,read:p=>{require(/^[a-f0-9]{64}\.html$/.test(p.file)&&p.file===p.sha256+'.html','source evidence file binding invalid');return readFileSync(join(proof.evidence_root,p.file))},now})
 require(result.report_count===proof.report_count&&result.fixture_count===proof.fixture_count,'replayed source inventory count differs');return true
}
export function createMlszContract({runCommand,budgetPath,maxRequests,outputDirectory}) {
 const roots=new Map()
 return {id:CONTRACT,source:'mlsz',host:'adatbank.mlsz.hu',capture:async({candidate,expectedSha,snapshot,audit,receipts,now})=>{
  candidateScope(candidate);require(audit.snapshot_sha256===digest(snapshot),'producer native audit digest differs')
  if(!budgetPath||!outputDirectory)throw Error('Budgeted fixed source-proof child configuration missing.')
  const directory=resolve(outputDirectory,candidate.slug);require(!existsSync(directory),'source proof checkpoint already exists; review before another run');mkdirSync(directory,{recursive:true})
  const input=join(directory,'input.json'),output=join(directory,'proof.json'),evidence=join(directory,'evidence')
  writeFileSync(input,JSON.stringify({candidate,expected_sha:expectedSha,snapshot,receipts})+'\n',{mode:0o600})
  const status=await runCommand('scripts/mlsz-provider-proof.mjs',['--input',input,'--output',output,'--evidence',evidence],{budgetPath,maxRequests,logPath:join(directory,'producer.log')})
  if(status.sourceFailure||[4,5].includes(status.code))throw Object.assign(Error('MLSZ source proof stopped shared provider.'),{sourceStop:true})
  if(status.code===3){const refused=JSON.parse(readFileSync(output,'utf8'));hold(refused.reason??'source producer data refusal')}
  if(status.code!==0)throw Error('MLSZ source proof producer failed technically; inspect retained logs.')
  const proof=JSON.parse(readFileSync(output,'utf8'));roots.set(candidate.slug,realpathSync(evidence))
  require(proof.evidence_root===roots.get(candidate.slug),'foreign source proof root');replayMlszProof({candidate,expectedSha,snapshot,proof,now:new Date(proof.generated_at)});return proof
 },verify:options=>{require(roots.get(options.candidate.slug)===options.proof?.evidence_root,'source proof did not come from this exact fixed producer invocation');return replayMlszProof(options)}}
}
export async function loadMlszPage(url,{kind,code,round,report_id},{cacheDirectory=resolve('scripts/.predpomnilnik/mlsz'),request=globalThis.fetch}={}) {
 if(!process.env.SLFF_PROVIDER_BUDGET_PATH)throw Error('Source proof requires installed shared source budget preload.')
 const cache=cacheDirectory,name=kind==='schedule'?`krog-${code.replaceAll('/','-')}-${round}.html`:`tekma-${code.replaceAll('/','-')}-${report_id}.html`,path=join(cache,name)
 if(kind==='report'&&existsSync(path)) {
  const bytes=readFileSync(path)
  if(mlsz.zaPredpomnilnik(bytes.toString('utf8')))return {bytes,captured_at:statSync(path).mtime.toISOString(),obtained:'cache',capture_basis:'legacy-cache-filesystem-mtime'}
 }
 const response=await request(url,{headers:mlsz.glave,redirect:'manual',signal:AbortSignal.timeout(30000)})
 if(!response.ok)throw Object.assign(Error('MLSZ proof source response refused.'),{sourceStop:true})
 const bytes=Buffer.from(await response.arrayBuffer()),captured_at=new Date().toISOString()
 if(!mlsz.zaPredpomnilnik(bytes.toString('utf8')))throw Object.assign(Error('Invalid live MLSZ source HTML; stop shared provider.'),{sourceStop:true})
 mkdirSync(cache,{recursive:true});writeFileSync(path,bytes);return {bytes,captured_at,obtained:'network',capture_basis:'network-response'}
}
async function main() {
 const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){require(['--input','--output','--evidence'].includes(args[i])&&!options[args[i]]&&args[i+1],'invalid fixed proof child option');options[args[i]]=args[i+1]}
 require(options['--input']&&options['--output']&&options['--evidence'],'fixed proof child paths missing')
 const input=JSON.parse(readFileSync(options['--input'],'utf8'))
 require(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REF==='refs/heads/main'&&process.env.GITHUB_SHA===input.expected_sha&&process.env.GITHUB_RUN_ATTEMPT==='1'&&execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===input.expected_sha,'proof child exact main identity differs')
 try{const proof=await produceMlszProof({...input,expectedSha:input.expected_sha,evidenceRoot:options['--evidence'],loadPage:loadMlszPage});writeFileSync(options['--output'],JSON.stringify(proof,null,2)+'\n',{mode:0o600})}
 catch(error){writeFileSync(options['--output'],JSON.stringify({status:error.dataHold?'HOLD':'STOPPED',reason:error.message})+'\n',{mode:0o600});process.exitCode=error.dataHold?3:error.zavrnitev||error.sourceStop?4:1}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=error.dataHold?3:error.zavrnitev||error.sourceStop?4:1})
