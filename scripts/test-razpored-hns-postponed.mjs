import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import HNS from './viri/hns.mjs'
import { oznakaBrezIzida } from './razpored.mjs'

const html = await readFile(new URL('./vzorci/hns-rijeka-postponed-undated.html', import.meta.url), 'utf8')
const rounds = await HNS.razporedVseStrani('115228638', async () => html)
const annotate = oznakaBrezIzida(rounds, '2026-10-23')
const r1 = rounds.find((r) => r.stevilka === 1)
const postponed = r1.tekme.find((t) => t.domaci === 'HNK Goranin')
assert.equal(postponed.datum, null)
assert.equal(postponed.odigrana, false)
assert.equal(postponed.prestavljena, true)
assert.equal(annotate.brezIzida(postponed), true,
  'HNS explicitly postponed undated rows are marked as having no source result')

const standalone = rounds.find((r) => r.stevilka === 2).tekme[0]
assert.equal(standalone.datum, null)
assert.equal(Boolean(standalone.prestavljena), false)
assert.equal(annotate.brezIzida(standalone), null,
  'an undated unplayed row without the explicit postponed label stays unmarked')

const r4 = rounds.find((r) => r.stevilka === 4)
const postponedWithFuturePeer = r4.tekme.find((t) => t.gostje === 'HNK Goranin')
assert.equal(postponedWithFuturePeer.prestavljena, true)
assert.equal(annotate.brezIzida(postponedWithFuturePeer), true,
  'explicit postponed status remains sufficient when another fixture in that round is future-dated')

const unknownSource = oznakaBrezIzida([{ tekme: [{ datum: '2026-10-01' }] }], '2026-10-23')
assert.equal(unknownSource.brezIzida({ datum: null, odigrana: false, prestavljena: true }), null,
  'sources without explicit played state remain unknown')

const vanishedResults = oznakaBrezIzida([{ tekme: [
  { datum: '2026-10-01', odigrana: false },
  { datum: '2026-10-02', odigrana: false },
  { datum: '2026-10-03', odigrana: false },
] }], '2026-10-23')
assert.equal(vanishedResults.pokvarjen, true)
assert.equal(vanishedResults.brezIzida({ datum: null, odigrana: false, prestavljena: true }), null,
  'the broken-source protection still suppresses no-result inference')

const explicitlyPlayedWithoutDate = { tekme: [{ datum: null, odigrana: true, prestavljena: true }] }
assert.equal(oznakaBrezIzida([explicitlyPlayedWithoutDate], '2026-10-23')
  .brezIzida(explicitlyPlayedWithoutDate.tekme[0]), false,
'an inconsistent postponed marker cannot override an explicit played result')

console.log('HNS postponed undated fixtures: ok')
