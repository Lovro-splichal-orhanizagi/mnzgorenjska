import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { parseDriblCatalog, parseDriblSchedule, parseDriblReport, verifyDriblReceipt } from './viri/dribl.mjs'
const dir = new URL('./vzorci/', import.meta.url)
const provenance = JSON.parse(readFileSync(new URL('au-dribl-provenance.json', dir)))
const scope = provenance.scope
const receipt = name => {
  const meta = provenance.responses.find(r => r.file === `au-dribl-${name}.json`)
  return { ...meta, bytes: readFileSync(new URL(meta.file, dir)) }
}
const bundle = (semi=true) => ({ match:receipt(semi?'match-1K3pRqqeGd':'match-vdWDwrrWym'),home:receipt(semi?'semi-home':'members-home'),away:receipt(semi?'semi-away':'members-away') })
const mutable = () => Object.fromEntries(Object.entries(bundle()).map(([k,r])=>[k,{...r,bytes:JSON.parse(r.bytes)}]))
const mutate = f => { const b=mutable(); f(b); return parseDriblReport(b,{scope}) }
const held = r => { assert.equal(r.reportStatistikaPripravljena,false);assert.equal(r.verdict,'HOLD'); assert.equal(r.appearances,null); assert.equal(r.goals,null);assert.equal(r.activationEligible,false) }

test('original response receipts retain exact bytes, hashes and ordinary public URLs',()=>{
 for(const m of provenance.responses){const b=readFileSync(new URL(m.file,dir));assert.equal(createHash('sha256').update(b).digest('hex'),m.sha256);assert.equal(verifyDriblReceipt({...m,bytes:b}).ok,true)}
})
test('actual current and archive season catalog never invents 2027',()=>{
 const r=parseDriblCatalog(receipt('seasons').bytes,{kind:'seasons',url:receipt('seasons').url,scope});assert.equal(r.verdict,'PASS');assert.deepEqual(r.rows.map(x=>x.name),['2022','2023','2024','2025','2026']);assert.equal(r.rows.at(-1).id,scope.season)
})
test('actual competition and league catalogs retain scope and two real league IDs',()=>{
 for(const [n,kind]of[['competitions-2026','competitions'],['leagues-npl','leagues']]){const r=receipt(n),p=parseDriblCatalog(r.bytes,{kind,url:r.url,scope});assert.equal(p.verdict,'PASS');assert.ok(p.rows.length>=2)}
 assert.deepEqual(parseDriblCatalog(receipt('leagues-npl').bytes,{kind:'leagues',url:receipt('leagues-npl').url,scope}).rows.map(r=>r.id),['bgdMjoBxmE','Bjmaxvo6dR'])
})
test('actual result page uses match_hash_id rather than result ID and holds incomplete pagination',()=>{
 const r=receipt('results-npl'),p=parseDriblSchedule(r.bytes,{url:r.url,scope});assert.equal(p.verdict,'HOLD');assert.equal(p.rows.length,30);assert.equal(p.rows[0].matchId,'vdWDwrrWym');assert.equal(p.rows[0].resultId,'vdWDwE46vm');assert.equal(p.complete,false);assert.ok(p.nextCursor);assert.ok(p.nextUrl.includes('season=wOmelzGd02'));assert.ok(p.nextUrl.includes('cursor='))
})
test('actual semifinal passes strict report reconciliation without changing bytes',()=>{
 const b=bundle(),r=parseDriblReport(b,{scope});assert.deepEqual(r.issues,[]);assert.equal(r.verdict,'PASS');assert.equal(r.reportStatistikaPripravljena,true);assert.equal(r.appearances.length,29);assert.equal(r.goals.length,4);assert.equal(r.cards.length,5);assert.equal(r.substitutions.length,7);assert.equal(r.activationEligible,false);assert.equal(r.sezonskiUvozPodprt,false)
 assert.deepEqual(r.header.score,{home:3,away:1});assert.equal(r.header.matchId,'1K3pRqqeGd');assert.equal(r.header.dateUtc,'2026-09-06T04:00:00Z')
})
test('actual final stays held for unlabelled home starting goalkeeper',()=>{
 const r=parseDriblReport(bundle(false),{scope});held(r);assert.ok(r.issues.some(x=>x.code==='STARTING_GK_MISSING'&&x.side==='home'));assert.equal(r.diagnostics.goals.length,4);assert.equal(r.diagnostics.substitutions.length,8)
})
test('explicit field role is GK evidence even when separate is_goalkeeper flag is false',()=>{
 const r=parseDriblReport(bundle(),{scope});const p=r.appearances.find(x=>x.name==='Adam Pavlesic');assert.equal(p.goalkeeper,true);assert.equal(p.positionEvidence,'field-role');assert.equal(p.minutes,90)
})
test('unused playing:true bench members do not become appearances',()=>{
 const r=parseDriblReport(bundle(),{scope});assert.equal(r.appearances.some(p=>p.name==='Anthony Tomelic'),false);assert.ok(r.diagnostics.teams.every(t=>t.players.length>=18));assert.equal(r.appearances.filter(p=>p.starter).length,22)
})
test('stable public profile IDs stay separate from goal member namespace',()=>{
 const r=parseDriblReport(bundle(),{scope});const g=r.goals.find(x=>x.name==='Mason Wells');assert.equal(g.profileId,'bd9XzXARK4');assert.ok(g.sourceMemberId);assert.notEqual(g.profileId,g.sourceMemberId);assert.ok(g.profileUrl.includes('memberprofile?m=bd9XzXARK4&season=wOmelzGd02'))
})
test('first half added time retains period and minute without leaking into second half interval',()=>{
 const r=parseDriblReport(bundle(),{scope});const c=r.cards.find(x=>x.name==='Jesse Piriz');assert.equal(c.minute,47);assert.equal(c.section,'ft-first-half');assert.equal(c.effectiveMinute,45);assert.equal(r.goals.find(x=>x.minute===93).effectiveMinute,90)
})
test('real halftime substitutions use minute45 rather than second half minute90',()=>{
 const r=parseDriblReport(bundle(false),{scope});const p=r.diagnostics.appearances.find(x=>x.name==='Jordan Segreto');assert.equal(p.from,45);assert.equal(p.minutes,45)
})
for(const [name,f,code] of [
 ['cross-season receipt',b=>b.match.bytes.data.attributes.season_hash_id='wrong','CONTEXT_MISMATCH'],
 ['hidden lineup',b=>b.match.bytes.data.attributes.hide_lineups=true,'REPORT_NOT_PUBLIC_COMPLETE'],
 ['unsubmitted matchsheet',b=>b.match.bytes.data.attributes.matchsheet_home_team_submitted=false,'REPORT_NOT_PUBLIC_COMPLETE'],
 ['missing goalkeeper role despite shirt1',b=>{let p=b.home.bytes.find(x=>x.first_name==='Adam');p.field_role=p.field_role_slug=p.field_role_group=null},'STARTING_GK_MISSING'],
 ['contradictory goalkeeper role',b=>{let p=b.home.bytes.find(x=>x.first_name==='Adam');p.field_role_group='defender'},'GK_ROLE_CONTRADICTION'],
 ['duplicate stable profile ID',b=>b.home.bytes.push({...b.home.bytes.find(x=>x.role_slug==='player'&&x.starting)}),'PLAYER_ID_DUPLICATE'],
 ['foreign roster team',b=>b.away.bytes.find(x=>x.role_slug==='player').team_hash_id=scope.tenant,'ROSTER_TEAM_MISMATCH'],
 ['missing nested goal',b=>b.home.bytes.find(x=>x.first_name==='Mason').goals=[],'EVENT_FLAG_MISMATCH'],
 ['unpaired nested substitution',b=>{let p=b.away.bytes.find(x=>x.first_name==='Charlie');p.in_subs=[];p.has_subs=false},'EVENT_RECONCILIATION'],
 ['ambiguous scorer name',b=>{let p=b.home.bytes.find(x=>x.first_name==='Koya');p.first_name='Mason';p.last_name='Wells'},'ACTOR_AMBIGUOUS'],
 ['unknown card kind',b=>b.match.bytes.data.attributes.match_events.find(x=>x.type==='card').final_card_type='Other Card','CARD_UNSUPPORTED'],
 ['score disagreement',b=>b.match.bytes.data.attributes.home_score=4,'SCORE_MISMATCH'],
 ['unsupported extra time',b=>b.match.bytes.data.attributes.game_progress='et-ft','DURATION_UNSUPPORTED'],
 ['missing events rather than asserting no events',b=>delete b.match.bytes.data.attributes.match_events,'EVENTS_MISSING'],
 ['inconsistent first-half clock',b=>b.match.bytes.data.attributes.match_events[0].game_section='unknown','CLOCK_UNSUPPORTED'],
 ['lineup missing starter',b=>b.home.bytes.find(x=>x.role_slug==='player'&&x.starting).starting=false,'STARTER_COUNT'],
 ['redirected receipt origin',b=>b.home.url=b.home.url.replace('mc-api.dribl.com','other.example'),'URL_SCOPE'],
]) test(`${name} holds report without publishable statistics`,()=>{const r=mutate(f);held(r);assert.ok(r.issues.some(x=>x.code===code),JSON.stringify(r.issues))})
test('receipt integrity rejects changed original bytes',()=>{const r=receipt('seasons');assert.equal(verifyDriblReceipt({...r,bytes:Buffer.concat([r.bytes,Buffer.from(' ')])}).ok,false)})
test('catalog URL context cannot silently switch tenant',()=>{const r=receipt('seasons');assert.equal(parseDriblCatalog(r.bytes,{kind:'seasons',url:r.url.replace(scope.tenant,'wrong'),scope}).verdict,'HOLD')})
test('parsing is pure and deterministic',()=>{const b=mutable(),before=JSON.stringify(b);assert.deepEqual(parseDriblReport(b,{scope}),parseDriblReport(b,{scope}));assert.equal(JSON.stringify(b),before)})
test('administrative away confirmation false is retained without replacing actual completeness checks',()=>{const r=parseDriblReport(bundle(),{scope});assert.equal(r.verdict,'PASS');assert.equal(r.diagnostics.matchsheet.awayConfirmed,false)})
test('contradictory half-time score holds even when full-time totals reconcile',()=>{const r=mutate(b=>b.match.bytes.data.attributes.home_score_ht=0);held(r);assert.ok(r.issues.some(x=>x.code==='HALF_TIME_SCORE_MISMATCH'))})
test('reordered timed events do not silently change event chronology',()=>{const r=mutate(b=>b.match.bytes.data.attributes.match_events.reverse());held(r);assert.ok(r.issues.some(x=>x.code==='EVENT_ORDER'))})
test('manifest CLI proves actual report offline and holds real incomplete report',async()=>{
 const {spawnSync}=await import('node:child_process');for(const [match,exit]of[['1K3pRqqeGd',0],['vdWDwrrWym',2]]){const r=spawnSync(process.execPath,['scripts/dribl-offline.mjs','--manifest','scripts/vzorci/au-dribl-provenance.json','--match',match],{encoding:'utf8'});assert.equal(r.status,exit,r.stderr);assert.equal(JSON.parse(r.stdout).reportStatistikaPripravljena,exit===0)}
})
test('malformed event entries hold with diagnostics instead of throwing',()=>{for(const f of [b=>b.match.bytes.data.attributes.match_events.push(null),b=>b.match.bytes.data.attributes.goals.push(null),b=>b.home.bytes.find(p=>p.role_slug==='player').goals.push(null)])assert.doesNotThrow(()=>held(mutate(f)))})
test('CLI rejects missing and remote manifests without attempting network access',async()=>{const {spawnSync}=await import('node:child_process');for(const args of [[],['--manifest','https://mc-api.dribl.com/api/results','--match','1K3pRqqeGd'],['--manifest','/missing-dribl.json','--match','1K3pRqqeGd']]){const r=spawnSync(process.execPath,['scripts/dribl-offline.mjs',...args],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(r.stdout,'')}})
test('actual All Fixtures page retains source IDs, explicit UTC ISO date and incomplete cursor',()=>{
 const r=receipt('fixtures-all-npl'),p=parseDriblSchedule(r.bytes,{url:r.url,scope});assert.equal(p.verdict,'HOLD');assert.equal(p.fullInventoryEvidence,true);assert.equal(p.complete,false);assert.equal(p.seasonComplete,false);assert.equal(p.rows.length,30);assert.equal(p.rows[0].resultId,'jmazBqBQVN');assert.equal(p.rows[0].matchId,'am14QJzLnd');assert.equal(p.rows[0].dateUtc,'2026-02-06T08:30:00Z');const next=new URL(p.nextUrl);assert.equal(next.pathname,'/api/fixtures');assert.equal(next.searchParams.get('date_range'),'all');for(const k of ['tenant','season','competition','league'])assert.equal(next.searchParams.get(k),scope[k]);assert.equal(next.searchParams.get('cursor'),p.nextCursor)
})
test('actual empty Upcoming Fixtures page cannot prove full inventory or season completion',()=>{
 const r=receipt('fixtures-upcoming-npl'),p=parseDriblSchedule(r.bytes,{url:r.url,scope});assert.equal(p.verdict,'HOLD');assert.equal(p.fullInventoryEvidence,false);assert.equal(p.complete,false);assert.equal(p.seasonComplete,false)
})
for(const extra of ['&include_all=1','&results=1','&date_range=default','&token=secret'])test(`All Fixtures rejects unobserved or duplicate query filter ${extra}`,()=>{const r=receipt('fixtures-all-npl'),p=parseDriblSchedule(r.bytes,{url:r.url+extra,scope});assert.equal(p.fullInventoryEvidence,false);assert.equal(p.verdict,'HOLD');assert.ok(p.issues.some(i=>['SCHEDULE_FILTER','URL_SCOPE'].includes(i.code)))})
test('report header retains actual source round fields without inventing a full-round label',()=>{const r=parseDriblReport(bundle(),{scope});assert.equal(r.header.round,2);assert.equal(r.header.displayRound,'F2');assert.equal(r.header.roundLabel,'Semi Finals');assert.equal(r.header.matchType,'finals');assert.equal(r.header.fullRound,null)})
test('raw half-period eligibility rejects a scorer whose clamped minute overlaps a later entry',()=>{
 const r=mutate(b=>{
  const a=b.match.bytes.data.attributes
  const sub=a.match_events.find(e=>e.type==='sub'&&e.in_name==='Tomislav Ozanic');sub.minute=45
  b.home.bytes.find(p=>p.first_name==='Tomislav').in_subs[0].minute='45';b.home.bytes.find(p=>p.first_name==='Julian').out_subs[0].minute='45'
  const goal=a.match_events.find(e=>e.type==='goal'&&e.name==='Tomislav Ozanic');goal.minute=47;goal.game_section='ft-first-half'
  for(const g of [b.home.bytes.find(p=>p.first_name==='Tomislav').goals[0],a.goals.find(g=>g.first_name==='Tomislav')]){g.minute=typeof g.minute==='string'?'47':47;g.game_section='ft-first-half'}
  a.home_score_ht=3
  a.match_events.sort((x,y)=>(x.game_section==='ft-second-half'?1000:0)+Number(x.minute)-((y.game_section==='ft-second-half'?1000:0)+Number(y.minute)))
 });held(r);assert.ok(r.issues.some(x=>x.code==='EVENT_OUTSIDE_INTERVAL'))
})
test('raw 90+N order rejects goal or card before a substitution although both clamp to90',()=>{
 for(const kind of ['goal','card']){const r=mutate(b=>{
  const a=b.match.bytes.data.attributes,p=b.home.bytes.find(p=>p.first_name==='Tomislav'),out=b.home.bytes.find(p=>p.first_name==='Julian')
  const sub=a.match_events.find(e=>e.type==='sub'&&e.in_name==='Tomislav Ozanic');sub.minute=94;p.in_subs[0].minute='94';out.out_subs[0].minute='94'
  if(kind==='card'){a.match_events.find(e=>e.type==='card'&&e.name==='Tomislav Ozanic').minute=93;p.cards[0].minute='93'}
  else{a.match_events.find(e=>e.type==='goal'&&e.name==='Tomislav Ozanic').minute=93;p.goals[0].minute='93'}
  a.match_events.sort((x,y)=>(x.game_section==='ft-second-half'?1000:0)+Number(x.minute)-((y.game_section==='ft-second-half'?1000:0)+Number(y.minute)))
 });held(r);assert.ok(r.issues.some(x=>x.code==='EVENT_OUTSIDE_INTERVAL'))}
})
test('substitution exit in first-half added time cannot precede its halftime entry',()=>{const r=mutate(b=>{const p=b.home.bytes.find(p=>p.first_name==='Tomislav');p.in_subs[0].minute='45';p.out_subs=[{minute:'47',game_section:'ft-first-half'}]});held(r);assert.ok(r.issues.some(x=>x.code==='INTERVAL_INVALID'))})
for(const extra of ['&season=foreign','&limit=1','&sort=-name','&disable_paging=false'])test(`league catalog refuses unobserved or duplicate filters ${extra}`,()=>{const r=receipt('leagues-npl'),p=parseDriblCatalog(r.bytes,{kind:'leagues',url:r.url+extra,scope});assert.equal(p.verdict,'HOLD');assert.equal(p.complete,false)})
