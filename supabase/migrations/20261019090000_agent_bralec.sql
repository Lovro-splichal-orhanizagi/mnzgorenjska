-- Bralni dostop za agente (Pivko, SRE v Paperclipu): vloga agent_bralec sme le
-- brati podatke aplikacije, da agent na vprašanje v Discordu odgovori iz baze
-- (SLF-24: "koliko mailov smo danes poslali"), ne iz ugibanja.
--
-- Prijavo (geslo) nastavi lastnik ročno na strežniku, nikoli v git; do baze
-- agent pride le skozi omejen SSH ukaz na VM (docs/agenti-baza.md).
--
-- Ne bere: sheme auth (gesla, seje, e-pošta uporabnikov), scout, ključev,
-- žetonov, Stripe dogodkov, ključev anonimizacije ter stolpcev z e-pošto in
-- naslovi uporabnikov in kupcev. Registracije šteje pogled agent.registracije.
-- Nove tabele dobijo pravice ob vsaki objavi: CI po migracijah pokliče
-- agent.uskladi_pravice().

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'agent_bralec') then
    create role agent_bralec nologin;
  end if;
end $$;

-- Brez tega bi tabele z RLS (naročila, email_log …) vrnile 0 vrstic in štetje
-- bi bilo tiho napačno. Pravice na stolpcih in branje veljajo še naprej.
-- Zahteva superuporabnika; če ga migracija nima, ga nastavi docs/agenti-baza.md.
do $$ begin
  alter role agent_bralec bypassrls;
exception when insufficient_privilege then
  raise notice 'agent_bralec: bypassrls nastavi ročno (docs/agenti-baza.md)';
end $$;

-- Varnost ne sloni na teh privzetih (seja jih lahko spremeni), ampak na
-- agent.poizvedba (transakcija le za branje, en sam podizraz), pravicah in
-- omejitvah, ki jih seja ne more preklopiti (connection limit, temp_file_limit).
alter role agent_bralec connection limit 3;
alter role agent_bralec set default_transaction_read_only = on;
alter role agent_bralec set statement_timeout = '15s';
alter role agent_bralec set idle_in_transaction_session_timeout = '30s';
alter role agent_bralec set temp_file_limit = '256MB';

create schema if not exists agent;
revoke all on schema agent from public;
grant usage on schema agent to agent_bralec;

create table if not exists agent.zaprte_tabele (tabela text primary key, zakaj text not null);
create table if not exists agent.zaprti_stolpci (tabela text, stolpec text, zakaj text not null, primary key (tabela, stolpec));

insert into agent.zaprte_tabele (tabela, zakaj) values
  ('public.odjava_kljuc', 'ključ odjav'),
  ('public.stiki_kljuc', 'ključ stikov'),
  ('public.push_tokens', 'žetoni push'),
  ('public.stripe_dogodki', 'surovi Stripe dogodki'),
  ('public.anonimizirani_igralci', 'ključi anonimizacije')
on conflict (tabela) do nothing;

insert into agent.zaprti_stolpci (tabela, stolpec, zakaj) values
  ('public.email_log', 'email', 'e-pošta uporabnika'),
  ('public.klubski_zahtevki', 'email', 'e-pošta prijavitelja'),
  ('public.zelje_lig', 'email', 'e-pošta uporabnika'),
  ('public.narocila_znack', 'naslov', 'naslov kupca'),
  ('trgovina.narocila', 'email', 'e-pošta kupca'),
  ('trgovina.narocila', 'naslov', 'naslov kupca'),
  ('trgovina.narocila', 'odjemalec', 'zgoščen IP'),
  ('trgovina.narocila', 'ime', 'ime kupca'),
  ('trgovina.narocila', 'sledilna', 'sledilna številka kupca'),
  ('public.email_log', 'napaka', 'odbitja vsebujejo e-pošto')
on conflict (tabela, stolpec) do nothing;

-- Stolpci, ki po imenu verjetno nosijo skrivnost ali osebni podatek, so zaprti
-- tudi brez vpisa (nova tabela tako ne odpre e-pošte ali žetona po pomoti).
create or replace function agent.obcutljiv_stolpec(p text) returns boolean
language sql immutable set search_path = pg_catalog
as $f$ select p ~* '(e_?mail|naslov|telefon|geslo|password|token|zeton|kljuc|secret|hash|stripe_customer|dokaz|odjemalec|ip_?naslov|^ip$)' $f$;

-- Registracije in prijave po dnevih brez e-pošte (pogled teče kot lastnik).
create or replace view agent.registracije as
select (created_at at time zone 'Europe/Ljubljana')::date as dan,
       count(*) as registracij,
       count(*) filter (where email_confirmed_at is not null) as potrjenih
from auth.users
group by 1;

-- Dodeli SELECT na vse tabele in poglede v public in trgovina razen zaprtih;
-- tabeli z zaprtimi stolpci le na dovoljene stolpce. Idempotentno.
create or replace function agent.uskladi_pravice() returns int
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  r record;
  v_stolpci text;
  n int := 0;
begin
  for r in
    select c.oid, n.nspname, c.relname, format('%I.%I', n.nspname, c.relname) as ime
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'trgovina') and c.relkind in ('r', 'v', 'm', 'p')
  loop
    execute format('revoke all on %s from agent_bralec', r.ime);
    -- Pravice na stolpcih preživijo revoke na tabeli: odvzemi jih posebej.
    select string_agg(quote_ident(a.attname), ', ') into v_stolpci
    from pg_attribute a where a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped;
    if v_stolpci is not null then
      execute format('revoke select (%s) on %s from agent_bralec', v_stolpci, r.ime);
    end if;
    if exists (select 1 from agent.zaprte_tabele z where z.tabela = r.nspname || '.' || r.relname) then
      continue;
    end if;
    if exists (select 1 from agent.zaprti_stolpci z where z.tabela = r.nspname || '.' || r.relname)
       or exists (select 1 from pg_attribute a where a.attrelid = r.oid and a.attnum > 0
                  and not a.attisdropped and agent.obcutljiv_stolpec(a.attname)) then
      select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into v_stolpci
      from pg_attribute a
      where a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
        and not agent.obcutljiv_stolpec(a.attname)
        and not exists (select 1 from agent.zaprti_stolpci z
                        where z.tabela = r.nspname || '.' || r.relname and z.stolpec = a.attname);
      if v_stolpci is not null then
        execute format('grant select (%s) on %s to agent_bralec', v_stolpci, r.ime);
      end if;
    else
      execute format('grant select on %s to agent_bralec', r.ime);
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function agent.uskladi_pravice() from public;

-- Edina pot za poizvedbe agenta (scripts/hetzner/agent-sql.sh): ovoj odpre
-- transakcijo le za branje in pokliče to funkcijo; besedilo se izvede kot en
-- sam podizraz (EXECUTE ne sprejme več ukazov), zato ne more končati
-- transakcije, preklopiti v pisanje ali pognati drugega ukaza. Vrstice kot JSON.
create or replace function agent.poizvedba(p_sql text) returns setof json
language plpgsql security invoker set search_path = public, trgovina, agent, pg_catalog
as $f$
begin
  if not current_setting('transaction_read_only')::boolean then
    raise exception 'agent.poizvedba teče le v transakciji za branje';
  end if;
  return query execute format('select to_json(t) from (%s) t limit 1000', p_sql);
end $f$;
revoke all on function agent.poizvedba(text) from public;
grant execute on function agent.poizvedba(text) to agent_bralec;

-- pg_net: tabele čakalne vrste in odgovorov so bile odprte vsem (PUBLIC), kar bi
-- agentu dalo URL-je spletnih kljuk Discorda. Pravice ostanejo vsem obstoječim
-- vlogam, PUBLIC (in s tem agent_bralec) jih izgubi. Zahteva lastnika sheme net.
do $$
declare v_t text; v_v text;
begin
  if to_regnamespace('net') is null then return; end if;
  foreach v_v in array array['anon','authenticated','service_role','postgres','supabase_functions_admin'] loop
    if exists (select 1 from pg_roles where rolname = v_v) then
      execute format('grant usage on schema net to %I', v_v);
      foreach v_t in array array['http_request_queue','_http_response'] loop
        if to_regclass('net.' || v_t) is not null then
          execute format('grant all on net.%I to %I', v_t, v_v);
        end if;
      end loop;
    end if;
  end loop;
  revoke usage on schema net from public;
  revoke all on net.http_request_queue, net._http_response from public;
exception when insufficient_privilege then
  raise warning 'net: pravice PUBLIC odvzemi ročno (docs/agenti-baza.md)';
end $$;

grant usage on schema public, trgovina to agent_bralec;
grant select on agent.registracije to agent_bralec;

select agent.uskladi_pravice();
