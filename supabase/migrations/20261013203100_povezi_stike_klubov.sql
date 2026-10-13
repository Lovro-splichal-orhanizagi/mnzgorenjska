-- Stiki brez kluba (hrvaški, srbski) dobijo team_id: natančno ime kluba
-- (brez šumnikov in velikosti črk) med klubi z igralci v ligi stika. Le
-- enoznačni zadetki; ostali ostanejo prazni in gredo ob prijavi v vrsto admina.
update public.klub_stik s
   set team_id = m.team_id, updated_at = now()
  from (
    select k.id, min(t.id) as team_id, count(distinct t.id) as n
      from public.klub_stik k
      join public.competitions c on c.slug = k.liga_slug
      join public.players p on p.competition_id = c.id
      join public.teams t on t.id = p.team_id
     where k.team_id is null
       and lower(extensions.unaccent(btrim(t.name))) = lower(extensions.unaccent(btrim(k.klub)))
     group by k.id
  ) m
 where m.id = s.id and m.n = 1;
