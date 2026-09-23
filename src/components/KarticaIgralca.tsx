// Kartica igralca za objavo — mirna, tipografska.
//
// Prva različica je bila Panini sličica (nagnjena, dres, trak, raster,
// zavihan vogal) in je bilo na njej preveč. Zdaj je glasno samo dvoje: ime in
// število točk. Ena barva ozadja, en poudarek (zlata), vse levo poravnano,
// vsaka vrstica se prilagodi širini, da se nič ne prekriva.
//
// Priimek je v ozki pisavi (Barlow Condensed); če se ne naloži, jo nadomesti
// sistemska ozka pisava.
import { useEffect, useState } from 'react'
import DeliSliko from './DeliSliko'
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
const ZELENA = '#15432F'
const ZELENA_TEMNA = '#0D2E20'
const KREM = '#F2E8CF'
const ZLATA = '#E3A92B'
const L = 72 // levi in desni rob — vse je levo poravnano
const SIR = SIRINA_K - 2 * L

const OZKA = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif'
const pisava = (teza: number, px: number) => `${teza} ${px}px Inter, system-ui, sans-serif`
const ozka = (teza: number, px: number) => `${teza} ${px}px ${OZKA}`

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

/**
 * Napiše besedilo v dano širino: najprej ga pomanjša (do `najmanj`), če še
 * vedno ne gre, ga skrajša s "…". Nobena vrstica ne sme čez rob ali v drugo.
 */
function napisi(
  c: CanvasRenderingContext2D,
  besedilo: string,
  x: number,
  y: number,
  sirina: number,
  font: (px: number) => string,
  px: number,
  najmanj = px,
): number {
  let vel = px
  c.font = font(vel)
  while (vel > najmanj && c.measureText(besedilo).width > sirina) {
    vel -= 2
    c.font = font(vel)
  }
  let t = besedilo
  if (c.measureText(t).width > sirina) {
    while (t.length > 1 && c.measureText(`${t}…`).width > sirina) t = t.slice(0, -1)
    t = `${t.trimEnd()}…`
  }
  c.fillText(t, x, y)
  return c.measureText(t).width
}

export async function narisiKartico(p: PodatkiKartice): Promise<Blob | null> {
  await naloziPisavo()
  const platno = document.createElement('canvas')
  platno.width = SIRINA_K * MERILO
  platno.height = VISINA_K * MERILO
  const c = platno.getContext('2d')
  if (!c) return null
  c.scale(MERILO, MERILO)
  c.textAlign = 'left'

  // Ozadje: ena barva, le rahlo temnejša spodaj — nič drugega.
  const g = c.createLinearGradient(0, 0, 0, VISINA_K)
  g.addColorStop(0, ZELENA)
  g.addColorStop(1, ZELENA_TEMNA)
  c.fillStyle = g
  c.fillRect(0, 0, SIRINA_K, VISINA_K)

  // --- glava: SLFF levo, liga desno -----------------------------------------
  const slff = await naloziSliko('/logo/slff-grb.png')
  if (slff) c.drawImage(slff, L, 64, 96, 96)
  c.textAlign = 'right'
  c.fillStyle = 'rgba(242,232,207,.62)'
  napisi(c, p.liga, SIRINA_K - L, 124, SIR - 140, (v) => pisava(600, v), 30, 22)
  c.textAlign = 'left'

  // --- igralec ----------------------------------------------------------------
  // Blok z imenom stoji tik nad točkami (spodnji rob pri DNO), ne visi pod
  // glavo — sicer med imenom in točkami zija praznina.
  const priimek = p.priimek.toUpperCase()
  const vel = velikostPriimka(SIR, (px) => {
    c.font = ozka(800, px)
    return c.measureText(priimek).width
  }, 220, 90)
  const grb = p.grb ? await naloziSliko(p.grb) : null
  const DNO = 770
  const GRB = 128
  const visina = (grb ? GRB + 44 : 0) + 64 + vel * 0.92 + 58
  let y = DNO - visina
  if (grb) {
    // Krema pod grbom: grbi z belim ozadjem sicer izgledajo kot nalepljen kvadrat.
    c.beginPath()
    c.arc(L + GRB / 2, y + GRB / 2, GRB / 2, 0, Math.PI * 2)
    c.fillStyle = KREM
    c.fill()
    const r = (GRB * 0.7) / Math.max(grb.width, grb.height)
    const w = grb.width * r
    const h = grb.height * r
    c.drawImage(grb, L + (GRB - w) / 2, y + (GRB - h) / 2, w, h)
    y += GRB + 44
  }
  c.fillStyle = 'rgba(242,232,207,.78)'
  napisi(c, p.ime, L, y + 52, SIR, (v) => ozka(600, v), 64, 40)
  y += 64 + vel * 0.92
  c.fillStyle = KREM
  napisi(c, priimek, L - 4, y, SIR, (v) => ozka(800, v), vel, vel)
  y += 58
  c.fillStyle = 'rgba(242,232,207,.66)'
  const opis = [p.klub, imePozicije(p.pozicija).toLowerCase(), p.stevilka != null ? `št. ${p.stevilka}` : null]
    .filter(Boolean)
    .join(', ')
  napisi(c, opis, L, y, SIR, (v) => pisava(600, v), 34, 24)

  // --- točke ------------------------------------------------------------------
  const Y = 1060
  c.fillStyle = ZLATA
  c.fillRect(L, Y - 236, 88, 6)
  const tocke = p.tocke ?? p.sezona?.tocke ?? 0
  const stevilka = formatirajTocke(tocke)
  c.font = ozka(800, 230)
  c.fillText(stevilka, L - 6, Y)
  const sw = c.measureText(stevilka).width
  const X2 = L + sw + 28
  const S2 = SIRINA_K - L - X2
  c.fillStyle = KREM
  napisi(c, podnapisTock(Number(tocke), p.krog), X2, Y - 110, S2, (v) => pisava(800, v), 42, 26)
  const dosezki = p.krog
    ? p.dosezki
    : p.sezona
      ? [mnozina(p.sezona.tekem, TEKME), mnozina(p.sezona.golov, GOLI)]
      : []
  if (dosezki.length) {
    c.fillStyle = 'rgba(242,232,207,.8)'
    napisi(c, dosezki.join(', '), X2, Y - 56, S2, (v) => pisava(600, v), 34, 22)
  }
  if (p.tekma) {
    c.fillStyle = 'rgba(242,232,207,.58)'
    napisi(c, p.tekma, L, Y + 70, SIR, (v) => pisava(600, v), 30, 22)
  }

  // --- noga -------------------------------------------------------------------
  c.fillStyle = 'rgba(242,232,207,.14)'
  c.fillRect(L, VISINA_K - 110, SIR, 2)
  c.fillStyle = KREM
  c.font = pisava(800, 32)
  c.fillText('slff.eu', L, VISINA_K - 56)
  const ekip = stavekEkip(p.ekip)
  if (ekip) {
    c.textAlign = 'right'
    c.fillStyle = 'rgba(242,232,207,.62)'
    napisi(c, ekip, SIRINA_K - L, VISINA_K - 58, SIR - 200, (v) => pisava(600, v), 28, 22)
    c.textAlign = 'left'
  }

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
