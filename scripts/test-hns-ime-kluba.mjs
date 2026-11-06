import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vZapisnik } from './viri/hns.mjs'

const igralec = (st, ime) => `<li class="row match_lineup" data-personid="${st}"><div class="shirtNumber">${st}</div><h3><a href="https://semafor.hns.family/igraci/${st}/x/">${ime}</a></h3>Igrač</li>`
const zapisnik = (naslov1, naslov2) => `<div class="matchHeader"><div class="competition-title"><h2>Prva HNL kadeti</h2></div>
<ul><li class="club1"><div class="title">${naslov1}</div></li><li class="club2"><div class="title">${naslov2}</div></li></ul>
<div class="result"><ul><li class="res1">2</li><li class="separator">:</li><li class="res2">1</li></ul></div>
<div class="facility">Prečko, Zagreb, 31.10.2026. 18:00</div></div>
<div class="matchLineup"><div class="homeTeam playerslist">${igralec(1, 'Horvat Ivan')}</div><div class="awayTeam playerslist">${igralec(2, 'Kovač Marko')}</div></div>`

test('ime kluba v povezavi (mladinske lige) in kot golo besedilo', () => {
  for (const [n1, n2] of [
    ['<a href="https://semafor.hns.family/klubovi/626/nk-kustosija/">NK Kustošija</a>', '<a href="https://semafor.hns.family/klubovi/638/nk-lucko/">NK Lučko</a>'],
    ['NK Kustošija', 'NK Lučko'],
  ]) {
    const z = vZapisnik(zapisnik(n1, n2), { id: 1 })
    assert.ok(z, 'zapisnik se razčleni')
    assert.deepEqual([z.domaci.ime, z.gostje.ime], ['NK Kustošija', 'NK Lučko'])
  }
})

test('brez imena ni zapisnika (ne isti klub na obeh straneh)', () => {
  assert.equal(vZapisnik(zapisnik('', ''), { id: 1 }), null)
})
