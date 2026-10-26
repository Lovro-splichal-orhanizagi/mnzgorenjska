// Opt in only on an owned disposable container. This runner creates and drops
// its own empty database; it never migrates the container's postgres database.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { assertFcfDisposableTest } from './lib/fcf-disposable-test.mjs'

const migrations = ['20261024130000_fussball_source_identities.sql','20261026192000_fussball_legacy_userid.sql'].map(name=>new URL('../supabase/migrations/'+name,import.meta.url))
const q = value => `'${value.replaceAll("'", "''")}'`
const key = id => Number.parseInt(createHash('sha256').update(id).digest('hex').slice(0, 13), 16) + 2 ** 52
const player = suffix => `de-fussball-player-id-${suffix.padStart(32, '0')}`
const user = suffix => `de-fussball-userid-${suffix.padStart(32, '0')}`
const legacy = digits => `de-fussball-userid-I.${digits}.-----------------------`
const array = ids => `array[${ids.map(q).join(',')}]::text[]`

function disposableContainer(env) {
  assert.equal(env.FUSSBALL_IDENTITIES_DISPOSABLE_TEST, '1', 'Explicit FUSSBALL disposable opt-in required')
  const container = assertFcfDisposableTest({ ...env, FCF_HISTORY_DISPOSABLE_TEST: '1' })
  return container
}

test('identity SQL requires an explicit owned disposable container', () => {
  const env = { FUSSBALL_IDENTITIES_DISPOSABLE_TEST: '1', SUPABASE_DB_CONTAINER: 'supabase_db_slff_fcf_historical_test_20261018_fresh' }
  assert.equal(disposableContainer(env), env.SUPABASE_DB_CONTAINER)
  for (const patch of [{ FUSSBALL_IDENTITIES_DISPOSABLE_TEST: undefined }, { FUSSBALL_IDENTITIES_DISPOSABLE_TEST: 'true' }, { SUPABASE_DB_CONTAINER: 'supabase_db_production' }, { SUPABASE_DB_CONTAINER: 'supabase_db_mnzgorenjska' }]) {
    assert.throws(() => disposableContainer({ ...env, ...patch }), /disposable/)
  }
})

test('identity SQL permits only the exact repository Actions context for the default CI container', () => {
  const ci = { FUSSBALL_IDENTITIES_DISPOSABLE_TEST: '1', SUPABASE_DB_CONTAINER: 'supabase_db_mnzgorenjska', GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Lovro-splichal-orhanizagi/mnzgorenjska' }
  assert.equal(disposableContainer(ci), ci.SUPABASE_DB_CONTAINER)
  for (const patch of [{ FUSSBALL_IDENTITIES_DISPOSABLE_TEST: undefined }, { GITHUB_ACTIONS: undefined }, { GITHUB_ACTIONS: 'false' }, { GITHUB_REPOSITORY: 'fork/mnzgorenjska' }, { GITHUB_REPOSITORY: undefined }]) {
    assert.throws(() => disposableContainer({ ...ci, ...patch }), /disposable/)
  }
})

test('private FUSSBALL registry native SQL contracts', {
  skip: process.env.FUSSBALL_IDENTITIES_DISPOSABLE_TEST !== '1' && 'Set FUSSBALL_IDENTITIES_DISPOSABLE_TEST=1 and an owned disposable SUPABASE_DB_CONTAINER',
}, async t => {
  const container = disposableContainer(process.env)
  const docker = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 30_000, maxBuffer: 8 * 1024 * 1024 })
  const labels = JSON.parse(docker(['inspect', container, '--format', '{{json .Config.Labels}}']))
  assert.equal(labels['com.supabase.cli.project'], container.replace(/^supabase_db_/, ''))
  const database = `slff_fussball_identities_test_${process.pid}_${randomBytes(5).toString('hex')}`
  const sql = (query, db = database) => execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'supabase_admin', '-d', db, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8', timeout: 30_000, maxBuffer: 8 * 1024 * 1024 }).trim()
  sql(`create database ${database} template template0;`, 'postgres')
  try {
    assert.equal(sql("select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to('abc','UTF8')),'hex')"), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'core PostgreSQL SHA-256 is available without extensions')
    for(const migration of migrations) sql(readFileSync(migration, 'utf8'))
    assert.equal(sql("select to_regprocedure('public.fussball_reserve_player_ids(text[])') is not null"), 't', 'identity reservation RPC must exist')

    await t.test('service reservation agrees with JS SHA52, preserves namespaces and is idempotent', () => {
      const publishedToken = 'ABCDEF0123456789ABCDEF0123456789'
      const ids = [player(publishedToken), user(publishedToken), player('1'),legacy('715682'),legacy('573584')]
      const reserve = values => JSON.parse(sql(`set role service_role; select json_agg(r order by source_id) from public.fussball_reserve_player_ids(${array(values)}) r;`))
      const expected = ids.map(source_id => ({ source_id, reg_st: key(source_id) })).sort((a, b) => a.source_id.localeCompare(b.source_id))
      assert.deepEqual(reserve(ids.reverse()), expected)
      assert.deepEqual(reserve(ids), expected)
      assert.notEqual(key(player(publishedToken)), key(user(publishedToken)))
      assert.ok(expected.every(row => Number.isSafeInteger(row.reg_st) && row.reg_st >= 2 ** 52 && row.reg_st <= Number.MAX_SAFE_INTEGER))
      assert.equal(sql('select count(*) from private_fussball.identity_map'), '5')
      assert.equal(key(legacy('715682')),6394905115450194)
    })

    await t.test('anon and authenticated cannot execute RPC or inspect/write private mappings', () => {
      for (const role of ['anon', 'authenticated', 'service_role']) {
        const operations = ['select * from private_fussball.identity_map', `insert into private_fussball.identity_map values (${q(player('2'))},4503599627370496)`, `update private_fussball.identity_map set reg_st=4503599627370496`, 'delete from private_fussball.identity_map']
        if (role !== 'service_role') operations.push(`select * from public.fussball_reserve_player_ids(${array([player('2')])})`)
        for (const operation of operations) sql(`set role ${role}; do $$begin begin execute ${q(operation)}; exception when insufficient_privilege then return; end; raise exception 'unexpected private access'; end$$;`)
      }
      assert.equal(sql("select relrowsecurity from pg_class where oid='private_fussball.identity_map'::regclass"), 't')
      assert.equal(sql("select count(*) from pg_policy where polrelid='private_fussball.identity_map'::regclass"), '0')
    })

    await t.test('invalid arrays reject atomically, including duplicates, bounds, nulls and malformed IDs', () => {
      const before = sql('select count(*) from private_fussball.identity_map')
      const oversized = "array(select 'de-fussball-player-id-'||lpad(upper(to_hex(n)),32,'0') from generate_series(20000,25000)n)"
      const malformedLegacy=[legacy('715682').replace('userid','player-id'),legacy('71568'),legacy('7156820'),legacy('71568A'),legacy('715682').slice(0,-1),legacy('715682')+'-',legacy('715682')+'/',legacy('715682')+'?x=1',legacy('715682')+'#x',legacy('715682')+'\n',legacy('715682').replace('I.','i.'),'de-fussball-userid-715682']
      const bad = [...malformedLegacy.map(id=>array([player('2'),id])),"null::text[]", "'{}'::text[]", 'array[null]::text[]', array([player('2'), player('2')]), array(['de-fussball-player-id-' + 'a'.repeat(32)]), array([player('2') + '\n']), array(['de-fussball-player-id-' + 'A'.repeat(31)]), array(['de-fussball-unknown-' + 'A'.repeat(32)]), `array[${array([player('2')])}]`, `'[0:0]={${player('2')}}'::text[]`, oversized, array([player('2'), 'invalid'])]
      for (const input of bad) sql(`set role service_role; do $$begin begin perform * from public.fussball_reserve_player_ids(${input}); exception when invalid_parameter_value then return; end; raise exception 'unexpected accepted invalid array'; end$$;`)
      assert.equal(sql('select count(*) from private_fussball.identity_map'), before)
    })

    await t.test('legacy mapping collisions and changed mappings roll back the entire mixed batch',()=>{
      const first=player('C'.repeat(32)),victim=legacy('715684'),occupying=user('C'.repeat(32))
      sql(`insert into private_fussball.identity_map values (${q(occupying)},${key(victim)});`)
      sql(`set role service_role; do $$begin begin perform * from public.fussball_reserve_player_ids(${array([victim,first])}); exception when unique_violation then return; end; raise exception 'unexpected accepted legacy collision'; end$$;`)
      assert.equal(sql(`select count(*) from private_fussball.identity_map where source_id in (${q(first)},${q(victim)})`),'0')
      assert.equal(sql(`select reg_st from private_fussball.identity_map where source_id=${q(occupying)}`),String(key(victim)))
      const changed=legacy('715685'),earlier=player('D'.repeat(32))
      sql(`insert into private_fussball.identity_map values (${q(changed)},${key(changed)+1});`)
      sql(`set role service_role; do $$begin begin perform * from public.fussball_reserve_player_ids(${array([changed,earlier])}); exception when check_violation then return; end; raise exception 'unexpected accepted changed legacy mapping'; end$$;`)
      assert.equal(sql(`select count(*) from private_fussball.identity_map where source_id=${q(earlier)}`),'0')
      assert.equal(sql(`select reg_st from private_fussball.identity_map where source_id=${q(changed)}`),String(key(changed)+1))
    })

    await t.test('the bounded maximum accepts exactly 5000 distinct identities', () => {
      assert.equal(sql("set role service_role; select count(*) from public.fussball_reserve_player_ids(array(select 'de-fussball-player-id-'||lpad(upper(to_hex(n)),32,'0') from generate_series(10000,14999)n))"), '5000')
    })

    await t.test('a numeric collision aborts all reservations made earlier in the batch', () => {
      const first = player('A'.repeat(32)), victim = player('Z'.repeat(32)), occupying = user('Z'.repeat(32))
      sql(`insert into private_fussball.identity_map values (${q(occupying)},${key(victim)});`)
      sql(`set role service_role; do $$begin begin perform * from public.fussball_reserve_player_ids(${array([victim, first])}); exception when unique_violation then return; end; raise exception 'unexpected accepted hash collision'; end$$;`)
      assert.equal(sql(`select count(*) from private_fussball.identity_map where source_id in (${q(first)},${q(victim)})`), '0')
      assert.equal(sql(`select reg_st from private_fussball.identity_map where source_id=${q(occupying)}`), String(key(victim)))
    })

    await t.test('an existing mismatched mapping fails closed and rolls back earlier reservations', () => {
      const first = player('B'.repeat(32)), victim = player('Y'.repeat(32))
      sql(`insert into private_fussball.identity_map values (${q(victim)},${key(victim) + 1});`)
      sql(`set role service_role; do $$begin begin perform * from public.fussball_reserve_player_ids(${array([victim, first])}); exception when check_violation then return; end; raise exception 'unexpected accepted changed mapping'; end$$;`)
      assert.equal(sql(`select count(*) from private_fussball.identity_map where source_id=${q(first)}`), '0')
      assert.equal(sql(`select reg_st from private_fussball.identity_map where source_id=${q(victim)}`), String(key(victim) + 1))
    })
  } finally {
    sql(`drop database ${database} with (force);`, 'postgres')
  }
})
