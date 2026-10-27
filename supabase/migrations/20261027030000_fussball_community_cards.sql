-- Recipient-only community overlay. Raw source evidence never becomes public.
-- Installing the bounded service policy does not authorize activation.
create table private_fussball.card_policies(
 competition_id bigint primary key references public.competitions(id),
 current_code text not null unique, archive_codes text[] not null,
 installed_at timestamptz not null default clock_timestamp()
);
create table private_fussball.card_reports(
 id bigint generated always as identity primary key,
 competition_id bigint not null references public.competitions(id),
 match_id bigint not null references public.matches(id), source_code text not null,
 revision_sha256 text not null check(revision_sha256~'^[a-f0-9]{64}$'),
 envelope jsonb not null, candidates jsonb not null,
 registered_at timestamptz not null default clock_timestamp(), unique(match_id,revision_sha256)
);
create table private_fussball.card_heads(
 match_id bigint primary key references public.matches(id), report_id bigint not null references private_fussball.card_reports(id),
 saved_assists jsonb not null default '[]', applied_resolution_sha256 text,
 applied_at timestamptz, deferred_resolution_sha256 text, retry_at timestamptz, replay_error text
);
create table private_fussball.card_events(
 id bigint generated always as identity primary key,
 report_id bigint not null references private_fussball.card_reports(id),
 event_key text not null unique, ordinal integer not null,
 event_type text not null check(event_type in('yellow','red','second_yellow')),
 side integer not null check(side in(0,1)), minute integer not null, added integer not null,
 official_player_id bigint references public.players(id), confirmed_player_id bigint references public.players(id),
 unique(report_id,ordinal)
);
create table private_fussball.card_votes(
 event_id bigint not null references private_fussball.card_events(id), voter_id uuid not null references public.profiles(id)on delete cascade,
 player_id bigint not null references public.players(id), updated_at timestamptz not null default clock_timestamp(),
 primary key(event_id,voter_id)
);
alter table private_fussball.card_votes enable row level security;
create policy "own vote only" on private_fussball.card_votes for select using(voter_id=auth.uid());
create trigger zavrni_omejenega before insert or update on private_fussball.card_votes for each row execute function public.zavrni_omejenega();
create table private_fussball.card_write_context(match_id bigint primary key, xid bigint not null);
create table private_fussball.card_admissions(
 competition_id bigint primary key references public.competitions(id), manifest jsonb not null,
 manifest_sha256 text not null, state_sha256 text not null, registered_at timestamptz not null default clock_timestamp()
);
create table private_fussball.card_activation_context(competition_id bigint primary key,xid bigint not null,state_sha256 text not null);
revoke all on all tables in schema private_fussball from public,anon,authenticated,service_role;
revoke all on all sequences in schema private_fussball from public,anon,authenticated,service_role;

create function private_fussball.require(ok boolean,message text) returns void language plpgsql set search_path=pg_catalog as $$
#variable_conflict use_column
begin
 if ok is distinct from true then raise exception 'FUSSBALL_CARDS: %',message using errcode='22023';end if;
end$$;
create function private_fussball.service() returns void language plpgsql set search_path=pg_catalog as $$
#variable_conflict use_column
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FUSSBALL_CARDS: service only' using errcode='42501';end if;
end$$;
create function private_fussball.sha(value text) returns text language sql immutable set search_path=pg_catalog as $$select encode(sha256(convert_to(value,'UTF8')),'hex')$$;
create function private_fussball.enabled(cid bigint) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(exists(select 1 from private_fussball.card_policies p join competitions c on c.id=p.competition_id join countries d on d.id=c.country_id
 where c.id=cid and c.source='fussball-public' and c.source_policy='fussball-community-cards-v1' and c.source_league_code=p.current_code and d.code='DE'
 and exists(select 1 from competition_settings s where s.competition_id=cid and s.key='fussball_card_voting_enabled' and s.value='1'::jsonb)),false)
$$;
create function private_fussball.scope(cid bigint,code text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
begin
 perform private_fussball.service();
 perform private_fussball.require(private_fussball.enabled(cid) and exists(select 1 from private_fussball.card_policies p where p.competition_id=cid and(code=p.current_code or code=any(p.archive_codes))),'exact installed enabled source scope required');
end$$;
create function public.install_fussball_card_policy(p_competition_id bigint,p_current_code text,p_archive_codes text[]) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare c competitions; p private_fussball.card_policies; v text; yr integer;
begin
 perform private_fussball.service();
 select * into strict c from competitions where id=p_competition_id for update;
 select * into p from private_fussball.card_policies where competition_id=c.id;
 if p.competition_id is not null then
  perform private_fussball.require(p.current_code=p_current_code and p.archive_codes=p_archive_codes and c.source_policy='fussball-community-cards-v1' and c.source='fussball-public' and c.source_league_code=p_current_code,'installed policy cannot be rebound');
  return jsonb_build_object('installed',true,'source_policy',c.source_policy);
 end if;
 perform private_fussball.require(not c.active and c.source='fussball-public' and c.source_policy is null and c.source_league_code=p_current_code and exists(select 1 from countries where id=c.country_id and code='DE')
 and not exists(select 1 from competitions where id<>c.id and source='fussball-public'and source_league_code=p_current_code)
 and p_current_code~'^[A-Z0-9]{32}-G:20[0-9]{2}/[0-9]{2}$' and p_archive_codes is not null and cardinality(p_archive_codes) between 1 and 3 and array_ndims(p_archive_codes)=1
 and (select count(distinct x)from unnest(p_archive_codes)x)=cardinality(p_archive_codes) and not p_current_code=any(p_archive_codes)
 and not exists(select 1 from fantasy_teams where competition_id=c.id) and not exists(select 1 from fantasy_lineups l join rounds r on r.id=l.round_id where r.competition_id=c.id),'inactive exact German source/current/archive tuple without fantasy activity required');
 yr:=substring(p_current_code from 36 for 4)::int;
 perform private_fussball.require(right(p_current_code,2)=right((yr+1)::text,2),'invalid current season');
 foreach v in array p_archive_codes loop
  perform private_fussball.require(v~'^[A-Z0-9]{32}-G:20[0-9]{2}/[0-9]{2}$' and substring(v from 36 for 4)::int between yr-3 and yr-1 and right(v,2)=right((substring(v from 36 for 4)::int+1)::text,2)
   and not exists(select 1 from competitions where id<>c.id and source='fussball-public' and source_league_code=v)
   and not exists(select 1 from private_fussball.card_policies where v=current_code or v=any(archive_codes)),'distinct adjacent unowned archive codes required');
 end loop;
 perform private_fussball.require(exists(select 1 from unnest(p_archive_codes)x where substring(x from 36 for 4)::int=yr-1),'immediately preceding archive required');
 insert into private_fussball.card_policies values(c.id,p_current_code,p_archive_codes,clock_timestamp());
 update competitions set source_policy='fussball-community-cards-v1' where id=c.id;
 insert into competition_settings values(c.id,'fussball_card_voting_enabled','1')on conflict(competition_id,key)do update set value=excluded.value;
 return jsonb_build_object('installed',true,'source_policy','fussball-community-cards-v1');
end$$;
create function private_fussball.settings_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
begin
 if new.key='fussball_card_voting_enabled' then
  perform private_fussball.require(new.value in('0'::jsonb,'1'::jsonb),'enabled setting must be zero or one');
  if new.value='1'::jsonb then perform private_fussball.require(exists(select 1 from private_fussball.card_policies p join competitions c on c.id=p.competition_id where c.id=new.competition_id and c.source='fussball-public' and c.source_policy='fussball-community-cards-v1' and c.source_league_code=p.current_code),'service-installed source binding required');end if;
 elsif new.key='prag_glasov_karton' then
  perform private_fussball.require(jsonb_typeof(new.value)='number' and new.value::text~'^[0-9]+$' and new.value::text::int between 1 and 100,'card threshold must be integer1..100');
 end if;return new;
end$$;
create trigger fussball_card_settings_guard before insert or update on public.competition_settings for each row execute function private_fussball.settings_guard();

-- Bounded original bytes and digest, plus exact deterministic native identity map.
create function private_fussball.validate_envelope(e jsonb) returns void language plpgsql set search_path=public,pg_temp as $$
#variable_conflict use_column

declare b jsonb; f jsonb; x jsonb; raw bytea; total bigint:=0; rev text;
begin
 perform private_fussball.require(octet_length(e::text)<=15000000 and jsonb_typeof(e)='object' and e->>'version'='1' and e->>'matchId'~'^[A-Z0-9]{32}$' and e->>'reportId'='de-fussball-'||(e->>'matchId')
 and e->>'sourceUrl'~('^https://www\.fussball\.de/spiel/(?:[a-z0-9]+(?:-{1,2}[a-z0-9]+)*/)?-/spiel/'||(e->>'matchId')||'$')
 and e->>'season'~'^20[0-9]{2}/[0-9]{2}$' and e->>'round'~'^[1-9][0-9]*$' and e->>'date'~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and e->>'time'~'^[0-2][0-9]:[0-5][0-9]$'
 and length(e->>'homeName') between 1 and 200 and length(e->>'awayName') between 1 and 200 and e->>'homeName'<>e->>'awayName'
 and e#>>'{score,domaci}'~'^[0-9]+$' and e#>>'{score,gostje}'~'^[0-9]+$'
 and jsonb_typeof(e->'roster')='array' and jsonb_array_length(e->'roster') between 22 and 80 and jsonb_typeof(e->'cards')='array' and jsonb_array_length(e->'cards') between 0 and 256
 and jsonb_typeof(e#>'{bundle,fonts}')='array' and jsonb_array_length(e#>'{bundle,fonts}') between 1 and 128,'invalid envelope shape');
 for b in select e#>'{bundle,report}' union all select e#>'{bundle,lineup}' union all select value from jsonb_array_elements(e#>'{bundle,fonts}') loop
  perform private_fussball.require(b->>'sha256'~'^[a-f0-9]{64}$' and length(b->>'base64') between 1 and 11184812,'invalid evidence field');
  raw:=decode(b->>'base64','base64');total:=total+octet_length(raw);
  perform private_fussball.require(octet_length(raw)>0 and total<=8388608 and encode(sha256(raw),'hex')=b->>'sha256','original evidence hash or size differs');
 end loop;
 perform private_fussball.require(not exists(select 1 from jsonb_array_elements(e#>'{bundle,fonts}')f where f->>'fontId'!~'^[a-z0-9]{8}$') and(select count(distinct f->>'fontId')from jsonb_array_elements(e#>'{bundle,fonts}')f)=jsonb_array_length(e#>'{bundle,fonts}'),'duplicate or invalid bound font');
 select private_fussball.sha((e#>>'{bundle,report,sha256}')||E'\n'||(e#>>'{bundle,lineup,sha256}')||E'\n'||string_agg((f->>'fontId')||':'||(f->>'sha256'),E'\n' order by f->>'fontId'))into rev from jsonb_array_elements(e#>'{bundle,fonts}')f;
 perform private_fussball.require(rev=e->>'revisionSha256','revision digest differs');
 perform private_fussball.require((select count(distinct r->>'sourceId')from jsonb_array_elements(e->'roster')r)=jsonb_array_length(e->'roster'),'duplicate historical roster identity');
 perform private_fussball.require(not exists(select 1 from(values('0'),('1'))s(side)where(select count(*)from jsonb_array_elements(e->'roster')r where r->>'side'=s.side and(r->>'starter')::boolean)<>11 or(select count(*)from jsonb_array_elements(e->'roster')r where r->>'side'=s.side and(r->>'starter')::boolean and(r->>'goalkeeper')::boolean)<>1),'exact source starting XI and goalkeeper per side required');
 for x in select value from jsonb_array_elements(e->'roster')loop
  perform private_fussball.require(x->>'side'in('0','1') and jsonb_typeof(x->'starter')='boolean' and jsonb_typeof(x->'goalkeeper')='boolean' and x->>'regSt'~'^[0-9]+$' and x->>'shirt'~'^[0-9]+$' and length(x->>'name') between 1 and 200
  and exists(select 1 from private_fussball.identity_map i where i.source_id=x->>'sourceId' and i.reg_st=(x->>'regSt')::bigint),'unmapped/private historical roster identity');
 end loop;
 for x in select value from jsonb_array_elements(e->'cards')loop
  perform private_fussball.require(x->>'type'in('yellow','red','second_yellow') and x->>'side'in('0','1') and x->>'ordinal'~'^[0-9]+$' and x->>'minute'~'^[0-9]+$' and x->>'base'~'^[0-9]+$' and x->>'added'~'^[0-9]+$' and x->>'half'in('1','2')
  and (x->>'minute')::int between 0 and 150 and (x->>'added')::int between 0 and 30 and (x->>'minute')::int=(x->>'base')::int and(x->>'base')::int between 1 and 90 and((x->>'half'='1'and(x->>'base')::int<=45)or(x->>'half'='2'and(x->>'base')::int>=46))
  and x->>'eventSha256'~'^[a-f0-9]{64}$' and x->>'eventKey'=private_fussball.sha((e->>'reportId')||':'||rev||':'||(x->>'ordinal')||':'||(x->>'eventSha256'))
  and(x->'officialSourceId'='null'::jsonb or exists(select 1 from jsonb_array_elements(e->'roster')r where r->>'sourceId'=x->>'officialSourceId' and r->>'side'=x->>'side')),'invalid immutable card event');
 end loop;
end$$;

create function private_fussball.consensus(rid bigint) returns table(event_id bigint,player_id bigint,weight bigint)language sql stable security definer set search_path=public,pg_temp as $$
 with totals as(select v.event_id,v.player_id,sum(case when p.insider_competition_id=r.competition_id then greatest(1,nastavitev_int_za('prag_glasov_karton',r.competition_id,3))else 1 end)::bigint n
 from private_fussball.card_votes v join private_fussball.card_events e on e.id=v.event_id join private_fussball.card_reports r on r.id=e.report_id join profiles p on p.id=v.voter_id
 where r.id=rid and not public.je_omejen(v.voter_id) group by v.event_id,v.player_id), ranked as(select t.*,rank()over(partition by t.event_id order by t.n desc)rk from totals t)
 select t.event_id,t.player_id,t.n from ranked t join private_fussball.card_reports r on r.id=rid where rk=1 and t.n>=greatest(1,nastavitev_int_za('prag_glasov_karton',r.competition_id,3))and not exists(select 1 from ranked q where q.event_id=t.event_id and q.rk=1 and q.player_id<>t.player_id)
$$;
create function private_fussball.resolution(rid bigint) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('resolutions',coalesce((select jsonb_object_agg(e.event_key,c->>'source_id'order by e.event_key)from private_fussball.card_events e join private_fussball.card_reports r on r.id=e.report_id left join private_fussball.consensus(rid)s on s.event_id=e.id cross join lateral jsonb_array_elements(r.candidates)c
 where e.report_id=rid and e.official_player_id is null and(c->>'player_id')::bigint=coalesce(e.confirmed_player_id,s.player_id)),'{}'::jsonb),
 'resolution_sha256',private_fussball.sha(jsonb_build_object('revision',(select revision_sha256 from private_fussball.card_reports where id=rid),'threshold',(select greatest(1,nastavitev_int_za('prag_glasov_karton',competition_id,3))from private_fussball.card_reports where id=rid),
 'votes',coalesce((select jsonb_agg(jsonb_build_array(v.event_id,v.voter_id,v.player_id,v.updated_at,p.insider_competition_id,public.je_omejen(v.voter_id)) order by v.event_id,v.voter_id)from private_fussball.card_votes v join private_fussball.card_events e on e.id=v.event_id join profiles p on p.id=v.voter_id where e.report_id=rid),'[]'),
 'winners',coalesce((select jsonb_agg(jsonb_build_array(s.event_id,s.player_id,s.weight) order by s.event_id)from private_fussball.consensus(rid)s),'[]'))::text))
$$;

create function public.match_fussball_card_votes(p_match_id bigint) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare r private_fussball.card_reports; m matches; cid bigint; threshold integer; enabled boolean; events jsonb; needs_review boolean:=false;
begin
 select * into m from matches where id=p_match_id;
 select competition_id into cid from rounds where id=m.round_id;
 threshold:=greatest(1,nastavitev_int_za('prag_glasov_karton',cid,3));enabled:=private_fussball.enabled(cid);
 select cr.* into r from private_fussball.card_heads h join private_fussball.card_reports cr on cr.id=h.report_id where h.match_id=p_match_id;
 select coalesce(h.deferred_resolution_sha256=private_fussball.resolution(r.id)->>'resolution_sha256',false)into needs_review from private_fussball.card_heads h where h.match_id=p_match_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'type',e.event_type,'minute',e.minute,'added',e.added,'team_id',case e.side when 0 then m.home_team_id else m.away_team_id end,'team_name',t.name,
 'status',case when e.confirmed_player_id is not null then 'confirmed' when s.player_id is not null and not coalesce(needs_review,false)then 'queued' else 'pending'end,'needs_review',coalesce(needs_review,false)and e.confirmed_player_id is null,'confirmed_player_id',e.confirmed_player_id,
 'my_vote',(select v.player_id from private_fussball.card_votes v where v.event_id=e.id and v.voter_id=auth.uid()),
 'candidates',coalesce((select jsonb_agg(jsonb_build_object('player_id',p.id,'full_name',p.full_name,'shirt_number',(rr->>'shirt')::int,'votes',coalesce((select sum(case when pf.insider_competition_id=cid then threshold else 1 end)from private_fussball.card_votes v join profiles pf on pf.id=v.voter_id where v.event_id=e.id and v.player_id=p.id and not public.je_omejen(v.voter_id)),0))order by (rr->>'shirt')::int,p.id)
 from jsonb_array_elements(r.candidates)c join players p on p.id=(c->>'player_id')::bigint cross join lateral jsonb_array_elements(r.envelope->'roster')rr where rr->>'sourceId'=c->>'source_id' and(rr->>'side')::int=e.side and p.anonimiziran_at is null),'[]'))order by e.ordinal),'[]')into events
 from private_fussball.card_events e left join private_fussball.consensus(r.id)s on s.event_id=e.id join teams t on t.id=case e.side when 0 then m.home_team_id else m.away_team_id end where e.report_id=r.id;
 return jsonb_build_object('enabled',enabled,'statistics_pending',coalesce(m.statistics_status='pending_cards',false),'threshold',threshold,'events',coalesce(events,'[]'::jsonb));
end$$;
create function public.vote_fussball_card(p_event_id bigint,p_player_id bigint)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare e private_fussball.card_events;r private_fussball.card_reports; mid bigint;
begin
 if auth.uid() is null then raise exception 'FUSSBALL_CARDS: authentication required' using errcode='42501';end if;
 select cr.match_id into mid from private_fussball.card_events ce join private_fussball.card_reports cr on cr.id=ce.report_id where ce.id=p_event_id;
 perform 1 from matches where id=mid for update;
 select * into e from private_fussball.card_events where id=p_event_id;
 select * into r from private_fussball.card_reports where id=e.report_id;
 perform private_fussball.require(private_fussball.enabled(r.competition_id)and exists(select 1 from private_fussball.card_heads where match_id=mid and report_id=r.id)and e.confirmed_player_id is null and e.official_player_id is null,'voting unavailable or locked');
 perform private_fussball.require(exists(select 1 from jsonb_array_elements(r.candidates)c cross join lateral jsonb_array_elements(r.envelope->'roster')rr join players p on p.id=p_player_id where(c->>'player_id')::bigint=p_player_id and rr->>'sourceId'=c->>'source_id' and(rr->>'side')::int=e.side and p.competition_id=r.competition_id and p.anonimiziran_at is null),'exact public historical candidate on card side required');
 insert into private_fussball.card_votes values(e.id,auth.uid(),p_player_id,clock_timestamp())on conflict(event_id,voter_id)do update set player_id=excluded.player_id,updated_at=excluded.updated_at where private_fussball.card_votes.player_id is distinct from excluded.player_id;
 return public.match_fussball_card_votes(mid);
end$$;

-- All card mutations take the native match lock before observing the head.
-- A revision with identical bytes but changed parsed evidence is rejected.
create function public.register_fussball_card_report(p_competition_id bigint,p_code text,p_match_id bigint,p_envelope jsonb,p_candidates jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare m matches; rd rounds; oldr private_fussball.card_reports; rid bigint; x jsonb; pending boolean; accepted jsonb;
begin
 perform private_fussball.scope(p_competition_id,p_code);
 select * into strict m from matches where id=p_match_id for update;
 select * into strict rd from rounds where id=m.round_id;
 perform private_fussball.validate_envelope(p_envelope);
 perform private_fussball.require(rd.competition_id=p_competition_id and rd.season=p_envelope->>'season' and split_part(p_code,':',2)=rd.season and rd.number=(p_envelope->>'round')::int
 and m.played_on=(p_envelope->>'date')::date and not m.kontumacija and not m.vir_brez_izida and m.statistics_status<>'unavailable_historical'
 and(m.zapisnik_id is null or m.zapisnik_id=p_envelope->>'reportId') and(m.source_url is null or m.source_url=p_envelope->>'sourceUrl')
 and exists(select 1 from teams where id=m.home_team_id and name=p_envelope->>'homeName')and exists(select 1 from teams where id=m.away_team_id and name=p_envelope->>'awayName'),'exact native fixture/source/season binding differs');
 perform private_fussball.require(jsonb_typeof(p_candidates)='array' and jsonb_array_length(p_candidates)=jsonb_array_length(p_envelope->'roster')
 and(select count(distinct c->>'source_id')from jsonb_array_elements(p_candidates)c)=jsonb_array_length(p_candidates)
 and(select count(distinct c->>'player_id')from jsonb_array_elements(p_candidates)c)=jsonb_array_length(p_candidates)
 and not exists(select 1 from jsonb_array_elements(p_candidates)c where not exists(select 1 from jsonb_array_elements(p_envelope->'roster')r join private_fussball.identity_map i on i.source_id=r->>'sourceId' join players p on p.id=(c->>'player_id')::bigint where c->>'source_id'=r->>'sourceId' and p.competition_id=p_competition_id and p.reg_st=i.reg_st and p.anonimiziran_at is null and(c->>'team_id')::bigint=case(r->>'side')::int when 0 then m.home_team_id else m.away_team_id end)),'candidate mapping must exactly cover public source roster and native league identities');
 select jsonb_agg(jsonb_build_object('source_id',c->>'source_id','player_id',(c->>'player_id')::bigint,'team_id',(c->>'team_id')::bigint)order by c->>'source_id')into p_candidates from jsonb_array_elements(p_candidates)c;
 select r.* into oldr from private_fussball.card_heads h join private_fussball.card_reports r on r.id=h.report_id where h.match_id=m.id;
 select id into rid from private_fussball.card_reports where match_id=m.id and revision_sha256=p_envelope->>'revisionSha256';
 if rid is not null then
  perform private_fussball.require(exists(select 1 from private_fussball.card_reports where id=rid and envelope=p_envelope and candidates=p_candidates and source_code=p_code),'immutable revision or candidate mapping differs');
  perform private_fussball.require(oldr.id=rid,'superseded revision cannot become current again');
  return jsonb_build_object('match_id',m.id,'revision_sha256',p_envelope->>'revisionSha256','statistics_pending',m.statistics_status='pending_cards','unchanged',true);
 end if;
 -- Preserve community-confirmed assists before removing old red-pending rows.
 select coalesce(jsonb_agg(jsonb_build_object('scorer_id',g.scorer_id,'team_id',g.team_id,'minute',g.minute,'is_own_goal',g.is_own_goal,'is_penalty',g.is_penalty,'score_home',g.score_home,'score_away',g.score_away,'assist_player_id',g.assist_player_id,'assist_confirmed_at',g.assist_confirmed_at,'assist_none_confirmed_at',g.assist_none_confirmed_at)order by g.id),'[]')into accepted from goals g where g.match_id=m.id and(g.assist_player_id is not null or g.assist_none_confirmed_at is not null);
 if accepted='[]'::jsonb then select coalesce(h.saved_assists,'[]'::jsonb)into accepted from private_fussball.card_heads h where h.match_id=m.id;end if;
 insert into private_fussball.card_reports(competition_id,match_id,source_code,revision_sha256,envelope,candidates)values(p_competition_id,m.id,p_code,p_envelope->>'revisionSha256',p_envelope,p_candidates)returning id into rid;
 insert into private_fussball.card_heads(match_id,report_id,saved_assists)values(m.id,rid,coalesce(accepted,'[]'))on conflict(match_id)do update set report_id=excluded.report_id,saved_assists=excluded.saved_assists,applied_at=null,applied_resolution_sha256=null,deferred_resolution_sha256=null,retry_at=null,replay_error=null;
 for x in select value from jsonb_array_elements(p_envelope->'cards')loop
  insert into private_fussball.card_events(report_id,event_key,ordinal,event_type,side,minute,added,official_player_id,confirmed_player_id)
  select rid,x->>'eventKey',(x->>'ordinal')::int,x->>'type',(x->>'side')::int,(x->>'minute')::int,(x->>'added')::int,
   (select(c->>'player_id')::bigint from jsonb_array_elements(p_candidates)c where c->>'source_id'=x->>'officialSourceId'),
   (select(c->>'player_id')::bigint from jsonb_array_elements(p_candidates)c where c->>'source_id'=x->>'officialSourceId');
 end loop;
 select exists(select 1 from private_fussball.card_events where report_id=rid and event_type in('red','second_yellow')and official_player_id is null)or oldr.id is not null or m.imported_at is null into pending;
 insert into private_fussball.card_write_context values(m.id,txid_current());
 if pending or oldr.id is not null then
  -- A changed report must never expose statistics from its superseded bytes.
  delete from goals where match_id=m.id;
  delete from appearances where match_id=m.id;
 end if;
 update matches set zapisnik_id=p_envelope->>'reportId',source_url=p_envelope->>'sourceUrl',home_goals=(p_envelope#>>'{score,domaci}')::int,away_goals=(p_envelope#>>'{score,gostje}')::int,
  imported_at=case when pending or oldr.id is not null then null else imported_at end,
  statistics_status=case when pending then 'pending_cards' else 'available'end,statistics_reason=case when pending then 'community_card_recipient_pending' else null end,
  import_warnings=case when pending then array['zapisnik nepopoln: FUSSBALL card recipients pending']else array[]::text[]end||array(select w from unnest(m.import_warnings)w where w not like 'zapisnik nepopoln: FUSSBALL card%')where id=m.id;
 if pending or oldr.id is not null then
  perform public.recompute_round_scores(rd.id);
  perform public.osvezi_tocke_krogov(array[rd.id]);
 end if;
 delete from private_fussball.card_write_context where match_id=m.id;
 return jsonb_build_object('match_id',m.id,'revision_sha256',p_envelope->>'revisionSha256','statistics_pending',pending,'unchanged',false);
end$$;

create function public.get_fussball_card_replay_jobs(p_competition_id bigint,p_code text,p_limit integer default 10,p_match_id bigint default null)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare r private_fussball.card_reports; job jsonb; jobs jsonb:='[]';
begin
 perform private_fussball.scope(p_competition_id,p_code);
 if p_match_id is not null then perform private_fussball.require(exists(select 1 from private_fussball.card_heads h join private_fussball.card_reports cr on cr.id=h.report_id where h.match_id=p_match_id and cr.competition_id=p_competition_id and cr.source_code=p_code),'exact replay match scope required');end if;
 for r in select cr.* from private_fussball.card_heads h join private_fussball.card_reports cr on cr.id=h.report_id join matches m on m.id=h.match_id
 where cr.competition_id=p_competition_id and cr.source_code=p_code and(p_match_id is null or cr.match_id=p_match_id)
 and(h.deferred_resolution_sha256 is null or h.retry_at<=clock_timestamp()or h.deferred_resolution_sha256 is distinct from private_fussball.resolution(cr.id)->>'resolution_sha256')
 and not exists(select 1 from private_fussball.card_events e where e.report_id=cr.id and e.event_type in('red','second_yellow')and e.official_player_id is null and e.confirmed_player_id is null and not exists(select 1 from private_fussball.consensus(cr.id)s where s.event_id=e.id))
 and(exists(select 1 from private_fussball.card_events e join private_fussball.consensus(cr.id)s on s.event_id=e.id where e.report_id=cr.id and e.confirmed_player_id is null)
 or(m.imported_at is null and not exists(select 1 from private_fussball.card_events e where e.report_id=cr.id and e.official_player_id is null and e.event_type in('red','second_yellow'))))
 order by cr.match_id limit least(greatest(coalesce(p_limit,10),1),100)for update of m loop
  job:=private_fussball.resolution(r.id);
  jobs:=jobs||jsonb_build_array(jsonb_build_object('match_id',r.match_id,'envelope',r.envelope,'candidates',r.candidates,'revision_sha256',r.revision_sha256)||job);
 end loop;
 return jobs;
end$$;
create function public.defer_fussball_card_replay(p_competition_id bigint,p_code text,p_match_id bigint,p_revision_sha text,p_resolution_sha text,p_reason text)returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare r private_fussball.card_reports;
begin
 perform private_fussball.scope(p_competition_id,p_code);
 perform 1 from matches where id=p_match_id for update;
 select cr.* into strict r from private_fussball.card_heads h join private_fussball.card_reports cr on cr.id=h.report_id where h.match_id=p_match_id and cr.competition_id=p_competition_id and cr.source_code=p_code;
 perform private_fussball.require(r.revision_sha256=p_revision_sha and private_fussball.resolution(r.id)->>'resolution_sha256'=p_resolution_sha and length(p_reason)between 1 and 1000,'current failed replay revision/consensus and bounded reason required');
 update private_fussball.card_heads set deferred_resolution_sha256=p_resolution_sha,retry_at=clock_timestamp()+interval'1 hour',replay_error=p_reason where match_id=p_match_id;
 return true;
end$$;

-- PostgreSQL independently rejects defaults, foreign/unused players, card totals,
-- goalkeeper and minute contradictions, and incompatible goal/score ledgers.
create function public.apply_fussball_card_report(p_competition_id bigint,p_code text,p_match_id bigint,p_revision_sha text,p_resolution_sha text,p_nastopi jsonb,p_goli jsonb,p_warnings text[])returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
  perform private_fussball.require((y->>'minute')::int>=prev_min and(y->>'minute')::int<=150 and exists(select 1 from jsonb_array_elements(p_nastopi)a where a->>'player_id'=y->>'scorer_id'and a->>'team_id'=y->>'team_id'and(a->>'minutes_played')::int>0 and(y->>'minute')::int between(a->>'minute_on')::int and(a->>'minute_off')::int),'goal scorer/minute/ordering invalid');
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
end$$;

-- Distinct availability; immutable historical markers retain their own guards.
alter table public.matches drop constraint matches_statistics_status_check;
alter table public.matches add constraint matches_statistics_status_check check(statistics_status in('available','unavailable_historical','pending_cards'));
alter table public.matches drop constraint historical_statistics_missingness;
alter table public.matches add constraint historical_statistics_missingness check(
 (statistics_status='available'and statistics_reason is null)
 or(statistics_status in('unavailable_historical','pending_cards')and statistics_reason is not null and imported_at is null and not kontumacija and not vir_brez_izida));
create function private_fussball.match_guard()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare h private_fussball.card_heads;r private_fussball.card_reports;ctx boolean;
begin
 if tg_op='INSERT'then perform private_fussball.require(new.statistics_status<>'pending_cards','pending requires exact registered report');return new;end if;
 select * into h from private_fussball.card_heads where match_id=old.id;
 if h.match_id is null then
  if tg_op<>'DELETE'and new.statistics_status='pending_cards'then raise exception 'FUSSBALL_CARDS: pending requires exact registered report';end if;
  if tg_op='DELETE'then return old;else return new;end if;
 end if;
 if tg_op='DELETE'then raise exception 'FUSSBALL_CARDS: retained source fixture cannot be deleted';end if;
 select * into r from private_fussball.card_reports where id=h.report_id;
 ctx:=exists(select 1 from private_fussball.card_write_context where match_id=old.id and xid=txid_current());
 perform private_fussball.require(row(new.round_id,new.home_team_id,new.away_team_id,new.played_on)is not distinct from row(old.round_id,old.home_team_id,old.away_team_id,old.played_on),'registered historical fixture identity immutable');
 if not ctx then
  perform private_fussball.require(row(new.zapisnik_id,new.source_url,new.home_goals,new.away_goals,new.statistics_status,new.statistics_reason,new.imported_at)is not distinct from row(old.zapisnik_id,old.source_url,old.home_goals,old.away_goals,old.statistics_status,old.statistics_reason,old.imported_at),'registered source statistics require verified card replay');
 end if;
 if new.statistics_status='pending_cards'then
  perform private_fussball.require(new.imported_at is null and new.statistics_reason='community_card_recipient_pending'and new.zapisnik_id=r.envelope->>'reportId'and new.source_url=r.envelope->>'sourceUrl'and new.home_goals=(r.envelope#>>'{score,domaci}')::int and new.away_goals=(r.envelope#>>'{score,gostje}')::int
   and not exists(select 1 from appearances where match_id=new.id)and not exists(select 1 from goals where match_id=new.id),'pending cards require source score and no individual rows');
 end if;return new;
end$$;
create trigger fussball_card_match_guard before insert or update or delete on public.matches for each row execute function private_fussball.match_guard();
create function private_fussball.individual_guard()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare mid bigint;
begin
 if tg_op='DELETE'then mid:=old.match_id;else mid:=new.match_id;end if;
 if exists(select 1 from private_fussball.card_heads where match_id=mid)and not exists(select 1 from private_fussball.card_write_context where match_id=mid and xid=txid_current())then
  -- Assists and administrator corrections on an established appearance remain
  -- possible. Source appearance/goal identity or numerical changes use replay.
  if tg_op='UPDATE'and tg_table_name='goals'and(to_jsonb(new)-array['assist_player_id','assist_confirmed_at','assist_none_confirmed_at'])=(to_jsonb(old)-array['assist_player_id','assist_confirmed_at','assist_none_confirmed_at'])and exists(select 1 from matches where id=mid and statistics_status='available')then return new;end if;
  raise exception 'FUSSBALL_CARDS: registered individual statistics require verified replay';
 end if;
 if tg_op='DELETE'then return old;else return new;end if;
end$$;
create trigger fussball_card_appearances_guard before insert or update or delete on public.appearances for each row execute function private_fussball.individual_guard();
create trigger fussball_card_goals_guard before insert or update or delete on public.goals for each row execute function private_fussball.individual_guard();
create function private_fussball.immutable_report()returns trigger language plpgsql set search_path=pg_catalog as $$
#variable_conflict use_column
begin raise exception 'FUSSBALL_CARDS: original report evidence is immutable';end$$;
create trigger fussball_card_report_immutable before update or delete on private_fussball.card_reports for each row execute function private_fussball.immutable_report();

create function public.fussball_round_has_pending(p_round_id bigint)returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from matches where round_id=p_round_id and statistics_status='pending_cards')$$;
-- Existing completion consumers already share this persistent predicate.
create or replace function public.dfb_round_has_pending(p_round_id bigint)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from private_dfb_pending.pending where round_id=p_round_id)or public.fussball_round_has_pending(p_round_id)
$$;
-- The market also checks the exact retained roster so transferred players wait.
do $$declare d text;changed text;begin
 d:=pg_get_functiondef('public.preracunaj_cene(bigint)'::regprocedure);
 changed:=replace(d,'where not p.value_locked', $q$where not p.value_locked
 and not exists(select 1 from private_fussball.card_heads ch join private_fussball.card_reports cr on cr.id=ch.report_id join matches cm on cm.id=ch.match_id join rounds rr on rr.id=cm.round_id cross join lateral jsonb_array_elements(cr.candidates)cc
 where cm.statistics_status='pending_cards'and (cc->>'player_id')::bigint=p.id and rr.competition_id=v_tekmovanje and rr.season=v_sezona and rr.number between greatest(1,v_stevilka-2)and v_stevilka)$q$);
 if changed=d then raise exception 'FUSSBALL_CARDS: market predicate anchor missing';end if;execute changed;
end$$;
create or replace view public.match_assist_status as
select m.id as match_id,m.round_id,r.season,r.number as round_number,m.played_on,
 h.name as home_name,h.short_name as home_short,h.logo_url as home_logo,a.name as away_name,a.short_name as away_short,a.logo_url as away_logo,m.home_goals,m.away_goals,
 case when m.statistics_status in('unavailable_historical','pending_cards')then null::bigint else count(g.id)filter(where not g.is_own_goal)end as golov,
 case when m.statistics_status in('unavailable_historical','pending_cards')then null::bigint else count(g.id)filter(where not g.is_own_goal and not g.is_penalty and g.assist_player_id is null and g.assist_none_confirmed_at is null)end as brez_asistence,
 m.home_team_id,m.away_team_id,r.competition_id,
 case when m.statistics_status in('unavailable_historical','pending_cards')then null::timestamptz else public.asistence_odprte_do(m.id)end as glasovanje_do,
 case when m.statistics_status in('unavailable_historical','pending_cards')then false else coalesce(public.asistence_odprte_do(m.id)>now(),true)end as glasovanje_odprto,
 m.statistics_status,m.statistics_reason
from public.matches m join public.rounds r on r.id=m.round_id join public.teams h on h.id=m.home_team_id join public.teams a on a.id=m.away_team_id left join public.goals g on g.match_id=m.id
where m.imported_at is not null or m.statistics_status in('unavailable_historical','pending_cards')
group by m.id,r.season,r.number,r.competition_id,h.name,h.short_name,h.logo_url,a.name,a.short_name,a.logo_url;
create or replace view public.sezone as
select r.season,count(distinct r.id)::int as krogov,
 count(distinct m.id)filter(where m.imported_at is not null or m.statistics_status in('unavailable_historical','pending_cards'))::int as odigranih,
 max(r.played_on)as zadnji_dan,bool_or(r.played_on>=current_date)as tekoca,r.competition_id,
 count(distinct m.id)filter(where m.imported_at is not null)::int as statistics_complete_matches,
 count(distinct m.id)filter(where m.statistics_status in('unavailable_historical','pending_cards'))::int as statistics_unavailable_matches
from public.rounds r left join public.matches m on m.round_id=r.id group by r.season,r.competition_id;

-- Safe service inventory: originals and mappings are available only to replay RPC.
create function public.get_fussball_card_policy(p_competition_id bigint)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare p private_fussball.card_policies;
begin
 perform private_fussball.service();select * into p from private_fussball.card_policies where competition_id=p_competition_id;
 return jsonb_build_object('installed',p.competition_id is not null,'enabled',private_fussball.enabled(p_competition_id),'source_policy',case when p.competition_id is not null then 'fussball-community-cards-v1'end,'current_code',p.current_code,'archive_codes',to_jsonb(p.archive_codes));
end$$;
create function public.check_fussball_card_readiness(p_competition_id bigint,p_code text)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare pending jsonb;registered jsonb; policy jsonb;
begin
 perform private_fussball.scope(p_competition_id,p_code);policy:=public.get_fussball_card_policy(p_competition_id);
 select coalesce(jsonb_agg(jsonb_build_object('match_id',m.id,'report_id',cr.envelope->>'reportId','revision_sha256',cr.revision_sha256,'season',r.season,'round_id',r.id)order by m.id),'[]')into pending
 from matches m join rounds r on r.id=m.round_id join private_fussball.card_heads h on h.match_id=m.id join private_fussball.card_reports cr on cr.id=h.report_id where r.competition_id=p_competition_id and m.statistics_status='pending_cards';
 perform private_fussball.require(not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=p_competition_id and m.statistics_status='pending_cards'and not exists(select 1 from private_fussball.card_heads h join private_fussball.card_reports cr on cr.id=h.report_id where h.match_id=m.id and cr.competition_id=p_competition_id and cr.envelope->>'reportId'=m.zapisnik_id and cr.envelope->>'sourceUrl'=m.source_url and cr.envelope->>'season'=r.season and m.imported_at is null and not exists(select 1 from appearances where match_id=m.id)and not exists(select 1 from goals where match_id=m.id))),'unregistered or changed pending inventory');
 select coalesce(jsonb_agg(jsonb_build_object('match_id',cr.match_id,'report_id',cr.envelope->>'reportId','revision_sha256',cr.revision_sha256,'source_code',cr.source_code,
 'resolutions',private_fussball.resolution(cr.id)->'resolutions','resolution_sha256',private_fussball.resolution(cr.id)->>'resolution_sha256',
 'confirmed_resolutions',coalesce((select jsonb_object_agg(e.event_key,c->>'source_id'order by e.event_key)from private_fussball.card_events e cross join lateral jsonb_array_elements(cr.candidates)c where e.report_id=cr.id and e.official_player_id is null and e.confirmed_player_id=(c->>'player_id')::bigint),'{}'::jsonb),
 'applied_resolution_sha256',h.applied_resolution_sha256,'applied_at',h.applied_at,'status',case when m.statistics_status='pending_cards'then'pending'when h.applied_at is not null then'applied'else'registered'end,'statistics_status',m.statistics_status,'imported_at',m.imported_at)order by cr.match_id),'[]')into registered
 from private_fussball.card_heads h join private_fussball.card_reports cr on cr.id=h.report_id join matches m on m.id=h.match_id where cr.competition_id=p_competition_id;
 return policy||jsonb_build_object('pending_reports',pending,'registered_reports',registered,'pending_inventory_sha256',private_fussball.sha(pending::text));
end$$;

-- Admission binds complete current/archive source replay and durable nightly cache
-- proof to all played fixtures, exact pending revisions and untouched opening.
create function private_fussball.admission_state(cid bigint)returns text language sql stable security definer set search_path=public,pg_temp as $$
 select private_fussball.sha(jsonb_build_object('native',private_historical_statistics.state_sha256(cid),'heads',coalesce((select jsonb_agg(to_jsonb(h) order by h.match_id)from private_fussball.card_heads h join private_fussball.card_reports r on r.id=h.report_id where r.competition_id=cid),'[]'),'policy',(select to_jsonb(p)from private_fussball.card_policies p where p.competition_id=cid))::text)
$$;
create function public.record_fussball_card_admission(p_competition_id bigint,p_code text,p_manifest jsonb,p_sha256 text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare c competitions;p private_fussball.card_policies;ready jsonb;opening rounds;x jsonb;expected integer;actual integer;
begin
 perform private_fussball.scope(p_competition_id,p_code);
 select * into strict c from competitions where id=p_competition_id for update;
 select * into strict p from private_fussball.card_policies where competition_id=c.id;
 lock table players,rounds,matches,appearances,goals,fantasy_teams in share mode;
 ready:=public.check_fussball_card_readiness(c.id,p_code);
 perform private_fussball.require(not c.active and p_code=p.current_code and not exists(select 1 from fantasy_teams where competition_id=c.id)and p_manifest->>'version'='1'and p_manifest->>'currentCode'=p.current_code and p_manifest->'archiveCodes'=to_jsonb(p.archive_codes)
 and p_manifest->>'sourceProofSha256'~'^[a-f0-9]{64}$'and p_manifest->>'nightlyCacheSha256'~'^[a-f0-9]{64}$'and p_manifest->>'pendingInventorySha256'=ready->>'pending_inventory_sha256'
 and p_sha256=private_fussball.sha(private_fussball.canonical_json(p_manifest))and jsonb_typeof(p_manifest->'playedReports')='array'and jsonb_array_length(p_manifest->'playedReports')>0,'bound full source/cache/inventory proof required');
 select * into strict opening from rounds where id=(p_manifest->>'openingRoundId')::bigint and competition_id=c.id and season=split_part(p.current_code,':',2);
 perform private_fussball.require(opening.deadline_at>clock_timestamp()and opening.played_on>=(clock_timestamp()at time zone'Europe/Berlin')::date and opening.lineups_locked_at is null and exists(select 1 from matches where round_id=opening.id)
 and not exists(select 1 from matches where round_id=opening.id and(imported_at is not null or zapisnik_id is not null or home_goals<>0 or away_goals<>0 or statistics_status<>'available' or played_on is null or played_on<(clock_timestamp()at time zone'Europe/Berlin')::date))
 and not exists(select 1 from fantasy_lineups where round_id=opening.id),'untouched future opening required');
 perform private_fussball.require(not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=c.id and m.statistics_status='unavailable_historical'),'historical exclusion policy cannot be reused');
 perform private_fussball.require(not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=c.id and(m.imported_at is not null or m.statistics_status='pending_cards')and not m.kontumacija and not exists(select 1 from jsonb_array_elements(p_manifest->'playedReports')x where(x->>'matchId')::bigint=m.id and x->>'reportId'=m.zapisnik_id)),'every already played or pending native report must appear in admission inventory');
 -- Every played date has exactly one complete or registered-red report. A true
 -- parser rejection (including an empty historical report) remains a hold.
 perform private_fussball.require(not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=c.id and(r.season=split_part(p.current_code,':',2)or r.season in(select split_part(v,':',2)from unnest(p.archive_codes)v))and m.played_on<(clock_timestamp()at time zone'Europe/Berlin')::date and not m.kontumacija
 and(m.statistics_status not in('available','pending_cards')or(m.statistics_status='available'and(m.imported_at is null or exists(select 1 from unnest(m.import_warnings)w where w like 'zapisnik nepopoln%')))
 or not exists(select 1 from jsonb_array_elements(p_manifest->'playedReports')x where(x->>'matchId')::bigint=m.id and x->>'reportId'=m.zapisnik_id and(m.statistics_status<>'pending_cards'or exists(select 1 from private_fussball.card_heads h join private_fussball.card_reports cr on cr.id=h.report_id where h.match_id=m.id and x->>'revisionSha256'=cr.revision_sha256))))),'full played fixture coverage required');
 for x in select value from jsonb_array_elements(p_manifest->'playedReports')loop
  perform private_fussball.require(exists(select 1 from matches m join rounds r on r.id=m.round_id where m.id=(x->>'matchId')::bigint and r.competition_id=c.id and m.zapisnik_id=x->>'reportId'and(m.imported_at is not null or m.statistics_status='pending_cards')and not m.kontumacija),'proof contains foreign/unplayed report');
  perform private_fussball.require(not exists(select 1 from matches m where m.id=(x->>'matchId')::bigint and m.statistics_status='available'and(m.zapisnik_id!~'^de-fussball-[A-Z0-9]{32}$'or exists(select 1 from(values(m.home_team_id),(m.away_team_id))t(tid)where(select count(*)from appearances a where a.match_id=m.id and a.team_id=t.tid and a.started)<>11 or(select count(*)from appearances a where a.match_id=m.id and a.team_id=t.tid and a.started and a.is_goalkeeper)<>1)or m.home_goals<>(select count(*)from goals g where g.match_id=m.id and(g.team_id=m.home_team_id)<>g.is_own_goal)or m.away_goals<>(select count(*)from goals g where g.match_id=m.id and(g.team_id=m.away_team_id)<>g.is_own_goal)or exists(select 1 from goals g where g.match_id=m.id and not exists(select 1 from appearances a where a.match_id=m.id and a.player_id=g.scorer_id and a.team_id=g.team_id)))),'complete native XI/keeper/goal ledger required for every available report');
 end loop;
 perform private_fussball.require((select count(distinct x->>'matchId')from jsonb_array_elements(p_manifest->'playedReports')x)=jsonb_array_length(p_manifest->'playedReports')
 and exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=c.id and r.season=split_part(p.current_code,':',2)and(m.imported_at is not null or m.statistics_status='pending_cards'))
 and not exists(select 1 from unnest(p.archive_codes)v where not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=c.id and r.season=split_part(v,':',2)and(m.imported_at is not null or m.statistics_status='pending_cards'))),'distinct complete current and archive native inventory required');
 update competitions set prvi_fantasy_krog=opening.number where id=c.id;
 insert into private_fussball.card_admissions(competition_id,manifest,manifest_sha256,state_sha256)values(c.id,p_manifest,p_sha256,private_fussball.admission_state(c.id))on conflict(competition_id)do update set manifest=excluded.manifest,manifest_sha256=excluded.manifest_sha256,state_sha256=excluded.state_sha256,registered_at=clock_timestamp();
 return jsonb_build_object('registered',true,'manifest_sha256',p_sha256,'pending_inventory_sha256',ready->>'pending_inventory_sha256','opening_round_id',opening.id);
end$$;

create function private_fussball.canonical_json(v jsonb)returns text language plpgsql immutable set search_path=pg_catalog as $$
#variable_conflict use_column

declare result text;
begin
 case jsonb_typeof(v)
 when 'object'then select '{'||coalesce(string_agg(to_jsonb(key)::text||':'||private_fussball.canonical_json(value),','order by key collate "C"),'')||'}'into result from jsonb_each(v);
 when 'array'then select '['||coalesce(string_agg(private_fussball.canonical_json(value),','order by ordinal),'')||']'into result from jsonb_array_elements(v)with ordinality x(value,ordinal);
 else result:=v::text;end case;return result;
end$$;

create function private_fussball.policy_guard()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare p private_fussball.card_policies;
begin
 select * into p from private_fussball.card_policies where competition_id=new.id;
 if p.competition_id is null then
  perform private_fussball.require(new.source_policy is distinct from 'fussball-community-cards-v1','source policy requires service-installed binding');return new;
 end if;
 perform private_fussball.require(new.source='fussball-public'and new.source_policy='fussball-community-cards-v1'and new.source_league_code=p.current_code and exists(select 1 from countries where id=new.country_id and code='DE'),'installed source policy immutable');
 if tg_op='UPDATE'and old.active then
  perform private_fussball.require(row(new.slug,new.country_id,new.prvi_fantasy_krog,new.date_only_deadline_policy)is not distinct from row(old.slug,old.country_id,old.prvi_fantasy_krog,old.date_only_deadline_policy),'active source launch configuration immutable');
 elsif new.active then
  perform private_fussball.require(exists(select 1 from private_fussball.card_activation_context a where a.competition_id=new.id and a.xid=txid_current()and a.state_sha256=private_fussball.admission_state(new.id)),'full source/cache admission and dedicated activation required');
 end if;return new;
end$$;
create trigger fussball_card_policy_guard before insert or update on public.competitions for each row execute function private_fussball.policy_guard();
-- The old immutable-historical gate delegates ONLY a separately installed card
-- policy. The card trigger above requires its own fresh exact source admission.
do $$declare d text;changed text;begin
 d:=pg_get_functiondef('private_historical_statistics.guard_activation()'::regprocedure);
 changed:=replace(d,'if p.id is null and new.source_policy is null then return new;end if;', $q$if new.source_policy='fussball-community-cards-v1' and exists(select 1 from private_fussball.card_policies fp where fp.competition_id=new.id and fp.current_code=new.source_league_code)and not exists(select 1 from private_historical_statistics.installed_policies where competition_id=new.id)and not exists(select 1 from private_historical_statistics.markers where competition_id=new.id)then return new;end if;
 if p.id is null and new.source_policy is null then return new;end if;$q$);
 if changed=d then raise exception 'FUSSBALL_CARDS: historical policy activation anchor missing';end if;execute changed;
end$$;
alter function public.vklopi_ligo_sredi_sezone(text)set schema private_fussball;
revoke all on function private_fussball.vklopi_ligo_sredi_sezone(text)from public,anon,authenticated,service_role;
create function public.vklopi_ligo_sredi_sezone(p_slug text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare c competitions;a private_fussball.card_admissions;p private_fussball.card_policies;r rounds;
begin
 select * into c from competitions where slug=p_slug for update;
 if c.source_policy is distinct from'fussball-community-cards-v1'then return private_fussball.vklopi_ligo_sredi_sezone(p_slug);end if;
 -- Existing service-granted internal callers (including DFB release wrappers)
 -- retain their original role contract; only this new policy requires JWT scope.
 perform private_fussball.service();
 perform private_fussball.scope(c.id,c.source_league_code);
 select * into strict p from private_fussball.card_policies where competition_id=c.id;
 if c.active then return jsonb_build_object('vklopljena',false,'razlog','Liga je že vklopljena.');end if;
 lock table players,rounds,matches,appearances,goals,fantasy_teams in share mode;
 select * into a from private_fussball.card_admissions where competition_id=c.id;
 perform private_fussball.require(a.competition_id is not null and a.registered_at>clock_timestamp()-interval'1 day'and a.state_sha256=private_fussball.admission_state(c.id),'fresh unchanged full source/cache admission required');
 select * into strict r from rounds where id=(a.manifest->>'openingRoundId')::bigint and competition_id=c.id;
 perform private_fussball.require(r.deadline_at>clock_timestamp()and r.played_on>=(clock_timestamp()at time zone'Europe/Berlin')::date and r.lineups_locked_at is null and c.prvi_fantasy_krog=r.number and not exists(select 1 from fantasy_teams where competition_id=c.id),'untouched future opening and no fantasy activity required');
 insert into private_fussball.card_activation_context values(c.id,txid_current(),a.state_sha256);
 update competitions set active=true where id=c.id;
 delete from private_fussball.card_activation_context where competition_id=c.id;
 return jsonb_build_object('vklopljena',true,'razlog',null,'prvi_krog',r.number,'razlika',0,'source_policy','fussball-community-cards-v1','admission_sha256',a.manifest_sha256);
end$$;

revoke all on all functions in schema private_fussball from public,anon,authenticated,service_role;
revoke all on function public.install_fussball_card_policy(bigint,text,text[]),public.register_fussball_card_report(bigint,text,bigint,jsonb,jsonb),public.get_fussball_card_replay_jobs(bigint,text,integer,bigint),public.apply_fussball_card_report(bigint,text,bigint,text,text,jsonb,jsonb,text[]),public.get_fussball_card_policy(bigint),public.check_fussball_card_readiness(bigint,text),public.record_fussball_card_admission(bigint,text,jsonb,text),public.vklopi_ligo_sredi_sezone(text)from public,anon,authenticated;
grant execute on function public.install_fussball_card_policy(bigint,text,text[]),public.register_fussball_card_report(bigint,text,bigint,jsonb,jsonb),public.get_fussball_card_replay_jobs(bigint,text,integer,bigint),public.apply_fussball_card_report(bigint,text,bigint,text,text,jsonb,jsonb,text[]),public.get_fussball_card_policy(bigint),public.check_fussball_card_readiness(bigint,text),public.record_fussball_card_admission(bigint,text,jsonb,text),public.vklopi_ligo_sredi_sezone(text)to service_role;
revoke all on function public.match_fussball_card_votes(bigint),public.vote_fussball_card(bigint,bigint),public.fussball_round_has_pending(bigint)from public,anon,authenticated;
grant execute on function public.match_fussball_card_votes(bigint)to anon,authenticated,service_role;
grant execute on function public.vote_fussball_card(bigint,bigint)to authenticated;
grant execute on function public.fussball_round_has_pending(bigint)to authenticated,service_role;

-- A missing red recipient can change minutes and automatic substitutes. Do not
-- publish a provisional absence/zero or cache fantasy results from that guess.
do $$declare d text;changed text;begin
 d:=pg_get_functiondef('public.osvezi_tocke_krogov(bigint[])'::regprocedure);
 changed:=replace(d,'where round_id = v_krog;', 'where round_id = v_krog and not public.fussball_round_has_pending(v_krog);');
 -- Only the INSERT SELECT predicate changes; DELETE must still remove old rows.
 changed:=replace(changed,'delete from tocke_krogov where round_id = v_krog and not public.fussball_round_has_pending(v_krog);','delete from tocke_krogov where round_id = v_krog;');
 if changed=d then raise exception 'FUSSBALL_CARDS: fantasy recompute anchor missing';end if;execute changed;
end$$;
create or replace view public.fantasy_round_points as
select tk.fantasy_team_id,tk.round_id,r.season,r.number as round_number,
 case when public.fussball_round_has_pending(r.id)then null::numeric else tk.points end as points,
 tk.transfers,tk.penalty,ft.competition_id,public.fussball_round_has_pending(r.id)as statistics_pending
from public.tocke_krogov tk join public.rounds r on r.id=tk.round_id join public.fantasy_teams ft on ft.id=tk.fantasy_team_id
union all
select ft.id,r.id,r.season,r.number,null::numeric,coalesce(tr.transfers,0),coalesce(tr.penalty,0),ft.competition_id,true as statistics_pending
from public.fantasy_teams ft join public.rounds r on r.competition_id=ft.competition_id
left join public.fantasy_transfers tr on tr.fantasy_team_id=ft.id and tr.round_id=r.id
where public.fussball_round_has_pending(r.id)and exists(select 1 from public.fantasy_lineups fl where fl.round_id=r.id and fl.fantasy_team_id=ft.id)
and not exists(select 1 from public.tocke_krogov tk where tk.fantasy_team_id=ft.id and tk.round_id=r.id);
grant execute on function public.fussball_round_has_pending(bigint)to anon;
create or replace view public.fantasy_team_standings as
select ft.id as fantasy_team_id,ft.name as team_name,
 case when ft.hisna then ft.display_name else pr.display_name end as owner_name,
 pr.created_at as owner_registered_at,ft.created_at as team_created_at,
 coalesce(sum(frp.points),0::numeric)as total_points,coalesce(max(frp.points),0::numeric)as best_round,
 count(*)filter(where frp.points>0)as rounds_played,ft.competition_id,ft.hisna,
 case when ft.hisna then null else ft.owner_id end as owner_id,
 coalesce(bool_or(frp.statistics_pending),false)as statistics_pending
from public.fantasy_teams ft join public.profiles pr on pr.id=ft.owner_id
left join public.fantasy_round_points frp on frp.fantasy_team_id=ft.id
group by ft.id,ft.name,pr.display_name,pr.created_at,ft.created_at,ft.competition_id,ft.hisna,ft.owner_id;
create or replace view public.fantasy_round_standings as
select frp.round_id,frp.season,frp.round_number,frp.fantasy_team_id,ft.name as team_name,
 case when ft.hisna then ft.display_name else pr.display_name end as owner_name,
 frp.points,frp.transfers,frp.penalty,
 case when frp.statistics_pending then null::bigint else rank()over(partition by frp.competition_id,frp.round_id order by frp.points desc)end as rank,
 frp.competition_id,case when ft.hisna then null else ft.owner_id end as owner_id,frp.statistics_pending
from public.fantasy_round_points frp join public.fantasy_teams ft on ft.id=frp.fantasy_team_id join public.profiles pr on pr.id=ft.owner_id
where frp.statistics_pending or exists(select 1 from public.player_scores ps where ps.round_id=frp.round_id);

revoke all on function public.defer_fussball_card_replay(bigint,text,bigint,text,text,text)from public,anon,authenticated;
grant execute on function public.defer_fussball_card_replay(bigint,text,bigint,text,text,text)to service_role;
-- Private schema grants are the primary boundary; RLS adds defense in depth.
do $$declare t record;begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private_fussball'and c.relkind='r'loop execute format('alter table private_fussball.%I enable row level security',t.relname);end loop;
end$$;
