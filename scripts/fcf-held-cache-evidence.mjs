// Offline diagnostics only: never call a provider, fetch a page or write to a DB.
import { constants, closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isFcfCurrentPage } from './viri/fcf-current.mjs'
import { vZapisnik } from './viri/fcf.mjs'

export const CACHE_KEY = 'zapisniki-ES-k1od1-44377442413-1'
const MAX_BYTES = 2 * 1024 * 1024
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
function noLinks(path) {
  for (let p = resolve(path); ; p = dirname(p)) {
    if (lstatSync(p).isSymbolicLink()) throw new Error('symlink rejected')
    if (dirname(p) === p) return
  }
}
function readBounded(path) {
  noLinks(path)
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
  try {
    const stat = fstatSync(fd)
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('not a bounded regular file')
    const bytes = readFileSync(fd)
    if (bytes.length > MAX_BYTES) throw new Error('file grew beyond bound')
    return bytes
  } finally { closeSync(fd) }
}

export function exportHeldCache({ cacheDir, outputDir, matchedKey, cacheHit, runId, commit }) {
  if (matchedKey !== CACHE_KEY || cacheHit !== 'true') throw new Error('exact incident cache required')
  noLinks(cacheDir)
  noLinks(dirname(outputDir))
  // Fresh output only; neither originals nor previous evidence are overwritten.
  mkdirSync(outputDir, { mode: 0o700 })
  const files = readdirSync(cacheDir).filter(n => /^acta-[1-9]\d*\.html$/.test(n)).sort()
  if (!files.length || files.length > 10000) throw new Error('missing or oversized incident cache')
  const manifest = {
    schemaVersion: 1, kind: 'fcf-held-cache-diagnostics', cacheKey: CACHE_KEY,
    extraction: { runId, commit }, sourceFetchTime: null,
    limitation: 'Cache inventory, not the set attempted by the incident job; freshness unverified. No source requests or database writes.',
    counts: { files: files.length, current: 0, complete: 0, held: 0, invalid: 0, legacy: 0 },
    reasons: {}, reports: [], samples: [],
  }
  for (const name of files) {
    const id = 'es' + name.slice(5, -5), url = `https://www.fcf.cat/ca/competicio/acta/${id.slice(2)}`
    let html, proofBytes, z
    try {
      html = readBounded(join(cacheDir, name))
      if (!isFcfCurrentPage(html.toString())) { manifest.counts.legacy++; continue }
      manifest.counts.current++
      proofBytes = readBounded(join(cacheDir, name.replace('.html', '.redirect.json')))
      const proof = JSON.parse(proofBytes)
      if (proof.id !== id || proof.url !== url || proof.sha256 !== digest(html)) throw new Error('binding mismatch')
      z = vZapisnik(html.toString(), { id, url, redirectHtml: proof.redirectHtml })
      if (!z) throw new Error('missing report')
    } catch {
      manifest.counts.invalid++
      manifest.reports.push({ id, status: 'invalid-cache-or-identity' })
      continue
    }
    if (!z.nepopoln) { manifest.counts.complete++; continue }
    manifest.counts.held++
    const reasons = z.opozorila.map(w => w.replace(/\b\d+\b/g, '<n>'))
    const newReason = reasons.some(r => !manifest.reasons[r])
    for (const reason of reasons) manifest.reasons[reason] = (manifest.reasons[reason] ?? 0) + 1
    manifest.reports.push({ id, status: 'held', warnings: z.opozorila })
    // Keep a small representative set, including less common hold categories.
    if (manifest.samples.length < 8 || (newReason && manifest.samples.length < 12)) {
      const proofName = name.replace('.html', '.redirect.json')
      writeFileSync(join(outputDir, name), html, { flag: 'wx', mode: 0o600 })
      writeFileSync(join(outputDir, proofName), proofBytes, { flag: 'wx', mode: 0o600 })
      manifest.samples.push({ id, report: name, reportSha256: digest(html), proof: proofName, proofSha256: digest(proofBytes) })
    }
  }
  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  return manifest
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const env = process.env
  if (process.argv.length !== 2 || env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REPOSITORY !== 'Lovro-splichal-orhanizagi/mnzgorenjska') throw new Error('incident runner only')
  const manifest = exportHeldCache({ cacheDir: resolve('scripts/.predpomnilnik/fcf'), outputDir: resolve('fcf-held-evidence'),
    matchedKey: env.FCF_CACHE_MATCHED_KEY, cacheHit: env.FCF_CACHE_HIT, runId: env.GITHUB_RUN_ID, commit: env.GITHUB_SHA })
  console.log(JSON.stringify(manifest.counts))
  // Missing identity evidence is an incomplete observation, never a green recovery.
  if (manifest.counts.invalid || !manifest.counts.current) process.exitCode = 1
}
