-- SLFF Scout, faza 3a: branje za klube. Spec 4 (Dostop).
--
-- Vsak javni RPC najprej pokliče scout.dostop (sedež, aktiven klubski račun,
-- veljavna naročnina, odprta država, dnevna meja, vrstica v dnevniku), nato
-- jedro. Jedra berejo le zadnji OBJAVLJENI model in prek scout.vidni ob
-- branju znova izločijo skrite (ugovor po ključih osebe), anonimizirane,
-- vrstice mladinskih lig in zaprte države: model nastane enkrat na dan.
-- Celo osebo z mladinsko vrstico izloča stroj (SQL_IZKLJUCENI).
-- vidni/jedra so language sql brez SET in s polnimi imeni, da jih planer
-- vstavi in potisne filter na igralca; merijo se na produkciji brez sedeža.

create function scout.zadnji_model()
returns bigint language sql stable
as $$ select id from scout.modeli where objavljen order by id desc limit 1 $$;

create function scout.dostop(p_vrsta text, p_player_id bigint, p_parametri jsonb)
returns table (model_id bigint, team_id bigint, country_id bigint, dnevnik_id bigint)
language plpgsql set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_dnevnik bigint;
  n scout.narocnine;
  v_danes timestamptz := ((now() at time zone 'Europe/Ljubljana')::date)::timestamp at time zone 'Europe/Ljubljana';
  v_meja int := case when p_vrsta = 'igralec' then 500 else 300 end;
begin
  select x.* into n from scout.sedezi s join scout.narocnine x on x.team_id = s.team_id where s.user_id = v_uid;
  if not found or not je_klubski_racun(v_uid, n.team_id) then
    raise insufficient_privilege using message = 'Scout: ni sedeža kluba.';
  end if;
  if n.velja_do <= now() or n.zaprt_at is not null then
    raise insufficient_privilege using message = 'Scout: naročnina ne velja.';
  end if;
  if coalesce((select d.stanje from scout.drzave d where d.country_id = n.country_id), 'zaprto') = 'zaprto' then
    raise insufficient_privilege using message = 'Scout: država ni odprta.';
  end if;
  -- Klici istega kluba po vrsti, da meja drži ob vzporednih zahtevkih.
  perform 1 from scout.narocnine x where x.team_id = n.team_id for update;
  if (select count(*) from scout.dnevnik d
       where d.team_id = n.team_id and d.created_at >= v_danes
         and (d.vrsta = 'igralec') = (p_vrsta = 'igralec')) >= v_meja then
    raise exception 'Scout: klub je danes dosegel mejo.' using hint = 'scout-meja';
  end if;
  insert into scout.dnevnik (team_id, user_id, vrsta, player_id, parametri)
  values (n.team_id, v_uid, p_vrsta, p_player_id, coalesce(p_parametri, '{}'::jsonb))
  returning id into v_dnevnik;
  return query select scout.zadnji_model(), n.team_id, n.country_id, v_dnevnik;
end;
$$;

-- Igralci, ki jih klub sme videti v modelu: odprta država, ne mladinska liga,
-- ne anonimiziran in ne skrit. Ugovor in anonimizacija po zgoščenih ključih
-- osebe (kot scout.kljuci_vrstic in SQL_IZKLJUCENI stroja), zato takoj izpadejo
-- tudi druge vrstice iste osebe, ne šele ob naslednjem modelu.
create function scout.vidni(p_model bigint, p_country bigint)
returns table (player_id bigint, skupina text, indeks double precision, percentil double precision,
               zaupanje double precision)
language sql stable
as $$
  select i.player_id, i.skupina, i.indeks, i.percentil, i.zaupanje
    from scout.indeks i
    join public.players p on p.id = i.player_id
    join public.competitions c on c.id = p.competition_id
    join scout.drzave d on d.country_id = c.country_id and d.stanje <> 'zaprto'
    cross join lateral (select array[
      public.anonimizacijski_kljuc(c.country_id || '|' || nullif(p.full_name, '')),
      public.anonimizacijski_kljuc(c.country_id || '|reg|' || p.reg_st)] as k) kk
   where i.model_id = p_model and c.country_id = p_country
     and p.anonimiziran_at is null
     and not public.je_mladinski_slug(c.slug)
     -- = any(array) namesto OR: indeksa na kljuc, brez join z OR (16. 10.)
     and not exists (select 1 from scout.ugovori u where u.kljuc = any (kk.k))
     and not exists (select 1 from public.anonimizirani_igralci a where a.kljuc = any (kk.k))
$$;

-- Privolitve na vseh vrsticah potrjenega profila (glavna in povezane). Stik
-- (kontakt_dovoljen) se ne bere: sporočila klub → igralec so faza 4.
create function scout.privolitve_vrstic()
returns table (player_id bigint, odprt_za_prestop boolean, letnik int, regije bigint[])
language sql stable
as $$
  select z.player_id, s.odprt_za_prestop, s.letnik, s.regije
    from public.zahtevki_igralca z join scout.privolitve s on s.player_id = z.player_id
   where z.status = 'potrjen'
  union
  select pi.player_id, s.odprt_za_prestop, s.letnik, s.regije
    from public.povezani_igralci pi
    join public.zahtevki_igralca z on z.id = pi.zahtevek_id and z.status = 'potrjen'
    join scout.privolitve s on s.player_id = z.player_id
$$;

-- Liga kluba za projekcijo: najmočnejša članska liga zadnje sezone v modelu.
create function scout.liga_kluba(p_model bigint, p_team bigint)
returns table (competition_id bigint, moc double precision)
language sql stable
as $$
  select e.competition_id, m.moc
    from scout.ekipe_elo e
    join scout.lige_moc m on m.model_id = e.model_id and m.competition_id = e.competition_id
    join public.competitions c on c.id = e.competition_id
   where e.model_id = p_model and e.team_id = p_team and not public.je_mladinski_slug(c.slug)
   order by e.leto desc, m.moc desc
   limit 1
$$;

-- Raven: 'ista_ali_nizja' = moč lige igralca <= moč lige kluba + 0.1 (log),
-- 'nizja' = < moč kluba - 0.1. Brez lige kluba v modelu filter ne velja.
-- Projekcija golov na raven kluba le znotraj države (moč je lestvica države).
create function scout.isci_jedro(p_model bigint, p_country bigint, p_team bigint, p_skupina text, p_raven text,
                                 p_regije bigint[], p_min_minut int, p_samo_odprti boolean, p_od int)
returns table (player_id bigint, ime text, klub text, liga text, skupina text, percentil double precision,
               zaupanje double precision, minute int, delez_minut double precision,
               goli_90_pri_nas double precision, odprt_za_prestop boolean)
language sql stable
as $$
  with k as (select * from scout.liga_kluba(p_model, p_team))
  select v.player_id, p.full_name::text, t.name::text, c.name::text, v.skupina, v.percentil, v.zaupanje,
         z.minute, z.delez_minut, z.goli_ref_90 * exp(-(select k.moc from k)),
         coalesce(o.odprt_za_prestop, false)
    from scout.vidni(p_model, p_country) v
    join public.players p on p.id = v.player_id
    join public.teams t on t.id = p.team_id
    join public.competitions c on c.id = p.competition_id
    left join scout.lige_moc m on m.model_id = p_model and m.competition_id = p.competition_id
    join lateral (select x.minute, x.delez_minut, x.goli_ref_90 from scout.kazalniki x
                   where x.model_id = p_model and x.player_id = v.player_id
                   order by x.leto desc limit 1) z on true
    left join scout.privolitve_vrstic() o on o.player_id = v.player_id
   where p.team_id <> p_team
     and (p_skupina is null or v.skupina = p_skupina)
     and (cardinality(coalesce(p_regije, '{}'::bigint[])) = 0 or c.federation_id = any (p_regije))
     and z.minute >= coalesce(p_min_minut, 0)
     and (not coalesce(p_samo_odprti, false) or coalesce(o.odprt_za_prestop, false))
     and case coalesce(p_raven, 'vse')
           when 'ista_ali_nizja' then not exists (select 1 from k)
                                      or coalesce(m.moc, 0) <= (select k.moc from k) + 0.1
           when 'nizja' then not exists (select 1 from k) or coalesce(m.moc, 0) < (select k.moc from k) - 0.1
           else true
         end
   order by v.percentil desc, v.zaupanje desc, v.player_id
   limit 25 offset least(greatest(coalesce(p_od, 0), 0), 175)
$$;

create function scout.igralec_jedro(p_model bigint, p_country bigint, p_team bigint, p_player bigint)
returns jsonb language sql stable
as $$
  with k as (select * from scout.liga_kluba(p_model, p_team))
  select jsonb_build_object(
    'player_id', v.player_id, 'ime', p.full_name, 'klub', t.name, 'liga', c.name, 'skupina', v.skupina,
    'indeks', v.indeks, 'percentil', v.percentil, 'zaupanje', v.zaupanje,
    'moc_lige', m.moc, 'moc_kluba', (select k.moc from k),
    'opazujem', exists (select 1 from scout.opazovani w where w.team_id = p_team and w.player_id = v.player_id),
    -- Privolitev le pri "odprt za prestop" (spec 2); stik je faza 4.
    'privolitev', (select jsonb_build_object(
                     'letnik', o.letnik,
                     'regije', (select coalesce(jsonb_agg(f.name order by f.name), '[]'::jsonb)
                                  from public.federations f where f.id = any (o.regije)))
                     from scout.privolitve_vrstic() o
                    where o.player_id = v.player_id and o.odprt_za_prestop limit 1),
    'sezone', (select jsonb_agg(jsonb_build_object(
                 'sezona', z.sezona, 'liga', zc.name, 'klub', zt.name, 'minute', z.minute,
                 'delez_minut', z.delez_minut, 'zacetki_delez', z.zacetki_delez, 'cele_delez', z.cele_delez,
                 'goli_ref_90', z.goli_ref_90, 'goli_90_pri_nas', z.goli_ref_90 * exp(-(select k.moc from k)),
                 'delez_golov', z.delez_golov, 'enajstm', z.enajstm, 'onoff_ref_90', z.onoff_ref_90,
                 'prejeti_ref_90', z.prejeti_ref_90, 'ciste_delez', z.ciste_delez, 'kartoni_90', z.kartoni_90,
                 'vratar_ref_90', z.vratar_ref_90, 'stalnost', z.stalnost, 'trend_minut', z.trend_minut,
                 'zaupanje', z.zaupanje) order by z.leto desc)
                 from scout.kazalniki z
                 join public.competitions zc on zc.id = z.competition_id
                 join public.teams zt on zt.id = z.team_id
                where z.model_id = p_model and z.player_id = v.player_id))
    from scout.vidni(p_model, p_country) v
    join public.players p on p.id = v.player_id
    join public.teams t on t.id = p.team_id
    join public.competitions c on c.id = p.competition_id
    left join scout.lige_moc m on m.model_id = p_model and m.competition_id = p.competition_id
   where v.player_id = p_player
$$;

create function scout.podobni_jedro(p_model bigint, p_country bigint, p_team bigint, p_player bigint)
returns table (player_id bigint, ime text, klub text, liga text, skupina text, podobnost double precision,
               percentil double precision, minute int, odprt_za_prestop boolean)
language sql stable
as $$
  select v.player_id, p.full_name::text, t.name::text, c.name::text, v.skupina, s.podobnost, v.percentil,
         z.minute, coalesce(o.odprt_za_prestop, false)
    from scout.vektorji x
    cross join lateral unnest(x.podobni, x.podobnost) with ordinality s(player_id, podobnost, red)
    join scout.vidni(p_model, p_country) v on v.player_id = s.player_id
    join public.players p on p.id = v.player_id
    join public.teams t on t.id = p.team_id
    join public.competitions c on c.id = p.competition_id
    left join lateral (select y.minute from scout.kazalniki y
                        where y.model_id = p_model and y.player_id = v.player_id
                        order by y.leto desc limit 1) z on true
    left join scout.privolitve_vrstic() o on o.player_id = v.player_id
   where x.model_id = p_model and x.player_id = p_player
     and exists (select 1 from scout.vidni(p_model, p_country) w where w.player_id = p_player)
   order by s.red
   limit 10
$$;

-- Vrzeli kluba; vrstica z igralcem, ki ni viden, odpade cela.
create function scout.vrzeli_jedro(p_model bigint, p_country bigint, p_team bigint)
returns table (liga text, skupina text, vrsta text, player_id bigint, ime text, vrednost double precision)
language sql stable
as $$
  select c.name::text, r.skupina, r.vrsta, r.player_id, p.full_name::text, r.vrednost
    from scout.vrzeli r
    join public.competitions c on c.id = r.competition_id
    left join public.players p on p.id = r.player_id
    -- Lateral z offset 0 (ne "is null or exists"): vidni po igralcu, ne za celo državo.
    left join lateral (select true as ok from scout.vidni(p_model, p_country) v
                        where v.player_id = r.player_id offset 0) w on true
   where r.model_id = p_model and r.team_id = p_team
     and (r.player_id is null or w.ok)
   order by c.name, r.vrsta, r.skupina, r.player_id
$$;

-- ---------------------------------------------------------------------------
-- Javni RPC: dostop + jedro
-- ---------------------------------------------------------------------------
create function public.scout_isci(p_skupina text default null, p_raven text default 'vse',
                                  p_regije bigint[] default '{}', p_min_minut int default 0,
                                  p_samo_odprti boolean default false, p_od int default 0)
returns table (player_id bigint, ime text, klub text, liga text, skupina text, percentil double precision,
               zaupanje double precision, minute int, delez_minut double precision,
               goli_90_pri_nas double precision, odprt_za_prestop boolean)
-- Filtri (p_x is null or …): generičen plan po petem klicu v seji bi bil slab.
language plpgsql security definer set search_path = public set plan_cache_mode = force_custom_plan
as $$
declare
  d record;
  v_ids bigint[] := '{}';
begin
  if (p_skupina is not null and p_skupina not in ('GK', 'DEF', 'MID', 'FWD'))
     or coalesce(p_raven, 'vse') not in ('vse', 'ista_ali_nizja', 'nizja')
     or cardinality(coalesce(p_regije, '{}'::bigint[])) > 50 then
    raise exception 'Scout: neveljaven filter.' using hint = 'scout-filter';
  end if;
  select * into d from scout.dostop('isci', null, jsonb_build_object(
    'skupina', p_skupina, 'raven', p_raven, 'regije', p_regije, 'min_minut', p_min_minut,
    'samo_odprti', p_samo_odprti, 'od', p_od));
  -- Vrnjeni igralci v dnevnik (največ 25): "kateri klubi so me gledali".
  for player_id, ime, klub, liga, skupina, percentil, zaupanje, minute, delez_minut, goli_90_pri_nas,
      odprt_za_prestop in
    select * from scout.isci_jedro(d.model_id, d.country_id, d.team_id, p_skupina, p_raven,
                                   p_regije, p_min_minut, p_samo_odprti, p_od)
  loop
    v_ids := v_ids || player_id;
    return next;
  end loop;
  update scout.dnevnik x set parametri = x.parametri || jsonb_build_object('igralci', to_jsonb(v_ids))
   where x.id = d.dnevnik_id;
end;
$$;

create function public.scout_igralec(p_player_id bigint)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from scout.dostop('igralec', p_player_id, '{}'::jsonb);
  return scout.igralec_jedro(d.model_id, d.country_id, d.team_id, p_player_id);
end;
$$;

create function public.scout_podobni(p_player_id bigint)
returns table (player_id bigint, ime text, klub text, liga text, skupina text, podobnost double precision,
               percentil double precision, minute int, odprt_za_prestop boolean)
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  v_ids bigint[] := '{}';
begin
  select * into d from scout.dostop('podobni', p_player_id, '{}'::jsonb);
  for player_id, ime, klub, liga, skupina, podobnost, percentil, minute, odprt_za_prestop in
    select * from scout.podobni_jedro(d.model_id, d.country_id, d.team_id, p_player_id)
  loop
    v_ids := v_ids || player_id;
    return next;
  end loop;
  update scout.dnevnik x set parametri = x.parametri || jsonb_build_object('igralci', to_jsonb(v_ids))
   where x.id = d.dnevnik_id;
end;
$$;

create function public.scout_vrzeli()
returns table (liga text, skupina text, vrsta text, player_id bigint, ime text, vrednost double precision)
language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from scout.dostop('vrzeli', null, '{}'::jsonb);
  return query select * from scout.vrzeli_jedro(d.model_id, d.country_id, d.team_id);
end;
$$;

revoke all on function scout.zadnji_model(), scout.dostop(text, bigint, jsonb), scout.vidni(bigint, bigint),
  scout.privolitve_vrstic(), scout.liga_kluba(bigint, bigint),
  scout.isci_jedro(bigint, bigint, bigint, text, text, bigint[], int, boolean, int),
  scout.igralec_jedro(bigint, bigint, bigint, bigint), scout.podobni_jedro(bigint, bigint, bigint, bigint),
  scout.vrzeli_jedro(bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.scout_isci(text, text, bigint[], int, boolean, int), public.scout_igralec(bigint),
  public.scout_podobni(bigint), public.scout_vrzeli() from public, anon;
grant execute on function public.scout_isci(text, text, bigint[], int, boolean, int), public.scout_igralec(bigint),
  public.scout_podobni(bigint), public.scout_vrzeli() to authenticated;
