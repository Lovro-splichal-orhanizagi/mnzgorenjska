// Reel samodejne objave (torek, sobota): 1080 × 1920, ~12–14 s, glasba pride
// zraven v scripts/objave.mjs (posnemiReel).
//
// Vse gibanje je CSS ali WAAPI (števci), brez časovnikov v JS: generator
// animacije ustavi in vsako sličico nastavi na točen čas
// (document.getAnimations → currentTime), zato je video gladek na vsakem
// strežniku. Prizori se menjajo na udarce (`v.bpm`), ki se ujemajo z glasbo.
// Trajanje in čas naslovnice stran zapiše v data-trajanje in data-naslovnica.
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import Grb from '../components/Grb'
import { t, stevilo } from '../i18n'
import { prikazniIme } from '../lib/pomozno'
import type { IgralecSeznama, KlubLestvice, VsebinaObjave, VrstaObjave } from './Objava'

const CSS = `
@font-face{font-family:'InterObjava';src:url('/fonts/InterVariable.woff2') format('woff2');font-weight:100 900;font-display:block}
@property --n{syntax:'<integer>';inherits:false;initial-value:0}
.reel-stevec{counter-reset:n var(--n)}
.reel-stevec::after{content:counter(n)}
@keyframes reel-noter{from{opacity:0;transform:scale(1.14)}to{opacity:1;transform:none}}
@keyframes reel-ven{to{opacity:0;transform:scale(.9)}}
@keyframes reel-pop{0%{opacity:0;transform:scale(.3)}65%{opacity:1;transform:scale(1.14)}100%{opacity:1;transform:none}}
@keyframes reel-gor{from{opacity:0;transform:translateY(90px)}to{opacity:1;transform:none}}
@keyframes reel-levo{from{opacity:0;transform:translateX(-260px)}to{opacity:1;transform:none}}
@keyframes reel-desno{from{opacity:0;transform:translateX(260px)}to{opacity:1;transform:none}}
@keyframes reel-udarec{0%{opacity:0;transform:scale(3.2) rotate(-10deg)}55%{opacity:1;transform:scale(.88) rotate(3deg)}100%{opacity:1;transform:none}}
@keyframes reel-rast{from{transform:scaleX(0)}to{transform:none}}
@keyframes reel-utrip{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes reel-poskok{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-28px) rotate(2deg)}}
@keyframes reel-zoga{from{transform:translateX(-260px) rotate(0)}to{transform:translateX(1340px) rotate(900deg)}}
@keyframes reel-proge{from{background-position:0 0}to{background-position:0 480px}}
@keyframes reel-napredek{from{transform:scaleX(0)}to{transform:none}}
`

const Z = 'text-[color:var(--zlato)]'

/** Animacija ob absolutnem času `ob` (sekunde od začetka reela). */
const anim = (ime: string, ob: number, trajanje = 0.55, krivulja = 'cubic-bezier(.2,.9,.3,1.2)'): CSSProperties =>
  ({ animation: `${ime} ${trajanje}s ${krivulja} ${ob.toFixed(3)}s both` })

function Vstop({ ob, kako = 'gor', className = '', children }: { ob: number; kako?: 'gor' | 'pop' | 'levo' | 'desno' | 'udarec'; className?: string; children: ReactNode }) {
  return <div className={className} style={anim(`reel-${kako}`, ob, kako === 'udarec' ? 0.5 : 0.55)}>{children}</div>
}

/** Števec od 0 do `cilj` (WAAPI na --n; necela števila brez štetja). */
function Stevec({ cilj, ob, trajanje = 1.1 }: { cilj: number; ob: number; trajanje?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const cel = Number.isInteger(cilj)
  useEffect(() => {
    if (!cel || !ref.current) return
    const a = ref.current.animate([{ '--n': '0' }, { '--n': String(cilj) }] as unknown as Keyframe[],
      { duration: trajanje * 1000, delay: ob * 1000, fill: 'both', easing: 'cubic-bezier(.15,.8,.25,1)' })
    return () => a.cancel()
  }, [cel, cilj, ob, trajanje])
  if (!cel) return <span>{stevilo(cilj)}</span>
  return <span ref={ref} className="reel-stevec" style={{ '--n': cilj } as CSSProperties} />
}

/** Prizor: hiter vstop ob `od`, izhod tik pred `do` (zadnji ostane). */
function Prizor({ od, doo, zadnji, children }: { od: number; doo: number; zadnji?: boolean; children: ReactNode }) {
  const animacija = `reel-noter 0.22s cubic-bezier(.2,.8,.2,1) ${od.toFixed(3)}s both`
    + (zadnji ? '' : `, reel-ven 0.16s ease-in ${(doo - 0.16).toFixed(3)}s forwards`)
  return (
    <div className="absolute inset-x-0 bottom-[150px] top-[230px] flex flex-col items-center justify-center gap-10 px-16 text-center"
      style={{ animation: animacija }}>
      {children}
    </div>
  )
}

/** Naslov z zadnjo besedo v rumeni. */
function Naslov({ besedilo, ob, velikost = 'text-[8.5rem]' }: { besedilo: string; ob: number; velikost?: string }) {
  const i = besedilo.lastIndexOf(' ')
  return (
    <Vstop ob={ob} kako="udarec">
      <div className={`${velikost} font-black uppercase leading-[0.95] tracking-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]`}>
        {i > 0 ? <>{besedilo.slice(0, i)} <span className={Z}>{besedilo.slice(i + 1)}</span></> : <span className={Z}>{besedilo}</span>}
      </div>
    </Vstop>
  )
}

const Oznaka = ({ children }: { children: ReactNode }) => (
  <div className={`text-4xl font-bold uppercase tracking-[0.2em] ${Z}`}>{children}</div>
)

function Maskota({ ob, udarec, visina = 'h-[26rem]' }: { ob: number; udarec: number; visina?: string }) {
  return (
    <Vstop ob={ob} kako="pop">
      <img src="/logo/slff-maskota.png" alt="" className={visina}
        style={{ animation: `reel-poskok ${udarec.toFixed(3)}s ease-in-out ${(ob + 0.55).toFixed(3)}s infinite` }} />
    </Vstop>
  )
}

const Zoga = ({ ob }: { ob: number }) => (
  <div className="pointer-events-none absolute bottom-6 left-0 text-8xl" style={anim('reel-zoga', ob, 1.6, 'linear')}>⚽</div>
)

const Cip = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`rounded-full bg-[color:var(--zlato)] px-5 py-1 font-black text-slate-950 ${className}`}>{children}</span>
)

const priimek = (ime: string) => ime.split(/\s+/)[0] ?? ime

function Uvod({ od, doo, naslov, oznaka, spodaj, udarec }: { od: number; doo: number; naslov: string; oznaka?: string; spodaj?: ReactNode; udarec: number }) {
  return (
    <Prizor od={od} doo={doo}>
      {oznaka && <Vstop ob={od + 0.05}><Oznaka>{oznaka}</Oznaka></Vstop>}
      <Naslov besedilo={naslov} ob={od + 0.12} />
      {spodaj}
      <Maskota ob={od + udarec * 2} udarec={udarec} visina="h-[22rem]" />
      <Zoga ob={od + 0.3} />
    </Prizor>
  )
}

function Poziv({ od, doo, udarec, pod }: { od: number; doo: number; udarec: number; pod?: string }) {
  return (
    <Prizor od={od} doo={doo} zadnji>
      <Maskota ob={od + 0.05} udarec={udarec} />
      <Naslov besedilo={t('domov.objava.poziv')} ob={od + udarec} velikost="text-[6.5rem]" />
      <Vstop ob={od + udarec * 2}><div className="text-4xl text-slate-300">{pod ?? t('domov.uvod.geslo')}</div></Vstop>
      <Vstop ob={od + udarec * 3} kako="pop">
        <div className="rounded-[2.5rem] bg-gnl-400 px-16 py-8 text-7xl font-black text-slate-950 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
          style={{ animation: `reel-utrip ${udarec.toFixed(3)}s ease-in-out ${(od + udarec * 3.5).toFixed(3)}s infinite` }}>
          slff.eu
        </div>
      </Vstop>
    </Prizor>
  )
}

// --- ekipa tedna ---------------------------------------------------------------------

const VRSTE_IGRISCA: [string, number][] = [['FWD', 13], ['MID', 37], ['DEF', 62], ['GK', 86]]

function Igrisce({ igralci, od, udarec }: { igralci: IgralecSeznama[]; od: number; udarec: number }) {
  return (
    <div className="relative h-[1180px] w-[960px] overflow-hidden rounded-[56px] border-4 border-white/30 bg-[#1d7a4c]/70 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <div className="igrisce absolute inset-0 opacity-70" />
      <div className="absolute inset-x-0 top-1/2 h-1 bg-white/30" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/30" />
      <div className="absolute left-1/2 top-0 h-48 w-[520px] -translate-x-1/2 border-4 border-t-0 border-white/30" />
      <div className="absolute bottom-0 left-1/2 h-48 w-[520px] -translate-x-1/2 border-4 border-b-0 border-white/30" />
      {VRSTE_IGRISCA.map(([poz, y], vrsta) => (
        <div key={poz} className="absolute inset-x-0 flex -translate-y-1/2 justify-around px-4" style={{ top: `${y}%` }}>
          {igralci.filter((i) => i.pozicija === poz).map((i, k) => (
            <Vstop key={i.ime + k} ob={od + udarec * (1 + (3 - vrsta) * 1.5) + k * 0.12} kako="pop" className="flex w-[180px] flex-col items-center gap-2">
              <Grb ime={i.klub} logo={i.grb} velikost={104} />
              <div className="max-w-full truncate rounded-xl bg-black/55 px-3 py-1 text-[1.7rem] font-black leading-tight">{priimek(i.ime)}</div>
              <div className="flex items-center gap-2 text-3xl"><span>{i.zastava}</span><Cip className="text-3xl">{stevilo(i.tocke ?? 0)}</Cip></div>
            </Vstop>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Velik igralec z animiranim številom (zvezda ekipe, strelec #1). */
function Zvezda({ od, oznaka, i, stevilka, enota, udarec }: { od: number; oznaka: string; i: IgralecSeznama; stevilka: number; enota: string; udarec: number }) {
  const ime = prikazniIme(i.ime)
  return (
    <>
      <Vstop ob={od + 0.05}><Oznaka>{oznaka}</Oznaka></Vstop>
      <Vstop ob={od + udarec * 0.5} kako="pop"><Grb ime={i.klub} logo={i.grb} velikost={240} /></Vstop>
      <Vstop ob={od + udarec}>
        <div className={`${ime.length > 18 ? 'text-7xl' : 'text-8xl'} font-black leading-[1.05]`}>{ime}</div>
      </Vstop>
      <Vstop ob={od + udarec * 1.5}><div className="text-4xl text-slate-300">{[i.zastava, i.klub, i.liga].filter(Boolean).join(' · ')}</div></Vstop>
      <Vstop ob={od + udarec * 2} kako="udarec">
        <div className={`text-[12rem] font-black leading-none ${Z} drop-shadow-[0_8px_30px_rgba(255,209,102,0.35)]`}>
          <Stevec cilj={stevilka} ob={od + udarec * 2} />
        </div>
        <div className="text-5xl font-bold text-slate-200">{enota}</div>
      </Vstop>
    </>
  )
}

// --- predogled, strelci, pravila -----------------------------------------------------

function KlubTekme({ k, ob, kako }: { k: KlubLestvice; ob: number; kako: 'levo' | 'desno' }) {
  return (
    <Vstop ob={ob} kako={kako} className="flex w-full items-center gap-8 rounded-[2.5rem] border border-white/10 bg-white/[0.07] px-10 py-8">
      <Grb ime={k.ime} logo={k.grb} velikost={170} />
      <div className="min-w-0 flex-1 text-left">
        <div className={`${k.ime.length > 18 ? 'text-5xl' : 'text-6xl'} font-black leading-tight`}>{k.ime}</div>
        <div className="mt-3 flex items-center gap-4 text-4xl">
          <Cip className="text-4xl">#{k.mesto}</Cip>
          <span className="font-bold text-slate-200">{stevilo(k.tocke)} {t('domov.objava.tock')}</span>
        </div>
        {k.forma && (
          <div className="mt-3 flex gap-2">
            {[...k.forma].map((f, i) => (
              <span key={i} className={`grid h-11 w-11 place-items-center rounded-lg text-2xl font-black ${f === 'W' ? 'bg-emerald-400 text-slate-950' : f === 'D' ? 'bg-slate-300 text-slate-950' : 'bg-rose-400/80 text-slate-950'}`}>{f}</span>
            ))}
          </div>
        )}
      </div>
    </Vstop>
  )
}

function VrsticaStrelca({ i, mesto, ob }: { i: IgralecSeznama; mesto: number; ob: number }) {
  return (
    <Vstop ob={ob} kako="desno" className="flex w-full items-center gap-6 rounded-3xl border border-white/10 bg-white/[0.07] px-8 py-6">
      <div className={`w-20 shrink-0 text-6xl font-black ${Z}`}>#{mesto}</div>
      <Grb ime={i.klub} logo={i.grb} velikost={96} />
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-5xl font-black">{prikazniIme(i.ime)}</div>
        <div className="truncate text-3xl text-slate-300">{i.zastava} {i.klub}</div>
      </div>
      <div className="shrink-0 text-6xl font-black">⚽ {i.goli}</div>
    </Vstop>
  )
}

/** Prizori reela po vrsti: [udarcev, izris(od, do)]. */
type PrizorReela = [number, (od: number, doo: number) => ReactNode]

function prizori(v: VsebinaObjave, udarec: number): { seznam: PrizorReela[]; naslovnica: (zacetki: number[]) => number } {
  const naslov = t(`domov.objava.naslovi.${v.vrsta as VrstaObjave}`)
  const u = udarec
  const poziv: PrizorReela = [6, (od, doo) => <Poziv od={od} doo={doo} udarec={u} />]
  const prvi = (zacetki: number[]) => zacetki[0] + u * 3
  if (v.vrsta === 'ekipa' && v.ekipa) {
    const e = v.ekipa
    const zvezda = [...e.igralci].sort((a, b) => (b.tocke ?? 0) - (a.tocke ?? 0))[0]
    return {
      naslovnica: (z) => z[1] + u * 10,
      seznam: [
        [4, (od, doo) => <Uvod od={od} doo={doo} naslov={naslov} oznaka={v.obdobje} udarec={u} />],
        [12, (od, doo) => (
          <Prizor od={od} doo={doo}>
            <Vstop ob={od + 0.05} kako="pop">
              <div className="flex items-center gap-6 text-5xl font-black">
                <span>{e.formacija}</span>
                <Cip className="text-5xl"><Stevec cilj={e.tocke} ob={od + u * 7} /> {t('domov.objava.tock')}</Cip>
              </div>
            </Vstop>
            <Igrisce igralci={e.igralci} od={od} udarec={u} />
          </Prizor>
        )],
        [6, (od, doo) => (
          <Prizor od={od} doo={doo}>
            <Zvezda od={od} oznaka={t('domov.objava.zvezda')} i={zvezda} stevilka={zvezda.tocke ?? 0} enota={t('domov.objava.tock')} udarec={u} />
          </Prizor>
        )],
        poziv,
      ],
    }
  }
  if (v.vrsta === 'strelci' && v.strelci) {
    const [prvak, ...ostali] = v.strelci
    return {
      naslovnica: prvi,
      seznam: [
        [5, (od, doo) => (
          <Uvod od={od} doo={doo} naslov={naslov} oznaka={t('domov.objava.sezona')} udarec={u}
            spodaj={<Vstop ob={od + u * 1.5}><div className="flex gap-5 text-8xl">{[...new Set(v.strelci!.map((x) => x.zastava))].map((z) => <span key={z}>{z}</span>)}</div></Vstop>} />
        )],
        [ostali.length * 2 + 2, (od, doo) => (
          <Prizor od={od} doo={doo}>
            <div className="flex w-full flex-col gap-6">
              {ostali.map((i, k) => <VrsticaStrelca key={i.ime + k} i={i} mesto={k + 2} ob={od + (ostali.length - 1 - k) * u * 2 + 0.1} />)}
            </div>
          </Prizor>
        )],
        [6, (od, doo) => (
          <Prizor od={od} doo={doo}>
            <Zvezda od={od} oznaka="#1" i={prvak} stevilka={prvak.goli ?? 0} enota={t('domov.objava.golov')} udarec={u} />
          </Prizor>
        )],
        poziv,
      ],
    }
  }
  if (v.vrsta === 'predogled' && v.tekme) {
    const dolzina = v.tekme.length <= 2 ? 6 : 4
    return {
      naslovnica: (z) => z[1] + u * 2.5,
      seznam: [
        [4, (od, doo) => <Uvod od={od} doo={doo} naslov={naslov} oznaka={v.obdobje} udarec={u} />],
        ...v.tekme.map((m): PrizorReela => [dolzina, (od, doo) => (
          <Prizor od={od} doo={doo}>
            <Vstop ob={od + 0.05}><div className="text-4xl font-bold text-slate-200">{m.zastava} {m.liga} · {m.dan}</div></Vstop>
            <KlubTekme k={m.domaci} ob={od + 0.15} kako="levo" />
            <Vstop ob={od + u} kako="udarec"><div className={`text-[9rem] font-black italic leading-none ${Z}`}>VS</div></Vstop>
            <KlubTekme k={m.gostje} ob={od + u * 1.5} kako="desno" />
          </Prizor>
        )]),
        poziv,
      ],
    }
  }
  // Pravila igre.
  const p = v.pravila!
  const vrstice: [string, number][] = [['GK', p.gol.GK], ['DEF', p.gol.DEF], ['MID', p.gol.MID], ['FWD', p.gol.FWD]]
  return {
    naslovnica: prvi,
    seznam: [
      [4, (od, doo) => <Uvod od={od} doo={doo} naslov={naslov} oznaka="SLFF" udarec={u} />],
      [4, (od, doo) => (
        <Prizor od={od} doo={doo}>
          <Vstop ob={od + 0.05} kako="udarec"><div className={`text-[16rem] font-black leading-none ${Z}`}><Stevec cilj={p.kader} ob={od + 0.1} trajanje={0.8} /></div></Vstop>
          <Vstop ob={od + u}><div className="text-6xl font-black">{t('domov.objava.pravilaKader')}</div></Vstop>
          <Vstop ob={od + u * 2} kako="pop"><Cip className="text-5xl">{t('domov.objava.pravilaProracun', { n: p.proracun })}</Cip></Vstop>
          <Vstop ob={od + u * 2.5}><div className="text-4xl text-slate-300">{t('domov.objava.pravilaPrvih', { n: p.prvih })}</div></Vstop>
        </Prizor>
      )],
      [4, (od, doo) => (
        <Prizor od={od} doo={doo}>
          <div className="flex gap-6 text-[8rem]">
            {Array.from({ length: p.izKluba + 1 }, (_, k) => (
              <Vstop key={k} ob={od + 0.1 + k * u * 0.5} kako="pop" className={k === p.izKluba ? 'opacity-40 grayscale' : ''}>{k === p.izKluba ? '🚫' : '👕'}</Vstop>
            ))}
          </div>
          <Vstop ob={od + u * 2.2}><div className="text-7xl font-black">{t('domov.objava.pravilaKlub', { n: p.izKluba })}</div></Vstop>
        </Prizor>
      )],
      [4, (od, doo) => (
        <Prizor od={od} doo={doo}>
          <Vstop ob={od + 0.05} kako="pop">
            <div className="grid h-72 w-72 place-items-center rounded-full border-[12px] border-slate-950 bg-[color:var(--zlato)] text-[10rem] font-black text-slate-950">C</div>
          </Vstop>
          <Vstop ob={od + u} kako="udarec"><div className={`text-[11rem] font-black leading-none ${Z}`}>×{p.kapetan}</div></Vstop>
          <Vstop ob={od + u * 2}><div className="text-6xl font-black">{t('domov.objava.pravilaKapetan', { n: p.kapetan })}</div></Vstop>
        </Prizor>
      )],
      [6, (od, doo) => (
        <Prizor od={od} doo={doo}>
          <Vstop ob={od + 0.05}><div className="text-7xl font-black">⚽ {t('domov.objava.pravilaGol')}</div></Vstop>
          <div className="flex w-full flex-col gap-5">
            {vrstice.map(([poz, n], k) => (
              <div key={poz} className="flex items-center gap-6">
                <div className="w-40 text-left text-5xl font-black text-slate-200">{poz}</div>
                <div className="h-20 flex-1">
                  <div className="flex h-full origin-left items-center justify-end rounded-2xl bg-[color:var(--zlato)] pr-6 text-5xl font-black text-slate-950"
                    style={{ width: `${(n / p.gol.GK) * 100}%`, ...anim('reel-rast', od + u * (0.8 + k * 0.5), 0.5) }}>+{n}</div>
                </div>
              </div>
            ))}
          </div>
          <Vstop ob={od + u * 3.5}>
            <div className="text-4xl text-slate-200">{t('domov.objava.pravilaOstalo', { gk: p.cista.GK, def: p.cista.DEF, a: p.asistenca })}</div>
          </Vstop>
        </Prizor>
      )],
      poziv,
    ],
  }
}

export function Reel({ v }: { v: VsebinaObjave }) {
  const udarec = 60 / (v.bpm ?? 124)
  const { seznam, naslovnica } = prizori(v, udarec)
  const zacetki: number[] = []
  let cas = 0
  for (const [udarcev] of seznam) {
    zacetki.push(cas)
    cas += udarcev * udarec
  }
  const trajanje = Math.round(cas * 100) / 100
  useEffect(() => {
    // Otroci (števci) so svoje animacije že ustvarili; generator lahko začne.
    document.documentElement.dataset.trajanje = String(trajanje)
    document.documentElement.dataset.naslovnica = String(Math.min(naslovnica(zacetki), trajanje - 0.5))
  })
  return (
    <div
      id="prosojnica"
      className="relative h-[1920px] w-[1080px] overflow-hidden bg-gradient-to-b from-[#14603f] via-[#0b3d2e] to-[#04140f] text-slate-100"
      style={{ fontFamily: "'InterObjava', sans-serif" }}
    >
      <style>{CSS}</style>
      <div className="igrisce pointer-events-none absolute inset-0 opacity-60" style={{ animation: 'reel-proge 8s linear 0s infinite' }} />
      <div className="absolute inset-x-16 top-16 z-10 flex items-center gap-4">
        <img src="/logo/slff-grb.png" alt="" className="h-28 w-28" />
        <span className="text-6xl font-black tracking-tight">SLFF</span>
      </div>
      {seznam.map(([, izris], k) => (
        <div key={k}>{izris(zacetki[k], zacetki[k + 1] ?? trajanje)}</div>
      ))}
      <div className="absolute inset-x-16 bottom-16 z-10">
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full origin-left bg-[color:var(--zlato)]" style={{ animation: `reel-napredek ${trajanje}s linear 0s both` }} />
        </div>
        <div className="text-3xl text-slate-400">slff.eu</div>
      </div>
    </div>
  )
}
