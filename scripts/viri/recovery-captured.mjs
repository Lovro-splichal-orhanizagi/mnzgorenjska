// Incident-only source adapter. Reads immutable local originals; no network fallback.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import hns from './hns.mjs'
import pzpn,{vZapisnik,popolnZapisnik,POSREDNIKI} from './pzpn.mjs'
import {schedule,report} from '../hns-recovery-validation.mjs'
import {LEAGUES,scheduleUrl,selectMatches} from '../pzpn-collect-recovery.mjs'
const hash=b=>createHash('sha256').update(b).digest('hex')
const noNetwork=()=>{throw Error('recovery snapshot: network access is disabled')}
export function loadRecovery(directory,source){
 assert.ok(['hns','pzpn'].includes(source))
 const file=path.join(directory,source==='hns'?'latest.json':'snapshot.json'),s=JSON.parse(fs.readFileSync(file,'utf8'))
 assert.equal(s.source,source);assert.ok(Array.isArray(s.leagues));assert.equal(new Set(s.leagues.map(l=>l.id)).size,s.leagues.length)
 const from=source==='hns'?s.fromDate:s.config.from,to=source==='hns'?s.throughDate:s.config.through
 assert.equal(from,'2026-11-06');assert.equal(to,'2026-11-17')
 if(source==='hns'){assert.equal(s.schema,1);assert.equal(s.incident,'hns-20261117');assert.equal(s.season,'2026/27')}
 return s
}
export function createRecoverySource({competition:c,directory,source=c.source,db}){
 assert.ok(['hns','pzpn'].includes(source)&&c.source===source&&c.active===true&&c.source_policy==null,'active source with no historical policy required')
 assert.equal(c.country_code??c.countries?.code,source==='hns'?'HR':'PL')
 const s=loadRecovery(directory,source),l=s.leagues.find(l=>l.id===c.id)
 assert.ok(l&&l.slug===c.slug&&l.code===c.source_league_code,'live league tuple differs from capture')
 if(source==='pzpn')assert.ok(LEAGUES.some(x=>x.id===l.id&&x.slug===l.slug&&x.code===l.code))
 else assert.match(l.code,/^\d+$/)
 const bytes=(entry,kind)=>{
  assert.match(entry.sha256,/^[a-f0-9]{64}$/)
  const age=Date.now()-Date.parse(entry.capturedAt);assert.ok(Number.isFinite(age)&&age>=-60000&&age<7*86400000,'capture expired')
  const relative=source==='hns'?`blobs/${entry.sha256}.html`:`raw/${entry.sha256}.json`
  if(source==='pzpn')assert.equal(entry.path,relative)
  const b=fs.readFileSync(path.join(directory,relative));assert.ok(b.length<=8*1024*1024);assert.equal(hash(b),entry.sha256,'captured body hash mismatch')
  return kind==='json'?JSON.parse(b.toString('utf8')):b.toString('utf8')
 }
 const records=[]
 if(source==='hns'){
  assert.equal(l.schedule.url,`https://semafor.hns.family/natjecanja/${l.code}/x/`)
  const fixtures=schedule(bytes(l.schedule))
  for(const r of l.reports){
   const f=fixtures.find(x=>x.id===r.fixture.id);assert.deepEqual(r.fixture,f,'fixture not in captured schedule')
   assert.ok(f.datum>=s.fromDate&&f.datum<=s.throughDate&&f.izid)
   const url=`https://semafor.hns.family/utakmice/${f.id}/x/`;assert.equal(r.capture.url,url)
   const {quality,z}=report(bytes(r.capture),f,l.code);assert.ok(quality.complete,'incomplete report cannot be imported')
   records.push({id:z.zapisnikId,z,url})
  }
 }else{
  const fixtures=new Map()
  for(const e of l.schedules){assert.equal(e.capture.url,scheduleUrl(l.code,e.type));const data=bytes(e.capture,'json');assert.equal(data.success,true);assert.equal(data.count,data.data.length);assert.equal(data.page,1);for(const f of data.data)fixtures.set(f.id,f)}
  const selected=selectMatches([...fixtures.values()],s.config.from,s.config.through,new Set(l.skippedCompleteIds))
  for(const r of l.reports.filter(r=>r.status==='complete')){
   const f=selected.find(x=>x.id===r.id);assert.deepEqual(r.match,f,'fixture not in captured schedules')
   const url=pzpn.naslovZapisnika(l.code,r.id);assert.equal(r.capture.url,url)
   const data=bytes(r.capture,'json');assert.equal(data.success,true);assert.ok(popolnZapisnik(data));const z=vZapisnik(f,data)
   assert.ok(z&&!z.nepopoln&&!z.prazen&&!z.opozorila.length);assert.ok([z.domaci,z.gostje].every(x=>x.postava.length===11&&x.postava.filter(p=>p.vratar).length===1))
   const appearances=pzpn.nastopi(z);assert.ok(appearances.every(p=>Number.isFinite(p.minute)&&p.minute>=0&&p.minute<=90&&p.regSt!==null))
   assert.ok([0,1].every(i=>{const minutes=appearances.filter(p=>p.ekipaIdx===i).reduce((n,p)=>n+p.minute,0);return minutes>0&&minutes<=990}))
   z.url=POSREDNIKI.swietokrzyski.stran
   records.push({id:z.zapisnikId,z,url:z.url})
  }
 }
 for(const r of records){assert.equal(r.z.sezona,'2026/27');assert.ok(Number.isSafeInteger(r.z.krog)&&r.z.krog>0,'positive source round required')}
 assert.equal(new Set(records.map(r=>r.id)).size,records.length,'duplicate report')
 const base=source==='hns'?hns:pzpn
 return {...base,recoveryCaptured:true,recoveryReportIds:records.map(r=>String(r.id)),assertNativeFixture:scope=>assertRecoveryFixture(db,scope),recoveryRounds:[...new Set(records.map(r=>r.z.krog))],fetch:noNetwork,razporedVseStrani:noNetwork,async zapisniki(code){
  assert.equal(code,l.code)
  return await missingRecoveryRecords(records,c,db,base.kljucKluba)
 }}
}

export async function missingRecoveryRecords(records,c,db,key){
  const completed=new Set()
  if(db)for(let start=0;start<records.length;start+=100){
   const chunk=records.slice(start,start+100),ids=chunk.map(r=>String(r.id))
   const {data,error}=await db.from('matches').select('id,zapisnik_id,imported_at,played_on,home:teams!home_team_id(id,name),away:teams!away_team_id(id,name),rounds!inner(competition_id,season,number)').in('zapisnik_id',ids)
   if(error)throw Error('completed report lookup failed: '+error.message)
   for(const m of data){const r=chunk.find(r=>String(r.id)===String(m.zapisnik_id));assert.ok(r);assert.equal(m.rounds.competition_id,c.id);assert.equal(m.rounds.season,'2026/27');assert.equal(m.rounds.number,r.z.krog);assert.equal(m.played_on,r.z.datum);if(key){assert.equal(key(m.home.name),key(r.z.domaci.ime));assert.equal(key(m.away.name),key(r.z.gostje.ime))}if(m.imported_at)completed.add(String(r.id))}
  }
  return structuredClone(records.filter(r=>!completed.has(String(r.id))))
}

export async function assertRecoveryFixture(db,{id,roundId,homeTeamId,awayTeamId}){
 assert.ok(db,'native writer database required')
 const {data:existing,error}=await db.from('matches').select('id,zapisnik_id,imported_at').eq('round_id',roundId).eq('home_team_id',homeTeamId).eq('away_team_id',awayTeamId).maybeSingle()
 if(error)throw error
 assert.ok(!existing?.zapisnik_id||String(existing.zapisnik_id)===String(id),'existing native fixture owns another report')
 return !existing?.imported_at
}
