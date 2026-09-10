// Koliko sme cena zdrsniti ob rednem prevrednotenju.
//
// Med sezono ceno premika borza: največ ±0.3 na krog in nikoli več kot 3.0
// stran od `value_start` (migracija 20260828170000). Prevrednotenje pa ceno
// izračuna na novo iz percentilov — brez omejitve bi igralca, ki je jeseni
// pri 4.5 nabral minute, čez noč prestavilo na 9.0.
//
// Tak skok ni le grd. Uporabnik ga ima v ekipi po stari ceni, proračun je
// vezan na ceno ob nakupu, borza pa računa svoj `value_start`. Zato se cena
// **približuje** izračunani, po korakih.

/** Največ, kolikor se cena premakne ob enem tedenskem zagonu. */
export const NAJVECJI_TEDENSKI_PREMIK = 1.0

const zaokrozi = (v) => Math.round(v * 2) / 2

/**
 * @param {number} trenutna cena, ki jo igralec ima zdaj
 * @param {number} ciljna cena, kakršno pove izračun
 * @param {number} najvec največji dovoljen premik v enem zagonu
 * @returns {number} nova cena, zaokrožena na 0.5
 */
export function premakniProti(trenutna, ciljna, najvec = NAJVECJI_TEDENSKI_PREMIK) {
  const razlika = ciljna - trenutna
  if (Math.abs(razlika) <= najvec) return zaokrozi(ciljna)
  return zaokrozi(trenutna + Math.sign(razlika) * najvec)
}
