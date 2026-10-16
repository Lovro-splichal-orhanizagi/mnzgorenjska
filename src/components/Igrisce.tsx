// Igrišče s prvo postavo in klopjo — razporeditev je enaka kot v Premier
// League Fantasy: v vrsticah od vratarja do napadalcev, pod igriščem pa štirje
// rezervni igralci.
//
// Mere so mobile-first: na telefonu mora vrsta petih branilcev ostati v eni
// vrstici. Širina kartice je zato del širine VRSTE, ne zaslona: pet kartic in
// štirje razmiki (gap-2.5) dajo (100% − 2.5rem) / 5 = 20% − 0.5rem; vzamemo
// 0.55rem za rezervo pri zaokroževanju. `vw` je štel tudi drsnik in robove,
// zato se je vrsta pri 375–390 px prelomila. Od `sm` navzgor se poveča.
import { POZICIJE, VRSTNI_RED, lahkoZacne, lahkoZamenjata } from '../lib/pravila'
import {
  KRATKA_POZICIJA,
  prikazniIme,
} from '../lib/pomozno'
import { useEffect, useState, type ReactNode } from 'react'
import type { IgralecVKadru, Pozicija } from '../lib/tipi'
import Grb from './Grb'
import Dres from './Dres'
import ZnakPreverjen from './ZnakPreverjen'
import { t, stevilo } from '../i18n'

/** Igralec na igriscu — kader plus polja, ki jih potrebuje prikaz. */
export interface IgralecNaIgriscu extends IgralecVKadru {
  id: number | string
  full_name?: string | null
  team_name?: string | null
  team_short?: string | null
  team_logo?: string | null
  tocke_krog?: number | null
  /** `false`, ko igralec ni več v ligi — baza takšen kader zavrne. */
  active?: boolean | null
  /** Zadnje poročilo o poškodbi/odsotnosti; ekipa ostane veljavna. */
  odsotnost?: { vrsta: 'poskodba' | 'odsotnost'; opis: string } | null
}

function KarticaIgralca({
  igralec,
  naKlik,
  naOdstrani,
  zatemnjen,
  premik,
  naInfo,
  izbira,
  izbranIme,
}: {
  igralec: IgralecNaIgriscu
  naKlik: () => void
  /** Menjava s tapom: ta je izbran, je cilj ali (med izbiro) ni cilj. */
  izbira?: 'izbran' | 'cilj' | 'ne'
  izbranIme?: string
  naOdstrani: () => void
  naInfo?: () => void
  zatemnjen?: boolean
  /** Na klopi: premik v vrstnem redu menjav (null = na robu). */
  premik?: { gor: (() => void) | null; dol: (() => void) | null }
}) {
  const ime = prikazniIme(igralec.full_name)
  return (
    <div
      data-zamenjava
      className={`group relative w-[min(3.9rem,calc(20%-0.55rem))] text-center sm:w-[4.75rem] ${
        izbira === 'ne' ? 'opacity-40' : zatemnjen && !izbira ? 'opacity-70' : ''
      }`}
    >
      {/* Dres z značkami je svoj relativni okvir: ✕ se sidra nanj, ne na
          celo kartico — sicer bi na klopi prekril puščici pod njim.
          Kartica ima dve dejanji brez dodatnih gumbov: dres izbere igralca
          za menjavo (nato tap na označenega soigralca), ime s ceno odpre
          podatke (tam je tudi "Odstrani"). ✕ je le bližnjica ob lebdenju na
          računalniku. */}
      <div className="relative">
      <button
        onClick={naKlik}
        aria-pressed={izbira === 'izbran'}
        aria-label={
          izbira === 'izbran'
            ? t('mojaEkipa.igrisce.prekliciIzbiro', { ime })
            : izbira === 'cilj'
              ? t('mojaEkipa.igrisce.zamenjajZ', { ime, drugi: izbranIme ?? '' })
              : t('mojaEkipa.igrisce.izberiZaMenjavo', { ime })
        }
        className={`flex w-full justify-center rounded-lg pb-0.5 transition duration-150 active:scale-95 sm:hover:-translate-y-0.5 ${
          izbira === 'izbran'
            ? 'bg-amber-300/30 ring-2 ring-amber-300'
            : izbira === 'cilj'
              ? 'animate-pulse bg-gnl-400/25 ring-2 ring-gnl-300'
              : ''
        }`}
      >
        <Dres pozicija={igralec.position} razred="h-7 w-8 sm:h-9 sm:w-10" igralecId={igralec.id} />
      </button>
      <button
        onClick={naInfo ?? naKlik}
        aria-label={naInfo ? t('mojaEkipa.trg.podatki', { ime }) : undefined}
        title={naInfo ? t('mojaEkipa.trg.podatkiNamig') : undefined}
        className="block w-full transition duration-150 active:scale-95"
      >
        <div className="flex items-center justify-center rounded-t-md bg-slate-900/90 px-1 py-0.5 text-[11px] font-semibold leading-tight">
          <span className="min-w-0 truncate">{ime.split(' ').slice(-1)[0]}</span>
          <ZnakPreverjen id={igralec.id} velikost={10} className="ml-0.5 shrink-0" />
        </div>
        {igralec.active === false && (
          <div
            title={t('mojaEkipa.igrisce.niVecVLigiNamig')}
            className="bg-rose-500 px-0.5 text-[8px] font-black uppercase leading-tight text-white sm:text-[9px]"
          >
            {t('mojaEkipa.igrisce.niVecVLigi')}
          </div>
        )}
        {igralec.active !== false && igralec.odsotnost && (
          <div
            title={igralec.odsotnost.opis}
            className="bg-amber-400 px-0.5 text-[8px] font-black uppercase leading-tight text-slate-950 sm:text-[9px]"
          >
            {igralec.odsotnost.vrsta === 'poskodba'
              ? t('mojaEkipa.igrisce.poskodba')
              : t('mojaEkipa.igrisce.odsoten')}
          </div>
        )}
        {/* Brez "M€": na ozki kartici bi se cena prelomila v dve vrstici. */}
        <div className="flex items-center justify-center gap-1 whitespace-nowrap rounded-b-md bg-gnl-500/90 px-1 py-0.5 text-[10px] font-bold leading-tight tabular-nums text-slate-950">
          <Grb
            ime={igralec.team_name}
            kratko={igralec.team_short}
            logo={igralec.team_logo}
            velikost={11}
          />
          {stevilo(Number(igralec.value ?? 0), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </div>
      </button>

      {(igralec.is_captain || igralec.is_vice) && (
        <span
          title={
            igralec.is_captain
              ? t('mojaEkipa.igrisce.kapetan')
              : t('mojaEkipa.igrisce.namestnik')
          }
          className={`absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full
                      text-[9px] font-black ring-1 sm:h-5 sm:w-5 sm:text-[10px] ${
                        igralec.is_captain
                          ? 'bg-amber-300 text-slate-950 ring-amber-200'
                          : 'bg-slate-800 text-amber-200 ring-amber-300/40'
                      }`}
        >
          {igralec.is_captain
            ? t('mojaEkipa.oznaka.kapetan')
            : t('mojaEkipa.oznaka.namestnik')}
        </span>
      )}

      {/* Točke zadnjega odigranega kroga — zgoraj desno, ista barva (fuchsia)
          za vse igralce, da je enako berljivo in ne mislimo o gradientu. */}
      {igralec.tocke_krog != null && (
        <span
          title={t(
            igralec.is_captain
              ? 'mojaEkipa.igrisce.tockeKrogaKapetan'
              : 'mojaEkipa.igrisce.tockeKroga',
            { tocke: igralec.tocke_krog },
          )}
          className="absolute -right-1 -top-1 z-10 flex min-w-[1.35rem] items-center
                     justify-center rounded-full bg-fuchsia-500 px-1 py-0.5 text-[11px]
                     font-black leading-none text-white ring-1 ring-fuchsia-200/60
                     shadow-sm shadow-black/40 sm:min-w-[1.6rem] sm:text-xs"
        >
          {igralec.tocke_krog}
        </span>
      )}

      {/* Na računalniku ✕ ob lebdenju; na dotik je "Odstrani" v podatkih igralca. */}
      <button
        onClick={naOdstrani}
        title={t('mojaEkipa.igrisce.odstraniIzKadra')}
        aria-label={t('mojaEkipa.igrisce.odstrani', { ime })}
        className="absolute -right-2 top-5 hidden h-8 w-8 items-center justify-center
                   text-slate-300 hover:text-rose-400 lg:group-hover:flex"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/90 text-[10px] ring-1 ring-white/20">
          ✕
        </span>
      </button>
      </div>

      {/* z-20: puščici ostaneta nad ✕ soseda. */}
      {premik && (
        <div className="relative z-20 mt-1.5 flex justify-center gap-1">
          <button
            onClick={premik.gor ?? undefined}
            disabled={!premik.gor}
            aria-label={t('mojaEkipa.igrisce.prejIme', { ime })}
            title={t('mojaEkipa.igrisce.prej')}
            className="h-9 min-w-0 flex-1 rounded-md bg-white/10 text-sm text-slate-200 hover:bg-white/20 disabled:opacity-30"
          >
            ←
          </button>
          <button
            onClick={premik.dol ?? undefined}
            disabled={!premik.dol}
            aria-label={t('mojaEkipa.igrisce.poznejeIme', { ime })}
            title={t('mojaEkipa.igrisce.pozneje')}
            className="h-9 min-w-0 flex-1 rounded-md bg-white/10 text-sm text-slate-200 hover:bg-white/20 disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}

function PraznoMesto({
  pozicija,
  naKlik,
}: {
  pozicija: Pozicija
  naKlik: (p: Pozicija) => void
}) {
  return (
    <button
      onClick={() => naKlik(pozicija)}
      title={t('mojaEkipa.igrisce.izberi', {
        pozicija: POZICIJE[pozicija].naslov.toLowerCase(),
      })}
      className="flex h-[3.6rem] w-[min(3.9rem,calc(20%-0.55rem))] flex-col items-center justify-center gap-0.5
                 rounded-lg border-2 border-dashed border-white/25 text-white/60
                 transition active:scale-95 hover:border-gnl-300 hover:bg-white/10
                 hover:text-white sm:h-[4.6rem] sm:w-[4.75rem] sm:gap-1"
    >
      <span className="text-base leading-none sm:text-lg">＋</span>
      <span className="text-[9px] font-bold uppercase tracking-wide sm:text-[10px]">
        {KRATKA_POZICIJA[pozicija]}
      </span>
    </button>
  )
}

const NAMIG_KLJUC = 'slff-namig-zamenjave'

const Vrsta = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-start justify-center gap-2.5 sm:gap-3">
    {children}
  </div>
)

export default function Igrisce({
  izbrani,
  naPreklopPrvo,
  naOdstrani,
  naPraznoMesto,
  naPremakniKlop,
  naInfo,
  naZamenjaj,
}: {
  izbrani: IgralecNaIgriscu[]
  naPreklopPrvo: (i: IgralecNaIgriscu) => void
  naOdstrani: (i: IgralecNaIgriscu) => void
  naPraznoMesto: (p: Pozicija) => void
  /** Vrstni red klopi; brez njega se klop ne da preurejati. */
  naPremakniKlop?: (i: IgralecNaIgriscu, smer: -1 | 1) => void
  /** Podatki o igralcu (statistika, cena) brez zapuščanja strani. */
  naInfo?: (i: IgralecNaIgriscu) => void
  /** Menjava med postavo in klopjo (prvi je izbrani, drugi cilj). */
  naZamenjaj: (a: IgralecNaIgriscu, b: IgralecNaIgriscu) => void
}) {
  const prvi = izbrani.filter((i) => i.is_starter && i.position)
  const [izbranId, setIzbranId] = useState<IgralecNaIgriscu['id'] | null>(null)
  const izbran = izbrani.find((i) => i.id === izbranId) ?? null
  const [namig, setNamig] = useState(() => {
    try {
      return !localStorage.getItem(NAMIG_KLJUC)
    } catch {
      return false
    }
  })

  // Tap drugam ali Esc prekliče izbiro.
  useEffect(() => {
    if (izbranId == null) return
    const drugam = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.('[data-zamenjava]')) setIzbranId(null)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIzbranId(null)
    }
    document.addEventListener('pointerdown', drugam)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', drugam)
      document.removeEventListener('keydown', esc)
    }
  }, [izbranId])

  function zapriNamig() {
    setNamig(false)
    try {
      localStorage.setItem(NAMIG_KLJUC, '1')
    } catch {
      /* zasebno okno */
    }
  }

  function naKlik(i: IgralecNaIgriscu) {
    if (izbran?.id === i.id) return setIzbranId(null)
    if (izbran && lahkoZamenjata(izbran, i, prvi)) {
      setIzbranId(null)
      if (namig) zapriNamig()
      return naZamenjaj(izbran, i)
    }
    // Brez pozicije (sporočilo) ali prosto mesto v postavi: kot doslej.
    if (!i.position || (!i.is_starter && lahkoZacne(i.position, prvi))) {
      setIzbranId(null)
      return naPreklopPrvo(i)
    }
    setIzbranId(i.id)
  }

  const izbira = (i: IgralecNaIgriscu) =>
    !izbran ? undefined : izbran.id === i.id ? 'izbran' : lahkoZamenjata(izbran, i, prvi) ? 'cilj' : 'ne'
  const izbranIme = izbran ? prikazniIme(izbran.full_name) : undefined
  const imaCilje = izbran != null && izbrani.some((i) => lahkoZamenjata(izbran, i, prvi))
  const klop = izbrani.filter((i) => !i.is_starter && i.position)
  const neuvrsceni = izbrani.filter((i) => !i.position)

  // Prazna mesta razporedimo tako, da igrišče pokaže privzeto postavo
  // (1-4-4-2), preostanek kadra pa pristane na klopi.
  const manjka = {} as Record<Pozicija, number>
  const naIgriscu = {} as Record<Pozicija, number>
  for (const koda of VRSTNI_RED) {
    const vKadru = izbrani.filter((i) => i.position === koda).length
    manjka[koda] = Math.max(0, POZICIJE[koda].kader - vKadru)
    const vPostavi = prvi.filter((i) => i.position === koda).length
    naIgriscu[koda] = Math.min(
      manjka[koda],
      Math.max(0, POZICIJE[koda].privzeto - vPostavi),
    )
  }

  return (
    <div className="space-y-3">
      {(izbran || (namig && prvi.length > 0)) && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300"
        >
          <span className="min-w-0 flex-1">
            {izbran
              ? imaCilje
                ? t('mojaEkipa.igrisce.izbran', { ime: izbranIme ?? '' })
                : t('mojaEkipa.igrisce.brezMenjave', { ime: izbranIme ?? '' })
              : t('mojaEkipa.igrisce.namigZamenjave')}
          </span>
          {!izbran && (
            <button
              onClick={zapriNamig}
              aria-label={t('mojaEkipa.igrisce.zapriNamig')}
              className="-my-1 h-8 w-8 shrink-0 rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          )}
        </p>
      )}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#14603f] to-[#0b3d2e] p-2 shadow-xl shadow-black/30 sm:rounded-3xl sm:p-4">
        <div className="igrisce pointer-events-none absolute inset-0" />
        {/* črte igrišča */}
        <div className="pointer-events-none absolute inset-2 rounded-lg border-2 border-white/20 sm:inset-3 sm:rounded-xl" />
        <div className="pointer-events-none absolute left-1/2 top-2 h-16 w-32 -translate-x-1/2 rounded-b-lg border-x-2 border-b-2 border-white/20 sm:top-3 sm:h-24 sm:w-48" />
        <div className="pointer-events-none absolute bottom-2 left-1/2 h-0.5 w-[calc(100%-1rem)] -translate-x-1/2 bg-white/20 sm:bottom-3 sm:w-[calc(100%-1.5rem)]" />
        <div className="pointer-events-none absolute bottom-2 left-1/2 h-14 w-14 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white/20 sm:bottom-3 sm:h-20 sm:w-20" />

        <div className="relative space-y-3 py-2 sm:space-y-4 sm:py-4">
          {VRSTNI_RED.map((koda) => (
            <Vrsta key={koda}>
              {prvi
                .filter((i) => i.position === koda)
                .map((i) => (
                  <KarticaIgralca
                    key={i.id}
                    igralec={i}
                    naKlik={() => naKlik(i)}
                    naOdstrani={() => naOdstrani(i)}
                    naInfo={naInfo && (() => naInfo(i))}
                    izbira={izbira(i)}
                    izbranIme={izbranIme}
                  />
                ))}
              {Array.from({ length: naIgriscu[koda] }, (_, n) => (
                <PraznoMesto key={n} pozicija={koda} naKlik={naPraznoMesto} />
              ))}
            </Vrsta>
          ))}
        </div>
      </div>

      {/* klop — pas pod igriščem; pravilo menjav je v razdelku "Več" in v namigu */}
      <div>
        <h3
          title={t('mojaEkipa.igrisce.klopOpis')}
          className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400"
        >
          {t('mojaEkipa.igrisce.klop')}
        </h3>
        <Vrsta>
          {klop.map((i, n) => (
            <KarticaIgralca
              key={i.id}
              igralec={i}
              zatemnjen
              naKlik={() => naKlik(i)}
              naOdstrani={() => naOdstrani(i)}
              naInfo={naInfo && (() => naInfo(i))}
              izbira={izbira(i)}
              izbranIme={izbranIme}
              premik={
                naPremakniKlop && klop.length > 1
                  ? {
                      gor: n > 0 ? () => naPremakniKlop(i, -1) : null,
                      dol: n < klop.length - 1 ? () => naPremakniKlop(i, 1) : null,
                    }
                  : undefined
              }
            />
          ))}
          {VRSTNI_RED.flatMap((koda) =>
            Array.from({ length: manjka[koda] - naIgriscu[koda] }, (_, n) => (
              <PraznoMesto
                key={`${koda}-${n}`}
                pozicija={koda}
                naKlik={naPraznoMesto}
              />
            )),
          )}
        </Vrsta>
      </div>

      {neuvrsceni.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            {t('mojaEkipa.igrisce.brezPozicije')}
          </h3>
          <Vrsta>
            {neuvrsceni.map((i) => (
              <KarticaIgralca
                key={i.id}
                igralec={i}
                zatemnjen
                naKlik={() => naPreklopPrvo(i)}
                naOdstrani={() => naOdstrani(i)}
                naInfo={naInfo && (() => naInfo(i))}
              />
            ))}
          </Vrsta>
        </div>
      )}
    </div>
  )
}
