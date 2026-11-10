-- Enkratni mail "Pripelji prijatelja" (10. 11. 2026): vsak z nehišno ekipo s
-- kadrom dobi svojo povezavo s kodo vabila (`?od=<koda>`, migracija
-- 20261014233100) do svoje lige. Prijatelj, ki se prijavi prek nje in sestavi
-- ekipo, se zabeleži v `povabila` kot doslej.
--
-- Enkrat za vedno; brez odjavljenih (`brez_opomnikov`), izbrisanih,
-- nepotrjenih in omejenih računov ter lastnikov hišnih ekip. En mail na naslov
-- (več računov z istim naslovom). Kdor je v zadnjih 7 dneh dobil drug enkratni
-- mail (novost, pivo, dobrodošlica, promocija, anketa), počaka — mail.slff.eu
-- se še ogreva in ljudje ne smejo dobiti dveh promocij zapored.
--
-- Funkcija je `volatile`: izbranim brez kode jo ustvari (kot `moja_koda_vabila`),
-- da mail nosi povezavo, ki jo baza prepozna. Pošiljanje sproži le delovni tok
-- `povabi-prijatelja.yml` (ročno, privzeto suho, po paketih).

create or replace function public.kandidati_za_povabi_prijatelja(p_najvec int default 100, p_ustvari_kode boolean default true)
returns table (
  user_id uuid,
  email text,
  display_name text,
  competition_id bigint,
  liga_slug text,
  liga_oznaka text,
  liga_drzava text,
  koda text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r record;
  k text;
begin
  for r in
    with izbrani as (
      select u.id as uid, u.email as em, p.display_name as ime, u.created_at,
             li.id as cid, li.slug, li.short_name, li.drzava,
             row_number() over (partition by lower(u.email) order by u.last_sign_in_at desc nulls last, u.id) as rn
        from auth.users u
        join profiles p on p.id = u.id
        join lateral (
          select c.id, c.slug, c.short_name, d.code as drzava
            from fantasy_teams f
            join competitions c on c.id = f.competition_id
            left join countries d on d.id = c.country_id
           where f.owner_id = u.id and not f.hisna and c.active
             and exists (select 1 from fantasy_roster fr where fr.fantasy_team_id = f.id)
           order by f.created_at desc, f.id desc
           limit 1
        ) li on true
       where u.email is not null
         and u.email_confirmed_at is not null
         and u.deleted_at is null
         and not coalesce(p.brez_opomnikov, false)
         and not je_omejen(u.id)
         and not exists (select 1 from fantasy_teams f where f.owner_id = u.id and f.hisna)
         -- Enkrat za vedno (tudi drug račun z istim naslovom).
         and not exists (select 1 from email_log l where l.vrsta = 'povabi-prijatelja' and l.napaka is null
                           and (l.user_id = u.id or lower(l.email) = lower(u.email)))
         and (select count(*) from email_log l where l.user_id = u.id and l.vrsta = 'povabi-prijatelja') < 3
         and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'povabi-prijatelja'
                           and l.poslano_at > now() - interval '1 day')
         -- Razmik do drugih enkratnih mailov.
         and not exists (select 1 from email_log l where l.user_id = u.id and l.napaka is null
                           and l.vrsta in ('novost-mini-lige', 'pivo-7dni', 'dobrodoslica', 'brez-ekipe',
                                           'promo-preverjen', 'anketa-placila')
                           and l.poslano_at > now() - interval '7 days')
    )
    select * from izbrani where rn = 1
     order by created_at
     limit greatest(p_najvec, 0)
  loop
    -- Koda vabila kot v `moja_koda_vabila`, le za izbranega namesto auth.uid().
    -- Suhi tek (`p_ustvari_kode = false`) le šteje in ne piše.
    k := null;
    loop
      select kv.koda into k from kode_vabil kv where kv.user_id = r.uid;
      exit when k is not null or not p_ustvari_kode;
      insert into kode_vabil (user_id, koda)
      values (r.uid, substr(md5(gen_random_uuid()::text), 1, 8))
      on conflict do nothing;
    end loop;
    user_id := r.uid; email := r.em; display_name := r.ime;
    competition_id := r.cid; liga_slug := r.slug; liga_oznaka := r.short_name; liga_drzava := r.drzava;
    koda := k;
    return next;
  end loop;
end;
$$;
revoke all on function public.kandidati_za_povabi_prijatelja(int, boolean) from public, anon, authenticated;
grant execute on function public.kandidati_za_povabi_prijatelja(int, boolean) to service_role;
