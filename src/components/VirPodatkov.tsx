// Noga: čigavi zapisniki so vir podatkov.
//
// Doslej je bil vir zapisan v kodi ("MNZ Gorenjska Kranj"). Z ljubljanskima
// ligama bi ta stavek trdil neresnico — zato ga pove tekmovanje samo, prek
// svoje zveze. Ena zveza = eno spletišče, zato naslov stoji na `federations`.
//
// Tekmovanje brez znane zveze ne dobi izmišljenega vira: takrat trditve
// preprosto ni.
import { useTekmovanje, type Tekmovanje } from '../lib/tekmovanje'

export interface Vir {
  ime: string
  url: string | null
}

/** Vir podatkov za tekmovanje; `null`, kadar ga ne poznamo. */
export function virPodatkov(t: Tekmovanje | null | undefined): Vir | null {
  if (!t?.federation_name) return null
  return { ime: t.federation_name, url: t.federation_url ?? null }
}

export default function VirPodatkov() {
  const { tekmovanje } = useTekmovanje()
  const vir = virPodatkov(tekmovanje)
  if (!vir) return null

  return (
    <>
      {' · '}
      Podatki: uradni zapisniki{' '}
      {vir.url ? (
        <a
          href={vir.url}
          className="underline hover:text-slate-400"
          target="_blank"
          rel="noreferrer"
        >
          {vir.ime}
        </a>
      ) : (
        vir.ime
      )}
    </>
  )
}
