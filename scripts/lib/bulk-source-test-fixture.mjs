// TEST ONLY: authentic PZPN report statistics inside synthetic complete six-club seasons.
// This creates no production source evidence, registrations, network calls or DB clients.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {POLAND_BULK_CANDIDATES} from '../bulk-poland-source.mjs'
const rawMatch=JSON.parse(readFileSync(new URL('../vzorci/pl-pzpn-tekma-4liga.json',import.meta.url)))
const originalReport=readFileSync(new URL('../vzorci/pl-pzpn-zapisnik-4liga.json',import.meta.url))
const uuid=n=>{const h=createHash('sha256').update('PL_TEST_ONLY/'+n).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`}
export function makePolandBulkFixture({clubPairs=3,now=new Date('2026-10-25T12:00:00Z')}={}) {
 if(!Number.isInteger(clubPairs)||clubPairs<1||clubPairs>3)throw Error('Test fixture requires1..3clubpairs')
 const candidate=structuredClone(POLAND_BULK_CANDIDATES.find(c=>c.source==='pzpn')),calls=[],byPlay=new Map(),reports=new Map(),api='https://szpnkielce.pl/wp-json/szpn/v1/proxy'
 for(const [seasonIndex,code]of [candidate.source_league_code,candidate.archives[0].code].entries()){
  const fixtures=[],year=seasonIndex===0?2026:2025,playedRounds=seasonIndex===0?1:3
  for(let round=1;round<=playedRounds;round++)for(let pair=0;pair<clubPairs;pair++){
   const t=structuredClone(rawMatch),id=seasonIndex===0&&pair===0?rawMatch.id:uuid(10000+seasonIndex*1000+round*10+pair)
   t.id=id;t.kickoff_at=`${year}-08-${String(9+7*(round-1)).padStart(2,'0')}T17:00:00+02:00`;t.round_label=`Kolejka ${round}`;t.league_name='ŚZPN: Klasa B (Świętokrzyskie)'
   if(pair){t.host={id:uuid(100+pair*2),name:rawMatch.host.name+` TestPair${pair}`};t.guest={id:uuid(101+pair*2),name:rawMatch.guest.name.trim()+` TestPair${pair}`}}
   let body=originalReport
   if(pair){const e=JSON.parse(originalReport);let n=0;for(const side of ['host','guest'])for(const p of e.events[side].squad)p.id=uuid(pair*1000+(++n));body=Buffer.from(JSON.stringify(e))}
   fixtures.push(t);reports.set(`${api}/pzpn/shared/matches/${id}/events.json`,body)
  }
  if(seasonIndex===0)for(let pair=0;pair<clubPairs;pair++){const t=structuredClone(fixtures[pair]);t.id=uuid(90000+pair);t.kickoff_at='2026-11-14T12:00:00+01:00';t.round_label='Kolejka 2';t.state='Nierozegrany';t.score={final:null,full_time:null,half:null};fixtures.push(t)}
  byPlay.set(code.split('/')[1],fixtures)
 }
 const request=async(url,init={})=>{
  calls.push({url:String(url),method:init.method??'GET',body:init.body??''})
  const u=new URL(url)
  if(u.origin!=='https://szpnkielce.pl')throw Error('Unmapped offline test host')
  if(u.pathname.endsWith('/matches.json')){const fixtures=byPlay.get(u.searchParams.get('play_id'));if(!fixtures)throw Error('Unmapped offline test scope');const rows=u.searchParams.get('type')==='results'?fixtures.filter(t=>t.state==='Rozegrany'):fixtures;return new Response(JSON.stringify({success:true,data:u.searchParams.get('page')==='1'?rows:[]}))}
  if(reports.has(String(url)))return new Response(reports.get(String(url)))
  throw Error('Unmapped offline test request')
 }
 return {candidate,now,maxRequests:100,fetch:request,calls,originalReport:Buffer.from(originalReport),description:'TEST ONLY: actual PZPN statistics, synthetic six-club current and three-round archive inventory'}
}
