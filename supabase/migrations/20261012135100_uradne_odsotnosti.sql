-- Uradne odsotnosti: potrjeni igralec sam javi, da ne bo igral.
--
-- Skupnostna poročila (`player_reports`) piše kdorkoli o komerkoli. Potrjeni
-- igralec (lastnik potrjenega zahtevka `zahtevki_igralca`, z vsemi
-- povezanimi vrsticami) pa lahko o SEBI objavi URADNO odsotnost: vrsta, od
-- kdaj, pričakovana vrnitev ali "neznano" in kratka opomba. Na forumu in na
-- strani igralca nosi značko "Uradno: igralec sam".
--
-- Še vedno SAMO INFORMACIJA: ne vpliva na izbiro, cene ne točke. Točke
-- prihajajo le iz uradnih zapisnikov; zato tudi "ni držalo" ne prinese
-- odbitka točk ali cene, le opomin osebi.
--
-- Preverba (`preveri_uradne_odsotnosti`, servisna): če je igralec (katerakoli
-- njegova vrstica) po zapisniku igral (minute > 0) na tekmi z datumom v
-- [od, vrnitev) dan po objavi ali pozneje in pred dnem, ko je odsotnost zaprl,
-- se odsotnost označi "ni_drzalo" (javno: "Ni držalo: igral DD. MM.") in to
-- je opomin. Zapisnik pozna le DATUM tekme, zato dan objave in dan zaprtja
-- štejeta v korist igralca (poškodba na sobotni tekmi, javljena isti večer,
-- ni opomin; "Spet sem nared" zjutraj pred tekmo tudi ne).
--
-- Dva opomina v sezoni (`sezona_lige` lige igralca) = do konca sezone brez
-- uradnih odsotnosti. Navadna poročila lahko piše še naprej. Nova sezona,
-- novi opomini (štejejo le opomini s sezono, ki je zdaj tekoča).
--
-- Preverbo kliče nočni/urni uvoz (posel "skupno" v uvoz-zapisnikov.yml) in
-- pg_cron vsako uro (rezerva).

create table public.uradne_odsotnosti (
  id                 bigint generated always as identity primary key,
  -- Vrstica, za katero je javil (glavna ali povezana).
  player_id          bigint not null references public.players on delete cascade,
  zahtevek_id        bigint not null references public.zahtevki_igralca on delete cascade,
  user_id            uuid not null references public.profiles on delete cascade,
  vrsta              text not null check (vrsta in ('poskodba', 'bolezen', 'dopust', 'kazen', 'drugo')),
  od                 date not null,
  -- Pričakovana vrnitev (prvi dan, ko spet lahko igra); null = neznano.
  vrnitev            date check (vrnitev is null or vrnitev > od),
  opomba             text check (opomba is null or (char_length(opomba) between 1 and 140 and opomba !~ '[[:cntrl:]]')),
  -- Sezona, v katero šteje morebitni opomin (ob "ni držalo" se nastavi po
  -- datumu tekme).
  sezona             text not null,
  status             text not null default 'odprto' check (status in ('odprto', 'zaprto', 'ni_drzalo')),
  created_at         timestamptz not null default now(),
  zaprto_at          timestamptz,
  ni_drzalo_datum    date,
  ni_drzalo_match_id bigint references public.matches on delete set null,
  check ((status = 'odprto') = (zaprto_at is null)),
  check ((status = 'ni_drzalo') = (ni_drzalo_datum is not null))
);
comment on table public.uradne_odsotnosti is
  'Uradne odsotnosti, ki jih javi potrjeni igralec sam. Samo informativno: ne vplivajo na izbiro, cene ne točke. Piše le prek RPC.';
comment on column public.uradne_odsotnosti.status is
  'odprto | zaprto ("Spet sem nared" ali pretečena vrnitev) | ni_drzalo (igral med odsotnostjo = opomin)';

-- En človek ima naenkrat največ eno odprto uradno odsotnost.
create unique index uradne_odsotnosti_ena_odprta on public.uradne_odsotnosti (user_id) where status = 'odprto';
create index uradne_odsotnosti_igralec on public.uradne_odsotnosti (player_id, created_at desc);
create index uradne_odsotnosti_cas on public.uradne_odsotnosti (created_at desc);
create index uradne_odsotnosti_za_preverbo on public.uradne_odsotnosti (status, zaprto_at) where status <> 'ni_drzalo';
create index uradne_odsotnosti_opomini on public.uradne_odsotnosti (user_id) where status = 'ni_drzalo';

alter table public.uradne_odsotnosti enable row level security;
-- Tabele vmesnik ne bere (v njej je uporabnik) in ne piše; javno je le
-- prek pogleda `uradne_odsotnosti_view`, pisanje prek RPC.
revoke all on public.uradne_odsotnosti from anon, authenticated;

-- --------------------------------------------------------------------------
-- Opomini
-- --------------------------------------------------------------------------
-- Največ opominov v sezoni, preden oseba izgubi pravico do uradnih odsotnosti.
create or replace function public.uradne_odsotnosti_najvec()
returns int language sql immutable parallel safe as $$ select 2 $$;
grant execute on function public.uradne_odsotnosti_najvec() to anon, authenticated;

-- Opomini osebe v tekoči sezoni (sezona lige vrstice, za katero je javil).
create or replace function public.uradne_odsotnosti_opomini(p_user uuid)
returns int language sql stable security definer set search_path = public
as $$
  select count(*)::int
    from uradne_odsotnosti r
    join players p on p.id = r.player_id
   where r.user_id = p_user and r.status = 'ni_drzalo'
     and r.sezona = sezona_lige(p.competition_id)
$$;
revoke all on function public.uradne_odsotnosti_opomini(uuid) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Igralec: objavi, zapri ("Spet sem nared"), stanje
-- --------------------------------------------------------------------------
create or replace function public.objavi_uradno_odsotnost(
  p_player_id bigint,
  p_vrsta text,
  p_od date default null,
  p_vrnitev date default null,
  p_opomba text default null
)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_z zahtevki_igralca;
  v_p players;
  v_danes date := (now() at time zone 'Europe/Ljubljana')::date;
  v_od date := coalesce(p_od, (now() at time zone 'Europe/Ljubljana')::date);
  v_opomba text := nullif(btrim(coalesce(p_opomba, '')), '');
  v_id bigint;
begin
  if v_uid is null then
    raise insufficient_privilege using message = 'Uradno odsotnost lahko javi le potrjeni igralec sam.';
  end if;
  select * into v_z from zahtevki_igralca where id = prevzem_zahtevek_igralca(p_player_id);
  if not found or v_z.user_id <> v_uid then
    raise insufficient_privilege using message = 'Uradno odsotnost lahko javi le potrjeni igralec sam.';
  end if;
  select * into v_p from players where id = p_player_id;
  if v_p.anonimiziran_at is not null then
    raise exception 'Ime tega igralca je skrito; uradne odsotnosti ni mogoče javiti.';
  end if;
  if p_vrsta is null or p_vrsta not in ('poskodba', 'bolezen', 'dopust', 'kazen', 'drugo') then
    raise exception 'Neznana vrsta odsotnosti.';
  end if;
  if v_od < v_danes - 14 or v_od > v_danes + 90 then
    raise exception 'Začetek odsotnosti je lahko največ 14 dni nazaj in 90 dni naprej.';
  end if;
  if p_vrnitev is not null and (p_vrnitev <= v_od or p_vrnitev > v_od + 365) then
    raise exception 'Vrnitev mora biti po začetku odsotnosti (največ leto dni).';
  end if;
  if v_opomba is not null and (char_length(v_opomba) > 140 or v_opomba ~ '[[:cntrl:]]') then
    raise exception 'Opomba ima lahko največ 140 znakov brez posebnih znakov.';
  end if;
  if uradne_odsotnosti_opomini(v_uid) >= uradne_odsotnosti_najvec() then
    raise exception 'Dva opomina v tej sezoni: uradnih odsotnosti do konca sezone ne moreš več javljati.';
  end if;

  -- Odsotnost, katere vrnitev je mimo, je končana: zapri jo (preverba jo
  -- še vedno pregleda do vrnitve).
  update uradne_odsotnosti
     set status = 'zaprto',
         zaprto_at = greatest(created_at, (vrnitev::timestamp at time zone 'Europe/Ljubljana'))
   where user_id = v_uid and status = 'odprto' and vrnitev is not null and vrnitev <= v_danes;

  if exists (select 1 from uradne_odsotnosti where user_id = v_uid and status = 'odprto') then
    raise exception 'Uradno odsotnost že imaš odprto. Najprej jo zapri ("Spet sem nared").';
  end if;
  if (select count(*) from uradne_odsotnosti where user_id = v_uid and created_at > now() - interval '30 days') >= 10 then
    raise exception 'Preveč uradnih odsotnosti v zadnjih 30 dneh.';
  end if;

  insert into uradne_odsotnosti (player_id, zahtevek_id, user_id, vrsta, od, vrnitev, opomba, sezona)
  values (p_player_id, v_z.id, v_uid, p_vrsta, v_od, p_vrnitev, v_opomba,
          coalesce(sezona_lige(v_p.competition_id), tekoca_sezona()))
  returning id into v_id;
  return v_id;
end;
$$;

-- "Spet sem nared": zapre svojo odprto odsotnost, brez posledic.
create or replace function public.zapri_uradno_odsotnost(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null
     or not exists (select 1 from uradne_odsotnosti where id = p_id and user_id = auth.uid()) then
    raise insufficient_privilege using message = 'To ni tvoja uradna odsotnost.';
  end if;
  update uradne_odsotnosti set status = 'zaprto', zaprto_at = now()
   where id = p_id and status = 'odprto';
  if not found then
    raise exception 'Uradna odsotnost ni več odprta.';
  end if;
end;
$$;

-- Stanje za stran igralca: ali je klicatelj ta igralec, koliko opominov ima
-- v sezoni in ali sme še javljati. Tujcu vrne lastnik = false in ničle.
create or replace function public.stanje_uradne_odsotnosti(p_player_id bigint)
returns table (lastnik boolean, opomini int, najvec int, blokiran boolean, sezona text)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_lastnik boolean;
  v_opomini int := 0;
begin
  select coalesce(z.user_id = auth.uid(), false) into v_lastnik
    from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  v_lastnik := coalesce(v_lastnik, false) and auth.uid() is not null;
  if v_lastnik then
    v_opomini := uradne_odsotnosti_opomini(auth.uid());
  end if;
  return query
    select v_lastnik, v_opomini, uradne_odsotnosti_najvec(),
           v_lastnik and v_opomini >= uradne_odsotnosti_najvec(),
           (select sezona_lige(p.competition_id) from players p where p.id = p_player_id);
end;
$$;

revoke all on function public.objavi_uradno_odsotnost(bigint, text, date, date, text),
  public.zapri_uradno_odsotnost(bigint), public.stanje_uradne_odsotnosti(bigint)
  from public, anon;
grant execute on function public.objavi_uradno_odsotnost(bigint, text, date, date, text),
  public.zapri_uradno_odsotnost(bigint), public.stanje_uradne_odsotnosti(bigint)
  to authenticated;

-- --------------------------------------------------------------------------
-- Preverba po uvozu (servis)
-- --------------------------------------------------------------------------
-- Vrne število novih "ni držalo". Pregleda odprte in nedavno zaprte (do 60
-- dni; zapisnik lahko pride tudi 45 dni pozneje) odsotnosti s še potrjenim
-- profilom. Tekma šteje, če je igralec (glavna ali povezana vrstica) igral
-- vsaj minuto, datum je v [od, vrnitev), po dnevu objave in pred dnem zaprtja.
create or replace function public.preveri_uradne_odsotnosti()
returns int language plpgsql security definer set search_path = public
as $$
declare
  v_n int;
begin
  with kandidati as (
    select distinct on (r.id) r.id, m.id as match_id, m.played_on, rp.competition_id
      from uradne_odsotnosti r
      join players rp on rp.id = r.player_id
      join zahtevki_igralca z on z.id = r.zahtevek_id and z.status = 'potrjen'
      join lateral (
        select z.player_id
        union
        select pi.player_id from povezani_igralci pi where pi.zahtevek_id = z.id
      ) s on true
      join appearances a on a.player_id = s.player_id and a.minutes_played > 0
      join matches m on m.id = a.match_id
     where r.status <> 'ni_drzalo'
       and (r.status = 'odprto' or r.zaprto_at > now() - interval '60 days')
       and m.played_on is not null
       and m.played_on >= r.od
       and (r.vrnitev is null or m.played_on < r.vrnitev)
       and m.played_on > (r.created_at at time zone 'Europe/Ljubljana')::date
       and (r.zaprto_at is null or m.played_on < (r.zaprto_at at time zone 'Europe/Ljubljana')::date)
     order by r.id, m.played_on, m.id
  )
  update uradne_odsotnosti r
     set status = 'ni_drzalo',
         zaprto_at = coalesce(r.zaprto_at, now()),
         ni_drzalo_datum = k.played_on,
         ni_drzalo_match_id = k.match_id,
         sezona = coalesce(sezona_lige(k.competition_id, k.played_on), r.sezona)
    from kandidati k
   where r.id = k.id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.preveri_uradne_odsotnosti() from public, anon, authenticated;
grant execute on function public.preveri_uradne_odsotnosti() to service_role;

-- --------------------------------------------------------------------------
-- Javni pogled: brez uporabnika. `moje` pove prijavljenemu, katera je njegova
-- (gumb "Spet sem nared"). Ni security_invoker (bere mimo RLS), zato le
-- branje. Profil, ki ni več potrjen (preklic, lažni profil), ne kaže ničesar.
-- --------------------------------------------------------------------------
create view public.uradne_odsotnosti_view as
  select r.id,
         r.player_id,
         z.player_id as glavni_player_id,
         p.competition_id,
         coalesce(
           nullif(btrim(p.full_name), ''),
           btrim(coalesce(p.last_name, '') || ' ' || coalesce(p.first_name, ''))
         ) as player_name,
         t.id          as team_id,
         t.name        as team_name,
         t.short_name  as team_short,
         t.logo_url    as team_logo,
         r.vrsta,
         r.od,
         r.vrnitev,
         case when p.anonimiziran_at is null then r.opomba end as opomba,
         r.status,
         r.created_at,
         r.zaprto_at,
         r.ni_drzalo_datum,
         coalesce(r.user_id = auth.uid(), false) as moje
    from uradne_odsotnosti r
    join zahtevki_igralca z on z.id = r.zahtevek_id and z.status = 'potrjen'
    join players p on p.id = r.player_id
    left join teams t on t.id = p.team_id;
comment on view public.uradne_odsotnosti_view is
  'Uradne odsotnosti potrjenih igralcev za forum Odsotnosti in stran igralca. Brez uporabnika; samo informativno.';
revoke all on public.uradne_odsotnosti_view from anon, authenticated;
grant select on public.uradne_odsotnosti_view to anon, authenticated;

-- Skrito ime: kot pri skupnostnih poročilih (`anonimiziraj_igralca` jih
-- izbriše) gredo proč tudi uradne odsotnosti te vrstice.
create or replace function public.uradne_odsotnosti_ob_anonimizaciji()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  delete from uradne_odsotnosti where player_id = new.id;
  return null;
end $$;
create trigger uradne_odsotnosti_anonimizacija after update of anonimiziran_at on public.players
  for each row when (old.anonimiziran_at is null and new.anonimiziran_at is not null)
  execute function public.uradne_odsotnosti_ob_anonimizaciji();

-- Rezerva, če uvoz ne pride do koraka preverbe: vsako uro.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'preveri-uradne-odsotnosti',
    '47 * * * *',
    $urnik$select public.preveri_uradne_odsotnosti()$urnik$
  );
exception
  when others then
    raise notice 'pg_cron ni na voljo (%) : preverbo uradnih odsotnosti kliče le uvoz', sqlerrm;
end;
$$;
