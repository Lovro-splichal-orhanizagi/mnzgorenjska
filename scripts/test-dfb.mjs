import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const moduleUrl = new URL('./viri/dfb.mjs', import.meta.url)
const current = readFileSync(new URL('./vzorci/de-dfb-2425990.html', import.meta.url), 'utf8')
const archive = readFileSync(new URL('./vzorci/de-dfb-2401894.html', import.meta.url), 'utf8')
const team = readFileSync(new URL('./vzorci/de-dfb-team-current.html', import.meta.url), 'utf8')
const penalty = readFileSync(new URL('./vzorci/de-dfb-2426054.html', import.meta.url), 'utf8')
const load = () => import(moduleUrl)
const actual = id => readFileSync(new URL(`./vzorci/de-dfb-${id}.html`, import.meta.url), 'utf8')

test('real own goals follow the beneficiary score but belong to the opposite lineup player', async () => {
  const {vZapisnik,nastopi}=await load()
  for(const [id,name,side,minute,score] of [
    ['2401912','Willi Reincke',0,23,[0,1]],
    ['2401938','Leandro Putaro',1,54,[1,1]],
    ['2401995','Adrian Jarosch',1,76,[2,1]],
  ]){
    const z=vZapisnik(actual(id),{id}),own=z.goli.filter(g=>g.avtogol)
    assert.deepEqual(own.map(g=>[g.ime,g.ekipaIdx,g.minuta,g.rezultat]),[[name,side,minute,score]])
    assert.equal(nastopi(z).find(p=>p.ime===name&&p.ekipaIdx===side).avtogoli,1)
  }
})

test('a shared card icon applies to each explicitly named person including officials', async () => {
  const {vZapisnik}=await load(),z=vZapisnik(actual('2401965'),{id:'2401965'})
  assert.equal(z.rumeni.length,7)
  assert.deepEqual(z.uradneKazni.map(c=>[c.ime,c.minuta,c.vrsta]),[['Dennis Kutrieb',60,'yellow']])
  assert.equal(z.rumeni.find(c=>c.ime==='Moritz Polte').minuta,60)
})

test('actual compressed Gelb-Rot reports establish one prior caution with an unknown minute', async () => {
  const {vZapisnik,nastopi}=await load()
  for(const [id,name,minute] of [['2402004','Dominik Pestic',90],['2402013','Jan Shcherbakovski',88]]){
    const z=vZapisnik(actual(id),{id}),yellow=z.rumeni.filter(c=>c.ime===name)
    assert.equal(yellow.length,1)
    assert.equal(yellow[0].minuta,null)
    assert.equal(yellow[0].izpeljanIz,'drugi-rumeni')
    assert.deepEqual(z.rdeci.filter(c=>c.ime===name).map(c=>c.minuta),[minute])
    assert(z.opozorila.some(s=>s.includes(name)&&s.includes('neznana minuta')))
    const p=nastopi(z).find(p=>p.ime===name)
    assert.equal(p.rumeni,1)
    assert.equal(p.rdeci,1)
  }
})

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

test('second-yellow dismissals derive only an unrecorded prior caution and never double count it', async () => {
  const {vZapisnik,nastopi}=await load()
  const secondYellow=penalty.replaceAll('m-MatchDetails-icon-card--red','m-MatchDetails-icon-card--yellow-red')
  const compressed=vZapisnik(secondYellow)
  assert.deepEqual(compressed.rumeni.filter(c=>c.ime==='Ensar Bekdemir').map(c=>[c.minuta,c.izpeljanIz]),[[null,'drugi-rumeni']])
  const withCaution=secondYellow.replace(/(<div class="m-MatchDetails-history-event-text-segment">)([\s\S]*?)(<\/div>)/g,(whole,start,body,end)=>body.includes('m-MatchDetails-icon-caret-right')?whole:start+body.replace('Konstantinos Grigoriadis','Ensar Bekdemir')+end)
  const explicit=vZapisnik(withCaution)
  assert.deepEqual(explicit.rumeni.filter(c=>c.ime==='Ensar Bekdemir').map(c=>[c.minuta,c.izpeljanIz]),[[28,undefined]])
  assert.deepEqual(explicit.opozorila,[])
  const p=nastopi(explicit).find(p=>p.ime==='Ensar Bekdemir')
  assert.equal(p.rumeni,1)
  assert.equal(p.rdeci,1)
  assert.equal(p.minute,3)
})

test('an unused reserve retains his caution without invented playing minutes or clean sheet', async () => {
  const {vZapisnik,nastopi}=await load()
  const cardOnly=current.replace(/(<div class="m-MatchDetails-history-event-text-segment">)([\s\S]*?)(<\/div>)/g,(whole,start,body,end)=>{
    if(body.includes('m-MatchDetails-icon-caret-right'))return whole
    return start+body.replace('Laurenz Dehl','Emmanuel Mensah')+end
  })
  assert.notEqual(cardOnly,current)
  const z=vZapisnik(cardOnly),a=nastopi(z),p=a.find(x=>x.ime==='Emmanuel Mensah')
  assert.equal(z.rumeni.filter(x=>x.ime==='Emmanuel Mensah').length,1)
  assert(p)
  assert.equal(p.minute,0)
  assert.equal(p.minutaOd,0)
  assert.equal(p.minutaDo,0)
  assert.equal(p.zacetnik,false)
  assert.equal(p.rumeni,1)
  assert.equal(p.rdeci,0)
  assert.equal(p.cleanSheet,false)
  assert.equal(p.pozicija,null)
  assert.equal(p.kartonSKlopi,true)
})

function unusedBenchCard(html) {
  return html.replace(/(<div class="m-MatchDetails-history-event-text-segment">)([\s\S]*?)(<\/div>)/g,(whole,start,body,end)=>body.includes('m-MatchDetails-icon-caret-right')?whole:start+body.replace('Laurenz Dehl','Emmanuel Mensah')+end)
}

test('dismissal is permanent for bench entry, subsequent cards and outgoing substitutions', async () => {
  const {vZapisnik}=await load()
  const redBench=unusedBenchCard(current).replaceAll('m-MatchDetails-icon-card--yellow','m-MatchDetails-icon-card--red')
  const laterEntry=redBench.replaceAll(/Benjamin Dreca(?:&nbsp;|\u00a0|\s)+für/g,'Emmanuel Mensah&nbsp;für')
  assert.notEqual(laterEntry,redBench)
  assert.throws(()=>vZapisnik(laterEntry),/izključ|rdeč/)

  // Duplicate the explicitly named 26-minute caution in both event sections,
  // preserving their agreement; the second card after a dismissal is invalid.
  const starts=[...redBench.matchAll(/<div class="m-MatchDetails-history-item">/g)].map(m=>m.index)
  const laterCard=starts.map((start,i)=>{
    const row=redBench.slice(start,starts[i+1]??redBench.length)
    if(!/m-MatchDetails-history-event-text-segment">\s*(?:<a[^>]*>)?Emmanuel Mensah/.test(row)||row.includes('m-MatchDetails-icon-caret-right'))return row
    return row+row.replace("26'","27'")
  }).join('')
  const withPrefix=redBench.slice(0,starts[0])+laterCard
  assert.notEqual(withPrefix,redBench)
  assert.throws(()=>vZapisnik(withPrefix),/karton po izključitvi/)
  assert.throws(()=>vZapisnik(withPrefix.replaceAll('m-MatchDetails-icon-card--red','m-MatchDetails-icon-card--yellow')),/podvojen rumeni/)

  // A dismissed starter cannot later leave via a substitution either.
  const redStarter=current.replaceAll('m-MatchDetails-icon-card--yellow','m-MatchDetails-icon-card--red')
  assert.throws(()=>vZapisnik(redStarter),/menjav|izključ/)
})

test('goalkeeper substitution inference agrees with and without a published bench', async () => {
  const {vZapisnik,nastopi}=await load()
  const keeperPair=current.replace(/(m-MatchDetails-icon-caret-right--red"><\/div>\s*)(?:<a\b[^>]*>)?Laurenz Dehl(?:<\/a>)?/g,'$1Lorenz Otto')
  assert.notEqual(keeperPair,current)
  let table=0
  const noBench=keeperPair.replace(/<table class="m-MatchDetails-lineup-table">[\s\S]*?<\/table>/g,whole=>++table===2?'':whole)
  for(const html of [keeperPair,noBench]){
    const z=vZapisnik(html),p=z.domaci.rezerve.find(p=>p.ime==='Robbie Felßberg'),a=nastopi(z).find(p=>p.ime==='Robbie Felßberg')
    assert.equal(p.vratar,true)
    assert.equal(p.vratarVir,'menjava-vratarja')
    assert.equal(a.pozicija,'GK')
    assert.equal(a.minute,45)
  }
  const baseline=vZapisnik(current)
  assert.equal(baseline.domaci.rezerve.find(p=>p.ime==='Robbie Felßberg').vratar,null)
  const contradictory=current.replaceAll('>Robbie Felßberg</a>','>Robbie Felßberg (T)</a>')
  assert.throws(()=>vZapisnik(contradictory),/vratar/)
})

test('dedicated event sections and halftime must agree with the timed full report', async () => {
  const {vZapisnik}=await load()
  const k=current.indexOf('>Karten</div>')
  assert(k>0)
  const contradictory=current.slice(0,k)+current.slice(k).replace('Laurenz Dehl','Emmanuel Mensah')
  assert.throws(()=>vZapisnik(contradictory),/neujemajoči dogodki|razdel/)
  const wrongHalf=current.replaceAll('(4:0)','(0:0)')
  assert.throws(()=>vZapisnik(wrongHalf),/polčas/)
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
