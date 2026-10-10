-- najdi_igralca: iskanje ne sme reči "igralca ni", ko je igralec v bazi.
--
-- 10. 10. 2026 je klepet trikrat odgovoril, da Šimona Suchoňa (Máj
-- Ružomberok-Černová, IV. liga U19 Sever) ni, čeprav je bil v bazi s šestimi
-- tekmami. Dva vzroka:
--   - agent je v `liga` poslal ligo strani, na kateri je bil uporabnik (ali
--     ime kluba), in filter je izločil pravega igralca;
--   - "Šimom" (tipkarska napaka) se ni ujel, ker mora vsaka beseda stati v
--     imenu natanko.
-- Zato tri stopnje: (1) kot doslej, (2) brez filtra lige, (3) podobnost imena
-- (pg_trgm). Odgovor pove, po kateri stopnji je zadetek (`iskanje`), da agent
-- zna reči "našel sem ga v drugi ligi" ali "ste mislili …".
create or replace function public.podpora_kandidati(ime text, liga text, nacin text)
returns table (id bigint, full_name text, pozicija text, pozicija_iz text, value numeric,
               active boolean, izstopil_at timestamptz, klub text, slug text, liga_ime text,
               liga_aktivna boolean)
language sql
stable
set search_path = public, extensions
as $$
  select p.id, p.full_name, p.position::text, p.position_source::text, p.value::numeric, p.active,
         p.izstopil_at, t.name, c.slug, c.name, c.active
    from players p
    join teams t on t.id = p.team_id
    join competitions c on c.id = p.competition_id
   where length(trim(coalesce(ime, ''))) >= 3
     and case nacin
           -- `%` (privzeti prag 0.3) uporabi trigramsko kazalo, podobnost
           -- nato zaostri na 0.4. Vrstni red besed ni pomemben.
           when 'podobno' then podpora_brez_sumnikov(p.full_name) % podpora_brez_sumnikov(ime)
             and extensions.similarity(podpora_brez_sumnikov(p.full_name), podpora_brez_sumnikov(ime)) >= 0.4
           else
             podpora_brez_sumnikov(p.full_name) like '%' || podpora_najdaljsa_beseda(ime) || '%'
             and podpora_ujema(p.full_name, ime)
         end
     and (nacin <> 'liga' or liga is null or trim(liga) = ''
          or p.competition_id in (select podpora_lige(liga)))
   order by c.active desc, p.active desc,
            extensions.similarity(podpora_brez_sumnikov(p.full_name), podpora_brez_sumnikov(ime)) desc,
            p.value desc
   limit 8
$$;

create or replace function public.najdi_igralca(ime text, liga text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  nacin text;
  rez jsonb;
begin
  foreach nacin in array array['liga', 'vse', 'podobno'] loop
    -- Brez filtra lige je stopnja 'vse' ista kot 'liga'.
    continue when nacin = 'vse' and (liga is null or trim(liga) = '');
    with kandidati as (select * from podpora_kandidati(ime, liga, nacin))
    select case when count(*) = 0 then null else jsonb_build_object(
      'najdenih', count(*),
      'iskanje', case nacin
        when 'liga' then 'natančno'
        when 'vse' then 'v navedeni ligi ga ni, najden v drugi ligi'
        else 'ime ni zapisano natančno, to so podobna imena (preveri z uporabnikom)'
      end,
      'igralci', jsonb_agg(jsonb_build_object(
        'ime', k.full_name,
        'klub', k.klub,
        'liga', k.liga_ime,
        'pozicija', k.pozicija,
        'pozicija_iz', k.pozicija_iz,
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
      ) order by k.liga_aktivna desc, k.active desc, k.value desc)) end
      into rez
      from kandidati k
      left join lateral (
        select si.season, si.points, si.matches, si.minutes, si.goals
          from statistika_igralcev si
         where si.player_id = k.id
         order by si.season desc
         limit 1
      ) s on true;
    if rez is not null then return rez; end if;
  end loop;
  return jsonb_build_object(
    'najdenih', 0,
    'igralci', '[]'::jsonb,
    'opomba', 'Igralca s tem ali podobnim imenom ni v nobeni ligi SLFF. Igralec se doda samodejno, '
           || 'ko prvič zaigra (z minutami) na tekmi, ki je v uradnem zapisniku. Če uporabnik trdi, '
           || 'da je igral, vprašaj za klub in tekmo ter predaj sodelavcu.');
end;
$$;

grant execute on function public.najdi_igralca(text, text) to anon, authenticated;
