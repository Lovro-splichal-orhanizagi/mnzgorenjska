-- Opomnik po prekinjenem plačilu ponovne cene (posli-opomnik, vrsta
-- `ponovna-cena-opomnik`, le pošta).
--
-- Potekla seja Checkouta zahtevka ne spremeni: stripe-webhook
-- `checkout.session.expired` obdela le trgovino, zato zahtevek ostane
-- `caka_placilo`. Nov poskus istega kupca star zahtevek izbriše
-- (`ponovna_cena_pripravi`), zato je kupčev zadnji neplačan zahtevek za
-- igralca vedno tisti z `caka_placilo`.
--
-- Kandidat: zahtevek `caka_placilo`, star 1 h – 3 dni (seja poteče po 31 min),
-- kupec za istega igralca v isti ligi od takrat nima plačanega zahtevka,
-- izračun je zdaj mogoč (`ponovna_cena_ovira` je NULL; okno roka počaka),
-- stikalo velja zanj, ni odjavljen od opomnikov, ni omejen in ne igra le
-- mladinskih lig. Enkrat na zahtevek (uspešen mail po nastanku zahtevka),
-- največ en tak mail na 7 dni (pokrije tudi zahtevek, star do 3 dni) in
-- največ trije poskusi na zahtevek.

create or replace function public.kandidati_za_opomnik_ponovne_cene(p_najvec int default 10)
returns table (
  user_id uuid,
  email text,
  display_name text,
  zahtevek_id bigint,
  player_id bigint,
  igralec text,
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
  select k.* from (
    select distinct on (u.id)
           u.id as user_id, u.email::text as email, p.display_name, z.id as zahtevek_id,
           z.player_id, coalesce(pl.full_name, pl.first_name || ' ' || pl.last_name) as igralec, z.competition_id, c.slug as liga_slug,
           c.short_name as liga_oznaka, d.code as liga_drzava
      from ponovne_cene z
      join auth.users u on u.id = z.user_id
      join profiles p on p.id = u.id
      join players pl on pl.id = z.player_id
      join competitions c on c.id = z.competition_id
      left join countries d on d.id = c.country_id
     where z.stanje = 'caka_placilo'
       and z.created_at between now() - interval '3 days' and now() - interval '1 hour'
       and u.email is not null
       and u.email_confirmed_at is not null
       and u.deleted_at is null
       and not coalesce(p.brez_opomnikov, false)
       and not je_omejen(u.id)
       and case coalesce(nastavitev_int('ponovna_cena', 0), 0)
             when 2 then true
             when 1 then coalesce(p.is_admin, false) or exists (select 1 from testerji t where t.user_id = u.id)
             else false
           end
       -- Le mladinske ekipe: ne pišemo.
       and (not exists (select 1 from fantasy_teams f join competitions fc on fc.id = f.competition_id
                         where f.owner_id = u.id and not f.hisna and je_mladinski_slug(fc.slug))
            or exists (select 1 from fantasy_teams f join competitions fc on fc.id = f.competition_id
                        where f.owner_id = u.id and not f.hisna and not je_mladinski_slug(fc.slug)))
       and not exists (select 1 from ponovne_cene y
                        where y.user_id = z.user_id and y.player_id = z.player_id
                          and y.competition_id = z.competition_id
                          and y.stanje <> 'caka_placilo' and y.created_at > z.created_at)
       and ponovna_cena_ovira(z.player_id, z.id) is null
       and not exists (select 1 from email_log l
                        where l.user_id = u.id and l.vrsta = 'ponovna-cena-opomnik' and l.napaka is null
                          and l.poslano_at > now() - interval '7 days')
       and (select count(*) from email_log l
             where l.user_id = u.id and l.vrsta = 'ponovna-cena-opomnik' and l.poslano_at > z.created_at) < 3
     order by u.id, z.created_at desc
  ) k
  order by k.zahtevek_id
  limit greatest(p_najvec, 0)
$$;
revoke all on function public.kandidati_za_opomnik_ponovne_cene(int) from public, anon, authenticated;
grant execute on function public.kandidati_za_opomnik_ponovne_cene(int) to service_role;
