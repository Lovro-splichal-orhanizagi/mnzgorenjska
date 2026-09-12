// Vir: Nogometna zveza Slovenije (www.nzs.si) — 1. SNL, 2. SNL, 3. SNL.
//
// Edini vir, ki ni medobčinska zveza. Šifra lige je pot v naslovu, sezona pa
// **številka iz spustnega seznama**, ne letnica:
//
//   372571 = 2026/27 · 22 = 2025/26 · 23 = 2024/25 · 24 = 2023/24
//   25 = 2022/23 · 26 = 2021/22 · 27 = 2020/21 · 28 = 2019/20
//
// Zato je šifra `<pot>` za tekočo sezono in `<pot>:<sezona>` za arhiv.
//
// Nastevanje tekem je bila zadnja uganka. Izbirnik sezone je skripten in
// navaden POST vrne tekočo sezono; AJAX pa v odgovoru pove, kam preusmeri —
// in to je navaden `?season=<id>`. Seznam je ostranjen z Drupalovim
// **večstranskim** pagerjem, zato je vrednost par: `page=0,<n>`.
import { parsirajZapisnik } from '../zapisnik-nzs.mjs'
import { nastopi, vBesedilo } from '../zapisnik.mjs'
import { naredikljucKluba, kratkoIme, poenostavi } from '../klubi.mjs'

const OSNOVNI = 'https://www.nzs.si'
const NA_STRAN = 10

/** `<pot>` ali `<pot>:<sezona>` → { pot, sezona }. */
export function razbijKodo(koda) {
  const [pot, sezona = null] = String(koda).split(':')
  return { pot, sezona }
}

const naslovSeznama = (koda, stran = 0) => {
  const { pot, sezona } = razbijKodo(koda)
  const q = [sezona ? `season=${sezona}` : null, `page=0%2C${stran}`]
    .filter(Boolean)
    .join('&')
  return `${OSNOVNI}/klubi/moski/${pot}/tekme?${q}`
}

/** Naslovi tekem s strani seznama; šifra tekme je kar njen del poti. */
export function sifreTekem(html) {
  const re = /\/klubi\/moski\/[a-z0-9-]+\/tekme\/([a-z0-9-]+-\d{4}-\d{2}-\d{2}-\d{6})/g
  return [...new Set([...html.matchAll(re)].map((m) => m[1]))]
}

/**
 * Razpored s seznama tekem: ena vrstica `<tr class="match-tbody-tr">` nosi
 * datum, uro, obe imeni in krog. Krog je v svojem stolpcu, zato ga ni treba
 * sklepati iz datuma.
 */
export function razcleniRazporedNzs(html) {
  const krogi = new Map()
  for (const m of html.matchAll(/<tr class="match-tbody-tr">([\s\S]*?)<\/tr>/g)) {
    const v = m[1]
    const datum = v.match(/<time class="date" datetime="(\d{4}-\d{2}-\d{2})"/)?.[1]
    const ura = v.match(/<time class="time" datetime="(\d{1,2}:\d{2})"/)?.[1] ?? null
    const imena = [...v.matchAll(/<h5 class="match-team-name[^"]*">([^<]+)<\/h5>/g)].map(
      (x) => x[1].trim(),
    )
    const krog = Number(
      v.match(/mobile-label">Krog<\/span>\s*(\d+)/)?.[1] ?? NaN,
    )
    if (!datum || imena.length < 2 || !Number.isInteger(krog)) continue
    if (!krogi.has(krog)) krogi.set(krog, { stevilka: krog, tekme: [] })
    krogi.get(krog).tekme.push({ domaci: imena[0], gostje: imena[1], datum, ura })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

/**
 * Vse tekme sezone: hodi po straneh, dokler jih je polno.
 *
 * Zadnja stran je krajša od `NA_STRAN`; brez tega merila bi šli v neskončno,
 * ker pager čez konec ne vrne napake, ampak zadnjo stran še enkrat.
 */
async function seznamTekem(koda, prenesi) {
  const { pot, sezona } = razbijKodo(koda)
  const vse = []
  for (let stran = 0; stran < 60; stran++) {
    const html = await prenesi(
      naslovSeznama(koda, stran),
      `seznam-${pot}-${sezona ?? 'tekoca'}-${stran}.html`,
      stran === 0,
    )
    const s = sifreTekem(html)
    const nove = s.filter((x) => !vse.includes(x))
    vse.push(...nove)
    if (s.length < NA_STRAN || !nove.length) break
  }
  return vse
}

const vir = {
  ime: 'nzs',
  polnoIme: 'Nogometna zveza Slovenije',
  drzava: 'SI',
  osnovniNaslov: OSNOVNI,

  naslovSeznamaTekem: (koda) => naslovSeznama(koda, 0),
  naslovRazporeda: (koda) => naslovSeznama(koda, 0),
  naslovZapisnika: (koda, sifra) =>
    `${OSNOVNI}/klubi/moski/${razbijKodo(koda).pot}/tekme/${sifra}/zapisnik`,

  parsirajZapisnik,
  nastopi,
  vBesedilo,
  sifreTekem,

  // Razpored NZS je tabela, ne zaporedje vrstic: krog ima svoj STOLPEC in se
  // iz golega besedila ne da lociti. Uvoz zato poda oboje, vrstice in HTML.
  razcleniRazpored: (_vrstice, html) => razcleniRazporedNzs(html),

  // Zveze pri NZS ne poznamo kot MNZ, zato vzdevkov klubov ni na zalogo.
  kljucKluba: naredikljucKluba({}),
  kratkoIme,
  poenostavi,

  async zapisniki(koda, prenesi) {
    const { pot, sezona } = razbijKodo(koda)
    const out = []
    for (const sifra of await seznamTekem(koda, prenesi)) {
      const url = vir.naslovZapisnika(koda, sifra)
      const html = await prenesi(url, `zapisnik-${pot}-${sezona ?? 'tekoca'}-${sifra}.html`)
      const z = parsirajZapisnik(html, { zapisnikId: sifra, url })
      if (z) out.push({ id: sifra, z, url })
    }
    return out
  },
}

export default vir
