import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from '../Povezava'
import FotoIgralca from '../FotoIgralca'
import { pozabiFotografijo } from '../../lib/prevzem'

interface Zahtevek {
  id: number
  player_id: number
  player_name: string | null
  team_name: string | null
  liga: string | null
  prosilec: string | null
  email: string | null
  status: string
  potrdil: string | null
  spor: boolean
  star_vsaj_16: boolean | null
  dokaz_url: string | null
  created_at: string
  decided_at: string | null
  prijav: number
  razlogi: string[] | null
  potrditev: number
  povezanih: number
  vrsta: 'spor' | 'star' | 'prijava' | 'potrjen'
}

interface Predlog {
  player_id: number
  full_name: string | null
  team_name: string | null
  liga: string | null
  liga_slug: string | null
  ista_sifra: boolean
  isti_klub: boolean
  klub_v_ligi: boolean
  povezan: boolean
  zaseden: boolean
}

const VRSTA: Record<Zahtevek['vrsta'], string> = {
  spor: 'spor',
  star: 'čaka > 7 dni',
  prijava: 'prijavljen',
  potrjen: 'potrjen',
}

const dan = (d: string) => new Date(d).toLocaleDateString('sl-SI')

/**
 * Prevzemi profilov ("To sem jaz"): čakajoči zahtevki, starejši od 7 dni,
 * spori (drug uporabnik za istega igralca), prijavljeni lažni profili in
 * nedavno potrjeni. Admin potrdi, zavrne ali prekliče, odstrani fotografijo
 * in poveže druge vrstice iste osebe (druga liga, mladinci, prestop).
 */
export default function Prevzemi() {
  const [vrstice, setVrstice] = useState<Zahtevek[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)
  const [odprt, setOdprt] = useState<number | null>(null)
  const [predlogi, setPredlogi] = useState<Predlog[]>([])

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_zahtevki_igralcev')
    if (error) return setNapaka(error.message)
    setVrstice((data ?? []) as Zahtevek[])
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function naloziPredloge(id: number) {
    setOdprt(id)
    setPredlogi([])
    const { data, error } = await supabase.rpc('admin_predlogi_povezav', { p_zahtevek_id: id })
    if (error) return setNapaka(error.message)
    setPredlogi((data ?? []) as Predlog[])
  }

  async function izvedi(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setDela(true)
    setNapaka(null)
    const { error } = await fn()
    setDela(false)
    if (error) return setNapaka(error.message)
    await nalozi()
    if (odprt != null) await naloziPredloge(odprt)
  }

  const odloci = (z: Zahtevek, odlocitev: string) => {
    if (odlocitev === 'preklici' && !window.confirm(`Prekličem profil "${z.player_name}" (${z.prosilec})?`)) return
    void izvedi(() => supabase.rpc('admin_odloci_zahtevek', { p_id: z.id, p_odlocitev: odlocitev }))
  }

  if (vrstice === null) return napaka ? <p className="text-sm text-rose-400">{napaka}</p> : null

  return (
    <section className="kartica space-y-2 p-3 sm:p-4">
      <h2 className="font-bold">
        Prevzemi profilov igralcev
        {vrstice.filter((v) => v.vrsta !== 'potrjen').length > 0 && (
          <span className="znacka ml-2 bg-sky-400/20 text-sky-200">
            {vrstice.filter((v) => v.vrsta !== 'potrjen').length}
          </span>
        )}
      </h2>
      <p className="text-xs text-slate-500">
        Čakajoči zahtevki, starejši od 7 dni, spori, prijavljeni profili in potrjeni v zadnjih 60 dneh. Mlajše
        zahtevke potrdi klub ali dva soigralca.
      </p>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {vrstice.length === 0 ? (
        <p className="text-sm text-slate-500">Ni ničesar za pregled.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {vrstice.map((z) => (
            <li key={z.id} className="space-y-2 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-2">
                  {z.status === 'potrjen' && <FotoIgralca id={z.player_id} velikost={40} />}
                  <div className="min-w-0">
                    <div className="font-semibold">
                      <Link to={`/player/${z.player_id}`} className="hover:underline">
                        {z.player_name}
                      </Link>
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {z.team_name} · {z.liga}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      <span
                        className={`znacka mr-1 ${z.vrsta === 'spor' || z.vrsta === 'prijava' ? 'bg-rose-400/20 text-rose-200' : 'bg-white/10'}`}
                      >
                        {VRSTA[z.vrsta]}
                      </span>
                      {z.prosilec ?? '—'} <span className="text-slate-500">{z.email}</span> · {dan(z.created_at)}
                      {z.potrdil && ` · potrdil: ${z.potrdil}`}
                      {z.star_vsaj_16 && ' · ≥16 potrjeno'}
                      {z.potrditev > 0 && ` · soigralcev: ${z.potrditev}`}
                      {z.povezanih > 0 && ` · povezanih vrstic: ${z.povezanih}`}
                    </div>
                    {z.dokaz_url && (
                      <a href={z.dokaz_url} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-gnl-300 hover:underline">
                        {z.dokaz_url}
                      </a>
                    )}
                    {z.prijav > 0 && (
                      <ul className="mt-1 list-disc pl-4 text-xs text-rose-200">
                        <li>{z.prijav} odprtih prijav</li>
                        {(z.razlogi ?? []).map((r, i) => (
                          <li key={i}>“{r}”</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {z.status === 'cakajoc' ? (
                    <>
                      <button disabled={dela} onClick={() => odloci(z, 'potrdi')} className="gumb-glavni text-xs disabled:opacity-50">
                        potrdi
                      </button>
                      <button disabled={dela} onClick={() => odloci(z, 'zavrni')} className="text-xs text-slate-500 hover:text-rose-300">
                        zavrni
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        disabled={dela}
                        onClick={() => (odprt === z.id ? setOdprt(null) : naloziPredloge(z.id))}
                        className="gumb-tih text-xs"
                      >
                        povezave
                      </button>
                      <button
                        disabled={dela}
                        onClick={() =>
                          izvedi(async () => {
                            const r = await supabase.rpc('admin_odstrani_fotografijo', { p_player_id: z.player_id })
                            pozabiFotografijo(z.player_id)
                            return r
                          })
                        }
                        className="text-xs text-slate-500 hover:text-rose-300"
                      >
                        odstrani foto
                      </button>
                      {z.prijav > 0 && (
                        <button disabled={dela} onClick={() => odloci(z, 'zavrzi_prijave')} className="text-xs text-slate-500 hover:text-slate-200">
                          prijave neutemeljene
                        </button>
                      )}
                      <button disabled={dela} onClick={() => odloci(z, 'preklici')} className="text-xs text-rose-300 hover:underline">
                        prekliči
                      </button>
                    </>
                  )}
                </div>
              </div>
              {odprt === z.id && (
                <div className="rounded-lg bg-white/5 p-2 text-xs">
                  <p className="mb-1 text-slate-400">
                    Druge vrstice z istim imenom (brez šumnikov) ali šifro v isti državi. Poveži le, če je res ista oseba.
                  </p>
                  {predlogi.length === 0 ? (
                    <p className="text-slate-500">Ni predlogov.</p>
                  ) : (
                    <ul className="space-y-1">
                      {predlogi.map((p) => (
                        <li key={p.player_id} className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            <Link to={`/player/${p.player_id}`} className="hover:underline">
                              {p.full_name}
                            </Link>{' '}
                            <span className="text-slate-500">
                              {p.team_name} · {p.liga}
                            </span>{' '}
                            {p.ista_sifra && <span className="znacka bg-gnl-500/20 text-gnl-200">ista šifra</span>}{' '}
                            {p.isti_klub && <span className="znacka bg-white/10">isti klub</span>}{' '}
                            {p.klub_v_ligi && !p.isti_klub && <span className="znacka bg-white/10">klub v isti ligi</span>}
                          </span>
                          {p.povezan ? (
                            <button
                              disabled={dela}
                              onClick={() =>
                                izvedi(() =>
                                  supabase.rpc('admin_povezi_igralca', { p_zahtevek_id: z.id, p_player_id: p.player_id, p_povezi: false }),
                                )
                              }
                              className="text-slate-400 hover:text-rose-300"
                            >
                              odveži
                            </button>
                          ) : p.zaseden ? (
                            <span className="text-slate-500">pripada drugemu profilu</span>
                          ) : (
                            <button
                              disabled={dela}
                              onClick={() =>
                                izvedi(() => supabase.rpc('admin_povezi_igralca', { p_zahtevek_id: z.id, p_player_id: p.player_id }))
                              }
                              className="gumb-glavni text-xs"
                            >
                              poveži
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
