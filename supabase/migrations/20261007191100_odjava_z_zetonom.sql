-- Odjava od e-pošte brez prijave in meja opomnikov "nimaš ekipe".
--
-- 1. Odjava z enim klikom. Povezava v nogi maila (in glava List-Unsubscribe)
--    je slff.eu/reminders?u=<uporabnik>&z=<žeton>; stran pokaže gumb, ta kliče
--    `odjavi_z_zetonom`. Žeton je HMAC uporabnikovega id-ja s ključem, ki ga
--    vidi le baza, zato povezave ni mogoče ponarediti za tujega uporabnika.
--    Odjava ni ob odprtju strani (GET), ampak šele ob kliku: pregledovalniki
--    povezav v poštnih predalih bi sicer odjavili ljudi, ki tega niso hoteli.
--
-- 2. Opomnik "še nimaš ekipe" (opomniki.yml) gre po novem po urniku. Brez meje
--    bi človek, ki ekipe noče, dobival mail vsake tri dni do konca sezone.
--    Zdaj: največ trikrat skupaj in ne pogosteje kot na sedem dni.

create table public.odjava_kljuc (
  id int primary key default 1 check (id = 1),
  kljuc bytea not null
);
alter table public.odjava_kljuc enable row level security;
revoke all on public.odjava_kljuc from public, anon, authenticated;
insert into public.odjava_kljuc (kljuc) values (extensions.gen_random_bytes(32));

create function public.zeton_odjave(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select left(encode(extensions.hmac(p_user::text::bytea, k.kljuc, 'sha256'), 'hex'), 40)
    from public.odjava_kljuc k
$$;
revoke all on function public.zeton_odjave(uuid) from public, anon, authenticated;
grant execute on function public.zeton_odjave(uuid) to service_role;

create function public.odjavi_z_zetonom(p_user uuid, p_zeton text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_user is null or p_zeton is null or p_zeton <> public.zeton_odjave(p_user) then
    return false;
  end if;
  update public.profiles set brez_opomnikov = true where id = p_user;
  return found;
end $$;
revoke all on function public.odjavi_z_zetonom(uuid, text) from public;
grant execute on function public.odjavi_z_zetonom(uuid, text) to anon, authenticated;

-- Isti podpis kot doslej (kliče ga posli-opomnik).
create or replace function public.nedavni_opomnik(p_user_id uuid, p_competition_id bigint)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from email_log
     where user_id = p_user_id
       and vrsta = 'opomnik-ekipa'
       and poslano_at > now() - interval '7 days'
       and napaka is null
  )
  or (
    select count(*) from email_log
     where user_id = p_user_id
       and vrsta = 'opomnik-ekipa'
       and napaka is null
  ) >= 3;
$$;
