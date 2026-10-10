// Kartica gola z glasovanjem o asistenci. Ista je na strani Asistence in na
// strani posamezne tekme, zato živi tu.
//
// Kdaj je glasovanje zaključeno:
//   - asistenca je potrjena (dovolj glasov za istega igralca) — od tod naprej
//     je zaklenjeno, glasovi ne morejo več ničesar spremeniti,
//   - skupnost je z dovolj glasovi rekla »nihče« — gol ostane brez asistence
//     in prav tako ne čaka več,
//   - gol je bil iz enajstmetrovke ali avtogol — asistence po pravilih ni.
import { useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from './Povezava'
import { useAuth } from '../lib/useAuth'
import { povezavaNaPrijavo } from '../lib/prijava'
import { useNastavitev } from '../lib/nastavitve'
import { prikazniIme, razredPozicije, KRATKA_POZICIJA } from '../lib/pomozno'
import type { Pozicija } from '../lib/tipi'
import { t, tx } from '../i18n'

/** Gol, o katerem skupnost glasuje o asistenci. */
export interface Gol {
  id: number
  minute?: number | null
  team_id?: number | null
  is_own_goal?: boolean | null
  is_penalty?: boolean | null
  assist_player_id?: number | null
  score_home?: number | null
  score_away?: number | null
  scorer?: { id?: number | null; full_name?: string | null } | null
  assist?: { full_name?: string | null } | null
}

export interface Tekma {
  /** Liga tekme — prag glasov je njen, ne lige, izbrane v meniju. */
  competition_id?: number | null
  home_team_id?: number | null
  home_name?: string | null
  away_name?: string | null
}

/** Nastop na tekmi — kandidat za asistenco. */
export interface Kandidat {
  player_id: number
  shirt_number?: number | null
  team_id?: number | null
  minutes_played?: number | null
  players?: { full_name?: string | null; position?: Pozicija | null } | null
}

/** Seštevek glasov za enega kandidata; `player_id: null` pomeni "brez asistence". */
export interface Glas {
  player_id: number | null
  votes: number
}

// Privzetek; dejanski prag pripada ligi (`competition_settings`), zato ga
// funkcije spodaj sprejmejo kot argument. Ista številka je privzetek tudi v
// `potrdi_asistenco` na strežniku.
export const PRAG_ASISTENCE_PRIVZETO = 3

/**
 * Številka dresa — neposredno iz zapisnika te tekme, ne iz profila igralca
 * (dres se med sezono lahko zamenja). Enak podpis kot v zapisniku ("16 —
 * Priimek Ime"), da je iskanje pravega podajalca na igrišču hitrejše.
 */
function StDres({ st }: { st?: number | null }) {
  if (st == null) return null
  return (
    <span className="znacka shrink-0 bg-white/10 font-mono tabular-nums text-slate-400">
      {st}
    </span>
  )
}

/** Ali gol sploh lahko dobi asistenco. */
export const lahkoImaAsistenco = (gol: Gol) => !gol.is_own_goal && !gol.is_penalty

/** Ali je skupnost odločila, da gol nima asistence. */
// `_gol` se ne bere — odlocijo samo glasovi. Parameter ostaja zaradi klicnih
// mest, ki ga podajajo, in ker je simetricen z `lahkoImaAsistenco(gol)`.
export const brezAsistencePotrjeno = (
  _gol: Gol,
  glasovi: Glas[] = [],
  prag: number = PRAG_ASISTENCE_PRIVZETO,
) => {
  const vodilni = glasovi[0]
  return Boolean(vodilni && vodilni.player_id == null && vodilni.votes >= prag)
}

/** Ali gol še čaka na odločitev skupnosti. */
export const caka = (
  gol: Gol,
  glasovi: Glas[] = [],
  prag: number = PRAG_ASISTENCE_PRIVZETO,
) =>
  lahkoImaAsistenco(gol) &&
  !gol.assist_player_id &&
  !brezAsistencePotrjeno(gol, glasovi, prag)

function Zakljucek({
  gol,
  ikona,
  besedilo,
  opomba,
}: {
  gol: Gol
  ikona: string
  besedilo: string
  opomba: string
}) {
  return (
    <li className="px-3 py-2.5 opacity-70 sm:px-4">
      <div className="flex items-center gap-2.5 text-sm">
        <span className="w-9 shrink-0 font-bold tabular-nums text-slate-500">
          {gol.minute}&apos;
        </span>
        <span aria-hidden="true">{ikona}</span>
        <span className="min-w-0 flex-1 truncate text-slate-300">
          {besedilo}
        </span>
        <span className="shrink-0 text-xs text-slate-500">{opomba}</span>
      </div>
    </li>
  )
}

export default function GolZaGlasovanje({
  gol,
  tekma,
  kandidati,
  nastopi = kandidati,
  glasovi = [],
  mojGlas,
  omogoceno,
  pravkar,
  onGlasuj,
}: {
  gol: Gol
  tekma?: Tekma | null
  kandidati: Kandidat[]
  nastopi?: Kandidat[]
  glasovi?: Glas[]
  mojGlas?: number | null
  omogoceno?: boolean
  pravkar?: boolean
  onGlasuj: (golId: number, playerId: number | null) => void
}) {
  const [odprto, setOdprto] = useState(false)
  const { session } = useAuth()
  const lokacija = useLocation()
  const kartica = useRef<HTMLLIElement>(null)
  // Po glasu seznam zapremo in kartico vrnemo na zaslon — na telefonu je
  // seznam podajalcev daljši od zaslona.
  const glasuj = (playerId: number | null) => {
    onGlasuj(gol.id, playerId)
    setOdprto(false)
    kartica.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
  const potrjeno = Boolean(gol.assist_player_id)
  const stGlasov: Record<string, number> = Object.fromEntries(
    glasovi.map((v) => [String(v.player_id), v.votes]),
  )
  const vodilni = glasovi[0]
  // Prag lige, v kateri je bila tekma odigrana. Tekma iz deljene povezave ni
  // nujno iz lige v meniju; brez znane lige velja ta iz menija.
  const prag = useNastavitev(tekma?.competition_id ?? undefined)(
    'prag_glasov_asistenca',
    PRAG_ASISTENCE_PRIVZETO,
  )
  const brezAsistence = brezAsistencePotrjeno(gol, glasovi, prag)
  const zakljuceno = potrjeno || brezAsistence

  // Strelec je iz `kandidati` izločen (nihče si ne da asistence), zato
  // njegovo številko poiščemo v vseh nastopih tekme, ne v seznamu kandidatov.
  const stDresa: Record<string, number | null | undefined> = Object.fromEntries(
    (nastopi ?? []).map((n) => [String(n.player_id), n.shirt_number]),
  )

  const domaci = gol.team_id === tekma?.home_team_id
  const ekipa = {
    name: domaci ? tekma?.home_name : tekma?.away_name,
  }

  const ime = prikazniIme(gol.scorer?.full_name) || t('tekme.gol.neznanStrelec')

  if (gol.is_own_goal)
    return (
      <Zakljucek
        gol={gol}
        ikona="🙈"
        besedilo={t('tekme.gol.avtogol', { ime })}
        opomba={t('tekme.gol.brezAsistenceOpomba')}
      />
    )

  // Enajstmetrovka: strelec je sam pri žogi, asistence ni in o njej se ne
  // glasuje. Prej se je zanjo dalo glasovati in je gol večno čakal.
  if (gol.is_penalty)
    return (
      <Zakljucek
        gol={gol}
        ikona="⚽"
        besedilo={t('tekme.gol.enajstmetrovka', { ime })}
        opomba={t('tekme.gol.brezAsistenceOpomba')}
      />
    )

  return (
    <li ref={kartica} className={`overflow-hidden ${pravkar ? 'animiraj-pulz' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-3 py-2.5 sm:px-4">
        <span className="w-9 shrink-0 text-sm font-bold tabular-nums text-gnl-300">
          {gol.minute}&apos;
        </span>
        <div className="min-w-[8rem] flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <StDres st={stDresa[String(gol.scorer?.id)]} />
            <strong className="truncate font-semibold">{ime}</strong>
          </div>
          <div className="text-xs text-slate-500">
            {ekipa?.name}
            {/* Sportnet trenutnega izida ob golu ne da — brez njega ostane gola " · :". */}
            {gol.score_home != null && gol.score_away != null && ` · ${gol.score_home}:${gol.score_away}`}
          </div>
        </div>

        {potrjeno && (
          <div className="flex w-full items-center gap-1.5 pl-[2.875rem] text-sm sm:w-auto sm:pl-0">
            <StDres st={stDresa[String(gol.assist_player_id)]} />
            <span className="font-semibold text-gnl-200">{prikazniIme(gol.assist?.full_name)}</span>
            <span className="text-xs text-gnl-400/80">· {t('tekme.gol.potrjena')}</span>
          </div>
        )}

        {!potrjeno && brezAsistence && (
          <div className="w-full pl-[2.875rem] text-sm sm:w-auto sm:pl-0">
            <span className="font-semibold text-slate-200">{t('tekme.gol.brezAsistence')}</span>{' '}
            <span className="text-xs text-slate-500">· {t('tekme.gol.odlocilaSkupnost')}</span>
          </div>
        )}

        {!zakljuceno && !session && (
          <Link
            to={povezavaNaPrijavo(lokacija.pathname + lokacija.search)}
            className="text-sm font-semibold text-gnl-300 hover:underline"
          >
            {t('tekme.tekma.prijaviSe')}
          </Link>
        )}

        {!zakljuceno && session && (
          <button
            onClick={() => setOdprto(!odprto)}
            disabled={!omogoceno}
            className={`${odprto ? 'gumb-tih' : 'gumb-glavni'} px-3 py-1.5 text-sm`}
            title={omogoceno ? undefined : t('tekme.gol.morasSePrijaviti')}
          >
            {odprto
              ? t('skupno.zapri')
              : mojGlas !== undefined
                ? t('tekme.gol.spremeniGlas')
                : t('tekme.gol.kdoJePodal')}
          </button>
        )}
      </div>

      {/* Napredek do praga je viden tudi pod pragom, da uporabnik ve, koliko
          glasov je zbranih in kdo vodi. */}
      {!zakljuceno && vodilni && (
        <div className="space-y-2 border-t border-white/5 px-3 pb-3 pt-3 sm:px-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-sm">
              {vodilni.player_id == null ? (
                <strong className="text-slate-200">{t('tekme.gol.vodiBrez')}</strong>
              ) : (
                tx(
                  'tekme.gol.vodi',
                  {
                    ime:
                      (stDresa[String(vodilni.player_id)] != null
                        ? `${stDresa[String(vodilni.player_id)]} — `
                        : '') +
                      (prikazniIme(
                        kandidati.find((k) => k.player_id === vodilni.player_id)
                          ?.players?.full_name,
                      ) || t('tekme.gol.igralecBrezZapisa')),
                  },
                  { b: (v) => <strong className="text-gnl-200">{v}</strong> },
                )
              )}
            </div>
            <span className="tabular-nums text-sm font-black text-gnl-300">
              {vodilni.votes} / {prag}{' '}
              <span className="text-xs font-normal text-slate-500">
                {t('tekme.gol.doOdlocitve', { n: Math.max(0, prag - vodilni.votes) })}
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gnl-500 to-gnl-300 transition-all duration-300"
              style={{
                width: `${Math.min(100, (vodilni.votes / prag) * 100)}%`,
              }}
            />
          </div>
          {glasovi.length > 1 && (
            <div className="text-xs text-slate-500">
              {t('tekme.gol.ostali')}{' '}
              {glasovi
                .slice(1)
                .map((g) =>
                  g.player_id == null
                    ? t('tekme.gol.brezGlasovi', { n: g.votes })
                    : `${
                        stDresa[String(g.player_id)] != null
                          ? `${stDresa[String(g.player_id)]} — `
                          : ''
                      }${
                        prikazniIme(
                          kandidati.find((k) => k.player_id === g.player_id)
                            ?.players?.full_name,
                        ) || '?'
                      } (${g.votes})`,
                )
                .join(' · ')}
            </div>
          )}
        </div>
      )}

      {odprto && !zakljuceno && (
        <div className="animiraj-vstop border-t border-white/10 p-3 sm:p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">
            {t('tekme.gol.izberiPodajalca', { ekipa: ekipa?.name })}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {kandidati.map((k) => {
              const izbran = mojGlas === k.player_id
              const n = stGlasov[String(k.player_id)] ?? 0
              return (
                <button
                  key={k.player_id}
                  onClick={() => glasuj(k.player_id)}
                  aria-pressed={izbran}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                    izbran
                      ? 'bg-gnl-500/25 ring-2 ring-gnl-400'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <StDres st={k.shirt_number} />
                  <span className={`znacka shrink-0 ${razredPozicije(k.players?.position)}`}>
                    {(k.players?.position && KRATKA_POZICIJA[k.players.position]) ?? '?'}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {prikazniIme(k.players?.full_name)}
                  </span>
                  {n > 0 && (
                    <span className="tabular-nums text-xs text-slate-400">{n}</span>
                  )}
                  {izbran && <span className="text-gnl-300" aria-hidden="true">✓</span>}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => glasuj(null)}
            // mojGlas je null, če je uporabnik glasoval za "nihče",
            // in undefined, če še ni glasoval
            className={`mt-3 w-full rounded-xl px-3 py-2 text-sm transition ${
              mojGlas === null
                ? 'bg-white/15 ring-1 ring-white/30'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t('tekme.gol.nihce')}
          </button>
        </div>
      )}
    </li>
  )
}
