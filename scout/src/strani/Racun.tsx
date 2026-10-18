import { FunctionsHttpError } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../baza'
import { datum, jezik, napaka, t, type Kljuc } from '../besede'
import { Nalaganje, useSeja } from '../seja'

type Odziv = { error: { hint?: string | null; code?: string | null } | null }
type Stripe = { akcija: 'checkout'; obdobje: 'mesec' | 'sezona' } | { akcija: 'portal' }

function Okno({ children }: { children: ReactNode }) {
  return <section className="kartica space-y-3 p-5 text-slate-300">{children}</section>
}

function Gumb({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="gumb-glavni">
      {children}
    </button>
  )
}

/** Preusmerimo le na Stripe Checkout ali portal, nikamor drugam. */
function stripeNaslov(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && (u.host === 'checkout.stripe.com' || u.host === 'billing.stripe.com')
  } catch {
    return false
  }
}

export function Racun() {
  const { seja, nalaga, klub, napakaKluba, osvezi } = useSeja()
  const [q] = useSearchParams()
  const placilo = q.get('placilo')
  const [sprejmem, setSprejmem] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [poteka, setPoteka] = useState(false)
  const [portal, setPortal] = useState(false)

  // Webhook zapiše plačilo v nekaj sekundah po vrnitvi s Stripe.
  useEffect(() => {
    if (placilo !== 'uspeh') return
    const ure = [3000, 8000, 15000].map((ms) => setTimeout(() => void osvezi(), ms))
    return () => ure.forEach(clearTimeout)
  }, [placilo, osvezi])

  // Preklic mora biti vedno dosegljiv: plačnik ali kateri koli uradni račun
  // kluba, ne glede na sedež in naročnino (scout_portal_kupec v 3a).
  const uid = seja?.user.id
  useEffect(() => {
    if (!uid) return
    void supabase.rpc('scout_portal_kupec').then(({ data }) => setPortal(typeof data === 'string'))
  }, [uid, klub])

  // Nazaj s Stripe iz bfcache: stran se ne naloži znova, gumbi bi ostali onemogočeni.
  useEffect(() => {
    const ob = (e: PageTransitionEvent) => e.persisted && setPoteka(false)
    addEventListener('pageshow', ob)
    return () => removeEventListener('pageshow', ob)
  }, [])

  if (nalaga) return <Nalaganje />
  if (!seja) return <Navigate to="/login" replace />

  async function klic(fn: () => PromiseLike<Odziv>) {
    setPoteka(true)
    setSporocilo(null)
    const { error } = await fn()
    if (error) setSporocilo(napaka(error))
    else await osvezi()
    setPoteka(false)
  }

  async function stripe(vhod: Stripe) {
    setPoteka(true)
    setSporocilo(null)
    const { data, error } = await supabase.functions.invoke<{ url?: string }>('scout-placilo', { body: { ...vhod, jezik } })
    const url = data?.url
    if (error || !url || !stripeNaslov(url)) {
      // Napaka 400 nosi kodo baze v telesu ({ error, hint }); brez nje splošna.
      const telo: unknown = error instanceof FunctionsHttpError ? await (error.context as Response).json().catch(() => null) : null
      setSporocilo(napaka((telo as { hint?: string | null } | null) ?? null))
      setPoteka(false)
      return
    }
    location.assign(url)
  }

  const n = klub?.narocnina ?? null
  const jaz = seja.user.id
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-black naslov sm:text-3xl">{t('racun.naslov')}</h1>
      {placilo === 'uspeh' && <p className="rounded-xl border border-gnl-400/30 bg-gnl-400/10 px-3 py-2 text-sm text-gnl-200">{t('racun.placiloUspeh')}</p>}
      {placilo === 'preklic' && <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">{t('racun.placiloPreklic')}</p>}
      {sporocilo && <p className="opozorilo">{sporocilo}</p>}
      {napakaKluba ? (
        <Okno>
          <p className="opozorilo">{t('napaka.splosna')}</p>
        </Okno>
      ) : !klub ? (
        <Okno>
          <p>{t('racun.niKlub')}</p>
          <a className="povezava" href="https://slff.eu/account">{t('racun.slffRacun')}</a>
        </Okno>
      ) : !n && !klub.drzava_odprta ? (
        <Okno>
          <p>{t('racun.drzavaZaprta')}</p>
        </Okno>
      ) : !n ? (
        <Okno>
          <h2 className="text-lg font-bold text-slate-100">{t('racun.preizkusNaslov')}</h2>
          <p>{t('racun.preizkusOpis')}</p>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={sprejmem} onChange={(e) => setSprejmem(e.target.checked)} className="mt-1 accent-gnl-400" />
            <span>
              {t('racun.sprejmem')} <Link to="/terms" className="povezava">{t('noga.pogoji')}</Link>
            </span>
          </label>
          <Gumb disabled={!sprejmem || poteka} onClick={() => void klic(() => supabase.rpc('scout_zacni_preizkus', { p_sprejmem_pogoje: sprejmem }))}>
            {t('racun.zacni')}
          </Gumb>
        </Okno>
      ) : (
        <>
          <Okno>
            <p className="text-lg font-bold text-slate-100">{t('racun.veljaDo', { paket: t(`racun.paket.${n.paket}` as Kljuc), datum: datum(n.velja_do) })}</p>
            {!n.velja && <p>{t('racun.potekla')}</p>}
            {klub.sedez && n.velja && <Link to="/" className="gumb-glavni inline-block">{t('racun.naprej')} →</Link>}
            {!klub.sedez && (
              <>
                <p>{t('racun.niSedeza')}</p>
                <Gumb disabled={poteka} onClick={() => void klic(() => supabase.rpc('scout_zasedi_sedez'))}>{t('racun.zasedi')}</Gumb>
              </>
            )}
          </Okno>
          <Okno>
            <h2 className="font-bold text-slate-100">{t('racun.sedezi', { n: klub.sedezi.length })}</h2>
            <ul className="divide-y divide-white/5">
              {klub.sedezi.map((s) => (
                <li key={s.user_id} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-slate-200">
                    {s.ime ?? '?'} {s.user_id === jaz && <span className="text-slate-500">{t('racun.ti')}</span>}
                  </span>
                  {(klub.sedez || s.user_id === jaz) && (
                    <button type="button" disabled={poteka} className="gumb-tih px-3 py-1 text-sm" onClick={() => void klic(() => supabase.rpc('scout_sprosti_sedez', { p_user: s.user_id }))}>
                      {t('racun.sprosti')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Okno>
          {klub.sedez && (n.paket !== 'klub' || !n.velja) && (
            <Okno>
              <h2 className="text-lg font-bold text-slate-100">{t('racun.placiNaslov')}</h2>
              <p>{t('racun.placiOpis')}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={poteka} className="gumb-tih" onClick={() => void stripe({ akcija: 'checkout', obdobje: 'mesec' })}>{t('racun.mesec')}</button>
                <Gumb disabled={poteka} onClick={() => void stripe({ akcija: 'checkout', obdobje: 'sezona' })}>{t('racun.sezona')}</Gumb>
              </div>
              <p className="text-xs text-slate-400">{t('racun.ddv')}</p>
            </Okno>
          )}
        </>
      )}
      {portal && (
        <button type="button" disabled={poteka} className="gumb-tih text-sm" onClick={() => void stripe({ akcija: 'portal' })}>
          {t('racun.upravljaj')}
        </button>
      )}
    </div>
  )
}
