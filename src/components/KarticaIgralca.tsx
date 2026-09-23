// Kartica igralca — Panini sličica na pokošeni travi, za objavo.
//
// Ena stvar je glasna: nagnjena sličica z belim robom, velikim priimkom in
// dresom s številko namesto fotografije (fotografij igralcev nimamo, dres s
// številko pa je na sličicah brez slike že od nekdaj). Vse okoli nje je tiho:
// trava, ena velika številka točk, ena vrstica o tekmi.
//
// Pisava priimka je ozka (Barlow Condensed), kot na albumskih sličicah; če se
// ne naloži, jo nadomesti sistemska ozka pisava — kartica ostane berljiva.
import { useEffect, useState } from 'react'
import DeliSliko from './DeliSliko'
import { barvaKluba, zacetnice } from './Grb'
import {
  SIRINA_K,
  VISINA_K,
  imePozicije,
  podnapisTock,
  stavekEkip,
  velikostPriimka,
  imeDatotekeKartice,
  type PodatkiKartice,
} from '../lib/karticaIgralca'
import { formatirajTocke, mnozina, TEKME, GOLI } from '../lib/pomozno'

const MERILO = 2
const TRAVA = '#17543A'
const TRAVA_SVETLA = '#1C6045'
const TEMNA = '#0A2419'
const KREM = '#F2E8CF'
const PAPIR = '#FBF8F0'
const ZLATA = '#E3A92B'
const CRNILO = '#16201A'

const OZKA = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif'
const pisava = (teza: number, px: number) => `${teza} ${px}px Inter, system-ui, sans-serif`
const ozka = (teza: number, px: number) => `${teza} ${px}px ${OZKA}`

/** Barva dresa po poziciji — iste kot značke pozicij v aplikaciji. */
const DRES: Record<string, [string, string]> = {
  GK: ['#F2B632', '#9A6A08'],
  DEF: ['#4FA8E0', '#1D5F8C'],
  MID: ['#3FBF83', '#17744A'],
  FWD: ['#E8566B', '#9B2135'],
}

let pisavaObljuba: Promise<void> | null = null
function naloziPisavo(): Promise<void> {
  if (pisavaObljuba) return pisavaObljuba
  pisavaObljuba = (async () => {
    if (typeof document === 'undefined') return
    let povezava = document.querySelector<HTMLLinkElement>('link[data-pisava-kartice]')
    if (!povezava) {
      povezava = document.createElement('link')
      povezava.rel = 'stylesheet'
      povezava.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;800&display=swap'
      povezava.dataset.pisavaKartice = '1'
      const nalozena = new Promise((r) => {
        povezava!.onload = r
        povezava!.onerror = r
      })
      document.head.appendChild(povezava)
      // `fonts.load` pred naloženim slogom takoj vrne prazno — najprej slog.
      await Promise.race([nalozena, new Promise((r) => setTimeout(r, 3000))])
    }
    // Brez pisave kartica še vedno nastane — čakamo največ tri sekunde.
    await Promise.race([
      Promise.all([
        document.fonts.load(`800 100px "Barlow Condensed"`),
        document.fonts.load(`600 40px "Barlow Condensed"`),
      ]),
      new Promise((r) => setTimeout(r, 3000)),
    ]).catch(() => {})
  })()
  return pisavaObljuba
}

function naloziSliko(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const s = new Image()
    s.onload = () => resolve(s)
    s.onerror = () => resolve(null)
    s.src = src
  })
}

function zaobljen(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

/** Pokošena trava: navpični pasovi, reflektor zgoraj, temnejši robovi. */
function trava(c: CanvasRenderingContext2D) {
  c.fillStyle = TRAVA
  c.fillRect(0, 0, SIRINA_K, VISINA_K)
  const pas = 108
  c.fillStyle = TRAVA_SVETLA
  for (let x = 0; x < SIRINA_K; x += pas * 2) c.fillRect(x, 0, pas, VISINA_K)
  const luc = c.createRadialGradient(SIRINA_K / 2, -120, 60, SIRINA_K / 2, -120, 900)
  luc.addColorStop(0, 'rgba(255,255,240,.22)')
  luc.addColorStop(1, 'rgba(255,255,240,0)')
  c.fillStyle = luc
  c.fillRect(0, 0, SIRINA_K, VISINA_K)
  const tema = c.createLinearGradient(0, 0, 0, VISINA_K)
  tema.addColorStop(0, 'rgba(10,36,25,0)')
  tema.addColorStop(0.62, 'rgba(10,36,25,.35)')
  tema.addColorStop(0.78, 'rgba(10,36,25,.92)')
  tema.addColorStop(1, TEMNA)
  c.fillStyle = tema
  c.fillRect(0, 0, SIRINA_K, VISINA_K)
}

/** Dres (s sprednje strani) v škatli širine `w`, zgornji rob pri `y`. */
function dres(c: CanvasRenderingContext2D, cx: number, y: number, w: number, barva: string, rob: string) {
  const h = w * 0.92
  const l = cx - w / 2
  c.beginPath()
  c.moveTo(l + w * 0.34, y)
  c.quadraticCurveTo(cx, y + w * 0.13, l + w * 0.66, y) // izrez za vrat
  c.lineTo(l + w * 0.86, y + w * 0.06)
  c.lineTo(l + w, y + w * 0.3) // rokav
  c.lineTo(l + w * 0.84, y + w * 0.4)
  c.lineTo(l + w * 0.8, y + w * 0.32)
  c.lineTo(l + w * 0.8, y + h)
  c.lineTo(l + w * 0.2, y + h)
  c.lineTo(l + w * 0.2, y + w * 0.32)
  c.lineTo(l + w * 0.16, y + w * 0.4)
  c.lineTo(l, y + w * 0.3)
  c.lineTo(l + w * 0.14, y + w * 0.06)
  c.closePath()
  c.fillStyle = barva
  c.fill()
  c.lineWidth = w * 0.022
  c.strokeStyle = rob
  c.lineJoin = 'round'
  c.stroke()
  // obroba ovratnika
  c.beginPath()
  c.moveTo(l + w * 0.34, y)
  c.quadraticCurveTo(cx, y + w * 0.13, l + w * 0.66, y)
  c.lineWidth = w * 0.035
  c.strokeStyle = rob
  c.stroke()
  return h
}

async function grbKluba(c: CanvasRenderingContext2D, p: PodatkiKartice, x: number, y: number, d: number) {
  // bela plošča pod grbom, da se barvni grb loči od ozadja sličice
  c.save()
  c.shadowColor = 'rgba(0,0,0,.25)'
  c.shadowBlur = 16 * MERILO
  c.shadowOffsetY = 6 * MERILO
  c.beginPath()
  c.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2)
  c.fillStyle = PAPIR
  c.fill()
  c.restore()
  const slika = p.grb ? await naloziSliko(p.grb) : null
  if (slika) {
    const r = (d * 0.74) / Math.max(slika.width, slika.height)
    const w = slika.width * r
    const h = slika.height * r
    c.drawImage(slika, x + (d - w) / 2, y + (d - h) / 2, w, h)
    return
  }
  // Brez grba: ščit z začetnicami, iste barve kot drugod v aplikaciji.
  const [svetla, temna] = barvaKluba(p.klub)
  const s = d * 0.62
  const sx = x + (d - s) / 2
  const sy = y + d * 0.17
  c.beginPath()
  c.moveTo(sx, sy)
  c.lineTo(sx + s, sy)
  c.lineTo(sx + s, sy + s * 0.55)
  c.quadraticCurveTo(sx + s, sy + s * 1.02, sx + s / 2, sy + s * 1.1)
  c.quadraticCurveTo(sx, sy + s * 1.02, sx, sy + s * 0.55)
  c.closePath()
  c.fillStyle = temna
  c.fill()
  c.lineWidth = 4
  c.strokeStyle = svetla
  c.stroke()
  c.fillStyle = svetla
  c.textAlign = 'center'
  c.font = pisava(900, s * 0.34)
  c.fillText(zacetnice(p.klub, p.klubKratko), sx + s / 2, sy + s * 0.64)
  c.textAlign = 'left'
}

export async function narisiKartico(p: PodatkiKartice): Promise<Blob | null> {
  await naloziPisavo()
  const platno = document.createElement('canvas')
  platno.width = SIRINA_K * MERILO
  platno.height = VISINA_K * MERILO
  const c = platno.getContext('2d')
  if (!c) return null
  c.scale(MERILO, MERILO)

  trava(c)

  // --- glava: grb SLFF, liga, krog ------------------------------------------
  const slff = await naloziSliko('/logo/slff-grb.png')
  if (slff) c.drawImage(slff, 64, 52, 104, 104)
  c.fillStyle = KREM
  c.font = pisava(800, 32)
  c.fillText('Sunday League Fantasy Football', 186, 98)
  c.fillStyle = 'rgba(242,232,207,.72)'
  c.font = pisava(600, 28)
  c.fillText(p.liga, 186, 138)
  if (p.krog) {
    const napis = `${p.krog}. krog`
    c.font = ozka(800, 44)
    const w = c.measureText(napis).width + 44
    zaobljen(c, SIRINA_K - 64 - w, 70, w, 68, 34)
    c.fillStyle = ZLATA
    c.fill()
    c.fillStyle = CRNILO
    c.textAlign = 'center'
    c.fillText(napis, SIRINA_K - 64 - w / 2, 120)
    c.textAlign = 'left'
  }

  // --- sličica --------------------------------------------------------------
  const SW = 760
  const SH = 820
  const SX = (SIRINA_K - SW) / 2
  const SY = 196
  c.save()
  c.translate(SIRINA_K / 2, SY + SH / 2)
  c.rotate((-3 * Math.PI) / 180)
  c.translate(-SIRINA_K / 2, -(SY + SH / 2))

  // bel rob s senco — sličica leži na travi
  c.save()
  c.shadowColor = 'rgba(0,0,0,.5)'
  c.shadowBlur = 50 * MERILO
  c.shadowOffsetY = 26 * MERILO
  zaobljen(c, SX, SY, SW, SH, 28)
  c.fillStyle = PAPIR
  c.fill()
  c.restore()

  const R = 22
  const IX = SX + R
  const IY = SY + R
  const IW = SW - 2 * R
  const IH = SH - 2 * R
  const PORTRET = 468

  c.save()
  zaobljen(c, IX, IY, IW, IH, 14)
  c.clip()
  // "fotografija": ozadje v barvi dresa z rastrom pik, kot tisk na sličici
  const [svetla, temna] = DRES[p.pozicija ?? 'MID'] ?? DRES.MID
  c.fillStyle = temna
  c.fillRect(IX, IY, IW, PORTRET)
  const luc = c.createRadialGradient(IX + IW / 2, IY + PORTRET * 0.5, 20, IX + IW / 2, IY + PORTRET * 0.5, IW * 0.62)
  luc.addColorStop(0, 'rgba(255,255,255,.22)')
  luc.addColorStop(1, 'rgba(0,0,0,.28)')
  c.fillStyle = luc
  c.fillRect(IX, IY, IW, PORTRET)
  c.fillStyle = 'rgba(255,255,255,.07)'
  for (let y = IY + 10; y < IY + PORTRET; y += 18)
    for (let x = IX + ((y / 18) % 2 ? 9 : 0); x < IX + IW; x += 18) {
      c.beginPath()
      c.arc(x, y, 2.2, 0, Math.PI * 2)
      c.fill()
    }
  // dres s številko
  const dW = 390
  const dY = IY + 62
  const dH = dres(c, IX + IW / 2, dY, dW, svetla, CRNILO)
  if (p.stevilka != null) {
    c.fillStyle = PAPIR
    c.strokeStyle = CRNILO
    c.lineWidth = 6
    c.textAlign = 'center'
    c.font = ozka(800, 220)
    const ty = dY + dH * 0.78
    c.strokeText(String(p.stevilka), IX + IW / 2, ty)
    c.fillText(String(p.stevilka), IX + IW / 2, ty)
    c.textAlign = 'left'
  }
  // trak s pozicijo čez desni zgornji kot
  c.save()
  c.translate(IX + IW - 128, IY + 92)
  c.rotate(Math.PI / 4)
  // Vratarjev dres je sam zlat — trak je zato temen, sicer se izgubi.
  const vratar = p.pozicija === 'GK'
  c.fillStyle = vratar ? CRNILO : ZLATA
  c.fillRect(-190, -30, 380, 60)
  c.fillStyle = vratar ? ZLATA : CRNILO
  c.font = ozka(800, 36)
  c.textAlign = 'center'
  c.fillText(imePozicije(p.pozicija).toUpperCase(), 0, 13)
  c.restore()

  // ime na kremni podlagi
  c.fillStyle = KREM
  c.fillRect(IX, IY + PORTRET, IW, IH - PORTRET)
  c.fillStyle = ZLATA
  c.fillRect(IX, IY + PORTRET, IW, 10)
  const TX = IX + 40
  const TW = IW - 80
  c.fillStyle = 'rgba(22,32,26,.72)'
  c.font = ozka(600, 50)
  c.fillText(p.ime, TX, IY + PORTRET + 78)
  const priimek = p.priimek.toUpperCase()
  const vel = velikostPriimka(TW, (px) => {
    c.font = ozka(800, px)
    return c.measureText(priimek).width
  })
  c.fillStyle = CRNILO
  c.font = ozka(800, vel)
  c.fillText(priimek, TX - 4, IY + PORTRET + 78 + vel * 0.9)
  c.fillStyle = 'rgba(22,32,26,.65)'
  c.font = pisava(700, 30)
  c.fillText(p.klub, TX, IY + IH - 36)
  c.restore()

  // grb kluba prekriva rob fotografije, kot nalepljen
  await grbKluba(c, p, IX + 26, IY + 26, 132)

  // zavihan vogal spodaj desno
  const V = 64
  const vx = SX + SW
  const vy = SY + SH
  c.beginPath()
  c.moveTo(vx - V, vy)
  c.lineTo(vx, vy - V)
  c.lineTo(vx - V * 0.9, vy - V * 0.9)
  c.closePath()
  c.fillStyle = '#E6DDC6'
  c.fill()
  c.restore()

  // --- točke in tekma -------------------------------------------------------
  const tocke = p.tocke ?? p.sezona?.tocke ?? 0
  const napis = formatirajTocke(tocke)
  c.fillStyle = ZLATA
  c.font = ozka(800, 200)
  c.fillText(napis, 64, 1236)
  const sw = c.measureText(napis).width
  const X2 = 64 + sw + 32
  c.fillStyle = KREM
  c.font = pisava(800, 40)
  c.fillText(podnapisTock(Number(tocke), p.krog), X2, 1130)
  const dosezki = p.krog
    ? p.dosezki
    : p.sezona
      ? [mnozina(p.sezona.tekem, TEKME), mnozina(p.sezona.golov, GOLI)]
      : []
  if (dosezki.length) {
    c.fillStyle = 'rgba(242,232,207,.86)'
    c.font = pisava(600, 34)
    c.fillText(dosezki.join(', '), X2, 1180)
  }
  if (p.tekma) {
    c.fillStyle = 'rgba(242,232,207,.6)'
    c.font = pisava(600, 28)
    c.fillText(p.tekma, X2, 1224)
  }

  // --- noga -----------------------------------------------------------------
  c.fillStyle = 'rgba(242,232,207,.18)'
  c.fillRect(64, 1270, SIRINA_K - 128, 2)
  c.fillStyle = KREM
  c.font = pisava(800, 32)
  c.fillText('slff.eu', 64, 1318)
  const ekip = stavekEkip(p.ekip)
  c.textAlign = 'right'
  c.fillStyle = 'rgba(242,232,207,.72)'
  c.font = pisava(600, 28)
  c.fillText(ekip ?? 'Točke iz uradnih zapisnikov', SIRINA_K - 64, 1316)
  c.textAlign = 'left'

  return new Promise((resolve) => platno.toBlob((b) => resolve(b), 'image/png'))
}

export default function KarticaIgralca({
  podatki,
  povezava,
}: {
  podatki: PodatkiKartice
  povezava: string
}) {
  const kljuc = JSON.stringify(podatki)
  const [predogled, setPredogled] = useState<string | null>(null)

  useEffect(() => {
    let veljavno = true
    let url: string | null = null
    narisiKartico(podatki)
      .then((blob) => {
        if (!veljavno || !blob) return
        url = URL.createObjectURL(blob)
        setPredogled(url)
      })
      .catch(() => {})
    return () => {
      veljavno = false
      if (url) URL.revokeObjectURL(url)
    }
    // `kljuc` je `podatki`, primerjan po vsebini.
  }, [kljuc])

  const ime = `${podatki.ime} ${podatki.priimek}`.trim()
  const besedilo = podatki.krog
    ? `${ime} (${podatki.klub}): ${formatirajTocke(podatki.tocke ?? 0)} fantasy točk v ${podatki.krog}. krogu.`
    : `${ime} (${podatki.klub}) v fantasy ligi SLFF.`

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-start">
      <div className="mx-auto w-full max-w-[15rem] overflow-hidden rounded-xl bg-white/5 sm:mx-0">
        {predogled ? (
          <img
            src={predogled}
            alt={`Kartica igralca ${ime}`}
            className="block aspect-[4/5] w-full"
          />
        ) : (
          <div className="aspect-[4/5] w-full animate-pulse bg-white/5" aria-hidden />
        )}
      </div>
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          Sličica za objavo — za igralca, starše in navijače. Na telefonu jo pošlješ naravnost v
          WhatsApp, Instagram ali Facebook.
        </p>
        <DeliSliko
          narisi={() => narisiKartico(podatki)}
          kljuc={kljuc}
          naslov={ime}
          besedilo={besedilo}
          povezava={povezava}
          imeSlike={imeDatotekeKartice(podatki.ime, podatki.priimek, podatki.krog)}
        />
      </div>
    </div>
  )
}
