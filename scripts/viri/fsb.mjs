// Vir: Fudbalski savez Beograda (www.fsb.org.rs), Srbija.
//
// FSB objavlja vsa svoja tekmovanja (Srpska liga Beograd do opštinskih lig) na
// WordPress strani. Ena stran lige (`/takmicenje/<slug>/`) nosi VSE: razpored
// po krogih (`div.accordion-item` z gumbom "Kolo: N"), izide, status tekme
// in povezavo na zapisnik (`/izvestaj/?pid=N`), pod zadnjim krogom pa še
// lestvico (`id="tabela"`) in strelce.
//
// Šifra lige je slug strani lige (`srpska-liga-beograd`); vsaka sezona ima
// svojega, tudi arhiv (`srpska-liga-beograd-2025-26`, seznam na
// `/arhiva-takmicenja/sezona-2025-2026/`). Slugi niso pravilni ("…-grupa-c-2"),
// zato jih vpiši ročno.
//
// STRAN LIGE
// - Vsaka tekma sta dve vrstici <tr>: domača ima datum BREZ letnice ("23.08"),
//   ime, izid in (rowspan=2) status Odigrana / Zakazana / U toku s povezavo
//   na zapisnik; gostujoča uro, ime in izid. Leto pride iz sezone v naslovu
//   strani (`SRPSKA LIGA BEOGRAD 2026/2027`, `… 2025/26`).
// - Stran ima zakomentirane podvojene vrstice: komentarje odstranimo najprej.
// - Med krogom, ki teče, harmonika (`Rezultati i raspored`) NEODIGRANIH tekem
//   tega kroga NE pokaže (Srpska liga 9. 10. 2026: krog 8 z 2 od 7 tekem).
//   Razdelek "Aktuelno kolo: N" nad njo jih ima vse, zato ju združimo. Tekme,
//   ki je ni na strani, uvoz razporeda ne briše (okrnjen krog ni poln krog).
// - Kontumacija: status Odigrana, izid "---", zapisnik prazen ali z eno
//   postavo. Izid (3:0) je le na lestvici; izpeljemo ga iz ostanka golov kluba
//   (lestvica minus vsi znani izidi), kadar je ostanek enoličen in 3:0.
//   Brez tega kontumacija ostane brez izida. Odigrana brez izida mlajša od
//   tedna dni ni kontumacija (izid morda še ni vnesen) — le `odigrana: false`.
//
// ZAPISNIK (`/izvestaj/?pid=N`)
// - Neveljaven pid vrne 200 s prazno predlogo: veljavnost presodi vsebina,
//   nikoli status.
// - Domači in gostje sta v blokih `<!-- Home team -->` / `<!-- Away team -->`;
//   začetniki v prvi `table.zapisnik`, klop za "Rezervni igrači". Uvažamo le
//   status "Odigrana"; "U toku" je delni zapisnik tekme v živo.
// - Dogodki so ikone `/wp-content/icons/<vrsta>-01.svg` z minuto ("45+1'"):
//   td.gol (gol, penal, autogol — avtogol stoji pri strelcu v NJEGOVI ekipi),
//   td.zuti-karton (zuti), td.crveni-karton (crveni = direkten, drugi-zuti =
//   drugi rumeni; prvi rumeni ostane v rumeni celici), td.izmena — minuta
//   je LE pri rezervi, ki je prišla v igro. Začetnik, ki je šel ven, NI
//   označen, in para menjave ni.
// - "Kolo:" v zapisniku je ograda ("ubaciti"); krog pride s strani lige.
// - Dres: bg-info = vratar (tudi rezervni), bg-danger = kapetan (tudi če je
//   vratar — takrat vratarja na tisti tekmi ne poznamo), bg-primary ostali.
//
// MINUTE (odločitev lastnika, 9. 10. 2026): začetnik 90 (ali do minute
// rdečega kartona); rezerva 90 − minuta vstopa (ali do rdečega). Ker vir ne
// pove, kdo je šel ven, ima zamenjani začetnik 90 minut — minute začetnikov
// so zato precenjene, minute rezerv pravilne.
//
// IDENTITETA: vir nima šifer igralcev ne klubov. Igralec je ime + klub (in
// dres pri soimenjakih na isti tekmi), kot pri slovenskih MNZ — glej
// `igralecId` v uvoz-zapisnikov.mjs. Imena so "PRIIMEK Ime" v latinici;
// prečrkovanje iz cirilice ima napake ("NemanJa", "VelJko"), ki jih
// popravimo, da se ime ujema med tekmami.
//
// Beremo odkrito in počasi (User-Agent SLFF, 2 s med zahtevki, končanih
// zapisnikov ne beremo znova). Če se pojavi izziv ali CAPTCHA, ustavi — ne
// obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { sifra } from './zapisniki.mjs'

const OSNOVNI = 'https://www.fsb.org.rs'
const DOLZINA_TEKME = 90

export const naslovLige = (koda) => `${OSNOVNI}/takmicenje/${String(koda).trim().replace(/^\/+|\/+$/g, '')}/`
export const naslovIzvestaja = (pid) => `${OSNOVNI}/izvestaj/?pid=${pid}`
const imeLige = (koda) => `liga-${sifra(koda)}.html`
// Ime nosi ligo (glej dodaj-ligo: dve ligi istega vira si ne smeta povoziti strani).
const imeIzvestaja = (koda, pid) => `izvestaj-${sifra(koda)}-${pid}.html`

const brezKomentarjev = (s) => String(s ?? '').replace(/<!--[\s\S]*?-->/g, '')
const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))

// --- imena -------------------------------------------------------------------

/** Velike začetnice besede ("PERIŠIĆ" → "Perišić", "MILOŠ-PETAR" → "Miloš-Petar"). */
const velikaZacetnica = (b) => b.toLowerCase().replace(/(^|[-'(])(\p{L})/gu, (_, a, c) => a + c.toUpperCase())

/**
 * "GRUJIĆ VelJko" → "Grujić Veljko". Besede z velikimi črkami (priimek) dobijo
 * veliko začetnico; dvočrkje iz cirilice, ki ga je prečrkovanje zapisalo z
 * veliko drugo črko (Lj, Nj, Dž sredi besede), postane malo.
 */
export function lepoIme(ime) {
  return razpakiraj(ime)
    .split(' ')
    .filter(Boolean)
    .map((b) => (b === b.toUpperCase() && /\p{L}{2}/u.test(b) ? velikaZacetnica(b) : b))
    .map((b) => b.replace(/(?<=\p{Ll})([lnLN])J/gu, (_, c) => `${c}j`).replace(/(?<=\p{Ll})dŽ/gu, 'dž'))
    .join(' ')
}

// Ime kluba ostane, kot ga piše FSB (velike črke: "GSP POLET DORĆOL",
// "BASK", "FK T6 NIKA"). Velikih začetnic ne ugibamo: kratice (BSK, PKB,
// BASK, T6) se od imen (RAD, VIS, UMKA) ne dajo ločiti.

// Isto ime, drug klub. FSB klube piše brez kraja, zato imata dva različna
// kluba v ISTI sezoni lahko isto ime v dveh ligah (2026/27: BORAC v Zonski
// ligi = Ostružnica, BORAC v PBL B je drug; OMLADINAC v Zonski = Veliko
// Polje, OMLADINAC v PBL C je drug). Kraj potrjuje "Mesto:" v zapisniku
// domače tekme. Preimenujemo po šifri lige; ob novi ligi preveri trke znova
// (imena vseh lig iste sezone) in nov trk dodaj sem.
const IME_V_LIGI = {
  'zonska-liga-beograd': { BORAC: 'BORAC (Ostružnica)', OMLADINAC: 'OMLADINAC (Veliko Polje)' },
  'zonska-liga-beograd-2025-26': { OMLADINAC: 'OMLADINAC (Veliko Polje)' },
}

/** Ime kluba, kot ga uvoz vidi (s preimenovanjem v tej ligi). */
export function imeKluba(ime, koda) {
  const surovo = razpakiraj(ime)
  return IME_V_LIGI[String(koda ?? '').trim()]?.[surovo.toUpperCase()] ?? surovo
}

// Ključ kluba: male črke s šumniki (ć, đ ohranjena, kot pri hns).
export const kljucKlubaRs = (ime) =>
  razpakiraj(ime)
    .toLowerCase()
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

/** Kratko ime: brez oblike društva na začetku ("OFK BALKAN MIRIJEVO" → "BALKAN MIRIJEVO"). */
export function kratkoImeRs(polno) {
  const besede = razpakiraj(polno).split(' ')
  const brez = besede.length > 1 && /^(fk|ofk)$/i.test(besede[0]) ? besede.slice(1) : besede
  return brez.join(' ')
}

// --- sezona in datumi --------------------------------------------------------

/** Sezona iz naslova strani lige: "… 2026/2027 » …", "… 2025/26", "… 25/26" → "2026/27". */
export function sezonaStrani(html) {
  const naslov = besedilo(String(html ?? '').match(/<title>([\s\S]*?)<\/title>/)?.[1])
  const m = naslov.match(/\b(\d{2}|\d{4})\s*\/\s*(\d{2}|\d{4})\b/)
  if (!m) return null
  const zacetek = m[1].length === 2 ? 2000 + Number(m[1]) : Number(m[1])
  return `${zacetek}/${String((zacetek + 1) % 100).padStart(2, '0')}`
}

/** "23.08" v sezoni "2026/27" → "2026-08-23"; januar–junij je drugo leto. */
export function datumVSezoni(dm, sezona) {
  const m = String(dm ?? '').match(/(\d{1,2})\.(\d{1,2})/)
  const z = String(sezona ?? '').match(/^(\d{4})\//)
  if (!m || !z) return null
  const mesec = Number(m[2])
  const leto = mesec >= 7 ? Number(z[1]) : Number(z[1]) + 1
  return `${leto}-${String(mesec).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/** Sezona iz datuma tekme: od julija naprej je nova ("2026-10-03" → "2026/27"). */
function sezonaIzDatuma(datum) {
  const m = String(datum ?? '').match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  const leto = Number(m[2]) >= 7 ? Number(m[1]) : Number(m[1]) - 1
  return `${leto}/${String((leto + 1) % 100).padStart(2, '0')}`
}

/** "75'" → 75, "45+1'" → 45, "90+6'" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

const starostDni = (datum, danes = Date.now()) =>
  datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0

// --- stran lige --------------------------------------------------------------

const izid = (s) => (/^\d+$/.test(String(s ?? '').trim()) ? Number(String(s).trim()) : null)

/** Tekme iz ene tabele (pari vrstic domači / gostje). */
function tekmeTabele(html, krog, sezona) {
  const vrstice = [...String(html).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]).filter((r) => r.includes('<td'))
  const out = []
  for (let i = 0; i < vrstice.length - 1; i++) {
    const doma = vrstice[i]
    if (!/rowspan="2"/.test(doma)) continue
    const gost = vrstice[i + 1]
    const celice = (r) => [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => besedilo(m[1]))
    const a = celice(doma)
    const b = celice(gost)
    if (a.length < 3 || b.length < 3) continue
    const status = besedilo(doma.match(/class="badge[^"]*">([^<]*)</)?.[1])
    const pid = doma.match(/\/izvestaj\/\?pid=(\d+)/)?.[1] ?? null
    const d = izid(a[2])
    const g = izid(b[2])
    out.push({
      krog,
      datum: datumVSezoni(a[0], sezona),
      ura: /^\d{1,2}:\d{2}$/.test(b[0]) ? b[0].padStart(5, '0') : null,
      domaci: a[1],
      gostje: b[1],
      status,
      pid,
      izid: d != null && g != null ? { domaci: d, gostje: g } : null,
      // "---" pri odigrani tekmi: izida ni (kontumacija ali še ni vnesen).
      brezIzida: a[2].trim() === '---' || b[2].trim() === '---',
    })
    i++
  }
  return out
}

/** Šifra lige iz kanonične povezave strani (`/takmicenje/<slug>/`). */
export const kodaStrani = (html) =>
  String(html ?? '').match(/<link rel="canonical" href="[^"]*\/takmicenje\/([^/"]+)\/?"/)?.[1] ?? null

/** Je stran res stran lige (ne prazna predloga ali napaka s statusom 200)? */
export const jeStranLige = (html) => /id="accordionRounds"|Aktuelno kolo:/.test(String(html ?? ''))

/**
 * Vse tekme s strani lige: { sezona, tekme: [{ krog, datum, ura, domaci,
 * gostje, status, pid, izid, brezIzida }] }. Imena klubov so že lepa in
 * preimenovana za to ligo (`imeKluba`).
 */
export function tekmeStrani(html, koda = kodaStrani(html)) {
  const s = brezKomentarjev(html)
  const sezona = sezonaStrani(s)
  if (!sezona) throw new Error(`fsb: ${koda ?? '?'} — sezone ni v naslovu strani`)
  const poKljucu = new Map()
  const dodaj = (t) => {
    const k = `${t.krog}|${t.domaci}|${t.gostje}`
    const prej = poKljucu.get(k)
    // Ista tekma v "Aktuelno kolo" in v harmoniki: velja tista z več podatki.
    if (!prej || (!prej.pid && t.pid) || (!prej.izid && t.izid)) poKljucu.set(k, t)
  }

  // Harmonika krogov: od `accordionRounds` do lestvice (ta je v zadnjem krogu).
  const i = s.indexOf('id="accordionRounds"')
  if (i >= 0) {
    let konec = s.indexOf('id="tabela"', i)
    if (konec < 0) konec = s.indexOf('Legenda', i)
    const harmonika = s.slice(i, konec < 0 ? undefined : konec)
    for (const del of harmonika.split(/<div class="accordion-item/).slice(1)) {
      const krog = Number(del.match(/Kolo:\s*(\d+)/)?.[1])
      if (!krog) continue
      tekmeTabele(del, krog, sezona).forEach(dodaj)
    }
  }
  // "Aktuelno kolo: N": cel tekoči krog, tudi tekme, ki jih harmonika skrije.
  const a = s.search(/Aktuelno kolo:\s*\d+/)
  if (a >= 0) {
    const krog = Number(s.slice(a).match(/Aktuelno kolo:\s*(\d+)/)[1])
    const konec = s.indexOf('</table>', a)
    tekmeTabele(s.slice(a, konec < 0 ? undefined : konec), krog, sezona).forEach(dodaj)
  }

  const tekme = [...poKljucu.values()]
    .map((t) => ({ ...t, domaci: imeKluba(t.domaci, koda), gostje: imeKluba(t.gostje, koda) }))
    .sort((x, y) => x.krog - y.krog)

  // Dva kluba z istim imenom v isti ligi (Opštinska liga Sopot 2025/26: dva
  // "MLADOST") se ne dasta ločiti — ustavi, ne zlivaj.
  const vKrogu = new Map()
  for (const t of tekme)
    for (const ime of [t.domaci, t.gostje]) {
      const k = `${t.krog}|${kljucKlubaRs(ime)}`
      if (vKrogu.has(k))
        throw new Error(`fsb: ${koda ?? '?'} — klub "${ime}" igra v ${t.krog}. krogu dvakrat (dva kluba z istim imenom?); dodaj ga v IME_V_LIGI`)
      vKrogu.set(k, true)
    }
  return { sezona, tekme }
}

/**
 * Goli kluba z lestvice (`id="tabela"`, stolpca "Post." in "Prim.").
 * Ime ima lahko odbitek točk ("BASK -1"). Ključ je `kljucKlubaRs(imeKluba)`.
 */
export function goliLestvice(html, koda = kodaStrani(html)) {
  const s = brezKomentarjev(html)
  const i = s.indexOf('id="tabela"')
  if (i < 0) return null
  const konec = s.indexOf('</table>', i)
  const tabela = s.slice(i, konec < 0 ? undefined : konec)
  const vrstice = [...tabela.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => besedilo(c[1])),
  )
  const glava = vrstice.find((v) => v.includes('Klub'))
  if (!glava) return null
  const [iKlub, iDani, iPrejeti] = ['Klub', 'Post.', 'Prim.'].map((h) => glava.indexOf(h))
  if (iKlub < 0 || iDani < 0 || iPrejeti < 0) return null
  const out = new Map()
  for (const v of vrstice) {
    if (v === glava || v.length <= Math.max(iKlub, iDani, iPrejeti)) continue
    const ime = v[iKlub].replace(/\s+-\d+$/, '')
    const dani = izid(v[iDani])
    const prejeti = izid(v[iPrejeti])
    if (!ime || dani == null || prejeti == null) continue
    out.set(kljucKlubaRs(imeKluba(ime, koda)), { dani, prejeti })
  }
  return out
}

/**
 * Izid kontumacije iz lestvice: ostanek golov kluba (lestvica minus izidi
 * tekem z izidom) pripada njegovim odigranim tekmam brez izida. Kadar je
 * ostanek n × 3:0 ali n × 0:3 (n = število takih tekem), je vsaka 3:0 oz.
 * 0:3. Sicer null.
 */
export function izidKontumacije(t, tekme, lestvica) {
  if (!lestvica) return null
  const k = kljucKlubaRs
  for (const [ime, doma] of [[t.domaci, true], [t.gostje, false]]) {
    const vrsta = lestvica.get(k(ime))
    if (!vrsta) continue
    const njegove = tekme.filter((x) => k(x.domaci) === k(ime) || k(x.gostje) === k(ime))
    const brez = njegove.filter((x) => x.status === 'Odigrana' && !x.izid)
    if (!brez.length) continue
    let dani = vrsta.dani
    let prejeti = vrsta.prejeti
    for (const x of njegove) {
      if (!x.izid) continue
      const jeDoma = k(x.domaci) === k(ime)
      dani -= jeDoma ? x.izid.domaci : x.izid.gostje
      prejeti -= jeDoma ? x.izid.gostje : x.izid.domaci
    }
    // Vse kontumacije kluba v isto smer (n × 3:0 ali n × 0:3), sicer ostanka
    // ne znamo razdeliti.
    const n = brez.length
    const zmage = dani === 3 * n && prejeti === 0
    const porazi = dani === 0 && prejeti === 3 * n
    if (!zmage && !porazi) continue
    const [a, b] = zmage ? [3, 0] : [0, 3]
    return doma ? { domaci: a, gostje: b } : { domaci: b, gostje: a }
  }
  return null
}

/**
 * Razpored s strani lige v obliko uvoza razporeda. Odigrana tekma brez
 * izida, starejša od tedna dni, je kontumacija (izid z lestvice, če se da).
 * Tekme "U toku" niso odigrane.
 */
export function razcleniRazpored(_vrstice, html, { danes = Date.now() } = {}) {
  if (!jeStranLige(html)) return []
  const koda = kodaStrani(html)
  const { tekme } = tekmeStrani(html, koda)
  const lestvica = goliLestvice(html, koda)
  const krogi = new Map()
  for (const t of tekme) {
    const odigrana = t.status === 'Odigrana' && !!t.izid
    const kontumacija = t.status === 'Odigrana' && !t.izid && t.brezIzida && starostDni(t.datum, danes) > 7
    const izidK = kontumacija ? izidKontumacije(t, tekme, lestvica) : null
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija,
      odigrana: odigrana || kontumacija,
      ...(izidK ? { izid: izidK } : {}),
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ----------------------------------------------------------------

const VRSTE = {
  gol: ['gol', 'penal', 'autogol'],
  'zuti-karton': ['zuti'],
  'crveni-karton': ['crveni', 'drugi-zuti'],
  izmena: ['izmena'],
}

/** Ikone v celici: [{ vrsta, minuta }]. */
function dogodkiCelice(vrstica, razred) {
  const celica = vrstica.match(new RegExp(`<td class="${razred}"[^>]*>([\\s\\S]*?)</td>`))?.[1] ?? ''
  return [...celica.matchAll(/icons\/([a-z-]+)-01\.svg"[^>]*>\s*([0-9+]*)/g)].map(([, vrsta, cas]) => ({
    vrsta,
    minuta: minuta(cas),
    celica: razred,
  }))
}

/** Igralci ene tabele (začetniki ali klop). */
function igralciTabele(tabela, zacetnik) {
  const out = []
  for (const m of String(tabela).matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const v = m[1]
    const znacka = v.match(/class="badge (bg-[a-z]+)"[^>]*>\s*([^<]*?)\s*</)
    const celice = [...v.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1])
    const ime = lepoIme(besedilo(celice[1]))
    if (!znacka || !ime) continue
    const dogodki = Object.keys(VRSTE).flatMap((r) => dogodkiCelice(v, r))
    const prvi = (vrste) => dogodki.find((d) => vrste.includes(d.vrsta))?.minuta ?? null
    out.push({
      st: Number(znacka[2]) || null,
      ime,
      vratar: znacka[1] === 'bg-info',
      kapetan: znacka[1] === 'bg-danger',
      zacetnik,
      // Začetnik z menjavo (vir je še ni pokazal) je šel ven, rezerva prišla noter.
      izmena: prvi(['izmena']),
      rdec: prvi(['crveni', 'drugi-zuti']),
      dogodki,
    })
  }
  return out
}

function ekipaBloka(html, oznaka) {
  const s = String(html ?? '')
  const a = s.indexOf(`<!-- ${oznaka} -->`)
  const b = s.indexOf(`<!-- End ${oznaka} -->`, a)
  if (a < 0) return null
  const blok = brezKomentarjev(s.slice(a, b < 0 ? undefined : b))
  const ime = besedilo(blok.match(/<h4[^>]*>([\s\S]*?)<\/h4>/)?.[1])
  const [zacetni, klop = ''] = blok.split(/Rezervni igra/)
  return { ime, postava: igralciTabele(zacetni, true), rezerve: igralciTabele(klop, false) }
}

/** Status zapisnika ("Odigrana", "U toku", "" pri prazni predlogi). */
export const statusZapisnika = (html) =>
  besedilo(String(html ?? '').match(/Status<\/span>\s*<span class="badge[^"]*"[^>]*>([^<]*)</)?.[1])

/** Izid z glave zapisnika (vrstica DESKTOP: domači, goli, goli, gostje). */
function izidZapisnika(s) {
  const i = s.indexOf('row mb-10 DESKTOP')
  if (i < 0) return null
  const m = s
    .slice(i, i + 4000)
    .match(/<div[^>]*>\s*([^<]*?)\s*<\/div>\s*<div[^>]*>\s*([^<]*?)\s*<\/div>\s*<div[^>]*>\s*([^<]*?)\s*<\/div>\s*<div[^>]*>\s*([^<]*?)\s*<\/div>/)
  if (!m) return null
  const d = izid(m[2])
  const g = izid(m[3])
  return d != null && g != null ? { domaci: d, gostje: g } : null
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma ni "Odigrana",
 * nima izida ali ena od ekip nima postave (kontumacija, prazna predloga,
 * neveljaven pid).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = String(html ?? '').replace(/<script[\s\S]*?<\/script>/g, '')
  if (statusZapisnika(s) !== 'Odigrana') return null
  const rezultat = izidZapisnika(s)
  if (!rezultat) return null
  const ekipe = [ekipaBloka(s, 'Home team'), ekipaBloka(s, 'Away team')]
  if (ekipe.some((e) => !e || !e.postava.length)) return null

  const opozorila = []
  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  ekipe.forEach((e, ekipaIdx) => {
    for (const i of [...e.postava, ...e.rezerve]) {
      const kdo = { ekipaIdx, st: i.st, ime: i.ime }
      for (const d of i.dogodki) {
        const z = { ...kdo, minuta: d.minuta }
        if (d.vrsta === 'gol') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
        else if (d.vrsta === 'penal') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
        // Avtogol je pri igralcu, ki ga je dal, torej pri njegovi ekipi.
        else if (d.vrsta === 'autogol') goli.push({ ...z, avtogol: true, enajstmetrovka: false })
        else if (d.vrsta === 'zuti') rumeni.push(z)
        else if (d.vrsta === 'crveni' || d.vrsta === 'drugi-zuti') {
          if (!rdeci.some((r) => r.ekipaIdx === ekipaIdx && r.st === i.st && r.ime === i.ime)) rdeci.push(z)
        } else if (d.vrsta === 'izmena') {
          // Vir pove le vstop rezerve; kdo je šel ven, ne vemo.
          const prazno = { st: null, ime: null }
          menjave.push(i.zacetnik ? { ekipaIdx, minuta: d.minuta, noter: prazno, ven: kdo } : { ekipaIdx, minuta: d.minuta, noter: kdo, ven: prazno })
        } else opozorila.push(`${e.ime}: neznana ikona "${d.vrsta}" pri ${i.ime}`)
        if (!VRSTE[d.celica]?.includes(d.vrsta)) opozorila.push(`${e.ime}: ikona "${d.vrsta}" v celici ${d.celica} (${i.ime})`)
      }
    }
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const dresi = [...e.postava, ...e.rezerve].map((i) => i.st).filter((x) => x != null)
    if (new Set(dresi).size !== dresi.length) opozorila.push(`${e.ime}: isti dres pri dveh igralcih`)
  })

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)

  const d = s.match(/Datum i vreme:<\/span>\s*<span>\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  const datum = d ? `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}` : null
  const p = s.match(/Poluvreme:\s*(\d+)\s*:\s*(\d+)/)

  const vObliko = ({ dogodki: _d, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: sezonaIzDatuma(datum),
    krog: null, // "Kolo: ubaciti" — krog da stran lige
    datum,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    polcas: p ? { domaci: Number(p[1]), gostje: Number(p[2]) } : null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/**
 * Nastopi po vrsticah zapisnika (vsak igralec nosi svoje dogodke, zato
 * ujemanja po dresu ni treba). Minute po odločitvi lastnika (glava datoteke):
 * začetnik od 0 do 90 ali do rdečega kartona (ali do svoje menjave, če bi jo
 * vir kdaj pokazal); rezerva od minute vstopa do 90 ali do rdečega. Rezerva
 * brez vstopa ni nastopila (strelca s klopi brez menjave doda uvoz,
 * `dodajStrelceSKlopi`).
 */
export function nastopi(z) {
  const out = []
  for (const [idx, ekipa] of [z.domaci, z.gostje].entries()) {
    const prejeti = idx === 0 ? z.rezultat.gostje : z.rezultat.domaci
    for (const i of [...ekipa.postava, ...ekipa.rezerve]) {
      const zacetnik = !!i.zacetnik
      const od = zacetnik ? 0 : i.izmena
      if (od == null) continue
      let do_ = zacetnik && i.izmena != null ? i.izmena : DOLZINA_TEKME
      if (i.rdec != null) do_ = Math.min(do_, i.rdec)
      do_ = Math.max(od, Math.min(do_, DOLZINA_TEKME))
      const moji = (seznam) => seznam.filter((x) => x.ekipaIdx === idx && x.st === i.st && x.ime === i.ime)
      const goliIgralca = moji(z.goli)
      out.push({
        ekipaIdx: idx,
        ekipa: ekipa.ime,
        st: i.st,
        ime: i.ime,
        regSt: null,
        pozicija: i.vratar ? 'GK' : null,
        vratar: !!i.vratar,
        zacetnik,
        minutaOd: od,
        minutaDo: do_,
        minute: do_ - od,
        goli: goliIgralca.filter((g) => !g.avtogol).length,
        goliIzEnajstmetrovke: goliIgralca.filter((g) => !g.avtogol && g.enajstmetrovka).length,
        avtogoli: goliIgralca.filter((g) => g.avtogol).length,
        zgreseneEnajstmetrovke: 0,
        rumeni: moji(z.rumeni).length,
        rdeci: i.rdec != null ? 1 : 0,
        prejetiGoli: prejeti,
        cleanSheet: prejeti === 0,
      })
    }
  }
  return out
}

// --- prenos ------------------------------------------------------------------

/** Stran lige, vedno sveža (živ dokument); preveri, da je res stran lige. */
async function stranLige(koda, prenesi) {
  const html = await prenesi(naslovLige(koda), imeLige(koda), true)
  if (!jeStranLige(html))
    throw new Error(`fsb: ${naslovLige(koda)} ni stran lige (${String(html ?? '').length} B) — uvoz ustavljen`)
  return html
}

const vir = {
  ime: 'fsb',
  polnoIme: 'Fudbalski savez Beograda (fsb.org.rs)',
  drzava: 'RS',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 2000,
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (_koda, pid) => naslovIzvestaja(pid),

  // Uvoz razporeda prenese stran lige (naslovRazporeda) in jo da sem.
  razcleniRazpored,

  async zapisniki(koda, prenesi) {
    const html = await stranLige(koda, prenesi)
    const { sezona, tekme } = tekmeStrani(html, koda)
    const out = []
    // Le "Odigrana" z izidom: "U toku" je tekma v živo, "---" kontumacija.
    for (const t of tekme.filter((x) => x.status === 'Odigrana' && x.izid && x.pid)) {
      const url = naslovIzvestaja(t.pid)
      const ime = imeIzvestaja(koda, t.pid)
      const star = starostDni(t.datum)
      // Prve dni po tekmi zveza zapisnik še popravlja: beri ga sveže.
      let z = vZapisnik(await prenesi(url, ime, star <= 3), { id: t.pid, url })
      if (!z && star > 3 && star <= 45) z = vZapisnik(await prenesi(url, ime, true), { id: t.pid, url })
      if (!z) continue
      // Ime kluba, krog in izid iz strani lige, da se tekma ujame z razporedom.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = sezona ?? z.sezona
      z.datum ??= t.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid na strani lige ${t.izid.domaci}:${t.izid.gostje}`)
      out.push({ id: t.pid, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaRs,
  kratkoIme: kratkoImeRs,
  poenostavi: kljucKlubaRs,
}

export default vir
