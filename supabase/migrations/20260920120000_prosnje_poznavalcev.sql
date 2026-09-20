-- Prosnja za poznavalca: stran sama vprasa, kdo pozna ligo.
--
-- Prvi poznavalec lige (ND Rence) je prisel po nakljucju — odgovoril je na
-- mail klubu. Igralci, trenerji in vodstva klubov so povsod, a stran jih ni
-- vprasala. Zdaj se lahko prijavijo sami; odloci admin, ker gre za utez nad
-- ligo in tega ne sme dobiti vsak, ki klikne.
--
-- Ena cakajoca prosnja na uporabnika in ligo. Odobritev nastavi
-- insider_team_id (klub, 3x) ali insider_competition_id (liga, en glas
-- potrdi) — mehanizma, ki ze obstajata.

create table if not exists public.poznavalec_prosnje (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles on delete cascade,
  competition_id bigint not null references public.competitions on delete cascade,
  team_id        bigint references public.teams on delete set null,
  vloga          text not null check (vloga in ('igralec', 'trener', 'vodstvo', 'navijac')),
  sporocilo      text check (length(sporocilo) <= 500),
  status         text not null default 'caka' check (status in ('caka', 'klub', 'liga', 'zavrnjeno')),
  created_at     timestamptz not null default now(),
  decided_at     timestamptz,
  decided_by     uuid references public.profiles on delete set null
);

create unique index if not exists poznavalec_prosnje_ena_cakajoca
  on public.poznavalec_prosnje (user_id, competition_id) where status = 'caka';

alter table public.poznavalec_prosnje enable row level security;

-- Vsak vidi svoje; pise samo prek funkcije.
create policy "svoje prosnje" on public.poznavalec_prosnje
  for select to authenticated using (user_id = auth.uid());

create or replace function public.zaprosi_za_poznavalca(
  p_competition_id bigint,
  p_team_id bigint,
  p_vloga text,
  p_sporocilo text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Za prosnjo se je treba prijaviti.';
  end if;
  if exists (select 1 from profiles where id = auth.uid() and insider_competition_id = p_competition_id) then
    raise exception 'Ze si poznavalec te lige.';
  end if;
  if exists (select 1 from poznavalec_prosnje
              where user_id = auth.uid() and competition_id = p_competition_id and status = 'caka') then
    raise exception 'Tvoja prosnja za to ligo ze caka.';
  end if;
  insert into poznavalec_prosnje (user_id, competition_id, team_id, vloga, sporocilo)
  values (auth.uid(), p_competition_id, p_team_id, p_vloga, nullif(btrim(p_sporocilo), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.zaprosi_za_poznavalca(bigint, bigint, text, text) from public;
grant execute on function public.zaprosi_za_poznavalca(bigint, bigint, text, text) to authenticated;

-- Admin: cakajoce prosnje z imenom, e-naslovom in klubom.
create or replace function public.admin_prosnje_poznavalcev()
returns table (
  id bigint,
  user_id uuid,
  display_name text,
  email text,
  competition_id bigint,
  competition_name text,
  team_id bigint,
  team_name text,
  vloga text,
  sporocilo text,
  created_at timestamptz,
  glasov int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  select p.id, p.user_id, pr.display_name, u.email::text,
         p.competition_id, c.name, p.team_id, t.name, p.vloga, p.sporocilo, p.created_at,
         ((select count(*) from position_votes pv where pv.voter_id = p.user_id)
          + (select count(*) from assist_votes av where av.voter_id = p.user_id))::int
  from poznavalec_prosnje p
  join profiles pr on pr.id = p.user_id
  join auth.users u on u.id = p.user_id
  join competitions c on c.id = p.competition_id
  left join teams t on t.id = p.team_id
  where p.status = 'caka'
  order by p.created_at;
end;
$$;
grant execute on function public.admin_prosnje_poznavalcev() to authenticated;

-- Odlocitev: 'klub' (insider_team_id), 'liga' (insider_competition_id) ali 'zavrnjeno'.
create or replace function public.admin_odloci_prosnjo(p_id bigint, p_odlocitev text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p poznavalec_prosnje;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  if p_odlocitev not in ('klub', 'liga', 'zavrnjeno') then
    raise exception 'Odlocitev je klub, liga ali zavrnjeno.';
  end if;
  select * into v_p from poznavalec_prosnje where id = p_id and status = 'caka';
  if not found then
    raise exception 'Prosnja ne obstaja ali je ze odlocena.';
  end if;

  if p_odlocitev = 'liga' then
    update profiles set insider_competition_id = v_p.competition_id where id = v_p.user_id;
  elsif p_odlocitev = 'klub' and v_p.team_id is not null then
    update profiles set insider_team_id = v_p.team_id where id = v_p.user_id;
  end if;

  update poznavalec_prosnje
     set status = p_odlocitev, decided_at = now(), decided_by = auth.uid()
   where id = p_id;
end;
$$;
grant execute on function public.admin_odloci_prosnjo(bigint, text) to authenticated;
