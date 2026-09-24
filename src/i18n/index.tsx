// Prevodi vmesnika za React: vse iz jedra in `tx` za stavke z elementi.
// Datoteke v `src/lib`, ki jih berejo skripte v Node, uvažajo `./jedro.ts`.
import { Fragment, type ReactNode } from 'react'
import { t, type Kljuc, type Parametri } from './jedro.ts'

export * from './jedro.ts'

/**
 * Prevod z oznakami za dele, ki niso navaden tekst (povezava, krepko):
 * `tx('prijava.pogoji', {}, { povezava: (b) => <Link to="/pravno">{b}</Link> })`
 * za niz "Strinjam se s <povezava>pogoji</povezava>." Tako stavek ostane
 * cel in ga prevajalec lahko preuredi.
 */
export function tx(
  kljuc: Kljuc,
  p: Parametri = {},
  oznake: Record<string, (vsebina: ReactNode) => ReactNode> = {},
): ReactNode {
  const niz = t(kljuc, p)
  const deli: ReactNode[] = []
  const re = /<(\w+)>(.*?)<\/\1>/gs
  let zadnji = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(niz))) {
    if (m.index > zadnji) deli.push(niz.slice(zadnji, m.index))
    const fn = oznake[m[1]]
    deli.push(<Fragment key={i++}>{fn ? fn(m[2]) : m[2]}</Fragment>)
    zadnji = m.index + m[0].length
  }
  if (zadnji < niz.length) deli.push(niz.slice(zadnji))
  return <>{deli}</>
}

