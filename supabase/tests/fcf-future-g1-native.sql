-- Synthetic G1 SQL contract fixtures; no current source/launch authority.
create temporary table g9_before as select private_fcf_future_target_release.g9_image()image;
update rounds set deadline_at='2026-10-23T12:00Z',lineups_locked_at='2026-10-23T12:01Z'where competition_id=783 and number=6;
update rounds set deadline_at='2026-10-23T12:00Z'where competition_id=783 and deadline_at is null;
-- Rehashed cross-target and ledger mutants must reject without effects.
create function pg_temp.g1_reject(v jsonb,label text)returns void language plpgsql as $$declare before_image jsonb;begin
 before_image:=jsonb_build_object('g1',private_historical_statistics.state_sha256(783),'g9',private_fcf_future_target_release.g9_image());
 begin perform public.fcf_future_current_target_import(v::text,encode(sha256(convert_to(v::text,'UTF8')),'hex'));raise exception 'G1 TEST: accepted %',label;
 exception when others then if sqlerrm not like 'FCF_TARGET:%'and sqlerrm not like 'HISTORICAL_POLICY:%'then raise;end if;end;
 perform pg_temp.six_assert(before_image=jsonb_build_object('g1',private_historical_statistics.state_sha256(783),'g9',private_fcf_future_target_release.g9_image())and not exists(select 1 from private_fcf_future_target_release.receipts where competition_id=783),'rejected G1 import has no effects: '||label);
end$$;
create function pg_temp.g1_packet(v jsonb,path text[],value jsonb)returns jsonb language plpgsql as $$declare p text;begin p:=jsonb_set((v->>'targetPacketText')::jsonb,path,value)::text;return v||jsonb_build_object('targetPacketText',p,'targetPacketSha256',encode(sha256(convert_to(p,'UTF8')),'hex'));end$$;
select pg_temp.g1_reject(rollout||'{"targetSlug":"es-ct-tercera-g9"}','G1 source through G9 writer')from fcf_target_packets;
select pg_temp.g1_reject(pg_temp.g1_packet(rollout,array['target','competitionId'],'797'),'G1 packet native cid797')from fcf_target_packets;
select pg_temp.g1_reject(jsonb_set(rollout,'{inventoryBinding,protocol}','"future-g9-after-six-v1"'),'old G9 proof in G1')from fcf_target_packets;
select pg_temp.g1_reject(jsonb_set(rollout,'{inventoryBinding,accountingBinding,priorSourceGETs}','239'),'over478 cap')from fcf_target_packets;
-- A synthetic saved G9 receipt is forbidden even while its competition is inactive.
do $$declare v jsonb;begin select rollout into v from fcf_target_packets;
 begin insert into private_fcf_future_target_release.receipts(competition_id,inventory_key,packet_sha256,packet_text,rollout_text,rollout_sha256,source_fingerprint,cleanup_before_sha256,imported_state_sha256,stage)values(797,'TEST ONLY forbidden G9 receipt',repeat('a',64),'{}','{}',repeat('a',64),repeat('a',64),repeat('a',64),repeat('a',64),'imported');perform pg_temp.g1_reject(v,'unexpected G9 import receipt');raise exception 'ROLLBACK G9 RECEIPT';exception when others then if sqlerrm<>'ROLLBACK G9 RECEIPT'then raise;end if;end;
end$$;
-- Real service_role execution composes with admin-owned private internals.
grant select on fcf_target_packets to service_role;
set local role service_role;
select public.fcf_future_current_target_import(rollout::text,encode(sha256(convert_to(rollout::text,'UTF8')),'hex'))from fcf_target_packets;
reset role;
-- Intentional reprice after import: old imported_state_sha256 must NOT gate this.
with ranked as(select id,row_number()over(partition by team_id order by id)n from players where competition_id=783)update players p set position=case when p.position='GK'then'GK'else case r.n%3 when 0 then'DEF'when 1 then'MID'else'FWD'end end,value=case when r.n=3 then 9 else 4 end,value_start=case when r.n=3 then 9 else 4 end from ranked r where p.id=r.id;
do $$declare r bigint;begin for r in select id from rounds where competition_id=783 loop perform recompute_round_scores(r);end loop;perform osvezi_statistiko_igralcev(array(select id from players where competition_id=783));end$$;
create temporary table activation_squad(id bigint primary key,team bigint,position text);
do $$declare pos text;n int;i int;pid bigint;begin
 for pos,n in select *from(values('GK',2),('DEF',5),('MID',5),('FWD',3))q loop
  for i in 1..n loop select p.id into pid from players p where competition_id=783 and active and p.position=pos and not exists(select 1 from activation_squad where id=p.id)and(select count(*)from activation_squad where team=p.team_id)<3 order by value,id limit 1;perform pg_temp.six_assert(pid is not null,'synthetic legal15 player');insert into activation_squad select id,team_id,position from players where id=pid;end loop;
 end loop;
end$$;
create temporary table activation_packet(a jsonb);
create temporary table activation_pure_control(proof jsonb);
-- Freeze the ACTUAL private SQL projection after import+prices; only the fixed
-- known R7 choice is constructed. SQL must derive the same choice independently.
do $$declare v jsonb;p jsonb;mp jsonb;proj jsonb;native jsonb;launch jsonb;proposal jsonb;ready jsonb;a jsonb;ks text[];cid bigint;rid bigint;rec private_fcf_future_target_release.receipts%rowtype;begin
 select rollout into v from fcf_target_packets;p:=(v->>'targetPacketText')::jsonb;mp:=(v#>>'{identityPlan,mappingText}')::jsonb;select country_id into cid from competitions where id=783;
 select array_agg(distinct k order by k)into ks from(select public.anonimizacijski_kljuc(cid||'|reg|'||(actor->>'regSt'))k from jsonb_array_elements(p#>'{target,fixtures}')f cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else'[]'end)actor union select public.anonimizacijski_kljuc(cid||'|'||(actor->>'ime'))from jsonb_array_elements(p#>'{target,fixtures}')f cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else'[]'end)actor)s;
 proj:=private_fcf_future_projection.capture('es-ct-segona-g1',ks);native:=proj->'native';select *into rec from private_fcf_future_target_release.receipts where competition_id=783;select id into rid from rounds where competition_id=783 and number=7;
 launch:=jsonb_build_object('targetSlug','es-ct-segona-g1','competitionId',783,'sourceCode','4109388-4109627','season','2026/27','sourceFingerprintSha256',rec.source_fingerprint,'writerCommit',repeat('f',40),'fixtures',(select jsonb_agg(f order by f->>'id')from jsonb_array_elements(p#>'{target,fixtures}')f),'mapping',(select jsonb_agg(m order by m->>'sourceMatchId')from jsonb_array_elements(mp->'fixtures')m),'native',native);
 proposal:=jsonb_build_object('schemaVersion',1,'kind','fcf-future-launch-proposal','targetSlug','es-ct-segona-g1','competitionId',783,'season','2026/27','sourceCode','4109388-4109627','sourceFingerprintSha256',rec.source_fingerprint,'writerCommit',repeat('f',40),'projectionSha256',encode(sha256(convert_to(private_fcf_future_import.canonical_json(launch),'UTF8')),'hex'),'roundNumber',7,'roundId',rid,'firstFantasyPlayedOn','2027-05-01','timeZone','Europe/Madrid','earliestKickoffUTC','2027-05-01T14:00:00.000Z','deadlineUTC','2027-05-01T08:00:00.000Z','fixtureIds',(select jsonb_agg(f->>'id'order by f->>'id')from jsonb_array_elements(p#>'{target,fixtures}')f where f->>'round'='7'),'matchIds',(select jsonb_agg((m->>'matchId')::bigint order by(m->>'matchId')::bigint)from jsonb_array_elements(mp->'fixtures')m where m->>'sourceRound'='7'));
 ready:=jsonb_build_object('modelSha256',repeat('e',64),'pricingSnapshotText',proj#>>'{pricingSnapshot,snapshotText}','pricingSnapshotSha256',proj#>>'{pricingSnapshot,snapshotSha256}','priceVector',(select jsonb_agg(jsonb_build_object('id',id,'value',value,'value_start',value_start,'position',position,'position_source',position_source)order by id)from players where competition_id=783),'squad',(select jsonb_agg(jsonb_build_object('id',id)order by id)from activation_squad),'cheapestLegal15',public.najcenejsi_kader(public.stanje_lige(783)->'igralci'),'launchProposal',proposal);
 a:=jsonb_build_object('schemaVersion',4,'kind','fcf-future-current-target-activation','targetSlug','es-ct-segona-g1','sourceCommit',repeat('f',40),'execution',jsonb_build_object('repository','Lovro-splichal-orhanizagi/mnzgorenjska','ref','refs/heads/main','commit',repeat('f',40),'runId','900','runAttempt','1'),'importReceiptId',rec.id::text,'importRolloutText',rec.rollout_text,'importRolloutSha256',rec.rollout_sha256,'nativeSnapshotText',proj->>'dependencySnapshotText','nativeSnapshotSha256',proj->>'dependencySnapshotSha256','launchProposal',proposal,'readiness',ready,'auditedUTC',clock_timestamp());insert into activation_packet values(a);insert into activation_pure_control values(jsonb_build_object('launchInput',launch||jsonb_build_object('now',(extract(epoch from clock_timestamp())*1000)::bigint),'proposal',proposal));
end$$;
select 'G1_SYNTHETIC_PROJECTION:'||proof::text from activation_pure_control;
create function pg_temp.activation_gate(activate boolean default false)returns jsonb language plpgsql as $$declare t text;begin select a::text into t from activation_packet;return public.fcf_future_current_target_check(t,encode(sha256(convert_to(t,'UTF8')),'hex'),activate);end$$;
create temporary table activation_before as select private_historical_statistics.state_sha256(783)state,(select to_jsonb(r)from private_fcf_future_target_release.receipts r where competition_id=783)receipt,(select to_jsonb(r)from private_fcf_future_history.cleanup_receipt r where singleton)cleanup;
-- The imported readonly receipt retains exactly its original fifteen fields.
savepoint imported_readonly_receipt;
set local transaction_read_only=on;
select pg_temp.six_assert(private_fcf_future_import.keys(public.fcf_future_current_target_receipt('es-ct-segona-g1'),array['id','competition_id','inventory_key','packet_sha256','source_fingerprint','cleanup_before_sha256','imported_state_sha256','stage','activation_result','created_at','rolloutText','rolloutSha256','currentActive','currentStateSha256','canonicalVerified'])and not(public.fcf_future_current_target_receipt('es-ct-segona-g1')?'currentActivationAfterImage'),'imported receipt exact15fields unchanged');
rollback to savepoint imported_readonly_receipt;
grant select on activation_packet to service_role;grant execute on function pg_temp.activation_gate(boolean),pg_temp.six_assert(boolean,text)to service_role;
set local role service_role;
select pg_temp.six_assert(pg_temp.activation_gate()->>'stage'='checked','actual future7 check after repricing passes');
reset role;
select pg_temp.six_assert(private_historical_statistics.state_sha256(783)=(select state from activation_before)and(select to_jsonb(r)from private_fcf_future_target_release.receipts r where competition_id=783)=(select receipt from activation_before),'check has no persistent mutations');
-- Each source/native/dependency mutation is a real subtransaction. Failure
-- rolls back both the mutant and all attempted activation effects.
create function pg_temp.activation_mutant(command text,label text)returns void language plpgsql as $$declare before_state jsonb;begin
 before_state:=private_fcf_future_activation.after_image(783);
 begin execute command;perform pg_temp.activation_gate(true);raise exception 'FUTURE ACTIVATION TEST: accepted %',label;
 exception when others then if sqlerrm not like 'FCF_TARGET:%'and sqlerrm not like 'HISTORICAL_POLICY:%'then raise;end if;end;
 perform pg_temp.six_assert(private_fcf_future_activation.after_image(783)=before_state and(select stage='imported'and activation_result is null from private_fcf_future_target_release.receipts where competition_id=783),'rejected activation preserves exact native/price/policy/cleanup and receipt');
end$$;
-- Reauthenticate CURRENT SQL snapshot/vector after semantic pricing mutants,
-- retaining the same frozen source/round/proposal. These must reach real gates.
create function pg_temp.g1_refresh_prices()returns void language plpgsql as $$declare a0 jsonb;projection jsonb;ks text[];begin
 select a into a0 from activation_packet;select array_agg(k)into ks from jsonb_array_elements_text((a0->>'nativeSnapshotText')::jsonb#>'{privacy,checkedKeys}')k;
 projection:=private_fcf_future_projection.capture('es-ct-segona-g1',ks);
 a0:=a0||jsonb_build_object('nativeSnapshotText',projection->>'dependencySnapshotText','nativeSnapshotSha256',projection->>'dependencySnapshotSha256');
 a0:=jsonb_set(a0,'{readiness,pricingSnapshotText}',projection#>'{pricingSnapshot,snapshotText}');a0:=jsonb_set(a0,'{readiness,pricingSnapshotSha256}',projection#>'{pricingSnapshot,snapshotSha256}');
 a0:=jsonb_set(a0,'{readiness,priceVector}',(select jsonb_agg(jsonb_build_object('id',id,'value',value,'value_start',value_start,'position',position,'position_source',position_source)order by id)from players where competition_id=783));update activation_packet set a=a0;
end$$;
select pg_temp.activation_mutant('update players set position=''DEF'',position_source=''ugibanje''where competition_id=783 and position=''GK'';select pg_temp.g1_refresh_prices()','same-snapshot missing official GK');
select pg_temp.activation_mutant('update players set value=20,value_start=20 where competition_id=783;select pg_temp.g1_refresh_prices()','same-snapshot legal15 exceeds100');
select pg_temp.activation_mutant('update players set value=4.5,value_start=4.5 where competition_id=783;select pg_temp.g1_refresh_prices()','same-snapshot flat default prices');
create function pg_temp.g1_bad_club_squad()returns void language plpgsql as $$declare squad jsonb;begin
 with ranked as(select id,team_id,position,row_number()over(partition by position order by team_id,id)n from players where competition_id=783 and active),chosen as(select r.*from ranked r join(values('GK',2),('DEF',5),('MID',5),('FWD',3))q(position,total)using(position)where r.n<=q.total)select jsonb_agg(jsonb_build_object('id',id)order by id)into squad from chosen;
 perform pg_temp.six_assert(jsonb_array_length(squad)=15 and exists(select team_id from players where id in(select(x->>'id')::bigint from jsonb_array_elements(squad)x)group by team_id having count(*)>3),'synthetic squad exact15/quotas but exceeds three per club');update activation_packet set a=jsonb_set(a,'{readiness,squad}',squad);
end$$;
select pg_temp.activation_mutant('select pg_temp.g1_bad_club_squad()','unique15/quotas violates max3club');
select pg_temp.activation_mutant('update activation_packet set a=jsonb_set(a,''{readiness,squad}'',(a#>''{readiness,squad}'')||jsonb_build_array(a#>''{readiness,squad,0}''))','illegal16/duplicate squad');
select pg_temp.activation_mutant('insert into appearances(match_id,player_id,team_id,started,minutes_played)select 321663,id,8575,true,90 from players where competition_id=783 and team_id=8575 order by id limit 1','unknown4109404 header-only forbids individual statistics');
select pg_temp.activation_mutant('update players set anonimiziran_at=clock_timestamp(),anonimiziran_razlog=''ugovor''where id=(select min(id)from players where competition_id=783)','privacy hold');
select pg_temp.activation_mutant('update activation_packet set a=jsonb_set(a,''{schemaVersion}'',''"4"'')','typed numeric schema version');
select pg_temp.activation_mutant('update activation_packet set a=jsonb_set(a,''{nativeSnapshotText}'',(a->>''nativeSnapshotText'')::jsonb)','SQL snapshot must remain opaque TEXT');
select pg_temp.activation_mutant('update players set value=value+0.5 where id=(select min(id)from players where competition_id=783)','price drift');
select pg_temp.activation_mutant('update players set position=''DEF'',position_source=''admin''where competition_id=783 and position=''GK''','official goalkeeper drift');
select pg_temp.activation_mutant('update goals set minute=minute+1 where id=(select min(g.id)from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=783)','goal canonical drift');
select pg_temp.activation_mutant('update matches set played_on=played_on+1 where id=(select min(m.id)from matches m join rounds r on r.id=m.round_id where r.competition_id=783 and r.number=7)','source/native date drift');
select pg_temp.activation_mutant('update rounds set lineups_locked_at=clock_timestamp()where competition_id=783 and number=7','selected lock');
select pg_temp.activation_mutant('update rounds set deadline_at=clock_timestamp()-interval''1 minute''where competition_id=783 and number=7','expired selected native deadline');
select pg_temp.activation_mutant('create table public.future_activation_unknown(player_id bigint)','unknown dependency catalog');
select pg_temp.activation_mutant('insert into auth.users(id,email)values(''11111111-1111-4111-8111-111111111111'',''future-activation@example.invalid'');insert into fantasy_teams(owner_id,name,competition_id)values(''11111111-1111-4111-8111-111111111111'',''Synthetic activation user'',783)','target user');
select pg_temp.activation_mutant('update activation_packet set a=jsonb_set(a,''{importRolloutText}'',to_jsonb(a->>''importRolloutText''||'' ''))','changed source/cleanup/import approval');
select pg_temp.activation_mutant('update activation_packet set a=jsonb_set(a,''{launchProposal,roundNumber}'',''8'')','frozen proposal cannot fall forward');
-- At expiry all original captures remain within the provider1h maximum.
-- Exercise actual Madrid ambiguity/nonexistence, without manufacturing source
-- authority for a changed saved rollout. Only temp source rows change here.
do $$declare rows jsonb;begin
 begin update pg_temp._fcf_expected set f=f||'{"date":"2026-10-25","time":"02:30"}'::jsonb where rn=7;perform private_fcf_future_activation.official_clock(7);raise exception 'FUTURE ACTIVATION TEST: accepted ambiguous Madrid';exception when others then if sqlerrm<>'FCF_TARGET: ambiguous/nonexistent Madrid kickoff'then raise;end if;end;
 begin update pg_temp._fcf_expected set f=f||'{"date":"2027-03-28","time":"02:30"}'::jsonb where rn=7;perform private_fcf_future_activation.official_clock(7);raise exception 'FUTURE ACTIVATION TEST: accepted nonexistent Madrid';exception when others then if sqlerrm<>'FCF_TARGET: ambiguous/nonexistent Madrid kickoff'then raise;end if;end;
end$$;
select pg_temp.six_assert(not has_function_privilege('anon','public.fcf_future_current_target_check(text,text,boolean)','execute')and not has_function_privilege('authenticated','public.fcf_future_current_target_check(text,text,boolean)','execute')and has_function_privilege('service_role','public.fcf_future_current_target_check(text,text,boolean)','execute'),'service-only activation ACL');
set local role service_role;
select pg_temp.six_assert(pg_temp.activation_gate(true)->>'active'='true','same-TX future opening activation');
reset role;
select pg_temp.six_assert((select active and prvi_fantasy_krog=7 from competitions where id=783)and(select deadline_at='2027-05-01T08:00Z'and lineups_locked_at is null from rounds where competition_id=783 and number=7)and(select first_fantasy_played_on='2027-05-01'from private_historical_statistics.installed_policies where competition_id=783),'exact intended active opening/policy/deadline');
select pg_temp.six_assert((select deadline_at='2026-10-23T12:00Z'and lineups_locked_at='2026-10-23T12:01Z'from rounds where competition_id=783 and number=6),'expired R6 remains closed');
select pg_temp.six_assert(pg_temp.activation_gate(true)->>'readbackOnly'='true','exact activated retry is explicit readback only');
select pg_temp.six_assert((select to_jsonb(r)from private_fcf_future_history.cleanup_receipt r where singleton)=(select cleanup from activation_before)and(select home_goals is null and away_goals is null from matches where id=321663)and(select count(*)from matches where statistics_status='unavailable_historical')=6,'immutable cleanup/six markers/unknown NULL preserved');

-- Committed retry remains readback only and refuses different or drifted state.
do $$begin
 begin update activation_packet set a=jsonb_set(a,'{execution,runId}','"901"');perform pg_temp.activation_gate(true);raise exception 'FUTURE ACTIVATION TEST: accepted different committed activation';exception when others then if sqlerrm not like 'FCF_TARGET:%'then raise;end if;end;
 begin update players set value=value+0.5 where id=(select min(id)from players where competition_id=783);perform pg_temp.activation_gate(true);raise exception 'FUTURE ACTIVATION TEST: accepted changed committed afterimage';exception when others then if sqlerrm not like 'FCF_TARGET:%'then raise;end if;end;
end$$;
savepoint activation_readonly_recovery;
set local transaction_read_only=on;
select pg_temp.six_assert(public.fcf_future_current_target_receipt('es-ct-segona-g1')->>'currentActive'='true'and public.fcf_future_current_target_receipt('es-ct-segona-g1')->>'stage'='activated','readonly activated receipt recovery');
do $$declare actual jsonb;saved jsonb;before_image jsonb;begin
 select to_jsonb(r)into saved from private_fcf_future_target_release.receipts r where competition_id=783;before_image:=private_fcf_future_activation.after_image(783);actual:=public.fcf_future_current_target_receipt('es-ct-segona-g1');
 perform pg_temp.six_assert((select count(*)from jsonb_object_keys(actual))=16 and actual->'currentActivationAfterImage'=saved#>'{activation_result,afterImage}'and actual->'currentActivationAfterImage'=before_image,'activated readonly receipt exact16fields/current complete afterimage');
 perform pg_temp.six_assert((select to_jsonb(r)from private_fcf_future_target_release.receipts r where competition_id=783)=saved and private_fcf_future_activation.after_image(783)=before_image,'complete actual readonly readback makes no writes');
end$$;

rollback to savepoint activation_readonly_recovery;

-- These independent private-state changes were invisible to footballSHA alone.
-- The saved receipt must remain unchanged while CURRENT afterimage differs.
create function pg_temp.readback_private_drift(command text,label text)returns void language plpgsql as $$declare saved jsonb;actual jsonb;football_sha text;begin
 select to_jsonb(r)into saved from private_fcf_future_target_release.receipts r where competition_id=783;football_sha:=private_historical_statistics.state_sha256(783);
 begin execute command;perform set_config('transaction_read_only','on',true);actual:=public.fcf_future_current_target_receipt('es-ct-segona-g1');
  perform pg_temp.six_assert(actual->'currentActivationAfterImage'is distinct from saved#>'{activation_result,afterImage}'and actual->>'currentStateSha256'=football_sha and actual->'activation_result'=saved->'activation_result'and(select to_jsonb(r)from private_fcf_future_target_release.receipts r where competition_id=783)=saved,label||' actual drift differs from unchanged saved receipt');
  perform pg_temp.six_assert(actual->'currentActivationAfterImage'=private_fcf_future_activation.after_image(783),label||' returns current complete SQL afterimage');
  raise exception 'ROLLBACK READBACK MUTANT';
 exception when others then if sqlerrm<>'ROLLBACK READBACK MUTANT'then raise;end if;end;
end$$;
select pg_temp.readback_private_drift('update private_historical_statistics.installed_policies set first_fantasy_played_on=first_fantasy_played_on+1 where competition_id=783','policy');
select pg_temp.readback_private_drift('update private_fcf_six_target_release.club_bindings set source_fingerprint=repeat(''e'',64)where competition_id=783','club bindings');
select pg_temp.readback_private_drift('update private_fcf_future_history.cleanup_receipt set restored=true where singleton','cleanup');
do $$begin
 begin perform public.fcf_future_current_target_receipt('es-ct-segona-g1');raise exception 'FUTURE ACTIVATION TEST: receipt allowed read-write transaction';exception when others then if sqlerrm<>'FCF_TARGET: explicit readonly future G9 receipt recovery'then raise;end if;end;
end$$;
select pg_temp.six_assert(not has_function_privilege('anon','public.fcf_future_current_target_receipt(text)','execute')and not has_function_privilege('authenticated','public.fcf_future_current_target_receipt(text)','execute')and has_function_privilege('service_role','public.fcf_future_current_target_receipt(text)','execute'),'complete readonly receipt stays service-only');
select pg_temp.six_assert(private_fcf_future_target_release.g9_image()=(select image from g9_before),'G1 import/CHECK/activation/readback preserves exact G9 image and receipts');
select pg_temp.six_assert(not has_function_privilege('service_role','private_fcf_future_target_release.target(text)','execute')and not has_function_privilege('service_role','private_fcf_future_import.post_g9_history(jsonb)','execute'),'new private helpers inaccessible to service role');

select pg_temp.six_assert(not exists(select 1 from appearances where match_id in(321646,321663,297199,306164,306166,306171))and not exists(select 1 from goals where match_id in(321646,321663,297199,306164,306166,306171)),'all-six header-only markers have zero individual stats');
