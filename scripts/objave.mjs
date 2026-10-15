// Samodejne objave za Instagram in Facebook: osnutek na Discord, nato objava.
// Načrt: docs/superpowers/specs/2026-10-15-samodejne-objave-design.md.
//
// Vse objave so angleške (lastnik, 15. 10. 2026). Termina (ljubljanski čas):
// ponedeljek osnutek 04:00, objava 10:00 — krog ene države (rotacija
// ROTACIJA); četrtek osnutek 12:00, objava 18:00 — vse države. Mejnik: vsakih
// 1000 uporabnikov osnutek takoj, objava 6 ur kasneje v oknu 09–20. Osnutek (dejstva, napis, prosojnice)
// gre v tabelo `objave` in na Discord s povezavo "Ustavi objavo"; ob roku ga
// delavec objavi na Instagram in Facebook (faza 2), če ga nihče ni ustavil in
// so nastavljeni ključi META_*. Brez njih se nič ne objavi (kot faza 1).
//
// 1. dejstva: SQL objava_dejstva (servisna) ali --dejstva datoteka.json,
// 2. napis: Claude (Messages API), vsako število in ime mora biti v dejstvih;
//    sicer še en poskus, nato predloga,
// 3. prosojnice: stran /objava (src/pages/Objava.tsx), posname jih Playwright,
// 4. osnutek: vrstica v `objave` (en na termin in teden) in Discord s slikami,
// 5. objava: ob roku (največ OBJAVA_ZAMUDA kasneje) Instagram in Facebook.
//
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, DISCORD_OBJAVE_WEBHOOK,
//   OBJAVE_URL (stran s prosojnicami, privzeto https://slff.eu), OBJAVE_MAPA (slike),
//   OBJAVE_MEDIJI_URL (javni naslov mape slik, privzeto https://slff.eu/objave-mediji),
//   META_PAGE_TOKEN, META_PAGE_ID, META_IG_USER_ID, META_GRAPH_VERSION (privzeto v26.0)
//   node scripts/objave.mjs --zanka                    (delavec slff-objave: vsakih 10 minut)
//   node scripts/objave.mjs --slot pon [--drzava SI]   (en osnutek zdaj)
//   node scripts/objave.mjs --slot mejnik [--suho --dejstva m.json]  (mejnik zdaj, če je dosežen)
//   node scripts/objave.mjs --slot cet --suho --dejstva d.json --url http://localhost:5173 [--mapa /tmp/objave-vzorec]
//     --suho: izpiše dejstva in napis, slike zapiše v --mapa; ne piše v bazo, ne pošlje na Discord
import { fileURLToPath } from 'node:url'
import { resolve, join, relative } from 'node:path'
import { mkdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createHash, randomBytes } from 'node:crypto'

export const MODEL = 'claude-sonnet-5-5'
// Ponedeljek: država po rotaciji ISO tedna; brez kroga gre na naslednjo.
// ponytail: stalna rotacija približa vrstni red po številu uporabnikov; ob
// rasti druge države jo dopolni tu.
export const ROTACIJA = ['SI', 'HR', 'SK', 'SI', 'HR', 'SK', 'AT', 'SI', 'HR', 'SK', 'SI', 'HR', 'SK', 'HU']
// Vse objave so angleške; jezik ostane stolpec tabele.
export const JEZIK = 'en'
export const TERMINI = { pon: { dan: 0, osnutek: 4, objava: 10 }, cet: { dan: 3, osnutek: 12, objava: 18 } }
const PAS = 'Europe/Ljubljana'
// Objava, ki je delavec ni objavil v dveh urah po roku (ni tekel), ostane neobjavljena.
export const OBJAVA_ZAMUDA = 2 * 3600e3
// Mejnik uporabnikov: vsakih KORAK; mejnik, ki je že več kot MEJNIK_ROK za nami, ni več novica.
export const MEJNIK_KORAK = 1000
export const MEJNIK_ROK = 300

// --- čas ----------------------------------------------------------------------

export const dodajDni = (datum, n) => new Date(Date.parse(`${datum}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10)

/** Ljubljanski datum (YYYY-MM-DD) trenutka. */
export const datumLj = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: PAS }).format(d)

/** Ponedeljek tedna, v katerem je datum. */
export function ponedeljek(datum) {
  const dan = new Date(`${datum}T00:00:00Z`).getUTCDay()
  return dodajDni(datum, -((dan + 6) % 7))
}

/** Trenutek, ko je v Ljubljani `datum` ob `ura`:00 (poletni in zimski čas). */
export function vLjubljani(datum, ura) {
  const kot = Date.parse(`${datum}T${String(ura).padStart(2, '0')}:00:00Z`)
  const d = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: PAS, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(kot)).map((p) => [p.type, p.value]),
  )
  const lokalno = Date.parse(`${d.year}-${d.month}-${d.day}T${d.hour}:${d.minute}:00Z`)
  return new Date(kot - (lokalno - kot))
}

/** Termin tedna: kdaj osnutek, kdaj objava. */
export function termin(slot, teden) {
  const t = TERMINI[slot]
  const dan = dodajDni(teden, t.dan)
  return { osnutekOb: vLjubljani(dan, t.osnutek), objavaOb: vLjubljani(dan, t.objava) }
}

/** Termini, katerih osnutek je zdaj na vrsti (med uro osnutka in objave). */
export function terminiZdaj(zdaj) {
  const teden = ponedeljek(datumLj(zdaj))
  return Object.keys(TERMINI)
    .map((slot) => ({ slot, teden, ...termin(slot, teden) }))
    .filter((x) => zdaj >= x.osnutekOb && zdaj < x.objavaOb)
}

/** Okno tekem [od, do): ponedeljek prejšnji teden, četrtek zadnjih sedem dni. */
export const okno = (slot, teden) =>
  slot === 'pon' ? { od: dodajDni(teden, -7), do: teden } : { od: dodajDni(teden, -4), do: dodajDni(teden, 3) }

/** ISO številka tedna. */
export function isoTeden(datum) {
  const d = new Date(`${datum}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3)
  const prvi = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  return 1 + Math.round(((d - prvi) / 86400e3 - 3 + ((prvi.getUTCDay() + 6) % 7)) / 7)
}

/** Države po vrsti za ponedeljek: od te, ki je na vrsti, nato ostale. */
export function vrstniRedDrzav(teden) {
  const i = isoTeden(teden) % ROTACIJA.length
  return [...new Set([...ROTACIJA.slice(i), ...ROTACIJA.slice(0, i)])]
}

// --- mejnik uporabnikov ---------------------------------------------------------

/**
 * Mejnik (večkratnik MEJNIK_KORAK), ki ga je število uporabnikov ravnokar
 * doseglo; null, če ga ni ali je že MEJNIK_ROK za nami (mejniki, preseženi pred
 * uvedbo, se ne objavijo).
 */
export function dosezenMejnik(uporabnikov) {
  const m = Math.floor(Number(uporabnikov) / MEJNIK_KORAK) * MEJNIK_KORAK
  return m > 0 && uporabnikov - m < MEJNIK_ROK ? m : null
}

/** Objava mejnika: 6 ur po osnutku, premaknjena naprej v okno 09:00–20:00 (Ljubljana). */
export function objavaMejnika(zdaj) {
  const ob = new Date(zdaj.getTime() + 6 * 3600e3)
  const dan = datumLj(ob)
  const ura = Number(new Intl.DateTimeFormat('en-GB', { timeZone: PAS, hour: '2-digit', hourCycle: 'h23' }).format(ob))
  if (ura < 9) return vLjubljani(dan, 9)
  if (ura >= 20) return vLjubljani(dodajDni(dan, 1), 9)
  return ob
}

/** Vsebina mejnika (iste oblike kot izberiVsebino, prosojnice berejo `mejnik`). */
export const vsebinaMejnika = (d, mejnik) => ({
  slot: 'mejnik', slug: null, liga: null, igralec: null, poudarki: [], idealna: [],
  mejnik: { mejnik, uporabnikov: d.uporabnikov, drzav: d.drzav, lig: d.lig, ekip: d.ekip },
})

// --- vsebina ------------------------------------------------------------------

/** "Priimek Ime" → "Ime Priimek" (kot prikazniIme v src/lib/pomozno.ts). */
export const prikaz = (ime) => {
  const d = String(ime ?? '').trim().split(/\s+/)
  return d.length < 2 ? String(ime ?? '') : `${d.slice(1).join(' ')} ${d[0]}`
}

/** Idealna enajsterica: 1 GK, 4 DEF, 4 MID, 2 FWD po točkah (kot na naslovnici). */
export function enajsterica(igralci) {
  const meje = { GK: 1, DEF: 4, MID: 4, FWD: 2 }
  const st = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
  return [...igralci]
    .sort((a, b) => b.points - a.points || a.player_id - b.player_id)
    .filter((p) => p.position in meje && st[p.position]++ < meje[p.position])
}

/** Klub, pri četrtku še liga. */
const klubLiga = (o) => [o.klub, o.liga].filter(Boolean).join(', ')

/** Angleško ime države (SI → Slovenia). */
export const imeDrzave = (koda) => (koda ? new Intl.DisplayNames(['en'], { type: 'region' }).of(koda) : undefined)

const naj = (seznam, kljuc) => seznam.filter(Boolean).sort((a, b) => kljuc(b) - kljuc(a))[0] ?? null

/**
 * Iz dejstev izbere, kar gre v objavo (to dobi Claude in to izrišejo
 * prosojnice). Ponedeljek: glavna liga (največ ekip), četrtek: vse lige.
 * Vrne null, če ni kroga.
 */
export function izberiVsebino(dejstva, slot) {
  const lige = (dejstva.lige ?? []).filter((l) => l.igralec_kroga)
  if (!lige.length) return null
  const izbrane = slot === 'pon' ? lige.slice(0, 1) : lige
  const glavna = izbrane[0]
  const zLigo = (o, l) => o && (slot === 'cet' ? { ...o, liga: l.name } : o)
  const igralec = naj(izbrane.map((l) => zLigo(l.igralec_kroga, l)), (x) => x.tocke)
  const poudarki = []
  for (const h of izbrane.flatMap((l) => l.hattrick.map((x) => zLigo(x, l))).slice(0, 2)) poudarki.push({ vrsta: 'hattrick', ...h })
  const vratar = naj(izbrane.flatMap((l) => l.vratar_gol.map((x) => zLigo(x, l))), (x) => x.goli)
  if (vratar) poudarki.push({ vrsta: 'vratar', ...vratar })
  const skok = naj(izbrane.map((l) => zLigo(l.skok, l)), (x) => x.novo - x.staro)
  if (skok) poudarki.push({ vrsta: 'skok', ...skok })
  if (dejstva.liga_tedna) poudarki.push({ vrsta: 'liga_tedna', ime: dejstva.liga_tedna.ime, novih: dejstva.liga_tedna.novih_ekip })
  return {
    slot,
    slug: slot === 'pon' ? glavna.slug : null,
    liga: slot === 'pon' ? { ime: glavna.name, krog: glavna.krog, sezona: glavna.sezona, drzava: imeDrzave(glavna.drzava ?? dejstva.drzava) } : null,
    igralec,
    poudarki: poudarki.slice(0, 5),
    idealna: enajsterica(izbrane.flatMap((l) => l.idealna)),
  }
}

export const povezava = (v) => `https://slff.eu/?src=ig${v.slug ? `&t=${v.slug}` : ''}`

/** Kar dobi Claude: imena v prikazni obliki, brez id-jev in grbov. */
export function dejstvaZaNapis(v) {
  if (v.mejnik) {
    const m = v.mejnik
    return { milestone_users: m.mejnik, users_now: m.uporabnikov, countries: m.drzav, active_leagues: m.lig, fantasy_teams: m.ekip }
  }
  return {
    liga: v.liga,
    igralec_kroga: v.igralec && { ...v.igralec, ime: prikaz(v.igralec.ime), grb: undefined },
    poudarki: v.poudarki.map((p) => ({ ...p, ime: p.vrsta === 'liga_tedna' ? p.ime : prikaz(p.ime) })),
    idealna_enajsterica: v.idealna.map((p) => ({ ime: prikaz(p.full_name), klub: p.team_name, pozicija: p.position, tocke: p.points })),
  }
}

// --- preverba napisa ------------------------------------------------------------

// Angleško: "4,000" je tisoč (vejica loči tisočice), "8.2" decimalka.
const STEVILO = /\d{1,3}(?:,\d{3})+(?!\d)|\d+(?:\.\d+)?/g
const normaliziraj = (s) => String(Number(s.replace(/,/g, '')))
// Besede z veliko začetnico, ki niso imena iz dejstev, a so v (angleškem) napisu dovoljene.
const DOVOLJENE = ['SLFF', 'XI', 'Ideal', 'Fantasy', 'Instagram', 'Facebook', 'Europe', 'MVP', 'GOAT', 'OK', 'Round', 'Player', 'League',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Thank', 'Thanks']

/**
 * Napis sme omeniti le števila in imena iz dejstev. Vrne seznam tujih
 * (prazen = v redu). Povezave in ključniki (#…) se ne preverjajo. Ime je
 * beseda z veliko začetnico sredi stavka; svojilni 's odpade, zloženka
 * ("Sunday-league") je znana, če je znan vsak del.
 */
export function preveriNapis(napis, dejstva) {
  const besedilo = String(napis).replace(/https?:\/\/\S+/g, ' ').replace(/#[\p{L}\p{N}_]+/gu, ' ')
  const vir = JSON.stringify(dejstva)
  const stevila = new Set((vir.match(STEVILO) ?? []).map(normaliziraj))
  const besede = new Set([...(vir.match(/[\p{L}][\p{L}'’.-]*/gu) ?? []), ...DOVOLJENE].map((b) => b.toLowerCase()))
  const znana = (z) => {
    const brez = z.replace(/['’]s$/, '')
    return besede.has(brez.toLowerCase()) || brez.split('-').every((d) => !/^\p{Lu}/u.test(d) || besede.has(d.toLowerCase()))
  }
  const tuje = []
  for (const s of besedilo.match(STEVILO) ?? []) if (!stevila.has(normaliziraj(s))) tuje.push(s)
  for (const m of besedilo.matchAll(/[\p{L}][\p{L}'’-]*/gu)) {
    const z = m[0]
    // Začetek stavka ali vrstice (tudi za čustvenčkom) je izvzet.
    const sredi = /[\p{L}\p{N},;]$/u.test(besedilo.slice(0, m.index).trimEnd())
    if (/^\p{Lu}/u.test(z) && z.length >= 2 && sredi && !znana(z)) tuje.push(z)
  }
  return [...new Set(tuje)]
}

// --- napis ----------------------------------------------------------------------

/** Napis brez Clauda: suha dejstva, vedno pravilna. */
export function predlogaNapisa(v) {
  const vrstice = []
  if (v.mejnik) {
    const m = v.mejnik
    vrstice.push(`🎉 ${m.mejnik.toLocaleString('en-GB')} managers on SLFF! Thank you all.`,
      `⚽ ${m.lig} leagues in ${m.drzav} countries, ${m.ekip.toLocaleString('en-GB')} fantasy teams.`)
  } else {
    vrstice.push(v.liga ? `${v.liga.ime} (${v.liga.drzava}) · round ${v.liga.krog}` : "This week in Europe's Sunday leagues ⚽")
    if (v.igralec) vrstice.push(`🏆 Player of the round: ${prikaz(v.igralec.ime)} (${klubLiga(v.igralec)}), points: ${v.igralec.tocke}`)
  }
  vrstice.push('', `👉 Build your team: ${povezava(v)}`, '', '#SLFF #fantasyfootball #football')
  return vrstice.join('\n')
}

export function sistemskiPoziv(link, mejnik = false) {
  return [
    'You write Instagram/Facebook captions for SLFF, a free fantasy football game for amateur and regional leagues (slff.eu).',
    'Write in English. Tone: goofy, warm, a bit cheeky, never mean to a player. Short: at most 6 short lines plus hashtags.',
    mejnik
      ? 'This post celebrates SLFF reaching milestone_users users. Thank the community warmly; you may mention the countries, active leagues and fantasy teams counts. Write numbers from 1,000 up with a thousands comma (4,000).'
      : 'The facts are a round recap (one league of one country, or several countries). Name the country when it is given.',
    'Use ONLY the facts in the user message. Every number and every player, club, league or country name you write must appear in the facts exactly as given.',
    'Do not invent results, opponents, dates, minutes, nicknames or anything else. Do not mention any user, fantasy team or manager by name.',
    'Only celebrate: every player, club and league in the post is praised. Never point out a bad performance, a price drop or a mistake.',
    'Humour comes from Sunday-league life in general (muddy pitches, Monday-morning legs, the post-match beer, the bus to the away game), never at a named person.',
    `End with a call to action and this exact link on its own line: ${link}`,
    'Then 3 to 6 hashtags (include #SLFF). Plain text, emojis allowed, no markdown.',
  ].join('\n')
}

async function klicClaude(kljuc, sistem, sporocilo) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': kljuc, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, system: sistem, messages: [{ role: 'user', content: sporocilo }] }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const o = await r.json()
  // Model najprej razmišlja; odrezan napis ne sme naprej.
  if (o.stop_reason === 'max_tokens') throw new Error('Anthropic: napis odrezan (max_tokens)')
  return o.content.filter((c) => c.type === 'text').map((c) => c.text).join('').trim()
}

/** Napis: Claude dvakrat, nato predloga. Vrne { napis, vir, zavrnjeno }. */
export async function napis(v, kljuc, klic = klicClaude) {
  const dejstva = dejstvaZaNapis(v)
  const link = povezava(v)
  const zavrnjeno = []
  if (kljuc) {
    for (let poskus = 0; poskus < 2; poskus++) {
      try {
        let besedilo = await klic(kljuc, sistemskiPoziv(link, Boolean(v.mejnik)), `Facts (JSON):\n${JSON.stringify(dejstva, null, 2)}`)
        const tuje = preveriNapis(besedilo, dejstva)
        if (!tuje.length) {
          if (!besedilo.includes(link)) besedilo += `\n\n${link}`
          return { napis: besedilo, vir: 'claude', zavrnjeno }
        }
        zavrnjeno.push({ besedilo, tuje })
      } catch (e) {
        zavrnjeno.push({ napaka: e.message })
      }
    }
  }
  return { napis: predlogaNapisa(v), vir: 'predloga', zavrnjeno }
}

// --- prosojnice -------------------------------------------------------------------

/** Posname prosojnice strani /objava; vrne poti JPEG (Instagram sprejme le JPEG). */
export async function posnemi(v, url, mapa) {
  const { chromium } = await import('playwright')
  await mkdir(mapa, { recursive: true })
  const brskalnik = await chromium.launch({ headless: true })
  try {
    // Na strežniku slff.eu kaže nase (/etc/hosts), Caddy pa ima Cloudflarov izvorni certifikat,
    // ki mu brskalnik ne zaupa. Stran beremo le z lastnega strežnika.
    const ctx = await brskalnik.newContext({ viewport: { width: 1080, height: 1350 }, ignoreHTTPSErrors: true })
    // Statistika obiska (Umami) ne šteje robota.
    await ctx.route(/stats\.slff\.eu/, (r) => r.abort())
    await ctx.addInitScript(([vsebina, j]) => {
      window.__OBJAVA__ = vsebina
      localStorage.setItem('slff-jezik-izbran', j)
    }, [v, JEZIK])
    const stran = await ctx.newPage()
    const poti = []
    let n = 1
    for (let i = 0; i < n; i++) {
      await stran.goto(`${url}/objava?slide=${i}`, { waitUntil: 'networkidle' })
      await stran.locator('#prosojnica').waitFor()
      await stran.evaluate(() => document.fonts.ready)
      if (i === 0) n = Number(await stran.evaluate(() => document.documentElement.dataset.prosojnic)) || 1
      const pot = join(mapa, `${i + 1}.jpg`)
      await stran.locator('#prosojnica').screenshot({ path: pot, type: 'jpeg', quality: 90 })
      poti.push(pot)
    }
    return poti
  } finally {
    await brskalnik.close()
  }
}

// --- Discord ------------------------------------------------------------------------

/** Povzetek dejstev za človeka (Discord, --suho). */
export function povzetek(v) {
  if (v.mejnik) {
    const m = v.mejnik
    return `Mejnik: ${m.mejnik} uporabnikov (zdaj ${m.uporabnikov}), ${m.drzav} držav, ${m.lig} aktivnih lig, ${m.ekip} ekip`
  }
  const vr = []
  if (v.liga) vr.push(`Liga: ${v.liga.ime}, ${v.liga.krog}. krog ${v.liga.sezona}`)
  if (v.igralec) vr.push(`Igralec kroga: ${prikaz(v.igralec.ime)} (${klubLiga(v.igralec)}) ${v.igralec.tocke} t, ${v.igralec.goli} gol.`)
  for (const p of v.poudarki) {
    const o = { ...p }
    delete o.vrsta
    delete o.ime
    delete o.klub
    delete o.liga
    vr.push(`${p.vrsta}: ${p.vrsta === 'liga_tedna' ? p.ime : prikaz(p.ime)}${p.klub ? ` (${klubLiga(p)})` : ''} ${JSON.stringify(o)}`)
  }
  vr.push(`Enajsterica: ${v.idealna.map((p) => `${prikaz(p.full_name)} ${p.points}`).join(', ')}`)
  return vr.join('\n')
}

async function vDiscord(webhook, { naslov, napis: besedilo, povzetek: pov, poti }) {
  const obrazec = new FormData()
  obrazec.append('payload_json', JSON.stringify({
    content: `${naslov}\n\`\`\`\n${pov.slice(0, 1700)}\n\`\`\``,
    embeds: [{ title: 'Napis', description: besedilo.slice(0, 4000) }],
    allowed_mentions: { parse: [] },
  }))
  for (const [i, pot] of poti.entries()) obrazec.append(`files[${i}]`, new Blob([await readFile(pot)], { type: 'image/jpeg' }), `${i + 1}.jpg`)
  const r = await fetch(webhook, { method: 'POST', body: obrazec })
  if (!r.ok) throw new Error(`Discord ${r.status}`)
}

async function sporociDiscord(webhook, content) {
  if (!webhook) return
  const r = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: content.slice(0, 2000), allowed_mentions: { parse: [] } }),
  })
  if (!r.ok) throw new Error(`Discord ${r.status}`)
}

// --- ustavitev ------------------------------------------------------------------

/** sha256 žetona, kot ga računa SQL ustavi_objavo (hex). */
export const hashZetona = (zeton) => createHash('sha256').update(zeton, 'utf8').digest('hex')

/** Enkraten žeton (256 bitov) in povezava; # ne gre v dnevnike strežnika. */
export function novZeton(url) {
  const zeton = randomBytes(32).toString('base64url')
  return { zeton, hash: hashZetona(zeton), povezava: `${url}/objava#ustavi=${zeton}` }
}

// --- objava (Meta) ----------------------------------------------------------------

export const metaNastavljena = (env) => Boolean(env.META_PAGE_TOKEN && env.META_PAGE_ID && env.META_IG_USER_ID)

/** Ali je osnutek zdaj za objavo: viden na Discordu, ni ustavljen, rok je mimo, a ne več kot OBJAVA_ZAMUDA. */
export function zaObjavo(o, zdaj) {
  const rok = Date.parse(o.objava_ob)
  return o.stanje === 'osnutek' && Boolean(o.discord_at) && zdaj >= rok && zdaj - rok <= OBJAVA_ZAMUDA
}

/** Javni naslov slike: <base>/<mapa osnutka>/<n>.jpg (Caddy, /objave-mediji/). */
export const javniUrl = (pot, mapa, base) =>
  `${base.replace(/\/$/, '')}/${relative(mapa, pot).split(/[\\/]/).map(encodeURIComponent).join('/')}`

const grafOsnova = (env) => `https://graph.facebook.com/${env.META_GRAPH_VERSION || 'v26.0'}`

/** Klic Graph API (POST obrazec ali GET); napaka Mete postane Error brez žetona. */
async function graf(f, osnova, pot, parametri, metoda = 'POST') {
  const telo = new URLSearchParams(parametri)
  const r = metoda === 'GET' ? await f(`${osnova}/${pot}?${telo}`) : await f(`${osnova}/${pot}`, { method: 'POST', body: telo })
  const o = await r.json().catch(() => ({}))
  if (!r.ok || o.error) throw new Error(`Meta ${pot}: ${o.error?.message ?? r.status}`)
  return o
}

/** Počaka, da je vsebnik Instagrama pripravljen (FINISHED), največ 5 minut. */
async function pripravljen(f, osnova, id, token, cakajMs) {
  for (let i = 0; i < 30; i++) {
    const { status_code: s } = await graf(f, osnova, id, { fields: 'status_code', access_token: token }, 'GET')
    if (s === 'FINISHED') return
    if (s === 'ERROR' || s === 'EXPIRED') throw new Error(`Meta vsebnik ${id}: ${s}`)
    await cakajMs(10e3)
  }
  throw new Error(`Meta vsebnik ${id}: ni pripravljen v 5 minutah`)
}

/** Instagram: ena slika ali vrtiljak (največ 10). Vrne povezavo do objave. */
export async function objaviInstagram({ slike, napis: besedilo, env, f = fetch, cakajMs = cakaj }) {
  const osnova = grafOsnova(env)
  const token = env.META_PAGE_TOKEN
  const ig = env.META_IG_USER_ID
  let vsebnik
  if (slike.length === 1) {
    vsebnik = (await graf(f, osnova, `${ig}/media`, { image_url: slike[0], caption: besedilo, access_token: token })).id
  } else {
    const otroci = []
    for (const url of slike.slice(0, 10)) {
      otroci.push((await graf(f, osnova, `${ig}/media`, { image_url: url, is_carousel_item: 'true', access_token: token })).id)
    }
    for (const id of otroci) await pripravljen(f, osnova, id, token, cakajMs)
    vsebnik = (await graf(f, osnova, `${ig}/media`, { media_type: 'CAROUSEL', children: otroci.join(','), caption: besedilo, access_token: token })).id
  }
  await pripravljen(f, osnova, vsebnik, token, cakajMs)
  const { id } = await graf(f, osnova, `${ig}/media_publish`, { creation_id: vsebnik, access_token: token })
  const { permalink } = await graf(f, osnova, id, { fields: 'permalink', access_token: token }, 'GET')
  return permalink ?? `instagram:${id}`
}

/** Facebook stran: neobjavljene fotografije, nato ena objava z njimi. Vrne povezavo. */
export async function objaviFacebook({ slike, napis: besedilo, env, f = fetch }) {
  const osnova = grafOsnova(env)
  const token = env.META_PAGE_TOKEN
  const stran = env.META_PAGE_ID
  const priloge = {}
  for (const [i, url] of slike.entries()) {
    const { id } = await graf(f, osnova, `${stran}/photos`, { url, published: 'false', access_token: token })
    priloge[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })
  }
  const { id } = await graf(f, osnova, `${stran}/feed`, { message: besedilo, ...priloge, access_token: token })
  const { permalink_url: url } = await graf(f, osnova, id, { fields: 'permalink_url', access_token: token }, 'GET')
  return url ?? `https://www.facebook.com/${id}`
}

// --- osnutek ------------------------------------------------------------------------

/** Dejstva termina: ponedeljek prva država po rotaciji s krogom, četrtek vse. */
async function dejstvaTermina(db, slot, teden, drzava) {
  const { od, do: doo } = okno(slot, teden)
  const drzave = slot === 'cet' ? [null] : drzava ? [drzava] : vrstniRedDrzav(teden)
  for (const d of drzave) {
    const { data, error } = await db.rpc('objava_dejstva', { p_drzava: d, p_od: od, p_do: doo })
    if (error) throw new Error(`objava_dejstva: ${error.message}`)
    if (izberiVsebino(data, slot)) return data
  }
  return null
}

const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

const log = (s) => console.log(`${new Date().toISOString()} ${s}`)

/** Izdela osnutek termina (pon, cet) ali mejnika. Vrne true, če je nastal (ali bi v --suho). */
export async function osnutek({ db, slot, teden, drzava, dejstva, suho, url, mapa, env, zdaj = new Date() }) {
  const obstaja = async (stolpec, vrednost) => {
    if (suho) return false
    const { data, error } = await db.from('objave').select('id').eq('slot', slot).eq(stolpec, vrednost).maybeSingle()
    if (error) throw new Error(`objave: ${error.message}`)
    return Boolean(data)
  }
  let d, v, objavaOb, mejnik = null
  if (slot === 'mejnik') {
    if (dejstva) d = dejstva
    else {
      const { data, error } = await db.rpc('objava_mejnik_dejstva')
      if (error) throw new Error(`objava_mejnik_dejstva: ${error.message}`)
      d = data
    }
    mejnik = dosezenMejnik(d.uporabnikov)
    if (!mejnik || (await obstaja('mejnik', mejnik))) return false
    v = vsebinaMejnika(d, mejnik)
    objavaOb = objavaMejnika(zdaj)
  } else {
    if (await obstaja('teden', teden)) return false
    d = dejstva ?? (await dejstvaTermina(db, slot, teden, drzava))
    v = d && izberiVsebino(d, slot)
    if (!v) {
      log(`Objava ${slot} ${teden}: ni kroga, osnutka ni.`)
      return false
    }
    objavaOb = termin(slot, teden).objavaOb
  }
  const jezik = JEZIK
  const oznaka = mejnik ? `mejnik ${mejnik}` : d.drzava ?? 'vse države'
  const n = await napis(v, env.ANTHROPIC_API_KEY)
  // Naključni del: slike so javne (/objave-mediji/), osnutek pa naj se ne da uganiti.
  const pot = join(mapa, `${teden}-${slot}-${randomBytes(6).toString('hex')}`)
  const poti = await posnemi(v, url, pot)
  const pov = povzetek(v)
  if (suho) {
    console.log(`--- ${slot} ${teden} (${oznaka}, ${jezik}), objava ${objavaOb.toISOString()}`)
    console.log(pov)
    console.log(`--- napis (${n.vir}):\n${n.napis}`)
    for (const z of n.zavrnjeno) console.log('--- zavrnjen poskus:', JSON.stringify(z))
    console.log(`--- prosojnice:\n${poti.join('\n')}`)
    return true
  }
  const z = novZeton(url)
  const { data: vrstica, error } = await db.from('objave').insert({
    slot, teden, mejnik, drzava: d.drzava ?? null, jezik, liga: v.slug, dejstva: d, napis: n.napis, napis_vir: n.vir,
    mediji: poti, objava_ob: objavaOb.toISOString(), ustavi_zeton_hash: z.hash,
  }).select('id').single()
  if (error) {
    if (error.code === '23505') return false // drug zagon je bil hitrejši
    throw new Error(`objave: ${error.message}`)
  }
  try {
    if (!env.DISCORD_OBJAVE_WEBHOOK) throw new Error('manjka DISCORD_OBJAVE_WEBHOOK')
    const kdaj = new Intl.DateTimeFormat('sl-SI', { timeZone: PAS, dateStyle: 'short', timeStyle: 'short' }).format(objavaOb)
    // <…> skrije predogled povezave; ustavi pa šele gumb na strani.
    const kaj = metaNastavljena(env)
      ? `objava na Instagram in Facebook ${kdaj}, če je ne ustaviš.\n⛔ Ustavi objavo: <${z.povezava}>`
      : `objava ${kdaj}. Meta ni nastavljena: nič se ne objavi samo.`
    await vDiscord(env.DISCORD_OBJAVE_WEBHOOK, {
      naslov: `📝 **Osnutek objave #${vrstica.id}** (${oznaka}, napis: ${n.vir}) — ${kaj}`,
      napis: n.napis, povzetek: pov, poti,
    })
  } catch (e) {
    // Osnutek, ki ga človek ni videl, se nikoli ne objavi.
    await db.from('objave').update({ stanje: 'napaka', napaka: e.message }).eq('id', vrstica.id)
    throw e
  }
  // Brez tega se osnutek ne objavi (zaObjavo): človek ga mora videti.
  const { error: e2 } = await db.from('objave').update({ discord_at: new Date().toISOString() }).eq('id', vrstica.id)
  if (e2) throw new Error(`objave discord_at: ${e2.message}`)
  log(`Objava ${slot} ${teden}: osnutek #${vrstica.id} na Discordu.`)
  return true
}

/**
 * Objavi osnutke, ki so na vrsti. Vrstico najprej prevzame (osnutek →
 * objavljanje, pogojno), zato se nikoli ne objavi dvakrat; neuspeh je
 * `napaka` in se ne ponovi sam (Meta je morda že objavila del).
 */
export async function objaviZapadle({ db, env, mapa, zdaj = Date.now(), f = fetch, cakajMs = cakaj }) {
  const { data, error } = await db.from('objave').select('id, stanje, objava_ob, discord_at, napis, mediji')
    .eq('stanje', 'osnutek').lte('objava_ob', new Date(zdaj).toISOString())
    .gte('objava_ob', new Date(zdaj - OBJAVA_ZAMUDA).toISOString())
  if (error) throw new Error(`objave: ${error.message}`)
  for (const o of (data ?? []).filter((x) => zaObjavo(x, zdaj))) {
    if (!metaNastavljena(env)) {
      log(`Objava #${o.id}: META_* ni nastavljen, ne objavim.`)
      continue
    }
    const { data: prevzeta, error: e1 } = await db.from('objave').update({ stanje: 'objavljanje' })
      .eq('id', o.id).eq('stanje', 'osnutek').select('id')
    if (e1 || !prevzeta?.length) continue
    const base = env.OBJAVE_MEDIJI_URL || 'https://slff.eu/objave-mediji'
    const slike = o.mediji.map((p) => javniUrl(p, mapa, base))
    const izid = {}
    let napaka = null
    try {
      izid.ig_povezava = await objaviInstagram({ slike, napis: o.napis, env, f, cakajMs })
      izid.fb_povezava = await objaviFacebook({ slike, napis: o.napis, env, f })
    } catch (e) {
      napaka = e.message
    }
    const { error: e3 } = await db.from('objave').update(napaka
      ? { ...izid, stanje: 'napaka', napaka }
      : { ...izid, stanje: 'objavljeno', objavljeno_at: new Date().toISOString() }).eq('id', o.id)
    if (e3) log(`Objava #${o.id}: zapis stanja ni uspel: ${e3.message}`)
    const povezave = [izid.ig_povezava && `Instagram: <${izid.ig_povezava}>`, izid.fb_povezava && `Facebook: <${izid.fb_povezava}>`]
      .filter(Boolean).join('\n')
    const sporocilo = napaka
      ? `❌ **Objava #${o.id} ni uspela:** ${napaka}${povezave ? `\nŽe objavljeno:\n${povezave}` : ''}\nNe ponovi se sama.`
      : `✅ **Objava #${o.id} je objavljena.**\n${povezave}`
    log(sporocilo.replace(/\n/g, ' '))
    await sporociDiscord(env.DISCORD_OBJAVE_WEBHOOK, sporocilo).catch((e) => log(`Discord: ${e.message}`))
  }
}

async function main() {
  const arg = (ime) => {
    const i = process.argv.indexOf(ime)
    return i >= 0 ? process.argv[i + 1] : undefined
  }
  const env = process.env
  const suho = process.argv.includes('--suho')
  const zanka = process.argv.includes('--zanka') && !suho
  const url = (arg('--url') ?? env.OBJAVE_URL ?? 'https://slff.eu').replace(/\/$/, '')
  const mapa = arg('--mapa') ?? env.OBJAVE_MAPA ?? join(tmpdir(), 'objave-vzorec')
  const dejstva = arg('--dejstva') ? JSON.parse(await readFile(arg('--dejstva'), 'utf8')) : null
  let db = null
  if (!dejstva || !suho) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY (brez baze: --suho --dejstva datoteka.json).')
      if (zanka) await cakaj(10 * 60e3)
      process.exit(1)
    }
    const { createClient } = await import('@supabase/supabase-js')
    db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  }
  if (!zanka) {
    const slot = arg('--slot')
    if (!(slot in TERMINI) && slot !== 'mejnik') {
      console.error('Uporaba: --slot pon|cet|mejnik [--drzava SI] [--suho] [--dejstva d.json] [--url …] [--mapa …], ali --zanka')
      process.exit(2)
    }
    const teden = ponedeljek(datumLj(new Date()))
    await osnutek({ db, slot, teden, drzava: arg('--drzava'), dejstva, suho, url, mapa, env })
    return
  }
  log('Objave: zanka teče (vsakih 10 minut).')
  for (;;) {
    const zdaj = new Date()
    // Mejnik uporabnikov: vsak obhod pogleda, ali je dosežen (osnutek enkrat na mejnik).
    for (const t of [...terminiZdaj(zdaj), { slot: 'mejnik', teden: ponedeljek(datumLj(zdaj)) }]) {
      try {
        await osnutek({ db, slot: t.slot, teden: t.teden, suho: false, url, mapa, env })
      } catch (e) {
        console.error(`Objava ${t.slot} ${t.teden} ni uspela: ${e.message}`)
      }
    }
    try {
      await objaviZapadle({ db, env, mapa })
    } catch (e) {
      console.error(`Objavljanje: ${e.message}`)
    }
    await cakaj(10 * 60e3)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
