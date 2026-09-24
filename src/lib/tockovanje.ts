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

  // clean sheet (vsaj 60 minut, brez prejetega gola)
  cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 } as Record<Pozicija, number>,

  // prejeti goli: -1 za vsaka 2 prejeta (vratarji in branilci)
  prejetiNaTocko: 2,
  prejetiPozicije: ['GK', 'DEF'] as Pozicija[],

  obranjenaEnajstmetrovka: 5,
  zgresenaEnajstmetrovka: -2,
  avtogol: -2,
  rumeniKarton: -1,
  rdeciKarton: -3,
}

/** Izračuna točke enega igralca na eni tekmi. */
export function tockeZaNastop(n: Nastop, pozicija: Pozicija): IzracunTock {
  const postavke: Postavka[] = []
  const dodaj = (opis: string, tocke: number) => {
    if (tocke !== 0) postavke.push({ opis, tocke })
  }

  const minute = n.minute ?? 0
  if (minute <= 0) return { skupaj: 0, postavke: [] }

  // igralni čas
  if (minute >= TOCKE.pragMinut) dodaj(t('tekme.tockovanje.postavke.nastopOd60'), TOCKE.nastopOd60)
  else dodaj(t('tekme.tockovanje.postavke.nastopDo60'), TOCKE.nastopDo60)

  // goli
  const zaGol = TOCKE.gol[pozicija] ?? 0
  const goli = n.goli ?? 0
  if (goli > 0) dodaj(goli === 1 ? t('tekme.tockovanje.postavke.gol') : t('tekme.tockovanje.postavke.goli', { n: goli }), goli * zaGol)

  // asistence (iz glasovanja skupnosti)
  const asistence = n.asistence ?? 0
  if (asistence > 0)
    dodaj(
      asistence === 1
        ? t('tekme.tockovanje.postavke.asistenca')
        : t('tekme.tockovanje.postavke.asistence', { n: asistence }),
      asistence * TOCKE.asistenca,
    )

  // clean sheet
  const zaCS = TOCKE.cleanSheet[pozicija] ?? 0
  if (n.cleanSheet && minute >= TOCKE.pragMinut && zaCS > 0)
    dodaj(t('tekme.tockovanje.postavke.brezPrejetega'), zaCS)

  // prejeti goli
  const prejetiGoli = n.prejetiGoli ?? 0
  if (TOCKE.prejetiPozicije.includes(pozicija) && prejetiGoli > 0) {
    const odbitek = -Math.floor(prejetiGoli / TOCKE.prejetiNaTocko)
    if (odbitek !== 0) dodaj(t('tekme.tockovanje.postavke.prejetiGoli', { n: prejetiGoli }), odbitek)
  }

  // posebne akcije
  const obranjene = n.obranjeneEnajstmetrovke ?? 0
  if (obranjene > 0)
    dodaj(
      t('tekme.tockovanje.postavke.obranjena', { n: obranjene }),
      obranjene * TOCKE.obranjenaEnajstmetrovka,
    )
  const zgresene = n.zgreseneEnajstmetrovke ?? 0
  if (zgresene > 0)
    dodaj(
      t('tekme.tockovanje.postavke.zgresena', { n: zgresene }),
      zgresene * TOCKE.zgresenaEnajstmetrovka,
    )
  const avtogoli = n.avtogoli ?? 0
  if (avtogoli > 0) dodaj(t('tekme.tockovanje.postavke.avtogol', { n: avtogoli }), avtogoli * TOCKE.avtogol)
  const rumeni = n.rumeni ?? 0
  if (rumeni > 0) dodaj(t('tekme.tockovanje.postavke.rumeni', { n: rumeni }), rumeni * TOCKE.rumeniKarton)
  const rdeci = n.rdeci ?? 0
  if (rdeci > 0) dodaj(t('tekme.tockovanje.postavke.rdeci'), rdeci * TOCKE.rdeciKarton)

  return {
    skupaj: postavke.reduce((v, p) => v + p.tocke, 0),
    postavke,
  }
}

/** Kratek opis pravil za prikaz uporabnikom. */
export const PRAVILA_OPIS: Array<{
  skupina: string
  vrstice: Array<[string, string]>
}> = [
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
    [t('tekme.tockovanje.pravila.csVratarBranilec'), '+4'],
    [t('tekme.tockovanje.pravila.csVezist'), '+1'],
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
