import { nastopi as osnovniNastopi, vBesedilo as osnovnoBesedilo } from './zapisnik.mjs'

// Meje tekem in ovitki razdelkov se razlikujejo, celice igralcev pa imajo
// skupen izvor. Razlike ostanejo v nastavitvah, da popravki veljajo za vse zveze.
const VIRI = {
  mnzpt: { meja: /<h1\b[^>]*>\s*Tekma:/gi, razdelki: 'tabela' },
  mnzms: { meja: /<div\b(?=[^>]*\bclass=["']sifraZapisnika["'])[^>]*>/gi, razdelki: 'kartice', javnaSifra: true },
  mnzle: { meja: /<div\b[^>]*\bid=["']tisk\d+["'][^>]*>/gi, razdelki: 'zlozenke' },
}

const SEZONA = /\b(\d{4}|\d{2})\/(\d{4}|\d{2})\b/
const KROG = /\b(\d+)\.\s*(?:krog|kolo)\b/i
const RAZDELKI = {
  postavi: 'postava', postava: 'postava', rezerve: 'rezerve',
  strelci: 'goli', opominjani: 'rumeni', izključeni: 'rdeci',
  menjave: 'menjave', zamenjave: 'menjave',
}
const prepoznajVir = (html) => Object.keys(VIRI).find((ime) => new RegExp(VIRI[ime].meja).test(html))

function dekodiraj(s) {
  const znaki = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', raquo: '»' }
  return s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (cel, znak) => {
    if (!znak.startsWith('#')) return znaki[znak.toLowerCase()] ?? cel
    const koda = /^#x/i.test(znak) ? parseInt(znak.slice(2), 16) : Number(znak.slice(1))
    return koda > 0 && koda <= 0x10ffff ? String.fromCodePoint(koda) : cel
  })
}

export const vBesedilo = (html) => osnovnoBesedilo(dekodiraj(html))

const sezonaIz = (s) => {
  const m = s.match(SEZONA)
  return m ? `${m[1].length === 2 ? '20' + m[1] : m[1]}/${m[2].slice(-2)}` : null
}

function datumIz(s) {
  const m = s.match(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}|\d{2})\b/)
  if (!m) return null
  const leto = m[3].length === 2 ? '20' + m[3] : m[3]
  const datum = `${leto}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const d = new Date(datum)
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === datum ? datum : null
}

// Besedilni izpis izgubi prazno domačo celico, slike vratarjev in stolpec AG.
// Majhno drevo ohrani te meje brez odvisnosti od brskalnika ali omrežja.
function drevo(html) {
  const koren = { tag: '', atributi: {}, otroci: [] }
  const sklad = [koren]
  const zapri = (tag) => {
    const i = sklad.findLastIndex((n) => n.tag === tag)
    if (i > 0) sklad.length = i
  }
  const cisto = html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  for (const m of cisto.matchAll(/<[^>]*>|[^<]+/g)) {
    const kos = m[0]
    if (!kos.startsWith('<')) {
      sklad.at(-1).otroci.push(dekodiraj(kos))
      continue
    }
    const oznaka = kos.match(/^<(\/)?([a-z][\w-]*)\b/i)
    if (!oznaka) continue
    const tag = oznaka[2].toLowerCase()
    if (oznaka[1]) { zapri(tag); continue }
    // Lendava zadnjo prazno celico večkrat pusti brez </td>.
    if (['tr', 'td', 'th'].includes(tag)) {
      const tabela = sklad.findLastIndex((n) => n.tag === 'table')
      const odprta = sklad.findLastIndex((n) => tag === 'tr' ? n.tag === 'tr' : ['td', 'th'].includes(n.tag))
      if (odprta > tabela) sklad.length = odprta
    }
    const atributi = {}
    for (const a of kos.slice(oznaka[0].length).matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))
      atributi[a[1].toLowerCase()] = dekodiraj(a[2] ?? a[3] ?? a[4])
    const stars = sklad.at(-1)
    const n = { tag, atributi, otroci: [], stars }
    stars.otroci.push(n)
    if (tag === 'br') n.otroci.push(' ')
    if (!/\/>$/.test(kos) && !/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag)) sklad.push(n)
  }
  return koren
}

function vozlisca(n) {
  return n.otroci.filter((o) => typeof o !== 'string').flatMap((o) => [o, ...vozlisca(o)])
}
const besedilo = (n) => !n ? '' : n.otroci.map((o) => typeof o === 'string' ? o : besedilo(o)).join('').replace(/\s+/g, ' ').trim()
const otroci = (n, tag) => n?.otroci.filter((o) => typeof o !== 'string' && (!tag || o.tag === tag)) ?? []
const slike = (n) => vozlisca(n).filter((o) => o.tag === 'img').map((o) => `${o.atributi.src ?? ''} ${o.atributi.alt ?? ''}`).join(' ')
const stevilo = (s) => /^\d+\.?$/.test(s) ? Number(s.replace(/\.$/, '')) : null
const minutaIz = (s) => {
  const m = s.match(/\b(\d{1,3})(?:\s*\+\s*(\d+))?\s*['’′]/)
  return m ? Number(m[1]) + Number(m[2] ?? 0) : null
}
const izidIz = (s) => {
  const m = s.match(/(\d+)\s*:\s*(\d+)/)
  return m ? [Number(m[1]), Number(m[2])] : null
}

function razdelki(koren, nastavitev, imena) {
  const vsa = vozlisca(koren)
  const poId = new Map(vsa.filter((n) => n.atributi.id).map((n) => [n.atributi.id, n]))
  const izhod = []
  for (const n of vsa) {
    if (n.tag !== (nastavitev.razdelki === 'tabela' ? 'h6' : 'button')) continue
    const naslov = besedilo(n).match(/^(postavi|postava|rezerve|strelci|opominjani|izključeni|menjave|zamenjave)(?::\s*(.+))?$/i)
    if (!naslov) continue
    const vrsta = RAZDELKI[naslov[1].toLowerCase()]
    let skupine
    if (nastavitev.razdelki === 'tabela') {
      const vrstica = n.stars?.stars
      const sorojenci = otroci(vrstica?.stars, 'tr')
      skupine = otroci(sorojenci[sorojenci.indexOf(vrstica) + 1], 'td')
    } else {
      const cilj = n.atributi['data-bs-target'] ?? n.atributi['data-target']
      const vsebina = poId.get(cilj?.replace(/^#/, ''))
      if (!vsebina) continue
      skupine = nastavitev.razdelki === 'kartice' ? [vsebina]
        : otroci(otroci(vsebina, 'div').find((d) => /\brow\b/.test(d.atributi.class ?? '')), 'div')
    }
    for (const [i, skupina] of skupine.entries()) {
      const ekipaIdx = nastavitev.razdelki === 'kartice' ? imena.indexOf(naslov[2]) : i
      if (ekipaIdx < 0 || ekipaIdx > 1) continue
      const tabela = vozlisca(skupina).find((o) => o.tag === 'table')
      if (tabela) izhod.push({ vrsta, ekipaIdx, tabela })
    }
  }
  return izhod
}

function igralciTabele(tabela, vrsta, opozorila) {
  let glava = []
  const izhod = []
  for (const vrstica of vozlisca(tabela).filter((n) => n.tag === 'tr')) {
    const celice = otroci(vrstica).filter((n) => ['td', 'th'].includes(n.tag))
    if (celice.some((c) => c.tag === 'th')) { glava = celice.map((c) => besedilo(c).toLowerCase()); continue }
    const vrednosti = celice.map(besedilo)
    const stIdx = glava.length ? glava.findIndex((g) => /št\..*dresa/.test(g))
      : vrednosti.findIndex((v) => /^\d{1,3}\.?$/.test(v))
    const st = stevilo(vrednosti[stIdx] ?? '')
    const imeIdx = glava.length ? glava.indexOf('priimek in ime') : stIdx + 1
    const ime = vrednosti[imeIdx]
    if (st == null || !ime) continue
    const celica = (vzorec) => celice[glava.findIndex((g) => vzorec.test(g))]
    const regSt = stevilo(besedilo(celica(/^reg\.\s*št\./)))
    const oznake = slike(vrstica)
    if (vrsta === 'postava' || vrsta === 'rezerve') {
      izhod.push({ st, ime, regSt, vratar: /vratar/i.test(oznake), kapetan: /kapetan/i.test(oznake) })
      continue
    }
    const minuta = minutaIz(glava.length ? besedilo(celica(/^min/)) : vrednosti.join(' '))
    if (minuta == null && vrsta !== 'menjave') {
      opozorila.push(`${ime}: v razdelku ${vrsta} manjka minuta`)
      continue
    }
    const da = (n) => /^(da|yes|1|x)$/i.test(besedilo(n)) || Boolean(n && /check|tick/i.test(slike(n)))
    izhod.push({ st, ime, regSt, minuta,
      rezultat: izidIz(besedilo(celica(/^rezultat$/))),
      avtogol: da(celica(/^(ag|avtogol)$/)) || /\(AG\)/i.test(vrednosti.join(' ')),
      enajstmetrovka: da(celica(/^11\s*m$/)) || /\(11\s*m\)/i.test(vrednosti.join(' ')),
      smer: /(?:\/|_)out\.(?:gif|svg|png)/i.test(oznake) ? 'ven'
        : /(?:\/|_)in\.(?:gif|svg|png)/i.test(oznake) ? 'noter' : null,
    })
  }
  return izhod
}

function razcleniTekmo(html, nastavitev, meta) {
  const vrstice = vBesedilo(html)
  const podatek = (ime) => {
    const i = vrstice.findIndex((v) => v === ime + ':')
    return i < 0 ? '' : vrstice[i + 1] ?? ''
  }
  const mRez = podatek('Rezultat').match(/^(\d+)\s*:\s*(\d+)\s*\(\s*(\d+)\s*:\s*(\d+)\s*\)$/)
  const imena = [podatek('Domači'), podatek('Gostje')]
  if (!mRez || imena.some((ime) => !ime)) return null
  const koren = drevo(html)
  const deli = razdelki(koren, nastavitev, imena)
  const ekipe = imena.map((ime) => ({ ime, postava: [], rezerve: [] }))
  const opozorila = []
  for (const d of deli) {
    d.igralci = igralciTabele(d.tabela, d.vrsta, opozorila)
    if (d.vrsta === 'postava' || d.vrsta === 'rezerve') ekipe[d.ekipaIdx][d.vrsta].push(...d.igralci)
  }
  // Tudi razpored lahko vsebuje izid; za nastope potrebujemo dejanski postavi.
  if (ekipe.some((e) => !e.postava.length)) return null
  const igralec = (i, ekipaIdx) => {
    const e = ekipe[ekipaIdx]
    const najden = [...e.postava, ...e.rezerve].find((p) => p.st === i.st && p.ime === i.ime)
    const regSt = i.regSt ?? najden?.regSt ?? null
    if (!najden) opozorila.push(`${e.ime}: ${i.ime} (${i.st}) ni v postavi ali rezervah`)
    return { st: i.st, ime: i.ime, regSt }
  }
  const goli = [], rumeni = [], rdeci = [], menjave = []
  for (const { vrsta, ekipaIdx, igralci } of deli) {
    if (vrsta === 'menjave') {
      let prvi = null
      for (const i of igralci) {
        if (!prvi) { prvi = i; continue }
        const minuta = prvi.minuta ?? i.minuta
        const smer = prvi.smer ?? (i.smer === 'ven' ? 'noter' : 'ven')
        if (minuta == null || (prvi.minuta != null && i.minuta != null && prvi.minuta !== i.minuta) ||
            (prvi.smer && i.smer && prvi.smer === i.smer)) {
          opozorila.push(`${imena[ekipaIdx]}: nepopolna menjava za ${prvi.ime}`)
          prvi = i
          continue
        }
        menjave.push({ ekipaIdx, minuta,
          noter: igralec(smer === 'noter' ? prvi : i, ekipaIdx),
          ven: igralec(smer === 'ven' ? prvi : i, ekipaIdx) })
        prvi = null
      }
      if (prvi) opozorila.push(`${imena[ekipaIdx]}: menjava za ${prvi.ime} nima para`)
    } else if (['goli', 'rumeni', 'rdeci'].includes(vrsta)) {
      for (const i of igralci) {
        const vpis = { ekipaIdx, ...igralec(i, ekipaIdx), minuta: i.minuta }
        if (vrsta === 'goli') goli.push({ ...vpis, rezultat: i.rezultat,
          avtogol: i.avtogol, enajstmetrovka: i.enajstmetrovka })
        else (vrsta === 'rumeni' ? rumeni : rdeci).push(vpis)
      }
    }
  }
  // Ptuj ne objavi tekočega izida. Kjer je naveden, njegov vrstni red
  // razreši tudi dva gola v isti minuti; sicer ga sestavimo iz minut.
  goli.sort((a, b) => a.rezultat && b.rezultat
    ? a.rezultat[0] + a.rezultat[1] - b.rezultat[0] - b.rezultat[1] : a.minuta - b.minuta)
  const zadetki = [0, 0]
  for (const g of goli) {
    zadetki[g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx]++
    if (g.rezultat && g.rezultat.some((n, i) => n !== zadetki[i]))
      opozorila.push(`${g.ime}: tekoči rezultat se ne ujema z zaporedjem golov`)
    g.rezultat ??= [...zadetki]
  }
  const rezultat = { domaci: Number(mRez[1]), gostje: Number(mRez[2]) }
  const polcas = { domaci: Number(mRez[3]), gostje: Number(mRez[4]) }
  for (const [i, e] of ekipe.entries()) {
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    if (e.postava.filter((p) => p.vratar).length !== 1) opozorila.push(`${e.ime}: postava nima natanko enega označenega vratarja`)
    if (zadetki[i] !== [rezultat.domaci, rezultat.gostje][i]) opozorila.push(`${e.ime}: število golov se ne ujema z rezultatom`)
  }
  const sezona = sezonaIz(vrstice.find((v) => SEZONA.test(v) && KROG.test(v)) ?? '') ?? meta.sezona
  const krog = Number(vrstice.find((v) => KROG.test(v))?.match(KROG)?.[1]) || meta.krog
  const datum = datumIz(podatek('Datum'))
  if (!sezona || !krog || !datum) opozorila.push('Manjka sezona, krog ali datum tekme')
  return { zapisnikId: meta.zapisnikId, url: meta.url, sezona, krog, datum,
    domaci: ekipe[0], gostje: ekipe[1], rezultat, polcas, goli,
    zgresene: [], rumeni, rdeci, menjave, opozorila }
}

/** Vsi odigrani zapisniki kroga; vir se lahko poda ali prepozna iz HTML-ja. */
export function zapisnikiIzKroga(html, { vir, url = null, sezona = null, krog = null } = {}) {
  if (vir && !VIRI[vir]) throw new Error(`Neznan vir zapisnikov: ${vir}`)
  vir ??= prepoznajVir(html)
  if (!vir) return []
  const nastavitev = VIRI[vir]
  const meje = [...html.matchAll(new RegExp(nastavitev.meja))]
  // Odlomek ene tekme je uporaben tudi brez zunanjega naslova, če klicatelj
  // poda sezono in krog. Glave celotne strani nikoli ne iščemo po arhivskem meniju.
  const pred = vBesedilo(html.slice(0, meje[0]?.index ?? 0))
  sezona = sezonaIz(sezona ?? '') ?? sezonaIz(pred.findLast((v) => SEZONA.test(v)) ?? '')
  krog ??= Number(pred.findLast((v) => KROG.test(v))?.match(KROG)?.[1]) || null
  const odseki = meje.length ? meje.map((m, i) => html.slice(m.index, meje[i + 1]?.index ?? html.length)) : [html]
  return odseki.flatMap((odsek) => {
    const zapisnikId = vir === 'mnzms' ? odsek.match(/^<div\b[^>]*\bid=["'](\d+)["']/i)?.[1] ?? null : null
    const z = razcleniTekmo(odsek, nastavitev, { zapisnikId, url, sezona, krog })
    if (!z) return []
    // tisk0 in položaj na strani nista identiteta tekme. Ptuj in Lendava
    // nimata javne šifre, zato ključ ne sme biti odvisen od vrstnega reda.
    z.zapisnikId ??= [vir, z.sezona, z.krog, z.domaci.ime, z.gostje.ime].map((s) => encodeURIComponent(s ?? '')).join(':')
    return [z]
  })
}

/** Pri strani z več tekmami je zapisnikId obvezen, da ne uvozimo napačne tekme. */
export function parsirajZapisnik(html, { zapisnikId = null, ...opts } = {}) {
  const vsi = zapisnikiIzKroga(html, opts)
  if (zapisnikId != null) {
    const izbran = vsi.find((z) => String(z.zapisnikId) === String(zapisnikId))
    if (izbran) return { ...izbran, zapisnikId }
    const vir = opts.vir ?? prepoznajVir(html)
    const nastavitev = VIRI[vir]
    // Podani ID je lahko zunanja oznaka enega odlomka brez javne šifre.
    // Šifre druge tekme in izbire s strani kroga pa ne smemo prepisati.
    if (nastavitev?.javnaSifra || Object.keys(VIRI).some((v) => String(zapisnikId).startsWith(v + ':')) ||
        (nastavitev && [...html.matchAll(new RegExp(nastavitev.meja))].length > 1)) return null
  }
  if (vsi.length !== 1) return null
  return { ...vsi[0], zapisnikId: zapisnikId ?? vsi[0].zapisnikId }
}

// Izračun minut ostane skupen, registracija pa mora preživeti tudi pretvorbo
// v nastop, sicer se stabilna identiteta izgubi tik pred uvozom.
export function nastopi(z) {
  return osnovniNastopi(z).map((n) => {
    const e = [z.domaci, z.gostje][n.ekipaIdx]
    return { ...n, regSt: [...e.postava, ...e.rezerve].find((i) => i.st === n.st)?.regSt ?? null }
  })
}

export function razclenjevalnikZa(vir) {
  if (!VIRI[vir]) throw new Error(`Neznan vir zapisnikov: ${vir}`)
  return {
    parsirajZapisnik: (html, opts) => parsirajZapisnik(html, { ...opts, vir }),
    zapisnikiIzKroga: (html, opts) => zapisnikiIzKroga(html, { ...opts, vir }),
    nastopi, vBesedilo,
  }
}
