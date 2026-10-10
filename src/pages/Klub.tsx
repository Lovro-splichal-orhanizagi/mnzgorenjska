// Stran kluba — tisto, kar se da klubu poslati.
//
// Klub, ki dobi pismo "naredili smo fantasy ligo", ga izbrise. Klub, ki dobi
// povezavo s SVOJIMI igralci, njihovimi cenami in tockami, jo odpre — podatki
// so o njih in v enem kliku preverljivi. Zato ta stran ne potrebuje prijave in
// ne govori o aplikaciji, ampak o klubu.
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import { supabase } from '../lib/supabase'
import { useKanonicnaLiga, useTekmovanje } from '../lib/tekmovanje'
import {
  formatirajCeno,
  formatirajTocke,
  prikazniIme,
  mnozina,
  IGRALCI,
} from '../lib/pomozno'
import { t, tx } from '../i18n'
import { useNaslov, useNoindex } from '../lib/naslov'
import { VRSTNI_RED } from '../lib/pravila'
import type { Pozicija } from '../lib/tipi'
import Grb from '../components/Grb'
import Plakat from '../components/Plakat'
import { najboljsiTrije, navijacev, ligaVTozilniku } from '../lib/plakat'
import { NavijaciKluba } from '../components/NavijaciKlubov'
import { izvor } from '../lib/platforma'
import { NalaganjeZaBralnik, Skelet } from '../components/Skelet'

interface Igralec {
  id: number
  full_name: string | null
  position: Pozicija | null
  value: number | null
  points: number | null
  goals: number | null
  minutes: number | null
  owners: number | null
}

export default function Klub() {
  const { id } = useParams<{ id: string }>()
  const [klub, setKlub] = useState<{ name: string; logo_url: string | null; short_name: string | null } | null>(null)
  const [liga, setLiga] = useState<{ slug: string; name: string; short_name: string | null } | null>(null)
  // Liga, katere navijače kaže stran — ista, iz katere so igralci.
  const [ligaId, setLigaId] = useState<number | null>(null)
  // "1. liga MNZ Ljubljana" za plakat: ime lige v bazi je "1. liga — člani",
  // kar na plakatu brez zveze ne pove, KJE je ta liga.
  const [ligaZaPlakat, setLigaZaPlakat] = useState<string>('')
  const [igralci, setIgralci] = useState<Igralec[]>([])
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  // Plakata se rišeta (platno, PNG) šele, ko kdo odpre razdelek "Za objavo".
  const [objavaOdprta, setObjavaOdprta] = useState(false)
  const { slug: izbranSlug } = useTekmovanje()
  useNaslov(klub?.name ?? t('lestvice.klub.naslov'), liga?.name)
  useNoindex(!nalaganje && Boolean(napaka) && !klub)
  useKanonicnaLiga(liga?.slug)

  useEffect(() => {
    if (!id) return
    let veljavno = true
    ;(async () => {
      setNalaganje(true)
      // Klub in njegove lige gresta hkrati; nato vse lige naenkrat.
      const [{ data: klubVrstica, error: eKlub }, { data: ct }] = await Promise.all([
        supabase.from('teams').select('name, logo_url, short_name').eq('id', Number(id)).maybeSingle(),
        // Klub lahko igra v vec tekmovanjih (clani, mladinci); vzamemo tisto z
        // najvec njegovimi igralci, da stran pokaze glavno mostvo. Neaktivne
        // lige (se v pripravi) pridejo v postev le, ce aktivne ni nobene —
        // sicer bi CTA vodil v ligo, ki je v meniju ni.
        supabase
          .from('competition_teams')
          .select('competition_id, competitions(slug, name, short_name, federation_id, active)')
          .eq('team_id', Number(id)),
      ])
      if (!veljavno) return
      if (eKlub || !klubVrstica) {
        setNapaka(t('lestvice.klub.niKluba'))
        setNalaganje(false)
        return
      }
      setKlub(klubVrstica)

      const vse = (ct ?? []) as Array<{ competition_id: number; competitions: any }>
      const aktivna = vse.filter((t2) => t2.competitions?.active)
      // Liga iz naslova (`?t=`) ima prednost, če klub v njej igra: povezava z
      // lestvice mladincev naj pokaže mladince, ne članov.
      const izbrana = aktivna.filter((t2) => t2.competitions?.slug === izbranSlug)
      const tekmovanja = izbrana.length ? izbrana : aktivna.length ? aktivna : vse
      if (!tekmovanja.length) {
        setNapaka(t('lestvice.klub.brezLige'))
        setNalaganje(false)
        return
      }

      const [seznami, { data: imena }] = await Promise.all([
        Promise.all(
          tekmovanja.map(async (t2) => {
            const { data: sez } = await supabase
              .from('sezone')
              .select('season')
              .eq('competition_id', t2.competition_id)
              .eq('tekoca', true)
              .maybeSingle()
            const { data: p } = await supabase
              .from('player_season_standings')
              .select('id, full_name, position, value, points, goals, minutes, owners')
              .eq('team_id', Number(id))
              .eq('competition_id', t2.competition_id)
              .eq('season', sez?.season ?? '')
              .order('points', { ascending: false })
            return (p ?? []) as Igralec[]
          }),
        ),
        supabase
          .from('competitions_view')
          .select('id, name, federation_name, country_code')
          .in('id', tekmovanja.map((t2) => t2.competition_id)),
      ])
      if (!veljavno) return
      let izbran: { id: number; igralci: Igralec[]; liga: any } | null = null
      for (const [i, t2] of tekmovanja.entries())
        if (!izbran || seznami[i].length > izbran.igralci.length)
          izbran = { id: t2.competition_id, igralci: seznami[i], liga: t2.competitions }
      setLiga(izbran?.liga ?? null)
      setLigaId(izbran?.id ?? null)
      setIgralci(izbran?.igralci ?? [])
      if (izbran) {
        const izbranId = izbran.id
        const v = (imena ?? []).find((x) => x.id === izbranId)
        const kratko = (v?.name ?? '').replace(/\s*—\s*(člani|mladinci)\s*$/, '')
        // Slovaška imena lig regijo že nosijo ("I. trieda — Žilina"); zveza
        // zraven bi jo le ponovila ("… Žilina ObFZ Žilina").
        // Odloča država lige, ne jezik (angleščina je za obe državi).
        const zeZRegijo = v?.country_code !== 'SI' && kratko.includes('—')
        setLigaZaPlakat(v?.federation_name && !zeZRegijo ? `${kratko} ${v.federation_name}` : kratko)
      }
      setNalaganje(false)
    })()
    return () => {
      veljavno = false
    }
  }, [id, izbranSlug])

  const izbranih = useMemo(
    () => igralci.reduce((v, i) => v + Number(i.owners ?? 0), 0),
    [igralci],
  )
  const poPoziciji = useMemo(() => {
    const m = new Map<string, Igralec[]>()
    for (const i of igralci) {
      const k = i.position ?? '?'
      m.set(k, [...(m.get(k) ?? []), i])
    }
    return VRSTNI_RED.filter((p) => m.has(p)).map((p) => [p, m.get(p)!] as const)
  }, [igralci])

  // CTA pelje v ligo kluba, ne v tisto, ki jo ima obiskovalec izbrano.
  const ligaParam = liga?.slug ? `?t=${encodeURIComponent(liga.slug)}` : ''

  if (nalaganje)
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skelet className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skelet className="h-8 max-w-xs sm:h-9" />
            <Skelet className="h-5 max-w-sm" />
          </div>
        </div>
        <Skelet className="h-36" />
        <NalaganjeZaBralnik />
      </div>
    )
  if (napaka)
    return (
      <div className="space-y-2">
        <p className="text-slate-300">{napaka}</p>
        <Link to="/" className="text-gnl-400 underline">{t('lestvice.klub.naNaslovnico')}</Link>
      </div>
    )

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Grb ime={klub?.name} kratko={klub?.short_name} logo={klub?.logo_url} velikost={44} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black naslov sm:text-3xl">{klub?.name}</h1>
          <p className="text-sm text-slate-400">
            {t('lestvice.klub.podnaslov', {
              liga: liga?.name ?? t('lestvice.klub.liga'),
              igralci: mnozina(igralci.length, IGRALCI),
            })}
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <p className="text-sm leading-relaxed text-slate-400">
          {tx(
            'lestvice.klub.uvod',
            // "fantasy lige za 1. ligo" / "fantasy ligy pre IV. ligu" — oba jezika tožilnik.
            { klub: klub?.name, liga: liga?.name ? ligaVTozilniku(liga.name) : t('lestvice.klub.toLigo') },
            { b: (v) => <strong className="text-slate-200">{v}</strong> },
          )}
          {izbranih > 0 && (
            <>
              {' '}
              <span className="text-gnl-200">
                {tx(
                  'lestvice.klub.navijaci',
                  { n: izbranih, navijacev: navijacev(izbranih) },
                  { b: (v) => <strong>{v}</strong> },
                )}
              </span>
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to={`/my-team${ligaParam}`} className="gumb-glavni px-3 py-1.5 text-sm">
            {t('lestvice.klub.sestaviEkipo')}
          </Link>
          <Link to={`/standings${ligaParam}`} className="gumb-tih px-3 py-1.5 text-sm">
            {t('lestvice.klub.lestvica')}
          </Link>
        </div>
      </section>

      {igralci.length === 0 ? (
        <p className="text-sm text-slate-400">{t('lestvice.klub.brezStatistike')}</p>
      ) : (
        poPoziciji.map(([poz, seznam]) => (
          <section key={poz}>
            <h2 className="mb-2 text-base font-bold">
              {t(`lestvice.klub.pozicije.${poz}`)}
            </h2>
            <ul className="kartica divide-y divide-white/10 overflow-hidden">
              {seznam.map((i) => (
                <li key={i.id} className="flex min-h-12 items-center gap-2 px-3 py-2 text-sm">
                  {/* Na telefonu gre statistika pod ime — v isti vrstici je
                      ime ostalo pri treh črkah ("Joz…"). */}
                  <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-2">
                    <Link to={`/player/${i.id}`} className="min-w-0 truncate font-semibold hover:text-gnl-400 sm:flex-1">
                      {prikazniIme(i.full_name)}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-500">
                      {i.goals ? t('lestvice.klub.goli', { n: i.goals }) : ''}
                      {t('lestvice.klub.minute', { n: i.minutes ?? 0 })}
                    </span>
                  </div>
                  <span className="w-12 shrink-0 text-right font-bold tabular-nums">
                    {formatirajTocke(i.points)}
                  </span>
                  <span className="w-16 shrink-0 whitespace-nowrap text-right tabular-nums text-gnl-300">
                    {formatirajCeno(i.value)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}


      {ligaId != null && id && (
        <NavijaciKluba
          tekmovanjeId={ligaId}
          klubId={Number(id)}
          klubIme={klub?.name ?? ''}
          ligaSlug={liga?.slug ?? null}
        />
      )}

      {/* Klubu damo tisto, kar je prosil: povezavo za FB in sliko za
          Instagram, kjer povezave ne delujejo. Zaprto, da ne odrine igralcev. */}
      <details className="group" onToggle={(e) => e.currentTarget.open && setObjavaOdprta(true)}>
        <summary className="cursor-pointer list-none text-base font-bold hover:text-gnl-300">
          <span className="mr-1 inline-block text-slate-500 transition group-open:rotate-90">›</span>
          {t('lestvice.klub.zaObjavo')}
        </summary>
        {objavaOdprta && <div className="mt-3 space-y-4">
          <div>
            <div className="mb-1.5 text-xs text-slate-400">{t('lestvice.klub.napoved')}</div>
            <Plakat
              podatki={{
                vrsta: 'napoved',
                klub: klub?.name ?? '',
                liga: ligaZaPlakat || liga?.name || '',
                grb: klub?.logo_url ?? null,
              }}
              povezava={typeof window !== 'undefined' ? `${izvor()}${window.location.pathname}${window.location.search}` : ''}
            />
          </div>
          <div>
            <div className="mb-1.5 text-xs text-slate-400">{t('lestvice.klub.nasiIgralci')}</div>
            <Plakat
              podatki={{
                vrsta: 'klub',
                klub: klub?.name ?? '',
                liga: ligaZaPlakat || liga?.name || '',
                grb: klub?.logo_url ?? null,
                igralci: najboljsiTrije(igralci),
                navijacev: izbranih,
              }}
              povezava={typeof window !== 'undefined' ? `${izvor()}${window.location.pathname}${window.location.search}` : ''}
            />
          </div>
        </div>}
      </details>

      <p className="text-xs text-slate-500">
        {t('lestvice.klub.opomba')}
      </p>
    </div>
  )
}
