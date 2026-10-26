// Besedila e-pošte za `posli-opomnik`, v jeziku lige.
//
// Brez Deno API-jev in brez omrežja, da ga `npm run smoke` lahko uvozi in
// preveri vse jezikovne različice. Edge funkcija ne uvaža iz `src/` (pri
// objavi mora ostati samostojna), zato sta preslikavi država → jezik in
// država → časovni pas tu podvojeni; smoke preveri, da se jezik ujema z
// `JEZIK_DRZAVE` iz `src/lib/drzavaUgib.ts`.
//
// Jezik določa DRŽAVA LIGE, ne človek: funkcija vsakič obdela eno ligo, zato
// dobi Slovenec v slovaški ligi slovaški mail — tako kot vidi slovaški
// vmesnik, ko odpre povezavo `?t=sk-…`. Kdor ima ekipi v obeh državah, dobi
// dva ločena maila, vsakega v jeziku svoje lige.

import { postavi, povezava, type Vrstica } from '../_shared/mail.ts'

export type Jezik = 'sl' | 'sk' | 'hr' | 'cs' | 'hu' | 'de' | 'sr' | 'ro' | 'et' | 'pl' | 'es' | 'lv' | 'mk' | 'el' | 'tr' | 'uk' | 'hy' | 'az' | 'da' | 'en'

/**
 * Jezik države lige (enako kot `JEZIK_DRZAVE` v vmesniku). Združeno kraljestvo
 * in Malta dobita angleščino, Črna gora srbščino, Bosna in Hercegovina
 * hrvaščino, Moldavija romunščino (rok pa v svojem pasu, `PAS_DRZAVE`).
 */
export const JEZIK_DRZAVE: Record<string, Jezik> = {
  SI: 'sl', SK: 'sk', HR: 'hr', CZ: 'cs', HU: 'hu', AT: 'de', DE: 'de', RS: 'sr', RO: 'ro', EE: 'et', PL: 'pl', ES: 'es', LV: 'lv', MK: 'mk',
  GR: 'el', TR: 'tr', UA: 'uk', AM: 'hy', AZ: 'az', DK: 'da', GB: 'en', MT: 'en', ME: 'sr', BA: 'hr', MD: 'ro',
}
/** Časovni pas, v katerem so roki lige. */
export const PAS_DRZAVE: Record<string, string> = {
  SI: 'Europe/Ljubljana',
  SK: 'Europe/Bratislava',
  HR: 'Europe/Zagreb',
  CZ: 'Europe/Prague',
  HU: 'Europe/Budapest',
  AT: 'Europe/Vienna',
  DE: 'Europe/Berlin',
  RS: 'Europe/Belgrade',
  RO: 'Europe/Bucharest',
  EE: 'Europe/Tallinn',
  PL: 'Europe/Warsaw',
  ES: 'Europe/Madrid',
  LV: 'Europe/Riga',
  MK: 'Europe/Skopje',
  GR: 'Europe/Athens',
  TR: 'Europe/Istanbul',
  UA: 'Europe/Kyiv',
  AM: 'Asia/Yerevan',
  AZ: 'Asia/Baku',
  DK: 'Europe/Copenhagen',
  GB: 'Europe/London',
  MT: 'Europe/Malta',
  ME: 'Europe/Podgorica',
  BA: 'Europe/Sarajevo',
  MD: 'Europe/Chisinau',
}
// Grščina s 24-urnim časom (`-u-hc-h23`): sama `el-GR` piše "11:00 π.μ.".
const LOKALE: Record<Jezik, string> = { sl: 'sl-SI', sk: 'sk-SK', hr: 'hr-HR', cs: 'cs-CZ', hu: 'hu-HU', de: 'de-AT', sr: 'sr-Latn-RS', ro: 'ro-RO', et: 'et-EE', pl: 'pl-PL', es: 'es-ES', lv: 'lv-LV', mk: 'mk-MK', el: 'el-GR-u-hc-h23', tr: 'tr-TR', uk: 'uk-UA', hy: 'hy-AM', az: 'az-Latn-AZ', da: 'da-DK', en: 'en-GB' }

export const SITE = 'https://slff.eu'

export interface Liga {
  slug: string
  /** Kratko ime lige (`short_name`), gre v zadevo. */
  oznaka: string
  /** Polno ime lige (za poznavalca). */
  ime?: string
  /** Koda države (`competitions_view.country_code`). */
  drzava: string | null
}

export interface Sporocilo {
  /** Zadeva. */
  naslov: string
  html: string
  /** Čistopis (text/plain), iz istih podatkov kot HTML. */
  besedilo: string
  /** Predglava: besedilo potisnega obvestila pod zadevo. */
  predglava?: string
  /** Odjava od opomnikov (glava List-Unsubscribe); ni je pri poznavalcu. */
  odjava?: string
}

export const jezikLige = (liga: Pick<Liga, 'drzava'>): Jezik =>
  JEZIK_DRZAVE[liga.drzava ?? 'SI'] ?? 'sl'

/**
 * Povezave v mailu. `?t=` izbere ligo — in z njo jezik vmesnika — tudi
 * na napravi, ki je stran še ni odprla.
 */
export function povezave(slug: string) {
  const t = `?t=${encodeURIComponent(slug)}`
  return {
    ekipa: `${SITE}/my-team${t}`,
    odjava: `${SITE}/reminders${t}`,
    pozicije: `${SITE}/positions${t}`,
    asistence: `${SITE}/assists${t}`,
  }
}

/** Rok v jeziku in časovnem pasu lige, npr. "sobota 3. 10. 10:00". */
export function izpisRoka(iso: string, liga: Pick<Liga, 'drzava'>): string {
  return new Date(iso).toLocaleString(LOKALE[jezikLige(liga)], {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: PAS_DRZAVE[liga.drzava ?? 'SI'] ?? PAS_DRZAVE.SI,
  })
}

// Ime, ime ekipe in razlog napiše uporabnik (ali izhajajo iz njegovih
// podatkov), zato v HTML ne gredo surovi.
export function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const pozdrav = (j: Jezik, ime: string | null | undefined) => {
  const prvo = ime?.trim().split(' ')[0]
  if (j === 'sk' || j === 'cs') return prvo ? `Ahoj, ${esc(prvo)}!` : 'Ahoj!'
  if (j === 'hr') return prvo ? `Bok, ${esc(prvo)}!` : 'Bok!'
  if (j === 'hu') return prvo ? `Szia, ${esc(prvo)}!` : 'Szia!'
  if (j === 'de') return prvo ? `Servus, ${esc(prvo)}!` : 'Servus!'
  if (j === 'sr') return prvo ? `Zdravo, ${esc(prvo)}!` : 'Zdravo!'
  if (j === 'ro') return prvo ? `Salut, ${esc(prvo)}!` : 'Salut!'
  if (j === 'et') return prvo ? `Tere, ${esc(prvo)}!` : 'Tere!'
  if (j === 'lv') return prvo ? `Sveiki, ${esc(prvo)}!` : 'Sveiki!'
  if (j === 'mk') return prvo ? `Здраво, ${esc(prvo)}!` : 'Здраво!'
  if (j === 'el') return prvo ? `Γεια σου, ${esc(klicnikEl(prvo))}!` : 'Γεια σου!'
  if (j === 'tr') return prvo ? `Merhaba, ${esc(prvo)}!` : 'Merhaba!'
  if (j === 'uk') return prvo ? `Привіт, ${esc(prvo)}!` : 'Привіт!'
  if (j === 'hy') return prvo ? `Բարև, ${esc(prvo)}!` : 'Բարև!'
  if (j === 'az') return prvo ? `Salam, ${esc(prvo)}!` : 'Salam!'
  if (j === 'da') return prvo ? `Hej, ${esc(prvo)}!` : 'Hej!'
  if (j === 'pl') return prvo ? `Cześć, ${esc(prvo)}!` : 'Cześć!'
  if (j === 'es') return prvo ? `¡Hola, ${esc(prvo)}!` : '¡Hola!'
  if (j === 'en') return prvo ? `Hi ${esc(prvo)}!` : 'Hi!'
  return prvo ? `Živjo, ${esc(prvo)}!` : 'Živjo!'
}

// Skupna oblika (_shared/mail.ts): naslov, uvod s pozdravom, okvir dejstev,
// en gumb, noga z razlogom in odjavo. Vsak mail dobi HTML in čistopis.
interface Vsebina {
  zadeva: string
  /** Predglava in besedilo potisnega obvestila (navaden tekst). */
  predglava: string
  /** Značka v glavi (kratko ime lige). */
  oznaka?: string
  naslov: string
  uvod: string
  seznam?: string[]
  opozorilo?: Vrstica[]
  dejstva?: Vrstica[]
  ploscice?: Vrstica[]
  gumb: { label: string; url: string }
  potem?: string
  opomba?: string
  /** Zakaj ta mail (navaden tekst, v nogi). */
  zakaj: string
}

function sestavi(j: Jezik, v: Vsebina, odjava?: string, odjavaLabel?: string): Sporocilo {
  const { zakaj, ...o } = v
  const { html, besedilo } = postavi({
    jezik: j === 'sr' ? 'sr-Latn' : j,
    ...o,
    noga: { zakaj, povezave: odjava ? [{ label: odjavaLabel ?? ODJAVA[j], url: odjava }] : [] },
  })
  return { naslov: v.zadeva, html, besedilo, predglava: v.predglava, ...(odjava ? { odjava } : {}) }
}

const ODJAVA: Record<Jezik, string> = {
  sl: 'Ne želim več opomnikov',
  en: 'Stop these reminders',
  sk: 'Nechcem už dostávať pripomienky',
  hr: 'Ne želim više primati podsjetnike',
  cs: 'Nechci už dostávat připomínky',
  hu: 'Nem kérek több emlékeztetőt',
  de: 'Keine Erinnerungen mehr',
  sr: 'Ne želim više da primam podsetnike',
  ro: 'Nu mai vreau mementouri',
  et: 'Ma ei soovi enam meeldetuletusi',
  lv: 'Vairs nevēlos saņemt atgādinājumus',
  pl: 'Nie chcę więcej przypomnień',
  es: 'No quiero más recordatorios',
  mk: 'Не сакам повеќе потсетници',
  el: 'Δεν θέλω άλλες υπενθυμίσεις',
  tr: 'Artık hatırlatma almak istemiyorum',
  uk: 'Більше не хочу нагадувань',
  hy: 'Այլևս չեմ ուզում հիշեցումներ ստանալ',
  az: 'Daha xatırlatma almaq istəmirəm',
  da: 'Jeg vil ikke have flere påmindelser',
}

// --- opomnik: ekipa ni popolna ----------------------------------------------
// Kdor ekipe nima, dobi `sestaviOpomnikBrezLige`. Razlog (`razlog_neveljavne_ekipe`)
// in rok naslednjega kroga sta neobvezna: brez njiju vrstice ni.

interface BesedilaOpomnika {
  /** Zadeva z rokom (za "SLFF <liga>: "). */
  zRokom: (kdaj: string) => string
  /** Zadeva brez roka. */
  brezRoka: string
  predglava: string
  naslov: string
  uvod: string
  manjka: string
  rok: string
  gumb: string
  zakaj: (ozn: string) => string
}

const OPOMNIK: Record<Jezik, BesedilaOpomnika> = {
  sl: {
    zRokom: (k) => `dokončaj ekipo do ${k}`,
    brezRoka: 'dokončaj ekipo pred naslednjim krogom',
    predglava: 'Brez veljavne ekipe v naslednjem krogu ne dobiš točk. Stran ti pokaže, kaj manjka.',
    naslov: 'Ekipa še ni popolna',
    uvod: 'Tvoja fantasy ekipa še ni veljavna, zato v naslednjem krogu ne bi dobila točk. Odpri jo in stran ti pokaže, kaj manjka.',
    manjka: 'Manjka', rok: 'Rok', gumb: 'Dokončaj ekipo',
    zakaj: (o) => `Opomnik dobiš, ker igraš v ligi ${o} na slff.eu.`,
  },
  sk: {
    zRokom: (k) => `dokonči tím (uzávierka: ${k})`,
    brezRoka: 'dokonči tím pred ďalším kolom',
    predglava: 'Bez platného tímu v ďalšom kole nezískaš body. Stránka ti ukáže, čo chýba.',
    naslov: 'Tím ešte nie je úplný',
    uvod: 'Tvoj fantasy tím ešte nie je platný, takže by v ďalšom kole nezískal body. Otvor ho a stránka ti ukáže, čo chýba.',
    manjka: 'Chýba', rok: 'Uzávierka', gumb: 'Dokonči tím',
    zakaj: (o) => `Pripomienku dostávaš, lebo na slff.eu hráš v lige ${o}.`,
  },
  hr: {
    zRokom: (k) => `dovrši momčad (rok: ${k})`,
    brezRoka: 'dovrši momčad prije sljedećeg kola',
    predglava: 'Bez valjane momčadi u sljedećem kolu nećeš dobiti bodove. Stranica će ti pokazati što nedostaje.',
    naslov: 'Momčad još nije potpuna',
    uvod: 'Tvoja fantasy momčad još nije valjana pa u sljedećem kolu ne bi dobila bodove. Otvori je i stranica će ti pokazati što nedostaje.',
    manjka: 'Nedostaje', rok: 'Rok', gumb: 'Dovrši momčad',
    zakaj: (o) => `Podsjetnik dobivaš jer na slff.eu igraš u ligi ${o}.`,
  },
  cs: {
    zRokom: (k) => `dokonči tým (uzávěrka: ${k})`,
    brezRoka: 'dokonči tým před dalším kolem',
    predglava: 'Bez platného týmu v dalším kole nezískáš body. Stránka ti ukáže, co chybí.',
    naslov: 'Tým ještě není kompletní',
    uvod: 'Tvůj fantasy tým ještě není platný, takže by v dalším kole nezískal body. Otevři ho a stránka ti ukáže, co chybí.',
    manjka: 'Chybí', rok: 'Uzávěrka', gumb: 'Dokonči tým',
    zakaj: (o) => `Připomínku dostáváš, protože na slff.eu hraješ v lize ${o}.`,
  },
  // Madžarščina: ime lige stoji samostojno, da ga ni treba sklanjati.
  hu: {
    zRokom: (k) => `fejezd be a csapatodat (határidő: ${k})`,
    brezRoka: 'fejezd be a csapatodat a következő forduló előtt',
    predglava: 'Érvényes csapat nélkül a következő fordulóban nem szerzel pontot. Az oldal megmutatja, mi hiányzik.',
    naslov: 'A csapatod még nem teljes',
    uvod: 'A fantasy csapatod még nem érvényes, így a következő fordulóban nem szerezne pontot. Nyisd meg, és az oldal megmutatja, mi hiányzik.',
    manjka: 'Hiányzik', rok: 'Határidő', gumb: 'Csapat befejezése',
    zakaj: (o) => `Az emlékeztetőt azért kapod, mert ebben a bajnokságban játszol az slff.eu-n: ${o}.`,
  },
  de: {
    zRokom: (k) => `vervollständige dein Team (Deadline: ${k})`,
    brezRoka: 'vervollständige dein Team vor der nächsten Runde',
    predglava: 'Ohne gültiges Team holst du in der nächsten Runde keine Punkte. Die Seite zeigt dir, was fehlt.',
    naslov: 'Dein Team ist noch nicht vollständig',
    uvod: 'Dein Fantasy-Team ist noch nicht gültig und würde in der nächsten Runde keine Punkte holen. Öffne es, die Seite zeigt dir, was fehlt.',
    manjka: 'Es fehlt', rok: 'Deadline', gumb: 'Team vervollständigen',
    zakaj: (o) => `Du bekommst diese Erinnerung, weil du auf slff.eu in dieser Liga spielst: ${o}.`,
  },
  sr: {
    zRokom: (k) => `dovrši tim (rok: ${k})`,
    brezRoka: 'dovrši tim pre sledećeg kola',
    predglava: 'Bez ispravnog tima u sledećem kolu nećeš osvojiti bodove. Stranica će ti pokazati šta nedostaje.',
    naslov: 'Tim još nije potpun',
    uvod: 'Tvoj fantasy tim još nije ispravan, pa u sledećem kolu ne bi osvojio bodove. Otvori ga i stranica će ti pokazati šta nedostaje.',
    manjka: 'Nedostaje', rok: 'Rok', gumb: 'Dovrši tim',
    zakaj: (o) => `Podsetnik dobijaš jer na slff.eu igraš u ligi ${o}.`,
  },
  ro: {
    zRokom: (k) => `completează-ți echipa (termen: ${k})`,
    brezRoka: 'completează-ți echipa înainte de etapa următoare',
    predglava: 'Fără o echipă validă nu primești puncte în etapa următoare. Pagina îți arată ce lipsește.',
    naslov: 'Echipa nu este încă completă',
    uvod: 'Echipa ta fantasy nu este încă validă, așa că nu ar primi puncte în etapa următoare. Deschide-o și pagina îți arată ce lipsește.',
    manjka: 'Lipsește', rok: 'Termen', gumb: 'Completează echipa',
    zakaj: (o) => `Primești acest memento pentru că joci pe slff.eu în liga ${o}.`,
  },
  et: {
    zRokom: (k) => `vii meeskond lõpule (tähtaeg: ${k})`,
    brezRoka: 'vii meeskond lõpule enne järgmist vooru',
    predglava: 'Kehtiva meeskonnata ei saa sa järgmises voorus punkte. Leht näitab, mis on puudu.',
    naslov: 'Meeskond pole veel täielik',
    uvod: 'Sinu fantaasiameeskond pole veel kehtiv, nii et järgmises voorus see punkte ei saaks. Ava see ja leht näitab, mis on puudu.',
    manjka: 'Puudu', rok: 'Tähtaeg', gumb: 'Vii meeskond lõpule',
    zakaj: (o) => `Saad meeldetuletuse, sest mängid slff.eu-s (liiga: ${o}).`,
  },
  pl: {
    zRokom: (k) => `dokończ drużynę (termin: ${k})`,
    brezRoka: 'dokończ drużynę przed następną kolejką',
    predglava: 'Bez ważnej drużyny nie zdobędziesz punktów w następnej kolejce. Strona pokaże, czego brakuje.',
    naslov: 'Drużyna nie jest jeszcze kompletna',
    uvod: 'Twoja drużyna fantasy nie jest jeszcze ważna, więc w następnej kolejce nie zdobyłaby punktów. Otwórz ją, a strona pokaże, czego brakuje.',
    manjka: 'Brakuje', rok: 'Termin', gumb: 'Dokończ drużynę',
    zakaj: (o) => `Dostajesz przypomnienie, bo grasz na slff.eu w lidze ${o}.`,
  },
  es: {
    zRokom: (k) => `completa tu equipo (cierre: ${k})`,
    brezRoka: 'completa tu equipo antes de la próxima jornada',
    predglava: 'Sin un equipo válido no sumarás puntos en la próxima jornada. La página te muestra qué falta.',
    naslov: 'Tu equipo aún no está completo',
    uvod: 'Tu equipo fantasy todavía no es válido, así que no sumaría puntos en la próxima jornada. Ábrelo y la página te muestra qué falta.',
    manjka: 'Falta', rok: 'Cierre', gumb: 'Completar equipo',
    zakaj: (o) => `Recibes este recordatorio porque juegas en slff.eu en la liga ${o}.`,
  },
  lv: {
    zRokom: (k) => `pabeidz komandu (termiņš: ${k})`,
    brezRoka: 'pabeidz komandu pirms nākamās kārtas',
    predglava: 'Bez derīgas komandas nākamajā kārtā punktus nesaņemsi. Lapa parādīs, kas trūkst.',
    naslov: 'Komanda vēl nav pilnīga',
    uvod: 'Tava fantāzijas komanda vēl nav derīga, tāpēc nākamajā kārtā tā punktus nesaņemtu. Atver to, un lapa parādīs, kas trūkst.',
    manjka: 'Trūkst', rok: 'Termiņš', gumb: 'Pabeigt komandu',
    zakaj: (o) => `Atgādinājumu saņem, jo spēlē slff.eu (līga: ${o}).`,
  },
  mk: {
    zRokom: (k) => `доврши го тимот (рок: ${k})`,
    brezRoka: 'доврши го тимот пред следното коло',
    predglava: 'Без важечки тим нема да освоиш поени во следното коло. Страницата ќе ти покаже што недостасува.',
    naslov: 'Тимот сè уште не е комплетен',
    uvod: 'Твојот фантази тим сè уште не е важечки, па во следното коло не би освоил поени. Отвори го и страницата ќе ти покаже што недостасува.',
    manjka: 'Недостасува', rok: 'Рок', gumb: 'Доврши го тимот',
    zakaj: (o) => `Потсетникот го добиваш затоа што играш на slff.eu (лига: ${o}).`,
  },
  el: {
    zRokom: (k) => `ολοκλήρωσε την ομάδα σου (προθεσμία: ${k})`,
    brezRoka: 'ολοκλήρωσε την ομάδα σου πριν από την επόμενη αγωνιστική',
    predglava: 'Χωρίς έγκυρη ομάδα δεν παίρνεις πόντους στην επόμενη αγωνιστική. Η σελίδα σού δείχνει τι λείπει.',
    naslov: 'Η ομάδα σου δεν είναι ακόμα πλήρης',
    uvod: 'Η fantasy ομάδα σου δεν είναι ακόμα έγκυρη, οπότε δεν θα έπαιρνε πόντους στην επόμενη αγωνιστική. Άνοιξέ την και η σελίδα σού δείχνει τι λείπει.',
    manjka: 'Λείπει', rok: 'Προθεσμία', gumb: 'Ολοκλήρωσε την ομάδα',
    zakaj: (o) => `Λαμβάνεις την υπενθύμιση επειδή παίζεις στο slff.eu (πρωτάθλημα: ${o}).`,
  },
  tr: {
    zRokom: (k) => `takımını tamamla (son tarih: ${k})`,
    brezRoka: 'gelecek haftadan önce takımını tamamla',
    predglava: 'Geçerli bir takım olmadan gelecek hafta puan alamazsın. Sayfa neyin eksik olduğunu gösterir.',
    naslov: 'Takımın henüz tamam değil',
    uvod: 'Fantezi takımın henüz geçerli değil, bu yüzden gelecek hafta puan alamaz. Takımını aç, sayfa neyin eksik olduğunu gösterir.',
    manjka: 'Eksik', rok: 'Son tarih', gumb: 'Takımını tamamla',
    zakaj: (o) => `Bu hatırlatmayı slff.eu’da oynadığın için alıyorsun (lig: ${o}).`,
  },
  uk: {
    zRokom: (k) => `заверши команду (дедлайн: ${k})`,
    brezRoka: 'заверши команду до наступного туру',
    predglava: 'Без дійсної команди в наступному турі не отримаєш очок. Сторінка покаже, чого бракує.',
    naslov: 'Команда ще не повна',
    uvod: 'Твоя фентезі-команда ще не дійсна, тож у наступному турі не отримала б очок. Відкрий її, і сторінка покаже, чого бракує.',
    manjka: 'Бракує', rok: 'Дедлайн', gumb: 'Завершити команду',
    zakaj: (o) => `Ти отримуєш нагадування, бо граєш на slff.eu (ліга: ${o}).`,
  },
  hy: {
    zRokom: (k) => `ավարտիր թիմդ (վերջնաժամկետ՝ ${k})`,
    brezRoka: 'ավարտիր թիմդ մինչև հաջորդ տուրը',
    predglava: 'Առանց վավեր թիմի հաջորդ տուրում միավորներ չես ստանա։ Էջը ցույց կտա, թե ինչն է պակասում։',
    naslov: 'Թիմդ դեռ ամբողջական չէ',
    uvod: 'Քո ֆենթեզի թիմը դեռ վավեր չէ, ուստի հաջորդ տուրում միավորներ չէր ստանա։ Բացիր այն, և էջը ցույց կտա, թե ինչն է պակասում։',
    manjka: 'Պակասում է', rok: 'Վերջնաժամկետ', gumb: 'Ավարտել թիմը',
    zakaj: (o) => `Հիշեցումը ստանում ես, քանի որ խաղում ես slff.eu-ում (լիգա՝ ${o})։`,
  },
  az: {
    zRokom: (k) => `komandanı tamamla (son tarix: ${k})`,
    brezRoka: 'növbəti turdan əvvəl komandanı tamamla',
    predglava: 'Qaydalara uyğun komanda olmadan növbəti turda xal toplamayacaqsan. Səhifə nəyin çatışmadığını göstərir.',
    naslov: 'Komandan hələ tam deyil',
    uvod: 'Fantasy komandan hələ qaydalara uyğun deyil, ona görə növbəti turda xal toplamazdı. Onu aç, səhifə nəyin çatışmadığını göstərəcək.',
    manjka: 'Çatışmır', rok: 'Son tarix', gumb: 'Komandanı tamamla',
    zakaj: (o) => `Bu xatırlatmanı slff.eu-da oynadığın üçün alırsan (liqa: ${o}).`,
  },
  da: {
    zRokom: (k) => `gør dit hold færdigt (deadline: ${k})`,
    brezRoka: 'gør dit hold færdigt før næste runde',
    predglava: 'Uden et gyldigt hold får du ingen point i næste runde. Siden viser, hvad der mangler.',
    naslov: 'Dit hold er ikke komplet endnu',
    uvod: 'Dit fantasyhold er endnu ikke gyldigt, så det ville ikke få point i næste runde. Åbn det, så viser siden, hvad der mangler.',
    manjka: 'Mangler', rok: 'Deadline', gumb: 'Gør holdet færdigt',
    zakaj: (o) => `Du får påmindelsen, fordi du spiller på slff.eu (liga: ${o}).`,
  },
  en: {
    zRokom: (k) => `finish your team by ${k}`,
    brezRoka: 'finish your team before the next round',
    predglava: 'Without a valid team you won’t score points in the next round. The page shows what’s missing.',
    naslov: 'Your team isn’t complete yet',
    uvod: 'Your fantasy team isn’t valid yet, so it wouldn’t score points in the next round. Open it and the page shows you what’s missing.',
    manjka: 'Missing', rok: 'Deadline', gumb: 'Finish my team',
    zakaj: (o) => `You get this reminder because you play in ${o} on slff.eu.`,
  },
}

export function sestaviOpomnik(
  liga: Liga,
  meta: { display_name: string | null; rok?: string | null; razlog?: string | null },
): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const B = OPOMNIK[j]
  const kdaj = meta.rok ? izpisRoka(meta.rok, liga) : null
  const opozorilo: Vrstica[] = []
  if (meta.razlog) opozorilo.push({ k: B.manjka, v: esc(prevediRazlog(meta.razlog, j)) })
  if (kdaj) opozorilo.push({ k: B.rok, v: esc(kdaj) })
  return sestavi(j, {
    zadeva: `SLFF ${liga.oznaka}: ${kdaj ? B.zRokom(kdaj) : B.brezRoka}`,
    predglava: B.predglava,
    oznaka: liga.oznaka,
    naslov: B.naslov,
    uvod: `${pozdrav(j, meta.display_name)} ${B.uvod}`,
    opozorilo,
    gumb: { label: B.gumb, url: p.ekipa },
    zakaj: B.zakaj(liga.oznaka),
  }, p.odjava)
}

// --- push opomnik: še nimaš ekipe, rok je jutri -----------------------------
// Samo potisno obvestilo (brez maila), zato le naslov in kratko besedilo.

export function sestaviPushOpomnik(
  liga: Liga,
  rok: string,
): { naslov: string; besedilo: string } {
  const kdaj = izpisRoka(rok, liga)
  const ozn = liga.oznaka
  return {
    sk: { naslov: `SLFF ${ozn}: ešte nemáš tím`, besedilo: `Uzávierka kola je ${kdaj}. Zostav tím, aby si získal body.` },
    hr: { naslov: `SLFF ${ozn}: još nemaš momčad`, besedilo: `Rok za kolo je ${kdaj}. Složi momčad kako bi skupljao bodove.` },
    cs: { naslov: `SLFF ${ozn}: ještě nemáš tým`, besedilo: `Uzávěrka kola je ${kdaj}. Sestav tým, abys získal body.` },
    hu: { naslov: `SLFF ${ozn}: még nincs csapatod`, besedilo: `A forduló határideje: ${kdaj}. Rakd össze a csapatodat, hogy pontot szerezz.` },
    de: { naslov: `SLFF ${ozn}: du hast noch kein Team`, besedilo: `Deadline der Runde: ${kdaj}. Stell dein Team zusammen, damit du Punkte holst.` },
    sr: { naslov: `SLFF ${ozn}: još nemaš tim`, besedilo: `Rok za kolo je ${kdaj}. Sastavi tim da bi osvajao bodove.` },
    ro: { naslov: `SLFF ${ozn}: încă nu ai echipă`, besedilo: `Termenul etapei: ${kdaj}. Fă-ți echipa ca să strângi puncte.` },
    et: { naslov: `SLFF ${ozn}: sul pole veel meeskonda`, besedilo: `Vooru tähtaeg: ${kdaj}. Pane meeskond kokku, et punkte koguda.` },
    pl: { naslov: `SLFF ${ozn}: nie masz jeszcze drużyny`, besedilo: `Termin kolejki: ${kdaj}. Ułóż drużynę, aby zdobywać punkty.` },
    es: { naslov: `SLFF ${ozn}: aún no tienes equipo`, besedilo: `Cierre de la jornada: ${kdaj}. Haz tu equipo para sumar puntos.` },
    lv: { naslov: `SLFF ${ozn}: tev vēl nav komandas`, besedilo: `Kārtas termiņš: ${kdaj}. Sastādi komandu, lai krātu punktus.` },
    mk: { naslov: `SLFF ${ozn}: сè уште немаш тим`, besedilo: `Рок за колото: ${kdaj}. Состави тим за да собираш поени.` },
    el: { naslov: `SLFF ${ozn}: δεν έχεις ακόμα ομάδα`, besedilo: `Προθεσμία αγωνιστικής: ${kdaj}. Φτιάξε ομάδα για να μαζεύεις πόντους.` },
    tr: { naslov: `SLFF ${ozn}: henüz takımın yok`, besedilo: `Haftanın son tarihi: ${kdaj}. Puan toplamak için takımını kur.` },
    uk: { naslov: `SLFF ${ozn}: у тебе ще немає команди`, besedilo: `Дедлайн туру: ${kdaj}. Збери команду, щоб набирати очки.` },
    hy: { naslov: `SLFF ${ozn}: դեռ թիմ չունես`, besedilo: `Տուրի վերջնաժամկետը: ${kdaj}։ Կազմիր թիմ, որպեսզի միավորներ վաստակես։` },
    az: { naslov: `SLFF ${ozn}: hələ komandan yoxdur`, besedilo: `Turun son tarixi: ${kdaj}. Xal toplamaq üçün komanda yığ.` },
    da: { naslov: `SLFF ${ozn}: du har endnu intet hold`, besedilo: `Deadline for runden: ${kdaj}. Sæt dit hold for at samle point.` },
    en: { naslov: `SLFF ${ozn}: you don’t have a team yet`, besedilo: `Round deadline: ${kdaj}. Build your team to score points.` },
    sl: { naslov: `SLFF ${ozn}: še nimaš ekipe`, besedilo: `Rok za krog je ${kdaj}. Sestavi ekipo, da dobiš točke.` },
  }[jezikLige(liga)]
}

// --- opomnik brez lige: človek še nima nobene ekipe -------------------------
// Kdor nima nobene ekipe, nima lige — "privzeta" liga je le najbolj živa, ne
// njegova. Zato mail ne imenuje lige, ampak povabi k izbiri. Jezik je jezik
// prijave (`jezik` v metapodatkih); slovaški prijavi vodita na /sk.

/** Rok v jeziku `j` (ne nujno jeziku lige) in časovnem pasu lige. */
function rokVJeziku(iso: string, liga: Pick<Liga, 'drzava'>, j: Jezik): string {
  return new Date(iso).toLocaleString(LOKALE[j], {
    weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: PAS_DRZAVE[liga.drzava ?? 'SI'] ?? PAS_DRZAVE.SI,
  })
}

interface BesedilaDobrodoslice {
  zadeva: string
  predglava: string
  naslov: string
  uvod: string
  /** Trije koraki (HTML). */
  koraki: [string, string, string]
  gumb: string
  opomba: string
  zakaj: string
}

const DOBRODOSLICA: Record<Jezik, BesedilaDobrodoslice> = {
  sl: {
    zadeva: 'Tvoja SLFF ekipa je pripravljena, le shrani jo',
    predglava: 'En klik in ekipo imaš. Zamenjaj, kogar hočeš, točke zbiraš že v naslednjem krogu.',
    naslov: 'Ekipa v enem kliku',
    uvod: 'Prijavil/a si se, fantasy ekipe pa še nimaš. Sestavimo ti jo mi, ti jo le pregledaš in shraniš.',
    koraki: ['Odpri Mojo ekipo: predlog je že sestavljen.', 'Zamenjaj igralce, ki jih hočeš.', 'Klikni <strong>Shrani</strong>. Točke zbiraš od naslednjega kroga.'],
    gumb: 'Sestavi mi ekipo',
    opomba: 'Ligo izbereš na isti strani. Če ekipe ne želiš, ta mail prezri.',
    zakaj: 'Ta mail si dobil/a, ker si se registriral/a na slff.eu.',
  },
  sk: {
    zadeva: 'Tvoj SLFF tím je pripravený, stačí ho uložiť',
    predglava: 'Jeden klik a tím máš. Vymeň, koho chceš, body zbieraš už v ďalšom kole.',
    naslov: 'Tím jedným klikom',
    uvod: 'Zaregistroval/a si sa, ale fantasy tím ešte nemáš. Zostavíme ti ho my, ty ho len skontroluješ a uložíš.',
    koraki: ['Otvor Môj tím: návrh je už zostavený.', 'Vymeň hráčov, ktorých chceš.', 'Klikni na <strong>Uložiť</strong>. Body zbieraš od ďalšieho kola.'],
    gumb: 'Zostav mi tím',
    opomba: 'Ligu si vyberieš na tej istej stránke. Ak tím nechceš, tento e-mail ignoruj.',
    zakaj: 'Tento e-mail ti prišiel, lebo si sa zaregistroval/a na slff.eu.',
  },
  hr: {
    zadeva: 'Tvoja SLFF momčad je spremna, samo je spremi',
    predglava: 'Jedan klik i imaš momčad. Zamijeni koga želiš, bodove skupljaš već u sljedećem kolu.',
    naslov: 'Momčad jednim klikom',
    uvod: 'Registrirao/la si se, ali još nemaš fantasy momčad. Složit ćemo ti je mi, ti je samo pregledaš i spremiš.',
    koraki: ['Otvori Moju momčad: prijedlog je već složen.', 'Zamijeni igrače koje želiš.', 'Klikni <strong>Spremi</strong>. Bodove skupljaš od sljedećeg kola.'],
    gumb: 'Složi mi momčad',
    opomba: 'Ligu biraš na istoj stranici. Ako ne želiš momčad, zanemari ovaj e-mail.',
    zakaj: 'Ovaj e-mail dobio/la si jer si se registrirao/la na slff.eu.',
  },
  cs: {
    zadeva: 'Tvůj SLFF tým je připravený, stačí ho uložit',
    predglava: 'Jedno kliknutí a tým máš. Vyměň, koho chceš, body sbíráš už v dalším kole.',
    naslov: 'Tým jedním kliknutím',
    uvod: 'Zaregistroval/a ses, ale fantasy tým ještě nemáš. Sestavíme ti ho my, ty ho jen zkontroluješ a uložíš.',
    koraki: ['Otevři Můj tým: návrh je už sestavený.', 'Vyměň hráče, které chceš.', 'Klikni na <strong>Uložit</strong>. Body sbíráš od dalšího kola.'],
    gumb: 'Sestav mi tým',
    opomba: 'Ligu si vybereš na stejné stránce. Pokud tým nechceš, tento e-mail ignoruj.',
    zakaj: 'Tento e-mail ti přišel, protože ses zaregistroval/a na slff.eu.',
  },
  hu: {
    zadeva: 'Kész az SLFF csapatod, csak mentsd el',
    predglava: 'Egy kattintás, és megvan a csapatod. Cseréld le, akit szeretnél, a pontokat már a következő fordulóban gyűjtöd.',
    naslov: 'Csapat egy kattintással',
    uvod: 'Regisztráltál, de még nincs fantasy csapatod. Mi összerakjuk neked, te csak átnézed és elmented.',
    koraki: ['Nyisd meg a Csapatom oldalt: a javaslat már kész.', 'Cseréld le a játékosokat, akiket szeretnél.', 'Kattints a <strong>Mentés</strong> gombra. A következő fordulótól gyűjtöd a pontokat.'],
    gumb: 'Csapatot kérek',
    opomba: 'A bajnokságot ugyanazon az oldalon választod ki. Ha nem kérsz csapatot, hagyd figyelmen kívül ezt az e-mailt.',
    zakaj: 'Ezt az e-mailt azért kaptad, mert regisztráltál az slff.eu-n.',
  },
  de: {
    zadeva: 'Dein SLFF-Team ist fertig, du musst es nur speichern',
    predglava: 'Ein Klick und dein Team steht. Tausch aus, wen du willst, Punkte sammelst du schon in der nächsten Runde.',
    naslov: 'Ein Team mit einem Klick',
    uvod: 'Du hast dich registriert, hast aber noch kein Fantasy-Team. Wir stellen es dir zusammen, du schaust es nur durch und speicherst.',
    koraki: ['Öffne Mein Team: der Vorschlag ist schon fertig.', 'Tausch die Spieler aus, die du willst.', 'Klick auf <strong>Speichern</strong>. Punkte sammelst du ab der nächsten Runde.'],
    gumb: 'Team für mich zusammenstellen',
    opomba: 'Die Liga wählst du auf derselben Seite. Wenn du kein Team willst, ignorier diese E-Mail.',
    zakaj: 'Du bekommst diese E-Mail, weil du dich auf slff.eu registriert hast.',
  },
  sr: {
    zadeva: 'Tvoj SLFF tim je spreman, samo ga sačuvaj',
    predglava: 'Jedan klik i imaš tim. Zameni koga želiš, bodove skupljaš već u sledećem kolu.',
    naslov: 'Tim jednim klikom',
    uvod: 'Registrovao/la si se, ali još nemaš fantasy tim. Mi ćemo ti ga sastaviti, ti ga samo pregledaš i sačuvaš.',
    koraki: ['Otvori Moj tim: predlog je već sastavljen.', 'Zameni igrače koje želiš.', 'Klikni <strong>Sačuvaj</strong>. Bodove skupljaš od sledećeg kola.'],
    gumb: 'Sastavi mi tim',
    opomba: 'Ligu biraš na istoj stranici. Ako ne želiš tim, zanemari ovaj imejl.',
    zakaj: 'Ovaj imejl si dobio/la jer si se registrovao/la na slff.eu.',
  },
  ro: {
    zadeva: 'Echipa ta SLFF e gata, doar salveaz-o',
    predglava: 'Un clic și ai echipă. Schimbă pe cine vrei, strângi puncte chiar din etapa următoare.',
    naslov: 'Echipă dintr-un clic',
    uvod: 'Te-ai înregistrat, dar încă nu ai o echipă fantasy. Ți-o facem noi, tu doar o verifici și o salvezi.',
    koraki: ['Deschide Echipa mea: propunerea e deja făcută.', 'Schimbă jucătorii pe care îi vrei.', 'Apasă <strong>Salvează</strong>. Strângi puncte din etapa următoare.'],
    gumb: 'Fă-mi echipa',
    opomba: 'Liga o alegi pe aceeași pagină. Dacă nu vrei echipă, ignoră acest e-mail.',
    zakaj: 'Ai primit acest e-mail pentru că te-ai înregistrat pe slff.eu.',
  },
  et: {
    zadeva: 'Sinu SLFF-i meeskond on valmis, salvesta see',
    predglava: 'Üks klõps ja meeskond on olemas. Vaheta, keda tahad, punkte kogud juba järgmises voorus.',
    naslov: 'Meeskond ühe klõpsuga',
    uvod: 'Registreerusid, kuid sul pole veel fantaasiameeskonda. Paneme selle sulle kokku, sina vaatad üle ja salvestad.',
    koraki: ['Ava Minu meeskond: ettepanek on juba koos.', 'Vaheta mängijad, keda tahad.', 'Klõpsa <strong>Salvesta</strong>. Punkte kogud alates järgmisest voorust.'],
    gumb: 'Pane mulle meeskond kokku',
    opomba: 'Liiga valid samal lehel. Kui sa meeskonda ei taha, jäta see kiri tähelepanuta.',
    zakaj: 'Said selle kirja, sest registreerusid slff.eu-s.',
  },
  pl: {
    zadeva: 'Twoja drużyna SLFF jest gotowa, wystarczy ją zapisać',
    predglava: 'Jedno kliknięcie i masz drużynę. Wymień, kogo chcesz, punkty zbierasz już w następnej kolejce.',
    naslov: 'Drużyna jednym kliknięciem',
    uvod: 'Masz już konto, ale nie masz jeszcze drużyny fantasy. Ułożymy ją za ciebie, ty tylko ją przejrzysz i zapiszesz.',
    koraki: ['Otwórz Moją drużynę: propozycja jest już ułożona.', 'Wymień zawodników, których chcesz.', 'Kliknij <strong>Zapisz</strong>. Punkty zbierasz od następnej kolejki.'],
    gumb: 'Ułóż mi drużynę',
    opomba: 'Ligę wybierasz na tej samej stronie. Jeśli nie chcesz drużyny, zignoruj tę wiadomość.',
    zakaj: 'Dostajesz tę wiadomość, bo założyłeś/aś konto na slff.eu.',
  },
  es: {
    zadeva: 'Tu equipo de SLFF está listo, solo guárdalo',
    predglava: 'Un clic y tienes equipo. Cambia a quien quieras, sumas puntos ya en la próxima jornada.',
    naslov: 'Tu equipo en un clic',
    uvod: 'Te has registrado, pero aún no tienes equipo fantasy. Te lo hacemos nosotros, tú solo lo revisas y lo guardas.',
    koraki: ['Abre Mi equipo: la propuesta ya está hecha.', 'Cambia a los jugadores que quieras.', 'Pulsa <strong>Guardar</strong>. Sumas puntos desde la próxima jornada.'],
    gumb: 'Hazme el equipo',
    opomba: 'La liga la eliges en la misma página. Si no quieres equipo, ignora este correo.',
    zakaj: 'Recibes este correo porque te registraste en slff.eu.',
  },
  lv: {
    zadeva: 'Tava SLFF komanda ir gatava, tikai saglabā to',
    predglava: 'Viens klikšķis, un komanda ir tev. Nomaini, ko vēlies, punktus krāsi jau nākamajā kārtā.',
    naslov: 'Komanda ar vienu klikšķi',
    uvod: 'Tu esi reģistrējies, bet tev vēl nav fantāzijas komandas. Mēs to sastādīsim, tu to tikai pārskati un saglabā.',
    koraki: ['Atver Mana komanda: piedāvājums jau ir sastādīts.', 'Nomaini spēlētājus, kurus vēlies.', 'Noklikšķini <strong>Saglabāt</strong>. Punktus krāj no nākamās kārtas.'],
    gumb: 'Sastādīt man komandu',
    opomba: 'Līgu izvēlies tajā pašā lapā. Ja komandu nevēlies, ignorē šo vēstuli.',
    zakaj: 'Šo vēstuli saņēmi, jo reģistrējies slff.eu.',
  },
  mk: {
    zadeva: 'Твојот SLFF тим е подготвен, само зачувај го',
    predglava: 'Еден клик и имаш тим. Замени кого сакаш, поени собираш веќе во следното коло.',
    naslov: 'Тим со еден клик',
    uvod: 'Се регистрираше, но сè уште немаш фантази тим. Ние ќе ти го составиме, ти само го прегледуваш и зачувуваш.',
    koraki: ['Отвори Мој тим: предлогот е веќе составен.', 'Замени ги играчите што сакаш.', 'Кликни <strong>Зачувај</strong>. Поени собираш од следното коло.'],
    gumb: 'Состави ми тим',
    opomba: 'Лигата ја избираш на истата страница. Ако не сакаш тим, игнорирај ја оваа порака.',
    zakaj: 'Ја доби оваа порака затоа што се регистрираше на slff.eu.',
  },
  el: {
    zadeva: 'Η ομάδα σου στο SLFF είναι έτοιμη, απλώς αποθήκευσέ την',
    predglava: 'Ένα κλικ και έχεις ομάδα. Άλλαξε όποιον θέλεις, πόντους μαζεύεις ήδη από την επόμενη αγωνιστική.',
    naslov: 'Ομάδα με ένα κλικ',
    uvod: 'Έκανες εγγραφή, αλλά δεν έχεις ακόμα fantasy ομάδα. Τη φτιάχνουμε εμείς, εσύ απλώς την ελέγχεις και την αποθηκεύεις.',
    koraki: ['Άνοιξε το Η ομάδα μου: η πρόταση είναι ήδη έτοιμη.', 'Άλλαξε τους παίκτες που θέλεις.', 'Πάτησε <strong>Αποθήκευση</strong>. Μαζεύεις πόντους από την επόμενη αγωνιστική.'],
    gumb: 'Φτιάξε μου ομάδα',
    opomba: 'Το πρωτάθλημα το διαλέγεις στην ίδια σελίδα. Αν δεν θέλεις ομάδα, αγνόησε αυτό το μήνυμα.',
    zakaj: 'Λαμβάνεις αυτό το μήνυμα επειδή έκανες εγγραφή στο slff.eu.',
  },
  tr: {
    zadeva: 'SLFF takımın hazır, sadece kaydet',
    predglava: 'Tek tık ve takımın hazır. İstediğini değiştir, puan toplamaya gelecek hafta başlarsın.',
    naslov: 'Tek tıkla takım',
    uvod: 'Kayıt oldun ama henüz bir fantezi takımın yok. Takımını biz kuralım, sen sadece göz at ve kaydet.',
    koraki: ['Takımım sayfasını aç: öneri zaten hazır.', 'İstediğin oyuncuları değiştir.', '<strong>Kaydet</strong>’e tıkla. Gelecek haftadan itibaren puan toplarsın.'],
    gumb: 'Takımımı kur',
    opomba: 'Ligini aynı sayfada seçersin. Takım istemiyorsan bu e-postayı görmezden gel.',
    zakaj: 'Bu e-postayı slff.eu’ya kayıt olduğun için aldın.',
  },
  uk: {
    zadeva: 'Твоя команда SLFF готова, лише збережи її',
    predglava: 'Один клік, і команда в тебе є. Заміни кого хочеш, очки набираєш уже в наступному турі.',
    naslov: 'Команда одним кліком',
    uvod: 'Ти зареєструвався, але ще не маєш фентезі-команди. Ми зберемо її за тебе, тобі лише переглянути й зберегти.',
    koraki: ['Відкрий Моя команда: пропозиція вже готова.', 'Заміни гравців, яких хочеш.', 'Натисни <strong>Зберегти</strong>. Очки набираєш з наступного туру.'],
    gumb: 'Збери мені команду',
    opomba: 'Лігу обираєш на тій самій сторінці. Якщо команда не потрібна, проігноруй цей лист.',
    zakaj: 'Ти отримав цей лист, бо зареєструвався на slff.eu.',
  },
  hy: {
    zadeva: 'Քո SLFF թիմը պատրաստ է, պարզապես պահպանիր այն',
    predglava: 'Մեկ սեղմում, և թիմն ունես։ Փոխարինիր ում ուզում ես, միավորներ կվաստակես արդեն հաջորդ տուրում։',
    naslov: 'Թիմ մեկ սեղմումով',
    uvod: 'Գրանցվել ես, բայց դեռ ֆենթեզի թիմ չունես։ Մենք այն կկազմենք, դու միայն կստուգես և կպահպանես։',
    koraki: ['Բացիր Իմ թիմը. առաջարկն արդեն կազմված է։', 'Փոխարինիր այն խաղացողներին, որոնց ուզում ես։', 'Սեղմիր <strong>Պահպանել</strong>։ Միավորներ կվաստակես հաջորդ տուրից։'],
    gumb: 'Կազմիր ինձ համար թիմ',
    opomba: 'Լիգան ընտրում ես նույն էջում։ Եթե թիմ չես ուզում, անտեսիր այս նամակը։',
    zakaj: 'Այս նամակը ստացել ես, քանի որ գրանցվել ես slff.eu-ում։',
  },
  az: {
    zadeva: 'SLFF komandan hazırdır, sadəcə yadda saxla',
    predglava: 'Bir klik və komandan var. İstədiyini dəyiş, xalları elə növbəti turda toplayırsan.',
    naslov: 'Bir kliklə komanda',
    uvod: 'Qeydiyyatdan keçmisən, amma hələ fantasy komandan yoxdur. Onu biz yığırıq, sən sadəcə baxıb yadda saxlayırsan.',
    koraki: ['Mənim komandam səhifəsini aç: təklif artıq hazırdır.', 'İstədiyin oyunçuları dəyiş.', '<strong>Yadda saxla</strong> düyməsini bas. Xalları növbəti turdan toplayırsan.'],
    gumb: 'Mənə komanda yığ',
    opomba: 'Liqanı eyni səhifədə seçirsən. Komanda istəmirsənsə, bu məktubu nəzərə alma.',
    zakaj: 'Bu məktubu slff.eu-da qeydiyyatdan keçdiyin üçün aldın.',
  },
  da: {
    zadeva: 'Dit SLFF-hold er klar, du skal bare gemme det',
    predglava: 'Ét klik, så har du et hold. Skift ud, som du vil, du samler point allerede i næste runde.',
    naslov: 'Et hold med ét klik',
    uvod: 'Du har oprettet dig, men har endnu intet fantasyhold. Vi sætter det for dig, du kigger det bare igennem og gemmer.',
    koraki: ['Åbn Mit hold: forslaget er allerede sat.', 'Skift de spillere ud, du vil.', 'Klik på <strong>Gem</strong>. Du samler point fra næste runde.'],
    gumb: 'Sæt mit hold',
    opomba: 'Ligaen vælger du på samme side. Vil du ikke have et hold, kan du se bort fra denne mail.',
    zakaj: 'Du får denne mail, fordi du har oprettet dig på slff.eu.',
  },
  en: {
    zadeva: 'Your SLFF team is ready, just save it',
    predglava: 'One click and you have a team. Swap anyone you like, you start scoring in the next round.',
    naslov: 'Your team in one click',
    uvod: 'You signed up, but you don’t have a fantasy team yet. We build it for you, you just check it and save.',
    koraki: ['Open My team: the suggestion is already there.', 'Swap any players you like.', 'Click <strong>Save</strong>. You score points from the next round.'],
    gumb: 'Build my team',
    opomba: 'You pick your league on the same page. If you don’t want a team, ignore this email.',
    zakaj: 'You got this email because you signed up on slff.eu.',
  },
}

export function sestaviOpomnikBrezLige(
  jezik: string | null | undefined,
  meta: { display_name: string | null },
): Sporocilo {
  // `en`: dobrodošlica uporabniku brez znanega jezika (Google prijava) ali iz
  // Združenega kraljestva in Malte.
  const j: Jezik = jeJezik(jezik) ? jezik : 'sl'
  // Naravnost na Mojo ekipo s predlogom (`?sestavi=1`): ekipa je ob odprtju
  // že sestavljena, ostane le Shrani. Državo in ligo ugane stran (IP, jezik).
  const vstop = `${SITE}/my-team?sestavi=1`
  const odjava = `${SITE}/reminders`
  const B = DOBRODOSLICA[j]
  return sestavi(j, {
    zadeva: B.zadeva,
    predglava: B.predglava,
    naslov: B.naslov,
    uvod: `${pozdrav(j, meta.display_name)} ${B.uvod}`,
    seznam: B.koraki,
    gumb: { label: B.gumb, url: vstop },
    opomba: B.opomba,
    zakaj: B.zakaj,
  }, odjava)
}

// --- opomnik brez ekipe: do trije po dobrodošlici ---------------------------
// Krajši od dobrodošlice: liga (ekipe, kluba ali države jezika), rok in gumb.
// Ime lige stoji samo zase (v vrstici dejstev), da ga ni treba sklanjati.
// Brez lige (`liga` null) brez `?t=` in brez roka.

interface BesedilaBrezEkipe {
  /** Zadeva z rokom (za "SLFF <liga>: "). */
  zRokom: (kdaj: string) => string
  /** Zadeva brez roka (za "SLFF[ <liga>]: "). */
  brezRoka: string
  predglava: string
  naslov: string
  uvod: string
  liga: string
  rok: string
  gumb: string
  zakaj: string
}

const BREZ_EKIPE: Record<Jezik, BesedilaBrezEkipe> = {
  sl: {
    zRokom: (k) => `rok je ${k}, ekipe še nimaš`, brezRoka: 'ekipa te še čaka',
    predglava: 'Ekipo ti sestavimo v enem kliku, ti jo le shraniš.',
    naslov: 'Ekipa te še čaka',
    uvod: 'Še vedno nimaš fantasy ekipe. Gumb »Sestavi mi ekipo« jo naredi v enem kliku: zamenjaj, kogar hočeš, in shrani.',
    liga: 'Liga', rok: 'Rok', gumb: 'Sestavi mi ekipo',
    zakaj: 'Opomnik dobiš, ker na slff.eu še nimaš ekipe.',
  },
  sk: {
    zRokom: (k) => `uzávierka je ${k}, tím ešte nemáš`, brezRoka: 'tím na teba stále čaká',
    predglava: 'Tím ti zostavíme jedným klikom, ty ho len uložíš.',
    naslov: 'Tím na teba stále čaká',
    uvod: 'Stále nemáš fantasy tím. „Zostav mi tím“ ho vytvorí jedným klikom: vymeň, koho chceš, a ulož.',
    liga: 'Liga', rok: 'Uzávierka', gumb: 'Zostav mi tím',
    zakaj: 'Pripomienku dostávaš, lebo na slff.eu ešte nemáš tím.',
  },
  hr: {
    zRokom: (k) => `rok je ${k}, momčad još nemaš`, brezRoka: 'momčad te još čeka',
    predglava: 'Momčad ti slažemo jednim klikom, ti je samo spremiš.',
    naslov: 'Momčad te još čeka',
    uvod: 'Još uvijek nemaš fantasy momčad. „Složi mi momčad“ je slaže jednim klikom: zamijeni koga želiš i spremi.',
    liga: 'Liga', rok: 'Rok', gumb: 'Složi mi momčad',
    zakaj: 'Podsjetnik dobivaš jer na slff.eu još nemaš momčad.',
  },
  cs: {
    zRokom: (k) => `uzávěrka je ${k}, tým ještě nemáš`, brezRoka: 'tým na tebe pořád čeká',
    predglava: 'Tým ti sestavíme jedním kliknutím, ty ho jen uložíš.',
    naslov: 'Tým na tebe pořád čeká',
    uvod: 'Pořád nemáš fantasy tým. „Sestav mi tým“ ho vytvoří jedním kliknutím: vyměň, koho chceš, a ulož.',
    liga: 'Liga', rok: 'Uzávěrka', gumb: 'Sestav mi tým',
    zakaj: 'Připomínku dostáváš, protože na slff.eu ještě nemáš tým.',
  },
  hu: {
    zRokom: (k) => `határidő: ${k}, még nincs csapatod`, brezRoka: 'a csapatod még vár',
    predglava: 'Egy kattintással összerakjuk a csapatodat, neked csak el kell mentened.',
    naslov: 'A csapatod még vár',
    uvod: 'Még mindig nincs fantasy csapatod. A „Csapatot kérek” gomb egy kattintással összerakja: cseréld le, akit szeretnél, és mentsd el.',
    liga: 'Bajnokság', rok: 'Határidő', gumb: 'Csapatot kérek',
    zakaj: 'Az emlékeztetőt azért kapod, mert még nincs csapatod az slff.eu-n.',
  },
  de: {
    zRokom: (k) => `Deadline ${k}, du hast noch kein Team`, brezRoka: 'dein Team wartet noch',
    predglava: 'Wir stellen dein Team mit einem Klick zusammen, du speicherst es nur.',
    naslov: 'Dein Team wartet noch',
    uvod: 'Du hast noch kein Fantasy-Team. „Team für mich zusammenstellen“ erledigt das mit einem Klick: tausch aus, wen du willst, und speichere.',
    liga: 'Liga', rok: 'Deadline', gumb: 'Team für mich zusammenstellen',
    zakaj: 'Du bekommst diese Erinnerung, weil du auf slff.eu noch kein Team hast.',
  },
  sr: {
    zRokom: (k) => `rok je ${k}, tim još nemaš`, brezRoka: 'tim te još čeka',
    predglava: 'Tim ti sastavljamo jednim klikom, ti ga samo sačuvaš.',
    naslov: 'Tim te još čeka',
    uvod: 'Još uvek nemaš fantasy tim. „Sastavi mi tim“ ga sastavlja jednim klikom: zameni koga želiš i sačuvaj.',
    liga: 'Liga', rok: 'Rok', gumb: 'Sastavi mi tim',
    zakaj: 'Podsetnik dobijaš jer na slff.eu još nemaš tim.',
  },
  ro: {
    zRokom: (k) => `termenul e ${k}, încă nu ai echipă`, brezRoka: 'echipa te așteaptă încă',
    predglava: 'Îți facem echipa dintr-un clic, tu doar o salvezi.',
    naslov: 'Echipa te așteaptă încă',
    uvod: 'Încă nu ai o echipă fantasy. „Fă-mi echipa” o face dintr-un clic: schimbă pe cine vrei și salvează.',
    liga: 'Liga', rok: 'Termen', gumb: 'Fă-mi echipa',
    zakaj: 'Primești acest memento pentru că încă nu ai echipă pe slff.eu.',
  },
  et: {
    zRokom: (k) => `tähtaeg ${k}, sul pole veel meeskonda`, brezRoka: 'meeskond ootab sind ikka veel',
    predglava: 'Paneme meeskonna kokku ühe klõpsuga, sina ainult salvestad.',
    naslov: 'Meeskond ootab sind ikka veel',
    uvod: 'Sul pole ikka veel fantaasiameeskonda. „Pane mulle meeskond kokku“ teeb selle ühe klõpsuga: vaheta, keda tahad, ja salvesta.',
    liga: 'Liiga', rok: 'Tähtaeg', gumb: 'Pane mulle meeskond kokku',
    zakaj: 'Saad meeldetuletuse, sest sul pole slff.eu-s veel meeskonda.',
  },
  pl: {
    zRokom: (k) => `termin: ${k}, nie masz jeszcze drużyny`, brezRoka: 'drużyna wciąż na ciebie czeka',
    predglava: 'Ułożymy ci drużynę jednym kliknięciem, ty tylko ją zapiszesz.',
    naslov: 'Drużyna wciąż na ciebie czeka',
    uvod: 'Nadal nie masz drużyny fantasy. „Ułóż mi drużynę” zrobi to jednym kliknięciem: wymień, kogo chcesz, i zapisz.',
    liga: 'Liga', rok: 'Termin', gumb: 'Ułóż mi drużynę',
    zakaj: 'Dostajesz przypomnienie, bo nie masz jeszcze drużyny na slff.eu.',
  },
  es: {
    zRokom: (k) => `cierre: ${k}, aún no tienes equipo`, brezRoka: 'tu equipo aún te espera',
    predglava: 'Te hacemos el equipo con un clic, tú solo lo guardas.',
    naslov: 'Tu equipo aún te espera',
    uvod: 'Todavía no tienes equipo fantasy. «Hazme el equipo» lo hace con un clic: cambia a quien quieras y guarda.',
    liga: 'Liga', rok: 'Cierre', gumb: 'Hazme el equipo',
    zakaj: 'Recibes este recordatorio porque aún no tienes equipo en slff.eu.',
  },
  lv: {
    zRokom: (k) => `termiņš ${k}, tev vēl nav komandas`, brezRoka: 'komanda tevi joprojām gaida',
    predglava: 'Sastādīsim tev komandu ar vienu klikšķi, tu to tikai saglabā.',
    naslov: 'Komanda tevi joprojām gaida',
    uvod: 'Tev joprojām nav fantāzijas komandas. “Sastādīt man komandu” to izdara ar vienu klikšķi: nomaini, ko vēlies, un saglabā.',
    liga: 'Līga', rok: 'Termiņš', gumb: 'Sastādīt man komandu',
    zakaj: 'Atgādinājumu saņem, jo tev slff.eu vēl nav komandas.',
  },
  mk: {
    zRokom: (k) => `рокот е ${k}, сè уште немаш тим`, brezRoka: 'тимот сè уште те чека',
    predglava: 'Тимот ти го составуваме со еден клик, ти само го зачувуваш.',
    naslov: 'Тимот сè уште те чека',
    uvod: 'Сè уште немаш фантази тим. „Состави ми тим“ го прави со еден клик: замени кого сакаш и зачувај.',
    liga: 'Лига', rok: 'Рок', gumb: 'Состави ми тим',
    zakaj: 'Потсетникот го добиваш затоа што сè уште немаш тим на slff.eu.',
  },
  el: {
    zRokom: (k) => `προθεσμία ${k}, δεν έχεις ακόμα ομάδα`, brezRoka: 'η ομάδα σου σε περιμένει ακόμα',
    predglava: 'Σου φτιάχνουμε ομάδα με ένα κλικ, εσύ απλώς την αποθηκεύεις.',
    naslov: 'Η ομάδα σου σε περιμένει ακόμα',
    uvod: 'Δεν έχεις ακόμα fantasy ομάδα. Το «Φτιάξε μου ομάδα» τη φτιάχνει με ένα κλικ: άλλαξε όποιον θέλεις και αποθήκευσε.',
    liga: 'Πρωτάθλημα', rok: 'Προθεσμία', gumb: 'Φτιάξε μου ομάδα',
    zakaj: 'Λαμβάνεις την υπενθύμιση επειδή δεν έχεις ακόμα ομάδα στο slff.eu.',
  },
  tr: {
    zRokom: (k) => `son tarih ${k}, henüz takımın yok`, brezRoka: 'takımın hâlâ seni bekliyor',
    predglava: 'Takımını tek tıkla kuruyoruz, sen sadece kaydediyorsun.',
    naslov: 'Takımın hâlâ seni bekliyor',
    uvod: 'Hâlâ bir fantezi takımın yok. “Takımımı kur” onu tek tıkla kurar: istediğin oyuncuyu değiştir ve kaydet.',
    liga: 'Lig', rok: 'Son tarih', gumb: 'Takımımı kur',
    zakaj: 'Bu hatırlatmayı slff.eu’da henüz takımın olmadığı için alıyorsun.',
  },
  uk: {
    zRokom: (k) => `дедлайн ${k}, у тебе ще немає команди`, brezRoka: 'команда ще чекає на тебе',
    predglava: 'Ми зберемо команду одним кліком, тобі лише зберегти.',
    naslov: 'Команда ще чекає на тебе',
    uvod: 'У тебе досі немає фентезі-команди. «Збери мені команду» зробить її одним кліком: заміни кого хочеш і збережи.',
    liga: 'Ліга', rok: 'Дедлайн', gumb: 'Збери мені команду',
    zakaj: 'Ти отримуєш нагадування, бо ще не маєш команди на slff.eu.',
  },
  hy: {
    zRokom: (k) => `վերջնաժամկետը՝ ${k}, դեռ թիմ չունես`, brezRoka: 'թիմը դեռ սպասում է քեզ',
    predglava: 'Թիմը կկազմենք մեկ սեղմումով, դու միայն կպահպանես։',
    naslov: 'Թիմը դեռ սպասում է քեզ',
    uvod: 'Դեռ ֆենթեզի թիմ չունես։ «Կազմիր ինձ համար թիմ» կոճակը դա անում է մեկ սեղմումով. փոխարինիր ում ուզում ես և պահպանիր։',
    liga: 'Լիգա', rok: 'Վերջնաժամկետ', gumb: 'Կազմիր ինձ համար թիմ',
    zakaj: 'Հիշեցումը ստանում ես, քանի որ slff.eu-ում դեռ թիմ չունես։',
  },
  az: {
    zRokom: (k) => `son tarix ${k}, hələ komandan yoxdur`, brezRoka: 'komandan hələ səni gözləyir',
    predglava: 'Komandanı bir kliklə yığırıq, sən sadəcə yadda saxlayırsan.',
    naslov: 'Komandan hələ səni gözləyir',
    uvod: 'Hələ fantasy komandan yoxdur. “Mənə komanda yığ” onu bir kliklə edir: istədiyini dəyiş və yadda saxla.',
    liga: 'Liqa', rok: 'Son tarix', gumb: 'Mənə komanda yığ',
    zakaj: 'Bu xatırlatmanı slff.eu-da hələ komandan olmadığı üçün alırsan.',
  },
  da: {
    zRokom: (k) => `deadline ${k}, du har endnu intet hold`, brezRoka: 'dit hold venter stadig',
    predglava: 'Vi sætter dit hold med ét klik, du gemmer det bare.',
    naslov: 'Dit hold venter stadig',
    uvod: 'Du har stadig intet fantasyhold. "Sæt mit hold" klarer det med ét klik: skift ud, som du vil, og gem.',
    liga: 'Liga', rok: 'Deadline', gumb: 'Sæt mit hold',
    zakaj: 'Du får påmindelsen, fordi du endnu ikke har et hold på slff.eu.',
  },
  en: {
    zRokom: (k) => `deadline ${k}, you still don’t have a team`, brezRoka: 'your team is still waiting',
    predglava: 'We build your team in one click, you just save it.',
    naslov: 'Your team is still waiting',
    uvod: 'You still don’t have a fantasy team. “Build my team” makes one in a single click: swap anyone you like and save.',
    liga: 'League', rok: 'Deadline', gumb: 'Build my team',
    zakaj: 'You get this reminder because you don’t have a team on slff.eu yet.',
  },
}

export function sestaviOpomnikBrezEkipe(
  jezik: string | null | undefined,
  meta: { display_name: string | null; liga: Liga | null; rok: string | null },
): Sporocilo {
  const j: Jezik = jeJezik(jezik) ? jezik : 'sl'
  const { liga, rok } = meta
  const t = liga ? `&t=${encodeURIComponent(liga.slug)}` : ''
  const vstop = `${SITE}/my-team?sestavi=1${t}`
  const odjava = liga ? povezave(liga.slug).odjava : `${SITE}/reminders`
  const B = BREZ_EKIPE[j]
  const kdaj = liga && rok ? rokVJeziku(rok, liga, j) : null
  const dejstva: Vrstica[] = []
  if (liga) dejstva.push({ k: B.liga, v: esc(liga.ime || liga.oznaka) })
  if (kdaj) dejstva.push({ k: B.rok, v: esc(kdaj) })
  return sestavi(j, {
    zadeva: `SLFF${liga ? ` ${liga.oznaka}` : ''}: ${kdaj ? B.zRokom(kdaj) : B.brezRoka}`,
    predglava: B.predglava,
    ...(liga ? { oznaka: liga.oznaka } : {}),
    naslov: B.naslov,
    uvod: `${pozdrav(j, meta.display_name)} ${B.uvod}`,
    dejstva,
    gumb: { label: B.gumb, url: vstop },
    zakaj: B.zakaj,
  }, odjava)
}

// --- liga, ki si jo je kdo želel, je zaživela -------------------------------
// Enkratno obvestilo na željo ("Moje lige ni"), zato brez odjave. Jezik je
// jezik vmesnika ob želji, sicer jezik lige. Ime lige stoji samo zase
// (zadeva z dvopičjem ali kot osebek, vrstica dejstev). Prvi rok le, če ga
// poznamo (`meta.rok`).

interface BesedilaLigaZivi {
  zadeva: (ime: string) => string
  predglava: string
  naslov: string
  uvod: string
  liga: string
  prviRok: string
  gumb: string
  opomba: string
  zakaj: string
}

const LIGA_ZIVI: Record<Jezik, BesedilaLigaZivi> = {
  sl: {
    zadeva: (i) => `${i} je zdaj v SLFF`,
    predglava: 'Želel/a si si jo, zdaj je tu. Sestavi ekipo pred prvim rokom.',
    naslov: 'Tvoja liga je v igri',
    uvod: 'Ligo, ki si si jo želel/a, smo dodali. Igralci, cene in razpored so pripravljeni.',
    liga: 'Liga', prviRok: 'Prvi rok', gumb: 'Sestavi ekipo',
    opomba: 'To je edini mail o tvoji želji.',
    zakaj: 'Ta mail si dobil/a, ker si na slff.eu oddal/a željo "Moje lige ni".',
  },
  sk: {
    zadeva: (i) => `${i} je teraz v SLFF`,
    predglava: 'Želal/a si si ju, teraz je tu. Zostav si tím pred prvou uzávierkou.',
    naslov: 'Tvoja liga je v hre',
    uvod: 'Ligu, ktorú si si želal/a, sme pridali. Hráči, ceny aj rozpis sú pripravené.',
    liga: 'Liga', prviRok: 'Prvá uzávierka', gumb: 'Zostav tím',
    opomba: 'Toto je jediný e-mail o tvojom želaní.',
    zakaj: 'Tento e-mail ti prišiel, lebo si si na slff.eu želal/a túto ligu.',
  },
  hr: {
    zadeva: (i) => `${i} sada je u SLFF-u`,
    predglava: 'Željela/o si je, sada je tu. Složi momčad prije prvog roka.',
    naslov: 'Tvoja liga je u igri',
    uvod: 'Ligu koju si želio/la dodali smo. Igrači, cijene i raspored su spremni.',
    liga: 'Liga', prviRok: 'Prvi rok', gumb: 'Složi momčad',
    opomba: 'Ovo je jedini e-mail o tvojoj želji.',
    zakaj: 'Ovaj e-mail dobio/la si jer si na slff.eu poželio/la ovu ligu.',
  },
  cs: {
    zadeva: (i) => `${i} je teď v SLFF`,
    predglava: 'Přál/a sis ji, teď je tu. Sestav si tým před první uzávěrkou.',
    naslov: 'Tvoje liga je ve hře',
    uvod: 'Ligu, kterou sis přál/a, jsme přidali. Hráči, ceny i rozpis jsou připravené.',
    liga: 'Liga', prviRok: 'První uzávěrka', gumb: 'Sestav tým',
    opomba: 'Toto je jediný e-mail o tvém přání.',
    zakaj: 'Tento e-mail ti přišel, protože sis na slff.eu přál/a tuto ligu.',
  },
  hu: {
    zadeva: (i) => `Megérkezett az SLFF-be: ${i}`,
    predglava: 'Kérted, most itt van. Rakd össze a csapatodat az első határidő előtt.',
    naslov: 'A bajnokságod játékban van',
    uvod: 'Hozzáadtuk a bajnokságot, amelyet kértél. A játékosok, az árak és a menetrend készen állnak.',
    liga: 'Bajnokság', prviRok: 'Első határidő', gumb: 'Csapatot rakok össze',
    opomba: 'Ez az egyetlen e-mail a kérésedről.',
    zakaj: 'Ezt az e-mailt azért kaptad, mert az slff.eu-n kérted ezt a bajnokságot.',
  },
  de: {
    zadeva: (i) => `Neu bei SLFF: ${i}`,
    predglava: 'Du hast sie dir gewünscht, jetzt ist sie da. Stell dein Team vor der ersten Deadline zusammen.',
    naslov: 'Deine Liga ist im Spiel',
    uvod: 'Die Liga, die du dir gewünscht hast, ist jetzt dabei. Spieler, Preise und Spielplan sind bereit.',
    liga: 'Liga', prviRok: 'Erste Deadline', gumb: 'Team zusammenstellen',
    opomba: 'Das ist die einzige E-Mail zu deinem Wunsch.',
    zakaj: 'Du bekommst diese E-Mail, weil du dir diese Liga auf slff.eu gewünscht hast.',
  },
  sr: {
    zadeva: (i) => `${i} je sada u SLFF-u`,
    predglava: 'Želeo/la si je, sada je tu. Sastavi tim pre prvog roka.',
    naslov: 'Tvoja liga je u igri',
    uvod: 'Ligu koju si želeo/la smo dodali. Igrači, cene i raspored su spremni.',
    liga: 'Liga', prviRok: 'Prvi rok', gumb: 'Sastavi tim',
    opomba: 'Ovo je jedini imejl o tvojoj želji.',
    zakaj: 'Ovaj imejl si dobio/la jer si na slff.eu poželeo/la ovu ligu.',
  },
  ro: {
    zadeva: (i) => `${i} e acum în SLFF`,
    predglava: 'Ți-ai dorit-o, acum e aici. Fă-ți echipa înainte de primul termen.',
    naslov: 'Liga ta e în joc',
    uvod: 'Am adăugat liga pe care ți-ai dorit-o. Jucătorii, prețurile și programul sunt gata.',
    liga: 'Liga', prviRok: 'Primul termen', gumb: 'Fă-ți echipa',
    opomba: 'Acesta este singurul e-mail despre dorința ta.',
    zakaj: 'Ai primit acest e-mail pentru că ți-ai dorit această ligă pe slff.eu.',
  },
  et: {
    zadeva: (i) => `Uus SLFF-is: ${i}`,
    predglava: 'Soovisid seda, nüüd on see siin. Pane meeskond kokku enne esimest tähtaega.',
    naslov: 'Sinu liiga on mängus',
    uvod: 'Lisasime liiga, mida soovisid. Mängijad, hinnad ja ajakava on valmis.',
    liga: 'Liiga', prviRok: 'Esimene tähtaeg', gumb: 'Pane meeskond kokku',
    opomba: 'See on ainus kiri sinu soovi kohta.',
    zakaj: 'Said selle kirja, sest soovisid slff.eu-s seda liigat.',
  },
  pl: {
    zadeva: (i) => `${i} jest już w SLFF`,
    predglava: 'Chciałeś/aś jej, teraz jest. Ułóż drużynę przed pierwszym terminem.',
    naslov: 'Twoja liga jest w grze',
    uvod: 'Dodaliśmy ligę, o którą prosiłeś/aś. Zawodnicy, ceny i terminarz są gotowe.',
    liga: 'Liga', prviRok: 'Pierwszy termin', gumb: 'Ułóż drużynę',
    opomba: 'To jedyna wiadomość w sprawie twojej prośby.',
    zakaj: 'Dostajesz tę wiadomość, bo prosiłeś/aś o tę ligę na slff.eu.',
  },
  es: {
    zadeva: (i) => `${i} ya está en SLFF`,
    predglava: 'La pediste y ya está aquí. Haz tu equipo antes del primer cierre.',
    naslov: 'Tu liga ya está en juego',
    uvod: 'Hemos añadido la liga que pediste. Jugadores, precios y calendario están listos.',
    liga: 'Liga', prviRok: 'Primer cierre', gumb: 'Haz tu equipo',
    opomba: 'Este es el único correo sobre tu petición.',
    zakaj: 'Recibes este correo porque pediste esta liga en slff.eu.',
  },
  lv: {
    zadeva: (i) => `${i} tagad ir SLFF`,
    predglava: 'Tu to vēlējies, tagad tā ir klāt. Sastādi komandu pirms pirmā termiņa.',
    naslov: 'Tava līga ir spēlē',
    uvod: 'Mēs pievienojām līgu, ko vēlējies. Spēlētāji, cenas un kalendārs ir gatavi.',
    liga: 'Līga', prviRok: 'Pirmais termiņš', gumb: 'Sastādīt komandu',
    opomba: 'Šī ir vienīgā vēstule par tavu vēlmi.',
    zakaj: 'Šo vēstuli saņēmi, jo slff.eu vēlējies šo līgu.',
  },
  mk: {
    zadeva: (i) => `${i} сега е во SLFF`,
    predglava: 'Ја посака, сега е тука. Состави тим пред првиот рок.',
    naslov: 'Твојата лига е во игра',
    uvod: 'Ја додадовме лигата што ја посака. Играчите, цените и распоредот се подготвени.',
    liga: 'Лига', prviRok: 'Прв рок', gumb: 'Состави тим',
    opomba: 'Ова е единствената порака за твојата желба.',
    zakaj: 'Ја доби оваа порака затоа што ја посака оваа лига на slff.eu.',
  },
  el: {
    zadeva: (i) => `Νέο στο SLFF: ${i}`,
    predglava: 'Το ζήτησες και τώρα είναι εδώ. Φτιάξε ομάδα πριν από την πρώτη προθεσμία.',
    naslov: 'Το πρωτάθλημά σου είναι σε εξέλιξη',
    uvod: 'Προσθέσαμε το πρωτάθλημα που ζήτησες. Παίκτες, τιμές και πρόγραμμα είναι έτοιμα.',
    liga: 'Πρωτάθλημα', prviRok: 'Πρώτη προθεσμία', gumb: 'Φτιάξε ομάδα',
    opomba: 'Αυτό είναι το μοναδικό μήνυμα για το αίτημά σου.',
    zakaj: 'Λαμβάνεις αυτό το μήνυμα επειδή ζήτησες αυτό το πρωτάθλημα στο slff.eu.',
  },
  tr: {
    zadeva: (i) => `${i} artık SLFF’de`,
    predglava: 'İstemiştin, artık burada. İlk son tarihten önce takımını kur.',
    naslov: 'Ligin oyunda',
    uvod: 'İstediğin ligi ekledik. Oyuncular, fiyatlar ve fikstür hazır.',
    liga: 'Lig', prviRok: 'İlk son tarih', gumb: 'Takımını kur',
    opomba: 'İsteğinle ilgili göndereceğimiz tek e-posta bu.',
    zakaj: 'Bu e-postayı slff.eu’da bu ligi istediğin için aldın.',
  },
  uk: {
    zadeva: (i) => `${i} тепер у SLFF`,
    predglava: 'Ти хотів її, і тепер вона тут. Збери команду до першого дедлайну.',
    naslov: 'Твоя ліга в грі',
    uvod: 'Ми додали лігу, яку ти хотів. Гравці, ціни та календар готові.',
    liga: 'Ліга', prviRok: 'Перший дедлайн', gumb: 'Зібрати команду',
    opomba: 'Це єдиний лист щодо твого побажання.',
    zakaj: 'Ти отримав цей лист, бо хотів цю лігу на slff.eu.',
  },
  hy: {
    zadeva: (i) => `Նոր SLFF-ում՝ ${i}`,
    predglava: 'Դու ցանկացել էիր այն, և այժմ այն այստեղ է։ Կազմիր թիմ մինչև առաջին վերջնաժամկետը։',
    naslov: 'Քո լիգան խաղի մեջ է',
    uvod: 'Ավելացրել ենք այն լիգան, որը ցանկացել էիր։ Խաղացողները, գներն ու ժամանակացույցը պատրաստ են։',
    liga: 'Լիգա', prviRok: 'Առաջին վերջնաժամկետ', gumb: 'Կազմիր թիմ',
    opomba: 'Սա քո խնդրանքի վերաբերյալ միակ նամակն է։',
    zakaj: 'Այս նամակը ստացել ես, քանի որ slff.eu-ում ցանկացել էիր այս լիգան։',
  },
  az: {
    zadeva: (i) => `${i} artıq SLFF-dədir`,
    predglava: 'Bunu istəmişdin, indi buradadır. İlk son tarixdən əvvəl komanda yığ.',
    naslov: 'Liqan oyundadır',
    uvod: 'İstədiyin liqanı əlavə etdik. Oyunçular, qiymətlər və təqvim hazırdır.',
    liga: 'Liqa', prviRok: 'İlk son tarix', gumb: 'Komanda yığ',
    opomba: 'Bu, istəyinlə bağlı yeganə məktubdur.',
    zakaj: 'Bu məktubu slff.eu-da bu liqanı istədiyin üçün aldın.',
  },
  da: {
    zadeva: (i) => `${i} er nu på SLFF`,
    predglava: 'Du ønskede dig den, nu er den her. Sæt dit hold før første deadline.',
    naslov: 'Din liga er i gang',
    uvod: 'Vi har tilføjet den liga, du ønskede dig. Spillere, priser og kampprogram er klar.',
    liga: 'Liga', prviRok: 'Første deadline', gumb: 'Sæt dit hold',
    opomba: 'Dette er den eneste mail om dit ønske.',
    zakaj: 'Du får denne mail, fordi du ønskede dig denne liga på slff.eu.',
  },
  en: {
    zadeva: (i) => `${i} is now on SLFF`,
    predglava: 'You asked for it, now it’s here. Build your team before the first deadline.',
    naslov: 'Your league is live',
    uvod: 'We’ve added the league you asked for. Players, prices and fixtures are ready.',
    liga: 'League', prviRok: 'First deadline', gumb: 'Build my team',
    opomba: 'This is the only email about your request.',
    zakaj: 'You got this email because you asked for this league on slff.eu.',
  },
}

export function sestaviLigaZivi(
  jezik: string | null | undefined,
  meta: { display_name: string | null; liga: Liga; rok?: string | null },
): Sporocilo {
  const { liga } = meta
  const j: Jezik = jeJezik(jezik) ? jezik : jezikLige(liga)
  const vstop = `${SITE}/my-team?sestavi=1&t=${encodeURIComponent(liga.slug)}`
  const B = LIGA_ZIVI[j]
  const ime = liga.ime || liga.oznaka
  const dejstva: Vrstica[] = [{ k: B.liga, v: esc(ime) }]
  if (meta.rok) dejstva.push({ k: B.prviRok, v: esc(rokVJeziku(meta.rok, liga, j)) })
  return sestavi(j, {
    zadeva: B.zadeva(ime.replaceAll(' — ', ', ')),
    predglava: B.predglava,
    oznaka: liga.oznaka,
    naslov: B.naslov,
    uvod: `${pozdrav(j, meta.display_name)} ${B.uvod}`,
    dejstva,
    gumb: { label: B.gumb, url: vstop },
    opomba: B.opomba,
    zakaj: B.zakaj,
  })
}

// --- opozorilo: ekipa se ob roku ne bo zaklenila ----------------------------
// Rumeni okvir: razlog (preveden) in rok; vrstica brez podatka izpade.

interface BesedilaOpozorila {
  /** Zadeva (za "SLFF <liga>: "); `ime` je surovo ime ekipe ali null. */
  zadeva: string
  /** Naslov v kartici. */
  naslov: string
  /** Kratek povzetek za predglavo. */
  kratko: string
  /** Uvod; `ekipa` je že ubežan HTML. */
  uvod: (ekipa: string) => string
  razlog: string
  popraviDo: string
  gumb: string
  opomba: string
  zakaj: (ozn: string) => string
}

function besedilaOpozorila(j: Jezik, n: number | null | undefined, ime: string | null): BesedilaOpozorila {
  switch (j) {
    case 'sk': {
      const kolo = n ? `${n}. kolo` : 'ďalšie kolo'
      return {
        zadeva: `tvoj tím nezíska body za ${kolo}`,
        naslov: `Tím nezíska body za ${kolo}`,
        kratko: 'Tím nespĺňa pravidlá.',
        uvod: (e) => `Tím ${e} nespĺňa pravidlá, preto sa pre ${kolo} neuzamkne a nezíska v ňom body. Oprav ho a body sú znova tvoje.`,
        razlog: 'Dôvod', popraviDo: 'Oprav do', gumb: 'Oprav tím',
        opomba: 'Inak sa tím prenáša z kola do kola sám a nemusíš robiť nič. Píšeme ti len vtedy, keď sa to nedá.',
        zakaj: (o) => `Upozornenie dostávaš, lebo máš tím v lige ${o}.`,
      }
    }
    case 'hr': {
      const kolo = n ? `${n}. kolo` : 'sljedeće kolo'
      return {
        zadeva: `tvoja momčad neće dobiti bodove za ${kolo}`,
        naslov: `Momčad neće dobiti bodove za ${kolo}`,
        kratko: 'Momčad ne ispunjava pravila.',
        uvod: (e) => `Momčad ${e} ne ispunjava pravila, zato se za ${kolo} neće zaključati i u njemu neće dobiti bodove. Popravi je i bodovi su opet tvoji.`,
        razlog: 'Razlog', popraviDo: 'Popravi do', gumb: 'Popravi momčad',
        opomba: 'Inače se momčad sama prenosi iz kola u kolo i ne moraš ništa raditi. Pišemo ti samo kad to nije moguće.',
        zakaj: (o) => `Upozorenje dobivaš jer imaš momčad u ligi ${o}.`,
      }
    }
    case 'cs': {
      const kolo = n ? `${n}. kolo` : 'další kolo'
      return {
        zadeva: `tvůj tým nezíská body za ${kolo}`,
        naslov: `Tým nezíská body za ${kolo}`,
        kratko: 'Tým nesplňuje pravidla.',
        uvod: (e) => `Tým ${e} nesplňuje pravidla, proto se pro ${kolo} neuzamkne a nezíská v něm body. Oprav ho a body jsou zase tvoje.`,
        razlog: 'Důvod', popraviDo: 'Oprav do', gumb: 'Oprav tým',
        opomba: 'Jinak se tým přenáší z kola do kola sám a nemusíš dělat nic. Píšeme ti jen tehdy, když to nejde.',
        zakaj: (o) => `Upozornění dostáváš, protože máš tým v lize ${o}.`,
      }
    }
    case 'hu': {
      const kolo = n ? `${n}. forduló` : 'következő forduló'
      return {
        zadeva: `${kolo}: a csapatod nem szerez pontot`,
        naslov: `A csapatod nem szerez pontot (${kolo})`,
        kratko: 'A csapatod nem felel meg a szabályoknak.',
        uvod: (e) => `A csapatod (${e}) nem felel meg a szabályoknak, ezért nem zárul le erre a fordulóra (${kolo}), és nem szerez benne pontot. Javítsd ki, és a pontok újra a tieid.`,
        razlog: 'Ok', popraviDo: 'Javítsd eddig', gumb: 'Csapat javítása',
        opomba: 'Egyébként a csapatod magától átkerül fordulóról fordulóra, és semmit sem kell tenned. Csak akkor írunk, ha ez nem lehetséges.',
        zakaj: (o) => `A figyelmeztetést azért kapod, mert van csapatod ebben a bajnokságban: ${o}.`,
      }
    }
    case 'de': {
      const runde = n ? `Runde ${n}` : 'die nächste Runde'
      return {
        zadeva: `dein Team holt keine Punkte für ${runde}`,
        naslov: `Dein Team holt keine Punkte für ${runde}`,
        kratko: 'Dein Team entspricht nicht den Regeln.',
        uvod: (e) => `Dein Team ${e} entspricht nicht den Regeln, deshalb wird es für ${runde} nicht gesperrt und holt darin keine Punkte. Korrigier es und die Punkte gehören wieder dir.`,
        razlog: 'Grund', popraviDo: 'Korrigieren bis', gumb: 'Team korrigieren',
        opomba: 'Sonst wird dein Team von Runde zu Runde automatisch übernommen und du musst nichts tun. Wir schreiben dir nur, wenn das nicht geht.',
        zakaj: (o) => `Du bekommst diese Warnung, weil du ein Team in dieser Liga hast: ${o}.`,
      }
    }
    case 'sr': {
      const kolo = n ? `${n}. kolo` : 'sledeće kolo'
      return {
        zadeva: `tvoj tim neće osvojiti bodove za ${kolo}`,
        naslov: `Tim neće osvojiti bodove za ${kolo}`,
        kratko: 'Tim ne ispunjava pravila.',
        uvod: (e) => `Tim ${e} ne ispunjava pravila, zato se za ${kolo} neće zaključati i u njemu neće osvojiti bodove. Popravi ga i bodovi su opet tvoji.`,
        razlog: 'Razlog', popraviDo: 'Popravi do', gumb: 'Popravi tim',
        opomba: 'Inače se tim sam prenosi iz kola u kolo i ne moraš ništa da radiš. Pišemo ti samo kad to nije moguće.',
        zakaj: (o) => `Upozorenje dobijaš jer imaš tim u ligi ${o}.`,
      }
    }
    case 'ro': {
      const etapa = n ? `etapa ${n}` : 'etapa următoare'
      return {
        zadeva: `echipa ta nu primește puncte pentru ${etapa}`,
        naslov: `Echipa nu primește puncte pentru ${etapa}`,
        kratko: 'Echipa nu respectă regulile.',
        uvod: (e) => `Echipa ${e} nu respectă regulile, așa că nu se blochează pentru ${etapa} și nu primește puncte în ea. Corecteaz-o și punctele sunt din nou ale tale.`,
        razlog: 'Motiv', popraviDo: 'Corectează până la', gumb: 'Corectează echipa',
        opomba: 'Altfel echipa trece singură de la o etapă la alta și nu trebuie să faci nimic. Îți scriem doar când asta nu e posibil.',
        zakaj: (o) => `Primești acest avertisment pentru că ai o echipă în liga ${o}.`,
      }
    }
    case 'et': {
      const voorus = n ? `${n}. voorus` : 'järgmises voorus'
      return {
        zadeva: `sinu meeskond ei saa ${voorus} punkte`,
        naslov: `Meeskond ei saa ${voorus} punkte`,
        kratko: 'Meeskond ei vasta reeglitele.',
        uvod: (e) => `Meeskond ${e} ei vasta reeglitele, seega see ei lukustu ja ei saa ${voorus} punkte. Paranda see ja punktid on jälle sinu.`,
        razlog: 'Põhjus', popraviDo: 'Paranda kuni', gumb: 'Paranda meeskond',
        opomba: 'Muidu kandub meeskond voorust vooru ise edasi ja sa ei pea midagi tegema. Kirjutame sulle ainult siis, kui see pole võimalik.',
        zakaj: (o) => `Saad hoiatuse, sest sul on meeskond liigas (liiga: ${o}).`,
      }
    }
    case 'pl': {
      const kolejka = n ? `w ${n}. kolejce` : 'w następnej kolejce'
      return {
        zadeva: `twoja drużyna nie zdobędzie punktów ${kolejka}`,
        naslov: `Drużyna nie zdobędzie punktów ${kolejka}`,
        kratko: 'Drużyna nie spełnia zasad.',
        uvod: (e) => `Drużyna ${e} nie spełnia zasad, więc nie zostanie zatwierdzona i nie zdobędzie punktów ${kolejka}. Popraw ją, a punkty znów będą twoje.`,
        razlog: 'Powód', popraviDo: 'Popraw do', gumb: 'Popraw drużynę',
        opomba: 'Normalnie drużyna sama przechodzi z kolejki do kolejki i nie musisz nic robić. Piszemy tylko wtedy, gdy to nie jest możliwe.',
        zakaj: (o) => `Dostajesz to ostrzeżenie, bo masz drużynę w lidze ${o}.`,
      }
    }
    case 'es': {
      const jornada = n ? `en la jornada ${n}` : 'en la próxima jornada'
      return {
        zadeva: `tu equipo no sumará puntos ${jornada}`,
        naslov: `Tu equipo no sumará puntos ${jornada}`,
        kratko: 'El equipo no cumple las reglas.',
        uvod: (e) => `El equipo ${e} no cumple las reglas, así que no quedará cerrado y no sumará puntos ${jornada}. Corrígelo y los puntos vuelven a ser tuyos.`,
        razlog: 'Motivo', popraviDo: 'Corrige hasta', gumb: 'Corregir el equipo',
        opomba: 'Normalmente el equipo pasa solo de una jornada a otra y no tienes que hacer nada. Solo te escribimos cuando eso no es posible.',
        zakaj: (o) => `Recibes este aviso porque tienes un equipo en la liga ${o}.`,
      }
    }
    case 'lv': {
      const karta = n ? `${n}. kārtā` : 'nākamajā kārtā'
      return {
        zadeva: `tava komanda ${karta} nesaņems punktus`,
        naslov: `Komanda ${karta} nesaņems punktus`,
        kratko: 'Komanda neatbilst noteikumiem.',
        uvod: (e) => `Komanda ${e} neatbilst noteikumiem, tāpēc tā netiks apstiprināta un ${karta} nesaņems punktus. Izlabo to, un punkti atkal būs tavi.`,
        razlog: 'Iemesls', popraviDo: 'Izlabo līdz', gumb: 'Labot komandu',
        opomba: 'Parasti komanda pati pāriet no kārtas uz kārtu, un tev nekas nav jādara. Rakstām tikai tad, ja tas nav iespējams.',
        zakaj: (o) => `Brīdinājumu saņem, jo tev ir komanda (līga: ${o}).`,
      }
    }
    case 'mk': {
      const kolo = n ? `${n}. коло` : 'следното коло'
      return {
        zadeva: `твојот тим нема да освои поени за ${kolo}`,
        naslov: `Тимот нема да освои поени за ${kolo}`,
        kratko: 'Тимот не ги исполнува правилата.',
        uvod: (e) => `Тимот ${e} не ги исполнува правилата, затоа за ${kolo} нема да се заклучи и во него нема да освои поени. Поправи го и поените се повторно твои.`,
        razlog: 'Причина', popraviDo: 'Поправи до', gumb: 'Поправи го тимот',
        opomba: 'Инаку тимот сам се пренесува од коло во коло и не мора ништо да правиш. Ти пишуваме само кога тоа не е можно.',
        zakaj: (o) => `Предупредувањето го добиваш затоа што имаш тим (лига: ${o}).`,
      }
    }
    case 'el': {
      const agon = n ? `την ${n}η αγωνιστική` : 'την επόμενη αγωνιστική'
      return {
        zadeva: `η ομάδα σου δεν θα πάρει πόντους για ${agon}`,
        naslov: `Η ομάδα σου δεν θα πάρει πόντους για ${agon}`,
        kratko: 'Η ομάδα δεν τηρεί τους κανόνες.',
        uvod: (e) => `Η ομάδα ${e} δεν τηρεί τους κανόνες, γι’ αυτό δεν θα κλειδώσει για ${agon} και δεν θα πάρει πόντους σε αυτήν. Διόρθωσέ την και οι πόντοι είναι ξανά δικοί σου.`,
        razlog: 'Λόγος', popraviDo: 'Διόρθωσε έως', gumb: 'Διόρθωσε την ομάδα',
        opomba: 'Κανονικά η ομάδα περνά μόνη της από αγωνιστική σε αγωνιστική και δεν χρειάζεται να κάνεις τίποτα. Σου γράφουμε μόνο όταν αυτό δεν είναι δυνατό.',
        zakaj: (o) => `Λαμβάνεις την ειδοποίηση επειδή έχεις ομάδα (πρωτάθλημα: ${o}).`,
      }
    }
    case 'tr': {
      const hafta = n ? `${n}. hafta` : 'gelecek hafta'
      return {
        zadeva: `takımın ${hafta} için puan alamayacak`,
        naslov: `Takımın ${hafta} için puan alamayacak`,
        kratko: 'Takımın kurallara uymuyor.',
        uvod: (e) => `${e} takımın kurallara uymuyor. Bu yüzden ${hafta} için kilitlenmeyecek ve o hafta puan alamayacak. Düzelt, puanlar yine senin olsun.`,
        razlog: 'Neden', popraviDo: 'Son düzeltme', gumb: 'Takımını düzelt',
        opomba: 'Normalde takımın haftadan haftaya kendiliğinden aktarılır, senin bir şey yapman gerekmez. Sana sadece bu mümkün olmadığında yazıyoruz.',
        zakaj: (o) => `Bu uyarıyı bir takımın olduğu için alıyorsun (lig: ${o}).`,
      }
    }
    case 'uk': {
      const tur = n ? `${n}-й тур` : 'наступний тур'
      const uTuri = n ? `у ${n}-му турі` : 'у наступному турі'
      return {
        zadeva: `твоя команда не набере очок ${uTuri}`,
        naslov: `Команда не набере очок ${uTuri}`,
        kratko: 'Команда не відповідає правилам.',
        uvod: (e) => `Команда ${e} не відповідає правилам, тому на ${tur} вона не закриється і ${uTuri} не набере очок. Виправ її, і очки знову твої.`,
        razlog: 'Причина', popraviDo: 'Виправ до', gumb: 'Виправити команду',
        opomba: 'Зазвичай команда сама переходить з туру в тур, і тобі нічого не потрібно робити. Ми пишемо лише тоді, коли це неможливо.',
        zakaj: (o) => `Ти отримуєш попередження, бо маєш команду (ліга: ${o}).`,
      }
    }
    case 'hy': {
      // Dve obliki, ker se sklon lepi na "տուր": "տուր 5-ի համար" / "հաջորդ տուրի համար".
      const zaTur = n ? `տուր ${n}-ի համար` : 'հաջորդ տուրի համար'
      const vTuru = n ? `տուր ${n}-ում` : 'հաջորդ տուրում'
      return {
        zadeva: `քո թիմը միավորներ չի վաստակի ${vTuru}`,
        naslov: `Թիմդ միավորներ չի վաստակի ${vTuru}`,
        kratko: 'Թիմը չի համապատասխանում կանոններին։',
        uvod: (e) => `${e} թիմը չի համապատասխանում կանոններին, ուստի ${zaTur} այն չի փակվի և ${vTuru} միավորներ չի վաստակի։ Ուղղիր այն, և միավորները կրկին քոնն են։`,
        razlog: 'Պատճառ', popraviDo: 'Ուղղիր մինչև', gumb: 'Ուղղիր թիմը',
        opomba: 'Սովորաբար թիմն ինքնաբերաբար անցնում է տուրից տուր, և ոչինչ անել պետք չէ։ Գրում ենք միայն այն դեպքում, երբ դա հնարավոր չէ։',
        zakaj: (o) => `Զգուշացումը ստանում ես, քանի որ թիմ ունես (լիգա՝ ${o})։`,
      }
    }
    case 'az': {
      const tur = n ? `tur ${n}` : 'növbəti tur'
      return {
        zadeva: `komandan ${tur} üçün xal toplamayacaq`,
        naslov: `Komandan ${tur} üçün xal toplamayacaq`,
        kratko: 'Komanda qaydalara uyğun deyil.',
        uvod: (e) => `${e} komandası qaydalara uyğun deyil, ona görə ${tur} üçün bağlanmayacaq və həmin turda xal toplamayacaq. Düzəlt, xallar yenə sənin olsun.`,
        razlog: 'Səbəb', popraviDo: 'Düzəltmə vaxtı', gumb: 'Komandanı düzəlt',
        opomba: 'Adətən komanda turdan tura özü keçir və heç nə etməli deyilsən. Yalnız bu mümkün olmayanda yazırıq.',
        zakaj: (o) => `Bu xəbərdarlığı komandan olduğu üçün alırsan (liqa: ${o}).`,
      }
    }
    case 'da': {
      const runde = n ? `${n}. runde` : 'næste runde'
      return {
        zadeva: `dit hold får ingen point i ${runde}`,
        naslov: `Dit hold får ingen point i ${runde}`,
        kratko: 'Holdet overholder ikke reglerne.',
        uvod: (e) => `Holdet ${e} overholder ikke reglerne, så det bliver ikke låst til ${runde} og får ingen point i den. Ret det, så er pointene dine igen.`,
        razlog: 'Årsag', popraviDo: 'Ret senest', gumb: 'Ret holdet',
        opomba: 'Ellers går holdet selv videre fra runde til runde, og du behøver ikke gøre noget. Vi skriver kun, når det ikke er muligt.',
        zakaj: (o) => `Du får advarslen, fordi du har et hold (liga: ${o}).`,
      }
    }
    case 'en': {
      const krog = n ? `round ${n}` : 'the next round'
      return {
        zadeva: `your team won’t score points in ${krog}`,
        naslov: `Your team won’t score points in ${krog}`,
        kratko: 'Your team doesn’t meet the rules.',
        uvod: (e) => `Your team ${e} doesn’t meet the rules, so it won’t be locked for ${krog} and won’t score points in it. Fix it and the points are yours again.`,
        razlog: 'Reason', popraviDo: 'Fix by', gumb: 'Fix my team',
        opomba: 'Normally your team carries over from round to round on its own and you don’t need to do anything. We only write when that isn’t possible.',
        zakaj: (o) => `You get this warning because you have a team in ${o}.`,
      }
    }
    default: {
      const krog = n ? `${n}. krogu` : 'naslednjem krogu'
      return {
        zadeva: `${ime ?? 'tvoja ekipa'} ne bo dobila točk v ${krog}`,
        naslov: `Ekipa ne bo dobila točk v ${krog}`,
        kratko: 'Ekipa ne izpolnjuje pravil.',
        uvod: (e) => `Ekipa ${e} ne izpolnjuje pravil, zato se ob roku ne bo zaklenila. Popravi jo in točke so spet tvoje.`,
        razlog: 'Razlog', popraviDo: 'Popravi do', gumb: 'Popravi ekipo',
        opomba: 'Sicer se ekipa prenaša iz kroga v krog sama. Pišemo ti le, ko se ne more.',
        zakaj: (o) => `Opozorilo dobiš, ker imaš ekipo v ligi ${o}.`,
      }
    }
  }
}

export function sestaviOpozorilo(
  liga: Liga,
  u: {
    display_name: string | null
    team_name?: string | null
    round_number?: number | null
    deadline_at?: string | null
    razlog?: string | null
  },
): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const ime = u.team_name?.trim() || null
  const B = besedilaOpozorila(j, u.round_number, ime)
  const kdaj = u.deadline_at ? izpisRoka(u.deadline_at, liga) : null
  const opozorilo: Vrstica[] = []
  if (u.razlog) opozorilo.push({ k: B.razlog, v: esc(prevediRazlog(u.razlog, j)) })
  if (kdaj) opozorilo.push({ k: B.popraviDo, v: esc(kdaj) })
  return sestavi(j, {
    zadeva: `SLFF ${liga.oznaka}: ${B.zadeva}`,
    predglava: kdaj ? `${B.popraviDo}: ${kdaj}. ${B.kratko}` : B.kratko,
    oznaka: liga.oznaka,
    naslov: B.naslov,
    uvod: `${pozdrav(j, u.display_name)} ${B.uvod(`<strong>${esc(ime ?? '')}</strong>`)}`,
    opozorilo,
    gumb: { label: B.gumb, url: p.ekipa },
    opomba: B.opomba,
    zakaj: B.zakaj(liga.oznaka),
  }, p.odjava)
}

// --- odobren poznavalec -----------------------------------------------------
// Enkratno obvestilo, zato brez odjave. Na Slovaškem pozicij ne izbira
// skupnost (prinese jih zapisnik), zato slovaški poznavalec dela samo z
// asistencami (gumb in koraki le za Asistence).

interface BesedilaPoznavalca {
  /** Zadeva; `k` in `l` sta surova (klub, liga). */
  zKlub: (k: string) => string
  zLiga: (l: string) => string
  /** Predglava; surova imena. */
  pKlub: (k: string) => string
  pLiga: (l: string) => string
  naslov: string
  hvala: string
  /** `k` in `l` sta že ubežana. */
  kajKlub: (k: string, l: string) => string
  kajLiga: (l: string) => string
  /** Imena strani (za povezave) in koraki; `a` je HTML povezave. */
  pozicije: string
  asistence: string
  korakPozicije: (a: string) => string
  korakAsistence: (a: string) => string
  neIgra: string
  prosnjaK: string
  prosnja: string
  gumb: string
  vprasanja: string
  zakaj: string
}

const POZNAVALEC: Record<Jezik, BesedilaPoznavalca> = {
  sl: {
    zKlub: (k) => `Zdaj si poznavalec kluba ${k}`,
    zLiga: (l) => `Zdaj si poznavalec lige ${l}`,
    pKlub: (k) => `Tvoj glas za igralce kluba ${k} šteje trojno. Tako začneš.`,
    pLiga: (l) => `Tvoj glas v ligi ${l} sam potrdi pozicijo ali asistenco. Tako začneš.`,
    naslov: 'Dobrodošel/a med poznavalce',
    hvala: 'Odobrili smo tvojo prošnjo.',
    kajKlub: (k, l) => `Od zdaj si <strong>poznavalec kluba ${k}</strong> v ligi ${l}: tvoj glas za igralce tega kluba šteje trojno. Hvala, da si se ponudil/a.`,
    kajLiga: (l) => `Od zdaj si <strong>poznavalec lige ${l}</strong>: tvoj glas sam potrdi pozicijo igralca ali asistenco, drugih glasov ni treba čakati. Hvala, da si se ponudil/a.`,
    pozicije: 'Pozicije', asistence: 'Asistence',
    korakPozicije: (a) => `${a}: uveljavijo se vsak ponedeljek zjutraj.`,
    korakAsistence: (a) => `${a}: veljajo takoj.`,
    neIgra: 'Igralca, ki pri klubu ne igra več, označi z "ne igra več".',
    prosnjaK: 'Prošnja',
    prosnja: 'Vnašaj le, kar zares veš, in ne prilagajaj podatkov svoji ekipi. Od tega so odvisne točke vseh v ligi; ob namerno napačnih podatkih poznavalca izgubiš.',
    gumb: 'Odpri Pozicije',
    vprasanja: 'Če kaj ni jasno, odgovori na ta mail.',
    zakaj: 'Ta mail si dobil/a, ker si na slff.eu oddal/a prošnjo za poznavalca.',
  },
  sk: {
    zKlub: (k) => `Teraz si znalcom klubu ${k}`,
    zLiga: (l) => `Teraz si znalcom ligy ${l}`,
    pKlub: (k) => `Tvoj hlas za hráčov klubu ${k} má trojnásobnú váhu. Takto začneš.`,
    pLiga: (l) => `Tvoj hlas v lige ${l} sám potvrdí asistenciu. Takto začneš.`,
    naslov: 'Vitaj medzi znalcami',
    hvala: 'Schválili sme tvoju žiadosť.',
    kajKlub: (k, l) => `Odteraz si <strong>znalcom klubu ${k}</strong> v lige ${l}: tvoj hlas za hráčov tohto klubu má trojnásobnú váhu. Ďakujeme, že si sa ponúkol.`,
    kajLiga: (l) => `Odteraz si <strong>znalcom ligy ${l}</strong>: tvoj hlas sám potvrdí asistenciu, na ďalšie hlasy netreba čakať. Ďakujeme, že si sa ponúkol.`,
    pozicije: 'Pozície', asistence: 'Asistencie',
    korakPozicije: (a) => `${a}: platia každý pondelok ráno.`,
    korakAsistence: (a) => `${a}: platia hneď.`,
    neIgra: 'Hráča, ktorý už za klub nehrá, označ ako "už nehrá".',
    prosnjaK: 'Prosba',
    prosnja: 'Zadávaj len to, čo naozaj vieš, a neprispôsobuj údaje svojmu fantasy tímu. Závisia od toho body všetkých v lige; ak sú údaje úmyselne nesprávne, status znalca stratíš.',
    gumb: 'Otvoriť Asistencie',
    vprasanja: 'Ak ti niečo nie je jasné, odpovedz na tento e-mail.',
    zakaj: 'Tento e-mail ti prišiel, lebo si na slff.eu požiadal o status znalca.',
  },
  hr: {
    zKlub: (k) => `Sada si poznavatelj kluba ${k}`,
    zLiga: (l) => `Sada si poznavatelj lige ${l}`,
    pKlub: (k) => `Tvoj glas za igrače kluba ${k} vrijedi trostruko. Evo kako početi.`,
    pLiga: (l) => `Tvoj glas u ligi ${l} sam potvrđuje poziciju ili asistenciju. Evo kako početi.`,
    naslov: 'Dobro došao/la među poznavatelje',
    hvala: 'Odobrili smo tvoj zahtjev.',
    kajKlub: (k, l) => `Od sada si <strong>poznavatelj kluba ${k}</strong> u ligi ${l}: tvoj glas za igrače tog kluba vrijedi trostruko. Hvala što si se ponudio.`,
    kajLiga: (l) => `Od sada si <strong>poznavatelj lige ${l}</strong>: tvoj glas sam potvrđuje poziciju igrača ili asistenciju, ne treba čekati druge glasove. Hvala što si se ponudio.`,
    pozicije: 'Pozicije', asistence: 'Asistencije',
    korakPozicije: (a) => `${a}: primjenjuju se svakog ponedjeljka ujutro.`,
    korakAsistence: (a) => `${a}: vrijede odmah.`,
    neIgra: 'Igrača koji više ne igra za klub označi s "više ne igra".',
    prosnjaK: 'Molba',
    prosnja: 'Unosi samo ono što stvarno znaš i ne prilagođavaj podatke svojoj fantasy momčadi. O tome ovise bodovi svih u ligi; ako su podaci namjerno netočni, gubiš status poznavatelja.',
    gumb: 'Otvori Pozicije',
    vprasanja: 'Ako ti nešto nije jasno, odgovori na ovaj e-mail.',
    zakaj: 'Ovaj e-mail dobivaš jer si na slff.eu poslao/la zahtjev za poznavatelja.',
  },
  cs: {
    zKlub: (k) => `Teď jsi znalcem klubu ${k}`,
    zLiga: (l) => `Teď jsi znalcem ligy ${l}`,
    pKlub: (k) => `Tvůj hlas pro hráče klubu ${k} má trojnásobnou váhu. Takhle začneš.`,
    pLiga: (l) => `Tvůj hlas v lize ${l} sám potvrdí pozici nebo asistenci. Takhle začneš.`,
    naslov: 'Vítej mezi znalci',
    hvala: 'Schválili jsme tvou žádost.',
    kajKlub: (k, l) => `Od teď jsi <strong>znalcem klubu ${k}</strong> v lize ${l}: tvůj hlas pro hráče tohoto klubu má trojnásobnou váhu. Děkujeme, že ses nabídl.`,
    kajLiga: (l) => `Od teď jsi <strong>znalcem ligy ${l}</strong>: tvůj hlas sám potvrdí pozici hráče nebo asistenci, na další hlasy není třeba čekat. Děkujeme, že ses nabídl.`,
    pozicije: 'Pozice', asistence: 'Asistence',
    korakPozicije: (a) => `${a}: platí vždy v pondělí ráno.`,
    korakAsistence: (a) => `${a}: platí hned.`,
    neIgra: 'Hráče, který už za klub nehraje, označ jako "už nehraje".',
    prosnjaK: 'Prosba',
    prosnja: 'Zadávej jen to, co opravdu víš, a nepřizpůsobuj údaje svému fantasy týmu. Závisí na tom body všech v lize; pokud jsou údaje úmyslně nesprávné, status znalce ztratíš.',
    gumb: 'Otevřít Pozice',
    vprasanja: 'Pokud ti něco není jasné, odpověz na tento e-mail.',
    zakaj: 'Tento e-mail ti přišel, protože jsi na slff.eu požádal o status znalce.',
  },
  hu: {
    zKlub: (k) => `Mostantól ${k} klub szakértője vagy`,
    zLiga: (l) => `Mostantól szakértő vagy ebben a bajnokságban: ${l}`,
    pKlub: (k) => `A(z) ${k} játékosaira leadott szavazatod háromszorosan számít. Így kezdj neki.`,
    pLiga: (l) => `A szavazatod egymagában megerősíti a posztot vagy a gólpasszt (${l}). Így kezdj neki.`,
    naslov: 'Üdv a szakértők között',
    hvala: 'Jóváhagytuk a kérelmedet.',
    kajKlub: (k, l) => `Mostantól <strong>${k} klub szakértője vagy</strong> ebben a bajnokságban: ${l}. A klub játékosaira leadott szavazatod háromszoros súllyal számít. Köszönjük, hogy jelentkeztél.`,
    kajLiga: (l) => `Mostantól <strong>szakértő vagy ebben a bajnokságban: ${l}</strong>. A szavazatod egymagában megerősíti a játékos posztját vagy a gólpasszt, nem kell más szavazatokra várni. Köszönjük, hogy jelentkeztél.`,
    pozicije: 'Posztok', asistence: 'Gólpasszok',
    korakPozicije: (a) => `${a}: minden hétfő reggel lépnek érvénybe.`,
    korakAsistence: (a) => `${a}: azonnal érvényesek.`,
    neIgra: 'Azt a játékost, aki már nem játszik a klubban, jelöld meg "már nem játszik" jelöléssel.',
    prosnjaK: 'Kérés',
    prosnja: 'Csak azt rögzítsd, amit biztosan tudsz, és ne a saját fantasy csapatodhoz igazítsd az adatokat. Ezen múlik mindenki pontszáma a bajnokságban; szándékosan hibás adatok esetén elveszíted a szakértői státuszt.',
    gumb: 'Posztok megnyitása',
    vprasanja: 'Ha valami nem világos, válaszolj erre az e-mailre.',
    zakaj: 'Ezt az e-mailt azért kaptad, mert az slff.eu-n szakértői kérelmet adtál le.',
  },
  de: {
    zKlub: (k) => `Du bist jetzt Kenner des Klubs ${k}`,
    zLiga: (l) => `Du bist jetzt Kenner der Liga ${l}`,
    pKlub: (k) => `Deine Stimme für Spieler von ${k} zählt dreifach. So legst du los.`,
    pLiga: (l) => `Deine Stimme allein bestätigt Positionen und Torvorlagen (${l}). So legst du los.`,
    naslov: 'Willkommen bei den Kennern',
    hvala: 'Wir haben deine Anfrage bestätigt.',
    kajKlub: (k, l) => `Ab jetzt bist du <strong>Kenner des Klubs ${k}</strong> in der Liga ${l}: deine Stimme für Spieler dieses Klubs zählt dreifach. Danke, dass du dich gemeldet hast.`,
    kajLiga: (l) => `Ab jetzt bist du <strong>Kenner der Liga ${l}</strong>: deine Stimme allein bestätigt die Position eines Spielers oder eine Torvorlage, auf weitere Stimmen musst du nicht warten. Danke, dass du dich gemeldet hast.`,
    pozicije: 'Positionen', asistence: 'Torvorlagen',
    korakPozicije: (a) => `${a}: gelten jeden Montag in der Früh.`,
    korakAsistence: (a) => `${a}: gelten sofort.`,
    neIgra: 'Einen Spieler, der nicht mehr für den Klub spielt, markierst du mit "spielt nicht mehr".',
    prosnjaK: 'Bitte',
    prosnja: 'Trag nur ein, was du wirklich weißt, und pass die Daten nicht an dein Fantasy-Team an. Davon hängen die Punkte aller in der Liga ab; bei absichtlich falschen Angaben verlierst du den Kenner-Status.',
    gumb: 'Positionen öffnen',
    vprasanja: 'Wenn dir etwas unklar ist, antworte einfach auf diese E-Mail.',
    zakaj: 'Du bekommst diese E-Mail, weil du auf slff.eu eine Anfrage als Kenner gestellt hast.',
  },
  sr: {
    zKlub: (k) => `Sada si poznavalac kluba ${k}`,
    zLiga: (l) => `Sada si poznavalac lige ${l}`,
    pKlub: (k) => `Tvoj glas za igrače kluba ${k} vredi trostruko. Evo kako da počneš.`,
    pLiga: (l) => `Tvoj glas u ligi ${l} sam potvrđuje poziciju ili asistenciju. Evo kako da počneš.`,
    naslov: 'Dobro došao/la među poznavaoce',
    hvala: 'Odobrili smo tvoj zahtev.',
    kajKlub: (k, l) => `Od sada si <strong>poznavalac kluba ${k}</strong> u ligi ${l}: tvoj glas za igrače tog kluba vredi trostruko. Hvala što si se prijavio.`,
    kajLiga: (l) => `Od sada si <strong>poznavalac lige ${l}</strong>: tvoj glas sam potvrđuje poziciju igrača ili asistenciju, ne treba čekati druge glasove. Hvala što si se prijavio.`,
    pozicije: 'Pozicije', asistence: 'Asistencije',
    korakPozicije: (a) => `${a}: primenjuju se svakog ponedeljka ujutru.`,
    korakAsistence: (a) => `${a}: važe odmah.`,
    neIgra: 'Igrača koji više ne igra za klub označi sa "više ne igra".',
    prosnjaK: 'Molba',
    prosnja: 'Unosi samo ono što zaista znaš i ne prilagođavaj podatke svom fantasy timu. Od toga zavise bodovi svih u ligi; ako su podaci namerno netačni, gubiš status poznavaoca.',
    gumb: 'Otvori Pozicije',
    vprasanja: 'Ako ti nešto nije jasno, odgovori na ovaj imejl.',
    zakaj: 'Ovaj imejl dobijaš jer si na slff.eu poslao/la zahtev za poznavaoca.',
  },
  ro: {
    zKlub: (k) => `Acum ești cunoscător al clubului ${k}`,
    zLiga: (l) => `Acum ești cunoscător al ligii ${l}`,
    pKlub: (k) => `Votul tău pentru jucătorii clubului ${k} contează triplu. Iată cum începi.`,
    pLiga: (l) => `Votul tău confirmă singur poziții și pase decisive (${l}). Iată cum începi.`,
    naslov: 'Bun venit printre cunoscători',
    hvala: 'Ți-am aprobat cererea.',
    kajKlub: (k, l) => `De acum ești <strong>cunoscător al clubului ${k}</strong> în liga ${l}: votul tău pentru jucătorii acestui club contează triplu. Mersi că te-ai oferit.`,
    kajLiga: (l) => `De acum ești <strong>cunoscător al ligii ${l}</strong>: votul tău confirmă singur poziția unui jucător sau o pasă decisivă, nu mai trebuie așteptate alte voturi. Mersi că te-ai oferit.`,
    pozicije: 'Poziții', asistence: 'Pase decisive',
    korakPozicije: (a) => `${a}: se aplică în fiecare luni dimineața.`,
    korakAsistence: (a) => `${a}: se aplică imediat.`,
    neIgra: 'Pe un jucător care nu mai joacă la club marchează-l cu "nu mai joacă".',
    prosnjaK: 'Rugăminte',
    prosnja: 'Introdu doar ce știi cu adevărat și nu potrivi datele după echipa ta fantasy. De asta depind punctele tuturor din ligă; dacă datele sunt greșite intenționat, pierzi statutul de cunoscător.',
    gumb: 'Deschide Poziții',
    vprasanja: 'Dacă ceva nu e clar, răspunde la acest e-mail.',
    zakaj: 'Primești acest e-mail pentru că ai cerut pe slff.eu statutul de cunoscător.',
  },
  et: {
    zKlub: (k) => `Oled nüüd klubi ${k} asjatundja`,
    zLiga: (l) => `Oled nüüd liiga ${l} asjatundja`,
    pKlub: (k) => `Sinu hääl klubi ${k} mängijate üle loeb kolmekordselt. Nii alustad.`,
    pLiga: (l) => `Sinu hääl üksi kinnitab positsioone ja sööte (${l}). Nii alustad.`,
    naslov: 'Tere tulemast asjatundjate hulka',
    hvala: 'Kinnitasime sinu taotluse.',
    kajKlub: (k, l) => `Nüüdsest oled klubi <strong>${k}</strong> asjatundja (liiga: ${l}): sinu hääl selle klubi mängijate üle loeb kolmekordselt. Aitäh, et pakkusid end appi.`,
    kajLiga: (l) => `Nüüdsest oled liiga <strong>${l}</strong> asjatundja: sinu hääl üksi kinnitab mängija positsiooni või resultatiivse söödu, teisi hääli pole vaja oodata. Aitäh, et pakkusid end appi.`,
    pozicije: 'Positsioonid', asistence: 'Resultatiivsed söödud',
    korakPozicije: (a) => `${a}: jõustuvad iga esmaspäeva hommikul.`,
    korakAsistence: (a) => `${a}: kehtivad kohe.`,
    neIgra: 'Mängija, kes klubis enam ei mängi, märgi "enam ei mängi".',
    prosnjaK: 'Palve',
    prosnja: 'Sisesta ainult seda, mida tõesti tead, ja ära sobita andmeid oma fantaasiameeskonna järgi. Sellest sõltuvad kõigi liiga mängijate punktid; meelega valede andmete korral kaotad asjatundja staatuse.',
    gumb: 'Ava Positsioonid',
    vprasanja: 'Kui midagi on ebaselge, vasta sellele kirjale.',
    zakaj: 'Said selle kirja, sest esitasid slff.eu-s asjatundja taotluse.',
  },
  pl: {
    zKlub: (k) => `Jesteś teraz znawcą klubu ${k}`,
    zLiga: (l) => `Jesteś teraz znawcą ligi ${l}`,
    pKlub: (k) => `Twój głos przy zawodnikach klubu ${k} liczy się potrójnie. Tak zaczniesz.`,
    pLiga: (l) => `Twój głos sam zatwierdza pozycje i asysty (${l}). Tak zaczniesz.`,
    naslov: 'Witaj wśród znawców',
    hvala: 'Zatwierdziliśmy twoją prośbę.',
    kajKlub: (k, l) => `Od teraz jesteś znawcą klubu <strong>${k}</strong> (liga: ${l}): twój głos przy zawodnikach tego klubu liczy się potrójnie. Dziękujemy za chęć pomocy.`,
    kajLiga: (l) => `Od teraz jesteś znawcą ligi <strong>${l}</strong>: twój głos sam zatwierdza pozycję zawodnika lub asystę, nie trzeba czekać na inne głosy. Dziękujemy za chęć pomocy.`,
    pozicije: 'Pozycje', asistence: 'Asysty',
    korakPozicije: (a) => `${a}: obowiązują od każdego poniedziałku rano.`,
    korakAsistence: (a) => `${a}: obowiązują od razu.`,
    neIgra: 'Zawodnika, który już nie gra w klubie, oznacz jako "już nie gra".',
    prosnjaK: 'Prośba',
    prosnja: 'Wpisuj tylko to, co naprawdę wiesz, i nie dopasowuj danych do swojej drużyny fantasy. Od tego zależą punkty wszystkich w lidze; przy celowo błędnych danych stracisz status znawcy.',
    gumb: 'Otwórz Pozycje',
    vprasanja: 'Jeśli coś jest niejasne, odpowiedz na tę wiadomość.',
    zakaj: 'Dostajesz tę wiadomość, bo złożyłeś na slff.eu prośbę o status znawcy.',
  },
  es: {
    zKlub: (k) => `Ya eres experto del club ${k}`,
    zLiga: (l) => `Ya eres experto de la liga ${l}`,
    pKlub: (k) => `Tu voto sobre los jugadores de ${k} cuenta el triple. Así empiezas.`,
    pLiga: (l) => `Tu voto confirma por sí solo posiciones y asistencias (${l}). Así empiezas.`,
    naslov: 'Bienvenido a los expertos',
    hvala: 'Hemos aprobado tu solicitud.',
    kajKlub: (k, l) => `Desde ahora eres experto del club <strong>${k}</strong> (liga: ${l}): tu voto sobre los jugadores de este club cuenta el triple. Gracias por ofrecerte a ayudar.`,
    kajLiga: (l) => `Desde ahora eres experto de la liga <strong>${l}</strong>: tu voto confirma por sí solo la posición de un jugador o una asistencia, sin esperar a otros votos. Gracias por ofrecerte a ayudar.`,
    pozicije: 'Posiciones', asistence: 'Asistencias',
    korakPozicije: (a) => `${a}: se aplican cada lunes por la mañana.`,
    korakAsistence: (a) => `${a}: valen al momento.`,
    neIgra: 'Marca como "ya no juega" a un jugador que ya no juega en el club.',
    prosnjaK: 'Petición',
    prosnja: 'Introduce solo lo que sepas de verdad y no ajustes los datos a tu equipo fantasy. De ello dependen los puntos de todos en la liga; con datos falsos a propósito pierdes el estatus de experto.',
    gumb: 'Abrir Posiciones',
    vprasanja: 'Si algo no está claro, responde a este correo.',
    zakaj: 'Recibes este correo porque pediste en slff.eu ser experto.',
  },
  lv: {
    zKlub: (k) => `Tagad tu esi kluba eksperts (${k})`,
    zLiga: (l) => `Tagad tu esi līgas eksperts (${l})`,
    pKlub: (k) => `Tava balss par kluba ${k} spēlētājiem skaitās trīskārt. Tā sāc.`,
    pLiga: (l) => `Tava balss viena pati apstiprina pozīcijas un piespēles (${l}). Tā sāc.`,
    naslov: 'Laipni lūdzam ekspertu pulkā',
    hvala: 'Apstiprinājām tavu pieteikumu.',
    kajKlub: (k, l) => `No šī brīža tu esi kluba eksperts (klubs: <strong>${k}</strong>, līga: ${l}): tava balss par šī kluba spēlētājiem skaitās trīskārt. Paldies, ka piedāvāji palīdzību.`,
    kajLiga: (l) => `No šī brīža tu esi līgas eksperts (līga: <strong>${l}</strong>): tava balss viena pati apstiprina spēlētāja pozīciju vai rezultatīvo piespēli, citas balsis nav jāgaida. Paldies, ka piedāvāji palīdzību.`,
    pozicije: 'Pozīcijas', asistence: 'Rezultatīvās piespēles',
    korakPozicije: (a) => `${a}: stājas spēkā katru pirmdienas rītu.`,
    korakAsistence: (a) => `${a}: uzreiz.`,
    neIgra: 'Spēlētāju, kurš klubā vairs nespēlē, atzīmē kā "vairs nespēlē".',
    prosnjaK: 'Lūgums',
    prosnja: 'Ievadi tikai to, ko tiešām zini, un nepielāgo datus savai fantāzijas komandai. No tā ir atkarīgi visu līgas dalībnieku punkti; par apzināti nepareiziem datiem zaudēsi eksperta statusu.',
    gumb: 'Atvērt Pozīcijas',
    vprasanja: 'Ja kaut kas nav skaidrs, atbildi uz šo vēstuli.',
    zakaj: 'Šo vēstuli saņem, jo slff.eu pieteicies eksperta statusam.',
  },
  mk: {
    zKlub: (k) => `Сега си познавач на клубот ${k}`,
    zLiga: (l) => `Сега си познавач на лигата ${l}`,
    pKlub: (k) => `Твојот глас за играчите на ${k} вреди тројно. Еве како да почнеш.`,
    pLiga: (l) => `Твојот глас сам потврдува позиции и асистенции (${l}). Еве како да почнеш.`,
    naslov: 'Добредојде меѓу познавачите',
    hvala: 'Го одобривме твоето барање.',
    kajKlub: (k, l) => `Отсега си познавач на клубот (клуб: <strong>${k}</strong>, лига: ${l}): твојот глас за играчите од тој клуб вреди тројно. Ти благодариме што се пријави.`,
    kajLiga: (l) => `Отсега си познавач на лигата (лига: <strong>${l}</strong>): твојот глас сам ја потврдува позицијата на играчот или асистенцијата, не треба да се чекаат други гласови. Ти благодариме што се пријави.`,
    pozicije: 'Позиции', asistence: 'Асистенции',
    korakPozicije: (a) => `${a}: се применуваат секој понеделник наутро.`,
    korakAsistence: (a) => `${a}: важат веднаш.`,
    neIgra: 'Играчот што повеќе не игра за клубот означи го со "повеќе не игра".',
    prosnjaK: 'Молба',
    prosnja: 'Внесувај само она што навистина го знаеш и не ги прилагодувај податоците на својот фантази тим. Од тоа зависат поените на сите во лигата; со намерно неточни податоци го губиш статусот на познавач.',
    gumb: 'Отвори Позиции',
    vprasanja: 'Ако нешто не ти е јасно, одговори на оваа порака.',
    zakaj: 'Ја добиваш поракава затоа што на slff.eu побара статус на познавач.',
  },
  el: {
    zKlub: (k) => `Είσαι πλέον γνώστης του συλλόγου ${k}`,
    zLiga: (l) => `Είσαι πλέον γνώστης του πρωταθλήματος ${l}`,
    pKlub: (k) => `Η ψήφος σου για τους παίκτες του ${k} μετράει τριπλά. Έτσι ξεκινάς.`,
    pLiga: (l) => `Η ψήφος σου μόνη της επιβεβαιώνει θέσεις και ασίστ (${l}). Έτσι ξεκινάς.`,
    naslov: 'Καλώς ήρθες στους γνώστες',
    hvala: 'Εγκρίναμε το αίτημά σου.',
    kajKlub: (k, l) => `Από τώρα είσαι γνώστης του συλλόγου (σύλλογος: <strong>${k}</strong>, πρωτάθλημα: ${l}): η ψήφος σου για τους παίκτες αυτού του συλλόγου μετράει τριπλά. Σε ευχαριστούμε που προσφέρθηκες.`,
    kajLiga: (l) => `Από τώρα είσαι γνώστης του πρωταθλήματος (πρωτάθλημα: <strong>${l}</strong>): η ψήφος σου μόνη της επιβεβαιώνει τη θέση ενός παίκτη ή μια ασίστ, χωρίς να περιμένεις άλλες ψήφους. Σε ευχαριστούμε που προσφέρθηκες.`,
    pozicije: 'Θέσεις', asistence: 'Ασίστ',
    korakPozicije: (a) => `${a}: ισχύουν κάθε Δευτέρα πρωί.`,
    korakAsistence: (a) => `${a}: ισχύουν αμέσως.`,
    neIgra: 'Σημείωσε με "δεν παίζει πια" έναν παίκτη που δεν παίζει πια στον σύλλογο.',
    prosnjaK: 'Παράκληση',
    prosnja: 'Γράφε μόνο ό,τι πραγματικά ξέρεις και μην προσαρμόζεις τα δεδομένα στη fantasy ομάδα σου. Από αυτά εξαρτώνται οι πόντοι όλων στο πρωτάθλημα· με εσκεμμένα λάθος δεδομένα χάνεις την ιδιότητα του γνώστη.',
    gumb: 'Άνοιξε τις Θέσεις',
    vprasanja: 'Αν κάτι δεν είναι σαφές, απάντησε σε αυτό το μήνυμα.',
    zakaj: 'Λαμβάνεις αυτό το μήνυμα επειδή ζήτησες στο slff.eu να γίνεις γνώστης.',
  },
  tr: {
    zKlub: (k) => `Artık ${k} kulübünün uzmanısın`,
    zLiga: (l) => `Artık lig uzmanısın (${l})`,
    pKlub: (k) => `${k} oyuncuları için verdiğin oy üç kat sayılır. Böyle başla.`,
    pLiga: (l) => `Mevkileri ve asistleri tek başına senin oyun onaylar (${l}). Böyle başla.`,
    naslov: 'Uzmanlar arasına hoş geldin',
    hvala: 'Başvurunu onayladık.',
    kajKlub: (k, l) => `Artık kulüp uzmanısın (kulüp: <strong>${k}</strong>, lig: ${l}): bu kulübün oyuncuları için verdiğin oy üç kat sayılır. Başvurduğun için teşekkürler.`,
    kajLiga: (l) => `Artık lig uzmanısın (lig: <strong>${l}</strong>): bir oyuncunun mevkisini veya bir asisti tek başına senin oyun onaylar, başka oyları beklemeye gerek yok. Başvurduğun için teşekkürler.`,
    pozicije: 'Mevkiler', asistence: 'Asistler',
    korakPozicije: (a) => `${a}: her pazartesi sabahı uygulanır.`,
    korakAsistence: (a) => `${a}: hemen uygulanır.`,
    neIgra: 'Artık kulüpte oynamayan bir oyuncuyu "artık oynamıyor" olarak işaretle.',
    prosnjaK: 'Rica',
    prosnja: 'Sadece gerçekten bildiğin bilgileri gir ve verileri kendi fantezi takımına göre ayarlama. Ligdeki herkesin puanı buna bağlı; bilerek yanlış veri girersen uzmanlık statünü kaybedersin.',
    gumb: 'Mevkileri aç',
    vprasanja: 'Bir şey net değilse bu e-postayı yanıtla.',
    zakaj: 'Bu e-postayı slff.eu’da uzmanlık başvurusu yaptığın için alıyorsun.',
  },
  uk: {
    zKlub: (k) => `Тепер ти знавець клубу ${k}`,
    zLiga: (l) => `Тепер ти знавець ліги ${l}`,
    pKlub: (k) => `Твій голос за гравців ${k} важить утричі більше. Ось як почати.`,
    pLiga: (l) => `Твій голос сам підтверджує позиції та асисти (${l}). Ось як почати.`,
    naslov: 'Вітаємо серед знавців',
    hvala: 'Твою заявку схвалено.',
    kajKlub: (k, l) => `Відтепер ти знавець клубу (клуб: <strong>${k}</strong>, ліга: ${l}): твій голос за гравців цього клубу важить утричі більше. Дякуємо, що подав заявку.`,
    kajLiga: (l) => `Відтепер ти знавець ліги (ліга: <strong>${l}</strong>): твій голос сам підтверджує позицію гравця або асист, чекати інших голосів не потрібно. Дякуємо, що подав заявку.`,
    pozicije: 'Позиції', asistence: 'Асисти',
    korakPozicije: (a) => `${a}: застосовуються щопонеділка вранці.`,
    korakAsistence: (a) => `${a}: одразу.`,
    neIgra: 'Гравця, який більше не грає за клуб, познач як "більше не грає".',
    prosnjaK: 'Прохання',
    prosnja: 'Вводь лише те, що справді знаєш, і не підлаштовуй дані під свою фентезі-команду. Від цього залежать очки всіх у лізі; за навмисно хибні дані ти втратиш статус знавця.',
    gumb: 'Відкрити Позиції',
    vprasanja: 'Якщо щось незрозуміло, просто відповідай на цей лист.',
    zakaj: 'Ти отримуєш цей лист, бо подав на slff.eu заявку на статус знавця.',
  },
  hy: {
    zKlub: (k) => `Այժմ դու ${k} ակումբի գիտակն ես`,
    zLiga: (l) => `Այժմ դու լիգայի գիտակ ես (${l})`,
    pKlub: (k) => `${k} ակումբի խաղացողների վերաբերյալ քո ձայնը եռակի արժեք ունի։ Ահա թե ինչպես սկսել։`,
    pLiga: (l) => `Քո ձայնն ինքնին հաստատում է դիրքերն ու փոխանցումները (${l})։ Ահա թե ինչպես սկսել։`,
    naslov: 'Բարի գալուստ գիտակների շարք',
    hvala: 'Հաստատեցինք քո հայտը։',
    kajKlub: (k, l) => `Այսուհետ դու ակումբի գիտակ ես (ակումբ: <strong>${k}</strong>, լիգա: ${l}). այդ ակումբի խաղացողների վերաբերյալ քո ձայնը եռակի արժեք ունի։ Շնորհակալություն, որ դիմեցիր։`,
    kajLiga: (l) => `Այսուհետ դու լիգայի գիտակ ես (լիգա: <strong>${l}</strong>). քո ձայնն ինքնին հաստատում է խաղացողի դիրքը կամ գոլային փոխանցումը, այլ ձայների սպասել պետք չէ։ Շնորհակալություն, որ դիմեցիր։`,
    pozicije: 'Դիրքեր', asistence: 'Գոլային փոխանցումներ',
    korakPozicije: (a) => `${a}. կիրառվում են ամեն երկուշաբթի առավոտ։`,
    korakAsistence: (a) => `${a}. գործում են անմիջապես։`,
    neIgra: 'Ակումբում այլևս չխաղացող խաղացողին նշիր «այլևս չի խաղում» նշումով։',
    prosnjaK: 'Խնդրանք',
    prosnja: 'Մուտքագրիր միայն այն, ինչ իսկապես գիտես, և տվյալները մի հարմարեցրու քո ֆենթեզի թիմին։ Դրանից են կախված լիգայի բոլոր մասնակիցների միավորները. միտումնավոր սխալ տվյալների դեպքում կկորցնես գիտակի կարգավիճակը։',
    gumb: 'Բացել Դիրքերը',
    vprasanja: 'Եթե ինչ-որ բան պարզ չէ, պատասխանիր այս նամակին։',
    zakaj: 'Այս նամակը ստանում ես, քանի որ slff.eu-ում գիտակ դառնալու հայտ ես ներկայացրել։',
  },
  az: {
    zKlub: (k) => `Artıq ${k} klubunun bilicisisən`,
    zLiga: (l) => `Artıq liqanın bilicisisən (${l})`,
    pKlub: (k) => `${k} oyunçularına verdiyin səs üç qat sayılır. Belə başla.`,
    pLiga: (l) => `Sənin səsin mövqeləri və asistləri özü təsdiqləyir (${l}). Belə başla.`,
    naslov: 'Biliciler arasına xoş gəldin',
    hvala: 'Müraciətini təsdiqlədik.',
    kajKlub: (k, l) => `Artıq klubun bilicisisən (klub: <strong>${k}</strong>, liqa: ${l}): həmin klubun oyunçularına verdiyin səs üç qat sayılır. Müraciət etdiyin üçün təşəkkürlər.`,
    kajLiga: (l) => `Artıq liqanın bilicisisən (liqa: <strong>${l}</strong>): sənin səsin oyunçunun mövqeyini və ya asisti özü təsdiqləyir, başqa səsləri gözləmək lazım deyil. Müraciət etdiyin üçün təşəkkürlər.`,
    pozicije: 'Mövqelər', asistence: 'Asistlər',
    korakPozicije: (a) => `${a}: hər bazar ertəsi səhər qüvvəyə minir.`,
    korakAsistence: (a) => `${a}: dərhal qüvvədədir.`,
    neIgra: 'Artıq klubda oynamayan oyunçunu "artıq oynamır" ilə qeyd et.',
    prosnjaK: 'Xahiş',
    prosnja: 'Yalnız həqiqətən bildiyini daxil et və məlumatları öz fantasy komandana uyğunlaşdırma. Liqadakı hər kəsin xalları bundan asılıdır; qəsdən səhv məlumat versən, bilici statusunu itirirsən.',
    gumb: 'Mövqeləri aç',
    vprasanja: 'Nəsə aydın deyilsə, bu məktuba cavab yaz.',
    zakaj: 'Bu məktubu slff.eu-da bilici olmaq üçün müraciət etdiyin üçün alırsan.',
  },
  da: {
    zKlub: (k) => `Du er nu insider i klubben ${k}`,
    zLiga: (l) => `Du er nu insider i ligaen ${l}`,
    pKlub: (k) => `Din stemme om spillerne fra ${k} tæller tredobbelt. Sådan kommer du i gang.`,
    pLiga: (l) => `Din stemme alene bekræfter positioner og assists (${l}). Sådan kommer du i gang.`,
    naslov: 'Velkommen blandt insiderne',
    hvala: 'Vi har godkendt din anmodning.',
    kajKlub: (k, l) => `Fra nu af er du insider i klubben (klub: <strong>${k}</strong>, liga: ${l}): din stemme om spillerne fra denne klub tæller tredobbelt. Tak, fordi du meldte dig.`,
    kajLiga: (l) => `Fra nu af er du insider i ligaen (liga: <strong>${l}</strong>): din stemme alene bekræfter en spillers position eller en assist, uden at der skal ventes på andre stemmer. Tak, fordi du meldte dig.`,
    pozicije: 'Positioner', asistence: 'Assists',
    korakPozicije: (a) => `${a}: træder i kraft hver mandag morgen.`,
    korakAsistence: (a) => `${a}: gælder med det samme.`,
    neIgra: 'Marker en spiller, der ikke længere spiller for klubben, med "spiller ikke længere".',
    prosnjaK: 'Bøn',
    prosnja: 'Indtast kun det, du virkelig ved, og tilpas ikke dataene til dit fantasyhold. Alles point i ligaen afhænger af det; ved bevidst forkerte data mister du din status som insider.',
    gumb: 'Åbn Positioner',
    vprasanja: 'Er der noget, du er i tvivl om, så svar på denne mail.',
    zakaj: 'Du får denne mail, fordi du på slff.eu har bedt om at blive insider.',
  },
  en: {
    zKlub: (k) => `You’re now a club insider for ${k}`,
    zLiga: (l) => `You’re now a league insider for ${l}`,
    pKlub: (k) => `Your vote on ${k} players counts three times. Here’s how to start.`,
    pLiga: (l) => `Your vote alone confirms positions and assists (${l}). Here’s how to start.`,
    naslov: 'Welcome to the insiders',
    hvala: 'We’ve approved your request.',
    kajKlub: (k, l) => `From now on you are a club insider (club: <strong>${k}</strong>, league: ${l}): your vote on this club’s players counts three times. Thanks for volunteering.`,
    kajLiga: (l) => `From now on you are a league insider (league: <strong>${l}</strong>): your vote alone confirms a player’s position or an assist, with no need to wait for other votes. Thanks for volunteering.`,
    pozicije: 'Positions', asistence: 'Assists',
    korakPozicije: (a) => `${a}: applied every Monday morning.`,
    korakAsistence: (a) => `${a}: count straight away.`,
    neIgra: 'Mark a player who no longer plays for the club as "no longer plays".',
    prosnjaK: 'One request',
    prosnja: 'Only enter what you really know and don’t bend the data to suit your fantasy team. Everyone’s points in the league depend on it; deliberately wrong data costs you your insider status.',
    gumb: 'Open Positions',
    vprasanja: 'If anything is unclear, just reply to this email.',
    zakaj: 'You got this email because you asked to become an insider on slff.eu.',
  },
}

export function sestaviPoznavalca(
  liga: Liga,
  meta: { display_name: string | null; obseg: 'klub' | 'liga'; klub: string | null },
): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const B = POZNAVALEC[j]
  const imeLige = liga.ime || liga.oznaka
  const klub = meta.klub ?? ''
  const zaLigo = meta.obseg === 'liga'
  // Slovaški poznavalec dela le z asistencami.
  const samoAsistence = j === 'sk'
  const asistence = B.korakAsistence(povezava(B.asistence, p.asistence))
  const seznam = samoAsistence
    ? [asistence]
    : [B.korakPozicije(povezava(B.pozicije, p.pozicije)), asistence, esc(B.neIgra)]
  return sestavi(j, {
    zadeva: zaLigo ? B.zLiga(imeLige) : B.zKlub(klub),
    predglava: zaLigo ? B.pLiga(imeLige) : B.pKlub(klub),
    oznaka: liga.oznaka,
    naslov: B.naslov,
    uvod: `${pozdrav(j, meta.display_name)} ${B.hvala} ${zaLigo ? B.kajLiga(esc(imeLige)) : B.kajKlub(esc(klub), esc(imeLige))}`,
    seznam,
    opozorilo: [{ k: B.prosnjaK, v: esc(B.prosnja) }],
    gumb: { label: B.gumb, url: samoAsistence ? p.asistence : p.pozicije },
    opomba: B.vprasanja,
    zakaj: B.zakaj,
  })
}

// --- popravek pozicije: lažni vratar ---------------------------------------
//
// Zapisnik je igralca iz polja enkrat označil z (V) in uvoz ga je prekrstil v
// vratarja. Pozicijo smo popravili; lastnik, ki ga ima v kadru, mora vedeti,
// da odslej zbira točke kot igralec iz polja. Kvota kadra se sodi po poziciji
// ob nakupu, ki jo igralec obdrži, dokler ostane v kadru: ekipa ostane
// veljavna, ob prodaji pa ga mora nadomestiti vratar. Enkratni mail, brez odjave.

const POZICIJA_SL: Record<string, string> = { DEF: 'branilec', MID: 'vezist', FWD: 'napadalec' }
const POZICIJA_SK: Record<string, string> = { DEF: 'obranca', MID: 'záložník', FWD: 'útočník' }
const POZICIJA_HR: Record<string, string> = { DEF: 'branič', MID: 'vezni', FWD: 'napadač' }
const POZICIJA_CS: Record<string, string> = { DEF: 'obránce', MID: 'záložník', FWD: 'útočník' }
const POZICIJA_HU: Record<string, string> = { DEF: 'védő', MID: 'középpályás', FWD: 'támadó' }
const POZICIJA_DE: Record<string, string> = { DEF: 'Verteidiger', MID: 'Mittelfeldspieler', FWD: 'Stürmer' }
const POZICIJA_SR: Record<string, string> = { DEF: 'odbrambeni', MID: 'vezni', FWD: 'napadač' }
const POZICIJA_RO: Record<string, string> = { DEF: 'fundaș', MID: 'mijlocaș', FWD: 'atacant' }
const POZICIJA_ET: Record<string, string> = { DEF: 'kaitsja', MID: 'poolkaitsja', FWD: 'ründaja' }
const POZICIJA_LV: Record<string, string> = { DEF: 'aizsargs', MID: 'pussargs', FWD: 'uzbrucējs' }
const POZICIJA_MK: Record<string, string> = { DEF: 'одбранбен', MID: 'среден ред', FWD: 'напаѓач' }
const POZICIJA_PL: Record<string, string> = { DEF: 'obrońca', MID: 'pomocnik', FWD: 'napastnik' }
const POZICIJA_ES: Record<string, string> = { DEF: 'defensa', MID: 'centrocampista', FWD: 'delantero' }
const POZICIJA_EL: Record<string, string> = { DEF: 'αμυντικός', MID: 'μέσος', FWD: 'επιθετικός' }
const POZICIJA_TR: Record<string, string> = { DEF: 'defans', MID: 'orta saha', FWD: 'forvet' }
const POZICIJA_UK: Record<string, string> = { DEF: 'захисник', MID: 'півзахисник', FWD: 'нападник' }
const POZICIJA_HY: Record<string, string> = { DEF: 'պաշտպան', MID: 'կիսապաշտպան', FWD: 'հարձակվող' }
const POZICIJA_AZ: Record<string, string> = { DEF: 'müdafiəçi', MID: 'yarımmüdafiəçi', FWD: 'hücumçu' }
const POZICIJA_DA: Record<string, string> = { DEF: 'forsvarsspiller', MID: 'midtbanespiller', FWD: 'angriber' }
const POZICIJA_EN: Record<string, string> = { DEF: 'defender', MID: 'midfielder', FWD: 'forward' }
const POZICIJA: Record<Jezik, Record<string, string>> = { sl: POZICIJA_SL, sk: POZICIJA_SK, hr: POZICIJA_HR, cs: POZICIJA_CS, hu: POZICIJA_HU, de: POZICIJA_DE, sr: POZICIJA_SR, ro: POZICIJA_RO, et: POZICIJA_ET, pl: POZICIJA_PL, es: POZICIJA_ES, lv: POZICIJA_LV, mk: POZICIJA_MK, el: POZICIJA_EL, tr: POZICIJA_TR, uk: POZICIJA_UK, hy: POZICIJA_HY, az: POZICIJA_AZ, da: POZICIJA_DA, en: POZICIJA_EN }

/** "zdaj" pred novo pozicijo, npr. "(zdaj vezist)". */
const ZDAJ: Record<Jezik, string> = {
  sl: 'zdaj', sk: 'teraz', hr: 'sada', cs: 'nyní', hu: 'mostantól', de: 'jetzt', sr: 'sada', ro: 'acum', et: 'nüüd',
  pl: 'teraz', es: 'ahora', lv: 'tagad', mk: 'сега', el: 'τώρα', tr: 'artık', uk: 'тепер', hy: 'այժմ', az: 'indi', da: 'nu', en: 'now',
}

interface BesedilaPopravka {
  /** Zadeva za "SLFF <liga>: "; `k` so imena igralcev, `ena` en sam igralec. */
  zadeva: (k: string, ena: boolean) => string
  predglava: string
  naslov: (ena: boolean) => string
  /** `e` je "<strong>ekipa</strong> " ali prazno. */
  uvod: (e: string, ena: boolean) => string
  igralec: (ena: boolean) => string
  prej: string
  vratar: string
  zdaj: string
  polje: (ena: boolean) => string
  tocke: string
  preracunano: string
  gumb: string
  opomba: (ena: boolean) => string
  zakaj: (ozn: string, ena: boolean) => string
}

const POPRAVEK: Record<Jezik, BesedilaPopravka> = {
  sl: {
    zadeva: (k, ena) => `popravili smo pozicijo ${ena ? 'igralca' : 'igralcev'} ${k} (ni ti treba nič)`,
    predglava: 'Ekipa ostane veljavna, točke so že preračunane.',
    naslov: (ena) => ena ? 'Popravili smo pozicijo igralca' : 'Popravili smo pozicije igralcev',
    uvod: (e, ena) => (ena
      ? `V ekipi ${e}imaš igralca, ki je bil pomotoma zapisan kot vratar.`
      : `V ekipi ${e}imaš igralce, ki so bili pomotoma zapisani kot vratarji.`) +
      ' Ekipa ostane veljavna, <strong>ni ti treba storiti ničesar</strong>.',
    igralec: (ena) => ena ? 'Igralec' : 'Igralci',
    prej: 'Prej', vratar: 'vratar', zdaj: 'Zdaj',
    polje: (ena) => ena ? 'točke dobiva kot igralec iz polja' : 'točke dobivajo kot igralci iz polja',
    tocke: 'Točke', preracunano: 'zadnji krog je že preračunan',
    gumb: 'Poglej ekipo',
    opomba: (ena) => `${ena ? 'Če ga prodaš' : 'Če katerega prodaš'}, na njegovo mesto kupi vratarja. Opravičujemo se za napako.`,
    zakaj: (o, ena) => ena
      ? `Ta mail dobiš enkrat, ker je igralec v tvoji ekipi v ligi ${o}.`
      : `Ta mail dobiš enkrat, ker so igralci v tvoji ekipi v ligi ${o}.`,
  },
  sk: {
    zadeva: (k, ena) => `opravili sme pozíciu ${ena ? 'hráča' : 'hráčov'} ${k} (nemusíš nič robiť)`,
    predglava: 'Tím zostáva platný, body sú už prepočítané.',
    naslov: (ena) => ena ? 'Opravili sme pozíciu hráča' : 'Opravili sme pozície hráčov',
    uvod: (e, ena) => (ena
      ? `V tíme ${e}máš hráča, ktorého sme mali omylom vedeného ako brankára.`
      : `V tíme ${e}máš hráčov, ktorých sme mali omylom vedených ako brankárov.`) +
      ' Tím zostáva platný, <strong>nemusíš nič robiť</strong>.',
    igralec: (ena) => ena ? 'Hráč' : 'Hráči',
    prej: 'Predtým', vratar: 'brankár', zdaj: 'Teraz',
    polje: (ena) => ena ? 'body získava ako hráč v poli' : 'body získavajú ako hráči v poli',
    tocke: 'Body', preracunano: 'posledné kolo je už prepočítané',
    gumb: 'Pozrieť tím',
    opomba: (ena) => `${ena ? 'Ak ho predáš' : 'Ak niektorého predáš'}, na jeho miesto kúp brankára. Ospravedlňujeme sa za chybu.`,
    zakaj: (o, ena) => `Tento e-mail dostaneš raz, lebo ${ena ? 'tohto hráča' : 'týchto hráčov'} máš v tíme v lige ${o}.`,
  },
  hr: {
    zadeva: (k, ena) => `ispravili smo poziciju ${ena ? 'igrača' : 'igrača'} ${k} (ne moraš ništa raditi)`,
    predglava: 'Momčad ostaje valjana, bodovi su već preračunati.',
    naslov: (ena) => ena ? 'Ispravili smo poziciju igrača' : 'Ispravili smo pozicije igrača',
    uvod: (e, ena) => (ena
      ? `U momčadi ${e}imaš igrača kojeg smo greškom vodili kao vratara.`
      : `U momčadi ${e}imaš igrače koje smo greškom vodili kao vratare.`) +
      ' Momčad ostaje valjana, <strong>ne moraš ništa raditi</strong>.',
    igralec: (ena) => ena ? 'Igrač' : 'Igrači',
    prej: 'Prije', vratar: 'vratar', zdaj: 'Sada',
    polje: (ena) => ena ? 'bodove dobiva kao igrač iz polja' : 'bodove dobivaju kao igrači iz polja',
    tocke: 'Bodovi', preracunano: 'zadnje kolo je već preračunato',
    gumb: 'Pogledaj momčad',
    opomba: (ena) => `${ena ? 'Ako ga prodaš' : 'Ako nekog od njih prodaš'}, na njegovo mjesto kupi vratara. Ispričavamo se zbog pogreške.`,
    zakaj: (o, ena) => `Ovaj e-mail dobivaš jednom jer ${ena ? 'tog igrača' : 'te igrače'} imaš u momčadi u ligi ${o}.`,
  },
  cs: {
    zadeva: (k, ena) => `opravili jsme pozici ${ena ? 'hráče' : 'hráčů'} ${k} (nemusíš nic dělat)`,
    predglava: 'Tým zůstává platný, body jsou už přepočítané.',
    naslov: (ena) => ena ? 'Opravili jsme pozici hráče' : 'Opravili jsme pozice hráčů',
    uvod: (e, ena) => (ena
      ? `V týmu ${e}máš hráče, kterého jsme omylem vedli jako brankáře.`
      : `V týmu ${e}máš hráče, které jsme omylem vedli jako brankáře.`) +
      ' Tým zůstává platný, <strong>nemusíš nic dělat</strong>.',
    igralec: (ena) => ena ? 'Hráč' : 'Hráči',
    prej: 'Dříve', vratar: 'brankář', zdaj: 'Nyní',
    polje: (ena) => ena ? 'body získává jako hráč v poli' : 'body získávají jako hráči v poli',
    tocke: 'Body', preracunano: 'poslední kolo je už přepočítané',
    gumb: 'Zobrazit tým',
    opomba: (ena) => `${ena ? 'Pokud ho prodáš' : 'Pokud některého prodáš'}, na jeho místo kup brankáře. Omlouváme se za chybu.`,
    zakaj: (o, ena) => `Tento e-mail dostaneš jednou, protože ${ena ? 'tohoto hráče' : 'tyto hráče'} máš v týmu v lize ${o}.`,
  },
  hu: {
    zadeva: (k, ena) => `javítottuk ${ena ? 'egy játékosod' : 'játékosaid'} posztját: ${k} (nincs teendőd)`,
    predglava: 'A csapatod érvényes marad, a pontokat már újraszámoltuk.',
    naslov: (ena) => ena ? 'Javítottuk egy játékos posztját' : 'Javítottuk játékosok posztját',
    uvod: (e, ena) => `A csapatodban ${e ? `(${e.trim()}) ` : ''}` + (ena
      ? 'van egy játékos, akit tévedésből kapusként tartottunk nyilván.'
      : 'vannak játékosok, akiket tévedésből kapusként tartottunk nyilván.') +
      ' A csapatod érvényes marad, <strong>semmit sem kell tenned</strong>.',
    igralec: (ena) => ena ? 'Játékos' : 'Játékosok',
    prej: 'Korábban', vratar: 'kapus', zdaj: 'Mostantól',
    polje: (ena) => ena ? 'mezőnyjátékosként szerez pontot' : 'mezőnyjátékosként szereznek pontot',
    tocke: 'Pontok', preracunano: 'az utolsó fordulót már újraszámoltuk',
    gumb: 'Csapatom megtekintése',
    opomba: (ena) => `${ena ? 'Ha eladod' : 'Ha valamelyiküket eladod'}, a helyére kapust kell venned. Elnézést kérünk a hibáért.`,
    zakaj: (o, ena) => `Ezt az e-mailt egyszer kapod, mert ${ena ? 'ez a játékos' : 'ezek a játékosok'} a csapatodban ${ena ? 'van' : 'vannak'} ebben a bajnokságban: ${o}.`,
  },
  de: {
    zadeva: (k, ena) => `Position ${ena ? 'eines Spielers' : 'von Spielern'} korrigiert: ${k} (du musst nichts tun)`,
    predglava: 'Dein Team bleibt gültig, die Punkte sind schon neu berechnet.',
    naslov: (ena) => ena ? 'Wir haben die Position eines Spielers korrigiert' : 'Wir haben die Positionen von Spielern korrigiert',
    uvod: (e, ena) => `In deinem Team ${e ? `(${e.trim()}) ` : ''}` + (ena
      ? 'ist ein Spieler, den wir irrtümlich als Tormann geführt haben.'
      : 'sind Spieler, die wir irrtümlich als Tormann geführt haben.') +
      ' Dein Team bleibt gültig, <strong>du musst nichts tun</strong>.',
    igralec: (ena) => ena ? 'Spieler' : 'Spieler',
    prej: 'Vorher', vratar: 'Tormann', zdaj: 'Jetzt',
    polje: (ena) => ena ? 'holt Punkte als Feldspieler' : 'holen Punkte als Feldspieler',
    tocke: 'Punkte', preracunano: 'die letzte Runde ist schon neu berechnet',
    gumb: 'Team ansehen',
    opomba: (ena) => `${ena ? 'Wenn du ihn verkaufst' : 'Wenn du einen von ihnen verkaufst'}, kauf an seiner Stelle einen Tormann. Entschuldige den Fehler.`,
    zakaj: (o, ena) => `Du bekommst diese E-Mail einmal, weil ${ena ? 'dieser Spieler' : 'diese Spieler'} in deinem Team in dieser Liga ${ena ? 'ist' : 'sind'}: ${o}.`,
  },
  sr: {
    zadeva: (k) => `ispravili smo poziciju igrača ${k} (ne moraš ništa da radiš)`,
    predglava: 'Tim ostaje ispravan, bodovi su već preračunati.',
    naslov: (ena) => ena ? 'Ispravili smo poziciju igrača' : 'Ispravili smo pozicije igrača',
    uvod: (e, ena) => (ena
      ? `U timu ${e}imaš igrača kojeg smo greškom vodili kao golmana.`
      : `U timu ${e}imaš igrače koje smo greškom vodili kao golmane.`) +
      ' Tim ostaje ispravan, <strong>ne moraš ništa da radiš</strong>.',
    igralec: (ena) => ena ? 'Igrač' : 'Igrači',
    prej: 'Pre', vratar: 'golman', zdaj: 'Sada',
    polje: (ena) => ena ? 'bodove dobija kao igrač iz polja' : 'bodove dobijaju kao igrači iz polja',
    tocke: 'Bodovi', preracunano: 'poslednje kolo je već preračunato',
    gumb: 'Pogledaj tim',
    opomba: (ena) => `${ena ? 'Ako ga prodaš' : 'Ako nekog od njih prodaš'}, na njegovo mesto kupi golmana. Izvinjavamo se zbog greške.`,
    zakaj: (o, ena) => `Ovaj imejl dobijaš jednom jer ${ena ? 'tog igrača' : 'te igrače'} imaš u timu u ligi ${o}.`,
  },
  ro: {
    zadeva: (k, ena) => `am corectat poziția ${ena ? 'jucătorului' : 'jucătorilor'} ${k} (nu trebuie să faci nimic)`,
    predglava: 'Echipa rămâne validă, punctele sunt deja recalculate.',
    naslov: (ena) => ena ? 'Am corectat poziția unui jucător' : 'Am corectat pozițiile unor jucători',
    uvod: (e, ena) => (ena
      ? `În echipa ${e}ai un jucător pe care l-am avut trecut din greșeală ca portar.`
      : `În echipa ${e}ai jucători pe care i-am avut trecuți din greșeală ca portari.`) +
      ' Echipa rămâne validă, <strong>nu trebuie să faci nimic</strong>.',
    igralec: (ena) => ena ? 'Jucător' : 'Jucători',
    prej: 'Înainte', vratar: 'portar', zdaj: 'Acum',
    polje: (ena) => ena ? 'primește puncte ca jucător de câmp' : 'primesc puncte ca jucători de câmp',
    tocke: 'Puncte', preracunano: 'ultima etapă este deja recalculată',
    gumb: 'Vezi echipa',
    opomba: (ena) => `${ena ? 'Dacă îl vinzi' : 'Dacă vinzi pe vreunul dintre ei'}, în locul lui cumpără un portar. Ne cerem scuze pentru greșeală.`,
    zakaj: (o, ena) => `Primești acest e-mail o singură dată, pentru că ${ena ? 'jucătorul este' : 'jucătorii sunt'} în echipa ta din liga ${o}.`,
  },
  et: {
    zadeva: (k, ena) => `parandasime ${ena ? 'mängija' : 'mängijate'} positsiooni: ${k} (sul pole vaja midagi teha)`,
    predglava: 'Meeskond jääb kehtima, punktid on juba ümber arvutatud.',
    naslov: (ena) => ena ? 'Parandasime mängija positsiooni' : 'Parandasime mängijate positsioonid',
    uvod: (e, ena) => (ena
      ? `Sinu meeskonnas ${e}on mängija, kes oli meil ekslikult väravavahina kirjas.`
      : `Sinu meeskonnas ${e}on mängijad, kes olid meil ekslikult väravavahtidena kirjas.`) +
      ' Meeskond jääb kehtima, <strong>sul pole vaja midagi teha</strong>.',
    igralec: (ena) => ena ? 'Mängija' : 'Mängijad',
    prej: 'Varem', vratar: 'väravavaht', zdaj: 'Nüüd',
    polje: (ena) => ena ? 'saab punkte väljakumängijana' : 'saavad punkte väljakumängijatena',
    tocke: 'Punktid', preracunano: 'viimane voor on juba ümber arvutatud',
    gumb: 'Vaata meeskonda',
    opomba: (ena) => `${ena ? 'Kui ta müüd' : 'Kui müüd mõne neist'}, osta tema asemele väravavaht. Vabandame vea pärast.`,
    zakaj: (o, ena) => `Saad selle kirja ühe korra, sest ${ena ? 'see mängija on' : 'need mängijad on'} sinu meeskonnas (liiga: ${o}).`,
  },
  pl: {
    zadeva: (k, ena) => `poprawiliśmy pozycję ${ena ? 'zawodnika' : 'zawodników'} ${k} (nic nie musisz robić)`,
    predglava: 'Drużyna pozostaje ważna, punkty są już przeliczone.',
    naslov: (ena) => ena ? 'Poprawiliśmy pozycję zawodnika' : 'Poprawiliśmy pozycje zawodników',
    uvod: (e, ena) => (ena
      ? `W drużynie ${e}masz zawodnika, który był u nas błędnie zapisany jako bramkarz.`
      : `W drużynie ${e}masz zawodników, którzy byli u nas błędnie zapisani jako bramkarze.`) +
      ' Drużyna pozostaje ważna, <strong>nic nie musisz robić</strong>.',
    igralec: (ena) => ena ? 'Zawodnik' : 'Zawodnicy',
    prej: 'Wcześniej', vratar: 'bramkarz', zdaj: 'Teraz',
    polje: (ena) => ena ? 'zdobywa punkty jako zawodnik z pola' : 'zdobywają punkty jako zawodnicy z pola',
    tocke: 'Punkty', preracunano: 'ostatnia kolejka jest już przeliczona',
    gumb: 'Zobacz drużynę',
    opomba: (ena) => `${ena ? 'Jeśli go sprzedasz' : 'Jeśli sprzedasz któregoś z nich'}, w jego miejsce kup bramkarza. Przepraszamy za pomyłkę.`,
    zakaj: (o, ena) => `Tę wiadomość dostajesz raz, bo ${ena ? 'ten zawodnik jest' : 'ci zawodnicy są'} w twojej drużynie w lidze ${o}.`,
  },
  es: {
    zadeva: (k, ena) => `hemos corregido la posición de ${ena ? 'tu jugador' : 'tus jugadores'} ${k} (no tienes que hacer nada)`,
    predglava: 'Tu equipo sigue siendo válido y los puntos ya están recalculados.',
    naslov: (ena) => ena ? 'Hemos corregido la posición de un jugador' : 'Hemos corregido la posición de varios jugadores',
    uvod: (e, ena) => (ena
      ? `En tu equipo ${e}tienes un jugador que teníamos registrado por error como portero.`
      : `En tu equipo ${e}tienes jugadores que teníamos registrados por error como porteros.`) +
      ' El equipo sigue siendo válido, <strong>no tienes que hacer nada</strong>.',
    igralec: (ena) => ena ? 'Jugador' : 'Jugadores',
    prej: 'Antes', vratar: 'portero', zdaj: 'Ahora',
    polje: (ena) => ena ? 'puntúa como jugador de campo' : 'puntúan como jugadores de campo',
    tocke: 'Puntos', preracunano: 'la última jornada ya está recalculada',
    gumb: 'Ver mi equipo',
    opomba: (ena) => `${ena ? 'Si lo vendes' : 'Si vendes alguno'}, compra un portero en su lugar. Perdona el error.`,
    zakaj: (o, ena) => `Recibes este correo una sola vez porque ${ena ? 'este jugador está' : 'estos jugadores están'} en tu equipo de la liga ${o}.`,
  },
  lv: {
    zadeva: (k, ena) => `izlabojām ${ena ? 'spēlētāja' : 'spēlētāju'} pozīciju: ${k} (tev nekas nav jādara)`,
    predglava: 'Komanda paliek derīga, punkti jau ir pārrēķināti.',
    naslov: (ena) => ena ? 'Izlabojām spēlētāja pozīciju' : 'Izlabojām spēlētāju pozīcijas',
    uvod: (e, ena) => (ena
      ? `Tavā komandā ${e}ir spēlētājs, kurš pie mums kļūdaini bija reģistrēts kā vārtsargs.`
      : `Tavā komandā ${e}ir spēlētāji, kuri pie mums kļūdaini bija reģistrēti kā vārtsargi.`) +
      ' Komanda paliek derīga, <strong>tev nekas nav jādara</strong>.',
    igralec: (ena) => ena ? 'Spēlētājs' : 'Spēlētāji',
    prej: 'Iepriekš', vratar: 'vārtsargs', zdaj: 'Tagad',
    polje: (ena) => ena ? 'saņem punktus kā laukuma spēlētājs' : 'saņem punktus kā laukuma spēlētāji',
    tocke: 'Punkti', preracunano: 'pēdējā kārta jau ir pārrēķināta',
    gumb: 'Skatīt komandu',
    opomba: (ena) => `${ena ? 'Ja viņu pārdosi' : 'Ja pārdosi kādu no viņiem'}, viņa vietā nopērc vārtsargu. Atvainojamies par kļūdu.`,
    zakaj: (o, ena) => `Šo vēstuli saņem vienreiz, jo ${ena ? 'šis spēlētājs ir' : 'šie spēlētāji ir'} tavā komandā (līga: ${o}).`,
  },
  mk: {
    zadeva: (k, ena) => `ја поправивме позицијата на ${ena ? 'играчот' : 'играчите'} ${k} (не мора ништо да правиш)`,
    predglava: 'Тимот останува исправен, поените се веќе пресметани одново.',
    naslov: (ena) => ena ? 'Ја поправивме позицијата на играч' : 'Ги поправивме позициите на играчи',
    uvod: (e, ena) => (ena
      ? `Во тимот ${e}имаш играч кој по грешка го водевме како голман.`
      : `Во тимот ${e}имаш играчи кои по грешка ги водевме како голмани.`) +
      ' Тимот останува исправен, <strong>не мора ништо да правиш</strong>.',
    igralec: (ena) => ena ? 'Играч' : 'Играчи',
    prej: 'Претходно', vratar: 'голман', zdaj: 'Сега',
    polje: (ena) => ena ? 'добива поени како играч од поле' : 'добиваат поени како играчи од поле',
    tocke: 'Поени', preracunano: 'последното коло е веќе пресметано одново',
    gumb: 'Погледни го тимот',
    opomba: (ena) => `${ena ? 'Ако го продадеш' : 'Ако продадеш некого од нив'}, на неговото место купи голман. Се извинуваме за грешката.`,
    zakaj: (o, ena) => `Оваа порака ја добиваш еднаш, затоа што ${ena ? 'овој играч е' : 'овие играчи се'} во твојот тим (лига: ${o}).`,
  },
  el: {
    zadeva: (k, ena) => `διορθώσαμε τη θέση ${ena ? 'του παίκτη' : 'των παικτών'} ${k} (δεν χρειάζεται να κάνεις τίποτα)`,
    predglava: 'Η ομάδα σου παραμένει έγκυρη, οι πόντοι έχουν ήδη υπολογιστεί ξανά.',
    naslov: (ena) => ena ? 'Διορθώσαμε τη θέση ενός παίκτη' : 'Διορθώσαμε τις θέσεις παικτών',
    uvod: (e, ena) => (ena
      ? `Στην ομάδα σου ${e}έχεις έναν παίκτη που κατά λάθος είχαμε ως τερματοφύλακα.`
      : `Στην ομάδα σου ${e}έχεις παίκτες που κατά λάθος είχαμε ως τερματοφύλακες.`) +
      ' Η ομάδα παραμένει έγκυρη, <strong>δεν χρειάζεται να κάνεις τίποτα</strong>.',
    igralec: (ena) => ena ? 'Παίκτης' : 'Παίκτες',
    prej: 'Πριν', vratar: 'τερματοφύλακας', zdaj: 'Τώρα',
    polje: (ena) => ena ? 'παίρνει πόντους ως παίκτης γηπέδου' : 'παίρνουν πόντους ως παίκτες γηπέδου',
    tocke: 'Πόντοι', preracunano: 'η τελευταία αγωνιστική έχει ήδη υπολογιστεί ξανά',
    gumb: 'Δες την ομάδα',
    opomba: (ena) => `${ena ? 'Αν τον πουλήσεις' : 'Αν πουλήσεις κάποιον από αυτούς'}, αγόρασε τερματοφύλακα στη θέση του. Ζητούμε συγγνώμη για το λάθος.`,
    zakaj: (o, ena) => `Λαμβάνεις αυτό το μήνυμα μία φορά, επειδή ${ena ? 'ο παίκτης είναι' : 'οι παίκτες είναι'} στην ομάδα σου (πρωτάθλημα: ${o}).`,
  },
  tr: {
    zadeva: (k) => `oyuncunun mevkisi düzeltildi: ${k} (bir şey yapman gerekmiyor)`,
    predglava: 'Takımın geçerli kalıyor, puanlar yeniden hesaplandı.',
    naslov: (ena) => ena ? 'Bir oyuncunun mevkisini düzelttik' : 'Oyuncuların mevkilerini düzelttik',
    uvod: (e, ena) => `${e ? `${e.trim()} takımında` : 'Takımında'} ` + (ena
      ? 'yanlışlıkla kaleci olarak kaydettiğimiz bir oyuncu var.'
      : 'yanlışlıkla kaleci olarak kaydettiğimiz oyuncular var.') +
      ' Takımın geçerli kalıyor, <strong>bir şey yapman gerekmiyor</strong>.',
    igralec: (ena) => ena ? 'Oyuncu' : 'Oyuncular',
    prej: 'Önce', vratar: 'kaleci', zdaj: 'Şimdi',
    polje: () => 'saha oyuncusu olarak puan alır',
    tocke: 'Puanlar', preracunano: 'son hafta yeniden hesaplandı',
    gumb: 'Takımımı gör',
    opomba: (ena) => `${ena ? 'Onu satarsan' : 'Birini satarsan'} yerine bir kaleci al. Hata için özür dileriz.`,
    zakaj: (o, ena) => `Bu e-postayı bir kez alıyorsun, çünkü ${ena ? 'bu oyuncu' : 'bu oyuncular'} takımında (lig: ${o}).`,
  },
  uk: {
    zadeva: (k, ena) => `ми виправили позицію ${ena ? 'гравця' : 'гравців'} ${k} (тобі нічого не треба робити)`,
    predglava: 'Команда залишається дійсною, очки вже перераховано.',
    naslov: (ena) => ena ? 'Ми виправили позицію гравця' : 'Ми виправили позиції гравців',
    uvod: (e, ena) => (ena
      ? `У твоїй команді ${e}є гравець, якого ми помилково вели як воротаря.`
      : `У твоїй команді ${e}є гравці, яких ми помилково вели як воротарів.`) +
      ' Команда залишається дійсною, <strong>тобі нічого не треба робити</strong>.',
    igralec: (ena) => ena ? 'Гравець' : 'Гравці',
    prej: 'Раніше', vratar: 'воротар', zdaj: 'Тепер',
    polje: (ena) => ena ? 'отримує очки як польовий гравець' : 'отримують очки як польові гравці',
    tocke: 'Очки', preracunano: 'останній тур уже перераховано',
    gumb: 'Переглянути команду',
    opomba: (ena) => `${ena ? 'Якщо продаси його' : 'Якщо продаси когось із них'}, купи на його місце воротаря. Перепрошуємо за помилку.`,
    zakaj: (o, ena) => `Цей лист ти отримуєш один раз, бо ${ena ? 'цей гравець є' : 'ці гравці є'} у твоїй команді (ліга: ${o}).`,
  },
  hy: {
    zadeva: (k) => `ուղղեցինք խաղացողի դիրքը. ${k} (ոչինչ անել պետք չէ)`,
    predglava: 'Թիմը մնում է վավեր, միավորներն արդեն վերահաշվարկված են։',
    naslov: (ena) => ena ? 'Ուղղեցինք խաղացողի դիրքը' : 'Ուղղեցինք խաղացողների դիրքերը',
    uvod: (e, ena) => `Քո ${e}թիմում ` + (ena
      ? 'կա խաղացող, որին սխալմամբ հաշվառել էինք որպես դարպասապահ։'
      : 'կան խաղացողներ, որոնց սխալմամբ հաշվառել էինք որպես դարպասապահներ։') +
      ' Թիմը մնում է վավեր, <strong>ոչինչ անել պետք չէ</strong>։',
    igralec: (ena) => ena ? 'Խաղացող' : 'Խաղացողներ',
    prej: 'Նախկինում', vratar: 'դարպասապահ', zdaj: 'Այժմ',
    polje: () => 'միավորներ է ստանում որպես դաշտային խաղացող',
    tocke: 'Միավորներ', preracunano: 'վերջին տուրն արդեն վերահաշվարկված է',
    gumb: 'Դիտել թիմը',
    opomba: (ena) => `${ena ? 'Եթե վաճառես նրան' : 'Եթե վաճառես նրանցից որևէ մեկին'}, նրա փոխարեն դարպասապահ գնիր։ Ներողություն ենք խնդրում սխալի համար։`,
    zakaj: (o) => `Այս նամակը ստանում ես մեկ անգամ, քանի որ խաղացողը քո թիմում է (լիգա՝ ${o})։`,
  },
  az: {
    zadeva: (k) => `oyunçunun mövqeyini düzəltdik: ${k} (heç nə etməli deyilsən)`,
    predglava: 'Komanda qaydalara uyğun qalır, xallar artıq yenidən hesablanıb.',
    naslov: (ena) => ena ? 'Oyunçunun mövqeyini düzəltdik' : 'Oyunçuların mövqeyini düzəltdik',
    uvod: (e, ena) => `Komandanda ${e ? `(${e.trim()}) ` : ''}` + (ena
      ? 'səhvən qapıçı kimi qeyd etdiyimiz bir oyunçu var.'
      : 'səhvən qapıçı kimi qeyd etdiyimiz oyunçular var.') +
      ' Komanda qaydalara uyğun qalır, <strong>heç nə etməli deyilsən</strong>.',
    igralec: (ena) => ena ? 'Oyunçu' : 'Oyunçular',
    prej: 'Əvvəl', vratar: 'qapıçı', zdaj: 'İndi',
    polje: () => 'meydan oyunçusu kimi xal alır',
    tocke: 'Xallar', preracunano: 'son tur artıq yenidən hesablanıb',
    gumb: 'Komandama bax',
    opomba: (ena) => `${ena ? 'Onu satsan' : 'Onlardan birini satsan'}, yerinə qapıçı al. Səhvə görə üzr istəyirik.`,
    zakaj: (o, ena) => `Bu məktubu bir dəfə alırsan, çünki ${ena ? 'bu oyunçu' : 'bu oyunçular'} komandandadır (liqa: ${o}).`,
  },
  da: {
    zadeva: (k, ena) => `vi har rettet ${ena ? 'en spillers' : 'spilleres'} position: ${k} (du skal ikke gøre noget)`,
    predglava: 'Dit hold er stadig gyldigt, og pointene er allerede genberegnet.',
    naslov: (ena) => ena ? 'Vi har rettet en spillers position' : 'Vi har rettet spilleres positioner',
    uvod: (e, ena) => (ena
      ? `På dit hold ${e}har du en spiller, som vi ved en fejl havde registreret som målmand.`
      : `På dit hold ${e}har du spillere, som vi ved en fejl havde registreret som målmænd.`) +
      ' Holdet er stadig gyldigt, <strong>du skal ikke gøre noget</strong>.',
    igralec: (ena) => ena ? 'Spiller' : 'Spillere',
    prej: 'Før', vratar: 'målmand', zdaj: 'Nu',
    polje: (ena) => ena ? 'får point som markspiller' : 'får point som markspillere',
    tocke: 'Point', preracunano: 'seneste runde er allerede genberegnet',
    gumb: 'Se mit hold',
    opomba: (ena) => `${ena ? 'Sælger du ham' : 'Sælger du en af dem'}, så køb en målmand i hans sted. Vi beklager fejlen.`,
    zakaj: (o, ena) => `Du får denne mail én gang, fordi ${ena ? 'spilleren er' : 'spillerne er'} på dit hold (liga: ${o}).`,
  },
  en: {
    zadeva: (k, ena) => `we fixed the position of ${ena ? 'your player' : 'your players'} ${k} (nothing to do)`,
    predglava: 'Your team stays valid and the points are already recalculated.',
    naslov: (ena) => ena ? 'We fixed a player’s position' : 'We fixed some players’ positions',
    uvod: (e, ena) => (ena
      ? `Your team ${e}has a player we had listed as a goalkeeper by mistake.`
      : `Your team ${e}has players we had listed as goalkeepers by mistake.`) +
      ' Your team stays valid, <strong>you don’t need to do anything</strong>.',
    igralec: (ena) => ena ? 'Player' : 'Players',
    prej: 'Before', vratar: 'goalkeeper', zdaj: 'Now',
    polje: (ena) => ena ? 'scores as an outfield player' : 'score as outfield players',
    tocke: 'Points', preracunano: 'the last round is already recalculated',
    gumb: 'View my team',
    opomba: (ena) => `${ena ? 'If you sell him' : 'If you sell one of them'}, buy a goalkeeper in his place. Sorry for the mistake.`,
    zakaj: (o, ena) => `You get this email once because ${ena ? 'this player is' : 'these players are'} in your team in ${o}.`,
  },
}

export function sestaviPopravekPozicije(
  liga: Liga,
  meta: {
    display_name: string | null
    team_name: string | null
    igralci: Array<{ ime: string; pozicija: string | null }>
  },
): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const B = POPRAVEK[j]
  const ena = meta.igralci.length <= 1
  const e = meta.team_name ? `<strong>${esc(meta.team_name)}</strong> ` : ''
  const kdo = meta.igralci
    .map((i) => {
      const poz = POZICIJA[j][i.pozicija ?? '']
      return `<strong>${esc(i.ime)}</strong>${poz ? ` (${ZDAJ[j]} ${esc(poz)})` : ''}`
    })
    .join(', ')
  return sestavi(j, {
    zadeva: `SLFF ${liga.oznaka}: ${B.zadeva(meta.igralci.map((i) => i.ime).join(', '), ena)}`,
    predglava: B.predglava,
    oznaka: liga.oznaka,
    naslov: B.naslov(ena),
    uvod: `${pozdrav(j, meta.display_name)} ${B.uvod(e, ena)}`,
    dejstva: [
      { k: B.igralec(ena), v: kdo },
      { k: B.prej, v: esc(B.vratar) },
      { k: B.zdaj, v: esc(B.polje(ena)) },
      { k: B.tocke, v: esc(B.preracunano) },
    ],
    gumb: { label: B.gumb, url: p.ekipa },
    opomba: B.opomba(ena),
    zakaj: B.zakaj(liga.oznaka, ena),
  })
}

// --- izstop kluba ------------------------------------------------------------
//
// Klub je med sezono izstopil iz lige (Tržič 2012, mladinci, 2026/27). Igralec
// ostane v kadru in ekipa je z njim veljavna, točk pa ne bo več dobival:
// lastnik mora to izvedeti, sicer igra z mrtvim mestom do konca sezone.
// Rok naslednjega kroga je neobvezen; brez njega vrstice ni. Brez odjave.

interface BesedilaIzstopa {
  /** "<klub> je izstopil iz lige"; `k` je ime kluba (tekst ali HTML) ali null. */
  izstopil: (k: string | null) => string
  /** "zamenjaj N igralcev" (za zadevo, z malo začetnico). */
  zamenjaj: (n: number) => string
  /** Rok v zadevi. */
  doRoka: (kdaj: string) => string
  predglava: (n: number) => string
  naslov: (n: number) => string
  /** Drugi stavek uvoda; `e` je "<strong>ekipa</strong> " ali prazno. */
  uvod: (e: string, n: number) => string
  igralci: (n: number) => string
  zamenjajDo: string
  gumb: (n: number) => string
  opomba: (n: number) => string
  zakaj: (ozn: string, n: number) => string
}

const veliko = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const IZSTOP: Record<Jezik, BesedilaIzstopa> = {
  sl: {
    izstopil: (k) => `${k ? `Klub ${k}` : 'Klub tvojega igralca'} je izstopil iz lige`,
    zamenjaj: (n) => `zamenjaj ${n} ${slMn(n, 'igralca', 'igralca', 'igralce', 'igralcev')}`,
    doRoka: (k) => ` do ${k}`,
    predglava: (n) => `Ekipa ostane veljavna, a ${slMn(n, 'ta igralec ne bo', 'ta dva igralca ne bosta', 'ti igralci ne bodo', 'ti igralci ne bodo')} več ${slMn(n, 'dobil', 'dobila', 'dobili', 'dobili')} točk.`,
    naslov: (n) => `Zamenjaj ${n} ${slMn(n, 'igralca', 'igralca', 'igralce', 'igralcev')}`,
    uvod: (e, n) => slMn(n,
      `Njegov igralec v ekipi ${e}ne bo več igral in ne bo dobil točk.`,
      `Njegova igralca v ekipi ${e}ne bosta več igrala in ne bosta dobila točk.`,
      `Njegovi igralci v ekipi ${e}ne bodo več igrali in ne bodo dobili točk.`,
      `Njegovi igralci v ekipi ${e}ne bodo več igrali in ne bodo dobili točk.`),
    igralci: (n) => slMn(n, 'Igralec', 'Igralca', 'Igralci', 'Igralci'),
    zamenjajDo: 'Zamenjaj do',
    gumb: (n) => n === 1 ? 'Zamenjaj igralca' : 'Zamenjaj igralce',
    opomba: (n) => `Ekipa ostane veljavna, točke z odigranih tekem ti ostanejo. ${slMn(n, 'Tega igralca', 'Teh dveh igralcev', 'Teh igralcev', 'Teh igralcev')} ne more nihče več kupiti.`,
    zakaj: (o, n) => `Ta mail dobiš enkrat, ker ${slMn(n, 'je igralec', 'sta igralca', 'so igralci', 'so igralci')} v tvoji ekipi v ligi ${o}.`,
  },
  sk: {
    izstopil: (k) => `${k ? `Klub ${k}` : 'Klub tvojho hráča'} odstúpil zo súťaže`,
    zamenjaj: (n) => `vymeň ${n} ${skMn(n, 'hráča', 'hráčov', 'hráčov')}`,
    doRoka: (k) => ` (uzávierka: ${k})`,
    predglava: (n) => n === 1 ? 'Tím zostáva platný, ale tento hráč už nezíska body.' : 'Tím zostáva platný, ale títo hráči už nezískajú body.',
    naslov: (n) => `Vymeň ${n} ${skMn(n, 'hráča', 'hráčov', 'hráčov')}`,
    uvod: (e, n) => n === 1
      ? `Jeho hráč v tíme ${e}už nebude hrať a nezíska body.`
      : `Jeho hráči v tíme ${e}už nebudú hrať a nezískajú body.`,
    igralci: (n) => n === 1 ? 'Hráč' : 'Hráči',
    zamenjajDo: 'Vymeň do',
    gumb: (n) => n === 1 ? 'Vymeniť hráča' : 'Vymeniť hráčov',
    opomba: (n) => `Tím zostáva platný, body z odohraných zápasov ti zostávajú. ${n === 1 ? 'Tohto hráča' : 'Týchto hráčov'} už nemôže kúpiť nikto.`,
    zakaj: (o, n) => `Tento e-mail dostaneš raz, lebo ${n === 1 ? 'tohto hráča' : 'týchto hráčov'} máš v tíme v lige ${o}.`,
  },
  hr: {
    izstopil: (k) => `${k ? `Klub ${k}` : 'Klub tvog igrača'} istupio je iz lige`,
    zamenjaj: (n) => `zamijeni ${n} ${hrMn(n, 'igrača', 'igrača', 'igrača')}`,
    doRoka: (k) => ` (rok: ${k})`,
    predglava: (n) => n === 1 ? 'Momčad ostaje valjana, ali taj igrač više neće dobivati bodove.' : 'Momčad ostaje valjana, ali ti igrači više neće dobivati bodove.',
    naslov: (n) => `Zamijeni ${n} ${hrMn(n, 'igrača', 'igrača', 'igrača')}`,
    uvod: (e, n) => n === 1
      ? `Njegov igrač u momčadi ${e}više neće igrati ni dobivati bodove.`
      : `Njegovi igrači u momčadi ${e}više neće igrati ni dobivati bodove.`,
    igralci: (n) => n === 1 ? 'Igrač' : 'Igrači',
    zamenjajDo: 'Zamijeni do',
    gumb: (n) => n === 1 ? 'Zamijeni igrača' : 'Zamijeni igrače',
    opomba: (n) => `Momčad ostaje valjana, bodovi s odigranih utakmica ostaju ti. ${n === 1 ? 'Tog igrača' : 'Te igrače'} više nitko ne može kupiti.`,
    zakaj: (o, n) => `Ovaj e-mail dobivaš jednom jer ${n === 1 ? 'tog igrača' : 'te igrače'} imaš u momčadi u ligi ${o}.`,
  },
  cs: {
    izstopil: (k) => `${k ? `Klub ${k}` : 'Klub tvého hráče'} odstoupil ze soutěže`,
    zamenjaj: (n) => `vyměň ${n} ${skMn(n, 'hráče', 'hráče', 'hráčů')}`,
    doRoka: (k) => ` (uzávěrka: ${k})`,
    predglava: (n) => n === 1 ? 'Tým zůstává platný, ale tento hráč už nezíská body.' : 'Tým zůstává platný, ale tito hráči už nezískají body.',
    naslov: (n) => `Vyměň ${n} ${skMn(n, 'hráče', 'hráče', 'hráčů')}`,
    uvod: (e, n) => n === 1
      ? `Jeho hráč v týmu ${e}už nebude hrát a nezíská body.`
      : `Jeho hráči v týmu ${e}už nebudou hrát a nezískají body.`,
    igralci: (n) => n === 1 ? 'Hráč' : 'Hráči',
    zamenjajDo: 'Vyměň do',
    gumb: (n) => n === 1 ? 'Vyměnit hráče' : 'Vyměnit hráče',
    opomba: (n) => `Tým zůstává platný, body z odehraných zápasů ti zůstávají. ${n === 1 ? 'Tohoto hráče' : 'Tyto hráče'} už nemůže koupit nikdo.`,
    zakaj: (o, n) => `Tento e-mail dostaneš jednou, protože ${n === 1 ? 'tohoto hráče' : 'tyto hráče'} máš v týmu v lize ${o}.`,
  },
  hu: {
    izstopil: (k) => `${k ? `${k} csapata` : 'Egy játékosod klubja'} visszalépett a bajnokságból`,
    zamenjaj: (n) => `cserélj le ${n} játékost`,
    doRoka: (k) => ` (határidő: ${k})`,
    predglava: (n) => n === 1 ? 'A csapatod érvényes marad, de ez a játékos már nem szerez pontot.' : 'A csapatod érvényes marad, de ezek a játékosok már nem szereznek pontot.',
    naslov: (n) => `Cserélj le ${n} játékost`,
    uvod: (e, n) => `A csapatodban ${e ? `(${e.trim()}) ` : ''}` + (n === 1
      ? 'lévő játékosa már nem játszik, és nem szerez pontot.'
      : 'lévő játékosai már nem játszanak, és nem szereznek pontot.'),
    igralci: (n) => n === 1 ? 'Játékos' : 'Játékosok',
    zamenjajDo: 'Csere eddig',
    gumb: (n) => n === 1 ? 'Játékos cseréje' : 'Játékosok cseréje',
    opomba: (n) => `A csapatod érvényes marad, a lejátszott meccseken szerzett pontok megmaradnak. ${n === 1 ? 'Ezt a játékost' : 'Ezeket a játékosokat'} már senki sem veheti meg.`,
    zakaj: (o, n) => `Ezt az e-mailt egyszer kapod, mert ${n === 1 ? 'ez a játékos' : 'ezek a játékosok'} a csapatodban ${n === 1 ? 'van' : 'vannak'} ebben a bajnokságban: ${o}.`,
  },
  de: {
    izstopil: (k) => `${k ?? 'Der Klub eines deiner Spieler'} hat sich aus der Liga zurückgezogen`,
    zamenjaj: (n) => `tausche ${n} Spieler`,
    doRoka: (k) => ` (Deadline: ${k})`,
    predglava: (n) => n === 1 ? 'Dein Team bleibt gültig, aber dieser Spieler holt keine Punkte mehr.' : 'Dein Team bleibt gültig, aber diese Spieler holen keine Punkte mehr.',
    naslov: (n) => `Tausche ${n} Spieler`,
    uvod: (e, n) => n === 1
      ? `Sein Spieler in deinem Team ${e ? `(${e.trim()}) ` : ''}wird nicht mehr spielen und keine Punkte holen.`
      : `Seine Spieler in deinem Team ${e ? `(${e.trim()}) ` : ''}werden nicht mehr spielen und keine Punkte holen.`,
    igralci: () => 'Spieler',
    zamenjajDo: 'Tauschen bis',
    gumb: () => 'Spieler tauschen',
    opomba: (n) => `Dein Team bleibt gültig, die Punkte aus den gespielten Partien bleiben dir. ${n === 1 ? 'Diesen Spieler' : 'Diese Spieler'} kann niemand mehr kaufen.`,
    zakaj: (o, n) => `Du bekommst diese E-Mail einmal, weil ${n === 1 ? 'dieser Spieler' : 'diese Spieler'} in deinem Team in dieser Liga ${n === 1 ? 'ist' : 'sind'}: ${o}.`,
  },
  sr: {
    izstopil: (k) => `${k ? `Klub ${k}` : 'Klub tvog igrača'} istupio je iz lige`,
    zamenjaj: (n) => `zameni ${n} ${hrMn(n, 'igrača', 'igrača', 'igrača')}`,
    doRoka: (k) => ` (rok: ${k})`,
    predglava: (n) => n === 1 ? 'Tim ostaje ispravan, ali taj igrač više neće dobijati bodove.' : 'Tim ostaje ispravan, ali ti igrači više neće dobijati bodove.',
    naslov: (n) => `Zameni ${n} ${hrMn(n, 'igrača', 'igrača', 'igrača')}`,
    uvod: (e, n) => n === 1
      ? `Njegov igrač u timu ${e}više neće igrati ni dobijati bodove.`
      : `Njegovi igrači u timu ${e}više neće igrati ni dobijati bodove.`,
    igralci: (n) => n === 1 ? 'Igrač' : 'Igrači',
    zamenjajDo: 'Zameni do',
    gumb: (n) => n === 1 ? 'Zameni igrača' : 'Zameni igrače',
    opomba: (n) => `Tim ostaje ispravan, bodovi sa odigranih utakmica ostaju ti. ${n === 1 ? 'Tog igrača' : 'Te igrače'} više niko ne može da kupi.`,
    zakaj: (o, n) => `Ovaj imejl dobijaš jednom jer ${n === 1 ? 'tog igrača' : 'te igrače'} imaš u timu u ligi ${o}.`,
  },
  ro: {
    izstopil: (k) => `${k ? `Clubul ${k}` : 'Clubul unui jucător de-al tău'} s-a retras din ligă`,
    zamenjaj: (n) => `înlocuiește ${n} ${roMn(n, 'jucător', 'jucători', 'de jucători')}`,
    doRoka: (k) => ` (termen: ${k})`,
    predglava: (n) => n === 1 ? 'Echipa rămâne validă, dar acest jucător nu mai primește puncte.' : 'Echipa rămâne validă, dar acești jucători nu mai primesc puncte.',
    naslov: (n) => `Înlocuiește ${n} ${roMn(n, 'jucător', 'jucători', 'de jucători')}`,
    uvod: (e, n) => n === 1
      ? `Jucătorul lui din echipa ${e}nu va mai juca și nu va mai primi puncte.`
      : `Jucătorii lui din echipa ${e}nu vor mai juca și nu vor mai primi puncte.`,
    igralci: (n) => n === 1 ? 'Jucător' : 'Jucători',
    zamenjajDo: 'Înlocuiește până la',
    gumb: (n) => n === 1 ? 'Înlocuiește jucătorul' : 'Înlocuiește jucătorii',
    opomba: (n) => `Echipa rămâne validă, punctele din meciurile jucate îți rămân. ${n === 1 ? 'Pe acest jucător' : 'Pe acești jucători'} nu-i mai poate cumpăra nimeni.`,
    zakaj: (o, n) => `Primești acest e-mail o singură dată, pentru că ${n === 1 ? 'jucătorul este' : 'jucătorii sunt'} în echipa ta din liga ${o}.`,
  },
  et: {
    izstopil: (k) => `${k ? `Klubi ${k}` : 'Sinu mängija klubi'} lahkus liigast`,
    zamenjaj: (n) => `vaheta välja ${n} ${n === 1 ? 'mängija' : 'mängijat'}`,
    doRoka: (k) => ` (tähtaeg: ${k})`,
    predglava: (n) => n === 1 ? 'Meeskond jääb kehtima, aga see mängija enam punkte ei saa.' : 'Meeskond jääb kehtima, aga need mängijad enam punkte ei saa.',
    naslov: (n) => `Vaheta välja ${n} ${n === 1 ? 'mängija' : 'mängijat'}`,
    uvod: (e, n) => n === 1
      ? `Tema mängija sinu meeskonnas ${e}enam ei mängi ega saa punkte.`
      : `Tema mängijad sinu meeskonnas ${e}enam ei mängi ega saa punkte.`,
    igralci: (n) => n === 1 ? 'Mängija' : 'Mängijad',
    zamenjajDo: 'Vaheta enne',
    gumb: (n) => n === 1 ? 'Vaheta mängija' : 'Vaheta mängijad',
    opomba: (n) => `Meeskond jääb kehtima, mängitud mängude punktid jäävad sulle. ${n === 1 ? 'Seda mängijat' : 'Neid mängijaid'} ei saa enam keegi osta.`,
    zakaj: (o, n) => `Saad selle kirja ühe korra, sest ${n === 1 ? 'see mängija on' : 'need mängijad on'} sinu meeskonnas (liiga: ${o}).`,
  },
  pl: {
    izstopil: (k) => `${k ? `Klub ${k}` : 'Klub twojego zawodnika'} wycofał się z ligi`,
    zamenjaj: (n) => `wymień ${n} ${plMn(n, 'zawodnika', 'zawodników', 'zawodników', 'zawodnika')}`,
    doRoka: (k) => ` (termin: ${k})`,
    predglava: (n) => n === 1 ? 'Drużyna pozostaje ważna, ale ten zawodnik nie zdobędzie już punktów.' : 'Drużyna pozostaje ważna, ale ci zawodnicy nie zdobędą już punktów.',
    naslov: (n) => `Wymień ${n} ${plMn(n, 'zawodnika', 'zawodników', 'zawodników', 'zawodnika')}`,
    uvod: (e, n) => n === 1
      ? `Jego zawodnik w drużynie ${e}już nie zagra i nie zdobędzie punktów.`
      : `Jego zawodnicy w drużynie ${e}już nie zagrają i nie zdobędą punktów.`,
    igralci: (n) => n === 1 ? 'Zawodnik' : 'Zawodnicy',
    zamenjajDo: 'Wymień do',
    gumb: (n) => n === 1 ? 'Wymień zawodnika' : 'Wymień zawodników',
    opomba: (n) => `Drużyna pozostaje ważna, punkty z rozegranych meczów zostają. ${n === 1 ? 'Tego zawodnika' : 'Tych zawodników'} nikt już nie może kupić.`,
    zakaj: (o, n) => `Tę wiadomość dostajesz raz, bo ${n === 1 ? 'ten zawodnik jest' : 'ci zawodnicy są'} w twojej drużynie w lidze ${o}.`,
  },
  es: {
    izstopil: (k) => `${k ? `El club ${k}` : 'El club de un jugador tuyo'} se ha retirado de la liga`,
    zamenjaj: (n) => `cambia ${n} ${n === 1 ? 'jugador' : 'jugadores'}`,
    doRoka: (k) => ` (cierre: ${k})`,
    predglava: (n) => n === 1 ? 'Tu equipo sigue siendo válido, pero este jugador ya no sumará puntos.' : 'Tu equipo sigue siendo válido, pero estos jugadores ya no sumarán puntos.',
    naslov: (n) => `Cambia ${n} ${n === 1 ? 'jugador' : 'jugadores'}`,
    uvod: (e, n) => n === 1
      ? `Su jugador en tu equipo ${e}ya no jugará ni sumará puntos.`
      : `Sus jugadores en tu equipo ${e}ya no jugarán ni sumarán puntos.`,
    igralci: (n) => n === 1 ? 'Jugador' : 'Jugadores',
    zamenjajDo: 'Cambia antes de',
    gumb: (n) => n === 1 ? 'Cambiar jugador' : 'Cambiar jugadores',
    opomba: (n) => `Tu equipo sigue siendo válido y los puntos de los partidos jugados se quedan contigo. Ya nadie puede fichar ${n === 1 ? 'a este jugador' : 'a estos jugadores'}.`,
    zakaj: (o, n) => `Recibes este correo una sola vez porque ${n === 1 ? 'este jugador está' : 'estos jugadores están'} en tu equipo de la liga ${o}.`,
  },
  lv: {
    izstopil: (k) => `${k ? `Klubs ${k}` : 'Tava spēlētāja klubs'} izstājās no līgas`,
    zamenjaj: (n) => `nomaini ${n} ${lvMn(n, 'spēlētājus', 'spēlētāju', 'spēlētājus')}`,
    doRoka: (k) => ` (termiņš: ${k})`,
    predglava: (n) => n === 1 ? 'Komanda paliek derīga, bet šis spēlētājs vairs nesaņems punktus.' : 'Komanda paliek derīga, bet šie spēlētāji vairs nesaņems punktus.',
    naslov: (n) => `Nomaini ${n} ${lvMn(n, 'spēlētājus', 'spēlētāju', 'spēlētājus')}`,
    uvod: (e, n) => n === 1
      ? `Tā spēlētājs tavā komandā ${e}vairs nespēlēs un nesaņems punktus.`
      : `Tā spēlētāji tavā komandā ${e}vairs nespēlēs un nesaņems punktus.`,
    igralci: (n) => n === 1 ? 'Spēlētājs' : 'Spēlētāji',
    zamenjajDo: 'Nomaini līdz',
    gumb: (n) => n === 1 ? 'Nomainīt spēlētāju' : 'Nomainīt spēlētājus',
    opomba: (n) => `Komanda paliek derīga, punkti no aizvadītajām spēlēm paliek tev. ${n === 1 ? 'Šo spēlētāju' : 'Šos spēlētājus'} vairs neviens nevar nopirkt.`,
    zakaj: (o, n) => `Šo vēstuli saņem vienreiz, jo ${n === 1 ? 'šis spēlētājs ir' : 'šie spēlētāji ir'} tavā komandā (līga: ${o}).`,
  },
  mk: {
    izstopil: (k) => `${k ? `Клубот ${k}` : 'Клубот на твојот играч'} се повлече од лигата`,
    zamenjaj: (n) => `замени ${n} ${mkMn(n, 'играч', 'играчи')}`,
    doRoka: (k) => ` (рок: ${k})`,
    predglava: (n) => n === 1 ? 'Тимот останува исправен, но овој играч повеќе нема да добива поени.' : 'Тимот останува исправен, но овие играчи повеќе нема да добиваат поени.',
    naslov: (n) => `Замени ${n} ${mkMn(n, 'играч', 'играчи')}`,
    uvod: (e, n) => n === 1
      ? `Неговиот играч во тимот ${e}повеќе нема да игра ниту да добива поени.`
      : `Неговите играчи во тимот ${e}повеќе нема да играат ниту да добиваат поени.`,
    igralci: (n) => n === 1 ? 'Играч' : 'Играчи',
    zamenjajDo: 'Замени до',
    gumb: (n) => n === 1 ? 'Замени го играчот' : 'Замени ги играчите',
    opomba: (n) => `Тимот останува исправен, поените од одиграните натпревари ти остануваат. ${n === 1 ? 'Овој играч' : 'Овие играчи'} никој повеќе не може да ги купи.`,
    zakaj: (o, n) => `Оваа порака ја добиваш еднаш, затоа што ${n === 1 ? 'овој играч е' : 'овие играчи се'} во твојот тим (лига: ${o}).`,
  },
  el: {
    izstopil: (k) => `${k ? `Ο σύλλογος ${k}` : 'Ο σύλλογος του παίκτη σου'} αποσύρθηκε από το πρωτάθλημα`,
    zamenjaj: (n) => `αντικατάστησε ${n} ${elMn(n, 'παίκτη', 'παίκτες')}`,
    doRoka: (k) => ` (προθεσμία: ${k})`,
    predglava: (n) => n === 1 ? 'Η ομάδα σου παραμένει έγκυρη, αλλά αυτός ο παίκτης δεν θα παίρνει πια πόντους.' : 'Η ομάδα σου παραμένει έγκυρη, αλλά αυτοί οι παίκτες δεν θα παίρνουν πια πόντους.',
    naslov: (n) => `Αντικατάστησε ${n} ${elMn(n, 'παίκτη', 'παίκτες')}`,
    uvod: (e, n) => n === 1
      ? `Ο παίκτης του στην ομάδα σου ${e}δεν θα ξαναπαίξει ούτε θα παίρνει πόντους.`
      : `Οι παίκτες του στην ομάδα σου ${e}δεν θα ξαναπαίξουν ούτε θα παίρνουν πόντους.`,
    igralci: (n) => n === 1 ? 'Παίκτης' : 'Παίκτες',
    zamenjajDo: 'Αντικατάσταση έως',
    gumb: (n) => n === 1 ? 'Αντικατάστησε τον παίκτη' : 'Αντικατάστησε τους παίκτες',
    opomba: (n) => `Η ομάδα παραμένει έγκυρη και οι πόντοι από τους αγώνες που έγιναν μένουν σε σένα. ${n === 1 ? 'Αυτόν τον παίκτη' : 'Αυτούς τους παίκτες'} δεν μπορεί πια να τους αγοράσει κανείς.`,
    zakaj: (o, n) => `Λαμβάνεις αυτό το μήνυμα μία φορά, επειδή ${n === 1 ? 'ο παίκτης είναι' : 'οι παίκτες είναι'} στην ομάδα σου (πρωτάθλημα: ${o}).`,
  },
  tr: {
    izstopil: (k) => `${k ? `${k} kulübü` : 'Oyuncunun kulübü'} ligden çekildi`,
    zamenjaj: (n) => `${n} oyuncuyu değiştir`,
    doRoka: (k) => ` (son tarih: ${k})`,
    predglava: (n) => n === 1 ? 'Takımın geçerli kalıyor, ama bu oyuncu artık puan almayacak.' : 'Takımın geçerli kalıyor, ama bu oyuncular artık puan almayacak.',
    naslov: (n) => `${n} oyuncuyu değiştir`,
    uvod: (e, n) => `${e ? `${e.trim()} takımındaki` : 'Takımındaki'} ` + (n === 1
      ? 'oyuncusu artık oynamayacak ve puan almayacak.'
      : 'oyuncuları artık oynamayacak ve puan almayacak.'),
    igralci: (n) => n === 1 ? 'Oyuncu' : 'Oyuncular',
    zamenjajDo: 'Son tarih',
    gumb: (n) => n === 1 ? 'Oyuncuyu değiştir' : 'Oyuncuları değiştir',
    opomba: (n) => `Takımın geçerli kalıyor, oynanan maçlardaki puanlar sende kalır. ${n === 1 ? 'Bu oyuncuyu' : 'Bu oyuncuları'} artık kimse satın alamaz.`,
    zakaj: (o, n) => `Bu e-postayı bir kez alıyorsun, çünkü ${n === 1 ? 'bu oyuncu' : 'bu oyuncular'} takımında (lig: ${o}).`,
  },
  uk: {
    izstopil: (k) => `${k ? `Клуб ${k}` : 'Клуб твого гравця'} знявся з ліги`,
    zamenjaj: (n) => `заміни ${n} ${ukMn(n, 'гравця', 'гравців', 'гравців', 'гравця')}`,
    doRoka: (k) => ` (дедлайн: ${k})`,
    predglava: (n) => n === 1 ? 'Команда залишається дійсною, але цей гравець більше не отримуватиме очок.' : 'Команда залишається дійсною, але ці гравці більше не отримуватимуть очок.',
    naslov: (n) => `Заміни ${n} ${ukMn(n, 'гравця', 'гравців', 'гравців', 'гравця')}`,
    uvod: (e, n) => n === 1
      ? `Його гравець у твоїй команді ${e}більше не гратиме й не отримуватиме очок.`
      : `Його гравці у твоїй команді ${e}більше не гратимуть і не отримуватимуть очок.`,
    igralci: (n) => n === 1 ? 'Гравець' : 'Гравці',
    zamenjajDo: 'Заміни до',
    gumb: (n) => n === 1 ? 'Замінити гравця' : 'Замінити гравців',
    opomba: (n) => `Команда залишається дійсною, очки за зіграні матчі залишаються тобі. ${n === 1 ? 'Цього гравця' : 'Цих гравців'} більше ніхто не може купити.`,
    zakaj: (o, n) => `Цей лист ти отримуєш один раз, бо ${n === 1 ? 'цей гравець є' : 'ці гравці є'} у твоїй команді (ліга: ${o}).`,
  },
  hy: {
    izstopil: (k) => `${k ? `${k} ակումբը` : 'Քո խաղացողի ակումբը'} դուրս է եկել լիգայից`,
    zamenjaj: (n) => `փոխարինիր ${n} խաղացողի`,
    doRoka: (k) => ` (վերջնաժամկետ՝ ${k})`,
    predglava: () => 'Թիմը մնում է վավեր, բայց այդ խաղացողներն այլևս միավորներ չեն ստանա։',
    naslov: (n) => `Փոխարինիր ${n} խաղացողի`,
    uvod: (e) => `Նրա խաղացողները քո ${e}թիմում այլևս չեն խաղա և միավորներ չեն ստանա։`,
    igralci: (n) => n === 1 ? 'Խաղացող' : 'Խաղացողներ',
    zamenjajDo: 'Փոխարինել մինչև',
    gumb: () => 'Փոխարինել խաղացողներին',
    opomba: () => 'Թիմը մնում է վավեր, անցկացված խաղերի միավորները մնում են քեզ։ Այլևս ոչ ոք չի կարող գնել այդ խաղացողներին։',
    zakaj: (o) => `Այս նամակը ստանում ես մեկ անգամ, քանի որ այդ խաղացողները քո թիմում են (լիգա՝ ${o})։`,
  },
  az: {
    izstopil: (k) => `${k ? `${k} klubu` : 'Oyunçunun klubu'} liqadan çıxıb`,
    zamenjaj: (n) => `${n} oyunçunu əvəz et`,
    doRoka: (k) => ` (son tarix: ${k})`,
    predglava: (n) => n === 1 ? 'Komanda qaydalara uyğun qalır, amma bu oyunçu daha xal almayacaq.' : 'Komanda qaydalara uyğun qalır, amma bu oyunçular daha xal almayacaq.',
    naslov: (n) => `${n} oyunçunu əvəz et`,
    uvod: (e, n) => `${e ? `${e.trim()} komandandakı` : 'Komandandakı'} ` + (n === 1
      ? 'oyunçusu artıq oynamayacaq və xal almayacaq.'
      : 'oyunçuları artıq oynamayacaq və xal almayacaq.'),
    igralci: (n) => n === 1 ? 'Oyunçu' : 'Oyunçular',
    zamenjajDo: 'Son tarix',
    gumb: (n) => n === 1 ? 'Oyunçunu əvəz et' : 'Oyunçuları əvəz et',
    opomba: (n) => `Komanda qaydalara uyğun qalır, oynanmış oyunların xalları səndə qalır. ${n === 1 ? 'Bu oyunçunu' : 'Bu oyunçuları'} daha heç kim ala bilməz.`,
    zakaj: (o, n) => `Bu məktubu bir dəfə alırsan, çünki ${n === 1 ? 'bu oyunçu' : 'bu oyunçular'} komandandadır (liqa: ${o}).`,
  },
  da: {
    izstopil: (k) => `${k ? `Klubben ${k}` : 'Din spillers klub'} har trukket sig fra ligaen`,
    zamenjaj: (n) => `skift ${n} ${daMn(n, 'spiller', 'spillere')} ud`,
    doRoka: (k) => ` (deadline: ${k})`,
    predglava: (n) => n === 1 ? 'Holdet er stadig gyldigt, men spilleren får ikke flere point.' : 'Holdet er stadig gyldigt, men spillerne får ikke flere point.',
    naslov: (n) => `Skift ${n} ${daMn(n, 'spiller', 'spillere')} ud`,
    uvod: (e, n) => n === 1
      ? `Klubbens spiller på dit hold ${e}spiller ikke mere og får ikke flere point.`
      : `Klubbens spillere på dit hold ${e}spiller ikke mere og får ikke flere point.`,
    igralci: (n) => n === 1 ? 'Spiller' : 'Spillere',
    zamenjajDo: 'Skift inden',
    gumb: (n) => n === 1 ? 'Skift spilleren ud' : 'Skift spillerne ud',
    opomba: (n) => `Holdet er stadig gyldigt, og pointene fra de spillede kampe beholder du. Ingen kan længere købe ${n === 1 ? 'spilleren' : 'spillerne'}.`,
    zakaj: (o, n) => `Du får denne mail én gang, fordi ${n === 1 ? 'spilleren er' : 'spillerne er'} på dit hold (liga: ${o}).`,
  },
  en: {
    izstopil: (k) => `${k ?? 'Your player’s club'} has withdrawn from the league`,
    zamenjaj: (n) => `replace ${n} ${n === 1 ? 'player' : 'players'}`,
    doRoka: (k) => ` by ${k}`,
    predglava: (n) => n === 1 ? 'Your team stays valid, but this player won’t score any more.' : 'Your team stays valid, but these players won’t score any more.',
    naslov: (n) => `Replace ${n} ${n === 1 ? 'player' : 'players'}`,
    uvod: (e, n) => n === 1
      ? `Its player in your team ${e}won’t play or score points any more.`
      : `Its players in your team ${e}won’t play or score points any more.`,
    igralci: (n) => n === 1 ? 'Player' : 'Players',
    zamenjajDo: 'Replace by',
    gumb: (n) => n === 1 ? 'Replace the player' : 'Replace the players',
    opomba: (n) => `Your team stays valid and the points from matches already played are yours to keep. Nobody can buy ${n === 1 ? 'this player' : 'these players'} any more.`,
    zakaj: (o, n) => `You get this email once because ${n === 1 ? 'this player is' : 'these players are'} in your team in ${o}.`,
  },
}

export function sestaviIzstopKluba(
  liga: Liga,
  meta: {
    display_name: string | null
    team_name: string | null
    igralci: Array<{ ime: string; klub?: string | null }>
    rok?: string | null
  },
): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const B = IZSTOP[j]
  const n = meta.igralci.length
  const klubi = [...new Set(meta.igralci.map((i) => i.klub).filter((k): k is string => !!k))]
  const kdaj = meta.rok ? izpisRoka(meta.rok, liga) : null
  const e = meta.team_name ? `<strong>${esc(meta.team_name)}</strong> ` : ''
  const opozorilo: Vrstica[] = [{ k: B.igralci(n), v: meta.igralci.map((i) => esc(i.ime)).join(', ') }]
  if (kdaj) opozorilo.push({ k: B.zamenjajDo, v: esc(kdaj) })
  return sestavi(j, {
    zadeva: `SLFF ${liga.oznaka}: ${B.izstopil(klubi.length ? klubi.join(', ') : null)}, ${B.zamenjaj(n)}${kdaj ? B.doRoka(kdaj) : ''}`,
    predglava: B.predglava(n),
    oznaka: liga.oznaka,
    naslov: B.naslov(n),
    uvod: `${pozdrav(j, meta.display_name)} ${veliko(B.izstopil(klubi.length ? klubi.map((k) => `<strong>${esc(k)}</strong>`).join(', ') : null))}. ${B.uvod(e, n)}`,
    opozorilo,
    gumb: { label: B.gumb(n), url: p.ekipa },
    opomba: B.opomba(n),
    zakaj: B.zakaj(liga.oznaka, n),
  })
}

// --- tedenski pregled: tvoj krog --------------------------------------------
// Po končanem krogu: točke, mesto na lestvici lige, kapetan, najboljši igralec.
// Brez čestitk za vsako ceno: pohvala le, če je ekipa zbrala največ v ligi.
// Pivo (P.S.) le po krogu nad povprečjem in nikoli v mladinski ligi (mladim
// brez piva; isto pravilo kot SQL `je_mladinski_slug`).

export interface PregledKroga {
  display_name: string | null
  ekipa: string
  krog: number
  tocke: number
  mesto: number
  /** Mesto pred krogom; null, če ekipa prej ni imela točk. */
  mesto_prej: number | null
  ekip: number
  povprecje: number | null
  najvec: number | null
  kapetan: string | null
  kapetan_tocke: number | null
  najboljsi: string | null
  najboljsi_tocke: number | null
  /** Končani dvoboji kroga v mini ligah (`dvoboji_ekipe`); nasprotnik null = povprečje lige. */
  dvoboji?: Array<{ mini_liga: string; nasprotnik: string | null; tocke: number; tocke_nasprotnika: number; izid: 'zmaga' | 'remi' | 'poraz' }>
  /** Napovedi kroga (`povzetek_napovedi_kroga`); brez, če ni napovedoval ali ni ocenjenih. */
  napovedi?: { tocke: number; tocnih: number } | null
}

/** Slovenska množina po zadnjih dveh mestih: 1 / 2 / 3–4 / ostalo. */
const slMn = (n: number, ena: string, dve: string, tri: string, vec: string) => {
  const s = Math.abs(n) % 100
  return s === 1 ? ena : s === 2 ? dve : s === 3 || s === 4 ? tri : vec
}

const jeMladinskiSlug = (slug: string) => /(^|-)(u19|mladinci)($|-)/.test(slug) || /^sml[0-9]/.test(slug)

interface BesedilaPregleda {
  /** Zadeva; `t` je točke z enoto, `pz` premik " (▲2)" ali prazno. */
  zadeva: (krog: number, t: string, mesto: number, pz: string) => string
  /** Naslov v kartici; `e` je ubežano ime ekipe. */
  naslov: (e: string, krog: number) => string
  uvod: string
  top: string
  /** Ploščice: enota točk, mesto (vrednost in oznaka), premik. */
  tocke: string
  mesto: (n: number) => string
  mestoOd: (n: number) => string
  premik: string
  kapetan: string
  najboljsi: string
  liga: string
  povprecje: string
  najvec: string
  gumb: (krog: number) => string
  lestvica: string
  potem: (povezava: string) => string
  pivo: string
  odjava: string
  /** Dvoboj v mini ligi: oznaka, izid in nasprotnik povprečje lige. */
  dvoboj: string
  izid: Record<'zmaga' | 'remi' | 'poraz', string>
  povprecjeLige: string
  napovedi: string
  tocni: string
  zakaj: (ozn: string) => string
}

const PREGLED: Record<Jezik, BesedilaPregleda> = {
  sl: {
    zadeva: (k, t, m, pz) => `${k}. krog: ${t} in ${m}. mesto${pz}`,
    naslov: (e, k) => `${e} v ${k}. krogu`,
    uvod: 'Krog je končan, točke so preračunane iz uradnih zapisnikov.',
    top: 'Največ točk v vsej ligi v tem krogu.',
    tocke: 'točke', mesto: (n) => `${n}.`, mestoOd: (n) => `mesto od ${n}`, premik: 'premik',
    kapetan: 'Kapetan', najboljsi: 'Najboljši', liga: 'Liga', povprecje: 'povprečje', najvec: 'največ',
    gumb: (k) => `Pripravi ekipo za ${k}. krog`,
    lestvica: 'celo lestvico', potem: (l) => `Ali poglej ${l}.`,
    pivo: 'P.S. SLFF je brezplačen in teče na pivu. Če ti je ta krog polepšal ponedeljek, nas počasti z enim, pa dobiš mesto na pivskem zidu:',
    odjava: 'Ne želim več e-pošte',
    dvoboj: 'Dvoboj', izid: { zmaga: 'Zmaga', remi: 'Remi', poraz: 'Poraz' }, povprecjeLige: 'povprečje lige',
    napovedi: 'Napovedi', tocni: 'točni izidi',
    zakaj: (o) => `Pregled dobiš po vsakem krogu, ker imaš ekipo v ligi ${o}.`,
  },
  sk: {
    zadeva: (k, t, m, pz) => `${k}. kolo, ${t}, ${m}. miesto${pz}`,
    naslov: (e, k) => `${e} v ${k}. kole`,
    uvod: 'Kolo sa skončilo, body sú prepočítané z oficiálnych zápisov.',
    top: 'Najviac bodov v celej lige v tomto kole.',
    tocke: 'body', mesto: (n) => `${n}.`, mestoOd: (n) => `miesto z ${n}`, premik: 'posun',
    kapetan: 'Kapitán', najboljsi: 'Najlepší', liga: 'Liga', povprecje: 'priemer', najvec: 'najviac',
    gumb: (k) => `Priprav tím na ${k}. kolo`,
    lestvica: 'celú tabuľku', potem: (l) => `Alebo si pozri ${l}.`,
    pivo: 'P.S. SLFF je zadarmo a beží na pive. Ak ti toto kolo spríjemnilo pondelok, pozvi nás na jedno a získaš miesto na pivnej stene:',
    odjava: 'Nechcem už dostávať e-maily',
    dvoboj: 'Duel', izid: { zmaga: 'Výhra', remi: 'Remíza', poraz: 'Prehra' }, povprecjeLige: 'priemer ligy',
    napovedi: 'Tipy', tocni: 'presné výsledky',
    zakaj: (o) => `Prehľad dostávaš po každom kole, lebo máš tím v lige ${o}.`,
  },
  hr: {
    zadeva: (k, t, m, pz) => `${k}. kolo, ${t}, ${m}. mjesto${pz}`,
    naslov: (e, k) => `${e} u ${k}. kolu`,
    uvod: 'Kolo je završeno, bodovi su izračunati iz službenih zapisnika.',
    top: 'Najviše bodova u cijeloj ligi u ovom kolu.',
    tocke: 'bodovi', mesto: (n) => `${n}.`, mestoOd: (n) => `mjesto od ${n}`, premik: 'pomak',
    kapetan: 'Kapetan', najboljsi: 'Najbolji', liga: 'Liga', povprecje: 'prosjek', najvec: 'najviše',
    gumb: (k) => `Pripremi momčad za ${k}. kolo`,
    lestvica: 'cijelu ljestvicu', potem: (l) => `Ili pogledaj ${l}.`,
    pivo: 'P.S. SLFF je besplatan i radi na pivu. Ako ti je ovo kolo uljepšalo ponedjeljak, počasti nas jednim i dobij mjesto na pivskom zidu:',
    odjava: 'Ne želim više primati e-mailove',
    dvoboj: 'Dvoboj', izid: { zmaga: 'Pobjeda', remi: 'Neriješeno', poraz: 'Poraz' }, povprecjeLige: 'prosjek lige',
    napovedi: 'Prognoze', tocni: 'točni rezultati',
    zakaj: (o) => `Pregled dobivaš nakon svakog kola jer imaš momčad u ligi ${o}.`,
  },
  cs: {
    zadeva: (k, t, m, pz) => `${k}. kolo, ${t}, ${m}. místo${pz}`,
    naslov: (e, k) => `${e} v ${k}. kole`,
    uvod: 'Kolo skončilo, body jsou přepočítané z oficiálních zápisů.',
    top: 'Nejvíc bodů v celé lize v tomto kole.',
    tocke: 'body', mesto: (n) => `${n}.`, mestoOd: (n) => `místo z ${n}`, premik: 'posun',
    kapetan: 'Kapitán', najboljsi: 'Nejlepší', liga: 'Liga', povprecje: 'průměr', najvec: 'nejvíc',
    gumb: (k) => `Připrav tým na ${k}. kolo`,
    lestvica: 'celý žebříček', potem: (l) => `Nebo se podívej na ${l}.`,
    pivo: 'P.S. SLFF je zdarma a běží na pivu. Jestli ti tohle kolo zpříjemnilo pondělí, kup nám jedno a získáš místo na pivní zdi:',
    odjava: 'Nechci už dostávat e-maily',
    dvoboj: 'Duel', izid: { zmaga: 'Výhra', remi: 'Remíza', poraz: 'Prohra' }, povprecjeLige: 'průměr ligy',
    napovedi: 'Tipy', tocni: 'přesné výsledky',
    zakaj: (o) => `Přehled dostáváš po každém kole, protože máš tým v lize ${o}.`,
  },
  // Madžarščina: člen a/az pred številko je odvisen od izgovora, zato
  // stavki številko postavijo brez člena.
  hu: {
    zadeva: (k, t, m, pz) => `${k}. forduló, ${t}, ${m}. hely${pz}`,
    naslov: (e, k) => `${e}: ${k}. forduló`,
    uvod: 'A forduló véget ért, a pontokat a hivatalos jegyzőkönyvekből számoltuk.',
    top: 'Ebben a fordulóban a te csapatod szerezte a legtöbb pontot az egész bajnokságban.',
    tocke: 'pont', mesto: (n) => `${n}.`, mestoOd: (n) => `hely, ${n} csapat közül`, premik: 'változás',
    kapetan: 'Csapatkapitány', najboljsi: 'Legjobb', liga: 'Bajnokság', povprecje: 'átlag', najvec: 'legtöbb',
    gumb: (k) => `Csapat felkészítése: ${k}. forduló`,
    lestvica: 'a teljes tabellát', potem: (l) => `Vagy nézd meg ${l}.`,
    pivo: 'U.i. Az SLFF ingyenes, és sörből működik. Ha ez a forduló feldobta a hétfődet, hívj meg minket egyre, és felkerülsz a sörfalra:',
    odjava: 'Nem kérek több e-mailt',
    dvoboj: 'Párharc', izid: { zmaga: 'Győzelem', remi: 'Döntetlen', poraz: 'Vereség' }, povprecjeLige: 'liga átlaga',
    napovedi: 'Tippek', tocni: 'pontos eredmények',
    zakaj: (o) => `Az összefoglalót minden forduló után megkapod, mert van csapatod ebben a bajnokságban: ${o}.`,
  },
  de: {
    zadeva: (k, t, m, pz) => `Runde ${k}, ${t}, Platz ${m}${pz}`,
    naslov: (e, k) => `${e} in Runde ${k}`,
    uvod: 'Die Runde ist vorbei, die Punkte sind aus den offiziellen Spielberichten berechnet.',
    top: 'Die meisten Punkte der ganzen Liga in dieser Runde.',
    tocke: 'Punkte', mesto: (n) => `${n}.`, mestoOd: (n) => `Platz von ${n}`, premik: 'Veränderung',
    kapetan: 'Kapitän', najboljsi: 'Bester', liga: 'Liga', povprecje: 'Schnitt', najvec: 'am meisten',
    gumb: (k) => `Team für Runde ${k} bereit machen`,
    lestvica: 'die ganze Tabelle', potem: (l) => `Oder schau dir ${l} an.`,
    pivo: 'PS: SLFF ist kostenlos und läuft mit Bier. Wenn dir diese Runde den Montag versüßt hat, spendier uns eins und hol dir einen Platz an der Bierwand:',
    odjava: 'Keine E-Mails mehr',
    dvoboj: 'Duell', izid: { zmaga: 'Sieg', remi: 'Remis', poraz: 'Niederlage' }, povprecjeLige: 'Ligaschnitt',
    napovedi: 'Tipps', tocni: 'exakte Ergebnisse',
    zakaj: (o) => `Du bekommst die Übersicht nach jeder Runde, weil du ein Team in dieser Liga hast: ${o}.`,
  },
  sr: {
    zadeva: (k, t, m, pz) => `${k}. kolo, ${t}, ${m}. mesto${pz}`,
    naslov: (e, k) => `${e} u ${k}. kolu`,
    uvod: 'Kolo je završeno, bodovi su izračunati iz zvaničnih zapisnika.',
    top: 'Najviše bodova u celoj ligi u ovom kolu.',
    tocke: 'bodovi', mesto: (n) => `${n}.`, mestoOd: (n) => `mesto od ${n}`, premik: 'pomeranje',
    kapetan: 'Kapiten', najboljsi: 'Najbolji', liga: 'Liga', povprecje: 'prosek', najvec: 'najviše',
    gumb: (k) => `Pripremi tim za ${k}. kolo`,
    lestvica: 'celu tabelu', potem: (l) => `Ili pogledaj ${l}.`,
    pivo: 'P.S. SLFF je besplatan i radi na pivu. Ako ti je ovo kolo ulepšalo ponedeljak, časti nas jednim i dobij mesto na pivskom zidu:',
    odjava: 'Ne želim više da primam imejlove',
    dvoboj: 'Dvoboj', izid: { zmaga: 'Pobeda', remi: 'Nerešeno', poraz: 'Poraz' }, povprecjeLige: 'prosek lige',
    napovedi: 'Prognoze', tocni: 'tačni rezultati',
    zakaj: (o) => `Pregled dobijaš posle svakog kola jer imaš tim u ligi ${o}.`,
  },
  ro: {
    zadeva: (k, t, m, pz) => `etapa ${k}, ${t}, locul ${m}${pz}`,
    naslov: (e, k) => `${e} în etapa ${k}`,
    uvod: 'Etapa s-a încheiat, punctele sunt calculate din rapoartele oficiale.',
    top: 'Cele mai multe puncte din toată liga în această etapă.',
    tocke: 'puncte', mesto: (n) => `${n}`, mestoOd: (n) => `locul din ${n}`, premik: 'evoluție',
    kapetan: 'Căpitan', najboljsi: 'Cel mai bun', liga: 'Liga', povprecje: 'media', najvec: 'maximul',
    gumb: (k) => `Pregătește echipa pentru etapa ${k}`,
    lestvica: 'tot clasamentul', potem: (l) => `Sau vezi ${l}.`,
    pivo: 'P.S. SLFF este gratuit și merge cu bere. Dacă etapa asta ți-a înseninat ziua de luni, fă-ne cinste cu una și primești un loc pe zidul berilor:',
    odjava: 'Nu mai vreau e-mailuri',
    dvoboj: 'Duel', izid: { zmaga: 'Victorie', remi: 'Egal', poraz: 'Înfrângere' }, povprecjeLige: 'media ligii',
    napovedi: 'Pronosticuri', tocni: 'scoruri exacte',
    zakaj: (o) => `Primești rezumatul după fiecare etapă pentru că ai o echipă în liga ${o}.`,
  },
  et: {
    zadeva: (k, t, m, pz) => `${k}. voor, ${t}, ${m}. koht${pz}`,
    naslov: (e, k) => `${e}: ${k}. voor`,
    uvod: 'Voor on läbi, punktid on arvutatud ametlikest protokollidest.',
    top: 'Kogu liiga kõige rohkem punkte selles voorus.',
    tocke: 'punktid', mesto: (n) => `${n}.`, mestoOd: (n) => `koht ${n} meeskonnast`, premik: 'muutus',
    kapetan: 'Kapten', najboljsi: 'Parim', liga: 'Liiga', povprecje: 'keskmine', najvec: 'parim',
    gumb: (k) => `Valmista meeskond ${k}. vooruks ette`,
    lestvica: 'kogu edetabelit', potem: (l) => `Või vaata ${l}.`,
    pivo: 'P.S. SLFF on tasuta ja töötab õlle peal. Kui see voor tegi su esmaspäeva paremaks, osta meile üks ja saad koha õlleseinal:',
    odjava: 'Ma ei soovi enam kirju',
    dvoboj: 'Duell', izid: { zmaga: 'Võit', remi: 'Viik', poraz: 'Kaotus' }, povprecjeLige: 'liiga keskmine',
    napovedi: 'Ennustused', tocni: 'täpsed tulemused',
    zakaj: (o) => `Saad ülevaate pärast iga vooru, sest sul on meeskond (liiga: ${o}).`,
  },
  pl: {
    zadeva: (k, t, m, pz) => `${k}. kolejka, ${t}, ${m}. miejsce${pz}`,
    naslov: (e, k) => `${e} w ${k}. kolejce`,
    uvod: 'Kolejka zakończona, punkty są przeliczone z oficjalnych protokołów.',
    top: 'Najwięcej punktów w całej lidze w tej kolejce.',
    tocke: 'punkty', mesto: (n) => `${n}.`, mestoOd: (n) => `miejsce z ${n}`, premik: 'zmiana',
    kapetan: 'Kapitan', najboljsi: 'Najlepszy', liga: 'Liga', povprecje: 'średnia', najvec: 'najwięcej',
    gumb: (k) => `Przygotuj drużynę na ${k}. kolejkę`,
    lestvica: 'cały ranking', potem: (l) => `Albo zobacz ${l}.`,
    pivo: 'P.S. SLFF jest darmowy i działa na piwie. Jeśli ta kolejka umiliła ci poniedziałek, postaw nam jedno i zdobądź miejsce na ścianie piw:',
    odjava: 'Nie chcę więcej e-maili',
    dvoboj: 'Pojedynek', izid: { zmaga: 'Wygrana', remi: 'Remis', poraz: 'Porażka' }, povprecjeLige: 'średnia ligi',
    napovedi: 'Typy', tocni: 'dokładne wyniki',
    zakaj: (o) => `Podsumowanie dostajesz po każdej kolejce, bo masz drużynę w lidze ${o}.`,
  },
  es: {
    zadeva: (k, t, m, pz) => `jornada ${k}, ${t}, ${m}.º puesto${pz}`,
    naslov: (e, k) => `${e} en la jornada ${k}`,
    uvod: 'La jornada ha terminado y los puntos están calculados a partir de las actas oficiales.',
    top: 'La mejor puntuación de toda la liga en esta jornada.',
    tocke: 'puntos', mesto: (n) => `${n}.º`, mestoOd: (n) => `puesto de ${n}`, premik: 'cambio',
    kapetan: 'Capitán', najboljsi: 'El mejor', liga: 'Liga', povprecje: 'media', najvec: 'máximo',
    gumb: (k) => `Prepara el equipo para la jornada ${k}`,
    lestvica: 'la clasificación completa', potem: (l) => `O mira ${l}.`,
    pivo: 'P. D. SLFF es gratis y funciona a base de cañas. Si esta jornada te ha alegrado el lunes, invítanos a una y consigue un sitio en el muro de cañas:',
    odjava: 'No quiero más correos',
    dvoboj: 'Duelo', izid: { zmaga: 'Victoria', remi: 'Empate', poraz: 'Derrota' }, povprecjeLige: 'media de la liga',
    napovedi: 'Pronósticos', tocni: 'resultados exactos',
    zakaj: (o) => `Recibes el resumen tras cada jornada porque tienes equipo en la liga ${o}.`,
  },
  lv: {
    zadeva: (k, t, m, pz) => `${k}. kārta, ${t}, ${m}. vieta${pz}`,
    naslov: (e, k) => `${e}: ${k}. kārta`,
    uvod: 'Kārta ir beigusies, punkti aprēķināti no oficiālajiem protokoliem.',
    top: 'Visvairāk punktu visā līgā šajā kārtā.',
    tocke: 'punkti', mesto: (n) => `${n}.`, mestoOd: (n) => `vieta no ${n}`, premik: 'izmaiņa',
    kapetan: 'Kapteinis', najboljsi: 'Labākais', liga: 'Līga', povprecje: 'vidējais', najvec: 'labākais',
    gumb: (k) => `Sagatavot komandu ${k}. kārtai`,
    lestvica: 'visu kopvērtējumu', potem: (l) => `Vai apskati ${l}.`,
    pivo: 'P.S. SLFF ir bez maksas un darbojas uz alus. Ja šī kārta tev padarīja pirmdienu labāku, uzsauc mums vienu un iegūsti vietu uz alus sienas:',
    odjava: 'Vairs nevēlos saņemt e-pastus',
    dvoboj: 'Duelis', izid: { zmaga: 'Uzvara', remi: 'Neizšķirts', poraz: 'Zaudējums' }, povprecjeLige: 'līgas vidējais',
    napovedi: 'Prognozes', tocni: 'precīzi rezultāti',
    zakaj: (o) => `Pārskatu saņem pēc katras kārtas, jo tev ir komanda (līga: ${o}).`,
  },
  mk: {
    zadeva: (k, t, m, pz) => `${k}. коло, ${t}, ${m}. место${pz}`,
    naslov: (e, k) => `${e} во ${k}. коло`,
    uvod: 'Колото заврши, поените се пресметани од официјалните записници.',
    top: 'Најмногу поени во целата лига во ова коло.',
    tocke: 'поени', mesto: (n) => `${n}.`, mestoOd: (n) => `место од ${n}`, premik: 'промена',
    kapetan: 'Капитен', najboljsi: 'Најдобар', liga: 'Лига', povprecje: 'просек', najvec: 'најмногу',
    gumb: (k) => `Подготви го тимот за ${k}. коло`,
    lestvica: 'целата табела', potem: (l) => `Или погледни ја ${l}.`,
    pivo: 'П.С. SLFF е бесплатен и работи на пиво. Ако ова коло ти го разубави понеделникот, почести нè со едно и добиј место на ѕидот на пива:',
    odjava: 'Не сакам повеќе да добивам пораки',
    dvoboj: 'Дуел', izid: { zmaga: 'Победа', remi: 'Нерешено', poraz: 'Пораз' }, povprecjeLige: 'просек на лигата',
    napovedi: 'Прогнози', tocni: 'точни резултати',
    zakaj: (o) => `Прегледот го добиваш по секое коло затоа што имаш тим (лига: ${o}).`,
  },
  el: {
    zadeva: (k, t, m, pz) => `${k}η αγωνιστική, ${t}, ${m}η θέση${pz}`,
    naslov: (e, k) => `${e} στην ${k}η αγωνιστική`,
    uvod: 'Η αγωνιστική ολοκληρώθηκε, οι πόντοι υπολογίστηκαν από τα επίσημα φύλλα αγώνα.',
    top: 'Η καλύτερη βαθμολογία σε όλο το πρωτάθλημα σε αυτή την αγωνιστική.',
    tocke: 'πόντοι', mesto: (n) => `${n}η`, mestoOd: (n) => `θέση από ${n}`, premik: 'μεταβολή',
    kapetan: 'Αρχηγός', najboljsi: 'Ο καλύτερος', liga: 'Πρωτάθλημα', povprecje: 'μέσος όρος', najvec: 'ρεκόρ',
    gumb: (k) => `Ετοίμασε την ομάδα για την ${k}η αγωνιστική`,
    lestvica: 'ολόκληρη την κατάταξη', potem: (l) => `Ή δες ${l}.`,
    pivo: 'Υ.Γ. Το SLFF είναι δωρεάν και δουλεύει με μπίρα. Αν αυτή η αγωνιστική σού έφτιαξε τη Δευτέρα, κέρασέ μας μία και πάρε μια θέση στον τοίχο της μπίρας:',
    odjava: 'Δεν θέλω άλλα email',
    dvoboj: 'Μονομαχία', izid: { zmaga: 'Νίκη', remi: 'Ισοπαλία', poraz: 'Ήττα' }, povprecjeLige: 'μέσος όρος λίγκας',
    napovedi: 'Προβλέψεις', tocni: 'ακριβή σκορ',
    zakaj: (o) => `Λαμβάνεις τη σύνοψη μετά από κάθε αγωνιστική επειδή έχεις ομάδα (πρωτάθλημα: ${o}).`,
  },
  tr: {
    zadeva: (k, t, m, pz) => `${k}. hafta, ${t}, ${m}. sıra${pz}`,
    naslov: (e, k) => `${e}: ${k}. hafta`,
    uvod: 'Hafta bitti, puanlar resmî maç raporlarından hesaplandı.',
    top: 'Bu hafta tüm ligdeki en yüksek puan.',
    tocke: 'puan', mesto: (n) => `${n}.`, mestoOd: (n) => `sıra, ${n} takım içinde`, premik: 'değişim',
    kapetan: 'Kaptan', najboljsi: 'En iyi', liga: 'Lig', povprecje: 'ortalama', najvec: 'en yüksek',
    gumb: (k) => `Takımını ${k}. haftaya hazırla`,
    lestvica: 'puan durumunun tamamına', potem: (l) => `Ya da ${l} göz at.`,
    pivo: 'Not: SLFF ücretsiz ve biraya çalışıyor. Bu hafta pazartesini güzelleştirdiyse bize bir bira ısmarla, bira duvarında yerini al:',
    odjava: 'Artık e-posta almak istemiyorum',
    dvoboj: 'Düello', izid: { zmaga: 'Galibiyet', remi: 'Beraberlik', poraz: 'Mağlubiyet' }, povprecjeLige: 'lig ortalaması',
    napovedi: 'Tahminler', tocni: 'tam skorlar',
    zakaj: (o) => `Bu özeti her haftadan sonra alıyorsun çünkü takımın var (lig: ${o}).`,
  },
  uk: {
    zadeva: (k, t, m, pz) => `${k}-й тур, ${t}, № ${m}${pz}`,
    naslov: (e, k) => `${e} у ${k}-му турі`,
    uvod: 'Тур завершено, очки пораховано за офіційними протоколами.',
    top: 'Найбільше очок у всій лізі в цьому турі.',
    tocke: 'очки', mesto: (n) => `${n}`, mestoOd: (n) => `місце з ${n}`, premik: 'зміна',
    kapetan: 'Капітан', najboljsi: 'Найкращий', liga: 'Ліга', povprecje: 'середнє', najvec: 'найбільше',
    gumb: (k) => `Підготувати команду до ${k}-го туру`,
    lestvica: 'весь рейтинг', potem: (l) => `Або переглянь ${l}.`,
    pivo: 'P.S. SLFF безкоштовний і працює на пиві. Якщо цей тур зробив твій понеділок кращим, пригости нас кухлем і отримай місце на пивній стіні:',
    odjava: 'Більше не хочу отримувати листи',
    dvoboj: 'Дуель', izid: { zmaga: 'Перемога', remi: 'Нічия', poraz: 'Поразка' }, povprecjeLige: 'середнє ліги',
    napovedi: 'Прогнози', tocni: 'точні рахунки',
    zakaj: (o) => `Огляд ти отримуєш після кожного туру, бо маєш команду (ліга: ${o}).`,
  },
  hy: {
    zadeva: (k, t, m, pz) => `տուր ${k}, ${t}, ${hyDas(m)} տեղ${pz}`,
    naslov: (e, k) => `${e}՝ տուր ${k}`,
    uvod: 'Տուրն ավարտվեց, միավորները հաշվարկված են պաշտոնական արձանագրություններից։',
    top: 'Այս տուրում ամենաշատ միավորն ամբողջ լիգայում։',
    tocke: 'միավոր', mesto: (n) => hyDas(n), mestoOd: (n) => `տեղ ${n} թիմից`, premik: 'փոփոխություն',
    kapetan: 'Ավագ', najboljsi: 'Լավագույնը', liga: 'Լիգա', povprecje: 'միջինը', najvec: 'առավելագույնը',
    gumb: (k) => `Պատրաստիր թիմը տուր ${k}-ի համար`,
    lestvica: 'ամբողջ աղյուսակը', potem: (l) => `Կամ նայիր ${l}։`,
    pivo: 'Հ.Գ. SLFF-ն անվճար է և աշխատում է գարեջրով։ Եթե այս տուրը գեղեցկացրեց քո երկուշաբթին, հյուրասիրիր մեզ մեկ գարեջուր և տեղ ստացիր գարեջրի պատին:',
    odjava: 'Այլևս չեմ ուզում նամակներ ստանալ',
    dvoboj: 'Մենամարտ', izid: { zmaga: 'Հաղթանակ', remi: 'Ոչ-ոքի', poraz: 'Պարտություն' }, povprecjeLige: 'լիգայի միջինը',
    napovedi: 'Կանխատեսումներ', tocni: 'ճշգրիտ հաշիվներ',
    zakaj: (o) => `Ամփոփումը ստանում ես յուրաքանչյուր տուրից հետո, քանի որ թիմ ունես (լիգա՝ ${o})։`,
  },
  az: {
    zadeva: (k, t, m, pz) => `tur ${k}, ${t}, yer ${m}${pz}`,
    naslov: (e, k) => `${e}: tur ${k}`,
    uvod: 'Tur başa çatdı, xallar rəsmi protokollardan hesablandı.',
    top: 'Bu turda bütün liqada ən çox xal.',
    tocke: 'xal', mesto: (n) => `${n}`, mestoOd: (n) => `yer, ${n} komanda arasında`, premik: 'dəyişiklik',
    kapetan: 'Kapitan', najboljsi: 'Ən yaxşı', liga: 'Liqa', povprecje: 'orta', najvec: 'ən çox',
    gumb: (k) => `Komandanı tur ${k} üçün hazırla`,
    lestvica: 'bütün cədvələ', potem: (l) => `Və ya ${l} bax.`,
    pivo: 'P.S. SLFF pulsuzdur və pivə ilə işləyir. Bu tur bazar ertəni gözəlləşdiribsə, bizi birinə qonaq et və pivə divarında yer al:',
    odjava: 'Daha məktub almaq istəmirəm',
    dvoboj: 'Duel', izid: { zmaga: 'Qələbə', remi: 'Heç-heçə', poraz: 'Məğlubiyyət' }, povprecjeLige: 'liqanın ortalaması',
    napovedi: 'Proqnozlar', tocni: 'dəqiq hesablar',
    zakaj: (o) => `Xülasəni hər turdan sonra alırsan, çünki komandan var (liqa: ${o}).`,
  },
  da: {
    zadeva: (k, t, m, pz) => `${k}. runde, ${t}, ${m}. plads${pz}`,
    naslov: (e, k) => `${e} i ${k}. runde`,
    uvod: 'Runden er slut, og pointene er regnet ud fra de officielle kamprapporter.',
    top: 'Flest point i hele ligaen i denne runde.',
    tocke: 'point', mesto: (n) => `${n}.`, mestoOd: (n) => `plads af ${n}`, premik: 'ændring',
    kapetan: 'Kaptajn', najboljsi: 'Bedst', liga: 'Liga', povprecje: 'gennemsnit', najvec: 'højeste',
    gumb: (k) => `Gør holdet klar til ${k}. runde`,
    lestvica: 'hele ranglisten', potem: (l) => `Eller se ${l}.`,
    pivo: 'PS: SLFF er gratis og kører på øl. Gjorde denne runde din mandag bedre, så giv os en og få en plads på ølvæggen:',
    odjava: 'Jeg vil ikke have flere mails',
    dvoboj: 'Duel', izid: { zmaga: 'Sejr', remi: 'Uafgjort', poraz: 'Nederlag' }, povprecjeLige: 'ligaens gennemsnit',
    napovedi: 'Tips', tocni: 'præcise resultater',
    zakaj: (o) => `Du får overblikket efter hver runde, fordi du har et hold (liga: ${o}).`,
  },
  en: {
    zadeva: (k, t, m, pz) => `round ${k}, ${t}, ${enMesto(m)} place${pz}`,
    naslov: (e, k) => `${e} in round ${k}`,
    uvod: 'The round is over and points are calculated from the official match reports.',
    top: 'The highest score in the whole league this round.',
    tocke: 'points', mesto: (n) => enMesto(n), mestoOd: (n) => `place of ${n}`, premik: 'movement',
    kapetan: 'Captain', najboljsi: 'Best', liga: 'League', povprecje: 'average', najvec: 'highest',
    gumb: (k) => `Get your team ready for round ${k}`,
    lestvica: 'the full table', potem: (l) => `Or see ${l}.`,
    pivo: 'P.S. SLFF is free and runs on beer. If this round made your Monday better, buy us one and get a spot on the beer wall:',
    odjava: 'Stop these emails',
    dvoboj: 'Head-to-head', izid: { zmaga: 'Win', remi: 'Draw', poraz: 'Loss' }, povprecjeLige: 'league average',
    napovedi: 'Predictions', tocni: 'exact scores',
    zakaj: (o) => `You get this summary after every round because you have a team in ${o}.`,
  },
}

export function sestaviTedenskiPregled(liga: Liga, m: PregledKroga): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const ozn = liga.oznaka
  const B = PREGLED[j]
  const st = (n: number) => n.toLocaleString(LOKALE[j], { maximumFractionDigits: 1 })
  const cela = (n: number) => Number.isInteger(n) ? n : 5 // decimalke: množina "ostalo"
  const tock = (n: number) =>
    `${st(n)} ${
      j === 'sk'
        ? (Number.isInteger(n) ? skMn(n, 'bod', 'body', 'bodov') : 'bodu')
        : j === 'hr' || j === 'sr'
          ? hrMn(cela(n), 'bod', 'boda', 'bodova')
          : j === 'cs'
            ? (Number.isInteger(n) ? skMn(n, 'bod', 'body', 'bodů') : 'bodu')
            : j === 'hu'
              ? 'pont' // madžarščina za številom ne pozna množine
              : j === 'de'
                ? (n === 1 ? 'Punkt' : 'Punkte')
                : j === 'ro'
                  ? roMn(cela(n), 'punct', 'puncte', 'de puncte')
                  : j === 'et'
                    ? (n === 1 ? 'punkt' : 'punkti')
                    : j === 'pl'
                      ? plMn(n, 'punkt', 'punkty', 'punktów', 'punktu')
                      : j === 'es'
                        ? (n === 1 ? 'punto' : 'puntos')
                        : j === 'lv'
                          ? lvMn(n, 'punktu', 'punkts', 'punkti')
                          : j === 'mk'
                            ? mkMn(n, 'поен', 'поени')
                            : j === 'el'
                              ? elMn(n, 'πόντος', 'πόντοι')
                            : j === 'tr'
                              ? 'puan' // turščina za številom ne pozna množine
                            : j === 'uk'
                              ? ukMn(n, 'очко', 'очки', 'очок', 'очка')
                            : j === 'hy'
                              ? 'միավոր'
                            : j === 'az'
                              ? 'xal' // azerbajdžanščina za številom ne pozna množine
                            : j === 'da'
                              ? 'point' // danščina: "1 point", "2 point", "2,5 point"
                            : j === 'en'
                              ? (n === 1 ? 'point' : 'points')
                            : slMn(cela(n), 'točka', 'točki', 'točke', 'točk')
    }`
  const premik = m.mesto_prej == null ? 0 : m.mesto_prej - m.mesto
  const premikZnak = premik > 0 ? ` (▲${premik})` : premik < 0 ? ` (▼${-premik})` : ''
  const najboljsiVLigi = m.najvec != null && m.tocke >= m.najvec && m.ekip > 1
  const najboljsiNiKapetan = !!m.najboljsi && m.najboljsi !== m.kapetan
  // Pivo le po dobrem krogu (točke in vsaj povprečje lige) in nikoli mladim.
  const dobrKrog = m.tocke > 0 && m.povprecje != null && m.tocke >= m.povprecje
  const pivo = dobrKrog && !jeMladinskiSlug(liga.slug)

  const ploscice: Vrstica[] = [
    { v: esc(st(m.tocke)), k: B.tocke },
    { v: esc(B.mesto(m.mesto)), k: B.mestoOd(m.ekip) },
  ]
  if (premik !== 0)
    ploscice.push({
      v: `<span style="color: ${premik > 0 ? '#059468' : '#5b6b63'};">${premik > 0 ? '▲' : '▼'} ${Math.abs(premik)}</span>`,
      k: B.premik,
    })

  const dejstva: Vrstica[] = []
  const predglava: string[] = []
  if (m.kapetan) {
    dejstva.push({ k: B.kapetan, v: `${esc(m.kapetan)} · ${esc(tock(m.kapetan_tocke ?? 0))}` })
    predglava.push(`${B.kapetan} ${m.kapetan}: ${tock(m.kapetan_tocke ?? 0)}`)
  }
  if (najboljsiNiKapetan) {
    dejstva.push({ k: B.najboljsi, v: `${esc(m.najboljsi!)} · ${esc(tock(m.najboljsi_tocke ?? 0))}` })
    predglava.push(`${B.najboljsi} ${m.najboljsi}: ${tock(m.najboljsi_tocke ?? 0)}`)
  }
  // Mini lige: končani dvoboji kroga in točke napovedi.
  for (const d of m.dvoboji ?? []) {
    const proti = d.nasprotnik ?? B.povprecjeLige
    dejstva.push({
      k: `${B.dvoboj} · ${esc(d.mini_liga)}`,
      v: `<strong>${esc(B.izid[d.izid])}</strong> ${esc(st(d.tocke))}:${esc(st(d.tocke_nasprotnika))} · ${esc(proti)}`,
    })
    predglava.push(`${B.dvoboj}: ${B.izid[d.izid]} ${st(d.tocke)}:${st(d.tocke_nasprotnika)}`)
  }
  if (m.napovedi) {
    dejstva.push({ k: B.napovedi, v: esc(`${tock(m.napovedi.tocke)} · ${B.tocni} ${m.napovedi.tocnih}`) })
    predglava.push(`${B.napovedi}: ${tock(m.napovedi.tocke)}`)
  }
  if (m.povprecje != null && m.najvec != null) {
    dejstva.push({ k: B.liga, v: esc(`${B.povprecje} ${st(m.povprecje)} · ${B.najvec} ${st(m.najvec)}`) })
    predglava.push(`${B.liga}: ${B.povprecje} ${st(m.povprecje)}`)
  }

  const zadeva = j === 'sl'
    ? `SLFF ${ozn}, ${m.krog}. krog: ${tock(m.tocke)} in ${m.mesto}. mesto${premikZnak}`
    : `SLFF ${ozn}: ${B.zadeva(m.krog, tock(m.tocke), m.mesto, premikZnak)}`

  return sestavi(j, {
    zadeva,
    predglava: predglava.length ? predglava.join(' · ') : B.uvod,
    oznaka: ozn,
    naslov: B.naslov(esc(m.ekipa), m.krog),
    ploscice,
    uvod: `${pozdrav(j, m.display_name)} ${B.uvod}${najboljsiVLigi ? ` <strong>${B.top}</strong>` : ''}`,
    dejstva,
    gumb: { label: B.gumb(m.krog + 1), url: p.ekipa },
    potem: B.potem(povezava(B.lestvica, `${SITE}/table?t=${encodeURIComponent(liga.slug)}`)),
    ...(pivo ? { opomba: `${B.pivo} ${povezava('slff.eu/pivo', `${SITE}/pivo?src=mail-krog`)}` } : {}),
    zakaj: B.zakaj(ozn),
  }, p.odjava, B.odjava)
}

// --- pivo 7 dni po prvi ekipi -----------------------------------------------
// Enkratni mail teden po tem, ko je človek sestavil prvo (nehišno) ekipo:
// sproščena zahvala in povabilo na "eno pivo" (`/pivo?src=mail-7dni`), brez
// pritiska. Kdo ga dobi, določi `kandidati_za_pivo_7dni` (enkrat na človeka,
// brez `brez_opomnikov`). Mladinske lige ga nikoli ne dobijo (mladim brez
// piva): SQL jih izloči, liga za jezik je prva nemladinska ekipa.

interface BesedilaPiva {
  zadeva: string
  predglava: string
  naslov: string
  uvod: string
  gumb: string
  nasvet: string
  podpis: string
  zakaj: string
}

const PIVO_7DNI: Record<Jezik, BesedilaPiva> = {
  sl: {
    zadeva: 'Teden v SLFF: kako ti gre?',
    predglava: 'SLFF je brezplačen in tak tudi ostane. Eno pivo pa vseeno sprejmemo.',
    naslov: 'Prvi teden je za tabo',
    uvod: 'Tvoja ekipa je zdaj v igri že en teden. SLFF je brezplačen in tak tudi ostane. No, pa tudi nam lahko plačaš eno pivo — lej, kako zabavno igrico smo naredili. Če bi nas srečal po tekmi, bi nam sigurno dal za pivo.',
    gumb: 'Častim pivo 🍺',
    nasvet: 'Nasvet: pred rokom preveri kapetana, ker dobi trojne točke.',
    podpis: 'Na zdravje, Lovro, SLFF',
    zakaj: 'Ta mail dobiš le enkrat, teden po tem, ko si na slff.eu sestavil/a prvo ekipo.',
  },
  sk: {
    zadeva: 'Týždeň v SLFF: ako sa ti darí?',
    predglava: 'SLFF je zadarmo a taký aj zostane. Jedno pivo však neodmietneme.',
    naslov: 'Prvý týždeň máš za sebou',
    uvod: 'Tvoj tím je v hre už týždeň. SLFF je zadarmo a taký aj zostane. Ale môžeš nám kúpiť jedno pivo, pozri, akú zábavnú hru sme spravili. Keby si nás stretol po zápase, určite by si nám dal na pivo.',
    gumb: 'Kúpim vám pivo 🍺',
    nasvet: 'Tip: pred uzávierkou skontroluj kapitána, dostáva trojnásobné body.',
    podpis: 'Na zdravie, Lovro, SLFF',
    zakaj: 'Tento e-mail dostaneš iba raz, týždeň po tom, čo si na slff.eu zostavil/a prvý tím.',
  },
  hr: {
    zadeva: 'Tjedan u SLFF-u: kako ti ide?',
    predglava: 'SLFF je besplatan i takav će ostati. Ali jedno pivo nećemo odbiti.',
    naslov: 'Prvi tjedan je iza tebe',
    uvod: 'Tvoja momčad je u igri već tjedan dana. SLFF je besplatan i takav će ostati. Ali možeš nas častiti jednim pivom, vidi kako smo zabavnu igricu napravili. Da nas sretneš nakon utakmice, sigurno bi nam platio pivo.',
    gumb: 'Častim pivo 🍺',
    nasvet: 'Savjet: prije roka provjeri kapetana, on dobiva trostruke bodove.',
    podpis: 'Živio, Lovro, SLFF',
    zakaj: 'Ovaj e-mail dobivaš samo jednom, tjedan dana nakon što si na slff.eu složio/la prvu momčad.',
  },
  cs: {
    zadeva: 'Týden v SLFF: jak se ti daří?',
    predglava: 'SLFF je zdarma a takový i zůstane. Jedno pivo ale neodmítneme.',
    naslov: 'První týden máš za sebou',
    uvod: 'Tvůj tým je ve hře už týden. SLFF je zdarma a takový i zůstane. Ale můžeš nám koupit jedno pivo, koukni, jakou zábavnou hru jsme udělali. Kdybys nás potkal po zápase, určitě bys nám dal na pivo.',
    gumb: 'Koupím vám pivo 🍺',
    nasvet: 'Tip: před uzávěrkou zkontroluj kapitána, dostává trojnásobné body.',
    podpis: 'Na zdraví, Lovro, SLFF',
    zakaj: 'Tento e-mail dostaneš jen jednou, týden poté, co sis na slff.eu sestavil/a první tým.',
  },
  hu: {
    zadeva: 'Egy hét az SLFF-ben: hogy megy?',
    predglava: 'Az SLFF ingyenes, és az is marad. Egy sört azért elfogadunk.',
    naslov: 'Az első heted megvan',
    uvod: 'A csapatod már egy hete játékban van. Az SLFF ingyenes, és az is marad. De meghívhatsz minket egy sörre, nézd, milyen jó kis játékot csináltunk. Ha meccs után összefutnánk, biztos fizetnél nekünk egy sört.',
    gumb: 'Fizetek egy sört 🍺',
    nasvet: 'Tipp: a határidő előtt nézd meg a csapatkapitányt, ő háromszoros pontot kap.',
    podpis: 'Egészségedre, Lovro, SLFF',
    zakaj: 'Ezt az e-mailt csak egyszer kapod meg, egy héttel azután, hogy összeraktad az első csapatodat az slff.eu-n.',
  },
  de: {
    zadeva: 'Eine Woche SLFF: wie läuft’s?',
    predglava: 'SLFF ist gratis und bleibt es auch. Ein Bier nehmen wir trotzdem gern.',
    naslov: 'Die erste Woche ist geschafft',
    uvod: 'Dein Team ist jetzt seit einer Woche im Spiel. SLFF ist gratis und bleibt es auch. Du kannst uns aber auf ein Bier einladen, schau, was für ein lustiges Spiel wir gebaut haben. Würdest du uns nach dem Match treffen, würdest du uns sicher eins ausgeben.',
    gumb: 'Ein Bier ausgeben 🍺',
    nasvet: 'Tipp: Check vor der Deadline deinen Kapitän, er bekommt dreifache Punkte.',
    podpis: 'Prost, Lovro, SLFF',
    zakaj: 'Diese E-Mail bekommst du nur einmal, eine Woche nachdem du auf slff.eu dein erstes Team zusammengestellt hast.',
  },
  sr: {
    zadeva: 'Nedelja u SLFF-u: kako ti ide?',
    predglava: 'SLFF je besplatan i takav će ostati. Ali jedno pivo nećemo odbiti.',
    naslov: 'Prva nedelja je iza tebe',
    uvod: 'Tvoj tim je u igri već nedelju dana. SLFF je besplatan i takav će ostati. Ali možeš da nas častiš jednim pivom, vidi kakvu smo zabavnu igricu napravili. Da nas sretneš posle utakmice, sigurno bi nam platio pivo.',
    gumb: 'Častim pivo 🍺',
    nasvet: 'Savet: pre roka proveri kapitena, on dobija trostruke bodove.',
    podpis: 'Živeli, Lovro, SLFF',
    zakaj: 'Ovaj imejl dobijaš samo jednom, nedelju dana nakon što si na slff.eu sastavio/la prvi tim.',
  },
  ro: {
    zadeva: 'O săptămână în SLFF: cum merge?',
    predglava: 'SLFF e gratuit și așa rămâne. O bere tot primim.',
    naslov: 'Prima săptămână e gata',
    uvod: 'Echipa ta e în joc de o săptămână. SLFF e gratuit și așa rămâne. Dar ne poți face cinste cu o bere, uite ce joc fain am făcut. Dacă ne-ai întâlni după meci, sigur ne-ai da de o bere.',
    gumb: 'Fac cinste cu o bere 🍺',
    nasvet: 'Sfat: înainte de termen verifică-ți căpitanul, el primește puncte triple.',
    podpis: 'Noroc, Lovro, SLFF',
    zakaj: 'Primești acest e-mail o singură dată, la o săptămână după ce ți-ai făcut prima echipă pe slff.eu.',
  },
  et: {
    zadeva: 'Nädal SLFF-is: kuidas läheb?',
    predglava: 'SLFF on tasuta ja jääbki tasuta. Ühe õlle võtame siiski vastu.',
    naslov: 'Esimene nädal on läbi',
    uvod: 'Sinu meeskond on mängus juba nädal aega. SLFF on tasuta ja jääbki tasuta. Aga sa võid meile ühe õlle välja teha, vaata, kui lõbusa mängu me tegime. Kui sa meid pärast matši kohtaksid, teeksid kindlasti ühe välja.',
    gumb: 'Teen õlle välja 🍺',
    nasvet: 'Nõuanne: kontrolli enne tähtaega kaptenit, ta saab kolmekordsed punktid.',
    podpis: 'Terviseks, Lovro, SLFF',
    zakaj: 'Saad selle kirja ainult üks kord, nädal pärast seda, kui panid slff.eu-s kokku oma esimese meeskonna.',
  },
  pl: {
    zadeva: 'Tydzień w SLFF: jak idzie?',
    predglava: 'SLFF jest darmowy i taki zostanie. Ale jedno piwo przyjmiemy.',
    naslov: 'Pierwszy tydzień za tobą',
    uvod: 'Twoja drużyna gra już od tygodnia. SLFF jest darmowy i taki zostanie. Ale możesz postawić nam jedno piwo, zobacz, jaką fajną gierkę zrobiliśmy. Gdybyś spotkał nas po meczu, na pewno postawiłbyś nam piwo.',
    gumb: 'Stawiam piwo 🍺',
    nasvet: 'Rada: przed terminem sprawdź kapitana, dostaje potrójne punkty.',
    podpis: 'Na zdrowie, Lovro, SLFF',
    zakaj: 'Tę wiadomość dostajesz tylko raz, tydzień po tym, jak ułożyłeś/aś pierwszą drużynę na slff.eu.',
  },
  es: {
    zadeva: 'Una semana en SLFF: ¿qué tal va?',
    predglava: 'SLFF es gratis y seguirá siéndolo. Pero una cerveza no la rechazamos.',
    naslov: 'Primera semana superada',
    uvod: 'Tu equipo lleva ya una semana en juego. SLFF es gratis y seguirá siéndolo. Pero puedes invitarnos a una cerveza, mira qué juego tan divertido hemos hecho. Si nos vieras después del partido, seguro que nos invitarías a una.',
    gumb: 'Os invito a una cerveza 🍺',
    nasvet: 'Consejo: antes del cierre revisa a tu capitán, suma puntos triples.',
    podpis: 'Salud, Lovro, SLFF',
    zakaj: 'Este correo te llega solo una vez, una semana después de crear tu primer equipo en slff.eu.',
  },
  lv: {
    zadeva: 'Nedēļa SLFF: kā iet?',
    predglava: 'SLFF ir bez maksas un tāds arī paliks. Vienu alu gan pieņemsim.',
    naslov: 'Pirmā nedēļa aiz muguras',
    uvod: 'Tava komanda spēlē jau nedēļu. SLFF ir bez maksas un tāds arī paliks. Bet tu vari mums uzsaukt vienu alu, paskaties, cik jautru spēlīti mēs uztaisījām. Ja mūs satiktu pēc spēles, noteikti uzsauktu.',
    gumb: 'Uzsaucu alu 🍺',
    nasvet: 'Padoms: pirms termiņa pārbaudi kapteini, viņš saņem trīskāršus punktus.',
    podpis: 'Priekā, Lovro, SLFF',
    zakaj: 'Šo vēstuli saņem tikai vienreiz, nedēļu pēc tam, kad slff.eu sastādīji pirmo komandu.',
  },
  mk: {
    zadeva: 'Една недела во SLFF: како ти оди?',
    predglava: 'SLFF е бесплатен и таков ќе остане. Но едно пиво не одбиваме.',
    naslov: 'Првата недела е зад тебе',
    uvod: 'Твојот тим е во игра веќе една недела. SLFF е бесплатен и таков ќе остане. Но можеш да не почастиш со едно пиво, види каква забавна игра направивме. Да не сретнеш по натпреварот, сигурно ќе ни платиш пиво.',
    gumb: 'Частам пиво 🍺',
    nasvet: 'Совет: пред рокот провери го капитенот, тој добива тројни поени.',
    podpis: 'На здравје, Lovro, SLFF',
    zakaj: 'Оваа порака ја добиваш само еднаш, една недела откако го состави првиот тим на slff.eu.',
  },
  el: {
    zadeva: 'Μια εβδομάδα στο SLFF: πώς πάει;',
    predglava: 'Το SLFF είναι δωρεάν και θα μείνει δωρεάν. Μια μπίρα όμως δεν τη λέμε όχι.',
    naslov: 'Η πρώτη εβδομάδα πέρασε',
    uvod: 'Η ομάδα σου παίζει ήδη μια εβδομάδα. Το SLFF είναι δωρεάν και θα μείνει δωρεάν. Μπορείς όμως να μας κεράσεις μια μπίρα, δες τι διασκεδαστικό παιχνίδι φτιάξαμε. Αν μας έβρισκες μετά τον αγώνα, σίγουρα θα μας κερνούσες.',
    gumb: 'Κερνάω μια μπίρα 🍺',
    nasvet: 'Συμβουλή: πριν από την προθεσμία έλεγξε τον αρχηγό, παίρνει τριπλούς πόντους.',
    podpis: 'Στην υγειά σου, Lovro, SLFF',
    zakaj: 'Αυτό το μήνυμα το λαμβάνεις μόνο μία φορά, μια εβδομάδα αφού έφτιαξες την πρώτη σου ομάδα στο slff.eu.',
  },
  tr: {
    zadeva: 'SLFF’de bir hafta: nasıl gidiyor?',
    predglava: 'SLFF ücretsiz ve öyle kalacak. Ama bir bira ısmarlarsan hayır demeyiz.',
    naslov: 'İlk hafta geride kaldı',
    uvod: 'Takımın bir haftadır oyunda. SLFF ücretsiz ve öyle kalacak. Ama bize bir bira ısmarlayabilirsin, bak ne eğlenceli bir oyun yaptık. Maçtan sonra bize rastlasan, kesin bir bira ısmarlardın.',
    gumb: 'Bir bira ısmarla 🍺',
    nasvet: 'İpucu: son tarihten önce kaptanını kontrol et, üç kat puan alır.',
    podpis: 'Şerefe, Lovro, SLFF',
    zakaj: 'Bu e-postayı yalnızca bir kez, slff.eu’da ilk takımını kurduktan bir hafta sonra alırsın.',
  },
  uk: {
    zadeva: 'Тиждень у SLFF: як воно?',
    predglava: 'SLFF безкоштовний і таким залишиться. Але від одного пива не відмовимось.',
    naslov: 'Перший тиждень позаду',
    uvod: 'Твоя команда в грі вже тиждень. SLFF безкоштовний і таким залишиться. Але можеш пригостити нас одним пивом, глянь, яку веселу гру ми зробили. Якби ти зустрів нас після матчу, точно пригостив би.',
    gumb: 'Пригощаю пивом 🍺',
    nasvet: 'Порада: перед дедлайном перевір капітана, він отримує потрійні очки.',
    podpis: 'Будьмо, Lovro, SLFF',
    zakaj: 'Цей лист ти отримуєш лише раз, через тиждень після того, як зібрав першу команду на slff.eu.',
  },
  hy: {
    zadeva: 'Մեկ շաբաթ SLFF-ում. ինչպե՞ս է ընթանում',
    predglava: 'SLFF-ն անվճար է և այդպես էլ կմնա։ Բայց մեկ գարեջուրից չենք հրաժարվի։',
    naslov: 'Առաջին շաբաթն անցավ',
    uvod: 'Քո թիմն արդեն մեկ շաբաթ է խաղի մեջ է։ SLFF-ն անվճար է և այդպես էլ կմնա։ Բայց կարող ես մեզ մեկ գարեջուր հյուրասիրել, տես՝ ինչ զվարճալի խաղ ենք սարքել։ Եթե խաղից հետո հանդիպեիր մեզ, հաստատ կհյուրասիրեիր։',
    gumb: 'Հյուրասիրում եմ գարեջուր 🍺',
    nasvet: 'Խորհուրդ. վերջնաժամկետից առաջ ստուգիր ավագին, նա եռապատիկ միավորներ է ստանում։',
    podpis: 'Կենացդ, Lovro, SLFF',
    zakaj: 'Այս նամակը ստանում ես միայն մեկ անգամ՝ slff.eu-ում առաջին թիմդ կազմելուց մեկ շաբաթ անց։',
  },
  az: {
    zadeva: 'SLFF-də bir həftə: necə gedir?',
    predglava: 'SLFF pulsuzdur və elə də qalacaq. Amma bir pivəyə yox demərik.',
    naslov: 'İlk həftə geridə qaldı',
    uvod: 'Komandan artıq bir həftədir oyundadır. SLFF pulsuzdur və elə də qalacaq. Amma bizə bir pivə qonaq edə bilərsən, bax nə əyləncəli oyun düzəltmişik. Matçdan sonra bizə rast gəlsəydin, mütləq bir pivə alardın.',
    gumb: 'Pivə qonaq edirəm 🍺',
    nasvet: 'Məsləhət: son tarixdən əvvəl kapitanını yoxla, o üçqat xal alır.',
    podpis: 'Sağlığına, Lovro, SLFF',
    zakaj: 'Bu məktubu yalnız bir dəfə, slff.eu-da ilk komandanı yığdıqdan bir həftə sonra alırsan.',
  },
  da: {
    zadeva: 'En uge i SLFF: hvordan går det?',
    predglava: 'SLFF er gratis og bliver ved med at være det. Men en øl siger vi ikke nej til.',
    naslov: 'Første uge er klaret',
    uvod: 'Dit hold har været i spil i en uge. SLFF er gratis og bliver ved med at være det. Men du kan give os en øl, se lige hvilket sjovt spil vi har lavet. Hvis du mødte os efter kampen, ville du helt sikkert give en omgang.',
    gumb: 'Giv en øl 🍺',
    nasvet: 'Tip: tjek din kaptajn før deadline, han får tredobbelt point.',
    podpis: 'Skål, Lovro, SLFF',
    zakaj: 'Du får kun denne mail én gang, en uge efter du satte dit første hold på slff.eu.',
  },
  en: {
    zadeva: 'A week of SLFF: how’s it going?',
    predglava: 'SLFF is free and it’s staying free. We won’t say no to a beer, though.',
    naslov: 'First week done',
    uvod: 'Your team has been in the game for a week now. SLFF is free and it’s staying free. But you can buy us a beer: look what a fun little game we made. If you bumped into us after the match, you’d definitely get us one.',
    gumb: 'Buy us a beer 🍺',
    nasvet: 'Tip: check your captain before the deadline, they score triple points.',
    podpis: 'Cheers, Lovro, SLFF',
    zakaj: 'You only get this email once, a week after you built your first team on slff.eu.',
  },
}

export function sestaviPivo7dni(liga: Liga, meta: { display_name: string | null }): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const B = PIVO_7DNI[j]
  return sestavi(j, {
    zadeva: B.zadeva,
    predglava: B.predglava,
    oznaka: liga.oznaka,
    naslov: B.naslov,
    uvod: `${pozdrav(j, meta.display_name)} ${B.uvod}`,
    gumb: { label: B.gumb, url: `${SITE}/pivo?src=mail-7dni` },
    potem: B.nasvet,
    opomba: B.podpis,
    zakaj: B.zakaj,
  }, p.odjava)
}

// --- novost: dvoboji in napovedi v mini ligah --------------------------------
// Enkratni mail (26. 10. 2026) vsem z nehišno ekipo (`kandidati_za_novost_mini_lig`).
// Kdor je že v mini ligi z vsaj dvema ekipama, dobi "Odpri mini ligo", ostali
// "Ustvari mini ligo". Brez piva: gre tudi mladinskim ligam.

interface BesedilaNovosti {
  zadeva: string
  predglava: string
  naslov: string
  uvod: string
  dvoboji: string
  dvobojiV: string
  napovedi: string
  napovediV: string
  gumbVLigi: string
  gumbNova: string
  potemVLigi: string
  potemNova: string
  zakaj: string
}

const NOVOST_MINI_LIG: Record<Jezik, BesedilaNovosti> = {
  sl: {
    zadeva: 'Novo v SLFF: dvoboji in napovedi v mini ligah',
    predglava: 'Vsak krog dvoboj s prijateljem in napoved izidov. Brezplačno, kot vse v SLFF.',
    naslov: 'Mini lige imajo dve novi igri',
    uvod: 'V mini ligah lahko poleg običajne lestvice zdaj igrate še dve igri.',
    dvoboji: 'Dvoboji',
    dvobojiV: 'Vsak krog igraš proti eni ekipi iz mini lige. Kdor zbere več točk, zmaga: 3 točke za zmago, 1 za remi.',
    napovedi: 'Napovedi',
    napovediV: 'Napoveš izide tekem svoje lige. Točen izid prinese 3 točke, pravi razplet 1.',
    gumbVLigi: 'Odpri mini ligo',
    gumbNova: 'Ustvari mini ligo',
    potemVLigi: 'Pari za dvoboje nastanejo ob roku kroga, napovedi oddaš do roka.',
    potemNova: 'Mini ligo ustvariš v minuti, povezavo pa pošlješ soigralcem ali prijateljem.',
    zakaj: 'Ta mail dobiš le enkrat, ker imaš ekipo na slff.eu.',
  },
  en: {
    zadeva: 'New in SLFF: head-to-head and predictions in mini leagues',
    predglava: 'A duel with a friend every round and score predictions. Free, like everything in SLFF.',
    naslov: 'Mini leagues have two new games',
    uvod: 'On top of the usual table, your mini leagues now have two more games.',
    dvoboji: 'Head-to-head',
    dvobojiV: 'Every round you play one team from your mini league. More points wins: 3 points for a win, 1 for a draw.',
    napovedi: 'Predictions',
    napovediV: 'Predict the results of your league\'s matches. An exact score is worth 3 points, the right result 1.',
    gumbVLigi: 'Open your mini league',
    gumbNova: 'Create a mini league',
    potemVLigi: 'Duel pairs are set at the round deadline, and predictions close at the deadline.',
    potemNova: 'Creating a mini league takes a minute. Then send the link to teammates or friends.',
    zakaj: 'You get this email only once, because you have a team on slff.eu.',
  },
  sk: {
    zadeva: 'Novinka v SLFF: duely a tipy v miniligách',
    predglava: 'Každé kolo duel s kamarátom a tipovanie výsledkov. Zadarmo, ako všetko v SLFF.',
    naslov: 'Miniligy majú dve nové hry',
    uvod: 'Okrem bežnej tabuľky teraz v miniligách hráte ešte dve hry.',
    dvoboji: 'Duely',
    dvobojiV: 'Každé kolo hráš proti jednému tímu z miniligy. Kto získa viac bodov, vyhráva: 3 body za výhru, 1 za remízu.',
    napovedi: 'Tipy',
    napovediV: 'Tipuješ výsledky zápasov svojej ligy. Presný výsledok sú 3 body, správny víťaz 1.',
    gumbVLigi: 'Otvor minilígu',
    gumbNova: 'Vytvor minilígu',
    potemVLigi: 'Dvojice duelov vzniknú pri uzávierke kola, tipy odovzdáš do uzávierky.',
    potemNova: 'Minilígu vytvoríš za minútu a odkaz pošleš spoluhráčom alebo kamarátom.',
    zakaj: 'Tento e-mail dostaneš len raz, lebo máš tím na slff.eu.',
  },
  hr: {
    zadeva: 'Novo u SLFF-u: dvoboji i prognoze u mini ligama',
    predglava: 'Svako kolo dvoboj s prijateljem i prognoze rezultata. Besplatno, kao sve u SLFF-u.',
    naslov: 'Mini lige imaju dvije nove igre',
    uvod: 'Uz uobičajenu ljestvicu u mini ligama sada igrate još dvije igre.',
    dvoboji: 'Dvoboji',
    dvobojiV: 'Svako kolo igraš protiv jedne momčadi iz mini lige. Tko skupi više bodova, pobjeđuje: 3 boda za pobjedu, 1 za neriješeno.',
    napovedi: 'Prognoze',
    napovediV: 'Prognoziraš rezultate utakmica svoje lige. Točan rezultat donosi 3 boda, pravi ishod 1.',
    gumbVLigi: 'Otvori mini ligu',
    gumbNova: 'Napravi mini ligu',
    potemVLigi: 'Parovi za dvoboje nastaju na roku kola, a prognoze predaješ do roka.',
    potemNova: 'Mini ligu napraviš za minutu, a poveznicu pošalješ suigračima ili prijateljima.',
    zakaj: 'Ovaj mail dobivaš samo jednom jer imaš momčad na slff.eu.',
  },
  cs: {
    zadeva: 'Novinka v SLFF: duely a tipy v miniligách',
    predglava: 'Každé kolo duel s kamarádem a tipování výsledků. Zdarma, jako všechno v SLFF.',
    naslov: 'Miniligy mají dvě nové hry',
    uvod: 'Kromě běžné tabulky teď v miniligách hrajete ještě dvě hry.',
    dvoboji: 'Duely',
    dvobojiV: 'Každé kolo hraješ proti jednomu týmu z miniligy. Kdo získá víc bodů, vyhrává: 3 body za výhru, 1 za remízu.',
    napovedi: 'Tipy',
    napovediV: 'Tipuješ výsledky zápasů své ligy. Přesný výsledek jsou 3 body, správný vítěz 1.',
    gumbVLigi: 'Otevři miniligu',
    gumbNova: 'Vytvoř miniligu',
    potemVLigi: 'Dvojice duelů vzniknou při uzávěrce kola, tipy odevzdáš do uzávěrky.',
    potemNova: 'Miniligu vytvoříš za minutu a odkaz pošleš spoluhráčům nebo kamarádům.',
    zakaj: 'Tento e-mail dostaneš jen jednou, protože máš tým na slff.eu.',
  },
  hu: {
    zadeva: 'Új az SLFF-ben: párharcok és tippek a minibajnokságokban',
    predglava: 'Minden fordulóban párharc egy baráttal és eredménytippelés. Ingyen, mint minden az SLFF-ben.',
    naslov: 'Két új játék a minibajnokságokban',
    uvod: 'A szokásos tabella mellett a minibajnokságokban mostantól még két játék van.',
    dvoboji: 'Párharcok',
    dvobojiV: 'Minden fordulóban egy csapat ellen játszol a minibajnokságból. Aki több pontot szerez, nyer: győzelem 3 pont, döntetlen 1.',
    napovedi: 'Tippek',
    napovediV: 'Megtippeled a bajnokságod meccseinek eredményét. A pontos eredmény 3 pont, a helyes kimenetel 1.',
    gumbVLigi: 'Minibajnokság megnyitása',
    gumbNova: 'Minibajnokság létrehozása',
    potemVLigi: 'A párharcok párjai a forduló határidejekor jönnek létre, tippelni a határidőig lehet.',
    potemNova: 'Egy minibajnokságot egy perc alatt létrehozol, a linket pedig elküldöd a csapattársaidnak vagy barátaidnak.',
    zakaj: 'Ezt az e-mailt csak egyszer kapod meg, mert van csapatod az slff.eu-n.',
  },
  de: {
    zadeva: 'Neu bei SLFF: Duelle und Tipps in Minileagues',
    predglava: 'Jede Runde ein Duell mit Freunden und Ergebnistipps. Kostenlos, wie alles bei SLFF.',
    naslov: 'Zwei neue Spiele in den Minileagues',
    uvod: 'Neben der normalen Tabelle gibt es in den Minileagues jetzt zwei weitere Spiele.',
    dvoboji: 'Duelle',
    dvobojiV: 'Jede Runde spielst du gegen ein Team aus deiner Minileague. Wer mehr Punkte holt, gewinnt: 3 Punkte für einen Sieg, 1 für ein Remis.',
    napovedi: 'Tipps',
    napovediV: 'Du tippst die Ergebnisse der Spiele deiner Liga. Ein exaktes Ergebnis bringt 3 Punkte, die richtige Tendenz 1.',
    gumbVLigi: 'Minileague öffnen',
    gumbNova: 'Minileague erstellen',
    potemVLigi: 'Die Duellpaare entstehen beim Rundenschluss, Tipps gibst du bis zum Rundenschluss ab.',
    potemNova: 'Eine Minileague ist in einer Minute erstellt. Den Link schickst du an Mitspieler oder Freunde.',
    zakaj: 'Diese E-Mail bekommst du nur einmal, weil du ein Team auf slff.eu hast.',
  },
  sr: {
    zadeva: 'Novo u SLFF-u: dvoboji i prognoze u mini ligama',
    predglava: 'Svako kolo dvoboj sa prijateljem i prognoze rezultata. Besplatno, kao sve u SLFF-u.',
    naslov: 'Mini lige imaju dve nove igre',
    uvod: 'Pored uobičajene tabele, u mini ligama sada igrate još dve igre.',
    dvoboji: 'Dvoboji',
    dvobojiV: 'Svako kolo igraš protiv jednog tima iz mini lige. Ko skupi više poena, pobeđuje: 3 poena za pobedu, 1 za nerešeno.',
    napovedi: 'Prognoze',
    napovediV: 'Prognoziraš rezultate utakmica svoje lige. Tačan rezultat donosi 3 poena, pravi ishod 1.',
    gumbVLigi: 'Otvori mini ligu',
    gumbNova: 'Napravi mini ligu',
    potemVLigi: 'Parovi za dvoboje nastaju na roku kola, a prognoze predaješ do roka.',
    potemNova: 'Mini ligu napraviš za minut, a link pošalješ saigračima ili prijateljima.',
    zakaj: 'Ovaj mejl dobijaš samo jednom jer imaš tim na slff.eu.',
  },
  ro: {
    zadeva: 'Nou în SLFF: dueluri și pronosticuri în miniligi',
    predglava: 'În fiecare etapă un duel cu un prieten și pronosticuri. Gratuit, ca tot în SLFF.',
    naslov: 'Miniligile au două jocuri noi',
    uvod: 'Pe lângă clasamentul obișnuit, în miniligi aveți acum încă două jocuri.',
    dvoboji: 'Dueluri',
    dvobojiV: 'În fiecare etapă joci împotriva unei echipe din minilig. Cine face mai multe puncte câștigă: 3 puncte pentru victorie, 1 pentru egal.',
    napovedi: 'Pronosticuri',
    napovediV: 'Pronostichezi rezultatele meciurilor din liga ta. Scorul exact aduce 3 puncte, rezultatul corect 1.',
    gumbVLigi: 'Deschide miniliga',
    gumbNova: 'Creează o minilig',
    potemVLigi: 'Perechile de duel se formează la termenul etapei, iar pronosticurile le trimiți până la termen.',
    potemNova: 'Creezi o minilig într-un minut și trimiți linkul colegilor sau prietenilor.',
    zakaj: 'Primești acest e-mail o singură dată, pentru că ai o echipă pe slff.eu.',
  },
  et: {
    zadeva: 'Uus SLFF-is: duellid ja ennustused miniliigades',
    predglava: 'Igas voorus duell sõbraga ja tulemuste ennustamine. Tasuta, nagu kõik SLFF-is.',
    naslov: 'Miniliigades on kaks uut mängu',
    uvod: 'Lisaks tavalisele tabelile saate miniliigades nüüd mängida veel kahte mängu.',
    dvoboji: 'Duellid',
    dvobojiV: 'Igas voorus mängid ühe miniliiga meeskonna vastu. Rohkem punkte võidab: võit 3 punkti, viik 1.',
    napovedi: 'Ennustused',
    napovediV: 'Ennustad oma liiga mängude tulemusi. Täpne tulemus annab 3 punkti, õige võitja 1.',
    gumbVLigi: 'Ava miniliiga',
    gumbNova: 'Loo miniliiga',
    potemVLigi: 'Duellipaarid tekivad vooru tähtajal, ennustusi saab teha tähtajani.',
    potemNova: 'Miniliiga loomine võtab minuti. Seejärel saada link meeskonnakaaslastele või sõpradele.',
    zakaj: 'Saad selle e-kirja ainult ühe korra, sest sul on meeskond slff.eu-s.',
  },
  lv: {
    zadeva: 'Jaunums SLFF: dueļi un prognozes minilīgās',
    predglava: 'Katrā kārtā duelis ar draugu un rezultātu prognozes. Bez maksas, kā viss SLFF.',
    naslov: 'Minilīgās ir divas jaunas spēles',
    uvod: 'Papildus parastajai tabulai minilīgās tagad ir vēl divas spēles.',
    dvoboji: 'Dueļi',
    dvobojiV: 'Katrā kārtā tu spēlē pret vienu minilīgas komandu. Kurš savāc vairāk punktu, uzvar: uzvara 3 punkti, neizšķirts 1.',
    napovedi: 'Prognozes',
    napovediV: 'Tu prognozē savas līgas spēļu rezultātus. Precīzs rezultāts dod 3 punktus, pareizs iznākums 1.',
    gumbVLigi: 'Atvērt minilīgu',
    gumbNova: 'Izveidot minilīgu',
    potemVLigi: 'Dueļu pāri veidojas kārtas termiņā, prognozes iesniedz līdz termiņam.',
    potemNova: 'Minilīgu izveido minūtē, saiti nosūti komandas biedriem vai draugiem.',
    zakaj: 'Šo e-pastu saņem tikai vienreiz, jo tev ir komanda slff.eu.',
  },
  pl: {
    zadeva: 'Nowość w SLFF: pojedynki i typy w miniligach',
    predglava: 'W każdej kolejce pojedynek z kumplem i typowanie wyników. Za darmo, jak wszystko w SLFF.',
    naslov: 'Miniligi mają dwie nowe gry',
    uvod: 'Oprócz zwykłej tabeli w miniligach macie teraz jeszcze dwie gry.',
    dvoboji: 'Pojedynki',
    dvobojiV: 'W każdej kolejce grasz z jedną drużyną z miniligi. Kto zdobędzie więcej punktów, wygrywa: 3 punkty za wygraną, 1 za remis.',
    napovedi: 'Typy',
    napovediV: 'Typujesz wyniki meczów swojej ligi. Dokładny wynik daje 3 punkty, trafiony rezultat 1.',
    gumbVLigi: 'Otwórz miniligę',
    gumbNova: 'Utwórz miniligę',
    potemVLigi: 'Pary pojedynków powstają w terminie kolejki, typy oddajesz do terminu.',
    potemNova: 'Miniligę tworzysz w minutę, a link wysyłasz kolegom z drużyny lub znajomym.',
    zakaj: 'Ten e-mail dostajesz tylko raz, bo masz drużynę na slff.eu.',
  },
  es: {
    zadeva: 'Novedad en SLFF: duelos y pronósticos en las minilligas',
    predglava: 'Cada jornada un duelo con un amigo y pronósticos de resultados. Gratis, como todo en SLFF.',
    naslov: 'Las minilligas tienen dos juegos nuevos',
    uvod: 'Además de la clasificación normal, en las minilligas ahora hay dos juegos más.',
    dvoboji: 'Duelos',
    dvobojiV: 'Cada jornada juegas contra un equipo de tu minilliga. Quien suma más puntos gana: 3 puntos por victoria, 1 por empate.',
    napovedi: 'Pronósticos',
    napovediV: 'Pronosticas los resultados de los partidos de tu liga. El resultado exacto vale 3 puntos, el signo correcto 1.',
    gumbVLigi: 'Abrir la minilliga',
    gumbNova: 'Crear una minilliga',
    potemVLigi: 'Las parejas de duelo se forman al cierre de la jornada y los pronósticos se envían hasta el cierre.',
    potemNova: 'Crear una minilliga lleva un minuto. Luego envía el enlace a tus compañeros o amigos.',
    zakaj: 'Recibes este correo una sola vez porque tienes un equipo en slff.eu.',
  },
  mk: {
    zadeva: 'Ново во SLFF: дуели и прогнози во мини лигите',
    predglava: 'Секое коло дуел со пријател и прогнози на резултати. Бесплатно, како сè во SLFF.',
    naslov: 'Мини лигите имаат две нови игри',
    uvod: 'Покрај вообичаената табела, во мини лигите сега играте уште две игри.',
    dvoboji: 'Дуели',
    dvobojiV: 'Секое коло играш против една екипа од мини лигата. Кој собере повеќе поени, победува: 3 поени за победа, 1 за нерешено.',
    napovedi: 'Прогнози',
    napovediV: 'Ги прогнозираш резултатите на натпреварите од твојата лига. Точен резултат носи 3 поени, точен исход 1.',
    gumbVLigi: 'Отвори ја мини лигата',
    gumbNova: 'Создај мини лига',
    potemVLigi: 'Паровите за дуели се создаваат на рокот на колото, а прогнозите ги внесуваш до рокот.',
    potemNova: 'Мини лига создаваш за една минута, а линкот го праќаш на соиграчите или пријателите.',
    zakaj: 'Овој мејл го добиваш само еднаш, бидејќи имаш екипа на slff.eu.',
  },
  el: {
    zadeva: 'Νέο στο SLFF: μονομαχίες και προβλέψεις στις μίνι λίγκες',
    predglava: 'Κάθε αγωνιστική μια μονομαχία με φίλο και προβλέψεις αποτελεσμάτων. Δωρεάν, όπως όλα στο SLFF.',
    naslov: 'Δύο νέα παιχνίδια στις μίνι λίγκες',
    uvod: 'Εκτός από τη συνηθισμένη βαθμολογία, οι μίνι λίγκες έχουν πλέον άλλα δύο παιχνίδια.',
    dvoboji: 'Μονομαχίες',
    dvobojiV: 'Κάθε αγωνιστική παίζεις με μία ομάδα της μίνι λίγκας. Όποιος μαζέψει περισσότερους πόντους κερδίζει: 3 πόντοι η νίκη, 1 η ισοπαλία.',
    napovedi: 'Προβλέψεις',
    napovediV: 'Προβλέπεις τα αποτελέσματα των αγώνων της λίγκας σου. Το ακριβές σκορ δίνει 3 πόντους, το σωστό σημείο 1.',
    gumbVLigi: 'Άνοιξε τη μίνι λίγκα',
    gumbNova: 'Φτιάξε μίνι λίγκα',
    potemVLigi: 'Τα ζευγάρια των μονομαχιών ορίζονται στη λήξη της αγωνιστικής, οι προβλέψεις κλείνουν τότε.',
    potemNova: 'Η μίνι λίγκα φτιάχνεται σε ένα λεπτό. Μετά στείλε τον σύνδεσμο σε συμπαίκτες ή φίλους.',
    zakaj: 'Λαμβάνεις αυτό το email μόνο μία φορά, επειδή έχεις ομάδα στο slff.eu.',
  },
  tr: {
    zadeva: 'SLFF\'te yeni: mini liglerde düellolar ve tahminler',
    predglava: 'Her hafta bir arkadaşınla düello ve skor tahmini. SLFF\'teki her şey gibi ücretsiz.',
    naslov: 'Mini liglerde iki yeni oyun',
    uvod: 'Mini liglerde normal puan tablosunun yanında artık iki oyun daha var.',
    dvoboji: 'Düellolar',
    dvobojiV: 'Her hafta mini ligden bir takıma karşı oynarsın. Daha çok puan toplayan kazanır: galibiyet 3 puan, beraberlik 1.',
    napovedi: 'Tahminler',
    napovediV: 'Liginin maç sonuçlarını tahmin edersin. Tam skor 3 puan, doğru sonuç 1 puan.',
    gumbVLigi: 'Mini ligi aç',
    gumbNova: 'Mini lig kur',
    potemVLigi: 'Düello eşleşmeleri haftanın son teslim anında oluşur, tahminler de o ana kadar verilir.',
    potemNova: 'Mini lig bir dakikada kurulur. Sonra bağlantıyı takım arkadaşlarına veya arkadaşlarına gönder.',
    zakaj: 'Bu e-postayı yalnızca bir kez alırsın, çünkü slff.eu\'da takımın var.',
  },
  uk: {
    zadeva: 'Нове в SLFF: дуелі та прогнози в міні-лігах',
    predglava: 'Щотуру дуель з другом і прогнози результатів. Безкоштовно, як усе в SLFF.',
    naslov: 'У міні-лігах дві нові гри',
    uvod: 'Окрім звичайної таблиці, у міні-лігах тепер є ще дві гри.',
    dvoboji: 'Дуелі',
    dvobojiV: 'Щотуру ти граєш проти однієї команди з міні-ліги. Хто набере більше очок, перемагає: 3 очки за перемогу, 1 за нічию.',
    napovedi: 'Прогнози',
    napovediV: 'Ти прогнозуєш результати матчів своєї ліги. Точний рахунок дає 3 очки, правильний результат 1.',
    gumbVLigi: 'Відкрити міні-лігу',
    gumbNova: 'Створити міні-лігу',
    potemVLigi: 'Пари для дуелей утворюються на дедлайні туру, прогнози приймаються до дедлайну.',
    potemNova: 'Міні-лігу створиш за хвилину, а посилання надішлеш партнерам по команді чи друзям.',
    zakaj: 'Цей лист ти отримуєш лише раз, бо маєш команду на slff.eu.',
  },
  hy: {
    zadeva: 'Նորություն SLFF-ում. մենամարտեր և կանխատեսումներ մինի լիգաներում',
    predglava: 'Ամեն տուր մենամարտ ընկերոջ հետ և արդյունքների կանխատեսում։ Անվճար, ինչպես ամեն ինչ SLFF-ում։',
    naslov: 'Մինի լիգաներում երկու նոր խաղ կա',
    uvod: 'Սովորական աղյուսակից բացի, մինի լիգաներում այժմ ևս երկու խաղ կա։',
    dvoboji: 'Մենամարտեր',
    dvobojiV: 'Ամեն տուր խաղում ես մինի լիգայի մեկ թիմի դեմ։ Ով ավելի շատ միավոր հավաքի, հաղթում է. հաղթանակը 3 միավոր է, ոչ-ոքին՝ 1։',
    napovedi: 'Կանխատեսումներ',
    napovediV: 'Կանխատեսում ես քո լիգայի խաղերի արդյունքները։ Ճշգրիտ հաշիվը տալիս է 3 միավոր, ճիշտ ելքը՝ 1։',
    gumbVLigi: 'Բացել մինի լիգան',
    gumbNova: 'Ստեղծել մինի լիգա',
    potemVLigi: 'Մենամարտի զույգերը ձևավորվում են տուրի վերջնաժամկետին, կանխատեսումները՝ մինչև վերջնաժամկետը։',
    potemNova: 'Մինի լիգան ստեղծվում է մեկ րոպեում։ Հետո հղումն ուղարկիր թիմակիցներին կամ ընկերներին։',
    zakaj: 'Այս նամակը ստանում ես միայն մեկ անգամ, քանի որ slff.eu-ում թիմ ունես։',
  },
  az: {
    zadeva: 'SLFF-də yenilik: mini liqalarda duellər və proqnozlar',
    predglava: 'Hər turda dostla duel və nəticə proqnozları. SLFF-dəki hər şey kimi pulsuz.',
    naslov: 'Mini liqalarda iki yeni oyun var',
    uvod: 'Adi cədvəldən əlavə, mini liqalarda indi daha iki oyun var.',
    dvoboji: 'Duellər',
    dvobojiV: 'Hər turda mini liqadan bir komandaya qarşı oynayırsan. Çox xal toplayan qalib gəlir: qələbə 3 xal, heç-heçə 1.',
    napovedi: 'Proqnozlar',
    napovediV: 'Liqanın oyunlarının nəticələrini proqnozlaşdırırsan. Dəqiq hesab 3 xal, düzgün nəticə 1 xal verir.',
    gumbVLigi: 'Mini liqanı aç',
    gumbNova: 'Mini liqa yarat',
    potemVLigi: 'Duel cütləri turun son müddətində yaranır, proqnozlar da son müddətə qədər verilir.',
    potemNova: 'Mini liqa bir dəqiqəyə yaradılır. Sonra linki komanda yoldaşlarına və ya dostlara göndər.',
    zakaj: 'Bu məktubu yalnız bir dəfə alırsan, çünki slff.eu-da komandan var.',
  },
  da: {
    zadeva: 'Nyt i SLFF: dueller og tips i miniligaer',
    predglava: 'Hver runde en duel med en ven og tips på resultater. Gratis, som alt i SLFF.',
    naslov: 'Miniligaerne har fået to nye spil',
    uvod: 'Ud over den normale stilling har miniligaerne nu to spil mere.',
    dvoboji: 'Dueller',
    dvobojiV: 'Hver runde spiller du mod ét hold fra miniligaen. Flest point vinder: 3 point for sejr, 1 for uafgjort.',
    napovedi: 'Tips',
    napovediV: 'Du tipper resultaterne af kampene i din liga. Præcist resultat giver 3 point, rigtigt udfald 1.',
    gumbVLigi: 'Åbn miniligaen',
    gumbNova: 'Opret en miniliga',
    potemVLigi: 'Duelparrene dannes ved rundens deadline, og tips afgives inden deadline.',
    potemNova: 'En miniliga oprettes på et minut. Send derefter linket til holdkammerater eller venner.',
    zakaj: 'Du får kun denne mail én gang, fordi du har et hold på slff.eu.',
  },
}

export function sestaviNovostMiniLig(liga: Liga, meta: { display_name: string | null; v_mini_ligi: boolean }): Sporocilo {
  const j = jezikLige(liga)
  const p = povezave(liga.slug)
  const B = NOVOST_MINI_LIG[j]
  return sestavi(j, {
    zadeva: B.zadeva,
    predglava: B.predglava,
    oznaka: liga.oznaka,
    naslov: B.naslov,
    uvod: `${pozdrav(j, meta.display_name)} ${B.uvod}`,
    dejstva: [
      { k: esc(B.dvoboji), v: esc(B.dvobojiV) },
      { k: esc(B.napovedi), v: esc(B.napovediV) },
    ],
    gumb: {
      label: meta.v_mini_ligi ? B.gumbVLigi : B.gumbNova,
      url: `${SITE}/mini-leagues?t=${encodeURIComponent(liga.slug)}&src=mail-novost`,
    },
    potem: meta.v_mini_ligi ? B.potemVLigi : B.potemNova,
    zakaj: B.zakaj,
  }, p.odjava)
}

// --- razlog neveljavne ekipe ------------------------------------------------

/** Slovaška množina: 1 / 2–4 / ostalo. */
const skMn = (n: number, one: string, few: string, other: string) =>
  n === 1 ? one : n >= 2 && n <= 4 ? few : other

/**
 * Razlog iz `razlog_neveljavne_ekipe` je slovenski stavek. Za slovaški mail
 * ga prepoznamo po obliki in prevedemo; neznano obliko (SQL se je spremenil)
 * nadomesti splošen stavek, da v slovaškem mailu ni slovenščine.
 *
 * `'en'` rabi vmesnik (angleški obiskovalec) in pošta lig Združenega kraljestva in Malte.
 */
export function prevediRazlog(razlog: string | null | undefined, j: Jezik): string {
  if (j === 'sl') return razlog ?? 'Kader ni veljaven.'
  if (j === 'en') return razlogVAngliscini(razlog)
  if (j === 'hr') return razlogVHrvascini(razlog)
  if (j === 'cs') return razlogVCestini(razlog)
  if (j === 'hu') return razlogVMadzarscini(razlog)
  if (j === 'de') return razlogVNemscini(razlog)
  if (j === 'sr') return razlogVSrbscini(razlog)
  if (j === 'ro') return razlogVRomunscini(razlog)
  if (j === 'et') return razlogVEstonscini(razlog)
  if (j === 'lv') return razlogVLatviescini(razlog)
  if (j === 'mk') return razlogVMakedonscini(razlog)
  if (j === 'el') return razlogVGrscini(razlog)
  if (j === 'tr') return razlogVTurscini(razlog)
  if (j === 'uk') return razlogVUkrajinscini(razlog)
  if (j === 'hy') return razlogVArmenscini(razlog)
  if (j === 'az') return razlogVAzerbajdzanscini(razlog)
  if (j === 'da') return razlogVDanscini(razlog)
  if (j === 'pl') return razlogVPoljscini(razlog)
  if (j === 'es') return razlogVSpanscini(razlog)
  if (!razlog) return 'Káder nie je platný.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null

  if (r === 'Ekipa je prazna — kadra ni.') return 'Tím je prázdny — nemá žiadny káder.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/))) {
    const n = Number(m[1])
    return skMn(n, `V kádri je ${n} hráč`, `V kádri sú ${n} hráči`, `V kádri je ${n} hráčov`) +
      ` namiesto ${m[2]}.`
  }
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `V kádri sú hráči, ktorí už nie sú aktívni: ${m[1]}. Ich klub v tejto sezóne nehrá alebo hráč odišiel.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Z klubu ${m[1]} máš ${m[2]} hráčov, povolení sú ${m[3]}. ` +
      'Môže sa to stať aj bez tvojej zmeny — ak hráč počas sezóny prestúpi do klubu, z ktorého už nejakých máš.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/))) {
    const n = Number(m[1])
    return n === 1 ? 'Pri 1 hráčovi nie je známa pozícia.' : `Pri ${n} hráčoch nie je známa pozícia.`
  }
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Káder musí mať 2 brankárov, 5 obrancov, 5 záložníkov a 3 útočníkov; má ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/))) {
    const n = Number(m[1])
    return skMn(
      n,
      `V základnej zostave je ${n} hráč`,
      `V základnej zostave sú ${n} hráči`,
      `V základnej zostave je ${n} hráčov`,
    ) + ` namiesto ${m[2]}.`
  }
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Tím nemá práve jedného kapitána.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Tím nemá práve jedného zástupcu kapitána.'
  return 'Tím nespĺňa pravidlá — pozri si podrobnosti v sekcii Môj tím.'
}

/** Isti razlogi v angleščini (za angleški vmesnik in pošto GB, MT). */
function razlogVAngliscini(razlog: string | null | undefined): string {
  if (!razlog) return 'The squad is not valid.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const igralcev = (n: number) => (n === 1 ? '1 player' : `${n} players`)

  if (r === 'Ekipa je prazna — kadra ni.') return 'The team is empty: there is no squad.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `The squad has ${igralcev(Number(m[1]))} instead of ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Your squad has players who are no longer active: ${m[1]}. Their club isn't playing this season or the player has left.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `You have ${m[2]} players from ${m[1]}; ${m[3]} are allowed. ` +
      'This can happen without any change of yours: if a player transfers mid-season to a club you already have players from.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `The position of ${igralcev(Number(m[1]))} is unknown.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `The squad must have 2 goalkeepers, 5 defenders, 5 midfielders and 3 forwards; it has ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `The starting XI has ${igralcev(Number(m[1]))} instead of ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'The team does not have exactly one captain.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'The team does not have exactly one vice-captain.'
  return 'The team breaks the rules. See My Team for details.'
}

/** Hrvaška množina: 1, 21 … / 2–4, 22–24 … / ostalo (brez 11–14). */
const hrMn = (n: number, one: string, few: string, other: string) =>
  n % 10 === 1 && n % 100 !== 11
    ? one
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? few
      : other

/** Isti razlogi v hrvaščini (za hrvaški mail in vmesnik). */
function razlogVHrvascini(razlog: string | null | undefined): string {
  if (!razlog) return 'Sastav nije valjan.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  // "U sastavu je 1 igrač / su 3 igrača / je 14 igrača".
  const igraca = (n: number) => hrMn(n, `je ${n} igrač`, `su ${n} igrača`, `je ${n} igrača`)

  if (r === 'Ekipa je prazna — kadra ni.') return 'Momčad je prazna, u sastavu nema nijednog igrača.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `U sastavu ${igraca(Number(m[1]))} umjesto ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `U sastavu su igrači koji više nisu aktivni: ${m[1]}. Njihov klub ove sezone ne igra ili je igrač otišao.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Iz kluba ${m[1]} imaš ${m[2]} igrača, a dopušteno je najviše ${m[3]}. ` +
      'To se može dogoditi i bez tvoje promjene: ako igrač tijekom sezone prijeđe u klub iz kojeg već imaš igrače.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Za ${m[1]} igrača nije poznata pozicija.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Sastav mora imati 2 vratara, 5 braniča, 5 veznih i 3 napadača; ima ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `U prvoj postavi ${igraca(Number(m[1]))} umjesto ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Momčad nema točno jednog kapetana.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Momčad nema točno jednog zamjenika kapetana.'
  return 'Momčad ne ispunjava pravila. Pogledaj detalje u Mojoj momčadi.'
}

/** Isti razlogi v češčini (za češki mail in vmesnik). Množina kot slovaška. */
function razlogVCestini(razlog: string | null | undefined): string {
  if (!razlog) return 'Soupiska není platná.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  // "Na soupisce je 1 hráč / jsou 3 hráči / je 14 hráčů".
  const hracu = (n: number) => skMn(n, `je ${n} hráč`, `jsou ${n} hráči`, `je ${n} hráčů`)

  if (r === 'Ekipa je prazna — kadra ni.') return 'Tým je prázdný, na soupisce není žádný hráč.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Na soupisce ${hracu(Number(m[1]))} místo ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Na soupisce jsou hráči, kteří už nejsou aktivní: ${m[1]}. Jejich klub v této sezóně nehraje nebo hráč odešel.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Z klubu ${m[1]} máš ${m[2]} hráčů, povoleno je nejvýš ${m[3]}. ` +
      'Může se to stát i bez tvé změny: když hráč během sezóny přestoupí do klubu, ze kterého už nějaké hráče máš.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/))) {
    const n = Number(m[1])
    return n === 1 ? 'U 1 hráče není známá pozice.' : `U ${n} hráčů není známá pozice.`
  }
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Soupiska musí mít 2 brankáře, 5 obránců, 5 záložníků a 3 útočníky; má ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `V základní sestavě ${hracu(Number(m[1]))} místo ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Tým nemá právě jednoho kapitána.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Tým nemá právě jednoho zástupce kapitána.'
  return 'Tým nesplňuje pravidla. Podrobnosti najdeš v sekci Můj tým.'
}

/**
 * Isti razlogi v madžarščini (za madžarski mail). Samostalnik za številom je
 * v ednini ("3 játékos"), zato množine ni; ime kluba stoji v oklepaju, da mu
 * ni treba dodajati pripon.
 */
function razlogVMadzarscini(razlog: string | null | undefined): string {
  if (!razlog) return 'A keret nem érvényes.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null

  if (r === 'Ekipa je prazna — kadra ni.') return 'A csapat üres, nincs benne egyetlen játékos sem.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `A keretben ${m[1]} játékos van ${m[2]} helyett.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `A keretedben olyan játékosok vannak, akik már nem aktívak: ${m[1]}. A klubjuk idén nem játszik, vagy a játékos távozott.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `${m[2]} játékosod van ugyanabból a klubból (${m[1]}), de legfeljebb ${m[3]} megengedett. ` +
      'Ez a te módosításod nélkül is előfordulhat: ha egy játékos a szezon közben olyan klubba igazol, ahonnan már vannak játékosaid.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `${m[1]} játékos posztja ismeretlen.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `A keretben 2 kapusnak, 5 védőnek, 5 középpályásnak és 3 támadónak kell lennie; jelenleg: ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `A kezdőcsapatban ${m[1]} játékos van ${m[2]} helyett.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'A csapatban nincs pontosan egy csapatkapitány.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'A csapatban nincs pontosan egy alkapitány.'
  return 'A csapat nem felel meg a szabályoknak. A részleteket a Csapatom oldalon találod.'
}

/** Isti razlogi v nemščini (za avstrijski mail in vmesnik). */
function razlogVNemscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Der Kader ist nicht gültig.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null

  if (r === 'Ekipa je prazna — kadra ni.') return 'Das Team ist leer, es gibt keinen Kader.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Im Kader sind ${m[1]} Spieler statt ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `In deinem Kader sind Spieler, die nicht mehr aktiv sind: ${m[1]}. Ihr Klub spielt heuer nicht oder der Spieler ist weg.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Du hast ${m[2]} Spieler aus demselben Klub (${m[1]}), erlaubt sind ${m[3]}. ` +
      'Das kann auch ohne dein Zutun passieren: wenn ein Spieler während der Saison zu einem Klub wechselt, aus dem du schon Spieler hast.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return m[1] === '1' ? 'Bei 1 Spieler ist die Position unbekannt.' : `Bei ${m[1]} Spielern ist die Position unbekannt.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Der Kader muss 2 Tormänner, 5 Verteidiger, 5 Mittelfeldspieler und 3 Stürmer haben; er hat ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `In der Startelf sind ${m[1]} Spieler statt ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Das Team hat nicht genau einen Kapitän.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Das Team hat nicht genau einen Vizekapitän.'
  return 'Das Team hält sich nicht an die Regeln. Details findest du unter Mein Team.'
}

/** Isti razlogi v srbščini (ekavica, latinica). Množina kot hrvaška. */
function razlogVSrbscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Sastav nije ispravan.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  // "U sastavu je 1 igrač / su 3 igrača / je 14 igrača".
  const igraca = (n: number) => hrMn(n, `je ${n} igrač`, `su ${n} igrača`, `je ${n} igrača`)

  if (r === 'Ekipa je prazna — kadra ni.') return 'Tim je prazan, u sastavu nema nijednog igrača.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `U sastavu ${igraca(Number(m[1]))} umesto ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `U sastavu su igrači koji više nisu aktivni: ${m[1]}. Njihov klub ove sezone ne igra ili je igrač otišao.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Iz kluba ${m[1]} imaš ${m[2]} igrača, a dozvoljeno je najviše ${m[3]}. ` +
      'To može da se desi i bez tvoje promene: ako igrač tokom sezone pređe u klub iz kojeg već imaš igrače.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Za ${m[1]} igrača nije poznata pozicija.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Sastav mora da ima 2 golmana, 5 odbrambenih, 5 veznih i 3 napadača; ima ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `U prvoj postavi ${igraca(Number(m[1]))} umesto ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Tim nema tačno jednog kapitena.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Tim nema tačno jednog zamenika kapitena.'
  return 'Tim ne ispunjava pravila. Pogledaj detalje u odeljku Moj tim.'
}

/**
 * Romunska množina (`Intl.PluralRules('ro')`): 1 / 0, 2–19 in x01–x19 /
 * ostalo, ki dobi "de" ("20 de puncte").
 */
const roMn = (n: number, one: string, few: string, other: string) => {
  if (n === 1) return one
  const s = Math.abs(n) % 100
  return n === 0 || (s >= 1 && s <= 19) ? few : other
}

/** Isti razlogi v romunščini (za romunski mail in vmesnik). */
function razlogVRomunscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Lotul nu este valid.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const jucatori = (n: number) => `${n} ${roMn(n, 'jucător', 'jucători', 'de jucători')}`
  // "În lot este 1 jucător / sunt 3 jucători / sunt 20 de jucători".
  const sunt = (n: number) => `${n === 1 ? 'este' : 'sunt'} ${jucatori(n)}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Echipa e goală, nu are niciun jucător în lot.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `În lot ${sunt(Number(m[1]))} în loc de ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `În lot sunt jucători care nu mai sunt activi: ${m[1]}. Clubul lor nu joacă în acest sezon sau jucătorul a plecat.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `De la clubul ${m[1]} ai ${jucatori(Number(m[2]))}, sunt permiși cel mult ${m[3]}. ` +
      'Se poate întâmpla și fără vreo schimbare de-a ta: dacă un jucător se transferă în timpul sezonului la un club de la care ai deja jucători.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Poziția nu este cunoscută pentru ${jucatori(Number(m[1]))}.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Lotul trebuie să aibă 2 portari, 5 fundași, 5 mijlocași și 3 atacanți; are ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `În formația de start ${sunt(Number(m[1]))} în loc de ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Echipa nu are exact un căpitan.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Echipa nu are exact un vicecăpitan.'
  return 'Echipa nu respectă regulile. Vezi detaliile în secțiunea Echipa mea.'
}

/** Isti razlogi v estonščini (za estonski mail in vmesnik). Za številom je samostalnik v delilniku ednine. */
function razlogVEstonscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Koosseis ei vasta reeglitele.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const mangijat = (n: number) => `${n} ${n === 1 ? 'mängija' : 'mängijat'}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Meeskond on tühi, koosseisus pole ühtegi mängijat.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Koosseisus on ${mangijat(Number(m[1]))} ${m[2]} asemel.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Koosseisus on mängijaid, kes pole enam aktiivsed: ${m[1]}. Nende klubi ei mängi sel hooajal või mängija on lahkunud.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Klubist ${m[1]} on sul ${mangijat(Number(m[2]))}, lubatud on kõige rohkem ${m[3]}. ` +
      'See võib juhtuda ka ilma sinu muudatuseta: kui mängija läheb hooaja jooksul üle klubisse, kust sul juba on mängijaid.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Positsioon pole teada: ${mangijat(Number(m[1]))}.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Koosseisus peab olema 2 väravavahti, 5 kaitsjat, 5 poolkaitsjat ja 3 ründajat; praegu on ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `Algkoosseisus on ${mangijat(Number(m[1]))} ${m[2]} asemel.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Meeskonnal pole täpselt ühte kaptenit.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Meeskonnal pole täpselt ühte asekaptenit.'
  return 'Meeskond ei vasta reeglitele. Vaata üksikasju jaotises Minu meeskond.'
}

/** Polska množina: one (1), few (2-4, 22-24 …), many (0, 5-21 …), other (necela števila, "2,5 punktu"). */
const plMn = (n: number, one: string, few: string, many: string, other: string) => {
  if (!Number.isInteger(n)) return other
  if (n === 1) return one
  const e = n % 10
  const d = n % 100
  return e >= 2 && e <= 4 && (d < 12 || d > 14) ? few : many
}

/** Isti razlogi v poljščini (za poljski mail in vmesnik). Glagol se ujema s številom ("są 3 zawodnicy", "jest 5 zawodników"). */
function razlogVPoljscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Kadra nie spełnia zasad.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const jest = (n: number) => `${plMn(n, 'jest', 'są', 'jest', 'jest')} ${n} ${plMn(n, 'zawodnik', 'zawodnicy', 'zawodników', 'zawodnika')}`
  const zawodnika = (n: number) => `${n} ${plMn(n, 'zawodnika', 'zawodników', 'zawodników', 'zawodnika')}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Drużyna jest pusta, w kadrze nie ma żadnego zawodnika.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `W kadrze ${jest(Number(m[1]))} zamiast ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `W kadrze są zawodnicy, którzy nie są już aktywni: ${m[1]}. Ich klub nie gra w tym sezonie albo zawodnik odszedł.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Z klubu ${m[1]} masz ${zawodnika(Number(m[2]))}, dozwolonych jest najwyżej ${m[3]}. ` +
      'Może się to zdarzyć także bez twojej zmiany: gdy zawodnik w trakcie sezonu przejdzie do klubu, z którego masz już zawodników.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Pozycja nie jest znana u ${zawodnika(Number(m[1]))}.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Kadra musi mieć 2 bramkarzy, 5 obrońców, 5 pomocników i 3 napastników; teraz ma ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `W wyjściowym składzie ${jest(Number(m[1]))} zamiast ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Drużyna nie ma dokładnie jednego kapitana.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Drużyna nie ma dokładnie jednego wicekapitana.'
  return 'Drużyna nie spełnia zasad. Szczegóły znajdziesz w sekcji Moja drużyna.'
}

/** Isti razlogi v španščini (za španski mail in vmesnik). Samostalnik se ujema s številom ("1 jugador", "3 jugadores"). */
function razlogVSpanscini(razlog: string | null | undefined): string {
  if (!razlog) return 'La plantilla no cumple las reglas.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const jugadores = (n: number) => `${n} ${n === 1 ? 'jugador' : 'jugadores'}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'El equipo está vacío: no hay ningún jugador en la plantilla.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `En la plantilla hay ${jugadores(Number(m[1]))} en lugar de ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `En la plantilla hay jugadores que ya no están activos: ${m[1]}. Su club no juega esta temporada o el jugador se ha ido.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Del club ${m[1]} tienes ${jugadores(Number(m[2]))} y se permiten como mucho ${m[3]}. ` +
      'Puede pasar también sin que cambies nada: si un jugador se va durante la temporada a un club del que ya tienes jugadores.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `No se conoce la posición de ${jugadores(Number(m[1]))}.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `La plantilla debe tener 2 porteros, 5 defensas, 5 centrocampistas y 3 delanteros; ahora tiene ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `En el once inicial hay ${jugadores(Number(m[1]))} en lugar de ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'El equipo no tiene exactamente un capitán.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'El equipo no tiene exactamente un vicecapitán.'
  return 'El equipo no cumple las reglas. Tienes los detalles en la sección Mi equipo.'
}

/**
 * Latvijska množina po `Intl.PluralRules('lv')`: zero (0, 10–20, 30 …, rodilnik
 * množine "10 punktu"), one (1, 21, 31 … razen 11, "21 punkts"), other ("2 punkti").
 */
const lvPravila = new Intl.PluralRules('lv-LV')
const lvMn = (n: number, zero: string, one: string, other: string) => {
  const k = lvPravila.select(n)
  return k === 'zero' ? zero : k === 'one' ? one : other
}

// Makedonščina: one (1, 21, 31 …, ne 11) in other; decimalke so other ("1,5 поени").
const mkMn = (n: number, one: string, other: string) =>
  Number.isInteger(n) && n % 10 === 1 && n % 100 !== 11 ? one : other

/** Isti razlogi v latvijščini (za latvijski mail in vmesnik). */
function razlogVLatviescini(razlog: string | null | undefined): string {
  if (!razlog) return 'Sastāvs neatbilst noteikumiem.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const speletaji = (n: number) => `${n} ${lvMn(n, 'spēlētāju', 'spēlētājs', 'spēlētāji')}`
  // Dajalnik: "1 spēlētājam", "2 spēlētājiem".
  const speletajiem = (n: number) => `${n} ${lvMn(n, 'spēlētājiem', 'spēlētājam', 'spēlētājiem')}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Komanda ir tukša, sastāvā nav neviena spēlētāja.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Sastāvā ir ${speletaji(Number(m[1]))} ${m[2]} vietā.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Sastāvā ir spēlētāji, kuri vairs nav aktīvi: ${m[1]}. Viņu klubs šajā sezonā nespēlē vai spēlētājs ir aizgājis.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `No kluba ${m[1]} tev ir ${speletaji(Number(m[2]))}, atļauts ir ne vairāk kā ${m[3]}. ` +
      'Tas var notikt arī bez tavām izmaiņām: ja spēlētājs sezonas laikā pāriet uz klubu, no kura tev jau ir spēlētāji.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `${speletajiem(Number(m[1]))} nav zināma pozīcija.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Sastāvā jābūt 2 vārtsargiem, 5 aizsargiem, 5 pussargiem un 3 uzbrucējiem; pašlaik ir ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `Pamatsastāvā ir ${speletaji(Number(m[1]))} ${m[2]} vietā.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Komandai nav tieši viena kapteiņa.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Komandai nav tieši viena vicekapteiņa.'
  return 'Komanda neatbilst noteikumiem. Sīkāka informācija sadaļā Mana komanda.'
}

/** Isti razlogi v makedonščini (za makedonski mail in vmesnik). */
function razlogVMakedonscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Составот не е исправен.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const igraci = (n: number) => `${n} ${mkMn(n, 'играч', 'играчи')}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Тимот е празен, во составот нема ниту еден играч.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Во составот има ${igraci(Number(m[1]))} наместо ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Во составот има играчи што повеќе не се активни: ${m[1]}. Нивниот клуб оваа сезона не игра или играчот заминал.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Од клубот ${m[1]} имаш ${igraci(Number(m[2]))}, дозволени се ${m[3]}. ` +
      'Тоа може да се случи и без твоја промена: ако играч во текот на сезоната премине во клуб од кој веќе имаш играчи.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `За ${igraci(Number(m[1]))} позицијата не е позната.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Составот мора да има 2 голмани, 5 одбранбени, 5 од средниот ред и 3 напаѓачи; има ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `Во првиот состав има ${igraci(Number(m[1]))} наместо ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Тимот нема точно еден капитен.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Тимот нема точно еден вице-капитен.'
  return 'Тимот не ги исполнува правилата. Детали има во делот Мој тим.'
}

/** Ali je niz eden od jezikov pošte (sicer velja privzeti). */
const jeJezik = (j: string | null | undefined): j is Jezik => !!j && j in LOKALE

// Grščina: one le za 1, sicer other; decimalke so other ("1,5 πόντοι").
const elMn = (n: number, one: string, other: string) => (n === 1 ? one : other)

// Klicnik grških moških imen: -ος → -ο (dva zloga: Νίκος → Νίκο) ali -ε (daljša:
// Κωνσταντίνος → Κωνσταντίνε), -ης → -η, -ας → -α. Ženska imena in latinica ostanejo.
function klicnikEl(ime: string): string {
  if (!/^[Ͱ-Ͽἀ-῿]+$/.test(ime)) return ime
  const zlogi = (ime.match(/[αεηιουωάέήίόύώϊϋΐΰ]+/gi) ?? []).length
  if (/ος$/.test(ime)) return ime.slice(0, -2) + (zlogi <= 2 ? 'ο' : 'ε')
  if (/ός$/.test(ime)) return ime.slice(0, -2) + 'έ'
  if (/(ης|ής|ας|άς)$/.test(ime)) return ime.slice(0, -1)
  return ime
}

// Ukrajinščina: one (1, 21, 31 …, ne 11), few (2-4, 22-24 …, ne 12-14),
// many (0, 5-20, 25 …); decimalke so other ("1,5 очка").
const ukMn = (n: number, one: string, few: string, many: string, other: string) => {
  if (!Number.isInteger(n)) return other
  const d = n % 10, s = n % 100
  if (d === 1 && s !== 11) return one
  if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return few
  return many
}

// Armenščina: vrstilni števnik 1-ին, sicer N-րդ.
const hyDas = (n: number) => (n === 1 ? '1-ին' : `${n}-րդ`)

// Angleščina: vrstilni števnik (1st, 2nd, 3rd, 4th, 11th, 21st).
const enMesto = (n: number) => {
  const s = n % 100
  const pripona = s >= 11 && s <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'
  return `${n}${pripona}`
}

/** Isti razlogi v grščini (za grški mail in vmesnik). */
function razlogVGrscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Το ρόστερ δεν είναι έγκυρο.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  // Αιτιατική: "έχει 1 παίκτη, 3 παίκτες".
  const paiktes = (n: number) => `${n} ${elMn(n, 'παίκτη', 'παίκτες')}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Η ομάδα είναι άδεια, το ρόστερ δεν έχει κανέναν παίκτη.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Το ρόστερ έχει ${paiktes(Number(m[1]))} αντί για ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Το ρόστερ έχει παίκτες που δεν είναι πια ενεργοί: ${m[1]}. Ο σύλλογός τους δεν αγωνίζεται φέτος ή ο παίκτης έφυγε.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Από τον σύλλογο ${m[1]} έχεις ${paiktes(Number(m[2]))}, επιτρέπονται ${m[3]}. ` +
      'Αυτό μπορεί να συμβεί και χωρίς δική σου αλλαγή: αν ένας παίκτης μέσα στη σεζόν πάει σε σύλλογο από τον οποίο έχεις ήδη παίκτες.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Για ${paiktes(Number(m[1]))} η θέση δεν είναι γνωστή.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Το ρόστερ πρέπει να έχει 2 τερματοφύλακες, 5 αμυντικούς, 5 μέσους και 3 επιθετικούς. Έχει ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `Η ενδεκάδα έχει ${paiktes(Number(m[1]))} αντί για ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Η ομάδα δεν έχει ακριβώς έναν αρχηγό.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Η ομάδα δεν έχει ακριβώς έναν υπαρχηγό.'
  return 'Η ομάδα δεν τηρεί τους κανόνες. Λεπτομέρειες στην ενότητα Η ομάδα μου.'
}

/** Isti razlogi v turščini (za turški mail in vmesnik). */
function razlogVTurscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Kadro geçerli değil.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  // Turščina: samostalnik za številom ostane v ednini ("3 oyuncu").
  const oyuncu = (n: number) => `${n} oyuncu`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Takım boş, kadroda hiç oyuncu yok.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Kadroda ${m[2]} yerine ${oyuncu(Number(m[1]))} var.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Kadroda artık aktif olmayan oyuncular var: ${m[1]}. Kulüpleri bu sezon oynamıyor ya da oyuncu takımdan ayrıldı.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `${m[1]} kulübünden ${oyuncu(Number(m[2]))} var, en fazla ${m[3]} oyuncuya izin veriliyor. ` +
      'Bu, sen bir değişiklik yapmasan da olabilir: sezon içinde bir oyuncu, zaten oyuncuların olan bir kulübe geçerse.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `${oyuncu(Number(m[1]))} için mevki bilinmiyor.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Kadroda 2 kaleci, 5 defans, 5 orta saha ve 3 forvet olmalı; şu an ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `İlk 11'de ${m[2]} yerine ${oyuncu(Number(m[1]))} var.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Takımda tam olarak bir kaptan yok.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Takımda tam olarak bir yardımcı kaptan yok.'
  return 'Takım kurallara uymuyor. Ayrıntılar Takımım bölümünde.'
}

/** Isti razlogi v ukrajinščini (za ukrajinski mail in vmesnik). */
function razlogVUkrajinscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Склад не відповідає правилам.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  // Називний ("у складі 3 гравці") in rodilnik ("для 3 гравців").
  const gravci = (n: number) => `${n} ${ukMn(n, 'гравець', 'гравці', 'гравців', 'гравця')}`
  const gravciRod = (n: number) => `${n} ${ukMn(n, 'гравця', 'гравців', 'гравців', 'гравця')}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Команда порожня, у складі немає жодного гравця.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `У складі ${gravci(Number(m[1]))} замість ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `У складі є гравці, які більше не активні: ${m[1]}. Їхній клуб цього сезону не грає або гравець пішов.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `З клубу ${m[1]} у тебе ${gravci(Number(m[2]))}, дозволено ${m[3]}. ` +
      'Таке може статися і без твоїх змін: якщо гравець посеред сезону перейшов у клуб, з якого в тебе вже є гравці.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `Для ${gravciRod(Number(m[1]))} позиція невідома.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `У складі мають бути 2 воротарі, 5 захисників, 5 півзахисників і 3 нападники; зараз ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `У стартовій одинадцятці ${gravci(Number(m[1]))} замість ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'У команді немає рівно одного капітана.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'У команді немає рівно одного віцекапітана.'
  return 'Команда не відповідає правилам. Подробиці в розділі Моя команда.'
}

/** Isti razlogi v armenščini (za armenski mail in vmesnik). Samostalnik za številom ostane v ednini. */
function razlogVArmenscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Կազմը կանոններին չի համապատասխանում։'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const igraci = (n: number) => `${n} խաղացող`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Թիմը դատարկ է, կազմում ոչ մի խաղացող չկա։'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Կազմում կա ${igraci(Number(m[1]))}՝ ${m[2]}-ի փոխարեն։`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Կազմում կան խաղացողներ, որոնք այլևս ակտիվ չեն: ${m[1]}։ Նրանց ակումբն այս մրցաշրջանում չի խաղում, կամ խաղացողը հեռացել է։`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `${m[1]} ակումբից ունես ${igraci(Number(m[2]))}, թույլատրվում է ${m[3]}-ը։ ` +
      'Դա կարող է պատահել նաև առանց քո փոփոխության. եթե խաղացողը մրցաշրջանի ընթացքում տեղափոխվի ակումբ, որից արդեն խաղացողներ ունես։'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `${igraci(Number(m[1]))}ի դիրքը հայտնի չէ։`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Կազմում պետք է լինի 2 դարպասապահ, 5 պաշտպան, 5 կիսապաշտպան և 3 հարձակվող. այժմ կա ${m[1]}։`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `Հիմնական կազմում կա ${igraci(Number(m[1]))}՝ ${m[2]}-ի փոխարեն։`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Թիմում պետք է լինի ճիշտ մեկ ավագ։'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Թիմում պետք է լինի ճիշտ մեկ փոխավագ։'
  return 'Թիմը կանոններին չի համապատասխանում։ Մանրամասները՝ «Իմ թիմը» բաժնում։'
}

/** Isti razlogi v azerbajdžanščini (za azerbajdžanski mail in vmesnik). Samostalnik za številom v ednini. */
function razlogVAzerbajdzanscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Heyət qaydalara uyğun deyil.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const oyuncu = (n: number) => `${n} oyunçu`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Komanda boşdur, heyətdə heç bir oyunçu yoxdur.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Heyətdə ${m[2]} yerinə ${oyuncu(Number(m[1]))} var.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Heyətdə artıq aktiv olmayan oyunçular var: ${m[1]}. Onların klubu bu mövsüm oynamır və ya oyunçu gedib.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `${m[1]} klubundan ${oyuncu(Number(m[2]))}n var, icazə verilən ${m[3]}. ` +
      'Bu, sənin dəyişikliyin olmadan da baş verə bilər: oyunçu mövsüm ərzində artıq oyunçuların olan kluba keçərsə.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `${oyuncu(Number(m[1]))}nun mövqeyi məlum deyil.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Heyətdə 2 qapıçı, 5 müdafiəçi, 5 yarımmüdafiəçi və 3 hücumçu olmalıdır; indi ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `Əsas heyətdə ${m[2]} yerinə ${oyuncu(Number(m[1]))} var.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Komandanın düz bir kapitanı yoxdur.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Komandanın düz bir kapitan müavini yoxdur.'
  return 'Komanda qaydalara uyğun deyil. Ətraflı məlumat Komandam bölməsindədir.'
}

// Danščina: one (1) in other; razlogi imajo le cela števila.
const daMn = (n: number, one: string, other: string) => (n === 1 ? one : other)

/** Isti razlogi v danščini (za danski mail in vmesnik). */
function razlogVDanscini(razlog: string | null | undefined): string {
  if (!razlog) return 'Truppen er ikke gyldig.'
  const r = razlog.trim()
  let m: RegExpMatchArray | null
  const spillere = (n: number) => `${n} ${daMn(n, 'spiller', 'spillere')}`

  if (r === 'Ekipa je prazna — kadra ni.') return 'Holdet er tomt, der er ingen spillere i truppen.'
  if ((m = r.match(/^V kadru je (\d+) igralcev namesto (\d+)\.$/)))
    return `Der er ${spillere(Number(m[1]))} i truppen i stedet for ${m[2]}.`
  if ((m = r.match(/^V kadru ni vec aktivnih igralcev: (.*)\. Klub letos ne igra ali je igralec odsel\.$/s)))
    return `Der er spillere i truppen, som ikke længere er aktive: ${m[1]}. Deres klub spiller ikke i denne sæson, eller spilleren har forladt klubben.`
  if ((m = r.match(/^Iz kluba (.+) imas (\d+) igralce, dovoljeni so (\d+)\./s)))
    return `Du har ${spillere(Number(m[2]))} fra klubben ${m[1]}, højst ${m[3]} er tilladt. ` +
      'Det kan også ske, uden at du har ændret noget: hvis en spiller i løbet af sæsonen skifter til en klub, du allerede har spillere fra.'
  if ((m = r.match(/^Pri (\d+) igralcih ni znana pozicija\.$/)))
    return `For ${spillere(Number(m[1]))} er positionen ikke kendt.`
  if ((m = r.match(/^Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima ([\d-]+)\.$/)))
    return `Truppen skal have 2 målmænd, 5 forsvarsspillere, 5 midtbanespillere og 3 angribere; den har ${m[1]}.`
  if ((m = r.match(/^V postavi je (\d+) igralcev namesto (\d+)\.$/)))
    return `Der er ${spillere(Number(m[1]))} i startelleveren i stedet for ${m[2]}.`
  if (r === 'Ekipa nima natanko enega kapetana.') return 'Holdet har ikke præcis én kaptajn.'
  if (r === 'Ekipa nima natanko enega namestnika kapetana.')
    return 'Holdet har ikke præcis én vicekaptajn.'
  return 'Holdet overholder ikke reglerne. Detaljer finder du under Mit hold.'
}
