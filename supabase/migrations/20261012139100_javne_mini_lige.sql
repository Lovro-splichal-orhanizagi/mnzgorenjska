-- Javne mini lige: lastnik ligo objavi v eni ligi (tekmovanju), drugi jo
-- najdejo na strani Mini lige in se pridružijo brez kode.
--
-- Javna liga pokaže vsem le lestvico (ime ekipe, lastnik, točke, mesto),
-- nikoli kode ali postav. Zasebne lige ostanejo, kot so: le člani.
-- Vse gre prek RPC; tabela mini_lige ostane zaprta za tujce (RLS), ker nosi
-- kodo.

-- ---------------------------------------------------------------------------
-- Stolpci
-- ---------------------------------------------------------------------------
alter table public.mini_lige
  add column javna boolean not null default false,
  add column opis text check (opis is null or char_length(opis) <= 120),
  add column competition_id bigint references public.competitions(id) on delete set null,
  -- Admin je ligo skril: lastnik je ne more spet objaviti.
  add column javna_zaklenjena_at timestamptz;

alter table public.mini_lige
  add constraint mini_lige_javna_ima_ligo check (not javna or competition_id is not null);

create index mini_lige_javne_idx on public.mini_lige (competition_id) where javna;

-- Lastnik je doslej smel posodobiti vsak stolpec (politika "lastnik ureja
-- mini ligo"), vmesnik pa ne piše nobenega. Javnost, opis in ligo zato nastavi
-- le `nastavi_javnost_mini_lige`; neposredno ostane le preimenovanje.
-- Vpis gre itak prek `ustvari_mini_ligo`.
revoke insert, update on public.mini_lige from anon, authenticated;
grant update (name) on public.mini_lige to authenticated;

-- ---------------------------------------------------------------------------
-- Prepovedane besede: skupno za prikazno ime in javno mini ligo
-- ---------------------------------------------------------------------------
-- Isto pravilo kot doslej v `napaka_prikaznega_imena` (znaki, rezervirane
-- besede, žaljivke), le brez dolžine. Vrne 'znaki', 'rezervirano',
-- 'neprimerno' ali null. Kopija v JS je `prepovedanoBesedilo` (src/lib/profil.ts).
create or replace function public.prepovedano_besedilo(p_besedilo text)
returns text
language plpgsql
immutable
set search_path = public, extensions
as $$
declare
  v text := btrim(regexp_replace(coalesce(p_besedilo, ''), '\s+', ' ', 'g'));
  v_cisto text;
begin
  -- Kontrolni in nevidni znaki ter znaki, ki jih v imenu ni treba.
  if v ~ '[[:cntrl:]<>{}\[\]|\\/@#$%^*=+~`"]'
     or v ~ '[​-‏ - ⁠-⁯﻿]' then
    return 'znaki';
  end if;
  -- Brez šumnikov, malih črk, števke kot črke (4dm1n), brez ločil vmes (s.l.f.f).
  v_cisto := translate(podpora_brez_sumnikov(v), '0134578@$!|', 'oieastbasii');
  v_cisto := regexp_replace(v_cisto, '[^a-z]', '', 'g');
  if v_cisto ~ '(admin|slff|moderat|support|podpora|helpstack|sysop|official|uradn|ekipaslff)' then
    return 'rezervirano';
  end if;
  if v_cisto ~ '(fuck|shit|cunt|nigg|hitler|kurac|pizd|picka|jebem|jebi|kurva|faggot|retard|fotze|kokot)' then
    return 'neprimerno';
  end if;
  return null;
end;
$$;

-- Prikazno ime: dolžina, nato skupno pravilo (vedenje ostane enako).
create or replace function public.napaka_prikaznega_imena(p_ime text)
returns text
language plpgsql
immutable
set search_path = public, extensions
as $$
declare
  v text := btrim(regexp_replace(coalesce(p_ime, ''), '\s+', ' ', 'g'));
  v_napaka text;
begin
  if char_length(v) < 3 or char_length(v) > 24 then
    return 'ime-dolzina';
  end if;
  v_napaka := prepovedano_besedilo(v);
  return case when v_napaka is null then null else 'ime-' || v_napaka end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Varovalo javne lige (velja za vsako pot: RPC, admin, servis)
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER kot `varuj_prikazno_ime`: lastnik ligo preimenuje sam
-- (update name), pravilo pa kliče funkcije, ki jih vlogi nimata.
create or replace function public.varuj_mini_ligo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_napaka text;
begin
  if new.opis is not null then
    new.opis := nullif(btrim(regexp_replace(new.opis, '\s+', ' ', 'g')), '');
  end if;

  if not new.javna then
    return new;
  end if;

  if new.javna_zaklenjena_at is not null then
    raise exception 'To mini ligo je skril administrator.'
      using errcode = '42501', hint = 'javna-zaklenjena';
  end if;
  if new.competition_id is null then
    raise exception 'Izberi ligo, v kateri bo mini liga javna.' using hint = 'javna-liga';
  end if;

  -- Ime in opis javne lige vidijo vsi: isto pravilo kot za prikazno ime.
  v_napaka := prepovedano_besedilo(new.name);
  if v_napaka = 'znaki' then
    raise exception 'Ime mini lige vsebuje nedovoljene znake.' using hint = 'ime-znaki';
  elsif v_napaka is not null then
    raise exception 'To ime mini lige ni dovoljeno.' using hint = 'ime-' || v_napaka;
  end if;
  if new.opis is not null then
    if char_length(new.opis) > 120 then
      raise exception 'Opis je lahko dolg največ 120 znakov.' using hint = 'opis-dolzina';
    end if;
    v_napaka := prepovedano_besedilo(new.opis);
    if v_napaka = 'znaki' then
      raise exception 'Opis vsebuje nedovoljene znake.' using hint = 'opis-znaki';
    elsif v_napaka is not null then
      raise exception 'Ta opis ni dovoljen.' using hint = 'opis-' || v_napaka;
    end if;
  end if;

  -- Največ tri javne lige istega lastnika v eni ligi. Zaklep na lastnika,
  -- da dve hkratni objavi ne prideta obe mimo štetja.
  if tg_op = 'INSERT' or not old.javna
     or old.competition_id is distinct from new.competition_id
     or old.owner_id is distinct from new.owner_id then
    perform pg_advisory_xact_lock(hashtext('javne-mini-lige:' || new.owner_id::text));
    if (select count(*) from mini_lige m
         where m.owner_id = new.owner_id
           and m.competition_id = new.competition_id
           and m.javna
           and m.id is distinct from new.id) >= 3 then
      raise exception 'V eni ligi so lahko javne največ 3 tvoje mini lige.' using hint = 'javne-najvec';
    end if;
  end if;

  return new;
end;
$$;

create trigger mini_lige_varuj
  before insert or update of name, opis, javna, competition_id, javna_zaklenjena_at, owner_id
  on public.mini_lige
  for each row execute function public.varuj_mini_ligo();

-- ---------------------------------------------------------------------------
-- Lastnik: objavi ali skrij
-- ---------------------------------------------------------------------------
create or replace function public.nastavi_javnost_mini_lige(
  p_liga bigint,
  p_javna boolean,
  p_opis text default null,
  p_tekmovanje bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liga mini_lige%rowtype;
  v_tek bigint;
begin
  if auth.uid() is null then
    raise exception 'Za mini ligo se je treba prijaviti.' using errcode = '42501';
  end if;

  select * into v_liga from mini_lige where id = p_liga for update;
  if not found or v_liga.owner_id <> auth.uid() then
    raise exception 'Javnost mini lige nastavi le njen ustvarjalec.' using errcode = '42501';
  end if;

  if not coalesce(p_javna, false) then
    update mini_lige set javna = false where id = p_liga;
    return;
  end if;

  v_tek := coalesce(p_tekmovanje, v_liga.competition_id);
  if v_tek is null then
    raise exception 'Izberi ligo, v kateri bo mini liga javna.' using hint = 'javna-liga';
  end if;
  -- Javna liga se pokaže v seznamu lige, zato jo objavi le, kdor v njej igra.
  if not exists (
    select 1 from fantasy_teams ft
      join competitions c on c.id = ft.competition_id
     where ft.owner_id = auth.uid() and ft.competition_id = v_tek
       and not ft.hisna and c.active
  ) then
    raise exception 'Za javno mini ligo potrebuješ ekipo v tej ligi.' using hint = 'javna-brez-ekipe';
  end if;

  update mini_lige
     set javna = true,
         opis = p_opis,
         competition_id = v_tek
   where id = p_liga;
end;
$$;

-- ---------------------------------------------------------------------------
-- Iskanje in ogled javnih lig (tudi neprijavljeni)
-- ---------------------------------------------------------------------------
create or replace function public.javne_mini_lige(
  p_tekmovanje bigint,
  p_iskanje text default null,
  p_omejitev int default 50
)
returns table (
  id bigint, name text, opis text, ekip int,
  owner_name text, owner_id uuid, created_at timestamptz, sem_clan boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with iskanje as (
    select nullif(btrim(coalesce(p_iskanje, '')), '') as niz
  ),
  vzorec as (
    -- % in _ v iskanju sta navadna znaka.
    select '%' || replace(replace(replace(niz, '\', '\\'), '%', '\%'), '_', '\_') || '%' as v
      from iskanje where niz is not null
  )
  select ml.id, ml.name, ml.opis,
         (select count(*)::int from mini_liga_clani c where c.mini_liga_id = ml.id) as ekip,
         pr.display_name, ml.owner_id, ml.created_at,
         sem_v_mini_ligi(ml.id)
    from mini_lige ml
    left join profiles pr on pr.id = ml.owner_id
   where ml.javna
     and ml.competition_id = p_tekmovanje
     and (not exists (select 1 from vzorec)
          or ml.name ilike (select v from vzorec)
          or ml.opis ilike (select v from vzorec))
   order by 4 desc, ml.created_at, ml.id
   limit least(greatest(coalesce(p_omejitev, 50), 1), 100);
$$;

-- Glava strani lige: javna liga vsem, zasebna le članom. Kode ne vrne.
create or replace function public.mini_liga_glava(p_liga bigint)
returns table (
  id bigint, name text, opis text, javna boolean,
  competition_id bigint, competition_slug text, competition_short text, competition_name text,
  ekip int, owner_name text, owner_id uuid, sem_clan boolean, sem_lastnik boolean, zaklenjena boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select ml.id, ml.name, ml.opis, ml.javna,
         ml.competition_id, k.slug, k.short_name, k.name,
         (select count(*)::int from mini_liga_clani c where c.mini_liga_id = ml.id),
         pr.display_name, ml.owner_id,
         sem_v_mini_ligi(ml.id),
         ml.owner_id = auth.uid(),
         ml.javna_zaklenjena_at is not null
    from mini_lige ml
    left join profiles pr on pr.id = ml.owner_id
    left join competitions_view k on k.id = ml.competition_id
   where ml.id = p_liga
     and (ml.javna or sem_v_mini_ligi(ml.id));
$$;

-- Lestvica javne lige: le lestvični stolpci, nikoli postave.
create or replace function public.lestvica_javne_mini_lige(p_liga bigint)
returns table (
  fantasy_team_id bigint, team_name text, owner_name text, owner_id uuid,
  total_points numeric, rounds_played bigint, points_per_round numeric,
  competition_short text, federation_short text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.fantasy_team_id, s.team_name, s.owner_name, s.owner_id,
         s.total_points, s.rounds_played,
         case when s.rounds_played > 0 then round(s.total_points / s.rounds_played, 2) else 0 end,
         k.short_name, k.federation_short
    from mini_lige ml
    join mini_liga_clani c on c.mini_liga_id = ml.id
    join fantasy_team_standings s on s.fantasy_team_id = c.fantasy_team_id
    left join competitions_view k on k.id = s.competition_id
   where ml.id = p_liga
     and (ml.javna or sem_v_mini_ligi(ml.id));
$$;

-- ---------------------------------------------------------------------------
-- Pridružitev javni ligi
-- ---------------------------------------------------------------------------
-- Ista pravila kot pri kodi (`pridruzi_mini_ligi`: le svoja ekipa, hišne ne
-- — sprožilec), poleg tega liga mora biti javna in ekipa iz njene lige.
create or replace function public.pridruzi_javni_mini_ligi(p_liga bigint, p_ekipa bigint)
returns table (mini_liga_id bigint, dodano boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liga mini_lige%rowtype;
  v_tek bigint;
  v_vrstic int;
begin
  if auth.uid() is null then
    raise exception 'Za mini ligo se je treba prijaviti.' using errcode = '42501';
  end if;
  select ft.competition_id into v_tek
    from fantasy_teams ft where ft.id = p_ekipa and ft.owner_id = auth.uid();
  if not found then
    raise exception 'To ni tvoja ekipa.' using errcode = '42501';
  end if;

  -- Zaklep vrstice: admin ali lastnik ligo ravno skriva.
  select * into v_liga from mini_lige where id = p_liga for share;
  if not found or not v_liga.javna then
    raise exception 'Ta mini liga ni javna.' using errcode = '42501';
  end if;
  if v_liga.competition_id is distinct from v_tek then
    raise exception 'Za to mini ligo potrebuješ ekipo v njeni ligi.' using errcode = '42501';
  end if;

  insert into mini_liga_clani (mini_liga_id, fantasy_team_id)
  values (p_liga, p_ekipa)
  on conflict do nothing;
  get diagnostics v_vrstic = row_count;

  return query select p_liga, v_vrstic > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Prijave in admin
-- ---------------------------------------------------------------------------
create table public.prijave_mini_lig (
  id bigint generated always as identity primary key,
  mini_liga_id bigint not null references public.mini_lige(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  razlog text check (razlog is null or char_length(razlog) <= 300),
  created_at timestamptz not null default now(),
  resena_at timestamptz,
  resil uuid references public.profiles(id) on delete set null
);
create unique index prijave_mini_lig_ena_odprta
  on public.prijave_mini_lig (mini_liga_id, user_id) where resena_at is null;
create index prijave_mini_lig_odprte on public.prijave_mini_lig (mini_liga_id) where resena_at is null;

alter table public.prijave_mini_lig enable row level security;
revoke all on public.prijave_mini_lig from anon, authenticated;

create or replace function public.prijavi_mini_ligo(p_liga bigint, p_razlog text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Za prijavo se je treba prijaviti.' using errcode = '42501';
  end if;
  if not exists (select 1 from mini_lige where id = p_liga and javna) then
    raise exception 'Ta mini liga ni javna.' using errcode = '42501';
  end if;
  if exists (select 1 from prijave_mini_lig
              where mini_liga_id = p_liga and user_id = auth.uid() and resena_at is null) then
    raise exception 'To mini ligo si že prijavil.';
  end if;
  if (select count(*) from prijave_mini_lig where user_id = auth.uid() and resena_at is null) >= 10 then
    raise exception 'Preveč odprtih prijav.';
  end if;
  insert into prijave_mini_lig (mini_liga_id, user_id, razlog)
  values (p_liga, auth.uid(), nullif(left(btrim(coalesce(p_razlog, '')), 300), ''));
end;
$$;

-- Vrsta admina: javne (ali že skrite) lige z odprtimi prijavami.
create or replace function public.admin_prijave_mini_lig()
returns table (
  mini_liga_id bigint, ime text, opis text, javna boolean, liga text,
  lastnik text, lastnik_id uuid, ekip int, prijav int, razlogi text[], zadnja timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo za administratorje.' using errcode = '42501';
  end if;
  return query
  select ml.id, ml.name, ml.opis, ml.javna, k.short_name,
         pr.display_name, ml.owner_id,
         (select count(*)::int from mini_liga_clani c where c.mini_liga_id = ml.id),
         count(p.id)::int,
         array_remove(array_agg(p.razlog order by p.created_at desc), null),
         max(p.created_at)
    from prijave_mini_lig p
    join mini_lige ml on ml.id = p.mini_liga_id
    left join profiles pr on pr.id = ml.owner_id
    left join competitions k on k.id = ml.competition_id
   where p.resena_at is null
   group by ml.id, k.short_name, pr.display_name
   order by count(p.id) desc, max(p.created_at) desc;
end;
$$;

-- Admin ligo skrije (in zaklene objavo) ali prijave zavrne. Člani ostanejo.
create or replace function public.admin_odloci_mini_ligo(p_liga bigint, p_skrij boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Samo za administratorje.' using errcode = '42501';
  end if;
  if p_skrij then
    update mini_lige set javna = false, javna_zaklenjena_at = now() where id = p_liga;
  end if;
  update prijave_mini_lig set resena_at = now(), resil = auth.uid()
   where mini_liga_id = p_liga and resena_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pravice
-- ---------------------------------------------------------------------------
revoke all on function public.prepovedano_besedilo(text) from public;
revoke all on function public.varuj_mini_ligo() from public;
revoke all on function public.nastavi_javnost_mini_lige(bigint, boolean, text, bigint) from public;
revoke all on function public.javne_mini_lige(bigint, text, int) from public;
revoke all on function public.mini_liga_glava(bigint) from public;
revoke all on function public.lestvica_javne_mini_lige(bigint) from public;
revoke all on function public.pridruzi_javni_mini_ligi(bigint, bigint) from public;
revoke all on function public.prijavi_mini_ligo(bigint, text) from public;
revoke all on function public.admin_prijave_mini_lig() from public;
revoke all on function public.admin_odloci_mini_ligo(bigint, boolean) from public;

grant execute on function public.javne_mini_lige(bigint, text, int) to anon, authenticated;
grant execute on function public.mini_liga_glava(bigint) to anon, authenticated;
grant execute on function public.lestvica_javne_mini_lige(bigint) to anon, authenticated;
grant execute on function public.nastavi_javnost_mini_lige(bigint, boolean, text, bigint) to authenticated;
grant execute on function public.pridruzi_javni_mini_ligi(bigint, bigint) to authenticated;
grant execute on function public.prijavi_mini_ligo(bigint, text) to authenticated;
grant execute on function public.admin_prijave_mini_lig() to authenticated;
grant execute on function public.admin_odloci_mini_ligo(bigint, boolean) to authenticated;
