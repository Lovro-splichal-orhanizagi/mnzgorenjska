-- FUSSBALL kartoni: strelec, ki pride v igro v 90. minuti in zadene v podaljšku.
-- fussball.de zapiše menjavo in gol kot 90. minuto, zato ima strelec 0 minut.
-- apply_fussball_card_report je takega igralca že sprejel kot nastop (90–90),
-- pri golu pa je zahteval minutes_played > 0 in zavrnil cel zapisnik
-- (Baden, Bruchsal 2:4 Waldhof Mannheim 2, 25. 9. 2026, Latifi 90').
-- Edina sprememba: pri strelcu velja ista izjema 90–90 kot pri nastopu.
-- Ostala telesa so prepisana nespremenjena iz produkcije; pravice ostanejo.
CREATE OR REPLACE FUNCTION public.apply_fussball_card_report(p_competition_id bigint, p_code text, p_match_id bigint, p_revision_sha text, p_resolution_sha text, p_nastopi jsonb, p_goli jsonb, p_warnings text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
#variable_conflict use_column

declare r private_fussball.card_reports; m matches; h private_fussball.card_heads; x jsonb; a jsonb; y jsonb; key text; rr jsonb; resolution jsonb; c jsonb; goal_home integer:=0;goal_away integer:=0;prev_min integer:=-1; recipient bigint; expected_yellow integer;expected_red integer;red_min integer; g goals;
 required text[]:=array['player_id','team_id','shirt_number','started','minute_on','minute_off','minutes_played','goals','own_goals','penalties_scored','penalties_missed','penalties_saved','yellow_cards','red_cards','red_card_minute','goals_conceded','clean_sheet','is_goalkeeper'];
begin
 perform private_fussball.scope(p_competition_id,p_code);
 perform private_fussball.require(current_setting('transaction_isolation')='read committed','READ COMMITTED required');
 select * into strict m from matches where id=p_match_id for update;
 select * into strict h from private_fussball.card_heads where match_id=m.id for update;
 select * into strict r from private_fussball.card_reports where id=h.report_id;
 -- Serialize changes to threshold, insider trust and restrictions with the digest.
 lock table competition_settings,settings,omejitve_uporabnikov in share mode;
 perform 1 from profiles p where exists(select 1 from private_fussball.card_votes v join private_fussball.card_events e on e.id=v.event_id where e.report_id=r.id and v.voter_id=p.id)order by p.id for share;
 resolution:=private_fussball.resolution(r.id);
 perform private_fussball.require(r.competition_id=p_competition_id and r.source_code=p_code and r.revision_sha256=p_revision_sha and resolution->>'resolution_sha256'=p_resolution_sha,'source revision or consensus changed');
 perform private_fussball.require(m.zapisnik_id=r.envelope->>'reportId' and m.source_url=r.envelope->>'sourceUrl' and m.home_goals=(r.envelope#>>'{score,domaci}')::int and m.away_goals=(r.envelope#>>'{score,gostje}')::int
 and m.played_on=(r.envelope->>'date')::date and m.statistics_status<>'unavailable_historical' and not m.kontumacija and not m.vir_brez_izida,'native source header changed');
 perform private_fussball.require(p_warnings is not null and not exists(select 1 from unnest(p_warnings)w where w is null or w like 'zapisnik nepopoln%')and jsonb_typeof(p_nastopi)='array' and jsonb_array_length(p_nastopi)between 22 and 80 and jsonb_typeof(p_goli)='array' and jsonb_array_length(p_goli)=m.home_goals+m.away_goals,'complete native report inputs required');
 perform private_fussball.require((select count(distinct x->>'player_id')from jsonb_array_elements(p_nastopi)x)=jsonb_array_length(p_nastopi),'duplicate appearances');
 for a in select value from jsonb_array_elements(p_nastopi)loop
  perform private_fussball.require(a?&required,'appearance fields missing; defaults forbidden');
  foreach key in array required loop
   if key in('started','clean_sheet','is_goalkeeper')then perform private_fussball.require(jsonb_typeof(a->key)='boolean','boolean appearance field required');
   elsif key='red_card_minute'and a->key='null'::jsonb then null;
   else perform private_fussball.require(jsonb_typeof(a->key)='number' and a->>key~'^[0-9]+$','complete nonnegative integer appearance fields required');end if;
  end loop;
  select c0 into c from jsonb_array_elements(r.candidates)c0 where(c0->>'player_id')::bigint=(a->>'player_id')::bigint;
  select r0 into rr from jsonb_array_elements(r.envelope->'roster')r0 where r0->>'sourceId'=c->>'source_id';
  perform private_fussball.require(c is not null and(a->>'team_id')::bigint=(c->>'team_id')::bigint and(a->>'shirt_number')::int=(rr->>'shirt')::int and a->'started'=rr->'starter' and a->'is_goalkeeper'=rr->'goalkeeper'
   and exists(select 1 from players where id=(a->>'player_id')::bigint and competition_id=p_competition_id and anonimiziran_at is null),'exact historical appearance/keeper/identity required');
  perform private_fussball.require((a->>'minute_on')::int<=(a->>'minute_off')::int and(a->>'minute_off')::int<=150 and(a->>'minutes_played')::int=(a->>'minute_off')::int-(a->>'minute_on')::int
   and((a->>'started')::boolean or(a->>'minutes_played')::int>0 or(a->>'yellow_cards')::int>0 or(a->>'red_cards')::int>0 or((a->>'minute_on')::int=90 and(a->>'minute_off')::int=90)),'unused player or contradictory minute interval');
  perform private_fussball.require((a->>'penalties_saved')::int=0 and(a->>'penalties_missed')::int=0 and(a->>'goals_conceded')::int=case when(a->>'team_id')::bigint=m.home_team_id then m.away_goals else m.home_goals end and(a->>'clean_sheet')::boolean=((a->>'goals_conceded')::int=0),'source penalty/save/conceded/clean-sheet fields differ');
  select count(*)filter(where e.event_type='yellow'),count(*)filter(where e.event_type in('red','second_yellow')),max(e.minute)filter(where e.event_type in('red','second_yellow'))into expected_yellow,expected_red,red_min
   from private_fussball.card_events e left join private_fussball.consensus(r.id)s on s.event_id=e.id where e.report_id=r.id and coalesce(e.official_player_id,e.confirmed_player_id,s.player_id)=(a->>'player_id')::bigint;
  perform private_fussball.require((a->>'yellow_cards')::int=expected_yellow and(a->>'red_cards')::int=expected_red and expected_red<=1 and expected_yellow<=1 and(a->>'red_card_minute')::int is not distinct from red_min,'card recipient totals or clock differ');
  perform private_fussball.require(not exists(select 1 from private_fussball.card_events e left join private_fussball.consensus(r.id)s on s.event_id=e.id where e.report_id=r.id and e.event_type='second_yellow'and coalesce(e.official_player_id,e.confirmed_player_id,s.player_id)=(a->>'player_id')::bigint and not exists(select 1 from private_fussball.card_events y left join private_fussball.consensus(r.id)ys on ys.event_id=y.id where y.report_id=r.id and y.event_type='yellow'and y.minute<=e.minute and y.ordinal<e.ordinal and coalesce(y.official_player_id,y.confirmed_player_id,ys.player_id)=(a->>'player_id')::bigint)),'second yellow requires preceding first yellow');
  perform private_fussball.require(expected_red=0 or((a->>'minute_off')::int<=least(red_min,90)and(not(a->>'is_goalkeeper')::boolean or(a->>'minute_off')::int<least(red_min,90))),'dismissal cannot leave player on pitch or invent replacement goalkeeper');
 end loop;
 for x in select value from jsonb_array_elements(r.envelope->'roster')loop
  if(x->>'starter')::boolean then perform private_fussball.require(exists(select 1 from jsonb_array_elements(p_nastopi)a join jsonb_array_elements(r.candidates)c on c->>'source_id'=x->>'sourceId'where a->>'player_id'=c->>'player_id'),'all source starters required');end if;
 end loop;
 perform private_fussball.require(not exists(select 1 from(values(m.home_team_id),(m.away_team_id))t(id)where(select count(*)from jsonb_array_elements(p_nastopi)a where(a->>'team_id')::bigint=t.id and(a->>'started')::boolean)<>11),'exactly11 source starters per side required');
 for x in select to_jsonb(e0)from private_fussball.card_events e0 where e0.report_id=r.id loop
  select coalesce((x->>'official_player_id')::bigint,(x->>'confirmed_player_id')::bigint,s.player_id)into recipient from(select 1)q left join private_fussball.consensus(r.id)s on s.event_id=(x->>'id')::bigint;
  perform private_fussball.require((recipient is not null or x->>'event_type'='yellow')and(recipient is null or exists(select 1 from jsonb_array_elements(p_nastopi)a where(a->>'player_id')::bigint=recipient)),'all red decisions and recipient appearances required');
 end loop;
 for y in select value from jsonb_array_elements(p_goli)loop
  perform private_fussball.require(y?&array['scorer_id','team_id','minute','is_own_goal','is_penalty','score_home','score_away']and jsonb_typeof(y->'is_own_goal')='boolean' and jsonb_typeof(y->'is_penalty')='boolean','complete goal fields required');
  foreach key in array array['scorer_id','team_id','minute','score_home','score_away']loop perform private_fussball.require(jsonb_typeof(y->key)='number'and y->>key~'^[0-9]+$','complete numeric goal fields required');end loop;
  perform private_fussball.require((y->>'minute')::int>=prev_min and(y->>'minute')::int<=150 and exists(select 1 from jsonb_array_elements(p_nastopi)a where a->>'player_id'=y->>'scorer_id'and a->>'team_id'=y->>'team_id'and((a->>'minutes_played')::int>0 or(a->>'minute_on')::int=90 and(a->>'minute_off')::int=90)and(y->>'minute')::int between(a->>'minute_on')::int and(a->>'minute_off')::int),'goal scorer/minute/ordering invalid');
  prev_min:=(y->>'minute')::int;
  if((y->>'team_id')::bigint=m.home_team_id)<>(y->>'is_own_goal')::boolean then goal_home:=goal_home+1;else goal_away:=goal_away+1;end if;
  perform private_fussball.require((y->>'score_home')::int=goal_home and(y->>'score_away')::int=goal_away,'goal scoreboard invalid');
 end loop;
 perform private_fussball.require(goal_home=m.home_goals and goal_away=m.away_goals and not exists(select 1 from jsonb_array_elements(p_nastopi)a where(a->>'goals')::int<>(select count(*)from jsonb_array_elements(p_goli)y where y->>'scorer_id'=a->>'player_id'and not(y->>'is_own_goal')::boolean)or(a->>'own_goals')::int<>(select count(*)from jsonb_array_elements(p_goli)y where y->>'scorer_id'=a->>'player_id'and(y->>'is_own_goal')::boolean)or(a->>'penalties_scored')::int<>(select count(*)from jsonb_array_elements(p_goli)y where y->>'scorer_id'=a->>'player_id'and(y->>'is_penalty')::boolean and not(y->>'is_own_goal')::boolean)),'individual goals differ from official result');
 select coalesce(jsonb_agg(jsonb_build_object('scorer_id',g0.scorer_id,'team_id',g0.team_id,'minute',g0.minute,'is_own_goal',g0.is_own_goal,'is_penalty',g0.is_penalty,'score_home',g0.score_home,'score_away',g0.score_away,'assist_player_id',g0.assist_player_id,'assist_confirmed_at',g0.assist_confirmed_at,'assist_none_confirmed_at',g0.assist_none_confirmed_at)order by g0.id),'[]')||h.saved_assists into h.saved_assists from goals g0 where g0.match_id=m.id and(g0.assist_player_id is not null or g0.assist_none_confirmed_at is not null);
 insert into private_fussball.card_write_context values(m.id,txid_current());
 update matches set statistics_status='available',statistics_reason=null where id=m.id;
 perform public.zamenjaj_nastope_tekme(m.id,p_nastopi,p_goli);
 -- Retain previously confirmed assists under the exact same goal identity.
 for x in select value from jsonb_array_elements(h.saved_assists)loop
  select * into g from goals where match_id=m.id and scorer_id is not distinct from(x->>'scorer_id')::bigint and team_id=(x->>'team_id')::bigint and minute=(x->>'minute')::int and is_own_goal=(x->>'is_own_goal')::boolean and is_penalty=(x->>'is_penalty')::boolean and score_home is not distinct from(x->>'score_home')::int and score_away is not distinct from(x->>'score_away')::int order by id limit 1;
  if g.id is not null and g.assist_player_id is null and g.assist_none_confirmed_at is null and(x->>'assist_player_id'is null or exists(select 1 from appearances where match_id=m.id and player_id=(x->>'assist_player_id')::bigint and team_id=g.team_id and minutes_played>0))then
   update goals set assist_player_id=(x->>'assist_player_id')::bigint,assist_confirmed_at=(x->>'assist_confirmed_at')::timestamptz,assist_none_confirmed_at=(x->>'assist_none_confirmed_at')::timestamptz where id=g.id;
  end if;
 end loop;
 update private_fussball.card_events e set confirmed_player_id=s.player_id from private_fussball.consensus(r.id)s where e.id=s.event_id and e.report_id=r.id and e.official_player_id is null and e.confirmed_player_id is null;
 update private_fussball.card_heads set applied_at=clock_timestamp(),applied_resolution_sha256=p_resolution_sha,deferred_resolution_sha256=null,retry_at=null,replay_error=null where match_id=m.id;
 update matches set imported_at=clock_timestamp(),statistics_status='available',statistics_reason=null,import_warnings=p_warnings where id=m.id;
 perform public.recompute_round_scores(m.round_id);
 perform public.osvezi_tocke_krogov(array[m.round_id]);
 delete from private_fussball.card_write_context where match_id=m.id;
 return jsonb_build_object('applied',true,'match_id',m.id,'revision_sha256',r.revision_sha256,'resolution_sha256',p_resolution_sha);
end$function$;
