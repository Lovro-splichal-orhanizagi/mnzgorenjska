// Dodatki preverjenega igralca na profilu (`profil_igralca_plus`): pasica,
// barva, daljši opis, povezave, izpostavljena tekma ali statistika in
// sporočilo navijačem. Lastniku potrjenega profila, ki še ni preverjen,
// pokaže nakup (Stripe Checkout prek funkcije `preverjen-placilo`, le na
// spletu), preverjenemu urejevalnik in pri letni naročnini portal Stripe.
// Kaj kdo vidi, odloči baza (`je_preverjen`, `vidi_preverjene`).
import { useCallback, useEffect, useId, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { t, tx, datum, stevilo, jezikSlovarja } from '../i18n'
import { prevediNapako } from '../lib/napake'
import { jeNativno } from '../lib/platforma'
import { VEDRO_FOTOGRAFIJ, naslovFotografije } from '../lib/prevzem'
import {
  BARVE,
  NASLOV,
  STOLPEC_STATISTIKE,
  VZOREC,
  ocistiRocicoPlus,
  pozabiPreverjene,
  pripraviPasico,
  type Barva,
  type Statistika,
} from '../lib/preverjeni'
import { Link } from './Povezava'

interface Plus {
  player_id: number
  opis: string | null
  youtube: string | null
  x: string | null
  splet: string | null
  pasica: string | null
  barva: string | null
  tekma_id: number | null
  statistika: string | null
  sporocilo: string | null
}

const STATISTIKE = Object.keys(STOLPEC_STATISTIKE) as Statistika[]
const IZBIRA_TEKME = 'id, played_on, home_goals, away_goals, domaci:home_team_id(name), gostje:away_team_id(name)'

interface Tekma {
  id: number
  played_on: string | null
  home_goals: number
  away_goals: number
  domaci: { name: string } | null
  gostje: { name: string } | null
}

const opisTekme = (m: Tekma) =>
  `${m.domaci?.name ?? '?'} ${m.home_goals}:${m.away_goals} ${m.gostje?.name ?? '?'}${m.played_on ? ` · ${datum(m.played_on)}` : ''}`

export default function PreverjeniProfil({
  igralecId,
  glavni,
  jeLastnik,
  urejam,
}: {
  igralecId: number
  glavni: number
  jeLastnik: boolean
  urejam: boolean
}) {
  const [plus, setPlus] = useState<Plus | null | undefined>(undefined)
  const [lastnik, setLastnik] = useState<{ vidi: boolean; preverjen: boolean; vir: string | null } | null>(null)
  // Vrnitev s Checkout (`?placilo=uspeh`): webhook pravico zapiše v nekaj sekundah.
  const placano = new URLSearchParams(useLocation().search).get('placilo') === 'uspeh'

  const nalozi = useCallback(async () => {
    const [{ data }, vidi, prev, pravica] = await Promise.all([
      supabase.from('profil_igralca_plus').select('*').eq('player_id', glavni).maybeSingle(),
      jeLastnik ? supabase.rpc('vidi_preverjene') : Promise.resolve({ data: false }),
      jeLastnik ? supabase.rpc('je_preverjen', { p_player_id: glavni }) : Promise.resolve({ data: false }),
      jeLastnik ? supabase.rpc('preverjen_moja_pravica', { p_player_id: glavni }) : Promise.resolve({ data: [] }),
    ])
    setPlus((data as Plus | null) ?? null)
    setLastnik(
      jeLastnik ? { vidi: !!vidi.data, preverjen: !!prev.data, vir: (pravica.data ?? [])[0]?.vir ?? null } : null,
    )
    return !!prev.data
  }, [glavni, jeLastnik])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  // Po plačilu ~20 s sprašuje, ali je pravica že zapisana.
  useEffect(() => {
    if (!placano || !jeLastnik) return
    let ostalo = 10
    const id = window.setInterval(() => {
      ostalo -= 1
      void nalozi().then((ok) => {
        if (ok) pozabiPreverjene()
        if (ok || ostalo <= 0) window.clearInterval(id)
      })
    }, 2000)
    return () => window.clearInterval(id)
  }, [placano, jeLastnik, nalozi])

  if (plus === undefined) return null
  const kupuje = lastnik?.vidi && !lastnik.preverjen && !jeNativno()
  return (
    <>
      {plus && <Prikaz plus={plus} igralecId={igralecId} />}
      {placano && lastnik?.vidi && (lastnik.preverjen || !jeNativno()) && (
        <p className="kartica p-3 text-sm text-sky-200">
          {t(lastnik.preverjen ? 'igralci.preverjen.ponudba.uspeh' : 'igralci.preverjen.ponudba.obdeluje')}
        </p>
      )}
      {kupuje && !placano && <Ponudba igralecId={igralecId} />}
      {lastnik?.preverjen && lastnik.vir === 'letna' && !jeNativno() && <Narocnina igralecId={igralecId} />}
      {lastnik?.preverjen && urejam && (
        <Urejevalnik
          glavni={glavni}
          igralecId={igralecId}
          plus={plus}
          naShranjeno={async () => {
            pozabiPreverjene()
            await nalozi()
          }}
        />
      )}
    </>
  )
}

function Prikaz({ plus, igralecId }: { plus: Plus; igralecId: number }) {
  const barva = plus.barva ? BARVE[plus.barva as Barva] : undefined
  const pasica = naslovFotografije(plus.pasica)
  const povezave = [
    plus.youtube && { naslov: NASLOV.youtube(plus.youtube), besedilo: `${t('igralci.preverjen.youtube')}: @${plus.youtube}` },
    plus.x && { naslov: NASLOV.x(plus.x), besedilo: `${t('igralci.preverjen.x')}: @${plus.x}` },
    plus.splet && { naslov: plus.splet, besedilo: plus.splet.replace(/^https:\/\//, '') },
  ].filter((p): p is { naslov: string; besedilo: string } => !!p)
  return (
    <div className="kartica space-y-3 overflow-hidden p-0" style={barva ? { borderColor: barva } : undefined}>
      {pasica && (
        <img src={pasica} alt="" width={1200} height={400} loading="lazy" className="aspect-[3/1] w-full object-cover" />
      )}
      <div className="space-y-2 px-3 pb-3 first:pt-3">
        {plus.opis && <p className="whitespace-pre-line break-words text-sm text-slate-200">{plus.opis}</p>}
        {plus.sporocilo && (
          <blockquote className="border-l-2 pl-2 text-sm italic text-slate-300" style={barva ? { borderColor: barva } : undefined}>
            <span className="block text-xs not-italic text-slate-500">{t('igralci.preverjen.sporocilo')}</span>"{plus.sporocilo}"
          </blockquote>
        )}
        <Izpostavljeno plus={plus} igralecId={igralecId} barva={barva} />
        {povezave.length > 0 && (
          <ul className="flex flex-wrap gap-3 text-sm">
            {povezave.map((p) => (
              <li key={p.naslov}>
                <a href={p.naslov} target="_blank" rel="nofollow noopener noreferrer ugc" className="break-all text-gnl-300 hover:underline">
                  {p.besedilo}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Izpostavljeno({ plus, igralecId, barva }: { plus: Plus; igralecId: number; barva: string | undefined }) {
  const [tekma, setTekma] = useState<Tekma | null>(null)
  const [vrednost, setVrednost] = useState<{ sezona: string | null; n: number } | null>(null)
  useEffect(() => {
    let veljavno = true
    setTekma(null)
    setVrednost(null)
    if (plus.tekma_id != null) {
      void supabase
        .from('matches')
        .select(IZBIRA_TEKME)
        .eq('id', plus.tekma_id)
        .maybeSingle()
        .then(({ data }) => veljavno && setTekma((data as Tekma | null) ?? null))
    } else if (plus.statistika && plus.statistika in STOLPEC_STATISTIKE) {
      const stolpec = STOLPEC_STATISTIKE[plus.statistika as Statistika]
      void supabase
        .from('player_season_stats')
        .select('season, points, goals, assists, matches, minutes, clean_sheets')
        .eq('player_id', igralecId)
        .order('season', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          const v = data?.[0]
          if (veljavno && v) setVrednost({ sezona: v.season, n: Number(v[stolpec] ?? 0) })
        })
    }
    return () => {
      veljavno = false
    }
  }, [plus.tekma_id, plus.statistika, igralecId])

  if (!tekma && !vrednost) return null
  return (
    <div className="rounded-lg bg-white/5 p-2 text-sm" style={barva ? { boxShadow: `inset 3px 0 0 ${barva}` } : undefined}>
      <span className="block text-xs text-slate-500">{t('igralci.preverjen.izpostavljeno')}</span>
      {tekma ? (
        <Link to={`/match/${tekma.id}`} className="font-semibold hover:text-gnl-300 hover:underline">
          {opisTekme(tekma)}
        </Link>
      ) : (
        vrednost && (
          <span className="font-semibold">
            {t(`igralci.preverjen.statistike.${plus.statistika as Statistika}`)}: {stevilo(vrednost.n)}
            {vrednost.sezona && <span className="ml-1 text-xs font-normal text-slate-500">({vrednost.sezona})</span>}
          </span>
        )
      )}
    </div>
  )
}

/** Klic funkcije plačila; vrne naslov Stripe ali prevedeno napako. */
async function placilo(telo: Record<string, unknown>): Promise<{ url?: string; napaka?: string }> {
  const { data, error } = await supabase.functions.invoke('preverjen-placilo', { body: telo })
  let sporocilo: string | undefined = data?.error
  if (error instanceof FunctionsHttpError) {
    sporocilo = await (error.context as Response)
      .json()
      .then((j: { error?: string }) => j?.error)
      .catch(() => undefined)
  }
  if (data?.url && !error) return { url: data.url as string }
  return { napaka: sporocilo ? prevediNapako(sporocilo) : t('igralci.preverjen.ponudba.napaka') }
}

function Ponudba({ igralecId }: { igralecId: number }) {
  const [vir, setVir] = useState<'letna' | 'dozivljenjska'>('letna')
  const [znacka, setZnacka] = useState(false)
  const [dostava, setDostava] = useState<'si' | 'eu'>('si')
  const [ime, setIme] = useState('')
  const [star18, setStar18] = useState(false)
  const [odpoved, setOdpoved] = useState(false)
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const zZnacko = vir === 'dozivljenjska' && znacka
  // Izrecna povezava oznake z izbiro: klik na besedilo (ceno, državo) izbere.
  const idp = useId()

  async function kupi() {
    setDela(true)
    setNapaka(null)
    const r = await placilo({
      akcija: 'checkout',
      player_id: igralecId,
      vir,
      znacka: zZnacko,
      dostava: zZnacko ? dostava : undefined,
      ime_na_znacki: zZnacko ? ime : undefined,
      star_vsaj_18: star18,
      odpoved_pravici: odpoved,
      jezik: jezikSlovarja(),
    })
    if (r.url) return window.location.assign(r.url)
    setDela(false)
    setNapaka(r.napaka ?? null)
  }

  return (
    <div className="kartica space-y-2 border-sky-400/30 p-3 text-sm">
      <h3 className="font-bold text-sky-200">{t('igralci.preverjen.ponudba.naslov')}</h3>
      <p className="text-slate-300">{t('igralci.preverjen.ponudba.opis')}</p>
      <fieldset className="space-y-1">
        {(['letna', 'dozivljenjska'] as const).map((v) => (
          <label key={v} htmlFor={`${idp}-${v}`} className="flex cursor-pointer items-center gap-2">
            <input id={`${idp}-${v}`} type="radio" name="vir-preverjen" checked={vir === v} onChange={() => setVir(v)} />
            <span className="font-semibold text-slate-100">{t(`igralci.preverjen.ponudba.${v}`)}</span>
          </label>
        ))}
      </fieldset>
      {vir === 'dozivljenjska' && (
        <div className="space-y-1 pl-5">
          <label htmlFor={`${idp}-znacka`} className="flex cursor-pointer items-center gap-2">
            <input id={`${idp}-znacka`} type="checkbox" checked={znacka} onChange={(e) => setZnacka(e.target.checked)} />
            <span>{t('igralci.preverjen.ponudba.znacka')}</span>
          </label>
          {znacka && (
            <div className="flex flex-wrap gap-3">
              {(['si', 'eu'] as const).map((d) => (
                <label key={d} htmlFor={`${idp}-${d}`} className="flex cursor-pointer items-center gap-1">
                  <input id={`${idp}-${d}`} type="radio" name="dostava-znacke" checked={dostava === d} onChange={() => setDostava(d)} />
                  {t(d === 'si' ? 'igralci.preverjen.ponudba.dostavaSi' : 'igralci.preverjen.ponudba.dostavaEu')}
                </label>
              ))}
            </div>
          )}
          {znacka && (
            <input
              value={ime}
              onChange={(e) => setIme(e.target.value)}
              maxLength={30}
              aria-label={t('igralci.preverjen.ponudba.imeNaZnacki')}
              placeholder={t('igralci.preverjen.ponudba.imeNaZnacki')}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 sm:max-w-xs"
            />
          )}
        </div>
      )}
      <label htmlFor={`${idp}-star18`} className="flex cursor-pointer items-start gap-2">
        <input id={`${idp}-star18`} type="checkbox" className="mt-1" checked={star18} onChange={(e) => setStar18(e.target.checked)} />
        <span>{t('igralci.preverjen.ponudba.star18')}</span>
      </label>
      <label htmlFor={`${idp}-odpoved`} className="flex cursor-pointer items-start gap-2">
        <input id={`${idp}-odpoved`} type="checkbox" className="mt-1" checked={odpoved} onChange={(e) => setOdpoved(e.target.checked)} />
        <span>{t('igralci.preverjen.ponudba.odpoved')}</span>
      </label>
      <p className="text-xs text-slate-400">
        {tx('igralci.preverjen.ponudba.pogoji', {}, {
          pogoji: (v) => (
            <a href="/legal#placljivo" target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">
              {v}
            </a>
          ),
        })}
      </p>
      <button
        type="button"
        disabled={dela || !star18 || !odpoved || (zZnacko && !ime.trim())}
        onClick={() => void kupi()}
        className="gumb-glavni text-sm disabled:opacity-50"
      >
        {t('igralci.preverjen.ponudba.kupi')}
      </button>
      {napaka && <p className="text-rose-400">{napaka}</p>}
    </div>
  )
}

function Narocnina({ igralecId }: { igralecId?: number }) {
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  return (
    <div className="text-sm">
      <button
        type="button"
        disabled={dela}
        onClick={async () => {
          setDela(true)
          setNapaka(null)
          const r = await placilo({ akcija: 'portal', player_id: igralecId })
          if (r.url) return window.location.assign(r.url)
          setDela(false)
          setNapaka(r.napaka ?? null)
        }}
        className="text-gnl-300 hover:underline disabled:opacity-50"
      >
        {t('igralci.preverjen.ponudba.upravljaj')}
      </button>
      {napaka && <p className="text-rose-400">{napaka}</p>}
    </div>
  )
}

/**
 * Naročnina na strani Račun: vsak z aktivno naročnino jo lahko prekliče,
 * ne glede na stikalo in profil. V aplikaciji le opomba (nakup in portal sta
 * na spletu).
 */
export function UpravljanjeNarocnine() {
  const [ima, setIma] = useState(false)
  useEffect(() => {
    void supabase.rpc('preverjen_moje_narocnine').then(({ data }) => setIma(!!data?.length))
  }, [])
  if (!ima) return null
  return (
    <section className="kartica space-y-2 p-4">
      <h2 className="text-lg font-bold">{t('igralci.preverjen.ponudba.narocninaNaslov')}</h2>
      {jeNativno() ? <p className="text-sm text-slate-300">{t('igralci.preverjen.ponudba.narocninaApp')}</p> : <Narocnina />}
    </section>
  )
}

function Urejevalnik({
  glavni,
  igralecId,
  plus,
  naShranjeno,
}: {
  glavni: number
  igralecId: number
  plus: Plus | null
  naShranjeno: () => Promise<void>
}) {
  const [opis, setOpis] = useState(plus?.opis ?? '')
  const [youtube, setYoutube] = useState(plus?.youtube ?? '')
  const [x, setX] = useState(plus?.x ?? '')
  const [splet, setSplet] = useState(plus?.splet ?? '')
  const [barva, setBarva] = useState<string | null>(plus?.barva ?? null)
  const [izpostavi, setIzpostavi] = useState(
    plus?.tekma_id != null ? `t:${plus.tekma_id}` : plus?.statistika ? `s:${plus.statistika}` : '',
  )
  const [sporocilo, setSporocilo] = useState(plus?.sporocilo ?? '')
  const [pasica, setPasica] = useState(plus?.pasica ?? null)
  const [tekme, setTekme] = useState<Tekma[]>([])
  const [napaka, setNapaka] = useState<string | null>(null)
  const [obvestilo, setObvestilo] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  // Tekme, na katerih je igralec nastopil (ta in glavna vrstica).
  useEffect(() => {
    void supabase
      .from('appearances')
      .select(`match_id, matches(${IZBIRA_TEKME})`)
      .in('player_id', [...new Set([glavni, igralecId])])
      .order('match_id', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const m = (data ?? []).map((v) => v.matches as unknown as Tekma | null).filter((v): v is Tekma => !!v)
        m.sort((a, b) => String(b.played_on ?? '').localeCompare(String(a.played_on ?? '')))
        setTekme(m)
      })
  }, [glavni, igralecId])

  async function zapisi(polja: Partial<Omit<Plus, 'player_id'>>) {
    const { data: obstaja } = await supabase.from('profil_igralca_plus').select('player_id').eq('player_id', glavni).maybeSingle()
    return obstaja
      ? supabase.from('profil_igralca_plus').update(polja).eq('player_id', glavni)
      : supabase.from('profil_igralca_plus').insert({ player_id: glavni, ...polja })
  }

  async function shrani(e: React.FormEvent) {
    e.preventDefault()
    setNapaka(null)
    setObvestilo(null)
    const yt = ocistiRocicoPlus(youtube)
    const xx = ocistiRocicoPlus(x)
    const sp = splet.trim()
    if (yt && !VZOREC.youtube.test(yt)) return setNapaka(t('igralci.prevzem.rocicaNapaka', { omrezje: t('igralci.preverjen.youtube') }))
    if (xx && !VZOREC.x.test(xx)) return setNapaka(t('igralci.prevzem.rocicaNapaka', { omrezje: t('igralci.preverjen.x') }))
    if (sp && (sp.length > 200 || !VZOREC.splet.test(sp))) return setNapaka(t('igralci.preverjen.napakaSplet'))
    setDela(true)
    const { error } = await zapisi({
      // Nove vrstice ostanejo, največ dve zapored (isto počne baza).
      opis:
        opis
          .replace(/\r\n?/g, '\n')
          .replace(/[ \t]+/g, ' ')
          .replace(/ ?\n ?/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim() || null,
      youtube: yt || null,
      x: xx || null,
      splet: sp || null,
      barva,
      tekma_id: izpostavi.startsWith('t:') ? Number(izpostavi.slice(2)) : null,
      statistika: izpostavi.startsWith('s:') ? izpostavi.slice(2) : null,
      sporocilo: sporocilo.replace(/\s+/g, ' ').trim() || null,
    })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    setObvestilo(t('igralci.prevzem.shranjeno'))
    await naShranjeno()
  }

  const odstraniDatoteko = async (pot: string | null) => {
    if (pot) await supabase.storage.from(VEDRO_FOTOGRAFIJ).remove([pot])
  }

  async function naloziPasico(datoteka: File) {
    setNapaka(null)
    setObvestilo(null)
    let slika: Awaited<ReturnType<typeof pripraviPasico>>
    try {
      slika = await pripraviPasico(datoteka)
    } catch (e) {
      const k = (e as Error).message
      return setNapaka(k === 'vrsta' ? t('igralci.prevzem.fotoVrsta') : t('igralci.preverjen.pasicaNapaka'))
    }
    setDela(true)
    const pot = `${glavni}/banner-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${slika.koncnica}`
    const { error: eNalozi } = await supabase.storage
      .from(VEDRO_FOTOGRAFIJ)
      .upload(pot, slika.slika, { contentType: slika.vrsta, cacheControl: '31536000', upsert: false })
    if (eNalozi) {
      setDela(false)
      return setNapaka(t('igralci.preverjen.pasicaNapaka'))
    }
    const { error } = await zapisi({ pasica: pot })
    setDela(false)
    if (error) {
      await odstraniDatoteko(pot)
      return setNapaka(prevediNapako(error.message))
    }
    await odstraniDatoteko(pasica)
    setPasica(pot)
    await naShranjeno()
  }

  async function odstraniPasico() {
    setDela(true)
    const { error } = await zapisi({ pasica: null })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    await odstraniDatoteko(pasica)
    setPasica(null)
    await naShranjeno()
  }

  const polje = 'w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2'
  const src = naslovFotografije(pasica)
  return (
    <form onSubmit={shrani} className="kartica space-y-3 border-sky-400/30 p-3 text-sm">
      <h3 className="font-bold text-sky-200">{t('igralci.preverjen.urejanje')}</h3>
      <div className="space-y-2">
        <span className="font-semibold">{t('igralci.preverjen.pasica')}</span>
        {src && <img src={src} alt="" width={1200} height={400} className="aspect-[3/1] w-full rounded-lg object-cover" />}
        <div className="flex flex-wrap gap-2">
          <label className="gumb-tih cursor-pointer text-xs">
            {t('igralci.preverjen.pasicaIzberi')}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={dela}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void naloziPasico(f)
              }}
            />
          </label>
          {pasica && (
            <button type="button" onClick={odstraniPasico} disabled={dela} className="text-xs text-slate-500 hover:text-rose-300">
              {t('igralci.preverjen.pasicaOdstrani')}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">{t('igralci.preverjen.pasicaNavodilo')}</p>
      </div>
      <fieldset className="space-y-1">
        <legend className="text-slate-300">{t('igralci.preverjen.barva')}</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BARVE) as Barva[]).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBarva(barva === b ? null : b)}
              aria-pressed={barva === b}
              aria-label={t(`igralci.preverjen.barve.${b}`)}
              title={t(`igralci.preverjen.barve.${b}`)}
              className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-slate-950 ${barva === b ? 'ring-2 ring-white' : ''}`}
              style={{ backgroundColor: BARVE[b] }}
            />
          ))}
        </div>
      </fieldset>
      <label className="block space-y-1">
        <span className="text-slate-300">{t('igralci.preverjen.opis')}</span>
        <textarea value={opis} onChange={(e) => setOpis(e.target.value)} maxLength={500} rows={4} className={polje} />
      </label>
      <label className="block space-y-1">
        <span className="text-slate-300">{t('igralci.preverjen.sporociloPolje')}</span>
        <input value={sporocilo} onChange={(e) => setSporocilo(e.target.value)} maxLength={140} className={polje} />
      </label>
      <label className="block space-y-1">
        <span className="text-slate-300">{t('igralci.preverjen.izpostavi')}</span>
        <select value={izpostavi} onChange={(e) => setIzpostavi(e.target.value)} className={polje}>
          <option value="">{t('igralci.preverjen.nic')}</option>
          <optgroup label={t('igralci.preverjen.statistika')}>
            {STATISTIKE.map((s) => (
              <option key={s} value={`s:${s}`}>
                {t(`igralci.preverjen.statistike.${s}`)}
              </option>
            ))}
          </optgroup>
          {tekme.length > 0 && (
            <optgroup label={t('igralci.preverjen.tekma')}>
              {tekme.map((m) => (
                <option key={m.id} value={`t:${m.id}`}>
                  {opisTekme(m)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-slate-300">{t('igralci.preverjen.youtube')}</span>
        <input value={youtube} onChange={(e) => setYoutube(e.target.value)} maxLength={80} placeholder="@" className={polje} />
      </label>
      <label className="block space-y-1">
        <span className="text-slate-300">{t('igralci.preverjen.x')}</span>
        <input value={x} onChange={(e) => setX(e.target.value)} maxLength={80} placeholder="@" className={polje} />
      </label>
      <label className="block space-y-1">
        <span className="text-slate-300">{t('igralci.preverjen.splet')}</span>
        <input value={splet} onChange={(e) => setSplet(e.target.value)} maxLength={200} placeholder="https://" inputMode="url" className={polje} />
      </label>
      {napaka && <p className="text-rose-400">{napaka}</p>}
      {obvestilo && <p className="text-gnl-300">{obvestilo}</p>}
      <button type="submit" disabled={dela} className="gumb-glavni disabled:opacity-50">
        {t('igralci.prevzem.shrani')}
      </button>
    </form>
  )
}
