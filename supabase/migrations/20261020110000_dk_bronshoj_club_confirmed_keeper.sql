-- Club-confirmed position, not a shirt-number guess. Brønshøj's March 2026
-- interview identifies Lucas Chang-Andersen as its goalkeeper:
-- https://www.bronshojboldklub.dk/nyheder/jubilaeum-100-kampe-for-broenshoej-boldklub/
-- Exact full name corroborated by the club's earlier interview:
-- https://www.bronshojboldklub.dk/nyheder/divisionsholdet/optakt-pausen-er-slut/
-- DBU lists him with shirt 20; its shirt-1 hint leaves him in midfield.
-- Do not activate, reactivate players or rewrite match statistics here.
do $$
declare
  c public.competitions%rowtype;
  player_ids bigint[];
begin
  select * into c from public.competitions
    where slug = 'dk-3-division' for update;
  if c.id is null or c.active then return; end if;
  if c.source <> 'dbu' or c.source_league_code <> '508657' then
    raise exception 'Danish keeper correction: competition tuple changed';
  end if;
  select array_agg(p.id order by p.id) into player_ids
    from public.players p join public.teams t on t.id = p.team_id
    where p.competition_id = c.id and t.name = 'Brønshøj'
      and p.full_name = 'Chang-Andersen Lucas';
  -- A fresh database has no imported players yet. Never create a player.
  if coalesce(cardinality(player_ids), 0) = 0 then return; end if;
  if cardinality(player_ids) <> 1 then
    raise exception 'Danish keeper correction: player identity is ambiguous';
  end if;
  -- Preserve club, admin, voting and report decisions. The current target is
  -- MID/ugibanje; a conflicting protected decision remains a launch blocker.
  update public.players set position = 'GK', position_source = 'klub'
    where id = player_ids[1] and position_source in ('neznano', 'ugibanje');
end $$;
