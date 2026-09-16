-- Opozorilo dva dni pred rokom: ekipa se ne bo zaklenila.
--
-- Ekipa se iz tedna v teden prenasa sama — `zakleni_krog` ob roku posname
-- shranjeni kader in uporabniku ni treba storiti nicesar. Razen kadar kader
-- ob roku ni vec veljaven: takrat posnetka ni, krog je brez tock in nihce
-- tega ne pove.
--
-- In kader lahko postane neveljaven, ne da bi se ga lastnik dotaknil:
-- `roster_je_veljaven` gleda TRENUTNI klub igralca, zato pravi prestop v
-- ligi ekipo s tremi igralci enega kluba cez noc spremeni v ekipo s stirimi.
-- Tako je 8 ekip izgubilo 4. krog pri clanih; Tadic Ivano je presel z Jesenic
-- v Sencur in s tem podrl stiri ekipe hkrati.

-- 1. Zakaj kader ni veljaven, povedano cloveku.
--    Vrne NULL, kadar je vse v redu. Vrstni red je vrstni red popravljanja:
--    najprej to, brez cesar ekipe sploh ni.
create or replace function public.razlog_neveljavne_ekipe(p_team_id bigint)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with kader as (
    select fr.*, coalesce(fr.buy_position, p.position) as poz,
           p.team_id as klub_id, p.active, p.full_name
      from fantasy_roster fr
      join players p on p.id = fr.player_id
     where fr.fantasy_team_id = p_team_id
  ),
  n as (
    select
      count(*) as skupaj,
      count(*) filter (where is_starter) as zacetnikov,
      count(*) filter (where is_captain) as kapetanov,
      count(*) filter (where is_vice) as namestnikov,
      count(*) filter (where poz is null) as brez_poz,
      count(*) filter (where not active) as neaktivnih,
      count(*) filter (where poz = 'GK') as gk,
      count(*) filter (where poz = 'DEF') as def,
      count(*) filter (where poz = 'MID') as mid,
      count(*) filter (where poz = 'FWD') as fwd,
      (select string_agg(full_name, ', ') from kader where not active) as imena
      from kader
  ),
  klub as (
    select (select t.name from teams t where t.id = k.klub_id) as ime, k.cnt
      from (select klub_id, count(*) as cnt from kader group by klub_id) k
     where k.cnt > 3
     order by k.cnt desc
     limit 1
  )
  select case
    when n.skupaj = 0 then 'Ekipa je prazna — kadra ni.'
    when n.skupaj <> 15 then
      'V kadru je ' || n.skupaj || ' igralcev namesto 15.'
    when n.neaktivnih > 0 then
      'V kadru ni vec aktivnih igralcev: ' || coalesce(n.imena, '') ||
      '. Klub letos ne igra ali je igralec odsel.'
    when (select ime from klub) is not null then
      'Iz kluba ' || (select ime from klub) || ' imas ' ||
      (select cnt from klub) || ' igralce, dovoljeni so 3. ' ||
      'To se zgodi tudi brez tvoje spremembe — ce igralec med sezono prestopi v klub, ' ||
      'iz katerega jih ze imas.'
    when n.brez_poz > 0 then
      'Pri ' || n.brez_poz || ' igralcih ni znana pozicija.'
    when n.gk <> 2 or n.def <> 5 or n.mid <> 5 or n.fwd <> 3 then
      'Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ' ||
      'ima ' || n.gk || '-' || n.def || '-' || n.mid || '-' || n.fwd || '.'
    when n.zacetnikov <> 11 then
      'V postavi je ' || n.zacetnikov || ' igralcev namesto 11.'
    when n.kapetanov <> 1 then 'Ekipa nima natanko enega kapetana.'
    when n.namestnikov <> 1 then 'Ekipa nima natanko enega namestnika kapetana.'
    else null
  end
  from n;
$$;

comment on function public.razlog_neveljavne_ekipe(bigint) is
  'Zakaj se kader ne bo zaklenil, v slovenscini. NULL pomeni, da je vse v redu.';

-- 2. Opozorilo velja za en krog, ne za tri dni.
--    Roki so tedenski, lahko pa se premaknejo; vezava na krog je edina, ki
--    drzi tudi takrat.
alter table public.email_log add column if not exists round_id bigint
  references public.rounds(id) on delete set null;

create index if not exists email_log_opozorilo_idx
  on public.email_log (user_id, round_id, vrsta);

-- 3. Komu poslati opozorilo.
--    Samo lastnikom ekip, ki KADER IMAJO in ne bo zdrzal zaklepa. Kdor ekipe
--    sploh se nima, sodi pod `kandidati_za_opomnik` — to je druga posta z
--    drugim besedilom.
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
  -- Prvi se nezaklenjeni krog, ki je ze v dosegu opozorila.
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
     -- Prazne osnutke izpustimo: tisti clovek ekipe ni zacel delati in mu
     -- "ne bo se zaklenila" nic ne pove.
     and exists (select 1 from fantasy_roster fr where fr.fantasy_team_id = ft.id)
     and not roster_je_veljaven(ft.id)
     and not exists (
       select 1 from email_log el
        where el.user_id = u.id
          and el.round_id = v_krog
          and el.vrsta = 'opozorilo-postava'
          and el.napaka is null
     );
end $$;

comment on function public.kandidati_za_opozorilo(bigint, int) is
  'Lastniki ekip, ki imajo kader, a se ne bo zaklenil ob roku v naslednjih p_dni dneh.';

revoke all on function public.kandidati_za_opozorilo(bigint, int) from public;
revoke all on function public.razlog_neveljavne_ekipe(bigint) from public;
grant execute on function public.razlog_neveljavne_ekipe(bigint) to authenticated;
