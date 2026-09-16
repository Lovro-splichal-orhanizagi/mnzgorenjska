-- Opozorilo gre enkrat, ne vsak krog znova.
--
-- Prva razlicica je opozarjala enkrat na krog. To pomeni, da bi kdor ekipe ne
-- popravi, dobival isto posto vsak teden do konca sezone. Opozorilo, ki pride
-- sestic, ni vec opozorilo, ampak nadlegovanje — in prvo, ki bi kdaj koga res
-- resilo, se izgubi med njimi.
--
-- Odslej velja: eno opozorilo, potem tisina, dokler ekipa ne zazivi. Da je
-- clovek tezavo odpravil, pove ZAKLEP: ce se je ekipa po opozorilu kdaj
-- zaklenila (ima vrstico v `fantasy_lineups` za krog, zaklenjen po tistem
-- mailu), je bil kader takrat veljaven. Ce se pozneje spet pokvari, je to nova
-- tezava in opozorilo gre znova.
--
-- Zaklep je pri tem edini posten pokazatelj: `roster_updated_at` bi povedal
-- le, da se je clovek ekipe dotaknil, ne pa da je z njo tudi kaj resil.
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
     and r.number >= coalesce(c.prvi_fantasy_krog, 1)
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
     -- Ekipo mora imeti. Prazen osnutek ni "skoraj dobra ekipa" in sporocilo
     -- "ne bo se zaklenila" mu nic ne pove.
     and exists (select 1 from fantasy_roster fr where fr.fantasy_team_id = ft.id)
     and not roster_je_veljaven(ft.id)
     -- Enkrat, dokler ni popravljeno: ce obstaja ze poslano opozorilo, po
     -- katerem se ekipa ni nikoli zaklenila, drugega ne posiljamo.
     and not exists (
       select 1
         from email_log el
        where el.user_id = u.id
          and el.competition_id = p_competition_id
          and el.vrsta = 'opozorilo-postava'
          and el.napaka is null
          and not exists (
            select 1
              from fantasy_lineups fl
              join rounds r2 on r2.id = fl.round_id
             where fl.fantasy_team_id = ft.id
               and r2.lineups_locked_at > el.poslano_at
          )
     );
end $$;

comment on function public.kandidati_za_opozorilo(bigint, int) is
  'Lastniki ekip, ki imajo kader, a se ne bo zaklenil ob roku v naslednjih p_dni dneh. Enkrat na tezavo: naslednje opozorilo sele, ko se ekipa vmes spet zaklene.';
