-- Mini liga: povabilo je povezava, ne koda.
--
-- Dve mini ligi s tremi clani po petih dneh: pot je bila ustvari -> kopiraj
-- besedilo s kodo -> prijatelj se registrira -> sestavi ekipo -> najde Mini
-- lige -> VTIPKA kodo. Sest korakov, zadnji pa je tipkanje sestih znakov po
-- tem, ko je clovek ze opravil najtezji del.
--
-- Zdaj: slff.eu/l/KODA. Stran mora pokazati, v katero ligo vabi, se preden
-- se clovek prijavi — sicer klikne v prazno. Mini lige so berljive samo
-- clanom, zato ta klic razkrije le ime, lastnika in stevilo ekip; kodo ima
-- kdor jo ima, in to je ze danes edina "pravica" za vstop.

create or replace function public.mini_liga_po_kodi(p_koda text)
returns table (id bigint, name text, owner_name text, ekip int)
language sql
stable
security definer
set search_path = public
as $$
  select ml.id, ml.name, pr.display_name,
         (select count(*)::int from mini_liga_clani c where c.mini_liga_id = ml.id)
  from mini_lige ml
  left join profiles pr on pr.id = ml.owner_id
  where ml.code = upper(btrim(p_koda));
$$;
revoke all on function public.mini_liga_po_kodi(text) from public;
grant execute on function public.mini_liga_po_kodi(text) to anon, authenticated;

-- Admin: ali se povabila prijemajo. Dve stevili v pasu zivosti.
drop function if exists public.admin_zivost();
create function public.admin_zivost()
returns table (
  registriranih int,
  aktivnih_7dni int,
  aktivnih_30dni int,
  z_veljavno_ekipo int,
  prijavljenih_7dni int,
  mini_lig int,
  v_mini_ligah int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere statistiko.';
  end if;

  return query
  with dejanja as (
    select voter_id as kdo, created_at as kdaj from assist_votes
    union all select voter_id, created_at from position_votes
    union all select user_id, created_at from chat_messages
    union all select user_id, created_at from player_reports
    union all select owner_id, roster_updated_at from fantasy_teams
     where roster_updated_at is not null
  )
  select
    (select count(*) from auth.users)::int,
    (select count(distinct kdo) from dejanja
      where kdaj > now() - interval '7 days' and kdo is not null)::int,
    (select count(distinct kdo) from dejanja
      where kdaj > now() - interval '30 days' and kdo is not null)::int,
    (select count(distinct ft.owner_id) from fantasy_teams ft
      where roster_je_veljaven(ft.id))::int,
    (select count(*) from auth.users
      where last_sign_in_at > now() - interval '7 days')::int,
    (select count(*) from mini_lige)::int,
    (select count(distinct ft.owner_id) from mini_liga_clani c
       join fantasy_teams ft on ft.id = c.fantasy_team_id)::int;
end $$;
grant execute on function public.admin_zivost() to authenticated;
