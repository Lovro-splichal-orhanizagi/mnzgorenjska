import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, type Podoben, type PosnetekIgralca, type ProfilIgralca, type SezonaIgralca, type Skupina } from '../baza'
import { napaka, odstotek, stevilo, t, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'
import { MALO_PODATKOV } from './Iskanje'

export const st = (x: number | null | undefined, mest = 2) => (x == null ? '–' : stevilo(x, mest))
export const odst = (x: number | null | undefined) => (x == null ? '–' : odstotek(Math.round(x * 100)))

/** Id iz naslova: le varno pozitivno celo število (naslov lahko kdo prilepi). */
export function idIzNaslova(id: string | undefined): number | null {
  if (!id || !/^[1-9]\d*$/.test(id)) return null
  const n = Number(id)
  return Number.isSafeInteger(n) ? n : null
}

const STOLPCI: [Kljuc, (s: SezonaIgralca) => string][] = [
  ['igralec.st.sezona', (s) => s.sezona],
  ['igralec.st.liga', (s) => s.liga],
  ['igralec.st.klub', (s) => s.klub],
  ['igralec.st.minute', (s) => String(s.minute)],
  ['igralec.st.delez', (s) => odst(s.delez_minut)],
  ['igralec.st.zacetki', (s) => odst(s.zacetki_delez)],
  ['igralec.st.goli', (s) => st(s.goli_ref_90)],
  ['igralec.st.goliPriNas', (s) => st(s.goli_90_pri_nas)],
  ['igralec.st.onoff', (s) => st(s.onoff_ref_90)],
  ['igralec.st.prejeti', (s) => st(s.prejeti_ref_90)],
  ['igralec.st.ciste', (s) => odst(s.ciste_delez)],
  ['igralec.st.vratar', (s) => st(s.vratar_ref_90)],
  ['igralec.st.kartoni', (s) => st(s.kartoni_90)],
]
/** Vratar: brez golov, z vratarskim kazalnikom; ostali brez vratarskega (stroj ga piše le za GK). */
const stolpci = (sk: Skupina) =>
  STOLPCI.filter(([k]) => (sk === 'GK' ? k !== 'igralec.st.goli' && k !== 'igralec.st.goliPriNas' : k !== 'igralec.st.vratar'))
const OPIS: Partial<Record<Kljuc, Kljuc>> = { 'igralec.st.goliPriNas': 'iskanje.goliOpis', 'igralec.st.vratar': 'igralec.st.vratarOpis' }

export function Igralec() {
  const pid = idIzNaslova(useParams().id)
  const [profil, setProfil] = useState<ProfilIgralca | null | undefined>(undefined)
  const [podobni, setPodobni] = useState<Podoben[] | null>(null)
  const [napakaI, setNapakaI] = useState<string | null>(null)
  // Napaka gumba (meja, poln seznam) profil pusti na strani.
  const [napakaA, setNapakaA] = useState<string | null>(null)
  const [dela, setDela] = useState(false)
  // Odgovor gumba za prejšnjega igralca ne sme prepisati trenutnega.
  const trenutni = useRef(pid)

  useEffect(() => {
    trenutni.current = pid
    setDela(false)
    if (pid == null) return
    let velja = true
    setProfil(undefined)
    setPodobni(null)
    setNapakaI(null)
    setNapakaA(null)
    void supabase.rpc('scout_igralec', { p_player_id: pid }).then(({ data, error }) => {
      if (!velja) return
      if (error) setNapakaI(napaka(error))
      else setProfil((data as unknown as ProfilIgralca | null) ?? null)
    })
    return () => {
      velja = false
    }
  }, [pid])

  async function opazuj(p: ProfilIgralca) {
    setDela(true)
    setNapakaA(null)
    const { error } = await supabase.rpc('scout_opazuj', { p_player_id: p.player_id, p_opazuj: !p.opazujem })
    if (trenutni.current !== p.player_id) return
    setDela(false)
    if (error) setNapakaA(napaka(error))
    else setProfil({ ...p, opazujem: !p.opazujem })
  }

  // Podobni šele na klik: vsak klic gre v dnevnik in šteje v dnevno mejo.
  async function naloziPodobne(id: number) {
    setDela(true)
    setNapakaA(null)
    const { data, error } = await supabase.rpc('scout_podobni', { p_player_id: id })
    if (trenutni.current !== id) return
    setDela(false)
    if (error) setNapakaA(napaka(error))
    else setPodobni(data ?? [])
  }

  if (pid == null) return <p className="kartica p-5 text-slate-400">{t('igralec.ni')}</p>
  if (napakaI) return <p className="opozorilo">{napakaI}</p>
  if (profil === undefined) return <Nalaganje />
  if (profil === null) return <p className="kartica p-5 text-slate-400">{t('igralec.ni')}</p>
  const p = profil
  return (
    <div className="space-y-6">
      <header className="kartica space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black naslov sm:text-3xl">{p.ime}</h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <span className={`znacka poz-${p.skupina}`}>{t(`skupina.${p.skupina}` as Kljuc)}</span>
              {p.klub} · {p.liga}
            </p>
          </div>
          <div className="cursor-help text-right" title={t('iskanje.percentilOpis')}>
            <p className="text-4xl font-black tabular-nums text-gnl-300">{Math.round(p.percentil)}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('iskanje.percentil')}</p>
          </div>
        </div>
        <p className="text-sm text-slate-300">
          {t('igralec.povzetek', { percentil: Math.round(p.percentil), skupina: t(`skupinaMed.${p.skupina}` as Kljuc), zaupanje: Math.round(p.zaupanje * 100) })}
        </p>
        <button type="button" disabled={dela} onClick={() => void opazuj(p)} className={`${p.opazujem ? 'gumb-tih' : 'gumb-glavni'} text-sm`}>
          {p.opazujem ? t('igralec.neOpazuj') : t('igralec.opazuj')}
        </button>
        {napakaA && <p className="opozorilo">{napakaA}</p>}
      </header>

      {(p.posnetkov ?? 0) > 0 && <Posnetki igralecId={p.player_id} />}

      {p.privolitev && (
        <section className="space-y-1 rounded-2xl border border-gnl-400/30 bg-gnl-400/10 p-4 text-sm text-slate-200">
          <p className="font-bold text-gnl-300">{t('igralec.odprt')}</p>
          <p>{t('igralec.letnik', { letnik: p.privolitev.letnik })}</p>
          {p.privolitev.regije.length > 0 && <p>{t('igralec.regije', { regije: p.privolitev.regije.join(', ') })}</p>}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-slate-100">{t('igralec.sezone')}</h2>
        <div className="kartica overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-white/10 text-left text-xs text-slate-400">
              <tr>
                {stolpci(p.skupina).map(([k]) => {
                  const o = OPIS[k]
                  return <th key={k} title={o && t(o)} className={`whitespace-nowrap px-3 py-2 font-semibold${o ? ' cursor-help' : ''}`}>{t(k)}</th>
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(p.sezone ?? []).map((s, i) => (
                <tr key={`${s.sezona}-${s.liga}-${s.klub}-${i}`} className="hover:bg-white/5">
                  {stolpci(p.skupina).map(([k, f]) => (
                    <td key={k} className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-300">
                      {f(s)}
                      {k === 'igralec.st.sezona' && s.zaupanje < MALO_PODATKOV && (
                        <span className="znacka ml-2 bg-white/10 text-slate-300" title={t('iskanje.maloPodatkovOpis')}>{t('iskanje.maloPodatkov')}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">{t('iskanje.opomba')}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-slate-100">{t('igralec.podobni')}</h2>
        {podobni === null ? (
          <button type="button" disabled={dela} onClick={() => void naloziPodobne(p.player_id)} className="gumb-tih text-sm">
            {t('igralec.pokaziPodobne')}
          </button>
        ) : podobni.length === 0 ? (
          <p className="text-sm text-slate-400">{t('igralec.niPodobnih')}</p>
        ) : (
          <ul className="kartica divide-y divide-white/5 overflow-hidden">
            {podobni.map((o) => (
              <li key={o.player_id}>
                <Link to={`/player/${o.player_id}`} className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-white/5">
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-100">{o.ime}</span>
                      {o.odprt_za_prestop && <span className="znacka-odprt">{t('iskanje.odprt')}</span>}
                    </span>
                    <span className="block text-xs text-slate-400">{o.klub} · {o.liga}</span>
                  </span>
                  <span className="shrink-0 text-slate-400">{t('igralec.podobnost', { p: Math.round(o.podobnost * 100) })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/**
 * Posnetki izložbe (izpostavljeni prvi). Funkcija posnetki-igralca kliče
 * `scout_posnetki` z glavo seje (scout.dostop: dnevnik in meja, scout.vidni)
 * in vrne kratkožive podpisane naslove Cloudflare Stream.
 */
function Posnetki({ igralecId }: { igralecId: number }) {
  const [posnetki, setPosnetki] = useState<PosnetekIgralca[] | null>(null)
  const [napakaP, setNapakaP] = useState(false)
  const [izbran, setIzbran] = useState<number | null>(null)
  const [predvaja, setPredvaja] = useState(false)

  useEffect(() => {
    let velja = true
    setPosnetki(null)
    setIzbran(null)
    setPredvaja(false)
    void supabase.functions
      .invoke('posnetki-igralca', { body: { akcija: 'scout', player_id: igralecId } })
      .then(({ data, error }) => {
        if (!velja) return
        if (error) setNapakaP(true)
        else setPosnetki(((data as { posnetki?: PosnetekIgralca[] } | null)?.posnetki ?? []) as PosnetekIgralca[])
      })
    return () => {
      velja = false
    }
  }, [igralecId])

  if (napakaP) return <p className="text-sm text-slate-400">{t('igralec.posnetkiNapaka')}</p>
  if (!posnetki?.length) return null
  const a = posnetki.find((x) => x.id === izbran) ?? posnetki[0]
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-100">{t('igralec.posnetki')}</h2>
        <p className="text-xs text-slate-400">{t('igralec.posnetkiOpis')}</p>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-white/10">
        {predvaja && a.predvajaj && a.tip === 'video' ? (
          <video
            src={a.predvajaj}
            poster={a.slika ?? undefined}
            controls
            autoPlay
            playsInline
            aria-label={a.naslov}
            className="absolute inset-0 h-full w-full bg-black object-contain"
          />
        ) : predvaja && a.predvajaj ? (
          <iframe
            src={`${a.predvajaj}&autoplay=true`}
            title={a.naslov}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            disabled={!a.predvajaj}
            onClick={() => setPredvaja(true)}
            aria-label={t('igralec.predvajaj', { naslov: a.naslov })}
            className="group absolute inset-0 block"
          >
            {a.slika && <img src={a.slika} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <span className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" aria-hidden="true" />
            <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-lg transition group-hover:scale-105" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
            </span>
          </button>
        )}
      </div>
      <p className="font-semibold text-slate-100">{a.naslov}</p>
      {posnetki.length > 1 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {posnetki.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => {
                  setIzbran(x.id)
                  setPredvaja(true)
                }}
                aria-pressed={x.id === a.id}
                className={`block w-full overflow-hidden rounded-xl text-left ring-1 ${x.id === a.id ? 'ring-2 ring-gnl-400' : 'ring-white/10'}`}
              >
                <span className="relative block aspect-video bg-slate-900">
                  {x.slika && <img src={x.slika} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                </span>
                <span className="block truncate px-2 py-1.5 text-xs font-semibold text-slate-200">{x.naslov}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
