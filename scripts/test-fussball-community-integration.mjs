// Genuine retained bytes → native votes → strict replay → atomic scores.
// One disposable PostgreSQL session holds every fixture inside a rollback.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync,spawn} from 'node:child_process'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {stageAndReplayFussballCardReport,processFussballCardJob} from './fussball-community-runtime.mjs'

const quote=v=>`'${String(v).replaceAll("'","''")}'`
class Session{
 constructor(container){
  this.serial=0;this.buffer='';this.stderr='';this.pending=null
  this.child=spawn('docker',['exec','-i',container,'psql','-U','supabase_admin','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']})
  this.child.stdout.on('data',b=>{this.buffer+=b;this.flush()})
  this.child.stderr.on('data',b=>{this.stderr=(this.stderr+b).slice(-4000)})
  this.child.on('error',e=>this.pending?.reject(e))
  this.child.on('exit',code=>{this.exited=true;if(this.pending)this.pending.reject(Error(`disposable SQL exited ${code}: ${this.stderr}`))})
 }
 flush(){const p=this.pending;if(!p)return;const at=this.buffer.indexOf(p.marker+'\n');if(at<0)return;const out=this.buffer.slice(0,at).trim();this.buffer=this.buffer.slice(at+p.marker.length+1);clearTimeout(p.timer);this.pending=null;p.resolve(out)}
 query(sql){assert.equal(this.pending,null,'queries remain sequential');assert.ok(!this.exited,'session remains live');return new Promise((resolve,reject)=>{const marker=`CARD_TEST_END_${++this.serial}`;const timer=setTimeout(()=>{this.child.kill();reject(Error('disposable SQL query timed out'))},60000);this.pending={marker,resolve,reject:e=>{clearTimeout(timer);this.pending=null;reject(e)},timer};this.child.stdin.write(sql+`\n\\echo ${marker}\n`);this.flush()})}
 async close(){if(!this.exited){await this.query('rollback;');this.child.stdin.end('\\q\n')}}
}

test('genuine anonymous dismissal is held, corrected by native votes, and survives a repeated ordinary import',{skip:process.env.FUSSBALL_COMMUNITY_DISPOSABLE_TEST!=='1'},async()=>{
 const container=process.env.SUPABASE_DB_CONTAINER
 const owned=container==='slff-community-cards-20261027'
 const ci=container==='supabase_db_mnzgorenjska'&&process.env.CI==='true'&&process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_JOB==='varnost'&&process.env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'
 assert.ok(owned||ci,'explicit owned disposable database only')
 if(owned)assert.equal(execFileSync('docker',['inspect',container,'--format','{{index .Config.Labels "slff.test.owner"}}'],{encoding:'utf8'}).trim(),'community-cards-20261027')
 const read=f=>readFileSync(new URL('./vzorci/de-fussball-community/'+f,import.meta.url))
 const witness=JSON.parse(read('provenance.json')),html=read('report.html').toString()
 const fonts=Object.fromEntries(Object.entries(witness.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
 const parsed=razberiFantasyZapisnik(html,read('lineup.html').toString(),{fonts,id:witness.matchId,lineupId:witness.matchId,season:witness.season,cardPolicy:'community-v1'}),envelope=parsed.cardEnvelope
 assert.equal(parsed.statisticsPending,true)
 const red=envelope.cards.find(c=>c.type==='second_yellow'),yellow=envelope.cards.find(c=>c.type==='yellow'&&c.side===red.side&&c.ordinal<red.ordinal)
 const recipient=envelope.roster.find(p=>p.side===red.side&&!p.goalkeeper&&!p.starter&&!html.includes(p.sourceId.split('-').at(-1)))
 assert.ok(recipient&&yellow)
 const code='03188V27L800000JVS5489BTVU7GTVLE-G:2026/27',archive='02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26',uid='bcb00000-0000-4000-8000-000000000001'
 const session=new Session(container)
 try{
  await session.query(`begin;set local statement_timeout='45s';set local request.jwt.claim.role='service_role';create temporary table genuine_card_fixture(k text primary key,v jsonb);`)
  const setup=await session.query(`do $$declare cid bigint;home bigint;away bigint;rid bigint;mid bigint;pid bigint;p jsonb;reg bigint;candidates jsonb:='[]';e jsonb:=${quote(JSON.stringify(envelope))}::jsonb;begin
   insert into competitions(slug,name,short_name,country_id,source,source_league_code,active)values('de-card-genuine-fixture','Genuine card fixture','Genuine',(select id from countries where code='DE'),'fussball-public',${quote(code)},false)returning id into cid;
   insert into teams(name,country_id)values(e->>'homeName',(select id from countries where code='DE'))returning id into home;
   insert into teams(name,country_id)values(e->>'awayName',(select id from countries where code='DE'))returning id into away;
   insert into rounds(competition_id,season,number,played_on,deadline_at)values(cid,e->>'season',(e->>'round')::int,(e->>'date')::date,clock_timestamp()-interval'1 day')returning id into rid;
   insert into matches(round_id,home_team_id,away_team_id,played_on)values(rid,home,away,(e->>'date')::date)returning id into mid;
   for p in select value from jsonb_array_elements(e->'roster')loop
    select reg_st into reg from public.fussball_reserve_player_ids(array[p->>'sourceId']);
    insert into players(first_name,last_name,full_name,team_id,competition_id,reg_st,position,position_source,active,value,value_start)values('Fixture',p->>'name',p->>'name',case p->>'side' when'0'then home else away end,cid,reg,case when(p->>'goalkeeper')::boolean then'GK'else'DEF'end,'zapisnik',true,6,6)returning id into pid;
    candidates:=candidates||jsonb_build_array(jsonb_build_object('source_id',p->>'sourceId','player_id',pid,'team_id',case p->>'side'when'0'then home else away end));
   end loop;
   insert into auth.users(id,email,raw_user_meta_data)values(${quote(uid)},'genuine-card@example.invalid','{}');
   insert into profiles(id,display_name)values(${quote(uid)},'Genuine fixture')on conflict(id)do nothing;
   update profiles set insider_competition_id=cid where id=${quote(uid)};
   perform public.install_fussball_card_policy(cid,${quote(code)},array[${quote(archive)}]);
   insert into genuine_card_fixture values('scope',jsonb_build_object('cid',cid,'mid',mid,'rid',rid,'candidates',candidates));
  end$$;select v from genuine_card_fixture where k='scope';`)
  const scope=JSON.parse(setup),{cid,mid,candidates}=scope
  const db={rpc:async(name,args)=>{assert.match(name,/^[a-z_]+$/);const named=Object.entries(args).map(([k,v])=>{assert.match(k,/^p_[a-z_]+$/);let sql;if(Array.isArray(v)&&k==='p_warnings')sql=`array[${v.map(quote).join(',')}]::text[]`;else if(v&&typeof v==='object')sql=quote(JSON.stringify(v))+'::jsonb';else if(typeof v==='number')sql=String(v);else sql=v===null?'null':quote(v);return k+'=>'+sql});return {data:JSON.parse(await session.query(`reset role;set local request.jwt.claim.role='service_role';set local role service_role;select to_jsonb(public.${name}(${named.join(',')}));`))}}}
  const stage=()=>stageAndReplayFussballCardReport({db,competitionId:cid,code,matchId:mid,envelope,candidates})
  assert.equal((await stage()).status,'PENDING')
  const state=async()=>JSON.parse(await session.query(`reset role;select jsonb_build_object('status',statistics_status,'imported',imported_at is not null,'apps',(select count(*)from appearances where match_id=${mid}),'goals',(select count(*)from goals where match_id=${mid}))from matches where id=${mid};`))
  assert.deepEqual(await state(),{status:'pending_cards',imported:false,apps:0,goals:0})
  const vote=async event=>{const events=await db.rpc('match_fussball_card_votes',{p_match_id:mid});const e=events.data.events.find(c=>c.type===event.type&&c.minute===event.minute);assert.ok(e);const pid=candidates.find(p=>p.source_id===recipient.sourceId).player_id;await session.query(`reset role;set local request.jwt.claim.role='authenticated';set local request.jwt.claim.sub=${quote(uid)};set local role authenticated;select public.vote_fussball_card(${e.id},${pid});`)}
  await vote(red)
  const getJob=async()=>{const {data}=await db.rpc('get_fussball_card_replay_jobs',{p_competition_id:cid,p_code:code,p_limit:1,p_match_id:mid});assert.equal(data.length,1);return data[0]}
  assert.equal((await processFussballCardJob({db,competitionId:cid,code,job:await getJob()})).status,'HOLD','second yellow without preceding yellow remains editable and pending')
  assert.equal((await state()).apps,0)
  await vote(yellow)
  assert.equal((await processFussballCardJob({db,competitionId:cid,code,job:await getJob()})).status,'APPLIED')
  const resolved=await state();assert.equal(resolved.status,'available');assert.equal(resolved.imported,true);assert.ok(resolved.apps>=22);assert.equal(resolved.goals,envelope.score.domaci+envelope.score.gostje)
  const pid=candidates.find(p=>p.source_id===recipient.sourceId).player_id
  const dismissal=JSON.parse(await session.query(`reset role;select jsonb_build_object('minutes',minutes_played,'red',red_cards,'yellow',yellow_cards,'clock',red_card_minute)from appearances where match_id=${mid} and player_id=${pid};`))
  assert.deepEqual(dismissal,{minutes:0,red:1,yellow:1,clock:68})
  assert.equal((await stage()).status,'UNCHANGED','cached source import preserves confirmed recipients')
  assert.deepEqual(await state(),resolved)
 }finally{await session.close()}
})
