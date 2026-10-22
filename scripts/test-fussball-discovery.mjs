import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const sample = name => readFileSync(new URL(`./vzorci/${name}`, import.meta.url), 'utf8')
const round = sample('de-fussball-krog9-20261022.html')
const report = sample('de-fussball-ilvesheim-main.html')
const lineup = sample('de-fussball-ilvesheim-lineup.html')
const cssDate = sample('de-fussball-0vtt1mjz.css')
const cssScore = sample('de-fussball-cf5j3ftt.css')
const staffel = '031EKNM2HG00000LVS5489BUVUR5FS5A-G'
const matchId = '031EQBPLF4000000VS5489BTVUS470OH'

const discovery = await import('./viri/fussball-discovery.mjs').catch(e => {
  if (e.code === 'ERR_MODULE_NOT_FOUND') return {}
  throw e
})
const stats = await import('./viri/fussball-statistika.mjs')

test('fresh round discovery binds canonical identity, scope, live fonts and the observed CSS template', () => {
  assert.equal(typeof discovery.inspectFussballPage, 'function', 'page discovery export exists')
  const result = discovery.inspectFussballPage(round, {kind: 'round', staffel})
  const canonical = 'https://www.fussball.de/spieltag/kreisliga-mannheim-kreis-mannheim-kreisliga-herren-saison2627-baden/-/staffel/031EKNM2HG00000LVS5489BUVUR5FS5A-G'
  assert.equal(result.url, canonical)
  assert.deepEqual(result.fontIds, ['0vtt1mjz', 'cf5j3ftt'])
  assert.equal(result.cssTemplate, 'https://www.fussball.de/export.fontface/-/id/%ID%/type/css')
  assert.equal(result.lineupUrl, null)
})

test('report discovery derives only the matching real lineup tab and live report fonts', () => {
  assert.equal(typeof discovery.inspectFussballPage, 'function', 'page discovery export exists')
  const result = discovery.inspectFussballPage(report, {kind: 'report', matchId})
  assert.equal(result.url, `https://www.fussball.de/spiel/spvgg-03-ilvesheim-sg-oftersheim/-/spiel/${matchId}`)
  assert.equal(result.lineupUrl, `https://www.fussball.de/ajax.match.lineup/-/mode/PAGE/spiel/${matchId}/ticker-id/selectedTickerId`)
  assert.ok(result.fontIds.length > 0)
  assert.deepEqual(result.fontIds, [...new Set(result.fontIds)].sort())
  assert.ok(result.fontIds.every(id => /^[a-z0-9]{8}$/.test(id)))
})

test('live font discovery ignores comments, raw text, templates and markup-shaped attributes', () => {
  assert.equal(typeof discovery.inspectFussballPage, 'function', 'page discovery export exists')
  const decoyId = 'zzzzzzzz'
  const altered = round
    .replace('</head>', `<!-- <meta property="og:url" content="https://www.fussball.de/spieltag/wrong/-/staffel/${staffel}"><span data-obfuscation="${decoyId}"> --><script>"<span data-obfuscation='${decoyId}'>"</script></head>`)
    .replace('<body ', `<body data-note="<span data-obfuscation='${decoyId}'>" `)
    .replace('<body ', '<template><span data-obfuscation="yyyyyyyy"></span></template><body ')
  const result = discovery.inspectFussballPage(altered, {kind: 'round', staffel})
  assert.deepEqual(result.fontIds, ['0vtt1mjz', 'cf5j3ftt'])
})

test('page identity must be unique, same-host, matching and scoped to the requested page', () => {
  assert.equal(typeof discovery.inspectFussballPage, 'function', 'page discovery export exists')
  const canonical = 'https://www.fussball.de/spieltag/kreisliga-mannheim-kreis-mannheim-kreisliga-herren-saison2627-baden/-/staffel/031EKNM2HG00000LVS5489BUVUR5FS5A-G'
  assert.throws(() => discovery.inspectFussballPage(round.replace('</head>', `<link rel="canonical" href="${canonical}"></head>`), {kind: 'round', staffel}))
  assert.throws(() => discovery.inspectFussballPage(round.replace('og:url" content="https://www.fussball.de', 'og:url" content="https://elsewhere.invalid'), {kind: 'round', staffel}))
  assert.throws(() => discovery.inspectFussballPage(round, {kind: 'round', staffel: `${staffel.slice(0, -1)}Z`}))
  assert.throws(() => discovery.inspectFussballPage(report, {kind: 'report', matchId: `${matchId.slice(0, -1)}Z`}))
})

test('a report lineup URL must come from one real match-course tab bound to the requested ID', () => {
  assert.equal(typeof discovery.inspectFussballPage, 'function', 'page discovery export exists')
  const tab = `https://www.fussball.de/ajax.match.lineup/-/mode/PAGE/spiel/${matchId}/ticker-id/selectedTickerId`
  const conflictingId = `${matchId.slice(0, -2)}AH`
  assert.throws(() => discovery.inspectFussballPage(report.replace(`href="${tab}"`, `href="${tab.replace(matchId, conflictingId)}"`), {kind: 'report', matchId}))
  const badTarget = report.replace(/<a\b(?=[^>]*ajax\.match\.lineup)[^>]*>/, tag => tag.replace('data-ajax-target="#match_course_body"', 'data-ajax-target="#other"'))
  assert.throws(() => discovery.inspectFussballPage(badTarget, {kind: 'report', matchId}))
  assert.throws(() => discovery.inspectFussballPage(report.replace(`href="${tab}"`, `href="${tab.replace('https://www.fussball.de', 'https://attacker.invalid')}"`), {kind: 'report', matchId}))
  const altered = report.replace('</body>', `<a data-match-course-tab data-ajax data-ajax-target="#match_course_body" href="${tab}" data-ajax-resource="${tab}">Aufstellung</a></body>`)
  assert.throws(() => discovery.inspectFussballPage(altered, {kind: 'report', matchId}))
})

test('lineup font scan runs only after the existing strict lineup proof and returns sorted unique IDs', () => {
  assert.equal(typeof stats.inspectFussballLineup, 'function', 'strict lineup font scanner export exists')
  const ids = stats.inspectFussballLineup(lineup)
  assert.deepEqual(ids, [...new Set(ids)].sort())
  assert.ok(ids.length > 0)
  assert.ok(ids.every(id => /^[a-z0-9]{8}$/.test(id)))
  assert.throws(() => stats.inspectFussballLineup(lineup.replace('match_course_body', 'not_match_course_body')))
})

test('font CSS resolves only the requested observed same-host WOFF route', () => {
  assert.equal(typeof discovery.fussballFontUrl, 'function', 'font CSS resolver export exists')
  assert.equal(discovery.fussballFontUrl(cssDate, '0vtt1mjz'), 'https://www.fussball.de/export.fontface/-/format/woff/id/0vtt1mjz/type/font')
  assert.equal(discovery.fussballFontUrl(cssScore, 'cf5j3ftt'), 'https://www.fussball.de/export.fontface/-/format/woff/id/cf5j3ftt/type/font')
  for (const bad of [
    `@import url(https://attacker.invalid/x);${cssDate}`,
    cssDate.replace('font-0vtt1mjz', 'font-aaaaaaaa'),
    cssDate.replace('/woff/id/0vtt1mjz/', '/woff/id/aaaaaaaa/'),
    `${cssDate}body { background:url(https://attacker.invalid/x) }`,
    cssDate.replace('//www.fussball.de/', '//attacker.invalid/'),
  ]) assert.throws(() => discovery.fussballFontUrl(bad, '0vtt1mjz'))
})
