-- Dnevno poročilo lijaka na Discord (scripts/porocilo-lijaka.mjs).
--
-- Ena servisna funkcija vrne vse številke za en dan: obiske, korake lijaka,
-- skupino registriranih pred 8–14 dnevi (ali so prišli do ekipe, do točk, se
-- vrnili) in denar. Seštevki brez uporabnikov — v poročilo gre le število.
-- Hišne ekipe in njihovi lastniki ne štejejo nikjer.

create or replace function public.porocilo_lijaka(p_dan date default (now() at time zone 'Europe/Ljubljana')::date - 1)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with
  dan_od as (select (p_dan::timestamp at time zone 'Europe/Ljubljana') as od,
                    ((p_dan + 1)::timestamp at time zone 'Europe/Ljubljana') as do_),
  hisni as (select distinct owner_id from fantasy_teams where hisna),
  -- Skupina: registrirani pred 15–21 dnevi, da je vsak lahko odigral dva roka.
  skupina as (
    select u.id
    from auth.users u
    where u.created_at >= (p_dan - 20)::timestamp at time zone 'Europe/Ljubljana'
      and u.created_at <  (p_dan - 13)::timestamp at time zone 'Europe/Ljubljana'
      and u.id not in (select owner_id from hisni)
  ),
  ekipe_skupine as (
    select ft.owner_id, ft.id
    from fantasy_teams ft join skupina s on s.id = ft.owner_id
    where not ft.hisna
  ),
  krogi_ekip as (
    select e.owner_id, count(distinct l.round_id) as krogov
    from ekipe_skupine e join fantasy_lineups l on l.fantasy_team_id = e.id
    group by e.owner_id
  )
  select jsonb_build_object(
    'dan', p_dan,
    'obiski', (
      select coalesce(jsonb_object_agg(skupina, n), '{}')
      from (select skupina, sum(stevilo) n from obiski_dnevno where dan = p_dan group by 1) o),
    'obiski_7', (
      select coalesce(jsonb_object_agg(skupina, n), '{}')
      from (select skupina, round(sum(stevilo) / 7.0) n from obiski_dnevno
            where dan between p_dan - 7 and p_dan - 1 group by 1) o),
    'koraki', (
      select coalesce(jsonb_object_agg(korak, stevilo), '{}') from lijak_dnevno where dan = p_dan),
    'koraki_7', (
      select coalesce(jsonb_object_agg(korak, n), '{}')
      from (select korak, round(sum(stevilo) / 7.0) n from lijak_dnevno
            where dan between p_dan - 7 and p_dan - 1 group by 1) k),
    'registracije', (
      select count(*) from auth.users, dan_od where created_at >= od and created_at < do_),
    'nove_ekipe', (
      select count(*) from fantasy_teams, dan_od where not hisna and created_at >= od and created_at < do_),
    'skupina', (
      select jsonb_build_object(
        'od', p_dan - 20, 'do', p_dan - 14,
        'registriranih', (select count(*) from skupina),
        'z_ekipo', (select count(distinct owner_id) from ekipe_skupine),
        'krog_1', (select count(*) from krogi_ekip where krogov >= 1),
        'krog_2', (select count(*) from krogi_ekip where krogov >= 2),
        -- last_sign_in_at se ob osvežitvi seje ne premakne; aktivnost pove seja.
        'vrnjenih', (select count(distinct se.user_id) from auth.sessions se join skupina s on s.id = se.user_id
                     where coalesce(se.refreshed_at, se.updated_at) >= (p_dan - 6)::timestamp at time zone 'Europe/Ljubljana'),
        'push', (select count(distinct p.user_id) from push_tokens p join skupina s on s.id = p.user_id),
        'aplikacija', (select count(distinct p.user_id) from push_tokens p join skupina s on s.id = p.user_id
                       where p.platforma in ('ios', 'android')),
        'mini_liga', (select count(distinct e.owner_id) from ekipe_skupine e
                      join mini_liga_clani m on m.fantasy_team_id = e.id),
        'povabil', (select count(distinct p.povabil) from povabila p join skupina s on s.id = p.povabil
                    where p.kvalificiran_at is not null)
      )),
    'denar', (
      select jsonb_build_object(
        'piva_dan', (select coalesce(sum(piv), 0) from piva, dan_od
                     where not test and not vracilo and created_at >= od and created_at < do_),
        'piva_30', (select coalesce(sum(piv), 0) from piva
                    where not test and not vracilo and created_at >= (p_dan - 29)::timestamp at time zone 'Europe/Ljubljana'),
        'pivo_klikov_30', (select coalesce(sum(stevilo), 0) from lijak_dnevno
                           where korak = 'pivo' and dan between p_dan - 29 and p_dan),
        'preverjeni_aktivni', (select count(*) from preverjeni_racuni where status = 'aktiven'),
        'preverjeni_dan', (select count(*) from preverjeni_racuni, dan_od
                           where stripe_checkout_id is not null and created_at >= od and created_at < do_),
        'ponovne_cene_placane_30', (select count(*) from ponovne_cene
                                    where placano_at >= (p_dan - 29)::timestamp at time zone 'Europe/Ljubljana'),
        'ponovne_cene_zacete_30', (select count(*) from ponovne_cene
                                   where created_at >= (p_dan - 29)::timestamp at time zone 'Europe/Ljubljana'),
        'trgovina_placanih_30', (select count(*) from trgovina.narocila
                                 where placano_at >= (p_dan - 29)::timestamp at time zone 'Europe/Ljubljana'),
        'trgovina_zacetih_30', (select count(*) from trgovina.narocila
                                where created_at >= (p_dan - 29)::timestamp at time zone 'Europe/Ljubljana'),
        'trgovina_eur_30', (select coalesce(sum(znesek_skupaj), 0) / 100.0 from trgovina.narocila
                            where placano_at >= (p_dan - 29)::timestamp at time zone 'Europe/Ljubljana')
      ))
  )
$$;

revoke all on function public.porocilo_lijaka(date) from public, anon, authenticated;
grant execute on function public.porocilo_lijaka(date) to service_role;
