// Gumb "Deli" — plakat za objavo in povezava.
//
// Dve poti, ker sta dve omrežji: Facebook, WhatsApp in Viber vzamejo povezavo
// (sistemski meni), Instagram pa ne — tam mora slika povedati vse sama.
//
// Plakat je zgrajen kot program tekme, ne kot kartica: floodlit igrišče,
// ime čez vso širino, imena igralcev s točkami, en stavek. Vse levo
// poravnano. Oblikovan tako, da je bil izrisan in POGLEDAN, preden je šel
// v produkcijo — prva različica ni bila.
import { useState } from 'react'
import {
  SIRINA,
  VISINA,
  ROB,
  velikostImena,
  velikostEkipe,
  stavekNavijacev,
  skrajsajIme,
  prilagodiVelikost,
  imeDatoteke,
  type PodatkiPlakata,
  type VrsticaIgralca,
} from '../lib/plakat'

const KREM = '#F3EDE0'
const ZLATA = '#D9A21B'

function naloziSliko(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const s = new Image()
    s.onload = () => resolve(s)
    s.onerror = () => resolve(null)
    s.src = src
  })
}

const pisava = (teza: number, px: number) => `${teza} ${px}px Inter, system-ui, sans-serif`

/** Ozadje in glava sta obema plakatoma skupna. */
async function ozadje(c: CanvasRenderingContext2D, liga: string, grbUrl: string | null) {
  const foto = await naloziSliko('/foto/igrisce.jpg')
  if (foto) {
    const r = Math.max(SIRINA / foto.width, VISINA / foto.height)
    const w = foto.width * r
    const h = foto.height * r
    c.drawImage(foto, (SIRINA - w) / 2, (VISINA - h) / 2 - 40, w, h)
  } else {
    c.fillStyle = '#0E1F17'
    c.fillRect(0, 0, SIRINA, VISINA)
  }
  // Reflektor zgoraj ostane; spodaj se zatemni, da imena berejo.
  const g = c.createLinearGradient(0, 0, 0, VISINA)
  g.addColorStop(0, 'rgba(8,24,17,.30)')
  g.addColorStop(0.42, 'rgba(8,24,17,.50)')
  g.addColorStop(0.62, 'rgba(6,18,13,.90)')
  g.addColorStop(1, 'rgba(6,18,13,.98)')
  c.fillStyle = g
  c.fillRect(0, 0, SIRINA, VISINA)

  const grb = await naloziSliko(grbUrl || '/logo/slff-grb.png')
  if (grb) {
    const r = 140 / Math.max(grb.width, grb.height)
    c.drawImage(grb, ROB, 88, grb.width * r, grb.height * r)
  }
  c.textAlign = 'right'
  c.fillStyle = 'rgba(243,237,224,.7)'
  c.font = pisava(600, 28)
  c.fillText(liga, SIRINA - ROB, 122)
  c.fillStyle = KREM
  c.font = pisava(800, 30)
  c.fillText('slff.eu', SIRINA - ROB, 164)
  c.textAlign = 'left'
}

/** Seznam igralcev: ime levo, tocke desno v zlati, kot na programu tekme. */
function seznam(
  c: CanvasRenderingContext2D,
  naslov: string,
  igralci: VrsticaIgralca[],
  y: number,
  velikost: number,
  razmik: number,
): number {
  c.fillStyle = 'rgba(243,237,224,.55)'
  c.font = pisava(600, 28)
  c.fillText(naslov, ROB, y)
  c.fillStyle = ZLATA
  c.fillRect(ROB, y + 18, 72, 5)
  for (const ig of igralci) {
    y += razmik
    // Prostor za ime: cela sirina brez stolpca s tockami. Predolgo ime se
    // skrajsa kot na programu tekme, ne odreze in ne prelije v stevilko.
    c.font = pisava(900, velikost)
    const sirinaTock = c.measureText(String(ig.tocke)).width + 40
    c.font = pisava(800, velikost)
    const oznaka = ig.kapetan ? '  ©' : ''
    const naVoljo = SIRINA - 2 * ROB - sirinaTock - c.measureText(oznaka).width
    const ime = skrajsajIme(ig.ime, naVoljo, (s) => c.measureText(s).width)
    c.textAlign = 'left'
    c.fillStyle = KREM
    c.fillText(ime + oznaka, ROB, y)
    c.textAlign = 'right'
    c.fillStyle = ZLATA
    c.font = pisava(900, velikost)
    c.fillText(String(ig.tocke), SIRINA - ROB, y)
  }
  c.textAlign = 'left'
  return y
}

async function narisi(p: PodatkiPlakata): Promise<Blob | null> {
  const platno = document.createElement('canvas')
  platno.width = SIRINA
  platno.height = VISINA
  const c = platno.getContext('2d')
  if (!c) return null

  if (p.vrsta === 'klub') {
    await ozadje(c, p.liga, p.grb)
    const ime = p.klub.toUpperCase()
    // Razred po dolzini je izhodisce; potem se pisava manjsa, dokler ime ne
    // pride v sirino. "ND POLZELA - ZDRUŽENA SAVINJSKA" je bil sicer 1211 px
    // v 912 px prostora.
    // Razmik med crkami raste s pisavo: -8px, ki pri 210px stisne naslov v
    // blok, pri 62px crke zlepi v necitljivo maso. Zato je sorazmeren.
    const razmik = (px: number) => `${-Math.round(px * 0.04)}px`
    const vel = prilagodiVelikost(ime, velikostImena(ime), 56, SIRINA - 2 * ROB + 8, (px, t) => {
      c.font = pisava(900, px)
      c.letterSpacing = razmik(px)
      return c.measureText(t).width
    })
    c.fillStyle = KREM
    c.font = pisava(900, vel)
    c.letterSpacing = razmik(vel)
    c.fillText(ime, ROB - 6, 470)
    c.letterSpacing = '0px'
    c.fillStyle = ZLATA
    c.font = pisava(700, 46)
    c.fillText('Sestavi svojo ekipo iz naših igralcev.', ROB, 540)
    seznam(c, 'Največ točk to sezono', p.igralci, 650, 54, 92)
    const stavek = stavekNavijacev(p.navijacev)
    if (stavek) {
      c.fillStyle = 'rgba(243,237,224,.62)'
      c.font = pisava(600, 32)
      c.fillText(stavek, ROB, VISINA - 72)
    }
  } else {
    await ozadje(c, p.liga, null)
    const tocke = String(p.tocke)
    c.fillStyle = KREM
    c.font = pisava(900, 250)
    c.letterSpacing = '-10px'
    c.fillText(tocke, ROB - 8, 470)
    c.letterSpacing = '0px'
    const w = c.measureText(tocke).width
    c.fillStyle = ZLATA
    c.font = pisava(800, 46)
    c.fillText('točk', ROB + w + 12, 400)
    c.fillStyle = 'rgba(243,237,224,.7)'
    c.font = pisava(600, 38)
    c.fillText(`${p.krog}. krog`, ROB + w + 12, 450)

    const ime = p.ekipa.toUpperCase()
    c.letterSpacing = '-3px'
    const velE = prilagodiVelikost(ime, velikostEkipe(ime), 36, SIRINA - 2 * ROB + 4, (px, t) => {
      c.font = pisava(900, px)
      return c.measureText(t).width
    })
    c.fillStyle = KREM
    c.font = pisava(900, velE)
    c.fillText(ime, ROB - 2, 560)
    c.letterSpacing = '0px'
    if (p.mesto) {
      c.fillStyle = ZLATA
      c.font = pisava(700, 40)
      c.fillText(p.odEkip ? `${p.mesto}. mesto od ${p.odEkip} ekip` : `${p.mesto}. mesto`, ROB, 616)
    }
    if (p.igralci.length) seznam(c, 'Moji najboljši v krogu', p.igralci, 680, 50, 84)
    c.fillStyle = 'rgba(243,237,224,.62)'
    c.font = pisava(600, 32)
    c.fillText('Sestavi svojo ekipo in me premagaj.', ROB, VISINA - 72)
  }

  return new Promise((resolve) => platno.toBlob((b) => resolve(b), 'image/png'))
}

export default function Plakat({
  podatki,
  povezava,
}: {
  podatki: PodatkiPlakata
  povezava: string
}) {
  const [dela, setDela] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)

  const naslov = podatki.vrsta === 'klub' ? podatki.klub : podatki.ekipa
  const besedilo =
    podatki.vrsta === 'klub'
      ? `${podatki.klub} je v fantasy ligi SLFF — sestavi svojo ekipo iz naših igralcev.`
      : `${podatki.ekipa}: ${podatki.tocke} točk v ${podatki.krog}. krogu. Sestavi svojo ekipo in me premagaj.`

  async function deli() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${naslov} — SLFF`, text: besedilo, url: povezava })
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
      const blob = await narisi(podatki)
      if (!blob) throw new Error('slike ni bilo mogoče izrisati')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = imeDatoteke(naslov)
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      // Naslova ne sprostimo takoj: brskalnik prenos šele začenja.
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
          Deli povezavo
        </button>
        <button onClick={prenesi} disabled={dela} className="gumb-tih px-3 py-2 text-sm disabled:opacity-60">
          {dela ? 'Pripravljam …' : 'Prenesi sliko za objavo'}
        </button>
      </div>
      {sporocilo && <p className="text-xs text-slate-400">{sporocilo}</p>}
    </div>
  )
}
