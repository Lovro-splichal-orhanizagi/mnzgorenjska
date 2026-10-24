import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const module = await import('./viri/ckm-report.mjs').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
  return {}
})
const complete = readFileSync(new URL('./vzorci/pl-ckm-complete.html', import.meta.url), 'utf8')
const partial = readFileSync(new URL('./vzorci/pl-ckm-partial.html', import.meta.url), 'utf8')
const archive = readFileSync(new URL('./vzorci/pl-ckm-archive.html', import.meta.url), 'utf8')
const url = 'https://concordiaknurow.pl/event/sosnica-gliwice-vs-silesia-miechowice/'
function parse(html = complete, sourceUrl = url) {
  assert.equal(typeof module.parseCkmReport, 'function', 'offline parser has not been implemented')
  return module.parseCkmReport(html, Object.freeze({ url: sourceUrl }))
}
const codes = result => result.issues.map(issue => issue.code)
function held(result, code) {
  assert.equal(result.reportStatistikaPripravljena, false)
  assert.equal(result.appearances, null)
  assert.equal(result.goals, null)
  assert.equal(result.accounting, null)
  assert.equal(result.activationEligible, false)
  assert.equal(result.sezonskiUvozPodprt, false)
  assert.ok(codes(result).includes(code), JSON.stringify(result.issues))
}

test('complete non-club report reconciles both XIs, explicit GKs, events, red and playing intervals', () => {
  const r = parse()
  assert.equal(r.sourceId, 'ckm:concordiaknurow.pl:event:10136')
  assert.equal(r.header.league, 'III LIGA ŚLĄSKA')
  assert.equal(r.header.round, 10)
  assert.deepEqual(r.header.score, { home: 1, away: 1 })
  assert.equal(r.header.date, '2026-10-03')
  assert.equal(r.header.time, '11:00')
  assert.equal(r.header.home, 'Sośnica Gliwice')
  assert.equal(r.header.away, 'Silesia Miechowice')
  assert.deepEqual(r.teams.map(t => [t.starters.length, t.bench.length]), [[11, 4], [11, 6]])
  assert.equal(r.teams[0].starters.find(p => p.position === 'GK').name, 'Ziarnik Dawid')
  assert.equal(r.teams[1].starters.find(p => p.position === 'GK').profileUrl, 'https://concordiaknurow.pl/player/kudla-szymon/')
  assert.equal(r.teams[1].bench.find(p => p.position === 'GK').name, 'Raś Jakub')
  assert.deepEqual(['substitution', 'goal', 'yellow', 'red'].map(type => r.events.filter(e => e.type === type).length), [5, 2, 6, 1])
  assert.equal(r.reportStatistikaPripravljena, true)
  assert.equal(r.appearances.length, 27)
  assert.equal(r.accounting.home.minutes, 990)
  assert.equal(r.accounting.away.minutes, 983)
  assert.equal(r.accounting.away.expectedMinutes, 983)
  const red = r.appearances.find(p => p.name === 'Szurka Dominik')
  assert.deepEqual(red.intervals, [[0, 83]])
  assert.equal(red.minutes, 83)
  assert.equal(red.yellowCardsSource, 2)
  assert.equal(red.yellowCards, 1)
  assert.equal(red.redCards, 1)
  assert.ok(r.warnings.some(w => w.code === 'SECOND_YELLOW_WITH_EXPLICIT_RED'))
  assert.equal(r.appearances.find(p => p.name === 'Piernikarczyk Jakub').minutes, 42)
  assert.equal(r.appearances.some(p => p.name === 'Raś Jakub'), false)
  assert.equal(r.activationEligible, false)
  assert.equal(r.sezonskiUvozPodprt, false)
})

test('main date gives only derived season; current sidebar is never source season proof', () => {
  const r = parse()
  assert.equal(r.header.season, null)
  assert.equal(r.header.dateDerivedSeason, '2026/27')
  assert.equal(r.header.seasonEvidence, 'date-derived')
  assert.ok(codes(r).includes('SEASON_CONTEXT_REQUIRED'))
  assert.equal(r.issues.find(i => i.code === 'SEASON_CONTEXT_REQUIRED').blocksReportStatistics, false)
})

test('same-day partial page preserves header and evidence without invented individual statistics', () => {
  const r = parse(partial, 'https://concordiaknurow.pl/event/burza-borowa-wies-vs-walka-zabrze/')
  held(r, 'STARTER_COUNT')
  assert.ok(codes(r).includes('TIMELINE_MISSING'))
  assert.equal(r.header.home, 'Burza Borowa Wieś')
  assert.deepEqual(r.header.score, { home: 6, away: 2 })
  assert.equal(r.teams[0].starters.length, 11)
  assert.equal(r.teams[1].starters.length, 0)
})

test('archive nine-player published XI stays held, preserving its actual old league/date and raw assist extras', () => {
  const r = parse(archive, 'https://concordiaknurow.pl/event/concordia-knurow-vs-cks-czeladz/')
  held(r, 'STARTER_COUNT')
  assert.equal(r.header.league, 'II LIGA ŚLĄSKA I GRUPA')
  assert.equal(r.header.dateDerivedSeason, '2025/26')
  assert.equal(r.header.season, null)
  assert.equal(r.header.date, '2025-08-09')
  assert.equal(r.teams[1].starters.length, 9)
  assert.equal(r.sourceExtras.filter(x => x.type === 'assist').length, 2)
  assert.equal(r.sourceExtras.filter(x => x.type === 'missed_penalty').length, 2)
  assert.ok(r.sourceExtras.every(x => x.confirmed === false))
})

test('two same-team actors with the same name cannot resolve an event by name', () => {
  held(parse(complete.replace('Kowalski Jakub', 'Szurka Dominik')), 'ACTOR_AMBIGUOUS')
})

test('contradictory header and event scores hold individual statistics', () => {
  held(parse(complete.replace('<div class="hero-score">1:1</div>', '<div class="hero-score">2:1</div>')), 'GOAL_SCORE_MISMATCH')
})

test('jersey number does not replace a missing explicit starting goalkeeper heading', () => {
  held(parse(complete.replace('BRAMKARZ', 'POMOCNICY')), 'STARTING_GK_COUNT')
})

test('substitute entering after already being a starter is an invalid interval', () => {
  held(parse(complete.replace('Piernikarczyk Jakub', 'Dudek Adam')), 'SUBSTITUTION_STATE')
})

test('unknown card actor is not discarded or guessed', () => {
  held(parse(complete.replace('Oliwer Mansfeld', 'Unknown Card Actor')), 'ACTOR_UNIDENTIFIED')
})

test('unknown event icon holds otherwise complete published report', () => {
  held(parse(complete.replace('🟨', '❓')), 'EVENT_UNKNOWN')
})

test('second yellow requires the explicit observed red; no dismissal clock is invented', () => {
  held(parse(complete.replace('🟥', '❓')), 'SECOND_YELLOW_RED_MISSING')
})

test('unsupported added-time clock is held instead of silently changing the minute', () => {
  held(parse(complete.replace("83'", "90' +3'")), 'CLOCK_UNSUPPORTED')
})

test('hidden/script/template/widget decoys do not add players/events or change report scope', () => {
  const decoy = '<div class="grid-item starters away"><div class="formation-header">BRAMKARZ</div><a class="player-entry" href="https://concordiaknurow.pl/player/fake/"><div class="p-name">Fake Actor</div></a></div><div class="timeline-row"><div class="tm-min">7\'</div><div class="tm-icon">⚽</div><div class="tm-info">Fake Actor</div></div>'
  let html = complete.replace('<div class="match-data-tabs">', `<aside class="widget">${decoy}</aside><script>${decoy}</script><template>${decoy}</template><div hidden>${decoy}</div><div style="display:none">${decoy}</div><div class="match-data-tabs">`)
  html = html.replace('<div class="tab-content active" id="timeline">', `<div class="tab-content active" id="timeline"><div aria-hidden="true">${decoy}</div>`)
  const r = parse(html)
  assert.equal(r.reportStatistikaPripravljena, true)
  assert.equal(r.events.length, 14)
  assert.equal(r.appearances.length, 27)
})

for (const [label, change, observedUrl, code] of [
  ['different canonical', h => h.replace('rel="canonical"', 'rel="canonical"').replace(`href="${url}"`, 'href="https://concordiaknurow.pl/event/other/"'), url, 'CANONICAL_MISMATCH'],
  ['foreign host', h => h, 'https://example.com/event/sosnica-gliwice-vs-silesia-miechowice/', 'URL_SCOPE'],
  ['non-report body', h => h.replace('single-sp_event', 'single-sp_player'), url, 'REPORT_SCOPE'],
  ['missing main', h => h.replace('event-main-content', 'sidebar-content'), url, 'REPORT_SCOPE'],
  ['missing canonical', h => h.replace(/<link[^>]+rel="canonical"[^>]*>/, ''), url, 'CANONICAL_MISSING'],
]) test(`${label} cannot emit individually usable statistics`, () => held(parse(change(complete), observedUrl), code))

test('canonical URL is the fallback source identity, never a fabricated match UUID', () => {
  const r = parse(complete.replace('postid-10136', ''))
  assert.equal(r.sourceId, url)
  assert.equal(r.reportStatistikaPripravljena, true)
})

test('pure parsing leaves input/options/fixture bytes unchanged and is deterministic', () => {
  const before = createHash('sha256').update(complete).digest('hex')
  assert.deepEqual(parse(), parse())
  assert.equal(createHash('sha256').update(complete).digest('hex'), before)
  assert.equal(parse().rawSha256, before)
  assert.equal(readFileSync(new URL('./vzorci/pl-ckm-complete.html', import.meta.url), 'utf8'), complete)
})

// The CLI must consume only the supplied local bytes and never treat URL as a fetch target.
const { spawnSync } = await import('node:child_process')
const cli = new URL('./preveri-ckm-zapisnik.mjs', import.meta.url)
const fixturePath = new URL('./vzorci/pl-ckm-complete.html', import.meta.url)
const { fileURLToPath } = await import('node:url')
function runCli(args) {
  return spawnSync(process.execPath, [fileURLToPath(cli), ...args], { encoding: 'utf8' })
}
test('CLI screens exact local report with observed URL and leaves bytes unchanged', () => {
  const before = readFileSync(fixturePath)
  const r = runCli(['--datoteka', fileURLToPath(fixturePath), '--url', url])
  assert.equal(r.status, 0, r.stderr)
  const output = JSON.parse(r.stdout)
  assert.equal(output.reportStatistikaPripravljena, true)
  assert.equal(output.sezonskiUvozPodprt, false)
  assert.deepEqual(readFileSync(fixturePath), before)
})
test('CLI emits held evidence with exit 2 for authentic missing away lineup', () => {
  const r = runCli(['--datoteka', fileURLToPath(new URL('./vzorci/pl-ckm-partial.html', import.meta.url)), '--url', 'https://concordiaknurow.pl/event/burza-borowa-wies-vs-walka-zabrze/'])
  assert.equal(r.status, 2, r.stderr)
  held(JSON.parse(r.stdout), 'STARTER_COUNT')
})
for (const args of [[], ['--url', url], ['--datoteka', '/nonexistent-report.html', '--url', url],
  ['--datoteka', fileURLToPath(fixturePath)], ['--fetch', url],
  ['--datoteka', fileURLToPath(fixturePath), '--url', url, '--url', url]]) {
  test(`CLI rejects malformed/local-file-missing arguments without JSON success: ${JSON.stringify(args)}`, () => {
    const r = runCli(args)
    assert.equal(r.status, 1)
    assert.equal(r.stdout, '')
    assert.match(r.stderr, /ckm:/)
  })
}

const wrapBody = (html, tag) => html.replace(/(<body\b[^>]*>)/, `$1<${tag}>`).replace('</body>', `</${tag}></body>`)
for (const tag of ['textarea', 'xmp', 'iframe', 'title', 'noembed', 'noscript', 'template', 'script', 'style', 'svg', 'math']) {
  test(`literal/inert ${tag} body contents cannot become a report`, () => {
    held(parse(wrapBody(complete, tag)), 'REPORT_SCOPE')
  })
}
for (const tag of ['textarea', 'xmp', 'iframe', 'title', 'noembed', 'noscript', 'template', 'script', 'style', 'svg', 'math']) {
  test(`fake outer closing tags in ${tag} cannot escape their fragment`, () => {
    const decoy = `<${tag}></div></div></body><div class="event-main-content">not a report</div></${tag}>`
    const r = parse(complete.replace('<div class="event-main-content">', `<div class="event-main-content">${decoy}`))
    assert.equal(r.reportStatistikaPripravljena, true, JSON.stringify(r.issues))
    assert.equal(r.appearances.length, 27)
    assert.equal(r.events.length, 14)
  })
}
test('nested template boundaries respect a raw-text fragment containing a fake template end tag', () => {
  const fragment = '<template><template><textarea></template></div></textarea></template></template>'
  const r = parse(complete.replace('<div class="event-main-content">', `<div class="event-main-content">${fragment}`))
  assert.equal(r.reportStatistikaPripravljena, true, JSON.stringify(r.issues))
  assert.equal(r.appearances.length, 27)
})
for (const tag of ['textarea', 'xmp', 'iframe', 'title', 'noembed', 'noscript', 'template', 'script', 'style', 'svg', 'math']) {
  test(`unclosed ${tag} after an otherwise complete report fails closed`, () => {
    held(parse(complete.replace('</body>', `<${tag}></body>`)), 'HTML_UNCLOSED_INERT')
  })
}
test('unsupported plaintext remainder fails closed rather than reading literal report markup', () => {
  held(parse(wrapBody(complete, 'plaintext')), 'HTML_INERT_UNSUPPORTED')
})
test('unclosed comment after report fails closed instead of accepting uncertain document boundaries', () => {
  held(parse(complete.replace('</body>', '<!-- </body>')), 'HTML_UNCLOSED_COMMENT')
})
for (const [label, mutate] of [
  ['body class', h => h.replace('<body class=', '<body class="unrelated" class=')],
  ['canonical href', h => h.replace('<link href=', '<link href="https://example.com/" href=')],
]) test(`duplicate ${label} attributes cannot use last-attribute-wins parsing to accept a report`, () => {
  held(parse(mutate(complete)), 'HTML_DUPLICATE_ATTRIBUTE')
})
for (const [label, mutate] of [
  ['score box', h => h.replace('<div class="hero-score-box">', '<div class="hero-score-box">conflicting</div><div class="hero-score-box">')],
  ['details bar', h => h.replace('<div class="match-details-bar">', '<div class="match-details-bar">conflicting</div><div class="match-details-bar">')],
]) test(`multiple primary ${label} sections are ambiguous, not first-match wins`, () => {
  held(parse(mutate(complete)), 'HEADER_AMBIGUOUS')
})
test('malformed tag boundary within an inert fragment fails closed instead of leaking later report scope', () => {
  const fragment = '<template></unfinished</template>'
  held(parse(complete.replace('<div class="event-main-content">', `<div class="event-main-content">${fragment}`)), 'HTML_TOKEN_UNSUPPORTED')
})
test('unsupported case-variant CDATA remainder cannot hide an unclosed boundary after a report', () => {
  held(parse(complete.replace('</body>', '<![cdata[</body>')), 'HTML_INERT_UNSUPPORTED')
})
for (const [label, before, after] of [
  ['score', '<div class="hero-score">1:1</div>', '<div class="hero-score">1:1</div><div class="hero-score">9:9</div>'],
  ['team name', '<h2>Sośnica Gliwice</h2>', '<h2>Sośnica Gliwice</h2><h2>Other Club</h2>'],
  ['league/round label', 'III LIGA ŚLĄSKA | 10 KOLEJKA', 'III LIGA ŚLĄSKA | 10 KOLEJKA</div><div>OTHER LEAGUE | 99 KOLEJKA'],
]) test(`duplicate primary ${label} fields cannot silently select the first value`, () => {
  const changed = complete.replace(before, after)
  assert.notEqual(changed, complete, 'fixture mutation must affect the real primary field')
  held(parse(changed), 'HEADER_AMBIGUOUS')
})
test('unsupported double-escaped script data cannot expose a literal report after its first apparent close', () => {
  const changed = complete.replace(/(<body\b[^>]*>)/, '$1<script><!--<script></script>').replace('</body>', '</script></body>')
  held(parse(changed), 'HTML_INERT_UNSUPPORTED')
})
