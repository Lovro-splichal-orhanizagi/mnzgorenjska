import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { t } from '../i18n'
import { prevediNapako } from '../lib/napake'
import { prikazniIme } from '../lib/pomozno'
import { Link } from './Povezava'
import { VrsticaOdlocitve, type ZaOdlocitev } from './PrevzemIgralca'

/**
 * Na strani kluba: čakajoči zahtevki "To sem jaz" za igralce tega kluba,
 * o katerih sme odločati prijavljeni (odobren poznavalec kluba ali potrjen
 * soigralec). Drugim se ne izriše nič; seznam sestavi baza.
 */
export default function ZahtevkiKluba({ klubId }: { klubId: number }) {
  const { session } = useAuth()
  const [vrstice, setVrstice] = useState<Array<ZaOdlocitev & { player_id: number; player_name: string | null }>>([])
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [sporocilo, setSporocilo] = useState<string | null>(null)

  const nalozi = useCallback(async () => {
    if (!session) return setVrstice([])
    const { data } = await supabase.rpc('zahtevki_za_odlocitev', { p_team_id: klubId })
    setVrstice((data ?? []) as typeof vrstice)
  }, [session, klubId])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  if (vrstice.length === 0 && !sporocilo) return null

  async function rpc(fn: () => PromiseLike<{ error: { message: string } | null }>, uspeh?: string) {
    setNapaka(null)
    setSporocilo(null)
    setDela(true)
    const { error } = await fn()
    setDela(false)
    if (error) {
      setNapaka(prevediNapako(error.message))
      return false
    }
    if (uspeh) setSporocilo(uspeh)
    await nalozi()
    return true
  }

  return (
    <section className="kartica space-y-2 p-3 text-sm">
      <h2 className="text-base font-bold">{t('igralci.prevzem.odlocitev.klubNaslov')}</h2>
      <p className="text-xs text-slate-400">{t('igralci.prevzem.odlocitev.klubOpis')}</p>
      {vrstice.map((z) => (
        <VrsticaOdlocitve
          key={z.id}
          z={z}
          dela={dela}
          rpc={rpc}
          imeIgralca={
            <Link to={`/player/${z.player_id}`} className="hover:text-gnl-300 hover:underline">
              {prikazniIme(z.player_name)}
            </Link>
          }
        />
      ))}
      {napaka && <p className="text-rose-400">{napaka}</p>}
      {sporocilo && <p className="text-gnl-300">{sporocilo}</p>}
    </section>
  )
}
