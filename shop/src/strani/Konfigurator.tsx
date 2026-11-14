// Nosilec z motivi (majica, pulover, dres, kozarec, plakat, kapa …): izbira
// motiva, polja, barvna shema, različica (barva, velikost, format), živ mockup
// po conah in primeri za navdih. Pravila polj in ceno določi baza
// (trgovina.personaliziraj); tu jih le zrcalimo.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, type Cona, type Izdelek, type MoznostPolja, type MotivIzdelka, type PoljeMotiva, type Postava, type PrimerMotiva, type Prvak } from '../baza'
import { cena, jezik, pr, SL, t, type Kljuc } from '../besede'
import { dodaj, kljuc, NAJVEC, shrani, useKosarica } from '../kosarica'
import { barvaRazlicice, conaZa, Mockup, velikostRazlicice } from '../mockup'
import { dogodek } from '../analitika'
import { useNaslov } from '../Okvir'
import { letoNaprej, napakaPolja, normaliziraj, type Personalizacija, type VrednostVnosa } from '../personalizacija'
import { MOTIVI } from '../motivi'
import { barveIzPolj, coneMotiva, narisiMotiv, praznaCona, type VrednostiPolj } from '../risba'
import { Nalaganje, useSeja } from '../seja'
import { NakupnaVrstica } from './Izdelek'

/** Barva vzorčka za barvo različice (ime iz baze). */
const VZOREC: Record<string, string> = {
  Črna: '#141414', Bela: '#f4f4f1', Siva: '#8a8f98', Modra: '#1f3a8a', Zelena: '#14603f', Rdeča: '#b91c1c',
  'Bela-črna': 'linear-gradient(135deg, #f4f4f1 50%, #141414 50%)',
}

/** Vrstni red pogledov (con nosilca); neznane cone na koncu. */
const RED_CON = ['spredaj', 'hrbet', 'prsi']
const imeCone = (k: string): string => (`motiv.cona.${k}` in SL ? t(`motiv.cona.${k}` as Kljuc) : k)

/** Možnost izbire ali barve kot {kljuc, ime}: navaden niz je oboje. */
export const moznost = (x: string | MoznostPolja): MoznostPolja => (typeof x === 'string' ? { kljuc: x, ime_sl: x, ime_en: x } : x)

/** Kar kupec vidi za vrednost polja: ime možnosti, ime ekipe iz posnetka postave, sicer besedilo. */
export function prikazVrednosti(p: PoljeMotiva, v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return String((v as { ekipa?: unknown }).ekipa ?? '')
  const o = (p.moznosti ?? []).map(moznost).find((x) => x.kljuc === String(v))
  return o ? pr(o, 'ime') : String(v)
}

/** Polja, ki jih kupec ne vpiše, ampak izbere iz svojega računa. */
const izRacuna = (v: PoljeMotiva['vrsta']): boolean => v === 'ekipa' || v === 'prvak' || v === 'postava'

/** Barve izrisa: dres iz polj vrste barva (kot personalizacija.barve), sicer barve sheme. */
export const barveMotiva = (m: Pick<MotivIzdelka, 'polja' | 'sheme'>, polja: VrednostiPolj, shema?: string): string[] =>
  m.polja.some((p) => p.vrsta === 'barva') ? barveIzPolj(m.polja, polja) : ((m.sheme.find((s) => s.kljuc === shema) ?? m.sheme[0])?.barve ?? [])

// Mladinske lige ne štejejo (kot je_mladinski_slug v bazi).
const mladinska = (slug: string): boolean => /(^|-)(u19|mladinci)($|-)/.test(slug) || /^sml[0-9]/.test(slug)

/** Začetne vrednosti polj (privzeto) kot besedilo vnosnih polj. */
const zacetne = (m: MotivIzdelka): Record<string, string> =>
  Object.fromEntries(m.polja.map((p) => [p.kljuc, p.privzeto === undefined || izRacuna(p.vrsta) ? '' : String(p.privzeto)]))

/** Izmišljena vrednost za predogled ekipe, prvaka ali postave, dokler kupec ne izbere svoje. */
const primerPolja = (m: MotivIzdelka, k: string): unknown => m.primeri.find((p) => p.polja[k] !== undefined)?.polja[k]

/**
 * Ali ima ta izdaja trgovine predlogo motiva. Migracije pridejo v bazo ob vsakem
 * pushu, trgovina le ob objavi: motiv brez predloge se ne pokaže, ne podre strani.
 */
export const imaPredlogo = (slug: string): boolean => MOTIVI.some((m) => m.slug === slug)

/** Ali se kupcu da izbrati ekipo: ime mora iti na motiv (baza zavrne daljše od max). */
export const ekipaPrevelika = (ime: string, max = 24): boolean => [...ime].length > max

/** Pri vnosu ali preklopu se gladko premakne le, kdor ne želi manj gibanja. */
const gibanje = (): ScrollBehavior =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

/**
 * Izris motiva v cono nosilca ali null (motiva ni v tej izdaji, cone nima ali je prazna).
 * Komplet (podstavki) vrne vse kose; napisi in datum so v jeziku strani.
 */
export function svgCone(slug: string, polja: VrednostiPolj, barve: string[], cona: string): string | string[] | null {
  if (!imaPredlogo(slug) || !coneMotiva(slug).includes(cona) || praznaCona(slug, polja, cona)) return null
  const kosov = MOTIVI.find((x) => x.slug === slug)?.kosov ?? 1
  const kos = (n: number) => narisiMotiv(slug, polja, barve, cona, undefined, { kos: n, jezik })
  return kosov > 1 ? Array.from({ length: kosov }, (_, i) => kos(i + 1)) : kos(1)
}

/**
 * "Začni s tem": polja primera v vnosna polja. Ekipe in prvaka ne prepišemo
 * (primer ima le izmišljeno besedilo, kupec izbere svojo), prazna polja primera izpraznijo.
 */
export const izPrimera = (m: MotivIzdelka, vrednosti: Record<string, string>, p: PrimerMotiva): Record<string, string> => ({
  ...vrednosti,
  ...Object.fromEntries(m.polja.filter((x) => !izRacuna(x.vrsta)).map((x) => [x.kljuc, p.polja[x.kljuc] === undefined ? '' : String(p.polja[x.kljuc])])),
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

/** Kupčeva fantasy ekipa; mladinske se pri postavi pokažejo onemogočene, drugje ne. */
interface MojaEkipa { id: number; name: string; mladinska: boolean }

/** Živi posnetek postave za izbrano ekipo (trgovina_moja_postava). */
export type StanjePostave = Postava | 'nalagam' | 'brezKroga' | 'napaka'

/** Stanje iz odgovora trgovina_moja_postava: brez končanega kroga ima baza svoj namig. */
export const stanjePostave = (data: unknown, error: { hint?: string } | null): StanjePostave =>
  error ? (error.hint === 'trgovina-postava-krog' ? 'brezKroga' : 'napaka') : (data as Postava)

export function Konfigurator({ i }: { i: Izdelek }) {
  const motivi = i.motivi ?? []
  const cone = i.cone ?? []
  const kosarica = useKosarica()
  const { seja } = useSeja()
  const uid = seja?.user.id ?? null
  const [iskanje, setIskanje] = useSearchParams()
  const ime = pr(i, 'ime')
  useNaslov(ime, pr(i, 'opis').slice(0, 160) || undefined)

  const zacetni = motivi.find((m) => m.slug === iskanje.get('motiv')) ?? motivi[0]!
  const [slug, setSlug] = useState(zacetni.slug)
  const m = motivi.find((x) => x.slug === slug) ?? zacetni
  const [vrednosti, setVrednosti] = useState<Record<string, string>>(() => zacetne(zacetni))
  const [shema, setShema] = useState(zacetni.sheme[0]!.kljuc)
  const [dotaknjeno, setDotaknjeno] = useState(false)

  // Različice: "Črna / M" (barva in velikost) ali ena oznaka. Ena oznaka je barva ali
  // format, če ima nosilec zanjo svojo cono (kapa Črna, plakat A3), sicer velikost (dres S–3XL).
  const prodajne = i.razlicice.filter((r) => r.na_voljo !== 'ne')
  const dvojne = i.razlicice.some((r) => r.oznaka_sl.includes(' / '))
  const zCono = !dvojne && i.razlicice.some((r) => cone.some((c) => c.barva === r.oznaka_sl))
  const barvna = zCono && i.razlicice.every((r) => r.oznaka_sl in VZOREC)
  const prva = (prodajne[0] ?? i.razlicice[0]!).oznaka_sl
  const barve = [...new Set(i.razlicice.map((r) => barvaRazlicice(r.oznaka_sl)))]
  const [barva, setBarva] = useState(barvaRazlicice(prva))
  const [velikost, setVelikost] = useState<string | null>(!dvojne && (zCono || i.razlicice.length === 1) ? prva : null)
  const r = i.razlicice.find((x) => barvaRazlicice(x.oznaka_sl) === barva && velikostRazlicice(x.oznaka_sl) === velikost) ?? null

  const pogledi = [...new Set(cone.map((c) => c.kljuc))]
    .sort((a, b) => (RED_CON.indexOf(a) + 1 || 99) - (RED_CON.indexOf(b) + 1 || 99))
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

  // Ekipe, prvaki in postava, le če jih motiv potrebuje.
  const zEkipo = m.polja.some((p) => p.vrsta === 'ekipa' || p.vrsta === 'postava')
  const zPrvakom = m.polja.some((p) => p.vrsta === 'prvak')
  // null = nalagam, 'napaka' = branje ni uspelo. Ob menjavi računa beremo znova.
  const [ekipe, setEkipe] = useState<MojaEkipa[] | null | 'napaka'>(null)
  const [prvaki, setPrvaki] = useState<Prvak[] | null | 'napaka'>(null)
  useEffect(() => {
    setEkipe(null)
    if (!uid || !zEkipo) return
    let ziv = true
    void (async () => {
      const { data, error } = await supabase.from('fantasy_teams').select('id, name, competition_id').eq('owner_id', uid).eq('hisna', false).order('id')
      const ids = [...new Set((data ?? []).map((e) => e.competition_id))]
      const lige = ids.length ? await supabase.from('competitions').select('id, slug').in('id', ids) : { data: [], error: null }
      if (!ziv) return
      if (error || lige.error) return setEkipe('napaka')
      const mladinske = new Set((lige.data ?? []).filter((l) => mladinska(l.slug)).map((l) => l.id))
      setEkipe((data ?? []).map(({ id, name, competition_id }) => ({ id, name, mladinska: mladinske.has(competition_id) })))
    })()
    return () => { ziv = false }
  }, [uid, zEkipo])
  useEffect(() => {
    setPrvaki(null)
    if (!uid || !zPrvakom) return
    let ziv = true
    void supabase.rpc('trgovina_moji_prvaki').then(({ data, error }) => {
      if (ziv) setPrvaki(error ? 'napaka' : ((data as unknown as Prvak[] | null) ?? []))
    })
    return () => { ziv = false }
  }, [uid, zPrvakom])

  // Postava: ob izbiri ekipe preberemo zadnji končani krog (isti posnetek kot ob nakupu).
  const poljePostave = m.polja.find((p) => p.vrsta === 'postava')
  // Predpomnjeno po računu in ekipi; odgovor se zapiše pod svoj ključ tudi po menjavi ekipe,
  // zato se nalaganje nikoli ne zatakne. Napaka se ne hrani: "Poskusi znova" bere ponovno.
  const izbranaZaPostavo = poljePostave ? vrednosti[poljePostave.kljuc] ?? '' : ''
  const kljucPostave = (ekipa: string) => `${uid ?? ''}:${ekipa}`
  const [postave, setPostave] = useState<Record<string, StanjePostave>>({})
  const [poskus, setPoskus] = useState(0)
  useEffect(() => {
    const k = kljucPostave(izbranaZaPostavo)
    if (!uid || !izbranaZaPostavo || (postave[k] && postave[k] !== 'napaka')) return
    setPostave((o) => ({ ...o, [k]: 'nalagam' }))
    void supabase.rpc('trgovina_moja_postava', { p_team_id: Number(izbranaZaPostavo) })
      .then(({ data, error }) => setPostave((o) => ({ ...o, [k]: stanjePostave(data, error) })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, izbranaZaPostavo, poskus])

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
    if (dvojne && barve.includes(p.barva)) setBarva(p.barva)
    else if (zCono && barve.includes(p.barva)) { setBarva(p.barva); setVelikost(p.barva) }
    setPogled(m.cona)
    setDodano(null)
    predogled.current?.scrollIntoView({ behavior: gibanje(), block: 'start' })
  }

  // Vrednosti: za predogled, za tisk v košarici (prikaz), za opis, za bazo (vnos) in napake.
  const izbranaEkipa = (p: PoljeMotiva) =>
    Array.isArray(ekipe) ? ekipe.find((e) => String(e.id) === vrednosti[p.kljuc] && !e.mladinska && !ekipaPrevelika(e.name, p.max)) : undefined
  const izbranPrvak = (p: PoljeMotiva) => (vrednosti[p.kljuc] && Array.isArray(prvaki) ? prvaki[Number(vrednosti[p.kljuc])] : undefined)
  const besediloPrvaka = (x: Prvak) => (jezik === 'sl' ? x.besedilo_sl : x.besedilo_en)
  const napake: Record<string, Kljuc | null> = Object.fromEntries(m.polja.map((p) => {
    const v = vrednosti[p.kljuc] ?? ''
    const drugo = p.razlicna_od ? vrednosti[p.razlicna_od] : undefined
    if (p.vrsta === 'barva' && v && drugo === v) return [p.kljuc, 'motiv.napaka.razlicni']
    return [p.kljuc, napakaPolja(p.vrsta, v, p.max ?? (p.vrsta === 'ekipa' ? 24 : 12), undefined, p.min ?? 0)]
  }))
  const prikaz: Record<string, string | number> = {}
  const opisi: string[] = []
  const zaPredogled: VrednostiPolj = {}
  const polja: Record<string, VrednostVnosa> = {}
  const manjka: string[] = []
  for (const p of m.polja) {
    const surovo = normaliziraj(vrednosti[p.kljuc] ?? '')
    let tisk: string | number | undefined
    let predlog: unknown
    if (p.vrsta === 'ekipa') {
      const e = izbranaEkipa(p)
      if (e) [polja[p.kljuc], tisk] = [e.id, e.name]
    } else if (p.vrsta === 'prvak') {
      const x = izbranPrvak(p)
      if (x) [polja[p.kljuc], tisk] = [{ mini_liga_id: x.mini_liga_id, sezona: x.sezona }, besediloPrvaka(x)]
    } else if (p.vrsta === 'postava') {
      const e = izbranaEkipa(p)
      const s = e && postave[kljucPostave(String(e.id))]
      if (e && s && typeof s === 'object') [polja[p.kljuc], tisk, predlog] = [e.id, s.ekipa, s]
    } else if (surovo && !napake[p.kljuc]) {
      const v = p.vrsta === 'stevilka' || p.vrsta === 'leto' ? Number(surovo) : surovo
      ;[polja[p.kljuc], tisk] = [v, v]
    }
    if (tisk !== undefined) {
      prikaz[p.kljuc] = tisk
      opisi.push(prikazVrednosti(p, tisk))
    } else if (p.obvezno) manjka.push(p.kljuc)
    zaPredogled[p.kljuc] = predlog ?? tisk ?? (izRacuna(p.vrsta) ? primerPolja(m, p.kljuc) : surovo)
  }
  const veljavno = manjka.length === 0 && Object.values(napake).every((n) => n === null)
  const vnos: Personalizacija | null = veljavno ? { motiv: m.slug, polja, shema } : null
  const barveIzrisa = barveMotiva(m, zaPredogled, shema)

  const svgji = useMemo(
    () => Object.fromEntries(pogledi.map((k) => [k, svgCone(m.slug, zaPredogled, barveIzrisa, k)])),
    // zaPredogled je nov objekt ob vsakem izrisu; ključ je njegova vsebina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.slug, JSON.stringify(zaPredogled), barveIzrisa.join(), pogledi.join()],
  )

  const cene = (dvojne ? i.razlicice.filter((x) => barvaRazlicice(x.oznaka_sl) === barva) : i.razlicice).map((x) => x.cena)
  const najcenejsa = Math.min(...cene)
  const osnova = r?.cena ?? najcenejsa
  const najvec = NAJVEC

  function vKosarico() {
    setDotaknjeno(true)
    if (!r || !vnos) return
    const k0 = kljuc({ razlicica_id: r.id, personalizacija: vnos })
    const imam = (k: typeof kosarica) => k.postavke.find((p) => kljuc(p) === k0)?.kolicina ?? 0
    const opis = [pr(m, 'ime'), ...opisi.filter((v) => v !== '')].join(' · ').slice(0, 120)
    const nova = dodaj(kosarica, r.id, kolicina, i.slug, vnos, opis, najvec, prikaz)
    shrani(nova)
    dogodek('trgovina-kosarica', { izdelek: i.slug })
    setDodano(imam(nova) - imam(kosarica))
  }

  // Sličice motivov in primeri se ne spreminjajo med tipkanjem: izris enkrat na motiv.
  const sliciceSvg = useMemo(() => Object.fromEntries(motivi.map((x) => {
    const pr = x.primeri[0]
    const polja = pr ? primerZaPredogled(pr) : {}
    return [x.slug, { svg: svgCone(x.slug, polja, barveMotiva(x, polja, pr?.shema), x.cona), podlaga: barveMotiva(x, polja, pr?.shema)[0] }]
  })), [motivi])
  const primeriSvg = useMemo(() => m.primeri.map((p) => {
    const b = barveMotiva(m, primerZaPredogled(p), p.shema)
    return { svg: svgCone(m.slug, primerZaPredogled(p), b, m.cona), podlaga: b[0] }
  }), [m])

  const conaPogleda = (k: string): Cona => conaZa(cone, k, barva) ?? cone[0]!
  const glavna = conaPogleda(m.cona)
  const vidna = conaPogleda(pogled)
  const imeMotiva = pr(m, 'ime')
  const alt = t('motiv.alt', { motiv: imeMotiva, izdelek: ime })
  const obrnjeno = pogledi.length > 1 && pogled !== pogledi[0]
  const zShemo = m.sheme.length > 1
  const zRazlicico = dvojne || i.razlicice.length > 1
  const imeRazlicice = (oznaka: string) => {
    const x = i.razlicice.find((y) => y.oznaka_sl === oznaka)
    return x ? pr(x, 'oznaka') : oznaka
  }
  const naslovRazlicice = dvojne ? t('motiv.korak.nosilec') : barvna ? t('motiv.barva') : zCono ? t('motiv.format') : t('motiv.velikost')
  // Vzorec dresa: sličice v trenutnih barvah, brez napisov.
  const sliciceVzorca = useMemo(() => {
    const p = m.polja.find((x) => x.kljuc === 'vzorec' && x.vrsta === 'izbira')
    if (!p || !m.polja.some((x) => x.vrsta === 'barva') || !imaPredlogo(m.slug)) return undefined
    const prazna = Object.fromEntries(m.polja.filter((x) => x.vrsta === 'besedilo' || x.vrsta === 'stevilka').map((x) => [x.kljuc, '']))
    return Object.fromEntries((p.moznosti ?? []).map(moznost).map((o) => [o.kljuc,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(narisiMotiv(m.slug, { ...zaPredogled, ...prazna, vzorec: o.kljuc }, barveIzrisa, m.cona))}`]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, barveIzrisa.join(), String(zaPredogled.ovratnik ?? '')])
  let korak = 1

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
                    <div key={k} aria-hidden={(n === 1) !== obrnjeno} className={`[backface-visibility:hidden] ${n === 1 ? 'absolute inset-0 [transform:rotateY(180deg)]' : n > 1 ? 'hidden' : ''}`}>
                      <Mockup cona={conaPogleda(k)} svg={svgji[k] ?? null} barva={barva} podlaga={barveIzrisa[0]} alt={`${alt} · ${imeCone(k)}`} className="rounded-xl" />
                    </div>
                  ))}
                </div>
                <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-gnl-200 ring-1 ring-white/10 backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gnl-400 motion-reduce:animate-none" aria-hidden="true" />
                  {t('motiv.vZivo')}
                </span>
                {pogledi.length > 1 && (
                  <div role="group" aria-label={t('motiv.pogled')} className="absolute bottom-3 left-1/2 flex -translate-x-1/2 rounded-full bg-slate-950/75 p-1 ring-1 ring-white/10 backdrop-blur">
                    {pogledi.slice(0, 2).map((k) => (
                      <button key={k} type="button" aria-pressed={pogled === k} onClick={() => setPogled(k)}
                        className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${pogled === k ? 'bg-gnl-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}>
                        {imeCone(k)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">
              {t('motiv.tisk', { sirina: vidna.sirina_mm / 10, visina: vidna.visina_mm / 10 })}{i.postopek ? ` · ${`motiv.postopek.${i.postopek}` in SL ? t(`motiv.postopek.${i.postopek}` as Kljuc) : i.postopek.toUpperCase()}` : ''}
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

            {motivi.length > 1 && (
              <Korak n={korak++} naslov={t('motiv.korak.motiv')}>
                <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0" role="radiogroup" aria-label={t('motiv.korak.motiv')}>
                  {motivi.map((x) => {
                    const c = conaZa(cone, x.cona, barva) ?? glavna
                    const izbran = x.slug === m.slug
                    return (
                      <button key={x.slug} type="button" role="radio" aria-checked={izbran} onClick={() => izberiMotiv(x)}
                        className={`group w-32 shrink-0 snap-start overflow-hidden rounded-xl border text-left transition sm:w-auto ${
                          izbran ? 'border-gnl-400 bg-gnl-400/10 ring-2 ring-gnl-400/40' : 'border-white/10 bg-white/[0.03] hover:border-white/30'}`}>
                        <Mockup cona={c} svg={sliciceSvg[x.slug]?.svg ?? null} podlaga={sliciceSvg[x.slug]?.podlaga} barva={barva} alt="" povecava={1.9}
                          className="transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
                        <span className={`block truncate px-2.5 py-2 text-sm font-bold ${izbran ? 'text-gnl-200' : 'text-slate-200'}`}>{pr(x, 'ime')}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-sm leading-relaxed text-slate-400">{pr(m, 'opis')}</p>
              </Korak>
            )}
            {motivi.length === 1 && <p className="text-sm leading-relaxed text-slate-400">{pr(m, 'opis')}</p>}

            <Korak n={korak++} naslov={t('motiv.korak.polja')}>
              <div className="kartica grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                {m.polja.map((p) => (
                  <PoljeVnosa key={`${m.slug}-${p.kljuc}`} p={p} vrednost={vrednosti[p.kljuc] ?? ''} napaka={napake[p.kljuc] ?? null}
                    manjka={dotaknjeno && manjka.includes(p.kljuc)} nastavi={(v) => { setVrednosti((o) => ({ ...o, [p.kljuc]: v })); setDodano(null) }}
                    uid={uid} ekipe={ekipe} prvaki={prvaki} slug={i.slug} besediloPrvaka={besediloPrvaka}
                    drugo={p.razlicna_od ? vrednosti[p.razlicna_od] : undefined} postava={postave[kljucPostave(vrednosti[p.kljuc] ?? '')]} znova={() => setPoskus((n) => n + 1)} slicice={p.kljuc === 'vzorec' ? sliciceVzorca : undefined} />
                ))}
                <p className="text-xs text-slate-500 sm:col-span-2">{t('pers.preverimo')}</p>
              </div>
            </Korak>

            {zShemo && (
              <Korak n={korak++} naslov={t('motiv.korak.shema')} dodatno={<span className="text-sm text-slate-400">{pr(m.sheme.find((s) => s.kljuc === shema) ?? {}, 'ime')}</span>}>
                <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t('motiv.korak.shema')}>
                  {m.sheme.map((s) => (
                    <button key={s.kljuc} type="button" role="radio" aria-checked={s.kljuc === shema} aria-label={pr(s, 'ime')} title={pr(s, 'ime')}
                      onClick={() => setShema(s.kljuc)}
                      className={`relative h-12 w-12 overflow-hidden rounded-full transition ${s.kljuc === shema ? 'ring-2 ring-gnl-400 ring-offset-2 ring-offset-slate-950' : 'ring-1 ring-white/20 hover:ring-white/50'}`}
                      style={{ background: `conic-gradient(${s.barve[0]} 0 50%, ${s.barve[1] ?? s.barve[0]} 50% 75%, ${s.barve[2] ?? s.barve[0]} 75% 100%)` }} />
                  ))}
                </div>
              </Korak>
            )}

            {zRazlicico && (
              <Korak n={korak++} naslov={naslovRazlicice}>
                {dvojne ? (
                  <div className="space-y-4">
                    {barve.length > 0 && (
                      <fieldset className="space-y-2">
                        <legend className="text-sm text-slate-400">{t('motiv.barva')}: <span className="font-semibold text-slate-200">{barvaRazlicice(pr(i.razlicice.find((x) => barvaRazlicice(x.oznaka_sl) === barva) ?? { oznaka_sl: barva, oznaka_en: barva }, 'oznaka'))}</span></legend>
                        <div className="flex gap-3">
                          {barve.map((b) => {
                            const ime = barvaRazlicice(pr(i.razlicice.find((x) => barvaRazlicice(x.oznaka_sl) === b) ?? { oznaka_sl: b, oznaka_en: b }, 'oznaka'))
                            return (
                              <button key={b} type="button" aria-pressed={b === barva} aria-label={ime} title={ime} onClick={() => { setBarva(b); setDodano(null) }}
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
                ) : (
                  <fieldset className="space-y-2">
                    <legend className="sr-only">{naslovRazlicice}</legend>
                    {barvna && <p className="text-sm text-slate-400">{t('motiv.barva')}: <span className="font-semibold text-slate-200">{imeRazlicice(barva)}</span></p>}
                    <div className="flex flex-wrap gap-2">
                      {i.razlicice.map((x) => {
                        const izbrana = x.oznaka_sl === velikost
                        const izberi = () => { setBarva(x.oznaka_sl); setVelikost(x.oznaka_sl); setDodano(null) }
                        if (barvna) {
                          return (
                            <button key={x.id} type="button" disabled={x.na_voljo === 'ne'} aria-pressed={izbrana} aria-label={imeRazlicice(x.oznaka_sl)} title={imeRazlicice(x.oznaka_sl)} onClick={izberi}
                              className={`h-10 w-10 rounded-full border border-white/25 transition disabled:opacity-40 ${izbrana ? 'ring-2 ring-gnl-400 ring-offset-2 ring-offset-slate-950' : 'hover:scale-105'}`}
                              style={{ background: VZOREC[x.oznaka_sl] }} />
                          )
                        }
                        const dodatek = x.cena - najcenejsa
                        return (
                          <button key={x.id} type="button" disabled={x.na_voljo === 'ne'} aria-pressed={izbrana} onClick={izberi}
                            className={`min-w-12 rounded-xl border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                              izbrana ? 'border-gnl-400 bg-gnl-400/15 text-gnl-200' : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30'}`}>
                            {imeRazlicice(x.oznaka_sl)}
                            {zCono && <span className="ml-2 font-semibold tabular-nums text-slate-400">{cena(x.cena + m.doplacilo)}</span>}
                            {!zCono && dodatek > 0 && <span className="ml-1.5 text-xs font-semibold text-slate-400">{`+${cena(dodatek)}`}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                )}
              </Korak>
            )}

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

      <button type="button" onClick={() => predogled.current?.scrollIntoView({ behavior: gibanje(), block: 'start' })} aria-label={t('motiv.vZivo')}
        tabIndex={plava ? 0 : -1} aria-hidden={!plava}
        className={`fixed bottom-24 right-3 z-30 w-28 overflow-hidden rounded-2xl shadow-2xl shadow-black/70 ring-2 ring-gnl-400/60 transition duration-300 motion-reduce:transition-none md:hidden ${
          plava ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>
        <Mockup cona={vidna} svg={svgji[pogled] ?? null} barva={barva} podlaga={barveIzrisa[0]} povecava={1.5} alt="" />
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
              return (
                <li key={n} className="kartica w-64 shrink-0 snap-start overflow-hidden sm:w-auto">
                  <Mockup cona={c} svg={primeriSvg[n]?.svg ?? null} podlaga={primeriSvg[n]?.podlaga} barva={b} povecava={1.35}
                    alt={`${imeMotiva} · ${t('osebno.primer', { n: n + 1 })}`} />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-200">
                      {m.polja.map((x) => prikazVrednosti(x, p.polja[x.kljuc])).filter((v) => v !== '').slice(0, 2).join(' · ')}
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

const izbranGumb = 'border-gnl-400 bg-gnl-400/15 text-gnl-200'
const prostGumb = 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30'

/** Eno polje motiva po vrsti: besedilo, številka (ocena z drsnikom), leto, datum, izbira, barva, ekipa, prvak, postava. */
export function PoljeVnosa({ p, vrednost, napaka, manjka, nastavi, uid, ekipe, prvaki, slug, besediloPrvaka, drugo, postava, znova, slicice }: {
  p: PoljeMotiva
  vrednost: string
  napaka: Kljuc | null
  manjka: boolean
  nastavi: (v: string) => void
  uid: string | null
  ekipe: MojaEkipa[] | null | 'napaka'
  prvaki: Prvak[] | null | 'napaka'
  slug: string
  besediloPrvaka: (x: Prvak) => string
  /** Vrednost polja razlicna_od (te barve ni mogoče izbrati). */
  drugo?: string
  /** Stanje posnetka postave za izbrano ekipo. */
  postava?: StanjePostave
  /** Ponovno branje postave po napaki. */
  znova?: () => void
  /** Sličice možnosti izbire (vzorec dresa) kot data URL. */
  slicice?: Record<string, string>
}) {
  const id = `polje-${p.kljuc}`
  const letos = new Date().getFullYear()
  const max = p.max ?? (p.vrsta === 'ekipa' ? 24 : 12)
  const oznaka = (
    <span className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-slate-300">
      {pr(p, 'oznaka')}
      {!p.obvezno && <span className="text-xs font-normal text-slate-500">{t('pers.neobvezno')}</span>}
    </span>
  )
  const namig = (besedilo: string, slabo = false) => (
    <span id={`${id}-namig`} className={`block text-xs ${slabo ? 'text-rose-300' : 'text-slate-500'}`}>{besedilo}</span>
  )
  const besediloNapake = napaka && t(napaka, { max, letos, min: p.min ?? 0 })
  const okvir = manjka ? 'border-rose-400/60' : ''
  const sirok = 'sm:col-span-2'
  const prijava = (
    <p className="text-sm text-slate-400">
      {t(p.vrsta === 'postava' ? 'motiv.postava.prijava' : 'pers.prijava')} <Link to={`/login?next=${encodeURIComponent(`/p/${slug}${typeof location === 'undefined' ? '' : location.search}`)}`} className="povezava">{t('nav.prijava')}</Link>
    </p>
  )

  if (p.vrsta === 'postava') {
    const seznam = Array.isArray(ekipe) ? ekipe : null
    return (
      <div className={`space-y-2 ${sirok}`}>
        {oznaka}
        {!uid ? prijava : ekipe === null ? <Nalaganje /> : ekipe === 'napaka' ? <p className="opozorilo">{t('napaka.nalaganje')}</p> : seznam!.length === 0
          ? <p className="text-sm text-slate-400">{t('motiv.niEkip')}</p>
          : (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={pr(p, 'oznaka')}>
              {seznam!.map((e) => {
                const ne = e.mladinska || ekipaPrevelika(e.name, 24)
                return (
                  <button key={e.id} type="button" role="radio" aria-checked={vrednost === String(e.id)} disabled={ne} onClick={() => nastavi(String(e.id))}
                    aria-describedby={ne ? `${id}-ne-${e.id}` : undefined}
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${vrednost === String(e.id) ? izbranGumb : `${prostGumb} ${okvir}`}`}>
                    <span className="block">{e.name}</span>
                    {ne && <span id={`${id}-ne-${e.id}`} className="block text-xs font-normal text-slate-400">{e.mladinska ? t('motiv.postava.mladinska') : t('motiv.ekipaDolga', { max: 24 })}</span>}
                  </button>
                )
              })}
            </div>
          )}
        {uid && vrednost && postava === 'nalagam' && <Nalaganje />}
        {uid && vrednost && postava === 'brezKroga' && <p className="opozorilo" role="status">{t('motiv.postava.niKroga')}</p>}
        {uid && vrednost && postava === 'napaka' && (
          <p className="opozorilo" role="status">{t('napaka.nalaganje')} {znova && <button type="button" onClick={znova} className="povezava">{t('motiv.postava.znova')}</button>}</p>
        )}
        {uid && vrednost && postava && typeof postava === 'object' && (
          <p className="text-xs text-slate-400">{t('motiv.postava.krog', { krog: postava.krog ?? '–', liga: postava.liga ?? '' })}</p>
        )}
        {(!vrednost || !postava || typeof postava !== 'object') && namig(t('motiv.postava.predogled'))}
      </div>
    )
  }

  if (p.vrsta === 'ekipa' || p.vrsta === 'prvak') {
    const ekipa = p.vrsta === 'ekipa'
    const seznam = ekipa ? (Array.isArray(ekipe) ? ekipe.filter((e) => !e.mladinska) : ekipe) : prvaki
    return (
      <div className={`space-y-2 ${sirok}`}>
        {oznaka}
        {!uid ? prijava : seznam === null ? <Nalaganje /> : seznam === 'napaka' ? <p className="opozorilo">{t('napaka.nalaganje')}</p> : seznam.length === 0
          ? <p className="text-sm text-slate-400">{ekipa ? t('motiv.niEkip') : t('pers.niPrvak')}</p>
          : (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={pr(p, 'oznaka')}>
              {ekipa
                ? (seznam as MojaEkipa[]).map((e) => {
                  const dolga = ekipaPrevelika(e.name, max)
                  return (
                    <button key={e.id} type="button" role="radio" aria-checked={vrednost === String(e.id)} disabled={dolga} onClick={() => nastavi(String(e.id))}
                      aria-describedby={dolga ? `${id}-dolga-${e.id}` : undefined}
                      className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${vrednost === String(e.id) ? izbranGumb : `${prostGumb} ${okvir}`}`}>
                      <span className="block">{e.name}</span>
                      {dolga && <span id={`${id}-dolga-${e.id}`} className="block text-xs font-normal text-slate-400">{t('motiv.ekipaDolga', { max })}</span>}
                    </button>
                  )
                })
                : (prvaki as Prvak[]).map((x, n) => (
                  <button key={`${x.mini_liga_id}-${x.sezona}`} type="button" role="radio" aria-checked={vrednost === String(n)} onClick={() => nastavi(String(n))}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${vrednost === String(n) ? izbranGumb : `${prostGumb} ${okvir}`}`}>
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

  if (p.vrsta === 'barva') {
    const paleta = (p.moznosti ?? []).map(moznost)
    const izbrana = paleta.find((x) => x.kljuc === vrednost)
    return (
      <fieldset className={`space-y-2 ${sirok}`}>
        <legend className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-slate-300">
          {pr(p, 'oznaka')}
          {izbrana && <span className="font-normal text-slate-400">{pr(izbrana, 'ime')}</span>}
          {!p.obvezno && <span className="text-xs font-normal text-slate-500">{t('pers.neobvezno')}</span>}
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={pr(p, 'oznaka')}>
          {!p.obvezno && (
            <button type="button" role="radio" aria-checked={vrednost === ''} aria-label={t('motiv.brezBarve')} title={t('motiv.brezBarve')} onClick={() => nastavi('')}
              className={`grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-slate-900 text-slate-400 transition ${vrednost === '' ? 'ring-2 ring-gnl-400 ring-offset-2 ring-offset-slate-950' : 'hover:scale-105'}`}>
              <span aria-hidden="true" className="block h-px w-6 rotate-45 bg-current" />
            </button>
          )}
          {paleta.map((x) => {
            // Zasedena barva ostane v vrstnem redu tipkovnice in pove, zakaj je ni mogoče izbrati.
            const zasedena = drugo === x.kljuc
            const ime = pr(x, 'ime')
            return (
              <button key={x.kljuc} type="button" role="radio" aria-checked={vrednost === x.kljuc} aria-disabled={zasedena || undefined}
                aria-label={zasedena ? `${ime}: ${t('motiv.napaka.razlicni')}` : ime} title={zasedena ? t('motiv.napaka.razlicni') : ime}
                onClick={() => { if (!zasedena) nastavi(x.kljuc) }}
                className={`h-9 w-9 rounded-full border border-white/25 transition aria-disabled:cursor-not-allowed aria-disabled:opacity-25 ${vrednost === x.kljuc ? 'ring-2 ring-gnl-400 ring-offset-2 ring-offset-slate-950' : 'hover:scale-105'} ${manjka ? 'ring-1 ring-rose-400/60' : ''}`}
                style={{ background: x.hex ?? '#64748b' }} />
            )
          })}
        </div>
        {besediloNapake && namig(besediloNapake, true)}
      </fieldset>
    )
  }

  if (p.vrsta === 'izbira') {
    const moznosti = (p.moznosti ?? []).map(moznost)
    if (slicice) {
      return (
        <div className={`space-y-2 ${sirok}`}>
          {oznaka}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="radiogroup" aria-label={pr(p, 'oznaka')}>
            {moznosti.map((x) => (
              <button key={x.kljuc} type="button" role="radio" aria-checked={vrednost === x.kljuc} onClick={() => nastavi(x.kljuc)}
                className={`overflow-hidden rounded-xl border p-1.5 text-center text-[11px] font-semibold leading-tight transition ${vrednost === x.kljuc ? izbranGumb : `${prostGumb} ${okvir}`}`}>
                {slicice[x.kljuc] && <img src={slicice[x.kljuc]} alt="" className="mx-auto aspect-[4/5] w-full rounded-lg object-cover" />}
                <span className="mt-1 block break-words">{pr(x, 'ime')}</span>
              </button>
            ))}
          </div>
        </div>
      )
    }
    // Dolg seznam (slogani podstavkov) v spustnem meniju, kratek v gumbih.
    if (moznosti.length > 6) {
      return (
        <label className="block space-y-1" htmlFor={id}>
          {oznaka}
          <select id={id} value={vrednost} onChange={(e) => nastavi(e.target.value)} aria-required={p.obvezno}
            className={`polje w-full ${manjka ? 'border-rose-400/60' : ''}`}>
            {!p.obvezno || !vrednost ? <option value="">—</option> : null}
            {moznosti.map((x) => <option key={x.kljuc} value={x.kljuc}>{pr(x, 'ime')}</option>)}
          </select>
        </label>
      )
    }
    return (
      <div className={`space-y-2 ${sirok}`}>
        {oznaka}
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={pr(p, 'oznaka')}>
          {moznosti.map((x) => (
            <button key={x.kljuc} type="button" role="radio" aria-checked={vrednost === x.kljuc} onClick={() => nastavi(vrednost === x.kljuc && !p.obvezno ? '' : x.kljuc)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${vrednost === x.kljuc ? izbranGumb : `${prostGumb} ${okvir}`}`}>
              {pr(x, 'ime')}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Ocena (številka z najmanjšo vrednostjo): drsnik in polje skupaj.
  if (p.vrsta === 'stevilka' && (p.min ?? 0) > 0) {
    const n = Number(vrednost)
    return (
      <label className="block space-y-1" htmlFor={id}>
        <span className="flex items-baseline justify-between gap-2">{oznaka}</span>
        <span className="flex items-center gap-3">
          <input type="range" min={p.min} max={99} value={Number.isFinite(n) && vrednost !== '' ? n : Number(p.privzeto ?? p.min)} onChange={(e) => nastavi(e.target.value)}
            aria-label={pr(p, 'oznaka')} className={`h-2 w-full cursor-pointer accent-gnl-400 ${vrednost === '' ? 'opacity-40' : ''}`} />
          <input id={id} value={vrednost} onChange={(e) => nastavi(e.target.value)} inputMode="numeric" maxLength={2} autoComplete="off"
            aria-invalid={Boolean(napaka) || manjka} aria-required={p.obvezno} aria-describedby={`${id}-namig`}
            className={`polje w-16 text-center tabular-nums ${napaka || manjka ? 'border-rose-400/60' : ''}`} />
        </span>
        {besediloNapake ? namig(besediloNapake, true) : namig(t('motiv.namig.ocena', { min: p.min ?? 1 }), manjka)}
      </label>
    )
  }

  if (p.vrsta === 'datum') {
    return (
      <label className="block space-y-1" htmlFor={id}>
        {oznaka}
        <input id={id} type="date" value={vrednost} min="1950-01-01" max={letoNaprej()} onChange={(e) => nastavi(e.target.value)}
          aria-invalid={Boolean(napaka) || manjka} aria-required={p.obvezno} aria-describedby={`${id}-namig`}
          className={`polje w-full [color-scheme:dark] ${napaka || manjka ? 'border-rose-400/60' : ''}`} />
        {besediloNapake ? namig(besediloNapake, true) : namig(t('motiv.namig.datum'), manjka)}
      </label>
    )
  }

  const stevilo = p.vrsta === 'stevilka' || p.vrsta === 'leto'
  return (
    <label className={`block space-y-1 ${stevilo ? '' : sirok}`} htmlFor={id}>
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
