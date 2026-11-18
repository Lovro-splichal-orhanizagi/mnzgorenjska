// Bounded recurring FCF reader: existing pending fixtures are the admission
// boundary. Candidate arithmetic only discovers reports; it never assigns them.
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { razberiKodo, naslovZapisnika, fcfPublicRedirect, validateFcfSingleReportSource } from './fcf.mjs'
import { getHistoricalStatisticsPolicy } from '../lib/historical-statistics-policy.mjs'
const DAY = 86400000
const LIMIT = 100
const COLUMNS = 'id,zapisnik_id,source_url,imported_at,kontumacija,played_on,home:teams!home_team_id(id,name),away:teams!away_team_id(id,name),rounds!inner(id,competition_id,season,number)'
const positive = n => Number.isSafeInteger(n) && n > 0
const warning = reason => console.warn(`fcf: current fixture held — ${reason}`)
function currentWindow(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]))
  const through = `${parts.year}-${parts.month}-${parts.day}`
  const year = Number(parts.year) - (Number(parts.month) < 7 ? 1 : 0)
  return { through, from:new Date(Date.parse(through+'T12:00:00Z')-21*DAY).toISOString().slice(0,10), season:`${year}/${String(year+1).slice(-2)}` }
}
function fixtureIdentity(f,c,season) {
  assert.ok(f && positive(f.id) && positive(f.rounds?.id) && positive(f.rounds.number) && positive(f.home?.id) && positive(f.away?.id) && f.home.id !== f.away.id, 'fcf current fixtures: invalid existing fixture identity')
  assert.equal(f.rounds.competition_id,c.id,'fcf current fixtures: wrong competition')
  assert.equal(f.rounds.season,season,'fcf current fixtures: wrong season')
  assert.match(f.played_on,/^\d{4}-\d{2}-\d{2}$/)
  assert.ok(typeof f.home.name==='string' && typeof f.away.name==='string')
}
function sameFixture(live,original,c,season,key) {
  fixtureIdentity(live,c,season)
  for (const field of ['id','played_on']) assert.equal(live[field],original[field],`fcf current fixtures: fixture ${field} changed`)
  for (const field of ['id','number']) assert.equal(live.rounds[field],original.rounds[field],`fcf current fixtures: round ${field} changed`)
  for (const side of ['home','away']) {
    assert.equal(live[side].id,original[side].id,`fcf current fixtures: ${side} ID changed`)
    assert.equal(key(live[side].name),key(original[side].name),`fcf current fixtures: ${side} changed`)
  }
}
function reportFits(z,f,season,key,competition,group) {
  return z && z.sezona===season && z.tekmovanje===competition && z.skupina===group &&
    z.krog===f.rounds.number && z.datum===f.played_on && key(z.domaci?.ime)===key(f.home.name) && key(z.gostje?.ime)===key(f.away.name)
}
function complete(z,base) {
  if (!z || z.nepopoln!==false || z.prazen || z.kontumacija || z.zaprt!==true || !Array.isArray(z.opozorila) || z.opozorila.length ||
      ![z.rezultat?.domaci,z.rezultat?.gostje].every(n=>Number.isSafeInteger(n)&&n>=0)) return false
  const players=new Set()
  for(const team of [z.domaci,z.gostje]) {
    if(!Array.isArray(team?.postava)||team.postava.length!==11||team.postava.filter(p=>p.vratar).length!==1||!Array.isArray(team.rezerve))return false
    for(const p of [...team.postava,...team.rezerve]) {
      if(!positive(p.regSt)||players.has(p.regSt)||!Array.isArray(p.preklopi)||!p.preklopi.every((m,i,all)=>Number.isInteger(m)&&m>=0&&m<=90&&(!i||m>=all[i-1])))return false
      players.add(p.regSt)
    }
  }
  for(const events of [z.goli,z.rumeni,z.rdeci]) {
    if(!Array.isArray(events))return false
    for(const e of events)if(!players.has(e.regSt)||![0,1].includes(e.ekipaIdx)||!Number.isInteger(e.minuta)||e.minuta<0||e.minuta>90)return false
  }
  for(const i of [0,1])if(z.goli.filter(g=>(g.avtogol?1-g.ekipaIdx:g.ekipaIdx)===i).length!==(i?z.rezultat.gostje:z.rezultat.domaci))return false
  const copy=structuredClone(z), appearances=base.nastopi(copy)
  return !copy.opozorila.length && appearances.length>=22 && appearances.every(p=>positive(p.regSt)&&Number.isInteger(p.minute)&&p.minute>=0&&p.minute<=90) &&
    [0,1].every(i=>{const minutes=appearances.filter(p=>p.ekipaIdx===i).reduce((n,p)=>n+p.minute,0);return minutes>0&&minutes<=990})
}
function cachedCandidates(block,c,season,now,rounds) {
  const out=[]
  for(let id=block.od;id<=block.do;id++) {
    const file=`scripts/.predpomnilnik/fcf/acta-${id}.html`
    if(!existsSync(file)||statSync(file).size>8*1024*1024)continue
    try {
      const html=readFileSync(file,'utf8'), sid=`es${id}`, url=naslovZapisnika(id)
      let round
      if (/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)) {
        const target=fcfPublicRedirect(html,{id:sid,url})
        const [,year,next,league,group,r]=new URL(target).pathname.match(/^\/ca\/partit\/(\d{4})-(\d{4})\/([^/]+)\/grup-(\d+)\/jornada-(\d+)\//)??[]
        const slug=c.slug.replace(/^es-ct-/,'').replace(/-g\d+$/,'')
        if(`${year}/${next?.slice(-2)}`!==season || league!==(slug==='elit'?'lliga-elit':`${slug}-catalana`) || group!==(c.slug.match(/-g(\d+)$/)?.[1]??'1'))continue
        round=Number(r)
      } else round=validateFcfSingleReportSource(html,c.source_league_code,{id:sid,tekmovanje:c,sezona:season,danes:now}).krog
      if(rounds.has(round))out.push({id:sid,round})
    } catch { /* Unproven local bytes are not candidate evidence. */ }
  }
  return out
}
function roundCandidates(block,round) {
  const count=block.do-block.od+1
  const n=[12,14,16].sort((a,b)=>Math.abs(count-a*(a-1))-Math.abs(count-b*(b-1)))[0]
  // Observed blocks can include/omit up to three boundary reports. This is
  // discovery only: exact source and existing-fixture identity still decide
  // admission. More distant block sizes require retained public evidence.
  if(Math.abs(count-n*(n-1))>3||!positive(round)||round>2*(n-1))return []
  const first=block.od+(round-1)*(n/2),last=first+n/2-1
  return Array.from({length:n/2+6},(_,i)=>first-3+i).filter(id=>id>=block.od&&id<=block.do).map(id=>`es${id}`)
}
export function withFcfCurrentFixtures(base,c,db) {
  assert.ok(base?.ime==='fcf' && typeof base.posamezniZapisnik==='function' && db,'fcf current fixtures: native source and DB required')
  assert.ok(c?.source==='fcf' && c.active===true && c.source_policy==null && !getHistoricalStatisticsPolicy(c.slug),'fcf current fixtures: active current competition required')
  assert.equal(c.country_code??c.countries?.code,'ES');assert.equal(c.sezona_koledarska,false)
  const slug=/^es-ct-(elit|primera|segona|tercera|quarta)(?:-g([1-9]\d*))?$/.exec(c.slug)
  assert.ok(slug && (slug[1]==='elit'?!slug[2]:Boolean(slug[2])),'fcf current fixtures: unregistered competition shape')
  const block=razberiKodo(c.source_league_code), key=base.kljucKluba
  const competition=slug[1]==='elit'?'LLIGA ELIT':`${slug[1].toUpperCase()} CATALANA`,group=`GRUP ${slug[2]??'1'}`
  const admitted=new Map()
  const inside=id=>/^es[1-9]\d*$/.test(id??'') && Number(id.slice(2))>=block.od && Number(id.slice(2))<=block.do
  const liveRecord=async(record,original,season)=>{
    const {data:live,error}=await db.from('matches').select(COLUMNS).eq('id',original.id).maybeSingle()
    if(error)throw error
    sameFixture(live,original,c,season,key)
    assert.ok(!live.zapisnik_id||live.zapisnik_id===record.id,'fcf current fixtures: fixture owns another report')
    // Native calendar placeholders carry the first numeric URL in the block.
    // It is evidence of the registered calendar, not ownership of that report.
    const completedSelf = Boolean(live.imported_at) && live.zapisnik_id === record.id && live.source_url === record.url
    if (!completedSelf) assert.equal(live.source_url ?? null, original.source_url ?? null, 'fcf current fixtures: fixture source URL changed')
    const calendarPlaceholder = !original.zapisnik_id && !live.zapisnik_id &&
      original.source_url === naslovZapisnika(block.od) && live.source_url === original.source_url
    assert.ok(!live.source_url || live.source_url === record.url || calendarPlaceholder, 'fcf current fixtures: fixture source URL is not the report or registered calendar')
    if(live.imported_at||live.kontumacija)return false
    const {data:owner,error:ownershipError}=await db.from('matches').select('id,zapisnik_id').eq('zapisnik_id',record.id).maybeSingle()
    if(ownershipError)throw ownershipError
    assert.ok(!owner||owner.id===original.id,'fcf current fixtures: report owned by another fixture')
    return true
  }
  const provider={...base,fcfCurrentFixtures:true,recoveryCaptured:true,recoveryReportIds:[],recoveryRounds:[],
    async zapisniki(code,read,{preskoci=new Set(),samoZapisnik=null}={}) {
      assert.equal(code,c.source_league_code,'fcf current fixtures: league code changed')
      const now=Date.now(),{from,through,season}=currentWindow(now)
      admitted.clear();provider.recoveryReportIds.length=0;provider.recoveryRounds.length=0
      const {data,error}=await db.from('matches').select(COLUMNS).eq('rounds.competition_id',c.id).eq('rounds.season',season)
        .gte('played_on',from).lte('played_on',through).is('imported_at',null).not('kontumacija','is',true).order('played_on',{ascending:false}).order('id').range(0,999)
      if(error)throw error
      assert.ok(Array.isArray(data)&&data.length<1000,'fcf current fixtures: unbounded or invalid pending fixture inventory')
      const pending=new Map(),known=new Map()
      for(const f of [...data].sort((a,b)=>b.played_on.localeCompare(a.played_on)||a.id-b.id)) {
        fixtureIdentity(f,c,season)
        if(f.imported_at||f.kontumacija||f.played_on<from||f.played_on>through)continue
        if(f.zapisnik_id && (!inside(f.zapisnik_id)||preskoci.has(f.zapisnik_id)||samoZapisnik&&samoZapisnik!==f.zapisnik_id))continue
        if(samoZapisnik&&!f.zapisnik_id)continue
        assert.ok(!pending.has(f.id),'fcf current fixtures: duplicate fixture')
        pending.set(f.id,structuredClone(f))
        if(f.zapisnik_id){assert.ok(!known.has(f.zapisnik_id),'fcf current fixtures: duplicate report ownership');known.set(f.zapisnik_id,f.id)}
      }
      const queue=new Map(),add=(id,round)=>{if(inside(id)&&!preskoci.has(id)&&!queue.has(id))queue.set(id,round)}
      for(const f of pending.values())if(f.zapisnik_id)add(f.zapisnik_id,f.rounds.number)
      const unknownRounds=new Set([...pending.values()].filter(f=>!f.zapisnik_id).map(f=>f.rounds.number))
      if(unknownRounds.size) {
        for(const hint of cachedCandidates(block,c,season,now,unknownRounds))add(hint.id,hint.round)
        for(const round of unknownRounds)for(const id of roundCandidates(block,round))add(id,round)
      }
      let reads=0
      const out=[]
      for(const [id,round] of queue) {
        if(!pending.size)break
        if(known.has(id)?!pending.has(known.get(id)):![...pending.values()].some(f=>!f.zapisnik_id&&f.rounds.number===round))continue
        if(reads>=LIMIT){warning(`source budget ${LIMIT} reached for ${c.slug}`);break}
        reads++
        // Source refusals/errors propagate immediately. Never continue a
        // candidate scan after403/429/challenge or retry via another transport.
        const reports=await base.posamezniZapisnik(code,{id,tekmovanje:c,sezona:season,danes:now,allowAbsent:!known.has(id)})(read)
        assert.ok(Array.isArray(reports)&&reports.length<=1,'fcf current fixtures: ambiguous native source result')
        for(const record of reports) {
          assert.ok(record.id===id && record.z?.zapisnikId===id && record.url===naslovZapisnika(id),'fcf current fixtures: native source ID/URL changed')
          if(!complete(record.z,base)){warning(`${id}: incomplete report`);continue}
          const matches=[...pending.values()].filter(f=>(!f.zapisnik_id||f.zapisnik_id===id)&&(!known.has(id)||known.get(id)===f.id)&&reportFits(record.z,f,season,key,competition,group))
          if(matches.length!==1){warning(`${id}: no unique exact pending fixture`);continue}
          const original=matches[0]
          if(!await liveRecord(record,original,season)){pending.delete(original.id);continue}
          const retained=structuredClone(record)
          admitted.set(id,{record:retained,original,season});pending.delete(original.id);out.push(structuredClone(record))
          provider.recoveryReportIds.push(id)
          if(!provider.recoveryRounds.includes(record.z.krog))provider.recoveryRounds.push(record.z.krog)
        }
      }
      if(pending.size)warning(`${pending.size} unresolved fixtures in ${c.slug}; ${reads}/${LIMIT} reports read`)
      return out
    },
    async assertNativeFixture({id,roundId,homeTeamId,awayTeamId}) {
      const selected=admitted.get(id)
      assert.ok(selected,'fcf current fixtures: unselected report')
      const {record,original,season}=selected
      assert.equal(roundId,original.rounds.id,'fcf current fixtures: writer round differs')
      assert.equal(homeTeamId,original.home.id,'fcf current fixtures: writer home differs')
      assert.equal(awayTeamId,original.away.id,'fcf current fixtures: writer away differs')
      return liveRecord(record,original,season)
    },
  }
  return provider
}
