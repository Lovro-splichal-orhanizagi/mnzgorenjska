// Nastavitve obvestil: opomniki po e-pošti in potisna obvestila v mobilni
// aplikaciji, vsak kanal posebej (stikala so v `NastavitveObvestil`, ista kot
// v nastavitvah računa). Pot ostane `/reminders` (povezava v mailih).
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useNaslov } from '../lib/naslov'
import NastavitveObvestil from '../components/NastavitveObvestil'
import { t } from '../i18n'

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
  return u && z ? <OdjavaIzMaila u={u} z={z} /> : <StranObvestil />
}

function StranObvestil() {
  useNaslov(t('racun.opomniki.naslov'))
  return <NastavitveObvestil />
}

