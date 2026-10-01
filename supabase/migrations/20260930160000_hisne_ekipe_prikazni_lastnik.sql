-- Izmišljeno prikazno ime lastnika je izključno servisno polje hišne ekipe.
-- Pravi lastnik in vse izključitve hišnih ekip ostanejo nespremenjeni.
alter table public.fantasy_teams add column fake_name text;
alter table public.fantasy_teams add constraint fantasy_teams_fake_name_hisna
  check (fake_name is null or (hisna and length(btrim(fake_name)) between 1 and 80));
comment on column public.fantasy_teams.fake_name is
  'Neobvezno izmišljeno prikazno ime lastnika hišne ekipe. Samo servis; NULL skrije ime.';
-- INSERT/UPDATE sta že omejena na posamezne vnosne stolpce. Novega ne odpremo.
revoke insert (fake_name), update (fake_name) on public.fantasy_teams from anon, authenticated;

-- Stabilno ime po ID-ju in državi lige. Kombinacije imen niso uporabniški profili.
create function public.ime_hisnega_lastnika(p_id bigint, p_competition_id bigint)
returns text language sql stable set search_path = public as $$
  select
    (case when coalesce(d.code, 'SI') = 'SK' then
      array['Martin','Peter','Lukáš','Tomáš','Michal','Ján','Marek','Jozef',
            'Samuel','Jakub','Filip','Adam','Patrik','Dominik','Matej','Pavol']
    else
      array['Luka','Matej','Marko','Rok','Jan','Miha','Nejc','Žan',
            'Andrej','Blaž','Jure','Tomaž','Gregor','Aljaž','David','Anže']
    end)[1 + ((p_id % 256 + 256) % 16)::int]
    || ' ' ||
    (case when coalesce(d.code, 'SI') = 'SK' then
      array['Kováč','Horváth','Varga','Tóth','Nagy','Baláž','Molnár','Lukáč',
            'Polák','Kučera','Urban','Kollár','Šimko','Bartoš','Hudák','Mikula']
    else
      array['Novak','Horvat','Kovačič','Krajnc','Zupančič','Potočnik','Kovač','Mlakar',
            'Vidmar','Kos','Golob','Turk','Božič','Korošec','Zupan','Rozman']
    end)[1 + (((p_id % 256 + 256) % 256) / 16)::int]
  from competitions c left join countries d on d.id = c.country_id
  where c.id = p_competition_id;
$$;
revoke all on function public.ime_hisnega_lastnika(bigint, bigint) from public, anon, authenticated;
grant execute on function public.ime_hisnega_lastnika(bigint, bigint) to service_role;

create function public.dodeli_ime_hisnega_lastnika() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.hisna and new.fake_name is null then
    new.fake_name := ime_hisnega_lastnika(new.id, new.competition_id);
  end if;
  return new;
end;
$$;
revoke all on function public.dodeli_ime_hisnega_lastnika() from public, anon, authenticated;
create trigger fantasy_teams_ime_hisnega_lastnika
  before insert on public.fantasy_teams
  for each row execute function public.dodeli_ime_hisnega_lastnika();

-- Obstoječe hišne ekipe dobijo ime enkrat; servis ga lahko pozneje odstrani.
update public.fantasy_teams
set fake_name = public.ime_hisnega_lastnika(id, competition_id)
where hisna and fake_name is null;

create or replace view public.fantasy_team_standings as
 SELECT ft.id AS fantasy_team_id,
    ft.name AS team_name,
    case when ft.hisna then ft.fake_name else pr.display_name end AS owner_name,
    pr.created_at AS owner_registered_at,
    ft.created_at AS team_created_at,
    COALESCE(sum(frp.points), (0)::numeric) AS total_points,
    COALESCE(max(frp.points), (0)::numeric) AS best_round,
    count(*) FILTER (WHERE (frp.points > (0)::numeric)) AS rounds_played,
    ft.competition_id,
    ft.hisna
   FROM ((public.fantasy_teams ft
     JOIN public.profiles pr ON ((pr.id = ft.owner_id)))
     LEFT JOIN public.fantasy_round_points frp ON ((frp.fantasy_team_id = ft.id)))
  GROUP BY ft.id, ft.name, pr.display_name, pr.created_at, ft.created_at, ft.competition_id, ft.hisna;

create or replace view public.fantasy_round_standings
as
select
  frp.round_id,
  frp.season,
  frp.round_number,
  frp.fantasy_team_id,
  ft.name as team_name,
  case when ft.hisna then ft.fake_name else pr.display_name end as owner_name,
  frp.points,
  frp.transfers,
  frp.penalty,
  rank() over (partition by frp.competition_id, frp.round_id order by frp.points desc) as rank,
  frp.competition_id
from public.fantasy_round_points frp
join public.fantasy_teams ft on ft.id = frp.fantasy_team_id
join public.profiles pr on pr.id = ft.owner_id
where exists (select 1 from public.player_scores ps where ps.round_id = frp.round_id);
