// Vir: regionalne zveze EPS (Ένωση Ποδοσφαιρικών Σωματείων, Grčija) na skupni
// platformi "results.php" — epspeir.gr, epsana.gr, epsda.gr, epsip.gr,
// epsdod.gr, epsarg.gr, epsarkadias.gr, epshalkidikis.gr, epski.gr,
// epskyklades.gr, epslak.gr, epsmes.gr, epsxiou.gr, epsf.gr, epsath.gr,
// epsevias.gr.
//
// Vsaka zveza ima svojo domeno in svojo bazo, koda (noga "Shipwrecked Frontier
// Pioneer & UnScrupulous", pri Atenah "Stargoose") pa je ista. Lige so A/B/Γ
// Κατηγορία zveze (raven 4–6), po skupinah. Glej CLAUDE.md (Grčija — vir eps).
//
// ŠIFRA LIGE je `<domena>:<league_id>` (`epspeir.gr:726` = Pireja, Α Κατηγορία
// 1. skupina 2026/27). Vsaka sezona ima svoj league_id (izbirnik sezone na
// /results/results.php?period_id=…), ob novi sezoni se popravi šifra.
//
// STRANI (vse z istim league_id):
// - razpored `/results/display_schedule.php?league_id=N`: naslov
//   "Πρόγραμμα Αγώνων Περιόδου 2026-2027", krogi `<h2>Nη Αγωνιστική</h2>`,
//   vrstica: "Domači - Gostje" (zmagovalec krepko), igrišče, dan, datum
//   dd/mm/yy, ura (atenski čas, −1 h = ljubljanski; 00:00 = ure ni), sodniki,
//   izid ("1-4"; "0-3 α.α." = άνευ αγώνος, kontumacija). Povezava na tekmo je
//   le pri nekaterih odigranih — zato še:
// - mreža `/results/display_results.php?league_id=N`: vse odigrane tekme kot
//   povezave `display_game.php?game_id=N` z izidom (tudi "α.α.").
// - tekma `/results/display_game.php?game_id=N`: naslov s sezono, ligo in
//   krogom ("1η Αγωνιστική"), klubi, izid, časovnica "Διακύμανση
//   Αποτελέσματος" (ikona, stanje, minuta, igralec v stolpcu domačih ali
//   gostov), postavi "Συμμετοχές" (vrstice 1–11 začetniki, za
//   "Αναπληρωματικοί" klop; številka vrstice NI dres) in "Γενικές
//   Πληροφορίες" (datum dd-mm-yyyy, ura).
// Ikone časovnice: ball (gol), ball_yellow (gol z 11 m), ball_red (avtogol —
// igralec je v stolpcu SVOJE ekipe, gol šteje nasprotniku), yellowCard,
// redCard, yellowRedCards (drugi rumeni; prvi je svoj dogodek), redArrow
// (izstop), greenArrow (vstop).
//
// IDENTITETA: igralec ima `player_id` (`display_player.php?player_id=N`), a
// vsaka zveza šteje svoje — šifra osebe je zato `<zveza> * 10^7 + player_id`
// (ZVEZE spodaj, številke se ne smejo nikoli spremeniti). Šifra zapisnika v
// bazi je `gr<zveza>-<game_id>`. Dresov in pozicij vir nima; postava je v
// klasičnem vrstnem redu 1–11, zato je prvi začetnik vratar (namig). Letnice
// rojstva ne beremo.
//
// robots.txt vrne 404 na prvih 14 domenah (15. 10. 2026), pogojev uporabe ni.
// epsath.gr (Atene) in epsevias.gr (Evbeja) robots.txt prepove /results/
// (Atene še ClaudeBot): beremo ju LE zaradi pisnega dovoljenja upravljavca
// (pridobil Lovro, oktober 2026). Dovoljenje ne velja za tehnično zaščito.
// Beremo odkrito (User-Agent SLFF, 3 s med zahtevki), zapisnikov, starejših
// od tedna, ne beremo znova. Ob izzivu, CAPTCHI, 401, 403 ali 429 se uvoz
// ustavi — ne obhajaj.
import { existsSync, readFileSync } from 'node:fs'
import { razpakiraj } from '../klubi.mjs'
import { nastopi } from './hlf.mjs'
import { NEPOPOLN, vLjubljanskiCas } from './frf.mjs'
import { sifra } from './zapisniki.mjs'

export { nastopi, NEPOPOLN }

const DOLZINA_TEKME = 90
const NAJMANJ_ZACETNIKOV = 7
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'
const MAPA = 'scripts/.predpomnilnik/eps'
const DAN = 86400000

// Domena zveze → stalna številka (del šifre igralca in zapisnika). NIKOLI ne
// preštevilči in ne odstrani vrstice; nova zveza dobi novo številko.
export const ZVEZE = {
  'epspeir.gr': 1, // Pirej
  'epsana.gr': 2, // Vzhodna Atika
  'epsda.gr': 3, // Zahodna Atika
  'epsip.gr': 4, // Epir
  'epsdod.gr': 5, // Dodekanez
  'epsarg.gr': 6, // Argolida
  'epsarkadias.gr': 7, // Arkadija
  'epshalkidikis.gr': 8, // Halkidika
  'epski.gr': 9, // Kilkis
  'epskyklades.gr': 10, // Kikladi
  'epslak.gr': 11, // Lakonija
  'epsmes.gr': 12, // Mesenija
  'epsxiou.gr': 13, // Hios
  'epsf.gr': 14, // Ftiotida
  'epsath.gr': 15, // Atene (pisno dovoljenje, glej zgoraj)
  'epsevias.gr': 16, // Evbeja (pisno dovoljenje, glej zgoraj)
}
const DOMENA_ZVEZE = new Map(Object.entries(ZVEZE).map(([d, n]) => [n, d]))
const IGRALCEV_NA_ZVEZO = 10_000_000

// --- šifre in naslovi ---------------------------------------------------------

/** "epspeir.gr:726" → { domena, liga: 726, zveza: 1 }. */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z]+\.gr):(\d+)$/)
  if (!m || !ZVEZE[m[1]]) throw new Error(`eps: šifra lige je "<domena>:<league_id>" (npr. epspeir.gr:726, domene: ${Object.keys(ZVEZE).join(', ')}), ne "${koda}"`)
  return { domena: m[1], liga: Number(m[2]), zveza: ZVEZE[m[1]] }
}

const osnovni = (domena) => `https://www.${domena}`
export const naslovRazporeda = (koda) => {
  const { domena, liga } = razberiKodo(koda)
  return `${osnovni(domena)}/results/display_schedule.php?league_id=${liga}`
}
export const naslovMreze = (koda) => {
  const { domena, liga } = razberiKodo(koda)
  return `${osnovni(domena)}/results/display_results.php?league_id=${liga}`
}
export const naslovTekme = (domena, gameId) => `${osnovni(domena)}/results/display_game.php?game_id=${gameId}`

/** Šifra zapisnika v bazi: `gr<zveza>-<game_id>` (game_id šteje vsaka zveza zase). */
export const sifraZapisnika = (domena, gameId) => `gr${ZVEZE[domena]}-${gameId}`
/** "gr1-27822" → { domena: 'epspeir.gr', gameId: 27822 }. */
export function razberiZapisnik(id) {
  const m = String(id ?? '').match(/^gr(\d+)-(\d+)$/)
  const domena = m ? DOMENA_ZVEZE.get(Number(m[1])) : null
  if (!domena) throw new Error(`eps: šifra zapisnika je "gr<zveza>-<game_id>", ne "${id}"`)
  return { domena, gameId: Number(m[2]) }
}

/** Šifra osebe: zveza * 10^7 + player_id (player_id šteje vsaka zveza zase). */
export function sifraIgralca(domena, playerId) {
  const n = Number(playerId)
  if (!ZVEZE[domena] || !Number.isInteger(n) || n <= 0) return null
  if (n >= IGRALCEV_NA_ZVEZO) throw new Error(`eps: player_id ${n} pri ${domena} je prevelik za šifro osebe`)
  return ZVEZE[domena] * IGRALCEV_NA_ZVEZO + n
}

const imeRazporeda = (koda) => `razpored-${sifra(koda)}.html`
const imeMreze = (koda) => `mreza-${sifra(koda)}.html`
const imeTekme = (domena, gameId) => `${sifra(domena)}-g${gameId}.html`

// --- pomožno -------------------------------------------------------------------

const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
export const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

/** "23'" → 23, "90+3'" → 90, "95'" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "Περιόδου 2026-2027", "2026 2027" (Atene) ali "2026-27" → "2026/27". */
export function sezonaIz(s) {
  const m = String(s ?? '').match(/(\d{4})\s*[-/\s]\s*(\d{2,4})/)
  return m ? `${m[1]}/${m[2].slice(-2)}` : null
}

/** "20/09/26" ali "20-09-2026" → "2026-09-20". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (!m) return null
  const leto = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${leto}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/** Atenski datum in ura → ljubljanska; "00:00" pomeni, da ure ni. */
export function casTekme(datum, ura) {
  const u = String(ura ?? '').match(/(\d{1,2}):(\d{2})/)
  if (!datum) return { datum: null, ura: null }
  if (!u || (u[1] === '00' && u[2] === '00')) return { datum, ura: null }
  return vLjubljanskiCas(datum, `${u[1].padStart(2, '0')}:${u[2]}`)
}

/** "1-4" → { domaci: 1, gostje: 4, kontumacija }; "0-3 α.α." je kontumacija. */
export function izidIz(s) {
  const t = besedilo(s)
  const m = t.match(/(\d+)\s*-\s*(\d+)/)
  if (!m) return null
  return { domaci: Number(m[1]), gostje: Number(m[2]), kontumacija: /α\s*\.?\s*α\s*\./i.test(t) }
}

/** "1η Αγωνιστική" → 1. */
export const krogIz = (s) => Number(String(s ?? '').match(/(\d+)\s*[ηºo]?\s*Αγωνιστική/)?.[1]) || null

/** Izziv (Cloudflare, CAPTCHA). Navadne strani imajo le Cloudflarov email-decode. */
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|challenge-platform\/h\//i.test(String(html ?? ''))

/** Cela stran platforme (noga in konec dokumenta). */
export const jeStranPlatforme = (html) => /<div id="footer">/.test(String(html ?? '')) && /<\/html>\s*$/i.test(String(html ?? ''))

/**
 * Stran tekme, ki jo je strežnik odrezal za "Γενικές Πληροφορίες" (PHP napaka
 * pri polju "Λοιπές Παρατηρήσεις", HTTP 500): zapisnik (časovnica, postavi,
 * datum in ura) je cel, manjka le noga.
 */
export const jeOdrezanaTekma = (html) =>
  /Λεπτομέρειες Αγώνα/.test(String(html ?? '')) && /Γενικές Πληροφορίες[\s\S]*Ημερομηνία:[\s\S]*Ώρα:/.test(String(html ?? ''))

// --- razpored ------------------------------------------------------------------

/**
 * Stran razporeda: { sezona, ime, krogi: [{ stevilka, tekme: [{ domaci, gostje,
 * datum, ura, izid, kontumacija, gameId, neBo }] }] }.
 */
export function razporedStrani(html) {
  const s = cisto(html)
  const glava = s.match(/<div id="maincolumn">[\s\S]*?<h1>([\s\S]*?)<\/h1>/)?.[1] ?? ''
  const [prvi, ...ostalo] = glava.split(/<br\s*\/?>/i)
  const krogi = []
  const znani = new Set()
  const dvoumne = []
  for (const del of s.split(/<h2>/).slice(1)) {
    const stevilka = krogIz(besedilo(del.slice(0, del.indexOf('</h2>'))))
    if (!stevilka) continue
    const tabela = del.slice(0, del.indexOf('</table>') >= 0 ? del.indexOf('</table>') : undefined)
    // Prost krog: "<b>Ρεπό:</b> ΗΡΑΚΛΗΣ ΠΕΡΙΣΤΕΡΙΟΥ<br />" — tudi to je znano ime.
    const repo = besedilo(del.match(/Ρεπό:\s*<\/b>([\s\S]*?)<br/)?.[1] ?? '')
    if (repo) znani.add(repo)
    const tekme = []
    // Vrstice nimajo vedno zaključnega </tr>.
    for (const vrstica of tabela.split(/<tr class=['"](?:odd|even)['"]>/).slice(1)) {
      const td = [...vrstica.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
      if (td.length < 7) continue
      // Ime kluba ima lahko " - " ("ΑΠΟΛΛΩΝ ΑΘΗΝΩΝ - ΔΑΦΝΗ", Atene): tak par
      // razreši spodaj, ko so znana imena iz ostalih vrstic.
      const deli = besedilo(td[0]).split(' - ').map((x) => x.trim())
      if (deli.length < 2) continue
      if (deli.length === 2) deli.forEach((x) => znani.add(x))
      const izid = izidIz(td[6])
      const { datum, ura } = casTekme(datumIz(besedilo(td[3])), besedilo(td[4]))
      const t = {
        domaci: deli.length === 2 ? deli[0] : null,
        gostje: deli.length === 2 ? deli[1] : null,
        datum,
        ura,
        izid: izid ? { domaci: izid.domaci, gostje: izid.gostje } : null,
        kontumacija: !!izid?.kontumacija,
        gameId: Number(`${td[0]}${td[6]}`.match(/display_game\.php\?game_id=(\d+)/)?.[1]) || null,
        // "ΔΕΝ ΘΑ ΔΙΕΞΑΧΘΕΙ" (ne bo odigrana) namesto igrišča.
        neBo: /ΔΕΝ ΘΑ ΔΙΕΞΑΧΘΕΙ/.test(besedilo(td[1])),
      }
      if (deli.length > 2) dvoumne.push({ t, deli, krepko: besedilo(td[0].match(/<b>([\s\S]*?)<\/b>/)?.[1] ?? '') })
      tekme.push(t)
    }
    krogi.push({ stevilka, tekme })
  }
  // Dvoumni pari: rez, pri katerem sta obe strani znani (ali ena znana, druga
  // krepka — zmagovalec); dokler se kaj razreši, poskusi znova.
  const nerazreseni = []
  for (let spremembe = true; spremembe; ) {
    spremembe = false
    for (const d of dvoumne.filter((d) => !d.t.domaci)) {
      const rezi = d.deli.slice(1).map((_, k) => [d.deli.slice(0, k + 1).join(' - '), d.deli.slice(k + 1).join(' - ')])
      const ocena = ([a, b]) => (znani.has(a) || a === d.krepko ? 1 : 0) + (znani.has(b) || b === d.krepko ? 1 : 0)
      const najboljsa = Math.max(...rezi.map(ocena))
      const kandidati = rezi.filter((r) => ocena(r) === najboljsa)
      if (najboljsa === 0 || kandidati.length !== 1) continue
      ;[d.t.domaci, d.t.gostje] = kandidati[0]
      kandidati[0].forEach((x) => znani.add(x))
      spremembe = true
    }
  }
  for (const k of krogi) {
    for (const t of k.tekme.filter((t) => !t.domaci)) nerazreseni.push(`${k.stevilka}. krog: ${dvoumne.find((d) => d.t === t).deli.join(' - ')}`)
    k.tekme = k.tekme.filter((t) => t.domaci)
  }
  return { sezona: sezonaIz(prvi), ime: besedilo(ostalo.join(' ')), krogi, nerazreseni }
}

/**
 * Razpored v obliko uvoza. Krog brez datuma (še ni razpisan) izpustimo; pride
 * z naslednjim uvozom. Imena klubov gredo skozi `imeKluba` zveze.
 */
export function razporedVUvoz(r, domena = null) {
  // Tekma, ki je ne znamo razdeliti na klube, bi iz razporeda tiho izpadla.
  if (r.nerazreseni?.length) throw new Error(`eps: para ne znam razdeliti na klube (" - " v imenu): ${r.nerazreseni.join('; ')}`)
  return r.krogi
    .filter((k) => k.tekme.some((t) => t.datum))
    .map((k) => ({
      stevilka: k.stevilka,
      tekme: k.tekme.map((t) => ({
        domaci: imeKluba(domena, t.domaci),
        gostje: imeKluba(domena, t.gostje),
        datum: t.datum,
        ura: t.ura,
        odigrana: !!t.izid,
        // "ΔΕΝ ΘΑ ΔΙΕΞΑΧΘΕΙ": klub je izstopil, tekme ne bo. Je kontumacija
        // (krog ne čaka nanjo), izid pa EPS doda šele kasneje ("3-0 α.α.").
        // `odstop` uvozu pove, da je klub z le takimi tekmami izstopil.
        kontumacija: t.kontumacija || t.neBo,
        odstop: t.neBo,
        ...((t.kontumacija || t.neBo) && t.izid ? { izid: t.izid } : {}),
      })),
    }))
}

/** Mreža rezultatov: [{ gameId, izid, kontumacija }] vseh odigranih tekem lige. */
export function tekmeMreze(html) {
  const out = new Map()
  for (const [, id, izid] of cisto(html).matchAll(/display_game\.php\?game_id=(\d+)['"]>([^<]*)</g)) {
    const r = izidIz(izid)
    if (!out.has(Number(id))) out.set(Number(id), { gameId: Number(id), izid: r ? { domaci: r.domaci, gostje: r.gostje } : null, kontumacija: !!r?.kontumacija })
  }
  return [...out.values()]
}

// --- tekma ------------------------------------------------------------------------

/** Glava tekme: { sezona, liga, krog, domaci, gostje, izid, kontumacija, datum, ura } ali null. */
export function glavaTekme(html) {
  const s = cisto(html)
  const h1 = s.match(/<div id="maincolumn">[\s\S]*?<h1>([\s\S]*?)<\/h1>/)?.[1]
  if (!h1 || !/Λεπτομέρειες Αγώνα/.test(h1)) return null
  const deli = h1.split(/<br\s*\/?>/i).map(besedilo)
  const zacetek = s.indexOf('</h1>')
  const konec = s.indexOf('Διακύμανση Αποτελέσματος') > 0 ? s.indexOf('Διακύμανση Αποτελέσματος') : s.indexOf('Συμμετοχές')
  const vrh = s.slice(zacetek, konec > 0 ? konec : undefined)
  const klubi = [...vrh.matchAll(/display_team\.php\?team_id=(\d+)['"]>([\s\S]*?)<\/a>/g)].map((m) => ({ id: Number(m[1]), ime: besedilo(m[2]) }))
  const izid = izidIz(vrh.match(/<font size=\+3>\s*<b>([\s\S]*?)<\/b>/)?.[1] ?? '')
  const info = s.slice(s.indexOf('Γενικές Πληροφορίες'))
  const polje = (ime) => besedilo(info.match(new RegExp(`<b>${ime}:?</b>\\s*</td>\\s*<td>([\\s\\S]*?)</td>`))?.[1] ?? '')
  const { datum, ura } = casTekme(datumIz(polje('Ημερομηνία')), polje('Ώρα'))
  return {
    sezona: sezonaIz(deli[0]),
    liga: deli.slice(1, -1).join(' ') || deli[1] || null,
    krog: krogIz(deli.at(-1)),
    domaci: klubi[0]?.ime ?? null,
    gostje: klubi[1]?.ime ?? null,
    izid: izid ? { domaci: izid.domaci, gostje: izid.gostje } : null,
    kontumacija: !!izid?.kontumacija,
    datum,
    ura,
  }
}

const igralecIz = (html) => {
  const m = String(html ?? '').match(/display_player\.php\?player_id=(\d+)['"]>([\s\S]*?)<\/a>/)
  return m ? { playerId: Number(m[1]), ime: besedilo(m[2]) } : null
}

const IKONE = {
  ball: 'gol',
  ball_yellow: 'enajstmetrovka',
  ball_red: 'avtogol',
  yellowCard: 'rumeni',
  redCard: 'rdeci',
  yellowRedCards: 'drugiRumeni',
  redArrow: 'ven',
  greenArrow: 'noter',
}

/** Časovnica: [{ vrsta, ekipaIdx, playerId, ime, minuta, ikona }]. */
export function casovnica(html) {
  const s = cisto(html)
  const i = s.indexOf('Διακύμανση Αποτελέσματος')
  if (i < 0) return []
  const del = s.slice(i, s.indexOf('</table>', i))
  const out = []
  for (const vrstica of del.split(/<tr class=['"](?:odd|even)['"]>/).slice(1)) {
    const td = [...vrstica.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    if (td.length < 5) continue
    const ikona = td[1].match(/images\/(\w+)\.png/)?.[1] ?? null
    const doma = igralecIz(td[0])
    const gost = igralecIz(td[4])
    out.push({
      vrsta: IKONE[ikona] ?? null,
      ikona,
      ekipaIdx: doma ? 0 : gost ? 1 : null,
      playerId: (doma ?? gost)?.playerId ?? null,
      ime: (doma ?? gost)?.ime ?? null,
      minuta: minuta(besedilo(td[3])),
    })
  }
  return out
}

/**
 * Postavi iz "Συμμετοχές": [[igralci domačih], [igralci gostov]], igralec
 * { playerId, ime, zacetnik, ven, noter, golov, kartonov }. Vrstica ima stolpce
 * domačih, številko vrstice (<th>) in stolpce gostov; za vrstico
 * "Αναπληρωματικοί" je klop. Minuta izstopa je rdeča, vstopa zelena.
 */
export function postaviTekme(html) {
  const s = cisto(html)
  const i = s.indexOf('Συμμετοχές')
  const ekipe = [[], []]
  if (i < 0) return ekipe
  const del = s.slice(i, s.indexOf('</table>', i))
  let zacetnik = true
  for (const vrstica of del.split(/<tr[^>]*>/).slice(1)) {
    if (/Αναπληρωματικοί/.test(vrstica)) { zacetnik = false; continue }
    const k = vrstica.search(/<th[^>]*>/)
    if (k < 0 || !/display_player/.test(vrstica)) continue
    for (const [idx, polovica] of [[0, vrstica.slice(0, k)], [1, vrstica.slice(k)]]) {
      const ig = igralecIz(polovica)
      if (!ig) continue
      const rdeca = besedilo(polovica.match(/<font color=['"]?red['"]?>([\s\S]*?)<\/font>/)?.[1] ?? '')
      const zelena = besedilo(polovica.match(/<font color=['"]?green['"]?>([\s\S]*?)<\/font>/)?.[1] ?? '')
      ekipe[idx].push({
        ...ig,
        zacetnik,
        ven: rdeca ? minuta(rdeca) : null,
        noter: zelena ? minuta(zelena) : null,
        golov: (polovica.match(/images\/ball(?:_yellow)?\.png/g) ?? []).length,
        kartonov: (polovica.match(/images\/(?:yellowCard|redCard|yellowRedCards)\.png/g) ?? []).length,
      })
    }
  }
  return ekipe
}

/**
 * Zapisnik v obliko drugih virov. Null, če stran ni tekma ali nima izida.
 * Kontumacija ("α.α.") vrne zapisnik s `kontumacija: true` (uvoz ga izpusti).
 * Ekipa z manj kot 7 začetniki je nepopolna (kot frf, fcf): izid se zapiše,
 * tekma se bere znova.
 */
export function vZapisnik(html, { domena = null, gameId = null, url = null } = {}) {
  const g = glavaTekme(html)
  if (!g?.izid) return null
  const regSt = (playerId) => (domena ? sifraIgralca(domena, playerId) : playerId)
  const imeni = [g.domaci, g.gostje]
  const opozorila = []
  const postavi = postaviTekme(html)
  const dogodki = casovnica(html)
  const znana = postavi.map((xs) => xs.filter((x) => x.zacetnik).length >= NAJMANJ_ZACETNIKOV)
  postavi.forEach((xs, idx) => {
    const n = xs.filter((x) => x.zacetnik).length
    if (!znana[idx] && !g.kontumacija) opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — ${n ? `le ${n} začetnikov` : 'brez postave'}`)
  })

  const poId = new Map(postavi.flatMap((xs, idx) => xs.map((x) => [`${idx}|${x.playerId}`, x])))
  const preklopi = new Map()
  const dodaj = (x, m) => {
    if (!preklopi.has(x)) preklopi.set(x, [])
    preklopi.get(x).push(m)
  }
  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  const izstopi = [[], []]
  for (const d of dogodki) {
    if (!d.vrsta) { opozorila.push(`neznan dogodek "${d.ikona}" (${d.ime ?? '?'}, ${d.minuta ?? '?'}.)`); continue }
    if (d.ekipaIdx == null) { opozorila.push(`dogodek "${d.vrsta}" v ${d.minuta}. minuti brez igralca`); continue }
    const x = poId.get(`${d.ekipaIdx}|${d.playerId}`)
    if (!x) {
      opozorila.push(`${imeni[d.ekipaIdx]}: ${d.vrsta} ${d.ime} (${d.minuta}.) — igralca ni v postavi`)
      continue
    }
    if (d.minuta == null) opozorila.push(`${imeni[d.ekipaIdx]}: ${d.vrsta} ${x.ime} brez minute`)
    const kdo = { ekipaIdx: d.ekipaIdx, st: null, ime: x.ime, regSt: regSt(x.playerId), minuta: d.minuta }
    if (d.vrsta === 'gol' || d.vrsta === 'enajstmetrovka' || d.vrsta === 'avtogol')
      goli.push({ ...kdo, avtogol: d.vrsta === 'avtogol', enajstmetrovka: d.vrsta === 'enajstmetrovka' })
    else if (d.vrsta === 'rumeni') rumeni.push(kdo)
    else if (d.vrsta === 'rdeci' || d.vrsta === 'drugiRumeni') {
      if (!rdeci.some((r) => r.ekipaIdx === kdo.ekipaIdx && r.regSt === kdo.regSt)) rdeci.push(kdo)
    } else if (d.minuta != null) {
      dodaj(x, d.minuta)
      if (d.vrsta === 'ven') izstopi[d.ekipaIdx].push({ x, minuta: d.minuta })
      else menjave.push({ ekipaIdx: d.ekipaIdx, minuta: d.minuta, noter: { st: null, ime: x.ime }, ven: { st: null, ime: null } })
    }
  }
  // Menjave v pare: vstop in izstop iste ekipe ob isti minuti.
  for (const m of menjave) {
    const j = izstopi[m.ekipaIdx].findIndex((y) => y.minuta === m.minuta)
    if (j >= 0) m.ven = { st: null, ime: izstopi[m.ekipaIdx].splice(j, 1)[0].x.ime }
  }
  izstopi.forEach((xs, ekipaIdx) => {
    for (const y of xs) menjave.push({ ekipaIdx, minuta: y.minuta, noter: { st: null, ime: null }, ven: { st: null, ime: y.x.ime } })
  })
  // Drugi rumeni: prvi rumeni je svoj dogodek; ostane 1 rumeni + 1 rdeči.
  for (const r of rdeci) {
    const njegovi = rumeni.filter((y) => y.ekipaIdx === r.ekipaIdx && y.regSt === r.regSt)
    for (const y of njegovi.slice(1)) rumeni.splice(rumeni.indexOf(y), 1)
  }

  // Preverba s stolpci postave: menjave in goli pri igralcu.
  postavi.forEach((xs, idx) => {
    for (const x of xs) {
      const p = preklopi.get(x) ?? []
      if (x.ven != null && !p.includes(x.ven)) opozorila.push(`${imeni[idx]}: ${x.ime} izstop ${x.ven}. v postavi, ne v časovnici`)
      if (x.noter != null && !p.includes(x.noter)) opozorila.push(`${imeni[idx]}: ${x.ime} vstop ${x.noter}. v postavi, ne v časovnici`)
      const golov = goli.filter((y) => y.ekipaIdx === idx && y.regSt === regSt(x.playerId) && !y.avtogol).length
      if (x.golov !== golov) opozorila.push(`${imeni[idx]}: ${x.ime} ima v postavi ${x.golov} golov, v časovnici ${golov}`)
    }
  })

  const sestava = postavi.map((xs, idx) => {
    if (!znana[idx]) return { ime: imeni[idx], postava: [], rezerve: [] }
    const zac = xs.filter((x) => x.zacetnik)
    if (zac.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${zac.length} igralcev namesto 11`)
    const ids = new Set()
    for (const x of xs) {
      if (ids.has(x.playerId)) opozorila.push(`${imeni[idx]}: igralec ${x.ime} je v zapisniku dvakrat`)
      ids.add(x.playerId)
    }
    // Vrstice so v klasičnem vrstnem redu 1–11: prvi začetnik je vratar (namig,
    // kot ffm, fssid, mlsz) — v 71 postavah vzorca 3 izstopi in 1 gol od 111.
    const vObliko = (x) => ({
      st: null,
      ime: x.ime,
      regSt: regSt(x.playerId),
      zacetnik: x.zacetnik,
      vratar: x === zac[0],
      kapetan: false,
      pozicija: x === zac[0] ? 'GK' : null,
      preklopi: [...(preklopi.get(x) ?? [])].sort((a, b) => a - b),
    })
    return { ime: imeni[idx], postava: zac.map(vObliko), rezerve: xs.filter((x) => !x.zacetnik).map(vObliko) }
  })

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  if (!g.kontumacija && znana[0] && znana[1] && (zaEkipo(0) !== g.izid.domaci || zaEkipo(1) !== g.izid.gostje))
    opozorila.push(`goli iz časovnice (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${g.izid.domaci}:${g.izid.gostje}`)
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  return {
    zapisnikId: domena && gameId ? sifraZapisnika(domena, gameId) : gameId,
    url,
    sezona: g.sezona,
    krog: g.krog,
    datum: g.datum,
    ura: g.ura,
    liga: g.liga,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat: g.izid,
    polcas: null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    kontumacija: g.kontumacija,
    nepopoln: !g.kontumacija && (!znana[0] || !znana[1]),
    prazen: !postavi[0].length && !postavi[1].length,
    opozorila,
  }
}

// --- klubi ----------------------------------------------------------------------

// Latinične črke, ki jih vnos včasih pomeša z grškimi velikimi (ΜΕΤΑΣΟYΜΗ):
// v ključu postanejo grške, da isti klub ne razpade na dva.
const LATINICA_V_GRSKO = { A: 'Α', B: 'Β', E: 'Ε', Z: 'Ζ', H: 'Η', I: 'Ι', K: 'Κ', M: 'Μ', N: 'Ν', O: 'Ο', P: 'Ρ', T: 'Τ', Y: 'Υ', X: 'Χ' }

/**
 * Ključ kluba: velike črke brez naglasov, ločil in presledkov, latinične
 * dvojnice grških črk poenotene. Kratice vir piše s pikami ali brez in s
 * presledkom ali brez ("Π.Α.Σ.ΑΛΜΥΡΟΣ"), zato "ΑΕ ΠΕΡΑΜΑΤΟΣ " in "Α.Ε.
 * Περάματος" dasta isti ključ; "ΑΡΗΣ ΒΟΥΛΑΣ Β" (druga ekipa) je svoj klub.
 */
export const kljucKlubaGr = (ime) =>
  razpakiraj(ime)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[ABEZHIKMNOPTYX]/g, (c) => LATINICA_V_GRSKO[c])
    .replace(/[^\p{L}\p{N}]+/gu, '')

/**
 * Isto ime, drug klub. Klub je enoličen v državi, zveze pa so ločene piramide:
 * ključ `<domena>|<ključ kluba>` → ime, pod katerim klub te zveze vodimo.
 * Pregled 15. 10. 2026 (219 klubov vpisanih lig): ΑΡΓΟΝΑΥΤΗΣ je v Pireju
 * (Α 1. skupina) in v Argolidi (Α1). Z Atenami in Evbejo (432 klubov 33 lig):
 * ΠΡΟΜΗΘΕΑΣ je v Pireju (Γ 2. skupina) in v Atenah (Γ 2. skupina).
 */
const IME_V_ZVEZI = new Map([
  ['epsarg.gr|ΑΡΓΟΝΑΥΤΗΣ', 'ΑΡΓΟΝΑΥΤΗΣ (Αργολίδα)'],
  ['epsath.gr|ΠΡΟΜΗΘΕΑΣ', 'ΠΡΟΜΗΘΕΑΣ (Αθήνα)'],
])
export const imeKluba = (domena, ime) => IME_V_ZVEZI.get(`${domena}|${kljucKlubaGr(ime)}`) ?? String(ime ?? '').trim()

// Oblike društva (brez pik): Αθλητική Ένωση, Αθλητικός Όμιλος, Γυμναστικός Σύλλογος …
const OBLIKE = new Set(['ΑΕ', 'ΑΟ', 'ΑΣ', 'ΑΠΣ', 'ΑΠΟ', 'ΓΣ', 'ΓΑΣ', 'ΓΕ', 'ΠΑΣ', 'ΠΑΕ', 'ΠΑΟ', 'ΜΓΣ', 'ΑΜΣ', 'ΑΣΚ', 'ΦΣ', 'ΠΟ', 'ΑΟΚ', 'ΑΕΚ'])
const oblika = (b) => OBLIKE.has(b.replace(/\./g, '').toUpperCase()) && b !== 'ΑΕΚ'

/** Kratko ime: brez oblike društva spredaj ("ΑΕ ΠΕΡΑΜΑΤΟΣ" → "ΠΕΡΑΜΑΤΟΣ"), največ štiri besede. */
export function kratkoImeGr(polno) {
  const besede = razpakiraj(polno).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  let brez = besede
  while (brez.length > 1 && oblika(brez[0])) brez = brez.slice(1)
  return brez.slice(0, 4).join(' ')
}

// --- branje ---------------------------------------------------------------------

/** Zavrnitev (403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class EpsZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'EpsZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}

async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if ([401, 403, 429].includes(e.status)) throw new EpsZavrnitev(`eps: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new EpsZavrnitev(`eps: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  if (!jeStranPlatforme(html) && !jeOdrezanaTekma(html)) throw new Error(`eps: ${url} ni stran platforme (${String(html ?? '').length} B) — uvoz ustavljen`)
  return html
}

/**
 * Stran, ki sme v predpomnilnik (in se iz njega bere): cela stran platforme ali
 * tekma, odrezana za podatki. Izziv, stran vzdrževanja ali prazen odgovor 200
 * ne — sicer bi obveljal za vselej (mlsz, 10. 2026).
 */
export const zaPredpomnilnik = (html) => !jeIzziv(html) && (jeStranPlatforme(html) || jeOdrezanaTekma(html))

const shranjena = (ime) => {
  const p = `${MAPA}/${ime}`
  if (!existsSync(p)) return null
  const html = readFileSync(p, 'utf8')
  return zaPredpomnilnik(html) ? html : null
}
const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)

/**
 * Prenos z daljšim rokom. Dodekanez (epsdod.gr) vrne VSAKO stran s statusom
 * 500, a celo (noga, </html>); Epir (epsip.gr) vrne 500 pri tekmi s
 * pripombami, odrezano za podatki tekme — obe veljata kot 200. Napaka
 * strežnika brez cele strani ostane napaka. 401, 403, 429 in izziv vržejo
 * `EpsZavrnitev` že tu, da je ne ponovi `prenesiSPonovitvami` in je uvoz
 * razporeda ne nadomesti s shranjeno stranjo (izhod 4 na vseh poteh).
 */
export async function epsFetch(url, moznosti = {}) {
  const { signal: _s, ...ostalo } = moznosti
  const o = await fetch(url, { ...ostalo, signal: AbortSignal.timeout(60000) })
  if ([401, 403, 429].includes(o.status)) {
    await o.body?.cancel().catch(() => {})
    throw new EpsZavrnitev(`eps: ${url} → HTTP ${o.status} — uvoz ustavljen, ne obhajamo`, o.status)
  }
  const telo = await o.text()
  if (jeIzziv(telo)) throw new EpsZavrnitev(`eps: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`, o.status)
  const status = o.status === 500 && !jeIzziv(telo) && (jeStranPlatforme(telo) || jeOdrezanaTekma(telo)) ? 200 : o.status
  return new Response(telo, { status, statusText: o.statusText, headers: o.headers })
}

const vir = {
  ime: 'eps',
  fetch: epsFetch,
  polnoIme: 'Ενώσεις Ποδοσφαιρικών Σωματείων (results.php)',
  drzava: 'GR',
  osnovniNaslov: 'https://www.epspeir.gr',
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,

  naslovRazporeda,
  naslovZapisnika: (_koda, id) => {
    const { domena, gameId } = razberiZapisnik(id)
    return naslovTekme(domena, gameId)
  },
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new EpsZavrnitev(`eps: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    // Uvoz razporeda je to stran pravkar prenesel (svežo) pod istim imenom.
    const html = shranjena(imeRazporeda(koda)) ?? (await beri(prenesi, naslovRazporeda(koda), imeRazporeda(koda), true))
    if (jeIzziv(html)) throw new EpsZavrnitev(`eps: ${naslovRazporeda(koda)} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
    return razporedVUvoz(razporedStrani(html), razberiKodo(koda).domena)
  },

  async zapisniki(koda, prenesi) {
    const { domena } = razberiKodo(koda)
    const razpored = razporedStrani(await beri(prenesi, naslovRazporeda(koda), imeRazporeda(koda), true))
    const mreza = tekmeMreze(await beri(prenesi, naslovMreze(koda), imeMreze(koda), true))
    // Odigrane tekme iz mreže in povezav razporeda; kontumacije nimajo zapisnika.
    const tekme = new Map(mreza.map((t) => [t.gameId, t]))
    for (const k of razpored.krogi) for (const t of k.tekme) if (t.gameId && t.izid && !tekme.has(t.gameId)) tekme.set(t.gameId, { gameId: t.gameId, izid: t.izid, kontumacija: t.kontumacija })
    const out = []
    for (const t of [...tekme.values()].sort((a, b) => a.gameId - b.gameId)) {
      // Mreža ima povezavo tudi na neodigrano tekmo (brez izida) — ta še nima zapisnika.
      if (t.kontumacija || !t.izid) continue
      const url = naslovTekme(domena, t.gameId)
      const ime = imeTekme(domena, t.gameId)
      // Shranjena stran velja, če je tekma starejša od tedna in zapisnik poln.
      const prej = shranjena(ime)
      const zPrej = prej ? vZapisnik(prej) : null
      const svez = !zPrej || zPrej.nepopoln || starostDni(zPrej.datum) <= 7
      let html = prej
      if (svez) {
        try {
          html = await beri(prenesi, url, ime, true)
        } catch (e) {
          // Zavrnitev ustavi uvoz; pokvarjena stran ene tekme (HTTP 500 brez
          // podatkov) ne sme ustaviti cele lige — tekma pride ob naslednjem uvozu.
          if (e.zavrnitev || !prej) {
            if (e.zavrnitev) throw e
            console.warn(`  eps: ${url} — ${e.message}; tekmo preskočim`)
            continue
          }
          console.warn(`  eps: ${url} — ${e.message}; vzamem shranjeno stran`)
        }
      }
      const z = vZapisnik(html, { domena, gameId: t.gameId, url })
      if (!z || z.kontumacija) continue
      if (!z.sezona) z.sezona = razpored.sezona
      if (t.izid && (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje))
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid mreže ${t.izid.domaci}:${t.izid.gostje}`)
      // Klubi in krog naj se ujemajo z razporedom (tekma se išče po krogu in klubih).
      const krog = razpored.krogi.find((k) => k.stevilka === z.krog)
      const vrsta = krog?.tekme.find((x) => kljucKlubaGr(x.domaci) === kljucKlubaGr(z.domaci.ime) && kljucKlubaGr(x.gostje) === kljucKlubaGr(z.gostje.ime))
      if (!vrsta) z.opozorila.push(`tekma ${z.domaci.ime} - ${z.gostje.ime} (${z.krog}. krog) ni v razporedu`)
      z.domaci.ime = imeKluba(domena, vrsta?.domaci ?? z.domaci.ime)
      z.gostje.ime = imeKluba(domena, vrsta?.gostje ?? z.gostje.ime)
      z.datum ??= vrsta?.datum ?? null
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaGr,
  kratkoIme: kratkoImeGr,
  poenostavi: kljucKlubaGr,
}

export default vir
