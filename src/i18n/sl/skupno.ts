// Nizi, ki jih uporablja več strani: pozicije, števne besede, splošni gumbi.
export const skupno = {
  pozicija: {
    GK: 'Vratar',
    DEF: 'Branilec',
    MID: 'Vezist',
    FWD: 'Napadalec',
  },
  pozicijaKratko: {
    GK: 'VRA',
    DEF: 'BRA',
    MID: 'VEZ',
    FWD: 'NAP',
  },
  // Števne besede brez števila; število doda `mnozina()` iz lib/pomozno.
  besede: {
    tocke: { one: 'točka', two: 'točki', few: 'točke', other: 'točk' },
    /** Rodilnik ("odbitek 1 točke, 2 točk"). */
    tockRodilnik: { one: 'točke', two: 'točk', few: 'točk', other: 'točk' },
    /** Tožilnik ("prinesla 1 točko, 2 točki"). */
    tockeTozilnik: { one: 'točko', two: 'točki', few: 'točke', other: 'točk' },
    igralci: { one: 'igralec', two: 'igralca', few: 'igralci', other: 'igralcev' },
    ekipe: { one: 'ekipa', two: 'ekipi', few: 'ekipe', other: 'ekip' },
    tekme: { one: 'tekma', two: 'tekmi', few: 'tekme', other: 'tekem' },
    goli: { one: 'gol', two: 'gola', few: 'goli', other: 'golov' },
    glasovi: { one: 'glas', two: 'glasova', few: 'glasovi', other: 'glasov' },
    krogi: { one: 'krog', two: 'kroga', few: 'krogi', other: 'krogov' },
  },
  cena: '{v} M€',
  nalaganje: 'Nalaganje …',
  shrani: 'Shrani',
  preklici: 'Prekliči',
  zapri: 'Zapri',
  nazaj: 'Nazaj',
  napaka: 'Napaka: {sporocilo}',
}
