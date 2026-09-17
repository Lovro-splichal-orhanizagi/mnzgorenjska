// Gumb "Deli" — plakat za objavo in povezava v domači aplikaciji.
//
// Dve poti, ker sta dve omrežji:
//   • Facebook, WhatsApp in Viber vzamejo POVEZAVO — odpre se sistemski meni
//     za deljenje, na namizju pa se naslov prekopira.
//   • Instagram povezav ne sprejme, zato mora SLIKA sama povedati vse. Zato
//     ni ena skupna slika, ampak plakat, ki nastane v brskalniku za vsak klub
//     in vsak rezultat posebej.
import { useState } from 'react'
import {
  SIRINA,
  VISINA,
  velikostNaslova,
  visinaKartice,
  zacetekKartice,
  imeDatoteke,
  type PodatkiPlakata,
} from '../lib/plakat'

const KREM = '#faf6ec'
const TEMNA = '#10261c'
const ZLATA = '#e3a008'
const SIVA = '#7b8d83'
const ZELENA = '#1d6b48'
const GRB = 208

function naloziSliko(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const s = new Image()
    s.onload = () => resolve(s)
    s.onerror = () => resolve(null)
    s.src = src
  })
}

function zaokrozen(
  c: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

async function narisi(p: PodatkiPlakata, grbUrl: string | null): Promise<Blob | null> {
  const platno = document.createElement('canvas')
  platno.width = SIRINA
  platno.height = VISINA
  const c = platno.getContext('2d')
  if (!c) return null

  // Ozadje je fotografija razsvetljenega igrišča — nedeljska liga je večinoma
  // to. Čez gre zelena prevleka, da kartica in besedilo držita kontrast.
  const foto = await naloziSliko('/foto/igrisce.jpg')
  if (foto) {
    const r = Math.max(SIRINA / foto.width, VISINA / foto.height)
    const w = foto.width * r
    const h = foto.height * r
    c.drawImage(foto, (SIRINA - w) / 2, (VISINA - h) / 2, w, h)
  } else {
    c.fillStyle = ZELENA
    c.fillRect(0, 0, SIRINA, VISINA)
  }
  const g = c.createLinearGradient(0, 0, 0, VISINA)
  g.addColorStop(0, 'rgba(10,44,30,.22)')
  g.addColorStop(0.45, 'rgba(10,44,30,.04)')
  g.addColorStop(1, 'rgba(6,26,18,.52)')
  c.fillStyle = g
  c.fillRect(0, 0, SIRINA, VISINA)

  const mid = SIRINA / 2
  const rob = 64
  const CH = visinaKartice(p, GRB)
  const CY = zacetekKartice(CH)

  c.save()
  c.shadowColor = 'rgba(0,0,0,.55)'
  c.shadowBlur = 56
  c.shadowOffsetY = 20
  c.fillStyle = KREM
  zaokrozen(c, rob, CY, SIRINA - 2 * rob, CH, 48)
  c.fill()
  c.restore()

  // Grb čez zgornji rob kartice — klubski, če ga ima, sicer SLFF.
  const grb = await naloziSliko(grbUrl || '/logo/slff-grb.png')
  if (grb) {
    const r = GRB / Math.max(grb.width, grb.height)
    const w = grb.width * r
    const h = grb.height * r
    c.beginPath()
    c.arc(mid, CY, GRB / 2 + 14, 0, Math.PI * 2)
    c.fillStyle = KREM
    c.fill()
    c.drawImage(grb, mid - w / 2, CY - h / 2, w, h)
  }

  c.textAlign = 'center'
  let y = CY + GRB * 0.55 + 54

  if (p.liga) {
    c.fillStyle = SIVA
    c.font = '800 27px Inter, system-ui, sans-serif'
    c.fillText(p.liga.toUpperCase(), mid, y)
  }
  y += 46

  const vel = velikostNaslova(p.naslov)
  c.fillStyle = TEMNA
  c.font = `900 ${vel}px Inter, system-ui, sans-serif`
  c.fillText(p.naslov, mid, y + vel * 0.76)
  y += vel + 22

  c.fillStyle = ZELENA
  c.font = '900 198px Inter, system-ui, sans-serif'
  c.fillText(String(p.stevilo), mid, y + 156)
  y += 194

  c.fillStyle = SIVA
  c.font = '800 31px Inter, system-ui, sans-serif'
  c.fillText(p.oznaka.toUpperCase(), mid, y)
  y += 48

  if (p.znacka) {
    c.font = '800 31px Inter, system-ui, sans-serif'
    const w = c.measureText(p.znacka).width + 72
    c.fillStyle = ZLATA
    zaokrozen(c, mid - w / 2, y, w, 60, 30)
    c.fill()
    c.fillStyle = TEMNA
    c.fillText(p.znacka, mid, y + 41)
  }

  c.fillStyle = 'rgba(250,246,236,.85)'
  c.font = '700 25px Inter, system-ui, sans-serif'
  c.fillText('TOČKE IZ URADNIH ZAPISNIKOV MNZ', mid, VISINA - 118)
  c.fillStyle = KREM
  c.font = '900 48px Inter, system-ui, sans-serif'
  c.fillText('slff.eu', mid, VISINA - 62)

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
    const besedilo = `${podatki.naslov} — ${podatki.stevilo} ${podatki.oznaka}. SLFF, fantasy liga za slovenske lige.`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${podatki.naslov} — SLFF`, text: besedilo, url: povezava })
      } catch {
        // Uporabnik je meni zaprl — to ni napaka.
      }
      return
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
      // Sidro mora biti v dokumentu, sicer ga del brskalnikov (Safari, mobilni
      // Chrome) ne sprozi.
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      // Naslova NE sprostimo takoj: brskalnik prenos sele zacenja in
      // predcasen `revokeObjectURL` ga utegne prekiniti — prav zato prenos
      // prej ni ustvaril datoteke.
      setTimeout(() => {
        URL.revokeObjectURL(url)
        a.remove()
      }, 30000)
      setSporocilo('Slika je shranjena — objavi jo na Instagramu ali Facebooku.')
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
        <button
          onClick={prenesi}
          disabled={dela}
          className="gumb-tih px-3 py-2 text-sm disabled:opacity-60"
        >
          {dela ? 'Pripravljam …' : '⬇ Prenesi sliko za objavo'}
        </button>
      </div>
      {sporocilo && <p className="text-xs text-slate-400">{sporocilo}</p>}
    </div>
  )
}
