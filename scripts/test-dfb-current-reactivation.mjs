import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
const sha = s => createHash('sha256').update(s).digest('hex')
const sample = () => ({ version: 3, provenanceVersion: 2, slug: 'de-regionalliga-suedwest',
  sourceCommit: 'a'.repeat(40), parserSha256: 'b'.repeat(64),
  statisticsPolicy: { id: 'reviewed', sha256: 'c'.repeat(64), firstFantasyPlayedOn: '2026-10-23' },
  seasons: ['2025/26', '2026/27'].map(season => ({ season, code: 'source-code',
    capturedAt: '2026-10-18T14:15:36.899Z', documentsSha256: 'd'.repeat(64),
    runId: '100', jobId: '200', evidenceMode: 'policy-replay', statisticsCoverage: { playedCount: 1 },
    lineage: { capture: { runId: '50', capturedAt: '2026-10-18T14:15:36.899Z', documentsSha256: 'd'.repeat(64) },
      replay: { runId: '100', commit: 'a'.repeat(40) } },
    fixtures: [{ id: 'de-dfb-1', appearances: [{ name: 'Benedikt Grawe', is_goalkeeper: true, minutes_played: 90 }] }] })) })
test('repair facts survive new execution code/jobs but retain original source capture identity', async () => {
  const { observationSha256 } = await import('./dfb-current-reactivation.mjs')
  const old = sample(), replay = structuredClone(old)
  replay.sourceCommit = 'e'.repeat(40); replay.parserSha256 = 'f'.repeat(64)
  for (const s of replay.seasons) { s.runId = '300'; s.jobId = '400'; s.lineage.replay = { runId: '300', commit: replay.sourceCommit } }
  assert.equal(observationSha256(old), observationSha256(replay))
  replay.seasons[1].lineage.capture.runId = '51'
  assert.notEqual(observationSha256(old), observationSha256(replay))
})
for (const [name, mutate] of [
  ['original capture clock', m => { m.seasons[1].capturedAt = '2026-10-18T15:00:00Z' }],
  ['participant role', m => { m.seasons[1].fixtures[0].appearances[0].is_goalkeeper = false }],
  ['participant minutes', m => { m.seasons[1].fixtures[0].appearances[0].minutes_played = 89 }],
  ['statistics coverage', m => { m.seasons[0].statisticsCoverage.playedCount = 2 }],
  ['future fantasy anchor', m => { m.statisticsPolicy.firstFantasyPlayedOn = '2026-10-24' }],
  ['unknown observation field', m => { m.seasons[1].unreviewed = true }],
]) test(`repair facts bind ${name}`, async () => {
  const { observationSha256 } = await import('./dfb-current-reactivation.mjs')
  const old = sample(), altered = structuredClone(old); mutate(altered)
  assert.notEqual(observationSha256(old), observationSha256(altered))
})
test('canonical facts encoding is deterministic with Unicode values and preserves array order', async () => {
  const { canonicalJson } = await import('./dfb-current-reactivation.mjs')
  assert.equal(canonicalJson({ z: [2, 1], a: 'Höftmann' }), '{"a":"Höftmann","z":[2,1]}')
  assert.notEqual(sha(canonicalJson([2, 1])), sha(canonicalJson([1, 2])))
})

async function receiptFixture() {
  const { approvedPlan, approvedPlanSha256, verifyRepairReceipt } = await import('./reconcile-dfb-current-players.mjs')
  const manifest = { slug: 'de-regionalliga-suedwest', sourceCommit: 'a'.repeat(40), parserSha256: 'b'.repeat(64) }
  const digest = 'c'.repeat(64)
  const receipt = { reconciled: true, mode: 'fresh', count: 29, updatedCount: 29,
    playerIds: approvedPlan.players.map(p => p.id), manifestSha256: digest,
    planSha256: approvedPlanSha256, observationSha256: approvedPlan.observationSha256,
    before: structuredClone(approvedPlan.players), after: approvedPlan.players.map(p => ({ ...p, active: true })),
    nativePreflight: { preverjeno: true, vklopljena: false, slug: manifest.slug, manifestSha256: digest,
      sourceCommit: manifest.sourceCommit, parserSha256: manifest.parserSha256 } }
  return { receipt, manifest, digest, verify: r => verifyRepairReceipt(r, manifest, digest) }
}
test('reader accepts exact29 active-only receipt and full inactive native gate', async () => {
  const { receipt, verify } = await receiptFixture()
  assert.equal(verify(receipt), receipt)
  receipt.mode = 'already-active'; receipt.updatedCount = 0
  receipt.before = structuredClone(receipt.after)
  assert.equal(verify(receipt), receipt)
})
for (const [name, mutate] of [
  ['non-boolean repair success', r => { r.reconciled = 'true' }],
  ['unverified native gate', r => { r.nativePreflight.preverjeno = false }],
  ['activated league', r => { r.nativePreflight.vklopljena = true }],
  ['price write', r => { r.after[0].value = 0 }],
  ['role write', r => { r.after[0].position = 'INVALID' }],
  ['mixed initial state', r => { r.before[0].active = true }],
  ['unapproved player count', r => { r.playerIds.pop() }],
  ['different plan', r => { r.planSha256 = 'f'.repeat(64) }],
  ['changed execution provenance', r => { r.nativePreflight.sourceCommit = 'f'.repeat(40) }],
]) test(`reader rejects ${name} in the native repair receipt`, async () => {
  const { receipt, verify } = await receiptFixture(); mutate(receipt)
  assert.throws(() => verify(receipt), /DFB current reconciliation:/)
})
test('wrong reviewed-plan opt-in refuses before any database request', async () => {
  const { reconcile } = await import('./reconcile-dfb-current-players.mjs')
  let reads = 0
  await assert.rejects(reconcile('{}', sha('{}'), '0'.repeat(64), { fetchFn: async () => { reads++; throw Error('unexpected network') } }), /exact reviewed plan SHA/)
  assert.equal(reads, 0)
})
test('closed repair requires main checkout rather than a branch or stale execution commit', async () => {
  const { requireRepairActions } = await import('./reconcile-dfb-current-players.mjs')
  const oldActions = process.env.GITHUB_ACTIONS, oldRepo = process.env.GITHUB_REPOSITORY
  process.env.GITHUB_ACTIONS = 'true'; process.env.GITHUB_REPOSITORY = 'Lovro-splichal-orhanizagi/mnzgorenjska'
  const m = { sourceCommit: 'a'.repeat(40) }
  try {
    assert.doesNotThrow(() => requireRepairActions(m, { GITHUB_REF: 'refs/heads/main', GITHUB_SHA: m.sourceCommit, SOURCE_COMMIT: m.sourceCommit }))
    assert.throws(() => requireRepairActions(m, { GITHUB_REF: 'refs/heads/test', GITHUB_SHA: m.sourceCommit, SOURCE_COMMIT: m.sourceCommit }), /main checkout/)
    assert.throws(() => requireRepairActions(m, { GITHUB_REF: 'refs/heads/main', GITHUB_SHA: 'b'.repeat(40), SOURCE_COMMIT: m.sourceCommit }), /main checkout/)
  } finally {
    if (oldActions == null) delete process.env.GITHUB_ACTIONS; else process.env.GITHUB_ACTIONS = oldActions
    if (oldRepo == null) delete process.env.GITHUB_REPOSITORY; else process.env.GITHUB_REPOSITORY = oldRepo
  }
})
