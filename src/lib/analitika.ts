// Statistika obiska z Umamijem na našem strežniku (scripts/hetzner/umami/).
// Brez piškotkov in brez uporabnika: Umami šteje ogled strani in nekaj
// dogodkov (sestavil ekipo, ustvaril mini ligo …), naslova IP ne shrani.
//
// Skripta in sprejem tečeta prek slff.eu/u/ (Caddy jo posreduje Umamiju), da
// ju blokatorji oglasov ne zamenjajo za tujo sledilno skripto. Brez
// VITE_UMAMI_ID (lokalno, CI) se ne naloži nič in `dogodek` ne naredi nič.
const ID = import.meta.env.VITE_UMAMI_ID
const GOSTITELJ = 'https://slff.eu/u'

// Iz naslova ostanejo le parametri, ki povedo, od kod je kdo prišel, in liga.
// Drugo gre proč: /auth/confirm nosi token_hash, vabila nosijo kode.
const DOVOLJENI = /^(t|utm_[a-z]+|src)$/

type Umami = { track: (ime: string, podatki?: Record<string, string | number>) => void }
type Tovor = { url?: string; referrer?: string }
declare global {
  interface Window {
    umami?: Umami
    slffPredPosiljanjem?: (vrsta: string, tovor: Tovor) => Tovor
  }
}

function ocisti(naslov: string): string {
  try {
    const u = new URL(naslov, 'https://slff.eu')
    for (const k of [...u.searchParams.keys()]) if (!DOVOLJENI.test(k)) u.searchParams.delete(k)
    // Id-ji in kode v poti (igralec, mini liga) razdrobijo poročilo na tisoče vrstic.
    u.pathname = u.pathname
      .replace(/\/(player|match|club|team|l)\/[^/]+/g, '/$1/:id')
      .replace(/\/[0-9a-f-]{20,}/gi, '/:id')
    return u.pathname + u.search
  } catch {
    return '/'
  }
}

export function pripraviAnalitiko() {
  if (!ID || typeof document === 'undefined') return
  window.slffPredPosiljanjem = (_vrsta, tovor) => ({ ...tovor, url: tovor.url && ocisti(tovor.url) })
  const s = document.createElement('script')
  s.defer = true
  s.src = `${GOSTITELJ}/s.js`
  s.dataset.websiteId = ID
  s.dataset.hostUrl = GOSTITELJ
  s.dataset.beforeSend = 'slffPredPosiljanjem'
  s.dataset.doNotTrack = 'true'
  document.head.appendChild(s)
}

/** Dogodek v statistiki; tiho, če Umami ni naložen ali ga je blokator ustavil. */
export function dogodek(ime: string, podatki?: Record<string, string | number>) {
  try {
    window.umami?.track(ime, podatki)
  } catch {}
}
