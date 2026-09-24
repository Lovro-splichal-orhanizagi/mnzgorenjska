// Vabilo prijatelju — besedilo, ki pove PRAVO ligo.
//
// Doslej je bilo zapisano v kodi in je naštevalo trinajst gorenjskih klubov.
// Dokler je bila liga ena, je bilo to najboljše možno vabilo: konkretno, z
// imeni, ki jih prejemnik pozna. Z devetimi zvezami je postalo narobe —
// igralec iz Ptuja bi vabil s klubi, ki jih ni nikoli videl.
//
// Zato ga sestavimo iz izbrane lige in njenih resničnih klubov. Kadar klubov
// (še) ne poznamo, jih izpustimo; vabilo brez seznama je boljše od vabila z
// napačnim.
import type { Tekmovanje } from './tekmovanje'
import { t } from '../i18n/jedro.ts'

const NASLOV_APLIKACIJE = 'https://slff.eu'

/** Koliko klubov naštejemo, preden postane vabilo seznam in ne povabilo. */
const NAJVEC_KLUBOV = 13

export interface Vabilo {
  zadeva: string
  besedilo: string
}

export function sestaviVabilo(
  tekmovanje: Tekmovanje | null | undefined,
  klubi: string[] = [],
): Vabilo {
  const liga = tekmovanje?.name ?? t('aplikacija.vabilo.nasaLiga')
  const zveza = tekmovanje?.federation_name
  // "1. GNL — člani (MNZ Gorenjska)" pove tudi tistemu, ki lige ne pozna.
  const polno = zveza && !liga.includes(zveza) ? t('aplikacija.vabilo.ligaZZvezo', { liga, zveza }) : liga

  const nasteti = klubi.filter(Boolean).slice(0, NAJVEC_KLUBOV)
  const seznam = nasteti.length ? t('aplikacija.vabilo.klubi', { seznam: nasteti.join(', ') }) : ''

  // Ime lige stoji za dvopičjem in ne v stavku: slovenščina bi zahtevala
  // sklon ("za Super ligo", ne "za Super liga"), imena lig pa prihajajo iz
  // baze in jih ni mogoče sklanjati zanesljivo.
  return {
    zadeva: t('aplikacija.vabilo.zadeva', { liga }),
    besedilo: t('aplikacija.vabilo.besedilo', {
      liga: polno,
      klubi: seznam,
      naslov: NASLOV_APLIKACIJE,
    }),
  }
}

/** `mailto:` povezava za isto vabilo. */
export function vabiloMailto(v: Vabilo): string {
  return (
    'mailto:?subject=' +
    encodeURIComponent(v.zadeva) +
    '&body=' +
    encodeURIComponent(v.besedilo)
  )
}
