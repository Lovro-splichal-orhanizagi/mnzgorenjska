import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { STANJA, supabase, type Dogodek as DogodekT, type Stanje } from '../baza'
import { dan, napaka, t, ura, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'
import { idIzNaslova } from './Igralec'
import { dIso, ObrazecDogodka } from './Koledar'

const BARVA: Record<Stanje, string> = {
  prisoten: 'bg-gnl-400 text-slate-950 ring-gnl-400',
  opravicen: 'bg-amber-300 text-slate-950 ring-amber-300',
  odsoten: 'bg-slate-200 text-slate-950 ring-slate-200',
}

/** Vnosi za scout_shrani_prisotnost: le igralci, katerih stanje se je spremenilo. */
export function spremembe(kader: DogodekT['kader'], izbrano: Record<number, Stanje | null>): { player_id: number; stanje: Stanje | null }[] {
  return kader
    .filter((k) => k.player_id in izbrano && izbrano[k.player_id] !== k.stanje)
    .map((k) => ({ player_id: k.player_id, stanje: izbrano[k.player_id] }))
}

export function Dogodek() {
  const id = idIzNaslova(useParams().id)
  const [d, setD] = useState<DogodekT | null>(null)
  const [napakaD, setNapakaD] = useState<string | null>(null)
  const [urejam, setUrejam] = useState(false)

  const nalozi = useCallback(() => {
    if (!id) return setNapakaD(t('napaka.splosna'))
    let velja = true
    void supabase.rpc('scout_dogodek', { p_id: id }).then(({ data, error }) => {
      if (!velja) return
      if (error) setNapakaD(napaka(error))
      else setD(data as unknown as DogodekT)
    })
    return () => {
      velja = false
    }
  }, [id])
  useEffect(nalozi, [nalozi])

  if (napakaD)
    return (
      <div className="space-y-4">
        <Link to="/calendar" className="povezava text-sm">{t('dogodek.nazaj')}</Link>
        <p className="opozorilo">{napakaD}</p>
      </div>
    )
  if (!d) return <Nalaganje />
  const z = new Date(d.zacetek)
  // Krajevni mesec: dogodek 1. 11. ob 0.30 je v UTC še 31. 10.
  const nazaj = `/calendar?m=${dIso(z).slice(0, 7)}`
  return (
    <div className="space-y-6">
      <Link to={nazaj} className="povezava inline-flex min-h-11 items-center text-sm">{t('dogodek.nazaj')}</Link>

      {urejam ? (
        <ObrazecDogodka
          selekcije={d.selekcije}
          zacetna={d}
          onShranjeno={() => {
            setUrejam(false)
            nalozi()
          }}
          onPreklic={() => setUrejam(false)}
        />
      ) : (
        <header className="kartica space-y-2 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-black naslov sm:text-3xl">{t(`vrsta.${d.vrsta}` as Kljuc)}</h1>
              <p className="text-sm capitalize text-slate-300">
                {dan(z)} · {ura(d.zacetek)}–{ura(new Date(z.getTime() + d.trajanje_min * 60000).toISOString())}
              </p>
              <p className="text-sm text-slate-400">{[d.selekcija, d.kraj, d.serija ? t('koledar.serija') : null].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setUrejam(true)} className="gumb-tih min-h-11">{t('dogodek.uredi')}</button>
              <Brisanje d={d} nazaj={nazaj} />
            </div>
          </div>
          {d.opomba && <p className="whitespace-pre-line text-sm text-slate-300">{d.opomba}</p>}
        </header>
      )}

      <Prisotnost d={d} />
    </div>
  )
}

function Brisanje({ d, nazaj }: { d: DogodekT; nazaj: string }) {
  const [odprto, setOdprto] = useState(false)
  const [napakaB, setNapakaB] = useState<string | null>(null)
  const pojdi = useNavigate()
  const brisi = async (vse: boolean) => {
    const { error } = await supabase.rpc('scout_brisi_dogodek', { p_id: d.id, p_vse_prihodnje: vse })
    if (error) setNapakaB(napaka(error))
    else pojdi(nazaj)
  }
  if (!odprto) return <button type="button" onClick={() => setOdprto(true)} className="gumb-tih min-h-11 text-rose-200">{t('dogodek.brisi')}</button>
  // Potrditev v strani, ne window.confirm.
  return (
    <div role="alertdialog" aria-label={t('dogodek.brisi')} className="w-full space-y-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 sm:w-80">
      <p className="text-sm text-rose-100">{t('dogodek.brisiPotrdi')}</p>
      <div className="flex flex-col gap-2">
        <button type="button" autoFocus onClick={() => void brisi(false)} className="gumb min-h-11 bg-rose-400 text-slate-950">{t('dogodek.brisiTega')}</button>
        {d.serija && <button type="button" onClick={() => void brisi(true)} className="gumb-tih min-h-11">{t('dogodek.brisiVse')}</button>}
        <button type="button" onClick={() => setOdprto(false)} className="gumb-tih min-h-11">{t('obrazec.preklici')}</button>
      </div>
      {napakaB && <p className="opozorilo" role="alert">{napakaB}</p>}
    </div>
  )
}

export function Prisotnost({ d }: { d: DogodekT }) {
  // Shranjeno stanje (po shranjevanju se posodobi tu, brez ponovnega klica) in neshranjene spremembe.
  const [kader, setKader] = useState(d.kader)
  const [izbrano, setIzbrano] = useState<Record<number, Stanje | null>>({})
  const [shranjujem, setShranjujem] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [napakaP, setNapakaP] = useState<string | null>(null)
  useEffect(() => {
    setKader(d.kader)
    setIzbrano({})
  }, [d])

  const stanje = (k: DogodekT['kader'][number]) => (k.player_id in izbrano ? izbrano[k.player_id] : k.stanje)
  const vnosi = spremembe(kader, izbrano)
  const prisotni = kader.filter((k) => stanje(k) === 'prisoten').length
  const nastavi = (id: number, s: Stanje) => {
    setSporocilo(null)
    setIzbrano((x) => ({ ...x, [id]: stanje(kader.find((k) => k.player_id === id)!) === s ? null : s }))
  }

  const shrani = async () => {
    setShranjujem(true)
    setNapakaP(null)
    const { error } = await supabase.rpc('scout_shrani_prisotnost', { p_id: d.id, p_vnosi: vnosi })
    setShranjujem(false)
    if (error) return setNapakaP(napaka(error))
    setKader((x) => x.map((k) => (k.player_id in izbrano ? { ...k, stanje: izbrano[k.player_id] } : k)))
    setIzbrano({})
    setSporocilo(t('dogodek.shranjeno'))
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{t('dogodek.prisotnost')}</h2>
          {kader.length > 0 && <p className="text-sm text-slate-400" aria-live="polite">{t('dogodek.povzetek', { prisotni, n: kader.length })}</p>}
        </div>
        {kader.length > 0 && (
          <button
            type="button"
            onClick={() => setIzbrano(Object.fromEntries(kader.map((k) => [k.player_id, 'prisoten' as Stanje])))}
            className="gumb-tih min-h-11"
          >
            {t('dogodek.vsiPrisotni')}
          </button>
        )}
      </div>

      {kader.length === 0 ? (
        <p className="kartica p-5 text-center text-slate-400">{t('dogodek.prazenKader')}</p>
      ) : (
        <ul className="kartica divide-y divide-white/5">
          {kader.map((k) => (
            <li key={k.player_id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {k.pozicija && <span className={`znacka poz-${k.pozicija}`}>{t(`poz.${k.pozicija}` as Kljuc)}</span>}
                <span className="truncate font-semibold text-slate-100">{k.ime}</span>
              </span>
              <span role="group" aria-label={k.ime} className="grid grid-cols-3 gap-2 sm:w-96">
                {STANJA.map((s) => {
                  const izbran = stanje(k) === s
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={izbran}
                      onClick={() => nastavi(k.player_id, s)}
                      className={`min-h-11 rounded-xl px-2 text-sm font-semibold ring-1 transition active:scale-95 ${
                        izbran ? BARVA[s] : 'text-slate-300 ring-white/15 hover:bg-white/5'
                      }`}
                    >
                      {t(`stanje.${s}` as Kljuc)}
                    </button>
                  )
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500">{t('dogodek.zasebno')}</p>

      {(vnosi.length > 0 || sporocilo || napakaP) && (
        <div className="sticky bottom-3 z-30 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
          {napakaP ? (
            <p className="opozorilo flex-1" role="alert">{napakaP}</p>
          ) : (
            <p className="flex-1 text-sm text-slate-300" aria-live="polite">
              {vnosi.length > 0 ? t('dogodek.spremembe', { n: vnosi.length }) : sporocilo}
            </p>
          )}
          {vnosi.length > 0 && (
            <button type="button" disabled={shranjujem} onClick={() => void shrani()} className="gumb-glavni min-h-11">
              {t('dogodek.shrani')}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
