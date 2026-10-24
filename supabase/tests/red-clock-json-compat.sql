begin;
set local statement_timeout='120s';
-- Generated disposable observations, never source evidence or an operational receipt.
do $$declare cid bigint;h bigint;v bigint;p bigint;rid bigint;mid bigint;begin
 foreach cid in array array[463,619,625,783,790,797,971,972,973,974]loop
 insert into teams(name,short_name,country_id)select 'TEST JSON CLOCK home '||cid,'TEST',(select country_id from competitions where id=cid)returning id into h;
 insert into teams(name,short_name,country_id)select 'TEST JSON CLOCK away '||cid,'TEST',(select country_id from competitions where id=cid)returning id into v;
 insert into players(team_id,competition_id,first_name,last_name,full_name,position,position_source)values(h,cid,'TEST','JSON CLOCK','TEST JSON CLOCK '||cid,'DEF','zapisnik')returning id into p;
 insert into rounds(competition_id,season,number,played_on)values(cid,'2026/27',999999,current_date)returning id into rid;
 insert into matches(round_id,home_team_id,away_team_id,played_on)values(rid,h,v,current_date)returning id into mid;
 insert into appearances(match_id,player_id,team_id,started,minute_on,minute_off,minutes_played,red_cards)values(mid,p,h,true,0,90,90,1);
 end loop;
end$$;
create function pg_temp.clock_precolumn_json(j jsonb)returns jsonb language sql immutable strict as $$select j-'red_card_minute'$$;
create temporary table clock_comparators(signature text,arguments text,old_name text);
insert into clock_comparators(signature,arguments)values
 ('private_fcf_history.capture()',''),('private_fcf_six_history.capture()',''),
 ('private_mfa_history.capture()',''),('private_mfa_challenge_history.capture()',''),
 ('private_mlsz_history.capture()',''),('private_mfa_nl_history.football_image(bigint)','973'),
 ('private_mfa_nl_history.protected_current(bigint)','973'),
 ('private_reviewed_existing_history.capture(text)',quote_literal('hu-cs-u19-toth')),
 ('private_historical_statistics.state_sha256(bigint)','625');
do $$declare x record;d text;old text;n int:=0;actual text;legacy text;begin
 if private_historical_statistics.appearance_json('{"other":null}')<>'{"other":null}'::jsonb
 or private_historical_statistics.appearance_json('{"other":null,"red_card_minute":null}')<>'{"other":null}'::jsonb
 or private_historical_statistics.appearance_json('{"red_card_minute":90}')<>'{"red_card_minute":90}'::jsonb
 or private_historical_statistics.appearance_json(null)is not null then raise exception 'NULL-only helper contract differs';end if;
 if has_function_privilege('anon','private_historical_statistics.appearance_json(jsonb)','execute')or has_function_privilege('authenticated','private_historical_statistics.appearance_json(jsonb)','execute')or has_function_privilege('service_role','private_historical_statistics.appearance_json(jsonb)','execute')then raise exception 'private serializer ACL widened';end if;
 for x in select *from clock_comparators loop
 n:=n+1;d:=pg_get_functiondef(x.signature::regprocedure);
 old:=regexp_replace(d,'CREATE OR REPLACE FUNCTION [a-z_0-9]+\.[a-z_0-9]+\(', 'CREATE FUNCTION pg_temp.clock_legacy_'||n||'(');
 -- The pre-column row has exactly this shape; unrelated NULLs remain present.
 old:=replace(old,'private_historical_statistics.appearance_json(to_jsonb(t))', 'pg_temp.clock_precolumn_json(to_jsonb(t))');
 old:=replace(old,'private_historical_statistics.appearance_json(to_jsonb(a))', 'pg_temp.clock_precolumn_json(to_jsonb(a))');
 if old=d or old like '%private_historical_statistics.appearance_json(%'then raise exception 'legacy test anchor missing: %',x.signature;end if;
 execute old;
 update clock_comparators set old_name='pg_temp.clock_legacy_'||n where signature=x.signature;
 execute 'select '||split_part(x.signature,'(',1)||'('||x.arguments||')::text'into actual;
 execute 'select pg_temp.clock_legacy_'||n||'('||x.arguments||')::text'into legacy;
 if actual is distinct from legacy or encode(sha256(convert_to(actual,'UTF8')),'hex')is distinct from encode(sha256(convert_to(legacy,'UTF8')),'hex')then raise exception 'Legacy NULL receipt/hash changed: %',x.signature;end if;
 end loop;
 update appearances set red_card_minute=90 where player_id in(select id from players where full_name like 'TEST JSON CLOCK %');
 for x in select *from clock_comparators loop
 execute 'select '||split_part(x.signature,'(',1)||'('||x.arguments||')::text'into actual;
 execute 'select '||x.old_name||'('||x.arguments||')::text'into legacy;
 if actual is not distinct from legacy then raise exception 'Populated clock omitted from receipt/hash: %',x.signature;end if;
 end loop;
 raise notice 'PASS nine native legacy receipt/hash comparators byte-identical for NULL and bind populated clocks; private ACL preserved';
end$$;
rollback;
