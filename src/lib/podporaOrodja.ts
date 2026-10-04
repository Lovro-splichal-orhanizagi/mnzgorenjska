// Orodja klepeta za podporo, ki tečejo v brskalniku (HelpStack CLIENT_SIDE).
//
// Agent v klepetu jih pokliče, ko piše odgovor: pogleda, kje je obiskovalec
// (`kje_je_uporabnik`), ga pelje na stran (`odpri_stran`) in mu na njej
// pokaže, kam klikniti (`pokazi`). Tako na "kako sestavim ekipo" ali "kje
// glasujem" ne odgovori z opisom, ampak odpre Mojo ekipo in osvetli trg.
//
// Pravila HelpStacka (docs/integrations/custom-agent-tools): odgovor v ~5 s,
// majhni navadni objekti, nič, česar obiskovalec sam ne vidi. Edini klic na
// strežnik je stanje lastnih ekip prijavljenega — isto, kar mu kaže pas nad
// stranjo — in to le, ko agent vpraša.
//
// Cilji za `pokazi` so elementi z atributom `data-pomoc`. Nov cilj = atribut
// na elementu + vrstica v CILJI spodaj (in v opisu orodja v HelpStacku).
//
// Neshranjen kader na Moji ekipi: orodji strani ne zapustita. Shranjevanje
// namesto obiskovalca ne pride v poštev — dodatni prestopi stanejo točke in
// kader je lahko še nepopoln. Osvetlita gumb Shrani in agentu povesta zakaj.
import { supabase } from './supabase'
import { jeNeshranjeno } from './neshranjeno'

/** Strani, na katere sme agent peljati — ključ je to, kar pošlje agent. */
export const STRANI: Record<string, string> = {
  domov: '/',
  moja_ekipa: '/my-team',
  igralci: '/players',
  lestvica: '/standings',
  asistence: '/assists',
  pozicije: '/positions',
  mini_lige: '/mini-leagues',
  rezultati: '/results',
  prijava: '/login',
}

/** Cilji za `pokazi` (atribut data-pomoc) in na kateri strani so. */
export const CILJI: Record<string, string> = {
  trg: 'moja_ekipa',
  dodaj: 'moja_ekipa',
  igrisce: 'moja_ekipa',
  ime_ekipe: 'moja_ekipa',
  shrani: 'moja_ekipa',
  prestopi: 'moja_ekipa',
  pripomocki: 'moja_ekipa',
  krogi: 'asistence',
  tekme: 'asistence',
  goli: 'asistence',
  izbirnik_lige: '',
}

export interface StanjeStrani {
  pot: string
  liga: { slug: string; ime: string; id: number } | null
  prijavljen: boolean
}

const RAZRED = 'pomoc-poudarek'

/** Prvi viden element s ciljem — na telefonu je trg skrit, viden je "+ Dodaj". */
function najdi(cilj: string): HTMLElement | null {
  const atribut = cilj.replace(/_/g, '-')
  const vsi = [...document.querySelectorAll<HTMLElement>(`[data-pomoc="${CSS.escape(atribut)}"]`)]
  return vsi.find((el) => el.offsetParent !== null || el.getClientRects().length > 0) ?? null
}

/** Odgovor, ko bi odhod s strani zavrgel neshranjen kader. */
function zadrzi() {
  const gumb = najdi('shrani')
  if (gumb) osvetli(gumb)
  return {
    odprto: false,
    najdeno: false,
    razlog: 'neshranjene_spremembe',
    namig:
      'Obiskovalec ima na Moji ekipi neshranjene spremembe; stran ni zamenjana, da se ne izgubijo. Gumb Shrani je osvetljen. Naj najprej shrani (ali spremembe zavrže), nato ponovi.',
  }
}

function osvetli(el: HTMLElement) {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add(RAZRED)
  window.setTimeout(() => el.classList.remove(RAZRED), 4500)
}

/**
 * Prijavi orodja widgetu. `stanje` vrne trenutno stanje strani (kliče se ob
 * vsakem klicu orodja, zato je vedno sveže); `pojdi` je navigate routerja.
 */
export function prijaviOrodja(
  helpstack: (ukaz: 'registerTool', ime: string, fn: (p: Record<string, unknown>) => Promise<unknown>) => void,
  stanje: () => StanjeStrani,
  pojdi: (pot: string) => void,
) {
  helpstack('registerTool', 'kje_je_uporabnik', async () => {
    const s = stanje()
    let ekipa: unknown = null
    if (s.prijavljen && s.liga) {
      const { data } = await supabase.rpc('stanje_mojih_ekip')
      const moja = (data ?? []).find((e) => e.competition_id === s.liga!.id)
      ekipa = moja
        ? {
            ime: moja.team_name,
            veljavna: moja.veljavna,
            razlog: moja.razlog || null,
            ob_roku_brez_tock: moja.brez_tock,
            naslednji_krog: moja.krog,
            rok: moja.rok,
          }
        : 'v tej ligi še nima ekipe'
    }
    return {
      stran: s.pot,
      liga: s.liga ? { slug: s.liga.slug, ime: s.liga.ime } : null,
      prijavljen: s.prijavljen,
      neshranjene_spremembe: jeNeshranjeno(),
      ekipa,
    }
  })

  helpstack('registerTool', 'odpri_stran', async (p) => {
    const kam = STRANI[String(p.stran ?? '')]
    if (!kam) return { odprto: false, razlog: 'neznana stran', mozne: Object.keys(STRANI) }
    if (stanje().pot === kam) return { odprto: true, stran: p.stran, ze_tam: true }
    if (jeNeshranjeno()) return zadrzi()
    pojdi(kam)
    return { odprto: true, stran: p.stran }
  })

  helpstack('registerTool', 'pokazi', async (p) => {
    const cilj = String(p.cilj ?? '')
    if (!(cilj in CILJI)) return { najdeno: false, razlog: 'neznan cilj', mozni: Object.keys(CILJI) }
    const stran = CILJI[cilj]
    if (stran && stanje().pot !== STRANI[stran]) {
      if (jeNeshranjeno()) return zadrzi()
      pojdi(STRANI[stran])
      // Stran se izriše po navigaciji; počakamo, da se cilj pojavi.
      for (let i = 0; i < 20 && !najdi(cilj); i++) await new Promise((r) => setTimeout(r, 150))
    }
    const el = najdi(cilj)
    if (!el) return { najdeno: false, cilj, namig: 'element ni viden (morda ni prijavljen ali nima ekipe)' }
    osvetli(el)
    return { najdeno: true, cilj }
  })
}
