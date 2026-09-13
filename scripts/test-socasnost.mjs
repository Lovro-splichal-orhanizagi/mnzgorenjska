// Dve pravi povezavi preverita, da shranjevanje in zajem postave pocakata
// na isti zaklep. Potreben je lokalni Docker stack z uveljavljenimi migracijami.
// Test ustvari samo svoje nakljucne negativne ID-je in jih v finally pobrise.
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { randomInt, randomUUID } from 'node:crypto'
import { setTimeout as pocakaj } from 'node:timers/promises'

const vsebnik = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_mnzgorenjska'
const baza = process.env.SUPABASE_TEST_DB ?? 'postgres'
const args = [
  'exec', '-i', vsebnik, 'psql', '-U', 'postgres', '-d', baza,
  '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
]
const uporabnik = randomUUID()
const oznaka = `test-socasnost-${uporabnik}`
const id = -randomInt(1_000_000, 2_000_000_000)
const igralecA = id - 1
const igralecB = id - 2
const povezave = []
let ustvarjeno = false

const niz = (vrednost) => `'${String(vrednost).replaceAll("'", "''")}'`
const kader = (igralec) => niz(JSON.stringify([{ player_id: igralec, is_starter: true }]))

function sql(ukaz) {
  return execFileSync('docker', args, {
    input: ukaz, encoding: 'utf8', timeout: 20_000,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}

function povezava(pripona) {
  const otrok = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] })
  const p = { otrok, ime: `${oznaka}-${pripona}`, izhod: '', napaka: '', koncana: false, koda: null }
  otrok.stdout.setEncoding('utf8').on('data', (v) => { p.izhod += v })
  otrok.stderr.setEncoding('utf8').on('data', (v) => { p.napaka += v })
  otrok.on('error', (e) => { p.napaka += e.message; p.koncana = true; p.koda = -1 })
  otrok.on('close', (koda) => { p.koncana = true; p.koda = koda })
  otrok.stdin.on('error', (e) => { p.napaka += e.message })
  povezave.push(p)
  otrok.stdin.write(`
    set application_name = ${niz(p.ime)};
    set statement_timeout = '15s';
    set idle_in_transaction_session_timeout = '15s';
  `)
  return p
}

async function doPogoja(pogoj, opis, p, omejitev = 8000) {
  const konec = Date.now() + omejitev
  while (Date.now() < konec) {
    if (pogoj()) return
    if (p?.koncana) throw new Error(`${opis}: povezava se je ze koncala. ${p.napaka || p.izhod}`)
    await pocakaj(50)
  }
  throw new Error(`${opis}: casovna omejitev. ${p?.napaka ?? ''}`)
}

async function zaklepJePridobljen(p) {
  await doPogoja(() => p.izhod.split('\n').includes('ZAKLEP_PRIDOBLJEN'), 'Pridobitev zaklepa', p)
}

async function cakaNaZaklep(p) {
  await doPogoja(() => sql(`
    select count(*) from pg_stat_activity
    where application_name = ${niz(p.ime)}
      and wait_event_type = 'Lock' and wait_event = 'advisory';
  `) === '1', 'Druga povezava mora cakati na svetovalni zaklep', p)
}

async function koncaj(p, ukaz = '') {
  p.otrok.stdin.end(ukaz)
  await doPogoja(() => p.koncana, 'Konec transakcije', null, 18_000)
  assert.equal(p.koda, 0, p.napaka || p.izhod)
}

function prijava() {
  return `select set_config('request.jwt.claim.sub', ${niz(uporabnik)}, true);
          set local role authenticated;`
}

try {
  sql(`
    begin;
    set local statement_timeout = '15s';
    insert into competitions(id, slug, name, short_name, active, country_id, source)
      overriding system value
      values (${id}, ${niz(oznaka)}, 'Test socasnosti', 'TEST', false,
              (select id from countries where code = 'SI'), 'mnzg');
    insert into teams(id, name, short_name, country_id) overriding system value
      values (${id}, ${niz(oznaka)}, 'TEST', (select id from countries where code = 'SI'));
    insert into players(id, team_id, competition_id, first_name, last_name,
                        position, position_source, value, value_start, active)
      overriding system value values
      (${igralecA}, ${id}, ${id}, 'Test', 'A', 'GK', 'admin', 6, 6, true),
      (${igralecB}, ${id}, ${id}, 'Test', 'B', 'DEF', 'admin', 10, 10, true);
    insert into auth.users(id, email, raw_user_meta_data, created_at)
      values (${niz(uporabnik)}, ${niz(`${oznaka}@example.invalid`)},
              '{"display_name":"Test socasnosti"}', now());
    insert into fantasy_teams(id, owner_id, name, competition_id) overriding system value
      values (${id}, ${niz(uporabnik)}, 'Test socasnosti', ${id});
    insert into rounds(id, competition_id, season, number, deadline_at) overriding system value
      values (${id}, ${id}, '2099/00', 1, now() + interval '1 day');
    commit;
  `)
  ustvarjeno = true

  // B prebere zacetni cash=100, nato mora cakati. A medtem kupi za 6.
  // B mora po cakanju prebrati cash=94, prodati A za 6 in kupiti B za 10.
  const a = povezava('save-a')
  a.otrok.stdin.write(`
    begin;
    select pg_advisory_xact_lock(hashtextextended('slff-kader:' || (${id})::text, 0));
    \\echo ZAKLEP_PRIDOBLJEN
  `)
  await zaklepJePridobljen(a)
  const b = povezava('save-b')
  b.otrok.stdin.end(`
    begin;
    ${prijava()}
    select shrani_ekipo(${id}, ${kader(igralecB)}::jsonb);
    commit;
  `)
  await cakaNaZaklep(b)
  await koncaj(a, `
    ${prijava()}
    select shrani_ekipo(${id}, ${kader(igralecA)}::jsonb);
    commit;
  `)
  await doPogoja(() => b.koncana, 'Drugo shranjevanje', null, 18_000)
  assert.equal(b.koda, 0, b.napaka || b.izhod)
  const stanje = JSON.parse(sql(`
    select json_build_object('cash', ft.cash,
      'igralci', (select json_agg(player_id order by player_id)
                 from fantasy_roster where fantasy_team_id = ft.id))
    from fantasy_teams ft where ft.id = ${id};
  `))
  assert.equal(stanje.cash, 90, 'Drugi nakup mora uporabiti sredstva po prvi potrjeni transakciji')
  assert.deepEqual(stanje.igralci, [igralecB], 'Veljati mora nazadnje shranjeni kader')
  console.log('PASS socasni shranjevanji: drugi kader, pravilna gotovina 90')

  // A shrani pred rokom, a transakcije se ne potrdi. Rok fixture nato
  // potece; pravi zakleni_krog mora pocakati na potrditev in posneti A.
  const c = povezava('capture-save')
  c.otrok.stdin.write(`
    begin;
    ${prijava()}
    select shrani_ekipo(${id}, ${kader(igralecA)}::jsonb);
    \\echo ZAKLEP_PRIDOBLJEN
  `)
  await zaklepJePridobljen(c)
  sql(`update rounds set deadline_at = clock_timestamp() where id = ${id};`)
  const d = povezava('capture')
  d.otrok.stdin.end(`select zakleni_krog(${id});`)
  await cakaNaZaklep(d)
  await koncaj(c, 'commit;\n')
  await doPogoja(() => d.koncana, 'Zajem postave', null, 18_000)
  assert.equal(d.koda, 0, d.napaka || d.izhod)
  const posnetek = JSON.parse(sql(`
    select json_build_object('zaklenjen', r.lineups_locked_at is not null,
      'igralci', (select json_agg(player_id order by player_id)
                 from fantasy_lineups where round_id = r.id and fantasy_team_id = ${id}))
    from rounds r where r.id = ${id};
  `))
  assert.equal(posnetek.zaklenjen, true, 'Zajem mora dokoncno zapreti krog')
  assert.deepEqual(posnetek.igralci, [igralecA], 'Zajem mora videti potrjeno postavo pred rokom')
  console.log('PASS socasna shranitev in zaklep kroga: posneta potrjena postava')
} catch (e) {
  console.error(`FAIL socasnost: ${e.message}`)
  process.exitCode = 1
} finally {
  try {
    // Ob padcu najprej ustavimo SAMO svoje povezave, da sprostijo zaklepe.
    if (povezave.length) {
      sql(`select pg_terminate_backend(pid) from pg_stat_activity
           where application_name in (${povezave.map((p) => niz(p.ime)).join(',')})
             and pid <> pg_backend_pid();`)
    }
    if (ustvarjeno) {
      sql(`
        begin;
        set local statement_timeout = '15s';
        delete from fantasy_teams where id = ${id} and owner_id = ${niz(uporabnik)};
        delete from auth.users where id = ${niz(uporabnik)};
        delete from players where id in (${igralecA}, ${igralecB}) and competition_id = ${id};
        delete from teams where id = ${id} and name = ${niz(oznaka)};
        delete from rounds where id = ${id} and competition_id = ${id};
        delete from competitions where id = ${id} and slug = ${niz(oznaka)};
        commit;
      `)
      assert.equal(sql(`select
        (select count(*) from auth.users where id = ${niz(uporabnik)}) +
        (select count(*) from competitions where id = ${id});`), '0', 'Testni podatki morajo biti pobrisani')
      console.log('PASS ciscenje: testni uporabnik in tekmovanje odstranjena')
    }
  } catch (e) {
    console.error(`FAIL ciscenje socasnosti (${oznaka}, ID ${id}): ${e.message}`)
    process.exitCode = 1
  } finally {
    for (const p of povezave) {
      p.otrok.stdin.destroy()
      if (!p.koncana) p.otrok.kill()
    }
  }
}
