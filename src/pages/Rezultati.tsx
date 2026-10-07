// Rezultati odigranih tekem. Klik na tekmo odpre obe postavi s točkami.
import { useEffect, useMemo, useState } from 'react'
import { imeZveze } from '../components/VirPodatkov'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTekmovanje } from '../lib/tekmovanje'
import Grb from '../components/Grb'
import type { TekmaVrstica } from '../lib/tipi'
import { vseVrstice } from '../lib/strani'
import { useNaslov } from '../lib/naslov'
import { t } from '../i18n'
import Sponzor from '../components/Sponzor'

const selectRazred =
  'rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-slate-200'

export default function Rezultati() {
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  const zveza = imeZveze(tekmovanje)
  const [tekme, setTekme] = useState<TekmaVrstica[]>([])
  const [sezona, setSezona] = useState<string | null>(null)
  const [krogId, setKrogId] = useState<number | null>(null)
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  useNaslov(t('tekme.rezultati.naslov'))

  useEffect(() => {
    if (!tekmovanjeId) return
    // Odgovor prejšnje lige ne sme prepisati izbrane.
    let veljavno = true
    setNalaganje(true)
    setNapaka(null)
    // Ujamemo tu: znotraj async funkcije preverjanje z vrha ne velja vec.
    const ligaId = tekmovanjeId
    async function nalozi() {
      // Po straneh: več sezon ene lige hitro preseže tisoč tekem.
      let vrstice: TekmaVrstica[] = []
      try {
        vrstice = (await vseVrstice((od, do_) =>
          supabase
            .from('match_assist_status')
            .select('*')
            .eq('competition_id', ligaId)
            .order('played_on', { ascending: false })
            .order('match_id')
            .range(od, do_),
        )) as TekmaVrstica[]
      } catch (e) {
        if (veljavno) setNapaka((e as Error).message)
      }
      if (!veljavno) return
      setTekme(vrstice)
      const sezone = [
        ...new Set(vrstice.map((t) => t.season).filter((x): x is string => !!x)),
      ]
        .sort()
        .reverse()
      setSezona(sezone[0] ?? null)
      setKrogId(vrstice.find((t) => t.season === sezone[0])?.round_id ?? null)
      setNalaganje(false)
    }
    nalozi()
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  const sezone = useMemo(
    () =>
      [
        ...new Set(tekme.map((t) => t.season).filter((x): x is string => !!x)),
      ]
        .sort()
        .reverse(),
    [tekme],
  )

  const krogi = useMemo(() => {
    const m = new Map<number, { id: number; number: number }>()
    for (const t of tekme.filter((t) => t.season === sezona)) {
      if (t.round_id == null) continue
      m.set(t.round_id, { id: t.round_id, number: t.round_number ?? 0 })
    }
    return [...m.values()].sort((a, b) => b.number - a.number)
  }, [tekme, sezona])

  const vKrogu = useMemo(
    () => tekme.filter((t) => t.round_id === krogId),
    [tekme, krogId],
  )

  // krogi so urejeni padajoče: prejšnji je naslednji v seznamu.
  const i = krogi.findIndex((k) => k.id === krogId)
  const sosed =
    i < 0 ? null : { prej: krogi[i + 1]?.id ?? null, naslednji: krogi[i - 1]?.id ?? null }

  if (nalaganje)
    return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-black naslov sm:text-3xl">
          {t('tekme.rezultati.naslov')}
          {tekmovanje?.short_name ? ` — ${tekmovanje.short_name}` : ''}
        </h1>
        <p className="hidden max-w-2xl text-sm text-slate-400 sm:block">
          {t('tekme.rezultati.uvod', { zveza })}
        </p>
      </header>

      {tekme.length === 0 && !napaka ? (
        <p className="text-sm text-slate-400">{t('tekme.rezultati.niZacetka')}</p>
      ) : (
        <section className="space-y-3">
          {/* Krog (in sezona) v eni vrstici; puščici za sosednji krog. */}
          <div className="flex items-center gap-2">
            {sezone.length > 1 && (
              <select
                value={sezona ?? ''}
                onChange={(e) => {
                  const sz = e.target.value
                  setSezona(sz)
                  setKrogId(tekme.find((t) => t.season === sz)?.round_id ?? null)
                }}
                className={selectRazred}
              >
                {sezone.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => sosed && setKrogId(sosed.prej)}
                disabled={!sosed?.prej}
                aria-label={t('tekme.rezultati.prejsnji')}
                className="rounded-lg px-2.5 py-1.5 text-slate-300 hover:bg-white/5 disabled:opacity-30"
              >
                ‹
              </button>
              <select
                value={krogId ?? ''}
                onChange={(e) => setKrogId(Number(e.target.value))}
                className={selectRazred}
              >
                {krogi.map((k) => (
                  <option key={k.id} value={k.id}>
                    {t('tekme.krog', { n: k.number })}
                  </option>
                ))}
              </select>
              <button
                onClick={() => sosed && setKrogId(sosed.naslednji)}
                disabled={!sosed?.naslednji}
                aria-label={t('tekme.rezultati.naslednji')}
                className="rounded-lg px-2.5 py-1.5 text-slate-300 hover:bg-white/5 disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </div>

          {vKrogu.length === 0 ? (
            <p className="text-sm text-slate-400">{t('tekme.rezultati.prazenKrog')}</p>
          ) : (
            <ul className="kartica divide-y divide-white/10 overflow-hidden">
              {vKrogu.map((t) => (
                <li key={t.match_id}>
                  <Link
                    to={`/match/${t.match_id}`}
                    className="flex min-h-[52px] items-center gap-2 px-3 py-2 text-sm transition hover:bg-white/5"
                  >
                    <span className="min-w-0 flex-1 truncate text-right font-semibold">{t.home_name}</span>
                    <Grb ime={t.home_name} kratko={t.home_short} logo={t.home_logo} velikost={22} />
                    <span className="w-12 shrink-0 text-center font-black tabular-nums">
                      {t.home_goals}:{t.away_goals}
                    </span>
                    <Grb ime={t.away_name} kratko={t.away_short} logo={t.away_logo} velikost={22} />
                    <span className="min-w-0 flex-1 truncate font-semibold">{t.away_name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {napaka && <p className="text-sm text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>}

      <Sponzor kje="rezultati" />
    </div>
  )
}
