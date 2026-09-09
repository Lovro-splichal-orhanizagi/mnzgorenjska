-- Pragovi po tekmovanju naj bodo vidni tudi v vmesniku.
--
-- Migracija 20260909090000 je premaknila pragove na tekmovanje, strežnik jih
-- od takrat upošteva — vmesnik pa je še vedno kazal številke, zapisane v
-- kodi (`PRAG_ASISTENCE = 3`, `PRAG = 5`). Ob prvem povozu bi stran trdila
-- "1 / 3 — še 2 do odločitve", strežnik pa bi asistenco potrdil že pri dveh.
-- Igralec bi videl, da se odloči nekaj drugega, kot mu piše.

-- --------------------------------------------------------------------------
-- Veljavne nastavitve za tekmovanje: povoz tekmovanja, sicer globalna
-- --------------------------------------------------------------------------
create or replace function nastavitve_tekmovanja(p_competition_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(x.key, x.value), '{}'::jsonb)
  from (
    select s.key, coalesce(cs.value, s.value) as value
      from settings s
      left join competition_settings cs
        on cs.key = s.key and cs.competition_id = p_competition_id
    union all
    select cs.key, cs.value
      from competition_settings cs
     where cs.competition_id = p_competition_id
       and not exists (select 1 from settings s where s.key = cs.key)
  ) x;
$$;

comment on function nastavitve_tekmovanja(bigint) is
  'Vse nastavitve, kakor veljajo za to tekmovanje — povoz iz `competition_settings`, sicer globalna iz `settings`. Vmesnik naj bere to, ne števil v kodi.';

grant execute on function nastavitve_tekmovanja(bigint) to anon, authenticated;

-- --------------------------------------------------------------------------
-- Utež poznavalca je last tekmovanja tudi v pogledu
-- --------------------------------------------------------------------------
-- `potrdi_pozicijo` jo od 20260909090000 bere s `nastavitev_int_za`, ta pogled
-- pa je ostal pri globalni. Stran Pozicije riše napredek iz pogleda, odloča pa
-- funkcija — brez tega bi se razšla natanko takrat, ko je povoz nastavljen.
create or replace view position_vote_weights as
  select
    pv.player_id,
    pv.position,
    count(*)::int as votes,
    round(sum(greatest(
      voter_weight(pv.voter_id),
      case when pf.insider_team_id = p.team_id
        then nastavitev_int_za('utez_insider', p.competition_id, 3)::numeric
        else 1.0
      end
    )), 2) as weight
  from position_votes pv
  join players  p  on p.id  = pv.player_id
  join profiles pf on pf.id = pv.voter_id
  group by pv.player_id, pv.position, p.team_id, p.competition_id;
