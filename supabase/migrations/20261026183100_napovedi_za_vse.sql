-- Napovedi za vse: lestvica napovedi lige, izbira skupnosti, obisk strani.
--
-- Doslej so napovedi tekmovale le v mini ligah (20261026153100), dve tretjini
-- igralcev pa nista v nobeni. Stran /predictions ima zdaj lestvico napovedi
-- cele lige (tekoča sezona) in po roku "izbiro skupnosti": delež napovedi
-- domači / remi / gostje po tekmah kroga.
--
-- Napovedujejo lastniki nehišnih ekip lige (tako kot doslej `shrani_napoved`).
-- Lestvica šteje le tiste z vsaj eno napovedjo, točkuje kot
-- `lestvica_napovedi_mini_lige` (točen 3, razplet 1, kontumacija in tekma
-- brez izida ne štejeta) in vrne le prikazno ime, nikoli user_id. Imena so
-- javna že na glavni lestvici lige, zato jo smejo brati tudi neprijavljeni.

-- Lestvica napovedi lige: vrh 50 in klicateljeva vrstica (`je_moj`), če je
-- nižje. `mesto` je skupno pri enakih točkah in točnih izidih. `p_krog`
-- (številka kroga tekoče sezone) da lestvico enega kroga, takrat le tisti,
-- ki so ta krog napovedovali.
create or replace function public.lestvica_napovedi_lige(p_tekmovanje bigint, p_krog int default null)
returns table (mesto int, display_name text, tocke int, tocnih int, razpletov int, ocenjenih int, je_moj boolean)
language sql stable
security definer
set search_path = public
as $$
  with napovedi_lige as (
    select n.user_id,
           case when not m.kontumacija and izid_znan(m.imported_at, m.statistics_status)
                then tocke_napovedi(n.home_goals, n.away_goals, m.home_goals, m.away_goals) end as t
      from rounds r
      join matches m on m.round_id = r.id
      join napovedi n on n.match_id = m.id
     where r.competition_id = p_tekmovanje
       and r.season = sezona_lige(p_tekmovanje)
       and (p_krog is null or r.number = p_krog)
       and exists (select 1 from fantasy_teams ft
                    where ft.owner_id = n.user_id and ft.competition_id = p_tekmovanje
                      and not ft.hisna)
  ),
  sestevki as (
    select o.user_id,
           coalesce(sum(o.t), 0)::int as tocke,
           (count(*) filter (where o.t = 3))::int as tocnih,
           (count(*) filter (where o.t = 1))::int as razpletov,
           count(o.t)::int as ocenjenih
      from napovedi_lige o
     group by o.user_id
  ),
  razvrsceni as (
    select s.*, p.display_name,
           (rank() over (order by s.tocke desc, s.tocnih desc))::int as mesto,
           row_number() over (order by s.tocke desc, s.tocnih desc, p.display_name, s.user_id) as vrsta,
           s.user_id = auth.uid() as je_moj
      from sestevki s
      join profiles p on p.id = s.user_id
  )
  select r.mesto, r.display_name, r.tocke, r.tocnih, r.razpletov, r.ocenjenih, coalesce(r.je_moj, false)
    from razvrsceni r
   where r.vrsta <= 50 or r.je_moj
   order by r.vrsta
$$;

-- Krogi tekoče sezone, katerih rok je potekel in imajo vsaj eno napoved
-- (za izbiro kroga na lestvici in za izbiro skupnosti). Najnovejši prvi.
create or replace function public.krogi_napovedi_lige(p_tekmovanje bigint)
returns table (krog int, round_id bigint)
language sql stable
security definer
set search_path = public
as $$
  select r.number, r.id
    from rounds r
   where r.competition_id = p_tekmovanje
     and r.season = sezona_lige(p_tekmovanje)
     and rok_napovedi(r.id) <= now()
     and exists (select 1 from matches m join napovedi n on n.match_id = m.id
                  where m.round_id = r.id)
   order by r.number desc, r.id desc
$$;

-- Izbira skupnosti po tekmah kroga: koliko napovedi je za domače, remi in
-- goste. Le po roku kroga (prej bi razkrila tuje napovedi) in le tekme z
-- vsaj tremi napovedmi (manj bi izdalo posameznika). Šteje lastnike
-- nehišnih ekip lige tekme.
create or replace function public.skupnost_napovedi_kroga(p_round bigint)
returns table (match_id bigint, n int, doma int, remi int, gostje int)
language sql stable
security definer
set search_path = public
as $$
  select m.id,
         count(*)::int,
         (count(*) filter (where n.home_goals > n.away_goals))::int,
         (count(*) filter (where n.home_goals = n.away_goals))::int,
         (count(*) filter (where n.home_goals < n.away_goals))::int
    from rounds r
    join matches m on m.round_id = r.id
    join napovedi n on n.match_id = m.id
   where r.id = p_round
     and rok_napovedi(r.id) <= now()
     and exists (select 1 from fantasy_teams ft
                  where ft.owner_id = n.user_id and ft.competition_id = r.competition_id
                    and not ft.hisna)
   group by m.id
  having count(*) >= 3
   order by m.id
$$;

revoke all on function public.lestvica_napovedi_lige(bigint, int) from public;
revoke all on function public.krogi_napovedi_lige(bigint) from public;
revoke all on function public.skupnost_napovedi_kroga(bigint) from public;
grant execute on function public.lestvica_napovedi_lige(bigint, int) to anon, authenticated;
grant execute on function public.krogi_napovedi_lige(bigint) to anon, authenticated;
grant execute on function public.skupnost_napovedi_kroga(bigint) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Obiski: nova stran 'napovedi' (/predictions)
-- ---------------------------------------------------------------------------
create or replace function public.zabelezi_obisk(p_stran text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ustvarjen timestamptz;
  v_skupina text;
begin
  if p_stran not in (
    'domov', 'vstop_drzave', 'moja_ekipa', 'igralci', 'igralec', 'lestvica',
    'slovenija', 'mini_lige', 'vstop_v_mini_ligo', 'ekipa', 'klub', 'rezultati',
    'tekma', 'glasovanje', 'pozicije', 'odsotnosti', 'racun', 'opomniki',
    'pravno', 'prijava', 'potrditev', 'tabela', 'profil', 'napovedi'
  ) then
    return;
  end if;

  -- Neprijavljen nima vrstice; `auth.uid()` je takrat null.
  select created_at into v_ustvarjen from auth.users where id = auth.uid();

  v_skupina := case
    when v_ustvarjen is null then 'neprijavljen'
    when v_ustvarjen > now() - interval '7 days' then 'nov'
    else 'star'
  end;

  insert into obiski_dnevno (dan, stran, skupina, stevilo)
  values (current_date, p_stran, v_skupina, 1)
  on conflict (dan, stran, skupina) do update
    set stevilo = obiski_dnevno.stevilo + 1;
end;
$$;
revoke all on function public.zabelezi_obisk(text) from public;
grant execute on function public.zabelezi_obisk(text) to anon, authenticated;
