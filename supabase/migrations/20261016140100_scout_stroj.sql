-- SLFF Scout, faza 1 (stroj). Spec: docs/superpowers/specs/2026-10-16-scout-design.md.
--
-- 1. `players.scout_skrit`: ugovor igralca proti Scoutu. Stroj izloči vso
--    osebo (isto šifro ali ime in klub v državi); v fantasy igri ostane.
-- 2. Shema `scout`: rezultati nočnega delavca slff-scout (scout/stroj/).
--    Vsak zagon je nova vrstica v `scout.modeli`; ostale tabele visijo na njej
--    in gredo z njo. Brskalnik sheme ne vidi: ni v api.schemas, anon in
--    authenticated nimata pravic, RLS brez politik. Brale jo bodo SECURITY
--    DEFINER funkcije faze 3 (te morajo ob branju še enkrat preveriti
--    scout_skrit in anonimizacijo, ker model nastane enkrat na noč).
--    Tujih ključev na public.players/teams ni namenoma: zdruzi-klube in
--    razdeli-zlite-igralce brišeta vrstice, stroj pa vse prepiše vsako noč.

alter table public.players
  add column if not exists scout_skrit boolean not null default false;
comment on column public.players.scout_skrit is
  'Ugovor proti Scoutu: oseba ne vstopi v izracun scout (vse vrstice z isto sifro oz. imenom in klubom v drzavi). Fantasy igre ne spremeni.';

create schema if not exists scout;
revoke all on schema scout from public, anon, authenticated;

create table scout.drzave (
  country_id     bigint primary key references public.countries on delete cascade,
  stanje         text not null default 'zaprto' check (stanje in ('zaprto', 'pilot', 'odprto'))
);
comment on table scout.drzave is
  'Katere drzave Scout pokaze klubom. Odpre jo lastnik; Slovenija je odprta od zacetka.';
insert into scout.drzave (country_id, stanje)
select id, case when code = 'SI' then 'odprto' else 'zaprto' end from public.countries
on conflict (country_id) do nothing;

create table scout.modeli (
  id           bigint generated always as identity primary key,
  ustvarjen_at timestamptz not null default now(),
  leto         int not null,
  backtest     jsonb not null,
  parametri    jsonb not null,
  objavljen    boolean not null default false
);
comment on column scout.modeli.objavljen is
  'Backtest je prestal prag (>= 15 % manjsa napaka od naivne osnove pri prestopih); vmesnik bere zadnji objavljeni model.';

create table scout.lige_moc (
  model_id       bigint not null references scout.modeli on delete cascade,
  competition_id bigint not null,
  moc            double precision not null,
  vir            text not null check (vir in ('model', 'piramida', 'drzava', 'brez')),
  prestopov      int not null,
  izracunano_at  timestamptz not null,
  primary key (model_id, competition_id)
);
comment on column scout.lige_moc.moc is
  'Log faktor moci: vrednost_ref = vrednost_v_ligi * exp(moc); projekcija na ligo = vrednost_ref * exp(-moc_lige).';

create table scout.ekipe_elo (
  model_id       bigint not null references scout.modeli on delete cascade,
  team_id        bigint not null,
  competition_id bigint not null,
  leto           int not null,
  elo            double precision not null,
  primary key (model_id, team_id, competition_id, leto)
);

create table scout.kazalniki (
  model_id       bigint not null references scout.modeli on delete cascade,
  player_id      bigint not null,
  competition_id bigint not null,
  sezona         text not null,
  leto           int not null,
  team_id        bigint not null,
  skupina        text check (skupina in ('GK', 'DEF', 'MID', 'FWD')),
  minute         int not null,
  delez_minut    double precision not null,
  zacetki_delez  double precision not null,
  cele_delez     double precision not null,
  goli_ref_90    double precision not null,
  delez_golov    double precision not null,
  enajstm        int not null,
  onoff_ref_90   double precision not null,
  prejeti_ref_90 double precision not null,
  ciste_delez    double precision not null,
  kartoni_90     double precision not null,
  vratar_ref_90  double precision not null,
  stalnost       double precision not null,
  trend_minut    double precision,
  prehod_ravni   double precision,
  zaupanje       double precision not null,
  primary key (model_id, player_id, sezona)
);

create table scout.indeks (
  model_id  bigint not null references scout.modeli on delete cascade,
  player_id bigint not null,
  skupina   text not null check (skupina in ('GK', 'DEF', 'MID', 'FWD')),
  indeks    double precision not null,
  percentil double precision not null,
  zaupanje  double precision not null,
  primary key (model_id, player_id)
);

create table scout.vektorji (
  model_id  bigint not null references scout.modeli on delete cascade,
  player_id bigint not null,
  skupina   text not null,
  vektor    double precision[] not null,
  podobni   bigint[] not null,
  podobnost double precision[] not null,
  primary key (model_id, player_id)
);

create table scout.vrzeli (
  model_id       bigint not null references scout.modeli on delete cascade,
  team_id        bigint not null,
  competition_id bigint not null,
  skupina        text,
  vrsta          text not null check (vrsta in ('tanka', 'odvisnost', 'padajoce_minute', 'disciplina', 'prejeti')),
  player_id      bigint,
  vrednost       double precision not null
);
create index vrzeli_model_ekipa_idx on scout.vrzeli (model_id, team_id);

alter table scout.drzave    enable row level security;
alter table scout.modeli    enable row level security;
alter table scout.lige_moc  enable row level security;
alter table scout.ekipe_elo enable row level security;
alter table scout.kazalniki enable row level security;
alter table scout.indeks    enable row level security;
alter table scout.vektorji  enable row level security;
alter table scout.vrzeli    enable row level security;
revoke all on all tables in schema scout from public, anon, authenticated;
revoke all on all sequences in schema scout from public, anon, authenticated;

-- Delavec slff-scout se prijavi kot scout_stroj (SCOUT_DB_URL): bere le
-- tabele zapisnikov, piše le shemo scout. Geslo nastavi lastnik ročno na
-- strežniku (docs/scout.md), nikoli v gitu; brez gesla prijava ne uspe.
-- Javne tabele imajo politike "javno branje" brez TO, zato zadošča SELECT;
-- politike "admin ureja …" pokličejo is_admin(), zato EXECUTE nanjo.
do $$
begin
  if not exists (select from pg_roles where rolname = 'scout_stroj') then
    create role scout_stroj login;
  end if;
end;
$$;
-- RLS ostane vklopljen (brez politik za brskalnik); stroj dobi svojo
-- politiko na vsaki tabeli namesto BYPASSRLS.
create policy stroj on scout.drzave for all to scout_stroj using (true) with check (true);
create policy stroj on scout.modeli for all to scout_stroj using (true) with check (true);
create policy stroj on scout.lige_moc for all to scout_stroj using (true) with check (true);
create policy stroj on scout.ekipe_elo for all to scout_stroj using (true) with check (true);
create policy stroj on scout.kazalniki for all to scout_stroj using (true) with check (true);
create policy stroj on scout.indeks for all to scout_stroj using (true) with check (true);
create policy stroj on scout.vektorji for all to scout_stroj using (true) with check (true);
create policy stroj on scout.vrzeli for all to scout_stroj using (true) with check (true);

-- Lastnik migracij (lokalno postgres) sme preklopiti v vlogo (set role), da
-- integracijski test preveri prav te pravice.
grant scout_stroj to current_user;
grant usage on schema public, scout to scout_stroj;
grant select on public.players, public.appearances, public.goals, public.matches, public.rounds,
  public.competitions, public.federations, public.countries, public.teams to scout_stroj;
grant execute on function public.je_mladinski_slug(text), public.is_admin() to scout_stroj;
grant select, insert, update, delete on all tables in schema scout to scout_stroj;
grant usage, select on all sequences in schema scout to scout_stroj;
