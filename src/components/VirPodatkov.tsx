// Noga: čigavi zapisniki so vir podatkov.
//
// Doslej je bil vir zapisan v kodi ("MNZ Gorenjska Kranj"). Z ljubljanskima
// ligama bi ta stavek trdil neresnico — zato ga pove tekmovanje samo, prek
// svoje zveze. Ena zveza = eno spletišče, zato naslov stoji na `federations`.
//
// Tekmovanje brez znane zveze ne dobi izmišljenega vira: takrat trditve
// preprosto ni.
import { useTekmovanje, type Tekmovanje } from '../lib/tekmovanje'
import { t, tx } from '../i18n'

export interface Vir {
  ime: string
  url: string | null
}

/**
 * Vir podatkov za tekmovanje; `null`, kadar ga ne poznamo.
 *
 * Pri 3. SNL zveza in objavitelj nista ista: ligo vodi NZS, zapisnike pa
 * objavi ena od medobčinskih zvez. Zato ima tekmovanje lahko svojo navedbo,
 * ki povozi zvezino — sicer bi noga pokazala na `nzs.si`, kjer zapisnikov ni.
 */
export function virPodatkov(t: Tekmovanje | null | undefined): Vir | null {
  if (t?.vir_ime) return { ime: t.vir_ime, url: t.vir_url ?? null }
  if (!t?.federation_name) return null
  return { ime: t.federation_name, url: t.federation_url ?? null }
}

// `imeZveze` ima parameter `t`, ki zakrije prevod.
const splosnaZveza = () => t('aplikacija.noga.zvezeSplosno')

/**
 * Ime zveze za sredi stavka ("Statistika iz uradnih zapisnikov {X}.").
 *
 * Kadar zveze ne poznamo, vrne splošen izraz — stavek mora ostati slovnično
 * cel, prazna vrzel bi bila slabša od nenatančnosti.
 */
export function imeZveze(t: Tekmovanje | null | undefined): string {
  return virPodatkov(t)?.ime ?? splosnaZveza()
}

/** Ime zveze za trenutno izbrano ligo. */
export function useImeZveze(): string {
  const { tekmovanje } = useTekmovanje()
  return imeZveze(tekmovanje)
}

export default function VirPodatkov() {
  const { tekmovanje } = useTekmovanje()
  const vir = virPodatkov(tekmovanje)
  if (!vir) return null

  return (
    <>
      {' · '}
      {tx(
        'aplikacija.noga.vir',
        { ime: vir.ime },
        {
          vir: (b) =>
            vir.url ? (
              <a
                href={vir.url}
                className="underline hover:text-slate-400"
                target="_blank"
                rel="noreferrer"
              >
                {b}
              </a>
            ) : (
              b
            ),
        },
      )}
    </>
  )
}
