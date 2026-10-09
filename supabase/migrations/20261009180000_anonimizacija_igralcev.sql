-- Anonimizacija igralcev (GDPR): ugovor igralca ali zveze in 18 mesecev brez
-- nastopa. Ime se zamenja z nevtralnim "#<id>" v bazi, zato ga ne pokaže
-- nobena stran (vse berejo `players.full_name` oz. poglede nad njim).
-- Statistika, točke in cena ostanejo — vezane so na id, ne na ime.

alter table public.players
  add column if not exists anonimiziran_at timestamptz,
  -- 'ugovor' je dokončen; 'neaktiven' (18 mesecev) uvoz povrne, ko igralec
  -- spet nastopi v tekoči sezoni.
  add column if not exists anonimiziran_razlog text
    check (anonimiziran_razlog in ('ugovor', 'neaktiven'));

-- Uvoz iz virov brez šifre igralca (stari CMS) najde igralca po imenu. Po
-- anonimizaciji ga po imenu ne bi več našel in naslednji zapisnik bi ustvaril
-- dvojnika s pravim imenom. Zato hranimo sha256("<competition_id>|<ime>"),
-- s katerim uvoz igralca še prepozna (`imeHash` v scripts/anonimizacija.mjs).
-- Tabela je zaprta (RLS brez politik, brez pravic): `players` je javno
-- berljiva, zgoščena imena pa se dajo z ugibanjem obrniti.
create table if not exists public.anonimizirani_igralci (
  player_id bigint primary key references public.players on delete cascade,
  competition_id bigint not null,
  ime_hash text not null
);
create index if not exists anonimizirani_igralci_hash
  on public.anonimizirani_igralci (competition_id, ime_hash);
alter table public.anonimizirani_igralci enable row level security;
revoke all on public.anonimizirani_igralci from anon, authenticated;

create or replace function public.anonimiziraj_igralca(p_player_id bigint, p_razlog text default 'ugovor')
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_razlog not in ('ugovor', 'neaktiven') then
    raise exception 'Neznan razlog anonimizacije: %', p_razlog;
  end if;
  -- Ime za uvoz, le ob prvi anonimizaciji (potem je ime že "#<id>").
  insert into anonimizirani_igralci(player_id, competition_id, ime_hash)
  select id, competition_id,
         encode(sha256(convert_to(competition_id || '|' || full_name, 'UTF8')), 'hex')
    from players
   where id = p_player_id and anonimiziran_at is null and nullif(full_name, '') is not null
  on conflict (player_id) do nothing;

  update players set
    full_name = '#' || id,
    first_name = '',
    last_name = '#' || id,
    nzs_url = null,
    nzs_birth_year = null,
    anonimiziran_at = coalesce(anonimiziran_at, now()),
    -- Ugovor prevlada nad neaktivnostjo, nikoli obratno.
    anonimiziran_razlog = case when p_razlog = 'ugovor' or anonimiziran_razlog = 'ugovor'
                               then 'ugovor' else 'neaktiven' end
   where id = p_player_id;

  -- Poročila skupnosti (poškodba, odsotnost) so prosto besedilo z imenom.
  delete from player_reports where player_id = p_player_id;
end;
$$;
revoke all on function public.anonimiziraj_igralca(bigint, text) from public, anon, authenticated;
grant execute on function public.anonimiziraj_igralca(bigint, text) to service_role;

create or replace function public.admin_anonimiziraj_igralca(p_player_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko anonimizira igralca.' using errcode = '42501';
  end if;
  perform anonimiziraj_igralca(p_player_id, 'ugovor');
end;
$$;
revoke all on function public.admin_anonimiziraj_igralca(bigint) from public, anon;
grant execute on function public.admin_anonimiziraj_igralca(bigint) to authenticated, service_role;

-- 18 mesecev brez nastopa → ime skrijemo, v vseh državah. Izpusti igralca,
-- ki je v katerem koli kadru (tudi hišnem), in igralca brez nastopov (nov,
-- še ni igral). Datum tekme: tekma, sicer krog; brez datuma šteje kot danes.
create or replace function public.anonimiziraj_neaktivne()
returns integer language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint;
  v_n integer := 0;
begin
  for v_id in
    select a.player_id
      from appearances a
      join matches m on m.id = a.match_id
      join rounds r on r.id = m.round_id
      join players p on p.id = a.player_id
     where p.anonimiziran_at is null
       and not exists (select 1 from fantasy_roster fr where fr.player_id = a.player_id)
     group by a.player_id
    having max(coalesce(m.played_on, r.played_on, r.deadline_at::date, current_date))
           < current_date - interval '18 months'
  loop
    perform anonimiziraj_igralca(v_id, 'neaktiven');
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke all on function public.anonimiziraj_neaktivne() from public, anon, authenticated;
grant execute on function public.anonimiziraj_neaktivne() to service_role;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'anonimiziraj-neaktivne',
    '30 3 * * *',
    $urnik$select public.anonimiziraj_neaktivne()$urnik$
  );
exception
  when others then
    raise notice 'pg_cron ni na voljo (%) — anonimizacijo neaktivnih je treba klicati ročno', sqlerrm;
end;
$$;
