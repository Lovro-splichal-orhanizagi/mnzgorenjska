-- SLFF Trgovina, dela 2–3: personalizirani izdelki, tisk v serijah, boni.
-- Spec: docs/superpowers/specs/2026-10-18-trgovina-personalizacija-design.md
--
-- Vse preverjanje personalizacije je tu (rezerviraj), brskalnik le prikazuje:
-- ime ekipe (le kupčeva, ne hišna), poljubno ime (1–12 črk, presledek, pika,
-- vezaj, filter `prepovedano_besedilo` kot pri prikaznem imenu), številka
-- 0–99, prvak mini lige (končana sezona, vsaj 4 človeške ekipe), značka
-- (doživljenjsko preverjen, še brez naročila). Doplačila so v
-- `trgovina.personalizacije`, ne v vhodu.
--
-- Izdelek po naročilu (`po_narocilu`) in digitalni (`digitalni`, darilni bon)
-- zaloge ne štejeta. Plačana personalizirana postavka gre v `za_tisk`, admin
-- jo da v serijo (`trgovina.serije`) → poslana tiskarni → natisnjena.
-- Značka gre v obstoječi tok `narocila_znack`, ne v serije trgovine.
-- Boni (`trgovina.boni`): webhook zapiše zgoščeno kodo in zadnje 4 znake.

alter table trgovina.izdelki
  add column po_narocilu boolean not null default false,
  add column digitalni boolean not null default false;
comment on column trgovina.izdelki.po_narocilu is 'Izdelava po naročilu: zaloga se ne šteje ne drži.';
comment on column trgovina.izdelki.digitalni is 'Digitalni izdelek (darilni bon): brez zaloge in dostave.';

create table trgovina.personalizacije (
  id          bigint generated always as identity primary key,
  izdelek_id  bigint not null references trgovina.izdelki on delete cascade,
  vrsta       text not null check (vrsta in ('ime_ekipe', 'poljubno_ime', 'stevilka', 'prvak', 'znacka')),
  doplacilo   int not null default 0 check (doplacilo >= 0),
  obvezna     boolean not null default false,
  unique (izdelek_id, vrsta)
);
comment on column trgovina.personalizacije.doplacilo is 'Centi z DDV na kos.';

create table trgovina.serije (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  poslana_at     timestamptz,
  natisnjena_at  timestamptz
);

alter table trgovina.postavke
  add column personalizacija jsonb,
  add column doplacilo int not null default 0 check (doplacilo >= 0),
  add column stanje_tiska text check (stanje_tiska in ('za_tisk', 'v_seriji', 'natisnjeno')),
  add column serija_id bigint references trgovina.serije on delete set null;
comment on column trgovina.postavke.personalizacija is
  'Kar je preveril rezerviraj: {vrsta, ime, stevilka, fantasy_team_id | mini_liga_id, sezona | preverjeni_racun_id, player_id}.';
comment on column trgovina.postavke.doplacilo is 'Doplačilo personalizacije na kos (centi z DDV); cena na kos = cena + doplacilo.';
create index on trgovina.postavke (stanje_tiska) where stanje_tiska is not null;
create index on trgovina.postavke (serija_id);

create table trgovina.boni (
  id               bigint generated always as identity primary key,
  narocilo_id      bigint not null references trgovina.narocila on delete cascade,
  postavka_id      bigint not null references trgovina.postavke on delete cascade,
  zaporedje        int not null check (zaporedje >= 1),
  koda_hash        text unique not null check (koda_hash ~ '^[0-9a-f]{64}$'),
  koda_konec       text not null check (koda_konec ~ '^[A-Z0-9]{4}$'),
  znesek           int not null check (znesek > 0),
  velja_do         timestamptz not null,
  stripe_promocija text unique not null,
  porabljeno_at    timestamptz,
  created_at       timestamptz not null default now(),
  unique (postavka_id, zaporedje)
);
comment on table trgovina.boni is
  'Izdani darilni boni (Stripe promocijske kode). Koda le kot sha256 in zadnji 4 znaki, nikoli v čistopisu.';

alter table trgovina.personalizacije enable row level security;
alter table trgovina.serije enable row level security;
alter table trgovina.boni enable row level security;
revoke all on trgovina.personalizacije, trgovina.serije, trgovina.boni from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Upravičenost: prvak mini lige, značka
-- --------------------------------------------------------------------------

-- Prvak = največ točk v mini ligi za sezono S (vsota krogov sezone, kot
-- tedenski pregled), sezona S je za vsa tekmovanja ekip pretekla
-- (`sezona_lige`), v sezoni je igralo vsaj 4 človeških ekip, ekipa je kupčeva.
create function trgovina.prvaki_uporabnika(p_user uuid)
returns table (mini_liga_id bigint, ime text, sezona text, fantasy_team_id bigint, ekipa text)
language sql stable
as $$
  with lige as (
    select distinct c.mini_liga_id
      from public.mini_liga_clani c
      join public.fantasy_teams ft on ft.id = c.fantasy_team_id
     where ft.owner_id = p_user and not ft.hisna
  ),
  tocke as (
    select c.mini_liga_id, ft.id as fantasy_team_id, ft.name, ft.owner_id, ft.competition_id,
           frp.season, sum(frp.points) as tocke
      from lige l
      join public.mini_liga_clani c on c.mini_liga_id = l.mini_liga_id
      join public.fantasy_teams ft on ft.id = c.fantasy_team_id and not ft.hisna
      join public.fantasy_round_points frp on frp.fantasy_team_id = ft.id
     group by 1, 2, 3, 4, 5, 6
  ),
  koncane as (
    select t.mini_liga_id, t.season
      from tocke t
     group by 1, 2
    having count(*) >= 4 and bool_and(t.season < public.sezona_lige(t.competition_id))
  ),
  mesta as (
    select t.*, rank() over (partition by t.mini_liga_id, t.season order by t.tocke desc) as mesto
      from tocke t join koncane k using (mini_liga_id, season)
  )
  select m.mini_liga_id, l.name, m.season, m.fantasy_team_id, m.name
    from mesta m join public.mini_lige l on l.id = m.mini_liga_id
   where m.mesto = 1 and m.owner_id = p_user
   order by m.season desc, l.name, m.mini_liga_id
$$;

-- Doživljenjska aktivna pravica na kupčevem potrjenem profilu, brez
-- nepreklicanega naročila značke. ponytail: več takih profilov → prvi po id.
create function trgovina.znacka_uporabnika(p_user uuid)
returns table (preverjeni_racun_id bigint, player_id bigint, ime text)
language sql stable
as $$
  select r.id, r.player_id, coalesce(p.full_name, btrim(p.first_name || ' ' || p.last_name))
    from public.preverjeni_racuni r
    join public.zahtevki_igralca z on z.id = public.prevzem_zahtevek_igralca(r.player_id) and z.user_id = p_user
    join public.players p on p.id = r.player_id and p.anonimiziran_at is null
   where r.user_id = p_user and r.vir = 'dozivljenjska' and r.status = 'aktiven'
     and not exists (select 1 from public.narocila_znack n
                      where n.preverjeni_racun_id = r.id and n.status <> 'preklicano')
   order by r.id
   limit 1
$$;

-- --------------------------------------------------------------------------
-- Personalizacija ene postavke
-- --------------------------------------------------------------------------
-- Vhod {ime_ekipe: id, poljubno_ime: text, stevilka: int,
--       prvak: {mini_liga_id, sezona}, znacka: {ime?}}; ključi le izmed možnosti
-- izdelka, obvezne morajo biti, besedilo je največ eno. Vrne preverjeno
-- personalizacijo, doplačilo na kos in opis za Stripe.
create function trgovina.personaliziraj(
  p_izdelek bigint, p_vhod jsonb, p_user uuid, p_jezik text,
  out personalizacija jsonb, out doplacilo int, out opis text
)
language plpgsql stable
as $$
declare
  v_vrste text[];
  v_obvezne text[];
  v_kljuci text[];
  v jsonb;
  v_ime text;
  v_id bigint;
  v_racun bigint;
  v_st numeric;
begin
  select coalesce(array_agg(x.vrsta), '{}'), coalesce(array_agg(x.vrsta) filter (where x.obvezna), '{}')
    into v_vrste, v_obvezne
    from trgovina.personalizacije x where x.izdelek_id = p_izdelek;

  if p_vhod is null or jsonb_typeof(p_vhod) = 'null' or p_vhod = '{}'::jsonb then
    if cardinality(v_obvezne) > 0 then
      raise exception 'Trgovina: izdelek zahteva personalizacijo.' using hint = 'trgovina-personalizacija';
    end if;
    personalizacija := null; doplacilo := 0; opis := null;
    return;
  end if;

  v_kljuci := array(select jsonb_object_keys(p_vhod));
  if not v_kljuci <@ v_vrste or not v_obvezne <@ v_kljuci
     or cardinality(array(select unnest(v_kljuci) intersect select unnest(array['ime_ekipe', 'poljubno_ime', 'prvak', 'znacka']))) > 1
  then
    raise exception 'Trgovina: neveljavna personalizacija.' using hint = 'trgovina-personalizacija';
  end if;
  if p_user is null and v_kljuci && array['ime_ekipe', 'prvak', 'znacka'] then
    raise exception 'Trgovina: za ta izdelek se prijavi.' using hint = 'trgovina-prijava';
  end if;

  select coalesce(sum(x.doplacilo), 0)::int into doplacilo
    from trgovina.personalizacije x where x.izdelek_id = p_izdelek and x.vrsta = any (v_kljuci);
  personalizacija := '{}'::jsonb;

  if p_vhod ? 'ime_ekipe' then
    v := p_vhod->'ime_ekipe';
    v_st := case when jsonb_typeof(v) = 'number' then (v::text)::numeric end;
    if v_st = trunc(v_st) and v_st between -9223372036854775808 and 9223372036854775807 then
      select ft.id, ft.name into v_id, v_ime from public.fantasy_teams ft
       where ft.id = v_st::bigint and ft.owner_id = p_user and not ft.hisna;
    end if;
    if v_id is null then
      raise exception 'Trgovina: ekipa ni tvoja.' using hint = 'trgovina-personalizacija';
    end if;
    personalizacija := jsonb_build_object('vrsta', 'ime_ekipe', 'ime', v_ime, 'fantasy_team_id', v_id);
  end if;

  if p_vhod ? 'poljubno_ime' then
    v := p_vhod->'poljubno_ime';
    v_ime := case when jsonb_typeof(v) = 'string' then btrim(regexp_replace(v #>> '{}', '\s+', ' ', 'g')) end;
    if v_ime is null or char_length(v_ime) not between 1 and 12
       or v_ime !~ '^[A-Za-zÀ-ÖØ-öø-ž .-]+$' or public.prepovedano_besedilo(v_ime) is not null then
      raise exception 'Trgovina: to besedilo ni dovoljeno.' using hint = 'trgovina-personalizacija';
    end if;
    personalizacija := jsonb_build_object('vrsta', 'poljubno_ime', 'ime', v_ime);
  end if;

  if p_vhod ? 'prvak' then
    v := p_vhod->'prvak';
    if jsonb_typeof(v) = 'object' and jsonb_typeof(v->'mini_liga_id') = 'number' and jsonb_typeof(v->'sezona') = 'string' then
      select jsonb_build_object('vrsta', 'prvak',
               'ime', case when p_jezik = 'en' then 'Mini league champion ' else 'Prvak mini lige ' end || pr.ime || ' ' || pr.sezona,
               'mini_liga_id', pr.mini_liga_id, 'sezona', pr.sezona, 'fantasy_team_id', pr.fantasy_team_id)
        into personalizacija
        from trgovina.prvaki_uporabnika(p_user) pr
       where pr.mini_liga_id::numeric = (v->>'mini_liga_id')::numeric and pr.sezona = v->>'sezona'
       limit 1;
    end if;
    if personalizacija is null or not personalizacija ? 'mini_liga_id' then
      raise exception 'Trgovina: nisi prvak te mini lige.' using hint = 'trgovina-personalizacija';
    end if;
  end if;

  if p_vhod ? 'znacka' then
    v := p_vhod->'znacka';
    if jsonb_typeof(v) = 'object' and (not v ? 'ime' or jsonb_typeof(v->'ime') = 'string') then
      select z.preverjeni_racun_id, z.player_id, coalesce(v->>'ime', z.ime) into v_racun, v_id, v_ime
        from trgovina.znacka_uporabnika(p_user) z;
    end if;
    if v_racun is null then
      raise exception 'Trgovina: značke ne moreš naročiti.' using hint = 'trgovina-personalizacija';
    end if;
    begin
      v_ime := public.preverjen_ime_znacke(v_ime);
    exception when others then
      raise exception 'Trgovina: to besedilo ni dovoljeno.' using hint = 'trgovina-personalizacija';
    end;
    personalizacija := jsonb_build_object('vrsta', 'znacka', 'ime', v_ime, 'preverjeni_racun_id', v_racun, 'player_id', v_id);
  end if;

  if p_vhod ? 'stevilka' then
    v := p_vhod->'stevilka';
    v_st := case when jsonb_typeof(v) = 'number' then (v::text)::numeric end;
    if v_st is null or v_st not between 0 and 99 or v_st <> trunc(v_st) then
      raise exception 'Trgovina: številka mora biti od 0 do 99.' using hint = 'trgovina-personalizacija';
    end if;
    personalizacija := personalizacija || jsonb_build_object('stevilka', v_st::int);
  end if;

  opis := concat_ws(' · ', personalizacija->>'ime', personalizacija->>'stevilka');
end;
$$;

-- --------------------------------------------------------------------------
-- Rezervacija (isti podpis kot del 1; vrstica sme nositi personalizacijo)
-- --------------------------------------------------------------------------
-- Vhod [{razlicica_id, kolicina, personalizacija?}]. Ista različica sme biti
-- večkrat le z drugačno personalizacijo. Izhod kot v delu 1, postavke dobijo
-- postavka_id, doplacilo, opis in personalizacija; poleg pismo še digitalno
-- (vse postavke digitalne: brez dostave) in personalizirano (potrditev brez odstopa).
create or replace function trgovina.rezerviraj(p_postavke jsonb, p_user uuid, p_jezik text, p_odjemalec text) returns jsonb
language plpgsql
as $$
declare
  v_narocilo trgovina.narocila;
  v_vrstic int;
  v_postavke jsonb := '[]'::jsonb;
  vr record;
  v_pers jsonb;
  v_dopl int;
  v_opis text;
  v_id bigint;
  v_znacka boolean := false;
begin
  if jsonb_typeof(p_postavke) is distinct from 'array'
     or jsonb_array_length(p_postavke) not between 1 and 20
     or p_jezik is null or p_jezik not in ('sl', 'en')
     or p_odjemalec is null or p_odjemalec !~ '^[0-9a-f]{64}$'
     or exists (select 1 from jsonb_array_elements(p_postavke) e
                 where jsonb_typeof(e) <> 'object'
                    or jsonb_typeof(e->'razlicica_id') is distinct from 'number'
                    or jsonb_typeof(e->'kolicina') is distinct from 'number'
                    or (e->>'kolicina')::numeric not between 1 and 20
                    or (e->>'kolicina')::numeric <> trunc((e->>'kolicina')::numeric)
                    or (e->>'razlicica_id')::numeric not between -9223372036854775808 and 9223372036854775807
                    or (e->>'razlicica_id')::numeric <> trunc((e->>'razlicica_id')::numeric)
                    or coalesce(jsonb_typeof(e->'personalizacija'), 'null') not in ('object', 'null'))
  then
    raise exception 'Trgovina: neveljavna košarica.' using hint = 'trgovina-vnos';
  end if;

  if (select sum(kolicina) from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int)) > 50
     or (select count(distinct ((e->>'razlicica_id')::bigint, coalesce(e->'personalizacija', 'null'::jsonb)))
           from jsonb_array_elements(p_postavke) e) <> jsonb_array_length(p_postavke)
  then
    raise exception 'Trgovina: neveljavna košarica.' using hint = 'trgovina-vnos';
  end if;

  perform trgovina.pocisti();

  -- ponytail: brez zaklepa sta hkratni šesti zahtevi lahko obe sprejeti; meja je le zavora.
  if (select count(*) from trgovina.narocila n
       where n.stanje = 'caka_placilo' and n.rezervirano_do > now()
         and (n.user_id = p_user or (p_user is null and n.user_id is null and n.odjemalec = p_odjemalec))) >= 5
  then
    raise exception 'Trgovina: preveč odprtih naročil.' using hint = 'trgovina-omejitev';
  end if;

  -- Zaklep v stalnem vrstnem redu: hkratni nakupi istih različic čakajo drug
  -- na drugega in nato vidijo rezervacije, ki jih je prejšnji že potrdil.
  perform 1 from trgovina.razlicice r
   where r.id in (select razlicica_id from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int))
   order by r.id for update;

  select count(*) into v_vrstic
    from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int)
    join trgovina.razlicice r on r.id = k.razlicica_id and r.aktivna
    join trgovina.izdelki i on i.id = r.izdelek_id and i.aktiven;
  if v_vrstic <> jsonb_array_length(p_postavke) then
    raise exception 'Trgovina: izdelek ni na voljo.' using hint = 'trgovina-vnos';
  end if;

  if exists (select 1
               from (select razlicica_id, sum(kolicina) as kolicina
                       from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int) group by 1) k
               join trgovina.razlicice r on r.id = k.razlicica_id
               join trgovina.izdelki i on i.id = r.izdelek_id and not (i.po_narocilu or i.digitalni)
               join trgovina.razpolozljivo z on z.razlicica_id = k.razlicica_id
              where z.na_voljo < k.kolicina) then
    raise exception 'Trgovina: ni dovolj zaloge.' using hint = 'trgovina-zaloga';
  end if;

  insert into trgovina.narocila (user_id, jezik, odjemalec) values (p_user, p_jezik, p_odjemalec)
  returning * into v_narocilo;

  for vr in
    select x.n, (x.el->>'kolicina')::int as kolicina, x.el->'personalizacija' as vhod,
           r.id as razlicica_id, r.cena, i.id as izdelek_id, i.tax_code,
           case when p_jezik = 'en' then i.ime_en || ' (' || r.oznaka_en || ')'
                else i.ime_sl || ' (' || r.oznaka_sl || ')' end as ime
      from jsonb_array_elements(p_postavke) with ordinality x(el, n)
      join trgovina.razlicice r on r.id = (x.el->>'razlicica_id')::bigint
      join trgovina.izdelki i on i.id = r.izdelek_id
     order by x.n
  loop
    select p.personalizacija, p.doplacilo, p.opis into v_pers, v_dopl, v_opis
      from trgovina.personaliziraj(vr.izdelek_id, vr.vhod, p_user, p_jezik) p;
    if v_pers->>'vrsta' = 'znacka' then
      if vr.kolicina <> 1 or v_znacka then
        raise exception 'Trgovina: značka je ena.' using hint = 'trgovina-personalizacija';
      end if;
      v_znacka := true;
    end if;
    insert into trgovina.postavke (narocilo_id, razlicica_id, ime, cena, kolicina, personalizacija, doplacilo)
    values (v_narocilo.id, vr.razlicica_id, vr.ime, vr.cena, vr.kolicina, v_pers, v_dopl)
    returning id into v_id;
    v_postavke := v_postavke || jsonb_build_object(
      'postavka_id', v_id, 'razlicica_id', vr.razlicica_id, 'ime', vr.ime, 'cena', vr.cena, 'doplacilo', v_dopl,
      'kolicina', vr.kolicina, 'tax_code', vr.tax_code, 'opis', v_opis, 'personalizacija', v_pers);
  end loop;

  return jsonb_build_object(
    'narocilo_id', v_narocilo.id,
    'javna_oznaka', v_narocilo.javna_oznaka,
    'rezervirano_do', v_narocilo.rezervirano_do,
    'postavke', v_postavke,
    'pismo', not exists (select 1 from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int)
                           join trgovina.razlicice r on r.id = k.razlicica_id
                           join trgovina.izdelki i on i.id = r.izdelek_id
                          where not i.pismo and not i.digitalni),
    'digitalno', not exists (select 1 from jsonb_to_recordset(p_postavke) k(razlicica_id bigint, kolicina int)
                               join trgovina.razlicice r on r.id = k.razlicica_id
                               join trgovina.izdelki i on i.id = r.izdelek_id
                              where not i.digitalni),
    'personalizirano', exists (select 1 from jsonb_array_elements(v_postavke) x
                                where jsonb_typeof(x->'personalizacija') = 'object'));
end;
$$;

-- --------------------------------------------------------------------------
-- Plačilo (isti podpis kot del 1)
-- --------------------------------------------------------------------------
-- Zaloga in manjka le za izdelke na zalogi. Personalizirane postavke (razen
-- značke) gredo v za_tisk. Značka gre v narocila_znack (stripe_checkout_id =
-- seja trgovine, postnina = dostava_kljuc); če pravica medtem ni več aktivna
-- ali je značka že naročena, se šteje v manjka (vrne 'premalo': uredi s kupcem).
create or replace function trgovina.iz_placila(
  p_checkout text, p_payment_intent text, p_email text, p_ime text, p_naslov jsonb,
  p_postavke int, p_dostava int, p_ddv int, p_skupaj int, p_dostava_kljuc text
) returns text
language plpgsql
as $$
declare
  v_narocilo trgovina.narocila;
  v_manjka int;
  z record;
begin
  select * into v_narocilo from trgovina.narocila where stripe_checkout_id = p_checkout for update;
  if not found then
    return 'neznano';
  elsif v_narocilo.stanje in ('placano', 'poslano') then
    return 'ze';
  -- Poteklo (pocisti, sprosti) se še plača: Stripe pošlje plačano le za
  -- zaključeno sejo, zaprte seje ni mogoče plačati. Česar ni več na zalogi, gre v manjka.
  elsif v_narocilo.stanje not in ('caka_placilo', 'poteklo') then
    return 'neznano';
  end if;

  perform 1 from trgovina.razlicice r
   where r.id in (select razlicica_id from trgovina.postavke where narocilo_id = v_narocilo.id)
   order by r.id for update;

  select coalesce(sum(greatest(k.kolicina - r.zaloga, 0)), 0) into v_manjka
    from (select p.razlicica_id, sum(p.kolicina) as kolicina from trgovina.postavke p
            join trgovina.razlicice r on r.id = p.razlicica_id
            join trgovina.izdelki i on i.id = r.izdelek_id and not (i.po_narocilu or i.digitalni)
           where p.narocilo_id = v_narocilo.id group by p.razlicica_id) k
    join trgovina.razlicice r on r.id = k.razlicica_id;

  update trgovina.razlicice r set zaloga = greatest(r.zaloga - k.kolicina, 0)
    from (select p.razlicica_id, sum(p.kolicina)::int as kolicina from trgovina.postavke p
            join trgovina.razlicice r2 on r2.id = p.razlicica_id
            join trgovina.izdelki i on i.id = r2.izdelek_id and not (i.po_narocilu or i.digitalni)
           where p.narocilo_id = v_narocilo.id group by p.razlicica_id) k
   where r.id = k.razlicica_id;

  update trgovina.postavke set stanje_tiska = 'za_tisk'
   where narocilo_id = v_narocilo.id and personalizacija is not null
     and personalizacija->>'vrsta' is distinct from 'znacka';

  for z in
    select (p.personalizacija->>'preverjeni_racun_id')::bigint as racun, (p.personalizacija->>'player_id')::bigint as igralec,
           p.personalizacija->>'ime' as ime
      from trgovina.postavke p
     where p.narocilo_id = v_narocilo.id and p.personalizacija->>'vrsta' = 'znacka'
  loop
    -- Hkratni plačili iste pravice se vrstita.
    perform 1 from public.preverjeni_racuni where id = z.racun for update;
    if exists (select 1 from public.preverjeni_racuni where id = z.racun and status = 'aktiven')
       and not exists (select 1 from public.narocila_znack n where n.preverjeni_racun_id = z.racun and n.status <> 'preklicano') then
      insert into public.narocila_znack (preverjeni_racun_id, user_id, player_id, ime_na_znacki, naslov, postnina, stripe_checkout_id)
      values (z.racun, v_narocilo.user_id, z.igralec, z.ime, coalesce(p_naslov, '{}'::jsonb), p_dostava_kljuc, p_checkout);
    else
      v_manjka := v_manjka + 1;
    end if;
  end loop;

  update trgovina.narocila set
    stanje = 'placano', placano_at = now(), stripe_payment_intent = p_payment_intent,
    email = p_email, ime = p_ime, naslov = p_naslov,
    znesek_postavke = p_postavke, znesek_dostava = p_dostava, znesek_ddv = p_ddv,
    znesek_skupaj = p_skupaj, dostava_kljuc = p_dostava_kljuc, manjka = v_manjka, odjemalec = null
   where id = v_narocilo.id;

  return case when v_manjka > 0 then 'premalo' else 'placano' end;
end;
$$;

-- --------------------------------------------------------------------------
-- JSON naročila, tisk, serije
-- --------------------------------------------------------------------------
create or replace function trgovina.narocilo_json(p_id bigint) returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'id', n.id, 'javna_oznaka', n.javna_oznaka, 'stanje', n.stanje, 'user_id', n.user_id,
    'email', n.email, 'ime', n.ime, 'naslov', n.naslov, 'jezik', n.jezik,
    'znesek_postavke', n.znesek_postavke, 'znesek_dostava', n.znesek_dostava,
    'znesek_ddv', n.znesek_ddv, 'znesek_skupaj', n.znesek_skupaj, 'dostava_kljuc', n.dostava_kljuc,
    'sledilna', n.sledilna, 'manjka', n.manjka, 'placano_at', n.placano_at, 'poslano_at', n.poslano_at,
    'created_at', n.created_at,
    'postavke', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'razlicica_id', p.razlicica_id, 'sku', r.sku, 'ime', p.ime,
                                          'cena', p.cena, 'doplacilo', p.doplacilo, 'kolicina', p.kolicina,
                                          'personalizacija', p.personalizacija, 'stanje_tiska', p.stanje_tiska,
                                          'po_narocilu', i.po_narocilu, 'digitalni', i.digitalni,
                                          'boni', coalesce((
                                            select jsonb_agg(jsonb_build_object('zaporedje', b.zaporedje, 'koda_konec', b.koda_konec,
                                                                                'znesek', b.znesek, 'velja_do', b.velja_do,
                                                                                'porabljeno_at', b.porabljeno_at) order by b.zaporedje)
                                              from trgovina.boni b where b.postavka_id = p.id), '[]'::jsonb))
                       order by p.id)
        from trgovina.postavke p
        join trgovina.razlicice r on r.id = p.razlicica_id
        join trgovina.izdelki i on i.id = r.izdelek_id
       where p.narocilo_id = n.id), '[]'::jsonb))
  from trgovina.narocila n where n.id = p_id
$$;

-- Postavka za tisk (seznam za_tisk, serija, izvoz).
create view trgovina.tisk as
select p.id as postavka_id, p.serija_id, p.stanje_tiska, n.id as narocilo_id, n.javna_oznaka, n.placano_at,
       r.sku, p.ime, p.kolicina, p.personalizacija
  from trgovina.postavke p
  join trgovina.narocila n on n.id = p.narocilo_id
  join trgovina.razlicice r on r.id = p.razlicica_id
 where p.stanje_tiska is not null and n.stanje in ('placano', 'poslano');
revoke all on trgovina.tisk from public, anon, authenticated;

create function trgovina.serija_json(p_id bigint) returns jsonb
language sql stable
as $$
  select jsonb_build_object('id', s.id, 'created_at', s.created_at, 'poslana_at', s.poslana_at,
                            'natisnjena_at', s.natisnjena_at,
                            'postavke', coalesce((select jsonb_agg(to_jsonb(t) - 'serija_id' order by t.narocilo_id, t.postavka_id)
                                                    from trgovina.tisk t where t.serija_id = s.id), '[]'::jsonb))
    from trgovina.serije s where s.id = p_id
$$;

-- --------------------------------------------------------------------------
-- Boni (servis: stripe-webhook)
-- --------------------------------------------------------------------------
-- Izdan bon za kos `p_zaporedje` digitalne postavke plačanega naročila; znesek
-- je cena postavke. 'zabelezeno' | 'ze' (ponovljen webhook).
create function trgovina.zabelezi_bon(
  p_postavka bigint, p_zaporedje int, p_koda_hash text, p_koda_konec text,
  p_velja_do timestamptz, p_stripe_promocija text
) returns text
language plpgsql
as $$
declare
  v record;
begin
  if exists (select 1 from trgovina.boni where postavka_id = p_postavka and zaporedje = p_zaporedje) then
    return 'ze';
  end if;
  select p.narocilo_id, p.cena into v
    from trgovina.postavke p
    join trgovina.narocila n on n.id = p.narocilo_id and n.stanje in ('placano', 'poslano')
    join trgovina.razlicice r on r.id = p.razlicica_id
    join trgovina.izdelki i on i.id = r.izdelek_id and i.digitalni
   where p.id = p_postavka and p_zaporedje between 1 and p.kolicina;
  if not found or p_velja_do is null or nullif(p_stripe_promocija, '') is null then
    raise exception 'Trgovina: bon ne spada k tej postavki.' using hint = 'trgovina-vnos';
  end if;
  insert into trgovina.boni (narocilo_id, postavka_id, zaporedje, koda_hash, koda_konec, znesek, velja_do, stripe_promocija)
  values (v.narocilo_id, p_postavka, p_zaporedje, p_koda_hash, p_koda_konec, v.cena, p_velja_do, p_stripe_promocija)
  on conflict do nothing;
  return case when found then 'zabelezeno' else 'ze' end;
end;
$$;

-- Promocijska koda iz plačane seje (discounts). 'porabljen' | 'ze' | 'neznano' (ni naš bon).
create function trgovina.bon_porabljen(p_promocija text) returns text
language plpgsql
as $$
declare v timestamptz;
begin
  select porabljeno_at into v from trgovina.boni where stripe_promocija = p_promocija for update;
  if not found then
    return 'neznano';
  elsif v is not null then
    return 'ze';
  end if;
  update trgovina.boni set porabljeno_at = now() where stripe_promocija = p_promocija;
  return 'porabljen';
end;
$$;

revoke all on function trgovina.prvaki_uporabnika(uuid), trgovina.znacka_uporabnika(uuid),
  trgovina.personaliziraj(bigint, jsonb, uuid, text), trgovina.serija_json(bigint),
  trgovina.zabelezi_bon(bigint, int, text, text, timestamptz, text), trgovina.bon_porabljen(text)
  from public, anon, authenticated;

create function public.trgovina_zabelezi_bon(
  p_postavka bigint, p_zaporedje int, p_koda_hash text, p_koda_konec text,
  p_velja_do timestamptz, p_stripe_promocija text
) returns text
language sql security definer set search_path = public
as $$ select trgovina.zabelezi_bon(p_postavka, p_zaporedje, p_koda_hash, p_koda_konec, p_velja_do, p_stripe_promocija) $$;

create function public.trgovina_bon_porabljen(p_promocija text) returns text
language sql security definer set search_path = public
as $$ select trgovina.bon_porabljen(p_promocija) $$;

revoke all on function public.trgovina_zabelezi_bon(bigint, int, text, text, timestamptz, text),
  public.trgovina_bon_porabljen(text) from public, anon, authenticated;
grant execute on function public.trgovina_zabelezi_bon(bigint, int, text, text, timestamptz, text),
  public.trgovina_bon_porabljen(text) to service_role;

-- --------------------------------------------------------------------------
-- Javni katalog: po naročilu in digitalno sta vedno na voljo
-- --------------------------------------------------------------------------
create or replace function public.trgovina_katalog() returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'slug', i.slug, 'ime_sl', i.ime_sl, 'ime_en', i.ime_en, 'kategorija', i.kategorija,
           'slike', to_jsonb(i.slike), 'cena_od', v.cena_od, 'cena_do', v.cena_do,
           'na_voljo', case when i.po_narocilu or i.digitalni then 'da' else trgovina.oznaka_voljo(v.kosov) end,
           'po_narocilu', i.po_narocilu, 'digitalni', i.digitalni)
         order by i.vrstni_red, i.id), '[]'::jsonb)
  from trgovina.izdelki i
  join lateral (
    select min(r.cena) as cena_od, max(r.cena) as cena_do, sum(greatest(z.na_voljo, 0)) as kosov
      from trgovina.razlicice r join trgovina.razpolozljivo z on z.razlicica_id = r.id
     where r.izdelek_id = i.id and r.aktivna
  ) v on v.cena_od is not null
  where i.aktiven
$$;

create or replace function public.trgovina_izdelek(p_slug text) returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'slug', i.slug, 'ime_sl', i.ime_sl, 'ime_en', i.ime_en, 'opis_sl', i.opis_sl, 'opis_en', i.opis_en,
    'kategorija', i.kategorija, 'slike', to_jsonb(i.slike), 'pismo', i.pismo,
    'po_narocilu', i.po_narocilu, 'digitalni', i.digitalni,
    'personalizacije', coalesce((
      select jsonb_agg(jsonb_build_object('vrsta', x.vrsta, 'doplacilo', x.doplacilo, 'obvezna', x.obvezna) order by x.id)
        from trgovina.personalizacije x where x.izdelek_id = i.id), '[]'::jsonb),
    'razlicice', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'oznaka_sl', r.oznaka_sl, 'oznaka_en', r.oznaka_en,
                                          'cena', r.cena,
                                          'na_voljo', case when i.po_narocilu or i.digitalni then 'da'
                                                           else trgovina.oznaka_voljo(z.na_voljo) end)
                       order by r.vrstni_red, r.id)
        from trgovina.razlicice r join trgovina.razpolozljivo z on z.razlicica_id = r.id
       where r.izdelek_id = i.id and r.aktivna), '[]'::jsonb))
  from trgovina.izdelki i
  where i.slug = p_slug and i.aktiven
$$;

-- --------------------------------------------------------------------------
-- Kupec: upravičenost (gumbi na strani izdelka)
-- --------------------------------------------------------------------------
create function public.trgovina_moji_prvaki() returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from trgovina.prvaki_uporabnika(auth.uid()) p
$$;

-- {player_id, ime} (privzeto ime na znački) ali null.
create function public.trgovina_moja_znacka() returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('player_id', z.player_id, 'ime', z.ime) from trgovina.znacka_uporabnika(auth.uid()) z
$$;

revoke all on function public.trgovina_moji_prvaki(), public.trgovina_moja_znacka() from public, anon;
grant execute on function public.trgovina_moji_prvaki(), public.trgovina_moja_znacka() to authenticated;

-- --------------------------------------------------------------------------
-- Administracija
-- --------------------------------------------------------------------------
create or replace function public.trgovina_admin_izdelki() returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  return (select coalesce(jsonb_agg(to_jsonb(i) || jsonb_build_object(
             'razlicice', coalesce((
               select jsonb_agg(to_jsonb(r) || jsonb_build_object('na_voljo', z.na_voljo) order by r.vrstni_red, r.id)
                 from trgovina.razlicice r join trgovina.razpolozljivo z on z.razlicica_id = r.id
                where r.izdelek_id = i.id), '[]'::jsonb),
             'personalizacije', coalesce((
               select jsonb_agg(jsonb_build_object('vrsta', x.vrsta, 'doplacilo', x.doplacilo, 'obvezna', x.obvezna) order by x.id)
                 from trgovina.personalizacije x where x.izdelek_id = i.id), '[]'::jsonb))
           order by i.vrstni_red, i.id), '[]'::jsonb)
            from trgovina.izdelki i);
end;
$$;

create or replace function public.trgovina_admin_shrani_izdelek(p jsonb) returns bigint
language plpgsql security definer set search_path = public
as $$
declare r trgovina.izdelki;
begin
  perform trgovina.le_admin();
  if p ? 'id' and p->>'id' is not null then
    select * into r from trgovina.izdelki where id = (p->>'id')::bigint for update;
    if not found then
      raise exception 'Trgovina: ni izdelka.' using hint = 'trgovina-vnos';
    end if;
    r := jsonb_populate_record(r, p - 'id' - 'created_at');
    update trgovina.izdelki set slug = r.slug, ime_sl = r.ime_sl, ime_en = r.ime_en, opis_sl = r.opis_sl,
      opis_en = r.opis_en, kategorija = r.kategorija, slike = r.slike, tax_code = r.tax_code,
      pismo = r.pismo, aktiven = r.aktiven, vrstni_red = r.vrstni_red,
      po_narocilu = r.po_narocilu, digitalni = r.digitalni
     where id = r.id;
    return r.id;
  end if;
  r := jsonb_populate_record(null::trgovina.izdelki,
         '{"opis_sl":"","opis_en":"","slike":[],"tax_code":"txcd_99999999","pismo":false,"aktiven":false,"vrstni_red":0,
           "po_narocilu":false,"digitalni":false}'::jsonb
         || (p - 'id' - 'created_at'));
  insert into trgovina.izdelki (slug, ime_sl, ime_en, opis_sl, opis_en, kategorija, slike, tax_code,
                                pismo, aktiven, vrstni_red, po_narocilu, digitalni)
  values (r.slug, r.ime_sl, r.ime_en, r.opis_sl, r.opis_en, r.kategorija, r.slike, r.tax_code,
          r.pismo, r.aktiven, r.vrstni_red, r.po_narocilu, r.digitalni)
  returning id into r.id;
  return r.id;
end;
$$;

-- Možnost personalizacije izdelka; p_doplacilo null jo odstrani.
create function public.trgovina_admin_shrani_personalizacijo(p_izdelek bigint, p_vrsta text, p_doplacilo int, p_obvezna boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  if p_vrsta is null or p_vrsta not in ('ime_ekipe', 'poljubno_ime', 'stevilka', 'prvak', 'znacka')
     or p_doplacilo < 0 or not exists (select 1 from trgovina.izdelki where id = p_izdelek) then
    raise exception 'Trgovina: neveljavna personalizacija.' using hint = 'trgovina-vnos';
  end if;
  if p_doplacilo is null then
    delete from trgovina.personalizacije where izdelek_id = p_izdelek and vrsta = p_vrsta;
    return;
  end if;
  insert into trgovina.personalizacije (izdelek_id, vrsta, doplacilo, obvezna)
  values (p_izdelek, p_vrsta, p_doplacilo, coalesce(p_obvezna, false))
  on conflict (izdelek_id, vrsta) do update set doplacilo = excluded.doplacilo, obvezna = excluded.obvezna;
end;
$$;

create function public.trgovina_admin_za_tisk() returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  return (select coalesce(jsonb_agg(to_jsonb(t) - 'serija_id' order by t.placano_at, t.postavka_id), '[]'::jsonb)
            from trgovina.tisk t where t.stanje_tiska = 'za_tisk');
end;
$$;

-- Postavke za_tisk → nova serija (v_seriji). Vrne serijo s postavkami.
create function public.trgovina_admin_nova_serija(p_postavke bigint[]) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ids bigint[] := array(select distinct unnest(p_postavke));
  v_id bigint;
begin
  perform trgovina.le_admin();
  if cardinality(v_ids) = 0 or array_position(v_ids, null) is not null then
    raise exception 'Trgovina: izberi postavke.' using hint = 'trgovina-vnos';
  end if;
  perform 1 from trgovina.postavke where id = any (v_ids) order by id for update;
  if (select count(*) from trgovina.tisk where postavka_id = any (v_ids) and stanje_tiska = 'za_tisk') <> cardinality(v_ids) then
    raise exception 'Trgovina: postavka ni za tisk.' using hint = 'trgovina-stanje';
  end if;
  insert into trgovina.serije default values returning id into v_id;
  update trgovina.postavke set stanje_tiska = 'v_seriji', serija_id = v_id where id = any (v_ids);
  return trgovina.serija_json(v_id);
end;
$$;

create function public.trgovina_admin_serija(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  return trgovina.serija_json(p_id);
end;
$$;

create function public.trgovina_admin_serije() returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  return (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'created_at', s.created_at, 'poslana_at', s.poslana_at,
                                                       'natisnjena_at', s.natisnjena_at,
                                                       'postavk', (select count(*) from trgovina.postavke p where p.serija_id = s.id))
                                    order by s.id desc), '[]'::jsonb)
            from trgovina.serije s);
end;
$$;

-- p_stanje 'poslana' (tiskarni) | 'natisnjena' (postavke → natisnjeno).
create function public.trgovina_admin_serija_stanje(p_id bigint, p_stanje text) returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  if p_stanje is null or p_stanje not in ('poslana', 'natisnjena') then
    raise exception 'Trgovina: neznano stanje serije.' using hint = 'trgovina-vnos';
  end if;
  update trgovina.serije
     set poslana_at = coalesce(poslana_at, now()),
         natisnjena_at = case when p_stanje = 'natisnjena' then coalesce(natisnjena_at, now()) else natisnjena_at end
   where id = p_id;
  if not found then
    raise exception 'Trgovina: ni serije.' using hint = 'trgovina-vnos';
  end if;
  if p_stanje = 'natisnjena' then
    update trgovina.postavke set stanje_tiska = 'natisnjeno' where serija_id = p_id;
  end if;
  return trgovina.serija_json(p_id);
end;
$$;

create function public.trgovina_admin_boni() returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  return (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'narocilo_id', b.narocilo_id, 'javna_oznaka', n.javna_oznaka,
                                                       'email', n.email, 'koda_konec', b.koda_konec, 'znesek', b.znesek,
                                                       'velja_do', b.velja_do, 'porabljeno_at', b.porabljeno_at,
                                                       'created_at', b.created_at)
                                    order by b.id desc), '[]'::jsonb)
            from trgovina.boni b join trgovina.narocila n on n.id = b.narocilo_id);
end;
$$;

revoke all on function public.trgovina_admin_izdelki(), public.trgovina_admin_shrani_izdelek(jsonb),
  public.trgovina_admin_shrani_personalizacijo(bigint, text, int, boolean), public.trgovina_admin_za_tisk(),
  public.trgovina_admin_nova_serija(bigint[]), public.trgovina_admin_serija(bigint), public.trgovina_admin_serije(),
  public.trgovina_admin_serija_stanje(bigint, text), public.trgovina_admin_boni() from public, anon;
grant execute on function public.trgovina_admin_izdelki(), public.trgovina_admin_shrani_izdelek(jsonb),
  public.trgovina_admin_shrani_personalizacijo(bigint, text, int, boolean), public.trgovina_admin_za_tisk(),
  public.trgovina_admin_nova_serija(bigint[]), public.trgovina_admin_serija(bigint), public.trgovina_admin_serije(),
  public.trgovina_admin_serija_stanje(bigint, text), public.trgovina_admin_boni() to authenticated;

-- --------------------------------------------------------------------------
-- Začetni katalog (neaktiven; cene in doplačila uredi admin)
-- --------------------------------------------------------------------------
insert into trgovina.izdelki (slug, ime_sl, ime_en, kategorija, tax_code, pismo, po_narocilu, digitalni, vrstni_red) values
  ('majica-ime-ekipe', 'Majica z imenom ekipe', 'Fantasy team name T-shirt', 'oblacila', 'txcd_30011000', false, true, false, 110),
  ('majica-ime-stevilka', 'Majica z imenom in številko', 'Name and number T-shirt', 'oblacila', 'txcd_30011000', false, true, false, 120),
  ('skodelica-ime', 'Skodelica z imenom', 'Personalised mug', 'dom', 'txcd_99999999', false, true, false, 130),
  ('majica-prvak', 'Majica prvaka mini lige', 'Mini league champion T-shirt', 'oblacila', 'txcd_30011000', false, true, false, 140),
  ('skodelica-prvak', 'Skodelica prvaka', 'Champion mug', 'dom', 'txcd_99999999', false, true, false, 150),
  ('znacka', 'Značka preverjenega igralca', 'Verified player badge', 'dodatki', 'txcd_99999999', true, true, false, 160),
  ('darilni-bon', 'Darilni bon', 'Gift card', 'dodatki', 'txcd_00000000', false, false, true, 170);

insert into trgovina.razlicice (izdelek_id, oznaka_sl, oznaka_en, sku, cena, teza_g, vrstni_red)
select i.id, b.sl || ' / ' || v.v, b.en || ' / ' || v.v, x.k || '-' || b.k || '-' || v.v, 2500, 180, b.n * 10 + v.n
from trgovina.izdelki i
join (values ('majica-ime-ekipe', 'MIE'), ('majica-ime-stevilka', 'MIS'), ('majica-prvak', 'MPR')) x(slug, k) on x.slug = i.slug,
     (values ('Črna', 'Black', 'CRN', 1), ('Bela', 'White', 'BEL', 2)) b(sl, en, k, n),
     (values ('S', 1), ('M', 2), ('L', 3), ('XL', 4), ('XXL', 5)) v(v, n);

insert into trgovina.razlicice (izdelek_id, oznaka_sl, oznaka_en, sku, cena, teza_g, vrstni_red)
select i.id, x.sl, x.en, x.sku, x.cena, x.teza, x.n
from trgovina.izdelki i
join (values ('skodelica-ime', '330 ml', '330 ml', 'SKI-1', 1200, 350, 0),
             ('skodelica-prvak', '330 ml', '330 ml', 'SKP-1', 1200, 350, 0),
             ('znacka', 'Ena', 'One', 'ZNA-1', 500, 20, 0),
             ('darilni-bon', '20 €', '€20', 'BON-20', 2000, 0, 1),
             ('darilni-bon', '30 €', '€30', 'BON-30', 3000, 0, 2),
             ('darilni-bon', '50 €', '€50', 'BON-50', 5000, 0, 3)) x(slug, sl, en, sku, cena, teza, n)
  on x.slug = i.slug;

insert into trgovina.personalizacije (izdelek_id, vrsta, doplacilo, obvezna)
select i.id, x.vrsta, x.doplacilo, x.obvezna
from trgovina.izdelki i
join (values ('majica-ime-ekipe', 'ime_ekipe', 500, true), ('majica-ime-ekipe', 'stevilka', 300, false),
             ('majica-ime-stevilka', 'poljubno_ime', 500, true), ('majica-ime-stevilka', 'stevilka', 300, false),
             ('skodelica-ime', 'poljubno_ime', 500, true),
             ('majica-prvak', 'prvak', 0, true), ('skodelica-prvak', 'prvak', 0, true),
             ('znacka', 'znacka', 0, true)) x(slug, vrsta, doplacilo, obvezna)
  on x.slug = i.slug;
