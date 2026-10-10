// Strežnik HTML za iskalnike in kartice ob deljenju (slff.eu na VM).
//
// SPA vsakemu naslovu vrne isti prazen index.html; naslov, opis, kanonični
// naslov in vsebina nastanejo šele v brskalniku. Ta strežnik za strani
// igralca, kluba, tekme in lige vzame zgrajeno predlogo iz /srv/slff/current
// (index.html ali kartico države lige, sk.html …), prebere podatke iz
// PostgREST z javnim anon ključem in v predlogo vpiše <title>, opis, og:,
// kanonični naslov, JSON-LD in kratek povzetek v <div id="root">, ki ga React
// ob zagonu zamenja (createRoot, brez hidracije). Reacta ne izriše.
//
// Varovalo: karkoli gre narobe (PostgREST počasen ali dol, napaka v kodi),
// strežnik vrne nespremenjeno predlogo s 200 — stran ni nikoli slabša kot
// brez njega. Če strežnik sam ne teče, Caddy postreže statično datoteko.
//
//   node scripts/hetzner/html/streznik.mjs          # PORT, KOREN, SUPABASE_URL, SUPABASE_ANON_KEY
//
// Brez odvisnosti (Node 22). Preizkus: scripts/hetzner/html/preizkus.mjs.
import { createServer } from 'node:http'
import { readFileSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DOMENA = 'https://slff.eu'
const PRIVZETO = 'clani'
// Kot JEZIK_DRZAVE v src/lib/drzavaUgib.ts in LOKALE v src/i18n/jedro.ts.
const JEZIK = { SI: 'sl', SK: 'sk', HR: 'hr', CZ: 'cs', HU: 'hu', AT: 'de', RS: 'sr', RO: 'ro' }
const LOKALE = { sl: 'sl-SI', sk: 'sk-SK', hr: 'hr-HR', cs: 'cs-CZ', hu: 'hu-HU', de: 'de-AT', sr: 'sr-Latn-RS', ro: 'ro-RO' }
// Kartice držav, ki jih zapiše vite.config.js (karticeDrzav); Slovenija je index.html.
const KARTICE = ['sk', 'hr', 'cz', 'hu', 'at', 'rs', 'ro']

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
// JSON v <script>: "</script>" v imenu ne sme zapreti oznake.
const jsonLd = (o) => JSON.stringify(o).replace(/</g, '\\u003c')
// "Priimek Ime" -> "Ime Priimek", kot prikazniIme v src/lib/pomozno.ts.
const prikazniIme = (polno) => {
  const deli = String(polno ?? '').trim().split(/\s+/)
  return deli.length < 2 ? String(polno ?? '') : deli.slice(1).join(' ') + ' ' + deli[0]
}
const absolutno = (url) => (!url ? undefined : /^https?:/.test(url) ? url : DOMENA + url)

/** Datoteka predloge za državo (koda države ali predpona šifre lige). */
export const predlogaZa = (koda) => (KARTICE.includes(String(koda).toLowerCase()) ? `${String(koda).toLowerCase()}.html` : 'index.html')
/** Kot Caddy: kartica po predponi `?t=sk-…`, sicer index.html. */
const predlogaPoT = (t) => predlogaZa(/^([a-z]{2})-/.exec(t ?? '')?.[1] ?? '')

/** `t(ključ, parametri)` nad dist/html-besede.json; kar manjka, pride iz slovenščine. */
export function prevajalnik(besede, jezik) {
  const lokale = LOKALE[jezik] ?? 'sl-SI'
  const vzemi = (slovar, k) => {
    if (!slovar) return undefined
    if (k in slovar) return slovar[k]
    const i = k.lastIndexOf('.')
    return i < 0 ? undefined : vzemi(slovar, k.slice(0, i))?.[k.slice(i + 1)]
  }
  const pravila = new Intl.PluralRules(lokale)
  const stevilo = (n) => new Intl.NumberFormat(lokale, { maximumFractionDigits: 1 }).format(n)
  const t = (k, p = {}) => {
    let v = vzemi(besede?.[jezik], k) ?? vzemi(besede?.sl, k) ?? k
    if (typeof v === 'object') v = v[pravila.select(Number(p.n ?? 0))] ?? v.other
    return String(v).replace(/\{(\w+)\}/g, (_, x) => String(p[x] ?? ''))
  }
  /** "3 goli": število in števna beseda iz skupno.besede. */
  const mn = (beseda, n) => `${stevilo(n)} ${t(`skupno.besede.${beseda}`, { n })}`
  const datum = (d) => new Intl.DateTimeFormat(lokale, { day: 'numeric', month: 'numeric', year: 'numeric' }).format(new Date(d))
  return { t, mn, datum, stevilo, jezik }
}

/**
 * Kanonični naslov kot `kanonicni` v src/lib/naslov.ts: strani ene lige
 * nosijo ligo vsebine in privzeta liga `?t=` nima. Pri seznamih (lestvica,
 * rezultati …) vmesnik `?t=clani` ali neaktivno ligo iz naslova zbriše
 * (uskladiTekmovanje), zato kanonični ostane brez nje.
 */
const kanonicni = (pot, slug) => `${DOMENA}${pot}${slug ? `?t=${encodeURIComponent(slug)}` : ''}`
const zLigo = (pot, liga) => `${pot}?t=${encodeURIComponent(liga.slug)}`
const brezPrivzete = (liga) => (liga.slug === PRIVZETO ? null : liga.slug)

const povezava = (href, besedilo) => `<a href="${esc(href)}">${esc(besedilo)}</a>`
const SLOG = 'max-width:56rem;margin:0 auto;padding:1.5rem 1rem;color:#cbd5e1;font:15px/1.6 system-ui,sans-serif'
const ovij = (html) => `<main style="${SLOG}">${html}</main>`

function drobtine(liga, ostale) {
  const deli = [
    { ime: liga.country_name, url: `${DOMENA}/${String(liga.country_code).toLowerCase()}` },
    { ime: liga.name, url: kanonicni('/', brezPrivzete(liga)) },
    ...ostale,
  ].filter((d) => d.ime)
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: deli.map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: d.ime, item: d.url })),
  }
}

const zveza = (liga, b) => liga.vir_ime || liga.federation_name || b.t('aplikacija.noga.zvezeSplosno')
const ni = (naslov) => ({ status: 404, naslov, jsonld: [] })

async function tekocaSezona(rest, ligaId) {
  const [s] = await rest(`sezone?competition_id=eq.${ligaId}&tekoca=eq.true&select=season`)
  return s?.season ?? null
}

// --- strani -----------------------------------------------------------------
// Vsaka vrne { status, liga, naslov, opis?, kanonicni?, jsonld, vsebina? } ali
// null (te strani ne poznamo: nespremenjena predloga).

async function igralec(id, { rest, lige, b }) {
  const [p] = await rest(`player_overview?id=eq.${id}&select=id,full_name,position,team_id,team_name,competition_id`)
  const liga = p && lige.find((l) => l.id === p.competition_id)
  if (!liga) return ni(b().t('igralci.profil.naslov'))
  const j = b(liga)
  const sezona = await tekocaSezona(rest, liga.id)
  const [s] = sezona
    ? await rest(`player_season_standings?id=eq.${id}&competition_id=eq.${liga.id}&season=eq.${encodeURIComponent(sezona)}&select=points,matches,goals,minutes`)
    : []
  const ime = prikazniIme(p.full_name) || j.t('igralci.profil.naslov')
  const url = kanonicni(`/player/${id}`, brezPrivzete(liga))
  const klub = zLigo(`/club/${p.team_id}`, liga)
  const pozicija = p.position ? j.t(`skupno.pozicija.${p.position}`) : null
  const stat = s ? [j.mn('tekme', s.matches), j.mn('goli', s.goals), j.mn('tocke', Number(s.points))].join(' · ') : ''
  return {
    status: 200,
    liga,
    naslov: `${ime}${p.team_name ? ` (${p.team_name})` : ''}`,
    opis: `${ime} — ${[pozicija, p.team_name, liga.name].filter(Boolean).join(', ')}.${stat ? ` ${sezona}: ${stat}.` : ''}`,
    kanonicni: url,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: ime,
        url,
        ...(pozicija && { jobTitle: pozicija }),
        memberOf: { '@type': 'SportsTeam', name: p.team_name, sport: 'Soccer', url: DOMENA + klub },
      },
      drobtine(liga, [{ ime: p.team_name, url: DOMENA + klub }, { ime, url }]),
    ],
    vsebina: ovij(
      `<h1>${esc(ime)}</h1><p>${[pozicija && esc(pozicija), povezava(klub, p.team_name), povezava(zLigo('/table', liga), liga.name)].filter(Boolean).join(' · ')}</p>` +
        (s ? `<p>${esc(sezona)}: ${esc(stat)} · ${esc(j.stevilo(s.minutes))} ${esc(j.t('tekme.tabela.stolpciStrelcev.minute'))}</p>` : ''),
    ),
  }
}

async function klub(id, { rest, lige, b, t }) {
  const [k] = await rest(`teams?id=eq.${id}&select=id,name,logo_url`)
  if (!k) return ni(b().t('lestvice.klub.naslov'))
  // Kot Klub.tsx: liga iz naslova, če klub v njej igra, sicer aktivne lige;
  // od njih tista z največ igralci v tekoči sezoni.
  const ct = await rest(`competition_teams?team_id=eq.${id}&select=competition_id`)
  const vse = ct.map((c) => lige.find((l) => l.id === c.competition_id)).filter(Boolean)
  const aktivne = vse.filter((l) => l.active)
  const izbrana = aktivne.filter((l) => l.slug === (t ?? PRIVZETO))
  const kandidati = izbrana.length ? izbrana : aktivne.length ? aktivne : vse
  if (!kandidati.length) return null
  let najboljsi = null
  for (const liga of kandidati) {
    const sezona = await tekocaSezona(rest, liga.id)
    const igralci = sezona
      ? await rest(`player_season_standings?team_id=eq.${id}&competition_id=eq.${liga.id}&season=eq.${encodeURIComponent(sezona)}&select=id,full_name,position,points,goals&order=points.desc,id`)
      : []
    if (!najboljsi || igralci.length > najboljsi.igralci.length) najboljsi = { liga, igralci }
  }
  const { liga, igralci } = najboljsi
  const j = b(liga)
  const url = kanonicni(`/club/${id}`, brezPrivzete(liga))
  const vrh = igralci.slice(0, 3).map((p) => `${prikazniIme(p.full_name)} (${j.mn('tocke', Number(p.points))})`)
  return {
    status: 200,
    liga,
    naslov: `${k.name} · ${liga.name}`,
    opis: `${k.name} — ${liga.name}. ${j.mn('igralci', igralci.length)}${vrh.length ? `: ${vrh.join(', ')}` : ''}.`,
    kanonicni: url,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'SportsTeam',
        name: k.name,
        sport: 'Soccer',
        url,
        ...(k.logo_url && { logo: absolutno(k.logo_url) }),
        memberOf: { '@type': 'SportsOrganization', name: liga.name, url: kanonicni('/table', liga.slug) },
        athlete: igralci.slice(0, 40).map((p) => ({ '@type': 'Person', name: prikazniIme(p.full_name), url: kanonicni(`/player/${p.id}`, brezPrivzete(liga)) })),
      },
      drobtine(liga, [{ ime: k.name, url }]),
    ],
    vsebina: ovij(
      `<h1>${esc(k.name)}</h1><p>${povezava(zLigo('/table', liga), liga.name)}</p>` +
        (igralci.length
          ? `<ol>${igralci.map((p) => `<li>${povezava(zLigo(`/player/${p.id}`, liga), prikazniIme(p.full_name))} — ${esc(j.mn('tocke', Number(p.points)))}</li>`).join('')}</ol>`
          : ''),
    ),
  }
}

async function tekma(id, { rest, lige, b }) {
  const [[m], goli] = await Promise.all([
    rest(`match_assist_status?match_id=eq.${id}&select=match_id,season,played_on,home_name,away_name,home_goals,away_goals,home_team_id,away_team_id,competition_id`),
    rest(`goals?match_id=eq.${id}&select=minute,team_id,scorer:scorer_id(full_name)&order=minute`),
  ])
  const liga = m && lige.find((l) => l.id === m.competition_id)
  if (!liga) return ni(b().t('tekme.tekma.naslov'))
  const j = b(liga)
  const url = kanonicni(`/match/${id}`, brezPrivzete(liga))
  const izid = `${m.home_name} ${m.home_goals} : ${m.away_goals} ${m.away_name}`
  // "Bor Repič 12', 45'": strelec enkrat, minute po vrsti.
  const poStrelcu = new Map()
  for (const g of goli.filter((g) => g.scorer)) {
    const ime = prikazniIme(g.scorer.full_name)
    poStrelcu.set(ime, [...(poStrelcu.get(ime) ?? []), ...(g.minute ? [`${g.minute}'`] : [])])
  }
  const strelci = [...poStrelcu].map(([ime, minute]) => [ime, minute.join(', ')].filter(Boolean).join(' '))
  const dan = m.played_on ? j.datum(m.played_on) : null
  const ekipa = (ime, klubId) => ({ '@type': 'SportsTeam', name: ime, url: kanonicni(`/club/${klubId}`, brezPrivzete(liga)) })
  return {
    status: 200,
    liga,
    naslov: `${m.home_name} : ${m.away_name} · ${liga.name}`,
    opis: `${izid} · ${[liga.name, dan].filter(Boolean).join(', ')}.${strelci.length ? ` ${j.t('tekme.tabela.strelci')}: ${strelci.join(', ')}.` : ''}`,
    kanonicni: url,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: `${m.home_name} : ${m.away_name}`,
        description: izid,
        sport: 'Soccer',
        url,
        ...(m.played_on && { startDate: m.played_on }),
        homeTeam: ekipa(m.home_name, m.home_team_id),
        awayTeam: ekipa(m.away_name, m.away_team_id),
        competitor: [ekipa(m.home_name, m.home_team_id), ekipa(m.away_name, m.away_team_id)],
        superEvent: { '@type': 'SportsEvent', name: `${liga.name} ${m.season ?? ''}`.trim(), url: kanonicni('/results', liga.slug) },
      },
      drobtine(liga, [{ ime: j.t('tekme.rezultati.naslov'), url: kanonicni('/results', liga.slug) }, { ime: `${m.home_name} : ${m.away_name}`, url }]),
    ],
    vsebina: ovij(
      `<h1>${povezava(zLigo(`/club/${m.home_team_id}`, liga), m.home_name)} ${esc(m.home_goals)} : ${esc(m.away_goals)} ${povezava(zLigo(`/club/${m.away_team_id}`, liga), m.away_name)}</h1>` +
        `<p>${[povezava(zLigo('/results', liga), liga.name), dan && esc(dan)].filter(Boolean).join(' · ')}</p>` +
        (strelci.length ? `<p>${esc(j.t('tekme.tabela.strelci'))}: ${esc(strelci.join(', '))}</p>` : ''),
    ),
  }
}

async function tabela(liga, { rest, j, url }) {
  const vrstice = await rest('rpc/lestvica_lige', { p_competition_id: liga.id })
  const sezona = vrstice[0]?.sezona ?? ''
  const s = (k) => esc(j.t(`tekme.tabela.stolpci.${k}`))
  const vrh = vrstice.slice(0, 3).map((v) => `${v.mesto}. ${v.ime} (${v.tocke})`).join(', ')
  return {
    naslov: j.t('tekme.tabela.zavihek', { liga: liga.name }),
    opis: `${j.t('tekme.tabela.uvod', { sezona, zveza: zveza(liga, j) })}${vrh ? ` ${vrh}.` : ''}`,
    drobtina: { ime: j.t('tekme.tabela.naslov'), url },
    vsebina:
      `<h1>${esc(j.t('tekme.tabela.naslov'))} — ${esc(liga.name)}</h1>` +
      (vrstice.length
        ? `<table><thead><tr><th>#</th><th>${s('klub')}</th><th>${s('tekme')}</th><th>${s('zmage')}</th><th>${s('remiji')}</th><th>${s('porazi')}</th><th>${s('goli')}</th><th>${s('tocke')}</th></tr></thead><tbody>` +
          vrstice
            .map((v) => `<tr><td>${esc(v.mesto)}</td><td>${povezava(zLigo(`/club/${v.team_id}`, liga), v.ime)}</td><td>${esc(v.tekme)}</td><td>${esc(v.zmage)}</td><td>${esc(v.remiji)}</td><td>${esc(v.porazi)}</td><td>${esc(v.dani)}:${esc(v.prejeti)}</td><td>${esc(v.tocke)}</td></tr>`)
            .join('') +
          '</tbody></table>'
        : ''),
  }
}

async function rezultati(liga, { rest, j, url }) {
  const tekme = await rest(`match_assist_status?competition_id=eq.${liga.id}&order=played_on.desc,match_id&limit=30&select=match_id,played_on,home_name,away_name,home_goals,away_goals`)
  return {
    naslov: `${liga.name} · ${j.t('tekme.rezultati.naslov')}`,
    opis: j.t('tekme.rezultati.uvod', { zveza: zveza(liga, j) }),
    drobtina: { ime: j.t('tekme.rezultati.naslov'), url },
    vsebina:
      `<h1>${esc(j.t('tekme.rezultati.naslov'))} — ${esc(liga.name)}</h1><ul>` +
      tekme.map((m) => `<li>${m.played_on ? `${esc(j.datum(m.played_on))} · ` : ''}${povezava(zLigo(`/match/${m.match_id}`, liga), `${m.home_name} ${m.home_goals} : ${m.away_goals} ${m.away_name}`)}</li>`).join('') +
      '</ul>',
  }
}

async function igralci(liga, { rest, j, url }) {
  const sezona = await tekocaSezona(rest, liga.id)
  const vrsta = sezona
    ? await rest(`player_season_standings?competition_id=eq.${liga.id}&season=eq.${encodeURIComponent(sezona)}&order=points.desc,id&limit=30&select=id,full_name,team_name,points`)
    : []
  const naslov = j.t('igralci.seznam.naslov')
  return {
    naslov: `${liga.name} · ${naslov}`,
    opis: vrsta.length ? `${naslov} — ${liga.name}, ${sezona}: ${vrsta.slice(0, 3).map((p) => `${prikazniIme(p.full_name)} (${j.mn('tocke', Number(p.points))})`).join(', ')}.` : undefined,
    drobtina: { ime: naslov, url },
    vsebina:
      `<h1>${esc(naslov)} — ${esc(liga.name)}</h1><ol>` +
      vrsta.map((p) => `<li>${povezava(zLigo(`/player/${p.id}`, liga), prikazniIme(p.full_name))} (${esc(p.team_name)}) — ${esc(j.mn('tocke', Number(p.points)))}</li>`).join('') +
      '</ol>',
  }
}

async function lestvica(liga, { rest, j, url }) {
  const ekipe = await rest(`fantasy_team_standings?competition_id=eq.${liga.id}&order=total_points.desc,fantasy_team_id&limit=20&select=fantasy_team_id,team_name,total_points`)
  const naslov = j.t('lestvice.lestvica.naslov')
  return {
    naslov: `${liga.name} · ${naslov}`,
    drobtina: { ime: naslov, url },
    vsebina:
      `<h1>${esc(naslov)} — ${esc(liga.name)}</h1><ol>` +
      ekipe.map((e) => `<li>${povezava(zLigo(`/team/${e.fantasy_team_id}`, liga), e.team_name)} — ${esc(j.mn('tocke', Number(e.total_points)))}</li>`).join('') +
      '</ol>',
  }
}

async function domov(liga, { j }) {
  const menu = [
    ['/table', j.t('tekme.tabela.naslov')],
    ['/results', j.t('tekme.rezultati.naslov')],
    ['/players', j.t('igralci.seznam.naslov')],
    ['/standings', j.t('lestvice.lestvica.naslov')],
  ]
  return {
    naslov: liga.slug === PRIVZETO ? null : liga.name,
    vsebina: `<h1>${esc(liga.name)}</h1><nav><ul>${menu.map(([p, ime]) => `<li>${povezava(zLigo(p, liga), ime)}</li>`).join('')}</ul></nav>`,
  }
}

const SEZNAMI = { '/': domov, '/table': tabela, '/results': rezultati, '/players': igralci, '/standings': lestvica }
const ENTITETE = { player: igralec, club: klub, match: tekma }

/** Podatki strani za pot in `?t=`; `rest(pot, telo?)` vrne vrstice PostgREST. */
export async function stran(pot, t, { rest, lige, besede }) {
  const b = (liga) => prevajalnik(besede, JEZIK[liga?.country_code] ?? JEZIK[/^([a-z]{2})-/.exec(t ?? '')?.[1]?.toUpperCase()] ?? 'sl')
  const e = /^\/(player|club|match)\/([^/]+)$/.exec(pot)
  if (e) {
    const id = /^\d{1,12}$/.test(e[2]) ? Number(e[2]) : null
    if (id === null) return ni(b().t(e[1] === 'player' ? 'igralci.profil.naslov' : e[1] === 'club' ? 'lestvice.klub.naslov' : 'tekme.tekma.naslov'))
    return ENTITETE[e[1]](id, { rest, lige, b, t })
  }
  const seznam = SEZNAMI[pot]
  if (!seznam) return null
  // Neznana ali neaktivna liga v `?t=`: vmesnik pokaže privzeto, kanonični brez `?t=`.
  const izT = lige.find((l) => l.slug === t && l.active)
  const liga = izT ?? lige.find((l) => l.slug === PRIVZETO)
  if (!liga) return null
  const j = b(liga)
  const url = kanonicni(pot, brezPrivzete(liga))
  const s = await seznam(liga, { rest, j, url })
  return {
    status: 200,
    liga,
    naslov: s.naslov,
    opis: s.opis,
    kanonicni: url,
    jsonld: [drobtine(liga, s.drobtina ? [s.drobtina] : [])],
    vsebina: ovij(s.vsebina),
  }
}

/** Vpiše stran v predlogo. Brez strani (`null`) vrne predlogo nespremenjeno. */
export function izrisi(predloga, s, b) {
  if (!s) return predloga
  let html = predloga
  const naslov = s.naslov ? b.t('aplikacija.naslovStrani.zStranjo', { naslov: s.naslov }) : b.t('aplikacija.naslovStrani.osnova')
  const meta = (atribut, ime, vsebina) => {
    html = html.replace(new RegExp(`(<meta ${atribut}="${ime}" content=")[^"]*(")`), (_, a, z) => a + esc(vsebina) + z)
  }
  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(naslov)}</title>`)
  meta('property', 'og:title', naslov)
  meta('name', 'twitter:title', naslov)
  if (s.opis) {
    meta('name', 'description', s.opis)
    meta('property', 'og:description', s.opis)
    meta('name', 'twitter:description', s.opis)
  }
  if (s.kanonicni) meta('property', 'og:url', s.kanonicni)
  const glava = [
    s.kanonicni && `<link rel="canonical" href="${esc(s.kanonicni)}" />`,
    s.status === 404 && '<meta name="robots" content="noindex" />',
    ...(s.jsonld ?? []).map((o) => `<script type="application/ld+json">${jsonLd(o)}</script>`),
  ].filter(Boolean)
  html = html.replace('</head>', () => `  ${glava.join('\n    ')}\n  </head>`)
  if (s.vsebina) html = html.replace('<div id="root"></div>', () => `<div id="root">${s.vsebina}</div>`)
  return html
}

// --- strežnik ---------------------------------------------------------------

const ZIVLJENJE = 300_000 // 5 min v pomnilniku, kot max-age
const NAJVEC = 1000

/**
 * Obdelovalec zahtevkov. `koren` je mapa z zgrajeno stranjo (symlink
 * /srv/slff/current: vsaka objava je nova mapa, zato je ključ predpomnilnika
 * njena prava pot). `rest(pot, telo, signal)` bere PostgREST.
 */
export function obdelovalec({ koren, rest, rok = 800 }) {
  const predpomnilnik = new Map()
  const izdaje = new Map()
  let lige = { do: 0, seznam: null }

  const izdaja = (pot) => {
    let i = izdaje.get(pot)
    if (!i) {
      i = { predloge: {}, besede: (() => { try { return JSON.parse(readFileSync(join(pot, 'html-besede.json'), 'utf8')) } catch { return {} } })() }
      izdaje.clear() // stara objava ni več v zraku
      izdaje.set(pot, i)
      predpomnilnik.clear()
    }
    return i
  }
  const predloga = (i, pot, ime) => (i.predloge[ime] ??= readFileSync(join(pot, ime), 'utf8'))

  async function seznamLig(signal) {
    if (lige.seznam && lige.do > Date.now()) return lige.seznam
    try {
      const seznam = await rest('competitions_view?select=id,slug,name,active,country_code,country_name,vir_ime,federation_name&order=id', undefined, signal)
      lige = { do: Date.now() + 600_000, seznam }
    } catch (e) {
      if (!lige.seznam) throw e // star seznam je boljši kot nič
    }
    return lige.seznam
  }

  // Zadnja prebrana predloga: če /srv/slff/current izgine ali se ne da brati,
  // gre ven ta (200), ne napaka.
  let zadnja = null
  try {
    zadnja = readFileSync(join(koren, 'index.html'), 'utf8')
  } catch {}

  return async function (req, res) {
    const naslov = new URL(req.url ?? '/', DOMENA)
    const pot = naslov.pathname
    const t = naslov.searchParams.get('t')
    let odgovor
    try {
      const izvor = realpathSync(koren)
      const i = izdaja(izvor)
      try {
        const signal = AbortSignal.timeout(rok)
        const vse = await seznamLig(signal)
        // V ključu je `?t=` le, kadar je znana liga in ga stran rabi (klub, seznami);
        // sicer le predpona države (jezik strani 404). Naključen ?t= ne obide predpomnilnika.
        const predpona = /^([a-z]{2})-/.exec(t ?? '')?.[1] ?? ''
        const sT = !/^\/(player|match)\//.test(pot) && vse.some((l) => l.slug === t)
        const kljuc = `${pot}?t=${sT ? t : predpona}`
        odgovor = predpomnilnik.get(kljuc)
        if (odgovor && odgovor.do > Date.now()) {
          predpomnilnik.delete(kljuc)
          predpomnilnik.set(kljuc, odgovor)
        } else {
          const r = (p, telo) => rest(p, telo, signal)
          const s = await stran(pot, t, { rest: r, lige: vse, besede: i.besede })
          const jezik = JEZIK[s?.liga?.country_code] ?? JEZIK[predpona.toUpperCase()] ?? 'sl'
          const ime = s?.liga ? predlogaZa(s.liga.country_code) : predlogaPoT(t)
          odgovor = {
            status: s?.status ?? 200,
            html: izrisi(predloga(i, izvor, ime), s, prevajalnik(i.besede, jezik)),
            vir: s ? 'html' : 'predloga',
            do: Date.now() + ZIVLJENJE,
          }
          predpomnilnik.set(kljuc, odgovor)
          if (predpomnilnik.size > NAJVEC) predpomnilnik.delete(predpomnilnik.keys().next().value)
        }
      } catch (e) {
        // Varovalo: nespremenjena predloga, ne v predpomnilnik.
        console.error(`${pot}: ${e?.message ?? e}`)
        odgovor = { status: 200, html: predloga(i, izvor, predlogaPoT(t)), vir: 'varovalo', zasebno: true }
      }
      zadnja = i.predloge['index.html'] ?? zadnja
    } catch (e) {
      console.error(`${pot}: brez predloge: ${e?.message ?? e}`)
      if (!zadnja) {
        res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
        return res.end('503')
      }
      odgovor = { status: 200, html: zadnja, vir: 'varovalo', zasebno: true }
    }
    res.writeHead(odgovor.status, {
      'Content-Type': 'text/html; charset=utf-8',
      // Strani so javne in strežnik piškotkov ne bere: deli jih lahko tudi Cloudflare.
      'Cache-Control': odgovor.zasebno ? 'public, max-age=0, must-revalidate' : 'public, max-age=300, s-maxage=3600',
      'X-Slff-Html': odgovor.vir,
    })
    res.end(req.method === 'HEAD' ? undefined : odgovor.html)
  }
}

/** PostgREST z javnim anon ključem; napaka ali status ≠ 2xx vrže. */
export function postgrest(osnova, kljuc) {
  return async (pot, telo, signal) => {
    const r = await fetch(`${osnova}/rest/v1/${pot}`, {
      method: telo ? 'POST' : 'GET',
      headers: { apikey: kljuc, Authorization: `Bearer ${kljuc}`, 'Content-Type': 'application/json' },
      body: telo ? JSON.stringify(telo) : undefined,
      signal,
    })
    if (!r.ok) throw new Error(`PostgREST ${r.status} ${pot.split('?')[0]}`)
    return r.json()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { SUPABASE_URL = 'http://127.0.0.1:8000', SUPABASE_ANON_KEY, KOREN = '/srv/slff/current', PORT = '3200', NASLOV = '127.0.0.1' } = process.env
  if (!SUPABASE_ANON_KEY) throw new Error('Manjka SUPABASE_ANON_KEY')
  createServer(obdelovalec({ koren: KOREN, rest: postgrest(SUPABASE_URL, SUPABASE_ANON_KEY) })).listen(Number(PORT), NASLOV, () =>
    console.log(`slff-html na ${NASLOV}:${PORT}, predloge iz ${KOREN}`),
  )
}
