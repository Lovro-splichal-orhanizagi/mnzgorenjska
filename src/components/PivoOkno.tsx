// Okno "Časti pivo": prijavljenemu na spletu se pokaže največ vsakih 14 dni,
// in to le ob dobri volji (lib/pivoNavdusenje.ts): po shranjeni ekipi za
// naslednji krog in ob prvem obisku po dobrem krogu. Do 10/2026 je prišlo
// 12 s po nalaganju katerekoli strani: 653 prikazov v 30 dneh, 3 piva.
//
// Kdo je pivo kupil, ne vemo (BMC nam ne pošlje ne e-naslova ne
// uporabnika), zato si zapomnimo le na napravi: klik na pivo kjerkoli utiša
// okno za 60 dni, "Sem že častil" za 120, zapiranje za 14.
//
// Ne v aplikaciji (trgovini, glej Pivo.tsx), ne v mladinski ligi (mladim brez
// piva), ne prvi dan računa, ne čez okno prvega obiska in ne na straneh, kjer
// človek nekaj ureja ali bere pogoje.
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { useTekmovanje } from '../lib/tekmovanje'
import { jeMladinskiSlug } from '../lib/prevzem'
import { jeNativno } from '../lib/platforma'
import { zabeleziKorak } from '../lib/lijak'
import { najdiDoberKrog, poslusajPovode, type PovodPiva } from '../lib/pivoNavdusenje'
import { zeVprasan } from './PrviObisk'
import { stevilo, t } from '../i18n'

const KLJUC = 'slff-pivo-okno-do'
const DAN = 24 * 60 * 60 * 1000
/** Da človek najprej vidi "Ekipa shranjena" oziroma stran, ki jo je odprl. */
const ZAMIK_EKIPA_MS = 1_500
const ZAMIK_KROG_MS = 2_500
const BREZ_OKNA = ['/login', '/legal', '/account', '/beers', '/auth', '/admin', '/novo-geslo', '/new-password', '/reminders', '/claim']

/** Okno utihne za `dni` dni (klik na pivo kjerkoli, zapiranje, "sem že"). */
export function utisajPivoOkno(dni: number) {
  try {
    const do_ = Date.now() + dni * DAN
    if (Number(localStorage.getItem(KLJUC) ?? 0) < do_) localStorage.setItem(KLJUC, String(do_))
  } catch {}
}

function utisano(): boolean {
  try {
    return Number(localStorage.getItem(KLJUC) ?? 0) > Date.now()
  } catch {
    // Zasebno okno: raje nikoli kot ob vsakem nalaganju.
    return true
  }
}

export default function PivoOkno() {
  const { session } = useAuth()
  const { slug, id: ligaId } = useTekmovanje()
  const { pathname } = useLocation()
  const [povod, setPovod] = useState<PovodPiva | null>(null)
  const odprto = povod != null
  const okno = useRef<HTMLDivElement | null>(null)
  const uporabnik = session?.user.id ?? null

  const ustreza =
    !jeNativno() &&
    Boolean(session) &&
    Date.now() - Date.parse(session?.user.created_at ?? '') > 3 * DAN &&
    !jeMladinskiSlug(slug) &&
    zeVprasan() &&
    !BREZ_OKNA.some((p) => pathname.startsWith(p))

  const zapri = () => setPovod(null)
  const odkloni = () => {
    zabeleziKorak('pivo_okno_zaprto')
    zapri()
  }

  function odpri(p: PovodPiva, zamik: number) {
    return window.setTimeout(() => {
      if (utisano()) return
      utisajPivoOkno(14) // osvežitev strani ga ne prikliče znova
      zabeleziKorak('pivo_okno')
      zabeleziKorak(p.vrsta === 'ekipa' ? 'pivo_okno_ekipa' : 'pivo_okno_krog')
      setPovod(p)
    }, zamik)
  }

  // Povod "ekipa": MojaEkipa sporoči uspešno shrambo za naslednji krog.
  useEffect(() => {
    if (!ustreza || odprto) return
    let id: number | undefined
    const stop = poslusajPovode((p) => {
      if (utisano()) return
      window.clearTimeout(id)
      id = odpri(p, ZAMIK_EKIPA_MS)
    })
    return () => {
      stop()
      window.clearTimeout(id)
    }
  }, [ustreza, odprto])

  // Povod "krog": ob prvem obisku po končanem krogu, če je bil dober.
  useEffect(() => {
    if (!ustreza || odprto || utisano() || !uporabnik || ligaId == null) return
    let velja = true
    let id: number | undefined
    najdiDoberKrog(uporabnik, ligaId)
      .then((p) => {
        if (velja && p) id = odpri(p, ZAMIK_KROG_MS)
      })
      // Okno je dodatek: če poizvedba pade, ga preprosto ni.
      .catch(() => {})
    return () => {
      velja = false
      window.clearTimeout(id)
    }
  }, [ustreza, odprto, uporabnik, ligaId])

  useEffect(() => {
    if (!odprto) return
    okno.current?.focus()
    const tipka = (e: KeyboardEvent) => e.key === 'Escape' && odkloni()
    window.addEventListener('keydown', tipka)
    return () => window.removeEventListener('keydown', tipka)
  }, [odprto])

  if (!povod || !ustreza) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 pb-[max(1rem,var(--dno))] pt-[max(1rem,var(--vrh))] backdrop-blur"
      onClick={(e) => e.target === e.currentTarget && odkloni()}
    >
      <div
        ref={okno}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pivo-okno-naslov"
        tabIndex={-1}
        className="pivo-okno relative w-full max-w-sm overflow-hidden rounded-2xl border border-amber-300/30 bg-slate-900 p-5 text-center shadow-2xl shadow-amber-500/10 outline-none"
      >
        <button
          onClick={() => odkloni()}
          aria-label={t('aplikacija.pivo.okno.kasneje')}
          className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-xl text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden>✕</span>
        </button>

        {/* Mehurčki se dvigajo pred maskoto Pivkom, ki prileti in nazdravlja. */}
        <div aria-hidden className="relative mx-auto -mt-2 h-52 w-52">
          {[12, 30, 52, 70, 86].map((x, i) => (
            <span
              key={x}
              className="pivo-mehurcek absolute bottom-6 z-10 h-4 w-4 rounded-full bg-amber-300/80 ring-1 ring-amber-100/50"
              style={{ left: `${x}%`, animationDelay: `${i * 0.45}s` }}
            />
          ))}
          <img src="/logo/maskota/manager.svg" alt="" className="pivo-maskota relative h-full w-full" />
        </div>

        <h2 id="pivo-okno-naslov" className="mt-2 text-xl font-black naslov">
          {povod.vrsta === 'krog'
            ? t('aplikacija.pivo.okno.krogNaslov', { krog: povod.krog })
            : povod.krog != null
              ? t('aplikacija.pivo.okno.ekipaNaslov', { krog: povod.krog })
              : t('aplikacija.pivo.okno.naslov')}
        </h2>
        {povod.vrsta === 'krog' && (
          <p className="mt-1 text-sm font-bold text-amber-200">
            {povod.premik != null && povod.premik >= 1
              ? t('aplikacija.pivo.okno.krogMesta', { n: povod.premik })
              : t('aplikacija.pivo.okno.krogTocke', {
                  tocke: stevilo(povod.tocke, { maximumFractionDigits: 1 }),
                  povprecje: stevilo(povod.povprecje, { maximumFractionDigits: 1 }),
                })}
          </p>
        )}
        <p className="mt-2 text-sm text-slate-300">{t('aplikacija.pivo.okno.besedilo')}</p>
        <p className="mt-2 text-xs text-amber-100/80">{t('aplikacija.pivo.okno.zid')}</p>

        <a
          href={`/pivo?src=okno-${povod.vrsta}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            zabeleziKorak('pivo')
            zabeleziKorak(povod.vrsta === 'ekipa' ? 'pivo_klik_ekipa' : 'pivo_klik_krog')
            utisajPivoOkno(60)
            zapri()
          }}
          className="pivo-gumb mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 text-base font-black text-amber-950 shadow-lg shadow-amber-500/30 ring-1 ring-amber-200/60 hover:from-amber-200 hover:to-amber-400"
        >
          <span aria-hidden className="animiraj-pivo inline-block text-lg">🍺</span>
          {t('aplikacija.pivo.gumb')}
        </a>
        <div className="mt-3 flex justify-center gap-4 text-xs text-slate-400">
          <button onClick={() => odkloni()} className="underline hover:text-white">
            {t('aplikacija.pivo.okno.kasneje')}
          </button>
          <button
            onClick={() => {
              utisajPivoOkno(120)
              odkloni()
            }}
            className="underline hover:text-white"
          >
            {t('aplikacija.pivo.okno.zeSem')}
          </button>
        </div>
      </div>
    </div>
  )
}
