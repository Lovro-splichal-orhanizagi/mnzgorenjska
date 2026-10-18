// Strict current-only proof adapter. All source identities and individual facts
// come from the existing FCF validators/parser; this module performs no IO.
import {createHash} from 'node:crypto'
import {getHistoricalStatisticsPolicy} from './lib/historical-statistics-policy.mjs'
import {fcfFinalAuditScope} from './fcf-final-audit.mjs'
import {validateFcfSingleReportSource,vZapisnik,nastopi} from './viri/fcf.mjs'
const fail=message=>{throw Error(`FCF_SOURCE_PROOF: ${message}`)}
export function parseFcfCurrentAuditDocument({id,competitionSlug,expectedSourceRound,html,receipt,now=Date.now()}){
 const scope=fcfFinalAuditScope(competitionSlug),policy=getHistoricalStatisticsPolicy(competitionSlug)
 if(!scope||policy?.provider!=='fcf'||typeof id!=='string'||!/^[1-9]\d*$/.test(id)||policy.entries.some(e=>e.sourceMatchId===id))fail('exact normal current report required; historical markers never enter individual parsing')
 if(typeof html!=='string'||html.charCodeAt(0)===0xfeff||!receipt||receipt.id!==id||receipt.competitionSlug!==competitionSlug||receipt.sourceUrl!==`https://www.fcf.cat/ca/competicio/acta/${id}`||receipt.bytes!==Buffer.byteLength(html)||receipt.rawSha256!==createHash('sha256').update(html).digest('hex'))fail('actual source bytes/receipt binding differs')
 if(!Number.isInteger(expectedSourceRound)||expectedSourceRound<1||expectedSourceRound>30)fail('verified actual calendar round required')
 const c={slug:competitionSlug,source:'fcf',source_league_code:scope.code,sezona_koledarska:false}
 const header=validateFcfSingleReportSource(html,scope.code,{id:`es${id}`,tekmovanje:c,sezona:'2026/27',danes:now})
 if(header.krog!==expectedSourceRound||!/^202[67]-\d{2}-\d{2}$/.test(header.datum??'')||!Number.isFinite(Date.parse(header.datum))||header.datum<'2026-07-01'||header.datum>='2027-07-01')fail('actual source round/date changed or is outside current season')
 if(!header.izid){
  if(header.zaprt)fail('closed source lacks an official result')
  if(expectedSourceRound===6&&(!header.ura||Date.parse(`${header.datum}T00:00:00Z`)<=now))fail('R6 requires an explicit future official kickoff')
  return{status:'pending',header,report:null,appearances:null}
 }
 if(expectedSourceRound>=6||!header.zaprt||Date.parse(`${header.datum}T00:00:00Z`)>now)fail('new result is not a completed reviewed prelaunch round')
 const report=vZapisnik(html,{id:`es${id}`,url:receipt.sourceUrl})
 if(!report||report.prazen||report.nepopoln||report.sezona!=='2026/27'||!Array.isArray(report.opozorila))fail('normal report has incomplete individual statistics')
 const appearances=nastopi(report),players=[]
 for(const side of[report.domaci,report.gostje]){
  if(side.postava.length!==11||side.postava.filter(p=>p.vratar===true).length!==1)fail('explicit eleven starters and exactly one official goalkeeper per side required')
  players.push(...side.postava,...side.rezerve)
 }
 if(players.some(p=>!Number.isSafeInteger(p.regSt)||p.regSt<1||typeof p.ime!=='string'||!p.ime.trim())||new Set(players.map(p=>p.regSt)).size!==players.length)fail('ambiguous full source player identities')
 if(report.opozorila.length||report.goli.length!==header.izid.domaci+header.izid.gostje)fail('unresolved normal source warning/goal mismatch; no new exception')
 if(appearances.some(a=>!Number.isInteger(a.minutaOd)||!Number.isInteger(a.minutaDo)||!Number.isInteger(a.minute)||a.minutaOd<0||a.minutaDo>90||a.minutaOd>a.minutaDo||a.minute!==a.minutaDo-a.minutaOd)||report.goli.some(g=>!Number.isInteger(g.minuta)||g.minuta<0||g.minuta>90||!appearances.some(a=>a.regSt===g.regSt&&a.ekipaIdx===g.ekipaIdx&&g.minuta>=a.minutaOd&&g.minuta<=a.minutaDo)))fail('normal minute/event canonical proof differs')
 // Official role flags must cover every regulation minute on each side.
 // Shared substitution endpoints are contiguous; a bench player/zero-minute
 // appearance supplies no coverage and an outfield role is never inferred.
 for(const side of[0,1]){
  const intervals=appearances.filter(a=>a.ekipaIdx===side&&a.vratar===true&&a.minute>0).sort((a,b)=>a.minutaOd-b.minutaOd||a.minutaDo-b.minutaDo)
  let until=0
  for(const a of intervals){
   if(a.minutaOd!==until)fail('continuous exactly one explicit goalkeeper per side over minutes0–90 required')
   until=a.minutaDo
  }
  if(until!==90)fail('continuous exactly one explicit goalkeeper per side over minutes0–90 required')
 }
 return{status:'complete',header,report,appearances}
}
