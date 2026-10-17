// Poze maskote za nagrade tedenskega pregleda mini lige.
//
// Maskota (`public/logo/slff-maskota.png`) je narisana v ploskem slogu:
// debele temne obrobe, ploske barve, okrogel trebuh v zeleno-kremnih obročih.
// Tu jo sestavimo iz istih delov (glava s kapo in brki, trebuh, hlače,
// nogavice, čevlji) in ji vsaki nagradi dodamo svoje roke, izraz in
// rekvizit. Vse poze imajo isti `viewBox`, zato je maskota na vsaki sliki
// enako velika.
//
// Pravila (docs/podatkovni-model.md, *Nagrade tedenskega pregleda*):
//   - nobena poza nima cigarete;
//   - poze s pivom imajo različico `-mladi` (sok s slamico) za mini lige z
//     mladinsko ligo — mladim nikoli ne pokažemo alkohola;
//   - maskota je tista, ki joka v žlico — šala gre nanjo, ne na človeka.
//
//   node scripts/maskota-poze.mjs          # zapiše public/logo/maskota/*.svg

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Barve, prebrane z izvirne maskote.
export const BARVE = {
  crnilo: '#16211c',
  koza: '#e8b58c',
  zelena: '#2f6b4f',
  krem: '#f2e8d5',
  pivo: '#e0a32e',
  pena: '#fbf5e6',
  rdeca: '#c6503c',
  les: '#c48a52',
  lesTemen: '#9a6434',
  zlata: '#e7b22b',
  solza: '#8cc8e8',
}
const C = BARVE
const O = 18 // debelina obrobe
const ROKA = 66 // notranja širina roke
const ROKAV = 82

export const VIEWBOX = '-130 -170 1060 1190'

// --- deli -----------------------------------------------------------------

const pot = (d, fill, extra = '') =>
  `<path d="${d}" fill="${fill}" stroke="${C.crnilo}" stroke-width="${O}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`

function hlace({ sede = false } = {}) {
  if (sede) {
    // Sedi: hlače so širše in krajše, kolena gledajo naprej.
    return pot('M205 690 L595 690 L612 800 Q614 828 586 828 L436 828 Q418 828 412 806 L400 772 L388 806 Q382 828 364 828 L214 828 Q186 828 188 800 Z', C.crnilo)
  }
  return pot('M222 690 L598 690 L582 812 Q578 834 552 834 L446 834 Q424 834 420 812 L410 770 L400 812 Q396 834 374 834 L268 834 Q242 834 238 812 Z', C.crnilo)
}

function noge({ sede = false, viseca = false } = {}) {
  const y = sede ? 822 : 828
  const visina = sede ? 52 : 66
  const l = viseca ? -12 : 0
  const nogavica = (x, kot) =>
    `<g transform="rotate(${kot} ${x + 38} ${y})"><rect x="${x}" y="${y}" width="76" height="${visina}" rx="10" fill="${C.krem}" stroke="${C.crnilo}" stroke-width="${O}"/>
     <rect x="${x - 40}" y="${y + visina - 10}" width="160" height="80" rx="40" fill="${C.crnilo}"/>
     <path d="M${x + 4} ${y + visina + 34} l26 -14 M${x + 18} ${y + visina + 44} l26 -14" stroke="${C.krem}" stroke-width="7" stroke-linecap="round"/></g>`
  return nogavica(268, viseca ? 8 : 0) + nogavica(456, viseca ? -8 + l * 0 : 0)
}

function trebuh({ trakovi = false } = {}) {
  // Obroči so pasovi, obrezani na elipso trebuha.
  const pasovi = [
    [382, 438],
    [500, 558],
    [618, 676],
  ]
    .map(([a, b]) => `<rect x="150" y="${a}" width="500" height="${b - a}" fill="${C.krem}"/>`)
    .join('')
  // Naramnice padala (Prosti pad) gredo čez trebuh.
  const naramnice = trakovi
    ? `<path d="M300 336 Q290 520 330 700 M500 336 Q510 520 470 700" fill="none" stroke="${C.crnilo}" stroke-width="30" stroke-linecap="round"/>
       <path d="M300 336 Q290 520 330 700 M500 336 Q510 520 470 700" fill="none" stroke="#5a4a3a" stroke-width="12" stroke-linecap="round"/>
       <rect x="370" y="520" width="60" height="44" rx="8" fill="${C.zlata}" stroke="${C.crnilo}" stroke-width="12"/>
       <path d="M310 540 L370 542 M430 542 L492 540" stroke="${C.crnilo}" stroke-width="24" stroke-linecap="round"/>`
    : ''
  return `<clipPath id="trebuh"><ellipse cx="400" cy="526" rx="234" ry="204"/></clipPath>
    <ellipse cx="400" cy="526" rx="234" ry="204" fill="${C.zelena}"/>
    <g clip-path="url(#trebuh)">${pasovi}${naramnice}</g>
    <ellipse cx="400" cy="526" rx="234" ry="204" fill="none" stroke="${C.crnilo}" stroke-width="${O}"/>`
}

function vrat() {
  return `<rect x="352" y="300" width="96" height="58" rx="6" fill="${C.koza}" stroke="${C.crnilo}" stroke-width="${O}"/>`
}

function oci(vrsta) {
  const L = [351, 191]
  const D = [447, 191]
  const crta = (d) => `<path d="${d}" fill="none" stroke="${C.crnilo}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`
  switch (vrsta) {
    case 'srecne': // ^ ^
      return crta(`M330 198 Q351 172 372 198 M426 198 Q447 172 468 198`)
    case 'spi': // zaprte, navzdol
      return crta(`M330 190 Q351 208 372 190 M426 190 Q447 208 468 190`)
    case 'siroke': // prestrašen
      return `<circle cx="${L[0]}" cy="${L[1] - 4}" r="26" fill="#fff" stroke="${C.crnilo}" stroke-width="10"/><circle cx="${D[0]}" cy="${D[1] - 4}" r="26" fill="#fff" stroke="${C.crnilo}" stroke-width="10"/>
        <circle cx="${L[0]}" cy="${L[1] - 2}" r="10" fill="${C.crnilo}"/><circle cx="${D[0]}" cy="${D[1] - 2}" r="10" fill="${C.crnilo}"/>
        ${crta('M322 146 Q350 132 376 144 M424 144 Q450 132 478 146')}`
    case 'zvito': // pogled vstran, ena obrv gor
      return `<circle cx="${L[0] + 12}" cy="${L[1]}" r="15" fill="${C.crnilo}"/><circle cx="${D[0] + 12}" cy="${D[1]}" r="15" fill="${C.crnilo}"/>
        ${crta('M328 166 L374 172 M424 162 Q448 148 470 160')}`
    case 'zaskrbljen': // obrvi navzgor na sredini
      return `<circle cx="${L[0]}" cy="${L[1] + 4}" r="15" fill="${C.crnilo}"/><circle cx="${D[0]}" cy="${D[1] + 4}" r="15" fill="${C.crnilo}"/>
        ${crta('M326 168 L372 156 M428 156 L474 168')}`
    case 'odlocen': // samozavestne obrvi
      return `<circle cx="${L[0]}" cy="${L[1] + 2}" r="15" fill="${C.crnilo}"/><circle cx="${D[0]}" cy="${D[1] + 2}" r="15" fill="${C.crnilo}"/>
        ${crta('M326 160 L374 170 M426 170 L474 160')}`
    default:
      return `<circle cx="${L[0]}" cy="${L[1]}" r="16" fill="${C.crnilo}"/><circle cx="${D[0]}" cy="${D[1]}" r="16" fill="${C.crnilo}"/>`
  }
}

function usta(vrsta) {
  switch (vrsta) {
    case 'smeh':
      return `<path d="M352 260 Q400 346 448 260 Z" fill="${C.crnilo}" stroke="${C.crnilo}" stroke-width="8" stroke-linejoin="round"/>
        <path d="M386 296 Q400 288 414 296 Q408 304 400 304 Q392 304 386 296 Z" fill="${C.rdeca}"/>`
    case 'o':
      return `<ellipse cx="400" cy="284" rx="14" ry="18" fill="${C.crnilo}"/>`
    case 'valovit':
      return `<path d="M376 284 q8 -8 16 0 t16 0 t16 0" fill="none" stroke="${C.crnilo}" stroke-width="8" stroke-linecap="round"/>`
    case 'nasmeh':
      return `<path d="M380 278 Q400 294 420 278" fill="none" stroke="${C.crnilo}" stroke-width="8" stroke-linecap="round"/>`
    default:
      return ''
  }
}

function glava({ oci: o = 'tocke', usta: u = null, kapaLeti = false } = {}) {
  const oblika = 'M268 192 A132 132 0 0 1 532 192 Q400 98 268 192 Z'
  // Prosti pad: kapa odleti z glave (s črtami gibanja), vidi se plešasto teme.
  const kapa = kapaLeti
    ? `<g transform="translate(60 -120) rotate(18 400 100)">
         <path d="M286 130 A114 114 0 0 1 514 130 Z" fill="${C.crnilo}" stroke="${C.crnilo}" stroke-width="${O}" stroke-linejoin="round"/>
         <rect x="276" y="118" width="248" height="34" rx="14" fill="${C.crnilo}" stroke="${C.crnilo}" stroke-width="${O}"/>
       </g>
       ${crte(['M318 48 q-10 -24 4 -44', 'M372 30 q-8 -24 6 -44'], C.crnilo, 9)}`
    : `<path d="${oblika}" fill="${C.crnilo}"/>`
  return `<circle cx="400" cy="182" r="124" fill="${C.koza}" stroke="${C.crnilo}" stroke-width="${O}"/>
    ${kapa}
    ${oci(o)}
    ${usta(u)}
    <path d="M400 244 C382 222 338 218 312 236 C322 266 362 284 400 262 C438 284 478 266 488 236 C462 218 418 222 400 244 Z" fill="${C.crnilo}"/>`
}

/**
 * Roka: rama → komolec → dlan. Rokav do komolca, nato koža, na koncu dlan.
 * `dlan: false` izpusti dlan (drži jo rekvizit, ki jo prekrije).
 */
function roka(rama, komolec, dlan, { brezDlani = false, trak = false } = {}) {
  const P = (p) => `${p[0]} ${p[1]}`
  const cela = `M${P(rama)} L${P(komolec)} L${P(dlan)}`
  const zgornja = `M${P(rama)} L${P(komolec)}`
  const spodnja = `M${P(komolec)} L${P(dlan)}`
  const s = (d, w, barva) =>
    `<path d="${d}" fill="none" stroke="${barva}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
  let out =
    s(cela, ROKA + 2 * O, C.crnilo) +
    s(spodnja, ROKA, C.koza) +
    s(zgornja, ROKAV + 2 * O, C.crnilo) +
    s(zgornja, ROKAV, C.zelena)
  if (trak) {
    // Kapetanski trak čez sredino nadlakti.
    const mx = (rama[0] + komolec[0]) / 2
    const my = (rama[1] + komolec[1]) / 2
    const kot = (Math.atan2(komolec[1] - rama[1], komolec[0] - rama[0]) * 180) / Math.PI
    out += `<g transform="translate(${mx} ${my}) rotate(${kot})">
      <rect x="-20" y="${-(ROKAV / 2 + 10)}" width="40" height="${ROKAV + 20}" rx="6" fill="${C.zlata}" stroke="${C.crnilo}" stroke-width="10"/>
      <text x="0" y="0" transform="rotate(${-kot})" text-anchor="middle" dominant-baseline="central" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="34" fill="${C.crnilo}">C</text></g>`
  }
  if (!brezDlani) out += `<circle cx="${dlan[0]}" cy="${dlan[1]}" r="38" fill="${C.koza}" stroke="${C.crnilo}" stroke-width="${O}"/>`
  return out
}

/** Prst (kazalec) iz dlani v smeri `kot` (stopinje). */
function prst(dlan, kot, dolzina = 54) {
  const r = (kot * Math.PI) / 180
  const k = [dlan[0] + Math.cos(r) * dolzina, dlan[1] + Math.sin(r) * dolzina]
  return `<path d="M${dlan[0]} ${dlan[1]} L${k[0]} ${k[1]}" stroke="${C.crnilo}" stroke-width="${22 + 2 * O - 8}" stroke-linecap="round"/>
    <path d="M${dlan[0]} ${dlan[1]} L${k[0]} ${k[1]}" stroke="${C.koza}" stroke-width="22" stroke-linecap="round"/>
    <circle cx="${dlan[0]}" cy="${dlan[1]}" r="38" fill="${C.koza}" stroke="${C.crnilo}" stroke-width="${O}"/>
    <path d="M${dlan[0]} ${dlan[1]} L${(dlan[0] + k[0]) / 2} ${(dlan[1] + k[1]) / 2}" stroke="${C.koza}" stroke-width="22" stroke-linecap="round"/>`
}

// --- rekviziti ---------------------------------------------------------------

/** Vrček piva; (x, y) je sredina dlani, ki ga drži. */
function pivo(x, y, kot = 0) {
  return `<g data-rekvizit="pivo" transform="translate(${x} ${y}) rotate(${kot})">
    <path d="M60 -50 Q118 -50 118 2 Q118 50 60 50" fill="none" stroke="${C.crnilo}" stroke-width="${O + 12}"/>
    <rect x="-74" y="-92" width="148" height="160" rx="14" fill="${C.pivo}" stroke="${C.crnilo}" stroke-width="${O}"/>
    <rect x="-44" y="-58" width="16" height="96" rx="8" fill="#f3c766"/>
    <path d="M-80 -86 Q-82 -128 -46 -124 Q-30 -150 0 -132 Q24 -152 48 -128 Q86 -132 80 -86 Z" fill="${C.pena}" stroke="${C.crnilo}" stroke-width="${O}" stroke-linejoin="round"/>
  </g>`
}

/** Sok s slamico (mladinske lige) — namesto piva. */
function sok(x, y, kot = 0) {
  return `<g data-rekvizit="sok" transform="translate(${x} ${y}) rotate(${kot})">
    <path d="M30 -102 L44 -150 L84 -160" fill="none" stroke="${C.crnilo}" stroke-width="${O + 10}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M30 -102 L44 -150 L84 -160" fill="none" stroke="${C.rdeca}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="-60" y="-104" width="120" height="170" rx="10" fill="${C.krem}" stroke="${C.crnilo}" stroke-width="${O}"/>
    <rect x="-60" y="-20" width="120" height="50" fill="${C.zelena}"/>
    <circle cx="0" cy="-56" r="26" fill="${C.pivo}" stroke="${C.crnilo}" stroke-width="10"/>
    <path d="M0 -82 q10 -16 22 -12" fill="none" stroke="${C.zelena}" stroke-width="9" stroke-linecap="round"/>
    <rect x="-60" y="-104" width="120" height="170" rx="10" fill="none" stroke="${C.crnilo}" stroke-width="${O}"/>
  </g>`
}

function pijaca(mladi, x, y, kot = 0) {
  return mladi ? sok(x, y, kot) : pivo(x, y, kot)
}

function pokal(x, y, kot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${kot})">
    <path d="M-70 -150 Q-128 -150 -122 -104 Q-116 -60 -58 -56" fill="none" stroke="${C.crnilo}" stroke-width="${O + 14}" stroke-linecap="round"/>
    <path d="M70 -150 Q128 -150 122 -104 Q116 -60 58 -56" fill="none" stroke="${C.crnilo}" stroke-width="${O + 14}" stroke-linecap="round"/>
    <path d="M-70 -150 Q-128 -150 -122 -104 Q-116 -60 -58 -56" fill="none" stroke="${C.zlata}" stroke-width="12" stroke-linecap="round"/>
    <path d="M70 -150 Q128 -150 122 -104 Q116 -60 58 -56" fill="none" stroke="${C.zlata}" stroke-width="12" stroke-linecap="round"/>
    <path d="M-82 -166 L82 -166 Q82 -44 0 -26 Q-82 -44 -82 -166 Z" fill="${C.zlata}" stroke="${C.crnilo}" stroke-width="${O}" stroke-linejoin="round"/>
    <path d="M-50 -144 Q-50 -80 -20 -60" fill="none" stroke="#f6d77a" stroke-width="12" stroke-linecap="round"/>
    <rect x="-18" y="-34" width="36" height="40" fill="${C.zlata}" stroke="${C.crnilo}" stroke-width="${O}"/>
    <rect x="-56" y="2" width="112" height="40" rx="8" fill="${C.crnilo}"/>
    <path d="M0 -136 l10 22 l24 2 l-18 16 l6 24 l-22 -12 l-22 12 l6 -24 l-18 -16 l24 -2 z" fill="${C.pena}" stroke="${C.crnilo}" stroke-width="6" stroke-linejoin="round"/>
  </g>`
}

function karta(x, y, kot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${kot})">
    <rect x="-56" y="-80" width="112" height="160" rx="14" fill="${C.pena}" stroke="${C.crnilo}" stroke-width="${O}"/>
    <text x="-30" y="-38" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="38" fill="${C.zelena}">A</text>
    <path d="M0 -24 C-34 4 -40 20 -22 32 C-12 38 -4 34 0 26 C4 34 12 38 22 32 C40 20 34 4 0 -24 Z M0 22 L-10 54 L10 54 Z" fill="${C.zelena}"/>
  </g>`
}

function balon(x, y, barva, vrvicaDo) {
  return `<path d="M${x} ${y + 92} Q${(x + vrvicaDo[0]) / 2 + 20} ${(y + vrvicaDo[1]) / 2} ${vrvicaDo[0]} ${vrvicaDo[1]}" fill="none" stroke="${C.crnilo}" stroke-width="5"/>
    <ellipse cx="${x}" cy="${y}" rx="74" ry="88" fill="${barva}" stroke="${C.crnilo}" stroke-width="${O}"/>
    <path d="M${x - 12} ${y + 86} l12 16 l12 -16 z" fill="${barva}" stroke="${C.crnilo}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M${x - 40} ${y - 30} Q${x - 36} ${y - 62} ${x - 10} ${y - 70}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="14" stroke-linecap="round"/>`
}

function zlica(x, y, kot) {
  return `<g transform="translate(${x} ${y}) rotate(${kot})">
    <rect x="-26" y="-40" width="52" height="420" rx="26" fill="${C.les}" stroke="${C.crnilo}" stroke-width="${O}"/>
    <ellipse cx="0" cy="-160" rx="104" ry="136" fill="${C.les}" stroke="${C.crnilo}" stroke-width="${O}"/>
    <ellipse cx="0" cy="-160" rx="68" ry="96" fill="${C.lesTemen}"/>
    <path d="M-34 -196 Q-30 -222 -6 -230" fill="none" stroke="#e7b989" stroke-width="12" stroke-linecap="round"/>
    <path d="M-6 120 q8 40 0 80 M6 260 q-6 30 0 60" fill="none" stroke="${C.lesTemen}" stroke-width="6" stroke-linecap="round"/>
  </g>`
}

function kovanec(x, y) {
  return `<g transform="translate(${x} ${y})">
    <path d="M-110 -40 l-26 -10 M-100 -86 l-20 -22 M-60 -112 l-8 -26 M110 -40 l26 -10 M100 -86 l20 -22 M60 -112 l8 -26" stroke="${C.zlata}" stroke-width="12" stroke-linecap="round"/>
    <circle r="78" fill="${C.zlata}" stroke="${C.crnilo}" stroke-width="${O}"/>
    <circle r="54" fill="none" stroke="#b9861a" stroke-width="8"/>
    <path d="M0 -40 l12 26 l28 3 l-21 19 l6 28 l-25 -14 l-25 14 l6 -28 l-21 -19 l28 -3 z" fill="${C.pena}" stroke="${C.crnilo}" stroke-width="7" stroke-linejoin="round"/>
  </g>`
}

function klop() {
  return `<rect x="70" y="800" width="660" height="56" rx="12" fill="${C.les}" stroke="${C.crnilo}" stroke-width="${O}"/>
    <path d="M110 818 L280 818 M520 818 L690 818" stroke="${C.lesTemen}" stroke-width="7" stroke-linecap="round"/>
    <rect x="96" y="850" width="44" height="120" fill="${C.lesTemen}" stroke="${C.crnilo}" stroke-width="${O}"/>
    <rect x="660" y="850" width="44" height="120" fill="${C.lesTemen}" stroke="${C.crnilo}" stroke-width="${O}"/>`
}

function solze() {
  const kaplja = (x, y, s = 1) =>
    `<path d="M${x} ${y} q${-16 * s} ${30 * s} 0 ${44 * s} q${16 * s} ${-14 * s} 0 ${-44 * s} z" fill="${C.solza}" stroke="${C.crnilo}" stroke-width="7" stroke-linejoin="round"/>`
  return kaplja(334, 210) + kaplja(466, 210, 0.8) + kaplja(548, 92, 0.9)
}

function zzz() {
  const z = (x, y, s) =>
    `<text x="${x}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${s}" fill="${C.krem}" stroke="${C.crnilo}" stroke-width="${s / 7}" paint-order="stroke" transform="rotate(-12 ${x} ${y})">Z</text>`
  return z(560, 70, 70) + z(640, -10, 92) + z(735, -100, 116)
}

function crte(seznam, barva = C.crnilo, w = 12) {
  return seznam.map((d) => `<path d="${d}" fill="none" stroke="${barva}" stroke-width="${w}" stroke-linecap="round"/>`).join('')
}

// --- poze ----------------------------------------------------------------------

/** Postava brez rok: noge, hlače, trebuh, vrat, glava. */
function telo(o = {}) {
  return noge(o) + hlace(o) + trebuh(o) + vrat() + glava(o)
}

export const POZE = {
  // Manager kroga: pokal visoko, v drugi roki pijača, smeh.
  manager: (mladi) =>
    telo({ oci: 'srecne', usta: 'smeh' }) +
    roka([228, 420], [120, 330], [118, 170], { brezDlani: true }) +
    `<circle cx="118" cy="170" r="38" fill="${C.koza}" stroke="${C.crnilo}" stroke-width="${O}"/>` +
    pokal(112, 150, -8) +
    roka([572, 420], [690, 360], [700, 236]) +
    pijaca(mladi, 708, 232, 10) +
    crte(['M20 -60 l-30 -30', 'M90 -110 l-6 -40', 'M200 -60 l26 -30'], C.zlata, 14),

  // Kapetan kroga: trak na rami, kaže naprej, v drugi roki pijača.
  kapetan: (mladi) =>
    telo({ oci: 'odlocen', usta: 'nasmeh' }) +
    roka([230, 430], [110, 470], [70, 330], { brezDlani: true }) +
    pijaca(mladi, 70, 330, -6) +
    roka([572, 420], [700, 380], [790, 270], { brezDlani: true, trak: true }) +
    prst([790, 270], -55, 62),

  // Skriti adut: prst na ustih, pogled vstran, as za hrbtom.
  adut: () =>
    karta(690, 640, 20) +
    telo({ oci: 'zvito' }) +
    roka([570, 430], [664, 560], [652, 650]) +
    roka([236, 420], [226, 530], [396, 338], { brezDlani: true }) +
    prst([396, 338], -90, 92),

  // Dvigalo: baloni ga dvigujejo, mahne z drugo roko.
  dvigalo: () =>
    balon(80, -60, C.rdeca, [128, 196]) +
    balon(210, -110, C.zlata, [128, 196]) +
    balon(-20, 60, C.zelena, [128, 196]) +
    crte(['M300 1000 l0 -60', 'M400 1010 l0 -80', 'M500 1000 l0 -60'], C.crnilo, 12) +
    telo({ oci: 'srecne', usta: 'smeh', viseca: true }) +
    roka([228, 420], [140, 320], [128, 196]) +
    roka([572, 420], [690, 360], [720, 230]) +
    crte(['M770 180 q20 20 0 40', 'M800 160 q34 34 0 70'], C.crnilo, 10),

  // Prosti pad: drži odtrgano ročko padala, kapa mu leti z glave.
  padec: () =>
    crte(['M130 -20 l0 -110', 'M230 -60 l0 -80', 'M640 -40 l0 -100', 'M740 0 l0 -80'], C.crnilo, 12) +
    `<g transform="rotate(-6 400 500)">` +
    telo({ oci: 'siroke', usta: 'o', trakovi: true, kapaLeti: true, viseca: true }) +
    roka([230, 420], [120, 300], [60, 160]) +
    roka([572, 420], [700, 420], [770, 300], { brezDlani: true }) +
    `<path d="M770 300 Q840 380 790 470 Q750 540 800 600" fill="none" stroke="${C.crnilo}" stroke-width="8"/>
     <circle cx="770" cy="290" r="44" fill="none" stroke="${C.crnilo}" stroke-width="${O + 14}"/>
     <circle cx="770" cy="290" r="44" fill="none" stroke="${C.rdeca}" stroke-width="14"/>
     <circle cx="770" cy="300" r="38" fill="${C.koza}" stroke="${C.crnilo}" stroke-width="${O}"/>` +
    `</g>` +
    `<text x="830" y="160" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="110" fill="${C.krem}" stroke="${C.crnilo}" stroke-width="16" paint-order="stroke">?</text>`,

  // Zlato na klopi: zaspal na klopi, ob njem zlatnik.
  klop: () =>
    klop() +
    kovanec(640, 720) +
    `<g transform="translate(-60 30)">` +
    telo({ oci: 'spi', sede: true }) +
    roka([232, 430], [200, 600], [330, 640]) +
    roka([568, 430], [600, 600], [470, 640]) +
    `</g>` +
    zzz(),

  // Lesena žlica: drži veliko žlico, solza, zadrega.
  zlica: () =>
    telo({ oci: 'zaskrbljen', usta: 'valovit' }) +
    solze() +
    zlica(560, 470, 40) +
    roka([230, 430], [170, 600], [393, 669]) +
    roka([570, 430], [676, 566], [496, 547]),

  // Naslednji krog je tvoj: palec gor (namesto žlice dvakrat zapored).
  spodbuda: (mladi) =>
    telo({ oci: 'tocke', usta: 'nasmeh' }) +
    roka([230, 430], [120, 470], [80, 340], { brezDlani: true }) +
    pijaca(mladi, 80, 340, -6) +
    roka([572, 420], [690, 470], [720, 330], { brezDlani: true }) +
    `<path d="M716 300 L716 236" stroke="${C.crnilo}" stroke-width="54" stroke-linecap="round"/>
     <path d="M716 300 L716 236" stroke="${C.koza}" stroke-width="24" stroke-linecap="round"/>
     <rect x="672" y="290" width="92" height="84" rx="30" fill="${C.koza}" stroke="${C.crnilo}" stroke-width="${O}"/>
     <path d="M716 300 L716 252" stroke="${C.koza}" stroke-width="24" stroke-linecap="round"/>
     <path d="M690 320 h50 M690 344 h50" stroke="${C.crnilo}" stroke-width="7" stroke-linecap="round"/>`,
}

/** Poze z alkoholom imajo različico `-mladi`. */
export const S_PIJACO = ['manager', 'kapetan', 'spodbuda']

export function svgPoze(poza, mladi = false) {
  const telo = POZE[poza](mladi)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="1060" height="1190">${telo}</svg>\n`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const mapa = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'logo', 'maskota')
  mkdirSync(mapa, { recursive: true })
  for (const poza of Object.keys(POZE)) {
    writeFileSync(join(mapa, `${poza}.svg`), svgPoze(poza, false))
    if (S_PIJACO.includes(poza)) writeFileSync(join(mapa, `${poza}-mladi.svg`), svgPoze(poza, true))
  }
  console.log(`Poze v ${mapa}`)
}
