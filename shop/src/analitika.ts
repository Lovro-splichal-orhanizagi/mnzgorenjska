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
  // Tudi referrer: po /thanks bi sicer nosil oznako naročila.
  const domaci = (r?: string) => (r && r.startsWith('https://shop.slff.eu') ? `https://shop.slff.eu${ocisti(r)}` : r)
  window.slffTrgovinaPredPosiljanjem = (_vrsta, tovor) => ({ ...tovor, url: tovor.url && ocisti(tovor.url), referrer: domaci(tovor.referrer) })
  const s = document.createElement('script')
  s.defer = true
  s.src = `${GOSTITELJ}/s.js`
  s.dataset.websiteId = ID
  s.dataset.hostUrl = GOSTITELJ
  s.dataset.beforeSend = 'slffTrgovinaPredPosiljanjem'
  s.dataset.doNotTrack = 'true'
  s.onload = () => cakajoci.splice(0).forEach(([ime, podatki]) => dogodek(ime, podatki))
  document.head.appendChild(s)
}

/** Dogodki pred naloženim Umamijem (zahvala po vrnitvi iz Stripe je prva stran). */
const cakajoci: [string, Record<string, string | number> | undefined][] = []

/** Dogodek v statistiki; počaka na Umami, tiho, če ga je blokator ustavil. */
export function dogodek(ime: string, podatki?: Record<string, string | number>) {
  try {
    if (window.umami) window.umami.track(ime, podatki)
    else if (ID && cakajoci.length < 20) cakajoci.push([ime, podatki])
  } catch {}
}
