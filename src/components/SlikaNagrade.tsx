// Slika nagrade tedenskega pregleda (ali celega kroga) za skupino ali zgodbo.
//
// Postavitev je v `lib/slikaNagrade.ts`; ozadje, pisava in risanje elementov
// so isti kot pri sliki ekipe (`ZgodbaKroga.tsx`), deljenje gre prek
// `DeliSliko`. Človek sliko najprej vidi (predogled) in sam izbere, ali jo
// deli — pri šaljivi nagradi ga še opomnimo, naj premisli, ali se bo smejal
// tudi tisti, ki jo je dobil. Samodejno se ne objavi nikamor.
import { useEffect, useState } from 'react'
import DeliSliko from './DeliSliko'
import { naloziSliko, narisiElement, ozadje, pisava } from './ZgodbaKroga'
import { SIRINA_P, VISINA_P, KVADRAT } from '../lib/tedenskiPregled'
import {
  postaviNagrado,
  postaviCelPregled,
  imeDatotekeNagrade,
  type ElementSlike,
  type PodatkiNagrade,
  type PodatkiCelotnega,
} from '../lib/slikaNagrade'
import { jeSaljiva, naslovZgodbe, opisZgodbe, povezavaVabila } from '../lib/miniLige'
import { izvor } from '../lib/platforma'
import { t } from '../i18n'

export type ObrazecSlike = 'kvadrat' | 'zgodba'

async function narisi(c: CanvasRenderingContext2D, e: ElementSlike) {
  if (e.vrsta === 'maskota') {
    // Kremni sij za maskoto: temne obrobe (kapa, hlače) na temnem ozadju
    // sicer utonejo.
    const cx = e.x + e.w / 2
    const cy = e.y + e.h * 0.55
    const r = e.w * 0.62
    const sij = c.createRadialGradient(cx, cy, 0, cx, cy, r)
    sij.addColorStop(0, 'rgba(243,237,224,.36)')
    sij.addColorStop(0.6, 'rgba(243,237,224,.18)')
    sij.addColorStop(1, 'rgba(243,237,224,0)')
    c.fillStyle = sij
    c.fillRect(cx - r, cy - r, 2 * r, 2 * r)
    const slika = await naloziSliko(e.url)
    if (slika) c.drawImage(slika, e.x, e.y, e.w, e.h)
    return
  }
  await narisiElement(c, e)
}

/**
 * Izriše sliko v izbranem obrazcu. Kvadrat je sredina pokončne: isti
 * elementi, zamaknjeni za pas nad kvadratom, brez okrasja iz pasov.
 * `merilo` 2 za izvoz (ostro besedilo), manj za predogled.
 */
export async function narisiSliko(
  postavi: (meri: (s: string, px: number, teza: number) => number) => ElementSlike[],
  obrazec: ObrazecSlike,
  merilo = 2,
): Promise<Blob | null> {
  const platno = document.createElement('canvas')
  const visina = obrazec === 'kvadrat' ? KVADRAT.visina : VISINA_P
  platno.width = SIRINA_P * merilo
  platno.height = visina * merilo
  const c = platno.getContext('2d')
  if (!c) return null
  c.scale(merilo, merilo)
  if (obrazec === 'kvadrat') c.translate(0, -KVADRAT.y)
  await document.fonts?.ready
  await ozadje(c)
  const elementi = postavi((s, px, teza) => {
    c.font = pisava(teza, px)
    return c.measureText(s).width
  })
  for (const e of elementi) if (obrazec === 'zgodba' || !('samoPokoncno' in e && e.samoPokoncno)) await narisi(c, e)
  return new Promise((resolve) => platno.toBlob((b) => resolve(b), 'image/png'))
}

export default function SlikaNagrade({
  nagrada,
  pregled,
  koda,
  onZapri,
}: {
  /** Ena nagrada — ali `pregled` za sliko celega kroga. */
  nagrada?: PodatkiNagrade
  pregled?: PodatkiCelotnega
  koda: string
  onZapri: () => void
}) {
  const [obrazec, setObrazec] = useState<ObrazecSlike>('kvadrat')
  const [predogled, setPredogled] = useState<string | null>(null)

  const postavi = nagrada
    ? (meri: Parameters<typeof postaviNagrado>[1]) => postaviNagrado(nagrada, meri)
    : (meri: Parameters<typeof postaviCelPregled>[1]) => postaviCelPregled(pregled!, meri)
  const kljuc = JSON.stringify({ nagrada, pregled, obrazec })

  useEffect(() => {
    let veljavno = true
    let url: string | null = null
    setPredogled(null)
    narisiSliko(postavi, obrazec, 0.5)
      .then((blob) => {
        if (!veljavno || !blob) return
        url = URL.createObjectURL(blob)
        setPredogled(url)
      })
      .catch(() => {})
    return () => {
      veljavno = false
      if (url) URL.revokeObjectURL(url)
    }
    // `kljuc` povzame vse, od česar je slika odvisna.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kljuc])

  const podatki = nagrada ?? pregled!
  const vrsta = nagrada ? nagrada.zgodba.vrsta : 'pregled'
  const saljiva = !!nagrada && jeSaljiva(nagrada.zgodba.vrsta)
  const besedilo = nagrada
    ? `${naslovZgodbe(nagrada.zgodba)}: ${opisZgodbe(nagrada.zgodba)}`
    : t('lestvice.pregled.sporociloNaslov', { ime: podatki.liga, krog: podatki.krog })

  return (
    <div className="space-y-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold">
          {nagrada
            ? t('lestvice.pregled.slikaNagrade', { nagrada: naslovZgodbe(nagrada.zgodba) })
            : t('lestvice.pregled.slikaVse')}
        </div>
        <button onClick={onZapri} className="text-xs text-slate-400 hover:text-slate-200">
          {t('lestvice.pregled.zapri')}
        </button>
      </div>

      <div className="flex gap-1" role="group">
        {(['kvadrat', 'zgodba'] as const).map((o) => (
          <button
            key={o}
            onClick={() => setObrazec(o)}
            aria-pressed={o === obrazec}
            className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${
              o === obrazec ? 'bg-gnl-500/20 text-gnl-200 ring-1 ring-gnl-400/40' : 'bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            {o === 'kvadrat' ? t('lestvice.pregled.formatKvadrat') : t('lestvice.pregled.formatZgodba')}
          </button>
        ))}
      </div>

      <div className={obrazec === 'kvadrat' ? 'aspect-square w-full max-w-[18rem]' : 'aspect-[9/16] w-full max-w-[12rem]'}>
        {predogled ? (
          <img src={predogled} alt={t('lestvice.pregled.predogled')} className="h-full w-full rounded-lg object-cover" />
        ) : (
          <div className="animiraj-utrip h-full w-full rounded-lg bg-white/5" />
        )}
      </div>

      {saljiva && (
        <p className="text-xs text-amber-200/90">{t('lestvice.pregled.opozoriloSale', { ekipa: nagrada!.zgodba.ekipa })}</p>
      )}

      <DeliSliko
        narisi={() => narisiSliko(postavi, obrazec)}
        kljuc={kljuc}
        naslov={podatki.liga}
        besedilo={besedilo}
        povezava={povezavaVabila(koda, izvor())}
        imeSlike={imeDatotekeNagrade(podatki.liga, podatki.krog, vrsta)}
        gumbDeli={t('lestvice.pregled.deli')}
        gumbPrenesi={t('lestvice.pregled.prenesi')}
      />
    </div>
  )
}
