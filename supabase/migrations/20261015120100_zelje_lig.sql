-- "Moje lige ni": obiskovalec pove, katero ligo bi rad (MŽNL Brod-Požega,
-- Vinkovci-Osijek, Italija …). Prijavljen z enim klikom, neprijavljen pusti
-- e-naslov, da mu javimo, ko liga zaživi.
--
-- Zasebnost: e-naslov je le za to eno obvestilo. Po obvestilu se pobriše
-- (vrstica ostane za štetje), neobveščene vrstice z naslovom gredo po 12
-- mesecih proč (pg_cron). Prijavljenemu se naslov ne hrani, pošta gre na
-- naslov računa. Tabela je zaprta, piše le `zelim_ligo`.
create table public.zelje_lig (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  email text check (email is null or (length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  -- Koda države (SI, HR …) ali ime države, ki je nimamo ("Italia").
  drzava text not null check (length(drzava) between 2 and 60),
  ime_lige text not null check (length(ime_lige) between 2 and 120),
  -- Vpisana neaktivna liga, ki ji želja ustreza (izbral uporabnik ali admin).
  competition_id bigint references public.competitions(id) on delete set null,
  -- Jezik vmesnika ob želji: v njem gre obvestilo.
  jezik text check (jezik is null or length(jezik) <= 5),
  created_at timestamptz not null default now(),
  obvescen_at timestamptz,
  poskusov int not null default 0,
  check (user_id is not null or email is not null or obvescen_at is not null)
);
create index zelje_lig_liga on public.zelje_lig (competition_id) where obvescen_at is null;
create index zelje_lig_uporabnik on public.zelje_lig (user_id, created_at);

alter table public.zelje_lig enable row level security;
revoke all on public.zelje_lig from anon, authenticated;

-- Nova želja. Prijavljenemu se e-naslov ne zapiše (pošta gre na račun).
-- Isti človek in ista liga (ali isto besedilo v isti državi) = ena vrstica:
-- ponovni klik ne doda nič in ne javi napake. Meje: 5 na dan na človeka
-- (račun ali naslov), 300 na dan vseh neprijavljenih skupaj.
create or replace function public.zelim_ligo(
  p_drzava text,
  p_ime text,
  p_competition_id bigint default null,
  p_email text default null,
  p_jezik text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := case when auth.uid() is null then nullif(lower(btrim(coalesce(p_email, ''))), '') end;
  v_drzava text := btrim(coalesce(p_drzava, ''));
  v_ime text := regexp_replace(btrim(coalesce(p_ime, '')), '[[:space:]]+', ' ', 'g');
  v_liga bigint;
begin
  if v_uid is null and v_email is null then
    raise exception 'Manjka e-naslov.' using hint = 'email';
  end if;
  if v_email is not null and (length(v_email) > 254 or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'Neveljaven e-naslov.' using hint = 'email';
  end if;
  -- Le neaktivna liga; aktivna že obstaja, neznana se prezre.
  select id into v_liga from competitions where id = p_competition_id and not active;
  if v_liga is not null and v_ime = '' then
    select name into v_ime from competitions where id = v_liga;
  end if;
  if length(v_drzava) not between 2 and 60 or length(v_ime) not between 2 and 120 then
    raise exception 'Manjka država ali ime lige.' using hint = 'besedilo';
  end if;
  if prepovedane_besede(v_ime) is not null or prepovedane_besede(v_drzava) is not null then
    raise exception 'Neprimerno besedilo.' using hint = 'besedilo';
  end if;

  if exists (
    select 1 from zelje_lig z
     where z.obvescen_at is null
       and (z.user_id = v_uid or z.email = v_email)
       and (z.competition_id = v_liga
            or (v_liga is null and z.competition_id is null
                and lower(z.ime_lige) = lower(v_ime) and lower(z.drzava) = lower(v_drzava)))
  ) then
    return;
  end if;
  if (select count(*) from zelje_lig z
       where (z.user_id = v_uid or z.email = v_email)
         and z.created_at > now() - interval '1 day') >= 5
     or (v_uid is null and (select count(*) from zelje_lig z
                             where z.user_id is null and z.created_at > now() - interval '1 day') >= 300) then
    raise exception 'Preveč želja.' using hint = 'omejitev';
  end if;

  insert into zelje_lig (user_id, email, drzava, ime_lige, competition_id, jezik)
  values (v_uid, v_email, v_drzava, v_ime, v_liga, nullif(left(btrim(coalesce(p_jezik, '')), 5), ''));
end;
$$;

-- Admin: želje po ligi (vpisani) ali po besedilu in državi, najnovejše prve.
create or replace function public.admin_zelje_lig()
returns table (
  competition_id bigint, liga text, slug text, aktivna boolean, drzava text,
  imena text[], zelj int, odprtih int, zadnja timestamptz, ids bigint[]
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
  select z.competition_id, c.name, c.slug, c.active,
         min(z.drzava),
         (array_agg(distinct z.ime_lige))[1:5],
         count(*)::int,
         count(*) filter (where z.obvescen_at is null)::int,
         max(z.created_at),
         array_agg(z.id order by z.id)
    from zelje_lig z
    left join competitions c on c.id = z.competition_id
   group by z.competition_id, c.name, c.slug, c.active,
            case when z.competition_id is null then lower(z.drzava) end,
            case when z.competition_id is null then lower(z.ime_lige) end
   order by max(z.created_at) desc;
end;
$$;

-- Admin poveže želje z vpisano ligo (po šifri) ali jih odveže (prazna šifra).
create or replace function public.admin_povezi_zelje(p_ids bigint[], p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liga bigint;
begin
  if not is_admin() then
    raise exception 'Samo za administratorje.' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_slug, '')), '') is not null then
    select id into v_liga from competitions where slug = btrim(p_slug);
    if v_liga is null then
      raise exception 'Ni lige s šifro %.', p_slug;
    end if;
  end if;
  update zelje_lig set competition_id = v_liga where id = any(p_ids);
end;
$$;

-- Obvestilo "liga je zaživela": želje, katerih liga je zdaj aktivna. Naslov
-- prijavljenega je naslov računa. Liga, vklopljena prej kot pred eno uro
-- in pol, da vklop in prvi uvoz razporeda prideta prej kot mail.
create or replace function public.kandidati_za_zivo_ligo(p_najvec int default 20)
returns table (
  id bigint, email text, display_name text, jezik text,
  liga_slug text, liga_oznaka text, liga_drzava text
)
language sql
stable
security definer
set search_path = public
as $$
  select z.id, coalesce(z.email, u.email), p.display_name,
         coalesce(z.jezik, u.raw_user_meta_data->>'jezik'),
         c.slug, c.short_name, d.code
    from zelje_lig z
    join competitions c on c.id = z.competition_id and c.active
    join countries d on d.id = c.country_id
    left join auth.users u on u.id = z.user_id
    left join profiles p on p.id = z.user_id
   where z.obvescen_at is null
     and z.poskusov < 3
     and coalesce(z.email, u.email) is not null
   order by z.created_at
   limit greatest(p_najvec, 0)
$$;

-- Po poskusu: uspeh zapiše čas in pobriše naslov, neuspeh šteje poskus.
create or replace function public.zelja_lige_poslana(p_id bigint, p_uspeh boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update zelje_lig
     set obvescen_at = case when p_uspeh then now() end,
         email = case when p_uspeh then null else email end,
         poskusov = poskusov + case when p_uspeh then 0 else 1 end
   where id = p_id
$$;

revoke all on function public.zelim_ligo(text, text, bigint, text, text) from public;
revoke all on function public.admin_zelje_lig() from public;
revoke all on function public.admin_povezi_zelje(bigint[], text) from public;
revoke all on function public.kandidati_za_zivo_ligo(int) from public, anon, authenticated;
revoke all on function public.zelja_lige_poslana(bigint, boolean) from public, anon, authenticated;

grant execute on function public.zelim_ligo(text, text, bigint, text, text) to anon, authenticated;
grant execute on function public.admin_zelje_lig() to authenticated;
grant execute on function public.admin_povezi_zelje(bigint[], text) to authenticated;
grant execute on function public.kandidati_za_zivo_ligo(int) to service_role;
grant execute on function public.zelja_lige_poslana(bigint, boolean) to service_role;

-- 12 mesecev: neobveščene vrstice z e-naslovom (neprijavljeni) gredo proč.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'zelje-lig-pocisti',
    '41 4 * * *',
    $urnik$delete from public.zelje_lig where email is not null and created_at < now() - interval '12 months'$urnik$
  );
exception
  when others then
    raise notice 'pg_cron ni na voljo (%) — stare želje lig je treba počistiti ročno', sqlerrm;
end;
$$;
