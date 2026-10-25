-- Prag glasov za pozicijo 5 → 3 in samodejni poznavalci lige (25. 10. 2026).
--
-- A) Prag. Pri pragu 5 je 2.276 igralcev čakalo z enim glasom, 195 z dvema in
--    56 s tremi ali štirimi. Lastnik je izbral 3: en poznavalec kluba (utež 3)
--    pozicijo premakne sam, drugi ga lahko preglasujejo. Nastavitev se spremeni
--    le, če je še 5 (poznejše spremembe admina ostanejo). Pozicij migracija ne
--    preračuna: glasovi se uveljavijo tedensko (uveljavi_pozicije, pg_cron
--    ponedeljek 2.00, potrdi_pozicijo za vsakega igralca z glasovi), zato
--    nov prag velja ob prvem ponedeljku, kot vsaka sprememba pozicije.
--    Suhi tek na produkciji (25. 10.): pri pragu 3 se spremeni 1.488 pozicij.
--    Kader ostane veljaven: roster_je_veljaven šteje fantasy_roster.buy_position,
--    ne trenutne pozicije.
--
-- B) Samodejni poznavalec lige. Doslej ga je dodelil le admin. Kdor veliko
--    glasuje in ima prav, ga zdaj dobi sam. "Prav" se meri le ob neodvisni
--    resnici, ne ob izidu, ki ga je odločil njegov lastni glas
--    (voter_position_accuracy šteje tudi to, zato je krožna):
--      - pozicija: vir zapisnik, admin ali klub; ali glasovanje, pri katerem
--        sta isto pozicijo izbrala vsaj dva DRUGA glasovalca;
--      - asistenca: asistenca iz vira (brez potrditve z glasovi); ali
--        potrjena asistenca / "brez asistence", za katero sta glasovala vsaj
--        dva DRUGA glasovalca.
--    Pravilo (nastavitve, privzeto): v ligi vsaj 20 takih glasov, vsaj 85 %
--    pravilnih, račun star vsaj 14 dni, nikoli omejen, brez poznavalca lige.
--    Če ima človek pogoje v več ligah, dobi tisto z največ glasovi
--    (insider_competition_id je en sam). Pod 75 % se samodejni poznavalec
--    odvzame. Ko poznavalca odvzame ali zamenja admin, ga samodejno ne dobi
--    nikoli več. Vsaka podelitev in odvzem gresta na Discord; njegov glas
--    pri pozicijah šteje od naslednjega tedenskega uveljavljanja.

-- --------------------------------------------------------------------------
-- A) Prag 3
-- --------------------------------------------------------------------------
update public.settings set value = '3'::jsonb
 where key = 'prag_glasov_pozicija' and value = '5'::jsonb;

-- --------------------------------------------------------------------------
-- B) Samodejni poznavalci
-- --------------------------------------------------------------------------
insert into public.settings (key, value) values
  ('samodejni_poznavalec_min_glasov', '20'::jsonb),
  ('samodejni_poznavalec_odstotek', '85'::jsonb),
  ('samodejni_poznavalec_odvzem', '75'::jsonb),
  ('samodejni_poznavalec_min_dni', '14'::jsonb)
on conflict (key) do nothing;

-- Ena vrstica na človeka (poznavalec lige je en sam). odvzel = admin: nikoli več
-- samodejno. odvzeto_at brez odvzel = samodejni odvzem (pod pragom natančnosti).
create table if not exists public.samodejni_poznavalci (
  user_id        uuid primary key references public.profiles on delete cascade,
  competition_id bigint not null references public.competitions on delete cascade,
  glasov         int not null,
  pravilnih      int not null,
  podeljeno_at   timestamptz not null default now(),
  odvzeto_at     timestamptz,
  odvzel         uuid references public.profiles on delete set null,
  razlog         text
);

alter table public.samodejni_poznavalci enable row level security;
revoke all on public.samodejni_poznavalci from anon, authenticated;
grant select on public.samodejni_poznavalci to authenticated;
create policy "svoja vrstica" on public.samodejni_poznavalci
  for select to authenticated using (user_id = auth.uid());

insert into agent.zaprte_tabele (tabela, zakaj) values
  ('public.samodejni_poznavalci', 'natančnost glasovanja posameznih uporabnikov')
on conflict (tabela) do nothing;

-- Natančnost glasovalca po ligi, le ob neodvisni resnici (glej glavo).
create or replace function public.neodvisna_natancnost()
returns table (voter_id uuid, competition_id bigint, glasov int, pravilnih int)
language sql stable security definer set search_path = public
as $$
  with poz as (
    select pv.voter_id, p.competition_id,
           (p.position_source in ('zapisnik', 'admin', 'klub')
            or (p.position_source = 'glasovanje'
                and (select count(distinct o.voter_id) from position_votes o
                      where o.player_id = pv.player_id and o.voter_id <> pv.voter_id
                        and o.position = p.position) >= 2)) as razresen,
           pv.position = p.position as prav
      from position_votes pv
      join players p on p.id = pv.player_id
     where p.position is not null
  ),
  asi as (
    select av.voter_id, r.competition_id,
           ((g.assist_player_id is not null and g.assist_confirmed_at is null)
            or (g.assist_confirmed_at is not null
                and (select count(distinct o.voter_id) from assist_votes o
                      where o.goal_id = av.goal_id and o.voter_id <> av.voter_id
                        and o.player_id is not distinct from g.assist_player_id) >= 2)
            or (g.assist_none_confirmed_at is not null
                and (select count(distinct o.voter_id) from assist_votes o
                      where o.goal_id = av.goal_id and o.voter_id <> av.voter_id
                        and o.player_id is null) >= 2)) as razresen,
           av.player_id is not distinct from g.assist_player_id as prav
      from assist_votes av
      join goals g on g.id = av.goal_id
      join matches m on m.id = g.match_id
      join rounds r on r.id = m.round_id
  ),
  vse as (
    select * from poz union all select * from asi
  )
  select voter_id, competition_id,
         (count(*) filter (where razresen))::int,
         (count(*) filter (where razresen and prav))::int
    from vse
   group by voter_id, competition_id
$$;
revoke all on function public.neodvisna_natancnost() from public, anon, authenticated;

-- Nočno: odvzem pod pragom, nato podelitev. Vrne število sprememb.
create or replace function public.podeli_samodejne_poznavalce()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_min    int := nastavitev_int('samodejni_poznavalec_min_glasov', 20);
  v_odst   int := nastavitev_int('samodejni_poznavalec_odstotek', 85);
  v_odvzem int := nastavitev_int('samodejni_poznavalec_odvzem', 75);
  v_dni    int := nastavitev_int('samodejni_poznavalec_min_dni', 14);
  v_n      int := 0;
  r        record;
begin
  drop table if exists pg_temp._natancnost;
  create temp table _natancnost on commit drop as
    select * from neodvisna_natancnost();

  -- Vrstica, katere liga ni več poznavalčeva (admin jo je spremenil drugje).
  update samodejni_poznavalci s
     set odvzeto_at = now(), razlog = 'nadomeščeno'
    from profiles pr
   where pr.id = s.user_id and s.odvzeto_at is null
     and pr.insider_competition_id is distinct from s.competition_id;

  -- Odvzem: natančnost pod pragom.
  for r in
    select s.user_id, s.competition_id, n.glasov, n.pravilnih, pr.display_name, c.name as liga
      from samodejni_poznavalci s
      join profiles pr on pr.id = s.user_id
      join competitions c on c.id = s.competition_id
      join _natancnost n on n.voter_id = s.user_id and n.competition_id = s.competition_id
     where s.odvzeto_at is null
       and n.glasov >= v_min
       and n.pravilnih * 100 < v_odvzem * n.glasov
  loop
    update profiles set insider_competition_id = null
     where id = r.user_id and insider_competition_id = r.competition_id;
    update samodejni_poznavalci
       set odvzeto_at = now(), glasov = r.glasov, pravilnih = r.pravilnih,
           razlog = 'natančnost pod ' || v_odvzem || ' %'
     where user_id = r.user_id;
    perform preverjeni_na_discord('☆ Samodejni poznavalec odvzet: ' || coalesce(r.display_name, '?')
      || ' · ' || r.liga || ' (' || r.pravilnih || '/' || r.glasov || ')');
    v_n := v_n + 1;
  end loop;

  -- Podelitev: najboljša liga na človeka.
  for r in
    select distinct on (n.voter_id) n.voter_id, n.competition_id, n.glasov, n.pravilnih,
           pr.display_name, c.name as liga
      from _natancnost n
      join profiles pr on pr.id = n.voter_id
      join auth.users u on u.id = n.voter_id
      join competitions c on c.id = n.competition_id
     where c.active
       and n.glasov >= v_min
       and n.pravilnih * 100 >= v_odst * n.glasov
       and pr.insider_competition_id is null
       and u.created_at < now() - make_interval(days => v_dni)
       and not exists (select 1 from omejitve_uporabnikov o where o.user_id = n.voter_id)
       and not exists (select 1 from samodejni_poznavalci s
                        where s.user_id = n.voter_id
                          and (s.odvzel is not null or s.odvzeto_at is null))
     order by n.voter_id, n.glasov desc, n.competition_id
  loop
    update profiles set insider_competition_id = r.competition_id where id = r.voter_id;
    insert into samodejni_poznavalci (user_id, competition_id, glasov, pravilnih)
    values (r.voter_id, r.competition_id, r.glasov, r.pravilnih)
    on conflict (user_id) do update
      set competition_id = excluded.competition_id, glasov = excluded.glasov,
          pravilnih = excluded.pravilnih, podeljeno_at = now(),
          odvzeto_at = null, razlog = null;
    -- Njegov glas zdaj šteje kot prag; pozicije uveljavi ponedeljkov uveljavi_pozicije.
    perform preverjeni_na_discord('★ Samodejni poznavalec lige: ' || coalesce(r.display_name, '?')
      || ' · ' || r.liga || ' (' || r.pravilnih || '/' || r.glasov || ' neodvisno potrjenih glasov)');
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;
revoke all on function public.podeli_samodejne_poznavalce() from public, anon, authenticated;

-- Admin odvzame ali zamenja poznavalca: samodejni ga ne dobi nikoli več.
create or replace function public.admin_nastavi_poznavalca(
  p_user_id uuid,
  p_competition_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko dodeli poznavalca lige.';
  end if;
  update profiles
     set insider_competition_id = p_competition_id
   where id = p_user_id;
  update samodejni_poznavalci
     set odvzeto_at = coalesce(odvzeto_at, now()), odvzel = auth.uid(),
         razlog = case when p_competition_id is null then 'odvzel admin' else 'admin dodelil drugo ligo' end
   where user_id = p_user_id
     and (odvzeto_at is null or odvzel is null)
     and competition_id is distinct from p_competition_id;
end;
$$;
grant execute on function public.admin_nastavi_poznavalca(uuid, bigint) to authenticated;

-- Seznam za administracijo.
create or replace function public.admin_samodejni_poznavalci()
returns table (
  user_id uuid,
  display_name text,
  competition_id bigint,
  liga text,
  glasov int,
  pravilnih int,
  podeljeno_at timestamptz,
  odvzeto_at timestamptz,
  odvzel_admin boolean,
  razlog text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
    select s.user_id, pr.display_name, s.competition_id, c.name, s.glasov, s.pravilnih,
           s.podeljeno_at, s.odvzeto_at, s.odvzel is not null, s.razlog
      from samodejni_poznavalci s
      join profiles pr on pr.id = s.user_id
      join competitions c on c.id = s.competition_id
     order by s.odvzeto_at is not null, s.podeljeno_at desc;
end;
$$;
revoke all on function public.admin_samodejni_poznavalci() from public, anon;
grant execute on function public.admin_samodejni_poznavalci() to authenticated;

-- Nočno ob 5.13 (po uvozih in uveljavitvi cen).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'samodejni-poznavalci',
    '13 5 * * *',
    $urnik$select public.podeli_samodejne_poznavalce()$urnik$
  );
exception
  when others then
    raise notice 'pg_cron ni na voljo (%) — samodejne poznavalce podeli ročno', sqlerrm;
end;
$$;

-- Prva podelitev ob namestitvi.
select public.podeli_samodejne_poznavalce();
