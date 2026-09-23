-- Popravki po pregledu migracije 20260923090000.

-- === 1. Odhod igralca: preklic ni omejen z rokom ==========================
--
-- (a) Varovalo 24 ur pred rokom je blokiralo tudi PREKLIC (`p_odsel = false`).
--     Preklic igralca vrne na trg in kader ponovno naredi veljaven — prav
--     tik pred rokom je najbolj potreben. Zato velja samo za oznako odhoda.
-- (b) Oznaka odhoda se nanasa samo na AKTIVNEGA igralca. Igralec, ki ga je
--     deaktiviral uvoz (klub zunaj lige), ne sme dobiti `odsel_at` — sicer
--     bi ga uvoz razporeda ob vrnitvi kluba v ligo ne obudil vec.
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

  -- Ne v zadnjih 24 urah pred rokom in ne med rokom in zaklepom — a samo
  -- za oznako odhoda; preklic je dovoljen vedno.
  if p_odsel and not is_admin() and exists (
       select 1
         from rounds r
         join competitions c on c.id = r.competition_id
        where r.competition_id = v_competition_id
          and r.lineups_locked_at is null
          and r.deadline_at is not null
          and r.number >= coalesce(c.prvi_fantasy_krog, 1)
          and r.deadline_at <= now() + interval '24 hours'
          and r.deadline_at > now() - interval '7 days'
     ) then
    raise insufficient_privilege using message =
      'Odhod lahko označiš najkasneje 24 ur pred rokom kroga.';
  end if;

  update players
     set active   = not p_odsel,
         odsel_at = case when p_odsel then now() else null end,
         odsel_by = case when p_odsel then auth.uid() else null end
   where id = p_player_id
     -- Oznaka samo aktivnega; preklic obudi samo tistega, ki ga je oznacil clovek.
     and (case when p_odsel then active else odsel_at is not null end);
end;
$$;
revoke all on function public.oznaci_odhod_igralca(bigint, boolean) from public, anon;
grant execute on function public.oznaci_odhod_igralca(bigint, boolean) to authenticated;


-- === 2. Stevci sponzorjev se brisejo z ligo ================================
--
-- `on delete set null` je stevce izbrisane lige prepisal v "brez lige" in jih
-- pomesal s stevci strani brez izbrane lige. Izbrisana liga naj vzame svoje.
alter table public.sponsor_stats
  drop constraint if exists sponsor_stats_competition_id_fkey;
alter table public.sponsor_stats
  add constraint sponsor_stats_competition_id_fkey
  foreign key (competition_id) references public.competitions(id) on delete cascade;
