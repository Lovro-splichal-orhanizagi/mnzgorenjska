// Nosilec z motivi (majica, pulover po meri): izbira motiva, polja, barvna
// shema, barva in velikost, živ mockup spredaj/zadaj in primeri za navdih.
// Pravila polj in ceno določi baza (trgovina.personaliziraj); tu jih le zrcalimo.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, type Cona, type Izdelek, type MotivIzdelka, type PoljeMotiva, type PrimerMotiva, type Prvak } from '../baza'
import { cena, jezik, po, t } from '../besede'
import { dodaj, kljuc, NAJVEC, shrani, useKosarica } from '../kosarica'
import { barvaRazlicice, conaZa, Mockup, velikostRazlicice } from '../mockup'
import { useNaslov } from '../Okvir'
import { napakaPolja, normaliziraj, type Personalizacija, type VrednostVnosa } from '../personalizacija'
import { coneMotiva, narisiMotiv, praznaCona, type VrednostiPolj } from '../risba'
import { Nalaganje, useSeja } from '../seja'
import { NakupnaVrstica } from './Izdelek'

/** Barva vzorčka za barvo različice (ime iz baze). */
const VZOREC: Record<string, string> = { Črna: '#141414', Bela: '#f4f4f1', Siva: '#8a8f98', Modra: '#1f3a8a', Zelena: '#14603f', Rdeča: '#b91c1c' }

// Mladinske lige ne štejejo (kot je_mladinski_slug v bazi).
const mladinska = (slug: string): boolean => /(^|-)(u19|mladinci)($|-)/.test(slug) || /^sml[0-9]/.test(slug)

/** Začetne vrednosti polj (privzeto) kot besedilo vnosnih polj. */
const zacetne = (m: MotivIzdelka): Record<string, string> =>
  Object.fromEntries(m.polja.map((p) => [p.kljuc, p.privzeto === undefined || p.vrsta === 'ekipa' || p.vrsta === 'prvak' ? '' : String(p.privzeto)]))

/** Izmišljena vrednost za predogled ekipe ali prvaka, dokler kupec ne izbere svoje. */
const primerPolja = (m: MotivIzdelka, k: string): string | number | undefined => m.primeri.find((p) => p.polja[k] !== undefined)?.polja[k]

/** Izris motiva v cono nosilca ali null (cona motiva nima ali je prazna). */
export function svgCone(slug: string, polja: VrednostiPolj, barve: string[], cona: string): string | null {
  return coneMotiva(slug).includes(cona) && !praznaCona(slug, polja, cona) ? narisiMotiv(slug, polja, barve, cona) : null
}

/**
 * "Začni s tem": polja primera v vnosna polja. Ekipe in prvaka ne prepišemo
 * (primer ima le izmišljeno besedilo, kupec izbere svojo), prazna polja primera izpraznijo.
 */
export const izPrimera = (m: MotivIzdelka, vrednosti: Record<string, string>, p: PrimerMotiva): Record<string, string> => ({
  ...vrednosti,
  ...Object.fromEntries(m.polja.filter((x) => x.vrsta !== 'ekipa' && x.vrsta !== 'prvak').map((x) => [x.kljuc, p.polja[x.kljuc] === undefined ? '' : String(p.polja[x.kljuc])])),
})

/** Vrednosti primera za predogled: številke ostanejo številke. */
const primerZaPredogled = (p: PrimerMotiva): VrednostiPolj => p.polja

/** Naslov koraka s številko. */
function Korak({ n, naslov, children, dodatno }: { n: number; naslov: string; children: ReactNode; dodatno?: ReactNode }) {
  return (
    <section className="space-y-3" aria-labelledby={`korak-${n}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`korak-${n}`} className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-slate-300">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gnl-400/15 text-xs font-black text-gnl-300 ring-1 ring-gnl-400/40">{n}</span>
          {naslov}
        </h2>
        {dodatno}
      </div>
      {children}
    </section>
  )
}

export function Konfigurator({ i }: { i: Izdelek }) {
  const motivi = i.motivi ?? []
  const cone = i.cone ?? []
  const kosarica = useKosarica()
  const { seja } = useSeja()
  const uid = seja?.user.id ?? null
  const [iskanje, setIskanje] = useSearchParams()
  const ime = po(i.ime_sl, i.ime_en)
  useNaslov(ime, po(i.opis_sl, i.opis_en).slice(0, 160) || undefined)

  const zacetni = motivi.find((m) => m.slug === iskanje.get('motiv')) ?? motivi[0]!
  const [slug, setSlug] = useState(zacetni.slug)
  const m = motivi.find((x) => x.slug === slug) ?? zacetni
  const [vrednosti, setVrednosti] = useState<Record<string, string>>(() => zacetne(zacetni))
  const [shema, setShema] = useState(zacetni.sheme[0]!.kljuc)
  const [dotaknjeno, setDotaknjeno] = useState(false)

  const prodajne = i.razlicice.filter((r) => r.na_voljo !== 'ne')
  const barve = [...new Set(i.razlicice.map((r) => barvaRazlicice(r.oznaka_sl)))]
  const [barva, setBarva] = useState(barvaRazlicice((prodajne[0] ?? i.razlicice[0]!).oznaka_sl))
  const [velikost, setVelikost] = useState<string | null>(null)
  const r = i.razlicice.find((x) => barvaRazlicice(x.oznaka_sl) === barva && velikostRazlicice(x.oznaka_sl) === velikost) ?? null

  const pogledi = (['hrbet', 'prsi'] as const).filter((k) => cone.some((c) => c.kljuc === k))
  const [pogled, setPogled] = useState<string>(zacetni.cona)
  const [kolicina, setKolicina] = useState(1)
  const [dodano, setDodano] = useState<number | null>(null)
  const predogled = useRef<HTMLDivElement>(null)
  // Na telefonu je predogled med tipkanjem izven zaslona: takrat plava v kotu.
  const [plava, setPlava] = useState(false)
  useEffect(() => {
    const el = predogled.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setPlava(!e!.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Ekipe in prvaki, le če jih motiv potrebuje.
  const zEkipo = m.polja.some((p) => p.vrsta === 'ekipa')
  const zPrvakom = m.polja.some((p) => p.vrsta === 'prvak')
  const [ekipe, setEkipe] = useState<{ id: number; name: string }[] | null>(null)
  const [prvaki, setPrvaki] = useState<Prvak[] | null>(null)
  useEffect(() => {
    if (!uid || !zEkipo || ekipe) return
    void (async () => {
      const { data } = await supabase.from('fantasy_teams').select('id, name, competition_id').eq('owner_id', uid).eq('hisna', false).order('id')
      const ids = [...new Set((data ?? []).map((e) => e.competition_id))]
      const { data: lige } = ids.length ? await supabase.from('competitions').select('id, slug').in('id', ids) : { data: [] }
      const mladinske = new Set((lige ?? []).filter((l) => mladinska(l.slug)).map((l) => l.id))
      setEkipe((data ?? []).filter((e) => !mladinske.has(e.competition_id)).map(({ id, name }) => ({ id, name })))
    })()
  }, [uid, zEkipo, ekipe])
  useEffect(() => {
    if (!uid || !zPrvakom || prvaki) return
    void supabase.rpc('trgovina_moji_prvaki').then(({ data }) => setPrvaki((data as unknown as Prvak[] | null) ?? []))
  }, [uid, zPrvakom, prvaki])

  // Preloži fotografije, da je preklop barve in pogleda takojšen.
  useEffect(() => {
    cone.forEach((c) => { new Image().src = c.slika })
  }, [cone])

  function izberiMotiv(nov: MotivIzdelka) {
    setSlug(nov.slug)
    setVrednosti(zacetne(nov))
    setShema(nov.sheme[0]!.kljuc)
    setPogled(nov.cona)
    setDotaknjeno(false)
    setDodano(null)
    const q = new URLSearchParams(iskanje)
    q.set('motiv', nov.slug)
    setIskanje(q, { replace: true })
  }

  function zacniS(p: PrimerMotiva) {
    setVrednosti((v) => izPrimera(m, v, p))
    if (m.sheme.some((s) => s.kljuc === p.shema)) setShema(p.shema)
    if (barve.includes(p.barva)) setBarva(p.barva)
    setPogled(m.cona)
    setDodano(null)
    predogled.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }

  const barveSheme = (m.sheme.find((s) => s.kljuc === shema) ?? m.sheme[0]!).barve

  // Vrednosti: za predogled (natisnjeno besedilo), za bazo (vnos) in napake.
  const izbranaEkipa = (p: PoljeMotiva) => ekipe?.find((e) => String(e.id) === vrednosti[p.kljuc])
  const izbranPrvak = (p: PoljeMotiva) => (vrednosti[p.kljuc] ? prvaki?.[Number(vrednosti[p.kljuc])] : undefined)
  const besediloPrvaka = (x: Prvak) => (jezik === 'en' ? x.besedilo_en : x.besedilo_sl)
  const napake = Object.fromEntries(m.polja.map((p) => [p.kljuc, napakaPolja(p.vrsta, vrednosti[p.kljuc] ?? '', p.max ?? (p.vrsta === 'ekipa' ? 24 : 12))]))
  const natisnjeno: VrednostiPolj = {}
  const zaPredogled: VrednostiPolj = {}
  const polja: Record<string, VrednostVnosa> = {}
  const manjka: string[] = []
  for (const p of m.polja) {
    const surovo = normaliziraj(vrednosti[p.kljuc] ?? '')
    let tisk: string | number | undefined
    if (p.vrsta === 'ekipa') {
      const e = izbranaEkipa(p)
      if (e) [polja[p.kljuc], tisk] = [e.id, e.name]
    } else if (p.vrsta === 'prvak') {
      const x = izbranPrvak(p)
      if (x) [polja[p.kljuc], tisk] = [{ mini_liga_id: x.mini_liga_id, sezona: x.sezona }, besediloPrvaka(x)]
    } else if (surovo && !napake[p.kljuc]) {
      const v = p.vrsta === 'stevilka' || p.vrsta === 'leto' ? Number(surovo) : surovo
      ;[polja[p.kljuc], tisk] = [v, v]
    }
    if (tisk !== undefined) natisnjeno[p.kljuc] = tisk
    else if (p.obvezno) manjka.push(p.kljuc)
    zaPredogled[p.kljuc] = tisk ?? (p.vrsta === 'ekipa' || p.vrsta === 'prvak' ? primerPolja(m, p.kljuc) : surovo)
  }
  const veljavno = manjka.length === 0 && Object.values(napake).every((n) => n === null)
  const vnos: Personalizacija | null = veljavno ? { motiv: m.slug, polja, shema } : null

  const svgji = useMemo(
    () => Object.fromEntries(pogledi.map((k) => [k, svgCone(m.slug, zaPredogled, barveSheme, k)])),
    // zaPredogled je nov objekt ob vsakem izrisu; ključ je njegova vsebina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.slug, JSON.stringify(zaPredogled), barveSheme.join(), pogledi.join()],
  )

  const osnova = r?.cena ?? Math.min(...i.razlicice.filter((x) => barvaRazlicice(x.oznaka_sl) === barva).map((x) => x.cena))
  const najvec = NAJVEC

  function vKosarico() {
    setDotaknjeno(true)
    if (!r || !vnos) return
    const k0 = kljuc({ razlicica_id: r.id, personalizacija: vnos })
    const imam = (k: typeof kosarica) => k.postavke.find((p) => kljuc(p) === k0)?.kolicina ?? 0
    const opis = [po(m.ime_sl, m.ime_en), ...m.polja.map((p) => natisnjeno[p.kljuc]).filter((v) => v !== undefined && v !== '')].join(' · ').slice(0, 120)
    const prikaz = Object.fromEntries(Object.entries(natisnjeno).filter(([, v]) => v !== undefined && v !== null)) as Record<string, string | number>
    const nova = dodaj(kosarica, r.id, kolicina, i.slug, vnos, opis, najvec, prikaz)
    shrani(nova)
    setDodano(imam(nova) - imam(kosarica))
  }

  const conaPogleda = (k: string): Cona => conaZa(cone, k, barva) ?? cone[0]!
  const glavna = conaPogleda(m.cona)
  const vidna = conaPogleda(pogled)
  const imeMotiva = po(m.ime_sl, m.ime_en)
  const alt = t('motiv.alt', { motiv: imeMotiva, izdelek: ime })
  const obrnjeno = pogledi.length > 1 && pogled !== pogledi[0]

  return (
    <div className="space-y-12 pb-24 md:pb-0">
      <div className="space-y-6">
        <Link to="/personalised" className="povezava text-sm">← {t('osebno.vsi')}</Link>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-10">
          {/* Predogled: na namizju ostane na mestu, ko se obrazec premika. */}
          <div ref={predogled} className="min-w-0 scroll-mt-20 md:sticky md:top-20 md:self-start">
            <div className="kartica overflow-hidden p-2 sm:p-3">
              <div className="relative [perspective:2000px]">
                <div className={`relative transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none ${obrnjeno ? '[transform:rotateY(180deg)]' : ''}`}>
                  {pogledi.map((k, n) => (
                    <div key={k} aria-hidden={(n === 1) !== obrnjeno} className={`[backface-visibility:hidden] ${n === 1 ? 'absolute inset-0 [transform:rotateY(180deg)]' : ''}`}>
                      <Mockup cona={conaPogleda(k)} svg={svgji[k] ?? null} barva={barva} alt={`${alt} · ${t(`motiv.cona.${k}`)}`} className="rounded-xl" />
                    </div>
                  ))}
                </div>
                <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-gnl-200 ring-1 ring-white/10 backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gnl-400 motion-reduce:animate-none" aria-hidden="true" />
                  {t('motiv.vZivo')}
                </span>
                {pogledi.length > 1 && (
                  <div role="group" aria-label={t('motiv.pogled')} className="absolute bottom-3 left-1/2 flex -translate-x-1/2 rounded-full bg-slate-950/75 p-1 ring-1 ring-white/10 backdrop-blur">
                    {pogledi.map((k) => (
                      <button key={k} type="button" aria-pressed={pogled === k} onClick={() => setPogled(k)}
                        className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${pogled === k ? 'bg-gnl-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}>
                        {t(`motiv.cona.${k}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">
              {t('motiv.tisk', { sirina: vidna.sirina_mm / 10, visina: vidna.visina_mm / 10 })}{i.postopek ? ` · ${i.postopek.toUpperCase()}` : ''}
            </p>
          </div>

          <div className="min-w-0 space-y-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t(`kategorija.${i.kategorija}`)}</p>
              <h1 className="text-3xl font-black naslov sm:text-4xl">{ime}</h1>
              <p className="text-3xl font-black tabular-nums text-gnl-300">{cena(osnova + m.doplacilo)}</p>
              <p className="text-xs text-slate-500">
                {m.doplacilo > 0 && `${t('motiv.cena', { osnova: cena(osnova), motiv: cena(m.doplacilo) })} · `}{t('izdelek.zDdv')}
              </p>
            </div>

            <Korak n={1} naslov={t('motiv.korak.motiv')}>
              <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0" role="radiogroup" aria-label={t('motiv.korak.motiv')}>
                {motivi.map((x) => {
                  const pr = x.primeri[0]
                  const barveX = (x.sheme.find((s) => s.kljuc === pr?.shema) ?? x.sheme[0]!).barve
                  const c = conaZa(cone, x.cona, barva) ?? glavna
                  const izbran = x.slug === m.slug
                  return (
                    <button key={x.slug} type="button" role="radio" aria-checked={izbran} onClick={() => izberiMotiv(x)}
                      className={`group w-32 shrink-0 snap-start overflow-hidden rounded-xl border text-left transition sm:w-auto ${
                        izbran ? 'border-gnl-400 bg-gnl-400/10 ring-2 ring-gnl-400/40' : 'border-white/10 bg-white/[0.03] hover:border-white/30'}`}>
                      <Mockup cona={c} svg={svgCone(x.slug, pr ? primerZaPredogled(pr) : {}, barveX, x.cona)} barva={barva} alt="" povecava={1.9}
                        className="transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
                      <span className={`block truncate px-2.5 py-2 text-sm font-bold ${izbran ? 'text-gnl-200' : 'text-slate-200'}`}>{po(x.ime_sl, x.ime_en)}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-sm leading-relaxed text-slate-400">{po(m.opis_sl, m.opis_en)}</p>
            </Korak>

            <Korak n={2} naslov={t('motiv.korak.polja')}>
              <div className="kartica space-y-4 p-4">
                {m.polja.map((p) => (
                  <PoljeVnosa key={`${m.slug}-${p.kljuc}`} p={p} vrednost={vrednosti[p.kljuc] ?? ''} napaka={napake[p.kljuc] ?? null}
                    manjka={dotaknjeno && manjka.includes(p.kljuc)} nastavi={(v) => { setVrednosti((o) => ({ ...o, [p.kljuc]: v })); setDodano(null) }}
                    uid={uid} ekipe={ekipe} prvaki={prvaki} slug={i.slug} besediloPrvaka={besediloPrvaka} />
                ))}
                <p className="text-xs text-slate-500">{t('pers.preverimo')}</p>
              </div>
            </Korak>

            <Korak n={3} naslov={t('motiv.korak.shema')} dodatno={<span className="text-sm text-slate-400">{po(m.sheme.find((s) => s.kljuc === shema)?.ime_sl ?? '', m.sheme.find((s) => s.kljuc === shema)?.ime_en ?? '')}</span>}>
              <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t('motiv.korak.shema')}>
                {m.sheme.map((s) => (
                  <button key={s.kljuc} type="button" role="radio" aria-checked={s.kljuc === shema} aria-label={po(s.ime_sl, s.ime_en)} title={po(s.ime_sl, s.ime_en)}
                    onClick={() => setShema(s.kljuc)}
                    className={`relative h-12 w-12 overflow-hidden rounded-full transition ${s.kljuc === shema ? 'ring-2 ring-gnl-400 ring-offset-2 ring-offset-slate-950' : 'ring-1 ring-white/20 hover:ring-white/50'}`}
                    style={{ background: `conic-gradient(${s.barve[0]} 0 50%, ${s.barve[1]} 50% 75%, ${s.barve[2] ?? s.barve[0]} 75% 100%)` }} />
                ))}
              </div>
            </Korak>

            <Korak n={4} naslov={t('motiv.korak.nosilec')}>
              <div className="space-y-4">
                {barve.length > 0 && (
                  <fieldset className="space-y-2">
                    <legend className="text-sm text-slate-400">{t('motiv.barva')}: <span className="font-semibold text-slate-200">{po(barva, barvaRazlicice(i.razlicice.find((x) => barvaRazlicice(x.oznaka_sl) === barva)?.oznaka_en ?? barva))}</span></legend>
                    <div className="flex gap-3">
                      {barve.map((b) => {
                        const en = barvaRazlicice(i.razlicice.find((x) => barvaRazlicice(x.oznaka_sl) === b)?.oznaka_en ?? b)
                        return (
                          <button key={b} type="button" aria-pressed={b === barva} aria-label={po(b, en)} title={po(b, en)} onClick={() => { setBarva(b); setDodano(null) }}
                            className={`h-10 w-10 rounded-full border border-white/25 transition ${b === barva ? 'ring-2 ring-gnl-400 ring-offset-2 ring-offset-slate-950' : 'hover:scale-105'}`}
                            style={{ background: VZOREC[b] ?? '#64748b' }} />
                        )
                      })}
                    </div>
                  </fieldset>
                )}
                <fieldset className="space-y-2">
                  <legend className="text-sm text-slate-400">{t('motiv.velikost')}</legend>
                  <div className="flex flex-wrap gap-2">
                    {i.razlicice.filter((x) => barvaRazlicice(x.oznaka_sl) === barva).map((x) => {
                      const v = velikostRazlicice(x.oznaka_sl)
                      return (
                        <button key={x.id} type="button" disabled={x.na_voljo === 'ne'} aria-pressed={v === velikost} onClick={() => { setVelikost(v); setDodano(null) }}
                          className={`min-w-12 rounded-xl border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                            v === velikost ? 'border-gnl-400 bg-gnl-400/15 text-gnl-200' : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30'}`}>
                          {v}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              </div>
            </Korak>

            <ul className="space-y-1.5 text-sm text-slate-400">
              <li>✓ {t('izdelek.poNarocilu')}</li>
              <li>✓ {t('izdelek.dostava')}</li>
              <li className="text-amber-200">! {t('izdelek.brezOdstopa')}</li>
            </ul>

            {dotaknjeno && !veljavno && <p className="opozorilo" role="alert">{t('motiv.manjka')}</p>}
            <NakupnaVrstica kolicina={kolicina} setKolicina={setKolicina} najvec={najvec} dodano={dodano}
              onemogoceno={!r || r.na_voljo === 'ne' || (dotaknjeno && !veljavno)} besedilo={r ? t('izdelek.dodaj') : t('motiv.izberiVelikost')} dodaj={vKosarico} />
          </div>
        </div>
      </div>

      <button type="button" onClick={() => predogled.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} aria-label={t('motiv.vZivo')}
        tabIndex={plava ? 0 : -1} aria-hidden={!plava}
        className={`fixed bottom-24 right-3 z-30 w-28 overflow-hidden rounded-2xl shadow-2xl shadow-black/70 ring-2 ring-gnl-400/60 transition duration-300 motion-reduce:transition-none md:hidden ${
          plava ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>
        <Mockup cona={vidna} svg={svgji[pogled] ?? null} barva={barva} povecava={1.5} alt="" />
      </button>

      {m.primeri.length > 0 && (
        <section className="space-y-4" aria-labelledby="primeri">
          <div className="space-y-1">
            <h2 id="primeri" className="text-2xl font-black naslov">{t('motiv.primeri')}</h2>
            <p className="text-sm text-slate-400">{t('motiv.primeriOpis')}</p>
          </div>
          <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {m.primeri.map((p, n) => {
              const b = barve.includes(p.barva) ? p.barva : barva
              const c = conaZa(cone, m.cona, b) ?? glavna
              const bs = (m.sheme.find((s) => s.kljuc === p.shema) ?? m.sheme[0]!).barve
              return (
                <li key={n} className="kartica w-64 shrink-0 snap-start overflow-hidden sm:w-auto">
                  <Mockup cona={c} svg={svgCone(m.slug, primerZaPredogled(p), bs, m.cona)} barva={b} povecava={1.35}
                    alt={`${imeMotiva} · ${t('osebno.primer', { n: n + 1 })}`} />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-200">
                      {m.polja.map((x) => p.polja[x.kljuc]).filter((v) => v !== undefined).slice(0, 2).join(' · ')}
                    </p>
                    <button type="button" onClick={() => zacniS(p)} className="gumb-tih shrink-0 px-3 py-1.5 text-sm">{t('motiv.zacni')}</button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

/** Eno polje motiva po vrsti: besedilo, številka, leto, izbira (gumbi), ekipa, prvak. */
function PoljeVnosa({ p, vrednost, napaka, manjka, nastavi, uid, ekipe, prvaki, slug, besediloPrvaka }: {
  p: PoljeMotiva
  vrednost: string
  napaka: ReturnType<typeof napakaPolja>
  manjka: boolean
  nastavi: (v: string) => void
  uid: string | null
  ekipe: { id: number; name: string }[] | null
  prvaki: Prvak[] | null
  slug: string
  besediloPrvaka: (x: Prvak) => string
}) {
  const id = `polje-${p.kljuc}`
  const letos = new Date().getFullYear()
  const max = p.max ?? (p.vrsta === 'ekipa' ? 24 : 12)
  const oznaka = (
    <span className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-slate-300">
      {po(p.oznaka_sl, p.oznaka_en)}
      {!p.obvezno && <span className="text-xs font-normal text-slate-500">{t('pers.neobvezno')}</span>}
    </span>
  )
  const namig = (besedilo: string, slabo = false) => (
    <span id={`${id}-namig`} className={`block text-xs ${slabo ? 'text-rose-300' : 'text-slate-500'}`}>{besedilo}</span>
  )
  const besediloNapake = napaka && t(napaka, { max, letos })
  const okvir = manjka ? 'border-rose-400/60' : ''
  const prijava = (
    <p className="text-sm text-slate-400">
      {t('pers.prijava')} <Link to={`/login?next=${encodeURIComponent(`/p/${slug}${typeof location === 'undefined' ? '' : location.search}`)}`} className="povezava">{t('nav.prijava')}</Link>
    </p>
  )

  if (p.vrsta === 'ekipa' || p.vrsta === 'prvak') {
    const ekipa = p.vrsta === 'ekipa'
    const seznam = ekipa ? ekipe : prvaki
    return (
      <div className="space-y-2">
        {oznaka}
        {!uid ? prijava : seznam === null ? <Nalaganje /> : seznam.length === 0
          ? <p className="text-sm text-slate-400">{ekipa ? t('motiv.niEkip') : t('pers.niPrvak')}</p>
          : (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={po(p.oznaka_sl, p.oznaka_en)}>
              {ekipa
                ? ekipe!.map((e) => (
                  <button key={e.id} type="button" role="radio" aria-checked={vrednost === String(e.id)} onClick={() => nastavi(String(e.id))}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${vrednost === String(e.id) ? 'border-gnl-400 bg-gnl-400/15 text-gnl-200' : `border-white/15 bg-white/5 text-slate-200 hover:border-white/30 ${okvir}`}`}>
                    {e.name}
                  </button>
                ))
                : prvaki!.map((x, n) => (
                  <button key={`${x.mini_liga_id}-${x.sezona}`} type="button" role="radio" aria-checked={vrednost === String(n)} onClick={() => nastavi(String(n))}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${vrednost === String(n) ? 'border-gnl-400 bg-gnl-400/15 text-gnl-200' : `border-white/15 bg-white/5 text-slate-200 hover:border-white/30 ${okvir}`}`}>
                    <span className="block font-semibold">{besediloPrvaka(x)}</span>
                    <span className="block text-xs text-slate-400">{x.ekipa}</span>
                  </button>
                ))}
            </div>
          )}
        {!vrednost && namig(ekipa ? t('motiv.ekipaPredogled') : t('motiv.prvakPredogled'))}
      </div>
    )
  }

  if (p.vrsta === 'izbira') {
    return (
      <div className="space-y-2">
        {oznaka}
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={po(p.oznaka_sl, p.oznaka_en)}>
          {(p.moznosti ?? []).map((x) => (
            <button key={x} type="button" role="radio" aria-checked={vrednost === x} onClick={() => nastavi(vrednost === x && !p.obvezno ? '' : x)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${vrednost === x ? 'border-gnl-400 bg-gnl-400/15 text-gnl-200' : `border-white/15 bg-white/5 text-slate-200 hover:border-white/30 ${okvir}`}`}>
              {x}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const stevilo = p.vrsta === 'stevilka' || p.vrsta === 'leto'
  return (
    <label className="block space-y-1" htmlFor={id}>
      {oznaka}
      <input id={id} value={vrednost} onChange={(e) => nastavi(e.target.value)} autoComplete="off" spellCheck={false}
        inputMode={stevilo ? 'numeric' : 'text'} maxLength={p.vrsta === 'stevilka' ? 2 : p.vrsta === 'leto' ? 4 : max + 8}
        aria-invalid={Boolean(napaka) || manjka} aria-required={p.obvezno} aria-describedby={`${id}-namig`}
        className={`polje w-full ${stevilo ? 'max-w-32 tabular-nums' : ''} ${napaka || manjka ? 'border-rose-400/60' : ''}`} />
      {besediloNapake ? namig(besediloNapake, true)
        : namig(p.vrsta === 'stevilka' ? t('pers.stevilkaNamig') : p.vrsta === 'leto' ? t('motiv.namig.leto', { letos }) : t('motiv.namig.besedilo', { max }), manjka)}
    </label>
  )
}
