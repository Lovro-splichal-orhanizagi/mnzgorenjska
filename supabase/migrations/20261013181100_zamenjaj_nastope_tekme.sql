-- Zamenjava nastopov (in golov) tekme v eni transakciji.
--
-- Uvoz zapisnikov je stare nastope izbrisal in nove vstavil v dveh zahtevkih;
-- ob padcu vstavljanja jih je poskusil vrniti s tretjim. Ko je omrežje padlo
-- med obema (at-noe-gebietsliga-nordwest-waldviertel, tekma 148981, nočni
-- uvoz 12. 10. 2026: "VRAČANJE 30 starih nastopov NI USPELO"), je živa tekma
-- ostala s sedmimi goli in brez enega samega nastopa — brez točk za vse, ki
-- so igrali. Tu se zgodi vse ali nič.
--
-- `goli` je null, kadar se goli niso spremenili (asistence in glasovi ostanejo).
-- Manjkajoč ključ v vrstici dobi privzeto vrednost stolpca, kot pri vstavljanju
-- prek PostgREST.
create or replace function public.zamenjaj_nastope_tekme(
  p_match_id bigint,
  p_nastopi jsonb,
  p_goli jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from appearances where match_id = p_match_id;
  insert into appearances (
    match_id, player_id, team_id, shirt_number, started, minute_on, minute_off,
    minutes_played, goals, own_goals, penalties_scored, penalties_missed,
    penalties_saved, yellow_cards, red_cards, goals_conceded, clean_sheet, is_goalkeeper
  )
  select p_match_id, r.player_id, r.team_id, r.shirt_number,
         coalesce(r.started, false), coalesce(r.minute_on, 0), coalesce(r.minute_off, 90),
         coalesce(r.minutes_played, 0), coalesce(r.goals, 0), coalesce(r.own_goals, 0),
         coalesce(r.penalties_scored, 0), coalesce(r.penalties_missed, 0),
         coalesce(r.penalties_saved, 0), coalesce(r.yellow_cards, 0), coalesce(r.red_cards, 0),
         coalesce(r.goals_conceded, 0), coalesce(r.clean_sheet, false), coalesce(r.is_goalkeeper, false)
    from jsonb_to_recordset(coalesce(p_nastopi, '[]'::jsonb)) as r(
      player_id bigint, team_id bigint, shirt_number integer, started boolean,
      minute_on integer, minute_off integer, minutes_played integer, goals integer,
      own_goals integer, penalties_scored integer, penalties_missed integer,
      penalties_saved integer, yellow_cards integer, red_cards integer,
      goals_conceded integer, clean_sheet boolean, is_goalkeeper boolean
    );

  if p_goli is not null then
    delete from goals where match_id = p_match_id;
    insert into goals (match_id, scorer_id, team_id, minute, is_own_goal, is_penalty, score_home, score_away)
    select p_match_id, r.scorer_id, r.team_id, r.minute,
           coalesce(r.is_own_goal, false), coalesce(r.is_penalty, false), r.score_home, r.score_away
      from jsonb_to_recordset(p_goli) as r(
        scorer_id bigint, team_id bigint, minute integer, is_own_goal boolean,
        is_penalty boolean, score_home integer, score_away integer
      );
  end if;
end;
$$;

revoke all on function public.zamenjaj_nastope_tekme(bigint, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.zamenjaj_nastope_tekme(bigint, jsonb, jsonb) to service_role;
