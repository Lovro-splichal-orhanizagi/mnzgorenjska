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
  const liga = tekmovanje?.name ?? 'našo ligo'
  const zveza = tekmovanje?.federation_name
  // "1. GNL — člani (MNZ Gorenjska)" pove tudi tistemu, ki lige ne pozna.
  const polno = zveza && !liga.includes(zveza) ? `${liga} (${zveza})` : liga

  const nasteti = klubi.filter(Boolean).slice(0, NAJVEC_KLUBOV)
  const seznam = nasteti.length ? ` naših klubov (${nasteti.join(', ')})` : ''

  // Ime lige stoji za dvopičjem in ne v stavku: slovenščina bi zahtevala
  // sklon ("za Super ligo", ne "za Super liga"), imena lig pa prihajajo iz
  // baze in jih ni mogoče sklanjati zanesljivo.
  return {
    zadeva: `Fantasy liga: ${liga} — pridi zraven`,
    besedilo:
      `Živjo!\n\nIgram fantasy nogometno ligo: ${polno}. Sestaviš svojo ekipo ` +
      `iz igralcev${seznam} in tekmuješ z drugimi.\n\n` +
      `Povsem brezplačno. Registriraj se na:\n${NASLOV_APLIKACIJE}\n\n` +
      `Sestavi ekipo, določi kapetana in po vsakem krogu preveri, kdo je zbral ` +
      `največ točk.\n\nSe vidimo v ligi!`,
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
