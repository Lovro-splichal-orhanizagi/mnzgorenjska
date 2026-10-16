-- SLFF Scout, faza 3a: opazovalni seznam kluba (do 30 igralcev, paket Klub).
-- Skriti in anonimizirani odpadejo ob branju (scout.vidni) in iz tabele vsako
-- noč (scout.pocisti). Tedensko poročilo seznama je faza 4.

create function scout.opazovani_jedro(p_model bigint, p_country bigint, p_team bigint)
returns table (player_id bigint, ime text, klub text, liga text, skupina text, percentil double precision,
               minute int, odprt_za_prestop boolean, dodano timestamptz)
language sql stable
as $$
  select v.player_id, p.full_name::text, t.name::text, c.name::text, v.skupina, v.percentil, z.minute,
         coalesce(o.odprt_za_prestop, false), w.created_at
    from scout.opazovani w
    join scout.vidni(p_model, p_country) v on v.player_id = w.player_id
    join public.players p on p.id = v.player_id
    join public.teams t on t.id = p.team_id
    join public.competitions c on c.id = p.competition_id
    left join lateral (select y.minute from scout.kazalniki y
                        where y.model_id = p_model and y.player_id = v.player_id
                        order by y.leto desc limit 1) z on true
    left join scout.privolitve_vrstic() o on o.player_id = v.player_id
   where w.team_id = p_team
   order by w.created_at desc, w.player_id
$$;

create function public.scout_opazuj(p_player_id bigint, p_opazuj boolean)
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
  -- dostop je zaklenil vrstico naročnine: štetje in vpis sta brez dirke
  if (select count(*) from scout.opazovani w where w.team_id = d.team_id) >= 30 then
    raise exception 'Scout: na seznamu je že 30 igralcev.' using hint = 'scout-seznam-poln';
  end if;
  insert into scout.opazovani (team_id, player_id, dodal) values (d.team_id, p_player_id, auth.uid());
end;
$$;

create function public.scout_opazovani()
returns table (player_id bigint, ime text, klub text, liga text, skupina text, percentil double precision,
               minute int, odprt_za_prestop boolean, dodano timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from scout.dostop('opazovani', null, '{}'::jsonb);
  return query select * from scout.opazovani_jedro(d.model_id, d.country_id, d.team_id);
end;
$$;

revoke all on function scout.opazovani_jedro(bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.scout_opazuj(bigint, boolean), public.scout_opazovani() from public, anon;
grant execute on function public.scout_opazuj(bigint, boolean), public.scout_opazovani() to authenticated;
