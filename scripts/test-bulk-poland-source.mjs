import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {POLAND_BULK_CANDIDATES,capturePolandCandidate,loadPolandPack} from './bulk-poland-source.mjs'
const current=()=>structuredClone(POLAND_BULK_CANDIDATES.find(c=>c.source==='pzpn'))
const original=JSON.parse(readFileSync(new URL('./vzorci/pl-pzpn-tekma-4liga.json',import.meta.url))),events=readFileSync(new URL('./vzorci/pl-pzpn-zapisnik-4liga.json',import.meta.url))
const fixed=new Date('2026-10-25T12:00:00Z'),copy=x=>structuredClone(x)
function setup(patch={}){
 const root=mkdtempSync(join(tmpdir(),'pl-source-')),directory=join(root,'capture'),candidate=current(),calls=[]
 // Actual 4liga report statistics inside explicit synthetic B1 current/archive page framing.
 const rows=[{...copy(original),league_name:'ŚZPN: Klasa B (Świętokrzyskie)'},{...copy(original),id:'4f26cf1c-aba2-4e26-808a-eb401a031e2f',kickoff_at:'2025-08-09T17:00:00+02:00',league_name:'ŚZPN: Klasa B (Świętokrzyskie)'}]
 const request=async(url,init={})=>{const u=new URL(url);calls.push({url:String(url),init});if(patch.request)return patch.request(u,init,rows);if(u.pathname.endsWith('/matches.json')){const index=u.searchParams.get('play_id')===candidate.source_league_code.split('/')[1]?0:1;return new Response(JSON.stringify({success:true,data:u.searchParams.get('page')==='1'?[rows[index]]:[]}))}if(u.pathname.endsWith('/events.json'))return new Response(events);throw Error('Unmapped offline request')}
 return {candidate,directory,calls,rows,request,dispose:()=>rmSync(root,{recursive:true,force:true})}
}
test('exact thirteen inactive reviewed tuples preserve documented archives and explicit missing-archive HOLD',async()=>{
 assert.equal(POLAND_BULK_CANDIDATES.length,13);assert.equal(current().id,582);assert.equal(current().slug,'pl-sk-b-kielce-1');assert.equal(POLAND_BULK_CANDIDATES.filter(c=>c.source==='wmzpn').length,12)
 const missing=POLAND_BULK_CANDIDATES.find(c=>c.slug==='pl-wm-b-5');assert.equal(missing.id,960);assert.deepEqual(missing.archives,[])
 let calls=0;await assert.rejects(()=>capturePolandCandidate(missing,{directory:'/not-created',maxRequests:10,fetch:async()=>{calls++}}),e=>e.dataHold===true&&e.reason_code==='MISSING_ARCHIVE');assert.equal(calls,0)
})
test('PZPN real adapter produces a complete current+archive JSON pack and closed original-byte replay',async()=>{
 const f=setup();try{const pack=await capturePolandCandidate(f.candidate,{directory:f.directory,maxRequests:20,now:fixed,fetch:f.request});assert.equal(pack.version,1);assert.equal(pack.seasons.length,2);assert.deepEqual(pack.seasons.map(s=>s.reports.length),[1,1]);assert.deepEqual(pack.seasons.map(s=>s.season),['2026/27','2025/26']);assert.equal(pack.seasons[0].reports[0].nastopi.filter(a=>a.zacetnik&&a.vratar).length,2);assert.equal(pack.seasons[0].reports[0].z.goli.length,4);assert.equal(pack.seasons[0].schedule.length,1);assert.deepEqual(JSON.parse(JSON.stringify(pack)),pack);assert.deepEqual(await loadPolandPack(f.directory,{candidate:f.candidate,now:fixed}),pack);assert.equal(f.calls.length,10)}finally{f.dispose()}
})
test('pagination cannot be declared complete from a repeated or contradictory first-page sample',async()=>{
 const f=setup({request:async(u,init,rows)=>new Response(JSON.stringify({success:true,data:[rows[0]]}))});try{await assert.rejects(()=>capturePolandCandidate(f.candidate,{directory:f.directory,maxRequests:20,now:fixed,fetch:f.request}),e=>e.dataHold===true&&/PAGINATION|DUPLICATE/.test(e.reason_code))}finally{f.dispose()}
})
for(const kind of ['missing_keeper','missing_profile','untimed_sub','bad_goal_side'])test(`PZPN ${kind} cannot be reported complete`,async()=>{
 const e=JSON.parse(events);if(kind==='missing_keeper')e.events.host.squad.forEach(p=>p.isKeeper=false);if(kind==='missing_profile')e.events.host.squad[0].id=null;if(kind==='untimed_sub')e.events.host.squad[0].substitutions[0].minute=null;if(kind==='bad_goal_side'){const p=e.events.host.squad.find(p=>p.goals.length);e.events.guest.squad[0].goals.push(p.goals.pop())}
 const f=setup();const req=async(url,init)=>String(url).includes('/events.json')?new Response(JSON.stringify(e)):f.request(url,init)
 try{await assert.rejects(()=>capturePolandCandidate(f.candidate,{directory:f.directory,maxRequests:20,now:fixed,fetch:req}),e=>e.dataHold===true)}finally{f.dispose()}
})
test('played label without published score remains typed HOLD, never inferred 0:0',async()=>{
 const f=setup();f.rows[0].score={final:null,full_time:null};try{await assert.rejects(()=>capturePolandCandidate(f.candidate,{directory:f.directory,maxRequests:20,now:fixed,fetch:f.request}),e=>e.dataHold===true&&e.reason_code==='PUBLISHED_SCORE_MISSING')}finally{f.dispose()}
})
for(const failure of ['403','429','503','transport','non_json'])test(`source ${failure} stops the host`,async()=>{
 const f=setup({request:async()=>{if(failure==='transport')throw Error('offline transport failure');return new Response(failure==='non_json'?'<html>login</html>':'refused',{status:failure==='non_json'?200:Number(failure)})}})
 try{await assert.rejects(()=>capturePolandCandidate(f.candidate,{directory:f.directory,maxRequests:20,now:fixed,fetch:f.request}),e=>e.sourceStop===true&&e.host==='szpnkielce.pl')}finally{f.dispose()}
})
test('actual request limit is enforced before another GET',async()=>{
 const f=setup();try{await assert.rejects(()=>capturePolandCandidate(f.candidate,{directory:f.directory,maxRequests:1,now:fixed,fetch:f.request}),e=>e.sourceStop===true);assert.equal(f.calls.length,1)}finally{f.dispose()}
})
test('WMZPN collector sends the documented POST through the injected budget and HOLDs missing keeper evidence',async()=>{
 const root=mkdtempSync(join(tmpdir(),'wm-source-')),directory=join(root,'capture'),candidate=POLAND_BULK_CANDIDATES.find(c=>c.slug==='pl-wm-4-liga'),calls=[]
 const schedule=readFileSync(new URL('./vzorci/pl-wmzpn-liga-4liga.html',import.meta.url)),report=readFileSync(new URL('./vzorci/pl-wmzpn-zapisnik-4liga.html',import.meta.url))
 try{await assert.rejects(()=>capturePolandCandidate(candidate,{directory,maxRequests:20,now:fixed,fetch:async(url,init)=>{calls.push({url:String(url),init});return new Response(init.method==='POST'?report:schedule)}}),e=>e.dataHold===true&&e.reason_code==='WMZPN_KEEPER_EVIDENCE_MISSING');assert.equal(calls.length,2);assert.equal(calls[1].url,'https://wmzpn.pl/wp-admin/admin-ajax.php');assert.equal(calls[1].init.method,'POST');assert.equal(new URLSearchParams(calls[1].init.body).get('action'),'match_history')}finally{rmSync(root,{recursive:true,force:true})}
})
test('candidate, bytes, freshness and missing/extra document replay fail closed without source access',async()=>{
 const f=setup();try{await capturePolandCandidate(f.candidate,{directory:f.directory,maxRequests:20,now:fixed,fetch:f.request});await assert.rejects(()=>loadPolandPack(f.directory,{candidate:{...f.candidate,id:999},now:fixed}),e=>e.dataHold===true);await assert.rejects(()=>loadPolandPack(f.directory,{candidate:f.candidate,now:new Date(fixed.getTime()+25*3600_000)}),e=>e.dataHold===true);const manifest=JSON.parse(readFileSync(join(f.directory,'manifest.json')));writeFileSync(join(f.directory,manifest.documents[0].file),'tampered');await assert.rejects(()=>loadPolandPack(f.directory,{candidate:f.candidate,now:fixed}),e=>e.dataHold===true)}finally{f.dispose()}
})
for(const mutation of [e=>e.events.host.squad[0]=null,e=>e.events.host.squad[0].substitutions[0]=null,e=>e.events.host.squad[0].substitutions[0].minute='unknown82'])test('malformed source individual facts are semantic HOLDs',async()=>{
 const e=JSON.parse(events);mutation(e);const f=setup();try{await assert.rejects(()=>capturePolandCandidate(f.candidate,{directory:f.directory,maxRequests:20,now:fixed,fetch:async(url,init)=>String(url).includes('/events.json')?new Response(JSON.stringify(e)):f.request(url,init)}),error=>error.dataHold===true)}finally{f.dispose()}
})
test('missing byte files and unexpected evidence files are semantic HOLDs',async()=>{
 const {unlinkSync}=await import('node:fs'),f=setup();try{await capturePolandCandidate(f.candidate,{directory:f.directory,maxRequests:20,now:fixed,fetch:f.request});writeFileSync(join(f.directory,'extra.json'),'{}');await assert.rejects(()=>loadPolandPack(f.directory,{candidate:f.candidate,now:fixed}),e=>e.dataHold===true);unlinkSync(join(f.directory,'extra.json'));const m=JSON.parse(readFileSync(join(f.directory,'manifest.json')));unlinkSync(join(f.directory,m.documents[0].file));await assert.rejects(()=>loadPolandPack(f.directory,{candidate:f.candidate,now:fixed}),e=>e.dataHold===true)}finally{f.dispose()}
})
