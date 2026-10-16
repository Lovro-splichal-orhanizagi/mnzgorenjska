import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const moduleUrl = new URL('./viri/dfb.mjs', import.meta.url)
const current = readFileSync(new URL('./vzorci/de-dfb-2425990.html', import.meta.url), 'utf8')
const archive = readFileSync(new URL('./vzorci/de-dfb-2401894.html', import.meta.url), 'utf8')
const team = readFileSync(new URL('./vzorci/de-dfb-team-current.html', import.meta.url), 'utf8')
const penalty = readFileSync(new URL('./vzorci/de-dfb-2426054.html', import.meta.url), 'utf8')
const load = () => import(moduleUrl)

test('DFB public current report produces attributable goals, cards and timed appearances', async () => {
  const { vZapisnik, nastopi } = await load()
  const z = vZapisnik(current, { id: '2425990' })
  assert.equal(z.sezona, '2026/27')
  assert.equal(z.krog, 1)
  assert.equal(z.datum, '2026-07-24')
  assert.equal(z.ura, '19:00')
  assert.deepEqual(z.rezultat, { domaci: 4, gostje: 1 })
  assert.equal(z.domaci.postava.length, 11)
  assert.equal(z.gostje.postava.length, 11)
  assert.equal(z.domaci.rezerve.length, 9)
  assert.equal(z.domaci.postava.find(p => p.ime === 'Lorenz Otto').vratar, true)
  assert.deepEqual(z.rumeni.map(c => [c.ime, c.minuta]), [['Laurenz Dehl', 26], ['Viktor Miftaraj', 83], ['Stefan Savicevic', 87]])
  assert.equal(z.goli.filter(g => g.ime === 'Hinata Gonda').length, 3)
  assert.deepEqual(z.goli.at(-1).rezultat, [4,1])
  assert.equal(z.menjave.length, 10)
  const a = nastopi(z)
  assert.equal(a.find(p => p.ime === 'Laurenz Dehl').minute, 45)
  assert.equal(a.find(p => p.ime === 'Robbie Felßberg').minute, 45)
  assert.equal(a.find(p => p.ime === 'Hinata Gonda').minute, 62)
  assert.equal(a.find(p => p.ime === 'Hinata Gonda').goli, 3)
  assert.equal(a.some(p => p.ime === 'Emmanuel Mensah'), false)
})

test('actual Tasmania report preserves penalties and cards before a bench player enters', async () => {
  const {vZapisnik,nastopi}=await load(),z=vZapisnik(penalty,{id:'2426054'})
  assert.deepEqual(z.rezultat,{domaci:3,gostje:1})
  assert.deepEqual(z.goli.filter(g=>g.enajstmetrovka).map(g=>[g.ime,g.minuta,g.rezultat]),[['Erich Berko',50,[1,1]],['Rufat Dadaschow',71,[2,1]]])
  const a=nastopi(z),bench=a.find(p=>p.ime==='Konstantinos Grigoriadis')
  assert.equal(bench.minute,45)
  assert.equal(bench.rumeni,1)
  assert.equal(a.find(p=>p.ime==='Ensar Bekdemir').rumeni,0)
  assert.equal(a.find(p=>p.ime==='Ensar Bekdemir').rdeci,1)
  assert.deepEqual(z.rdeci.map(p=>[p.ime,p.minuta]),[['Ensar Bekdemir',90]])
  assert.equal(a.find(p=>p.ime==='Ensar Bekdemir').minute,3)
  assert.equal(a.find(p=>p.ime==='Rufat Dadaschow').goliIzEnajstmetrovke,1)
})

test('public team schedule supplies all 34 rounds and 18 bounded season team links', async () => {
  const { tekmeEkipe } = await load()
  const s = tekmeEkipe(team, 'regionalliga-nordost/2026-2027', 'bfc-dynamo')
  assert.equal(s.tekme.length, 34)
  assert.equal(s.ekipe.length, 18)
  assert.deepEqual(s.tekme[0], {
    id: '2425990', krog: 1, sezona: '2026/27', datum: '2026-07-24', ura: '19:00',
    domaci: 'FC Rot-Weiß Erfurt', gostje: 'BFC Dynamo', domaciId: 'fc-rot-weiss-erfurt', gostjeId: 'bfc-dynamo',
    izid: {domaci:4,gostje:1}, url: 'https://datencenter.dfb.de/datencenter/regionalliga-nordost/2026-2027/1-spieltag/fc-rot-weiss-erfurt-bfc-dynamo-2425990',
  })
  assert.equal(s.tekme.at(-1).krog, 34)
  assert.equal(s.tekme.at(-1).izid, null)
  assert.throws(()=>tekmeEkipe(team,'regionalliga-nordost/2025-2026','bfc-dynamo'),/sezon|identitet/)
  assert.throws(()=>tekmeEkipe(team.replace('id="match_2425990"','id="match_9999999"'),'regionalliga-nordost/2026-2027','bfc-dynamo'),/šifr|identitet/)
})

test('DFB rejects challenges from caching and stops on denied HTTP statuses before retries', async () => {
  const { default: vir, varniFetch } = await load()
  assert.equal(vir.zaPredpomnilnik('<html><title>captcha</title></html>'),false)
  assert.equal(vir.zaPredpomnilnik(current),true)
  assert.equal(vir.zaPredpomnilnik(current.replaceAll('m-MatchDetails-icon-card--yellow','m-MatchDetails-icon-card--unsupported')),false)
  assert.equal(vir.zaPredpomnilnik(current.replaceAll('Hinata Gonda','Spieler')),false)
  for(const status of [401,403,429]){
    let calls=0
    await assert.rejects(()=>varniFetch('https://datencenter.dfb.de/teams/bfc-dynamo',{},async()=>{calls++;return new Response('',{status})}),e=>e.zavrnitev===true && e.status===status)
    assert.equal(calls,1)
  }
  await assert.rejects(()=>vir.razporedVseStrani('regionalliga-nordost/2026-2027',async()=>'<html>captcha</html>'),/izziv|CAPTCHA/)
  await assert.rejects(()=>varniFetch('https://datencenter.dfb.de/teams/bfc-dynamo',{},async()=>new Response('x'.repeat(2*1024*1024+1))),/velik|omejit/)
})

// Independent 18-team double round-robin, using the captured public row schema.
// Exercises discovery bounds and deduplication without making HTTP requests.
function fullSeasonPages() {
  const clubs=['bfc-dynamo',...Array.from({length:17},(_,i)=>`club-${i+1}`)]
  const circle=[...clubs],matches=[]
  for(let r=0;r<17;r++){
    for(let i=0;i<9;i++){
      const pair=[circle[i],circle[17-i]]
      matches.push({round:r+1,home:pair[0],away:pair[1]})
      matches.push({round:r+18,home:pair[1],away:pair[0]})
    }
    circle.splice(1,0,circle.pop())
  }
  const pages=new Map()
  for(const club of clubs){
    const rows=matches.flatMap((m,i)=>{
      if(m.home!==club&&m.away!==club)return []
      const id=String(9000000+i),url=`https://datencenter.dfb.de/datencenter/regionalliga-nordost/2026-2027/${m.round}-spieltag/${m.home}-${m.away}-${id}`
      const cell=(side,slug)=>`<div class="c-MatchTable-team c-MatchTable-team--${side}"><a href="https://datencenter.dfb.de/competitions/regionalliga-nordost/seasons/2026-2027/teams/${slug}">${slug}</a></div>`
      return [`<div class="c-MatchTable-row"><div id="match_${id}"><div class="c-MatchTable-description">Samstag, 01.08.2026 14:00 Uhr</div></div>${cell('home',m.home)}<div class="c-MatchTable-score"><a href="${url}">- : -</a></div>${cell('away',m.away)}</div>`]
    })
    const url=`https://datencenter.dfb.de/competitions/regionalliga-nordost/seasons/2026-2027/teams/${club}`
    pages.set(url,`<!doctype html><html><head><link rel="canonical" href="${url}"></head><body><div class="c-MatchTable">${rows.join('')}</div></body></html>`)
  }
  return pages
}

test('season discovery reads exactly the 18 discovered teams and emits 306 unique matches', async () => {
  const { default:vir }=await load(),pages=fullSeasonPages(),calls=[]
  const rounds=await vir.razporedVseStrani('regionalliga-nordost/2026-2027',async url=>{calls.push(url);assert(pages.has(url));return pages.get(url)})
  assert.equal(calls.length,18)
  assert.equal(new Set(calls).size,18)
  assert.equal(rounds.length,34)
  assert.equal(rounds[0].tekme.length,9)
  assert.equal(new Set(rounds.flatMap(r=>r.tekme.map(t=>t.dfbId))).size,306)
  const corrupted=new Map(pages),key=[...pages.keys()][1]
  corrupted.set(key,pages.get(key).replace('01.08.2026','02.08.2026'))
  await assert.rejects(()=>vir.razporedVseStrani('regionalliga-nordost/2026-2027',async url=>corrupted.get(url)),/razpored.*ujem/)
})

test('DFB archive added time and changing profile publication preserve club-name identity', async () => {
  const { vZapisnik } = await load()
  const a = vZapisnik(archive, { id: '2401894' })
  const c = vZapisnik(current, { id: '2425990' })
  assert.equal(a.sezona, '2025/26')
  assert.equal(a.goli.length, 5)
  assert.equal(a.goli.find(g => g.ime === 'Ömer Uzun').minuta, 90)
  assert.equal(a.domaci.rezerve.find(p => p.ime === 'Jamal Mantatu Rogero').st, null)
  assert.equal(a.menjave.length, 10)
  const player = z => [z.domaci,z.gostje].flatMap(e => e.postava).find(p => p.ime === 'Tobias Gunte')
  assert.equal(player(a).virId, player(c).virId)
  assert.equal(player(a).regSt, null)
  assert.equal(player(c).regSt, null)
})

test('DFB rejects incomplete reports, generic identities and mismatched schedule metadata', async () => {
  const { vZapisnik } = await load()
  assert.throws(() => vZapisnik(current.slice(0, -200)), /odrezan|nepopoln/)
  assert.throws(() => vZapisnik(current.replaceAll('Hinata Gonda', 'Spieler')), /identitet|igral/)
  assert.throws(() => vZapisnik(current, { id: '2401894' }), /identitet|šifr/)
  assert.throws(() => vZapisnik(current, { id: '2425990', tekma: { krog: 2 } }), /razpored/)
  assert.throws(() => vZapisnik(current, { id: '2425990', tekma: { domaci: 'BFC Dynamo' } }), /razpored/)
  assert.throws(() => vZapisnik(current, { id: '2425990', tekma: { domaciId: 'another-club' } }), /razpored/)
  assert.throws(() => vZapisnik(current, { id: '2425990', tekma: { izid: { domaci: 0, gostje: 0 } } }), /razpored/)
})

test('rejects a goal before a reserve entered and same-team names that cannot identify a player', async () => {
  const { vZapisnik } = await load()
  assert.throws(()=>vZapisnik(current.replace('Hinata Gonda&nbsp;&nbsp;1:0','Benjamin Dreca&nbsp;&nbsp;1:0').replace('Hinata Gonda\u00a0\u00a01:0','Benjamin Dreca\u00a0\u00a01:0')),/neaktiv|vstop|dogodk/)
  assert.throws(()=>vZapisnik(current.replaceAll('Hinata Gonda','Laurenz Dehl')),/dvoumn|soimen/)
  const badScore=current.replace(/Hinata Gonda(?:&nbsp;|\u00a0){2}1:0/,'Hinata Gonda&nbsp;&nbsp;2:0')
  assert.notEqual(badScore,current)
  assert.throws(()=>vZapisnik(badScore),/izid|dogodk/)
  assert.throws(()=>vZapisnik(current.replaceAll('24. Juli 2026','24. Juli 2025')),/datum|sezon/)
})
