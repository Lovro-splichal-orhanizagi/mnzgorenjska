-- Omejitev uporabnika (cooldown): admin uporabniku za nekaj dni zapre vse, s
-- čimer piše o drugih ljudeh — prijave o igralcih, klepet, glasove o
-- asistencah in pozicijah, prijave mini lig in profilov, potrditve soigralcev.
-- Ekipa, kader in ime ostanejo; igra teče naprej.
--
-- Zapora je v bazi, ne v vmesniku: sprožilec BEFORE INSERT/UPDATE na vsaki
-- tabeli zavrne vrstico, če ima `auth.uid()` veljavno omejitev. Uvozi in
-- servis (`auth.uid()` je NULL) gredo mimo. Napaka nosi rok v ISO obliki,
-- vmesnik ga prevede (`src/lib/napake.ts`).
--
-- Prvi primer (17. 10. 2026): žaljive in lažne prijave o igralcih. Prijave teh
-- računov so izbrisane, računi omejeni (spodaj).

create table public.omejitve_uporabnikov (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles on delete cascade,
  velja_do       timestamptz not null,
  razlog         text not null check (char_length(razlog) between 1 and 300),
  created_by     uuid references public.profiles on delete set null,
  created_at     timestamptz not null default now(),
  odstranjena_at timestamptz
);
create index omejitve_uporabnikov_uporabnik on public.omejitve_uporabnikov (user_id, velja_do desc);
alter table public.omejitve_uporabnikov enable row level security;
revoke all on public.omejitve_uporabnikov from anon, authenticated;
grant select on public.omejitve_uporabnikov to authenticated;
create policy "uporabnik bere svojo" on public.omejitve_uporabnikov
  for select using (user_id = auth.uid());

-- Do kdaj je uporabnik omejen (NULL = ni).
create or replace function public.omejen_do(p_uid uuid)
returns timestamptz language sql stable security definer set search_path = public
as $$
  select max(velja_do) from omejitve_uporabnikov
   where user_id = p_uid and odstranjena_at is null and velja_do > now()
$$;

create or replace function public.je_omejen(p_uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.omejen_do(p_uid) is not null $$;

revoke all on function public.omejen_do(uuid) from public, anon, authenticated;
revoke all on function public.je_omejen(uuid) from public, anon, authenticated;

create or replace function public.zavrni_omejenega()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_do timestamptz;
begin
  if auth.uid() is null then
    return new;
  end if;
  v_do := omejen_do(auth.uid());
  if v_do is not null then
    raise exception 'Račun je omejen do %.', to_char(v_do at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.zavrni_omejenega() from public, anon, authenticated;

create trigger zavrni_omejenega before insert on public.player_reports
  for each row execute function public.zavrni_omejenega();
create trigger zavrni_omejenega before insert on public.chat_messages
  for each row execute function public.zavrni_omejenega();
create trigger zavrni_omejenega before insert or update on public.assist_votes
  for each row execute function public.zavrni_omejenega();
create trigger zavrni_omejenega before insert or update on public.position_votes
  for each row execute function public.zavrni_omejenega();
create trigger zavrni_omejenega before insert on public.prijave_mini_lig
  for each row execute function public.zavrni_omejenega();
create trigger zavrni_omejenega before insert on public.prijave_profila_igralca
  for each row execute function public.zavrni_omejenega();
create trigger zavrni_omejenega before insert on public.potrditve_soigralcev
  for each row execute function public.zavrni_omejenega();

-- Nova omejitev nadomesti veljavno (krajšo ali daljšo).
create or replace function public.admin_omeji_uporabnika(p_user_id uuid, p_dni int, p_razlog text)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_razlog text := btrim(coalesce(p_razlog, ''));
  v_ime    text;
  v_id     bigint;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  if p_dni is null or p_dni not between 1 and 365 then
    raise exception 'Omejitev traja od 1 do 365 dni.';
  end if;
  if char_length(v_razlog) not between 1 and 300 then
    raise exception 'Razlog omejitve ima od 1 do 300 znakov.';
  end if;
  select display_name into v_ime from profiles where id = p_user_id;
  if not found then
    raise exception 'Uporabnika ni.';
  end if;
  update omejitve_uporabnikov set odstranjena_at = now()
   where user_id = p_user_id and odstranjena_at is null and velja_do > now();
  insert into omejitve_uporabnikov (user_id, velja_do, razlog, created_by)
  values (p_user_id, now() + make_interval(days => p_dni), v_razlog, auth.uid())
  returning id into v_id;
  perform preverjeni_na_discord(format('🚫 %s je omejen %s dni: %s', coalesce(v_ime, p_user_id::text), p_dni, v_razlog));
  return v_id;
end;
$$;

create or replace function public.admin_odstrani_omejitev(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  update omejitve_uporabnikov set odstranjena_at = now() where id = p_id and odstranjena_at is null;
end;
$$;

create or replace function public.admin_omejitve()
returns table (id bigint, user_id uuid, ime text, velja_do timestamptz, razlog text, created_at timestamptz, avtor text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
    select o.id, o.user_id, p.display_name, o.velja_do, o.razlog, o.created_at, a.display_name
      from omejitve_uporabnikov o
      join profiles p on p.id = o.user_id
      left join profiles a on a.id = o.created_by
     where o.odstranjena_at is null and o.velja_do > now()
     order by o.velja_do;
end;
$$;

revoke all on function public.admin_omeji_uporabnika(uuid, int, text) from public, anon;
revoke all on function public.admin_odstrani_omejitev(bigint) from public, anon;
revoke all on function public.admin_omejitve() from public, anon;
grant execute on function public.admin_omeji_uporabnika(uuid, int, text) to authenticated;
grant execute on function public.admin_odstrani_omejitev(bigint) to authenticated;
grant execute on function public.admin_omejitve() to authenticated;

-- Prvi primer, 17.–18. 10. 2026. Na sveži bazi teh računov ni in se ne zgodi nič.
delete from public.player_reports where user_id in (
  '8de578a4-c395-4256-b44a-e6d7ce60a154',
  '537dac5b-95ea-4d5a-9201-682daf46b0ea',
  '67b42251-a663-4e33-afee-dc1c8722f012',
  'e6aaaf68-d4f1-4a47-b710-b792dbe64392',
  '8b628b38-8caa-4a5d-9386-ebc67503f3ab',
  'd2c62b98-daf2-4c3c-80f1-1ae3c88c311c'
);
insert into public.omejitve_uporabnikov (user_id, velja_do, razlog)
select p.id, now() + make_interval(days => o.dni), o.razlog
  from (values
    ('8de578a4-c395-4256-b44a-e6d7ce60a154'::uuid, 30, 'žaljive prijave o igralcih drugih klubov'),
    ('537dac5b-95ea-4d5a-9201-682daf46b0ea'::uuid, 7, 'lažne in vulgarne prijave'),
    ('67b42251-a663-4e33-afee-dc1c8722f012'::uuid, 7, 'lažne in vulgarne prijave'),
    ('e6aaaf68-d4f1-4a47-b710-b792dbe64392'::uuid, 7, 'lažne in vulgarne prijave'),
    ('8b628b38-8caa-4a5d-9386-ebc67503f3ab'::uuid, 7, 'lažne in vulgarne prijave'),
    ('d2c62b98-daf2-4c3c-80f1-1ae3c88c311c'::uuid, 7, 'lažne in vulgarne prijave')
  ) as o (uid, dni, razlog)
  join public.profiles p on p.id = o.uid;
