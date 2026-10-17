-- Pravice tabel in pogledov po selitvi baze na Hetzner.
--
-- Obnova baze (6. 10. 2026) je tabelam in pogledom v shemi public vrnila
-- privzete pravice slike Supabase: anon in authenticated sta spet dobila
-- INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER in MAINTAIN skoraj
-- povsod. Isto kot pri funkcijah (20261012123100): REVOKE-i iz migracij v
-- izvozu niso preživeli. Odprto je bilo (preverjeno na kopiji baze z enakimi
-- pravicami):
--   - profiles: tabelna UPDATE pravica; politika "posodobi svoj profil"
--     preverja le lastništvo vrstice, zato si je prijavljeni lahko nastavil
--     is_admin = true (20260913100000 je to zaprla s pravicami na stolpce);
--   - fantasy_teams: lastnik je lahko neposredno spreminjal budget, cash …;
--   - klepet_sporocila: preprost pogled teče s pravicami lastnika, zato je
--     anonimni ključ prek njega spremenil ali izbrisal vsako sporočilo
--     (20260923090000 je to že enkrat zaprla);
--   - player_season_stats: isti vzorec nad statistika_igralcev; ta je odprt
--     tudi na sveži bazi (create or replace view je obdržal pravice starega
--     pogleda), zato pisanje odvzamemo vsem pogledom, ne le temu.
--
-- Kaj ostane: SELECT povsod, kjer je bil; pisanje vloge authenticated v
-- tabelah, kjer ga dovoli politika RLS (admin ureja …, lastnik …, glasovi,
-- klepet, prijave, pripomočki). Anon ne piše nikamor: vsaka politika za
-- pisanje zahteva auth.uid() ali is_admin().
--
-- Migracija je idempotentna; na sveži bazi (CI) odvzame le, česar tam že ni,
-- plus TRUNCATE/REFERENCES/TRIGGER/MAINTAIN in pisanje prek pogledov.

do $$
declare
  r record;
begin
  -- 1. Tega aplikacija nikoli ne potrebuje: TRUNCATE (RLS ga ne ustavi),
  --    REFERENCES, TRIGGER, MAINTAIN (VACUUM, REINDEX, LOCK TABLE …).
  --    Pogledi: nikoli pisanje, ker pisanje prek pogleda obide RLS.
  --    Anon: nikoli pisanje v tabele.
  for r in
    select c.oid::regclass as rel, c.relkind
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p', 'v', 'm', 'f')
  loop
    execute format('revoke truncate, references, trigger, maintain on %s from public, anon, authenticated', r.rel);
    if r.relkind in ('v', 'm') then
      execute format('revoke insert, update, delete on %s from public, anon, authenticated', r.rel);
    else
      execute format('revoke insert, update, delete on %s from public, anon', r.rel);
    end if;
  end loop;

  -- 2. Zaporedja: vsi ID-ji so GENERATED ALWAYS AS IDENTITY, vstavljanje
  --    pravic nad zaporedjem ne potrebuje; setval/nextval prek API-ja pa ni
  --    nikomur namenjen.
  for r in
    select c.oid::regclass as rel
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'S'
  loop
    execute format('revoke all on sequence %s from public, anon, authenticated', r.rel);
  end loop;
end $$;

-- 3. Prijavljeni: nazaj na pravice, ki jih določajo migracije.

-- 20260913100000: profil in ekipa samo prek izbranih stolpcev, kader samo
-- prek shrani_ekipo. REVOKE na tabeli odvzame tudi pravice na stolpce, zato
-- jih spodaj podelimo znova (seznam = vsi poznejši GRANT-i na stolpce).
revoke insert, update, delete on public.profiles, public.fantasy_teams, public.fantasy_roster
  from authenticated;
grant update (display_name, insider_team_id, brez_opomnikov, navijam_team_id, brez_push,
              avatar_barva, avatar_ikona, javni_profil)
  on public.profiles to authenticated;
grant insert (owner_id, name, competition_id), update (name)
  on public.fantasy_teams to authenticated;

-- 20260923090000: v mini ligo samo prek pridruzi_mini_ligi / ustvari_mini_ligo;
-- izstop in odstranitev (DELETE) ostaneta.
revoke insert, update on public.mini_liga_clani from authenticated;

-- 20260923120000, 20261002120000: izračunane tabele in pogledi so le za
-- servis (berejo jih funkcije SECURITY DEFINER in pogledi nad njimi).
revoke all on public.statistika_igralcev, public.tocke_krogov,
              public.fantasy_round_points_izracun, public.player_season_stats_izracun
  from public, anon, authenticated;

-- Tabele, v katere piše le baza (sprožilci, funkcije SECURITY DEFINER) ali
-- servis; politike RLS za pisanje nimajo in vmesnik vanje ne piše.
revoke insert, update, delete on
  public.obiski_dnevno, public.lijak_dnevno, public.push_tokens, public.email_log,
  public.assist_votes_deleted, public.position_votes_deleted, public.player_scores,
  public.poznavalec_prosnje, public.sponsor_stats
  from authenticated;

-- Sporočil in prijav o igralcih se ne ureja (ni politike za UPDATE).
revoke update on public.chat_messages, public.player_reports from authenticated;

-- Stiki s klubi: Administracija → Klubi piše neposredno (politika
-- "admin ureja stike" / "admin ureja posto stikov"). Na sveži bazi te pravice
-- nikoli ni bilo (tabeli sta nastali po 20260923090000), v produkciji pa jo
-- vmesnik uporablja.
grant select, insert, update, delete on public.klub_stik, public.klub_stik_posta to authenticated;

-- 4. Nove tabele in zaporedja (lastnik postgres) ne dobijo več pisanja samodejno
--    (kot 20260923090000; obnova je privzeto pravilo vrnila). SELECT ostane,
--    ker ga pričakujejo vse migracije, ki ustvarijo javno tabelo z RLS.
alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger, maintain on tables from anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated;
