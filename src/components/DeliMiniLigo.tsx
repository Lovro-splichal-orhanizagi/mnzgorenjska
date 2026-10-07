import { useEffect, useState } from 'react'
import {
  besediloVabila,
  deliBesedilo,
  kopiraj,
  povezavaVabila,
  povezaveDeljenja,
  type IzidDeljenja,
} from '../lib/miniLige'
import { t } from '../i18n'
import { izvor } from '../lib/platforma'

/**
 * Povabilo v mini ligo, ki se ga ne da spregledati.
 *
 * Polovica mini lig ima samo ustvarjalca: ligo je naredil, kode pa ni poslal
 * nikomur. Zato je deljenje tu en klik v vse smeri, kjer se amaterski
 * nogomet res pogovarja — sistemski list na telefonu, WhatsApp in Viber
 * naravnost, na računalniku pa še kopiranje povezave.
 *
 * `stanje`: 'nova' takoj po ustvarjanju, 'sam' ko je v ligi le ena ekipa,
 * sicer mirnejša vrstica.
 */
export default function DeliMiniLigo({
  ime,
  koda,
  stanje,
}: {
  ime: string
  koda: string
  stanje: 'nova' | 'sam' | 'polna'
}) {
  // navigator.share poznamo šele v brskalniku; ob izrisu na strežniku
  // (smoke) ga ni in gumb se pokaže po prvem učinku.
  const [lahkoDeli, setLahkoDeli] = useState(false)
  const [izid, setIzid] = useState<IzidDeljenja | null>(null)
  useEffect(() => {
    setLahkoDeli(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])
  useEffect(() => setIzid(null), [koda])

  const naslovStrani = izvor()
  const povezava = povezavaVabila(koda, naslovStrani)
  const besedilo = besediloVabila(ime, koda, naslovStrani)
  const { whatsapp, viber } = povezaveDeljenja(besedilo)
  const poudarjeno = stanje !== 'polna'

  const gumb =
    'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold ring-1 transition'

  return (
    <section
      className={`kartica space-y-3 p-4 ${poudarjeno ? 'border-gnl-400/40 bg-gnl-500/10' : ''}`}
    >
      {poudarjeno && (
        <div className="space-y-1">
          <h2 className="text-lg font-black text-gnl-200">
            {stanje === 'nova' ? t('lestvice.deli.naslovNova') : t('lestvice.deli.naslovSam')}
          </h2>
          <p className="text-sm text-slate-300">
            {stanje === 'nova' ? t('lestvice.deli.opisNova') : t('lestvice.deli.opisSam')}
          </p>
        </div>
      )}
      {!poudarjeno && <h2 className="text-sm font-bold text-slate-300">{t('lestvice.deli.naslov')}</h2>}

      {/* Na telefonu je dolga povezava le šum — gumbi spodaj jo delijo. */}
      <div className="hidden min-w-0 rounded-lg bg-black/20 px-3 py-2 sm:block">
        <div className="text-[11px] text-slate-500">{t('lestvice.deli.povezava')}</div>
        <div className="truncate font-mono text-sm text-gnl-300">{povezava}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {lahkoDeli && (
          <button
            onClick={async () =>
              setIzid(await deliBesedilo(t('lestvice.miniLige.naslovVabila', { ime }), besedilo))
            }
            className="gumb-glavni col-span-2 text-sm sm:col-span-1"
          >
            {t('lestvice.deli.deli')}
          </button>
        )}
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={`${gumb} bg-[#25D366]/15 text-[#7ee2a4] ring-[#25D366]/40 hover:bg-[#25D366]/25`}
        >
          {t('lestvice.deli.whatsapp')}
        </a>
        <a
          href={viber}
          className={`${gumb} bg-[#7360F2]/15 text-[#b7adff] ring-[#7360F2]/40 hover:bg-[#7360F2]/25`}
        >
          {t('lestvice.deli.viber')}
        </a>
        <button
          onClick={async () => setIzid(await kopiraj(povezava))}
          className={`${gumb} col-span-2 bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10 sm:col-span-1`}
        >
          {t('lestvice.deli.kopiraj')}
        </button>
      </div>

      <p className="text-xs text-slate-500">{t('lestvice.deli.koda', { koda })}</p>
      {izid && izid !== 'preklicano' && (
        <p className={`text-sm ${izid === 'neuspelo' ? 'text-rose-400' : 'text-gnl-300'}`} role="status">
          {izid === 'deljeno'
            ? t('lestvice.miniLige.poslano')
            : izid === 'kopirano'
              ? t('lestvice.deli.kopirano')
              : t('lestvice.miniLige.neuspelo')}
        </p>
      )}
    </section>
  )
}
