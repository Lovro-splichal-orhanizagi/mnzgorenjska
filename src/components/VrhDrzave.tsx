import { useEffect, useState } from 'react'
import { Link } from './Povezava'
import { zLigo } from '../lib/tekmovanje'
import { supabase } from '../lib/supabase'
import { formatirajTocke, mnozina, prikazniIme, TEKME } from '../lib/pomozno'
import Grb from './Grb'
import { t } from '../i18n'
import type { Database } from '../lib/baza.types'

type Vrstica = Database['public']['Functions']['vrh_drzave']['Returns'][number]

// Vrstni red in oznake lestvic; ključ je `kategorija` iz `vrh_drzave`.
// Asistenc ni (in točke so brez njih): potrdi jih glasovanje, ki živi skoraj
// samo na Gorenjskem, zato lig med seboj ne bi primerjali pošteno.
export const LESTVICE = [
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
    return <p className="text-sm text-slate-400">{t('lestvice.slovenija.vrhPrazno')}</p>

  return (
    <div className="space-y-6">
      {/* Najboljši pod reflektorjem: izrez pokaže snop luči (zgornji del
          fotografije), naslov stoji spodaj, kjer je slika temna. */}
      <section className="relative flex min-h-32 items-end overflow-hidden rounded-2xl p-4 ring-1 ring-white/10 sm:min-h-48 sm:p-6">
        <picture>
          <source srcSet="/foto/igrisce.webp" type="image/webp" />
          <img
            src="/foto/igrisce.jpg"
            alt=""
            aria-hidden
            width={1600}
            height={1067}
            className="absolute inset-0 h-full w-full object-cover object-[50%_30%]"
          />
        </picture>
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"
          aria-hidden
        />
        <div className="relative">
          <h2 className="text-2xl font-black leading-tight text-white sm:text-4xl">
            {t('lestvice.slovenija.vrhNaslov')}
          </h2>
          <p className="mt-1 text-sm text-gnl-200">
            {t('lestvice.slovenija.vrhUvod', { sezona: vrstice[0].season })}
          </p>
        </div>
      </section>
      {/* Mobilno vodoravni vrtiljak kot na naslovnici: po ena lestvica, prst
          povleče vstran do naslednje. lg: tri lestvice ena ob drugi. */}
      <div
        className="-mx-4 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 pb-3
                   sm:mx-0 sm:px-0
                   lg:grid lg:snap-none lg:grid-cols-3 lg:overflow-visible lg:pb-0"
      >
        {LESTVICE.map((l) => {
          const seznam = vrstice.filter((v) => v.kategorija === l.kljuc)
          // Lestvica brez vrstic (npr. brez vratarja s čisto mrežo) izostane.
          if (seznam.length === 0) return null
          return (
            <section
              key={l.kljuc}
              className="w-[86%] shrink-0 snap-start space-y-2 sm:w-[68%] lg:w-auto lg:shrink"
            >
              <h2 className="text-base font-bold">{l.naslov()}</h2>
              <ul className="kartica divide-y divide-white/10 overflow-hidden">
                {seznam.map((v) => (
                  <li
                    key={v.player_id}
                    className="relative flex min-h-[52px] items-center gap-2 px-3 py-2 sm:gap-3"
                  >
                    <span className="w-6 shrink-0 text-center text-sm font-black text-slate-500">
                      {v.mesto}
                    </span>
                    <Grb ime={v.team_name} kratko={v.team_short} logo={v.team_logo} velikost={22} />
                    <div className="min-w-0 flex-1">
                      {/* Liga igralca v naslovu: iskalnik naj igralca najde
                          v njegovi ligi, ne v izbrani. */}
                      <Link
                        to={zLigo(`/player/${v.player_id}`, v.competition_slug)}
                        className="block truncate text-sm font-semibold after:absolute after:inset-0 after:content-[''] hover:text-gnl-300"
                      >
                        {prikazniIme(v.full_name)}
                      </Link>
                      <div className="truncate text-xs text-slate-500">
                        {v.team_name} · {v.competition_short} · {mnozina(v.tekem, TEKME)}
                      </div>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums text-gnl-300">
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
