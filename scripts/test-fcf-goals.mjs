import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { drevoRsc, elementi, goliZapisnika, vZapisnik } from './viri/fcf.mjs'

const beri = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
const vzorec = () => drevoRsc(beri('es-fcf-goal-type-4109643.html'))
const pol = (drevo) => [...elementi(drevo)].find((e) => e.props?.player?.id === '18314717')
const golPola = (drevo) => goliZapisnika(drevo).find((g) => g.regSt === 18314717)

// Literal expectation from the source's GOL annotation, independent of the parser.
// Catches treating PENALBA in a player's surname as a penalty marker.
test('authentic 4109643: Vila Penalba Pol scored a normal goal at 54', () => {
  const goli = goliZapisnika(vzorec())
  assert.equal(goli.length, 4)
  assert.deepEqual(goli.find((g) => g.regSt === 18314717), {
    regSt: 18314717, ime: 'Vila Penalba Pol', minuta: 54, stanje: [1, 2], vrsta: 'gol',
  })
})

// Existing source examples keep explicit penalty / own-goal labels and public flags.
for (const [ime, regSt, minuta, vrsta, zastavica] of [
  ['es-fcf-acta-rdeci-4139542.html', 32693625, 80, 'enajstmetrovka', 'enajstmetrovka'],
  ['es-fcf-acta-avtogol-4139572.html', 19703228, 89, 'avtogol', 'avtogol'],
]) {
  test(`existing explicit ${vrsta} label remains classified`, () => {
    const html = beri(ime)
    assert.equal(goliZapisnika(drevoRsc(html)).find((g) => g.regSt === regSt && g.minuta === minuta)?.vrsta, vrsta)
    assert.equal(vZapisnik(html).goli.find((g) => g.regSt === regSt && g.minuta === minuta)?.[zastavica], true)
  })
}

// Controlled variants of the authentic tree are synthetic controls, not primary evidence.
for (const [oznaka, vrsta] of [
  ['GOL', 'gol'], ['GOL PENAL', 'enajstmetrovka'],
  ['GOL EN PRÒPIA', 'avtogol'], ['GOL EN PROPIA', 'avtogol'],
  ['NEZNANO', 'gol'], ['', 'gol'],
]) {
  test(`dedicated label ${oznaka || '(missing)'}: names, club and legend cannot set the type`, () => {
    const drevo = vzorec()
    const igralec = pol(drevo)
    const vsebina = [...elementi(drevo)].find((e) => e.otroci.includes(igralec))
    const ime = igralec.otroci[0]
    ime.otroci[0] = 'GOL PENAL EN PRÒPIA, POL'
    igralec.props.player.nombre = 'GOL PENAL EN PRÒPIA, POL'
    igralec.props.teamName = 'GOL PENAL EN PRÒPIA, C.F.'
    ime.otroci[2].otroci[1] = oznaka
    vsebina.otroci[1].otroci[0] = oznaka
    vsebina.otroci[1].otroci[2] = igralec.props.teamName
    if (!oznaka) {
      ime.otroci.splice(2, 1)
      vsebina.otroci.splice(1, 1)
    }
    // A nested player-name span is unrelated text, even if it equals a known type.
    ime.otroci.unshift({ tip: 'span', props: {}, otroci: ['GOL PENAL'] })
    vsebina.otroci.push({ tip: 'div', props: {}, otroci: [
      { tip: 'span', props: {}, otroci: ['GOL EN PRÒPIA'] },
      { tip: 'span', props: {}, otroci: ['GOL PENAL'] },
    ] })
    assert.equal(golPola(drevo)?.vrsta, vrsta)
  })
}
