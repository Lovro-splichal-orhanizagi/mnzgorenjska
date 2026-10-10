// Nastavitve obvestil: opomniki po e-pošti in potisna obvestila v mobilni
// aplikaciji, vsak kanal posebej. Privzeto sta vklopljena; `profiles.
// brez_opomnikov` in `brez_push` sta zapisana nikalno, da novi profili brez
// vrednosti dobivajo obvestila. Pot ostane `/reminders` (povezava v mailih).
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import { jeNativno } from '../lib/platforma'
import { registrirajPush, type DovoljenjePush } from '../components/PotisnaObvestila'
import { t, tx } from '../i18n'

const profili = () => supabase.from('profiles')

type Stolpec = 'brez_opomnikov' | 'brez_push'

/**
 * Odjava s povezave v mailu (?u=<uporabnik>&z=<žeton>), brez prijave. Izklopi
 * e-pošto (`brez_opomnikov`). Odjavi šele gumb: pregledovalniki povezav v
 * poštnih predalih odprejo stran, ne kliknejo pa gumba.
 */
function OdjavaIzMaila({ u, z }: { u: string; z: string }) {
  const [stanje, setStanje] = useState<'caka' | 'dela' | 'ok' | 'napaka'>('caka')
  async function odjavi() {
    setStanje('dela')
    const { data, error } = await supabase.rpc('odjavi_z_zetonom', { p_user: u, p_zeton: z })
    setStanje(!error && data ? 'ok' : 'napaka')
  }
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-3xl font-black naslov">{t('racun.opomniki.naslov')}</h1>
      {stanje === 'ok' ? (
        <p className="text-gnl-300">{t('racun.opomniki.izklopljeni')}</p>
      ) : (
        <>
          <p className="text-slate-300">{t('racun.opomniki.odjavaVprasanje')}</p>
          <button type="button" onClick={odjavi} disabled={stanje === 'dela'} className="gumb-glavni">
            {t('racun.opomniki.odjavaGumb')}
          </button>
          {stanje === 'napaka' && <p className="text-sm text-rose-400">{t('racun.opomniki.odjavaNapaka')}</p>}
        </>
      )}
    </div>
  )
}

export default function Opomniki() {
  const [iskanje] = useSearchParams()
  const u = iskanje.get('u')
  const z = iskanje.get('z')
  if (u && z) return <OdjavaIzMaila u={u} z={z} />
  return <NastavitveObvestil />
}

function NastavitveObvestil() {
  const { session, loading } = useAuth()
  const uporabnik = session?.user.id ?? null
  // Ključ je stolpec, vrednost pove, ali je kanal VKLOPLJEN (nasprotno od stolpca).
  const [vklop, setVklop] = useState<Record<Stolpec, boolean> | null>(null)
  const [shranjujem, setShranjujem] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [shranjeno, setShranjeno] = useState<Stolpec | null>(null)
  const [dovoljenje, setDovoljenje] = useState<DovoljenjePush | null>(null)
  useNaslov(t('racun.opomniki.naslov'))

  useEffect(() => {
    if (!uporabnik) return
    let veljavno = true
    setNapaka(null)
    profili()
      .select('brez_opomnikov, brez_push')
      .eq('id', uporabnik)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!veljavno) return
        if (error) return setNapaka(t('racun.opomniki.napakaNalaganja'))
        setVklop({ brez_opomnikov: !data?.brez_opomnikov, brez_push: !data?.brez_push })
      })
    if (jeNativno()) void registrirajPush(false).then((d) => veljavno && setDovoljenje(d))
    return () => {
      veljavno = false
    }
  }, [uporabnik])

  async function preklopi(stolpec: Stolpec) {
    if (!uporabnik || !vklop) return
    const novo = !vklop[stolpec]
    setShranjujem(true)
    setNapaka(null)
    setShranjeno(null)
    const { error } = await profili()
      .update(stolpec === 'brez_push' ? { brez_push: !novo } : { brez_opomnikov: !novo })
      .eq('id', uporabnik)
    setShranjujem(false)
    if (error) return setNapaka(t('racun.opomniki.napakaShranjevanja'))
    setVklop({ ...vklop, [stolpec]: novo })
    setShranjeno(stolpec)
    // Za dovoljenje telefona vprašamo šele tu, ko človek ve, zakaj.
    if (stolpec === 'brez_push' && novo && jeNativno()) setDovoljenje(await registrirajPush(true))
  }

  async function dovoli() {
    setDovoljenje(await registrirajPush(true))
  }

  if (loading) return <p className="text-slate-400">{t('racun.opomniki.nalagam')}</p>

  if (!session)
    return (
      <div className="max-w-md space-y-3">
        <h1 className="text-3xl font-black naslov">{t('racun.opomniki.naslov')}</h1>
        <p className="text-slate-300">
          {tx('racun.opomniki.moraPrijava', {}, {
            prijava: (v) => (
              <Link to={povezavaNaPrijavo('/reminders')} className="text-gnl-300 underline">
                {v}
              </Link>
            ),
          })}
        </p>
      </div>
    )

  const stikalo = (stolpec: Stolpec, oznaka: string, opis: string) => (
    // Cela vrstica je cilj dotika (label), vsaj 44 px visoka.
    <label className="kartica flex min-h-[44px] cursor-pointer items-center justify-between gap-4 p-4">
      <span>
        <span className="block font-semibold">{oznaka}</span>
        <span className="block text-sm text-slate-400">{opis}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={vklop?.[stolpec] ?? false}
        disabled={vklop == null || shranjujem}
        onChange={() => void preklopi(stolpec)}
        aria-checked={vklop?.[stolpec] ?? false}
        className="h-6 w-6 shrink-0 accent-emerald-500"
      />
    </label>
  )

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-3xl font-black naslov">{t('racun.opomniki.naslov')}</h1>

      {stikalo(
        'brez_opomnikov',
        t('racun.opomniki.posiljaj'),
        t('racun.opomniki.opis', { email: session.user.email }),
      )}
      {stikalo('brez_push', t('racun.opomniki.push'), t('racun.opomniki.pushOpis'))}

      {jeNativno() && vklop?.brez_push && dovoljenje && dovoljenje !== 'granted' && (
        <div className="space-y-2 text-sm text-amber-300">
          {dovoljenje === 'denied' ? (
            <p>{t('racun.opomniki.pushZavrnjeno')}</p>
          ) : (
            <button type="button" onClick={() => void dovoli()} className="gumb-tih min-h-[44px] px-3 py-2">
              {t('racun.opomniki.pushDovoli')}
            </button>
          )}
        </div>
      )}

      {vklop == null && !napaka && <p className="text-sm text-slate-400">{t('racun.opomniki.nalagam')}</p>}
      {shranjujem && <p className="text-sm text-slate-400">{t('racun.opomniki.shranjujem')}</p>}
      {shranjeno && !shranjujem && vklop && (
        <p className="text-sm text-gnl-300">
          {shranjeno === 'brez_push'
            ? vklop.brez_push ? t('racun.opomniki.pushVklopljena') : t('racun.opomniki.pushIzklopljena')
            : vklop.brez_opomnikov ? t('racun.opomniki.vklopljeni') : t('racun.opomniki.izklopljeni')}
        </p>
      )}
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
    </div>
  )
}
