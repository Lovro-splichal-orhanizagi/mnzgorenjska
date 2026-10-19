import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import grb from '../../../public/logo/slff-grb.png'
import { supabase, type IzdelekKataloga, type MotivKataloga, type Voljo } from '../baza'
import { cena, po, t } from '../besede'
import { useNaslov } from '../Okvir'
import { Nalaganje } from '../seja'
import { Pahljaca, PrimerNaMockupu, primeriMotiva, useMotivi } from './Personalizirano'

/** Slika izdelka ali grb SLFF na temni podlagi, dokler slike ni. */
export function Slika({ src, alt, majhna = false }: { src?: string; alt: string; majhna?: boolean }) {
  return (
    <div className="slika-izdelka">
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <img src={grb} alt="" className={`${majhna ? 'w-1/2' : 'w-2/5'} opacity-90 drop-shadow-2xl`} />
        </div>
      )}
    </div>
  )
}

export function ZnackaVoljo({ v }: { v: Voljo }) {
  if (v === 'da') return null
  return v === 'malo'
    ? <span className="znacka bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30">{t('voljo.malo')}</span>
    : <span className="znacka bg-slate-400/15 text-slate-300 ring-1 ring-slate-400/30">{t('voljo.ne')}</span>
}

/** Nosilec motivov brez kataloške slike: prvi primer prvega motiva na njem, živ mockup. */
function MotivNaNosilcu({ slug, motivi, alt }: { slug: string; motivi: MotivKataloga[] | null; alt: string }) {
  const m = motivi?.find((x) => x.izdelki.some((i) => i.slug === slug))
  const p = m && (primeriMotiva(m, slug).find((x) => x.izdelek === slug) ?? primeriMotiva(m, slug)[0])
  if (!m || !p) return null
  return (
    <div className="slika-izdelka overflow-hidden">
      <PrimerNaMockupu m={m} p={{ ...p, izdelek: slug }} povecava={1.15} alt={alt} />
    </div>
  )
}

export function KarticaIzdelka({ i, motivi = null }: { i: IzdelekKataloga; motivi?: MotivKataloga[] | null }) {
  const ime = po(i.ime_sl, i.ime_en)
  const mockup = !i.slike[0] && motivi?.some((m) => m.izdelki.some((x) => x.slug === i.slug)) && <MotivNaNosilcu slug={i.slug} motivi={motivi} alt={ime} />
  return (
    <Link to={`/p/${i.slug}`} className="group kartica block p-3 transition hover:-translate-y-0.5 hover:border-gnl-400/40 hover:bg-white/[0.06]">
      <div className="relative">
        <div className={`transition duration-300 group-hover:scale-[1.02] ${i.na_voljo === 'ne' ? 'opacity-60' : ''}`}>
          {mockup || <Slika src={i.slike[0]} alt={ime} />}
        </div>
        <div className="absolute left-2 top-2"><ZnackaVoljo v={i.na_voljo} /></div>
      </div>
      <div className="space-y-1 px-1 pb-1 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t(`kategorija.${i.kategorija}`)}</p>
        <h2 className="text-lg font-bold leading-tight text-slate-100">{ime}</h2>
        <p className="text-base font-black text-gnl-300">
          {i.cena_z_motivom != null ? t('katalog.od', { cena: cena(i.cena_z_motivom) })
            : i.cena_do > i.cena_od ? t('katalog.od', { cena: cena(i.cena_od) }) : cena(i.cena_od)}
        </p>
      </div>
    </Link>
  )
}

export function MrezaIzdelkov({ izdelki }: { izdelki: IzdelekKataloga[] }) {
  const { motivi } = useMotivi()
  if (izdelki.length === 0) return <p className="kartica p-6 text-center text-slate-400">{t('katalog.prazno')}</p>
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
      {izdelki.map((i) => <KarticaIzdelka key={i.slug} i={i} motivi={motivi} />)}
    </div>
  )
}

/** Pas "Naredi svojega" (le, ko so motivi v prodaji). */
function PasPoMeri() {
  const { motivi } = useMotivi()
  if (!motivi?.length) return null
  return (
    <Link to="/personalised" className="group relative block overflow-hidden rounded-3xl border border-gnl-400/25 bg-gradient-to-br from-gnl-900/80 via-slate-900 to-slate-950 p-6 transition hover:border-gnl-400/50 sm:p-8">
      <img src="/nosilci/hero-gostilna-1000.webp" alt="" loading="lazy" decoding="async" width={1000} height={667}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50 transition duration-700 group-hover:scale-[1.02] motion-reduce:transition-none" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" />
      <div className="relative grid items-center gap-6 md:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="space-y-3">
          <p className="znacka bg-gnl-400/15 text-gnl-300 ring-1 ring-gnl-400/30">{t('osebno.nadnaslov')}</p>
          <h2 className="text-3xl font-black naslov sm:text-4xl">{t('katalog.pasNaslov')}</h2>
          <p className="max-w-xl text-slate-300">{t('katalog.pasOpis')}</p>
          <span className="gumb-glavni inline-block">{t('katalog.pasGumb')} →</span>
        </div>
        <div className="transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"><Pahljaca motivi={motivi} majhna /></div>
      </div>
    </Link>
  )
}

export function Katalog() {
  const [izdelki, setIzdelki] = useState<IzdelekKataloga[] | null>(null)
  const [napaka, setNapaka] = useState(false)
  useNaslov(t('katalog.naslov'))

  useEffect(() => {
    void supabase.rpc('trgovina_katalog').then(({ data, error }) => {
      setNapaka(Boolean(error))
      setIzdelki(error ? [] : ((data as unknown as IzdelekKataloga[] | null) ?? []))
    })
  }, [])

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-black naslov sm:text-5xl">{t('katalog.naslov')}</h1>
        <p className="max-w-2xl text-slate-400 sm:text-lg">{t('katalog.uvod')}</p>
        <ul className="flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
          {(['katalog.prednost1', 'katalog.prednost2', 'katalog.prednost3'] as const).map((k) => (
            <li key={k} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">✓ {t(k)}</li>
          ))}
        </ul>
      </section>
      <PasPoMeri />
      <div aria-live="polite">{napaka && <p className="opozorilo">{t('napaka.nalaganje')}</p>}</div>
      {izdelki === null ? <Nalaganje /> : !napaka && <MrezaIzdelkov izdelki={izdelki} />}
    </div>
  )
}
