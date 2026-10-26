// Saved public fussball.de report validation only. This is deliberately NOT a
// registered importer: public card events omit player IDs and bounded season
// traversal has not been validated. No network requests, caching or DB writes.
import { createHash } from 'node:crypto'
import { preslikavaPisave, dekodirajIme } from './fussball-pisava.mjs'
import {fussballProfileIdentity} from '../lib/fussball-identity.mjs'
export const NEPOPOLN = 'zapisnik nepopoln'
const fail = s => { throw new Error(`fussball: ${s}`) }
const entities = s => String(s).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&(?:rsquo|apos|#039);/g,"'").replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
const text = s => entities(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim()
export const jeIzziv = s => /<title>\s*(?:Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(String(s))
const classTokens = s => new Set((attr(s,'class')??'').split(/\s+/).filter(Boolean))
const attr = (s,k) => s.match(new RegExp(`\\b${k}="([^"]*)"`))?.[1]
export function parseFussballEventClock(source) {
 const raw=String(source??'')
 const marker="(?:&rsquo;|&apos;|&#039;|')"
 const nested=new RegExp(`^\\s*(\\d{1,2})\\s*${marker}\\s*<div>\\s*\\+(\\d{1,2})\\s*<\\/div>\\s*$`).exec(raw)
 if(nested){const base=+nested[1],added=+nested[2];return (base===45||base===90)&&added>=1&&added<=30?{base,added}:null}
 const flat=new RegExp(`^\\s*(\\d{1,2})(?:\\s*\\+\\s*(\\d{1,2}))?\\s*${marker}\\s*$`).exec(raw)
 if(!flat)return null
 const base=+flat[1],added=+(flat[2]??0)
 return base<=90&&added<=30?{base,added}:null
}
function element(s,cls) {
 const start = new RegExp(`<([a-z]+)\\b[^>]*class="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>`,'i').exec(s)
 if(!start)fail(`manjka element ${cls}`)
 let depth=1;const re=new RegExp(`<\\/?${start[1]}\\b[^>]*>`,'gi');re.lastIndex=start.index+start[0].length
 let m;while((m=re.exec(s))){depth+=m[0].startsWith('</')?-1:1;if(depth===0)return s.slice(start.index,re.lastIndex)}
 fail(`odrezan element ${cls}`)
}
function decoder(fonts) {
 const cache=new Map()
 return fragment => {
  const stack=[];let font=null,out=''
  for(const token of fragment.match(/<[^>]*>|[^<]+/g)??[]){
   if(token.startsWith('</')){font=stack.pop()??null;continue}
   if(token.startsWith('<')){if(!/^<(?:br|img|input|hr)\b/i.test(token)){stack.push(font);font=attr(token,'data-obfuscation')??font}continue}
   const raw=entities(token)
   if(!font){if(/[\uE000-\uF8FF]/u.test(raw))fail('glif brez pisave');out+=raw;continue}
   if(!cache.has(font)){
    const f=fonts?.[font]
    if(!f?.bytes || !/^[a-f0-9]{64}$/.test(f.sha256??''))fail(`manjka vezana pisava ${font}`)
    if(createHash('sha256').update(f.bytes).digest('hex')!==f.sha256)fail(`hash pisave ${font} se ne ujema`)
    cache.set(font,preslikavaPisave(f.bytes))
   }
   out+=dekodirajIme(raw,cache.get(font))
  }
  return out.replace(/\s+/g,' ').trim()
 }
}
const identity = s => {
 const sourceId=fussballProfileIdentity(attr(s,'href'))
 if(!sourceId)fail('manjka stalna identiteta igralca')
 return sourceId
}
export function razberiPostavo(html,{fonts}={}) {
 if(jeIzziv(html))fail('izziv v postavi')
 if(!/^<div id="match_course_body">/.test(html.trim()) || (html.match(/<div\b/g)??[]).length!==(html.match(/<\/div>/g)??[]).length)fail('odrezana postava')
 const decode=decoder(fonts),head=element(html,'head')
 const headers=[...head.matchAll(/<div class="club-name">([\s\S]*?)<\/div>/g)]
 if(headers.length!==2||(html.match(/\bclass="[^"]*\bclub-name\b[^"]*"/g)??[]).length!==2)fail('manjkajo ali niso enolična imena ekip')
 const names=headers.map(([,body])=>{
  const child=body.match(/^\s*(?:<a\b[^>]*>([^<]+)<\/a>|<span>([^<]+)<\/span>)\s*$/)
  if(!child)fail('nepodprta oblika imena ekipe')
  const name=text(child[1]??child[2]);if(!name)fail('manjka ime ekipe')
  return name
 })
 const bench=html.indexOf('<div class="substitutes club-wrapper">')
 if(bench<0)fail('manjka klop postave')
 const teams=names.map(ime=>({ime,postava:[],rezerve:[]})),seen=new Set()
 for(const m of html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)){
  const s=m[0],href=attr(s,'href')??'',classes=classTokens(s)
  if(!href.startsWith('https://www.fussball.de/spielerprofil/')){if(classes.has('player-wrapper'))fail('igralec brez profilne povezave');continue}
  if(!classes.has('player-wrapper') || classes.has('home')===classes.has('away'))fail('nepodprta profilna povezava igralca')
  const virId=identity(s),side=classes.has('home')?0:1
  if(seen.has(virId))fail('podvojen igralec v postavi');seen.add(virId)
  const fields=[...element(s,'player-name').matchAll(/<span\b[^>]*>[\s\S]*?<\/span>/g)].map(n=>n[0])
  if(fields.length!==2 || !classTokens(fields[0]).has('firstname') || !classTokens(fields[1]).has('lastname') || fields.some(f=>!attr(f,'data-obfuscation') || !decode(f)))fail('nepopolno ime igralca')
  const ime=fields.map(decode).join(' ')
  const number=s.match(/class="player-number">(\d+)<\/span>/)?.[1]
  if(!ime || !number || /[\uE000-\uF8FF]/u.test(ime))fail('neveljaven igralec postave')
  teams[side][m.index<bench?'postava':'rezerve'].push({virId,ime,st:+number,vratar:/class="c">T<\/span>/.test(s)})
 }
 for(const e of teams)if(e.postava.length!==11 || e.postava.filter(p=>p.vratar).length!==1)fail('nepopolna začetna postava ali vratar')
 return teams
}
function score(s,decode,allowUnplayed=false){
 if(allowUnplayed&&/^<td class="column-score">\s*<a href="https:\/\/www\.fussball\.de\/spiel\/(?:[a-z0-9-]+\/)?-\/spiel\/[A-Z0-9]{32}"><span class="info-text">Ausfall<\/span><\/a>\s*<\/td>$/.test(s))return null
 const values=['score-left','score-right'].map(c=>{const field=element(s,c);if(!/data-obfuscation=/.test(field))fail('izid brez vezane pisave');return decode(field)})
 if(allowUnplayed && values.every(v=>v==='-'))return null
 if(values.some(v=>!/^\d{1,2}$/.test(v)))fail('neveljaven izid')
 return {domaci:+values[0],gostje:+values[1]}
}
function liveScoreChildren(s){
 const html=element(s,'even'),start=html.indexOf('>')+1,end=html.lastIndexOf('</div>'),body=html.slice(start,end)
 const children=[...body.matchAll(/<span\b[^>]*>[^<]*<\/span>/g)].map(m=>m[0])
 if(children.join('')!==body)fail('nepodprta struktura izida dogodka')
 return children
}
export function razberiZapisnik(html,lineup,{fonts,id,lineupId}={}) {
 if(jeIzziv(html))fail('izziv v zapisniku')
 if(!/<\/body>\s*<\/html>\s*$/i.test(html) || !/<h3>Abpfiff<\/h3>/.test(html))fail('odrezan zapisnik: manjka Abpfiff')
 const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]??''
 const canonical=[...head.matchAll(/<link\b[^>]*>/g)].map(m=>m[0]).filter(t=>attr(t,'rel')==='canonical')
 const og=[...head.matchAll(/<meta\b[^>]*>/g)].map(m=>m[0]).filter(t=>attr(t,'property')==='og:url')
 const ownId=url=>url?.match(/^https:\/\/www\.fussball\.de\/spiel\/(?:[a-z0-9-]+\/)?-\/spiel\/([A-Z0-9]{32})$/)?.[1]
 if(!/^[A-Z0-9]{32}$/.test(id??'') || canonical.length!==1 || og.length!==1 || ownId(attr(canonical[0],'href'))!==id || ownId(attr(og[0],'content'))!==id)fail('neujemanje šifre zapisnika in kanonične identitete')
 if(lineupId!=null && lineupId!==id)fail('neujemanje identitete postave')
 const fragmentIds=[...lineup.matchAll(/\/spiel\/([A-Z0-9]{32})(?:[\/"#]|$)/g)].map(m=>m[1])
 if(fragmentIds.some(x=>x!==id))fail('neujemanje identitete postave')
 const decode=decoder(fonts),teams=razberiPostavo(lineup,{fonts}),title=entities(html.match(/property="og:title" content="([^"]+)"/)?.[1]??'')
 if(!title.startsWith(`${teams[0].ime} - ${teams[1].ime} Ergebnis:`))fail('neujemanje ekip zapisnika in postave')
 const stage=element(html.replace(/<!--[\s\S]*?-->/g,''),'match-stage')
 const ticker=attr(stage,'data-live-ticker-load')
 if(ticker && !ticker.includes(`/spiel/${id}/ticker-id/`))fail('neujemanje šifre glave zapisnika')
 if((stage.match(/class="end-result"/g)??[]).length!==1)fail('neenoličen izid v glavi tekme')
 const date=title.match(/ - (\d{2})\.(\d{2})\.(\d{4})$/),datefield=decode(element(element(stage,'date-wrapper'),'date'))
 const time=datefield.match(/(\d{2}):(\d{2})/)
 const metadata=element(stage,'stage-meta-right')
 const roundRecords=[...metadata.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/g)].map(m=>m[0]).filter(row=>classTokens(row).has('row')).map(row=>[...row.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g)].map(m=>m[1])).filter(spans=>text(spans[0]??'')==='Spiel:')
 if(roundRecords.length!==1 || roundRecords[0].length!==2)fail('krog zahteva enoličen zapis Spiel')
 const round=text(roundRecords[0][1]).match(/^\d+ \/ ([1-9]\d?)\. Spieltag$/)
 if(!date || !time || !round)fail('manjka datum, ura ali krog')
 const datum=`${date[3]}-${date[2]}-${date[1]}`
 if(!datefield.includes(`${date[1]}.${date[2]}.${date[3]}`) || new Date(`${datum}T00:00:00Z`).toISOString().slice(0,10)!==datum || +time[1]>23 || +time[2]>59)fail('neujemanje datuma ali ure')
 const rezultat=score(element(stage,'end-result'),decode),course=element(html,'match-course')
 const players=new Map(teams.flatMap((t,side)=>[...t.postava,...t.rezerve].map(p=>[p.virId,{...p,side}])))
 const active=new Set(teams.flatMap(t=>t.postava.map(p=>p.virId)))
 let previous=0,current={domaci:0,gostje:0}
 const goli=[],menjave=[],nepripisaniKartoni=[],rumeni=[],rdeci=[]
 const starts=[...course.matchAll(/<div class="row-event event-(left|right)( own-goal)?">/g)]
 const structuralEvents=(course.match(/class="column-event"/g)??[]).length
 const eventSignals=(course.match(/class="even"|\bicon-card(?=[\s"])|\bicon-substitute\b/g)??[]).length
 if(starts.length!==structuralEvents || starts.length!==eventSignals || starts.length!==(course.match(/class="row-event\b/g)??[]).length)fail('nepodprt ali manjkajoč dogodek')
 for(let i=0;i<starts.length;i++){
  const s=course.slice(starts[i].index,starts[i+1]?.index??course.length),side=starts[i][1]==='left'?0:1
  const clockHtml=s.match(/<div class="valign-inner">((?:[^<]|<div>\s*\+\d{1,2}\s*<\/div>)*)<\/div>/)?.[1]??''
  const minute=parseFussballEventClock(clockHtml)
  if(!minute)fail('nepodprta minuta dogodka')
  const order=minute.base*100+minute.added,minuta=Math.min(90,minute.base)
  if(order<previous)fail('neveljavno časovno zaporedje dogodkov');previous=order
  const refs=[...s.matchAll(/<a\b[^>]*href="https:\/\/www\.fussball\.de\/spielerprofil\/[^"]*"[^>]*>/g)].map(m=>identity(m[0]))
  const player=ref=>{const p=players.get(ref);if(!p)fail('dogodek vsebuje neznanega igralca');return p}
  const explicitOwnGoal=starts[i][2]!==undefined
  if(explicitOwnGoal&&!/class="even"/.test(s))fail('označevalec avtogola brez gola')
  if(/class="even"/.test(s)){
   if(refs.length!==1)fail('gol brez enoličnega igralca')
   const p=player(refs[0]),next=score(s,decode),delta=[next.domaci-current.domaci,next.gostje-current.gostje]
   if(delta[0]+delta[1]!==1 || delta.some(d=>d<0||d>1) || delta[side]!==1)fail('neveljavno zaporedje izidov')
   if(!active.has(p.virId))fail('gol neaktivnega igralca')
   const scoreChildren=liveScoreChildren(s),marker=scoreChildren[3]
   if(scoreChildren.length!==3&&scoreChildren.length!==4)fail('nepodprt dodatek gola')
   if(marker!==undefined&&!['<span class="event-info">Strafstoßtor</span>','<span class="event-info">Eigentor</span>'].includes(marker))fail('nepodprt dodatek gola')
   const ownGoalMarker=marker==='<span class="event-info">Eigentor</span>'
   const enajstmetrovka=marker==='<span class="event-info">Strafstoßtor</span>',avtogol=p.side!==side
   if(explicitOwnGoal!==ownGoalMarker||(explicitOwnGoal&&!avtogol))fail('protisloven označevalec avtogola in strani igralca')
   if(enajstmetrovka&&avtogol)fail('protisloven označevalec enajstmetrovke in avtogola')
   goli.push({virId:p.virId,ime:p.ime,minuta,ekipa:teams[p.side].ime,avtogol,enajstmetrovka,rezultat:next});current=next
  }else if(/icon-substitute/.test(s)){
   if(refs.length!==2)fail('menjava brez obeh igralcev')
   const noter=player(refs[0]),ven=player(refs[1])
   if(noter.side!==side || ven.side!==side || active.has(noter.virId) || !active.has(ven.virId))fail('neveljavno časovno zaporedje menjav')
   active.delete(ven.virId);active.add(noter.virId)
   menjave.push({minuta,ekipa:teams[side].ime,noter,ven})
  }else if(/icon-card/.test(s)){
   const drugiRumeni=/class="icon-stack"/.test(s),red=/class="icon-card red-card"/.test(s),yellow=/class="icon-card yellow-card"/.test(s)
   if(!red&&!yellow)fail('nepodprt karton')
   if(!refs.length){
    if(red)throw Object.assign(new Error('fussball: vir ne objavi prejemnika rdečega kartona'),{code:'FUSSBALL_REPORT_UNSUPPORTED',reason_code:'FUSSBALL_CARD_RECIPIENT_MISSING',dataHold:true})
    nepripisaniKartoni.push({minuta,ekipa:teams[side].ime,vrsta:'rumeni'})
   }else{
    if(refs.length!==1)fail('karton brez enoličnega igralca')
    const p=player(refs[0]);if(p.side!==side)fail('karton napačne zgodovinske strani')
    const link=s.match(/<a\b[^>]*href="https:\/\/www\.fussball\.de\/spielerprofil\/[^"]*"[^>]*>[\s\S]*?<\/a>/)?.[0]
    const name=link?decode(link):null
    if(name!==p.ime&&name!==`${p.ime} (${p.st})`)fail('neujemanje imena in profilne identitete kartona')
    const event={virId:p.virId,ime:p.ime,minuta,ekipa:teams[side].ime,vrsta:red?'rdeci':'rumeni',...(red?{drugiRumeni}:{})}
    ;(red?rdeci:rumeni).push(event)
    if(red)active.delete(p.virId)
   }
  }else fail('nepodprt dogodek v zapisniku')
 }
 if(current.domaci!==rezultat.domaci || current.gostje!==rezultat.gostje)fail('končni izid se ne ujema z dogodki')
 // Saved-page support does not establish a complete season source, even when
 // an individual page happens to contain no anonymous cards.
 return {zapisnikId:`de-fussball-${id}`,datum,ura:time[0],krog:+round[1],domaci:teams[0],gostje:teams[1],rezultat,goli,menjave,...(rumeni.length||rdeci.length?{rumeni,rdeci}:{}),nepripisaniKartoni,nepopoln:true,opozorila:[`${NEPOPOLN}: ${nepripisaniKartoni.length} nepripisanih kartonov; nastopi zadržani; sezonski uvoz ni podprt`]}
}
export function nastopi(){return []}

/** A single real league-round template. Extra rescheduled rows deliberately
 * have no round assignment; only their own match report can establish it. */
export function razberiKrog(html,{fonts,staffel}={}) {
 if(jeIzziv(html))fail('izziv v krogu')
 if(!/<\/body>\s*<\/html>\s*$/i.test(html))fail('odrezana stran kroga')
 if(!/^[A-Z0-9]{32}-G$/.test(staffel??''))fail('neveljavna šifra staffel')
 const decode=decoder(fonts),selection=html.match(/<select\b[^>]*name="spieltag"[^>]*>([\s\S]*?)<\/select>/)?.[1]
 if(!selection)fail('manjka omejen seznam krogov')
 const krogi=[...selection.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map(m=>{
  const url=attr(m[1],'data-href'),u=url?.match(/^https:\/\/www\.fussball\.de\/spieltag\/(?:[a-z0-9-]+\/)?-\/spieltag\/(\d+)\/staffel\/([A-Z0-9]{32}-G)$/)
  if(!u || u[2]!==staffel || text(m[2])!==`${+u[1]}. Spieltag`)fail('neujemanje povezave kroga ali lige')
  return {krog:+u[1],url,izbran:/\bselected="selected"/.test(m[1])}
 })
 if(!krogi.length || krogi.length>80 || krogi.some((r,i)=>r.krog!==i+1) || krogi.filter(r=>r.izbran).length!==1)fail('nepopoln ali neomejen seznam krogov')
 const seasonSelect=html.match(/<select\b[^>]*name="saison"[^>]*>([\s\S]*?)<\/select>/)?.[1]
 const selectedSeason=[...(seasonSelect??'').matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].filter(m=>/\bselected="selected"/.test(m[1]))
 if(selectedSeason.length!==1 || attr(selectedSeason[0][1],'data-href')!==`https://www.fussball.de/spieltag/-/staffel/${staffel}`)fail('neujemanje sezone in lige')
 const season=text(selectedSeason[0][2]).match(/^Saison (\d{2})\/(\d{2})$/)
 if(!season || +season[2]!==(+season[1]+1)%100)fail('nepodprta sezona')
 const sezona=`20${season[1]}/${season[2]}`
 const krog=krogi.find(r=>r.izbran).krog,table=element(html,'fixtures-matches-table')
 const tbody=table.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1]
 if(!tbody)fail('manjka tabela tekem')
 const tekme=[],prestavljene=[];let datum=null,extra=false
 for(const m of tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)){
  const row=m[1]
  if(/Verlegte Spiele außerhalb des Spieltages/.test(row)){extra=true;datum=null;continue}
  if(!/class="column-(?:club|score|date)\b|href="https:\/\/www\.fussball\.de\/(?:spiel|mannschaft)\//.test(row)){
   const h=decode(row).match(/(\d{2})\.(\d{2})\.(\d{4})/)
   if(h)datum=`${h[3]}-${h[2]}-${h[1]}`
   continue
  }
  if((row.match(/<td\b[^>]*class="column-club(?: |")/g)??[]).length!==2)fail('neveljavna tekma kroga: manjka klub')
  const names=[...row.matchAll(/<div class="club-name">([\s\S]*?)<\/div>/g)].map(n=>text(n[1]).replace(/\u200B/g,''))
  const ids=[...row.matchAll(/href="(https:\/\/www\.fussball\.de\/spiel\/(?:[a-z0-9-]+\/)?-\/spiel\/([A-Z0-9]{32}))(?:#![^\"]*)?"/g)]
  // The official table includes a club's bye as two club cells, but no fixture.
  // Empty or date-only labels are observed; a kickoff still makes this invalid.
  if(/<td class="column-club no-border">\s*<span class="info-text">spielfrei<\/span>\s*<\/td>/.test(row)&&
     !/<!--|<\/?(?:script|template|textarea)\b/i.test(row)&&names.length===1&&names[0]&&
     !/href="[^\"]*\/spiel\//.test(row)&&ids.length===0&&
     [...row.matchAll(/href="https:\/\/www\.fussball\.de\/mannschaft\//g)].length===1&&
     text(element(row,'column-score'))===''){
   const byeDate=decode(element(row,'column-date'))
   if(byeDate==='')continue
   const dateOnly=byeDate.match(/^(?:Mo|Di|Mi|Do|Fr|Sa|So), (\d{2})\.(\d{2})\.(\d{2}) \|$/)
   if(dateOnly&&datum===`20${dateOnly[3]}-${dateOnly[2]}-${dateOnly[1]}`&&
      Number.isFinite(Date.parse(`${datum}T00:00:00Z`))&&new Date(`${datum}T00:00:00Z`).toISOString().slice(0,10)===datum)continue
   fail('neveljaven datum spielfrei kroga')
  }
  if(names.length!==2 || !ids.length || ids.some(r=>r[2]!==ids[0][2]))fail('neveljavna tekma kroga')
  const date=decode(element(row,'column-date')),time=date.match(/(?:^|[ |])(\d{2}:\d{2})$/)
  if(!/^(?:(?:Mo|Di|Mi|Do|Fr|Sa|So), \d{2}\.\d{2}\.\d{2} \| )?\d{2}:\d{2}$/.test(date))fail('nepodprt format datuma vrstice kroga')
  if(!datum || !time || new Date(`${datum}T00:00:00Z`).toISOString().slice(0,10)!==datum || +time[1].slice(0,2)>23 || +time[1].slice(3)>59)fail('neveljaven datum tekme kroga')
  const shortDate=date.match(/(?:^|[ ,])(\d{2})\.(\d{2})\.(\d{2})(?:\s|$)/)
  if(shortDate && `${datum.slice(8)}.${datum.slice(5,7)}.${datum.slice(2,4)}`!==shortDate.slice(1).join('.'))fail('neujemanje datuma vrstice kroga')
  const result=score(element(row,'column-score'),decode,true)
  ;(extra?prestavljene:tekme).push({id:ids[0][2],zapisnikId:`de-fussball-${ids[0][2]}`,url:ids[0][1],krog:extra?null:krog,datum,ura:time[1],domaci:names[0],gostje:names[1],rezultat:result})
 }
 if(!tekme.length || new Set([...tekme,...prestavljene].map(t=>t.id)).size!==tekme.length+prestavljene.length)fail('prazen ali podvojen razpored kroga')
 return {sezona,krog,krogi,tekme,prestavljene}
}
