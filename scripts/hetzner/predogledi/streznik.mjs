// Strežnik slik za predogled povezave (og:image) na VM, kontejner slff-predogledi.
//
//   GET /predogled/<vrsta>/<id>.jpg[?v=…]
//     vrsta: player | club | match | league | mini (številski id) ali invite (koda mini lige)
//
// Strežnik HTML (scripts/hetzner/html/streznik.mjs) v strani vpiše og:image s
// tem naslovom; `v` je tam izračunan iz podatkov strani in služi le temu, da
// Facebook in WhatsApp ob novih podatkih vzameta novo sliko. Tu se ne bere —
// ključ predpomnilnika je izvleček podatkov, ki jih slika res nariše.
//
// Varovala (slika nikoli ne sme biti slabša od privzete):
//   • neveljavna pot ali id → 404 brez branja baze;
//   • entitete ni ali je ne smemo pokazati, PostgREST ne odgovori v roku, vrsta
//     risanja je polna ali risba pade → privzeta slika (og/slff-og.png) s 200;
//   • če strežnik ne teče, Caddy postreže privzeto sliko z :3201.
// Predpomnilnik na disku je omejen (NAJVEC datotek, najstarejše gredo), za
// entiteto ostane le zadnja različica; podatki v pomnilniku živijo 10 minut.
//
//   node scripts/hetzner/predogledi/streznik.mjs   # PORT, KOREN, PREDPOMNILNIK, SUPABASE_URL, SUPABASE_ANON_KEY
//
// Preizkus: scripts/hetzner/predogledi/preizkus.mjs (npm run preizkus-predogledov).
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOKALE, postgrest, prevajalnik, RAZLICICA_PREDOGLEDOV } from '../html/streznik.mjs'
import { NALAGALNIKI } from './podatki.mjs'
import { RISBE, naloziPisave, slikaIz, vJpeg } from './risbe.mjs'

const TU = fileURLToPath(new URL('.', import.meta.url))
// Koda mini lige: ZNAKI_KODE in DOLZINA_KODE v src/lib/miniLige.ts.
const KODA = /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/
const POT = /^\/predogled\/(player|club|match|league|mini|invite)\/([A-Za-z0-9]{1,12})\.jpg$/
/** Grbi in slike le iz zgrajene strani (nikoli z drugega strežnika). */
const DOVOLJENA_SLIKA = /^\/(grbi|logo|foto)\/[A-Za-z0-9._-]{1,120}\.(png|jpe?g|gif|svg|webp)$/

/** Veljavna zahteva → { vrsta, id } (id je število ali koda), sicer null. */
export function razcleni(pot) {
  const m = POT.exec(pot)
  if (!m) return null
  const [, vrsta, id] = m
  if (vrsta === 'invite') return KODA.test(id) ? { vrsta, id } : null
  return /^[1-9]\d{0,11}$/.test(id) ? { vrsta, id: Number(id) } : null
}

/** Izvleček podatkov risbe: drug podatek, drug jezik ali nova oblika = nova datoteka. */
export function kljucRisbe(vrsta, id, jezik, podatki, slike) {
  const h = createHash('sha256').update(JSON.stringify([RAZLICICA_PREDOGLEDOV, jezik, podatki, slike])).digest('hex').slice(0, 16)
  return `${vrsta}-${id}-${h}`
}

// Nizi, ki jih slika rabi, če jih html-besede.json (stara objava strani) še nima.
const ZASILNO = {
  'igralci.kartica.stat': { gol: 'GOL', ast: 'AST', min: 'MIN', sez: 'SEZ', cena: 'CENA' },
  'igralci.kartica.tockVSezoni': '{beseda} v sezoni',
  'skupno.pozicijaKratko': { GK: 'VRA', DEF: 'BRA', MID: 'VEZ', FWD: 'NAP' },
  'skupno.cena': '{v} M€',
  'lestvice.krog': '{n}. krog',
  'lestvice.mesto': '{mesto}. mesto',
  'lestvice.plakat.najvecTock': 'Največ točk to sezono',
  'lestvice.plakat.izNasihIgralcev': 'Sestavi svojo ekipo iz naših igralcev.',
  'lestvice.vstop.naslov': 'Povabilo v mini ligo',
  'lestvice.vstop.miniLiga': 'Mini liga',
  'lestvice.javneLige.pridruziSe': 'Pridruži se',
}

/** Prevajalnik strežnika HTML z zasilnimi nizi, številom z decimalkami in lokalo. */
export function besedila(besede, jezik) {
  const sl = { ...ZASILNO, ...(besede?.sl ?? {}) }
  const b = prevajalnik({ ...besede, sl }, jezik)
  const lokale = LOKALE[jezik] ?? 'sl-SI'
  return {
    ...b,
    lokale,
    stevilo: (n, decimalk = 0) => new Intl.NumberFormat(lokale, { minimumFractionDigits: decimalk, maximumFractionDigits: decimalk }).format(n),
  }
}

/**
 * Obdelovalec zahtevkov. `rest(pot, telo, signal)` bere PostgREST, `koren` je
 * zgrajena stran (grbi, logo, foto, og), `mapa` predpomnilnik na disku.
 */
export function obdelovalec({ rest, koren, mapa, rok = 1500, hkrati = 2, vrsta: najvecVrsta = 16, najvec = 3000, zivljenje = 600_000, pospravljaj = 50 }) {
  mkdirSync(mapa, { recursive: true })
  const podatki = new Map() // `${vrsta}/${id}` -> { do, vrednost: obljuba }
  const slike = new Map() // pot -> obljuba slike (grbi, logo)
  let lige = { do: 0, seznam: null }
  let besede = { do: 0, vrednost: {} }
  let tecejo = 0
  const cakajo = []
  let zapisov = 0

  const privzeta = () => readFileSync(join(koren, 'og', 'slff-og.png'))

  function seznamLig(signal) {
    if (lige.seznam && lige.do > Date.now()) return Promise.resolve(lige.seznam)
    return rest('competitions_view?select=id,slug,name,active,country_code,country_name,federation_name,federation_short&order=id', undefined, signal).then(
      (seznam) => ((lige = { do: Date.now() + 600_000, seznam }), seznam),
      (e) => {
        if (lige.seznam) return lige.seznam
        throw e
      },
    )
  }
  function slovar() {
    if (besede.do > Date.now()) return besede.vrednost
    let vrednost = besede.vrednost
    try {
      vrednost = JSON.parse(readFileSync(join(koren, 'html-besede.json'), 'utf8'))
    } catch {}
    besede = { do: Date.now() + 300_000, vrednost }
    return vrednost
  }
  function slika(pot) {
    if (!pot || !DOVOLJENA_SLIKA.test(pot) || pot.includes('..')) return Promise.resolve(null)
    let s = slike.get(pot)
    if (!s) {
      s = (async () => {
        try {
          return await slikaIz(readFileSync(join(koren, pot)))
        } catch {
          return null
        }
      })()
      slike.set(pot, s)
      if (slike.size > 300) slike.delete(slike.keys().next().value)
    }
    return s
  }

  /** Podatki entitete iz pomnilnika ali baze; napaka se ne hrani. */
  function nalozi(vrsta, id) {
    const k = `${vrsta}/${id}`
    const z = podatki.get(k)
    if (z && z.do > Date.now()) return z.vrednost
    const signal = AbortSignal.timeout(rok)
    const r = (p, telo) => rest(p, telo, signal)
    const vrednost = seznamLig(signal).then((seznam) => NALAGALNIKI[vrsta](id, { rest: r, lige: seznam }))
    podatki.set(k, { do: Date.now() + zivljenje, vrednost })
    vrednost.catch(() => podatki.delete(k))
    if (podatki.size > 5000) podatki.delete(podatki.keys().next().value)
    return vrednost
  }

  /** Največ `hkrati` risb naenkrat; polna vrsta → null (privzeta slika). */
  async function vVrsti(delo) {
    if (tecejo >= hkrati) {
      if (cakajo.length >= najvecVrsta) return null
      await new Promise((r) => cakajo.push(r))
    }
    tecejo++
    try {
      return await delo()
    } finally {
      tecejo--
      cakajo.shift()?.()
    }
  }

  function pospravi(predpona, obdrzi) {
    for (const ime of readdirSync(mapa)) if (ime.startsWith(predpona) && ime !== obdrzi) try { unlinkSync(join(mapa, ime)) } catch {}
    // Vsakih `pospravljaj` zapisov: največ `najvec` datotek, najdlje nebrane ven.
    if (++zapisov % pospravljaj) return
    const datoteke = readdirSync(mapa).filter((d) => d.endsWith('.jpg'))
    if (datoteke.length <= najvec) return
    datoteke
      .map((d) => ({ d, t: statSync(join(mapa, d)).mtimeMs }))
      .sort((a, b) => a.t - b.t)
      .slice(0, datoteke.length - najvec)
      .forEach(({ d }) => { try { unlinkSync(join(mapa, d)) } catch {} })
  }

  async function predogled(vrsta, id) {
    const e = await nalozi(vrsta, id)
    if (!e) return { vir: 'privzeta' }
    const kljuc = kljucRisbe(vrsta, id, e.jezik, e.podatki, e.slike)
    const datoteka = join(mapa, `${kljuc}.jpg`)
    try {
      const bajti = readFileSync(datoteka)
      const zdaj = new Date()
      utimesSync(datoteka, zdaj, zdaj) // nazadnje brana ostane
      return { vir: 'disk', bajti }
    } catch {}
    const bajti = await vVrsti(async () => {
      const potrebne = Object.entries({ ...e.slike, slff: '/logo/slff-grb.png', igrisce: '/foto/igrisce.jpg', maskota: '/logo/slff-maskota.png' })
      const nalozene = Object.fromEntries(await Promise.all(potrebne.map(async ([k, p]) => [k, await slika(p)])))
      return vJpeg(RISBE[vrsta](e.podatki, besedila(slovar(), e.jezik), nalozene))
    })
    if (!bajti) return { vir: 'privzeta', zasebno: true }
    const zacasna = `${datoteka}.${process.pid}.tmp`
    writeFileSync(zacasna, bajti)
    renameSync(zacasna, datoteka)
    pospravi(`${vrsta}-${id}-`, `${kljuc}.jpg`)
    return { vir: 'nova', bajti }
  }

  return async function (req, res) {
    const naslov = new URL(req.url ?? '/', 'http://x')
    if (naslov.pathname === '/zdravje') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      return res.end('ok')
    }
    const z = req.method === 'GET' || req.method === 'HEAD' ? razcleni(naslov.pathname) : null
    if (!z) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' })
      return res.end('404')
    }
    let o
    try {
      o = await predogled(z.vrsta, z.id)
    } catch (e) {
      console.error(`${naslov.pathname}: ${e?.message ?? e}`)
      o = { vir: 'privzeta', zasebno: true }
    }
    let bajti = o.bajti
    let tip = 'image/jpeg'
    if (!bajti) {
      try {
        bajti = privzeta()
        tip = 'image/png'
      } catch (e) {
        console.error(`privzeta slika: ${e?.message ?? e}`)
        res.writeHead(503, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
        return res.end('503')
      }
    }
    res.writeHead(200, {
      'Content-Type': tip,
      'Content-Length': bajti.length,
      // Napaka ali polna vrsta: kmalu znova. Sicer ura v brskalniku, 6 ur na Cloudflaru.
      'Cache-Control': o.zasebno ? 'public, max-age=60' : 'public, max-age=3600, s-maxage=21600',
      'X-Slff-Predogled': o.vir,
    })
    res.end(req.method === 'HEAD' ? undefined : bajti)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const {
    SUPABASE_URL = 'http://127.0.0.1:8000',
    SUPABASE_ANON_KEY,
    KOREN = '/srv/slff/current',
    PREDPOMNILNIK = '/predpomnilnik',
    PORT = '3202',
    NASLOV = '127.0.0.1',
  } = process.env
  if (!SUPABASE_ANON_KEY) throw new Error('Manjka SUPABASE_ANON_KEY')
  const pisave = naloziPisave(join(TU, 'pisave'))
  console.log(`pisave: ${[...pisave].join(', ')}`)
  createServer(obdelovalec({ rest: postgrest(SUPABASE_URL, SUPABASE_ANON_KEY), koren: KOREN, mapa: PREDPOMNILNIK })).listen(Number(PORT), NASLOV, () =>
    console.log(`slff-predogledi na ${NASLOV}:${PORT}, slike iz ${KOREN}, predpomnilnik ${PREDPOMNILNIK}`),
  )
}
