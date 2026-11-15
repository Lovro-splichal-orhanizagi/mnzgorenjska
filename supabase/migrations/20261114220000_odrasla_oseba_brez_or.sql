-- SLF-383: indeks (tekmovanje, ime) iz 20261114210000 sam ni pomagal. Pogoj
-- `p2.full_name = v.full_name or p2.reg_st = v.reg_st` v enem `exists`
-- planer izvede kot pregled vseh mladincev države, ne kot dva skoka po
-- indeksu. Merjeno na produkciji (bralni dostop, vseh 913 prevzemov): z `or`
-- čez 5 s (prekinjeno), razdeljeno v dva `exists` ~1 s.
-- Pravilo je enako: ista oseba po imenu ALI po šifri v mladinski ligi države.
create or replace function public.izlozba_odrasla_oseba(p_player_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  with z as (
    select z.id, z.player_id as glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id)
  ), v as (
    select p.id, p.full_name, p.reg_st, p.anonimiziran_at, c.country_id, c.slug
      from players p join competitions c on c.id = p.competition_id
     where p.id in (select glavni from z
                    union all
                    select pi.player_id from povezani_igralci pi join z on pi.zahtevek_id = z.id)
  )
  select exists (select 1 from z)
     -- lastne vrstice: nikoli mladinska liga, nikoli anonimizirana
     and not exists (select 1 from v where v.anonimiziran_at is not null or je_mladinski_slug(v.slug))
     and not exists (
       select 1 from v join anonimizirani_igralci a
         on a.kljuc = any (array[anonimizacijski_kljuc(v.country_id || '|' || nullif(v.full_name, '')),
                                 anonimizacijski_kljuc(v.country_id || '|reg|' || v.reg_st)]))
     -- ista oseba brez povezave (ime ali šifra v državi) v mladinski ligi
     and (exists (select 1 from z join scout.privolitve s on s.player_id = z.glavni
                   where s.letnik <= extract(year from current_date)::int - 19)
          or (not exists (
                select 1 from v
                  join competitions c2 on c2.country_id = v.country_id and je_mladinski_slug(c2.slug)
                  join players p2 on p2.competition_id = c2.id
                 where p2.full_name = v.full_name)
              and not exists (
                select 1 from v
                  join competitions c2 on c2.country_id = v.country_id and je_mladinski_slug(c2.slug)
                  join players p2 on p2.competition_id = c2.id
                 where p2.reg_st = v.reg_st)))
$$;
revoke all on function public.izlozba_odrasla_oseba(bigint) from public, anon, authenticated;
grant execute on function public.izlozba_odrasla_oseba(bigint) to service_role;
