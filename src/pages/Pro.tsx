// SLFF Pro (/pro): kaj dobiš, nakup (Stripe Checkout prek pro-placilo, le na
// spletu) in za člane sezonsko poročilo ekip. Zasebna stran (noindex).
//
// Kaj sme kdo, odloči baza (`moj_pro`, `pro_porocilo`, stikalo `slff_pro`).
// V aplikaciji ni nakupa ne napotka nanj (pravila trgovin); kupljen Pro deluje.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov, useNoindex } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import { jeNativno } from '../lib/platforma'
import { mojPro, proPlacilo, type CenaPro, type MojPro } from '../lib/pro'
import { StanjePro } from '../components/ProRacun'
import { t, tx, stevilo, jezikSlovarja } from '../i18n'

interface Sezona {
  ekipa_id: number
  ekipa: string
  liga_kratko: string | null
  sezona: string
  tock: number
  mesto: number
  ekip: number
  povprecje: number | null
  prestopi: number | null
  kazni: number | null
  krogi: { krog: number; tock: number }[] | null
}

const znesek = (c: CenaPro) => stevilo(c.centi / 100, { style: 'currency', currency: c.valuta.toUpperCase() })

export default function Pro() {
  const { session, loading } = useAuth()
  const [stanje, setStanje] = useState<MojPro | null>(null)
  const [iskanje] = useSearchParams()
  useNaslov(t('pro.naslov'))
  useNoindex(true)

  useEffect(() => {
    if (loading) return
    let zivo = true
    if (session) void mojPro().then((s) => zivo && setStanje(s))
    else
      void Promise.resolve(supabase.rpc('vidi_pro')).then(({ data }) =>
        zivo && setStanje({ vidno: data === true, aktiven: false, portal: false }),
      )
    return () => {
      zivo = false
    }
  }, [session, loading])

  if (loading || !stanje) return <p className="text-slate-400">{t('pro.nalagam')}</p>

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-black naslov">{t('pro.naslov')}</h1>
      {!stanje.vidno && !stanje.aktiven ? (
        <p className="text-slate-300">{t('pro.niNaVoljo')}</p>
      ) : (
        <>
          <p className="text-slate-300">{t('pro.podnaslov')}</p>
          {iskanje.get('placilo') === 'uspeh' && !stanje.aktiven && <p className="text-gnl-300">{t('pro.uspeh')}</p>}
          <section className="kartica space-y-2 p-4">
            <h2 className="text-lg font-bold">{t('pro.dodatki.naslov')}</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
              <li>{t('pro.dodatki.znacka')}</li>
              <li>{t('pro.dodatki.porocilo')}</li>
              <li>{t('pro.dodatki.cene')}</li>
            </ul>
            <p className="text-xs text-slate-400">{t('pro.brezPrednosti')}</p>
          </section>
          {stanje.aktiven ? (
            <>
              <StanjePro stanje={stanje} />
              <Porocilo />
            </>
          ) : !session ? (
            <p className="text-slate-300">
              {tx('pro.prijava', {}, {
                prijava: (v) => (
                  <Link to={povezavaNaPrijavo('/pro')} className="text-gnl-300 underline">
                    {v}
                  </Link>
                ),
              })}
            </p>
          ) : (
            !jeNativno() && <Ponudba />
          )}
        </>
      )}
    </div>
  )
}

function Ponudba() {
  const [cene, setCene] = useState<CenaPro[] | null>(null)
  const [vir, setVir] = useState<'sezona' | 'mesec'>('sezona')
  const [star18, setStar18] = useState(false)
  const [odpoved, setOdpoved] = useState(false)
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    void proPlacilo({ akcija: 'cene' }).then((r) => {
      setCene(r.cene ?? [])
      if (r.napaka) setNapaka(r.napaka)
    })
  }, [])

  const izbrana = cene?.find((c) => c.vir === vir)
  return (
    <section className="kartica space-y-3 p-4 text-sm">
      {(['sezona', 'mesec'] as const).map((v) => {
        const c = cene?.find((x) => x.vir === v)
        if (!c) return null
        return (
          <label key={v} className="flex items-start gap-2">
            <input type="radio" name="paket" checked={vir === v} onChange={() => setVir(v)} className="mt-1" />
            <span>
              <span className="font-semibold">{t(`pro.paket.${v}`)}</span>{' '}
              <span className="text-slate-400">{t(`pro.paket.${v}Opis`, { cena: znesek(c) })}</span>
            </span>
          </label>
        )
      })}
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={star18} onChange={(e) => setStar18(e.target.checked)} className="mt-1" />
        <span>{t('pro.star18')}</span>
      </label>
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={odpoved} onChange={(e) => setOdpoved(e.target.checked)} className="mt-1" />
        <span>{t('pro.odpoved')}</span>
      </label>
      <p className="text-xs text-slate-400">
        {tx('pro.pogoji', {}, {
          pogoji: (v) => (
            <a href="/legal#placljivo" target="_blank" rel="noopener" className="underline">
              {v}
            </a>
          ),
        })}
      </p>
      {napaka && <p className="text-rose-400">{napaka}</p>}
      <button
        type="button"
        className="gumb-glavni disabled:opacity-50"
        disabled={!izbrana || !star18 || !odpoved || dela}
        onClick={async () => {
          setDela(true)
          setNapaka(null)
          const r = await proPlacilo({ akcija: 'checkout', vir, star_vsaj_18: star18, odpoved_pravici: odpoved, jezik: jezikSlovarja() })
          if (r.url) return window.location.assign(r.url)
          setDela(false)
          setNapaka(r.napaka ?? t('pro.napaka'))
        }}
      >
        {izbrana ? t('pro.kupi', { cena: znesek(izbrana) }) : t('pro.nalagam')}
      </button>
    </section>
  )
}

function Porocilo() {
  const [sezone, setSezone] = useState<Sezona[] | null>(null)
  useEffect(() => {
    void Promise.resolve(supabase.rpc('pro_porocilo')).then(({ data }) => setSezone((data as unknown as Sezona[] | null) ?? []))
  }, [])
  if (!sezone) return <p className="text-slate-400">{t('pro.nalagam')}</p>
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{t('pro.porocilo.naslov')}</h2>
      {!sezone.length && <p className="text-slate-400">{t('pro.porocilo.prazno')}</p>}
      {sezone.map((s) => {
        const krogi = s.krogi ?? []
        const vrh = Math.max(1, ...krogi.map((k) => k.tock))
        const najboljsi = krogi.reduce<{ krog: number; tock: number } | null>((a, k) => (!a || k.tock > a.tock ? k : a), null)
        const podatki: [string, string][] = [
          [t('pro.porocilo.tock'), stevilo(s.tock)],
          [t('pro.porocilo.mesto'), t('pro.porocilo.mestoOd', { mesto: s.mesto, ekip: s.ekip })],
          [t('pro.porocilo.povprecje'), s.povprecje == null ? '–' : stevilo(s.povprecje)],
          [t('pro.porocilo.najboljsi'), najboljsi ? `${stevilo(najboljsi.tock)} (${najboljsi.krog})` : '–'],
          [t('pro.porocilo.prestopi'), stevilo(s.prestopi ?? 0)],
          [t('pro.porocilo.kazni'), stevilo(s.kazni ?? 0)],
        ]
        return (
          <article key={`${s.ekipa_id}-${s.sezona}`} className="kartica space-y-3 p-4">
            <h3 className="font-bold">
              {s.ekipa} <span className="text-sm font-normal text-slate-400">{[s.liga_kratko, s.sezona].filter(Boolean).join(' · ')}</span>
            </h3>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {podatki.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-slate-400">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="mb-1 text-xs text-slate-400">{t('pro.porocilo.krogi')}</p>
              <div className="flex h-16 items-end gap-px" role="img" aria-label={t('pro.porocilo.krogi')}>
                {krogi.map((k) => (
                  <div
                    key={k.krog}
                    title={`${k.krog}: ${stevilo(k.tock)}`}
                    className="min-w-[3px] flex-1 rounded-t bg-gnl-400"
                    style={{ height: `${Math.max(4, (Math.max(0, k.tock) / vrh) * 100)}%` }}
                  />
                ))}
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
