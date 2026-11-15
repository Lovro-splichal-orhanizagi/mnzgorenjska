// Prenosi tekme v živo z YouTuba in posnetki po tekmi (SLF-477).
// Gledanje brez prijave; dodajanje in prijava le prijavljeni s potrjenim
// naslovom. Predvajalnik (youtube-nocookie) se naloži šele po tapu.
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from './Povezava'
import { t, tx, ura, datum } from '../i18n'
import { useAuth } from '../lib/useAuth'
import { povezavaNaPrijavo } from '../lib/prijava'
import { izvor } from '../lib/platforma'
import {
  dodajPrenos,
  naYoutubu,
  osvezi,
  prenosiTekme,
  prijaviPrenos,
  stanjeTekme,
  vdelava,
  zabeleziOgled,
  zapomniIzvorPrijave,
  zastarelo,
  type IzidDodaj,
  type Prenos,
  type StanjeTekme,
} from '../lib/prenosi'
import type { Kljuc } from '../i18n'

const VNOS = 'rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm'
const RAZLOGI = ['ni_tekma', 'neprimerno', 'gledalci', 'spam', 'drugo'] as const

function Okno({ naslov, zapri, children }: { naslov: string; zapri: () => void; children: ReactNode }) {
  const idp = useId()
  const okno = useRef<HTMLDivElement>(null)
  useEffect(() => {
    okno.current?.focus()
    const tipka = (e: KeyboardEvent) => e.key === 'Escape' && zapri()
    window.addEventListener('keydown', tipka)
    return () => window.removeEventListener('keydown', tipka)
  }, [zapri])
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 pb-[var(--dno)] text-left backdrop-blur sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && zapri()}
    >
      <div
        ref={okno}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idp}-naslov`}
        tabIndex={-1}
        className="kartica max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-b-none p-5 text-sm text-slate-200 sm:rounded-b-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${idp}-naslov`} className="text-lg font-bold">{naslov}</h2>
          <button type="button" onClick={zapri} className="min-h-11 min-w-11 text-2xl leading-none text-slate-400 hover:text-white" aria-label={t('prenosi.kako.zapri')}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const Zivo = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold uppercase text-white">
    <span aria-hidden="true">●</span> {t('prenosi.vZivo')}
  </span>
)

const trajanje = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sek = s % 60
  const dd = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${dd(m)}:${dd(sek)}` : `${m}:${dd(sek)}`
}

const zacetnici = (s: string) =>
  s.replace(/^@/, '').split(/\s+/).filter(Boolean).slice(0, 2).map((b) => b[0]?.toUpperCase()).join('') || '?'

/** Predvajalnik: najprej le slika igrišča in gumb; YouTube se naloži po tapu. */
export function PredvajalnikPrenosa({ p, prijavljen }: { p: Pick<Prenos, 'id' | 'video_id' | 'naslov' | 'kanal_ime' | 'stanje' | 'gledalcev' | 'trajanje_s'>; prijavljen: boolean }) {
  const [tece, setTece] = useState(false)
  if (tece)
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          src={vdelava(p.video_id)}
          title={p.naslov}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  return (
    <button
      type="button"
      onClick={() => {
        setTece(true)
        zabeleziOgled(p.id)
        if (!prijavljen && p.stanje === 'v_zivo') zapomniIzvorPrijave(p.id)
      }}
      className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-b from-emerald-800 to-emerald-950 text-left"
      aria-label={t('prenosi.predvajaj', { naslov: p.naslov })}
    >
      {/* Igrišče iz CSS: brez slike z YouTuba, da Google pred tapom ne izve ničesar. */}
      <span aria-hidden="true" className="absolute inset-x-[12%] bottom-[10%] top-[28%] border-2 border-white/40 [transform:perspective(400px)_rotateX(25deg)]">
        <span className="absolute inset-y-0 left-1/2 border-l-2 border-white/40" />
      </span>
      <span className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-slate-200/90 to-slate-200/0 p-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gnl-700 text-xs font-bold text-white">
          {zacetnici(p.kanal_ime)}
        </span>
        <span className="truncate font-semibold text-slate-900">{p.naslov}</span>
      </span>
      <span className="absolute left-1/2 top-1/2 grid h-12 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-rose-600 text-2xl text-white shadow-lg transition group-hover:scale-105" aria-hidden="true">
        ▶
      </span>
      <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-black/0 p-3 text-sm text-white">
        {p.stanje === 'v_zivo' ? (
          <>
            <span className="rounded bg-rose-600 px-1.5 py-0.5 text-xs font-bold">LIVE</span>
            {p.gledalcev != null && <span>{t('prenosi.gleda', { n: p.gledalcev })}</span>}
          </>
        ) : (
          p.trajanje_s != null && <span className="rounded bg-black/70 px-1.5 py-0.5 text-xs tabular-nums">{trajanje(p.trajanje_s)}</span>
        )}
        <span className="ml-auto font-semibold">▶ YouTube</span>
      </span>
    </button>
  )
}

function PrijavaPrenosa({ p, zapri, poslano }: { p: Prenos; zapri: () => void; poslano: () => void }) {
  const [razlog, setRazlog] = useState<(typeof RAZLOGI)[number]>('ni_tekma')
  const [opomba, setOpomba] = useState('')
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const poslji = async () => {
    setDela(true)
    const n = await prijaviPrenos(p.id, razlog, opomba)
    setDela(false)
    if (n) setNapaka(n)
    else poslano()
  }
  return (
    <Okno naslov={t('prenosi.prijavi.naslov')} zapri={zapri}>
      <p className="text-slate-400">{t('prenosi.prijavi.prenos', { naslov: p.naslov, kanal: p.kanal_ime })}</p>
      <fieldset className="space-y-2">
        {RAZLOGI.map((r) => (
          <label key={r} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 ${razlog === r ? 'border-gnl-400 bg-gnl-900/40' : 'border-slate-700'}`}>
            <input type="radio" name="razlog" checked={razlog === r} onChange={() => setRazlog(r)} />
            {t(`prenosi.prijavi.${r}` as Kljuc)}
          </label>
        ))}
      </fieldset>
      <textarea
        value={opomba}
        onChange={(e) => setOpomba(e.target.value.slice(0, 500))}
        placeholder={t('prenosi.prijavi.opomba')}
        className={`${VNOS} min-h-20 w-full`}
      />
      <p className="text-xs text-slate-400">{t('prenosi.prijavi.pojasnilo')}</p>
      {napaka && <p className="text-rose-400">{napaka}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="gumb-tih" onClick={zapri}>{t('prenosi.prijavi.preklici')}</button>
        <button type="button" className="gumb-glavni bg-rose-500 disabled:opacity-50" disabled={dela} onClick={() => void poslji()}>
          {t('prenosi.prijavi.poslji')}
        </button>
      </div>
    </Okno>
  )
}

function Kartica({ p, prijavljen, prijavi, pot }: { p: Prenos; prijavljen: boolean; prijavi: (p: Prenos) => void; pot: string }) {
  return (
    <article className="space-y-3">
      <PredvajalnikPrenosa p={p} prijavljen={prijavljen} />
      {p.stanje === 'posnetek' && <p className="font-semibold">{p.naslov}</p>}
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-800 text-sm font-bold">
          {zacetnici(p.dodal ?? p.kanal_ime)}
        </span>
        <div className="min-w-0 flex-1 text-sm">
          {p.dodal && <p className="truncate font-semibold">{t('prenosi.dodal', { ime: p.dodal })}</p>}
          <a href={naYoutubu(p.video_id)} target="_blank" rel="noopener noreferrer" className="block truncate text-slate-400 hover:text-gnl-300">
            {t('prenosi.kanal', { kanal: p.kanal_ime })}
          </a>
        </div>
        {p.prijavil ? (
          <span className="text-sm text-slate-500">{t('prenosi.prijavi.ze')}</span>
        ) : prijavljen ? (
          <button type="button" onClick={() => prijavi(p)} className="min-h-11 text-sm text-slate-300 underline underline-offset-4 hover:text-white">
            ⚑ {t('prenosi.prijavi.gumb')}
          </button>
        ) : (
          <Link to={povezavaNaPrijavo(pot)} onClick={() => zapomniIzvorPrijave(p.id)} className="min-h-11 py-3 text-sm text-slate-300 underline underline-offset-4">
            ⚑ {t('prenosi.prijavi.gumb')}
          </Link>
        )}
      </div>
    </article>
  )
}

const besediloNapake = (izid: IzidDodaj) => {
  const n = izid.napaka ?? 'splosna'
  if (n === 'izven_casa')
    return izid.ura_znana && izid.od && izid.do
      ? t('prenosi.napaka.izven_casa', { od: ura(izid.od), do: ura(izid.do) })
      : t('prenosi.napaka.izven_casaDan')
  if (n === 'prepoved')
    return izid.do
      ? t('prenosi.napaka.prepovedDo', { do: datum(izid.do), razlog: izid.razlog ?? '' })
      : t('prenosi.napaka.prepoved', { razlog: izid.razlog ?? '' })
  const kljuc = `prenosi.napaka.${n}` as Kljuc
  const s = t(kljuc)
  return s === kljuc ? t('prenosi.napaka.splosna') : s
}

/** Celoten razdelek prenosov na strani tekme. */
export default function PrenosiTekme({ matchId, tekma }: { matchId: number; tekma: string }) {
  const { session } = useAuth()
  const prijavljen = Boolean(session)
  const { pathname } = useLocation()
  const [stanje, setStanje] = useState<StanjeTekme | null>(null)
  const [seznam, setSeznam] = useState<Prenos[]>([])
  const [obrazec, setObrazec] = useState(false)
  const [kako, setKako] = useState(false)
  const [povezava, setPovezava] = useState('')
  const [dela, setDela] = useState(false)
  const [izid, setIzid] = useState<IzidDodaj | null>(null)
  const [prijava, setPrijava] = useState<Prenos | null>(null)
  const [obvestilo, setObvestilo] = useState<string | null>(null)

  const nalozi = useCallback(async () => {
    const [s, p] = await Promise.all([stanjeTekme(matchId), prenosiTekme(matchId)])
    setStanje(s)
    setSeznam(p)
    return p
  }, [matchId])

  // Ob ogledu in nato vsaki 2 min: zastarel živ prenos sproži osvežitev na
  // strežniku (YouTube največ enkrat na 2 min za vse obiskovalce skupaj).
  useEffect(() => {
    let veljavno = true
    const krog = async () => {
      const p = await nalozi()
      if (veljavno && p.some((x) => x.stanje === 'v_zivo' && zastarelo(x.osvezeno_at)) && (await osvezi()) && veljavno)
        await nalozi()
    }
    void krog()
    const ura2 = window.setInterval(() => void krog(), 2 * 60 * 1000)
    return () => {
      veljavno = false
      window.clearInterval(ura2)
    }
  }, [nalozi])

  if (!stanje?.vklopljeno) return null
  const zivi = seznam.filter((p) => p.stanje === 'v_zivo')
  const posnetki = seznam.filter((p) => p.stanje === 'posnetek')
  const zdaj = Date.now()
  // Poziv le na odprti tekmi in v oknu (ali na dan tekme, ko ure ne poznamo).
  const vOknu = stanje.okno_od && stanje.okno_do &&
    zdaj >= new Date(stanje.okno_od).getTime() && zdaj <= new Date(stanje.okno_do).getTime()
  const odprto = stanje.zaprto == null && vOknu
  const okno = stanje.ura_znana && stanje.okno_od && stanje.okno_do
    ? { od: ura(stanje.okno_od), do: ura(stanje.okno_do) }
    : null

  const dodaj = async () => {
    setDela(true)
    setIzid(null)
    const r = await dodajPrenos(matchId, povezava)
    setDela(false)
    setIzid(r)
    if (r.ok) {
      setPovezava('')
      await nalozi()
    }
  }

  const deli = async () => {
    const url = `${izvor()}/match/${matchId}`
    const besedilo = t('prenosi.deliBesedilo', { tekma })
    if (navigator.share) {
      await navigator.share({ title: besedilo, text: besedilo, url }).catch(() => {})
    } else {
      await navigator.clipboard?.writeText(url).catch(() => {})
      setObvestilo(t('prenosi.povezavaKopirana'))
    }
  }

  return (
    <>
      {zivi.length > 0 && (
        <section className="space-y-4" aria-label={t('prenosi.naslovZivo')}>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{t('prenosi.naslovZivo')}</h2>
            <Zivo />
            <button type="button" onClick={() => void deli()} className="gumb-tih ml-auto text-sm">
              {t('prenosi.deli')}
            </button>
          </div>
          <div className={zivi.length > 1 ? 'grid gap-6 lg:grid-cols-2' : 'space-y-6'}>
            {zivi.map((p) => (
              <Kartica key={p.id} p={p} prijavljen={prijavljen} prijavi={setPrijava} pot={pathname} />
            ))}
          </div>
          <p className="text-sm text-slate-500">
            {t('prenosi.noga')}{' '}
            {odprto && (
              <button type="button" className="underline underline-offset-4 hover:text-slate-300" onClick={() => setObrazec(true)}>
                {t('prenosi.prenasajTudiTi')}
              </button>
            )}
          </p>
        </section>
      )}

      {zivi.length === 0 && odprto && (
        <section className="kartica space-y-3 p-5">
          <h2 className="text-lg font-bold">📺 {t('prenosi.poziv.naslov')}</h2>
          <p className="text-slate-300">{t('prenosi.poziv.opis')}</p>
          {prijavljen ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="gumb-glavni bg-rose-500" onClick={() => setObrazec(true)}>
                ● {t('prenosi.poziv.gumb')}
              </button>
              <button type="button" className="gumb-tih" onClick={() => setKako(true)}>{t('prenosi.poziv.kakoDeluje')}</button>
            </div>
          ) : (
            <p className="text-slate-300">
              {tx('prenosi.poziv.prijava', {}, {
                prijava: (v) => <Link to={povezavaNaPrijavo(pathname)} className="text-gnl-300 underline">{v}</Link>,
              })}
            </p>
          )}
          <p className="text-xs text-slate-500">{okno ? t('prenosi.poziv.okno', okno) : t('prenosi.poziv.oknoDan')}</p>
        </section>
      )}

      {posnetki.length > 0 && (
        <section className="space-y-4" aria-label={t('prenosi.naslovPosnetki')}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold">{t('prenosi.naslovPosnetki')}</h2>
            <span className="text-sm text-slate-400">{t('prenosi.posnetkov', { n: posnetki.length })}</span>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {posnetki.map((p) => (
              <div key={p.id} className="kartica p-4">
                <Kartica p={p} prijavljen={prijavljen} prijavi={setPrijava} pot={pathname} />
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500">{t('prenosi.noga')} {t('prenosi.nogaPosnetki')}</p>
        </section>
      )}

      {obvestilo && <p role="status" className="text-sm text-gnl-300">{obvestilo}</p>}

      {kako && (
        <Okno naslov={t('prenosi.kako.naslov')} zapri={() => setKako(false)}>
          <ol className="list-decimal space-y-2 pl-5">
            <li>{t('prenosi.kako.k1')}</li>
            <li>{t('prenosi.kako.k2')}</li>
            <li>{t('prenosi.kako.k3')}</li>
          </ol>
          <p className="rounded-xl bg-amber-500/10 p-3 text-amber-200">{t('prenosi.kako.dan')}</p>
          <p className="text-slate-400">{t('prenosi.kako.zasebnost')}</p>
          <button type="button" className="gumb-glavni w-full" onClick={() => { setKako(false); setObrazec(true) }}>
            {t('prenosi.poziv.gumb')}
          </button>
        </Okno>
      )}

      {obrazec && (
        <Okno naslov={izid?.ok ? t('prenosi.uspeh.naslov') : t('prenosi.obrazec.naslov')} zapri={() => { setObrazec(false); setIzid(null) }}>
          {izid?.ok ? (
            <>
              <p>{t('prenosi.uspeh.opis')}</p>
              {izid.nepreverjeno && <p className="text-amber-200">{t('prenosi.uspeh.nepreverjeno')}</p>}
              <button type="button" className="gumb-glavni w-full" onClick={() => { setObrazec(false); setIzid(null) }}>
                {t('prenosi.obrazec.zapri')}
              </button>
            </>
          ) : (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void dodaj() }}>
              <label className="block font-semibold" htmlFor="prenos-povezava">{t('prenosi.obrazec.oznaka')}</label>
              <div className="flex gap-2">
                <input
                  id="prenos-povezava"
                  type="text"
                  inputMode="url"
                  required
                  value={povezava}
                  onChange={(e) => setPovezava(e.target.value)}
                  placeholder={t('prenosi.obrazec.namig')}
                  className={`${VNOS} min-w-0 flex-1`}
                />
                <button type="submit" className="gumb-glavni disabled:opacity-50" disabled={dela || !povezava.trim()}>
                  {dela ? t('prenosi.obrazec.dodajam') : t('prenosi.obrazec.dodaj')}
                </button>
              </div>
              {izid && !izid.ok && (
                <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-rose-200">
                  <strong className="block">{t('prenosi.napaka.naslov')}</strong>
                  {besediloNapake(izid)}
                </p>
              )}
              <p className="text-xs text-slate-400">{okno ? t('prenosi.obrazec.pogoj', okno) : t('prenosi.obrazec.pogojDan')}</p>
            </form>
          )}
        </Okno>
      )}

      {prijava && (
        <PrijavaPrenosa
          p={prijava}
          zapri={() => setPrijava(null)}
          poslano={() => {
            setPrijava(null)
            setObvestilo(t('prenosi.prijavi.poslano'))
            void nalozi()
          }}
        />
      )}
    </>
  )
}

