-- Potrjen igralec dobi mail "profil je potrjen" s povezavo na svoj profil
-- (fotografija, vzdevek, opis, omrežja). Pošlje ga posli-prevzem
-- (`{"obvesti": true}`), ki ga vmesnik pokliče po vsaki potrditvi — admin
-- (Prevzemi) ali klub (/claim). Vsak zahtevek dobi mail enkrat: `obvescen_at`.
--
-- Kdor je profil že uredil, je za potrditev očitno izvedel: ne dobi ga.

alter table public.zahtevki_igralca add column obvescen_at timestamptz;

update public.zahtevki_igralca z
   set obvescen_at = coalesce(z.decided_at, now())
 where z.status = 'potrjen'
   and exists (select 1 from public.profil_igralca p where p.player_id = z.player_id);

-- Potrjeni, še neobveščeni zahtevki (zadnjih 30 dni): podatki za mail.
create or replace function public.prevzem_neobvesceni()
returns table (zahtevek_id bigint, email text, igralec text, player_id bigint, liga_slug text, liga text, klub text, drzava text)
language sql
stable
security definer
set search_path = public
as $$
  select z.id, u.email::text, prevzem_ime_igralca(p.first_name, p.last_name, p.full_name), p.id, c.slug, c.name, t.name, co.code
    from zahtevki_igralca z
    join players p on p.id = z.player_id
    join teams t on t.id = p.team_id
    join competitions c on c.id = p.competition_id
    left join countries co on co.id = c.country_id
    join auth.users u on u.id = z.user_id
   where z.status = 'potrjen' and z.obvescen_at is null
     and z.decided_at > now() - interval '30 days'
     and u.email is not null
   order by z.id;
$$;
revoke all on function public.prevzem_neobvesceni() from public, anon, authenticated;
grant execute on function public.prevzem_neobvesceni() to service_role;

create or replace function public.prevzem_obvescen(p_zahtevek_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update zahtevki_igralca set obvescen_at = now()
   where id = p_zahtevek_id and status = 'potrjen' and obvescen_at is null;
$$;
revoke all on function public.prevzem_obvescen(bigint) from public, anon, authenticated;
grant execute on function public.prevzem_obvescen(bigint) to service_role;
