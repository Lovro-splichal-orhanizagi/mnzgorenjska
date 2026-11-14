-- Povabila po meri: berljiva osebna koda (iz imena, npr. "luka27"), ki jo
-- lastnik lahko spremeni, kratka povezava /i/<koda> s stranjo "X te vabi",
-- vnos kode ob registraciji in seznam povabljenih s stanjem.
--
-- Stare kode (naključnih 8 znakov) ostanejo veljavne v `stare_kode_vabil`,
-- da že deljene povezave še štejejo.

create table public.stare_kode_vabil (
  koda       text primary key,
  user_id    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);
create index stare_kode_vabil_uporabnik on public.stare_kode_vabil (user_id);
alter table public.stare_kode_vabil enable row level security;
revoke all on public.stare_kode_vabil from public, anon, authenticated;

alter table public.kode_vabil drop constraint if exists kode_vabil_koda_check;
alter table public.kode_vabil add constraint kode_vabil_koda_check check (koda ~ '^[a-z0-9]{3,20}$');

-- Kode, ki jih nihče ne dobi (zamenjava z uradnimi naslovi).
create or replace function public.koda_vabila_rezervirana(p_koda text)
returns boolean language sql immutable
as $$
  select p_koda in ('admin', 'slff', 'support', 'pomoc', 'help', 'test', 'null', 'undefined',
                    'invite', 'login', 'moderator', 'info', 'klubi', 'noreply')
$$;

-- Prosta koda za uporabnika: prva beseda imena brez šumnikov + dve števki.
create or replace function public.predlagaj_kodo_vabila(p_ime text)
returns text language plpgsql volatile security definer set search_path = public
as $$
declare
  v_osnova text := left(regexp_replace(split_part(podpora_brez_sumnikov(btrim(coalesce(p_ime, ''))), ' ', 1), '[^a-z0-9]', '', 'g'), 12);
  v_koda text;
begin
  if char_length(v_osnova) < 3 or koda_vabila_rezervirana(v_osnova) then
    v_osnova := 'slff';
  end if;
  for i in 1..50 loop
    v_koda := v_osnova || (10 + floor(random() * (case when i < 20 then 90 else 9990 end)))::int;
    if not exists (select 1 from kode_vabil where koda = v_koda)
       and not exists (select 1 from stare_kode_vabil where koda = v_koda) then
      return v_koda;
    end if;
  end loop;
  return substr(md5(gen_random_uuid()::text), 1, 10);
end;
$$;
revoke all on function public.predlagaj_kodo_vabila(text) from public, anon, authenticated;

-- Čigava je koda (trenutna ali stara).
create or replace function public.lastnik_kode_vabila(p_koda text)
returns uuid language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select user_id from kode_vabil where koda = lower(btrim(p_koda))),
    (select user_id from stare_kode_vabil where koda = lower(btrim(p_koda))))
$$;
revoke all on function public.lastnik_kode_vabila(text) from public, anon, authenticated;

-- Obstoječe kode: berljiva nova, stara ostane veljavna.
do $$
declare
  r record;
begin
  for r in select k.user_id, k.koda, p.display_name from kode_vabil k join profiles p on p.id = k.user_id loop
    insert into stare_kode_vabil (koda, user_id) values (r.koda, r.user_id) on conflict do nothing;
    update kode_vabil set koda = predlagaj_kodo_vabila(r.display_name) where user_id = r.user_id;
  end loop;
end;
$$;

create or replace function public.moja_koda_vabila()
returns text
language plpgsql volatile security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  k text;
begin
  if uid is null then
    raise insufficient_privilege using message = 'Prijava je potrebna.';
  end if;
  select koda into k from kode_vabil where user_id = uid;
  if k is not null then
    return k;
  end if;
  for i in 1..5 loop
    begin
      insert into kode_vabil (user_id, koda)
      values (uid, predlagaj_kodo_vabila((select display_name from profiles where id = uid)))
      on conflict (user_id) do nothing;
      select koda into k from kode_vabil where user_id = uid;
      return k;
    exception when unique_violation then
      null; -- hkrati izbrana ista koda: poskusi znova
    end;
  end loop;
  raise exception 'Kode ni bilo mogoče ustvariti.';
end;
$$;

-- Servis (pošta akcije): koda uporabnika, po potrebi ustvarjena.
create or replace function public.koda_vabila_za(p_uid uuid)
returns text language plpgsql volatile security definer set search_path = public
as $$
declare
  k text;
begin
  select koda into k from kode_vabil where user_id = p_uid;
  if k is null then
    insert into kode_vabil (user_id, koda)
    values (p_uid, predlagaj_kodo_vabila((select display_name from profiles where id = p_uid)))
    on conflict (user_id) do nothing;
    select koda into k from kode_vabil where user_id = p_uid;
  end if;
  return k;
end;
$$;
revoke all on function public.koda_vabila_za(uuid) from public, anon, authenticated;
grant execute on function public.koda_vabila_za(uuid) to service_role;

-- Lastnik izbere svojo kodo. Stara ostane veljavna (že deljene povezave).
create or replace function public.nastavi_kodo_vabila(p_koda text)
returns text language plpgsql volatile security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_nova text := lower(btrim(coalesce(p_koda, '')));
  v_stara text;
  v_lastnik uuid;
begin
  if uid is null then
    raise insufficient_privilege using message = 'Prijava je potrebna.';
  end if;
  if v_nova !~ '^[a-z0-9]{3,20}$' then
    raise exception 'Koda ima lahko od 3 do 20 malih črk brez šumnikov in števk.' using hint = 'oblika';
  end if;
  if koda_vabila_rezervirana(v_nova) then
    raise exception 'Ta koda ni na voljo.' using hint = 'zasedena';
  end if;
  -- Dve hkratni izbiri iste kode: druga počaka in vidi zasedeno.
  perform pg_advisory_xact_lock(hashtextextended('slff-koda-vabila', 0));
  v_lastnik := lastnik_kode_vabila(v_nova);
  if v_lastnik is not null and v_lastnik <> uid then
    raise exception 'Ta koda ni na voljo.' using hint = 'zasedena';
  end if;
  if (select count(*) from stare_kode_vabil where user_id = uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Kodo lahko spremeniš največ petkrat na dan.' using hint = 'prepogosto';
  end if;
  v_stara := moja_koda_vabila();
  if v_stara = v_nova then
    return v_nova;
  end if;
  insert into stare_kode_vabil (koda, user_id) values (v_stara, uid) on conflict (koda) do nothing;
  delete from stare_kode_vabil where koda = v_nova and user_id = uid;
  update kode_vabil set koda = v_nova where user_id = uid;
  return v_nova;
end;
$$;
revoke all on function public.nastavi_kodo_vabila(text) from public, anon;
grant execute on function public.nastavi_kodo_vabila(text) to authenticated;

-- Stran /i/<koda>: kdo vabi (vzdevek in avatar sta javna že na lestvicah).
create or replace function public.vabilo_od(p_koda text)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('ime', p.display_name, 'avatar_barva', p.avatar_barva, 'avatar_ikona', p.avatar_ikona)
    from profiles p
   where p.id = lastnik_kode_vabila(p_koda)
     and not exists (select 1 from fantasy_teams ft where ft.owner_id = p.id and ft.hisna)
$$;
revoke all on function public.vabilo_od(text) from public;
grant execute on function public.vabilo_od(text) to anon, authenticated;

-- Povabilo zdaj sprejme tudi staro kodo.
create or replace function public.zabelezi_povabilo(p_koda text)
returns boolean
language plpgsql volatile security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  od  uuid;
begin
  if uid is null then
    return false;
  end if;
  od := lastnik_kode_vabila(p_koda);
  if od is null or od = uid then
    return false;
  end if;
  if not exists (select 1 from profiles where id = uid and created_at > now() - interval '2 days') then
    return false;
  end if;
  insert into povabila (povabljeni, povabil) values (uid, od) on conflict do nothing;
  return found;
end;
$$;

-- Za /invite: kdo je prišel prek moje povezave in kje je.
create or replace function public.moji_povabljeni()
returns table (ime text, kdaj timestamptz, stanje text)
language sql stable security definer set search_path = public
as $$
  select coalesce(p.display_name, '—'), pv.created_at,
         case when povabilo_steje(pv.povabljeni) then 'steje'
              when exists (select 1 from fantasy_teams ft where ft.owner_id = pv.povabljeni and not ft.hisna) then 'kader'
              when exists (select 1 from auth.users u where u.id = pv.povabljeni and u.email_confirmed_at is null) then 'potrditev'
              else 'ekipa' end
    from povabila pv join profiles p on p.id = pv.povabljeni
   where pv.povabil = auth.uid()
   order by pv.created_at desc
   limit 100
$$;
revoke all on function public.moji_povabljeni() from public, anon;
grant execute on function public.moji_povabljeni() to authenticated;

-- Obiski: nova stran 'vabilo' (/i/<koda>).
create or replace function public.zabelezi_obisk(p_stran text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ustvarjen timestamptz;
  v_skupina text;
begin
  if p_stran not in (
    'domov', 'vstop_drzave', 'moja_ekipa', 'igralci', 'igralec', 'lestvica',
    'slovenija', 'mini_lige', 'vstop_v_mini_ligo', 'ekipa', 'klub', 'rezultati',
    'tekma', 'glasovanje', 'pozicije', 'odsotnosti', 'racun', 'opomniki',
    'pravno', 'prijava', 'potrditev', 'tabela', 'profil', 'napovedi', 'povabi', 'vabilo'
  ) then
    return;
  end if;

  select created_at into v_ustvarjen from auth.users where id = auth.uid();

  v_skupina := case
    when v_ustvarjen is null then 'neprijavljen'
    when v_ustvarjen > now() - interval '7 days' then 'nov'
    else 'star'
  end;

  insert into obiski_dnevno (dan, stran, skupina, stevilo)
  values (current_date, p_stran, v_skupina, 1)
  on conflict (dan, stran, skupina) do update
    set stevilo = obiski_dnevno.stevilo + 1;
end;
$$;
revoke all on function public.zabelezi_obisk(text) from public;
grant execute on function public.zabelezi_obisk(text) to anon, authenticated;
