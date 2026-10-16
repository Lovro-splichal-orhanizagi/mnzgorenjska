// Prosojnice samodejne objave (Instagram, Facebook), 1080 × 1350.
//
// Notranja stran: ne vodi nanjo nobena povezava, je `noindex` in ni v
// zemljevidu. Vsebino (dejstva, ki jih je izbral scripts/objave.mjs) vpiše
// Playwright v `window.__OBJAVA__` pred nalaganjem, jezik pa v izbiro jezika;
// `?slide=n` izbere prosojnico. Stran izriše main.tsx brez glave in noge.
//
// Ponedeljek: naslovnica, ena prosojnica na državo, poziv. Četrtek: naslovnica,
// en dosežek na prosojnico, poziv. Mejnik: številka, številke SLFF, poziv.
import Grb from '../components/Grb'
import { useState, type ReactNode } from 'react'
import { t, stevilo } from '../i18n'
import { supabase } from '../lib/supabase'
import { useNoindex } from '../lib/naslov'
import { formatirajTocke, mnozina, prikazniIme, tockZ, GOLI } from '../lib/pomozno'
import type { Pozicija } from '../lib/tipi'

export interface IgralecObjave {
  ime: string
  klub: string
  grb?: string | null
  liga?: string
  krog?: number
  pozicija?: Pozicija | null
  tocke: number
  goli: number
}

/** Ponedeljek: ena država (angleško ime, zastava), igralec vikenda in do dva za njim. */
export interface DrzavaObjave {
  koda: string
  ime: string
  zastava: string
  igralec: IgralecObjave
  drugi: { ime: string; klub: string; tocke: number }[]
}

/** Četrtek: en dosežek tedna. Skupnost (manager, novi) je brez imen. */
export interface Dosezek {
  vrsta: 'hattrick' | 'najvec' | 'rekord' | 'vratar' | 'cistaMreza' | 'skok' | 'manager' | 'novi'
  ime?: string
  klub?: string
  grb?: string | null
  liga?: string
  /** Angleško ime države in zastava. */
  drzava?: string
  zastava?: string
  goli?: number
  tocke?: number
  krog?: number
  prej?: number
  staro?: number
  novo?: number
  niz?: number
  stevilo?: number
  uporabnikov?: number
}

export interface VsebinaObjave {
  slot: 'pon' | 'cet' | 'mejnik'
  /** Obdobje tekem ("5–11 Oct 2026"). */
  obdobje?: string
  drzave?: DrzavaObjave[]
  dosezki?: Dosezek[]
  /** Mejnik uporabnikov (slot `mejnik`). */
  mejnik?: { mejnik: number; uporabnikov: number; drzav: number; lig: number; ekip: number }
}

declare global {
  interface Window {
    __OBJAVA__?: VsebinaObjave
  }
}

type Prosojnica = 'naslovnica' | 'poziv' | 'mejnik' | 'mejnikStevilke' | `drzava-${number}` | `dosezek-${number}`

// Instagram Graph API: največ 10 slik. Pri devetih državah naslovnica odpade
// (9 + poziv), obdobje nosi glava prve države; več kot 9 jih objave.mjs ne da.
const NASLOVNICA_DO_DRZAV = 8

const brezNaslovnice = (v: VsebinaObjave) => (v.drzave?.length ?? 0) > NASLOVNICA_DO_DRZAV

/** Prosojnice, ki jih vsebina ima (isti seznam bere generator). */
export function prosojnice(v: VsebinaObjave): Prosojnica[] {
  if (v.mejnik) return ['mejnik', 'mejnikStevilke', 'poziv']
  const srednje = v.drzave
    ? v.drzave.map((_, i): Prosojnica => `drzava-${i}`)
    : (v.dosezki ?? []).map((_, i): Prosojnica => `dosezek-${i}`)
  return [...(brezNaslovnice(v) ? [] : ['naslovnica' as const]), ...srednje, 'poziv']
}

const cena = (v?: number) => t('skupno.cena', { v: stevilo(Number(v ?? 0), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })
const tocke = (n?: number) => `${formatirajTocke(n ?? 0)} ${tockZ(n ?? 0)}`

function Glava({ desno }: { desno?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <div className="flex shrink-0 items-center gap-4">
        <img src="/logo/slff-grb.png" alt="" className="h-24 w-24" />
        <span className="text-5xl font-black tracking-tight">SLFF</span>
      </div>
      {desno && <div className="min-w-0 text-right text-4xl font-black leading-tight text-white">{desno}</div>}
    </div>
  )
}

const Oznaka = ({ children }: { children: ReactNode }) => (
  <div className="text-4xl font-bold uppercase tracking-[0.2em] text-[color:var(--zlato)]">{children}</div>
)

const Ploscica = ({ children }: { children: ReactNode }) => (
  <div className="rounded-3xl bg-gnl-400 px-12 py-5 text-6xl font-black text-slate-950">{children}</div>
)

const Sredina = ({ children, className = 'gap-8' }: { children: ReactNode; className?: string }) => (
  <div className={`flex flex-1 flex-col items-center justify-center text-center ${className}`}>{children}</div>
)

/** Ime igralca: dolga imena (madžarska, slovaška) manjša, da ne prelijejo. */
function ImeIgralca({ ime }: { ime: string }) {
  const p = prikazniIme(ime)
  const velikost = p.length > 22 ? 'text-6xl' : p.length > 15 ? 'text-7xl' : 'text-8xl'
  return <div className={`${velikost} max-w-full break-words font-black leading-[1.05]`}>{p}</div>
}

/** Klub · liga · krog; dolg niz manjši. */
function KlubLiga({ deli }: { deli: (string | null | undefined)[] }) {
  const s = deli.filter(Boolean).join(' · ')
  return <div className={`${s.length > 48 ? 'text-3xl' : 'text-4xl'} max-w-full break-words text-slate-300`}>{s}</div>
}

function opisDosezka(d: Dosezek): { naslov: string; vrednost: string; pod?: string } {
  switch (d.vrsta) {
    case 'hattrick':
      return { naslov: t('domov.objava.hattrick'), vrednost: mnozina(d.goli ?? 0, GOLI) }
    case 'vratar':
      return { naslov: t('domov.objava.vratar'), vrednost: mnozina(d.goli ?? 0, GOLI) }
    case 'najvec':
      return { naslov: t('domov.objava.najvec'), vrednost: tocke(d.tocke) }
    case 'rekord':
      return { naslov: t('domov.objava.rekord'), vrednost: tocke(d.tocke), pod: t('domov.objava.prejRekord', { n: formatirajTocke(d.prej ?? 0) }) }
    case 'cistaMreza':
      return { naslov: t('domov.objava.cistaMreza'), vrednost: t('domov.objava.zapored', { n: d.niz ?? 0 }) }
    case 'skok':
      return { naslov: t('domov.objava.skok'), vrednost: `${cena(d.staro)} → ${cena(d.novo)}` }
    case 'manager':
      return { naslov: t('domov.objava.manager'), vrednost: tocke(d.tocke) }
    case 'novi':
      return { naslov: t('domov.objava.novi'), vrednost: stevilo(d.stevilo ?? 0) }
  }
}

function vsebina(v: VsebinaObjave, kaj: Prosojnica): { desno?: ReactNode; telo: ReactNode } {
  if (kaj === 'naslovnica') {
    return {
      telo: (
        <Sredina className="gap-10">
          <Oznaka>{v.obdobje}</Oznaka>
          <div className="text-[6.5rem] font-black leading-[1.02] naslov">
            {v.drzave ? t('domov.objava.vikend') : t('domov.objava.dosezkiTedna')}
          </div>
          {v.drzave && (
            <div className="flex flex-wrap justify-center gap-5 text-7xl">
              {v.drzave.map((d) => <span key={d.koda}>{d.zastava}</span>)}
            </div>
          )}
          <img src="/logo/slff-maskota.png" alt="" className={v.drzave ? 'h-80' : 'h-[26rem]'} />
        </Sredina>
      ),
    }
  }
  if (kaj.startsWith('drzava-') && v.drzave) {
    const st = Number(kaj.slice('drzava-'.length))
    const d = v.drzave[st]
    const i = d.igralec
    return {
      desno: (
        <>
          <div>{d.zastava} {d.ime}</div>
          {st === 0 && brezNaslovnice(v) && <div className="text-2xl font-bold text-[color:var(--zlato)]">{v.obdobje}</div>}
        </>
      ),
      telo: (
        <Sredina className="gap-6">
          <Oznaka>{t('domov.objava.igralecKroga')}</Oznaka>
          <Grb ime={i.klub} logo={i.grb} velikost={170} />
          <ImeIgralca ime={i.ime} />
          <KlubLiga deli={[i.klub, i.liga, i.krog ? t('domov.krog', { krog: i.krog }) : null]} />
          <Ploscica>{tocke(i.tocke)}</Ploscica>
          {i.goli > 0 && <div className="text-4xl font-semibold">⚽ {mnozina(i.goli, GOLI)}</div>}
          {d.drugi.length > 0 && (
            <div className="mt-2 w-full rounded-3xl border border-white/10 bg-white/[0.06] px-10 py-5 text-left">
              <div className="mb-2 text-2xl font-bold uppercase tracking-widest text-gnl-300">{t('domov.objava.tudi')}</div>
              {d.drugi.map((o) => (
                <div key={o.ime + o.klub} className="flex items-baseline justify-between gap-6 py-1 text-3xl">
                  <span className="min-w-0 truncate">
                    <b>{prikazniIme(o.ime)}</b> <span className="text-slate-300">· {o.klub}</span>
                  </span>
                  <span className="shrink-0 font-black text-[color:var(--zlato)]">{tocke(o.tocke)}</span>
                </div>
              ))}
            </div>
          )}
        </Sredina>
      ),
    }
  }
  if (kaj.startsWith('dosezek-') && v.dosezki) {
    const d = v.dosezki[Number(kaj.slice('dosezek-'.length))]
    const o = opisDosezka(d)
    const desno = d.drzava ? <span>{d.zastava} {d.drzava}</span> : undefined
    if (d.vrsta === 'novi') {
      return {
        telo: (
          <Sredina>
            <Oznaka>{o.naslov}</Oznaka>
            <div className="text-[13rem] font-black leading-none text-[color:var(--zlato)] drop-shadow-[0_8px_30px_rgba(255,209,102,0.35)]">
              {o.vrednost}
            </div>
            <div className="text-5xl font-black naslov">{t('domov.objava.noviOpis')}</div>
            <div className="text-4xl text-slate-300">{t('domov.objava.skupajUporabnikov', { n: stevilo(d.uporabnikov ?? 0) })}</div>
            <img src="/logo/slff-maskota.png" alt="" className="mt-4 h-72" />
          </Sredina>
        ),
      }
    }
    if (d.vrsta === 'manager') {
      // Zastava je že velika na sredini; glava ostane brez države.
      return {
        telo: (
          <Sredina>
            <Oznaka>{o.naslov}</Oznaka>
            <div className="text-[10rem] leading-none">{d.zastava}</div>
            <div className="text-6xl font-black naslov">{t('domov.objava.managerOpis', { drzava: d.drzava ?? '' })}</div>
            <div className="text-[9rem] font-black leading-none text-[color:var(--zlato)]">{formatirajTocke(d.tocke ?? 0)}</div>
            <div className="text-5xl font-bold text-slate-200">{tockZ(d.tocke ?? 0)}</div>
          </Sredina>
        ),
      }
    }
    return {
      desno,
      telo: (
        <Sredina>
          <div className="text-6xl font-black uppercase leading-tight tracking-wide text-[color:var(--zlato)]">{o.naslov}</div>
          <Grb ime={d.klub ?? ''} logo={d.grb} velikost={200} />
          <ImeIgralca ime={d.ime ?? ''} />
          <KlubLiga deli={[d.klub, d.liga, d.krog ? t('domov.krog', { krog: d.krog }) : null]} />
          <Ploscica>{o.vrednost}</Ploscica>
          {o.pod && <div className="text-4xl text-slate-300">{o.pod}</div>}
        </Sredina>
      ),
    }
  }
  if (kaj === 'mejnik' && v.mejnik) {
    return {
      telo: (
        <Sredina className="gap-6">
          <div className="text-5xl font-bold uppercase tracking-[0.2em] text-[color:var(--zlato)]">{t('domov.objava.hvala')}</div>
          <div className="text-[15rem] font-black leading-none tracking-tight text-[color:var(--zlato)] drop-shadow-[0_8px_30px_rgba(255,209,102,0.35)]">
            {stevilo(v.mejnik.mejnik)}
          </div>
          <div className="text-5xl font-black naslov">{t('domov.objava.mejnikPodnaslov')}</div>
          <img src="/logo/slff-maskota.png" alt="" className="mt-6 h-[26rem]" />
        </Sredina>
      ),
    }
  }
  if (kaj === 'mejnikStevilke' && v.mejnik) {
    const m = v.mejnik
    const vrstice: [number, string][] = [[m.drzav, t('domov.objava.drzav')], [m.lig, t('domov.objava.lig')], [m.ekip, t('domov.objava.ekip')]]
    return {
      telo: (
        <div className="my-10 flex flex-1 flex-col justify-center gap-8">
          <div className="text-6xl font-black naslov">{t('domov.objava.mejnikStevilke')}</div>
          {vrstice.map(([n, oznaka]) => (
            <div key={oznaka} className="flex items-baseline gap-8 rounded-3xl border border-white/10 bg-white/[0.06] px-12 py-8">
              <div className="text-[7rem] font-black leading-none text-[color:var(--zlato)]">{stevilo(n)}</div>
              <div className="text-5xl font-bold text-slate-200">{oznaka}</div>
            </div>
          ))}
        </div>
      ),
    }
  }
  return {
    telo: (
      <Sredina className="gap-12">
        <img src="/logo/slff-maskota.png" alt="" className="h-80" />
        <div className="text-7xl font-black naslov">{t('domov.objava.poziv')}</div>
        <div className="text-4xl text-slate-300">{t('domov.uvod.geslo')}</div>
        <div className="rounded-3xl bg-gnl-400 px-14 py-7 text-6xl font-black text-slate-950">slff.eu</div>
      </Sredina>
    ),
  }
}

/** Ena prosojnica (smoke jo izriše s preizkusno vsebino). */
export function Prosojnica({ v, n }: { v: VsebinaObjave; n: number }) {
  const seznam = prosojnice(v)
  const i = Math.min(Math.max(n, 0), seznam.length - 1)
  const { desno, telo } = vsebina(v, seznam[i])
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
        <Glava desno={desno} />
        {telo}
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
