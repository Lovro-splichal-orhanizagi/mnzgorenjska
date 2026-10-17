// Slike za predogled povezave (og:image, 1200 × 630): igralec, klub, tekma,
// liga, javna mini liga in povabilo v mini ligo.
//
// Riše se na platno @napi-rs/canvas, ki ima isti Canvas 2D API kot brskalnik,
// zato je risanje skoraj prepis kartice igralca (src/components/KarticaIgralca.tsx)
// in plakata (src/components/Plakat.tsx): iste barve, iste oblike, isti
// postopek "pomanjšaj, nato skrajšaj s …". Spremembo oblike tam prenesi sem.
//
// Pisave (pisave/, vse OFL): Inter (statične debeline — spremenljivi
// InterVariable iz public/fonts platno ne zna nastaviti debeline), Barlow
// Condensed (ozka, kot na kartici), za cirilico in grščino v ozki vlogi Fira
// Sans Extra Condensed, armenščina in gruzinščina Noto Sans. Kontejner nima
// sistemskih pisav, zato besedilo razreže na odseke po pisavi, ki znak ima
// (`odseki`), in ne zaupa nadomeščanju platna.
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const SIRINA = 1200
export const VISINA = 630

const KREM = '#F3EDE0'
const ZLATA = '#D9A21B'
const CRNILO = '#241C0C'
const kremna = (a) => `rgba(243,237,224,${a})`

// --- pisave -----------------------------------------------------------------

const DRUZINE = {
  BarlowCondensed: 'Barlow Condensed',
  FiraSansExtraCondensed: 'Fira Sans Extra Condensed',
  NotoSansArmenian: 'Noto Sans Armenian',
  NotoSansGeorgian: 'Noto Sans Georgian',
  Inter: 'Inter',
}

/** Registrira pisave iz mape. Vrne imena naloženih družin. */
export function naloziPisave(mapa) {
  const nalozene = new Set()
  if (!existsSync(mapa)) return nalozene
  for (const ime of readdirSync(mapa)) {
    const druzina = /\.(ttf|otf|woff2?)$/.test(ime) && DRUZINE[ime.split(/[-.]/)[0]]
    if (druzina && GlobalFonts.registerFromPath(join(mapa, ime), druzina)) nalozene.add(druzina)
  }
  return nalozene
}

const ARMENSKO = /[԰-֏ﬓ-ﬗ]/
const GRUZINSKO = /[Ⴀ-ჿᲐ-Ჿⴀ-⴯]/
const CIRILICA_GRSCINA = /[Ͱ-Ͽἀ-῿Ѐ-ԯ]/

/**
 * Besedilo razreže na odseke z eno pisavo. `ozka` je vloga Barlow Condensed;
 * besedilo s cirilico ali grščino v tej vlogi dobi Fira Sans Extra Condensed
 * (cel niz, da so števke in presledki iste pisave), armenski in gruzinski znaki
 * gredo v Noto Sans, vse drugo v Inter.
 */
export function odseki(besedilo, ozka) {
  const osnova = ozka ? (CIRILICA_GRSCINA.test(besedilo) ? 'Fira Sans Extra Condensed' : 'Barlow Condensed') : 'Inter'
  const out = []
  for (const z of besedilo) {
    const druzina = ARMENSKO.test(z) ? 'Noto Sans Armenian' : GRUZINSKO.test(z) ? 'Noto Sans Georgian' : osnova
    const zadnji = out[out.length - 1]
    if (zadnji && (zadnji.druzina === druzina || (z === ' ' && zadnji.druzina !== osnova))) zadnji.t += z
    else out.push({ t: z, druzina })
  }
  return out
}

// Noto Sans ima tri debeline, Fira dve: najbližja.
const debelina = (druzina, teza) =>
  druzina.startsWith('Noto') ? (teza >= 800 ? 800 : teza >= 700 ? 700 : 600) : druzina.startsWith('Fira') ? (teza >= 800 ? 800 : 700) : teza

/** Pisalo: meri in piše besedilo z odseki, z razmikom med črkami. */
function pisalo(c) {
  const pisava = (d, teza, px) => `${debelina(d, teza)} ${px}px "${d}"`
  const sirina = (besedilo, { teza, px, ozka = false, razmik = 0 }) => {
    let w = 0
    c.letterSpacing = `${razmik}px`
    for (const o of odseki(besedilo, ozka)) {
      c.font = pisava(o.druzina, teza, px)
      w += c.measureText(o.t).width
    }
    c.letterSpacing = '0px'
    return w
  }
  /**
   * Napiše besedilo v širino `najvec`: pomanjša do `najmanj`, nato skrajša s
   * "…" (kot `napisi` na kartici). `poravnava`: left | center | right.
   * Vrne { px, w } (uporabljena velikost in širina).
   */
  const napisi = (besedilo, x, y, { teza = 700, px, najmanj = px, najvec = Infinity, ozka = false, barva = KREM, poravnava = 'left', razmik = 0 }) => {
    besedilo = String(besedilo ?? '')
    const r = (v) => (typeof razmik === 'function' ? razmik(v) : razmik)
    let v = px
    while (v > najmanj && sirina(besedilo, { teza, px: v, ozka, razmik: r(v) }) > najvec) v -= 2
    let b = besedilo
    if (sirina(b, { teza, px: v, ozka, razmik: r(v) }) > najvec) {
      while (b.length > 1 && sirina(`${b}…`, { teza, px: v, ozka, razmik: r(v) }) > najvec) b = [...b].slice(0, -1).join('')
      b = `${b.trimEnd()}…`
    }
    const w = sirina(b, { teza, px: v, ozka, razmik: r(v) })
    let xx = poravnava === 'center' ? x - w / 2 : poravnava === 'right' ? x - w : x
    c.textAlign = 'left'
    c.fillStyle = barva
    c.letterSpacing = `${r(v)}px`
    for (const o of odseki(b, ozka)) {
      c.font = pisava(o.druzina, teza, v)
      c.fillText(o.t, xx, y)
      xx += c.measureText(o.t).width
    }
    c.letterSpacing = '0px'
    return { px: v, w }
  }
  /** Razlomi po besedah v največ `vrstic` vrstic (zadnja se skrajša). */
  const vVrstice = (besedilo, najvec, mere, vrstic) => {
    const besede = String(besedilo).split(/\s+/).filter(Boolean)
    const out = []
    let vrsta = ''
    for (const b of besede) {
      const x = vrsta ? `${vrsta} ${b}` : b
      if (!vrsta || sirina(x, mere) <= najvec) vrsta = x
      else {
        out.push(vrsta)
        vrsta = b
      }
    }
    if (vrsta) out.push(vrsta)
    if (out.length > vrstic) return [...out.slice(0, vrstic - 1), out.slice(vrstic - 1).join(' ')]
    return out
  }
  return { sirina, napisi, vVrstice }
}

// --- skupni deli -------------------------------------------------------------

function novoPlatno() {
  const p = createCanvas(SIRINA, VISINA)
  return { p, c: p.getContext('2d') }
}

/** Fotografija igrišča s prevleko, kot na plakatu (Plakat.tsx), za ležečo obliko. */
function igrisce(c, foto) {
  if (foto) {
    const r = Math.max(SIRINA / foto.width, VISINA / foto.height)
    c.drawImage(foto, (SIRINA - foto.width * r) / 2, (VISINA - foto.height * r) / 2 - 20, foto.width * r, foto.height * r)
  } else {
    c.fillStyle = '#0E1F17'
    c.fillRect(0, 0, SIRINA, VISINA)
  }
  const g = c.createLinearGradient(0, 0, 0, VISINA)
  g.addColorStop(0, 'rgba(8,24,17,.55)')
  g.addColorStop(0.45, 'rgba(8,24,17,.78)')
  g.addColorStop(1, 'rgba(6,18,13,.96)')
  c.fillStyle = g
  c.fillRect(0, 0, SIRINA, VISINA)
}

/** Zelena kot ozadje kartice igralca. */
function zelena(c) {
  const bg = c.createRadialGradient(SIRINA * 0.3, VISINA * 0.5, 60, SIRINA * 0.3, VISINA * 0.5, SIRINA * 0.85)
  bg.addColorStop(0, '#1A5A3E')
  bg.addColorStop(1, '#06170F')
  c.fillStyle = bg
  c.fillRect(0, 0, SIRINA, VISINA)
  c.strokeStyle = kremna(0.06)
  c.lineWidth = 3
  c.beginPath()
  c.arc(SIRINA * 0.3, VISINA * 0.5, 250, 0, Math.PI * 2)
  c.stroke()
}

/** Do tri začetnice kluba, kot `zacetniceKluba` v src/lib/pomozno.ts. */
export function zacetnice(ime, kratko) {
  if (kratko) return kratko.slice(0, 3).toUpperCase()
  return String(ime ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .map((d) => d.match(/[\p{L}\p{N}]/u)?.[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

/** Slika v kvadrat `d` s središčem (cx, cy), razmerje ohranjeno. */
function vKvadrat(c, slika, cx, cy, d) {
  const r = d / Math.max(slika.width, slika.height)
  c.drawImage(slika, cx - (slika.width * r) / 2, cy - (slika.height * r) / 2, slika.width * r, slika.height * r)
}

/**
 * Grb na kremni plošči (grbi z belim ozadjem in JPG sicer izgledajo kot bel
 * kvadrat); brez grba začetnice kluba — mesto ne sme ostati prazno.
 */
function grbNaPlosci(c, pis, slika, klub, kratko, x, y, d, { krog = false } = {}) {
  c.save()
  c.shadowColor = 'rgba(0,0,0,.45)'
  c.shadowBlur = 24
  c.shadowOffsetY = 8
  if (krog) {
    c.beginPath()
    c.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2)
  } else {
    c.beginPath()
    c.roundRect(x, y, d, d, d * 0.18)
  }
  c.fillStyle = '#FFF8E4'
  c.fill()
  c.restore()
  if (slika) vKvadrat(c, slika, x + d / 2, y + d / 2, d * (krog ? 0.7 : 0.78))
  else pis.napisi(zacetnice(klub, kratko), x + d / 2, y + d / 2 + d * 0.15, { teza: 800, px: Math.round(d * 0.42), najmanj: 14, najvec: d * 0.8, ozka: true, barva: CRNILO, poravnava: 'center' })
}

/** Zlata črtica pod oznako, kot na plakatu. */
function crtica(c, x, y) {
  c.fillStyle = ZLATA
  c.fillRect(x, y, 64, 5)
}

/** Znak SLFF in pod njim "slff.eu", desno zgoraj. */
function znamka(c, pis, slike, d = 104) {
  const x = SIRINA - 56 - d
  if (slike.slff) c.drawImage(slike.slff, x, 40, d, d)
  pis.napisi('slff.eu', x + d / 2, 40 + d + 36, { teza: 900, px: 26, barva: KREM, poravnava: 'center' })
}

const stevilo = (b, n, decimalk = 0) => b.stevilo(Number(n ?? 0), decimalk)
/** Točke kot v vmesniku: cela brez decimalk, sicer ena (formatirajTocke). */
const tocke = (b, n) => (Number.isInteger(Number(n)) ? String(Number(n)) : stevilo(b, n, 1))

// --- igralec: kartica FUT ----------------------------------------------------

/**
 * Kartica igralca levo (oblika in razporeditev iz KarticaIgralca.tsx, v
 * koordinatah kartice 740 × 1040, pomanjšana), desno ime, klub, liga in sezona.
 */
function kartica(c, pis, p, b, slike) {
  const cw = 740
  const ch = 1040
  const s = 560 / ch
  const ox = 96
  const oy = (VISINA - ch * s) / 2
  c.save()
  c.translate(ox, oy)
  c.scale(s, s)
  const oblika = (k = 0) => {
    c.beginPath()
    c.moveTo(k, 110)
    c.lineTo(110, k)
    c.lineTo(cw - 110, k)
    c.lineTo(cw - k, 110)
    c.lineTo(cw - k, ch - 190)
    c.quadraticCurveTo(cw - k, ch - 110, cw / 2, ch - k)
    c.quadraticCurveTo(k, ch - 110, k, ch - 190)
    c.closePath()
  }
  c.save()
  c.shadowColor = 'rgba(0,0,0,.55)'
  c.shadowBlur = 50
  c.shadowOffsetY = 18
  oblika()
  const zl = c.createLinearGradient(0, 0, cw, ch)
  zl.addColorStop(0, '#F8E3A0')
  zl.addColorStop(0.45, '#E2B04A')
  zl.addColorStop(1, '#B5832A')
  c.fillStyle = zl
  c.fill()
  c.restore()
  c.save()
  oblika()
  c.clip()
  const lesk = c.createLinearGradient(0, 0, cw * 0.7, ch * 0.5)
  lesk.addColorStop(0, 'rgba(255,255,255,0)')
  lesk.addColorStop(0.5, 'rgba(255,255,255,.28)')
  lesk.addColorStop(0.62, 'rgba(255,255,255,0)')
  c.fillStyle = lesk
  c.fillRect(0, 0, cw, ch)
  c.restore()
  oblika(18)
  c.strokeStyle = 'rgba(255,246,210,.7)'
  c.lineWidth = 4
  c.stroke()

  // levo zgoraj: ocena = točke sezone, pozicija, grb
  const lx = 150
  pis.napisi(tocke(b, p.tocke), lx, 250, { teza: 800, px: 170, najmanj: 110, najvec: 190, ozka: true, barva: CRNILO, poravnava: 'center' })
  pis.napisi(p.pozicija ? b.t(`skupno.pozicijaKratko.${p.pozicija}`) : '—', lx, 320, { teza: 700, px: 64, najmanj: 40, najvec: 180, ozka: true, barva: CRNILO, poravnava: 'center' })
  c.fillStyle = 'rgba(36,28,12,.35)'
  c.fillRect(lx - 50, 348, 100, 3)
  const G = 104
  c.beginPath()
  c.arc(lx, 372 + G / 2, G / 2, 0, Math.PI * 2)
  c.fillStyle = '#FFF8E4'
  c.fill()
  c.lineWidth = 3
  c.strokeStyle = 'rgba(36,28,12,.35)'
  c.stroke()
  if (slike.grb) vKvadrat(c, slike.grb, lx, 372 + G / 2, G * 0.72)
  else pis.napisi(zacetnice(p.klub, p.klubKratko), lx, 372 + G / 2 + 16, { teza: 800, px: 46, najmanj: 28, najvec: G - 20, ozka: true, barva: CRNILO, poravnava: 'center' })
  // desno velika številka dresa
  if (p.stevilka != null) pis.napisi(String(p.stevilka), cw * 0.64, 520, { teza: 800, px: 430, ozka: true, barva: 'rgba(36,28,12,.16)', poravnava: 'center' })

  // ime in klub
  pis.napisi(p.priimek.toLocaleUpperCase(b.lokale), cw / 2, 620, { teza: 800, px: 96, najmanj: 56, najvec: cw - 120, ozka: true, barva: CRNILO, poravnava: 'center' })
  pis.napisi(p.klub, cw / 2, 666, { teza: 700, px: 38, najmanj: 28, najvec: cw - 160, ozka: true, barva: 'rgba(36,28,12,.72)', poravnava: 'center' })
  c.fillStyle = 'rgba(36,28,12,.35)'
  c.fillRect(90, 692, cw - 180, 3)

  // statistika sezone: levo goli, asistence, minute; desno točke in cena
  const st = [
    [String(p.goli ?? 0), b.t('igralci.kartica.stat.gol')],
    [String(p.asistence ?? 0), b.t('igralci.kartica.stat.ast')],
    [String(p.minute ?? 0), b.t('igralci.kartica.stat.min')],
    [tocke(b, p.tocke), b.t('igralci.kartica.stat.sez')],
    ...(p.cena != null ? [[stevilo(b, p.cena, 1), b.t('igralci.kartica.stat.cena')]] : []),
  ]
  const kol = [cw * 0.3, cw * 0.7]
  st.forEach(([v, o], i) => {
    const cx = kol[i < 3 ? 0 : 1]
    const cy = 768 + (i % 3) * 66
    pis.napisi(v, cx - 8, cy, { teza: 800, px: 60, najmanj: 40, najvec: cx - 8 - (i < 3 ? 70 : cw / 2 + 12), ozka: true, barva: CRNILO, poravnava: 'right' })
    pis.napisi(o, cx + 8, cy, { teza: 600, px: 44, najmanj: 26, najvec: cw - 60 - (cx + 8), ozka: true, barva: 'rgba(36,28,12,.75)' })
  })
  c.fillStyle = 'rgba(36,28,12,.35)'
  c.fillRect(cw / 2 - 1.5, 722, 3, 184)
  if (slike.slff) c.drawImage(slike.slff, cw / 2 - 34, ch - 116, 68, 68)
  c.restore()
}

export function igralec(p, b, slike) {
  const { p: pl, c } = novoPlatno()
  const pis = pisalo(c)
  zelena(c)
  kartica(c, pis, p, b, slike)
  const x = 560
  const sir = SIRINA - x - 56
  znamka(c, pis, slike, 72)
  pis.napisi(p.liga, x, 92, { teza: 600, px: 26, najmanj: 18, najvec: sir - 120, barva: kremna(0.7) })
  crtica(c, x, 112)
  if (p.ime) pis.napisi(p.ime, x, 194, { teza: 700, px: 44, najmanj: 26, najvec: sir, barva: kremna(0.88) })
  const priimek = p.priimek.toLocaleUpperCase(b.lokale)
  // Pod imenom je prostor za strešice velikih črk (GÜNEŞ, ŠTEFANČIČ).
  pis.napisi(priimek, x - 4, 310, { teza: 800, px: 118, najmanj: 60, najvec: sir, ozka: true, barva: KREM })
  pis.napisi(p.klub, x, 360, { teza: 800, px: 38, najmanj: 24, najvec: sir, barva: ZLATA })
  const poz = p.pozicija ? b.t(`skupno.pozicija.${p.pozicija}`) : null
  if (poz) pis.napisi(poz, x, 402, { teza: 600, px: 28, najmanj: 20, najvec: sir, barva: kremna(0.72) })
  // velika številka: točke sezone; pod njo goli, tekme in cena
  const t = tocke(b, p.tocke)
  const { w } = pis.napisi(t, x - 4, 520, { teza: 900, px: 104, najmanj: 60, najvec: 300, barva: KREM, razmik: -3 })
  pis.napisi(b.t('igralci.kartica.tockVSezoni', { beseda: b.t('skupno.besede.tocke', { n: Number(p.tocke ?? 0) }) }), x + w + 14, 516, { teza: 700, px: 30, najmanj: 20, najvec: sir - w - 14, barva: ZLATA })
  const vrsta = [
    b.mn('goli', p.goli ?? 0),
    b.mn('tekme', p.tekme ?? 0),
    p.cena != null ? b.t('skupno.cena', { v: stevilo(b, p.cena, 1) }) : null,
  ].filter(Boolean)
  pis.napisi(vrsta.join(' · '), x, 566, { teza: 600, px: 28, najmanj: 20, najvec: sir, barva: kremna(0.78) })
  return pl
}

// --- klub: plakat kluba --------------------------------------------------------

export function klub(p, b, slike) {
  const { p: pl, c } = novoPlatno()
  const pis = pisalo(c)
  igrisce(c, slike.igrisce)
  const R = 64
  const D = 148
  grbNaPlosci(c, pis, slike.grb, p.klub, p.klubKratko, R, 48, D)
  const x = R + D + 36
  pis.napisi(p.liga, x, 108, { teza: 600, px: 28, najmanj: 18, najvec: SIRINA - x - 220, barva: kremna(0.75) })
  if (p.mesto) pis.napisi(b.t('lestvice.mesto', { mesto: p.mesto }), x, 160, { teza: 800, px: 44, najmanj: 28, najvec: SIRINA - x - 220, barva: ZLATA })
  znamka(c, pis, slike)
  // Ime čez vso širino, dolgo v dveh vrsticah (kot ime lige na plakatu "je live").
  const ime = p.klub.toLocaleUpperCase(b.lokale)
  const sir = SIRINA - 2 * R
  const mere = (v) => ({ teza: 900, px: v })
  let px = 112
  let vrste = [ime]
  for (; px > 44; px -= 4) {
    vrste = pis.vVrstice(ime, sir, mere(px), px > 76 ? 1 : 2)
    if (vrste.every((v) => pis.sirina(v, mere(px)) <= sir)) break
  }
  // Pod ploščo z grbom (spodaj na 196), s prostorom za strešice (ŠENČUR): ena vrstica na 334, dve od 236 navzdol.
  let y = vrste.length > 1 ? 236 + px * 0.76 : 334
  for (const v of vrste) {
    pis.napisi(v, R - 4, y, { teza: 900, px, najmanj: 36, najvec: sir, barva: KREM })
    y += px * 0.95
  }
  if (p.igralci.length) {
    pis.napisi(b.t('lestvice.plakat.najvecTock'), R, 396, { teza: 600, px: 26, najmanj: 18, najvec: 700, barva: kremna(0.6) })
    crtica(c, R, 412)
    p.igralci.slice(0, 3).forEach((ig, i) => {
      const yy = 472 + i * 56
      const st = tocke(b, ig.tocke)
      const ws = pis.sirina(st, { teza: 900, px: 40 })
      pis.napisi(st, SIRINA - R, yy, { teza: 900, px: 40, barva: ZLATA, poravnava: 'right' })
      pis.napisi(ig.ime, R, yy, { teza: 800, px: 40, najmanj: 24, najvec: sir - ws - 30, barva: KREM })
    })
  } else {
    pis.napisi(b.t('lestvice.plakat.izNasihIgralcev'), R, 420, { teza: 700, px: 38, najmanj: 22, najvec: sir, barva: ZLATA })
  }
  return pl
}

// --- tekma: plakat izida -------------------------------------------------------

export function tekma(p, b, slike) {
  const { p: pl, c } = novoPlatno()
  const pis = pisalo(c)
  igrisce(c, slike.igrisce)
  const sredina = SIRINA / 2
  pis.napisi(p.liga, sredina, 70, { teza: 700, px: 28, najmanj: 18, najvec: 900, barva: kremna(0.8), poravnava: 'center' })
  const pod = [p.krog ? b.t('lestvice.krog', { n: p.krog }) : null, p.datum ? b.datum(p.datum) : null].filter(Boolean).join(' · ')
  if (pod) pis.napisi(pod, sredina, 108, { teza: 600, px: 24, najmanj: 18, najvec: 900, barva: kremna(0.6), poravnava: 'center' })
  const D = 168
  const strani = [
    { cx: 260, ime: p.domaci, kratko: p.domaciKratko, grb: slike.grbDomaci, strelci: p.strelciDomaci },
    { cx: SIRINA - 260, ime: p.gostje, kratko: p.gostjeKratko, grb: slike.grbGostje, strelci: p.strelciGostje },
  ]
  for (const s of strani) {
    grbNaPlosci(c, pis, s.grb, s.ime, s.kratko, s.cx - D / 2, 150, D)
    pis.napisi(s.ime, s.cx, 372, { teza: 800, px: 36, najmanj: 20, najvec: 400, barva: KREM, poravnava: 'center' })
    const vrstice = s.strelci.length > 4 ? [...s.strelci.slice(0, 3), '…'] : s.strelci
    vrstice.forEach((v, i) => pis.napisi(v, s.cx, 418 + i * 34, { teza: 600, px: 24, najmanj: 16, najvec: 380, barva: kremna(0.75), poravnava: 'center' }))
  }
  const izid = p.goliDomaci == null || p.goliGostje == null ? '– : –' : `${p.goliDomaci} : ${p.goliGostje}`
  pis.napisi(izid, sredina, 296, { teza: 900, px: 150, najmanj: 80, najvec: 300, barva: KREM, poravnava: 'center', razmik: -4 })
  c.fillStyle = ZLATA
  c.fillRect(sredina - 32, 330, 64, 5)
  if (slike.slff) c.drawImage(slike.slff, sredina - 36, VISINA - 112, 72, 72)
  pis.napisi('slff.eu', sredina, VISINA - 22, { teza: 900, px: 22, barva: kremna(0.85), poravnava: 'center' })
  return pl
}

// --- liga in mini liga: ime in vrh lestvice -------------------------------------

/** Levo oznaka, ime čez dve vrstici in podnapis; desno do pet vrstic lestvice. */
function lestvica(c, pis, b, slike, { oznaka, ime, podnapis, naslovLestvice, vrstice, zGrbi }) {
  igrisce(c, slike.igrisce)
  const R = 64
  // Brez lestvice je desno maskota (520 visoka), besedilo ostane levo od nje.
  const maskota = slike.maskota ? (slike.maskota.width / slike.maskota.height) * 520 : 0
  const levo = vrstice.length ? 500 : SIRINA - 2 * R - 40 - maskota - 24
  if (slike.slff) c.drawImage(slike.slff, R, 48, 132, 132)
  let y = 250
  if (oznaka) {
    pis.napisi(oznaka, R, y, { teza: 700, px: 30, najmanj: 20, najvec: levo, barva: ZLATA })
    y += 18
  }
  // Ime: največja velikost, pri kateri gre v dve vrstici.
  let px = 92
  let vrste
  const mere = (v) => ({ teza: 900, px: v, razmik: -Math.round(v * 0.03) })
  for (; px > 40; px -= 4) {
    vrste = pis.vVrstice(ime, levo, mere(px), 2)
    if (vrste.every((v) => pis.sirina(v, mere(px)) <= levo)) break
  }
  for (const v of vrste) {
    y += px * 0.98
    pis.napisi(v, R - 3, y, { teza: 900, px, najmanj: 28, najvec: levo, barva: KREM, razmik: (x) => -Math.round(x * 0.03) })
  }
  if (podnapis) pis.napisi(podnapis, R, y + 52, { teza: 600, px: 28, najmanj: 18, najvec: levo, barva: kremna(0.72) })
  if (!vrstice.length) {
    // Še brez lestvice: maskota namesto vrstic.
    if (slike.maskota) c.drawImage(slike.maskota, SIRINA - R - maskota - 40, (VISINA - 520) / 2 - 10, maskota, 520)
    pis.napisi('slff.eu', R, VISINA - 56, { teza: 900, px: 36, barva: KREM })
    return
  }
  const x = 620
  const desno = SIRINA - R
  pis.napisi(naslovLestvice, x, 92, { teza: 600, px: 26, najmanj: 18, najvec: desno - x, barva: kremna(0.6) })
  crtica(c, x, 108)
  vrstice.slice(0, 5).forEach((v, i) => {
    const yy = 174 + i * 80
    pis.napisi(`${v.mesto}.`, x + 34, yy, { teza: 800, px: 32, barva: ZLATA, poravnava: 'right' })
    let ix = x + 52
    if (zGrbi) {
      grbNaPlosci(c, pis, v.slika, v.ime, v.kratko, ix, yy - 40, 52, { krog: true })
      ix += 68
    }
    const st = tocke(b, v.tocke)
    const ws = pis.sirina(st, { teza: 900, px: 36 })
    pis.napisi(st, desno, yy, { teza: 900, px: 36, barva: ZLATA, poravnava: 'right' })
    pis.napisi(v.ime, ix, yy, { teza: 700, px: 32, najmanj: 26, najvec: desno - ws - 24 - ix, barva: KREM })
    if (i < Math.min(vrstice.length, 5) - 1) {
      c.fillStyle = kremna(0.1)
      c.fillRect(x, yy + 26, desno - x, 2)
    }
  })
  pis.napisi('slff.eu', R, VISINA - 56, { teza: 900, px: 36, barva: KREM })
}

export function liga(p, b, slike) {
  const { p: pl, c } = novoPlatno()
  const pis = pisalo(c)
  lestvica(c, pis, b, slike, {
    oznaka: null,
    ime: p.liga,
    podnapis: [p.drzava, p.zveza, p.sezona].filter(Boolean).join(' · '),
    naslovLestvice: b.t('tekme.tabela.naslov'),
    vrstice: p.vrstice.map((v, i) => ({ ...v, slika: slike[`vrstica${i}`] ?? null })),
    zGrbi: true,
  })
  return pl
}

export function miniLiga(p, b, slike) {
  const { p: pl, c } = novoPlatno()
  const pis = pisalo(c)
  lestvica(c, pis, b, slike, {
    oznaka: b.t('lestvice.vstop.miniLiga'),
    ime: p.ime,
    podnapis: [p.liga, b.mn('ekipe', p.ekip)].filter(Boolean).join(' · '),
    naslovLestvice: b.t('lestvice.lestvica.naslov'),
    vrstice: p.vrstice,
    zGrbi: false,
  })
  return pl
}

/** Povabilo v mini ligo: ime lige, število ekip, gumb in maskota. */
export function vabilo(p, b, slike) {
  const { p: pl, c } = novoPlatno()
  const pis = pisalo(c)
  igrisce(c, slike.igrisce)
  const R = 64
  let levo = SIRINA - 2 * R
  if (slike.maskota) {
    const h = 500
    const w = (slike.maskota.width / slike.maskota.height) * h
    c.drawImage(slike.maskota, SIRINA - R - w, VISINA - h - 40, w, h)
    levo = SIRINA - 2 * R - w - 24
  }
  pis.napisi(b.t('lestvice.vstop.naslov'), R, 130, { teza: 700, px: 34, najmanj: 20, najvec: levo, barva: ZLATA })
  crtica(c, R, 150)
  let px = 104
  let vrste
  const mere = (v) => ({ teza: 900, px: v, razmik: -Math.round(v * 0.03) })
  for (; px > 44; px -= 4) {
    vrste = pis.vVrstice(p.ime, levo, mere(px), 2)
    if (vrste.every((v) => pis.sirina(v, mere(px)) <= levo)) break
  }
  let y = 170
  for (const v of vrste) {
    y += px * 0.98
    pis.napisi(v, R - 3, y, { teza: 900, px, najmanj: 30, najvec: levo, barva: KREM, razmik: (x) => -Math.round(x * 0.03) })
  }
  pis.napisi(b.mn('ekipe', p.ekip), R, y + 54, { teza: 600, px: 30, najmanj: 20, najvec: levo, barva: kremna(0.75) })
  // gumb
  const napis = b.t('lestvice.javneLige.pridruziSe')
  const w = Math.min(levo, pis.sirina(napis, { teza: 800, px: 34 }) + 64)
  const gy = VISINA - 150
  c.beginPath()
  c.roundRect(R, gy, w, 70, 35)
  c.fillStyle = ZLATA
  c.fill()
  pis.napisi(napis, R + w / 2, gy + 47, { teza: 800, px: 34, najmanj: 20, najvec: w - 40, barva: CRNILO, poravnava: 'center' })
  pis.napisi('slff.eu', R + w + 28, gy + 47, { teza: 900, px: 30, barva: KREM })
  return pl
}

export const RISBE = { player: igralec, club: klub, match: tekma, league: liga, mini: miniLiga, invite: vabilo }

/** Slika iz bajtov; napaka (pokvarjen grb) vrne null, ne vrže. */
export async function slikaIz(bajti) {
  try {
    return await loadImage(bajti)
  } catch {
    return null
  }
}

/** Platno v JPEG: fotografija igrišča in prelivi so v PNG po 600 kB, WhatsApp vzame do 300 kB. */
export const vJpeg = (platno) => platno.encode('jpeg', 86)
