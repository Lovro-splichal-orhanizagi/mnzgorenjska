// Vir: Georgian Football Federation — liga.gff.ge (Liga 3 in Liga 4).
//
// GFF na liga.gff.ge (Drupal, izdelal Omedia) objavi tretjo in četrto ligo
// (raven 3 in 4) z zapisnikom vsake tekme. HTML iz strežnika, brez izziva.
// Glej CLAUDE.md (Gruzija — vir gff).
//
// SEZONA je koledarsko leto (marec–november): 2026 = "2026"
// (`competitions.sezona_koledarska`). Leto pove izbirnik sezone na strani lige.
//
// ŠIFRA LIGE je `<sezona>/<liga>`: `<sezona>` je id sezone iz izbirnika
// (44 = 2026, 41 = 2025, 38 = 2024 …; ni letnica in ni enakomeren), `<liga>`
// id lige na strani (3 = Liga 3, 4 = Liga 4, 5 = play-off; 2020–2021 je bila
// Liga 4 v skupinah 14/15 in 23/24). Vsaka sezona ima svoj id — ob novi sezoni
// se popravi le prvi del šifre.
//
// STRANI LIGE: `/results?season=<s>&league=<l>` (odigrane tekme, krogi
// "ტური N", datum brez leta in ure, izid) in `/calendar?season=<s>&league=<l>`
// (neodigrane, z uro po tbilisijskem času). Tekma je `/game/<nid>-<slug>`
// (nid je id objave Drupal, slug okras).
//
// ZAPISNIK (stran tekme): `<time datetime="…+04:00">`, izid
// (`gfgc-score-item-1/2`), "ლიგა 4 / სეზონი 2026 / ტური 23" (`gf-tour`).
// Postavi sta prosto besedilo urejevalnika (`gf-line-up-1`, `gf-line-up-2`):
// "12. ime priimek" po vrsticah, kapetan `badge-c`, za "სათადარიგო
// შემადგენლობა" klop, za "მთავარი მწვრთნელი" trener. Dresov ni pri vseh,
// vratar NI označen — kot pri COMET je našteti prvi (namig, kot mlsz in ffm).
// Dogodki so JSON v atributu `data-events` (`gf-game-events-finished`):
// minute, minute_addit, side (club_1/club_2), type in ime v text_ka (gruzinsko,
// enako kot v postavi) in text_en (latinica, male črke). Vrste (CSS strani):
// goal, goal_p (11 m), goal_auto (avtogol), penalty_miss, yellow_card,
// yellow_red_card (drugi rumeni), red_card, substitution ("noter / ven"),
// game_stopped; minute ≥ 200 je izvajanje 11 m po tekmi (ne štejemo).
//
// robots.txt: `User-agent: *` s `Crawl-delay: 10`, prepoveduje le sistemske
// poti Drupala (/admin/, /user/…, /search/ …); /results, /calendar in /game/
// so dovoljene. Beremo odkrito (User-Agent SLFF, 10 s med zahtevki), zapisnikov,
// starejših od tedna, ne beremo znova. Ob izzivu, CAPTCHI, 403 ali 429 se uvoz
// ustavi — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { vPriimekIme } from './sportnet.mjs'
import { nastopi as nastopiPoImenu } from './fss.mjs'

const OSNOVNI = 'https://liga.gff.ge'
const DOLZINA_TEKME = 90

/** "44/3" → { sezona: '44', liga: '3' }. */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)\/(\d+)$/)
  if (!m) throw new Error(`gff: šifra lige je "<sezona>/<liga>" (npr. 44/3 = Liga 3 2026), ne "${koda}"`)
  return { sezona: m[1], liga: m[2] }
}

export const naslovRezultatov = (koda) => {
  const { sezona, liga } = razberiKodo(koda)
  return `${OSNOVNI}/results?season=${sezona}&league=${liga}`
}
export const naslovKoledarja = (koda) => {
  const { sezona, liga } = razberiKodo(koda)
  return `${OSNOVNI}/calendar?season=${sezona}&league=${liga}`
}
// Šifra zapisnika v bazi je `ge<nid>`: id objave Drupal (4921) je v prostoru
// drugih virov, `matches.zapisnik_id` pa je enoličen čez vse vire.
export const sifraZapisnika = (id) => `ge${String(id).replace(/^ge/, '')}`
// Stran tekme je `/game/<nid>-<slug>`; brez poti (le id) Drupal stran najde
// pod `/node/<nid>`.
export const naslovZapisnika = (id, pot = null) =>
  pot ? `${OSNOVNI}${pot}` : `${OSNOVNI}/node/${String(id).replace(/^ge/, '')}`
const imeStrani = (vrsta, koda) => `${vrsta}-${String(koda).replace(/\//g, '-')}.html`
const imeZapisnika = (id) => `game-${String(id).replace(/^ge/, '')}.html`

const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim()

/** Zavrnitev (403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class GffZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'GffZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 403 || status === 429
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/** Minuta dogodka: 90 + podaljšek → 90; ≥ 200 (11 m po tekmi) → null. */
export function minuta(min) {
  const n = Number(min)
  if (!Number.isFinite(n) || n >= 200) return null
  return Math.min(Math.max(n, 0), DOLZINA_TEKME)
}

// Gruzinski meseci (imenovalnik in okrajšave: "ოქტომბერი", "ოქტ.").
const MESECI = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ']

/** "ხუთშაბათი, 8 ოქტომბერი" + leto → "2026-10-08". */
export function datumIz(s, leto) {
  const m = String(s ?? '').match(/(\d{1,2})\s+(\S+)/)
  if (!m || !/^\d{4}$/.test(String(leto ?? ''))) return null
  const i = MESECI.indexOf([...m[2]].slice(0, 3).join(''))
  if (i < 0) return null
  return `${leto}-${String(i + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

const oblikaLjubljana = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})
/** Tbilisijski čas (UTC+4, brez poletnega) → ljubljanski { datum, ura }. */
export function vLjubljanskiCas(datum, ura) {
  const u = String(ura ?? '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!datum || !u) return { datum: datum ?? null, ura: null }
  const ms = Date.parse(`${datum}T${u[1].padStart(2, '0')}:${u[2]}:00+04:00`)
  if (!Number.isFinite(ms)) return { datum, ura: null }
  const [d, h] = oblikaLjubljana.format(new Date(ms)).split(' ')
  return { datum: d, ura: h }
}

// --- strani lige ----------------------------------------------------------------

/**
 * Leto sezone iz izbirnika ("სეზონი 2026") in preverba, da stran res kaže
 * zahtevano ligo: izbrana povezava (`class="active"`) mora biti ta sezona in
 * liga. Neznan id stran tiho zamenja s privzeto — tedaj uvoz ustavimo.
 */
export function letoStrani(koda, html) {
  const { sezona, liga } = razberiKodo(koda)
  const s = String(html ?? '')
  const leto = s.match(new RegExp(`<option value="${sezona}"[^>]*>[^<]*?(\\d{4})`))?.[1] ?? null
  const aktivna = s.match(/<a href="\/(?:results|calendar)\?season=(\d+)&amp;league=(\d+)"\s*class="active"/)
  if (!leto || !aktivna || aktivna[1] !== sezona || aktivna[2] !== liga)
    throw new Error(`gff: stran ne kaže lige ${koda} (izbrana ${aktivna ? `${aktivna[1]}/${aktivna[2]}` : 'nobena'}, leto ${leto ?? '?'}) — uvoz ustavljen`)
  return leto
}

/**
 * Tekme strani rezultatov ali koledarja: [{ krog, id, pot, datum, ura,
 * domaci, gostje, izid }]. Datum je po tbilisijskem koledarju, ura (le na
 * koledarju) pretvorjena v ljubljansko.
 */
export function tekmeStrani(koda, html) {
  const leto = letoStrani(koda, html)
  const s = cisto(html)
  const out = []
  for (const del of s.split(/<h2 class="(?:rb|cb)-tour-name">/).slice(1)) {
    const krog = Number(besedilo(del.match(/-tour-name-inner">([\s\S]*?)<\/span>/)?.[1]).match(/ტური\s*(\d+)/)?.[1])
    if (!krog) continue
    // Datum je naslov `rb-date`/`cb-date` nad seznamom tekem tega dne.
    for (const dan of del.split(/<h3 class="(?:rb|cb)-date">/).slice(1)) {
      const datum = datumIz(besedilo(dan.match(/^([\s\S]*?)<\/h3>/)?.[1]), leto)
      for (const t of dan.split(/<a class="(?:rb|cb)-item[^"]*" href="/).slice(1)) {
        const pot = t.match(/^(\/game\/[^"]+)"/)?.[1] ?? null
        const id = pot?.match(/^\/game\/(\d+)/)?.[1] ?? null
        const imena = [...t.matchAll(/<span class="(?:rb|cb)-name name-[12]">([\s\S]*?)<\/span>/g)].map((x) => besedilo(x[1]))
        if (!id || imena.length !== 2) continue
        const r1 = besedilo(t.match(/llgt-score-1">([\s\S]*?)<\/span>/)?.[1])
        const r2 = besedilo(t.match(/llgt-score-2">([\s\S]*?)<\/span>/)?.[1])
        const ura = besedilo(t.match(/<span class="cb-time">([\s\S]*?)<\/span>\s*<\/span>/)?.[1]).match(/(\d{1,2}:\d{2})/)?.[1] ?? null
        const cas = vLjubljanskiCas(datum, ura)
        out.push({
          krog,
          id,
          pot,
          datum: cas.datum,
          ura: cas.ura,
          domaci: imena[0],
          gostje: imena[1],
          izid: /^\d+$/.test(r1) && /^\d+$/.test(r2) ? { domaci: Number(r1), gostje: Number(r2) } : null,
        })
      }
    }
  }
  return { leto, tekme: out }
}

/**
 * Razpored lige iz obeh strani (rezultati + koledar) v obliko uvoza
 * razporeda. Tekma je na eni od njiju; ista tekma (nid) na obeh šteje enkrat,
 * odigrana prednjači.
 */
export function razporedIzStrani(rezultati, koledar) {
  const poId = new Map()
  for (const t of [...koledar, ...rezultati]) poId.set(t.id, t)
  const krogi = new Map()
  for (const t of poId.values()) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: !!t.izid,
      gffId: t.id, pot: t.pot, izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ------------------------------------------------------------------

const ZNANE = new Set(['goal', 'goal_p', 'goal_auto', 'penalty_miss', 'yellow_card', 'yellow_red_card', 'red_card', 'substitution', 'game_stopped'])

/** Ime za primerjavo: brez ločil, presledki strnjeni, male črke. */
export const kljucImena = (ime) => razpakiraj(String(ime ?? '')).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Levenshteinova razdalja (po znakih; gruzinske črke so ena koda). */
export function razdalja(a, b) {
  const x = [...String(a)]
  const y = [...String(b)]
  let prej = Array.from({ length: y.length + 1 }, (_, j) => j)
  for (let i = 1; i <= x.length; i++) {
    const zdaj = [i]
    for (let j = 1; j <= y.length; j++)
      zdaj[j] = Math.min(prej[j] + 1, zdaj[j - 1] + 1, prej[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1))
    prej = zdaj
  }
  return prej[y.length]
}

/** Dogodki iz atributa `data-events` (JSON). */
export function dogodkiStrani(html) {
  const a = String(html ?? '').match(/data-events="([^"]*)"/)?.[1]
  if (a == null) return null
  const json = a.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  try {
    const d = JSON.parse(json)
    return Array.isArray(d) ? d : null
  } catch {
    return null
  }
}

/**
 * Postava ene ekipe iz besedila urejevalnika: { postava, rezerve, opozorila }.
 * Vrstica igralca je "12. ime priimek" (dres lahko manjka), kapetan `badge-c`.
 */
export function postavaIzBesedila(html) {
  const vrstice = String(html ?? '')
    .replace(/<span class="badge-c">\s*C\s*<\/span>/gi, ' ⒸKAPETAN ')
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((v) => razpakiraj(v).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const postava = []
  const rezerve = []
  const opozorila = []
  let del = 'postava'
  for (const v of vrstice) {
    if (/სათადარიგო/.test(v)) { del = 'rezerve'; continue }
    if (/მწვრთნელ|ექიმ|მენეჯერ|ადმინისტრატორ|წარმომადგენელ/.test(v)) { del = 'konec'; continue }
    if (del === 'konec') continue
    const kapetan = /ⒸKAPETAN/.test(v)
    const t = v.replace(/ⒸKAPETAN/g, ' ').replace(/\s+/g, ' ').trim()
    const m = t.match(/^(?:(\d{1,3})\s*[.)\-–]?\s+)?(\p{L}[\p{L}\p{M}'’.\- ]*\p{L})$/u)
    if (!m) {
      opozorila.push(`neznana vrstica postave "${t}"`)
      continue
    }
    const polnoIme = m[2].replace(/\s+/g, ' ').trim()
    ;(del === 'postava' ? postava : rezerve).push({
      st: m[1] ? Number(m[1]) : null,
      ime: vPriimekIme(polnoIme),
      polnoIme,
      kapetan,
      zacetnik: del === 'postava',
    })
  }
  return { postava, rezerve, opozorila }
}

/** Glava strani tekme: { id, stanje, datum, ura, izid, liga, sezona, krog, domaci, gostje }. */
export function glavaTekme(html) {
  const s = cisto(html)
  const cas = s.match(/<time class="gf-game-date" datetime="(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  const { datum, ura } = cas ? vLjubljanskiCas(cas[1], cas[2]) : { datum: null, ura: null }
  const r1 = besedilo(s.match(/gfgc-score-item-1">([\s\S]*?)<\/div>/)?.[1])
  const r2 = besedilo(s.match(/gfgc-score-item-2">([\s\S]*?)<\/div>/)?.[1])
  const tura = besedilo((s.match(/<div class="gf-tour">([\s\S]*?)<\/div>/)?.[1] ?? '').replace(/<br\s*\/?>/g, '|'))
  const [liga, sez, kr] = tura.split('|').map((x) => x.trim())
  const imena = [...s.matchAll(/<span class="gf-head-club-name">([\s\S]*?)<\/span>/g)].map((m) => besedilo(m[1]))
  return {
    id: s.match(/<article id="node-(\d+)"/)?.[1] ?? null,
    stanje: s.match(/data-game-status="([^"]*)"/)?.[1] ?? null,
    datum,
    ura,
    izid: /^\d+$/.test(r1) && /^\d+$/.test(r2) ? { domaci: Number(r1), gostje: Number(r2) } : null,
    liga: liga || null,
    sezona: sez?.match(/(\d{4})/)?.[1] ?? null,
    krog: Number(kr?.match(/(\d+)/)?.[1]) || null,
    domaci: imena[0] ?? null,
    gostje: imena[1] ?? null,
  }
}

const blokPostave = (s, n) => {
  const i = s.indexOf(`gf-line-up-${n}`)
  if (i < 0) return ''
  const oznaka = s.indexOf('gf-line-ups-text', i)
  // Domači brez postave: besedilo, ki sledi, je že postava gostov.
  if (oznaka < 0 || (n === 1 && s.indexOf('gf-line-up-2', i) >= 0 && oznaka > s.indexOf('gf-line-up-2', i))) return ''
  const j = s.indexOf('>', oznaka) + 1
  // Konec: začetek oznake `<div … gf-line-up-2">` oziroma konec zavihka.
  const druga = n === 1 ? s.indexOf('gf-line-up-2', j) : -1
  const konec = druga >= 0 ? s.lastIndexOf('<div', druga) : s.indexOf('</article>', j)
  return s.slice(j, konec < 0 ? undefined : konec)
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma ni končana, nima
 * izida ali kateri od ekip manjka postava (neodigrana tekma, kontumacija).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = String(html ?? '')
  const g = glavaTekme(s)
  if (!g.izid || (g.stanje && g.stanje !== 'finished')) return null
  const opozorila = []
  const ekipe = [1, 2].map((n) => {
    const p = postavaIzBesedila(blokPostave(cisto(s), n))
    for (const o of p.opozorila) opozorila.push(`${n === 1 ? g.domaci : g.gostje}: ${o}`)
    return { ime: n === 1 ? g.domaci : g.gostje, postava: p.postava, rezerve: p.rezerve }
  })
  if (!ekipe[0].postava.length || !ekipe[1].postava.length) return null

  // Vratar ni označen; COMET (in GFF za njim) ga našteje prvega — namig.
  for (const e of ekipe) e.postava.forEach((i, n) => { i.vratar = n === 0 })

  // Igralec dogodka: natančno ime (text_ka) v ekipi dogodka, sicer edini s
  // tem priimkom, sicer v drugi ekipi (avtogol, napačna stran).
  const najdi = (ekipaIdx, ime) => {
    const k = kljucImena(ime)
    if (!k) return null
    const vse = (idx) => [...ekipe[idx].postava, ...ekipe[idx].rezerve].map((i) => ({ i, idx }))
    for (const idx of [ekipaIdx, 1 - ekipaIdx]) {
      const tocno = vse(idx).filter((x) => kljucImena(x.i.polnoIme) === k)
      if (tocno.length === 1) return tocno[0]
    }
    const priimek = k.split(' ').at(-1)
    const poPriimku = vse(ekipaIdx).filter((x) => kljucImena(x.i.polnoIme).split(' ').at(-1) === priimek)
    if (poPriimku.length === 1) return poPriimku[0]
    // Tipkarska napaka v dogodku ("გიორგი მაღალდაძემ" za "გიორგი მაღალდაძე"):
    // edini igralec ekipe, od katerega se ime razlikuje za največ dva znaka.
    const blizu = vse(ekipaIdx).filter((x) => razdalja(kljucImena(x.i.polnoIme), k) <= 2)
    return blizu.length === 1 ? blizu[0] : null
  }

  const dogodki = dogodkiStrani(s)
  if (dogodki == null) opozorila.push('stran nima dogodkov (data-events)')
  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  const kdoJe = (ekipaIdx, ime, vrsta) => {
    const x = najdi(ekipaIdx, ime)
    if (!x) {
      opozorila.push(`${ekipe[ekipaIdx].ime}: igralca "${ime}" (${vrsta}) ni v postavi`)
      return { ekipaIdx, st: null, ime: vPriimekIme(String(ime ?? '').trim()), igralec: null }
    }
    return { ekipaIdx: x.idx, st: x.i.st, ime: x.i.ime, igralec: x.i }
  }
  for (const d of dogodki ?? []) {
    if (!ZNANE.has(d.type)) opozorila.push(`neznan dogodek "${d.type}" (${d.minute}')`)
    if (Number(d.minute) >= 200 || d.type === 'game_stopped') continue
    const ekipaIdx = d.side === 'club_2' ? 1 : 0
    const min = minuta(d.minute)
    // Pripis v oklepaju ni del imena: "ბექა კაკუშაძე (სათადარიგო სკამიდან)" =
    // rdeči karton igralcu na klopi.
    const ime = String(d.text_ka || d.text_en || '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
    if (d.type === 'goal' || d.type === 'goal_p') {
      const k = kdoJe(ekipaIdx, ime, d.type)
      goli.push({ ekipaIdx: k.ekipaIdx, st: k.st, ime: k.ime, minuta: min, avtogol: false, enajstmetrovka: d.type === 'goal_p' })
    } else if (d.type === 'goal_auto') {
      // Avtogol: stran ga vpiše na stran ekipe, ki ji gol šteje; strelec je v
      // nasprotni ekipi. Pri nas je gol pri strelcu v njegovi ekipi.
      const k = kdoJe(1 - ekipaIdx, ime, d.type)
      goli.push({ ekipaIdx: k.ekipaIdx, st: k.st, ime: k.ime, minuta: min, avtogol: true, enajstmetrovka: false })
    } else if (d.type === 'penalty_miss') {
      const k = kdoJe(ekipaIdx, ime, d.type)
      zgresene.push({ ekipaIdx: k.ekipaIdx, st: k.st, ime: k.ime, minuta: min })
    } else if (d.type === 'yellow_card') {
      const k = kdoJe(ekipaIdx, ime, d.type)
      rumeni.push({ ekipaIdx: k.ekipaIdx, st: k.st, ime: k.ime, minuta: min })
    } else if (d.type === 'red_card' || d.type === 'yellow_red_card') {
      const k = kdoJe(ekipaIdx, ime, d.type)
      if (!rdeci.some((r) => r.ekipaIdx === k.ekipaIdx && r.st === k.st && r.ime === k.ime)) rdeci.push({ ekipaIdx: k.ekipaIdx, st: k.st, ime: k.ime, minuta: min, drugiRumeni: d.type === 'yellow_red_card' })
      if (k.igralec) k.igralec.rdec ??= min
    } else if (d.type === 'substitution') {
      const [noterIme, venIme] = ime.split('/').map((x) => x.trim())
      if (!noterIme || !venIme) {
        opozorila.push(`${ekipe[ekipaIdx].ime}: menjava "${ime}" brez "noter / ven" (${d.minute}')`)
        continue
      }
      let noter = kdoJe(ekipaIdx, noterIme, 'vstop')
      let ven = kdoJe(ekipaIdx, venIme, 'izstop')
      // Obrnjen vnos (Kolkheti Khobi, 4605: "začetnik / rezerva"): noter gre
      // začetnik, ki je na igrišču, ven rezerva, ki še ni vstopila — zamenjamo.
      if (noter.igralec?.zacetnik && noter.igralec.ven == null && ven.igralec && !ven.igralec.zacetnik && ven.igralec.noter == null) {
        opozorila.push(`${ekipe[ekipaIdx].ime}: menjava ${min}' je vpisana obrnjeno (${noter.ime} / ${ven.ime}) — zamenjano`)
        ;[noter, ven] = [ven, noter]
      }
      if (noter.igralec) noter.igralec.noter ??= min
      if (ven.igralec?.ven != null) opozorila.push(`${ekipe[ekipaIdx].ime}: ${ven.ime} gre ven dvakrat (${ven.igralec.ven}' in ${min}')`)
      if (ven.igralec) ven.igralec.ven ??= min
      menjave.push({ ekipaIdx, minuta: min, noter: { st: noter.st, ime: noter.ime }, ven: { st: ven.st, ime: ven.ime } })
    }
  }
  // Drugi rumeni: prvi rumeni je svoj dogodek; več rumenih ob drugem rumenem
  // skrčimo na enega — kot pri drugih virih 1 rumeni + 1 rdeči.
  for (const r of rdeci.filter((x) => x.drugiRumeni)) {
    const moji = rumeni.filter((y) => y.ekipaIdx === r.ekipaIdx && y.st === r.st && y.ime === r.ime)
    for (const odvec of moji.slice(1)) rumeni.splice(rumeni.indexOf(odvec), 1)
  }

  ekipe.forEach((e, idx) => {
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const kljuci = new Map()
    for (const i of [...e.postava, ...e.rezerve]) kljuci.set(`${i.st}|${i.ime}`, (kljuci.get(`${i.st}|${i.ime}`) ?? 0) + 1)
    for (const [k, n] of kljuci) if (n > 1) opozorila.push(`${e.ime}: igralec ${k.split('|')[1]} je v zapisniku ${n}-krat`)
    for (const i of e.rezerve) if (i.ven != null && i.noter == null) opozorila.push(`${e.ime}: ${i.ime} gre ven, ne da bi vstopil`)
    void idx
  })
  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  if (zaEkipo(0) !== g.izid.domaci || zaEkipo(1) !== g.izid.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${g.izid.domaci}:${g.izid.gostje}`)

  const vObliko = ({ polnoIme: _p, ...i }) => ({ noter: null, ven: null, rdec: null, ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: g.sezona,
    krog: g.krog,
    datum: g.datum,
    ura: g.ura,
    liga: g.liga,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat: g.izid,
    // Polčasa stran ne pove (`gfgc-halftime` je prazen).
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci: rdeci.map(({ drugiRumeni: _d, ...r }) => r),
    menjave,
    opozorila,
  }
}

/** Nastopi po imenu in dresu (kot fss): začetnik od 0, rezerva od vstopa. */
export const nastopi = (z) => nastopiPoImenu(z)

// --- klubi ---------------------------------------------------------------------

// Ključ kluba: gruzinske črke (pisava nima velikih in malih), števke ostanejo —
// "სამგურალი 2" (druga ekipa) ni "სამგურალი".
export const kljucKlubaGe = (ime) =>
  razpakiraj(ime)
    .toLowerCase()
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

/** Kratko ime: stran piše kratka imena ("ალგეთი", "გაგრა 2"); največ tri besede. */
export const kratkoImeGe = (polno) => razpakiraj(polno).trim().split(/\s+/).slice(0, 3).join(' ')

// --- prenos --------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new GffZavrnitev(`gff: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new GffZavrnitev(`gff: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

const vir = {
  ime: 'gff',
  polnoIme: 'Georgian Football Federation (liga.gff.ge)',
  drzava: 'GE',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  // robots.txt: Crawl-delay: 10.
  premorMs: 10000,
  imaRegistracije: false,

  naslovRazporeda: naslovRezultatov,
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new GffZavrnitev(`gff: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    const rez = tekmeStrani(koda, await beri(prenesi, naslovRezultatov(koda), imeStrani('results', koda), true))
    const kol = tekmeStrani(koda, await beri(prenesi, naslovKoledarja(koda), imeStrani('calendar', koda), true))
    return razporedIzStrani(rez.tekme, kol.tekme)
  },

  async zapisniki(koda, prenesi) {
    const { leto, tekme } = tekmeStrani(koda, await beri(prenesi, naslovRezultatov(koda), imeStrani('results', koda), true))
    const out = []
    for (const t of tekme.filter((x) => x.izid)) {
      const url = naslovZapisnika(t.id, t.pot)
      // Zapisnik zadnjega tedna se lahko še popravlja; starejšega ne beremo znova.
      const z = vZapisnik(await beri(prenesi, url, imeZapisnika(t.id), starostDni(t.datum) <= 7), { id: t.id, url })
      if (!z) continue
      // Ime kluba, krog in sezona z razporeda, da se tekma ujame z vrstico razporeda.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = leto
      z.datum ??= t.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      z.zapisnikId = sifraZapisnika(t.id)
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  /**
   * Kontumacije: tekma z izidom 3:0 ali 0:3, starejša od tedna dni, katere
   * stran nima postav. V pregledu (21 tekem 3:0 / 0:3 v sezonah 2025 in 2026) take
   * še ni bilo — vse so imele zapisnik. Bere le take tekme; stran gre v isti
   * predpomnilnik kot pri uvozu zapisnikov.
   */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.gffId || !t.datum || t.datum > teden) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const html = await prenesiKrog(naslovZapisnika(t.gffId, t.pot), imeZapisnika(t.gffId), t.datum)
        if (jeIzziv(html)) throw new GffZavrnitev(`gff: ${naslovZapisnika(t.gffId, t.pot)} vrne izziv (CAPTCHA)`)
        if (!vZapisnik(html) && glavaTekme(html).izid) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaGe,
  kratkoIme: kratkoImeGe,
  poenostavi: kljucKlubaGe,
}

export default vir
