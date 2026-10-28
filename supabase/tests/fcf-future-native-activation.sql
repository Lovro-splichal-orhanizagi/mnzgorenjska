-- SYNTHETIC FOOTBALL ONLY. No provider/GitHub reads or source/launch authority.
-- R6 remains expired+locked; the known earliest legal source round is R7.
do $$declare v jsonb;p jsonb;mp jsonb;fs jsonb:='[]';f jsonb;t text;begin
 perform set_config('slff.fcf_target_test_clock','2026-10-24T16:00:00Z',true);select rollout into v from fcf_target_packets;p:=(v->>'targetPacketText')::jsonb;mp:=(v#>>'{identityPlan,mappingText}')::jsonb;
 for f in select value from jsonb_array_elements(p#>'{target,fixtures}')loop
  f:=jsonb_set(f,'{source,capturedUTC}','"2026-10-24T16:00:00Z"');if(f->>'round')::int=7 then f:=f||'{"time":"00:30"}'::jsonb;end if;
  if(f->>'round')::int>=7 then f:=f||jsonb_build_object('date','2026-10-25'::date+7*((f->>'round')::int-7));end if;fs:=fs||jsonb_build_array(f);
 end loop;
 p:=jsonb_set(p,'{target,fixtures}',fs)||jsonb_build_object('auditedUTC',clock_timestamp());
 mp:=jsonb_set(mp,'{fixtures}',(select jsonb_agg(m||jsonb_build_object('sourceRound',(sf.f->>'round')::int,'homeTeamId',match.home_team_id,'awayTeamId',match.away_team_id)order by m->>'sourceMatchId')from jsonb_array_elements(mp->'fixtures')m join lateral(select value f from jsonb_array_elements(fs)where value->>'id'=m->>'sourceMatchId')sf on true join matches match on match.id=(m->>'matchId')::bigint));t:=mp::text;
 v:=jsonb_set(v,'{identityPlan}',jsonb_build_object('mappingText',t,'mappingSha256',encode(sha256(convert_to(t,'UTF8')),'hex')));t:=p::text;v:=v||jsonb_build_object('targetPacketText',t,'targetPacketSha256',encode(sha256(convert_to(t,'UTF8')),'hex'));update fcf_target_packets set rollout=v;
end$$;
update rounds set deadline_at='2026-10-23T12:00Z'where competition_id=797 and deadline_at is null;
select public.fcf_future_current_target_import(rollout::text,encode(sha256(convert_to(rollout::text,'UTF8')),'hex'))from fcf_target_packets;
-- Intentional reprice after import: old imported_state_sha256 must NOT gate this.
update players set position=case when reg_st>=100000 then case when reg_st%1000=0 then'GK'when reg_st%1000 between 1 and 4 or reg_st%1000=200 then'DEF'when reg_st%1000 between 5 and 8 then'MID'else'FWD'end else position end,value=case when reg_st%1000=2 then 9 else 4 end,value_start=case when reg_st%1000=2 then 9 else 4 end where competition_id=797;
do $$declare r bigint;begin for r in select id from rounds where competition_id=797 loop perform recompute_round_scores(r);end loop;perform osvezi_statistiko_igralcev(array(select id from players where competition_id=797));end$$;
create temporary table activation_squad(id bigint primary key,team bigint,position text);
do $$declare pos text;n int;i int;pid bigint;begin
 for pos,n in select *from(values('GK',2),('DEF',5),('MID',5),('FWD',3))q loop
  for i in 1..n loop select p.id into pid from players p where competition_id=797 and active and p.position=pos and not exists(select 1 from activation_squad where id=p.id)and(select count(*)from activation_squad where team=p.team_id)<3 order by value,id limit 1;perform pg_temp.six_assert(pid is not null,'synthetic legal15 player');insert into activation_squad select id,team_id,position from players where id=pid;end loop;
 end loop;
end$$;
create temporary table activation_packet(a jsonb);
create temporary table activation_pure_control(proof jsonb);
-- Freeze the ACTUAL private SQL projection after import+prices; only the fixed
-- known R7 choice is constructed. SQL must derive the same choice independently.
do $$declare v jsonb;p jsonb;mp jsonb;proj jsonb;native jsonb;launch jsonb;proposal jsonb;ready jsonb;a jsonb;ks text[];cid bigint;rid bigint;rec private_fcf_future_target_release.receipts%rowtype;begin
 select rollout into v from fcf_target_packets;p:=(v->>'targetPacketText')::jsonb;mp:=(v#>>'{identityPlan,mappingText}')::jsonb;select country_id into cid from competitions where id=797;
 select array_agg(distinct k order by k)into ks from(select public.anonimizacijski_kljuc(cid||'|reg|'||(actor->>'regSt'))k from jsonb_array_elements(p#>'{target,fixtures}')f cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else'[]'end)actor union select public.anonimizacijski_kljuc(cid||'|'||(actor->>'ime'))from jsonb_array_elements(p#>'{target,fixtures}')f cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else'[]'end)actor)s;
 proj:=private_fcf_future_projection.capture('es-ct-tercera-g9',ks);native:=proj->'native';select *into rec from private_fcf_future_target_release.receipts where competition_id=797;select id into rid from rounds where competition_id=797 and number=7;
 launch:=jsonb_build_object('targetSlug','es-ct-tercera-g9','competitionId',797,'sourceCode','4118349-4118588','season','2026/27','sourceFingerprintSha256',rec.source_fingerprint,'writerCommit',repeat('f',40),'fixtures',(select jsonb_agg(f order by f->>'id')from jsonb_array_elements(p#>'{target,fixtures}')f),'mapping',(select jsonb_agg(m order by m->>'sourceMatchId')from jsonb_array_elements(mp->'fixtures')m),'native',native);
 proposal:=jsonb_build_object('schemaVersion',1,'kind','fcf-future-launch-proposal','targetSlug','es-ct-tercera-g9','competitionId',797,'season','2026/27','sourceCode','4118349-4118588','sourceFingerprintSha256',rec.source_fingerprint,'writerCommit',repeat('f',40),'projectionSha256',encode(sha256(convert_to(private_fcf_future_import.canonical_json(launch),'UTF8')),'hex'),'roundNumber',7,'roundId',rid,'firstFantasyPlayedOn','2026-10-25','timeZone','Europe/Madrid','earliestKickoffUTC','2026-10-24T22:30:00.000Z','deadlineUTC','2026-10-24T16:30:00.000Z','fixtureIds',(select jsonb_agg(f->>'id'order by f->>'id')from jsonb_array_elements(p#>'{target,fixtures}')f where f->>'round'='7'),'matchIds',(select jsonb_agg((m->>'matchId')::bigint order by(m->>'matchId')::bigint)from jsonb_array_elements(mp->'fixtures')m where m->>'sourceRound'='7'));
 ready:=jsonb_build_object('modelSha256',repeat('e',64),'pricingSnapshotText',proj#>>'{pricingSnapshot,snapshotText}','pricingSnapshotSha256',proj#>>'{pricingSnapshot,snapshotSha256}','priceVector',(select jsonb_agg(jsonb_build_object('id',id,'value',value,'value_start',value_start,'position',position,'position_source',position_source)order by id)from players where competition_id=797),'squad',(select jsonb_agg(jsonb_build_object('id',id)order by id)from activation_squad),'cheapestLegal15',public.najcenejsi_kader(public.stanje_lige(797)->'igralci'),'launchProposal',proposal);
 a:=jsonb_build_object('schemaVersion',4,'kind','fcf-future-current-target-activation','targetSlug','es-ct-tercera-g9','sourceCommit',repeat('f',40),'execution',jsonb_build_object('repository','Lovro-splichal-orhanizagi/mnzgorenjska','ref','refs/heads/main','commit',repeat('f',40),'runId','900','runAttempt','1'),'importReceiptId',rec.id::text,'importRolloutText',rec.rollout_text,'importRolloutSha256',rec.rollout_sha256,'nativeSnapshotText',proj->>'dependencySnapshotText','nativeSnapshotSha256',proj->>'dependencySnapshotSha256','launchProposal',proposal,'readiness',ready,'auditedUTC',clock_timestamp());insert into activation_packet values(a);insert into activation_pure_control values(jsonb_build_object('launchInput',launch||jsonb_build_object('now',(extract(epoch from clock_timestamp())*1000)::bigint),'proposal',proposal));
end$$;
select 'ACTIVATION_SYNTHETIC_PROJECTION:'||proof::text from activation_pure_control;
create function pg_temp.activation_gate(activate boolean default false)returns jsonb language plpgsql as $$declare t text;begin select a::text into t from activation_packet;return public.fcf_future_current_target_check(t,encode(sha256(convert_to(t,'UTF8')),'hex'),activate);end$$;
create temporary table activation_before as select private_historical_statistics.state_sha256(797)state,(select to_jsonb(r)from private_fcf_future_target_release.receipts r where competition_id=797)receipt,(select to_jsonb(r)from private_fcf_future_history.cleanup_receipt r where singleton)cleanup;
-- The imported readonly receipt retains exactly its original fifteen fields.
savepoint imported_readonly_receipt;
set local transaction_read_only=on;
select pg_temp.six_assert(private_fcf_future_import.keys(public.fcf_future_current_target_receipt('es-ct-tercera-g9'),array['id','competition_id','inventory_key','packet_sha256','source_fingerprint','cleanup_before_sha256','imported_state_sha256','stage','activation_result','created_at','rolloutText','rolloutSha256','currentActive','currentStateSha256','canonicalVerified'])and not(public.fcf_future_current_target_receipt('es-ct-tercera-g9')?'currentActivationAfterImage'),'imported receipt exact15fields unchanged');
rollback to savepoint imported_readonly_receipt;
select pg_temp.six_assert(pg_temp.activation_gate()->>'stage'='checked','actual future7 check after repricing passes');
select pg_temp.six_assert(private_historical_statistics.state_sha256(797)=(select state from activation_before)and(select to_jsonb(r)from private_fcf_future_target_release.receipts r where competition_id=797)=(select receipt from activation_before),'check has no persistent mutations');
-- Each source/native/dependency mutation is a real subtransaction. Failure
-- rolls back both the mutant and all attempted activation effects.
create function pg_temp.activation_mutant(command text,label text)returns void language plpgsql as $$declare before_state jsonb;begin
 before_state:=private_fcf_future_activation.after_image();
 begin execute command;perform pg_temp.activation_gate(true);raise exception 'FUTURE ACTIVATION TEST: accepted %',label;
 exception when others then if sqlerrm not like 'FCF_TARGET:%'and sqlerrm not like 'HISTORICAL_POLICY:%'then raise;end if;end;
 perform pg_temp.six_assert(private_fcf_future_activation.after_image()=before_state and(select stage='imported'and activation_result is null from private_fcf_future_target_release.receipts where competition_id=797),'rejected activation preserves exact native/price/policy/cleanup and receipt');
end$$;
select pg_temp.activation_mutant('update activation_packet set a=jsonb_set(a,''{schemaVersion}'',''"4"'')','typed numeric schema version');
select pg_temp.activation_mutant('update activation_packet set a=jsonb_set(a,''{nativeSnapshotText}'',(a->>''nativeSnapshotText'')::jsonb)','SQL snapshot must remain opaque TEXT');
select pg_temp.activation_mutant('update players set value=value+0.5 where id=(select min(id)from players where competition_id=797)','price drift');
select pg_temp.activation_mutant('update players set position=''DEF'',position_source=''admin''where competition_id=797 and position=''GK''','official goalkeeper drift');
select pg_temp.activation_mutant('update goals set minute=minute+1 where id=(select min(id)from goals)','goal canonical drift');
select pg_temp.activation_mutant('update matches set played_on=played_on+1 where id=(select min(m.id)from matches m join rounds r on r.id=m.round_id where r.competition_id=797 and r.number=7)','source/native date drift');
select pg_temp.activation_mutant('update rounds set lineups_locked_at=clock_timestamp()where competition_id=797 and number=7','selected lock');
select pg_temp.activation_mutant('update rounds set deadline_at=clock_timestamp()-interval''1 minute''where competition_id=797 and number=7','expired selected native deadline');
select pg_temp.activation_mutant('create table public.future_activation_unknown(player_id bigint)','unknown dependency catalog');
select pg_temp.activation_mutant('insert into auth.users(id,email)values(''11111111-1111-4111-8111-111111111111'',''future-activation@example.invalid'');insert into fantasy_teams(owner_id,name,competition_id)values(''11111111-1111-4111-8111-111111111111'',''Synthetic activation user'',797)','target user');
select pg_temp.activation_mutant('update activation_packet set a=jsonb_set(a,''{importRolloutText}'',to_jsonb(a->>''importRolloutText''||'' ''))','changed source/cleanup/import approval');
select pg_temp.activation_mutant('update activation_packet set a=jsonb_set(a,''{launchProposal,roundNumber}'',''8'')','frozen proposal cannot fall forward');
-- At expiry all original captures remain within the provider1h maximum.
select pg_temp.activation_mutant('set local slff.fcf_target_test_clock=''2026-10-24T16:31:00Z''','expired official proposal cannot roll toR8');
-- Exercise actual Madrid ambiguity/nonexistence, without manufacturing source
-- authority for a changed saved rollout. Only temp source rows change here.
do $$declare rows jsonb;begin
 begin update pg_temp._fcf_expected set f=f||'{"date":"2026-10-25","time":"02:30"}'::jsonb where rn=7;perform private_fcf_future_activation.official_clock(7);raise exception 'FUTURE ACTIVATION TEST: accepted ambiguous Madrid';exception when others then if sqlerrm<>'FCF_TARGET: ambiguous/nonexistent Madrid kickoff'then raise;end if;end;
 begin update pg_temp._fcf_expected set f=f||'{"date":"2027-03-28","time":"02:30"}'::jsonb where rn=7;perform private_fcf_future_activation.official_clock(7);raise exception 'FUTURE ACTIVATION TEST: accepted nonexistent Madrid';exception when others then if sqlerrm<>'FCF_TARGET: ambiguous/nonexistent Madrid kickoff'then raise;end if;end;
end$$;
select pg_temp.six_assert(not has_function_privilege('anon','public.fcf_future_current_target_check(text,text,boolean)','execute')and not has_function_privilege('authenticated','public.fcf_future_current_target_check(text,text,boolean)','execute')and has_function_privilege('service_role','public.fcf_future_current_target_check(text,text,boolean)','execute'),'service-only activation ACL');
select pg_temp.six_assert(pg_temp.activation_gate(true)->>'active'='true','same-TX future opening activation');
select pg_temp.six_assert((select active and prvi_fantasy_krog=7 from competitions where id=797)and(select deadline_at='2026-10-24T16:30Z'and lineups_locked_at is null from rounds where competition_id=797 and number=7)and(select first_fantasy_played_on='2026-10-25'from private_historical_statistics.installed_policies where competition_id=797),'exact intended active opening/policy/deadline');
select pg_temp.six_assert((select deadline_at='2026-10-23T12:00Z'and lineups_locked_at='2026-10-23T12:01Z'from rounds where competition_id=797 and number=6),'expired R6 remains closed');
select pg_temp.six_assert(pg_temp.activation_gate(true)->>'readbackOnly'='true','exact activated retry is explicit readback only');
select pg_temp.six_assert((select to_jsonb(r)from private_fcf_future_history.cleanup_receipt r where singleton)=(select cleanup from activation_before)and(select home_goals is null and away_goals is null from matches where id=321663)and(select count(*)from matches where statistics_status='unavailable_historical')=6,'immutable cleanup/six markers/unknown NULL preserved');

-- Committed retry remains readback only and refuses different or drifted state.
do $$begin
 begin update activation_packet set a=jsonb_set(a,'{execution,runId}','"901"');perform pg_temp.activation_gate(true);raise exception 'FUTURE ACTIVATION TEST: accepted different committed activation';exception when others then if sqlerrm not like 'FCF_TARGET:%'then raise;end if;end;
 begin update players set value=value+0.5 where id=(select min(id)from players where competition_id=797);perform pg_temp.activation_gate(true);raise exception 'FUTURE ACTIVATION TEST: accepted changed committed afterimage';exception when others then if sqlerrm not like 'FCF_TARGET:%'then raise;end if;end;
end$$;
savepoint activation_readonly_recovery;
set local transaction_read_only=on;
select pg_temp.six_assert(public.fcf_future_current_target_receipt('es-ct-tercera-g9')->>'currentActive'='true'and public.fcf_future_current_target_receipt('es-ct-tercera-g9')->>'stage'='activated','readonly activated receipt recovery');
do $$declare actual jsonb;saved jsonb;before_image jsonb;begin
 select to_jsonb(r)into saved from private_fcf_future_target_release.receipts r where competition_id=797;before_image:=private_fcf_future_activation.after_image();actual:=public.fcf_future_current_target_receipt('es-ct-tercera-g9');
 perform pg_temp.six_assert((select count(*)from jsonb_object_keys(actual))=16 and actual->'currentActivationAfterImage'=saved#>'{activation_result,afterImage}'and actual->'currentActivationAfterImage'=before_image,'activated readonly receipt exact16fields/current complete afterimage');
 perform pg_temp.six_assert((select to_jsonb(r)from private_fcf_future_target_release.receipts r where competition_id=797)=saved and private_fcf_future_activation.after_image()=before_image,'complete actual readonly readback makes no writes');
end$$;

rollback to savepoint activation_readonly_recovery;

-- These independent private-state changes were invisible to footballSHA alone.
-- The saved receipt must remain unchanged while CURRENT afterimage differs.
create function pg_temp.readback_private_drift(command text,label text)returns void language plpgsql as $$declare saved jsonb;actual jsonb;football_sha text;begin
 select to_jsonb(r)into saved from private_fcf_future_target_release.receipts r where competition_id=797;football_sha:=private_historical_statistics.state_sha256(797);
 begin execute command;perform set_config('transaction_read_only','on',true);actual:=public.fcf_future_current_target_receipt('es-ct-tercera-g9');
  perform pg_temp.six_assert(actual->'currentActivationAfterImage'is distinct from saved#>'{activation_result,afterImage}'and actual->>'currentStateSha256'=football_sha and actual->'activation_result'=saved->'activation_result'and(select to_jsonb(r)from private_fcf_future_target_release.receipts r where competition_id=797)=saved,label||' actual drift differs from unchanged saved receipt');
  perform pg_temp.six_assert(actual->'currentActivationAfterImage'=private_fcf_future_activation.after_image(),label||' returns current complete SQL afterimage');
  raise exception 'ROLLBACK READBACK MUTANT';
 exception when others then if sqlerrm<>'ROLLBACK READBACK MUTANT'then raise;end if;end;
end$$;
select pg_temp.readback_private_drift('update private_historical_statistics.installed_policies set first_fantasy_played_on=first_fantasy_played_on+1 where competition_id=797','policy');
select pg_temp.readback_private_drift('update private_fcf_six_target_release.club_bindings set source_fingerprint=repeat(''e'',64)where competition_id=797','club bindings');
select pg_temp.readback_private_drift('update private_fcf_future_history.cleanup_receipt set restored=true where singleton','cleanup');
do $$begin
 begin perform public.fcf_future_current_target_receipt('es-ct-tercera-g9');raise exception 'FUTURE ACTIVATION TEST: receipt allowed read-write transaction';exception when others then if sqlerrm<>'FCF_TARGET: explicit readonly future G9 receipt recovery'then raise;end if;end;
end$$;
select pg_temp.six_assert(not has_function_privilege('anon','public.fcf_future_current_target_receipt(text)','execute')and not has_function_privilege('authenticated','public.fcf_future_current_target_receipt(text)','execute')and has_function_privilege('service_role','public.fcf_future_current_target_receipt(text)','execute'),'complete readonly receipt stays service-only');
