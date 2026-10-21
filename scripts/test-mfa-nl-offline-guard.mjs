import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const moduleURL = new URL('./mfa-nl-offline-guard.mjs', import.meta.url)
test('sealed replay serves retained MFA bytes and forbids missing, foreign or mutating provider requests', async () => {
  assert.ok(existsSync(moduleURL))
  const { installMfaSealedGuard } = await import(moduleURL)
  const dir = mkdtempSync(join(tmpdir(), 'slff-mfa-offline-test-')), calls = [], original = globalThis.fetch
  writeFileSync(join(dir, 'tekma-123-izid.json'), '{"homeScore":"2"}')
  globalThis.fetch = async (...args) => { calls.push(args); return new Response('{}') }
  try {
    installMfaSealedGuard({ league: 'mt-nl2', cacheRoot: dir, logPath: join(dir, 'reads.jsonl'), databaseURL: 'https://db.example' })
    const r = await fetch('https://api.mfa.com.mt/api/matches/123/result')
    assert.equal(await r.text(), '{"homeScore":"2"}')
    await fetch('https://db.example/rest/v1/players', { method: 'POST', body: '{}' })
    for (const [url, options] of [['https://api.mfa.com.mt/api/matches/124/result', {}], ['https://api.mfa.com.mt/api/competitions/58539/standings?season=2026', {}], ['https://api.mfa.com.mt/api/matches/123/result', { method: 'POST' }], ['https://external.example/', {}]]) {
      await assert.rejects(fetch(url, options), /MFA sealed replay/)
    }
    assert.equal(calls.length, 1, 'only the database request reaches the real transport')
    const log = JSON.parse(readFileSync(join(dir, 'reads.jsonl'), 'utf8').trim())
    assert.equal(log.actualProviderRequests, 0)
    assert.equal(log.file, 'tekma-123-izid.json')
  } finally { globalThis.fetch = original; rmSync(dir, { recursive: true, force: true }) }
})
