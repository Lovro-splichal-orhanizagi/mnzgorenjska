import { FunctionsHttpError } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type Izdelek } from '../baza'
import { cena, imeDrzave, jezik, po, t, type Kljuc } from '../besede'
import { EU27, nastavi, NAJVEC, odstrani, postnina, shrani, skupaj, useKosarica, type Kosarica as TKosarica } from '../kosarica'
import { Nalaganje } from '../seja'
import { Slika, ZnackaVoljo } from './Katalog'

type Izdelki = Record<string, Izdelek | null>

/** Preusmerimo le na Stripe Checkout, nikamor drugam. */
export function stripeNaslov(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.host === 'checkout.stripe.com'
  } catch {
    return false
  }
}

const razlicica = (izdelki: Izdelki, slug: string, id: number) => izdelki[slug]?.razlicice.find((r) => r.id === id) ?? null

/** Po zavrnjeni košarici odstranimo, česar ni več ali je razprodano. */
export const ociscena = (k: TKosarica, izdelki: Izdelki): TKosarica => ({
  ...k,
  postavke: k.postavke.filter((p) => {
    const r = razlicica(izdelki, p.slug, p.razlicica_id)
    return r !== null && r.na_voljo !== 'ne'
  }),
})

async function preberiIzdelke(slugi: string[]): Promise<Izdelki | null> {
  const odg = await Promise.all(slugi.map((slug) => supabase.rpc('trgovina_izdelek', { p_slug: slug })))
  if (odg.some((o) => o.error)) return null
  return Object.fromEntries(slugi.map((slug, n) => [slug, (odg[n].data as unknown as Izdelek | null) ?? null]))
}

export function Kosarica() {
  const k = useKosarica()
  const [izdelki, setIzdelki] = useState<Izdelki | null>(null)
  const [napakaBranja, setNapakaBranja] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [poteka, setPoteka] = useState(false)
  const slugi = useMemo(() => [...new Set(k.postavke.map((p) => p.slug))].sort(), [k.postavke])
  const kljucSlugov = slugi.join(',')

  const nalozi = useCallback(async () => {
    const m = await preberiIzdelke(kljucSlugov ? kljucSlugov.split(',') : [])
    setNapakaBranja(m === null)
    if (m) setIzdelki(m)
    return m
  }, [kljucSlugov])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  // Nazaj s Stripe iz bfcache: stran se ne naloži znova, gumb bi ostal onemogočen.
  useEffect(() => {
    const ob = (e: PageTransitionEvent) => e.persisted && setPoteka(false)
    addEventListener('pageshow', ob)
    return () => removeEventListener('pageshow', ob)
  }, [])

  async function placaj() {
    setPoteka(true)
    setSporocilo(null)
    const { data, error } = await supabase.functions.invoke<{ url?: string }>('trgovina-nakup', {
      body: { postavke: k.postavke.map(({ razlicica_id, kolicina }) => ({ razlicica_id, kolicina })), jezik, drzava: k.drzava },
    })
    const url = data?.url
    if (!error && url && stripeNaslov(url)) {
      location.assign(url)
      return
    }
    let kljuc: Kljuc = 'napaka.splosna'
    if (error instanceof FunctionsHttpError) {
      const odziv = error.context as Response
      const telo = (await odziv.json().catch(() => null)) as { hint?: string } | null
      if (odziv.status === 429) kljuc = 'napaka.prevec'
      else if (telo?.hint === 'trgovina-zaloga' || telo?.hint === 'trgovina-vnos') {
        kljuc = `napaka.${telo.hint}`
        const m = await nalozi()
        if (m) shrani(ociscena(k, m))
      }
    }
    setSporocilo(t(kljuc))
    setPoteka(false)
  }

  if (k.postavke.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-3xl font-black naslov">{t('kosarica.naslov')}</h1>
        {sporocilo && <p className="opozorilo">{sporocilo}</p>}
        <p className="text-slate-400">{t('kosarica.prazna')}</p>
        <Link to="/" className="gumb-glavni inline-block">{t('kosarica.nakupuj')}</Link>
      </div>
    )
  }
  if (!izdelki) return napakaBranja ? <p className="opozorilo">{t('napaka.nalaganje')}</p> : <Nalaganje />

  const cene = Object.fromEntries(k.postavke.map((p) => [p.razlicica_id, razlicica(izdelki, p.slug, p.razlicica_id)?.cena ?? 0]))
  const vmesna = skupaj(k, cene)
  const pismo = k.postavke.every((p) => izdelki[p.slug]?.pismo === true)
  const neveljavna = k.postavke.some((p) => (razlicica(izdelki, p.slug, p.razlicica_id)?.na_voljo ?? 'ne') === 'ne')
  const drzave = EU27.map((d) => [d, imeDrzave(d)] as const).sort((a, b) => a[1].localeCompare(b[1], jezik))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black naslov">{t('kosarica.naslov')}</h1>
      {sporocilo && <p className="opozorilo">{sporocilo}</p>}
      {napakaBranja && <p className="opozorilo">{t('napaka.nalaganje')}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {k.postavke.map((p) => {
            const iz = izdelki[p.slug]
            const r = razlicica(izdelki, p.slug, p.razlicica_id)
            const ime = iz ? po(iz.ime_sl, iz.ime_en) : p.slug
            return (
              <li key={p.razlicica_id} className="kartica flex gap-3 p-3 sm:gap-4">
                <Link to={`/p/${p.slug}`} className="w-20 shrink-0 sm:w-24">
                  <Slika src={iz?.slike[0]} alt={ime} majhna />
                </Link>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/p/${p.slug}`} className="font-bold text-slate-100 hover:text-gnl-200">{ime}</Link>
                      {r && iz && iz.razlicice.length > 1 && <p className="text-sm text-slate-400">{po(r.oznaka_sl, r.oznaka_en)}</p>}
                    </div>
                    {r && <p className="shrink-0 font-bold tabular-nums">{cena(r.cena * p.kolicina)}</p>}
                  </div>
                  {!r ? <p className="text-sm text-rose-300">{t('kosarica.niVec')}</p>
                    : r.na_voljo === 'ne' ? <p className="text-sm text-rose-300">{t('kosarica.razprodano')}</p>
                    : r.na_voljo === 'malo' && <ZnackaVoljo v="malo" />}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-lg border border-white/15 bg-white/5 text-sm" role="group" aria-label={t('izdelek.kolicina')}>
                      <button type="button" aria-label={t('izdelek.manj')} disabled={!r || p.kolicina <= 1} onClick={() => shrani(nastavi(k, p.razlicica_id, p.kolicina - 1))} className="px-2.5 py-1 font-bold disabled:opacity-30">−</button>
                      <span className="w-7 text-center tabular-nums">{p.kolicina}</span>
                      <button type="button" aria-label={t('izdelek.vec')} disabled={!r || p.kolicina >= NAJVEC} onClick={() => shrani(nastavi(k, p.razlicica_id, p.kolicina + 1))} className="px-2.5 py-1 font-bold disabled:opacity-30">+</button>
                    </div>
                    <button type="button" onClick={() => shrani(odstrani(k, p.razlicica_id))} className="text-sm text-slate-400 hover:text-rose-300">
                      {t('kosarica.odstrani')}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="kartica h-fit space-y-4 p-5 lg:sticky lg:top-24">
          <label className="block space-y-1 text-sm text-slate-400">
            <span>{t('kosarica.drzava')}</span>
            <select value={k.drzava} onChange={(e) => shrani({ ...k, drzava: e.target.value })} className="polje w-full">
              {drzave.map(([d, ime]) => <option key={d} value={d}>{ime}</option>)}
            </select>
          </label>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">{t('kosarica.vmesna')}</dt>
              <dd className="font-bold tabular-nums">{cena(vmesna)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">{t('kosarica.postnina')}</dt>
              <dd className="tabular-nums">{t('kosarica.postninaOd', { cena: cena(postnina(k.drzava, pismo)) })}</dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed text-slate-500">{t('kosarica.postninaOpis')}</p>
          <p className="text-xs leading-relaxed text-slate-500">{t('kosarica.ddv')}</p>
          <button type="button" disabled={poteka || neveljavna} onClick={() => void placaj()} className="gumb-glavni w-full py-3 text-lg">
            {poteka ? t('kosarica.poteka') : t('kosarica.placaj')}
          </button>
          <p className="text-xs leading-relaxed text-slate-500">
            {t('kosarica.pogoji')} <Link to="/terms" className="povezava">{t('noga.pogoji')}</Link>
          </p>
          <p className="text-xs leading-relaxed text-slate-500">{t('kosarica.gost')}</p>
        </aside>
      </div>
    </div>
  )
}
