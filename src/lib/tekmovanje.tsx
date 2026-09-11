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
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { supabase } from './supabase'

export const PRIVZETO = 'clani'
const KLJUC = 'slff-tekmovanje'

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
  tekmovanja: Tekmovanje[]
  nastavi: (slug: string) => void
}

const Kontekst = createContext<KontekstVrednost>({
  slug: PRIVZETO,
  id: null,
  tekmovanje: null,
  tekmovanja: [],
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
  const [tekmovanja, setTekmovanja] = useState<Tekmovanje[]>([])
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
      if (!polno.error) return (polno.data as Tekmovanje[] | null) ?? []

      // Migracija za zveze še ni stekla — beri po stari shemi, da vmesnik
      // vseeno dobi lige.
      const staro = await supabase
        .from('competitions_view')
        .select(STOLPCI_OSNOVNI)
        .eq('active', true)
        .order('sort_order')
      return ((staro.data as Record<string, unknown>[] | null) ?? []).map(brezZveze)
    }
    naloziti().then((t) => {
      if (veljavno) setTekmovanja(t)
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
    const ukaz = uskladiTekmovanje({
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

  // Neznana liga v naslovu (tipkarska napaka, stara povezava) naj ne pusti
  // strani prazne — vrnemo se na privzeto.
  useEffect(() => {
    if (!tekmovanja.length) return
    if (!tekmovanja.some((t) => t.slug === slug)) setSlug(PRIVZETO)
  }, [tekmovanja, slug])

  useEffect(() => {
    if (!izrecno.current) return
    try {
      localStorage.setItem(KLJUC, slug)
    } catch {
      /* zasebno okno — izbira velja le za to sejo */
    }
  }, [slug])

  const tekmovanje = tekmovanja.find((t) => t.slug === slug) ?? null

  return (
    <Kontekst.Provider
      value={{
        slug,
        id: tekmovanje?.id ?? null,
        tekmovanje,
        tekmovanja,
        nastavi,
      }}
    >
      {children}
    </Kontekst.Provider>
  )
}

/**
 * `id` je null, dokler se seznam lig ne naloži — dokler je, naj strani ne
 * poizvedujejo, sicer bi za hip pokazale igralce obeh lig skupaj.
 */
export function useTekmovanje(): KontekstVrednost {
  return useContext(Kontekst)
}
