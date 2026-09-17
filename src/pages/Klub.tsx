// Stran kluba — tisto, kar se da klubu poslati.
//
// Klub, ki dobi pismo "naredili smo fantasy ligo", ga izbrise. Klub, ki dobi
// povezavo s SVOJIMI igralci, njihovimi cenami in tockami, jo odpre — podatki
// so o njih in v enem kliku preverljivi. Zato ta stran ne potrebuje prijave in
// ne govori o aplikaciji, ampak o klubu.
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatirajCeno, formatirajTocke, prikazniIme, razredPozicije, KRATKA_POZICIJA } from '../lib/pomozno'
import { VRSTNI_RED } from '../lib/pravila'
import type { Pozicija } from '../lib/tipi'
import Grb from '../components/Grb'

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
  const [igralci, setIgralci] = useState<Igralec[]>([])
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let veljavno = true
    ;(async () => {
      setNalaganje(true)
      const { data: t, error: eKlub } = await supabase
        .from('teams')
        .select('name, logo_url, short_name')
        .eq('id', Number(id))
        .maybeSingle()
      if (!veljavno) return
      if (eKlub || !t) {
        setNapaka('Tega kluba ni.')
        setNalaganje(false)
        return
      }
      setKlub(t)

      // Klub lahko igra v vec tekmovanjih (clani, mladinci); vzamemo tisto z
      // najvec njegovimi igralci, da stran pokaze glavno mostvo.
      const { data: ct } = await supabase
        .from('competition_teams')
        .select('competition_id, competitions(slug, name, short_name)')
        .eq('team_id', Number(id))
      const tekmovanja = (ct ?? []) as Array<{ competition_id: number; competitions: any }>
      if (!tekmovanja.length) {
        setNapaka('Ta klub letos ne igra v nobeni ligi, ki jo spremljamo.')
        setNalaganje(false)
        return
      }

      let najboljsi: { id: number; igralci: Igralec[]; liga: any } | null = null
      for (const t2 of tekmovanja) {
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
        const seznam = (p ?? []) as Igralec[]
        if (!najboljsi || seznam.length > najboljsi.igralci.length)
          najboljsi = { id: t2.competition_id, igralci: seznam, liga: t2.competitions }
      }
      if (!veljavno) return
      setLiga(najboljsi?.liga ?? null)
      setIgralci(najboljsi?.igralci ?? [])
      setNalaganje(false)
    })()
    return () => {
      veljavno = false
    }
  }, [id])

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

  if (nalaganje) return <p className="p-4 text-slate-400">Nalaganje …</p>
  if (napaka)
    return (
      <div className="space-y-2 p-4">
        <p className="text-slate-300">{napaka}</p>
        <Link to="/" className="text-gnl-400 underline">Na naslovnico</Link>
      </div>
    )

  return (
    <div className="space-y-5 p-4">
      <header className="flex items-center gap-3">
        <Grb ime={klub?.name} kratko={klub?.short_name} logo={klub?.logo_url} velikost={44} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black naslov sm:text-3xl">{klub?.name}</h1>
          <p className="text-sm text-slate-400">
            {liga?.name ?? 'Liga'} · {igralci.length} igralcev v igri
          </p>
        </div>
      </header>

      <section className="kartica border-gnl-400/30 bg-gnl-500/5 p-4">
        <p className="text-sm leading-relaxed text-slate-200">
          Igralci {klub?.name} so del <strong>SLFF</strong> — fantasy lige za{' '}
          {liga?.name ?? 'to ligo'}. Navijači sestavijo svojo ekipo iz pravih
          igralcev, točke pa prihajajo iz <strong>uradnih zapisnikov</strong>:
          goli, minute, ohranjene mreže, kartoni.
        </p>
        {izbranih > 0 && (
          <p className="mt-2 text-sm text-gnl-200">
            Vaše igralce ima v svoji ekipi trenutno <strong>{izbranih}</strong>{' '}
            {izbranih === 1 ? 'navijač' : 'navijačev'}.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/moja-ekipa" className="gumb-glavni px-3 py-2 text-sm">
            Sestavi svojo ekipo
          </Link>
          <Link to="/lestvica" className="gumb-tih px-3 py-2 text-sm">
            Lestvica
          </Link>
        </div>
      </section>

      {igralci.length === 0 ? (
        <p className="text-slate-400">Za ta klub letos še ni statistike.</p>
      ) : (
        poPoziciji.map(([poz, seznam]) => (
          <section key={poz}>
            <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-slate-400">
              {poz === 'GK' ? 'Vratarji' : poz === 'DEF' ? 'Branilci' : poz === 'MID' ? 'Vezisti' : 'Napadalci'}
            </h2>
            <ul className="divide-y divide-white/5 overflow-hidden rounded-xl bg-white/5">
              {seznam.map((i) => (
                <li key={i.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className={`znacka shrink-0 ${razredPozicije(i.position)}`}>
                    {(i.position && KRATKA_POZICIJA[i.position]) ?? '?'}
                  </span>
                  <Link to={`/igralec/${i.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-gnl-400">
                    {prikazniIme(i.full_name)}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-500">
                    {i.goals ? `${i.goals} G · ` : ''}{i.minutes ?? 0} min
                  </span>
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

      <p className="text-xs text-slate-500">
        Točke so izračunane iz uradnih zapisnikov. Če kaj ne drži, nam povejte —
        podatke popravimo.
      </p>
    </div>
  )
}
