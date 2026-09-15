-- Opomnik naj gre človeku ENKRAT, ne enkrat na ligo.
--
-- Prva različica je vračala kandidate za DANO ligo. Dokler je bila liga ena,
-- je bilo to isto. Pri sedemnajstih ni: skoraj nihče nima ekipe v petnajstih
-- novih ligah, zato bi zagon čez vse lige poskusil **5.830 sporočil** — isti
-- človek bi jih dobil sedemnajst, ker varovalo proti podvajanju
-- (`nedavni_opomnik`) šteje na par (uporabnik, liga).
--
-- Izmerjeno na produkciji, preden je urnik sploh kdaj stekel:
--   353 računov · 195 brez kakršne koli ekipe · 22 začelo in ni končalo
-- Pravilna številka je torej 217 sporočil, po eno na osebo.
--
-- Zato ima vsak človek natanko eno "domačo" ligo:
--   * tisto, v kateri ima nedokončano ekipo (tam je pokazal namero), sicer
--   * privzeto ligo (najnižji `sort_order` med aktivnimi).
-- Funkcija vrne uporabnika samo pri NJEGOVI ligi, zato ga zagon čez vse lige
-- sreča enkrat.
create or replace function kandidati_za_opomnik(p_competition_id bigint)
returns table (user_id uuid, email text, display_name text, team_id bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_privzeta bigint;
begin
  select c.id into v_privzeta
    from competitions c where c.active
   order by c.sort_order, c.id limit 1;

  return query
  with brez as (
    -- Nihče, ki ima kje veljavno ekipo: ta je v igri in ga ne priganjamo.
    select u.id, u.email::text as email, p.display_name
      from auth.users u
      left join profiles p on p.id = u.id
     where u.email is not null
       and not exists (
         select 1 from fantasy_teams ft
          where ft.owner_id = u.id and coalesce(roster_je_veljaven(ft.id), false))
  ),
  domaca as (
    select b.id, b.email, b.display_name,
           coalesce(
             -- Liga, v kateri je ekipo začel; če jih je več, najstarejša.
             (select ft.competition_id from fantasy_teams ft
               join competitions c on c.id = ft.competition_id and c.active
              where ft.owner_id = b.id order by ft.created_at limit 1),
             v_privzeta
           ) as liga,
           (select ft.id from fantasy_teams ft
             where ft.owner_id = b.id order by ft.created_at limit 1) as ekipa
      from brez b
  )
  select d.id, d.email, d.display_name, d.ekipa
    from domaca d
   where d.liga = p_competition_id;
end $$;

comment on function kandidati_za_opomnik(bigint) is
  'Uporabniki brez veljavne ekipe, razvrščeni v svojo domačo ligo — zagon čez vse lige sreča vsakega natanko enkrat.';

revoke all on function kandidati_za_opomnik(bigint) from public, anon, authenticated;
grant execute on function kandidati_za_opomnik(bigint) to service_role;
