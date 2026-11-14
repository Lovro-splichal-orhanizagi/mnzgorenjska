-- Orodja klepeta podpore, drugi del: pravice, meje in oblika odgovorov.
-- Teče v transakciji in se povrne (ROLLBACK).
begin;

do $$
declare f text;
begin
  foreach f in array array[
    'public.prijavi_napako(text,text,text,text,text,text,text)',
    'public.tocke_igralca(text,text)',
    'public.stanje_tekme(text,text,integer)',
    'public.zahtevaj_ligo(text,text,text,boolean)'
  ] loop
    if not has_function_privilege('anon', f, 'EXECUTE') then
      raise exception '% mora biti odprta za anon', f;
    end if;
  end loop;
  if has_function_privilege('anon', 'public.admin_prijave_napak(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.admin_resi_prijavo_napake(bigint,text,text)', 'EXECUTE') then
    raise exception 'Admin funkcije prijav ne smejo biti odprte za anon';
  end if;
  if has_table_privilege('anon', 'public.prijave_napak', 'SELECT')
     or has_table_privilege('anon', 'public.prijave_napak', 'INSERT')
     or has_table_privilege('authenticated', 'public.prijave_napak', 'SELECT') then
    raise exception 'Tabela prijave_napak mora biti zaprta';
  end if;
end $$;

set local role anon;

do $$
declare r jsonb; r2 jsonb;
begin
  -- Prazen opis se ne zapiše.
  r := prijavi_napako('pozicija', '  ');
  if (r ->> 'zapisano')::boolean then raise exception 'Prazen opis zapisan: %', r; end if;

  -- Neznana vrsta postane "drugo"; ista prijava v uri ni nova.
  r := prijavi_napako('neznano', 'Preizkusna napaka v podatkih', 'Nekdo Neobstojec', null, null, null, 'a@b.si');
  if not (r ->> 'zapisano')::boolean or r ->> 'id' is null then raise exception 'Prijava ni zapisana: %', r; end if;
  r2 := prijavi_napako('neznano', 'Preizkusna napaka v podatkih', 'Nekdo Neobstojec', null, null, null, 'a@b.si');
  if r2 ->> 'id' <> r ->> 'id' or not (r2 ->> 'ze_prijavljeno')::boolean then
    raise exception 'Ponovljena prijava je nova: %', r2;
  end if;

  -- Meja na stik: 5 na uro.
  for i in 1..4 loop
    perform prijavi_napako('drugo', 'Preizkus meje ' || i, null, null, null, null, 'a@b.si');
  end loop;
  r := prijavi_napako('drugo', 'Preizkus meje 6', null, null, null, null, 'a@b.si');
  if (r ->> 'zapisano')::boolean or not (r ->> 'omejitev')::boolean then
    raise exception 'Meja na stik ne velja: %', r;
  end if;

  -- Liga brez zadetka in brez e-naslova: vpraša za naslov, nič ne zapiše.
  r := zahtevaj_ligo('Qzxw Nobena Liga', 'Atlantida', null);
  if (r ->> 'zapisano')::boolean or r ->> 'potrebujem' <> 'email' then
    raise exception 'Želja brez naslova: %', r;
  end if;
  r := zahtevaj_ligo('Qzxw Nobena Liga', 'Atlantida', 'a@b.si');
  if not (r ->> 'zapisano')::boolean then raise exception 'Želja ni zapisana: %', r; end if;

  -- Bralni orodji brez zadetka vrneta prazen, a veljaven odgovor.
  r := tocke_igralca('Qzxw Neobstojec', null);
  if (r ->> 'najden')::boolean then raise exception 'Neobstoječ igralec najden: %', r; end if;
  r := stanje_tekme('Qzxw Neobstojec', null, 3);
  if (r ->> 'najdenih')::int <> 0 or jsonb_typeof(r -> 'tekme') <> 'array' then
    raise exception 'stanje_tekme brez kluba: %', r;
  end if;
end $$;

reset role;

do $$
begin
  if (select count(*) from prijave_napak where vrsta = 'drugo' and kontakt = 'a@b.si') <> 5 then
    raise exception 'Pričakovanih 5 prijav, je %', (select count(*) from prijave_napak where kontakt = 'a@b.si');
  end if;
  if not exists (select 1 from zelje_lig where email = 'a@b.si' and ime_lige = 'Qzxw Nobena Liga' and user_id is null) then
    raise exception 'Želja lige ni v zelje_lig';
  end if;
end $$;

rollback;
