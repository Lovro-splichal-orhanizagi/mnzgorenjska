// Latviešu `skupno` (avots: src/i18n/sl/skupno.ts).
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Vārtsargs',
    DEF: 'Aizsargs',
    MID: 'Pussargs',
    FWD: 'Uzbrucējs',
  },
  pozicijaKratko: {
    GK: 'VS',
    DEF: 'AIZ',
    MID: 'PUS',
    FWD: 'UZB',
  },
  // Intl.PluralRules('lv'): zero = 0, 10–20, 30 … un daudzskaitļa ģenitīvs
  // ("0 punktu, 10 punktu"), one = 1, 21, 31 … izņemot 11 ("1 punkts, 21 punkts"),
  // other = pārējie ("2 punkti"). Decimāldaļas parasti ir other ("2,5 punkti").
  besede: {
    tocke: { zero: 'punktu', one: 'punkts', other: 'punkti' },
    /** "atskaitījums šajā kārtā: 4 punkti" (nominatīvs). */
    tockRodilnik: { zero: 'punktu', one: 'punkts', other: 'punkti' },
    /** Akuzatīvs ("atnesa 1 punktu, 12 punktus"). */
    tockeTozilnik: { zero: 'punktu', one: 'punktu', other: 'punktus' },
    igralci: { zero: 'spēlētāju', one: 'spēlētājs', other: 'spēlētāji' },
    ekipe: { zero: 'komandu', one: 'komanda', other: 'komandas' },
    tekme: { zero: 'spēļu', one: 'spēle', other: 'spēles' },
    goli: { zero: 'vārtu', one: 'vārti', other: 'vārti' },
    glasovi: { zero: 'balsu', one: 'balss', other: 'balsis' },
    krogi: { zero: 'kārtu', one: 'kārta', other: 'kārtas' },
  },
  cena: '{v} M€',
  nalaganje: 'Ielādē …',
  shrani: 'Saglabāt',
  preklici: 'Atcelt',
  zapri: 'Aizvērt',
  nazaj: 'Atpakaļ',
  napaka: 'Kļūda: {sporocilo}',
  napakeRpc: {
    miniLigaNi: 'Minilīgas ar šādu kodu nav.',
    niTvojaEkipa: 'Šī nav tava komanda.',
    imeMiniLige: 'Minilīgas nosaukumā jābūt no 2 līdz 40 rakstzīmēm.',
    prijavaMiniLiga: 'Lai piedalītos minilīgā, jāpiesakās.',
    niDovoljenja: 'Nav atļaujas rediģēt šo komandu.',
    kodaNeUstvarjena: 'Minilīgas kodu neizdevās izveidot. Mēģini vēlreiz.',
    golOdlocen: 'Par šiem vārtiem jau ir izlemts, balsošana ir slēgta.',
    zePoznavalec: 'Tu jau esi šīs līgas eksperts.',
    prosnjaCaka: 'Tavs pieteikums šai līgai jau gaida.',
    prosnjaZavrnjena: 'Pieteikums šai līgai nesen tika noraidīts. Jaunu vari iesniegt 14 dienas pēc noraidīšanas.',
    klubNeIgra: 'Izvēlētais klubs šajā līgā nespēlē.',
  },
}
