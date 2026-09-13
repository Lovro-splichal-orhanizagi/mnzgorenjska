-- Zaprtje napak iz pregleda 2026-09-13: pravice pripadajo poljem in RPC,
-- roki pa veljajo v bazi, tudi ce klient preskoci vmesnik.

-- 1. Profil: uporabnik ureja le javno ime in svoj klub. Admin zastavica in
-- registracijski datum sta servisna podatka; profil ustvari auth sprozilec.
revoke insert, update, delete, truncate, references, trigger on profiles
  from public, anon, authenticated;
grant update (display_name, insider_team_id) on profiles to authenticated;

-- Denar, datum nastanka in liga obstojece ekipe niso vnosna polja.
-- Brisanje ekipe bi prek CASCADE obislo zaklep pripomockov in zgodovine.
revoke insert, update, delete, truncate, references, trigger on fantasy_teams
  from public, anon, authenticated;
grant insert (owner_id, name, competition_id), update (name)
  on fantasy_teams to authenticated;
revoke insert, update, delete, truncate, references, trigger on fantasy_roster
  from public, anon, authenticated;
drop policy if exists "lastnik ureja nabor" on fantasy_roster;

-- 2. En zaklep na krog, tudi kadar nima nihce veljavne postave.
alter table rounds add column lineups_locked_at timestamptz;
alter table fantasy_teams add column roster_updated_at timestamptz
  not null default clock_timestamp();
comment on column rounds.lineups_locked_at is
  'Dokoncan zajem postav; tudi neveljavni in prazni kadri so s tem zaprti.';
comment on column fantasy_teams.roster_updated_at is
  'Cas zadnjega shranjevanja pod zaklepom lige; kader po roku ne sme v zgodovino.';

-- Zgodovine ob namestitvi ne ugibamo iz danasnjih kadrov. Obstojece posnetke
-- ohranimo, pretekle kroge pa zapremo tudi tam, kjer posnetkov ni.
update rounds set lineups_locked_at = clock_timestamp()
where deadline_at <= clock_timestamp();

create or replace function zakleni_krog(p_round_id bigint)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_posnetih   int;
  v_strogo_od  int := nastavitev_int('strogi_zaklep_od_kroga', 2);
  v_prosti     int := nastavitev_int('prosti_prestopi', 3);
  v_kazen      int := nastavitev_int('kazen_prestopa', 4);
  v_stevilka   int;
  v_sezona     text;
  v_deadline   timestamptz;
  v_tekmovanje bigint;
  v_prvi       int;
  v_uporabi_v  boolean;
  v_zaklenjen  timestamptz;
begin
  select competition_id into v_tekmovanje from rounds where id = p_round_id;
  if not found then return 0; end if;

  -- Shranjevanje kadra in zaklep morata biti v istem vrstnem redu. Lock je
  -- po ligi, zato se lahko razlicne lige obdelujejo neodvisno.
  perform pg_advisory_xact_lock(hashtextextended('slff-kader:' || v_tekmovanje, 0));

  select r.number, r.season, r.deadline_at, r.competition_id, c.prvi_fantasy_krog,
         r.lineups_locked_at
    into v_stevilka, v_sezona, v_deadline, v_tekmovanje, v_prvi, v_zaklenjen
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.id = p_round_id;

  if v_stevilka is null or v_zaklenjen is not null
     or v_deadline is null or v_deadline > clock_timestamp() then
    return 0;
  end if;

  -- Krogi pred začetkom fantasy dela lige so samo rezultati.
  if v_stevilka < coalesce(v_prvi, 1) then
    return 0;
  end if;

  -- Poskus je dokoncen tudi za ekipe brez veljavnega kadra. Odsotnost
  -- fantasy_lineups ni dovoljenje za poznejse vpisovanje po znanih rezultatih.
  update rounds set lineups_locked_at = clock_timestamp() where id = p_round_id;

  -- Stroga validacija kadra šele od drugega fantasy kroga naprej — prvi krog
  -- lige je vedno tudi krog, v katerem se pozicije šele izglasujejo.
  v_uporabi_v := v_stevilka >= greatest(v_strogo_od, coalesce(v_prvi, 1) + 1);

  insert into fantasy_lineups (
    round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order
  )
  select p_round_id, fr.fantasy_team_id, fr.player_id,
         fr.is_starter, fr.is_captain, fr.is_vice, fr.bench_order
  from fantasy_roster fr
  join fantasy_teams ft on ft.id = fr.fantasy_team_id
  where ft.competition_id = v_tekmovanje
  and not exists (
    select 1 from fantasy_lineups fl
    where fl.round_id = p_round_id and fl.fantasy_team_id = fr.fantasy_team_id
  )
  and ft.created_at <= v_deadline
  and ft.roster_updated_at <= v_deadline
  and (not v_uporabi_v or roster_je_veljaven(fr.fantasy_team_id));

  get diagnostics v_posnetih = row_count;

  -- --- prestopi glede na prejšnji zaklenjeni krog iste sezone --------------
  insert into fantasy_transfers (fantasy_team_id, round_id, transfers, free_transfers, penalty)
  select
    n.fantasy_team_id,
    p_round_id,
    n.prisli,
    v_prosti,
    case
      when exists (
        select 1 from fantasy_chips c
        where c.fantasy_team_id = n.fantasy_team_id
          and c.chip = 'wildcard'
          and c.round_id = p_round_id
      ) then 0
      else greatest(0, n.prisli - v_prosti) * v_kazen
    end
  from (
    select
      fl.fantasy_team_id,
      count(*) filter (
        where not exists (
          select 1 from fantasy_lineups prej
          where prej.fantasy_team_id = fl.fantasy_team_id
            and prej.player_id = fl.player_id
            and prej.round_id = prejsnji.round_id
        )
      ) as prisli
    from fantasy_lineups fl
    join lateral (
      -- zadnji zaklenjeni krog te ekipe PRED tem, znotraj iste sezone
      select fl2.round_id
      from fantasy_lineups fl2
      join rounds r2 on r2.id = fl2.round_id
      where fl2.fantasy_team_id = fl.fantasy_team_id
        and r2.season = v_sezona
        and r2.number < v_stevilka
      order by r2.number desc
      limit 1
    ) prejsnji on true
    where fl.round_id = p_round_id
    group by fl.fantasy_team_id
  ) n
  on conflict (fantasy_team_id, round_id) do nothing;

  return v_posnetih;
end;
$$;


create or replace function shrani_ekipo(
  p_team_id bigint,
  p_roster  jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cash          numeric;
  v_delta         numeric;
  v_dobicek       numeric;
  v_strosek       numeric;
  v_stari_buy     jsonb;
  v_stara_poz     jsonb;
  v_tekmovanje    bigint;
  v_tujih         int;
  v_shranjeno_ob  timestamptz;
  v_krog          record;
begin
  select cash, competition_id into v_cash, v_tekmovanje
    from fantasy_teams
   where id = p_team_id and owner_id = auth.uid();

  if v_tekmovanje is null then
    raise exception 'Ni dovoljenja za urejanje te ekipe.'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('slff-kader:' || v_tekmovanje, 0));
  -- Ponovno branje pod zaklepom preprecuje dvojno porabo pri dveh zavihkih.
  select cash into v_cash from fantasy_teams
   where id = p_team_id and owner_id = auth.uid() for update;
  v_shranjeno_ob := clock_timestamp();

  -- Cron lahko zamuja. Najprej ohranimo staro postavo, sele nato dovolimo
  -- spremembe za naslednji krog; prazen/neveljaven kader se prav tako zapre.
  for v_krog in
    select id from rounds
     where competition_id = v_tekmovanje
       and lineups_locked_at is null
       and deadline_at <= v_shranjeno_ob
       and deadline_at > v_shranjeno_ob - interval '7 days'
     order by deadline_at, id
  loop
    perform zakleni_krog(v_krog.id);
  end loop;

  if p_roster is null or jsonb_typeof(p_roster) <> 'array' then
    raise exception 'Kader mora biti seznam igralcev.' using errcode = '22023';
  end if;

  select count(*) into v_tujih
  from jsonb_array_elements(p_roster) e
  join players p on p.id = (e->>'player_id')::bigint
  where p.competition_id <> v_tekmovanje;

  if v_tujih > 0 then
    raise exception 'V ekipi so igralci iz druge lige.'
      using errcode = 'P0001';
  end if;

  select coalesce(jsonb_object_agg(player_id::text, buy_value), '{}'::jsonb)
    into v_stari_buy
    from fantasy_roster where fantasy_team_id = p_team_id;

  -- Igralec, ki v kadru ostane, obdrži mesto, na katerem je bil kupljen;
  -- novi ga dobijo po trenutni poziciji.
  select coalesce(jsonb_object_agg(player_id::text, buy_position), '{}'::jsonb)
    into v_stara_poz
    from fantasy_roster
   where fantasy_team_id = p_team_id and buy_position is not null;

  select coalesce(sum(p.value), 0)::numeric into v_dobicek
  from fantasy_roster fr
  join players p on p.id = fr.player_id
  where fr.fantasy_team_id = p_team_id
    and not exists (
      select 1
      from jsonb_array_elements(p_roster) e
      where (e->>'player_id')::bigint = fr.player_id
    );

  select coalesce(sum(p.value), 0)::numeric into v_strosek
  from jsonb_array_elements(p_roster) e
  join players p on p.id = (e->>'player_id')::bigint
  where not exists (
    select 1 from fantasy_roster fr
    where fr.fantasy_team_id = p_team_id
      and fr.player_id = (e->>'player_id')::bigint
  );

  v_delta := v_dobicek - v_strosek;

  if v_cash + v_delta < 0 then
    raise exception 'Premalo sredstev — potrebuješ še % M.', abs(v_cash + v_delta)::text
      using errcode = 'P0001';
  end if;

  delete from fantasy_roster where fantasy_team_id = p_team_id;

  insert into fantasy_roster (
    fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order,
    buy_value, buy_position
  )
  select
    p_team_id,
    (e->>'player_id')::bigint,
    coalesce((e->>'is_starter')::boolean, false),
    coalesce((e->>'is_captain')::boolean, false),
    coalesce((e->>'is_vice')::boolean, false),
    nullif(e->>'bench_order', '')::int,
    coalesce(
      (v_stari_buy ->> ((e->>'player_id')::bigint)::text)::numeric,
      (select value from players where id = (e->>'player_id')::bigint)
    ),
    coalesce(
      v_stara_poz ->> ((e->>'player_id')::bigint)::text,
      (select position from players where id = (e->>'player_id')::bigint)
    )
  from jsonb_array_elements(p_roster) e;

  update fantasy_teams
    set cash = v_cash + v_delta, roster_updated_at = v_shranjeno_ob
    where id = p_team_id;

  return jsonb_build_object(
    'cash',      v_cash + v_delta,
    'dobicek',   v_dobicek,
    'strosek',   v_strosek,
    'delta',     v_delta
  );
end;
$$;

-- 3. Pri pripomockih preverimo OBA roka ob UPDATE: sicer bi lastnik lahko
-- prestavil ze porabljen pripomocek iz starega kroga v novega.
revoke truncate, references, trigger on fantasy_chips from public, anon, authenticated;
create or replace function preveri_rok_pripomocka()
returns trigger language plpgsql security definer set search_path = public
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
create trigger fantasy_chips_preveri_rok
  before insert or update or delete on fantasy_chips
  for each row execute function preveri_rok_pripomocka();

-- 4. Mutacijske SECURITY DEFINER funkcije niso javni API. Sprozilci jih
-- se vedno klicejo kot lastnik funkcije, opravila pa prek servisne vloge.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as podpis
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (
      p.proname in (
        'zakleni_krog', 'zakleni_zapadle_kroge', 'preracunaj_cene', 'uveljavi_cene',
        'uveljavi_zapadle_cene', 'potrdi_pozicijo', 'uveljavi_pozicije',
        'potrdi_asistenco', 'pripisi_obranjene_enajstmetrovke',
        'preracunaj_igralca', 'recompute_round_scores'
      ) or p.prorettype = 'trigger'::regtype
    )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.podpis);
    execute format('grant execute on function %s to service_role', f.podpis);
  end loop;
end;
$$;
revoke all on function shrani_ekipo(bigint, jsonb) from public, anon;
grant execute on function shrani_ekipo(bigint, jsonb) to authenticated, service_role;

-- Admin stran dobi ozko vstopno tocko; osnovni preracun je interni, saj ga
-- po potrjeni asistenci potrebuje tudi sprozilec ob navadnem glasovanju.
create or replace function admin_preracunaj_krog(p_round_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko preracuna krog.' using errcode = '42501';
  end if;
  perform recompute_round_scores(p_round_id);
end;
$$;
revoke all on function admin_preracunaj_krog(bigint) from public, anon;
grant execute on function admin_preracunaj_krog(bigint) to authenticated, service_role;

-- Naslednje migracije morajo svoje javne RPC-je izrecno odpreti.
alter default privileges in schema public revoke execute on functions from anon, authenticated;
-- PUBLIC EXECUTE je globalni privzetek PostgreSQL: odvzem samo znotraj
-- sheme ga ne odstrani, zato ga odvzamemo tudi na globalni ravni.
alter default privileges revoke execute on functions from public;
