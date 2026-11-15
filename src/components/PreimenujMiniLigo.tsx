import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { prevediNapako } from '../lib/napake'
import { t } from '../i18n'

/** Isti meji kot `ustvari_mini_ligo` v bazi ("naj ima med 2 in 40 znaki"). */
const NAJMANJ_ZNAKOV = 2
const NAJVEC_ZNAKOV = 40

/**
 * Preimenovanje mini lige (le lastnik, SLF-468).
 *
 * Piše `name` v `mini_lige`; pravico preveri RLS (politika "lastnik ureja mini
 * ligo"), pravilo imena za javne lige pa sprožilec `varuj_mini_ligo`. Dolžine
 * baza pri posodobitvi ne preverja, zato jo preverimo tu. Koda povabila in
 * članstva se ne spremenijo. Obrazec je v strani, brez window.prompt.
 */
export default function PreimenujMiniLigo({
  ligaId,
  imeLige,
  onKoncano,
}: {
  ligaId: number
  imeLige: string
  onKoncano: (sporocilo: string) => void
}) {
  const [odprto, setOdprto] = useState(false)
  const [ime, setIme] = useState(imeLige)
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const id = useId()
  const polje = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (odprto) polje.current?.focus()
  }, [odprto])

  // Druga liga ali novo ime od zunaj: odprt obrazec iz prejšnje ne sme ostati.
  useEffect(() => {
    setOdprto(false)
    setIme(imeLige)
    setNapaka(null)
  }, [ligaId, imeLige])

  async function shrani() {
    const novo = ime.trim()
    setNapaka(null)
    if (novo.length < NAJMANJ_ZNAKOV) return setNapaka(t('lestvice.miniLige.prekratkoIme'))
    if (novo.length > NAJVEC_ZNAKOV) return setNapaka(t('skupno.napakeRpc.imeMiniLige'))
    if (novo === imeLige) return setOdprto(false)
    setDela(true)
    const { data, error } = await supabase
      .from('mini_lige')
      .update({ name: novo })
      .eq('id', ligaId)
      .select('id')
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    // RLS tuje vrstice tiho preskoči: nič spremenjenega pomeni, da ni šlo.
    if (!data?.length) return setNapaka(t('lestvice.izstopMiniLige.niUspelo'))
    setOdprto(false)
    onKoncano(t('lestvice.preimenujMiniLigo.preimenovana', { liga: novo }))
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          setNapaka(null)
          setIme(imeLige)
          setOdprto((o) => !o)
        }}
        aria-expanded={odprto}
        className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-white/5 hover:text-white"
      >
        {t('lestvice.preimenujMiniLigo.gumb')}
      </button>
      {odprto && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!dela) void shrani()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !dela) {
              e.preventDefault()
              e.stopPropagation()
              setOdprto(false)
            }
          }}
          className="animiraj-vstop space-y-2 rounded-xl bg-white/5 p-3 text-sm ring-1 ring-white/10"
        >
          <label htmlFor={id} className="block text-slate-300">
            {t('lestvice.preimenujMiniLigo.oznaka')}
          </label>
          <input
            id={id}
            ref={polje}
            value={ime}
            onChange={(e) => setIme(e.target.value)}
            maxLength={NAJVEC_ZNAKOV}
            disabled={dela}
            autoComplete="off"
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-gnl-400"
          />
          {napaka && (
            <p role="alert" className="text-rose-300">
              {napaka}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={dela} className="gumb-glavni text-xs disabled:opacity-50">
              {dela ? t('lestvice.izstopMiniLige.delam') : t('lestvice.preimenujMiniLigo.shrani')}
            </button>
            <button
              type="button"
              onClick={() => setOdprto(false)}
              disabled={dela}
              className="gumb-tih text-xs disabled:opacity-50"
            >
              {t('lestvice.izstopMiniLige.preklici')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
