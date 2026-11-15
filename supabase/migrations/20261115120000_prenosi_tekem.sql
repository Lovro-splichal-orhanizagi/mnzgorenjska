-- Prenosi tekem v živo z YouTuba (SLF-472, SLF-477).
--
-- Navijač prenaša s svojega YouTube kanala in na strani tekme prilepi
-- povezavo. Mi videa ne gostimo in ključa prenosa nikoli ne vidimo: hranimo le
-- id videa in kanala, ki ju funkcija `prenosi` prebere iz YouTube Data API
-- (videos.list, ključ le na strežniku). Pravila preverjanja so tu, v
-- `prenos_dodaj`, da jih ne more obiti nihče, ki kliče bazo mimo funkcije.
--
--   * stikalo `prenosi`: 0 nihče, 1 admin in preizkuševalci, 2 vsi
--   * stikalo `prenosi_push`: 0 brez obvestil "Tekma A – B je v živo" (besedilo
--     še ni odobreno), 1 pošlji
--   * seznam tekmovanj `prenosi_tekmovanja` (MNZ / regionalne lige članov);
--     mladinske in lige brez znane starostne skupine so izklopljene vedno
--   * `prenosi_zacetki`: ura začetka, kadar jo poznamo; brez nje velja dan tekme

insert into settings (key, value) values ('prenosi', '1'), ('prenosi_push', '0')
on conflict (key) do nothing;

create or replace function public.vidi_prenose()
returns boolean language sql stable security definer set search_path = public
as $$
  select case coalesce(nastavitev_int('prenosi', 0), 0)
           when 2 then true
           when 1 then is_admin() or exists (select 1 from testerji where user_id = auth.uid())
           else false
         end
$$;
revoke all on function public.vidi_prenose() from public;
grant execute on function public.vidi_prenose() to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- Kje so prenosi dovoljeni
-- --------------------------------------------------------------------------
-- Ura začetka je v svoji tabeli, ne v `matches`: varovalo FCF projekcije zahteva
-- natančno obliko `matches` in nobenega novega stolpca `*_id` (od tod `tekma`,
-- `tekmovanje` spodaj).
create table if not exists public.prenosi_zacetki (
  tekma   bigint primary key,
  zacetek timestamptz not null
);
comment on table public.prenosi_zacetki is
  'Ura začetka tekme, kadar jo vir pove. Okno za prenos je od 30 min pred do 3 h po njej; brez nje velja dan tekme (played_on).';
alter table public.prenosi_zacetki enable row level security;
drop policy if exists "admin ureja" on public.prenosi_zacetki;
create policy "admin ureja" on public.prenosi_zacetki for all using (is_admin()) with check (is_admin());

create table if not exists public.prenosi_tekmovanja (
  -- Brez FK na competitions/matches: varovalo FCF projekcije dovoli le znan seznam
  -- FK na te tabele. Obstoj preverijo RPC-ji, bralci pa se vedno pridružijo tekmi.
  tekmovanje     bigint primary key,
  created_at     timestamptz not null default now()
);
comment on table public.prenosi_tekmovanja is
  'Tekmovanja, v katerih je prenos v živo dovoljen (v1: MNZ / regionalne lige članov). Brez 1. in 2. SNL ter pokalov s TV pravicami.';
alter table public.prenosi_tekmovanja enable row level security;
drop policy if exists "javno branje" on public.prenosi_tekmovanja;
create policy "javno branje" on public.prenosi_tekmovanja for select using (true);
drop policy if exists "admin ureja" on public.prenosi_tekmovanja;
create policy "admin ureja" on public.prenosi_tekmovanja for all using (is_admin()) with check (is_admin());

-- Začetni seznam: slovenske lige regijskih zvez (mnz*), le člani.
insert into public.prenosi_tekmovanja (tekmovanje)
select c.id
  from competitions c
  join countries d on d.id = c.country_id
  join federations f on f.id = c.federation_id
 where d.code = 'SI'
   and f.code like 'mnz%'
   and c.slug !~ '^snl'
   and c.slug !~ 'pokal|cup'
   and public.starostna_skupina_lige(c.slug, c.name) = 'clani'
on conflict do nothing;

-- Zakaj prenos na tekmi ni mogoč (NULL = je mogoč). Mladinska ali neznana
-- starostna skupina je zaprta ne glede na seznam (snemanje mladoletnih).
create or replace function public.prenos_zaprt_zakaj(p_match bigint)
returns text language sql stable security definer set search_path = public
as $$
  select case
    when c.id is null then 'ni_tekme'
    when public.starostna_skupina_lige(c.slug, c.name) is distinct from 'clani' then 'mladinska'
    when not exists (select 1 from prenosi_tekmovanja pt where pt.tekmovanje = c.id) then 'tekmovanje'
    else null
  end
  from (select 1) x
  left join matches m on m.id = p_match
  left join rounds r on r.id = m.round_id
  left join competitions c on c.id = r.competition_id
$$;
revoke all on function public.prenos_zaprt_zakaj(bigint) from public, anon, authenticated;

-- Okno, v katerem se je prenos lahko začel.
create or replace function public.prenos_okno(p_match bigint)
returns table (od timestamptz, do_ timestamptz, ura_znana boolean)
language sql stable security definer set search_path = public
as $$
  select case when z.zacetek is not null then z.zacetek - interval '30 minutes'
              else (m.played_on::timestamp) at time zone 'Europe/Ljubljana' end,
         case when z.zacetek is not null then z.zacetek + interval '3 hours'
              else ((m.played_on + 1)::timestamp) at time zone 'Europe/Ljubljana' end,
         z.zacetek is not null
    from matches m
    left join prenosi_zacetki z on z.tekma = m.id
   where m.id = p_match and (z.zacetek is not null or m.played_on is not null)
$$;
revoke all on function public.prenos_okno(bigint) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Tabele
-- --------------------------------------------------------------------------
create table if not exists public.prenosi (
  id           uuid primary key default gen_random_uuid(),
  tekma        bigint not null,                -- brez FK (glej prenosi_tekmovanja)
  user_id      uuid not null references public.profiles on delete cascade,
  video_id     text not null unique check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  kanal_id     text not null,
  kanal_ime    text not null,
  naslov       text not null,
  zacetek      timestamptz not null,           -- actualStartTime z YouTuba
  konec        timestamptz,                    -- actualEndTime
  stanje       text not null default 'v_zivo' check (stanje in ('v_zivo', 'posnetek', 'izbrisan')),
  gledalcev    int,
  trajanje_s   int,
  -- Ime nobenega kluba ni v naslovu ali opisu: viden, a čaka na admina.
  nepreverjeno boolean not null default false,
  skrit        boolean not null default false, -- admin skril
  skrit_prijave boolean not null default false, -- 2 prijavi, čaka na admina
  pregledan_at timestamptz,
  osvezeno_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists prenosi_match_idx on public.prenosi (tekma);
create index if not exists prenosi_user_idx on public.prenosi (user_id);
create index if not exists prenosi_kanal_idx on public.prenosi (kanal_id);
create index if not exists prenosi_v_zivo_idx on public.prenosi (stanje) where stanje = 'v_zivo';
-- En kanal, en prenos v živo naenkrat.
create unique index if not exists prenosi_kanal_en_v_zivo on public.prenosi (kanal_id) where stanje = 'v_zivo';
alter table public.prenosi enable row level security;
revoke all on public.prenosi from public, anon, authenticated;

create table if not exists public.prenosi_prijave (
  prenos_id  uuid not null references public.prenosi on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  razlog     text not null check (razlog in ('ni_tekma', 'neprimerno', 'gledalci', 'spam', 'drugo')),
  opomba     text check (char_length(opomba) <= 500),
  created_at timestamptz not null default now(),
  primary key (prenos_id, user_id)
);
alter table public.prenosi_prijave enable row level security;
revoke all on public.prenosi_prijave from public, anon, authenticated;

create table if not exists public.prenosi_prepovedi (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles on delete cascade,
  kanal_id    text,
  do_         timestamptz,                     -- NULL = za vedno
  razlog      text not null check (char_length(razlog) between 1 and 300),
  dodal       uuid references public.profiles on delete set null,
  created_at  timestamptz not null default now(),
  preklicana_at timestamptz,
  check (user_id is not null or kanal_id is not null)
);
create index if not exists prenosi_prepovedi_user_idx on public.prenosi_prepovedi (user_id);
create index if not exists prenosi_prepovedi_kanal_idx on public.prenosi_prepovedi (kanal_id);
alter table public.prenosi_prepovedi enable row level security;
revoke all on public.prenosi_prepovedi from public, anon, authenticated;

-- Merilo: edinstveni gledalci (tap na predvajanje; naključna oznaka naprave,
-- brez podatkov o osebi) in prijave, ki so se začele na tekmi med prenosom.
create table if not exists public.prenosi_ogledi (
  prenos_id   uuid not null references public.prenosi on delete cascade,
  obiskovalec text not null check (obiskovalec ~ '^[A-Za-z0-9-]{8,64}$'),
  created_at  timestamptz not null default now(),
  primary key (prenos_id, obiskovalec)
);
alter table public.prenosi_ogledi enable row level security;
revoke all on public.prenosi_ogledi from public, anon, authenticated;

create table if not exists public.prenosi_vpisi (
  prenos_id  uuid not null references public.prenosi on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prenos_id, user_id)
);
alter table public.prenosi_vpisi enable row level security;
revoke all on public.prenosi_vpisi from public, anon, authenticated;

-- Push "tekma je v živo": največ eden na tekmo in osebo.
create table if not exists public.prenosi_obvestila (
  tekma      bigint not null,                  -- brez FK (glej prenosi_tekmovanja)
  user_id    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tekma, user_id)
);
alter table public.prenosi_obvestila enable row level security;
revoke all on public.prenosi_obvestila from public, anon, authenticated;

-- Kdaj smo nazadnje vprašali YouTube (varovalo kvote, ena vrstica na vrsto).
create table if not exists public.prenosi_osvezitve (
  vrsta    text primary key check (vrsta in ('zivo', 'dnevno')),
  zadnja   timestamptz not null default 'epoch'
);
insert into public.prenosi_osvezitve (vrsta) values ('zivo'), ('dnevno') on conflict do nothing;
alter table public.prenosi_osvezitve enable row level security;
revoke all on public.prenosi_osvezitve from public, anon, authenticated;

insert into agent.zaprte_tabele (tabela, zakaj) values
  ('public.prenosi', 'kdo je dodal prenos; javno le prek prenosi_tekme'),
  ('public.prenosi_prijave', 'kdo je prijavil prenos'),
  ('public.prenosi_prepovedi', 'prepovedi uporabnikov'),
  ('public.prenosi_ogledi', 'oznake naprav gledalcev'),
  ('public.prenosi_vpisi', 'kdo se je prijavil med prenosom'),
  ('public.prenosi_obvestila', 'komu je šlo obvestilo'),
  ('public.prenosi_osvezitve', 'notranje stanje osveževanja')
on conflict (tabela) do nothing;

-- --------------------------------------------------------------------------
-- Pravila vidnosti
-- --------------------------------------------------------------------------
-- Velja prepoved uporabnika ali kanala?
create or replace function public.prenos_prepoved(p_user uuid, p_kanal text)
returns public.prenosi_prepovedi language sql stable security definer set search_path = public
as $$
  select * from prenosi_prepovedi pp
   where pp.preklicana_at is null
     and (pp.do_ is null or pp.do_ > now())
     and ((p_user is not null and pp.user_id = p_user) or (p_kanal is not null and pp.kanal_id = p_kanal))
   order by pp.do_ desc nulls first
   limit 1
$$;
revoke all on function public.prenos_prepoved(uuid, text) from public, anon, authenticated;

create or replace function public.prenos_viden(p public.prenosi)
returns boolean language sql stable security definer set search_path = public
as $$
  select p.stanje <> 'izbrisan'
     and not p.skrit
     and not p.skrit_prijave
     and public.prenos_zaprt_zakaj(p.tekma) is null
     and (public.prenos_prepoved(p.user_id, p.kanal_id)).id is null
$$;
revoke all on function public.prenos_viden(public.prenosi) from public, anon, authenticated;

-- "Jure K." iz prikaznega imena; prenos ne razkrije celega imena.
create or replace function public.prenos_kratko_ime(p_ime text)
returns text language sql immutable set search_path = public
as $$
  select case
    when p_ime is null or btrim(p_ime) = '' then null
    when btrim(p_ime) !~ '\s' then btrim(p_ime)
    else split_part(btrim(p_ime), ' ', 1) || ' '
         || upper(left(regexp_replace(btrim(p_ime), '^\S+\s+', ''), 1)) || '.'
  end
$$;

-- --------------------------------------------------------------------------
-- Javno branje
-- --------------------------------------------------------------------------
-- Ali lahko na tej tekmi dodaš prenos, in okno za to.
create or replace function public.prenosi_stanje_tekme(p_match bigint)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'vklopljeno', public.vidi_prenose(),
    'zaprto', public.prenos_zaprt_zakaj(p_match),
    'okno_od', o.od,
    'okno_do', o.do_,
    'ura_znana', coalesce(o.ura_znana, false)
  )
  from (select 1) x left join public.prenos_okno(p_match) o on true
$$;
revoke all on function public.prenosi_stanje_tekme(bigint) from public;
grant execute on function public.prenosi_stanje_tekme(bigint) to anon, authenticated;

-- Prenosi tekme: največ trije v živo (po gledalcih) in trije posnetki.
create or replace function public.prenosi_tekme(p_match bigint)
returns table (
  id uuid, video_id text, kanal_id text, kanal_ime text, naslov text, dodal text,
  stanje text, gledalcev int, trajanje_s int, zacetek timestamptz, osvezeno_at timestamptz,
  moj boolean, prijavil boolean
)
language sql stable security definer set search_path = public
as $$
  select q.id, q.video_id, q.kanal_id, q.kanal_ime, q.naslov, q.dodal, q.stanje,
         q.gledalcev, q.trajanje_s, q.zacetek, q.osvezeno_at, q.moj, q.prijavil
    from (
      select p.*, public.prenos_kratko_ime(pr.display_name) as dodal,
             p.user_id = auth.uid() as moj,
             exists (select 1 from prenosi_prijave pp where pp.prenos_id = p.id and pp.user_id = auth.uid()) as prijavil,
             row_number() over (partition by p.stanje order by p.gledalcev desc nulls last, p.zacetek) as mesto
        from prenosi p
        join matches m on m.id = p.tekma
        left join profiles pr on pr.id = p.user_id
       where p.tekma = p_match
         and public.vidi_prenose()
         and public.prenos_viden(p)
    ) q
   where q.mesto <= 3
   order by q.stanje = 'v_zivo' desc, q.gledalcev desc nulls last
$$;
revoke all on function public.prenosi_tekme(bigint) from public;
grant execute on function public.prenosi_tekme(bigint) to anon, authenticated;

-- "V živo zdaj" na naslovnici in strani kluba: tekme z vsaj enim vidnim
-- prenosom v živo, z najbolj gledanim prenosom tekme.
create or replace function public.prenosi_v_zivo(p_team bigint default null)
returns table (
  match_id bigint, competition_id bigint, liga text,
  home_name text, home_short text, home_logo text, away_name text, away_short text, away_logo text,
  home_goals int, away_goals int,
  prenosov int, video_id text, naslov text, kanal_ime text, gledalcev int, osvezeno_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  with vidni as (
    select p.*, row_number() over (partition by p.tekma order by p.gledalcev desc nulls last, p.zacetek) as mesto,
           count(*) over (partition by p.tekma) as n
      from prenosi p
     where p.stanje = 'v_zivo'
       and public.vidi_prenose()
       and public.prenos_viden(p)
  )
  select m.id, c.id, coalesce(c.short_name, c.name),
         th.name, th.short_name, th.logo_url, ta.name, ta.short_name, ta.logo_url,
         m.home_goals, m.away_goals,
         least(v.n, 3)::int, v.video_id, v.naslov, v.kanal_ime, v.gledalcev, v.osvezeno_at
    from vidni v
    join matches m on m.id = v.tekma
    join rounds r on r.id = m.round_id
    join competitions c on c.id = r.competition_id
    join teams th on th.id = m.home_team_id
    join teams ta on ta.id = m.away_team_id
   where v.mesto = 1
     and (p_team is null or p_team in (m.home_team_id, m.away_team_id))
   order by v.gledalcev desc nulls last
   limit 12
$$;
revoke all on function public.prenosi_v_zivo(bigint) from public;
grant execute on function public.prenosi_v_zivo(bigint) to anon, authenticated;

-- --------------------------------------------------------------------------
-- Uporabnik: prijava, ogled, vpis
-- --------------------------------------------------------------------------
create or replace function public.prenos_prijavi(p_prenos uuid, p_razlog text, p_opomba text default null)
returns void language plpgsql volatile security definer set search_path = public
as $$
declare
  n int;
begin
  if auth.uid() is null then raise exception 'Za prijavo se prijavi.'; end if;
  if not exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null) then
    raise exception 'Najprej potrdi e-naslov.';
  end if;
  if not exists (select 1 from prenosi p where p.id = p_prenos) then raise exception 'Prenosa ni.'; end if;
  insert into prenosi_prijave (prenos_id, user_id, razlog, opomba)
  values (p_prenos, auth.uid(), p_razlog, nullif(btrim(p_opomba), ''))
  on conflict (prenos_id, user_id) do update set razlog = excluded.razlog, opomba = excluded.opomba;
  -- Dve prijavi različnih uporabnikov: skrij, dokler admin ne pogleda. Prenos,
  -- ki ga je admin že pregledal, ostane viden do nove prijave po pregledu.
  select count(*) into n from prenosi_prijave pp
    join prenosi p on p.id = pp.prenos_id
   where pp.prenos_id = p_prenos
     and (p.pregledan_at is null or pp.created_at > p.pregledan_at);
  if n >= 2 then
    update prenosi set skrit_prijave = true where id = p_prenos;
  end if;
end
$$;
revoke all on function public.prenos_prijavi(uuid, text, text) from public, anon;
grant execute on function public.prenos_prijavi(uuid, text, text) to authenticated;

create or replace function public.prenos_ogled(p_prenos uuid, p_obiskovalec text)
returns void language sql volatile security definer set search_path = public
as $$
  insert into prenosi_ogledi (prenos_id, obiskovalec)
  select p.id, p_obiskovalec from prenosi p where p.id = p_prenos
  on conflict do nothing
$$;
revoke all on function public.prenos_ogled(uuid, text) from public;
grant execute on function public.prenos_ogled(uuid, text) to anon, authenticated;

-- Prijava, ki se je začela na strani tekme med prenosom (vmesnik si zapomni
-- prenos ob tapu "Prijava"). Šteje le, če je bil prenos v zadnjih 4 urah živ.
create or replace function public.prenos_vpis(p_prenos uuid)
returns void language sql volatile security definer set search_path = public
as $$
  insert into prenosi_vpisi (prenos_id, user_id)
  select p.id, auth.uid() from prenosi p
   where p.id = p_prenos and auth.uid() is not null
     and (p.stanje = 'v_zivo' or p.konec > now() - interval '4 hours')
  on conflict do nothing
$$;
revoke all on function public.prenos_vpis(uuid) from public, anon;
grant execute on function public.prenos_vpis(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- Strežnik (funkcija `prenosi`)
-- --------------------------------------------------------------------------
-- Vpis prenosa po preverbi na YouTubu. Vrne {ok, napaka, …}; napaka je koda,
-- ki jo vmesnik prevede.
create or replace function public.prenos_dodaj(
  p_user uuid, p_match bigint, p_video_id text, p_kanal_id text, p_kanal_ime text,
  p_naslov text, p_opis text, p_zacetek timestamptz, p_gledalcev int
)
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare
  zaprto text;
  o record;
  pr prenosi_prepovedi;
  obstojeci prenosi;
  besedilo text := lower(coalesce(p_naslov, '') || ' ' || coalesce(p_opis, ''));
  ujema boolean;
  nov_id uuid;
  prvi boolean;
begin
  if not exists (select 1 from auth.users u where u.id = p_user and u.email_confirmed_at is not null) then
    return jsonb_build_object('ok', false, 'napaka', 'potrdi_naslov');
  end if;
  zaprto := prenos_zaprt_zakaj(p_match);
  if zaprto is not null then
    return jsonb_build_object('ok', false, 'napaka', zaprto);
  end if;
  pr := prenos_prepoved(p_user, p_kanal_id);
  if pr.id is not null then
    return jsonb_build_object('ok', false, 'napaka', 'prepoved', 'do', pr.do_, 'razlog', pr.razlog);
  end if;
  select * into o from prenos_okno(p_match);
  if o.od is null then
    return jsonb_build_object('ok', false, 'napaka', 'ni_casa');
  end if;
  if p_zacetek < o.od or p_zacetek > o.do_ then
    return jsonb_build_object('ok', false, 'napaka', 'izven_casa', 'od', o.od, 'do', o.do_, 'ura_znana', o.ura_znana);
  end if;
  select * into obstojeci from prenosi where video_id = p_video_id;
  if obstojeci.id is not null then
    return jsonb_build_object('ok', false,
      'napaka', case when obstojeci.tekma = p_match then 'ze_dodan' else 'druga_tekma' end);
  end if;
  if exists (select 1 from prenosi where kanal_id = p_kanal_id and stanje = 'v_zivo') then
    return jsonb_build_object('ok', false, 'napaka', 'kanal_ze_v_zivo');
  end if;

  -- Ime kluba v naslovu ali opisu: katerakoli beseda imena (vsaj 4 črke, brez
  -- splošnih) domačih ali gostov.
  select exists (
    select 1
      from matches m
      join teams t on t.id in (m.home_team_id, m.away_team_id)
      cross join lateral regexp_split_to_table(lower(t.name || ' ' || coalesce(t.short_name, '')), '[^[:alnum:]]+') as b(beseda)
     where m.id = p_match
       and char_length(b.beseda) >= 4
       and b.beseda not in ('nogometni', 'klub', 'sport', 'šport', 'football', 'club', 'mladinci', 'člani')
       and position(b.beseda in besedilo) > 0
  ) into ujema;

  prvi := not exists (select 1 from prenosi where tekma = p_match and stanje = 'v_zivo');
  insert into prenosi (tekma, user_id, video_id, kanal_id, kanal_ime, naslov, zacetek, gledalcev, nepreverjeno)
  values (p_match, p_user, p_video_id, p_kanal_id, left(p_kanal_ime, 200), left(p_naslov, 300), p_zacetek, p_gledalcev, not ujema)
  returning id into nov_id;
  return jsonb_build_object('ok', true, 'id', nov_id, 'prvi', prvi, 'nepreverjeno', not ujema);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'napaka', 'kanal_ze_v_zivo');
end
$$;
revoke all on function public.prenos_dodaj(uuid, bigint, text, text, text, text, text, timestamptz, int) from public, anon, authenticated;
grant execute on function public.prenos_dodaj(uuid, bigint, text, text, text, text, text, timestamptz, int) to service_role;

-- Videi za osvežitev. Vrne prazno, če je bila zadnja osvežitev te vrste manj
-- kot 2 min (v živo) oziroma 20 ur (posnetki) nazaj: kvoto porabimo le, ko
-- kdo gleda, in nikoli več kot enkrat na 2 min, tudi ob sto hkratnih obiskih.
create or replace function public.prenosi_za_osvezitev(p_vrsta text, p_kanal text default null)
returns setof text language plpgsql volatile security definer set search_path = public
as $$
begin
  if p_kanal is not null then
    -- Pred vpisom: le živi prenosi tega kanala, brez varovala (en klic).
    return query select video_id from prenosi where kanal_id = p_kanal and stanje = 'v_zivo';
    return;
  end if;
  update prenosi_osvezitve set zadnja = now()
   where vrsta = p_vrsta
     and zadnja < now() - case p_vrsta when 'zivo' then interval '2 minutes' else interval '20 hours' end;
  if not found then return; end if;
  if p_vrsta = 'zivo' then
    return query select video_id from prenosi where stanje = 'v_zivo' order by zacetek limit 200;
  else
    return query select video_id from prenosi where stanje = 'posnetek' order by zacetek desc limit 500;
  end if;
end
$$;
revoke all on function public.prenosi_za_osvezitev(text, text) from public, anon, authenticated;
grant execute on function public.prenosi_za_osvezitev(text, text) to service_role;

-- Zapis osvežitve: [{video_id, najden, v_zivo, konec, gledalcev, trajanje_s}].
-- Ne najden ali zaseben/izbrisan video = 'izbrisan' (skrit povsod).
create or replace function public.prenosi_osvezi(p_podatki jsonb)
returns int language plpgsql volatile security definer set search_path = public
as $$
declare
  n int;
begin
  update prenosi p set
    stanje = case when not (x->>'najden')::boolean then 'izbrisan'
                  when (x->>'v_zivo')::boolean then 'v_zivo'
                  else 'posnetek' end,
    konec = coalesce((x->>'konec')::timestamptz, p.konec,
                     case when (x->>'najden')::boolean and not (x->>'v_zivo')::boolean then now() end),
    gledalcev = case when (x->>'v_zivo')::boolean then coalesce((x->>'gledalcev')::int, p.gledalcev) else p.gledalcev end,
    trajanje_s = coalesce((x->>'trajanje_s')::int, p.trajanje_s),
    osvezeno_at = now()
  from jsonb_array_elements(p_podatki) x
  where p.video_id = x->>'video_id';
  get diagnostics n = row_count;
  return n;
end
$$;
revoke all on function public.prenosi_osvezi(jsonb) from public, anon, authenticated;
grant execute on function public.prenosi_osvezi(jsonb) to service_role;

-- Prejemniki obvestila "tekma je v živo": navijači obeh klubov z napravo, brez
-- `brez_push`, ki ga za to tekmo še niso dobili. Vpis v dnevnik je hkrati
-- varovalo "največ eno na tekmo".
create or replace function public.prenos_push_prejemniki(p_match bigint, p_najvec int default 500)
returns setof uuid language sql volatile security definer set search_path = public
as $$
  insert into prenosi_obvestila (tekma, user_id)
  select p_match, pr.id
    from matches m
    join profiles pr on pr.navijam_team_id in (m.home_team_id, m.away_team_id)
   where m.id = p_match
     and coalesce(nastavitev_int('prenosi_push', 0), 0) = 1
     and not pr.brez_push
     and exists (select 1 from push_tokens pt where pt.user_id = pr.id)
   limit p_najvec
  on conflict do nothing
  returning user_id
$$;
revoke all on function public.prenos_push_prejemniki(bigint, int) from public, anon, authenticated;
grant execute on function public.prenos_push_prejemniki(bigint, int) to service_role;

-- --------------------------------------------------------------------------
-- Admin
-- --------------------------------------------------------------------------
-- p_filter: 'pregled' (skrit zaradi prijav ali nepreverjen, še nepregledan),
-- 'zivo', 'danes' (dodani v zadnjih 24 h), 'vsi' (zadnjih 200).
create or replace function public.admin_prenosi(p_filter text default 'pregled')
returns table (
  id uuid, match_id bigint, tekma text, video_id text, kanal_id text, kanal_ime text, naslov text,
  user_id uuid, uporabnik text, stanje text, gledalcev int, zacetek timestamptz, created_at timestamptz,
  nepreverjeno boolean, skrit boolean, skrit_prijave boolean, pregledan_at timestamptz,
  prepovedan boolean, prijav int, prijave jsonb, ogledov int, vpisov int
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Le za admina.'; end if;
  return query
  select p.id, p.tekma, th.name || ' – ' || ta.name, p.video_id, p.kanal_id, p.kanal_ime, p.naslov,
         p.user_id, pr.display_name, p.stanje, p.gledalcev, p.zacetek, p.created_at,
         p.nepreverjeno, p.skrit, p.skrit_prijave, p.pregledan_at,
         (prenos_prepoved(p.user_id, p.kanal_id)).id is not null,
         (select count(*)::int from prenosi_prijave pp where pp.prenos_id = p.id),
         (select coalesce(jsonb_agg(jsonb_build_object('razlog', pp.razlog, 'opomba', pp.opomba) order by pp.created_at), '[]')
            from prenosi_prijave pp where pp.prenos_id = p.id),
         (select count(*)::int from prenosi_ogledi og where og.prenos_id = p.id),
         (select count(*)::int from prenosi_vpisi vp where vp.prenos_id = p.id)
    from prenosi p
    join matches m on m.id = p.tekma
    join teams th on th.id = m.home_team_id
    join teams ta on ta.id = m.away_team_id
    left join profiles pr on pr.id = p.user_id
   where case p_filter
           when 'pregled' then p.pregledan_at is null and (p.skrit_prijave or p.nepreverjeno
                                or exists (select 1 from prenosi_prijave pp where pp.prenos_id = p.id))
           when 'zivo' then p.stanje = 'v_zivo'
           when 'danes' then p.created_at > now() - interval '24 hours'
           else true
         end
   order by p.created_at desc
   limit 200;
end
$$;
revoke all on function public.admin_prenosi(text) from public, anon;
grant execute on function public.admin_prenosi(text) to authenticated;

-- 'pokazi': pregledan, viden (počisti skritje); 'skrij': skrit za vedno.
create or replace function public.admin_prenos_odloci(p_id uuid, p_akcija text)
returns void language plpgsql volatile security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Le za admina.'; end if;
  if p_akcija = 'pokazi' then
    update prenosi set skrit = false, skrit_prijave = false, nepreverjeno = false, pregledan_at = now() where id = p_id;
  elsif p_akcija = 'skrij' then
    update prenosi set skrit = true, pregledan_at = now() where id = p_id;
  else
    raise exception 'Neznana akcija %', p_akcija;
  end if;
end
$$;
revoke all on function public.admin_prenos_odloci(uuid, text) from public, anon;
grant execute on function public.admin_prenos_odloci(uuid, text) to authenticated;

-- Prepoved prenašanja: uporabnik in/ali kanal, do datuma ali za vedno. Vsi
-- njegovi prenosi so skriti, dokler prepoved velja (prenos_viden).
create or replace function public.admin_prenosi_prepovej(p_user uuid, p_kanal text, p_do timestamptz, p_razlog text)
returns bigint language plpgsql volatile security definer set search_path = public
as $$
declare
  nov bigint;
begin
  if not is_admin() then raise exception 'Le za admina.'; end if;
  if p_do is not null and p_do <= now() then raise exception 'Datum mora biti v prihodnosti.'; end if;
  insert into prenosi_prepovedi (user_id, kanal_id, do_, razlog, dodal)
  values (p_user, nullif(btrim(p_kanal), ''), p_do, btrim(p_razlog), auth.uid())
  returning id into nov;
  return nov;
end
$$;
revoke all on function public.admin_prenosi_prepovej(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.admin_prenosi_prepovej(uuid, text, timestamptz, text) to authenticated;

create or replace function public.admin_prenosi_prepovedi()
returns table (id bigint, user_id uuid, uporabnik text, kanal_id text, kanal_ime text, do_ timestamptz,
               razlog text, created_at timestamptz, velja boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Le za admina.'; end if;
  return query
  select pp.id, pp.user_id, pr.display_name, pp.kanal_id,
         (select p.kanal_ime from prenosi p where p.kanal_id = pp.kanal_id order by p.created_at desc limit 1),
         pp.do_, pp.razlog, pp.created_at,
         pp.preklicana_at is null and (pp.do_ is null or pp.do_ > now())
    from prenosi_prepovedi pp
    left join profiles pr on pr.id = pp.user_id
   order by pp.created_at desc
   limit 200;
end
$$;
revoke all on function public.admin_prenosi_prepovedi() from public, anon;
grant execute on function public.admin_prenosi_prepovedi() to authenticated;

create or replace function public.admin_prenosi_preklici(p_id bigint)
returns void language plpgsql volatile security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Le za admina.'; end if;
  update prenosi_prepovedi set preklicana_at = now() where id = p_id and preklicana_at is null;
end
$$;
revoke all on function public.admin_prenosi_preklici(bigint) from public, anon;
grant execute on function public.admin_prenosi_preklici(bigint) to authenticated;

-- Merilo po prenosu (admin): edinstveni gledalci in prijave med prenosom.
create or replace function public.admin_prenosi_merilo()
returns table (id uuid, tekma text, kanal_ime text, zacetek timestamptz, ogledov int, vpisov int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Le za admina.'; end if;
  return query
  select p.id, th.name || ' – ' || ta.name, p.kanal_ime, p.zacetek,
         (select count(*)::int from prenosi_ogledi og where og.prenos_id = p.id),
         (select count(*)::int from prenosi_vpisi vp where vp.prenos_id = p.id)
    from prenosi p
    join matches m on m.id = p.tekma
    join teams th on th.id = m.home_team_id
    join teams ta on ta.id = m.away_team_id
   order by p.zacetek desc
   limit 100;
end
$$;
revoke all on function public.admin_prenosi_merilo() from public, anon;
grant execute on function public.admin_prenosi_merilo() to authenticated;
