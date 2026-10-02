-- Potisna obvestila mobilne aplikacije.
--
-- Žeton FCM (Firebase Cloud Messaging, za iOS in Android) pripada napravi, ne
-- človeku: ob prijavi drugega uporabnika na isti napravi se žeton preseli k
-- njemu. Zato je ključ žeton in ga vpiše le `shrani_push_zeton` — neposredno
-- pisanje bi s pravico `update` dovolilo prevzem tujega žetona, brez nje pa
-- preselitve ne bi bilo. Bere ga samo servis (posli-opomnik).

create table push_tokens (
  token      text primary key,
  user_id    uuid not null references profiles on delete cascade,
  platforma  text not null check (platforma in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user on push_tokens (user_id);

alter table push_tokens enable row level security;
-- Brez politik: anon in authenticated ne vidita ničesar, servis vse.

create or replace function public.shrani_push_zeton(p_zeton text, p_platforma text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Za obvestila se prijavi.';
  end if;
  if coalesce(length(p_zeton), 0) not between 1 and 4096 then
    raise exception 'Neveljaven žeton.';
  end if;
  insert into push_tokens (token, user_id, platforma)
  values (p_zeton, auth.uid(), p_platforma)
  on conflict (token) do update
    set user_id = excluded.user_id, platforma = excluded.platforma, updated_at = now();
end;
$$;

revoke all on function public.shrani_push_zeton(text, text) from public, anon;
grant execute on function public.shrani_push_zeton(text, text) to authenticated;
