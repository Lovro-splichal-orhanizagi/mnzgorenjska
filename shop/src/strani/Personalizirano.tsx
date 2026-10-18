// /personalised: vitrina motivov. Vsak motiv pokaže svoje izmišljene primere na
// mockupu (menjajo se sami, razen ob prefers-reduced-motion) in vodi na nosilec
// z izbranim motivom (/p/majica-po-meri?motiv=retro-dres).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type MotivKataloga, type PrimerMotiva } from '../baza'
import { cena, po, t } from '../besede'
import { conaZa, Mockup } from '../mockup'
import { useNaslov } from '../Okvir'
import { Nalaganje } from '../seja'
import { svgCone } from './Konfigurator'

/** Motiv brez aktivnega nosilca (vsi izdelki neaktivni) se ne pokaže. */
export const vProdaji = (motivi: MotivKataloga[]): MotivKataloga[] => motivi.filter((m) => m.izdelki.some((i) => i.cone.length > 0))

/** Aktivni motivi z vsaj enim aktivnim nosilcem; null med nalaganjem. */
export function useMotivi(): { motivi: MotivKataloga[] | null; napaka: boolean } {
  const [motivi, setMotivi] = useState<MotivKataloga[] | null>(null)
  const [napaka, setNapaka] = useState(false)
  useEffect(() => {
    void supabase.rpc('trgovina_motivi').then(({ data, error }) => {
      setNapaka(Boolean(error))
      setMotivi(error ? [] : vProdaji((data as unknown as MotivKataloga[] | null) ?? []))
    })
  }, [])
  return { motivi, napaka }
}

/** Primer motiva na svojem nosilcu (ali prvem aktivnem, če njegovega ni). */
export function PrimerNaMockupu({ m, p, povecava = 1, className = '', alt }: { m: MotivKataloga; p: PrimerMotiva; povecava?: number; className?: string; alt: string }) {
  const iz = m.izdelki.find((x) => x.slug === p.izdelek) ?? m.izdelki[0]!
  const cona = conaZa(iz.cone, m.cona, p.barva)
  if (!cona) return null
  const barve = (m.sheme.find((s) => s.kljuc === p.shema) ?? m.sheme[0]!).barve
  return <Mockup cona={cona} svg={svgCone(m.slug, p.polja, barve, m.cona)} barva={cona.barva ?? p.barva} povecava={povecava} className={className} alt={alt} />
}

const mirno = (): boolean => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function KarticaMotiva({ m, zamik }: { m: MotivKataloga; zamik: number }) {
  const ime = po(m.ime_sl, m.ime_en)
  const [n, setN] = useState(0)
  const [ustavljeno, setUstavljeno] = useState(false)
  const primeri = m.primeri.slice(0, 4)
  useEffect(() => {
    if (ustavljeno || primeri.length < 2 || mirno()) return
    let iv: ReturnType<typeof setInterval> | undefined
    const zacetek = setTimeout(() => { iv = setInterval(() => setN((x) => (x + 1) % primeri.length), 3600) }, zamik)
    return () => { clearTimeout(zacetek); clearInterval(iv) }
  }, [ustavljeno, primeri.length, zamik])
  const glavni = m.izdelki[0]!
  return (
    <article className="kartica group flex flex-col overflow-hidden" onMouseEnter={() => setUstavljeno(true)} onMouseLeave={() => setUstavljeno(false)}>
      <Link to={`/p/${glavni.slug}?motiv=${m.slug}`} className="relative block aspect-square overflow-hidden" aria-label={`${t('osebno.cta')}: ${ime}`}>
        {primeri.map((p, i) => (
          <div key={i} aria-hidden={i !== n} className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${i === n ? 'opacity-100' : 'opacity-0'}`}>
            <PrimerNaMockupu m={m} p={p} povecava={1.3} alt={`${ime} · ${t('osebno.primer', { n: i + 1 })}`}
              className="transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
          </div>
        ))}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-black text-slate-100">{ime}</h2>
          {primeri.length > 1 && (
            <div className="flex shrink-0 gap-1.5 pt-2" role="group" aria-label={ime}>
              {primeri.map((_, i) => (
                <button key={i} type="button" aria-label={t('osebno.primer', { n: i + 1 })} aria-pressed={i === n} onClick={() => { setN(i); setUstavljeno(true) }}
                  className={`h-2.5 rounded-full transition-all ${i === n ? 'w-6 bg-gnl-400' : 'w-2.5 bg-white/25 hover:bg-white/50'}`} />
              ))}
            </div>
          )}
        </div>
        <p className="line-clamp-3 text-sm leading-relaxed text-slate-400">{po(m.opis_sl, m.opis_en)}</p>
        <div className="mt-auto space-y-3 pt-1">
          <Link to={`/p/${glavni.slug}?motiv=${m.slug}`} className="gumb-glavni block text-center">{t('osebno.cta')} →</Link>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {m.izdelki.map((x) => (
              <Link key={x.slug} to={`/p/${x.slug}?motiv=${m.slug}`} className="text-slate-400 underline-offset-4 hover:text-gnl-200 hover:underline">
                {t('osebno.na', { izdelek: po(x.ime_sl, x.ime_en), cena: cena(x.cena_od + x.doplacilo) })}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

export function MrezaMotivov({ motivi }: { motivi: MotivKataloga[] }) {
  return (
    <div id="motivi" className="grid scroll-mt-20 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {motivi.map((m, i) => <KarticaMotiva key={m.slug} m={m} zamik={i * 600} />)}
    </div>
  )
}

/** Trije primeri v pahljači (naslovnica vitrine in pas v katalogu). */
export function Pahljaca({ motivi, majhna = false }: { motivi: MotivKataloga[]; majhna?: boolean }) {
  const izbor = motivi.flatMap((m) => m.primeri.slice(0, 1).map((p) => ({ m, p }))).slice(0, 3)
  const polozaj = ['-rotate-[8deg] -translate-x-[58%] translate-y-4', 'z-10 scale-105', 'rotate-[8deg] translate-x-[58%] translate-y-4']
  return (
    <div className={`relative mx-auto grid place-items-center ${majhna ? 'h-48 w-full max-w-sm' : 'aspect-[5/4] w-full max-w-xl'}`} aria-hidden="true">
      {izbor.map(({ m, p }, i) => (
        <div key={m.slug} className={`absolute ${majhna ? 'w-[34%]' : 'w-[42%]'} ${polozaj[izbor.length === 1 ? 1 : i]} overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10`}>
          <PrimerNaMockupu m={m} p={p} povecava={1.25} alt="" />
        </div>
      ))}
    </div>
  )
}

export function Personalizirano() {
  const { motivi, napaka } = useMotivi()
  useNaslov(t('osebno.nadnaslov'), t('osebno.uvod'))
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <p className="znacka bg-gnl-400/15 text-gnl-300 ring-1 ring-gnl-400/30">{t('osebno.nadnaslov')}</p>
          <h1 className="text-4xl font-black leading-[1.05] naslov sm:text-6xl">{t('osebno.naslov')}</h1>
          <p className="max-w-xl text-slate-400 sm:text-lg">{t('osebno.uvod')}</p>
          <ul className="flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
            {(['osebno.prednost1', 'osebno.prednost2', 'osebno.prednost3'] as const).map((k) => (
              <li key={k} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">✓ {t(k)}</li>
            ))}
          </ul>
          {motivi && motivi.length > 0 && (
            <a href="#motivi" className="gumb-glavni inline-block px-6 py-3">{t('osebno.cta')} ↓</a>
          )}
        </div>
        <div className="order-first min-h-[14rem] md:order-none">{motivi && motivi.length > 0 && <Pahljaca motivi={motivi} />}</div>
      </section>
      <div aria-live="polite">{napaka && <p className="opozorilo">{t('napaka.nalaganje')}</p>}</div>
      {motivi === null ? <Nalaganje /> : motivi.length === 0 ? (
        !napaka && <p className="kartica p-6 text-center text-slate-400">{t('osebno.prazno')}</p>
      ) : (
        <MrezaMotivov motivi={motivi} />
      )}
    </div>
  )
}
