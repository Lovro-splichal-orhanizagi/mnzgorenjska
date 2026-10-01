-- Sponzorska pasica: slika ob logotipu.
--
-- Doslej je imel sponzor le logotip in eno vrstico. Pasica s fotografijo je
-- tisto, kar sponzor pricakuje in kar se na lestvici opazi; brez slike ostane
-- mesto kot doslej (kartica z logotipom).
--
-- Prva sponzorja sta nasa: Foto Delavnica (Slovenija) in Foto Spomienky
-- (Slovaska), ista fotodelavnica v jeziku vsake drzave. Doseg je drzava.
-- Vidna sta sele, ko admin vklopi `sponzorji_vidni` — ta migracija stikala
-- ne premakne.

alter table public.sponsors add column if not exists slika_url text;
comment on column public.sponsors.slika_url is
  'Slika pasice (pot na nasi strani /sponzorji/x.jpg ali https). Neobvezna.';

-- Nov stolpec v rezultatu: `create or replace` vrste vrstice ne sme spremeniti.
drop function if exists public.sponzorji_za(bigint);
create function public.sponzorji_za(p_competition_id bigint)
returns table (
  id        bigint,
  name      text,
  logo_url  text,
  url       text,
  claim     text,
  doseg     text,
  slika_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.logo_url, s.url, s.claim,
         case
           when s.competition_id is not null then 'liga'
           when s.federation_id is not null then 'zveza'
           when s.country_id is not null then 'drzava'
           else 'vsi'
         end,
         s.slika_url
    from sponsors s
    join competitions c on c.id = p_competition_id
   where s.active
     and coalesce(nastavitev_int('sponzorji_vidni', 0), 0) = 1
     and (s.starts_on is null or s.starts_on <= current_date)
     and (s.ends_on is null or s.ends_on >= current_date)
     and (
       s.competition_id = c.id
       or (s.competition_id is null and s.federation_id = c.federation_id)
       or (s.competition_id is null and s.federation_id is null
           and s.country_id = c.country_id)
       or (s.competition_id is null and s.federation_id is null
           and s.country_id is null)
     )
   order by
     (s.competition_id is null),
     (s.federation_id is null),
     (s.country_id is null),
     s.utez desc, s.id;
$$;

comment on function public.sponzorji_za(bigint) is
  'Sponzorji za dano ligo, od najbolj določenega dosega navzdol. Prazno, '
  'dokler nastavitev sponzorji_vidni ni 1.';

revoke all on function public.sponzorji_za(bigint) from public;
grant execute on function public.sponzorji_za(bigint) to anon, authenticated;

-- Prva sponzorja. Ponoven zagon ju ne podvoji.
insert into public.sponsors (name, url, claim, logo_url, slika_url, country_id, opomba)
select v.name, v.url, v.claim, '/sponzorji/foto-logo.png', v.slika, d.id, 'lastni sponzor'
  from (values
    ('Foto Delavnica',
     'https://fotodelavnica.si/?utm_source=slff&utm_medium=sponzor',
     'Natisni fotografije s tekme že od 0,11 €. Fujifilm papir, dostava v 72 urah.',
     '/sponzorji/fotodelavnica.jpg', 'SI'),
    ('Foto Spomienky',
     'https://fotospomienky.sk/?utm_source=slff&utm_medium=sponzor',
     'Vytlač si fotky zo zápasu už od 0,11 €. Fujifilm papier, doručenie do 72 hodín.',
     '/sponzorji/fotospomienky.jpg', 'SK')
  ) as v(name, url, claim, slika, drzava)
  join public.countries d on d.code = v.drzava
 where not exists (select 1 from public.sponsors s where s.name = v.name);
