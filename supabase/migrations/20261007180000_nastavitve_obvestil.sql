-- Nastavitve obvestil: e-pošta in potisna obvestila ločeno.
--
-- Doslej je `brez_opomnikov` zaprl vse: push je šel le za uspelim mailom.
-- Zdaj sta kanala neodvisna:
--   * `brez_opomnikov` — brez opomnikov po e-pošti (kot doslej),
--   * `brez_push`      — brez potisnih obvestil v mobilni aplikaciji.
-- Kandidati za opomnik in opozorilo so zato vsi, ki imajo vklopljen vsaj en
-- kanal; funkcija vrne, kateri (`email_vklop`, `push_vklop`). Push šteje kot
-- vklopljen le, če ima človek napravo v `push_tokens` — sicer bi vsak spletni
-- uporabnik z izklopljeno pošto postal kandidat brez kanala.
--
-- Novo je tudi tedensko potisno obvestilo "še nimaš ekipe" (`opomnik-push`):
-- 24 ur pred rokom kroga, enkrat na krog, le prek push.

alter table public.profiles
  add column if not exists brez_push boolean not null default false;

comment on column public.profiles.brez_push is
  'Uporabnik ne želi potisnih obvestil v mobilni aplikaciji.';

grant update (brez_push) on public.profiles to authenticated;

-- Kateri kanal je sporočilo doseglo. Vrstica brez napake šteje za poslano
-- (`nedavni_opomnik`, enkrat na krog), ne glede na kanal.
alter table public.email_log
  add column if not exists kanal text not null default 'email'
  check (kanal in ('email', 'push', 'oba'));

-- ---------------------------------------------------------------------------
-- Opomnik (ni veljavne ekipe)
-- ---------------------------------------------------------------------------

drop function public.kandidati_za_opomnik(bigint);

create function public.kandidati_za_opomnik(p_competition_id bigint)
 RETURNS TABLE(user_id uuid, email text, display_name text, team_id bigint, jezik text,
               email_vklop boolean, push_vklop boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_privzeta bigint;
begin
  select c.id into v_privzeta
    from competitions c
    left join fantasy_teams ft on ft.competition_id = c.id and not ft.hisna
   where c.active
   group by c.id, c.sort_order
   order by count(ft.id) desc, c.sort_order, c.id
   limit 1;

  return query
  with kanali as (
    select u.id, u.email::text as email, p.display_name,
           u.raw_user_meta_data->>'jezik' as jezik,
           (u.email is not null and not coalesce(p.brez_opomnikov, false)) as email_vklop,
           (not coalesce(p.brez_push, false)
             and exists (select 1 from push_tokens pt where pt.user_id = u.id)) as push_vklop
      from auth.users u
      left join profiles p on p.id = u.id
  ),
  brez as (
    select k.*
      from kanali k
     where (k.email_vklop or k.push_vklop)
       and not exists (select 1 from fantasy_teams h where h.owner_id = k.id and h.hisna)
       and not exists (
         select 1 from fantasy_teams ft
          where ft.owner_id = k.id and coalesce(roster_je_veljaven(ft.id), false))
  ),
  domaca as (
    select b.*,
           coalesce(
             (select ft.competition_id from fantasy_teams ft
               join competitions c on c.id = ft.competition_id and c.active
              where ft.owner_id = b.id order by ft.created_at limit 1),
             v_privzeta
           ) as liga,
           (select ft.id from fantasy_teams ft
             where ft.owner_id = b.id order by ft.created_at limit 1) as ekipa
      from brez b
  )
  select d.id, d.email, d.display_name, d.ekipa, d.jezik, d.email_vklop, d.push_vklop
    from domaca d
   where d.liga = p_competition_id;
end $function$;

revoke all on function public.kandidati_za_opomnik(bigint) from public, anon, authenticated;
grant execute on function public.kandidati_za_opomnik(bigint) to service_role;

-- ---------------------------------------------------------------------------
-- Opozorilo (ekipa se ob roku ne bo zaklenila)
-- ---------------------------------------------------------------------------

drop function public.kandidati_za_opozorilo(bigint, integer);

create function public.kandidati_za_opozorilo(p_competition_id bigint, p_dni integer DEFAULT 2)
 RETURNS TABLE(user_id uuid, email text, display_name text, team_id bigint, team_name text,
               round_id bigint, round_number integer, deadline_at timestamp with time zone,
               razlog text, email_vklop boolean, push_vklop boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_krog bigint;
  v_stevilka int;
  v_rok timestamptz;
begin
  select r.id, r.number, r.deadline_at
    into v_krog, v_stevilka, v_rok
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.competition_id = p_competition_id
     and r.lineups_locked_at is null
     and r.deadline_at is not null
     and r.deadline_at > now()
     and r.deadline_at <= now() + make_interval(days => p_dni)
     and r.number >= greatest(nastavitev_int('strogi_zaklep_od_kroga', 2),
                              coalesce(c.prvi_fantasy_krog, 1) + 1)
   order by r.deadline_at
   limit 1;

  if v_krog is null then
    return;
  end if;

  return query
  select k.id, k.email, k.display_name, k.ekipa, k.ime, v_krog, v_stevilka, v_rok,
         razlog_neveljavne_ekipe(k.ekipa), k.email_vklop, k.push_vklop
    from (
      select u.id, u.email::text as email, pr.display_name, ft.id as ekipa, ft.name as ime,
             (u.email is not null and not coalesce(pr.brez_opomnikov, false)) as email_vklop,
             (not coalesce(pr.brez_push, false)
               and exists (select 1 from push_tokens pt where pt.user_id = u.id)) as push_vklop
        from fantasy_teams ft
        join auth.users u on u.id = ft.owner_id
        left join profiles pr on pr.id = u.id
       where ft.competition_id = p_competition_id
         and not ft.hisna
         and exists (select 1 from fantasy_roster fr where fr.fantasy_team_id = ft.id)
         and not roster_je_veljaven(ft.id)
    ) k
   where (k.email_vklop or k.push_vklop)
     and not exists (
       select 1
         from email_log el
        where el.user_id = k.id
          and el.competition_id = p_competition_id
          and el.vrsta = 'opozorilo-postava'
          and el.napaka is null
          and el.round_id = v_krog
          and el.poslano_at > v_rok - make_interval(days => p_dni)
     )
     and (
       select count(distinct el.round_id)
         from email_log el
        where el.user_id = k.id
          and el.competition_id = p_competition_id
          and el.vrsta = 'opozorilo-postava'
          and el.napaka is null
          and el.round_id is distinct from v_krog
          and not exists (
            select 1
              from fantasy_lineups fl
              join rounds r2 on r2.id = fl.round_id
             where fl.fantasy_team_id = k.ekipa
               and r2.lineups_locked_at > el.poslano_at
          )
     ) < 2;
end $function$;

comment on function public.kandidati_za_opozorilo(bigint, int) is
  'Lastniki ekip, ki imajo kader, a se ne bo zaklenil ob roku v naslednjih p_dni dneh. '
  'Samo krogi s strogim zaklepom; z vsaj enim vklopljenim kanalom. Enkrat na tezavo: '
  'naslednje opozorilo sele, ko se ekipa vmes spet zaklene.';

revoke all on function public.kandidati_za_opozorilo(bigint, int) from public, anon, authenticated;
grant execute on function public.kandidati_za_opozorilo(bigint, int) to service_role;

-- ---------------------------------------------------------------------------
-- Push opomnik: še nimaš ekipe, rok je jutri
-- ---------------------------------------------------------------------------
-- Kdo je "v" ligi brez ekipe: kdor ima v njej prazno ekipo ali pa ligo nima
-- nobene ekipe in mu je to domača liga (ista logika kot pri opomniku).
-- Prazen kader le; neveljaven, a nepopoln kader pokrije `opozorilo`.
-- Krog: prvi nezaklenjen z rokom v naslednjih 24 urah, od prvega fantasy
-- kroga naprej (tudi prvega, ki se zaklene nepopoln — prav takrat je izbira
-- ekipe najbolj pomembna).

create function public.kandidati_za_push_opomnik(p_competition_id bigint)
 RETURNS TABLE(user_id uuid, email text, display_name text, team_id bigint,
               round_id bigint, round_number integer, deadline_at timestamp with time zone,
               jezik text, ima_ekipo boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_krog bigint;
  v_stevilka int;
  v_rok timestamptz;
  v_privzeta bigint;
begin
  select r.id, r.number, r.deadline_at
    into v_krog, v_stevilka, v_rok
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.competition_id = p_competition_id
     and c.active
     and r.lineups_locked_at is null
     and r.deadline_at is not null
     and r.deadline_at > now()
     and r.deadline_at <= now() + interval '1 day'
     and r.number >= coalesce(c.prvi_fantasy_krog, 1)
   order by r.deadline_at
   limit 1;

  if v_krog is null then
    return;
  end if;

  select c.id into v_privzeta
    from competitions c
    left join fantasy_teams ft on ft.competition_id = c.id and not ft.hisna
   where c.active
   group by c.id, c.sort_order
   order by count(ft.id) desc, c.sort_order, c.id
   limit 1;

  return query
  with push as (
    select u.id, coalesce(u.email::text, '') as email, p.display_name,
           u.raw_user_meta_data->>'jezik' as jezik,
           -- Kdor nima ekipe nikjer, dobi obvestilo brez lige (v jeziku prijave),
           -- ne obvestila privzete slovenske lige.
           exists (select 1 from fantasy_teams ft where ft.owner_id = u.id) as ima_ekipo
      from auth.users u
      left join profiles p on p.id = u.id
     where not coalesce(p.brez_push, false)
       and exists (select 1 from push_tokens pt where pt.user_id = u.id)
       and not exists (select 1 from fantasy_teams h where h.owner_id = u.id and h.hisna)
  ),
  v_ligi as (
    select pu.*,
           (select ft.id from fantasy_teams ft
             where ft.owner_id = pu.id and ft.competition_id = p_competition_id) as ekipa,
           coalesce(
             (select ft.competition_id from fantasy_teams ft
               join competitions c on c.id = ft.competition_id and c.active
              where ft.owner_id = pu.id order by ft.created_at limit 1),
             v_privzeta
           ) as domaca
      from push pu
  )
  select v.id, v.email, v.display_name, v.ekipa, v_krog, v_stevilka, v_rok, v.jezik, v.ima_ekipo
    from v_ligi v
   where (v.ekipa is not null or v.domaca = p_competition_id)
     and not exists (select 1 from fantasy_roster fr where fr.fantasy_team_id = v.ekipa)
     and not exists (
       select 1 from email_log el
        where el.user_id = v.id
          and el.competition_id = p_competition_id
          and el.vrsta = 'opomnik-push'
          and el.round_id = v_krog
          and el.napaka is null
     );
end $function$;

comment on function public.kandidati_za_push_opomnik(bigint) is
  'Uporabniki z vklopljenim pushem in napravo, ki v ligi nimajo ekipe ali imajo prazno, '
  'rok kroga pa je v naslednjih 24 urah. Enkrat na krog (email_log vrsta opomnik-push).';

revoke all on function public.kandidati_za_push_opomnik(bigint) from public, anon, authenticated;
grant execute on function public.kandidati_za_push_opomnik(bigint) to service_role;
