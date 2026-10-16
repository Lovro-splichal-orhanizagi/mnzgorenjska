// Evidence-backed Novanet report parser. No script execution or score guessing.
import { ustvariAnonimniPrenos } from './novanet-transport.mjs'
import { NovanetPredpomnilnik, starostZapisnika, URA } from './novanet-predpomnilnik.mjs'
import { nastopi as nastopiOsnova } from './hlf.mjs'
import { izidNovanet, preslikaveNovanet } from './novanet-izidi.mjs'
const fail = (s) => { throw new Error(`novanet: ${s}`) }
export class NovanetNepopoln extends Error {
 constructor(message){super(`novanet: zapisnik nepopoln: ${message}`);this.name='NovanetNepopoln';this.nepopoln=true}
}
const nepopolno=s=>{throw new NovanetNepopoln(s)}
export const jeIzziv = (s) => /<title>\s*(?:Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(String(s))
const text = (s) => String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim()
const cells = s => [...s.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1])
const rows = s => [...s.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(m=>m[0])
const minute = s => {
 const m=text(s).match(/^\((\d+)(?:'\s*\+\s*(\d+)|\s*\+\s*(\d+)'|')\)\s*/)
 if (!m || +m[1]>90 || (+m[2]||+m[3]||0)>30) fail('neznana minuta dogodka')
 const base=+m[1],extra=+(m[2]??m[3]??0)
 if(extra&&base!==45&&base!==90)fail('nepodprt dodatek zunaj konca polčasa')
 // Lexicographic base/extra order: 45+5 precedes46, 90+1 precedes90+5.
 // Fantasy minutes retain the ordinary capped base minute.
 return { minuta: Math.min(90,base), cas:base*100+extra, dodatek:extra, ime:text(s).slice(m[0].length).trim() }
}
const scope = { aragon:'futbolaragon.com', galicia:'futgal.es' }
const identity = (z,id) => `es-novanet-${z}-${id}`
// Negative, disjoint federation ranges; bounded IDs cannot collide with existing
// positive federation registrations. Original source IDs remain in virId.
export function registracija(z,id) {
 if(!scope[z] || !/^[1-9]\d{0,9}$/.test(String(id))) fail('neveljavna identiteta igralca')
 return -(1_000_000_000_000 + (z==='aragon'?10_000_000_000:20_000_000_000) + Number(id))
}
function players(section,zveza,id) {
 const out=[]
 for (const row of rows(section)) {
  const cs=cells(row)
  if(cs[1] && /<script\b|<style\b|\bhidden\b|display\s*:\s*none|visibility\s*:/i.test(cs[1]))fail('nepodprta obfuskacija identitete igralca')
  const m=row.match(/NFG_EstadisticasJugador\?[^"']*?jugador=(\d+)&(?:amp;)?codacta=(\d+)/)
  if (!m || cs.length!==2 || m[2]!==id || !/^\d+$/.test(text(cs[0])) || !text(cs[1])) fail('manjka identiteta igralca v postavi')
  out.push({ st:+text(cs[0]), ime:text(cs[1]), regSt:registracija(zveza,m[1]), virId:m[1], vratar:null, pozicija:null, preklopi:[] })
 }
 if (new Set(out.map(p=>p.regSt)).size!==out.length || new Set(out.map(p=>p.st)).size!==out.length) fail('podvojena identiteta igralca')
 return out
}
/** Full validated report, with source-scoped IDs and unknown keeper explicit. */
export function preglejZapisnik(html,{zveza,sezona:pricakovanaSezona=null}={}) {
 html=String(html)
 if (jeIzziv(html)) fail('izziv — uvoz ustavljen')
 if (!scope[zveza] || !html.includes(scope[zveza])) fail('neznana ali napačna zveza')
 if (!/<\/html\s*>\s*$/i.test(html) || !/Ficha (?:de )?Partido/i.test(text(html))) fail('nepopoln zapisnik')
 const ids=[...new Set([...html.matchAll(/\bcodacta=(\d+)/g)].map(m=>m[1]))]
 if(ids.length>1) fail('neznana identiteta zapisnika')
 const id=ids[0]
 const meta=text(html).match(/Temporada\s+(\d{4})-(\d{4})\s+Jornada\s+(\d+)\s+(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2})\s*h/)
 if (!meta) fail('manjka datum ali krog')
 if(pricakovanaSezona!=null&&+meta[1]!==pricakovanaSezona)fail('sezona zapisnika se ne ujema z izbrano sezono kroga')
 const datum=`${meta[6]}-${meta[5]}-${meta[4]}`
 if (new Date(`${datum}T00:00:00Z`).toISOString().slice(0,10)!==datum || +meta[2]!==+meta[1]+1 || +meta[3]<1 || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(meta[7])) fail('neveljaven datum ali krog')
 const names=['L','V'].map(k=>text(html.match(new RegExp(`<div\\b[^>]*class=(?:["'][^"']*\\bfont_widget${k}\\b[^"']*["']|font_widget${k})[^>]*>([\\s\\S]*?)<\\/div>`,'i'))?.[1]??''))
 if(names.some(n=>!n)) fail('manjka ime ekipe')
 const mapping=preslikaveNovanet(html)
 const scoreHtml=html.match(/<h2\b[^>]*class=["']?ntype["']?[^>]*>([\s\S]*?)<\/h2>/i)?.[1]
 if(!scoreHtml) fail('manjka izid')
 const score=izidNovanet(scoreHtml,mapping)
 if(!score) fail('tekma nima izida')
 if(!id)nepopolno('manjkajoče povezave igralcev v sicer prepoznani glavi zapisnika')
 const starts=[...html.matchAll(/<h5>\s*<strong>Titulares<\/strong>\s*<\/h5>/gi)].map(m=>m.index)
 if(starts.length!==2) nepopolno('manjkajoča postava')
 const teams=starts.map((start,idx)=>{
  const chunk=html.slice(start,starts[idx+1]??html.indexOf('var Nova_Pdf_Url',start))
  const a=chunk.match(/^<h5>[\s\S]*?<\/h5>\s*<table\b[^>]*>([\s\S]*?)<\/table>/i)
  const b=chunk.match(/<h5>\s*<strong>Suplentes<\/strong>\s*<\/h5>\s*<table\b[^>]*>([\s\S]*?)<\/table>/i)
  if(!a||!b) nepopolno('manjkajoča postava ali klop')
  const postava=players(a[1],zveza,id), rezerve=players(b[1],zveza,id)
  if(postava.length!==11) nepopolno('postava nima 11 začetnikov')
  postava.forEach(p=>p.zacetnik=true);rezerve.forEach(p=>p.zacetnik=false)
  return {ime:names[idx],postava,rezerve,chunk}
 })
 const all=teams.flatMap((t,ekipaIdx)=>[...t.postava,...t.rezerve].map(p=>({...p,ekipaIdx})))
 if(new Set(all.map(p=>p.regSt)).size!==all.length) fail('igralec v obeh ekipah')
 const find=(ime,idx)=>{
  const found=all.filter(p=>p.ime===ime&&(idx==null||p.ekipaIdx===idx))
  if(found.length!==1) fail(`manjkajoč ali dvoumen igralec dogodka: ${ime}`)
  return found[0]
 }
 const who=(p,d)=>({ekipaIdx:p.ekipaIdx,st:p.st,ime:p.ime,regSt:p.regSt,minuta:d.minuta,cas:d.cas,dodatek:d.dodatek})
 const goalsBlock=html.slice(html.indexOf('>Goles</div>'), starts[0])
 const goli=[]; let prev=[0,0]
 for(const row of rows(goalsBlock)) {
  const cs=cells(row)
  const kind=row.match(/\bclass=["']img (l[\w]+)["']/)?.[1]
  if(!kind){if(/\bclass=["']img\b/.test(row))fail('neznana ikona gola');continue}
  if(!['lgol','lgolpp','lpenalti'].includes(kind))fail('neznana ikona gola')
  if(cs.length!==2) fail('neznana vrstica gola')
  const state=izidNovanet(cs[0].replace(/<a\b[\s\S]*?<\/a>/i,''),mapping)
  const d=minute(cs[1]),p=find(d.ime)
  const own=/lgolpp/.test(row),pen=/lpenalti/.test(row)
  const team=own?1-p.ekipaIdx:p.ekipaIdx
  const expected=[...prev]; expected[team]++
  if(!state||state.some((v,i)=>v!==expected[i])) fail('goli se ne ujemajo z vmesnim izidom')
  if(goli.length&&d.cas<goli.at(-1).cas)fail('neveljaven časovni vrstni red golov')
  prev=state; goli.push({...who(p,d),avtogol:own,enajstmetrovka:pen,rezultat:[...state]})
 }
 if(prev.some((v,i)=>v!==score[i])) fail('goli se ne ujemajo z izidom')
 const menjave=[],rumeni=[],rdeci=[],osebje=[]
 teams.forEach((t,idx)=>{
  let sub=t.chunk.match(/<h4>Sustituciones<\/h4>([\s\S]*?)<h4>Tarjetas<\/h4>/i)
  let cards=t.chunk.match(/<h4>Tarjetas<\/h4>\s*<table\b[^>]*>([\s\S]*?)<\/table>/i)
  // Observed full reports omit Tarjetas when its final table is explicitly
  // empty. Require that table; absence of the whole section remains incomplete.
  if(!cards){
   const empty=t.chunk.match(/<h4>Sustituciones<\/h4>((?:\s*<table\b[^>]*>[\s\S]*?<\/table>)*?)\s*<table\b[^>]*\bwidth=['"]100%['"][^>]*>\s*<\/table>\s*(?=<\/div>)/i)
   if(empty){sub=empty;cards=['','']}
  }
  if(!sub||!cards) nepopolno('manjkajoči razdelki menjav ali kartonov')
  for(const table of sub[1].matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
   const rs=rows(table[1]); if(rs.length!==2) fail('neznana menjava')
   const cs=rs.map(cells)
   if(!/fa-arrow-left/.test(rs[0])||!/fa-arrow-right/.test(rs[1])) fail('neznana smer menjave')
   const d=minute(cs[1][1]),vstop=find(text(cs[0][1]),idx),izstop=find(d.ime,idx)
   if(vstop.st!==+text(cs[0][0])||izstop.st!==+text(cs[1][0])) fail('neujemanje igralca menjave')
   vstop.preklopi.push(d.minuta); izstop.preklopi.push(d.minuta)
   menjave.push({ekipaIdx:idx,minuta:d.minuta,cas:d.cas,dodatek:d.dodatek,vstop:who(vstop,d),izstop:who(izstop,d)})
  }
  for(const row of rows(cards[1])) {
   const cs=cells(row);if(cs.length!==2) fail('neznan karton')
   // Observed archive placeholder has no trustworthy event time. In
   // particular it cannot safely establish a second caution or dismissal.
   if(/^\(999'\)/.test(text(cs[1])))nepopolno('neznan čas kartona 999; statistika cele tekme zadržana')
   const d=minute(cs[1])
   const staff=[...t.chunk.matchAll(/<h5\b[^>]*><strong>[^<]*<\/strong>([\s\S]*?)<\/h5>/gi)].map(m=>text(m[1]))
   if(staff.includes(d.ime)){ if(all.some(p=>p.ekipaIdx===idx&&p.ime===d.ime))fail('dvoumen igralec in trener'); osebje.push({ekipaIdx:idx,...d}); continue }
   const p=find(d.ime,idx)
   if(/tarj_amar\.gif/.test(cs[0])) {
    if(rdeci.some(e=>e.regSt===p.regSt))fail('karton po izključitvi')
    const first=rumeni.find(e=>e.regSt===p.regSt)
    if(first) {if(d.cas<=first.cas)fail('neveljaven vrstni red kartonov');rdeci.push({...who(p,d),drugiRumeni:true})}
    else rumeni.push(who(p,d))
   }
   else if(/tarj_roja\.gif/.test(cs[0])) {if(rdeci.some(e=>e.regSt===p.regSt))fail('podvojena izključitev');rdeci.push(who(p,d))}
   else fail('neznana ikona kartona')
  }
 })
 // The DB stores one continuous on/off interval, so re-entry cannot be
 // represented faithfully even if the source's alternating changes are valid.
 teams.forEach((t,idx)=>[...t.postava,...t.rezerve].forEach(p=>{
  let active=t.postava.includes(p),start=active?0:null,total=0,last=-1
  const events=menjave.filter(e=>e.ekipaIdx===idx).flatMap(e=>e.vstop.regSt===p.regSt?[{m:e.minuta,cas:e.cas,in:true}]:e.izstop.regSt===p.regSt?[{m:e.minuta,cas:e.cas,in:false}]:[])
  const red=rdeci.find(e=>e.regSt===p.regSt)
  if(events.filter(e=>e.in).length>(p.zacetnik?0:1))fail('ponovni vstop ni podprt z enim intervalom nastopa')
  for(const e of events){
   if(e.cas<last||e.in===active||red&&e.cas>red.cas) fail('neveljavna časovnica menjav')
   if(active)total+=e.m-start
   active=e.in;start=active?e.m:null;last=e.cas
  }
  if(red){if(red.cas<last)fail('neveljavna izključitev');if(active){total+=red.minuta-start;active=false}}
  if(active)total+=90-start
  p.minute=total
 }))
 for(const g of goli){
  const p=all.find(p=>p.regSt===g.regSt)
  let active=p.zacetnik
  const changes=menjave.filter(e=>e.vstop.regSt===p.regSt||e.izstop.regSt===p.regSt)
  for(const m of changes)if(m.cas<g.cas)active=!active
  if(!active&&!changes.some(m=>m.cas===g.cas))fail('strelec ni na igrišču; manjkajoča menjava')
  const red=rdeci.find(r=>r.regSt===p.regSt)
  if(red&&g.cas>red.cas)fail('gol po izključitvi')
 }
 const clean=({chunk,...t})=>t
 return {zapisnikId:identity(zveza,id),sezona:`${meta[1]}/${meta[2].slice(-2)}`,sezonaZacetek:+meta[1],krog:+meta[3],datum,ura:meta[7],domaci:clean(teams[0]),gostje:clean(teams[1]),rezultat:{domaci:score[0],gostje:score[1]},goli,rumeni,rdeci,menjave,osebje,opozorila:['Vir ne označi vratarjev; potrebna je neodvisna določitev pozicij.']}
}
/** Validated import shape; unknown goalkeeper remains unknown for position voting. */
export function vZapisnik(html, options) {
 const z=preglejZapisnik(html,options)
 return {...z,polcas:null,zgresene:[],nepopoln:false,prazen:false}
}

export function razberiKodo(koda) {
 const m=String(koda).match(/^(aragon|galicia):([1-9]\d{0,2}):([1-9]\d{0,9}):([1-9]\d{0,9})$/)
 if(!m)fail('šifra lige je zveza:sezona:tekmovanje:skupina (aragon ali galicia)')
 return {zveza:m[1],sezona:m[2],tekmovanje:m[3],skupina:m[4]}
}
const origin=z=>`https://www.${scope[z]}`
export function naslovKroga(koda,krog=1) {
 const c=razberiKodo(koda)
 if(!Number.isInteger(krog)||krog<1||krog>80)fail('neveljaven krog')
 return `${origin(c.zveza)}/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodTemporada=${c.sezona}&CodCompeticion=${c.tekmovanje}&CodGrupo=${c.skupina}&CodJornada=${krog}`
}
export function naslovZapisnika(koda,id) {
 const c=razberiKodo(koda)
 if(String(id).startsWith('es-novanet-')&&!String(id).startsWith(`es-novanet-${c.zveza}-`))fail('napačna zveza zapisnika')
 const raw=String(id).replace(`es-novanet-${c.zveza}-`,'')
 if(!/^[1-9]\d{0,9}$/.test(raw))fail('neveljavna šifra zapisnika')
 return `${origin(c.zveza)}/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa=${raw}&cod_acta=${raw}`
}
function tables(html) {
 const out=[],stack=[]
 for(const m of html.matchAll(/<\/?table\b[^>]*>/gi)) {
  if(/^<\//.test(m[0])) {const start=stack.pop();if(start!=null)out.push(html.slice(start,m.index+m[0].length))}
  else stack.push(m.index)
 }
 if(stack.length)fail('nepopoln zapisnik: tabela')
 return out
}
function classTokens(tag) {
 const m=tag.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
 return (m?.[1]??m?.[2]??m?.[3]??'').split(/\s+/).filter(Boolean)
}
function nameOf(s,k) {
 const names=[]
 for(const m of s.matchAll(/<div\b[^>]*>/gi)) {
  if(!classTokens(m[0]).includes(`font_widget${k}`))continue
  const end=s.indexOf('</div>',m.index+m[0].length)
  if(end<0)fail('nepopoln krog: ime ekipe')
  names.push(text(s.slice(m.index+m[0].length,end)))
 }
 if(names.length!==1||!names[0])fail('nepopoln krog: identiteta ekip')
 return names[0]
}
/** One round only. Scope is read from active form bindings, never random links. */
export function razcleniKrog(html,{zveza,koda=null,krog=null}={}) {
 html=String(html)
 if(jeIzziv(html))fail('izziv — uvoz ustavljen')
 if(!scope[zveza]||!html.includes(scope[zveza]))fail('neznana ali napačna zveza')
 if(!/<\/html\s*>\s*$/i.test(html))fail('nepopoln krog')
 const selected=n=>{
  const rx=new RegExp(`Select_Preselecciona\\(document\\.getElementById\\(["']${n}["']\\),["'](\\d+)["']\\)`,'g')
  const found=[...new Set([...html.matchAll(rx)].map(m=>m[1]))]
  if(found.length!==1)fail(`manjka aktivna izbira ${n}`)
  return found[0]
 }
 const season=[...new Set([...html.matchAll(/document\.BuscaNFG_CMP\.temporada\.value=(\d+);/g)].map(m=>m[1]))]
 if(season.length!==1)fail('manjka sezona kroga')
 const seasonSelect=html.match(/<select\b[^>]*name=["']?temporada["']?[^>]*>([\s\S]*?)<\/select>/i)?.[1]
 const labels=[...(seasonSelect??'').matchAll(/<option\b[^>]*value=["']?(\d+)["']?[^>]*>([\s\S]*?)<\/option>/gi)].filter(m=>m[1]===season[0]).map(m=>text(m[2]))
 if(labels.length!==1||!/^\d{4}-\d{4}$/.test(labels[0]))fail('manjka koledarska oznaka sezone')
 const years=labels[0].split('-').map(Number)
 if(years[1]!==years[0]+1)fail('neveljavna oznaka sezone')
 const code=`${zveza}:${season[0]}:${selected('competicion')}:${selected('grupo')}`
 if(koda&&code!==koda)fail('krog pripada drugi ligi')
 const round=+selected('jornada')
 if(krog!=null&&round!==krog)fail('neujemanje kroga')
 const select=html.match(/<select\b[^>]*name=["']?jornada["']?[^>]*>([\s\S]*?)<\/select>/i)
 if(!select)fail('manjka seznam krogov')
 const rounds=[...select[1].matchAll(/<option\b[^>]*value=["']?(\d+)["']?[^>]*>/gi)].map(m=>+m[1]).filter(n=>n>0)
 const datumiKrogov=[...select[1].matchAll(/<option\b[^>]*value=["']?(\d+)["']?[^>]*>([\s\S]*?)<\/option>/gi)].filter(m=>+m[1]>0).map(m=>{
  const d=text(m[2]).match(/^\d+\s*-\s*(\d{2})-(\d{2})-(\d{4})$/)
  const datum=d?`${d[3]}-${d[2]}-${d[1]}`:null
  if(datum&&new Date(`${datum}T00:00:00Z`).toISOString().slice(0,10)!==datum)fail('neveljaven datum izbire kroga')
  return {stevilka:+m[1],datum}
 })
 if(!rounds.includes(round)||rounds.length>80||new Set(rounds).size!==rounds.length||rounds.some((n,i)=>n>80||n!==i+1))fail('neveljaven seznam krogov')
 const mapping=preslikaveNovanet(html), matches=[]
 for(const table of tables(html)) {
  if((table.match(/<table\b/gi)??[]).length!==1)continue
  // Every leaf table carrying any match signal is a required candidate. A
  // damaged name/class must reject the round instead of silently dropping it.
  if(!/\bCodActa=|\bwid2_resultado(?:_|\b)|\bwrapper_widget2?\b|\bfont_widget[LV]\b/.test(table))continue
  const firstRow=rows(table)[0],teamCells=firstRow?cells(firstRow):[]
  if(teamCells.length!==3)fail('nepopoln krog: celice ekip')
  const d=nameOf(teamCells[0],'L'),g=nameOf(teamCells[2],'V')
  if(/^Descansa$/i.test(d)||/^Descansa$/i.test(g))continue
  const scoreBlock=table.match(/<h4>\s*<strong>\s*(<span\b[^>]*class=["'][^"']*\bntype\b[\s\S]*?)<\/strong>\s*<\/h4>/i)?.[1]
  if(!scoreBlock)fail('nepodprta oblika izida kroga')
  const score=izidNovanet(scoreBlock,mapping)
  const statuses=scoreBlock.match(/\bwid2_resultado(?:_[a-z]+)?\b/g)??[]
  if(score&&(statuses.length!==2||statuses.some(s=>s!=='wid2_resultado_cerrada')))fail('provisionalni izid: nepodprt nepopoln zapisnik')
  const ids=[...new Set([...table.matchAll(/\bCodActa=(\d+)/g)].map(m=>m[1]))]
  if(ids.length>1||score&&ids.length!==1)fail('manjka identiteta odigrane tekme')
  const times=[...table.matchAll(/<span\b[^>]*class=["']?horario["']?[^>]*>([\s\S]*?)<\/span>/gi)].map(m=>text(m[1]))
  const date=times.find(t=>/^\d{2}-\d{2}-\d{4}$/.test(t))
  const datum=date?date.split('-').reverse().join('-'):null
  if(datum&&new Date(`${datum}T00:00:00Z`).toISOString().slice(0,10)!==datum)fail('neveljaven datum kroga')
  const ura=times.find(t=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t))??null
  matches.push({domaci:d,gostje:g,datum,ura,odigrana:!!score,kontumacija:false,virId:ids[0]??null,izid:score?{domaci:score[0],gostje:score[1]}:null})
 }
 const advertisedIds=[...new Set([...html.matchAll(/\bNFG_CmpPartido\?[^"'<>]*?\bCodActa=(\d+)/g)].map(m=>m[1]))]
 const parsedIds=new Set(matches.map(t=>t.virId).filter(Boolean))
 if(advertisedIds.some(id=>!parsedIds.has(id)))fail('nepopoln krog: zapisnik brez ekip')
 if(!matches.length||matches.length>30||new Set(matches.map(t=>`${t.domaci}|${t.gostje}`)).size!==matches.length)fail('nepopoln ali podvojen krog')
 return {koda:code,sezona:years[0],stevilka:round,krogi:rounds,datumiKrogov,tekme:matches}
}

export class NovanetZavrnitev extends Error {
 constructor(message,status=null){super(`novanet: ${message} — uvoz ustavljen`);this.name='NovanetZavrnitev';this.status=status;this.zavrnitev=true}
}
async function read(prenesi,url,name) {
 try {
  const html=await prenesi(url,name,true)
  if(jeIzziv(html))throw new NovanetZavrnitev('izziv')
  return html
 }catch(e){if(e.zavrnitev||[401,403,429].includes(e.status))throw new NovanetZavrnitev(e.message,e.status);throw e}
}
async function beriPreverjeno(prenesi,url,name,parse,{cache,ttl,danes}) {
 const saved=cache?.beri(url)
 if(saved){
  try{const parsed=parse(saved.html);const max=typeof ttl==='function'?ttl(parsed,danes()-saved.starost):ttl;if(saved.starost<max)return parsed}
  catch{cache.izbrisi(url)}
 }
 const html=await read(prenesi,url,name),parsed=parse(html)
 const max=typeof ttl==='function'?ttl(parsed,danes()):ttl
 if(max>0)cache?.shrani(url,html)
 return parsed
}
function preveriObdobjeSezone(r) {
 const od=`${r.sezona}-07-01`,do_=`${r.sezona+1}-07-01`
 for(const d of r.datumiKrogov)if(!d.datum||d.datum<od||d.datum>=do_)fail('datum izbire kroga je zunaj obdobje sezone')
 for(const t of r.tekme)if(t.datum&&(t.datum<od||t.datum>=do_))fail('datum tekme je zunaj obdobje sezone')
}
export async function preberiKroge(koda,prenesi,{cache=null,danes=()=>Date.now()}={}) {
 const {zveza}=razberiKodo(koda)
 const round=n=>beriPreverjeno(prenesi,naslovKroga(koda,n),`${koda.replaceAll(':','-')}-${n}.html`,html=>{
  const r=razcleniKrog(html,{zveza,koda,krog:n});preveriObdobjeSezone(r);return r
 },{cache,danes,ttl:URA/4})
 const first=await round(1),out=[first]
 for(const n of first.krogi) {
  if(n===1)continue
  const r=await round(n)
  if(r.sezona!==first.sezona||r.krogi.join(',')!==first.krogi.join(','))fail('seznam krogov se je spremenil')
  out.push(r)
 }
 const names=new Map()
 for(const r of out)for(const t of r.tekme)for(const name of[t.domaci,t.gostje]){
  const key=kljucKluba(name)
  if(names.has(key)&&names.get(key)!==name)fail('dvoumna kluba z istim ključem v razporedu')
  names.set(key,name)
 }
 for(const r of out)for(const t of r.tekme)if(kljucKluba(t.domaci)===kljucKluba(t.gostje))fail('dvoumna kluba z istim ključem v razporedu')
 const ids=out.flatMap(r=>r.tekme.filter(t=>t.virId).map(t=>t.virId))
 if(ids.length>1000||new Set(ids).size!==ids.length)fail('podvojene tekme med krogi')
 return out.sort((a,b)=>a.stevilka-b.stevilka)
}
/** Explicit charset decoding; fetch().text() corrupts ISO-8859-15 names. */
const anonimniPrenos=ustvariAnonimniPrenos({jeIzziv,zavrnitev:(m,s)=>new NovanetZavrnitev(m,s)})
export async function novanetFetch(url,options={}) {
 const response=await anonimniPrenos(url,options)
 if([401,403,429].includes(response.status))throw new NovanetZavrnitev(`HTTP ${response.status}`,response.status)
 // Preserve HTTP failures untouched so shared retry/missing-report handling sees
 // their status even when an error body has no HTML charset.
 if(!response.ok)return response
 const bytes=await response.arrayBuffer()
 if(bytes.byteLength>5_000_000)fail('prevelik dokument')
 const head=new TextDecoder('iso-8859-15').decode(bytes.slice(0,4096))
 const charset=response.headers.get('content-type')?.match(/charset=([^;\s]+)/i)?.[1]??head.match(/charset[=\s]+["']?([\w-]+)/i)?.[1]
 if(!charset||! /^(?:utf-8|iso-8859-15|iso-8859-1|windows-1252)$/i.test(charset))fail('nepodprt nabor znakov')
 const html=new TextDecoder(charset,{fatal:true}).decode(bytes)
 if(jeIzziv(html))throw new NovanetZavrnitev('izziv')
 return new Response(html,{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html; charset=utf-8'}})
}
// Persist federation-qualified names because the shared ES team lookup includes
// exact-name fallback across every source. Keep inspection/raw comparisons intact.
const oznakaZveze={aragon:'Aragón',galicia:'Galicia'}
export function imeKlubaZaUvoz(ime,zveza) {
 if(!oznakaZveze[zveza])fail('neznana zveza kluba')
 return `${text(ime)} (${oznakaZveze[zveza]})`
}
export const kljucKluba=s=>text(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
/** Card-only bench records are legal zero-minute DB appearances, not play. */
export function nastopi(z) {
 const out=nastopiOsnova(z),known=new Set(out.map(p=>p.regSt))
 for(const [ekipaIdx,e]of[z.domaci,z.gostje].entries())for(const p of e.rezerve){
  if(known.has(p.regSt))continue
  const yellow=z.rumeni.filter(c=>c.regSt===p.regSt&&c.ekipaIdx===ekipaIdx).length
  const red=z.rdeci.some(c=>c.regSt===p.regSt&&c.ekipaIdx===ekipaIdx)?1:0
  if(!yellow&&!red)continue
  out.push({ekipaIdx,ekipa:e.ime,st:p.st,ime:p.ime,regSt:p.regSt,pozicija:p.pozicija??null,vratar:!!p.vratar,kapetan:!!p.kapetan,zacetnik:false,minutaOd:0,minutaDo:0,minute:0,goli:0,goliIzEnajstmetrovke:0,avtogoli:0,zgreseneEnajstmetrovke:0,rumeni:yellow,rdeci:red,prejetiGoli:0,cleanSheet:false,kartonSKlopi:true})
 }
 return out
}
export function ustvariVir({predpomnilnik='scripts/.predpomnilnik/novanet/preverjeni-v1',danes=()=>Date.now(),opozori=m=>console.warn(m)}={}) {
 const nepopolni=[]
 const cache=predpomnilnik===false?null:new NovanetPredpomnilnik(predpomnilnik,{danes})
 return {
 nepopolni,
 ime:'novanet',polnoIme:'Novanet — Aragón / Galicia',drzava:'ES',
 glave:{'User-Agent':'SLFF fantasy (slff.eu; splih.94@gmail.com)'},premorMs:2000,
 fetch:novanetFetch,jeIzziv,zavrnitev:(m,s)=>new NovanetZavrnitev(m,s),
 // Generic consumer cache is disabled; only fully validated source cache is used.
 zaPredpomnilnik:()=>false,
 naslovRazporeda:naslovKroga,naslovZapisnika,
 kljucKluba,poenostavi:kljucKluba,
 kratkoIme:s=>text(s).replace(/ \((?:Aragón|Galicia)\)$/,''),vBesedilo:s=>String(s).split('\n'),nastopi,
 async razporedVseStrani(koda,prenesi){
  const {zveza}=razberiKodo(koda)
  return (await preberiKroge(koda,prenesi,{cache,danes})).map(({stevilka,tekme})=>({stevilka,tekme:tekme.map(t=>({...t,domaci:imeKlubaZaUvoz(t.domaci,zveza),gostje:imeKlubaZaUvoz(t.gostje,zveza)}))}))
 },
 async zapisniki(koda,prenesi){
  nepopolni.length=0
  const {zveza}=razberiKodo(koda),out=[]
  let pricakovanih=0
  for(const r of await preberiKroge(koda,prenesi,{cache,danes}))for(const t of r.tekme){
   if(!t.odigrana)continue
   pricakovanih++
   const url=naslovZapisnika(koda,t.virId)
   let z
   try{z=await beriPreverjeno(prenesi,url,`report-${zveza}-${t.virId}.html`,html=>{
    const z=vZapisnik(html,{zveza,sezona:r.sezona})
    if(z.zapisnikId!==identity(zveza,t.virId)||z.krog!==r.stevilka||kljucKluba(z.domaci.ime)!==kljucKluba(t.domaci)||kljucKluba(z.gostje.ime)!==kljucKluba(t.gostje)||z.datum!==t.datum||z.ura!==t.ura||z.rezultat.domaci!==t.izid.domaci||z.rezultat.gostje!==t.izid.gostje)fail('zapisnik in krog se ne ujemata')
    z.zaprt=true;return z
   },{cache,danes,ttl:starostZapisnika})
   }catch(e){
    if(!(e instanceof NovanetNepopoln)&&e.status!==404)throw e
    const notice={id:identity(zveza,t.virId),url,razlog:e.message,status:e.status??null}
    nepopolni.push(notice);opozori(`novanet: zapisnik nepopoln: ${notice.id} — statistika cele tekme zadržana; ${e.message}`)
    continue
   }
   z.domaci={...z.domaci,ime:imeKlubaZaUvoz(t.domaci,zveza)}
   z.gostje={...z.gostje,ime:imeKlubaZaUvoz(t.gostje,zveza)}
   z.url=url;out.push({id:z.zapisnikId,z,url})
  }
  if(pricakovanih>0&&!out.length){
   const e=new NovanetNepopoln(`vseh ${pricakovanih} odigranih tekem je brez uporabnega zapisnika`)
   e.code='NOVANET_ALL_WITHHELD';e.nepopolni=[...nepopolni]
   e.status=nepopolni.every(n=>n.status===404)?404:422
   throw e
  }
  return out
 },
 }
}
export default ustvariVir()
