-- Admin: iz katere države je uporabnik.
--
-- Odkar je Slovaška odprta za vse (a294d8c), se registrirajo tudi Slovaki, v
-- seznamu uporabnikov pa jih ni bilo mogoče ločiti od Slovencev. Države ne
-- beležimo (IP se ne hrani), zato jo izpeljemo iz tega, kar že vemo:
--   * `drzave` — države lig, v katerih ima uporabnik ekipo (vse njegove
--     ekipe, ne le v izbrani ligi; hišne ekipe ne štejejo),
--   * `jezik`  — jezik ob registraciji (`raw_user_meta_data ->> 'jezik'`),
--     edini namig za tiste, ki ekipe še nimajo.
-- Isti seznam kot 20260930130000, nova stolpca sta na koncu.

drop function if exists public.admin_uporabniki(bigint);
create function public.admin_uporabniki(p_competition_id bigint default null)
returns table (
  user_id uuid,
  email text,
  display_name text,
  registered_at timestamptz,
  is_admin boolean,
  team_id bigint,
  team_name text,
  roster_stevilo integer,
  ekipa_veljavna boolean,
  insider_competition_id bigint,
  drzave text[],
  jezik text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere uporabnike.';
  end if;

  return query
  select
    u.id                                                       as user_id,
    u.email::text                                              as email,
    p.display_name                                             as display_name,
    u.created_at                                               as registered_at,
    coalesce(p.is_admin, false)                                as is_admin,
    ft.id                                                      as team_id,
    ft.name                                                    as team_name,
    coalesce(
      (select count(*)::int
         from fantasy_roster fr
         where fr.fantasy_team_id = ft.id),
      0
    )                                                          as roster_stevilo,
    coalesce(roster_je_veljaven(ft.id), false)                 as ekipa_veljavna,
    p.insider_competition_id                                   as insider_competition_id,
    coalesce(
      (select array_agg(distinct co.code order by co.code)
         from fantasy_teams vse
         join competitions c on c.id = vse.competition_id
         join countries co on co.id = c.country_id
        where vse.owner_id = u.id
          and not vse.hisna),
      '{}'::text[]
    )                                                          as drzave,
    nullif(u.raw_user_meta_data ->> 'jezik', '')               as jezik
  from auth.users u
  left join profiles p on p.id = u.id
  left join fantasy_teams ft
    on ft.owner_id = u.id
   and not ft.hisna
   and (p_competition_id is null or ft.competition_id = p_competition_id)
  order by u.created_at;
end;
$$;

revoke all on function public.admin_uporabniki(bigint) from public, anon;
grant execute on function public.admin_uporabniki(bigint) to authenticated;
