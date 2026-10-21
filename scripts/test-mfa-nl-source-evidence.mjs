import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { sha256, repository } from './dfb-artifacts.mjs'
const moduleURL = new URL('./mfa-nl-source-evidence.mjs', import.meta.url)
const expected = { runId: '123', artifactId: '456', digest: 'sha256:' + 'a'.repeat(64), commit: 'b'.repeat(40), branch: 'codex/mfa-nl-public-capture-20261021', workflow: '.github/workflows/razdeli-zlite-igralce.yml', name: 'mfa-nl2-public-capture-123-1' }
function metadata() {
  return { run: { id: 123, head_sha: expected.commit, head_branch: expected.branch, path: expected.workflow, event: 'workflow_dispatch', status: 'completed', conclusion: 'success', run_attempt: 1, repository: { full_name: repository }, head_repository: { full_name: repository } }, artifact: { id: 456, digest: expected.digest, name: expected.name, expired: false, size_in_bytes: 9000, workflow_run: { id: 123, head_sha: expected.commit } }, expected }
}
test('NL source verifier authenticates exact run/branch/attempt/artifact before ZIP handling', async () => {
  assert.ok(existsSync(moduleURL), 'source verifier exists')
  const { verifyNlArtifactIdentity } = await import(moduleURL)
  assert.doesNotThrow(() => verifyNlArtifactIdentity(metadata()))
  for (const change of [x => x.run.run_attempt++, x => x.run.head_repository.full_name = 'other/repo', x => x.run.head_branch = 'main', x => x.run.conclusion = 'failure', x => x.artifact.digest = 'sha256:' + '0'.repeat(64), x => x.artifact.workflow_run.id++]) {
    const x = metadata(); change(x); assert.throws(() => verifyNlArtifactIdentity(x), /NL evidence/)
  }
})

test('NL ZIP handling rejects bad digests, traversal, symlinks, duplicate names and missing bodies', async () => {
  assert.ok(existsSync(moduleURL))
  const { unpackNlSourceArchive, verifyNlAuditCache } = await import(moduleURL)
  function zip(kind) {
    return execFileSync('python3', ['-c', `import io,zipfile,sys
b=io.BytesIO()
with zipfile.ZipFile(b,'w') as z:
 k=sys.argv[1]
 if k=='symlink':
  n=zipfile.ZipInfo('cache/safe.json');n.create_system=3;n.external_attr=0o120777<<16;z.writestr(n,'target')
 elif k=='duplicate':
  z.writestr('cache/safe.json','{}');z.writestr('cache/safe.json','{}')
 else:z.writestr('../escape.json' if k=='traversal' else 'cache/safe.json','{}')
sys.stdout.buffer.write(b.getvalue())`, kind], { stdio: ['ignore', 'pipe', 'ignore'] })
  }
  const clean = zip('clean')
  assert.equal(unpackNlSourceArchive(clean, 'sha256:' + sha256(clean)).files.get('cache/safe.json').toString(), '{}')
  assert.throws(() => unpackNlSourceArchive(clean, 'sha256:' + '0'.repeat(64)), /digest/)
  for (const kind of ['traversal', 'symlink', 'duplicate']) { const b = zip(kind); assert.throws(() => unpackNlSourceArchive(b, 'sha256:' + sha256(b)), /NL evidence|Command failed/) }
  assert.throws(() => verifyNlAuditCache(unpackNlSourceArchive(clean, 'sha256:' + sha256(clean)), { league: 'mt-nl2', sourceRunId: '123', prefix: 'audit/' }), /missing/)
})

test('capture validation cannot accept a refusal, incomplete run or an unauthenticated resume chain', async () => {
  const { verifyNlCaptureLedger } = await import(moduleURL)
  const make = data => ({ files: new Map(Object.entries(data).map(([name, value]) => [name, Buffer.from(JSON.stringify(value))])), members: new Map() })
  for (const status of [{ denied: true, complete: true }, { denied: false, complete: false }]) assert.throws(() => verifyNlCaptureLedger(make({ 'capture-status.json': status, 'capture-ledger.json': {}, 'cache-manifest.json': {} }), { runId: '123', commit: expected.commit }), /complete.*unrefused/)
  const status = { denied: false, complete: true, runId: '123', reviewedSha: expected.commit, resumeSourceRunId: '122', league: 'mt-nl2', codes: ['6234492/2026', '6234492/2027'] }
  assert.throws(() => verifyNlCaptureLedger(make({ 'capture-status.json': status, 'capture-ledger.json': {}, 'cache-manifest.json': {} }), { runId: '123', commit: expected.commit }), /resume/)
})

test('resumed cache hits must retain authenticated prior bytes and absent-metadata responses', async t => {
  const { verifyNlCaptureLedger } = await import(moduleURL)
  const old = Buffer.from('{"official":true}'), fresh = Buffer.from('[]')
  const row = (file, body) => ({ file, bytes: body.length, sha256: sha256(body), mtime: '2026-10-21T00:00:00Z', generated: false })
  const pack = data => ({ files: new Map(Object.entries(data).map(([n, v]) => [n, Buffer.isBuffer(v) ? v : Buffer.from(JSON.stringify(v))])), members: new Map() })
  const prior = pack({ 'cache/old.json': old, 'cache-manifest.json': { files: [row('old.json', old)] }, 'capture-status.json': { runId: '122', reviewedSha: expected.commit, complete: false, denied: false, actualRequests: 2, resumeSourceRunId: null }, 'capture-ledger.json': { requests: [{ status: 200, refusal: false, completeBody: true, bodyRetained: true, bodyFile: 'cache/old.json', bodyBytes: old.length, bodySha256: sha256(old) }, { status: null, refusal: false, bodyRetained: false, error: 'The operation was aborted due to timeout', finishedAt: '2026-10-21T00:00:04Z' }] } })
  const resumed = (body, file = 'old.json') => pack({
    ['cache/' + file]: body, 'cache/new.json': fresh,
    'capture-status.json': { complete: true, denied: false, runId: '123', reviewedSha: expected.commit, resumeSourceRunId: '122', league: 'mt-nl2', codes: ['6234492/2026', '6234492/2027'], actualRequests: 1, maxRequests: 550, maxBytes: 64 * 1024 * 1024, bytes: body.length + fresh.length, files: 2, cacheHits: 1 },
    'capture-ledger.json': { complete: true, denied: false, requests: [{ index: 1, method: 'GET', cacheHit: false, refusal: false, completeBody: true, bodyRetained: true, status: 200, url: 'https://api.mfa.com.mt/api/matches/123/result', file: 'new.json', bodyFile: 'cache/new.json', bodyBytes: fresh.length, bodySha256: sha256(fresh), startedAt: '2026-10-21T00:00:10Z', finishedAt: '2026-10-21T00:00:11Z' }], reads: [{ url: 'https://api.mfa.com.mt/api/matches/122/result', file, cacheHit: true, sha256: sha256(body) }, { url: 'https://api.mfa.com.mt/api/matches/123/result', file: 'new.json', cacheHit: false, sha256: sha256(fresh) }] },
    'cache-manifest.json': { maxFiles: 2000, maxBodyBytes: 2 * 1024 * 1024, maxBytes: 64 * 1024 * 1024, exportedBytes: body.length + fresh.length, files: [{ ...row(file, body), generated: file.startsWith('po-sifri-') }, row('new.json', fresh)] },
    'resume-source-run.json': { ...metadata().run, id: 122, conclusion: 'failure' },
  })
  const options = { runId: '123', commit: expected.commit, priorCapture: { runId: '122', archive: prior } }
  await t.test('cache substitution is rejected', () => {
    assert.equal(verifyNlCaptureLedger(resumed(old), options).cumulativeRequests, 3)
    assert.throws(() => verifyNlCaptureLedger(resumed(Buffer.from('{"altered":true}')), options), /prior.*cache|cache.*prior/)
  })
  await t.test('prior metadata 404 retains response and generated sentinel separately', () => {
    const sentinel = Buffer.from('{"ni":404}'), response = Buffer.from('not found'), file = 'po-sifri-122.json'
    const metadataPrior = { files: new Map(prior.files), members: new Map() }
    metadataPrior.files.delete('cache/old.json'); metadataPrior.files.set('cache/' + file, sentinel); metadataPrior.files.set('responses/1.bin', response)
    const ledger = JSON.parse(prior.files.get('capture-ledger.json'))
    ledger.requests[0] = { ...ledger.requests[0], status: 404, file, bodyFile: 'responses/1.bin', bodyBytes: response.length, bodySha256: sha256(response), absentMetadata: true }
    metadataPrior.files.set('capture-ledger.json', Buffer.from(JSON.stringify(ledger)))
    metadataPrior.files.set('cache-manifest.json', Buffer.from(JSON.stringify({ files: [{ ...row(file, sentinel), generated: true }] })))
    assert.equal(verifyNlCaptureLedger(resumed(sentinel, file), { ...options, priorCapture: { runId: '122', archive: metadataPrior } }).cumulativeRequests, 3)
  })
})
