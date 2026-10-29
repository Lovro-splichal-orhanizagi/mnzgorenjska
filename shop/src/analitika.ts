// Statistika obiska trgovine z istim Umamijem kot slff.eu (src/lib/analitika.ts):
// brez piškotkov, naslova IP ne shrani, "Ne sledi" se upošteva. Poti dobijo
// predpono /shop, da se v poročilu ne pomešajo s stranmi slff.eu; iz naslova
// ostanejo le parametri utm_* (/thanks nosi oznako naročila).
// Brez VITE_UMAMI_ID (lokalno, CI) se ne naloži nič.
const ID = import.meta.env.VITE_UMAMI_ID
const GOSTITELJ = 'https://slff.eu/u'

type Tovor = { url?: string; referrer?: string }
declare global {
  interface Window {
    slffTrgovinaPredPosiljanjem?: (vrsta: string, tovor: Tovor) => Tovor
  }
}

export function ocisti(naslov: string): string {
  try {
    const u = new URL(naslov, 'https://shop.slff.eu')
    for (const k of [...u.searchParams.keys()]) if (!/^utm_[a-z]+$/.test(k)) u.searchParams.delete(k)
    return `/shop${u.pathname === '/' ? '' : u.pathname}${u.search}`
  } catch {
    return '/shop'
  }
}

export function pripraviAnalitiko() {
  if (!ID || typeof document === 'undefined') return
  window.slffTrgovinaPredPosiljanjem = (_vrsta, tovor) => ({ ...tovor, url: tovor.url && ocisti(tovor.url) })
  const s = document.createElement('script')
  s.defer = true
  s.src = `${GOSTITELJ}/s.js`
  s.dataset.websiteId = ID
  s.dataset.hostUrl = GOSTITELJ
  s.dataset.beforeSend = 'slffTrgovinaPredPosiljanjem'
  s.dataset.doNotTrack = 'true'
  document.head.appendChild(s)
}

/** Dogodek v statistiki; tiho, če Umami ni naložen ali ga je blokator ustavil. */
export function dogodek(ime: string, podatki?: Record<string, string | number>) {
  try {
    window.umami?.track(ime, podatki)
  } catch {}
}
