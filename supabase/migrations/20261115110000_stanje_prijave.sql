-- Klepet (HelpStack): ista napaka ni dvakrat prijavljena + stanje prijave (SLF-469).
--
-- 10. 11. je isti uporabnik v enem večeru petkrat prijavil istega igralca in
-- napisal "pisao sam vam 6 puta"; bot ni mogel povedati, ali je ekipa prijavo
-- že rešila. Zdaj:
--   - prijavi_napako ne zapiše podvojene prijave: odprta prijava iste vrste
--     za istega igralca (ali klub, če igralca ni) v zadnjih 7 dneh vrne
--     {ze_prijavljeno, prijavljeno, stanje};
--   - stanje_prijave(igralec, klub) bere zadnje prijave (največ 5): datum,
--     vrsta, stanje in javna opomba admina. Brez opisa, stika in številk.
-- Sicer prijavi_napako kot v 20261113101100.

create or replace function public.prijavi_napako(
  vrsta text,
  opis text,
  igralec text default null,
  klub text default null,
  liga text default null,
  pravilno text default null,
  kontakt text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_vrsta text := lower(btrim(coalesce(vrsta, '')));
  v_opis text := podpora_besedilo(opis, 1000);
  v_igralec text := podpora_besedilo(igralec, 120);
  v_klub text := podpora_besedilo(klub, 120);
  v_liga text := podpora_besedilo(liga, 120);
  v_pravilno text := podpora_besedilo(pravilno, 300);
  v_kontakt text := podpora_besedilo(kontakt, 254);
  v_liga_id bigint;
  v_igralec_id bigint;
  v_id bigint;
  v_povezava text;
  v_prijavljeno timestamptz;
begin
  if v_vrsta not in ('pozicija', 'manjka_igralec', 'rezultat', 'asistenca', 'cena', 'drugo') then
    v_vrsta := 'drugo';
  end if;
  if v_opis is null or length(v_opis) < 3 then
    return jsonb_build_object('zapisano', false,
      'sporocilo', 'Manjka opis napake: kaj je narobe, pri katerem igralcu ali tekmi.');
  end if;

  -- Ista prijava v zadnji uri (ponovljen klic ali isti človek dvakrat) ni nova.
  select p.id into v_id
    from prijave_napak p
   where p.created_at > now() - interval '1 hour'
     and p.vrsta = v_vrsta
     and lower(p.opis) = lower(v_opis)
     and coalesce(lower(p.igralec), '') = coalesce(lower(v_igralec), '')
   limit 1;
  if v_id is not null then
    return jsonb_build_object('zapisano', true, 'id', v_id, 'ze_prijavljeno', true,
      'sporocilo', 'Ta napaka je že prijavljena (št. ' || v_id || '). Ekipa jo preveri.');
  end if;

  -- Liga in igralec, če ju prepoznamo enoznačno (pomoč adminu in ujemanje podvojenih).
  if v_liga is not null then
    select c.id into v_liga_id
      from competitions c
     where c.id in (select podpora_lige(v_liga))
     order by c.active desc, c.sort_order nulls last
     limit 1;
  end if;
  if v_igralec is not null and length(v_igralec) >= 3 then
    select min(k.id) into v_igralec_id
      from podpora_kandidati(v_igralec, v_liga, 'liga') k
    having count(*) = 1;
  end if;

  -- Odprta prijava iste vrste za istega igralca (ali klub, če igralca ni) v
  -- 7 dneh: ne zapišemo nove, uporabniku povemo, da že čaka. Igralec je isti,
  -- če sta ID enaka ali je ime brez šumnikov enako (in klub, če ga poznamo
  -- pri obeh, ne nasprotuje).
  if v_igralec is not null or v_klub is not null then
    select p.id, p.created_at into v_id, v_prijavljeno
      from prijave_napak p
     where p.stanje = 'odprta'
       and p.vrsta = v_vrsta
       and p.created_at > now() - interval '7 days'
       and case
             when v_igralec is not null then
               (v_igralec_id is not null and p.id_igralca = v_igralec_id)
               or (podpora_brez_sumnikov(p.igralec) = podpora_brez_sumnikov(v_igralec)
                   and (v_klub is null or p.klub is null
                        or podpora_brez_sumnikov(p.klub) = podpora_brez_sumnikov(v_klub)))
             else p.igralec is null
               and podpora_brez_sumnikov(p.klub) = podpora_brez_sumnikov(v_klub)
           end
     order by p.created_at
     limit 1;
    if v_id is not null then
      return jsonb_build_object('zapisano', true, 'id', v_id, 'ze_prijavljeno', true,
        'prijavljeno', v_prijavljeno::date, 'stanje', 'odprta',
        'sporocilo', 'Ta napaka je že prijavljena (št. ' || v_id || ', ' || to_char(v_prijavljeno, 'DD. MM. YYYY')
          || ') in jo ekipa še preverja. Nove prijave ni treba pošiljati; stanje se vidi s stanje_prijave.');
    end if;
  end if;

  -- Meje: 5 na uro na isti stik, 40 na uro vseh skupaj (klepet je javen).
  if (v_kontakt is not null and (select count(*) from prijave_napak p
        where lower(p.kontakt) = lower(v_kontakt) and p.created_at > now() - interval '1 hour') >= 5)
     or (select count(*) from prijave_napak p where p.created_at > now() - interval '1 hour') >= 40 then
    return jsonb_build_object('zapisano', false, 'omejitev', true,
      'sporocilo', 'Trenutno je prijav preveč. Prosi uporabnika, naj poskusi čez eno uro ali piše na info@slff.eu.');
  end if;

  insert into prijave_napak (vrsta, opis, igralec, klub, liga, pravilno, kontakt, id_igralca, id_lige)
  values (v_vrsta, v_opis, v_igralec, v_klub, v_liga, v_pravilno, v_kontakt, v_igralec_id, v_liga_id)
  returning id into v_id;

  if v_vrsta in ('pozicija', 'asistenca') and v_igralec_id is not null then
    select 'https://slff.eu/player/' || pl.id || '?t=' || c.slug into v_povezava
      from players pl join competitions c on c.id = pl.competition_id
     where pl.id = v_igralec_id and pl.anonimiziran_at is null;
  end if;

  if v_povezava is not null then
    return jsonb_build_object('zapisano', true, 'id', v_id, 'povezava', v_povezava,
      'sporocilo', 'Prijava št. ' || v_id || ' je zapisana. Hitreje gre, če uporabnik popravek odda sam: '
        || 'prijavi se na slff.eu in na strani igralca odpre "Popravek podatkov" (' || v_povezava || '). '
        || 'Popravek igralca s potrjenim profilom pri istem klubu velja takoj, ostale preveri ekipa.');
  end if;
  return jsonb_build_object('zapisano', true, 'id', v_id,
    'sporocilo', 'Prijava št. ' || v_id || ' je zapisana. Ekipa jo preveri praviloma v nekaj dneh'
      || case when v_kontakt is null then '.' else ' in odgovori na naveden stik.' end);
end;
$$;

create or replace function public.stanje_prijave(igralec text default null, klub text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_igralec text := podpora_besedilo(igralec, 120);
  v_klub text := podpora_besedilo(klub, 120);
  v_igralec_id bigint;
  v_prijave jsonb;
begin
  if coalesce(length(v_igralec), 0) < 3 and coalesce(length(v_klub), 0) < 3 then
    return jsonb_build_object('najdenih', 0, 'prijave', '[]'::jsonb,
      'sporocilo', 'Povej ime igralca ali kluba, katerega prijavo iščeš.');
  end if;
  if length(v_igralec) >= 3 then
    select min(k.id) into v_igralec_id
      from podpora_kandidati(v_igralec, null, 'liga') k
    having count(*) = 1;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'datum', x.created_at::date,
           'vrsta', x.vrsta,
           'stanje', x.stanje,
           'opomba', x.opomba,
           'igralec', x.igralec,
           'klub', x.klub) order by x.created_at desc), '[]'::jsonb)
    into v_prijave
    from (
      select p.created_at, p.vrsta, p.stanje, p.opomba, p.igralec, p.klub
        from prijave_napak p
       where case
               when coalesce(length(v_igralec), 0) >= 3 then
                 (v_igralec_id is not null and p.id_igralca = v_igralec_id)
                 or (length(coalesce(p.igralec, '')) >= 3
                     and (podpora_ujema(p.igralec, v_igralec) or podpora_ujema(v_igralec, p.igralec)))
               else length(coalesce(p.klub, '')) >= 3
                 and (podpora_ujema(p.klub, v_klub) or podpora_ujema(v_klub, p.klub))
             end
         and (coalesce(length(v_igralec), 0) < 3 or coalesce(length(v_klub), 0) < 3 or p.klub is null
              or podpora_ujema(p.klub, v_klub) or podpora_ujema(v_klub, p.klub))
       order by p.created_at desc
       limit 5
    ) x;

  return jsonb_build_object('najdenih', jsonb_array_length(v_prijave), 'prijave', v_prijave,
    'sporocilo', case when jsonb_array_length(v_prijave) = 0
      then 'Prijave za to ni. Če je napaka še tam, jo prijavi s prijavi_napako.'
      else 'Stanje: odprta = ekipa še preverja, resena = popravljeno, zavrnjena = ni napaka (glej opombo).' end);
end;
$$;

revoke all on function public.stanje_prijave(text, text) from public;
grant execute on function public.stanje_prijave(text, text) to anon, authenticated;
