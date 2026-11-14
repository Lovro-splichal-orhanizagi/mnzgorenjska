-- Katere ekipe imajo igralca (SLF-360, Nejc 9. 11. 2026: "just the one player").
--
-- Ožja izjema od zasebnih sestav (20261012137100): preverjen igralec na
-- svojem profilu vidi imena ekip, ki ga imajo v zadnjem zaklenjenem krogu,
-- s povezavo na javno stran ekipe (ime, lastnik, točke, mesto). Nič drugega
-- iz sestave: ne soigralcev, kapetana, klopi, pripomočkov ne posnetka.
--
-- Zakaj le svoj profil (in admin): če bi seznam videl vsak preverjen na
-- vsakem igralcu, bi s pregledom vseh igralcev sestavil celotne kadre ekip.
-- Svoj profil izda samo relacijo "ta ekipa ima mene".
--
-- Vse ostalo podeduje od `izbranost_igralca`: `vidi_izbranost()` (aktivna,
-- nepotečena pravica, stikalo, odrasla oseba; preklic velja takoj), vrstice
-- osebe brez mladinskih in anonimiziranih, ista liga in krog kot števec.
-- Seznam je le tam, kjer je števec (`owners` ni NULL): pod 5 človeškimi
-- ekipami ga ni, hišne ekipe se ne naštejejo. Strežnik (brez JWT) ne dobi
-- nič, zato ga SSR in kartice ne morejo izdati.
create or replace function public.ekipe_z_igralcem(p_player_id bigint, p_od integer default 0, p_koliko integer default 25)
returns table (fantasy_team_id bigint, ime text, competition_id bigint, competition_slug text,
               liga text, krog integer, skupaj integer)
language plpgsql stable security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if p_player_id is null or auth.uid() is null then
    return;
  end if;

  return query
  with lige as (
    select i.player_id, i.competition_id, i.liga, i.krog
      from izbranost_igralca(p_player_id) i
     where (i.lastni or is_admin()) and i.owners is not null
  ), ekipe as (
    select ft.id, ft.name, l.competition_id, c.slug, l.liga, l.krog
      from lige l
      join competitions c on c.id = l.competition_id
      -- isti krog kot števec v `izbranost_igralca`
      join lateral (
        select r.id from rounds r
         where r.competition_id = l.competition_id and r.lineups_locked_at is not null
         order by r.season desc, r.number desc
         limit 1
      ) r on true
      join fantasy_lineups fl on fl.round_id = r.id and fl.player_id = l.player_id
      join fantasy_teams ft on ft.id = fl.fantasy_team_id and not ft.hisna
  )
  select e.id, e.name, e.competition_id, e.slug, e.liga, e.krog, (count(*) over ())::integer
    from ekipe e
   order by e.competition_id, lower(e.name), e.id
  offset greatest(coalesce(p_od, 0), 0)
   limit least(greatest(coalesce(p_koliko, 25), 1), 50);
end;
$$;
revoke all on function public.ekipe_z_igralcem(bigint, integer, integer) from public, anon;
grant execute on function public.ekipe_z_igralcem(bigint, integer, integer) to authenticated, service_role;

-- Iskanje ekip po igralcu v posnetku kroga (PK je round_id, fantasy_team_id, player_id).
create index if not exists fantasy_lineups_krog_igralec on public.fantasy_lineups (round_id, player_id);
