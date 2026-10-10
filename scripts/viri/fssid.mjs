// Vir: regijske lige Srbije (Srpska liga Istok, Zapad, Vojvodina) po šifri
// tekme COMET na fss.rs.
//
// Regijske zveze (FSRIS, FSRZS, FSV) zapisnikov ne objavljajo, FSS pa na
// `/izvestaj-sa-utakmice/<id>/?script=lat` izriše KATERO KOLI tekmo COMET, tudi
// regijsko. Strani lige na fss.rs za te lige ni, zato ligo naslovimo z blokom
// šifer. Glej CLAUDE.md (Srbija — vir fssid).
//
// BLOK ŠIFER
// - Tekmovanje-sezona je EN strnjen blok N×(N−1) šifer (dvokrožna liga z N
//   klubi), urejen po krogih: N/2 šifer na krog, krog = (id − od) div (N/2) + 1.
//   Šifra lige je "<od>-<do>" (npr. `75912381-75912620`, Srpska liga Istok
//   2026/27, 16 klubov, 240 tekem).
// - Stran tekme ima tri stanja: "Utakmica ne postoji" (šifre ni), "Utakmica
//   nije odigrana ili podaci nisu uneti" (le imeni klubov — brez datuma in
//   kroga) in poln zapisnik (izid, polčas, "N. kolo", datum in ura, postavi,
//   dogodki). Zapisnik razčleni `vZapisnik` iz fss.mjs.
// - Krog odigrane tekme je iz zapisnika ("N. kolo"), neodigrane iz mesta v
//   bloku. Neujemanje se izpiše (`neujemanjaKrogov`).
//
// DATUMI NEODIGRANIH TEKEM fss.rs nima. Kjer jih ima regijska zveza, jih
// vzamemo od tam (`DATUMI`: fsris.org.rs za Istok, fsv.rs za Vojvodino), tekmo
// najdemo po krogu in imenih klubov. Krog brez datuma dobi OCENO (zadnji znani
// krog iste polovice sezone + 7 dni na krog, na najpogostejši dan in uro);
// krog z oceno ima `ocenjen: true` (→ `rounds.datum_ocenjen`). Druga polovica
// sezone (po zimskem premoru) brez znanega datuma se ne oceni — krogi pridejo,
// ko jih zveza objavi ali se odigrajo.
//
// VRATAR: fss.rs ga ne označi; prvaliga.rs ga pokaže tudi za regijske tekme
// (ista šifra COMET, "(G)"). Če ga tam ni, je vratar prvi začetnik — COMET
// vratarja vedno našteje prvega (namig kot pri mlsz).
//
// Beremo odkrito in počasi (User-Agent SLFF, 2 s med zahtevki). Odigrane tekme
// se iz predpomnilnika ne berejo znova (razen prve 3 dni), neodigrane le, ko so
// na vrsti, sicer enkrat na teden. Izziv ali CAPTCHA ustavi uvoz.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { razpakiraj } from '../klubi.mjs'
import { kljucKlubaRs, kratkoImeRs } from './fsb.mjs'
import { datumUra, dresiVratarjev, imeKluba as imeKlubaFss, naslovIzvestaja, naslovVratarjev, nastopi, sezonaIzDatuma, vZapisnik } from './fss.mjs'

const MAPA = 'scripts/.predpomnilnik/fssid'
const URA = 3600000
const DAN = 24 * URA

// Vir datumov po bloku. Nova sezona = nov blok = nova vrstica (ali nič: brez
// vira so datumi neodigranih krogov ocenjeni).
export const DATUMI = {
  // Srpska liga Istok 2026/27: fsris.org.rs, sezona 19 (izbirnik na strani).
  '75912381-75912620': { vir: 'fsris', naslov: 'https://fsris.org.rs/takmicenja/srpska-liga-istok/', sezona: 19 },
  // Srpska liga Vojvodina 2026/27: fsv.rs, en sam seznam vseh krogov (cirilica).
  '75952376-75952615': { vir: 'fsv', naslov: 'https://fsv.rs/srpska-liga-vojvodina-rezultati-i-tabela/' },
}

// --- blok ----------------------------------------------------------------------

/** "75912381-75912620" → { od, do, tekem, klubov, naKrog, krogov }. */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)-(\d+)$/)
  if (!m) throw new Error(`fssid: šifra lige "${koda}" ni oblike "<od>-<do>"`)
  const od = Number(m[1])
  const do_ = Number(m[2])
  const tekem = do_ - od + 1
  const klubov = (1 + Math.sqrt(1 + 4 * tekem)) / 2
  if (!(tekem > 0) || !Number.isInteger(klubov) || klubov % 2)
    throw new Error(`fssid: blok ${koda} ima ${tekem} šifer, kar ni N×(N−1) za sodo število klubov N`)
  return { od, do: do_, tekem, klubov, naKrog: klubov / 2, krogov: 2 * (klubov - 1) }
}

/** Krog po mestu šifre v bloku. */
export const krogPoMestu = (id, blok) => Math.floor((Number(id) - blok.od) / blok.naKrog) + 1

// --- stran tekme ---------------------------------------------------------------

const brezSkript = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))

/** 'ne-postoji' | 'neodigrana' | 'odigrana' (z izidom) | 'neznano' (izziv, sprememba strani). */
export function stanjeStrani(html) {
  const s = String(html ?? '')
  if (/Utakmica ne postoji/i.test(s)) return 'ne-postoji'
  if (!/fss-rez__title/.test(s)) return 'neznano'
  if (/nije odigrana ili podaci nisu uneti/i.test(s)) return 'neodigrana'
  if (/fss-rez__rez"/.test(s)) return 'odigrana'
  return 'neznano'
}

// Isti klub kot v državni ligi (vir `fss`, ime s strani lige brez kraja):
// izpadla kluba Prve lige 2025/26. FAP in KABEL (Novi Sad) se ujemata sama.
// Pregled 10. 10. 2026 (vsa imena klubov RS v bazi); ob novi ligi preveri znova.
const IME_DRZAVNE = {
  'TRAJAL (Kruševac)': 'TRAJAL',
  'TEKSTILAC (Odžaci)': 'TEKSTILAC',
}

/**
 * Ime kluba, kot ga piše COMET, počiščeno: podvojen kraj ("KABEL (Novi Sad)
 * (Novi Sad)") enkrat, kraj z velikimi črkami ("(SVILAJNAC)") z veliko
 * začetnico. Kratice v oklepaju ("(VA)", "(P)") ostanejo.
 */
export function imeKluba(ime) {
  let s = razpakiraj(ime)
  let prej
  do {
    prej = s
    s = s.replace(/(\([^()]*\))\s*\1/giu, '$1')
  } while (s !== prej)
  s = s.replace(/\(([^()]*)\)/g, (cel, kraj) =>
    kraj.length > 3 && kraj === kraj.toUpperCase() && /\p{Lu}{4}/u.test(kraj)
      ? `(${kraj.toLowerCase().replace(/(^|[\s.-])(\p{L})/gu, (_, a, c) => a + c.toUpperCase())})`
      : cel,
  )
  return IME_DRZAVNE[s] ?? imeKlubaFss(s)
}

/** Glava strani tekme: klubi, izid, polčas, krog, datum, ura (kar je). */
export function glavaStrani(html) {
  const s = brezSkript(html)
  const glava = s.match(/class="fss-rez__title">\s*<span[^>]*>([\s\S]*?)<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/)
  const rez = s.match(/fss-rez__rez">\s*<div[^>]*><span>\s*(\d+)\s*<\/span><\/div>\s*<div[^>]*><span>\s*(\d+)\s*<\/span>/)
  const a = s.indexOf('fss-rez__info')
  const b = a < 0 ? -1 : s.indexOf('fss-rez__oneteam', a)
  const info = a < 0 ? '' : besedilo(s.slice(a, b < 0 ? a + 4000 : b))
  const { datum, ura } = datumUra(info)
  return {
    domaci: glava ? imeKluba(besedilo(glava[1])) : null,
    gostje: glava ? imeKluba(besedilo(glava[2])) : null,
    izid: rez ? { domaci: Number(rez[1]), gostje: Number(rez[2]) } : null,
    krog: Number(info.match(/(\d+)\.\s*(?:kolo|коло)/i)?.[1]) || null,
    datum,
    ura,
  }
}

/** Dres prvega začetnika vsake ekipe (COMET vratarja našteje prvega). */
export function prviZacetniki(html) {
  const z = vZapisnik(html)
  if (!z) return null
  return [z.domaci, z.gostje].map((e) => new Set(e.postava[0]?.st != null ? [e.postava[0].st] : []))
}

// --- imena za ujemanje z virom datumov ---------------------------------------

const CIRILICA = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj',
  м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č',
  џ: 'dž', ш: 'š',
}
/** Srbska cirilica v latinico (male črke). */
export const vLatinico = (s) => [...String(s ?? '').toLowerCase()].map((c) => CIRILICA[c] ?? c).join('')

const SPLOSNE = new Set(['fk', 'ofk', 'gfk', 'sfu', 'su', 'sfs', 'fudbalski', 'klub'])
/** Besede imena brez šumnikov in splošnih oznak ("OFK Sinđelić" → ["sindjelic"]). */
export function besedeImena(ime) {
  return vLatinico(razpakiraj(ime))
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((b) => b && !SPLOSNE.has(b))
}
const podobnost = (a, b) => {
  const A = new Set(besedeImena(a))
  const B = besedeImena(b)
  if (!A.size || !B.length) return 0
  return B.filter((x) => A.has(x)).length / Math.min(A.size, new Set(B).size)
}

/**
 * Vrsticam vira datumov ({krog, domaci, gostje, datum, ura}) poišče tekme
 * COMET istega kroga. Vrne Map id → vrstica in število neujetih vrstic.
 */
export function ujemiZVirom(tekme, vrstice) {
  const out = new Map()
  let neujetih = 0
  const poKrogu = new Map()
  for (const t of tekme) {
    if (!poKrogu.has(t.krog)) poKrogu.set(t.krog, [])
    poKrogu.get(t.krog).push(t)
  }
  const kandidati = []
  for (const [i, v] of vrstice.entries()) {
    let naj = null
    for (const t of poKrogu.get(v.krog) ?? []) {
      const d = podobnost(t.domaci, v.domaci)
      const g = podobnost(t.gostje, v.gostje)
      if (d <= 0 || g <= 0) continue
      if (!naj || d + g > naj.ocena) naj = { t, ocena: d + g }
    }
    if (naj) kandidati.push({ i, v, ...naj })
    else neujetih++
  }
  // Najboljši par prvi; tekmo dobi ena sama vrstica.
  kandidati.sort((a, b) => b.ocena - a.ocena)
  for (const k of kandidati) {
    if (out.has(k.t.id)) neujetih++
    else out.set(k.t.id, k.v)
  }
  return { ujete: out, neujetih }
}

// --- viri datumov --------------------------------------------------------------

/** fsris.org.rs: šifre krogov iz izbirnika ({ krog → id }). */
export function krogiFsris(html) {
  const s = String(html ?? '')
  const izbirnik = s.slice(s.indexOf('id="kolo"'), s.indexOf('</select>', s.indexOf('id="kolo"')))
  return new Map([...izbirnik.matchAll(/<option value="(\d+)"[^>]*>\s*(\d+)\.\s*kolo/g)].map((m) => [Number(m[2]), m[1]]))
}

/** fsris.org.rs: tekme vseh tabel `#raspored` na strani ({krog, domaci, gostje, datum, ura}). */
export function tekmeFsris(html) {
  const out = []
  for (const tabela of brezSkript(html).split('<table id="raspored"').slice(1)) {
    const del = tabela.slice(0, tabela.indexOf('</table>'))
    const krog = Number(besedilo(del.match(/<th>([\s\S]*?)<\/th>/)?.[1]).match(/(\d+)\.\s*kolo/i)?.[1])
    if (!krog) continue
    for (const vr of del.split(/<tr class="matchmatch/).slice(1)) {
      const datum = besedilo(vr.match(/raspored-date">([\s\S]*?)<\/span>/)?.[1])
      const ura = besedilo(vr.match(/raspored-time">([\s\S]*?)<\/span>/)?.[1])
      const imena = [...vr.matchAll(/<a\s+title="([^"]*)"/g)].map((m) => razpakiraj(m[1]))
      if (imena.length < 2) continue
      const d = datumUra(`${datum} ${ura}`)
      out.push({ krog, domaci: imena[0], gostje: imena[1], datum: d.datum, ura: d.ura })
    }
  }
  return out
}

/** fsv.rs: vse tekme strani "rezultati i tabela" (cirilica; harmonika `comet-acc`). */
export function tekmeFsv(html) {
  const out = []
  for (const del of brezSkript(html).split(/class="comet-acc /).slice(1)) {
    const krog = Number(besedilo(del.match(/<strong>([\s\S]*?)<\/strong>/)?.[1]).match(/(\d+)\.\s*(?:коло|kolo)/i)?.[1])
    if (!krog) continue
    for (const vr of del.matchAll(/<tr><td>([\s\S]*?)<\/td><td>[\s\S]*?<\/td><td>([\s\S]*?)<\/td><\/tr>/g)) {
      const par = besedilo(vr[1]).replace(/\s+(?:\d+\s*:\s*\d+\*?|-\s*:\s*-)\s*$/, '')
      const [domaci, ...ostalo] = par.split(' - ')
      if (!domaci || !ostalo.length) continue
      const d = datumUra(besedilo(vr[2]).replace(/\s*-\s*/, ' '))
      out.push({ krog, domaci, gostje: ostalo.join(' - '), datum: d.datum, ura: d.ura })
    }
  }
  return out
}

// --- predpomnilnik -------------------------------------------------------------

const pot = (ime) => `${MAPA}/${ime}`
const imeTekme = (id) => `tekma-${id}.html`
const imeVratarjev = (id) => `vratarji-${id}.html`
function izPredpomnilnika(ime) {
  const p = pot(ime)
  if (!existsSync(p)) return null
  return { html: readFileSync(p, 'utf8'), starost: Date.now() - statSync(p).mtimeMs }
}
/** Iz predpomnilnika, če ni starejši od `najvec` ms; sicer prenese (in zapiše). */
async function beri(prenesi, url, ime, najvec) {
  const c = izPredpomnilnika(ime)
  if (c && c.starost <= najvec) return c.html
  const html = await prenesi(url, ime, true)
  // Oba uvoza pišeta v `scripts/.predpomnilnik/<vir>/<ime>`, kar je MAPA;
  // zapišemo še sami, da predpomnilnik ne visi na tem dogovoru.
  mkdirSync(MAPA, { recursive: true })
  writeFileSync(pot(ime), html)
  return html
}

async function vrsticeDatumov(koda, prenesi) {
  const v = DATUMI[String(koda).trim()]
  if (!v) return []
  try {
    if (v.vir === 'fsv') return tekmeFsv(await beri(prenesi, v.naslov, `fsv-${String(koda).trim()}.html`, 12 * URA))
    if (v.vir === 'fsris') {
      const glavna = await beri(prenesi, v.naslov, `fsris-${String(koda).trim()}.html`, 12 * URA)
      const out = tekmeFsris(glavna)
      const znani = new Set(out.map((t) => t.krog))
      for (const [krog, id] of krogiFsris(glavna)) {
        if (znani.has(krog)) continue
        const url = `${v.naslov}?delegiranje=&kolo=${id}&sezona=${v.sezona}`
        const html = await beri(prenesi, url, `fsris-${String(koda).trim()}-${krog}.html`, 12 * URA)
        for (const t of tekmeFsris(html)) if (!znani.has(t.krog) || t.krog === krog) out.push(t)
        znani.add(krog)
      }
      return out
    }
  } catch (e) {
    // Brez vira datumov so datumi ocenjeni — uvoz ne pade.
    console.warn(`fssid: vir datumov ${v.naslov}: ${e.message}`)
  }
  return []
}

// --- branje bloka ----------------------------------------------------------------

const dodajDni = (datum, dni) => new Date(Date.parse(`${datum}T12:00:00Z`) + dni * DAN).toISOString().slice(0, 10)
const danVTednu = (datum) => new Date(`${datum}T12:00:00Z`).getUTCDay()
const najpogostejsi = (xs) => {
  const n = new Map()
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1)
  return [...n.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] ?? null
}

/**
 * Tekme bloka s krogom in datumom. Vsaki tekmi doda `datum` (zapisnik, vir
 * datumov ali krog), krogu z oceno `ocenjen`. Vrne { tekme, krogi, ... }.
 */
export function sestaviBlok(blok, strani, vrstice = [], { danes = Date.now() } = {}) {
  const tekme = []
  const neObstaja = []
  const neujemanjaKrogov = []
  for (let id = blok.od; id <= blok.do; id++) {
    const html = strani.get(id)
    const stanje = html == null ? 'neprebrana' : stanjeStrani(html)
    if (stanje === 'ne-postoji') { neObstaja.push(id); continue }
    if (stanje !== 'neodigrana' && stanje !== 'odigrana') continue
    const g = glavaStrani(html)
    const mesto = krogPoMestu(id, blok)
    if (stanje === 'odigrana' && g.krog && g.krog !== mesto) neujemanjaKrogov.push({ id, krog: g.krog, mesto })
    tekme.push({
      id: String(id),
      stanje,
      domaci: g.domaci,
      gostje: g.gostje,
      krog: stanje === 'odigrana' && g.krog ? g.krog : mesto,
      datum: stanje === 'odigrana' ? g.datum : null,
      ura: stanje === 'odigrana' ? g.ura : null,
      izid: stanje === 'odigrana' ? g.izid : null,
      html,
    })
  }

  const { ujete, neujetih } = ujemiZVirom(tekme, vrstice)
  let datumVira = 0
  let datumSeUjema = 0
  for (const t of tekme) {
    const v = ujete.get(t.id)
    if (!v?.datum) continue
    if (t.stanje === 'odigrana') { if (v.datum === t.datum) datumSeUjema++; continue }
    t.datum = v.datum
    t.ura = v.ura
    datumVira++
  }

  // Datum kroga: najzgodnejša znana tekma; brez nje ocena iz prejšnjega kroga
  // iste polovice sezone.
  const krogi = []
  for (let k = 1; k <= blok.krogov; k++) {
    const t = tekme.filter((x) => x.krog === k)
    const datumi = t.filter((x) => x.datum).sort((a, b) => (a.datum + (a.ura ?? '')).localeCompare(b.datum + (b.ura ?? '')))
    krogi.push({ stevilka: k, tekme: t, datum: datumi[0]?.datum ?? null, ura: datumi[0]?.ura ?? null, ocenjen: false })
  }
  const znani = krogi.filter((k) => k.datum)
  const dan = najpogostejsi(znani.map((k) => danVTednu(k.datum)))
  const ura = najpogostejsi(znani.map((k) => k.ura).filter(Boolean))
  const polovica = (k) => (k <= blok.klubov - 1 ? 1 : 2)
  let zadnji = null
  for (const k of krogi) {
    if (k.datum) { zadnji = k; continue }
    if (!zadnji || polovica(zadnji.stevilka) !== polovica(k.stevilka)) continue
    let d = dodajDni(zadnji.datum, 7 * (k.stevilka - zadnji.stevilka))
    if (dan != null) {
      const zamik = ((dan - danVTednu(d) + 10) % 7) - 3 // najbližji tak dan (−3 … +3)
      d = dodajDni(d, zamik)
    }
    k.datum = d
    k.ura = ura
    k.ocenjen = true
  }
  // Neodigrana tekma brez lastnega datuma dobi datum kroga.
  for (const k of krogi)
    for (const t of k.tekme)
      if (!t.datum && k.datum) { t.datum = k.datum; t.ura = k.ura }

  return { tekme, krogi, neObstaja, neujemanjaKrogov, ujetihVrstic: ujete.size, neujetih, datumVira, datumSeUjema }
}

/** Kako star sme biti predpomnjen list tekme (ms) glede na to, kdaj je na vrsti. */
function najvecStarost(stanje, datum, danes) {
  if (stanje === 'odigrana') return Infinity
  if (!datum) return 7 * DAN
  const cez = (Date.parse(`${datum}T00:00:00Z`) - danes) / DAN
  if (cez > 1) return 7 * DAN // še ni na vrsti
  if (cez > -14) return URA // na vrsti ali pred kratkim
  return DAN // prestavljena tekma brez novega datuma
}

/**
 * Prebere blok: najprej predpomnilnik (za datume), nato prenese, kar je treba
 * — liste brez predpomnilnika, neodigrane tekme, ki so na vrsti, in (ob
 * `svezi`) odigrane mlajše od treh dni.
 */
export async function preberiBlok(koda, prenesi, { danes = Date.now(), svezi = false } = {}) {
  const blok = razberiKodo(koda)
  const vrstice = await vrsticeDatumov(koda, prenesi)
  const strani = new Map()
  for (let id = blok.od; id <= blok.do; id++) {
    const c = izPredpomnilnika(imeTekme(id))
    if (c) strani.set(id, c.html)
  }
  const prej = sestaviBlok(blok, strani, vrstice, { danes })
  const datumTekme = new Map(prej.tekme.map((t) => [Number(t.id), t]))
  let prebranih = 0
  for (let id = blok.od; id <= blok.do; id++) {
    const c = izPredpomnilnika(imeTekme(id))
    const t = datumTekme.get(id)
    const stanje = c ? stanjeStrani(c.html) : null
    let najvec = c ? najvecStarost(stanje, t?.datum ?? null, danes) : -1
    if (stanje === 'odigrana' && svezi) {
      const star = t?.datum ? (danes - Date.parse(`${t.datum}T00:00:00Z`)) / DAN : 0
      if (star <= 3) najvec = -1
      // Zapisnik brez postav (morda še ni vnesen v celoti): do 45 dni znova.
      else if (star <= 45 && !vZapisnik(c.html)) najvec = DAN
    }
    if (c && c.starost <= najvec) continue
    const html = await beri(prenesi, naslovIzvestaja(id), imeTekme(id), -1)
    prebranih++
    if (stanjeStrani(html) === 'neznano')
      throw new Error(`fssid: ${naslovIzvestaja(id)} ni stran tekme (${html.length} B) — morda izziv; uvoz ustavljen`)
    strani.set(id, html)
  }
  const b = sestaviBlok(blok, strani, vrstice, { danes })
  if (b.neObstaja.length) console.warn(`fssid: v bloku ${koda} ni tekem ${b.neObstaja.join(', ')}`)
  if (b.neujemanjaKrogov.length)
    console.warn(`fssid: krog iz zapisnika ni krog po mestu pri ${b.neujemanjaKrogov.map((x) => `${x.id} (${x.krog}. ≠ ${x.mesto}.)`).join(', ')}`)
  if (vrstice.length && b.neujetih) console.warn(`fssid: ${b.neujetih} od ${vrstice.length} tekem vira datumov ni ujetih`)
  return { blok, ...b, prebranih, vrstic: vrstice.length }
}

// --- vir ---------------------------------------------------------------------------

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)

/** Razpored iz prebranega bloka (krogi brez datuma izpadejo). */
export function razporedBloka(b, { danes = Date.now() } = {}) {
  const out = []
  for (const k of b.krogi) {
    if (!k.datum || !k.tekme.length) continue
    out.push({
      stevilka: k.stevilka,
      ocenjen: k.ocenjen,
      tekme: k.tekme.map((t) => {
        // Izid brez postav (ali z eno) je kontumacija, ko je starejša od tedna.
        const kontumacija = t.stanje === 'odigrana' && !!t.izid && !vZapisnik(t.html) && starostDni(t.datum, danes) > 7
        return {
          domaci: t.domaci,
          gostje: t.gostje,
          datum: t.datum,
          ura: t.ura,
          odigrana: t.stanje === 'odigrana',
          kontumacija,
          ...(kontumacija ? { izid: t.izid } : {}),
        }
      }),
    })
  }
  return out
}

const vir = {
  ime: 'fssid',
  polnoIme: 'Fudbalski savez Srbije (fss.rs, tekme COMET po šifri)',
  drzava: 'RS',
  osnovniNaslov: 'https://fss.rs',
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 2000,
  imaRegistracije: false,
  // Uvoz razporeda zapiše `rounds.datum_ocenjen` (krog brez znanega datuma).
  ocenjeniDatumi: true,

  // Uvoz razporeda to stran prenese pred `razporedVseStrani`: prva tekma bloka.
  naslovRazporeda: (koda) => naslovIzvestaja(razberiKodo(koda).od),
  naslovZapisnika: (_koda, id) => naslovIzvestaja(id),

  async razporedVseStrani(koda, prenesi) {
    return razporedBloka(await preberiBlok(koda, prenesi))
  },

  async zapisniki(koda, prenesi) {
    const b = await preberiBlok(koda, prenesi, { svezi: true })
    const out = []
    let namigov = 0
    for (const t of b.tekme.filter((x) => x.stanje === 'odigrana')) {
      const url = naslovIzvestaja(t.id)
      let vratarji = null
      try {
        const sveze = starostDni(t.datum) <= 3
        vratarji = dresiVratarjev(await beri(prenesi, naslovVratarjev(t.id), imeVratarjev(t.id), sveze ? -1 : Infinity))
      } catch (e) {
        console.warn(`fssid: vratarji ${t.id}: ${e.message}`)
      }
      if (!vratarji || ![...vratarji[0]].length || ![...vratarji[1]].length) {
        vratarji = prviZacetniki(t.html)
        namigov++
      }
      const z = vZapisnik(t.html, { id: t.id, url, vratarji })
      if (!z) continue
      z.opozorila = z.opozorila.filter((o) => o !== 'vratarjev ni (prvaliga.rs)')
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.datum ??= t.datum
      z.sezona = sezonaIzDatuma(z.datum) ?? z.sezona
      out.push({ id: t.id, z, url })
    }
    if (namigov) console.log(`fssid: vratar kot prvi začetnik (prvaliga.rs ga ni dala) pri ${namigov} tekmah`)
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaRs,
  kratkoIme: kratkoImeRs,
  poenostavi: kljucKlubaRs,
}

export default vir
