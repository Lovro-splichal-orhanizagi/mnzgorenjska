-- Hitre zmage iz pregleda zmogljivosti (10. 10. 2026).

-- Tuji ključi brez indeksa: strani igralca, kluba in tekme iščejo gole po
-- strelcu/podajalcu in tekme po klubu, kar je bilo zaporedno branje tabele.
-- fantasy_roster(fantasy_team_id) pokriva že primarni ključ.
create index if not exists goals_scorer_idx on goals (scorer_id);
create index if not exists goals_assist_player_idx on goals (assist_player_id);
create index if not exists matches_home_team_idx on matches (home_team_id);
create index if not exists matches_away_team_idx on matches (away_team_id);

-- Število ekip po ligah za okno prvega obiska (PrviObisk.tsx). Prej je
-- odjemalec po straneh prenesel VSE vrstice fantasy_teams in jih seštel sam.
-- Hišne ekipe štejejo, kot so prej: v ligi štejejo povsod, tudi v številu ekip.
-- security_invoker: velja RLS na fantasy_teams (javno branje). Pogled z
-- group by ni posodobljiv, pravica je vseeno le branje.
create view stevilo_ekip_lig with (security_invoker = true) as
  select competition_id, count(*)::int as ekip
    from fantasy_teams
   group by competition_id;

revoke all on stevilo_ekip_lig from anon, authenticated;
grant select on stevilo_ekip_lig to anon, authenticated;
