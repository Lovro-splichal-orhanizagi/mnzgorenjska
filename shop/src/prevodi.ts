// Motiv iz baze v jeziku strani. Imena, opise in oznake bere pr() (besede.ts) ob
// izrisu; tu se ob nalaganju zamenjajo le podatki, ki jih bere več mest hkrati:
// izmišljeni primeri (prevodi.<jezik>.primeri: domača imena in ekipe), privzete
// vrednosti polj (privzeto_<jezik>) in nizi izbire (moznosti_<jezik>, slogani).
// Baza sprejme niz iz katerega koli seznama moznosti* (trgovina.vrednost_polja).
import { jezik } from './besede'
import type { Jezik } from './jezik'
import type { Izdelek, PoljeMotiva, PrimerMotiva, Prevodi } from './baza'

export function lokalizirajMotiv<M extends { polja: PoljeMotiva[]; primeri: PrimerMotiva[]; prevodi?: Prevodi | null }>(m: M, j: Jezik = jezik): M {
  if (j === 'sl') return m
  const primeri = m.prevodi?.[j]?.primeri
  return {
    ...m,
    primeri: primeri?.length ? primeri : m.primeri,
    polja: m.polja.map((p) => {
      const r = p as unknown as Record<string, unknown>
      const privzeto = r[`privzeto_${j}`]
      const moznosti = r[`moznosti_${j}`]
      return {
        ...p,
        ...((typeof privzeto === 'string' || typeof privzeto === 'number') && { privzeto }),
        ...(Array.isArray(moznosti) && { moznosti: moznosti as PoljeMotiva['moznosti'] }),
      }
    }),
  }
}

export const lokalizirajIzdelek = <I extends Pick<Izdelek, 'motivi'>>(i: I): I =>
  i.motivi ? { ...i, motivi: i.motivi.map((m) => lokalizirajMotiv(m)) } : i
