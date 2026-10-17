-- Šaljive nagrade tedenskega pregleda mini lige.
--
-- Pregled podeli nagrade kroga (Manager kroga, Kapetan kroga, Dvigalo …) in
-- tri šaljive (Lesena žlica, Prosti pad, Zlato na klopi). Te zadnje so
-- zabavne le med ljudmi, ki so se v mini ligo vpisali skupaj in se poznajo,
-- zato:
--   - lastnik mini lige jih lahko izklopi (`mini_lige.saljive_nagrade`);
--     pohvale ostanejo;
--   - pregled pove, kdo je bil zadnji v prejšnjem krogu (`zadnji_prej`), da
--     ista ekipa ne dobi žlice dva kroga zapored (vmesnik ji namesto nje
--     pokaže "Naslednji krog je tvoj");
--   - pregled pove, ali je v mini ligi ekipa mladinske lige (`mladinska`):
--     slike takrat pokažejo maskoto brez piva.
-- Pravila (vsaj 4 ekipe, izbira poze) so v `src/lib/miniLige.ts`; opis v
-- docs/podatkovni-model.md (*Nagrade tedenskega pregleda*).

alter table public.mini_lige
  add column saljive_nagrade boolean not null default true;

comment on column public.mini_lige.saljive_nagrade is
  'Tedenski pregled podeli tudi šaljive nagrade (Lesena žlica, Prosti pad, Zlato na klopi). Nastavi le lastnik prek nastavi_saljive_nagrade.';

-- Pravica do pisanja ostane, kot je (20261012139100): neposredno sme lastnik
-- spremeniti le `name`. Stikalo gre prek funkcije, ki preveri lastnika.
create or replace function public.nastavi_saljive_nagrade(p_liga bigint, p_vklop boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Za mini ligo se je treba prijaviti.' using errcode = '42501';
  end if;

  update mini_lige
     set saljive_nagrade = coalesce(p_vklop, true)
   where id = p_liga
     and owner_id = auth.uid();
  if not found then
    raise exception 'Šaljive nagrade nastavi le ustvarjalec mini lige.' using errcode = '42501';
  end if;

  return coalesce(p_vklop, true);
end;
$$;

revoke all on function public.nastavi_saljive_nagrade(bigint, boolean) from public, anon, authenticated;
grant execute on function public.nastavi_saljive_nagrade(bigint, boolean) to authenticated, service_role;

-- Pregled: isto kot 20261012137100, dodani `saljive`, `mladinska` in
-- `zadnji_prej`.
create or replace function public.tedenski_pregled_mini_lige(p_liga bigint, p_krog integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_sezona text;
  v_krog int;
  v_prej int;
  v_krogi int[];
  v_saljive boolean;
  v_mladinska boolean;
  v_rezultat jsonb;
begin
  if not sem_v_mini_ligi(p_liga) then
    return null;
  end if;

  -- Mini liga gre čez lige: mladinska je, če ima ekipo iz mladinske lige ali
  -- je javna v mladinski ligi. Takrat slike ne kažejo piva.
  select m.saljive_nagrade,
         coalesce(je_mladinska_liga(m.competition_id), false)
         or exists (
           select 1
             from mini_liga_clani c
             join fantasy_teams ft on ft.id = c.fantasy_team_id
             join competitions co on co.id = ft.competition_id
            where c.mini_liga_id = p_liga
              and je_mladinski_slug(co.slug))
    into v_saljive, v_mladinska
    from mini_lige m
   where m.id = p_liga;

  select max(k.season) into v_sezona from koncani_krogi_mini_lige(p_liga) k;
  if v_sezona is null then
    return jsonb_build_object('sezona', null, 'krog', null, 'krogi', '[]'::jsonb,
                              'saljive', coalesce(v_saljive, true), 'mladinska', coalesce(v_mladinska, false));
  end if;

  select array_agg(distinct k.number order by k.number desc) into v_krogi
    from koncani_krogi_mini_lige(p_liga) k where k.season = v_sezona;
  v_krog := case when p_krog = any (v_krogi) then p_krog else v_krogi[1] end;
  select max(x) into v_prej from unnest(v_krogi) x where x < v_krog;

  with
  krogi as (
    select * from koncani_krogi_mini_lige(p_liga) k where k.season = v_sezona
  ),
  ekipe as (
    select k.fantasy_team_id, k.round_id,
           coalesce(s.team_name, ft.name) as ekipa,
           s.owner_name as lastnik,
           s.owner_id as lastnik_id,
           frp.points as tocke,
           sme_videti_ekipo(k.fantasy_team_id) as vidna
      from krogi k
      join fantasy_teams ft on ft.id = k.fantasy_team_id
      left join fantasy_team_standings s on s.fantasy_team_id = k.fantasy_team_id
      join fantasy_round_points frp
        on frp.fantasy_team_id = k.fantasy_team_id and frp.round_id = k.round_id
     where k.number = v_krog
  ),
  -- Točke prejšnjega končanega kroga: kdo je bil takrat zadnji.
  prej as (
    select k.fantasy_team_id, frp.points as tocke
      from krogi k
      join fantasy_round_points frp
        on frp.fantasy_team_id = k.fantasy_team_id and frp.round_id = k.round_id
     where k.number = v_prej
  ),
  -- Postava po samodejnih menjavah — ista, iz katere so točke kroga.
  igrali as (
    select e.fantasy_team_id, e.vidna, u.player_id, u.mnozitelj,
           coalesce(ps.points, 0) as tocke
      from ekipe e
      cross join lateral ucinkovita_postava(e.fantasy_team_id, e.round_id) u
      left join player_scores ps on ps.round_id = e.round_id and ps.player_id = u.player_id
  ),
  -- Klop: kdor je bil v posnetku, a ga ni v učinkoviti postavi. Ven gre le vsota.
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
  kapetani as (
    select i.fantasy_team_id, i.player_id, i.tocke, i.tocke * i.mnozitelj as skupaj
      from igrali i where i.mnozitelj > 1 and i.vidna
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
    'saljive', coalesce(v_saljive, true),
    'mladinska', coalesce(v_mladinska, false),
    -- Ekipe z najmanj točkami prejšnjega kroga (vse izenačene), le če je
    -- kdo imel več — sicer zadnjega ni bilo.
    'zadnji_prej', coalesce((
      select jsonb_agg(p.fantasy_team_id order by p.fantasy_team_id)
        from prej p
       where p.tocke = (select min(tocke) from prej)
         and (select min(tocke) from prej) < (select max(tocke) from prej)
    ), '[]'::jsonb),
    'vrstice', coalesce((
      select jsonb_agg(jsonb_build_object(
               'ekipa_id', e.fantasy_team_id, 'ekipa', e.ekipa, 'lastnik', e.lastnik,
               'lastnik_id', e.lastnik_id,
               'tocke', e.tocke, 'mesto', p.mesto,
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
    'adut', null
  ) into v_rezultat;

  return v_rezultat;
end $function$;

revoke all on function public.tedenski_pregled_mini_lige(bigint, int) from public, anon;
grant execute on function public.tedenski_pregled_mini_lige(bigint, int) to authenticated, service_role;
