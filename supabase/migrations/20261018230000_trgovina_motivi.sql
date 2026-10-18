-- SLFF Trgovina — motivi (personalizacija v slogu nedeljske lige), del 1:
-- majica in pulover po meri. Spec: docs/superpowers/specs/2026-10-18-trgovina-motivi-design.md
--
-- Izdelek je prazen nosilec (postopek tiska, tiskovne cone s fotografijo in
-- koti). Motiv ima polja, barvne sheme in izmišljene primere; za katere
-- izdelke velja in s kakšnim doplačilom, pove motivi_izdelki. Vse preverjanje
-- vnosa je v trgovina.personaliziraj (vhod {motiv, polja, shema}); stare
-- oblike (ime_ekipe, poljubno_ime, stevilka, prvak, znacka) ostanejo.

alter table trgovina.izdelki
  add column postopek text check (postopek in ('dtf', 'sublimacija', 'laser', 'uv', 'vezenje'));
comment on column trgovina.izdelki.postopek is 'Postopek tiska v lokalni tiskarni (izvoz za tisk).';

create table trgovina.cone (
  id          bigint generated always as identity primary key,
  izdelek_id  bigint not null references trgovina.izdelki on delete cascade,
  kljuc       text not null check (kljuc ~ '^[a-z]+$'),
  barva       text,
  slika       text not null default '',
  koti        jsonb not null check (jsonb_typeof(koti) = 'array' and jsonb_array_length(koti) = 4),
  sirina_mm   int not null check (sirina_mm > 0),
  visina_mm   int not null check (visina_mm > 0),
  unique nulls not distinct (izdelek_id, kljuc, barva)
);
comment on table trgovina.cone is 'Tiskovna cona izdelka: fotografija praznega nosilca in štirje koti cone na njej.';
comment on column trgovina.cone.barva is 'Barva različice (npr. ''Črna'', začetek oznaka_sl); null = vse barve.';
comment on column trgovina.cone.koti is '[[x,y]×4] TL, TR, BR, BL v px fotografije.';

create table trgovina.motivi (
  id          bigint generated always as identity primary key,
  slug        text unique not null check (slug ~ '^[a-z0-9-]+$'),
  ime_sl      text not null,
  ime_en      text not null,
  opis_sl     text not null default '',
  opis_en     text not null default '',
  cona        text not null check (cona ~ '^[a-z]+$'),
  polja       jsonb not null check (jsonb_typeof(polja) = 'array'),
  sheme       jsonb not null check (jsonb_typeof(sheme) = 'array' and jsonb_array_length(sheme) > 0),
  primeri     jsonb not null default '[]' check (jsonb_typeof(primeri) = 'array'),
  aktiven     boolean not null default false,
  vrstni_red  int not null default 0
);
comment on column trgovina.motivi.cona is 'Ključ cone (trgovina.cone.kljuc); polje lahko z "cona" pove drugo (sponzor na prsih).';
comment on column trgovina.motivi.polja is
  '[{kljuc, vrsta besedilo|stevilka|leto|ekipa|prvak|izbira, oznaka_sl, oznaka_en, max?, obvezno, privzeto?, moznosti?, cona?}]';
comment on column trgovina.motivi.sheme is '[{kljuc, ime_sl, ime_en, barve: [#hex ×2–3]}]';
comment on column trgovina.motivi.primeri is
  'Izmišljeni primeri za vitrino: [{polja, shema, izdelek (slug), barva}]; ekipa in prvak kot natisnjeno besedilo.';

create table trgovina.motivi_izdelki (
  motiv_id    bigint not null references trgovina.motivi on delete cascade,
  izdelek_id  bigint not null references trgovina.izdelki on delete cascade,
  doplacilo   int not null default 0 check (doplacilo >= 0),
  primary key (motiv_id, izdelek_id)
);
comment on column trgovina.motivi_izdelki.doplacilo is 'Centi z DDV na kos.';
create index on trgovina.motivi_izdelki (izdelek_id);

alter table trgovina.cone enable row level security;
alter table trgovina.motivi enable row level security;
alter table trgovina.motivi_izdelki enable row level security;
revoke all on trgovina.cone, trgovina.motivi, trgovina.motivi_izdelki from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Preverjanje motiva
-- --------------------------------------------------------------------------
-- Vhod {motiv: slug, polja: {kljuc: vrednost}, shema: kljuc}. Vrednosti:
-- besedilo/izbira niz, stevilka/leto celo število, ekipa id kupčeve nehišne
-- fantasy ekipe, prvak {mini_liga_id, sezona}. Neobvezno polje sme manjkati
-- (null ali "" = manjka). Shrani {motiv, polja, shema, ime} — polja z
-- natisnjenim besedilom (ekipa = ime ekipe, prvak = vrstica strežnika), ime =
-- opis za pošto in admin; ekipa in prvak še fantasy_team_id (prvak tudi
-- mini_liga_id, sezona).
create function trgovina.personaliziraj_motiv(
  p_izdelek bigint, p_vhod jsonb, p_user uuid, p_jezik text,
  out personalizacija jsonb, out doplacilo int, out opis text
)
language plpgsql stable
as $$
declare
  m trgovina.motivi;
  f jsonb;
  v jsonb;
  v_polja jsonb;
  v_izhod jsonb := '{}'::jsonb;
  v_dodatno jsonb := '{}'::jsonb;
  v_kljuc text;
  v_txt text;
  v_st numeric;
  v_id bigint;
  v_opisi text[] := '{}';
  v_liga bigint;
  v_sezona text;
begin
  if exists (select 1 from jsonb_object_keys(p_vhod) k where k not in ('motiv', 'polja', 'shema'))
     or jsonb_typeof(p_vhod->'motiv') is distinct from 'string'
     or coalesce(jsonb_typeof(p_vhod->'polja'), 'object') <> 'object'
     or jsonb_typeof(p_vhod->'shema') is distinct from 'string' then
    raise exception 'Trgovina: neveljavna personalizacija.' using hint = 'trgovina-personalizacija';
  end if;

  select mo.* into m
    from trgovina.motivi mo
   where mo.slug = p_vhod->>'motiv' and mo.aktiven;
  select mi.doplacilo into doplacilo
    from trgovina.motivi_izdelki mi where mi.motiv_id = m.id and mi.izdelek_id = p_izdelek;
  if m.id is null or doplacilo is null then
    raise exception 'Trgovina: motiv ni na voljo za ta izdelek.' using hint = 'trgovina-personalizacija';
  end if;

  if not exists (select 1 from jsonb_array_elements(m.sheme) s where s->>'kljuc' = p_vhod->>'shema') then
    raise exception 'Trgovina: neznana barvna shema.' using hint = 'trgovina-personalizacija';
  end if;

  v_polja := coalesce(p_vhod->'polja', '{}'::jsonb);
  if exists (select 1 from jsonb_object_keys(v_polja) k
              where not exists (select 1 from jsonb_array_elements(m.polja) x where x->>'kljuc' = k)) then
    raise exception 'Trgovina: neznano polje motiva.' using hint = 'trgovina-personalizacija';
  end if;

  for f in select x from jsonb_array_elements(m.polja) x loop
    v_kljuc := f->>'kljuc';
    v := v_polja->v_kljuc;
    if v is null or v = 'null'::jsonb or v = '""'::jsonb then
      if (f->>'obvezno')::boolean then
        raise exception 'Trgovina: polje % je obvezno.', v_kljuc using hint = 'trgovina-personalizacija';
      end if;
      continue;
    end if;

    case f->>'vrsta'
    when 'besedilo' then
      v_txt := case when jsonb_typeof(v) = 'string' then btrim(regexp_replace(v #>> '{}', '\s+', ' ', 'g')) end;
      if v_txt is null or char_length(v_txt) not between 1 and coalesce((f->>'max')::int, 12)
         or v_txt !~ '^[A-Za-zÀ-ÖØ-öø-ž .''&!?-]+$' or v_txt !~ '[A-Za-zÀ-ÖØ-öø-ž]'
         or public.prepovedano_besedilo(v_txt) is not null then
        raise exception 'Trgovina: besedilo v polju % ni dovoljeno.', v_kljuc using hint = 'trgovina-personalizacija';
      end if;
      v := to_jsonb(v_txt);

    when 'izbira' then
      if jsonb_typeof(v) <> 'string' or not coalesce(f->'moznosti', '[]'::jsonb) @> jsonb_build_array(v) then
        raise exception 'Trgovina: izbira v polju % ni na seznamu.', v_kljuc using hint = 'trgovina-personalizacija';
      end if;
      v_txt := v #>> '{}';

    when 'stevilka', 'leto' then
      v_st := case when jsonb_typeof(v) = 'number' then (v::text)::numeric end;
      if v_st is null or v_st <> trunc(v_st)
         or (f->>'vrsta' = 'stevilka' and v_st not between 0 and 99)
         or (f->>'vrsta' = 'leto' and v_st not between 1950 and extract(year from now())) then
        raise exception 'Trgovina: neveljavna številka v polju %.', v_kljuc using hint = 'trgovina-personalizacija';
      end if;
      v := to_jsonb(v_st::int);
      v_txt := v_st::int::text;

    when 'ekipa' then
      if p_user is null then
        raise exception 'Trgovina: za ta izdelek se prijavi.' using hint = 'trgovina-prijava';
      end if;
      v_st := case when jsonb_typeof(v) = 'number' then (v::text)::numeric end;
      v_id := null;
      if v_st = trunc(v_st) and v_st between -9223372036854775808 and 9223372036854775807 then
        select ft.id, ft.name into v_id, v_txt from public.fantasy_teams ft
         where ft.id = v_st::bigint and ft.owner_id = p_user and not ft.hisna;
      end if;
      if v_id is null then
        raise exception 'Trgovina: ekipa ni tvoja.' using hint = 'trgovina-personalizacija';
      end if;
      if char_length(v_txt) > coalesce((f->>'max')::int, 24) or public.prepovedano_besedilo(v_txt) is not null then
        raise exception 'Trgovina: tega imena ekipe ne natisnemo.' using hint = 'trgovina-vnos';
      end if;
      v := to_jsonb(v_txt);
      v_dodatno := v_dodatno || jsonb_build_object('fantasy_team_id', v_id);

    when 'prvak' then
      if p_user is null then
        raise exception 'Trgovina: za ta izdelek se prijavi.' using hint = 'trgovina-prijava';
      end if;
      v_liga := null; v_txt := null; v_id := null; v_sezona := null;
      if jsonb_typeof(v) = 'object' and jsonb_typeof(v->'mini_liga_id') = 'number' and jsonb_typeof(v->'sezona') = 'string' then
        select p.mini_liga_id, p.sezona, p.fantasy_team_id, trgovina.besedilo_prvaka(p.ime, p.sezona, p_jezik)
          into v_liga, v_sezona, v_id, v_txt
          from trgovina.prvaki_uporabnika(p_user) p
         where p.mini_liga_id::numeric = (v->>'mini_liga_id')::numeric and p.sezona = v->>'sezona'
         limit 1;
      end if;
      if v_liga is null then
        raise exception 'Trgovina: nisi prvak te mini lige.' using hint = 'trgovina-personalizacija';
      elsif v_txt is null then
        raise exception 'Trgovina: imena te mini lige ne natisnemo.' using hint = 'trgovina-besedilo';
      end if;
      v := to_jsonb(v_txt);
      v_dodatno := v_dodatno || jsonb_build_object('fantasy_team_id', v_id, 'mini_liga_id', v_liga, 'sezona', v_sezona);

    else
      raise exception 'Trgovina: neznana vrsta polja.' using hint = 'trgovina-personalizacija';
    end case;

    v_izhod := v_izhod || jsonb_build_object(v_kljuc, v);
    v_opisi := v_opisi || v_txt;
  end loop;

  opis := concat_ws(' · ', case when p_jezik = 'en' then m.ime_en else m.ime_sl end,
                    nullif(array_to_string(v_opisi, ' · '), ''));
  personalizacija := jsonb_build_object('motiv', m.slug, 'polja', v_izhod, 'shema', p_vhod->>'shema', 'ime', opis)
                     || v_dodatno;
end;
$$;

-- Isti podpis in pot kot prej; vhod s ključem motiv gre v personaliziraj_motiv.
-- Nosilec motivov (izdelek v motivi_izdelki) brez personalizacije ni prodan.
create or replace function trgovina.personaliziraj(
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
  if jsonb_typeof(p_vhod) = 'object' and p_vhod ? 'motiv' then
    select x.personalizacija, x.doplacilo, x.opis into personalizacija, doplacilo, opis
      from trgovina.personaliziraj_motiv(p_izdelek, p_vhod, p_user, p_jezik) x;
    return;
  end if;

  select coalesce(array_agg(x.vrsta), '{}'), coalesce(array_agg(x.vrsta) filter (where x.obvezna), '{}')
    into v_vrste, v_obvezne
    from trgovina.personalizacije x where x.izdelek_id = p_izdelek;

  if p_vhod is null or jsonb_typeof(p_vhod) = 'null' or p_vhod = '{}'::jsonb then
    if cardinality(v_obvezne) > 0 or exists (select 1 from trgovina.motivi_izdelki mi where mi.izdelek_id = p_izdelek) then
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
    -- Ime ekipe ne gre skozi varuj_prikazno_ime: na izdelek gre le čisto in kratko.
    if char_length(v_ime) > 24 or public.prepovedano_besedilo(v_ime) is not null then
      raise exception 'Trgovina: tega imena ekipe ne natisnemo.' using hint = 'trgovina-vnos';
    end if;
    personalizacija := jsonb_build_object('vrsta', 'ime_ekipe', 'ime', v_ime, 'fantasy_team_id', v_id);
  end if;

  if p_vhod ? 'poljubno_ime' then
    v := p_vhod->'poljubno_ime';
    v_ime := case when jsonb_typeof(v) = 'string' then btrim(regexp_replace(v #>> '{}', '\s+', ' ', 'g')) end;
    if v_ime is null or char_length(v_ime) not between 1 and 12
       or v_ime !~ '^[A-Za-zÀ-ÖØ-öø-ž .-]+$' or v_ime !~ '[A-Za-zÀ-ÖØ-öø-ž]'
       or public.prepovedano_besedilo(v_ime) is not null then
      raise exception 'Trgovina: to besedilo ni dovoljeno.' using hint = 'trgovina-personalizacija';
    end if;
    personalizacija := jsonb_build_object('vrsta', 'poljubno_ime', 'ime', v_ime);
  end if;

  if p_vhod ? 'prvak' then
    v := p_vhod->'prvak';
    if jsonb_typeof(v) = 'object' and jsonb_typeof(v->'mini_liga_id') = 'number' and jsonb_typeof(v->'sezona') = 'string' then
      select jsonb_build_object('vrsta', 'prvak',
               'ime', trgovina.besedilo_prvaka(pr.ime, pr.sezona, p_jezik),
               'mini_liga_id', pr.mini_liga_id, 'sezona', pr.sezona, 'fantasy_team_id', pr.fantasy_team_id)
        into personalizacija
        from trgovina.prvaki_uporabnika(p_user) pr
       where pr.mini_liga_id::numeric = (v->>'mini_liga_id')::numeric and pr.sezona = v->>'sezona'
       limit 1;
    end if;
    if personalizacija is null or not personalizacija ? 'mini_liga_id' then
      raise exception 'Trgovina: nisi prvak te mini lige.' using hint = 'trgovina-personalizacija';
    elsif personalizacija->>'ime' is null then
      raise exception 'Trgovina: imena te mini lige ne natisnemo.' using hint = 'trgovina-besedilo';
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

revoke all on function trgovina.personaliziraj_motiv(bigint, jsonb, uuid, text),
  trgovina.personaliziraj(bigint, jsonb, uuid, text) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Javno: motivi in cone
-- --------------------------------------------------------------------------
create function trgovina.cone_json(p_izdelek bigint) returns jsonb
language sql stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('kljuc', c.kljuc, 'barva', c.barva, 'slika', c.slika, 'koti', c.koti,
                                               'sirina_mm', c.sirina_mm, 'visina_mm', c.visina_mm)
                            order by c.kljuc, c.barva nulls first), '[]'::jsonb)
    from trgovina.cone c where c.izdelek_id = p_izdelek
$$;
revoke all on function trgovina.cone_json(bigint) from public, anon, authenticated;

-- Aktivni motivi; vsak z aktivnimi izdelki, za katere velja (doplačilo, cena od, cone).
create function public.trgovina_motivi() returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'slug', m.slug, 'ime_sl', m.ime_sl, 'ime_en', m.ime_en, 'opis_sl', m.opis_sl, 'opis_en', m.opis_en,
           'cona', m.cona, 'polja', m.polja, 'sheme', m.sheme, 'primeri', m.primeri,
           'izdelki', coalesce((
             select jsonb_agg(jsonb_build_object('slug', i.slug, 'ime_sl', i.ime_sl, 'ime_en', i.ime_en,
                                                 'postopek', i.postopek, 'doplacilo', mi.doplacilo,
                                                 'cena_od', (select min(r.cena) from trgovina.razlicice r
                                                              where r.izdelek_id = i.id and r.aktivna),
                                                 'cone', trgovina.cone_json(i.id))
                              order by i.vrstni_red, i.id)
               from trgovina.motivi_izdelki mi join trgovina.izdelki i on i.id = mi.izdelek_id and i.aktiven
              where mi.motiv_id = m.id), '[]'::jsonb))
         order by m.vrstni_red, m.id), '[]'::jsonb)
    from trgovina.motivi m
   where m.aktiven
$$;

create or replace function public.trgovina_izdelek(p_slug text) returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'slug', i.slug, 'ime_sl', i.ime_sl, 'ime_en', i.ime_en, 'opis_sl', i.opis_sl, 'opis_en', i.opis_en,
    'kategorija', i.kategorija, 'slike', to_jsonb(i.slike), 'pismo', i.pismo,
    'po_narocilu', i.po_narocilu, 'digitalni', i.digitalni, 'postopek', i.postopek,
    'personalizacije', coalesce((
      select jsonb_agg(jsonb_build_object('vrsta', x.vrsta, 'doplacilo', x.doplacilo, 'obvezna', x.obvezna) order by x.id)
        from trgovina.personalizacije x where x.izdelek_id = i.id), '[]'::jsonb),
    'motivi', coalesce((
      select jsonb_agg(jsonb_build_object('slug', m.slug, 'ime_sl', m.ime_sl, 'ime_en', m.ime_en,
                                          'opis_sl', m.opis_sl, 'opis_en', m.opis_en, 'cona', m.cona,
                                          'polja', m.polja, 'sheme', m.sheme, 'primeri', m.primeri,
                                          'doplacilo', mi.doplacilo)
                       order by m.vrstni_red, m.id)
        from trgovina.motivi_izdelki mi join trgovina.motivi m on m.id = mi.motiv_id and m.aktiven
       where mi.izdelek_id = i.id), '[]'::jsonb),
    'cone', trgovina.cone_json(i.id),
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

revoke all on function public.trgovina_motivi() from public;
grant execute on function public.trgovina_motivi() to anon, authenticated;

-- --------------------------------------------------------------------------
-- Administracija motivov
-- --------------------------------------------------------------------------
create function public.trgovina_admin_motivi() returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  return (select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object(
             'doplacila', coalesce((
               select jsonb_agg(jsonb_build_object('izdelek_id', i.id, 'slug', i.slug, 'doplacilo', mi.doplacilo)
                                order by i.vrstni_red, i.id)
                 from trgovina.motivi_izdelki mi join trgovina.izdelki i on i.id = mi.izdelek_id
                where mi.motiv_id = m.id), '[]'::jsonb))
           order by m.vrstni_red, m.id), '[]'::jsonb)
            from trgovina.motivi m);
end;
$$;

-- {id, aktiven?, vrstni_red?, primeri?, doplacila?: [{izdelek_id, doplacilo}]}; doplacilo null
-- motiv z izdelka odstrani. Polja in sheme ureja migracija (predloga mora imeti njihova mesta).
create function public.trgovina_admin_shrani_motiv(p jsonb) returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint;
  d jsonb;
begin
  perform trgovina.le_admin();
  if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'id') is distinct from 'number'
     or exists (select 1 from jsonb_object_keys(p) k where k not in ('id', 'aktiven', 'vrstni_red', 'primeri', 'doplacila'))
     or (p ? 'aktiven' and jsonb_typeof(p->'aktiven') <> 'boolean')
     or (p ? 'vrstni_red' and jsonb_typeof(p->'vrstni_red') <> 'number')
     or (p ? 'primeri' and jsonb_typeof(p->'primeri') <> 'array')
     or (p ? 'doplacila' and jsonb_typeof(p->'doplacila') <> 'array') then
    raise exception 'Trgovina: neveljaven motiv.' using hint = 'trgovina-vnos';
  end if;
  update trgovina.motivi set
    aktiven = coalesce((p->>'aktiven')::boolean, aktiven),
    vrstni_red = coalesce((p->>'vrstni_red')::int, vrstni_red),
    primeri = coalesce(p->'primeri', primeri)
   where id = (p->>'id')::bigint
  returning id into v_id;
  if v_id is null then
    raise exception 'Trgovina: ni motiva.' using hint = 'trgovina-vnos';
  end if;

  for d in select x from jsonb_array_elements(coalesce(p->'doplacila', '[]'::jsonb)) x loop
    if jsonb_typeof(d->'izdelek_id') is distinct from 'number'
       or coalesce(jsonb_typeof(d->'doplacilo'), 'null') not in ('number', 'null')
       or (d->>'doplacilo')::numeric < 0 or (d->>'doplacilo')::numeric <> trunc((d->>'doplacilo')::numeric)
       or not exists (select 1 from trgovina.izdelki i where i.id = (d->>'izdelek_id')::bigint and not i.digitalni) then
      raise exception 'Trgovina: neveljavno doplačilo motiva.' using hint = 'trgovina-vnos';
    end if;
    if d->>'doplacilo' is null then
      delete from trgovina.motivi_izdelki where motiv_id = v_id and izdelek_id = (d->>'izdelek_id')::bigint;
    else
      insert into trgovina.motivi_izdelki (motiv_id, izdelek_id, doplacilo)
      values (v_id, (d->>'izdelek_id')::bigint, (d->>'doplacilo')::int)
      on conflict (motiv_id, izdelek_id) do update set doplacilo = excluded.doplacilo;
    end if;
  end loop;
  return v_id;
end;
$$;

revoke all on function public.trgovina_admin_motivi(), public.trgovina_admin_shrani_motiv(jsonb) from public, anon;
grant execute on function public.trgovina_admin_motivi(), public.trgovina_admin_shrani_motiv(jsonb) to authenticated;

-- --------------------------------------------------------------------------
-- Začetni podatki (neaktivno; vklopi admin, ko so fotografije in predloge)
-- --------------------------------------------------------------------------
insert into trgovina.izdelki (slug, ime_sl, ime_en, opis_sl, opis_en, kategorija, tax_code, pismo, po_narocilu, digitalni, postopek, vrstni_red) values
  ('majica-po-meri', 'Majica po meri', 'Custom T-shirt',
   'Bombažna majica, 180 g, z motivom nedeljske lige po tvoje. Izberi motiv, vpiši svoje in poglej, kako bo videti.',
   'Cotton T-shirt, 180 g, with a Sunday-league design made your way. Pick a design, fill it in and see how it looks.',
   'oblacila', 'txcd_30011000', false, true, false, 'dtf', 100),
  ('pulover-po-meri', 'Pulover po meri', 'Custom hoodie',
   'Topel pulover s kapuco, 550 g, z motivom nedeljske lige po tvoje. Za hladne tekme ob igrišču.',
   'Warm hoodie, 550 g, with a Sunday-league design made your way. For cold matches on the touchline.',
   'oblacila', 'txcd_30011000', false, true, false, 'dtf', 105)
on conflict (slug) do nothing;

insert into trgovina.razlicice (izdelek_id, oznaka_sl, oznaka_en, sku, cena, teza_g, vrstni_red)
select i.id, b.sl || ' / ' || v.v, b.en || ' / ' || v.v, x.k || '-' || b.k || '-' || v.v, x.cena, x.teza, b.n * 10 + v.n
from trgovina.izdelki i
join (values ('majica-po-meri', 'MPM', 2700, 180, array['Črna', 'Bela']),
             ('pulover-po-meri', 'PPM', 5500, 550, array['Črna'])) x(slug, k, cena, teza, barve) on x.slug = i.slug
join (values ('Črna', 'Black', 'CRN', 1), ('Bela', 'White', 'BEL', 2)) b(sl, en, k, n) on b.sl = any (x.barve)
cross join (values ('S', 1), ('M', 2), ('L', 3), ('XL', 4), ('XXL', 5)) v(v, n)
where not exists (select 1 from trgovina.razlicice r where r.izdelek_id = i.id);

-- Cone: začasna fotografija (prazna) in koti na sliki 1600×1600; zamenja jih del 3.
insert into trgovina.cone (izdelek_id, kljuc, barva, slika, koti, sirina_mm, visina_mm)
select i.id, c.kljuc, c.barva, '', c.koti::jsonb, c.s, c.v
from trgovina.izdelki i
join (values
  ('majica-po-meri', 'hrbet', 'Črna', '[[560,400],[1040,400],[1040,1040],[560,1040]]', 300, 400),
  ('majica-po-meri', 'hrbet', 'Bela', '[[560,400],[1040,400],[1040,1040],[560,1040]]', 300, 400),
  ('majica-po-meri', 'prsi',  'Črna', '[[540,520],[1060,520],[1060,760],[540,760]]', 260, 120),
  ('majica-po-meri', 'prsi',  'Bela', '[[540,520],[1060,520],[1060,760],[540,760]]', 260, 120),
  ('pulover-po-meri', 'hrbet', null,  '[[560,420],[1040,420],[1040,1060],[560,1060]]', 300, 400),
  ('pulover-po-meri', 'prsi',  null,  '[[560,560],[1040,560],[1040,780],[560,780]]', 240, 110)
) c(slug, kljuc, barva, koti, s, v) on c.slug = i.slug
on conflict do nothing;

insert into trgovina.motivi (slug, ime_sl, ime_en, opis_sl, opis_en, cona, polja, sheme, primeri, vrstni_red) values
('retro-dres', 'Retro dres', 'Retro kit',
 'Kot dres iz devetdesetih: ime in številka na hrbtu, sponzor na prsih. Gostilna, avtoservis ali tvoja firma — vsaka prava ekipa ima nekoga, ki plača pijačo.',
 'Like a kit from the nineties: name and number on the back, a sponsor across the chest. The local pub, the garage or your own firm — every proper team has someone buying the drinks.',
 'hrbet',
 '[{"kljuc":"ime","vrsta":"besedilo","oznaka_sl":"Ime na hrbtu","oznaka_en":"Name on the back","max":12,"obvezno":true,"privzeto":"NOVAK"},
   {"kljuc":"stevilka","vrsta":"stevilka","oznaka_sl":"Številka","oznaka_en":"Number","obvezno":true,"privzeto":9},
   {"kljuc":"sponzor","vrsta":"besedilo","oznaka_sl":"Sponzor na prsih (gostilna, firma)","oznaka_en":"Chest sponsor (pub, company)","max":20,"obvezno":false,"privzeto":"Gostilna Pri Mici","cona":"prsi"},
   {"kljuc":"leto","vrsta":"leto","oznaka_sl":"Ustanovljeno","oznaka_en":"Established","obvezno":false,"privzeto":1998}]',
 '[{"kljuc":"klasika","ime_sl":"Klasika zelena-bela","ime_en":"Classic green and white","barve":["#1E8C45","#F4F4F0","#0B3B1E"]},
   {"kljuc":"retro","ime_sl":"Retro rdeča-rumena","ime_en":"Retro red and yellow","barve":["#C8102E","#F6C700","#3A0A0F"]},
   {"kljuc":"nocna","ime_sl":"Nočna črna-zlata","ime_en":"Night black and gold","barve":["#D4A62A","#1A1A1A","#F3E3B0"]}]',
 '[{"polja":{"ime":"NOVAK","stevilka":9,"sponzor":"Gostilna Pri Mici","leto":1998},"shema":"klasika","izdelek":"majica-po-meri","barva":"Bela"},
   {"polja":{"ime":"KOVAČ","stevilka":7,"sponzor":"Avtoservis Jože","leto":2004},"shema":"retro","izdelek":"majica-po-meri","barva":"Črna"},
   {"polja":{"ime":"ZUPAN","stevilka":10,"sponzor":"Pizzerija Ciao Bella"},"shema":"nocna","izdelek":"pulover-po-meri","barva":"Črna"},
   {"polja":{"ime":"HORVAT","stevilka":4,"sponzor":"Bar Pod Lipo","leto":1987},"shema":"retro","izdelek":"majica-po-meri","barva":"Bela"}]',
 10),
('legenda', 'Legenda nedeljske lige', 'Sunday League Legend',
 'Za tistega, ki igra že od nekdaj in še vedno prvi pride na igrišče. Ime, vzdevek, ki ga pozna vsa vas, in leto, ko se je vse začelo.',
 'For the one who has played forever and is still first at the pitch. Name, the nickname the whole village knows, and the year it all began.',
 'hrbet',
 '[{"kljuc":"ime","vrsta":"besedilo","oznaka_sl":"Ime","oznaka_en":"Name","max":12,"obvezno":true,"privzeto":"KRAJNC"},
   {"kljuc":"vzdevek","vrsta":"besedilo","oznaka_sl":"Vzdevek","oznaka_en":"Nickname","max":16,"obvezno":true,"privzeto":"Stari lisjak"},
   {"kljuc":"leto","vrsta":"leto","oznaka_sl":"Na igrišču od","oznaka_en":"On the pitch since","obvezno":true,"privzeto":1994}]',
 '[{"kljuc":"zlata-doba","ime_sl":"Zlata doba","ime_en":"Golden era","barve":["#C9962B","#F5E6C4","#4A3410"]},
   {"kljuc":"modra-kri","ime_sl":"Modra kri","ime_en":"True blue","barve":["#1F5FBF","#E8EEF8","#0C2350"]},
   {"kljuc":"nocna","ime_sl":"Nočna črna-zlata","ime_en":"Night black and gold","barve":["#D4A62A","#1A1A1A","#F3E3B0"]}]',
 '[{"polja":{"ime":"KRAJNC","vzdevek":"Stari lisjak","leto":1994},"shema":"zlata-doba","izdelek":"majica-po-meri","barva":"Črna"},
   {"polja":{"ime":"POTOČNIK","vzdevek":"Turbo","leto":2009},"shema":"modra-kri","izdelek":"majica-po-meri","barva":"Bela"},
   {"polja":{"ime":"VIDMAR","vzdevek":"Zid","leto":1989},"shema":"nocna","izdelek":"pulover-po-meri","barva":"Črna"}]',
 20),
('hangover-xi', 'Hangover XI', 'Hangover XI',
 'Za ekipo, ki v nedeljo ob desetih igra, kot da je bila sobota predolga. Ime tvoje fantasy ekipe in številka — opravičilo za slab prvi polčas vključeno.',
 'For the team that plays at ten on Sunday like Saturday went on too long. Your fantasy team name and a number — excuse for a slow first half included.',
 'hrbet',
 '[{"kljuc":"ekipa","vrsta":"ekipa","oznaka_sl":"Tvoja ekipa","oznaka_en":"Your team","max":24,"obvezno":true},
   {"kljuc":"stevilka","vrsta":"stevilka","oznaka_sl":"Številka","oznaka_en":"Number","obvezno":true,"privzeto":11}]',
 '[{"kljuc":"jutro-po","ime_sl":"Jutro po","ime_en":"Morning after","barve":["#7FB77E","#F2B5C4","#2B3A2B"]},
   {"kljuc":"pivska","ime_sl":"Pivska jantarna","ime_en":"Lager amber","barve":["#E8A317","#FFF4D6","#5A3A0A"]},
   {"kljuc":"nocna","ime_sl":"Nočna črna-zlata","ime_en":"Night black and gold","barve":["#D4A62A","#1A1A1A","#F3E3B0"]}]',
 '[{"polja":{"ekipa":"FC Pivo Kranj","stevilka":11},"shema":"pivska","izdelek":"majica-po-meri","barva":"Črna"},
   {"polja":{"ekipa":"Dinamo Kavč","stevilka":3},"shema":"jutro-po","izdelek":"majica-po-meri","barva":"Bela"},
   {"polja":{"ekipa":"Atletico Golaž","stevilka":8},"shema":"nocna","izdelek":"pulover-po-meri","barva":"Črna"},
   {"polja":{"ekipa":"Sporting Čevapčiči","stevilka":99},"shema":"pivska","izdelek":"majica-po-meri","barva":"Bela"}]',
 30),
('kapetan', 'Kapetan', 'Captain',
 'Trak "C" na rokavu, ime in številka na hrbtu. Za tistega, ki nabira denar za igrišče, kliče sodnika po imenu in pobere žogo po tekmi.',
 'The "C" armband on the sleeve, name and number on the back. For the one who collects the pitch money, knows the referee by name and takes the ball home.',
 'hrbet',
 '[{"kljuc":"ime","vrsta":"besedilo","oznaka_sl":"Ime","oznaka_en":"Name","max":12,"obvezno":true,"privzeto":"MLAKAR"},
   {"kljuc":"stevilka","vrsta":"stevilka","oznaka_sl":"Številka","oznaka_en":"Number","obvezno":true,"privzeto":5}]',
 '[{"kljuc":"klasika","ime_sl":"Klasika zelena-bela","ime_en":"Classic green and white","barve":["#1E8C45","#F4F4F0","#0B3B1E"]},
   {"kljuc":"kapetanska","ime_sl":"Kapetanska modra-rumena","ime_en":"Skipper blue and yellow","barve":["#1D4ED8","#FACC15","#0A1A4A"]},
   {"kljuc":"nocna","ime_sl":"Nočna črna-zlata","ime_en":"Night black and gold","barve":["#D4A62A","#1A1A1A","#F3E3B0"]}]',
 '[{"polja":{"ime":"MLAKAR","stevilka":5},"shema":"kapetanska","izdelek":"majica-po-meri","barva":"Bela"},
   {"polja":{"ime":"KOS","stevilka":1},"shema":"klasika","izdelek":"majica-po-meri","barva":"Črna"},
   {"polja":{"ime":"GOLOB","stevilka":14},"shema":"nocna","izdelek":"pulover-po-meri","barva":"Črna"}]',
 40),
('kralj-kafane', 'Kralj kafane', 'King of the Pub',
 'Golov je bilo več, kot jih je kdo videl, in vsaka zgodba je v kafani boljša. Ime, število golov v sezoni in leto, ko si bil kralj.',
 'More goals than anyone actually saw, and every story gets better at the bar. Name, goals in the season and the year you were king.',
 'hrbet',
 '[{"kljuc":"ime","vrsta":"besedilo","oznaka_sl":"Ime","oznaka_en":"Name","max":12,"obvezno":true,"privzeto":"BIZJAK"},
   {"kljuc":"goli","vrsta":"stevilka","oznaka_sl":"Golov v sezoni","oznaka_en":"Goals in the season","obvezno":true,"privzeto":23},
   {"kljuc":"sezona","vrsta":"leto","oznaka_sl":"Sezona (leto)","oznaka_en":"Season (year)","obvezno":true,"privzeto":2026}]',
 '[{"kljuc":"zlata-krona","ime_sl":"Zlata krona","ime_en":"Golden crown","barve":["#E0A91B","#B3202A","#3B1205"]},
   {"kljuc":"kafanska","ime_sl":"Kafanska bordo","ime_en":"Pub burgundy","barve":["#8E1B3A","#F1D9B5","#2E0712"]},
   {"kljuc":"nocna","ime_sl":"Nočna črna-zlata","ime_en":"Night black and gold","barve":["#D4A62A","#1A1A1A","#F3E3B0"]}]',
 '[{"polja":{"ime":"BIZJAK","goli":23,"sezona":2025},"shema":"zlata-krona","izdelek":"majica-po-meri","barva":"Črna"},
   {"polja":{"ime":"ŽAGAR","goli":31,"sezona":2024},"shema":"kafanska","izdelek":"majica-po-meri","barva":"Bela"},
   {"polja":{"ime":"TURK","goli":17,"sezona":2026},"shema":"nocna","izdelek":"pulover-po-meri","barva":"Črna"}]',
 50),
('prvak-mini-lige', 'Prvak mini lige', 'Mini League Champion',
 'Zmagal si mini ligo in vsi v skupini to vedo — zdaj bodo še videli. Napis s tvojo ligo in sezono sestavimo sami, iz rezultatov.',
 'You won the mini league and everyone in the group chat knows it — now they will see it too. We build the line with your league and season from the results.',
 'hrbet',
 '[{"kljuc":"prvak","vrsta":"prvak","oznaka_sl":"Mini liga, ki si jo osvojil","oznaka_en":"The mini league you won","obvezno":true}]',
 '[{"kljuc":"zlata","ime_sl":"Zlata","ime_en":"Gold","barve":["#D4A62A","#FFF3C4","#4A3410"]},
   {"kljuc":"srebrna","ime_sl":"Srebrna","ime_en":"Silver","barve":["#A7AFB8","#F2F4F6","#2F3640"]},
   {"kljuc":"zelena","ime_sl":"Igrišče zelena","ime_en":"Pitch green","barve":["#2E9E4F","#E9F6EC","#0B3B1E"]}]',
 '[{"polja":{"prvak":"Prvak mini lige Liga pri Šanku 2025/26"},"shema":"zlata","izdelek":"majica-po-meri","barva":"Črna"},
   {"polja":{"prvak":"Prvak mini lige Pisarna United 2024/25"},"shema":"srebrna","izdelek":"majica-po-meri","barva":"Bela"},
   {"polja":{"prvak":"Mini league champion The Sofa Cup 2025/26"},"shema":"zelena","izdelek":"pulover-po-meri","barva":"Črna"}]',
 60)
on conflict (slug) do nothing;

insert into trgovina.motivi_izdelki (motiv_id, izdelek_id, doplacilo)
select m.id, i.id, 800
from trgovina.motivi m
join trgovina.izdelki i on i.slug in ('majica-po-meri', 'pulover-po-meri')
where m.slug in ('retro-dres', 'legenda', 'hangover-xi', 'kapetan', 'kralj-kafane', 'prvak-mini-lige')
on conflict do nothing;
