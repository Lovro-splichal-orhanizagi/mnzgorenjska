import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { locenaHkrati } from './hkratnost.mjs'

const source = readFileSync(new URL('./cakaj-na-uvoze.mjs', import.meta.url), 'utf8')
// Execute the actual crossing decision with isolated GitHub job responses.
function crossing(drzava, jobs) {
  const context = vm.createContext({
    mojaDrzava: drzava, mojaLiga: 'candidate', mojaJeAktivna: false,
    mojaZveza: null, popravek: false, locenaHkrati,
    ligaPoSlugu: new Map(), drzavaPopravka: () => ({ pise: true, drzava }),
    gh: () => JSON.stringify({ jobs }),
  })
  vm.runInContext(source.match(/const SKUPEN_VIR = [^\n]+/)[0] + '\n' +
    source.slice(source.indexOf('function seKrize('), source.indexOf('\nif (samoTece)')), context)
  return vm.runInContext("seKrize('uvoz-zapisnikov.yml', 'Nightly import', 123)", context)
}

test('inactive German import waits for the older German nightly job only', () => {
  assert.equal(crossing('DE', [{ name: 'uvoz DE', status: 'in_progress' }]), true)
  assert.equal(crossing('DE', [{ name: 'uvoz DE', status: 'completed' }, { name: 'uvoz AT', status: 'in_progress' }]), false)
  assert.equal(crossing('DE', []), true)
})

test('inactive Slovenian and unknown-country imports retain their nightly isolation', () => {
  for (const country of ['SI', null]) {
    assert.equal(crossing(country, [{ name: `uvoz ${country}`, status: 'in_progress' }]), false)
  }
})

test('coordination reads German leagues beyond the 1000-row boundary in stable pages', async () => {
  const { vseVrstice } = await import('./strani.mjs')
  const rows = Array.from({ length: 1079 }, (_, id) => ({ id, slug: id === 1078 ? 'de-regionalliga-bayern' : `league-${id}` }))
  const calls = []
  const db = { from(table) {
    assert.equal(table, 'competitions')
    return { select() {
      return { then(resolve) { resolve({ data: rows.slice(0, 1000), error: null }) },
        order(column) { assert.equal(column, 'id'); return {
          range(start, end) { calls.push([start, end]); return Promise.resolve({ data: rows.slice(start, end + 1), error: null }) },
        } },
      }
    } }
  } }
  const block = source.slice(source.indexOf('let lige\n'), source.indexOf('const ligaPoSlugu'))
  const result = await vm.runInNewContext(`(async () => { ${block}\n return lige })()`, { db, vseVrstice, console, process })
  assert.equal(result.length, 1079)
  assert.equal(result.at(-1).slug, 'de-regionalliga-bayern')
  assert.deepEqual(calls, [[0, 999], [1000, 1999]])
})

// Run the full actual coordinator with isolated API/database responses. This
// tests discovery and older-run ordering, not only the crossing predicate.
const regional = [
  ['uvoz-dfb-regije.yml', 'Uvoz odobrene DFB regije de-regionalliga-nord'],
  ['vklop-dfb-regije.yml', 'Preverjen vklop DFB regije de-regionalliga-nord'],
]
const fixtures = [
  { slug: 'de-regionalliga-nord', active: false, source: 'dfb', countries: { code: 'DE' }, federations: { code: 'nfv-nord' } },
  { slug: 'si-example', active: false, source: 'nzs', countries: { code: 'SI' }, federations: { code: 'mnzg' } },
  { slug: 'at-one', active: false, source: 'oefb', countries: { code: 'AT' }, federations: { code: 'wfv' } },
  { slug: 'at-two', active: false, source: 'oefb', countries: { code: 'AT' }, federations: { code: 'wfv' } },
]
const startedAt = '2026-10-17T10:00:00Z'
const run = (title, patch = {}) => ({ databaseId: 10, startedAt, status: 'in_progress', displayTitle: title, ...patch })
async function coordinate(args, runs = {}) {
  class Exit extends Error { constructor(code) { super(); this.code = code } }
  const queried = [], logs = []
  const context = {
    process: { argv: ['node', 'coordinator', '--najvec', '3', ...args], env: { GITHUB_RUN_ID: '20', GITHUB_REPOSITORY: 'fixture/repo' }, exit: code => { throw new Exit(code) } },
    console: { log: x => logs.push(x), error: x => logs.push(x) },
    createClient: () => ({}), vseVrstice: async () => fixtures, locenaHkrati,
    setTimeout: callback => { callback() },
    execFileSync: (command, a) => {
      assert.equal(command, 'gh')
      if (a[1] === 'view') return JSON.stringify(a.includes('jobs') ? { jobs: [{ name: 'uvoz DE', status: 'completed' }] } : { startedAt })
      const workflow = a[a.indexOf('--workflow') + 1]; queried.push(workflow)
      return JSON.stringify(runs[workflow] ?? [])
    },
  }
  try { await vm.runInNewContext(`(async () => { ${source.replace(/^import .*$/gm, '')} })()`, context); assert.fail('coordinator must exit') }
  catch (e) { if (!(e instanceof Exit)) throw e; return { code: e.code, queried, logs } }
}

test('newer German/global player splits wait for each regional writer; independent countries do not', async () => {
  for (const [workflow, title] of regional) {
    for (const args of [['--popravek', '--vir', 'dfb'], ['--popravek', '--tekmovanje', 'de-regionalliga-nord'], ['--popravek']]) {
      assert.equal((await coordinate(args, { [workflow]: [run(title)] })).code, 1, `${workflow}: ${args}`)
    }
    assert.equal((await coordinate(['--popravek', '--vir', 'nzs'], { [workflow]: [run(title)] })).code, 0)
    assert.equal((await coordinate(['--liga', 'si-example'], { [workflow]: [run(title)] })).code, 0)
    assert.equal((await coordinate(['--drzava', 'DE'], { [workflow]: [run(title)] })).code, 1)
  }
})

test('newer regional import/release waits for older global maintenance or German split, preserving dry-run and country exemptions', async () => {
  for (const [workflow, title] of [
    ['zdruzi-klube.yml', 'Zdruzi podvojena kluba'], ['tedensko-cene.yml', 'Tedensko prevrednotenje'],
    ['razdeli-zlite-igralce.yml', 'Razdeli zlite igralce vse (pisi)'], ['razdeli-zlite-igralce.yml', 'Razdeli zlite igralce dfb (pisi)'],
  ]) assert.equal((await coordinate(['--liga', 'de-regionalliga-nord'], { [workflow]: [run(title)] })).code, 1)
  for (const title of ['Razdeli zlite igralce dfb', 'Razdeli zlite igralce nzs (pisi)']) {
    assert.equal((await coordinate(['--liga', 'de-regionalliga-nord'], { 'razdeli-zlite-igralce.yml': [run(title)] })).code, 0)
  }
  assert.equal((await coordinate(['--liga', 'at-one'], { 'uvoz-lige.yml': [run('Uvoz lige at-two')] })).code, 0)
})

test('regional writer ordering includes queued older runs and excludes newer, completed and self runs', async () => {
  for (const [workflow, title] of regional) {
    for (const patch of [{ status: 'queued' }, { databaseId: 30, startedAt: '2026-10-17T09:59:59Z' }]) {
      assert.equal((await coordinate(['--popravek'], { [workflow]: [run(title, patch)] })).code, 1)
    }
    for (const patch of [{ databaseId: 30 }, { databaseId: 20 }, { status: 'completed' }, { startedAt: '2026-10-17T10:00:01Z' }]) {
      assert.equal((await coordinate(['--popravek'], { [workflow]: [run(title, patch)] })).code, 0)
    }
    assert.equal((await coordinate(['--liga', 'si-example'], { [workflow]: [run('Unknown historical title')] })).code, 1)
  }
})

test('health check exempts inactive regional imports but waits for a release that may activate them', async () => {
  assert.equal((await coordinate(['--tece'], { [regional[0][0]]: [run(regional[0][1])] })).code, 0)
  assert.equal((await coordinate(['--tece'], { [regional[1][0]]: [run(regional[1][1])] })).code, 3)
})

test('actual club-merge and weekly-price shell waiters see older regional jobs and preserve ordering', async () => {
  const { execFileSync, spawnSync } = await import('node:child_process')
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs')
  const { join } = await import('node:path'), { tmpdir } = await import('node:os')
  const dir = mkdtempSync(join(tmpdir(), 'slff-coordination-'))
  try {
    // Only fake API responses; jq executes each workflow's real filter.
    writeFileSync(join(dir, 'gh'), `#!${process.execPath}\n` + `
      const {execFileSync}=require('node:child_process'); const a=process.argv.slice(2);
      const f=JSON.parse(process.env.COORDINATION_FIXTURE);
      const data=a[1]==='view'?{startedAt:f.startedAt}:(a[a.indexOf('--workflow')+1]===f.workflow?f.runs:[]);
      process.stdout.write(execFileSync('jq',['-r',a[a.indexOf('--jq')+1]],{input:JSON.stringify(data),encoding:'utf8'}));
    `, { mode: 0o755 })
    writeFileSync(join(dir, 'sleep'), '#!/bin/sh\nexit 79\n', { mode: 0o755 })
    for (const wf of ['zdruzi-klube.yml', 'tedensko-cene.yml']) {
      const text = readFileSync(new URL(`../.github/workflows/${wf}`, import.meta.url), 'utf8')
      const block = text.slice(text.indexOf('      - name: Pocakaj na starejse uvoze')).split('        run: |\n')[1].split('\n      - name:')[0]
      const script = block.split('\n').filter(x => x.startsWith('          ')).map(x => x.slice(10)).join('\n')
      for (const [workflow, title] of [...regional, ['vklop-katalonije.yml', 'Preverjen vklop Katalonije ES']]) for (const [patch, expected] of [[{},79],[{status:'queued'},79],[{databaseId:30,startedAt:'2026-10-17T09:59:59Z'},79],[{databaseId:30},0],[{databaseId:20},0],[{status:'completed'},0]]) {
        const result = spawnSync('bash', ['-c', script], { encoding: 'utf8', timeout: 10000,
          env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, GITHUB_RUN_ID: '20', GITHUB_REPOSITORY: 'fixture/repo',
            COORDINATION_FIXTURE: JSON.stringify({ startedAt, workflow, runs: [run(title, patch)] }) } })
        assert.equal(result.status, expected, `${wf} / ${workflow} / ${JSON.stringify(patch)}: ${result.stderr}`)
        if (expected === 79) assert.match(result.stdout, /Pred mano tece se 1 uvozov/)
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('Catalan batch is a fixed ES writer in both directions, including nightly and manual imports', async () => {
  fixtures.push({ slug: 'es-ct-primera-g1', active: false, source: 'fcf', countries: { code: 'ES' }, federations: { code: 'fcf' } })
  const workflow = 'vklop-katalonije.yml', title = 'Preverjen vklop Katalonije ES'
  for (const args of [['--drzava', 'ES'], ['--liga', 'es-ct-primera-g1'], ['--popravek', '--vir', 'fcf'], ['--popravek']]) {
    assert.equal((await coordinate(args, { [workflow]: [run(title)] })).code, 1, String(args))
  }
  for (const args of [['--drzava', 'DE'], ['--liga', 'si-example'], ['--popravek', '--vir', 'nzs']]) {
    assert.equal((await coordinate(args, { [workflow]: [run(title)] })).code, 0, String(args))
  }
  // The batch's own --drzava ES waits for older manual writes even when inactive.
  assert.equal((await coordinate(['--drzava', 'ES'], { 'uvoz-lige.yml': [run('Uvoz lige es-ct-primera-g1')] })).code, 1)
  assert.equal((await coordinate(['--drzava', 'ES'], { 'uvoz-zapisnikov.yml': [run('Nightly import')] })).code, 1)
  assert.equal((await coordinate(['--tece'], { [workflow]: [run(title)] })).code, 3)
  for (const patch of [{ status: 'queued' }, { displayTitle: 'Historical title without a slug' }]) assert.equal((await coordinate(['--drzava', 'ES'], { [workflow]: [run(title, patch)] })).code, 1)
  for (const patch of [{ databaseId: 30 }, { databaseId: 20 }, { status: 'completed' }]) assert.equal((await coordinate(['--drzava', 'ES'], { [workflow]: [run(title, patch)] })).code, 0)
})
