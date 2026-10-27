-- SLFF Scout, faza Ekipa (spec docs/superpowers/specs/2026-10-27-scout-klubsko-upravljanje-design.md):
-- koledar kluba (uradne tekme vseh selekcij + dogodki kluba), prisotnost na
-- dogodkih in kader selekcije s sezonskimi dejstvi iz zapisnikov.
--
-- Dogodki in prisotnost so podatki kluba o lastnih igralcih (klub je
-- upravljavec). Zaprta shema scout, le prek RPC skozi scout.dostop (sedež,
-- naročnina, dnevnik, dnevna meja). Prisotnost ima le tri stanja, brez
-- razloga: razlog odsotnosti je pogosto zdravstveni podatek.

alter table scout.dnevnik drop constraint dnevnik_vrsta_check;
alter table scout.dnevnik add constraint dnevnik_vrsta_check
  check (vrsta = any (array['isci', 'igralec', 'podobni', 'vrzeli', 'opazuj', 'opazovani', 'klub',
                            'koledar', 'dogodek', 'ekipa']));

create table scout.dogodki (
  id             bigint generated always as identity primary key,
  team_id        bigint not null references public.teams on delete cascade,
  competition_id bigint not null references public.competitions on delete cascade,
  vrsta          text not null check (vrsta in ('trening', 'prijateljska', 'sestanek', 'drugo')),
  zacetek        timestamptz not null,
  trajanje_min   int not null check (trajanje_min between 15 and 600),
  kraj           text check (char_length(kraj) <= 120),
  opomba         text check (char_length(opomba) <= 500),
  serija         uuid,
  ustvaril       uuid references public.profiles on delete set null,
  created_at     timestamptz not null default now()
);
create index on scout.dogodki (team_id, zacetek);
create index on scout.dogodki (serija) where serija is not null;
comment on table scout.dogodki is
  'Dogodki kluba (trening, prijateljska, sestanek) za eno selekcijo. Uradne tekme se berejo živo iz matches.';

create table scout.prisotnost (
  dogodek_id bigint not null references scout.dogodki on delete cascade,
  player_id  bigint not null references public.players on delete cascade,
  stanje     text not null check (stanje in ('prisoten', 'opravicen', 'odsoten')),
  oznacil    uuid references public.profiles on delete set null,
  updated_at timestamptz not null default now(),
  primary key (dogodek_id, player_id)
);
create index on scout.prisotnost (player_id);

revoke all on scout.dogodki, scout.prisotnost from public, anon, authenticated;

-- Sezona selekcije na dan: sezona tega dne, če ima klub v njej tekmo, sicer
-- prejšnja. Ob prehodu sezone (1. 7., koledarske 1. 1.) do uvoza novega
-- razporeda tako ostanejo selekcija, kader in pripravljalni treningi.
create function scout.sezona_selekcije(p_team bigint, p_competition bigint, p_datum date)
returns text
language sql stable set search_path = public
as $$
  select case when exists (select 1 from matches m join rounds r on r.id = m.round_id
                            where r.competition_id = p_competition and r.season = sezona_lige(p_competition, p_datum)
                              and p_team in (m.home_team_id, m.away_team_id))
              then sezona_lige(p_competition, p_datum)
              else sezona_lige(p_competition, p_datum - 365) end
$$;

-- Selekcije kluba: tekmovanja s tekmo kluba v tekoči ali prejšnji sezoni ali z
-- igralcem, ki ga je dodal klub. Mladinske so vključene (upravljanje kluba).
create function scout.selekcije_kluba(p_team bigint)
returns table (competition_id bigint, ime text, mladinska boolean)
language sql stable set search_path = public
as $$
  select c.id, c.name, je_mladinski_slug(c.slug)
    from competitions c
   where exists (select 1 from matches m join rounds r on r.id = m.round_id
                  where r.competition_id = c.id
                    and r.season in (sezona_lige(c.id), sezona_lige(c.id, (now() at time zone 'Europe/Ljubljana')::date - 365))
                    and p_team in (m.home_team_id, m.away_team_id))
      or exists (select 1 from players p
                  where p.competition_id = c.id and p.team_id = p_team
                    and p.dodal_klub_at is not null and p.active and p.izstopil_at is null)
   order by je_mladinski_slug(c.slug), c.id
$$;

-- Kader selekcije na dan: igralci z nastopom za klub v sezoni selekcije tega
-- dne (scout.sezona_selekcije), aktivni igralci, ki jih je dodal klub, in že
-- označeni na dogodku. Brez anonimiziranih (tudi po ključu) in brez ugovora,
-- kot stran Klub (odločitev lastnika 18. 10. 2026).
create function scout.kader_selekcije(p_team bigint, p_competition bigint,
  p_datum date default (now() at time zone 'Europe/Ljubljana')::date, p_dogodek bigint default null)
returns table (player_id bigint, ime text, pozicija text)
language sql stable set search_path = public
as $$
  with kandidati as (
    select distinct a.player_id
      from appearances a join matches m on m.id = a.match_id join rounds r on r.id = m.round_id
     where a.team_id = p_team and r.competition_id = p_competition
       and r.season = scout.sezona_selekcije(p_team, p_competition, p_datum)
    union
    select p.id from players p
     where p.team_id = p_team and p.competition_id = p_competition
       and p.dodal_klub_at is not null and p.active and p.izstopil_at is null
    union
    select x.player_id from scout.prisotnost x where x.dogodek_id = p_dogodek
  )
  select p.id, p.full_name, p.position
    from kandidati k join players p on p.id = k.player_id
   where p.anonimiziran_at is null
     and not exists (select 1 from scout.kljuci_vrstic(array[p.id]) x
                      join anonimizirani_igralci a on a.kljuc = x.kljuc)
     and not scout.je_skrit(array[p.id])
$$;

-- Selekcija mora biti klubova, sicer napaka (nikoli tiho druga selekcija).
create function scout.preveri_selekcijo(p_team bigint, p_competition bigint)
returns void language plpgsql stable set search_path = public
as $$
begin
  if not exists (select 1 from scout.selekcije_kluba(p_team) s where s.competition_id = p_competition) then
    raise insufficient_privilege using message = 'Scout: selekcija ni klubova.';
  end if;
end;
$$;

-- Dogodek mora biti klubov.
create function scout.dogodek_kluba(p_team bigint, p_id bigint)
returns scout.dogodki language plpgsql stable set search_path = public
as $$
declare
  e scout.dogodki;
begin
  select * into e from scout.dogodki x where x.id = p_id and x.team_id = p_team;
  if not found then
    raise insufficient_privilege using message = 'Scout: dogodek ni klubov.';
  end if;
  return e;
end;
$$;

create function scout.selekcije_json(p_team bigint)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'competition_id', s.competition_id, 'ime', s.ime, 'mladinska', s.mladinska)
           order by s.mladinska, s.competition_id), '[]'::jsonb)
    from scout.selekcije_kluba(p_team) s
$$;

-- Krajevni dan dogodka.
create function scout.dan(p_cas timestamptz)
returns date language sql immutable
as $$ select (p_cas at time zone 'Europe/Ljubljana')::date $$;

revoke all on function scout.selekcije_json(bigint), scout.dan(timestamptz) from public, anon, authenticated;
revoke all on function scout.sezona_selekcije(bigint, bigint, date), scout.selekcije_kluba(bigint),
  scout.kader_selekcije(bigint, bigint, date, bigint),
  scout.preveri_selekcijo(bigint, bigint), scout.dogodek_kluba(bigint, bigint)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC

create function public.scout_koledar(p_od date, p_do date)
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
                'za', case when m.home_team_id = d.team_id then m.home_goals else m.away_goals end,
                'proti', case when m.home_team_id = d.team_id then m.away_goals else m.home_goals end)
                order by m.played_on, m.id), '[]'::jsonb)
                from matches m join rounds r on r.id = m.round_id
                join teams t on t.id = case when m.home_team_id = d.team_id then m.away_team_id else m.home_team_id end
               where d.team_id in (m.home_team_id, m.away_team_id)
                 and m.played_on between p_od and p_do),
    'dogodki', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', e.id, 'competition_id', e.competition_id, 'vrsta', e.vrsta, 'zacetek', e.zacetek,
                  'trajanje_min', e.trajanje_min, 'kraj', e.kraj, 'serija', e.serija,
                  'oznaceni', (select count(*) from scout.prisotnost x join players p on p.id = x.player_id
                                where x.dogodek_id = e.id and p.anonimiziran_at is null))
                  order by e.zacetek, e.id), '[]'::jsonb)
                  from scout.dogodki e
                 where e.team_id = d.team_id
                   and e.zacetek >= (p_od::timestamp at time zone 'Europe/Ljubljana')
                   and e.zacetek < ((p_do + 1)::timestamp at time zone 'Europe/Ljubljana')));
end;
$$;

create function public.scout_dogodek(p_id bigint)
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
  update scout.dnevnik x set parametri = x.parametri || jsonb_build_object('igralci',
      (select coalesce(jsonb_agg((i->>'player_id')::bigint order by (i->>'player_id')::bigint), '[]'::jsonb)
         from jsonb_array_elements(v_kader) i))
   where x.id = d.dnevnik_id;
  return jsonb_build_object(
    'id', e.id, 'competition_id', e.competition_id,
    'selekcija', (select c.name from competitions c where c.id = e.competition_id),
    'vrsta', e.vrsta, 'zacetek', e.zacetek, 'trajanje_min', e.trajanje_min,
    'kraj', e.kraj, 'opomba', e.opomba, 'serija', e.serija,
    'selekcije', scout.selekcije_json(d.team_id),
    'kader', v_kader);
end;
$$;

-- Nov dogodek (p_id null) ali sprememba enega dogodka. Pri novem s p_ponovi_do
-- nastane tedenska serija do tega dne (po krajevnem času), največ 52 dogodkov.
-- Vrne id (prvega) dogodka.
create function public.scout_shrani_dogodek(
  p_competition_id bigint, p_vrsta text, p_zacetek timestamptz, p_trajanje_min int,
  p_kraj text, p_opomba text, p_id bigint default null, p_ponovi_do date default null)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  v_id bigint;
  v_serija uuid;
  v_lokalno timestamp := p_zacetek at time zone 'Europe/Ljubljana';
  n int := 1;
begin
  select * into d from scout.dostop('dogodek', null, jsonb_build_object('dogodek', p_id, 'shrani', true));
  perform scout.preveri_selekcijo(d.team_id, p_competition_id);
  if p_zacetek is null or p_zacetek not between now() - interval '2 years' and now() + interval '2 years' then
    raise exception 'Scout: začetek manjka ali je več kot dve leti od danes.' using hint = 'scout-dogodek';
  end if;
  if p_id is not null then
    perform scout.dogodek_kluba(d.team_id, p_id);
    -- Druga selekcija bi pustila prisotnost igralcev, ki niso v novem kadru.
    if exists (select 1 from scout.dogodki x where x.id = p_id and x.competition_id <> p_competition_id) then
      delete from scout.prisotnost where dogodek_id = p_id;
    end if;
    update scout.dogodki set competition_id = p_competition_id, vrsta = p_vrsta, zacetek = p_zacetek,
           trajanje_min = p_trajanje_min, kraj = nullif(trim(p_kraj), ''), opomba = nullif(trim(p_opomba), '')
     where id = p_id;
    return p_id;
  end if;
  if p_ponovi_do is not null then
    if p_ponovi_do < v_lokalno::date then
      raise exception 'Scout: ponovitev konča pred začetkom.' using hint = 'scout-dogodek';
    end if;
    n := (p_ponovi_do - v_lokalno::date) / 7 + 1;
    if n > 52 then
      raise exception 'Scout: največ 52 ponovitev.' using hint = 'scout-dogodek';
    end if;
    if n > 1 then v_serija := gen_random_uuid(); end if;
  end if;
  -- Tedenska ponovitev po krajevnem času, da trening ob 18.00 ostane ob 18.00 čez premik ure.
  -- shortcut: ura je ljubljanska (EU premik ure je isti dan), pri državi brez premika (GE, AM, AZ, KZ)
  -- se serija čez premik zamakne za uro; ko se Scout odpre tam, podaj časovni pas kluba.
  with novi as (
    insert into scout.dogodki (team_id, competition_id, vrsta, zacetek, trajanje_min, kraj, opomba, serija, ustvaril)
    select d.team_id, p_competition_id, p_vrsta, (v_lokalno + make_interval(weeks => i)) at time zone 'Europe/Ljubljana',
           p_trajanje_min, nullif(trim(p_kraj), ''), nullif(trim(p_opomba), ''), v_serija, auth.uid()
      from generate_series(0, n - 1) i
    returning id)
  select min(id) into v_id from novi;
  return v_id;
end;
$$;

create function public.scout_brisi_dogodek(p_id bigint, p_vse_prihodnje boolean default false)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  e scout.dogodki;
  n int;
begin
  select * into d from scout.dostop('dogodek', null, jsonb_build_object('dogodek', p_id, 'brisi', true));
  e := scout.dogodek_kluba(d.team_id, p_id);
  delete from scout.dogodki x
   where x.team_id = d.team_id
     and (x.id = e.id
          or (coalesce(p_vse_prihodnje, false) and e.serija is not null
              and x.serija = e.serija and x.zacetek >= e.zacetek));
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Prisotnost vsega kadra v enem klicu: [{player_id, stanje}], stanje null pobriše oznako.
create function public.scout_shrani_prisotnost(p_id bigint, p_vnosi jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  e scout.dogodki;
begin
  select * into d from scout.dostop('dogodek', null, jsonb_build_object('dogodek', p_id, 'prisotnost', true));
  e := scout.dogodek_kluba(d.team_id, p_id);
  if jsonb_typeof(p_vnosi) is distinct from 'array' or jsonb_array_length(p_vnosi) > 300
     or exists (select 1 from jsonb_array_elements(p_vnosi) v
                 where jsonb_typeof(v->'player_id') is distinct from 'number'
                    or coalesce(v->>'stanje', 'prisoten') not in ('prisoten', 'opravicen', 'odsoten'))
     or (select count(*) <> count(distinct v->>'player_id') from jsonb_array_elements(p_vnosi) v) then
    raise exception 'Scout: neveljavni vnosi prisotnosti.' using hint = 'scout-prisotnost';
  end if;
  if exists (select 1 from jsonb_array_elements(p_vnosi) v
              where (v->>'player_id')::bigint not in
                    (select k.player_id from scout.kader_selekcije(d.team_id, e.competition_id, scout.dan(e.zacetek), e.id) k)) then
    raise insufficient_privilege using message = 'Scout: igralec ni v kadru selekcije.';
  end if;
  delete from scout.prisotnost x
   using jsonb_array_elements(p_vnosi) v
   where x.dogodek_id = e.id and x.player_id = (v->>'player_id')::bigint and v->>'stanje' is null;
  insert into scout.prisotnost (dogodek_id, player_id, stanje, oznacil)
  select e.id, (v->>'player_id')::bigint, v->>'stanje', auth.uid()
    from jsonb_array_elements(p_vnosi) v
   where v->>'stanje' is not null
  on conflict (dogodek_id, player_id) do update
    set stanje = excluded.stanje, oznacil = excluded.oznacil, updated_at = now();
end;
$$;

-- Kader selekcije: dejstva tekoče sezone iz zapisnikov in prisotnost zadnjih 30 dni.
-- Brez p_competition_id prva selekcija kluba (članske pred mladinskimi).
create function public.scout_ekipa(p_competition_id bigint default null)
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
  update scout.dnevnik x set parametri = x.parametri || jsonb_build_object('igralci',
      (select coalesce(jsonb_agg((i->>'player_id')::bigint order by (i->>'player_id')::bigint), '[]'::jsonb)
         from jsonb_array_elements(v_igralci) i))
   where x.id = d.dnevnik_id;
  return jsonb_build_object(
    'selekcije', v_selekcije,
    'competition_id', p_competition_id,
    'sezona', v_sezona,
    'igralci', v_igralci);
end;
$$;

revoke all on function public.scout_koledar(date, date), public.scout_dogodek(bigint),
  public.scout_shrani_dogodek(bigint, text, timestamptz, int, text, text, bigint, date),
  public.scout_brisi_dogodek(bigint, boolean), public.scout_shrani_prisotnost(bigint, jsonb),
  public.scout_ekipa(bigint)
  from public, anon;
grant execute on function public.scout_koledar(date, date), public.scout_dogodek(bigint),
  public.scout_shrani_dogodek(bigint, text, timestamptz, int, text, text, bigint, date),
  public.scout_brisi_dogodek(bigint, boolean), public.scout_shrani_prisotnost(bigint, jsonb),
  public.scout_ekipa(bigint)
  to authenticated;

-- Hramba: dogodki (in z njimi prisotnost) starejši od 24 mesecev.
create or replace function scout.pocisti()
returns void language sql
as $$
  delete from scout.dnevnik where created_at < now() - interval '12 months';
  delete from scout.opazovani o
   where not exists (select 1 from public.players p where p.id = o.player_id and p.anonimiziran_at is null)
      or scout.je_skrit(array[o.player_id]);
  delete from scout.dogodki where zacetek < now() - interval '24 months';
  delete from scout.prisotnost x
   where not exists (select 1 from public.players p where p.id = x.player_id and p.anonimiziran_at is null)
      or scout.je_skrit(array[x.player_id]);
$$;
revoke all on function scout.pocisti() from public, anon, authenticated;
