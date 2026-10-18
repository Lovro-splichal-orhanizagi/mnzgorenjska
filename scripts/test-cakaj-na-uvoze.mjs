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
  { slug: 'es-ct-primera-g1', active: false, source: 'fcf', countries: { code: 'ES' }, federations: { code: 'fcf' } },
  { slug: 'es-active', active: true, source: 'fcf', countries: { code: 'ES' }, federations: { code: 'fcf' } },
]
const startedAt = '2026-10-17T10:00:00Z'
const run = (title, patch = {}) => ({ databaseId: 10, startedAt, status: 'in_progress', displayTitle: title, ...patch })
async function coordinate(args, runs = {}, jobs = [{ name: 'uvoz DE', status: 'completed' }], historyControl = {}) {
  class Exit extends Error { constructor(code) { super(); this.code = code } }
  const queried = [], logs = [], historyPages = []
  const context = {
    process: { argv: ['node', 'coordinator', '--najvec', '3', ...args], env: { GITHUB_RUN_ID: '20', GITHUB_REPOSITORY: 'fixture/repo' }, exit: code => { throw new Exit(code) } },
    console: { log: x => logs.push(x), error: x => logs.push(x) },
    createClient: () => ({}), vseVrstice: async () => fixtures, locenaHkrati,
    setTimeout: callback => { callback() },
    execFileSync: (command, a) => {
      assert.equal(command, 'gh')
      if (a[0] === 'api') {
        const path = a.find(x => typeof x === 'string' && x.startsWith('repos/'))
        assert.match(path, /^repos\/fixture\/repo\/actions\/workflows\/uvoz-fcf-zgodovina\.yml\/runs\?per_page=100&page=[1-9]\d*$/)
        const page = Number(new URL('https://test.invalid/' + path).searchParams.get('page')); historyPages.push(page); queried.push('uvoz-fcf-zgodovina.yml')
        if (historyControl.error) throw Error('mock GitHub unavailable')
        if (historyControl.response) return JSON.stringify(historyControl.response(page))
        const all = (runs['uvoz-fcf-zgodovina.yml'] ?? []).map(z => ({id:z.databaseId,status:z.status,display_title:z.displayTitle,created_at:z.startedAt,run_started_at:z.startedAt,run_attempt:1,path:'.github/workflows/uvoz-fcf-zgodovina.yml',repository:{full_name:'fixture/repo'},head_sha:'a'.repeat(40),head_branch:'main',event:'workflow_dispatch'}))
        return JSON.stringify({total_count:all.length,workflow_runs:all.slice((page-1)*100,page*100)})
      }
      if (a[1] === 'view') return JSON.stringify(a.includes('jobs') ? { jobs } : { startedAt })
      const workflow = a[a.indexOf('--workflow') + 1]; queried.push(workflow)
      return JSON.stringify((runs[workflow] ?? []).slice(0, Number(a[a.indexOf('--limit') + 1]) || 50))
    },
  }
  try { await vm.runInNewContext(`(async () => { ${source.replace(/^import .*$/gm, '')} })()`, context); assert.fail('coordinator must exit') }
  catch (e) { if (!(e instanceof Exit)) throw e; return { code: e.code, queried, logs, historyPages } }
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
      for (const [workflow, title] of [...regional, ['vklop-katalonije.yml', 'Preverjen vklop Katalonije ES'], ...extraWriters]) for (const [patch, expected] of [[{},79],[{status:'queued'},79],[{databaseId:30,startedAt:'2026-10-17T09:59:59Z'},79],[{databaseId:30},0],[{databaseId:20},0],[{status:'completed'},0]]) {
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

const extraWriters = [
  ['uskladi-pozicije.yml', 'Uskladi pozicije fcf (pisi)'],
  ['izstop-kluba.yml', 'Izstop kluba es-ct-primera-g1 (pisi)'],
  ['cene-lig.yml', 'Cene lig'],
]
test('Catalan preflight waits for every overlapping position/withdrawal/price writer, including historical in-flight runs', async () => {
  for (const [workflow, title] of extraWriters) {
    for (const patch of [{}, { status: 'queued' }, { displayTitle: 'Historical writer without scope' }, { displayTitle: workflow === 'uskladi-pozicije.yml' ? 'Uskladi pozicije (Sportnet)' : workflow === 'izstop-kluba.yml' ? 'Izstop kluba' : 'Cene lig' }]) {
      assert.equal((await coordinate(['--drzava', 'ES'], { [workflow]: [run(title, patch)] })).code, 1, workflow)
    }
    for (const patch of [{ status: 'completed' }, { databaseId: 30 }, { databaseId: 20 }]) {
      assert.equal((await coordinate(['--drzava', 'ES'], { [workflow]: [run(title, patch)] })).code, 0, workflow)
    }
  }
  for (const [workflow, title] of [
    ['uskladi-pozicije.yml', 'Uskladi pozicije fcf (suho)'],
    ['izstop-kluba.yml', 'Izstop kluba es-ct-primera-g1 (suho)'],
    ['uskladi-pozicije.yml', 'Uskladi pozicije nzs (pisi)'],
    ['izstop-kluba.yml', 'Izstop kluba si-example (pisi)'],
  ]) assert.equal((await coordinate(['--drzava', 'ES'], { [workflow]: [run(title)] })).code, 0, title)
})

test('newer scoped maintenance and global price batches wait for older Catalan activation', async () => {
  const older = { 'vklop-katalonije.yml': [run('Preverjen vklop Katalonije ES')] }
  for (const args of [['--popravek', '--vir', 'fcf'], ['--popravek', '--tekmovanje', 'es-ct-primera-g1'], ['--popravek']]) {
    assert.equal((await coordinate(args, older)).code, 1)
  }
  for (const args of [['--popravek', '--vir', 'nzs'], ['--popravek', '--tekmovanje', 'si-example']]) assert.equal((await coordinate(args, older)).code, 0)
})

// Execute actual workflow run bodies with only process/network boundaries fake.
// A failed coordinator must stop the workflow before any real mutator is called.
test('actual position sync, withdrawal, pricing and activation workflow paths wait before mutation; read-only modes skip wait', async () => {
  const { spawnSync } = await import('node:child_process')
  const { mkdtempSync, writeFileSync, rmSync, existsSync } = await import('node:fs')
  const { join } = await import('node:path'), { tmpdir } = await import('node:os')
  const dir = mkdtempSync(join(tmpdir(), 'slff-writer-path-'))
  const node = process.execPath
  try {
    writeFileSync(join(dir, 'node'), `#!${node}\n` + `
      const fs=require('node:fs'),a=process.argv.slice(2);fs.appendFileSync(process.env.CALL_LOG,JSON.stringify(a)+'\\n');
      if(a[0]==='scripts/cakaj-na-uvoze.mjs')process.exit(process.env.BLOCK_WAIT==='true'?79:0);
      if(a[0]==='-e'){process.stdin.resume();process.stdin.on('end',()=>process.stdout.write('es-ct-primera-g1\\n'));return}
      if(a[0]==='scripts/pripravljenost-lige.mjs'){const f=process.env.CALL_LOG+'.ready';if(fs.existsSync(f))process.exit(0);fs.writeFileSync(f,'1');process.exit(1)}
      process.exit(0);
    `, { mode: 0o755 })
    writeFileSync(join(dir, 'curl'), '#!/bin/sh\nprintf "[]"\n', { mode: 0o755 })
    writeFileSync(join(dir, 'npm'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
    const options = [
      ['uskladi-pozicije.yml', { pisi: true, suho: true }, ['--popravek', '--vir', 'fcf', '--tekmovanje', 'es-ct-primera-g1'], 'scripts/uskladi-pozicije.mjs'],
      ['izstop-kluba.yml', { pisi: false, suho: false }, ['--popravek', '--tekmovanje', 'es-ct-primera-g1'], 'scripts/izstop-kluba.mjs'],
      ['cene-lig.yml', {}, ['--popravek'], 'scripts/lazni-vratarji.mjs'],
      ['vklop-katalonije.yml', {}, ['--drzava', 'ES', '--najvec', '300'], 'scripts/vklopi-katalonijo.mjs'],
    ]
    for (const [workflow, flags, expectedArgs, mutator] of options) {
      const text = readFileSync(new URL(`../.github/workflows/${workflow}`, import.meta.url), 'utf8')
      assert.match(text, /actions: read/, `${workflow}: coordinator needs Actions read permission`)
      const steps = text.split(/^      - /m).slice(1)
      const build = f => steps.flatMap(step => {
        if (/if: inputs\.pisi/.test(step) && !f.pisi || /if:.*!inputs\.suho/.test(step) && f.suho) return []
        const line = step.match(/^        run: (.*)$/m)
        if (!line) return []
        let body = line[1] === '|' ? step.slice(line.index + line[0].length + 1).split('\n').filter(x => x.startsWith('          ')).map(x => x.slice(10)).join('\n') : line[1]
        body = body.replaceAll('${{ inputs.vir || \'sportnet\' }}', 'fcf').replaceAll("${{ inputs.vse_pozicije && 'args+=(--vse-pozicije)' || 'true' }}", 'true').replaceAll("${{ inputs.pisi && 'args+=(--pisi)' || 'true' }}", f.pisi ? 'args+=(--pisi)' : 'true')
        body = body.replaceAll('/tmp/', `${dir}/`)
        return [body]
      }).join('\n')
      for (const block of ['true', 'false']) {
        const log = join(dir, `${workflow}-${block}.log`)
        const result = spawnSync('bash', ['-euo', 'pipefail', '-c', build(flags)], { encoding: 'utf8', timeout: 10000,
          env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, BLOCK_WAIT: block, CALL_LOG: log,
            VIR: 'fcf', TEKMOVANJE: 'es-ct-primera-g1', LIGA: 'es-ct-primera-g1', LIGE: 'es-ct-primera-g1', PREDPONA: '', ACTIVATE: 'true', APPROVED_SHA: 'a'.repeat(64), GITHUB_STEP_SUMMARY: join(dir, 'summary'),
            SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture', SUHO: String(flags.suho) } })
        const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(x => JSON.parse(x)) : []
        assert.deepEqual(calls[0], ['scripts/cakaj-na-uvoze.mjs', ...expectedArgs], `${workflow}: actual waiter must precede mutation: ${result.stderr}`)
        if (block === 'true') { assert.equal(result.status, 79, workflow); assert.equal(calls.length, 1, `${workflow}: failed wait cannot continue`) }
        else { assert.equal(result.status, 0, `${workflow}: ${result.stderr} / ${result.stdout}`); assert.ok(calls.some(c => c[0] === mutator), `${workflow}: expected actual next step`) }
      }
      if (['uskladi-pozicije.yml', 'izstop-kluba.yml'].includes(workflow)) {
        const readOnly = build({ pisi: false, suho: true })
        assert.doesNotMatch(readOnly, /cakaj-na-uvoze/)
      }
      assert.match(text, /GH_TOKEN: \$\{\{ github.token \}\}/)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('fixed FCF source reader serializes both ES directions without becoming a DB writer', async () => {
  const workflow = 'fcf-javni-dokazi.yml'
  for (const args of [['--drzava', 'ES'], ['--liga', 'es-active'], ['--liga', 'es-ct-primera-g1'], ['--popravek', '--vir', 'fcf'], ['--popravek']]) {
    for (const patch of [{}, {status:'queued'}, {displayTitle:'Unknown historical title'}]) assert.equal((await coordinate(args, { [workflow]: [run('FCF public evidence', patch)] })).code, 1, String(args))
  }
  for (const args of [['--drzava', 'DE'], ['--liga', 'si-example']]) assert.equal((await coordinate(args, { [workflow]: [run('FCF')] })).code, 0)
  for (const patch of [{databaseId:20}, {databaseId:30}, {status:'completed'}, {startedAt:'2026-10-17T10:00:01Z'}]) assert.equal((await coordinate(['--drzava','ES'], { [workflow]: [run('FCF',patch)] })).code, 0)
  for (const slug of ['es-active', 'es-ct-primera-g1']) assert.equal((await coordinate(['--drzava','ES'], {'uvoz-lige.yml':[run('Uvoz lige '+slug)]})).code,1)
  assert.equal((await coordinate(['--drzava','ES'], {'vklop-katalonije.yml':[run('Catalan preflight')]})).code,1)
  const nightly = {'uvoz-zapisnikov.yml':[run('Nightly')]}
  assert.equal((await coordinate(['--drzava','ES'],nightly,[{name:'uvoz ES',status:'in_progress'},{name:'uvoz DE',status:'completed'}])).code,1)
  assert.equal((await coordinate(['--drzava','ES'],nightly,[{name:'uvoz ES',status:'completed'},{name:'uvoz DE',status:'in_progress'}])).code,0)
  const diagnostic = await coordinate(['--tece'], { [workflow]: [run('FCF')] })
  assert.equal(diagnostic.code,0); assert.ok(!diagnostic.queried.includes(workflow))
})

test('newer ES/global operations wait for the older one-shot inventory; unrelated countries remain independent', async () => {
  const workflow = 'uvoz-fcf-zgodovina.yml', title = 'FCF history missing-inventory g1-then-g9-missing-v1'
  for (const args of [['--drzava', 'ES'], ['--popravek'], ['--tece']]) {
    assert.equal((await coordinate(args, { [workflow]: [run(title)] })).code, args.includes('--tece') ? 3 : 1)
  }
  assert.equal((await coordinate(['--drzava', 'DE'], { [workflow]: [run(title)] })).code, 0)
})
test('both legacy coordination loops classify history cache-export and seed-stage as source-free', async () => {
  const workflow = 'uvoz-fcf-zgodovina.yml'
  for (const mode of ['cache-export', 'seed-stage']) for (const args of [['--drzava', 'ES'], ['--tece']]) {
    const result = await coordinate(args, { [workflow]: [run(`FCF history ${mode} fixed`)] })
    assert.equal(result.code, 0); assert.ok(result.queried.includes(workflow))
  }
})

const historyWire = (id, patch = {}) => ({id,status:'completed',display_title:'FCF history seed-stage fixed',created_at:startedAt,run_started_at:startedAt,run_attempt:1,path:'.github/workflows/uvoz-fcf-zgodovina.yml',repository:{full_name:'fixture/repo'},head_sha:'a'.repeat(40),head_branch:'main',event:'workflow_dispatch',...patch})

for (const args of [['--drzava', 'ES'], ['--tece']]) test(`history discovery sees older active inventory after100 completed runs in ${args.join(' ')}`, async () => {
  const completed = Array.from({length:100}, (_, i) => run('FCF history seed-stage fixed', {databaseId:1000+i,status:'completed'})), active = run('FCF history missing-inventory g1-then-g9-missing-v1')
  const result = await coordinate(args, {'uvoz-fcf-zgodovina.yml':[...completed,active]})
  assert.equal(result.code,args.includes('--tece')?3:1);assert.deepEqual(result.historyPages,[1,2])
})
for (const args of [['--drzava', 'ES'], ['--tece']]) for (const [name,historyControl] of [
  ['API failure',{error:true}],
  ['duplicate run identities',{response:()=>({total_count:2,workflow_runs:[historyWire(10),historyWire(10)]})}],
  ['changing page count',{response:page=>({total_count:page===1?101:102,workflow_runs:page===1?Array.from({length:100},(_,i)=>historyWire(i+100)): [historyWire(10)]})}],
  ['unknown active ordering',{response:()=>({total_count:1,workflow_runs:[historyWire(10,{status:'queued',run_started_at:null,created_at:null})]})}],
  ['enumeration bound exceeded',{response:()=>({total_count:10001,workflow_runs:[]})}],
  ['incomplete response',{response:()=>({total_count:101,workflow_runs:[]})}],
  ['foreign repository',{response:()=>({total_count:1,workflow_runs:[{id:10,status:'in_progress',path:'.github/workflows/uvoz-fcf-zgodovina.yml',repository:{full_name:'foreign/repo'}}]})}],
]) test(`history ${name} fails closed in ${args.join(' ')}`, async()=>{await assert.rejects(()=>coordinate(args,{},undefined,historyControl),/FCF history|mock GitHub/)})

test('dedicated HNS writer has explicit HR scope even before registration',()=>{
 for(const country of ['HR','DE',null]){
  const context=vm.createContext({mojaDrzava:country,mojaLiga:'candidate',mojaJeAktivna:false,mojaZveza:null,popravek:false,locenaHkrati,ligaPoSlugu:new Map(),drzavaPopravka:()=>({pise:true,drzava:country}),gh:()=>{throw Error('no remote jobs needed')}})
  vm.runInContext(source.match(/const SKUPEN_VIR = [^\n]+/)[0]+'\n'+source.slice(source.indexOf('function seKrize('),source.indexOf('\nif (samoTece)')),context)
  assert.equal(vm.runInContext("seKrize('uvoz-hr-zenske.yml','Uvoz HNS zena hr-prva-hnlz',123)",context),country!=='DE')
 }
 assert.equal((source.match(/'uvoz-hr-zenske.yml'/g)??[]).length>=3,true)
})

test('HNS workflow is visible to older-run coordination and both global shell writers',async()=>{
 const title='Uvoz HNS zena hr-prva-hnlz'
 assert.equal((await coordinate(['--drzava','HR'],{'uvoz-hr-zenske.yml':[run(title)]})).code,1)
 assert.equal((await coordinate(['--drzava','DE'],{'uvoz-hr-zenske.yml':[run(title)]})).code,0)
 const {spawnSync}=await import('node:child_process'),{mkdtempSync,writeFileSync,rmSync}=await import('node:fs'),{join}=await import('node:path'),{tmpdir}=await import('node:os'),dir=mkdtempSync(join(tmpdir(),'hns-global-waiter-'))
 try{
  writeFileSync(join(dir,'gh'),`#!${process.execPath}\nconst {execFileSync}=require('node:child_process'),a=process.argv.slice(2);const data=a[1]==='view'?{startedAt:'${startedAt}'}:(a[a.indexOf('--workflow')+1]==='uvoz-hr-zenske.yml'?JSON.parse(process.env.HNS_TEST_RUNS):[]);process.stdout.write(execFileSync('jq',['-r',a[a.indexOf('--jq')+1]],{input:JSON.stringify(data),encoding:'utf8'}));`,{mode:0o755})
  writeFileSync(join(dir,'sleep'),'#!/bin/sh\nexit 79\n',{mode:0o755})
  for(const wf of ['zdruzi-klube.yml','tedensko-cene.yml']){
   const text=readFileSync(new URL(`../.github/workflows/${wf}`,import.meta.url),'utf8'),block=text.slice(text.indexOf('      - name: Pocakaj na starejse uvoze')).split('        run: |\n')[1].split('\n      - name:')[0],script=block.split('\n').filter(x=>x.startsWith('          ')).map(x=>x.slice(10)).join('\n')
   for(const [patch,expected]of [[{},79],[{status:'completed'},0]]){const result=spawnSync('bash',['-c',script],{encoding:'utf8',timeout:10000,env:{...process.env,PATH:`${dir}:${process.env.PATH}`,GITHUB_RUN_ID:'20',GITHUB_REPOSITORY:'fixture/repo',HNS_TEST_RUNS:JSON.stringify([run(title,patch)])}});assert.equal(result.status,expected,`${wf}: ${result.stderr}`)}
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
})


test('existing-league batch is a global writer in both crossing loops; preview stays read-only', async () => {
  const workflow='vklop-obstojecih-lig.yml'
  for(const args of [['--liga','si-example'],['--drzava','DE'],['--popravek','--vir','nzs']]) {
    assert.equal((await coordinate(args,{[workflow]:[run('Obstojece lige vklop pl-sk-4-liga')]})).code,1)
    assert.equal((await coordinate(args,{[workflow]:[run('Obstojece lige predogled pl-sk-4-liga')]})).code,0)
  }
  assert.equal((await coordinate(['--tece'],{[workflow]:[run('Obstojece lige vklop pl-sk-4-liga')]})).code,3)
  assert.equal((await coordinate(['--tece'],{[workflow]:[run('Obstojece lige predogled pl-sk-4-liga')]})).code,0)
  // Batch coordination uses correction scope, so even inactive/parallel source
  // imports and the nightly writer must clear before its fresh prechecks.
  assert.equal((await coordinate(['--popravek','--tekmovanje','at-one'],{'uvoz-lige.yml':[run('Uvoz lige at-two')]})).code,1)
  assert.equal((await coordinate(['--popravek','--tekmovanje','at-one'],{'uvoz-zapisnikov.yml':[run('Nightly import')]})).code,1)
  for(const name of ['zdruzi-klube.yml','tedensko-cene.yml']) assert.match(readFileSync(new URL(`../.github/workflows/${name}`,import.meta.url),'utf8'),/for wf in [^\n]*vklop-obstojecih-lig\.yml/)
})
