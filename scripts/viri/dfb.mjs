// Official public DFB Datencenter reports. Initially Regionalliga Nordost only.
// Profile links are optional and disappear independently of public names. Never
// switch identity according to link availability: all players use name + club,
// with same-team name collisions rejected. Numeric profile IDs are metadata.
import { razpakiraj } from '../klubi.mjs'
import { nastopi as nastopiPoImenu } from './fss.mjs'

const BASE = 'https://datencenter.dfb.de'
const fail = s => {
  const e=new Error(`dfb: ${s}`)
  e.koda=/^nepodprt|^neenolična vrsta/.test(s)?'DFB_UNSUPPORTED_FORMAT':'DFB_INVALID_REPORT'
  throw e
}
export class DfbNepopoln extends Error {
  constructor(s){super(`dfb: nepopoln javni zapisnik: ${s}`);this.nepopoln=true;this.koda='DFB_INCOMPLETE_REPORT'}
}
const text = s => razpakiraj(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
const attr = (s, k) => s.match(new RegExp(`\\b${k}=["']([^"']*)["']`))?.[1]
const has = (tag, cls) => (attr(tag, 'class') ?? '').split(/\s+/).includes(cls)

// Small balanced-element reader; unlike a non-greedy div regexp it preserves
// nested event segments. Restrict selectors to the actual public report schema.
function elements(s, tag, cls) {
  const out = [], re = new RegExp(`<${tag}\\b[^>]*>`, 'gi')
  let m
  while ((m = re.exec(s))) {
    if (cls && !has(m[0], cls)) continue
    const tokens = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi')
    tokens.lastIndex = re.lastIndex
    let depth = 1, end
    while ((end = tokens.exec(s))) {
      depth += end[0].startsWith('</') ? -1 : 1
      if (!depth) break
    }
    if (depth) fail(`odrezan element ${cls ?? tag}`)
    out.push({ tag: m[0], inner: s.slice(re.lastIndex, end.index), outer: s.slice(m.index, tokens.lastIndex) })
    re.lastIndex = tokens.lastIndex
  }
  return out
}
const one = (s, tag, cls) => {
  const a = elements(s, tag, cls)
  if (a.length !== 1) fail(`nepopoln ali podvojen element ${cls}`)
  return a[0]
}
function cardEntries(icon,segments){
  const kinds=[...icon.matchAll(/m-MatchDetails-icon-card--([\w-]+)/g)].map(m=>m[1])
  if(!segments.length||!kinds.length||!(kinds.length===1||kinds.length===segments.length)||kinds.some(k=>!['yellow','red','yellow-red'].includes(k)))fail('nepodprt karton')
  // Actual DFB groups several named people at the same minute: one icon is
  // shared by all names, or icons and names align one-for-one in public order.
  return segments.map((segment,i)=>({segment,kind:kinds.length===1?kinds[0]:kinds[i]}))
}
function eventSignatures(section) {
  const out=[]
  for(const row of elements(section,'div','m-MatchDetails-history-item')){
    const minute=text(one(row.inner,'div','m-MatchDetails-history-minute').inner)
    for(const e of elements(row.inner,'div','m-MatchDetails-history-event').filter(e=>!has(e.tag,'is-empty'))){
      const side=has(e.tag,'m-MatchDetails-history-event--home')?'home':has(e.tag,'m-MatchDetails-history-event--away')?'away':null
      if(!side)fail('dogodek brez ekipe')
      const icon=one(e.inner,'div',`m-MatchDetails-history-event-icon--${side}`).inner
      const kinds=[...icon.matchAll(/m-MatchDetails-icon-(goal|card|playing)--([\w-]+)/g)]
      const rawSegments=elements(e.inner,'div','m-MatchDetails-history-event-text-segment')
      if(kinds.length&&kinds.every(k=>k[1]==='card')){
        for(const {segment,kind} of cardEntries(icon,rawSegments))out.push({type:'card',key:JSON.stringify([side,minute,`m-MatchDetails-icon-card--${kind}`,[text(segment.inner).normalize('NFC')]])})
        continue
      }
      if(kinds.length!==1)fail('neenolična vrsta dogodka')
      const type=kinds[0][1]==='playing'?'substitute':kinds[0][1]
      const segments=rawSegments.map(s=>text(s.inner).normalize('NFC'))
      out.push({type,key:JSON.stringify([side,minute,kinds[0][0],segments])})
    }
  }
  return out
}
export const kljucKluba = s => text(s).normalize('NFC').toLocaleLowerCase('de').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const nameKey = kljucKluba
const validName = name => name && !/^(?:spieler(?:in)?|unbekannt(?:er spieler)?|n\.?n\.?|anonym)$/i.test(name) && !/[\uE000-\uF8FF]/u.test(name)
export const jeIzziv = s => /cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|<title>\s*(?:Just a moment|Access denied|Attention Required)|captcha|sign in to continue/i.test(String(s))

function identity(fragment) {
  const ime = text(fragment).replace(/\s*\(T\)\s*$/, '').trim()
  if (!validName(ime)) fail('manjka javna identiteta igralca')
  return { ime, profilId: fragment.match(/\/profil\/(\d+)(?:[?"'])/)?.[1] ?? null }
}
function metadata(html, id) {
  if (jeIzziv(html)) fail('izziv ali zavrnitev vira')
  if (!/<\/body>\s*<\/html>\s*$/i.test(html)) fail('odrezan ali nepopoln zapisnik')
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].filter(m => attr(m[0], 'rel') === 'canonical')
  if (canonical.length !== 1) fail('manjka kanonična identiteta')
  const url = attr(canonical[0][0], 'href')
  const key = url?.match(/^https:\/\/datencenter\.dfb\.de\/datencenter\/regionalliga-nordost\/(\d{4})-(\d{4})\/(\d+)(?:-spieltag)?\/[a-z0-9-]+-(\d+)$/)
  if (!key || +key[2] !== +key[1] + 1 || (id && String(id).replace(/^de-dfb-/, '') !== key[4])) fail('neujemanje šifre ali identitete zapisnika')
  const headline = text(one(html, 'h2', 'm-MatchDetails-headline').inner)
  if (headline !== `Regionalliga Nordost, ${key[1]}/${key[2]}, ${+key[3]}. Spieltag`) fail('neujemanje sezone ali kroga')
  const date = text(one(html, 'h4', 'm-MatchDetails-subline').inner).match(/, (\d{1,2})\. (\p{L}+) (\d{4}), (\d{2}:\d{2}) Uhr,/u)
  const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  if (!date || !months.includes(date[2])) fail('manjka datum ali ura')
  const datum = `${date[3]}-${String(months.indexOf(date[2])+1).padStart(2,'0')}-${date[1].padStart(2,'0')}`
  if (new Date(`${datum}T00:00:00Z`).toISOString().slice(0,10) !== datum || +date[4].slice(0,2)>23 || +date[4].slice(3)>59) fail('neveljaven datum ali ura')
  if(datum<`${key[1]}-07-01`||datum>`${key[2]}-06-30`)fail('datum izven sezone')
  return { zapisnikId: `de-dfb-${key[4]}`, url, sezona: `${key[1]}/${key[2].slice(2)}`, krog: +key[3], datum, ura: date[4] }
}

/** A complete played public match report; every discrepancy rejects the report. */
export function vZapisnik(html, { id, tekma } = {}) {
  const meta = metadata(String(html), id)
  const result = one(html, 'div', 'm-MatchDetails-result').inner
  const teams = elements(result, 'div', 'm-MatchDetails-team').map(e => {
    const a = one(e.inner, 'a')
    const path = attr(a.tag, 'href')?.match(/\/competitions\/regionalliga-nordost\/seasons\/(\d{4})-(\d{4})\/teams\/([a-zA-Z0-9-]+)(?:[?"']|$)/)
    if (!path || `${path[1]}/${path[2].slice(2)}` !== meta.sezona) fail('neujemanje identitete ekipe')
    return { ime: text(one(e.inner, 'div', 'm-MatchDetails-title').inner), virId: path[3], postava: [], rezerve: [] }
  })
  if (teams.length !== 2 || teams[0].virId === teams[1].virId) fail('nepopolni ekipi')
  const score = text(one(result, 'div', 'm-MatchDetails-score').inner).match(/^(\d+):(\d+) \((\d+):(\d+)\)$/)
  if (!score) fail('manjka končni izid ali polčas')
  const rezultat = { domaci: +score[1], gostje: +score[2] }, polcas = { domaci: +score[3], gostje: +score[4] }
  if (polcas.domaci > rezultat.domaci || polcas.gostje > rezultat.gostje) fail('neveljaven polčas')
  const tables = elements(html, 'table', 'm-MatchDetails-lineup-table')
  // Some official archive reports omit the bench entirely. Named incoming
  // substitutions below establish played reserves; unused bench is irrelevant.
  if (![1,2].includes(tables.length) || !/Aufstellung/.test(tables[0].inner) || (tables[1]&&!/Auswechselspieler/.test(tables[1].inner))) fail('nepopolna postava ali klop')
  const coaches = [new Set(), new Set()]
  for (const [idx, table] of tables.entries()) {
    const body = one(table.inner, 'tbody').inner
    for (const row of elements(body, 'tr')) {
      for (const [side, sideName] of ['home','away'].entries()) {
        const person = one(row.inner, 'td', `m-MatchDetails-lineup-person--${sideName}`)
        const number = text(one(row.inner, 'td', `m-MatchDetails-lineup-number--${sideName}`).inner)
        if (!text(person.inner) && !number) continue
        const p = identity(person.inner)
        if (!/^\d{1,3}$/.test(number)) fail('igralec brez dresa')
        const markedKeeper=/\(T\)\s*$/.test(text(person.inner))
        p.st = +number; p.vratar = markedKeeper?true:idx===0?false:null; p.zacetnik = idx === 0
        p.vratarVir=markedKeeper?'oznaka-T':null
        p.regSt = null; p.virId = `de-dfb-${teams[side].virId}-${nameKey(p.ime)}`
        teams[side][idx ? 'rezerve':'postava'].push(p)
      }
    }
    const foot = elements(table.inner, 'tfoot')[0]?.inner ?? ''
    for (const [side, name] of ['home','away'].entries()) for (const cell of elements(foot, 'td', `m-MatchDetails-lineup-person--${name}`)) if (text(cell.inner)) coaches[side].add(nameKey(text(cell.inner)))
  }
  const players = teams.map(t => {
    if (t.postava.length !== 11 || t.postava.filter(p=>p.vratar).length !== 1) fail('nepopolna začetna postava ali vratar')
    const map = new Map()
    for (const p of [...t.postava,...t.rezerve]) {
      if (map.has(nameKey(p.ime))) fail('dvoumna identiteta: soimenjaka v isti ekipi')
      if ([...map.values()].some(x=>x.st===p.st)) fail('podvojen dres')
      map.set(nameKey(p.ime),p)
    }
    return map
  })
  const histories = elements(html, 'div', 'm-MatchDetails-history')
  const sections = new Map(histories.map(h=>[text(one(h.inner,'div','m-MatchDetails-history-title').inner),h.inner]))
  if (histories.length!==4 || sections.size !== 4 || ['Spielverlauf','Tore','Karten','Wechsel'].some(k=>!sections.has(k))) fail('nepopolni dogodki zapisnika')
  const goli=[], rumeni=[], rdeci=[], menjave=[], uradneKazni=[], opozorila=[]
  const active=teams.map(t=>new Set(t.postava.map(p=>p.virId)))
  const counters={goal:0,card:0,substitute:0}
  // Eligibility survives leaving/never entering the pitch. The active set alone
  // cannot distinguish an unused reserve from a reserve dismissed on the bench.
  const discipline=new Map()
  const runningScore=[0,0]
  let previous=0
  for (const row of elements(sections.get('Spielverlauf'),'div','m-MatchDetails-history-item')) {
    const time = text(one(row.inner,'div','m-MatchDetails-history-minute').inner).match(/^(\d+)(?:\+(\d+))?'$/)
    if (!time || +time[1]>90 || +(time[2]??0)>30) fail('nepodprta minuta dogodka')
    const order=+time[1]*100+ +(time[2]??0), minute=Math.min(+time[1],90)
    if(order<previous)fail('neveljavno časovno zaporedje');previous=order
    const events=elements(row.inner,'div','m-MatchDetails-history-event').filter(e=>!has(e.tag,'is-empty'))
    if (!events.length || events.length>2)fail('nepopoln dogodek')
    for (const e of events) {
      const side=has(e.tag,'m-MatchDetails-history-event--home')?0:has(e.tag,'m-MatchDetails-history-event--away')?1:null
      if(side==null)fail('dogodek brez ekipe')
      const icon=one(e.inner,'div',`m-MatchDetails-history-event-icon--${side?'away':'home'}`).inner
      const segments=elements(e.inner,'div','m-MatchDetails-history-event-text-segment')
      const resolve=(fragment, suffix=false, incoming=false,personSide=side)=>{
        const raw=text(fragment).replace(suffix?/\s+für$/:/$^/,'').replace(/\(Elfmeter\)|\(Eigentor\)/g,'').replace(/\bEigentor\b/g,'').replace(/\b\d+:\d+\b/g,'').trim()
        const who=identity(raw); let p=players[personSide].get(nameKey(who.ime))
        if(!p) {
          if(coaches[personSide].has(nameKey(who.ime)))return {ime:who.ime,offiziell:true}
          if(incoming && tables.length===1){
            p={...who,st:null,regSt:null,virId:`de-dfb-${teams[personSide].virId}-${nameKey(who.ime)}`,vratar:null,vratarVir:null,zacetnik:false}
            players[personSide].set(nameKey(who.ime),p);teams[personSide].rezerve.push(p)
          } else fail(`dogodek vsebuje neznanega igralca ${who.ime}`)
        }
        return p
      }
      const event=(p,personSide=side)=>({ime:p.ime,st:p.st,virId:p.virId,ekipaIdx:personSide,minuta:minute})
      if (/m-MatchDetails-icon-goal--/.test(icon)) {
        const kind=icon.match(/m-MatchDetails-icon-goal--([\w-]+)/)?.[1]
        if(!['goal','penalty','own-goal'].includes(kind) || segments.length!==1)fail('nepodprt gol')
        const avtogol=kind==='own-goal'||/\bEigentor\b/.test(text(segments[0].inner))
        const personSide=avtogol?1-side:side
        const p=resolve(segments[0].inner,false,false,personSide)
        if(p.offiziell)fail('gol uradne osebe')
        if(!active[personSide].has(p.virId))fail('gol neaktivnega igralca: ni vstopa ali je že izstopil')
        // Actual DFB penalties retain the ordinary goal icon; their distinction
        // is the explicit public `(Elfmeter)` text next to the player's name.
        const enajstmetrovka=kind==='penalty'||/\(Elfmeter\)/.test(text(segments[0].inner))
        // In all observed own-goal formats the event sits on the beneficiary
        // side, while the named scorer belongs to the opposite official XI.
        runningScore[side]++
        const stageScore=text(segments[0].inner).match(/\b(\d+):(\d+)\b/)
        if(!stageScore || +stageScore[1]!==runningScore[0] || +stageScore[2]!==runningScore[1])fail('neveljavno zaporedje izidov pri golih')
        goli.push({...event(p,personSide),avtogol,enajstmetrovka,rezultat:[...runningScore]});counters.goal++
      } else if (/m-MatchDetails-icon-card--/.test(icon)) {
        for(const {segment,kind} of cardEntries(icon,segments)){
        const p=resolve(segment.inner)
        const key=p.virId??`${side}|official|${nameKey(p.ime)}`
        const state=discipline.get(key)??{yellow:false,dismissed:false}
        if(state.dismissed)fail('karton po izključitvi')
        if(kind==='yellow'&&state.yellow)fail('podvojen rumeni karton brez izključitve')
        // DFBnet defines Gelb-Rot as the second caution plus dismissal. Some
        // official reports only publish that combined event. Its earlier
        // caution is certain, but its time is unknown; never backdate it.
        // Derived cautions do not enter source counters/signatures below.
        if(kind==='yellow-red'&&!state.yellow&&!p.offiziell){
          rumeni.push({...event(p),minuta:null,izpeljanIz:'drugi-rumeni'})
          opozorila.push(`${p.ime}: predhodni rumeni karton izpeljan iz uradne oznake Gelb-Rot; neznana minuta.`)
        }
        if(kind==='yellow')state.yellow=true
        else state.dismissed=true
        discipline.set(key,state)
        if(p.offiziell)uradneKazni.push({...event(p),vrsta:kind})
        else if(kind==='yellow')rumeni.push(event(p))
        else {
          p.rdec=minute;rdeci.push(event(p));active[side].delete(p.virId)
        }
        counters.card++
        }
      } else if (/m-MatchDetails-icon-playing--substitute-in/.test(icon)) {
        if(!segments.length || segments.length%2)fail('menjava brez para')
        for(let i=0;i<segments.length;i+=2){
          if(!/m-MatchDetails-icon-caret-right--green/.test(segments[i].inner)||!/m-MatchDetails-icon-caret-right--red/.test(segments[i+1].inner))fail('menjava brez smeri')
          const noter=resolve(segments[i].inner,true,true),ven=resolve(segments[i+1].inner)
          if(noter.rdec!=null||discipline.get(noter.virId)?.dismissed)fail('vstop izključenega igralca po rdečem kartonu')
          if(noter.offiziell||ven.offiziell||noter===ven||noter.zacetnik||noter.noter!=null||ven.ven!=null||active[side].has(noter.virId)||!active[side].has(ven.virId))fail('neveljaven par menjave')
          const t=minute===46?45:minute
          noter.noter=t;ven.ven=t
          // Bench absence of `(T)` is unknown in BOTH formats. An explicit
          // official pair replacing the goalkeeper establishes the on-pitch
          // role, not an independent roster position or a guessed shirt role.
          if(ven.vratar===true && noter.vratar==null){noter.vratar=true;noter.vratarVir='menjava-vratarja'}
          if(noter.vratar===true && [...players[side].values()].some(p=>p!==ven&&p.vratar===true&&active[side].has(p.virId)))fail('nasprotujoča oznaka vratarja: dva aktivna vratarja')
          active[side].delete(ven.virId);active[side].add(noter.virId)
          menjave.push({ekipaIdx:side,minuta:t,noter:{st:noter.st,ime:noter.ime},ven:{st:ven.st,ime:ven.ime}})
        }
        counters.substitute++
      } else fail('nepodprt dogodek')
    }
  }
  // Compare identity, type, side, exact added-time minute and score/text, not
  // merely counts. Dedicated sections must describe precisely the same events.
  const timelineSignatures=eventSignatures(sections.get('Spielverlauf'))
  for(const [section,kind] of [['Tore','goal'],['Karten','card'],['Wechsel','substitute']]){
    const expected=timelineSignatures.filter(e=>e.type===kind).map(e=>e.key).sort()
    const observed=eventSignatures(sections.get(section)).map(e=>e.key).sort()
    if(observed.length!==counters[kind]||JSON.stringify(expected)!==JSON.stringify(observed))fail(`nepopolni ali neujemajoči dogodki razdelka ${section}`)
  }
  const scored=[0,0]
  for(const g of goli)scored[g.avtogol?1-g.ekipaIdx:g.ekipaIdx]++
  if(scored[0]!==rezultat.domaci||scored[1]!==rezultat.gostje)fail('goli se ne ujemajo z izidom')
  const halftime=[0,0]
  for(const g of goli.filter(g=>g.minuta<=45))halftime[g.avtogol?1-g.ekipaIdx:g.ekipaIdx]++
  if(halftime[0]!==polcas.domaci||halftime[1]!==polcas.gostje)fail('polčas se ne ujema s časovno označenimi goli')
  for(const [side,t] of teams.entries())for(const p of [...t.postava,...t.rezerve]){
    if(!p.zacetnik && p.noter==null && goli.some(g=>g.ekipaIdx===side&&g.ime===p.ime))fail('gol rezerve brez vstopa')
    if(p.ven!=null && (p.noter??0)>p.ven)fail('izstop pred vstopom')
  }
  const z={...meta,domaci:teams[0],gostje:teams[1],rezultat,polcas,goli,rumeni,rdeci,menjave,zgresene:[],uradneKazni,opozorila}
  if(tekma) {
    for(const k of ['krog','datum','ura','sezona'])if(tekma[k]!=null&&tekma[k]!==z[k])fail(`razpored: neujemanje ${k}`)
    for(const k of ['domaci','gostje'])if(tekma[k]!=null&&tekma[k]!==z[k].ime)fail(`razpored: neujemanje ${k}`)
    for(const k of ['domaci','gostje'])if(tekma[`${k}Id`]!=null&&tekma[`${k}Id`]!==z[k].virId)fail(`razpored: neujemanje identitete ${k}`)
    if(tekma.izid && (tekma.izid.domaci!==rezultat.domaci||tekma.izid.gostje!==rezultat.gostje))fail('razpored: neujemanje izida')
  }
  return z
}
export function nastopi(z) {
  const out=nastopiPoImenu(z),known=new Set(out.map(p=>`${p.ekipaIdx}|${nameKey(p.ime)}`))
  // An unused substitute can receive a caution/dismissal. Keep the discipline
  // in a zero-minute record; this never grants play, keeper status or a CS.
  for(const [ekipaIdx,e] of [z.domaci,z.gostje].entries())for(const p of e.rezerve){
    if(known.has(`${ekipaIdx}|${nameKey(p.ime)}`))continue
    const own=c=>c.ekipaIdx===ekipaIdx&&c.virId===p.virId
    const rumeni=z.rumeni.filter(own).length,rdeci=z.rdeci.some(own)?1:0
    if(!rumeni&&!rdeci)continue
    out.push({ekipaIdx,ekipa:e.ime,st:p.st,ime:p.ime,regSt:null,pozicija:null,vratar:false,zacetnik:false,minutaOd:0,minutaDo:0,minute:0,goli:0,goliIzEnajstmetrovke:0,avtogoli:0,zgreseneEnajstmetrovke:0,rumeni,rdeci,prejetiGoli:0,cleanSheet:false,kartonSKlopi:true})
  }
  return out
}

export function razberiKodo(koda) {
  const m=String(koda??'').match(/^regionalliga-nordost\/(\d{4})-(\d{4})$/)
  if(!m || +m[2]!==+m[1]+1)fail('šifra lige mora biti regionalliga-nordost/YYYY-YYYY')
  return {pot:`regionalliga-nordost/seasons/${m[1]}-${m[2]}`,sezona:`${m[1]}/${m[2].slice(2)}`,leto:+m[1]}
}
export const naslovEkipe=(koda,slug='bfc-dynamo')=>{
  if(!/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/.test(slug))fail('neveljavna šifra ekipe')
  return `${BASE}/competitions/${razberiKodo(koda).pot}/teams/${slug}`
}
const safeUrl=s=>{
  const u=new URL(razpakiraj(s),BASE)
  if(u.origin!==BASE || u.username || u.password)fail('povezava izven uradnega vira')
  return u
}

/** Parse one actual season-team schedule; never infer IDs, rounds or URLs. */
export function tekmeEkipe(html,koda,slug) {
  const conf=razberiKodo(koda),expected=naslovEkipe(koda,slug)
  if(jeIzziv(html))fail('izziv (CAPTCHA) v razporedu')
  if(!/<\/body>\s*<\/html>\s*$/i.test(html))fail('odrezan razpored')
  const canonical=[...html.matchAll(/<link\b[^>]*>/gi)].filter(m=>attr(m[0],'rel')==='canonical')
  if(canonical.length!==1 || safeUrl(attr(canonical[0][0],'href')).href!==expected)fail('neujemanje sezone ali identitete razporeda')
  const ek=new Map(),tekme=[]
  for(const row of elements(html,'div','c-MatchTable-row')){
    const ids=[...row.inner.matchAll(/\bid="match_(\d+)"/g)].map(m=>m[1])
    if(!ids.length)continue // ordinary table heading
    if(ids.length!==1)fail('neenolična šifra tekme')
    const homeAway=['home','away'].map(side=>{
      const cell=one(row.inner,'div',`c-MatchTable-team--${side}`),a=one(cell.inner,'a')
      const url=safeUrl(attr(a.tag,'href')),m=url.pathname.match(/^\/competitions\/(regionalliga-nordost\/seasons\/\d{4}-\d{4})\/teams\/([a-zA-Z0-9-]+)$/)
      if(!m||m[1]!==conf.pot)fail('neujemanje sezone ekipe')
      const ime=text(a.inner)
      if(!ime)fail('manjka ime ekipe')
      if(ek.has(m[2])&&ek.get(m[2]).ime!==ime)fail('neenolično ime ekipe')
      const team={id:m[2],ime,url:`${BASE}${url.pathname}`};ek.set(team.id,team);return team
    })
    if(homeAway[0].id===homeAway[1].id || !homeAway.some(t=>t.id===slug))fail('razpored druge ekipe')
    const score=one(row.inner,'div','c-MatchTable-score'),a=one(score.inner,'a'),url=safeUrl(attr(a.tag,'href'))
    const match=url.pathname.match(/^\/datencenter\/regionalliga-nordost\/(\d{4})-(\d{4})\/(\d+)(?:-spieltag)?\/[a-z0-9-]+-(\d+)$/)
    if(!match || +match[1]!==conf.leto || +match[2]!==conf.leto+1 || match[4]!==ids[0])fail('neujemanje šifre ali identitete tekme')
    const time=text(one(row.inner,'div','c-MatchTable-description').inner).match(/, (\d{2})\.(\d{2})\.(\d{4}) (\d{2}:\d{2}) Uhr$/)
    if(!time)fail('manjka datum tekme v razporedu')
    const datum=`${time[3]}-${time[2]}-${time[1]}`
    if(new Date(`${datum}T00:00:00Z`).toISOString().slice(0,10)!==datum || datum<`${conf.leto}-07-01` || datum>`${conf.leto+1}-06-30` || +time[4].slice(0,2)>23 || +time[4].slice(3)>59)fail('neveljaven datum razporeda')
    const val=text(a.inner),sc=val.match(/^(\d+) : (\d+)$/)
    if(!sc && val!=='- : -')fail('nepodprt izid razporeda')
    tekme.push({id:ids[0],krog:+match[3],sezona:conf.sezona,datum,ura:time[4],domaci:homeAway[0].ime,gostje:homeAway[1].ime,domaciId:homeAway[0].id,gostjeId:homeAway[1].id,izid:sc?{domaci:+sc[1],gostje:+sc[2]}:null,url:url.href})
  }
  if(tekme.length!==34||new Set(tekme.map(t=>t.id)).size!==34||new Set(tekme.map(t=>t.krog)).size!==34||tekme.some(t=>t.krog<1||t.krog>34)||ek.size!==18)fail('nepopoln omejen razpored: pričakovanih 34 krogov in 18 ekip')
  return {sezona:conf.sezona,tekme,ekipe:[...ek.values()]}
}

export class DfbZavrnitev extends Error {
  constructor(message,status=null){super(`dfb: ${message} — uvoz ustavljen, ne obhajamo`);this.zavrnitev=true;this.status=status}
}
/** Throw before shared transport can retry a 429 response. */
export async function varniFetch(url,options,fetchFn=globalThis.fetch){
  safeUrl(String(url))
  const signal=AbortSignal.any([options?.signal,AbortSignal.timeout(30000)].filter(Boolean))
  const response=await fetchFn(url,{...options,signal})
  if([401,403,429].includes(response.status)){
    await response.body?.cancel().catch(()=>{})
    throw new DfbZavrnitev(`HTTP ${response.status}`,response.status)
  }
  // Shared transport reads text after fetch resolves. Consume a bounded body
  // here so both headers and the stream remain subject to the same deadline.
  const limit=2*1024*1024,reader=response.body?.getReader(),chunks=[]
  let bytes=0
  if(reader){
    try {
      for(;;){
        const {done,value}=await reader.read()
        if(done)break
        bytes+=value.byteLength
        if(bytes>limit){await reader.cancel();fail('odgovor presega omejitev velikosti 2 MiB')}
        chunks.push(value)
      }
    }catch(e){await reader.cancel().catch(()=>{});throw e}
  }
  return new Response(Buffer.concat(chunks,bytes),{status:response.status,statusText:response.statusText,headers:response.headers})
}
// Shared importers invoke this before saving AND before reusing a cache entry.
// A closed HTML document is insufficient: validate the entire actual schema,
// including event identity, before allowing it into persistent cache.
export function zaPredpomnilnik(html){
  if(jeIzziv(html)||Buffer.byteLength(String(html))>2*1024*1024)return false
  try {
    if(/class="m-MatchDetails"/.test(html)){vZapisnik(html);return true}
    const canonical=[...String(html).matchAll(/<link\b[^>]*>/gi)].find(m=>attr(m[0],'rel')==='canonical')
    const path=safeUrl(attr(canonical?.[0]??'','href')).pathname.match(/^\/competitions\/regionalliga-nordost\/seasons\/(\d{4}-\d{4})\/teams\/([a-zA-Z0-9-]+)$/)
    if(!path)return false
    tekmeEkipe(html,`regionalliga-nordost/${path[1]}`,path[2]);return true
  }catch{return false}
}
async function beri(prenesi,url,name,fresh){
  let html
  try {html=await prenesi(url,name,fresh)}catch(e){if([401,403,429].includes(e.status))throw new DfbZavrnitev(`HTTP ${e.status}`,e.status);throw e}
  if(jeIzziv(html))throw new DfbZavrnitev('izziv (CAPTCHA)')
  if(!zaPredpomnilnik(html))fail('nepopolna javna stran')
  return html
}

/** Exactly 18 discovered team pages, exactly 306 deduplicated league matches. */
export async function tekmeSezone(koda,prenesi){
  const seed='bfc-dynamo',first=tekmeEkipe(await beri(prenesi,naslovEkipe(koda,seed),`team-${koda.replaceAll('/','-')}-${seed}.html`,true),koda,seed)
  const ids=new Set(first.ekipe.map(e=>e.id)),matches=new Map()
  const merge=data=>{
    if(data.ekipe.some(e=>!ids.has(e.id)))fail('razpored vsebuje nepričakovano ekipo')
    for(const t of data.tekme){
      const prev=matches.get(t.id)
      if(prev && JSON.stringify(prev)!==JSON.stringify(t))fail(`razporeda se ne ujemata za tekmo ${t.id}`)
      matches.set(t.id,t)
    }
  }
  merge(first)
  for(const e of first.ekipe.filter(e=>e.id!==seed))merge(tekmeEkipe(await beri(prenesi,e.url,`team-${koda.replaceAll('/','-')}-${e.id}.html`,true),koda,e.id))
  const all=[...matches.values()],pairs=new Set()
  if(all.length!==306)fail('nepopolna sezona: pričakovanih 306 tekem')
  for(let k=1;k<=34;k++){
    const round=all.filter(t=>t.krog===k)
    if(round.length!==9||new Set(round.flatMap(t=>[t.domaciId,t.gostjeId])).size!==18)fail(`nepopoln krog ${k}`)
  }
  for(const t of all){const p=`${t.domaciId}|${t.gostjeId}`;if(pairs.has(p))fail('podvojen par ekip');pairs.add(p)}
  if(pairs.size!==18*17)fail('nepopolni pari ekip')
  return all.sort((a,b)=>a.krog-b.krog||a.datum.localeCompare(b.datum)||a.id.localeCompare(b.id))
}
export function vRazpored(tekme){
  const krogi=new Map()
  for(const t of tekme){if(!krogi.has(t.krog))krogi.set(t.krog,{stevilka:t.krog,tekme:[]});krogi.get(t.krog).tekme.push({...t,dfbId:t.id,zapisnikId:`de-dfb-${t.id}`,odigrana:!!t.izid,kontumacija:false})}
  return [...krogi.values()].sort((a,b)=>a.stevilka-b.stevilka)
}
const vir={
  ime:'dfb',polnoIme:'DFB Datencenter — Regionalliga Nordost',drzava:'DE',osnovniNaslov:BASE,
  glave:{'User-Agent':'SLFF fantasy (slff.eu; splih.94@gmail.com)'},premorMs:3000,imaRegistracije:false,
  naslovRazporeda:koda=>naslovEkipe(koda),
  jeIzziv,zaPredpomnilnik,zavrnitev:(s,status)=>new DfbZavrnitev(s,status),fetch:varniFetch,
  async razporedVseStrani(koda,prenesi){return vRazpored(await tekmeSezone(koda,prenesi))},
  async zapisniki(koda,prenesi){
    const all=await tekmeSezone(koda,prenesi),out=[]
    for(const t of all.filter(t=>t.izid)){
      const fresh=Date.now()-Date.parse(`${t.datum}T00:00:00Z`)<=7*86400000
      const z=vZapisnik(await beri(prenesi,t.url,`match-${t.id}.html`,fresh),{id:t.id,tekma:t})
      out.push({id:z.zapisnikId,z,url:t.url})
    }
    return out
  },
  nastopi,vBesedilo:s=>String(s??'').split('\n'),kljucKluba,poenostavi:kljucKluba,kratkoIme:text,
}
export default vir
