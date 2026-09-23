// Gumb "Deli" — plakat za objavo in povezava.
//
// Dve poti, ker sta dve omrežji: Facebook, WhatsApp in Viber vzamejo povezavo
// (sistemski meni), Instagram pa ne — tam mora slika povedati vse sama.
//
// Plakat je zgrajen kot program tekme, ne kot kartica: floodlit igrišče,
// ime čez vso širino, imena igralcev s točkami, en stavek. Vse levo
// poravnano. Oblikovan tako, da je bil izrisan in POGLEDAN, preden je šel
// v produkcijo — prva različica ni bila.
import DeliSliko from './DeliSliko'
import {
  SIRINA,
  VISINA,
  ROB,
  velikostImena,
  velikostEkipe,
  stavekNavijacev,
  skrajsajIme,
  prilagodiVelikost,
  ligaVTozilniku,
  velikostLige,
  imeDatoteke,
  type PodatkiPlakata,
  type VrsticaIgralca,
} from '../lib/plakat'
import { formatirajTocke, tockZ } from '../lib/pomozno'

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

function plosca(c: CanvasRenderingContext2D, x: number, y: number, d: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + d, y, x + d, y + d, r)
  c.arcTo(x + d, y + d, x, y + d, r)
  c.arcTo(x, y + d, x, y, r)
  c.arcTo(x, y, x + d, y, r)
  c.closePath()
}

/** Fotografija igrisca s prevleko — brez glave. */
async function foto(c: CanvasRenderingContext2D) {
  const slika = await naloziSliko('/foto/igrisce.jpg')
  if (slika) {
    const r = Math.max(SIRINA / slika.width, VISINA / slika.height)
    c.drawImage(slika, (SIRINA - slika.width * r) / 2, (VISINA - slika.height * r) / 2 - 40, slika.width * r, slika.height * r)
  } else {
    c.fillStyle = '#0E1F17'
    c.fillRect(0, 0, SIRINA, VISINA)
  }
  const g = c.createLinearGradient(0, 0, 0, VISINA)
  g.addColorStop(0, 'rgba(8,24,17,.30)')
  g.addColorStop(0.42, 'rgba(8,24,17,.55)')
  g.addColorStop(0.62, 'rgba(6,18,13,.92)')
  g.addColorStop(1, 'rgba(6,18,13,.98)')
  c.fillStyle = g
  c.fillRect(0, 0, SIRINA, VISINA)
}

/** Razlomi po besedah na vrstice, ozje od `najvec`. */
function vVrstice(c: CanvasRenderingContext2D, besedilo: string, najvec: number): string[] {
  const b = besedilo.split(' ')
  const out: string[] = []
  let t = b[0]
  for (const w of b.slice(1)) {
    const x = `${t} ${w}`
    if (c.measureText(x).width <= najvec) t = x
    else {
      out.push(t)
      t = w
    }
  }
  out.push(t)
  return out
}

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

/**
 * Plakat se rise v koordinatah 1080x1080, izvozi pa se pri `MERILO`-kratni
 * velikosti. Platno je vektorsko do trenutka izvoza: besedilo in SVG grbi
 * ostanejo ostri, ne pa raztegnjeni. 2 -> 2160x2160, kar Instagram in
 * Facebook sama zmanjsata brez izgube.
 */
const MERILO = 2

async function narisi(p: PodatkiPlakata): Promise<Blob | null> {
  const platno = document.createElement('canvas')
  platno.width = SIRINA * MERILO
  platno.height = VISINA * MERILO
  const c = platno.getContext('2d')
  if (!c) return null
  c.scale(MERILO, MERILO)

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
  } else if (p.vrsta === 'napoved') {
    // Napoved ne uporablja skupne glave: grb kluba stoji na kremni plošči
    // (JPG brez prozornosti sicer izgleda kot bel kvadrat), SLFF grb desno.
    const foto = await naloziSliko('/foto/igrisce.jpg')
    if (foto) {
      const r = Math.max(SIRINA / foto.width, VISINA / foto.height)
      c.drawImage(foto, (SIRINA - foto.width * r) / 2, (VISINA - foto.height * r) / 2 - 40, foto.width * r, foto.height * r)
    } else {
      c.fillStyle = '#0E1F17'
      c.fillRect(0, 0, SIRINA, VISINA)
    }
    const g = c.createLinearGradient(0, 0, 0, VISINA)
    g.addColorStop(0, 'rgba(8,24,17,.30)')
    g.addColorStop(0.42, 'rgba(8,24,17,.55)')
    g.addColorStop(0.62, 'rgba(6,18,13,.92)')
    g.addColorStop(1, 'rgba(6,18,13,.98)')
    c.fillStyle = g
    c.fillRect(0, 0, SIRINA, VISINA)

    const D = 156
    plosca(c, ROB, 84, D, 28)
    c.fillStyle = KREM
    c.fill()
    const grb = await naloziSliko(p.grb || '/logo/slff-grb.png')
    if (grb) {
      const r = (D - 28) / Math.max(grb.width, grb.height)
      const w = grb.width * r
      const h = grb.height * r
      c.drawImage(grb, ROB + (D - w) / 2, 84 + (D - h) / 2, w, h)
    }
    // SLFF grb enako velik in na enaki visini kot klubski: brez tega je bil
    // 124 px ob 156 px plosci in je izgledal manjsi in zamaknjen.
    const slff = await naloziSliko('/logo/slff-grb.png')
    if (slff && p.grb) c.drawImage(slff, SIRINA - ROB - D, 84, D, D)

    c.textAlign = 'left'
    c.fillStyle = KREM
    c.font = pisava(900, 150)
    c.letterSpacing = '-6px'
    c.fillText('PRIDI', ROB - 4, 478)
    c.fillText('SESTAVIT', ROB - 4, 618)
    c.fillStyle = ZLATA
    c.fillText('EKIPO.', ROB - 4, 758)
    c.letterSpacing = '0px'

    c.fillStyle = KREM
    c.font = pisava(800, 46)
    c.fillText(p.klub, ROB, 850)
    c.fillStyle = 'rgba(243,237,224,.72)'
    c.font = pisava(600, 32)
    c.fillText(`Fantasy liga za ${ligaVTozilniku(p.liga)} je odprta. Brezplačno.`, ROB, 900)

    c.fillStyle = ZLATA
    c.fillRect(ROB, VISINA - 104, 72, 5)
    c.fillStyle = KREM
    c.font = pisava(900, 46)
    c.fillText('slff.eu', ROB, VISINA - 40)
    c.textAlign = 'right'
    c.fillStyle = 'rgba(243,237,224,.6)'
    c.font = pisava(600, 28)
    c.fillText('točke iz uradnih zapisnikov MNZ', SIRINA - ROB, VISINA - 44)
    c.textAlign = 'left'
  } else if (p.vrsta === 'live') {
    await foto(c)
    const cx = SIRINA / 2
    const G = 250
    const cy = 230
    const grb = await naloziSliko('/logo/slff-grb.png')
    c.save()
    c.shadowColor = 'rgba(0,0,0,.6)'
    // Senca ne sledi `c.scale()` (izmerjeno: pri 2x je pol ozja), zato jo
    // pomnozimo rocno. Razmik med crkami merilu sledi in ostane, kot je.
    c.shadowBlur = 50 * MERILO
    c.shadowOffsetY = 16 * MERILO
    c.beginPath()
    c.arc(cx, cy, G / 2 + 10, 0, Math.PI * 2)
    c.fillStyle = ZLATA
    c.fill()
    c.restore()
    if (grb) c.drawImage(grb, cx - G / 2, cy - G / 2, G, G)

    c.textAlign = 'center'
    const liga = p.liga.toUpperCase()
    // Najprej izmerimo, koliko vrstic ime potrebuje, in sele nato izberemo
    // velikost — kratko ime v dveh vrsticah se je sicer zaletelo v nogo.
    c.font = pisava(900, 124)
    const stVrstic = vVrstice(c, liga, SIRINA - 2 * ROB).length
    const vel = velikostLige(liga, stVrstic)
    c.font = pisava(900, vel)
    c.letterSpacing = `${-Math.round(vel * 0.045)}px`
    const vrstice = vVrstice(c, liga, SIRINA - 2 * ROB)

    // Blok besedila je sredinjen v prostoru med znacko in nogo.
    const visina = 36 + 42 + vrstice.length * vel * 1.02 + vel * 0.62 + 8 + 76
    const vrh = cy + G / 2 + 40
    const dno = VISINA - 160
    let y = vrh + Math.max(0, (dno - vrh - visina) / 2) + 36

    c.fillStyle = 'rgba(243,237,224,.72)'
    c.font = pisava(700, 36)
    c.letterSpacing = '0px'
    c.fillText('Fantasy liga za', cx, y)
    y += 42 + vel * 0.82
    c.fillStyle = KREM
    c.font = pisava(900, vel)
    c.letterSpacing = `${-Math.round(vel * 0.045)}px`
    for (const v of vrstice) {
      c.fillText(v, cx, y)
      y += vel * 1.02
    }
    y -= vel * 1.02
    c.letterSpacing = '2px'
    y += vel * 0.62 + 8
    c.fillStyle = ZLATA
    c.font = pisava(900, Math.round(vel * 0.62))
    c.fillText('JE LIVE.', cx, y)
    c.letterSpacing = '0px'
    y += 76
    c.fillStyle = 'rgba(243,237,224,.72)'
    c.font = pisava(600, 34)
    c.fillText('Sestavi ekipo iz pravih igralcev. Točke iz uradnih zapisnikov.', cx, y)

    c.fillStyle = 'rgba(243,237,224,.55)'
    c.font = pisava(600, 28)
    c.fillText('brezplačno', cx, VISINA - 124)
    c.fillStyle = KREM
    c.font = pisava(900, 52)
    c.fillText('slff.eu', cx, VISINA - 72)
    c.textAlign = 'left'
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
    c.fillText(tockZ(p.tocke), ROB + w + 12, 400)
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
      c.fillText(p.odEkip ? `${p.mesto}. mesto od ${p.odEkip} ${p.odEkip === 1 ? 'ekipe' : 'ekip'}` : `${p.mesto}. mesto`, ROB, 616)
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
  const naslov =
    podatki.vrsta === 'krog' ? podatki.ekipa : podatki.vrsta === 'live' ? podatki.liga : podatki.klub
  const besedilo =
    podatki.vrsta === 'klub'
      ? `${podatki.klub} je v fantasy ligi SLFF — sestavi svojo ekipo iz naših igralcev.`
      : podatki.vrsta === 'napoved'
        ? `Pridi sestavit ekipo! Fantasy liga za ${ligaVTozilniku(podatki.liga)} je odprta — brezplačno, s pravimi igralci ${podatki.klub}.`
        : podatki.vrsta === 'live'
          ? `Fantasy liga za ${ligaVTozilniku(podatki.liga)} je live. Sestavi ekipo iz pravih igralcev — brezplačno.`
          : `${podatki.ekipa}: ${formatirajTocke(podatki.tocke)} ${tockZ(podatki.tocke)} v ${podatki.krog}. krogu. Sestavi svojo ekipo in me premagaj.`
  return (
    <DeliSliko
      narisi={() => narisi(podatki)}
      kljuc={JSON.stringify(podatki)}
      naslov={naslov}
      besedilo={besedilo}
      povezava={povezava}
      imeSlike={imeDatoteke(
        podatki.vrsta === 'napoved' ? `${naslov}-napoved` : podatki.vrsta === 'live' ? `${naslov}-live` : naslov,
      )}
    />
  )
}
