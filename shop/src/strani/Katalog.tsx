import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import grb from '../../../public/logo/slff-grb.png'
import { supabase, type IzdelekKataloga, type Voljo } from '../baza'
import { cena, po, t } from '../besede'
import { Nalaganje } from '../seja'

/** Slika izdelka ali grb SLFF na temni podlagi, dokler slike ni. */
export function Slika({ src, alt, majhna = false }: { src?: string; alt: string; majhna?: boolean }) {
  return (
    <div className="slika-izdelka">
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <img src={grb} alt={alt} className={`${majhna ? 'w-1/2' : 'w-2/5'} opacity-90 drop-shadow-2xl`} />
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

export function KarticaIzdelka({ i }: { i: IzdelekKataloga }) {
  const ime = po(i.ime_sl, i.ime_en)
  return (
    <Link to={`/p/${i.slug}`} className="group kartica block p-3 transition hover:-translate-y-0.5 hover:border-gnl-400/40 hover:bg-white/[0.06]">
      <div className="relative">
        <div className={`transition duration-300 group-hover:scale-[1.02] ${i.na_voljo === 'ne' ? 'opacity-60' : ''}`}>
          <Slika src={i.slike[0]} alt={ime} />
        </div>
        <div className="absolute left-2 top-2"><ZnackaVoljo v={i.na_voljo} /></div>
      </div>
      <div className="space-y-1 px-1 pb-1 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t(`kategorija.${i.kategorija}`)}</p>
        <h2 className="text-lg font-bold leading-tight text-slate-100">{ime}</h2>
        <p className="text-base font-black text-gnl-300">{t('katalog.od', { cena: cena(i.cena_od) })}</p>
      </div>
    </Link>
  )
}

export function MrezaIzdelkov({ izdelki }: { izdelki: IzdelekKataloga[] }) {
  if (izdelki.length === 0) return <p className="kartica p-6 text-center text-slate-400">{t('katalog.prazno')}</p>
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
      {izdelki.map((i) => <KarticaIzdelka key={i.slug} i={i} />)}
    </div>
  )
}

export function Katalog() {
  const [izdelki, setIzdelki] = useState<IzdelekKataloga[] | null>(null)
  const [napaka, setNapaka] = useState(false)

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
      {napaka && <p className="opozorilo">{t('napaka.nalaganje')}</p>}
      {izdelki === null ? <Nalaganje /> : !napaka && <MrezaIzdelkov izdelki={izdelki} />}
    </div>
  )
}
