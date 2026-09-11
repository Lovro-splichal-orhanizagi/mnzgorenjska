// Maribor uporablja tabele NZS z razredi stolpcev. Če bi HTML sploščili
// pred razčlenjevanjem, bi izgubili povezavo med minuto, igralcema in ekipo.

function brezSkript(html) {
  return html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
}

function dekodiraj(s) {
  const entitete = { nbsp: ' ', amp: '&', quot: '"', apos: "'", prime: '′', ndash: '–', mdash: '—' }
  return s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (celota, koda) => {
    if (koda[0] !== '#') return entitete[koda.toLowerCase()] ?? celota
    const st = koda[1].toLowerCase() === 'x' ? parseInt(koda.slice(2), 16) : Number(koda.slice(1))
    return st > 0 && st <= 0x10ffff ? String.fromCodePoint(st) : celota
  })
}

const besedilo = (html = '') => dekodiraj(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

function atribut(atributi, ime) {
  const m = atributi.match(new RegExp(`(?:^|\\s)${ime}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return dekodiraj(m?.[1] ?? m?.[2] ?? m?.[3] ?? '')
}

const imaRazred = (atributi, razred) => atribut(atributi, 'class').split(/\s+/).includes(razred)

// Uporabljamo le oznake, ki v teh tabelah niso gnezdene vase (table, tr,
// td, span ...). Razred preverimo kot celo besedo, da player ni player_num.
function elementi(html, oznaka, razred = null) {
  return [...html.matchAll(new RegExp(`<${oznaka}\\b([^>]*)>([\\s\\S]*?)<\\/${oznaka}\\s*>`, 'gi'))]
    .filter((m) => !razred || imaRazred(m[1], razred))
    .map((m) => ({ atributi: m[1], vsebina: m[2] }))
}

const polje = (html, razred, oznaka = 'td') => elementi(html, oznaka, razred)[0]?.vsebina ?? ''

function rezultatIz(html) {
  const m = besedilo(html).match(/^(\d+)\s*:\s*(\d+)(?:\s|$)/)
  return m ? { domaci: Number(m[1]), gostje: Number(m[2]) } : null
}

function minutaIz(html) {
  const m = besedilo(html).match(/^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?\s*['′’]?$/)
  return m ? Number(m[1]) + Number(m[2] ?? 0) : null
}

function igralecIz(vrstica, razred = 'player_name') {
  const stevilka = besedilo(polje(vrstica, 'player_num'))
  const ime = besedilo(polje(vrstica, razred))
  return /^\d{1,3}$/.test(stevilka) && ime ? { st: Number(stevilka), ime } : null
}

function postavaIz(tabela) {
  const ekipa = { ime: besedilo(elementi(tabela, 'thead')[0]?.vsebina), postava: [], rezerve: [] }
  let seznam = ekipa.postava
  for (const { vsebina } of elementi(tabela, 'tr')) {
    if (/^Rezervni igralci$/i.test(besedilo(vsebina))) {
      seznam = ekipa.rezerve
      continue
    }
    let vratar = false
    let kapetan = false
    const brezOznak = vsebina.replace(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi, (celota, atributi, oznaka) => {
      const v = imaRazred(atributi, 'player-v') || /^\(?V\)?$/.test(besedilo(oznaka))
      const k = imaRazred(atributi, 'player-k') || /^\(?K\)?$/.test(besedilo(oznaka))
      vratar ||= v
      kapetan ||= k
      return v || k ? '' : celota
    })
    const igralec = igralecIz(brezOznak)
    if (igralec) seznam.push({ ...igralec, vratar, kapetan })
  }
  return ekipa
}

function sezonaIz(html, porocilo, url) {
  const sezona = /\b(\d{4}|\d{2})\s*\/\s*(\d{4}|\d{2})\b/
  const izSluga = (naslov) => naslov?.match(/\/tekmovanje\/[^/?#]+-(\d{4}|\d{2})-(\d{4}|\d{2})(?:\/|$)/)
  // Meni vsebuje druge lige in arhiv. Naslov tekme, podani URL in lastni
  // obrazec zapisnika so zanesljivejši od prve letnice kjerkoli na strani.
  const naslov = elementi(html, 'h1').map((e) => besedilo(e.vsebina)).join(' ')
  // Tudi menjava 17 / 27 je videti kot sezona; besedilo igralnih dogodkov
  // zato nikoli ne sodeluje pri iskanju letnic.
  const glava = elementi(porocilo, 'h3').map((e) => besedilo(e.vsebina)).join(' ')
  const obrazec = [...html.matchAll(/<form\b([^>]*)>/gi)]
    .map((m) => atribut(m[1], 'action'))
    .find((a) => /\/zapisnik\/?\?event=\d+/.test(a))
  const m = naslov.match(sezona) ?? glava.match(sezona) ?? izSluga(url) ?? izSluga(obrazec)
  return m ? `${m[1].length === 2 ? '20' + m[1] : m[1]}/${m[2].slice(-2)}` : null
}

/** Vrne pogodbo zapisnik.mjs; polčas brez podatka ima obe vrednosti null. */
export function parsirajZapisnik(html, { zapisnikId = null, url = null } = {}) {
  html = brezSkript(html)
  const zacetek = [...html.matchAll(/<div\b([^>]*)>/gi)].find((m) => imaRazred(m[1], 'media_report'))
  if (!zacetek) return null
  // Stranski stolpec ima svoje rezultate in strelce, ki ne pripadajo tekmi.
  const seznam = html.slice(zacetek.index).split(/<\/ul\s*>/i)[0]
  const porocilo = elementi(seznam, 'li', 'event')[0]?.vsebina
  if (!porocilo) return null

  const glava = polje(porocilo, 'event_score', 'tr')
  const imeDomaci = besedilo(polje(glava, 'team_home'))
  const imeGostje = besedilo(polje(glava, 'team_guest'))
  const koncni = polje(glava, 'score')
  const rezultat = rezultatIz(koncni.replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, ''))
  if (!imeDomaci || !imeGostje || !rezultat) return null
  const polcas = rezultatIz(polje(koncni, 'halftime', 'span')) ?? { domaci: null, gostje: null }

  const tabele = elementi(porocilo, 'table')
  const postave = tabele.filter((t) => polje(t.vsebina, 'player_name') && !imaRazred(t.atributi, 'goals'))
    .map((t) => postavaIz(t.vsebina))
  const ekipe = [imeDomaci, imeGostje].map((ime) => postave.find((e) => e.ime === ime))
  if (ekipe.some((e) => !e?.postava.length)) return null

  const podatki = besedilo(elementi(porocilo, 'h3')[0]?.vsebina)
  const mKrog = podatki.match(/\b(\d+)\.\s*krog\b/i)
  const mDatum = podatki.match(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}|\d{2})\b/)
  const datum = mDatum
    ? `${mDatum[3].length === 2 ? '20' + mDatum[3] : mDatum[3]}-${mDatum[2].padStart(2, '0')}-${mDatum[1].padStart(2, '0')}`
    : null
  const opozorila = []
  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  const ekipaIz = (vrstica) => ekipe.findIndex((e) => e.ime === besedilo(polje(vrstica, 'club')))

  for (const { vsebina } of elementi(polje(porocilo, 'goals', 'table'), 'tr')) {
    if (!elementi(vsebina, 'td').length) continue
    const igralec = igralecIz(vsebina)
    const ekipaIdx = ekipaIz(vsebina)
    const minuta = minutaIz(polje(vsebina, 'timestamp'))
    const tekoce = rezultatIz(polje(vsebina, 'score'))
    if (!igralec || ekipaIdx < 0 || minuta === null || !tekoce) {
      opozorila.push(`Nepopoln zadetek: ${besedilo(vsebina)}`)
      continue
    }
    const vrsta = besedilo(polje(vsebina, 'goal_type')).toLowerCase()
    const avtogol = /^ag$/.test(vrsta)
    const enajstmetrovka = /^11\s*m$/.test(vrsta)
    if (vrsta && !avtogol && !enajstmetrovka) opozorila.push(`Neznana oznaka zadetka: ${vrsta}`)
    // Stolpec club navaja ekipo STRELCA tudi pri avtogolu (Hedl, Brunšvik).
    // nastopi potrebuje to ekipo, čeprav se rezultat poveča nasprotniku.
    goli.push({ ekipaIdx, rezultat: [tekoce.domaci, tekoce.gostje], ...igralec, minuta, avtogol, enajstmetrovka })
  }

  for (const { vsebina } of elementi(polje(porocilo, 'game_events', 'table'), 'tr')) {
    if (!elementi(vsebina, 'td').length) continue
    const ekipaIdx = ekipaIz(vsebina)
    const minuta = minutaIz(polje(vsebina, 'timestamp'))
    const vrsta = polje(vsebina, 'type')
    if (ekipaIdx < 0 || minuta === null) {
      opozorila.push(`Nepopoln dogodek: ${besedilo(vsebina)}`)
      continue
    }
    if (/\bmenjava\.png\b/i.test(vrsta)) {
      const stevilki = besedilo(polje(vsebina, 'player_num')).match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/)
      const imeni = besedilo(polje(vsebina, 'player')).split(/\s*\/\s*/)
      if (!stevilki || imeni.length !== 2 || imeni.some((ime) => !ime)) {
        opozorila.push(`Nepopolna menjava: ${besedilo(vsebina)}`)
        continue
      }
      // V vzorcu je 17 / 27 = začetnik Rajšp / rezerva Pelcl. Minuta 54′
      // je v timestamp iste vrstice, zato ne prenašamo minute med dogodki.
      menjave.push({
        ekipaIdx, minuta,
        noter: { st: Number(stevilki[2]), ime: imeni[1] },
        ven: { st: Number(stevilki[1]), ime: imeni[0] },
      })
    } else {
      const kartoni = /\brumen_k\.png\b/i.test(vrsta) ? rumeni
        : /\brdec_k\.png\b/i.test(vrsta) ? rdeci : null
      const igralec = igralecIz(vsebina, 'player')
      if (kartoni && igralec) kartoni.push({ ekipaIdx, ...igralec, minuta })
      else opozorila.push(`Neprepoznan dogodek: ${besedilo(vsebina)} (${vrsta.match(/src=["']([^"']+)/i)?.[1] ?? 'brez ikone'})`)
    }
  }

  for (const [i, e] of ekipe.entries()) {
    const oznaka = i === 0 ? 'domači' : 'gostje'
    if (e.postava.length !== 11) opozorila.push(`${oznaka} (${e.ime}): v postavi je ${e.postava.length} igralcev namesto 11`)
    const vratarjev = e.postava.filter((p) => p.vratar).length
    if (vratarjev !== 1) opozorila.push(`${oznaka} (${e.ime}): označenih vratarjev je ${vratarjev} namesto 1`)
  }
  const zadetki = [0, 0]
  for (const g of goli) zadetki[g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx]++
  if (zadetki[0] !== rezultat.domaci || zadetki[1] !== rezultat.gostje) {
    opozorila.push(`Zadetki pomenijo ${zadetki.join(':')}, rezultat pa je ${rezultat.domaci}:${rezultat.gostje}`)
  }

  return {
    zapisnikId, url,
    sezona: sezonaIz(html, porocilo, url),
    krog: mKrog ? Number(mKrog[1]) : null,
    datum,
    domaci: ekipe[0], gostje: ekipe[1],
    rezultat, polcas, goli, zgresene: [], rumeni, rdeci, menjave, opozorila,
  }
}

/** ID-ji vseh tekem, tudi še neodigranih; nizi ustrezajo uvozniku zapisnikov. */
export function izlusciIdjeZapisnikov(html) {
  html = brezSkript(html)
  // Povezavo na zapisnik dobi šele odigrana tekma, data-event_id pa ima
  // vsaka vrstica razporeda. Stranski stolpec iste povezave ponavlja.
  const razpored = elementi(html, 'ol', 'event_rounds')[0]?.vsebina ?? html
  const ids = new Set()
  for (const m of razpored.matchAll(/<tr\b([^>]*)>/gi)) {
    const id = atribut(m[1], 'data-event_id')
    if (/^[1-9]\d*$/.test(id)) ids.add(id)
  }
  for (const { atributi } of elementi(razpored, 'a')) {
    const href = atribut(atributi, 'href')
    const m = href.match(/\/zapisnik\/?\?[^#]*?\bevent=(\d+)(?:[&#]|$)/)
    if (m && /^[1-9]\d*$/.test(m[1])) ids.add(m[1])
  }
  return [...ids].sort((a, b) => Number(a) - Number(b))
}
