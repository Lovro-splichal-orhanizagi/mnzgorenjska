-- Anketa "kaj bi plačal" (SLF-211), druga različica: Lovro (30. 10. 2026) želi
-- okoli 50 ročno izbranih, ne 20. Meja je zdaj 50 skupaj in 10 na klic (edge
-- funkcija). Pri 50 ljudeh in več zavihkih ali adminih dva sočasna klica ne
-- smeta poslati istemu človeku dvakrat, zato edge funkcija pred pošiljanjem
-- "zasede" vrstico v email_log (napaka = 'poteka'), po pošiljanju pa jo
-- popravi v uspeh (napaka null) ali napako. Edinstven delni indeks dovoli eno
-- uspešno ali tekočo vrstico na človeka; meja 50 se šteje pod zaklepom.
--
-- Če funkcija pade med pošiljanjem, vrstica ostane 'poteka': ta človek je
-- blokiran (raje en mail premalo kot dva) in v suhem teku viden kot `v_teku`.

create unique index if not exists email_log_anketa_placila_enkrat
  on email_log (user_id)
  where vrsta = 'anketa-placila' and (napaka is null or napaka = 'poteka');

-- Vrne id zasedene vrstice; -1 = meja dosežena, 0 = človek že ima uspešno
-- ali tekočo vrstico.
create or replace function public.anketa_placila_zasedi(
  p_user_id uuid, p_email text, p_competition_id bigint, p_meja int
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('anketa-placila'));
  if (select count(distinct user_id) from email_log
       where vrsta = 'anketa-placila' and (napaka is null or napaka = 'poteka')) >= p_meja then
    return -1;
  end if;
  insert into email_log (user_id, email, vrsta, competition_id, napaka)
  values (p_user_id, p_email, 'anketa-placila', p_competition_id, 'poteka')
  on conflict (user_id) where vrsta = 'anketa-placila' and (napaka is null or napaka = 'poteka')
  do nothing
  returning id into v_id;
  return coalesce(v_id, 0);
end
$$;

revoke all on function public.anketa_placila_zasedi(uuid, text, bigint, int) from public, anon, authenticated;
grant execute on function public.anketa_placila_zasedi(uuid, text, bigint, int) to service_role;

-- Suhi tek pokaže tekoče (zasedene) posebej; 'poteka' ne šteje med neuspele.
create or replace function public.prejemniki_ankete(p_ids uuid[], p_competition_id bigint)
returns table (
  user_id uuid,
  email text,
  display_name text,
  competition_id bigint,
  liga_slug text,
  liga_oznaka text,
  liga_drzava text,
  razlog text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email::text, p.display_name,
         coalesce(li.id, iz.id), coalesce(li.slug, iz.slug),
         coalesce(li.short_name, iz.short_name), coalesce(li.drzava, iz.drzava),
         case
           when u.email is null then 'brez_naslova'
           when u.email_confirmed_at is null or u.deleted_at is not null
             or (u.banned_until is not null and u.banned_until > now()) then 'neaktiven_racun'
           when coalesce(p.brez_opomnikov, false) then 'odjavljen'
           when exists (select 1 from email_log l where l.user_id = u.id
                          and l.vrsta = 'anketa-placila' and l.napaka is null) then 'ze_dobil'
           when exists (select 1 from email_log l where l.user_id = u.id
                          and l.vrsta = 'anketa-placila' and l.napaka = 'poteka') then 'v_teku'
           when (select count(*) from email_log l where l.user_id = u.id
                   and l.vrsta = 'anketa-placila') >= 3 then 'trije_neuspeli'
         end
    from auth.users u
    join profiles p on p.id = u.id
    left join lateral (
      select c.id, c.slug, c.short_name, d.code as drzava
        from fantasy_teams f
        join competitions c on c.id = f.competition_id
        left join countries d on d.id = c.country_id
       where f.owner_id = u.id and not f.hisna and not je_mladinski_slug(c.slug)
       order by f.roster_updated_at desc nulls last, f.created_at, f.id
       limit 1
    ) li on true
    left join lateral (
      select c.id, c.slug, c.short_name, d.code as drzava
        from competitions c
        left join countries d on d.id = c.country_id
       where c.id = p_competition_id
    ) iz on true
   where u.id = any(p_ids)
$$;

revoke all on function public.prejemniki_ankete(uuid[], bigint) from public, anon, authenticated;
grant execute on function public.prejemniki_ankete(uuid[], bigint) to service_role;
