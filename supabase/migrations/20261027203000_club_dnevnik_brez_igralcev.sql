-- SLFF Club (prej Scout), pravni pregled 27. 10. 2026:
-- 1. Klici lastnega kluba (dogodek, kader) ne pišejo več id-jev igralcev v
--    scout.dnevnik. Namen "kateri klubi so me videli" za lastni klub nima
--    smisla, dnevnik pa bi brez potrebe hranil mladoletne (SLFF bi bil zanje
--    upravljavec). Iskanje, profil, podobni in seznam jih še zapišejo.
-- 3. Koledar: neodigrana tekma je v bazi 0:0 brez uvoza; izid se pokaže šele
--    z uvozom ali kontumacijo (prej je vsaka prihodnja tekma kazala 0:0).
-- 2. Pogodba o obdelavi, točka 8: dogodki (s prisotnostjo) kluba, katerega
--    naročnina je potekla pred več kot 90 dnevi, se izbrišejo.
-- 4. Administrator SLFF (sedež + is_admin()) odpre koledar in kader kateregakoli
--    kluba države naročnine (?team=, kot stran Klub). Tuj klub vidi le javno:
--    uradne tekme in dejstva članskih selekcij; brez dogodkov in prisotnosti
--    (podatki tega kluba, mi smo zanje obdelovalec), brez mladinskih selekcij
--    in brez igralcev z ugovorom proti Scoutu; vrnjeni igralci gredo v dnevnik.

create or replace function public.scout_dogodek(p_id bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  e scout.dogodki;
  v_kader jsonb;
begin
  select * into d from scout.dostop('dogodek', null, jsonb_build_object('dogodek', p_id));
  e := scout.dogodek_kluba(d.team_id, p_id);
  select coalesce(jsonb_agg(jsonb_build_object(
           'player_id', k.player_id, 'ime', k.ime, 'pozicija', k.pozicija, 'stanje', x.stanje)
           order by k.ime, k.player_id), '[]'::jsonb)
    into v_kader
    from scout.kader_selekcije(d.team_id, e.competition_id, scout.dan(e.zacetek), e.id) k
    left join scout.prisotnost x on x.dogodek_id = e.id and x.player_id = k.player_id;
  return jsonb_build_object(
    'id', e.id, 'competition_id', e.competition_id,
    'selekcija', (select c.name from competitions c where c.id = e.competition_id),
    'vrsta', e.vrsta, 'zacetek', e.zacetek, 'trajanje_min', e.trajanje_min,
    'kraj', e.kraj, 'opomba', e.opomba, 'serija', e.serija,
    'selekcije', scout.selekcije_json(d.team_id),
    'kader', v_kader);
end;
$$;

-- Ciljni klub klica: svoj ali (le administrator) klub države naročnine; drugače
-- napaka, nikoli tiho nazaj na svoj klub.
create function scout.ciljni_klub(p_svoj bigint, p_country bigint, p_team bigint)
returns bigint language plpgsql stable set search_path = public
as $$
begin
  if p_team is null or p_team = p_svoj then return p_svoj; end if;
  if not (is_admin() and exists (select 1 from teams t where t.id = p_team and t.country_id = p_country)) then
    raise insufficient_privilege using message = 'Scout: le svoj klub.';
  end if;
  return p_team;
end;
$$;
revoke all on function scout.ciljni_klub(bigint, bigint, bigint) from public, anon, authenticated;

-- Selekcije za pogled: tuj klub le članske.
create function scout.selekcije_pogleda(p_team bigint, p_svoj boolean)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(e order by i), '[]'::jsonb)
    from jsonb_array_elements(scout.selekcije_json(p_team)) with ordinality x(e, i)
   where p_svoj or not (e->>'mladinska')::boolean
$$;
revoke all on function scout.selekcije_pogleda(bigint, boolean) from public, anon, authenticated;

drop function public.scout_ekipa(bigint);
create function public.scout_ekipa(p_competition_id bigint default null, p_team_id bigint default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  v_team bigint;
  v_svoj boolean;
  v_igralci jsonb;
  v_selekcije jsonb;
  v_sezona text;
begin
  select * into d from scout.dostop('ekipa', null, jsonb_build_object('selekcija', p_competition_id, 'team', p_team_id));
  v_team := scout.ciljni_klub(d.team_id, d.country_id, p_team_id);
  v_svoj := v_team = d.team_id;
  v_selekcije := scout.selekcije_pogleda(v_team, v_svoj);
  if p_competition_id is null then
    p_competition_id := (v_selekcije->0->>'competition_id')::bigint;
  end if;
  if p_competition_id is null then
    return jsonb_build_object('team_id', v_team, 'ime', (select t.name from teams t where t.id = v_team),
      'svoj', v_svoj, 'admin', is_admin(), 'country_id', d.country_id,
      'selekcije', v_selekcije, 'competition_id', null, 'igralci', '[]'::jsonb);
  end if;
  if not exists (select 1 from jsonb_array_elements(v_selekcije) e where (e->>'competition_id')::bigint = p_competition_id) then
    raise insufficient_privilege using message = 'Scout: selekcija ni klubova.';
  end if;
  v_sezona := scout.sezona_selekcije(v_team, p_competition_id, scout.dan(now()));
  select coalesce(jsonb_agg(jsonb_build_object(
           'player_id', k.player_id, 'ime', k.ime, 'pozicija', k.pozicija,
           'nastopi', coalesce(s.nastopi, 0), 'zacetki', coalesce(s.zacetki, 0),
           'minute', coalesce(s.minute, 0), 'goli', coalesce(s.goli, 0),
           'rumeni', coalesce(s.rumeni, 0), 'rdeci', coalesce(s.rdeci, 0),
           'prisoten', coalesce(pr.prisoten, 0), 'oznacen', coalesce(pr.oznacen, 0))
           order by coalesce(s.minute, 0) desc, k.ime), '[]'::jsonb)
    into v_igralci
    from scout.kader_selekcije(v_team, p_competition_id) k
    left join lateral (
      select (count(*) filter (where a.minutes_played > 0))::int as nastopi, sum(a.started::int)::int as zacetki,
             sum(a.minutes_played)::int as minute, sum(a.goals)::int as goli,
             sum(a.yellow_cards)::int as rumeni, sum(a.red_cards)::int as rdeci
        from appearances a join matches m on m.id = a.match_id join rounds r on r.id = m.round_id
       where a.player_id = k.player_id and a.team_id = v_team
         and r.competition_id = p_competition_id and r.season = v_sezona) s on true
    left join lateral (
      select (count(*) filter (where x.stanje = 'prisoten'))::int as prisoten, count(*)::int as oznacen
        from scout.prisotnost x join scout.dogodki e on e.id = x.dogodek_id
       where v_svoj and x.player_id = k.player_id and e.team_id = v_team and e.competition_id = p_competition_id
         and e.zacetek between now() - interval '30 days' and now()) pr on true
   where v_svoj or not scout.je_skrit(array[k.player_id]);
  -- Tuj klub (administrator): vrnjeni igralci v dnevnik, kot stran Klub.
  if not v_svoj then
    update scout.dnevnik x set parametri = x.parametri || jsonb_build_object('igralci',
        (select coalesce(jsonb_agg((i->>'player_id')::bigint order by (i->>'player_id')::bigint), '[]'::jsonb)
           from jsonb_array_elements(v_igralci) i))
     where x.id = d.dnevnik_id;
  end if;
  return jsonb_build_object(
    'team_id', v_team, 'ime', (select t.name from teams t where t.id = v_team),
    'svoj', v_svoj, 'admin', is_admin(), 'country_id', d.country_id,
    'selekcije', v_selekcije,
    'competition_id', p_competition_id,
    'sezona', v_sezona,
    'igralci', v_igralci);
end;
$$;
revoke all on function public.scout_ekipa(bigint, bigint) from public, anon;
grant execute on function public.scout_ekipa(bigint, bigint) to authenticated;

create or replace function scout.pocisti()
returns void language sql
as $$
  delete from scout.dnevnik where created_at < now() - interval '12 months';
  delete from scout.opazovani o
   where not exists (select 1 from public.players p where p.id = o.player_id and p.anonimiziran_at is null)
      or scout.je_skrit(array[o.player_id]);
  delete from scout.dogodki where zacetek < now() - interval '24 months';
  delete from scout.dogodki e
   where not exists (select 1 from scout.narocnine n
                      where n.team_id = e.team_id and n.velja_do > now() - interval '90 days');
  delete from scout.prisotnost x
   where not exists (select 1 from public.players p where p.id = x.player_id and p.anonimiziran_at is null)
      or exists (select 1 from scout.kljuci_vrstic(array[x.player_id]) k
                  join public.anonimizirani_igralci a on a.kljuc = k.kljuc);
$$;

revoke all on function scout.pocisti() from public, anon, authenticated;

drop function public.scout_koledar(date, date);
create function public.scout_koledar(p_od date, p_do date, p_team_id bigint default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  v_team bigint;
  v_svoj boolean;
begin
  if p_od is null or p_do is null or p_do < p_od or p_do - p_od > 62 then
    raise exception 'Scout: neveljavno obdobje koledarja.' using hint = 'scout-obdobje';
  end if;
  select * into d from scout.dostop('koledar', null, jsonb_build_object('od', p_od, 'do', p_do, 'team', p_team_id));
  v_team := scout.ciljni_klub(d.team_id, d.country_id, p_team_id);
  v_svoj := v_team = d.team_id;
  return jsonb_build_object(
    'team_id', v_team, 'ime', (select t.name from teams t where t.id = v_team),
    'svoj', v_svoj, 'admin', is_admin(), 'country_id', d.country_id,
    'selekcije', scout.selekcije_pogleda(v_team, v_svoj),
    'tekme', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', m.id, 'datum', m.played_on, 'competition_id', r.competition_id,
                'doma', m.home_team_id = v_team,
                'nasprotnik', t.name,
                -- Neodigrana tekma ima v bazi 0:0 brez uvoza; izid velja šele z uvozom ali kontumacijo.
                'za', case when m.imported_at is null and not m.kontumacija then null
                           when m.home_team_id = v_team then m.home_goals else m.away_goals end,
                'proti', case when m.imported_at is null and not m.kontumacija then null
                              when m.home_team_id = v_team then m.away_goals else m.home_goals end)
                order by m.played_on, m.id), '[]'::jsonb)
                from matches m join rounds r on r.id = m.round_id
                join competitions c on c.id = r.competition_id
                join teams t on t.id = case when m.home_team_id = v_team then m.away_team_id else m.home_team_id end
               where v_team in (m.home_team_id, m.away_team_id)
                 and (v_svoj or not je_mladinski_slug(c.slug))
                 and m.played_on between p_od and p_do),
    -- Dogodki in prisotnost so podatki kluba: le svojemu klubu.
    'dogodki', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', e.id, 'competition_id', e.competition_id, 'vrsta', e.vrsta, 'zacetek', e.zacetek,
                  'trajanje_min', e.trajanje_min, 'kraj', e.kraj, 'serija', e.serija,
                  'oznaceni', (select count(*) from scout.prisotnost x join players p on p.id = x.player_id
                                where x.dogodek_id = e.id and p.anonimiziran_at is null
                                  and not exists (select 1 from scout.kljuci_vrstic(array[p.id]) k
                                                   join anonimizirani_igralci a on a.kljuc = k.kljuc)))
                  order by e.zacetek, e.id), '[]'::jsonb)
                  from scout.dogodki e
                 where v_svoj and e.team_id = v_team
                   and e.zacetek >= (p_od::timestamp at time zone 'Europe/Ljubljana')
                   and e.zacetek < ((p_do + 1)::timestamp at time zone 'Europe/Ljubljana')));
end;
$$;
revoke all on function public.scout_koledar(date, date, bigint) from public, anon;
grant execute on function public.scout_koledar(date, date, bigint) to authenticated;
