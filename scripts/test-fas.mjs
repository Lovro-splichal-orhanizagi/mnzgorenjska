import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { glavaStrani, postaviStrani, dogodkiStrani, vZapisnik, nastopi } from './viri/fas.mjs'

const beri = (name) => readFileSync(new URL(`./vzorci/${name}`, import.meta.url), 'utf8')
const partial = beri('es-fas-evento-nepopoln-14507.html')
const complete = beri('es-fas-evento-14593.html')
const singleName = beri('es-fas-evento-14681-single-name.html')
const tables = (html) => [...html.matchAll(/<div class="fa-conv__team">[\s\S]*?<\/table><\/div>/g)].map(([x]) => x)
const [awayTable] = tables(partial)
const homeTable = awayTable.replace('fa-conv__team-title">Caudal Deportivo', 'fa-conv__team-title">Astur CF')
const withTables = (...xs) => partial.replace(awayTable, xs.join(''))
const withTitle = (title) => withTables(awayTable.replace('fa-conv__team-title">Caudal Deportivo', `fa-conv__team-title">${title}`))

test('14507: the sole Caudal source table stays away, leaving Astur absent', () => {
  const rosters = postaviStrani(partial)
  assert.equal(rosters[0].length, 0)
  assert.equal(rosters.length, 2)
  assert.deepEqual(rosters[1].map(({ ime, slug, regSt, st, zacetnik, vstopil }) =>
    ({ ime, slug, regSt, st, zacetnik, vstopil })), [
    { ime: 'Julio Delgado', slug: 'julio-delgado', regSt: 4527103187300605, st: 10, zacetnik: true, vstopil: false },
    { ime: 'Cris Acerete', slug: 'cris-acerete', regSt: 5117518271767780, st: 9, zacetnik: true, vstopil: false },
    { ime: 'Iago Delgado', slug: 'iago-delgado', regSt: 5469320057776988, st: 22, zacetnik: false, vstopil: true },
  ])
})

test('reversed full tables preserve canonical rosters, goals, warnings and appearances', () => {
  const [home, away] = tables(complete)
  const reversed = complete.replace(home, '__HOME_TABLE__').replace(away, home).replace('__HOME_TABLE__', away)
  assert.deepEqual(postaviStrani(reversed), postaviStrani(complete))
  assert.deepEqual(vZapisnik(reversed), vZapisnik(complete))
  assert.deepEqual(nastopi(vZapisnik(reversed)), nastopi(vZapisnik(complete)))
})

test('a sole home table leaves an empty away roster', () => {
  const [home, away] = postaviStrani(withTables(homeTable))
  assert.equal(home.length, 3)
  assert.deepEqual(away, [])
})

test('zero tables always returns two empty rosters, even without a match header', () => {
  assert.deepEqual(postaviStrani(withTables()), [[], []])
  assert.deepEqual(postaviStrani(''), [[], []])
})

test('title binding uses corrected text and existing normalized club keys', () => {
  assert.deepEqual(postaviStrani(withTitle('<b>CAUDAL</b> &nbsp; Deportivo!')), postaviStrani(partial))
  for (const [header, title] of [['El San Martín', 'EI San Martín'], ['EI San Martín', 'El San Martín']]) {
    const html = partial.replaceAll('Caudal Deportivo', header)
      .replace(`fa-conv__team-title">${header}`, `fa-conv__team-title">${title}`)
    assert.equal(glavaStrani(html).gostje, 'El San Martín')
    assert.equal(postaviStrani(html)[1].length, 3)
  }
})

for (const [name, html] of [
  ['missing title', withTables(awayTable.replace('<div class="fa-conv__team-title">Caudal Deportivo</div>', ''))],
  ['empty title', withTitle(' &nbsp; ')],
  ['empty normalized title', withTitle('—')],
  ['foreign title', withTitle('Real Sporting C')],
  ['club form cannot be dropped', withTitle('Caudal')],
  ['reserve suffix cannot be dropped', partial.replace('<strong class="sp-team-name">Caudal Deportivo</strong>', '<strong class="sp-team-name">Caudal Deportivo B</strong>')],
  ['duplicate side tables', withTables(awayTable, awayTable)],
  ['extra table after two valid sides', withTables(homeTable, awayTable, awayTable)],
  ['duplicate header names', partial.replace('<strong class="sp-team-name">Astur CF</strong>', '<strong class="sp-team-name">Caudal Deportivo</strong>')],
  ['normalized header collision', partial.replace('<strong class="sp-team-name">Astur CF</strong>', '<strong class="sp-team-name">CAUDAL Déportivo!</strong>')],
  ['empty normalized header', partial.replace('<strong class="sp-team-name">Astur CF</strong>', '<strong class="sp-team-name">—</strong>')],
  ['missing header identity', partial.replace('<strong class="sp-team-name">Astur CF</strong>', '')],
  ['missing match header', awayTable],
]) {
  test(`rejects ${name} rather than assigning supplied rows by position`, () => {
    assert.throws(() => postaviStrani(html), /^Error: fas:/)
  })
}

test('14507 stays incomplete with no canonical XI or appearances and preserves published clocks', () => {
  const z = vZapisnik(partial, { id: 14507 })
  assert.equal(z.nepopoln, true)
  assert.equal(z.prazen, false)
  assert.equal(z.kontumacija, false)
  assert.deepEqual([z.domaci, z.gostje], [
    { ime: 'Astur CF', postava: [], rezerve: [] },
    { ime: 'Caudal Deportivo', postava: [], rezerve: [] },
  ])
  assert.deepEqual(nastopi(z), [])
  assert.deepEqual(z.rezultat, { domaci: 0, gostje: 3 })
  assert.equal(z.datum, '2026-09-06')
  assert.equal(z.ura, '12:30')
  assert.equal(z.krog, 1)
  assert.equal(z.sezona, '2026/27')
  assert.deepEqual(z.goli.map(({ ekipaIdx, ime, regSt, minuta, avtogol, enajstmetrovka }) =>
    ({ ekipaIdx, ime, regSt, minuta, avtogol, enajstmetrovka })), [
    { ekipaIdx: 1, ime: 'Cris Acerete', regSt: 5117518271767780, minuta: 9, avtogol: false, enajstmetrovka: false },
    { ekipaIdx: 1, ime: 'Julio Delgado', regSt: 4527103187300605, minuta: 24, avtogol: false, enajstmetrovka: false },
    { ekipaIdx: 1, ime: 'Iago Delgado', regSt: 5469320057776988, minuta: 90, avtogol: false, enajstmetrovka: false },
  ])
  assert.ok(partial.includes("92'"))
  assert.deepEqual(dogodkiStrani(partial).goli.map(x => x.minuta), [9, 24, 90])
  assert.deepEqual(z.menjave, [])
  assert.deepEqual(z.opozorila, [
    'zapisnik nepopoln: Astur CF — brez postave',
    'zapisnik nepopoln: Caudal Deportivo — le 2 začetnikov',
    'Caudal Deportivo: menjava ? za ? brez minute',
    'Caudal Deportivo: Iago Delgado je vstopil, menjava brez minute — nastopa ne štejemo',
  ])
})

test('14681: an explicitly entering reserve gets the published single-name substitution minute',()=>{
  const z=vZapisnik(singleName,{id:14681})
  const pablo=z.domaci.rezerve.find(x=>x.ime==='Pablo Barrientos')
  assert.deepEqual(pablo.preklopi,[82])
  const change=z.menjave.find(x=>x.noter.ime==='Pablo Barrientos')
  assert.equal(change.minuta,82);assert.equal(change.ekipaIdx,0)
  assert.deepEqual(change.ven,{st:null,ime:null},'the unreported outgoing player must not be invented')
  assert.ok(!z.opozorila.some(x=>x.includes('Pablo Barrientos')&&x.includes('brez minute')))
  assert.ok(z.opozorila.some(x=>x.includes('Pablo Barrientos')&&x.includes('izstopajoči igralec ni naveden')))
  assert.equal(nastopi(z).find(x=>x.ime==='Pablo Barrientos').minute,8)
  assert.ok(z.opozorila.some(x=>x.includes('José Santullano')&&x.includes('brez minute')),'real missing source time stays visible')
})

test('single-name substitution does not guess a clock or direction for an unused reserve',()=>{
  const noClock=singleName.replace('<span class="sp-res__name">Pablo Barrientos</span><span class="sp-res__min">82\'</span>','<span class="sp-res__name">Pablo Barrientos</span>')
  const noDirection=singleName.replace(/<tr class="fa-conv__row fa-conv__row--entra">(<td class="fa-conv__dorsal">26<\/td>)/,'<tr class="fa-conv__row fa-conv__row--convocado">$1')
  for(const html of [noClock,noDirection]){
    const z=vZapisnik(html,{id:14681})
    assert.deepEqual(z.domaci.rezerve.find(x=>x.ime==='Pablo Barrientos').preklopi,[])
    assert.ok(!z.menjave.some(x=>x.noter.ime==='Pablo Barrientos'))
  }
})

test('single-name substitution never resolves an ambiguous roster name',()=>{
  const row=singleName.match(/<tr class="fa-conv__row fa-conv__row--entra"><td class="fa-conv__dorsal">26<\/td>[\s\S]*?<\/tr>/)[0]
  const html=singleName.replace(row,row+row.replace('>26</td>','>27</td>').replace('/jugador/pablo-barrientos/','/jugador/other-pablo/'))
  const z=vZapisnik(html,{id:14681})
  const players=z.domaci.rezerve.filter(x=>x.ime==='Pablo Barrientos')
  assert.equal(players.length,2);assert.ok(players.every(x=>x.preklopi.length===0))
  assert.ok(!z.menjave.some(x=>x.noter.ime==='Pablo Barrientos'))
  assert.ok(z.opozorila.some(x=>x.includes('Pablo Barrientos')))
})
