// Opt-in phase normalization for the audited senior women's containers only.
// This module makes no requests and does not change the ordinary HNS provider.
import { vrsticeRazporeda, sezonaIzDatuma } from './hns.mjs'

const PHASES = [
  { tab: '1', label: 'Magenta liga - Liga', offset: 0, maxRound: 14, count: 42 },
  { tab: '2', label: 'Magenta liga 25/26 Play off', offset: 14, maxRound: 12, count: 24 },
  { tab: '3', label: 'Magenta liga 25/26 Play out', offset: 14, maxRound: 9, count: 9 },
]
const fail = message => { throw new Error(`hns women phase: ${message}`) }

// End the published tab at its matching div, before the page's repeated match lists.
function tabFragment(html, start) {
  const tags = /<\/?div\b[^>]*>/g
  tags.lastIndex = start
  let depth = 0
  for (let tag; (tag = tags.exec(html));) {
    depth += /^<\//.test(tag[0]) ? -1 : 1
    if (depth === 0) return html.slice(start, tags.lastIndex)
  }
  fail('unterminated published phase container')
}

/** Source phase/round remain explicit; internal krog alone receives the reviewed offset. */
export function normalizeHnsWomenFixtures(html, sourceCompetitionId) {
  if (!['114471579', '108043476'].includes(sourceCompetitionId)) fail('unreviewed source competition/container')
  const results = /<div\b[^>]*\bclass="[^"]*\bcurrent_results(?:_tabs)?\b[^"]*"[^>]*>/.exec(html)
  if (!results) fail('missing fixture results container')
  html = tabFragment(html, results.index)
  if (sourceCompetitionId === '114471579') {
    if (/tabContent_10001_/.test(html)) fail('current phase handover requires review')
    const fixtures = vrsticeRazporeda(html)
    if (!fixtures.length) fail('no current fixtures')
    for (const t of fixtures) if (t.krog < 1 || t.krog > 14) fail('unknown current phase round')
    return fixtures.map(t => ({ ...t, sourceRound: t.krog, sourcePhase: null }))
  }
  if (sourceCompetitionId !== '108043476') fail('unreviewed source competition/container')
  const labels = [...html.matchAll(/<li\b[^>]*\bdata-content="tabContent_10001_(\d+)"[^>]*>([\s\S]*?)<\/li>/g)]
  const tabs = [...html.matchAll(/<div\b[^>]*\bid="tabContent_10001_(\d+)"[^>]*>/g)]
  if (labels.length !== PHASES.length || tabs.length !== PHASES.length) fail('missing or unexpected published phase tabs')
  const fixtures = [], ids = new Set(), keys = new Set()
  for (const phase of PHASES) {
    const label = labels.filter(m => m[1] === phase.tab)
    if (label.length !== 1 || label[0][2].replace(/<[^>]+>/g, '').trim() !== phase.label) fail('unknown or ambiguous published phase label')
    const tab = tabs.filter(m => m[1] === phase.tab)
    if (tab.length !== 1) fail('unknown or ambiguous published phase container')
    const rows = vrsticeRazporeda(tabFragment(html, tab[0].index))
    if (rows.length !== phase.count) fail(`incomplete ${phase.label} fixture count`)
    for (const t of rows) {
      if (t.krog < 1 || t.krog > phase.maxRound) fail('source round outside published phase range')
      if (ids.has(t.id)) fail('duplicate source fixture across phases')
      ids.add(t.id)
      const normalized = { ...t, sourceRound: t.krog, sourcePhase: phase.label, krog: t.krog + phase.offset }
      const key = `${normalized.krog}:${t.domaciId}:${t.gostjeId}`
      if (keys.has(key)) fail('duplicate normalized round/club fixture')
      keys.add(key)
      fixtures.push(normalized)
    }
  }
  const all = vrsticeRazporeda(html)
  if (all.length !== fixtures.length || all.some(t => !ids.has(t.id))) fail('fixture outside reviewed phases')
  return fixtures
}

/** Parsed source facts must agree before changing its internal round. Does not mutate the source. */
export function normalizeHnsWomenReport(report, fixture) {
  if (!report || String(report.zapisnikId) !== fixture.id || report.krog !== fixture.sourceRound || report.datum !== fixture.datum || report.sezona !== sezonaIzDatuma(fixture.datum)) fail('report identity/date/source round differs from fixture')
  if (!fixture.izid || report.rezultat?.domaci !== fixture.izid.domaci || report.rezultat?.gostje !== fixture.izid.gostje) fail('report result differs from published fixture')
  return { ...report, sourceRound: fixture.sourceRound, sourcePhase: fixture.sourcePhase, krog: fixture.krog }
}
