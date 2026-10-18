import assert from 'node:assert/strict'
import * as api from './viri/dfb-calendar.mjs'
// Independently transcribed fixture identities from the reviewed original pages.
export const reviewed={
 nord:[
  {home:'SV Werder Bremen II',away:'1. FC Phönix Lübeck',homeSourceClubId:'sv-werder-bremen-ii',awaySourceClubId:'1-fc-phoenix-luebeck',games:[['2423139',7],['2423378',33]]},
  {home:'VfB Lübeck',away:'SV Todesfelde',homeSourceClubId:'vfb-luebeck',awaySourceClubId:'SV-Todesfelde',games:[['2423173',11],['2423342',29]]}],
 west:[
  {home:'Rot-Weiß Oberhausen',away:'Borussia Mönchengladbach II',homeSourceClubId:'rot-weiss-oberhausen',awaySourceClubId:'borussia-moenchengladbach-ii',games:[['2425450',9],['2425603',26]]},
  {home:'Rot-Weiß Oberhausen',away:'SC Paderborn 07 II',homeSourceClubId:'rot-weiss-oberhausen',awaySourceClubId:'sc-paderborn-07-ii',games:[['2425470',11],['2425622',28]]}]
}
const code=region=>`regionalliga-${region}/2026-2027`
const identity=(p,[id,round])=>{const {games,...rest}=p;return {id,round,...rest}}
const witnesses=(region,f)=>[f.homeSourceClubId,f.awaySourceClubId].map((club,i)=>({club,url:`https://datencenter.dfb.de/competitions/regionalliga-${region}/seasons/2026-2027/teams/${club}`,sha256:(i?'b':'a').repeat(64)}))
export function calendar(region='nord',evidence=true){
 const known=reviewed[region],native=new Map(known.flatMap(p=>[[p.home,p.homeSourceClubId],[p.away,p.awaySourceClubId]])),names=[...native.keys()]
 if(region==='nord'){names.push('VfB Oldenburg');native.set('VfB Oldenburg','vfb-oldenburg')}
 while(names.length<18){const name=`Club ${names.length}`;names.push(name);native.set(name,`club-${names.length}`)}
 const ring=[...names],fixtures=[]
 for(let r=0;r<17;r++){
  for(let i=0;i<9;i++)for(let leg=0;leg<2;leg++){
   const [home,away]=leg?[ring[17-i],ring[i]]:[ring[i],ring[17-i]]
   fixtures.push({id:String(9000000+fixtures.length),round:r+1+17*leg,home,away,homeSourceClubId:native.get(home),awaySourceClubId:native.get(away)})
  }
  ring.splice(1,0,ring.pop())
 }
 const rounds=new Map()
 for(const p of known){
  const games=fixtures.filter(f=>[p.home,p.away].includes(f.home)&&[p.home,p.away].includes(f.away))
  assert.equal(games.length,2)
  games.sort((a,b)=>a.round-b.round).forEach((f,i)=>{assert(!rounds.has(f.round));rounds.set(f.round,p.games[i][1]);Object.assign(f,identity(p,p.games[i]))})
 }
 const spare=Array.from({length:34},(_,i)=>i+1).filter(r=>![...rounds.values()].includes(r))
 for(let r=1;r<=34;r++)if(!rounds.has(r))rounds.set(r,spare.shift())
 // Reviewed fixtures already have their target round; map all other rounds.
 for(const f of fixtures)if(!known.some(p=>p.games.some(([id])=>id===f.id)))f.round=rounds.get(f.round)
 if(evidence)for(const p of known)for(const game of p.games){const f=fixtures.find(f=>f.id===game[0]);f.calendarEvidence=api.dfbCalendarEvidence(code(region),f,witnesses(region,f))}
 return {code:code(region),teams:18,rounds:34,fixtures}
}
const verify=s=>api.verifyDfbCalendar(s)
const reverse=f=>{[f.home,f.away]=[f.away,f.home];[f.homeSourceClubId,f.awaySourceClubId]=[f.awaySourceClubId,f.homeSourceClubId];delete f.calendarEvidence}
