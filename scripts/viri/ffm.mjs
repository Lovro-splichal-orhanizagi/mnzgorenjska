// Vir: Fudbalska federacija na Makedonija (ffm.mk) — Prva in Vtora MFL ter
// regijske lige (Region 1–6, od 2026/27 namesto Treta liga).
//
// Ista WordPressova predloga kot fss.rs, s predpono `ffm-` namesto `fss-` in
// podatki iz COMET (šifre tekem so šifre COMET). Glej CLAUDE.md (Severna
// Makedonija — vir ffm).
//
// STRAN LIGE (`/natprevaruvanje/<slug>/`)
// - Šifra lige je slug strani (`region-1-sezona-26-27`, `prva-mfl27`); arhiv je
//   svoj slug (`vtora-mfl-25-26-2`, `treta-liga-zapad-24-25`). Latinice ni
//   (`?script=lat` stran prezre): imena klubov so v cirilici, kot jih piše
//   zveza.
// - Krogi so harmonika `ffm-rezultati__title` "N. коло". Prva harmonika
//   (`accordion_current`) PONOVI tekoči krog — beremo le `id="accordion"`, do
//   lestvice (`id="ffm-tabela"`).
// - Tekma: `ffm-rezultati__one-date` ("13.09.2026 16:00"; **00:00 = ura ni
//   znana**, tako so zapisane nerazpisane tekme), kraj, dve `col-6` z imenom
//   kluba, povezava `/izvestaj/<id>` (odigrana) ali `/najava/<id>` (napoved) in
//   štiri številke izida v IZVORNEM vrstnem redu: domači, gostje, polčas
//   domači, polčas gostje ("/" = ni izida).
//
// ZAPISNIK (`/izvestaj/<id>/`)
// - Glava `ffm-match-header` (imeni klubov v latinici, izid), pod njo
//   `ffm-match-meta` ("Полувреме: 1 - 2", "1. коло", "13.09.2026. 16:00").
// - Štirje bloki `ffm-rez__oneteam`: začetniki domačih, začetniki gostov
//   ("Стартна постава"), klop domačih, klop gostov ("Резервни играчи").
//   Igralec je `ffm-rez__start` z dogodki (`ffm-rez__ev <vrsta>` in minuta
//   "77'") PRED imenom in dresom. Imena igralcev so v LATINICI (COMET), tako
//   jih tudi hranimo.
// - Vrste dogodkov kot pri fss.rs: goal, penalty, own_goal (pri igralcu, ki
//   ga je dal — v njegovi ekipi), yellow, second_yellow, red, substitution
//   (vstop, pri rezervi), substitution_out (izstop, pri začetniku). Minute so
//   točne.
// - Šifer igralcev ni; identiteta je ime + klub (kot fss, fsb, MNZ).
//
// VRATAR ni označen. COMET ga v postavi našteje PRVEGA (ostali so po dresu),
// zato ima prvi začetnik vsake ekipe `vratar` — le kot namig (kot fssid,
// mlsz); *Uskladi pozicije* z `vir = ffm` ga popravi po večini tekem.
//
// Beremo odkrito in počasi (User-Agent SLFF, 2 s med zahtevki, popolnih
// zapisnikov ne beremo znova). robots.txt zapre le /wp-admin/. Če se pojavi
// izziv ali CAPTCHA, ustavi — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { sifra } from './zapisniki.mjs'
import { datumUra as datumUraFss, minuta, nastopi, sezonaIzDatuma } from './fss.mjs'

const OSNOVNI = 'https://www.ffm.mk'

const cista = (koda) => String(koda).trim().replace(/^\/+|\/+$/g, '')
export const naslovLige = (koda) => `${OSNOVNI}/natprevaruvanje/${cista(koda)}/`
// Šifra zapisnika v bazi je `mk<id>`: `matches.zapisnik_id` je enoličen čez
// vse vire, šifre COMET (ffm ~10–12 milijonov) pa so v istem številskem
// prostoru kot rastoče šifre drugih virov (oefb, mlsz). Naslov predpono odreže.
export const sifraZapisnika = (id) => `mk${String(id).replace(/^mk/, '')}`
export const naslovIzvestaja = (id) => `${OSNOVNI}/izvestaj/${String(id).replace(/^mk/, '')}/`
const imeLige = (koda) => `ffm-liga-${sifra(koda)}.html`
const imeIzvestaja = (koda, id) => `ffm-izvestaj-${sifra(koda)}-${String(id).replace(/^mk/, '')}.html`

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))
const brezSkript = (s) =>
  String(s ?? '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')

export { minuta, nastopi, sezonaIzDatuma }

/** Kot pri fss.rs, le da je 00:00 "ura ni znana" (nerazpisana tekma). */
export function datumUra(s) {
  const d = datumUraFss(s)
  return d.ura === '00:00' ? { ...d, ura: null } : d
}

const stevilo = (s) => (/^\d+$/.test(String(s ?? '').trim()) ? Number(String(s).trim()) : null)

// --- klubi -------------------------------------------------------------------

/** Ime kluba, kot ga piše zveza (cirilica, mešane velike črke), brez odvečnih presledkov. */
export const imeKluba = (ime) => razpakiraj(ime).replace(/\s+/g, ' ').trim()

/**
 * Ključ kluba: male črke, ločila v presledek. Zveza isti klub piše enkrat z
 * velikimi, drugič z malimi črkami ("ФК КУЛ-ЗДРАВЈЕ"), ključ ju zlije.
 */
export const kljucKlubaMk = (ime) =>
  razpakiraj(ime)
    .toLowerCase()
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

/** Kratko ime: brez "ФК" / "FK" na začetku ("ФК Студеничан" → "Студеничан"). */
export function kratkoImeMk(polno) {
  const besede = imeKluba(polno).split(' ')
  return (besede.length > 1 && /^(фк|fk|офк|ofk)$/i.test(besede[0]) ? besede.slice(1) : besede).join(' ')
}

// --- stran lige --------------------------------------------------------------

/** Je stran res stran lige (harmonika krogov), ne 404 ali prazna predloga? */
export const jeStranLige = (html) => /id="accordion"/.test(String(html ?? '')) && /ffm-rezultati__title/.test(String(html ?? ''))

/**
 * Vse tekme s strani lige: [{ krog, datum, ura, domaci, gostje, id, najava,
 * izid, polcas }]. Le harmonika `id="accordion"`.
 */
export function tekmeStrani(html) {
  const s = brezSkript(html)
  const i = s.indexOf('id="accordion"')
  if (i < 0) return []
  const konec = s.indexOf('id="ffm-tabela"', i)
  const harmonika = s.slice(i, konec < 0 ? undefined : konec)
  const out = []
  for (const del of harmonika.split(/class="ffm-rezultati__title"/).slice(1)) {
    const krog = Number(besedilo(del.slice(0, 400)).match(/(\d+)\.\s*(?:коло|kolo)/i)?.[1])
    if (!krog) continue
    for (const t of del.split(/class="ffm-rezultati__one"/).slice(1)) {
      const { datum, ura } = datumUra(besedilo(t.match(/ffm-rezultati__one-date[^>]*>([\s\S]*?)<\/div>/)?.[1]))
      const imena = [...t.matchAll(/<div class="col-6">([\s\S]*?)<\/div>/g)].map((m) => imeKluba(besedilo(m[1])))
      if (imena.length < 2 || !imena[0] || !imena[1]) continue
      const id = t.match(/\/izvestaj\/(\d+)/)?.[1] ?? null
      const najava = t.match(/\/najava\/(\d+)/)?.[1] ?? null
      const rez = t.match(/ffm-rezultati__result[^>]*>([\s\S]*?<\/div>)\s*<\/div>/)?.[1] ?? ''
      const st = [...rez.matchAll(/<div[^>]*>([^<]*)<\/div>/g)].map((m) => stevilo(m[1]))
      const izid = st[0] != null && st[1] != null ? { domaci: st[0], gostje: st[1] } : null
      out.push({
        krog,
        datum,
        ura,
        domaci: imena[0],
        gostje: imena[1],
        id,
        najava,
        izid,
        polcas: st[2] != null && st[3] != null ? { domaci: st[2], gostje: st[3] } : null,
      })
    }
  }
  return out
}

/**
 * Kontumacija: izid brez zapisnika ali izid BREZ POLČASA. Zveza registrira
 * izid za zeleno mizo kot "tekmo" z zapisnikom, ki ima postavi, a nobenega
 * dogodka in polčasa (Likova : Vlaznimi 0:3, Region 2, 13. 9. 2026); odigrana
 * tekma ima polčas vedno (preverjeno na vseh straneh 2023/24–2026/27).
 */
export const jeKontumacija = (t) => !!t.izid && (!t.id || !t.polcas)

/**
 * Razpored v obliko uvoza razporeda. Tekma z izidom in zapisnikom je
 * odigrana; kontumacija dobi izid s strani (glej `jeKontumacija`).
 */
export function razcleniRazpored(_vrstice, html) {
  if (!jeStranLige(html)) return []
  const krogi = new Map()
  for (const t of tekmeStrani(html)) {
    const kontumacija = jeKontumacija(t)
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija,
      odigrana: !!t.izid,
      ...(kontumacija ? { izid: t.izid } : {}),
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ----------------------------------------------------------------

const ZNANE = new Set(['goal', 'penalty', 'own_goal', 'penalty_failed_miss', 'yellow', 'second_yellow', 'red', 'substitution', 'substitution_out'])
const IZKLJUCITEV = ['red', 'second_yellow']

/** Igralci enega bloka `ffm-rez__oneteam`. */
function igralciBloka(blok, zacetnik) {
  const out = []
  for (const del of String(blok).split(/class=['"]ffm-rez__start[^'"]*['"]/).slice(1)) {
    const dogodki = [...del.matchAll(/ffm-rez__ev ([a-z_]+)['"][\s\S]*?<span>([^<]*)<\/span>\s*<\/div>/g)].map(([, vrsta, cas]) => ({
      vrsta,
      minuta: minuta(cas),
    }))
    const ime = del.match(/ffm-rez__name[^>]*>\s*<span>([^<]*)<\/span>\s*<span>([^<]*)<\/span>/)
    if (!ime) continue
    const prvi = (v) => dogodki.find((d) => d.vrsta === v)?.minuta ?? null
    out.push({
      st: stevilo(besedilo(ime[2])),
      ime: besedilo(ime[1]).replace(/\s+/g, ' ').trim(),
      zacetnik,
      noter: prvi('substitution'),
      ven: prvi('substitution_out'),
      rdec: dogodki.find((d) => IZKLJUCITEV.includes(d.vrsta))?.minuta ?? null,
      dogodki,
    })
  }
  return out
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null pri prazni predlogi ali če
 * ena od ekip nima postave. Vratar je prvi začetnik (namig, glej zgoraj).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = brezSkript(html)
  if (!/ffm-rez__start/.test(s)) return null
  const imena = [...s.matchAll(/ffm-match-header__name[^>]*>([\s\S]*?)<\/div>/g)].map((m) => besedilo(m[1]))
  const goli0 = [...s.matchAll(/ffm-match-header__goal[^>]*>\s*(\d+)\s*</g)].map((m) => Number(m[1]))
  if (goli0.length < 2) return null
  const rezultat = { domaci: goli0[0], gostje: goli0[1] }
  const bloki = s.split(/class="col-md-6 ffm-rez__oneteam"/).slice(1)
  if (bloki.length < 2) return null
  // Zadnji blok sega do noge strani; tam ni več `ffm-rez__start`.
  const [zd, zg, rd = '', rg = ''] = bloki
  const ekipe = [
    { ime: imena[0] ?? '', postava: igralciBloka(zd, true), rezerve: igralciBloka(rd, false) },
    { ime: imena[1] ?? '', postava: igralciBloka(zg, true), rezerve: igralciBloka(rg, false) },
  ]
  if (ekipe.some((e) => !e.postava.length)) return null
  // Kontumacija (zelena miza): postavi brez enega samega dogodka in polčasa.
  const p = s.match(/(?:Полувреме|Poluvreme):\s*(\d+)\s*-\s*(\d+)/)
  if (!p && ![...ekipe[0].postava, ...ekipe[0].rezerve, ...ekipe[1].postava, ...ekipe[1].rezerve].some((i) => i.dogodki.length)) return null

  const opozorila = []
  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  ekipe.forEach((e, ekipaIdx) => {
    for (const [n, i] of [...e.postava, ...e.rezerve].entries()) {
      // COMET vratarja našteje prvega (namig, kot fssid in mlsz).
      i.vratar = n === 0 && i.zacetnik
      const kdo = { ekipaIdx, st: i.st, ime: i.ime }
      for (const d of i.dogodki) {
        const z = { ...kdo, minuta: d.minuta }
        if (d.vrsta === 'goal') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
        else if (d.vrsta === 'penalty') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
        else if (d.vrsta === 'own_goal') goli.push({ ...z, avtogol: true, enajstmetrovka: false })
        else if (d.vrsta === 'penalty_failed_miss') zgresene.push(z)
        else if (d.vrsta === 'yellow') rumeni.push(z)
        else if (IZKLJUCITEV.includes(d.vrsta)) {
          if (!rdeci.some((r) => r.ekipaIdx === ekipaIdx && r.st === i.st && r.ime === i.ime)) rdeci.push(z)
        }
        else if (d.vrsta === 'substitution') menjave.push({ ekipaIdx, minuta: d.minuta, noter: kdo, ven: { st: null, ime: null } })
        if (!ZNANE.has(d.vrsta)) opozorila.push(`${e.ime}: neznan dogodek "${d.vrsta}" pri ${i.ime}`)
      }
    }
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
  })

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)

  const a = s.indexOf('ffm-match-meta')
  const info = a < 0 ? '' : besedilo(s.slice(a, s.indexOf('ffm-rez__', a)))
  const { datum, ura } = datumUra(info)
  const krog = Number(info.match(/(\d+)\.\s*(?:коло|kolo)/i)?.[1]) || null

  const vObliko = ({ dogodki: _d, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: sezonaIzDatuma(datum),
    krog,
    datum,
    ura,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    polcas: p ? { domaci: Number(p[1]), gostje: Number(p[2]) } : null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

// --- prenos ------------------------------------------------------------------

const starostDni = (datum, danes = Date.now()) =>
  datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0

async function stranLige(koda, prenesi) {
  const html = await prenesi(naslovLige(koda), imeLige(koda), true)
  if (!jeStranLige(html))
    throw new Error(`ffm: ${naslovLige(koda)} ni stran lige (${String(html ?? '').length} B) — uvoz ustavljen`)
  return html
}

const vir = {
  ime: 'ffm',
  polnoIme: 'Fudbalska federacija na Makedonija (ffm.mk)',
  drzava: 'MK',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 2000,
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (_koda, id) => naslovIzvestaja(id),

  razcleniRazpored,

  async zapisniki(koda, prenesi) {
    const html = await stranLige(koda, prenesi)
    const out = []
    for (const t of tekmeStrani(html).filter((x) => x.id && x.izid && !jeKontumacija(x))) {
      const url = naslovIzvestaja(t.id)
      const star = starostDni(t.datum)
      const sveze = star <= 3
      const id = sifraZapisnika(t.id)
      let z = vZapisnik(await prenesi(url, imeIzvestaja(koda, t.id), sveze), { id, url })
      if (!z && !sveze && star <= 45) z = vZapisnik(await prenesi(url, imeIzvestaja(koda, t.id), true), { id, url })
      if (!z) continue
      // Ime kluba (cirilica) in krog s strani lige, da se tekma ujame z razporedom.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = sezonaIzDatuma(t.datum) ?? z.sezona
      z.datum ??= t.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid na strani lige ${t.izid.domaci}:${t.izid.gostje}`)
      out.push({ id, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaMk,
  kratkoIme: kratkoImeMk,
  poenostavi: kljucKlubaMk,
}

export default vir
