// Closed Actions repair path. Full source-job/artifact proof runs in the reader
// before this verifier and before any writer credentials are provided.
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { preveriOdobritev, actionsOnly } from './vklopi-dfb-regijo.mjs'
import { canonicalJson, observationSha256, sha256 } from './dfb-current-reactivation.mjs'
export const approvedPlanSha256 = 'af1558e5e9450780afa56b708ae2edb76debb072672cb3265fc022a3f5145717'
const planRaw = readFileSync(new URL('./policies/dfb-current-reactivation-20261018.json', import.meta.url), 'utf8')
if (sha256(planRaw) !== approvedPlanSha256) throw Error('Reviewed DFB reactivation plan file changed')
export const approvedPlan = JSON.parse(planRaw)
const fail = message => { throw Error(`DFB current reconciliation: ${message}`) }
export function verifyRepairInput(raw, approvedSha, planSha, { expectedCommit, now = Date.now() } = {}) {
  if (planSha !== approvedPlanSha256) fail('explicit exact reviewed plan SHA required')
  const m = preveriOdobritev(raw, approvedSha, now)
  // Built manifests have one unambiguous JSON serialization; duplicates cannot
  // survive this comparison even when JSON.parse would otherwise overwrite them.
  if (JSON.stringify(m) + '\n' !== raw) fail('exact built unique-key manifest text required')
  if (m.version !== 3 || m.slug !== approvedPlan.competition.slug || m.sourceCommit !== expectedCommit)
    fail('exact reviewed execution commit and Südwest v3 target required')
  const replayKeys = ['runId','jobId','commit','workflow','step','workflowSha256','parserSha256',
    'artifactId','artifactDigest','generatedAt','statisticsPolicyId','statisticsPolicySha256','firstFantasyPlayedOn']
  if (m.seasons.some(s => Object.keys(s.lineage.replay).some(k => !replayKeys.includes(k)))) fail('unknown execution provenance field')
  if (observationSha256(m) !== approvedPlan.observationSha256) fail('original capture clocks/612 observation facts changed')
  return m
}
export function requireRepairActions(m, env = process.env) {
  actionsOnly()
  if (env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_SHA !== m.sourceCommit || env.SOURCE_COMMIT !== m.sourceCommit)
    fail('repair requires exact reviewed main checkout/execution')
}
export function verifyRepairReceipt(data, manifest, manifestSha) {
  const ids = approvedPlan.players.map(p => p.id), mode = data?.mode
  const fresh = mode === 'fresh'
  if (data?.reconciled !== true || !['fresh','already-active'].includes(mode) || data.count !== 29 ||
      data.updatedCount !== (fresh ? 29 : 0) || canonicalJson(data.playerIds) !== canonicalJson(ids) ||
      data.manifestSha256 !== manifestSha || data.planSha256 !== approvedPlanSha256 ||
      data.observationSha256 !== approvedPlan.observationSha256) fail('bounded native receipt identity/count differs')
  const before = approvedPlan.players.map(p => ({ ...p, active: !fresh }))
  const after = approvedPlan.players.map(p => ({ ...p, active: true }))
  if (canonicalJson(data.before) !== canonicalJson(before) || canonicalJson(data.after) !== canonicalJson(after))
    fail('active-only native before/after images differ')
  const gate = data.nativePreflight
  if (gate?.preverjeno !== true || gate.vklopljena !== false || gate.slug !== manifest.slug ||
      gate.manifestSha256 !== manifestSha || gate.sourceCommit !== manifest.sourceCommit || gate.parserSha256 !== manifest.parserSha256)
    fail('full verified inactive native gate receipt required')
  return data
}
export async function reconcile(raw, approvedSha, planSha, { fetchFn = globalThis.fetch } = {}) {
  const m = verifyRepairInput(raw, approvedSha, planSha, { expectedCommit: process.env.GITHUB_SHA })
  requireRepairActions(m)
  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || !base || new URL(base).protocol !== 'https:') fail('Actions database configuration required')
  const response = await fetchFn(new URL('/rest/v1/rpc/reconcile_dfb_current_players', base), {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_manifest: raw, p_sha256: approvedSha, p_plan: planRaw, p_plan_sha256: planSha }),
    signal: AbortSignal.timeout(120000),
  })
  const data = await response.json()
  if (!response.ok) fail(`native transaction refused: ${data.message ?? response.status}`)
  return verifyRepairReceipt(data, m, approvedSha)
}
async function main() {
  const [mode, file, approvedSha, planSha] = process.argv.slice(2)
  if (!['verify','apply'].includes(mode) || !file || !approvedSha || !planSha) fail('verify|apply <manifest> <approvedSHA> <reviewedPlanSHA>')
  const raw = readFileSync(file, 'utf8'), m = verifyRepairInput(raw, approvedSha, planSha, { expectedCommit: process.env.GITHUB_SHA })
  requireRepairActions(m)
  console.log(JSON.stringify(mode === 'apply' ? await reconcile(raw, approvedSha, planSha) : {
    verified: true, manifestSha256: approvedSha, planSha256: planSha,
    observationSha256: approvedPlan.observationSha256, playerIds: approvedPlan.players.map(p => p.id),
    participantCount: approvedPlan.participants.length, captures: approvedPlan.captures,
  }))
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
