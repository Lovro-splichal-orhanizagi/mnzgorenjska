-- Posnetki izložbe v Cloudflare R2 (poleg Cloudflare Stream).
--
-- Lastnik Streama zdaj ne kupi (ni brezplačnega paketa); R2 je do 10 GB
-- brezplačen in brez stroškov prenosa. Ponudnik je stvar posnetka
-- (`ponudnik`), ne nastavitve: ob prehodu na Stream obstoječi posnetki v R2
-- ostanejo v R2 in se še naprej predvajajo. Funkcija `posnetki-igralca`
-- izbere ponudnika za NOVE posnetke (env POSNETKI_PONUDNIK).
--
-- R2: brskalnik video in sličico (plakat) naloži s kratkoživima
-- podpisanima PUT-oma (ključ, vrsta in velikost so podpisani), funkcija
-- potrdi z HEAD in posnetek gre v pregled kot doslej. Ogled: podpisan GET
-- (2 uri) naravnost na R2, le za posnetke, ki jih `posnetki_za_ogled`
-- dovoli (isto pravilo kot žetoni Streama). Brisanje gre skozi isto vrsto
-- `posnetki_brisanje` (zdaj z `ponudnik` in velikostjo).
--
-- Prostor: vsota bajtov posnetkov in sličic v R2 (tudi tistih, ki še čakajo
-- na izbris). Nad 9 GB se novo nalaganje ustavi (hint posnetki-prostor),
-- pri 8 GB gre enkrat obvestilo na Discord.

alter table public.posnetki_igralca
  add column ponudnik text not null default 'stream' check (ponudnik in ('stream', 'r2', 'test')),
  add column vrsta text check (vrsta is null or vrsta in ('video/mp4', 'video/quicktime', 'video/webm')),
  add column velikost bigint check (velikost is null or velikost between 1 and 104857600),
  add column velikost_slike bigint check (velikost_slike is null or velikost_slike between 1 and 1048576);
update public.posnetki_igralca set ponudnik = 'test' where stream_uid like 'test-%';
comment on column public.posnetki_igralca.ponudnik is
  'Kje je video: stream (Cloudflare Stream uid), r2 (ključa posnetki/<uid> in posnetki/<uid>-slika), test (preizkusni način).';

alter table public.posnetki_brisanje
  add column ponudnik text not null default 'stream' check (ponudnik in ('stream', 'r2', 'test')),
  add column velikost bigint not null default 0;
update public.posnetki_brisanje set ponudnik = 'test' where stream_uid like 'test-%';

-- Izbris vrstice → uid, ponudnik in velikost v vrsto brisanja.
create or replace function public.posnetki_ob_izbrisu()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into posnetki_brisanje (stream_uid, ponudnik, velikost)
  values (old.stream_uid, old.ponudnik, coalesce(old.velikost, 0) + coalesce(old.velikost_slike, 0))
  on conflict (stream_uid) do update set izbrisi_po = least(posnetki_brisanje.izbrisi_po, now());
  return null;
end;
$$;

-- --------------------------------------------------------------------------
-- Prostor v R2
-- --------------------------------------------------------------------------
-- Meji v bajtih (decimalno, kot cenik R2): ustavitev 9 GB, opozorilo 8 GB.
create or replace function public.posnetki_r2_meje()
returns table (meja bigint, opozorilo bigint)
language sql immutable
as $$ select 9000000000::bigint, 8000000000::bigint $$;

create or replace function public.posnetki_r2_prostor()
returns bigint language sql stable security definer set search_path = public
as $$
  select coalesce((select sum(coalesce(velikost, 0) + coalesce(velikost_slike, 0))
                     from posnetki_igralca where ponudnik = 'r2'), 0)::bigint
       + coalesce((select sum(velikost) from posnetki_brisanje where ponudnik = 'r2'), 0)::bigint
$$;

-- Obvestilo na Discord ob prvem prehodu čez 8 GB; pod 7,5 GB se ponastavi.
create or replace function public.posnetki_r2_opozorilo()
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_zasedeno bigint := posnetki_r2_prostor();
  v_meje record;
  v_url text;
begin
  select * into v_meje from posnetki_r2_meje();
  if v_zasedeno < 7500000000 then
    update settings set value = '0' where key = 'posnetki_r2_opozorjeno' and value <> '0';
    return;
  end if;
  if v_zasedeno < v_meje.opozorilo
     or coalesce((select value from settings where key = 'posnetki_r2_opozorjeno'), '0') = '1' then
    return;
  end if;
  insert into settings (key, value) values ('posnetki_r2_opozorjeno', '1')
  on conflict (key) do update set value = '1';
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'discord_webhook' limit 1;
    if v_url is not null then
      perform net.http_post(
        url := v_url,
        body := jsonb_build_object(
          'content', '⚠️ **Posnetki v R2: ' || round(v_zasedeno / 1e9, 2) || ' GB od 10 GB brezplačnih.** '
                     || 'Nad 9 GB se nalaganje ustavi. Čas za Stream ali čiščenje.' || E'\nhttps://slff.eu/admin#posnetki',
          'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb)),
        headers := '{"Content-Type": "application/json"}'::jsonb);
    end if;
  exception when others then
    null;
  end;
end;
$$;

insert into settings (key, value) values ('posnetki_r2_opozorjeno', '0') on conflict (key) do nothing;

-- --------------------------------------------------------------------------
-- Servis: rezervacija in potrditev nalaganja v R2, uid drugih ponudnikov
-- --------------------------------------------------------------------------

-- Ponudnik ob uid (stream, test). R2 nastavi posnetki_r2_rezerviraj.
drop function public.posnetki_nastavi_uid(bigint, text);
create function public.posnetki_nastavi_uid(p_id bigint, p_uid text, p_ponudnik text default 'stream')
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_ponudnik not in ('stream', 'test') then
    raise exception 'Neznan ponudnik.';
  end if;
  update posnetki_igralca set stream_uid = p_uid, ponudnik = p_ponudnik, updated_at = now()
   where id = p_id and stream_uid is null;
  if not found then
    raise exception 'Posnetek že ima uid ali ga ni.';
  end if;
end;
$$;

-- Rezervacija prostora pred podpisanim PUT. Prijavljena velikost je
-- podpisana (Content-Length), zato je ni mogoče preseči.
create or replace function public.posnetki_r2_rezerviraj(p_id bigint, p_uid text, p_vrsta text, p_velikost bigint,
                                                        p_velikost_slike bigint, p_trajanje numeric)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_meje record;
begin
  -- Vzporedna nalaganja po vrsti, da meja drži.
  perform pg_advisory_xact_lock(hashtext('posnetki_r2_prostor'));
  select * into v_meje from posnetki_r2_meje();
  if posnetki_r2_prostor() + coalesce(p_velikost, 0) + coalesce(p_velikost_slike, 0) > v_meje.meja then
    raise exception 'Nalaganje posnetkov je začasno ustavljeno.' using hint = 'posnetki-prostor';
  end if;
  update posnetki_igralca
     set stream_uid = p_uid, ponudnik = 'r2', vrsta = p_vrsta, velikost = p_velikost,
         velikost_slike = p_velikost_slike,
         trajanje = case when p_trajanje > 0 and p_trajanje <= 181 then round(p_trajanje, 1) end,
         updated_at = now()
   where id = p_id and stream_uid is null and stanje = 'nalaganje';
  if not found then
    raise exception 'Posnetek že ima uid ali ga ni.';
  end if;
end;
$$;

-- Potrditev po HEAD: dejanski velikosti, stanje pripravljen (gre v pregled,
-- Discord kot pri Streamu). Neujemanje funkcija zapiše kot napako.
create or replace function public.posnetki_r2_potrjen(p_uid text, p_velikost bigint, p_velikost_slike bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update posnetki_igralca
     set velikost = p_velikost, velikost_slike = p_velikost_slike,
         stanje = case when stanje = 'pripravljen' then stanje else 'pripravljen' end,
         updated_at = now()
   where stream_uid = p_uid and ponudnik = 'r2';
  if not found then
    raise exception 'Posnetka ni.';
  end if;
  perform posnetki_r2_opozorilo();
end;
$$;

-- Vrsta brisanja s ponudnikom (prej le uid).
drop function public.posnetki_za_brisanje(int);
create function public.posnetki_za_brisanje(p_najvec int default 50)
returns table (stream_uid text, ponudnik text)
language sql security definer set search_path = public
as $$
  select b.stream_uid, b.ponudnik from posnetki_brisanje b where b.izbrisi_po <= now()
   order by b.izbrisi_po limit least(greatest(p_najvec, 1), 200)
$$;

revoke all on function public.posnetki_nastavi_uid(bigint, text, text),
  public.posnetki_r2_rezerviraj(bigint, text, text, bigint, bigint, numeric),
  public.posnetki_r2_potrjen(text, bigint, bigint), public.posnetki_za_brisanje(int),
  public.posnetki_r2_prostor(), public.posnetki_r2_opozorilo()
  from public, anon, authenticated;
grant execute on function public.posnetki_nastavi_uid(bigint, text, text),
  public.posnetki_r2_rezerviraj(bigint, text, text, bigint, bigint, numeric),
  public.posnetki_r2_potrjen(text, bigint, bigint), public.posnetki_za_brisanje(int),
  public.posnetki_r2_prostor()
  to service_role;
revoke all on function public.posnetki_r2_meje() from public, anon, authenticated;
grant execute on function public.posnetki_r2_meje() to service_role;

-- --------------------------------------------------------------------------
-- Ogled (isto pravilo kot prej, zraven ponudnik in vrsta)
-- --------------------------------------------------------------------------
drop function public.posnetki_za_ogled(bigint[]);
create function public.posnetki_za_ogled(p_ids bigint[])
returns table (id bigint, stream_uid text, urejanje boolean, ponudnik text, vrsta text)
language sql stable security definer set search_path = public
as $$
  -- Pravilo enkrat na igralca (mladinsko preverjanje je najdražji del).
  with x as materialized (
    select * from posnetki_igralca where id = any (p_ids[1:12]) and stream_uid is not null
  ), o as materialized (
    select g.player_id, is_admin() as admin, je_lastnik_profila(g.player_id) as lastnik,
           izlozba_dovoljena(g.player_id) as dovoljena
      from (select distinct igralec as player_id from x) g
  )
  select x.id, x.stream_uid, o.admin or o.lastnik, x.ponudnik, x.vrsta
    from x join o on o.player_id = x.igralec
   where o.admin
      or o.lastnik
      or (o.dovoljena and x.stanje = 'pripravljen' and x.pregled = 'odobren')
$$;
revoke all on function public.posnetki_za_ogled(bigint[]) from public;
grant execute on function public.posnetki_za_ogled(bigint[]) to anon, authenticated;

drop function public.scout_posnetki(bigint);
create function public.scout_posnetki(p_player_id bigint)
returns table (id bigint, naslov text, izpostavljen boolean, trajanje numeric, stream_uid text, ponudnik text, vrsta text)
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  v_glavni bigint;
begin
  select * into d from scout.dostop('posnetki', p_player_id, '{}'::jsonb);
  if not exists (select 1 from scout.vidni(d.model_id, d.country_id) v where v.player_id = p_player_id) then
    return;
  end if;
  if not izlozba_dovoljena(p_player_id) then
    return;
  end if;
  select z.player_id into v_glavni from zahtevki_igralca z where z.id = prevzem_zahtevek_igralca(p_player_id);
  return query
  select x.id, x.naslov, x.izpostavljen, x.trajanje, x.stream_uid, x.ponudnik, x.vrsta
    from posnetki_igralca x
   where x.igralec = v_glavni and x.stanje = 'pripravljen' and x.pregled = 'odobren' and x.stream_uid is not null
   order by x.izpostavljen desc, x.vrstni_red, x.id;
end;
$$;
revoke all on function public.scout_posnetki(bigint) from public, anon;
grant execute on function public.scout_posnetki(bigint) to authenticated;

-- --------------------------------------------------------------------------
-- Admin: zasedenost R2
-- --------------------------------------------------------------------------
create or replace function public.admin_posnetki_prostor()
returns table (zasedeno bigint, opozorilo bigint, meja bigint, posnetkov int, za_brisanje int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  return query
  select posnetki_r2_prostor(), m.opozorilo, m.meja,
         (select count(*)::int from posnetki_igralca where ponudnik = 'r2'),
         (select count(*)::int from posnetki_brisanje where ponudnik = 'r2')
    from posnetki_r2_meje() m;
end;
$$;
revoke all on function public.admin_posnetki_prostor() from public, anon;
grant execute on function public.admin_posnetki_prostor() to authenticated;
