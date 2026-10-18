// Official public DFB Datencenter reports for explicitly registered leagues.
// Profile links are optional and disappear independently of public names. Never
// switch identity according to link availability: all players use name + club,
// with same-team name collisions rejected. Numeric profile IDs are metadata.
import {dfbCalendarEvidence,verifyDfbCalendar} from './dfb-calendar.mjs'
import { encodeUnattributedYellow } from '../../src/lib/nepripisaniRumeni.mjs'
import { razpakiraj } from '../klubi.mjs'
import { nastopi as nastopiPoImenu } from './fss.mjs'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { razberiPostavo as fussballPostava, jeIzziv as fussballIzziv } from './fussball.mjs'

// Public factual evidence only. The registry never changes time/person/side.
const correctionRegistry=JSON.parse(readFileSync(new URL('./dfb-korekcije.json',import.meta.url),'utf8'))
const chronologyRegistry=JSON.parse(readFileSync(new URL('./dfb-kronologija.json',import.meta.url),'utf8'))
const aliasRegistry=JSON.parse(readFileSync(new URL('./dfb-aliasi.json',import.meta.url),'utf8'))
const reserveRegistry=JSON.parse(readFileSync(new URL('./dfb-rezerve.json',import.meta.url),'utf8'))

const leagueRegistry=JSON.parse(readFileSync(new URL('./dfb-lige.json',import.meta.url),'utf8'))
const teamSlug=s=>/^[a-zA-Z0-9]+(?:(?:-|%20)[a-zA-Z0-9]+)*$/.test(s)
const BASE = 'https://datencenter.dfb.de'
const fail = s => {
  const e=new Error(`dfb: ${s}`)
  e.koda=/^nepodprt|^neenolična vrsta/.test(s)?'DFB_UNSUPPORTED_FORMAT':'DFB_INVALID_REPORT'
  throw e
}
export class DfbNepopoln extends Error {
  constructor(s){super(`dfb: nepopoln javni zapisnik: ${s}`);this.nepopoln=true;this.koda='DFB_INCOMPLETE_REPORT'}
}
// Independently reviewed empty official shell, before the first fantasy round.
// This is a pending report, never a fabricated lineup, event or 0-0 result.
const pendingHistorical={id:'de-dfb-2426099',url:'https://datencenter.dfb.de/datencenter/regionalliga-nordost/2026-2027/13-spieltag/hertha-bsc-ii-rsv-eintracht-1949-2426099',sezona:'2026/27',krog:13,datum:'2026-10-16',ura:'19:00',domaci:'Hertha BSC II',gostje:'RSV Eintracht 1949',domaciId:'hertha-bsc-ii',gostjeId:'rsv-eintracht-1949',domaciGoli:0,gostjeGoli:1,polcasDomaci:0,polcasGostje:0}
export const jeCakajociDfb=n=>n?.status==='DFB_PENDING_REPORT'&&Object.entries(pendingHistorical).every(([k,v])=>n[k]===v)
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
function eventSegments(fragment){
  // Captured Nord reports 2405305/2405559 repeat exact goal, card and
  // substitution fragments under a single event icon. Collapse only identical
  // source HTML within that event; different names/profiles/scores stay distinct.
  const seen=new Set()
  return elements(fragment,'div','m-MatchDetails-history-event-text-segment').filter(s=>{
    if(seen.has(s.outer))return false
    seen.add(s.outer);return true
  })
}
function sameClockIncoming(rows,order,side,player){
  // A minute is not an ordering of its HTML rows. These four actual reports
  // put a reserve's goal before his explicit incoming pair at the same clock.
  // The normal substitution parser still validates that pair later; this only
  // establishes goal eligibility, never fabricates an entry or changes a time.
  return rows.some(r=>r.order===order&&elements(r.row.inner,'div','m-MatchDetails-history-event').some(e=>{
    if(!has(e.tag,`m-MatchDetails-history-event--${side?'away':'home'}`)||!/m-MatchDetails-icon-playing--substitute-in/.test(e.inner))return false
    const segments=eventSegments(e.inner)
    if(!segments.length||segments.length%2)return false
    return segments.some((s,i)=>i%2===0&&/m-MatchDetails-icon-caret-right--green/.test(s.inner)&&/m-MatchDetails-icon-caret-right--red/.test(segments[i+1].inner)&&nameKey(identity(text(s.inner).replace(/\s+für$/,'')).ime)===nameKey(player.ime))
  }))
}
function cardEntries(icon,segments){
  const kinds=[...icon.matchAll(/m-MatchDetails-icon-card--([\w-]+)/g)].map(m=>m[1])
  if(!segments.length||!kinds.length||!(kinds.length===1||kinds.length===segments.length)||kinds.some(k=>!['yellow','red','yellow-red'].includes(k)))fail('nepodprt karton')
  // Actual DFB groups several named people at the same minute: one icon is
  // shared by all names, or icons and names align one-for-one in public order.
  return segments.map((segment,i)=>({segment,kind:kinds.length===1?kinds[0]:kinds[i]}))
}
function goalEntries(icon,segments){
  const kinds=[...icon.matchAll(/m-MatchDetails-icon-goal--([\w-]+)/g)].map(m=>m[1])
  if(!segments.length||!kinds.length||!(kinds.length===1||kinds.length===segments.length)||kinds.some(k=>!['goal','penalty','own-goal'].includes(k)))fail('nepodprt gol')
  if(kinds.length>1&&new Set(segments.map(s=>text(s.inner))).size!==segments.length)fail('podvojen združen gol')
  // Actual reports group consecutive same-minute score steps under one icon.
  // Each explicit name+score segment remains an independently verified goal.
  return segments.map((segment,i)=>({segment,kind:kinds.length===1?kinds[0]:kinds[i]}))
}
function orderedTimeline(section){
  const rows=elements(section,'div','m-MatchDetails-history-item').map((row,index)=>{
    const rawMinute=text(one(row.inner,'div','m-MatchDetails-history-minute').inner)
    // Actual DFB labels print plain `90 12'`; a participating club confirms
    // the 12th added-minute goal. Do not generalize to arbitrary two integers.
    const spaced=rawMinute.match(/^90 ([1-9]|[12]\d|30)'$/)
    const time=(spaced?`90+${spaced[1]}'`:rawMinute).match(/^(\d+)(?:\+(\d+))?'$/)
    if(!time||+time[1]>90||+(time[2]??0)>39)fail('nepodprta minuta dogodka')
    return {row,index,rawMinute,spaced,base:+time[1],minute:Math.min(+time[1],90),order:+time[1]*100+ +(time[2]??0)}
  })
  let standardOrder=0,spacedOrder=0,spaceSeen=false
  for(const r of rows){
    if(r.spaced){
      if(r.order<spacedOrder)fail('neveljavno časovno zaporedje')
      spacedOrder=r.order;spaceSeen=true
    }else{
      // Only mixed spellings within the terminal 90-minute tail may merge.
      // Never repair ordinary timing errors or a return to an earlier minute.
      if(r.order<standardOrder||(spaceSeen&&r.base<90))fail('neveljavno časovno zaporedje')
      standardOrder=r.order
    }
  }
  // Both subsequences are already monotonic. A stable merge corrects the
  // observed `90 11' before `90+3'` presentation without inventing timestamps.
  const ordered=spaceSeen?[...rows].sort((a,b)=>a.order-b.order||a.index-b.index):rows
  return {rows:ordered,reordered:ordered.some((r,i)=>r.index!==i)}
}
function eventSignatures(section,profileIdentity=false) {
  const out=[]
  for(const row of elements(section,'div','m-MatchDetails-history-item')){
    const minute=text(one(row.inner,'div','m-MatchDetails-history-minute').inner)
    for(const e of elements(row.inner,'div','m-MatchDetails-history-event').filter(e=>!has(e.tag,'is-empty'))){
      const side=has(e.tag,'m-MatchDetails-history-event--home')?'home':has(e.tag,'m-MatchDetails-history-event--away')?'away':null
      if(!side)fail('dogodek brez ekipe')
      const icon=one(e.inner,'div',`m-MatchDetails-history-event-icon--${side}`).inner
      const kinds=[...icon.matchAll(/m-MatchDetails-icon-(goal|card|playing)--([\w-]+)/g)]
      const rawSegments=eventSegments(e.inner)
      if(kinds.length&&kinds.every(k=>k[1]==='card')){
        for(const {segment,kind} of cardEntries(icon,rawSegments))out.push({type:'card',key:JSON.stringify([side,minute,`m-MatchDetails-icon-card--${kind}`,[text(segment.inner).normalize('NFC'),...(profileIdentity?[identity(segment.inner).profilId]:[])]])})
        continue
      }
      if(kinds.length&&kinds.every(k=>k[1]==='goal')){
        for(const {segment,kind} of goalEntries(icon,rawSegments))out.push({type:'goal',key:JSON.stringify([side,minute,`m-MatchDetails-icon-goal--${kind}`,[text(segment.inner).normalize('NFC')]])})
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
function verifiedScoreCorrections(html,meta,teams,rezultat,polcas,sections){
  const entry=correctionRegistry.matches.find(e=>`de-dfb-${e.id}`===meta.zapisnikId)
  if(!entry)return new Map()
  const reject=()=>fail('nepregledana sprememba zapisnika z omejenim popravkom izida')
  // Compare both ORIGINAL copies first. No correction can hide disagreement.
  const timeline=eventSignatures(sections.get('Spielverlauf')).filter(e=>e.type==='goal').map(e=>e.key).sort()
  const summary=eventSignatures(sections.get('Tore')).map(e=>e.key).sort()
  if(JSON.stringify(timeline)!==JSON.stringify(summary))fail('neujemajoči izvorni dogodki razdelka Tore pred popravkom')
  const metadata={url:meta.url,season:meta.sezona,round:meta.krog,date:meta.datum,time:meta.ura,teams:teams.map(t=>({id:t.virId,name:t.ime})),finalScore:[rezultat.domaci,rezultat.gostje],halfScore:[polcas.domaci,polcas.gostje]}
  if(JSON.stringify(metadata)!==JSON.stringify(entry.metadata))reject()
  if(entry.evidenceFiles)verifyPinnedFiles(entry.evidenceFiles)

  const goals=[]
  for(const row of elements(sections.get('Spielverlauf'),'div','m-MatchDetails-history-item')){
    const clock=text(one(row.inner,'div','m-MatchDetails-history-minute').inner)
    const normalized=clock.replace(/^90 ([1-9]|[12]\d|30)'$/,"90+$1'").match(/^(\d+)(?:\+(\d+))?'$/)
    if(!normalized)reject()
    for(const e of elements(row.inner,'div','m-MatchDetails-history-event').filter(e=>!has(e.tag,'is-empty'))){
      const home=has(e.tag,'m-MatchDetails-history-event--home'),away=has(e.tag,'m-MatchDetails-history-event--away')
      if(home===away)reject()
      const side=home?0:1,icon=one(e.inner,'div',`m-MatchDetails-history-event-icon--${home?'home':'away'}`).inner
      if(!/m-MatchDetails-icon-goal--/.test(icon))continue
      for(const {segment,kind}of goalEntries(icon,elements(e.inner,'div','m-MatchDetails-history-event-text-segment'))){
        const sourceText=text(segment.inner).normalize('NFC'),tokens=[...sourceText.matchAll(/\b(\d+):(\d+)\b/g)]
        if(tokens.length!==1)reject()
        const scorer=identity(sourceText.replace(/\(Elfmeter\)|\(Eigentor\)/g,'').replace(/\bEigentor\b/g,'').replace(/\b\d+:\d+\b/g,'').trim()).ime
        goals.push({side,scorer,clock,normalizedClock:[+normalized[1],+(normalized[2]??0)],ownGoal:kind==='own-goal'||/\bEigentor\b/.test(sourceText),penalty:kind==='penalty'||/\(Elfmeter\)/.test(sourceText),kind,score:[+tokens[0][1],+tokens[0][2]],text:sourceText})
      }
    }
  }
  const fixed=entry.goals.map(g=>({...g}))
  for(const c of entry.corrections){
    const g=fixed[c.index]
    fixed[c.index]={...g,score:c.to,text:g.text.replace(c.from.join(':'),c.to.join(':'))}
  }
  // Whitelist exactly two complete states. Partial upstream fixes, even if
  // individually plausible, require review rather than mixed corrections.
  if(JSON.stringify(goals)===JSON.stringify(fixed))return new Map()
  if(JSON.stringify(goals)!==JSON.stringify(entry.goals))reject()
  const documentSha256=createHash('sha256').update(html).digest('hex')
  return new Map(entry.corrections.map(c=>[c.index,{vrsta:'vmesni-izid',indeksGola:c.index,izvorno:goals[c.index],popravljeno:[...c.to],dokazi:[...entry.evidence],...(entry.evidenceFiles?{dokazniDokumenti:structuredClone(entry.evidenceFiles)}:{}),preverjeno:entry.checkedAt??correctionRegistry.checkedAt,vzorecSha256:entry.sourceFixtureSha256,dokumentSha256:documentSha256}]))
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
function metadata(html, id, liga='regionalliga-nordost') {
  if(!leagueRegistry[liga])fail('neznana liga')
  if (jeIzziv(html)) fail('izziv ali zavrnitev vira')
  if (!/<\/body>\s*<\/html>\s*$/i.test(html)) fail('odrezan ali nepopoln zapisnik')
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].filter(m => attr(m[0], 'rel') === 'canonical')
  if (canonical.length !== 1) fail('manjka kanonična identiteta')
  const url = attr(canonical[0][0], 'href')
  const key = url?.match(new RegExp(/^https:\/\/datencenter\.dfb\.de\/datencenter\/LEAGUE\/(\d{4})-(\d{4})\/(\d+)(?:-spieltag)?\/[a-z0-9-]+-(\d+)$/.source.replace('LEAGUE',liga)))
  if (!key || +key[2] !== +key[1] + 1 || (id && String(id).replace(/^de-dfb-/, '') !== key[4])) fail('neujemanje šifre ali identitete zapisnika')
  const configuration=konfiguracijaDfb(`${liga}/${key[1]}-${key[2]}`)
  if(+key[3]<1||+key[3]>configuration.rounds)fail('neveljaven krog')
  const headline = text(one(html, 'h2', 'm-MatchDetails-headline').inner)
  if (headline !== `${leagueRegistry[liga].name}, ${key[1]}/${key[2]}, ${+key[3]}. Spieltag`) fail('neujemanje sezone ali kroga')
  const date = text(one(html, 'h4', 'm-MatchDetails-subline').inner).match(/, (\d{1,2})\. (\p{L}+) (\d{4}), (\d{2}:\d{2}) Uhr,/u)
  const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  if (!date || !months.includes(date[2])) fail('manjka datum ali ura')
  const datum = `${date[3]}-${String(months.indexOf(date[2])+1).padStart(2,'0')}-${date[1].padStart(2,'0')}`
  if (new Date(`${datum}T00:00:00Z`).toISOString().slice(0,10) !== datum || +date[4].slice(0,2)>23 || +date[4].slice(3)>59) fail('neveljaven datum ali ura')
  if(datum<`${key[1]}-07-01`||datum>`${key[2]}-06-30`)fail('datum izven sezone')
  return { zapisnikId: `de-dfb-${key[4]}`, url, sezona: `${key[1]}/${key[2].slice(2)}`, krog: +key[3], datum, ura: date[4] }
}

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex')
// This is a semantic guard over the complete relevant published report, not
// its changing page shell. Keep all four event copies, profile IDs, source
// spellings/clocks/icons, shirt numbers, goalkeeper markers and staff roles.
export function prstniOdtisVloge(html,liga='regionalliga-nordost'){
  const profiles=s=>[...s.matchAll(/\/profil\/(\d+)(?:[?"'])/g)].map(m=>m[1])
  const icons=s=>[...s.matchAll(/\bclass=["']([^"']*)["']/g)].flatMap(m=>m[1].split(/\s+/).filter(c=>c.startsWith('m-MatchDetails-icon-')))
  const result=one(html,'div','m-MatchDetails-result').inner
  const tables=elements(html,'table','m-MatchDetails-lineup-table').map(t=>({
    title:text(one(t.inner,'thead').inner),
    rows:elements(one(t.inner,'tbody').inner,'tr').map(row=>elements(row.inner,'td').map(c=>({class:attr(c.tag,'class')??'',text:text(c.inner).normalize('NFC'),profiles:profiles(c.inner),icons:icons(c.inner)}))),
    staff:elements(t.inner,'tfoot').map(f=>({text:text(f.inner).normalize('NFC'),profiles:profiles(f.inner),cells:elements(f.inner,'td').map(c=>[attr(c.tag,'class')??'',text(c.inner).normalize('NFC'),profiles(c.inner)])}))
  }))
  const sections=elements(html,'div','m-MatchDetails-history').map(h=>({
    title:text(one(h.inner,'div','m-MatchDetails-history-title').inner),
    rows:elements(h.inner,'div','m-MatchDetails-history-item').map(row=>({
      clock:text(one(row.inner,'div','m-MatchDetails-history-minute').inner),
      events:elements(row.inner,'div','m-MatchDetails-history-event').map(e=>({class:attr(e.tag,'class'),icons:icons(e.inner),segments:elements(e.inner,'div','m-MatchDetails-history-event-text-segment').map(s=>({text:text(s.inner).normalize('NFC'),profiles:profiles(s.inner),icons:icons(s.inner)}))}))
    }))
  }))
  const officials=elements(html,'div','m-MatchDetails-referees').map(e=>({text:text(e.inner).normalize('NFC'),profiles:profiles(e.inner)}))
  return sha256(JSON.stringify({metadata:metadata(html,undefined,liga),subline:text(one(html,'h4','m-MatchDetails-subline').inner),headerInfo:text(one(html,'div','m-MatchDetails-info').inner).normalize('NFC'),officials,result:text(result).normalize('NFC'),teamPaths:elements(result,'a').map(a=>new URL(attr(a.tag,'href'),BASE).pathname),tables,sections}))
}

// Read every use: a changed or missing proof must never survive a cached parse.
function verifyPinnedFiles(files){
  const out={}
  for(const [key,f]of Object.entries(files)){
    let bytes
    try{bytes=readFileSync(new URL(f.file,import.meta.url))}catch{fail('manjkajoč primarni dokaz')}
    if(!/^[a-f0-9]{64}$/.test(f.sha256)||sha256(bytes)!==f.sha256)fail('spremenjen primarni dokaz')
    out[key]=bytes
  }
  return out
}
// A single reviewed same-clock pair, never a generic card/substitution sort.
function verifiedChronology(html,meta,liga,teams,players,sections){
  if(liga!=='regionalliga-suedwest')return null
  const entry=chronologyRegistry.matches.find(e=>`de-dfb-${e.id}`===meta.zapisnikId)
  if(!entry)return null
  const reject=()=>fail('nepregledana sprememba zapisnika z dokazom kronologije')
  if(entry.league!==liga||prstniOdtisVloge(html,liga)!==entry.semanticSha256)reject()
  verifyPinnedFiles(entry.evidenceFiles)
  const incoming=players[entry.side]?.get(nameKey(entry.incoming.name)),outgoing=players[entry.side]?.get(nameKey(entry.outgoing.name))
  if(teams[entry.side]?.virId!==entry.teamId||!incoming||!outgoing||incoming.zacetnik||!outgoing.zacetnik||incoming.profilId!==entry.incoming.profileId||outgoing.profilId!==entry.outgoing.profileId)reject()
  // The dedicated copies remain original; reject disagreement before any state
  // change, then reconcile their original grouped counts again after processing.
  const signatures=eventSignatures(sections.get('Spielverlauf'),true)
  for(const [section,type]of [['Karten','card'],['Wechsel','substitute']]){
    const expected=signatures.filter(e=>e.type===type).map(e=>e.key).sort(),observed=eventSignatures(sections.get(section),true).map(e=>e.key).sort()
    if(JSON.stringify(expected)!==JSON.stringify(observed))reject()
  }
  let red=null,substitution=null
  const rows=elements(sections.get('Spielverlauf'),'div','m-MatchDetails-history-item')
  for(const [index,row]of rows.entries()){
    const clock=text(one(row.inner,'div','m-MatchDetails-history-minute').inner)
    for(const e of elements(row.inner,'div','m-MatchDetails-history-event').filter(e=>!has(e.tag,'is-empty'))){
      const side=has(e.tag,'m-MatchDetails-history-event--home')?0:1
      if(side!==entry.side)continue
      const icon=one(e.inner,'div',`m-MatchDetails-history-event-icon--${side?'away':'home'}`).inner,segments=eventSegments(e.inner)
      if(/m-MatchDetails-icon-card--/.test(icon))for(const {segment,kind}of cardEntries(icon,segments)){
        const who=identity(segment.inner)
        if(who.ime!==entry.incoming.name)continue
        if(red||kind!=='red'||who.profilId!==entry.incoming.profileId||clock!==entry.clock)reject()
        red={index,signature:eventSignatures(row.outer,true).find(e=>e.type==='card').key}
      }
      if(/m-MatchDetails-icon-playing--substitute-in/.test(icon))for(let i=0;i<segments.length;i+=2){
        const who=identity(segments[i].inner.replace(/(?:&nbsp;|\u00a0|\s)+für\s*$/,''))
        if(who.ime!==entry.incoming.name)continue
        if(substitution||i!==entry.pairIndex*2||clock!==entry.clock||who.profilId!==entry.incoming.profileId||!segments[i+1]||!/m-MatchDetails-icon-caret-right--green/.test(segments[i].inner)||!/m-MatchDetails-icon-caret-right--red/.test(segments[i+1].inner))reject()
        const out=identity(segments[i+1].inner)
        if(out.ime!==entry.outgoing.name||out.profilId!==entry.outgoing.profileId)reject()
        substitution={index,signature:eventSignatures(row.outer,true).find(e=>e.type==='substitute').key}
      }
    }
  }
  if(!red||!substitution||red.index>=substitution.index)reject()
  const proof=structuredClone({vrsta:'dokazana-kronologija-iste-ure',zapisnikId:meta.zapisnikId,ekipaIdx:entry.side,izvornaUra:entry.clock,par:entry.pairIndex,vstop:entry.incoming,izstop:entry.outgoing,izvorniVrstniRed:{rdeci:red.index,menjava:substitution.index},izvorniDogodki:{rdeci:red.signature,menjava:substitution.signature},dokazniDokumenti:entry.evidenceFiles,preverjeno:entry.checkedAt,vzorecSha256:entry.sourceFixtureSha256,dokumentSha256:sha256(html),semantikaSha256:entry.semanticSha256,opozorilo:entry.warning})
  return {entry,incoming,outgoing,proof,applied:false,consumed:false}
}
export function preveriDokazAliasa(entry,files){
  const reject=()=>fail('neveljaven primarni dokaz aliasa')
  for(const [key,f]of Object.entries(entry.files))if(!files[key]||sha256(files[key])!==f.sha256)reject()
  const dfb=text(files.dfb.toString('utf8')),fsv=text(files.fsv.toString('utf8')),transfer=text(files.transfer.toString('utf8'))
  if(entry.birthDate!=='2001-06-23'||entry.target.profileId!=='374531'||entry.target.name!=='Noah Agbaje'||entry.source.name!=='Noah Shawn Agbaje'||entry.source.profileId!==null||entry.files.dfb.url!=='https://datencenter.dfb.de/profil/374531'||!dfb.includes('Noah Agbaje')||!dfb.includes('23.06.2001')||!dfb.includes('SV Wacker Burghausen')||!dfb.includes('FSV Zwickau')||!fsv.includes('Noah Shawn')||!fsv.includes('Agbaje')||!fsv.includes('23-06-2001')||!transfer.includes('Noah Shawn Agbaje')||!transfer.includes('Wacker Burghausen'))reject()
  return structuredClone({vrsta:'match-only-scorer-alias',zapisnikId:`de-dfb-${entry.id}`,side:entry.side,teamId:entry.teamId,source:entry.source,target:entry.target,birthDate:entry.birthDate,dokazi:entry.files,preverjeno:entry.checkedAt,vzorecSha256:entry.sourceFixtureSha256,semantikaSha256:entry.semanticSha256,obseg:entry.scope})
}
function verifiedGoalAlias(html,meta,liga,teams,players){
  if(liga!=='regionalliga-bayern')return null
  const entry=aliasRegistry.matches.find(e=>`de-dfb-${e.id}`===meta.zapisnikId)
  if(!entry)return null
  if(liga!==entry.league||prstniOdtisVloge(html,liga)!==entry.semanticSha256)fail('nepregledana sprememba zapisnika z aliasom')
  const p=players[entry.side]?.get(nameKey(entry.target.name))
  if(teams[entry.side]?.virId!==entry.teamId||!p||p.profilId!==entry.target.profileId||players.some(m=>m.has(nameKey(entry.source.name))))fail('nasprotujoča identiteta aliasa')
  return {entry,player:p,proof:preveriDokazAliasa(entry,verifyPinnedFiles(entry.files))}
}

/** Verify pinned ordinary public same-match documents with the existing strict
 * font decoder. The fragment has no own match ID: its captured URL+hash MUST
 * be the exact AJAX anchor published by the canonical main document. */
export function preveriDokazRezerve(entry,files){
  const reject=()=>fail('neveljaven primarni dokaz rezerve iste tekme')
  try{
    if(entry.sourceFixtureSha256!==entry.files.dfb.sha256)reject()
    for(const [key,f]of Object.entries(entry.files))if(!files[key]||!/^[a-f0-9]{64}$/.test(f.sha256)||sha256(files[key])!==f.sha256)reject()
    const main=files.main.toString('utf8'),lineup=files.lineup.toString('utf8'),css=files.css.toString('utf8'),dfb=files.dfb.toString('utf8')
    // The ordinary FF page includes an optional contact-form captcha. Use
    // that source's existing challenge detector, never interact with the form.
    if(fussballIzziv(main)||fussballIzziv(lineup)||!/<\/html>\s*$/i.test(main))reject()
    // link/meta are void elements; inspect their opening tags directly.
    const links=[...main.matchAll(/<link\b[^>]*>/g)].filter(m=>attr(m[0],'rel')==='canonical')
    const og=[...main.matchAll(/<meta\b[^>]*>/g)].filter(m=>attr(m[0],'property')==='og:url')
    const title=[...main.matchAll(/<meta\b[^>]*>/g)].filter(m=>attr(m[0],'property')==='og:title')
    const date=entry.date.split('-').reverse().join('.')
    if(links.length!==1||og.length!==1||title.length!==1||attr(links[0][0],'href')!==entry.files.main.url||attr(og[0][0],'content')!==entry.files.main.url||!entry.files.main.url.endsWith(`/spiel/${entry.matchId}`)||attr(title[0][0],'content')!==`${entry.teams.join(' - ')} Ergebnis: Regionalliga Nordost - Herren - ${date}`)reject()
    const anchors=elements(main,'a').filter(a=>attr(a.tag,'href')===entry.files.lineup.url&&attr(a.tag,'data-ajax-resource')===entry.files.lineup.url&&text(a.inner)==='Aufstellung')
    if(anchors.length!==1||entry.files.lineup.url!==`https://www.fussball.de/ajax.match.lineup/-/mode/PAGE/spiel/${entry.matchId}/ticker-id/selectedTickerId`)reject()
    if(text(one(main,'ul','stage-meta-right').inner)!==`Staffel-ID: ${entry.staffelId} Spiel: ${entry.matchNumber} / ${entry.round}. Spieltag`)reject()
    if(!main.includes('data-obfuscation-stylesheet="//www.fussball.de/export.fontface/-/id/%ID%/type/css"')||entry.files.css.url!==`https://www.fussball.de/export.fontface/-/id/${entry.fontId}/type/css`||entry.files.font.url!==`https://www.fussball.de/export.fontface/-/format/woff/id/${entry.fontId}/type/font`||!css.includes(`url('//www.fussball.de/export.fontface/-/format/woff/id/${entry.fontId}/type/font') format('woff')`))reject()
    const heads=elements(one(lineup,'div','head').inner,'div','club-name')
    if(heads.length!==2||heads.some((h,i)=>text(h.inner)!==entry.teams[i]||!attr(one(h.inner,'a').tag,'href')?.endsWith(`/saison/2526/team-id/${entry.teamIds[i]}`)))reject()
    const teams=fussballPostava(lineup,{fonts:{[entry.fontId]:{bytes:files.font,sha256:entry.files.font.sha256}}}),a=entry.alias
    const reserve=teams[a.dfb.side]?.rezerve.filter(p=>p.virId===a.fussball.identity)
    if(reserve?.length!==1||reserve[0].ime!==a.fussball.name||reserve[0].st!==a.fussball.jersey||reserve[0].vratar!==a.fussball.goalkeeperMarker)reject()
    if(metadata(dfb).zapisnikId!==`de-dfb-${entry.id}`||prstniOdtisVloge(dfb)!==entry.semanticSha256)reject()
    const cards=elements(dfb,'div','m-MatchDetails-history-event-text-segment').filter(s=>identity(s.inner).profilId===a.dfb.profileId)
    if(cards.length!==2||cards.some(s=>identity(s.inner).ime!==a.dfb.name))reject()
    return structuredClone({vrsta:'rezerva-iste-tekme',zapisnikId:`de-dfb-${entry.id}`,alias:a,dokazi:entry.files,preverjeno:entry.checkedAt,vzorecSha256:entry.sourceFixtureSha256,semantikaSha256:entry.semanticSha256,obseg:entry.scope,ujemanjeProfila:entry.aliasEvidence})
  }catch(e){if(e.koda==='DFB_INVALID_REPORT')throw e;reject()}
}

function verifiedReserve(html,meta,tables,teams,players,coaches){
  const entry=reserveRegistry.matches.find(e=>`de-dfb-${e.id}`===meta.zapisnikId)
  // An upstream published bench always owns its role decisions. Never fall
  // back if that bench fails to name the recipient or supplies a conflict.
  if(!entry||tables.length!==1)return []
  if(prstniOdtisVloge(html)!==entry.semanticSha256)fail('nepregledana sprememba zapisnika z dokazom rezerve')
  let files
  try{files=Object.fromEntries(Object.entries(entry.files).map(([key,f])=>[key,readFileSync(new URL(`../vzorci/${f.file}`,import.meta.url))]))}catch{fail('manjka primarni dokaz rezerve iste tekme')}
  const proof=preveriDokazRezerve(entry,files),a=entry.alias.dfb,key=nameKey(a.name),side=a.side
  if(teams[side]?.virId!==a.teamId||players[side].has(key)||coaches[side].has(key)||[...players[side].values()].some(p=>p.st===entry.alias.fussball.jersey))fail('nasprotujoča identiteta dokazane rezerve')
  const p={ime:a.name,profilId:a.profileId,st:entry.alias.fussball.jersey,regSt:null,virId:`de-dfb-${a.teamId}-${key}`,vratar:null,vratarVir:null,zacetnik:false,dokazVloge:proof}
  teams[side].rezerve.push(p);players[side].set(key,p)
  return [proof]
}

/** A complete played public match report; every discrepancy rejects the report. */
export function vZapisnik(html, { id, tekma, liga='regionalliga-nordost' } = {}) {
  const meta = metadata(String(html), id, liga)
  const configuration=konfiguracijaDfb(`${liga}/${new URL(meta.url).pathname.split('/')[3]}`)
  const result = one(html, 'div', 'm-MatchDetails-result').inner
  const teams = elements(result, 'div', 'm-MatchDetails-team').map(e => {
    const a = one(e.inner, 'a')
    const path = safeUrl(attr(a.tag, 'href')).pathname.match(new RegExp(/^\/competitions\/LEAGUE\/seasons\/(\d{4})-(\d{4})\/teams\/([a-zA-Z0-9%\-]+)$/.source.replace('LEAGUE',liga)))
    if (!path || !teamSlug(path[3]) || `${liga}/seasons/${path[1]}-${path[2]}` !== configuration.pot) fail('neujemanje identitete ekipe')
    return { ime: text(one(e.inner, 'div', 'm-MatchDetails-title').inner), virId: path[3], postava: [], rezerve: [] }
  })
  if (teams.length !== 2 || teams[0].virId === teams[1].virId) fail('nepopolni ekipi')
  const score = text(one(result, 'div', 'm-MatchDetails-score').inner).match(/^(\d+):(\d+) \((\d+):(\d+)\)$/)
  if (!score) fail('manjka končni izid ali polčas')
  const rezultat = { domaci: +score[1], gostje: +score[2] }, polcas = { domaci: +score[3], gostje: +score[4] }
  if (polcas.domaci > rezultat.domaci || polcas.gostje > rezultat.gostje) fail('neveljaven polčas')
  const tables = elements(html, 'table', 'm-MatchDetails-lineup-table')
  const pending={id:meta.zapisnikId,url:meta.url,sezona:meta.sezona,krog:meta.krog,datum:meta.datum,ura:meta.ura,domaci:teams[0].ime,gostje:teams[1].ime,domaciId:teams[0].virId,gostjeId:teams[1].virId,domaciGoli:rezultat.domaci,gostjeGoli:rezultat.gostje,polcasDomaci:polcas.domaci,polcasGostje:polcas.gostje,status:'DFB_PENDING_REPORT'}
  if(!tables.length&&jeCakajociDfb(pending)){
  if(tekma){
    for(const k of ['krog','datum','ura','sezona'])if(tekma[k]!=null&&tekma[k]!==meta[k])fail(`razpored: neujemanje ${k}`)
    for(const [i,k] of ['domaci','gostje'].entries()){
      if(tekma[k]!=null&&tekma[k]!==teams[i].ime)fail(`razpored: neujemanje ${k}`)
      if(tekma[`${k}Id`]!=null&&tekma[`${k}Id`]!==teams[i].virId)fail(`razpored: neujemanje identitete ${k}`)
    }
    if(tekma.izid&&(tekma.izid.domaci!==rezultat.domaci||tekma.izid.gostje!==rezultat.gostje))fail('razpored: neujemanje izida')
  }
    let rest=one(html,'div','m-MatchDetails-content').inner
    for(const cls of ['m-MatchDetails-head','m-MatchDetails-result','m-MatchDetails-referees'])rest=rest.replace(one(rest,'div',cls).outer,'')
    if(!rest.trim()&&!/m-MatchDetails-history|m-MatchDetails-lineup|\/profil\//.test(html)){
      const e=new DfbNepopoln('2426099: uradna postava in dogodki še niso objavljeni')
      e.koda='DFB_PENDING_REPORT';e.podatki=pending;throw e
    }
  }
  // Some official archive reports omit the bench entirely. Named incoming
  // substitutions establish played reserves. An unknown ordinary-yellow
  // recipient never establishes a reserve role; Nordost retains its proof gate.
  if (![1,2].includes(tables.length) || !/Aufstellung/.test(tables[0].inner) || (tables[1]&&!/Auswechselspieler/.test(tables[1].inner))) fail('nepopolna postava ali klop')
  const coaches = [new Map(), new Map()]
  const playerCoaches=[new Set(),new Set()]
  const allowUnattributed=liga!=='regionalliga-nordost'
  for (const [idx, table] of tables.entries()) {
    const body = one(table.inner, 'tbody').inner
    const seenPeople=[new Set(),new Set()]
    for (const row of elements(body, 'tr')) {
      for (const [side, sideName] of ['home','away'].entries()) {
        const person = one(row.inner, 'td', `m-MatchDetails-lineup-person--${sideName}`)
        const numberCell=one(row.inner, 'td', `m-MatchDetails-lineup-number--${sideName}`)
        const number = text(numberCell.inner)
        if (!text(person.inner) && !number) continue
        // Report2401942 repeats exact person+jersey cells in XI and bench;
        // unequal bench lengths pair them with different opposite-side rows.
        // Collapse identical source cells only, never conflicting identities,
        // optional profiles, goalkeeper markers or jersey numbers.
        const sourceCells=JSON.stringify([person.outer,numberCell.outer])
        if(seenPeople[side].has(sourceCells))continue
        seenPeople[side].add(sourceCells)
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
    for (const [side, name] of ['home','away'].entries()) for (const cell of elements(foot, 'td', `m-MatchDetails-lineup-person--${name}`)) {
      const coachRow=elements(foot,'tr').find(row=>row.outer.includes(cell.outer))
      // Repeated public coach entries may share one cell separated by <br>.
      for(const fragment of cell.inner.split(/<br\s*\/?\s*>/i))if(text(fragment)){
        const who=identity(fragment),key=nameKey(who.ime),prior=coaches[side].get(key)
        if(allowUnattributed&&prior?.profilId&&who.profilId&&prior.profilId!==who.profilId)fail('nasprotujoča identiteta uradne osebe')
        const trener=elements(coachRow?.inner??'','td','m-MatchDetails-lineup-role').some(c=>/(?:^|\s)(?:Co-)?Trainer(?:\/in)?(?:\s|$)/.test(text(c.inner)))
        coaches[side].set(key,{...who,profilId:who.profilId??prior?.profilId??null,trener:(trener&&!!who.profilId)||prior?.trener===true})
      }
    }
  }
  const players = teams.map((t,side) => {
    if (t.postava.length !== 11 || t.postava.filter(p=>p.vratar).length !== 1) fail('nepopolna začetna postava ali vratar')
    const map = new Map()
    for (const p of [...t.postava,...t.rezerve]) {
      if (map.has(nameKey(p.ime))) fail('dvoumna identiteta: soimenjaka v isti ekipi')
      if(coaches[side].has(nameKey(p.ime))){
        if(!allowUnattributed||!coaches[side].get(nameKey(p.ime)).trener||!p.profilId||p.profilId!==coaches[side].get(nameKey(p.ime)).profilId)fail('nasprotujoča vloga igralca in uradne osebe')
        playerCoaches[side].add(nameKey(p.ime))
      }
      if ([...map.values()].some(x=>x.st===p.st)) fail('podvojen dres')
      map.set(nameKey(p.ime),p)
    }
    return map
  })
  const histories = elements(html, 'div', 'm-MatchDetails-history')
  const sections = new Map(histories.map(h=>[text(one(h.inner,'div','m-MatchDetails-history-title').inner),h.inner]))
  if (histories.length!==4 || sections.size !== 4 || ['Spielverlauf','Tore','Karten','Wechsel'].some(k=>!sections.has(k))) fail('nepopolni dogodki zapisnika')
  const dopolnitveVlog=verifiedReserve(html,meta,tables,teams,players,coaches)
  // An archive may omit the bench, yet caution a substitute before his entry.
  // Predeclare ONLY explicit incoming players in this same full timeline.
  // This establishes match role, never playing time; chronological processing
  // still rejects entry after dismissal and all invalid substitution pairs.
  if(tables.length===1)for(const row of elements(sections.get('Spielverlauf'),'div','m-MatchDetails-history-item')){
    for(const e of elements(row.inner,'div','m-MatchDetails-history-event').filter(e=>!has(e.tag,'is-empty'))){
      if(!/m-MatchDetails-icon-playing--substitute-in/.test(e.inner))continue
      const side=has(e.tag,'m-MatchDetails-history-event--home')?0:has(e.tag,'m-MatchDetails-history-event--away')?1:null
      if(side==null)fail('dogodek brez ekipe')
      const segments=elements(e.inner,'div','m-MatchDetails-history-event-text-segment')
      if(!segments.length||segments.length%2)fail('menjava brez para')
      for(let i=0;i<segments.length;i+=2){
        if(!/m-MatchDetails-icon-caret-right--green/.test(segments[i].inner)||!/m-MatchDetails-icon-caret-right--red/.test(segments[i+1].inner))fail('menjava brez smeri')
        const who=identity(segments[i].inner.replace(/(?:&nbsp;|\u00a0|\s)+für\s*$/,'')),key=nameKey(who.ime)
        if(coaches[side].has(key))fail('nasprotujoča vloga igralca in uradne osebe')
        if(!players[side].has(key)){
          const p={...who,st:null,regSt:null,virId:`de-dfb-${teams[side].virId}-${key}`,vratar:null,vratarVir:null,zacetnik:false}
          players[side].set(key,p);teams[side].rezerve.push(p)
        }
      }
    }
  }
  const goalAlias=verifiedGoalAlias(html,meta,liga,teams,players)
  const chronology=verifiedChronology(html,meta,liga,teams,players,sections)
  const scoreCorrections=verifiedScoreCorrections(html,meta,teams,rezultat,polcas,sections)
  const popravki=[...scoreCorrections.values()]
  const nepripisaniRumeni=[]
  const goli=[], rumeni=[], rdeci=[], menjave=[], uradneKazni=[], opozorila=popravki.map(c=>`Uradni vmesni izid ${c.izvorno.score.join(':')}: preverjen popravek v ${c.popravljeno.join(':')} za ${c.izvorno.scorer} (${c.izvorno.clock}); izvor in dokazi so ohranjeni.`)
  const scoreWarning=correctionRegistry.matches.find(e=>`de-dfb-${e.id}`===meta.zapisnikId)?.warning
  if(scoreWarning)opozorila.push(scoreWarning)
  if(chronology)opozorila.push(chronology.entry.warning)
  for(const proof of dopolnitveVlog)opozorila.push(`${proof.alias.dfb.name}: vloga navedene rezerve dokazana z uradno klopjo iste tekme; brez izpeljanega vstopa, minut ali clean sheeta.`)
  if(goalAlias)opozorila.push(`${goalAlias.entry.source.name}: preverjen alias strelca za ${goalAlias.entry.target.name}; izvorno ime in primarni dokazi so ohranjeni.`)
  const active=teams.map(t=>new Set(t.postava.map(p=>p.virId)))
  const counters={goal:0,card:0,substitute:0}
  // Eligibility survives leaving/never entering the pitch. The active set alone
  // cannot distinguish an unused reserve from a reserve dismissed on the bench.
  const discipline=new Map()
  // Unresolved recipients still supply identity evidence for later cards;
  // retaining it here must never create a roster member or appearance.
  const unresolvedRecipients=[new Map(),new Map()]
  const applySubstitution=(noter,ven,side,minute)=>{
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
  const runningScore=[0,0]
  const timeline=orderedTimeline(sections.get('Spielverlauf'))
  if(timeline.reordered)opozorila.push('Popravljen vrstni red mešanih zapisov dodatka k 90. minuti po izrecnih časih; vrstni red vsake oblike je ohranjen.')
  for (const {row,rawMinute,spaced,minute,order} of timeline.rows) {
    if(spaced)opozorila.push(`Minuta ${rawMinute}: presledek v uradnem zapisu dodatka k 90. minuti; izvorni zapis ohranjen.`)
    const events=elements(row.inner,'div','m-MatchDetails-history-event').filter(e=>!has(e.tag,'is-empty'))
    if (!events.length || events.length>2)fail('nepopoln dogodek')
    for (const e of events) {
      const side=has(e.tag,'m-MatchDetails-history-event--home')?0:has(e.tag,'m-MatchDetails-history-event--away')?1:null
      if(side==null)fail('dogodek brez ekipe')
      const icon=one(e.inner,'div',`m-MatchDetails-history-event-icon--${side?'away':'home'}`).inner
      const segments=eventSegments(e.inner)
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
      const event=(p,personSide=side)=>({ime:p.ime,st:p.st,virId:p.virId,ekipaIdx:personSide,minuta:minute,...(spaced?{minutaZapis:rawMinute}:{})})
      if (/m-MatchDetails-icon-goal--/.test(icon)) {
        for(const {segment,kind} of goalEntries(icon,segments)){
        const avtogol=kind==='own-goal'||/\bEigentor\b/.test(text(segment.inner))
        const personSide=avtogol?1-side:side
        const alias=goalAlias&&personSide===goalAlias.entry.side&&identity(text(segment.inner).replace(/\(Elfmeter\)|\(Eigentor\)/g,'').replace(/\bEigentor\b/g,'').replace(/\b\d+:\d+\b/g,'').trim()).ime===goalAlias.entry.source.name?goalAlias:null
        const p=alias?.player??resolve(segment.inner,false,false,personSide)
        if(p.offiziell)fail('gol uradne osebe')
        if(!active[personSide].has(p.virId)&&!(!p.zacetnik&&p.noter==null&&p.rdec==null&&sameClockIncoming(timeline.rows,order,personSide,p)))fail('gol neaktivnega igralca: ni vstopa ali je že izstopil')
        // Actual DFB penalties retain the ordinary goal icon; their distinction
        // is the explicit public `(Elfmeter)` text next to the player's name.
        const enajstmetrovka=kind==='penalty'||/\(Elfmeter\)/.test(text(segment.inner))
        // In all observed own-goal formats the event sits on the beneficiary
        // side, while the named scorer belongs to the opposite official XI.
        runningScore[side]++
        const scoreTokens=[...text(segment.inner).matchAll(/\b(\d+):(\d+)\b/g)]
        if(scoreTokens.length!==1)fail('neveljavno zaporedje izidov pri golih')
        const sourceScore=[+scoreTokens[0][1],+scoreTokens[0][2]],correction=scoreCorrections.get(counters.goal),stageScore=correction?.popravljeno??sourceScore
        if(stageScore[0]!==runningScore[0]||stageScore[1]!==runningScore[1])fail('neveljavno zaporedje izidov pri golih')
        goli.push({...event(p,personSide),avtogol,enajstmetrovka,...(alias?{imeVir:alias.entry.source.name,dokazAliasa:alias.proof}:{}),rezultat:[...runningScore],...(correction?{rezultatVir:sourceScore,popravekIzida:correction}:{})});counters.goal++
        }
      } else if (/m-MatchDetails-icon-card--/.test(icon)) {
        for(const {segment,kind} of cardEntries(icon,segments)){
        const who=identity(segment.inner),personKey=nameKey(who.ime)
        const player=players[side].get(personKey),coach=coaches[side].get(personKey)
        // Unknown role is never proof of a bench appearance. Explicit opposite
        // side identity or a conflicting public profile is a contradiction.
        const otherPeople=[...players[1-side].values(),...coaches[1-side].values(),...unresolvedRecipients[1-side].values()]
        if(allowUnattributed&&otherPeople.some(p=>(!player&&!coach&&nameKey(p.ime)===personKey)||(who.profilId&&p.profilId===who.profilId)))fail('nasprotujoča identiteta ekipe pri kartonu')
        if(allowUnattributed&&who.profilId&&[player,coach,unresolvedRecipients[side].get(personKey)].some(p=>p?.profilId&&p.profilId!==who.profilId))fail('nasprotujoča profilna identiteta pri kartonu')
        if(allowUnattributed&&who.profilId&&[...players[side].values(),...coaches[side].values(),...unresolvedRecipients[side].values()].some(p=>p.profilId===who.profilId&&nameKey(p.ime)!==personKey))fail('nasprotujoča profilna identiteta pri kartonu')
        const reason=playerCoaches[side].has(personKey)?'player-coach':!player&&!coach?'unknown-role':null
        if(allowUnattributed&&reason){
          if(kind!=='yellow')fail('neznana ali dvoumna vloga pri izključitvi')
          const key=`${side}|unattributed|${personKey}`
          if(discipline.get(key)?.yellow)fail('podvojen rumeni karton brez izključitve')
          discipline.set(key,{yellow:true,dismissed:false})
          unresolvedRecipients[side].set(personKey,who)
          const evidence={source:'dfb',matchId:meta.zapisnikId,sourceUrl:meta.url,side,clock:rawMinute,minute,reason,eventSha256:sha256(JSON.stringify([meta.zapisnikId,side,rawMinute,kind,segment.outer])),ordinal:counters.card,profileId:who.profilId}
          nepripisaniRumeni.push(evidence);opozorila.push(encodeUnattributedYellow(evidence));counters.card++;continue
        }
        const p=resolve(segment.inner)
        if(chronology&&side===chronology.entry.side&&who.ime===chronology.entry.incoming.name&&rawMinute===chronology.entry.clock){
          if(chronology.applied||kind!=='red'||p!==chronology.incoming)fail('neveljavna uporaba dokazane kronologije')
          applySubstitution(chronology.incoming,chronology.outgoing,side,minute)
          chronology.applied=true
        }
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
          if(chronology&&side===chronology.entry.side&&rawMinute===chronology.entry.clock&&i===chronology.entry.pairIndex*2){
            if(!chronology.applied||chronology.consumed||noter!==chronology.incoming||ven!==chronology.outgoing)fail('neveljavna uporaba dokazane kronologije')
            chronology.consumed=true
          }else applySubstitution(noter,ven,side,minute)
        }
        counters.substitute++
      } else fail('nepodprt dogodek')
    }
  }
  if(chronology&&(!chronology.applied||!chronology.consumed))fail('nepopolna uporaba dokazane kronologije')
  // Compare identity, type, side, exact added-time minute and score/text, not
  // merely counts. Dedicated sections must describe precisely the same events.
  const timelineSignatures=eventSignatures(sections.get('Spielverlauf'),allowUnattributed)
  for(const [section,kind] of [['Tore','goal'],['Karten','card'],['Wechsel','substitute']]){
    const expected=timelineSignatures.filter(e=>e.type===kind).map(e=>e.key).sort()
    const observed=eventSignatures(sections.get(section),allowUnattributed).map(e=>e.key).sort()
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
  const z={...meta,domaci:teams[0],gostje:teams[1],rezultat,polcas,goli,rumeni,rdeci,menjave,zgresene:[],uradneKazni,opozorila,popravki,dopolnitveVlog,...(chronology?{popravkiKronologije:[chronology.proof]}:{}),...(nepripisaniRumeni.length?{nepripisaniRumeni}:{})}
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

export function konfiguracijaDfb(koda){
  const m=String(koda??'').match(/^(regionalliga-[a-z]+)\/(\d{4})-(\d{4})$/)
  const league=m&&leagueRegistry[m[1]],season=league?.seasons[`${m[2]}-${m[3]}`]
  if(!season||+m[3]!==+m[2]+1)fail('šifra lige ali sezona ni registrirana')
  return Object.freeze({liga:m[1],name:league.name,sezona:`${m[2]}/${m[3].slice(2)}`,leto:+m[2],pot:`${m[1]}/seasons/${m[2]}-${m[3]}`,...season})
}
export function razberiKodo(koda){const {pot,sezona,leto}=konfiguracijaDfb(koda);return {pot,sezona,leto}}
export const naslovEkipe=(koda,slug=konfiguracijaDfb(koda).seed)=>{
  if(!teamSlug(slug))fail('neveljavna šifra ekipe')
  return `${BASE}/competitions/${razberiKodo(koda).pot}/teams/${slug}`
}
const safeUrl=s=>{
  const raw=razpakiraj(s)
  if(/%(?:2f|5c|2e|25)|(?:^|\/)\.\.?(?:\/|$)|\\/i.test(raw.split('?')[0]))fail('neveljavna pot uradnega vira')
  const u=new URL(raw,BASE)
  if(u.origin!==BASE || u.username || u.password)fail('povezava izven uradnega vira')
  return u
}

/** Parse one actual season-team schedule; never infer IDs, rounds or URLs. */
export function tekmeEkipe(html,koda,slug) {
  const conf=konfiguracijaDfb(koda),expected=naslovEkipe(koda,slug)
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
      const url=safeUrl(attr(a.tag,'href')),m=url.pathname.match(/^\/competitions\/(regionalliga-[a-z]+\/seasons\/\d{4}-\d{4})\/teams\/([a-zA-Z0-9%\-]+)$/)
      if(!m||!teamSlug(m[2])||m[1]!==conf.pot)fail('neujemanje sezone ekipe')
      const ime=text(a.inner)
      if(!ime)fail('manjka ime ekipe')
      if(ek.has(m[2])&&ek.get(m[2]).ime!==ime)fail('neenolično ime ekipe')
      const team={id:m[2],ime,url:`${BASE}${url.pathname}`};ek.set(team.id,team);return team
    })
    if(homeAway[0].id===homeAway[1].id || !homeAway.some(t=>t.id===slug))fail('razpored druge ekipe')
    const score=one(row.inner,'div','c-MatchTable-score'),a=one(score.inner,'a'),url=safeUrl(attr(a.tag,'href'))
    const match=url.pathname.match(new RegExp(/^\/datencenter\/LEAGUE\/(\d{4})-(\d{4})\/(\d+)(?:-spieltag)?\/[a-z0-9-]+-(\d+)$/.source.replace('LEAGUE',conf.liga)))
    if(!match || +match[1]!==conf.leto || +match[2]!==conf.leto+1 || match[4]!==ids[0])fail('neujemanje šifre ali identitete tekme')
    const time=text(one(row.inner,'div','c-MatchTable-description').inner).match(/, (\d{2})\.(\d{2})\.(\d{4})(?: (\d{2}:\d{2}) Uhr)?$/)
    if(!time)fail('manjka datum tekme v razporedu')
    const datum=`${time[3]}-${time[2]}-${time[1]}`
    if(new Date(`${datum}T00:00:00Z`).toISOString().slice(0,10)!==datum || datum<`${conf.leto}-07-01` || datum>`${conf.leto+1}-06-30` || (time[4] && (+time[4].slice(0,2)>23 || +time[4].slice(3)>59)))fail('neveljaven datum razporeda')
    const val=text(a.inner),sc=val.match(/^(\d+) : (\d+)$/)
    if(!sc && val!=='- : -' && val!=='- : - verl.')fail('nepodprt izid razporeda')
    tekme.push({id:ids[0],krog:+match[3],sezona:conf.sezona,datum,ura:time[4]??null,domaci:homeAway[0].ime,gostje:homeAway[1].ime,domaciId:homeAway[0].id,gostjeId:homeAway[1].id,izid:sc?{domaci:+sc[1],gostje:+sc[2]}:null,url:url.href})
  }
  const games=2*(conf.teams-1)
  if(tekme.length!==games||new Set(tekme.map(t=>t.id)).size!==games||new Set(tekme.map(t=>t.krog)).size!==games||tekme.some(t=>t.krog<1||t.krog>conf.rounds)||ek.size!==conf.teams)fail('nepopoln omejen razpored: nepričakovani krogi ali ekipe')

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
const ligaZapisnika=html=>{
  const canonical=[...String(html).matchAll(/<link\b[^>]*>/gi)].filter(m=>attr(m[0],'rel')==='canonical')
  return canonical.length===1?attr(canonical[0][0],'href')?.match(/^https:\/\/datencenter\.dfb\.de\/datencenter\/(regionalliga-[a-z]+)\//)?.[1]:null
}
export function zaPredpomnilnik(html){
  if(jeIzziv(html)||Buffer.byteLength(String(html))>2*1024*1024)return false
  try {
    if(/class="m-MatchDetails"/.test(html)){vZapisnik(html,{liga:ligaZapisnika(html)});return true}
    const canonical=[...String(html).matchAll(/<link\b[^>]*>/gi)].find(m=>attr(m[0],'rel')==='canonical')
    const path=safeUrl(attr(canonical?.[0]??'','href')).pathname.match(/^\/competitions\/(regionalliga-[a-z]+)\/seasons\/(\d{4}-\d{4})\/teams\/([a-zA-Z0-9%\-]+)$/)
    if(!path)return false
    tekmeEkipe(html,`${path[1]}/${path[2]}`,path[3]);return true
  }catch{return false}
}
async function prenesiStran(prenesi,url,name,fresh){
  let html
  try {html=await prenesi(url,name,fresh)}catch(e){if([401,403,429].includes(e.status))throw new DfbZavrnitev(`HTTP ${e.status}`,e.status);throw e}
  if(jeIzziv(html))throw new DfbZavrnitev('izziv (CAPTCHA)')
  if(Buffer.byteLength(String(html))>2*1024*1024)fail('odgovor presega omejitev velikosti 2 MiB')
  return html
}
async function beri(prenesi,url,name,fresh){
  const html=await prenesiStran(prenesi,url,name,fresh)
  if(!zaPredpomnilnik(html)){
    // The cache hook must return a boolean, but callers need the actual report
    // failure to diagnose a new format or inconsistent upstream data.
    if(Buffer.byteLength(String(html))<=2*1024*1024&&/class="m-MatchDetails"/.test(html))vZapisnik(html,{liga:ligaZapisnika(html)})
    fail('nepopolna javna stran')
  }
  return html
}

/** Discover the registered season and validate every directed home/away pair. */
export async function tekmeSezone(koda,prenesi){
  const conf=konfiguracijaDfb(koda),seed=conf.seed,witnesses=new Map(),matches=new Map()
  const load=async(club,url)=>{
    const html=await beri(prenesi,url,`team-${koda.replaceAll('/','-')}-${club}.html`,true)
    return {data:tekmeEkipe(html,koda,club),witness:{club,url,sha256:sha256(html)}}
  }
  const first=await load(seed,naslovEkipe(koda,seed)),ids=new Set(first.data.ekipe.map(e=>e.id))
  const merge=({data,witness})=>{
    if(data.ekipe.some(e=>!ids.has(e.id)))fail('razpored vsebuje nepričakovano ekipo')
    for(const t of data.tekme){
      const prev=matches.get(t.id)
      if(prev && JSON.stringify(prev)!==JSON.stringify(t))fail(`razporeda se ne ujemata za tekmo ${t.id}`)
      matches.set(t.id,t);witnesses.set(t.id,[...(witnesses.get(t.id)??[]),witness])
    }
  }
  merge(first)
  for(const e of first.data.ekipe.filter(e=>e.id!==seed))merge(await load(e.id,e.url))
  const all=[...matches.values()],pairs=new Map()
  const normalized=t=>({id:t.id,round:t.krog,home:t.domaci,away:t.gostje,homeSourceClubId:t.domaciId,awaySourceClubId:t.gostjeId,...(t.calendarEvidence?{calendarEvidence:t.calendarEvidence}:{})})
  for(const t of all){const p=JSON.stringify([t.domaciId,t.gostjeId]);pairs.set(p,[...(pairs.get(p)??[]),t])}
  try {
  for(const games of pairs.values())if(games.length>1)for(const t of games)t.calendarEvidence=dfbCalendarEvidence(koda,normalized(t),witnesses.get(t.id))
  verifyDfbCalendar({code:koda,teams:conf.teams,rounds:conf.rounds,fixtures:all.map(normalized)})
  }catch(e){fail(`neveljaven razpored: ${e.message}`)}
  return all.sort((a,b)=>a.krog-b.krog||a.datum.localeCompare(b.datum)||a.id.localeCompare(b.id))
}
export function vRazpored(tekme){
  const krogi=new Map()
  for(const t of tekme){if(!krogi.has(t.krog))krogi.set(t.krog,{stevilka:t.krog,tekme:[]});krogi.get(t.krog).tekme.push({...t,dfbId:t.id,zapisnikId:`de-dfb-${t.id}`,odigrana:!!t.izid,kontumacija:false})}
  return [...krogi.values()].sort((a,b)=>a.stevilka-b.stevilka)
}
const vir={
  ime:'dfb',polnoIme:'DFB Datencenter — Regionalliga Nordost',drzava:'DE',osnovniNaslov:BASE,
  glave:{'User-Agent':'SLFF fantasy (slff.eu; splih.94@gmail.com)'},premorMs:6000,imaRegistracije:false,
  naslovRazporeda:koda=>naslovEkipe(koda),
  jeIzziv,zaPredpomnilnik,zavrnitev:(s,status)=>new DfbZavrnitev(s,status),fetch:varniFetch,
  async razporedVseStrani(koda,prenesi){return vRazpored(await tekmeSezone(koda,prenesi))},
  nepopolni:[],
  async zapisniki(koda,prenesi,{zberiNapake=false,samoZapisnik=null,preskoci=new Set(),sveziZapisniki=new Set()}={}){
    vir.nepopolni=[]
    const all=await tekmeSezone(koda,prenesi),out=[]
    for(const t of all.filter(t=>t.izid&&(!samoZapisnik||`de-dfb-${t.id}`===String(samoZapisnik))&&!preskoci.has(`de-dfb-${t.id}`))){
      const fresh=!!samoZapisnik||sveziZapisniki.has(`de-dfb-${t.id}`)||Date.now()-Date.parse(`${t.datum}T00:00:00Z`)<=7*86400000
      // Network, refusal, challenge and body-bound failures remain fatal even
      // during an audit. Only recognized strict report-parser errors collect.
      const html=await prenesiStran(prenesi,t.url,`match-${t.id}.html`,fresh)
      try {
        const z=vZapisnik(html,{id:t.id,tekma:t,liga:konfiguracijaDfb(koda).liga})
        out.push({id:z.zapisnikId,z,url:t.url})
      }catch(e){
        const pending=e.koda==='DFB_PENDING_REPORT'&&jeCakajociDfb(e.podatki)
        if(!pending&&(!zberiNapake||!['DFB_INVALID_REPORT','DFB_UNSUPPORTED_FORMAT','DFB_INCOMPLETE_REPORT'].includes(e.koda)))throw e
        vir.nepopolni.push({...e.podatki,id:`de-dfb-${t.id}`,url:t.url,razlog:e.message,status:e.koda})
        if(pending)console.warn(`DFB_PENDING_REPORT: ${t.id} — brez uvoženih nastopov ali golov; fantasy začne po 13. krogu.`)
      }
    }
    return out
  },
  nastopi,vBesedilo:s=>String(s??'').split('\n'),kljucKluba,poenostavi:kljucKluba,kratkoIme:text,
}
export default vir
