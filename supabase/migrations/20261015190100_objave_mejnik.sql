-- Samodejne objave: mejnik vsakih 1000 uporabnikov (lastnik, 15. 10. 2026).
-- Načrt: docs/superpowers/specs/2026-10-15-samodejne-objave-design.md.
--
-- - slot `mejnik`: osnutek nastane, ko skupaj_uporabnikov() preseže
--   večkratnik 1000 (scripts/objave.mjs, dosezenMejnik). `mejnik` (1000, 2000 …)
--   je enoličen, zato se vsak mejnik objavi enkrat.
-- - En osnutek na termin in teden velja le za pon in cet: dva mejnika lahko
--   padeta v isti teden.
-- - `objava_mejnik_dejstva()` vrne števila za objavo (servisna).

alter table public.objave drop constraint objave_slot_check;
alter table public.objave add constraint objave_slot_check check (slot in ('pon', 'cet', 'mejnik'));

alter table public.objave add column mejnik int unique;
alter table public.objave add constraint objave_mejnik_check check ((slot = 'mejnik') = (mejnik is not null));

alter table public.objave drop constraint objave_slot_teden_key;
create unique index objave_slot_teden_key on public.objave (slot, teden) where slot <> 'mejnik';

create or replace function public.objava_mejnik_dejstva()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'uporabnikov', skupaj_uporabnikov(),
    'drzav', (select count(distinct country_id) from competitions where active),
    'lig', (select count(*) from competitions where active),
    'ekip', (select count(*) from fantasy_teams where not hisna))
$$;

revoke all on function public.objava_mejnik_dejstva() from public, anon, authenticated;
grant execute on function public.objava_mejnik_dejstva() to service_role;
