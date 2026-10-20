import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { povzetek } from './analiziraj-fscg-me1-cache.mjs'

 test('FSCG cache audit summarizes through the production COMET parser and hashes original bytes', async () => {
  const raw = readFileSync(new URL('./vzorci/me-fscg-tekma-9332053.html', import.meta.url))
  const out = await povzetek('sample', raw)
  assert.match(out.rawSha256, /^[a-f0-9]{64}$/)
  assert.equal(out.score.domaci + out.score.gostje, out.goalEvents.length)
  assert.equal(out.players.length, 29)
  assert.ok(out.players.some(p => p.position === 'GK' && p.started))
  assert.ok(Array.isArray(out.substitutions))
  assert.deepEqual(out.parserWarnings, [])
})
