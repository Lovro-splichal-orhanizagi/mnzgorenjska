// Grafa za dnevno poročilo lijaka (scripts/porocilo-lijaka.mjs) na Discordu:
// lijak skupine (vodoravni stolpci) in trendi 14 dni (štirje mali grafi, vsak
// s svojo osjo — različna merila ne gredo na eno os). Ena barva, ki prestane
// preverbo na temni podlagi; vrednosti v besedilnih barvah, ne v barvi črte.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'

GlobalFonts.registerFromPath(fileURLToPath(new URL('../public/fonts/InterVariable.woff2', import.meta.url)), 'Inter')

const PODLAGA = '#1a1a19'
const BESEDILO = '#f0efec'
const TIHO = '#c3c2b7'
const MREZA = '#3a3a37'
const CRTA = '#3987e5'
const PISAVA = (px, debelina = 400) => `${debelina} ${px}px Inter`

function platno(s, v) {
  const c = createCanvas(s, v)
  const g = c.getContext('2d')
  g.fillStyle = PODLAGA
  g.fillRect(0, 0, s, v)
  return { c, g }
}

/** Pravokotnik z zaobljenim le koncem podatka (desno), začetek ob osi. */
function stolpec(g, x, y, s, v, r = 4) {
  r = Math.min(r, s / 2, v / 2)
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + s - r, y)
  g.arcTo(x + s, y, x + s, y + r, r)
  g.lineTo(x + s, y + v - r)
  g.arcTo(x + s, y + v, x + s - r, y + v, r)
  g.lineTo(x, y + v)
  g.closePath()
  g.fill()
}

const odst = (a, b) => (b ? `${Math.round((100 * a) / b)} %` : '—')

/** Lijak skupine: koraki s številom, deležem registriranih in prehodom. */
export function grafLijaka(s) {
  const koraki = [
    ['Registrirani', s.registriranih],
    ['Sestavil ekipo', s.z_ekipo],
    ['Igral 1. krog', s.krog_1],
    ['Igral 2. krog', s.krog_2],
    ['Aktiven zadnji teden', s.vrnjenih],
  ]
  const S = 1200, V = 120 + koraki.length * 78
  const { c, g } = platno(S, V)
  g.fillStyle = BESEDILO
  g.font = PISAVA(30, 700)
  g.fillText(`Lijak skupine ${s.od} – ${s.do}`, 40, 56)
  g.fillStyle = TIHO
  g.font = PISAVA(20)
  g.fillText('registrirani pred 15–21 dnevi · delež od registriranih · → prehod iz prejšnjega koraka', 40, 88)

  const x0 = 290, sirina = 640, vrh = Math.max(1, koraki[0][1])
  koraki.forEach(([ime, n], i) => {
    const y = 120 + i * 78
    g.fillStyle = BESEDILO
    g.font = PISAVA(22, 600)
    g.textAlign = 'right'
    g.fillText(ime, x0 - 16, y + 34)
    g.textAlign = 'left'
    g.fillStyle = CRTA
    stolpec(g, x0, y + 8, Math.max(3, (sirina * n) / vrh), 40)
    g.fillStyle = BESEDILO
    g.font = PISAVA(22, 700)
    const konec = x0 + Math.max(3, (sirina * n) / vrh) + 12
    g.fillText(`${n}`, konec, y + 36)
    const sir = g.measureText(`${n}`).width
    g.fillStyle = TIHO
    g.font = PISAVA(20)
    g.fillText(i ? `${odst(n, vrh)} · → ${odst(n, koraki[i - 1][1])}` : '100 %', konec + sir + 12, y + 36)
  })
  return c.toBuffer('image/png')
}

/** Mali graf ene vrste: črta 2 px, os od 0, vrh in zadnja vrednost napisana. */
function maliGraf(g, x, y, s, v, naslov, tocke, oblika) {
  g.fillStyle = BESEDILO
  g.font = PISAVA(22, 700)
  g.fillText(naslov, x, y + 24)
  const top = y + 64, dno = y + v - 34, levo = x + 8, desno = x + s - 70
  const vrednosti = tocke.map((t) => t.v).filter((n) => n != null)
  const max = Math.max(1, ...vrednosti) * 1.1
  g.strokeStyle = MREZA
  g.lineWidth = 1
  for (const d of [0, 0.5, 1]) {
    const yy = dno - (dno - top) * d
    g.beginPath(); g.moveTo(levo, yy); g.lineTo(desno, yy); g.stroke()
  }
  // Merilo levo nad črto mreže, da ne trči z zadnjo vrednostjo na desni.
  g.fillStyle = TIHO
  g.font = PISAVA(16)
  for (const d of [0.5, 1]) g.fillText(oblika(max * d), levo, dno - (dno - top) * d - 6)
  g.fillText(tocke[0].dan.slice(5), levo, dno + 24)
  g.textAlign = 'right'
  g.fillText(tocke.at(-1).dan.slice(5), desno, dno + 24)
  g.textAlign = 'left'

  const px = (i) => levo + ((desno - levo) * i) / Math.max(1, tocke.length - 1)
  const py = (n) => dno - ((dno - top) * n) / max
  g.strokeStyle = CRTA
  g.lineWidth = 2
  g.lineJoin = 'round'
  g.beginPath()
  let zacet = false
  tocke.forEach((t, i) => {
    if (t.v == null) return
    zacet ? g.lineTo(px(i), py(t.v)) : g.moveTo(px(i), py(t.v))
    zacet = true
  })
  g.stroke()
  const zadnja = [...tocke.keys()].reverse().find((i) => tocke[i].v != null)
  if (zadnja != null) {
    g.fillStyle = CRTA
    g.beginPath(); g.arc(px(zadnja), py(tocke[zadnja].v), 5, 0, Math.PI * 2); g.fill()
    g.strokeStyle = PODLAGA; g.lineWidth = 2; g.stroke()
    g.fillStyle = BESEDILO
    g.font = PISAVA(20, 700)
    g.fillText(oblika(tocke[zadnja].v), px(zadnja) + 10, py(tocke[zadnja].v) - 8)
  }
}

/** Trendi zadnjih dni: `dnevi` so izidi porocilo_lijaka, od najstarejšega. */
export function grafTrendov(dnevi) {
  const S = 1200, V = 760
  const { c, g } = platno(S, V)
  g.fillStyle = BESEDILO
  g.font = PISAVA(30, 700)
  g.fillText(`Zadnjih ${dnevi.length} dni`, 40, 56)
  const cela = (n) => `${Math.round(n)}`
  const pct = (n) => `${Math.round(n)} %`
  const vrsta = (f) => dnevi.map((d) => ({ dan: d.dan, v: f(d) }))
  const panoji = [
    ['Registracije', vrsta((d) => d.registracije), cela],
    ['Prva shramba ekipe', vrsta((d) => d.koraki?.prva_shramba ?? 0), cela],
    ['Obiski prijavljenih', vrsta((d) => (d.obiski?.nov ?? 0) + (d.obiski?.star ?? 0)), cela],
    ['Delež skupine z ekipo', vrsta((d) => (d.skupina.registriranih ? (100 * d.skupina.z_ekipo) / d.skupina.registriranih : null)), pct],
  ]
  panoji.forEach(([naslov, tocke, oblika], i) => {
    maliGraf(g, 40 + (i % 2) * 580, 90 + Math.floor(i / 2) * 330, 540, 300, naslov, tocke, oblika)
  })
  return c.toBuffer('image/png')
}
