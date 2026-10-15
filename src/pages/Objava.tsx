// Prosojnice samodejne objave (Instagram, Facebook), 1080 × 1350.
//
// Notranja stran: ne vodi nanjo nobena povezava, je `noindex` in ni v
// zemljevidu. Vsebino (dejstva, ki jih je izbral scripts/objave.mjs) vpiše
// Playwright v `window.__OBJAVA__` pred nalaganjem, jezik pa v izbiro jezika;
// `?slide=n` izbere prosojnico. Stran izriše main.tsx brez glave in noge.
import EnajstericaNaIgriscu, { type IgralecEnajsterice } from '../components/EnajstericaNaIgriscu'
import Grb from '../components/Grb'
import { useState } from 'react'
import { t, stevilo } from '../i18n'
import { supabase } from '../lib/supabase'
import { useNoindex } from '../lib/naslov'
import { formatirajTocke, mnozina, prikazniIme, tockZ, GOLI } from '../lib/pomozno'
import type { Pozicija } from '../lib/tipi'

export interface Poudarek {
  vrsta: 'skok' | 'vratar' | 'hattrick' | 'liga_tedna'
  ime: string
  klub?: string | null
  /** Liga (četrtek, vse države). */
  liga?: string
  staro?: number
  novo?: number
  tocke?: number
  delez?: number
  goli?: number
  novih?: number
}

export interface VsebinaObjave {
  slot: 'pon' | 'cet' | 'mejnik'
  /** Vse objave so angleške; `drzava` je angleško ime države (ponedeljek). */
  liga: { ime: string; krog: number; sezona: string; drzava?: string } | null
  igralec: { ime: string; klub: string; liga?: string; pozicija: Pozicija | null; tocke: number; goli: number; grb?: string | null } | null
  poudarki: Poudarek[]
  idealna: IgralecEnajsterice[]
  /** Mejnik uporabnikov (slot `mejnik`). */
  mejnik?: { mejnik: number; uporabnikov: number; drzav: number; lig: number; ekip: number }
}

declare global {
  interface Window {
    __OBJAVA__?: VsebinaObjave
  }
}

type Prosojnica = 'uvod' | 'poudarki' | 'enajsterica' | 'poziv' | 'mejnik' | 'mejnikStevilke'

/** Prosojnice, ki jih vsebina ima (isti seznam bere generator). */
export function prosojnice(v: VsebinaObjave): Prosojnica[] {
  if (v.mejnik) return ['mejnik', 'mejnikStevilke', 'poziv']
  return [
    v.igralec ? 'uvod' : null,
    v.poudarki.length ? 'poudarki' : null,
    v.idealna.length >= 11 ? 'enajsterica' : null,
    'poziv',
  ].filter((p): p is Prosojnica => p !== null)
}

const cena = (v?: number) => t('skupno.cena', { v: stevilo(Number(v ?? 0), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })

function Glava({ v }: { v: VsebinaObjave }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img src="/logo/slff-grb.png" alt="" className="h-24 w-24" />
        <span className="text-5xl font-black tracking-tight">SLFF</span>
      </div>
      <div className="text-right text-2xl font-semibold text-gnl-200">
        {v.liga ? (
          <>
            <div className="font-black text-white">{v.liga.ime}</div>
            <div>{[v.liga.drzava, t('domov.krog', { krog: v.liga.krog }), v.liga.sezona].filter(Boolean).join(' · ')}</div>
          </>
        ) : v.mejnik ? null : (
          <div className="max-w-[34rem] font-black text-white">{t('domov.objava.tedenVEvropi')}</div>
        )}
      </div>
    </div>
  )
}

function opisPoudarka(p: Poudarek): { naslov: string; vrednost: string } {
  switch (p.vrsta) {
    case 'skok':
      return { naslov: t('domov.objava.skok'), vrednost: `${cena(p.staro)} → ${cena(p.novo)}` }
    case 'vratar':
      return { naslov: t('domov.objava.vratar'), vrednost: mnozina(p.goli ?? 0, GOLI) }
    case 'hattrick':
      return { naslov: t('domov.objava.hattrick'), vrednost: mnozina(p.goli ?? 0, GOLI) }
    case 'liga_tedna':
      return { naslov: t('domov.objava.ligaTedna'), vrednost: t('domov.objava.novihEkip', { n: p.novih ?? 0 }) }
  }
}

function Vsebina({ v, kaj }: { v: VsebinaObjave; kaj: Prosojnica }) {
  if (kaj === 'uvod' && v.igralec) {
    const i = v.igralec
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
        <div className="text-4xl font-bold uppercase tracking-[0.2em] text-[color:var(--zlato)]">
          {t('domov.objava.igralecKroga')}
        </div>
        <Grb ime={i.klub} logo={i.grb} velikost={220} />
        <div className="text-8xl font-black leading-tight">{prikazniIme(i.ime)}</div>
        <div className="text-4xl text-slate-300">
          {[i.klub, i.liga].filter(Boolean).join(' · ')}
          {i.pozicija && ` · ${t(`skupno.pozicija.${i.pozicija}`)}`}
        </div>
        <div className="rounded-3xl bg-gnl-400 px-12 py-6 text-7xl font-black text-slate-950">
          {formatirajTocke(i.tocke)} {tockZ(i.tocke)}
        </div>
        {i.goli > 0 && <div className="text-4xl font-semibold">⚽ {mnozina(i.goli, GOLI)}</div>}
      </div>
    )
  }
  if (kaj === 'mejnik' && v.mejnik) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="text-5xl font-bold uppercase tracking-[0.2em] text-[color:var(--zlato)]">{t('domov.objava.hvala')}</div>
        <div className="text-[15rem] font-black leading-none tracking-tight text-[color:var(--zlato)] drop-shadow-[0_8px_30px_rgba(255,209,102,0.35)]">
          {stevilo(v.mejnik.mejnik)}
        </div>
        <div className="text-5xl font-black naslov">{t('domov.objava.mejnikPodnaslov')}</div>
        <img src="/logo/slff-maskota.png" alt="" className="mt-6 h-[26rem]" />
      </div>
    )
  }
  if (kaj === 'mejnikStevilke' && v.mejnik) {
    const m = v.mejnik
    const vrstice: [number, string][] = [[m.drzav, t('domov.objava.drzav')], [m.lig, t('domov.objava.lig')], [m.ekip, t('domov.objava.ekip')]]
    return (
      <div className="my-10 flex flex-1 flex-col justify-center gap-8">
        <div className="text-6xl font-black naslov">{t('domov.objava.mejnikStevilke')}</div>
        {vrstice.map(([n, oznaka]) => (
          <div key={oznaka} className="flex items-baseline gap-8 rounded-3xl border border-white/10 bg-white/[0.06] px-12 py-8">
            <div className="text-[7rem] font-black leading-none text-[color:var(--zlato)]">{stevilo(n)}</div>
            <div className="text-5xl font-bold text-slate-200">{oznaka}</div>
          </div>
        ))}
      </div>
    )
  }
  if (kaj === 'poudarki') {
    return (
      <div className="my-10 flex flex-1 flex-col justify-center gap-6">
        <div className="text-5xl font-black naslov">{t('domov.objava.krogVStevilkah')}</div>
        {v.poudarki.slice(0, 5).map((p, n) => {
          const o = opisPoudarka(p)
          return (
            <div key={n} className="rounded-3xl border border-white/10 bg-white/[0.06] px-10 py-5">
              <div className="text-2xl font-bold uppercase tracking-widest text-gnl-300">{o.naslov}</div>
              <div className="mt-1 text-[2.75rem] font-black leading-tight">{p.vrsta === 'liga_tedna' ? p.ime : prikazniIme(p.ime)}</div>
              <div className="mt-1 text-3xl text-slate-300">
                {[p.klub, p.liga].filter(Boolean).map((x) => `${x} · `).join('')}
                {o.vrednost}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
  if (kaj === 'enajsterica') {
    return (
      <div className="my-8 flex flex-1 flex-col justify-center gap-8">
        <div className="text-5xl font-black naslov">{t('domov.idealna.naslov')}</div>
        <div style={{ zoom: 2.3 }}>
          <EnajstericaNaIgriscu igralci={v.idealna} />
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12 text-center">
      <img src="/logo/slff-maskota.png" alt="" className="h-80" />
      <div className="text-7xl font-black naslov">{t('domov.objava.poziv')}</div>
      <div className="text-4xl text-slate-300">{t('domov.uvod.geslo')}</div>
      <div className="rounded-3xl bg-gnl-400 px-14 py-7 text-6xl font-black text-slate-950">slff.eu</div>
    </div>
  )
}

/** Ena prosojnica (smoke jo izriše s preizkusno vsebino). */
export function Prosojnica({ v, n }: { v: VsebinaObjave; n: number }) {
  const seznam = prosojnice(v)
  const i = Math.min(Math.max(n, 0), seznam.length - 1)
  return (
    <div
      id="prosojnica"
      className="relative flex h-[1350px] w-[1080px] flex-col overflow-hidden bg-gradient-to-b from-[#14603f] via-[#0b3d2e] to-[#04140f] p-16 text-slate-100"
      style={{ fontFamily: "'InterObjava', sans-serif" }}
    >
      {/* Strežnik (Playwright na Linuxu) nima pisave Inter; brez nje bi rišel s kitajsko nadomestno. */}
      <style>{`@font-face{font-family:'InterObjava';src:url('/fonts/InterVariable.woff2') format('woff2');font-weight:100 900;font-display:block}`}</style>
      <div className="igrisce pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative flex flex-1 flex-col">
        <Glava v={v} />
        <Vsebina v={v} kaj={seznam[i]} />
        <div className="flex justify-between text-2xl text-slate-400">
          <span>slff.eu</span>
          <span>
            {i + 1}/{seznam.length}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Povezava "Ustavi objavo" z Discorda: slff.eu/objava#ustavi=<žeton>. Žeton je v
 * # (ne pride v dnevnike strežnika); ustavi šele gumb, ker Discord povezave
 * odpira sam (predogled). Notranje orodje, zato slovensko kot Administracija.
 */
function UstaviObjavo({ zeton }: { zeton: string }) {
  const [stanje, setStanje] = useState<'caka' | 'dela' | 'ustavljeno' | 'ne_velja' | 'napaka'>('caka')
  const ustavi = async () => {
    setStanje('dela')
    const { data, error } = await supabase.rpc('ustavi_objavo', { p_zeton: zeton })
    setStanje(error ? 'napaka' : data ? 'ustavljeno' : 'ne_velja')
  }
  const sporocilo = {
    caka: 'Objava na Instagram in Facebook bo šla ob napovedanem času, če je ne ustaviš.',
    dela: 'Ustavljam …',
    ustavljeno: '⛔ Objava je ustavljena. Ne bo objavljena.',
    ne_velja: 'Povezava ne velja več: objava je že ustavljena, objavljena ali je njen čas mimo.',
    napaka: 'Ni uspelo. Poskusi znova ali piši na Discord.',
  }[stanje]
  return (
    <div className="mx-auto max-w-md p-8 text-slate-100">
      <h1 className="mb-4 text-2xl font-bold">Ustavi objavo</h1>
      <p className="mb-6 text-slate-300">{sporocilo}</p>
      {(stanje === 'caka' || stanje === 'napaka') && (
        <button type="button" onClick={ustavi} className="rounded-lg bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-500">
          ⛔ Ustavi objavo
        </button>
      )}
    </div>
  )
}

export default function Objava() {
  useNoindex(true)
  const zeton = location.hash.startsWith('#ustavi=') ? location.hash.slice('#ustavi='.length) : null
  if (zeton) return <UstaviObjavo zeton={zeton} />
  const v = window.__OBJAVA__
  if (!v) return <p className="p-8 text-slate-400">Ni vsebine objave (window.__OBJAVA__).</p>
  // Generator prebere, koliko prosojnic naj posname.
  document.documentElement.dataset.prosojnic = String(prosojnice(v).length)
  return <Prosojnica v={v} n={Number(new URLSearchParams(location.search).get('slide') ?? 0)} />
}
