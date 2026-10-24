-- Klubski računi, faza 3: klub doda igralca (spec, razdelek 3).
--
-- Klubski račun vpiše igralca, ki ga vir (še) ne pozna: pozno registriran,
-- nov v ekipi, zapisnik brez imena. Igralec je takoj na trgu po 4.5, točke pa
-- dobi šele z nastopom v zapisniku. Ko ga zapisnik prvič pokaže, ga uvoz
-- posvoji (`scripts/klubski-igralci.mjs`): ime in šifra pridejo iz vira,
-- pozicija kluba ostane.
--
-- Omejitev 25 dodanih na klub na sezono šteje dnevnik, ne vrstice v players,
-- zato je dodajanje in brisanje ne obide. Alarmi gredo na Discord in ničesar
-- ne zavrnejo: 10 dodanih v 24 urah, 20 od 25, ime zelo podobno obstoječemu
-- igralcu kluba (verjetno dvojnik).

alter table public.players add column if not exists dodal_klub_at timestamptz;
comment on column public.players.dodal_klub_at is
  'Igralca je dodal klubski račun (klub_dodaj_igralca). Uvoz ga posvoji ob prvem nastopu.';

create table public.klub_dodani_igralci (
  id             bigint generated always as identity primary key,
  player_id      bigint references public.players on delete set null,
  team_id        bigint not null references public.teams on delete cascade,
  competition_id bigint not null references public.competitions on delete cascade,
  sezona         text not null,
  full_name      text not null,
  user_id        uuid references public.profiles on delete set null,
  created_at     timestamptz not null default now(),
  odstranjen_at  timestamptz
);
create index klub_dodani_igralci_klub on public.klub_dodani_igralci (team_id, sezona);
alter table public.klub_dodani_igralci enable row level security;
revoke all on public.klub_dodani_igralci from anon, authenticated;

-- "Novák  Péter" in "peter novak" sta isto ime: brez šumnikov, malih črk,
-- besede po abecedi. Isto pravilo ima uvoz (normaliziranoIme).
create or replace function public.ime_za_primerjavo(p text)
returns text language sql stable set search_path = public, extensions
as $$
  select coalesce(string_agg(w, ' ' order by w), '')
    from regexp_split_to_table(lower(extensions.unaccent(coalesce(p, ''))), '[\s,.]+') w
   where w <> ''
$$;

create or replace function public.klub_dodaj_igralca(
  p_competition_id bigint,
  p_ime text,
  p_priimek text,
  p_position text,
  p_st int default null
) returns bigint
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_team    bigint;
  v_klub    text;
  v_drzava  bigint;
  v_sezona  text;
  v_ime     text := btrim(regexp_replace(coalesce(p_ime, ''), '\s+', ' ', 'g'));
  v_priimek text := btrim(regexp_replace(coalesce(p_priimek, ''), '\s+', ' ', 'g'));
  v_polno   text;
  v_n       int;
  v_dan     int;
  v_podoben text;
  v_id      bigint;
begin
  select k.team_id into v_team from klubski_racuni k
   where k.user_id = auth.uid() and k.preklican_at is null;
  if auth.uid() is null or v_team is null then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  if p_position not in ('GK', 'DEF', 'MID', 'FWD') then
    raise exception 'Pozicija je GK, DEF, MID ali FWD.';
  end if;
  if char_length(v_ime) not between 1 and 40 or char_length(v_priimek) not between 1 and 40
     or v_ime || v_priimek !~ '^[[:alpha:][:space:]''’.-]+$' then
    raise exception 'Ime in priimek imata lahko do 40 črk.';
  end if;
  if p_st is not null and p_st not between 1 and 99 then
    raise exception 'Številka dresa je med 1 in 99.';
  end if;

  select c.country_id, sezona_lige(c.id) into v_drzava, v_sezona
    from competitions c where c.id = p_competition_id and c.active;
  if v_sezona is null or not exists (
       select 1 from matches m join rounds r on r.id = m.round_id
        where r.competition_id = p_competition_id and r.season = v_sezona
          and v_team in (m.home_team_id, m.away_team_id)) then
    raise exception 'Klub v tej ligi letos ne igra.';
  end if;

  -- Zapisnik in vir pišeta "Priimek Ime"; tako tudi mi.
  v_polno := v_priimek || ' ' || v_ime;

  if exists (select 1 from players p
              where p.competition_id = p_competition_id and p.team_id = v_team
                and ime_za_primerjavo(p.full_name) = ime_za_primerjavo(v_polno)) then
    raise exception 'Igralec s tem imenom je pri klubu že vpisan.';
  end if;
  -- Kdor je ugovarjal objavi, se ne vrne skozi klub.
  if exists (select 1 from anonimizirani_igralci a join players p on p.id = a.player_id
              where a.kljuc = anonimizacijski_kljuc(v_drzava || '|' || v_polno)
                and p.anonimiziran_razlog = 'ugovor') then
    raise exception 'Ta igralec je prosil, da ga ne prikazujemo.';
  end if;

  -- Zaklep na klub: dva hkratna klica ne prestopita omejitve.
  perform 1 from teams where id = v_team for update;
  select count(*) into v_n from klub_dodani_igralci where team_id = v_team and sezona = v_sezona;
  if v_n >= 25 then
    raise exception 'Klub je to sezono dodal že 25 igralcev.';
  end if;

  insert into players (competition_id, team_id, full_name, last_name, first_name, position,
                       position_source, shirt_number, value, value_start, active, dodal_klub_at)
  values (p_competition_id, v_team, v_polno, v_priimek, v_ime, p_position,
          'klub', p_st, 4.5, 4.5, true, now())
  returning id into v_id;
  insert into klub_dodani_igralci (player_id, team_id, competition_id, sezona, full_name, user_id)
  values (v_id, v_team, p_competition_id, v_sezona, v_polno, auth.uid());

  select name into v_klub from teams where id = v_team;
  select count(*) into v_dan from klub_dodani_igralci
   where team_id = v_team and created_at > now() - interval '24 hours';
  if v_dan = 10 then
    perform preverjeni_na_discord(format('⚠️ Klub %s je v 24 urah dodal 10 igralcev.', v_klub));
  end if;
  if v_n + 1 = 20 then
    perform preverjeni_na_discord(format('⚠️ Klub %s je dodal 20 od 25 igralcev te sezone.', v_klub));
  end if;
  select p.full_name into v_podoben from players p
   where p.competition_id = p_competition_id and p.team_id = v_team and p.id <> v_id
     and similarity(ime_za_primerjavo(p.full_name), ime_za_primerjavo(v_polno)) >= 0.6
   order by similarity(ime_za_primerjavo(p.full_name), ime_za_primerjavo(v_polno)) desc
   limit 1;
  if v_podoben is not null then
    perform preverjeni_na_discord(format('⚠️ Klub %s je dodal %s, podobno kot %s (dvojnik?), id %s.',
                                         v_klub, v_polno, v_podoben, v_id));
  end if;
  return v_id;
end;
$$;

-- Skupno odstranjevanje za klub in admina. Brez nastopa: igralca, ki ga nihče
-- nima, izbrišemo; kogar kdo ima (ali ga je imel v posnetku kroga), le
-- umaknemo s trga kot odhod (`odsel_at`, uvoz razporeda ga ne obudi).
create or replace function public.odstrani_klubskega_igralca(p_player_id bigint)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_p players%rowtype;
begin
  select * into v_p from players where id = p_player_id for update;
  if v_p.id is null or v_p.dodal_klub_at is null then
    raise exception 'Odstraniti je mogoče le igralca, ki ga je dodal klub.';
  end if;
  if exists (select 1 from appearances where player_id = p_player_id) then
    raise exception 'Igralec že ima nastop v zapisniku.';
  end if;
  update klub_dodani_igralci set odstranjen_at = now()
   where player_id = p_player_id and odstranjen_at is null;
  if not exists (select 1 from fantasy_roster where player_id = p_player_id)
     and not exists (select 1 from fantasy_lineups where player_id = p_player_id) then
    begin
      delete from players where id = p_player_id;
      return 'izbrisan';
    exception when foreign_key_violation then
      null;
    end;
  end if;
  update players set active = false, odsel_at = now(), odsel_by = auth.uid()
   where id = p_player_id;
  return 'umaknjen';
end;
$$;
revoke all on function public.odstrani_klubskega_igralca(bigint) from public, anon, authenticated;

create or replace function public.klub_odstrani_igralca(p_player_id bigint)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_team bigint;
  v_competition bigint;
begin
  select team_id, competition_id into v_team, v_competition from players where id = p_player_id;
  if auth.uid() is null or v_team is null or not je_klubski_racun(auth.uid(), v_team) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  -- Kot oznaka odhoda: ne tik pred rokom, ko lastniki ne morejo več menjati.
  if exists (select 1 from fantasy_roster where player_id = p_player_id) and exists (
       select 1 from rounds r join competitions c on c.id = r.competition_id
        where r.competition_id = v_competition and r.lineups_locked_at is null
          and r.deadline_at is not null and r.number >= coalesce(c.prvi_fantasy_krog, 1)
          and r.deadline_at <= now() + interval '24 hours'
          and r.deadline_at > now() - interval '7 days') then
    raise exception 'Igralca, ki ga ima kdo v ekipi, lahko odstraniš najkasneje 24 ur pred rokom kroga.';
  end if;
  return odstrani_klubskega_igralca(p_player_id);
end;
$$;

create or replace function public.admin_odstrani_klubskega_igralca(p_player_id bigint)
returns text
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return odstrani_klubskega_igralca(p_player_id);
end;
$$;

-- Seznam za urejanje strani kluba: vsi dodani te sezone, tudi odstranjeni
-- (štejejo v omejitev).
create or replace function public.klub_dodani(p_team_id bigint)
returns table (dnevnik bigint, igralec bigint, ime text, pozicija text, dres int, liga text,
               dodan timestamptz, odstranjen timestamptz, nastopov int, aktiven boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or not je_klubski_racun(auth.uid(), p_team_id) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  return query
    select d.id, d.player_id, coalesce(p.full_name, d.full_name), p.position, p.shirt_number, c.name,
           d.created_at, d.odstranjen_at,
           (select count(*)::int from appearances a where a.player_id = d.player_id),
           coalesce(p.active, false)
      from klub_dodani_igralci d
      join competitions c on c.id = d.competition_id
      left join players p on p.id = d.player_id
     where d.team_id = p_team_id and d.sezona = sezona_lige(d.competition_id)
     order by d.created_at desc;
end;
$$;

-- Administracija: dodani pred več kot 6 tedni, ki še niso nastopili.
create or replace function public.admin_klubski_igralci_brez_nastopa()
returns table (igralec bigint, ime text, klub text, liga text, dodan timestamptz, lastnikov int, aktiven boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
    select p.id, p.full_name, t.name, c.name, p.dodal_klub_at,
           (select count(*)::int from fantasy_roster r where r.player_id = p.id), p.active
      from players p
      join teams t on t.id = p.team_id
      join competitions c on c.id = p.competition_id
     where p.dodal_klub_at < now() - interval '6 weeks'
       and not exists (select 1 from appearances a where a.player_id = p.id)
     order by p.dodal_klub_at;
end;
$$;

revoke all on function public.klub_dodaj_igralca(bigint, text, text, text, int),
  public.klub_odstrani_igralca(bigint), public.klub_dodani(bigint),
  public.admin_odstrani_klubskega_igralca(bigint), public.admin_klubski_igralci_brez_nastopa()
  from public, anon;
grant execute on function public.klub_dodaj_igralca(bigint, text, text, text, int),
  public.klub_odstrani_igralca(bigint), public.klub_dodani(bigint),
  public.admin_odstrani_klubskega_igralca(bigint), public.admin_klubski_igralci_brez_nastopa()
  to authenticated;
revoke all on function public.ime_za_primerjavo(text) from public, anon, authenticated;
