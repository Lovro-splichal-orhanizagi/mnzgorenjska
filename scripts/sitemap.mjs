// Zemljevid strani za iskalnike: sitemap-index.xml + sitemap-<liga>.xml.
//
// public/sitemap.xml ima le deset stalnih poti, lig pa je ~300 in vsaka ima
// svoje klube, igralce in tekme. Ta skripta za vsako AKTIVNO ligo našteje:
//   - strani lige (domov, lestvica, rezultati, igralci, lestvica lige) s ?t=
//     (privzeta liga brez njega)
//   - klube lige (/club/:id), igralce z minutami v tekoči ali lanski sezoni
//     (/player/:id) in odigrane tekme (/match/:id)
// <lastmod> je datum zadnje odigrane tekme (lige, kluba) oz. tekme.
//
// Bere javne podatke z anon ključem. Teče ponoči v .github/workflows/sitemap.yml,
// ki datoteke prenese na strežnik v /srv/slff/sitemap/ (Caddy jih streže,
// glej scripts/hetzner/Caddyfile). Lokalno:
//
//   node scripts/sitemap.mjs --izhod /tmp/sitemap
//
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { vseVrstice } from './strani.mjs'
import { sezonaIz } from './razpored.mjs'

export const DOMENA = 'https://slff.eu'
// Meja protokola: 50.000 naslovov in 50 MB na datoteko.
export const NAJVEC_NASLOVOV = 50000
const STRANI_LIGE = ['/', '/standings', '/results', '/players', '/table']
// Privzeta liga nima ?t= (kanonični naslov ga zbriše), kot PRIVZETO v src/lib/tekmovanje.tsx.
export const PRIVZETO = 'clani'

export function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const vrstica = (oznaka, loc, lastmod) =>
  `  <${oznaka}><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</${oznaka}>`

/** @param {{loc: string, lastmod?: string|null}[]} naslovi */
export function urlset(naslovi) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...naslovi.map((n) => vrstica('url', n.loc, n.lastmod)),
    '</urlset>',
    '',
  ].join('\n')
}

/** @param {{loc: string, lastmod?: string|null}[]} datoteke */
export function sitemapIndex(datoteke) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...datoteke.map((d) => vrstica('sitemap', d.loc, d.lastmod)),
    '</sitemapindex>',
    '',
  ].join('\n')
}

const najkasnejsi = (a, b) => (!a ? b : !b ? a : a > b ? a : b)

/**
 * Naslovi ene lige iz že prebranih vrstic (brez omrežja, preverja smoke).
 * @param {string} slug
 * @param {{klubi: number[], igralci: number[], tekme: {id:number, played_on:string|null, home_team_id:number, away_team_id:number}[]}} p
 */
export function nasloviLige(slug, { klubi, igralci, tekme }) {
  const q = slug === PRIVZETO ? '' : `?t=${encodeURIComponent(slug)}`
  let zadnja = null
  const poKlubu = new Map()
  for (const m of tekme) {
    zadnja = najkasnejsi(zadnja, m.played_on)
    for (const k of [m.home_team_id, m.away_team_id]) poKlubu.set(k, najkasnejsi(poKlubu.get(k), m.played_on))
  }
  return [
    ...STRANI_LIGE.map((p) => ({ loc: `${DOMENA}${p}${q}`, lastmod: zadnja })),
    ...klubi.map((id) => ({ loc: `${DOMENA}/club/${id}${q}`, lastmod: poKlubu.get(id) ?? null })),
    ...igralci.map((id) => ({ loc: `${DOMENA}/player/${id}${q}` })),
    ...tekme.map((m) => ({ loc: `${DOMENA}/match/${m.id}${q}`, lastmod: m.played_on })),
  ]
}

/** Razdeli naslove lige na datoteke po NAJVEC_NASLOVOV: sitemap-<slug>.xml, -2, -3 … */
export function datotekeLige(slug, naslovi, najvec = NAJVEC_NASLOVOV) {
  const kosi = []
  for (let i = 0; i < naslovi.length; i += najvec) {
    kosi.push({
      ime: `sitemap-${slug}${i === 0 ? '' : `-${i / najvec + 1}`}.xml`,
      naslovi: naslovi.slice(i, i + najvec),
    })
  }
  return kosi
}

function izEnv() {
  try {
    const v = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    return Object.fromEntries(
      v.split('\n').map((s) => s.trim())
        .filter((s) => s.includes('=') && !s.startsWith('#'))
        .map((s) => [s.slice(0, s.indexOf('=')).trim(), s.slice(s.indexOf('=') + 1).trim()]),
    )
  } catch { return {} }
}

async function glavna() {
  const i = process.argv.indexOf('--izhod')
  const izhod = i > 0 ? process.argv[i + 1] : 'sitemap'
  const env = izEnv()
  const url = process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
  const kljuc = process.env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY
  if (!kljuc) throw new Error('Manjka SUPABASE_ANON_KEY.')
  const db = createClient(url, kljuc, { auth: { persistSession: false } })

  const danes = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Ljubljana' })
  const tekoca = sezonaIz(danes)
  const lani = sezonaIz(`${Number(tekoca.slice(0, 4)) - 1}-08-01`)

  const { data: lige, error } = await db
    .from('competitions_view')
    .select('id, slug, country_code')
    .eq('active', true)
    .order('id')
  if (error) throw new Error(error.message)

  mkdirSync(izhod, { recursive: true })
  const kazalo = []
  let skupaj = 0
  for (const liga of lige ?? []) {
    // Slug gre v ime datoteke in naslov: le male črke, števke in vezaj.
    if (!liga.slug || !/^[a-z0-9-]+$/.test(liga.slug)) continue
    const klubi = await vseVrstice((od, do_) =>
      db.from('competition_teams').select('team_id').eq('competition_id', liga.id).order('team_id').range(od, do_),
    )
    const igralci = await vseVrstice((od, do_) =>
      db.from('player_season_standings').select('id, season')
        .eq('competition_id', liga.id).in('season', [tekoca, lani]).gt('minutes', 0)
        .order('id').order('season').range(od, do_),
    )
    const tekme = await vseVrstice((od, do_) =>
      db.from('matches').select('id, played_on, home_team_id, away_team_id, rounds!inner(competition_id)')
        .eq('rounds.competition_id', liga.id).not('imported_at', 'is', null)
        .order('id').range(od, do_),
    )
    const naslovi = nasloviLige(liga.slug, {
      klubi: [...new Set(klubi.map((k) => k.team_id))],
      igralci: [...new Set(igralci.map((p) => p.id))],
      tekme,
    })
    const zadnja = naslovi[0]?.lastmod ?? null
    for (const d of datotekeLige(liga.slug, naslovi)) {
      writeFileSync(join(izhod, d.ime), urlset(d.naslovi))
      kazalo.push({ loc: `${DOMENA}/${d.ime}`, lastmod: zadnja })
    }
    skupaj += naslovi.length
    console.log(`${liga.slug}: ${naslovi.length} naslovov`)
  }
  // Vstopne strani držav z aktivno ligo (/si, /at …; strežnik HTML jih izriše).
  const drzave = [...new Set((lige ?? []).map((l) => String(l.country_code ?? '').toLowerCase()).filter((k) => /^[a-z]{2}$/.test(k)))]
  writeFileSync(join(izhod, 'sitemap-drzave.xml'), urlset(drzave.map((k) => ({ loc: `${DOMENA}/${k}` }))))
  // Stalne strani (public/sitemap.xml) so v kazalu prve.
  writeFileSync(join(izhod, 'sitemap-index.xml'), sitemapIndex([{ loc: `${DOMENA}/sitemap.xml` }, { loc: `${DOMENA}/sitemap-drzave.xml` }, ...kazalo]))
  console.log(`Skupaj ${skupaj} naslovov v ${kazalo.length} datotekah (${izhod}).`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  glavna().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
