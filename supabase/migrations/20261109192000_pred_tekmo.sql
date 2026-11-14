-- Pred tekmo (SLF-373): poročilo preverjenemu igralcu pred njegovo naslednjo
-- tekmo. Le javna dejstva iz zapisnikov, ki so na strani že vidna (izidi,
-- goli, minute, kartoni), brez ocen oseb: nasprotnikovi igralci le po golih
-- in minutah (pozitivno), kartoni le za lastno ekipo (opozorilo zase).
-- Anonimizirani igralci ne nastopajo. Vidi ga le preverjen lastnik profila.

-- Zadnjih 5 odigranih tekem ekipe v ligi in sezoni (pomožna, ni javna).
create or replace function public.pred_tekmo_forma(p_liga bigint, p_sezona text, p_ekipa bigint)
returns jsonb language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(x order by x.datum desc), '[]'::jsonb) from (
    select coalesce(m.played_on, r.played_on) as datum,
           m.home_team_id = p_ekipa as doma,
           case when m.home_team_id = p_ekipa then m.home_goals else m.away_goals end as dani,
           case when m.home_team_id = p_ekipa then m.away_goals else m.home_goals end as prejeti,
           (select t.name from teams t where t.id = case when m.home_team_id = p_ekipa then m.away_team_id else m.home_team_id end) as proti
      from matches m join rounds r on r.id = m.round_id
     where r.competition_id = p_liga and r.season = p_sezona
       and p_ekipa in (m.home_team_id, m.away_team_id) and (izid_znan(m.imported_at, m.statistics_status) or m.kontumacija)
     order by coalesce(m.played_on, r.played_on) desc nulls last, m.id desc
     limit 5) x
$$;
revoke all on function public.pred_tekmo_forma(bigint, text, bigint) from public, anon, authenticated;

create or replace function public.pred_tekmo(p_player_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_glavni bigint;
  v_vrstica bigint;
  v_liga bigint;
  v_klub bigint;
  v_tekma record;
  v_nasprotnik bigint;
  v_sezona text;
begin
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  if v_glavni is null or not je_lastnik_profila(v_glavni) or not je_preverjen(v_glavni) then
    return null;
  end if;

  -- Najbližja neodigrana tekma čez vse vrstice osebe (v 10 dneh). Neodigrana ima
  -- 0:0 brez zapisnika; odigrana ima zapisnik ali je kontumacija (`izid_znan`).
  select p.id, p.competition_id, p.team_id, m.id as tekma, m.home_team_id, m.away_team_id,
         coalesce(m.played_on, r.played_on, (r.deadline_at at time zone 'Europe/Ljubljana')::date) as datum,
         r.number as krog
    into v_tekma
    from players p
    join rounds r on r.competition_id = p.competition_id
    join matches m on m.round_id = r.id and p.team_id in (m.home_team_id, m.away_team_id)
   where p.id = any (izlozba_vrstice(v_glavni))
     and p.anonimiziran_at is null and p.team_id is not null
     and not izid_znan(m.imported_at, m.statistics_status) and not m.kontumacija
     and coalesce(m.played_on, r.played_on, (r.deadline_at at time zone 'Europe/Ljubljana')::date)
         between (now() at time zone 'Europe/Ljubljana')::date
             and (now() at time zone 'Europe/Ljubljana')::date + 10
   order by datum, m.id
   limit 1;
  if v_tekma.tekma is null then
    return null;
  end if;

  v_vrstica := v_tekma.id;
  v_liga := v_tekma.competition_id;
  v_klub := v_tekma.team_id;
  v_nasprotnik := case when v_tekma.home_team_id = v_klub then v_tekma.away_team_id else v_tekma.home_team_id end;
  v_sezona := sezona_lige(v_liga);

  return jsonb_build_object(
    'tekma', jsonb_build_object(
      'id', v_tekma.tekma, 'datum', v_tekma.datum, 'krog', v_tekma.krog,
      'doma', v_tekma.home_team_id = v_klub,
      'liga', (select c.slug from competitions c where c.id = v_liga),
      'klub', (select jsonb_build_object('id', t.id, 'ime', t.name, 'logo', t.logo_url) from teams t where t.id = v_klub),
      'nasprotnik', (select jsonb_build_object('id', t.id, 'ime', t.name, 'logo', t.logo_url) from teams t where t.id = v_nasprotnik)),
    -- Zadnjih 5 odigranih tekem obeh ekip v tej ligi in sezoni.
    'forma', jsonb_build_object('klub', pred_tekmo_forma(v_liga, v_sezona, v_klub),
                                'nasprotnik', pred_tekmo_forma(v_liga, v_sezona, v_nasprotnik)),
    -- Nasprotnikovi strelci in igralci z največ minutami v sezoni.
    'strelci', coalesce((
      select jsonb_agg(x order by x.goli desc, x.minute desc) from (
        select pl.id, pl.full_name as ime, sum(a.goals)::int as goli, sum(a.minutes_played)::int as minute, count(*)::int as nastopov
          from appearances a
          join matches m on m.id = a.match_id
          join rounds r on r.id = m.round_id
          join players pl on pl.id = a.player_id and pl.anonimiziran_at is null
         where r.competition_id = v_liga and r.season = v_sezona and a.team_id = v_nasprotnik
         group by pl.id, pl.full_name
        having sum(a.goals) > 0
         order by sum(a.goals) desc, sum(a.minutes_played) desc
         limit 3) x), '[]'::jsonb),
    'minute', coalesce((
      select jsonb_agg(x order by x.minute desc) from (
        select pl.id, pl.full_name as ime, sum(a.minutes_played)::int as minute, count(*)::int as nastopov
          from appearances a
          join matches m on m.id = a.match_id
          join rounds r on r.id = m.round_id
          join players pl on pl.id = a.player_id and pl.anonimiziran_at is null
         where r.competition_id = v_liga and r.season = v_sezona and a.team_id = v_nasprotnik
         group by pl.id, pl.full_name
         order by sum(a.minutes_played) desc
         limit 3) x), '[]'::jsonb),
    -- Lastna ekipa: kdo ima v sezoni največ rumenih kartonov (vsaj 3).
    'kartoni', coalesce((
      select jsonb_agg(x order by x.rumeni desc) from (
        select pl.id, pl.full_name as ime, sum(a.yellow_cards)::int as rumeni
          from appearances a
          join matches m on m.id = a.match_id
          join rounds r on r.id = m.round_id
          join players pl on pl.id = a.player_id and pl.anonimiziran_at is null
         where r.competition_id = v_liga and r.season = v_sezona and a.team_id = v_klub
         group by pl.id, pl.full_name
        having sum(a.yellow_cards) >= 3
         order by sum(a.yellow_cards) desc
         limit 5) x), '[]'::jsonb),
    -- Zadnjih 5 medsebojnih tekem obeh klubov (vse lige in sezone).
    'medsebojno', coalesce((
      select jsonb_agg(x order by x.datum desc) from (
        select coalesce(m.played_on, r.played_on) as datum, m.home_team_id = v_klub as doma,
               case when m.home_team_id = v_klub then m.home_goals else m.away_goals end as dani,
               case when m.home_team_id = v_klub then m.away_goals else m.home_goals end as prejeti
          from matches m join rounds r on r.id = m.round_id
         where (izid_znan(m.imported_at, m.statistics_status) or m.kontumacija)
           and ((m.home_team_id = v_klub and m.away_team_id = v_nasprotnik)
             or (m.home_team_id = v_nasprotnik and m.away_team_id = v_klub))
         order by coalesce(m.played_on, r.played_on) desc nulls last, m.id desc
         limit 5) x), '[]'::jsonb),
    -- Moja zadnja 5 nastopa v tej ligi: minute, goli, fantasy točke.
    'jaz', coalesce((
      select jsonb_agg(x order by x.datum desc) from (
        select coalesce(m.played_on, r.played_on) as datum, a.minutes_played as minute, a.goals as goli,
               (select ps.points from player_scores ps where ps.round_id = r.id and ps.player_id = a.player_id) as tocke
          from appearances a
          join matches m on m.id = a.match_id
          join rounds r on r.id = m.round_id
         where a.player_id = v_vrstica and r.competition_id = v_liga
         order by coalesce(m.played_on, r.played_on) desc nulls last, m.id desc
         limit 5) x), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.pred_tekmo(bigint) from public;
grant execute on function public.pred_tekmo(bigint) to authenticated;
