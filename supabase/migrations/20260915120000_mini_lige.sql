-- Zasebne mini lige.
--
-- Zakaj: 15 od 17 lig ima po nekaj ekip. Javna liga postane igriva šele, ko
-- se napolni, in dotlej nima kaj ponuditi. Mini liga deluje pri VSAKI
-- gostoti: pet prijateljev je tekmovanje, tudi če je njihova liga prazna.
-- To je mehanika, ki v Fantasy Premier League drži dolgi rep.
--
-- **Čez lige namenoma.** Pridružiš se z eno svojo ekipo, ne glede na to,
-- katero tekmovanje igra. Če bi mini ligo vezali na eno tekmovanje, bi
-- podedovala isto praznino, ki jo skuša odpraviti — brat v Mariboru in
-- sestra v Kopru ne bi mogla tekmovati.

-- --------------------------------------------------------------------------
-- Koda za pridružitev
-- --------------------------------------------------------------------------
-- Brez dvoumnih znakov: 0/O in 1/I/L se ob prepisovanju z zaslona ali iz
-- pogovora zamenjajo, koda pa potuje prav tako — po SMS, na glas, na listku.
create or replace function nova_koda_mini_lige()
returns text language plpgsql as $$
declare
  znaki constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  koda text;
  poskus int := 0;
begin
  loop
    koda := '';
    for i in 1..6 loop
      koda := koda || substr(znaki, 1 + floor(random() * length(znaki))::int, 1);
    end loop;
    exit when not exists (select 1 from mini_lige m where m.code = koda);
    poskus := poskus + 1;
    -- 31^6 je ~887 milijonov; dvajset trkov zapored pomeni okvaro, ne smole.
    if poskus > 20 then
      raise exception 'Kode mini lige ni bilo mogoče ustvariti.';
    end if;
  end loop;
  return koda;
end $$;

create table if not exists mini_lige (
  id         bigint primary key generated always as identity,
  name       text not null check (length(btrim(name)) between 2 and 40),
  code       text not null unique,
  owner_id   uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table mini_lige is
  'Zasebna liga med znanci. Namenoma NI vezana na tekmovanje — sicer podeduje praznino javne lige.';

create table if not exists mini_liga_clani (
  mini_liga_id    bigint not null references mini_lige(id) on delete cascade,
  fantasy_team_id bigint not null references fantasy_teams(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  primary key (mini_liga_id, fantasy_team_id)
);

comment on table mini_liga_clani is
  'Ekipa v mini ligi. Ena oseba lahko pripelje več svojih ekip iz različnih lig.';

create index if not exists mini_liga_clani_ekipa_idx on mini_liga_clani (fantasy_team_id);

-- --------------------------------------------------------------------------
-- Pravice
-- --------------------------------------------------------------------------
alter table mini_lige enable row level security;
alter table mini_liga_clani enable row level security;

-- Branje je odprto: da se pridružiš s kodo, moraš ligo najti, preden si v
-- njej. Ime mini lige ni skrivnost — koda je tisto, kar odpira vrata.
drop policy if exists "branje mini lig" on mini_lige;
create policy "branje mini lig" on mini_lige for select using (true);

drop policy if exists "ustvari svojo mini ligo" on mini_lige;
create policy "ustvari svojo mini ligo" on mini_lige for insert
  with check (auth.uid() = owner_id);

drop policy if exists "lastnik ureja mini ligo" on mini_lige;
create policy "lastnik ureja mini ligo" on mini_lige for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "lastnik razpusti mini ligo" on mini_lige;
create policy "lastnik razpusti mini ligo" on mini_lige for delete
  using (auth.uid() = owner_id);

drop policy if exists "branje clanov" on mini_liga_clani;
create policy "branje clanov" on mini_liga_clani for select using (true);

-- Pripelješ lahko SAMO svojo ekipo. Brez tega bi kdo vpisal tujo ekipo v
-- svojo mini ligo in bi se ta pojavila na tuji lestvici brez vednosti lastnika.
drop policy if exists "pridruzi svojo ekipo" on mini_liga_clani;
create policy "pridruzi svojo ekipo" on mini_liga_clani for insert
  with check (exists (
    select 1 from fantasy_teams ft
     where ft.id = fantasy_team_id and ft.owner_id = auth.uid()
  ));

-- Odide lahko lastnik ekipe (sam) ali lastnik mini lige (odstrani člana).
drop policy if exists "odidi ali odstrani" on mini_liga_clani;
create policy "odidi ali odstrani" on mini_liga_clani for delete
  using (
    exists (select 1 from fantasy_teams ft
             where ft.id = fantasy_team_id and ft.owner_id = auth.uid())
    or exists (select 1 from mini_lige m
                where m.id = mini_liga_id and m.owner_id = auth.uid())
  );

-- --------------------------------------------------------------------------
-- Lestvica mini lige
-- --------------------------------------------------------------------------
-- Točke so iste kot v javni lestvici; mini liga je samo drug izbor ekip.
create or replace view mini_liga_lestvica as
  select c.mini_liga_id,
         s.fantasy_team_id,
         s.team_name,
         s.owner_name,
         s.total_points,
         s.rounds_played,
         case when s.rounds_played > 0
              then round(s.total_points / s.rounds_played, 2)
              else 0 end as points_per_round,
         k.slug  as competition_slug,
         k.short_name as competition_short,
         k.federation_short,
         c.joined_at
    from mini_liga_clani c
    join fantasy_team_standings s on s.fantasy_team_id = c.fantasy_team_id
    join competitions_view k on k.id = s.competition_id;

comment on view mini_liga_lestvica is
  'Lestvica mini lige — iste točke kot javna, le drug izbor ekip.';

grant select on mini_liga_lestvica to anon, authenticated;

-- --------------------------------------------------------------------------
-- Pridružitev s kodo
-- --------------------------------------------------------------------------
-- Kot funkcija, ne kot dva klica iz vmesnika: iskanje po kodi in vpis morata
-- biti eno dejanje, sicer mora odjemalec ligo najprej prebrati (in s tem
-- razkriti, katere kode obstajajo), da bi jo lahko vpisal.
create or replace function pridruzi_mini_ligi(p_koda text, p_ekipa bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_liga bigint;
begin
  if not exists (select 1 from fantasy_teams ft
                  where ft.id = p_ekipa and ft.owner_id = auth.uid()) then
    raise exception 'To ni tvoja ekipa.';
  end if;

  select id into v_liga from mini_lige where code = upper(btrim(p_koda));
  if v_liga is null then
    raise exception 'Mini lige s to kodo ni.';
  end if;

  insert into mini_liga_clani (mini_liga_id, fantasy_team_id)
  values (v_liga, p_ekipa)
  on conflict do nothing;

  return v_liga;
end $$;

revoke all on function pridruzi_mini_ligi(text, bigint) from public;
grant execute on function pridruzi_mini_ligi(text, bigint) to authenticated;

-- --------------------------------------------------------------------------
-- Ustvarjanje mini lige
-- --------------------------------------------------------------------------
-- Tudi to je funkcija, ne vstavljanje iz vmesnika: kodo mora ustvariti baza,
-- ker le ona vidi vse obstoječe in lahko zagotovi, da je nova enkratna.
-- Odjemalcu `nova_koda_mini_lige()` namenoma NI dostopna — sicer bi lahko
-- kdo kode generiral na zalogo in ugibal tuje.
create or replace function ustvari_mini_ligo(p_ime text)
returns table (id bigint, code text)
language plpgsql security definer set search_path = public as $$
declare
  v_ime text := btrim(p_ime);
begin
  if auth.uid() is null then
    raise exception 'Za mini ligo se je treba prijaviti.';
  end if;
  if length(v_ime) < 2 or length(v_ime) > 40 then
    raise exception 'Ime mini lige naj ima med 2 in 40 znaki.';
  end if;

  return query
    insert into mini_lige (name, code, owner_id)
    values (v_ime, nova_koda_mini_lige(), auth.uid())
    returning mini_lige.id, mini_lige.code;
end $$;

revoke all on function ustvari_mini_ligo(text) from public;
grant execute on function ustvari_mini_ligo(text) to authenticated;

-- `nova_koda_mini_lige` ostane interna.
revoke all on function nova_koda_mini_lige() from public, anon, authenticated;
