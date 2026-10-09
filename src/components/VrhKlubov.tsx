import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatirajTocke, mnozina, KROGI } from '../lib/pomozno'
import { NAJMANJ_KROGOV_ZA_POVPRECJE, type Razvrstitev } from '../lib/drzavna'
import Grb from './Grb'
import { t } from '../i18n'
import type { Database } from '../lib/baza.types'

type Vrstica = Database['public']['Functions']['vrh_klubov_drzave']['Returns'][number]

const MEDALJE = ['🥇', '🥈', '🥉']
const STRAN = 50

/**
 * Najboljše klubske ekipe države: točke, ki so jih igralci zbrali za ekipo, iz
 * vseh lig. Ne fantasy ekipe, ampak pravi klubi; člani in mladinci istega
 * kluba sta vsak svoja vrstica, prestopnik pri novem klubu začne z nič.
 * Sešteje in razvrsti baza (`vrh_klubov_drzave`).
 */
export default function VrhKlubov({ drzava }: { drzava: string }) {
  const [vrstice, setVrstice] = useState<Vrstica[]>([])
  const [kako, setKako] = useState<Razvrstitev>('skupno')
  const [koliko, setKoliko] = useState(STRAN)
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    let veljavno = true
    // Ena vrstica več pove, ali je za gumbom "Pokaži več" še kaj.
    supabase
      .rpc('vrh_klubov_drzave', {
        p_drzava: drzava,
        p_koliko: koliko + 1,
        p_na_krog: kako === 'povprecje',
        p_najmanj_krogov: NAJMANJ_KROGOV_ZA_POVPRECJE,
      })
      .then(({ data, error }) => {
        if (!veljavno) return
        setNapaka(error ? error.message : null)
        setVrstice(data ?? [])
        setNalaganje(false)
      })
    return () => {
      veljavno = false
    }
  }, [drzava, kako, koliko])

  const izberi = (k: Razvrstitev) => {
    setKako(k)
    setKoliko(STRAN)
  }

  if (nalaganje) return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>
  if (napaka) return <p className="text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {vrstice.length > 0 && t('lestvice.slovenija.klubiUvod', { sezona: vrstice[0].season })}
        </p>
        <div className="inline-flex rounded-lg bg-white/5 p-0.5">
          {(
            [
              ['skupno', t('lestvice.slovenija.skupno')],
              ['povprecje', t('lestvice.slovenija.naKrog')],
            ] as [Razvrstitev, string][]
          ).map(([k, naslov]) => (
            <button
              key={k}
              onClick={() => izberi(k)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                kako === k ? 'bg-gnl-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {naslov}
            </button>
          ))}
        </div>
      </div>

      {kako === 'povprecje' && (
        <p className="text-xs text-slate-500">
          {t('lestvice.slovenija.klubiPovprecje', {
            krogov: t('lestvice.slovenija.zOdigranimiKrogi', { n: NAJMANJ_KROGOV_ZA_POVPRECJE }),
          })}
        </p>
      )}

      {vrstice.length === 0 ? (
        <p className="text-sm text-slate-400">{t('lestvice.slovenija.vrhPrazno')}</p>
      ) : (
        <ol className="kartica divide-y divide-white/10 overflow-hidden">
          {vrstice.slice(0, koliko).map((v) => (
            <li
              key={`${v.team_id}-${v.competition_slug}`}
              className="relative flex min-h-[52px] items-center gap-2 px-3 py-2 transition hover:bg-white/5 sm:gap-3 sm:px-4"
            >
              <span className="w-7 shrink-0 text-center text-sm font-bold text-slate-400">
                {v.mesto <= 3 ? MEDALJE[v.mesto - 1] : v.mesto}
              </span>
              <Grb ime={v.team_name} kratko={v.team_short} logo={v.team_logo} velikost={26} />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/club/${v.team_id}`}
                  className="block truncate text-sm font-semibold after:absolute after:inset-0 after:content-[''] hover:text-gnl-400"
                >
                  {v.team_name}
                </Link>
                <div className="truncate text-xs text-slate-500">
                  {v.competition_short} · {t('lestvice.slovenija.klubiIgralcev', { n: v.igralcev })} · {v.goli}{' '}
                  <span aria-hidden>⚽</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold tabular-nums text-gnl-300">
                  {formatirajTocke(kako === 'povprecje' ? v.na_krog : v.tocke)}
                </div>
                <div className="text-[11px] text-slate-500">{mnozina(v.krogov, KROGI)}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {vrstice.length > koliko && (
        <div className="text-center">
          <button onClick={() => setKoliko(koliko + STRAN)} className="gumb-tih text-sm">
            {t('lestvice.slovenija.klubiVec')}
          </button>
        </div>
      )}
      <p className="text-xs text-slate-500">{t('lestvice.slovenija.klubiOpomba')}</p>
    </div>
  )
}
