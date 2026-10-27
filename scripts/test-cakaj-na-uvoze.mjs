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
  ['uvoz-fussball-public.yml', 'Uvoz lige de-regionalliga-nord FUSSBALL public'],
]
const fixtures = [
  { slug: 'hu-to-3-nyugat', active: false, source: 'mlsz', countries: { code: 'HU' }, federations: { code: 'mlsz-to' } },
  { slug: 'hu-baz-u19-2-kozep', active: false, source: 'mlsz', countries: { code: 'HU' }, federations: { code: 'mlsz-baz' } },
  { slug: 'de-regionalliga-nord', active: false, source: 'dfb', countries: { code: 'DE' }, federations: { code: 'nfv-nord' } },
  { slug: 'dk-example', active: false, source: 'dbu', countries: { code: 'DK' }, federations: { code: 'dbu' } },
  { slug: 'pl-example', active: false, source: 'pzpn', countries: { code: 'PL' }, federations: { code: 'pzpn' } },
  { slug: 'gr-example', active: false, source: 'eps', countries: { code: 'GR' }, federations: { code: 'eps-athens' } },
  { slug: 'si-example', active: false, source: 'nzs', countries: { code: 'SI' }, federations: { code: 'mnzg' } },
  { slug: 'at-one', active: false, source: 'oefb', countries: { code: 'AT' }, federations: { code: 'wfv' } },
  { slug: 'at-two', active: false, source: 'oefb', countries: { code: 'AT' }, federations: { code: 'wfv' } },
  { slug: 'es-ct-primera-g1', active: false, source: 'fcf', countries: { code: 'ES' }, federations: { code: 'fcf' } },
  { slug: 'es-active', active: true, source: 'fcf', countries: { code: 'ES' }, federations: { code: 'fcf' } },
  { slug: 'hr-ri-u19', active: false, source: 'hns', countries: { code: 'HR' }, federations: { code: 'hns' } },
]
test('source-free MLSZ release uses inactive league coordination while retaining global and same-league waits',async()=>{
 const workflow=readFileSync(new URL('../.github/workflows/mlsz-reviewed-history.yml',import.meta.url),'utf8')
 for(const slug of ['hu-to-3-nyugat','hu-baz-u19-2-kozep']){
  assert.ok(workflow.includes(`cakaj-na-uvoze.mjs --liga ${slug} --najvec 120`))
  const nightly={'uvoz-zapisnikov.yml':[run('Nightly')]}
  assert.equal((await coordinate(['--liga',slug],nightly,[{name:'uvoz HU 1/3',status:'in_progress'}])).code,0)
  for(const [wf,title]of [['tedensko-cene.yml','Weekly prices'],['zdruzi-klube.yml','Merge clubs'],['uvoz-lige.yml',`Uvoz lige ${slug}`]])assert.equal((await coordinate(['--liga',slug],{[wf]:[run(title)]})).code,1)
  const fixture=fixtures.find(c=>c.slug===slug);fixture.active=true
  try{assert.equal((await coordinate(['--liga',slug],nightly,[{name:'uvoz HU 1/3',status:'in_progress'}])).code,1)}finally{fixture.active=false}
 }
 assert.ok(!workflow.includes('--popravek'))
})

test('inactive Croatian target activation ignores unrelated older HNS nightly shards but keeps all overlapping writers', async () => {
  const target = fixtures.find(c => c.slug === 'hr-ri-u19')
  const oldNightly = { 'uvoz-zapisnikov.yml': [run('Nightly')] }
  const nightly = [{ name: 'uvoz HR 1/3', status: 'in_progress' }, { name: 'uvoz HR 2/3', status: 'queued' }, { name: 'uvoz HR 3/3', status: 'queued' }]
  assert.equal((await coordinate(['--liga', target.slug], oldNightly, nightly)).code, 0)
  for (const [workflow, title] of [
    ['uvoz-lige.yml', `Uvoz lige ${target.slug}`],
    ['zdruzi-klube.yml', 'Zdruzi podvojena kluba'],
    ['tedensko-cene.yml', 'Tedensko prevrednotenje'],
  ]) assert.equal((await coordinate(['--liga', target.slug], { [workflow]: [run(title)] }, [])).code, 1, workflow)
  target.active = true
  try { assert.equal((await coordinate(['--liga', target.slug], oldNightly, nightly)).code, 1) }
  finally { target.active = false }
})

test('existing-league workflow uses nightly waits for activation and scoped repair waits for refresh', async () => {
  const { execFileSync, spawnSync } = await import('node:child_process')
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs')
  const { join } = await import('node:path'), { tmpdir } = await import('node:os')
  const workflow = readFileSync(new URL('../.github/workflows/vklop-obstojecih-lig.yml', import.meta.url), 'utf8')
  const step = workflow.slice(workflow.indexOf('      - name: Pred vklopom pocakaj na starejse pisce')).split('        run: |\n')[1].split('\n      - name:')[0]
  const script = step.split('\n').filter(line => line.startsWith('          ')).map(line => line.slice(10)).join('\n')
  assert.match(workflow, /if: inputs\.activate \|\| inputs\.refresh/)
  const dir = mkdtempSync(join(tmpdir(), 'slff-hr-activation-wait-'))
  try {
    writeFileSync(join(dir, 'node'), `#!${process.execPath}\n` + `
      const fs=require('node:fs'); const a=process.argv.slice(2);
      if(a[0]==='--input-type=module')process.stdout.write(process.env.SELECTED_SLUGS+'\\n');
      else { fs.appendFileSync(process.env.WAIT_CALLS,JSON.stringify(a)+'\\n'); process.exit(process.env.BLOCK_WAIT==='true'?79:0); }
    `, { mode: 0o755 })
    for (const [activate, refresh, expected] of [
      ['true', 'false', ['scripts/cakaj-na-uvoze.mjs', '--liga', 'hr-ri-u19', '--najvec', '120']],
      ['false', 'true', ['scripts/cakaj-na-uvoze.mjs', '--popravek', '--tekmovanje', 'hr-ri-u19', '--najvec', '120']],
    ]) for (const [blocked, resultCode] of [['false', 0], ['true', 79]]) {
      const callsPath = join(dir, `calls-${activate}-${refresh}-${blocked}.jsonl`)
      const result = spawnSync('bash', ['-c', script], { cwd: dir, encoding: 'utf8', timeout: 10000,
        env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, LIGE: 'hr-ri-u19', EXPECTED_SHA: 'a'.repeat(40), GITHUB_SHA: 'a'.repeat(40),
          ACTIVATE: activate, REFRESH: refresh, SELECTED_SLUGS: 'hr-ri-u19', WAIT_CALLS: callsPath, BLOCK_WAIT: blocked } })
      assert.equal(result.status, resultCode, result.stderr)
      const calls = readFileSync(callsPath, 'utf8').trim().split('\n').map(JSON.parse)
      assert.deepEqual(calls, [expected])
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
const startedAt = '2026-10-17T10:00:00Z'
const run = (title, patch = {}) => ({ databaseId: 10, startedAt, status: 'in_progress', displayTitle: title, ...patch })
test('reviewed existing history writes are coordinated by country and read stages stay independent',async()=>{
 const workflow='reviewed-existing-history.yml'
 for(const slug of ['ro-liga3-s1','ro-ab-l4-s2','ro-ab-l5-s2']) for(const mode of ['apply','price','activate']) {
  const runs={[workflow]:[run(`Reviewed existing history ${mode} / ${slug}`)]}
  assert.equal((await coordinate(['--drzava','RO'],runs)).code,1)
  assert.equal((await coordinate(['--drzava','GB'],runs)).code,0)
  assert.equal((await coordinate(['--tece'],runs)).code,3)
 }
 for(const slug of ['gb-npl-midlands','gb-sfl-d1-south','ro-liga3-s1','ro-ab-l4-s2','ro-ab-l5-s2','ba-wwin-liga-bih','md-liga-2']) for(const mode of ['prepare','preview','receipt']) {
  const runs={[workflow]:[run(`Reviewed existing history ${mode} / ${slug}`)]}
  assert.equal((await coordinate(['--drzava','GB'],runs)).code,0)
  assert.equal((await coordinate(['--tece'],runs)).code,0)
 }
 const moldova={[workflow]:[run('Reviewed existing history apply / md-liga-2')]}
 assert.equal((await coordinate(['--drzava','MD'],moldova)).code,1)
 assert.equal((await coordinate(['--drzava','RO'],moldova)).code,0)
 const bosnia={[workflow]:[run('Reviewed existing history apply / ba-wwin-liga-bih')]}
 assert.equal((await coordinate(['--drzava','BA'],bosnia)).code,1)
 assert.equal((await coordinate(['--drzava','RO'],bosnia)).code,0)
 assert.equal((await coordinate(['--drzava','RO'],{[workflow]:[run('Reviewed existing history unknown / foreign')]})).code,1)
 for(const name of ['zdruzi-klube.yml','tedensko-cene.yml']) assert.match(readFileSync(new URL(`../.github/workflows/${name}`,import.meta.url),'utf8'),/for wf in[^\n]*reviewed-existing-history\.yml/)
})
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
        const result = spawnSync('bash', ['-c', script], { cwd: dir, encoding: 'utf8', timeout: 10000,
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


const olderNightly = { 'uvoz-zapisnikov.yml': [run('Nightly import')] }
const greekJobs = [1, 2, 3, 4, 5, 6].map(i => ({ name: `uvoz GR ${i}/6`, status: 'completed' }))

test('country-scoped corrections proceed after their nightly jobs finish while Austria still runs', async () => {
  for (const [country, source] of [['DK', 'dbu'], ['PL', 'pzpn'], ['GR', 'eps']]) {
    const jobs = country === 'GR' ? greekJobs : [{ name: `uvoz ${country}`, status: 'completed' }]
    for (const scope of [['--tekmovanje', `${country.toLowerCase()}-example`], ['--vir', source]]) {
      const result = await coordinate(['--popravek', ...scope], olderNightly,
        [...jobs, { name: 'uvoz AT 1/4', status: 'in_progress' }])
      assert.equal(result.code, 0, `${country}: ${result.logs.join('; ')}`)
    }
  }
})

test('corrections wait for every Greek bucket including queued buckets', async () => {
  for (const status of ['queued', 'in_progress']) for (let i = 0; i < 6; i++) {
    const jobs = greekJobs.map((j, n) => n === i ? { ...j, status } : j)
    assert.equal((await coordinate(['--popravek', '--tekmovanje', 'gr-example'], olderNightly, jobs)).code, 1)
  }
})

test('unknown correction scopes and missing or incomplete nightly job lists keep waiting', async () => {
  for (const args of [['--popravek'], ['--popravek', '--vir', 'unknown'], ['--popravek', '--tekmovanje', 'unknown']]) {
    assert.equal((await coordinate(args, olderNightly, [{ name: 'uvoz DK', status: 'completed' }])).code, 1)
  }
  for (const jobs of [null, [], [{ name: 'uvoz AT 1/4', status: 'completed' }]]) {
    assert.equal((await coordinate(['--popravek', '--tekmovanje', 'dk-example'], olderNightly, jobs)).code, 1)
  }
  for (const jobs of [greekJobs.slice(0, 5), [...greekJobs.slice(0, 5), greekJobs[0]],
    [...greekJobs.slice(0, 5), { name: 'uvoz GR unknown', status: 'completed' }]]) {
    assert.equal((await coordinate(['--popravek', '--tekmovanje', 'gr-example'], olderNightly, jobs)).code, 1)
  }
})

test('nightly country scoping preserves global maintenance and same-country writer waits', async () => {
  for (const [workflow, title] of [
    ['zdruzi-klube.yml', 'Zdruzi podvojena kluba'], ['tedensko-cene.yml', 'Tedensko prevrednotenje'],
    ['cene-lig.yml', 'Cene lig'], ['uvoz-lige.yml', 'Uvoz lige dk-example'],
    ['razdeli-zlite-igralce.yml', 'Razdeli zlite igralce dbu (pisi)'],
  ]) {
    assert.equal((await coordinate(['--popravek', '--tekmovanje', 'dk-example'],
      { ...olderNightly, [workflow]: [run(title)] }, [{ name: 'uvoz DK', status: 'completed' }])).code, 1, workflow)
  }
})

test('EPS batch refresh is a writer for both imports and health checks',async()=>{
 const runs={'vklop-obstojecih-lig.yml':[run('Obstojece lige osvezitev gr-ip-a,gr-ip-b')]}
 assert.equal((await coordinate(['--liga','si-example'],runs)).code,1)
 assert.equal((await coordinate(['--tece'],runs)).code,3)
})

test('MFA reviewed writes are visible in both coordinator enumerations and wait only on Malta scope',async()=>{
 const workflow='mfa-reviewed-history.yml'
 for(const stage of ['cleanup','reprice','activate']){
  const title=`MFA reviewed history ${stage} mt-premier`
  assert.equal((await coordinate(['--drzava','MT'],{[workflow]:[run(title)]})).code,1)
  assert.equal((await coordinate(['--drzava','DE'],{[workflow]:[run(title)]})).code,0)
 }
 for(const stage of ['prepare','preview','receipt'])assert.equal((await coordinate(['--drzava','MT'],{[workflow]:[run(`MFA reviewed history ${stage} mt-premier`)]})).code,0)
 for(const name of ['zdruzi-klube.yml','tedensko-cene.yml'])assert.match(readFileSync(new URL(`../.github/workflows/${name}`,import.meta.url),'utf8'),/for wf in[^\n]*mfa-reviewed-history\.yml/)
})
test('new MFA route still waits for older same-country Challenge importer',async()=>{
 fixtures.push({slug:'mt-premier',active:false,source:'mfa',countries:{code:'MT'},federations:{code:'mfa'}},{slug:'mt-challenge',active:false,source:'mfa',countries:{code:'MT'},federations:{code:'mfa'}})
 try{assert.equal((await coordinate(['--liga','mt-premier','--popravek','--tekmovanje','mt-premier'],{'uvoz-lige.yml':[run('Uvoz lige mt-challenge')]})).code,1)}finally{fixtures.splice(-2)}
})

test('Challenge reviewed writes share Malta and global writer coordination',async()=>{
 const workflow='mfa-challenge-reviewed-history.yml'
 for(const stage of ['cleanup','reprice','activate']){
  const title=`MFA Challenge reviewed history ${stage} mt-challenge`
  assert.equal((await coordinate(['--drzava','MT'],{[workflow]:[run(title)]})).code,1)
  assert.equal((await coordinate(['--drzava','DE'],{[workflow]:[run(title)]})).code,0)
 }
 for(const stage of ['prepare','preview','receipt'])assert.equal((await coordinate(['--drzava','MT'],{[workflow]:[run(`MFA Challenge reviewed history ${stage} mt-challenge`)]})).code,0)
 for(const name of ['zdruzi-klube.yml','tedensko-cene.yml'])assert.match(readFileSync(new URL(`../.github/workflows/${name}`,import.meta.url),'utf8'),/for wf in[^\n]*mfa-challenge-reviewed-history\.yml/)
})

test('MLSZ reviewed history writes serialize with HU imports and health checks',async()=>{
 const workflow='mlsz-reviewed-history.yml'
 for(const mode of['cleanup','price','activate']){
  const runs={[workflow]:[run(`MLSZ reviewed history ${mode} hu-to-3-nyugat,hu-baz-u19-2-kozep`)]}
  assert.equal((await coordinate(['--drzava','HU'],runs)).code,1)
  assert.equal((await coordinate(['--drzava','AT'],runs)).code,0)
  assert.equal((await coordinate(['--tece'],runs)).code,3)
 }
 for(const mode of['prepare','preview'])assert.equal((await coordinate(['--drzava','HU'],{[workflow]:[run(`MLSZ reviewed history ${mode} hu-to-3-nyugat,hu-baz-u19-2-kozep`)]})).code,0)
})

test('real provider batch is visible to both coordinator loops and blocks active nightly readers',async()=>{
 const workflow='uvoz-paketa-lig.yml',runs={[workflow]:[run('Uvoz paketa lig mlsz hu-pe-u19-e,hu-za-3-kozep')]}
 for(const args of [['--drzava','HU'],['--liga','si-example'],['--popravek','--vir','mlsz']])assert.equal((await coordinate(args,runs)).code,1)
 assert.equal((await coordinate(['--tece'],runs)).code,3)
 assert.equal((await coordinate(['--popravek','--vir','mlsz'],{'uvoz-zapisnikov.yml':[run('Nightly')]},[{name:'uvoz HU 1/3',status:'completed'},{name:'uvoz HU 2/3',status:'in_progress'},{name:'uvoz HU 3/3',status:'completed'}])).code,1)
 assert.equal((await coordinate(['--popravek','--vir','mlsz'],{'uvoz-zapisnikov.yml':[run('Nightly')]},[{name:'uvoz HU 1/3',status:'completed'},{name:'uvoz HU 2/3',status:'completed'},{name:'uvoz HU 3/3',status:'completed'},{name:'uvoz AT',status:'in_progress'}])).code,0)
})

test('EPS batch waits in Greece while leaving unrelated countries independent',async()=>{
 const workflow='uvoz-paketa-lig.yml',runs={[workflow]:[run('Uvoz paketa lig eps gr-peir-a-1,gr-ev-b-1')]}
 assert.equal((await coordinate(['--drzava','GR'],runs)).code,1)
 assert.equal((await coordinate(['--liga','si-example'],runs)).code,0)
 assert.equal((await coordinate(['--drzava','HU'],runs)).code,0)
 assert.equal((await coordinate(['--tece'],runs)).code,3)
 for(const title of ['Uvoz paketa lig unknown gr-peir-a-1','Uvoz paketa lig eps hu-pe-u19-e','Uvoz paketa lig eps'])
  assert.equal((await coordinate(['--liga','si-example'],{[workflow]:[run(title)]})).code,1)
})


test('Dribl native bootstrap shares AU/global writes and stays visible to both coordinators',async()=>{
 fixtures.push({slug:'au-nsw-npl',active:false,source:'dribl-public',countries:{code:'AU'},federations:{code:'football-nsw'}})
 try{
  const workflow='uvoz-dribl-public.yml',runs={[workflow]:[run('Uvoz lige au-nsw-npl Dribl public')]}
  for(const args of [['--liga','au-nsw-npl'],['--popravek','--vir','dribl-public'],['--drzava','AU']])assert.equal((await coordinate(args,runs)).code,args[0]==='--drzava'?0:1)
  assert.equal((await coordinate(['--drzava','DE'],runs)).code,0)
  assert.equal((await coordinate(['--tece'],runs)).code,0)
  fixtures.at(-1).active=true
  assert.equal((await coordinate(['--tece'],runs)).code,3)
  for(const file of ['zdruzi-klube.yml','tedensko-cene.yml'])assert.match(readFileSync(new URL(`../.github/workflows/${file}`,import.meta.url),'utf8'),/for wf in[^\n]*uvoz-dribl-public\.yml/)
 }finally{fixtures.pop()}
})

test('PL/DE bulk rollout is visible to both loops and shares only its selected countries',async()=>{
 const wf='uvoz-pl-de-paketa.yml'
 for(const country of ['PL','DE']){
  const runs={[wf]:[run(`Bulk leagues ${country}`)]}
  assert.equal((await coordinate(['--drzava',country],runs)).code,1)
  assert.equal((await coordinate(['--drzava','HU'],runs)).code,0)
  assert.equal((await coordinate(['--tece'],runs)).code,3)
 }
 for(const country of ['PL','DE'])assert.equal((await coordinate(['--drzava',country],{[wf]:[run('Bulk leagues ALL')]})).code,1)
 for(const file of ['zdruzi-klube.yml','tedensko-cene.yml'])assert.match(readFileSync(new URL(`../.github/workflows/${file}`,import.meta.url),'utf8'),/for wf in[^\n]*uvoz-pl-de-paketa\.yml/)
})

test('retained FUSSBALL replay writes cross only DE, while unknown scopes stay conservative',async()=>{
 const workflow='replay-fussball-cards.yml',title='FUSSBALL card replay DE all'
 for(const args of [['--drzava','DE'],['--liga','de-regionalliga-nord'],['--popravek']])assert.equal((await coordinate(args,{[workflow]:[run(title)]})).code,1)
 for(const country of ['SI','PL','HU','GR'])assert.equal((await coordinate(['--drzava',country],{[workflow]:[run(title)]})).code,0)
 assert.equal((await coordinate(['--tece'],{[workflow]:[run(title)]})).code,3)
 assert.equal((await coordinate(['--drzava','PL'],{[workflow]:[run('Unscoped replay writer')]})).code,1)
 for(const patch of [{databaseId:30},{databaseId:20},{status:'completed'}])assert.equal((await coordinate(['--drzava','DE'],{[workflow]:[run(title,patch)]})).code,0)
 assert.equal((await coordinate(['--drzava','DE'],{[workflow]:[run(title,{status:'queued'})]})).code,1)
})
test('global maintenance enumerates the retained replay writer and hourly replay uses native DE coordination without source reads',()=>{
 for(const file of ['zdruzi-klube.yml','tedensko-cene.yml'])assert.match(readFileSync(new URL(`../.github/workflows/${file}`,import.meta.url),'utf8'),/for wf in[^\n]*replay-fussball-cards\.yml/)
 const workflow=readFileSync(new URL('../.github/workflows/replay-fussball-cards.yml',import.meta.url),'utf8')
 assert.match(workflow,/cron: '23 \* \* \* \*'/);assert.match(workflow,/cakaj-na-uvoze\.mjs --drzava DE/);assert.match(workflow,/replay-fussball-cards\.mjs run/);assert.match(workflow,/github\.run_attempt == 1/)
 assert.doesNotMatch(workflow,/upload-artifact|zajemi-fussball|bulk-source-coordination|SLFF_FUSSBALL_CAPTURE/)
 assert.match(readFileSync(new URL('../.github/workflows/preveri-podatke.yml',import.meta.url),'utf8'),/workflows:.*Replay retained FUSSBALL cards/)
})
