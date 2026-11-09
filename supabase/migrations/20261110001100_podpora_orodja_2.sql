-- Orodja klepeta za podporo, drugi del (HelpStack SERVER_SIDE).
--
-- Pregled 381 pogovorov: agent najpogosteje obtiči, ko uporabnik javi
-- napačen podatek ("Kos je napadalec, ne branilec"), vpraša, zakaj ima
-- igralec toliko točk, zakaj tekme še ni ali kdaj se zapre glasovanje o
-- asistencah, in ko liga manjka. Do zdaj je moral vse predati sodelavcu.
--
--   prijavi_napako(vrsta, opis, igralec, klub, liga, pravilno, kontakt)
--   tocke_igralca(ime, liga)
--   stanje_tekme(klub, liga, krog)
--   zahtevaj_ligo(liga, drzava, kontakt, vztrajam)
--
-- Kot prva orodja (20261004142300): kliče jih agent z javnim ključem,
-- imena argumentov so tista, ki jih pošlje agent, bralna vračajo le, kar je
-- že na javni strani. Pisalni dve pišeta le prek SECURITY DEFINER funkcije;
-- tabel anon ne vidi.

-- --------------------------------------------------------------------------
-- prijave_napak: napake v podatkih, javljene v klepetu
-- --------------------------------------------------------------------------
-- Popravki klubov (popravki_podatkov) zahtevajo račun in klub, javne
-- prijave odsotnosti (player_reports) prijavo — klepet nima ne enega ne
-- drugega, zato svoja tabela. Besedilo je, kot ga je zapisal agent; igralca
-- in ligo poskusimo prepoznati, da jih admin ne išče ročno.
create table public.prijave_napak (
  id bigint generated always as identity primary key,
  vrsta text not null check (vrsta in ('pozicija', 'manjka_igralec', 'rezultat', 'asistenca', 'cena', 'drugo')),
  opis text not null check (length(opis) between 3 and 1000),
  igralec text check (length(igralec) <= 120),
  klub text check (length(klub) <= 120),
  liga text check (length(liga) <= 120),
  pravilno text check (length(pravilno) <= 300),
  -- E-naslov ali drug stik, če ga je uporabnik dal; le za odgovor nanj.
  kontakt text check (length(kontakt) <= 254),
  -- Brez tujih ključev na players/competitions: ID je le kazalec za admina,
  -- test FCF_TARGET pa dovoli samo znane ključe na ti tabeli.
  player_id bigint,
  competition_id bigint,
  vir text not null default 'klepet' check (vir in ('klepet')),
  created_at timestamptz not null default now(),
  stanje text not null default 'odprta' check (stanje in ('odprta', 'resena', 'zavrnjena')),
  resil uuid references public.profiles(id) on delete set null,
  reseno_at timestamptz,
  opomba text check (length(opomba) <= 300)
);
create index prijave_napak_odprte on public.prijave_napak (created_at desc) where stanje = 'odprta';
create index prijave_napak_cas on public.prijave_napak (created_at);

alter table public.prijave_napak enable row level security;
revoke all on public.prijave_napak from anon, authenticated;

-- Stik prijavitelja ni za agente (bralec baze); ostalo smejo brati.
insert into agent.zaprti_stolpci (tabela, stolpec, zakaj) values
  ('public.prijave_napak', 'kontakt', 'e-pošta ali stik prijavitelja')
on conflict (tabela, stolpec) do nothing;

-- Prazen niz = null, odvečni presledki proč, odrezano na mejo.
create or replace function public.podpora_besedilo(t text, najvec int)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$ select nullif(left(regexp_replace(btrim(coalesce(t, '')), '[[:space:]]+', ' ', 'g'), najvec), '') $$;

create or replace function public.prijavi_napako(
  vrsta text,
  opis text,
  igralec text default null,
  klub text default null,
  liga text default null,
  pravilno text default null,
  kontakt text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_vrsta text := lower(btrim(coalesce(vrsta, '')));
  v_opis text := podpora_besedilo(opis, 1000);
  v_igralec text := podpora_besedilo(igralec, 120);
  v_klub text := podpora_besedilo(klub, 120);
  v_liga text := podpora_besedilo(liga, 120);
  v_pravilno text := podpora_besedilo(pravilno, 300);
  v_kontakt text := podpora_besedilo(kontakt, 254);
  v_liga_id bigint;
  v_igralec_id bigint;
  v_id bigint;
begin
  if v_vrsta not in ('pozicija', 'manjka_igralec', 'rezultat', 'asistenca', 'cena', 'drugo') then
    v_vrsta := 'drugo';
  end if;
  if v_opis is null or length(v_opis) < 3 then
    return jsonb_build_object('zapisano', false,
      'sporocilo', 'Manjka opis napake: kaj je narobe, pri katerem igralcu ali tekmi.');
  end if;

  -- Ista prijava v zadnji uri (ponovljen klic ali isti človek dvakrat) ni nova.
  select p.id into v_id
    from prijave_napak p
   where p.created_at > now() - interval '1 hour'
     and p.vrsta = v_vrsta
     and lower(p.opis) = lower(v_opis)
     and coalesce(lower(p.igralec), '') = coalesce(lower(v_igralec), '')
   limit 1;
  if v_id is not null then
    return jsonb_build_object('zapisano', true, 'id', v_id, 'ze_prijavljeno', true,
      'sporocilo', 'Ta napaka je že prijavljena (št. ' || v_id || '). Ekipa jo preveri.');
  end if;

  -- Meje: 5 na uro na isti stik, 40 na uro vseh skupaj (klepet je javen).
  if (v_kontakt is not null and (select count(*) from prijave_napak p
        where lower(p.kontakt) = lower(v_kontakt) and p.created_at > now() - interval '1 hour') >= 5)
     or (select count(*) from prijave_napak p where p.created_at > now() - interval '1 hour') >= 40 then
    return jsonb_build_object('zapisano', false, 'omejitev', true,
      'sporocilo', 'Trenutno je prijav preveč. Prosi uporabnika, naj poskusi čez eno uro ali piše na info@slff.eu.');
  end if;

  -- Liga in igralec, če ju prepoznamo enoznačno (le v pomoč adminu).
  if v_liga is not null then
    select c.id into v_liga_id
      from competitions c
     where c.id in (select podpora_lige(v_liga))
     order by c.active desc, c.sort_order nulls last
     limit 1;
  end if;
  if v_igralec is not null and length(v_igralec) >= 3 then
    select min(k.id) into v_igralec_id
      from podpora_kandidati(v_igralec, v_liga, 'liga') k
    having count(*) = 1;
  end if;

  insert into prijave_napak (vrsta, opis, igralec, klub, liga, pravilno, kontakt, player_id, competition_id)
  values (v_vrsta, v_opis, v_igralec, v_klub, v_liga, v_pravilno, v_kontakt, v_igralec_id, v_liga_id)
  returning id into v_id;

  return jsonb_build_object('zapisano', true, 'id', v_id,
    'sporocilo', 'Prijava št. ' || v_id || ' je zapisana. Ekipa jo preveri praviloma v nekaj dneh'
      || case when v_kontakt is null then '.' else ' in odgovori na naveden stik.' end);
end;
$$;

-- Admin: prijave, najnovejše prve (privzeto odprte).
create or replace function public.admin_prijave_napak(p_stanje text default 'odprta')
returns table (
  id bigint, vrsta text, opis text, igralec text, klub text, liga text, pravilno text,
  kontakt text, player_id bigint, competition_id bigint, liga_slug text, created_at timestamptz,
  stanje text, reseno_at timestamptz, opomba text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo za administratorje.' using errcode = '42501';
  end if;
  return query
  select p.id, p.vrsta, p.opis, p.igralec, p.klub, p.liga, p.pravilno, p.kontakt,
         p.player_id, p.competition_id, c.slug, p.created_at, p.stanje, p.reseno_at, p.opomba
    from prijave_napak p
    left join competitions c on c.id = p.competition_id
   where p_stanje is null or p.stanje = p_stanje
   order by p.created_at desc
   limit 300;
end;
$$;

-- Admin: zapre prijavo (rešena / zavrnjena) ali jo spet odpre.
create or replace function public.admin_resi_prijavo_napake(p_id bigint, p_stanje text, p_opomba text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo za administratorje.' using errcode = '42501';
  end if;
  update prijave_napak
     set stanje = p_stanje,
         opomba = podpora_besedilo(p_opomba, 300),
         resil = case when p_stanje = 'odprta' then null else auth.uid() end,
         reseno_at = case when p_stanje = 'odprta' then null else now() end
   where id = p_id;
end;
$$;

-- --------------------------------------------------------------------------
-- tocke_igralca(ime, liga)
-- --------------------------------------------------------------------------
-- Točke po krogih tekoče sezone z vsem, iz česar so sestavljene. Skupaj
-- kroga je player_scores (isto kot na strani igralca). Razčlenitev ponovi
-- pravila tocke_za_nastop; če se kdaj razide s skupnim, je ne pokažemo,
-- da agent ne razlaga napačnih številk.
create or replace function public.tocke_igralca(ime text, liga text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  nacin text;
  v_igralec record;
  v_drugi jsonb;
  v_sezona text;
  v_krogi jsonb;
  v_skupaj jsonb;
begin
  foreach nacin in array array['liga', 'vse', 'podobno'] loop
    continue when nacin = 'vse' and (liga is null or trim(liga) = '');
    select k.* into v_igralec from podpora_kandidati(ime, liga, nacin) k limit 1;
    if found then
      select jsonb_agg(k.full_name || ' (' || k.klub || ', ' || k.liga_ime || ')')
        into v_drugi
        from (select * from podpora_kandidati(ime, liga, nacin) offset 1) k;
      exit;
    end if;
  end loop;
  if v_igralec is null then
    return jsonb_build_object('najden', false,
      'opomba', 'Igralca s tem ali podobnim imenom ni. Preveri ime z orodjem najdi_igralca.');
  end if;

  select max(r.season) into v_sezona
    from appearances a
    join matches m on m.id = a.match_id
    join rounds r on r.id = m.round_id
   where a.player_id = v_igralec.id;

  with nastopi as (
    select r.id as round_id, r.number as krog, m.id as match_id, m.played_on,
           case when a.team_id = m.home_team_id then ta.name else th.name end as nasprotnik,
           m.home_goals || ':' || m.away_goals as izid,
           m.statistics_status,
           ap.position, ap.minutes_played as minute, ap.goals, ap.assists,
           ap.cista_mreza, ap.prejeti_na_igriscu as prejeti, ap.zmaga, ap.pravila, ap.points,
           a.yellow_cards, a.red_cards, a.own_goals, a.penalties_saved, a.penalties_missed
      from appearance_points ap
      join appearances a on a.id = ap.appearance_id
      join matches m on m.id = ap.match_id
      join rounds r on r.id = ap.round_id
      join teams th on th.id = m.home_team_id
      join teams ta on ta.id = m.away_team_id
     where ap.player_id = v_igralec.id
       and r.season = v_sezona
  ),
  razclenjeni as (
    select n.*, jsonb_strip_nulls(jsonb_build_object(
             'igranje', case when n.minute <= 0 then 0 when n.minute >= 60 then 2 else 1 end,
             'goli', nullif(n.goals * case n.position when 'GK' then 10 when 'DEF' then 6
                                                     when 'MID' then 5 when 'FWD' then 4 else 0 end, 0),
             'asistence', nullif(n.assists * 3, 0),
             'cista_mreza', nullif(case when n.cista_mreza and n.minute >= 60 then
                 case n.position when 'GK' then 4 + case when n.pravila >= 2 then 1 else 0 end
                                 when 'DEF' then 4 when 'MID' then 1 else 0 end else 0 end, 0),
             'prejeti_goli', nullif(case when n.position in ('GK', 'DEF')
                                         then -floor(coalesce(n.prejeti, 0) / 2.0)::int else 0 end, 0),
             'zmaga', nullif(case when n.pravila >= 2 and n.minute >= 60 and n.zmaga
                                       and n.position in ('GK', 'DEF') then 2 else 0 end, 0),
             'obranjene_11m', nullif(n.penalties_saved * 5, 0),
             'zgresene_11m', nullif(n.penalties_missed * -2, 0),
             'avtogoli', nullif(n.own_goals * -2, 0),
             'rumeni', nullif(-n.yellow_cards, 0),
             'rdeci', nullif(n.red_cards * -3, 0)
           )) as deli
      from nastopi n
  ),
  po_tekmah as (
    select r.*, (select coalesce(sum(v::numeric), 0) from jsonb_each_text(r.deli) d(k, v)) as vsota
      from razclenjeni r
  )
  select jsonb_agg(jsonb_build_object(
           'krog', k.krog,
           'tock_v_krogu', ps.points,
           'tekme', k.tekme
         ) order by k.krog)
    into v_krogi
    from (
      select t.round_id, t.krog, jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'datum', t.played_on,
               'nasprotnik', t.nasprotnik,
               'izid', t.izid,
               'pozicija', t.position,
               'minut', t.minute,
               'golov', t.goals,
               'asistenc', t.assists,
               'cista_mreza', t.cista_mreza and t.minute >= 60,
               'prejetih_na_igriscu', case when t.position in ('GK', 'DEF') then t.prejeti end,
               'rumeni', nullif(t.yellow_cards, 0),
               'rdeci', nullif(t.red_cards, 0),
               'avtogolov', nullif(t.own_goals, 0),
               'tock', t.points,
               'razclenitev', case when t.vsota = t.points then t.deli end,
               'kartoni_cakajo', case when t.statistics_status = 'pending_cards' then true end,
               'povezava', 'https://slff.eu/match/' || t.match_id
             )) order by t.played_on) as tekme
        from po_tekmah t
       group by t.round_id, t.krog
    ) k
    left join player_scores ps on ps.round_id = k.round_id and ps.player_id = v_igralec.id;

  select jsonb_build_object('tock', si.points, 'tekem', si.matches, 'minut', si.minutes,
                            'golov', si.goals, 'asistenc', si.assists, 'cistih_mrez', si.clean_sheets,
                            'rumenih', si.yellow_cards, 'rdecih', si.red_cards)
    into v_skupaj
    from statistika_igralcev si
   where si.player_id = v_igralec.id and si.season = v_sezona
   order by si.points desc
   limit 1;

  return jsonb_strip_nulls(jsonb_build_object(
    'najden', true,
    'iskanje', case when nacin = 'podobno'
      then 'ime ni zapisano natančno, to je najbolj podobno (preveri z uporabnikom)' end,
    'igralec', v_igralec.full_name,
    'klub', v_igralec.klub,
    'liga', v_igralec.liga_ime,
    'pozicija', v_igralec.pozicija,
    'sezona', v_sezona,
    'sezona_skupaj', v_skupaj,
    'krogi', coalesce(v_krogi, '[]'::jsonb),
    'drugi_zadetki', v_drugi,
    'povezava', 'https://slff.eu/player/' || v_igralec.id || '?t=' || v_igralec.slug,
    'opomba', 'Točke šteje trenutna pozicija igralca. Asistenca šteje, ko jo potrdi glasovanje skupnosti; '
           || 'tedaj se točke kroga preračunajo. Kapetan ima v fantasy ekipi točke pomnožene, tu so osnovne.'
  ));
end;
$$;

-- --------------------------------------------------------------------------
-- stanje_tekme(klub, liga, krog)
-- --------------------------------------------------------------------------
-- Ali je zapisnik tekme uvožen, izid, vir in — če ga ni — najverjetnejši
-- razlog. Zraven glasovanje o asistencah: odprto do kdaj, kateri goli še
-- čakajo in koliko glasov ima kdo (teža kot na strani Asistence). Pravila
-- so ista kot v match_assist_status; pogleda ne beremo, ker združuje vse
-- tekme in bi ga planer lahko izračunal v celoti.
-- Brez kroga: zadnji dve tekmi kluba do danes.
create or replace function public.stanje_tekme(klub text, liga text default null, krog int default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with klubi as (
    select t.id from teams t
     where length(trim(coalesce(klub, ''))) >= 3
       and podpora_ujema(t.name || ' ' || coalesce(t.short_name, ''), klub)
  ),
  tekme as (
    select m.*, r.number as krog_st, r.season, r.datum_ocenjen, c.name as liga_ime, c.active as liga_aktivna,
           coalesce(c.vir_ime, f.name) as vir, th.name as doma, ta.name as gost,
           asistence_odprte_do(m.id) as glasovanje_do,
           coalesce(asistence_odprte_do(m.id) > now(), true) as glasovanje_odprto,
           (select count(*) from goals g
             where g.match_id = m.id and not g.is_own_goal and not g.is_penalty
               and g.assist_player_id is null and g.assist_none_confirmed_at is null) as brez_asistence
      from matches m
      join rounds r on r.id = m.round_id
      join competitions c on c.id = r.competition_id
      left join federations f on f.id = c.federation_id
      join teams th on th.id = m.home_team_id
      join teams ta on ta.id = m.away_team_id
     where (m.home_team_id in (select id from klubi) or m.away_team_id in (select id from klubi))
       and c.id in (select podpora_lige(liga))
       and (case when krog is null
                 then m.played_on <= current_date
                 else r.number = krog
                      and r.season = (select max(r2.season) from rounds r2 where r2.competition_id = c.id) end)
     order by c.active desc, m.played_on desc nulls last, m.id desc
     limit case when krog is null then 2 else 4 end
  )
  select jsonb_build_object(
    'najdenih', count(*),
    'tekme', coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'tekma', t.doma || ' – ' || t.gost,
      'liga', t.liga_ime,
      'krog', t.krog_st,
      'datum', t.played_on,
      'datum_ocenjen', case when t.datum_ocenjen then true end,
      'izid', case when t.imported_at is not null or t.kontumacija
                   then t.home_goals || ':' || t.away_goals end,
      'zapisnik_uvozen', t.imported_at is not null,
      'uvozeno', t.imported_at,
      'vir', t.vir,
      'vir_povezava', t.source_url,
      'stanje', case
        when t.kontumacija then 'brez borbe (izid dodeljen, zapisnika ni)'
        when t.statistics_status = 'pending_cards' then 'zapisnik uvožen, kartoni čakajo na potrditev skupnosti; točke kroga se zaključijo potem'
        when t.statistics_status = 'unavailable_historical' then 'izid je znan, statistike igralcev vir ni objavil v uporabni obliki'
        when t.imported_at is not null then 'zapisnik uvožen, točke so štete'
        when t.played_on is null then 'datum tekme ni znan (vir ga ni objavil ali je tekma prestavljena)'
        when t.played_on > current_date then 'še ni odigrana'
        when t.played_on >= current_date - 3 then 'odigrana, zapisnik še ni objavljen ali uvožen (običajno v 1–3 dneh)'
        else 'odigrana pred več kot 3 dnevi, zapisnika še ni: verjetno prestavljena ali ga zveza ni objavila'
      end,
      'datum_je_ocena', case when t.datum_ocenjen and t.imported_at is null
                             then 'datum je ocena iz razporeda kroga, ne uradni termin' end,
      'opozorila_vira', case when cardinality(t.import_warnings) > 0 then to_jsonb(t.import_warnings[1:3]) end,
      'glasovanje_asistenc', case when t.imported_at is not null and t.statistics_status = 'available' then
        jsonb_strip_nulls(jsonb_build_object(
          'odprto', t.glasovanje_odprto,
          'odprto_do', t.glasovanje_do,
          'golov_brez_odlocitve', t.brez_asistence,
          'potrebnih_glasov', nastavitev_int_za('prag_glasov_asistenca', (select r.competition_id from rounds r where r.id = t.round_id), 3),
          'goli', (
            select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                     'minuta', g.minute,
                     'strelec', coalesce(sp.full_name, case when g.is_own_goal then 'avtogol' end),
                     'asistenca', case
                       when g.is_own_goal or g.is_penalty then 'ne šteje (avtogol ali 11 m)'
                       when g.assist_player_id is not null then 'potrjena: ' || ap.full_name
                       when g.assist_none_confirmed_at is not null then 'potrjeno: brez asistence'
                       else 'glasovanje teče' end,
                     'glasovi', case when g.assist_player_id is null and g.assist_none_confirmed_at is null
                                      and not g.is_own_goal and not g.is_penalty then (
                       select jsonb_object_agg(coalesce(vp.full_name, 'nihče'), vc.votes)
                         from assist_vote_counts vc
                         left join players vp on vp.id = vc.player_id
                        where vc.goal_id = g.id) end,
                     'glasov_skupaj', case when g.assist_player_id is null and g.assist_none_confirmed_at is null
                                      and not g.is_own_goal and not g.is_penalty then (
                       select coalesce(sum(vc.votes), 0) from assist_vote_counts vc where vc.goal_id = g.id) end
                   )) order by g.minute nulls last, g.id)
              from goals g
              left join players sp on sp.id = g.scorer_id
              left join players ap on ap.id = g.assist_player_id
             where g.match_id = t.id)
        )) end,
      'povezava', 'https://slff.eu/match/' || t.id
    )) order by t.played_on desc nulls last), '[]'::jsonb),
    'opomba', case when count(*) = 0 then
      'Tekme ni: preveri ime kluba in ligo (orodje tekme_kluba). Številka kroga je iz tekoče sezone.'
      else 'Zapisnike uvažamo večkrat na dan (ob vikendih vsako uro). Glasovanje o asistenci se zapre z rokom naslednjega kroga; asistenca se potrdi, ko ena izbira doseže potrebno število glasov.' end
  )
  from tekme t
$$;

-- --------------------------------------------------------------------------
-- zahtevaj_ligo(liga, drzava, kontakt, vztrajam)
-- --------------------------------------------------------------------------
-- Najprej poišče ligo med vsemi vpisanimi (tudi nevklopljenimi): pogosto
-- obstaja pod drugim imenom ali je uvožena in čaka na vklop. Želja se
-- zapiše v zelje_lig (ista kot gumb "Moje lige ni", admin jo vidi v Željah
-- lig in ob vklopu gre mail) šele, ko ni zadetka ali uporabnik vztraja.
-- Obvestilo potrebuje e-naslov; meje so tiste iz zelim_ligo.
create or replace function public.zahtevaj_ligo(
  liga text,
  drzava text default null,
  kontakt text default null,
  vztrajam boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_liga text := podpora_besedilo(liga, 120);
  v_drzava text := podpora_besedilo(drzava, 60);
  v_email text := lower(podpora_besedilo(kontakt, 254));
  v_s text;
  v_filter text;
  v_zadetki jsonb;
  v_vezana bigint;
  v_id bigint;
begin
  if v_liga is null or length(v_liga) < 2 then
    return jsonb_build_object('zapisano', false, 'sporocilo', 'Manjka ime lige.');
  end if;
  v_s := podpora_brez_sumnikov(v_liga);

  -- Najprej v navedeni državi; če tam ni nič (država zapisana po svoje,
  -- "Croatia" proti "Hrvatska"), še povsod.
  foreach v_filter in array array[v_drzava, null] loop
  with kandidati as (
    select c.id, c.slug, c.name, c.active, c.country_code, c.country_name,
           coalesce(c.vir_ime, c.federation_name) as vir,
           extensions.similarity(podpora_brez_sumnikov(c.name || ' ' || coalesce(c.short_name, '')), v_s) as podobnost,
           podpora_ujema(c.name || ' ' || coalesce(c.short_name, '') || ' ' || coalesce(c.federation_name, '')
                         || ' ' || coalesce(c.country_name, ''), v_liga) as natancno
      from competitions_view c
     where v_filter is null
        or upper(c.country_code) = upper(v_filter)
        or podpora_ujema(c.country_name, v_filter)
  ),
  zadetki as (
    select k.*,
           exists (select 1 from rounds r join matches m on m.round_id = r.id
                    where r.competition_id = k.id and m.imported_at is not null) as uvozena
      from kandidati k
     where k.natancno or k.podobnost >= 0.35
     order by k.natancno desc, k.active desc, k.podobnost desc
     limit 8
  )
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'liga', z.name,
           'drzava', z.country_name,
           'stanje', case
             when z.active then 'v živo: igra se v SLFF'
             when z.uvozena then 'vpisana in uvožena, še ni vklopljena (vklop sledi, ko so podatki preverjeni)'
             else 'vpisana, podatkov še ni (vir še ni dostopen ali čaka na dovoljenje)' end,
           'v_zivo', z.active,
           'vir', z.vir,
           'povezava', case when z.active then 'https://slff.eu/standings?t=' || z.slug end,
           '_id', z.id
         )) order by z.natancno desc, z.active desc, z.podobnost desc)
    into v_zadetki
    from zadetki z;
  exit when v_zadetki is not null or v_filter is null;
  end loop;

  if v_zadetki is not null and not coalesce(vztrajam, false) then
    return jsonb_build_object(
      'zapisano', false,
      'zadetki', (select jsonb_agg(e - '_id') from jsonb_array_elements(v_zadetki) e),
      'sporocilo', 'Podobne lige že obstajajo. Če je ena od njih prava in je v živo, uporabnika usmeri nanjo. '
                || 'Če je prava, a še ni vklopljena, ali če nobena ni prava, pokliči znova z vztrajam=true '
                || 'in e-naslovom: zapišemo željo in javimo, ko liga zaživi.');
  end if;

  if v_email is null or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object(
      'zapisano', false,
      'zadetki', coalesce((select jsonb_agg(e - '_id') from jsonb_array_elements(v_zadetki) e), '[]'),
      'potrebujem', 'email',
      'sporocilo', 'Za obvestilo, ko liga zaživi, potrebujem uporabnikov e-naslov. Vprašaj zanj in pokliči znova.');
  end if;

  -- Edini zadetek, ki še ni v živo: želja se veže nanj (mail ob vklopu).
  if jsonb_array_length(coalesce(v_zadetki, '[]')) = 1 and not (v_zadetki -> 0 ->> 'v_zivo')::boolean then
    v_vezana := (v_zadetki -> 0 ->> '_id')::bigint;
  end if;
  if v_drzava is null and v_vezana is not null then
    select country_code into v_drzava from competitions_view where id = v_vezana;
  end if;
  if v_drzava is null or length(v_drzava) < 2 then
    return jsonb_build_object('zapisano', false, 'potrebujem', 'drzava',
      'sporocilo', 'Za katero državo gre? Pokliči znova z državo.');
  end if;

  begin
    perform zelim_ligo(v_drzava, v_liga, v_vezana, v_email, null);
  exception when raise_exception then
    return jsonb_build_object('zapisano', false, 'omejitev', sqlerrm = 'Preveč želja.',
      'sporocilo', case when sqlerrm = 'Preveč želja.'
        then 'Danes je s tega naslova že dovolj želja. Naj poskusi jutri.'
        else 'Želje ni bilo mogoče zapisati: ' || sqlerrm end);
  end;

  select z.id into v_id
    from zelje_lig z
   where z.email = v_email and z.obvescen_at is null
   order by z.created_at desc, z.id desc
   limit 1;

  return jsonb_build_object('zapisano', v_id is not null, 'id', v_id,
    'sporocilo', 'Želja je zapisana. Ko liga zaživi, gre na ' || v_email || ' enkratno obvestilo. '
              || 'Vrstni red vklopov je odvisen od dostopa do uradnih zapisnikov; roka ne obljubljaj.');
end;
$$;

revoke all on function public.podpora_besedilo(text, int) from public, anon, authenticated;
revoke all on function public.prijavi_napako(text, text, text, text, text, text, text) from public;
revoke all on function public.admin_prijave_napak(text) from public, anon;
revoke all on function public.admin_resi_prijavo_napake(bigint, text, text) from public, anon;
revoke all on function public.tocke_igralca(text, text) from public;
revoke all on function public.stanje_tekme(text, text, int) from public;
revoke all on function public.zahtevaj_ligo(text, text, text, boolean) from public;

grant execute on function public.prijavi_napako(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_prijave_napak(text) to authenticated;
grant execute on function public.admin_resi_prijavo_napake(bigint, text, text) to authenticated;
grant execute on function public.tocke_igralca(text, text) to anon, authenticated;
grant execute on function public.stanje_tekme(text, text, int) to anon, authenticated;
grant execute on function public.zahtevaj_ligo(text, text, text, boolean) to anon, authenticated;

-- 12 mesecev: stare prijave (s stiki) gredo proč.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'prijave-napak-pocisti',
    '43 4 * * *',
    $urnik$delete from public.prijave_napak where created_at < now() - interval '12 months'$urnik$
  );
exception
  when others then
    raise notice 'pg_cron ni na voljo (%) — stare prijave napak je treba počistiti ročno', sqlerrm;
end;
$$;
