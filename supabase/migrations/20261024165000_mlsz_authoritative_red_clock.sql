-- Authoritative MLSZ card clocks distinguish off-field cards; legacy NULL behavior stays strict.
begin;
alter table public.appearances add column red_card_minute integer;
comment on column public.appearances.red_card_minute is 'Authoritative parsed red-card clock normalized to 0-90; NULL retains strict legacy dismissal handling.';
alter table public.appearances add constraint appearances_red_card_minute_check check(red_card_minute is null or (red_cards>0 and minute_off is not null and red_card_minute between 0 and 90 and red_card_minute>=minute_off));

do $$declare d text;changed text;begin
 d:=pg_get_functiondef('public.zamenjaj_nastope_tekme(bigint,jsonb,jsonb)'::regprocedure);
 changed:=replace(d,$q$penalties_saved, yellow_cards, red_cards, goals_conceded$q$,$q$penalties_saved, yellow_cards, red_cards, red_card_minute, goals_conceded$q$);
 if changed=d then raise exception 'REVIEWED_HU615: public.zamenjaj_nastope_tekme(bigint,jsonb,jsonb) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('public.zamenjaj_nastope_tekme(bigint,jsonb,jsonb)'::regprocedure);
 changed:=replace(d,$q$coalesce(r.red_cards, 0),$q$,$q$coalesce(r.red_cards, 0), r.red_card_minute,$q$);
 if changed=d then raise exception 'REVIEWED_HU615: public.zamenjaj_nastope_tekme(bigint,jsonb,jsonb) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('public.zamenjaj_nastope_tekme(bigint,jsonb,jsonb)'::regprocedure);
 changed:=replace(d,$q$yellow_cards integer, red_cards integer,$q$,$q$yellow_cards integer, red_cards integer, red_card_minute integer,$q$);
 if changed=d then raise exception 'REVIEWED_HU615: public.zamenjaj_nastope_tekme(bigint,jsonb,jsonb) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone)'::regprocedure);
 changed:=replace(d,$q$a.red_cards>0 and (a.started or a.minutes_played>0) then$q$,$q$a.red_cards>0 and (a.started or a.minutes_played>0) and (a.red_card_minute is null or a.red_card_minute=a.minute_off) then$q$);
 if changed=d then raise exception 'REVIEWED_HU615: private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.state_sha(text)'::regprocedure);
 changed:=replace(d,$q$jsonb_agg(to_jsonb(a) order by a.id)$q$,$q$jsonb_agg(case when a.red_card_minute is null then to_jsonb(a)-'red_card_minute' else to_jsonb(a) end order by a.id)$q$);
 if changed=d then raise exception 'REVIEWED_HU615: private_reviewed_existing_history.state_sha(text) exact anchor missing';end if;
 execute changed;
end$$;
commit;
