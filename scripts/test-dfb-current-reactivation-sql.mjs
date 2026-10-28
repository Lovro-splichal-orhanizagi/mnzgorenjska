// Explicit owned disposable database only. No reset, credentials or source reads.
import assert from 'node:assert/strict'
import { spawn, execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
const container = process.env.SUPABASE_DB_CONTAINER, db = process.env.SUPABASE_TEST_DB
const actions = process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY === 'Lovro-splichal-orhanizagi/mnzgorenjska' && container === 'supabase_db_mnzgorenjska' && db === 'postgres'
if (!container || !db || (!actions && !/^slff_dfb_reactivation_[a-z0-9_]+$/.test(db))) throw Error('Explicit owned disposable reactivation container/database required')
const fixture = readFileSync(new URL('../supabase/tests/vklop-dfb-regije.sql', import.meta.url), 'utf8').split('create function pg_temp.de_check(')[0]
const historical = readFileSync(new URL('../supabase/tests/dfb-historical-release.sql', import.meta.url), 'utf8').split('-- Later test mutations')[0]
const tests = readFileSync(new URL('../supabase/tests/dfb-current-player-reactivation.sql', import.meta.url), 'utf8')
const args = ['exec', '-i', container, 'psql', '-U', 'supabase_admin', '-d', db, '-X', '-v', 'ON_ERROR_STOP=1']
const child = spawn('docker', [...args, '-v', 'regional_slug=de-regionalliga-suedwest', '-v', 'current_clubs=18', '-v', 'current_rounds=34'], { stdio: ['pipe', 'pipe', 'pipe'] })
let output = ''
child.stdout.on('data', chunk => { output += chunk; process.stdout.write(chunk) })
child.stderr.on('data', chunk => process.stderr.write(chunk))
const closed = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve) })
const held = new Promise((resolve, reject) => {
  // Fixture setup runs all repair rejection cases before reaching the marker.
  // Allow slower CI runners to finish; concurrent writes still get only 500ms.
  const timer = setTimeout(() => reject(Error('Actual native repair did not reach lock verification')), 120000)
  child.stdout.on('data', () => { if (output.includes('DFB_REPAIR_LOCKS_HELD')) { clearTimeout(timer); resolve() } })
  closed.then(code => { if (!output.includes('DFB_REPAIR_LOCKS_HELD')) { clearTimeout(timer); reject(Error(`SQL repair fixture stopped before locks, exit${code}`)) } })
})
child.stdin.write(fixture + historical + tests.replace(/\nrollback;\s*$/, '\n\\echo DFB_REPAIR_LOCKS_HELD\n'))
try {
  await held
  const run = promisify(execFile)
  for (const [label, mutation] of [
    ['canonical player mutation', "update players set value=value where competition_id=(select id from competitions where slug='de-regionalliga-suedwest')"],
    ['fantasy participation', "insert into fantasy_teams(owner_id,name,competition_id)select'da000000-0000-4000-8000-000000000029','blocked concurrent fixture',id from competitions where slug='de-regionalliga-suedwest'"],
  ]) {
    await assert.rejects(run('docker', [...args, '-c', `begin;set local lock_timeout='500ms';${mutation};rollback;`]), error => {
      assert.match(error.stderr, /canceling statement due to lock timeout/)
      return true
    })
    console.log(`PASS independent-session ${label} blocked until repair transaction ends`)
  }
  child.stdin.end('rollback;\n\\q\n')
  assert.equal(await closed, 0)
  // The RPC itself, not a test-only wrapper, rejects non-READ-COMMITTED before
  // it can inspect or change any target data.
  await run('docker', [...args, '-c', `begin isolation level repeatable read;do $$begin begin perform public.reconcile_dfb_current_players('{}',repeat('0',64),'{}',repeat('0',64));raise exception 'isolation accepted';exception when raise_exception then if sqlerrm<>'DFB_REACTIVATION: READ COMMITTED required'then raise;end if;end;end$$;rollback;`])
  console.log('PASS actual RPC refuses non-READ-COMMITTED transaction')
} catch (error) {
  if (!child.stdin.destroyed) child.stdin.end('rollback;\n\\q\n')
  await closed
  throw error
}
