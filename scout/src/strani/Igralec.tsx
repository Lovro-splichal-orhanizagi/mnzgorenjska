import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, type Podoben, type ProfilIgralca, type SezonaIgralca } from '../baza'
import { napaka, stevilo, t, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'

const st = (x: number | null | undefined, mest = 2) => (x == null ? '–' : stevilo(x, mest))
const odst = (x: number | null | undefined) => (x == null ? '–' : `${Math.round(x * 100)} %`)

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
  ['igralec.st.kartoni', (s) => st(s.kartoni_90)],
]

export function Igralec() {
  const pid = idIzNaslova(useParams().id)
  const [profil, setProfil] = useState<ProfilIgralca | null | undefined>(undefined)
  const [podobni, setPodobni] = useState<Podoben[] | null>(null)
  const [napakaI, setNapakaI] = useState<string | null>(null)
  // Napaka gumba (meja, poln seznam) profil pusti na strani.
  const [napakaA, setNapakaA] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  useEffect(() => {
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
    setDela(false)
    if (error) setNapakaA(napaka(error))
    else setProfil({ ...p, opazujem: !p.opazujem })
  }

  // Podobni šele na klik: vsak klic gre v dnevnik in šteje v dnevno mejo.
  async function naloziPodobne(id: number) {
    setDela(true)
    setNapakaA(null)
    const { data, error } = await supabase.rpc('scout_podobni', { p_player_id: id })
    setDela(false)
    if (error) setNapakaA(napaka(error))
    else setPodobni(data ?? [])
  }

  if (pid == null) return <p>{t('igralec.ni')}</p>
  if (napakaI) return <p className="text-red-700">{napakaI}</p>
  if (profil === undefined) return <Nalaganje />
  if (profil === null) return <p>{t('igralec.ni')}</p>
  const p = profil
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{p.ime}</h1>
        <p className="text-slate-600">{p.klub} · {p.liga} · {t(`skupina.${p.skupina}` as Kljuc)}</p>
        <p className="text-sm text-slate-700">
          {t('igralec.povzetek', { percentil: Math.round(p.percentil), skupina: t(`skupinaMed.${p.skupina}` as Kljuc), zaupanje: Math.round(p.zaupanje * 100) })}
        </p>
        <button type="button" disabled={dela} onClick={() => void opazuj(p)} className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50">
          {p.opazujem ? t('igralec.neOpazuj') : t('igralec.opazuj')}
        </button>
        {napakaA && <p className="text-sm text-red-700">{napakaA}</p>}
      </header>

      {p.privolitev && (
        <section className="space-y-1 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="font-medium text-emerald-900">{t('igralec.odprt')}</p>
          <p>{t('igralec.letnik', { letnik: p.privolitev.letnik })}</p>
          {p.privolitev.regije.length > 0 && <p>{t('igralec.regije', { regije: p.privolitev.regije.join(', ') })}</p>}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">{t('igralec.sezone')}</h2>
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>{STOLPCI.map(([k]) => <th key={k} className="whitespace-nowrap px-2 py-1 font-medium">{t(k)}</th>)}</tr>
            </thead>
            <tbody>
              {(p.sezone ?? []).map((s, i) => (
                <tr key={`${s.sezona}-${s.liga}-${s.klub}-${i}`} className="border-t border-slate-200">
                  {STOLPCI.map(([k, f]) => <td key={k} className="whitespace-nowrap px-2 py-1">{f(s)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">{t('iskanje.opomba')}</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{t('igralec.podobni')}</h2>
        {podobni === null ? (
          <button type="button" disabled={dela} onClick={() => void naloziPodobne(p.player_id)} className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50">
            {t('igralec.pokaziPodobne')}
          </button>
        ) : podobni.length === 0 ? (
          <p className="text-slate-500">{t('igralec.niPodobnih')}</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
            {podobni.map((o) => (
              <li key={o.player_id} className="flex flex-wrap items-baseline gap-x-3 p-3 text-sm">
                <Link to={`/player/${o.player_id}`} className="font-medium hover:underline">{o.ime}</Link>
                <span className="text-slate-600">{o.klub} · {o.liga}</span>
                <span className="text-slate-500">{t('igralec.podobnost', { p: Math.round(o.podobnost * 100) })}</span>
                {o.odprt_za_prestop && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{t('iskanje.odprt')}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
