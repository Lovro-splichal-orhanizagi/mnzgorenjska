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

alter role agent_bralec set default_transaction_read_only = on;
alter role agent_bralec set statement_timeout = '15s';
alter role agent_bralec set idle_in_transaction_session_timeout = '30s';

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
  ('trgovina.narocila', 'odjemalec', 'zgoščen IP')
on conflict (tabela, stolpec) do nothing;

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
    if exists (select 1 from agent.zaprti_stolpci z where z.tabela = r.nspname || '.' || r.relname) then
      select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into v_stolpci
      from pg_attribute a
      where a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
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

grant usage on schema public, trgovina to agent_bralec;
grant select on agent.registracije to agent_bralec;

select agent.uskladi_pravice();
