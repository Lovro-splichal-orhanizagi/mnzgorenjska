-- SLFF Scout, faza 3a: računi klubov. Spec: docs/superpowers/specs/2026-10-16-scout-design.md.
--
-- Naročnina pripada klubu (team_id), sedež uradnemu računu kluba
-- (klubski_racuni: potrjen uradni naslov iz klub_stik). Do 3 sedeži na klub.
-- Preizkus 14 dni enkrat na klub, brez kartice, s sprejetjem pogojev; plačilo
-- zapiše stripe-webhook (20261017140400). Država naročnine je država kluba.
-- Dnevnik klicev s podatki igralcev se hrani 12 mesecev (scout.pocisti).
-- Brskalnik tabel ne vidi; vse gre prek SECURITY DEFINER RPC.

create table scout.narocnine (
  -- Brez kaskade: zdruzi-klube ne sme tiho pobrisati plačane naročnine.
  team_id                bigint primary key references public.teams,
  country_id             bigint not null references public.countries,
  paket                  text not null check (paket in ('preizkus', 'klub')),
  obdobje                text check (obdobje in ('mesec', 'sezona')),
  velja_do               timestamptz not null,
  pogoji_sprejeti_at     timestamptz not null,
  pogoje_sprejel         uuid references public.profiles on delete set null,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  -- Uporabnik, ki je plačal: portal (preklic) mu ostane, tudi brez sedeža.
  placal                 uuid references public.profiles on delete set null,
  -- Zaprt zaradi kršitve pogojev (admin, ročno).
  zaprt_at               timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check ((paket = 'klub') = (obdobje is not null))
);
comment on table scout.narocnine is
  'Naročnina kluba na SLFF Scout (preizkus ali Klub). Velja, dokler velja_do > now() in zaprt_at is null.';

create table scout.sedezi (
  user_id    uuid primary key references public.profiles on delete cascade,
  team_id    bigint not null references scout.narocnine on delete cascade,
  created_at timestamptz not null default now()
);
create index sedezi_klub on scout.sedezi (team_id);

create table scout.dnevnik (
  id         bigint generated always as identity primary key,
  -- Brez tujih ključev na klub in igralca: zapis mora preživeti brisanje.
  team_id    bigint not null,
  user_id    uuid references public.profiles on delete set null,
  vrsta      text not null check (vrsta in ('isci', 'igralec', 'podobni', 'vrzeli', 'opazuj', 'opazovani')),
  player_id  bigint,
  parametri  jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index dnevnik_klub_cas on scout.dnevnik (team_id, created_at);
create index dnevnik_igralec on scout.dnevnik (player_id) where player_id is not null;
comment on table scout.dnevnik is
  'Vsak klic Scouta s podatki igralcev (klub, uporabnik, igralec, čas). 12 mesecev: zloraba in zahteva igralca, kateri klubi so ga gledali.';

create table scout.opazovani (
  team_id    bigint not null references scout.narocnine on delete cascade,
  player_id  bigint not null,
  dodal      uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

alter table scout.narocnine enable row level security;
alter table scout.sedezi    enable row level security;
alter table scout.dnevnik   enable row level security;
alter table scout.opazovani enable row level security;
revoke all on scout.narocnine, scout.sedezi, scout.dnevnik, scout.opazovani from public, anon, authenticated;
revoke all on all sequences in schema scout from public, anon, authenticated;

-- Hramba: dnevnik 12 mesecev; s seznama gredo skriti, anonimizirani in
-- izbrisani igralci (ugovor velja tudi za seznam kluba).
create function scout.pocisti()
returns void language sql
as $$
  delete from scout.dnevnik where created_at < now() - interval '12 months';
  delete from scout.opazovani o
   where not exists (select 1 from public.players p where p.id = o.player_id and p.anonimiziran_at is null)
      or scout.je_skrit(array[o.player_id]);
$$;
revoke all on function scout.pocisti() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('scout-pocisti', '47 4 * * *', 'select scout.pocisti()');
exception
  when others then
    raise notice 'pg_cron ni na voljo (%) — scout.pocisti() je treba poganjati ročno', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC za uradne račune klubov
-- ---------------------------------------------------------------------------

-- Stanje za stran Račun kluba; null, če uporabnik ni uradni račun kluba.
create function public.scout_moj_klub()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'team_id', r.team_id, 'klub', t.name, 'country_id', t.country_id,
    'drzava_odprta', coalesce(d.stanje <> 'zaprto', false),
    'narocnina', (select jsonb_build_object(
                     'paket', n.paket, 'obdobje', n.obdobje, 'velja_do', n.velja_do,
                     'velja', n.velja_do > now() and n.zaprt_at is null)
                    from scout.narocnine n where n.team_id = r.team_id),
    'sedez', exists (select 1 from scout.sedezi s where s.user_id = auth.uid() and s.team_id = r.team_id),
    'sedezi', coalesce((select jsonb_agg(jsonb_build_object('user_id', s.user_id, 'ime', p.display_name)
                                         order by s.created_at)
                          from scout.sedezi s join profiles p on p.id = s.user_id
                         where s.team_id = r.team_id), '[]'::jsonb))
    from klubski_racuni r
    join teams t on t.id = r.team_id
    left join scout.drzave d on d.country_id = t.country_id
   where r.user_id = auth.uid() and r.preklican_at is null
$$;

create function public.scout_zacni_preizkus(p_sprejmem_pogoje boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_team bigint;
  v_country bigint;
begin
  select r.team_id, t.country_id into v_team, v_country
    from klubski_racuni r join teams t on t.id = r.team_id
   where r.user_id = v_uid and r.preklican_at is null;
  if v_team is null then
    raise insufficient_privilege using message = 'Scout: le uradni račun kluba.';
  end if;
  if p_sprejmem_pogoje is not true then
    raise exception 'Scout: za preizkus sprejmi pogoje.' using hint = 'scout-pogoji';
  end if;
  if coalesce((select d.stanje from scout.drzave d where d.country_id = v_country), 'zaprto') = 'zaprto' then
    raise exception 'Scout: država kluba ni odprta.' using hint = 'scout-drzava';
  end if;
  perform 1 from teams where id = v_team for update;  -- dva hkratna preizkusa
  if exists (select 1 from scout.narocnine n where n.team_id = v_team) then
    raise exception 'Scout: klub je preizkus že uporabil.' using hint = 'scout-preizkus-porabljen';
  end if;
  insert into scout.narocnine (team_id, country_id, paket, velja_do, pogoji_sprejeti_at, pogoje_sprejel)
  values (v_team, v_country, 'preizkus', now() + interval '14 days', now(), v_uid);
  delete from scout.sedezi s where s.user_id = v_uid;
  insert into scout.sedezi (user_id, team_id) values (v_uid, v_team);
  perform preverjeni_na_discord(format('🔎 Scout: preizkus %s', (select name from teams where id = v_team)));
end;
$$;

create function public.scout_zasedi_sedez()
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_team bigint;
begin
  select r.team_id into v_team from klubski_racuni r where r.user_id = v_uid and r.preklican_at is null;
  if v_team is null then
    raise insufficient_privilege using message = 'Scout: le uradni račun kluba.';
  end if;
  perform 1 from scout.narocnine n where n.team_id = v_team for update;  -- četrti sedež ob dirki
  if not found then
    raise exception 'Scout: klub nima naročnine.' using hint = 'scout-ni-narocnine';
  end if;
  if exists (select 1 from scout.sedezi s where s.user_id = v_uid and s.team_id = v_team) then
    return;
  end if;
  -- Šteje le sedeže računov, ki so še uradni računi kluba.
  if (select count(*) from scout.sedezi s where s.team_id = v_team and je_klubski_racun(s.user_id, v_team)) >= 3 then
    raise exception 'Scout: vsi trije sedeži so zasedeni.' using hint = 'scout-sedezi-polni';
  end if;
  delete from scout.sedezi s where s.user_id = v_uid;  -- sedež prejšnjega kluba
  insert into scout.sedezi (user_id, team_id) values (v_uid, v_team);
end;
$$;

-- Sedež sprosti njegov imetnik ali katerikoli sedež istega kluba.
create function public.scout_sprosti_sedez(p_user uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  delete from scout.sedezi s
   where s.user_id = p_user
     and (p_user = v_uid
          or exists (select 1 from scout.sedezi m
                      where m.user_id = v_uid and m.team_id = s.team_id and je_klubski_racun(v_uid, m.team_id)));
  if not found then
    raise insufficient_privilege using message = 'Scout: sedeža ni mogoče sprostiti.';
  end if;
end;
$$;

revoke all on function public.scout_moj_klub(), public.scout_zacni_preizkus(boolean),
  public.scout_zasedi_sedez(), public.scout_sprosti_sedez(uuid) from public, anon;
grant execute on function public.scout_moj_klub(), public.scout_zacni_preizkus(boolean),
  public.scout_zasedi_sedez(), public.scout_sprosti_sedez(uuid) to authenticated;
