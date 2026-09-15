-- Državna lestvica: vse ekipe vseh lig na enem mestu.
--
-- Zakaj: 15 od 17 lig ima po nekaj ekip. Liga s tremi ekipami ni tekmovanje
-- in manager v njej nima s čim primerjati svojega rezultata. Državna lestvica
-- mu da nasprotnike takoj, tudi kadar je njegova liga še prazna — brez tega
-- nova liga ostane mrtva, dokler se sama od sebe ne napolni.
--
-- Točkovanje je v vseh ligah isto, zato so surove točke poštene. Kar poštено
-- NI, je različno število odigranih krogov: liga, ki je začela teden prej,
-- ima več točk zgolj zato. Zato pogled ponudi oboje — skupne točke in
-- povprečje na krog — vmesnik pa naj privzeto razvršča po povprečju.
create or replace view lestvica_drzavna as
  select s.fantasy_team_id,
         s.team_name,
         s.owner_name,
         s.total_points,
         s.rounds_played,
         -- Ekipa brez odigranega kroga ima povprečje 0, ne deljenja z nič.
         case when s.rounds_played > 0
              then round(s.total_points / s.rounds_played, 2)
              else 0 end as points_per_round,
         s.best_round,
         c.id   as competition_id,
         c.slug as competition_slug,
         c.short_name as competition_short,
         c.name as competition_name,
         c.federation_short,
         c.federation_name
    from fantasy_team_standings s
    join competitions_view c on c.id = s.competition_id
   where c.active;

comment on view lestvica_drzavna is
  'Vse fantasy ekipe vseh aktivnih lig skupaj — da ima manager v redki ligi s čim primerjati rezultat.';

grant select on lestvica_drzavna to anon, authenticated;
