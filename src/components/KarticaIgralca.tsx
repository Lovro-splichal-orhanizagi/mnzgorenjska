// Kartica igralca za objavo — v obliki kartice FIFA Ultimate Team.
//
// Mlajši igralci te kartice poznajo iz igre FC/FIFA in jih zbirajo; zato je
// to oblika, ki jo bodo delili. Ocena levo zgoraj so točke kroga, pod njo
// pozicija in grb; namesto fotografije je velika številka dresa, spodaj
// statistika kroga in sezone. Zunaj kartice sta krog z ligo in izid tekme.
//
// Vsaka vrstica se prilagodi širini (manjša pisava, nato "…"), da se ob
// dolgih imenih nič ne prekriva. Priimek je v ozki pisavi (Barlow Condensed);
// če se ne naloži, jo nadomesti sistemska ozka pisava.
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import DeliSliko from './DeliSliko'
import {
  SIRINA_K as W,
  VISINA_K as H,
  stavekEkip,
  imeDatotekeKartice,
  type PodatkiKartice,
} from '../lib/karticaIgralca'
import { formatirajTocke, KRATKA_POZICIJA } from '../lib/pomozno'
import { t } from '../i18n'

const M = 2
const OZKA = '"Barlow Condensed", "Arial Narrow", sans-serif'
const oz = (t: number, px: number) => `${t} ${px}px ${OZKA}`
const sans = (t: number, px: number) => `${t} ${px}px Inter, system-ui, sans-serif`
const KREM = '#F2E8CF'
const CRNILO = '#241C0C'

let pisava: Promise<void> | null = null
function naloziPisavo(): Promise<void> {
  if (pisava) return pisava
  pisava = (async () => {
    let l = document.querySelector<HTMLLinkElement>('link[data-pisava-kartice]')
    if (!l) {
      l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap'
      l.dataset.pisavaKartice = '1'
      const ok = new Promise((r) => {
        l!.onload = r
        l!.onerror = r
      })
      document.head.appendChild(l)
      await Promise.race([ok, new Promise((r) => setTimeout(r, 3000))])
    }
    await Promise.race([
      Promise.all([700, 800, 600].map((t) => document.fonts.load(`${t} 100px "Barlow Condensed"`))),
      new Promise((r) => setTimeout(r, 3000)),
    ]).catch(() => {})
  })()
  return pisava
}

function slika(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const s = new Image()
    s.onload = () => res(s)
    s.onerror = () => res(null)
    s.src = src
  })
}

/** Besedilo v širino: pomanjša, nato skrajša s "…". */
function napisi(c: CanvasRenderingContext2D, t: string, x: number, y: number, sir: number, f: (px: number) => string, px: number, min = px) {
  let v = px
  c.font = f(v)
  while (v > min && c.measureText(t).width > sir) c.font = f((v -= 2))
  let b = t
  if (c.measureText(b).width > sir) {
    while (b.length > 1 && c.measureText(`${b}…`).width > sir) b = b.slice(0, -1)
    b = `${b.trimEnd()}…`
  }
  c.fillText(b, x, y)
  return v
}

function platno() {
  const p = document.createElement('canvas')
  p.width = W * M
  p.height = H * M
  const c = p.getContext('2d')!
  c.scale(M, M)
  return { p, c }
}

/** Do tri začetnice kluba: "Niko Železniki" -> "NŽ". */
function zacetnice(ime: string, kratko: string | null): string {
  if (kratko) return kratko.slice(0, 3).toUpperCase()
  return ime
    .split(/\s+/)
    .filter((d) => /[a-zčšžA-ZČŠŽ0-9]/.test(d))
    .map((d) => d[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

const vBlob = (p: HTMLCanvasElement) => new Promise<Blob | null>((r) => p.toBlob((b) => r(b), 'image/png'))

function statistika(p: PodatkiKartice): Array<[string, string]> {
  const n = p.nastop
  const out: Array<[string, string]> = [
    [String(n?.goli ?? 0), t('igralci.kartica.stat.gol')],
    [String(n?.asistence ?? 0), t('igralci.kartica.stat.ast')],
    [String(n?.minute ?? 0), t('igralci.kartica.stat.min')],
  ]
  if (p.krog) out.push([String(p.krog), t('igralci.kartica.stat.krog')])
  if (p.sezona) out.push([formatirajTocke(p.sezona.tocke), t('igralci.kartica.stat.sez')])
  if (p.ekip) out.push([String(p.ekip), t('igralci.kartica.stat.ekip')])
  return out.slice(0, 6)
}

/**
 * Fotografija, ki jo je človek izbral na svoji napravi. Nikamor se ne naloži:
 * nariše se le na kartico, ki jo sam deli. `x`/`y` sta premik v točkah
 * kartice, `povecava` je večkratnik pokritja okna.
 */
export interface FotoKartice {
  slika: CanvasImageSource
  sirina: number
  visina: number
  x: number
  y: number
  povecava: number
  id: number
}

/** Odpre izbrano datoteko in jo pomanjša (telefonske fotografije so ogromne). */
export async function naloziFoto(datoteka: File): Promise<Omit<FotoKartice, 'x' | 'y' | 'povecava' | 'id'>> {
  // createImageBitmap upošteva zasuk iz EXIF, zato pokončna fotografija ne leži.
  const bmp = await createImageBitmap(datoteka)
  const r = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const cv = document.createElement('canvas')
  cv.width = Math.round(bmp.width * r)
  cv.height = Math.round(bmp.height * r)
  cv.getContext('2d')!.drawImage(bmp, 0, 0, cv.width, cv.height)
  bmp.close()
  return { slika: cv, sirina: cv.width, visina: cv.height }
}

/** Fotografija v okno kartice, z mehkim prehodom v zlato spodaj, levo in zgoraj. */
function narisiFoto(c: CanvasRenderingContext2D, f: FotoKartice, rx: number, ry: number, rw: number, rh: number) {
  const off = document.createElement('canvas')
  off.width = rw * M
  off.height = rh * M
  const o = off.getContext('2d')!
  o.scale(M, M)
  const s = Math.max(rw / f.sirina, rh / f.visina) * f.povecava
  const w = f.sirina * s
  const h = f.visina * s
  o.drawImage(f.slika, rw / 2 - w / 2 + f.x, rh / 2 - h / 2 + f.y, w, h)
  o.globalCompositeOperation = 'destination-in'
  const navp = o.createLinearGradient(0, 0, 0, rh)
  navp.addColorStop(0, 'rgba(0,0,0,0)')
  navp.addColorStop(0.1, 'rgba(0,0,0,1)')
  navp.addColorStop(0.6, 'rgba(0,0,0,1)')
  navp.addColorStop(1, 'rgba(0,0,0,0)')
  o.fillStyle = navp
  o.fillRect(0, 0, rw, rh)
  const vod = o.createLinearGradient(0, 0, rw, 0)
  vod.addColorStop(0, 'rgba(0,0,0,0)')
  vod.addColorStop(0.38, 'rgba(0,0,0,1)')
  vod.addColorStop(1, 'rgba(0,0,0,1)')
  o.fillStyle = vod
  o.fillRect(0, 0, rw, rh)
  c.drawImage(off, rx, ry, rw, rh)
}

/** Okno za fotografijo v točkah kartice — potrebno tudi za vlečenje. */
export const OKNO_FOTO = { x: 170 + 240, y: 130 + 30, w: 740 - 270, h: 540 }

export async function narisiKartico(p: PodatkiKartice, foto: FotoKartice | null = null): Promise<Blob | null> {
  await naloziPisavo()
  const { p: pl, c } = platno()

  const bg = c.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H * 0.45, H * 0.8)
  bg.addColorStop(0, '#1A5A3E')
  bg.addColorStop(1, '#06170F')
  c.fillStyle = bg
  c.fillRect(0, 0, W, H)
  c.strokeStyle = 'rgba(242,232,207,.06)'
  c.lineWidth = 4
  c.beginPath()
  c.arc(W / 2, H * 0.47, 330, 0, Math.PI * 2)
  c.stroke()

  // oblika kartice
  const cw = 740
  const ch = 1040
  const x = (W - cw) / 2
  const y = 130
  const oblika = (k = 0) => {
    c.beginPath()
    c.moveTo(x + k, y + 110)
    c.lineTo(x + 110, y + k)
    c.lineTo(x + cw - 110, y + k)
    c.lineTo(x + cw - k, y + 110)
    c.lineTo(x + cw - k, y + ch - 190)
    c.quadraticCurveTo(x + cw - k, y + ch - 110, x + cw / 2, y + ch - k)
    c.quadraticCurveTo(x + k, y + ch - 110, x + k, y + ch - 190)
    c.closePath()
  }
  c.save()
  c.shadowColor = 'rgba(0,0,0,.55)'
  c.shadowBlur = 60 * M
  c.shadowOffsetY = 24 * M
  oblika()
  const zl = c.createLinearGradient(x, y, x + cw, y + ch)
  zl.addColorStop(0, '#F8E3A0')
  zl.addColorStop(0.45, '#E2B04A')
  zl.addColorStop(1, '#B5832A')
  c.fillStyle = zl
  c.fill()
  c.restore()
  // lesk
  c.save()
  oblika()
  c.clip()
  const lesk = c.createLinearGradient(x, y, x + cw * 0.7, y + ch * 0.5)
  lesk.addColorStop(0, 'rgba(255,255,255,0)')
  lesk.addColorStop(0.5, 'rgba(255,255,255,.28)')
  lesk.addColorStop(0.62, 'rgba(255,255,255,0)')
  c.fillStyle = lesk
  c.fillRect(x, y, cw, ch)
  c.restore()
  oblika(18)
  c.strokeStyle = 'rgba(255,246,210,.7)'
  c.lineWidth = 4
  c.stroke()

  // levo zgoraj: ocena = točke kroga, pozicija, grb
  const tocke = formatirajTocke(p.tocke ?? p.sezona?.tocke ?? 0)
  c.fillStyle = CRNILO
  c.textAlign = 'center'
  const lx = x + 150
  napisi(c, tocke, lx, y + 250, 190, (v) => oz(800, v), 170, 110)
  c.font = oz(700, 64)
  c.fillText(p.pozicija ? KRATKA_POZICIJA[p.pozicija] : '—', lx, y + 320)
  c.fillStyle = 'rgba(36,28,12,.35)'
  c.fillRect(lx - 50, y + 348, 100, 3)
  // grb v okrogli znački (grbi z belim ozadjem sicer izgledajo kot kvadrat);
  // brez grba začetnice kluba — mesto ne sme ostati prazno
  const G = 104
  const gx = lx
  const gy = y + 372 + G / 2
  c.beginPath()
  c.arc(gx, gy, G / 2, 0, Math.PI * 2)
  c.fillStyle = '#FFF8E4'
  c.fill()
  c.lineWidth = 3
  c.strokeStyle = 'rgba(36,28,12,.35)'
  c.stroke()
  const grb = p.grb ? await slika(p.grb) : null
  if (grb) {
    const r = (G * 0.72) / Math.max(grb.width, grb.height)
    c.drawImage(grb, gx - (grb.width * r) / 2, gy - (grb.height * r) / 2, grb.width * r, grb.height * r)
  } else {
    c.fillStyle = CRNILO
    napisi(c, zacetnice(p.klub, p.klubKratko), gx, gy + 16, G - 20, (v) => oz(800, v), 46, 28)
  }
  // desno: fotografija, če jo je kdo izbral, sicer velika številka dresa
  if (foto) {
    c.save()
    oblika(18)
    c.clip()
    narisiFoto(c, foto, OKNO_FOTO.x, OKNO_FOTO.y, OKNO_FOTO.w, OKNO_FOTO.h)
    c.restore()
  } else {
    c.fillStyle = 'rgba(36,28,12,.16)'
    c.font = oz(800, 430)
    c.fillText(p.stevilka != null ? String(p.stevilka) : '', x + cw * 0.64, y + 520)
  }

  // ime
  c.fillStyle = CRNILO
  napisi(c, p.priimek.toUpperCase(), W / 2, y + 620, cw - 120, (v) => oz(800, v), 96, 56)
  c.fillStyle = 'rgba(36,28,12,.72)'
  napisi(c, p.klub, W / 2, y + 666, cw - 160, (v) => oz(700, v), 38, 28)
  c.fillStyle = 'rgba(36,28,12,.35)'
  c.fillRect(x + 90, y + 692, cw - 180, 3)

  // statistika 2 x 3
  const st = statistika(p)
  const kol = [x + cw * 0.3, x + cw * 0.7]
  st.forEach(([v, o], i) => {
    const cx = kol[i < 3 ? 0 : 1]
    const cy = y + 768 + (i % 3) * 66
    c.textAlign = 'right'
    c.fillStyle = CRNILO
    c.font = oz(800, 60)
    c.fillText(v, cx - 8, cy)
    c.textAlign = 'left'
    c.font = oz(600, 44)
    c.fillStyle = 'rgba(36,28,12,.75)'
    c.fillText(o, cx + 8, cy)
  })
  c.fillStyle = 'rgba(36,28,12,.35)'
  c.fillRect(W / 2 - 1.5, y + 722, 3, 184)

  // spodnja konica: znak SLFF
  c.textAlign = 'center'
  const slff = await slika('/logo/slff-grb.png')
  if (slff) c.drawImage(slff, W / 2 - 34, y + ch - 116, 68, 68)

  // zunaj kartice: krog in liga zgoraj, izid spodaj
  c.fillStyle = 'rgba(242,232,207,.75)'
  napisi(c, p.krog ? t('igralci.kartica.krogInLiga', { krog: p.krog, liga: p.liga }) : p.liga, W / 2, 84, W - 160, (v) => sans(600, v), 32, 22)
  if (p.tekma) {
    c.fillStyle = 'rgba(242,232,207,.85)'
    napisi(c, p.tekma, W / 2, H - 132, W - 160, (v) => sans(700, v), 32, 22)
  }
  c.textAlign = 'left'
  c.fillStyle = KREM
  c.font = sans(800, 30)
  c.fillText('slff.eu', 72, H - 70)
  const e = stavekEkip(p.ekip)
  if (e) {
    c.textAlign = 'right'
    c.fillStyle = 'rgba(242,232,207,.65)'
    napisi(c, e, W - 72, H - 70, 330, (v) => sans(600, v), 26, 20)
  }
  c.textAlign = 'left'
  return vBlob(pl)
}

export default function KarticaIgralca({
  podatki,
  povezava,
}: {
  podatki: PodatkiKartice
  povezava: string
}) {
  const [foto, setFoto] = useState<FotoKartice | null>(null)
  const [napakaFoto, setNapakaFoto] = useState<string | null>(null)
  const kljuc =
    JSON.stringify(podatki) + (foto ? `|${foto.id}:${Math.round(foto.x)}:${Math.round(foto.y)}:${foto.povecava}` : '')
  const [predogled, setPredogled] = useState<string | null>(null)
  const vlecenje = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const okvir = useRef<HTMLDivElement | null>(null)
  const fotoRef = useRef(foto)
  fotoRef.current = foto

  useEffect(() => {
    let veljavno = true
    let url: string | null = null
    // Kratek zamik: med vlečenjem ali povečevanjem se riše šele, ko se roka ustavi.
    const t = window.setTimeout(() => {
      narisiKartico(podatki, fotoRef.current)
        .then((blob) => {
          if (!veljavno || !blob) return
          url = URL.createObjectURL(blob)
          setPredogled(url)
        })
        .catch(() => {})
    }, foto ? 90 : 0)
    return () => {
      veljavno = false
      window.clearTimeout(t)
      if (url) URL.revokeObjectURL(url)
    }
    // `kljuc` vsebuje podatke in stanje fotografije, primerjano po vsebini.
  }, [kljuc])

  async function izberi(e: ChangeEvent<HTMLInputElement>) {
    const datoteka = e.target.files?.[0]
    e.target.value = ''
    if (!datoteka) return
    setNapakaFoto(null)
    try {
      const f = await naloziFoto(datoteka)
      setFoto({ ...f, x: 0, y: 0, povecava: 1, id: Date.now() })
    } catch {
      setNapakaFoto(t('igralci.kartica.napakaFoto'))
    }
  }

  function zacni(e: PointerEvent<HTMLDivElement>) {
    if (!foto) return
    e.currentTarget.setPointerCapture(e.pointerId)
    vlecenje.current = { px: e.clientX, py: e.clientY, x: foto.x, y: foto.y }
  }
  function vleci(e: PointerEvent<HTMLDivElement>) {
    const v = vlecenje.current
    if (!v || !okvir.current) return
    // premik prsta v točkah kartice
    const r = W / okvir.current.getBoundingClientRect().width
    setFoto((f) => (f ? { ...f, x: v.x + (e.clientX - v.px) * r, y: v.y + (e.clientY - v.py) * r } : f))
  }
  function koncaj() {
    vlecenje.current = null
  }

  const ime = `${podatki.ime} ${podatki.priimek}`.trim()
  const besedilo = podatki.krog
    ? t('igralci.kartica.deliKrog', {
        ime,
        klub: podatki.klub,
        tocke: formatirajTocke(podatki.tocke ?? 0),
        krog: podatki.krog,
      })
    : t('igralci.kartica.deliSezona', { ime, klub: podatki.klub })

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-start">
      <div
        ref={okvir}
        onPointerDown={zacni}
        onPointerMove={vleci}
        onPointerUp={koncaj}
        onPointerCancel={koncaj}
        className={`mx-auto w-full max-w-[15rem] select-none overflow-hidden rounded-xl bg-white/5 sm:mx-0 ${
          foto ? 'cursor-grab touch-none active:cursor-grabbing' : ''
        }`}
      >
        {predogled ? (
          <img
            src={predogled}
            alt={t('igralci.kartica.alt', { ime })}
            draggable={false}
            className="pointer-events-none block aspect-[4/5] w-full"
          />
        ) : (
          <div className="aspect-[4/5] w-full animate-pulse bg-white/5" aria-hidden />
        )}
      </div>
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          {t('igralci.kartica.uvod')}
        </p>
        <DeliSliko
          narisi={() => narisiKartico(podatki, fotoRef.current)}
          kljuc={kljuc}
          naslov={ime}
          besedilo={besedilo}
          povezava={povezava}
          imeSlike={imeDatotekeKartice(podatki.ime, podatki.priimek, podatki.krog)}
        />
        <div className="space-y-2 border-t border-white/5 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="gumb-tih cursor-pointer px-3 py-2 text-sm">
              {foto ? t('igralci.kartica.zamenjajFoto') : t('igralci.kartica.dodajFoto')}
              <input type="file" accept="image/*" onChange={izberi} className="sr-only" />
            </label>
            {foto && (
              <button type="button" onClick={() => setFoto(null)} className="gumb-tih px-3 py-2 text-sm">
                {t('igralci.kartica.odstrani')}
              </button>
            )}
          </div>
          {foto && (
            <label className="flex items-center gap-3 text-xs text-slate-400">
              {t('igralci.kartica.povecava')}
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={foto.povecava}
                onChange={(e) => setFoto({ ...foto, povecava: Number(e.target.value) })}
                className="w-40 accent-gnl-400"
              />
            </label>
          )}
          <p className="text-xs text-slate-500">
            {foto ? t('igralci.kartica.povleci') : ''}
            {t('igralci.kartica.zasebnost')}
          </p>
          {napakaFoto && <p className="text-xs text-rose-300">{napakaFoto}</p>}
        </div>
      </div>
    </div>
  )
}
