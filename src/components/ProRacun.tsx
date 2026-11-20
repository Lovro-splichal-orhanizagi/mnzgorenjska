// SLFF Pro na strani Račun: stanje in upravljanje naročnine. Portal (preklic)
// je na voljo vsakemu kupcu ne glede na stikalo; v aplikaciji ga ni (pravila trgovin).
import { useEffect, useState } from 'react'
import { Link } from './Povezava'
import { jeNativno } from '../lib/platforma'
import { mojPro, proPlacilo, type MojPro } from '../lib/pro'
import { t, datum } from '../i18n'

/** Stanje in upravljanje (tudi na strani Račun). Portal le na spletu. */
export function StanjePro({ stanje }: { stanje: MojPro }) {
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  return (
    <div className="space-y-1 text-sm">
      {stanje.aktiven && stanje.velja_do && <p className="text-slate-200">{t('pro.aktiven', { datum: datum(stanje.velja_do) })}</p>}
      {stanje.aktiven && stanje.bonov != null && <p className="text-slate-400">{t('pro.bonov', { n: stanje.bonov })}</p>}
      {stanje.portal && !jeNativno() && (
        <button
          type="button"
          disabled={dela}
          className="text-gnl-300 hover:underline disabled:opacity-50"
          onClick={async () => {
            setDela(true)
            setNapaka(null)
            const r = await proPlacilo({ akcija: 'portal' })
            if (r.url) return window.location.assign(r.url)
            setDela(false)
            setNapaka(r.napaka ?? null)
          }}
        >
          {t('pro.upravljaj')}
        </button>
      )}
      {napaka && <p className="text-rose-400">{napaka}</p>}
    </div>
  )
}

export function ProNaRacunu() {
  const [stanje, setStanje] = useState<MojPro | null>(null)
  useEffect(() => {
    void mojPro().then(setStanje)
  }, [])
  if (!stanje || (!stanje.aktiven && !stanje.portal && (!stanje.vidno || jeNativno()))) return null
  return (
    <section className="kartica space-y-2 p-4">
      <h2 className="text-lg font-bold">{t('pro.naslov')}</h2>
      <StanjePro stanje={stanje} />
      {!stanje.aktiven && stanje.vidno && !jeNativno() && (
        <Link to="/pro" className="text-sm text-gnl-300 hover:underline">
          {t('pro.vec')}
        </Link>
      )}
    </section>
  )
}
