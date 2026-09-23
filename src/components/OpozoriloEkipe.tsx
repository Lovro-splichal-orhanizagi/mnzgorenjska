import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useTekmovanje } from '../lib/tekmovanje'
import { naslovNapak, obvestilaEkip, type Obvestilo, type StanjeEkipe } from '../lib/stanjeEkip'

/**
 * Pas z obvestili nad glavno vsebino — za VSE moje ekipe, ne le izbrano ligo.
 *
 *   * rdeče: ekipa ob roku ne bo dobila točk (manjka igralec, igralec ni več
 *     v ligi, preveč iz kluba …) — ne da se skriti;
 *   * rumeno: ekipa je veljavna, a je v njej poškodovan ali odsoten igralec
 *     (najbolj boli pri kapetanu) — da se skriti, dokler ni novega poročila;
 *   * brez ekipe v izbrani ligi: vabilo, naj jo sestavi.
 *
 * Ekipe se zaklenejo same ob roku, zato je pas edino mesto, kjer človek izve,
 * da z eno od njih nekaj ni prav. Stanje pride iz enega klica baze
 * (`stanje_mojih_ekip`), osveži se ob vsaki menjavi strani.
 */
const KLJUC_SKRITIH = 'slff-skrita-opozorila'
const NAJVEC_VRSTIC = 4

function preberiSkrita(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(KLJUC_SKRITIH) ?? '[]')
    return new Set(Array.isArray(v) ? v.filter((k) => typeof k === 'string') : [])
  } catch {
    return new Set()
  }
}

function shraniSkrita(skrita: Set<string>) {
  try {
    // Zadnjih 200 je dovolj; stara poročila po 30 dneh itak izginejo.
    localStorage.setItem(KLJUC_SKRITIH, JSON.stringify([...skrita].slice(-200)))
  } catch {
    // Brez shrambe se opozorilo le ob naslednjem obisku spet pokaže.
  }
}

export default function OpozoriloEkipe() {
  const { session, loading } = useAuth()
  const uporabnikId = session?.user.id ?? null
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  const { pathname } = useLocation()
  const [ekipe, setEkipe] = useState<StanjeEkipe[] | null>(null)
  const [skrita, setSkrita] = useState<Set<string>>(preberiSkrita)
  const [vse, setVse] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!uporabnikId) {
      setEkipe(null)
      return
    }
    let veljavno = true
    supabase.rpc('stanje_mojih_ekip').then(({ data, error }) => {
      if (!veljavno) return
      // Napaka pasu ne sme pokvariti strani — brez podatkov ga preprosto ni.
      setEkipe(error ? null : ((data ?? []) as unknown as StanjeEkipe[]))
    })
    return () => {
      veljavno = false
    }
  }, [uporabnikId, loading, pathname])

  const naMojiEkipi = pathname.startsWith('/moja-ekipa')
  const { napake, opozorila } = useMemo(
    () =>
      obvestilaEkip(ekipe ?? [], {
        // Na Moji ekipi so težave izbrane lige že na igrišču.
        skrijLigo: naMojiEkipi ? tekmovanje?.slug ?? null : null,
        skrita,
      }),
    [ekipe, naMojiEkipi, tekmovanje?.slug, skrita],
  )

  if (loading || !session || ekipe === null) return null
  if (
    pathname.startsWith('/prijava') ||
    pathname.startsWith('/novo-geslo') ||
    pathname.startsWith('/pravno')
  )
    return null

  const skrij = (o: Obvestilo) => {
    const nova = new Set(skrita)
    nova.add(o.kljuc)
    shraniSkrita(nova)
    setSkrita(nova)
  }

  const brezEkipe =
    !naMojiEkipi && tekmovanjeId != null && !ekipe.some((e) => e.competition_id === tekmovanjeId)

  return (
    <>
      {napake.length > 0 && (
        <Pas vrsta="napaka" naslov={naslovNapak(napake.length)}
          obvestila={napake} vse={vse} naVse={() => setVse(true)} />
      )}
      {opozorila.length > 0 && (
        <Pas vrsta="opozorilo" naslov="Opozorila v tvojih ekipah"
          obvestila={opozorila} vse={vse} naVse={() => setVse(true)} naSkrij={skrij} />
      )}
      {brezEkipe && (
        <div className="border-b border-amber-400/40 bg-amber-500/15">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2 text-sm text-amber-100 sm:gap-3">
            <span aria-hidden className="text-lg leading-none">⚠</span>
            <span className="min-w-0 flex-1 font-semibold">
              Nimaš še ekipe
              {tekmovanje?.short_name && (
                <span className="ml-1 font-normal text-amber-200/80">({tekmovanje.short_name})</span>
              )}{' '}
              — brez nje v naslednjem krogu ne dobiš točk.
            </span>
            <Link
              to="/moja-ekipa"
              className="shrink-0 rounded-lg bg-amber-400 px-3 py-1 text-xs font-black text-slate-950 hover:bg-amber-300"
            >
              Sestavi ekipo →
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

function Pas({
  vrsta,
  naslov,
  obvestila,
  vse,
  naVse,
  naSkrij,
}: {
  vrsta: 'napaka' | 'opozorilo'
  naslov: string
  obvestila: Obvestilo[]
  vse: boolean
  naVse: () => void
  naSkrij?: (o: Obvestilo) => void
}) {
  const napaka = vrsta === 'napaka'
  const prikazana = vse ? obvestila : obvestila.slice(0, NAJVEC_VRSTIC)
  return (
    <div
      role={napaka ? 'alert' : 'status'}
      className={napaka ? 'border-b border-rose-400/40 bg-rose-500/10' : 'border-b border-amber-400/30 bg-amber-500/10'}
    >
      <div className={`mx-auto max-w-6xl px-4 py-2 text-sm ${napaka ? 'text-rose-100' : 'text-amber-100'}`}>
        <div className="flex items-center gap-2 font-black">
          <span aria-hidden className="text-lg leading-none">{napaka ? '🚨' : '⚠'}</span>
          {naslov}
        </div>
        <ul className="mt-1 space-y-1">
          {prikazana.map((o) => (
            <li key={o.kljuc} className="flex items-start gap-2 text-xs sm:text-sm">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                  napaka ? 'bg-rose-400/20 text-rose-100' : 'bg-amber-400/20 text-amber-100'
                }`}
              >
                {o.liga}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{o.besedilo}</span>
                {o.podrobnost && (
                  <span className={napaka ? 'text-rose-100/75' : 'text-amber-100/70'}> {o.podrobnost}</span>
                )}
              </span>
              <Link
                to={`/moja-ekipa?t=${encodeURIComponent(o.slug)}`}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black text-slate-950 ${
                  napaka ? 'bg-rose-400 hover:bg-rose-300' : 'bg-amber-400 hover:bg-amber-300'
                }`}
              >
                {napaka ? 'Popravi →' : 'Poglej →'}
              </Link>
              {naSkrij && (
                <button
                  type="button"
                  onClick={() => naSkrij(o)}
                  aria-label={`Skrij opozorilo: ${o.besedilo}`}
                  title="Skrij, dokler ni novega poročila"
                  className="-my-1 shrink-0 rounded-lg px-2 py-1 text-amber-200/70 hover:bg-amber-400/10 hover:text-amber-100"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        {!vse && obvestila.length > NAJVEC_VRSTIC && (
          <button type="button" onClick={naVse} className="mt-1 text-xs font-semibold underline underline-offset-2">
            Pokaži vse ({obvestila.length})
          </button>
        )}
      </div>
    </div>
  )
}
