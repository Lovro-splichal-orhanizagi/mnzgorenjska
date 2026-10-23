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

test('prepare surfaces only a safe PostgREST SQL error and never retries its write', async () => {
  const requests = []
  const previousFetch = globalThis.fetch
  const key = 'local-test-service-role-secret'
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input))
    requests.push({ url, init })
    if (url.pathname.endsWith('/competitions')) {
      return new Response(JSON.stringify([{
        id: candidate.id, slug: candidate.slug, source: candidate.source,
        source_league_code: candidate.source_league_code, source_policy: null,
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      code: 'P0001', message: `REVIEWED_EXISTING: native target changed ${'x'.repeat(1200)}`,
      details: `do-not-leak ${key}`, hint: `also-private ${key}`,
    }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  let error
  try {
    await assert.rejects(() => runStage(baseEnv({ MODE: 'prepare', SUPABASE_SERVICE_ROLE_KEY: key }), {
      assertMain: async () => {}, save: () => {},
    }), caught => {
      error = caught
      assert.match(caught.message, /HTTP 400/)
      assert.match(caught.message, /P0001/)
      assert.match(caught.message, /REVIEWED_EXISTING: native target changed/)
      const sqlMessage = caught.message.split('P0001: ')[1].split('; do not retry a write')[0]
      assert.equal(sqlMessage.length, 1000, 'SQL message is capped at 1000 characters')
      assert.match(caught.message, /do not retry a write/)
      assert.doesNotMatch(caught.message, /do-not-leak|also-private|local-test-service-role-secret/)
      return true
    })
  } finally {
    globalThis.fetch = previousFetch
  }
  assert.ok(error)
  assert.equal(requests.length, 2, 'one competition read and one prepare RPC request')
  assert.equal(requests.filter(request => request.init.method === 'POST').length, 1)
  assert.equal(requests[1].init.headers.Authorization, `Bearer ${key}`)
})

test('prepare falls back safely when an HTTP error is not JSON', async () => {
  const requests = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input))
    requests.push({ url, init })
    if (url.pathname.endsWith('/competitions')) {
      return new Response(JSON.stringify([{
        id: candidate.id, slug: candidate.slug, source: candidate.source,
        source_league_code: candidate.source_league_code, source_policy: null,
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('raw upstream body must not be copied into the error', {
      status: 502, headers: { 'Content-Type': 'text/plain' },
    })
  }
  try {
    await assert.rejects(() => runStage(baseEnv({ MODE: 'prepare' }), {
      assertMain: async () => {}, save: () => {},
    }), error => {
      assert.match(error.message, /HTTP 502/)
      assert.match(error.message, /do not retry a write/)
      assert.doesNotMatch(error.message, /raw upstream body/)
      return true
    })
  } finally {
    globalThis.fetch = previousFetch
  }
  assert.equal(requests.length, 2, 'non-JSON failure must not trigger a retry')
  assert.equal(requests.filter(request => request.init.method === 'POST').length, 1)
})

const nativeCleanupReceipt = ({ prices = true, active = false, claimed = prices, candidate: receiptCandidate = candidate, policy: receiptPolicy = policy, main: receiptMain = main } = {}) => ({
  cleanup: { slug: receiptCandidate.slug, mainCommit: receiptMain, policySha256: receiptPolicy.sha256, beforeSha256: 'e'.repeat(64), afterSha256: 'f'.repeat(64), removedAppearances: 3, removedGoals: 2, unavailableMatches: 1, recordedAt: '2026-10-23T10:00:00Z' },
  ...(claimed ? { priceClaim: { slug: receiptCandidate.slug, mainCommit: receiptMain, policySha256: receiptPolicy.sha256, cleanupBeforeSha256: 'e'.repeat(64), footballStateSha256: 'a'.repeat(64), claimedAt: '2026-10-23T10:01:00Z' } } : {}),
  ...(prices ? { prices: { slug: receiptCandidate.slug, mainCommit: receiptMain, policySha256: receiptPolicy.sha256, cleanupBeforeSha256: 'e'.repeat(64), priceSha256: 'b'.repeat(64), footballStateSha256: 'a'.repeat(64), recordedAt: '2026-10-23T10:00:00Z' } } : {}),
  competitions: [{ id: receiptCandidate.id, slug: receiptCandidate.slug, active, markers: { installed: true, policyId: receiptPolicy.id, policySha256: receiptPolicy.sha256, firstFantasyPlayedOn: '2026-10-24', markers: receiptPolicy.document.entries.map(entry=>({ sourceMatchId: entry.sourceMatchId, policyId: receiptPolicy.id, policySha256: receiptPolicy.sha256 })) } }],
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

test('fresh SFL apply reaches its verified artifact before requiring installed cleanup markers', async () => {
  const sfl = validateSlug('gb-sfl-d1-south')
  const sflPolicy = policyForSlug(sfl.slug)
  const sflTargets = cleanupTargets.competitions.find(competition => competition.slug === sfl.slug).targets
  const sflBeforeImage = { matches: sflTargets.map(target => ({ id: target.nativeMatchId, home_goals: target.score[0], away_goals: target.score[1] })), other: [] }
  const sflBeforeImageText = JSON.stringify(sflBeforeImage)
  const sflPrepared = {
    slug: sfl.slug, competitionId: sfl.id, policyId: sflPolicy.id, policySha256: sflPolicy.sha256,
    beforeImage: sflBeforeImage, beforeImageText: sflBeforeImageText, beforeSha256: sha256(sflBeforeImageText),
    firstFantasyPlayedOn: '2026-10-24', targetMatchIds: sflTargets.map(target => target.nativeMatchId),
  }
  const uninstalled = {
    cleanup: null, priceClaim: null, prices: null,
    competitions: [{ id: sfl.id, slug: sfl.slug, active: false, markers: { installed: false, markers: [] } }],
  }
  const calls = []
  let receiptReads = 0
  const result = await runStage(baseEnv({ MODE: 'apply', SLUG: sfl.slug }), {
    assertMain: async () => {}, readCompetition: async () => ({ ...sfl, active: false, source_policy: null }),
    sourceArtifact: async kind => { assert.equal(kind, 'prepare'); return { data: sflPrepared } },
    call: async (path, body) => {
      calls.push([path, body])
      if (path === 'rpc/get_reviewed_existing_cleanup_receipt') {
        receiptReads += 1
        return receiptReads === 1 ? uninstalled : nativeCleanupReceipt({ candidate: sfl, policy: sflPolicy, prices: false, claimed: false })
      }
      assert.equal(path, 'rpc/apply_reviewed_existing_cleanup')
      return { slug: sfl.slug, mainCommit: main, beforeSha256: sflPrepared.beforeSha256, afterSha256: 'f'.repeat(64), removedAppearances: 0, removedGoals: 0, unavailableMatches: 1 }
    },
    save: () => {},
  })
  assert.equal(result.slug, sfl.slug)
  assert.equal(calls.filter(([path]) => path === 'rpc/apply_reviewed_existing_cleanup').length, 1)
  assert.deepEqual(calls[0], ['rpc/get_reviewed_existing_cleanup_receipt', { p_slug: sfl.slug }])
  assert.equal(receiptReads, 2, 'one empty-state precheck and one installed-marker readback')
})

test('legacy SFL receipts continue from an old native anchor under a new verified main artifact', async () => {
  const sfl = validateSlug('gb-sfl-d1-south')
  const sflPolicy = policyForSlug(sfl.slug)
  const releaseMain = 'd'.repeat(40)
  const legacyMain = '41aa6ce964223706ef9dffc626bda3edcd59e741'
  const legacyReceipt = ({ active = false } = {}) => nativeCleanupReceipt({ candidate: sfl, policy: sflPolicy, main: legacyMain, active })
  const legacyPreview = {
    ready: true, active: false, reason: null, slug: sfl.slug, competitionId: sfl.id, mainCommit: legacyMain,
    policyId: sflPolicy.id, policySha256: sflPolicy.sha256, markers: { installed: true }, firstRound: 13,
    firstDeadline: '2026-10-24T10:00:00Z', firstPlayedOn: '2026-10-24', cheapestLegal15: 99.5,
    priceSha256: 'b'.repeat(64), previewSha256: 'c'.repeat(64),
  }
  const sflCompetition = (active, installed) => ({ ...sfl, active, source_policy: installed ? sflPolicy.document.sourcePolicy : null, prvi_fantasy_krog: null })
  const temp = mkdtempSync(join(tmpdir(), 'reviewed-sfl-continuation-'))
  const previous = process.cwd()
  let activated = false
  const calls = []
  try {
    process.chdir(temp)
    await runStage(baseEnv({ MODE: 'preview', SLUG: sfl.slug, EXPECTED_SHA: releaseMain, GITHUB_SHA: releaseMain }), {
      assertMain: async sha => assert.equal(sha, releaseMain),
      readCompetition: async () => sflCompetition(false, false),
      call: async (path, body) => {
        calls.push([path, body])
        if (path === 'rpc/get_reviewed_existing_cleanup_receipt') return legacyReceipt()
        return legacyPreview
      },
    })
    const jsonBytes = readFileSync('release/reviewed-existing-history/preview.json')
    const published = JSON.parse(jsonBytes)
    assert.equal(published.mainCommit, releaseMain, 'artifact source lineage remains pinned to current code')
    assert.equal(published.data.mainCommit, legacyMain, 'native preview remains pinned to cleanup/price receipts')
    assert.equal(published.data.releaseMainCommit, legacyMain)
    assert.equal(published.data.nativeReceipt.cleanup.mainCommit, legacyMain)
    assert.equal(published.data.nativeReceipt.priceClaim.mainCommit, legacyMain)
    assert.equal(published.data.nativeReceipt.prices.mainCommit, legacyMain)
    await runStage(baseEnv({ MODE: 'receipt', SLUG: sfl.slug, EXPECTED_SHA: releaseMain, GITHUB_SHA: releaseMain }), {
      assertMain: async sha => assert.equal(sha, releaseMain),
      readCompetition: async () => sflCompetition(false, false),
      call: async () => legacyReceipt(),
    })
    const receiptEnvelope = JSON.parse(readFileSync('release/reviewed-existing-history/receipt.json', 'utf8'))
    assert.equal(receiptEnvelope.mainCommit, releaseMain)
    assert.equal(receiptEnvelope.data.cleanup.mainCommit, legacyMain)
    const artifactBytes = zip(['preview.json', jsonBytes.toString('utf8')])
    const artifactDigest = `sha256:${sha256(artifactBytes)}`
    const releaseRun = { ...run, head_sha: releaseMain }
    const releaseArtifact = {
      ...artifact, size_in_bytes: artifactBytes.length, digest: artifactDigest,
      workflow_run: { id: 123, head_sha: releaseMain },
    }
    const sourceArtifact = async kind => verifyArtifactReceipt({
      run: releaseRun, artifact: releaseArtifact, bytes: artifactBytes, kind,
      main: releaseMain, slug: sfl.slug, sourceRunId: 123, sourceArtifactId: 456,
      sourceArtifactDigest: artifactDigest, approvedSha256: sha256(jsonBytes),
    })
    const activateCalls = []
    const activation = await runStage(baseEnv({ MODE: 'activate', SLUG: sfl.slug, EXPECTED_SHA: releaseMain, GITHUB_SHA: releaseMain, EXPECTED_PREVIEW_SHA256: legacyPreview.previewSha256 }), {
      assertMain: async sha => assert.equal(sha, releaseMain),
      readCompetition: async () => sflCompetition(activated, activated),
      sourceArtifact,
      call: async (path, body) => {
        activateCalls.push([path, body])
        if (path === 'rpc/get_reviewed_existing_cleanup_receipt') return legacyReceipt({ active: activated })
        assert.equal(body.p_main_sha, legacyMain)
        activated = true
        return { ...legacyPreview, active: true }
      },
      save: () => {},
    })
    assert.equal(activation.active, true)
    const rpcActivations = activateCalls.filter(([path]) => path === 'rpc/check_reviewed_existing_release')
    assert.equal(rpcActivations.length, 1)
    assert.deepEqual(rpcActivations[0][1], {
      p_slug: sfl.slug, p_main_sha: legacyMain, p_policy_sha: sflPolicy.sha256,
      p_expected_preview_sha: legacyPreview.previewSha256, p_activate: true,
    })
    assert.equal(calls.filter(([path]) => path === 'rpc/check_reviewed_existing_release').length, 1)

    assert.throws(() => verifyActivationPreview({ ...published.data, releaseMainCommit: '0'.repeat(40) }, {
      slug: sfl.slug, main: releaseMain, expectedPreviewSha256: legacyPreview.previewSha256,
    }), /legacy|native main|release main/i)
    const foreignPreview = {
      ...validPreview(), mainCommit: legacyMain, releaseMainCommit: legacyMain,
    }
    assert.throws(() => verifyActivationPreview(foreignPreview, {
      slug: candidate.slug, main: releaseMain, expectedPreviewSha256: foreignPreview.previewSha256,
    }), /legacy|native main|release main/i)
    assert.throws(() => verifyArtifactReceipt({
      run: { ...releaseRun, head_sha: legacyMain },
      artifact: { ...releaseArtifact, workflow_run: { id: 123, head_sha: legacyMain } },
      bytes: artifactBytes, kind: 'preview', main: releaseMain, slug: sfl.slug,
      sourceRunId: 123, sourceArtifactId: 456, sourceArtifactDigest: artifactDigest,
      approvedSha256: sha256(jsonBytes),
    }), /source run lineage differs/)
  } finally {
    process.chdir(previous)
    rmSync(temp, { recursive: true, force: true })
  }
})

test('legacy SFL receipts cannot enter apply or price stages', async () => {
  const sfl = validateSlug('gb-sfl-d1-south')
  const sflPolicy = policyForSlug(sfl.slug)
  const legacyMain = '41aa6ce964223706ef9dffc626bda3edcd59e741'
  const calls = []
  const deps = {
    assertMain: async () => {}, readCompetition: async () => ({ ...sfl, active: false, source_policy: null }),
    sourceArtifact: async () => { throw new Error('must reject before artifact access') },
    call: async (path, body) => {
      calls.push([path, body])
      if (path === 'rpc/get_reviewed_existing_cleanup_receipt') return nativeCleanupReceipt({ candidate: sfl, policy: sflPolicy, main: legacyMain })
      throw new Error(`unexpected write ${path}`)
    },
    runCommand: () => { throw new Error('must not run pricing CLI') }, save: () => {},
  }
  for (const mode of ['apply', 'price']) {
    calls.length = 0
    await assert.rejects(() => runStage(baseEnv({ MODE: mode, SLUG: sfl.slug }), deps), /legacy SFL|current release main|native receipt scope/i)
    assert.deepEqual(calls.map(([path]) => path), ['rpc/get_reviewed_existing_cleanup_receipt'])
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
