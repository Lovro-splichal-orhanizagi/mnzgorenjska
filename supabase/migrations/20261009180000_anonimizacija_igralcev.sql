-- Anonimizacija igralcev (GDPR): ugovor igralca ali zveze in, v Avstriji,
-- 18 mesecev brez nastopa. Ime se v bazi zamenja z nevtralnim "#<id>", zato
-- ga ne pokaže nobena stran (vse berejo `players` oz. poglede nad njim).
-- Statistika, točke in cena ostanejo — vezane so na id, ne na ime.

alter table public.players
  add column if not exists anonimiziran_at timestamptz,
  -- 'ugovor' je dokončen; 'neaktiven' (18 mesecev) uvoz povrne, ko igralec
  -- spet nastopi v tekoči sezoni.
  add column if not exists anonimiziran_razlog text
    check (anonimiziran_razlog in ('ugovor', 'neaktiven'));

-- Po anonimizaciji igralca uvoz ne najde več ne po imenu ne po šifri
-- (`reg_st` je javna šifra osebe pri viru, zato gre proč). Brez tega bi
-- naslednji zapisnik ustvaril dvojnika s pravim imenom. Zato hranimo zgoščena
-- ključa "<country_id>|<ime>" in "<country_id>|reg|<reg_st>":
--  * uvoz po njiju najde anonimiziranega igralca v isti ligi,
--  * pri ugovoru nov igralec z istim ključem v isti državi nastane že
--    anonimiziran (prestop, druga liga).
-- Tabela je zaprta (RLS brez politik, brez pravic): `players` je javno
-- berljiva, zgoščena imena pa se dajo z ugibanjem obrniti. Zgoščevanje mora
-- biti enako kot `imeHash`/`regHash` v scripts/anonimizacija.mjs.
create table if not exists public.anonimizirani_igralci (
  player_id bigint not null references public.players on delete cascade,
  kljuc text not null,
  primary key (player_id, kljuc)
);
create index if not exists anonimizirani_igralci_kljuc on public.anonimizirani_igralci (kljuc);
alter table public.anonimizirani_igralci enable row level security;
revoke all on public.anonimizirani_igralci from anon, authenticated;

create or replace function public.anonimizacijski_kljuc(p text)
returns text language sql immutable set search_path = public
as $$ select encode(sha256(convert_to(p, 'UTF8')), 'hex') $$;

create or replace function public.anonimiziraj_igralca(p_player_id bigint, p_razlog text default 'ugovor')
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_razlog not in ('ugovor', 'neaktiven') then
    raise exception 'Neznan razlog anonimizacije: %', p_razlog;
  end if;
  -- Ključa le ob prvi anonimizaciji (potem sta ime in šifra že proč).
  insert into anonimizirani_igralci(player_id, kljuc)
  select p.id, anonimizacijski_kljuc(k)
    from players p join competitions c on c.id = p.competition_id
   cross join lateral (values
     (case when nullif(p.full_name, '') is not null then c.country_id || '|' || p.full_name end),
     (case when p.reg_st is not null then c.country_id || '|reg|' || p.reg_st end)) v(k)
   where p.id = p_player_id and p.anonimiziran_at is null and k is not null
  on conflict do nothing;

  update players set
    full_name = '#' || id,
    first_name = '',
    last_name = '#' || id,
    reg_st = null,
    nzs_url = null,
    nzs_birth_year = null,
    nzs_top_league = null,
    nzs_top_league_minutes = null,
    nzs_confirmed_at = null,
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

-- Ista oseba v drugih vrsticah (člani/mladinci, druga liga, prestop) v isti
-- državi: z isto šifro (`po_sifri`, gre zraven samodejno) ali le z istim
-- imenom (admin odkljuka, soimenjak je lahko drug človek).
create or replace function public.admin_ista_oseba(p_player_id bigint)
returns table(id bigint, full_name text, liga text, klub text, po_sifri boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator.' using errcode = '42501';
  end if;
  return query
  select o.id, o.full_name, oc.name, t.name, (o.reg_st = p.reg_st) is true
    from players p
    join competitions pc on pc.id = p.competition_id
    join players o on o.id <> p.id and o.anonimiziran_at is null
    join competitions oc on oc.id = o.competition_id and oc.country_id = pc.country_id
    left join teams t on t.id = o.team_id
   where p.id = p_player_id
     and ((p.reg_st is not null and o.reg_st = p.reg_st) or o.full_name = p.full_name)
   order by 5 desc, 3, 1;
end;
$$;
revoke all on function public.admin_ista_oseba(bigint) from public, anon;
grant execute on function public.admin_ista_oseba(bigint) to authenticated, service_role;

-- Ugovor: izbrane vrstice in vse vrstice z isto šifro v isti državi.
create or replace function public.admin_anonimiziraj_igralca(p_player_ids bigint[])
returns integer language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint;
  v_n integer := 0;
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko anonimizira igralca.' using errcode = '42501';
  end if;
  for v_id in
    select p.id from players p where p.id = any(p_player_ids)
    union
    select o.id
      from players p
      join competitions pc on pc.id = p.competition_id
      join players o on o.reg_st = p.reg_st
      join competitions oc on oc.id = o.competition_id and oc.country_id = pc.country_id
     where p.id = any(p_player_ids) and p.reg_st is not null
  loop
    perform anonimiziraj_igralca(v_id, 'ugovor');
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke all on function public.admin_anonimiziraj_igralca(bigint[]) from public, anon;
grant execute on function public.admin_anonimiziraj_igralca(bigint[]) to authenticated, service_role;

-- 18 mesecev brez nastopa → ime skrijemo. Le v Avstriji (obljuba ÖFB, ki
-- ravna enako). Izpusti aktivnega igralca (klub je v ligi, na trgu bi stal
-- kot #id), igralca v katerem koli kadru (tudi hišnem) in igralca brez
-- nastopov. Datum tekme: tekma, sicer krog; brez datuma šteje kot danes.
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
      join competitions c on c.id = p.competition_id
      join countries d on d.id = c.country_id
     where d.code = 'AT'
       and p.anonimiziran_at is null
       and not p.active
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

-- 04:30, ne 03:30: takrat `uveljavi-cene` piše v iste vrstice `players`.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'anonimiziraj-neaktivne',
    '30 4 * * *',
    $urnik$select public.anonimiziraj_neaktivne()$urnik$
  );
exception
  when others then
    raise notice 'pg_cron ni na voljo (%) — anonimizacijo neaktivnih je treba klicati ročno', sqlerrm;
end;
$$;
