// Bounded offline CKM/SportsPress report screen. Not registered with the importer.
// Only the three retained Concordia formats are evidenced. No network or DB code.
import { createHash } from 'node:crypto'

const ORIGIN = 'https://concordiaknurow.pl'
const POSITIONS = { BRAMKARZ: 'GK', OBROŃCY: 'DEF', POMOCNICY: 'MID', NAPASTNICY: 'FWD' }
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'xmp', 'iframe', 'title', 'noembed', 'noscript'])
const FENCED = new Set(['template', 'svg', 'math'])
const OMIT = new Set([...RAW_TEXT, ...FENCED, 'aside', 'plaintext'])
const HTML_TOKEN = /<!--[^]*?(?:-->|$)|<!\[CDATA\[[^]*?(?:\]\]>|$)|<![^>]*>|<\/?[a-z][\w:-]*(?:[^<>"']|"[^"]*"|'[^']*')*>|[^<]+/gi
const normalize = value => value.normalize('NFC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('pl')

function decode(value) {
  return String(value).replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|nbsp|ndash|mdash|lt|gt);/gi, (all, key) => {
    const known = { amp: '&', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', lt: '<', gt: '>' }
    if (!key.startsWith('#')) return known[key.toLowerCase()] ?? all
    const n = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1))
    return n >= 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : all
  })
}
const has = (node, cls) => (node.attrs?.class ?? '').split(/\s+/).includes(cls)
const ignored = node => OMIT.has(node.tag) || node.attrs?.hidden !== undefined ||
  node.attrs?.['aria-hidden'] === 'true' || /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\b/i.test(node.attrs?.style ?? '') || has(node, 'widget')

// This is a bounded report reader, not a browser HTML parser. Consume raw-text
// and inert/foreign fragments before their contents can touch the outer stack.
// Templates/foreign subtrees have their own fence stack; fake </body>/<div>
// tags inside them must never promote a literal/foreign report into HTML scope.
function skipRaw(html, tag, offset, issue) {
  const close = new RegExp(`</${tag}(?=[\\s/>])(?:[^<>"']|"[^"]*"|'[^']*')*>`, 'gi')
  close.lastIndex = offset
  const end = close.exec(html)
  if (end) {
    if (tag === 'script' && /<!--[^]*?<script(?=[\s/>])/i.test(html.slice(offset, end.index))) {
      issue('HTML_INERT_UNSUPPORTED', 'Double-escaped script data requires unsupported browser parsing states')
    }
    return close.lastIndex
  }
  issue('HTML_UNCLOSED_INERT', 'Unclosed raw-text or inert fragment', { tag })
  return html.length
}
function skipFenced(html, tag, offset, issue) {
  const scanner = new RegExp(HTML_TOKEN.source, HTML_TOKEN.flags), fences = [tag]
  scanner.lastIndex = offset
  let match
  while ((match = scanner.exec(html))) {
    if (match.index !== offset) issue('HTML_TOKEN_UNSUPPORTED', 'Malformed boundary inside inert or foreign fragment')
    const token = match[0]
    offset = scanner.lastIndex
    if (token.startsWith('<!--')) {
      if (!token.endsWith('-->')) issue('HTML_UNCLOSED_COMMENT', 'Unclosed comment inside inert fragment')
      continue
    }
    if (/^<!\[CDATA\[/i.test(token)) {
      if (!token.endsWith(']]>')) issue('HTML_UNCLOSED_INERT', 'Unclosed foreign CDATA fragment', { tag: 'cdata' })
      continue
    }
    const t = token.match(/^<(\/?)([\w:-]+)/)
    if (!t) continue
    const inner = t[2].toLowerCase()
    if (!t[1] && RAW_TEXT.has(inner)) { offset = scanner.lastIndex = skipRaw(html, inner, scanner.lastIndex, issue); continue }
    if (!t[1] && inner === 'plaintext') {
      issue('HTML_INERT_UNSUPPORTED', 'Plaintext remainder has no supported closing boundary'); return html.length
    }
    if (!FENCED.has(inner)) continue
    if (!t[1]) {
      // HTML templates ignore self-closing syntax; SVG/MathML support it.
      if (inner === 'template' || !/\/\s*>$/.test(token)) fences.push(inner)
    } else {
      if (fences.at(-1) !== inner) {
        issue('HTML_OPAQUE_BOUNDARY', 'Crossed or ambiguous inert/foreign boundaries', { tag: inner })
        return scanner.lastIndex
      }
      fences.pop()
      if (!fences.length) return scanner.lastIndex
    }
  }
  issue('HTML_UNCLOSED_INERT', 'Unclosed inert or foreign fragment', { tag })
  return html.length
}
function htmlTree(html, issue) {
  const root = { tag: '#document', attrs: {}, children: [] }, stack = [root]
  const scanner = new RegExp(HTML_TOKEN.source, HTML_TOKEN.flags)
  let match, offset = 0
  while ((match = scanner.exec(html))) {
    if (match.index !== offset) issue('HTML_TOKEN_UNSUPPORTED', 'Malformed or unsupported HTML boundary')
    const token = match[0]
    offset = scanner.lastIndex
    if (token.startsWith('<!--')) {
      if (!token.endsWith('-->')) issue('HTML_UNCLOSED_COMMENT', 'Unclosed HTML comment')
      continue
    }
    if (/^<!\[CDATA\[/i.test(token)) { issue('HTML_INERT_UNSUPPORTED', 'CDATA outside a foreign fragment is unsupported'); continue }
    if (token.startsWith('<!')) continue
    if (!token.startsWith('<')) { stack.at(-1).children.push(decode(token)); continue }
    const t = token.match(/^<(\/?)([\w:-]+)/), tag = t[2].toLowerCase()
    if (t[1]) {
      const index = stack.findLastIndex(node => node.tag === tag)
      if (index > 0) stack.length = index
      continue
    }
    const attrs = Object.create(null)
    for (const a of token.slice(t[0].length).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      const key = a[1].toLowerCase()
      if (Object.hasOwn(attrs, key)) issue('HTML_DUPLICATE_ATTRIBUTE', 'Duplicate attributes have ambiguous source meaning', { tag, attribute: key })
      else attrs[key] = decode(a[2] ?? a[3] ?? a[4] ?? '')
    }
    if (tag === 'plaintext') { issue('HTML_INERT_UNSUPPORTED', 'Plaintext remainder has no supported closing boundary'); offset = html.length; break }
    if (RAW_TEXT.has(tag)) { offset = scanner.lastIndex = skipRaw(html, tag, offset, issue); continue }
    if (FENCED.has(tag)) {
      if (tag === 'template' || !/\/\s*>$/.test(token)) offset = scanner.lastIndex = skipFenced(html, tag, offset, issue)
      continue
    }
    const node = { tag, attrs, children: [] }
    stack.at(-1).children.push(node)
    if (!VOID.has(tag) && !/\/\s*>$/.test(token)) stack.push(node)
  }
  if (offset !== html.length) issue('HTML_TOKEN_UNSUPPORTED', 'Unterminated HTML token')
  return root
}
function children(node) { return (node?.children ?? []).filter(n => typeof n !== 'string' && !ignored(n)) }
function all(node, predicate) {
  return children(node).flatMap(child => [...(predicate(child) ? [child] : []), ...all(child, predicate)])
}
const byClass = (node, cls) => all(node, n => has(n, cls))
const text = node => typeof node === 'string' ? node : ignored(node ?? {}) ? '' :
  (node?.children ?? []).map(text).join(' ').replace(/\s+/gu, ' ').trim()
function observedUrl(value, pathname) {
  try {
    const u = new URL(value)
    return u.origin === ORIGIN && !u.username && !u.password && !u.search && !u.hash && pathname.test(u.pathname) ? u.href : null
  } catch { return null }
}
const score = value => {
  const m = value.match(/^(\d+):(\d+)$/)
  return m ? { home: Number(m[1]), away: Number(m[2]) } : null
}

/**
 * Parse retained report bytes only. Context issues (blocksReportStatistics=false)
 * are distinct from failures of individual-stat reconciliation. Neither grants
 * season import or activation eligibility; those are always false.
 */
export function parseCkmReport(html, { url } = {}) {
  if (typeof html !== 'string') throw new TypeError('ckm: html must be a string')
  const result = {
    source: 'ckm-report', sourceUrl: url ?? null, sourceId: null,
    rawSha256: createHash('sha256').update(html).digest('hex'), header: null,
    teams: [], events: [], sourceExtras: [], issues: [], warnings: [],
    appearances: null, goals: null, accounting: null,
    reportStatistikaPripravljena: false, activationEligible: false, sezonskiUvozPodprt: false,
  }
  const issue = (code, message, fields = {}) => result.issues.push({ code, message, blocksReportStatistics: true, ...fields })
  const warning = (code, message, fields = {}) => result.warnings.push({ code, message, ...fields })
  // Cardinality is scoped to all visible descendants, not just direct siblings.
  // An ambiguous scalar has no selected value, even in the held evidence.
  const scalar = (node, field, domain, fields = {}) => {
    const nodes = byClass(node, field)
    if (nodes.length !== 1) {
      issue(`${domain}_FIELD_${nodes.length ? 'AMBIGUOUS' : 'MISSING'}`, 'Exactly one visible scalar field required', { ...fields, field, observed: nodes.length })
      return null
    }
    return nodes[0]
  }
  if (Buffer.byteLength(html) > 2_000_000) { issue('HTML_TOO_LARGE', 'Bounded screen accepts at most 2 MB'); return result }
  const document = htmlTree(html, issue), bodies = all(document, n => n.tag === 'body')
  const canonical = all(document, n => n.tag === 'link' && n.attrs.rel === 'canonical')
  const boundUrl = observedUrl(url, /^\/event\/[^/]+\/$/)
  if (!boundUrl) issue('URL_SCOPE', 'Expected exact observed Concordia HTTPS event URL')
  if (canonical.length !== 1) issue('CANONICAL_MISSING', 'Exactly one canonical URL is required')
  else if (!boundUrl || canonical[0].attrs.href !== boundUrl) issue('CANONICAL_MISMATCH', 'Canonical URL differs from the observed report URL')
  const body = bodies[0], wrappers = byClass(body, 'ckm-event-wraper')
  const mains = wrappers.length === 1 ? children(wrappers[0]).filter(n => has(n, 'event-main-content')) : []
  if (bodies.length !== 1 || !has(body ?? {}, 'single-sp_event') || mains.length !== 1) {
    issue('REPORT_SCOPE', 'Expected one primary CKM match body/main section'); return result
  }
  const main = mains[0], heroes = children(main).filter(n => has(n, 'event-hero-section'))
  const tabs = children(main).filter(n => has(n, 'match-data-tabs'))
  if (heroes.length !== 1 || tabs.length !== 1) { issue('REPORT_SCOPE', 'Expected one primary hero and match-data tab group'); return result }
  const postIds = (body.attrs.class ?? '').split(/\s+/).filter(v => /^postid-\d+$/.test(v))
  if (postIds.length > 1) issue('SOURCE_ID_AMBIGUOUS', 'Multiple primary WP event IDs')
  result.sourceId = postIds.length === 1 ? `ckm:concordiaknurow.pl:event:${postIds[0].slice(7)}` : boundUrl
  const hero = heroes[0], teamNodes = children(hero).filter(n => has(n, 'hero-team'))
  const headings = teamNodes.map(n => all(n, c => c.tag === 'h2'))
  const names = headings.map(nodes => text(nodes[0]))
  const boxes = children(hero).filter(n => has(n, 'hero-score-box'))
  const details = children(main).filter(n => has(n, 'match-details-bar'))
  if (boxes.length !== 1 || details.length !== 1) issue('HEADER_AMBIGUOUS', 'Exactly one primary score box and details bar required')
  const labels = children(boxes[0]).filter(n => !has(n, 'hero-score'))
  const scores = byClass(boxes[0], 'hero-score')
  if (headings.some(nodes => nodes.length !== 1) || labels.length !== 1 || scores.length !== 1) {
    issue('HEADER_AMBIGUOUS', 'Exactly one team heading, league/round label and score field required')
  }
  const label = text(labels[0])
  const leagueRound = label.match(/^(.+?)\s*\|\s*(\d+)\s+KOLEJKA$/u)
  const finalScore = score(text(scores[0]))
  const dates = byClass(details[0], 'detail-item')
    .map(text).map(v => v.match(/^📅\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/u)).filter(Boolean)
  const d = dates.length === 1 ? dates[0] : null
  let date = null, time = null, derived = null
  if (d) {
    const [, day, month, year, hour, minute] = d
    const iso = `${year}-${month}-${day}`, check = new Date(`${iso}T00:00:00Z`)
    if (Number(hour) <= 23 && Number(minute) <= 59 && !Number.isNaN(check.valueOf()) && check.toISOString().startsWith(iso)) {
      date = iso; time = `${hour}:${minute}`
      const firstYear = Number(year) - (Number(month) < 7 ? 1 : 0)
      derived = `${firstYear}/${String(firstYear + 1).slice(-2)}`
    }
  }
  result.header = { league: leagueRound?.[1] ?? null, round: leagueRound ? Number(leagueRound[2]) : null,
    score: finalScore, date, time, home: names[0] ?? null, away: names[1] ?? null,
    season: null, dateDerivedSeason: derived, seasonEvidence: derived ? 'date-derived' : null }
  issue('SEASON_CONTEXT_REQUIRED', 'Event date alone does not establish an authoritative competition/season pairing', { blocksReportStatistics: false })
  if (names.length !== 2 || !names.every(Boolean) || names[0] === names[1] || !leagueRound || !finalScore || !date) {
    issue('HEADER_MISSING', 'Main event team/league/round/score/date fields are missing or contradictory')
  }
  const lineups = children(tabs[0]).filter(n => n.attrs.id === 'lineups')
  const timelines = children(tabs[0]).filter(n => n.attrs.id === 'timeline')
  if (lineups.length !== 1 || timelines.length !== 1) { issue('REPORT_SCOPE', 'Expected one scoped lineup and timeline'); return result }
  const groups = byClass(lineups[0], 'grid-item')
  for (const [index, side] of ['home', 'away'].entries()) {
    const team = { side, name: names[index] ?? null, sourceId: null, starters: [], bench: [] }
    for (const [className, target] of [['starters', 'starters'], ['subs', 'bench']]) {
      const blocks = groups.filter(n => has(n, side) && has(n, className))
      if (blocks.length !== 1) issue('LINEUP_SCOPE', 'Expected one roster block per team/group', { side, group: target })
      let position = null
      for (const node of children(blocks[0])) {
        if (has(node, 'formation-header')) { position = POSITIONS[text(node)] ?? null; continue }
        if (node.tag !== 'a' || !has(node, 'player-entry') || !node.attrs.href?.includes('/player/')) continue
        const profileUrl = observedUrl(node.attrs.href, /^\/player\/[^/]+\/$/)
        const name = text(scalar(node, 'p-name', 'PLAYER', { side, profileUrl }))
        const player = { name, profileUrl, sourcePlayerId: profileUrl, side, starter: target === 'starters', position,
          positionEvidence: 'explicit-heading', shirt: text(scalar(node, 'p-nr', 'PLAYER', { side, profileUrl })) || null }
        team[target].push(player)
        if (!name || !profileUrl) issue('PLAYER_ID_MISSING', 'Player needs observed exact profile URL and name', { side, actor: name })
        if (!position) issue('POSITION_MISSING', 'Player has no supported explicit position heading', { side, actor: name })
      }
    }
    if (team.starters.length !== 11) issue('STARTER_COUNT', 'Exactly eleven published starters are required; no unnamed players inferred', { side, observed: team.starters.length })
    if (team.starters.filter(p => p.position === 'GK').length !== 1) issue('STARTING_GK_COUNT', 'Exactly one explicitly identified starting goalkeeper required', { side })
    const ids = new Set()
    for (const player of [...team.starters, ...team.bench]) {
      if (ids.has(player.profileUrl)) issue('PLAYER_DUPLICATE', 'Profile repeated in team roster', { side, actor: player.name })
      ids.add(player.profileUrl)
    }
    result.teams.push(team)
  }
  const bothIds = result.teams.map(t => new Set([...t.starters, ...t.bench].map(p => p.profileUrl)))
  if ([...bothIds[0]].some(id => id && bothIds[1].has(id))) issue('PLAYER_BOTH_TEAMS', 'Same observed profile appears for both teams')
  const rows = children(timelines[0]).filter(n => has(n, 'timeline-row'))
  if (!rows.length) issue('TIMELINE_MISSING', 'No timed events published; empty timeline is not proof of no events')
  const resolve = (name, side) => {
    const roster = [...result.teams[side === 'home' ? 0 : 1].starters, ...result.teams[side === 'home' ? 0 : 1].bench]
    const actors = roster.filter(p => normalize(p.name) === normalize(name))
    if (actors.length !== 1) {
      issue(actors.length ? 'ACTOR_AMBIGUOUS' : 'ACTOR_UNIDENTIFIED', 'Event actor must uniquely match a player on this exact team roster', { side, actor: name })
      return null
    }
    return actors[0].sourcePlayerId
  }
  let previousMinute = -1
  for (const row of rows) {
    const side = /flex-direction\s*:\s*row-reverse/i.test(row.attrs.style ?? '') ? 'away' : 'home'
    const rawMinute = text(scalar(row, 'tm-min', 'EVENT', { side })), clock = rawMinute.match(/^(\d{1,2})'$/)
    const minute = clock && Number(clock[1]) <= 90 ? Number(clock[1]) : null
    const rawText = text(row), icon = text(scalar(row, 'tm-icon', 'EVENT', { side }))
    const info = scalar(row, 'tm-info', 'EVENT', { side })
    const containers = children(info)
    if (info && (containers.length !== 1 || containers[0].tag !== 'div')) {
      issue('EVENT_INFO_AMBIGUOUS', 'Exactly one visible event actor container required', { side })
    }
    const contents = containers.length === 1 ? children(containers[0]) : []
    const parts = contents.filter(n => n.tag === 'span')
    if (contents.length !== parts.length) issue('EVENT_INFO_AMBIGUOUS', 'Unsupported visible content outside event actor fields', { side })
    if (minute === null) issue('CLOCK_UNSUPPORTED', 'Unsupported or absent event clock; do not infer/clamp time', { rawMinute })
    else if (minute < previousMinute) issue('EVENT_ORDER', 'Published event times go backwards')
    if (minute !== null) previousMinute = minute
    if (icon === '❌' && /NIEWYKORZYSTANY KARNY/u.test(text(info))) {
      result.sourceExtras.push({ type: 'missed_penalty', side, minute, rawText, confirmed: false }); continue
    }
    const type = { '⚽': 'goal', '🔄': 'substitution', '🟨': 'yellow', '🟥': 'red' }[icon]
    if (!type) { issue('EVENT_UNKNOWN', 'Unrecognised event retained without guessing', { rawText }); result.events.push({ type: 'unknown', side, minute, rawMinute, rawText }); continue }
    const event = { type, side, minute, rawMinute, rawText }
    if (type === 'substitution') {
      const incoming = parts.filter(n => text(n).includes('↑')), outgoing = parts.filter(n => text(n).includes('↓'))
      if (incoming.length !== 1 || outgoing.length !== 1) issue('SUBSTITUTION_PAIR_MISSING', 'One explicit incoming/outgoing actor required', { rawText })
      event.in = resolve(text(incoming[0]).replace(/[↑↓]/gu, '').trim(), side)
      event.out = resolve(text(outgoing[0]).replace(/[↑↓]/gu, '').trim(), side)
    } else {
      if (['yellow', 'red'].includes(type) && parts.length !== 1) {
        issue('EVENT_ACTOR_AMBIGUOUS', 'Card requires exactly one visible actor field', { side, observed: parts.length })
      }
      const actor = text(parts[0])
      event.player = resolve(actor, side)
      if (type === 'goal') {
        event.runningScore = score(text(scalar(row, 'tm-score', 'EVENT', { side })))
        if (!event.runningScore) issue('GOAL_RUNNING_SCORE_MISSING', 'Published goal lacks running score', { rawText })
        for (const extra of parts.slice(1)) {
          if (/asysta:/iu.test(text(extra))) result.sourceExtras.push({ type: 'assist', side, minute, rawText: text(extra), confirmed: false })
          else if (text(extra)) issue('EVENT_EXTRA_UNKNOWN', 'Unrecognised goal annotation', { rawText: text(extra) })
        }
      }
    }
    result.events.push(event)
  }
  reconcile(result, issue, warning)
  return result
}

function reconcile(result, issue, warning) {
  const sourceCards = new Map()
  for (const e of result.events) {
    if (!['yellow', 'red'].includes(e.type) || !e.player) continue
    const cards = sourceCards.get(e.player) ?? { yellow: [], red: [] }
    cards[e.type].push(e); sourceCards.set(e.player, cards)
  }
  for (const [actor, cards] of sourceCards) {
    if (cards.yellow.length > 2 || cards.red.length > 1) issue('CARD_SEQUENCE', 'Unsupported repeated card sequence', { actor })
    if (cards.yellow.length === 2) {
      if (cards.red.length !== 1 || cards.red[0].minute !== cards.yellow[1].minute) issue('SECOND_YELLOW_RED_MISSING', 'Second yellow has no matching explicit red clock', { actor })
      else warning('SECOND_YELLOW_WITH_EXPLICIT_RED', 'Two source yellows and explicit red retained; scoring yellow count is one plus red', { actor, minute: cards.red[0].minute })
    }
  }
  const scored = { home: 0, away: 0 }
  for (const e of result.events.filter(e => e.type === 'goal')) {
    scored[e.side]++
    if (!e.runningScore || e.runningScore.home !== scored.home || e.runningScore.away !== scored.away) issue('GOAL_SCORE_MISMATCH', 'Running goal totals contradict published running score')
  }
  if (!result.header?.score || scored.home !== result.header.score.home || scored.away !== result.header.score.away) issue('GOAL_SCORE_MISMATCH', 'Timed goals do not account for final header score')
  const states = new Map(), accounting = {}, appearances = []
  for (const team of result.teams) {
    for (const p of [...team.starters, ...team.bench]) states.set(p.sourcePlayerId, { ...p, entered: p.starter ? 0 : null, left: null, intervals: [] })
    accounting[team.side] = { minutes: 0, expectedMinutes: 990, reds: 0 }
  }
  for (const e of result.events) {
    if (e.minute === null || e.type === 'unknown') continue
    if (e.type === 'substitution') {
      const incoming = states.get(e.in), outgoing = states.get(e.out)
      if (!incoming || !outgoing || incoming.side !== e.side || outgoing.side !== e.side || incoming === outgoing ||
          incoming.entered !== null || outgoing.entered === null || outgoing.left !== null || e.minute < outgoing.entered) {
        issue('SUBSTITUTION_STATE', 'Pair contradicts observed on/off intervals', { side: e.side, minute: e.minute }); continue
      }
      outgoing.intervals.push([outgoing.entered, e.minute]); outgoing.left = e.minute; incoming.entered = e.minute
    } else {
      const player = states.get(e.player)
      if (!player || player.side !== e.side || player.entered === null || player.left !== null || e.minute < player.entered) {
        issue('EVENT_OUTSIDE_APPEARANCE', 'Event actor was not on the field at the published minute', { side: e.side, actor: e.player }); continue
      }
      if (e.type === 'red') {
        player.intervals.push([player.entered, e.minute]); player.left = e.minute
        accounting[e.side].expectedMinutes -= 90 - e.minute; accounting[e.side].reds++
      }
    }
  }
  for (const p of states.values()) {
    if (p.entered === null) continue
    if (p.left === null) p.intervals.push([p.entered, 90])
    const minutes = p.intervals.reduce((sum, [a, b]) => sum + b - a, 0)
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 90) issue('INTERVAL_INVALID', 'Impossible playing interval', { actor: p.name })
    const cards = sourceCards.get(p.sourcePlayerId) ?? { yellow: [], red: [] }
    appearances.push({ sourcePlayerId: p.sourcePlayerId, profileUrl: p.profileUrl, name: p.name, side: p.side, starter: p.starter, position: p.position,
      intervals: p.intervals, minutes, yellowCardsSource: cards.yellow.length,
      yellowCards: cards.yellow.length === 2 && cards.red.length === 1 ? 1 : cards.yellow.length, redCards: cards.red.length })
    accounting[p.side].minutes += minutes
  }
  for (const [side, a] of Object.entries(accounting)) {
    if (a.minutes !== a.expectedMinutes) issue('TEAM_MINUTE_MISMATCH', 'Team playing minutes do not reconcile with explicit dismissals', { side, ...a })
  }
  if (!result.issues.some(i => i.blocksReportStatistics)) {
    result.reportStatistikaPripravljena = true
    result.appearances = appearances
    result.goals = result.events.filter(e => e.type === 'goal').map(e => ({ player: e.player, side: e.side, minute: e.minute }))
    result.accounting = accounting
  }
}
