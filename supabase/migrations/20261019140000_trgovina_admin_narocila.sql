-- Trgovina: admin pregled vseh naročil in ročna stanja (v_izdelavi, dostavljeno).
--
-- Novi stanji: v_izdelavi (admin: plačano naročilo je v izdelavi/tisku) in
-- dostavljeno (admin: poslano naročilo je prispelo). Poslano še vedno nastavi le
-- trgovina_admin_poslano (sledilna številka + mail). Vsaka sprememba stanja gre v
-- trgovina.zgodovina_stanj (sprožilec; admin_id iz auth.uid(), opomba iz RPC).
-- Kjer so doslej veljala "plačana" stanja (placano, poslano), zdaj veljajo tudi
-- v_izdelavi in dostavljeno: tisk, vračilo, ponovljen webhook plačila, poslano.

alter table trgovina.narocila drop constraint if exists narocila_stanje_check;
alter table trgovina.narocila add constraint narocila_stanje_check
  check (stanje in ('caka_placilo', 'placano', 'v_izdelavi', 'poslano', 'dostavljeno', 'preklicano', 'vrnjeno', 'poteklo'));

create table trgovina.zgodovina_stanj (
  id          bigint generated always as identity primary key,
  narocilo_id bigint not null references trgovina.narocila on delete cascade,
  iz          text,
  v           text not null,
  admin_id    uuid references auth.users on delete set null,
  opomba      text,
  created_at  timestamptz not null default now()
);
create index on trgovina.zgodovina_stanj (narocilo_id, id);
alter table trgovina.zgodovina_stanj enable row level security;
revoke all on trgovina.zgodovina_stanj from public, anon, authenticated;

-- Opomba admina je lahko oseben zapis o kupcu: agentom zaprta.
insert into agent.zaprti_stolpci (tabela, stolpec, zakaj) values
  ('trgovina.zgodovina_stanj', 'opomba', 'opomba admina (lahko osebni podatki kupca)')
on conflict (tabela, stolpec) do nothing;

-- Opombo poda trgovina_admin_nastavi_stanje prek trgovina.opomba (lokalno v transakciji).
create function trgovina.zabelezi_stanje() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into trgovina.zgodovina_stanj (narocilo_id, iz, v, admin_id, opomba)
  values (new.id, old.stanje, new.stanje, auth.uid(), nullif(current_setting('trgovina.opomba', true), ''));
  return null;
end;
$$;
revoke all on function trgovina.zabelezi_stanje() from public, anon, authenticated;

create trigger zgodovina_stanj after update of stanje on trgovina.narocila
  for each row when (old.stanje is distinct from new.stanje)
  execute function trgovina.zabelezi_stanje();

-- Kar ob vračilu ali preklicu plačanega naročila ne sme več v izdelavo:
-- še neodposlana značka preklicana, nenatisnjene postavke iz tiska.
create function trgovina.sprosti_izdelavo(p_narocilo bigint, p_razlog text) returns void
language sql
as $$
  update public.narocila_znack z set status = 'preklicano', opomba = coalesce(z.opomba || ' · ', '') || p_razlog
    from trgovina.narocila n
   where n.id = p_narocilo and z.stripe_checkout_id = n.stripe_checkout_id and z.status in ('za_tisk', 'natisnjeno');
  update trgovina.postavke set stanje_tiska = null, serija_id = null
   where narocilo_id = p_narocilo and stanje_tiska in ('za_tisk', 'v_seriji');
$$;
revoke all on function trgovina.sprosti_izdelavo(bigint, text) from public, anon, authenticated;

-- Vračilo velja tudi za v_izdelavi, dostavljeno in preklicano plačano naročilo
-- (preklic ne vrne denarja; ko ga admin vrne v Stripe, je naročilo vrnjeno).
create or replace function trgovina.vracilo(p_payment_intent text) returns jsonb
language plpgsql
as $$
declare v trgovina.narocila;
begin
  select * into v from trgovina.narocila
   where stripe_payment_intent = p_payment_intent
     and stanje in ('placano', 'v_izdelavi', 'poslano', 'dostavljeno', 'preklicano', 'vrnjeno')
   for update;
  if not found or nullif(p_payment_intent, '') is null then
    return null;
  end if;
  if v.stanje <> 'vrnjeno' then
    update trgovina.narocila set stanje = 'vrnjeno' where id = v.id;
    perform trgovina.sprosti_izdelavo(v.id, 'vračilo trgovine');
  end if;
  return jsonb_build_object('oznaka', v.javna_oznaka,
    'promocije', coalesce((select jsonb_agg(b.stripe_promocija order by b.id) from trgovina.boni b where b.narocilo_id = v.id), '[]'::jsonb));
end;
$$;

-- Ponovljen webhook plačila za že plačano naročilo (tudi v_izdelavi,
-- dostavljeno ali pozneje preklicano/vrnjeno) vrne 'ze', ne lažnega 'neznano'
-- (webhook bi sicer na Discord javil "plačilo za poteklo naročilo").
-- Spremenjena je le veja 'ze'; ostalo kot v 20261018190000.
create or replace function trgovina.iz_placila(
  p_checkout text, p_payment_intent text, p_email text, p_ime text, p_naslov jsonb,
  p_postavke int, p_dostava int, p_ddv int, p_skupaj int, p_dostava_kljuc text, p_popust int default 0
) returns text
language plpgsql
as $$
declare
  v_narocilo trgovina.narocila;
  v_manjka int;
  v_koncano boolean;
  z record;
begin
  select * into v_narocilo from trgovina.narocila where stripe_checkout_id = p_checkout for update;
  if not found then
    return 'neznano';
  elsif v_narocilo.stanje in ('placano', 'v_izdelavi', 'poslano', 'dostavljeno')
        or (v_narocilo.stanje in ('preklicano', 'vrnjeno') and v_narocilo.placano_at is not null) then
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

  -- Same značke: trgovina nima kaj pakirati (značka gre po toku narocila_znack),
  -- naročilo je zato takoj poslano. Darilne bone zaključi bon_poslan.
  v_koncano := v_manjka = 0 and not exists (select 1 from trgovina.postavke p where p.narocilo_id = v_narocilo.id
                                              and p.personalizacija->>'vrsta' is distinct from 'znacka');
  update trgovina.narocila set
    stanje = case when v_koncano then 'poslano' else 'placano' end,
    poslano_at = case when v_koncano then now() end,
    placano_at = now(), stripe_payment_intent = p_payment_intent,
    email = p_email, ime = p_ime, naslov = p_naslov,
    znesek_postavke = p_postavke, znesek_dostava = p_dostava, znesek_ddv = p_ddv,
    znesek_skupaj = p_skupaj, dostava_kljuc = p_dostava_kljuc, manjka = v_manjka, odjemalec = null,
    znesek_popust = greatest(coalesce(p_popust, 0), 0)
   where id = v_narocilo.id;

  return case when v_manjka > 0 then 'premalo' else 'placano' end;
end;
$$;

-- Tisk vidi tudi naročila v izdelavi in dostavljena (stolpci kot v motivih).
create or replace view trgovina.tisk as
select p.id as postavka_id, p.serija_id, p.stanje_tiska, n.id as narocilo_id, n.javna_oznaka, n.placano_at,
       r.sku, p.ime, p.kolicina, p.personalizacija,
       r.oznaka_sl as razlicica, i.postopek,
       (select s -> 'barve' from trgovina.motivi m, jsonb_array_elements(m.sheme) s
         where m.slug = p.personalizacija ->> 'motiv' and s ->> 'kljuc' = p.personalizacija ->> 'shema') as barve,
       case when p.personalizacija ? 'motiv' then trgovina.cone_json(i.id) end as cone
  from trgovina.postavke p
  join trgovina.narocila n on n.id = p.narocilo_id
  join trgovina.razlicice r on r.id = p.razlicica_id
  join trgovina.izdelki i on i.id = r.izdelek_id
 where p.stanje_tiska is not null and n.stanje in ('placano', 'v_izdelavi', 'poslano', 'dostavljeno');
revoke all on trgovina.tisk from public, anon, authenticated;

-- Poslano tudi iz v_izdelavi (popravek sledilne še vedno na poslanem).
create or replace function public.trgovina_admin_poslano(p_narocilo bigint, p_sledilna text) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v trgovina.narocila;
begin
  perform trgovina.le_admin();
  if nullif(btrim(p_sledilna), '') is null then
    raise exception 'Trgovina: manjka sledilna številka.' using hint = 'trgovina-vnos';
  end if;
  update trgovina.narocila
     set stanje = 'poslano', sledilna = btrim(p_sledilna), poslano_at = coalesce(poslano_at, now())
   where id = p_narocilo and stanje in ('placano', 'v_izdelavi', 'poslano')
  returning * into v;
  if not found then
    raise exception 'Trgovina: naročilo ni plačano.' using hint = 'trgovina-stanje';
  end if;
  return jsonb_build_object('email', v.email, 'jezik', v.jezik, 'javna_oznaka', v.javna_oznaka,
                            'sledilna', v.sledilna, 'ime', v.ime);
end;
$$;

-- --------------------------------------------------------------------------
-- Admin: vsa naročila, podrobnosti z zgodovino, ročna sprememba stanja
-- --------------------------------------------------------------------------

-- Najnovejša najprej. stanja = število po stanju za isto iskanje (brez filtra
-- stanja), skupaj = zadetkov s filtrom. Iskanje po oznaki, e-pošti in imenu.
create function public.trgovina_admin_vsa_narocila(
  p_stanje text default null, p_iskanje text default null, p_od int default 0, p_koliko int default 50
) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare v_vzorec text;
begin
  perform trgovina.le_admin();
  if nullif(btrim(p_iskanje), '') is not null then
    v_vzorec := '%' || replace(replace(replace(btrim(p_iskanje), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return (
    with f as (
      select n.id, n.stanje, n.created_at from trgovina.narocila n
       where v_vzorec is null or n.javna_oznaka ilike v_vzorec or n.email ilike v_vzorec or n.ime ilike v_vzorec
    ), s as (
      select * from f where p_stanje is null or f.stanje = p_stanje
    )
    select jsonb_build_object(
      'skupaj', (select count(*) from s),
      'stanja', coalesce((select jsonb_object_agg(x.stanje, x.n) from (select f.stanje, count(*) as n from f group by f.stanje) x), '{}'::jsonb),
      'narocila', coalesce((select jsonb_agg(trgovina.narocilo_json(x.id) order by x.created_at desc, x.id desc)
                              from (select s.id, s.created_at from s order by s.created_at desc, s.id desc
                                     offset greatest(coalesce(p_od, 0), 0) limit least(greatest(coalesce(p_koliko, 50), 1), 200)) x),
                           '[]'::jsonb)));
end;
$$;

-- Podrobnosti: še Stripe (plačilo; seja cs_test_ = testni način) in zgodovina stanj.
create or replace function public.trgovina_admin_narocilo(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  perform trgovina.le_admin();
  return (select trgovina.narocilo_json(n.id) || jsonb_build_object(
            'stripe_payment_intent', n.stripe_payment_intent, 'stripe_checkout_id', n.stripe_checkout_id,
            'zgodovina', coalesce((
              select jsonb_agg(jsonb_build_object('iz', z.iz, 'v', z.v, 'admin_id', z.admin_id, 'admin', p.display_name,
                                                  'opomba', z.opomba, 'created_at', z.created_at) order by z.id)
                from trgovina.zgodovina_stanj z left join public.profiles p on p.id = z.admin_id
               where z.narocilo_id = n.id), '[]'::jsonb))
            from trgovina.narocila n where n.id = p_id);
end;
$$;

-- Dovoljeni ročni prehodi; poslano le prek trgovina_admin_poslano (sledilna, mail).
-- Preklic plačanega naročila denarja ne vrne: vrne vracilo_potrebno = true
-- (vračilo v Stripe, charge.refunded ga nato premakne v vrnjeno). Zaloge ne vrne
-- (kot vračilo): kos, ki ostane, admin doda v zavihku Izdelki.
create function public.trgovina_admin_nastavi_stanje(p_id bigint, p_stanje text, p_opomba text default null) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v trgovina.narocila;
  v_opomba text := nullif(btrim(p_opomba), '');
begin
  perform trgovina.le_admin();
  if length(v_opomba) > 500 then
    raise exception 'Trgovina: opomba je predolga (največ 500 znakov).' using hint = 'trgovina-vnos';
  end if;
  select * into v from trgovina.narocila where id = p_id for update;
  if not found then
    raise exception 'Trgovina: naročila ni.' using hint = 'trgovina-vnos';
  end if;
  if p_stanje = 'poslano' and v.stanje in ('placano', 'v_izdelavi') then
    raise exception 'Trgovina: poslano se nastavi z vnosom sledilne številke (pošlje tudi mail kupcu).'
      using hint = 'trgovina-sledilna';
  end if;
  if p_stanje is null
     or (v.stanje, p_stanje) not in (('placano', 'v_izdelavi'), ('v_izdelavi', 'placano'), ('poslano', 'dostavljeno'),
                                     ('caka_placilo', 'preklicano'), ('placano', 'preklicano'), ('v_izdelavi', 'preklicano')) then
    raise exception 'Trgovina: iz stanja % v % ni mogoče.', v.stanje, coalesce(p_stanje, '(prazno)')
      using hint = 'trgovina-prehod';
  end if;

  perform set_config('trgovina.opomba', coalesce(v_opomba, ''), true);
  update trgovina.narocila
     set stanje = p_stanje, odjemalec = case when p_stanje = 'preklicano' then null else odjemalec end
   where id = p_id;
  perform set_config('trgovina.opomba', '', true);
  if p_stanje = 'preklicano' then
    perform trgovina.sprosti_izdelavo(p_id, 'preklic trgovine');
  end if;
  return trgovina_admin_narocilo(p_id)
      || jsonb_build_object('vracilo_potrebno', p_stanje = 'preklicano' and v.stanje <> 'caka_placilo');
end;
$$;

revoke all on function public.trgovina_admin_vsa_narocila(text, text, int, int),
  public.trgovina_admin_nastavi_stanje(bigint, text, text) from public, anon;
grant execute on function public.trgovina_admin_vsa_narocila(text, text, int, int),
  public.trgovina_admin_nastavi_stanje(bigint, text, text) to authenticated;
