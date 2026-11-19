// Read-only evidence for the Croatian recurring import: receipts, collector
// heartbeat and the database state of the last 14 days. Never writes.
import fs from 'node:fs'
import path from 'node:path'
import {createClient} from '@supabase/supabase-js'
import {vseVrstice} from './strani.mjs'
const dir=process.argv[2],DNI=14,HOLD={matchId:58085,reportId:'114652522'}
const out={generatedAt:new Date().toISOString()}
const status=JSON.parse(fs.readFileSync(path.join(dir,'collector-status.json')))
out.collector={status:status.status,createdAt:status.createdAt,updatedAt:status.updatedAt,fields:Object.keys(status)}
const json=d=>fs.readdirSync(path.join(dir,d)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n))
const snapshots=json('snapshots'),receipts=json('receipts').map(n=>JSON.parse(fs.readFileSync(path.join(dir,'receipts',n))))
receipts.sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt))
const latest=receipts[0]
out.receipts={count:receipts.length,snapshots:snapshots.length,withoutReceipt:snapshots.filter(n=>!receipts.some(r=>r.sha256+'.json'===n)).length,
 latest:latest&&{snapshot:latest.sha256.slice(0,12),status:latest.status,runId:latest.runId,completedAt:latest.completedAt,manualReview:latest.manualReview}}
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const ok=({data,error})=>{if(error)throw Error(error.message);return data}
const comps=ok(await db.from('competitions').select('id,countries!inner(code)').eq('countries.code','HR'))
const rounds=await vseVrstice((a,b)=>db.from('rounds').select('id,competition_id').in('competition_id',comps.map(c=>c.id)).eq('season','2026/27').order('id').range(a,b))
const od=new Date(Date.now()-DNI*864e5).toISOString().slice(0,10),matches=[]
for(let i=0;i<rounds.length;i+=200)matches.push(...await vseVrstice((a,b)=>db.from('matches').select('id,zapisnik_id,imported_at,played_on').in('round_id',rounds.slice(i,i+200).map(r=>r.id)).gte('played_on',od).order('id').range(a,b)))
const count=async(t,ids)=>{const n=new Map();for(let i=0;i<ids.length;i+=200)for(const r of await vseVrstice((a,b)=>db.from(t).select('match_id').in('match_id',ids.slice(i,i+200)).order('match_id').order(t==='napovedi'?'user_id':'id').range(a,b)))n.set(r.match_id,(n.get(r.match_id)??0)+1);return n}
const imported=matches.filter(m=>m.imported_at),app=await count('appearances',imported.map(m=>m.id)),pred=await count('napovedi',matches.map(m=>m.id))
out.database={window:{from:od,days:DNI},hrCompetitions:comps.length,rounds:rounds.length,fixtures:matches.length,withReport:matches.filter(m=>m.zapisnik_id).length,imported:imported.length,
 importedWithoutAppearances:imported.filter(m=>!app.get(m.id)).length,appearances:[...app.values()].reduce((s,n)=>s+n,0),
 matchesWithPredictions:pred.size,predictions:[...pred.values()].reduce((s,n)=>s+n,0)}
const m=ok(await db.from('matches').select('id,zapisnik_id,played_on,home_goals,away_goals,imported_at').eq('id',HOLD.matchId).maybeSingle())
out.hold={...HOLD,match:m,appearances:(await count('appearances',[HOLD.matchId])).get(HOLD.matchId)??0,predictions:(await count('napovedi',[HOLD.matchId])).get(HOLD.matchId)??0,
 inLatestReceipt:!!latest?.manualReview?.some(h=>h.matchId===HOLD.matchId&&h.reportId===HOLD.reportId)}
console.log(JSON.stringify(out,null,2))
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### HNS evidence (read-only)\n\n```json\n'+JSON.stringify(out,null,2)+'\n```\n')
