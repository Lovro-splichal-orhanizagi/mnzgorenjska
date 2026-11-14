-- Moja sezona ("Wrapped"), zgodba po tekmi in CV igralca (SLF-373).
-- Le javna dejstva iz zapisnikov in profila; brez novih tabel (nič ne kaže
-- na players, katalog FCF ostane nespremenjen).

-- Vrstica osebe z največ minutami v tekoči sezoni svoje lige (odrasle,
-- neanonimizirane vrstice potrjenega zahtevka), sicer glavna.
create or replace function public.sezona_vrstica(p_glavni bigint)
returns bigint language sql stable security definer set search_path = public
as $$
  select coalesce((
    select s.id from player_season_standings s
      join players p on p.id = s.id and p.anonimiziran_at is null
     where s.id = any (izlozba_vrstice(p_glavni)) and s.season = sezona_lige(s.competition_id)
     order by s.minutes desc nulls last, s.id
     limit 1), p_glavni)
$$;
revoke all on function public.sezona_vrstica(bigint) from public, anon, authenticated;

-- Moja sezona za lastnika potrjenega profila. Nepreverjen dobi napoved
-- (tekme, minute, goli), preverjen še najboljšo tekmo, točke, mesto v ligi,
-- izbranost in oglede skavtov v sezoni.
create or replace function public.moja_sezona(p_player_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_glavni bigint;
  v_vrstica bigint;
  v_preverjen boolean;
  s record;
  v_kartoni record;
  v_najboljsa jsonb;
  v_od date;
begin
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  if v_glavni is null or not je_lastnik_profila(v_glavni) or not izlozba_odrasla_oseba(v_glavni) then
    return null;
  end if;
  v_preverjen := je_preverjen(v_glavni);
  v_vrstica := sezona_vrstica(v_glavni);
  select st.*, c.slug as liga_slug, c.name as liga into s
    from player_season_standings st join competitions c on c.id = st.competition_id
   where st.id = v_vrstica and st.season = sezona_lige(st.competition_id);
  if s.id is null then
    return null;
  end if;
  if not v_preverjen then
    return jsonb_build_object('preverjen', false, 'sezona', s.season, 'liga', s.liga, 'ime', s.full_name,
      'klub', s.team_name, 'tekme', s.matches, 'minute', s.minutes, 'goli', s.goals);
  end if;

  select coalesce(sum(a.yellow_cards), 0)::int as rumeni, coalesce(sum(a.red_cards), 0)::int as rdeci,
         min(coalesce(m.played_on, r.played_on)) as od
    into v_kartoni
    from appearances a join matches m on m.id = a.match_id join rounds r on r.id = m.round_id
   where a.player_id = v_vrstica and r.competition_id = s.competition_id and r.season = s.season;
  v_od := coalesce(v_kartoni.od, current_date - 365);

  -- Najboljša tekma: največ fantasy točk, nato goli.
  select jsonb_build_object('datum', coalesce(m.played_on, r.played_on), 'tocke', ps.points, 'goli', a.goals,
           'minute', a.minutes_played,
           'proti', (select t.name from teams t where t.id = case when m.home_team_id = a.team_id then m.away_team_id else m.home_team_id end),
           'dani', case when m.home_team_id = a.team_id then m.home_goals else m.away_goals end,
           'prejeti', case when m.home_team_id = a.team_id then m.away_goals else m.home_goals end)
    into v_najboljsa
    from appearances a join matches m on m.id = a.match_id join rounds r on r.id = m.round_id
    left join player_scores ps on ps.round_id = r.id and ps.player_id = a.player_id
   where a.player_id = v_vrstica and r.competition_id = s.competition_id and r.season = s.season
   order by ps.points desc nulls last, a.goals desc, a.minutes_played desc
   limit 1;

  return jsonb_build_object('preverjen', true, 'sezona', s.season, 'liga', s.liga, 'liga_slug', s.liga_slug,
    'ime', s.full_name, 'klub', s.team_name, 'klub_logo', s.team_logo,
    'tekme', s.matches, 'minute', s.minutes, 'goli', s.goals, 'asistence', s.assists, 'ciste', s.clean_sheets,
    'tocke', s.points, 'mesto', s.rank, 'izbranost', s.owners,
    'rumeni', v_kartoni.rumeni, 'rdeci', v_kartoni.rdeci, 'najboljsa', v_najboljsa,
    'skavti', (select count(*)::int from scout.dnevnik d
                where d.vrsta = 'igralec' and d.player_id = any (izlozba_vrstice(v_glavni)) and d.created_at >= v_od
                  and d.team_id not in (select p.team_id from players p where p.id = any (izlozba_vrstice(v_glavni)) and p.team_id is not null)));
end;
$$;
revoke all on function public.moja_sezona(bigint) from public;
grant execute on function public.moja_sezona(bigint) to authenticated;

-- Zadnja odigrana tekma preverjenega lastnika za zgodbo po tekmi.
create or replace function public.zadnja_tekma_zgodba(p_player_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_glavni bigint;
  v jsonb;
begin
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  if v_glavni is null or not je_lastnik_profila(v_glavni) or not je_preverjen(v_glavni) then
    return null;
  end if;
  select jsonb_build_object(
           'tekma', m.id, 'datum', coalesce(m.played_on, r.played_on), 'krog', r.number,
           'liga', c.name, 'liga_slug', c.slug, 'ime', p.full_name,
           'domaci', (select t.name from teams t where t.id = m.home_team_id),
           'gostje', (select t.name from teams t where t.id = m.away_team_id),
           'domaci_logo', (select t.logo_url from teams t where t.id = m.home_team_id),
           'gostje_logo', (select t.logo_url from teams t where t.id = m.away_team_id),
           'hg', m.home_goals, 'ag', m.away_goals, 'doma', m.home_team_id = a.team_id,
           'minute', a.minutes_played, 'goli', a.goals, 'zacel', a.started,
           'asistence', (select count(*)::int from goals g where g.match_id = m.id and g.assist_player_id = a.player_id),
           'tocke', (select ps.points from player_scores ps where ps.round_id = r.id and ps.player_id = a.player_id))
    into v
    from appearances a
    join matches m on m.id = a.match_id
    join rounds r on r.id = m.round_id
    join competitions c on c.id = r.competition_id
    join players p on p.id = a.player_id and p.anonimiziran_at is null
   where a.player_id = any (izlozba_vrstice(v_glavni))
     and (izid_znan(m.imported_at, m.statistics_status) or m.kontumacija)
     and not je_mladinski_slug(c.slug)
   order by coalesce(m.played_on, r.played_on) desc nulls last, m.id desc
   limit 1;
  return v;
end;
$$;
revoke all on function public.zadnja_tekma_zgodba(bigint) from public;
grant execute on function public.zadnja_tekma_zgodba(bigint) to authenticated;

-- CV preverjenega polnoletnega igralca: javen (povezava za trenerja), le kar
-- je na profilu že javno. Sezone čez vse vrstice osebe (brez mladinskih in
-- anonimiziranih), najnovejša prva.
create or replace function public.cv_igralca(p_player_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_glavni bigint;
  v_vrstica bigint;
begin
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  if v_glavni is null or not je_preverjen(v_glavni) or not izlozba_odrasla_oseba(v_glavni) then
    return null;
  end if;
  v_vrstica := sezona_vrstica(v_glavni);
  return jsonb_build_object(
    'glavni', v_glavni,
    'vrstica', v_vrstica,
    'ime', (select p.full_name from players p where p.id = v_vrstica),
    'pozicija', (select p.position from players p where p.id = v_vrstica),
    'klub', (select jsonb_build_object('ime', t.name, 'logo', t.logo_url) from players p join teams t on t.id = p.team_id where p.id = v_vrstica),
    'liga', (select jsonb_build_object('ime', c.name, 'slug', c.slug) from players p join competitions c on c.id = p.competition_id where p.id = v_vrstica),
    'vzdevek', (select pi.vzdevek from profil_igralca pi where pi.player_id = v_glavni),
    'opis', coalesce((select pp.opis from profil_igralca_plus pp where pp.player_id = v_glavni),
                     (select pi.opis from profil_igralca pi where pi.player_id = v_glavni)),
    'povezave', (select jsonb_build_object('youtube', pp.youtube, 'x', pp.x, 'splet', pp.splet)
                   from profil_igralca_plus pp where pp.player_id = v_glavni),
    'posnetkov', (select count(*)::int from posnetki_igralca x
                   where x.igralec = v_glavni and x.stanje = 'pripravljen' and x.pregled = 'odobren'),
    'sezone', coalesce((
      select jsonb_agg(x order by x.sezona desc, x.minute desc) from (
        select s.season as sezona, c.name as liga, s.team_name as klub, s.matches as tekme, s.minutes as minute,
               s.goals as goli, s.assists as asistence, s.clean_sheets as ciste, s.position as pozicija
          from player_season_standings s
          join competitions c on c.id = s.competition_id
          join players p on p.id = s.id and p.anonimiziran_at is null
         where s.id = any (izlozba_vrstice(v_glavni)) and not je_mladinski_slug(c.slug) and coalesce(s.matches, 0) > 0) x), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.cv_igralca(bigint) from public;
grant execute on function public.cv_igralca(bigint) to anon, authenticated;

-- Highlight video (del preverjenega profila): ko ima preverjen igralec 6
-- odobrenih posnetkov, mu ekipa SLFF iz njih zmontira video; z manj ga
-- kontaktiramo. Stanje vodi admin. Kot posnetki_igralca: `igralec` je glavna
-- vrstica zahtevka, brez tujega ključa na players (katalog FCF).
create table public.highlight_videi (
  igralec bigint primary key,
  stanje text not null default 'kontaktiran' check (stanje in ('kontaktiran', 'v_delu', 'oddan')),
  opomba text check (opomba is null or char_length(opomba) <= 500),
  updated_at timestamptz not null default now()
);
alter table public.highlight_videi enable row level security;
revoke all on public.highlight_videi from public, anon, authenticated;
insert into agent.zaprte_tabele (tabela, zakaj) values
  ('public.highlight_videi', 'stanje videov in opombe admina o igralcih')
on conflict (tabela) do nothing;

-- Lastniku: koliko odobrenih posnetkov ima in stanje videa.
create or replace function public.moj_highlight(p_player_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_glavni bigint;
begin
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  if v_glavni is null or not je_lastnik_profila(v_glavni) or not je_preverjen(v_glavni) then
    return null;
  end if;
  return jsonb_build_object(
    'posnetkov', (select count(*)::int from posnetki_igralca x
                   where x.igralec = v_glavni and x.stanje = 'pripravljen' and x.pregled = 'odobren'),
    'potrebnih', 6,
    'stanje', (select h.stanje from highlight_videi h where h.igralec = v_glavni));
end;
$$;
revoke all on function public.moj_highlight(bigint) from public;
grant execute on function public.moj_highlight(bigint) to authenticated;

-- Admin: preverjeni polnoletni igralci z odobrenimi posnetki, stanjem videa
-- in e-naslovom za stik (le admin).
create or replace function public.admin_highlight_vrsta()
returns table (igralec bigint, ime text, posnetkov int, stanje text, opomba text, eposta text)
language plpgsql stable security definer set search_path = public, auth
as $$
begin
  if not is_admin() then
    raise exception 'Le za admina.';
  end if;
  return query
  select z.player_id, p.full_name,
         (select count(*)::int from posnetki_igralca x
           where x.igralec = z.player_id and x.stanje = 'pripravljen' and x.pregled = 'odobren'),
         h.stanje, h.opomba, u.email::text
    from zahtevki_igralca z
    join players p on p.id = z.player_id and p.anonimiziran_at is null
    join preverjeni_racuni r on r.player_id = z.player_id and r.user_id = z.user_id
                            and r.status = 'aktiven' and (r.velja_do is null or r.velja_do > now())
    left join highlight_videi h on h.igralec = z.player_id
    left join auth.users u on u.id = z.user_id
   where z.status = 'potrjen'
   order by (h.stanje = 'oddan') nulls first, 3 desc, p.full_name;
end;
$$;
revoke all on function public.admin_highlight_vrsta() from public;
grant execute on function public.admin_highlight_vrsta() to authenticated;

create or replace function public.admin_highlight_stanje(p_igralec bigint, p_stanje text, p_opomba text default null)
returns void language plpgsql volatile security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Le za admina.';
  end if;
  if p_stanje is null then
    delete from highlight_videi where igralec = p_igralec;
    return;
  end if;
  insert into highlight_videi (igralec, stanje, opomba, updated_at) values (p_igralec, p_stanje, p_opomba, now())
  on conflict (igralec) do update set stanje = excluded.stanje, opomba = excluded.opomba, updated_at = now();
end;
$$;
revoke all on function public.admin_highlight_stanje(bigint, text, text) from public;
grant execute on function public.admin_highlight_stanje(bigint, text, text) to authenticated;
