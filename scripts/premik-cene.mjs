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
 * @returns {number} nova cena na mreži 0.5 ali nespremenjena trenutna cena
 */
export function premakniProti(trenutna, ciljna, najvec = NAJVECJI_TEDENSKI_PREMIK) {
  if (najvec === 0 || trenutna === ciljna) return trenutna

  const razlika = zaokrozi(ciljna) - trenutna
  const omejena = trenutna + Math.sign(razlika) * Math.min(Math.abs(razlika), najvec)
  // Zaokrožimo proti trenutni ceni, da mreža 0.5 ne razširi dovoljene meje.
  const nova = (razlika > 0 ? Math.floor(omejena * 2) : Math.ceil(omejena * 2)) / 2
  // Če v smeri cilja ni dovoljenega koraka, ohranimo tudi ceno zunaj mreže.
  if ((nova - trenutna) * (ciljna - trenutna) < 0 || Math.abs(nova - trenutna) > najvec)
    return trenutna
  return nova
}
