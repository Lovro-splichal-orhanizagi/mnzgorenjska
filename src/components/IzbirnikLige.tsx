// Izbirnik lige — iskalni spustni seznam, grupiran po zvezi.
//
// Prej je bila to ravna vrsta gumbov. Pri dveh tekmovanjih je delovala, pri
// šestih (Gorenjska + Ljubljana) ne bi več — na telefonu bi se prelivala čez
// zaslon in ob vsaki novi ligi bolj.
//
// Nad ligami je izbira države (spustni meni, ne več vrsta zavihkov: držav je
// dvanajst). Država le brska; šele izbira lige druge države preklopi državo
// (in jezik, zato stran naloži znova).
//
// Brez iskanja je seznam drevo: zveze so skupine, ki se razprejo, odprta je
// le zveza izbrane lige (Madžarska ima 146 lig v dvajsetih zvezah). Na vrhu so
// nazadnje izbrane lige, nad seznamom izbira ravni (člani, U19), kadar ima
// država oboje. Iskanje gre čez vse države in vse lige pokaže razprte.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTekmovanje, type Tekmovanje } from '../lib/tekmovanje'
import { potrdiZapustitev } from '../lib/neshranjeno'
import { drzaveZLigami, preklopiDrzavo } from '../lib/drzava'
import { jeMladinskiSlug } from '../lib/prevzem'
import { t as prevod, lokale, stevilo } from '../i18n'
import { imeDrzave, moznostiDrzav } from './IzbiraDrzave'
import SpustniMeni from './SpustniMeni'
import Zastava from './Zastava'
import FotoIgralca from './FotoIgralca'
import ZnakPreverjen from './ZnakPreverjen'
import { ZelimLigoOkno } from './ZelimLigo'
import {
  dovoljZaIskanje,
  opisIgralca,
  potIgralca,
  useIskanjeIgralcev,
  type NajdenIgralec,
} from '../lib/iskanjeIgralcev'
import { prikazniIme } from '../lib/pomozno'
import { drzavaVstopa } from '../lib/drzavaUgib'

/** Toliko igralcev pokaže razdelek "Igralci" pod ligami. */
const IGRALCEV_V_IZBIRNIKU = 6

/** Do toliko lig v pogledu so vse zveze razprte (Slovenija, Avstrija po deželah). */
const VSE_RAZPRTE_DO = 15

/** Toliko nazadnje izbranih lig pokaže razdelek "Nedavno". */
const NEDAVNIH = 4
const KLJUC_NEDAVNIH = 'slff-nedavne-lige'
const NEDAVNO = 'nedavno'

type Raven = 'vse' | 'clani' | 'mladinci'
const RAVNI: Raven[] = ['vse', 'clani', 'mladinci']

/** Brez šumnikov in velikih črk — da "zelezniki" najde "Železniki". */
const poenostavi = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

interface Skupina {
  kljuc: string
  naslov: string
  lige: Tekmovanje[]
}

/** Razvrsti tekmovanja po zvezi; tista brez zveze pridejo na konec. */
export function poZvezah(tekmovanja: Tekmovanje[]): Skupina[] {
  const skupine = new Map<string, Skupina>()
  for (const t of tekmovanja) {
    const kljuc = t.federation_code ?? '—'
    const naslov = t.federation_short ?? t.country_name ?? prevod('aplikacija.izbirnikLige.ostalo')
    if (!skupine.has(kljuc)) skupine.set(kljuc, { kljuc, naslov, lige: [] })
    skupine.get(kljuc)!.lige.push(t)
  }
  return [...skupine.values()].sort((a, b) => {
    if (a.kljuc === '—') return 1
    if (b.kljuc === '—') return -1
    const as = a.lige[0]?.federation_sort ?? 0
    const bs = b.lige[0]?.federation_sort ?? 0
    return as - bs || a.naslov.localeCompare(b.naslov, lokale())
  })
}

/**
 * Ali naj gumb pred imenom lige pokaže še zvezo.
 *
 * Pri eni sami zvezi ne pove ničesar — vse lige so njene — zato jo izpustimo.
 * Vrstica v meniju je ozka: `max-w-6xl` je bilo z dodano "Gorenjska" preseženo
 * in značka je zlezla čez logotip.
 */
export function pokaziZvezo(tekmovanja: Tekmovanje[]): boolean {
  const zveze = new Set(tekmovanja.map((t) => t.federation_code ?? '—'))
  return zveze.size > 1
}

/** Ali liga ustreza iskalnemu nizu — po imenu lige, kratici ali zvezi. */
export function ustreza(t: Tekmovanje, iskanje: string): boolean {
  const q = poenostavi(iskanje)
  if (!q) return true
  const kosi = [t.name, t.short_name, t.federation_short, t.federation_name]
    .filter(Boolean)
    .map((x) => poenostavi(String(x)))
  return kosi.some((k) => k.includes(q))
}

/** Liga po ravni: mladinska (U19) ali članska. */
export function ustrezaRavni(t: Tekmovanje, raven: Raven): boolean {
  if (raven === 'vse') return true
  return jeMladinskiSlug(t.slug) === (raven === 'mladinci')
}

/** Zveze, razprte ob odprtju: vse v majhni državi, sicer le zveza izbrane lige. */
export function privzetoRazprte(lige: Tekmovanje[], izbrana: string | null): Set<string> {
  const skupine = poZvezah(lige)
  const odprte = new Set<string>([NEDAVNO])
  if (lige.length <= VSE_RAZPRTE_DO) skupine.forEach((s) => odprte.add(s.kljuc))
  else {
    const s = skupine.find((s) => s.lige.some((t) => t.slug === izbrana)) ?? skupine[0]
    if (s) odprte.add(s.kljuc)
  }
  return odprte
}

/** Nazadnje izbrane lige (le ta brskalnik); shramba je lahko zaprta. */
function preberiNedavne(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KLJUC_NEDAVNIH) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Zapiše novo ligo in tisto, ki jo človek zapušča (da je naslednjič na vrhu). */
function zapisiNedavno(nova: string, prejsnja: string | null) {
  const seznam = [nova, prejsnja, ...preberiNedavne()].filter((x): x is string => Boolean(x))
  try {
    localStorage.setItem(KLJUC_NEDAVNIH, JSON.stringify([...new Set(seznam)].slice(0, NEDAVNIH + 2)))
  } catch {
    // Zasebno okno ali polna shramba: brez razdelka Nedavno.
  }
}

/** Vrstica seznama, po kateri se premikata puščici. */
type Vrstica =
  | { tip: 'skupina'; id: string; s: Skupina }
  | { tip: 'liga'; id: string; t: Tekmovanje; skupina: string }
  | { tip: 'igralec'; id: string; z: NajdenIgralec }

const idLige = (skupina: string, t: Tekmovanje) => `liga-${skupina}-${t.slug}`

function Kljukica() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3.5 w-3.5 shrink-0 text-gnl-300">
      <path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Puscica({ obrnjena, className = '' }: { obrnjena: boolean; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" className={`h-3 w-3 shrink-0 transition ${obrnjena ? 'rotate-180' : ''} ${className}`}>
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function IzbirnikLige() {
  const { slug, tekmovanja, vsaTekmovanja, drzava: drzavaLige, tekmovanje: izbranaLiga, nastavi } = useTekmovanje()
  // Vstopna stran države (`/at`) ne izbere lige: shranjena ali privzeta liga
  // je lahko iz druge države in glava bi na avstrijski strani kazala "Člani".
  const vstop = drzavaVstopa(useLocation().pathname)
  const tujaLiga = vstop != null && izbranaLiga?.country_code !== vstop
  const drzava = tujaLiga ? vstop : drzavaLige
  const tekmovanje = tujaLiga ? null : izbranaLiga
  const [odprt, setOdprt] = useState(false)
  const [zelja, setZelja] = useState(false)
  const [iskanje, setIskanje] = useState('')
  // Država, katere lige plošča kaže. Izbira le brska — stran se ne naloži
  // znova, dokler človek ne izbere lige.
  const [zavihek, setZavihek] = useState(drzava)
  const [raven, setRaven] = useState<Raven>('vse')
  // Razprte zveze (in "Nedavno") v drevesu brez iskanja.
  const [razprte, setRazprte] = useState<Set<string>>(() => new Set())
  const [nedavne, setNedavne] = useState<string[]>([])
  // Seznam držav je odprt: lige in iskanje se umaknejo, da ima prostor.
  const [drzaveOdprte, setDrzaveOdprte] = useState(false)
  // Vrstica, na kateri stoji tipkovnica (puščice); Enter jo izbere ali razpre.
  // Po id-ju, ne po mestu: razprtje zveze premakne vse pod njo.
  const [aktivnaId, setAktivnaId] = useState<string | null>(null)
  // Plošča je pod gumbom, na ozkem zaslonu pa zamaknjena, da ne zleze čez rob.
  // (Glava ima backdrop-blur, zato `fixed` v njej ne bi bil glede na okno.)
  const [mesto, setMesto] = useState({ levo: 0, sirina: 352 })
  const ovoj = useRef<HTMLDivElement | null>(null)
  const poljeIskanja = useRef<HTMLInputElement | null>(null)
  const gumb = useRef<HTMLButtonElement | null>(null)
  const pojdi = useNavigate()

  const vecDrzav = useMemo(() => drzaveZLigami(vsaTekmovanja).length > 1, [vsaTekmovanja])

  const ligeDrzave = (koda: string) => vsaTekmovanja.filter((t) => (t.country_code ?? drzava) === koda)

  /** Pogled ene države: zavihek, raven in razprte zveze se zamenjajo skupaj. */
  const pokaziDrzavo = (koda: string) => {
    setZavihek(koda)
    setRaven('vse')
    setIskanje('')
    setRazprte(privzetoRazprte(ligeDrzave(koda), slug))
  }

  const odpri = () => {
    pokaziDrzavo(drzava)
    setNedavne(preberiNedavne())
    setDrzaveOdprte(false)
    setOdprt(true)
  }

  // Klik izven zapre; brez tega spustni seznam ostane odprt čez celo stran.
  useEffect(() => {
    if (!odprt) return
    const zunaj = (e: MouseEvent) => {
      if (ovoj.current && !ovoj.current.contains(e.target as Node)) setOdprt(false)
    }
    document.addEventListener('mousedown', zunaj)
    return () => document.removeEventListener('mousedown', zunaj)
  }, [odprt])

  useEffect(() => {
    // Na dotik bi fokus odprl tipkovnico čez seznam lig, ki ga človek hoče videti.
    if (odprt && window.matchMedia('(hover: hover)').matches) poljeIskanja.current?.focus()
    else setIskanje('')
  }, [odprt])

  // Širina in zamik plošče ob odprtju in ob spremembi okna.
  useEffect(() => {
    if (!odprt) return
    const postavi = () => {
      const r = gumb.current?.getBoundingClientRect()
      if (!r) return
      const sirina = Math.min(352, window.innerWidth - 24)
      const levo = Math.max(12, Math.min(r.left, window.innerWidth - 12 - sirina)) - r.left
      setMesto({ levo, sirina })
    }
    postavi()
    window.addEventListener('resize', postavi)
    return () => window.removeEventListener('resize', postavi)
  }, [odprt])

  // Iskanje gre čez vse države in vse ravni; brez iskanja le izbrana država.
  const isce = iskanje.trim().length > 0
  const vDrzavi = useMemo(
    () => vsaTekmovanja.filter((t) => (t.country_code ?? drzava) === zavihek),
    [vsaTekmovanja, zavihek, drzava],
  )
  // Izbira ravni ima smisel le, kadar ima država oboje.
  const imaRavni = useMemo(
    () => vDrzavi.some((t) => jeMladinskiSlug(t.slug)) && vDrzavi.some((t) => !jeMladinskiSlug(t.slug)),
    [vDrzavi],
  )
  const skupine = useMemo(() => {
    if (isce) return poZvezah(vsaTekmovanja.filter((t) => ustreza(t, iskanje)))
    return poZvezah(vDrzavi.filter((t) => ustrezaRavni(t, imaRavni ? raven : 'vse')))
  }, [vsaTekmovanja, vDrzavi, iskanje, isce, raven, imaRavni])

  // Nedavno: lige iz shrambe, ki so še aktivne, brez izbrane.
  const skupinaNedavnih = useMemo<Skupina | null>(() => {
    if (isce) return null
    const lige = nedavne
      .filter((s) => s !== slug)
      .map((s) => vsaTekmovanja.find((t) => t.slug === s))
      .filter((t): t is Tekmovanje => t != null)
      .slice(0, NEDAVNIH)
    return lige.length ? { kljuc: NEDAVNO, naslov: prevod('aplikacija.izbirnikLige.nedavno'), lige } : null
  }, [isce, nedavne, slug, vsaTekmovanja])

  // Od treh znakov naprej iskanje najde še igralce vseh aktivnih lig; pod
  // ligami jih pokaže razdelek "Igralci". Puščici gresta čez lige in igralce
  // (najprej vse lige, nato igralci).
  const iskanjeIgralcev = odprt && dovoljZaIskanje(iskanje)
  const { zadetki: igralci, nalaganje: iscemIgralce } = useIskanjeIgralcev(iskanje, {
    omejitev: IGRALCEV_V_IZBIRNIKU,
    vklopljeno: iskanjeIgralcev,
  })

  // Vrstice, kot jih vidi oko — po njih se premikata puščici. Brez iskanja
  // so v zaporedju tudi glave zvez (drevo), z iskanjem le lige in igralci.
  const drevo = [...(skupinaNedavnih ? [skupinaNedavnih] : []), ...skupine]
  const vrstice = useMemo<Vrstica[]>(() => {
    if (isce)
      return [
        ...skupine.flatMap((s) => s.lige.map((t): Vrstica => ({ tip: 'liga', id: idLige(s.kljuc, t), t, skupina: s.kljuc }))),
        ...igralci.map((z): Vrstica => ({ tip: 'igralec', id: `igralec-${z.id}`, z })),
      ]
    return drevo.flatMap((s): Vrstica[] => [
      { tip: 'skupina', id: `skupina-${s.kljuc}`, s },
      ...(razprte.has(s.kljuc)
        ? s.lige.map((t): Vrstica => ({ tip: 'liga', id: idLige(s.kljuc, t), t, skupina: s.kljuc }))
        : []),
    ])
    // drevo je izpeljano iz skupine in skupinaNedavnih.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isce, skupine, skupinaNedavnih, igralci, razprte])

  // Ob odprtju, iskanju ali menjavi pogleda začni pri izbrani ligi (v njeni
  // zvezi, ne v Nedavno), sicer pri prvi vrstici.
  useEffect(() => {
    if (!odprt) return
    const izbrana = vrstice.find((v) => v.tip === 'liga' && v.t.slug === slug && v.skupina !== NEDAVNO)
    setAktivnaId((izbrana ?? vrstice[0])?.id ?? null)
    // Ne ob vsaki spremembi vrstic: razprtje zveze ne sme premakniti tipkovnice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odprt, iskanje, zavihek, raven])

  const aktivna = Math.max(0, vrstice.findIndex((v) => v.id === aktivnaId))
  const aktivnaVrstica = vrstice.length ? vrstice[aktivna] : undefined

  // Escape zapre seznam, tudi ko fokus ni v iskalnem polju (npr. po kliku
  // na drsnik seznama). Odprt seznam držav Escape ujame sam.
  useEffect(() => {
    if (!odprt) return
    const tipkaDok = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setOdprt(false)
      gumb.current?.focus()
    }
    document.addEventListener('keydown', tipkaDok)
    return () => document.removeEventListener('keydown', tipkaDok)
  }, [odprt])

  // Vrstica pod tipkovnico mora ostati vidna, ko jo puščica premakne pod rob seznama.
  useEffect(() => {
    if (!odprt || !aktivnaVrstica) return
    document
      .querySelector(`[data-vrstica="${CSS.escape(aktivnaVrstica.id)}"]`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [odprt, aktivnaVrstica])

  // Ena sama liga povsod: izbirati ni česa.
  if (vsaTekmovanja.length < 2 && tekmovanja.length < 2) return null

  // Prikaz mora vedno vsebovati zvezo, sicer uporabnik ne loci "Clani"
  // (Gorenjska) od "Clani" (Ljubljana). Ce je zveza ze v imenu (kot pri
  // 1. GNL — clani), je ne podvajamo.
  const kratko = tekmovanje?.short_name ?? prevod('aplikacija.izbirnikLige.liga')
  const surovoIme = tekmovanje?.name ?? kratko
  const zveza = pokaziZvezo(tekmovanja) ? tekmovanje?.federation_short : null
  const jeZeVIme = (s: string) =>
    zveza != null && s.toLowerCase().includes(zveza.toLowerCase())
  // Mobilno: kratko ime, zveza v predponi le, če ga ima še katera liga
  // ("GNL Clani" ob "MNZLJ Clani") — sicer bi ime zakrila tripičja.
  const dvoumno = tekmovanja.some((t) => t.slug !== slug && t.short_name === kratko)
  const zaMobile = zveza && dvoumno && !jeZeVIme(kratko) ? `${zveza} ${kratko}` : kratko
  // Desktop: polno ime, po potrebi z zvezo v predponi.
  const zaDesktop = zveza && !jeZeVIme(surovoIme) ? `${zveza} · ${surovoIme}` : surovoIme

  const izberi = (t: Tekmovanje) => {
    // Moja ekipa ob menjavi lige naloži drug kader — neshranjene spremembe bi izginile.
    if (t.slug !== slug && !potrdiZapustitev()) return
    if (t.slug !== slug) zapisiNedavno(t.slug, slug)
    // Liga druge države: jezik se med obiskom ne menja, zato stran naloži znova.
    if (t.country_code && t.country_code !== drzavaLige) {
      preklopiDrzavo(t.country_code, vsaTekmovanja, { liga: t.slug })
      return
    }
    nastavi(t.slug)
    setOdprt(false)
    gumb.current?.focus()
  }

  // Igralec: liga postane njegova, stran pa njegova stran v tej ligi.
  const izberiIgralca = (z: NajdenIgralec) => {
    if (!potrdiZapustitev()) return
    const pot = potIgralca(z)
    if (z.drzava && z.drzava !== drzavaLige) {
      // Druga država: jezik se zamenja le ob nalaganju strani.
      preklopiDrzavo(z.drzava, vsaTekmovanja, { liga: z.liga, pojdi: () => window.location.assign(pot) })
      return
    }
    nastavi(z.liga)
    setOdprt(false)
    pojdi(pot)
  }

  const preklopiSkupino = (kljuc: string, odpri?: boolean) =>
    setRazprte((r) => {
      const n = new Set(r)
      if (odpri ?? !n.has(kljuc)) n.add(kljuc)
      else n.delete(kljuc)
      return n
    })

  const tipka = (e: KeyboardEvent<HTMLInputElement>) => {
    const v = aktivnaVrstica
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!vrstice.length) return
      const korak = e.key === 'ArrowDown' ? 1 : -1
      setAktivnaId(vrstice[(aktivna + korak + vrstice.length) % vrstice.length].id)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (v?.tip === 'skupina') preklopiSkupino(v.s.kljuc)
      else if (v?.tip === 'liga') izberi(v.t)
      else if (v?.tip === 'igralec') izberiIgralca(v.z)
    } else if (!isce && e.key === 'ArrowRight' && v?.tip === 'skupina') {
      // Drevo: desno razpre zvezo, na razprti skoči na prvo ligo.
      e.preventDefault()
      if (!razprte.has(v.s.kljuc)) preklopiSkupino(v.s.kljuc, true)
      else if (v.s.lige[0]) setAktivnaId(idLige(v.s.kljuc, v.s.lige[0]))
    } else if (!isce && e.key === 'ArrowLeft' && v) {
      // Levo strne zvezo, z lige skoči na njeno zvezo.
      e.preventDefault()
      if (v.tip === 'skupina') preklopiSkupino(v.s.kljuc, false)
      else if (v.tip === 'liga') setAktivnaId(`skupina-${v.skupina}`)
    }
    // Escape ujame poslušalec na dokumentu (zgoraj).
  }

  /** Ena liga: v drevesu `treeitem`, pri iskanju `option`. */
  const vrsticaLige = (t: Tekmovanje, skupina: string) => {
    const id = idLige(skupina, t)
    const izbrana = t.slug === slug
    const jeAktivna = aktivnaVrstica?.id === id
    const tujaDrzava = vecDrzav && t.country_code && (isce || skupina === NEDAVNO) && t.country_code !== zavihek
    return (
      <div
        key={id}
        id={id}
        data-vrstica={id}
        role={isce ? 'option' : 'treeitem'}
        aria-level={isce ? undefined : 2}
        aria-selected={izbrana}
        onClick={() => izberi(t)}
        onMouseEnter={() => setAktivnaId(id)}
        className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm sm:min-h-[36px] ${
          isce ? '' : 'pl-6'
        } ${
          izbrana ? 'bg-gnl-500/15 font-bold text-gnl-200' : jeAktivna ? 'bg-white/10 text-slate-100' : 'text-slate-300'
        }`}
      >
        {tujaDrzava && t.country_code && <Zastava koda={t.country_code} className="h-3 shrink-0" />}
        <span className="min-w-0 flex-1 truncate">{t.name}</span>
        {izbrana && <Kljukica />}
      </div>
    )
  }

  /** Glava zveze pri iskanju (ni možnost, le naslov). */
  const glavaIskanja = (s: Skupina): ReactNode => {
    const koda = s.lige[0]?.country_code ?? null
    return (
      <div
        aria-hidden="true"
        className="sticky top-0 z-10 flex items-center gap-1.5 bg-slate-900 px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"
      >
        {vecDrzav && koda && <Zastava koda={koda} className="h-3" />}
        <span className="truncate">{s.naslov}</span>
        <span className="ml-auto font-semibold text-slate-600">{s.lige.length}</span>
      </div>
    )
  }

  const praznoSporocilo = (
    <p className="px-3 py-6 text-center text-sm text-slate-500" aria-live="polite">
      {iscemIgralce ? prevod('aplikacija.izbirnikLige.iscemIgralce') : prevod('aplikacija.izbirnikLige.niZadetkov')}
    </p>
  )

  return (
    // min-w-0 + max-w: gumb se na ozkem zaslonu skrajša, namesto da bi
    // hamburger potisnil čez rob (360 px).
    <div className="relative min-w-0 max-w-[50vw] sm:max-w-xs lg:max-w-[18rem]" ref={ovoj}>
      <button
        data-pomoc="izbirnik-lige"
        ref={gumb}
        onClick={() => (odprt ? setOdprt(false) : odpri())}
        aria-haspopup="dialog"
        aria-expanded={odprt}
        title={surovoIme}
        // Preklopnik je bil premajhen — nov obiskovalec ga ni videl. Ambrasti
        // gumb z obrobo je vidno drugačen od tekstualnih povezav v meniju.
        // Značka države pove, kje si; na mobilnem kratko ime, na desktopu polno.
        className="flex w-full min-w-0 items-center gap-1.5 rounded-xl bg-amber-500/10 px-2 py-1.5 sm:gap-2 sm:px-2.5 text-sm font-bold
                   ring-1 ring-amber-400/40 transition hover:bg-amber-500/20 hover:ring-amber-400/60"
      >
        {vecDrzav && <Zastava koda={drzava} className="h-4" />}
        <span className="min-w-0 truncate text-amber-50 sm:hidden">{zaMobile}</span>
        <span className="hidden min-w-0 truncate text-amber-50 sm:inline">{zaDesktop}</span>
        <Puscica obrnjena={odprt} className="text-amber-300/80" />
      </button>

      {odprt && (
        <div
          style={{ left: mesto.levo, width: mesto.sirina }}
          className="animiraj-vstop absolute top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10
                     bg-slate-900 shadow-xl shadow-black/50"
        >
          <div className="space-y-2 border-b border-white/10 p-2">
            {/* Država le brska; seznam se pokaže v plošči (lebdeči bi ga plošča odrezala). */}
            {vecDrzav && (
              <SpustniMeni
                vVrsti
                className="text-sm"
                obOdprtju={setDrzaveOdprte}
                oznakaGumba={prevod('aplikacija.izbiraDrzave.gumb', { drzava: imeDrzave(zavihek) })}
                oznakaMenija={prevod('aplikacija.izbiraDrzave.oznaka')}
                gumb={
                  <>
                    <Zastava koda={zavihek} className="h-3.5 shrink-0" />
                    <span className="truncate font-semibold text-slate-100">{imeDrzave(zavihek)}</span>
                    <span className="text-xs text-slate-500">{stevilo(vDrzavi.length)}</span>
                  </>
                }
                moznosti={moznostiDrzav(vsaTekmovanja, zavihek)}
                izberi={pokaziDrzavo}
              />
            )}
            {!drzaveOdprte && (
              <>
                {/* Iskalno polje je zunaj seznama: v seznamu smejo biti le možnosti. */}
                <input
                  ref={poljeIskanja}
                  value={iskanje}
                  onChange={(e) => setIskanje(e.target.value)}
                  onKeyDown={tipka}
                  placeholder={prevod('aplikacija.izbirnikLige.isciPolje')}
                  role="combobox"
                  aria-label={prevod('aplikacija.izbirnikLige.isci')}
                  aria-expanded="true"
                  aria-haspopup={isce ? 'listbox' : 'tree'}
                  aria-controls="seznam-lig"
                  aria-autocomplete="list"
                  aria-activedescendant={aktivnaVrstica?.id}
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-500"
                />
                {!isce && imaRavni && (
                  <div
                    role="radiogroup"
                    aria-label={prevod('aplikacija.izbirnikLige.raven')}
                    className="flex gap-1 rounded-xl bg-slate-950 p-1"
                  >
                    {RAVNI.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={raven === r}
                        onClick={() => {
                          setRaven(r)
                          setRazprte(privzetoRazprte(vDrzavi.filter((t) => ustrezaRavni(t, r)), slug))
                        }}
                        className={`min-h-[36px] flex-1 truncate rounded-lg px-2 text-xs font-semibold transition ${
                          raven === r ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        {prevod(`aplikacija.izbirnikLige.ravni.${r}`)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {drzaveOdprte ? null : vrstice.length === 0 ? (
            praznoSporocilo
          ) : isce ? (
            // Stanje iskanja igralcev ni možnost, zato stoji zunaj listboxa.
            <div className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain pb-1.5">
              <div id="seznam-lig" role="listbox" aria-label={prevod('aplikacija.izbirnikLige.lige')}>
                {skupine.map((s) => (
                  <div key={s.kljuc} role="group" aria-label={s.naslov}>
                    {/* Glava skupine ostane vidna, ko se seznam pomika. */}
                    {glavaIskanja(s)}
                    <div className="px-1.5">{s.lige.map((t) => vrsticaLige(t, s.kljuc))}</div>
                  </div>
                ))}
                {igralci.length > 0 && (
                  <div role="group" aria-label={prevod('aplikacija.izbirnikLige.igralci')}>
                    <div
                      aria-hidden="true"
                      className="sticky top-0 z-10 flex items-center gap-1.5 bg-slate-900 px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"
                    >
                      <span className="truncate">{prevod('aplikacija.izbirnikLige.igralci')}</span>
                      <span className="ml-auto font-semibold text-slate-600">{igralci.length}</span>
                    </div>
                    <div className="px-1.5">
                      {igralci.map((z) => {
                        const id = `igralec-${z.id}`
                        const jeAktiven = aktivnaVrstica?.id === id
                        const podrobno = [z.klub, z.liga_ime].filter(Boolean).join(' · ')
                        return (
                          <div
                            key={z.id}
                            id={id}
                            data-vrstica={id}
                            role="option"
                            aria-selected={false}
                            aria-label={opisIgralca(z)}
                            onClick={() => izberiIgralca(z)}
                            onMouseEnter={() => setAktivnaId(id)}
                            className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm sm:min-h-[36px] ${
                              jeAktiven ? 'bg-white/10 text-slate-100' : 'text-slate-300'
                            }`}
                          >
                            <FotoIgralca id={z.id} velikost={20} />
                            <span className="max-w-[60%] shrink-0 truncate font-semibold">
                              {prikazniIme(z.full_name)}
                              <ZnakPreverjen id={z.id} className="ml-1" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{podrobno}</span>
                            {vecDrzav && z.drzava && z.drzava !== drzava && (
                              <Zastava koda={z.drzava} className="h-3 shrink-0 self-center" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              {iscemIgralce && igralci.length === 0 && (
                <p className="px-3 pt-2 text-xs text-slate-500" aria-live="polite">
                  {prevod('aplikacija.izbirnikLige.iscemIgralce')}
                </p>
              )}
            </div>
          ) : (
            <div className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain px-1.5 pb-1.5">
              <div id="seznam-lig" role="tree" aria-label={prevod('aplikacija.izbirnikLige.lige')}>
                {drevo.map((s) => {
                  const id = `skupina-${s.kljuc}`
                  const razprta = razprte.has(s.kljuc)
                  const jeAktivna = aktivnaVrstica?.id === id
                  const imaIzbrano = s.kljuc !== NEDAVNO && s.lige.some((t) => t.slug === slug)
                  return (
                    <div
                      key={s.kljuc}
                      id={id}
                      role="treeitem"
                      aria-level={1}
                      aria-expanded={razprta}
                      aria-selected={false}
                      aria-label={s.naslov}
                    >
                      {/* Glava zveze: klik razpre ali strne; ostane vidna, ko se seznam pomika. */}
                      <div
                        data-vrstica={id}
                        onClick={() => preklopiSkupino(s.kljuc)}
                        onMouseEnter={() => setAktivnaId(id)}
                        className={`sticky top-0 z-10 mt-1 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-2.5 text-xs font-bold uppercase tracking-wide sm:min-h-[36px] ${
                          jeAktivna ? 'text-slate-100 ring-1 ring-inset ring-white/15' : 'text-slate-400'
                        }`}
                      >
                        <Puscica obrnjena={false} className={`text-slate-500 ${razprta ? '' : '-rotate-90'}`} />
                        <span className="min-w-0 flex-1 truncate">{s.naslov}</span>
                        {!razprta && imaIzbrano && <Kljukica />}
                        <span className="font-semibold text-slate-600">{stevilo(s.lige.length)}</span>
                      </div>
                      {razprta && <div role="group">{s.lige.map((t) => vrsticaLige(t, s.kljuc))}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {!drzaveOdprte && (
            <div className="border-t border-white/10 px-3 py-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setOdprt(false)
                  setZelja(true)
                }}
                className="text-xs text-slate-400 underline decoration-dotted underline-offset-2 hover:text-slate-200"
              >
                {prevod('aplikacija.zelimLigo.povezava')}
              </button>
            </div>
          )}
        </div>
      )}
      {zelja && <ZelimLigoOkno drzava={zavihek} zapri={() => setZelja(false)} />}
    </div>
  )
}
