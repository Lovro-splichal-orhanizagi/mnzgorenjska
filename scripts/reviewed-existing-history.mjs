// Exact-main, artifact-gated operator for six approved reports across four leagues.
// It performs no source requests and never retries a mutating call.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { pathToFileURL } from 'node:url'
import { getHistoricalStatisticsPolicy, historicalStatisticsPolicySha256 } from './lib/historical-statistics-policy.mjs'
import candidatesRegistry from './policies/existing-league-candidates-20261018.json' with { type: 'json' }
import cleanupTargets from './policies/reviewed-existing-cleanup-targets-20261023.json' with { type: 'json' }

const REPOSITORY = 'Lovro-splichal-orhanizagi/mnzgorenjska'
const WORKFLOW = '.github/workflows/reviewed-existing-history.yml'
const ROOT = 'release/reviewed-existing-history'
const SOURCE_POLICY = 'reviewed-existing-history-20261023-v1'
const LEGACY_SFL_NATIVE_MAIN = '41aa6ce964223706ef9dffc626bda3edcd59e741'
const LEGACY_SFL_SLUG = 'gb-sfl-d1-south'
const EXACT = new Map([
  ['gb-npl-midlands', { id: 979, source: 'isthmian', source_league_code: 'npl/67d7c7bb74247876e6dae40c/2026-27', country:'GB' }],
  ['gb-sfl-d1-south', { id: 984, source: 'isthmian', source_league_code: 'sfl/69d0bdf9b616bafb97331d41/2026-27', country:'GB' }],
  ['ro-liga3-s1', { id: 497, source: 'hlf', source_league_code: 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1', country:'RO' }],
  ['ba-wwin-liga-bih', { id: 998, source: 'nfsbih', source_league_code: 'wwin-liga-bih/54152223', country:'BA' }],
])
const MODES = new Set(['prepare', 'apply', 'price', 'preview', 'activate', 'receipt'])
const SHA40 = /^[a-f0-9]{40}$/
const SHA64 = /^[a-f0-9]{64}$/
const digest = value => createHash('sha256').update(value).digest('hex')
const require = (ok, message) => { if (!ok) throw new Error(`REVIEWED_EXISTING_HISTORY: ${message}`) }
const dateOnly = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

export function validateSlug(slug) {
  const exact = EXACT.get(slug)
  const registered = candidatesRegistry.candidates.find(candidate => candidate.slug === slug)
  const target = cleanupTargets.competitions.find(competition => competition.slug === slug)
  require(cleanupTargets.schemaVersion === 1 && cleanupTargets.sourcePolicy === SOURCE_POLICY && cleanupTargets.competitions.length === EXACT.size && exact && registered && registered.id === exact.id && registered.source === exact.source && registered.source_league_code === exact.source_league_code && target?.competitionId === exact.id && target.provider === exact.source && target.sourceLeagueCode === exact.source_league_code && target.country === exact.country, 'fixed league selection required')
  return { id: exact.id, slug, source: exact.source, source_league_code: exact.source_league_code }
}

export function policyForSlug(slug) {
  const candidate = validateSlug(slug)
  const document = getHistoricalStatisticsPolicy(slug)
  const target = cleanupTargets.competitions.find(competition => competition.slug === slug)
  const sourceIds = document?.entries?.map(entry => String(entry.sourceMatchId)).sort()
  const targetSourceIds = target?.targets?.map(entry => String(entry.sourceMatchId)).sort()
  require(document && document.competitionId === candidate.id && document.provider === candidate.source && document.sourceLeagueCode === candidate.source_league_code && document.sourcePolicy === SOURCE_POLICY && document.id === target.policyId && historicalStatisticsPolicySha256(document) === target.policySha256 && JSON.stringify(sourceIds) === JSON.stringify(targetSourceIds), 'reviewed policy binding differs')
  return { id: document.id, sha256: historicalStatisticsPolicySha256(document), document }
}

export function verifyPreparePayload(data, candidate, policy, main) {
  require(data && typeof data === 'object' && !Array.isArray(data), 'prepare payload must be an object')
  require(data.slug === candidate.slug && data.competitionId === candidate.id && data.policyId === policy.id && data.policySha256 === policy.sha256, 'prepare tuple or policy differs')
  require(data.beforeImage && typeof data.beforeImage === 'object' && !Array.isArray(data.beforeImage) && typeof data.beforeImageText === 'string' && data.beforeImageText.length > 0, 'exact before-image missing')
  require(SHA64.test(data.beforeSha256 ?? '') && digest(data.beforeImageText) === data.beforeSha256, 'before-image SHA256 differs')
  let parsed
  try { parsed = JSON.parse(data.beforeImageText) } catch { require(false, 'before-image text is not JSON') }
  require(isDeepStrictEqual(parsed, data.beforeImage), 'before-image text and JSON value differ')
  require(dateOnly(data.firstFantasyPlayedOn), 'first fantasy played date is invalid')
  const expectedTargetIds = cleanupTargets.competitions.find(competition => competition.slug === candidate.slug).targets.map(target => String(target.nativeMatchId)).sort()
  const actualTargetIds = Array.isArray(data.targetMatchIds) ? data.targetMatchIds.map(String).sort() : []
  require(actualTargetIds.length === expectedTargetIds.length && new Set(actualTargetIds).size === actualTargetIds.length && JSON.stringify(actualTargetIds) === JSON.stringify(expectedTargetIds), 'target match list differs')
  require(SHA40.test(main), 'main SHA invalid')
  return data
}

export function verifyArtifactReceipt({ run, artifact, bytes, kind, main, slug, sourceRunId, sourceArtifactId, sourceArtifactDigest, approvedSha256 }) {
  const candidate = validateSlug(slug)
  const policy = policyForSlug(slug)
  require(['prepare', 'preview'].includes(kind) && SHA40.test(main ?? ''), 'unsupported artifact stage or main SHA')
  require(/^[1-9]\d{0,19}$/.test(String(sourceRunId ?? '')) && Number(run?.id) === Number(sourceRunId), 'source run ID differs')
  require(run.status === 'completed' && run.conclusion === 'success' && run.run_attempt === 1 && run.head_sha === main && run.head_branch === 'main' && run.event === 'workflow_dispatch' && run.path === WORKFLOW && run.repository?.full_name === REPOSITORY && run.head_repository?.full_name === REPOSITORY, 'source run lineage differs')
  require(Number.isSafeInteger(Number(sourceArtifactId)) && Number(sourceArtifactId) > 0 && Number(artifact?.id) === Number(sourceArtifactId), 'source artifact ID differs')
  require(artifact.name === `reviewed-existing-history-${sourceRunId}` && artifact.expired === false && artifact.workflow_run?.id === Number(sourceRunId) && artifact.workflow_run?.head_sha === main, 'artifact lineage differs')
  require(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length < 32 * 1024 * 1024 && artifact.size_in_bytes === bytes.length, 'artifact size differs')
  require(/^sha256:[a-f0-9]{64}$/.test(sourceArtifactDigest ?? '') && artifact.digest === sourceArtifactDigest && artifact.digest === `sha256:${digest(bytes)}`, 'artifact digest differs')
  require(SHA64.test(approvedSha256 ?? ''), 'approved receipt SHA256 required')
  // Read the already authenticated byte count rather than waiting for pipe EOF.
  const script = 'import sys,zipfile,io,stat\nk=sys.argv[1]; n=int(sys.argv[2]); b=sys.stdin.buffer.read(n); assert len(b)==n\nz=zipfile.ZipFile(io.BytesIO(b)); names=z.namelist(); expected=k+".json"\nassert names==[expected]\ni=z.infolist()[0]\nassert i.file_size<64*1024*1024 and stat.S_IFMT(i.external_attr>>16) in (0,stat.S_IFREG) and not i.flag_bits&1\nsys.stdout.buffer.write(z.read(expected))'
  const file = execFileSync('python3', ['-c', script, kind, String(bytes.length)], { input: bytes, timeout: 30_000, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] })
  require(digest(file) === approvedSha256, 'approved receipt file SHA256 differs')
  const value = JSON.parse(file)
  require(value.schemaVersion === 1 && value.mode === kind && value.mainCommit === main && value.slug === slug && value.policyId === policy.id && value.policySha256 === policy.sha256, 'receipt file scope differs')
  if (kind === 'prepare') verifyPreparePayload(value.data, candidate, policy, main)
  if (kind === 'preview') verifyPreviewPayload(value.data, candidate, policy, main)
  return value
}

export function verifyPreviewPayload(data, candidate, policy, main) {
  require(data && typeof data === 'object' && !Array.isArray(data), 'preview payload must be an object')
  const legacy = data.releaseMainCommit !== undefined
  const nativeMain = legacy ? LEGACY_SFL_NATIVE_MAIN : main
  require(!legacy || (candidate.slug === LEGACY_SFL_SLUG && main !== LEGACY_SFL_NATIVE_MAIN && data.releaseMainCommit === LEGACY_SFL_NATIVE_MAIN), 'legacy SFL native-main continuation is not allowed')
  for (const [key, value] of Object.entries({ slug: candidate.slug, competitionId: candidate.id, mainCommit: nativeMain, policyId: policy.id, policySha256: policy.sha256 })) require(data[key] === value, `preview ${key} differs`)
  if (legacy) verifyNativeReceipt(data.nativeReceipt, candidate, policy, nativeMain, { expectedActive: false, requireCleanup: true, requirePrices: true })
  require(typeof data.ready === 'boolean' && typeof data.active === 'boolean' && (data.reason === null || typeof data.reason === 'string'), 'preview readiness fields invalid')
  require(data.markers && typeof data.markers === 'object' && Number.isSafeInteger(data.firstRound) && data.firstRound > 0 && Number.isFinite(Date.parse(data.firstDeadline)) && dateOnly(data.firstPlayedOn), 'preview deadline/marker fields invalid')
  require(Number.isFinite(data.cheapestLegal15) && data.cheapestLegal15 >= 0 && SHA64.test(data.priceSha256 ?? '') && SHA64.test(data.previewSha256 ?? ''), 'preview price/hash fields invalid')
  return data
}

export function verifyActivationPreview(preview, { slug, main, expectedPreviewSha256 }) {
  const candidate = validateSlug(slug)
  const policy = policyForSlug(slug)
  verifyPreviewPayload(preview, candidate, policy, main)
  require(preview.ready === true && preview.active === false && SHA64.test(expectedPreviewSha256 ?? '') && preview.previewSha256 === expectedPreviewSha256, 'externally reviewed ready preview SHA required')
  return preview
}

export function priceCommands(slug) {
  validateSlug(slug)
  return [
    ['scripts/lazni-vratarji.mjs', '--tekmovanje', slug, '--pisi'],
    ['scripts/ugani-pozicije.mjs', '--tekmovanje', slug, '--pisi'],
    ['scripts/ovrednoti-igralce.mjs', '--tekmovanje', slug, '--pisi'],
  ]
}

function verifyNativeReceipt(receipt, candidate, policy, main, { expectedActive = false, requireCleanup = false, requirePrices = false, forbidPrices = false } = {}) {
  require(receipt && typeof receipt === 'object' && !Array.isArray(receipt) && Array.isArray(receipt.competitions), 'native receipt missing')
  require(receipt.competitions.length === 1, 'native receipt competition cardinality differs')
  const [competition] = receipt.competitions
  require(competition.id === candidate.id && competition.slug === candidate.slug && (expectedActive === null || competition.active === expectedActive), 'native receipt competition state differs')
  const markers = competition.markers
  require(markers?.installed === true && markers.policyId === policy.id && markers.policySha256 === policy.sha256 && dateOnly(markers.firstFantasyPlayedOn) && Array.isArray(markers.markers), 'installed historical markers differ')
  const expectedMatchIds = policy.document.entries.map(entry => String(entry.sourceMatchId)).sort()
  const installedMatchIds = markers.markers.map(marker => String(marker.sourceMatchId)).sort()
  require(JSON.stringify(installedMatchIds) === JSON.stringify(expectedMatchIds) && markers.markers.every(marker => marker.policyId === policy.id && marker.policySha256 === policy.sha256), 'installed marker set differs from approved policy')
  if (receipt.cleanup) {
    require(receipt.cleanup.slug === candidate.slug && receipt.cleanup.mainCommit === main && SHA64.test(receipt.cleanup.beforeSha256 ?? '') && SHA64.test(receipt.cleanup.afterSha256 ?? '') && receipt.cleanup.policySha256 === policy.sha256 && Number.isSafeInteger(receipt.cleanup.removedAppearances) && Number.isSafeInteger(receipt.cleanup.removedGoals) && Number.isSafeInteger(receipt.cleanup.unavailableMatches) && Number.isFinite(Date.parse(receipt.cleanup.recordedAt)), 'cleanup receipt scope differs')
  }
  if (requireCleanup) require(receipt.cleanup, 'cleanup receipt required before this stage')
  if (receipt.priceClaim) {
    require(receipt.priceClaim.slug === candidate.slug && receipt.priceClaim.mainCommit === main && receipt.priceClaim.policySha256 === policy.sha256 && receipt.priceClaim.cleanupBeforeSha256 === receipt.cleanup?.beforeSha256 && SHA64.test(receipt.priceClaim.footballStateSha256 ?? '') && Number.isFinite(Date.parse(receipt.priceClaim.claimedAt)), 'price attempt claim scope differs')
  }
  if (requirePrices) {
    require(receipt.priceClaim && receipt.prices?.slug === candidate.slug && receipt.prices.mainCommit === main && receipt.prices.policySha256 === policy.sha256 && receipt.prices.cleanupBeforeSha256 === receipt.cleanup?.beforeSha256 && receipt.prices.footballStateSha256 === receipt.priceClaim.footballStateSha256 && SHA64.test(receipt.prices.priceSha256 ?? '') && SHA64.test(receipt.prices.footballStateSha256 ?? '') && Number.isFinite(Date.parse(receipt.prices.recordedAt)), 'price receipt scope differs')
  }
  if (forbidPrices) require(!receipt.prices && !receipt.priceClaim, 'price attempt already claimed; do not repeat repricing')
  return receipt
}

function validateEnv(env) {
  require(MODES.has(env.MODE), 'fixed operator mode required')
  const candidate = validateSlug(env.SLUG)
  const policy = policyForSlug(candidate.slug)
  require(SHA40.test(env.EXPECTED_SHA ?? '') && env.EXPECTED_SHA === env.GITHUB_SHA && env.GITHUB_REF === 'refs/heads/main', 'exact main SHA and refs/heads/main required')
  require(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_RUN_ATTEMPT === '1' && /^[1-9]\d{0,19}$/.test(env.GITHUB_RUN_ID ?? '') && env.GITHUB_WORKFLOW_REF === `${REPOSITORY}/${WORKFLOW}@refs/heads/main`, 'canonical first-attempt main workflow run required')
  require(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY, 'Action database credentials required')
  return { candidate, policy, main: env.EXPECTED_SHA }
}

const ghBytes = path => execFileSync('gh', ['api', `repos/${REPOSITORY}/${path}`], { env: { ...process.env, GODEBUG: 'http2client=0' }, maxBuffer: 32 * 1024 * 1024 })
const gh = path => JSON.parse(ghBytes(path))
const db = (url, key) => async (path, body) => {
  const response = await fetch(new URL(`/rest/v1/${path}`, url), {
    method: body ? 'POST' : 'GET',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: 'error',
    signal: AbortSignal.timeout(120_000),
  })
  if (!response.ok) {
    let diagnostic = ''
    if (/^application\/json\b|\+json\b/i.test(response.headers.get('content-type') ?? '')) {
      try {
        const error = await response.json()
        const code = typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : ''
        if (code && typeof error?.message === 'string') {
          diagnostic = error.message
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replaceAll(key, '[redacted]')
            .slice(0, 1000)
            .trim()
          if (diagnostic) diagnostic = ` ${code}: ${diagnostic}`
        }
      } catch {}
    }
    throw new Error(`Database operation failed: HTTP ${response.status}${diagnostic}; do not retry a write; run receipt mode to inspect state`)
  }
  return response.json()
}

function saveReceipt(mode, main, candidate, policy, data) {
  mkdirSync(ROOT, { recursive: true })
  const body = `${JSON.stringify({ schemaVersion: 1, mode, mainCommit: main, slug: candidate.slug, policyId: policy.id, policySha256: policy.sha256, checkedAt: new Date().toISOString(), data }, null, 2)}\n`
  writeFileSync(`${ROOT}/${mode}.json`, body, { flag: 'w' })
  console.log(`${mode}.json SHA256: ${digest(body)}`)
  return body
}

export async function runStage(env = process.env, deps = {}) {
  const { candidate, policy, main } = validateEnv(env)
  const call = deps.call ?? db(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const assertMain = deps.assertMain ?? (async () => require(gh('commits/main').sha === main, 'main advanced; stop before operation'))
  const readCompetition = deps.readCompetition ?? (async () => {
    const rows = await call(`competitions?select=id,slug,source,source_league_code,source_policy,active,prvi_fantasy_krog&id=eq.${candidate.id}`)
    require(Array.isArray(rows) && rows.length === 1 && rows[0].id === candidate.id && rows[0].slug === candidate.slug && rows[0].source === candidate.source && rows[0].source_league_code === candidate.source_league_code, 'native competition tuple differs')
    require(rows[0].source_policy === null || rows[0].source_policy === policy.document.sourcePolicy, 'unreviewed source policy installed')
    return rows[0]
  })
  const runCommand = deps.runCommand ?? ((script, args) => execFileSync(process.execPath, [script, ...args], { stdio: 'inherit', env: { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY } }))
  const write = deps.save ?? ((mode, data) => saveReceipt(mode, main, candidate, policy, data))
  const checkMain = async () => { await assertMain(main) }
  let nativeMain = main
  let legacyContinuation = false
  const nativeReceipt = async options => {
    const receipt = await call('rpc/get_reviewed_existing_cleanup_receipt', { p_slug: candidate.slug })
    const legacy = candidate.slug === LEGACY_SFL_SLUG && main !== LEGACY_SFL_NATIVE_MAIN && receipt?.cleanup?.mainCommit === LEGACY_SFL_NATIVE_MAIN
    if (legacy) require(['preview', 'activate', 'receipt'].includes(env.MODE), 'legacy SFL receipts allow only preview, activate, and receipt stages; apply and price are forbidden')
    nativeMain = legacy ? LEGACY_SFL_NATIVE_MAIN : main
    legacyContinuation = legacy
    return verifyNativeReceipt(receipt, candidate, policy, nativeMain, options)
  }
  const fetchSourceArtifact = async kind => {
    require(/^[1-9]\d{0,19}$/.test(env.SOURCE_RUN_ID ?? '') && /^[1-9]\d{0,19}$/.test(env.SOURCE_ARTIFACT_ID ?? ''), 'source run and artifact IDs required')
    const run = gh(`actions/runs/${env.SOURCE_RUN_ID}`)
    const artifacts = gh(`actions/runs/${env.SOURCE_RUN_ID}/artifacts`).artifacts?.filter(a => Number(a.id) === Number(env.SOURCE_ARTIFACT_ID)) ?? []
    require(artifacts.length === 1, 'one exact source artifact required')
    const bytes = ghBytes(`actions/artifacts/${env.SOURCE_ARTIFACT_ID}/zip`)
    return verifyArtifactReceipt({ run, artifact: artifacts[0], bytes, kind, main, slug: candidate.slug, sourceRunId: env.SOURCE_RUN_ID, sourceArtifactId: env.SOURCE_ARTIFACT_ID, sourceArtifactDigest: env.SOURCE_ARTIFACT_DIGEST, approvedSha256: env.APPROVED_SHA256 })
  }
  const sourceArtifact = deps.sourceArtifact ?? fetchSourceArtifact

  await checkMain()
  await readCompetition()
  if (env.MODE === 'prepare') {
    await checkMain()
    const data = await call('rpc/prepare_reviewed_existing_cleanup', { p_slug: candidate.slug, p_main_sha: main, p_policy_sha: policy.sha256 })
    verifyPreparePayload(data, candidate, policy, main)
    write('prepare', data)
    return data
  }
  if (env.MODE === 'apply') {
    if (candidate.slug === LEGACY_SFL_SLUG) {
      const prior = await call('rpc/get_reviewed_existing_cleanup_receipt', { p_slug: candidate.slug })
      require(prior && typeof prior === 'object' && !Array.isArray(prior), 'SFL cleanup receipt state missing')
      const legacy = main !== LEGACY_SFL_NATIVE_MAIN && prior.cleanup?.mainCommit === LEGACY_SFL_NATIVE_MAIN
      require(!legacy, 'legacy SFL receipts allow only preview, activate, and receipt stages; apply is forbidden')
      require(prior.cleanup == null && prior.priceClaim == null && prior.prices == null, 'SFL cleanup or price attempt already exists; apply is forbidden')
    }
    const source = await sourceArtifact('prepare')
    const before = verifyPreparePayload(source.data, candidate, policy, main)
    await checkMain()
    const data = await call('rpc/apply_reviewed_existing_cleanup', { p_slug: candidate.slug, p_main_sha: main, p_policy_sha: policy.sha256, p_before_sha: before.beforeSha256, p_before_image_text: before.beforeImageText })
    require(data && data.slug === candidate.slug && data.mainCommit === main && data.beforeSha256 === before.beforeSha256 && SHA64.test(data.afterSha256 ?? '') && Number.isSafeInteger(data.removedAppearances) && Number.isSafeInteger(data.removedGoals) && Number.isSafeInteger(data.unavailableMatches), 'apply receipt invalid')
    write('apply', { result: data, readback: 'pending' })
    const receipt = await nativeReceipt({ requireCleanup: true, forbidPrices: true })
    write('apply', { result: data, receipt })
    return data
  }
  if (env.MODE === 'price') {
    const receipt = await nativeReceipt({ requireCleanup: true, forbidPrices: true })
    await checkMain()
    const claim = await call('rpc/begin_reviewed_existing_prices', { p_slug: candidate.slug, p_main_sha: main, p_policy_sha: policy.sha256 })
    require(claim && claim.slug === candidate.slug && claim.mainCommit === main && claim.policySha256 === policy.sha256 && claim.cleanupBeforeSha256 === receipt.cleanup.beforeSha256 && SHA64.test(claim.footballStateSha256 ?? '') && Number.isFinite(Date.parse(claim.claimedAt)), 'price attempt claim invalid')
    write('price', { status: 'attempt-claimed', claim, commands: priceCommands(candidate.slug), noSourceRequests: true })
    for (const [script, ...args] of priceCommands(candidate.slug)) {
      await checkMain()
      runCommand(script, args)
      write('price', { status: 'cli-step-complete', claim, script, args, noSourceRequests: true })
    }
    await checkMain()
    const data = await call('rpc/record_reviewed_existing_prices', { p_slug: candidate.slug, p_main_sha: main, p_policy_sha: policy.sha256 })
    require(data && data.slug === candidate.slug && data.mainCommit === main && data.policySha256 === policy.sha256 && data.cleanupBeforeSha256 === receipt.cleanup.beforeSha256 && data.footballStateSha256 === claim.footballStateSha256 && SHA64.test(data.priceSha256 ?? '') && Number.isFinite(Date.parse(data.recordedAt)), 'price receipt invalid')
    write('price', { status: 'recorded', claim, commands: priceCommands(candidate.slug), data, readback: 'pending' })
    write('price', { claim, commands: priceCommands(candidate.slug), data, receipt: await nativeReceipt({ requireCleanup: true, requirePrices: true }) })
    return data
  }
  if (env.MODE === 'preview') {
    const receipt = await nativeReceipt({ requireCleanup: true, requirePrices: true })
    const nativeData = await call('rpc/check_reviewed_existing_release', { p_slug: candidate.slug, p_main_sha: nativeMain, p_policy_sha: policy.sha256, p_expected_preview_sha: null, p_activate: false })
    const data = { ...nativeData, nativeReceipt: receipt, ...(legacyContinuation ? { releaseMainCommit: nativeMain } : {}) }
    write('preview', data)
    require(data?.ready === true, `native preview HOLD: ${data?.reason ?? 'readiness not established'}`)
    verifyPreviewPayload(data, candidate, policy, main)
    return data
  }
  if (env.MODE === 'activate') {
    const source = await sourceArtifact('preview')
    const preview = verifyActivationPreview(source.data, { slug: candidate.slug, main, expectedPreviewSha256: env.EXPECTED_PREVIEW_SHA256 })
    const receipt = await nativeReceipt({ requireCleanup: true, requirePrices: true })
    require(nativeMain === (preview.releaseMainCommit ?? main), 'native receipt main differs from reviewed preview')
    await checkMain()
    const nativeData = await call('rpc/check_reviewed_existing_release', { p_slug: candidate.slug, p_main_sha: nativeMain, p_policy_sha: policy.sha256, p_expected_preview_sha: preview.previewSha256, p_activate: true })
    const data = { ...nativeData, ...(legacyContinuation ? { releaseMainCommit: nativeMain, nativeReceipt: receipt } : {}) }
    verifyPreviewPayload(data, candidate, policy, main)
    require(data.ready === true && data.active === true && data.previewSha256 === preview.previewSha256, 'native activation receipt differs from reviewed preview')
    const after = await readCompetition()
    require(after.active === true && after.source_policy === policy.document.sourcePolicy, 'activation readback tuple/marker differs')
    write('activate', { data, receipt: await nativeReceipt({ expectedActive: true, requireCleanup: true, requirePrices: true }), competition: after })
    return data
  }
  if (env.MODE === 'receipt') {
    const receipt = await nativeReceipt({ expectedActive: null })
    write('receipt', receipt)
    return receipt
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runStage().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
