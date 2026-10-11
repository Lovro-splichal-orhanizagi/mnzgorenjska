import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNaslov, useNoindex } from '../lib/naslov'
import { t } from '../i18n'
import { prevediNapako } from '../lib/napake'
import { prikazniIme } from '../lib/pomozno'

interface Podatki {
  stanje: 'veljaven' | 'porabljen' | 'potekel' | 'zaprt'
  igralec: string | null
  klub: string | null
  liga: string | null
  prosilec: string | null
  dokaz_url: string | null
}

/**
 * Klub potrdi ali zavrne igralca po enkratni povezavi iz maila
 * (`/claim#<žeton>`). Žeton je v #, zato ne gre v dnevnike strežnika in
 * glavo Referer. Velja 14 dni in enkrat; preveri ga baza.
 */
export default function PotrditevPrevzema() {
  useNaslov(t('igralci.prevzem.zeton.naslov'))
  useNoindex(true)
  const [zeton] = useState(() => (typeof location !== 'undefined' ? location.hash.slice(1) : ''))
  const [podatki, setPodatki] = useState<Podatki | null | undefined>(undefined)
  const [izid, setIzid] = useState<string | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  useEffect(() => {
    if (!zeton) return setPodatki(null)
    supabase.rpc('prevzem_zeton_podatki', { p_zeton: zeton }).then(({ data }) => {
      setPodatki(((data ?? [])[0] as Podatki | undefined) ?? null)
    })
  }, [zeton])

  async function odloci(potrdi: boolean) {
    setDela(true)
    setNapaka(null)
    const { data, error } = await supabase.rpc('prevzem_odloci_z_zetonom', { p_zeton: zeton, p_potrdi: potrdi })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    setIzid(data === 'potrjen' ? t('igralci.prevzem.zeton.hvalaPotrjen') : t('igralci.prevzem.zeton.hvalaZavrnjen'))
  }

  if (podatki === undefined) return null

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-black naslov">{t('igralci.prevzem.zeton.naslov')}</h1>
      {!podatki ? (
        <p className="text-slate-300">{t('igralci.prevzem.zeton.neveljaven')}</p>
      ) : izid ? (
        <p className="kartica p-4 text-gnl-300">{izid}</p>
      ) : podatki.stanje !== 'veljaven' ? (
        <p className="text-slate-300">{t(`igralci.prevzem.zeton.${podatki.stanje as 'porabljen' | 'potekel' | 'zaprt'}`)}</p>
      ) : (
        <div className="kartica space-y-3 p-4">
          <p className="text-slate-200">
            {t('igralci.prevzem.zeton.vprasanje', {
              prosilec: podatki.prosilec ?? '?',
              igralec: prikazniIme(podatki.igralec),
              klub: podatki.klub ?? '',
              liga: podatki.liga ?? '',
            })}
          </p>
          {podatki.dokaz_url && (
            <a
              href={podatki.dokaz_url}
              target="_blank"
              rel="nofollow noopener noreferrer ugc"
              className="block break-all text-sm text-gnl-300 hover:underline"
            >
              {t('igralci.prevzem.odlocitev.dokaz')}
            </a>
          )}
          <div className="flex flex-wrap gap-2">
            <button disabled={dela} onClick={() => odloci(true)} className="gumb-glavni disabled:opacity-50">
              {t('igralci.prevzem.zeton.potrdi')}
            </button>
            <button disabled={dela} onClick={() => odloci(false)} className="gumb-tih disabled:opacity-50">
              {t('igralci.prevzem.zeton.zavrni')}
            </button>
          </div>
          {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
        </div>
      )}
    </div>
  )
}
