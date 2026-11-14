// Povabi prijatelje (/invite): osebna povezava s kodo, napredek do bona in
// akcija vabil z zabojem piva (migracija 20261114120000).
//
// Povabilo šteje, ko se prijatelj registrira prek povezave IN sestavi ekipo.
// Trije taki prijatelji dajo enkraten bon za ponovno vrednotenje cene igralca;
// največ prijateljev v oknu akcije osvoji zaboj piva. Vse števce šteje baza.
import { useEffect, useState } from 'react'
import { Link } from '../components/Povezava'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { izvor } from '../lib/platforma'
import { deliBesedilo, povezaveDeljenja, type IzidDeljenja } from '../lib/miniLige'
import { povezavaNaPrijavo } from '../lib/prijava'
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

const ZA_BON = 3

export default function Povabi() {
  useNaslov(t('racun.povabi.naslov'))
  const { session } = useAuth()
  const [moje, setMoje] = useState<MojeVabilo | null>(null)
  const [lestvica, setLestvica] = useState<VrsticaLestvice[]>([])
  const [sporocilo, setSporocilo] = useState<string | null>(null)

  useEffect(() => {
    let zivo = true
    void supabase.rpc('lestvica_vabil').then(({ data }) => {
      if (zivo) setLestvica((data as VrsticaLestvice[] | null) ?? [])
    })
    if (session)
      void supabase.rpc('moje_vabilo').then(({ data }) => {
        if (zivo) setMoje((data as MojeVabilo | null) ?? null)
      })
    return () => {
      zivo = false
    }
  }, [session])

  const povezava = moje ? `${izvor()}/?od=${moje.koda}` : null
  const besedilo = povezava ? t('racun.povabi.besedilo', { povezava }) : ''

  function povej(izid: IzidDeljenja) {
    setSporocilo(
      izid === 'deljeno'
        ? t('lestvice.miniLige.poslano')
        : izid === 'kopirano'
          ? t('lestvice.miniLige.kopirano')
          : izid === 'preklicano'
            ? null
            : t('lestvice.miniLige.neuspeloPovezava'),
    )
  }

  const pripeljanih = moje?.pripeljanih ?? 0

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-black naslov">{t('racun.povabi.naslov')}</h1>
        <p className="text-slate-300">{t('racun.povabi.uvod')}</p>
      </div>

      {!session ? (
        <div className="kartica space-y-3 p-4">
          <p className="text-slate-300">{t('racun.povabi.prijava')}</p>
          <Link to={povezavaNaPrijavo('/invite')} className="gumb-glavni inline-block text-sm">
            {t('racun.povabi.prijavaGumb')}
          </Link>
        </div>
      ) : (
        povezava && (
          <div className="kartica space-y-3 p-4">
            <h2 className="font-bold text-gnl-200">{t('racun.povabi.tvojaPovezava')}</h2>
            <p className="break-all rounded-lg bg-black/30 px-3 py-2 font-mono text-sm text-slate-200">{povezava}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="gumb-glavni text-sm"
                onClick={async () => povej(await deliBesedilo(t('racun.povabi.naslov'), besedilo))}
              >
                {t('racun.povabi.deli')}
              </button>
              <a href={povezaveDeljenja(besedilo).whatsapp} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#7ee2a4] hover:underline">
                {t('lestvice.deli.whatsapp')}
              </a>
              <a href={povezaveDeljenja(besedilo).viber} className="text-sm font-semibold text-[#b7adff] hover:underline">
                {t('lestvice.deli.viber')}
              </a>
            </div>
            {sporocilo && <p className="text-sm text-gnl-300">{sporocilo}</p>}
            <p className="text-xs text-slate-400">{t('racun.povabi.kajSteje')}</p>
          </div>
        )
      )}

      {moje && (
        <div className="kartica space-y-3 p-4">
          <h2 className="font-bold text-gnl-200">{t('racun.povabi.bonNaslov')}</h2>
          <div
            className="h-3 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={ZA_BON}
            aria-valuenow={Math.min(pripeljanih, ZA_BON)}
            aria-label={t('racun.povabi.bonNaslov')}
          >
            <div className="h-full rounded-full bg-gnl-400" style={{ width: `${(Math.min(pripeljanih, ZA_BON) / ZA_BON) * 100}%` }} />
          </div>
          <p className="text-sm text-slate-300">
            {t('racun.povabi.stevec', { n: pripeljanih, registriranih: moje.registriranih })}
          </p>
          <p className="text-sm text-slate-300">
            {moje.bon
              ? t('racun.povabi.bonImas')
              : moje.bon_porabljen
                ? t('racun.povabi.bonPorabljen')
                : t('racun.povabi.bonManjka', { m: Math.max(ZA_BON - pripeljanih, 0) })}
          </p>
          {moje.bon && (
            <Link to="/players" className="text-sm font-semibold text-gnl-300 underline">
              {t('racun.povabi.bonKje')}
            </Link>
          )}
        </div>
      )}

      <div className="kartica space-y-3 p-4">
        <h2 className="font-bold text-amber-200">{t('racun.povabi.akcijaNaslov')}</h2>
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
      </div>
    </div>
  )
}
