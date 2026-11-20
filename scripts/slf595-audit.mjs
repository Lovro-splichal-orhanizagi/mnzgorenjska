// One-off SLF-595 audit: the ten Croatian reports imported by scheduled runs
// 44506335462 and 44612657248. Read only: parses the retained originals with
// the existing HNS parser, runs the QA-reviewed SELECT in a read-only
// transaction, and writes a summary without names or user ids (public repo).
// Usage: node scripts/slf595-audit.mjs <dir with receipts/ snapshots/ blobs/> <out-dir>
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {targetsFromReceipts,auditSql} from './slf595-generate-audit.mjs'
import {report} from './hns-recovery-validation.mjs'
import {recurringSchedule} from './hns-recurring-validation.mjs'
import {nastopi} from './viri/hns.mjs'
import {withBenchScorers,compareAppearances} from './slf595-audit-appearances.mjs'

const [dir,out]=process.argv.slice(2)
assert.ok(dir&&out,'Usage: node scripts/slf595-audit.mjs <evidence-dir> <out-dir>')
const blob=sha=>{
 assert.match(sha,/^[a-f0-9]{64}$/)
 const b=fs.readFileSync(path.join(dir,'blobs',`${sha}.html`))
 assert.equal(createHash('sha256').update(b).digest('hex'),sha,'captured body hash mismatch')
 return b.toString('utf8')
}
const snapshot=sha=>JSON.parse(fs.readFileSync(path.join(dir,'snapshots',`${sha}.json`),'utf8'))

const targets=targetsFromReceipts(dir)
if(process.argv[4]==='--blobs'){
 // Only the schedule and report originals the ten targets need.
 const need=new Set()
 for(const t of targets){
  const l=snapshot(t.snapshot).leagues.find(l=>l.id===t.competition_id)
  need.add(`${l.schedule.sha256}.html`);need.add(`${t.capture_sha256}.html`)
 }
 fs.writeFileSync(out,[...need].join('\n')+'\n')
 process.exit(0)
}

// Source side: same validation path as the replay, without network.
const source=new Map()
for(const t of targets){
 const l=snapshot(t.snapshot).leagues.find(l=>l.id===t.competition_id)
 const {fixtures,parentName}=recurringSchedule(blob(l.schedule.sha256),l.code)
 const f=fixtures.find(x=>x.id===t.fixture.id);assert.deepEqual(t.fixture,f,'fixture not in captured schedule')
 const {quality,z}=report(blob(t.capture_sha256),f,l.code,parentName);assert.ok(quality.complete)
 source.set(t.report_id,{z,...withBenchScorers(z,nastopi(z))})
}

// Database side: the QA-reviewed read-only SELECT.
fs.mkdirSync(out,{recursive:true,mode:0o700})
const sqlFile=path.join(out,'audit.sql');fs.writeFileSync(sqlFile,auditSql(targets),{mode:0o600})
const r=spawnSync('psql',['-X','-A','-t','-q','-f',sqlFile,process.env.SUPABASE_DB_URL],{encoding:'utf8',maxBuffer:64*1024*1024,timeout:200000})
if(r.status!==0){console.error((r.stderr||'').replace(/postgres(ql)?:\/\/\S+/g,'<db>'));throw Error(`psql exit ${r.status}`)}
const db=JSON.parse(r.stdout.split('\n').map(s=>s.trim()).find(s=>s.startsWith('{')))

const matches=[]
for(const n of db.identity){
 const s=source.get(n.report_id)
 const dbApps=db.appearances.filter(a=>a.match_id===n.match_id)
 const diffs=compareAppearances(s?.apps??[],dbApps,n.home_team_id,n.away_team_id)
 const dbGoals=db.goals.filter(g=>g.match_id===n.match_id),g=s?.z.goli??[]
 const goalSummary=list=>({total:list.length,own:list.filter(x=>x.is_own_goal??x.avtogol).length,pen:list.filter(x=>x.is_penalty??x.enajstmetrovka).length})
 matches.push({report_id:n.report_id,match_id:n.match_id,run_id:n.run_id,league:n.slug,round:n.native_round,date:n.native_date,
  score:`${n.native_home_goals}-${n.native_away_goals}`,source_score:`${n.home_goals}-${n.away_goals}`,
  identity_mismatch:n.identity_mismatch,team_names_require_review:n.team_names_require_review,import_warnings:n.import_warnings?.length??0,
  appearances:{raw_source:s?.rawCount??0,source:s?.apps.length??0,db:dbApps.length,bench_scorers:s?.bench,differences:diffs},
  goals:{source:goalSummary(g),db:goalSummary(dbGoals),equal:JSON.stringify(goalSummary(g))===JSON.stringify(goalSummary(dbGoals))},
  predictions:db.prediction_counts.find(p=>p.match_id===n.match_id)?.count??0})
}
const summary={checked_at:db.checked_at,read_only:db.read_only,scoring_window_days:db.scoring_window_days,
 expected_reports:db.expected_reports,found_matches:db.found_matches,matches,round_policy:db.round_policy,
 player_rows:db.player_rows,player_differences:db.player_differences.length,
 fantasy_rows:db.fantasy_rows,fantasy_differences:db.fantasy_differences.map(f=>({round_id:f.round_id,fantasy_team_id:f.fantasy_team_id}))}
summary.verdict=summary.read_only==='on'&&summary.expected_reports===10&&summary.found_matches===10&&
 matches.every(m=>!m.identity_mismatch&&!m.appearances.differences.length&&m.goals.equal)&&
 summary.player_differences===0&&summary.fantasy_differences.length===0?'pass':'review'
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n')
console.log(JSON.stringify({verdict:summary.verdict,found:summary.found_matches,player_rows:summary.player_rows,
 player_differences:summary.player_differences,fantasy_rows:summary.fantasy_rows,fantasy_differences:summary.fantasy_differences.length,
 appearance_differences:matches.reduce((n,m)=>n+m.appearances.differences.length,0),identity_mismatches:matches.filter(m=>m.identity_mismatch).length}))
