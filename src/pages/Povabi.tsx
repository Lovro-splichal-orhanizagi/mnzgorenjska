// Povabi prijatelje (/invite): osebna koda in kratka povezava slff.eu/i/<koda>,
// deljenje na vse običajne kanale, napredek do bona, seznam povabljenih s
// stanjem in akcija vabil z zabojem piva (migraciji 20261114120000, 20261114200000).
//
// Povabilo šteje, ko se prijatelj registrira prek povezave ali kode in sestavi
// ekipo. Vse števce in stanja šteje baza.
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from '../components/Povezava'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { izvor } from '../lib/platforma'
import { deliBesedilo, kopiraj, povezaveDeljenja, type IzidDeljenja } from '../lib/miniLige'
import { povezavaNaPrijavo } from '../lib/prijava'
import { VZOREC_KODE } from '../lib/povabilo'
import { nastaviMojoKodo } from '../lib/mojaKoda'
import { t, datum } from '../i18n'

interface MojeVabilo {
  koda: string
  registriranih: number
  pripeljanih: number
  v_akciji: number
  mesto: number | null
  bon: boolean
  bon_porabljen: boolean
  do: string
}

interface VrsticaLestvice {
  mesto: number
  ime: string
  n: number
}

interface Povabljeni {
  ime: string
  kdaj: string
  stanje: 'steje' | 'kader' | 'ekipa' | 'potrditev'
}

const ZA_BON = 3
const NAPAKE_KODE: Record<string, string> = { oblika: 'kodaOblika', zasedena: 'kodaZasedena', prepogosto: 'kodaPrepogosto' }

export default function Povabi() {
  useNaslov(t('racun.povabi.naslov'))
  const { session } = useAuth()
  const [moje, setMoje] = useState<MojeVabilo | null>(null)
  const [povabljeni, setPovabljeni] = useState<Povabljeni[]>([])
  const [lestvica, setLestvica] = useState<VrsticaLestvice[]>([])
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [urejanje, setUrejanje] = useState(false)
  const [novaKoda, setNovaKoda] = useState('')
  const [napakaKode, setNapakaKode] = useState<string | null>(null)
  const [shranjujem, setShranjujem] = useState(false)

  useEffect(() => {
    let zivo = true
    void supabase.rpc('lestvica_vabil').then(({ data }) => {
      if (zivo) setLestvica((data as VrsticaLestvice[] | null) ?? [])
    })
    if (session) {
      void supabase.rpc('moje_vabilo').then(({ data }) => {
        if (zivo) setMoje((data as MojeVabilo | null) ?? null)
      })
      void supabase.rpc('moji_povabljeni').then(({ data }) => {
        if (zivo) setPovabljeni((data as Povabljeni[] | null) ?? [])
      })
    }
    return () => {
      zivo = false
    }
  }, [session])

  const povezava = moje ? `${izvor()}/i/${moje.koda}` : null
  const besedilo = povezava ? t('racun.povabi.besedilo', { povezava, koda: moje?.koda ?? '' }) : ''
  const kanali = povezava ? deljenje(besedilo, povezava) : []

  function povej(izid: IzidDeljenja) {
    setSporocilo(
      izid === 'deljeno'
        ? t('lestvice.miniLige.poslano')
        : izid === 'kopirano'
          ? t('racun.povabi.kopirano')
          : izid === 'preklicano'
            ? null
            : t('lestvice.miniLige.neuspeloPovezava'),
    )
  }

  async function shraniKodo(e: FormEvent) {
    e.preventDefault()
    const k = novaKoda.trim().toLowerCase()
    if (!VZOREC_KODE.test(k)) return setNapakaKode(t('racun.povabi.kodaOblika'))
    setShranjujem(true)
    const { data, error } = await supabase.rpc('nastavi_kodo_vabila', { p_koda: k })
    setShranjujem(false)
    if (error) {
      const kljuc = NAPAKE_KODE[error.hint ?? ''] ?? 'kodaNapaka'
      return setNapakaKode(t(`racun.povabi.${kljuc}` as 'racun.povabi.kodaNapaka'))
    }
    setMoje((m) => (m ? { ...m, koda: data as string } : m))
    nastaviMojoKodo(data as string)
    try {
      localStorage.removeItem('slff-moja-koda')
    } catch {
      /* nič */
    }
    setUrejanje(false)
    setNapakaKode(null)
  }

  const pripeljanih = moje?.pripeljanih ?? 0

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-black naslov">{t('racun.povabi.naslov')}</h1>
        <p className="text-slate-300">{t('racun.povabi.uvod')}</p>
      </div>

      {!session && (
        <div className="kartica space-y-3 p-4">
          <p className="text-slate-300">{t('racun.povabi.prijava')}</p>
          <Link to={povezavaNaPrijavo('/invite')} className="gumb-glavni inline-block text-sm">
            {t('racun.povabi.prijavaGumb')}
          </Link>
        </div>
      )}

      {moje && povezava && (
        <section className="kartica space-y-4 p-4" aria-labelledby="povabi-koda">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="povabi-koda" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t('racun.povabi.tvojaKoda')}
              </h2>
              {urejanje ? (
                <form onSubmit={shraniKodo} className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    value={novaKoda}
                    onChange={(e) => setNovaKoda(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    maxLength={20}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label={t('racun.povabi.tvojaKoda')}
                    aria-invalid={Boolean(napakaKode)}
                    className="w-44 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 font-mono text-lg"
                  />
                  <button type="submit" disabled={shranjujem} className="gumb-glavni text-sm">
                    {t('racun.povabi.shraniKodo')}
                  </button>
                  <button type="button" onClick={() => { setUrejanje(false); setNapakaKode(null) }} className="text-sm text-slate-400 hover:text-slate-200">
                    {t('skupno.preklici')}
                  </button>
                </form>
              ) : (
                <p className="mt-1 break-all font-mono text-3xl font-black tracking-wide text-gnl-200">{moje.koda}</p>
              )}
              {napakaKode && <p className="mt-1 text-sm text-rose-400" role="alert">{napakaKode}</p>}
              {!urejanje && <p className="mt-1 text-xs text-slate-400">{t('racun.povabi.kodaNamig')}</p>}
            </div>
            {!urejanje && (
              <button
                type="button"
                onClick={() => { setNovaKoda(moje.koda); setUrejanje(true) }}
                className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-slate-300 hover:bg-white/5"
              >
                ✎ {t('racun.povabi.uredi')}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={async () => povej(await kopiraj(povezava))}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-left hover:border-white/25"
          >
            <span className="min-w-0 truncate font-mono text-sm text-slate-200">{povezava.replace(/^https?:\/\//, '')}</span>
            <span className="shrink-0 text-sm font-semibold text-gnl-300">{t('racun.povabi.kopiraj')}</span>
          </button>

          <button
            type="button"
            className="gumb-glavni w-full py-3 text-base"
            onClick={async () => povej(await deliBesedilo(t('racun.povabi.naslov'), besedilo))}
          >
            {t('racun.povabi.deli')}
          </button>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {kanali.map((k) => (
              <a
                key={k.ime}
                href={k.url}
                target={k.url.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl bg-white/5 px-2 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                <span aria-hidden="true" className="text-lg">{k.ikona}</span>
                {k.ime}
              </a>
            ))}
          </div>
          {sporocilo && <p className="text-sm text-gnl-300" role="status">{sporocilo}</p>}
        </section>
      )}

      {moje && (
        <section className="kartica space-y-3 p-4" aria-labelledby="povabi-bon">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="povabi-bon" className="font-bold text-gnl-200">{t('racun.povabi.bonNaslov')}</h2>
            <span className="text-sm font-bold tabular-nums text-slate-300">{Math.min(pripeljanih, ZA_BON)}/{ZA_BON}</span>
          </div>
          <div className="flex gap-2" role="img" aria-label={`${Math.min(pripeljanih, ZA_BON)}/${ZA_BON}`}>
            {Array.from({ length: ZA_BON }, (_, i) => (
              <span
                key={i}
                className={`flex h-10 flex-1 items-center justify-center rounded-lg text-lg ${i < pripeljanih ? 'bg-gnl-500/80 text-white' : 'border border-dashed border-white/20 text-slate-600'}`}
              >
                {i < pripeljanih ? '✓' : i + 1}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-300">
            {moje.bon
              ? t('racun.povabi.bonImas')
              : moje.bon_porabljen
                ? t('racun.povabi.bonPorabljen')
                : t('racun.povabi.bonManjka', { m: Math.max(ZA_BON - pripeljanih, 0) })}
          </p>
          {moje.bon && (
            <Link to="/players" className="gumb-glavni inline-block text-sm">
              {t('racun.povabi.bonKje')}
            </Link>
          )}

          <h3 className="pt-2 text-sm font-semibold text-slate-200">{t('racun.povabi.povabljeniNaslov')}</h3>
          {povabljeni.length === 0 ? (
            <p className="text-sm text-slate-400">{t('racun.povabi.povabljeniPrazno')}</p>
          ) : (
            <ul className="divide-y divide-white/5 text-sm">
              {povabljeni.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-slate-200">{p.ime}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${p.stanje === 'steje' ? 'bg-gnl-500/20 text-gnl-200' : 'bg-amber-400/15 text-amber-200'}`}
                  >
                    {t(`racun.povabi.stanje.${p.stanje}`)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500">
            {t('racun.povabi.stevec', { n: pripeljanih, registriranih: moje.registriranih })}
          </p>
        </section>
      )}

      <section className="kartica space-y-2 p-4" aria-labelledby="povabi-kako">
        <h2 id="povabi-kako" className="font-bold text-slate-100">{t('racun.povabi.kakoNaslov')}</h2>
        <ol className="space-y-2 text-sm text-slate-300">
          {(['korak1', 'korak2', 'korak3'] as const).map((k, i) => (
            <li key={k} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">{i + 1}</span>
              <span>{t(`racun.povabi.${k}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="kartica space-y-3 p-4" aria-labelledby="povabi-akcija">
        <h2 id="povabi-akcija" className="font-bold text-amber-200">{t('racun.povabi.akcijaNaslov')}</h2>
        <p className="text-sm text-slate-300">
          {t('racun.povabi.akcijaOpis', { datum: datum(moje?.do ?? '2026-11-30T23:00:00Z') })}
        </p>
        {moje && (
          <p className="text-sm font-semibold text-slate-200">
            {moje.mesto
              ? t('racun.povabi.tvojeMesto', { mesto: moje.mesto, n: moje.v_akciji })
              : t('racun.povabi.seNisi')}
          </p>
        )}
        {lestvica.length > 0 ? (
          <ol className="divide-y divide-white/5 text-sm">
            {lestvica.map((v) => (
              <li key={v.mesto} className="flex items-center justify-between py-1.5">
                <span className="text-slate-300">
                  <span className="mr-2 inline-block w-5 text-right tabular-nums text-slate-500">{v.mesto}.</span>
                  {v.ime}
                </span>
                <span className="font-bold tabular-nums text-gnl-300">{v.n}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-400">{t('racun.povabi.prazno')}</p>
        )}
        <p className="text-xs text-slate-500">{t('racun.povabi.pravila')}</p>
      </section>
    </div>
  )
}

/** Kanali deljenja: povezave, ki odprejo pogovor z že napisanim besedilom. */
function deljenje(besedilo: string, povezava: string) {
  const { whatsapp, viber } = povezaveDeljenja(besedilo)
  const b = encodeURIComponent(besedilo)
  const u = encodeURIComponent(povezava)
  return [
    { ime: 'WhatsApp', ikona: '💬', url: whatsapp },
    { ime: 'Viber', ikona: '📞', url: viber },
    { ime: 'Telegram', ikona: '✈️', url: `https://t.me/share/url?url=${u}&text=${encodeURIComponent(besedilo.replace(povezava, '').trim())}` },
    { ime: 'Facebook', ikona: '👍', url: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { ime: 'SMS', ikona: '✉️', url: `sms:?&body=${b}` },
    { ime: t('racun.povabi.eposta'), ikona: '📧', url: `mailto:?subject=${encodeURIComponent(t('racun.povabi.zadeva'))}&body=${b}` },
  ]
}
