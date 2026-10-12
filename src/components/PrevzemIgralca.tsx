import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { t, datum } from '../i18n'
import { prevediNapako } from '../lib/napake'
import {
  VEDRO_FOTOGRAFIJ,
  VZOREC_ROCICE,
  jeMladinskiSlug,
  naslovFotografije,
  ocistiRocico,
  pozabiFotografijo,
  pripraviFotografijo,
  razlicicaFotografije,
} from '../lib/prevzem'
import PreverjeniProfil from './PreverjeniProfil'
import PredstavitevIgralca, { OMREZJA, type Omrezje, type Potrdil, type Predstavitev } from './PredstavitevIgralca'

interface MojZahtevek {
  id: number
  player_id: number
  status: string
  created_at: string
}

export interface ZaOdlocitev {
  id: number
  prosilec: string | null
  dokaz_url: string | null
  created_at: string
  vloga: string
  ze_potrdil: boolean
}

/**
 * Prevzem profila ("To sem jaz") na strani igralca: značka in predstavitev
 * potrjenega igralca, gumb in okno za zahtevek, čakajoče stanje (vidi ga le
 * prosilec), urejanje predstavitve za lastnika, potrjevanje za poznavalca
 * kluba in soigralce ter prijava lažnega profila. Vsa preverjanja so v bazi.
 */
export default function PrevzemIgralca({
  igralecId,
  slugLige,
  anonimiziran,
}: {
  igralecId: number
  slugLige: string | undefined
  anonimiziran: boolean
}) {
  const { session } = useAuth()
  const uid = session?.user.id ?? null
  const [potrjen, setPotrjen] = useState<{ glavni: number; potrdil: Potrdil } | null | undefined>(undefined)
  const [profil, setProfil] = useState<Predstavitev | null>(null)
  const [moji, setMoji] = useState<MojZahtevek[]>([])
  const [odlocitve, setOdlocitve] = useState<ZaOdlocitev[]>([])
  const [okno, setOkno] = useState(false)
  const [urejam, setUrejam] = useState(false)
  const [prijavljam, setPrijavljam] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const { data: p } = await supabase
      .from('potrjeni_igralci')
      .select('glavni_player_id, potrdil')
      .eq('player_id', igralecId)
      .maybeSingle()
    const pot = p?.glavni_player_id != null ? { glavni: p.glavni_player_id, potrdil: p.potrdil as Potrdil } : null
    const [{ data: pr }, { data: mz }, { data: od }] = await Promise.all([
      pot
        ? supabase.from('profil_igralca').select('*').eq('player_id', pot.glavni).maybeSingle()
        : Promise.resolve({ data: null }),
      uid
        ? supabase
            .from('zahtevki_igralca')
            .select('id, player_id, status, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
      uid
        ? supabase.rpc('zahtevki_za_odlocitev', { p_player_id: igralecId })
        : Promise.resolve({ data: [] }),
    ])
    setPotrjen(pot)
    setProfil((pr as Predstavitev | null) ?? null)
    setMoji((mz ?? []) as MojZahtevek[])
    setOdlocitve((od ?? []) as ZaOdlocitev[])
  }, [igralecId, uid])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  if (potrjen === undefined) return null

  const mojOdprt = moji.find((z) => z.status === 'cakajoc')
  const mojPotrjen = moji.find((z) => z.status === 'potrjen')
  const jeLastnik = !!potrjen && mojPotrjen?.player_id === potrjen.glavni
  const zadnjiTu = moji.find((z) => z.player_id === igralecId)
  // Tudi na potrjenem profilu: drug zahtevek je spor, odloči admin.
  const lahkoZahteva = !!uid && !jeLastnik && !mojOdprt && !mojPotrjen && !anonimiziran

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
    <section className="space-y-3" aria-label={t('igralci.prevzem.oznaka')}>
      {/* predstavitev potrjenega igralca */}
      {potrjen && (
        <PredstavitevIgralca potrdil={potrjen.potrdil} profil={profil}>
          {jeLastnik && (
            <button onClick={() => setUrejam((u) => !u)} className="gumb-tih text-sm">
              {t('igralci.prevzem.uredi')}
            </button>
          )}
          {uid && !jeLastnik && !prijavljam && (
            <button
              onClick={() => setPrijavljam(true)}
              className="block text-xs text-slate-500 hover:text-rose-300"
            >
              {t('igralci.prevzem.prijavi')}
            </button>
          )}
          {prijavljam && (
            <Prijava
              naPreklic={() => setPrijavljam(false)}
              naPoslji={async (razlog) => {
                const ok = await rpc(
                  () => supabase.rpc('prijavi_profil_igralca', { p_player_id: igralecId, p_razlog: razlog || undefined }),
                  t('igralci.prevzem.prijavljeno'),
                )
                if (ok) setPrijavljam(false)
              }}
              dela={dela}
            />
          )}
        </PredstavitevIgralca>
      )}

      {/* preverjen igralec: dodatki, ponudba ali urejanje (vidno le pri stikalu) */}
      {potrjen && (
        <PreverjeniProfil igralecId={igralecId} glavni={potrjen.glavni} jeLastnik={jeLastnik} urejam={urejam} />
      )}

      {jeLastnik && urejam && potrjen && (
        <Urejevalnik
          glavni={potrjen.glavni}
          profil={profil}
          naShranjeno={async () => {
            pozabiFotografijo(potrjen.glavni)
            pozabiFotografijo(igralecId)
            await nalozi()
          }}
          naOdpoved={async () => {
            if (!mojPotrjen || !window.confirm(t('igralci.prevzem.odpovejPotrdi'))) return
            if (await rpc(() => supabase.rpc('preklici_moj_zahtevek', { p_id: mojPotrjen.id }))) setUrejam(false)
          }}
        />
      )}

      {/* čakajoči zahtevek: vidi ga le prosilec */}
      {mojOdprt && mojOdprt.player_id === igralecId && (
        <div className="kartica space-y-1 border-amber-400/30 p-3 text-sm">
          <p className="font-semibold text-amber-200">{t('igralci.prevzem.caka')}</p>
          <p className="text-xs text-slate-400">{t('igralci.prevzem.cakaOpis')}</p>
          <button
            onClick={() => rpc(() => supabase.rpc('preklici_moj_zahtevek', { p_id: mojOdprt.id }))}
            disabled={dela}
            className="text-xs text-slate-500 hover:text-rose-300 disabled:opacity-50"
          >
            {t('igralci.prevzem.umakni')}
          </button>
        </div>
      )}
      {!mojOdprt && !potrjen && zadnjiTu?.status === 'zavrnjen' && (
        <p className="text-xs text-slate-500">{t('igralci.prevzem.zavrnjen')}</p>
      )}

      {lahkoZahteva && (
        <button
          onClick={() => setOkno(true)}
          className={potrjen ? 'text-xs text-slate-500 hover:text-slate-200' : 'gumb-tih text-sm'}
        >
          {t('igralci.prevzem.gumb')}
        </button>
      )}

      {/* poznavalec kluba ali potrjen soigralec odloči */}
      {odlocitve.length > 0 && (
        <div className="kartica space-y-2 p-3 text-sm">
          <h3 className="font-bold">{t('igralci.prevzem.odlocitev.naslov')}</h3>
          {odlocitve.map((z) => (
            <VrsticaOdlocitve key={z.id} z={z} dela={dela} rpc={rpc} />
          ))}
        </div>
      )}

      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {sporocilo && <p className="text-sm text-gnl-300">{sporocilo}</p>}

      {okno && (
        <OknoZahtevka
          mladinska={jeMladinskiSlug(slugLige)}
          dela={dela}
          napaka={napaka}
          naZapri={() => setOkno(false)}
          naPoslji={async (dokaz, star16) => {
            const ok = await rpc(() =>
              supabase.rpc('prevzemi_igralca', {
                p_player_id: igralecId,
                p_dokaz_url: dokaz || undefined,
                p_star_vsaj_16: star16 || undefined,
              }),
            )
            if (ok) setOkno(false)
          }}
        />
      )}
    </section>
  )
}

/** Ena vrstica za poznavalca kluba (potrdi/zavrni) ali soigralca (potrdi). */
export function VrsticaOdlocitve({
  z,
  dela,
  rpc,
  imeIgralca,
}: {
  z: ZaOdlocitev
  dela: boolean
  rpc: (fn: () => PromiseLike<{ error: { message: string } | null }>, uspeh?: string) => Promise<boolean>
  imeIgralca?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-t border-white/5 pt-2 first:border-0 first:pt-0">
      <div className="min-w-0 flex-1">
        {imeIgralca && <div className="font-semibold">{imeIgralca}</div>}
        <div className="text-slate-300">
          {t('igralci.prevzem.odlocitev.prosilec', { ime: z.prosilec ?? '?' })}
          <span className="ml-2 text-xs text-slate-500">{datum(z.created_at)}</span>
        </div>
        {z.dokaz_url && (
          <a
            href={z.dokaz_url}
            target="_blank"
            rel="nofollow noopener noreferrer ugc"
            className="break-all text-xs text-gnl-300 hover:underline"
          >
            {t('igralci.prevzem.odlocitev.dokaz')}
          </a>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {z.vloga === 'klub' ? (
          <>
            <button
              disabled={dela}
              onClick={() =>
                rpc(
                  () => supabase.rpc('odloci_zahtevek_klub', { p_id: z.id, p_potrdi: true }),
                  t('igralci.prevzem.odlocitev.potrjeno'),
                )
              }
              className="gumb-glavni text-xs disabled:opacity-50"
            >
              {t('igralci.prevzem.odlocitev.potrdi')}
            </button>
            <button
              disabled={dela}
              onClick={() =>
                rpc(
                  () => supabase.rpc('odloci_zahtevek_klub', { p_id: z.id, p_potrdi: false }),
                  t('igralci.prevzem.odlocitev.zavrnjeno'),
                )
              }
              className="text-xs text-slate-500 hover:text-rose-300 disabled:opacity-50"
            >
              {t('igralci.prevzem.odlocitev.zavrni')}
            </button>
          </>
        ) : z.ze_potrdil ? (
          <span className="text-xs text-slate-400">{t('igralci.prevzem.odlocitev.zePotrdil')}</span>
        ) : (
          <button
            disabled={dela}
            onClick={() => rpc(() => supabase.rpc('potrdi_soigralca', { p_id: z.id }))}
            className="gumb-glavni text-xs disabled:opacity-50"
          >
            {t('igralci.prevzem.odlocitev.potrdiSoigralca')}
          </button>
        )}
      </div>
    </div>
  )
}

function OknoZahtevka({
  mladinska,
  dela,
  napaka,
  naZapri,
  naPoslji,
}: {
  mladinska: boolean
  dela: boolean
  napaka: string | null
  naZapri: () => void
  naPoslji: (dokaz: string, star16: boolean) => void
}) {
  const [star16, setStar16] = useState(false)
  useEffect(() => {
    const ob = (e: KeyboardEvent) => e.key === 'Escape' && naZapri()
    window.addEventListener('keydown', ob)
    return () => window.removeEventListener('keydown', ob)
  }, [naZapri])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div onClick={naZapri} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <form
        role="dialog"
        aria-modal="true"
        aria-label={t('igralci.prevzem.naslovOkna')}
        onSubmit={(e) => {
          e.preventDefault()
          naPoslji('', star16)
        }}
        className="relative max-h-[88dvh] w-full space-y-3 overflow-y-auto rounded-t-2xl border-t border-white/15 bg-slate-950 p-4 pb-[calc(1rem+var(--dno))] shadow-2xl sm:max-w-md sm:rounded-2xl sm:border sm:pb-4"
      >
        <h2 className="text-lg font-black">{t('igralci.prevzem.naslovOkna')}</h2>
        <p className="text-sm text-slate-300">{t('igralci.prevzem.opis')}</p>
        {mladinska && (
          <div className="space-y-1">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={star16}
                onChange={(e) => setStar16(e.target.checked)}
                className="mt-1"
                required
              />
              <span>{t('igralci.prevzem.star16')}</span>
            </label>
            <p className="text-xs text-slate-400">{t('igralci.prevzem.mlajsi')}</p>
          </div>
        )}
        {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={naZapri} className="gumb-tih text-sm">
            {t('igralci.prevzem.preklici')}
          </button>
          <button type="submit" disabled={dela || (mladinska && !star16)} className="gumb-glavni text-sm disabled:opacity-50">
            {t('igralci.prevzem.poslji')}
          </button>
        </div>
      </form>
    </div>
  )
}

function Prijava({
  naPreklic,
  naPoslji,
  dela,
}: {
  naPreklic: () => void
  naPoslji: (razlog: string) => void
  dela: boolean
}) {
  const [razlog, setRazlog] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        naPoslji(razlog.trim())
      }}
      className="space-y-2"
    >
      <label className="block space-y-1 text-xs">
        <span className="text-slate-400">{t('igralci.prevzem.prijaviRazlog')}</span>
        <textarea
          value={razlog}
          onChange={(e) => setRazlog(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={dela} className="gumb-glavni text-xs disabled:opacity-50">
          {t('igralci.prevzem.prijavi')}
        </button>
        <button type="button" onClick={naPreklic} className="gumb-tih text-xs">
          {t('igralci.prevzem.preklici')}
        </button>
      </div>
    </form>
  )
}

function Urejevalnik({
  glavni,
  profil,
  naShranjeno,
  naOdpoved,
}: {
  glavni: number
  profil: Predstavitev | null
  naShranjeno: () => Promise<void>
  naOdpoved: () => void
}) {
  const [vzdevek, setVzdevek] = useState(profil?.vzdevek ?? '')
  const [opis, setOpis] = useState(profil?.opis ?? '')
  const [rocice, setRocice] = useState<Record<Omrezje, string>>({
    instagram: profil?.instagram ?? '',
    tiktok: profil?.tiktok ?? '',
    facebook: profil?.facebook ?? '',
  })
  const [napaka, setNapaka] = useState<string | null>(null)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [dela, setDela] = useState(false)
  const [foto, setFoto] = useState(profil?.fotografija ?? null)

  /** Vpiše polja: vrstica predstavitve morda še ne obstaja. */
  async function zapisi(polja: Partial<Omit<Predstavitev, 'player_id' | 'skrij_ime'>>) {
    const { data: obstaja } = await supabase.from('profil_igralca').select('player_id').eq('player_id', glavni).maybeSingle()
    return obstaja
      ? supabase.from('profil_igralca').update(polja).eq('player_id', glavni)
      : supabase.from('profil_igralca').insert({ player_id: glavni, ...polja })
  }

  async function shrani(e: React.FormEvent) {
    e.preventDefault()
    setNapaka(null)
    setSporocilo(null)
    const ciste = {} as Record<Omrezje, string | null>
    for (const o of OMREZJA) {
      const r = ocistiRocico(rocice[o])
      if (r && !VZOREC_ROCICE[o].test(r)) return setNapaka(t('igralci.prevzem.rocicaNapaka', { omrezje: t(`igralci.prevzem.${o}`) }))
      ciste[o] = r || null
    }
    setDela(true)
    const { error } = await zapisi({
      vzdevek: vzdevek.trim() || null,
      opis: opis.replace(/\s+/g, ' ').trim() || null,
      ...ciste,
    })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    setSporocilo(t('igralci.prevzem.shranjeno'))
    await naShranjeno()
  }

  async function odstraniDatoteke(pot: string | null) {
    if (!pot) return
    await supabase.storage.from(VEDRO_FOTOGRAFIJ).remove([pot, razlicicaFotografije(pot, '-64'), razlicicaFotografije(pot, '-768')])
  }

  async function naloziFoto(datoteka: File) {
    setNapaka(null)
    setSporocilo(null)
    let slike: Awaited<ReturnType<typeof pripraviFotografijo>>
    try {
      slike = await pripraviFotografijo(datoteka)
    } catch (e) {
      const k = (e as Error).message
      return setNapaka(
        k === 'prevelika' ? t('igralci.prevzem.fotoPrevelika') : k === 'vrsta' ? t('igralci.prevzem.fotoVrsta') : t('igralci.prevzem.fotoNapaka'),
      )
    }
    setDela(true)
    const ime = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    const pot = `${glavni}/${ime}.${slike.koncnica}`
    const shramba = supabase.storage.from(VEDRO_FOTOGRAFIJ)
    const moznosti = { contentType: slike.vrsta, cacheControl: '31536000', upsert: false }
    const [a, b, c] = await Promise.all([
      shramba.upload(pot, slike.velika, moznosti),
      shramba.upload(razlicicaFotografije(pot, '-64'), slike.majhna, moznosti),
      shramba.upload(razlicicaFotografije(pot, '-768'), slike.polna, moznosti),
    ])
    if (a.error || b.error || c.error) {
      setDela(false)
      await odstraniDatoteke(pot)
      return setNapaka(t('igralci.prevzem.fotoNapaka'))
    }
    const { error } = await zapisi({ fotografija: pot })
    setDela(false)
    if (error) {
      await odstraniDatoteke(pot)
      return setNapaka(prevediNapako(error.message))
    }
    await odstraniDatoteke(foto)
    setFoto(pot)
    await naShranjeno()
  }

  async function odstraniFoto() {
    setDela(true)
    const { error } = await zapisi({ fotografija: null })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    await odstraniDatoteke(foto)
    setFoto(null)
    await naShranjeno()
  }

  const src = naslovFotografije(foto)

  return (
    <form onSubmit={shrani} className="kartica space-y-3 p-3 text-sm">
      <div className="space-y-2">
        <span className="font-semibold">{t('igralci.prevzem.fotografija')}</span>
        <div className="flex items-center gap-3">
          {src ? (
            <img src={src} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="h-16 w-16 rounded-full bg-white/5" aria-hidden="true" />
          )}
          <div className="flex flex-wrap gap-2">
            <label className="gumb-tih cursor-pointer text-xs">
              {t('igralci.prevzem.fotoIzberi')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={dela}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void naloziFoto(f)
                }}
              />
            </label>
            {foto && (
              <button type="button" onClick={odstraniFoto} disabled={dela} className="text-xs text-slate-500 hover:text-rose-300">
                {t('igralci.prevzem.fotoOdstrani')}
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-400">{t('igralci.prevzem.fotoNavodilo')}</p>
      </div>
      <label className="block space-y-1">
        <span className="text-slate-300">{t('igralci.prevzem.vzdevek')}</span>
        <input
          value={vzdevek}
          onChange={(e) => setVzdevek(e.target.value)}
          maxLength={24}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-slate-300">{t('igralci.prevzem.opisPolje')}</span>
        <textarea
          value={opis}
          onChange={(e) => setOpis(e.target.value)}
          maxLength={160}
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
        />
      </label>
      {OMREZJA.map((o) => (
        <label key={o} className="block space-y-1">
          <span className="text-slate-300">{t(`igralci.prevzem.${o}`)}</span>
          <input
            value={rocice[o]}
            onChange={(e) => setRocice((r) => ({ ...r, [o]: e.target.value }))}
            maxLength={80}
            placeholder="@"
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          />
        </label>
      ))}
      <p className="text-xs text-slate-500">{t('igralci.prevzem.rocicaPomoc')}</p>
      {napaka && <p className="text-rose-400">{napaka}</p>}
      {sporocilo && <p className="text-gnl-300">{sporocilo}</p>}
      <button type="submit" disabled={dela} className="gumb-glavni disabled:opacity-50">
        {t('igralci.prevzem.shrani')}
      </button>
      <div className="space-y-2 border-t border-white/10 pt-3">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={naOdpoved} className="text-xs text-slate-500 hover:text-rose-300">
            {t('igralci.prevzem.odpovej')}
          </button>
        </div>
      </div>
    </form>
  )
}
