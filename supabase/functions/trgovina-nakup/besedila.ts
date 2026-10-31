// Jezik naročila v trgovina-nakup: jeziki trgovine (shop/src/jezik.ts), jezik Stripe
// Checkout in besedila o pogojih na plačilni strani. Čisto, preveri smoke.

export const JEZIKI_NAKUPA = ['sl', 'en', 'az', 'cs', 'da', 'de', 'el', 'es', 'et', 'hr', 'hu', 'hy', 'lv', 'mk', 'pl', 'ro', 'sk', 'sr', 'tr', 'uk'] as const
export type JezikNakupa = (typeof JEZIKI_NAKUPA)[number]

/** Jezik naročila iz vnosa; neznan → sl (kot doslej). */
export const jezikNakupa = (j: unknown): JezikNakupa =>
  typeof j === 'string' && (JEZIKI_NAKUPA as readonly string[]).includes(j) ? (j as JezikNakupa) : 'sl'

/** Stripe Checkout locale; jezikov, ki jih Stripe nima (az, hy, mk, sr, uk), ne vsiljujemo: auto (po brskalniku). */
export const STRIPE_LOKALE: Record<JezikNakupa, string> = {
  sl: 'sl', en: 'en', az: 'auto', cs: 'cs', da: 'da', de: 'de', el: 'el', es: 'es', et: 'et', hr: 'hr', hu: 'hu',
  hy: 'auto', lv: 'lv', mk: 'auto', pl: 'pl', ro: 'ro', sk: 'sk', sr: 'auto', tr: 'tr', uk: 'auto',
}

/** {pogoji} = povezava "[besedilo](naslov pogojev)". */
export const BESEDILA_NAKUPA: Record<JezikNakupa, { pogoji: string; strinjam: string; placilo: string }> = {
  sl: { pogoji: 'pogoji prodaje', strinjam: 'Strinjam se s {pogoji}.', placilo: 'S plačilom sprejmete {pogoji}.' },
  en: { pogoji: 'terms of sale', strinjam: 'I agree to the {pogoji}.', placilo: 'By paying you accept the {pogoji}.' },
  az: { pogoji: 'satış şərtləri', strinjam: '{pogoji} ilə razıyam.', placilo: 'Ödəniş etməklə {pogoji} ilə razılaşırsınız.' },
  cs: { pogoji: 'obchodními podmínkami', strinjam: 'Souhlasím s {pogoji}.', placilo: 'Zaplacením vyjadřujete souhlas s {pogoji}.' },
  da: { pogoji: 'salgsbetingelserne', strinjam: 'Jeg accepterer {pogoji}.', placilo: 'Ved at betale accepterer du {pogoji}.' },
  de: { pogoji: 'Verkaufsbedingungen', strinjam: 'Ich stimme den {pogoji} zu.', placilo: 'Mit der Zahlung akzeptieren Sie die {pogoji}.' },
  el: { pogoji: 'όρους πώλησης', strinjam: 'Συμφωνώ με τους {pogoji}.', placilo: 'Με την πληρωμή αποδέχεστε τους {pogoji}.' },
  es: { pogoji: 'condiciones de venta', strinjam: 'Acepto las {pogoji}.', placilo: 'Al pagar, acepta las {pogoji}.' },
  et: { pogoji: 'müügitingimustega', strinjam: 'Nõustun {pogoji}.', placilo: 'Makstes nõustute {pogoji}.' },
  hr: { pogoji: 'uvjete prodaje', strinjam: 'Prihvaćam {pogoji}.', placilo: 'Plaćanjem prihvaćate {pogoji}.' },
  hu: { pogoji: 'értékesítési feltételeket', strinjam: 'Elfogadom az {pogoji}.', placilo: 'A fizetéssel elfogadja az {pogoji}.' },
  hy: { pogoji: 'վաճառքի պայմանները', strinjam: 'Ընդունում եմ {pogoji}։', placilo: 'Վճարելով՝ ընդունում եք {pogoji}։' },
  lv: { pogoji: 'pārdošanas noteikumiem', strinjam: 'Piekrītu {pogoji}.', placilo: 'Veicot apmaksu, jūs piekrītat {pogoji}.' },
  mk: { pogoji: 'условите за продажба', strinjam: 'Се согласувам со {pogoji}.', placilo: 'Со плаќањето ги прифаќате {pogoji}.' },
  pl: { pogoji: 'warunki sprzedaży', strinjam: 'Akceptuję {pogoji}.', placilo: 'Dokonując płatności, akceptują Państwo {pogoji}.' },
  ro: { pogoji: 'condițiile de vânzare', strinjam: 'Sunt de acord cu {pogoji}.', placilo: 'Prin plată acceptați {pogoji}.' },
  sk: { pogoji: 'obchodnými podmienkami', strinjam: 'Súhlasím s {pogoji}.', placilo: 'Zaplatením vyjadrujete súhlas s {pogoji}.' },
  sr: { pogoji: 'uslove prodaje', strinjam: 'Prihvatam {pogoji}.', placilo: 'Plaćanjem prihvatate {pogoji}.' },
  tr: { pogoji: 'satış koşullarını', strinjam: '{pogoji} kabul ediyorum.', placilo: 'Ödeme yaparak {pogoji} kabul etmiş olursunuz.' },
  uk: { pogoji: 'умовами продажу', strinjam: 'Я погоджуюся з {pogoji}.', placilo: 'Здійснюючи оплату, ви погоджуєтеся з {pogoji}.' },
}
