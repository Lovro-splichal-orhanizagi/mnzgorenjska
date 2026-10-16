// "Moje lige ni? Povej nam": okno, v katerem obiskovalec pove, katero ligo bi
// rad (država, ime lige). Med tipkanjem predlaga vpisane NEAKTIVNE lige
// države — izbrana veže željo na ligo in obvestilo pride samo, ko zaživi.
// Prijavljen pošlje z enim klikom, neprijavljen pusti e-naslov (le za to
// obvestilo; glej migracijo 20261015120100_zelje_lig).
//
// Okno je v portalu na <body>: izbirnik lige ima animacijo s transform, ki bi
// `fixed` zaprla vase.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { jezikSlovarja, t } from '../i18n'
import { imeDrzave } from './IzbiraDrzave'

const DRUGA = '-'

export function ZelimLigoOkno({ drzava, zapri }: { drzava: string | null; zapri: () => void }) {
  const { session } = useAuth()
  const [drzave, setDrzave] = useState<{ code: string; name: string }[]>([])
  const [koda, setKoda] = useState(drzava ?? DRUGA)
  const [drugaDrzava, setDrugaDrzava] = useState('')
  const [ime, setIme] = useState('')
  const [liga, setLiga] = useState<number | null>(null)
  const [predlogi, setPredlogi] = useState<{ id: number; name: string }[]>([])
  const [email, setEmail] = useState('')
  const [stanje, setStanje] = useState<'vnos' | 'posiljam' | 'hvala'>('vnos')
  const [napaka, setNapaka] = useState<string | null>(null)
  const okno = useRef<HTMLDivElement>(null)
  const zapriRef = useRef(zapri)
  zapriRef.current = zapri

  useEffect(() => {
    okno.current?.focus()
    void supabase
      .from('countries')
      .select('code, name')
      .order('sort_order')
      .then(({ data }) => setDrzave(data ?? []))
    const tipka = (e: KeyboardEvent) => e.key === 'Escape' && zapriRef.current()
    window.addEventListener('keydown', tipka)
    return () => window.removeEventListener('keydown', tipka)
  }, [])

  // Predlogi: neaktivne lige izbrane države, ki vsebujejo vpisano.
  const iskanje = ime.replace(/[%_,()]/g, ' ').trim()
  useEffect(() => {
    if (koda === DRUGA || liga !== null || iskanje.length < 2) return setPredlogi([])
    let zastarelo = false
    const zamik = setTimeout(() => {
      void supabase
        .from('competitions_view')
        .select('id, name')
        .eq('country_code', koda)
        .eq('active', false)
        .ilike('name', `%${iskanje}%`)
        .order('name')
        .limit(6)
        .then(({ data }) => {
          if (!zastarelo) setPredlogi((data ?? []).flatMap((l) => (l.id && l.name ? [{ id: l.id, name: l.name }] : [])))
        })
    }, 250)
    return () => {
      zastarelo = true
      clearTimeout(zamik)
    }
  }, [koda, iskanje, liga])

  async function poslji(e: FormEvent) {
    e.preventDefault()
    setStanje('posiljam')
    setNapaka(null)
    const { error } = await supabase.rpc('zelim_ligo', {
      p_drzava: koda === DRUGA ? drugaDrzava : koda,
      p_ime: ime,
      p_competition_id: liga ?? undefined,
      p_email: session ? undefined : email,
      p_jezik: jezikSlovarja(),
    })
    if (!error) return setStanje('hvala')
    setStanje('vnos')
    setNapaka(
      error.hint === 'email'
        ? t('aplikacija.zelimLigo.napakaEmail')
        : error.hint === 'omejitev'
          ? t('aplikacija.zelimLigo.napakaOmejitev')
          : error.hint === 'besedilo'
            ? t('aplikacija.zelimLigo.napakaBesedilo')
            : t('aplikacija.zelimLigo.napaka'),
    )
  }

  const polje = 'w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-500'

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur"
      onMouseDown={(e) => e.target === e.currentTarget && zapri()}
    >
      <div
        ref={okno}
        role="dialog"
        aria-modal="true"
        aria-labelledby="zelim-ligo-naslov"
        tabIndex={-1}
        className="animiraj-vstop max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl outline-none"
      >
        <h2 id="zelim-ligo-naslov" className="text-xl font-black naslov">
          {t('aplikacija.zelimLigo.naslov')}
        </h2>
        {stanje === 'hvala' ? (
          <>
            <p className="mt-3 text-sm text-slate-300" aria-live="polite">
              {t('aplikacija.zelimLigo.hvala')}
            </p>
            <div className="mt-4 text-right">
              <button onClick={zapri} className="min-h-[44px] rounded-xl bg-gnl-500 px-4 text-sm font-bold text-slate-950">
                {t('aplikacija.zelimLigo.zapri')}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={poslji} className="mt-1 space-y-3">
            <p className="text-sm text-slate-400">{t('aplikacija.zelimLigo.opis')}</p>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-300">{t('aplikacija.zelimLigo.drzava')}</span>
              <select
                value={koda}
                onChange={(e) => {
                  setKoda(e.target.value)
                  setLiga(null)
                }}
                className={polje}
              >
                {drzave.map((d) => (
                  <option key={d.code} value={d.code}>
                    {imeDrzave(d.code) === d.code ? d.name : imeDrzave(d.code)}
                  </option>
                ))}
                <option value={DRUGA}>{t('aplikacija.zelimLigo.drugaDrzava')}</option>
              </select>
            </label>
            {koda === DRUGA && (
              <input
                required
                minLength={2}
                maxLength={60}
                value={drugaDrzava}
                onChange={(e) => setDrugaDrzava(e.target.value)}
                placeholder={t('aplikacija.zelimLigo.imeDrzave')}
                aria-label={t('aplikacija.zelimLigo.imeDrzave')}
                className={polje}
              />
            )}
            <label className="block space-y-1 text-sm">
              <span className="text-slate-300">{t('aplikacija.zelimLigo.liga')}</span>
              <input
                required
                minLength={2}
                maxLength={120}
                value={ime}
                onChange={(e) => {
                  setIme(e.target.value)
                  setLiga(null)
                }}
                placeholder={t('aplikacija.zelimLigo.ligaPrimer')}
                className={polje}
              />
            </label>
            {predlogi.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500">{t('aplikacija.zelimLigo.predlogi')}</p>
                {predlogi.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setIme(p.name)
                      setLiga(p.id)
                    }}
                    className="block w-full truncate rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            {!session && (
              <label className="block space-y-1 text-sm">
                <span className="text-slate-300">{t('aplikacija.zelimLigo.email')}</span>
                <input
                  required
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={polje}
                />
                <span className="block text-xs text-slate-500">{t('aplikacija.zelimLigo.emailOpomba')}</span>
              </label>
            )}
            {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={zapri} className="min-h-[44px] px-3 text-sm text-slate-400 hover:text-slate-200">
                {t('aplikacija.zelimLigo.preklici')}
              </button>
              <button
                type="submit"
                disabled={stanje === 'posiljam'}
                className="min-h-[44px] rounded-xl bg-gnl-500 px-4 text-sm font-bold text-slate-950 disabled:opacity-60"
              >
                {t('aplikacija.zelimLigo.poslji')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** Povezava "Moje lige ni? Povej nam" z oknom. */
export default function ZelimLigo({ drzava, className = '' }: { drzava: string | null; className?: string }) {
  const [odprto, setOdprto] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOdprto(true)}
        className={`text-sm text-slate-400 underline decoration-dotted underline-offset-2 hover:text-slate-200 ${className}`}
      >
        {t('aplikacija.zelimLigo.povezava')}
      </button>
      {odprto && <ZelimLigoOkno drzava={drzava} zapri={() => setOdprto(false)} />}
    </>
  )
}
