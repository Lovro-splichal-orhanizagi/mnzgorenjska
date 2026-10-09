// Vir: Hrvatski nogometni savez — HNS Semafor (semafor.hns.family).
//
// Semafor prikazuje podatke iz COMET-a, sistema, v katerem HNS in vse
// županijske zveze (ŽNS, NS) vodijo tekmovanja — od HNL do III. ŽNL. Zapisnik
// je enak na vseh ravneh: postavi s številko dresa in stalno šifro osebe
// (`data-personid`), vratar je označen, dogodki (gol, 11 m, avtogol, karton,
// menjava) so pri igralcu z minuto. Pozicij razen vratarja ni, zato
// hrvaške lige kot slovenske čakajo na glasovanje o pozicijah.
//
// Šifra lige je id tekmovanja na Semaforju (`/natjecanja/<id>/…`). Vsaka
// sezona je svoje tekmovanje s svojim id-jem; seznam po sezoni in zvezi
// izpiše `node scripts/hrvaske-lige.mjs`.
//
// Stran tekmovanja nosi ves razpored (vrstice `data-round`, `data-match`),
// stran tekme pa zapisnik. Podatki so javni (HNS jih objavlja v javnem
// interesu), izrecnega dovoljenja nimamo — beremo odkrito, počasi in le nove
// tekme, vir pa navedemo na vsaki strani.
import { nastopi as skupniNastopi } from '../zapisnik.mjs'
import { razpakiraj } from '../klubi.mjs'
import { vPriimekIme } from './sportnet.mjs'

const OSNOVNI = 'https://semafor.hns.family'
// Enako kot v zapisnik.mjs: sodniški podaljšek se ne šteje.
const DOLZINA_TEKME = 90

export function razbijKodo(koda) {
  const id = String(koda ?? '').trim()
  if (!/^\d+$/.test(id)) throw new Error(`hns: šifra lige je id tekmovanja na Semaforju (število), ne "${koda}"`)
  return { id }
}

const naslovTekmovanja = (koda) => `${OSNOVNI}/natjecanja/${razbijKodo(koda).id}/x/`
const naslovTekme = (id) => `${OSNOVNI}/utakmice/${id}/x/`

/** "03.10.2026. 15:00" → { datum: '2026-10-03', ura: '15:00' }. */
export function datumUra(s) {
  const m = String(s ?? '').match(/(\d{2})\.(\d{2})\.(\d{4})\.?(?:\s+(\d{1,2}:\d{2}))?/)
  if (!m) return { datum: null, ura: null }
  return { datum: `${m[3]}-${m[2]}-${m[1]}`, ura: m[4] ? m[4].padStart(5, '0') : null }
}

/** Sezona iz datuma tekme: od julija naprej je nova ("2026-10-03" → "2026/27"). */
export function sezonaIzDatuma(datum) {
  const m = String(datum ?? '').match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  const leto = Number(m[2]) >= 7 ? Number(m[1]) : Number(m[1]) - 1
  return `${leto}/${String((leto + 1) % 100).padStart(2, '0')}`
}

/** "67'" → 67, "45+2'" → 45, "90+3'" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)(?:\s*\+\s*\d+)?\s*'/)
  if (!m) return null
  return Math.min(Number(m[1]), DOLZINA_TEKME)
}

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))

// Isto ime, drug klub. Semafor da istoimenskim klubom različnih županij
// večinoma oznako ("NK Tomislav (DA)", "NK Polet (SK)"), ne pa vedno: "NK
// Ponikve" je klub iz Zagreba in klub iz Stona. Klub je v bazi enoličen po
// imenu znotraj države, zato je uvoz oba vpisal v isti zapis (grb, stran
// kluba, navijači so si jih delili). Kot pri oefb (`IME_DRUSTVA`) enega
// preimenujemo po stalni šifri kluba na Semaforju (`data-id` v razporedu,
// `/klubovi/<id>/`); drugi ostane, kot je. Pregled vseh 82 lig in arhivov
// (9. 10. 2026) je našel teh šest; zapise je razdelila migracija
// 20261009235300. Nov trk izpiše `node scripts/hrvaske-lige.mjs` — dodaj ga
// sem, PREDEN se liga uvozi, in le klub, ki v bazi še nima zapisa s tem imenom.
export const IME_KLUBA = {
  617: 'NK Ponikve (Zagreb)', // "NK Ponikve" ostane klub iz Stona (1017)
  2573: 'NK Polet (Skrad)', // "NK Polet (SK)" ostane Sveta Klara (605)
  1329: 'NK Sveti Đurađ (Virovitica)', // "NK Sveti Đurađ" ostane Donji Miholjac (762)
  209: 'NK Dragovoljac (Poličnik)', // "NK Dragovoljac" ostane Bočkovec (943)
  178362: 'NK Borac (Novo Selo)', // "NK Borac" ostane Imbriovec (955)
  40074: 'NK Podravac (Sesvete Ludbreške)', // "NK Podravac" ostane Virje (917)
}

/** Ime kluba za bazo: trk imen razreši šifra kluba na Semaforju. */
export const imeKluba = (ime, id) => IME_KLUBA[id] ?? ime

/** Vrstice razporeda s strani tekmovanja — vsaka tekma enkrat. */
export function vrsticeRazporeda(html) {
  const blok = html.slice(Math.max(0, html.indexOf('current_results')))
  const tekme = new Map()
  const re = /<li class="row[^"]*" data-round="(\d+)" data-match="(\d+)">([\s\S]*?)<div class="link/g
  for (const m of blok.matchAll(re)) {
    const [, krog, id, v] = m
    if (tekme.has(id)) continue
    const klub = (k) => v.match(new RegExp(`<div class="${k}"(?: data-id="(\\d+)")?[^>]*><a[^>]*>([^<]*)`))
    const ime = (k) => {
      const x = klub(k)
      return x ? imeKluba(besedilo(x[2]), x[1]) : ''
    }
    const r1 = v.match(/<div class="res1">([^<]*)</)?.[1]?.trim()
    const r2 = v.match(/<div class="res2">([^<]*)</)?.[1]?.trim()
    const { datum, ura } = datumUra(v.match(/<div class="date">([^<]*)</)?.[1])
    const odigrana = /^\d+$/.test(r1 ?? '') && /^\d+$/.test(r2 ?? '')
    tekme.set(id, {
      id,
      krog: Number(krog),
      datum,
      ura,
      domaci: ime('club1'),
      gostje: ime('club2'),
      domaciId: klub('club1')?.[1] ?? null,
      gostjeId: klub('club2')?.[1] ?? null,
      izid: odigrana ? { domaci: Number(r1), gostje: Number(r2) } : null,
    })
  }
  return [...tekme.values()].filter((t) => t.domaci && t.gostje)
}

/**
 * Kontumacija: Semafor pri dodeljeni zmagi (3:0) vnese postavo le ekipe, ki je
 * prišla, druga ostane prazna (Mladost Molve : Prugovac, kc-elitna 23. 8. 2026).
 * Taka tekma zapisnika nikoli ne dobi, zato jo razpored označi, da je preverba
 * in borza ne čakata, izid pa vzame iz razporeda.
 */
const mozna3do0 = (izid) => !!izid && Math.min(izid.domaci, izid.gostje) === 0 && Math.max(izid.domaci, izid.gostje) === 3

export function jeKontumacija(html, izid) {
  if (!mozna3do0(izid)) return false
  const sestava = html.slice(Math.max(0, html.indexOf('matchLineup')))
  const iDoma = sestava.indexOf('homeTeam playerslist')
  const iGost = sestava.indexOf('awayTeam playerslist')
  if (iDoma < 0 || iGost < 0) return false
  const stej = (blok) => (blok.match(/class="row match_lineup"/g) ?? []).length
  const doma = stej(sestava.slice(iDoma, iGost))
  const gost = stej(sestava.slice(iGost))
  if ((doma === 0) !== (gost === 0)) return true
  return premaloIgralcev(sestava.slice(iDoma, iGost), sestava.slice(iGost))
}

// Tekma se ne sme začeti, če ima ekipa manj kot sedem igralcev (17 pravil
// igre, 3. pravilo).
const NAJMANJ_IGRALCEV = 7

/**
 * Ekipa je prišla s premalo igralci: Semafor vnese obe postavi, ena ima manj
 * kot sedem začetnikov, dogodkov ni nobenega, izid je dodeljen 3:0 (NK
 * Suhopolje : NK Crnac, Premijer ŽNL Virovitica 9. 5. 2026, Crnac s šestimi).
 * Tekma ni bila odigrana — vsi bi sicer dobili 90 minut in čisto mrežo.
 * Klicatelj preveri izid (3:0).
 */
function premaloIgralcev(blokDoma, blokGost) {
  const ekipi = [igralciEkipe(blokDoma), igralciEkipe(blokGost)]
  const zacetnikov = ekipi.map((e) => e.postava.length)
  if (Math.min(...zacetnikov) === 0 || Math.min(...zacetnikov) >= NAJMANJ_IGRALCEV) return false
  const goli = ekipi.flatMap((e) => [...e.postava, ...e.rezerve]).flatMap((i) => i.dogodki)
    .filter((d) => d.vrsta === 'goal' || d.vrsta === 'penalty' || d.vrsta === 'own_goal')
  return goli.length === 0
}

/**
 * Obe postavi prazni, izid 3:0 — kontumacija, pri kateri Semafor ne vnese
 * nobene postave (NK Sunjski : Posavina, hr-sm-2-znl 27. 9. 2026). Sama po
 * sebi bi bila to lahko tudi tekma z zamujenim zapisnikom, zato jo za
 * kontumacijo štejemo šele teden dni po tekmi (glej `razporedVseStrani`).
 */
export function brezPostav(html, izid) {
  if (!mozna3do0(izid)) return false
  const sestava = String(html ?? '').slice(Math.max(0, String(html ?? '').indexOf('matchLineup')))
  return sestava.includes('homeTeam playerslist') && !/class="row match_lineup"/.test(sestava)
}

/** Igralci ene ekipe (blok `homeTeam` ali `awayTeam`) z dogodki. */
function igralciEkipe(blok) {
  const [zacetni, ostalo = ''] = blok.split('Pričuvni igrači')
  const rezerve = ostalo.split('separatorTitle">Trener')[0]
  const beri = (del, rezerva) =>
    // Vrstica igralca ima v sebi seznam dogodkov (<li>), zato jih ločimo po
    // začetku naslednje vrstice, ne po </li>.
    del
      .split('<li class="row match_lineup" data-personid="')
      .slice(1)
      .map((kos) => {
        const id = kos.match(/^(\d+)"/)?.[1]
        const v = kos
        // Trener ima isto vrstico, a povezavo na /treneri/.
        const ime = v.match(/<h3><a href="[^"]*\/igraci\/[^"]*">([^<]+)<\/a>([^<]*)<\/h3>([^<]*)/)
        if (!ime) return null
        const dogodki = [...v.matchAll(/<li class="([a-z_A-Z]+)"><div class="icon"[^>]*><\/div>([^<]*)<\/li>/g)].map(
          ([, vrsta, cas]) => ({ vrsta, minuta: minuta(cas) }),
        )
        return {
          personId: Number(id),
          st: Number(v.match(/<div class="shirtNumber">\s*(\d+)/)?.[1]) || null,
          ime: vPriimekIme(razpakiraj(ime[1])),
          vratar: /Vratar/.test(ime[3]),
          kapetan: /\(C\)/.test(ime[2]),
          rezerva,
          dogodki,
        }
      })
      .filter(Boolean)
  return { postava: beri(zacetni, false), rezerve: beri(rezerve, true) }
}

/**
 * Stran tekme v obliko zapisnika, kot jo dajo slovenski viri.
 * Vrne null, če tekma nima izida ali postav (zapisnik še ni vnesen) ali je
 * kontumacija (glej `jeKontumacija`).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const glava = html.slice(html.indexOf('matchHeader'), html.indexOf('matchLineup'))
  const r1 = glava.match(/<li class="res1">\s*(\d+)\s*</)?.[1]
  const r2 = glava.match(/<li class="res2">\s*(\d+)\s*</)?.[1]
  if (r1 == null || r2 == null) return null
  const ime = (k) => besedilo(glava.match(new RegExp(`<li class="${k}">[\\s\\S]*?<div class="title">([^<]*)<`))?.[1])
  const naslov = besedilo(glava.match(/<div class="competition-title"><h2>([\s\S]*?)<\/h2>/)?.[1])
  const { datum } = datumUra(glava.match(/<div class="facility">([^<]*)</)?.[1])

  const sestava = html.slice(html.indexOf('matchLineup'))
  const iDoma = sestava.indexOf('homeTeam playerslist')
  const iGost = sestava.indexOf('awayTeam playerslist')
  if (iDoma < 0 || iGost < 0) return null
  const ekipe = [
    { ime: ime('club1'), ...igralciEkipe(sestava.slice(iDoma, iGost)) },
    { ime: ime('club2'), ...igralciEkipe(sestava.slice(iGost)) },
  ]
  if (ekipe.some((e) => !e.postava.length)) return null
  // Kontumacija s postavama (ekipa s premalo igralci) zapisnika nima.
  if (mozna3do0({ domaci: Number(r1), gostje: Number(r2) }) &&
    premaloIgralcev(sestava.slice(iDoma, iGost), sestava.slice(iGost))) return null

  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  ekipe.forEach((e, ekipaIdx) => {
    for (const i of [...e.postava, ...e.rezerve]) {
      const kdo = { ekipaIdx, st: i.st, ime: i.ime }
      for (const d of i.dogodki) {
        const z = { ...kdo, minuta: d.minuta }
        if (d.vrsta === 'goal') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
        else if (d.vrsta === 'penalty') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
        else if (d.vrsta === 'own_goal') goli.push({ ...z, avtogol: true, enajstmetrovka: false })
        else if (d.vrsta === 'penalty_failed') zgresene.push(z)
        else if (d.vrsta === 'yellow') rumeni.push(z)
        // Drugi rumeni je izključitev: igralec je od tam naprej zunaj.
        else if (d.vrsta === 'red' || d.vrsta === 'second_yellow') rdeci.push(z)
        // Semafor menjave ne poveže v par (kdo za koga) — pove le, kdaj je
        // kdo prišel in kdo šel. Minutam igralca to zadošča.
        else if (d.vrsta === 'substitutionIn')
          menjave.push({ ekipaIdx, minuta: d.minuta, noter: { st: i.st, ime: i.ime }, ven: { st: null, ime: null } })
        else if (d.vrsta === 'substitutionOut')
          menjave.push({ ekipaIdx, minuta: d.minuta, ven: { st: i.st, ime: i.ime }, noter: { st: null, ime: null } })
      }
    }
  })

  const rezultat = { domaci: Number(r1), gostje: Number(r2) }
  // Avtogol šteje nasprotniku; brez tega bi preverba izida lagala.
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  const opozorila = []
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)

  const brez = ({ dogodki, personId, ...i }) => ({ ...i, regSt: personId, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: sezonaIzDatuma(datum),
    krog: Number(naslov.match(/(\d+)\.\s*kolo/)?.[1]) || null,
    datum,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(brez), rezerve: ekipe[0].rezerve.map(brez) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(brez), rezerve: ekipe[1].rezerve.map(brez) },
    rezultat,
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

// --- grbi klubov -------------------------------------------------------------
//
// Glava strani tekme (`matchHeader`) ima `<li class="club1">` (domači) in
// `<li class="club2">` (gostje), vsak z `<div class="logo"><img src alt>` in
// `<div class="title">`. Stran ima še na desetine drugih slik (fotografije
// igralcev pod istim `images_comet`, sponzorji), zato beremo samo ta dva
// elementa in stran določi MESTO v glavi, ne `alt`: ime v bazi je lahko
// drugačno od imena na Semaforju.

const GRBI_COMET = /^https?:\/\/(?:www\.)?hns\.family\/files\/images_comet\//

/** Grba domačih in gostov z glave strani tekme: { domaci, gostje }, vsak { src, ime } ali null. */
export function grbiTekme(html) {
  const s = String(html ?? '')
  const zacetek = s.indexOf('matchHeader')
  if (zacetek < 0) return { domaci: null, gostje: null }
  const konec = s.indexOf('matchLineup', zacetek)
  const glava = s.slice(zacetek, konec < 0 ? undefined : konec)
  const beri = (k) => {
    const li = glava.match(new RegExp(`<li class="${k}">([\\s\\S]*?)</li>`))?.[1]
    // Klub brez grba: Semafor izriše `<div class="logo nologo"></div>` brez
    // slike (NK Miholjac, utakmice/114701216, 10/2026).
    if (!li || /class="logo[^"]*\bnologo\b/.test(li)) return null
    const src = razpakiraj(li.match(/<div class="logo">\s*<img[^>]*\ssrc="([^"]*)"/)?.[1] ?? '')
    const ime = besedilo(li.match(/<div class="title">([^<]*)</)?.[1])
    return src ? { src, ime } : null
  }
  return { domaci: beri('club1'), gostje: beri('club2') }
}

/**
 * Ali naslov NI grb kluba: prazen, zunaj COMET-ove mape slik (logotip HNS,
 * sponzor, `/static/...` privzeta slika) ali z imenom privzete slike.
 *
 * Semafor nadomestne slike ne riše: klub brez grba ima v glavi
 * `logo nologo` brez <img> (to ujame že `grbiTekme`). Pregled 7. 10. 2026
 * (192 klubov 15 lig na roko, nato načrt za vseh 965 klubov) je našel en
 * tak klub in nobene slike, ki bi si jo delilo več klubov; tudi
 * `images_comet/Club/<id>_…` je pravi grb (Mladost Molve, Hrvatski
 * Leskovac), ne nadomestek. To pravilo in `deljeniGrbi` sta varovalki, če
 * COMET nadomestek kdaj uvede.
 */
export function jeNadomestniGrb(src) {
  const u = String(src ?? '').trim()
  if (!GRBI_COMET.test(u)) return true
  return /(?:default|placeholder|no[-_]?logo|no[-_]?image|nema[-_]?grba|blank|empty)[^/]*$/i.test(u)
}

/**
 * Izvirnik pomanjšanega grba: COMET hrani naloženo sliko, `_resized/…_80_80_wg`
 * je izpeljanka. Drugih velikosti (`_256_256_wg` …) ni (404), izvirnik pa je
 * 200–300 px. Vrne null, če naslov ni pomanjšana COMET-ova slika.
 */
export function izvirnikGrba(src) {
  const u = String(src ?? '')
  if (!GRBI_COMET.test(u)) return null
  const m = u.match(/^(.*)\/_resized\/([^/]+?)_\d+_\d+_[a-z_]+(\.[a-z]+)$/i)
  return m ? `${m[1]}/${m[2]}${m[3]}` : null
}

/**
 * Ključi (naslov ali zgoščena vsebina), ki jih ima več RAZLIČNIH klubov —
 * privzeta slika, ki jo COMET da klubu brez grba. Takega grba ne shranimo.
 *
 * @param {{ klub: unknown, kljuc: string }[]} pari
 */
export function deljeniGrbi(pari) {
  const klubi = new Map()
  for (const { klub, kljuc } of pari) {
    if (!kljuc) continue
    if (!klubi.has(kljuc)) klubi.set(kljuc, new Set())
    klubi.get(kljuc).add(klub)
  }
  return new Set([...klubi].filter(([, k]) => k.size > 1).map(([kljuc]) => kljuc))
}

/** Nastopi s šifro osebe — igralca prepoznamo po njej, ne po imenu. */
export function nastopi(z) {
  return skupniNastopi(z).map((n) => {
    const e = n.ekipaIdx === 0 ? z.domaci : z.gostje
    const i = [...e.postava, ...e.rezerve].find((x) => x.st === n.st && x.ime === n.ime)
    return { ...n, regSt: i?.regSt ?? null, pozicija: i?.pozicija ?? null }
  })
}

// Ključ kluba: male črke s šumniki (tudi ć, đ, ki jih slovenski `poenostavi`
// zavrže). Isti klub Semafor piše enako v razporedu in zapisniku, med
// sezonami pa ime le redko zamenja sponzor.
export const kljucKlubaHr = (ime) =>
  razpakiraj(ime)
    .toLowerCase()
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

// Kratko ime: brez oblike društva (NK, HNK, GNK …) in letnice, največ dve
// besedi kraja ali imena. "NK Zelengaj 1948" → "Zelengaj", "NK Polet (SK)" →
// "Polet SK", "NK Mladost Zabok" → "Mladost Zabok".
const OBLIKE_HR = new Set(['nk', 'hnk', 'gnk', 'šnk', 'nšk', 'mnk', 'onk', 'rnk', 'snk', 'znk', 'hnšk', 'hšk', 'ink',
  'hask', 'nogometni', 'klub', 'sdd', 'šk', 'sk.', 'fc', 'hnd', 'nd'])
export function kratkoImeHr(polno) {
  const besede = razpakiraj(polno)
    .replace(/[()"]/g, ' ')
    .split(/\s+/)
    .filter((b) => b && !/^\d{2,4}\.?$/.test(b) && !OBLIKE_HR.has(b.toLowerCase()))
  const ime = besede.slice(0, 2).join(' ')
  return ime.length >= 2 ? ime : razpakiraj(polno)
}

/**
 * Glava strani tekme šifre kluba nima, zato preimenovani klub (`IME_KLUBA`)
 * dobi ime iz vrstice razporeda — sicer bi razpored tekmo vpisal enemu
 * klubu, zapisnik pa drugemu. Ostala imena ostanejo, kot jih piše glava.
 */
export function sImenomIzRazporeda(z, t) {
  if (IME_KLUBA[t.domaciId]) z.domaci.ime = t.domaci
  if (IME_KLUBA[t.gostjeId]) z.gostje.ime = t.gostje
  return z
}

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

const vir = {
  ime: 'hns',
  polnoIme: 'Hrvatski nogometni savez (semafor.hns.family)',
  drzava: 'HR',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 500,
  imaRegistracije: false,

  naslovRazporeda: naslovTekmovanja,
  naslovZapisnika: (_koda, sifra) => naslovTekme(sifra),

  async razporedVseStrani(koda, prenesi) {
    const html = await prenesi(naslovTekmovanja(koda), `natjecanje-${razbijKodo(koda).id}.html`, true)
    const krogi = new Map()
    for (const t of vrsticeRazporeda(html)) {
      if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
      // Le 3:0 / 0:3 je lahko kontumacija; stran tekme je v predpomnilniku
      // (prebere jo tudi uvoz zapisnikov), zato to ne pomeni novih zahtevkov.
      let kontumacija = false
      if (mozna3do0(t.izid)) {
        const ime = `tekma-${t.id}.html`
        let stran = await prenesi(naslovTekme(t.id), ime)
        kontumacija = jeKontumacija(stran, t.izid)
        // Prazna stran v predpomnilniku je lahko starejša od zapisnika: preden
        // tekmo razglasimo za kontumacijo, jo preberemo znova.
        if (!kontumacija && brezPostav(stran, t.izid) && starostDni(t.datum) > 7) {
          stran = await prenesi(naslovTekme(t.id), ime, true)
          kontumacija = jeKontumacija(stran, t.izid) || brezPostav(stran, t.izid)
        }
      }
      // `odigrana`: Semafor pokaže izid ("- : -" je neodigrana). Tekma, ki jo
      // zveza prestavi brez novega datuma (Mladost 1977 : Vatrogasac, 6. 9.
      // 2026), ostane pri starem datumu brez izida — preverba je ne javlja.
      krogi.get(t.krog).tekme.push({
        domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija, odigrana: !!t.izid,
        ...(kontumacija ? { izid: t.izid } : {}),
      })
    }
    return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
  },

  async zapisniki(koda, prenesi) {
    const html = await prenesi(naslovTekmovanja(koda), `natjecanje-${razbijKodo(koda).id}.html`, true)
    const out = []
    for (const t of vrsticeRazporeda(html).filter((x) => x.izid)) {
      const url = naslovTekme(t.id)
      const ime = `tekma-${t.id}.html`
      // Tekma v predpomnilniku brez postav (zapisnik še ni bil vnesen) se
      // prebere znova; popolna se ne spreminja več.
      let z = vZapisnik(await prenesi(url, ime), { id: t.id, url })
      // Znova le tekmo zadnjih 45 dni: starejša brez postav je kontumacija
      // ali zveza zapisnikov ne vnaša — vsako uro bi jih sicer brali na
      // stotine zastonj. Deset dni je bilo premalo: zveze zapisnik vnesejo
      // tudi mesec dni pozneje (NK Sokol : Nacional, hr-sm-1-znl, tekma
      // 6. 9., zapisnik po 18. 9.) in tak ni prišel nikoli.
      if (!z && starostDni(t.datum) <= 45) z = vZapisnik(await prenesi(url, ime, true), { id: t.id, url })
      if (z) out.push({ id: z.zapisnikId, z: sImenomIzRazporeda(z, t), url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaHr,
  kratkoIme: kratkoImeHr,
  poenostavi: kljucKlubaHr,
}

export default vir
