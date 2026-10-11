-- Razdeli igralce, v katerih je uvoz zlil dva soimenjaka različnih klubov.
--
-- Vir brez šifre igralca (fsb, fss, fssid, NZS, stari CMS MNZ) pozna le ime
-- in klub. Uvoz je istoimenskega igralca drugega kluba v isti ligi imel za
-- prestop, tudi kadar sta igrala hkrati: Petrović Lazar (rs-srpska-istok,
-- 127766) je bil vratar Morave 1918 in igralec v polju Malošišta v istih
-- krogih 1–3, njegove točke so bile vsota obeh. Uvoz po tej spremembi tak
-- prestop zavrne (scripts/prestop.mjs); ta migracija doda orodje, ki že zlite
-- igralce razdeli. Kliče ga scripts/razdeli-zlite-igralce.mjs (delovni tok
-- *Razdeli zlite igralce*), najprej brez pisanja.
--
-- Zlit je igralec brez šifre vira s TRKOM: nastopa za dva kluba na isti dan
-- ali v istem krogu največ 6 dni narazen (`trk` v scripts/prestop.mjs). Isti
-- krog tedne narazen je prestavljena tekma po prestopu (Bijelović, Superliga)
-- — to ni zlitje. Igralec s šifro (`reg_st`) je ena oseba po šifri zveze:
-- dva kluba v istem krogu so tam dvojna registracija, prestop s prestavljeno
-- tekmo ali krogi faz z isto številko — ne delimo ga. Prepletena obdobja brez
-- trka (posoja in vrnitev, A → B → A) niso zlitje.
--
-- Razdelitev: gruča je klub (team_id nastopa). Id igralca ostane gruči kluba,
-- ki ga imajo lastniki fantasy ekip, kadar se to da ugotoviti (pozicija ob
-- nakupu: vratar/polje loči natanko eno gručo; sicer klub zadnjega kroga pred
-- prvim posnetkom postave, če je v tem krogu igral le za en klub), sicer
-- gruči trenutnega kluba (`players.team_id`). Klubi brez trka ostanejo pri
-- njem. Vsak drug klub s trkom dobi svojega igralca (obstoječega soimenjaka
-- tega kluba, če je natanko eden, sicer novega) z nastopi, goli, asistencami
-- in glasovi za odprte asistence svojih tekem. Kader, posnetki postav, cene,
-- glasovi za pozicijo in poročila ostanejo pri id-ju. Točke krogov se
-- preračunajo (`recompute_round_scores`), statistika in točke fantasy krogov
-- po sprožilcih. `zdruzi-duplikate.mjs` zapisov s trkom ne zlije nazaj.

-- Kandidati: igralci z nastopi za več klubov v istem krogu ali na isti dan.
create or replace function public.zliti_igralci(p_liga text default null, p_vir text default null)
returns table (
  player_id bigint, liga text, vir text, aktivna boolean, ime text, reg_st bigint,
  klubov int, krogov_v_sporu int, preskok text
)
language sql
stable
set search_path = public
as $$
  with n as (
    select a.player_id, a.team_id, coalesce(m.played_on, r.played_on) as dan, r.season, r.number
    from appearances a
    join matches m on m.id = a.match_id
    join rounds r on r.id = m.round_id
    join competitions c on c.id = r.competition_id
    where (p_liga is null or c.slug = p_liga) and (p_vir is null or c.source = p_vir)
  ),
  g as (
    select n.player_id, n.season, n.number from n
    group by 1, 2, 3 having count(distinct n.team_id) > 1
  ),
  gn as (
    select n.* from n join g on g.player_id = n.player_id and g.season = n.season and g.number = n.number
  ),
  krog as (
    select a.player_id, count(distinct (a.season, a.number))::int as krogov,
           bool_or(a.dan is null or b.dan is null or abs(a.dan - b.dan) <= 6) as blizu
    from gn a join gn b on b.player_id = a.player_id and b.season = a.season
                       and b.number = a.number and b.team_id <> a.team_id
    group by 1
  ),
  dan as (
    select distinct n.player_id from n where n.dan is not null
    group by n.player_id, n.dan having count(distinct n.team_id) > 1
  ),
  kand as (select krog.player_id from krog union select dan.player_id from dan)
  select p.id, c.slug, c.source, c.active, p.full_name, p.reg_st,
         (select count(distinct a.team_id)::int from appearances a
           join matches m on m.id = a.match_id join rounds r on r.id = m.round_id
          where a.player_id = p.id),
         coalesce((select krog.krogov from krog where krog.player_id = p.id), 0),
         case
           when p.reg_st is not null then 'sifra'
           when p.anonimiziran_at is not null then 'anonimiziran'
           when not exists (select 1 from dan where dan.player_id = p.id)
            and not coalesce((select krog.blizu from krog where krog.player_id = p.id), false)
             then 'prestavljena-tekma'
         end
  from kand
  join players p on p.id = kand.player_id
  join competitions c on c.id = p.competition_id
  order by c.source, c.slug, p.id
$$;

create or replace function public.razdeli_zlitega_igralca(p_igralec bigint, p_pisi boolean default false)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  p players%rowtype;
  v_ohrani bigint;
  v_pravilo text;
  v_lastnikov int;
  v_poz text[];
  v_kandidati bigint[];
  v_cas timestamptz;
  v_zadnja text;
  v_ohrani_vratar boolean;
  v_dres int;
  kl record;
  v_novi bigint;
  v_kako text;
  v_tekme bigint[];
  v_nastopov int;
  v_golov int;
  v_asistenc int;
  v_glasov int;
  v_krogi bigint[] := '{}';
  v_novi_json jsonb := '[]';
  v_klubi jsonb;
  v_krog bigint;
begin
  select * into p from players where id = p_igralec for update;
  if not found then
    return jsonb_build_object('igralec', p_igralec, 'stanje', 'ni-igralca');
  end if;
  if p.reg_st is not null then
    return jsonb_build_object('igralec', p.id, 'ime', p.full_name, 'stanje', 'sifra');
  end if;
  if p.anonimiziran_at is not null then
    return jsonb_build_object('igralec', p.id, 'ime', p.full_name, 'stanje', 'anonimiziran');
  end if;

  if to_regclass('pg_temp._zliti_n') is not null then drop table pg_temp._zliti_n; end if;
  if to_regclass('pg_temp._zliti_k') is not null then drop table pg_temp._zliti_k; end if;
  create temp table _zliti_n on commit drop as
    select a.id, a.match_id, a.team_id, a.is_goalkeeper, a.shirt_number,
           coalesce(m.played_on, rr.played_on) as dan, m.round_id, rr.season, rr.number
    from appearances a
    join matches m on m.id = a.match_id
    join rounds rr on rr.id = m.round_id
    where a.player_id = p.id;
  create temp table _zliti_k on commit drop as
    select n.team_id, min(n.dan) as od, max(n.dan) as do_, count(*)::int as nastopov,
           count(*) filter (where n.is_goalkeeper)::int as vratar,
           (array_agg(n.shirt_number order by n.dan desc nulls last, n.id desc)
              filter (where n.shirt_number is not null))[1] as dres,
           -- Trk (kot `trk` v scripts/prestop.mjs): isti dan ali isti krog
           -- največ 6 dni narazen. (Brez UPDATE brez WHERE: PostgREST ima
           -- safeupdate, ki ga zavrne.)
           exists (
             select 1 from _zliti_n a join _zliti_n b on b.team_id <> a.team_id
             where a.team_id = n.team_id
               and (a.dan = b.dan
                    or (a.season = b.season and a.number = b.number
                        and coalesce(abs(a.dan - b.dan) <= 6, true)))) as spor
    from _zliti_n n group by n.team_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'klub', k.team_id, 'ime', t.name, 'od', k.od, 'do', k.do_,
           'nastopov', k.nastopov, 'vratar', k.vratar, 'trk', k.spor)
           order by k.od), '[]')
    into v_klubi
    from _zliti_k k join teams t on t.id = k.team_id;

  if not exists (select 1 from _zliti_k where spor) then
    return jsonb_build_object('igralec', p.id, 'ime', p.full_name, 'stanje', 'brez-spora',
                              'klubi', v_klubi);
  end if;

  -- Katera gruča obdrži id (in z njim kadre, posnetke in ceno)?
  select count(*) into v_lastnikov from (
    select fantasy_team_id from fantasy_roster where player_id = p.id
    union
    select fantasy_team_id from fantasy_lineups where player_id = p.id) x;

  if v_lastnikov > 0 then
    -- 1. Pozicija ob nakupu: lastnik je kupil vratarja ali igralca v polju.
    select array_agg(distinct x.poz) into v_poz from (
      select buy_position as poz from fantasy_roster where player_id = p.id
      union all
      select position from fantasy_lineups where player_id = p.id) x
    where x.poz is not null;
    if v_poz = array['GK'] then
      select array_agg(team_id) into v_kandidati from _zliti_k where vratar * 2 > nastopov;
    elsif v_poz is not null and not ('GK' = any (v_poz)) then
      select array_agg(team_id) into v_kandidati from _zliti_k where vratar * 2 <= nastopov;
    end if;
    if cardinality(v_kandidati) = 1 then
      v_ohrani := v_kandidati[1];
      v_pravilo := 'pozicija-ob-nakupu';
    else
      -- 2. Klub ob nakupu: zadnji krog pred prvim posnetkom postave (ali
      -- shrambo kadra), če je v njem igral le za en klub.
      select min(x.t) into v_cas from (
        select min(captured_at) as t from fantasy_lineups where player_id = p.id
        union all
        select min(ft.roster_updated_at) from fantasy_roster fr
          join fantasy_teams ft on ft.id = fr.fantasy_team_id
         where fr.player_id = p.id) x;
      v_kandidati := null;
      if v_cas is not null then
        select array_agg(distinct n.team_id) into v_kandidati
        from _zliti_n n
        where (n.season, n.number) = (
          select z.season, z.number from _zliti_n z
          where z.dan < v_cas::date order by z.dan desc, z.id desc limit 1);
      end if;
      if cardinality(v_kandidati) = 1 then
        v_ohrani := v_kandidati[1];
        v_pravilo := 'klub-ob-nakupu';
      end if;
    end if;
  end if;

  if v_ohrani is null then
    if exists (select 1 from _zliti_k where team_id = p.team_id) then
      v_ohrani := p.team_id;
      v_pravilo := case when v_lastnikov > 0 then 'trenutni-klub (nakup nedolocljiv)' else 'trenutni-klub' end;
    else
      select team_id into v_ohrani from _zliti_k order by do_ desc nulls last, nastopov desc, team_id limit 1;
      v_pravilo := 'zadnji-nastop';
    end if;
  end if;

  select max(rr.season) into v_zadnja from rounds rr where rr.competition_id = p.competition_id;

  for kl in
    select k.*, t.name as klub_ime from _zliti_k k join teams t on t.id = k.team_id
    where k.spor and k.team_id <> v_ohrani
    order by k.od, k.team_id
  loop
    select array_agg(n.match_id) into v_tekme from _zliti_n n where n.team_id = kl.team_id;

    -- Soimenjak tega kluba že obstaja (uvoz ga je ustvaril po popravku):
    -- natanko eden, brez šifre in brez skupne tekme s temi nastopi.
    v_novi := null;
    select min(x.id) into v_novi from players x
     where x.competition_id = p.competition_id and x.team_id = kl.team_id
       and x.full_name = p.full_name and x.id <> p.id
       and x.reg_st is null and x.anonimiziran_at is null
    having count(*) = 1;
    if v_novi is not null and exists (
         select 1 from appearances a where a.player_id = v_novi and a.match_id = any (v_tekme)) then
      v_novi := null;
    end if;
    v_kako := case when v_novi is null then 'nov' else 'obstojec' end;

    select count(*) into v_nastopov from _zliti_n n where n.team_id = kl.team_id;
    select count(*) into v_golov from goals g
     where g.scorer_id = p.id and g.match_id = any (v_tekme);
    select count(*) into v_asistenc from goals g
     where g.assist_player_id = p.id and g.match_id = any (v_tekme);

    if p_pisi then
      if v_novi is null then
        insert into players (competition_id, team_id, first_name, last_name, full_name,
                             shirt_number, position, position_source, active)
        values (p.competition_id, kl.team_id, p.first_name, p.last_name, p.full_name, kl.dres,
                case when kl.vratar * 2 > kl.nastopov then 'GK' end,
                case when kl.vratar * 2 > kl.nastopov then 'zapisnik' else 'neznano' end,
                p.active and exists (select 1 from _zliti_n n
                                     where n.team_id = kl.team_id and n.season = v_zadnja))
        returning id into v_novi;
      end if;

      update appearances set player_id = v_novi
       where player_id = p.id and team_id = kl.team_id;
      update goals set scorer_id = v_novi
       where scorer_id = p.id and match_id = any (v_tekme);
      -- Glasovi za asistenco le pri odprtih golih: o odločenem je glasovanje
      -- zaprto (trg_assist_vote_zaklep) in glas ne šteje več.
      update assist_votes v set player_id = v_novi
        from goals g
       where v.player_id = p.id and g.id = v.goal_id and g.match_id = any (v_tekme)
         and g.assist_player_id is null and g.assist_none_confirmed_at is null
         and not g.is_penalty and not g.is_own_goal;
      get diagnostics v_glasov = row_count;
      update goals set assist_player_id = v_novi
       where assist_player_id = p.id and match_id = any (v_tekme);

    end if;
    v_krogi := v_krogi || array(select distinct n.round_id from _zliti_n n where n.team_id = kl.team_id);

    v_novi_json := v_novi_json || jsonb_build_object(
      'klub', kl.team_id, 'ime_kluba', kl.klub_ime, 'igralec', v_novi, 'zapis', v_kako,
      'nastopov', v_nastopov, 'golov', v_golov, 'asistenc', v_asistenc,
      'vratar', kl.vratar * 2 > kl.nastopov);
  end loop;

  -- Ostanek: klub, pozicija iz zapisnika in dres po svojih nastopih.
  select coalesce(sum(k.vratar) * 2 > sum(k.nastopov), false) into v_ohrani_vratar
    from _zliti_k k where k.team_id = v_ohrani or not k.spor;
  select n.shirt_number into v_dres from _zliti_n n
   where n.team_id = v_ohrani and n.shirt_number is not null
   order by n.dan desc nulls last, n.id desc limit 1;

  if p_pisi then
    update players set
      team_id = v_ohrani,
      shirt_number = coalesce(v_dres, shirt_number),
      position = case
        when position_source not in ('zapisnik', 'neznano', 'ugibanje') then position
        when v_ohrani_vratar then 'GK'
        when position = 'GK' then null
        else position end,
      position_source = case
        when position_source not in ('zapisnik', 'neznano', 'ugibanje') then position_source
        when v_ohrani_vratar then 'zapisnik'
        when position = 'GK' then 'neznano'
        else position_source end
    where id = p.id;

    for v_krog in select distinct x from unnest(v_krogi) x loop
      perform recompute_round_scores(v_krog);
    end loop;
  end if;

  return jsonb_build_object(
    'igralec', p.id, 'ime', p.full_name, 'liga', p.competition_id,
    'stanje', case when p_pisi then 'razdeljen' else 'nacrt' end,
    'ohrani', jsonb_build_object('klub', v_ohrani, 'pravilo', v_pravilo, 'vratar', v_ohrani_vratar,
                                 'lastnikov', v_lastnikov),
    'klubi', v_klubi,
    'novi', v_novi_json,
    'krogov', coalesce(cardinality(array(select distinct x from unnest(v_krogi) x)), 0));
end;
$$;

revoke all on function public.zliti_igralci(text, text) from public, anon, authenticated;
revoke all on function public.razdeli_zlitega_igralca(bigint, boolean) from public, anon, authenticated;
grant execute on function public.zliti_igralci(text, text) to service_role;
grant execute on function public.razdeli_zlitega_igralca(bigint, boolean) to service_role;
