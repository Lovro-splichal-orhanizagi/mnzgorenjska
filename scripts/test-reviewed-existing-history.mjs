import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import cleanupTargets from './policies/reviewed-existing-cleanup-targets-20261023.json' with { type: 'json' }
import {
  validateSlug,
  policyForSlug,
  verifyPreparePayload,
  verifyArtifactReceipt,
  verifyActivationPreview,
  priceCommands,
  runStage,
} from './reviewed-existing-history.mjs'

const main = 'a'.repeat(40)
const sha256 = value => createHash('sha256').update(value).digest('hex')
const candidate = validateSlug('gb-npl-midlands')
const policy = policyForSlug(candidate.slug)
const candidateTargets = cleanupTargets.competitions.find(competition=>competition.slug===candidate.slug).targets
const beforeImage = { matches: candidateTargets.map(target=>({id:target.nativeMatchId,home_goals:target.score[0],away_goals:target.score[1]})), other: [] }
const beforeImageText = JSON.stringify(beforeImage)
const prepared = {
  slug: candidate.slug,
  competitionId: candidate.id,
  policyId: policy.id,
  policySha256: policy.sha256,
  beforeImage,
  beforeImageText,
  beforeSha256: sha256(beforeImageText),
  firstFantasyPlayedOn: '2026-10-24',
  targetMatchIds: candidateTargets.map(target=>target.nativeMatchId),
}
const receiptBody = JSON.stringify({ schemaVersion: 1, mode: 'prepare', mainCommit: main, slug: candidate.slug, policyId: policy.id, policySha256: policy.sha256, data: prepared })
const zip = (...entries) => execFileSync('python3', ['-c', 'import sys,json,zipfile; z=zipfile.ZipFile(sys.stdout.buffer,"w",compression=zipfile.ZIP_DEFLATED); [z.writestr(n,v) for n,v in json.load(sys.stdin)]; z.close()'], { input: JSON.stringify(entries) })
const bytes = zip(['prepare.json', receiptBody])
const run = {
  id: 123,
  status: 'completed',
  conclusion: 'success',
  run_attempt: 1,
  head_sha: main,
  head_branch: 'main',
  event: 'workflow_dispatch',
  path: '.github/workflows/reviewed-existing-history.yml',
  repository: { full_name: 'Lovro-splichal-orhanizagi/mnzgorenjska' },
  head_repository: { full_name: 'Lovro-splichal-orhanizagi/mnzgorenjska' },
}
const artifact = {
  id: 456,
  name: 'reviewed-existing-history-123',
  expired: false,
  size_in_bytes: bytes.length,
  digest: `sha256:${sha256(bytes)}`,
  workflow_run: { id: 123, head_sha: main },
}
const lineage = {
  run,
  artifact,
  bytes,
  kind: 'prepare',
  main,
  slug: candidate.slug,
  sourceRunId: 123,
  sourceArtifactId: 456,
  sourceArtifactDigest: artifact.digest,
  approvedSha256: sha256(receiptBody),
}

test('reviewed operator admits exactly the four approved league slugs', () => {
  const approved=['gb-npl-midlands', 'gb-sfl-d1-south', 'ro-liga3-s1', 'ba-wwin-liga-bih']
  assert.deepEqual(approved.map(validateSlug).map(({ slug }) => slug), approved)
  for (const slug of ['', 'gb-npl-north', 'ro-liga3-s2', 'ua-upl', 'ba-other-league', 'GB-NPL-MIDLANDS']) assert.throws(() => validateSlug(slug))
})

test('workflow exposes only the fixed stages and slug allowlist on main', () => {
  const workflow = readFileSync(new URL('../.github/workflows/reviewed-existing-history.yml', import.meta.url), 'utf8')
  assert.match(workflow, /if: github\.repository == 'Lovro-splichal-orhanizagi\/mnzgorenjska' && github\.ref == 'refs\/heads\/main' && github\.run_attempt == 1/)
  assert.match(workflow, /options: \[prepare, apply, price, preview, activate, receipt\]/)
  assert.match(workflow, /options: \[gb-npl-midlands, gb-sfl-d1-south, ro-liga3-s1, ba-wwin-liga-bih\]/)
  assert.match(workflow, /group: reviewed-existing-history-\$\{\{ inputs\.slug \}\}/)
  assert.match(workflow, /name: reviewed-existing-history-\$\{\{ github\.run_id \}\}/)
  assert.match(workflow, /if: always\(\)/)
  assert.doesNotMatch(workflow, /default: (gb-|ro-)/)
})

test('reviewed operator policies pin exact source tuple and sourcePolicy', () => {
  assert.deepEqual(
    ['gb-npl-midlands', 'gb-sfl-d1-south', 'ro-liga3-s1', 'ba-wwin-liga-bih'].map(slug => {
      const c = validateSlug(slug)
      const p = policyForSlug(slug)
      return [c.id, c.slug, c.source, c.source_league_code, p.id, p.sha256, p.document.sourcePolicy]
    }),
    [
      [979, 'gb-npl-midlands', 'isthmian', 'npl/67d7c7bb74247876e6dae40c/2026-27', 'gb-npl-midlands-historical-unavailable-2026-10-23-v1', '5f88bd981434a2d1bb8097a71d4b62974601b0eb01758509b345c8eb6b0c6924', 'reviewed-existing-history-20261023-v1'],
      [984, 'gb-sfl-d1-south', 'isthmian', 'sfl/69d0bdf9b616bafb97331d41/2026-27', 'gb-sfl-d1-south-historical-unavailable-2026-10-23-v1', '682dbaa0e1acfb0a4a03da9da93cdc706eb0d16dc4a8df180e994f6980369a30', 'reviewed-existing-history-20261023-v1'],
      [497, 'ro-liga3-s1', 'hlf', 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1', 'ro-liga3-s1-historical-unavailable-2026-10-23-v1', 'b6686671855dfa9a6f96fa8cf67d530aa4fc4208f859e783929cb36140169329', 'reviewed-existing-history-20261023-v1'],
      [998, 'ba-wwin-liga-bih', 'nfsbih', 'wwin-liga-bih/54152223', 'ba-wwin-liga-bih-historical-unavailable-2026-10-23-v1', 'fa48230a81834fe5d182012bdf34ab5df513392f5000ad4e0186f24d5b9a1366', 'reviewed-existing-history-20261023-v1'],
    ],
  )
  assert.throws(() => verifyPreparePayload({ ...prepared, competitionId: 1234 }, candidate, policy, main))
  assert.throws(() => verifyPreparePayload({ ...prepared, targetMatchIds: [12] }, candidate, policy, main), /target match/)
})

test('the four cleanup policies pin the native SSOT target IDs exactly, including two BiH reports', () => {
  const nativeTargets=Object.fromEntries(cleanupTargets.competitions.map(target=>[target.slug,target.targets.map(entry=>entry.nativeMatchId).sort((a,b)=>a-b)]))
  assert.deepEqual(nativeTargets,{
    'gb-npl-midlands':[561922,562344],
    'gb-sfl-d1-south':[509795],
    'ro-liga3-s1':[133334],
    'ba-wwin-liga-bih':[576391,576399],
  })
  assert.deepEqual(Object.fromEntries(cleanupTargets.competitions.map(target=>[target.slug,target.expectedReportsBySeason])),{
    'gb-npl-midlands':{'2025/26':462,'2026/27':150},
    'gb-sfl-d1-south':{'2026/27':132},
    'ro-liga3-s1':{'2026/27':54},
    'ba-wwin-liga-bih':{'2026/27':49},
  })
  assert.equal(cleanupTargets.competitions.length,4)
  assert.equal(cleanupTargets.competitions.reduce((sum,target)=>sum+target.targets.length,0),6)
  for(const target of cleanupTargets.competitions) {
    const bound=policyForSlug(target.slug)
    assert.equal(bound.id,target.policyId)
    assert.equal(bound.sha256,target.policySha256)
    assert.deepEqual(bound.document.entries.map(entry=>String(entry.sourceMatchId)).sort(),target.targets.map(entry=>String(entry.sourceMatchId)).sort())
  }
  const baCandidate=validateSlug('ba-wwin-liga-bih'), baPolicy=policyForSlug(baCandidate.slug)
  const target=cleanupTargets.competitions.find(competition=>competition.slug===baCandidate.slug)
  assert.deepEqual([baCandidate.id,baCandidate.source,baCandidate.source_league_code,baPolicy.id,baPolicy.sha256], [998,'nfsbih','wwin-liga-bih/54152223',target.policyId,target.policySha256])
  const targetMatchIds=target.targets.map(entry=>entry.nativeMatchId)
  assert.deepEqual([...targetMatchIds].sort((a,b)=>a-b),[576391,576399])
  const beforeImage={matches:targetMatchIds.map(id=>({id,home_goals:1,away_goals:1})),other:[]}
  const beforeImageText=JSON.stringify(beforeImage)
  const baPrepared={slug:baCandidate.slug,competitionId:baCandidate.id,policyId:baPolicy.id,policySha256:baPolicy.sha256,beforeImage,beforeImageText,beforeSha256:sha256(beforeImageText),firstFantasyPlayedOn:'2026-10-24',targetMatchIds}
  assert.equal(verifyPreparePayload(baPrepared,baCandidate,baPolicy,main),baPrepared)
  for(const wrong of [[576391],[576391,576391],[576391,576399,12],[54152295,54152303]])assert.throws(()=>verifyPreparePayload({...baPrepared,targetMatchIds:wrong},baCandidate,baPolicy,main),/target match/)
})

test('prepare must preserve the exact before-image text and native hash', () => {
  assert.deepEqual(verifyPreparePayload(prepared, candidate, policy, main), prepared)
  for (const patch of [{ beforeSha256: '0'.repeat(64) }, { beforeImageText: `${beforeImageText} ` }, { firstFantasyPlayedOn: null }, { targetMatchIds: [] }, { policySha256: '0'.repeat(64) }]) {
    assert.throws(() => verifyPreparePayload({ ...prepared, ...patch }, candidate, policy, main))
  }
})

test('artifact receipt requires the exact successful first attempt, run, artifact, bytes, file hash and scope', () => {
  const result = verifyArtifactReceipt(lineage)
  assert.equal(result.data.beforeSha256, prepared.beforeSha256)
  for (const patch of [
    { run: { ...run, run_attempt: 2 } },
    { run: { ...run, head_branch: 'feature' } },
    { run: { ...run, head_repository: { full_name: 'attacker/fork' } } },
    { run: { ...run, conclusion: 'failure' } },
    { artifact: { ...artifact, id: 457 } },
    { artifact: { ...artifact, digest: `sha256:${'0'.repeat(64)}` } },
    { sourceArtifactId: 457 },
    { sourceArtifactDigest: `sha256:${'0'.repeat(64)}` },
    { approvedSha256: '0'.repeat(64) },
    { kind: 'preview' },
  ]) assert.throws(() => verifyArtifactReceipt({ ...lineage, ...patch }))
  const extraFile = zip(['prepare.json', receiptBody], ['other.json', '{}'])
  assert.throws(() => verifyArtifactReceipt({ ...lineage, bytes: extraFile, artifact: { ...artifact, size_in_bytes: extraFile.length, digest: `sha256:${sha256(extraFile)}` } }))
})

test('artifact verifier accepts realistic multi-megabyte before images and rejects oversized receipts', () => {
  const largeBeforeImage = { matches: [{ id: candidateTargets[0].nativeMatchId, imported: 'x'.repeat(2_300_000) }, ...candidateTargets.slice(1).map(target=>({id:target.nativeMatchId}))], other: [] }
  const largeBeforeImageText = JSON.stringify(largeBeforeImage)
  const largePrepared = { ...prepared, beforeImage: largeBeforeImage, beforeImageText: largeBeforeImageText, beforeSha256: sha256(largeBeforeImageText) }
  const largeBody = JSON.stringify({ schemaVersion: 1, mode: 'prepare', mainCommit: main, slug: candidate.slug, policyId: policy.id, policySha256: policy.sha256, data: largePrepared })
  assert.ok(Buffer.byteLength(largeBody) > 2 * 1024 * 1024)
  const largeBytes = zip(['prepare.json', largeBody])
  const largeArtifact = { ...artifact, size_in_bytes: largeBytes.length, digest: `sha256:${sha256(largeBytes)}` }
  assert.equal(verifyArtifactReceipt({ ...lineage, artifact: largeArtifact, bytes: largeBytes, sourceArtifactDigest: largeArtifact.digest, approvedSha256: sha256(largeBody) }).data.beforeSha256, largePrepared.beforeSha256)

  const hugeBody = JSON.stringify({ schemaVersion: 1, mode: 'prepare', mainCommit: main, slug: candidate.slug, policyId: policy.id, policySha256: policy.sha256, padding: 'z'.repeat(64 * 1024 * 1024) })
  const hugeBytes = zip(['prepare.json', hugeBody])
  const hugeArtifact = { ...artifact, size_in_bytes: hugeBytes.length, digest: `sha256:${sha256(hugeBytes)}` }
  assert.throws(() => verifyArtifactReceipt({ ...lineage, artifact: hugeArtifact, bytes: hugeBytes, sourceArtifactDigest: hugeArtifact.digest, approvedSha256: sha256(hugeBody) }))
})

test('activation requires an externally reviewed ready preview SHA for the same slug and commit', () => {
  const preview = {
    ready: true, active: false, reason: null, slug: candidate.slug, competitionId: candidate.id,
    mainCommit: main, policyId: policy.id, policySha256: policy.sha256,
    markers: { sourcePolicy: 'reviewed-existing-history-20261023-v1' }, firstRound: 12,
    firstDeadline: '2026-10-24T10:00:00Z', firstPlayedOn: '2026-10-24', cheapestLegal15: 99.5,
    priceSha256: 'b'.repeat(64), previewSha256: 'c'.repeat(64),
  }
  assert.equal(verifyActivationPreview(preview, { slug: candidate.slug, main, expectedPreviewSha256: preview.previewSha256 }).previewSha256, preview.previewSha256)
  for (const patch of [{ ready: false }, { active: true }, { slug: 'gb-sfl-d1-south' }, { mainCommit: 'd'.repeat(40) }, { previewSha256: 'd'.repeat(64) }]) {
    assert.throws(() => verifyActivationPreview({ ...preview, ...patch }, { slug: candidate.slug, main, expectedPreviewSha256: preview.previewSha256 }))
  }
  assert.deepEqual(priceCommands(candidate.slug), [
    ['scripts/lazni-vratarji.mjs', '--tekmovanje', candidate.slug, '--pisi'],
    ['scripts/ugani-pozicije.mjs', '--tekmovanje', candidate.slug, '--pisi'],
    ['scripts/ovrednoti-igralce.mjs', '--tekmovanje', candidate.slug, '--pisi'],
  ])
})

const baseEnv = overrides => ({
  MODE: 'activate', SLUG: candidate.slug, EXPECTED_SHA: main, GITHUB_SHA: main, GITHUB_REF: 'refs/heads/main',
  GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Lovro-splichal-orhanizagi/mnzgorenjska', GITHUB_RUN_ATTEMPT: '1', GITHUB_RUN_ID: '123',
  GITHUB_WORKFLOW_REF: 'Lovro-splichal-orhanizagi/mnzgorenjska/.github/workflows/reviewed-existing-history.yml@refs/heads/main',
  SUPABASE_URL: 'https://db.example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-key', ...overrides,
})
const nativeCleanupReceipt = ({ prices = true, active = false, claimed = prices } = {}) => ({
  cleanup: { slug: candidate.slug, mainCommit: main, policySha256: policy.sha256, beforeSha256: 'e'.repeat(64), afterSha256: 'f'.repeat(64), removedAppearances: 3, removedGoals: 2, unavailableMatches: 1, recordedAt: '2026-10-23T10:00:00Z' },
  ...(claimed ? { priceClaim: { slug: candidate.slug, mainCommit: main, policySha256: policy.sha256, cleanupBeforeSha256: 'e'.repeat(64), footballStateSha256: 'a'.repeat(64), claimedAt: '2026-10-23T10:01:00Z' } } : {}),
  ...(prices ? { prices: { slug: candidate.slug, mainCommit: main, policySha256: policy.sha256, cleanupBeforeSha256: 'e'.repeat(64), priceSha256: 'b'.repeat(64), footballStateSha256: 'a'.repeat(64), recordedAt: '2026-10-23T10:00:00Z' } } : {}),
  competitions: [{ id: candidate.id, slug: candidate.slug, active, markers: { installed: true, policyId: policy.id, policySha256: policy.sha256, firstFantasyPlayedOn: '2026-10-24', markers: policy.document.entries.map(entry=>({ sourceMatchId: entry.sourceMatchId, policyId: policy.id, policySha256: policy.sha256 })) } }],
})
const validPreview = () => ({
  ready: true, active: false, reason: null, slug: candidate.slug, competitionId: candidate.id, mainCommit: main,
  policyId: policy.id, policySha256: policy.sha256, markers: { installed: true }, firstRound: 12,
  firstDeadline: '2026-10-24T10:00:00Z', firstPlayedOn: '2026-10-24', cheapestLegal15: 99.5,
  priceSha256: 'b'.repeat(64), previewSha256: 'c'.repeat(64),
})
const exactCompetition = () => ({ ...candidate, active: false, source_policy: null, prvi_fantasy_krog: null })

test('native preview holds preserve their reason and never attempt activation', async () => {
  const calls = [], saved = []
  const reason = 'Unresolved historical dismissal clock'
  await assert.rejects(() => runStage(baseEnv({ MODE: 'preview' }), {
    assertMain: async () => {}, readCompetition: async () => exactCompetition(),
    call: async (path, body) => {
      calls.push([path, body])
      if (path === 'rpc/get_reviewed_existing_cleanup_receipt') return nativeCleanupReceipt()
      return { ready: false, active: false, reason, slug: candidate.slug, previewSha256: null }
    },
    save: (mode, data) => saved.push({ mode, data }),
  }), /Unresolved historical dismissal clock/)
  assert.equal(saved.length, 1)
  assert.equal(saved[0].mode, 'preview')
  assert.equal(saved[0].data.ready, false)
  assert.equal(saved[0].data.reason, reason)
  assert.ok(calls.every(([path, body]) => path !== 'rpc/check_reviewed_existing_release' || body.p_activate === false))
})

test('activation requires the reviewed preview artifact and passes its native SHA exactly once', async () => {
  const calls = []
  let activated = false
  const deps = {
    assertMain: async sha => calls.push(['main', sha]),
    readCompetition: async () => ({ ...exactCompetition(), active: activated, source_policy: activated ? policy.document.sourcePolicy : null }),
    sourceArtifact: async kind => ({ mode: kind, data: validPreview() }),
    call: async (path, body) => {
      calls.push([path, body])
      if (path === 'rpc/get_reviewed_existing_cleanup_receipt') return nativeCleanupReceipt({ active: activated })
      activated = true
      return { ...validPreview(), active: true }
    },
    save: () => {},
  }
  await assert.rejects(() => runStage(baseEnv({ EXPECTED_PREVIEW_SHA256: undefined }), deps))
  assert.equal(calls.filter(([path]) => path === 'rpc/check_reviewed_existing_release').length, 0)
  calls.length = 0
  await runStage(baseEnv({ EXPECTED_PREVIEW_SHA256: 'c'.repeat(64) }), deps)
  const activation = calls.filter(([path]) => path === 'rpc/check_reviewed_existing_release')
  assert.equal(activation.length, 1)
  assert.deepEqual(activation[0][1], { p_slug: candidate.slug, p_main_sha: main, p_policy_sha: policy.sha256, p_expected_preview_sha: 'c'.repeat(64), p_activate: true })
})

test('published preview receipt survives ZIP verification and activates from its actual shape', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'reviewed-history-artifact-'))
  const previous = process.cwd()
  const preview = validPreview()
  let activated = false
  try {
    process.chdir(temp)
    const previewDeps = {
      assertMain: async () => {}, readCompetition: async () => exactCompetition(), save: undefined,
      call: async path => path === 'rpc/get_reviewed_existing_cleanup_receipt'
        ? nativeCleanupReceipt()
        : preview,
    }
    await runStage(baseEnv({ MODE: 'preview' }), previewDeps)
    const jsonBytes = readFileSync('release/reviewed-existing-history/preview.json')
    const published = JSON.parse(jsonBytes)
    assert.equal(published.data.previewSha256, preview.previewSha256)
    assert.ok(published.data.nativeReceipt)
    assert.equal(published.data.data, undefined)
    const artifactBytes = zip(['preview.json', jsonBytes.toString('utf8')])
    const sourceArtifactDigest = `sha256:${sha256(artifactBytes)}`
    const runReceipt = { ...run, id: 123 }
    const artifactReceipt = {
      id: 456, name: 'reviewed-existing-history-123', expired: false,
      size_in_bytes: artifactBytes.length, digest: sourceArtifactDigest,
      workflow_run: { id: 123, head_sha: main },
    }
    const sourceArtifact = async kind => verifyArtifactReceipt({
      run: runReceipt, artifact: artifactReceipt, bytes: artifactBytes, kind,
      main, slug: candidate.slug, sourceRunId: 123, sourceArtifactId: 456,
      sourceArtifactDigest, approvedSha256: sha256(jsonBytes),
    })
    const activateDeps = {
      assertMain: async () => {},
      readCompetition: async () => ({ ...exactCompetition(), active: activated, source_policy: activated ? policy.document.sourcePolicy : null }),
      sourceArtifact,
      call: async path => {
        if (path === 'rpc/get_reviewed_existing_cleanup_receipt') return nativeCleanupReceipt({ active: activated })
        activated = true
        return { ...preview, active: true }
      },
      save: () => {},
    }
    const activatedPreview = await runStage(baseEnv({ MODE: 'activate', EXPECTED_PREVIEW_SHA256: preview.previewSha256 }), activateDeps)
    assert.equal(activatedPreview.active, true)
  } finally {
    process.chdir(previous)
    rmSync(temp, { recursive: true, force: true })
  }
})

test('operator rejects non-Actions, fork, rerun, or noncanonical workflow contexts before operations', async () => {
  for (const env of [
    { GITHUB_ACTIONS: 'false' },
    { GITHUB_REPOSITORY: 'someone/fork' },
    { GITHUB_RUN_ATTEMPT: '2' },
    { GITHUB_RUN_ID: '0' },
    { GITHUB_WORKFLOW_REF: 'someone/fork/.github/workflows/reviewed-existing-history.yml@refs/heads/main' },
  ]) {
    let touched = false
    await assert.rejects(() => runStage(baseEnv({ MODE: 'prepare', ...env }), { assertMain: async () => { touched = true } }))
    assert.equal(touched, false)
  }
})

test('ambiguous apply failure is not retried', async () => {
  const calls = []
  const deps = {
    assertMain: async () => {}, readCompetition: async () => exactCompetition(),
    sourceArtifact: async () => ({ data: prepared }),
    call: async (path, body) => { calls.push([path, body]); if (path === 'rpc/apply_reviewed_existing_cleanup') throw new Error('connection lost after write') },
    save: () => {},
  }
  await assert.rejects(() => runStage(baseEnv({ MODE: 'apply' }), deps), /connection lost/)
  assert.equal(calls.filter(([path]) => path === 'rpc/apply_reviewed_existing_cleanup').length, 1)
})

test('reprice executes the ordinary three CLI commands in order before recording prices', async () => {
  const steps = []
  const receipt = nativeCleanupReceipt({ prices: false })
  const deps = {
    assertMain: async () => steps.push('main'), readCompetition: async () => exactCompetition(),
    runCommand: (script, args) => steps.push([script, ...args]),
    call: async (path, body) => {
      steps.push([path, body])
      if (path === 'rpc/get_reviewed_existing_cleanup_receipt') return nativeCleanupReceipt({ prices: steps.some(step => Array.isArray(step) && step[0] === 'rpc/record_reviewed_existing_prices'), claimed: steps.some(step => Array.isArray(step) && step[0] === 'rpc/begin_reviewed_existing_prices') })
      if (path === 'rpc/begin_reviewed_existing_prices') return { slug: candidate.slug, mainCommit: main, policySha256: policy.sha256, cleanupBeforeSha256: receipt.cleanup.beforeSha256, footballStateSha256: 'a'.repeat(64), claimedAt: '2026-10-23T10:01:00Z' }
      return { slug: candidate.slug, mainCommit: main, policySha256: policy.sha256, cleanupBeforeSha256: receipt.cleanup.beforeSha256, footballStateSha256: 'a'.repeat(64), priceSha256: 'b'.repeat(64), recordedAt: '2026-10-23T10:00:00Z' }
    },
    save: () => {},
  }
  await runStage(baseEnv({ MODE: 'price' }), deps)
  const commandSteps = steps.filter(Array.isArray).filter(([first]) => first.startsWith('scripts/'))
  assert.deepEqual(commandSteps, priceCommands(candidate.slug))
  const claimIndex = steps.findIndex(step => Array.isArray(step) && step[0] === 'rpc/begin_reviewed_existing_prices')
  assert.ok(claimIndex >= 0 && claimIndex < steps.findIndex(step => Array.isArray(step) && step[0] === 'scripts/lazni-vratarji.mjs'))
  const recordIndex = steps.findIndex(step => Array.isArray(step) && step[0] === 'rpc/record_reviewed_existing_prices')
  assert.ok(recordIndex > steps.findIndex(step => Array.isArray(step) && step[0] === 'scripts/ovrednoti-igralce.mjs'))
})

test('reprice stops before any CLI unless cleanup has a native receipt', async () => {
  const steps = []
  const deps = {
    assertMain: async () => {}, readCompetition: async () => exactCompetition(),
    runCommand: (...args) => steps.push(args),
    call: async () => ({ competitions: nativeCleanupReceipt().competitions }),
    save: () => {},
  }
  await assert.rejects(() => runStage(baseEnv({ MODE: 'price' }), deps), /cleanup receipt required/)
  assert.equal(steps.length, 0)
})

test('a refused one-use price claim prevents all pricing commands', async () => {
  const steps = []
  const deps = {
    assertMain: async () => {}, readCompetition: async () => exactCompetition(),
    runCommand: (...args) => steps.push(['cli', ...args]),
    call: async path => {
      steps.push(path)
      if (path === 'rpc/get_reviewed_existing_cleanup_receipt') return nativeCleanupReceipt({ prices: false, claimed: false })
      throw new Error('one-use pricing claim already exists')
    },
    save: () => {},
  }
  await assert.rejects(() => runStage(baseEnv({ MODE: 'price' }), deps), /one-use pricing claim already exists/)
  assert.equal(steps.filter(step => Array.isArray(step) && step[0] === 'cli').length, 0)
  assert.equal(steps.filter(step => step === 'rpc/begin_reviewed_existing_prices').length, 1)
})

test('partial pricing failure leaves the claimed attempt and never records or retries it', async () => {
  const steps = []
  let claimCalls = 0
  const deps = {
    assertMain: async () => {}, readCompetition: async () => exactCompetition(),
    runCommand: script => { steps.push(script); if (script === 'scripts/ugani-pozicije.mjs') throw new Error('pricing CLI failed') },
    call: async path => {
      steps.push(path)
      if (path === 'rpc/get_reviewed_existing_cleanup_receipt') return nativeCleanupReceipt({ prices: false, claimed: false })
      if (path === 'rpc/begin_reviewed_existing_prices') {
        claimCalls += 1
        return { slug: candidate.slug, mainCommit: main, policySha256: policy.sha256, cleanupBeforeSha256: 'e'.repeat(64), footballStateSha256: 'a'.repeat(64), claimedAt: '2026-10-23T10:01:00Z' }
      }
      throw new Error(`unexpected RPC ${path}`)
    },
    save: () => {},
  }
  await assert.rejects(() => runStage(baseEnv({ MODE: 'price' }), deps), /pricing CLI failed/)
  assert.equal(claimCalls, 1)
  assert.equal(steps.includes('rpc/record_reviewed_existing_prices'), false)
  assert.equal(steps.includes('scripts/ovrednoti-igralce.mjs'), false)
})
