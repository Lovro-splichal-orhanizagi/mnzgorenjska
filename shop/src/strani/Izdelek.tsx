import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, type Izdelek as TIzdelek, type Prvak } from '../baza'
import { cena, jezik, po, t, type Kljuc } from '../besede'
import { dodaj, kljuc, NAJVEC, shrani, useKosarica } from '../kosarica'
import { useNaslov } from '../Okvir'
import { doplacilo, napakaImena, normaliziraj, PISAVA, stevilka, velikostImena, type Personalizacija, type Vrsta } from '../personalizacija'
import { Nalaganje, useSeja } from '../seja'
import { Slika, ZnackaVoljo } from './Katalog'

/** Besedilo in številka čez sliko izdelka (hrbet majice), kot ju dobi tiskarna. */
export function Predogled({ src, alt, ime, st }: { src?: string; alt: string; ime: string | null; st: number | null }) {
  return (
    <div className="relative">
      <Slika src={src} alt={alt} />
      {(ime || st !== null) && (
        <svg viewBox="0 0 300 300" aria-label={t('pers.predogled')} role="img" className="pointer-events-none absolute inset-0 h-full w-full"
          fill="#fff" stroke="#0f172a" strokeWidth="1.5" style={{ paintOrder: 'stroke' }} fontFamily={PISAVA} fontWeight={900} textAnchor="middle">
          {ime && <text x="150" y="95" fontSize={velikostImena(ime) * 0.8} letterSpacing="2">{ime.toUpperCase()}</text>}
          {st !== null && <text x="150" y={ime ? 215 : 190} fontSize="120">{st}</text>}
        </svg>
      )}
    </div>
  )
}

interface Izbira {
  /** null: obvezna možnost manjka ali vnos ni veljaven. */
  vnos: Personalizacija | undefined | null
  ime: string | null
  st: number | null
}

/** Obrazec personalizacije; javi veljaven vnos, besedilo za predogled in košarico. */
function Obrazec({ i, javi }: { i: TIzdelek; javi: (iz: Izbira) => void }) {
  const { seja } = useSeja()
  const uid = seja?.user.id ?? null
  const ima = (v: Vrsta) => i.personalizacije.find((m) => m.vrsta === v)
  const [ekipe, setEkipe] = useState<{ id: number; name: string }[] | null>(null)
  const [prvaki, setPrvaki] = useState<Prvak[] | null>(null)
  const [znacka, setZnacka] = useState<{ ime: string } | null | undefined>(undefined)
  const [ekipa, setEkipa] = useState<number | null>(null)
  const [prvak, setPrvak] = useState<number | null>(null)
  const [ime, setIme] = useState('')
  const [st, setSt] = useState('')
  const zEkipo = Boolean(ima('ime_ekipe'))
  const zPrvakom = Boolean(ima('prvak'))
  const zZnacko = Boolean(ima('znacka'))

  useEffect(() => {
    if (!uid) return
    if (zEkipo) {
      void supabase.from('fantasy_teams').select('id, name').eq('owner_id', uid).eq('hisna', false).order('id')
        .then(({ data }) => setEkipe(data ?? []))
    }
    if (zPrvakom) void supabase.rpc('trgovina_moji_prvaki').then(({ data }) => setPrvaki((data as unknown as Prvak[] | null) ?? []))
    if (zZnacko) void supabase.rpc('trgovina_moja_znacka').then(({ data }) => setZnacka((data as unknown as { ime: string } | null) ?? null))
  }, [uid, zEkipo, zPrvakom, zZnacko])

  // Napako pokažemo, ko kupec kaj vpiše; prazno obvezno polje le onemogoči gumb.
  const napakaIme = ima('poljubno_ime') && ime.trim() ? napakaImena(ime) : null
  const stevilo = st.trim() ? stevilka(st) : null
  const napakaSt = Boolean(st.trim()) && stevilo === null

  // Izpeljano stanje → starš (cena, predogled, gumb).
  useEffect(() => {
    const v: Personalizacija = {}
    let besedilo: string | null = null
    let manjka = false
    const p = prvak === null ? undefined : prvaki?.[prvak]
    const e = ekipe?.find((x) => x.id === ekipa)
    if (zEkipo) {
      if (e) [v.ime_ekipe, besedilo] = [e.id, e.name]
      else manjka ||= ima('ime_ekipe')!.obvezna
    }
    if (ima('poljubno_ime')) {
      if (ime.trim()) [v.poljubno_ime, besedilo] = [normaliziraj(ime), normaliziraj(ime)]
      else manjka ||= ima('poljubno_ime')!.obvezna
    }
    if (zPrvakom) {
      if (p) {
        v.prvak = { mini_liga_id: p.mini_liga_id, sezona: p.sezona }
        besedilo = `${jezik === 'en' ? 'Mini league champion' : 'Prvak mini lige'} ${p.ime} ${p.sezona}`
      } else manjka ||= ima('prvak')!.obvezna
    }
    if (zZnacko) {
      if (znacka) [v.znacka, besedilo] = [{}, znacka.ime]
      else manjka ||= ima('znacka')!.obvezna
    }
    if (stevilo !== null) v.stevilka = stevilo
    else manjka ||= Boolean(ima('stevilka')?.obvezna)
    const vnos = manjka || napakaIme || napakaSt ? null : Object.keys(v).length ? v : undefined
    javi({ vnos, ime: besedilo, st: stevilo })
  }, [ekipa, ekipe, prvak, prvaki, znacka, ime, stevilo, napakaIme, napakaSt])

  const oznaka = (v: Vrsta, k: Kljuc) => {
    const m = ima(v)!
    return (
      <span className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-slate-300">
        {t(k)}
        {m.doplacilo > 0 && <span className="text-gnl-300">{t('pers.doplacilo', { cena: cena(m.doplacilo) })}</span>}
        {!m.obvezna && <span className="text-xs font-normal text-slate-500">{t('pers.neobvezno')}</span>}
      </span>
    )
  }
  const prijava = (
    <p className="text-sm text-slate-400">
      {t('pers.prijava')} <Link to={`/login?next=/p/${i.slug}`} className="povezava">{t('nav.prijava')}</Link>
    </p>
  )

  return (
    <fieldset className="kartica space-y-4 p-4">
      <legend className="sr-only">{t('pers.naslov')}</legend>
      {zEkipo && (
        <label className="block space-y-1">
          {oznaka('ime_ekipe', 'pers.ime_ekipe')}
          {!uid ? prijava : ekipe === null ? <Nalaganje /> : ekipe.length === 0 ? <p className="text-sm text-slate-400">{t('pers.brezEkip')}</p> : (
            <select value={ekipa ?? ''} onChange={(e) => setEkipa(e.target.value ? Number(e.target.value) : null)} className="polje w-full">
              <option value="">{t('pers.izberiEkipo')}</option>
              {ekipe.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
        </label>
      )}
      {ima('poljubno_ime') && (
        <label className="block space-y-1">
          {oznaka('poljubno_ime', 'pers.poljubno_ime')}
          <input value={ime} onChange={(e) => setIme(e.target.value)} maxLength={24} autoComplete="off"
            aria-invalid={Boolean(napakaIme)} aria-describedby="pers-ime" className="polje w-full uppercase" />
          <span id="pers-ime" className={`block text-xs ${napakaIme ? 'text-rose-300' : 'text-slate-500'}`}>
            {napakaIme ? t(napakaIme) : t('pers.imeNamig')}
          </span>
        </label>
      )}
      {zPrvakom && (
        <div className="space-y-2">
          {oznaka('prvak', 'pers.prvak')}
          {!uid ? prijava : prvaki === null ? <Nalaganje /> : prvaki.length === 0 ? <p className="text-sm text-slate-400">{t('pers.niPrvak')}</p> : (
            <div className="flex flex-wrap gap-2">
              {prvaki.map((p, n) => (
                <button key={`${p.mini_liga_id}-${p.sezona}`} type="button" aria-pressed={n === prvak} onClick={() => setPrvak(n)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${n === prvak ? 'border-gnl-400 bg-gnl-400/15 text-gnl-200' : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30'}`}>
                  {t('pers.prvakOpis', { liga: p.ime, sezona: p.sezona, ekipa: p.ekipa })}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {zZnacko && (
        <div className="space-y-1">
          {oznaka('znacka', 'pers.znacka')}
          {!uid ? prijava : znacka === undefined ? <Nalaganje /> : znacka === null
            ? <p className="text-sm text-slate-400">{t('pers.niZnacka')}</p>
            : <p className="font-bold">{znacka.ime}</p>}
        </div>
      )}
      {ima('stevilka') && (
        <label className="block space-y-1">
          {oznaka('stevilka', 'pers.stevilka')}
          <input value={st} onChange={(e) => setSt(e.target.value)} inputMode="numeric" maxLength={2} autoComplete="off"
            aria-invalid={napakaSt} aria-describedby="pers-st" className="polje w-24" />
          <span id="pers-st" className={`block text-xs ${napakaSt ? 'text-rose-300' : 'text-slate-500'}`}>
            {napakaSt ? t('pers.napaka.stevilka') : t('pers.stevilkaNamig')}
          </span>
        </label>
      )}
      {(ima('poljubno_ime') || zEkipo) && <p className="text-xs text-slate-500">{t('pers.preverimo')}</p>}
    </fieldset>
  )
}

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
  const [izbira, setIzbira] = useState<Izbira>({ vnos: i.personalizacije.some((m) => m.obvezna) ? null : undefined, ime: null, st: null })
  const najvec = i.personalizacije.some((m) => m.vrsta === 'znacka') ? 1 : i.digitalni ? 5 : NAJVEC
  const personaliziran = i.personalizacije.length > 0
  useNaslov(ime, po(i.opis_sl, i.opis_en).slice(0, 160) || undefined)
  const r = i.razlicice.find((x) => x.id === izbrana) ?? null
  const cenaOd = Math.min(...i.razlicice.map((x) => x.cena))
  const enaCena = i.razlicice.every((x) => x.cena === cenaOd)

  const dopl = doplacilo(i.personalizacije, izbira.vnos ?? undefined)

  function vKosarico() {
    if (!r || izbira.vnos === null) return
    const vnos = izbira.vnos
    const k0 = kljuc({ razlicica_id: r.id, personalizacija: vnos })
    const imam = (k: typeof kosarica) => k.postavke.find((p) => kljuc(p) === k0)?.kolicina ?? 0
    const opis = [izbira.ime, izbira.st].filter((x) => x !== null && x !== '').join(' · ')
    const nova = dodaj(kosarica, r.id, Math.min(kolicina, najvec), i.slug, vnos, opis || undefined)
    shrani(nova)
    setDodano(imam(nova) - imam(kosarica))
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <Link to="/" className="povezava text-sm">← {t('izdelek.nazaj')}</Link>
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="space-y-3">
          {personaliziran ? <Predogled src={i.slike[slika]} alt={ime} ime={izbira.ime} st={izbira.st} /> : <Slika src={i.slike[slika]} alt={ime} />}
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
              {r ? cena(r.cena + dopl) : enaCena ? cena(cenaOd + dopl) : t('katalog.od', { cena: cena(cenaOd + dopl) })}
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

          {personaliziran && <Obrazec i={i} javi={setIzbira} />}

          {po(i.opis_sl, i.opis_en) && <p className="whitespace-pre-line leading-relaxed text-slate-300">{po(i.opis_sl, i.opis_en)}</p>}

          <ul className="space-y-1 text-sm text-slate-400">
            {i.digitalni ? <><li>✓ {t('izdelek.digitalni')}</li><li>✓ {t('izdelek.bon')}</li></> : <li>✓ {t('izdelek.dostava')}</li>}
            {i.po_narocilu && <li>✓ {t('izdelek.poNarocilu')}</li>}
            {personaliziran ? <li className="text-amber-200">! {t('izdelek.brezOdstopa')}</li> : <li>✓ {t('izdelek.odstop')}</li>}
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
                <button type="button" aria-label={t('izdelek.vec')} disabled={kolicina >= najvec} onClick={() => setKolicina((k) => k + 1)} className="px-3 py-2 text-lg font-bold disabled:opacity-30">+</button>
              </div>
              <button type="button" disabled={!r || r.na_voljo === 'ne' || izbira.vnos === null} onClick={vKosarico} className="gumb-glavni flex-1 py-3 md:flex-none md:px-8">
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
