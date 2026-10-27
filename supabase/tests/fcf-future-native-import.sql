-- TEST ONLY synthetic football. No source GET, live evidence or activation.
-- Adapt the synthetic six-calendar data into the actual FUTURE contract. No
-- legacy RPC is used by the production future IMPORT implementation.
update rounds set deadline_at='2026-10-23T12:00Z',lineups_locked_at='2026-10-23T12:01Z'where competition_id=797 and number=6;
create temporary table import_protected as select (select to_jsonb(c)from competitions c where id=797)competition,(select jsonb_agg(to_jsonb(r)order by id)from rounds r where competition_id=797)rounds;
create function pg_temp.future_later_report(fixtures jsonb,f jsonb)returns jsonb language plpgsql as $$declare side int;t jsonb;a jsonb;apps jsonb:='[]';old_side int;scorer jsonb;begin
 for side in 0..1 loop
  select value into t from jsonb_array_elements(fixtures)where value->>'statisticsStatus'='available'and exists(select 1 from jsonb_array_elements(value->'clubs')cl where cl->>'sourceClubId'=f#>>array['clubs',side::text,'sourceClubId'])limit 1;
  if t is null then raise exception 'synthetic later report lacks matching club';end if;
  old_side:=case when t#>>'{clubs,0,sourceClubId}'=f#>>array['clubs',side::text,'sourceClubId']then 0 else 1 end;
  for a in select value from jsonb_array_elements(t->'appearances')where(value->>'ekipaIdx')::int=old_side loop
   a:=a||jsonb_build_object('ekipaIdx',side,'goli',case when side=0 and(a->>'st')::int=3 then 1 else 0 end,'prejetiGoli',side,'cleanSheet',side=0);
   if side=0 and(a->>'st')::int=3 then scorer:=a;end if;apps:=apps||jsonb_build_array(a);
  end loop;
 end loop;
 return f||jsonb_build_object('statisticsStatus','available','date','2026-10-20','homeGoals',1,'awayGoals',0,'appearances',apps,'report',jsonb_build_object('opozorila','[]'::jsonb),'goals',jsonb_build_array(jsonb_build_object('regSt',scorer->'regSt','ekipaIdx',0,'ime',scorer->'ime','st',scorer->'st','minuta',35,'avtogol',false,'enajstmetrovka',false,'rezultat',jsonb_build_array(1,0))));
end$$;

do $$declare v jsonb;p jsonb;b jsonb;cb jsonb;mp jsonb;t text;f jsonb;fs jsonb:='[]';converted boolean:=false;a jsonb;policy private_historical_statistics.policies%rowtype;stored private_fcf_future_history.cleanup_receipt%rowtype;begin
 select rollout into v from fcf_target_packets;p:=(v->>'targetPacketText')::jsonb;
 select *into stored from private_fcf_future_history.cleanup_receipt;
 cb:=jsonb_build_object('phase','applied','sourceCommit',stored.main_commit,'preparedUTC',clock_timestamp(),'beforeImageText',stored.before_image_text,'beforeSha256',stored.before_sha256,'policyHashes',stored.policy_hashes,'prepareArtifact',jsonb_build_object('synthetic',true),'appliedReceipt',jsonb_build_object('result',stored.result),'originals',(select jsonb_agg(jsonb_build_object('competitionSlug',pol.document->>'competitionSlug','sourceMatchId',e->>'sourceMatchId','policyId',pol.id,'policySha256',pol.policy_sha256,'receipt',jsonb_build_object('rawSha256',e->>'rawSha256'),'fixture',(e-array['rawSha256','reasonCode'])||jsonb_build_object('season','2026/27')))from private_historical_statistics.policies pol cross join lateral jsonb_array_elements(pol.document->'entries')e where pol.document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'));
 -- Structured synthetic transport controls, not authenticated source proofs.
 a:=jsonb_build_object('artifactId','500','artifactDigest','sha256:'||repeat('a',64),'manifestSha256',repeat('a',64),'runId','600','runAttempt','1','jobId','700','retentionCommit',repeat('a',40));
 b:=jsonb_build_object('schemaVersion',1,'kind','fcf-future-source-admission','protocol','future-g9-after-six-v1','targetSlug','es-ct-tercera-g9','sourceCommit',repeat('a',40),'planSha256',repeat('a',64),'childPlanSha256',repeat('a',64),'sourceClaimState','consumed','maximumSourceGETs',478,'priorSourceGETs',37,'newSourceGETs',240,'actualSourceGETs',277,'sourceFingerprintSha256',repeat('c',64),'policyHashes',(select jsonb_object_agg(document->>'competitionSlug',policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'),'claimBinding',jsonb_build_object('claimRef','refs/tags/fcf-inventory-claim/future-g9-after-'||repeat('a',64),'claimCommit',repeat('a',40),'claimJsonSha256',repeat('a',64)),'inventoryBinding',a,'auditBinding',a,'finalReceiptBinding',a,'accountingBinding',jsonb_build_object('kind','fcf-post-six-accounting-only','priorSourceGETs',37,'latestSourceGETs',15,'maximumCumulativeSourceGETs',478,'remainingSourceGETs',441,'admissible',false,'priorAccountingSha256',repeat('a',64),'latest',jsonb_build_object('runId','39238757730','runAttempt','1','sourceCommit','e010bfc63eeb561116ff33293e6aabafb77d7168','planSha256','0554c8777b9ebaf5d3a4159a3748b7db4e442e6ad064bb01dcb7cc04d0fd82b6','claimCommit','ba9fbf21405296f9f73552618b76d7b7fbe86c96','claimJsonSha256','9b386eec86fabfcad0ca83984baeaacf5abd3276c3622b96ead02aca8441245d','rulesetId','25355545','completedUTC','2026-10-19T10:54:44.964Z','consumptionBinding',a,'finalReceiptBinding',a,'children',jsonb_build_array(jsonb_build_object('targetSlug','es-ct-tercera-g9','actualSourceGETs',10,'inventoryBinding',a),jsonb_build_object('targetSlug','es-ct-segona-g1','actualSourceGETs',5,'inventoryBinding',a)))));
 b:=jsonb_set(b,'{accountingBinding,latest,consumptionBinding}','{"artifactId":"12179959409","jobId":"118014326185","artifactDigest":"sha256:73ed80ab7c01119484ff4239d7bd5aa4926180f5bb7e8892acbb6a3a3f6173b4","manifestSha256":"4196620e54a0f275f3d1ccbf3ce686c76a8913a9d21a13d4e1f3c28890cb9e1f","name":"fcf-inventory-consumption-39238757730-1"}'::jsonb);
 b:=jsonb_set(b,'{accountingBinding,latest,children,0,inventoryBinding}','{"artifactId":"12180422913","artifactDigest":"sha256:b64dc03b81efb30917639c2256db62e1a2f6eab6e00c442996a5575172e48a5b","manifestSha256":"40e347c1b396c7406655535383b107758d0fd2146f7bed17207ba866d2d22ffa","runId":"39238757730","runAttempt":"1","jobId":"118016079028","retentionCommit":"e010bfc63eeb561116ff33293e6aabafb77d7168"}'::jsonb);
 b:=jsonb_set(b,'{accountingBinding,latest,children,1,inventoryBinding}','{"artifactId":"12181255579","artifactDigest":"sha256:5a7c28a6af52f299df3eac0d22d7db82032aa574df4d8fd72852f026ad32d58d","manifestSha256":"048040cd58eacf6cd938c4aff14445b95a402cec57352127cd038d4b6e194fb3","runId":"39238757730","runAttempt":"1","jobId":"118016893375","retentionCommit":"e010bfc63eeb561116ff33293e6aabafb77d7168"}'::jsonb);
 b:=jsonb_set(b,'{accountingBinding,latest,finalReceiptBinding}','{"artifactId":"12180274909","artifactDigest":"sha256:d1e1d0a16a250b599779f9c44f3a6f5da8a55807060921743597288a0c6e4126","manifestSha256":"38039bacfb2c8d509ac4852150b72534842f837f18c1792a0acbf32925364b68","runId":"39238757730","runAttempt":"1","jobId":"118017966735","retentionCommit":"e010bfc63eeb561116ff33293e6aabafb77d7168"}'::jsonb);
 b:=jsonb_set(b,'{claimBinding,claimRef}',to_jsonb('refs/tags/fcf-inventory-claim/future-g9-after-'||encode(sha256(convert_to(private_fcf_future_import.canonical_json(b->'accountingBinding'),'UTF8')),'hex')));
 b:=jsonb_set(b,'{auditBinding,artifactId}','"501"');b:=jsonb_set(b,'{finalReceiptBinding,artifactId}','"502"');
 b:=b||jsonb_build_object('consumptionBinding',(a-'retentionCommit')||(b->'claimBinding')||'{"artifactId":"503"}'::jsonb);
 select *into policy from private_historical_statistics.policies where id=p#>>'{target,policyId}';
 for f in select value from jsonb_array_elements(p#>'{target,fixtures}')loop
  if f->>'statisticsStatus'='unavailable_historical'then f:=jsonb_set(f,'{source,rawSha256}',to_jsonb(repeat('e',64)))||jsonb_build_object('policyId',policy.id,'policySha256',policy.policy_sha256);f:=jsonb_set(f,'{source,historicalObservation}',jsonb_build_object('kind','fcf-six-fresh-historical-observation','targetSlug','es-ct-tercera-g9','sourceMatchId',substring(f->>'id'from 3),'policyId',policy.id,'policySha256',policy.policy_sha256,'approvedOriginalSha256',(select e->>'rawSha256'from jsonb_array_elements(policy.document->'entries')e where e->>'sourceMatchId'=substring(f->>'id'from 3)),'freshRawSha256',repeat('e',64),'fixture',f->'sourceFixture'));end if;
  if(f->>'round')::int=7 and not converted then f:=pg_temp.future_later_report(p#>'{target,fixtures}',f);converted:=true;end if;
  fs:=fs||jsonb_build_array(f);
 end loop;
 p:=(p-'target')||jsonb_build_object('schemaVersion',4,'kind','fcf-future-current-target-import','cleanupBinding',cb,'target',((p->'target')-'firstFantasyPlayedOn')||jsonb_build_object('sourceCode','4118349-4118588','historicalCutline','2026-10-24','sourceEvidence',b,'fixtures',fs,'clubs',(select jsonb_agg(x order by x->>'sourceClubId',x->>'sourceCategoryId')from(select distinct x from jsonb_array_elements(fs)fx cross join lateral jsonb_array_elements(fx->'clubs')x)s),'verifiedKeeperClubs',(select jsonb_agg(k order by k)from(select distinct(x->>'sourceClubId')||'/'||(x->>'sourceCategoryId')k from jsonb_array_elements(fs)fx cross join lateral jsonb_array_elements(fx->'clubs')x)s)));
 mp:=(v#>>'{identityPlan,mappingText}')::jsonb||jsonb_build_object('schemaVersion',1,'captureSourceCommit',repeat('a',40),'auditedUTC',clock_timestamp(),'databaseSha256',repeat('a',64),'existingExceptionBindingsSha256',repeat('a',64));t:=mp::text;
 v:=v||jsonb_build_object('schemaVersion',3,'kind','fcf-future-current-target-import-rollout','cleanupBinding',cb,'inventoryBinding',b,'execution',jsonb_build_object('repository','Lovro-splichal-orhanizagi/mnzgorenjska','ref','refs/heads/main','commit',v->>'sourceCommit','runId','800','runAttempt','1'),'identityPlan',jsonb_build_object('mappingText',t,'mappingSha256',encode(sha256(convert_to(t,'UTF8')),'hex')));t:=p::text;v:=v||jsonb_build_object('targetPacketText',t,'targetPacketSha256',encode(sha256(convert_to(t,'UTF8')),'hex'));update fcf_target_packets set rollout=v;
end$$;
create function pg_temp.future_import(v jsonb)returns jsonb language sql as $$select public.fcf_future_current_target_import(v::text,encode(sha256(convert_to(v::text,'UTF8')),'hex'))$$;
create function pg_temp.future_reject(v jsonb,label text)returns void language plpgsql as $$begin begin perform pg_temp.future_import(v);raise exception 'FUTURE TEST: accepted %',label;exception when others then if sqlerrm like 'FUTURE TEST:%'then raise;end if;end;end$$;
create function pg_temp.future_packet(v jsonb,path text[],value jsonb)returns jsonb language plpgsql as $$declare t text;begin t:=jsonb_set((v->>'targetPacketText')::jsonb,path,value)::text;return v||jsonb_build_object('targetPacketText',t,'targetPacketSha256',encode(sha256(convert_to(t,'UTF8')),'hex'));end$$;
select pg_temp.future_reject(rollout||'{"readiness":{}}','readiness injection')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_packet(rollout,array['target','firstFantasyPlayedOn'],'"2026-10-31"'),'launch field injection')from fcf_target_packets;
select pg_temp.future_reject(jsonb_set(rollout,'{inventoryBinding,protocol}','"six-reviewed-continuation-v1"'),'legacy source protocol')from fcf_target_packets;
select pg_temp.future_reject(rollout||'{"targetSlug":"es-ct-segona-g1"}','foreign scope')from fcf_target_packets;
select pg_temp.future_reject(jsonb_set(rollout,'{execution,runAttempt}','"2"'),'attempt2')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_packet(rollout,array['target','fixtures','0','source','capturedUTC'],'"2026-10-22T07:30Z"'),'stale source')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_packet(rollout,array['target','fixtures','0','source','capturedUTC'],'"2026-10-25T07:30Z"'),'future source')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_packet(rollout,array['cleanupBinding','appliedReceipt','result','removedGoals'],'17'),'caller cleanup assertion')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_packet(rollout,array['target','fixtures','0','homeGoals'],'99'),'goal count')from fcf_target_packets;
-- Mutate complete actor/keeper source facts while recomputing both wire hashes.
create function pg_temp.future_fixture(v jsonb,status text,path text[],value jsonb)returns jsonb language plpgsql as $$declare ix text;begin select(ordinality-1)::text into ix from jsonb_array_elements((v->>'targetPacketText')::jsonb#>'{target,fixtures}')with ordinality x(f,ordinality)where f->>'statisticsStatus'=status order by ordinality limit 1;return pg_temp.future_packet(v,array['target','fixtures',ix]||path,value);end$$;
-- Missing and JSON-null normal-report hashes must stop at the explicit
-- source-metadata gate, with rehashed wire and no native/receipt side effects.
do $$declare v jsonb;p jsonb;mut jsonb;source_row jsonb;ix text;missing boolean;before_sha text;rejected boolean;begin
 select rollout into v from fcf_target_packets;p:=(v->>'targetPacketText')::jsonb;
 select(ordinality-1)::text into ix from jsonb_array_elements(p#>'{target,fixtures}')with ordinality x(f,ordinality)where f->>'statisticsStatus'='available'order by ordinality limit 1;
 source_row:=p#>array['target','fixtures',ix,'source'];
 before_sha:=private_fcf_future_projection.capture('es-ct-tercera-g9',array[]::text[])->>'dependencySnapshotSha256';
 foreach missing in array array[true,false]loop
  mut:=pg_temp.future_packet(v,array['target','fixtures',ix,'source'],case when missing then source_row-'rawSha256'else jsonb_set(source_row,'{rawSha256}','null'::jsonb)end);rejected:=false;
  begin perform pg_temp.future_import(mut);
  exception when others then
   if sqlerrm<>'FCF_TARGET: exact source URLs/raw hashes'then raise exception 'FUTURE TEST: source raw hash escaped explicit gate: %',sqlerrm;end if;
   rejected:=true;
  end;
  perform pg_temp.six_assert(rejected,'normal source hash missing/null rejected');
  perform pg_temp.six_assert(private_fcf_future_projection.capture('es-ct-tercera-g9',array[]::text[])->>'dependencySnapshotSha256'=before_sha and not exists(select 1 from private_fcf_future_target_release.receipts),'source hash rejection preserves exact native state and no receipt');
 end loop;
end$$;
-- Rehash both packet and rollout for malformed running-score tuples. Rejection
-- must occur in validation and leave the complete native/dependency image and
-- future receipt untouched; the valid complete R7 import below still runs.
do $$declare v jsonb;mut jsonb;tuple jsonb;before_sha text;rejected boolean;begin
 select rollout into v from fcf_target_packets;
 before_sha:=private_fcf_future_projection.capture('es-ct-tercera-g9',array[]::text[])->>'dependencySnapshotSha256';
 for tuple in select value from jsonb_array_elements('[[null,null],[null,0],[1,null],[1,"0"],[true,0],[-1,0],[1,0.5],[],[1],{"home":1,"away":0},null]'::jsonb)loop
  mut:=pg_temp.future_fixture(v,'available',array['goals','0','rezultat'],tuple);rejected:=false;
  begin perform pg_temp.future_import(mut);
  exception when others then
   if sqlerrm not like 'FCF_TARGET: complete goal event flags/clock/score%'then raise;end if;
   rejected:=true;
  end;
  if not rejected then raise exception 'FUTURE TEST: accepted malformed normal goal running score %',tuple;end if;
  perform pg_temp.six_assert(private_fcf_future_projection.capture('es-ct-tercera-g9',array[]::text[])->>'dependencySnapshotSha256'=before_sha and not exists(select 1 from private_fcf_future_target_release.receipts),'running-score rejection preserves exact native state and no receipt');
 end loop;
end$$;
select pg_temp.future_reject(pg_temp.future_fixture(rollout,'available',array['appearances','0','vratar'],'false'),'missing official GK')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_fixture(rollout,'available',array['appearances','0','minutaDo'],'89'),'GK coverage interval')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_fixture(rollout,'available',array['goals','0','regSt'],'999999999'),'foreign goal actor')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_fixture(rollout,'available',array['appearances','0','zacetnik'],'false'),'explicit XI')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_fixture(rollout,'unavailable_historical',array['source','historicalObservation','approvedOriginalSha256'],to_jsonb(repeat('e',64))),'fresh historical hash cannot replace original')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_fixture(rollout,'unavailable_historical',array['source','historicalObservation','freshRawSha256'],to_jsonb(repeat('d',64))),'typed fresh hash must match actual current raw')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_fixture(rollout,'unavailable_historical',array['source','capturedUTC'],'"2026-10-22T07:30Z"'),'historical captures also require24h')from fcf_target_packets;
select pg_temp.future_reject(pg_temp.future_fixture(pg_temp.future_fixture(rollout,'pending',array['date'],'"2026-10-24"'),'pending',array['source','capturedUTC'],'"2026-10-24T06:29Z"'),'near pending requires1h')from fcf_target_packets;
create function pg_temp.future_native_mutant(command text,label text)returns void language plpgsql as $$declare v jsonb;begin select rollout into v from fcf_target_packets;begin execute command;perform pg_temp.future_reject(v,label);raise exception 'ROLLBACK MUTANT';exception when others then if sqlerrm<>'ROLLBACK MUTANT'then raise;end if;end;end$$;
select pg_temp.future_native_mutant('update competitions set prvi_fantasy_krog=6 where id=797','exact seed1');
select pg_temp.future_native_mutant('update private_fcf_future_history.cleanup_receipt set restored=true','actual stored cleanup restored');
select pg_temp.future_native_mutant('create table public.future_import_unknown(competition_id bigint)','unknown native dependency even empty');
select pg_temp.future_native_mutant('create table scout.future_import_unknown(goal_id bigint)','unknown Scout dependency even empty');
select pg_temp.future_native_mutant('insert into auth.users(id,email)values(''11111111-1111-4111-8111-111111111111'',''future-import@example.invalid'');insert into fantasy_teams(owner_id,name,competition_id)values(''11111111-1111-4111-8111-111111111111'',''Synthetic import user'',797)','target user activity');
-- Anonymized same-reg identities cannot be revived by the bounded importer.
do $$declare v jsonb;a jsonb;begin select rollout into v from fcf_target_packets;select aa into a from jsonb_array_elements((v->>'targetPacketText')::jsonb#>'{target,fixtures}')f cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else'[]'end)aa limit 1;begin insert into players(competition_id,team_id,reg_st,first_name,last_name,full_name,anonimiziran_at,anonimiziran_razlog)select 797,(select min(home_team_id)from matches m join rounds r on r.id=m.round_id where r.competition_id=797),(a->>'regSt')::bigint,'Synthetic','Privacy',a->>'ime',clock_timestamp(),'ugovor';perform pg_temp.future_reject(v,'native privacy hold');raise exception 'ROLLBACK MUTANT';exception when others then if sqlerrm<>'ROLLBACK MUTANT'then raise;end if;end;end$$;

-- Non-target installed launch dates may have legitimately moved after cleanup.
update private_historical_statistics.installed_policies set first_fantasy_played_on='2026-10-31'where competition_id=783;
create temporary table import_result as select pg_temp.future_import(rollout)result from fcf_target_packets;
select pg_temp.six_assert(result->>'stage'='imported'and result->>'fixtures'='240','new future native import succeeds')from import_result;
select pg_temp.six_assert(exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=797 and r.number=7 and m.imported_at is not null),'normal complete report afterR6 accepted');
select pg_temp.six_assert((select count(*)from private_fcf_future_target_release.receipts)=1 and not exists(select 1 from private_fcf_six_target_release.receipts),'dedicated future receipt');
select pg_temp.six_assert((select to_jsonb(c)from competitions c where id=797)=(select competition from import_protected),'inactive seed1 exact config preserved');
select pg_temp.six_assert(not exists(select 1 from rounds r join import_protected p on true cross join lateral jsonb_array_elements(p.rounds)b where r.id=(b->>'id')::bigint and to_jsonb(r)-'played_on'<>b-'played_on'),'expired R6 locks/deadlines preserved');
select pg_temp.six_assert(pg_temp.future_import(rollout)->>'noOp'='true','exact payload verified no-op')from fcf_target_packets;
select pg_temp.six_assert((select count(*)from matches where statistics_status='unavailable_historical')=6 and(select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=797 and m.statistics_status='unavailable_historical')=3 and(select home_goals is null and away_goals is null from matches where id=321663),'exact6/3 markers and unknown NULL preserved');
select pg_temp.six_assert(not has_function_privilege('anon','public.fcf_future_current_target_import(text,text)','execute')and not has_function_privilege('authenticated','public.fcf_future_current_target_import(text,text)','execute')and has_function_privilege('service_role','public.fcf_future_current_target_import(text,text)','execute'),'service-only ACL');
select pg_temp.future_reject(jsonb_set(rollout,'{execution,runId}','"801"'),'different payload after receipt')from fcf_target_packets;
do $$declare v jsonb;begin select rollout into v from fcf_target_packets;begin update players set value=value+0.5 where id=(select min(id)from players where competition_id=797);perform pg_temp.future_reject(v,'state drift rejects retry');raise exception 'ROLLBACK MUTANT';exception when others then if sqlerrm<>'ROLLBACK MUTANT'then raise;end if;end;end$$;

savepoint future_receipt_recovery;
set local transaction_read_only=on;
select pg_temp.six_assert(public.fcf_future_current_target_receipt('es-ct-tercera-g9')->>'rolloutText'=(select rollout::text from fcf_target_packets)and public.fcf_future_current_target_receipt('es-ct-tercera-g9')->>'canonicalVerified'='false','readonly exact receipt recovery carries no retry authority');
rollback to savepoint future_receipt_recovery;
