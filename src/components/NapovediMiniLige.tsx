import { useEffect, useMemo, useRef, useState } from 'react'
import Grb from './Grb'
import ImeLastnika from './ImeLastnika'
import { Link } from './Povezava'
import { supabase } from '../lib/supabase'
import { t, datumUra } from '../i18n'
import { prevediNapako } from '../lib/napake'
import type { Database } from '../lib/baza.types'

type Odprta = Database['public']['Functions']['moje_odprte_napovedi']['Returns'][number]
type VrsticaLestvice = Database['public']['Functions']['lestvica_napovedi_mini_lige']['Returns'][number]
type NapovedKroga = Database['public']['Functions']['napovedi_mini_lige_krog']['Returns'][number]

const MEDALJE = ['🥇', '🥈', '🥉']
const NAJVEC_GOLOV = 20

/**
 * Napovedi izidov v mini ligi: obrazec za naslednji krog, lestvica napovedi
 * in po roku napovedi vseh članov po tekmah.
 *
 * Napoved je ena na tekmo in šteje v vseh mini ligah (`shrani_napoved`); rok
 * in zasebnost pred rokom preveri baza. Točke se izračunajo iz izida: točen
 * 3, razplet 1, kontumacija in tekma brez izida ne štejeta.
 */
export default function NapovediMiniLige({ ligaId }: { ligaId: number }) {
  const [krog, setKrog] = useState<number | null>(null)
  const [krogi, setKrogi] = useState<number[]>([])
  const [lestvica, setLestvica] = useState<VrsticaLestvice[] | null>(null)
  const [napovediKroga, setNapovediKroga] = useState<NapovedKroga[]>([])
  // Nova liga začne pri skupni lestvici.
  useEffect(() => setKrog(null), [ligaId])

  useEffect(() => {
    let veljavno = true
    supabase.rpc('krogi_napovedi_mini_lige', { p_liga: ligaId }).then(({ data }) => {
      if (veljavno) setKrogi((data ?? []).map((v) => v.krog))
    })
    return () => {
      veljavno = false
    }
  }, [ligaId])

  useEffect(() => {
    let veljavno = true
    setLestvica(null)
    supabase
      .rpc('lestvica_napovedi_mini_lige', { p_liga: ligaId, p_krog: krog ?? undefined })
      .then(({ data }) => {
        if (veljavno) setLestvica(data ?? [])
      })
    return () => {
      veljavno = false
    }
  }, [ligaId, krog])

  // Napovedi po tekmah: izbrani krog ali zadnji z napovedmi.
  const krogTekem = krog ?? krogi[0] ?? null
  useEffect(() => {
    if (krogTekem == null) {
      setNapovediKroga([])
      return
    }
    let veljavno = true
    supabase
      .rpc('napovedi_mini_lige_krog', { p_liga: ligaId, p_krog: krogTekem })
      .then(({ data }) => {
        if (veljavno) setNapovediKroga(data ?? [])
      })
    return () => {
      veljavno = false
    }
  }, [ligaId, krogTekem])

  return (
    <div className="space-y-4">
      <ObrazecNapovedi />

      <section className="kartica space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{t('lestvice.napovedi.lestvicaNaslov')}</h2>
          <IzbiraKroga krogi={krogi} krog={krog} onKrog={setKrog} />
        </div>

        {lestvica == null ? (
          <p className="animiraj-utrip text-sm text-slate-400">{t('skupno.nalaganje')}</p>
        ) : lestvica.every((v) => v.ocenjenih === 0) ? (
          <p className="text-sm text-slate-400">{t('lestvice.napovedi.prazna')}</p>
        ) : (
          <>
          <KraljNapovedi vrstice={lestvica} krog={krog} />
          <ol className="divide-y divide-white/10">
            <li className="flex items-center gap-3 pb-1 text-[11px] uppercase tracking-wide text-slate-500">
              <span className="w-7 shrink-0" />
              <span className="min-w-0 flex-1" />
              <span className="w-9 shrink-0" />
              <span className="w-12 shrink-0 text-right">{t('lestvice.napovedi.tocni')}</span>
              <span className="w-12 shrink-0 text-right">{t('lestvice.napovedi.tocke')}</span>
            </li>
            {lestvica.map((v, i) => {
              // Enake točke in točni izidi delijo mesto.
              const prej = lestvica[i - 1]
              const mesto =
                prej && prej.tocke === v.tocke && prej.tocnih === v.tocnih
                  ? lestvica.findIndex((x) => x.tocke === v.tocke && x.tocnih === v.tocnih) + 1
                  : i + 1
              return (
                <li key={v.user_id} className="flex min-h-[44px] items-center gap-3 py-1.5 text-sm">
                  <span className="w-7 shrink-0 text-center font-bold text-slate-400">
                    {mesto <= 3 ? (
                      <span role="img" aria-label={t('lestvice.mesto', { mesto })}>
                        {MEDALJE[mesto - 1]}
                      </span>
                    ) : (
                      mesto
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    <ImeLastnika ime={v.display_name} id={v.user_id} />
                  </span>
                  <KroneVrstice kralj={v.kralj} kron={v.kron} />
                  <span className="w-12 shrink-0 text-right tabular-nums text-slate-400">{v.tocnih}</span>
                  <span className="w-12 shrink-0 text-right font-bold tabular-nums text-gnl-300">{v.tocke}</span>
                </li>
              )
            })}
          </ol>
          </>
        )}
      </section>

      {krogTekem != null && napovediKroga.length > 0 && (
        <NapovediPoTekmah krog={krogTekem} vrstice={napovediKroga} />
      )}

      <Link to="/predictions" className="block text-center text-sm font-semibold text-gnl-300 underline hover:text-gnl-200">
        {t('lestvice.napovedi.lestvicaLige')}
      </Link>
    </div>
  )
}

/**
 * Vrstica nad lestvico napovedi: kralj sezone (skupno) ali kralji izbranega
 * kroga. Brez kralja (krog še ni končan, nihče nima točk) je ni.
 */
export function KraljNapovedi({ vrstice, krog, drobno = false }: {
  vrstice: { kralj: boolean; display_name: string | null }[]
  krog: number | null
  /** Tiha vrstica pod glavo mini lige (brez okvirja). */
  drobno?: boolean
}) {
  const imena = vrstice.filter((v) => v.kralj).map((v) => v.display_name ?? '?')
  if (imena.length === 0) return null
  const ime = imena.join(', ')
  if (drobno)
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-200/90">
        <span aria-hidden="true">👑</span>
        <span className="min-w-0 truncate">{t('lestvice.napovedi.kralj', { ime })}</span>
      </p>
    )
  return (
    <p className="flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100 ring-1 ring-amber-400/30">
      <span aria-hidden="true">👑</span>
      <span className="min-w-0">
        {krog == null ? t('lestvice.napovedi.kralj', { ime }) : t('lestvice.napovedi.kraljKroga', { ime })}
      </span>
    </p>
  )
}

/**
 * Kralj napovedi sezone mini lige za glavo in glavno lestvico točk. Bere
 * `lestvica_napovedi_mini_lige` (iste pravice: član ali javna liga); brez
 * pravice ali brez kralja je seznam prazen.
 */
export function useKraljMiniLige(ligaId: number | null) {
  const [kralji, setKralji] = useState<VrsticaLestvice[]>([])
  useEffect(() => {
    setKralji([])
    if (ligaId == null) return
    let veljavno = true
    supabase.rpc('lestvica_napovedi_mini_lige', { p_liga: ligaId }).then(({ data }) => {
      if (veljavno) setKralji((data ?? []).filter((v) => v.kralj))
    })
    return () => {
      veljavno = false
    }
  }, [ligaId])
  return kralji
}

/** Drobna krona pred imenom člana, ki je kralj napovedi sezone. */
export function KronaKralja() {
  return (
    <span role="img" aria-label={t('lestvice.napovedi.kraljOznaka')} title={t('lestvice.napovedi.kraljOznaka')} className="mr-1">
      👑
    </span>
  )
}

/** Krona ob imenu kralja in število kron krogov v vrstici lestvice. */
export function KroneVrstice({ kralj, kron }: { kralj: boolean; kron: number }) {
  return (
    <>
      {kralj && (
        <span role="img" aria-label={t('lestvice.napovedi.kraljOznaka')} title={t('lestvice.napovedi.kraljOznaka')} className="shrink-0">
          👑
        </span>
      )}
      <span className="w-9 shrink-0 text-right text-[11px] font-bold tabular-nums text-amber-200/80">
        {kron > 0 && (
          <span title={t('lestvice.napovedi.krone', { n: kron })} aria-label={t('lestvice.napovedi.krone', { n: kron })}>
            <span aria-hidden="true">👑</span>
            <span aria-hidden="true">{kron}</span>
          </span>
        )}
      </span>
    </>
  )
}

/** Gumbi "Skupno" in krogi z napovedmi (mini liga in lestvica lige). */
export function IzbiraKroga({ krogi, krog, onKrog }: {
  krogi: number[]
  krog: number | null
  onKrog: (krog: number | null) => void
}) {
  if (krogi.length === 0) return null
  return (
    <div className="flex min-w-0 max-w-full gap-1 overflow-x-auto pb-1" role="group">
      {[null, ...krogi].map((k) => (
        <button
          key={k ?? 'skupno'}
          onClick={() => onKrog(k)}
          aria-pressed={k === krog}
          className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-bold tabular-nums ${
            k === krog
              ? 'bg-gnl-500/20 text-gnl-200 ring-1 ring-gnl-400/40'
              : 'bg-white/5 text-slate-400 hover:text-slate-200'
          }`}
        >
          {k == null ? t('lestvice.napovedi.skupno') : t('lestvice.krog', { n: k })}
        </button>
      ))}
    </div>
  )
}

/**
 * Tekme naslednjega kroga z mojimi napovedmi: vseh mojih lig (mini liga) ali
 * le ene (`tekmovanjeId`, stran Napovedi). Napoved je ena in velja povsod.
 */
export function ObrazecNapovedi({ tekmovanjeId, brezPravil = false }: {
  tekmovanjeId?: number
  brezPravil?: boolean
}) {
  const [tekme, setTekme] = useState<Odprta[] | null>(null)

  useEffect(() => {
    let veljavno = true
    setTekme(null)
    supabase
      .rpc('moje_odprte_napovedi', tekmovanjeId == null ? {} : { p_tekmovanje: tekmovanjeId })
      .then(({ data }) => {
        if (veljavno) setTekme(data ?? [])
      })
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  // Po ligah: vsaka ima svoj krog in rok.
  const poLigah = useMemo(() => {
    const skupine = new Map<number, Odprta[]>()
    for (const tk of tekme ?? []) {
      if (!skupine.has(tk.competition_id)) skupine.set(tk.competition_id, [])
      skupine.get(tk.competition_id)!.push(tk)
    }
    return [...skupine.values()]
  }, [tekme])

  return (
    <section className="kartica space-y-3 p-4">
      <div>
        <h2 className="text-lg font-bold">{t('lestvice.napovedi.naslov')}</h2>
        {!brezPravil && <p className="mt-0.5 text-xs text-slate-400">{t('lestvice.napovedi.pravila')}</p>}
      </div>
      {tekme == null ? (
        <p className="animiraj-utrip text-sm text-slate-400">{t('skupno.nalaganje')}</p>
      ) : poLigah.length === 0 ? (
        <p className="text-sm text-slate-400">
          {tekmovanjeId == null ? t('lestvice.napovedi.niTekem') : t('lestvice.napovedi.niTekemLige')}
        </p>
      ) : (
        poLigah.map((skupina) => {
          const prva = skupina[0]
          return (
            <div key={prva.competition_id} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
                <span className="font-bold uppercase tracking-wide text-slate-300">
                  {prva.competition_short} · {t('lestvice.krog', { n: prva.krog })}
                </span>
                {prva.rok && (
                  <span className="text-slate-500">
                    {t('lestvice.napovedi.rok', { cas: datumUra(prva.rok, { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) })}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-white/10">
                {skupina.map((tk) => (
                  <VrsticaNapovedi key={tk.match_id} tekma={tk} />
                ))}
              </ul>
            </div>
          )
        })
      )}
      <p className="text-xs text-slate-500">{t('lestvice.napovedi.zasebno')}</p>
    </section>
  )
}

/**
 * Ena tekma: dve vrstici (domači, gostje), vsaka s − in +. Shrani se sama
 * slabo sekundo po zadnjem dotiku; prazna napoved (–) se ne šteje.
 */
function VrsticaNapovedi({ tekma }: { tekma: Odprta }) {
  const [doma, setDoma] = useState<number | null>(tekma.napoved_doma)
  const [gostje, setGostje] = useState<number | null>(tekma.napoved_gostje)
  const [stanje, setStanje] = useState<'shranjeno' | 'dela' | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const casovnik = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (casovnik.current) clearTimeout(casovnik.current)
  }, [])

  function shrani(d: number | null, g: number | null) {
    if (casovnik.current) clearTimeout(casovnik.current)
    setStanje('dela')
    setNapaka(null)
    casovnik.current = setTimeout(async () => {
      const { error } = await supabase.rpc(
        'shrani_napoved',
        d == null || g == null ? { p_tekma: tekma.match_id } : { p_tekma: tekma.match_id, p_doma: d, p_gostje: g },
      )
      if (error) {
        setStanje(null)
        setNapaka(
          error.message.startsWith('Rok za napoved')
            ? t('lestvice.napovedi.rokPotekel')
            : prevediNapako(error.message),
        )
      } else setStanje('shranjeno')
    }, 700)
  }

  // Prvi dotik ene strani drugo postavi na 0: napoved je vedno cel izid.
  function spremeni(stran: 'doma' | 'gostje', za: number) {
    const nov = (v: number | null) => Math.min(NAJVEC_GOLOV, Math.max(0, (v ?? 0) + za))
    const d = stran === 'doma' ? nov(doma) : doma ?? 0
    const g = stran === 'gostje' ? nov(gostje) : gostje ?? 0
    setDoma(d)
    setGostje(g)
    shrani(d, g)
  }

  function pocisti() {
    setDoma(null)
    setGostje(null)
    shrani(null, null)
  }

  const klub = (ime: string, kratko: string, logo: string, vrednost: number | null, stran: 'doma' | 'gostje') => (
    <div className="flex items-center gap-2">
      <Grb ime={ime} kratko={kratko} logo={logo} velikost={22} />
      <span className="min-w-0 flex-1 truncate text-sm">{ime}</span>
      <button
        type="button"
        onClick={() => spremeni(stran, -1)}
        disabled={vrednost == null || vrednost === 0}
        aria-label={t('lestvice.napovedi.manj', { klub: ime })}
        className="h-9 w-9 shrink-0 rounded-lg bg-white/5 text-lg font-bold text-slate-300 ring-1 ring-white/10 disabled:opacity-30"
      >
        −
      </button>
      <span className="w-6 shrink-0 text-center text-lg font-black tabular-nums" aria-live="polite">
        {vrednost ?? '–'}
      </span>
      <button
        type="button"
        onClick={() => spremeni(stran, 1)}
        disabled={vrednost === NAJVEC_GOLOV}
        aria-label={t('lestvice.napovedi.vec', { klub: ime })}
        className="h-9 w-9 shrink-0 rounded-lg bg-white/5 text-lg font-bold text-gnl-300 ring-1 ring-white/10 disabled:opacity-30"
      >
        +
      </button>
    </div>
  )

  return (
    <li className="space-y-1.5 py-2.5">
      {klub(tekma.home_name, tekma.home_short, tekma.home_logo, doma, 'doma')}
      {klub(tekma.away_name, tekma.away_short, tekma.away_logo, gostje, 'gostje')}
      <div className="flex min-h-[20px] items-center justify-between gap-2 text-xs">
        <span className={napaka ? 'text-rose-400' : 'text-slate-500'} role={napaka ? 'alert' : undefined}>
          {napaka ?? (stanje === 'shranjeno' ? `✓ ${t('lestvice.napovedi.shranjeno')}` : stanje === 'dela' ? '…' : '')}
        </span>
        {doma != null && (
          <button type="button" onClick={pocisti} className="text-slate-500 underline hover:text-slate-300">
            {t('lestvice.napovedi.pocisti')}
          </button>
        )}
      </div>
    </li>
  )
}

/** Po roku: napovedi vseh članov po tekmah kroga, s točkami. */
function NapovediPoTekmah({ krog, vrstice }: { krog: number; vrstice: NapovedKroga[] }) {
  const tekme = useMemo(() => {
    const po = new Map<number, NapovedKroga[]>()
    for (const v of vrstice) {
      if (!po.has(v.match_id)) po.set(v.match_id, [])
      // Tekma brez napovedi ima eno vrstico brez uporabnika.
      if (v.user_id) po.get(v.match_id)!.push(v)
    }
    return [...po.entries()].map(([id, napovedi]) => ({
      tekma: vrstice.find((v) => v.match_id === id)!,
      napovedi,
    }))
  }, [vrstice])

  return (
    <section className="kartica space-y-3 p-4">
      <h2 className="text-lg font-bold">
        {t('lestvice.napovedi.krogNaslov')} · {t('lestvice.krog', { n: krog })}
      </h2>
      <ul className="space-y-3">
        {tekme.map(({ tekma, napovedi }) => (
          <li key={tekma.match_id} className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Grb ime={tekma.home_name} kratko={tekma.home_short} logo={tekma.home_logo} velikost={18} />
              <span className="min-w-0 flex-1 truncate">{tekma.home_name}</span>
              <span className="shrink-0 tabular-nums">
                {tekma.stanje === 'izid' ? `${tekma.izid_doma}:${tekma.izid_gostje}` : '–:–'}
              </span>
              <span className="min-w-0 flex-1 truncate text-right">{tekma.away_name}</span>
              <Grb ime={tekma.away_name} kratko={tekma.away_short} logo={tekma.away_logo} velikost={18} />
            </div>
            {tekma.stanje !== 'izid' && (
              <p className="text-center text-[11px] text-slate-500">
                {tekma.stanje === 'caka' ? t('lestvice.napovedi.caka') : t('lestvice.napovedi.neSteje')}
              </p>
            )}
            {napovedi.length === 0 ? (
              <p className="text-xs text-slate-500">{t('lestvice.napovedi.nihce')}</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {napovedi.map((n) => (
                  <li
                    key={n.user_id}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                      n.tocke === 3
                        ? 'bg-gnl-500/20 text-gnl-100'
                        : n.tocke === 1
                          ? 'bg-sky-500/15 text-sky-100'
                          : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    <span className="max-w-[8rem] truncate">{n.display_name}</span>
                    <span className="font-bold tabular-nums">
                      {n.napoved_doma}:{n.napoved_gostje}
                    </span>
                    {n.tocke != null && <span className="font-bold tabular-nums">+{n.tocke}</span>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
