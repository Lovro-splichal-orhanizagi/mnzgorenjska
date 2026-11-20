// Read-only routing inventory. Eligibility is not evidence of a successful scan.
// Keep nightly exclusions visible even when the remaining import lanes succeed.
import assert from 'node:assert/strict'
import { writeFileSync, appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { brezIzklopljenih, IZKLOPLJENI_VIRI, ZAVRNJENA_SPLETISCA, kljucVira } from './nocni-kosi.mjs'

export function classifyCoverage(rows) {
  assert(Array.isArray(rows) && rows.length > 0, 'missing active inventory')
  const ids = new Set()
  const leagues = rows.map(row => {
    assert(Number.isSafeInteger(row.id) && row.id > 0 && !ids.has(row.id), 'invalid league identity')
    ids.add(row.id)
    assert(row.active === true && typeof row.slug === 'string' && /^[a-z0-9-]+$/.test(row.slug), 'invalid active league')
    assert(row.source === null || (typeof row.source === 'string' && /^[a-z0-9-]+$/.test(row.source)), 'invalid source')
    assert(Object.hasOwn(row, 'source_policy') && Object.hasOwn(row, 'source_league_code'), 'missing routing fields')
    let route = 'nightly-eligible'
    if (!brezIzklopljenih([row]).length) {
      if (row.source === 'hns') route = 'retained-hns-monitor'
      else if (row.source === 'fcf' && row.source_policy !== null) route = 'policy-excluded'
      else if (IZKLOPLJENI_VIRI.has(row.source)) route = 'source-disabled'
      else if (ZAVRNJENA_SPLETISCA.has(kljucVira(row.source, row.source_league_code))) route = 'source-refused'
      else route = 'unclassified-exclusion'
    }
    // Do not export raw source_policy, league codes, names or database errors.
    return { id: row.id, slug: row.slug, source: row.source, route }
  }).sort((a, b) => a.id - b.id)
  const counts = Object.fromEntries(['nightly-eligible', 'retained-hns-monitor', 'policy-excluded',
    'source-disabled', 'source-refused', 'unclassified-exclusion'].map(k => [k, leagues.filter(l => l.route === k).length]))
  const unresolved = counts['source-disabled'] + counts['source-refused'] + counts['unclassified-exclusion']
  return { state: unresolved ? 'degraded' : 'accounted', activeLeagues: leagues.length, counts, leagues }
}

export async function readActiveInventory(db) {
  const rows = []
  let expected
  for (let offset = 0; ; offset += 500) {
    const result = await db.from('competitions')
      .select('id, slug, active, source, source_league_code, source_policy', { count: 'exact' })
      .eq('active', true).order('id').range(offset, offset + 499)
    assert(result && !result.error && Array.isArray(result.data), 'inventory unavailable')
    assert(Number.isSafeInteger(result.count) && result.count > 0, 'inventory count unavailable')
    expected ??= result.count
    assert(result.count === expected && result.data.length === Math.min(500, expected - offset), 'incomplete inventory')
    rows.push(...result.data)
    if (rows.length === expected) return rows
  }
}

export async function inspectCoverage(db, now = new Date()) {
  const checkedAt = now.toISOString()
  try {
    return { checkedAt, ...classifyCoverage(await readActiveInventory(db)) }
  } catch {
    return { checkedAt, state: 'unknown', reason: 'active-inventory-unavailable-or-invalid' }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let result = { checkedAt: new Date().toISOString(), state: 'unknown', reason: 'active-inventory-unavailable-or-invalid' }
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } })
    result = await inspectCoverage(db)
  } catch { /* Missing configuration/dependencies must also leave an unknown artifact. */ }
  writeFileSync('nightly-source-coverage.json', JSON.stringify(result, null, 2) + '\n')
  const summary = `Nightly source coverage: ${result.state}; active leagues: ${result.activeLeagues ?? 'unknown'}.\n` +
    'Routing inventory only: nightly eligibility does not prove collection or import success.\n' +
    'Policy exclusions stay explicit; HNS health is checked separately by hns-zdravje.\n'
  console.log(summary)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
  if (result.state !== 'accounted') process.exitCode = 1
}
