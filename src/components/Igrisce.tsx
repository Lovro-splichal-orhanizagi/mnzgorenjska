// Igrišče s prvo postavo in klopjo — razporeditev je enaka kot v Premier
// League Fantasy: v vrsticah od vratarja do napadalcev, pod igriščem pa štirje
// rezervni igralci.
//
// Mere so mobile-first: na telefonu mora vrsta petih branilcev ostati v eni
// vrstici. Širina kartice je zato del širine VRSTE, ne zaslona: pet kartic in
// štirje razmiki (gap-2.5) dajo (100% − 2.5rem) / 5 = 20% − 0.5rem; vzamemo
// 0.55rem za rezervo pri zaokroževanju. `vw` je štel tudi drsnik in robove,
// zato se je vrsta pri 375–390 px prelomila. Od `sm` navzgor se poveča.
import { POZICIJE, VRSTNI_RED } from '../lib/pravila'
import {
  KRATKA_POZICIJA,
  prikazniIme,
} from '../lib/pomozno'
import type { ReactNode } from 'react'
import type { IgralecVKadru, Pozicija } from '../lib/tipi'
import Grb from './Grb'
import Dres from './Dres'
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
}: {
  igralec: IgralecNaIgriscu
  naKlik: () => void
  naOdstrani: () => void
  naInfo?: () => void
  zatemnjen?: boolean
  /** Na klopi: premik v vrstnem redu menjav (null = na robu). */
  premik?: { gor: (() => void) | null; dol: (() => void) | null }
}) {
  const ime = prikazniIme(igralec.full_name)
  return (
    <div
      className={`group relative w-[min(3.9rem,calc(20%-0.55rem))] text-center sm:w-[4.75rem] ${
        zatemnjen ? 'opacity-70' : ''
      }`}
    >
      {/* Dres z značkami je svoj relativni okvir: ✕ se sidra nanj, ne na
          celo kartico — sicer bi na klopi prekril puščici pod njim.
          Kartica ima dve dejanji brez dodatnih gumbov: dres prestavi med
          postavo in klopjo, ime s ceno odpre podatke (tam je tudi
          "Odstrani"). ✕ je le bližnjica ob lebdenju na računalniku. */}
      <div className="relative">
      <button
        onClick={naKlik}
        title={
          igralec.is_starter
            ? t('mojaEkipa.igrisce.naKlop')
            : t('mojaEkipa.igrisce.vPostavo')
        }
        aria-label={`${ime}: ${
          igralec.is_starter ? t('mojaEkipa.igrisce.naKlop') : t('mojaEkipa.igrisce.vPostavo')
        }`}
        className="flex w-full justify-center pb-0.5 transition duration-150 active:scale-95 sm:hover:-translate-y-0.5"
      >
        <Dres pozicija={igralec.position} razred="h-7 w-8 sm:h-9 sm:w-10" />
      </button>
      <button
        onClick={naInfo ?? naKlik}
        aria-label={naInfo ? t('mojaEkipa.trg.podatki', { ime }) : undefined}
        title={naInfo ? t('mojaEkipa.trg.podatkiNamig') : undefined}
        className="block w-full transition duration-150 active:scale-95"
      >
        <div className="truncate rounded-t-md bg-slate-900/90 px-1 py-0.5 text-[11px] font-semibold leading-tight">
          {ime.split(' ').slice(-1)[0]}
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
}: {
  izbrani: IgralecNaIgriscu[]
  naPreklopPrvo: (i: IgralecNaIgriscu) => void
  naOdstrani: (i: IgralecNaIgriscu) => void
  naPraznoMesto: (p: Pozicija) => void
  /** Vrstni red klopi; brez njega se klop ne da preurejati. */
  naPremakniKlop?: (i: IgralecNaIgriscu, smer: -1 | 1) => void
  /** Podatki o igralcu (statistika, cena) brez zapuščanja strani. */
  naInfo?: (i: IgralecNaIgriscu) => void
}) {
  const prvi = izbrani.filter((i) => i.is_starter && i.position)
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
                    naKlik={() => naPreklopPrvo(i)}
                    naOdstrani={() => naOdstrani(i)}
                    naInfo={naInfo && (() => naInfo(i))}
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
              naKlik={() => naPreklopPrvo(i)}
              naOdstrani={() => naOdstrani(i)}
              naInfo={naInfo && (() => naInfo(i))}
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
