-- SLFF Pro: plačljiv paket za fantasy menedžerje (spec
-- docs/superpowers/specs/2026-11-20-slff-pro-design.md).
--
-- Le dodatki, nikoli prednost v igri (brez denarja, pripomočkov, prestopov):
--   * značka Pro ob imenu ekipe na lestvicah (`pro_ekipe`; ne v mladinskih
--     ligah in ne pri hišnih ekipah),
--   * sezonsko poročilo vseh svojih ekip čez sezone (`pro_porocilo`),
--   * dve ponovni vrednotenji cene na 365 dni (`pro_bonov_ostane`, ista pot
--     kot bon akcije vabil: `boni_ponovne_cene.vir = 'pro'`).
--
-- Stikalo `slff_pro` v `settings`: 0 izklopljeno (privzeto), 1 le admin in
-- `testerji`, 2 v živo. Pri 0 nihče nima Pro (`pro_aktiven` je false), tudi
-- kdor je plačal; preklic naročnine (`pro_portal_kupec`) pa je mogoč vedno.
--
-- Pravico piše le stripe-webhook (metadata app=slff-pro) s servisnim ključem.
-- Nakup pripravi `pro_pripravi_nakup` (JWT kupca, funkcija pro-placilo).
-- Brez tujih ključev na igralce in ekipe: katalog FK teh tabel je vezan v
-- varovalih FCF (20261030160000).

insert into settings (key, value) values ('slff_pro', '0')
on conflict (key) do nothing;

create or replace function public.vidi_pro()
returns boolean language sql stable security definer set search_path = public
as $$
  select case coalesce(nastavitev_int('slff_pro', 0), 0)
           when 2 then true
           when 1 then is_admin() or exists (select 1 from testerji where user_id = auth.uid())
           else false
         end
$$;
revoke all on function public.vidi_pro() from public;
grant execute on function public.vidi_pro() to anon, authenticated;

-- --------------------------------------------------------------------------
-- Pravica
-- --------------------------------------------------------------------------
create table public.pro_narocnine (
  id                     bigint generated always as identity primary key,
  -- Izbris računa pusti zapis plačila; pravica pade na 'preklican' (sprožilec).
  user_id                uuid references public.profiles on delete set null,
  -- sezona: enkratno plačilo za 365 dni; mesec: naročnina; rocno: admin v SQL.
  vir                    text not null check (vir in ('sezona', 'mesec', 'rocno')),
  status                 text not null default 'aktiven' check (status in ('aktiven', 'preklican', 'potekel')),
  velja_do               timestamptz not null,
  star_vsaj_18           boolean,
  odpoved_pravici        boolean,
  znesek                 integer,
  stripe_customer_id     text,
  stripe_subscription_id text,
  stripe_checkout_id     text unique,
  stripe_payment_intent  text,
  -- 'caka': naročnino moramo preklicati v Stripe (vrsta v stripe-webhook).
  stripe_preklic         text check (stripe_preklic in ('caka', 'opravljen')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (vir = 'rocno' or (star_vsaj_18 is true and odpoved_pravici is true)),
  check ((vir = 'mesec') = (stripe_subscription_id is not null))
);
comment on table public.pro_narocnine is
  'Pravica SLFF Pro. Piše le stripe-webhook (servis); bere se prek moj_pro in pro_aktiven.';
create unique index pro_narocnine_en_aktiven on public.pro_narocnine (user_id) where status = 'aktiven';
create index pro_narocnine_narocnina on public.pro_narocnine (stripe_subscription_id) where stripe_subscription_id is not null;
create index pro_narocnine_placilo on public.pro_narocnine (stripe_payment_intent) where stripe_payment_intent is not null;
alter table public.pro_narocnine enable row level security;
revoke all on public.pro_narocnine from public, anon, authenticated;
insert into agent.zaprte_tabele (tabela, zakaj) values ('public.pro_narocnine', 'kupci in Stripe id-ji SLFF Pro')
on conflict (tabela) do nothing;

-- Preklic pravice (izbris računa, vračilo, spor) ali zamenjava z novim nakupom
-- ('potekel') prekliče tudi naročnino v Stripe, da ne zaračunava naprej.
create or replace function public.pro_oznaci_preklic()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.user_id is null and old.user_id is not null then
    new.status := 'preklican';
  end if;
  if new.status <> 'aktiven' and new.stripe_subscription_id is not null and new.stripe_preklic is null
     and (tg_op = 'INSERT' or old.status = 'aktiven') then
    new.stripe_preklic := 'caka';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger pro_narocnine_preklic before insert or update on public.pro_narocnine
  for each row execute function public.pro_oznaci_preklic();

-- Ali ima uporabnik Pro zdaj: stikalo (pri 1 le admin in preizkuševalci) in veljavna pravica.
create or replace function public.pro_aktiven(p_uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select p_uid is not null
     and case coalesce(nastavitev_int('slff_pro', 0), 0)
           when 2 then true
           when 1 then exists (select 1 from profiles where id = p_uid and is_admin)
                    or exists (select 1 from testerji where user_id = p_uid)
           else false
         end
     and exists (select 1 from pro_narocnine n
                  where n.user_id = p_uid and n.status = 'aktiven' and n.velja_do > now())
$$;
revoke all on function public.pro_aktiven(uuid) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Ponovno vrednotenje cene: dva bona na 365 dni (ista pot kot bon vabil)
-- --------------------------------------------------------------------------
alter table public.boni_ponovne_cene
  add column vir text not null default 'vabila' check (vir in ('vabila', 'pro'));

-- Bon akcije vabil je enkraten; boni Pro ga ne porabijo.
create or replace function public.bon_porabljen(p_uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from boni_ponovne_cene b join ponovne_cene z on z.id = b.zahtevek_id
                  where b.user_id = p_uid and b.vir = 'vabila' and z.stanje not in ('zavrnjeno', 'za_vracilo'))
$$;
revoke all on function public.bon_porabljen(uuid) from public, anon, authenticated;

-- Zavrnjen ali neizvedljiv zahtevek bon vrne (kot pri vabilih). Mesečna
-- naročnina odklene bon na vsakih 60 dni (en mesec ne sme biti vreden dveh
-- plačljivih ponovnih cen).
create or replace function public.pro_bonov_ostane(p_uid uuid)
returns int language sql stable security definer set search_path = public
as $$
  select case when not pro_aktiven(p_uid) then 0 else greatest(0,
    (select case n.vir when 'mesec'
              then least(coalesce(nastavitev_int('slff_pro_boni', 2), 2), floor(extract(epoch from now() - n.created_at) / (60 * 86400))::int)
              else coalesce(nastavitev_int('slff_pro_boni', 2), 2) end
       from pro_narocnine n where n.user_id = p_uid and n.status = 'aktiven' and n.velja_do > now()
      order by n.velja_do desc limit 1)
    - (select count(*)::int from boni_ponovne_cene b join ponovne_cene z on z.id = b.zahtevek_id
        where b.user_id = p_uid and b.vir = 'pro' and b.created_at > now() - interval '365 days'
          and z.stanje not in ('zavrnjeno', 'za_vracilo'))) end
$$;
revoke all on function public.pro_bonov_ostane(uuid) from public, anon, authenticated;

create or replace function public.ponovna_cena_z_bonom(p_player_id bigint)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ovira text;
  v_liga bigint;
  v_id bigint;
  v_vir text;
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
  -- Najprej enkratni bon vabil, nato boni Pro.
  v_vir := case when bon_ponovne_cene(v_uid) then 'vabila' when pro_bonov_ostane(v_uid) > 0 then 'pro' end;
  if v_vir is null then
    raise exception 'Bona za ponovno vrednotenje nimaš.';
  end if;
  delete from ponovne_cene where player_id = p_player_id and user_id = v_uid and stanje = 'caka_placilo';
  v_ovira := ponovna_cena_ovira(p_player_id);
  if v_ovira is not null then
    raise exception 'Ponovno vrednotenje cene zdaj ni mogoče (%).', v_ovira;
  end if;
  select competition_id into v_liga from players where id = p_player_id;
  insert into ponovne_cene (player_id, competition_id, user_id, stanje, placano_at)
  values (p_player_id, v_liga, v_uid, 'placano', now())
  returning id into v_id;
  insert into boni_ponovne_cene (zahtevek_id, user_id, vir) values (v_id, v_uid, v_vir);
  perform preverjeni_na_discord(format('🎁 Ponovna cena #%s: %s, %s. Predlog pride v Administracijo v 15 minutah.',
                                       v_id, (select full_name from players where id = p_player_id),
                                       case v_vir when 'pro' then 'z bonom SLFF Pro' else 'z bonom za 3 povabljene' end));
  return v_id;
end;
$$;
revoke all on function public.ponovna_cena_z_bonom(bigint) from public, anon;
grant execute on function public.ponovna_cena_z_bonom(bigint) to authenticated;

create or replace function public.ponovna_cena_stanje(p_player_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_zadnja record;
  v_vir text;
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
  v_vir := case when bon_ponovne_cene(auth.uid()) then 'vabila' when pro_bonov_ostane(auth.uid()) > 0 then 'pro' end;
  return jsonb_build_object(
    'vidno', true,
    'ovira', ponovna_cena_ovira(p_player_id),
    'v_pregledu', exists (select 1 from ponovne_cene where player_id = p_player_id and stanje in ('placano', 'v_pregledu')),
    'centi', coalesce(nastavitev_int('ponovna_cena_centi', 499), 499),
    'bon', v_vir is not null,
    'bon_vir', v_vir,
    'zadnja', case when v_zadnja.odloceno_at is null then null else jsonb_build_object(
      'kdaj', v_zadnja.odloceno_at, 'stara', v_zadnja.stara_cena, 'nova', v_zadnja.nova_cena) end);
end;
$$;

-- --------------------------------------------------------------------------
-- Brskalnik: stanje, značke, poročilo
-- --------------------------------------------------------------------------

-- Lastna pravica. Zapis plačila in portal vrne tudi pri izklopljenem
-- stikalu: preklic naročnine mora biti vedno mogoč.
create or replace function public.moj_pro()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  n pro_narocnine;
begin
  if v_uid is null then
    return jsonb_build_object('vidno', vidi_pro(), 'aktiven', false, 'portal', false);
  end if;
  select * into n from pro_narocnine where user_id = v_uid order by (status = 'aktiven') desc, velja_do desc limit 1;
  return jsonb_build_object(
    'vidno', vidi_pro(),
    'aktiven', pro_aktiven(v_uid),
    'vir', n.vir,
    'velja_do', n.velja_do,
    'portal', exists (select 1 from pro_narocnine x where x.user_id = v_uid and x.stripe_customer_id is not null),
    'bonov', pro_bonov_ostane(v_uid));
end;
$$;
revoke all on function public.moj_pro() from public, anon;
grant execute on function public.moj_pro() to authenticated;

-- Ekipe s seznama, ki nosijo značko Pro (lestvice, mini lige, dvoboji).
create or replace function public.pro_ekipe(p_ekipe bigint[])
returns setof bigint language sql stable security definer set search_path = public
as $$
  select ft.id
    from fantasy_teams ft
    join competitions c on c.id = ft.competition_id
   where vidi_pro()
     and coalesce(cardinality(p_ekipe), 0) <= 2000
     and ft.id = any (p_ekipe)
     and not ft.hisna
     and not je_mladinski_slug(c.slug)
     and pro_aktiven(ft.owner_id)
$$;
revoke all on function public.pro_ekipe(bigint[]) from public;
grant execute on function public.pro_ekipe(bigint[]) to anon, authenticated;

-- Sezonsko poročilo vseh svojih (nehišnih) ekip: točke po krogih, mesto med
-- nehišnimi ekipami lige v tej sezoni, najboljši krog, povprečje, prestopi.
create or replace function public.pro_porocilo()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not pro_aktiven(v_uid) then
    raise insufficient_privilege using message = 'SLFF Pro ni aktiven.';
  end if;
  return coalesce((
    with moje as (
      select ft.id, ft.name, ft.competition_id, c.slug, c.short_name
        from fantasy_teams ft join competitions c on c.id = ft.competition_id
       where ft.owner_id = v_uid and not ft.hisna
    ),
    krogi as (
      select frp.fantasy_team_id, frp.competition_id, frp.season, frp.round_number, frp.points, frp.transfers, frp.penalty
        from fantasy_round_points frp
        join fantasy_teams ft on ft.id = frp.fantasy_team_id and not ft.hisna
       where frp.competition_id in (select competition_id from moje) and frp.points is not null
    ),
    sezone as (
      select k.fantasy_team_id, k.competition_id, k.season, sum(k.points) tock,
             rank() over (partition by k.competition_id, k.season order by sum(k.points) desc) mesto,
             count(*) over (partition by k.competition_id, k.season) ekip
        from krogi k
       group by k.fantasy_team_id, k.competition_id, k.season
    )
    select jsonb_agg(jsonb_build_object(
             'ekipa_id', m.id, 'ekipa', m.name, 'liga', m.slug, 'liga_kratko', m.short_name,
             'sezona', s.season, 'tock', s.tock, 'mesto', s.mesto, 'ekip', s.ekip,
             'povprecje', (select round(avg(k.points), 1) from krogi k where k.fantasy_team_id = m.id and k.season = s.season),
             'prestopi', (select sum(k.transfers) from krogi k where k.fantasy_team_id = m.id and k.season = s.season),
             'kazni', (select sum(k.penalty) from krogi k where k.fantasy_team_id = m.id and k.season = s.season),
             'krogi', (select jsonb_agg(jsonb_build_object('krog', k.round_number, 'tock', k.points) order by k.round_number)
                         from krogi k where k.fantasy_team_id = m.id and k.season = s.season))
           order by s.season desc, m.id)
      from moje m join sezone s on s.fantasy_team_id = m.id
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.pro_porocilo() from public, anon;
grant execute on function public.pro_porocilo() to authenticated;

-- --------------------------------------------------------------------------
-- Nakup (pro-placilo, JWT kupca) in portal
-- --------------------------------------------------------------------------
create or replace function public.pro_pripravi_nakup(p_vir text)
returns table (stripe_customer_id text, email text)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Za nakup se je treba prijaviti.' using errcode = '42501';
  end if;
  if not vidi_pro() then
    raise exception 'Plačilo trenutno ni na voljo.';
  end if;
  if p_vir is null or p_vir not in ('sezona', 'mesec') then
    raise exception 'SLFF Pro: sezona ali mesec.';
  end if;
  if exists (select 1 from pro_narocnine n where n.user_id = v_uid and n.status = 'aktiven' and n.velja_do > now()) then
    raise exception 'SLFF Pro že imaš.';
  end if;
  return query
    select (select n.stripe_customer_id from pro_narocnine n
             where n.user_id = v_uid and n.stripe_customer_id is not null order by n.created_at desc limit 1),
           (select u.email::text from auth.users u where u.id = v_uid);
end;
$$;
revoke all on function public.pro_pripravi_nakup(text) from public, anon;
grant execute on function public.pro_pripravi_nakup(text) to authenticated;

-- Ne glede na stikalo: preklic mora biti vedno mogoč.
create or replace function public.pro_portal_kupec()
returns text language sql stable security definer set search_path = public
as $$
  select n.stripe_customer_id from pro_narocnine n
   where n.user_id = auth.uid() and n.stripe_customer_id is not null
   order by n.created_at desc
   limit 1
$$;
revoke all on function public.pro_portal_kupec() from public, anon;
grant execute on function public.pro_portal_kupec() to authenticated;

-- --------------------------------------------------------------------------
-- stripe-webhook (servis)
-- --------------------------------------------------------------------------

-- Plačana seja. Vrne 'aktiven', 'ze' (ponovljen dogodek), 'dvojno' (že ima
-- Pro: vrni denar), 'brez_racuna' (račun izbrisan: vrni denar) ali
-- 'neveljavno'. Webhook pri vsem razen 'aktiven'/'ze' prekliče novo
-- naročnino in javi Discordu.
create or replace function public.pro_iz_placila(
  p_user_id uuid, p_vir text, p_velja_do timestamptz, p_customer text, p_subscription text,
  p_checkout text, p_payment_intent text, p_znesek integer, p_star_vsaj_18 boolean, p_odpoved boolean)
returns text language plpgsql security definer set search_path = public
as $$
begin
  if p_checkout is null then
    return 'neveljavno';
  end if;
  perform pg_advisory_xact_lock(hashtext('slff_pro:' || coalesce(p_user_id::text, p_checkout)));
  if exists (select 1 from pro_narocnine where stripe_checkout_id = p_checkout) then
    return 'ze';
  end if;
  if p_vir is null or p_vir not in ('sezona', 'mesec') or p_velja_do is null or p_velja_do <= now()
     or p_star_vsaj_18 is not true or p_odpoved is not true
     or (p_vir = 'mesec') <> (p_subscription is not null) then
    return 'neveljavno';
  end if;
  if p_user_id is null or not exists (select 1 from profiles where id = p_user_id) then
    perform preverjeni_na_discord('⚠️ SLFF Pro: plačilo brez računa (izbrisan), vrni denar v Stripe: checkout ' || p_checkout);
    return 'brez_racuna';
  end if;
  if exists (select 1 from pro_narocnine where user_id = p_user_id and status = 'aktiven' and velja_do > now()) then
    perform preverjeni_na_discord('⚠️ SLFF Pro: dvojno plačilo, vrni denar v Stripe: checkout ' || p_checkout);
    return 'dvojno';
  end if;
  update pro_narocnine set status = 'potekel' where user_id = p_user_id and status = 'aktiven';
  insert into pro_narocnine (user_id, vir, velja_do, star_vsaj_18, odpoved_pravici, znesek, stripe_customer_id,
                             stripe_subscription_id, stripe_checkout_id, stripe_payment_intent)
  values (p_user_id, p_vir, p_velja_do, p_star_vsaj_18, p_odpoved, p_znesek, p_customer,
          p_subscription, p_checkout, p_payment_intent);
  perform preverjeni_na_discord(format('💶 SLFF Pro plačan (%s, %s €)', p_vir, to_char(coalesce(p_znesek, 0) / 100.0, 'FM990.00')));
  return 'aktiven';
end;
$$;

-- invoice.paid / subscription.updated. 'neznana': obnova pred sejo (nič);
-- 'brez_pravice': naša naročnina brez veljavne pravice (webhook jo prekliče).
create or replace function public.pro_podaljsaj(p_subscription text, p_velja_do timestamptz)
returns text language plpgsql security definer set search_path = public
as $$
begin
  update pro_narocnine set velja_do = greatest(velja_do, p_velja_do)
   where stripe_subscription_id = p_subscription and status = 'aktiven';
  if found then
    return 'podaljsano';
  end if;
  if exists (select 1 from pro_narocnine where stripe_subscription_id = p_subscription) then
    return 'brez_pravice';
  end if;
  return 'neznana';
end;
$$;

create or replace function public.pro_narocnina_konec(p_subscription text, p_konec timestamptz)
returns text language plpgsql security definer set search_path = public
as $$
begin
  update pro_narocnine set velja_do = least(velja_do, p_konec)
   where stripe_subscription_id = p_subscription and status = 'aktiven';
  return case when found then 'koncano' else 'neznana' end;
end;
$$;

-- Celotno vračilo ali spor (sezona po plačilu, naročnina po id) prekliče
-- pravico; naročnina gre v vrsto preklicev (sprožilec).
create or replace function public.pro_vracilo(p_payment_intent text, p_subscription text)
returns text language plpgsql security definer set search_path = public
as $$
begin
  update pro_narocnine set status = 'preklican'
   where status = 'aktiven'
     and (stripe_payment_intent = p_payment_intent or stripe_subscription_id = p_subscription);
  if not found then
    return case when exists (select 1 from pro_narocnine
                              where stripe_payment_intent = p_payment_intent or stripe_subscription_id = p_subscription)
                then 'ze' else 'neznano' end;
  end if;
  perform preverjeni_na_discord('↩️ SLFF Pro: vračilo ali spor, pravica preklicana (' || coalesce(p_payment_intent, p_subscription) || ')');
  return 'preklicano';
end;
$$;

revoke all on function public.pro_iz_placila(uuid, text, timestamptz, text, text, text, text, integer, boolean, boolean),
  public.pro_podaljsaj(text, timestamptz), public.pro_narocnina_konec(text, timestamptz), public.pro_vracilo(text, text)
  from public, anon, authenticated;
grant execute on function public.pro_iz_placila(uuid, text, timestamptz, text, text, text, text, integer, boolean, boolean),
  public.pro_podaljsaj(text, timestamptz), public.pro_narocnina_konec(text, timestamptz), public.pro_vracilo(text, text)
  to service_role;

-- Vrsta preklicev naročnin (stripe-webhook) zajame tudi Pro.
create or replace function public.preverjen_cakajoci_preklici()
returns setof text language sql stable security definer set search_path = public
as $$
  select stripe_subscription_id from preverjeni_racuni where stripe_preklic = 'caka'
  union
  select stripe_subscription_id from pro_narocnine where stripe_preklic = 'caka'
$$;

create or replace function public.preverjen_preklic_opravljen(p_subscription text)
returns void language sql security definer set search_path = public
as $$
  update preverjeni_racuni set stripe_preklic = 'opravljen', updated_at = now()
   where stripe_subscription_id = p_subscription and stripe_preklic = 'caka';
  update pro_narocnine set stripe_preklic = 'opravljen'
   where stripe_subscription_id = p_subscription and stripe_preklic = 'caka';
$$;

-- Obiski: nova stran 'pro' (/pro).
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
    'pravno', 'prijava', 'potrditev', 'tabela', 'profil', 'napovedi', 'povabi', 'vabilo', 'pro'
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
