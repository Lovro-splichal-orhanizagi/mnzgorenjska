-- najdi_igralca je v produkciji padel na 3-sekundni omejitvi: za vsako
-- iskanje je odstranil šumnike iz imen vseh 35 000 igralcev.
--
-- Trigramsko kazalo na imenu brez šumnikov; poizvedba najprej išče po
-- najdaljši besedi (to zna kazalo), ostale besede preveri na peščici zadetkov.
create extension if not exists pg_trgm with schema extensions;

create index if not exists players_ime_brez_sumnikov_trgm
  on public.players using gin (public.podpora_brez_sumnikov(full_name) extensions.gin_trgm_ops);

create or replace function public.podpora_najdaljsa_beseda(iskanje text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select b from unnest(regexp_split_to_array(trim(podpora_brez_sumnikov(iskanje)), '\s+')) b
   order by length(b) desc limit 1
$$;

create or replace function public.najdi_igralca(ime text, liga text default null)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  with kandidati as (
    select p.id, p.full_name, p.position, p.position_source, p.value, p.active,
           p.izstopil_at, t.name as klub, c.slug, c.name as liga_ime, c.active as liga_aktivna
      from players p
      join teams t on t.id = p.team_id
      join competitions c on c.id = p.competition_id
     where length(trim(coalesce(ime, ''))) >= 3
       and podpora_brez_sumnikov(p.full_name) like '%' || podpora_najdaljsa_beseda(ime) || '%'
       and podpora_ujema(p.full_name, ime)
       and (liga is null or trim(liga) = '' or p.competition_id in (select podpora_lige(liga)))
     order by c.active desc, p.active desc, p.value desc
     limit 8
  )
  select jsonb_build_object(
    'najdenih', (select count(*) from kandidati),
    'igralci', coalesce(jsonb_agg(jsonb_build_object(
      'ime', k.full_name,
      'klub', k.klub,
      'liga', k.liga_ime,
      'pozicija', k.position,
      'pozicija_iz', k.position_source,
      'cena_mio', k.value,
      'na_trgu', k.active and k.izstopil_at is null and k.liga_aktivna,
      'zakaj_ni_na_trgu', case
        when not k.liga_aktivna then 'liga ni vklopljena v SLFF'
        when k.izstopil_at is not null then 'klub je med sezono izstopil iz lige; kdor ga ima, ga obdrži'
        when not k.active then 'ni v letošnjih zapisnikih tega kluba v tej ligi (lanska sezona, druga selekcija ali prestop); doda se, ko prvič zaigra'
      end,
      'sezona', s.season,
      'tock', s.points,
      'tekem', s.matches,
      'minut', s.minutes,
      'golov', s.goals,
      'povezava', 'https://slff.eu/player/' || k.id || '?t=' || k.slug
    ) order by k.liga_aktivna desc, k.active desc, k.value desc), '[]'::jsonb),
    'opomba', case when (select count(*) from kandidati) = 0 then
      'Igralca s tem imenom ni. Igralec se doda samodejno, ko prvič zaigra (z minutami) na tekmi, ki je v uradnem zapisniku.' end
  )
  from kandidati k
  left join lateral (
    select si.season, si.points, si.matches, si.minutes, si.goals
      from statistika_igralcev si
     where si.player_id = k.id
     order by si.season desc
     limit 1
  ) s on true
$$;
