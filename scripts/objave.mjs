// Samodejne objave za Instagram in Facebook: osnutek na Discord, nato objava.
// Načrt: docs/superpowers/specs/2026-10-15-samodejne-objave-design.md.
//
// Vse objave so angleške (lastnik, 15. 10. 2026). Termina (ljubljanski čas):
// ponedeljek osnutek 04:00, objava 09:20–11:40 — vrtiljak vseh držav (igralec
// vikenda vsake); četrtek osnutek 12:00, objava 17:10–19:40 — dosežki tedna.
// Mejnik: vsakih 1000 uporabnikov osnutek takoj, objava ~6 ur kasneje v oknu
// 09–20 (± 40 min). Ura objave je naključna (casObjave), veto vsaj 5 ur. Osnutek (dejstva, napis, prosojnice)
// gre v tabelo `objave` in na Discord s povezavo "Ustavi objavo"; ob roku ga
// delavec objavi na Instagram in Facebook (faza 2), če ga nihče ni ustavil in
// so nastavljeni ključi META_*. Brez njih se nič ne objavi (kot faza 1).
//
// 1. dejstva: SQL objava_drzave / objava_dosezki / objava_mejnik_dejstva (servisne) ali --dejstva datoteka.json,
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
//   node scripts/objave.mjs --slot pon                 (en osnutek zdaj)
//   node scripts/objave.mjs --slot mejnik [--suho --dejstva m.json]  (mejnik zdaj, če je dosežen)
//   node scripts/objave.mjs --slot cet --suho --dejstva d.json --url http://localhost:5173 [--mapa /tmp/objave-vzorec]
//     --suho: izpiše dejstva in napis, slike zapiše v --mapa; ne piše v bazo, ne pošlje na Discord
import { fileURLToPath } from 'node:url'
import { resolve, join, relative } from 'node:path'
import { mkdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createHash, randomBytes } from 'node:crypto'

export const MODEL = 'claude-sonnet-5-5'
// Vse objave so angleške; jezik ostane stolpec tabele.
export const JEZIK = 'en'
// Ura osnutka in osnovna ura objave (Ljubljana); `razpon` je naključni odmik
// objave v minutah (ponedeljek 09:20–11:40, četrtek 17:10–19:40), da objave
// niso vsak teden ob isti minuti.
export const TERMINI = {
  pon: { dan: 0, osnutek: 4, objava: 10, razpon: [-40, 100] },
  cet: { dan: 3, osnutek: 12, objava: 18, razpon: [-50, 100] },
}
const PAS = 'Europe/Ljubljana'
// Objava, ki je delavec ni objavil v dveh urah po roku (ni tekel), ostane neobjavljena.
export const OBJAVA_ZAMUDA = 2 * 3600e3
// Mejnik uporabnikov: vsakih KORAK; mejnik, ki je že več kot MEJNIK_ROK za nami, ni več novica.
export const MEJNIK_KORAK = 1000
export const MEJNIK_ROK = 300
// Človek ima za veto vsaj toliko časa med osnutkom na Discordu in objavo.
export const VETO = 5 * 3600e3
// Instagram Graph API sprejme največ 10 slik v vrtiljaku: naslovnica + 8 držav + poziv.
export const NAJVEC_DRZAV = 8
// Četrtek: naslovnica + največ 6 dosežkov + poziv.
export const NAJVEC_DOSEZKOV = 6

// --- čas ----------------------------------------------------------------------

export const dodajDni = (datum, n) => new Date(Date.parse(`${datum}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10)

/** Ljubljanski datum (YYYY-MM-DD) trenutka. */
export const datumLj = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: PAS }).format(d)

/** Ponedeljek tedna, v katerem je datum. */
export function ponedeljek(datum) {
  const dan = new Date(`${datum}T00:00:00Z`).getUTCDay()
  return dodajDni(datum, -((dan + 6) % 7))
}

/** Trenutek, ko je v Ljubljani `datum` ob `ura`:`minuta` (poletni in zimski čas). */
export function vLjubljani(datum, ura, minuta = 0) {
  const kot = Date.parse(`${datum}T${String(ura).padStart(2, '0')}:${String(minuta).padStart(2, '0')}:00Z`)
  const d = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: PAS, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(kot)).map((p) => [p.type, p.value]),
  )
  const lokalno = Date.parse(`${d.year}-${d.month}-${d.day}T${d.hour}:${d.minute}:00Z`)
  return new Date(kot - (lokalno - kot))
}

/** Termin tedna: kdaj osnutek, osnovna ura objave in zadnja možna (z odmikom). */
export function termin(slot, teden) {
  const t = TERMINI[slot]
  const dan = dodajDni(teden, t.dan)
  const objavaOb = vLjubljani(dan, t.objava)
  return { osnutekOb: vLjubljani(dan, t.osnutek), objavaOb, najkasneje: new Date(objavaOb.getTime() + t.razpon[1] * 60e3) }
}

/**
 * Termini, katerih osnutek je zdaj na vrsti: od ure osnutka, dokler do
 * najkasnejše objave ostane VETO. Zamujen termin se ne nadoknadi.
 */
export function terminiZdaj(zdaj) {
  const teden = ponedeljek(datumLj(zdaj))
  return Object.keys(TERMINI)
    .map((slot) => ({ slot, teden, ...termin(slot, teden) }))
    .filter((x) => zdaj >= x.osnutekOb && zdaj.getTime() + VETO <= x.najkasneje.getTime())
}

/**
 * Čas objave, kot bi ga izbral človek: osnova + naključni odmik iz razpona
 * (minute, ne večkratnik 5), ne prej kot VETO po osnutku, v oknu
 * 08:30–21:29 Ljubljana. `rng` vrne [0, 1) (preizkus ga poda).
 */
export function casObjave(osnova, [od, doo], zdaj, rng = Math.random) {
  const min = 60e3
  let t = Math.round((osnova.getTime() + (od + rng() * (doo - od)) * min) / min) * min
  t = Math.max(t, Math.ceil((zdaj.getTime() + VETO) / min) * min)
  const dan = datumLj(new Date(t))
  t = Math.min(Math.max(t, vLjubljani(dan, 8, 30).getTime()), vLjubljani(dan, 21, 29).getTime())
  if (new Date(t).getUTCMinutes() % 5 === 0) t += min
  return new Date(t)
}

/** Okno tekem [od, do): ponedeljek prejšnji teden, četrtek zadnjih sedem dni. */
export const okno = (slot, teden) =>
  slot === 'pon' ? { od: dodajDni(teden, -7), do: teden } : { od: dodajDni(teden, -4), do: dodajDni(teden, 3) }

/** Obdobje okna za prosojnice in napis: "5–11 Oct 2026". */
export const obdobje = (od, doo) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .formatRange(new Date(`${od}T00:00:00Z`), new Date(`${dodajDni(doo, -1)}T00:00:00Z`))

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

/** Osnova objave mejnika: 6 ur po osnutku, premaknjena naprej v okno 09:00–20:00 (Ljubljana). */
export function objavaMejnika(zdaj) {
  const ob = new Date(zdaj.getTime() + 6 * 3600e3)
  const dan = datumLj(ob)
  const ura = Number(new Intl.DateTimeFormat('en-GB', { timeZone: PAS, hour: '2-digit', hourCycle: 'h23' }).format(ob))
  if (ura < 9) return vLjubljani(dan, 9)
  if (ura >= 20) return vLjubljani(dodajDni(dan, 1), 9)
  return ob
}

/** Vsebina mejnika (prosojnice berejo `mejnik`). */
export const vsebinaMejnika = (d, mejnik) => ({
  slot: 'mejnik', mejnik: { mejnik, uporabnikov: d.uporabnikov, drzav: d.drzav, lig: d.lig, ekip: d.ekip },
})

// --- vsebina ------------------------------------------------------------------

/** "Priimek Ime" → "Ime Priimek" (kot prikazniIme v src/lib/pomozno.ts). */
export const prikaz = (ime) => {
  const d = String(ime ?? '').trim().split(/\s+/)
  return d.length < 2 ? String(ime ?? '') : `${d.slice(1).join(' ')} ${d[0]}`
}

/** Angleško ime države (SI → Slovenia). */
export const imeDrzave = (koda) => (koda ? new Intl.DisplayNames(['en'], { type: 'region' }).of(koda) : undefined)

/** Zastava iz kode države (SI → 🇸🇮). */
export const zastava = (koda) => String.fromCodePoint(...[...String(koda).toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))

const stevilo = (x) => Number(x ?? 0)

/**
 * Ponedeljek: vrtiljak držav iz objava_drzave (SQL je že izločil države brez
 * novice in jih uredil po uporabnikih). Vrne null, če ni nobene.
 */
export function vsebinaDrzav(d) {
  const drzave = (d.drzave ?? []).filter((x) => x.igralci?.length).slice(0, NAJVEC_DRZAV).map((x) => {
    const [prvi, ...ostali] = x.igralci
    return {
      koda: x.drzava, ime: imeDrzave(x.drzava), zastava: zastava(x.drzava),
      igralec: { ...prvi, tocke: stevilo(prvi.tocke), goli: stevilo(prvi.goli) },
      drugi: ostali.map((o) => ({ ime: o.ime, klub: o.klub, tocke: stevilo(o.tocke) })),
    }
  })
  return drzave.length ? { slot: 'pon', obdobje: obdobje(d.od, d.do), drzave } : null
}

// Vrstni red kategorij dosežkov (prvi so najboljše zgodbe); igralec le enkrat.
const KATEGORIJE = [
  ['hattrick', 'hattrick', 2], ['najvec_tock', 'najvec', 1], ['rekord_lige', 'rekord', 1],
  ['vratar_gol', 'vratar', 1], ['cista_mreza', 'cistaMreza', 1], ['skok', 'skok', 1],
]

/**
 * Četrtek: dosežki tedna iz objava_dosezki. Igralci najprej (vsak enkrat),
 * nato skupnost (anonimno). Brez dosežka igralca ni objave (null).
 */
export function vsebinaDosezkov(d) {
  const skupnost = []
  if (d.manager_tedna?.tocke > 0) {
    skupnost.push({ vrsta: 'manager', tocke: stevilo(d.manager_tedna.tocke), drzava: imeDrzave(d.manager_tedna.drzava), zastava: zastava(d.manager_tedna.drzava) })
  }
  if (d.novih_upraviteljev > 0) skupnost.push({ vrsta: 'novi', stevilo: stevilo(d.novih_upraviteljev), uporabnikov: stevilo(d.uporabnikov) })
  const videni = new Set()
  const igralci = []
  for (const [kljuc, vrsta, koliko] of KATEGORIJE) {
    for (const x of (d[kljuc] ?? []).filter((x) => !videni.has(`${x.ime}|${x.klub}`)).slice(0, koliko)) {
      videni.add(`${x.ime}|${x.klub}`)
      const o = { vrsta, ...x, drzava: imeDrzave(x.drzava), zastava: zastava(x.drzava) }
      for (const k of ['tocke', 'goli', 'prej', 'staro', 'novo', 'niz', 'krog']) if (k in o) o[k] = stevilo(o[k])
      igralci.push(o)
    }
  }
  if (!igralci.length) return null
  const dosezki = [...igralci.slice(0, NAJVEC_DOSEZKOV - Math.min(skupnost.length, 2)), ...skupnost].slice(0, NAJVEC_DOSEZKOV)
  return { slot: 'cet', obdobje: obdobje(d.od, d.do), dosezki }
}

export const povezava = () => 'https://slff.eu/?src=ig'

// Naslovi dosežkov v napisu in predlogi (prosojnice imajo svoje v slovarju).
const NASLOV = {
  hattrick: 'Hat-trick hero', najvec: 'Top score of the week', rekord: 'League record', vratar: 'Keeper on the scoresheet',
  cistaMreza: 'Clean-sheet streak', skok: 'Price rise', manager: 'Manager of the week', novi: 'New managers',
}

/** Kar dobi Claude: imena v prikazni obliki, brez grbov in id-jev. */
export function dejstvaZaNapis(v) {
  if (v.mejnik) {
    const m = v.mejnik
    return { milestone_users: m.mejnik, users_now: m.uporabnikov, countries: m.drzav, active_leagues: m.lig, fantasy_teams: m.ekip }
  }
  if (v.drzave) {
    return {
      weekend: v.obdobje,
      countries: v.drzave.map((x) => ({
        country: x.ime, flag: x.zastava,
        player_of_the_round: { name: prikaz(x.igralec.ime), club: x.igralec.klub, league: x.igralec.liga, round: x.igralec.krog, points: x.igralec.tocke, goals: x.igralec.goli },
        runners_up: x.drugi.map((o) => ({ name: prikaz(o.ime), club: o.klub, points: o.tocke })),
      })),
    }
  }
  return {
    week: v.obdobje,
    achievements: v.dosezki.map((x) => {
      const o = { achievement: NASLOV[x.vrsta] }
      if (x.ime) Object.assign(o, { name: prikaz(x.ime), club: x.klub, league: x.liga })
      if (x.drzava) Object.assign(o, { country: x.drzava, flag: x.zastava })
      const polja = { goli: 'goals', tocke: 'points', krog: 'round', prej: 'previous_record', staro: 'old_price', novo: 'new_price', niz: 'clean_sheets_in_a_row', stevilo: 'new_managers', uporabnikov: 'managers_total' }
      for (const [k, en] of Object.entries(polja)) if (x[k] !== undefined) o[en] = x[k]
      if (x.vrsta === 'manager') o.note = 'anonymous fantasy manager, never named'
      return o
    }),
  }
}

// --- preverba napisa ------------------------------------------------------------

// Angleško: "4,000" je tisoč (vejica loči tisočice), "8.2" decimalka.
const STEVILO = /\d{1,3}(?:,\d{3})+(?!\d)|\d+(?:\.\d+)?/g
const normaliziraj = (s) => String(Number(s.replace(/,/g, '')))
// Besede z veliko začetnico, ki niso imena iz dejstev, a so v (angleškem) napisu dovoljene.
const DOVOLJENE = ['SLFF', 'XI', 'Ideal', 'Fantasy', 'Instagram', 'Facebook', 'Europe', 'MVP', 'GOAT', 'OK', 'Round', 'Player', 'League',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Thank', 'Thanks',
  'Weekend', 'Week', 'Achievements', 'Pick']

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

const goli = (n) => `${n} ${n === 1 ? 'goal' : 'goals'}`
const tock = (n) => `${n} ${n === 1 ? 'point' : 'points'}`
const cenaEn = (x) => `€${x}M`

/** Vrednost dosežka v predlogi napisa (angleško). */
export function vrednostDosezka(x) {
  switch (x.vrsta) {
    case 'hattrick':
    case 'vratar': return goli(x.goli)
    case 'najvec': return tock(x.tocke)
    case 'rekord': return `${tock(x.tocke)}, previous record ${x.prej}`
    case 'cistaMreza': return `${x.niz} clean sheets in a row`
    case 'skok': return `${cenaEn(x.staro)} → ${cenaEn(x.novo)}`
    case 'manager': return `a manager in ${x.drzava} scored ${tock(x.tocke)}`
    case 'novi': return `${x.stevilo} new managers joined, ${x.uporabnikov.toLocaleString('en-GB')} in total`
  }
}

/** Napis brez Clauda: suha dejstva, vedno pravilna. */
export function predlogaNapisa(v) {
  const vrstice = []
  if (v.mejnik) {
    const m = v.mejnik
    vrstice.push(`🎉 ${m.mejnik.toLocaleString('en-GB')} managers on SLFF! Thank you all.`,
      `⚽ ${m.lig} leagues in ${m.drzav} countries, ${m.ekip.toLocaleString('en-GB')} fantasy teams.`,
      '', `👉 Build your team: ${povezava(v)}`)
  } else if (v.drzave) {
    vrstice.push(`⚽ Weekend in Europe's Sunday leagues, ${v.obdobje}`, '')
    for (const x of v.drzave) vrstice.push(`${x.zastava} ${x.ime}: ${prikaz(x.igralec.ime)} (${x.igralec.klub}), ${tock(x.igralec.tocke)}`)
    vrstice.push('', `👉 Pick your Sunday XI: ${povezava(v)}`)
  } else {
    vrstice.push(`🏆 Achievements of the week, ${v.obdobje}`, '')
    for (const x of v.dosezki) {
      vrstice.push(`${x.zastava ?? '⭐'} ${NASLOV[x.vrsta]}: ${x.ime ? `${prikaz(x.ime)} (${x.klub}), ` : ''}${vrednostDosezka(x)}`)
    }
    vrstice.push('', `👉 Pick your Sunday XI: ${povezava(v)}`)
  }
  vrstice.push('', '#SLFF #fantasyfootball #football')
  return vrstice.join('\n')
}

export function sistemskiPoziv(link, slot) {
  const vsebina = {
    mejnik: 'This post celebrates SLFF reaching milestone_users users. Thank the community warmly; you may mention the countries, active leagues and fantasy teams counts. Write numbers from 1,000 up with a thousands comma (4,000). At most 6 short lines plus hashtags.',
    pon: "The facts are last weekend's top players in Europe's Sunday leagues, one entry per country. Write one short opener line, then exactly one line per country in the given order: its flag, the country name and its player of the round with points. Nothing else per country.",
    cet: 'The facts are the achievements of the week. Write one short opener line, then one short line per achievement in the given order. A fantasy manager is always anonymous: say "a manager in <country>", never a name.',
  }[slot]
  return [
    'You write Instagram/Facebook captions for SLFF, a free fantasy football game for amateur and regional leagues (slff.eu).',
    'Write in English. Tone: goofy, warm, a bit cheeky, Sunday-league humour, never mean to a player. Keep every line short.',
    vsebina,
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
        let besedilo = await klic(kljuc, sistemskiPoziv(link, v.slot), `Facts (JSON):\n${JSON.stringify(dejstva, null, 2)}`)
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
  const vr = [v.obdobje]
  if (v.drzave) {
    for (const x of v.drzave) {
      const i = x.igralec
      vr.push(`${x.koda}: ${prikaz(i.ime)} (${i.klub}, ${i.liga}, ${i.krog}. krog) ${i.tocke} t, ${i.goli} gol.; `
        + x.drugi.map((o) => `${prikaz(o.ime)} ${o.tocke}`).join(', '))
    }
  } else {
    for (const x of v.dosezki) vr.push(`${x.vrsta}: ${x.ime ? `${prikaz(x.ime)} (${x.klub}, ${x.liga}) ` : ''}${vrednostDosezka(x)}`)
  }
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

/** Dejstva termina: ponedeljek po državah (objava_drzave), četrtek dosežki (objava_dosezki). */
async function dejstvaTermina(db, slot, teden) {
  const { od, do: doo } = okno(slot, teden)
  const fn = slot === 'pon' ? 'objava_drzave' : 'objava_dosezki'
  const { data, error } = await db.rpc(fn, { p_od: od, p_do: doo })
  if (error) throw new Error(`${fn}: ${error.message}`)
  return data
}

/** Vsebina termina iz dejstev; null, ko ni novice. */
export const vsebinaTermina = (d, slot) => (slot === 'pon' ? vsebinaDrzav(d) : vsebinaDosezkov(d))

const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

const log = (s) => console.log(`${new Date().toISOString()} ${s}`)

/** Izdela osnutek termina (pon, cet) ali mejnika. Vrne true, če je nastal (ali bi v --suho). */
export async function osnutek({ db, slot, teden, dejstva, suho, url, mapa, env, zdaj = new Date() }) {
  const obstaja = async (stolpec, vrednost) => {
    if (suho) return false
    const { data, error } = await db.from('objave').select('id').eq('slot', slot).eq(stolpec, vrednost).maybeSingle()
    if (error) throw new Error(`objave: ${error.message}`)
    return Boolean(data)
  }
  let d, v, osnova, razpon, mejnik = null
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
    osnova = objavaMejnika(zdaj)
    razpon = [-40, 40]
  } else {
    if (await obstaja('teden', teden)) return false
    d = dejstva ?? (await dejstvaTermina(db, slot, teden))
    v = d && vsebinaTermina(d, slot)
    if (!v) {
      log(`Objava ${slot} ${teden}: ni kroga, osnutka ni.`)
      return false
    }
    osnova = termin(slot, teden).objavaOb
    razpon = TERMINI[slot].razpon
  }
  const jezik = JEZIK
  const oznaka = mejnik ? `mejnik ${mejnik}` : slot === 'pon' ? 'države' : 'dosežki tedna'
  const n = await napis(v, env.ANTHROPIC_API_KEY)
  // Naključni del: slike so javne (/objave-mediji/), osnutek pa naj se ne da uganiti.
  const pot = join(mapa, `${teden}-${slot}-${randomBytes(6).toString('hex')}`)
  const poti = await posnemi(v, url, pot)
  const pov = povzetek(v)
  // Čas objave šele zdaj (po napisu in slikah), da veto res traja VETO.
  const objavaOb = casObjave(osnova, razpon, new Date(Math.max(zdaj.getTime(), Date.now())))
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
    slot, teden, mejnik, drzava: null, jezik, liga: null, dejstva: d, napis: n.napis, napis_vir: n.vir,
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
      console.error('Uporaba: --slot pon|cet|mejnik [--suho] [--dejstva d.json] [--url …] [--mapa …], ali --zanka')
      process.exit(2)
    }
    const teden = ponedeljek(datumLj(new Date()))
    await osnutek({ db, slot, teden, dejstva, suho, url, mapa, env })
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
