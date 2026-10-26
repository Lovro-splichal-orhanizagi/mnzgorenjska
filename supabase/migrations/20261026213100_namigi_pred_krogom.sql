-- Namigi pred naslednjim krogom (26. 10. 2026).
--
-- Ljudje ekipo sestavijo in jo pustijo: le 171 od 1892 ekip z vsaj dvema
-- zaklenjenima krogoma je kdaj zamenjalo kapetana, prestope je naredilo 9 %
-- ekip, wildcard 6 %. V zadnjem krogu pa 319 od 2843 ekip kapetan ni igral,
-- čeprav je njegov klub igral, in 82 % ekip je imelo v prvi postavi vsaj
-- enega igralca brez minute. Pregled kroga zato pove, kaj popraviti, in pred
-- rokom pride opozorilo, kadar je o igralcu iz prve postave javljena
-- poškodba ali odsotnost.

-- ---------------------------------------------------------------------------
-- Namigi za pregled kroga
-- ---------------------------------------------------------------------------
-- "Ni igral" šteje le, kadar je klub igralca v krogu igral (tekma z
-- zapisnikom): kdor ni imel tekme, ni napaka postave.
create or replace function public.namigi_ekipe(p_ekipa bigint, p_round_id bigint)
returns table (kapetan_ni_igral text, ni_igralo int, prosti_prestopi int, cipi text[])
language sql
stable
security definer
set search_path = public
as $$
  with krog as (
    select r.id, r.season from rounds r where r.id = p_round_id
  ),
  prva as (
    select fl.player_id, fl.is_captain,
           coalesce(p.full_name, p.first_name || ' ' || p.last_name) as ime,
           exists (select 1 from matches m
                    where m.round_id = p_round_id and m.zapisnik_id is not null
                      and p.team_id in (m.home_team_id, m.away_team_id)) as klub_igral,
           exists (select 1 from appearances a join matches m on m.id = a.match_id
                    where m.round_id = p_round_id and a.player_id = fl.player_id
                      and a.minutes_played > 0) as igral
      from fantasy_lineups fl
      join players p on p.id = fl.player_id
     where fl.fantasy_team_id = p_ekipa and fl.round_id = p_round_id and fl.is_starter
  )
  select (select ime from prva where is_captain and klub_igral and not igral limit 1),
         (select count(*)::int from prva where klub_igral and not igral),
         nastavitev_int('prosti_prestopi', 3),
         array(select c from unnest(array['wildcard', 'klop_plus']) c
                where not exists (select 1 from fantasy_chips fc, krog k
                                   where fc.fantasy_team_id = p_ekipa and fc.chip = c
                                     and fc.season = k.season)
                order by c desc)
    from krog;
$$;

revoke all on function public.namigi_ekipe(bigint, bigint) from public, anon, authenticated;
grant execute on function public.namigi_ekipe(bigint, bigint) to service_role;

-- ---------------------------------------------------------------------------
-- Opozorilo pred rokom: odsoten igralec v prvi postavi
-- ---------------------------------------------------------------------------
-- Krog z rokom v naslednjih 24 urah. Ekipa z veljavnim kadrom, ki ima v prvi
-- postavi igralca z javljeno poškodbo ali odsotnostjo (`odsotni_igralci`, ne
-- "vrnitev"), javljeno PO zadnji spremembi ekipe: kdor je ekipo uredil po
-- poročilu, ve. Enkrat na krog.
create or replace function public.kandidati_za_opozorilo_odsotnih(p_competition_id bigint)
returns table (user_id uuid, email text, display_name text, team_id bigint, round_id bigint,
               round_number int, deadline_at timestamptz, kapetan text, odsotni text[],
               email_vklop boolean, push_vklop boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_krog bigint;
  v_stevilka int;
  v_rok timestamptz;
begin
  select r.id, r.number, r.deadline_at
    into v_krog, v_stevilka, v_rok
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.competition_id = p_competition_id
     and c.active
     and r.lineups_locked_at is null
     and r.deadline_at > now()
     and r.deadline_at <= now() + interval '1 day'
     and r.number >= coalesce(c.prvi_fantasy_krog, 1)
   order by r.deadline_at
   limit 1;

  if v_krog is null then
    return;
  end if;

  return query
  with ekipe as (
    select ft.id, ft.owner_id, coalesce(ft.roster_updated_at, ft.created_at) as urejena
      from fantasy_teams ft
     where ft.competition_id = p_competition_id
       and not ft.hisna
       and exists (select 1 from fantasy_roster fr where fr.fantasy_team_id = ft.id)
  ),
  odsotni as (
    select e.id as ekipa, fr.is_captain,
           coalesce(p.full_name, p.first_name || ' ' || p.last_name) as ime
      from ekipe e
      join fantasy_roster fr on fr.fantasy_team_id = e.id and fr.is_starter
      join odsotni_igralci o on o.player_id = fr.player_id
      join players p on p.id = fr.player_id
     where o.kind <> 'vrnitev'
       and o.created_at > e.urejena
  ),
  po_ekipi as (
    select o.ekipa,
           max(o.ime) filter (where o.is_captain) as kapetan,
           array_agg(o.ime order by o.is_captain desc, o.ime) as imena
      from odsotni o
     group by o.ekipa
  )
  select u.id, u.email::text, pr.display_name, e.id, v_krog, v_stevilka, v_rok,
         pe.kapetan, pe.imena,
         (u.email is not null and not coalesce(pr.brez_opomnikov, false)),
         (not coalesce(pr.brez_push, false)
           and exists (select 1 from push_tokens pt where pt.user_id = u.id))
    from po_ekipi pe
    join ekipe e on e.id = pe.ekipa
    join auth.users u on u.id = e.owner_id
    left join profiles pr on pr.id = u.id
   where roster_je_veljaven(e.id)
     and ((u.email is not null and not coalesce(pr.brez_opomnikov, false))
          or (not coalesce(pr.brez_push, false)
              and exists (select 1 from push_tokens pt where pt.user_id = u.id)))
     and not exists (select 1 from email_log el
                      where el.user_id = u.id
                        and el.competition_id = p_competition_id
                        and el.vrsta = 'opozorilo-odsotni'
                        and el.round_id = v_krog
                        and el.napaka is null)
   order by e.id;
end;
$$;

revoke all on function public.kandidati_za_opozorilo_odsotnih(bigint) from public, anon, authenticated;
grant execute on function public.kandidati_za_opozorilo_odsotnih(bigint) to service_role;
