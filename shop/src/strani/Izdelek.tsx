import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, type Izdelek as TIzdelek } from '../baza'
import { cena, po, t } from '../besede'
import { dodaj, NAJVEC, shrani, useKosarica } from '../kosarica'
import { useNaslov } from '../Okvir'
import { Nalaganje } from '../seja'
import { Slika, ZnackaVoljo } from './Katalog'

export function IzdelekView({ i }: { i: TIzdelek }) {
  const kosarica = useKosarica()
  const ime = po(i.ime_sl, i.ime_en)
  const prodajne = i.razlicice.filter((r) => r.na_voljo !== 'ne')
  // Ena sama različica (šal, skodelica) je izbrana sama.
  const [izbrana, setIzbrana] = useState<number | null>(i.razlicice.length === 1 && prodajne.length === 1 ? prodajne[0].id : null)
  const [kolicina, setKolicina] = useState(1)
  const [slika, setSlika] = useState(0)
  /** Koliko kosov je zadnji klik res dodal (null = še ni klika). */
  const [dodano, setDodano] = useState<number | null>(null)
  useNaslov(ime, po(i.opis_sl, i.opis_en).slice(0, 160) || undefined)
  const r = i.razlicice.find((x) => x.id === izbrana) ?? null
  const cenaOd = Math.min(...i.razlicice.map((x) => x.cena))
  const enaCena = i.razlicice.every((x) => x.cena === cenaOd)

  function vKosarico() {
    if (!r) return
    const imam = (k: typeof kosarica) => k.postavke.find((p) => p.razlicica_id === r.id)?.kolicina ?? 0
    const nova = dodaj(kosarica, r.id, kolicina, i.slug)
    shrani(nova)
    setDodano(imam(nova) - imam(kosarica))
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <Link to="/" className="povezava text-sm">← {t('izdelek.nazaj')}</Link>
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="space-y-3">
          <Slika src={i.slike[slika]} alt={ime} />
          {i.slike.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {i.slike.map((s, n) => (
                <button key={s} type="button" onClick={() => setSlika(n)} aria-label={t('izdelek.slika', { n: n + 1 })}
                  className={`overflow-hidden rounded-lg ring-2 ${n === slika ? 'ring-gnl-400' : 'ring-transparent hover:ring-white/30'}`}>
                  <img src={s} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t(`kategorija.${i.kategorija}`)}</p>
            <h1 className="text-3xl font-black naslov sm:text-4xl">{ime}</h1>
            <p className="text-2xl font-black text-gnl-300">
              {r ? cena(r.cena) : enaCena ? cena(cenaOd) : t('katalog.od', { cena: cena(cenaOd) })}
            </p>
            <p className="text-xs text-slate-500">{t('izdelek.zDdv')}</p>
          </div>

          {i.razlicice.length > 1 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-slate-300">{t('izdelek.izberi')}</legend>
              <div className="flex flex-wrap gap-2">
                {i.razlicice.map((x) => (
                  <button key={x.id} type="button" disabled={x.na_voljo === 'ne'} onClick={() => { setIzbrana(x.id); setDodano(null) }}
                    aria-pressed={x.id === izbrana}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                      x.id === izbrana ? 'border-gnl-400 bg-gnl-400/15 text-gnl-200' : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30'
                    }`}>
                    {po(x.oznaka_sl, x.oznaka_en)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {r && <ZnackaVoljo v={r.na_voljo} />}
          {prodajne.length === 0 && <ZnackaVoljo v="ne" />}

          {po(i.opis_sl, i.opis_en) && <p className="whitespace-pre-line leading-relaxed text-slate-300">{po(i.opis_sl, i.opis_en)}</p>}

          <ul className="space-y-1 text-sm text-slate-400">
            <li>✓ {t('izdelek.dostava')}</li>
            <li>✓ {t('izdelek.odstop')}</li>
          </ul>

          <div aria-live="polite">
            {dodano !== null && (
              <p className={`${dodano > 0 ? 'uspeh' : 'opozorilo'} flex items-center justify-between gap-3`}>
                {dodano === 0 ? t('izdelek.polno') : dodano < kolicina ? t('izdelek.delno', { n: dodano }) : t('izdelek.dodano')}
                <Link to="/cart" className="povezava">{t('izdelek.vKosarico')} →</Link>
              </p>
            )}
          </div>

          {/* Na telefonu je gumb vedno na dnu zaslona. */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <div className="flex items-center rounded-xl border border-white/15 bg-white/5" role="group" aria-label={t('izdelek.kolicina')}>
                <button type="button" aria-label={t('izdelek.manj')} disabled={kolicina <= 1} onClick={() => setKolicina((k) => k - 1)} className="px-3 py-2 text-lg font-bold disabled:opacity-30">−</button>
                <span className="w-8 text-center font-semibold tabular-nums">{kolicina}</span>
                <button type="button" aria-label={t('izdelek.vec')} disabled={kolicina >= NAJVEC} onClick={() => setKolicina((k) => k + 1)} className="px-3 py-2 text-lg font-bold disabled:opacity-30">+</button>
              </div>
              <button type="button" disabled={!r || r.na_voljo === 'ne'} onClick={vKosarico} className="gumb-glavni flex-1 py-3 md:flex-none md:px-8">
                {r || prodajne.length === 0 ? t('izdelek.dodaj') : t('izdelek.izberi')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Izdelek() {
  const { slug = '' } = useParams()
  const [i, setI] = useState<TIzdelek | null | undefined>(undefined)
  const [napaka, setNapaka] = useState(false)
  useNaslov(i === null || napaka ? t('izdelek.ni') : null)

  useEffect(() => {
    void supabase.rpc('trgovina_izdelek', { p_slug: slug }).then(({ data, error }) => {
      setNapaka(Boolean(error))
      setI(error ? null : ((data as unknown as TIzdelek | null) ?? null))
    })
  }, [slug])

  if (i === undefined) return <Nalaganje />
  if (napaka) return <p className="opozorilo" role="alert">{t('napaka.nalaganje')}</p>
  if (!i || i.razlicice.length === 0) {
    return (
      <div className="space-y-4">
        <p className="kartica p-6 text-slate-300">{t('izdelek.ni')}</p>
        <Link to="/" className="povezava">← {t('izdelek.nazaj')}</Link>
      </div>
    )
  }
  return <IzdelekView key={i.slug} i={i} />
}
