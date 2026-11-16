// Drugi poskus v nocni-uvoz.sh: vir, ki je med prvim in drugim krogom zavrnil (4)
// ali je dol (5), ne dobi novih zahtev za ostale lige v čakalnici.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

// lige: [liga, vir]; izidi: liga → izhodi capture-a po vrsti (0 = uspeh)
// ura: liga → minute, ki jih ura kaže po prvem klicu te lige (stub `date`)
function zaženi(lige, izidi, ura = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'nocni-uvoz-'))
  mkdirSync(join(dir, 'scripts'))
  mkdirSync(join(dir, 'bin'))
  const uraDat = join(dir, 'ura')
  writeFileSync(uraDat, '0')
  writeFileSync(join(dir, 'bin', 'date'), `#!/usr/bin/env bash
if [ "$1" = +%s ]; then cat ${JSON.stringify(uraDat)}; else exec /usr/bin/env -i PATH=/usr/bin:/bin date "$@"; fi
`, { mode: 0o755 })
  copyFileSync(join(here, 'nocni-uvoz.sh'), join(dir, 'scripts', 'nocni-uvoz.sh'))
  const stub = (ime, koda) => writeFileSync(join(dir, 'scripts', ime), koda)
  stub('nocni-kosi.mjs', `
    const a = process.argv.slice(2)
    if (a.includes('--zabelezi')) process.exit(0)
    for (const [l, v, k] of ${JSON.stringify(lige)}) console.log(l + ' 1 ' + v + (k ? ' ' + k : ''))
  `)
  for (const ime of ['bulk-source-coordination', 'uvoz-razporeda', 'uvoz-delegiranja', 'uvoz-zapisnikov',
    'uvoz-registracij', 'lazni-vratarji', 'ugani-pozicije']) stub(ime + '.mjs', 'process.exit(0)')
  stub('prepare-fussball-nightly.mjs', `
    import fs from 'node:fs'
    const liga = process.argv[process.argv.indexOf('--tekmovanje') + 1]
    fs.appendFileSync(${JSON.stringify(join(dir, 'klici.log'))}, liga + '\\n')
    const izidi = ${JSON.stringify(izidi)}[liga] || [0]
    const n = fs.readFileSync(${JSON.stringify(join(dir, 'klici.log'))}, 'utf8').split('\\n').filter(x => x === liga).length
    const ura = ${JSON.stringify(ura)}[liga]
    if (ura != null) fs.writeFileSync(${JSON.stringify(uraDat)}, String(ura * 60))
    process.exit(izidi[Math.min(n, izidi.length) - 1])
  `)
  const r = spawnSync('bash', ['scripts/nocni-uvoz.sh'], {
    cwd: dir, encoding: 'utf8',
    env: { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, DRZAVA: 'DE', KOS: '1', KOSOV: '1', URNIK: '', ROK_MIN: '190', GITHUB_STEP_SUMMARY: '' },
  })
  const klici = existsSync(join(dir, 'klici.log')) ? readFileSync(join(dir, 'klici.log'), 'utf8').trim().split('\n') : []
  return { ...r, klici, izhod: `${r.stdout}\n${r.stderr}` }
}

const FP = 'fussball-public'

test('prvi retry vrne 4: druga liga iz čakalnice istega vira se ne poskusi', () => {
  const r = zaženi([['a', FP], ['b', FP]], { a: [1, 4], b: [1, 0] })
  // a, b v prvem krogu (oba 1), a v drugem (4), b preskočena
  assert.deepEqual(r.klici, ['a', 'b', 'a'])
  assert.match(r.izhod, /Vir je zavrnil::b preskočena/)
  assert.equal(r.status, 1)
})

test('prvi retry vrne 5: druga liga iz čakalnice se ne poskusi, koš ne pade zaradi tega', () => {
  const r = zaženi([['a', FP], ['b', FP]], { a: [1, 5], b: [1, 0] })
  assert.deepEqual(r.klici, ['a', 'b', 'a'])
  assert.match(r.izhod, /Vir ne dela::b preskočena/)
  assert.match(r.izhod, /lige brez uvoza, ker vir vrača 5xx: a b/)
  assert.equal(r.status, 0)
})

test('retry z uspehom ne ustavi vira', () => {
  const r = zaženi([['a', FP], ['b', FP]], { a: [1, 0], b: [1, 0] })
  assert.deepEqual(r.klici, ['a', 'b', 'a', 'b'])
  assert.equal(r.status, 0)
})

// SLF-500: zavrnitev ustavi spletišče (4. stolpec), ne celega vira.
test('zavrnitev enega spletišča ne preskoči lig drugega spletišča istega vira', () => {
  const r = zaženi([['a', FP, 'x:dod'], ['b', FP, 'x:dod'], ['c', FP, 'x:ath']], { a: [4], b: [0], c: [0] })
  assert.deepEqual(r.klici, ['a', 'c'])
  assert.match(r.izhod, /Vir je zavrnil::b preskočena — vir x:dod/)
  assert.equal(r.status, 1)
})

test('brez 4. stolpca je ključ vir (kot prej)', () => {
  const r = zaženi([['a', FP], ['b', FP]], { a: [4], b: [0] })
  assert.deepEqual(r.klici, ['a'])
})

// SLF-524: prehoden padec tik pred rokom ne sme obarvati koša rdeče, ker za
// drugi poskus ni več časa; liga gre med "niso prišle na vrsto".
test('ni časa za drugi poskus: liga med preskočenimi, koš ne pade', () => {
  const r = zaženi([['a', FP], ['b', FP]], { a: [0], b: [1, 0] }, { b: 191 })
  assert.deepEqual(r.klici, ['a', 'b'])
  assert.match(r.izhod, /Zmanjkalo časa::po 190 min niso prišle na vrsto \(ali na drugi poskus\): b/)
  assert.doesNotMatch(r.izhod, /Neuspele lige/)
  assert.equal(r.status, 0)
})
