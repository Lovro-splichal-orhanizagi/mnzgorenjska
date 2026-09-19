-- Odhod igralca: poznavalec lige ali admin oznaci, da igralec pri klubu ne
-- igra vec.
--
-- Vir tega ne pove: igralec, ki je odsel, ostane na seznamu kluba, dokler ga
-- uvoz-razporeda ne deaktivira — a ta deaktivira le igralce klubov ZUNAJ
-- lige in ob vsakem zagonu VSE igralce klubov v ligi vrne med aktivne. Prvi
-- poznavalec (ND Rence) je v svojem klubu iz glave nastel sest takih.
--
-- Zato `players.odsel_at`: kdor je oznacen, ni aktiven in ga uvoz razporeda
-- ne obudi (skripta preverja odsel_at is null). Obudi ga samo dokaz, da igra:
-- sprozilec na appearances ob prvem nastopu oznako pobrise. Mnenje proti
-- zapisniku izgubi, kot pri pozicijah.
--
-- Ekipa, ki ima odslega igralca v kadru, postane neveljavna; to ze pokrivata
-- opozorilo na strani Moja ekipa in tedenski mail (razlog_neveljavne_ekipe
-- imenuje neaktivne igralce).

alter table public.players
  add column if not exists odsel_at timestamptz,
  add column if not exists odsel_by uuid references public.profiles on delete set null;

comment on column public.players.odsel_at is
  'Poznavalec lige/admin: igralec pri klubu ne igra vec. Pobrise prvi nastop.';

-- Poznavalec te lige ali admin.
create or replace function public.je_poznavalec_lige(p_competition_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_admin() or exists (
    select 1 from profiles
    where id = auth.uid() and insider_competition_id = p_competition_id
  );
$$;
grant execute on function public.je_poznavalec_lige(bigint) to authenticated;

create or replace function public.oznaci_odhod_igralca(p_player_id bigint, p_odsel boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competition_id bigint;
begin
  select competition_id into v_competition_id from players where id = p_player_id;
  if v_competition_id is null then
    raise exception 'Igralec ne obstaja.';
  end if;
  if not je_poznavalec_lige(v_competition_id) then
    raise insufficient_privilege using message =
      'Odhod igralca lahko oznaci samo poznavalec te lige ali administrator.';
  end if;

  update players
     set active   = not p_odsel,
         odsel_at = case when p_odsel then now() else null end,
         odsel_by = case when p_odsel then auth.uid() else null end
   where id = p_player_id;
end;
$$;
grant execute on function public.oznaci_odhod_igralca(bigint, boolean) to authenticated;

-- Nastop je dokaz: kdor igra, ni odsel.
create or replace function public.trg_nastop_obudi_igralca()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update players
     set active = true, odsel_at = null, odsel_by = null
   where id = new.player_id and odsel_at is not null;
  return new;
end;
$$;

drop trigger if exists appearances_obudi_igralca on public.appearances;
create trigger appearances_obudi_igralca
  after insert on public.appearances
  for each row execute function public.trg_nastop_obudi_igralca();
