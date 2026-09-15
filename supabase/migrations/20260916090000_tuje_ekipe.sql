-- Tuja ekipa je vidna sele, ko se krog zaklene.
--
-- V klepetu sta si dve prosnji nasprotovali: "Naredite tako da se vidi ekipe
-- od drugih igralcev" in "ce bi videli druge ekipe, potem igra nima smisla".
-- Oboje drzi — a vsako na svoji strani roka. Pred rokom je tuja postava
-- napotek, kaj kupiti; po roku je ni vec mogoce prepisati in je samo se
-- zgodba o tem, kdo je koga uganil. Zato tu ni nastavitve, ampak rok.

-- 1. Tekoci kader ni vec javen.
--    Politika "javno branje" je dovoljevala, da ga z anonimnim kljucem prebere
--    kdorkoli — vmesnik ga ni kazal, API pa ga je vseeno vracal. Skrivnost je
--    bila torej le navidezna, in to na slabsi nacin: videl jo je tisti, ki je
--    znal poklicati API, ne pa tisti, ki je vprasal.
--    Pogledi nad to tabelo (player_standings, player_season_standings,
--    fantasy_team_budget, fantasy_team_wealth) tecejo s pravicami lastnika
--    pogleda, zato izbranost igralcev ostane izracunana kot doslej.
drop policy if exists "javno branje" on public.fantasy_roster;

create policy "lastnik bere svoj kader" on public.fantasy_roster
  for select using (
    exists (
      select 1 from public.fantasy_teams t
       where t.id = fantasy_roster.fantasy_team_id
         and t.owner_id = auth.uid()
    )
    or public.is_admin()
  );

-- 2. Zaklenjena postava tuje ekipe.
--    Vrne prazno, kadar krog se ni zaklenjen — namesto napake, ker odsotnost
--    postave ni izjemno stanje, ampak obicajno stanje vsakega tekocega kroga.
create or replace function public.tuja_postava(p_team bigint, p_round bigint)
returns table (
  player_id  bigint,
  ime        text,
  klub       text,
  pozicija   text,
  mnozitelj  int,
  je_kapetan boolean,
  je_namestnik boolean,
  je_zacetnik boolean,
  tocke      numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select l.player_id,
         -- Uvoz iz nekaterih virov pusti `full_name` prazen, ime pa je
         -- takrat v obeh polovicah; brez tega bi igrisce kazalo prazne drese.
         coalesce(
           nullif(trim(p.full_name), ''),
           nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '')
         )::text,
         t.name::text,
         p.position::text,
         coalesce(u.mnozitelj, 0),
         l.is_captain,
         l.is_vice,
         l.is_starter,
         coalesce(s.points, 0)::numeric
    from public.fantasy_lineups l
    join public.players p on p.id = l.player_id
    left join public.teams t on t.id = p.team_id
    left join public.player_scores s
           on s.player_id = l.player_id and s.round_id = l.round_id
    left join public.ucinkovita_postava(p_team, p_round) u
           on u.player_id = l.player_id
   where l.fantasy_team_id = p_team
     and l.round_id = p_round
     and exists (
       select 1 from public.rounds r
        where r.id = p_round and r.lineups_locked_at is not null
     )
   order by (coalesce(u.mnozitelj, 0) = 0), l.bench_order nulls first, p.position;
$$;

revoke all on function public.tuja_postava(bigint, bigint) from public;
grant execute on function public.tuja_postava(bigint, bigint) to anon, authenticated;

comment on function public.tuja_postava(bigint, bigint) is
  'Postava tuje ekipe v zaklenjenem krogu. Dokler krog ni zaklenjen, vrne prazno.';
