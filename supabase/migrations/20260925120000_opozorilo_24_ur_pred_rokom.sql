-- Opozorilo o neveljavni ekipi: enkrat na krog, 24 ur pred rokom.
--
-- Doslej je opozorilo odšlo tri dni pred rokom in samo enkrat, "dokler ni
-- popravljeno" — kdor ga je prezrl, ni izvedel nič več, ekipa pa je ostajala
-- brez točk krog za krogom (Vinjske špice, lj-1-liga, 4. in 5. krog). Poleg
-- tega je GitHub jutranji tek zamikal za 2–5 ur, zato ekipa, ki je nastala
-- zvečer pred jutranjim rokom, opozorila ni dobila nikoli.
--
-- Zdaj: workflow preverja vsako uro z oknom enega dne (`DNI: 1`), funkcija
-- pa vrne lastnika neveljavne ekipe, če zanj v zadnjih p_dni dneh pred rokom
-- TEGA kroga še ni šlo opozorilo. Vsak dobi torej največ en mail na krog, in
-- to največ dva kroga zapored: če ekipe ne popravi, potem utihnemo, dokler se
-- ekipa spet ne zaklene — opuščeni računi ne dobivajo pošte vso sezono.
--
-- Mail za isti krog, poslan pred oknom (po starem tri dni pred rokom), ne
-- šteje — tako pred rokom 5. kroga dobijo opozorilo tudi tisti, ki so ga
-- dobili že 23. 9.
create or replace function public.kandidati_za_opozorilo(
  p_competition_id bigint,
  p_dni int default 2
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  team_id bigint,
  team_name text,
  round_id bigint,
  round_number int,
  deadline_at timestamptz,
  razlog text
)
language plpgsql
stable
security definer
set search_path = public
as $$
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
     -- Novo: samo krogi, v katerih zaklep kader res preveri (kot v_uporabi_v).
     and r.number >= greatest(nastavitev_int('strogi_zaklep_od_kroga', 2),
                              coalesce(c.prvi_fantasy_krog, 1) + 1)
   order by r.deadline_at
   limit 1;

  if v_krog is null then
    return;
  end if;

  return query
  select u.id,
         u.email::text,
         pr.display_name,
         ft.id,
         ft.name,
         v_krog,
         v_stevilka,
         v_rok,
         razlog_neveljavne_ekipe(ft.id)
    from fantasy_teams ft
    join auth.users u on u.id = ft.owner_id
    left join profiles pr on pr.id = u.id
   where ft.competition_id = p_competition_id
     and u.email is not null
     -- Novo: odjavljeni od opomnikov.
     and not coalesce(pr.brez_opomnikov, false)
     -- Ekipo mora imeti. Prazen osnutek ni "skoraj dobra ekipa" in sporocilo
     -- "ne bo se zaklenila" mu nic ne pove.
     and exists (select 1 from fantasy_roster fr where fr.fantasy_team_id = ft.id)
     and not roster_je_veljaven(ft.id)
     -- Enkrat na krog: opozorilo za ta krog, poslano v oknu pred rokom.
     and not exists (
       select 1
         from email_log el
        where el.user_id = u.id
          and el.competition_id = p_competition_id
          and el.vrsta = 'opozorilo-postava'
          and el.napaka is null
          and el.round_id = v_krog
          and el.poslano_at > v_rok - make_interval(days => p_dni)
     )
     -- Najvec dva kroga zapored: ce sta ze dva prejsnja kroga dobila opozorilo
     -- in se ekipa od takrat ni zaklenila, utihnemo, dokler se spet ne zaklene.
     -- Opusceni racuni sicer ne bi dobivali poste vso sezono.
     and (
       select count(distinct el.round_id)
         from email_log el
        where el.user_id = u.id
          and el.competition_id = p_competition_id
          and el.vrsta = 'opozorilo-postava'
          and el.napaka is null
          and el.round_id is distinct from v_krog
          and not exists (
            select 1
              from fantasy_lineups fl
              join rounds r2 on r2.id = fl.round_id
             where fl.fantasy_team_id = ft.id
               and r2.lineups_locked_at > el.poslano_at
          )
     ) < 2;
end $$;

comment on function public.kandidati_za_opozorilo(bigint, int) is
  'Lastniki ekip, ki imajo kader, a se ne bo zaklenil ob roku v naslednjih p_dni dneh. '
  'Samo krogi s strogim zaklepom; brez odjavljenih. Enkrat na krog, v zadnjih p_dni '
  'dneh pred rokom; najvec dva kroga zapored, dokler se ekipa spet ne zaklene.';
