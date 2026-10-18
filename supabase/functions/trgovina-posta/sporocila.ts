// Maili trgovine (sl, en): potrditev naročila in odposlano. Čiste funkcije,
// preveri jih smoke. Naročilo je oblika trgovina.narocilo_json.

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
  postavke: { ime: string; cena: number; kolicina: number }[]
}

export interface Mail {
  naslov: string
  besedilo: string
  html: string
}

const BESEDILA = {
  sl: {
    potrditev: 'Potrditev naročila {o}',
    poslano: 'Naročilo {o} je na poti',
    pozdrav: 'Pozdravljeni,',
    hvala: 'hvala za nakup v trgovini SLFF. Plačilo smo prejeli, naročilo {o} pripravljamo za odpošiljanje.',
    na_poti: 'naročilo {o} smo oddali na Pošti Slovenije.',
    sledilna: 'Sledilna številka: {s}',
    sledenje: 'Pošiljki lahko sledite na spletni strani Pošte Slovenije: https://www.posta.si/',
    postavke: 'Naročeno:',
    dostava: 'Dostava',
    skupaj: 'Skupaj (z DDV)',
    ddv: 'od tega DDV',
    naslov: 'Naslov za dostavo:',
    odstop: 'Od nakupa lahko odstopite v 14 dneh od prejema: {u}/withdrawal (pogoji: {u}/terms).',
    vprasanja: 'Vprašanja: odgovorite na ta mail ali pišite na info@slff.eu.',
    podpis: 'Ekipa SLFF',
    prodajalec: 'Prodajalec: SPACE GUARDIAN d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, ID za DDV SI42765153',
  },
  en: {
    potrditev: 'Order confirmation {o}',
    poslano: 'Your order {o} is on its way',
    pozdrav: 'Hello,',
    hvala: 'thank you for shopping at the SLFF shop. We have received your payment and are preparing order {o} for shipping.',
    na_poti: 'we have handed order {o} over to Pošta Slovenije.',
    sledilna: 'Tracking number: {s}',
    sledenje: 'You can track the parcel on the Pošta Slovenije website: https://www.posta.si/',
    postavke: 'Ordered:',
    dostava: 'Shipping',
    skupaj: 'Total (incl. VAT)',
    ddv: 'of which VAT',
    naslov: 'Shipping address:',
    odstop: 'You may withdraw from the purchase within 14 days of receipt: {u}/withdrawal (terms: {u}/terms).',
    vprasanja: 'Questions: reply to this email or write to info@slff.eu.',
    podpis: 'The SLFF team',
    prodajalec: 'Seller: SPACE GUARDIAN d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenia, VAT ID SI42765153',
  },
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Znesek v centih: sl "25,00 €", en "€25.00". */
export const evri = (c: number, jezik: string) => (jezik === 'en' ? `€${(c / 100).toFixed(2)}` : `${(c / 100).toFixed(2).replace('.', ',')} €`)

export function sestaviMail(vrsta: 'potrditev' | 'poslano', n: Narocilo, shop: string): Mail {
  const j = n.jezik === 'en' ? 'en' : 'sl'
  const b = BESEDILA[j]
  const v = (t: string) => t.replaceAll('{o}', n.javna_oznaka).replaceAll('{s}', n.sledilna ?? '').replaceAll('{u}', shop)
  const e = (c: number | null) => evri(c ?? 0, j)
  const a = n.naslov ?? {}
  const naslov = [a.name ?? n.ime, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.country].filter(Boolean) as string[]
  const vrstice = n.postavke.map((p) => `${p.kolicina} × ${p.ime} — ${e(p.cena * p.kolicina)}`)

  const odstavki: string[][] =
    vrsta === 'poslano'
      ? [[b.pozdrav, v(b.na_poti)], [v(b.sledilna), b.sledenje], [b.naslov, ...naslov]]
      : [
          [b.pozdrav, v(b.hvala)],
          [b.postavke, ...vrstice, `${b.dostava}: ${e(n.znesek_dostava)}`, `${b.skupaj}: ${e(n.znesek_skupaj)} (${b.ddv} ${e(n.znesek_ddv)})`],
          [b.naslov, ...naslov],
          [v(b.odstop)],
        ]
  odstavki.push([b.vprasanja], [b.podpis, b.prodajalec])
  return {
    naslov: v(vrsta === 'poslano' ? b.poslano : b.potrditev),
    besedilo: odstavki.map((o) => o.join('\n')).join('\n\n'),
    html: odstavki.map((o) => `<p>${o.map(esc).join('<br>')}</p>`).join(''),
  }
}
