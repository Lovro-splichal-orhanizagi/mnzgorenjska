// Katero ligo gleda uporabnik — člane ali mladince.
//
// Poti so za obe ligi iste (/lestvica, /moja-ekipa …), razlikuje jih parameter
// `?t=mladinci`. Tako je vsaka stran deljiva s povezavo, meni pa ostane en
// sam. Izbira se shrani v brskalnik, da je ob naslednjem obisku tam, kjer si
// pustil; parameter v naslovu jo vedno povozi, ker je bolj določen.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { supabase } from './supabase'
import {
  ugibajObiskovalca,
  ligeDrzave,
  ligaEkip,
  zacetnaLiga,
  oznaciVstopDrzave,
  drzaveZLigami,
  jeTujIp,
  jezikObiskovalca,
  shranjenaDrzava,
  tujec,
  zapomniTujca,
  zaznajTujca,
  pozabiTujca,
  type UgibObiskovalca,
} from './drzava'
import { useAuth } from './useAuth'
import { jezik, jePripravljen, nastaviJezik } from '../i18n/jedro.ts'
import { jeBrezLige, useLigaStrani } from './naslov'
import { drzavaVstopa } from './drzavaUgib'

export const PRIVZETO = 'clani'
const KLJUC = 'slff-tekmovanje'
// Seznam lig iz prejšnjega obiska: stran se izriše takoj, svež seznam pride v
// ozadju. Le za prikaz — izbire lige, države in tujca čakajo na svež seznam,
// ker je liga v shrambi lahko že ugasnjena.
const KLJUC_LIG = 'slff-lige-v1'
const ROK_SHRAMBE_LIG_MS = 7 * 24 * 3600 * 1000

function shranjeneLige(): Tekmovanje[] {
  try {
    const v = JSON.parse(localStorage.getItem(KLJUC_LIG) ?? 'null')
    if (!v || !Array.isArray(v.lige) || !(Date.now() - v.cas < ROK_SHRAMBE_LIG_MS)) return []
    return v.lige
  } catch {
    return []
  }
}

/** Tekmovanje, kot ga bere vmesnik (podmnožica stolpcev `competitions`). */
export interface Tekmovanje {
  id: number
  slug: string
  name: string
  short_name: string | null
  prvi_fantasy_krog: number | null
  /** Zveza, ki ligo objavlja — po njej izbirnik grupira. Lahko je prazna. */
  federation_code: string | null
  federation_name: string | null
  federation_short: string | null
  federation_url: string | null
  federation_sort: number | null
  /**
   * Kdo objavlja zapisnike, kadar to ni zveza tekmovanja. Prazno pri vseh
   * ligah MNZ; izpolnjeno pri 3. SNL, ki jo vodi NZS, objavi pa jo ena od
   * medobčinskih zvez.
   */
  vir_ime: string | null
  vir_url: string | null
  country_code: string | null
  country_name: string | null
}

/** Ukaz, ki ga vrne `uskladiTekmovanje` — kdo popravi koga. */
export type UskladitevUkaz =
  | { dejanje: 'nic' }
  | { dejanje: 'prevzemi-naslov'; slug: string }
  | { dejanje: 'zapisi-naslov'; param: string | null }

export interface UskladitevVhod {
  vNaslovu: string | null | undefined
  zadnjiVNaslovu: string | null | undefined
  slug: string
  potSeJeSpremenila?: boolean
}

/**
 * Kdo ima prav, ko se razideta naslov in izbrana liga.
 *
 * Izbrana liga je **lepljiva**: ko enkrat izbereš mladince, ostaneš pri njih,
 * dokler ne klikneš drugam. Parameter v naslovu (`?t=mladinci`) je zato le
 * vstopna točka za deljeno povezavo, ne pa vir resnice — povezave v meniju ga
 * ne prenašajo naprej in vsaka navigacija bi ligo sicer zavrgla.
 *
 * Ločiti moramo tri primere, sicer se dva popravka izničita:
 *   1. parameter je izginil ob **navigaciji** → vrnemo ga, liga ostane,
 *   2. parameter se je spremenil ob isti poti → uporabnik je kliknil preklop,
 *   3. parameter je prišel od zunaj (deljena povezava, gumb nazaj) → velja on.
 *
 * Ločena od Reacta, da jo je mogoče preveriti brez brskalnika (`npm run smoke`).
 */
export function uskladiTekmovanje({
  vNaslovu,
  zadnjiVNaslovu,
  slug,
  potSeJeSpremenila = false,
}: UskladitevVhod): UskladitevUkaz {
  if (vNaslovu !== zadnjiVNaslovu) {
    // 1. Navigacija je parameter izgubila — liga se zaradi klika na "Igralci"
    //    ne sme spremeniti.
    if (potSeJeSpremenila && vNaslovu == null && slug !== PRIVZETO) {
      return { dejanje: 'zapisi-naslov', param: slug }
    }
    // 3. Naslov pove kaj novega — velja on.
    const izNaslova = vNaslovu ?? PRIVZETO
    if (izNaslova !== slug) return { dejanje: 'prevzemi-naslov', slug: izNaslova }
  }
  // 2. Izbiro je spremenil uporabnik — zapišimo jo v naslov.
  const zeljen = slug === PRIVZETO ? null : slug
  if ((vNaslovu ?? null) === zeljen) return { dejanje: 'nic' }
  return { dejanje: 'zapisi-naslov', param: zeljen }
}

/**
 * Ali je ligo res nekdo izbral — ali je obiskovalec le pristal na privzeti?
 *
 * Izbiro shranjujemo v brskalnik, da je ob naslednjem obisku tam, kjer si
 * pustil. Dokler se je zapisala ob vsakem nalaganju, je bila neuporabna kot
 * dokaz izbire: zaslon prvega obiska jo bere prav v ta namen in je po enem
 * ponovnem nalaganju izginil za vedno.
 */
export function jeIzrecnaIzbira({
  vNaslovu,
  shranjeno,
}: {
  vNaslovu: string | null | undefined
  shranjeno: string | null | undefined
}): boolean {
  return Boolean(vNaslovu) || Boolean(shranjeno)
}

interface KontekstVrednost {
  slug: string
  id: number | null
  tekmovanje: Tekmovanje | null
  /** Lige države, ki jo obiskovalec gleda — lige drugih držav so skrite. */
  tekmovanja: Tekmovanje[]
  /** Vse aktivne lige vseh držav: za vstop s povezave `/sk` in administracijo. */
  vsaTekmovanja: Tekmovanje[]
  drzava: string
  /**
   * Tujec (IP iz države brez lig) še ni izbral države: okno prvega obiska ga
   * najprej vpraša po njej.
   */
  vprasajDrzavo: boolean
  /** Seznam lig je svež z baze (ne iz shrambe) — šele po njem se odloča. */
  ligeSveze: boolean
  /** Seznam lig je naložen in prazen (ali ni prišel): lige ne bo, ne držimo ji prostora. */
  brezLig: boolean
  nastavi: (slug: string) => void
}

const Kontekst = createContext<KontekstVrednost>({
  slug: PRIVZETO,
  id: null,
  tekmovanje: null,
  tekmovanja: [],
  vsaTekmovanja: [],
  ligeSveze: false,
  drzava: 'SI',
  vprasajDrzavo: false,
  brezLig: false,
  nastavi: () => {},
})

function shranjeno(): string | null {
  try {
    return localStorage.getItem(KLJUC)
  } catch {
    return null
  }
}

// Stolpci, ki obstajajo šele po migraciji za zveze (20260909100000) oziroma
// za 3. SNL (20260912090000). Stojijo v isti skupini namenoma: obe sta le
// dodatek k izpisu, zato je varno, da ju manjkajoča migracija odnese skupaj.
const STOLPCI_ZVEZE =
  'federation_code, federation_name, federation_short, federation_url, federation_sort,' +
  ' vir_ime, vir_url'
const STOLPCI_OSNOVNI =
  'id, slug, name, short_name, prvi_fantasy_krog, country_code, country_name'

/**
 * Dopolni vrstico, prebrano po stari shemi, s praznimi polji zveze.
 *
 * Koda in migracije potujeta vsaka po svoji poti: koda gre v git in na
 * Vercel, migracijo pa mora nekdo pognati proti Supabase. Če se vrstni red
 * obrne — ali če migracija spodleti — PostgREST zavrne poizvedbo z neznanimi
 * stolpci in vmesnik ostane BREZ LIG: nobena stran nima česa prikazati.
 * Zato raje beremo, kar je na voljo; izbirnik lig brez zveze pokaže vse v eni
 * skupini, kar je natanko tako, kot je bilo prej.
 */
export function brezZveze(v: Record<string, unknown>): Tekmovanje {
  return {
    federation_code: null,
    federation_name: null,
    federation_short: null,
    federation_url: null,
    federation_sort: null,
    vir_ime: null,
    vir_url: null,
    ...v,
  } as Tekmovanje
}

export function TekmovanjeProvider({ children }: { children: ReactNode }) {
  const [iskanje, setIskanje] = useSearchParams()
  // `tekmovanja` je le svež seznam (iz njega se odloča), `prikaz` do takrat shramba.
  const [tekmovanja, setTekmovanja] = useState<Tekmovanje[]>([])
  const [izShrambe] = useState(shranjeneLige)
  const prikaz = tekmovanja.length ? tekmovanja : izShrambe
  const [ligeNalozene, setLigeNalozene] = useState(false)
  const [slug, setSlug] = useState<string>(
    () => iskanje.get('t') || shranjeno() || PRIVZETO,
  )

  // Gol obisk brez parametra in brez shranjene lige ni izbira — dokler
  // uporabnik ne izbere sam, v brskalnik ne zapišemo ničesar.
  const izrecno = useRef(
    jeIzrecnaIzbira({ vNaslovu: iskanje.get('t'), shranjeno: shranjeno() }),
  )
  const nastavi = useCallback((novi: string) => {
    izrecno.current = true
    setSlug(novi)
  }, [])

  useEffect(() => {
    let veljavno = true
    const naloziti = async () => {
      // `competitions_view` prilozi zvezo in drzavo, da izbirnik ne spaja sam.
      const polno = await supabase
        .from('competitions_view')
        .select(`${STOLPCI_OSNOVNI}, ${STOLPCI_ZVEZE}`)
        .eq('active', true)
        .order('federation_sort')
        .order('sort_order')
        // Enak sort_order (hrvaške lige) ne sme dati vsakič druge privzete lige.
        .order('id')
      if (!polno.error) {
        const sveze = (polno.data as Tekmovanje[] | null) ?? []
        try {
          localStorage.setItem(KLJUC_LIG, JSON.stringify({ cas: Date.now(), lige: sveze }))
        } catch {
          /* brez shrambe naslednji obisk spet čaka na seznam */
        }
        return sveze
      }

      // Migracija za zveze še ni stekla — beri po stari shemi, da vmesnik
      // vseeno dobi lige.
      const staro = await supabase
        .from('competitions_view')
        .select(STOLPCI_OSNOVNI)
        .eq('active', true)
        .order('sort_order')
      return ((staro.data as Record<string, unknown>[] | null) ?? []).map(brezZveze)
    }
    naloziti()
      .catch(() => [] as Tekmovanje[])
      .then((t) => {
        if (!veljavno) return
        // Neuspel prenos pusti prikaz iz shrambe, odločitev pa ne sprejme.
        setTekmovanja(t)
        setLigeNalozene(true)
      })
    return () => {
      veljavno = false
    }
  }, [])

  const { pathname } = useLocation()
  const zadnjiVNaslovu = useRef<string | null>(iskanje.get('t'))
  const zadnjaPot = useRef(pathname)

  useEffect(() => {
    const vNaslovu = iskanje.get('t')
    // Vstopna stran države je ena za vse lige: shranjene lige ne piše v naslov.
    const ukaz: UskladitevUkaz = drzavaVstopa(pathname)
      ? { dejanje: 'nic' }
      : uskladiTekmovanje({
          vNaslovu,
          zadnjiVNaslovu: zadnjiVNaslovu.current,
          slug,
          potSeJeSpremenila: pathname !== zadnjaPot.current,
        })
    zadnjiVNaslovu.current = vNaslovu
    zadnjaPot.current = pathname

    if (ukaz.dejanje === 'prevzemi-naslov') {
      // Liga iz naslova je izrecna — deljena povezava pove, kaj hočeš videti.
      izrecno.current = true
      setSlug(ukaz.slug)
    } else if (ukaz.dejanje === 'zapisi-naslov') {
      const novo = new URLSearchParams(iskanje)
      if (ukaz.param) novo.set('t', ukaz.param)
      else novo.delete('t')
      zadnjiVNaslovu.current = ukaz.param
      setIskanje(novo, { replace: true })
    }
  }, [iskanje, pathname, slug, setIskanje])

  // Ugib države (IP, jezik, pas) potrebuje le, kdor lige nima — vprašamo ga
  // enkrat ob nalaganju, vzporedno s seznamom lig. `undefined` = še čakamo;
  // `drzavaPoIp` po 800 ms odneha, zato stran nikoli ne obvisi.
  const [ugib, setUgib] = useState<UgibObiskovalca | null | undefined>(() =>
    izrecno.current ? null : undefined,
  )
  // Tujec: IP iz države brez lig. Oznaka ostane v brskalniku (jezik), vprašanje
  // po državi pa le, dokler je ne izbere (liga ali `slff-drzava`).
  const [tujecKoda, setTujecKoda] = useState<string | null>(() => tujec())
  // Kdor je prišel iz države brez lig, preden je ta dobila lige (Hrvat pred
  // vklopom hrvaških lig), bi sicer za vedno ostal tujec: angleščina in
  // vprašanje po državi. Ko ima njegova država lige, oznaka odpade.
  useEffect(() => {
    if (tujecKoda && tekmovanja.length && drzaveZLigami(tekmovanja).includes(tujecKoda)) {
      pozabiTujca()
      setTujecKoda(null)
    }
  }, [tujecKoda, tekmovanja])
  const [imaDrzavo] = useState(() => Boolean(shranjenaDrzava()))
  useEffect(() => {
    if (ugib !== undefined) return
    let veljavno = true
    ugibajObiskovalca().then((d) => {
      if (veljavno) setUgib(d)
    })
    return () => {
      veljavno = false
    }
  }, [ugib])

  // Prijavljen uporabnik brez shranjene lige (nova naprava) dobi ligo svojih
  // ekip — Slovenca s slovenskimi ekipami ugib po IP ali brskalniku ne sme
  // odnesti na Slovaško. Kdor ima ligo izbrano, poizvedbe ne potrebuje.
  const { session, loading: nalagaSeja } = useAuth()
  const uporabnik = session?.user.id ?? null
  const [ekipeLige, setEkipeLige] = useState<{ uporabnik: string; liga: string | null } | null>(null)
  useEffect(() => {
    if (!uporabnik || izrecno.current || !tekmovanja.length) return
    let veljavno = true
    supabase
      .from('fantasy_teams')
      .select('competition_id')
      .eq('owner_id', uporabnik)
      .eq('hisna', false)
      .order('id')
      .then(({ data }) => {
        if (veljavno) setEkipeLige({ uporabnik, liga: ligaEkip(data ?? [], tekmovanja) })
      })
    return () => {
      veljavno = false
    }
  }, [uporabnik, tekmovanja])

  // Nov obiskovalec brez izbire dobi ligo svojih ekip ali privzeto ligo
  // SVOJE države (Slovak ne pristane na Gorenjski). Kdor ligo že ima, tega ne
  // doživi — izbira je izrecna in država sledi ligi. Za Slovenijo je privzeta
  // ista kot doslej. Ista pot velja za neznano ligo v naslovu (tipkarska
  // napaka, stara povezava), da stran ne ostane prazna.
  // Dokler začetna liga ni odločena, jezika ne popravljamo: sicer bi
  // slovaški obiskovalec med čakanjem na ugib (liga je še `clani`) dobil
  // slovenščino in stran bi se naložila dvakrat.
  const [ustaljena, setUstaljena] = useState(() => izrecno.current)
  useEffect(() => {
    if (!tekmovanja.length) return
    const znana = tekmovanja.some((t) => t.slug === slug)
    if (znana && izrecno.current) {
      setUstaljena(true)
      return
    }
    // Počakamo na sejo in (prijavljen) na njegove ekipe ter na ugib.
    if (nalagaSeja || ugib === undefined) return
    if (uporabnik && ekipeLige?.uporabnik !== uporabnik) return
    const ligaEkipZdaj = uporabnik ? (ekipeLige?.liga ?? null) : null
    // Nov obiskovalec z IP-jem iz države brez lig ne pristane tiho v
    // Sloveniji: zapomnimo si ga kot tujca (angleščina, vprašanje po državi).
    // Liga ekip prijavljenega ima prednost; neuspel IP ni tujec.
    const ip = ugib?.ip
    if (!izrecno.current && !ligaEkipZdaj && ip && zaznajTujca() && jeTujIp(ip, drzaveZLigami(tekmovanja))) {
      zapomniTujca(ip)
      setTujecKoda(ip)
    }
    const nova = zacetnaLiga({
      vse: tekmovanja,
      slug,
      izrecno: izrecno.current,
      ligaEkip: ligaEkipZdaj,
      ugib: ugib?.drzava ?? null,
    })
    if (nova && nova !== slug) setSlug(nova)
    setUstaljena(true)
  }, [tekmovanja, slug, ugib, nalagaSeja, uporabnik, ekipeLige])

  useEffect(() => {
    if (!izrecno.current) return
    try {
      localStorage.setItem(KLJUC, slug)
    } catch {
      /* zasebno okno — izbira velja le za to sejo */
    }
  }, [slug])

  const tekmovanje = prikaz.find((t) => t.slug === slug) ?? null
  const { drzava, lige } = useMemo(
    () => ligeDrzave(prikaz, slug, ugib?.drzava ?? null),
    [prikaz, slug, ugib],
  )

  // Jezik sledi državi lige. Ob nalaganju ga jedro prevodov ugane iz šifre
  // lige; ko je seznam lig znan, ga tu po potrebi popravimo (en ponovni
  // nalog). Za Slovenca je država Slovenija in jezik že slovenski — nič se ne
  // zgodi. Izbira z izbirnika jezika in tujec (angleščina) imata prednost
  // (`jezikObiskovalca`).
  useEffect(() => {
    if (!tekmovanja.length || !ustaljena) return
    // Vstop s povezave /sk stran naloži znova sam — dvojni nalog bi le utripal.
    if (drzavaVstopa(pathname)) return
    const zeljen = jezikObiskovalca(drzava)
    if (jePripravljen(zeljen) && zeljen !== jezik()) {
      // Ligo v naslovu je dodala aplikacija (ugib), ne obiskovalec — po
      // ponovnem nalaganju naj vseeno dobi vprašanje, kje želi igrati.
      if (!izrecno.current) oznaciVstopDrzave()
      nastaviJezik(zeljen)
    }
  }, [tekmovanja.length, ustaljena, drzava, pathname, tujecKoda])

  return (
    <Kontekst.Provider
      value={{
        slug,
        id: tekmovanje?.id ?? null,
        tekmovanje,
        tekmovanja: lige,
        vsaTekmovanja: prikaz,
        ligeSveze: tekmovanja.length > 0,
        drzava,
        vprasajDrzavo: Boolean(tujecKoda) && !imaDrzavo,
        brezLig: ligeNalozene && !tekmovanja.length,
        nastavi,
      }}
    >
      {children}
    </Kontekst.Provider>
  )
}

/**
 * Pot z ligo v naslovu (`?t=<slug>`), da jo iskalnik in deljena povezava
 * odpreta v pravi ligi, ne v privzeti. Pot, ki ligo že ima, ostane; strani
 * brez lige (`jeBrezLige`) in povezave ven je ne dobijo.
 */
export function zLigo(pot: string, slug: string | null | undefined): string {
  if (!slug || !pot.startsWith('/') || jeBrezLige(pot.split(/[?#]/)[0])) return pot
  const u = new URL(pot, 'http://x')
  if (u.searchParams.has('t')) return pot
  u.searchParams.set('t', slug)
  return u.pathname + u.search + u.hash
}

/** Kanonični naslov strani nosi ligo vsebine (`useLigaStrani`); privzeta je brez `?t=`. */
export function useKanonicnaLiga(slug: string | null | undefined): void {
  useLigaStrani(slug == null ? undefined : slug === PRIVZETO ? null : slug)
}

/**
 * `id` je null, dokler se seznam lig ne naloži — dokler je, naj strani ne
 * poizvedujejo, sicer bi za hip pokazale igralce obeh lig skupaj.
 */
export function useTekmovanje(): KontekstVrednost {
  return useContext(Kontekst)
}
