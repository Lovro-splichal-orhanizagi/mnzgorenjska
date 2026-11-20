// One-off SLF-595 audit preparation. Offline only; emits SELECT SQL, never executes it.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'

export const runs = new Map([['44506335462', 6], ['44612657248', 4]])
export function targetsFromReceipts(dir) {
  const receipts = fs.readdirSync(path.join(dir, 'receipts'))
    .filter(n => /^[a-f0-9]{64}\.json$/.test(n))
    .map(n => ({name:n, receipt:JSON.parse(fs.readFileSync(path.join(dir, 'receipts', n)))}))
  const targets = [], seen = new Set()
  for (const [runId, count] of runs) {
    const selected = receipts.filter(x => String(x.receipt.runId) === runId)
    assert.equal(selected.length, 1, `exactly one receipt required for ${runId}`)
    const {name, receipt} = selected[0]
    assert.equal(receipt.status, 'import-and-scoring-complete')
    assert.ok(!receipt.manualReview?.length, 'unexpected review holds')
    assert.equal(receipt.sha256 + '.json', name, 'receipt filename mismatch')
    const bytes = fs.readFileSync(path.join(dir, 'snapshots', name))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256, 'snapshot hash mismatch')
    const s = JSON.parse(bytes)
    assert.equal(s.schema, 2); assert.equal(s.mode, 'recurring'); assert.equal(s.source, 'hns')
    assert.equal(s.season, '2026/27')
    assert.ok(['pending','complete'].includes(s.status)); assert.equal(s.leagues.length, 139)
    assert.ok(s.leagues.every(l => l.finished === true), 'unfinished league')
    const batch = []
    for (const l of s.leagues) for (const r of l.reports) {
      const f = r.fixture
      assert.ok(Number.isSafeInteger(l.id) && l.id > 0)
      assert.match(l.slug, /^hr-[a-z0-9-]+$/); assert.match(l.code, /^\d+$/)
      assert.match(String(f.id), /^\d+$/); assert.ok(!seen.has(String(f.id)), 'duplicate report')
      assert.ok(Number.isSafeInteger(f.krog) && f.krog > 0)
      assert.match(f.datum, /^\d{4}-\d\d-\d\d$/)
      assert.equal(new Date(f.datum).toISOString().slice(0,10), f.datum)
      assert.ok(f.domaci && f.gostje)
      for (const side of ['domaci','gostje']) assert.ok(Number.isSafeInteger(f.izid?.[side]) && f.izid[side] >= 0)
      assert.match(r.capture.sha256, /^[a-f0-9]{64}$/)
      assert.equal(r.capture.url, `https://semafor.hns.family/utakmice/${f.id}/x/`)
      seen.add(String(f.id))
      batch.push({run_id:runId, snapshot:receipt.sha256, report_id:String(f.id), competition_id:l.id,
        slug:l.slug, source_code:l.code, round_number:f.krog, played_on:f.datum,
        home_name:f.domaci, away_name:f.gostje, home_goals:f.izid.domaci, away_goals:f.izid.gostje,
        capture_sha256:r.capture.sha256, fixture:f})
    }
    assert.equal(batch.length, count, `captured-report count differs from run ${runId}; inspect logs, do not widen selection`)
    targets.push(...batch)
  }
  return targets
}

export function auditSql(targets) {
  assert.equal(targets.length, 10)
  // Hex encoding keeps even quotes, backslashes and psql commands in source names inert.
  const hex = Buffer.from(JSON.stringify(targets)).toString('hex')
  return `\\set ON_ERROR_STOP on
begin isolation level repeatable read read only;
set local statement_timeout = '180s';
set local lock_timeout = '3s';
with expected as materialized (
 select * from jsonb_to_recordset(convert_from(decode('${hex}','hex'),'UTF8')::jsonb)
 as e(run_id text,snapshot text,report_id text,competition_id bigint,slug text,source_code text,
 round_number integer,played_on date,home_name text,away_name text,home_goals integer,away_goals integer,
 capture_sha256 text,fixture jsonb)
), native as materialized (
 select e.*,m.id match_id,m.round_id,m.imported_at,m.played_on native_date,
 m.home_goals native_home_goals,m.away_goals native_away_goals,m.home_team_id,m.away_team_id,
 ht.name native_home_name,at.name native_away_name,r.number native_round,r.season,
 r.competition_id native_competition_id,c.slug native_slug,c.source,c.source_league_code,
 m.import_warnings
 from expected e left join matches m on m.zapisnik_id=e.report_id
 left join rounds r on r.id=m.round_id left join competitions c on c.id=r.competition_id
 left join teams ht on ht.id=m.home_team_id left join teams at on at.id=m.away_team_id
), touched as materialized (
 select distinct r.id,r.played_on,
 (r.played_on is null or r.played_on>=current_date-okno_preracuna_tock()) eligible
 from rounds r join native n on n.round_id=r.id
), active as materialized (select id from touched where eligible),
 expected_player as materialized (
 select ap.round_id,ap.player_id,sum(ap.points) points
 from appearance_points ap join active r on r.id=ap.round_id group by ap.round_id,ap.player_id
), stored_player as materialized (
 select ps.round_id,ps.player_id,ps.points from player_scores ps join active r on r.id=ps.round_id
), player_check as materialized (
 select coalesce(e.round_id,s.round_id) round_id,coalesce(e.player_id,s.player_id) player_id,
 e.points expected,s.points stored,e.player_id is null missing_expected,s.player_id is null missing_stored,
 (e.player_id is null or s.player_id is null or e.points is distinct from s.points) mismatch
 from expected_player e full join stored_player s using(round_id,player_id)
), expected_fantasy as materialized (
 select f.fantasy_team_id,f.round_id,f.points,f.transfers,f.penalty
 from fantasy_round_points_izracun f join active r on r.id=f.round_id
), stored_fantasy as materialized (
 select f.fantasy_team_id,f.round_id,f.points,f.transfers,f.penalty
 from tocke_krogov f join active r on r.id=f.round_id
), fantasy_check as materialized (
 select coalesce(e.round_id,s.round_id) round_id,coalesce(e.fantasy_team_id,s.fantasy_team_id) fantasy_team_id,
 to_jsonb(e) expected,to_jsonb(s) stored,
 (e.fantasy_team_id is null or s.fantasy_team_id is null or
 (e.points,e.transfers,e.penalty) is distinct from (s.points,s.transfers,s.penalty)) mismatch
 from expected_fantasy e full join stored_fantasy s using(round_id,fantasy_team_id)
)
select jsonb_build_object(
 'checked_at',current_timestamp,'read_only',current_setting('transaction_read_only'),
 'scoring_window_days',okno_preracuna_tock(),'expected_reports',(select count(*) from expected),
 'found_matches',(select count(match_id) from native),
 'identity', (select jsonb_agg(to_jsonb(n)||jsonb_build_object('identity_mismatch',
   n.match_id is null or n.imported_at is null or
   (n.native_competition_id,n.native_slug,n.source,n.source_league_code,n.season,n.native_round,
    n.native_date,n.native_home_goals,n.native_away_goals) is distinct from
   (n.competition_id,n.slug,'hns'::text,n.source_code,'2026/27'::text,n.round_number,
    n.played_on,n.home_goals,n.away_goals),
   'team_names_require_review', (n.native_home_name,n.native_away_name) is distinct from (n.home_name,n.away_name)
 ) order by n.report_id) from native n),
 'appearances',(select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('reg_st',p.reg_st)
   order by a.match_id,a.player_id),'[]'::jsonb) from appearances a join native n on n.match_id=a.match_id
   left join players p on p.id=a.player_id),
 'goals',(select coalesce(jsonb_agg(to_jsonb(g)-'assist_confirmed_at' order by g.match_id,g.id),'[]'::jsonb)
   from goals g join native n on n.match_id=g.match_id),
 'prediction_counts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from
   (select n.match_id,count(p.match_id) count from native n left join napovedi p on p.match_id=n.match_id group by n.match_id) x),
 'round_policy',(select jsonb_agg(to_jsonb(t) order by id) from touched t),
 'player_rows',(select count(*) from player_check),
 'player_differences',(select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from player_check p where mismatch),
 'fantasy_rows',(select count(*) from fantasy_check),
 'fantasy_differences',(select coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) from fantasy_check f where mismatch)
);
rollback;
`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.equal(process.argv.length, 4, 'Usage: node generate-audit.mjs <receipts-and-snapshots-dir> <new-output-dir>')
  const targets = targetsFromReceipts(process.argv[2]), out = process.argv[3]
  fs.mkdirSync(out, {mode:0o700})
  fs.writeFileSync(path.join(out,'targets.json'),JSON.stringify(targets,null,2)+'\n',{mode:0o600,flag:'wx'})
  fs.writeFileSync(path.join(out,'audit.sql'),auditSql(targets),{mode:0o600,flag:'wx'})
  console.log('Prepared ten-report read-only audit. No database or source requests made.')
}
