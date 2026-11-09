// Orodja klepeta za podporo, ki tečejo v brskalniku (HelpStack CLIENT_SIDE).
//
// Agent v klepetu jih pokliče, ko piše odgovor: pogleda, kje je obiskovalec
// (`kje_je_uporabnik`), ga pelje na stran (`odpri_stran`) in mu na njej
// pokaže, kam klikniti (`pokazi`). Tako na "kako sestavim ekipo" ali "kje
// glasujem" ne odgovori z opisom, ampak odpre Mojo ekipo in osvetli trg.
//
// Pravila HelpStacka (docs/integrations/custom-agent-tools): odgovor v ~5 s,
// majhni navadni objekti, nič, česar obiskovalec sam ne vidi. Na strežnik
// gresta le stanje lastnih ekip prijavljenega (isto kot pas nad stranjo) in
// `moja_ekipa_krog` (isto kot Moja ekipa in zgodovina postav), oba z
// njegovo sejo in le, ko agent vpraša.
//
// Cilji za `pokazi` so elementi z atributom `data-pomoc`. Nov cilj = atribut
// na elementu + vrstica v CILJI spodaj (in v opisu orodja v HelpStacku).
//
// Neshranjen kader na Moji ekipi: orodji strani ne zapustita. Shranjevanje
// namesto obiskovalca ne pride v poštev — dodatni prestopi stanejo točke in
// kader je lahko še nepopoln. Osvetlita gumb Shrani in agentu povesta zakaj.
//
// Gumb »Pokaži mi« (HelpStack CLIENT_ACTION): `odpri_stran` in `pokazi` sta
// prijavljena dvakrat, kot orodje in kot dejanje. Katero dobi agent, določa
// tip orodja v HelpStacku. Kot orodje teče, ko agent piše odgovor — na
// telefonu pokrije stran klepet in obiskovalec ne vidi nič. Kot dejanje
// teče šele, ko obiskovalec tapne gumb; klepet se takrat umakne, neuspeh pa
// vrne `{ ok: false, message }`, ki ga obiskovalec vidi v klepetu.
import { supabase } from './supabase'
import { jeNeshranjeno } from './neshranjeno'
import { t } from '../i18n/jedro.ts'

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

/** Osvetli cilj na trenutni strani (npr. gumb Shrani po predlogu ekipe). */
export function osvetliCilj(cilj: string): boolean {
  const el = najdi(cilj)
  if (el) osvetli(el)
  return Boolean(el)
}

function osvetli(el: HTMLElement, trajanje = 4500) {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add(RAZRED)
  window.setTimeout(() => el.classList.remove(RAZRED), trajanje)
}

/** Po tapu na »Pokaži mi« obiskovalec stran šele zagleda — osvetlitev traja dlje. */
const TRAJANJE_DEJANJA = 8000

type Rezultat = Record<string, unknown>

/** Rezultat orodja kot rezultat dejanja: neuspeh z obvestilom za obiskovalca. */
function kotDejanje(r: Rezultat) {
  if (r.razlog === 'neshranjene_spremembe') return { ok: false, message: t('aplikacija.pokaziMi.neshranjeno') }
  if (r.razlog === 'neznana stran' || r.razlog === 'neznan cilj') return { ok: false, message: t('aplikacija.pokaziMi.neznano') }
  if (r.odprto === false || r.najdeno === false) return { ok: false, message: t('aplikacija.pokaziMi.niVidno') }
  return { ok: true }
}

const PRIPOMOCKI: Record<string, string> = {
  wildcard: 'Wildcard (prestopi v krogu brez kazni)',
  klop_plus: 'Klop+ (štejejo tudi točke klopi)',
}

/**
 * Ekipa prijavljenega v izbrani ligi za krog: postava, klop, kapetan,
 * točke po igralcih z množiteljem, prestopi in pripomočki. Bere isto kot
 * Moja ekipa (posnetek `fantasy_lineups` prek `tuja_postava`, točke iz
 * `fantasy_round_points`); RLS pusti le lastno ekipo. Brez kroga: zadnji
 * zaklenjen krog tekoče sezone, pred prvim rokom naslednji (trenutni kader).
 */
export async function mojaEkipaKrog(p: Record<string, unknown>, s: StanjeStrani): Promise<Rezultat> {
  if (!s.prijavljen) return { prijavljen: false }
  if (!s.liga) return { prijavljen: true, namig: 'Liga ni izbrana; naj uporabnik izbere ligo v izbirniku.' }
  const liga = s.liga
  const { data: seja } = await supabase.auth.getSession()
  const uid = seja.session?.user.id
  if (!uid) return { prijavljen: false }

  const [rEkipa, rKrogi, rNastavitve] = await Promise.all([
    supabase
      .from('fantasy_teams')
      .select('id, name')
      .eq('owner_id', uid)
      .eq('competition_id', liga.id)
      .maybeSingle(),
    supabase
      .from('rounds')
      .select('id, number, season, deadline_at, lineups_locked_at')
      .eq('competition_id', liga.id)
      .order('season', { ascending: false })
      .order('number')
      .limit(200),
    supabase.from('settings').select('key, value').in('key', ['prosti_prestopi', 'kazen_prestopa']),
  ])
  const ekipa = rEkipa.data
  if (!ekipa) return { prijavljen: true, liga: liga.ime, ekipa: null, namig: 'V tej ligi še nima ekipe.' }
  const nastavitve = Object.fromEntries((rNastavitve.data ?? []).map((n) => [n.key, Number(n.value)]))
  const prosti = nastavitve.prosti_prestopi ?? 3
  const kazen = nastavitve.kazen_prestopa ?? 4

  // Krogi tekoče sezone (prvi v seznamu je najnovejša sezona).
  const vsi = rKrogi.data ?? []
  const sezona = vsi[0]?.season ?? null
  const krogi = vsi.filter((k) => k.season === sezona)
  const zaklenjeni = krogi.filter((k) => k.lineups_locked_at)
  const stevilka = Number(p.krog)
  const krog = Number.isFinite(stevilka) && stevilka > 0
    ? krogi.find((k) => k.number === stevilka)
    : (zaklenjeni.at(-1) ?? krogi.find((k) => !k.lineups_locked_at))
  if (!krog) {
    return {
      prijavljen: true,
      ekipa: ekipa.name,
      namig: `Kroga ${p.krog ?? ''} v sezoni ${sezona ?? ''} ni.`,
      krogi: krogi.map((k) => k.number),
    }
  }

  const rChips = await supabase
    .from('fantasy_chips')
    .select('chip, round_id')
    .eq('fantasy_team_id', ekipa.id)
    .eq('season', krog.season)
  const stevilkaKroga = new Map(krogi.map((k) => [k.id, k.number]))
  const chips = rChips.data ?? []
  const pripomocki = {
    porabljeni: chips.map((c) => ({ pripomocek: PRIPOMOCKI[c.chip] ?? c.chip, krog: stevilkaKroga.get(c.round_id) ?? null })),
    na_voljo: Object.keys(PRIPOMOCKI).filter((c) => !chips.some((x) => x.chip === c)).map((c) => PRIPOMOCKI[c]),
    v_tem_krogu: chips.filter((c) => c.round_id === krog.id).map((c) => PRIPOMOCKI[c.chip] ?? c.chip),
  }
  const osnova = { prijavljen: true, liga: liga.ime, ekipa: ekipa.name, sezona: krog.season, krog: krog.number }

  if (krog.lineups_locked_at) {
    // Zaklenjen krog: posnetek ob roku in točke kot na lestvici.
    const [rPostava, rTocke, rPrestopi] = await Promise.all([
      supabase.rpc('tuja_postava', { p_team: ekipa.id, p_round: krog.id }),
      supabase
        .from('fantasy_round_points')
        .select('points, transfers, penalty, statistics_pending')
        .eq('fantasy_team_id', ekipa.id)
        .eq('round_id', krog.id)
        .maybeSingle(),
      supabase
        .from('fantasy_transfers')
        .select('transfers, free_transfers, penalty')
        .eq('fantasy_team_id', ekipa.id)
        .eq('round_id', krog.id)
        .maybeSingle(),
    ])
    const postava = rPostava.data ?? []
    if (!postava.length) return { ...osnova, namig: 'Ekipa v tem krogu ni imela postave (nastala je pozneje).' }
    const igralec = (v: (typeof postava)[number]) => ({
      ime: v.ime,
      klub: v.klub,
      pozicija: v.pozicija,
      kapetan: v.je_kapetan || undefined,
      podkapetan: v.je_namestnik || undefined,
      tock: Number(v.tocke),
      mnozitelj: v.mnozitelj,
      steje: Number(v.tocke) * v.mnozitelj,
      // Samodejne menjave: začetnik brez minute ne šteje, namesto njega igralec s klopi.
      opomba: v.je_zacetnik && v.mnozitelj === 0
        ? 'ni igral, zamenjan s klopi'
        : !v.je_zacetnik && v.mnozitelj > 0 ? 'vstopil s klopi (samodejna menjava ali Klop+)' : undefined,
    })
    const caka = rTocke.data?.statistics_pending === true
    return {
      ...osnova,
      zaklenjen: true,
      tock_kroga: caka ? null : (rTocke.data?.points ?? null),
      tocke_cakajo: caka || undefined,
      prva_postava: postava.filter((v) => v.je_zacetnik).map(igralec),
      klop: postava.filter((v) => !v.je_zacetnik).map(igralec),
      prestopi: {
        porabljenih: rTocke.data?.transfers ?? rPrestopi.data?.transfers ?? 0,
        prostih: rPrestopi.data?.free_transfers ?? prosti,
        kazen_tock: rTocke.data?.penalty ?? rPrestopi.data?.penalty ?? 0,
      },
      pripomocki,
      opomba: 'Množitelj: kapetan ima pomnožene točke; če ni igral, jih dobi podkapetan. 0 = ne šteje. Točke kroga so po kazni za prestope.',
    }
  }

  // Odprt krog: trenutni kader, prestopi glede na zadnjo zaklenjeno postavo iste sezone.
  const prejsnji = zaklenjeni.filter((k) => k.number < krog.number).at(-1)
  const [rKader, rPrej] = await Promise.all([
    supabase
      .from('fantasy_roster')
      .select('player_id, is_starter, is_captain, is_vice, bench_order')
      .eq('fantasy_team_id', ekipa.id),
    prejsnji
      ? supabase.from('fantasy_lineups').select('player_id').eq('fantasy_team_id', ekipa.id).eq('round_id', prejsnji.id)
      : Promise.resolve({ data: [] as { player_id: number }[] }),
  ])
  const kader = rKader.data ?? []
  const ids = kader.map((k) => k.player_id)
  const rImena = ids.length
    ? await supabase.from('player_overview').select('id, full_name, team_name, position').in('id', ids)
    : { data: [] }
  const poId = new Map((rImena.data ?? []).map((i) => [i.id, i]))
  const igralec = (k: (typeof kader)[number]) => {
    const i = poId.get(k.player_id)
    return {
      ime: i?.full_name ?? null,
      klub: i?.team_name ?? null,
      pozicija: i?.position ?? null,
      kapetan: k.is_captain || undefined,
      podkapetan: k.is_vice || undefined,
    }
  }
  const prej = new Set((rPrej.data ?? []).map((x) => x.player_id))
  const porabljenih = prej.size ? ids.filter((id) => !prej.has(id)).length : 0
  const wildcard = pripomocki.v_tem_krogu.includes(PRIPOMOCKI.wildcard)
  return {
    ...osnova,
    zaklenjen: false,
    rok: krog.deadline_at,
    prva_postava: kader.filter((k) => k.is_starter).map(igralec),
    klop: kader
      .filter((k) => !k.is_starter)
      .sort((a, b) => (a.bench_order ?? 99) - (b.bench_order ?? 99))
      .map(igralec),
    prestopi: prej.size
      ? {
          porabljenih,
          prostih: prosti,
          ostalo_prostih: Math.max(0, prosti - porabljenih),
          kazen_tock_ob_roku: wildcard ? 0 : Math.max(0, porabljenih - prosti) * kazen,
        }
      : { opomba: 'Ekipa še nima zaklenjene postave v tej sezoni: prestopi pred prvim rokom ne štejejo.' },
    pripomocki,
    opomba: 'Krog še ni zaklenjen: to je trenutno shranjen kader (neshranjene spremembe na strani niso vključene). Točke bodo po roku.',
  }
}

/**
 * Prijavi orodja widgetu. `stanje` vrne trenutno stanje strani (kliče se ob
 * vsakem klicu orodja, zato je vedno sveže); `pojdi` je navigate routerja.
 */
export function prijaviOrodja(
  helpstack: (ukaz: 'registerTool' | 'registerAction', ime: string, fn: (p: Record<string, unknown>) => Promise<unknown>) => void,
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

  helpstack('registerTool', 'moja_ekipa_krog', (p) => mojaEkipaKrog(p, stanje()))

  const odpriStran = async (p: Record<string, unknown>): Promise<Rezultat> => {
    const kam = STRANI[String(p.stran ?? '')]
    if (!kam) return { odprto: false, razlog: 'neznana stran', mozne: Object.keys(STRANI) }
    if (stanje().pot === kam) return { odprto: true, stran: p.stran, ze_tam: true }
    if (jeNeshranjeno()) return zadrzi()
    pojdi(kam)
    return { odprto: true, stran: p.stran }
  }

  const pokazi = async (p: Record<string, unknown>, trajanje?: number): Promise<Rezultat> => {
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
    osvetli(el, trajanje)
    return { najdeno: true, cilj }
  }

  helpstack('registerTool', 'odpri_stran', odpriStran)
  helpstack('registerTool', 'pokazi', (p) => pokazi(p))
  helpstack('registerAction', 'odpri_stran', async (p) => kotDejanje(await odpriStran(p)))
  helpstack('registerAction', 'pokazi', async (p) => kotDejanje(await pokazi(p, TRAJANJE_DEJANJA)))
}
