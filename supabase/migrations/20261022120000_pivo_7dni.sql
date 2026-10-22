-- Pivo 7 dni po prvi ekipi: en sproščen mail ("SLFF je brezplačen in tak tudi
-- ostane … lahko pa nam plačaš eno pivo") teden po tem, ko je človek sestavil
-- prvo fantasy ekipo. Pošlje ga `posli-opomnik` (vrsta `pivo-7dni`), sproži
-- ga delovni tok `pivo-7dni.yml` (ob združitvi le ročno, glej tam).
--
-- Kdo:
--   * prva nehišna ekipa (najstarejša `fantasy_teams.created_at`, `hisna` =
--     false) je nastala pred 7 do 10 dnevi; okno je širše od dneva, da
--     izpuščen zagon ne izgubi nikogar, in ozko, da ob vklopu ne zajame vseh
--     starih računov,
--   * vsaj ena nehišna ekipa v nemladinski ligi (mladim brez piva:
--     `je_mladinski_slug`); kdor igra le v mladinskih ligah, ga ne dobi,
--   * račun s potrjenim naslovom, ni odjavljen (`brez_opomnikov`), ni
--     sistemski (lastnik hišnih ekip). Računi samo za trgovino nimajo ekipe in
--     zato niso nikoli kandidati.
-- Enkrat na človeka, za vedno: uspešna vrstica `email_log` 'pivo-7dni'
-- konča; neuspel poskus se ponovi največ dvakrat, ne pogosteje kot na dan.
--
-- Liga (jezik maila in povezave `?t=`): najstarejša nehišna ekipa v
-- nemladinski ligi.
create or replace function public.kandidati_za_pivo_7dni(p_najvec int default 100)
returns table (
  user_id uuid,
  email text,
  display_name text,
  competition_id bigint,
  liga_slug text,
  liga_oznaka text,
  liga_drzava text
)
language sql
stable
security definer
set search_path = public
as $$
  with prva as (
    select f.owner_id, min(f.created_at) as ob
      from fantasy_teams f
     where not f.hisna
     group by f.owner_id
  )
  select u.id,
         u.email,
         p.display_name,
         li.id,
         li.slug,
         li.short_name,
         li.drzava
    from prva
    join auth.users u on u.id = prva.owner_id
    join profiles p on p.id = u.id
    join lateral (
      select c.id, c.slug, c.short_name, d.code as drzava
        from fantasy_teams f
        join competitions c on c.id = f.competition_id
        left join countries d on d.id = c.country_id
       where f.owner_id = u.id and not f.hisna and not je_mladinski_slug(c.slug)
       order by f.created_at, f.id
       limit 1
    ) li on true
   where prva.ob between now() - interval '10 days' and now() - interval '7 days'
     and u.email is not null
     and u.email_confirmed_at is not null
     and u.deleted_at is null
     and not p.brez_opomnikov
     and not exists (select 1 from fantasy_teams f where f.owner_id = u.id and f.hisna)
     and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'pivo-7dni' and l.napaka is null)
     and (select count(*) from email_log l where l.user_id = u.id and l.vrsta = 'pivo-7dni') < 3
     and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'pivo-7dni'
                       and l.poslano_at > now() - interval '1 day')
   order by prva.ob
   limit greatest(p_najvec, 0)
$$;

revoke all on function public.kandidati_za_pivo_7dni(int) from public, anon, authenticated;
grant execute on function public.kandidati_za_pivo_7dni(int) to service_role;
