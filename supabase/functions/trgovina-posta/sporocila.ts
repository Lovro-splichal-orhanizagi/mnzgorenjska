// Maili trgovine (vsi jeziki trgovine, besedila.ts): potrditev naročila, odposlano in darilni boni. Čiste funkcije,
// preveri jih smoke. Naročilo je oblika trgovina.narocilo_json. HTML je v skupni obliki
// (_shared/mail.ts); `besedilo` je čistopis z enako vsebino in celotnim pravnim besedilom.

import { BARVE, postavi, povezava, type Mail as Mail_, type Vrstica } from '../_shared/mail.ts'
import { BESEDILA, JEZIKI_POSTE, LOKALE_POSTE, type JezikPoste } from './besedila.ts'

/** Kopije iz shop/src/besede.ts (smoke primerja): funkcija se objavi brez shop/. */
export const TELEFON = '+386 40 773 385'
export const POGOJI_VERZIJA = '29. 10. 2026'

export interface Narocilo {
  javna_oznaka: string
  stanje: string
  email: string | null
  ime: string | null
  jezik: string
  naslov: { name?: string | null; line1?: string | null; line2?: string | null; postal_code?: string | null; city?: string | null; country?: string | null } | null
  znesek_postavke: number | null
  znesek_dostava: number | null
  znesek_ddv: number | null
  znesek_skupaj: number | null
  sledilna: string | null
  postavke: {
    ime: string
    cena: number
    doplacilo?: number | null
    kolicina: number
    personalizacija?: { ime?: string | null; stevilka?: number | null } | null
    po_narocilu?: boolean
    digitalni?: boolean
  }[]
}

/** Darilni bon za mail (koda v čistopisu le v tem mailu). */
export interface Bon {
  koda: string
  znesek: number
  velja_do: string
}

export interface Mail {
  naslov: string
  besedilo: string
  html: string
}


const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Jezik naročila; neznan → sl. */
export const jezikPoste = (j: string): JezikPoste => ((JEZIKI_POSTE as readonly string[]).includes(j) ? (j as JezikPoste) : 'sl')

/** Znesek v centih: sl "25,00 €", en "€25.00", drugi po Intl ("25,00 €", "€ 25,00" …). */
export const evri = (c: number, jezik: string) =>
  jezik === 'en' ? `€${(c / 100).toFixed(2)}`
    : jezik === 'sl' || !(JEZIKI_POSTE as readonly string[]).includes(jezik) ? `${(c / 100).toFixed(2).replace('.', ',')} €`
    : new Intl.NumberFormat(LOKALE_POSTE[jezik as JezikPoste], { style: 'currency', currency: 'EUR' }).format(c / 100)

/** Datum (ISO): sl "18. 10. 2027", en "18 Oct 2027", drugi po Intl (UTC). */
export const datumBona = (iso: string, jezik: string) => {
  const d = new Date(iso)
  if (jezik === 'en') return `${d.getUTCDate()} ${'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  if (jezik === 'sl' || !(JEZIKI_POSTE as readonly string[]).includes(jezik)) return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}`
  return new Intl.DateTimeFormat(LOKALE_POSTE[jezik as JezikPoste], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d)
}

export function sestaviMail(vrsta: 'potrditev' | 'poslano' | 'bon', n: Narocilo, shop: string, kode: Bon[] = []): Mail {
  const j = jezikPoste(n.jezik)
  const b = BESEDILA[j]
  const v = (t: string) => t.replaceAll('{o}', n.javna_oznaka).replaceAll('{s}', n.sledilna ?? '').replaceAll('{u}', shop).replaceAll('{v}', POGOJI_VERZIJA).replaceAll('{t}', TELEFON)
  const e = (c: number | null) => evri(c ?? 0, j)
  // Postavke so pred popustom kode ali bona: razlika do skupaj je popust.
  const popust = (n.znesek_postavke ?? 0) + (n.znesek_dostava ?? 0) - (n.znesek_skupaj ?? 0)
  const a = n.naslov ?? {}
  const naslov = [a.name ?? n.ime, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.country].filter(Boolean) as string[]
  const opis = (p: Narocilo['postavke'][number]) =>
    [p.personalizacija?.ime, p.personalizacija?.stevilka].filter((x) => x != null && x !== '').join(' · ')
  const vrstice = n.postavke.map((p) => {
    const o = opis(p)
    return `${p.kolicina} × ${p.ime}${o ? `: ${o}` : ''} — ${e((p.cena + (p.doplacilo ?? 0)) * p.kolicina)}`
  })
  const opombe = [
    ...(n.postavke.some((p) => p.po_narocilu) ? [b.poNarocilu] : []),
    ...(n.postavke.some((p) => p.digitalni) ? [b.digitalni] : []),
  ]

  const odstavki: string[][] =
    vrsta === 'bon'
      ? [
          [b.pozdrav, b.bonUvod],
          kode.map((k) => b.bonKoda.replace('{k}', k.koda).replace('{z}', e(k.znesek)).replace('{d}', datumBona(k.velja_do, j))),
          [b.bonPravila],
          [v(b.bonTrgovina)],
        ]
      : vrsta === 'poslano'
      ? [[b.pozdrav, v(b.na_poti)], [v(b.sledilna), b.sledenje], [b.naslov, ...naslov]]
      : [
          [b.pozdrav, v(b.hvala)],
          [b.postavke, ...vrstice, `${b.dostava}: ${e(n.znesek_dostava)}`,
            ...(popust > 0 ? [`${b.popust}: −${e(popust)}`] : []), `${b.skupaj}: ${e(n.znesek_skupaj)} (${b.ddv} ${e(n.znesek_ddv)})`],
          ...(opombe.length ? [opombe] : []),
          ...(n.naslov ? [[b.naslov, ...naslov]] : []),
          [b.odstopNaslov],
          ...b.odstopBesedilo.split('\n\n').map((o) => [o]),
          [b.vzorecNaslov],
          ...b.vzorec.split('\n\n').map((o) => o.split('\n')),
          v(b.odstop).split('\n'),
        ]
  odstavki.push([v(b.vprasanja)], [b.podpis, b.prodajalec])

  // HTML v skupni obliki (_shared/mail.ts): glavno zgoraj, pravno besedilo
  // (trajni nosilec, dobesedno) v drobnem tisku pod kartico, prodajalec na dnu.
  const siv = (t: string) => `<span class="siv" style="font-weight: 400; color: ${BARVE.sivo};">${t}</span>`
  const koda = (k: string, px = 18) =>
    `<span style="font-family: Consolas, Menlo, 'Courier New', monospace; font-size: ${px}px; letter-spacing: 1px;">${esc(k)}</span>`
  // Povezave v pravnem besedilu (obrazec, pogoji) so klikljive.
  const povezi = (t: string) => esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => povezava(u, u))
  const naNaslov: Vrstica[] = n.naslov ? [{ k: b.naslovKratko, v: naslov.map(esc).join(', ') }] : []
  const sklep = `${esc(v(b.vprasanja))}<br>${esc(b.podpis)}`

  const zadeva = v(vrsta === 'bon' ? b.bon : vrsta === 'poslano' ? (n.sledilna ? b.poslanoSledilna : b.poslano) : b.potrditev)
  let o: Omit<Mail_, 'jezik' | 'zadeva' | 'oznaka' | 'noga'>
  if (vrsta === 'bon') {
    o = {
      predglava: b.bonUvod.replace(/:$/, '.'),
      naslov: esc(b.bonNaslov),
      uvod: `${esc(b.pozdrav)} ${esc(b.bonUvod)}`,
      // bonKoda je "{k} — vrednost {z}, velja do {d}": koda krepko, ostalo pod njo.
      dejstva: kode.map((k) => ({
        k: b.kodaKratko,
        v: `${koda(k.koda)}<br>${siv(esc((b.bonKoda.split(' — ')[1] ?? b.bonKoda).replace('{z}', e(k.znesek)).replace('{d}', datumBona(k.velja_do, j))))}`,
      })),
      gumb: { label: b.vTrgovino, url: shop },
      opomba: `${esc(b.bonPravila)}<br><br>${sklep}`,
    }
  } else if (vrsta === 'poslano') {
    o = {
      predglava: n.sledilna ? v(b.sledilna) : v(b.na_poti),
      naslov: esc(b.naPotiNaslov),
      uvod: `${esc(b.pozdrav)} ${esc(v(b.na_poti))}`,
      dejstva: [
        ...(n.sledilna ? [{ k: b.sledilnaKratko, v: koda(n.sledilna, 16) }] : []),
        ...naNaslov,
      ],
      gumb: { label: b.sledi, url: 'https://www.posta.si/' },
      opomba: sklep,
    }
  } else {
    o = {
      predglava: `${b.skupaj}: ${e(n.znesek_skupaj)}. ${b.posljemo}`,
      naslov: esc(v(b.placanoNaslov)),
      uvod: `${esc(b.pozdrav)} ${esc(v(b.hvala))}`,
      dejstva: [
        ...n.postavke.map((p) => {
          const op = opis(p)
          return { k: `${p.kolicina} ×`, v: `${esc(p.ime)}${op ? ` ${siv(esc(op))}` : ''} · ${e((p.cena + (p.doplacilo ?? 0)) * p.kolicina)}` }
        }),
        { k: b.dostava, v: e(n.znesek_dostava) },
        ...(popust > 0 ? [{ k: b.popust, v: `−${e(popust)}` }] : []),
        { k: b.skupajKratko, v: `${e(n.znesek_skupaj)} ${siv(`(${esc(b.ddv)} ${e(n.znesek_ddv)})`)}` },
        ...naNaslov,
      ],
      gumb: { label: b.poglej, url: `${shop}/orders` },
      opomba: [...opombe.map(esc), sklep].join('<br><br>'),
      pravno: [
        `<strong>${esc(b.odstopNaslov)}</strong>`,
        ...b.odstopBesedilo.split('\n\n').map(esc),
        `<strong>${esc(b.vzorecNaslov)}</strong>`,
        ...b.vzorec.split('\n\n').map((t) => t.split('\n').map(esc).join('<br>')),
        v(b.odstop).split('\n').map(povezi).join('<br>'),
      ],
    }
  }
  const { html } = postavi({
    jezik: j,
    zadeva,
    oznaka: 'SHOP',
    ...o,
    pravno: [...(o.pravno ?? []), esc(b.prodajalec)],
    noga: { povezave: [{ label: b.mojaNarocila, url: `${shop}/orders` }] },
  })

  return {
    naslov: zadeva,
    besedilo: odstavki.map((o) => o.join('\n')).join('\n\n'),
    html,
  }
}
