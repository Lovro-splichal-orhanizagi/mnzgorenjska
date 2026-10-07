-- Tedenski mail "Tvoj krog": po koncanem krogu vsakemu lastniku ekipe njegove
-- tocke, mesto na lestvici lige (in premik), kapetan in najboljsi igralec.
--
-- Krog je koncan, ko je rok mimo, ima tekme in nobeni tekmi zadnjih sedmih
-- dni ne manjka zapisnik (enako kot `koncani_krogi_mini_lige`). Mail gre le
-- za sveze kroge (rok v zadnjih desetih dneh), da prvi zagon po vklopu ne
-- poslje pregleda kroga izpred meseca.
--
-- Prejme ga, kdor je imel v krogu postavo (posnetek v `fantasy_lineups`) in
-- se ni odjavil (`brez_opomnikov`). Hisne ekipe nimajo komu pisati. Kdor je
-- mail za ta krog ze dobil (`email_log` z `round_id`), ga ne dobi znova.
--
-- Bere e-naslove iz auth.users, zato le servisni kljuc.

create or replace function public.tedenski_pregled_ekip(p_competition_id bigint)
returns table (
  user_id uuid,
  email text,
  display_name text,
  fantasy_team_id bigint,
  ekipa text,
  round_id bigint,
  krog int,
  tocke numeric,
  mesto bigint,
  mesto_prej bigint,
  ekip bigint,
  povprecje numeric,
  najvec numeric,
  kapetan text,
  kapetan_tocke numeric,
  najboljsi text,
  najboljsi_tocke numeric
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_krog record;
begin
  select r.id, r.season, r.number, r.deadline_at into v_krog
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.competition_id = p_competition_id
     and r.number >= coalesce(c.prvi_fantasy_krog, 1)
     and r.deadline_at < now()
     and r.deadline_at > now() - interval '10 days'
     and exists (select 1 from matches m where m.round_id = r.id)
     and exists (select 1 from player_scores ps where ps.round_id = r.id)
     and not exists (
           select 1 from matches m
            where m.round_id = r.id
              and m.zapisnik_id is null
              and not m.kontumacija
              and coalesce(m.played_on, r.played_on, r.deadline_at::date) >= current_date - 7)
   order by r.deadline_at desc
   limit 1;
  if v_krog.id is null then
    return;
  end if;

  return query
  with
  -- Lestvica lige pred krogom in po njem (vse ekipe, tudi hisne: tako kot
  -- jo vidijo na strani).
  skupaj as (
    select frp.fantasy_team_id,
           sum(frp.points) filter (where frp.round_number <= v_krog.number) as zdaj,
           coalesce(sum(frp.points) filter (where frp.round_number < v_krog.number), 0) as prej,
           bool_or(frp.round_number < v_krog.number) as je_imela_prej
      from fantasy_round_points frp
     where frp.competition_id = p_competition_id and frp.season = v_krog.season
     group by frp.fantasy_team_id
  ),
  mesta as (
    select s.fantasy_team_id,
           rank() over (order by s.zdaj desc) as mesto,
           rank() over (order by s.prej desc) as mesto_prej,
           s.je_imela_prej
      from skupaj s
  ),
  krog as (
    select frp.fantasy_team_id, frp.points
      from fantasy_round_points frp
     where frp.round_id = v_krog.id
       and exists (select 1 from fantasy_lineups fl
                    where fl.fantasy_team_id = frp.fantasy_team_id and fl.round_id = v_krog.id)
  ),
  statistika as (
    select round(avg(k.points), 1) as povprecje, max(k.points) as najvec, count(*) as ekip
      from krog k
  ),
  prejemniki as (
    select ft.id, ft.name, ft.owner_id, u.email::text as email, pr.display_name, k.points
      from krog k
      join fantasy_teams ft on ft.id = k.fantasy_team_id
      join auth.users u on u.id = ft.owner_id
      left join profiles pr on pr.id = ft.owner_id
     where not ft.hisna
       and u.email is not null
       and not coalesce(pr.brez_opomnikov, false)
       and not exists (select 1 from email_log el
                        where el.user_id = ft.owner_id
                          and el.vrsta = 'tedenski-pregled'
                          and el.round_id = v_krog.id
                          and el.competition_id = p_competition_id
                          and el.napaka is null)
  ),
  igrali as (
    select p.id as ekipa_id, u.player_id, u.mnozitelj, coalesce(ps.points, 0) as tocke
      from prejemniki p
      cross join lateral ucinkovita_postava(p.id, v_krog.id) u
      left join player_scores ps on ps.round_id = v_krog.id and ps.player_id = u.player_id
  )
  select p.owner_id, p.email, p.display_name, p.id, p.name,
         v_krog.id, v_krog.number, p.points,
         m.mesto,
         -- Kdor pred tem krogom ni imel tock, nima prejsnjega mesta.
         case when m.je_imela_prej then m.mesto_prej end,
         (select count(*) from mesta),
         st.povprecje, st.najvec,
         kap.ime, kap.tocke,
         naj.ime, naj.tocke
    from prejemniki p
    join mesta m on m.fantasy_team_id = p.id
    cross join statistika st
    left join lateral (
      select coalesce(pl.full_name, pl.first_name || ' ' || pl.last_name) as ime,
             i.tocke * i.mnozitelj as tocke
        from igrali i join players pl on pl.id = i.player_id
       where i.ekipa_id = p.id and i.mnozitelj > 1
       order by i.mnozitelj desc limit 1
    ) kap on true
    left join lateral (
      select coalesce(pl.full_name, pl.first_name || ' ' || pl.last_name) as ime, i.tocke
        from igrali i join players pl on pl.id = i.player_id
       where i.ekipa_id = p.id and i.tocke > 0
       order by i.tocke desc, pl.id limit 1
    ) naj on true
   order by p.id;
end $$;

revoke all on function public.tedenski_pregled_ekip(bigint) from public, anon, authenticated;
grant execute on function public.tedenski_pregled_ekip(bigint) to service_role;
