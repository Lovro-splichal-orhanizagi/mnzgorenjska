// Vir: Norges Fotballforbund — fotball.no (javne strani FIKS, `/fotballdata/`).
//
// NFF in vseh 18 kretsov vodi vsa tekmovanja v FIKS; fotball.no jih objavi z
// istimi stranmi od OBOS-ligaen do najnižje divisjon. HTML iz strežnika.
//
// SEZONA je koledarsko leto (april–oktober): 2026 = "2026", ne "2026/27"
// (`competitions.sezona_koledarska`). Leto pove naslov turnirja
// ("Norsk Tipping-ligaen avd. 1 - 2026").
//
// ŠIFRA LIGE je id turnirja FIKS (`/fotballdata/turnering/hjem/?fiksId=205686`).
// Vsaka sezona je svoj turnir s svojim id-jem, tudi arhiv (2025 = 199883 za
// isto skupino). Ob novi sezoni se popravi `competitions.source_league_code`.
// Seznam turnirjev kretsa in sezone je `/turneringer/?d=<krets>&s=<sezona>`
// (glej `scripts/norveske-lige.mjs`).
//
// RAZPORED je stran turnirja (`turnering/hjem`, ~1 MB): zavihek "Alle kamper"
// je tabela z vsemi tekmami (Runde, Dato "04.04.2026", Tid, Hjemmelag, Resultat
// "3 - 0" s povezavo na `kamp/?fiksId=`, Bortelag, Bane, Kampnr.). Oslo ima isti
// čas kot Ljubljana, ura ostane, kot je.
//
// ZAPISNIK `/fotballdata/kamp/?fiksId=<id>`:
// - glava: "4 - 1" (`endResult`), polčas "(2 - 0)", imeni klubov;
// - "Kamptropper": `homeTeamWrapper` / `awayTeamWrapper`, vsak s
//   "Startoppstilling:" (začetniki) in "Innbyttere:" (klop); igralec ima dres
//   (`playerNumber`), stalno šifro osebe (`person/profil/?fiksId=` → `reg_st`)
//   in "Kap" za kapetana. Igralec s pripono "(strøket)" je bil prečrtan in ni
//   igral — ga izpustimo. "Personinfo ikke tilgjengelig" je oseba, katere
//   podatkov NFF ne objavi (zasebnost) — brez imena in šifre, izpustimo jo
//   (njen gol ostane ekipi brez strelca).
//   **Vratar NI označen**; FIKS našteje začetnike po mestih (vratar prvi), zato
//   ima prvi začetnik `vratar` le kot namig (kot mlsz, ffm).
// - "Kamphendelser" (časovnica): vrstica `homeTeam` / `awayTeam` (ekipa
//   IGRALCA), minuta, ikona in napis: "Spillemål" (gol), "Straffemål" (gol z
//   11 m), "Selvmål" (avtogol — v vrstici strelčeve ekipe, šteje nasprotniku),
//   "Advarsel" (rumeni), "Utvisning" (rdeči; drugi rumeni z ikono
//   `RedYellowRedCard2`, prvi rumeni je svoj dogodek), menjava (`Inn:` / `Ut:` z
//   minuto), "Kampen er slutt". "Advarsel/Utvisning for Leder" je karton vodstva
//   ekipe — ne šteje. Minute nad 90 se odrežejo na 90.
// - **Kontumacija**: glava "Bortelaget/Hjemmelaget møtte ikke" (`z.kontumacija`)
//   ali 3:0 / 0:3 brez obeh postav.
// - **Menjave** vpisujejo le nekatere ekipe (višje lige da, nižje pogosto ne).
//   Ekipa s klopjo in brez ene same menjave je `z.brezMenjav[idx]`: začetniki
//   imajo 90 minut (ali do rdečega), rezerva brez vstopa nastopa nima, strelec s
//   klopi dobi vstop ob golu (kot fsb, fcf Quarta). V nižjih 5. divisjon klubi
//   včasih vpišejo vse igralce kot začetnike (do 20): vsi dobijo 90 minut.
//
// Šifra zapisnika v bazi je `no<id>` (`sifraZapisnika`): FIKS šteje tekme v
// milijonih (8,9 milijona), v istem prostoru kot rastoči viri drugih zvez.
//
// Pravice: robots.txt splošnim robotom prepove vse (`User-agent: * /
// Disallow: /`), noga pa ponatis. **NFF je zajem pisno dovolil** (pridobil
// Lovro, oktober 2026; kopija še ni v arhivu info@). Dovoljenje ne pomeni, da
// smemo obiti zaščito: ob izzivu (Cloudflare, CAPTCHA) ali 401/403/429 se uvoz
// ustavi (`NffZavrnitev`, izhod 4) — ne obhajaj. Beremo odkrito (User-Agent
// SLFF, 3 s med zahtevki), zaključenih zapisnikov ne beremo znova.
import { razpakiraj } from '../klubi.mjs'
import { vPriimekIme } from './sportnet.mjs'
import { nastopi } from './hlf.mjs'
import { NEPOPOLN } from './frf.mjs'

export { nastopi, NEPOPOLN }

const OSNOVNI = 'https://www.fotball.no'
const DOLZINA_TEKME = 90
/** Najmanj začetnikov, da ekipa šteje za ekipo z znano postavo. */
const NAJMANJ_ZACETNIKOV = 7

/** "205686" → "205686"; šifra lige je id turnirja FIKS. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d{4,8})$/)
  if (!m) throw new Error(`nff: šifra lige je id turnirja FIKS (npr. 205686), ne "${koda}"`)
  return m[1]
}

export const naslovRazporeda = (koda) => `${OSNOVNI}/fotballdata/turnering/hjem/?fiksId=${razbijKodo(koda)}`
export const sifraZapisnika = (id) => `no${String(id).replace(/^no/, '')}`
export const naslovZapisnika = (id) => `${OSNOVNI}/fotballdata/kamp/?fiksId=${String(id).replace(/^no/, '')}`
export const imeRazporeda = (koda) => `turnering-${razbijKodo(koda)}.html`
export const imeZapisnika = (id) => `kamp-${String(id).replace(/^no/, '')}.html`

const cisto = (s) =>
  String(s ?? '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class NffZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'NffZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429

export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha-delivery/i.test(String(html ?? ''))

/** Prava stran tekme ali turnirja; ostalo (napaka, prazna predloga) ne gre v predpomnilnik. */
export const jeStranTekme = (html) => /data-page-name="MatchPage_Index"/.test(String(html ?? '')) && /class="a_matchCard"/.test(String(html ?? ''))
export const jeStranTurnirja = (html) => /data-page-name="Tournament_Index"/.test(String(html ?? '')) && /<h1[^>]*>[^<]*-\s*\d{4}\s*(?:-[^<]*)?<\/h1>/.test(String(html ?? ''))
export const zaPredpomnilnik = (html, datoteka = '') =>
  /^kamp-/.test(datoteka) ? jeStranTekme(html) : /^turnering-/.test(datoteka) ? jeStranTurnirja(html) : jeStranTekme(html) || jeStranTurnirja(html)

/** "12'" → 12, "45+2'" → 45, "93" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "04.04.2026" ali "10.10.26" → "2026-04-04". */
export function datum(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)
  if (!m) return null
  const leto = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${leto}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/** "3 - 0" → { domaci: 3, gostje: 0 }; sicer null. */
export function izid(s) {
  const m = besedilo(s).match(/^(\d+)\s*-\s*(\d+)/)
  return m ? { domaci: Number(m[1]), gostje: Number(m[2]) } : null
}

// --- turnir (razpored) ------------------------------------------------------------

/** Ime, leto in krets turnirja z naslova strani: { ime, leto, krets }. */
export function glavaTurnirja(html) {
  const h1 = besedilo(cisto(html).match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] ?? '')
  // NFF: "Norsk Tipping-ligaen avd. 1 - 2026"; krets: "4. div. menn avd. 01 - 2026 - Oslo".
  const m = h1.match(/^(.*?)\s*-\s*(\d{4})(?:\s*-\s*(.*))?$/)
  return m ? { ime: m[1].trim(), leto: m[2], krets: m[3]?.trim() ?? null } : { ime: h1 || null, leto: null, krets: null }
}

/**
 * Vse tekme turnirja iz tabele "Alle kamper":
 * [{ krog, datum, ura, domaci, gostje, domaciId, gostjeId, id, izid, kampnr }].
 */
export function vrsticeRazporeda(html) {
  const s = cisto(html)
  const i = s.indexOf('id="AllMatchesContainer"')
  if (i < 0) return []
  const tabela = s.slice(i).match(/<tbody>(.*?)<\/tbody>/)?.[1] ?? ''
  const out = []
  for (const tr of tabela.split(/<tr[^>]*>/).slice(1)) {
    const td = tr.split(/<td[^>]*>/).slice(1).map((x) => x.replace(/<\/td>.*$/, ''))
    if (td.length < 7) continue
    const krog = Number(besedilo(td[0]))
    const ekipa = (x) => ({ ime: besedilo(x), id: x.match(/lag\/hjem\/\?fiksId=(\d+)/)?.[1] ?? null })
    const d = ekipa(td[4])
    const g = ekipa(td[6])
    if (!d.ime || !g.ime) continue
    const id = (td[5].match(/kamp\/\?fiksId=(\d+)/) ?? td[1].match(/kamp\/\?fiksId=(\d+)/) ?? td.at(-1).match(/kamp\/\?fiksId=(\d+)/))?.[1] ?? null
    const ura = besedilo(td[3]).match(/^(\d{1,2}):(\d{2})$/)
    out.push({
      krog: Number.isFinite(krog) && krog > 0 ? krog : null,
      datum: datum(besedilo(td[1])),
      ura: ura ? `${ura[1].padStart(2, '0')}:${ura[2]}` : null,
      domaci: d.ime,
      gostje: g.ime,
      domaciId: d.id,
      gostjeId: g.id,
      id,
      izidBesedilo: besedilo(td[5]),
      izid: izid(td[5]),
      kampnr: besedilo(td.at(-1)) || null,
    })
  }
  return out
}

/**
 * Razpored v obliko uvoza razporeda (krogi s tekmami). Uvoz razporeda stran
 * turnirja prenese sam (`naslovRazporeda`) in jo poda sem; stran, ki ni stran
 * turnirja (napaka s statusom 200), da prazen razpored — uvoz tedaj vzame
 * zadnji shranjeni.
 */
export function razcleniRazpored(_vrstice, html) {
  if (!jeStranTurnirja(html)) return []
  const krogi = new Map()
  for (const t of vrsticeRazporeda(html)) {
    if (!t.krog) continue
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija: false,
      odigrana: !!t.izid,
      // Za `kontumacije`: tekmo z izidom 3:0 / 0:3 je treba pogledati v zapisniku.
      nffId: t.id,
      izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ---------------------------------------------------------------------

/** Igralci enega seznama (`a_matchPlayerList`): [{ st, ime, regSt, kapetan }]. */
function igralciSeznama(del, opozorila, ekipa) {
  const out = []
  for (const kos of String(del ?? '').split('class="matchPlayerListItem"').slice(1)) {
    const st = kos.match(/class="playerNumber">\s*(\d+)\s*</)?.[1]
    const p = kos.match(/person\/profil\/\?fiksId=(\d+)"\s*class="playerName">([^<]*)</)
    if (!p) {
      if (/unavailablePersonInfo|Personinfo ikke tilgjengelig/.test(kos)) opozorila.push(`${ekipa}: igralec brez javnih podatkov (Personinfo ikke tilgjengelig) izpuščen`)
      continue
    }
    const polno = razpakiraj(p[2]).replace(/\s+/g, ' ').trim()
    // Prečrtan igralec ("(strøket)") ni igral.
    if (/\(str[øo]ket\)/i.test(polno)) continue
    out.push({
      st: st != null ? Number(st) : null,
      ime: vPriimekIme(polno),
      polnoIme: polno,
      regSt: Number(p[1]),
      kapetan: /class="playerCaptain"/.test(kos),
    })
  }
  return out
}

/** Postava ene ekipe: { ime, postava, rezerve } iz `homeTeamWrapper` / `awayTeamWrapper`. */
function ekipaZapisnika(s, razred, opozorila) {
  const i = s.indexOf(`${razred}">`)
  if (i < 0) return { ime: null, postava: [], rezerve: [] }
  const konec = s.indexOf('</li>', s.indexOf('Innbyttere:', i) > 0 ? s.indexOf('Innbyttere:', i) : i)
  const del = s.slice(i, konec < 0 ? undefined : konec)
  const ime = besedilo(del.match(/<h3>([^<]*)<\/h3>/)?.[1] ?? '') || null
  const zac = del.indexOf('Startoppstilling:')
  const klop = del.indexOf('Innbyttere:')
  const postava = zac >= 0 ? igralciSeznama(del.slice(zac, klop > zac ? klop : undefined), opozorila, ime) : []
  const rezerve = klop >= 0 ? igralciSeznama(del.slice(klop), opozorila, ime) : []
  return { ime, postava, rezerve }
}

/** Časovnica: [{ ekipaIdx, minuta, ikona, napis, igralec, noter, ven }]. */
function casovnica(s) {
  const i = s.indexOf('class="a_matchTimeline')
  if (i < 0) return []
  const del = s.slice(i, s.indexOf('</section>', i))
  return del.split('class="timelineEventLine ').slice(1).map((v) => {
    const ekipaIdx = /^homeTeam/.test(v) ? 0 : /^awayTeam/.test(v) ? 1 : null
    const vsebina = v.match(/class="timelineEventContent">(.*)$/)?.[1] ?? ''
    const oseba = (re) => vsebina.match(re)?.[1]
    const inn = oseba(/<span>Inn:\s*<\/span><a href="[^"]*fiksId=(\d+)"/)
    const ut = oseba(/<span>Ut:\s*<\/span><a href="[^"]*fiksId=(\d+)"/)
    return {
      ekipaIdx,
      minuta: minuta(v.match(/class="timelineMinute">\s*([\d+]+)/)?.[1]),
      ikona: v.match(/data-icon="([A-Za-z0-9]+)"/)?.[1] ?? '',
      napis: besedilo(vsebina.match(/<\/a><div>([^<]*)<\/div>/)?.[1] ?? vsebina.match(/<div>([^<]*)<\/div>/)?.[1] ?? ''),
      igralec: inn || ut ? null : Number(oseba(/person\/profil\/\?fiksId=(\d+)"/)) || null,
      noter: inn ? Number(inn) : null,
      ven: ut ? Number(ut) : null,
    }
  })
}

/**
 * Vrsta dogodka iz napisa in ikone. Napis je zanesljivejši; ikona je rezerva.
 * Vrne 'gol' | 'enajstmetrovka' | 'avtogol' | 'rumeni' | 'rdeci' | 'menjava' | 'konec' | 'leder' | '?'.
 * "Advarsel/Utvisning for Leder" je karton vodstva ekipe ('leder'), ne igralca.
 */
export function vrstaDogodka({ napis, ikona, noter, ven }) {
  const n = String(napis ?? '').toLowerCase()
  if (/for leder/.test(n)) return 'leder'
  if (noter || ven || /bytte/.test(n) || /^SubInOut/.test(ikona)) return 'menjava'
  if (/selvm[åa]l/.test(n) || /Red$/.test(ikona) && /^SportsAndOutdoors/.test(ikona)) return 'avtogol'
  if (/straffem[åa]l|straffespark.*m[åa]l/.test(n)) return 'enajstmetrovka'
  if (/m[åa]l/.test(n) && !/bom|brent|redning|kontroll/.test(n)) return 'gol'
  if (/utvisning|r[øo]dt|direkte r/.test(n) || /^RedCard/.test(ikona) || /^(YellowRed|RedYellow)Card|^SecondYellow/.test(ikona)) return 'rdeci'
  if (/advarsel|gult/.test(n) || /^YellowCard/.test(ikona)) return 'rumeni'
  if (/kampen er slutt|pause|start/.test(n)) return 'konec'
  if (/^SportsAndOutdoors$/.test(ikona)) return 'gol'
  return '?'
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če stran nima izida.
 * Ekipa z manj kot sedmimi začetniki nima znane postave (`nepopoln`).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = cisto(html)
  if (!/class="a_matchCard"/.test(s)) return null
  const glava = s.slice(s.indexOf('class="a_matchCard"'))
  const koncni = izid(glava.match(/class="endResult">([^<]*)</)?.[1] ?? '')
  if (!koncni) return null
  const polcas = glava.match(/class="halfTime">\s*\(?\s*(\d+)\s*-\s*(\d+)/)
  // Ime kluba v glavi je povezava; pri kontumaciji golo besedilo.
  const imenaGlave = [...glava.matchAll(/class="teamName">(?:<a href="[^"]*lag\/hjem\/\?fiksId=(\d+)">)?([^<]*)</g)].slice(0, 2)
  // "Bortelaget møtte ikke" / "Hjemmelaget møtte ikke": kontumacija (tudi če je zapisnik izpolnjen).
  const opomba = besedilo(glava.match(/class="textline">([^<]*)</)?.[1] ?? '')
  const turnir = s.match(/Turnering:\s*<\/span><a href="[^"]*turnering\/hjem\/\?fiksId=(\d+)">([^<]*)</)
  const datumGlave = datum(glava.match(/class="headingElement">[^<]*?(\d{1,2}\.\d{1,2}\.\d{2,4})</)?.[1])

  const opozorila = []
  const ekipe = [ekipaZapisnika(s, 'homeTeamWrapper', opozorila), ekipaZapisnika(s, 'awayTeamWrapper', opozorila)]
  ekipe.forEach((e, idx) => {
    e.ime = besedilo(imenaGlave[idx]?.[2] ?? '') || e.ime || ''
    e.znana = e.postava.length >= NAJMANJ_ZACETNIKOV
  })

  const kje = new Map()
  ekipe.forEach((e, idx) => {
    for (const i of e.postava) kje.set(i.regSt, { idx, i, zacetnik: true })
    for (const i of e.rezerve) kje.set(i.regSt, { idx, i, zacetnik: false })
  })
  const kdo = (reg, m) => {
    const k = reg != null && kje.get(reg)
    return k ? { ekipaIdx: k.idx, st: k.i.st, ime: k.i.ime, regSt: k.i.regSt, minuta: m } : null
  }

  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  for (const d of casovnica(s)) {
    const vrsta = vrstaDogodka(d)
    // Konec tekme in kartoni vodstva ekipe ("Advarsel for Leder") ne štejejo.
    if (vrsta === 'konec' || vrsta === 'leder') continue
    if (d.minuta == null) opozorila.push(`dogodek "${d.napis || d.ikona}" brez minute`)
    if (vrsta === 'menjava') {
      const noter = kdo(d.noter, d.minuta)
      const ven = kdo(d.ven, d.minuta)
      if (!noter && !ven) { opozorila.push(`menjava v ${d.minuta}. minuti: igralcev ni v postavi`); continue }
      const brez = { st: null, ime: null, regSt: null }
      menjave.push({
        ekipaIdx: (noter ?? ven).ekipaIdx,
        minuta: d.minuta,
        noter: noter ? { st: noter.st, ime: noter.ime, regSt: noter.regSt } : brez,
        ven: ven ? { st: ven.st, ime: ven.ime, regSt: ven.regSt } : brez,
      })
      continue
    }
    const p = kdo(d.igralec, d.minuta)
    if (vrsta === 'gol' || vrsta === 'enajstmetrovka' || vrsta === 'avtogol') {
      if (!p) {
        // Strelec brez javnih podatkov ("Personinfo ikke tilgjengelig") ali ga
        // ni v postavi: gol ostane ekipi vrstice, brez strelca (scorer_id null).
        opozorila.push(`gol v ${d.minuta}. minuti: strelca ni v postavi — gol brez strelca`)
        if (d.ekipaIdx != null)
          goli.push({ ekipaIdx: d.ekipaIdx, st: null, ime: null, regSt: null, minuta: d.minuta, avtogol: vrsta === 'avtogol', enajstmetrovka: vrsta === 'enajstmetrovka' })
        continue
      }
      if (d.ekipaIdx != null && d.ekipaIdx !== p.ekipaIdx) opozorila.push(`gol v ${d.minuta}. minuti (${p.ime}): vrstica je pri drugi ekipi`)
      goli.push({ ...p, avtogol: vrsta === 'avtogol', enajstmetrovka: vrsta === 'enajstmetrovka' })
    } else if (vrsta === 'rumeni') {
      if (p) rumeni.push(p) // karton trenerja ali osebe brez podatkov ne šteje
    } else if (vrsta === 'rdeci') {
      if (p && !rdeci.some((r) => r.ekipaIdx === p.ekipaIdx && r.regSt === p.regSt)) rdeci.push(p)
    } else opozorila.push(`neznan dogodek "${d.napis || d.ikona}" v ${d.minuta}. minuti`)
  }

  const sestava = ekipe.map((e, idx) => {
    if (!e.znana) {
      if (e.postava.length || e.rezerve.length) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev — postava ni znana`)
      return { ime: e.ime, postava: [], rezerve: [] }
    }
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const preklopi = (i) =>
      menjave
        .filter((m) => m.ekipaIdx === idx && m.minuta != null && (m.noter.regSt === i.regSt || m.ven.regSt === i.regSt))
        .map((m) => m.minuta)
        .sort((a, b) => a - b)
    const vObliko = (zacetnik) => (i, j) => ({
      st: i.st,
      ime: i.ime,
      regSt: i.regSt,
      kapetan: i.kapetan,
      // Prvi začetnik je v FIKS vratar — le namig, ne oznaka zapisnika.
      vratar: zacetnik && j === 0,
      pozicija: zacetnik && j === 0 ? 'GK' : null,
      zacetnik,
      preklopi: preklopi(i),
    })
    return { ime: e.ime, postava: e.postava.map(vObliko(true)), rezerve: e.rezerve.map(vObliko(false)) }
  })
  const brezMenjav = sestava.map((e, idx) => e.postava.length > 0 && e.rezerve.length > 0 && !menjave.some((m) => m.ekipaIdx === idx))
  // Karton rezervi brez vpisanega vstopa (in brez gola) ne šteje — nastopa ni.
  sestava.forEach((e, idx) => {
    for (const i of e.rezerve) {
      if (i.preklopi.length || goli.some((g) => g.ekipaIdx === idx && g.regSt === i.regSt)) continue
      if ([...rumeni, ...rdeci].some((k) => k.ekipaIdx === idx && k.regSt === i.regSt))
        opozorila.push(`${e.ime}: rezerva ${i.ime} ima karton, vstopa zapisnik nima — karton ne šteje`)
    }
  })

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (ekipe[0].znana && ekipe[1].znana && (zaEkipo(0) !== koncni.domaci || zaEkipo(1) !== koncni.gostje))
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${koncni.domaci}:${koncni.gostje}`)
  const nepopoln = !ekipe[0].znana || !ekipe[1].znana
  if (nepopoln) opozorila.unshift(`${NEPOPOLN}: ${ekipe.filter((e) => !e.znana).map((e) => e.ime).join(', ')} brez postave`)

  return {
    zapisnikId: id,
    url,
    turnir: turnir?.[1] ?? null,
    imeTurnirja: turnir ? besedilo(turnir[2]) : null,
    sezona: datumGlave ? datumGlave.slice(0, 4) : null,
    krog: null,
    datum: datumGlave,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat: koncni,
    polcas: polcas ? { domaci: Number(polcas[1]), gostje: Number(polcas[2]) } : null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    brezMenjav,
    nepopoln,
    prazen: !ekipe[0].postava.length && !ekipe[1].postava.length,
    opomba: opomba || null,
    kontumacija: /m[øo]tte ikke|walk ?over|\bw\.?o\b/i.test(opomba),
    opozorila,
  }
}

/**
 * Kontumacija: glava pove "Bortelaget/Hjemmelaget møtte ikke" (`z.kontumacija`)
 * ali izid 3:0 / 0:3 brez postav obeh ekip.
 */
export const jeKontumacija = (z) =>
  !!z && (z.kontumacija || (z.prazen && ((z.rezultat.domaci === 3 && z.rezultat.gostje === 0) || (z.rezultat.domaci === 0 && z.rezultat.gostje === 3))))

// --- klubi -------------------------------------------------------------------------

// Oblike društva. Krets Hålogaland piše od 2026 polna imena ("Svolvær IL",
// "Mjølner, FK", "Harstad IL 2"), 2025 pa kratka ("Svolvær", "Mjølner",
// "Harstad 2") — brez oblike je to isti klub.
const OBLIKE_NO = new Set(['il', 'fk', 'if', 'sk', 'bk', 'fl', 'spk', 'til', 'oif', 'ik', 'fotball', 'fotballklubb', 'idrettslag', 'idrettsforening', 'sportsklubb', 'ballklubb'])

/** Besede imena brez oblike društva (vsaj ena beseda ostane). */
function brezOblike(ime) {
  const besede = razpakiraj(ime).replace(/,/g, ' ').split(/\s+/).filter(Boolean)
  const ostale = besede.filter((b) => !OBLIKE_NO.has(b.toLocaleLowerCase('nb').replace(/\./g, '')))
  return ostale.length ? ostale : besede
}

// Ključ kluba: male črke z æ, ø, å (slovenski `poenostavi` jih zavrže), brez oblike društva.
export const kljucKlubaNo = (ime) =>
  brezOblike(ime)
    .join(' ')
    .toLocaleLowerCase('nb')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

/** Kratko ime: FIKS piše klube kratko ("Vålerenga 2", "Frigg"); polnim odrežemo obliko ("Morild, IL" → "Morild"). */
export const kratkoImeNo = (polno) => brezOblike(polno).join(' ')

// --- prenos ------------------------------------------------------------------------

const DAN = 86400000
/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (d, danes = Date.now()) => (d ? (danes - Date.parse(`${d}T00:00:00Z`)) / DAN : 0)

/** Prenos, ki se ob zavrnitvi ali izzivu ustavi (namesto da bi izziv razčlenil). */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev || jeZavrnitev(e.status)) throw new NffZavrnitev(`nff: ${url} → HTTP ${e.status ?? e.message} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new NffZavrnitev(`nff: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

async function turnir(koda, prenesi) {
  const url = naslovRazporeda(koda)
  const html = await beri(prenesi, url, imeRazporeda(koda), true)
  if (!jeStranTurnirja(html)) throw new Error(`nff: ${url} ni stran turnirja (${String(html).length} B) — uvoz ustavljen`)
  return html
}

/** Zapisnik ene tekme; prazen ali nepopoln se 45 dni bere znova (`zapisnikSvez`). */
async function zapisnikTekme(prenesi, t) {
  const url = naslovZapisnika(t.id)
  const ime = imeZapisnika(t.id)
  const star = starostDni(t.datum)
  // Prve dni po tekmi zveza zapisnik še dopolnjuje: beri ga sveže.
  let html = await beri(prenesi, url, ime, star <= 3)
  let z = jeStranTekme(html) ? vZapisnik(html, { id: t.id, url }) : null
  // Stran iz predpomnilnika brez postave (klub je ni še vnesel) ali brez izida
  // preberemo še enkrat sveže — 45 dni, nato ostane, kakršna je.
  if ((!z || z.nepopoln) && star > 3 && star <= 45) {
    html = await beri(prenesi, url, ime, true)
    z = jeStranTekme(html) ? vZapisnik(html, { id: t.id, url }) : null
  }
  return z
}

const vir = {
  ime: 'nff',
  polnoIme: 'Norges Fotballforbund (fotball.no)',
  drzava: 'NO',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  // Dovoljenje NFF ne pomeni hitrosti: 3 s med zahtevki.
  premorMs: 3000,
  imaRegistracije: false,

  naslovRazporeda,
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),
  // Uvozne skripte: izziv ne gre v predpomnilnik, zavrnitev ustavi uvoz (izhod 4);
  // napaka ali prazna predloga 200 ne gre v predpomnilnik.
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new NffZavrnitev(`nff: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  // Stran turnirja (~1 MB) prenese uvoz razporeda sam; tu jo le razčlenimo.
  razcleniRazpored,

  /** Kontumacije: 3:0 / 0:3, starejše od tedna, z zapisnikom brez postav. */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * DAN).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.nffId || !t.datum || t.datum > teden) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const html = await prenesiKrog(naslovZapisnika(t.nffId), imeZapisnika(t.nffId), t.datum)
        if (jeIzziv(html)) throw new NffZavrnitev(`nff: ${naslovZapisnika(t.nffId)} vrne izziv (CAPTCHA)`)
        if (jeKontumacija(vZapisnik(html))) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  async zapisniki(koda, prenesi) {
    const html = await turnir(koda, prenesi)
    const { leto } = glavaTurnirja(html)
    const out = []
    for (const t of vrsticeRazporeda(html).filter((x) => x.id && x.izid)) {
      const z = await zapisnikTekme(prenesi, t)
      if (!z) continue
      // Kontumacija nima zapisnika (razpored jo označi): z oznako takoj, 3:0
      // brez postav šele po tednu (postavo klub lahko še vnese).
      if (z.kontumacija || (jeKontumacija(z) && starostDni(t.datum) > 7)) continue
      if (z.turnir && z.turnir !== razbijKodo(koda))
        z.opozorila.push(`zapisnik je turnirja ${z.turnir}, ne ${razbijKodo(koda)}`)
      // Ime kluba, krog in sezona iz razporeda, da se tekma ujame z vrstico razporeda.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = leto ?? z.sezona
      z.datum ??= t.datum
      z.ura = t.ura
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      z.zapisnikId = sifraZapisnika(t.id)
      out.push({ id: z.zapisnikId, z, url: naslovZapisnika(t.id) })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaNo,
  kratkoIme: kratkoImeNo,
  poenostavi: kljucKlubaNo,
}

export default vir
