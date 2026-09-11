// Imena klubov 3. SNL, ki jih je treba prepoznati kot en klub.
//
// Pri ligah MNZ je nabor klubov last ene zveze in vzdevki stojijo pri viru.
// 3. SNL je drugačna: vodi jo NZS, tekočo sezono in arhiv pa objavita DVE
// različni zvezi. Isti klub gre torej skozi dva razčlenjevalnika in oba
// morata priti do istega ključa — sicer se klub v bazi razkolje na dva
// zapisa, sezona se razdeli, statistika pa tudi.
//
// Zato ta slovar ni last vira, ampak tekmovanja, in se prilije obema viroma,
// ki ligo objavljata.
//
// Dokaz, da gre res za isti klub, in ne za dva s podobnim imenom: v arhivu
// 2023/24 (26 krogov) ima vsak klub natanko 26 tekem, razklani pari pa se v
// 26 seštejejo —
//
//   Eltron Šenčur 14 + Šenčur 12 = 26
//   Brda 14 + Brda Dobrovo 12 = 26
//   Izola 19 + NK Izola 7 = 26
//
// Enako pri Vzhodu: Ljutomer 22 + NK Ljutomer 2 = 24 v isti sezoni.
//
// Na desni stoji ime, ki ga piše TEKOČA sezona, kadar klub v njej nastopa —
// arhiv se tako prilije k obstoječemu klubu, ne obratno.

/** 3. SNL Vzhod: arhiv pri Lendavi, tekoča sezona pri Ptuju. */
export const VZHOD = {
  'nk ljutomer': 'ljutomer',
  'zase videm': 'videm',
}

/** 3. SNL Zahod: arhiv pri Ljubljani, tekoča sezona pri Novi Gorici. */
export const ZAHOD = {
  'šenčur': 'eltron šenčur',
  'nk izola': 'izola',
  // Brda so izpadla in jih tekoča sezona nima; obvelja krajše ime.
  'brda dobrovo': 'brda',
}
