-- SLFF Trgovina — motivi, dela 2 in 3: pub in tekma (kozarec, vrč, podstavki,
-- odpirač), stena in darila (plakat moje postave, retro plakat tekme, kartica
-- igralca, zastavica), šal, kapa, kapetanski trak.
-- Spec: docs/superpowers/specs/2026-10-18-trgovina-motivi-design.md,
-- načrt: docs/superpowers/plans/2026-10-19-trgovina-motivi-del23.md.
--
-- Isti stroj kot del 1 (20261019080000). Novo:
-- * vrsta polja `postava`: vrednost je id kupčeve nehišne ekipe (ne mladinske
--   lige); postavka shrani posnetek zadnjega zaklenjenega kroga (fantasy_lineups),
--   da tisk ne zavisi od kasnejših sprememb. Isti posnetek za živi predogled
--   vrne public.trgovina_moja_postava(p_team_id).
-- * vrsta polja `datum` (ISO "YYYY-MM-DD", 1950 do leto naprej) in `min` pri
--   `stevilka` (ocene na kartici 1–99).
-- * cona po različici: plakat A3/A2 uporabi obstoječi stolpec cone.barva
--   (prvi del oznake različice, kot "Črna" pri majici), nov stolpec ni potreben.
-- Vse je neaktivno; vklopi admin, ko so predloge in fotografije.

-- --------------------------------------------------------------------------
-- Preverjanje polj: datum in najmanjša številka
-- --------------------------------------------------------------------------
create or replace function trgovina.vrednost_polja(f jsonb, v jsonb) returns jsonb
language plpgsql stable
as $$
declare
  v_txt text;
  v_st numeric;
begin
  case f->>'vrsta'
  when 'besedilo' then
    v_txt := case when jsonb_typeof(v) = 'string' then btrim(regexp_replace(v #>> '{}', '\s+', ' ', 'g')) end;
    if v_txt is null or char_length(v_txt) not between 1 and coalesce((f->>'max')::int, 12)
       or v_txt !~ '^[A-Za-zÀ-ÖØ-öø-ž0-9 .''&!?-]+$' or v_txt !~ '[A-Za-zÀ-ÖØ-öø-ž]'
       or public.prepovedano_besedilo(v_txt) is not null then
      raise exception 'Trgovina: besedilo v polju % ni dovoljeno.', f->>'kljuc' using hint = 'trgovina-personalizacija';
    end if;
    return to_jsonb(v_txt);
  when 'izbira' then
    if jsonb_typeof(v) <> 'string' or not coalesce(f->'moznosti', '[]'::jsonb) @> jsonb_build_array(v) then
      raise exception 'Trgovina: izbira v polju % ni na seznamu.', f->>'kljuc' using hint = 'trgovina-personalizacija';
    end if;
    return v;
  when 'stevilka', 'leto' then
    v_st := case when jsonb_typeof(v) = 'number' then (v::text)::numeric end;
    if v_st is null or v_st <> trunc(v_st)
       or (f->>'vrsta' = 'stevilka' and v_st not between coalesce((f->>'min')::int, 0) and 99)
       or (f->>'vrsta' = 'leto' and v_st not between 1950 and extract(year from now())) then
      raise exception 'Trgovina: neveljavna številka v polju %.', f->>'kljuc' using hint = 'trgovina-personalizacija';
    end if;
    return to_jsonb(v_st::int);
  when 'datum' then
    v_txt := case when jsonb_typeof(v) = 'string' then v #>> '{}' end;
    if (case when v_txt ~ '^\d{4}-\d{2}-\d{2}$' and pg_input_is_valid(v_txt, 'date')
            then v_txt::date not between date '1950-01-01' and (current_date + interval '1 year')::date
            else true end) then
      raise exception 'Trgovina: neveljaven datum v polju %.', f->>'kljuc' using hint = 'trgovina-personalizacija';
    end if;
    return to_jsonb(v_txt);
  else
    raise exception 'Trgovina: neznana vrsta polja.' using hint = 'trgovina-personalizacija';
  end case;
end;
$$;

-- --------------------------------------------------------------------------
-- Posnetek postave
-- --------------------------------------------------------------------------
-- Zadnji zaklenjen krog ekipe (rounds.lineups_locked_at, posnetek v
-- fantasy_lineups), le za lastnika, ne hišne, ne mladinske lige. Oblika:
-- {fantasy_team_id, round_id, ekipa, liga, sezona, krog, formacija "4-4-2",
--  tocke (krog ekipe iz tocke_krogov, null dokler ni izračunan),
--  zacetni: [{ime, priimek, pozicija, klub, tocke, kapetan, podkapetan}] (GK, DEF, MID, FWD),
--  klop: [isto] (po vrstnem redu klopi)}.
-- Točke igralca so iz player_scores brez množitelja kapetana (null = še ni točk).
-- Anonimiziran igralec je "Igralec". Igralci so javni podatki uradnih zapisnikov.
create function trgovina.postava_ekipe(p_team bigint, p_user uuid) returns jsonb
language plpgsql stable
as $$
declare
  ft public.fantasy_teams;
  v_krog public.rounds;
  v jsonb;
begin
  if p_user is null then
    raise exception 'Trgovina: za ta izdelek se prijavi.' using hint = 'trgovina-prijava';
  end if;
  select t.* into ft from public.fantasy_teams t where t.id = p_team and t.owner_id = p_user and not t.hisna;
  if ft.id is null then
    raise exception 'Trgovina: ekipa ni tvoja.' using hint = 'trgovina-personalizacija';
  end if;
  if public.je_mladinska_liga(ft.competition_id) then
    raise exception 'Trgovina: ekipa mladinske lige ni za ta motiv.' using hint = 'trgovina-personalizacija';
  end if;
  if char_length(ft.name) > 24 or public.prepovedano_besedilo(ft.name) is not null then
    raise exception 'Trgovina: tega imena ekipe ne natisnemo.' using hint = 'trgovina-vnos';
  end if;

  select r.* into v_krog
    from public.rounds r
   where r.competition_id = ft.competition_id and r.lineups_locked_at is not null
     and exists (select 1 from public.fantasy_lineups l where l.round_id = r.id and l.fantasy_team_id = ft.id)
   order by r.deadline_at desc nulls last, r.id desc
   limit 1;
  if v_krog.id is null then
    raise exception 'Trgovina: ekipa še nima zaklenjenega kroga.' using hint = 'trgovina-personalizacija';
  end if;

  with igralci as (
    select l.is_starter, l.bench_order, p.id,
           coalesce(l.position, p.position) as pozicija,
           jsonb_build_object(
             'ime', case when p.anonimiziran_at is not null then 'Igralec'
                         else coalesce(nullif(btrim(p.full_name), ''), btrim(concat_ws(' ', p.first_name, p.last_name))) end,
             'priimek', case when p.anonimiziran_at is not null then 'Igralec'
                             else coalesce(nullif(btrim(p.last_name), ''), btrim(p.full_name)) end,
             'pozicija', coalesce(l.position, p.position),
             'klub', coalesce(nullif(btrim(t.short_name), ''), t.name),
             'tocke', trim_scale(s.points),
             'kapetan', l.is_captain,
             'podkapetan', l.is_vice) as igralec
      from public.fantasy_lineups l
      join public.players p on p.id = l.player_id
      left join public.teams t on t.id = p.team_id
      left join public.player_scores s on s.round_id = l.round_id and s.player_id = l.player_id
     where l.round_id = v_krog.id and l.fantasy_team_id = ft.id
  )
  select jsonb_build_object(
           'fantasy_team_id', ft.id, 'round_id', v_krog.id, 'ekipa', ft.name,
           'liga', (select c.name from public.competitions c where c.id = ft.competition_id),
           'sezona', v_krog.season, 'krog', v_krog.number,
           'formacija', format('%s-%s-%s', count(*) filter (where i.is_starter and i.pozicija = 'DEF'),
                               count(*) filter (where i.is_starter and i.pozicija = 'MID'),
                               count(*) filter (where i.is_starter and i.pozicija = 'FWD')),
           'tocke', (select trim_scale(tk.points) from public.tocke_krogov tk
                      where tk.fantasy_team_id = ft.id and tk.round_id = v_krog.id),
           'zacetni', coalesce(jsonb_agg(i.igralec order by array_position(array['GK', 'DEF', 'MID', 'FWD'], i.pozicija), i.id)
                                 filter (where i.is_starter), '[]'::jsonb),
           'klop', coalesce(jsonb_agg(i.igralec order by i.bench_order nulls last, i.id)
                              filter (where not i.is_starter), '[]'::jsonb))
    into v
    from igralci i;
  return v;
end;
$$;
revoke all on function trgovina.postava_ekipe(bigint, uuid) from public, anon, authenticated;

-- Živi predogled plakata: isti posnetek kot ob nakupu, le za lastnika.
create function public.trgovina_moja_postava(p_team_id bigint) returns jsonb
language sql stable security definer set search_path = public
as $$ select trgovina.postava_ekipe(p_team_id, auth.uid()) $$;
revoke all on function public.trgovina_moja_postava(bigint) from public, anon;
grant execute on function public.trgovina_moja_postava(bigint) to authenticated;

-- --------------------------------------------------------------------------
-- personaliziraj_motiv: vrsti datum in postava (ostalo kot v delu 1)
-- --------------------------------------------------------------------------
-- postava: polja.<kljuc> = posnetek (trgovina.postava_ekipe), poleg še
-- fantasy_team_id in round_id na vrhu personalizacije.
create or replace function trgovina.personaliziraj_motiv(
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
    if trgovina.prazno_polje(v) then
      if (f->>'obvezno')::boolean then
        raise exception 'Trgovina: polje % je obvezno.', v_kljuc using hint = 'trgovina-personalizacija';
      end if;
      continue;
    end if;

    case f->>'vrsta'
    when 'besedilo', 'izbira', 'stevilka', 'leto', 'datum' then
      v := trgovina.vrednost_polja(f, v);
      v_txt := v #>> '{}';

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
      if public.je_mladinska_liga((select ft.competition_id from public.fantasy_teams ft where ft.id = v_id)) then
        raise exception 'Trgovina: ekipa mladinske lige ni za ta motiv.' using hint = 'trgovina-personalizacija';
      end if;
      if char_length(v_txt) > coalesce((f->>'max')::int, 24) or public.prepovedano_besedilo(v_txt) is not null then
        raise exception 'Trgovina: tega imena ekipe ne natisnemo.' using hint = 'trgovina-vnos';
      end if;
      v := to_jsonb(v_txt);
      v_dodatno := v_dodatno || jsonb_build_object('fantasy_team_id', v_id);

    when 'postava' then
      if p_user is null then
        raise exception 'Trgovina: za ta izdelek se prijavi.' using hint = 'trgovina-prijava';
      end if;
      v_st := case when jsonb_typeof(v) = 'number' then (v::text)::numeric end;
      if v_st is null or v_st <> trunc(v_st) or v_st not between -9223372036854775808 and 9223372036854775807 then
        raise exception 'Trgovina: ekipa ni tvoja.' using hint = 'trgovina-personalizacija';
      end if;
      v := trgovina.postava_ekipe(v_st::bigint, p_user);
      v_txt := v->>'ekipa';
      v_dodatno := v_dodatno || jsonb_build_object('fantasy_team_id', v->'fantasy_team_id', 'round_id', v->'round_id');

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
  personalizacija := jsonb_build_object('motiv', m.slug, 'polja', v_izhod, 'shema', p_vhod->>'shema', 'ime', opis,
                       'barve', (select s->'barve' from jsonb_array_elements(m.sheme) s where s->>'kljuc' = p_vhod->>'shema'))
                     || v_dodatno;
end;
$$;

-- --------------------------------------------------------------------------
-- Admin: primer s postavo (izmišljena ekipa, 11 + klop)
-- --------------------------------------------------------------------------
-- Kot v delu 1; nova je le veja postava: {ekipa, zacetni[11], klop[]}, vsak
-- igralec z imenom (besedilo do 24) in pozicijo GK/DEF/MID/FWD.
create or replace function public.trgovina_admin_shrani_motiv(p jsonb) returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint;
  d jsonb;
  m trgovina.motivi;
  e jsonb;
  f jsonb;
  v jsonb;
  g jsonb;
  v_n int := 0;
  v_sporocilo text;
begin
  perform trgovina.le_admin();
  if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'id') is distinct from 'number'
     or exists (select 1 from jsonb_object_keys(p) k where k not in ('id', 'aktiven', 'vrstni_red', 'primeri', 'doplacila'))
     or (p ? 'aktiven' and jsonb_typeof(p->'aktiven') <> 'boolean')
     or (p ? 'vrstni_red' and (jsonb_typeof(p->'vrstni_red') <> 'number'
                               or (p->>'vrstni_red')::numeric <> trunc((p->>'vrstni_red')::numeric)
                               or (p->>'vrstni_red')::numeric not between -2147483648 and 2147483647))
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
       or (d->>'doplacilo' is not null
           and not exists (select 1 from trgovina.izdelki i where i.id = (d->>'izdelek_id')::bigint
                         and i.po_narocilu and i.postopek is not null and not i.digitalni)) then
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

  select * into m from trgovina.motivi where id = v_id;
  for e in select x from jsonb_array_elements(m.primeri) x loop
    v_n := v_n + 1;
    begin
      if jsonb_typeof(e) <> 'object'
         or exists (select 1 from jsonb_object_keys(e) k where k not in ('polja', 'shema', 'izdelek', 'barva'))
         or jsonb_typeof(e->'polja') is distinct from 'object'
         or jsonb_typeof(e->'barva') is distinct from 'string'
         or not exists (select 1 from jsonb_array_elements(m.sheme) x where x->>'kljuc' = e->>'shema')
         or not exists (select 1 from trgovina.motivi_izdelki mi join trgovina.izdelki i on i.id = mi.izdelek_id
                         where mi.motiv_id = v_id and i.slug = e->>'izdelek')
         or exists (select 1 from jsonb_object_keys(e->'polja') k
                     where not exists (select 1 from jsonb_array_elements(m.polja) x where x->>'kljuc' = k)) then
        raise exception 'Trgovina: neveljaven primer.';
      end if;
      for f in select x from jsonb_array_elements(m.polja) x loop
        v := e->'polja'->(f->>'kljuc');
        if trgovina.prazno_polje(v) then
          if (f->>'obvezno')::boolean then
            raise exception 'Trgovina: polje % je obvezno.', f->>'kljuc';
          end if;
        elsif f->>'vrsta' = 'ekipa' then
          perform trgovina.vrednost_polja(f || jsonb_build_object('vrsta', 'besedilo', 'max', coalesce((f->>'max')::int, 24)), v);
        elsif f->>'vrsta' = 'prvak' then
          if jsonb_typeof(v) <> 'string' or char_length(v #>> '{}') > 40 or v #>> '{}' !~ ' [0-9]{4}/[0-9]{2}$'
             or public.prepovedano_besedilo(regexp_replace(v #>> '{}', ' [0-9]{4}/[0-9]{2}$', '')) is not null then
            raise exception 'Trgovina: besedilo v polju % ni dovoljeno.', f->>'kljuc';
          end if;
        elsif f->>'vrsta' = 'postava' then
          if jsonb_typeof(v) <> 'object' or jsonb_typeof(v->'zacetni') is distinct from 'array'
             or jsonb_array_length(v->'zacetni') <> 11 or coalesce(jsonb_typeof(v->'klop'), 'array') <> 'array' then
            raise exception 'Trgovina: postava v polju % ni veljavna.', f->>'kljuc';
          end if;
          perform trgovina.vrednost_polja(jsonb_build_object('kljuc', f->>'kljuc', 'vrsta', 'besedilo', 'max', 24), v->'ekipa');
          for g in select x from jsonb_array_elements(v->'zacetni' || coalesce(v->'klop', '[]'::jsonb)) x loop
            if jsonb_typeof(g) <> 'object' or coalesce(g->>'pozicija', '') not in ('GK', 'DEF', 'MID', 'FWD') then
              raise exception 'Trgovina: postava v polju % ni veljavna.', f->>'kljuc';
            end if;
            perform trgovina.vrednost_polja(jsonb_build_object('kljuc', f->>'kljuc', 'vrsta', 'besedilo', 'max', 24), g->'ime');
          end loop;
        else
          perform trgovina.vrednost_polja(f, v);
        end if;
      end loop;
    exception when others then
      get stacked diagnostics v_sporocilo = message_text;
      raise exception 'Primer %: %', v_n, v_sporocilo using hint = 'trgovina-vnos';
    end;
  end loop;
  return v_id;
end;
$$;
revoke all on function public.trgovina_admin_shrani_motiv(jsonb) from public, anon;
grant execute on function public.trgovina_admin_shrani_motiv(jsonb) to authenticated;

-- --------------------------------------------------------------------------
-- Nosilci (neaktivni)
-- --------------------------------------------------------------------------
-- Postopki: laser = ena barva, le črte in polne ploskve (steklo, kovina);
-- vezenje = največ 4 barve niti, črta >= 1 mm, besedilo >= 5 mm; uv = tisk
-- plakata in kartice; sublimacija = podstavki, zastavica, šal, trak.
insert into trgovina.izdelki (slug, ime_sl, ime_en, opis_sl, opis_en, kategorija, tax_code, pismo, po_narocilu, digitalni, postopek, vrstni_red) values
  ('kozarec-po-meri', 'Pivski kozarec po meri', 'Custom beer glass',
   'Pivski kozarec 0,5 l z lasersko gravuro, ki se ne spere. Za tretji polčas, ki traja dlje od prvih dveh.',
   'A 0.5 l beer glass with a laser engraving that never washes off. For the third half that lasts longer than the first two.',
   'dom', 'txcd_99999999', false, true, false, 'laser', 200),
  ('vrc-po-meri', 'Pivski vrč po meri', 'Custom beer mug',
   'Steklen vrč z ročajem, 0,5 l, gravura okoli in okoli. Ko ekipa nazdravi, se vidi, čigav je.',
   'A 0.5 l glass mug with a handle, engraved all the way round. When the team raises a toast, everyone sees whose it is.',
   'dom', 'txcd_99999999', false, true, false, 'laser', 205),
  ('podstavki-po-meri', 'Podstavki po meri ×6', 'Custom beer mats ×6',
   'Komplet šestih podstavkov z imenom ekipe in šestimi slogani — za vsako rundo svojega.',
   'A set of six beer mats with your team name and six slogans — a different one for every round.',
   'dom', 'txcd_99999999', false, true, false, 'sublimacija', 210),
  ('odpirac-po-meri', 'Odpirač po meri', 'Custom bottle opener',
   'Kovinski odpirač z gravuro imena in številke. Najpomembnejši pripomoček po tekmi.',
   'A metal bottle opener engraved with a name and number. The most important kit after the final whistle.',
   'dom', 'txcd_99999999', false, true, false, 'laser', 215),
  ('plakat-po-meri', 'Plakat po meri', 'Custom poster',
   'Plakat na debelem mat papirju, A3 ali A2. Za steno v garderobi, sobi ali pisarni.',
   'A poster on heavy matte paper, A3 or A2. For the wall in the dressing room, bedroom or office.',
   'dom', 'txcd_99999999', false, true, false, 'uv', 220),
  ('kartica-igralca', 'Kartica igralca', 'Player card',
   'Velika kartica A5 kot iz zbirke sličic, s tvojimi ocenami. Ocene določiš sam, nihče ne bo preverjal.',
   'A big A5 card like from a sticker album, with your own ratings. You set the numbers, nobody will check.',
   'dom', 'txcd_99999999', false, true, false, 'uv', 225),
  ('zastavica-po-meri', 'Zastavica po meri', 'Custom pennant',
   'Klubska zastavica z resicami, kot jih kapetana izmenjata pred tekmo.',
   'A tasselled club pennant, like the ones captains swap before kick-off.',
   'dom', 'txcd_99999999', false, true, false, 'sublimacija', 230),
  ('sal-po-meri', 'Satenast šal po meri', 'Custom satin scarf',
   'Satenast navijaški šal, 140 cm, z imenom ekipe na obeh koncih.',
   'A satin supporters'' scarf, 140 cm, with your team name on both ends.',
   'dodatki', 'txcd_99999999', false, true, false, 'sublimacija', 240),
  ('kapa-po-meri', 'Kapa po meri', 'Custom cap',
   'Kapa s šiltom in vezenim napisom spredaj. Kratko in jasno, kot navodila trenerja.',
   'A cap with an embroidered front. Short and clear, like the coach''s team talk.',
   'dodatki', 'txcd_99999999', false, true, false, 'vezenje', 245),
  ('trak-po-meri', 'Kapetanski trak po meri', 'Custom captain''s armband',
   'Kapetanski trak z napisom po meri in ježkom. Za tistega, ki pobere denar za igrišče.',
   'A captain''s armband with your own text and a velcro strap. For the one who collects the pitch money.',
   'dodatki', 'txcd_99999999', false, true, false, 'sublimacija', 250)
on conflict (slug) do nothing;

insert into trgovina.razlicice (izdelek_id, oznaka_sl, oznaka_en, sku, cena, teza_g, vrstni_red)
select i.id, x.sl, x.en, x.sku, x.cena, x.teza, x.n
from trgovina.izdelki i
join (values
  ('kozarec-po-meri',   '0,5 l',        '0.5 l',       'KZM-1',   1200, 450, 1),
  ('vrc-po-meri',       '0,5 l',        '0.5 l',       'VRM-1',   1800, 700, 1),
  ('podstavki-po-meri', 'Komplet 6',    'Set of 6',    'PDS-6',   1500, 120, 1),
  ('odpirac-po-meri',   'Ena velikost', 'One size',    'ODM-1',    900,  60, 1),
  ('plakat-po-meri',    'A3',           'A3',          'PLM-A3',  1900, 250, 1),
  ('plakat-po-meri',    'A2',           'A2',          'PLM-A2',  2900, 350, 2),
  ('kartica-igralca',   'A5',           'A5',          'KIG-A5',   900,  40, 1),
  ('zastavica-po-meri', 'Ena velikost', 'One size',    'ZSM-1',   1500,  80, 1),
  ('sal-po-meri',       'Ena velikost', 'One size',    'SLM-1',   2500, 150, 1),
  ('kapa-po-meri',      'Črna',         'Black',       'KPM-CRN', 2400, 120, 1),
  ('kapa-po-meri',      'Bela-črna',    'White-black', 'KPM-BCR', 2400, 120, 2),
  ('trak-po-meri',      'Ena velikost', 'One size',    'TRM-1',   1200,  30, 1)
) x(slug, sl, en, sku, cena, teza, n) on x.slug = i.slug
where not exists (select 1 from trgovina.razlicice r where r.izdelek_id = i.id);

-- Cone: začasne fotografije in koti (Task 3 jih zamenja; 1600×1600 px), mere
-- tiska v mm so prave. Kozarec in vrč: vidna sprednja ploskev ovoja; podstavek
-- Ø95 (×6 na listu ob izvozu); plakat po različici (barva = "A3"/"A2").
insert into trgovina.cone (izdelek_id, kljuc, barva, slika, koti, sirina_mm, visina_mm)
select i.id, c.kljuc, c.barva, c.slika, c.koti::jsonb, c.s, c.v
from trgovina.izdelki i
join (values
  ('kozarec-po-meri',   'ovoj',      null,        '/nosilci/kozarec.webp',        '[[565,500],[1035,500],[1035,1100],[565,1100]]', 70, 90),
  ('vrc-po-meri',       'ovoj',      null,        '/nosilci/vrc.webp',            '[[500,560],[1100,560],[1100,1040],[500,1040]]', 200, 90),
  ('podstavki-po-meri', 'podstavek', null,        '/nosilci/podstavki.webp',      '[[500,500],[1100,500],[1100,1100],[500,1100]]', 95, 95),
  ('odpirac-po-meri',   'rocaj',     null,        '/nosilci/odpirac.webp',        '[[500,740],[1100,740],[1100,920],[500,920]]', 50, 15),
  ('plakat-po-meri',    'plakat',    'A3',        '/nosilci/plakat-a3.webp',      '[[517,300],[1083,300],[1083,1100],[517,1100]]', 297, 420),
  ('plakat-po-meri',    'plakat',    'A2',        '/nosilci/plakat-a2.webp',      '[[517,300],[1083,300],[1083,1100],[517,1100]]', 420, 594),
  ('kartica-igralca',   'kartica',   null,        '/nosilci/kartica.webp',        '[[536,350],[1064,350],[1064,1100],[536,1100]]', 148, 210),
  ('zastavica-po-meri', 'zastavica', null,        '/nosilci/zastavica.webp',      '[[600,300],[1000,300],[1000,900],[600,900]]', 300, 450),
  ('sal-po-meri',       'sal',       null,        '/nosilci/sal.webp',            '[[100,700],[1500,700],[1500,880],[100,880]]', 1400, 180),
  ('kapa-po-meri',      'spredaj',   'Črna',      '/nosilci/kapa-crna.webp',      '[[600,600],[1000,600],[1000,800],[600,800]]', 100, 50),
  ('kapa-po-meri',      'spredaj',   'Bela-črna', '/nosilci/kapa-bela-crna.webp', '[[600,600],[1000,600],[1000,800],[600,800]]', 100, 50),
  ('trak-po-meri',      'trak',      null,        '/nosilci/trak.webp',           '[[400,700],[1200,700],[1200,913],[400,913]]', 300, 80)
) c(slug, kljuc, barva, slika, koti, s, v) on c.slug = i.slug
on conflict do nothing;

-- --------------------------------------------------------------------------
-- Motivi (neaktivni; primeri so izmišljeni)
-- --------------------------------------------------------------------------
insert into trgovina.motivi (slug, ime_sl, ime_en, opis_sl, opis_en, cona, polja, sheme, primeri, vrstni_red) values
('tretji-polcas', 'Tretji polčas', 'Third Half',
 'Ime in slogan, vgravirana v steklo. Tekma ima dva polčasa, prava ekipa pa tri.',
 'A name and a slogan engraved into the glass. A match has two halves, a proper team has three.',
 'ovoj',
 '[{"kljuc":"ime","vrsta":"besedilo","oznaka_sl":"Ime","oznaka_en":"Name","max":12,"obvezno":true,"privzeto":"NOVAK"},
   {"kljuc":"slogan","vrsta":"izbira","oznaka_sl":"Slogan","oznaka_en":"Slogan","obvezno":true,"privzeto":"Tretji polčas",
    "moznosti":["Tretji polčas","Samo še eno","Trener je rekel ena","Third half","Just one more","Coach said one"]}]',
 '[{"kljuc":"gravura","ime_sl":"Gravura","ime_en":"Engraving","barve":["#FFFFFF"]}]',
 '[{"polja":{"ime":"NOVAK","slogan":"Tretji polčas"},"shema":"gravura","izdelek":"kozarec-po-meri","barva":"0,5 l"},
   {"polja":{"ime":"KOVAČ","slogan":"Samo še eno"},"shema":"gravura","izdelek":"vrc-po-meri","barva":"0,5 l"},
   {"polja":{"ime":"ZUPAN","slogan":"Trener je rekel ena"},"shema":"gravura","izdelek":"kozarec-po-meri","barva":"0,5 l"},
   {"polja":{"ime":"HORVAT","slogan":"Just one more"},"shema":"gravura","izdelek":"vrc-po-meri","barva":"0,5 l"}]',
 110),
('ekipni-kozarec', 'Ekipni kozarec', 'Team Glass',
 'Ime tvoje ekipe in leto ustanovitve, kot na grbu starega kluba. Za vitrino ali za vsako nedeljo.',
 'Your team name and the year it was founded, like the crest of an old club. For the cabinet or for every Sunday.',
 'ovoj',
 '[{"kljuc":"ekipa","vrsta":"ekipa","oznaka_sl":"Tvoja ekipa","oznaka_en":"Your team","max":24,"obvezno":true},
   {"kljuc":"leto","vrsta":"leto","oznaka_sl":"Ustanovljeno","oznaka_en":"Founded","obvezno":false,"privzeto":2019}]',
 '[{"kljuc":"gravura","ime_sl":"Gravura","ime_en":"Engraving","barve":["#FFFFFF"]}]',
 '[{"polja":{"ekipa":"FC Ponedeljek Zjutraj","leto":2019},"shema":"gravura","izdelek":"kozarec-po-meri","barva":"0,5 l"},
   {"polja":{"ekipa":"Dinamo Kavč","leto":2021},"shema":"gravura","izdelek":"vrc-po-meri","barva":"0,5 l"},
   {"polja":{"ekipa":"Atletico Golaž"},"shema":"gravura","izdelek":"kozarec-po-meri","barva":"0,5 l"}]',
 120),
('kafanski-komplet', 'Kafanski komplet', 'Pub Set',
 'Šest podstavkov z imenom ekipe in šestimi slogani, za vsako rundo svoj. Kdor dobi "Rundo plača kapetan", ve, kaj sledi.',
 'Six mats with your team name and six slogans, one for every round. Whoever gets "Captain buys the round" knows what comes next.',
 'podstavek',
 '[{"kljuc":"ekipa","vrsta":"ekipa","oznaka_sl":"Tvoja ekipa","oznaka_en":"Your team","max":24,"obvezno":true},
   {"kljuc":"slogan1","vrsta":"izbira","oznaka_sl":"Slogan 1","oznaka_en":"Slogan 1","obvezno":true,"privzeto":"Tretji polčas","moznosti":["Tretji polčas","Samo še eno","Trener je rekel ena","Rundo plača kapetan","Ofsajd je bil","Na pivu smo prvi","Podaljšek v gostilni","Nedelja ob desetih","Third half","Captain buys the round"]},
   {"kljuc":"slogan2","vrsta":"izbira","oznaka_sl":"Slogan 2","oznaka_en":"Slogan 2","obvezno":true,"privzeto":"Samo še eno","moznosti":["Tretji polčas","Samo še eno","Trener je rekel ena","Rundo plača kapetan","Ofsajd je bil","Na pivu smo prvi","Podaljšek v gostilni","Nedelja ob desetih","Third half","Captain buys the round"]},
   {"kljuc":"slogan3","vrsta":"izbira","oznaka_sl":"Slogan 3","oznaka_en":"Slogan 3","obvezno":true,"privzeto":"Trener je rekel ena","moznosti":["Tretji polčas","Samo še eno","Trener je rekel ena","Rundo plača kapetan","Ofsajd je bil","Na pivu smo prvi","Podaljšek v gostilni","Nedelja ob desetih","Third half","Captain buys the round"]},
   {"kljuc":"slogan4","vrsta":"izbira","oznaka_sl":"Slogan 4","oznaka_en":"Slogan 4","obvezno":true,"privzeto":"Rundo plača kapetan","moznosti":["Tretji polčas","Samo še eno","Trener je rekel ena","Rundo plača kapetan","Ofsajd je bil","Na pivu smo prvi","Podaljšek v gostilni","Nedelja ob desetih","Third half","Captain buys the round"]},
   {"kljuc":"slogan5","vrsta":"izbira","oznaka_sl":"Slogan 5","oznaka_en":"Slogan 5","obvezno":true,"privzeto":"Ofsajd je bil","moznosti":["Tretji polčas","Samo še eno","Trener je rekel ena","Rundo plača kapetan","Ofsajd je bil","Na pivu smo prvi","Podaljšek v gostilni","Nedelja ob desetih","Third half","Captain buys the round"]},
   {"kljuc":"slogan6","vrsta":"izbira","oznaka_sl":"Slogan 6","oznaka_en":"Slogan 6","obvezno":true,"privzeto":"Na pivu smo prvi","moznosti":["Tretji polčas","Samo še eno","Trener je rekel ena","Rundo plača kapetan","Ofsajd je bil","Na pivu smo prvi","Podaljšek v gostilni","Nedelja ob desetih","Third half","Captain buys the round"]}]',
 '[{"kljuc":"klasika","ime_sl":"Klasika zelena-bela","ime_en":"Classic green and white","barve":["#1E8C45","#F4F4F0","#0B3B1E"]},
   {"kljuc":"pivska","ime_sl":"Pivska jantarna","ime_en":"Lager amber","barve":["#E8A317","#FFF4D6","#5A3A0A"]},
   {"kljuc":"nocna","ime_sl":"Nočna črna-zlata","ime_en":"Night black and gold","barve":["#D4A62A","#1A1A1A","#F3E3B0"]}]',
 '[{"polja":{"ekipa":"FC Ponedeljek Zjutraj","slogan1":"Tretji polčas","slogan2":"Samo še eno","slogan3":"Trener je rekel ena","slogan4":"Rundo plača kapetan","slogan5":"Ofsajd je bil","slogan6":"Na pivu smo prvi"},"shema":"pivska","izdelek":"podstavki-po-meri","barva":"Komplet 6"},
   {"polja":{"ekipa":"Dinamo Kavč","slogan1":"Nedelja ob desetih","slogan2":"Podaljšek v gostilni","slogan3":"Samo še eno","slogan4":"Tretji polčas","slogan5":"Rundo plača kapetan","slogan6":"Ofsajd je bil"},"shema":"klasika","izdelek":"podstavki-po-meri","barva":"Komplet 6"},
   {"polja":{"ekipa":"Sporting Čevapčiči","slogan1":"Third half","slogan2":"Captain buys the round","slogan3":"Samo še eno","slogan4":"Na pivu smo prvi","slogan5":"Nedelja ob desetih","slogan6":"Tretji polčas"},"shema":"nocna","izdelek":"podstavki-po-meri","barva":"Komplet 6"}]',
 130),
('ime-in-stevilka', 'Ime in številka', 'Name and Number',
 'Ime in številka z dresa, vgravirana v odpirač. Da se po tekmi ve, čigav je.',
 'The name and number off your shirt, engraved on the opener. So after the match everyone knows whose it is.',
 'rocaj',
 '[{"kljuc":"ime","vrsta":"besedilo","oznaka_sl":"Ime","oznaka_en":"Name","max":10,"obvezno":true,"privzeto":"MLAKAR"},
   {"kljuc":"stevilka","vrsta":"stevilka","oznaka_sl":"Številka","oznaka_en":"Number","obvezno":true,"privzeto":5}]',
 '[{"kljuc":"gravura","ime_sl":"Gravura","ime_en":"Engraving","barve":["#1A1A1A"]}]',
 '[{"polja":{"ime":"MLAKAR","stevilka":5},"shema":"gravura","izdelek":"odpirac-po-meri","barva":"Ena velikost"},
   {"polja":{"ime":"KOS","stevilka":1},"shema":"gravura","izdelek":"odpirac-po-meri","barva":"Ena velikost"},
   {"polja":{"ime":"BIZJAK","stevilka":23},"shema":"gravura","izdelek":"odpirac-po-meri","barva":"Ena velikost"}]',
 140),
('moja-postava', 'Moja postava', 'My Line-up',
 'Tvoja fantasy postava iz zadnjega kroga kot plakat: formacija, enajsterica s točkami, kapetan in klop. Postavo vzamemo iz igre sami, ob nakupu.',
 'Your fantasy line-up from the last round as a poster: formation, the starting XI with points, the captain and the bench. We take it from the game ourselves when you order.',
 'plakat',
 '[{"kljuc":"postava","vrsta":"postava","oznaka_sl":"Tvoja ekipa","oznaka_en":"Your team","obvezno":true}]',
 '[{"kljuc":"igrisce","ime_sl":"Igrišče zelena","ime_en":"Pitch green","barve":["#2E9E4F","#E9F6EC","#0B3B1E"]},
   {"kljuc":"nocna","ime_sl":"Nočna črna-zlata","ime_en":"Night black and gold","barve":["#D4A62A","#1A1A1A","#F3E3B0"]},
   {"kljuc":"retro","ime_sl":"Retro rdeča-krem","ime_en":"Retro red and cream","barve":["#C8102E","#F5EBD7","#3A0A0F"]}]',
 '[]',
 150),
('retro-plakat-tekme', 'Retro plakat tekme', 'Retro Match Poster',
 'Plakat kot iz sedemdesetih: domači, gostje, rezultat, datum in igrišče. Za derbi, ki se ga bo vas spominjala.',
 'A poster like from the seventies: home, away, the score, the date and the ground. For the derby the whole village will remember.',
 'plakat',
 '[{"kljuc":"domaci","vrsta":"besedilo","oznaka_sl":"Domači","oznaka_en":"Home","max":20,"obvezno":true,"privzeto":"NK Zgornja Vas"},
   {"kljuc":"gostje","vrsta":"besedilo","oznaka_sl":"Gostje","oznaka_en":"Away","max":20,"obvezno":true,"privzeto":"ŠD Spodnji Konec"},
   {"kljuc":"goli_domaci","vrsta":"stevilka","oznaka_sl":"Goli domačih","oznaka_en":"Home goals","obvezno":true,"privzeto":3},
   {"kljuc":"goli_gostje","vrsta":"stevilka","oznaka_sl":"Goli gostov","oznaka_en":"Away goals","obvezno":true,"privzeto":2},
   {"kljuc":"datum","vrsta":"datum","oznaka_sl":"Datum","oznaka_en":"Date","obvezno":true,"privzeto":"2026-05-17"},
   {"kljuc":"igrisce","vrsta":"besedilo","oznaka_sl":"Igrišče","oznaka_en":"Ground","max":24,"obvezno":false,"privzeto":"Igrišče za gasilskim"}]',
 '[{"kljuc":"retro","ime_sl":"Retro rdeča-krem","ime_en":"Retro red and cream","barve":["#C8102E","#F5EBD7","#3A0A0F"]},
   {"kljuc":"modra","ime_sl":"Modra kri","ime_en":"True blue","barve":["#1F5FBF","#E8EEF8","#0C2350"]},
   {"kljuc":"zlata-doba","ime_sl":"Zlata doba","ime_en":"Golden era","barve":["#C9962B","#F5E6C4","#4A3410"]}]',
 '[{"polja":{"domaci":"NK Zgornja Vas","gostje":"ŠD Spodnji Konec","goli_domaci":3,"goli_gostje":2,"datum":"2026-05-17","igrisce":"Igrišče za gasilskim"},"shema":"retro","izdelek":"plakat-po-meri","barva":"A3"},
   {"polja":{"domaci":"Bife Rumeni Karton","gostje":"Bar Offside","goli_domaci":1,"goli_gostje":1,"datum":"2025-09-07"},"shema":"modra","izdelek":"plakat-po-meri","barva":"A2"},
   {"polja":{"domaci":"FC Ponedeljek","gostje":"Dinamo Kavč","goli_domaci":5,"goli_gostje":4,"datum":"2024-06-02","igrisce":"Pod lipo"},"shema":"zlata-doba","izdelek":"plakat-po-meri","barva":"A3"}]',
 160),
('kartica-legende', 'Kartica legende', 'Legend Card',
 'Kartica kot iz zbirke sličic: ime, pozicija, klub in štiri ocene od 1 do 99. Ocene določiš sam — za nedeljsko ligo je 99 za hitrost čisto realno.',
 'A card like from a sticker album: name, position, club and four ratings from 1 to 99. You set the ratings — 99 pace is perfectly realistic in a Sunday league.',
 'kartica',
 '[{"kljuc":"ime","vrsta":"besedilo","oznaka_sl":"Ime","oznaka_en":"Name","max":16,"obvezno":true,"privzeto":"KRAJNC"},
   {"kljuc":"pozicija","vrsta":"izbira","oznaka_sl":"Pozicija","oznaka_en":"Position","obvezno":true,"privzeto":"MID","moznosti":["GK","DEF","MID","FWD"]},
   {"kljuc":"klub","vrsta":"besedilo","oznaka_sl":"Klub","oznaka_en":"Club","max":20,"obvezno":false,"privzeto":"NK Zgornja Vas"},
   {"kljuc":"hitrost","vrsta":"stevilka","min":1,"oznaka_sl":"Hitrost","oznaka_en":"Pace","obvezno":true,"privzeto":88},
   {"kljuc":"strel","vrsta":"stevilka","min":1,"oznaka_sl":"Strel","oznaka_en":"Shooting","obvezno":true,"privzeto":91},
   {"kljuc":"podaje","vrsta":"stevilka","min":1,"oznaka_sl":"Podaje","oznaka_en":"Passing","obvezno":true,"privzeto":79},
   {"kljuc":"obramba","vrsta":"stevilka","min":1,"oznaka_sl":"Obramba","oznaka_en":"Defending","obvezno":true,"privzeto":45}]',
 '[{"kljuc":"zlata","ime_sl":"Zlata","ime_en":"Gold","barve":["#D4A62A","#FFF3C4","#4A3410"]},
   {"kljuc":"srebrna","ime_sl":"Srebrna","ime_en":"Silver","barve":["#A7AFB8","#F2F4F6","#2F3640"]},
   {"kljuc":"bronasta","ime_sl":"Bronasta","ime_en":"Bronze","barve":["#B8733A","#F6E2CF","#3F2410"]}]',
 '[{"polja":{"ime":"KRAJNC","pozicija":"MID","klub":"NK Zgornja Vas","hitrost":88,"strel":91,"podaje":79,"obramba":45},"shema":"zlata","izdelek":"kartica-igralca","barva":"A5"},
   {"polja":{"ime":"VIDMAR","pozicija":"DEF","klub":"Bar Offside","hitrost":52,"strel":40,"podaje":71,"obramba":97},"shema":"srebrna","izdelek":"kartica-igralca","barva":"A5"},
   {"polja":{"ime":"KOS","pozicija":"GK","hitrost":33,"strel":12,"podaje":64,"obramba":90},"shema":"bronasta","izdelek":"kartica-igralca","barva":"A5"},
   {"polja":{"ime":"TURBO POTOČNIK","pozicija":"FWD","klub":"Dinamo Kavč","hitrost":99,"strel":84,"podaje":58,"obramba":21},"shema":"zlata","izdelek":"kartica-igralca","barva":"A5"}]',
 170),
('klubska-zastavica', 'Klubska zastavica', 'Club Pennant',
 'Zastavica z imenom ekipe in letom ustanovitve. Kapetana si jih izmenjata pred tekmo, tvoja pa visi v garderobi.',
 'A pennant with your team name and the year it was founded. Captains swap them before kick-off; yours hangs in the dressing room.',
 'zastavica',
 '[{"kljuc":"ekipa","vrsta":"ekipa","oznaka_sl":"Tvoja ekipa","oznaka_en":"Your team","max":24,"obvezno":true},
   {"kljuc":"leto","vrsta":"leto","oznaka_sl":"Ustanovljeno","oznaka_en":"Founded","obvezno":false,"privzeto":2019}]',
 '[{"kljuc":"klasika","ime_sl":"Klasika zelena-bela","ime_en":"Classic green and white","barve":["#1E8C45","#F4F4F0","#0B3B1E"]},
   {"kljuc":"retro","ime_sl":"Retro rdeča-rumena","ime_en":"Retro red and yellow","barve":["#C8102E","#F6C700","#3A0A0F"]},
   {"kljuc":"modra","ime_sl":"Modra kri","ime_en":"True blue","barve":["#1F5FBF","#E8EEF8","#0C2350"]}]',
 '[{"polja":{"ekipa":"FC Ponedeljek Zjutraj","leto":2019},"shema":"klasika","izdelek":"zastavica-po-meri","barva":"Ena velikost"},
   {"polja":{"ekipa":"Atletico Golaž","leto":2022},"shema":"retro","izdelek":"zastavica-po-meri","barva":"Ena velikost"},
   {"polja":{"ekipa":"Dinamo Kavč"},"shema":"modra","izdelek":"zastavica-po-meri","barva":"Ena velikost"}]',
 180),
('navijaski-sal', 'Navijaški šal', 'Supporters'' Scarf',
 'Satenast šal z imenom ekipe na obeh koncih in sloganom na sredini. Za tribuno, ki je včasih le klop ob igrišču.',
 'A satin scarf with your team name on both ends and a slogan in the middle. For the stand, even when the stand is a bench by the pitch.',
 'sal',
 '[{"kljuc":"ekipa","vrsta":"ekipa","oznaka_sl":"Tvoja ekipa","oznaka_en":"Your team","max":24,"obvezno":true},
   {"kljuc":"slogan","vrsta":"izbira","oznaka_sl":"Slogan","oznaka_en":"Slogan","obvezno":true,"privzeto":"Do konca!",
    "moznosti":["Do konca!","Naprej naši!","Nedelja je naša","Srce na igrišču","Vedno zraven","Till the end!","Sunday is ours"]}]',
 '[{"kljuc":"klasika","ime_sl":"Klasika zelena-bela","ime_en":"Classic green and white","barve":["#1E8C45","#F4F4F0","#0B3B1E"]},
   {"kljuc":"kafanska","ime_sl":"Kafanska bordo","ime_en":"Pub burgundy","barve":["#8E1B3A","#F1D9B5","#2E0712"]},
   {"kljuc":"modra","ime_sl":"Modra kri","ime_en":"True blue","barve":["#1F5FBF","#E8EEF8","#0C2350"]}]',
 '[{"polja":{"ekipa":"FC Ponedeljek Zjutraj","slogan":"Do konca!"},"shema":"klasika","izdelek":"sal-po-meri","barva":"Ena velikost"},
   {"polja":{"ekipa":"Sporting Čevapčiči","slogan":"Nedelja je naša"},"shema":"kafanska","izdelek":"sal-po-meri","barva":"Ena velikost"},
   {"polja":{"ekipa":"Dinamo Kavč","slogan":"Till the end!"},"shema":"modra","izdelek":"sal-po-meri","barva":"Ena velikost"}]',
 190),
('vezena-ekipa', 'Vezena ekipa', 'Embroidered Team',
 'Kratko ime ekipe in številka, vezena na kapo. Do dvanajst znakov, ker vezenje ne prenese romanov.',
 'A short team name and a number embroidered on the cap. Up to twelve characters, because embroidery does not do novels.',
 'spredaj',
 '[{"kljuc":"ime","vrsta":"besedilo","oznaka_sl":"Ime ekipe","oznaka_en":"Team name","max":12,"obvezno":true,"privzeto":"DINAMO KAVČ"},
   {"kljuc":"stevilka","vrsta":"stevilka","oznaka_sl":"Številka","oznaka_en":"Number","obvezno":false,"privzeto":10}]',
 '[{"kljuc":"bela-zlata","ime_sl":"Bela-zlata","ime_en":"White and gold","barve":["#FFFFFF","#D4A62A"]},
   {"kljuc":"zelena","ime_sl":"Igrišče zelena","ime_en":"Pitch green","barve":["#2E9E4F","#FFFFFF"]},
   {"kljuc":"rdeca","ime_sl":"Rdeča-bela","ime_en":"Red and white","barve":["#C8102E","#FFFFFF"]}]',
 '[{"polja":{"ime":"DINAMO KAVČ","stevilka":10},"shema":"bela-zlata","izdelek":"kapa-po-meri","barva":"Črna"},
   {"polja":{"ime":"FC GOLAŽ"},"shema":"zelena","izdelek":"kapa-po-meri","barva":"Bela-črna"},
   {"polja":{"ime":"REAL BIFE","stevilka":7},"shema":"rdeca","izdelek":"kapa-po-meri","barva":"Črna"}]',
 200),
('kapetanski-trak', 'Kapetanski trak', 'Captain''s Armband',
 'Trak z velikim "C" in imenom. Za tistega, ki kliče sodnika po imenu in zadnji zapusti igrišče.',
 'An armband with a big "C" and a name. For the one who knows the referee by name and is last to leave the pitch.',
 'trak',
 '[{"kljuc":"ime","vrsta":"besedilo","oznaka_sl":"Ime","oznaka_en":"Name","max":12,"obvezno":true,"privzeto":"MLAKAR"}]',
 '[{"kljuc":"kapetanska","ime_sl":"Kapetanska modra-rumena","ime_en":"Skipper blue and yellow","barve":["#1D4ED8","#FACC15","#0A1A4A"]},
   {"kljuc":"klasika","ime_sl":"Klasika zelena-bela","ime_en":"Classic green and white","barve":["#1E8C45","#F4F4F0","#0B3B1E"]},
   {"kljuc":"nocna","ime_sl":"Nočna črna-zlata","ime_en":"Night black and gold","barve":["#D4A62A","#1A1A1A","#F3E3B0"]}]',
 '[{"polja":{"ime":"MLAKAR"},"shema":"kapetanska","izdelek":"trak-po-meri","barva":"Ena velikost"},
   {"polja":{"ime":"GOLOB"},"shema":"klasika","izdelek":"trak-po-meri","barva":"Ena velikost"},
   {"polja":{"ime":"ŽAGAR"},"shema":"nocna","izdelek":"trak-po-meri","barva":"Ena velikost"}]',
 210)
on conflict (slug) do nothing;

-- Izmišljene postave za vitrino plakata (ekipe, igralci in klubi niso resnični).
update trgovina.motivi set primeri = '[{"polja":{"postava":{"ekipa":"FC Ponedeljek Zjutraj","liga":"Liga Gorjanci","sezona":"2026/27","krog":9,"formacija":"4-4-2","tocke":63,"zacetni":[{"ime":"Tine Kos","priimek":"Kos","pozicija":"GK","klub":"Brdo","tocke":6,"kapetan":false,"podkapetan":false},{"ime":"Rok Zupan","priimek":"Zupan","pozicija":"DEF","klub":"Lipa","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Gal Mlakar","priimek":"Mlakar","pozicija":"DEF","klub":"Brdo","tocke":7,"kapetan":false,"podkapetan":false},{"ime":"Nik Rozman","priimek":"Rozman","pozicija":"DEF","klub":"Vrba","tocke":1,"kapetan":false,"podkapetan":false},{"ime":"Jure Golob","priimek":"Golob","pozicija":"DEF","klub":"Lipa","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Mark Kralj","priimek":"Kralj","pozicija":"MID","klub":"Podgorje","tocke":3,"kapetan":false,"podkapetan":false},{"ime":"Žan Turk","priimek":"Turk","pozicija":"MID","klub":"Brdo","tocke":12,"kapetan":true,"podkapetan":false},{"ime":"Ožbej Vidic","priimek":"Vidic","pozicija":"MID","klub":"Vrba","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Matic Bizjak","priimek":"Bizjak","pozicija":"MID","klub":"Lipa","tocke":5,"kapetan":false,"podkapetan":false},{"ime":"Blaž Hribar","priimek":"Hribar","pozicija":"FWD","klub":"Podgorje","tocke":9,"kapetan":false,"podkapetan":true},{"ime":"Anže Kokalj","priimek":"Kokalj","pozicija":"FWD","klub":"Vrba","tocke":2,"kapetan":false,"podkapetan":false}],"klop":[{"ime":"Lan Pirc","priimek":"Pirc","pozicija":"GK","klub":"Vrba","tocke":0,"kapetan":false,"podkapetan":false},{"ime":"Tim Leban","priimek":"Leban","pozicija":"DEF","klub":"Podgorje","tocke":1,"kapetan":false,"podkapetan":false},{"ime":"Vid Kern","priimek":"Kern","pozicija":"MID","klub":"Brdo","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Bor Jereb","priimek":"Jereb","pozicija":"FWD","klub":"Lipa","tocke":0,"kapetan":false,"podkapetan":false}]}},"shema":"igrisce","izdelek":"plakat-po-meri","barva":"A3"},
    {"polja":{"postava":{"ekipa":"Dinamo Kavč","liga":"Liga Gorjanci","sezona":"2026/27","krog":14,"formacija":"3-5-2","tocke":57,"zacetni":[{"ime":"Aljaž Rupnik","priimek":"Rupnik","pozicija":"GK","klub":"Lipa","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Gašper Košir","priimek":"Košir","pozicija":"DEF","klub":"Vrba","tocke":6,"kapetan":false,"podkapetan":false},{"ime":"Urban Pečnik","priimek":"Pečnik","pozicija":"DEF","klub":"Brdo","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Filip Zorman","priimek":"Zorman","pozicija":"DEF","klub":"Podgorje","tocke":1,"kapetan":false,"podkapetan":false},{"ime":"Jaka Kavčič","priimek":"Kavčič","pozicija":"MID","klub":"Brdo","tocke":3,"kapetan":false,"podkapetan":false},{"ime":"Lovro Ferjan","priimek":"Ferjan","pozicija":"MID","klub":"Lipa","tocke":8,"kapetan":false,"podkapetan":true},{"ime":"Tadej Jamnik","priimek":"Jamnik","pozicija":"MID","klub":"Vrba","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Miha Primc","priimek":"Primc","pozicija":"MID","klub":"Podgorje","tocke":4,"kapetan":false,"podkapetan":false},{"ime":"Erik Bergant","priimek":"Bergant","pozicija":"MID","klub":"Brdo","tocke":1,"kapetan":false,"podkapetan":false},{"ime":"Aleks Kumer","priimek":"Kumer","pozicija":"FWD","klub":"Lipa","tocke":13,"kapetan":true,"podkapetan":false},{"ime":"Jan Vrhovnik","priimek":"Vrhovnik","pozicija":"FWD","klub":"Vrba","tocke":2,"kapetan":false,"podkapetan":false}],"klop":[{"ime":"Domen Kunc","priimek":"Kunc","pozicija":"GK","klub":"Brdo","tocke":0,"kapetan":false,"podkapetan":false},{"ime":"Val Grošelj","priimek":"Grošelj","pozicija":"DEF","klub":"Lipa","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Svit Pavlin","priimek":"Pavlin","pozicija":"MID","klub":"Vrba","tocke":1,"kapetan":false,"podkapetan":false},{"ime":"Izak Markič","priimek":"Markič","pozicija":"FWD","klub":"Podgorje","tocke":0,"kapetan":false,"podkapetan":false}]}},"shema":"nocna","izdelek":"plakat-po-meri","barva":"A2"},
    {"polja":{"postava":{"ekipa":"Atletico Golaž","liga":"Liga Gorjanci","sezona":"2026/27","krog":21,"formacija":"4-3-3","tocke":58,"zacetni":[{"ime":"Rene Petek","priimek":"Petek","pozicija":"GK","klub":"Podgorje","tocke":9,"kapetan":false,"podkapetan":true},{"ime":"Jon Dolenc","priimek":"Dolenc","pozicija":"DEF","klub":"Brdo","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Maks Žnidar","priimek":"Žnidar","pozicija":"DEF","klub":"Lipa","tocke":6,"kapetan":false,"podkapetan":false},{"ime":"Leon Sever","priimek":"Sever","pozicija":"DEF","klub":"Vrba","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Taj Debeljak","priimek":"Debeljak","pozicija":"DEF","klub":"Podgorje","tocke":1,"kapetan":false,"podkapetan":false},{"ime":"Kristjan Erjavec","priimek":"Erjavec","pozicija":"MID","klub":"Lipa","tocke":4,"kapetan":false,"podkapetan":false},{"ime":"Lenart Babnik","priimek":"Babnik","pozicija":"MID","klub":"Brdo","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Patrik Gorenc","priimek":"Gorenc","pozicija":"MID","klub":"Vrba","tocke":7,"kapetan":false,"podkapetan":false},{"ime":"Nejc Ribič","priimek":"Ribič","pozicija":"FWD","klub":"Brdo","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"David Kogovšek","priimek":"Kogovšek","pozicija":"FWD","klub":"Lipa","tocke":10,"kapetan":true,"podkapetan":false},{"ime":"Tilen Bajželj","priimek":"Bajželj","pozicija":"FWD","klub":"Podgorje","tocke":3,"kapetan":false,"podkapetan":false}],"klop":[{"ime":"Oskar Mrak","priimek":"Mrak","pozicija":"GK","klub":"Lipa","tocke":0,"kapetan":false,"podkapetan":false},{"ime":"Jošt Zakrajšek","priimek":"Zakrajšek","pozicija":"DEF","klub":"Vrba","tocke":1,"kapetan":false,"podkapetan":false},{"ime":"Sven Oblak","priimek":"Oblak","pozicija":"MID","klub":"Podgorje","tocke":2,"kapetan":false,"podkapetan":false},{"ime":"Emil Vovk","priimek":"Vovk","pozicija":"FWD","klub":"Brdo","tocke":1,"kapetan":false,"podkapetan":false}]}},"shema":"retro","izdelek":"plakat-po-meri","barva":"A3"}]'
 where slug = 'moja-postava' and primeri = '[]';

insert into trgovina.motivi_izdelki (motiv_id, izdelek_id, doplacilo)
select m.id, i.id, x.doplacilo
from (values
  ('tretji-polcas', 'kozarec-po-meri', 600), ('tretji-polcas', 'vrc-po-meri', 600),
  ('ekipni-kozarec', 'kozarec-po-meri', 600), ('ekipni-kozarec', 'vrc-po-meri', 600),
  ('kafanski-komplet', 'podstavki-po-meri', 0),
  ('ime-in-stevilka', 'odpirac-po-meri', 400),
  ('moja-postava', 'plakat-po-meri', 0),
  ('retro-plakat-tekme', 'plakat-po-meri', 0),
  ('kartica-legende', 'kartica-igralca', 0),
  ('klubska-zastavica', 'zastavica-po-meri', 0),
  ('navijaski-sal', 'sal-po-meri', 0),
  ('vezena-ekipa', 'kapa-po-meri', 600),
  ('kapetanski-trak', 'trak-po-meri', 0)
) x(motiv, izdelek, doplacilo)
join trgovina.motivi m on m.slug = x.motiv
join trgovina.izdelki i on i.slug = x.izdelek
on conflict do nothing;
