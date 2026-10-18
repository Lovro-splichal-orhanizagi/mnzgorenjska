// Maili trgovine (sl, en): potrditev naročila, odposlano in darilni boni. Čiste funkcije,
// preveri jih smoke. Naročilo je oblika trgovina.narocilo_json.

/** Kopije iz shop/src/besede.ts (smoke primerja): funkcija se objavi brez shop/. */
export const TELEFON = '+386 40 773 385'
export const POGOJI_VERZIJA = '18. 10. 2026'

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
    popust: 'Popust',
    skupaj: 'Skupaj (z DDV)',
    ddv: 'od tega DDV',
    naslov: 'Naslov za dostavo:',
    odstop: 'Obrazec za odstop: {u}/withdrawal\nPogoji z dne {v}: {u}/terms',
    odstopNaslov: "Odstop od pogodbe",
    odstopBesedilo: "Potrošnik lahko v 14 dneh od dneva, ko on ali tretja oseba, ki ni prevoznik in jo je določil potrošnik, prevzame blago, odstopi od pogodbe brez navedbe razloga. Pri naročilu več kosov, dostavljenih ločeno, rok teče od prevzema zadnjega kosa.\n\nZa odstop nas obvestite z nedvoumno izjavo, na primer po e-pošti na info@slff.eu ali po pošti na naslov prodajalca. Uporabite lahko obrazec na strani \"Odstop od pogodbe\" ali vzorčni obrazec spodaj, ni pa obvezno. Rok je upoštevan, če obvestilo pošljete pred njegovim iztekom.\n\nBlago vrnite brez nepotrebnega odlašanja, najpozneje v 14 dneh od dneva, ko ste nam sporočili odstop, na naslov SPACE GUARDIAN d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenija. Neposredne stroške vračila blaga krijete sami.\n\nVse prejete plačila, vključno s stroški dostave (razen dodatnih stroškov, če ste izbrali dražjo vrsto dostave od najcenejše, ki jo ponujamo), vrnemo brez nepotrebnega odlašanja, najpozneje v 14 dneh od dneva, ko smo prejeli obvestilo o odstopu. Vračilo opravimo z enakim plačilnim sredstvom, kot ste ga uporabili ob nakupu, razen če se izrecno dogovorimo drugače; dodatnih stroškov zaradi vračila ne zaračunamo. Vračilo lahko zadržimo, dokler blaga ne prejmemo ali dokler ne dokažete, da ste ga poslali, kar nastopi prej.\n\nOdgovarjate le za zmanjšanje vrednosti blaga, ki je posledica ravnanja, ki ni nujno za ugotovitev narave, značilnosti in delovanja blaga (na primer nošenje ali pranje oblačil).\n\nPravice do odstopa ni pri blagu, izdelanem po navodilih potrošnika ali prilagojenem njegovim osebnim potrebam (personalizirani izdelki).",
    vzorecNaslov: "Vzorčni obrazec za odstop od pogodbe",
    vzorec: "(izpolnite in vrnite ta obrazec samo, če želite odstopiti od pogodbe)\n\n– Naslovnik: SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenija, e-pošta info@slff.eu\n– Obveščam/obveščamo (*), da odstopam/odstopamo (*) od pogodbe o prodaji naslednjega blaga (*)/o opravljanju naslednje storitve (*)\n– Datum naročila (*)/datum prejema (*)\n– Ime potrošnika/potrošnikov\n– Naslov potrošnika/potrošnikov\n– Podpis potrošnika/potrošnikov (samo če se obrazec pošilja v papirni obliki)\n– Datum\n\n(*) Neustrezno prečrtajte.",
    poNarocilu: 'Izdelke po naročilu (personalizirane) izdelamo v 1–2 tednih, nato jih odpošljemo.',
    digitalni: 'Darilni bon pošljemo v posebnem mailu.',
    bon: 'Darilni bon SLFF ({o})',
    bonUvod: 'hvala za nakup darilnega bona v trgovini SLFF. Koda za nakup:',
    bonKoda: '{k} — vrednost {z}, velja do {d}',
    bonPravila: 'Kodo vnesete na strani za plačilo (polje za promocijsko kodo). Koda je enkratna in velja le za izdelke trgovine (ne za dostavo in ne za nove darilne bone): vrednost se porabi v enem nakupu, ostanek ne ostane. Bona ni mogoče zamenjati za gotovino.',
    bonTrgovina: 'Trgovina: {u}',
    vprasanja: 'Vprašanja: odgovorite na ta mail, pišite na info@slff.eu ali pokličite {t}.',
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
    popust: 'Discount',
    skupaj: 'Total (incl. VAT)',
    ddv: 'of which VAT',
    naslov: 'Shipping address:',
    odstop: 'Obrazec za odstop: {u}/withdrawal\nTerms dated {v}: {u}/terms',
    odstopNaslov: "Right of withdrawal",
    odstopBesedilo: "A consumer may withdraw from the contract without giving a reason within 14 days of the day on which they, or a third party other than the carrier indicated by them, take possession of the goods. For multiple items delivered separately, the period runs from receipt of the last item.\n\nTo withdraw, inform us with a clear statement, for example by email to info@slff.eu or by post to the seller's address. You may use the form on the \"Withdrawal\" page or the model form below, but it is not obligatory. The deadline is met if you send your notice before it expires.\n\nReturn the goods without undue delay and no later than 14 days after notifying us, to SPACE GUARDIAN d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenia. You bear the direct cost of returning the goods.\n\nWe refund all payments received, including delivery costs (except supplementary costs if you chose a more expensive type of delivery than the cheapest we offer), without undue delay and no later than 14 days from the day we receive your withdrawal notice. We use the same means of payment you used for the purchase, unless expressly agreed otherwise; you incur no fees for the refund. We may withhold the refund until we receive the goods or you prove you have sent them, whichever is earlier.\n\nYou are only liable for any diminished value of the goods resulting from handling beyond what is necessary to establish their nature, characteristics and functioning (for example wearing or washing clothing).\n\nThere is no right of withdrawal for goods made to the consumer's specifications or clearly personalised (personalised products).",
    vzorecNaslov: "Model withdrawal form",
    vzorec: "(complete and return this form only if you wish to withdraw from the contract)\n\n– To: SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenia, email info@slff.eu\n– I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following goods (*)/for the provision of the following service (*)\n– Ordered on (*)/received on (*)\n– Name of consumer(s)\n– Address of consumer(s)\n– Signature of consumer(s) (only if this form is notified on paper)\n– Date\n\n(*) Delete as appropriate.",
    poNarocilu: 'Made-to-order (personalised) items take 1–2 weeks to produce before we ship them.',
    digitalni: 'Your gift card is sent in a separate email.',
    bon: 'Your SLFF gift card ({o})',
    bonUvod: 'thank you for buying an SLFF shop gift card. Your code:',
    bonKoda: '{k} — value {z}, valid until {d}',
    bonPravila: 'Enter the code on the payment page (promotion code field). The code can be used once and only for shop products (not for shipping or new gift cards): its value is used up in a single purchase and no balance remains. The gift card cannot be exchanged for cash.',
    bonTrgovina: 'Shop: {u}',
    vprasanja: 'Questions: reply to this email, write to info@slff.eu or call {t}.',
    podpis: 'The SLFF team',
    prodajalec: 'Seller: SPACE GUARDIAN d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenia, VAT ID SI42765153',
  },
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Znesek v centih: sl "25,00 €", en "€25.00". */
export const evri = (c: number, jezik: string) => (jezik === 'en' ? `€${(c / 100).toFixed(2)}` : `${(c / 100).toFixed(2).replace('.', ',')} €`)

/** Datum (ISO): sl "18. 10. 2027", en "18 Oct 2027" (UTC). */
export const datumBona = (iso: string, jezik: string) => {
  const d = new Date(iso)
  return jezik === 'en'
    ? `${d.getUTCDate()} ${'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    : `${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}`
}

export function sestaviMail(vrsta: 'potrditev' | 'poslano' | 'bon', n: Narocilo, shop: string, kode: Bon[] = []): Mail {
  const j = n.jezik === 'en' ? 'en' : 'sl'
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
  return {
    naslov: v(vrsta === 'bon' ? b.bon : vrsta === 'poslano' ? b.poslano : b.potrditev),
    besedilo: odstavki.map((o) => o.join('\n')).join('\n\n'),
    html: odstavki.map((o) => `<p>${o.map(esc).join('<br>')}</p>`).join(''),
  }
}
