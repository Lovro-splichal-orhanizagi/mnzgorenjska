// Slike za Instagram story (1080 × 1920) preverjenega igralca: zgodba po
// tekmi in "Moja sezona" (SLF-373). Rišeta se v brskalniku na platno, kot
// kartica igralca; deli ju DeliSliko. Podatke da baza (`zadnja_tekma_zgodba`,
// `moja_sezona`), tu ni nobene poizvedbe.
import { t, datum, stevilo } from '../i18n'
import { naslovSlike } from './platforma'
import { formatirajTocke } from './pomozno'

export const SIRINA_Z = 1080
export const VISINA_Z = 1920

const OZKA = '"Barlow Condensed", "Arial Narrow", sans-serif'
const oz = (debelina: number, px: number) => `${debelina} ${px}px ${OZKA}`
const sans = (debelina: number, px: number) => `${debelina} ${px}px Inter, system-ui, sans-serif`
const ZLATO = '#f7dc8c'
const ZLATO_TEMNO = '#c99a2e'
const ZELENA = '#34d399'
const MODRA = '#38bdf8'

export type ZadnjaTekma = {
  tekma: number
  datum: string | null
  krog: number
  liga: string
  liga_slug: string
  ime: string
  domaci: string
  gostje: string
  domaci_logo: string | null
  gostje_logo: string | null
  hg: number
  ag: number
  doma: boolean
  minute: number | null
  goli: number | null
  zacel: boolean | null
  asistence: number | null
  tocke: number | null
}

export type MojaSezona = {
  preverjen: boolean
  sezona: string
  liga: string
  liga_slug?: string
  ime: string
  klub: string
  klub_logo?: string | null
  tekme: number | null
  minute: number | null
  goli: number | null
  asistence?: number | null
  ciste?: number | null
  tocke?: number | null
  mesto?: number | null
  izbranost?: number | null
  rumeni?: number | null
  rdeci?: number | null
  skavti?: number | null
  najboljsa?: { datum: string | null; tocke: number | null; goli: number | null; minute: number | null; proti: string; dani: number; prejeti: number } | null
}

let pisava: Promise<void> | null = null
/** Ozka pisava (Barlow Condensed) kot na kartici igralca; brez nje sistemska ozka. */
function naloziPisavo(): Promise<void> {
  if (pisava) return pisava
  pisava = (async () => {
    if (!document.querySelector('link[data-pisava-kartice]')) {
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap'
      l.dataset.pisavaKartice = '1'
      const ok = new Promise((r) => {
        l.onload = r
        l.onerror = r
      })
      document.head.appendChild(l)
      await Promise.race([ok, new Promise((r) => setTimeout(r, 3000))])
    }
    await Promise.race([
      Promise.all([600, 700, 800].map((d) => document.fonts.load(`${d} 100px "Barlow Condensed"`))),
      new Promise((r) => setTimeout(r, 3000)),
    ]).catch(() => {})
  })()
  return pisava
}

function slika(src: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((res) => {
    const s = new Image()
    if (/^https?:/.test(naslovSlike(src))) s.crossOrigin = 'anonymous'
    s.onload = () => res(s)
    s.onerror = () => res(null)
    s.src = naslovSlike(src)
  })
}

/** Besedilo v širino: pomanjša do `min`, nato skrajša s "…". */
function napisi(c: CanvasRenderingContext2D, besedilo: string, x: number, y: number, sir: number, f: (px: number) => string, px: number, min = px * 0.6) {
  let v = px
  c.font = f(v)
  while (v > min && c.measureText(besedilo).width > sir) c.font = f((v -= 2))
  let b = besedilo
  if (c.measureText(b).width > sir) {
    while (b.length > 1 && c.measureText(`${b}…`).width > sir) b = b.slice(0, -1)
    b = `${b.trimEnd()}…`
  }
  c.fillText(b, x, y)
}

function platno() {
  const p = document.createElement('canvas')
  p.width = SIRINA_Z
  p.height = VISINA_Z
  return { p, c: p.getContext('2d')! }
}

const vBlob = (p: HTMLCanvasElement) => new Promise<Blob | null>((r) => p.toBlob((b) => r(b), 'image/png'))

/** Temno igrišče z zlatim sijem in robom: ista podlaga kot stran /verified. */
function podlaga(c: CanvasRenderingContext2D) {
  const g = c.createLinearGradient(0, 0, 0, VISINA_Z)
  g.addColorStop(0, '#0b1a16')
  g.addColorStop(1, '#020617')
  c.fillStyle = g
  c.fillRect(0, 0, SIRINA_Z, VISINA_Z)
  c.fillStyle = 'rgba(255,255,255,0.025)'
  for (let x = 0; x < SIRINA_Z; x += 180) c.fillRect(x, 0, 90, VISINA_Z)
  const sij = c.createRadialGradient(SIRINA_Z * 0.85, 120, 0, SIRINA_Z * 0.85, 120, 900)
  sij.addColorStop(0, 'rgba(247,220,140,0.22)')
  sij.addColorStop(1, 'rgba(247,220,140,0)')
  c.fillStyle = sij
  c.fillRect(0, 0, SIRINA_Z, VISINA_Z)
  const zel = c.createRadialGradient(0, VISINA_Z, 0, 0, VISINA_Z, 1100)
  zel.addColorStop(0, 'rgba(52,211,153,0.22)')
  zel.addColorStop(1, 'rgba(52,211,153,0)')
  c.fillStyle = zel
  c.fillRect(0, 0, SIRINA_Z, VISINA_Z)
  c.strokeStyle = 'rgba(247,220,140,0.45)'
  c.lineWidth = 4
  c.strokeRect(36, 36, SIRINA_Z - 72, VISINA_Z - 72)
}

/** Modra kljukica preverjenega profila. */
function kljukica(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.fillStyle = MODRA
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fill()
  c.strokeStyle = '#020617'
  c.lineWidth = r * 0.28
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.beginPath()
  c.moveTo(x - r * 0.45, y + r * 0.02)
  c.lineTo(x - r * 0.1, y + r * 0.36)
  c.lineTo(x + r * 0.5, y - r * 0.32)
  c.stroke()
}

/** Glava: grb SLFF, oznaka in podnaslov (liga, krog ali sezona). */
async function glava(c: CanvasRenderingContext2D, oznaka: string, podnaslov: string) {
  const logo = await slika('/logo/slff-grb.png')
  if (logo) c.drawImage(logo, 90, 110, 110, 110)
  c.textAlign = 'left'
  c.fillStyle = ZLATO
  napisi(c, oznaka.toUpperCase(), 230, 160, 760, (px) => oz(800, px), 52)
  c.fillStyle = 'rgba(226,232,240,0.85)'
  napisi(c, podnaslov, 230, 210, 760, (px) => sans(500, px), 34)
}

/** Ime igralca; modra kljukica le pri preverjenem. */
function ime(c: CanvasRenderingContext2D, ime: string, y: number, preverjen = true) {
  c.textAlign = 'left'
  c.fillStyle = '#ffffff'
  napisi(c, ime.toUpperCase(), 90, y, 820, (px) => oz(800, px), 128, 70)
  if (!preverjen) return
  const sir = Math.min(c.measureText(ime.toUpperCase()).width, 820)
  kljukica(c, 90 + sir + 52, y - 44, 34)
}

/** Ploščica s številko in napisom. */
function ploscica(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, vrednost: string, napis: string, zlata = false) {
  c.fillStyle = zlata ? 'rgba(247,220,140,0.12)' : 'rgba(255,255,255,0.05)'
  c.strokeStyle = zlata ? 'rgba(247,220,140,0.55)' : 'rgba(255,255,255,0.12)'
  c.lineWidth = 3
  c.beginPath()
  c.roundRect(x, y, w, h, 28)
  c.fill()
  c.stroke()
  c.textAlign = 'center'
  c.fillStyle = zlata ? ZLATO : '#ffffff'
  napisi(c, vrednost, x + w / 2, y + h * 0.58, w - 40, (px) => oz(800, px), Math.round(h * 0.5))
  c.fillStyle = 'rgba(203,213,225,0.9)'
  napisi(c, napis.toUpperCase(), x + w / 2, y + h * 0.84, w - 40, (px) => sans(700, px), 30)
}

function noga(c: CanvasRenderingContext2D, besedilo: string) {
  c.textAlign = 'center'
  c.fillStyle = 'rgba(203,213,225,0.85)'
  napisi(c, besedilo, SIRINA_Z / 2, VISINA_Z - 150, 900, (px) => sans(600, px), 34)
  c.fillStyle = ZLATO
  c.font = oz(800, 60)
  c.fillText('SLFF.EU', SIRINA_Z / 2, VISINA_Z - 80)
}

export function imeZgodbe(d: { ime: string }, kaj: 'tekma' | 'sezona') {
  return `slff-${kaj}-${d.ime.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`
}

/** Zgodba po zadnji tekmi: izid, minute, goli, asistence, točke. */
export async function narisiZgodboTekme(d: ZadnjaTekma): Promise<Blob | null> {
  await naloziPisavo()
  const { p, c } = platno()
  podlaga(c)
  await glava(c, t('igralci.zgodbe.poTekmi'), `${d.liga} · ${t('igralci.predTekmo.krog', { n: d.krog })}`)
  ime(c, d.ime, 470)

  // Semafor: grba, imeni, izid.
  const [gd, gg] = await Promise.all([slika(d.domaci_logo), slika(d.gostje_logo)])
  c.fillStyle = 'rgba(2,6,23,0.55)'
  c.beginPath()
  c.roundRect(90, 560, SIRINA_Z - 180, 420, 36)
  c.fill()
  for (const [grb, x, naziv] of [[gd, 260, d.domaci], [gg, SIRINA_Z - 260, d.gostje]] as const) {
    if (grb) c.drawImage(grb, x - 80, 610, 160, 160)
    else {
      c.fillStyle = 'rgba(255,255,255,0.1)'
      c.beginPath()
      c.arc(x, 690, 80, 0, Math.PI * 2)
      c.fill()
    }
    c.textAlign = 'center'
    c.fillStyle = '#e2e8f0'
    napisi(c, naziv, x, 830, 330, (px) => sans(700, px), 36, 24)
  }
  c.textAlign = 'center'
  c.fillStyle = '#ffffff'
  c.font = oz(800, 190)
  c.fillText(`${d.hg}:${d.ag}`, SIRINA_Z / 2, 760)
  c.fillStyle = 'rgba(203,213,225,0.8)'
  napisi(c, d.datum ? datum(d.datum, { day: 'numeric', month: 'long', year: 'numeric' }) : '', SIRINA_Z / 2, 920, 600, (px) => sans(500, px), 32)

  // Moje številke.
  const w = (SIRINA_Z - 180 - 40) / 2
  ploscica(c, 90, 1040, w, 260, `${stevilo(d.minute ?? 0)}′`, t('igralci.zgodbe.minute'))
  ploscica(c, 90 + w + 40, 1040, w, 260, stevilo(d.goli ?? 0), t('igralci.zgodbe.goli'), (d.goli ?? 0) > 0)
  ploscica(c, 90, 1340, w, 260, stevilo(d.asistence ?? 0), t('igralci.zgodbe.asistence'), (d.asistence ?? 0) > 0)
  ploscica(c, 90 + w + 40, 1340, w, 260, d.tocke != null ? formatirajTocke(Number(d.tocke)) : '–', t('igralci.zgodbe.tocke'), true)
  noga(c, t('igralci.zgodbe.noga'))
  return vBlob(p)
}

/** Moja sezona: polna za preverjene, napoved (tekme, minute, goli) za ostale. */
export async function narisiSezono(d: MojaSezona): Promise<Blob | null> {
  await naloziPisavo()
  const { p, c } = platno()
  podlaga(c)
  await glava(c, t('igralci.zgodbe.mojaSezona'), `${d.liga} · ${d.sezona}`)
  ime(c, d.ime, 440, d.preverjen)
  c.textAlign = 'left'
  c.fillStyle = 'rgba(226,232,240,0.85)'
  napisi(c, d.klub, 90, 510, 900, (px) => sans(600, px), 40)

  const w = (SIRINA_Z - 180 - 40) / 2
  const vrsta = (y: number, a: [string, string, boolean?], b: [string, string, boolean?]) => {
    ploscica(c, 90, y, w, 230, a[0], a[1], a[2])
    ploscica(c, 90 + w + 40, y, w, 230, b[0], b[1], b[2])
  }
  vrsta(580, [stevilo(d.tekme ?? 0), t('igralci.zgodbe.tekme')], [`${stevilo(d.minute ?? 0)}′`, t('igralci.zgodbe.minute')])

  if (!d.preverjen) {
    vrsta(850, [stevilo(d.goli ?? 0), t('igralci.zgodbe.goli'), true], ['?', t('igralci.zgodbe.tocke')])
    c.textAlign = 'center'
    c.fillStyle = ZLATO
    napisi(c, t('igralci.zgodbe.napovedNaslov'), SIRINA_Z / 2, 1260, 900, (px) => oz(800, px), 70)
    c.fillStyle = 'rgba(226,232,240,0.85)'
    napisi(c, t('igralci.zgodbe.napovedOpis'), SIRINA_Z / 2, 1330, 900, (px) => sans(500, px), 34, 24)
    noga(c, t('igralci.zgodbe.noga'))
    return vBlob(p)
  }

  vrsta(850, [stevilo(d.goli ?? 0), t('igralci.zgodbe.goli'), true], [stevilo(d.asistence ?? 0), t('igralci.zgodbe.asistence')])
  vrsta(1120,
    [d.tocke != null ? formatirajTocke(Number(d.tocke)) : '–', t('igralci.zgodbe.tocke'), true],
    [d.mesto ? `#${d.mesto}` : '–', t('igralci.zgodbe.mesto')])
  // Najboljša tekma, izbranost in skavti v eni vrstici pod ploščicami.
  const vrstice: string[] = []
  if (d.najboljsa) {
    const n = d.najboljsa
    const opis = t('igralci.zgodbe.najboljsa', { proti: n.proti, izid: `${n.dani}:${n.prejeti}` })
    vrstice.push(n.tocke != null ? `${opis} · ${t('igralci.zgodbe.tocke')}: ${formatirajTocke(Number(n.tocke))}` : opis)
  }
  if (d.izbranost != null && d.izbranost > 0) vrstice.push(t('igralci.zgodbe.izbranost', { n: stevilo(d.izbranost) }))
  if (d.skavti != null && d.skavti > 0) vrstice.push(t('igralci.zgodbe.skavti', { n: stevilo(d.skavti) }))
  c.textAlign = 'left'
  vrstice.slice(0, 3).forEach((v, i) => {
    const y = 1450 + i * 80
    c.fillStyle = ZELENA
    c.beginPath()
    c.arc(110, y - 12, 10, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#e2e8f0'
    napisi(c, v, 140, y, 850, (px) => sans(600, px), 38, 26)
  })
  c.fillStyle = ZLATO_TEMNO
  noga(c, t('igralci.zgodbe.noga'))
  return vBlob(p)
}

// Plakat 40 × 60 cm za tisk (ob doživljenjskem nakupu): 200 dpi = 3150 × 4724.
// Riše se v logičnih enotah 1080 × 1620 in poveča, da veljajo iste mere kot pri zgodbah.
export const PLAKAT_W = 1080
export const PLAKAT_H = 1620
const PLAKAT_POVECAVA = 3150 / PLAKAT_W

export type PodatkiPlakata = {
  ime: string
  vzdevek: string | null
  pozicija: string | null
  klub: { ime: string; logo: string | null } | null
  liga: { ime: string } | null
  sezone: Array<{ sezona: string; liga: string; klub: string; tekme: number; minute: number; goli: number; asistence: number | null }>
}

/** `povecava`: privzeto za tisk (200 dpi); manjša za predogled na strani /verified. */
export async function narisiPlakat(d: PodatkiPlakata, povecava = PLAKAT_POVECAVA): Promise<Blob | null> {
  await naloziPisavo()
  const p = document.createElement('canvas')
  p.width = Math.round(PLAKAT_W * povecava)
  p.height = Math.round(PLAKAT_H * povecava)
  const c = p.getContext('2d')!
  c.scale(povecava, povecava)

  // Podlaga: kot zgodbe, v razmerju 2 : 3.
  const g = c.createLinearGradient(0, 0, 0, PLAKAT_H)
  g.addColorStop(0, '#0b1a16')
  g.addColorStop(1, '#020617')
  c.fillStyle = g
  c.fillRect(0, 0, PLAKAT_W, PLAKAT_H)
  c.fillStyle = 'rgba(255,255,255,0.025)'
  for (let x = 0; x < PLAKAT_W; x += 180) c.fillRect(x, 0, 90, PLAKAT_H)
  const sij = c.createRadialGradient(PLAKAT_W * 0.8, 100, 0, PLAKAT_W * 0.8, 100, 800)
  sij.addColorStop(0, 'rgba(247,220,140,0.25)')
  sij.addColorStop(1, 'rgba(247,220,140,0)')
  c.fillStyle = sij
  c.fillRect(0, 0, PLAKAT_W, PLAKAT_H)
  c.strokeStyle = 'rgba(247,220,140,0.6)'
  c.lineWidth = 5
  c.strokeRect(40, 40, PLAKAT_W - 80, PLAKAT_H - 80)

  const [logo, grb] = await Promise.all([slika('/logo/slff-grb.png'), slika(d.klub?.logo)])
  if (logo) c.drawImage(logo, 90, 100, 100, 100)
  c.textAlign = 'left'
  c.fillStyle = ZLATO
  napisi(c, t('igralci.plakat.oznaka').toUpperCase(), 215, 145, 600, (px) => oz(800, px), 46)
  c.fillStyle = 'rgba(226,232,240,0.85)'
  napisi(c, [d.klub?.ime, d.liga?.ime].filter(Boolean).join(' · '), 215, 190, 640, (px) => sans(500, px), 30)
  if (grb) c.drawImage(grb, PLAKAT_W - 210, 95, 120, 120)

  // Ime čez vso širino, vzdevek in pozicija pod njim.
  c.fillStyle = '#ffffff'
  napisi(c, d.ime.toUpperCase(), 90, 410, 820, (px) => oz(800, px), 150, 80)
  const sir = Math.min(c.measureText(d.ime.toUpperCase()).width, 820)
  kljukica(c, 90 + sir + 56, 360, 38)
  c.fillStyle = 'rgba(226,232,240,0.9)'
  napisi(c, [d.vzdevek ? `"${d.vzdevek}"` : null, d.pozicija].filter(Boolean).join(' · '), 90, 475, 900, (px) => sans(600, px), 40)

  // Kariera skupaj.
  const sk = d.sezone.reduce(
    (a, s) => ({ t: a.t + (s.tekme ?? 0), m: a.m + (s.minute ?? 0), g: a.g + (s.goli ?? 0), as: a.as + (s.asistence ?? 0) }),
    { t: 0, m: 0, g: 0, as: 0 },
  )
  const w = (PLAKAT_W - 180 - 3 * 24) / 4
  ;([
    [stevilo(sk.t), t('igralci.zgodbe.tekme'), false],
    [`${stevilo(sk.m)}′`, t('igralci.zgodbe.minute'), false],
    [stevilo(sk.g), t('igralci.zgodbe.goli'), true],
    [stevilo(sk.as), t('igralci.zgodbe.asistence'), false],
  ] as const).forEach(([v, n, zl], i) => ploscica(c, 90 + i * (w + 24), 540, w, 200, v, n, zl))

  // Sezone (največ 8, najnovejše zgoraj).
  c.textAlign = 'left'
  c.fillStyle = ZLATO
  c.font = oz(800, 44)
  c.fillText(t('igralci.cv.kariera').toUpperCase(), 90, 830)
  // Stolpci: sezona, klub in liga levo; tekme, goli, asistence desno poravnani (desni rob).
  const desno = [760, 880, 990]
  c.fillStyle = 'rgba(203,213,225,0.8)'
  c.textAlign = 'left'
  napisi(c, t('igralci.cv.sezona').toUpperCase(), 90, 880, 190, (px) => sans(700, px), 24, 14)
  napisi(c, t('igralci.cv.klubLiga').toUpperCase(), 300, 880, 340, (px) => sans(700, px), 24, 14)
  c.textAlign = 'right'
  ;[t('igralci.zgodbe.tekme'), t('igralci.zgodbe.goli'), t('igralci.zgodbe.asistence')].forEach((n, i) =>
    napisi(c, n.toUpperCase(), desno[i], 880, 100, (px) => sans(700, px), 22, 12),
  )
  // Manj sezon, večje vrstice: tabela zapolni prostor do noge.
  const sezone = d.sezone.slice(0, 8)
  const vrsta = Math.min(110, Math.floor(560 / Math.max(1, sezone.length)))
  const pisava = Math.min(40, Math.round(vrsta * 0.42))
  sezone.forEach((s, i) => {
    const y = 900 + vrsta * (i + 1) - Math.round(vrsta * 0.32)
    c.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'
    c.fillRect(80, 900 + vrsta * i + 12, PLAKAT_W - 160, vrsta - 8)
    c.textAlign = 'left'
    c.fillStyle = '#ffffff'
    napisi(c, s.sezona, 90, y, 190, (px) => sans(700, px), pisava)
    napisi(c, `${s.klub} · ${s.liga}`, 300, y, 340, (px) => sans(500, px), Math.round(pisava * 0.9), 16)
    c.textAlign = 'right'
    napisi(c, stevilo(s.tekme ?? 0), desno[0], y, 100, (px) => sans(700, px), pisava)
    c.fillStyle = ZLATO
    napisi(c, stevilo(s.goli ?? 0), desno[1], y, 100, (px) => sans(800, px), pisava)
    c.fillStyle = '#ffffff'
    napisi(c, stevilo(s.asistence ?? 0), desno[2], y, 100, (px) => sans(700, px), pisava)
  })

  c.textAlign = 'center'
  c.fillStyle = 'rgba(203,213,225,0.85)'
  napisi(c, t('igralci.cv.noga'), PLAKAT_W / 2, PLAKAT_H - 140, 900, (px) => sans(600, px), 30)
  c.fillStyle = ZLATO
  c.font = oz(800, 64)
  c.fillText('SLFF.EU', PLAKAT_W / 2, PLAKAT_H - 75)
  return new Promise<Blob | null>((r) => p.toBlob((b) => r(b), 'image/png'))
}
