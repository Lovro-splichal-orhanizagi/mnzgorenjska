-- Preizkus `kandidati_za_opomnik_ponovne_cene`: okno 1 h – 3 dni, enkrat na
-- zahtevek, plačan zahtevek ali odjava ustavita, stikalo, pravice.
--
--   docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/preizkus-opomnika-ponovne-cene.sql
\set ON_ERROR_STOP on

begin;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000c7';
  liga bigint;
  igr bigint;
  z bigint;
  n int;
  poizvedba constant text := 'select count(*) from kandidati_za_opomnik_ponovne_cene(100000) k where k.user_id = $1';
begin
  select id into liga from competitions where slug = 'clani';
  select p.id into igr from players p
   where p.competition_id = liga and ponovna_cena_ovira_igralca(p.id) is null
   order by p.id limit 1;
  assert igr is not null, 'potreben je igralec, za katerega je izračun mogoč';
  -- Brez roka v naslednjih 24 urah in brez tujih zahtevkov za tega igralca.
  update rounds set deadline_at = now() + interval '30 days' where competition_id = liga and lineups_locked_at is null;
  delete from ponovne_cene where player_id = igr;
  insert into settings (key, value) values ('ponovna_cena', '2')
  on conflict (key) do update set value = excluded.value;

  insert into auth.users (id, email, email_confirmed_at, created_at, aud, role)
  values (a, 'ponovna-cena@test.slff', now(), now() - interval '30 days', 'authenticated', 'authenticated');
  insert into profiles (id, display_name) values (a, 'Test Cena') on conflict (id) do nothing;

  -- Pravkar začet (seja še teče): ni kandidat.
  insert into ponovne_cene (player_id, competition_id, user_id, created_at)
  values (igr, liga, a, now() - interval '20 minutes') returning id into z;
  execute poizvedba into n using a;
  assert n = 0, 'pred 1 h ni opomnika';

  -- Pred 2 urama, neplačan: kandidat z imenom igralca in ligo.
  update ponovne_cene set created_at = now() - interval '2 hours' where id = z;
  execute poizvedba into n using a;
  assert n = 1, 'neplačan zahtevek pred 2 urama je kandidat';
  assert (select k.liga_slug = 'clani' and k.player_id = igr and k.zahtevek_id = z and length(k.igralec) > 0
            from kandidati_za_opomnik_ponovne_cene(100000) k where k.user_id = a), 'kandidat nosi igralca in ligo';

  -- Stikalo izklopljeno: nič.
  update settings set value = '0' where key = 'ponovna_cena';
  execute poizvedba into n using a;
  assert n = 0, 'izklopljena ponovna cena: ni opomnika';
  update settings set value = '2' where key = 'ponovna_cena';

  -- Odjavljen od opomnikov: nič.
  update profiles set brez_opomnikov = true where id = a;
  execute poizvedba into n using a;
  assert n = 0, 'odjavljen ne dobi opomnika';
  update profiles set brez_opomnikov = false where id = a;

  -- Neuspešen poskus ne ustavi, trije pa.
  insert into email_log (user_id, email, vrsta, napaka, poslano_at) values (a, 'x', 'ponovna-cena-opomnik', 'smtp', now() - interval '1 hour');
  execute poizvedba into n using a;
  assert n = 1, 'po neuspešnem poskusu znova';
  insert into email_log (user_id, email, vrsta, napaka, poslano_at) values
    (a, 'x', 'ponovna-cena-opomnik', 'smtp', now() - interval '50 minutes'),
    (a, 'x', 'ponovna-cena-opomnik', 'smtp', now() - interval '40 minutes');
  execute poizvedba into n using a;
  assert n = 0, 'največ trije poskusi';
  delete from email_log where user_id = a;

  -- Poslan: enkrat na zahtevek.
  insert into email_log (user_id, email, vrsta, poslano_at) values (a, 'x', 'ponovna-cena-opomnik', now() - interval '30 minutes');
  execute poizvedba into n using a;
  assert n = 0, 'enkrat na zahtevek';
  delete from email_log where user_id = a;

  -- Plačal kasnejši zahtevek za istega igralca: nič.
  insert into ponovne_cene (player_id, competition_id, user_id, stanje, placano_at, created_at)
  values (igr, liga, a, 'placano', now() - interval '1 hour', now() - interval '1 hour');
  execute poizvedba into n using a;
  assert n = 0, 'plačan zahtevek ustavi opomnik';
  delete from ponovne_cene where user_id = a and stanje = 'placano';

  -- Starejši od 3 dni: nič.
  update ponovne_cene set created_at = now() - interval '4 days' where id = z;
  execute poizvedba into n using a;
  assert n = 0, 'po 3 dneh ni opomnika';

  -- Pravice: le servisna vloga.
  assert not has_function_privilege('anon', 'public.kandidati_za_opomnik_ponovne_cene(int)', 'execute'), 'anon ne sme';
  assert not has_function_privilege('authenticated', 'public.kandidati_za_opomnik_ponovne_cene(int)', 'execute'), 'authenticated ne sme';
  assert has_function_privilege('service_role', 'public.kandidati_za_opomnik_ponovne_cene(int)', 'execute'), 'service_role sme';
end $$;

rollback;

\echo 'preizkus-opomnika-ponovne-cene: OK'
