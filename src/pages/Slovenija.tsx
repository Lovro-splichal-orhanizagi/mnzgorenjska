import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import ImeLastnika from '../components/ImeLastnika'
import ImeEkipe from '../components/ImeEkipe'
import { supabase } from '../lib/supabase'
import { formatirajTocke, mnozina, EKIPE, KROGI } from '../lib/pomozno'
import { vseVrstice } from '../lib/strani'
import { useNaslov } from '../lib/naslov'
import { useTekmovanje, zLigo } from '../lib/tekmovanje'
import VrhDrzave from '../components/VrhDrzave'
import VrhKlubov from '../components/VrhKlubov'
import LestvicaNapovediDrzave from '../components/LestvicaNapovediDrzave'
import { Zavihki, PloscaZavihkov } from '../components/Zavihki'
import { jeVStarosti, naslovStarosti, starostIzNaslova, type Starost } from '../lib/starost'
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
  const [vseVrsticeDrzav, setVrstice] = useState<DrzavnaVrstica[]>([])
  const [kako, setKako] = useState<Razvrstitev>('skupno')
  const [koliko, setKoliko] = useState(50)
  // Zavihek je v naslovu (`?pogled=igralci`, `?pogled=klubi`, `?pogled=napovedi`), da naslovnica
  // lahko pokaže naravnost na igralce in da je pogled deljiv. Ne `?t=` — ta menja ligo.
  const [iskanje, setIskanje] = useSearchParams()
  const pogled = iskanje.get('pogled')
  const zavihek = pogled === 'igralci' || pogled === 'klubi' || pogled === 'napovedi' ? pogled : 'ekipe'
  const setZavihek = (k: 'ekipe' | 'igralci' | 'klubi' | 'napovedi') => {
    const novo = new URLSearchParams(iskanje)
    if (k === 'ekipe') novo.delete('pogled')
    else novo.set('pogled', k)
    setIskanje(novo, { replace: true })
  }
  // Starostna skupina je v naslovu (`?starost=mladi`), kakor zavihek: pogled
  // se deli in preživi osvežitev. Kopija parametrov ohrani ligo (`t`) in zavihek.
  const starost = starostIzNaslova(iskanje.get('starost'))
  const setStarost = (s: Starost) => setIskanje(naslovStarosti(iskanje, s))
  // Starostna skupina lige po šifri; null = še ni (ali je ni).
  const [skupine, setSkupine] = useState<Map<string, string | null> | null>(null)
  const [skupineNapaka, setSkupineNapaka] = useState(false)
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [seNiPripravljena, setSeNiPripravljena] = useState(false)
  useNaslov(t(starost === 'mladi' ? 'lestvice.slovenija.naslovStraniMladi' : 'lestvice.slovenija.naslovStrani'))

  useEffect(() => {
    let veljavno = true
    supabase
      .from('competitions_view')
      .select('slug, starostna_skupina')
      .eq('active', true)
      .then(({ data, error }) => {
        if (!veljavno) return
        if (error || !data) {
          // Neuspeh ni "vse je glavna": ekip brez znane skupine ne uvrščamo nikamor.
          setSkupineNapaka(true)
          return
        }
        setSkupine(new Map(data.map((l) => [l.slug as string, l.starostna_skupina as string | null])))
      })
    return () => {
      veljavno = false
    }
  }, [])

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
              'fantasy_team_id, team_name, owner_name, owner_id, total_points, rounds_played, points_per_round, competition_slug, competition_short, federation_short',
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

  // Pogled združi vse aktivne lige vseh držav. Državna lestvica je lestvica
  // DRŽAVE, ki jo obiskovalec gleda — Slovenec slovaških ekip ne vidi. Filter
  // je tu in ne v poizvedbi, da stran ne pade, če koda pride pred migracijo.
  const { tekmovanja, drzava } = useTekmovanje()
  // Ekipe v ligah druge starostne skupine ali neznane skupine niso med njimi:
  // glava strani trdi, da so skupine ločene, zato jih tudi ta zavihek loči.
  const vrstice = useMemo(() => {
    const lige = new Set(tekmovanja.map((l) => l.slug))
    return vseVrsticeDrzav.filter(
      (v) =>
        v.competition_slug != null &&
        (lige.size === 0 || lige.has(v.competition_slug)) &&
        jeVStarosti(skupine?.get(v.competition_slug), starost),
    )
  }, [vseVrsticeDrzav, tekmovanja, skupine, starost])

  const urejene = useMemo(() => zMesti(razvrsti(vrstice, kako), kako), [vrstice, kako])
  const skupaj = useMemo(() => povzetek(vrstice), [vrstice])

  if (nalaganje || (skupine === null && !skupineNapaka && zavihek === 'ekipe')) return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>
  if (napaka) return <p className="text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
  if (seNiPripravljena)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black naslov sm:text-3xl">{t('lestvice.slovenija.naslov')}</h1>
        <p className="text-sm text-slate-400">
          {t('lestvice.slovenija.pripravlja')}
        </p>
      </div>
    )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black naslov sm:text-3xl">{t('lestvice.slovenija.naslov')}</h1>

      {/* Starostna skupina: glavna lestvica (člani + U19) in lestvica mladih
          (U18 in mlajši) se ne mešata; povezava vodi iz enega pogleda v drugega. */}
      <section aria-labelledby="starost-opis" className="space-y-3">
        <Zavihki
          id="starost"
          oznaka={t('lestvice.slovenija.skupinaOznaka')}
          zavihki={[
            { kljuc: 'glavna', naslov: t('lestvice.slovenija.skupinaGlavna') },
            { kljuc: 'mladi', naslov: <><span aria-hidden>🌱 </span>{t('lestvice.slovenija.skupinaMladi')}</> },
          ]}
          izbran={starost}
          naIzbiro={setStarost}
          razredSeznama="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1"
          razredZavihka={(aktiven) =>
            `min-h-11 rounded-lg px-3 py-2 text-center text-sm font-bold transition ${
              aktiven ? 'bg-gnl-500 text-slate-950' : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`
          }
        />
        <div className="rounded-xl border border-gnl-400/30 bg-gnl-500/10 px-3 py-2.5 sm:px-4">
          <p id="starost-opis" className="text-sm text-gnl-100">
            {t(starost === 'mladi' ? 'lestvice.slovenija.mladiOpis' : 'lestvice.slovenija.glavnaOpis')}
          </p>
          <Link
            to={{ search: `?${naslovStarosti(iskanje, starost === 'mladi' ? 'glavna' : 'mladi')}` }}
            className="mt-1 inline-block text-sm font-semibold text-gnl-300 underline hover:text-gnl-200"
          >
            {t(starost === 'mladi' ? 'lestvice.slovenija.mladiPovezava' : 'lestvice.slovenija.glavnaPovezava')}
          </Link>
        </div>
      </section>

      <Zavihki
        id="pogled"
        oznaka={t('lestvice.slovenija.naslovStrani')}
        zavihki={[
          { kljuc: 'ekipe', naslov: t('lestvice.slovenija.zavihekEkipe') },
          { kljuc: 'igralci', naslov: t('lestvice.slovenija.zavihekIgralci') },
          { kljuc: 'klubi', naslov: t('lestvice.slovenija.zavihekKlubi') },
          { kljuc: 'napovedi', naslov: t('lestvice.napovedi.napovedi') },
        ]}
        izbran={zavihek}
        naIzbiro={setZavihek}
        razredSeznama="flex gap-1 border-b border-white/10"
        razredZavihka={(aktiven) =>
          `-mb-px min-w-0 flex-1 truncate border-b-2 px-2 py-2.5 text-center text-sm font-bold sm:flex-none sm:px-4 ${
            aktiven
              ? 'border-gnl-400 text-gnl-200'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`
        }
      />

      <PloscaZavihkov id="pogled" izbran={zavihek} className="space-y-6">
      {zavihek === 'igralci' ? (
        <VrhDrzave drzava={drzava} starost={starost} />
      ) : zavihek === 'klubi' ? (
        <VrhKlubov drzava={drzava} starost={starost} />
      ) : zavihek === 'napovedi' ? (
        <LestvicaNapovediDrzave drzava={drzava} />
      ) : skupineNapaka ? (
        // Skupin lig ni mogoče prebrati: brez njih ekip ne moremo ločiti, zato ne pokažemo nobene.
        <p className="text-sm text-slate-400">{t('lestvice.slovenija.pripravlja')}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {t('lestvice.slovenija.povzetek', {
              ekip: mnozina(skupaj.ekip, EKIPE),
              lig: t('lestvice.slovenija.lig', { n: skupaj.lig }),
              zvez: t('lestvice.slovenija.zvez', { n: skupaj.zvez }),
            })}
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
                onClick={() => setKako(k)}
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
              {t('lestvice.slovenija.povprecjeRazlaga', {
                krogov: t('lestvice.slovenija.zOdigranimiKrogi', { n: NAJMANJ_KROGOV_ZA_POVPRECJE }),
              })}
            </p>
          )}

          {urejene.length === 0 ? (
            <p className="text-sm text-slate-400">
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
            <ol className="kartica divide-y divide-white/10 overflow-hidden">
              {urejene.slice(0, koliko).map((v) => (
                <li
                  key={v.fantasy_team_id}
                  className="relative flex min-h-[52px] items-center gap-3 px-3 py-2 transition hover:bg-white/5 sm:px-4"
                >
                  <span className="w-7 shrink-0 text-center text-sm font-bold text-slate-400">
                    {v.mesto <= 3 ? MEDALJE[v.mesto - 1] : v.mesto}
                  </span>
                  <div className="min-w-0 flex-1">
                    <ImeEkipe
                      id={v.fantasy_team_id}
                      lastnikId={v.owner_id}
                      pot={zLigo(`/team/${v.fantasy_team_id}`, v.competition_slug)}
                      className="block truncate text-sm font-semibold"
                      povezavaRazred="after:absolute after:inset-0 after:content-[''] hover:text-gnl-400"
                    >
                      {v.team_name}
                    </ImeEkipe>
                    <div className="truncate text-xs text-slate-500">
                      <ImeLastnika ime={v.owner_name} id={v.owner_id} />
                      {v.competition_short ? ` · ${v.competition_short}` : ''}
                      {v.federation_short ? ` · ${v.federation_short}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold tabular-nums text-gnl-300">
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
            </ol>
          )}
          {urejene.length > koliko && (
            <div className="text-center">
              <button onClick={() => setKoliko(koliko + 50)} className="gumb-tih text-sm">
                {t('lestvice.pokaziVec', { n: urejene.length - koliko })}
              </button>
            </div>
          )}
        </>
      )}
      </PloscaZavihkov>

      <p className="text-xs text-slate-500">
        <Link to="/standings" className="underline hover:text-slate-300">
          {t('lestvice.slovenija.lestvicaLige')}
        </Link>
      </p>
    </div>
  )
}
