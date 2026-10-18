-- Preserve the existing strict Nord/West route when no policy is opted in.
create or replace function private_historical_statistics.guard_activation()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare p private_historical_statistics.policies%rowtype;i private_historical_statistics.installed_policies%rowtype;
begin
 select * into i from private_historical_statistics.installed_policies where competition_id=new.id;
 select * into p from private_historical_statistics.policies where id=i.policy_id or document->>'competitionSlug'=new.slug order by id limit 1;
 if p.id is null and new.source_policy is null then return new;end if;
 if not new.active then return new;end if;
 -- Nord/West were ordinary strict v1/v2 targets before their optional policy
 -- catalog entries existed. Preserve only that exact unopted tuple. Installing
 -- any historical state, or clearing an old opt-in, still requires the policy
 -- authorization path below. The canonical regional RPC remains unchanged.
 if tg_op='UPDATE' and new.slug in('de-regionalliga-nord','de-regionalliga-west')
    and new.slug=old.slug and new.source='dfb' and old.source='dfb'
    and new.source_policy is null and old.source_policy is null
    and new.source_league_code=substring(new.slug from 4)||'/2026-2027'
    and exists(select 1 from public.countries where id=new.country_id and code='DE')
    and i.competition_id is null
    and not exists(select 1 from private_historical_statistics.markers where competition_id=new.id)
    and not exists(select 1 from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id=new.id and m.statistics_status='unavailable_historical')
 then return new;end if;
 if p.id is null or new.slug is distinct from p.document->>'competitionSlug'or new.source is distinct from p.document->>'provider'or new.source_policy is distinct from p.document->>'sourcePolicy'then raise exception 'HISTORICAL_POLICY: invalid activation tuple';end if;
 if tg_op='UPDATE'and old.active then
  if row(new.slug,new.source,new.source_policy,new.source_league_code,new.country_id,new.prvi_fantasy_krog,new.date_only_deadline_policy)is distinct from row(old.slug,old.source,old.source_policy,old.source_league_code,old.country_id,old.prvi_fantasy_krog,old.date_only_deadline_policy)then raise exception 'HISTORICAL_POLICY: active opt-in source/launch configuration immutable';end if;
  return new;
 end if;
 if tg_op='UPDATE'and(to_jsonb(new)-'active')is distinct from(to_jsonb(old)-'active')then raise exception 'HISTORICAL_POLICY: configure first round/policy before transactional release authorization';end if;
 if not exists(select 1 from private_historical_statistics.release_authorizations a where a.competition_id=new.id and a.authorized_xid=txid_current()and a.policy_id=p.id and a.state_sha256=private_historical_statistics.state_sha256(new.id))then raise exception 'HISTORICAL_POLICY: dedicated verified transactional release authorization required';end if;
 return new;
end $$;
