// Public WordPress match sheets, migrated November 2026. Deliberately scoped
// to Dodecanese; the other EPS associations still use results.php.
const P = 'enosi-bridge-match-sheet__'
const validMinute = value => {
  const m = value.match(/^(\d+)(?:\s*\+\s*(\d+))?['’′]?$/)
  return !!m && Number(m[1]) <= 120 && (!m[2] || Number(m[2]) <= 30)
}
export const jeEpsdodTekma = html => /<article\b[^>]*class="[^"]*\benosi-bridge--match-sheet\b/.test(String(html ?? ''))
const field = (s, name) => s.match(new RegExp(`<([a-z0-9]+)\\b[^>]*class="[^"]*\\b${P}${name}(?=["\\s])[^\"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i'))?.[2] ?? ''
const blocks = (s, tag, name) => [...s.matchAll(new RegExp(`<${tag}\\b[^>]*class="[^"]*\\b${P}${name}(?=["\\s])[^\"]*"[^>]*>[\\s\\S]*?<\\/${tag}>`, 'g'))].map(m => m[0])

export function epsdodPodatki(html, { gameId, url, koda }, h) {
  const { besedilo, minuta, sezonaIz, krogIz, datumIz, casTekme, kljucKlubaGr } = h
  let u
  try { u = new URL(url) } catch { throw new Error('epsdod: manjka javni naslov za identiteto zapisnika') }
  if (u.origin !== 'https://epsdod.gr' || u.pathname !== '/fyllo-agona/' || u.username || u.password || u.hash ||
      [...u.searchParams.keys()].join(',') !== 'game_id' || u.searchParams.get('game_id') !== String(gameId) || !Number.isSafeInteger(gameId) || gameId <= 0)
    throw new Error('epsdod: naslov in identiteta zapisnika se ne ujemata')
  const article = html.match(/<article\b[^>]*class="[^"]*\benosi-bridge--match-sheet\b[^\"]*"[^>]*>([\s\S]*?)<\/article>/)?.[1] ?? ''
  const holds = []
  if (!article) holds.push('odrezan zapisnik')
  const s = article || html
  const text = name => besedilo(field(s, name))
  const liga = text('title')
  const leagues = { 'epsdod.gr:495': ['Α Κατηγορία', 'Α Κατηγορία Blue Star Ferries'], 'epsdod.gr:497': ['Β Κατηγορία 2ος Όμιλος'] }
  if (koda && (!leagues[koda]?.some(name => kljucKlubaGr(liga) === kljucKlubaGr(name)))) throw new Error(`epsdod: tekmovanje ${liga} ni liga ${koda}`)
  const meta = new Map(blocks(s, 'div', 'meta-item').map(b => [besedilo(field(b, 'meta-label')), besedilo(field(b, 'meta-value'))]))
  const teams = [...s.matchAll(new RegExp(`<div class="${P}team-name">([\\s\\S]*?)<\\/div>`, 'g'))].map(m => besedilo(m[1]))
  const scores = [...s.matchAll(new RegExp(`<span class="${P}score-part">(\\d+)<\\/span>`, 'g'))].map(m => Number(m[1]))
  const g = { sezona: sezonaIz(text('round')), liga, krog: krogIz(text('round')), domaci: teams[0], gostje: teams[1],
    izid: scores.length === 2 ? { domaci: scores[0], gostje: scores[1] } : null, kontumacija: false,
    ...casTekme(datumIz(meta.get('Ημερομηνία')), meta.get('Ώρα')) }
  if (text('status') !== 'Τελικό') holds.push('tekma ni končana')
  if (!g.sezona || !g.krog || !g.datum || !g.ura || teams.length !== 2 || !liga) holds.push('nepopolna glava tekme')
  const players = b => [...b.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].flatMap(m => {
    let p
    try { p = new URL(m[1]) } catch { return [] }
    if (!p.pathname.includes('podosfairist')) return []
    if (p.origin !== 'https://epsdod.gr' || p.pathname !== '/podosfairistes/podosfairistis/' || p.username || p.password || p.hash ||
        [...p.searchParams.keys()].join(',') !== 'player_id' || !/^[1-9]\d{0,6}$/.test(p.searchParams.get('player_id') ?? '')) {
      holds.push('neveljavna identiteta igralca'); return []
    }
    return [{ playerId: Number(p.searchParams.get('player_id')), ime: besedilo(m[2]) }]
  })
  const postavi = ['home', 'away'].map((side, idx) => {
    const card = blocks(s, 'section', `lineup-card--${side}`)
    if (card.length !== 1) holds.push(`${side}: manjka postava`)
    const b = card[0] ?? ''
    if (kljucKlubaGr(besedilo(field(b, 'lineup-title'))) !== kljucKlubaGr(teams[idx] ?? '')) holds.push(`${side}: druga ekipa v postavi`)
    let starter = null
    const out = []
    for (const [, row] of b.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
      const rowText = besedilo(row)
      if (rowText === 'Βασική ενδεκάδα') { starter = true; continue }
      if (rowText === 'Αναπληρωματικοί') { starter = false; continue }
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1])
      if (!cells.length) continue
      const pp = players(cells[1] ?? '')
      if (starter == null || cells.length !== 6 || pp.length !== 1) { holds.push(`${side}: nejasna vrstica postave`); continue }
      const slot = Number(besedilo(cells[0]))
      if (slot !== out.length + 1 || (starter && slot > 11) || (!starter && slot <= 11)) holds.push(`${side}: napačen začetni položaj ${slot}`)
      const readMinute = cell => {
        const t = besedilo(cell)
        if (t === '—' || !t) return null
        if (!validMinute(t)) holds.push(`${side}: neveljavna minuta ${t}`)
        return minuta(t)
      }
      // Badge classes have the full BEM prefix; compare type and the independently
      // printed lineup minute, not merely the number of cards.
      const marks = [...cells[3].matchAll(/<span\b[^>]*class="[^"]*enosi-bridge-match-sheet__inline-badge--([a-z-]+)[^"]*"[^>]*>/g)]
      const kartoni = marks.map((mark, i) => {
        const fragment = cells[3].slice(mark.index, marks[i + 1]?.index)
        const time = besedilo(fragment).match(/\(([^)]+)\)/)?.[1] ?? ''
        const vrsta = { yellow: 'rumeni', red: 'rdeci', 'second-yellow': 'drugiRumeni' }[mark[1]]
        if (!vrsta || !validMinute(time)) holds.push(`${side}: nejasen karton v postavi`)
        return { vrsta, minuta: minuta(time) }
      })
      const zadetki = [...cells[2].matchAll(/event-badge--([a-z-]+)(?=["\s])/g)].map(m => ({ goal: 'gol', penalty: 'enajstmetrovka', 'own-goal': 'avtogol' })[m[1]])
      if (zadetki.some(v => !v)) holds.push(`${side}: nejasen gol v postavi`)
      out.push({ ...pp[0], kartoni, zadetki, zacetnik: starter, ven: readMinute(cells[5]), noter: readMinute(cells[4]),
        golov: (cells[2].match(/event-badge--(?:goal|penalty)(?=["\s])/g) ?? []).length,
        kartonov: (cells[3].match(/inline-badge--(?:yellow|red|second-yellow)(?=["\s])/g) ?? []).length })
    }
    if (out.filter(p => p.zacetnik).length !== 11) holds.push(`${side}: ni 11 začetnikov`)
    return out
  })
  const dogodki = []
  const types = { goal: 'gol', penalty: 'enajstmetrovka', 'own-goal': 'avtogol', yellow: 'rumeni', red: 'rdeci', 'second-yellow': 'drugiRumeni' }
  const score = [0, 0]
  for (const b of blocks(s, 'li', 'timeline-item')) {
    const side = b.match(/timeline-item--(home|away)(?=["\s])/)?.[1]
    const idx = side === 'home' ? 0 : side === 'away' ? 1 : null
    const type = b.match(/timeline-item--(?!home\b|away\b)([a-z-]+)(?=["\s])/)?.[1]
    const pp = players(b)
    const m = besedilo(field(b, 'timeline-minute'))
    if (!validMinute(m)) holds.push('dogodek brez veljavne minute')
    const minute = minuta(m)
    if (idx == null || kljucKlubaGr(besedilo(field(b, 'timeline-team'))) !== kljucKlubaGr(teams[idx] ?? '')) holds.push('dogodek druge ekipe')
    if (type === 'substitution') {
      if (pp.length !== 2 || !/Βγαίνει → Μπαίνει/.test(b)) holds.push('nejasna menjava')
      pp.forEach((p, i) => dogodki.push({ ...p, ekipaIdx: idx, minuta: minute, vrsta: i === 0 ? 'ven' : 'noter' }))
    } else {
      if (!types[type] || pp.length !== 1) holds.push(`neznan dogodek ${type}`)
      dogodki.push({ ...pp[0], ekipaIdx: idx, minuta: minute, vrsta: types[type], ikona: type })
      if (['goal', 'penalty', 'own-goal'].includes(type) && idx != null) {
        score[type === 'own-goal' ? 1 - idx : idx]++
        if (besedilo(field(b, 'timeline-score')) !== score.join('-')) holds.push('neujemanje vmesnega izida')
      }
    }
  }
  const ids = postavi.flat().map(p => p.playerId)
  if (new Set(ids).size !== ids.length) holds.push('ponovljena identiteta igralca')
  const seen = new Set()
  for (const event of dogodki) {
    const key = [event.ekipaIdx, event.playerId, event.vrsta, event.minuta].join('|')
    if (seen.has(key)) holds.push('podvojen dogodek')
    seen.add(key)
  }
  postavi.forEach((team, idx) => team.forEach(p => {
    const events = dogodki.filter(d => d.ekipaIdx === idx && d.playerId === p.playerId)
    const ins = events.filter(d => d.vrsta === 'noter'), outs = events.filter(d => d.vrsta === 'ven')
    if (ins.length !== Number(p.noter != null) || outs.length !== Number(p.ven != null) ||
        ins.some(d => d.minuta !== p.noter) || outs.some(d => d.minuta !== p.ven)) holds.push(`${p.ime}: menjava ni potrjena v postavi`)
    if ((p.zacetnik && ins.length) || (!p.zacetnik && outs.length && !ins.length) ||
        (p.noter != null && p.ven != null && p.noter > p.ven)) holds.push(`${p.ime}: protislovno zaporedje menjav`)
    const cards = events.filter(d => ['rumeni', 'rdeci', 'drugiRumeni'].includes(d.vrsta))
    if (p.kartonov !== cards.length || JSON.stringify(p.kartoni.map(c => `${c.vrsta}|${c.minuta}`).sort()) !== JSON.stringify(cards.map(c => `${c.vrsta}|${c.minuta}`).sort())) holds.push(`${p.ime}: kartoni se ne ujemajo s postavo`)
    const goals = events.filter(d => ['gol', 'enajstmetrovka', 'avtogol'].includes(d.vrsta))
    if (JSON.stringify([...p.zadetki].sort()) !== JSON.stringify(goals.map(g => g.vrsta).sort())) holds.push(`${p.ime}: vrste golov se ne ujemajo s postavo`)
    for (const e of goals) {
      if ((!p.zacetnik && (p.noter == null || p.noter > e.minuta)) || (p.ven != null && p.ven < e.minuta)) holds.push(`${p.ime}: strelec ni na igrišču`)
    }
  }))
  return { g, postavi, dogodki, holds }
}

// Exact current-season public pages. Historical/inactive league codes keep
// their legacy route; selecting B's default page would silently select 496.
const CURRENT = {
  'epsdod.gr:495': { main: 1, path: 'a-katigoria', name: 'Α Κατηγορία' },
  'epsdod.gr:497': { main: 2, path: 'v-katigoria', name: 'Β Κατηγορία 2ος Όμιλος' },
}
export const jeEpsdodAktualna = koda => !!CURRENT[koda]
export function epsdodNaslovRazporeda(koda) {
  const c = CURRENT[koda]
  if (!c) throw new Error(`epsdod: neznana trenutna liga ${koda}`)
  return `https://epsdod.gr/diorganoseis/${c.path}/?enosi_main_league_id=${c.main}&enosi_tab=schedule&enosi_league_id=${koda.split(':')[1]}&enosi_scope=all&enosi_period=14`
}
export const jeEpsdodRazpored = html => /<section\b[^>]*class="[^"]*\benosi-bridge--competition-tabs-view-schedule\b/.test(String(html ?? ''))
export const jeEpsdodStran = html => (jeEpsdodTekma(html) && /<\/article>/.test(html)) || (jeEpsdodRazpored(html) && /<\/details>[\s\S]*<\/section>/.test(html))

export function epsdodRazpored(html, koda, h) {
  const { besedilo, sezonaIz, krogIz, datumIz, casTekme, izidIz, kljucKlubaGr } = h
  const c = CURRENT[koda]
  const fail = message => { throw new Error(`epsdod: ${message}`) }
  if (!c || !jeEpsdodRazpored(html)) fail('neveljaven razpored ali liga')
  const section = html.match(/<section\b[^>]*class="[^"]*\benosi-bridge--competition-tabs-view-schedule\b[^\"]*"[^>]*>([\s\S]*?)<\/section>/)?.[1]
  if (!section) fail('odrezan razpored')
  const active = [...section.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter(m => /data-enosi-competition-tab="schedule"/.test(m[1]) && /aria-current="page"/.test(m[1]))
  if (active.length !== 1) fail('manjka izbrani razpored')
  const route = new URL(besedilo(active[0][1].match(/href="([^"]+)"/)?.[1]))
  if (route.href !== epsdodNaslovRazporeda(koda)) fail('razpored druge lige ali obdobja')
  const sezona = sezonaIz(besedilo(section.match(/class="enosi-bridge-competition__period">([\s\S]*?)<\/div>/)?.[1]))
  if (sezona !== '2026/27') fail('razpored druge sezone')
  const selectedLeague = [...section.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].find(m => /aria-current="page"/.test(m[1]) && !/data-enosi-competition-tab/.test(m[1]))
  const name = selectedLeague ? besedilo(selectedLeague[2]) : besedilo(section.match(/<h2>([\s\S]*?)<\/h2>/)?.[1])
  if (kljucKlubaGr(name) !== kljucKlubaGr(c.name)) fail('ime tekmovanja se ne ujema')
  const games = new Set(), rounds = new Set(), krogi = []
  const cell = (row, name) => row.match(new RegExp(`<td class="enosi-bridge-matches-archive__${name}(?=["\\s])[^\"]*"[^>]*>([\\s\\S]*?)<\\/td>`))?.[1] ?? ''
  for (const [, body] of section.matchAll(/<details\b[^>]*class="enosi-bridge-round\b[^\"]*"[^>]*>([\s\S]*?)<\/details>/g)) {
    const summary = body.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? ''
    const stevilka = krogIz(besedilo(summary)), count = Number(besedilo(summary).match(/(\d+)\s+αγώνες/)?.[1])
    if (!stevilka || rounds.has(stevilka) || !count) fail('neveljaven ali podvojen krog')
    rounds.add(stevilka)
    const tekme = []
    for (const [, rawId, row] of body.matchAll(/<tr\b[^>]*data-enosi-game-id="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g)) {
      const gameId = Number(rawId)
      if (!Number.isSafeInteger(gameId) || gameId <= 0 || games.has(gameId)) fail('podvojena ali neveljavna identiteta tekme')
      games.add(gameId)
      const pair = row.match(/class="enosi-bridge-matches-archive__match-name">([\s\S]*?)<\/span>/)?.[1] ?? ''
      const teams = [...pair.matchAll(/<a\b[^>]*href="https:\/\/epsdod\.gr\/somateia\/somateio\/\?team_id=\d+"[^>]*>([\s\S]*?)<\/a>/g)].map(m => besedilo(m[1]))
      if (teams.length !== 2 || !teams.every(Boolean) || kljucKlubaGr(teams[0]) === kljucKlubaGr(teams[1])) fail('nejasen par klubov')
      const score = cell(row, 'result'), mobile = cell(row, 'mobile-result')
      if (besedilo(score) !== besedilo(mobile)) fail('nasprotujoča izida')
      const result = izidIz(score)
      if (!result && !/^(?:–|—|-|Αναβλήθηκε|Άνευ αγώνα)?$/.test(besedilo(score))) fail(`neznano stanje tekme ${besedilo(score)}`)
      const links = [...row.matchAll(/href="([^"]*fyllo-agona[^"]*)"/g)].map(m => besedilo(m[1]))
      if (links.some(link => link !== `https://epsdod.gr/fyllo-agona/?game_id=${gameId}`)) fail('povezava zapisnika ne ustreza identiteti tekme')
      const { datum, ura } = casTekme(datumIz(besedilo(cell(row, 'date'))), besedilo(cell(row, 'time')))
      tekme.push({ domaci: teams[0], gostje: teams[1], datum, ura,
        izid: result ? { domaci: result.domaci, gostje: result.gostje } : null,
        kontumacija: !!result?.kontumacija, gameId, reportAvailable: links.length > 0, neBo: besedilo(score) === 'Άνευ αγώνα' })
    }
    if (tekme.length !== count) fail('število tekem se ne ujema s krogom')
    krogi.push({ stevilka, tekme })
  }
  if (!krogi.length) fail('prazen razpored')
  return { sezona, ime: name, krogi, nerazreseni: [] }
}
