// Vir: Fudbalski savez Srbije (fss.rs) — državni ligi Superliga in Prva liga.
//
// Ostale srbske zveze (Vojvodina, Zahod, Vzhod) zapisnikov ne objavljajo;
// Beograd bere vir `fsb`. Glej CLAUDE.md (Srbija).
//
// STRAN LIGE (`/takmicenje/<slug>/?script=lat`)
// - Šifra lige je slug strani (`mozzart-bet-super-liga-srbije-26-27`); arhiv
//   je svoj slug (`…-25-26`, končnica `-play-off` / `-play-out` je drugo
//   tekmovanje). `?script=lat` da latinico (privzeto je cirilica).
// - Krogi so harmonika `fss-rezultati__title` "N. kolo". Prva harmonika
//   (`accordion_current`) PONOVI tekoči krog — beremo le `id="accordion"`.
// - Tekma: `fss-rezultati__one-date` ("01.08.2026 20:00" ali "11.10.2026. 18:00"),
//   dve `col-6` z imenom kluba (brez kraja), povezava `/izvestaj-sa-utakmice/<id>`
//   (le pri odigrani) in štiri številke izida v IZVORNEM vrstnem redu:
//   domači, gostje, polčas domači, polčas gostje ("/" = ni izida).
//
// ZAPISNIK (`/izvestaj-sa-utakmice/<id>/?script=lat`)
// - Neveljaven ali neodigran id vrne 200 s prazno predlogo: veljaven je le z
//   `fss-rez__start`.
// - Štirje bloki `fss-rez__oneteam`: začetniki domačih, začetniki gostov,
//   (naslov "Rezervni igrači") klop domačih, klop gostov. Igralec je
//   `fss-rez__start` z dogodki (`fss-rez__ev <vrsta>` in minuta "77'") PRED
//   imenom in dresom.
// - Vrste: goal, penalty, own_goal (pri igralcu, ki ga je dal — v njegovi
//   ekipi), penalty_failed_miss, yellow, second_yellow in red (izključitev;
//   prvi rumeni ostane svoj dogodek), substitution (minuta vstopa,
//   pri rezervi), substitution_out (minuta izstopa, pri začetniku). Menjave
//   niso v parih, a vsak igralec nosi svojo minuto — minute so točne.
// - Šifer igralcev ni; identiteta je ime + klub (kot pri MNZ in fsb).
//
// VRATAR: fss.rs ga ne označi. Isto tekmo (ista šifra COMET) objavi
// prvaliga.rs (`/arhiva/izvestaj-utakmice/<id>/`, tudi za Superligo in za
// tekočo sezono; robots.txt dovoli) z oznako "(G)" pri dresu. Iz nje vzamemo
// le, KATERI dres je vratar; imena so tam okrnjena ("LIMA MAGALHAES Ma...").
// superliga.rs ima isto, a robots.txt prepove /arhiva/ — tja ne hodimo.
//
// Beremo odkrito in počasi (User-Agent SLFF, 2 s med zahtevki, popolnih
// zapisnikov ne beremo znova). Če se pojavi izziv ali CAPTCHA, ustavi.
import { razpakiraj } from '../klubi.mjs'
import { sifra } from './zapisniki.mjs'
import { kljucKlubaRs, kratkoImeRs, lepoIme } from './fsb.mjs'

const OSNOVNI = 'https://fss.rs'
const VRATARJI = 'https://www.prvaliga.rs/arhiva/izvestaj-utakmice'
const DOLZINA_TEKME = 90

const cista = (koda) => String(koda).trim().replace(/^\/+|\/+$/g, '')
export const naslovLige = (koda) => `${OSNOVNI}/takmicenje/${cista(koda)}/?script=lat`
export const naslovIzvestaja = (id) => `${OSNOVNI}/izvestaj-sa-utakmice/${id}/?script=lat`
export const naslovVratarjev = (id) => `${VRATARJI}/${id}/`
const imeLige = (koda) => `fss-liga-${sifra(koda)}.html`
const imeIzvestaja = (koda, id) => `fss-izvestaj-${sifra(koda)}-${id}.html`
const imeVratarjev = (koda, id) => `fss-vratarji-${sifra(koda)}-${id}.html`

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))
const brezSkript = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')

/** "77'" → 77, "45+2'" → 45, "90+6'" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "14.08.2026. 20:00" / "01.08.2026 20:00" → { datum: "2026-08-14", ura: "20:00" }. */
export function datumUra(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\.?\s*(?:(\d{1,2}):(\d{2}))?/)
  if (!m) return { datum: null, ura: null }
  return {
    datum: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
    ura: m[4] ? `${m[4].padStart(2, '0')}:${m[5]}` : null,
  }
}

/** Sezona iz datuma: od julija naprej je nova ("2026-10-03" → "2026/27"). */
export function sezonaIzDatuma(datum) {
  const m = String(datum ?? '').match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  const leto = Number(m[2]) >= 7 ? Number(m[1]) : Number(m[1]) - 1
  return `${leto}/${String((leto + 1) % 100).padStart(2, '0')}`
}

// Isto ime, drug klub: državni klub, ki se imenuje kot beograjski (vir fsb),
// dobi kraj (iz glave zapisnika, "NAPREDAK (Kruševac)"). Klubi so v bazi
// enolični po imenu v državi, zato bi se sicer zlila. UŠĆE NOVI BEOGRAD in
// TELEOPTIK sta isti klub v obeh virih (izpad, napredovanje). Pregled
// 10. 10. 2026; ob novi ligi ali sezoni preveri znova.
const IME = {
  JEDINSTVO: 'JEDINSTVO (Ub)', // fsb: Jakovo
  MLADOST: 'MLADOST (Lučani)', // fsb: Baroševac, Cvetovac
  NAPREDAK: 'NAPREDAK (Kruševac)', // fsb: Medoševac, Mladenovac
  RADNIČKI: 'RADNIČKI (Niš)', // fsb: Srpska liga Beograd
}
export const imeKluba = (ime) => {
  const surovo = razpakiraj(ime)
  return IME[surovo.toUpperCase()] ?? surovo
}

const stevilo = (s) => (/^\d+$/.test(String(s ?? '').trim()) ? Number(String(s).trim()) : null)

// --- stran lige --------------------------------------------------------------

/** Je stran res stran lige (harmonika krogov), ne prazna predloga? */
export const jeStranLige = (html) => /id="accordion"/.test(String(html ?? '')) && /fss-rezultati__title/.test(String(html ?? ''))

/**
 * Vse tekme s strani lige: [{ krog, datum, ura, domaci, gostje, id, izid,
 * polcas }]. Le harmonika `id="accordion"` (prva, `accordion_current`, je
 * ponovljeni tekoči krog).
 */
export function tekmeStrani(html) {
  const s = brezSkript(html)
  const i = s.indexOf('id="accordion"')
  if (i < 0) return []
  let konec = s.indexOf('id="fss-tabela"', i)
  const harmonika = s.slice(i, konec < 0 ? undefined : konec)
  const out = []
  for (const del of harmonika.split(/class="fss-rezultati__title"/).slice(1)) {
    const krog = Number(besedilo(del.slice(0, 400)).match(/(\d+)\.\s*(?:kolo|коло)/i)?.[1])
    if (!krog) continue
    for (const t of del.split(/class="fss-rezultati__one"/).slice(1)) {
      const { datum, ura } = datumUra(besedilo(t.match(/fss-rezultati__one-date[^>]*>([\s\S]*?)<\/div>/)?.[1]))
      const imena = [...t.matchAll(/<div class="col-6">([\s\S]*?)<\/div>/g)].map((m) => imeKluba(besedilo(m[1])))
      if (imena.length < 2 || !imena[0] || !imena[1]) continue
      const id = t.match(/\/izvestaj-sa-utakmice\/(\d+)/)?.[1] ?? null
      const rez = t.match(/fss-rezultati__result[^>]*>([\s\S]*?<\/div>)\s*<\/div>/)?.[1] ?? ''
      const st = [...rez.matchAll(/<div[^>]*>([^<]*)<\/div>/g)].map((m) => stevilo(m[1]))
      const izid = st[0] != null && st[1] != null ? { domaci: st[0], gostje: st[1] } : null
      out.push({
        krog,
        datum,
        ura,
        domaci: imena[0],
        gostje: imena[1],
        id,
        izid,
        polcas: st[2] != null && st[3] != null ? { domaci: st[2], gostje: st[3] } : null,
      })
    }
  }
  return out
}

/**
 * Razpored v obliko uvoza razporeda. Tekma z izidom in zapisnikom je
 * odigrana; z izidom brez zapisnika je kontumacija (izid je na strani).
 */
export function razcleniRazpored(_vrstice, html) {
  if (!jeStranLige(html)) return []
  const krogi = new Map()
  for (const t of tekmeStrani(html)) {
    const kontumacija = !!t.izid && !t.id
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

/** Igralci enega bloka `fss-rez__oneteam`. */
function igralciBloka(blok, zacetnik) {
  const out = []
  for (const del of String(blok).split(/class=['"]fss-rez__start['"]/).slice(1)) {
    const dogodki = [...del.matchAll(/fss-rez__ev ([a-z_]+)['"][\s\S]*?<span>([^<]*)<\/span>\s*<\/div>/g)].map(([, vrsta, cas]) => ({
      vrsta,
      minuta: minuta(cas),
    }))
    const ime = del.match(/fss-rez__name[^>]*>\s*<span>([^<]*)<\/span>\s*<span>([^<]*)<\/span>/)
    if (!ime) continue
    const prvi = (v) => dogodki.find((d) => d.vrsta === v)?.minuta ?? null
    out.push({
      st: stevilo(ime[2]),
      ime: lepoIme(besedilo(ime[1])),
      zacetnik,
      noter: prvi('substitution'),
      ven: prvi('substitution_out'),
      rdec: dogodki.find((d) => IZKLJUCITEV.includes(d.vrsta))?.minuta ?? null,
      dogodki,
    })
  }
  return out
}

/** Dresi vratarjev s prvaliga.rs: [Set domači, Set gostje] ali null. */
export function dresiVratarjev(html) {
  const s = besedilo(brezSkript(html))
  const deli = s.split(/Br\.\s*Igrač\s+Golovi\s+ŽK\s+CK\s+Izmena/).slice(1)
  if (deli.length < 4) return null
  // Kapetan-vratar je "89 ŽIVKOVIĆ Mladen (C) (G)".
  const vratarji = (del) => new Set([...del.matchAll(/(?:^|\s)(\d{1,3})\s+[^\d()]+?\s*(?:\(C\)\s*)?\(G\)/g)].map((m) => Number(m[1])))
  // Bloki: začetniki domačih, klop domačih, začetniki gostov, klop gostov.
  return [new Set([...vratarji(deli[0]), ...vratarji(deli[1])]), new Set([...vratarji(deli[2]), ...vratarji(deli[3])])]
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null pri prazni predlogi ali
 * če ena od ekip nima postave. `vratarji` = dresiVratarjev(...) ali null.
 */
export function vZapisnik(html, { id = null, url = null, vratarji = null } = {}) {
  const s = brezSkript(html)
  if (!/fss-rez__start/.test(s)) return null
  const glava = s.match(/class="fss-rez__title">\s*<span[^>]*>([\s\S]*?)<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/)
  const rez = s.match(/fss-rez__rez">\s*<div[^>]*><span>\s*(\d+)\s*<\/span><\/div>\s*<div[^>]*><span>\s*(\d+)\s*<\/span>/)
  if (!rez) return null
  const rezultat = { domaci: Number(rez[1]), gostje: Number(rez[2]) }
  const bloki = s.split(/class="col-md-6 fss-rez__oneteam"/).slice(1)
  if (bloki.length < 2) return null
  // Zadnji blok sega do noge strani; tam ni več `fss-rez__start`.
  const [zd, zg, rd = '', rg = ''] = bloki
  const ekipe = [
    { ime: besedilo(glava?.[1]), postava: igralciBloka(zd, true), rezerve: igralciBloka(rd, false) },
    { ime: besedilo(glava?.[2]), postava: igralciBloka(zg, true), rezerve: igralciBloka(rg, false) },
  ]
  if (ekipe.some((e) => !e.postava.length)) return null

  const opozorila = []
  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  ekipe.forEach((e, ekipaIdx) => {
    const gk = vratarji?.[ekipaIdx]
    for (const i of [...e.postava, ...e.rezerve]) {
      i.vratar = !!gk?.has(i.st)
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
    if (vratarji && ![...e.postava].some((i) => i.vratar)) opozorila.push(`${e.ime}: vratar začetne postave ni znan`)
  })
  if (!vratarji) opozorila.push('vratarjev ni (prvaliga.rs)')

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)

  const a = s.indexOf('fss-rez__info')
  const info = a < 0 ? '' : besedilo(s.slice(a, s.indexOf('fss-rez__oneteam', a)))
  const { datum } = datumUra(info)
  const krog = Number(info.match(/(\d+)\.\s*(?:kolo|коло)/i)?.[1]) || null
  const p = info.match(/Poluvreme:\s*(\d+)\s*-\s*(\d+)/)

  const vObliko = ({ dogodki: _d, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: sezonaIzDatuma(datum),
    krog,
    datum,
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

/**
 * Nastopi: začetnik od 0 do izstopa (ali rdečega ali 90), rezerva od vstopa
 * do izstopa (ali rdečega ali 90). Rezerva brez vstopa ni nastopila.
 */
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
        zgreseneEnajstmetrovke: moji(z.zgresene).length,
        rumeni: moji(z.rumeni).length,
        rdeci: i.rdec != null ? 1 : 0,
        prejetiGoli: prejeti,
        // Kot pri drugih virih: čisto mrežo ima, kdor ni prejel gola (uvoz
        // jo za točke omeji na dovolj minut).
        cleanSheet: prejeti === 0,
      })
    }
  }
  return out
}

// --- prenos ------------------------------------------------------------------

const starostDni = (datum, danes = Date.now()) =>
  datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0

async function stranLige(koda, prenesi) {
  const html = await prenesi(naslovLige(koda), imeLige(koda), true)
  if (!jeStranLige(html))
    throw new Error(`fss: ${naslovLige(koda)} ni stran lige (${String(html ?? '').length} B) — uvoz ustavljen`)
  return html
}

const vir = {
  ime: 'fss',
  polnoIme: 'Fudbalski savez Srbije (fss.rs)',
  drzava: 'RS',
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
    for (const t of tekmeStrani(html).filter((x) => x.id && x.izid)) {
      const url = naslovIzvestaja(t.id)
      const star = starostDni(t.datum)
      const sveze = star <= 3
      // Brez prvaliga.rs je zapisnik še vedno dober, le vratar ni znan.
      let vratarji = null
      try {
        vratarji = dresiVratarjev(await prenesi(naslovVratarjev(t.id), imeVratarjev(koda, t.id), sveze))
      } catch (e) {
        console.warn(`fss: vratarji ${t.id}: ${e.message}`)
      }
      let z = vZapisnik(await prenesi(url, imeIzvestaja(koda, t.id), sveze), { id: t.id, url, vratarji })
      if (!z && !sveze && star <= 45) z = vZapisnik(await prenesi(url, imeIzvestaja(koda, t.id), true), { id: t.id, url, vratarji })
      if (!z) continue
      // Ime kluba in krog s strani lige, da se tekma ujame z razporedom.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = sezonaIzDatuma(t.datum) ?? z.sezona
      z.datum ??= t.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid na strani lige ${t.izid.domaci}:${t.izid.gostje}`)
      out.push({ id: t.id, z, url })
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
