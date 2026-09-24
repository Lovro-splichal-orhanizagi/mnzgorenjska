import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatirajTocke, mnozina, EKIPE, KROGI } from '../lib/pomozno'
import { vseVrstice } from '../lib/strani'
import { useNaslov } from '../lib/naslov'
import {
  razvrsti,
  zMesti,
  povzetek,
  NAJMANJ_KROGOV_ZA_POVPRECJE,
  type DrzavnaVrstica,
  type Razvrstitev,
} from '../lib/drzavna'
import { t } from '../i18n'

const MEDALJE = ['🥇', '🥈', '🥉']

/**
 * Državna lestvica — vse ekipe vseh lig skupaj.
 *
 * Petnajst od sedemnajstih lig ima po nekaj ekip. Manager v taki ligi nima s
 * čim primerjati svojega rezultata, zato liga ostane mrtva, dokler se sama od
 * sebe ne napolni. Ta stran mu da nasprotnike takoj.
 */
export default function Slovenija() {
  const [vrstice, setVrstice] = useState<DrzavnaVrstica[]>([])
  const [kako, setKako] = useState<Razvrstitev>('skupno')
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [seNiPripravljena, setSeNiPripravljena] = useState(false)
  useNaslov(t('lestvice.slovenija.naslovStrani'))

  useEffect(() => {
    let veljavno = true
    ;(async () => {
      // Vse ekipe vseh lig: po straneh, ker jih je lahko čez tisoč.
      let data: DrzavnaVrstica[] = []
      let error: { message: string; code?: string } | null = null
      try {
        data = (await vseVrstice((od, do_) =>
          supabase
            .from('lestvica_drzavna')
            // Niz mora biti EN literal: supabase-js tipe bere iz njega s
            // predlogo, sestavljen niz pa je zanj navaden `string` in vrne
            // `GenericStringError`.
            .select(
              'fantasy_team_id, team_name, owner_name, total_points, rounds_played, points_per_round, competition_slug, competition_short, federation_short',
            )
            .order('total_points', { ascending: false })
            .order('fantasy_team_id')
            .range(od, do_),
        )) as DrzavnaVrstica[]
      } catch (e) {
        error = { message: (e as Error).message }
      }
      if (!veljavno) return
      // Koda in migracije potujeta vsaka po svoji poti: koda gre prek CI na
      // Vercel, migracijo pa je treba pognati proti Supabase. Ce se vrstni red
      // obrne — ali ce je Supabase ravno na vzdrzevanju, kakor je bil ob
      // objavi te strani — pogleda se ni in PostgREST vrne 42P01. Takrat naj
      // stran pove, da lestvice se ni, ne pa izpise napake baze.
      if (error) {
        const seNiPripravljena =
          error.code === '42P01' || /lestvica_drzavna/.test(error.message)
        setNapaka(seNiPripravljena ? null : error.message)
        setSeNiPripravljena(seNiPripravljena)
      } else setVrstice(data)
      setNalaganje(false)
    })()
    return () => {
      veljavno = false
    }
  }, [])

  const urejene = useMemo(() => zMesti(razvrsti(vrstice, kako), kako), [vrstice, kako])
  const skupaj = useMemo(() => povzetek(vrstice), [vrstice])

  if (nalaganje) return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>
  if (napaka) return <p className="text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
  if (seNiPripravljena)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black naslov sm:text-3xl">{t('lestvice.slovenija.naslov')}</h1>
        <p className="kartica p-6 text-center text-slate-400">
          {t('lestvice.slovenija.pripravlja')}
        </p>
      </div>
    )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black naslov sm:text-3xl">{t('lestvice.slovenija.naslov')}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {t('lestvice.slovenija.povzetek', {
            ekip: mnozina(skupaj.ekip, EKIPE),
            lig: t('lestvice.slovenija.lig', { n: skupaj.lig }),
            zvez: t('lestvice.slovenija.zvez', { n: skupaj.zvez }),
          })}
        </p>
      </div>

      <div className="flex gap-2">
        {(
          [
            ['skupno', t('lestvice.slovenija.skupno')],
            ['povprecje', t('lestvice.slovenija.naKrog')],
          ] as [Razvrstitev, string][]
        ).map(([k, naslov]) => (
          <button
            key={k}
            onClick={() => setKako(k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
              kako === k ? 'bg-gnl-500/20 text-gnl-200 ring-1 ring-gnl-400/40' : 'bg-white/5 text-slate-400'
            }`}
          >
            {naslov}
          </button>
        ))}
      </div>

      {kako === 'povprecje' && (
        <p className="text-xs text-slate-500">
          {t('lestvice.slovenija.povprecjeRazlaga', {
            krogov: t('lestvice.slovenija.zOdigranimiKrogi', { n: NAJMANJ_KROGOV_ZA_POVPRECJE }),
          })}
        </p>
      )}

      {urejene.length === 0 ? (
        <p className="kartica p-6 text-center text-slate-400">
          {/* Sporočilo mora povedati RESNICO: ob razvrstitvi po povprečju je
              lestvica prazna zato, ker nihče še ni odigral dovolj krogov — ne
              zato, ker ne bi igral nihče. Prva različica je trdila slednje in
              je bila videti kot okvara. */}
          {kako === 'povprecje' && vrstice.length > 0
            ? t('lestvice.slovenija.premaloKrogov', {
                krogov: t('lestvice.slovenija.krogovTozilnik', { n: NAJMANJ_KROGOV_ZA_POVPRECJE }),
              })
            : t('lestvice.slovenija.nobenaEkipa')}
        </p>
      ) : (
        <ul className="space-y-1">
          {urejene.map((v) => (
            <li
              key={v.fantasy_team_id}
              className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2"
            >
              <span className="w-7 shrink-0 text-center text-sm font-black text-slate-400">
                {v.mesto <= 3 ? MEDALJE[v.mesto - 1] : v.mesto}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/ekipa/${v.fantasy_team_id}`}
                  className="block truncate font-bold hover:text-gnl-400"
                >
                  {v.team_name}
                </Link>
                <div className="truncate text-xs text-slate-500">
                  {v.owner_name}
                  {v.competition_short ? ` · ${v.competition_short}` : ''}
                  {v.federation_short ? ` · ${v.federation_short}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-black tabular-nums text-gnl-300">
                  {formatirajTocke(
                    kako === 'povprecje' ? v.points_per_round : v.total_points,
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  {mnozina(Number(v.rounds_played ?? 0), KROGI)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-500">
        <Link to="/lestvica" className="underline hover:text-slate-300">
          {t('lestvice.slovenija.lestvicaLige')}
        </Link>
      </p>
    </div>
  )
}
