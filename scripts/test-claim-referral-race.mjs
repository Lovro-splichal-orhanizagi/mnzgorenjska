// A team and its referral can arrive in concurrent requests after signup.
// Catch a lost first-qualification event: both writes must see one another.
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { randomUUID, randomInt } from 'node:crypto'
const container = process.env.SUPABASE_DB_CONTAINER
if (!container) throw new Error('Set SUPABASE_DB_CONTAINER to a disposable local database.')
const args = ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', process.env.SUPABASE_TEST_DB ?? 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
const friend = randomUUID(), inviter = randomUUID(), id = -randomInt(2_000_000, 900_000_000)
function sql(input) { return execFileSync('docker', args, { input, encoding: 'utf8', timeout: 15000 }).trim() }
let child
try {
  sql(`begin;
    insert into competitions(id,slug,name,short_name,active,country_id,source) overriding system value
    values(${id},'claim-race-${friend}','Claim race','TEST',false,(select id from countries where code='SI'),'mnzg');
    insert into auth.users(id,email,raw_user_meta_data) values
      ('${friend}','${friend}@example.invalid','{"display_name":"Race friend"}'),
      ('${inviter}','${inviter}@example.invalid','{"display_name":"Race inviter"}');
    commit;`)
  child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] })
  let output = '', errors = ''
  const done = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(errors)))
  })
  child.stderr.on('data', chunk => { errors += chunk })
  const inserted = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => { output += chunk; if (output.includes('TEAM_INSERTED')) resolve() })
    child.on('close', () => { if (!output.includes('TEAM_INSERTED')) reject(new Error(errors)) })
  })
  child.stdin.end(`begin;
    set statement_timeout='10s';
    insert into fantasy_teams(owner_id,name,competition_id) values('${friend}','Race team',${id});
    select 'TEAM_INSERTED';
    select pg_sleep(1);
    commit;`)
  await inserted
  // Runs while the other transaction's team is uncommitted.
  sql(`set statement_timeout='10s'; insert into povabila(povabljeni,povabil) values('${friend}','${inviter}');`)
  await done
  assert.equal(sql(`select kvalificiran_at is not null from povabila where povabljeni='${friend}';`), 't',
    'Concurrent team and referral writes must record the first qualification')
  console.log('PASS concurrent team and referral record one qualification')
} finally {
  if (child && child.exitCode === null) {
    await new Promise(resolve => child.on('close', resolve))
  }
  sql(`begin; delete from auth.users where id in ('${friend}','${inviter}'); delete from competitions where id=${id}; commit;`)
}
