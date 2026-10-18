// Published calendar orientation evidence, independent of statistics availability.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const sha=raw=>createHash('sha256').update(raw).digest('hex')
const fail=message=>{throw Error(`DFB calendar: ${message}`)}
const receiptSha256='e5940813944dced7845c3e6ca1eb87868ff4e241b82e24676e3f3aa1569c97b3'
const raw=readFileSync(new URL('./dfb-calendar-receipts.json',import.meta.url))
if(sha(raw)!==receiptSha256)fail('reviewed receipt SHA mismatch')
const receipt=JSON.parse(raw)
const identity=f=>({id:String(f.id).replace(/^de-dfb-/,''),round:f.round,home:f.home,away:f.away,homeSourceClubId:f.homeSourceClubId,awaySourceClubId:f.awaySourceClubId})
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const keys=(o,expected)=>o&&typeof o==='object'&&!Array.isArray(o)&&same(Object.keys(o).sort(),[...expected].sort())
const tuple=f=>JSON.stringify([f.home,f.away])
function reviewedFixture(code,f){
 const i=identity(f),s=receipt.seasons.find(s=>s.code===code)
 const expected=s?.pairs.flatMap(p=>p.fixtures).find(e=>e.id===i.id)
 if(!expected||!same(identity(expected),i))fail('unreviewed fixture identity/season')
 return expected
}
export function dfbCalendarEvidence(code,fixture,witnesses){
 const expected=reviewedFixture(code,fixture)
 if(!Array.isArray(witnesses)||witnesses.length!==2)fail('two participant witnesses required')
 const out=witnesses.map(w=>{
  const original=expected.witnesses.find(e=>e.club===w?.club)
  if(!keys(w,['club','url','sha256'])||!original||w.url!==original.url||!/^[a-f0-9]{64}$/.test(w.sha256??''))fail('participant witness identity/URL/hash differs')
  return {club:w.club,url:w.url,sha256:w.sha256}
 }).sort((a,b)=>a.club.localeCompare(b.club,'en'))
 if(new Set(out.map(w=>w.club)).size!==2||new Set(out.map(w=>w.sha256)).size!==2)fail('distinct participant witnesses required')
 return {version:1,receiptSha256,code,fixture:identity(fixture),witnesses:out}
}
function verifyEvidence(code,f){
 const e=f.calendarEvidence
 if(!keys(e,['version','receiptSha256','code','fixture','witnesses'])||e.version!==1||e.receiptSha256!==receiptSha256||e.code!==code||!keys(e.fixture,['id','round','home','away','homeSourceClubId','awaySourceClubId'])||!same(e.fixture,identity(f)))fail('calendar evidence binding differs')
 const expected=dfbCalendarEvidence(code,f,e.witnesses)
 if(!same(e,expected))fail('calendar evidence differs')
}
/** Every unordered pair still appears twice; repeated directed pairs need proof. */
export function verifyDfbCalendar({code,teams,rounds,fixtures}){
 if(typeof code!=='string'||!/^regionalliga-(nordost|nord|west|suedwest|bayern)\/20\d{2}-20\d{2}$/.test(code)||!Number.isSafeInteger(teams)||teams<2||!Number.isSafeInteger(rounds)||rounds!==2*(teams-1+teams%2)||!Array.isArray(fixtures)||fixtures.length!==teams*(teams-1))fail('season shape/count differs')
 const ids=new Set(),clubs=new Set(),directed=new Map(),unordered=new Map(),names=new Map(),native=new Map()
 for(const f of fixtures){
  const id=String(f.id).replace(/^de-dfb-/,'')
  if(!/^[1-9]\d{0,9}$/.test(id)||ids.has(id)||typeof f.home!=='string'||!f.home||typeof f.away!=='string'||!f.away||f.home===f.away||!Number.isSafeInteger(f.round)||f.round<1||f.round>rounds)fail('duplicate/invalid fixture identity or round')
  ids.add(id);clubs.add(f.home);clubs.add(f.away)
  if(f.homeSourceClubId!=null||f.awaySourceClubId!=null)for(const [name,id]of[[f.home,f.homeSourceClubId],[f.away,f.awaySourceClubId]]){
   if(typeof id!=='string'||!/^[a-zA-Z0-9]+(?:(?:-|%20)[a-zA-Z0-9]+)*$/.test(id)||names.has(name)&&names.get(name)!==id||native.has(id)&&native.get(id)!==name)fail('native club/display name mapping differs')
   names.set(name,id);native.set(id,name)
  }
  const pair=tuple(f),both=JSON.stringify([f.home,f.away].sort())
  directed.set(pair,[...(directed.get(pair)??[]),f]);unordered.set(both,(unordered.get(both)??0)+1)
 }
 if(clubs.size!==teams||unordered.size!==teams*(teams-1)/2||[...unordered.values()].some(n=>n!==2))fail('incomplete unordered pairs/club count')
 for(let round=1;round<=rounds;round++){
  const games=fixtures.filter(f=>f.round===round)
  if(games.length!==Math.floor(teams/2)||new Set(games.flatMap(f=>[f.home,f.away])).size!==2*games.length)fail('round participants/byes differ')
 }
 if(teams%2)for(const club of clubs)for(const half of[0,1]){
  const games=fixtures.filter(f=>f.round>half*rounds/2&&f.round<=(half+1)*rounds/2&&(f.home===club||f.away===club))
  if(games.length!==rounds/2-1)fail('club half-season byes differ')
 }
 for(const games of directed.values()){
  if(games.length===1){if(Object.hasOwn(games[0],'calendarEvidence'))fail('ordinary fixture cannot carry calendar evidence');continue}
  const approved=receipt.seasons.find(s=>s.code===code)?.pairs.find(p=>same(p.fixtures.map(f=>f.id).sort(),games.map(f=>identity(f).id).sort()))
  if(games.length!==2||!approved||teams!==18||rounds!==34)fail('unreviewed duplicate directed pair')
  for(const f of games)verifyEvidence(code,f)
 }
 return true
}
