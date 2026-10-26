// EPS originals replay. First-listed starter goalkeeper is inference, not a published role.
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync,utimesSync,realpathSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import eps,{razberiKodo,razberiZapisnik,naslovRazporeda,naslovMreze,naslovTekme,sifraZapisnika,sifraIgralca,razporedStrani,tekmeMreze,vZapisnik,nastopi,postaviTekme,casovnica,jeIzziv,jeOdrezanaTekma,jeStranPlatforme,kljucKlubaGr,imeKluba,besedilo,sezonaIz} from './viri/eps.mjs'
import {sifra} from './viri/zapisniki.mjs'
import {razpakiraj} from './klubi.mjs'
import {rokKroga} from './razporedi.mjs'
export const EPS_BATCH_MAPPINGS=JSON.parse(readFileSync(new URL('./policies/eps-batch-candidates.json',import.meta.url),'utf8'))
const CONTRACT='eps-published-order-source-replay-v1',KEEPER='eps-published-order-inference',MAX_BYTES=4*1024*1024
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),bytesHash=v=>createHash('sha256').update(v).digest('hex'),same=(a,b)=>digest(a)===digest(b)
const hold=message=>{throw Object.assign(Error(`EPS provider HOLD: ${message}`),{dataHold:true,reason_code:'EPS_PROVIDER_SOURCE_HOLD'})}
const require=(condition,message)=>{if(!condition)hold(message)}
const stop=message=>{throw Object.assign(Error(message),{sourceStop:true})}
function candidateScope(candidate){require(EPS_BATCH_MAPPINGS.some(c=>same(c,candidate)),'outside exact reviewed tuple/archive mappings')}
function nativeScope(candidate,snapshot){
 require(snapshot&&['id','slug','source','source_league_code'].every(k=>candidate[k]===snapshot.competition?.[k]),'native candidate tuple changed')
 require(snapshot.competition.country_code==='GR'&&snapshot.season==='2026/27','native country/current season mismatch')
 require(snapshot.competition.active===false&&snapshot.competition.source_policy===null&&snapshot.competition.date_only_deadline_policy===null,'active/custom policy requires separate route')
 require(Array.isArray(snapshot.fantasy?.teams)&&!snapshot.fantasy.teams.length&&Array.isArray(snapshot.fantasy?.lineups)&&!snapshot.fantasy.lineups.length,'fantasy data changed')
 require(['teams','players','matches','rounds'].every(k=>Array.isArray(snapshot[k])),'incomplete native source snapshot')
 for(const key of ['teams','players','matches','rounds'])require(new Set(snapshot[key].map(r=>r.id)).size===snapshot[key].length,'duplicate native identity')
 require(!snapshot.matches.some(m=>m.statistics_status==='unavailable_historical'),'historical exclusions cannot enter generic source contract')
 const seasons=new Set([snapshot.season,...candidate.archives.map(a=>a.season)])
 require(snapshot.rounds.every(r=>seasons.has(r.season)),'unbound native archive season')
}
// Conservative lexical guard: inert fixture/player rows cannot serve as live evidence.
// Attribute variants are inventoried independently of the legacy parser, then must
// reconcile exactly; unsupported live rows therefore HOLD rather than disappear.
function liveMarkup(original){
 const tokens=/<!--[\s\S]*?(?:-->|$)|<\/?([a-z][\w:-]*)(?=\s|\/?>)((?:"[^"]*"|'[^']*'|[^'">])*)>/gi
 let out='',cursor=0,raw=null,depth=0,inert=''
 for(const token of original.matchAll(tokens)){
  const end=token.index+token[0].length,tag=token[1]?.toLowerCase(),closing=/^<\//.test(token[0])
  if(!tag){require(!/(?:display_(?:game|player)\.php|<tr\b|Αγωνιστική)/i.test(token[0]),'inert source rows cannot establish complete inventory');out+=depth||raw?'':original.slice(cursor,token.index);cursor=end;continue}
  if(raw){inert+=original.slice(cursor,end);if(closing&&tag===raw){require(!/(?:display_(?:game|player)\.php|<tr\b|Αγωνιστική)/i.test(inert),'inert source rows cannot establish complete inventory');raw=null;inert=''}cursor=end;continue}
  if(tag==='template'){if(!closing&&depth===0)inert='';depth+=closing?-1:1;require(depth>=0,'unbalanced inert source markup');if(depth===0)require(!/(?:display_(?:game|player)\.php|<tr\b|Αγωνιστική)/i.test(inert),'inert source rows cannot establish complete inventory');cursor=end;continue}
  if(depth){inert+=original.slice(cursor,end);cursor=end;continue}
  if(/^(script|style|textarea|title|xmp|iframe|noembed|noframes|noscript|plaintext)$/.test(tag)&&!closing){raw=tag;cursor=end;continue}
  out+=original.slice(cursor,token.index)+token[0];cursor=end
 }
 require(!raw&&!depth,'unclosed inert source markup');return out+original.slice(cursor)
}
function attributes(text){
 const out=new Map()
 for(const m of text.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)){
  const key=m[1].toLowerCase();require(!out.has(key),'ambiguous duplicate source attribute');out.set(key,razpakiraj(m[2]??m[3]??m[4]??''))
 }return out
}
function divScope(html,id,allowTruncatedEnd=false){
 let start=null,depth=0
 for(const m of html.matchAll(/<\/?div(?=\s|\/?>)((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)){
  const closing=/^<\//.test(m[0]),attrs=closing?null:attributes(m[1])
  if(!closing&&attrs.get('id')===id){require(start===null,'ambiguous source identity scope');start=m.index;depth=1;continue}
  if(start!==null){depth+=closing?-1:1;if(depth===0)return html.slice(start,m.index+m[0].length)}
 }if(allowTruncatedEnd&&start!==null)return html.slice(start)
 hold(`missing/incomplete source ${id} scope`)
}
function metadata(original,code,kind,season){
 require(eps.zaPredpomnilnik(original),'invalid or denied source evidence')
 const html=liveMarkup(original),main=divScope(html,'maincolumn',kind==='report'&&jeOdrezanaTekma(original)&&!jeStranPlatforme(original)),menu=divScope(main,'horizontal_menu'),{liga}=razberiKodo(code)
 for(const path of ['display_schedule.php','display_results.php']){
  const links=[...menu.matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)].map(m=>attributes(m[1]).get('href')).filter(Boolean).filter(h=>h.includes(path))
  require(links.length===1&&new URL(links[0],naslovRazporeda(code)).href===(path==='display_schedule.php'?naslovRazporeda(code):naslovMreze(code)),'source page league identity mismatch')
 }
 require(![...menu.matchAll(/league_id=(\d+)/g)].some(m=>Number(m[1])!==liga),'source page league ownership mismatch')
 const heading=main.match(/<h1>([\s\S]*?)<\/h1>/)?.[1]
 require(heading&&sezonaIz(besedilo(heading))===season,'source page season binding mismatch')
 require(besedilo(heading).includes(kind==='schedule'?'Πρόγραμμα Αγώνων':kind==='results'?'Αποτελέσματα':'Λεπτομέρειες Αγώνα'),'source page kind mismatch')
 return {html,main,heading}
}
export function strictEpsSchedule(original,code,season){
 const {html,main}=metadata(original,code,'schedule',season),schedule=razporedStrani(html)
 require(schedule.sezona===season&&schedule.ime&&!schedule.nerazreseni.length,'source schedule season/league or unresolved team names')
 const sections=[...main.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2\b|$)/gi)]
 require(sections.length===schedule.krogi.length&&sections.length>0&&sections.length<=70,'source round inventory incomplete or exceeds bound')
 const allRows=[...main.matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/table>)/gi)].filter(m=>/<td\b/i.test(m[1]))
 require(allRows.length===schedule.krogi.reduce((n,r)=>n+r.tekme.length,0),'unparsed published source row outside round inventory')
 const rounds=new Set()
 for(let i=0;i<sections.length;i++){
  const round=schedule.krogi[i],section=sections[i][2];require(round.stevilka===i+1&&!rounds.has(round.stevilka),'source round sequence incomplete or duplicated');rounds.add(round.stevilka)
  const rows=[...section.matchAll(/<tr\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)(?=<tr\b|<\/table>)/gi)].filter(m=>/<td\b/i.test(m[2]))
  require(rows.length===round.tekme.length&&rows.length>0,'unparsed published source row; inventory incomplete')
  for(const [j,row]of rows.entries()){
   const cells=[...row[2].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
   require(cells.length===7&&attributes(row[1]).get('class')?.match(/^(odd|even)$/),'unparsed published source row shape')
   require(round.tekme[j].domaci&&round.tekme[j].gostje,'source fixture team missing')
   const sourceIds=[...row[2].matchAll(/display_game\.php\?game_id=(\d+)/g)].map(m=>Number(m[1]))
   require(new Set(sourceIds).size<=1&&(!sourceIds.length||sourceIds[0]===round.tekme[j].gameId),'source fixture ID ambiguous or unparsed')
   for(const anchor of row[2].matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)){const href=attributes(anchor[1]).get('href');if(href?.includes('display_game.php'))require(new URL(href,naslovRazporeda(code)).href===naslovTekme(razberiKodo(code).domena,round.tekme[j].gameId),'source fixture URL outside exact host scope')}
  }
 }
 return schedule
}
function strictResults(original,code,season){
 const {html,main,heading}=metadata(original,code,'results',season),results=tekmeMreze(html)
 const links=[...main.matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/a>/gi)].filter(m=>(attributes(m[1]).get('href')??'').includes('display_game.php'))
 require(links.length===results.length,'unparsed/duplicate source result report ID')
 for(const row of links){const href=attributes(row[1]).get('href'),url=new URL(href,naslovMreze(code));require(url.origin===new URL(naslovMreze(code)).origin&&/^\/results\/display_game\.php$/.test(url.pathname)&&/^\?game_id=[1-9]\d*$/.test(url.search),'source result ID URL outside exact host scope')}
 const scoreCells=[...main.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].filter(m=>/\d+\s*-\s*\d+/.test(besedilo(m[1])))
 require(scoreCells.length===results.filter(r=>r.izid).length,'unlinked/unparsed published source result')
 return {results,name:besedilo(heading.split(/<br\s*\/?>/i).slice(1).join(' '))}
}
function strictReport(original,code,season,id){
 const {html,main}=metadata(original,code,'report',season),{domena}=razberiKodo(code),{gameId}=razberiZapisnik(id)
 const urls=[...main.matchAll(/<input\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)].map(m=>attributes(m[1])).filter(a=>a.get('name')==='url').map(a=>a.get('value'))
 require(urls.length===1,'source report fixture identity missing')
 const identity=new URL(urls[0],naslovTekme(domena,gameId)),expected=new URL(naslovTekme(domena,gameId))
 require(['http:','https:'].includes(identity.protocol)&&identity.host===expected.host&&identity.pathname===expected.pathname&&identity.search===expected.search&&!identity.username&&!identity.password,'source report fixture identity differs')
 const z=vZapisnik(html,{domena,gameId,url:expected.href});require(z,'source report unavailable')
 if(!z.kontumacija){
  const start=html.indexOf('Συμμετοχές'),end=html.indexOf('</table>',start);require(start>=0&&end>start,'source lineup roles missing')
  const section=html.slice(start,end),links=[...section.matchAll(/<a\b[^>]*href\s*=\s*['"][^'"]*display_player\.php\?player_id=\d+['"][^>]*>/gi)]
  require(links.length===postaviTekme(html).flat().length,'unparsed source lineup player/role')
  const timelineStart=html.indexOf('Διακύμανση Αποτελέσματος'),timelineEnd=html.indexOf('</table>',timelineStart)
  require(timelineStart>=0&&timelineEnd>timelineStart,'source timeline missing')
  const eventRows=[...html.slice(timelineStart,timelineEnd).matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|$)/gi)].filter(m=>/<td\b/i.test(m[1]))
  const events=casovnica(html);require(events.length===eventRows.length&&events.every(e=>e.vrsta&&e.playerId&&e.minuta!==null&&e.ekipaIdx!==null),'unparsed source event/actor/minute')
  // The adapter deduplicates dismissals. Establish a one-to-one binding from
  // EVERY original red/second-yellow row before comparing its playing interval
  // below; contradictory or repeated raw dismissals must never disappear.
  const dismissals=events.filter(e=>e.vrsta==='rdeci'||e.vrsta==='drugiRumeni'),recipients=new Set(),lineups=postaviTekme(html)
  for(const event of dismissals){
   const recipient=`${event.ekipaIdx}|${event.playerId}`
   require(!recipients.has(recipient),'duplicate raw dismissal recipient');recipients.add(recipient)
   require(lineups[event.ekipaIdx].filter(p=>p.playerId===event.playerId).length===1,'raw dismissal recipient missing or ambiguous in source lineup')
   const reds=z.rdeci.filter(red=>red.ekipaIdx===event.ekipaIdx&&red.regSt===sifraIgralca(domena,event.playerId)&&red.minuta===event.minuta)
   require(reds.length===1,'raw dismissal recipient/minute differs from source appearance dismissal')
  }
  require(dismissals.length===z.rdeci.length,'raw dismissal inventory differs from parsed source report')
  const allPlayers=[...main.matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)].filter(m=>(attributes(m[1]).get('href')??'').includes('display_player.php'))
  require(allPlayers.length===links.length+events.length,'unparsed source player outside source role sections')
 }
 return z
}
function fresh(page,now){const age=now.getTime()-Date.parse(page.captured_at);require(page.obtained==='network'&&Number.isFinite(age)&&age>=0&&age<=15*60_000,'schedule/results need fresh original network capture')}
function requirePrices({candidate,snapshot,receipts,expectedSha,now}){
 require(receipts?.expected_sha===expectedSha&&receipts.slug===candidate.slug&&receipts.snapshot_sha256===digest(snapshot),'fresh pricing receipt binding mismatch')
 for(const stage of ['keepers','positions','prices']){const steps=receipts.steps?.filter(s=>s.stage===stage),at=Date.parse(steps?.[0]?.completed_at);require(steps?.length===1&&steps[0].status==='COMPLETED'&&Number.isFinite(at)&&at<=now.getTime()&&now.getTime()-at<=60*60_000,`fresh ${stage} pricing receipt missing`)}
}
function compareReport({z,match,snapshot,fixture,round,domena,league}){
 require(z.sezona===round.season&&z.krog===round.number&&z.datum===fixture.datum&&z.liga===league,'report season/round/date/league binding differs')
 const teams=[z.domaci,z.gostje],ids=[match.home_team_id,match.away_team_id]
 for(let i=0;i<2;i++)require(kljucKlubaGr(imeKluba(domena,teams[i].ime))===kljucKlubaGr(imeKluba(domena,i===0?fixture.domaci:fixture.gostje)),'report team differs from source fixture')
 require(z.rezultat.domaci===match.home_goals&&z.rezultat.gostje===match.away_goals,'report score differs from native score')
 require(!z.nepopoln&&!z.prazen&&!z.kontumacija,'source report incomplete')
 const source=nastopi(z),players=new Map(snapshot.players.map(p=>[p.id,p])),native=match.appearance_rows
 // No generic EPS warning waivers: even warnings added during appearance inference HOLD.
 require(Array.isArray(z.opozorila)&&z.opozorila.length===0,'unexplained source parser warning')
 require(Array.isArray(match.import_warnings)&&same(match.import_warnings,[]),'unexplained native import warnings')
 require(Array.isArray(native)&&native.length===source.length,'individual appearance count differs')
 const observed=new Set()
 for(const n of source){
  require(Number.isSafeInteger(n.regSt)&&n.regSt>0,'source profile identity missing')
  const rows=native.filter(a=>a.team_id===ids[n.ekipaIdx]&&players.get(a.player_id)?.reg_st===n.regSt)
  require(rows.length===1,'source profile does not resolve to exactly one native appearance');const a=rows[0]
  require(!observed.has(a.player_id),'duplicate native source appearance');observed.add(a.player_id)
  const fields={shirt_number:n.st,started:n.zacetnik,is_goalkeeper:n.vratar,minute_on:n.minutaOd,minute_off:n.minutaDo,minutes_played:n.minute,goals:n.goli,own_goals:n.avtogoli,penalties_scored:n.goliIzEnajstmetrovke,penalties_missed:n.zgreseneEnajstmetrovke,yellow_cards:n.rumeni,red_cards:n.rdeci,red_card_minute:null,goals_conceded:n.prejetiGoli,clean_sheet:n.cleanSheet}
  for(const [key,value]of Object.entries(fields))require(a[key]===value,`source individual ${key} differs (profile ${n.regSt})`)
 }
 for(let i=0;i<2;i++)require(teams[i].postava[0]?.vratar===true&&source.filter(n=>n.ekipaIdx===i&&n.zacetnik&&n.vratar).length===1,'first-starter keeper inference differs')
 // Installed EPS importer persists no separate red clock. Its NULL is checked
 // above; independently bind each published dismissal to a playing interval.
 for(const red of z.rdeci){
  const actors=source.filter(n=>n.ekipaIdx===red.ekipaIdx&&n.regSt===red.regSt)
  require(actors.length===1&&Number.isSafeInteger(red.minuta)&&actors[0].rdeci===1&&actors[0].minutaDo===red.minuta&&actors[0].minutaOd<=red.minuta&&(actors[0].zacetnik||actors[0].minute>0),'source red card off-pitch or ambiguous playing interval')
 }
 const sourceGoals=z.goli.map(g=>{require(source.filter(n=>n.ekipaIdx===g.ekipaIdx&&n.regSt===g.regSt).length===1,'source scorer identity missing/ambiguous');return {reg:g.regSt,team:ids[g.ekipaIdx],minute:g.minuta,own:g.avtogol,penalty:g.enajstmetrovka}}).map(digest).sort()
 require(Array.isArray(match.goal_rows),'native individual goals missing')
 const nativeGoals=match.goal_rows.map(g=>({reg:players.get(g.scorer_id)?.reg_st,team:g.team_id,minute:g.minute,own:g.is_own_goal,penalty:g.is_penalty})).map(digest).sort()
 require(same(sourceGoals,nativeGoals),'source individual scorer/team/own-goal side differs')
}
function replayPages({candidate,expectedSha,snapshot,receipts,pages,read,now}){
 candidateScope(candidate);nativeScope(candidate,snapshot);requirePrices({candidate,snapshot,receipts,expectedSha,now})
 const byUrl=new Map(),used=new Set(),seenNative=new Set(),seenReport=new Set();let reportCount=0,fixtureCount=0,undatedCount=0
 const {domena}=razberiKodo(candidate.source_league_code)
 for(const page of pages){require(!byUrl.has(page.url),'duplicate evidence URL');byUrl.set(page.url,page)}
 const load=(url,kind,code,reportId)=>{const p=byUrl.get(url);require(p&&p.kind===kind&&p.code===code&&(kind!=='report'||p.report_id===reportId),'missing exact source evidence page');const bytes=read(p);require(bytes.length>0&&bytes.length<=MAX_BYTES&&bytesHash(bytes)===p.sha256,'retained source bytes digest mismatch');require(['network','cache'].includes(p.obtained)&&Number.isFinite(Date.parse(p.captured_at))&&Date.parse(p.captured_at)<=now.getTime(),'source provenance invalid');used.add(url);if(kind!=='report')fresh(p,now);return bytes.toString('utf8')}
 for(const {code,season}of [{code:candidate.source_league_code,season:snapshot.season},...candidate.archives]){
  const schedule=strictEpsSchedule(load(naslovRazporeda(code),'schedule',code),code,season),matrix=strictResults(load(naslovMreze(code),'results',code),code,season),current=code===candidate.source_league_code
  require(matrix.name===schedule.ime,'schedule/results league title differs')
  const results=new Map(matrix.results.map(r=>[r.gameId,r])),boundResults=new Set()
  // All result IDs are independently bound through the original report header,
  // including played schedule rows with no direct report link.
  const reports=new Map()
  for(const result of matrix.results)if(result.izid&&!result.kontumacija){const id=sifraZapisnika(domena,result.gameId);require(!seenReport.has(id),'archive report ownership collision');seenReport.add(id);reports.set(result.gameId,strictReport(load(naslovTekme(domena,result.gameId),'report',code,id),code,season,id))}
  for(const roundSource of schedule.krogi){
   const nativeRounds=snapshot.rounds.filter(r=>r.season===season&&r.number===roundSource.stevilka);require(nativeRounds.length<=1,'native source round ambiguous');const round=nativeRounds[0]
   const dated=roundSource.tekme.filter(f=>f.datum),roundDate=dated.map(f=>f.datum).sort()[0],roundTime=dated.filter(f=>f.datum===roundDate&&f.ura).map(f=>f.ura).sort()[0]
   if(current&&roundDate){require(round&&round.played_on?.slice(0,10)===roundDate,'native published current round/date missing or differs');const deadline=rokKroga(roundDate,roundTime,Number(snapshot.competition.rok_pomak_ur??6));if(Date.parse(deadline)>now.getTime()||Date.parse(round.deadline_at)>now.getTime())require(Date.parse(deadline)===Date.parse(round.deadline_at),'native future deadline differs from source')}
   for(const fixture of roundSource.tekme){
    fixtureCount++
    const teamId=name=>{const ts=snapshot.teams.filter(t=>kljucKlubaGr(t.name)===kljucKlubaGr(imeKluba(domena,name)));require(ts.length===1,'source club missing or ambiguous in native mapping');return ts[0].id}
    const home=teamId(fixture.domaci),away=teamId(fixture.gostje),native=snapshot.matches.filter(m=>m.round_id===round?.id&&m.home_team_id===home&&m.away_team_id===away)
    if(!fixture.datum){require(!fixture.izid&&!fixture.gameId&&!fixture.kontumacija&&!fixture.neBo&&native.length===0,'undated source fixture has invented native date/result');undatedCount++;continue}
    require(native.length===1,'published source fixture/report missing or archive ownership collision')
    const match=native[0];require(!seenNative.has(match.id),'duplicate source fixture/native mapping');seenNative.add(match.id)
    require(match.played_on?.slice(0,10)===fixture.datum,'source fixture/native played date differs')
    if(!fixture.izid){require(!fixture.neBo&&!fixture.kontumacija&&!match.imported_at&&!match.kontumacija&&match.home_goals===0&&match.away_goals===0&&Array.isArray(match.appearance_rows)&&!match.appearance_rows.length&&Array.isArray(match.goal_rows)&&!match.goal_rows.length,'unpublished source result differs or withdrawn fixture needs review');continue}
    let result=fixture.gameId?results.get(fixture.gameId):null
    if(!result){const matches=[...reports].filter(([,z])=>z.krog===roundSource.stevilka&&kljucKlubaGr(z.domaci.ime)===kljucKlubaGr(fixture.domaci)&&kljucKlubaGr(z.gostje.ime)===kljucKlubaGr(fixture.gostje));require(matches.length===1,'source fixture report ID missing or ambiguous');result=results.get(matches[0][0])}
    require(result&&!boundResults.has(result.gameId)&&same(result.izid,fixture.izid)&&result.kontumacija===fixture.kontumacija,'schedule/results score/identity differs');boundResults.add(result.gameId)
    require(match.home_goals===fixture.izid.domaci&&match.away_goals===fixture.izid.gostje,'source fixture/native score differs')
    if(fixture.kontumacija){require(match.kontumacija===true&&!match.appearance_rows?.length&&!match.goal_rows?.length&&Array.isArray(match.import_warnings)&&!match.import_warnings.length,'source forfeit/native facts differ');continue}
    const id=sifraZapisnika(domena,result.gameId);require(match.zapisnik_id===id&&match.imported_at&&!match.kontumacija,'published report ID differs or not fully imported')
    compareReport({z:reports.get(result.gameId),match,snapshot,fixture,round,domena,league:schedule.ime});reportCount++
   }
  }
  require(matrix.results.every(r=>r.izid?boundResults.has(r.gameId):!r.kontumacija&&schedule.krogi.some(k=>k.tekme.some(f=>f.gameId===r.gameId&&!f.izid))),'source result report absent from complete schedule inventory')
 }
 require(snapshot.matches.every(m=>seenNative.has(m.id)),'native fixture/report absent from complete published source inventory')
 require(used.size===pages.length,'unbound extra source evidence pages');return {report_count:reportCount,fixture_count:fixtureCount,undated_fixture_count:undatedCount}
}
export async function produceEpsProof({candidate,expectedSha,snapshot,receipts,evidenceRoot,loadPage,now}){
 const clock=now?()=>now:()=>new Date();candidateScope(candidate);nativeScope(candidate,snapshot);require(/^[a-f0-9]{40}$/.test(expectedSha),'exact main SHA missing');requirePrices({candidate,snapshot,receipts,expectedSha,now:clock()})
 require(!existsSync(evidenceRoot),'source proof evidence directory already exists; automatic replay forbidden');mkdirSync(evidenceRoot,{recursive:true})
 const pages=[],seen=new Set(),{domena}=razberiKodo(candidate.source_league_code)
 const capture=async(url,kind,code,reportId)=>{
  require(!seen.has(url),'duplicate source report ownership/URL')
  const result=await loadPage(url,{kind,code,round:null,...(reportId?{report_id:reportId}:{})}),bytes=Buffer.from(result.bytes),sha256=bytesHash(bytes),file=sha256+'.html'
  require(bytes.length>0&&bytes.length<=MAX_BYTES&&Number.isFinite(Date.parse(result.captured_at))&&Date.parse(result.captured_at)<=clock().getTime(),'source bytes/capture timestamp invalid')
  const entry={url,kind,code,round:null,...(reportId?{report_id:reportId}:{}),sha256,file,captured_at:result.captured_at,obtained:result.obtained,capture_basis:result.capture_basis??(result.obtained==='cache'?'legacy-cache-filesystem-mtime':'network-response')}
  if(kind!=='report')fresh(entry,clock());writeFileSync(join(evidenceRoot,file),bytes,{mode:0o600});const at=new Date(result.captured_at);utimesSync(join(evidenceRoot,file),at,at);pages.push(entry);seen.add(url);return bytes.toString('utf8')
 }
 for(const {code,season}of [{code:candidate.source_league_code,season:snapshot.season},...candidate.archives]){
  const schedule=strictEpsSchedule(await capture(naslovRazporeda(code),'schedule',code),code,season),matrix=strictResults(await capture(naslovMreze(code),'results',code),code,season)
  require(matrix.name===schedule.ime,'schedule/results league title differs')
  const ids=new Set(matrix.results.filter(r=>r.izid&&!r.kontumacija).map(r=>r.gameId))
  for(const round of schedule.krogi)for(const f of round.tekme)if(f.izid&&!f.kontumacija&&f.gameId)ids.add(f.gameId)
  for(const gameId of ids)await capture(naslovTekme(domena,gameId),'report',code,sifraZapisnika(domena,gameId))
 }
 const generated=clock(),summary=replayPages({candidate,expectedSha,snapshot,receipts,pages,read:p=>readFileSync(join(evidenceRoot,p.file)),now:generated})
 const proof={contract_id:CONTRACT,candidate,expected_sha:expectedSha,snapshot_sha256:digest(snapshot),captured_at:generated.toISOString(),generated_at:generated.toISOString(),keeper_basis:KEEPER,schedule_complete:true,archives:candidate.archives,archive_collisions:[],original_bytes_sha256:digest(pages),evidence_root:realpathSync(evidenceRoot),pages,receipts,...summary}
 writeFileSync(join(evidenceRoot,'manifest.json'),JSON.stringify(proof,null,2)+'\n',{mode:0o600});return proof
}
export function replayEpsProof({candidate,expectedSha,snapshot,proof,now=new Date()}){
 candidateScope(candidate);nativeScope(candidate,snapshot)
 require(proof?.contract_id===CONTRACT&&proof.keeper_basis===KEEPER&&proof.expected_sha===expectedSha&&same(proof.candidate,candidate)&&proof.snapshot_sha256===digest(snapshot)&&proof.schedule_complete===true&&same(proof.archives,candidate.archives)&&same(proof.archive_collisions,[])&&Array.isArray(proof.pages)&&proof.original_bytes_sha256===digest(proof.pages),'source proof tuple/commit/snapshot/manifest binding differs')
 const age=now.getTime()-Date.parse(proof.generated_at);require(Number.isFinite(age)&&age>=0&&age<=15*60_000,'source proof generation stale')
 const result=replayPages({candidate,expectedSha,snapshot,receipts:proof.receipts,pages:proof.pages,read:p=>{require(/^[a-f0-9]{64}\.html$/.test(p.file)&&p.file===p.sha256+'.html','source evidence file binding invalid');return readFileSync(join(proof.evidence_root,p.file))},now})
 require(Object.keys(result).every(k=>result[k]===proof[k]),'replayed source inventory count differs');return true
}
export function createEpsContract({host,runCommand,budgetPath,maxRequests,outputDirectory}){
 require(EPS_BATCH_MAPPINGS.some(c=>c.host===host),'unknown fixed EPS contract host');const roots=new Map()
 return {id:CONTRACT,source:'eps',host,capture:async({candidate,expectedSha,snapshot,audit,receipts})=>{
  candidateScope(candidate);require(candidate.host===host,'candidate host differs from fixed EPS contract');require(audit.snapshot_sha256===digest(snapshot),'producer native audit digest differs')
  if(!budgetPath||!outputDirectory)throw Error('Budgeted fixed source-proof child configuration missing.')
  const directory=resolve(outputDirectory,candidate.slug);require(!existsSync(directory),'source proof checkpoint already exists; review before another run');mkdirSync(directory,{recursive:true})
  const input=join(directory,'input.json'),output=join(directory,'proof.json'),evidence=join(directory,'evidence')
  writeFileSync(input,JSON.stringify({candidate,expected_sha:expectedSha,snapshot,receipts})+'\n',{mode:0o600})
  const status=await runCommand('scripts/eps-provider-proof.mjs',['--input',input,'--output',output,'--evidence',evidence],{budgetPath,maxRequests,logPath:join(directory,'producer.log')})
  if(status.sourceFailure||[4,5].includes(status.code))stop('EPS source proof stopped affected provider host.')
  if(status.code===3){const refused=JSON.parse(readFileSync(output,'utf8'));hold(refused.reason??'source producer data refusal')}
  if(status.code!==0)throw Error('EPS source proof producer failed technically; inspect retained logs.')
  const proof=JSON.parse(readFileSync(output,'utf8'));roots.set(candidate.slug,realpathSync(evidence));require(proof.evidence_root===roots.get(candidate.slug),'foreign source proof root');replayEpsProof({candidate,expectedSha,snapshot,proof,now:new Date(proof.generated_at)});return proof
 },verify:options=>{require(options.candidate.host===host&&roots.get(options.candidate.slug)===options.proof?.evidence_root,'source proof did not come from exact fixed producer invocation');return replayEpsProof(options)}}
}
async function boundedBytes(response){
 const reader=response.body?.getReader();if(!reader)stop('EPS source response body missing.')
 const chunks=[];let length=0
 for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();stop('EPS source response body exceeds bound.')}chunks.push(Buffer.from(value))}return Buffer.concat(chunks)
}
export async function loadEpsPage(url,{kind,code,report_id},{cacheDirectory=resolve('scripts/.predpomnilnik/eps'),request=globalThis.fetch,now=new Date()}={}){
 if(!process.env.SLFF_EPS_BUDGET_PATH)throw Error('Source proof requires installed shared EPS source budget preload.')
 const {domena}=razberiKodo(code);require(['schedule','results','report'].includes(kind),'unknown source page kind')
 let gameId;if(kind==='report'){const r=razberiZapisnik(report_id);require(r.domena===domena,'source report host differs');gameId=r.gameId}
 const expected=kind==='schedule'?naslovRazporeda(code):kind==='results'?naslovMreze(code):naslovTekme(domena,gameId);require(url===expected,'source URL outside exact EPS scope')
 const name=kind==='schedule'?`razpored-${sifra(code)}.html`:kind==='results'?`mreza-${sifra(code)}.html`:`${sifra(domena)}-g${gameId}.html`,path=join(cacheDirectory,name)
 if(kind==='report'&&existsSync(path)){
  const bytes=readFileSync(path),html=bytes.toString('utf8'),z=eps.zaPredpomnilnik(html)?vZapisnik(html,{domena,gameId}):null,age=z?.datum?(now.getTime()-Date.parse(z.datum))/86400000:0
  if(z&&!z.nepopoln&&!z.kontumacija&&!z.prazen&&age>7&&bytes.length<=MAX_BYTES)return {bytes,captured_at:statSync(path).mtime.toISOString(),obtained:'cache',capture_basis:'legacy-cache-filesystem-mtime'}
 }
 let response,bytes
 try{response=await request(url,{headers:eps.glave,redirect:'manual',signal:AbortSignal.timeout(30000)});bytes=await boundedBytes(response)}catch(error){if(error.sourceStop)throw error;stop(`EPS source transport stopped: ${error.message}`)}
 const html=bytes.toString('utf8')
 if([401,403,429].includes(response.status)||jeIzziv(html)||!eps.zaPredpomnilnik(html)||(!response.ok&&!(response.status===500&&kind==='report'&&jeOdrezanaTekma(html))))stop(`EPS source response refused or invalid (HTTP ${response.status}).`)
 const captured_at=new Date().toISOString();mkdirSync(cacheDirectory,{recursive:true});writeFileSync(path,bytes);return {bytes,captured_at,obtained:'network',capture_basis:'network-response'}
}
async function main(){
 const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){require(['--input','--output','--evidence'].includes(args[i])&&!options[args[i]]&&args[i+1],'invalid fixed proof child option');options[args[i]]=args[i+1]}
 require(options['--input']&&options['--output']&&options['--evidence'],'fixed proof child paths missing');const input=JSON.parse(readFileSync(options['--input'],'utf8'))
 require(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REF==='refs/heads/main'&&process.env.GITHUB_SHA===input.expected_sha&&process.env.GITHUB_RUN_ATTEMPT==='1'&&execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===input.expected_sha,'proof child exact main identity differs')
 try{const proof=await produceEpsProof({...input,expectedSha:input.expected_sha,evidenceRoot:options['--evidence'],loadPage:loadEpsPage});writeFileSync(options['--output'],JSON.stringify(proof,null,2)+'\n',{mode:0o600})}
 catch(error){writeFileSync(options['--output'],JSON.stringify({status:error.dataHold?'HOLD':'STOPPED',reason:error.message})+'\n',{mode:0o600});process.exitCode=error.dataHold?3:error.zavrnitev||error.sourceStop?4:1}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=error.dataHold?3:error.zavrnitev||error.sourceStop?4:1})
