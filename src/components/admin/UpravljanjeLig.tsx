// Upravljanje lig: vklop, pragovi glasovanja in uvoz.
//
// Vklop lige je ena vrstica v bazi, posledice pa niso — od tistega hipa
// ljudje sestavljajo ekipe iz tega cenika. Zato tu ne stoji gola stikalka,
// ampak stanje lige in razlog, zakaj je (ali ni) pripravljena.
//
// Ločeno od `Administracija.tsx`, ker je ta že skoraj tisoč vrstic.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { oceniPripravljenost, type Ocena, type IgralecZaKader } from '../../lib/pripravljenost'
import type { Pozicija } from '../../lib/tipi'

interface Liga {
  id: number
  slug: string
  name: string
  short_name: string | null
  active: boolean
  source: string | null
  source_league_code: string | null
  federation_short: string | null
}

interface Stanje {
  aktivnih: number
  privzetih: number
  klubov: number
  najvisja_cena: number
  mediana_cene: number
  po_pozicijah: Record<string, number>
  nastopov_s_klopi: number
  golov_brez_nastopa: number
  krogov_tekoce: number
  igralci: IgralecZaKader[]
}

/** Pragovi, ki jih je smiselno nastaviti po ligi (ostalo ostane globalno). */
const PRAGOVI: { kljuc: string; naslov: string; privzeto: number; pojasnilo: string }[] = [
  {
    kljuc: 'prag_glasov_asistenca',
    naslov: 'Glasov za asistenco',
    privzeto: 3,
    pojasnilo: 'Trije glasovi so v ligi z dvesto igralci lahek dosežek, v ligi z dvajsetimi nedosegljivi.',
  },
  {
    kljuc: 'prag_glasov_pozicija',
    naslov: 'Glasov za pozicijo',
    privzeto: 5,
    pojasnilo: 'Osnovni prag; statistični prior ga zniža do spodnje meje.',
  },
  {
    kljuc: 'min_prag_glasov_pozicija',
    naslov: 'Najnižji prag za pozicijo',
    privzeto: 2,
    pojasnilo: 'Pod to mejo prag ne pade, tudi če je prior zelo močan.',
  },
  {
    kljuc: 'utez_insider',
    naslov: 'Utež poznavalca',
    privzeto: 3,
    pojasnilo: 'Koliko šteje glas nekoga, ki spremlja prav ta klub.',
  },
]

export default function UpravljanjeLig() {
  const [lige, setLige] = useState<Liga[]>([])
  const [stanja, setStanja] = useState<Record<number, Stanje>>({})
  const [nastavitve, setNastavitve] = useState<Record<number, Record<string, number>>>({})
  const [odprta, setOdprta] = useState<number | null>(null)
  const [delam, setDelam] = useState<number | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [sporocilo, setSporocilo] = useState<string | null>(null)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase
      .from('competitions_view')
      .select('id, slug, name, short_name, active, source, source_league_code, federation_short')
      .order('federation_sort', { nullsFirst: false })
      .order('sort_order')
    if (error) return setNapaka(error.message)
    const vse = (data ?? []) as Liga[]
    setLige(vse)

    const s: Record<number, Stanje> = {}
    const n: Record<number, Record<string, number>> = {}
    for (const l of vse) {
      const [{ data: st }, { data: na }] = await Promise.all([
        supabase.rpc('stanje_lige', { p_competition_id: l.id }),
        supabase
          .from('competition_settings')
          .select('key, value')
          .eq('competition_id', l.id),
      ])
      if (st) s[l.id] = st as unknown as Stanje
      n[l.id] = Object.fromEntries(
        ((na ?? []) as { key: string; value: unknown }[]).map((v) => [v.key, Number(v.value)]),
      )
    }
    setStanja(s)
    setNastavitve(n)
  }, [])

  useEffect(() => {
    nalozi()
  }, [nalozi])

  // Kadar stanja ne poznamo (funkcije `stanje_lige` ni ali je poizvedba
  // padla), ligo raje NE vklopimo. Prej je manjkajoče stanje pomenilo, da
  // zadržkov ni — varovalka je tiho izginila prav takrat, ko je nekaj narobe.
  const NEZNANO: Ocena = {
    pripravljena: false,
    odstotekPrivzetih: 100,
    tezave: [
      {
        kljuc: 'stanje',
        kaj: 'Stanja lige ni bilo mogoče prebrati.',
        zakaj:
          'Brez njega ni mogoče presoditi, ali je cenik igriv. Preveri, ali je migracija ' +
          'za `stanje_lige` uveljavljena.',
      },
    ],
  }

  const ocenaZa = (l: Liga): Ocena => {
    const s = stanja[l.id]
    if (!s) return NEZNANO
    return oceniPripravljenost({
      aktivnih: s.aktivnih,
      privzetih: s.privzetih,
      klubov: s.klubov,
      najvisjaCena: Number(s.najvisja_cena),
      poPozicijah: (s.po_pozicijah ?? {}) as Record<Pozicija, number>,
      nastopovSKlopi: s.nastopov_s_klopi,
      golovBrezNastopa: s.golov_brez_nastopa,
      krogovTekoce: s.krogov_tekoce,
      igralci: s.igralci,
    })
  }

  const preklopi = async (l: Liga) => {
    setNapaka(null)
    setSporocilo(null)
    setDelam(l.id)
    // Sprožilec preveri stanje ob zapisu; prikaz v brskalniku je lahko že zastarel.
    const { error } = await supabase
      .from('competitions')
      .update({ active: !l.active })
      .eq('id', l.id)
      .select('id')
      .single()
    setDelam(null)
    if (error) {
      setNapaka(error.message)
      await nalozi()
      return
    }
    setSporocilo(`${l.name}: ${!l.active ? 'vklopljena' : 'izklopljena'}.`)
    nalozi()
  }

  const shraniPrag = async (l: Liga, kljuc: string, vrednost: string) => {
    setNapaka(null)
    const prazno = vrednost.trim() === ''
    const stevilo = Number(vrednost)
    if (!prazno && (!Number.isFinite(stevilo) || stevilo < 1)) {
      setNapaka('Prag mora biti število, večje od nič.')
      return
    }
    const { error } = prazno
      ? await supabase
          .from('competition_settings')
          .delete()
          .eq('competition_id', l.id)
          .eq('key', kljuc)
      : await supabase
          .from('competition_settings')
          .upsert({ competition_id: l.id, key: kljuc, value: stevilo })
    if (error) return setNapaka(error.message)
    setSporocilo(prazno ? 'Prag vrnjen na globalnega.' : 'Prag shranjen.')
    nalozi()
  }

  return (
    <section className="kartica space-y-3 p-4">
      <div>
        <h2 className="font-bold">Lige</h2>
        <p className="text-sm text-slate-400">
          Vklop pomeni, da liga postane vidna vsem in da začne vanjo teči nočni
          uvoz. Cenik, v katerem stane vsak igralec 4.5, nima igre — zato vklop
          stoji za preverbo.
        </p>
      </div>

      {napaka && <p className="rounded-xl bg-red-500/15 p-2 text-sm text-red-200">{napaka}</p>}
      {sporocilo && (
        <p className="rounded-xl bg-gnl-500/15 p-2 text-sm text-gnl-200">{sporocilo}</p>
      )}

      <div className="space-y-1.5">
        {lige.map((l) => {
          const s = stanja[l.id]
          const o = ocenaZa(l)
          const odprto = odprta === l.id
          return (
            <div key={l.id} className="rounded-xl bg-white/5">
              <div className="flex flex-wrap items-center gap-2 p-2.5">
                <button
                  onClick={() => setOdprta(odprto ? null : l.id)}
                  className="flex-1 text-left"
                >
                  <span className="font-semibold">{l.name}</span>{' '}
                  <span className="text-xs text-slate-400">
                    {l.federation_short ?? 'brez zveze'} · {l.source ?? '—'}
                    {l.source_league_code ? `/${l.source_league_code}` : ''}
                  </span>
                  {s && (
                    <span className="block text-xs text-slate-500">
                      {s.aktivnih} igralcev · {s.klubov} klubov · {s.krogov_tekoce} krogov
                    </span>
                  )}
                </button>

                <span
                  className={`znacka ${
                    l.active ? 'bg-gnl-500/20 text-gnl-200' : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {l.active ? 'vklopljena' : 'izklopljena'}
                </span>

                <button
                  onClick={() => preklopi(l)}
                  disabled={delam === l.id || (!l.active && !o.pripravljena)}
                  className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold
                             hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  title={
                    !l.active && !o.pripravljena
                      ? 'Liga ni pripravljena — glej zadržke'
                      : undefined
                  }
                >
                  {l.active ? 'Izklopi' : 'Vklopi'}
                </button>
              </div>

              {odprto && (
                <div className="space-y-3 border-t border-white/10 p-3 text-sm">
                  {!o.pripravljena && (
                    <div className="space-y-1.5">
                      <p className="font-semibold text-amber-200">
                        Zadržki pred vklopom ({o.tezave.length})
                      </p>
                      {o.tezave.map((t) => (
                        <div key={t.kljuc} className="rounded-lg bg-amber-500/10 p-2">
                          <p className="font-medium text-amber-100">{t.kaj}</p>
                          <p className="text-xs text-amber-200/70">{t.zakaj}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {o.pripravljena && (
                    <p className="text-gnl-300">
                      Pripravljena. Privzeto ceno ima {o.odstotekPrivzetih} % igralcev,
                      najvišja je {Number(s?.najvisja_cena ?? 0)}.
                    </p>
                  )}

                  <div>
                    <p className="mb-1 font-semibold">Pragovi glasovanja</p>
                    <p className="mb-2 text-xs text-slate-400">
                      Prazno polje pomeni globalno vrednost iz nastavitev.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PRAGOVI.map((p) => (
                        <label key={p.kljuc} className="block">
                          <span className="text-xs text-slate-300">{p.naslov}</span>
                          <input
                            type="number"
                            min={1}
                            defaultValue={nastavitve[l.id]?.[p.kljuc] ?? ''}
                            placeholder={`globalno (${p.privzeto})`}
                            onBlur={(e) => shraniPrag(l, p.kljuc, e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-sm"
                          />
                          <span className="text-[11px] text-slate-500">{p.pojasnilo}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 font-semibold">Uvoz</p>
                    <p className="mb-1.5 text-xs text-slate-400">
                      Teče v GitHub Actions, ker potrebuje servisni ključ — ta ne sme
                      v brskalnik. Odpri delovni tok <strong>Uvoz lige (rocno)</strong> in
                      vpiši slug ter šifre arhivskih sezon.
                    </p>
                    <pre className="overflow-x-auto rounded-lg bg-slate-950 p-2 text-xs text-slate-300">
{`gh workflow run uvoz-lige.yml -f liga=${l.slug} -f arhiv=<sifre>`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
