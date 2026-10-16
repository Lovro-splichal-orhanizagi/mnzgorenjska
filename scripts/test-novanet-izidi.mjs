import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { izidNovanet, preslikaveNovanet } from './viri/novanet-izidi.mjs'

const vzorec = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
const aragon = vzorec('es-novanet-aragon-940027.html')
const galicija = vzorec('es-novanet-galicia-1446110.html')
const glava = (html) => html.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i)[0]
const goli = (html) => [...html.matchAll(/<td\s+nowrap>\s*<strong>([\s\S]*?)<\/strong>/g)].map((m) => m[1])

for (const page of JSON.parse(vzorec('es-novanet-korpus.json')).pages) {
  test(`Novanet: shranjeni zajem ${page.capture} (${page.fragments.length} izidov)`, () => {
    const html = page.scripts.map((s) => `<script>${s}</script>`).join('') + page.fragments.join('')
    const kontekst = preslikaveNovanet(html)
    assert.deepEqual(page.fragments.map((s) => izidNovanet(s, kontekst)), page.expected)
  })
}

test('Novanet: vseh 40 mest tabele ob vseh desetih lažnih številkah', () => {
  const tabela = [2,5,9,4,1,0,8,6,3,7,1,3,5,7,9,0,2,4,6,8,0,2,4,6,8,1,3,5,7,9,7,5,2,0,9,6,3,8,4,1]
  const definicija = aragon.match(/<script>eval\([\s\S]*?<\/script>/)[0]
  for (const [i, pricakovano] of tabela.entries()) {
    for (let lazno = 0; lazno < 10; lazno++) {
      const s = `${definicija}<i id="probe" class="fa-${lazno}"><script>ntype("probe",${i % 10},${Math.floor(i / 10)},"fa-${lazno}");</script><span hidden>${lazno}</span></i> - 1`
      assert.deepEqual(izidNovanet(s), [pricakovano, 1], `mesto ${i}, vaba ${lazno}`)
    }
  }
})

test('Novanet: :after pride za vidnim besedilom, skriti pseudo-element pa ne šteje', () => {
  assert.deepEqual(izidNovanet('<style>#x:after{content:"2"}</style><span id=x>3</span> - 1'), [32, 1])
  assert.deepEqual(izidNovanet('<style>#x:before{content:"5";display:none}</style><span id=x>2</span> - 1'), [2, 1])
})

test('Novanet: kaskadiranje skritega pseudo-elementa zahteva pregled', () => {
  const s = '<style>#x:before{content:"5";display:none}#x:before{content:"2"}</style><span id=x>3</span> - 1'
  assert.throws(() => izidNovanet(s), /CSS/i)
})

test('Novanet: glava iz CSS, ne skrite številke ali trditve v raziskavi', () => {
  assert.deepEqual(izidNovanet(glava(aragon), preslikaveNovanet(aragon)), [4, 0])
  assert.deepEqual(izidNovanet(glava(galicija), preslikaveNovanet(galicija)), [2, 0])
})

test('Novanet: pravi vmesni izidi iz zapakiranega skripta v Aragonu', () => {
  const kontekst = preslikaveNovanet(aragon)
  assert.deepEqual(goli(aragon).map((s) => izidNovanet(s, kontekst)), [[1, 0], [2, 0], [3, 0], [4, 0]])
})

test('Novanet: gol in gol v dodatku v Galiciji', () => {
  const kontekst = preslikaveNovanet(galicija)
  assert.deepEqual(goli(galicija).map((s) => izidNovanet(s, kontekst)), [[1, 0], [2, 0]])
})

test('Novanet: skriti lažni 5–1 se prebere kot pravi 2–1', () => {
  const kontekst = preslikaveNovanet(aragon)
  const s = '<i id="idh411905" class="fa-5"><span style="display: none !important">5</span></i> - <i>1</i>'
  assert.deepEqual(izidNovanet(s, kontekst), [2, 1])
})

test('Novanet: večmestni izid in CSS Unicode escape', () => {
  const s = '<style>#x::before{content:"\\0031"} #y:before{content:"0"}</style><span id=x></span><span id=y></span> - 2'
  assert.deepEqual(izidNovanet(s, preslikaveNovanet(s)), [10, 2])
})

test('Novanet: vidno besedilo ob CSS glifu ostane del izida', () => {
  const s = '<style>#x:before{content:"2"}</style><span id=x>3</span> - 1'
  assert.deepEqual(izidNovanet(s), [23, 1])
})

test('Novanet: gnezdeni skriti elementi ne podvojijo izida', () => {
  assert.deepEqual(izidNovanet('2<span hidden><b>5</b><span>8</span></span> - 1'), [2, 1])
})

test('Novanet: CSS content ob drugih lastnostih se ne izgubi', () => {
  const s = '<style>#x:before{content:"2";color:red}</style><span id=x></span>3 - 1'
  assert.deepEqual(izidNovanet(s), [23, 1])
})

test('Novanet: komentirano CSS pravilo ne doda številke', () => {
  const s = '<style>/* #x:before{content:"2"} */</style><span id=x></span>3 - 1'
  assert.deepEqual(izidNovanet(s), [3, 1])
})

test('Novanet: pogojni CSS in vidnost iz slogovne pole zahtevata pregled', () => {
  assert.throws(() => izidNovanet('<style>@media print{#x:before{content:"2"}}</style><span id=x></span>3 - 1'), /CSS/i)
  assert.throws(() => izidNovanet('<style>.decoy{display:none}</style>2<span class=decoy>5</span> - 1'), /CSS/i)
})

test('Novanet: pogojno pravilo za drug element ne vpliva na izid', () => {
  assert.deepEqual(izidNovanet('<style>@media print{.other{display:none}}</style>2 - 1'), [2, 1])
})

test('Novanet: redka tabela in spremenjen razpakirnik se zavrneta', () => {
  assert.throws(() => preslikaveNovanet(aragon.replace('[2,5,9,4,1,0,8,6,3,7,', '[,5,9,4,1,0,8,6,3,7,')), /tabela|formula/i)
  assert.throws(() => preslikaveNovanet(aragon.replace('k[c]||c.toString(a)', 'k[c]||"0"')), /pakir/i)
  const spremenjenaTabela = aragon.replace('.split("|"),0,{}));', '.split("|").map(x=>x==="10"?"20":x).join("|").split("|"),0,{}));')
  assert.throws(() => preslikaveNovanet(spremenjenaTabela), /pakir/i)
})

test('Novanet: neznan CSS atributni selektor ne skrije vabe pred preverjanjem', () => {
  const s = '<style>[data-hidden=".foo"]{display:none}</style>2<span data-hidden=".foo">5</span> - 1'
  assert.throws(() => izidNovanet(s), /CSS/i)
})

test('Novanet: neodigrana tekma nima izida; 0–0 je izid', () => {
  assert.equal(izidNovanet(' - '), null)
  assert.deepEqual(izidNovanet('0 - 0'), [0, 0])
})

test('Novanet: neznana pisava ali manjkajoči skript ustavi razbiranje', () => {
  assert.throws(() => izidNovanet('<i class=fa-5></i> - 1'), /nerazrešen/i)
  assert.throws(() => preslikaveNovanet('<script>ntype("x",0,0,"fa-5");</script>'), /preslikav/i)
  assert.throws(() => izidNovanet('&#xE001; - 1'), /izid/i)
})

test('Novanet: spremenjena tabela se prebere iz strani, ne iz konstante', () => {
  const spremenjen = aragon.replace('[2,5,9,4,1,0,8,6,3,7,', '[9,5,2,4,1,0,8,6,3,7,')
  const s = '<i id=idh411905 class=fa-5></i> - 1'
  assert.deepEqual(izidNovanet(s, preslikaveNovanet(spremenjen)), [9, 1])
})

test('Novanet: sprememba formule ali neveljaven indeks se ne ugiba', () => {
  assert.throws(() => preslikaveNovanet(aragon.replace('(i*h)+n', '(i*h)-n')), /ntype/i)
  assert.throws(() => preslikaveNovanet(aragon.replace('"idh411905",0,0,', '"idh411905",99,0,')), /indeks/i)
})

test('Novanet: skripta s strani nikoli ne izvedemo', () => {
  delete globalThis.novanetIzveden
  const s = '<script>globalThis.novanetIzveden = true; throw new Error("ne izvajaj");</script>2 - 1'
  assert.deepEqual(izidNovanet(s, preslikaveNovanet(s)), [2, 1])
  assert.equal(globalThis.novanetIzveden, undefined)
})

test('Novanet CLI: preveri shranjeno stran in vrne prave izide brez omrežja', () => {
  const r = spawnSync(process.execPath, [
    new URL('./preveri-novanet-izide.mjs', import.meta.url).pathname,
    new URL('./vzorci/es-novanet-aragon-940027.html', import.meta.url).pathname,
  ], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(JSON.parse(r.stdout), { izid: [4, 0], vmesniIzidi: [[1, 0], [2, 0], [3, 0], [4, 0]], opozorila: [] })
})
