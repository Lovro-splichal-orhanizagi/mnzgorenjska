// Stikalo Svetovalca ekipe (Moja ekipa, le za preverjene igralce).
//
// Vrstica `svetovalec_ekipe` v `settings`: '0' izklopi, vse drugo (tudi
// manjkajoča vrstica) vklopi. Zapiše jo admin z upsert, migracija ni potrebna.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { svetovalecVklopljen } from '../../lib/svetovalecEkipe'

export default function SvetovalecEkipe() {
  const [vklopljen, setVklopljen] = useState<boolean | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'svetovalec_ekipe')
      .maybeSingle()
    if (error) return setNapaka(error.message)
    setVklopljen(svetovalecVklopljen(data))
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function nastavi(v: boolean) {
    setDela(true)
    setNapaka(null)
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'svetovalec_ekipe', value: v ? '1' : '0' })
    setDela(false)
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xl font-bold">Svetovalec ekipe</h2>
      <p className="text-sm text-slate-400">
        Pregled kadra v Moji ekipi (šibka mesta, prestopi, najboljša postava s kapetanom). Vidijo ga le preverjeni
        igralci. Samo predlaga, ekipe ne spreminja.
      </p>
      {napaka && <p className="text-sm text-rose-300">{napaka}</p>}
      <div className="kartica flex flex-wrap items-center gap-3 p-3 text-sm">
        <span className="font-semibold">Stikalo:</span>
        {([[true, 'Vklopljeno'], [false, 'Izklopljeno']] as const).map(([v, oznaka]) => (
          <label key={oznaka} className="flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="stikalo-svetovalca"
              checked={vklopljen === v}
              disabled={dela || vklopljen === null}
              onChange={() => void nastavi(v)}
            />
            {oznaka}
          </label>
        ))}
      </div>
    </section>
  )
}
