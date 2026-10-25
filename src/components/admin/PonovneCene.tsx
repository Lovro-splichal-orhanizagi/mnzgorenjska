// Ponovne cene (migracija 20261025193100): plačani zahtevki za ponovno
// vrednotenje. Predlog izračuna delovni tok *Ponovne cene*; cena se premakne
// šele s potrditvijo tu. Zavrnitev ceno pusti; vračilo opravi admin v Stripe
// in ga zapiše v opombo. Stikalo `ponovna_cena`: 0 nihče, 1 admin in
// testerji, 2 vsi; znesek za prikaz je `ponovna_cena_centi` (Stripe cena
// `slff_ponovna_cena` mora biti enaka).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { datumUra } from '../../i18n'

interface Zahtevek {
  id: number
  kdaj: string
  igralec: string
  player_id: number
  liga: string
  kupec: string | null
  stanje: string
  izid: string | null
  stara: number | null
  nova: number | null
  podlaga: { ciljna?: number; minute?: number; goli?: number; tekme?: number; prag?: number; pozicija?: string; visja_liga?: { liga: string; cena: number } | null } | null
  opomba: string | null
  stripe_placilo: string | null
  v_roku: boolean
}

const STANJA: Record<string, string> = {
  caka_placilo: 'čaka plačilo',
  placano: 'plačano, čaka izračun',
  v_pregledu: 'v pregledu',
  potrjeno: 'potrjeno',
  zavrnjeno: 'zavrnjeno',
  za_vracilo: 'ni mogoče, vrni denar',
}

export default function PonovneCene() {
  const [zahtevki, setZahtevki] = useState<Zahtevek[] | null>(null)
  const [stikalo, setStikalo] = useState<string>('0')
  const [napaka, setNapaka] = useState<string | null>(null)
  const [delam, setDelam] = useState(false)
  const [opombe, setOpombe] = useState<Record<number, string>>({})

  const nalozi = useCallback(async () => {
    const [z, s] = await Promise.all([
      supabase.rpc('admin_ponovne_cene'),
      supabase.from('settings').select('value').eq('key', 'ponovna_cena').maybeSingle(),
    ])
    if (z.error) return setNapaka(z.error.message)
    setZahtevki((z.data ?? []) as Zahtevek[])
    setStikalo(String(s.data?.value ?? '0'))
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function zDelom(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    if (delam) return
    setDelam(true)
    setNapaka(null)
    try {
      const { error } = await fn()
      if (error) setNapaka(error.message)
      else await nalozi()
    } finally {
      setDelam(false)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <label className="flex items-center gap-2">
        Ponovno vrednotenje cene:
        <select
          value={stikalo}
          disabled={delam}
          onChange={(e) => {
            const v = e.target.value
            void zDelom(() => supabase.from('settings').update({ value: v }).eq('key', 'ponovna_cena'))
          }}
          className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
        >
          <option value="0">izklopljeno</option>
          <option value="1">le admin in testerji</option>
          <option value="2">vsi (splet)</option>
        </select>
      </label>
      {napaka && <p className="text-rose-400">{napaka}</p>}
      {zahtevki?.length === 0 && <p className="text-slate-400">Ni zahtevkov.</p>}
      <ul className="divide-y divide-white/5">
        {zahtevki?.map((z) => (
          <li key={z.id} className="space-y-1 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                #{z.id} <a href={`/player/${z.player_id}`} className="font-semibold underline">{z.igralec}</a>{' '}
                <span className="text-slate-500">· {z.liga} · {z.kupec ?? '?'} · {datumUra(z.kdaj)}</span>
              </span>
              <span className="znacka bg-slate-400/20 text-slate-200">{STANJA[z.stanje] ?? z.stanje}</span>
            </div>
            {z.stara != null && (
              <p>
                Predlog: <strong>{z.stara}</strong> → <strong>{z.nova ?? '?'}</strong>
                {z.izid && <span className="text-slate-400"> ({z.izid})</span>}
                {z.podlaga && (
                  <span className="text-slate-400">
                    {' '}· izračunana {z.podlaga.ciljna?.toFixed(1)}, {z.podlaga.minute} min, {z.podlaga.goli} golov, {z.podlaga.tekme} tekem,
                    prag {z.podlaga.prag}, {z.podlaga.pozicija}
                    {z.podlaga.visja_liga && `, višja liga ${z.podlaga.visja_liga.liga} (${z.podlaga.visja_liga.cena})`}
                  </span>
                )}
              </p>
            )}
            {z.izid && z.stara == null && <p className="text-slate-400">Izid: {z.izid}</p>}
            {z.opomba && <p className="text-slate-400">Opomba: {z.opomba}</p>}
            {z.stripe_placilo && <p className="text-xs text-slate-500">Stripe: {z.stripe_placilo}</p>}
            {['placano', 'v_pregledu', 'za_vracilo'].includes(z.stanje) && (
              <div className="flex flex-wrap items-center gap-2">
                {z.stanje === 'v_pregledu' && (
                  <>
                    <button
                      type="button"
                      className="gumb-glavni text-xs disabled:opacity-50"
                      disabled={delam || z.v_roku}
                      title={z.v_roku ? 'Rok kroga je manj kot 24 ur stran: potrdi po zaklepu kroga.' : undefined}
                      onClick={() => void zDelom(() => supabase.rpc('admin_ponovna_cena_potrdi', { p_id: z.id }))}
                    >
                      Potrdi {z.stara} → {z.nova}
                    </button>
                    <button
                      type="button"
                      className="gumb-tih text-xs"
                      disabled={delam}
                      onClick={() => void zDelom(() => supabase.rpc('admin_ponovna_cena_znova', { p_id: z.id }))}
                    >
                      Izračunaj znova
                    </button>
                  </>
                )}
                <input
                  value={opombe[z.id] ?? ''}
                  onChange={(e) => setOpombe({ ...opombe, [z.id]: e.target.value })}
                  maxLength={300}
                  placeholder="opomba (npr. vrnjeno v Stripe)"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  className="gumb-tih text-xs text-rose-300"
                  disabled={delam}
                  onClick={() => void zDelom(() => supabase.rpc('admin_ponovna_cena_zavrni', { p_id: z.id, p_opomba: opombe[z.id] ?? '' }))}
                >
                  Zavrni (cena ostane)
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
