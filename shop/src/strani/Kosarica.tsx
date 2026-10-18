import { FunctionsHttpError } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type Izdelek } from '../baza'
import { cena, imeDrzave, jezik, po, t, type Kljuc } from '../besede'
import { EU27, izprazni, kljuc, nastavi, NAJVEC, odstrani, postnina, shrani, shraniPlacilo, skupaj, useKosarica, zadnjePlacilo, type Kosarica as TKosarica, type Postavka } from '../kosarica'
import { doplacilo } from '../personalizacija'
import { useNaslov } from '../Okvir'
import { Nalaganje } from '../seja'
import { Slika, ZnackaVoljo } from './Katalog'
import { svgCone } from './Konfigurator'
import { barvaRazlicice, conaZa, Mockup } from '../mockup'

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

/** Mockup motiva v košarici: natisnjene vrednosti (prikaz) na barvi različice. */
function SlikaMotiva({ iz, p, oznaka, alt }: { iz: Izdelek; p: Postavka; oznaka: string; alt: string }) {
  const m = iz.motivi?.find((x) => x.slug === p.personalizacija?.motiv)
  const barva = barvaRazlicice(oznaka)
  const cona = m && conaZa(iz.cone ?? [], m.cona, barva)
  if (!m || !cona) return <Slika src={iz.slike[0]} alt={alt} majhna />
  const barve = (m.sheme.find((s) => s.kljuc === p.personalizacija?.shema) ?? m.sheme[0]!).barve
  return <Mockup cona={cona} svg={svgCone(m.slug, p.prikaz ?? {}, barve, m.cona)} barva={barva} povecava={1.6} alt={alt} className="rounded-xl" />
}

const razlicica = (izdelki: Izdelki, slug: string, id: number) => izdelki[slug]?.razlicice.find((r) => r.id === id) ?? null

/** Cena kosa z doplačilom personalizacije (prikaz; pravo izračuna baza), null če različice ni. */
export const cenaKosa = (izdelki: Izdelki, p: Postavka): number | null => {
  const r = razlicica(izdelki, p.slug, p.razlicica_id)
  return r ? r.cena + doplacilo(izdelki[p.slug]?.personalizacije ?? [], p.personalizacija, izdelki[p.slug]?.motivi) : null
}

/** Največ kosov v vrstici: značka 1, darilni bon 5 (v bazi skupaj), sicer 20. */
const najvecKosov = (iz: Izdelek | null | undefined): number =>
  iz?.personalizacije.some((m) => m.vrsta === 'znacka') ? 1 : iz?.digitalni ? 5 : NAJVEC

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
  // Po zavrnitvi zaradi zaloge: označimo vrstice z več kosi, kot jih je morda na voljo.
  const [premalo, setPremalo] = useState(false)
  // Vrstica, ki je baza ni sprejela (ključ vrstice; strežnik vrne indeks).
  const [napacna, setNapacna] = useState<string | null>(null)
  const [soglasje, setSoglasje] = useState(false)
  useNaslov(t('kosarica.naslov'))
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

  const personalizirano = k.postavke.some((p) => p.personalizacija)
  const digitalno = izdelki !== null && k.postavke.every((p) => izdelki[p.slug]?.digitalni === true)

  async function placaj() {
    setPoteka(true)
    setSporocilo(null)
    setPremalo(false)
    setNapacna(null)
    const { data, error } = await supabase.functions.invoke<{ url?: string; seja?: string; oznaka?: string }>('trgovina-nakup', {
      body: {
        postavke: k.postavke.map(({ razlicica_id, kolicina, personalizacija }) => ({ razlicica_id, kolicina, ...(personalizacija && { personalizacija }) })),
        jezik,
        ...(!digitalno && { drzava: k.drzava }),
        prejsnja: zadnjePlacilo()?.seja,
        ...(personalizirano && { brez_odstopa: soglasje }),
      },
    })
    const url = data?.url
    if (!error && url && stripeNaslov(url)) {
      if (data.seja && data.oznaka) shraniPlacilo({ seja: data.seja, oznaka: data.oznaka })
      location.assign(url)
      return
    }
    let besedilo = t('napaka.splosna')
    if (error instanceof FunctionsHttpError) {
      const odziv = error.context as Response
      const telo = (await odziv.json().catch(() => null)) as { hint?: string; postavka?: number } | null
      const vrstica = Number.isInteger(telo?.postavka) ? k.postavke[telo!.postavka!] : undefined
      if (vrstica) setNapacna(kljuc(vrstica))
      if (odziv.status === 429) besedilo = t('napaka.prevec')
      else if (telo?.hint === 'trgovina-placano') {
        shraniPlacilo(null)
        izprazni()
        besedilo = t('kosarica.placano')
      } else if (telo?.hint === 'trgovina-personalizacija' || telo?.hint === 'trgovina-besedilo' || telo?.hint === 'trgovina-prijava' || telo?.hint === 'trgovina-odstop') {
        besedilo = t(`napaka.${telo.hint}` as Kljuc)
      } else if (telo?.hint === 'trgovina-zaloga' || telo?.hint === 'trgovina-vnos') {
        besedilo = t(`napaka.${telo.hint}` as Kljuc)
        const m = await nalozi()
        if (m) {
          const nova = ociscena(k, m)
          if (nova.postavke.length !== k.postavke.length) {
            shrani(nova)
            besedilo = `${besedilo} ${t('kosarica.posodobljena')}`
          }
        }
        setPremalo(telo.hint === 'trgovina-zaloga')
      }
    }
    setSporocilo(besedilo)
    setPoteka(false)
  }

  if (k.postavke.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-3xl font-black naslov">{t('kosarica.naslov')}</h1>
        <div aria-live="polite">{sporocilo && <p className="opozorilo">{sporocilo}</p>}</div>
        <p className="text-slate-400">{t('kosarica.prazna')}</p>
        <Link to="/" className="gumb-glavni inline-block">{t('kosarica.nakupuj')}</Link>
      </div>
    )
  }
  if (!izdelki) return napakaBranja ? <p className="opozorilo">{t('napaka.nalaganje')}</p> : <Nalaganje />

  const cene = Object.fromEntries(k.postavke.map((p) => [kljuc(p), cenaKosa(izdelki, p) ?? 0]))
  const vmesna = skupaj(k, cene)
  const pismo = k.postavke.every((p) => izdelki[p.slug]?.pismo === true || izdelki[p.slug]?.digitalni === true)
  const zBonom = k.postavke.some((p) => izdelki[p.slug]?.digitalni === true)
  const neveljavna = k.postavke.some((p) => (razlicica(izdelki, p.slug, p.razlicica_id)?.na_voljo ?? 'ne') === 'ne')
  const drzave = EU27.map((d) => [d, imeDrzave(d)] as const).sort((a, b) => a[1].localeCompare(b[1], jezik))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black naslov">{t('kosarica.naslov')}</h1>
      <div aria-live="polite" className="space-y-2">
        {sporocilo && <p className="opozorilo">{sporocilo}</p>}
        {napakaBranja && <p className="opozorilo">{t('napaka.nalaganje')}</p>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {k.postavke.map((p) => {
            const iz = izdelki[p.slug]
            const r = razlicica(izdelki, p.slug, p.razlicica_id)
            const ime = iz ? po(iz.ime_sl, iz.ime_en) : p.slug
            const kos = cenaKosa(izdelki, p)
            const vrstica = kljuc(p)
            const najvec = najvecKosov(iz)
            return (
              <li key={vrstica} className="kartica flex gap-3 p-3 sm:gap-4">
                <Link to={`/p/${p.slug}${p.personalizacija?.motiv ? `?motiv=${p.personalizacija.motiv}` : ''}`} className="w-20 shrink-0 sm:w-24">
                  {iz && r && p.personalizacija?.motiv ? <SlikaMotiva iz={iz} p={p} oznaka={r.oznaka_sl} alt={ime} /> : <Slika src={iz?.slike[0]} alt={ime} majhna />}
                </Link>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/p/${p.slug}`} className="font-bold text-slate-100 hover:text-gnl-200">{ime}</Link>
                      {r && iz && iz.razlicice.length > 1 && <p className="text-sm text-slate-400">{po(r.oznaka_sl, r.oznaka_en)}</p>}
                      {p.opis && <p className="break-words text-sm font-semibold uppercase text-gnl-200">{p.opis}</p>}
                      {iz?.digitalni && <p className="text-xs text-slate-500">{t('izdelek.digitalni')}</p>}
                      {napacna === vrstica && <p className="text-sm text-rose-300">{t('kosarica.napacnaVrstica')}</p>}
                    </div>
                    {kos !== null && <p className="shrink-0 font-bold tabular-nums">{cena(kos * p.kolicina)}</p>}
                  </div>
                  {!r ? <p className="text-sm text-rose-300">{t('kosarica.niVec')}</p>
                    : r.na_voljo === 'ne' ? <p className="text-sm text-rose-300">{t('kosarica.razprodano')}</p>
                    : r.na_voljo === 'malo' && (premalo && p.kolicina > 1
                      ? <p className="text-sm text-amber-200">{t('kosarica.zmanjsaj')}</p>
                      : <ZnackaVoljo v="malo" />)}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-lg border border-white/15 bg-white/5 text-sm" role="group" aria-label={t('izdelek.kolicina')}>
                      <button type="button" aria-label={t('izdelek.manj')} disabled={!r || p.kolicina <= 1} onClick={() => shrani(nastavi(k, vrstica, p.kolicina - 1))} className="px-2.5 py-1 font-bold disabled:opacity-30">−</button>
                      <span className="w-7 text-center tabular-nums">{p.kolicina}</span>
                      <button type="button" aria-label={t('izdelek.vec')} disabled={!r || p.kolicina >= najvec} onClick={() => shrani(nastavi(k, vrstica, p.kolicina + 1, najvec))} className="px-2.5 py-1 font-bold disabled:opacity-30">+</button>
                    </div>
                    <button type="button" onClick={() => shrani(odstrani(k, vrstica))} className="text-sm text-slate-400 hover:text-rose-300">
                      {t('kosarica.odstrani')}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="kartica h-fit space-y-4 p-5 lg:sticky lg:top-24">
          {digitalno ? <p className="text-sm text-slate-400">{t('kosarica.digitalno')}</p> : (
            <label className="block space-y-1 text-sm text-slate-400">
              <span>{t('kosarica.drzava')}</span>
              <select value={k.drzava} onChange={(e) => shrani({ ...k, drzava: e.target.value })} className="polje w-full">
                {drzave.map(([d, ime]) => <option key={d} value={d}>{ime}</option>)}
              </select>
            </label>
          )}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">{t('kosarica.vmesna')}</dt>
              <dd className="font-bold tabular-nums">{cena(vmesna)}</dd>
            </div>
            {!digitalno && (
              <div className="flex justify-between">
                <dt className="text-slate-400">{t('kosarica.postnina')}</dt>
                <dd className="tabular-nums">{t('kosarica.postninaOd', { cena: cena(postnina(k.drzava, pismo)) })}</dd>
              </div>
            )}
          </dl>
          {!digitalno && <p className="text-xs leading-relaxed text-slate-500">{t('kosarica.postninaOpis')}</p>}
          {zBonom && <p className="text-xs leading-relaxed text-slate-500">{t('kosarica.bon')}</p>}
          <p className="text-xs leading-relaxed text-slate-500">{t('kosarica.koda')}</p>
          <p className="text-xs leading-relaxed text-slate-500">{t('kosarica.ddv')}</p>
          {personalizirano && (
            <label className="flex items-start gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={soglasje} onChange={(e) => setSoglasje(e.target.checked)} className="mt-1" required />
              <span>{t('kosarica.potrdiOdstop')}</span>
            </label>
          )}
          <button type="button" disabled={poteka || neveljavna || (personalizirano && !soglasje)} onClick={() => void placaj()} className="gumb-glavni w-full py-3 text-lg">
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
