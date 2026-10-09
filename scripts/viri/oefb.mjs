// Vir: Österreichischer Fußball-Bund — oefb.at (Ligen & Bewerbe).
//
// ÖFB in vseh devet deželnih zvez (KFV, StFV, SFV …) vodijo tekmovanja v
// istem sistemu in oefb.at jih prikaže vsa, od Regionallige do najnižje
// Klasse. Strani so izrisane z JavaScriptom, podatki pa so v strani kot JSON
// (`SG.container.appPreloads['…']=[{…}];`), zato beremo JSON, ne HTML.
//
// Razpored: `/bewerbe/Bewerb/Spielplan/<id>/` — `ergebnisse` (odigrane in
// minule) in `spiele` (prihodnje), vsaka tekma z `runde`, `anstoss` (ms),
// `ergebnis` ("2:0 (1:0)" ali "-:- (-:-)") in povezavo na tekmo.
// "Neuaustragung" je razveljavljena tekma, ki se ponovi; ponovitev je svoja
// vrstica z istim krogom, zato prvotno izpustimo. Kontumacija ima izid
// (3:0 (0:0)) in namesto povezave na zapisnik oznako "strafverifiziert".
//
// Zapisnik: `/bewerbe/Spiel/Spielbericht/<id>/` — `heimAufstellung` in
// `gastAufstellung` (začetniki v skupinah `tor`/`abwehr`/`mittelfeld`/`sturm`
// ali vsi v `weitere`, klop v `ersatz`), stalna šifra igralca
// (`/Profile/Spieler/<id>` → `reg_st`) in `gameData` z dogodki: `goal`
// (`eigentor`, `hinweis: "Strafstoß"`), `playerchange` (primary noter,
// secondary ven), `card-yellow`, `card-yellow-red`, `card-red`. Minuta je v
// `minuteString` ("67", "HZ" = polčas, "90+5"); `minute` je časovnica z
// odmorom in je ne uporabljamo.
//
// POZICIJE: klub postavo vnese po skupinah ali brez njih, in to vsak klub
// zase (na isti tekmi ena ekipa s skupinami, druga brez). Kjer so skupine,
// so pozicija (GK/DEF/MID/FWD); kjer jih ni, je vratar označen z dresom "T"
// (rezervni "ET") — takrat le namig za vratarja kot pri mlsz, ostali čakajo
// na glasovanje.
//
// Šifra lige je id tekmovanja (Bewerb), npr. `226828` (Kärntner Liga
// 2025/26). Vsaka sezona je svoje tekmovanje; seznam sezon da stran
// tekmovanja (`saisonen`).
//
// robots.txt splošnim robotom branje dovoli (prepove /blueContent/, slike,
// /Suche). Slike (grbe) beremo le z dovoljenjem ÖFB, glej grbi-oefb.mjs. Beremo odkrito in počasi (1,5 s med stranmi), popolnih zapisnikov
// ne beremo znova. Če se kdaj pojavi izziv ali CAPTCHA, se ustavi — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { minuteIzPreklopov } from './facr.mjs'

const OSNOVNI = 'https://www.oefb.at'
// Enako kot v zapisnik.mjs: sodniški podaljšek se ne šteje.
const DOLZINA_TEKME = 90

export function razbijKodo(koda) {
  const id = String(koda ?? '').trim()
  if (!/^\d+$/.test(id)) throw new Error(`oefb: šifra lige je id tekmovanja (Bewerb, število), ne "${koda}"`)
  return { id }
}

export const naslovRazporeda = (koda) => `${OSNOVNI}/bewerbe/Bewerb/Spielplan/${razbijKodo(koda).id}/`
export const naslovTekme = (id) => `${OSNOVNI}/bewerbe/Spiel/Spielbericht/${id}/`
// Grb (logo) kluba: id slike iz razporeda; strežnik jo pomanjša na želeno
// velikost. Pot /oefb2/images/ robots.txt splošnim robotom prepove — beremo jo
// le z izrecnim dovoljenjem ÖFB (scripts/grbi-oefb.mjs).
export const naslovGrba = (id, px = 256) => `${OSNOVNI}/oefb2/images/1278650591628556536_${id}-1,0-${px}x${px}-${px}x${px}.png`
const imeRazporeda = (koda) => `spielplan-${razbijKodo(koda).id}.html`
const imeTekme = (id) => `spiel-${id}.html`

/** Vsi JSON-i `appPreloads` na strani. */
export function predhodniPodatki(html) {
  const out = []
  for (const m of String(html ?? '').matchAll(/appPreloads\['[^']*'\]=(\[.*?\]);\s*$/gm)) {
    try {
      out.push(JSON.parse(m[1])[0])
    } catch {
      // drug skript v isti vrstici — ni naš
    }
  }
  return out.filter((x) => x && typeof x === 'object')
}

/** Čas začetka (ms) → { datum, ura } po dunajskem času. */
export function datumUra(ms) {
  if (!Number.isFinite(ms)) return { datum: null, ura: null }
  const s = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ms))
  const [datum, ura] = s.split(' ')
  return { datum, ura }
}

/** Sezona iz datuma tekme: od julija naprej je nova ("2026-10-03" → "2026/27"). */
export function sezonaIzDatuma(datum) {
  const m = String(datum ?? '').match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  const leto = Number(m[2]) >= 7 ? Number(m[1]) : Number(m[1]) - 1
  return `${leto}/${String((leto + 1) % 100).padStart(2, '0')}`
}

/** "67" → 67, "HZ" (polčas) → 45, "45+2" → 45, "90+5" → 90, "93" in "SE" (po koncu) → 90. */
export function minuta(s) {
  const t = String(s ?? '').trim()
  if (/^HZ$/i.test(t)) return 45
  if (/^SE$/i.test(t)) return DOLZINA_TEKME
  const m = t.match(/^(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "2:0 (1:0)" → { rezultat, polcas }; "-:- (-:-)" → null. */
export function izid(s) {
  const m = String(s ?? '').match(/^\s*(\d+)\s*:\s*(\d+)(?:\s*\(\s*(\d+)\s*:\s*(\d+)\s*\))?/)
  if (!m) return null
  return {
    rezultat: { domaci: Number(m[1]), gostje: Number(m[2]) },
    polcas: m[3] != null ? { domaci: Number(m[3]), gostje: Number(m[4]) } : null,
  }
}

const idIzPovezave = (url) => String(url ?? '').match(/\/Profile\/Spieler\/(\d+)/)?.[1] ?? null
const idTekme = (t) =>
  [t.spielbericht, t.actionLink, ...(t.links ?? []).map((l) => l.link)]
    .map((u) => String(u ?? '').match(/oefb\.at\/bewerbe\/Spiel\/(?:[A-Za-z-]+\/)?(\d+)\//)?.[1])
    .find(Boolean) ?? null

// --- razpored ----------------------------------------------------------------

// Razpored piše kratko ime kraja, zato imata dva različna kluba iz dveh dežel
// lahko isto ime ("Rust" je na Gradiščanskem in v Spodnji Avstriji). Klub je
// v bazi enoličen po imenu znotraj države, zato enega preimenujemo — po šifri
// društva iz povezave `vereine.oefb.at/<društvo>/`, ki je stalna. Koroški in
// štajerski klubi (lige, vpisane prve) ohranijo ime. Pregled vseh lig
// odraslih 2026/27 (9. 10. 2026) je našel teh šest trkov; nov trk dodaj sem.
const IME_DRUSTVA = {
  SCFreistadtRust: 'Rust (Bgld.)',
  RustSv: 'Rust (NÖ)',
  UfcMannersdorf: 'Mannersdorf (Bgld.)',
  MannersdorfAsk: 'Mannersdorf (NÖ)',
  SCSparkasseGmuend: 'Gmünd (NÖ)',
  UnionReichenauOttenschlagHaibach: 'Reichenau (OÖ)',
  SportfreundeBerg: 'Berg (NÖ)',
  FC_Pischelsdorf: 'Pischelsdorf (OÖ)',
}

/** Ime ekipe iz vrstice razporeda; trk imen razreši šifra društva. */
export function imeEkipe(ime, url) {
  const drustvo = String(url ?? '').match(/vereine\.oefb\.at\/([^/]+)\//)?.[1]
  return IME_DRUSTVA[drustvo] ?? razpakiraj(ime ?? '')
}

/** Podatki razporeda s strani Spielplan (objekt z `ergebnisse` in `spiele`). */
function podatkiRazporeda(html) {
  return predhodniPodatki(html).find((x) => Array.isArray(x.ergebnisse) && Array.isArray(x.spiele)) ?? null
}

/** Vse tekme lige, vsaka enkrat, brez razveljavljenih (Neuaustragung). */
export function vrsticeRazporeda(html) {
  const p = podatkiRazporeda(html)
  if (!p) return []
  const out = []
  const videne = new Set()
  for (const t of [...p.ergebnisse, ...p.spiele]) {
    if (t.status === 'Neuaustragung') continue
    const id = idTekme(t)
    if (id && videne.has(id)) continue
    if (id) videne.add(id)
    const { datum, ura } = datumUra(t.anstoss)
    out.push({
      id,
      krog: Number(t.runde) || null,
      datum,
      ura,
      domaci: imeEkipe(t.heimMannschaft, t.heimMannschaftUrl),
      gostje: imeEkipe(t.gastMannschaft, t.gastMannschaftUrl),
      grbDomaci: t.heimMannschaftLogo || null,
      grbGostje: t.gastMannschaftLogo || null,
      izid: izid(t.ergebnis)?.rezultat ?? null,
      status: t.status ?? null,
      // Kontumacija: namesto povezave na zapisnik "strafverifiziert" (#).
      kontumacija: (t.links ?? []).some((l) => /strafverifiziert/i.test(l.bezeichnung ?? '')),
    })
  }
  return out
}

// --- zapisnik ----------------------------------------------------------------

const SKUPINE = { tor: 'GK', abwehr: 'DEF', mittelfeld: 'MID', sturm: 'FWD', weitere: null }

/** "Elias Pitterka" s priimkom "Pitterka" → "Pitterka Elias" (uvoz bere "Priimek Ime"). */
export function priimekIme(polno, priimek) {
  const ime = razpakiraj(polno ?? '').trim()
  const p = razpakiraj(priimek ?? '').trim()
  if (!p || !ime.endsWith(p) || ime === p) return ime
  return `${p} ${ime.slice(0, -p.length).trim()}`
}

/** Igralci ene ekipe iz `heimAufstellung` / `gastAufstellung`. */
function igralciEkipe(a) {
  const igralec = (x, rezerva, pozicija) => {
    const dres = String(x.rueckennummer ?? '').trim()
    return {
      st: /^\d+$/.test(dres) ? Number(dres) : null,
      dres,
      ime: priimekIme(x.name, x.nachname),
      polnoIme: razpakiraj(x.name ?? '').trim(),
      regSt: Number(idIzPovezave(x.url)) || null,
      rezerva,
      // "T" = Tormann, "ET" = Ersatztormann (ekipe brez skupin)
      vratar: pozicija === 'GK' || /^E?T$/i.test(dres),
      pozicija,
    }
  }
  const postava = []
  for (const [k, poz] of Object.entries(SKUPINE)) for (const x of a?.[k] ?? []) postava.push(igralec(x, false, poz))
  const rezerve = (a?.ersatz ?? []).map((x) => igralec(x, true, null))
  return { ime: razpakiraj(a?.vereinName ?? ''), postava, rezerve }
}

/** Kontumacija: izid je, postave vsaj ene ekipe pa ni. */
export function jeKontumacija(html) {
  const p = predhodniPodatki(html)
  const info = p.find((x) => x.spielUid)
  const r = izid(info?.ergebnis)?.rezultat
  if (!r || Math.min(r.domaci, r.gostje) !== 0 || Math.max(r.domaci, r.gostje) < 3) return false
  if (/strafverifiziert|nichtantritt|kampflos|forfait/i.test(String(info?.ergebnisZusatz ?? ''))) return true
  const a = p.find((x) => x.heimAufstellung)
  if (!a) return false
  return [a.heimAufstellung, a.gastAufstellung].some((e) => !igralciEkipe(e).postava.length)
}

/**
 * Stran Spielbericht v obliko zapisnika, kot jo dajo drugi viri.
 * Vrne null, če tekma nima izida ali ena od ekip nima postave.
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const p = predhodniPodatki(html)
  const info = p.find((x) => x.spielUid)
  const a = p.find((x) => x.heimAufstellung && x.gastAufstellung)
  const iz = izid(info?.ergebnis)
  if (!info || !a || !iz) return null
  const ekipe = [igralciEkipe(a.heimAufstellung), igralciEkipe(a.gastAufstellung)]
  ekipe[0].ime ||= razpakiraj(info.heimMannschaft ?? '')
  ekipe[1].ime ||= razpakiraj(info.gastMannschaft ?? '')
  if (ekipe.some((e) => !e.postava.length)) return null

  // Igralec dogodka: po šifri iz povezave, sicer po imenu v ekipi.
  const najdi = (ekipaIdx, url, ime) => {
    const vsi = [...ekipe[ekipaIdx].postava, ...ekipe[ekipaIdx].rezerve]
    const reg = Number(idIzPovezave(url)) || null
    const ime_ = razpakiraj(ime ?? '').trim()
    return (reg && vsi.find((i) => i.regSt === reg)) || (ime_ && vsi.find((i) => i.polnoIme === ime_)) || null
  }
  const kdo = (ekipaIdx, i, minutaM) => ({ ekipaIdx, st: i?.st ?? null, ime: i?.ime ?? null, regSt: i?.regSt ?? null, minuta: minutaM })

  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  const opozorila = []
  for (const d of a.gameData ?? []) {
    const ekipaIdx = d.team === 'a' ? 0 : d.team === 'b' ? 1 : null
    if (ekipaIdx == null) continue
    const m = minuta(d.minuteString)
    if (d.type === 'goal') {
      // Avtogol je pri ekipi, ki ga je dala (`team` je ekipa strelca).
      const avtogol = Boolean(d.eigentor)
      const i = najdi(ekipaIdx, d.url, d.playerPrimary)
      goli.push({ ...kdo(ekipaIdx, i, m), avtogol, enajstmetrovka: /strafsto|elfmeter/i.test(String(d.hinweis ?? '')) })
    } else if (d.type === 'playerchange') {
      const noter = najdi(ekipaIdx, d.url, d.playerPrimary)
      const ven = najdi(ekipaIdx, d.urlSecondary, d.playerSecondary)
      if (!noter && !ven) continue
      if (!noter || !ven) opozorila.push(`menjava v ${m}. minuti: ${!noter ? 'vstopnega' : 'izstopnega'} igralca ni v postavi`)
      menjave.push({
        ekipaIdx,
        minuta: m,
        noter: noter ? { st: noter.st, ime: noter.ime, regSt: noter.regSt } : { st: null, ime: null, regSt: null },
        ven: ven ? { st: ven.st, ime: ven.ime, regSt: ven.regSt } : { st: null, ime: null, regSt: null },
      })
    } else if (/^card-/.test(d.type)) {
      // Karton trenerja ali vodje ekipe: igralca ni v postavi, ne šteje.
      const i = najdi(ekipaIdx, d.url, d.playerPrimary)
      if (!i) continue
      if (d.type === 'card-yellow') rumeni.push(kdo(ekipaIdx, i, m))
      // Rumeno-rdeči: prvi rumeni je svoj dogodek, ta šteje kot rdeči.
      else if (d.type === 'card-red' || d.type === 'card-yellow-red') rdeci.push(kdo(ekipaIdx, i, m))
    }
  }

  // Namig za vratarja: kdor pride namesto vratarja, je vratar.
  for (const [ekipaIdx, e] of ekipe.entries())
    for (const mj of menjave.filter((x) => x.ekipaIdx === ekipaIdx)) {
      const ven = [...e.postava, ...e.rezerve].find((i) => i.regSt === mj.ven.regSt)
      const noter = e.rezerve.find((i) => i.regSt === mj.noter.regSt)
      if (ven?.vratar && noter) noter.vratar = true
    }

  const { rezultat, polcas } = iz
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  for (const e of ekipe)
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
  for (const g of goli.filter((x) => !x.regSt))
    opozorila.push(`gol v ${g.minuta}. minuti: strelca ni v postavi`)

  const { datum } = datumUra(info.datum)
  const vObliko = ({ polnoIme: _p, rezerva: _r, dres: _d, ...i }) => ({ ...i, pozicija: i.pozicija ?? (i.vratar ? 'GK' : null) })
  return {
    zapisnikId: id ?? String(info.spielUid),
    url,
    sezona: sezonaIzDatuma(datum),
    krog: Number(String(info.runde ?? '').match(/(\d+)\.\s*Runde/i)?.[1]) || null,
    datum,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    polcas,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/**
 * Nastopi po šifri igralca, ne po dresu: vratar brez številke ("T", "ET")
 * nima dresa, zato skupna funkcija (`zapisnik.mjs`, ujema po dresu) tu ne
 * zadošča. Vstopi in izstopi gredo skozi `minuteIzPreklopov`, ki zna tudi
 * leteče menjave nižjih lig.
 */
export function nastopi(z) {
  const out = []
  for (const [ekipaIdx, e] of [z.domaci, z.gostje].entries()) {
    const prejeti = ekipaIdx === 0 ? z.rezultat.gostje : z.rezultat.domaci
    const isti = (i, x) => (i.regSt ? x.regSt === i.regSt : x.ime === i.ime)
    const jaz = (i) => (x) => x.ekipaIdx === ekipaIdx && isti(i, x)
    for (const [zacetnik, seznam] of [[true, e.postava], [false, e.rezerve]]) {
      for (const i of seznam) {
        const preklopi = z.menjave
          .filter((m) => m.ekipaIdx === ekipaIdx && m.minuta != null)
          .filter((m) => isti(i, m.noter) || isti(i, m.ven))
          .map((m) => m.minuta)
        if (!zacetnik && !preklopi.length) continue // rezerva, ki ni vstopila
        const rdec = z.rdeci.find((k) => jaz(i)(k))
        const konec = rdec?.minuta ?? DOLZINA_TEKME
        const { minute, prvic } = minuteIzPreklopov(zacetnik, preklopi, konec)
        const igra = preklopi.length % 2 === (zacetnik ? 0 : 1)
        const goliIgralca = z.goli.filter((g) => jaz(i)(g))
        out.push({
          ekipaIdx,
          ekipa: e.ime,
          st: i.st,
          ime: i.ime,
          vratar: Boolean(i.vratar),
          zacetnik,
          minutaOd: prvic ?? 0,
          minutaDo: igra ? konec : Math.min([...preklopi].sort((a, b) => a - b).at(-1), konec),
          minute,
          goli: goliIgralca.filter((g) => !g.avtogol).length,
          goliIzEnajstmetrovke: goliIgralca.filter((g) => !g.avtogol && g.enajstmetrovka).length,
          avtogoli: goliIgralca.filter((g) => g.avtogol).length,
          zgreseneEnajstmetrovke: 0,
          rumeni: z.rumeni.filter((k) => jaz(i)(k)).length,
          rdeci: rdec ? 1 : 0,
          prejetiGoli: prejeti,
          cleanSheet: prejeti === 0,
          regSt: i.regSt ?? null,
          pozicija: i.pozicija ?? null,
        })
      }
    }
  }
  return out
}

// --- klubi -------------------------------------------------------------------

// Vzdevki: levo ključ, kot ga piše vir, desno ključ, pod katerim klub že
// poznamo. Dodaj le videne.
const ISTI_KLUB_AT = {}

const kljucBrezVzdevka = (ime) =>
  razpakiraj(ime)
    .toLocaleLowerCase('de')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

// Ključ kluba: male črke z ä, ö, ü, ß (slovenski `poenostavi` jih zavrže).
// Razpored piše kratko ime ("Dellach / Gail"), zapisnik polno; uvoz vzame
// ime iz razporeda.
export const kljucKlubaAt = (ime) => {
  const k = kljucBrezVzdevka(ime)
  return ISTI_KLUB_AT[k] ?? k
}

// Oblike društva, ki jih v kratkem imenu ne potrebujemo.
const OBLIKE_AT = new Set(['sv', 'sc', 'fc', 'usv', 'atsv', 'asv', 'askö', 'asko', 'sk', 'tsv', 'esv', 'fv', 'ufc', 'ufv',
  'sg', 'spg', 'uskö', 'dsg', 'ask', 'gak', 'atus', 'ssv', 'usc', 'tus', 'fk', 'nk', 'ac', 'sportunion', 'union', 'ksv',
  'vfb', 'wsv', 'psv', 'ssk', 'ftc', 'sw'])

/**
 * Kratko ime: brez oblike društva in letnice, največ tri besede.
 * "SV Straßwalchen" → "Straßwalchen", "USV 1960 Berndorf" → "Berndorf",
 * "Dellach / Gail" ostane.
 */
export function kratkoImeAt(polno) {
  const besede = razpakiraj(polno)
    .split(/\s+/)
    .filter((b) => b && !/^\d{4}$/.test(b) && !OBLIKE_AT.has(b.toLocaleLowerCase('de').replace(/\.$/, '')))
  if (!besede.length) return razpakiraj(polno).trim()
  return besede.slice(0, 3).join(' ')
}

// --- prenos ------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

const vir = {
  ime: 'oefb',
  polnoIme: 'Österreichischer Fußball-Bund (oefb.at)',
  drzava: 'AT',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 1500,
  imaRegistracije: false,

  naslovRazporeda,
  naslovZapisnika: (_koda, sifra) => naslovTekme(sifra),

  async razporedVseStrani(koda, prenesi) {
    const html = await prenesi(naslovRazporeda(koda), imeRazporeda(koda), true)
    const krogi = new Map()
    for (const t of vrsticeRazporeda(html)) {
      if (t.krog == null) continue
      if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
      // Le 3:0 / 0:3 ali več je lahko kontumacija; stran tekme prebere tudi
      // uvoz zapisnikov, zato to ne pomeni veliko novih zahtevkov.
      let kontumacija = Boolean(t.izid && t.kontumacija)
      if (!kontumacija && t.izid && t.id && Math.min(t.izid.domaci, t.izid.gostje) === 0 && Math.max(t.izid.domaci, t.izid.gostje) >= 3) {
        const stran = await prenesi(naslovTekme(t.id), imeTekme(t.id))
        // Prazna postava je lahko tudi zapisnik, ki še ni vnesen: šele po tednu.
        kontumacija = jeKontumacija(stran) && starostDni(t.datum) > 7
      }
      krogi.get(t.krog).tekme.push({
        domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija, odigrana: !!t.izid,
        ...(kontumacija ? { izid: t.izid } : {}),
      })
    }
    return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
  },

  async zapisniki(koda, prenesi) {
    const html = await prenesi(naslovRazporeda(koda), imeRazporeda(koda), true)
    const out = []
    for (const t of vrsticeRazporeda(html).filter((x) => x.izid && x.id)) {
      const url = naslovTekme(t.id)
      const ime = imeTekme(t.id)
      // Nepotrjen zapisnik (`inbearbeitung`) ima lahko postavo brez strelcev
      // in menjav: ne zamrzni ga v predpomnilniku, dokler ga zveza ne potrdi.
      const svez = t.status !== 'bestaetigt' && starostDni(t.datum) <= 45
      let z = vZapisnik(await prenesi(url, ime, svez), { id: t.id, url })
      // Znova le tekmo zadnjih 45 dni: starejša brez postav je kontumacija
      // ali klub postave ni vnesel.
      if (!z && starostDni(t.datum) <= 45) z = vZapisnik(await prenesi(url, ime, true), { id: t.id, url })
      if (!z) continue
      // Ime kluba in krog iz razporeda, da se tekma ujame z vrstico razporeda.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog ?? z.krog
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaAt,
  kratkoIme: kratkoImeAt,
  poenostavi: kljucBrezVzdevka,
}

export default vir
