-- Varnostni popravki po pregledu.
--
-- Vsaka tocka spodaj je samostojna in pove, kaj je bilo odprto. Funkcije so
-- prepisane v celoti iz zadnje razlicice; spremenjene vrstice so oznacene
-- s komentarjem.


-- === 1. Pisanje prek pogledov in privzete pravice ==========================
--
-- `klepet_sporocila` je preprost pogled nad eno tabelo, zato ga Postgres
-- samodejno dovoli posodabljati — in ker tece s pravicami lastnika, RLS na
-- `chat_messages` pri tem ne velja. Privzete pravice iz 20260828100000 so
-- vlogama `anon` in `authenticated` dale ALL na vse nove tabele IN poglede,
-- torej je lahko anonimni kljuc prek pogleda spremenil ali izbrisal vsako
-- sporocilo v klepetu.
revoke insert, update, delete, truncate on public.klepet_sporocila
  from anon, authenticated;

-- Isto za vsak drug pogled, ki bi to lastnost dobil: samodejno posodobljiv
-- in brez `security_invoker` pomeni pisanje mimo RLS. Poglede s
-- `security_invoker` varuje RLS tabele pod njimi, zato jih pustimo.
do $$
declare v record;
begin
  for v in
    select c.oid::regclass as pogled
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'v'
       and pg_relation_is_updatable(c.oid, false) > 0
       and not coalesce(c.reloptions @> array['security_invoker=on']
                        or c.reloptions @> array['security_invoker=true'], false)
  loop
    execute format('revoke insert, update, delete, truncate on %s from anon, authenticated',
                   v.pogled);
  end loop;
end $$;

-- Nove tabele in pogledi odslej ne dobijo pisanja samodejno. Obstojece
-- pravice ostanejo, kot so (sprememba privzetih velja le za nove objekte) —
-- tabele, v katere vmesnik pise neposredno (chat_messages, fantasy_teams,
-- fantasy_chips, profiles, assist_votes, position_votes, player_reports,
-- sponsors, settings, competitions, competition_settings, players), jih
-- imajo ze od prej in jih varuje RLS. Nova tabela, v katero pise vmesnik,
-- potrebuje izrecen `grant insert/update/delete`.
alter default privileges in schema public
  revoke insert, update, delete, truncate on tables from anon, authenticated;


-- === 2. V zasebno mini ligo samo s kodo ====================================
--
-- Politika "pridruzi svojo ekipo" je preverjala le, da je ekipa tvoja — ne
-- pa, da poznas kodo. Kdor je uganil `mini_liga_id` (zaporedna stevilka), se
-- je vpisal v katerokoli zasebno mini ligo z navadnim INSERT prek PostgREST.
-- Vstop gre odslej samo skozi `pridruzi_mini_ligi` (preveri kodo) in
-- `ustvari_mini_ligo` (ustvarjalec je clan); obe sta SECURITY DEFINER in
-- pravic tabele ne potrebujeta. Izstop in odstranitev clana ostaneta.
drop policy if exists "pridruzi svojo ekipo" on public.mini_liga_clani;
revoke insert, update, truncate on public.mini_liga_clani from anon, authenticated;


-- === 3. Pripadnost mini ligi tudi za anonimne ==============================
--
-- `sem_v_mini_ligi` stoji v politikah `mini_lige` in `mini_liga_clani`, ki ju
-- prek `mini_liga_lestvica` bere tudi `anon`. Brez pravice izvajanja je
-- anonimni bralec dobil napako namesto prazne lestvice. Brez `auth.uid()`
-- funkcija vrne false.
grant execute on function public.sem_v_mini_ligi(bigint) to anon;


-- === 4. Razlog neveljavne ekipe samo za lastnika ===========================
--
-- Funkcija je SECURITY DEFINER in je bila odprta vsem prijavljenim, zato je
-- vsak lahko za tujo ekipo izvedel, koga ima v kadru (imena neaktivnih,
-- klub s prevec igralci, razporeditev po pozicijah). Odslej jo sme klicati
-- lastnik ekipe, administrator ali servis — za zadnjega velja isti preizkus
-- kot v `preveri_rok_pripomocka`. `kandidati_za_opozorilo` tece kot servis.
create or replace function public.razlog_neveljavne_ekipe(p_team_id bigint)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Novo: varovalka pred branjem tujega kadra.
  if not (
       exists (select 1 from fantasy_teams where id = p_team_id and owner_id = auth.uid())
       or is_admin()
       or (auth.uid() is null
           and (current_setting('role', true) = 'service_role'
                or (current_setting('role', true) in ('none', 'postgres', 'supabase_admin')
                    and session_user in ('postgres', 'supabase_admin'))))
     ) then
    raise insufficient_privilege using message =
      'Razlog lahko vidi samo lastnik ekipe.';
  end if;

  return (
  with kader as (
    select fr.*, coalesce(fr.buy_position, p.position) as poz,
           p.team_id as klub_id, p.active, p.full_name
      from fantasy_roster fr
      join players p on p.id = fr.player_id
     where fr.fantasy_team_id = p_team_id
  ),
  n as (
    select
      count(*) as skupaj,
      count(*) filter (where is_starter) as zacetnikov,
      count(*) filter (where is_captain) as kapetanov,
      count(*) filter (where is_vice) as namestnikov,
      count(*) filter (where poz is null) as brez_poz,
      count(*) filter (where not active) as neaktivnih,
      count(*) filter (where poz = 'GK') as gk,
      count(*) filter (where poz = 'DEF') as def,
      count(*) filter (where poz = 'MID') as mid,
      count(*) filter (where poz = 'FWD') as fwd,
      (select string_agg(full_name, ', ') from kader where not active) as imena
      from kader
  ),
  klub as (
    select (select t.name from teams t where t.id = k.klub_id) as ime, k.cnt
      from (select klub_id, count(*) as cnt from kader group by klub_id) k
     where k.cnt > 3
     order by k.cnt desc
     limit 1
  )
  select case
    when n.skupaj = 0 then 'Ekipa je prazna — kadra ni.'
    when n.skupaj <> 15 then
      'V kadru je ' || n.skupaj || ' igralcev namesto 15.'
    when n.neaktivnih > 0 then
      'V kadru ni vec aktivnih igralcev: ' || coalesce(n.imena, '') ||
      '. Klub letos ne igra ali je igralec odsel.'
    when (select ime from klub) is not null then
      'Iz kluba ' || (select ime from klub) || ' imas ' ||
      (select cnt from klub) || ' igralce, dovoljeni so 3. ' ||
      'To se zgodi tudi brez tvoje spremembe — ce igralec med sezono prestopi v klub, ' ||
      'iz katerega jih ze imas.'
    when n.brez_poz > 0 then
      'Pri ' || n.brez_poz || ' igralcih ni znana pozicija.'
    when n.gk <> 2 or n.def <> 5 or n.mid <> 5 or n.fwd <> 3 then
      'Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ' ||
      'ima ' || n.gk || '-' || n.def || '-' || n.mid || '-' || n.fwd || '.'
    when n.zacetnikov <> 11 then
      'V postavi je ' || n.zacetnikov || ' igralcev namesto 11.'
    when n.kapetanov <> 1 then 'Ekipa nima natanko enega kapetana.'
    when n.namestnikov <> 1 then 'Ekipa nima natanko enega namestnika kapetana.'
    else null
  end
  from n
  );
end;
$$;

comment on function public.razlog_neveljavne_ekipe(bigint) is
  'Zakaj se kader ne bo zaklenil, v slovenscini. NULL pomeni, da je vse v redu. '
  'Samo lastnik ekipe, administrator ali servis.';

revoke all on function public.razlog_neveljavne_ekipe(bigint) from public;
grant execute on function public.razlog_neveljavne_ekipe(bigint) to authenticated;


-- === 5. Odhod igralca ne tik pred rokom ====================================
--
-- (a) Oznaka odhoda naredi igralca neaktivnega, s tem pa kader vseh, ki ga
--     imajo, neveljaven. Zadnji dan pred rokom lastniki tega ne opazijo vec
--     pravocasno in ekipa ostane brez tock — ali pa poznavalec to izkoristi
--     proti tekmecem. Zato 24 ur pred rokom in do zaklepa kroga ne gre.
--     Okno "roka, ki je potekel" je omejeno na 7 dni kot pri
--     `zakleni_zapadle_kroge`, da star, nikoli zaklenjen krog ne zapre
--     oznacevanja za vedno. Administrator je izvzet.
-- (b) Preklic (`p_odsel = false`) vrne med aktivne samo igralca, ki ga je
--     oznacil clovek. Igralca, ki ga je deaktiviral uvoz (klub zunaj lige),
--     ne sme obuditi.
create or replace function public.oznaci_odhod_igralca(p_player_id bigint, p_odsel boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competition_id bigint;
begin
  select competition_id into v_competition_id from players where id = p_player_id;
  if v_competition_id is null then
    raise exception 'Igralec ne obstaja.';
  end if;
  if not je_poznavalec_lige(v_competition_id) then
    raise insufficient_privilege using message =
      'Odhod igralca lahko oznaci samo poznavalec te lige ali administrator.';
  end if;

  -- Novo: ne v zadnjih 24 urah pred rokom in ne med rokom in zaklepom.
  if not is_admin() and exists (
       select 1
         from rounds r
         join competitions c on c.id = r.competition_id
        where r.competition_id = v_competition_id
          and r.lineups_locked_at is null
          and r.deadline_at is not null
          and r.number >= coalesce(c.prvi_fantasy_krog, 1)
          and r.deadline_at <= now() + interval '24 hours'
          and r.deadline_at > now() - interval '7 days'
     ) then
    raise insufficient_privilege using message =
      'Odhod lahko označiš najkasneje 24 ur pred rokom kroga.';
  end if;

  update players
     set active   = not p_odsel,
         odsel_at = case when p_odsel then now() else null end,
         odsel_by = case when p_odsel then auth.uid() else null end
   where id = p_player_id
     -- Novo: preklic obudi samo tistega, ki ga je oznacil clovek.
     and (p_odsel or odsel_at is not null);
end;
$$;
grant execute on function public.oznaci_odhod_igralca(bigint, boolean) to authenticated;


-- === 6. Stevci sponzorjev ==================================================
--
-- `zabelezi_sponzorja` je odprt anonimnim in je stel vsak klic za aktivnega
-- sponzorja — tudi ko sponzorji se niso vidni, izven obdobja pogodbe ali v
-- ligi, v kateri se sponzor sploh ne prikaze. Stevilke za sponzorja so s tem
-- poljubne. Odslej se steje le, kar bi `sponzorji_za` res pokazal.
--
-- Primarni kljuc je vseboval `competition_id`, ki je po tuji kljucu
-- `on delete set null` — PK stolpec pa ne sme biti NULL, zato bi izbris lige
-- padel, klic brez lige pa tudi. Kljuc je zdaj nadomestni, enolicnost dneva
-- pa drzi indeks z `coalesce`.
alter table public.sponsor_stats drop constraint if exists sponsor_stats_pkey;
alter table public.sponsor_stats
  add column if not exists id bigint generated always as identity primary key;
alter table public.sponsor_stats alter column competition_id drop not null;
create unique index if not exists sponsor_stats_dan_idx
  on public.sponsor_stats (sponsor_id, dan, coalesce(competition_id, 0));

create or replace function public.zabelezi_sponzorja(
  p_sponsor_id bigint,
  p_competition_id bigint default null,
  p_klik boolean default false
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into sponsor_stats (sponsor_id, dan, competition_id, prikazov, klikov)
  select p_sponsor_id, current_date, p_competition_id,
         case when p_klik then 0 else 1 end,
         case when p_klik then 1 else 0 end
   where case
           -- V ligi: isti izbor kot prikaz (vidnost, aktivnost, obdobje, doseg).
           when p_competition_id is not null then
             exists (select 1 from sponzorji_za(p_competition_id) z where z.id = p_sponsor_id)
           -- Brez lige steje le sponzor brez dosega (za vse).
           else
             coalesce(nastavitev_int('sponzorji_vidni', 0), 0) = 1
             and exists (
               select 1 from sponsors s
                where s.id = p_sponsor_id
                  and s.active
                  and (s.starts_on is null or s.starts_on <= current_date)
                  and (s.ends_on is null or s.ends_on >= current_date)
                  and s.competition_id is null
                  and s.federation_id is null
                  and s.country_id is null)
         end
  on conflict (sponsor_id, dan, (coalesce(competition_id, 0))) do update
     set prikazov = sponsor_stats.prikazov + excluded.prikazov,
         klikov   = sponsor_stats.klikov   + excluded.klikov;
$$;

revoke all on function public.zabelezi_sponzorja(bigint, bigint, boolean) from public;
grant execute on function public.zabelezi_sponzorja(bigint, bigint, boolean) to anon, authenticated;


-- === 7. Pripomocek enkrat na sezono, ne enkrat za vedno ====================
--
-- Kljuc (ekipa, pripomocek) je pomenil, da se Klop+ in wildcard porabita
-- enkrat za vse sezone, vmesnik pa obljublja "enkrat na sezono". Sezona se
-- izpelje iz kroga; vpisuje jo sprozilec, zato je vmesnik ne posilja in je
-- ne more ponarediti. Privzeta '' je le zato, da vpis brez sezone prestane
-- tipe — sprozilec jo vedno prepise pred preverjanjem omejitev.
alter table public.fantasy_chips
  add column if not exists season text not null default '';

-- Rok pripomocka (20260913100000) zavrne vsak UPDATE po roku kroga. Sprememba
-- samo stolpca `season` ni vsebinska — sezono vedno znova izpelje sprozilec
-- iz kroga — zato jo pusti skozi. Brez tega zapolnitev spodaj pade na vsakem
-- ze odigranem pripomocku: `db push` ne tece kot seja postgres, zato skrbniski
-- izhod na vrhu funkcije zanj ne velja. Ostalo je nespremenjeno.
create or replace function public.preveri_rok_pripomocka()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ekipa bigint;
  v_tekmovanje bigint;
  v_krog rounds;
begin
  -- Servisni uvozi in izrecni skrbniski popravki prek SQL ostanejo mogoci.
  if current_setting('role', true) = 'service_role'
     or (current_setting('role', true) in ('none', 'postgres', 'supabase_admin')
         and session_user in ('postgres', 'supabase_admin')) then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  -- Novo: spremenila se je le izpeljana sezona.
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'season') = (to_jsonb(old) - 'season') then
    return new;
  end if;

  if tg_op = 'UPDATE' and
     (new.fantasy_team_id <> old.fantasy_team_id or new.chip <> old.chip) then
    raise exception 'Vrste pripomocka in ekipe ni mogoce spreminjati.' using errcode = '42501';
  end if;
  v_ekipa := case when tg_op = 'DELETE' then old.fantasy_team_id else new.fantasy_team_id end;
  select competition_id into v_tekmovanje from fantasy_teams where id = v_ekipa;
  perform pg_advisory_xact_lock(hashtextextended('slff-kader:' || v_tekmovanje, 0));

  if tg_op in ('UPDATE', 'DELETE') then
    select * into v_krog from rounds where id = old.round_id;
    if v_krog.deadline_at is null or v_krog.deadline_at <= clock_timestamp()
       or v_krog.lineups_locked_at is not null then
      raise exception 'Rok kroga je potekel — pripomocka ni vec mogoce spreminjati.'
        using errcode = '42501';
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select * into v_krog from rounds where id = new.round_id;
    if not found or v_krog.competition_id is distinct from v_tekmovanje
       or v_krog.deadline_at is null or v_krog.deadline_at <= clock_timestamp()
       or v_krog.lineups_locked_at is not null then
      raise exception 'Izberi prihodnji krog iste lige z dolocenim rokom.'
        using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function public.preveri_rok_pripomocka() from public, anon, authenticated;

update public.fantasy_chips fc
   set season = r.season
  from public.rounds r
 where r.id = fc.round_id
   and fc.season is distinct from r.season;

create or replace function public.pripomocek_sezona()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select season into new.season from rounds where id = new.round_id;
  return new;
end;
$$;
revoke all on function public.pripomocek_sezona() from public;

drop trigger if exists fantasy_chips_sezona on public.fantasy_chips;
create trigger fantasy_chips_sezona
  before insert or update of round_id, season on public.fantasy_chips
  for each row execute function public.pripomocek_sezona();

alter table public.fantasy_chips drop constraint if exists fantasy_chips_pkey;
alter table public.fantasy_chips
  add constraint fantasy_chips_pkey primary key (fantasy_team_id, chip, season);

comment on column public.fantasy_chips.season is
  'Sezona kroga, v katerega je pripomocek vlozen. Vsak pripomocek enkrat na sezono.';


-- === 8. Prosnja za poznavalca ==============================================
--
-- (a) Discord: ime in sporocilo pise uporabnik, zato bi `@everyone` v
--     sporocilu poklical ves streznik. `allowed_mentions` izklopi vse omembe.
-- (b) Klub mora igrati v ligi, za katero prosnja je; sicer bi odobritev
--     "klub" dala trojni glas za klub iz druge lige.
-- (c) Po zavrnitvi 14 dni nove prosnje za isto ligo — sicer je zavrnitev
--     le povabilo, da poskusis znova in spet zazvonis na Discordu.
create or replace function public.trg_prosnja_na_discord()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_kdo text;
  v_klub text;
  v_liga text;
  v_vloga text;
  v_besedilo text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'discord_webhook' limit 1;
  if v_url is null then
    return new;
  end if;

  select coalesce(display_name, 'neznan') into v_kdo from profiles where id = new.user_id;
  select name into v_klub from teams where id = new.team_id;
  select name into v_liga from competitions where id = new.competition_id;
  v_vloga := case new.vloga
    when 'igralec' then 'igralec' when 'trener' then 'trener/štab'
    when 'vodstvo' then 'vodstvo kluba' else 'navijač' end;

  v_besedilo :=
    '🙋 **Nova prošnja za poznavalca**' || E'\n' ||
    v_kdo || ' · ' || v_vloga || ' · ' || coalesce(v_klub, 'brez kluba') || ' · ' || coalesce(v_liga, '') ||
    case when new.sporocilo is not null then E'\n> ' || left(new.sporocilo, 300) else '' end ||
    E'\n' || 'https://slff.eu/admin';

  perform net.http_post(
    url := v_url,
    -- Novo: brez omemb — besedilo je uporabnikovo.
    body := jsonb_build_object(
      'content', v_besedilo,
      'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb)
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  -- Obvestilo ni razlog, da bi prosnja padla.
  return new;
end;
$$;

create or replace function public.zaprosi_za_poznavalca(
  p_competition_id bigint,
  p_team_id bigint,
  p_vloga text,
  p_sporocilo text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Za prosnjo se je treba prijaviti.';
  end if;
  if exists (select 1 from profiles where id = auth.uid() and insider_competition_id = p_competition_id) then
    raise exception 'Ze si poznavalec te lige.';
  end if;
  -- Novo: klub mora igrati v tej ligi.
  if p_team_id is not null and not exists (
       select 1 from players where competition_id = p_competition_id and team_id = p_team_id
     ) then
    raise exception 'Izbrani klub ne igra v tej ligi.';
  end if;
  if exists (select 1 from poznavalec_prosnje
              where user_id = auth.uid() and competition_id = p_competition_id and status = 'caka') then
    raise exception 'Tvoja prosnja za to ligo ze caka.';
  end if;
  -- Novo: po zavrnitvi 14 dni premora.
  if exists (select 1 from poznavalec_prosnje
              where user_id = auth.uid() and competition_id = p_competition_id
                and status = 'zavrnjeno' and decided_at > now() - interval '14 days') then
    raise exception 'Prošnja za to ligo je bila nedavno zavrnjena. Novo lahko oddaš 14 dni po zavrnitvi.';
  end if;
  insert into poznavalec_prosnje (user_id, competition_id, team_id, vloga, sporocilo)
  values (auth.uid(), p_competition_id, p_team_id, p_vloga, nullif(btrim(p_sporocilo), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.zaprosi_za_poznavalca(bigint, bigint, text, text) from public;
grant execute on function public.zaprosi_za_poznavalca(bigint, bigint, text, text) to authenticated;


-- === 10. Odjava od opomnikov ===============================================
--
-- Opomnik in opozorilo sta posta, ki je uporabnik ni narocil. Kdor je noce,
-- mora imeti gumb, ne le "ignoriraj ta mail". Lastnik stolpec ureja sam na
-- strani /opomniki; politika "posodobi svoj profil" ze omeji na svojo vrstico.
alter table public.profiles
  add column if not exists brez_opomnikov boolean not null default false;

comment on column public.profiles.brez_opomnikov is
  'Uporabnik ne zeli opomnikov in opozoril po e-posti (stran /opomniki).';

grant update (brez_opomnikov) on public.profiles to authenticated;


-- === 9. + 10. Komu gre opozorilo ===========================================
--
-- `zakleni_krog` kader preveri sele od kroga
-- greatest(strogi_zaklep_od_kroga, prvi_fantasy_krog + 1) naprej — prej
-- posname tudi nepopoln kader (v_uporabi_v). Opozorilo "tvoja ekipa se ne bo
-- zaklenila" je bilo v prvem fantasy krogu zato napacno: zaklenila bi se.
-- Pravilo je prepisano natanko od tam. Izpusti tudi odjavljene.
create or replace function public.kandidati_za_opozorilo(
  p_competition_id bigint,
  p_dni int default 2
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  team_id bigint,
  team_name text,
  round_id bigint,
  round_number int,
  deadline_at timestamptz,
  razlog text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_krog bigint;
  v_stevilka int;
  v_rok timestamptz;
begin
  select r.id, r.number, r.deadline_at
    into v_krog, v_stevilka, v_rok
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.competition_id = p_competition_id
     and r.lineups_locked_at is null
     and r.deadline_at is not null
     and r.deadline_at > now()
     and r.deadline_at <= now() + make_interval(days => p_dni)
     -- Novo: samo krogi, v katerih zaklep kader res preveri (kot v_uporabi_v).
     and r.number >= greatest(nastavitev_int('strogi_zaklep_od_kroga', 2),
                              coalesce(c.prvi_fantasy_krog, 1) + 1)
   order by r.deadline_at
   limit 1;

  if v_krog is null then
    return;
  end if;

  return query
  select u.id,
         u.email::text,
         pr.display_name,
         ft.id,
         ft.name,
         v_krog,
         v_stevilka,
         v_rok,
         razlog_neveljavne_ekipe(ft.id)
    from fantasy_teams ft
    join auth.users u on u.id = ft.owner_id
    left join profiles pr on pr.id = u.id
   where ft.competition_id = p_competition_id
     and u.email is not null
     -- Novo: odjavljeni od opomnikov.
     and not coalesce(pr.brez_opomnikov, false)
     -- Ekipo mora imeti. Prazen osnutek ni "skoraj dobra ekipa" in sporocilo
     -- "ne bo se zaklenila" mu nic ne pove.
     and exists (select 1 from fantasy_roster fr where fr.fantasy_team_id = ft.id)
     and not roster_je_veljaven(ft.id)
     -- Enkrat, dokler ni popravljeno: ce obstaja ze poslano opozorilo, po
     -- katerem se ekipa ni nikoli zaklenila, drugega ne posiljamo.
     and not exists (
       select 1
         from email_log el
        where el.user_id = u.id
          and el.competition_id = p_competition_id
          and el.vrsta = 'opozorilo-postava'
          and el.napaka is null
          and not exists (
            select 1
              from fantasy_lineups fl
              join rounds r2 on r2.id = fl.round_id
             where fl.fantasy_team_id = ft.id
               and r2.lineups_locked_at > el.poslano_at
          )
     );
end $$;

comment on function public.kandidati_za_opozorilo(bigint, int) is
  'Lastniki ekip, ki imajo kader, a se ne bo zaklenil ob roku v naslednjih p_dni dneh. '
  'Samo krogi s strogim zaklepom; brez odjavljenih. Enkrat na tezavo: naslednje '
  'opozorilo sele, ko se ekipa vmes spet zaklene.';

revoke all on function public.kandidati_za_opozorilo(bigint, int) from public, anon, authenticated;

create or replace function public.kandidati_za_opomnik(p_competition_id bigint)
returns table (user_id uuid, email text, display_name text, team_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_privzeta bigint;
begin
  select c.id into v_privzeta
    from competitions c
    left join fantasy_teams ft on ft.competition_id = c.id
   where c.active
   group by c.id, c.sort_order
   order by count(ft.id) desc, c.sort_order, c.id
   limit 1;

  return query
  with brez as (
    select u.id, u.email::text as email, p.display_name
      from auth.users u
      left join profiles p on p.id = u.id
     where u.email is not null
       -- Novo: odjavljeni od opomnikov.
       and not coalesce(p.brez_opomnikov, false)
       and not exists (
         select 1 from fantasy_teams ft
          where ft.owner_id = u.id and coalesce(roster_je_veljaven(ft.id), false))
  ),
  domaca as (
    select b.id, b.email, b.display_name,
           coalesce(
             (select ft.competition_id from fantasy_teams ft
               join competitions c on c.id = ft.competition_id and c.active
              where ft.owner_id = b.id order by ft.created_at limit 1),
             v_privzeta
           ) as liga,
           (select ft.id from fantasy_teams ft
             where ft.owner_id = b.id order by ft.created_at limit 1) as ekipa
      from brez b
  )
  select d.id, d.email, d.display_name, d.ekipa
    from domaca d
   where d.liga = p_competition_id;
end $$;

revoke all on function public.kandidati_za_opomnik(bigint) from public, anon, authenticated;
