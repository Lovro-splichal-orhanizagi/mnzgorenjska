// Prepoznava kluba iz imena, ki ga zapiše MNZ Gorenjska.
//
// Klub je v bazi en sam, ne glede na to, katera selekcija igra — grb in
// zgodovina naj bosta na enem mestu. Vir pa isti klub piše različno: sponzor
// se med sezonama zamenja, članska in mladinska ekipa pa ga imata lahko celo
// hkrati različnega ("Eltron Preddvor" proti "Preddvor SP Avto").
//
// Zato ime najprej poenostavimo (brez ločil in velikih črk), znane različice
// pa preslikamo na eno samo. Brez preslikave bi vsak uvoz razporeda znova
// ustvaril "svoj" klub in razklal ligo na dva zapisa.

/** "Bled - Bohinj Hirter" → "bled bohinj hirter" */
export const poenostavi = (ime) =>
  ime
    .toLowerCase()
    .replace(/[^a-zčšž0-9]+/g, ' ')
    .trim()

// Vzdevki so last VIRA, ne sistema: dve zvezi sta dva ločena nabora klubov in
// ime, ki v Kranju pomeni en klub, v Ljubljani lahko pomeni drug. Zato vsak vir
// pripelje svoj slovar (`naredikljucKluba`), spodnji pa je gorenjski.
//
// levo: kar piše vir, desno: poenostavljeno ime, pod katerim klub že poznamo
const ISTI_KLUB = {
  'arne jezero medvode': 'jezero medvode',
  'preddvor sp avto': 'eltron preddvor',
  'bled bohinj': 'bled bohinj hirter',
}

/**
 * Sestavi prepoznavo kluba za en vir.
 *
 * @param {Record<string,string>} vzdevki poenostavljeno ime → ime, ki ga že poznamo
 */
export const naredikljucKluba =
  (vzdevki = {}) =>
  (ime) => {
    const k = poenostavi(ime)
    return vzdevki[k] ?? k
  }

/** Ključ, pod katerim klub iščemo in shranjujemo (MNZ Gorenjska). */
export const kljucKluba = naredikljucKluba(ISTI_KLUB)

/** Kratica iz začetnic, kadar klub v bazo pride na novo. */
export const kratkoIme = (polnoIme) =>
  polnoIme
    .split(/\s+/)
    .filter((d) => /[a-zčšžA-ZČŠŽ0-9]/.test(d))
    .map((d) => d[0])
    .join('')
    .toUpperCase()
    .slice(0, 4)
