// Primorska članska liga je skupna liga MNZ Nova Gorica in MNZ Koper,
// zato isti parser pokriva obe zvezi. Registrskih številk ta vir ne objavlja.
import { vBesedilo } from './zapisnik.mjs'
export { nastopi, vBesedilo } from './zapisnik.mjs'

const OSNOVNI = 'https://mnzgorica.si'

function brezKode(html) {
  return html.replace(/<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, '')
}

function dekodiraj(s) {
  return s.replace(/&#(x[\da-f]+|\d+);/gi, (cel, koda) => {
    const n = koda[0].toLowerCase() === 'x' ? parseInt(koda.slice(1), 16) : Number(koda)
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : cel
  }).replace(/&(?:nbsp|amp|quot|apos|ndash|mdash);/g, (entiteta) => ({
    '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&ndash;': '–', '&mdash;': '—',
  })[entiteta])
}

const besedilo = (html = '') => dekodiraj(vBesedilo(html).join(' ')).replace(/\s+/g, ' ').trim()

// sub-in vsebuje še en span, report-card pa več divov. Prvi zaključni tag
// zato ni konec elementa; globina ohrani imena in oba igralca iste menjave.
function elementi(html, tag, razred = null) {
  const izraz = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi')
  const najdeni = []
  let od = null
  let globina = 0
  for (const m of html.matchAll(izraz)) {
    if (od === null) {
      if (m[1]) continue
      const razredi = m[0].match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2].split(/\s+/) ?? []
      if (razred && !razredi.includes(razred)) continue
      od = m.index + m[0].length
      globina = 1
    } else {
      globina += m[1] ? -1 : 1
      if (globina === 0) {
        najdeni.push(html.slice(od, m.index))
        od = null
      }
    }
  }
  return najdeni
}

const prvoBesedilo = (html, tag, razred) => besedilo(elementi(html, tag, razred)[0])

function izid(s) {
  const m = s.match(/\b(\d+)\s*:\s*(\d+)\b/)
  return m ? { domaci: Number(m[1]), gostje: Number(m[2]) } : null
}

function minutaIz(s) {
  const m = s.match(/^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?\s*['’′]?\s*$/)
  return m ? Number(m[1]) + Number(m[2] ?? 0) : null
}

function postava(html, naslov) {
  const blok = elementi(html, 'div', 'lineup-block')
    .find((b) => prvoBesedilo(b, 'h3') === naslov)
  return elementi(blok ?? '', 'div', 'player-row').flatMap((vrstica) => {
    const st = prvoBesedilo(vrstica, 'span')
    const ime = prvoBesedilo(vrstica, 'strong')
    if (!/^\d{1,3}$/.test(st) || !ime) return []
    const oznake = prvoBesedilo(vrstica, 'small').split(/[^VK]+/)
    return [{ st: Number(st), ime, vratar: oznake.includes('V'), kapetan: oznake.includes('K') }]
  })
}

function igralecMenjave(html) {
  const st = prvoBesedilo(html, 'span', 'sub-num')
  const ime = besedilo(html.replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, ''))
  return /^\d{1,3}$/.test(st) && ime ? { st: Number(st), ime } : null
}

/** Enaka pogodba kot zapisnik.mjs; brez uporabnih postav in rezultata vrne null. */
export function parsirajZapisnik(html, { zapisnikId = null, url = null } = {}) {
  const h = brezKode(html)
  if (/Zapisnik za izbrano tekmo ni na voljo/i.test(besedilo(h))) return null
  const glava = elementi(h, 'div', 'report-match-hero')[0] ?? ''
  const glavno = elementi(h, 'main', 'report-shell')[0] ?? ''
  const rezultat = izid(prvoBesedilo(glava, 'span', 'report-score-main'))
  if (!rezultat || !glavno) return null

  const kartice = [...elementi(glavno, 'article', 'report-card'), ...elementi(glavno, 'section', 'report-card')]
  const ekipe = kartice.filter((k) => elementi(k, 'div', 'lineup-block').length).map((k) => ({
    ime: prvoBesedilo(k, 'h2'),
    postava: postava(k, 'Začetna postava'),
    rezerve: postava(k, 'Rezervni igralci'),
  }))
  if (ekipe.length !== 2 || ekipe.some((e) => !e.ime || !e.postava.length)) return null

  const meta = prvoBesedilo(glava, 'div', 'report-match-meta')
  const mDatum = meta.match(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}|\d{2})\b/)
  const datum = mDatum
    ? `${mDatum[3].length === 4 ? mDatum[3] : '20' + mDatum[3]}-${mDatum[2].padStart(2, '0')}-${mDatum[1].padStart(2, '0')}`
    : null
  const mKrog = meta.match(/\b(\d+)\.\s*krog\b/i)
  const mSezona = besedilo(glava).match(/\b(\d{4}|\d{2})\/(\d{4}|\d{2})\b/)
  // V shranjenem zapisniku sezona manjka. U13/12 v meniju ni sezona;
  // uporabimo datum tekme in julijsko mejo, enako kot obstoječi razpored.
  const letoSezone = datum ? Number(datum.slice(0, 4)) - (Number(datum.slice(5, 7)) < 7 ? 1 : 0) : null
  const sezona = mSezona
    ? `${mSezona[1].length === 2 ? '20' + mSezona[1] : mSezona[1]}/${mSezona[2].slice(-2)}`
    : letoSezone !== null ? `${letoSezone}/${String(letoSezone + 1).slice(-2)}` : null
  const opozorila = []

  const poEkipah = (naslov, preberi) => {
    const kartica = kartice.find((k) => prvoBesedilo(k, 'h2') === naslov)
    if (!kartica) return []
    return elementi(kartica, 'section', 'event-group').flatMap((skupina) => {
      const ime = prvoBesedilo(skupina, 'h3').replace(/\s*·\s*(rumeni|rdeči)\s*$/i, '')
      const idx = ekipe.findIndex((e) => e.ime === ime)
      if (idx < 0) {
        opozorila.push(`${naslov}: neznana ekipa »${ime}«`)
        return []
      }
      return preberi(skupina, idx)
    })
  }

  const dogodki = (naslov, gol = false) => poEkipah(naslov, (skupina, idx) =>
    elementi(skupina, 'div', 'event-row').flatMap((vrstica) => {
      const ime = prvoBesedilo(vrstica, 'strong')
      const minuta = minutaIz(prvoBesedilo(vrstica, 'small'))
      // Številko dresa dogodka smemo dopolniti le iz nedvoumne postave iste
      // ekipe. Ugibanje pri soimenjakih bi pripisalo gol napačnemu igralcu.
      const kandidati = [...ekipe[idx].postava, ...ekipe[idx].rezerve]
        .filter((i) => i.ime.toLowerCase() === ime.toLowerCase())
      if (kandidati.length !== 1 || minuta === null) {
        opozorila.push(`${naslov} (${ekipe[idx].ime}): dogodka »${ime}« ni mogoče povezati z igralcem in minuto`)
        return []
      }
      const igralec = { st: kandidati[0].st, ime }
      if (!gol) return [{ ekipaIdx: idx, ...igralec, minuta }]
      const stanje = izid(prvoBesedilo(vrstica, 'em'))
      if (!stanje) {
        opozorila.push(`Strelci (${ekipe[idx].ime}): pri »${ime}« manjka rezultat`)
        return []
      }
      const oznake = besedilo(vrstica)
      return [{
        ekipaIdx: idx,
        rezultat: [stanje.domaci, stanje.gostje],
        ...igralec,
        minuta,
        avtogol: /\b(?:AG|avtogol)\b/i.test(oznake),
        enajstmetrovka: /\b(?:11\s*m|enajstmetrovka)\b/i.test(oznake),
      }]
    }))

  const goli = dogodki('Strelci', true)
  const rumeni = dogodki('Opominjani')
  const rdeci = dogodki('Izključeni')
  const menjave = poEkipah('Menjave', (skupina, idx) =>
    elementi(skupina, 'div', 'sub-row').flatMap((vrstica) => {
      const minuta = minutaIz(prvoBesedilo(vrstica, 'span', 'sub-min'))
      // Smer določata oznaki HTML. Ponovljena minuta pred drugim igralcem
      // tako ne izgubi prvega igralca in ne spremeni izstopa v vstop.
      const noter = igralecMenjave(elementi(vrstica, 'span', 'sub-in')[0] ?? '')
      const ven = igralecMenjave(elementi(vrstica, 'span', 'sub-out')[0] ?? '')
      if (minuta === null || !noter || !ven) {
        opozorila.push(`Menjave (${ekipe[idx].ime}): nepopolna menjava »${besedilo(vrstica)}«`)
        return []
      }
      return [{ ekipaIdx: idx, minuta, noter, ven }]
    }))

  for (const [idx, e] of ekipe.entries()) {
    if (e.postava.length !== 11)
      opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (vratarjev !== 1)
      opozorila.push(`${e.ime}: označenih vratarjev je ${vratarjev} namesto 1`)
    const golov = goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
    if (golov !== [rezultat.domaci, rezultat.gostje][idx])
      opozorila.push(`${e.ime}: število golov (${golov}) se ne ujema z rezultatom`)
  }

  return {
    zapisnikId, url, sezona, krog: mKrog ? Number(mKrog[1]) : null, datum,
    domaci: ekipe[0], gostje: ekipe[1], rezultat,
    polcas: izid(prvoBesedilo(glava, 'span', 'report-score-ht')),
    goli, zgresene: [], rumeni, rdeci, menjave, opozorila,
  }
}

/** Iz rezultatov vrne enkratne povezave oblike { krog, matchId }, v vrstnem redu strani. */
export function izlusciPovezaveZapisnikov(html) {
  const najdene = new Map()
  for (const m of brezKode(html).matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)) {
    let url
    try { url = new URL(dekodiraj(m[2]), OSNOVNI) } catch { continue }
    if (!['mnzgorica.si', 'www.mnzgorica.si'].includes(url.hostname) ||
        !['https:', 'http:'].includes(url.protocol)) continue
    const pot = url.pathname.match(/^\/tekmovanja\/(\d+)\/zapisnik\/(\d+)\/(\d+)\/?$/)
    if (!pot || Number(pot[2]) < 1 || Number(pot[3]) < 1) continue
    const kljuc = `${pot[1]}/${Number(pot[2])}/${Number(pot[3])}`
    najdene.set(kljuc, { krog: Number(pot[2]), matchId: Number(pot[3]) })
  }
  return [...najdene.values()]
}
