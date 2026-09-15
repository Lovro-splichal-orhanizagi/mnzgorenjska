-- Pridružitev naj pove, ali se je kaj zgodilo.
--
-- Prva različica je vrnila le številko lige, vmesnik pa je vedno izpisal
-- "Pridružen." — tudi kadar je bila ekipa v ligi že prej in `on conflict do
-- nothing` ni vpisal ničesar. Človek je videl potrditev, lestvica pa se ni
-- spremenila; to je videti kot okvara.
--
-- Pokazalo se je ob uporabi strani: kliknil sem "Pridruži se" z ekipo, ki je
-- bila že član, in dobil potrditev brez učinka.
drop function if exists pridruzi_mini_ligi(text, bigint);

create or replace function pridruzi_mini_ligi(p_koda text, p_ekipa bigint)
returns table (mini_liga_id bigint, dodano boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_liga bigint;
  v_vrstic int;
begin
  if not exists (select 1 from fantasy_teams ft
                  where ft.id = p_ekipa and ft.owner_id = auth.uid()) then
    raise exception 'To ni tvoja ekipa.';
  end if;

  select id into v_liga from mini_lige where code = upper(btrim(p_koda));
  if v_liga is null then
    raise exception 'Mini lige s to kodo ni.';
  end if;

  insert into mini_liga_clani (mini_liga_id, fantasy_team_id)
  values (v_liga, p_ekipa)
  on conflict do nothing;
  get diagnostics v_vrstic = row_count;

  return query select v_liga, v_vrstic > 0;
end $$;

revoke all on function pridruzi_mini_ligi(text, bigint) from public;
grant execute on function pridruzi_mini_ligi(text, bigint) to authenticated;
