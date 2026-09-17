// Gumb "Deli" — plakat za objavo in povezava v domači aplikaciji.
//
// Dvoje, ker sta dve poti:
//   • Facebook, WhatsApp, Viber vzamejo POVEZAVO — ta odpre sistemski meni za
//     deljenje (`navigator.share`), na namizju pa naslov prekopira.
//   • Instagram povezav ne sprejme, zato mora biti SLIKA sama sporočilo.
//     Plakat zato nosi grb, ime kluba in številke; nastane v brskalniku, da
//     ga ni treba delati za vsak klub posebej.
import { useState } from 'react'
import {
  SIRINA,
  VISINA,
  vVrstice,
  velikostNaslova,
  zacetekBloka,
  imeDatoteke,
  type PodatkiPlakata,
} from '../lib/plakat'

const OZADJE = '#0b1120'
const ZELENA = '#22c55e'
const SVETLA = '#e2e8f0'
const SIVA = '#94a3b8'

function naloziSliko(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const s = new Image()
    // Grbi so na istem izvoru, zato platno ne postane "umazano" in se da
    // izvoziti. Za tuje naslove to ne bi držalo.
    s.onload = () => resolve(s)
    s.onerror = () => resolve(null)
    s.src = src
  })
}

async function narisi(p: PodatkiPlakata, grb: string | null): Promise<Blob | null> {
  const platno = document.createElement('canvas')
  platno.width = SIRINA
  platno.height = VISINA
  const c = platno.getContext('2d')
  if (!c) return null

  c.fillStyle = OZADJE
  c.fillRect(0, 0, SIRINA, VISINA)
  c.fillStyle = ZELENA
  c.fillRect(0, 0, SIRINA, 12)

  const sredina = SIRINA / 2
  const slika = grb ? await naloziSliko(grb) : null

  // Najprej izmerimo, kako visok bo blok, da ga lahko navpicno sredinimo.
  const velN = velikostNaslova(p.naslov)
  c.textAlign = 'center'
  c.font = `900 ${velN}px Inter, "Segoe UI", system-ui, sans-serif`
  const vrsticeNaslova = vVrstice(p.naslov, SIRINA - 140, (t) => c.measureText(t).width)

  let visinaGrba = 0
  let sirinaGrba = 0
  if (slika && slika.width) {
    const naj = 240
    const r = Math.min(naj / slika.width, naj / slika.height)
    sirinaGrba = slika.width * r
    visinaGrba = slika.height * r
  }

  const visina =
    (visinaGrba ? visinaGrba + 60 : 0) +
    vrsticeNaslova.length * velN * 1.15 +
    16 + 64 +
    (p.drobno ? 80 : 20) +
    p.vrstice.length * 54

  let y = zacetekBloka(visina)

  if (visinaGrba) {
    c.drawImage(slika as HTMLImageElement, sredina - sirinaGrba / 2, y, sirinaGrba, visinaGrba)
    y += visinaGrba + 60
  }

  y += velN * 0.85
  c.fillStyle = SVETLA
  c.font = `900 ${velN}px Inter, "Segoe UI", system-ui, sans-serif`
  for (const vrstica of vrsticeNaslova) {
    c.fillText(vrstica, sredina, y)
    y += velN * 1.15
  }

  y += 16
  c.fillStyle = ZELENA
  c.font = '700 40px Inter, "Segoe UI", system-ui, sans-serif'
  c.fillText(p.podnaslov, sredina, y)

  if (p.drobno) {
    y += 64
    c.fillStyle = SIVA
    c.font = '400 34px Inter, "Segoe UI", system-ui, sans-serif'
    c.fillText(p.drobno, sredina, y)
  }

  y += 80
  c.fillStyle = SVETLA
  c.font = '600 36px Inter, "Segoe UI", system-ui, sans-serif'
  for (const vrstica of p.vrstice) {
    c.fillText(vrstica, sredina, y)
    y += 54
  }

  c.fillStyle = SIVA
  c.font = '400 30px Inter, "Segoe UI", system-ui, sans-serif'
  c.fillText('Točke iz uradnih zapisnikov: goli, minute, mreže', sredina, VISINA - 132)
  c.fillStyle = ZELENA
  c.font = '800 46px Inter, "Segoe UI", system-ui, sans-serif'
  c.fillText('slff.eu', sredina, VISINA - 68)

  return new Promise((resolve) => platno.toBlob((b) => resolve(b), 'image/png'))
}

export default function Plakat({
  podatki,
  grb,
  povezava,
}: {
  podatki: PodatkiPlakata
  grb: string | null
  povezava: string
}) {
  const [dela, setDela] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)

  async function deli() {
    const besedilo = `${podatki.naslov} — ${podatki.podnaslov}. SLFF, fantasy liga za slovenske lige.`
    // Sistemski meni pozna Facebook, WhatsApp, Viber in vse ostalo, kar ima
    // uporabnik nameščeno; na namizju ga večinoma ni.
    if (navigator.share) {
      try {
        await navigator.share({ title: `${podatki.naslov} — SLFF`, text: besedilo, url: povezava })
        return
      } catch {
        // Uporabnik je meni zaprl — to ni napaka.
        return
      }
    }
    try {
      await navigator.clipboard.writeText(`${besedilo} ${povezava}`)
      setSporocilo('Povezava je kopirana.')
    } catch {
      setSporocilo(povezava)
    }
  }

  async function prenesi() {
    setDela(true)
    setSporocilo(null)
    try {
      const blob = await narisi(podatki, grb)
      if (!blob) throw new Error('slike ni bilo mogoče izrisati')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = imeDatoteke(podatki.naslov)
      a.click()
      URL.revokeObjectURL(url)
      setSporocilo('Slika je shranjena — objavi jo na FB ali Instagramu.')
    } catch (e) {
      setSporocilo(`Slike ni bilo mogoče pripraviti: ${(e as Error).message}`)
    } finally {
      setDela(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button onClick={deli} className="gumb-tih px-3 py-2 text-sm">
          ↗ Deli povezavo
        </button>
        <button onClick={prenesi} disabled={dela} className="gumb-tih px-3 py-2 text-sm disabled:opacity-60">
          {dela ? 'Pripravljam …' : '⬇ Prenesi sliko za objavo'}
        </button>
      </div>
      {sporocilo && <p className="text-xs text-slate-400">{sporocilo}</p>}
    </div>
  )
}
