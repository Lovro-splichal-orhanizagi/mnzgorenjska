// Samodejne objave za Instagram in Facebook, faza 1: osnutek na Discord.
// Načrt: docs/superpowers/specs/2026-10-15-samodejne-objave-design.md.
//
// Termina (ljubljanski čas): ponedeljek osnutek 04:00, objava 10:00 — krog
// ene države v njenem jeziku (rotacija ROTACIJA); četrtek osnutek 12:00,
// objava 18:00 — vse države, angleško. V fazi 1 se NIČ ne objavi: osnutek
// (dejstva, napis, prosojnice) gre v tabelo `objave` in na Discord.
//
// 1. dejstva: SQL objava_dejstva (servisna) ali --dejstva datoteka.json,
// 2. napis: Claude (Messages API), vsako število in ime mora biti v dejstvih;
//    sicer še en poskus, nato predloga,
// 3. prosojnice: stran /objava (src/pages/Objava.tsx), posname jih Playwright,
// 4. osnutek: vrstica v `objave` (en na termin in teden) in Discord s slikami.
//
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, DISCORD_OBJAVE_WEBHOOK,
//   OBJAVE_URL (stran s prosojnicami, privzeto https://slff.eu), OBJAVE_MAPA (slike)
//   node scripts/objave.mjs --zanka                    (delavec slff-objave: vsakih 10 minut)
//   node scripts/objave.mjs --slot pon [--drzava SI]   (en osnutek zdaj)
//   node scripts/objave.mjs --slot cet --suho --dejstva d.json --url http://localhost:5173 [--mapa /tmp/objave-vzorec]
//     --suho: izpiše dejstva in napis, slike zapiše v --mapa; ne piše v bazo, ne pošlje na Discord
import { fileURLToPath } from 'node:url'
import { resolve, join } from 'node:path'
import { mkdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

export const MODEL = 'claude-sonnet-5-5'
// Ponedeljek: država po rotaciji ISO tedna; brez kroga gre na naslednjo.
// ponytail: stalna rotacija približa vrstni red po številu uporabnikov; ob
// rasti druge države jo dopolni tu.
export const ROTACIJA = ['SI', 'HR', 'SK', 'SI', 'HR', 'SK', 'AT', 'SI', 'HR', 'SK', 'SI', 'HR', 'SK', 'HU']
export const JEZIK_DRZAVE = { SI: 'sl', SK: 'sk', HR: 'hr', CZ: 'cs', HU: 'hu', AT: 'de', RS: 'sr', RO: 'ro', EE: 'et', PL: 'pl', ES: 'es', LV: 'lv', MK: 'mk' }
export const TERMINI = { pon: { dan: 0, osnutek: 4, objava: 10 }, cet: { dan: 3, osnutek: 12, objava: 18 } }
const PAS = 'Europe/Ljubljana'

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
    liga: slot === 'pon' ? { ime: glavna.name, krog: glavna.krog, sezona: glavna.sezona } : null,
    igralec,
    poudarki: poudarki.slice(0, 5),
    idealna: enajsterica(izbrane.flatMap((l) => l.idealna)),
  }
}

export const povezava = (v) => `https://slff.eu/?src=ig${v.slug ? `&t=${v.slug}` : ''}`

/** Kar dobi Claude: imena v prikazni obliki, brez id-jev in grbov. */
export function dejstvaZaNapis(v) {
  return {
    liga: v.liga,
    igralec_kroga: v.igralec && { ...v.igralec, ime: prikaz(v.igralec.ime), grb: undefined },
    poudarki: v.poudarki.map((p) => ({ ...p, ime: p.vrsta === 'liga_tedna' ? p.ime : prikaz(p.ime) })),
    idealna_enajsterica: v.idealna.map((p) => ({ ime: prikaz(p.full_name), klub: p.team_name, pozicija: p.position, tocke: p.points })),
  }
}

// --- preverba napisa ------------------------------------------------------------

const STEVILO = /\d+(?:[.,]\d+)?/g
const normaliziraj = (s) => String(Number(s.replace(',', '.')))
// Besede z veliko začetnico, ki niso imena iz dejstev, a so v napisu dovoljene.
const DOVOLJENE = ['SLFF', 'XI', 'Ideal', 'Fantasy', 'Instagram', 'Facebook', 'Europe', 'Evropa', 'Evropi', 'Európa', 'Európe', 'Europa', 'Europi',
  'Slovenija', 'Sloveniji', 'Hrvatska', 'Hrvatskoj', 'Slovensko', 'Slovensku', 'Österreich', 'Magyarország', 'MVP', 'GOAT', 'OK']

/**
 * Napis sme omeniti le števila in imena iz dejstev. Vrne seznam tujih
 * (prazen = v redu). Povezave in ključniki (#…) se ne preverjajo. Ime je
 * beseda z veliko začetnico sredi stavka; v nemščini (samostalniki z veliko)
 * le dve taki zapored ("Torwart Mezga" bi padlo, kar je varno).
 */
export function preveriNapis(napis, dejstva, jezik) {
  const besedilo = String(napis).replace(/https?:\/\/\S+/g, ' ').replace(/#[\p{L}\p{N}_]+/gu, ' ')
  const vir = JSON.stringify(dejstva)
  const stevila = new Set((vir.match(STEVILO) ?? []).map(normaliziraj))
  const besede = new Set([...(vir.match(/[\p{L}][\p{L}'’.-]*/gu) ?? []), ...DOVOLJENE].map((b) => b.toLowerCase()))
  const tuje = []
  for (const s of besedilo.match(STEVILO) ?? []) if (!stevila.has(normaliziraj(s))) tuje.push(s)
  const jeVelika = /^\p{Lu}/u
  // Besede z veliko začetnico sredi stavka (začetek stavka ali vrstice, tudi
  // za čustvenčkom, je izvzet), zložene v nize, ki jih loči le presledek.
  const nizi = []
  let prejKonec = -1
  for (const m of besedilo.matchAll(/[\p{L}][\p{L}'’-]*/gu)) {
    const z = m[0]
    const sredi = /[\p{L}\p{N},;]$/u.test(besedilo.slice(0, m.index).trimEnd())
    if (!jeVelika.test(z) || z.length < 2 || !sredi) {
      prejKonec = -1
      continue
    }
    if (prejKonec >= 0 && /^\s+$/.test(besedilo.slice(prejKonec, m.index))) nizi.at(-1).push(z)
    else nizi.push([z])
    prejKonec = m.index + z.length
  }
  for (const niz of nizi) {
    const neznane = niz.filter((z) => !besede.has(z.toLowerCase()))
    // Nemščina piše samostalnike z veliko: tuje je šele ime s priimkom (dve neznani zapored).
    if (jezik !== 'de') tuje.push(...neznane)
    else if (neznane.length >= 2) tuje.push(neznane.join(' '))
  }
  return [...new Set(tuje)]
}

// --- napis ----------------------------------------------------------------------

const PREDLOGA = {
  sl: { igralec: 'Igralec kroga', tocke: 'točke', krog: 'krog', teden: 'Ta teden v Evropi', poziv: 'Sestavi svojo ekipo' },
  hr: { igralec: 'Igrač kola', tocke: 'bodovi', krog: 'kolo', teden: 'Ovaj tjedan u Europi', poziv: 'Složi svoju momčad' },
  sk: { igralec: 'Hráč kola', tocke: 'body', krog: 'kolo', teden: 'Tento týždeň v Európe', poziv: 'Zostav si tím' },
  de: { igralec: 'Spieler der Runde', tocke: 'Punkte', krog: 'Runde', teden: 'Diese Woche in Europa', poziv: 'Stell dein Team auf' },
  hu: { igralec: 'A forduló játékosa', tocke: 'pont', krog: 'forduló', teden: 'Ezen a héten Európában', poziv: 'Állítsd össze a csapatod' },
  en: { igralec: 'Player of the round', tocke: 'points', krog: 'round', teden: "This week in Europe's Sunday leagues", poziv: 'Build your team' },
}

/** Napis brez Clauda: suha dejstva, vedno pravilna. */
export function predlogaNapisa(v, jezik) {
  const b = PREDLOGA[jezik] ?? PREDLOGA.en
  const vrstice = [v.liga ? `${v.liga.ime} · ${v.liga.krog}. ${b.krog}` : `${b.teden} ⚽`]
  if (v.igralec) vrstice.push(`🏆 ${b.igralec}: ${prikaz(v.igralec.ime)} (${klubLiga(v.igralec)}), ${b.tocke}: ${v.igralec.tocke}`)
  vrstice.push('', `👉 ${b.poziv}: ${povezava(v)}`, '', '#SLFF #fantasyfootball #football')
  return vrstice.join('\n')
}

const JEZIK_IME = { sl: 'Slovenian', hr: 'Croatian', sk: 'Slovak', cs: 'Czech', hu: 'Hungarian', de: 'German (Austrian)', sr: 'Serbian (Latin script, ekavian)', ro: 'Romanian', et: 'Estonian', pl: 'Polish', es: 'Spanish', lv: 'Latvian', mk: 'Macedonian (Cyrillic)', en: 'English' }

export function sistemskiPoziv(jezik, link) {
  return [
    'You write Instagram/Facebook captions for SLFF, a free fantasy football game for amateur and regional leagues (slff.eu).',
    `Write in ${JEZIK_IME[jezik] ?? 'English'}. Tone: goofy, warm, a bit cheeky, never mean to a player. Short: at most 6 short lines plus hashtags.`,
    'Use ONLY the facts in the user message. Every number and every player, club or league name you write must appear in the facts exactly as given.',
    'Do not invent results, opponents, dates, minutes, nicknames or anything else. Do not mention any user, fantasy team or manager.',
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
export async function napis(v, jezik, kljuc, klic = klicClaude) {
  const dejstva = dejstvaZaNapis(v)
  const link = povezava(v)
  const zavrnjeno = []
  if (kljuc) {
    for (let poskus = 0; poskus < 2; poskus++) {
      try {
        let besedilo = await klic(kljuc, sistemskiPoziv(jezik, link), `Facts (JSON):\n${JSON.stringify(dejstva, null, 2)}`)
        const tuje = preveriNapis(besedilo, dejstva, jezik)
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
  return { napis: predlogaNapisa(v, jezik), vir: 'predloga', zavrnjeno }
}

// --- prosojnice -------------------------------------------------------------------

/** Posname prosojnice strani /objava; vrne poti PNG. */
export async function posnemi(v, jezik, url, mapa) {
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
    }, [v, jezik])
    const stran = await ctx.newPage()
    const poti = []
    let n = 1
    for (let i = 0; i < n; i++) {
      await stran.goto(`${url}/objava?slide=${i}`, { waitUntil: 'networkidle' })
      await stran.locator('#prosojnica').waitFor()
      await stran.evaluate(() => document.fonts.ready)
      if (i === 0) n = Number(await stran.evaluate(() => document.documentElement.dataset.prosojnic)) || 1
      const pot = join(mapa, `${i + 1}.png`)
      await stran.locator('#prosojnica').screenshot({ path: pot })
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
  for (const [i, pot] of poti.entries()) obrazec.append(`files[${i}]`, new Blob([await readFile(pot)], { type: 'image/png' }), `${i + 1}.png`)
  const r = await fetch(webhook, { method: 'POST', body: obrazec })
  if (!r.ok) throw new Error(`Discord ${r.status}`)
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

const log = (s) => console.log(`${new Date().toISOString()} ${s}`)

/** Izdela osnutek termina. Vrne true, če je nastal (ali bi v --suho). */
export async function osnutek({ db, slot, teden, drzava, dejstva, suho, url, mapa, env }) {
  if (!suho) {
    const { data: obstaja, error } = await db.from('objave').select('id').eq('slot', slot).eq('teden', teden).maybeSingle()
    if (error) throw new Error(`objave: ${error.message}`)
    if (obstaja) return false
  }
  const d = dejstva ?? (await dejstvaTermina(db, slot, teden, drzava))
  const v = d && izberiVsebino(d, slot)
  if (!v) {
    log(`Objava ${slot} ${teden}: ni kroga, osnutka ni.`)
    return false
  }
  const jezik = slot === 'cet' ? 'en' : JEZIK_DRZAVE[d.drzava] ?? 'en'
  const n = await napis(v, jezik, env.ANTHROPIC_API_KEY)
  const pot = join(mapa, `${teden}-${slot}`)
  const poti = await posnemi(v, jezik, url, pot)
  const { objavaOb } = termin(slot, teden)
  const pov = povzetek(v)
  if (suho) {
    console.log(`--- ${slot} ${teden} (${d.drzava ?? 'vse države'}, ${jezik}), objava ${objavaOb.toISOString()}`)
    console.log(pov)
    console.log(`--- napis (${n.vir}):\n${n.napis}`)
    for (const z of n.zavrnjeno) console.log('--- zavrnjen poskus:', JSON.stringify(z))
    console.log(`--- prosojnice:\n${poti.join('\n')}`)
    return true
  }
  const { data: vrstica, error } = await db.from('objave').insert({
    slot, teden, drzava: d.drzava, jezik, liga: v.slug, dejstva: d, napis: n.napis, napis_vir: n.vir,
    mediji: poti, objava_ob: objavaOb.toISOString(),
  }).select('id').single()
  if (error) {
    if (error.code === '23505') return false // drug zagon je bil hitrejši
    throw new Error(`objave: ${error.message}`)
  }
  try {
    if (!env.DISCORD_OBJAVE_WEBHOOK) throw new Error('manjka DISCORD_OBJAVE_WEBHOOK')
    const kdaj = new Intl.DateTimeFormat('sl-SI', { timeZone: PAS, dateStyle: 'short', timeStyle: 'short' }).format(objavaOb)
    await vDiscord(env.DISCORD_OBJAVE_WEBHOOK, {
      naslov: `📝 **Osnutek objave #${vrstica.id}** (${d.drzava ?? 'vse države'}, ${jezik}, napis: ${n.vir}) — objava ${kdaj}. Faza 1: nič se ne objavi samo.`,
      napis: n.napis, povzetek: pov, poti,
    })
  } catch (e) {
    // Osnutek, ki ga človek ni videl, se nikoli ne objavi.
    await db.from('objave').update({ stanje: 'napaka', napaka: e.message }).eq('id', vrstica.id)
    throw e
  }
  log(`Objava ${slot} ${teden}: osnutek #${vrstica.id} na Discordu.`)
  return true
}

const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

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
    if (!(slot in TERMINI)) {
      console.error('Uporaba: --slot pon|cet [--drzava SI] [--suho] [--dejstva d.json] [--url …] [--mapa …], ali --zanka')
      process.exit(2)
    }
    const teden = ponedeljek(datumLj(new Date()))
    await osnutek({ db, slot, teden, drzava: arg('--drzava'), dejstva, suho, url, mapa, env })
    return
  }
  log('Objave: zanka teče (vsakih 10 minut).')
  for (;;) {
    for (const t of terminiZdaj(new Date())) {
      try {
        await osnutek({ db, slot: t.slot, teden: t.teden, suho: false, url, mapa, env })
      } catch (e) {
        console.error(`Objava ${t.slot} ${t.teden} ni uspela: ${e.message}`)
      }
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
