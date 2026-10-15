-- Opomniki brez ekipe: po dobrodošlici še do trije maili in push "sestavi
-- ekipo" tistim, ki ekipe še nimajo (ali je prazna). 15. 10. 2026 je bilo
-- takih 55 % računov (~1800 od 3370); dobrodošlica gre le enkrat, v prvem
-- tednu, zato zaostanek starejših računov ni dobil ničesar.
--
-- Urnik na človeka: prvi ≥ 3 dni po registraciji, vsak naslednji ≥ 7 dni po
-- prejšnjem uspešnem, največ trije uspešni (in šest poskusov), nikoli v dveh
-- dneh po dobrodošlici ali v treh po ročnem opomniku. V oknu dobrodošlice
-- (prvih 7 dni) mora ta najprej oditi. Konec, ko ima človek neprazno ekipo v
-- katerikoli ligi. Najprej najnovejše registracije (toplejše).
--
-- Liga za mail: liga njegove (prazne) ekipe, sicer liga kluba, ki mu navija,
-- sicer prva aktivna liga države jezika prijave (SI: člani); brez vsega je
-- `liga_slug` null in mail lige ne imenuje. `rok` je rok naslednjega kroga.
create or replace function public.kandidati_za_opomnik_brez_ekipe(p_najvec int default 100)
returns table (
  user_id uuid,
  email text,
  display_name text,
  jezik text,
  competition_id bigint,
  liga_slug text,
  liga_oznaka text,
  liga_drzava text,
  rok timestamptz,
  email_vklop boolean,
  push_vklop boolean
)
language sql
stable
security definer
set search_path = public
as $$
  -- Najprej kandidati (z mejo), šele nato liga: izbira lige je na človeka
  -- dražja in naj ne teče za vseh ~1800.
  with k as (
    select u.id, u.email, u.raw_user_meta_data->>'jezik' as jezik, u.created_at,
           p.display_name, p.navijam_team_id, p.brez_opomnikov, p.brez_push
      from auth.users u
      join profiles p on p.id = u.id
     where u.created_at < now() - interval '3 days'
       and u.email_confirmed_at is not null
       and u.deleted_at is null
       and not exists (select 1 from fantasy_teams f where f.owner_id = u.id and f.hisna)
       and not exists (select 1 from fantasy_teams f join fantasy_roster r on r.fantasy_team_id = f.id
                        where f.owner_id = u.id and not f.hisna)
       -- V oknu dobrodošlice gre ta prva; po njej dva dni premora.
       and (u.created_at < now() - interval '7 days'
            or exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'dobrodoslica' and l.napaka is null))
       and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'dobrodoslica'
                         and l.poslano_at > now() - interval '2 days')
       and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'opomnik-ekipa'
                         and l.poslano_at > now() - interval '3 days')
       -- Največ trije uspešni, vsaj 7 dni narazen; neuspel poskus se ponovi
       -- naslednji dan, vseh poskusov je največ šest.
       and (select count(*) from email_log l where l.user_id = u.id and l.vrsta = 'brez-ekipe' and l.napaka is null) < 3
       and (select count(*) from email_log l where l.user_id = u.id and l.vrsta = 'brez-ekipe') < 6
       and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'brez-ekipe'
                         and l.napaka is null and l.poslano_at > now() - interval '7 days')
       and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'brez-ekipe'
                         and l.poslano_at > now() - interval '1 day')
       and (not p.brez_opomnikov
            or (not p.brez_push and exists (select 1 from push_tokens pt where pt.user_id = u.id)))
     order by u.created_at desc
     limit greatest(p_najvec, 0)
  )
  select k.id,
         k.email,
         k.display_name,
         k.jezik,
         li.id,
         li.slug,
         li.short_name,
         li.drzava,
         nk.deadline_at,
         not k.brez_opomnikov,
         not k.brez_push and exists (select 1 from push_tokens pt where pt.user_id = k.id)
    from k
    left join lateral (
      select c.id, c.slug, c.short_name, d.code as drzava
        from competitions c
        join countries d on d.id = c.country_id
        cross join lateral (select
          exists (select 1 from fantasy_teams f where f.owner_id = k.id and f.competition_id = c.id) as svoja,
          exists (select 1 from competition_teams ct
                   where ct.competition_id = c.id and ct.team_id = k.navijam_team_id) as navija) x
       where c.active
         and (x.svoja or x.navija
              or d.code = case k.jezik
                            when 'sl' then 'SI' when 'sk' then 'SK' when 'hr' then 'HR'
                            when 'cs' then 'CZ' when 'hu' then 'HU' when 'de' then 'AT'
                            when 'sr' then 'RS' when 'ro' then 'RO' when 'et' then 'EE'
                            when 'pl' then 'PL' when 'es' then 'ES' when 'lv' then 'LV'
                            when 'mk' then 'MK' end)
       order by x.svoja desc, x.navija desc, c.slug = 'clani' desc, je_mladinski_slug(c.slug), c.sort_order, c.id
       limit 1
    ) li on true
    left join naslednji_krog nk on nk.competition_id = li.id
   order by k.created_at desc
$$;

revoke all on function public.kandidati_za_opomnik_brez_ekipe(int) from public, anon, authenticated;
grant execute on function public.kandidati_za_opomnik_brez_ekipe(int) to service_role;
