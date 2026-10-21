// Retained public-source evidence only: no provider or database transport.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sha256, repository } from './dfb-artifacts.mjs'

const fail = message => { throw Error(`MFA NL evidence: ${message}`) }
const require = (condition, message) => { if (!condition) fail(message) }
const numeric = x => /^[1-9]\d{0,19}$/.test(String(x))
const filename = n => /^[A-Za-z0-9_-]+[.]json$/.test(n)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const parsedDate = d => Number.isFinite(Date.parse(d))
export function verifyNlArtifactIdentity({ run, artifact, expected, priorCapture = false }) {
  require(expected && numeric(expected.runId) && numeric(expected.artifactId) && /^sha256:[a-f0-9]{64}$/.test(expected.digest ?? '') && /^[a-f0-9]{40}$/.test(expected.commit ?? ''), 'exact artifact pins required')
  require(expected.workflow === '.github/workflows/razdeli-zlite-igralce.yml' && ['main', 'codex/mfa-nl-public-capture-20261021'].includes(expected.branch), 'unsupported source workflow or branch')
  require(String(run?.id) === expected.runId && run.head_sha === expected.commit && run.head_branch === expected.branch && run.path === expected.workflow && run.event === 'workflow_dispatch' && run.status === 'completed' && run.conclusion === (priorCapture ? 'failure' : 'success') && run.run_attempt === 1 && run.repository?.full_name === repository && run.head_repository?.full_name === repository, 'exact completed first-attempt source run required')
  require(String(artifact?.id) === expected.artifactId && artifact.digest === expected.digest && artifact.name === expected.name && artifact.expired === false && String(artifact.workflow_run?.id) === expected.runId && artifact.workflow_run?.head_sha === expected.commit && Number.isSafeInteger(artifact.size_in_bytes) && artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 64 * 1024 * 1024, 'artifact identity, size or digest differs')
  return expected
}

/** Authenticate every ZIP member without extracting paths or following links. */
export function unpackNlSourceArchive(bytes, digest) {
  require(Buffer.isBuffer(bytes) && bytes.length <= 64 * 1024 * 1024 && `sha256:${sha256(bytes)}` === digest, 'ZIP digest differs')
  const dir = mkdtempSync(join(tmpdir(), 'slff-mfa-nl-evidence-'))
  try {
    const path = join(dir, 'source.zip'); writeFileSync(path, bytes)
    const data = JSON.parse(execFileSync('python3', ['-c', `
import zipfile,sys,stat,re,hashlib,base64,json
z=zipfile.ZipFile(sys.argv[1]); ms=z.infolist(); names=[m.filename for m in ms]
if len(ms)>4100 or len(names)!=len(set(names)) or sum(m.file_size for m in ms)>320*1024*1024:raise ValueError('NL evidence: ZIP count/size/duplicate bound')
fixed={'fixture-inventory.json','report-analysis.json','cache-manifest.json','source-run.json','capture-status.json','capture-ledger.json','resume-source-run.json','audit/fixture-inventory.json','audit/report-analysis.json','audit/cache-manifest.json'}
files={};members={}
for m in ms:
 n=m.filename
 cache=re.fullmatch(r'(?:audit/)?cache/[A-Za-z0-9_-]+[.]json',n)
 response=re.fullmatch(r'responses/[1-9][0-9]*[.]bin',n)
 if n not in fixed and not cache and not response:raise ValueError('NL evidence: unsafe member')
 if m.is_dir() or m.flag_bits&1 or stat.S_ISLNK(m.external_attr>>16) or m.file_size>(2 if cache or response else 64)*1024*1024:raise ValueError('NL evidence: unsafe member metadata')
 b=z.read(m);members[n]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
 if not n.startswith('audit/cache/'):files[n]=base64.b64encode(b).decode()
print(json.dumps({'files':files,'members':members}))
`, path], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }))
    return { files: new Map(Object.entries(data.files).map(([name, body]) => [name, Buffer.from(body, 'base64')])), members: new Map(Object.entries(data.members)) }
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

function json(archive, name) {
  const body = archive.files.get(name)
  require(body, `missing ${name}`)
  try { return JSON.parse(body) } catch { fail(`invalid JSON ${name}`) }
}

export function verifyNlAuditCache(archive, { league, sourceRunId, prefix = '' }) {
  const tuple = { 'mt-nl1': [973, '2601267'], 'mt-nl2': [974, '6234492'] }[league]
  require(tuple && numeric(sourceRunId) && ['', 'audit/'].includes(prefix), 'fixed NL audit scope required')
  const m = json(archive, prefix + 'fixture-inventory.json'), c = json(archive, prefix + 'cache-manifest.json')
  require(same(m.league, { id: tuple[0], slug: league, source: 'mfa', source_league_code: `${tuple[1]}/2027` }) && m.sourceRunId === sourceRunId && c.league === league && c.sourceRunId === sourceRunId && same(m.cacheCatalog, c.files), 'source audit tuple/catalog differs')
  require(same(m.reports, json(archive, prefix + 'report-analysis.json').reports), 'report analysis differs')
  require(Array.isArray(m.cacheCatalog) && m.cacheCatalog.length > 0 && m.cacheCatalog.length <= 2000, 'cache catalog bound')
  const seen = new Set(); let total = 0
  for (const row of m.cacheCatalog) {
    require(filename(row.file) && !seen.has(row.file) && parsedDate(row.mtime), 'unsafe duplicate cache or invalid original mtime')
    const member = archive.members.get(prefix + 'cache/' + row.file), body = archive.files.get('cache/' + row.file)
    require(member && body && member.bytes === row.bytes && member.sha256 === row.sha256 && body.length === row.bytes && sha256(body) === row.sha256, `cache bytes/hash differ ${row.file}`)
    try { JSON.parse(body) } catch { fail(`invalid cache JSON ${row.file}`) }
    seen.add(row.file); total += row.bytes
  }
  const actual = [...archive.members.keys()].filter(n => n.startsWith(prefix + 'cache/')).map(n => n.slice((prefix + 'cache/').length))
  require(actual.length === seen.size && actual.every(n => seen.has(n)) && m.limits.actualFiles === seen.size && m.limits.actualBytes === total && total <= 64 * 1024 * 1024, 'cache inventory/byte totals differ')
  require(Array.isArray(m.inventory) && m.inventory.length === 2 && Array.isArray(m.reports), 'both source seasons required')
  const played = new Map()
  for (const [year, kind] of [[2026, 'archive'], [2027, 'current']]) {
    const entries = m.inventory.filter(i => i.kind === kind)
    require(entries.length === 1, `exact ${kind} inventory required`)
    const i = entries[0], season = `${year - 1}/${String(year).slice(2)}`
    require(i.code === `${tuple[1]}/${year}` && i.season === season && i.completeUpcomingPagination === true && Array.isArray(i.matches) && i.counts.fixtures === i.matches.length && i.counts.played === i.matches.filter(t => t.status === 'PLAYED').length, 'source season/counts differ')
    for (const fixture of i.matches) if (fixture.status === 'PLAYED') {
      const id = String(fixture.id); require(!played.has(id), 'duplicate played source identity'); played.set(id, { kind, season })
    }
  }
  const ids = new Set()
  for (const r of m.reports) {
    const p = played.get(r.sourceId)
    require(p && !ids.has(r.sourceId) && r.id === `mt${r.sourceId}` && r.kind === p.kind && r.season === p.season, 'source report/fixture identity differs')
    for (const part of ['izid', 'postava']) require(seen.has(`tekma-${r.sourceId}-${part}.json`), 'missing result/lineup pair')
    ids.add(r.sourceId)
  }
  require(ids.size === played.size, 'incomplete played report set')
  return { manifest: m, cache: new Map([...archive.files].filter(([name]) => /^cache\//.test(name)).map(([name, body]) => [name.slice(6), body])), files: seen.size, bytes: total }
}

/** The optional prior archive must have its own independently pinned ZIP/run. */
export function verifyNlCaptureLedger(archive, { runId, commit, priorCapture = null }) {
  const s = json(archive, 'capture-status.json'), l = json(archive, 'capture-ledger.json'), c = json(archive, 'cache-manifest.json')
  require(s.complete === true && s.denied === false && !s.error, 'complete unrefused capture required')
  require(s.runId === runId && s.reviewedSha === commit && s.league === 'mt-nl2' && same(s.codes, ['6234492/2026', '6234492/2027']), 'capture native tuple/run differs')
  require(s.resumeSourceRunId === (priorCapture?.runId ?? null), 'exact authenticated resume chain required')
  let last = null, priorRequests = 0
  if (priorCapture) {
    const ps = json(priorCapture.archive, 'capture-status.json'), pl = json(priorCapture.archive, 'capture-ledger.json'), pc = json(priorCapture.archive, 'cache-manifest.json')
    const run = json(archive, 'resume-source-run.json')
    require(ps.runId === priorCapture.runId && ps.reviewedSha === commit && ps.resumeSourceRunId === null && !ps.complete && ps.denied === false && ps.actualRequests === pl.requests.length && pl.requests.length > 0 && pl.requests.length <= 550 && pl.requests.every(r => r.refusal === false), 'prior capture receipt is refused, chained or inconsistent')
    const end = pl.requests.at(-1)
    require(end.status === null && end.error === 'The operation was aborted due to timeout' && !end.bodyRetained, 'reviewed network-timeout resume only')
    require(String(run.id) === priorCapture.runId && run.head_sha === commit && run.head_branch === 'codex/mfa-nl-public-capture-20261021' && run.path === '.github/workflows/razdeli-zlite-igralce.yml' && run.event === 'workflow_dispatch' && run.run_attempt === 1 && run.status === 'completed' && run.conclusion === 'failure' && run.repository?.full_name === repository && run.head_repository?.full_name === repository, 'resume metadata differs')
    for (const row of pl.requests.slice(0, -1)) {
      const body = priorCapture.archive.files.get(row.bodyFile)
      require(row.completeBody && row.bodyRetained && body && body.length === row.bodyBytes && sha256(body) === row.bodySha256, 'prior retained HTTP body differs')
      if ([400, 404].includes(row.status)) {
        const sentinel = pc.files.find(f => f.file === row.file)
        const raw = priorCapture.archive.files.get('cache/' + row.file)
        require(row.absentMetadata === true && /^po-sifri-[1-9]\d*[.]json$/.test(row.file) && row.bodyFile.startsWith('responses/') && sentinel?.generated === true && raw && raw.length === sentinel.bytes && sha256(raw) === sentinel.sha256 && same(JSON.parse(raw), { ni: row.status }), 'prior absent metadata response/sentinel differs')
      } else require(row.status === 200 && row.bodyFile.startsWith('cache/'), 'unexpected prior HTTP status')
    }
    last = Date.parse(end.finishedAt); require(Number.isFinite(last), 'prior request end required'); priorRequests = pl.requests.length
  }
  require(s.actualRequests === l.requests?.length && s.actualRequests > 0 && s.actualRequests <= s.maxRequests && s.maxRequests === 550 && l.complete === true && l.denied === false && !l.error, 'capture request bound/state differs')
  require(c.maxFiles === 2000 && c.maxBodyBytes === 2 * 1024 * 1024 && c.maxBytes === 64 * 1024 * 1024 && s.maxBytes === c.maxBytes, 'capture byte/file bounds differ')
  const catalog = new Map(); let bytes = 0
  for (const row of c.files) {
    const body = archive.files.get('cache/' + row.file)
    require(filename(row.file) && !catalog.has(row.file) && parsedDate(row.mtime) && body && body.length === row.bytes && body.length <= c.maxBodyBytes && sha256(body) === row.sha256, 'capture cached bytes/hash/mtime differ')
    catalog.set(row.file, row); bytes += row.bytes
  }
  const responses = new Set(), attributed = new Set()
  for (const [index, row] of l.requests.entries()) {
    require(row.index === index + 1 && row.method === 'GET' && row.cacheHit === false && row.refusal === false && row.completeBody === true && row.bodyRetained === true, 'partial/refused capture request')
    const start = Date.parse(row.startedAt), end = Date.parse(row.finishedAt)
    require(Number.isFinite(start) && Number.isFinite(end) && start <= end && (last === null || start - last >= 2990), 'minimum source request delay differs'); last = end
    require(row.url.startsWith('https://api.mfa.com.mt/api/') && (row.bodyFile === 'cache/' + row.file || row.bodyFile === `responses/${row.index}.bin`), 'source origin/body path differs')
    const body = archive.files.get(row.bodyFile)
    require(body && body.length === row.bodyBytes && sha256(body) === row.bodySha256, 'capture HTTP body differs')
    if ([400, 404].includes(row.status)) {
      require(row.absentMetadata === true && row.bodyFile.startsWith('responses/') && /^po-sifri-[1-9]\d*[.]json$/.test(row.file) && catalog.get(row.file)?.generated === true && same(json(archive, 'cache/' + row.file), { ni: row.status }), 'only absent metadata may use a generated sentinel')
      responses.add(row.bodyFile); bytes += body.length
    } else require(row.status === 200 && row.bodyFile.startsWith('cache/') && !row.error, 'unexpected capture HTTP status/error')
    attributed.add(row.file)
  }
  const actualCache = [...archive.files.keys()].filter(n => n.startsWith('cache/')).map(n => n.slice(6))
  const actualResponses = [...archive.files.keys()].filter(n => n.startsWith('responses/'))
  require(actualCache.length === catalog.size && actualCache.every(n => catalog.has(n)) && actualResponses.length === responses.size && actualResponses.every(n => responses.has(n)), 'capture exported body set differs')
  require(bytes === s.bytes && bytes === c.exportedBytes && bytes <= c.maxBytes && catalog.size === s.files && catalog.size <= c.maxFiles, 'capture shared raw byte/file totals differ')
  require(Array.isArray(l.reads) && l.reads.every(r => typeof r.cacheHit === 'boolean' && typeof r.url === 'string' && r.url.startsWith('https://api.mfa.com.mt/api/') && catalog.get(r.file)?.sha256 === r.sha256) && l.reads.filter(r => r.cacheHit).length === s.cacheHits, 'capture read provenance differs')
  for (const read of l.reads) {
    if (read.cacheHit) {
      const priorBody = priorCapture?.archive.files.get('cache/' + read.file)
      const priorRow = priorCapture && json(priorCapture.archive, 'cache-manifest.json').files.find(r => r.file === read.file)
      require(priorBody && priorRow && priorBody.length === priorRow.bytes && sha256(priorBody) === priorRow.sha256 && priorRow.sha256 === read.sha256 && priorRow.bytes === catalog.get(read.file).bytes && Boolean(priorRow.generated) === Boolean(catalog.get(read.file).generated), 'resumed cache differs from authenticated prior cache')
    } else require(l.requests.some(r => r.status === 200 && r.file === read.file && r.url === read.url && r.bodySha256 === read.sha256), 'fresh read has no matching current HTTP response')
    attributed.add(read.file)
  }
  require([...catalog.keys()].every(file => attributed.has(file)), 'cached body lacks authenticated source provenance')
  return { requests: s.actualRequests, priorRequests, cumulativeRequests: s.actualRequests + priorRequests, rawBytes: bytes, cacheFiles: catalog.size }
}
