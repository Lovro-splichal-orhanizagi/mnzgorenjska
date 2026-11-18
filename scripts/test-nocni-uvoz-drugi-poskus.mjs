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
function zaženi(lige, izidi, ura = {}, okolje = {}) {
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
    for (const [l, v, k, z] of ${JSON.stringify(lige)}) console.log(l + ' 1 ' + v + (k || z ? ' ' + (k || v) : '') + (z ? ' ' + z : ''))
  `)
  for (const ime of ['bulk-source-coordination', 'uvoz-razporeda', 'uvoz-delegiranja', 'uvoz-zapisnikov',
    'uvoz-registracij', 'lazni-vratarji', 'ugani-pozicije']) stub(ime + '.mjs', `import fs from 'node:fs';fs.appendFileSync('steps.log',JSON.stringify({step:${JSON.stringify(ime)},league:process.argv[process.argv.indexOf('--tekmovanje')+1],bounded:process.env.SLFF_FCF_CURRENT_FIXTURES??null})+'\\n');process.exit(0)`)
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
    env: { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, DRZAVA: 'DE', KOS: '1', KOSOV: '1', URNIK: '', ROK_MIN: '190', GITHUB_STEP_SUMMARY: '', ...okolje },
  })
  const klici = existsSync(join(dir, 'klici.log')) ? readFileSync(join(dir, 'klici.log'), 'utf8').trim().split('\n') : []
  const steps=existsSync(join(dir,'steps.log'))?readFileSync(join(dir,'steps.log'),'utf8').trim().split('\n').map(s=>JSON.parse(s)):[]
  return { ...r, klici, steps, izhod: `${r.stdout}\n${r.stderr}` }
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

// SLF-557: liga z znano napako (5. stolpec) ima svojo nalogo; njen neuspeh je
// opozorilo, ostale lige koša pa še vedno lahko obarvajo koš rdeče.
test('znana napaka v obeh poskusih: opozorilo, koš ne pade', () => {
  const r = zaženi([['baden', FP, FP, 'SLF-558'], ['b', FP]], { baden: [1, 1], b: [0] })
  assert.deepEqual(r.klici, ['baden', 'b', 'baden'])
  assert.match(r.izhod, /Znane napake::niso uspele, a imajo svojo nalogo: baden \(SLF-558\)/)
  assert.doesNotMatch(r.izhod, /Neuspele lige/)
  assert.equal(r.status, 0)
})

test('znana napaka ne skrije nove napake druge lige', () => {
  const r = zaženi([['baden', FP, FP, 'SLF-558'], ['b', FP]], { baden: [1, 1], b: [1, 1] })
  assert.match(r.izhod, /Neuspele lige:: b/)
  assert.equal(r.status, 1)
})

test('zavrnitev lige z znano napako ostane rdeča', () => {
  const r = zaženi([['baden', FP, FP, 'SLF-558']], { baden: [4] })
  assert.match(r.izhod, /Neuspele lige:: baden/)
  assert.equal(r.status, 1)
})

// SLF-557: rok šteje od začetka posla (ZACETEK_POSLA), ne od zagona skripte —
// čakanje na starejši uvoz ga porabi, sicer GitHub posel po 240 min prekliče.
test('rok šteje od začetka posla: po čakanju naslednja liga ne začne', () => {
  // ura skripte 0, posel se je začel 150 min prej; po a ura kaže 50 min → 200 >= 190
  const r = zaženi([['a', FP], ['b', FP]], { a: [0], b: [0] }, { a: 50 }, { ZACETEK_POSLA: String(-150 * 60) })
  assert.deepEqual(r.klici, ['a'])
  assert.match(r.izhod, /Zmanjkalo časa::.* b/)
  assert.equal(r.status, 0)
})

test('brez ZACETEK_POSLA rok šteje od zagona skripte', () => {
  const r = zaženi([['a', FP], ['b', FP]], { a: [0], b: [0] }, { a: 50 })
  assert.deepEqual(r.klici, ['a', 'b'])
  assert.equal(r.status, 0)
})

for (const [urnik, urni] of [
  ['17 5 * * 5,6,0', false],
  ['17 5 * * 1-4', false],
  ['47 6 * * 1-4', false],
  ['17 17,21 * * 5,6,0', true],
  ['17 0-4,6-16,18-20,22-23 * * 5,6,0', true],
  ['', false],
]) test(`full/incremental mode follows scheduled slot, not shard wall clock: ${urnik}`, () => {
  const r = zaženi([['a', FP]], { a: [4] }, {}, { URNIK: urnik })
  assert.equal(r.izhod.includes('Urni zagon: preračun le dotaknjenih krogov'), urni)
})

test('FCF nightly fetches only recent existing fixtures and does not scan the season calendar',()=>{
 const r=zaženi([['es-ct-elit','fcf'],['gr-dod-a','eps']],{})
 assert.equal(r.status,0)
 assert.deepEqual(r.steps.filter(s=>s.league==='es-ct-elit'&&['uvoz-razporeda','uvoz-delegiranja'].includes(s.step)),[])
 assert.equal(r.steps.find(s=>s.league==='es-ct-elit'&&s.step==='uvoz-zapisnikov').bounded,'1')
 assert.equal(r.steps.find(s=>s.league==='gr-dod-a'&&s.step==='uvoz-zapisnikov').bounded,null)
 assert.ok(r.steps.some(s=>s.league==='gr-dod-a'&&s.step==='uvoz-razporeda'))
})
