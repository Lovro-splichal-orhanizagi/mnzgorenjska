-- Preserve immutable pre-column appearance receipts while binding every non-NULL clock.
begin;
create function private_historical_statistics.appearance_json(p_row jsonb)
returns jsonb language sql immutable strict set search_path=pg_catalog as $$
 select case when p_row->'red_card_minute'='null'::jsonb then p_row-'red_card_minute' else p_row end
$$;
revoke all on function private_historical_statistics.appearance_json(jsonb) from public,anon,authenticated,service_role;
-- These exact function bodies serialize appearances for canonical checks or persisted receipts.
-- Dynamic captures also serialize other rows; absent keys and every other NULL stay unchanged.
do $$declare p record;d text;needle text;replacement text;n integer;begin
 for p in select * from(values
 ('private_dfb_release.varen_vklop_dfb_regije(text,text,boolean)','ap',1),
 ('private_dfb_release.varen_vklop_dfb_regije_v3(text,text,boolean)','ap',1),
 ('private_dfb_release.varen_vklop_dfb_regije_v4(text,text,boolean)','ap',1),
 ('private_dfb_release.varen_vklop_dfb_regije_policy_v4(text,text,boolean)','ap',1),
 ('public.reconcile_dfb_current_players(text,text,text,text)','ap',1),
 ('public.check_hns_women_release(text,text,boolean)','a',1),
 ('private_historical_statistics.state_sha256(bigint)','a',1),
 ('private_reviewed_existing_history.capture(text)','a',2),
 ('private_fcf_history.capture()','t',2),
 ('private_fcf_six_history.capture()','t',2),
 ('private_mfa_history.capture()','t',2),
 ('private_mfa_challenge_history.capture()','t',2),
 ('private_mlsz_history.capture()','t',2),
 ('private_mfa_nl_history.football_image(bigint)','t',1),
 ('private_mfa_nl_history.protected_current(bigint)','t',2)
 )v(signature,alias,expected)loop
 d:=pg_get_functiondef(p.signature::regprocedure);
 needle:='to_jsonb('||p.alias||')';
 n:=(length(d)-length(replace(d,needle,'')))/length(needle);
 if n<>p.expected then raise exception 'RED_CLOCK_JSON: % exact anchor count expected %, got %',p.signature,p.expected,n;end if;
 replacement:='private_historical_statistics.appearance_json('||needle||')';
 execute replace(d,needle,replacement);
 end loop;
end$$;
commit;
