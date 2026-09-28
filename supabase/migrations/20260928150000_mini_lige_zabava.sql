-- Tedenski pregled mini lige.
--
-- Zakaj: lestvica mini lige se po krogu premakne za nekaj točk in to je vse,
-- kar se zgodi. Pogovor v skupini ("kdo je dal Kovača za kapetana?") pa
-- živi od drobnih zgodb kroga: kdo je zmagal teden, kdo je zadnji, kdo je
-- pustil dvajset točk na klopi. Vse to je že v bazi — posnetki postav,
-- točke igralcev in točke krogov — samo sestaviti ga je treba.
--
-- **Krog je številka, ne vrstica.** Mini liga gre čez lige (glej
-- 20260915120000), zato ima vsaka ekipa svoj `rounds.id`. "5. krog" pomeni
-- peti krog tekoče sezone v ligi vsake ekipe; ekipa, katere krog še ni
-- končan, v pregledu tega kroga ne nastopi.
--
-- **Zasebnost.** Funkcija teče s pravicami klicatelja: članstvo bere prek
-- `mini_liga_clani`, ki ga RLS pokaže le članom (`sem_v_mini_ligi`), in
-- tujec dobi `null`, ne napake. Ostalo, kar bere — posnetki postav po roku,
-- točke igralcev, točke krogov — je javno že danes; pregled razkrije le
-- izbor ekip, tega pa član že vidi na lestvici.

-- Končani krogi ekip mini lige. Krog je končan, ko je rok mimo in ima vsaka
-- tekma zapisnik ali kontumacijo; tekma, ki teden po datumu še nima
-- zapisnika, je prestavljena in pregleda ne zadržuje. Ekipa, ustvarjena po
-- roku, v krogu ne nastopi — `fantasy_round_points` ji sicer pripiše ničlo
-- in bila bi zadnja v krogu, v katerem sploh ni mogla igrati.
create or replace function public.koncani_krogi_mini_lige(p_liga bigint)
returns table (fantasy_team_id bigint, round_id bigint, season text, number int)
language sql
stable
set search_path = public
as $$
  select c.fantasy_team_id, r.id, r.season, r.number
    from mini_liga_clani c
    join fantasy_teams ft on ft.id = c.fantasy_team_id
    join rounds r on r.competition_id = ft.competition_id
    join fantasy_round_points frp
      on frp.fantasy_team_id = c.fantasy_team_id and frp.round_id = r.id
   where c.mini_liga_id = p_liga
     and r.deadline_at < now()
     and ft.created_at < r.deadline_at
     and exists (select 1 from matches m where m.round_id = r.id)
     and not exists (
           select 1 from matches m
            where m.round_id = r.id
              and m.zapisnik_id is null
              and not m.kontumacija
              and coalesce(m.played_on, r.played_on, r.deadline_at::date) >= current_date - 7
         );
$$;

-- Teče s pravicami klicatelja, zato tujcu RLS na `mini_liga_clani` vrne nič.
revoke all on function public.koncani_krogi_mini_lige(bigint) from public, anon;
grant execute on function public.koncani_krogi_mini_lige(bigint) to authenticated;

create or replace function public.tedenski_pregled_mini_lige(p_liga bigint, p_krog int default null)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_sezona text;
  v_krog int;
  v_krogi int[];
  v_rezultat jsonb;
begin
  if not sem_v_mini_ligi(p_liga) then
    return null;
  end if;

  select max(k.season) into v_sezona from koncani_krogi_mini_lige(p_liga) k;
  if v_sezona is null then
    return jsonb_build_object('sezona', null, 'krog', null, 'krogi', '[]'::jsonb);
  end if;

  select array_agg(distinct k.number order by k.number desc) into v_krogi
    from koncani_krogi_mini_lige(p_liga) k where k.season = v_sezona;
  v_krog := case when p_krog = any (v_krogi) then p_krog else v_krogi[1] end;

  with
  krogi as (
    select * from koncani_krogi_mini_lige(p_liga) k where k.season = v_sezona
  ),
  ekipe as (
    select k.fantasy_team_id, k.round_id,
           coalesce(s.team_name, ft.name) as ekipa,
           s.owner_name as lastnik,
           frp.points as tocke
      from krogi k
      join fantasy_teams ft on ft.id = k.fantasy_team_id
      left join fantasy_team_standings s on s.fantasy_team_id = k.fantasy_team_id
      join fantasy_round_points frp
        on frp.fantasy_team_id = k.fantasy_team_id and frp.round_id = k.round_id
     where k.number = v_krog
  ),
  -- Postava po samodejnih menjavah — ista, iz katere so točke kroga.
  igrali as (
    select e.fantasy_team_id, u.player_id, u.mnozitelj,
           coalesce(ps.points, 0) as tocke
      from ekipe e
      cross join lateral ucinkovita_postava(e.fantasy_team_id, e.round_id) u
      left join player_scores ps on ps.round_id = e.round_id and ps.player_id = u.player_id
  ),
  -- Klop: kdor je bil v posnetku, a ga ni v učinkoviti postavi.
  klop as (
    select e.fantasy_team_id, sum(coalesce(ps.points, 0)) as tocke
      from ekipe e
      join fantasy_lineups fl on fl.fantasy_team_id = e.fantasy_team_id and fl.round_id = e.round_id
      left join player_scores ps on ps.round_id = e.round_id and ps.player_id = fl.player_id
     where not exists (select 1 from igrali i
                        where i.fantasy_team_id = e.fantasy_team_id and i.player_id = fl.player_id)
     group by e.fantasy_team_id
  ),
  -- Lestvica mini lige pred krogom in po njem, iz vsote krogov te sezone.
  -- Vsi člani, tudi tisti brez točk, da mesta ustrezajo lestvici.
  skupaj as (
    select c.fantasy_team_id,
           coalesce(sum(frp.points) filter (where r.number <= v_krog), 0) as zdaj,
           coalesce(sum(frp.points) filter (where r.number <= v_krog - 1), 0) as prej
      from mini_liga_clani c
      left join fantasy_round_points frp on frp.fantasy_team_id = c.fantasy_team_id
      left join rounds r on r.id = frp.round_id and r.season = v_sezona
     where c.mini_liga_id = p_liga
     group by c.fantasy_team_id
  ),
  mesta as (
    select fantasy_team_id,
           rank() over (order by zdaj desc) as mesto,
           rank() over (order by prej desc) as mesto_prej
      from skupaj
  ),
  premiki as (
    select m.fantasy_team_id, m.mesto, m.mesto_prej - m.mesto as premik
      from mesta m
  ),
  -- Adut: igralec, ki ga je v postavi imela ena sama ekipa lige.
  aduti as (
    select i.fantasy_team_id, i.player_id, i.tocke
      from igrali i
     where (select count(distinct i2.fantasy_team_id) from igrali i2
             where i2.player_id = i.player_id) = 1
  ),
  kapetani as (
    select i.fantasy_team_id, i.player_id, i.tocke, i.tocke * i.mnozitelj as skupaj
      from igrali i where i.mnozitelj > 1
  ),
  najkapetan as (
    select * from kapetani where tocke > 0
     order by skupaj desc, fantasy_team_id limit 1
  )
  select jsonb_build_object(
    'sezona', v_sezona,
    'krog', v_krog,
    'krogi', to_jsonb(v_krogi),
    'ekip', (select count(*) from ekipe),
    'vrstice', coalesce((
      select jsonb_agg(jsonb_build_object(
               'ekipa_id', e.fantasy_team_id, 'ekipa', e.ekipa, 'lastnik', e.lastnik,
               'tocke', e.tocke, 'mesto', p.mesto,
               -- Brez prejšnjega kroga premika ni: vsi bi bili "prvi" in
               -- vsak bi napredoval.
               'premik', case when v_krog > (select min(number) from krogi)
                              then p.premik end)
               order by e.tocke desc, e.ekipa)
        from ekipe e join premiki p using (fantasy_team_id)
    ), '[]'::jsonb),
    'kapetan', (
      select jsonb_build_object('ekipa_id', k.fantasy_team_id, 'igralec_id', k.player_id,
                                'igralec', coalesce(pl.full_name, pl.first_name || ' ' || pl.last_name),
                                'tocke', k.tocke, 'skupaj', k.skupaj)
        from najkapetan k join players pl on pl.id = k.player_id
    ),
    'klop', (
      select jsonb_build_object('ekipa_id', k.fantasy_team_id, 'tocke', k.tocke)
        from klop k where k.tocke > 0
       order by k.tocke desc, k.fantasy_team_id limit 1
    ),
    'adut', (
      select jsonb_build_object('ekipa_id', a.fantasy_team_id, 'igralec_id', a.player_id,
                                'igralec', coalesce(pl.full_name, pl.first_name || ' ' || pl.last_name),
                                'tocke', a.tocke)
        from aduti a join players pl on pl.id = a.player_id
       where a.tocke > 0 and (select count(*) from ekipe) > 1
       -- Kapetan kroga je že svoja zgodba; adut naj bo, če se le da, drug.
       order by exists (select 1 from najkapetan k
                         where k.fantasy_team_id = a.fantasy_team_id and k.player_id = a.player_id),
                a.tocke desc, a.fantasy_team_id, a.player_id
       limit 1
    )
  ) into v_rezultat;

  return v_rezultat;
end $$;

comment on function public.tedenski_pregled_mini_lige(bigint, int) is
  'Zgodbe kroga v mini ligi (vrstice kroga, kapetan, klop, adut). Samo za člane; krog je številka tekoče sezone.';

revoke all on function public.tedenski_pregled_mini_lige(bigint, int) from public, anon;
grant execute on function public.tedenski_pregled_mini_lige(bigint, int) to authenticated;
