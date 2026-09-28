import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatirajTocke, mnozina, prikazniIme, TEKME } from '../lib/pomozno'
import Grb from './Grb'
import { t } from '../i18n'
import type { Database } from '../lib/baza.types'

type Vrstica = Database['public']['Functions']['vrh_drzave']['Returns'][number]

// Vrstni red in oznake lestvic; ključ je `kategorija` iz `vrh_drzave`.
// Asistenc ni (in točke so brez njih): potrdi jih glasovanje, ki živi skoraj
// samo na Gorenjskem, zato lig med seboj ne bi primerjali pošteno.
const LESTVICE = [
  { kljuc: 'tocke', naslov: () => t('lestvice.slovenija.vrhTocke'), ikona: '', tocke: true },
  { kljuc: 'goli', naslov: () => t('lestvice.slovenija.vrhGoli'), ikona: '⚽', tocke: false },
  { kljuc: 'ciste_mreze', naslov: () => t('lestvice.slovenija.vrhCisteMreze'), ikona: '🧤', tocke: false },
]

/**
 * Najboljši igralci vseh lig države v tekoči sezoni — točke (brez asistenc),
 * strelci in čiste mreže vratarjev. Sešteje baza (`vrh_drzave`), da
 * brskalniku ni treba brati vseh igralcev vseh lig.
 */
export default function VrhDrzave({ drzava }: { drzava: string }) {
  const [vrstice, setVrstice] = useState<Vrstica[]>([])
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    let veljavno = true
    setNalaganje(true)
    supabase.rpc('vrh_drzave', { p_drzava: drzava, p_koliko: 10 }).then(({ data, error }) => {
      if (!veljavno) return
      setNapaka(error ? error.message : null)
      setVrstice(data ?? [])
      setNalaganje(false)
    })
    return () => {
      veljavno = false
    }
  }, [drzava])

  if (nalaganje) return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>
  if (napaka) return <p className="text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
  if (vrstice.length === 0)
    return <p className="kartica p-6 text-center text-slate-400">{t('lestvice.slovenija.vrhPrazno')}</p>

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        {t('lestvice.slovenija.vrhUvod', { sezona: vrstice[0].season })}
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        {LESTVICE.map((l) => {
          const seznam = vrstice.filter((v) => v.kategorija === l.kljuc)
          // Lestvica brez vrstic (npr. brez vratarja s čisto mrežo) izostane.
          if (seznam.length === 0) return null
          return (
            <section key={l.kljuc} className="space-y-2">
              <h2 className="text-lg font-bold">{l.naslov()}</h2>
              <ul className="space-y-1">
                {seznam.map((v) => (
                  <li
                    key={v.player_id}
                    className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 sm:gap-3"
                  >
                    <span className="w-6 shrink-0 text-center text-sm font-black text-slate-500">
                      {v.mesto}
                    </span>
                    <Grb ime={v.team_name} kratko={v.team_short} logo={v.team_logo} velikost={22} />
                    <div className="min-w-0 flex-1">
                      {/* Brez `?t=`: ta bi obiskovalcu trajno zamenjal izbrano
                          ligo, stran igralca pa bere po ligi igralca. */}
                      <Link
                        to={`/player/${v.player_id}`}
                        className="block truncate font-semibold hover:text-gnl-300"
                      >
                        {prikazniIme(v.full_name)}
                      </Link>
                      <div className="truncate text-xs text-slate-500">
                        {v.team_name} · {v.competition_short} · {mnozina(v.tekem, TEKME)}
                      </div>
                    </div>
                    <span className="shrink-0 font-black tabular-nums text-gnl-300">
                      {l.tocke ? formatirajTocke(v.vrednost) : v.vrednost}
                      {l.ikona && <span aria-hidden> {l.ikona}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
      <p className="text-xs text-slate-500">{t('lestvice.slovenija.vrhOpomba')}</p>
    </div>
  )
}
