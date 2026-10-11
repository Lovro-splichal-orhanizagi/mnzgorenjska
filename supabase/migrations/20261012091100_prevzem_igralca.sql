-- Prevzem profila igralca ("To sem jaz").
--
-- Pravi igralec prevzame svoj profil: odda zahtevek, potrdi ga klub
-- (poznavalec kluba v aplikaciji ali enkratna povezava po mailu klubu),
-- dva že potrjena soigralca ali admin. Potrjen igralec ureja le
-- PREDSTAVITEV (vzdevek, opis, omrežja, fotografija), nikoli uradnih
-- podatkov (ime, klub, pozicija, minute, goli, cena) — ti so v `players`
-- in jih piše le uvoz.
--
-- En človek = en profil: največ en potrjen zahtevek na uporabnika in na
-- igralca (delni unikatni kazali). Ista oseba ima lahko več vrstic `players`
-- (člani in mladinci, druga liga, prestop) — te poveže ADMIN v
-- `povezani_igralci`; povezane vrstice kažejo isto značko in isto
-- predstavitev, pravilo "en profil na osebo" velja za skupino.
--
-- Vse spremembe stanja gredo prek SECURITY DEFINER funkcij s preverbami na
-- strežniku; tabel zahtevkov vmesnik ne piše neposredno.

-- --------------------------------------------------------------------------
-- Mladinske lige (U19): stolpca ni, šifre lig pa so dosledne
-- (`mladinci`, `lj-mladinci-2`, `mb-u19`, `sml1`, `hu-…-u19-…`, `rs-u19-…`).
-- Isto pravilo je v src/lib/prevzem.ts (`jeMladinskiSlug`, smoke).
-- --------------------------------------------------------------------------
create or replace function public.je_mladinski_slug(p_slug text)
returns boolean language sql immutable parallel safe set search_path = public
as $$ select coalesce(p_slug ~ '(^|-)(u19|mladinci)($|-)' or p_slug ~ '^sml[0-9]', false) $$;

create or replace function public.je_mladinska_liga(p_competition_id bigint)
returns boolean language sql stable set search_path = public
as $$ select coalesce((select je_mladinski_slug(slug) from competitions where id = p_competition_id), false) $$;

grant execute on function public.je_mladinski_slug(text), public.je_mladinska_liga(bigint) to anon, authenticated;

-- --------------------------------------------------------------------------
-- Tabele
-- --------------------------------------------------------------------------
create table public.zahtevki_igralca (
  id           bigint generated always as identity primary key,
  player_id    bigint not null references public.players on delete cascade,
  user_id      uuid not null references public.profiles on delete cascade,
  status       text not null default 'cakajoc'
               check (status in ('cakajoc', 'potrjen', 'zavrnjen', 'preklican')),
  -- Kdo je potrdil; ostane tudi po preklicu (zgodovina).
  potrdil      text check (potrdil in ('klub', 'soigralci', 'admin')),
  -- Drug uporabnik že ima zahtevek ali potrjen profil za tega igralca:
  -- odloči le admin.
  spor         boolean not null default false,
  -- Mladinska liga: igralec je potrdil, da je star vsaj 16 let (brez
  -- datuma rojstva in dokumentov).
  star_vsaj_16 boolean,
  dokaz_url    text check (dokaz_url is null or (length(dokaz_url) <= 300 and dokaz_url ~ '^https?://[^[:space:]<>"]+$')),
  note         text check (note is null or length(note) <= 500),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references public.profiles on delete set null,
  check (status <> 'potrjen' or potrdil is not null)
);
comment on table public.zahtevki_igralca is
  'Zahtevki "To sem jaz": uporabnik prevzame profil igralca. Piše le prek RPC (prevzemi_igralca …).';

create unique index zahtevki_igralca_en_potrjen_igralec on public.zahtevki_igralca (player_id) where status = 'potrjen';
create unique index zahtevki_igralca_en_potrjen_uporabnik on public.zahtevki_igralca (user_id) where status = 'potrjen';
create unique index zahtevki_igralca_en_odprt on public.zahtevki_igralca (user_id) where status = 'cakajoc';
create index zahtevki_igralca_igralec on public.zahtevki_igralca (player_id, status);
create index zahtevki_igralca_cakajoci on public.zahtevki_igralca (created_at) where status = 'cakajoc';

-- Dodatne vrstice iste osebe (druga liga, mladinci, prestop). Poveže admin.
create table public.povezani_igralci (
  player_id   bigint primary key references public.players on delete cascade,
  zahtevek_id bigint not null references public.zahtevki_igralca on delete cascade,
  povezal     uuid references public.profiles on delete set null,
  created_at  timestamptz not null default now()
);
create index povezani_igralci_zahtevek on public.povezani_igralci (zahtevek_id);

-- Potrditve soigralcev: dva različna potrjena igralca istega kluba v isti ligi.
create table public.potrditve_soigralcev (
  zahtevek_id bigint not null references public.zahtevki_igralca on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade,
  player_id   bigint not null references public.players on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (zahtevek_id, user_id)
);

-- Prijava lažnega profila: gre v vrsto admina.
create table public.prijave_profila_igralca (
  id          bigint generated always as identity primary key,
  zahtevek_id bigint not null references public.zahtevki_igralca on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade,
  razlog      text check (razlog is null or length(razlog) <= 500),
  created_at  timestamptz not null default now(),
  resena_at   timestamptz,
  resil       uuid references public.profiles on delete set null
);
create unique index prijave_profila_ena_odprta on public.prijave_profila_igralca (zahtevek_id, user_id) where resena_at is null;

-- Enkratne povezave za klub (mail na naslov iz `klub_stik`). Hranimo le
-- zgoščeno vrednost (sha256); povezava velja 14 dni in enkrat.
create table public.zetoni_prevzema (
  id           bigint generated always as identity primary key,
  zahtevek_id  bigint not null references public.zahtevki_igralca on delete cascade,
  hash         text not null unique,
  klub_stik_id bigint references public.klub_stik on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '14 days',
  porabljen_at timestamptz,
  odlocitev    text check (odlocitev in ('potrdi', 'zavrni'))
);
create index zetoni_prevzema_zahtevek on public.zetoni_prevzema (zahtevek_id);

-- Predstavitev potrjenega igralca. Ključ je GLAVNA vrstica (player_id
-- potrjenega zahtevka); povezane vrstice berejo isto.
create table public.profil_igralca (
  player_id   bigint primary key references public.players on delete cascade,
  vzdevek     text check (vzdevek is null or (char_length(vzdevek) between 1 and 24 and vzdevek !~ '[[:cntrl:]]')),
  opis        text check (opis is null or (char_length(opis) between 1 and 160 and opis !~ '[[:cntrl:]]')),
  -- Le uporabniška imena, ne poljubni naslovi (povezavo sestavi vmesnik).
  instagram   text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  tiktok      text check (tiktok is null or tiktok ~ '^[A-Za-z0-9._]{2,24}$'),
  facebook    text check (facebook is null or facebook ~ '^[A-Za-z0-9.]{5,50}$'),
  -- Pot v vedru `fotografije-igralcev`: "<player_id>/<ime>.<jpg|png|webp>".
  fotografija text check (fotografija is null or fotografija ~ ('^' || player_id::text || '/[A-Za-z0-9_-]{1,64}\.(jpg|png|webp)$')),
  -- Igralec je sam skril ime (anonimizacija, `skrij_moje_ime`). Dokončno.
  skrij_ime   boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Pomožne funkcije
-- --------------------------------------------------------------------------

-- Potrjen zahtevek, ki pokriva igralca (glavna ali povezana vrstica).
create or replace function public.prevzem_zahtevek_igralca(p_player_id bigint)
returns bigint language sql stable security definer set search_path = public
as $$
  select z.id from zahtevki_igralca z
   where z.status = 'potrjen'
     and (z.player_id = p_player_id
          or exists (select 1 from povezani_igralci pi where pi.zahtevek_id = z.id and pi.player_id = p_player_id))
   limit 1
$$;

create or replace function public.je_potrjen_igralec(p_player_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$ select prevzem_zahtevek_igralca(p_player_id) is not null $$;

-- Ali sme klicatelj pisati predstavitev (glavna vrstica, ime ni skrito).
create or replace function public.je_lastnik_profila(p_player_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from zahtevki_igralca z join players p on p.id = z.player_id
     where z.player_id = p_player_id and z.status = 'potrjen'
       and z.user_id = auth.uid() and p.anonimiziran_at is null)
$$;

-- Poznavalec kluba za potrditev. `insider_team_id` si lahko nastavi vsak
-- sam, zato šteje le, če ga je odobril admin (prošnja `klub` za ta klub in
-- to ligo); poznavalec lige (`insider_competition_id`, nastavi admin) šteje
-- za vse klube lige.
create or replace function public.prevzem_je_poznavalec_kluba(p_user uuid, p_player_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from players p join profiles pf on pf.id = p_user
     where p.id = p_player_id
       and (pf.insider_competition_id = p.competition_id
            or (pf.insider_team_id = p.team_id
                and exists (select 1 from poznavalec_prosnje pp
                             where pp.user_id = p_user and pp.status = 'klub'
                               and pp.team_id = p.team_id and pp.competition_id = p.competition_id))))
$$;

-- Potrjena vrstica klicatelja v istem klubu in ligi kot igralec (ali null).
create or replace function public.prevzem_soigralec(p_user uuid, p_player_id bigint)
returns bigint language sql stable security definer set search_path = public
as $$
  select mp.id
    from zahtevki_igralca z
    join players p on p.id = p_player_id
    join players mp on mp.team_id = p.team_id and mp.competition_id = p.competition_id and mp.id <> p.id
   where z.user_id = p_user and z.status = 'potrjen'
     and (mp.id = z.player_id
          or exists (select 1 from povezani_igralci pi where pi.zahtevek_id = z.id and pi.player_id = mp.id))
   limit 1
$$;

-- Ali sme klicatelj pisati fotografijo s to potjo v vedro.
create or replace function public.prevzem_sme_pisati_foto(p_name text)
returns boolean language sql stable security definer set search_path = public
as $$
  select p_name ~ '^-?[0-9]{1,18}/[A-Za-z0-9_-]{1,64}\.(jpg|png|webp)$'
     and je_lastnik_profila(split_part(p_name, '/', 1)::bigint)
$$;

revoke all on function public.prevzem_zahtevek_igralca(bigint), public.prevzem_je_poznavalec_kluba(uuid, bigint),
  public.prevzem_soigralec(uuid, bigint) from public, anon, authenticated;
grant execute on function public.je_potrjen_igralec(bigint) to anon, authenticated;
grant execute on function public.je_lastnik_profila(bigint), public.prevzem_sme_pisati_foto(text) to authenticated;

-- Fotografije igralca odstrani iz shrambe. Vrstico v storage.objects
-- pobrišemo, da je javni naslov ne streže več (preklic lažnega profila,
-- neprimerna slika, anonimizacija); datoteka na disku ostane osirotela, ker
-- shramba nima SQL brisanja. Shramba to brisanje privzeto zavrne
-- (`storage.allow_delete_query`), zato ga izrecno dovolimo le tu.
create or replace function public.prevzem_odstrani_fotografije(p_player_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if to_regclass('storage.objects') is null then
    return;
  end if;
  perform set_config('storage.allow_delete_query', 'true', true);
  execute 'delete from storage.objects where bucket_id = $1 and name like $2'
    using 'fotografije-igralcev', p_player_id::text || '/%';
  perform set_config('storage.allow_delete_query', 'false', true);
end;
$$;
revoke all on function public.prevzem_odstrani_fotografije(bigint) from public, anon, authenticated;

-- Predstavitev in fotografije odstrani (preklic, anonimizacija).
create or replace function public.prevzem_odstrani_predstavitev(p_player_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from profil_igralca where player_id = p_player_id;
  perform prevzem_odstrani_fotografije(p_player_id);
end;
$$;
revoke all on function public.prevzem_odstrani_predstavitev(bigint) from public, anon, authenticated;

-- Potrditev zahtevka (vse poti). Drugi odprti zahtevki za igralca padejo.
create or replace function public.prevzem_potrdi(p_id bigint, p_potrdil text, p_kdo uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  z zahtevki_igralca;
begin
  select * into z from zahtevki_igralca where id = p_id for update;
  if not found or z.status <> 'cakajoc' then
    raise exception 'Zahtevek ni več odprt.';
  end if;
  if exists (select 1 from zahtevki_igralca where user_id = z.user_id and status = 'potrjen') then
    raise exception 'Uporabnik že ima potrjen profil igralca.';
  end if;
  if prevzem_zahtevek_igralca(z.player_id) is not null then
    raise exception 'Igralec že ima potrjen profil.';
  end if;
  update zahtevki_igralca
     set status = 'potrjen', potrdil = p_potrdil, decided_at = now(), decided_by = p_kdo
   where id = p_id;
  update zahtevki_igralca
     set status = 'zavrnjen', decided_at = now(), decided_by = p_kdo,
         note = coalesce(note, 'Profil je potrdil drug uporabnik.')
   where player_id = z.player_id and status = 'cakajoc' and id <> p_id;
end;
$$;
revoke all on function public.prevzem_potrdi(bigint, text, uuid) from public, anon, authenticated;

-- Iz potrjenega v preklican: povezave in predstavitev gredo proč.
create or replace function public.prevzem_preklici(p_id bigint, p_kdo uuid, p_note text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  z zahtevki_igralca;
begin
  select * into z from zahtevki_igralca where id = p_id for update;
  if not found or z.status not in ('cakajoc', 'potrjen') then
    raise exception 'Zahtevek ni odprt ne potrjen.';
  end if;
  if z.status = 'potrjen' then
    perform prevzem_odstrani_predstavitev(z.player_id);
    delete from povezani_igralci where zahtevek_id = p_id;
    update prijave_profila_igralca set resena_at = now(), resil = p_kdo
     where zahtevek_id = p_id and resena_at is null;
  end if;
  update zahtevki_igralca
     set status = 'preklican', decided_at = now(), decided_by = p_kdo,
         note = coalesce(nullif(btrim(p_note), ''), note)
   where id = p_id;
end;
$$;
revoke all on function public.prevzem_preklici(bigint, uuid, text) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- RLS in pravice
-- --------------------------------------------------------------------------
alter table public.zahtevki_igralca enable row level security;
alter table public.povezani_igralci enable row level security;
alter table public.potrditve_soigralcev enable row level security;
alter table public.prijave_profila_igralca enable row level security;
alter table public.zetoni_prevzema enable row level security;
alter table public.profil_igralca enable row level security;

revoke all on public.zahtevki_igralca, public.povezani_igralci, public.potrditve_soigralcev,
  public.prijave_profila_igralca, public.zetoni_prevzema, public.profil_igralca from anon, authenticated;

-- Čakajoči zahtevek vidi le tisti, ki ga je oddal (in admin). Javno je le,
-- kdo je potrjen (pogled `potrjeni_igralci`).
grant select on public.zahtevki_igralca to authenticated;
create policy "svoji zahtevki" on public.zahtevki_igralca
  for select to authenticated using (user_id = auth.uid() or is_admin());

-- Predstavitev: javna le za potrjene; piše le potrjen lastnik glavne vrstice.
grant select on public.profil_igralca to anon, authenticated;
grant insert (player_id, vzdevek, opis, instagram, tiktok, facebook, fotografija),
      update (vzdevek, opis, instagram, tiktok, facebook, fotografija)
   on public.profil_igralca to authenticated;
create policy "javna predstavitev potrjenih" on public.profil_igralca
  for select to anon, authenticated using (je_potrjen_igralec(player_id));
create policy "lastnik doda predstavitev" on public.profil_igralca
  for insert to authenticated with check (je_lastnik_profila(player_id));
create policy "lastnik ureja predstavitev" on public.profil_igralca
  for update to authenticated using (je_lastnik_profila(player_id)) with check (je_lastnik_profila(player_id));

create or replace function public.profil_igralca_ob_spremembi()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger profil_igralca_spremenjen before insert or update on public.profil_igralca
  for each row execute function public.profil_igralca_ob_spremembi();

-- Anonimiziran igralec (ugovor, admin, `skrij_moje_ime`) izgubi predstavitev:
-- fotografija in omrežja bi ime razkrila.
create or replace function public.prevzem_ob_anonimizaciji()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_glavni bigint;
begin
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(new.id);
  if v_glavni is not null then
    perform prevzem_odstrani_predstavitev(v_glavni);
    insert into profil_igralca (player_id, skrij_ime) values (v_glavni, true);
  end if;
  return null;
end $$;
create trigger prevzem_anonimizacija after update of anonimiziran_at on public.players
  for each row when (old.anonimiziran_at is null and new.anonimiziran_at is not null)
  execute function public.prevzem_ob_anonimizaciji();

-- Javno: kateri igralci so potrjeni (glavne in povezane vrstice), kdo je
-- potrdil in katera vrstica nosi predstavitev. Brez uporabnika.
-- Ni security_invoker (bere mimo RLS zahtevkov), zato le branje.
create view public.potrjeni_igralci as
  select z.player_id, z.player_id as glavni_player_id, z.potrdil, z.decided_at as potrjen_at
    from zahtevki_igralca z where z.status = 'potrjen'
  union all
  select pi.player_id, z.player_id, z.potrdil, z.decided_at
    from povezani_igralci pi join zahtevki_igralca z on z.id = pi.zahtevek_id and z.status = 'potrjen';
revoke all on public.potrjeni_igralci from anon, authenticated;
grant select on public.potrjeni_igralci to anon, authenticated;

-- Fotografije za sezname (Igralci, Moja ekipa, Tekma, Klub, Ekipa, iskanje):
-- ena poizvedba `player_id in (…)` na seznam, ne ena na igralca. Pot je
-- "<glavni>/<ime>.webp" (256 px), manjša je "<glavni>/<ime>-64.webp".
create view public.fotografije_igralcev as
  select pg.player_id, pr.fotografija
    from potrjeni_igralci pg
    join profil_igralca pr on pr.player_id = pg.glavni_player_id
   where pr.fotografija is not null;
revoke all on public.fotografije_igralcev from anon, authenticated;
grant select on public.fotografije_igralcev to anon, authenticated;

-- --------------------------------------------------------------------------
-- Uporabnik: zahtevek, preklic, prijava, skrij ime
-- --------------------------------------------------------------------------
create or replace function public.prevzemi_igralca(
  p_player_id bigint,
  p_dokaz_url text default null,
  p_star_vsaj_16 boolean default null
)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_p players;
  v_spor boolean;
  v_id bigint;
  v_dokaz text := nullif(btrim(coalesce(p_dokaz_url, '')), '');
begin
  if v_uid is null then
    raise insufficient_privilege using message = 'Za prevzem profila se je treba prijaviti.';
  end if;
  select * into v_p from players where id = p_player_id;
  if not found then
    raise exception 'Igralec ne obstaja.';
  end if;
  if v_p.anonimiziran_at is not null then
    raise exception 'Ime tega igralca je skrito; profila ni mogoče prevzeti.';
  end if;
  -- En profil na osebo: dodatne vrstice iste osebe poveže admin.
  if exists (select 1 from zahtevki_igralca where user_id = v_uid and status = 'potrjen') then
    raise exception 'Že imaš potrjen profil igralca. Druge vrstice iste osebe poveže skrbnik.';
  end if;
  if exists (select 1 from zahtevki_igralca where user_id = v_uid and status = 'cakajoc') then
    raise exception 'Tvoj zahtevek že čaka na potrditev.';
  end if;
  if (select count(*) from zahtevki_igralca where user_id = v_uid and created_at > now() - interval '30 days') >= 5 then
    raise exception 'Preveč zahtevkov v zadnjih 30 dneh.';
  end if;
  if je_mladinska_liga(v_p.competition_id) and p_star_vsaj_16 is not true then
    raise exception 'V mladinski ligi moraš potrditi, da si star vsaj 16 let.';
  end if;
  if v_dokaz is not null and (length(v_dokaz) > 300 or v_dokaz !~ '^https?://[^[:space:]<>"]+$') then
    raise exception 'Dokaz mora biti povezava (https://…).';
  end if;

  v_spor := prevzem_zahtevek_igralca(p_player_id) is not null
         or exists (select 1 from zahtevki_igralca where player_id = p_player_id and status = 'cakajoc');

  insert into zahtevki_igralca (player_id, user_id, spor, star_vsaj_16, dokaz_url)
  values (p_player_id, v_uid, v_spor,
          case when je_mladinska_liga(v_p.competition_id) then true end, v_dokaz)
  returning id into v_id;

  if v_spor then
    update zahtevki_igralca set spor = true
     where player_id = p_player_id and status = 'cakajoc' and id <> v_id;
  end if;
  return v_id;
end;
$$;

-- Lastnik umakne čakajoči zahtevek ali se odpove potrjenemu profilu.
create or replace function public.preklici_moj_zahtevek(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from zahtevki_igralca where id = p_id and user_id = auth.uid()) then
    raise insufficient_privilege using message = 'To ni tvoj zahtevek.';
  end if;
  perform prevzem_preklici(p_id, auth.uid(), null);
end;
$$;

create or replace function public.prijavi_profil_igralca(p_player_id bigint, p_razlog text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_z bigint := prevzem_zahtevek_igralca(p_player_id);
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Za prijavo se je treba prijaviti.';
  end if;
  if v_z is null then
    raise exception 'Igralec nima potrjenega profila.';
  end if;
  if exists (select 1 from zahtevki_igralca where id = v_z and user_id = auth.uid()) then
    raise exception 'Svojega profila ne moreš prijaviti.';
  end if;
  if exists (select 1 from prijave_profila_igralca where zahtevek_id = v_z and user_id = auth.uid() and resena_at is null) then
    raise exception 'Ta profil si že prijavil.';
  end if;
  if (select count(*) from prijave_profila_igralca where user_id = auth.uid() and resena_at is null) >= 10 then
    raise exception 'Preveč odprtih prijav.';
  end if;
  insert into prijave_profila_igralca (zahtevek_id, user_id, razlog)
  values (v_z, auth.uid(), nullif(left(btrim(coalesce(p_razlog, '')), 500), ''));
end;
$$;

-- Samopostrežna anonimizacija: obstoječi mehanizem (`anonimiziraj_igralca`,
-- razlog 'ugovor' = dokončno) za vse vrstice osebe — povezane in tiste z isto
-- šifro v državi, kot `admin_anonimiziraj_igralca`.
create or replace function public.skrij_moje_ime()
returns integer language plpgsql security definer set search_path = public
as $$
declare
  v_z zahtevki_igralca;
  v_id bigint;
  v_n integer := 0;
begin
  select * into v_z from zahtevki_igralca where user_id = auth.uid() and status = 'potrjen';
  if not found then
    raise insufficient_privilege using message = 'Ime lahko skrije le potrjen igralec.';
  end if;
  for v_id in
    with osebe as (
      select v_z.player_id as id
      union select player_id from povezani_igralci where zahtevek_id = v_z.id
    )
    select id from osebe
    union
    select o.id
      from osebe s join players p on p.id = s.id
      join competitions pc on pc.id = p.competition_id
      join players o on o.reg_st = p.reg_st
      join competitions oc on oc.id = o.competition_id and oc.country_id = pc.country_id
     where p.reg_st is not null
  loop
    perform anonimiziraj_igralca(v_id, 'ugovor');
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- --------------------------------------------------------------------------
-- Potrjevanje: poznavalec kluba, soigralci
-- --------------------------------------------------------------------------

-- Čakajoči zahtevki, o katerih klicatelj sme odločati (brez sporov in
-- brez svojih). `p_team_id` za stran kluba, `p_player_id` za stran igralca.
create or replace function public.zahtevki_za_odlocitev(p_team_id bigint default null, p_player_id bigint default null)
returns table (
  id bigint, player_id bigint, player_name text, team_id bigint, competition_id bigint,
  prosilec text, dokaz_url text, created_at timestamptz,
  vloga text, ze_potrdil boolean, potrditev int
)
language sql stable security definer set search_path = public
as $$
  select z.id, z.player_id, p.full_name, p.team_id, p.competition_id,
         pf.display_name, z.dokaz_url, z.created_at,
         case when prevzem_je_poznavalec_kluba(auth.uid(), z.player_id) then 'klub' else 'soigralec' end,
         exists (select 1 from potrditve_soigralcev ps where ps.zahtevek_id = z.id and ps.user_id = auth.uid()),
         (select count(*)::int from potrditve_soigralcev ps where ps.zahtevek_id = z.id)
    from zahtevki_igralca z
    join players p on p.id = z.player_id
    left join profiles pf on pf.id = z.user_id
   where auth.uid() is not null
     and z.status = 'cakajoc' and not z.spor and z.user_id <> auth.uid()
     and (p_team_id is null or p.team_id = p_team_id)
     and (p_player_id is null or z.player_id = p_player_id)
     and (prevzem_je_poznavalec_kluba(auth.uid(), z.player_id) or prevzem_soigralec(auth.uid(), z.player_id) is not null)
   order by z.created_at
   limit 100
$$;

create or replace function public.odloci_zahtevek_klub(p_id bigint, p_potrdi boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  z zahtevki_igralca;
begin
  select * into z from zahtevki_igralca where id = p_id;
  if not found or z.status <> 'cakajoc' then
    raise exception 'Zahtevek ni več odprt.';
  end if;
  if z.user_id = auth.uid() then
    raise insufficient_privilege using message = 'Svojega zahtevka ne moreš potrditi.';
  end if;
  if auth.uid() is null or not prevzem_je_poznavalec_kluba(auth.uid(), z.player_id) then
    raise insufficient_privilege using message = 'Zahtevek potrdi le poznavalec kluba.';
  end if;
  if z.spor then
    raise insufficient_privilege using message = 'O spornem zahtevku odloči skrbnik.';
  end if;
  if p_potrdi then
    perform prevzem_potrdi(p_id, 'klub', auth.uid());
  else
    update zahtevki_igralca
       set status = 'zavrnjen', decided_at = now(), decided_by = auth.uid(),
           note = nullif(left(btrim(coalesce(p_note, '')), 500), '')
     where id = p_id;
  end if;
end;
$$;

-- Soigralec potrdi; ob drugem različnem potrjenem soigralcu je zahtevek potrjen.
create or replace function public.potrdi_soigralca(p_id bigint)
returns text language plpgsql security definer set search_path = public
as $$
declare
  z zahtevki_igralca;
  v_moj bigint;
  v_n int;
begin
  select * into z from zahtevki_igralca where id = p_id for update;
  if not found or z.status <> 'cakajoc' then
    raise exception 'Zahtevek ni več odprt.';
  end if;
  if z.user_id = auth.uid() then
    raise insufficient_privilege using message = 'Svojega zahtevka ne moreš potrditi.';
  end if;
  if z.spor then
    raise insufficient_privilege using message = 'O spornem zahtevku odloči skrbnik.';
  end if;
  v_moj := case when auth.uid() is null then null else prevzem_soigralec(auth.uid(), z.player_id) end;
  if v_moj is null then
    raise insufficient_privilege using message = 'Potrdi lahko le potrjen soigralec iz istega kluba in lige.';
  end if;
  insert into potrditve_soigralcev (zahtevek_id, user_id, player_id)
  values (p_id, auth.uid(), v_moj)
  on conflict do nothing;
  if not found then
    raise exception 'Tega soigralca si že potrdil.';
  end if;
  -- Štejejo le potrjevalci, ki so še vedno potrjeni soigralci.
  select count(*) into v_n from potrditve_soigralcev ps
   where ps.zahtevek_id = p_id and prevzem_soigralec(ps.user_id, z.player_id) is not null;
  if v_n >= 2 then
    perform prevzem_potrdi(p_id, 'soigralci', auth.uid());
    return 'potrjen';
  end if;
  return 'zabelezeno';
end;
$$;

-- --------------------------------------------------------------------------
-- Klub po mailu: enkratna povezava
-- --------------------------------------------------------------------------

-- Servis (funkcija `posli-prevzem`): zahtevki, ki jih je treba sporočiti
-- klubu, z novim žetonom. Klub brez naslova, `ne_zeli` ali `napacen_mail`
-- se preskoči; en mail na klub na dan.
create or replace function public.prevzem_za_posto_klubu(p_najvec int default 20)
returns table (
  zahtevek_id bigint, zeton text, email text, klub text, igralec text,
  liga_slug text, liga text, drzava text, prosilec text, expires_at timestamptz, klub_stik_id bigint
)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  r record;
  v_zeton text;
  v_stik bigint;
  v_n int := 0;
begin
  for r in
    select z.id, p.full_name, p.team_id, t.name as klub, c.slug, c.name as liga, co.code as drzava,
           pf.display_name
      from zahtevki_igralca z
      join players p on p.id = z.player_id
      join teams t on t.id = p.team_id
      join competitions c on c.id = p.competition_id
      left join countries co on co.id = c.country_id
      left join profiles pf on pf.id = z.user_id
     where z.status = 'cakajoc' and not z.spor
       and not exists (select 1 from zetoni_prevzema zp where zp.zahtevek_id = z.id)
     order by z.created_at
  loop
    exit when v_n >= p_najvec;
    select ks.id into v_stik from klub_stik ks
     where ks.team_id = r.team_id and coalesce(ks.email, '') <> ''
       and ks.stanje not in ('ne_zeli', 'napacen_mail')
     order by ks.id limit 1;
    continue when v_stik is null;
    continue when exists (select 1 from zetoni_prevzema zp
                           where zp.klub_stik_id = v_stik and zp.created_at > now() - interval '1 day');
    v_zeton := encode(extensions.gen_random_bytes(32), 'hex');
    insert into zetoni_prevzema (zahtevek_id, hash, klub_stik_id)
    values (r.id, encode(sha256(convert_to(v_zeton, 'UTF8')), 'hex'), v_stik);
    v_n := v_n + 1;
    return query
      select r.id, v_zeton, ks.email, r.klub, r.full_name, r.slug, r.liga, r.drzava, r.display_name,
             now() + interval '14 days', v_stik
        from klub_stik ks where ks.id = v_stik;
  end loop;
end;
$$;
revoke all on function public.prevzem_za_posto_klubu(int) from public, anon, authenticated;
grant execute on function public.prevzem_za_posto_klubu(int) to service_role;

create or replace function public.prevzem_zeton_hash(p_zeton text)
returns text language sql immutable set search_path = public
as $$ select encode(sha256(convert_to(coalesce(p_zeton, ''), 'UTF8')), 'hex') $$;

-- Kaj povezava potrjuje (za stran /claim). Brez žetona ne vrne ničesar.
create or replace function public.prevzem_zeton_podatki(p_zeton text)
returns table (stanje text, igralec text, klub text, liga text, prosilec text, dokaz_url text, expires_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select case
           when zp.porabljen_at is not null then 'porabljen'
           when zp.expires_at <= now() then 'potekel'
           when z.status <> 'cakajoc' or z.spor then 'zaprt'
           else 'veljaven'
         end,
         p.full_name, t.name, c.name, pf.display_name, z.dokaz_url, zp.expires_at
    from zetoni_prevzema zp
    join zahtevki_igralca z on z.id = zp.zahtevek_id
    join players p on p.id = z.player_id
    left join teams t on t.id = p.team_id
    left join competitions c on c.id = p.competition_id
    left join profiles pf on pf.id = z.user_id
   where zp.hash = prevzem_zeton_hash(p_zeton)
$$;

create or replace function public.prevzem_odloci_z_zetonom(p_zeton text, p_potrdi boolean)
returns text language plpgsql security definer set search_path = public
as $$
declare
  zp zetoni_prevzema;
  z zahtevki_igralca;
begin
  select * into zp from zetoni_prevzema where hash = prevzem_zeton_hash(p_zeton) for update;
  if not found then
    raise insufficient_privilege using message = 'Povezava ni veljavna.';
  end if;
  if zp.porabljen_at is not null then
    raise insufficient_privilege using message = 'Povezava je že bila uporabljena.';
  end if;
  if zp.expires_at <= now() then
    raise insufficient_privilege using message = 'Povezava je potekla.';
  end if;
  select * into z from zahtevki_igralca where id = zp.zahtevek_id;
  if z.status <> 'cakajoc' or z.spor then
    raise exception 'Zahtevek ni več odprt.';
  end if;
  update zetoni_prevzema
     set porabljen_at = now(), odlocitev = case when p_potrdi then 'potrdi' else 'zavrni' end
   where id = zp.id;
  if p_potrdi then
    perform prevzem_potrdi(z.id, 'klub', null);
    return 'potrjen';
  end if;
  update zahtevki_igralca set status = 'zavrnjen', decided_at = now(), note = 'Zavrnil klub (povezava).'
   where id = z.id;
  return 'zavrnjen';
end;
$$;

-- --------------------------------------------------------------------------
-- Admin
-- --------------------------------------------------------------------------

-- Vrsta: čakajoči starejši od 7 dni, sporni, prijavljeni in nedavno potrjeni.
create or replace function public.admin_zahtevki_igralcev()
returns table (
  id bigint, player_id bigint, player_name text, team_name text, competition_id bigint, liga text,
  user_id uuid, prosilec text, email text, status text, potrdil text, spor boolean,
  star_vsaj_16 boolean, dokaz_url text, created_at timestamptz, decided_at timestamptz,
  prijav int, razlogi text[], potrditev int, povezanih int, vrsta text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  select z.id, z.player_id, p.full_name, t.name, p.competition_id, c.name,
         z.user_id, pf.display_name, u.email::text, z.status, z.potrdil, z.spor,
         z.star_vsaj_16, z.dokaz_url, z.created_at, z.decided_at,
         (select count(*)::int from prijave_profila_igralca pr where pr.zahtevek_id = z.id and pr.resena_at is null),
         array(select pr.razlog from prijave_profila_igralca pr where pr.zahtevek_id = z.id and pr.resena_at is null and pr.razlog is not null),
         (select count(*)::int from potrditve_soigralcev ps where ps.zahtevek_id = z.id),
         (select count(*)::int from povezani_igralci pi where pi.zahtevek_id = z.id),
         case
           when z.status = 'cakajoc' and z.spor then 'spor'
           when z.status = 'cakajoc' then 'star'
           when exists (select 1 from prijave_profila_igralca pr where pr.zahtevek_id = z.id and pr.resena_at is null) then 'prijava'
           else 'potrjen'
         end
    from zahtevki_igralca z
    join players p on p.id = z.player_id
    left join teams t on t.id = p.team_id
    left join competitions c on c.id = p.competition_id
    left join profiles pf on pf.id = z.user_id
    left join auth.users u on u.id = z.user_id
   where (z.status = 'cakajoc' and (z.spor or z.created_at < now() - interval '7 days'))
      or (z.status = 'potrjen' and (z.decided_at > now() - interval '60 days'
          or exists (select 1 from prijave_profila_igralca pr where pr.zahtevek_id = z.id and pr.resena_at is null)))
   order by case when z.status = 'cakajoc' then 0 else 1 end, z.created_at;
end;
$$;

-- potrdi / zavrni (čakajoči), preklici (čakajoči ali potrjen), zavrzi_prijave.
create or replace function public.admin_odloci_zahtevek(p_id bigint, p_odlocitev text, p_note text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  z zahtevki_igralca;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  select * into z from zahtevki_igralca where id = p_id;
  if not found then
    raise exception 'Zahtevek ne obstaja.';
  end if;
  if p_odlocitev = 'potrdi' then
    perform prevzem_potrdi(p_id, 'admin', auth.uid());
  elsif p_odlocitev = 'zavrni' then
    if z.status <> 'cakajoc' then raise exception 'Zahtevek ni odprt.'; end if;
    update zahtevki_igralca
       set status = 'zavrnjen', decided_at = now(), decided_by = auth.uid(),
           note = nullif(left(btrim(coalesce(p_note, '')), 500), '')
     where id = p_id;
  elsif p_odlocitev = 'preklici' then
    perform prevzem_preklici(p_id, auth.uid(), left(p_note, 500));
  elsif p_odlocitev = 'zavrzi_prijave' then
    update prijave_profila_igralca set resena_at = now(), resil = auth.uid()
     where zahtevek_id = p_id and resena_at is null;
  else
    raise exception 'Odločitev je potrdi, zavrni, preklici ali zavrzi_prijave.';
  end if;
end;
$$;

-- Admin odstrani fotografijo kateregakoli profila (prijava, neprimerna slika).
create or replace function public.admin_odstrani_fotografijo(p_player_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_glavni bigint;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  v_glavni := coalesce(v_glavni, p_player_id);
  update profil_igralca set fotografija = null where player_id = v_glavni;
  perform prevzem_odstrani_fotografije(v_glavni);
end;
$$;

-- Predlogi za povezavo: druge vrstice z istim imenom (brez šumnikov) v isti
-- državi. Ista šifra osebe je najmočnejši znak, nato isti klub, nato klub, ki
-- igra v ligi glavne vrstice.
create or replace function public.admin_predlogi_povezav(p_zahtevek_id bigint)
returns table (player_id bigint, full_name text, team_name text, liga text, liga_slug text,
               ista_sifra boolean, isti_klub boolean, klub_v_ligi boolean, povezan boolean, zaseden boolean)
language plpgsql stable security definer set search_path = public, extensions
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  with g as (
    select p.*, c.country_id from zahtevki_igralca z
      join players p on p.id = z.player_id join competitions c on c.id = p.competition_id
     where z.id = p_zahtevek_id
  )
  select o.id, o.full_name, t.name, oc.name, oc.slug,
         (g.reg_st is not null and o.reg_st = g.reg_st),
         o.team_id = g.team_id,
         exists (select 1 from competition_teams ct where ct.competition_id = g.competition_id and ct.team_id = o.team_id),
         exists (select 1 from povezani_igralci pi where pi.player_id = o.id and pi.zahtevek_id = p_zahtevek_id),
         exists (select 1 from zahtevki_igralca z2 where z2.status = 'potrjen' and z2.player_id = o.id)
           or exists (select 1 from povezani_igralci pi where pi.player_id = o.id and pi.zahtevek_id <> p_zahtevek_id)
    from g
    join players o on o.id <> g.id and o.anonimiziran_at is null
     and (podpora_brez_sumnikov(o.full_name) = podpora_brez_sumnikov(g.full_name)
          or (g.reg_st is not null and o.reg_st = g.reg_st))
    join competitions oc on oc.id = o.competition_id and oc.country_id = g.country_id
    left join teams t on t.id = o.team_id
   order by 6 desc, 7 desc, 8 desc, oc.name
   limit 30;
end;
$$;

create or replace function public.admin_povezi_igralca(p_zahtevek_id bigint, p_player_id bigint, p_povezi boolean default true)
returns void language plpgsql security definer set search_path = public
as $$
declare
  z zahtevki_igralca;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  if not p_povezi then
    delete from povezani_igralci where player_id = p_player_id and zahtevek_id = p_zahtevek_id;
    return;
  end if;
  select * into z from zahtevki_igralca where id = p_zahtevek_id;
  if not found or z.status <> 'potrjen' then
    raise exception 'Povezati se da le k potrjenemu profilu.';
  end if;
  if p_player_id = z.player_id or prevzem_zahtevek_igralca(p_player_id) is not null then
    raise exception 'Ta vrstica že pripada potrjenemu profilu.';
  end if;
  insert into povezani_igralci (player_id, zahtevek_id, povezal) values (p_player_id, p_zahtevek_id, auth.uid());
  -- Odprti zahtevki drugih za to vrstico postanejo sporni.
  update zahtevki_igralca set spor = true where player_id = p_player_id and status = 'cakajoc';
end;
$$;

-- --------------------------------------------------------------------------
-- Pravice RPC
-- --------------------------------------------------------------------------
revoke all on function public.prevzemi_igralca(bigint, text, boolean), public.preklici_moj_zahtevek(bigint),
  public.prijavi_profil_igralca(bigint, text), public.skrij_moje_ime(),
  public.zahtevki_za_odlocitev(bigint, bigint), public.odloci_zahtevek_klub(bigint, boolean, text),
  public.potrdi_soigralca(bigint), public.prevzem_zeton_podatki(text), public.prevzem_odloci_z_zetonom(text, boolean),
  public.admin_zahtevki_igralcev(), public.admin_odloci_zahtevek(bigint, text, text),
  public.admin_predlogi_povezav(bigint), public.admin_povezi_igralca(bigint, bigint, boolean),
  public.admin_odstrani_fotografijo(bigint)
  from public, anon;
grant execute on function public.prevzemi_igralca(bigint, text, boolean), public.preklici_moj_zahtevek(bigint),
  public.prijavi_profil_igralca(bigint, text), public.skrij_moje_ime(),
  public.zahtevki_za_odlocitev(bigint, bigint), public.odloci_zahtevek_klub(bigint, boolean, text),
  public.potrdi_soigralca(bigint),
  public.admin_zahtevki_igralcev(), public.admin_odloci_zahtevek(bigint, text, text),
  public.admin_predlogi_povezav(bigint), public.admin_povezi_igralca(bigint, bigint, boolean),
  public.admin_odstrani_fotografijo(bigint)
  to authenticated;
-- Klub odloča brez računa: povezava iz maila.
grant execute on function public.prevzem_zeton_podatki(text), public.prevzem_odloci_z_zetonom(text, boolean)
  to anon, authenticated;

-- --------------------------------------------------------------------------
-- Shramba fotografij. Strežnik SLFF (Hetzner) storitve Storage zdaj NIMA
-- (sheme `storage` ni), zato se vedro in pravila ustvarijo le, kjer shramba
-- obstaja (lokalno). Ko jo na strežniku vklopiš: `select prevzem_pripravi_shrambo();`
-- --------------------------------------------------------------------------
create or replace function public.prevzem_pripravi_shrambo()
returns void language plpgsql security definer set search_path = public
as $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'Sheme storage ni: vedro fotografij ni ustvarjeno.';
    return;
  end if;
  execute $s$
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('fotografije-igralcev', 'fotografije-igralcev', true, 2097152,
            array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
                                   allowed_mime_types = excluded.allowed_mime_types
  $s$;
  execute 'drop policy if exists "fotografije igralcev: lastnik bere" on storage.objects';
  execute 'drop policy if exists "fotografije igralcev: lastnik naloži" on storage.objects';
  execute 'drop policy if exists "fotografije igralcev: lastnik zamenja" on storage.objects';
  execute 'drop policy if exists "fotografije igralcev: lastnik izbriše" on storage.objects';
  execute $s$create policy "fotografije igralcev: lastnik bere" on storage.objects for select to authenticated
    using (bucket_id = 'fotografije-igralcev' and public.prevzem_sme_pisati_foto(name))$s$;
  execute $s$create policy "fotografije igralcev: lastnik naloži" on storage.objects for insert to authenticated
    with check (bucket_id = 'fotografije-igralcev' and public.prevzem_sme_pisati_foto(name))$s$;
  execute $s$create policy "fotografije igralcev: lastnik zamenja" on storage.objects for update to authenticated
    using (bucket_id = 'fotografije-igralcev' and public.prevzem_sme_pisati_foto(name))
    with check (bucket_id = 'fotografije-igralcev' and public.prevzem_sme_pisati_foto(name))$s$;
  execute $s$create policy "fotografije igralcev: lastnik izbriše" on storage.objects for delete to authenticated
    using (bucket_id = 'fotografije-igralcev' and public.prevzem_sme_pisati_foto(name))$s$;
end;
$$;
revoke all on function public.prevzem_pripravi_shrambo() from public, anon, authenticated;

select public.prevzem_pripravi_shrambo();
