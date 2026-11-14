// Zasebna sporočila (`/messages`, SLF-373): seznam pogovorov in izbran
// pogovor (`?p=<id>`). Na telefonu je naenkrat viden eno ali drugo. Brez
// sprotne povezave: odprt pogovor se osveži vsakih 15 s, ko je stran vidna.
// Kdo sme pisati, odloči baza; tu le pokažemo razlog, zakaj ne.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import { Kljukica } from '../components/ZnakPreverjen'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import {
  NAJDALJSE,
  opisRazloga,
  osveziZnacko,
  pogovori as naloziPogovore,
  razlogNapake,
  sporocilaPogovora,
  type Pogovor,
  type Sporocilo,
} from '../lib/sporocila'
import { t, datumUra } from '../i18n'

export default function Sporocila() {
  useNaslov(t('igralci.sporocila.naslov'))
  const { session, loading } = useAuth()
  const [iskanje, setIskanje] = useSearchParams()
  const izbran = Number(iskanje.get('p')) || null
  const [seznam, setSeznam] = useState<Pogovor[] | null>(null)

  const osveziSeznam = useCallback(() => {
    void naloziPogovore().then(setSeznam)
  }, [])
  useEffect(() => {
    if (session) osveziSeznam()
  }, [session, osveziSeznam, izbran])

  if (loading) return null
  if (!session)
    return (
      <div className="kartica max-w-md space-y-3 p-5">
        <h1 className="text-xl font-black naslov">{t('igralci.sporocila.naslov')}</h1>
        <p className="text-sm text-slate-300">{t('igralci.sporocila.prijavaOpis')}</p>
        <Link to={povezavaNaPrijavo('/messages')} className="gumb-glavni inline-flex min-h-11 items-center px-5">
          {t('igralci.sporocila.prijava')}
        </Link>
      </div>
    )

  const pogovor = seznam?.find((p) => p.id === izbran) ?? null
  const izberi = (id: number | null) => setIskanje(id ? { p: String(id) } : {}, { replace: false })

  return (
    <div className="space-y-4">
      <h1 className={`text-2xl font-black naslov ${izbran ? 'hidden md:block' : ''}`}>{t('igralci.sporocila.naslov')}</h1>
      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <aside className={`space-y-3 ${izbran ? 'hidden md:block' : ''}`}>
          <Seznam seznam={seznam} izbran={izbran} naIzbiro={izberi} />
          <Nastavitve />
        </aside>
        <section className={izbran ? '' : 'hidden md:block'}>
          {izbran && pogovor ? (
            <Pogovor key={pogovor.id} pogovor={pogovor} naNazaj={() => izberi(null)} naSpremembo={osveziSeznam} />
          ) : izbran && seznam ? (
            <p className="text-sm text-slate-400">{t('igralci.sporocila.niPogovora')}</p>
          ) : (
            <p className="hidden text-sm text-slate-400 md:block">{t('igralci.sporocila.izberi')}</p>
          )}
        </section>
      </div>
    </div>
  )
}

function Seznam({ seznam, izbran, naIzbiro }: { seznam: Pogovor[] | null; izbran: number | null; naIzbiro: (id: number) => void }) {
  if (!seznam) return <div className="min-h-24" role="status" aria-label={t('preverjeni.nalaga')} />
  if (!seznam.length) return <p className="kartica p-4 text-sm text-slate-300">{t('igralci.sporocila.prazno')}</p>
  return (
    <ul className="kartica divide-y divide-white/5 overflow-hidden p-0">
      {seznam.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => naIzbiro(p.id)}
            aria-current={p.id === izbran ? 'true' : undefined}
            className={`flex w-full min-h-14 flex-col gap-0.5 px-3 py-2 text-left hover:bg-white/5 ${p.id === izbran ? 'bg-white/10' : ''}`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`truncate text-sm ${p.neprebranih ? 'font-black text-white' : 'font-semibold text-slate-200'}`}>
                {imeSogovornika(p)}
              </span>
              {p.preverjen && <Kljukica velikost={14} />}
              {p.neprebranih > 0 && (
                <span className="ml-auto rounded-full bg-gnl-500 px-1.5 text-[11px] font-black text-slate-950">{p.neprebranih}</span>
              )}
            </span>
            {p.zadnje && (
              <span className="truncate text-xs text-slate-400">
                {p.zadnje_moje ? `${t('igralci.sporocila.ti')}: ` : ''}
                {p.zadnje}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

function imeSogovornika(p: Pogovor) {
  return p.igralec ?? p.ime ?? t('igralci.sporocila.neznan')
}

function Pogovor({ pogovor, naNazaj, naSpremembo }: { pogovor: Pogovor; naNazaj: () => void; naSpremembo: () => void }) {
  const [sporocila, setSporocila] = useState<Sporocilo[] | null>(null)
  const [besedilo, setBesedilo] = useState('')
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const konec = useRef<HTMLDivElement>(null)

  const nalozi = useCallback(async () => {
    const s = await sporocilaPogovora(pogovor.id)
    setSporocila(s)
    osveziZnacko()
  }, [pogovor.id])

  useEffect(() => {
    void nalozi()
    const ura = window.setInterval(() => {
      if (document.visibilityState === 'visible') void nalozi()
    }, 15_000)
    return () => window.clearInterval(ura)
  }, [nalozi])

  useEffect(() => {
    konec.current?.scrollIntoView({ block: 'end' })
  }, [sporocila?.length])

  async function poslji(e: FormEvent) {
    e.preventDefault()
    const v = besedilo.trim()
    if (!v || dela) return
    setDela(true)
    setNapaka(null)
    const { error } = await supabase.rpc('sporocila_poslji', { p_pogovor: pogovor.id, p_besedilo: v })
    setDela(false)
    if (error) return setNapaka(razlogNapake(error))
    setBesedilo('')
    await nalozi()
    naSpremembo()
  }

  async function blokiraj() {
    const { error } = await supabase.rpc('sporocila_blokiraj', { p_pogovor: pogovor.id, p_da: !pogovor.blokiran })
    if (error) return setNapaka(razlogNapake(error))
    naSpremembo()
  }

  return (
    <div className="kartica flex min-h-[60vh] flex-col p-0">
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <button type="button" onClick={naNazaj} className="inline-flex min-h-11 min-w-11 items-center justify-center md:hidden" aria-label={t('igralci.sporocila.nazaj')}>
          ←
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-bold text-white">
            {imeSogovornika(pogovor)}
            {pogovor.preverjen && <Kljukica velikost={16} />}
          </p>
          {pogovor.igralec_id && (
            <Link to={`/player/${pogovor.igralec_id}`} className="text-xs text-sky-300 underline">
              {t('igralci.sporocila.profil')}
            </Link>
          )}
        </div>
        <button type="button" onClick={blokiraj} className="gumb-tih inline-flex min-h-11 items-center px-3 text-xs">
          {pogovor.blokiran ? t('igralci.sporocila.odblokiraj') : t('igralci.sporocila.blokiraj')}
        </button>
      </header>

      <ol className="flex-1 space-y-2 overflow-y-auto px-3 py-3" aria-live="polite">
        {sporocila?.map((s) => <Mehurcek key={s.id} s={s} />)}
        <div ref={konec} />
      </ol>

      <div className="border-t border-white/10 p-3">
        {pogovor.razlog && pogovor.razlog !== 'blokada' ? (
          <p className="text-sm text-slate-400">{opisRazloga(pogovor.razlog)}</p>
        ) : pogovor.razlog === 'blokada' ? (
          <p className="text-sm text-slate-400">{t('igralci.sporocila.razlogi.blokada')}</p>
        ) : (
          <form onSubmit={poslji} className="flex items-end gap-2">
            <label className="sr-only" htmlFor="novo-sporocilo">{t('igralci.sporocila.novo')}</label>
            <textarea
              id="novo-sporocilo"
              value={besedilo}
              onChange={(e) => setBesedilo(e.target.value.slice(0, NAJDALJSE))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) void poslji(e)
              }}
              rows={2}
              placeholder={t('igralci.sporocila.novo')}
              className="min-h-11 flex-1 resize-none rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <button type="submit" disabled={dela || !besedilo.trim()} className="gumb-glavni inline-flex min-h-11 items-center px-4 text-sm">
              {t('igralci.sporocila.poslji')}
            </button>
          </form>
        )}
        {napaka && <p className="mt-1 text-xs text-red-300" role="alert">{napaka}</p>}
      </div>
    </div>
  )
}

function Mehurcek({ s }: { s: Sporocilo }) {
  const [prijavljeno, setPrijavljeno] = useState(false)
  async function prijavi() {
    const { error } = await supabase.rpc('sporocila_prijavi', { p_sporocilo: s.id })
    if (!error) setPrijavljeno(true)
  }
  return (
    <li className={`flex flex-col ${s.moje ? 'items-end' : 'items-start'}`}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
          s.moje ? 'bg-gnl-600 text-white' : 'bg-white/10 text-slate-100'
        }`}
      >
        {s.besedilo}
      </p>
      <span className="mt-0.5 flex gap-2 text-[11px] text-slate-500">
        {datumUra(s.created_at, { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
        {!s.moje &&
          (prijavljeno ? (
            <span>{t('igralci.sporocila.prijavljeno')}</span>
          ) : (
            <button type="button" onClick={prijavi} className="underline hover:text-slate-300">
              {t('igralci.sporocila.prijavi')}
            </button>
          ))}
      </span>
    </li>
  )
}

function Nastavitve() {
  const [stanje, setStanje] = useState<{ izklopljeno: boolean; izlocen: boolean; preverjen: boolean } | null>(null)
  useEffect(() => {
    void Promise.resolve(supabase.rpc('sporocila_moje_stanje')).then(({ data }) => {
      const v = (data as { izklopljeno: boolean; izlocen: boolean; preverjen: boolean }[] | null)?.[0]
      if (v) setStanje(v)
    })
  }, [])
  if (!stanje) return null
  if (stanje.izlocen) return <p className="text-xs text-slate-400">{t('igralci.sporocila.razlogi.mladinec')}</p>
  async function preklopi() {
    if (!stanje) return
    const nov = !stanje.izklopljeno
    const { error } = await supabase.rpc('sporocila_izklopi', { p_da: nov })
    if (!error) setStanje({ ...stanje, izklopljeno: nov })
  }
  return (
    <div className="space-y-1 px-1">
      <label className="flex min-h-11 items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={!stanje.izklopljeno} onChange={preklopi} className="h-4 w-4" />
        {t('igralci.sporocila.prejemaj')}
      </label>
      <p className="text-xs text-slate-500">
        {stanje.preverjen ? t('igralci.sporocila.praviloPreverjen') : t('igralci.sporocila.praviloNavaden')}
      </p>
    </div>
  )
}
