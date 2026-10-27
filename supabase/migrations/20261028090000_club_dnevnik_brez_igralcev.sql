-- SLFF Club (prej Scout), pravni pregled 27. 10. 2026:
-- 1. Klici lastnega kluba (dogodek, kader) ne pišejo več id-jev igralcev v
--    scout.dnevnik. Namen "kateri klubi so me videli" za lastni klub nima
--    smisla, dnevnik pa bi brez potrebe hranil mladoletne (SLFF bi bil zanje
--    upravljavec). Iskanje, profil, podobni in seznam jih še zapišejo.
-- 3. Koledar: neodigrana tekma je v bazi 0:0 brez uvoza; izid se pokaže šele
--    z uvozom ali kontumacijo (prej je vsaka prihodnja tekma kazala 0:0).
-- 2. Pogodba o obdelavi, točka 8: dogodki (s prisotnostjo) kluba, katerega
--    naročnina je potekla pred več kot 90 dnevi, se izbrišejo.

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

create or replace function public.scout_ekipa(p_competition_id bigint default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  v_igralci jsonb;
  v_selekcije jsonb;
  v_sezona text;
begin
  select * into d from scout.dostop('ekipa', null, jsonb_build_object('selekcija', p_competition_id));
  v_selekcije := scout.selekcije_json(d.team_id);
  if p_competition_id is null then
    p_competition_id := (v_selekcije->0->>'competition_id')::bigint;
    if p_competition_id is null then
      return jsonb_build_object('selekcije', v_selekcije, 'competition_id', null, 'igralci', '[]'::jsonb);
    end if;
  end if;
  perform scout.preveri_selekcijo(d.team_id, p_competition_id);
  v_sezona := scout.sezona_selekcije(d.team_id, p_competition_id, scout.dan(now()));
  select coalesce(jsonb_agg(jsonb_build_object(
           'player_id', k.player_id, 'ime', k.ime, 'pozicija', k.pozicija,
           'nastopi', coalesce(s.nastopi, 0), 'zacetki', coalesce(s.zacetki, 0),
           'minute', coalesce(s.minute, 0), 'goli', coalesce(s.goli, 0),
           'rumeni', coalesce(s.rumeni, 0), 'rdeci', coalesce(s.rdeci, 0),
           'prisoten', coalesce(pr.prisoten, 0), 'oznacen', coalesce(pr.oznacen, 0))
           order by coalesce(s.minute, 0) desc, k.ime), '[]'::jsonb)
    into v_igralci
    from scout.kader_selekcije(d.team_id, p_competition_id) k
    left join lateral (
      select (count(*) filter (where a.minutes_played > 0))::int as nastopi, sum(a.started::int)::int as zacetki,
             sum(a.minutes_played)::int as minute, sum(a.goals)::int as goli,
             sum(a.yellow_cards)::int as rumeni, sum(a.red_cards)::int as rdeci
        from appearances a join matches m on m.id = a.match_id join rounds r on r.id = m.round_id
       where a.player_id = k.player_id and a.team_id = d.team_id
         and r.competition_id = p_competition_id and r.season = v_sezona) s on true
    left join lateral (
      select (count(*) filter (where x.stanje = 'prisoten'))::int as prisoten, count(*)::int as oznacen
        from scout.prisotnost x join scout.dogodki e on e.id = x.dogodek_id
       where x.player_id = k.player_id and e.team_id = d.team_id and e.competition_id = p_competition_id
         and e.zacetek between now() - interval '30 days' and now()) pr on true;
  return jsonb_build_object(
    'selekcije', v_selekcije,
    'competition_id', p_competition_id,
    'sezona', v_sezona,
    'igralci', v_igralci);
end;
$$;

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

create or replace function public.scout_koledar(p_od date, p_do date)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  if p_od is null or p_do is null or p_do < p_od or p_do - p_od > 62 then
    raise exception 'Scout: neveljavno obdobje koledarja.' using hint = 'scout-obdobje';
  end if;
  select * into d from scout.dostop('koledar', null, jsonb_build_object('od', p_od, 'do', p_do));
  return jsonb_build_object(
    'selekcije', scout.selekcije_json(d.team_id),
    'tekme', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', m.id, 'datum', m.played_on, 'competition_id', r.competition_id,
                'doma', m.home_team_id = d.team_id,
                'nasprotnik', t.name,
                -- Neodigrana tekma ima v bazi 0:0 brez uvoza; izid velja šele z uvozom ali kontumacijo.
                'za', case when m.imported_at is null and not m.kontumacija then null
                           when m.home_team_id = d.team_id then m.home_goals else m.away_goals end,
                'proti', case when m.imported_at is null and not m.kontumacija then null
                              when m.home_team_id = d.team_id then m.away_goals else m.home_goals end)
                order by m.played_on, m.id), '[]'::jsonb)
                from matches m join rounds r on r.id = m.round_id
                join teams t on t.id = case when m.home_team_id = d.team_id then m.away_team_id else m.home_team_id end
               where d.team_id in (m.home_team_id, m.away_team_id)
                 and m.played_on between p_od and p_do),
    'dogodki', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', e.id, 'competition_id', e.competition_id, 'vrsta', e.vrsta, 'zacetek', e.zacetek,
                  'trajanje_min', e.trajanje_min, 'kraj', e.kraj, 'serija', e.serija,
                  'oznaceni', (select count(*) from scout.prisotnost x join players p on p.id = x.player_id
                                where x.dogodek_id = e.id and p.anonimiziran_at is null
                                  and not exists (select 1 from scout.kljuci_vrstic(array[p.id]) k
                                                   join anonimizirani_igralci a on a.kljuc = k.kljuc)))
                  order by e.zacetek, e.id), '[]'::jsonb)
                  from scout.dogodki e
                 where e.team_id = d.team_id
                   and e.zacetek >= (p_od::timestamp at time zone 'Europe/Ljubljana')
                   and e.zacetek < ((p_do + 1)::timestamp at time zone 'Europe/Ljubljana')));
end;
$$;
