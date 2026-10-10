// Preizkus strežnika HTML brez omrežja in baze: lažen PostgREST, prava
// predloga v začasni mapi. `npm run preizkus-html`.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { esc, izrisi, obdelovalec, prevajalnik, stran } from './streznik.mjs'

const PREDLOGA = `<!doctype html>
<html lang="sl">
  <head>
    <title>SLFF — Sunday League Fantasy Football</title>
    <meta name="description" content="star opis" />
    <meta property="og:title" content="SLFF" />
    <meta property="og:description" content="star og" />
    <meta property="og:url" content="https://slff.eu/" />
    <meta name="twitter:title" content="SLFF" />
    <meta name="twitter:description" content="star tw" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
const SK = PREDLOGA.replace('lang="sl"', 'lang="sk"').replace('star og', 'kartica sk')
const BESEDE = {
  sl: {
    'aplikacija.naslovStrani.osnova': 'SLFF — Sunday League Fantasy Football',
    'aplikacija.naslovStrani.zStranjo': '{naslov} · SLFF',
    'aplikacija.naslovStrani.deljenjeKratko': 'Točke iz zapisnikov.',
    'aplikacija.naslovStrani.ligeDrzave': 'Fantasy lige — {drzava}: {lige}.',
    'lestvice.lestvica.naslov': 'Fantasy lestvica',
    'skupno.besede': {
      tocke: { one: 'točka', two: 'točki', few: 'točke', other: 'točk' },
      tekme: { one: 'tekma', two: 'tekmi', few: 'tekme', other: 'tekem' },
      goli: { one: 'gol', two: 'gola', few: 'goli', other: 'golov' },
      igralci: { one: 'igralec', two: 'igralca', few: 'igralci', other: 'igralcev' },
    },
    'skupno.pozicija': { GK: 'Vratar', FWD: 'Napadalec' },
    'tekme.tabela.naslov': 'Lestvica',
    'tekme.tabela.zavihek': '{liga} · lestvica',
    'tekme.tabela.uvod': 'Lestvica sezone {sezona} iz zapisnikov {zveza}.',
    'tekme.tabela.stolpci': { klub: 'Klub', tekme: 'T', zmage: 'Z', remiji: 'N', porazi: 'P', goli: 'Goli', tocke: 'Točke' },
    'tekme.tabela.strelci': 'Strelci',
    'tekme.rezultati.naslov': 'Rezultati',
    'igralci.profil.naslov': 'Igralec',
  },
  sk: { 'aplikacija.naslovStrani.zStranjo': '{naslov} · SLFF', 'aplikacija.naslovStrani.ligeDrzave': 'Fantasy ligy — {drzava}: {lige}.', 'skupno.besede': { tocke: { one: 'bod', few: 'body', many: 'bodu', other: 'bodov' } } },
}
const LIGE = [
  { id: 1, slug: 'clani', name: '1. GNL', active: true, country_code: 'SI', country_name: 'Slovenija', federation_name: 'MNZ Gorenjska' },
  { id: 2, slug: 'sk-za-1', name: 'I. trieda <Žilina>', active: true, country_code: 'SK', country_name: 'Slovensko' },
  { id: 4, slug: 'mladinci', name: 'Mladinci', active: true, country_code: 'SI', country_name: 'Slovenija', federation_name: 'MNZ Gorenjska' },
  { id: 5, slug: 'lj-2-liga', name: 'LJ 1', active: true, country_code: 'SI', country_name: 'Slovenija', federation_name: 'MNZ Ljubljana' },
  { id: 6, slug: 'cz-x', name: 'CZ', active: false, country_code: 'CZ', country_name: 'Česko' },
]

// Lažen PostgREST: pot -> vrstice.
const PODATKI = {
  'player_overview?id=eq.7': [{ id: 7, full_name: 'Novak "Janez" <b>', position: 'FWD', team_id: 3, team_name: 'Šenčur & Co', competition_id: 1 }],
  'player_overview?id=eq.8': [{ id: 8, full_name: 'Kováč Peter', position: null, team_id: 4, team_name: 'Rajec', competition_id: 2 }],
  'player_overview?id=eq.9': [],
  'sezone?competition_id=eq.1': [{ season: '2026/27' }],
  'sezone?competition_id=eq.2': [{ season: '2026/27' }],
  'player_season_standings?id=eq.7': [{ points: 21, matches: 5, goals: 3, minutes: 410 }],
  'player_season_standings?id=eq.8': [{ points: 1, matches: 1, goals: 0, minutes: 90 }],
  'match_assist_status?match_id=eq.5': [{ match_id: 5, season: '2026/27', played_on: '2026-09-13', home_name: 'Šenčur', away_name: 'Bled', home_goals: 2, away_goals: 1, home_team_id: 3, away_team_id: 6, competition_id: 1 }],
  'goals?match_id=eq.5': [{ minute: 12, team_id: 3, scorer: { full_name: 'Novak Janez' } }],
  'match_assist_status?competition_id=eq.1': [{ match_id: 5, season: '2026/27', played_on: '2026-09-13', home_name: 'Šenčur', away_name: 'Bled', home_goals: 2, away_goals: 1 }],
  'fantasy_team_standings?competition_id=eq.1': [{ fantasy_team_id: 11, team_name: 'FC Luka', total_points: 40 }],
  'rpc/lestvica_lige': [{ mesto: 1, team_id: 3, ime: 'Šenčur', tekme: 5, zmage: 4, remiji: 1, porazi: 0, dani: 12, prejeti: 3, tocke: 13, sezona: '2026/27' }],
}
const rest = async (pot) => {
  const kljuc = Object.keys(PODATKI).find((k) => pot === k || pot.startsWith(k + '&'))
  if (!kljuc) throw new Error(`neznana poizvedba ${pot}`)
  return PODATKI[kljuc]
}
const vzemi = (html, re) => re.exec(html)?.[1]
const jsonld = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
const izris = async (pot, t) => {
  const s = await stran(pot, t, { rest, lige: LIGE, besede: BESEDE })
  return { s, html: izrisi(PREDLOGA, s, prevajalnik(BESEDE, 'sl')) }
}

// Igralec: naslov, kanonični brez ?t= za privzeto ligo, ubežana imena, JSON-LD.
{
  const { s, html } = await izris('/player/7', null)
  assert.equal(s.status, 200)
  assert.equal(vzemi(html, /<title>(.*?)<\/title>/), '&quot;Janez&quot; &lt;b&gt; Novak (Šenčur &amp; Co) · SLFF')
  assert.equal(vzemi(html, /<link rel="canonical" href="(.*?)"/), 'https://slff.eu/player/7')
  assert.equal(vzemi(html, /og:url" content="(.*?)"/), 'https://slff.eu/player/7')
  assert.match(vzemi(html, /name="description" content="(.*?)"/), /Napadalec, Šenčur &amp; Co, 1. GNL\. 2026\/27: 5 tekem · 3 goli · 21 točk\./)
  assert.ok(!html.includes('<b>'), 'ime ni ubežano')
  const [oseba, drobtine] = jsonld(html)
  assert.equal(oseba['@type'], 'Person')
  assert.equal(oseba.memberOf['@type'], 'SportsTeam')
  assert.equal(oseba.memberOf.url, 'https://slff.eu/club/3?t=clani')
  assert.deepEqual(drobtine.itemListElement.map((d) => d.name), ['Slovenija', '1. GNL', 'Šenčur & Co', '"Janez" <b> Novak'])
  assert.ok(!/<\/script>.*<\/script>/s.test(html.match(/ld\+json">(.*?)<\/script>/)[1]), '< v JSON-LD ni ubežan')
  assert.match(html, /<div id="root"><main[^>]*><h1>/)
  assert.match(html, /href="\/club\/3\?t=clani"/)
}

// Slovaški igralec: kanonični z ?t=, slovaška množina.
{
  const s = await stran('/player/8', null, { rest, lige: LIGE, besede: BESEDE })
  assert.equal(s.liga.country_code, 'SK')
  assert.equal(s.kanonicni, 'https://slff.eu/player/8?t=sk-za-1')
  assert.match(s.opis, /1 bod\./)
}

// Neznan igralec in neštevilski id: 404 z noindex, brez kanoničnega.
for (const pot of ['/player/9', '/player/abc']) {
  const { s, html } = await izris(pot, null)
  assert.equal(s.status, 404, pot)
  assert.match(html, /<meta name="robots" content="noindex" \/>/)
  assert.ok(!html.includes('rel="canonical"'))
  assert.equal(vzemi(html, /<title>(.*?)<\/title>/), 'Igralec · SLFF')
}

// Tekma: SportsEvent z ekipama, datumom in izidom.
{
  const { html } = await izris('/match/5', null)
  const [dogodek] = jsonld(html)
  assert.equal(dogodek['@type'], 'SportsEvent')
  assert.equal(dogodek.startDate, '2026-09-13')
  assert.equal(dogodek.homeTeam.name, 'Šenčur')
  assert.equal(dogodek.awayTeam.url, 'https://slff.eu/club/6')
  assert.equal(dogodek.description, 'Šenčur 2 : 1 Bled')
  assert.deepEqual(dogodek.location, { '@type': 'Place', name: 'Šenčur' })
  assert.equal(dogodek.eventStatus, 'https://schema.org/EventScheduled')
  assert.match(html, /Strelci: Janez Novak 12&#39;/)
}

// Lestvica: vmesnik ?t=clani iz naslova zbriše, zato ga kanonični nima; druga liga ga ima.
{
  const { s, html } = await izris('/table', 'clani')
  assert.equal(s.kanonicni, 'https://slff.eu/table')
  assert.equal((await stran('/table', 'sk-za-1', { rest, lige: LIGE, besede: BESEDE })).kanonicni, 'https://slff.eu/table?t=sk-za-1')
  // Neaktivna liga: vmesnik pokaže privzeto in ?t= zbriše.
  const lige = [...LIGE, { id: 3, slug: 'lj-1-liga', name: 'LJ', active: false, country_code: 'SI', country_name: 'Slovenija' }]
  assert.equal((await stran('/table', 'lj-1-liga', { rest, lige, besede: BESEDE })).kanonicni, 'https://slff.eu/table')
  assert.equal(vzemi(html, /<title>(.*?)<\/title>/), '1. GNL (Slovenija) · lestvica · SLFF')
  // Poševnica na koncu: ista stran, kanonični brez nje.
  assert.equal((await stran('/table/', null, { rest, lige: LIGE, besede: BESEDE })).kanonicni, 'https://slff.eu/table')
  assert.match(html, /<td><a href="\/club\/3\?t=clani">Šenčur<\/a><\/td>/)
  assert.match(s.opis, /MNZ Gorenjska\. 1\. Šenčur \(13\)\./)
  // Neznana liga: privzeta, kanonični brez ?t=.
  const neznana = await stran('/table', 'ni-lige', { rest, lige: LIGE, besede: BESEDE })
  assert.equal(neznana.kanonicni, 'https://slff.eu/table')
}

// Rezultati in fantasy lestvica: opis po ligi, naslov z državo.
{
  const r = await stran('/results', null, { rest, lige: LIGE, besede: BESEDE })
  assert.equal(r.naslov, '1. GNL (Slovenija) · Rezultati')
  assert.equal(r.opis, 'Rezultati — 1. GNL (MNZ Gorenjska), 2026/27: Šenčur 2 : 1 Bled.')
  const l = await stran('/standings', null, { rest, lige: LIGE, besede: BESEDE })
  assert.equal(l.opis, 'Fantasy lestvica — 1. GNL (MNZ Gorenjska): 1. FC Luka (40 točk).')
}

// Domov: opis po ligi, povezave privzete lige brez ?t=, vstopne strani držav.
{
  const { s, html } = await izris('/', null)
  assert.equal(s.naslov, null)
  assert.equal(s.opis, '1. GNL (Slovenija) — MNZ Gorenjska. Točke iz zapisnikov. 2026/27: 1. Šenčur (13).')
  assert.match(html, /href="\/table">/)
  assert.ok(!html.includes('?t=clani'), 'privzeta liga brez ?t=')
  assert.match(html, /href="\/si">Slovenija<\/a>.*href="\/sk">Slovensko<\/a>/)
  assert.ok(!html.includes('href="/cz"'), 'država brez aktivne lige')
  const sk = await stran('/', 'sk-za-1', { rest, lige: LIGE, besede: BESEDE })
  assert.equal(sk.naslov, 'I. trieda <Žilina> (Slovensko)')
  assert.match(sk.vsebina, /href="\/table\?t=sk-za-1"/)
}

// Vstopna stran države: lige po zvezah, kanonični nase, kartica države ostane.
{
  const { s, html } = await izris('/si', null)
  assert.equal(s.kanonicni, 'https://slff.eu/si')
  assert.equal(vzemi(html, /<title>(.*?)<\/title>/), 'Slovenija · SLFF')
  assert.equal(s.opis, 'Fantasy lige — Slovenija: 1. GNL, Mladinci, LJ 1.')
  assert.match(html, /<h2>MNZ Gorenjska<\/h2><ul><li><a href="\/">1\. GNL<\/a> · <a href="\/table">Lestvica<\/a><\/li><li><a href="\/\?t=mladinci">Mladinci<\/a>/)
  assert.match(html, /<h2>MNZ Ljubljana<\/h2><ul><li><a href="\/\?t=lj-2-liga">LJ 1<\/a> · <a href="\/table\?t=lj-2-liga">/)
  assert.equal(vzemi(html, /og:description" content="(.*?)"/), 'star og', 'og: opis ostane s kartice')
  assert.equal(await stran('/cz', null, { rest, lige: LIGE, besede: BESEDE }), null, 'brez aktivne lige')
  assert.equal(await stran('/xx', null, { rest, lige: LIGE, besede: BESEDE }), null)
  // Drobtina 1 kaže na vstopno stran države.
  const igr = await stran('/player/8', null, { rest, lige: LIGE, besede: BESEDE })
  assert.equal(igr.jsonld[1].itemListElement[0].item, 'https://slff.eu/sk')
}

// Neznana pot: predloga ostane nespremenjena.
assert.equal(await stran('/my-team', null, { rest, lige: LIGE, besede: BESEDE }), null)
assert.equal(izrisi(PREDLOGA, null, prevajalnik(BESEDE, 'sl')), PREDLOGA)
assert.equal(esc(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;')

// Obdelovalec: kartica države, predpomnilnik, varovalo ob napaki PostgREST.
{
  const koren = mkdtempSync(join(tmpdir(), 'slff-html-'))
  writeFileSync(join(koren, 'index.html'), PREDLOGA)
  writeFileSync(join(koren, 'sk.html'), SK)
  writeFileSync(join(koren, 'html-besede.json'), JSON.stringify(BESEDE))
  let klicev = 0
  let pokvarjen = false
  const prek = async (pot) => {
    klicev++
    if (pokvarjen) throw new Error('PostgREST dol')
    if (pot.startsWith('competitions_view')) return LIGE
    return rest(pot)
  }
  const obdelaj = obdelovalec({ koren, rest: prek })
  const zahtevaj = async (url, method = 'GET') => {
    let status, glave, telo
    await obdelaj({ url, method }, { writeHead: (s, g) => ((status = s), (glave = g)), end: (b) => (telo = b) })
    return { status, glave, telo }
  }
  const sk = await zahtevaj('/player/8')
  assert.equal(sk.status, 200)
  assert.match(sk.telo, /<html lang="sk">/, 'slovaški igralec dobi sk.html')
  assert.equal(sk.glave['Cache-Control'], 'public, max-age=300, s-maxage=3600')
  const hub = await zahtevaj('/sk')
  assert.match(hub.telo, /<html lang="sk">/, '/sk dobi sk.html')
  assert.match(hub.telo, /<title>Slovensko · SLFF<\/title>/)
  assert.match(hub.telo, /og:description" content="kartica sk"/)
  assert.match(hub.telo, /name="description" content="Fantasy ligy — Slovensko: I\. trieda &lt;Žilina&gt;\."/)
  const prej = klicev
  await zahtevaj('/player/8?utm_source=x')
  assert.equal(klicev, prej, 'drugi zahtevek ne gre v PostgREST')
  // Naključen ?t= na strani igralca ne obide predpomnilnika.
  await zahtevaj('/player/8?t=xyz123')
  assert.equal(klicev, prej, '?t= igralca ni v ključu')
  const ni = await zahtevaj('/player/9', 'HEAD')
  assert.equal(ni.status, 404)
  assert.equal(ni.telo, undefined, 'HEAD brez telesa')
  // Ponovna objava istega commita v isto mapo: nova predloga, prazen predpomnilnik.
  await zahtevaj('/')
  writeFileSync(join(koren, 'index.html'), PREDLOGA.replace('</head>', '<meta name="nova-objava"></head>'))
  utimesSync(join(koren, 'index.html'), new Date(), new Date(Date.now() + 5000))
  assert.match((await zahtevaj('/')).telo, /nova-objava/, 'nova predloga v isti mapi')
  writeFileSync(join(koren, 'index.html'), PREDLOGA)
  pokvarjen = true
  const varovalo = await zahtevaj('/match/5?t=sk-za-1')
  assert.equal(varovalo.status, 200)
  assert.equal(varovalo.telo, SK, 'ob napaki nespremenjena kartica države')
  assert.equal(varovalo.glave['X-Slff-Html'], 'varovalo')
  assert.equal(varovalo.glave['Cache-Control'], 'public, max-age=0, must-revalidate')
  // Predloge ni več (mapa objave izginila): zadnja prebrana, 200.
  const brez = obdelovalec({ koren, rest: prek })
  await (async () => { let st; await brez({ url: '/', method: 'GET' }, { writeHead: (x) => (st = x), end: () => {} }); assert.equal(st, 200) })()
  // Varovalo vstopa države (/sk/): kartica države, kot Caddy.
  await (async () => { let telo; await brez({ url: '/sk/', method: 'GET' }, { writeHead: () => {}, end: (x) => (telo = x) }); assert.equal(telo, SK) })()
  rmSync(koren, { recursive: true })
  const izgubljena = { status: 0, telo: '' }
  await brez({ url: '/table', method: 'GET' }, { writeHead: (x) => (izgubljena.status = x), end: (b) => (izgubljena.telo = b) })
  assert.equal(izgubljena.status, 200)
  assert.equal(izgubljena.telo, PREDLOGA)
  mkdirSync(koren)
  writeFileSync(join(koren, 'index.html'), PREDLOGA)
  // Počasen PostgREST: rok odreže, varovalo.
  const pocasen = obdelovalec({ koren, rok: 50, rest: (p, b, signal) => new Promise((_, ne) => signal.addEventListener('abort', () => ne(signal.reason))) })
  let status, telo
  // AbortSignal.timeout ne drži zanke dogodkov (v strežniku jo drži vtičnica).
  const zivo = setInterval(() => {}, 1000)
  await pocasen({ url: '/table', method: 'GET' }, { writeHead: (s) => (status = s), end: (b) => (telo = b) })
  assert.equal(status, 200)
  clearInterval(zivo)
  assert.equal(telo, PREDLOGA)
}

console.log('preizkus strežnika HTML: vse v redu')
