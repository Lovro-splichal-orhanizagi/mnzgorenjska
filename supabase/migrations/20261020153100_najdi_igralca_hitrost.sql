-- najdi_igralca je spet prepočasen za klepet: 8–9 s na klic, HelpStack pa
-- orodju da ~5 s. 20. 10. 2026 je klepet zato odgovoril "napaka pri iskanju"
-- (Besnik Murseli) in nato ugibal.
--
-- Vzrok: podpora_kandidati je imela vse tri načine iskanja v enem SQL stavku
-- (`case nacin when 'podobno' then … else … end`). Planer za tak pogoj ne
-- uporabi trigramskega kazala players_ime_brez_sumnikov_trgm in odstrani
-- šumnike iz imen vseh ~390 000 igralcev. Vsak način posebej kazalo uporabi
-- (8–50 ms), zato je funkcija zdaj plpgsql z ločenim stavkom za vsak način.
-- Podpis, filtri in vrstni red so nespremenjeni.
create or replace function public.podpora_kandidati(ime text, liga text, nacin text)
returns table (id bigint, full_name text, pozicija text, pozicija_iz text, value numeric,
               active boolean, izstopil_at timestamptz, klub text, slug text, liga_ime text,
               liga_aktivna boolean)
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  s text := podpora_brez_sumnikov(ime);
  beseda text := podpora_najdaljsa_beseda(ime);
  z_ligo boolean := nacin = 'liga' and liga is not null and trim(liga) <> '';
begin
  if length(trim(coalesce(ime, ''))) < 3 then return; end if;

  if nacin = 'podobno' then
    return query
      select p.id, p.full_name, p.position::text, p.position_source::text, p.value::numeric, p.active,
             p.izstopil_at, t.name, c.slug, c.name, c.active
        from players p
        join teams t on t.id = p.team_id
        join competitions c on c.id = p.competition_id
       -- `%` (privzeti prag 0.3) uporabi trigramsko kazalo, podobnost
       -- nato zaostri na 0.4. Vrstni red besed ni pomemben.
       where podpora_brez_sumnikov(p.full_name) % s
         and extensions.similarity(podpora_brez_sumnikov(p.full_name), s) >= 0.4
       order by c.active desc, p.active desc,
                extensions.similarity(podpora_brez_sumnikov(p.full_name), s) desc, p.value desc
       limit 8;
  elsif z_ligo then
    return query
      select p.id, p.full_name, p.position::text, p.position_source::text, p.value::numeric, p.active,
             p.izstopil_at, t.name, c.slug, c.name, c.active
        from players p
        join teams t on t.id = p.team_id
        join competitions c on c.id = p.competition_id
       where podpora_brez_sumnikov(p.full_name) like '%' || beseda || '%'
         and podpora_ujema(p.full_name, ime)
         and p.competition_id in (select podpora_lige(liga))
       order by c.active desc, p.active desc,
                extensions.similarity(podpora_brez_sumnikov(p.full_name), s) desc, p.value desc
       limit 8;
  else
    return query
      select p.id, p.full_name, p.position::text, p.position_source::text, p.value::numeric, p.active,
             p.izstopil_at, t.name, c.slug, c.name, c.active
        from players p
        join teams t on t.id = p.team_id
        join competitions c on c.id = p.competition_id
       where podpora_brez_sumnikov(p.full_name) like '%' || beseda || '%'
         and podpora_ujema(p.full_name, ime)
       order by c.active desc, p.active desc,
                extensions.similarity(podpora_brez_sumnikov(p.full_name), s) desc, p.value desc
       limit 8;
  end if;
end;
$$;
