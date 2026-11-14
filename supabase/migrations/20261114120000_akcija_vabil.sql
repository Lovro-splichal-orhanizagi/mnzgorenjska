-- Akcija vabil (14.–30. 11. 2026): povabi prijatelje, bon in zaboj piva.
--
-- Povabilo šteje, ko se prijatelj registrira prek povezave `?od=<koda>` IN
-- sestavi nehišno ekipo (`povabila.kvalificiran_at`, migracija 20261017210000),
-- da akcije ni mogoče napolniti s praznimi računi.
--
-- * Bon: kdor pripelje 3 prijatelje (kadarkoli), dobi enkrat brezplačno
--   ponovno vrednotenje cene (`ponovne_cene.z_bonom`). Pot je ista kot pri
--   plačanem (izračun, potrditev admina), le Stripe izpade: zahtevek se rodi
--   kot 'placano'. Zavrnjen ali neizvedljiv (`za_vracilo`) zahtevek bon vrne.
-- * Zaboj piva: največ prijateljev, kvalificiranih v oknu akcije
--   (`akcija_vabil_okno`), brez administratorjev in hišnih računov. Ob
--   izenačenju zmaga, kdor je število dosegel prej.
-- * Pošta: trije valovi (zagon, teden, zadnji dnevi), vsak enkrat na človeka
--   (`kandidati_za_akcijo_vabil`, vrsta `akcija-vabil-<val>`).

create or replace function public.akcija_vabil_okno(out od timestamptz, out do_ timestamptz)
language sql immutable
as $$ select '2026-11-14 00:00 Europe/Ljubljana'::timestamptz, '2026-12-01 00:00 Europe/Ljubljana'::timestamptz $$;
grant execute on function public.akcija_vabil_okno() to anon, authenticated;

-- Trenutni val pošte (NULL zunaj akcije).
create or replace function public.akcija_vabil_val()
returns int language sql stable
as $$
  select case
    when now() < (akcija_vabil_okno()).od or now() >= (akcija_vabil_okno()).do_ then null
    when now() >= '2026-11-27 00:00 Europe/Ljubljana'::timestamptz then 3
    when now() >= '2026-11-21 00:00 Europe/Ljubljana'::timestamptz then 2
    else 1 end
$$;
revoke all on function public.akcija_vabil_val() from public, anon, authenticated;

alter table public.ponovne_cene add column if not exists z_bonom boolean not null default false;

-- Povabilo šteje za akcijo: prijatelj ima potrjen e-naslov in nehišno ekipo s
-- kadrom (strožje od `pripeljanih`, ki ga vrsta prevzema ohrani nespremenjenega).
create or replace function public.povabilo_steje(p_povabljeni uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from auth.users u where u.id = p_povabljeni and u.email_confirmed_at is not null)
     and exists (select 1 from fantasy_teams ft
                  where ft.owner_id = p_povabljeni and not ft.hisna
                    and exists (select 1 from fantasy_roster r where r.fantasy_team_id = ft.id))
$$;
revoke all on function public.povabilo_steje(uuid) from public, anon, authenticated;

-- Vsi prijatelji, ki štejejo za bon (kadarkoli).
create or replace function public.pripeljanih_za_bon(p_uid uuid)
returns int language sql stable security definer set search_path = public
as $$
  select count(*)::int from povabila pv where pv.povabil = p_uid and povabilo_steje(pv.povabljeni)
$$;
revoke all on function public.pripeljanih_za_bon(uuid) from public, anon, authenticated;

-- Bon je porabljen, dokler zahtevek z bonom ni zavrnjen ali neizvedljiv.
create or replace function public.bon_ponovne_cene(p_uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select p_uid is not null
     and public.pripeljanih_za_bon(p_uid) >= 3
     and not exists (select 1 from ponovne_cene z
                      where z.user_id = p_uid and z.z_bonom
                        and z.stanje not in ('zavrnjeno', 'za_vracilo'))
$$;
revoke all on function public.bon_ponovne_cene(uuid) from public, anon, authenticated;

-- Število prijateljev v akciji za vsakega povabitelja (tekmovanje za pivo).
create or replace function public.akcija_vabil_stevci()
returns table (user_id uuid, n int, zadnji timestamptz)
language sql stable security definer set search_path = public
as $$
  select pv.povabil, count(*)::int, max(pv.kvalificiran_at)
    from povabila pv
    join profiles p on p.id = pv.povabil
   where pv.kvalificiran_at >= (akcija_vabil_okno()).od
     and pv.kvalificiran_at < (akcija_vabil_okno()).do_
     and povabilo_steje(pv.povabljeni)
     and not p.is_admin
     -- Nagrada je pivo: povabitelj mora igrati v članski (nemladinski) ligi.
     and exists (select 1 from fantasy_teams ft join competitions c on c.id = ft.competition_id
                  where ft.owner_id = pv.povabil and not ft.hisna and not je_mladinski_slug(c.slug))
     and not exists (select 1 from fantasy_teams ft where ft.owner_id = pv.povabil and ft.hisna)
   group by pv.povabil
$$;
revoke all on function public.akcija_vabil_stevci() from public, anon, authenticated;

-- Javni vrh akcije (vzdevki so javni že na lestvicah).
create or replace function public.lestvica_vabil()
returns table (mesto int, ime text, n int)
language sql stable security definer set search_path = public
as $$
  select (row_number() over (order by s.n desc, s.zadnji, s.user_id))::int,
         coalesce(p.display_name, '—'), s.n
    from akcija_vabil_stevci() s join profiles p on p.id = s.user_id
   order by 1
   limit 10
$$;
revoke all on function public.lestvica_vabil() from public;
grant execute on function public.lestvica_vabil() to anon, authenticated;

-- Za stran /invite: koda, števci, bon in mesto v akciji.
create or replace function public.moje_vabilo()
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_n int;
  v_mesto int;
begin
  if uid is null then
    raise insufficient_privilege using message = 'Prijava je potrebna.';
  end if;
  select r.n, r.m into v_n, v_mesto
    from (select s.user_id, s.n, row_number() over (order by s.n desc, s.zadnji, s.user_id)::int m
            from akcija_vabil_stevci() s) r
   where r.user_id = uid;
  return jsonb_build_object(
    'koda', moja_koda_vabila(),
    'registriranih', (select count(*)::int from povabila where povabil = uid),
    'pripeljanih', pripeljanih_za_bon(uid),
    'v_akciji', coalesce(v_n, 0),
    'mesto', v_mesto,
    'bon', bon_ponovne_cene(uid),
    'bon_porabljen', exists (select 1 from ponovne_cene z where z.user_id = uid and z.z_bonom
                               and z.stanje not in ('zavrnjeno', 'za_vracilo')),
    'do', (akcija_vabil_okno()).do_);
end;
$$;
revoke all on function public.moje_vabilo() from public, anon;
grant execute on function public.moje_vabilo() to authenticated;

-- Porabi bon za igralca: zahtevek gre naravnost v izračun ('placano').
create or replace function public.ponovna_cena_z_bonom(p_player_id bigint)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ovira text;
  v_liga bigint;
  v_id bigint;
begin
  if v_uid is null then
    raise exception 'Za nakup se je treba prijaviti.' using errcode = '42501';
  end if;
  if not vidi_ponovno_ceno() then
    raise exception 'Plačilo trenutno ni na voljo.';
  end if;
  -- Isti bon ne sme v dva zahtevka, isti igralec ne v dva hkratna izračuna.
  perform pg_advisory_xact_lock(hashtext('bon_ponovne_cene:' || v_uid));
  perform pg_advisory_xact_lock(hashtext('ponovna_cena:' || p_player_id));
  if not bon_ponovne_cene(v_uid) then
    raise exception 'Bona za ponovno vrednotenje nimaš.';
  end if;
  delete from ponovne_cene where player_id = p_player_id and user_id = v_uid and stanje = 'caka_placilo';
  v_ovira := ponovna_cena_ovira(p_player_id);
  if v_ovira is not null then
    raise exception 'Ponovno vrednotenje cene zdaj ni mogoče (%).', v_ovira;
  end if;
  select competition_id into v_liga from players where id = p_player_id;
  insert into ponovne_cene (player_id, competition_id, user_id, stanje, placano_at, z_bonom)
  values (p_player_id, v_liga, v_uid, 'placano', now(), true)
  returning id into v_id;
  perform preverjeni_na_discord(format('🎁 Ponovna cena #%s: %s, z bonom za 3 povabljene. Predlog pride v Administracijo v 15 minutah.',
                                       v_id, (select full_name from players where id = p_player_id)));
  return v_id;
end;
$$;
revoke all on function public.ponovna_cena_z_bonom(bigint) from public, anon;
grant execute on function public.ponovna_cena_z_bonom(bigint) to authenticated;

-- Stran igralca izve še, ali ima prijavljeni bon.
create or replace function public.ponovna_cena_stanje(p_player_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_zadnja record;
begin
  if not vidi_ponovno_ceno() then
    return jsonb_build_object('vidno', false);
  end if;
  select z.odloceno_at, z.stara_cena, z.nova_cena
    into v_zadnja
    from ponovne_cene z
   where z.player_id = p_player_id and z.stanje = 'potrjeno'
   order by z.odloceno_at desc
   limit 1;
  return jsonb_build_object(
    'vidno', true,
    'ovira', ponovna_cena_ovira(p_player_id),
    'v_pregledu', exists (select 1 from ponovne_cene where player_id = p_player_id and stanje in ('placano', 'v_pregledu')),
    'centi', coalesce(nastavitev_int('ponovna_cena_centi', 499), 499),
    'bon', bon_ponovne_cene(auth.uid()),
    'zadnja', case when v_zadnja.odloceno_at is null then null else jsonb_build_object(
      'kdaj', v_zadnja.odloceno_at, 'stara', v_zadnja.stara_cena, 'nova', v_zadnja.nova_cena) end);
end;
$$;

-- Prejemniki pošte trenutnega vala: kot `kandidati_za_novost_mini_lig`, brez
-- tistih, ki igrajo le v mladinskih ligah (nagrada je pivo).
create or replace function public.kandidati_za_akcijo_vabil(p_najvec int default 100)
returns table (
  user_id uuid, email text, display_name text, competition_id bigint,
  liga_slug text, liga_oznaka text, liga_drzava text,
  val int, pripeljanih int, v_akciji int, bon boolean, vodilni int
)
language sql stable security definer set search_path = public
as $$
  with v as (select akcija_vabil_val() val),
       s as (select * from akcija_vabil_stevci())
  select u.id, u.email, p.display_name, li.id, li.slug, li.short_name, li.drzava,
         v.val, pripeljanih_za_bon(u.id),
         coalesce((select s.n from s where s.user_id = u.id), 0),
         bon_ponovne_cene(u.id),
         coalesce((select max(s.n) from s), 0)
    from v
    cross join auth.users u
    join profiles p on p.id = u.id
    join lateral (
      select c.id, c.slug, c.short_name, d.code as drzava
        from fantasy_teams f
        join competitions c on c.id = f.competition_id
        left join countries d on d.id = c.country_id
       where f.owner_id = u.id and not f.hisna and not je_mladinski_slug(c.slug)
         and exists (select 1 from fantasy_roster r where r.fantasy_team_id = f.id)
       order by f.created_at desc, f.id desc
       limit 1
    ) li on true
   where v.val is not null
     and u.email is not null
     and u.email_confirmed_at is not null
     and u.deleted_at is null
     and not p.brez_opomnikov
     and not je_omejen(u.id)
     and not exists (select 1 from fantasy_teams f where f.owner_id = u.id and f.hisna)
     and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'akcija-vabil-' || v.val and l.napaka is null)
     and (select count(*) from email_log l where l.user_id = u.id and l.vrsta = 'akcija-vabil-' || v.val) < 3
     -- Valova vsaj 4 dni narazen tudi za tiste, ki so prvega dobili pozno.
     and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta like 'akcija-vabil-%'
                       and l.napaka is null and l.poslano_at > now() - interval '4 days')
   order by u.created_at
   limit greatest(p_najvec, 0)
$$;
revoke all on function public.kandidati_za_akcijo_vabil(int) from public, anon, authenticated;
grant execute on function public.kandidati_za_akcijo_vabil(int) to service_role;

-- Obiski: nova stran 'povabi' (/invite).
create or replace function public.zabelezi_obisk(p_stran text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ustvarjen timestamptz;
  v_skupina text;
begin
  if p_stran not in (
    'domov', 'vstop_drzave', 'moja_ekipa', 'igralci', 'igralec', 'lestvica',
    'slovenija', 'mini_lige', 'vstop_v_mini_ligo', 'ekipa', 'klub', 'rezultati',
    'tekma', 'glasovanje', 'pozicije', 'odsotnosti', 'racun', 'opomniki',
    'pravno', 'prijava', 'potrditev', 'tabela', 'profil', 'napovedi', 'povabi'
  ) then
    return;
  end if;

  -- Neprijavljen nima vrstice; `auth.uid()` je takrat null.
  select created_at into v_ustvarjen from auth.users where id = auth.uid();

  v_skupina := case
    when v_ustvarjen is null then 'neprijavljen'
    when v_ustvarjen > now() - interval '7 days' then 'nov'
    else 'star'
  end;

  insert into obiski_dnevno (dan, stran, skupina, stevilo)
  values (current_date, p_stran, v_skupina, 1)
  on conflict (dan, stran, skupina) do update
    set stevilo = obiski_dnevno.stevilo + 1;
end;
$$;
revoke all on function public.zabelezi_obisk(text) from public;
grant execute on function public.zabelezi_obisk(text) to anon, authenticated;

-- Neizvedljiv zahtevek z bonom: admin naj ne išče plačila za vračilo.
create or replace function public.ponovna_cena_predlog(
  p_zahtevek bigint, p_izid text, p_stara numeric, p_nova numeric, p_podlaga jsonb default null)
returns text language plpgsql security definer set search_path = public
as $$
declare
  z ponovne_cene;
  v_ime text;
begin
  select * into z from ponovne_cene where id = p_zahtevek for update;
  if not found or z.stanje <> 'placano' then
    return 'ze';
  end if;
  select full_name into v_ime from players where id = z.player_id;
  if p_izid in ('premaknjena', 'brez_spremembe') then
    update ponovne_cene
       set stanje = 'v_pregledu', izid = p_izid, stara_cena = p_stara, nova_cena = p_nova,
           podlaga = p_podlaga, predlog_at = now()
     where id = z.id;
    perform preverjeni_na_discord(format('💶 Ponovna cena #%s: %s, predlog %s → %s. Potrdi ali zavrni v Administraciji.',
                                         z.id, v_ime, p_stara, p_nova));
    return 'v_pregledu';
  end if;
  update ponovne_cene
     set stanje = 'za_vracilo', izid = p_izid, stara_cena = p_stara, predlog_at = now()
   where id = z.id;
  perform preverjeni_na_discord(format(case when z.z_bonom
    then '⚠️ Ponovna cena #%s (%s): izračun ni bil mogoč (%s). Zahtevek je bil z bonom: zavrni, bon se vrne sam (brez vračila denarja).'
    else '⚠️ Ponovna cena #%s (%s): izračun ni bil mogoč (%s). Zavrni in vrni denar v Stripe.' end, z.id, v_ime, p_izid));
  return 'za_vracilo';
end;
$$;
