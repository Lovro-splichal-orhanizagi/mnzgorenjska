// Hitri vpogled v igralca med sestavljanjem ekipe.
//
// Doslej je bilo treba za podatke o igralcu zapustiti Mojo ekipo in odpreti
// njegov profil — na pol sestavljeni ekipi to pomeni izgubiti kontekst. Ta
// plosca pokaze isto, kar odloca ob nakupu: kaj je letos naredil, kam gre
// cena in koga njegov klub igra naslednjic.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatirajCeno, formatirajTocke, prikazniIme } from '../lib/pomozno'
import { serijaCen, premik, crta, zadnjiPremiki } from '../lib/gibanjeCene'
import type { SpremembaCene } from '../lib/gibanjeCene'
import Grb from './Grb'

interface Sezona {
  matches: number | null
  minutes: number | null
  goals: number | null
  assists: number | null
  clean_sheets: number | null
  points: number | null
  points_per_match: number | null
  form: number | null
  owners: number | null
  value: number | null
  season: string | null
}

interface Tekma {
  match_id: number
  opponent_short: string | null
  opponent_name: string | null
  doma: boolean | null
  played_on: string | null
}

export default function InfoIgralca({
  igralecId,
  tekmovanjeId,
  ime,
  klub,
  klubKratko,
  klubLogo,
  naZapri,
}: {
  igralecId: number
  tekmovanjeId: number
  ime: string | null
  klub?: string | null
  klubKratko?: string | null
  klubLogo?: string | null
  naZapri: () => void
}) {
  const [sezona, setSezona] = useState<Sezona | null>(null)
  const [spremembe, setSpremembe] = useState<SpremembaCene[]>([])
  const [zacetna, setZacetna] = useState<number | null>(null)
  const [krogov, setKrogov] = useState(0)
  const [tekme, setTekme] = useState<Tekma[]>([])
  const [nalaganje, setNalaganje] = useState(true)

  useEffect(() => {
    let veljavno = true
    ;(async () => {
      setNalaganje(true)
      // Klub igralca rabimo, preden vprasamo po njegovih tekmah, zato dva
      // kroga namesto enega.
      const [{ data: sez }, { data: p }] = await Promise.all([
        supabase
          .from('sezone')
          .select('season, tekoca')
          .eq('competition_id', tekmovanjeId)
          .eq('tekoca', true)
          .maybeSingle(),
        supabase
          .from('players')
          .select('value_start, team_id')
          .eq('id', igralecId)
          .maybeSingle(),
      ])
      if (!veljavno) return
      const letos = sez?.season ?? null

      const [{ data: s }, { data: c }, { data: t }, { data: zadnjiKrog }] =
        await Promise.all([
        letos
          ? supabase
              .from('player_season_standings')
              .select(
                'matches, minutes, goals, assists, clean_sheets, points, points_per_match, form, owners, value, season',
              )
              .eq('id', igralecId)
              .eq('season', letos)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        // Samo tekoca sezona: lanski premiki so zgodovina druge igre.
        letos
          ? supabase
              .from('price_changes')
              .select('new_value, rounds!inner(number, season)')
              .eq('player_id', igralecId)
              .eq('rounds.season', letos)
              .order('round_id')
          : Promise.resolve({ data: [] }),
        p?.team_id
          ? supabase
              .from('prihodnje_tekme')
              .select('match_id, opponent_short, opponent_name, doma, played_on')
              .eq('competition_id', tekmovanjeId)
              .eq('team_id', p.team_id)
              .order('played_on')
              .limit(3)
          : Promise.resolve({ data: [] }),
        // Koliko krogov naj crta pokaze. `sezone.odigranih` sem ne sodi —
        // steje uvozene TEKME, ne krogov, in bi crto raztegnil cez pol
        // sezone, ki se ni bila odigrana.
        letos
          ? supabase
              .from('rounds')
              .select('number, matches!inner(imported_at)')
              .eq('competition_id', tekmovanjeId)
              .eq('season', letos)
              .not('matches.imported_at', 'is', null)
              .order('number', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (!veljavno) return
      setSezona((s ?? null) as Sezona | null)
      setZacetna(p?.value_start != null ? Number(p.value_start) : null)
      setSpremembe(
        ((c ?? []) as any[]).map((r) => ({
          krog: Number(r.rounds?.number ?? 0),
          nova: Number(r.new_value),
        })),
      )
      setKrogov(Number((zadnjiKrog as any)?.number ?? 0))
      setTekme((t ?? []) as Tekma[])
      setNalaganje(false)
    })()
    return () => {
      veljavno = false
    }
  }, [igralecId, tekmovanjeId])

  const serija =
    zacetna != null ? serijaCen(zacetna, spremembe, krogov) : []
  const dp = premik(serija)
  const pot = crta(serija, 160, 34)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        onClick={naZapri}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />
      <div className="relative max-h-[88dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border-t border-white/15 bg-slate-950 p-4 shadow-2xl sm:max-w-md sm:rounded-2xl sm:border">
        <div className="mb-3 flex items-start gap-2">
          <Grb ime={klub} kratko={klubKratko} logo={klubLogo} velikost={26} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-black">{prikazniIme(ime)}</div>
            <div className="truncate text-xs text-slate-500">{klub}</div>
          </div>
          <button
            onClick={naZapri}
            aria-label="Zapri"
            className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-sm font-semibold hover:bg-white/15"
          >
            ✕
          </button>
        </div>

        {nalaganje ? (
          <p className="py-6 text-center text-slate-400">Nalaganje …</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-1.5">
              <Polje oznaka="Točke" vrednost={formatirajTocke(sezona?.points)} />
              <Polje oznaka="Forma" vrednost={formatirajTocke(sezona?.form)} />
              <Polje oznaka="Golov" vrednost={sezona?.goals ?? 0} />
              <Polje oznaka="Asist." vrednost={sezona?.assists ?? 0} />
              <Polje oznaka="Tekem" vrednost={sezona?.matches ?? 0} />
              <Polje oznaka="Minut" vrednost={sezona?.minutes ?? 0} />
              <Polje
                oznaka="Na tekmo"
                vrednost={formatirajTocke(sezona?.points_per_match)}
              />
              <Polje
                oznaka="Izbran"
                vrednost={sezona?.owners == null ? '–' : sezona.owners}
              />
            </div>

            {serija.length > 1 ? (
              <section className="rounded-xl bg-white/5 p-3">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Gibanje cene
                  </span>
                  <span className="text-xs tabular-nums text-slate-400">
                    {formatirajCeno(serija[0].cena)} →{' '}
                    <strong className="text-slate-200">
                      {formatirajCeno(serija[serija.length - 1].cena)}
                    </strong>
                    <span
                      className={`ml-1.5 ${
                        dp > 0
                          ? 'text-gnl-300'
                          : dp < 0
                            ? 'text-rose-400'
                            : 'text-slate-500'
                      }`}
                    >
                      {dp > 0 ? '▲' : dp < 0 ? '▼' : '•'}{' '}
                      {Math.abs(dp).toFixed(1)}
                    </span>
                  </span>
                </div>
                <svg
                  viewBox="0 0 160 34"
                  className="h-9 w-full"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d={pot}
                    fill="none"
                    stroke={
                      dp > 0 ? '#86efac' : dp < 0 ? '#fda4af' : '#94a3b8'
                    }
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <ul className="mt-1 space-y-0.5">
                  {zadnjiPremiki(spremembe, serija[0].cena).map((z) => (
                    <li
                      key={z.krog}
                      className="flex justify-between text-[11px] tabular-nums text-slate-500"
                    >
                      <span>{z.krog}. krog</span>
                      <span>
                        {formatirajCeno(z.iz)} → {formatirajCeno(z.v)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="rounded-xl bg-white/5 p-3 text-xs text-slate-500">
                Cena se še ni premaknila.
              </p>
            )}

            {tekme.length > 0 && (
              <section>
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Naslednje tekme kluba
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {tekme.map((t) => (
                    <li
                      key={t.match_id}
                      // Kratice klubov so ponekod ena sama crka ("D", "K"),
                      // zato polno ime vsaj ob prehodu z misko.
                      title={t.opponent_name ?? undefined}
                      className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-300"
                    >
                      {t.opponent_short || t.opponent_name}
                      <span className="ml-1 text-slate-600">
                        {t.doma ? 'doma' : 'v gosteh'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Link
              to={`/igralec/${igralecId}`}
              className="block rounded-lg bg-white/10 px-3 py-2 text-center text-sm font-semibold hover:bg-white/15"
            >
              Cel profil igralca →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function Polje({
  oznaka,
  vrednost,
}: {
  oznaka: string
  vrednost: React.ReactNode
}) {
  return (
    <div className="rounded-lg bg-white/5 px-1 py-1.5 text-center">
      <div className="text-sm font-black tabular-nums">{vrednost}</div>
      <div className="text-[9px] uppercase tracking-wide text-slate-500">
        {oznaka}
      </div>
    </div>
  )
}
