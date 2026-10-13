-- Potrjeni poznavalci v administraciji: kdo je poznavalec kluba ali lige,
-- odkar in ali vloga še velja. Odobrene prošnje (status klub/liga) in
-- poznavalci lige, ki jih je admin dodelil neposredno v seznamu uporabnikov
-- (brez prošnje). Sam nastavljen insider_team_id brez odobrene prošnje ni
-- potrjen in ga seznam ne kaže.

create or replace function public.admin_potrjeni_poznavalci()
returns table (
  user_id uuid,
  display_name text,
  email text,
  obseg text,
  competition_id bigint,
  competition_name text,
  team_id bigint,
  team_name text,
  vloga text,
  potrjeno_at timestamptz,
  velja boolean,
  glasov int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  with potrjeni as (
    -- zadnja odobritev na človeka, ligo in obseg
    (select distinct on (p.user_id, p.competition_id, p.status)
           p.user_id, p.status as obseg, p.competition_id, p.team_id, p.vloga, p.decided_at
      from poznavalec_prosnje p
     where p.status in ('klub', 'liga')
     order by p.user_id, p.competition_id, p.status, p.decided_at desc nulls last)
    union all
    -- poznavalec lige, dodeljen brez prošnje
    select pr.id, 'liga', pr.insider_competition_id, null::bigint, null::text, null::timestamptz
      from profiles pr
     where pr.insider_competition_id is not null
       and not exists (select 1 from poznavalec_prosnje p
                        where p.user_id = pr.id and p.status = 'liga'
                          and p.competition_id = pr.insider_competition_id)
  )
  select x.user_id, pr.display_name, u.email::text, x.obseg,
         x.competition_id, c.name, x.team_id, t.name, x.vloga, x.decided_at,
         case x.obseg when 'liga' then pr.insider_competition_id is not distinct from x.competition_id
                      else pr.insider_team_id is not distinct from x.team_id end,
         ((select count(*) from position_votes pv where pv.voter_id = x.user_id)
          + (select count(*) from assist_votes av where av.voter_id = x.user_id))::int
    from potrjeni x
    join profiles pr on pr.id = x.user_id
    join auth.users u on u.id = x.user_id
    join competitions c on c.id = x.competition_id
    left join teams t on t.id = x.team_id
   order by c.name, x.obseg desc, x.decided_at desc nulls last;
end;
$$;

revoke all on function public.admin_potrjeni_poznavalci() from public, anon;
grant execute on function public.admin_potrjeni_poznavalci() to authenticated;
