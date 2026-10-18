import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeHnsWomenFixtures, normalizeHnsWomenReport } from './hns-zenske.mjs'

const captured = JSON.parse(readFileSync(new URL('../vzorci/hns-zenske-archive-phase-fixtures.json', import.meta.url)))
const phases = [
  ['base', 'Magenta liga - Liga'],
  ['playoff', 'Magenta liga 25/26 Play off'],
  ['playout', 'Magenta liga 25/26 Play out'],
]
const rowHtml = t => `<li class="row" data-round="${t.krog}" data-match="${t.id}"><div class="date">${t.datum.slice(8)}.${t.datum.slice(5,7)}.${t.datum.slice(0,4)}. ${t.ura ?? ''}</div><div class="club1" data-id="${t.domaciId}"><a>${t.domaci}</a></div><div class="res1">${t.izid?.domaci ?? '-'}</div><div class="res2">${t.izid?.gostje ?? '-'}</div><div class="club2" data-id="${t.gostjeId}"><a>${t.gostje}</a></div><div class="link"></div></li>`
const archiveHtml = () => `<div class="current_results_tabs"><div class="tabs">${phases.map(([, label], i) => `<li data-content="tabContent_10001_${i+1}"><span>${label}</span></li>`).join('')}</div>${phases.map(([phase], i) => `<div id="tabContent_10001_${i+1}"><div class="current_results">${captured.fixtures.filter(t => t.publishedPhase === phase).map(rowHtml).join('')}</div></div>`).join('')}</div>`

test('published archive phase mapping retains75unique fixtures and removes all3round/club overwrite pairs', () => {
  const fixtures = normalizeHnsWomenFixtures(archiveHtml(), '108043476')
  assert.equal(fixtures.length, 75)
  assert.equal(new Set(fixtures.map(t => t.id)).size, 75)
  assert.equal(new Set(fixtures.map(t => `${t.krog}:${t.domaciId}:${t.gostjeId}`)).size, 75)
  assert.equal(new Set(captured.fixtures.map(t => `${t.krog}:${t.domaciId}:${t.gostjeId}`)).size, 72)
  for (const original of captured.fixtures) {
    const fixture = fixtures.find(t => t.id === original.id)
    assert.equal(fixture.sourceRound, original.krog)
    assert.equal(fixture.sourcePhase, phases.find(([key]) => key === original.publishedPhase)[1])
    assert.equal(fixture.krog, original.krog + (original.publishedPhase === 'base' ? 0 : 14))
    assert.deepEqual(fixture.izid, original.izid)
    assert.equal(fixture.datum, original.datum)
  }
  for (const [a,b] of [['100511752','108056175'],['100511754','108056176'],['100511772','108056184']]) assert.notEqual(fixtures.find(t => t.id === a).krog, fixtures.find(t => t.id === b).krog)
})

test('current first phase preserves rawrounds and date-only kickoff', () => {
  const t = { id:'114471646', krog:9, datum:'2026-10-25', ura:null, domaci:'ŽNK Donat', gostje:'ŽNK Osijek', domaciId:'107347', gostjeId:'171', izid:null }
  const fixtures = normalizeHnsWomenFixtures(`<div class="current_results">${rowHtml(t)}</div>`, '114471579')
  assert.deepEqual(fixtures, [{...t, sourceRound:9, sourcePhase:null}])
})

test('future phase handover or an unrelated source competition fails closed', () => {
  assert.throws(() => normalizeHnsWomenFixtures(archiveHtml(), '114471579'), /phase|handover/i)
  assert.throws(() => normalizeHnsWomenFixtures(archiveHtml(), '100511683'), /competition|container/i)
  const t = { ...captured.fixtures[0], krog:15 }
  assert.throws(() => normalizeHnsWomenFixtures(`<div class="current_results">${rowHtml(t)}</div>`, '114471579'), /round|phase/i)
})

for (const change of [
  s => s.replace('Magenta liga 25/26 Play off', 'Unknown phase'),
  s => s.replace('id="tabContent_10001_2"', 'id="missing"'),
  s => s.replace('data-match="108056162"', 'data-match="100511726"'),
  s => s.replace('data-round="1" data-match="108056162"', 'data-round="13" data-match="108056162"'),
  s => s.replace(/<li class="row"[^>]*data-match="100511726"[\s\S]*?<div class="link"><\/div><\/li>/, ''),
]) {
  test('rejects ambiguous, unknown, out-of-range or incomplete published phase facts', () => {
    const original = archiveHtml(), changed = change(original)
    assert.notEqual(changed, original)
    assert.throws(() => normalizeHnsWomenFixtures(changed, '108043476'), /phase|round|fixture|duplicate/i)
  })
}

test('report normalization preserves source round and refuses source/report disagreement', () => {
  const fixture = normalizeHnsWomenFixtures(archiveHtml(), '108043476').find(t => t.id === '108056175')
  const report = { zapisnikId:fixture.id, krog:fixture.sourceRound, datum:fixture.datum, sezona:'2025/26', rezultat:fixture.izid }
  const normalized = normalizeHnsWomenReport(report, fixture)
  assert.equal(normalized.krog, fixture.krog)
  assert.equal(normalized.sourceRound, fixture.sourceRound)
  assert.equal(normalized.sourcePhase, fixture.sourcePhase)
  assert.equal(report.krog, fixture.sourceRound) // Do not mutate the parsed source object.
  for (const change of [{ krog:99 }, { zapisnikId:'wrong' }, { datum:'2026-01-01' }, { rezultat:{domaci:99,gostje:0} }]) assert.throws(() => normalizeHnsWomenReport({...report,...change}, fixture), /report|fixture|round|result/i)
})

test('published tab boundary excludes repeated match lists later in source page', () => {
  const html = archiveHtml() + `<div class="current_results">${captured.fixtures.map(rowHtml).join('')}</div>`
  assert.equal(normalizeHnsWomenFixtures(html,'108043476').length,75)
})
