// Vir: Federația Moldovenească de Fotbal — fmf.md (competiții, masculin).
//
// FMF vodi državne lige (Liga 7777 = Super Liga, Liga 1 v dveh skupinah,
// Liga 2) v COMET in na fmf.md objavi razpored, izide in za vsako tekmo
// zapisnik COMET kot PDF ("Raportul meciului"). Glej CLAUDE.md (Moldavija).
//
// ŠIFRA LIGE je `<slug>/<competition>`: `<slug>` je pot strani tekmovanja pod
// /home/competitii/masculin/ (`liga-2-1782306996`), `<competition>` številka
// tekmovanja, ki jo nosi gumb "Printeaza Toate Etapele" na strani kroga
// (`printeaza-detalii-competitii?competition=877`). Vsaka sezona (in faza) je
// svoje tekmovanje z novim slugom in številko.
//
// STRANI:
// - tiskana stran tekmovanja (`printeaza-detalii-competitii?competition=N`):
//   VSE tekme sezone v eni tabeli, urejene po datumu, z naslovi krogov ("Etapa
//   11" se ponovi pri prestavljeni tekmi), datum, "Domači - Gostje", izid
//   ("3 - 1", prazen = neodigrana), igrišče in ura (kišinjevski čas →
//   ljubljanski −1 h). Iz nje je razpored — ena zahteva na ligo.
// - stran tekmovanja (`<slug>`): stranski meni "meciuri" našteje kroge
//   ("Etapa N") z id-jem `edition`.
// - stran kroga (`<slug>?menu=matches&edition=E`): tekme kroga s šifro tekme
//   (`meciuri-info?match=<id>`).
// - stran tekme (`meciuri-info?match=<id>`): le izid in povezava na PDF
//   (`cdn/matches/<id>/<Domači> - <Gostje>.pdf`); brez zapisnika povezave ni.
//
// ZAPISNIK je PDF. Pretvori ga `pdftotext -layout` (poppler-utils; delovna
// tokova ga za `md-` lige namestita) v besedilo s stolpci, `ocisti` pa iz njega
// odstrani, česar ne potrebujemo in ne smemo hraniti: sodnike, delegate,
// osebje ekip, potrditve s podpisi, opombe delegata, starost igralcev in ime
// tiskalca. V predpomnilnik gre le očiščeno besedilo. Dve obliki predloge
// "Raportul meciului" (obe beremo):
// - A (od 7. kroga 2026/27, konec avgusta 2026): postava in klop z dresom,
//   imenom, G (vratar), C (kapetan), starostjo, ŠIFRO OSEBE COMET in
//   državljanstvom;
// - B (prej): isto brez starosti in šifre, ob imenu ikone dogodkov z minuto.
// Obe imata razdelke GOLURI (strelec z dresom, "Penalty", avtogol),
// CARTONAŞE GALBENE / ROŞII (minuta, igralec, razlog) in SUBSTITUTIONS
// ("67'  7 Ursu Elyas > 8 Grosu Alexandru") — minute so točne.
// Starejša predloga "Analyticom COMET / Raport de meci" (sezona 2025/26 in
// prej: dogodki kot številke v stolpcih tabele) je NE beremo — uvoz se ob njej
// ustavi z napako, zato arhiva 2025/26 ni (glej CLAUDE.md).
//
// IDENTITETA: šifra osebe COMET (→ `reg_st`). Igralcu v zapisniku oblike B jo
// vir poišče v zapisnikih oblike A iste lige (klub + ime); kdor je igral le v
// prvih krogih, ostane brez šifre (ime + klub).
//
// robots.txt ni (404), pogojev uporabe ni, noga "© FMF". Beremo odkrito
// (User-Agent SLFF, 3 s med zahtevki, popolnih zapisnikov ne beremo znova).
// Ob 401, 403, 429 ali izzivu se uvoz ustavi (`FmfZavrnitev`, izhod 4) — ne
// obhajaj.
import { execFile } from 'node:child_process'
import { razpakiraj } from '../klubi.mjs'
import { vLjubljanskiCas } from './frf.mjs'
import { sezonaIz } from '../razpored.mjs'

const OSNOVNI = 'https://www.fmf.md'
const DOLZINA_TEKME = 90
const NAJMANJ_ZACETNIKOV = 7

// --- šifra in naslovi ----------------------------------------------------------

/** "liga-2-1782306996/877" → { slug, tekmovanje }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z0-9-]+)\/(\d+)$/)
  if (!m) throw new Error(`fmf: šifra lige je "<slug>/<competition>" (npr. liga-2-1782306996/877), ne "${koda}"`)
  return { slug: m[1], tekmovanje: m[2] }
}

export const naslovTiska = (koda) => `${OSNOVNI}/home/printeaza-detalii-competitii?competition=${razbijKodo(koda).tekmovanje}`
export const naslovTekmovanja = (koda) => `${OSNOVNI}/home/competitii/masculin/${razbijKodo(koda).slug}`
export const naslovKroga = (koda, edition) => `${naslovTekmovanja(koda)}?menu=matches&edition=${edition}`
export const naslovTekme = (id) => `${OSNOVNI}/home/meciuri-info?match=${String(id).replace(/^md/, '')}`
// Pot PDF z imeni klubov; vsak del posebej kodiran ("CF Edineț - FC …" → %20, %C8%9B).
export const naslovPdf = (pot) => `${OSNOVNI}/${String(pot).replace(/^\/+/, '').split('/').map((d) => encodeURIComponent(razpakiraj(d))).join('/')}`
// Šifra zapisnika v bazi je `md<id>`: id tekme COMET (~40000–60000) je v
// številskem prostoru drugih virov, `matches.zapisnik_id` pa je enoličen čez vse.
export const sifraZapisnika = (id) => `md${String(id).replace(/^md/, '')}`

const imeTiska = (koda) => `tisk-${razbijKodo(koda).tekmovanje}.html`
const imeTekmovanja = (koda) => `tekmovanje-${razbijKodo(koda).slug}.html`
const imeKroga = (edition) => `krog-${edition}.html`
const imeTekme = (id) => `tekma-${id}.html`
const imeZapisnika = (id) => `raport-${id}.txt`

// --- zavrnitev -------------------------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class FmfZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'FmfZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

// --- PDF → besedilo ----------------------------------------------------------------

/** `pdftotext -layout` (poppler-utils) iz vmesnika v besedilo. */
export function pdfVBesedilo(pdf) {
  return new Promise((resolve, reject) => {
    const p = execFile('pdftotext', ['-layout', '-enc', 'UTF-8', '-', '-'], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' }, (e, izhod) => {
      if (e) {
        if (e.code === 'ENOENT') reject(new Error('fmf: pdftotext ni nameščen (poppler-utils: apt-get install poppler-utils, brew install poppler)'))
        else reject(new Error(`fmf: pdftotext ni prebral PDF (${e.message})`))
        return
      }
      resolve(izhod)
    })
    p.stdin.on('error', () => {})
    p.stdin.end(Buffer.from(pdf))
  })
}

// Naslovi razdelkov v romunski, ruski in angleški predlogi → enoten ključ.
// (Ruska predloga ima "LINEUPS" in "SUBSTITUTES", menjave pa pod "ЗАПАСНЫЕ ИГРОКИ".)
const NASLOVI = new Map([
  ['PERSOANELE OFICIALE', 'URADNE'], ['ПРЕДСТАВИТЕЛИ МАТЧА', 'URADNE'], ['MATCH OFFICIALS', 'URADNE'],
  ['LINEUPS', 'LINEUPS'], ['SUBSTITUTES', 'SUBSTITUTES'], ['STAFF', 'STAFF'],
  ['GOLURI', 'GOLI'], ['ГОЛЫ', 'GOLI'], ['GOALS', 'GOLI'],
  ['DISCIPLINARY', 'DISCIPLINARY'],
  ['CARTONAŞE GALBENE', 'RUMENI'], ['CARTONAȘE GALBENE', 'RUMENI'], ['ЖЁЛТЫЕ КАРТОЧКИ', 'RUMENI'], ['ЖЕЛТЫЕ КАРТОЧКИ', 'RUMENI'], ['YELLOW CARDS', 'RUMENI'],
  ['CARTONAŞE ROŞII', 'RDECI'], ['CARTONAȘE ROȘII', 'RDECI'], ['CARTONAŞE ROȘII', 'RDECI'], ['КРАСНЫЕ КАРТОЧКИ', 'RDECI'], ['RED CARDS', 'RDECI'],
  ['SUBSTITUTIONS', 'MENJAVE'], ['ЗАПАСНЫЕ ИГРОКИ', 'MENJAVE'], ['ЗАМЕНЫ', 'MENJAVE'],
  ['OBSERVAȚIILE DELEGAȚILOR', 'OPOMBE'], ['OBSERVAŢIILE DELEGAŢILOR', 'OPOMBE'], ['КРАТКИЙ ОБЗОР МАТЧА', 'OPOMBE'], ['MATCH SUMMARY', 'OPOMBE'],
])
const naslov = (vrstica) => NASLOVI.get(String(vrstica).trim()) ?? null
// Razdelki, ki jih ne hranimo: sodniki, osebje, opombe delegata (imena, številke vozil).
const ZAVRZI = new Set(['URADNE', 'STAFF', 'OPOMBE'])

/** Žetoni vrstice (ločeni z vsaj dvema presledkoma) z mestom: [{ t, col }]. */
export function zetoni(vrstica) {
  const out = []
  const re = /\S+(?: \S+)*/g
  let m
  while ((m = re.exec(vrstica))) out.push({ t: m[0], col: m.index })
  return out
}

// "Tekma odigrana" (podpis sodnika) v romunski, ruski in angleški predlogi.
const ODIGRANA = 'Meci jucat|СЫГРАНО|Match played'
const MINUTA = /^(?:\d{1,3}(?:\+\d{1,2})?'|AM|PM|HT|FT)$/
const IGRALEC = /^\d{1,3} \S/
const RAZLOG = /^\d{1,2}\.\s/

/**
 * Očisti besedilo zapisnika: le glava (tekmovanje, kluba, izid, datum, krog),
 * postavi, klop, goli, kartoni in menjave. Brez sodnikov, delegatov, osebja,
 * podpisov, opomb in starosti igralcev; nič od tega ne gre v predpomnilnik ali
 * vzorce. Mesta stolpcev ostanejo (starost se nadomesti s presledki).
 */
export function ocisti(besedilo) {
  const vrstice = String(besedilo ?? '').replace(/\r/g, '').split(/\n|\f/)
  const out = []
  let razdelek = null
  for (const v of vrstice) {
    const n = naslov(v)
    if (n) {
      razdelek = n
      if (ZAVRZI.has(n)) continue
      out.push(v)
      continue
    }
    if (/^\s*(COMET - Federa|Analyticom COMET)/.test(v)) {
      // Glava strani z imenom tiskalca — ostane le ime sistema (prva stran).
      if (!out.length) out.push(v.match(/^\s*(COMET - Federația Moldovenească de Fotbal|COMET - [^\s].*?(?=\s{2,}|$)|Analyticom COMET)/)?.[1] ?? 'COMET')
      continue
    }
    if (/^\s*(Raportul meciului|Протокол матча|Match report):|(Pagin[ăa]|Страница|Page)\s+\d+\s*\/\s*\d+/.test(v)) continue
    if (/check_circle\s+(CONFIRMAT|ПОДТВЕРЖДЕНО|CONFIRMED)/.test(v)) continue
    if (new RegExp(`check_circle\\s+(${ODIGRANA})`).test(v)) {
      out.push(' check_circle Meci jucat')
      continue
    }
    if (razdelek && ZAVRZI.has(razdelek)) continue
    let w = v.replace(/\b\d{1,2}An\b/g, (s) => ' '.repeat(s.length))
    if (razdelek === 'RUMENI' || razdelek === 'RDECI') {
      // Kartoni osebja: ime in vloga brez dresa ("Josu Victor  Administrator").
      // Ostanejo le minute, igralci z dresom in razlogi.
      const deli = w.split('')
      for (const z of zetoni(w)) if (!MINUTA.test(z.t) && !IGRALEC.test(z.t) && !RAZLOG.test(z.t)) for (let i = z.col; i < z.col + z.t.length; i++) deli[i] = ' '
      w = deli.join('')
    }
    out.push(w.replace(/\s+$/, ''))
  }
  // Prazne vrstice: največ ena zapored.
  return out.filter((v, i) => v !== '' || out[i - 1] !== '').join('\n').trim() + '\n'
}

/** Predloga zapisnika: 'A' (šifre COMET), 'B' (brez šifer), 'analyticom' (stara, ne beremo) ali null. */
export function oblika(besedilo) {
  const s = String(besedilo ?? '')
  if (/Analyticom COMET|Raport de meci\b/.test(s)) return 'analyticom'
  if (!/\bLINEUPS\b/.test(s)) return null
  return /^\s*\d{1,3}\s.*\s\d{4,7}\s+[A-Z]{3}\b/m.test(s) ? 'A' : 'B'
}

// --- imena -------------------------------------------------------------------------

/** Cedilja → vejica (ş → ș, ţ → ț), presledki. */
const sVejico = (s) => String(s ?? '').replace(/ş/g, 'ș').replace(/Ş/g, 'Ș').replace(/ţ/g, 'ț').replace(/Ţ/g, 'Ț')

/**
 * Ime igralca, kot ga piše COMET ("Priimek Ime"); besede z VELIKIMI črkami
 * ("BORSHCH MAXIM", "Maxian ILIE") dobijo veliko začetnico, da je isto ime
 * v vseh zapisnikih enako.
 */
export const imeIgralca = (ime) =>
  sVejico(razpakiraj(ime))
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((b) => (b.length > 1 && b === b.toLocaleUpperCase('ro') && /\p{Lu}/u.test(b) ? b[0] + b.slice(1).toLocaleLowerCase('ro') : b))
    .join(' ')

/** Ključ za primerjavo imen: brez diakritike, male črke. */
const kljucImena = (ime) =>
  imeIgralca(ime).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** "45+3'" → 45, "92'" → 90, "AM" (po tekmi) → 90. */
export function minuta(s) {
  const t = String(s ?? '').trim()
  if (/^(AM|PM|FT)$/.test(t)) return DOLZINA_TEKME
  if (t === 'HT') return 45
  const m = t.match(/^(\d{1,3})/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

// --- tiskana stran (razpored) -------------------------------------------------------

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim()

/** Sezona iz naslova tiskane strani ("Ediția 2026-2027", "Sezonul 2025-2026") → "2026/27". */
export function sezonaTiska(html) {
  const naslov = besedilo(String(html ?? '').match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '')
  const m = naslov.match(/(\d{4})\s*-\s*(\d{4})/)
  return m && Number(m[2]) === Number(m[1]) + 1 ? `${m[1]}/${m[2].slice(2)}` : null
}

export const jeTisk = (html) => /<th colspan="6" class="text-center">\s*Etapa\s+\d+/.test(String(html ?? ''))

/**
 * Tekme tiskane strani: [{ krog, datum, ura, domaci, gostje, izid }]; datum
 * in ura sta ljubljanska. Ime "Domači - Gostje" se loči pri " - "; več takih
 * ločil (ime z " - ") ustavi uvoz.
 */
export function tekmeTiska(html) {
  const out = []
  let krog = null
  const re = /<th colspan="6" class="text-center">([^<]*)<\/th>|<tr>\s*<td>\s*\d+\s*<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<td>[^<]*<\/td>\s*<td>([^<]*)<\/td>/g
  let m
  while ((m = re.exec(String(html ?? '')))) {
    if (m[1] != null) {
      krog = Number(m[1].match(/Etapa\s+(\d+)/)?.[1]) || null
      continue
    }
    const deli = razpakiraj(m[3]).trim().split(' - ')
    if (deli.length !== 2) throw new Error(`fmf: tekme "${razpakiraj(m[3]).trim()}" ne znam ločiti na domače in goste — uvoz ustavljen`)
    const d = m[2].trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    const datum = d ? `${d[3]}-${d[2]}-${d[1]}` : null
    const u = m[5].trim().match(/^(\d{1,2}):(\d{2})$/)
    const cas = u && !(u[1] === '00' && u[2] === '00') ? vLjubljanskiCas(datum, `${u[1].padStart(2, '0')}:${u[2]}`) : { datum, ura: null }
    const i = m[4].trim().match(/^(\d+)\s*-\s*(\d+)$/)
    out.push({
      krog,
      datum: cas.datum,
      ura: cas.ura,
      domaci: deli[0].trim(),
      gostje: deli[1].trim(),
      izid: i ? { domaci: Number(i[1]), gostje: Number(i[2]) } : null,
    })
  }
  return out
}

const jeTriNic = (i) => !!i && ((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))

/** Razpored v obliko uvoza razporeda (krogi s tekmami). */
export function razcleniRazpored(html) {
  if (!jeTisk(html)) return []
  const krogi = new Map()
  for (const t of tekmeTiska(html)) {
    if (!t.krog) continue
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: !!t.izid, izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- stran tekmovanja, kroga in tekme -------------------------------------------------

/** Krogi iz menija strani tekmovanja: Map(krog → edition). */
export function krogiTekmovanja(html) {
  const out = new Map()
  for (const m of String(html ?? '').matchAll(/[?&]menu=matches&(?:amp;)?edition=(\d+)"[^>]*>\s*<span class="count"><\/span>\s*Etapa\s+(\d+)/g))
    if (!out.has(Number(m[2]))) out.set(Number(m[2]), m[1])
  return out
}

export const jeStranKroga = (html) => /class="main-lates-matches"|class="main-next-matches"/.test(String(html ?? ''))

/** Tekme strani kroga: [{ id, domaci, gostje, izid }]. */
export function tekmeKroga(html) {
  const out = []
  for (const del of String(html ?? '').split(/<a href="https:\/\/www\.fmf\.md\/home\/meciuri-info\?match=/).slice(1)) {
    const id = del.match(/^(\d+)/)?.[1]
    const konec = del.indexOf('</a>')
    const k = konec < 0 ? del : del.slice(0, konec)
    const imena = [...k.matchAll(/text-overflow: ellipsis;">([^<]*)<\/span>/g)].map((x) => razpakiraj(x[1]).trim())
    const r = k.match(/<span class="score"><span>\s*(\d+)\s*:\s*(\d+)\s*<\/span>/)
    if (!id || imena.length !== 2) continue
    out.push({ id, domaci: imena[0], gostje: imena[1], izid: r ? { domaci: Number(r[1]), gostje: Number(r[2]) } : null })
  }
  return out
}

/** Pot PDF zapisnika s strani tekme (null, če zapisnika ni). */
export const potZapisnika = (html) => String(html ?? '').match(/href="(\/?cdn\/matches\/\d+\/[^"]+\.pdf)"/i)?.[1] ?? null
export const jeStranTekme = (html) => /class="match-live-info"/.test(String(html ?? ''))

// --- zapisnik ---------------------------------------------------------------------------

/** Razdelki: Map(naslov → [vrstice]); naslov se lahko ponovi (nova stran), vrstice se dodajo. */
function razdelki(vrstice) {
  const out = new Map([['glava', []]])
  let r = 'glava'
  for (const v of vrstice) {
    const n = naslov(v)
    if (n) {
      r = n
      if (!out.has(r)) out.set(r, [])
      continue
    }
    out.get(r).push(v)
  }
  return out
}

const VRATAR = new Set(['G', 'В'])
const KAPETAN = new Set(['C', 'К'])
const jeOznaka = (t) => t.split(/\s+/).every((d) => VRATAR.has(d) || KAPETAN.has(d))

/**
 * Igralci razdelka postave ali klopi: [domači, gostje], vsak [{ st, ime, vratar,
 * kapetan, comet }]. Stran določi stolpec: žeton z dresom pred `meja` je domač.
 */
function igralciRazdelka(vrstice, meja) {
  const ekipi = [[], []]
  for (const v of vrstice) {
    const z = zetoni(v)
    let trenutni = null
    for (let k = 0; k < z.length; k++) {
      const { t, col } = z[k]
      let m
      if ((m = t.match(/^(\d{1,3})(?: (\D.*))?$/)) && (m[2] || (z[k + 1] && /^\D/.test(z[k + 1].t) && !jeOznaka(z[k + 1].t)))) {
        // Dres (in ime v istem ali naslednjem žetonu) začne igralca.
        let ime = m[2]
        if (!ime) ime = z[++k].t
        trenutni = { st: Number(m[1]), ime: imeIgralca(ime), vratar: false, kapetan: false, comet: null, stran: col < meja ? 0 : 1 }
        ekipi[trenutni.stran].push(trenutni)
        continue
      }
      if (!trenutni) continue
      const deli = t.split(/\s+/)
      // G / В (ruska predloga) = vratar, C / К = kapetan.
      if (deli.every((d) => VRATAR.has(d) || KAPETAN.has(d))) {
        if (deli.some((d) => VRATAR.has(d))) trenutni.vratar = true
        if (deli.some((d) => KAPETAN.has(d))) trenutni.kapetan = true
      } else if (/^\d{4,8}$/.test(t)) trenutni.comet = t
      // Ostalo: državljanstvo (MDA), ikone z minuto (oblika B) — dogodke beremo iz razdelkov.
    }
  }
  return ekipi
}

/** Dogodki razdelka GOLURI: [{ minuta, st, ime, oznaka, col }]. */
function goliRazdelka(vrstice) {
  const out = []
  for (const v of vrstice) {
    const z = zetoni(v)
    for (let k = 0; k < z.length; k++) {
      if (!MINUTA.test(z[k].t)) continue
      const g = { minuta: minuta(z[k].t), col: z[k].col, st: null, ime: null, oznaka: '' }
      let n = z[k + 1]
      let m
      if (n && (m = n.t.match(/^(\d{1,3}) (\D.*)$/))) { g.st = Number(m[1]); g.ime = imeIgralca(m[2]); k += 1 }
      else if (n && /^\d{1,3}$/.test(n.t) && z[k + 2] && /^\D/.test(z[k + 2].t)) { g.st = Number(n.t); g.ime = imeIgralca(z[k + 2].t); k += 2 }
      else if (n && /^\D/.test(n.t) && !MINUTA.test(n.t)) { g.ime = imeIgralca(n.t); k += 1 }
      if (z[k + 1] && !MINUTA.test(z[k + 1].t) && /^[\p{L}() -]+$/u.test(z[k + 1].t)) { g.oznaka = z[k + 1].t; k += 1 }
      out.push(g)
    }
  }
  return out
}

/** Menjave razdelka SUBSTITUTIONS: [{ minuta, ven: { st, ime }, noter: { st, ime } }]. */
function menjaveRazdelka(vrstice) {
  const out = []
  for (const v of vrstice) {
    const re = /(\d{1,3}(?:\+\d{1,2})?')\s+(\d{1,3})\s+(\S.*?)\s+(?:chevron_forward|>)\s+(\d{1,3})\s+(\S.*?)(?=\s{2,}|$)/g
    let m
    while ((m = re.exec(v))) out.push({ minuta: minuta(m[1]), ven: { st: Number(m[2]), ime: imeIgralca(m[3]) }, noter: { st: Number(m[4]), ime: imeIgralca(m[5]) } })
  }
  return out
}

/**
 * Kartoni razdelka: igralec ("17 Munteanu Nicolae") stoji v eni vrstici, minuta
 * v sosednji (pod ali nad njim), razlog pod njo. Vsak igralec dobi najbližjo
 * minuto po stolpcu iz sosednjih vrstic; minute osebja (ime brez dresa
 * `ocisti` izbriše) ostanejo brez igralca.
 */
function kartoniRazdelka(vrstice) {
  const minute = []
  const igralci = []
  vrstice.forEach((v, li) => {
    for (const z of zetoni(v)) {
      if (MINUTA.test(z.t)) minute.push({ li, col: z.col, minuta: minuta(z.t), porabljena: false })
      else if (IGRALEC.test(z.t) && !RAZLOG.test(z.t)) {
        const m = z.t.match(/^(\d{1,3}) (.+)$/)
        igralci.push({ li, col: z.col, st: Number(m[1]), ime: imeIgralca(m[2]) })
      }
    }
  })
  const out = []
  for (const i of igralci) {
    let naj = null
    for (const m of minute) {
      if (m.porabljena || Math.abs(m.li - i.li) > 1) continue
      const r = Math.abs(m.col - i.col) + (m.li === i.li ? 1000 : 0)
      if (!naj || r < naj.r) naj = { m, r }
    }
    if (naj) naj.m.porabljena = true
    out.push({ st: i.st, ime: i.ime, minuta: naj?.m.minuta ?? null, col: i.col })
  }
  return out
}

/** Glava: tekmovanje (sezona), kluba, izid, datum, ura, krog. */
function glava(vrstice) {
  const s = vrstice.join('\n')
  const sez = s.match(/^\s*[\p{Lu}0-9 ]*?\b(\d{2})\/(\d{2})\b/mu)
  let domaci = null
  let gostje = null
  let izid = null
  for (const v of vrstice) {
    const z = zetoni(v).filter((x) => x.t !== 'N/A')
    const i = z.findIndex((x) => /^\d+:\d+$/.test(x.t))
    if (i > 0 && i < z.length - 1) {
      domaci = z.slice(0, i).map((x) => x.t).join(' ')
      gostje = z.slice(i + 1).map((x) => x.t).join(' ')
      const [a, b] = z[i].t.split(':').map(Number)
      izid = { domaci: a, gostje: b }
      break
    }
  }
  const d = s.match(/(?:Data\/Timp|Дата\/Время|Date\/Time):\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/)
  const datum = d ? `${d[3]}-${d[2]}-${d[1]}` : null
  const cas = d ? vLjubljanskiCas(datum, `${d[4].padStart(2, '0')}:${d[5]}`) : { datum: null, ura: null }
  return {
    sezona: sez ? `20${sez[1]}/${sez[2]}` : null,
    domaci,
    gostje,
    izid,
    datum,
    ura: cas.ura,
    krog: Number(s.match(/(?:\bTur|Раунд|\bRound):\s*(\d+)/)?.[1]) || null,
  }
}

/**
 * Zapisnik (očiščeno besedilo PDF) v obliko, ki jo dajo drugi viri. Null, če
 * zapisnik nima postav (ni oblike A/B). Ekipa z manj kot 7 začetniki naredi
 * zapisnik nepopoln (prvo opozorilo `zapisnik nepopoln`, kot frf).
 */
export function vZapisnik(txt, { id = null, url = null } = {}) {
  const o = oblika(txt)
  if (o === 'analyticom')
    throw new Error(`fmf: zapisnik ${id ?? ''} je v starejši predlogi "Analyticom COMET" (sezona 2025/26 in prej), ki je ne beremo — uvoz ustavljen`)
  if (!o) return null
  const r = razdelki(String(txt).split('\n'))
  const g = glava(r.get('glava'))
  if (!g.izid || !g.domaci || !g.gostje) return null

  // Meja med stolpcema: začetek imena gostov v vrstici z imeni klubov pod LINEUPS.
  const postava = r.get('LINEUPS') ?? []
  let meja = null
  const vrsticaKlubov = postava.findIndex((v) => zetoni(v).length >= 2 && !/^\s*\d/.test(v))
  if (vrsticaKlubov >= 0) meja = zetoni(postava[vrsticaKlubov]).at(-1).col - 8
  if (meja == null) return null
  const zacetniki = igralciRazdelka(postava.filter((_, i) => i !== vrsticaKlubov), meja)
  const klop = igralciRazdelka(r.get('SUBSTITUTES') ?? [], meja)

  const opozorila = []
  const ekipe = [0, 1].map((idx) => ({
    ime: idx === 0 ? g.domaci : g.gostje,
    postava: zacetniki[idx].map((i) => ({ ...i, zacetnik: true, noter: null, ven: null, rdec: null })),
    rezerve: klop[idx].map((i) => ({ ...i, zacetnik: false, noter: null, ven: null, rdec: null })),
  }))
  const vsi = (idx) => [...ekipe[idx].postava, ...ekipe[idx].rezerve]
  /** Igralec po dresu in imenu; najprej v ekipi `prednost` (stran stolpca), nato v drugi. */
  const najdi = (st, ime, prednost = null) => {
    const k = ime ? kljucImena(ime) : null
    const red = prednost === 1 ? [1, 0] : [0, 1]
    for (const idx of red) {
      const i = vsi(idx).find((x) => x.st === st && (!k || kljucImena(x.ime) === k))
      if (i) return { idx, i }
    }
    if (k) for (const idx of red) {
      const i = vsi(idx).find((x) => kljucImena(x.ime) === k)
      if (i) return { idx, i }
    }
    return null
  }
  // Polovica strani za dogodke brez ujemanja (strelec, ki ga v postavi ni).
  const polovica = (col, vrstice) => {
    const sirina = Math.max(...vrstice.map((v) => v.length), 1)
    return col < sirina / 2 ? 0 : 1
  }

  const goli = []
  const zgresene = []
  const vrsticeGolov = r.get('GOLI') ?? []
  for (const d of goliRazdelka(vrsticeGolov)) {
    const n = d.st != null || d.ime ? najdi(d.st, d.ime) : null
    const oznaka = d.oznaka.toLowerCase()
    // Avtogol: "Auto-gol", ruska predloga "Гол в свои ворота".
    const avtogol = /auto-?gol|автогол|в свои ворота|own/.test(oznaka)
    const g = {
      ekipaIdx: n ? n.idx : polovica(d.col, vrsticeGolov),
      st: n ? n.i.st : d.st,
      ime: n ? n.i.ime : d.ime,
      minuta: d.minuta,
      avtogol,
      enajstmetrovka: /penalty|penalti|пенальти/.test(oznaka) && !/ratat|missed|nereal/.test(oznaka),
    }
    if (/ratat|missed|nereal/.test(oznaka)) { zgresene.push(g); continue }
    if (!n) opozorila.push(`gol ${d.minuta}' (${d.st ?? '?'} ${d.ime ?? '?'}) — strelca ni v postavi`)
    if (d.oznaka && !/^(penalty|penalti|пенальти|auto-?gol|автогол|гол в свои ворота|own goal)$/i.test(d.oznaka)) opozorila.push(`gol ${d.minuta}': neznana oznaka "${d.oznaka}"`)
    goli.push(g)
  }

  const rumeni = []
  const rdeci = []
  for (const [kljuc, vrsta] of [['RUMENI', 'rumeni'], ['RDECI', 'rdeci']]) {
    for (const k of kartoniRazdelka(r.get(kljuc) ?? [])) {
      const n = najdi(k.st, k.ime)
      if (!n) { opozorila.push(`karton (${vrsta}) ${k.st} ${k.ime} — igralca ni v postavi`); continue }
      const z = { ekipaIdx: n.idx, st: n.i.st, ime: n.i.ime, minuta: k.minuta }
      if (vrsta === 'rumeni') rumeni.push(z)
      else if (!rdeci.some((x) => x.ekipaIdx === z.ekipaIdx && x.st === z.st && x.ime === z.ime)) {
        rdeci.push(z)
        n.i.rdec = k.minuta ?? DOLZINA_TEKME
      }
    }
  }
  // Drugi rumeni: COMET vpiše oba rumena in rdečega; ostane 1 rumeni + 1 rdeči (kot drugi viri).
  for (const rd of rdeci) {
    const moji = rumeni.filter((x) => x.ekipaIdx === rd.ekipaIdx && x.st === rd.st && x.ime === rd.ime)
    if (moji.length >= 2) rumeni.splice(rumeni.indexOf(moji.at(-1)), 1)
  }

  const menjave = []
  for (const m of menjaveRazdelka(r.get('MENJAVE') ?? [])) {
    const ven = najdi(m.ven.st, m.ven.ime)
    const noter = najdi(m.noter.st, m.noter.ime, ven?.idx)
    if (!ven || !noter || ven.idx !== noter.idx) {
      opozorila.push(`menjava ${m.minuta}' ${m.ven.st} ${m.ven.ime} > ${m.noter.st} ${m.noter.ime} — igralcev ni v postavi iste ekipe`)
      continue
    }
    if (noter.i.noter != null) opozorila.push(`${ekipe[noter.idx].ime}: ${noter.i.ime} vstopi dvakrat`)
    noter.i.noter ??= m.minuta
    ven.i.ven = m.minuta
    menjave.push({ ekipaIdx: ven.idx, minuta: m.minuta, noter: { st: noter.i.st, ime: noter.i.ime }, ven: { st: ven.i.st, ime: ven.i.ime } })
  }

  for (const [idx, e] of ekipe.entries()) {
    if (e.postava.length < NAJMANJ_ZACETNIKOV) opozorila.push(`zapisnik nepopoln: ${e.ime} — v postavi ${e.postava.length} igralcev`)
    else if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (vratarjev !== 1) opozorila.push(`${e.ime}: vratarjev (G) v postavi je ${vratarjev}`)
    const kljuci = new Map()
    for (const i of vsi(idx)) kljuci.set(`${i.st}|${i.ime}`, (kljuci.get(`${i.st}|${i.ime}`) ?? 0) + 1)
    for (const [k, n] of kljuci) if (n > 1) opozorila.push(`${e.ime}: igralec ${k.split('|')[1]} je v zapisniku ${n}-krat`)
  }

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  if (zaEkipo(0) !== g.izid.domaci || zaEkipo(1) !== g.izid.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${g.izid.domaci}:${g.izid.gostje}`)
  // Brez podpisa sodnika ("Meci jucat") se zapisnik še lahko spremeni: nepopoln, bere se znova.
  const podpisan = /check_circle Meci jucat/.test(String(txt))
  if (!podpisan) opozorila.push('zapisnik nepopoln: sodnik zapisnika še ni potrdil (Meci jucat)')
  // Uvoz (kot pri frf) zapiše izid in znane nastope, `imported_at` pa pusti prazen:
  // lestvica in borza tekme ne štejeta za končno, nočni uvoz jo bere znova.
  const nepopoln = !podpisan || ekipe.some((e) => e.postava.length < NAJMANJ_ZACETNIKOV)
  opozorila.sort((a, b) => Number(b.startsWith('zapisnik nepopoln')) - Number(a.startsWith('zapisnik nepopoln')))

  const vObliko = ({ stran: _s, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    oblika: o,
    sezona: g.sezona ?? (g.datum ? sezonaIz(g.datum) : null),
    krog: g.krog,
    datum: g.datum,
    ura: g.ura,
    // Podpis sodnika "Meci jucat" (ocisti ga poenoti v vseh jezikih predloge).
    odigrana: podpisan,
    nepopoln,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat: g.izid,
    // Polčasa zapisnik ne pove.
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/** Je zapisnik popoln (gre v predpomnilnik in se ne bere znova)? */
export function jePopoln(txt) {
  try {
    const z = vZapisnik(txt)
    return !!z && !z.nepopoln
  } catch {
    return false
  }
}

/**
 * Šifre COMET igralcem zapisnikov oblike B: iz zapisnikov oblike A iste lige
 * po klubu in imenu (le, kjer je šifra ena sama). Vrne število igralcev brez šifre.
 */
export function dopolniSifre(zapisniki, kljucKluba = kljucKlubaMd) {
  const sifre = new Map()
  const kljuc = (klub, ime) => `${kljucKluba(klub)}|${kljucImena(ime)}`
  for (const z of zapisniki)
    for (const e of [z.domaci, z.gostje])
      for (const i of [...e.postava, ...e.rezerve])
        if (i.comet) {
          const k = kljuc(e.ime, i.ime)
          if (!sifre.has(k)) sifre.set(k, new Set())
          sifre.get(k).add(i.comet)
        }
  let brez = 0
  for (const z of zapisniki)
    for (const e of [z.domaci, z.gostje])
      for (const i of [...e.postava, ...e.rezerve]) {
        if (i.comet) continue
        const s = sifre.get(kljuc(e.ime, i.ime))
        if (s?.size === 1) i.comet = [...s][0]
        else brez++
      }
  return brez
}

/** Nastopi: začetnik od 0, rezerva od vstopa; do izstopa, rdečega ali 90. */
export function nastopi(z) {
  const out = []
  for (const [idx, ekipa] of [z.domaci, z.gostje].entries()) {
    const prejeti = idx === 0 ? z.rezultat.gostje : z.rezultat.domaci
    for (const i of [...ekipa.postava, ...ekipa.rezerve]) {
      const zacetnik = !!i.zacetnik
      const od = zacetnik ? 0 : i.noter
      if (od == null) continue
      let do_ = i.ven ?? DOLZINA_TEKME
      if (i.rdec != null) do_ = Math.min(do_, i.rdec)
      do_ = Math.max(od, Math.min(do_, DOLZINA_TEKME))
      const moji = (seznam) => seznam.filter((x) => x.ekipaIdx === idx && x.st === i.st && x.ime === i.ime)
      const goliIgralca = moji(z.goli)
      out.push({
        ekipaIdx: idx,
        ekipa: ekipa.ime,
        st: i.st,
        ime: i.ime,
        regSt: i.comet ?? null,
        pozicija: i.vratar ? 'GK' : null,
        vratar: !!i.vratar,
        zacetnik,
        minutaOd: od,
        minutaDo: do_,
        minute: do_ - od,
        goli: goliIgralca.filter((g) => !g.avtogol).length,
        goliIzEnajstmetrovke: goliIgralca.filter((g) => !g.avtogol && g.enajstmetrovka).length,
        avtogoli: goliIgralca.filter((g) => g.avtogol).length,
        zgreseneEnajstmetrovke: moji(z.zgresene).length,
        rumeni: moji(z.rumeni).length,
        rdeci: i.rdec != null ? 1 : 0,
        prejetiGoli: prejeti,
        cleanSheet: prejeti === 0,
      })
    }
  }
  return out
}

// --- klubi ------------------------------------------------------------------------------

// Ključ kluba: brez diakritike (vir piše ș in ş, ț in ţ), male črke, brez ločil.
export const kljucKlubaMd = (ime) =>
  razpakiraj(ime)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Oblike društva, ki jih v kratkem imenu ne potrebujemo.
const OBLIKE_MD = new Set(['fc', 'cf', 'cs', 'csf', 'fcm', 'cmf', 'csfcjt', 'efa', 'ac', 'sc'])

/** Kratko ime: "FC Speranța Drochia" → "Speranța Drochia", "CF Edineț" → "Edineț". */
export function kratkoImeMd(polno) {
  const besede = sVejico(razpakiraj(polno)).trim().split(/\s+/).filter(Boolean)
  const ostale = besede.filter((b) => !OBLIKE_MD.has(b.toLowerCase()))
  return ostale.length ? ostale.slice(0, 3).join(' ') : besede.join(' ')
}

// --- prenos -------------------------------------------------------------------------------

/**
 * `fetch` vira: 401, 403 in 429 sta zavrnitev (uvoz se ustavi, izhod 4 — ne
 * obhajamo, ne ponavljamo); izziv prav tako. PDF zapisnika vrne kot očiščeno
 * besedilo, da gre v predpomnilnik besedilo brez osebnih podatkov.
 */
export async function fmfFetch(url, moznosti = {}, { fetchFn = fetch, pdf = pdfVBesedilo } = {}) {
  const odgovor = await fetchFn(url, moznosti)
  if (jeZavrnitev(odgovor.status)) {
    try { await odgovor.body?.cancel() } catch {}
    throw new FmfZavrnitev(`fmf: ${url} → HTTP ${odgovor.status} — uvoz ustavljen, ne obhajamo`, odgovor.status)
  }
  if (!odgovor.ok) return odgovor
  const vrsta = odgovor.headers.get('content-type') ?? ''
  if (/application\/pdf/i.test(vrsta) || /\.pdf(?:$|\?)/i.test(url)) {
    const bajti = Buffer.from(await odgovor.arrayBuffer())
    if (bajti.subarray(0, 5).toString('latin1') !== '%PDF-') {
      if (jeIzziv(bajti.toString('utf8'))) throw new FmfZavrnitev(`fmf: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
      return new Response('', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } })
    }
    return new Response(ocisti(await pdf(bajti)), { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }
  const html = await odgovor.text()
  if (jeIzziv(html)) throw new FmfZavrnitev(`fmf: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return new Response(html, { status: odgovor.status, headers: { 'content-type': vrsta } })
}

/**
 * Kaj sme v predpomnilnik: le veljavne strani (ostanek strežnika ali prazna
 * stran ne) in le popoln zapisnik (nepopoln se bere znova).
 */
export function zaPredpomnilnik(besedilo, datoteka) {
  const ime = String(datoteka ?? '')
  if (ime.startsWith('tisk-') || ime.startsWith('razpored-')) return jeTisk(besedilo)
  if (ime.startsWith('tekmovanje-')) return krogiTekmovanja(besedilo).size > 0
  if (ime.startsWith('krog-')) return jeStranKroga(besedilo) && tekmeKroga(besedilo).length > 0
  if (ime.startsWith('tekma-')) return jeStranTekme(besedilo) && potZapisnika(besedilo) != null
  if (ime.startsWith('raport-')) return jePopoln(besedilo)
  return true
}

/** Prenos, ki zavrnitve ne skrije (uvoz zapisnikov bi napako strani pogoltnil). */
async function beri(prenesi, url, ime, sveze) {
  try {
    return await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new FmfZavrnitev(`fmf: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
}

/** Dni od datuma ('YYYY-MM-DD'); brez datuma 0 (beri sveže). */
const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)
const isti = (a, b) => kljucKlubaMd(a) === kljucKlubaMd(b)

async function tisk(koda, prenesi) {
  const html = await beri(prenesi, naslovTiska(koda), imeTiska(koda), true)
  if (!jeTisk(html)) throw new Error(`fmf: ${naslovTiska(koda)} ni tiskana stran tekmovanja (${String(html ?? '').length} B) — uvoz ustavljen`)
  return html
}

async function krogiZEdition(koda, prenesi, potrebni) {
  let html = await beri(prenesi, naslovTekmovanja(koda), imeTekmovanja(koda), false)
  let krogi = krogiTekmovanja(html)
  if (potrebni.some((k) => !krogi.has(k))) {
    html = await beri(prenesi, naslovTekmovanja(koda), imeTekmovanja(koda), true)
    krogi = krogiTekmovanja(html)
  }
  const manjka = potrebni.filter((k) => !krogi.has(k))
  if (manjka.length) throw new Error(`fmf: ${naslovTekmovanja(koda)} nima krogov ${manjka.join(', ')} — uvoz ustavljen`)
  return krogi
}

/**
 * Tekme kroga s šiframi; stran kroga z nedavno ali neodigrano tekmo se bere sveže.
 * Neveljavne strani predpomnilnik ne vrne (`zaPredpomnilnik`), zato je taka že
 * sveža — drugič je ne beremo.
 */
async function tekmeKrogaZ(koda, prenesi, edition, sveze) {
  const html = await beri(prenesi, naslovKroga(koda, edition), imeKroga(edition), sveze)
  if (!jeStranKroga(html)) throw new Error(`fmf: ${naslovKroga(koda, edition)} ni stran kroga — uvoz ustavljen`)
  return tekmeKroga(html)
}

/** Pot PDF s strani tekme; stran brez povezave ne gre v predpomnilnik, zato je vedno sveža. */
async function pdfTekme(prenesi, id, sveze) {
  return potZapisnika(await beri(prenesi, naslovTekme(id), imeTekme(id), sveze))
}

/**
 * Tekme z izidom s šifro tekme (s strani krogov): [{ ...tekmaTiska, id }].
 * Tekma, ki je ni na strani svojega kroga, gre v opozorilo.
 */
async function odigraneSSifro(koda, prenesi, tekme) {
  const odigrane = tekme.filter((t) => t.izid && t.krog)
  const poKrogih = [...new Set(odigrane.map((t) => t.krog))].sort((a, b) => a - b)
  const editions = await krogiZEdition(koda, prenesi, poKrogih)
  const out = []
  for (const k of poKrogih) {
    const vKrogu = odigrane.filter((t) => t.krog === k)
    // Krog, v katerem je vse odigrano pred več kot tednom, se ne spreminja več.
    const sveze = tekme.some((t) => t.krog === k && (!t.izid || starostDni(t.datum) <= 7))
    let naStrani = await tekmeKrogaZ(koda, prenesi, editions.get(k), sveze)
    if (!sveze && vKrogu.some((t) => !naStrani.some((s) => isti(s.domaci, t.domaci) && isti(s.gostje, t.gostje))))
      naStrani = await tekmeKrogaZ(koda, prenesi, editions.get(k), true)
    for (const t of vKrogu) {
      const s = naStrani.find((x) => isti(x.domaci, t.domaci) && isti(x.gostje, t.gostje))
      if (!s) { console.log(`  fmf: ${t.domaci} - ${t.gostje} (${k}. krog) ni na strani kroga — preskočeno`); continue }
      out.push({ ...t, id: s.id })
    }
  }
  return out
}

const vir = {
  ime: 'fmf',
  polnoIme: 'Federația Moldovenească de Fotbal (fmf.md)',
  drzava: 'MD',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 3000,
  imaRegistracije: false,
  // Šifra osebe pride šele z obliko A (od 7. kroga): igralec, vpisan brez nje, jo
  // dobi ob prvem zapisniku s šifro (uvoz ga posvoji po klubu in imenu), sicer
  // bi bil isti človek dva zapisa z ločeno statistiko in ceno.
  sifraPozneje: true,
  fetch: (url, moznosti) => fmfFetch(url, moznosti),

  naslovRazporeda: naslovTiska,
  naslovZapisnika: (_koda, id) => naslovTekme(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new FmfZavrnitev(`fmf: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  zaPredpomnilnik,

  // Razpored je tiskana stran (ena zahteva); uvoz razporeda jo prebere sam.
  razcleniRazpored: (_vrstice, html) => razcleniRazpored(html),
  vBesedilo: (s) => String(s ?? '').split('\n'),

  async zapisniki(koda, prenesi) {
    const html = await tisk(koda, prenesi)
    const sezona = sezonaTiska(html)
    const tekme = tekmeTiska(html)
    const prvi = tekme.filter((t) => t.krog).sort((a, b) => a.krog - b.krog || String(a.datum).localeCompare(String(b.datum)))[0]
    // Uvoz razporeda sezono izpelje iz datuma prve tekme (meja 1. julij); liga,
    // ki začne junija (Super Liga 2026/27: 27. 6.), bi pristala v napačni sezoni.
    if (prvi?.datum && sezona && sezonaIz(prvi.datum) !== sezona)
      throw new Error(`fmf: sezona ${sezona} se začne ${prvi.datum} (pred 1. julijem) — uvoz razporeda bi jo vpisal v ${sezonaIz(prvi.datum)}; uvoz ustavljen`)
    const out = []
    for (const t of await odigraneSSifro(koda, prenesi, tekme)) {
      const star = starostDni(t.datum)
      const sveze = star <= 3
      const pot = await pdfTekme(prenesi, t.id, sveze)
      if (!pot) continue // brez zapisnika (kontumacija ali še ni objavljen)
      const url = naslovPdf(pot)
      // Nepopoln zapisnik ne gre v predpomnilnik, zato se ob vsakem uvozu prebere svež.
      const txt = await beri(prenesi, url, imeZapisnika(t.id), sveze)
      const id = sifraZapisnika(t.id)
      const z = vZapisnik(txt, { id, url: naslovTekme(t.id) })
      if (!z) continue
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      if (z.krog != null && z.krog !== t.krog) z.opozorila.push(`zapisnik ima ${z.krog}. krog, razpored ${t.krog}.`)
      // Ime kluba, krog in sezona z razporeda, da se tekma ujame z vrstico razporeda.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = sezona ?? z.sezona
      z.datum = t.datum ?? z.datum
      z.zapisnikId = id
      out.push({ id, z, url: naslovTekme(t.id) })
    }
    const brez = dopolniSifre(out.map((x) => x.z))
    if (brez) console.log(`  fmf: ${brez} nastopov v zapisnikih brez šifre COMET (ime + klub)`)
    // Najprej zapisniki s šiframi vseh igralcev: igralec brez šifre se tako
    // ujame z že vpisanim igralcem s šifro istega kluba in imena.
    const polni = (x) => [x.z.domaci, x.z.gostje].every((e) => [...e.postava, ...e.rezerve].every((i) => i.comet))
    return [...out.filter(polni), ...out.filter((x) => !polni(x))]
  },

  /**
   * Kontumacije: tekma s 3:0 ali 0:3, starejša od tedna dni, brez zapisnika
   * (stran tekme nima PDF). Bere le take tekme.
   */
  async kontumacije(koda, prenesiKrog, krogi, danes) {
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    const kandidati = []
    for (const k of krogi) for (const t of k.tekme) if (jeTriNic(t.izid) && t.datum && t.datum <= teden) kandidati.push({ ...t, krog: k.stevilka })
    if (!kandidati.length) return []
    const meni = await prenesiKrog(naslovTekmovanja(koda), imeTekmovanja(koda), null)
    const editions = krogiTekmovanja(meni)
    const out = []
    for (const t of kandidati) {
      const e = editions.get(t.krog)
      if (!e) continue
      const s = tekmeKroga(await prenesiKrog(naslovKroga(koda, e), imeKroga(e), t.datum)).find((x) => isti(x.domaci, t.domaci) && isti(x.gostje, t.gostje))
      if (!s) continue
      const html = await prenesiKrog(naslovTekme(s.id), imeTekme(s.id), t.datum)
      if (jeStranTekme(html) && !potZapisnika(html)) out.push({ krog: t.krog, domaci: t.domaci, gostje: t.gostje })
    }
    return out
  },

  nastopi,

  kljucKluba: kljucKlubaMd,
  kratkoIme: kratkoImeMd,
  poenostavi: kljucKlubaMd,
}

export default vir
