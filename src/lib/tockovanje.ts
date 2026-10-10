// Točkovanje SLFF.
//
// Točke se računajo iz uradnih zapisnikov medobčinskih zvez, razen asistenc in
// pozicij, ki jih določi skupnost z glasovanjem.

import type { IzracunTock, Nastop, Postavka, Pozicija } from './tipi'
import { t } from '../i18n/jedro.ts'

export const TOCKE = {
  // igralni čas
  nastopDo60: 1,
  nastopOd60: 2,
  pragMinut: 60, // brez sodniškega podaljška

  // goli po pozicijah
  gol: { GK: 10, DEF: 6, MID: 5, FWD: 4 } as Record<Pozicija, number>,

  asistenca: 3,

  // clean sheet (vsaj 60 minut, brez prejetega gola, dokler je igralec na igrišču)
  cleanSheet: { GK: 5, DEF: 4, MID: 1, FWD: 0 } as Record<Pozicija, number>,

  // zmaga ekipe (vsaj 60 minut)
  zmaga: { GK: 2, DEF: 2, MID: 0, FWD: 0 } as Record<Pozicija, number>,

  // prejeti goli: -1 za vsaka 2 prejeta (vratarji in branilci)
  prejetiNaTocko: 2,
  prejetiPozicije: ['GK', 'DEF'] as Pozicija[],

  obranjenaEnajstmetrovka: 5,
  zgresenaEnajstmetrovka: -2,
  avtogol: -2,
  rumeniKarton: -1,
  rdeciKarton: -3,
}

/** Najnovejša različica pravil (`rounds.pravila_tockovanja`). */
export const PRAVILA_TOCKOVANJA = 2

// Krogi, začeti pred migracijo 20260928100000, se točkujejo po različici 1:
// čista mreža vratarja +4, brez točk za zmago.
const PRAVILA_1 = {
  ...TOCKE,
  cleanSheet: { ...TOCKE.cleanSheet, GK: 4 },
  zmaga: { GK: 0, DEF: 0, MID: 0, FWD: 0 } as Record<Pozicija, number>,
}

/** Izračuna točke enega igralca na eni tekmi. */
export function tockeZaNastop(n: Nastop, pozicija: Pozicija): IzracunTock {
  const postavke: Postavka[] = []
  const dodaj = (opis: string, tocke: number) => {
    if (tocke !== 0) postavke.push({ opis, tocke })
  }

  const T = (n.pravila ?? PRAVILA_TOCKOVANJA) >= 2 ? TOCKE : PRAVILA_1
  const minute = n.minute ?? 0
  if (minute <= 0) return { skupaj: 0, postavke: [] }

  // igralni čas
  if (minute >= T.pragMinut) dodaj(t('tekme.tockovanje.postavke.nastopOd60'), T.nastopOd60)
  else dodaj(t('tekme.tockovanje.postavke.nastopDo60'), T.nastopDo60)

  // goli
  const zaGol = T.gol[pozicija] ?? 0
  const goli = n.goli ?? 0
  if (goli > 0) dodaj(goli === 1 ? t('tekme.tockovanje.postavke.gol') : t('tekme.tockovanje.postavke.goli', { n: goli }), goli * zaGol)

  // asistence (iz glasovanja skupnosti)
  const asistence = n.asistence ?? 0
  if (asistence > 0)
    dodaj(
      asistence === 1
        ? t('tekme.tockovanje.postavke.asistenca')
        : t('tekme.tockovanje.postavke.asistence', { n: asistence }),
      asistence * T.asistenca,
    )

  // clean sheet
  const zaCS = T.cleanSheet[pozicija] ?? 0
  if (n.cleanSheet && minute >= T.pragMinut && zaCS > 0)
    dodaj(t('tekme.tockovanje.postavke.brezPrejetega'), zaCS)

  // zmaga ekipe
  const zaZmago = T.zmaga[pozicija] ?? 0
  if (n.zmaga && minute >= T.pragMinut && zaZmago > 0)
    dodaj(t('tekme.tockovanje.postavke.zmaga'), zaZmago)

  // prejeti goli
  const prejetiGoli = n.prejetiGoli ?? 0
  if (T.prejetiPozicije.includes(pozicija) && prejetiGoli > 0) {
    const odbitek = -Math.floor(prejetiGoli / T.prejetiNaTocko)
    if (odbitek !== 0) dodaj(t('tekme.tockovanje.postavke.prejetiGoli', { n: prejetiGoli }), odbitek)
  }

  // posebne akcije
  const obranjene = n.obranjeneEnajstmetrovke ?? 0
  if (obranjene > 0)
    dodaj(
      t('tekme.tockovanje.postavke.obranjena', { n: obranjene }),
      obranjene * T.obranjenaEnajstmetrovka,
    )
  const zgresene = n.zgreseneEnajstmetrovke ?? 0
  if (zgresene > 0)
    dodaj(
      t('tekme.tockovanje.postavke.zgresena', { n: zgresene }),
      zgresene * T.zgresenaEnajstmetrovka,
    )
  const avtogoli = n.avtogoli ?? 0
  if (avtogoli > 0) dodaj(t('tekme.tockovanje.postavke.avtogol', { n: avtogoli }), avtogoli * T.avtogol)
  const rumeni = n.rumeni ?? 0
  if (rumeni > 0) dodaj(t('tekme.tockovanje.postavke.rumeni', { n: rumeni }), rumeni * T.rumeniKarton)
  const rdeci = n.rdeci ?? 0
  if (rdeci > 0) dodaj(t('tekme.tockovanje.postavke.rdeci'), rdeci * T.rdeciKarton)

  return {
    skupaj: postavke.reduce((v, p) => v + p.tocke, 0),
    postavke,
  }
}

/** Kratek opis pravil za prikaz uporabnikom. */
export const pravilaOpis = (): Array<{
  skupina: string
  vrstice: Array<[string, string]>
}> => [
  { skupina: t('tekme.tockovanje.pravila.igralniCas'), vrstice: [
    [t('tekme.tockovanje.pravila.nastopDo60'), '+1'],
    [t('tekme.tockovanje.pravila.nastopOd60'), '+2'],
  ]},
  { skupina: t('tekme.tockovanje.pravila.goliInAsistence'), vrstice: [
    [t('tekme.tockovanje.pravila.golVratarja'), '+10'],
    [t('tekme.tockovanje.pravila.golBranilca'), '+6'],
    [t('tekme.tockovanje.pravila.golVezista'), '+5'],
    [t('tekme.tockovanje.pravila.golNapadalca'), '+4'],
    [t('tekme.tockovanje.pravila.asistenca'), '+3'],
  ]},
  { skupina: t('tekme.tockovanje.pravila.obramba'), vrstice: [
    [t('tekme.tockovanje.pravila.csVratar'), '+5'],
    [t('tekme.tockovanje.pravila.csBranilec'), '+4'],
    [t('tekme.tockovanje.pravila.csVezist'), '+1'],
    [t('tekme.tockovanje.pravila.zmaga'), '+2'],
    [t('tekme.tockovanje.pravila.prejeta2'), '−1'],
    [t('tekme.tockovanje.pravila.obranjena'), '+5'],
  ]},
  { skupina: t('tekme.tockovanje.pravila.kazni'), vrstice: [
    [t('tekme.tockovanje.pravila.zgresena'), '−2'],
    [t('tekme.tockovanje.pravila.avtogol'), '−2'],
    [t('tekme.tockovanje.pravila.rumeni'), '−1'],
    [t('tekme.tockovanje.pravila.rdeci'), '−3'],
  ]},
]
