-- SLFF Scout: dva popravka po pregledu 19. 10. 2026.
--
-- 1. Meja 30 na opazovalnem seznamu šteje le igralce, ki jih klub danes vidi
--    (scout.vidni), kot jih kaže seznam. Igralec, ki ga stroj izloči (npr.
--    dobi mladinsko vrstico) in ga scout.pocisti ne pobriše, je prej tiho
--    zasedal mesto: klub je videl 29 igralcev, dodajanje pa je javilo "že 30",
--    gumba za odstranitev pa ni nikjer.
-- 2. Stran Klub in opazovalni seznam v dnevnik zapišeta vrnjene igralce
--    (parametri.igralci), kot iskanje in podobni — sicer zahteva igralca
--    "kateri klubi so me gledali" (docs/scout.md, Dnevnik) ne najde pregleda
--    tujega kluba z ?team= ali seznama.

create or replace function public.scout_opazuj(p_player_id bigint, p_opazuj boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from scout.dostop('opazuj', p_player_id, jsonb_build_object('opazuj', p_opazuj));
  if not coalesce(p_opazuj, false) then
    delete from scout.opazovani w where w.team_id = d.team_id and w.player_id = p_player_id;
    return;
  end if;
  if not exists (select 1 from scout.vidni(d.model_id, d.country_id) v where v.player_id = p_player_id) then
    raise exception 'Scout: igralec ni na voljo.' using hint = 'scout-ni-igralca';
  end if;
  if exists (select 1 from scout.opazovani w where w.team_id = d.team_id and w.player_id = p_player_id) then
    return;
  end if;
  -- dostop je zaklenil vrstico naročnine: štetje in vpis sta brez dirke;
  -- šteje le vidne, kot jih kaže seznam (scout.opazovani_jedro)
  if (select count(*) from scout.opazovani w
        join scout.vidni(d.model_id, d.country_id) v on v.player_id = w.player_id
       where w.team_id = d.team_id) >= 30 then
    raise exception 'Scout: na seznamu je že 30 igralcev.' using hint = 'scout-seznam-poln';
  end if;
  insert into scout.opazovani (team_id, player_id, dodal) values (d.team_id, p_player_id, auth.uid());
end;
$$;

create or replace function public.scout_opazovani()
returns table (player_id bigint, ime text, klub text, liga text, skupina text, percentil double precision,
               minute int, odprt_za_prestop boolean, dodano timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  v_ids bigint[] := '{}';
begin
  select * into d from scout.dostop('opazovani', null, '{}'::jsonb);
  for player_id, ime, klub, liga, skupina, percentil, minute, odprt_za_prestop, dodano in
    select * from scout.opazovani_jedro(d.model_id, d.country_id, d.team_id)
  loop
    v_ids := v_ids || player_id;
    return next;
  end loop;
  update scout.dnevnik x set parametri = x.parametri || jsonb_build_object('igralci', to_jsonb(v_ids))
   where x.id = d.dnevnik_id;
end;
$$;

create or replace function public.scout_klub(p_team_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d record;
  v_team bigint;
  v_klub jsonb;
begin
  select * into d from scout.dostop('klub', null, jsonb_build_object('team', p_team_id));
  v_team := coalesce(p_team_id, d.team_id);
  -- Tuj klub le administratorju in le v državi naročnine; nikoli tiho nazaj na svoj klub.
  if v_team <> d.team_id and not (is_admin()
       and exists (select 1 from teams t where t.id = v_team and t.country_id = d.country_id)) then
    raise insufficient_privilege using message = 'Scout: le pregled svojega kluba.';
  end if;
  v_klub := scout.klub_jedro(d.model_id, d.country_id, v_team, v_team = d.team_id);
  update scout.dnevnik x set parametri = x.parametri || jsonb_build_object('igralci', coalesce((
      select jsonb_agg(i.id order by i.id) from (
        select (e->>'player_id')::bigint as id from jsonb_array_elements(v_klub->'kader') e
        union
        select (e->>'player_id')::bigint from jsonb_array_elements(v_klub->'vrzeli') e) i
       where i.id is not null), '[]'::jsonb))
   where x.id = d.dnevnik_id;
  return v_klub;
end;
$$;
