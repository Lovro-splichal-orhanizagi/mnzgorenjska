-- Dnevna triaža admin vrst (SLF-260): prevzemi profilov, prijave lažnih
-- profilov, klubski zahtevki in prošnje za poznavalca.
--
-- Ena funkcija na strežniku (`dnevna_triaza`, pg_cron vsak dan), ne agent s
-- pisanjem v bazo. Vsak odprt zahtevek razvrsti, zapiše v dnevnik in na
-- Discord pošlje le števila (brez imen in e-naslovov). Sama naredi samo to,
-- kar obstoječa pravila že dovoljujejo brez admina, in le, če je vklopljeno
-- `triaza_samodejno` (privzeto IZKLOPLJENO: dokler ga admin ne vklopi, so
-- dejanja le predlogi v dnevniku):
--
--   * prevzem: potrdi ga (`prevzem_potrdi`, potrdil = 'soigralci') le, če ima
--     zapisani potrditvi DVEH različnih soigralcev, ki sta še danes potrjena v
--     istem klubu in ligi in nista z vabilom povezana ne s prosilcem ne med
--     seboj. Spor, prijava, mladinec brez potrdila "vsaj 16", skrito ime,
--     omejen račun in zahtevek brez dokaza ostanejo človeku. Tudi s
--     takim dokazom zahtevek počaka največ `triaza_zadrzanje_dni` (3) dni od
--     oddaje; prej gre le, če je po oddaji na novo kvalificiran prijatelj
--     prosilca (`povabila.kvalificiran_at` in obstoječa nehišna ekipa).
--     Povabilo samo NI dokaz in profila nikoli ne da; po 3 dneh brez dokaza
--     se ne zgodi nič.
--   * klubski zahtevek `polno` / `brez_kluba`: račun izda (`klub_ustvari_racun`)
--     le, kadar bi ga ob prijavi izdal že `uveljavi_klubski_racun`: potrjen
--     e-naslov računa je isti kot v zahtevku, je uradni naslov kluba v
--     `klub_stik`, klub ima prostor, račun ni bil nikoli preklican in zahtevek
--     za ta naslov ni bil zavrnjen. Zahtevek, ki ga je prehitel račun istega
--     kluba, se zapre. Nov naslov odloči vedno človek.
--   * poznavalci: nič samodejno (utež pri glasovanju); nočna podelitev
--     `podeli_samodejne_poznavalce` ostane, kot je.
--
-- Ponovni klic istega dne vrne že zapisan povzetek (idempotentno), suhi tek
-- (`p_suho`) ne spremeni ničesar razen dnevnika. Vsako dejanje teče v svojem
-- podbloku: napaka se zapiše, zahtevek ostane človeku. Razveljavitev:
-- `admin_triaza_razveljavi` (Administracija ali SQL).

insert into public.settings (key, value) values
  ('triaza_samodejno', 'false'::jsonb),
  ('triaza_zadrzanje_dni', '3'::jsonb)
on conflict (key) do nothing;

create table public.triaza_teki (
  id         bigint generated always as identity primary key,
  dan        date not null,
  suho       boolean not null,
  samodejno  boolean not null,
  povzetek   jsonb,
  sporocilo  text,
  napaka     text,
  created_at timestamptz not null default now(),
  koncan_at  timestamptz
);
-- En pravi (ne suh) uspešen tek na dan.
create unique index triaza_teki_en_na_dan on public.triaza_teki (dan) where not suho and napaka is null;

create table public.triaza_postavke (
  id             bigint generated always as identity primary key,
  tek_id         bigint not null references public.triaza_teki on delete cascade,
  vrsta          text not null check (vrsta in ('prevzem', 'prijava', 'klubski', 'poznavalec')),
  predmet_id     bigint not null,
  razvrstitev    text not null,
  clovek         boolean not null,
  dejanje        text check (dejanje in ('potrdi', 'izdaj', 'zapri')),
  uspelo         boolean,
  napaka         text,
  podrobnosti    jsonb not null default '{}'::jsonb,
  cakajoc_od     timestamptz,
  razveljavljeno_at timestamptz,
  razveljavil    uuid references public.profiles on delete set null,
  razveljavi_razlog text check (razveljavi_razlog is null or length(razveljavi_razlog) <= 500)
);
create index triaza_postavke_tek on public.triaza_postavke (tek_id);
create index triaza_postavke_predmet on public.triaza_postavke (vrsta, predmet_id) where dejanje is not null;

comment on table public.triaza_teki is 'Dnevna triaža admin vrst (SLF-260): en zapis na tek, povzetek brez osebnih podatkov.';
comment on table public.triaza_postavke is 'Razvrstitev vsakega odprtega zahtevka ob teku triaže in morebitno dejanje (dnevnik, razveljavitev).';

alter table public.triaza_teki enable row level security;
alter table public.triaza_postavke enable row level security;
revoke all on public.triaza_teki, public.triaza_postavke from anon, authenticated;

-- Dokaz soigralcev: dva različna zapisana potrjevalca, ki sta danes še
-- potrjena soigralca, nista prosilec, nista z vabilom povezana s prosilcem in
-- ne med seboj.
create or replace function public.triaza_dokaz_soigralcev(p_zahtevek_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  with z as (select * from zahtevki_igralca where id = p_zahtevek_id),
  v as (
    select ps.user_id
      from potrditve_soigralcev ps, z
     where ps.zahtevek_id = z.id and ps.user_id <> z.user_id
       and prevzem_soigralec(ps.user_id, z.player_id) is not null
       and not je_omejen(ps.user_id)
       and not exists (select 1 from povabila pv
                        where (pv.povabil = z.user_id and pv.povabljeni = ps.user_id)
                           or (pv.povabljeni = z.user_id and pv.povabil = ps.user_id))
  )
  select exists (
    select 1 from v a join v b on a.user_id < b.user_id
     where not exists (select 1 from povabila pv
                        where (pv.povabil = a.user_id and pv.povabljeni = b.user_id)
                           or (pv.povabljeni = a.user_id and pv.povabil = b.user_id)))
$$;
revoke all on function public.triaza_dokaz_soigralcev(bigint) from public, anon, authenticated;

create or replace function public.dnevna_triaza(p_suho boolean default true)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_dan       date := (now() at time zone 'Europe/Ljubljana')::date;
  v_samodejno boolean := coalesce((select value = 'true'::jsonb from settings where key = 'triaza_samodejno'), false);
  v_izvedi    boolean;
  v_dni       int := greatest(0, nastavitev_int('triaza_zadrzanje_dni', 3));
  v_tek       bigint;
  v_obstojec  triaza_teki;
  z           record;
  k           record;
  s           klub_stik;
  v_raz       text;
  v_clovek    boolean;
  v_dejanje   text;
  v_uspelo    boolean;
  v_napaka    text;
  v_podr      jsonb;
  v_team      bigint;
  v_racun     bigint;
  v_email     text;
  v_potrjen   timestamptz;
  v_povzetek  jsonb;
  v_sporocilo text;
  v_stevila   jsonb;
begin
  -- Cron in ročni klic ne tečeta hkrati.
  perform pg_advisory_xact_lock(hashtext('dnevna_triaza'));

  if not p_suho then
    select * into v_obstojec from triaza_teki
     where dan = v_dan and not suho and napaka is null;
    if found then
      return v_obstojec.povzetek || jsonb_build_object('ponovljeno', true, 'tek', v_obstojec.id);
    end if;
  end if;

  v_izvedi := v_samodejno and not p_suho;
  insert into triaza_teki (dan, suho, samodejno) values (v_dan, p_suho, v_izvedi) returning id into v_tek;

  begin
    -- ---------------------------------------------------------------- prevzemi
    for z in
      select zi.*, p.competition_id, p.team_id, p.anonimiziran_at
        from zahtevki_igralca zi join players p on p.id = zi.player_id
       where zi.status = 'cakajoc'
       order by zi.created_at, zi.id
    loop
      v_dejanje := null; v_uspelo := null; v_napaka := null;
      v_podr := jsonb_build_object(
        'potrditev', (select count(*) from potrditve_soigralcev ps where ps.zahtevek_id = z.id),
        'ima_potrjevalca', exists (
          select 1 from klubski_racuni r where r.team_id = z.team_id and r.preklican_at is null)
          or exists (select 1 from profiles pf where pf.insider_competition_id = z.competition_id));
      if z.spor or prevzem_zahtevek_igralca(z.player_id) is not null
         or exists (select 1 from zahtevki_igralca o
                     where o.player_id = z.player_id and o.status = 'cakajoc' and o.id <> z.id) then
        v_raz := 'spor';
      elsif z.anonimiziran_at is not null then
        v_raz := 'anonimiziran';
      elsif je_mladinska_liga(z.competition_id) and z.star_vsaj_16 is not true then
        v_raz := 'mladinski_brez_potrdila';
      elsif exists (select 1 from zahtevki_igralca o where o.user_id = z.user_id and o.status = 'potrjen') then
        v_raz := 'ze_ima_profil';
      elsif je_omejen(z.user_id) then
        v_raz := 'omejen';
      elsif not triaza_dokaz_soigralcev(z.id) then
        v_raz := 'caka_potrditev';
      elsif now() < z.created_at + make_interval(days => v_dni)
            and not exists (
              select 1 from povabila pv
               where pv.povabil = z.user_id and pv.kvalificiran_at >= z.created_at
                 and exists (select 1 from fantasy_teams ft where ft.owner_id = pv.povabljeni and not ft.hisna)) then
        v_raz := 'zadrzan';
        v_podr := v_podr || jsonb_build_object('do', z.created_at + make_interval(days => v_dni));
      else
        v_raz := 'potrdi';
        v_dejanje := 'potrdi';
      end if;
      v_clovek := v_raz in ('spor', 'anonimiziran', 'mladinski_brez_potrdila', 'ze_ima_profil', 'omejen', 'caka_potrditev');

      if v_dejanje is not null and v_izvedi then
        begin
          perform prevzem_potrdi(z.id, 'soigralci', null);
          v_uspelo := true;
        exception when others then
          v_uspelo := false; v_napaka := left(sqlerrm, 300); v_clovek := true;
        end;
      end if;
      insert into triaza_postavke (tek_id, vrsta, predmet_id, razvrstitev, clovek, dejanje, uspelo, napaka, podrobnosti, cakajoc_od)
      values (v_tek, 'prevzem', z.id, v_raz, v_clovek, v_dejanje, v_uspelo, v_napaka, v_podr, z.created_at);
    end loop;

    -- ------------------------------------------- prijave lažnih (potrjenih) profilov
    insert into triaza_postavke (tek_id, vrsta, predmet_id, razvrstitev, clovek, podrobnosti, cakajoc_od)
    select v_tek, 'prijava', pr.zahtevek_id, 'prijava', true,
           jsonb_build_object('prijav', count(*)), min(pr.created_at)
      from prijave_profila_igralca pr
      join zahtevki_igralca zi on zi.id = pr.zahtevek_id and zi.status = 'potrjen'
     where pr.resena_at is null
     group by pr.zahtevek_id;

    -- ------------------------------------------------------- klubski zahtevki
    for k in select * from klubski_zahtevki where status = 'odprt' order by created_at, id loop
      v_dejanje := null; v_uspelo := null; v_napaka := null; v_podr := '{}'::jsonb;
      s := null; v_team := null; v_racun := null;
      select team_id into v_team from klubski_racuni where user_id = k.user_id and preklican_at is null;
      select lower(btrim(email)), email_confirmed_at into v_email, v_potrjen from auth.users where id = k.user_id;
      select * into s from klub_stik where lower(btrim(email)) = k.email limit 1;

      if v_team is not null then
        if v_team = coalesce(k.team_id, s.team_id) then
          v_raz := 'zastarel'; v_dejanje := 'zapri';
        else
          v_raz := 'drug_klub';
        end if;
      elsif k.vrsta = 'nov_naslov' then
        v_raz := 'nov_naslov';
      elsif exists (select 1 from klubski_racuni where user_id = k.user_id and preklican_at is not null) then
        v_raz := 'preklican';
      elsif v_potrjen is null or v_email is distinct from k.email
            or s.id is null or s.stanje in ('ne_zeli', 'napacen_mail')
            or exists (select 1 from klubski_zahtevki o
                        where o.user_id = k.user_id and o.klub_stik_id = s.id and o.status = 'zavrnjen') then
        v_raz := 'naslov_ni_veljaven';
      elsif s.team_id is null then
        v_raz := 'brez_kluba';
      elsif (select count(*) from klubski_racuni where team_id = s.team_id and preklican_at is null) >= 5 then
        v_raz := 'polno';
      else
        v_raz := 'izdaj'; v_dejanje := 'izdaj';
      end if;
      v_clovek := v_dejanje is null;

      if v_dejanje is not null and v_izvedi then
        begin
          if v_dejanje = 'izdaj' then
            perform 1 from teams where id = s.team_id for update;
            if (select count(*) from klubski_racuni where team_id = s.team_id and preklican_at is null) >= 5 then
              raise exception 'Klub je medtem poln.';
            end if;
            v_racun := klub_ustvari_racun(k.user_id, s.team_id, s.id);
            update klubski_zahtevki
               set status = 'potrjen', team_id = s.team_id, klub_stik_id = s.id, decided_at = now(), decided_by = null,
                   razlog = 'Samodejno (triaža): potrjen uradni naslov kluba.'
             where id = k.id and status = 'odprt';
            v_podr := jsonb_build_object('racun_id', v_racun);
          else
            update klubski_zahtevki
               set status = 'potrjen', team_id = v_team, decided_at = now(), decided_by = null,
                   razlog = 'Samodejno (triaža): račun tega kluba že obstaja.'
             where id = k.id and status = 'odprt';
          end if;
          v_uspelo := true;
        exception when others then
          v_uspelo := false; v_napaka := left(sqlerrm, 300); v_clovek := true; v_podr := '{}'::jsonb;
        end;
      end if;
      insert into triaza_postavke (tek_id, vrsta, predmet_id, razvrstitev, clovek, dejanje, uspelo, napaka, podrobnosti, cakajoc_od)
      values (v_tek, 'klubski', k.id, v_raz, v_clovek, v_dejanje, v_uspelo, v_napaka, v_podr, k.created_at);
    end loop;

    -- ------------------------------------------------- prošnje za poznavalca
    insert into triaza_postavke (tek_id, vrsta, predmet_id, razvrstitev, clovek, cakajoc_od)
    select v_tek, 'poznavalec', pp.id,
           case when pf.insider_competition_id = pp.competition_id then 'ze_poznavalec' else 'prosnja' end,
           true, pp.created_at
      from poznavalec_prosnje pp join profiles pf on pf.id = pp.user_id
     where pp.status = 'caka';

    -- ---------------------------------------------------------------- povzetek
    select jsonb_object_agg(vrsta, raz) into v_stevila
      from (select vrsta, jsonb_object_agg(razvrstitev, n) raz
              from (select vrsta, razvrstitev, count(*) n from triaza_postavke where tek_id = v_tek group by 1, 2) a
             group by vrsta) b;
    select jsonb_build_object(
             'dan', v_dan, 'tek', v_tek, 'suho', p_suho, 'samodejno', v_izvedi,
             'stevila', coalesce(v_stevila, '{}'::jsonb),
             'odprtih', count(*) filter (where not (dejanje is not null and uspelo)),
             'clovek', count(*) filter (where clovek),
             'potrjenih', count(*) filter (where dejanje = 'potrdi' and uspelo),
             'izdanih', count(*) filter (where dejanje = 'izdaj' and uspelo),
             'zaprtih', count(*) filter (where dejanje = 'zapri' and uspelo),
             'predlogov', count(*) filter (where dejanje is not null and uspelo is null),
             'napak', count(*) filter (where uspelo = false),
             'najstarejsi_dni', coalesce(floor(extract(epoch from now() - min(cakajoc_od) filter (where clovek)) / 86400)::int, 0))
      into v_povzetek
      from triaza_postavke where tek_id = v_tek;

    v_sporocilo := triaza_sporocilo(v_povzetek);
    update triaza_teki set povzetek = v_povzetek, sporocilo = v_sporocilo, koncan_at = now() where id = v_tek;
  exception when others then
    -- Vse iz bloka (dejanja in postavke) se povrne; ostane zapis o napaki.
    v_napaka := left(sqlerrm, 300);
    update triaza_teki set napaka = v_napaka, koncan_at = now() where id = v_tek;
    if not p_suho then
      perform preverjeni_na_discord(format('⚠️ Dnevna triaža %s ni uspela; nič ni spremenjeno. Poglej triaza_teki #%s.',
        to_char(v_dan, 'FMDD. FMMM.'), v_tek));
    end if;
    return jsonb_build_object('dan', v_dan, 'tek', v_tek, 'napaka', v_napaka);
  end;

  if not p_suho then
    perform preverjeni_na_discord(v_sporocilo);
  end if;

  -- Dnevnik: suhi teki 30 dni, pravi brez dejanj 180 dni, dejanja ostanejo.
  delete from triaza_teki t
   where t.created_at < now() - interval '30 days' and t.suho;
  delete from triaza_postavke tp using triaza_teki t
   where t.id = tp.tek_id and t.created_at < now() - interval '180 days' and tp.dejanje is null;
  return v_povzetek;
end;
$$;

-- Besedilo za Discord: le števila, brez imen, e-naslovov in povezav.
create or replace function public.triaza_sporocilo(p jsonb)
returns text language plpgsql stable set search_path = public
as $$
declare
  s  jsonb := coalesce(p->'stevila', '{}'::jsonb);
  pz jsonb := coalesce(s->'prevzem', '{}'::jsonb);
  kz jsonb := coalesce(s->'klubski', '{}'::jsonb);
  pn jsonb := coalesce(s->'poznavalec', '{}'::jsonb);
  pr jsonb := coalesce(s->'prijava', '{}'::jsonb);
  t  text;
begin
  t := format('🗂️ Dnevna triaža %s', to_char((p->>'dan')::date, 'FMDD. FMMM.'));
  if not coalesce((p->>'samodejno')::boolean, false) then
    t := t || ' (samodejna dejanja izklopljena)';
  end if;
  t := t || E'\n' || format('Prevzemi: %s čaka · brez dokaza %s · sporni %s · zadržani (dokaz, vrsta) %s · drugo za odločitev %s',
    (select coalesce(sum(value::int), 0) from jsonb_each_text(pz)),
    coalesce((pz->>'caka_potrditev')::int, 0),
    coalesce((pz->>'spor')::int, 0),
    coalesce((pz->>'zadrzan')::int, 0),
    coalesce((pz->>'mladinski_brez_potrdila')::int, 0) + coalesce((pz->>'anonimiziran')::int, 0)
      + coalesce((pz->>'ze_ima_profil')::int, 0) + coalesce((pz->>'omejen')::int, 0));
  t := t || E'\n' || format('Prijave lažnih profilov: %s', coalesce((pr->>'prijava')::int, 0));
  t := t || E'\n' || format('Klubski zahtevki: %s odprtih · nov naslov %s · poln klub %s · brez kluba %s · drugo %s',
    (select coalesce(sum(value::int), 0) from jsonb_each_text(kz)),
    coalesce((kz->>'nov_naslov')::int, 0),
    coalesce((kz->>'polno')::int, 0),
    coalesce((kz->>'brez_kluba')::int, 0),
    coalesce((kz->>'drug_klub')::int, 0) + coalesce((kz->>'preklican')::int, 0) + coalesce((kz->>'naslov_ni_veljaven')::int, 0));
  t := t || E'\n' || format('Poznavalci: %s prošenj za odločitev', (select coalesce(sum(value::int), 0) from jsonb_each_text(pn)));
  t := t || E'\n' || format('Samodejno: potrjenih profilov %s · izdanih klubskih računov %s · zaprtih %s · predlogov %s · napak %s',
    coalesce((p->>'potrjenih')::int, 0), coalesce((p->>'izdanih')::int, 0), coalesce((p->>'zaprtih')::int, 0),
    coalesce((p->>'predlogov')::int, 0), coalesce((p->>'napak')::int, 0));
  t := t || E'\n' || format('Za človeka: %s · najstarejše čaka %s dni (Administracija)',
    coalesce((p->>'clovek')::int, 0), coalesce((p->>'najstarejsi_dni')::int, 0));
  return t;
end;
$$;

-- Razveljavi samodejno dejanje triaže (admin). Prevzem gre nazaj v čakanje
-- (predstavitev in povezave proč), klubski račun se prekliče in zahtevek
-- znova odpre; preklican račun se ob prijavi ne obnovi, odloči admin.
create or replace function public.admin_triaza_razveljavi(p_postavka_id bigint, p_razlog text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  t triaza_postavke;
  z zahtevki_igralca;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  select * into t from triaza_postavke where id = p_postavka_id for update;
  if not found or t.dejanje is null or t.uspelo is not true then
    raise exception 'Postavka nima izvedenega dejanja.';
  end if;
  if t.razveljavljeno_at is not null then
    raise exception 'Dejanje je že razveljavljeno.';
  end if;

  if t.dejanje = 'potrdi' then
    select * into z from zahtevki_igralca where id = t.predmet_id for update;
    if not found or z.status <> 'potrjen' or z.potrdil <> 'soigralci' or z.decided_by is not null then
      raise exception 'Profil ni več v stanju, ki ga je pustila triaža.';
    end if;
    perform prevzem_odstrani_predstavitev(z.player_id);
    delete from povezani_igralci where zahtevek_id = z.id;
    update prijave_profila_igralca set resena_at = now(), resil = auth.uid()
     where zahtevek_id = z.id and resena_at is null;
    update zahtevki_igralca
       set status = 'cakajoc', potrdil = null, decided_at = null, decided_by = null, obvescen_at = null,
           spor = exists (select 1 from zahtevki_igralca o
                           where o.player_id = z.player_id and o.status = 'cakajoc' and o.id <> z.id)
     where id = z.id;
    update zahtevki_igralca set spor = true
     where player_id = z.player_id and status = 'cakajoc' and id <> z.id;
  else
    if exists (select 1 from klubski_zahtevki o, klubski_zahtevki k
                where k.id = t.predmet_id and o.user_id = k.user_id and o.status = 'odprt' and o.id <> k.id) then
      raise exception 'Uporabnik ima že drug odprt klubski zahtevek.';
    end if;
    if t.dejanje = 'izdaj' then
      update klubski_racuni set preklican_at = now(), preklical = auth.uid()
       where id = (t.podrobnosti->>'racun_id')::bigint and preklican_at is null;
    end if;
    update klubski_zahtevki
       set status = 'odprt', decided_at = null, decided_by = null, razlog = null
     where id = t.predmet_id and status = 'potrjen';
    if not found then
      raise exception 'Klubski zahtevek ni več v stanju, ki ga je pustila triaža.';
    end if;
  end if;

  update triaza_postavke
     set razveljavljeno_at = now(), razveljavil = auth.uid(),
         razveljavi_razlog = nullif(left(btrim(coalesce(p_razlog, '')), 500), '')
   where id = t.id;
end;
$$;

-- Admin: zadnji teki in postavke enega teka (id zahtevkov, brez osebnih podatkov).
create or replace function public.admin_triaza(p_dni int default 14)
returns table (id bigint, dan date, suho boolean, samodejno boolean, povzetek jsonb, sporocilo text,
               napaka text, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
    select t.id, t.dan, t.suho, t.samodejno, t.povzetek, t.sporocilo, t.napaka, t.created_at
      from triaza_teki t
     where t.created_at > now() - make_interval(days => greatest(1, least(p_dni, 365)))
     order by t.created_at desc;
end;
$$;

create or replace function public.admin_triaza_postavke(p_tek_id bigint)
returns setof public.triaza_postavke
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query select * from triaza_postavke where tek_id = p_tek_id order by clovek desc, vrsta, cakajoc_od;
end;
$$;

-- Admin: suhi tek na zahtevo (nič ne spremeni, ne piše na Discord).
create or replace function public.admin_triaza_predogled()
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return dnevna_triaza(true);
end;
$$;

revoke all on function public.dnevna_triaza(boolean), public.triaza_sporocilo(jsonb),
  public.admin_triaza_razveljavi(bigint, text), public.admin_triaza(int),
  public.admin_triaza_postavke(bigint), public.admin_triaza_predogled() from public, anon, authenticated;
grant execute on function public.dnevna_triaza(boolean) to service_role;
grant execute on function public.admin_triaza_razveljavi(bigint, text), public.admin_triaza(int),
  public.admin_triaza_postavke(bigint), public.admin_triaza_predogled() to authenticated;

-- Vsak dan ob 7.07 UTC (8.07 / 9.07 v Ljubljani), po nočnih nalogah.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('dnevna-triaza', '7 7 * * *', $urnik$select public.dnevna_triaza(false)$urnik$);
exception
  when others then
    raise notice 'pg_cron ni na voljo: dnevna-triaza ni nastavljena (%).', sqlerrm;
end;
$$;
