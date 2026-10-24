// Test-only: authentic report statistics inside EXPLICITLY SYNTHETIC complete-season/phase framing.
import {readFileSync} from 'node:fs'
const base=new URL('./vzorci/',import.meta.url)
const original=n=>JSON.parse(readFileSync(new URL(`au-dribl-${n}.json`,base)))
export const driblScope={tenant:'1RwNlWemjr',season:'wOmelzGd02',competition:'A4KLxx87Kq',league:'bgdMjoBxmE'}
export const captureNow=Date.parse('2026-10-24T20:00:00Z')
const API='https://mc-api.dribl.com/api/'
export function syntheticDriblSeason({scope=driblScope,held=false,pageSplit=false,suffix=''}={}){
 const map=new Map(),put=(u,x)=>map.set(u,Buffer.from(JSON.stringify(x)))
 put(API+'tenants?mc_link=competitions.footballnsw.com.au&slug=competitions',original('tenants'))
 put(API+'list/seasons?disable_paging=true&tenant='+scope.tenant,original('seasons'))
 put(API+`list/competitions?disable_paging=true&tenant=${scope.tenant}&season=${scope.season}`,original('competitions-2026'))
 put(API+`list/leagues?disable_paging=true&tenant=${scope.tenant}&competition=${scope.competition}&sort=%2Bname`,original('leagues-npl'))
 const seed=original('results-npl').data.find(r=>r.attributes.match_hash_id==='1K3pRqqeGd')
 const rows=[]
 for(const [i,phase]of ['R1','F1','F2'].entries()){
  const matchId=i===2&&!suffix?'1K3pRqqeGd':`Synthetic${phase}${suffix}`
  const m=original(held&&i===2?'match-vdWDwrrWym':'match-1K3pRqqeGd'),a=m.data.attributes
  m.data.hash_id=matchId;a.match_hash_id=matchId;a.league_hash_id=scope.league;a.league_name=scope.league===driblScope.league?'First Grade':'U20';a.round_number=i===0?1:i;a.display_round_number=phase;a.round_label=i===0?null:i===1?'Qualifying Finals':'Semi Finals';a.match_type=i===0?'roundrobin':'finals'
  const f=structuredClone(seed);f.type='fixtures';f.hash_id='SyntheticFixture'+phase+suffix
  Object.assign(f.attributes,{match_hash_id:matchId,date:a.date.replace(' ','T')+'.000000Z',round:phase.startsWith('F')?phase+'#'+(i+1):phase,full_round:phase==='R1'?'Round 1':'Finals '+i,round_label:a.round_label,fixture_reference:i+1,home_team_hash_id:a.home_team_hash_id,away_team_hash_id:a.away_team_hash_id,home_team_name:a.home_team_name,away_team_name:a.away_team_name,home_score:a.home_score,away_score:a.away_score,league_name:a.league_name})
  rows.push(f);put(API+`matchcentre/${matchId}?tenant=${scope.tenant}`,m)
  for(const side of ['home','away'])put(API+`matchcentre-match-members/match/${matchId}/team/${a[side+'_team_hash_id']}`,original(held&&i===2?'members-'+side:'semi-'+side))
 }
 const inventory=API+`fixtures?season=${scope.season}&competition=${scope.competition}&league=${scope.league}&date_range=all&tenant=${scope.tenant}&timezone=Europe%2FLjubljana`
 const page=(data,next)=>({data,links:{first:null,last:null,prev:null,next:next?API+'fixtures?cursor='+next:null},meta:{path:API+'fixtures',per_page:30,next_cursor:next,prev_cursor:null}})
 if(pageSplit){put(inventory,page(rows.slice(0,1),'syntheticCursor2'));put(inventory+'&cursor=syntheticCursor2',page(rows.slice(1),null))}else put(inventory,page(rows,null))
 return {map,scope,inventory,rows,synthetic:true}
}
export function closedDriblFetch(map,calls=[]){return async(url,options)=>{calls.push({url,options});if(!map.has(url))throw new Error('Closed fixture map refuses uncaptured URL '+url);return new Response(map.get(url),{status:200,headers:{'content-type':'application/json'}})}}
export function fakeDriblClock(){let time=captureNow;return {now:()=>time,sleep:async ms=>{time+=ms}}}
export function syntheticDriblSecondYellowSeason(){
 const s=syntheticDriblSeason(),u='https://mc-api.dribl.com/api/matchcentre/1K3pRqqeGd?tenant='+s.scope.tenant,m=JSON.parse(s.map.get(u)),rosterUrl='https://mc-api.dribl.com/api/matchcentre-match-members/match/1K3pRqqeGd/team/lNb38MwoKx',roster=JSON.parse(s.map.get(rosterUrl)),p=roster.find(p=>p.first_name==='Mason'),w=original('home-Pmj27A1G5m').find(p=>p.first_name==='Callum').cards
 // Synthetic discipline variation, with exactly the three witnessed R7 card records.
 p.cards=structuredClone(w);p.has_cards=true
 for(const c of w)m.data.attributes.match_events.push({type:'card',...c,minute:Number(c.minute),team_id:p.team_hash_id,name:p.first_name+' '+p.last_name,jersey:p.jersey})
 m.data.attributes.match_events.sort((a,b)=>Number(a.minute)-Number(b.minute))
 s.map.set(u,Buffer.from(JSON.stringify(m)));s.map.set(rosterUrl,Buffer.from(JSON.stringify(roster)));return s
}
export function syntheticDriblStraightRedSeason(){
 // Actual R26 R5 report remains byte-identical; R1..R25 are explicitly synthetic phase framing.
 const s=syntheticDriblSeason(),scope=s.scope,seed=original('fixtures-all-npl').data[0],rows=[]
 for(let round=1;round<=26;round++){
  const actual=round===26,id=actual?'1K3pvJ2P7d':'SyntheticRound'+round,m=original('match-1K3pvJ2P7d'),a=m.data.attributes
  if(!actual){m.data.hash_id=id;a.match_hash_id=id;a.round_number=round;a.display_round_number='R'+round;a.display_type_round_number='R'+round}
  const f=structuredClone(seed);f.hash_id='SyntheticSchedule'+round;Object.assign(f.attributes,{match_hash_id:id,date:a.date.replace(' ','T')+'.000000Z',round:'R'+round,full_round:'Round '+round,home_team_name:a.home_team_name,away_team_name:a.away_team_name,home_team_hash_id:a.home_team_hash_id,away_team_hash_id:a.away_team_hash_id,home_score:a.home_score,away_score:a.away_score});rows.push(f)
  s.map.set(API+`matchcentre/${id}?tenant=${scope.tenant}`,Buffer.from(actual?readFileSync(new URL('au-dribl-match-1K3pvJ2P7d.json',base)):JSON.stringify(m)))
  for(const side of ['home','away'])s.map.set(API+`matchcentre-match-members/match/${id}/team/${a[side+'_team_hash_id']}`,Buffer.from(readFileSync(new URL(`au-dribl-${side}-1K3pvJ2P7d.json`,base))))
 }
 // Remove unused synthetic finals documents so closed replay rejects no extraneous source bytes.
 for(const u of [...s.map.keys()])if((u.includes('/matchcentre/')||u.includes('/matchcentre-match-members/'))&&!u.includes('SyntheticRound')&&!u.includes('1K3pvJ2P7d'))s.map.delete(u)
 s.map.set(s.inventory,Buffer.from(JSON.stringify({data:rows,links:{first:null,last:null,prev:null,next:null},meta:{path:API+'fixtures',per_page:30,next_cursor:null,prev_cursor:null}})));return s
}
