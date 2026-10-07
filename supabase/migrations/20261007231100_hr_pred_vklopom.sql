-- Hrvaške lige pred vklopom (pregled 7. 10. 2026).
--
-- 1. Kratka imena. Generator jih je rezal pri 18 znakih in jih podvajal:
--    "1. ŽNL" sedemkrat, "III. Međimurska NL" za skupini A in B. Kratko ime
--    stoji brez zveze v roku kroga, rezultatih, opozorilih in zadevi maila,
--    zato mora biti v državi enolično. Vzorec kot pri prvih ligah: oznaka
--    županije in raven ("MZ I.", "VŽ Elitna"), državne lige polno.
update public.competitions c
   set short_name = v.kratko
  from (values
    ('hr-3nl-centar', '3. NL Centar'),
    ('hr-3nl-sjever', '3. NL Sjever'),
    ('hr-3nl-zapad', '3. NL Zapad'),
    ('hr-hns-treca-nl-istok', '3. NL Istok'),
    ('hr-hns-treca-nl-jug', '3. NL Jug'),
    ('hr-hns-4nl-zagreb-a', '4. NL Zagreb A'),
    ('hr-sm-4nl-srediste-b', '4. NL Središte B'),
    ('hr-ri-4nl', '4. NL Rijeka'),
    ('hr-bj-prva-znl', 'BJ I.'),
    ('hr-bj-druga-znl', 'BJ II.'),
    ('hr-bj-treca-znl-jug', 'BJ III. Jug'),
    ('hr-bj-treca-znl-sjever', 'BJ III. Sjever'),
    ('hr-bm-baranjska-liga', 'Baranjska liga'),
    ('hr-bm-ii-znl-beli-manastir', 'BM II.'),
    ('hr-bp-1znl', 'BP I.'),
    ('hr-bp-2znl-istok', 'BP II. Istok'),
    ('hr-bp-2znl-zapad', 'BP II. Zapad'),
    ('hr-bp-3znl-istok', 'BP III. Istok'),
    ('hr-bp-3znl-zapad', 'BP III. Zapad'),
    ('hr-da-2-znl-dakovo', 'ĐA II.'),
    ('hr-da-liga-nsd', 'Liga NS Đakovo'),
    ('hr-dm-ii-znl-donji-miholjac', 'DM II.'),
    ('hr-du-1-znl', 'DU I.'),
    ('hr-du-2-znl', 'DU II.'),
    ('hr-is-elitna', 'IS Elitna'),
    ('hr-is-1znl', 'IS I.'),
    ('hr-is-2znl-jug', 'IS II. Jug'),
    ('hr-is-2znl-sjever', 'IS II. Sjever'),
    ('hr-ka-1-znl-nskz', 'KA I.'),
    ('hr-ka-2-znl-nskz', 'KA II.'),
    ('hr-kc-elitna', 'KC Elitna'),
    ('hr-kc-1znl', 'KC I.'),
    ('hr-kc-2znl', 'KC II.'),
    ('hr-kc-3znl', 'KC III.'),
    ('hr-ku-2-znl-kt', 'KU II.'),
    ('hr-kz-1znl', 'KZ I.'),
    ('hr-kz-2-znl-kzz', 'KZ II.'),
    ('hr-ls-ns-lsz', 'LS Liga'),
    ('hr-mz-premier', 'MZ Premier'),
    ('hr-mz-1mnl', 'MZ I.'),
    ('hr-mz-2mnl', 'MZ II.'),
    ('hr-mz-3mnl-a', 'MZ III. A'),
    ('hr-mz-3mnl-b', 'MZ III. B'),
    ('hr-na-lns-nasice', 'LNS Našice'),
    ('hr-na-2-znl-nasice', 'NA II.'),
    ('hr-ng-2znl-zapad', 'NG II. Zapad'),
    ('hr-ob-prva-znl-ob', 'OB I.'),
    ('hr-os-lns-osijek', 'LNS Osijek'),
    ('hr-os-2-znl-osijek', 'OS II.'),
    ('hr-ps-1-znl', 'PS I.'),
    ('hr-ps-2-znl', 'PS II.'),
    ('hr-ri-1-znl', 'RI I.'),
    ('hr-ri-2-znl', 'RI II.'),
    ('hr-sa-2znl-zapad', 'SA II. Zapad'),
    ('hr-si-1-znl', 'ŠI I.'),
    ('hr-sm-1-znl', 'SM I.'),
    ('hr-sm-2-znl', 'SM II.'),
    ('hr-sm-2-znl-novska', 'SM II. Novska'),
    ('hr-st-1-znl-nszsd', 'ST I.'),
    ('hr-st-2-znl-nszsd', 'ST II.'),
    ('hr-va-ii-znl-valpovo', 'VA II.'),
    ('hr-va-iii-znl-valpovo', 'VA III.'),
    ('hr-vp-premijer-znl', 'VP Premijer'),
    ('hr-vp-prva-znl', 'VP I.'),
    ('hr-vp-druga-znl-istok', 'VP II. Istok'),
    ('hr-vp-druga-znl-zapad', 'VP II. Zapad'),
    ('hr-vs-prva-znl', 'VS I.'),
    ('hr-vs-druga-znl-vinkovci', 'VS II. Vinkovci'),
    ('hr-vs-druga-znl-vukovar', 'VS II. Vukovar'),
    ('hr-vs-druga-znl-zupanja', 'VS II. Županja'),
    ('hr-vs-treca-znl-vinkovci', 'VS III. Vinkovci'),
    ('hr-vz-elitna', 'VŽ Elitna'),
    ('hr-vz-1znl', 'VŽ I.'),
    ('hr-vz-2-znl-varazdin', 'VŽ II.'),
    ('hr-vz-3znl-varazdin', 'VŽ III.'),
    ('hr-vz-3znl-ludbreg', 'VŽ III. Ludbreg'),
    ('hr-zd-1-znl', 'ZD I.'),
    ('hr-zd-2-znl', 'ZD II.'),
    ('hr-zg-1liga', 'ZG I.'),
    ('hr-zg-2liga', 'ZG II.'),
    ('hr-zz-premier', 'ZŽ Premier'),
    ('hr-zz-1zl', 'ZŽ I.')
  ) as v(slug, kratko)
 where c.slug = v.slug;

-- 2. Borza ne premika cen v ligah, ki še niso vklopljene. Hrvaške lige so
--    od uvoza (5.-7. 10.) dobile 14.272 premikov, čeprav nihče ne more kupiti;
--    obenem je začetna cena (ovrednoti-igralce brez --sezona) letošnjo formo
--    že štela, zato bi jo ob vklopu šteli dvakrat. Ob vklopu se
--    prvi_fantasy_krog postavi na naslednji krog, da borza starejših krogov
--    ne obračuna (glej preracunaj_cene).
create or replace function public.uveljavi_zapadle_cene(p_okno interval default '14 days'::interval)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_krog record;
  v_skupaj int := 0;
  v_preskocenih int := 0;
begin
  for v_krog in
    select r.id, r.season, r.number,
           greatest(r.played_on, (select max(m.played_on) from matches m
                                   where m.round_id = r.id
                                     and m.imported_at is not null)) as played_on
    from rounds r
    join competitions c on c.id = r.competition_id
    where c.active
      and r.number >= c.prvi_fantasy_krog
      and krog_je_odigran(r.id)
      and r.season = (
        select max(r2.season) from rounds r2 where r2.competition_id = r.competition_id
      )
    order by r.season, r.number
  loop
    if v_krog.played_on is not null
       and v_krog.played_on < (current_date - p_okno) then
      v_preskocenih := v_preskocenih + 1;
      continue;
    end if;
    v_skupaj := v_skupaj + uveljavi_cene(v_krog.id);
  end loop;

  if v_preskocenih > 0 then
    raise notice 'borza je preskočila % starih krogov (zunaj okna %)',
      v_preskocenih, p_okno;
  end if;
  return v_skupaj;
end;
$function$;

-- 3. Hišne ekipe na Hrvaškem: prikazna imena lastnikov iz hrvaških imen,
--    priimkov in vzdevkov (prej bi hrvaška liga dobila slovenska).
create or replace function public.ime_hisnega_lastnika(p_id bigint, p_competition_id bigint)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_drzava text;
  v_imena text[];
  v_priimki text[];
  v_vzdevki text[];
  v_hash text;
  a bigint; b bigint; c bigint; d bigint;
  v_ime text;
  v_priimek text;
  v_rezultat text;
  v_poskus integer;
begin
  select coalesce(drz.code, 'SI') into v_drzava
    from competitions tek left join countries drz on drz.id = tek.country_id
    where tek.id = p_competition_id;
  if not found then return null; end if;
  if v_drzava = 'SK' then
    v_imena := array['Martin','Peter','Lukáš','Tomáš','Michal','Ján','Marek','Jozef',
      'Samuel','Jakub','Filip','Adam','Patrik','Dominik','Matej','Pavol',
      'Rastislav','Miroslav','Juraj','Šimon','Oliver','Andrej','Daniel','Viktor',
      'Matúš','Dušan','Roman','Erik','Denis','Kristián','Richard','Boris'];
    v_priimki := array['Kováč','Horváth','Varga','Tóth','Nagy','Baláž','Molnár','Lukáč',
      'Polák','Kučera','Urban','Kollár','Šimko','Bartoš','Hudák','Mikula',
      'Novotný','Kováčik','Švec','Šoltés','Farkaš','Králik','Štefánik','Bielik',
      'Oravec','Kmeť','Moravčík','Šťastný','Hruška','Sedlák','Blaško','Pavlík'];
    v_vzdevki := array['Matooo','peto','Luky','Tomi','Miso','Janci','Marecek','Jozo',
      'Samo','Kubo','Fifo','ado','Pato','Domco','Rasto','Miro',
      'simonko','Oli','Dano','Viki','Matulo','Duso','Romco','Erino',
      'Deny','Kiko','Riso','Borko','tichystrelec','lavickar','Horal','Kopacka'];
  elsif v_drzava = 'HR' then
    v_imena := array['Luka','Ivan','Marko','Josip','Petar','Matej','Filip','Karlo',
      'Ante','Mateo','Domagoj','Tomislav','Dario','Nikola','Stjepan','Mario',
      'Hrvoje','Kristijan','Leon','Fran','Jakov','Toni','Antonio','Dino',
      'Bruno','Marin','Lovro','Borna','Roko','Noa','Vito','Zvonimir'];
    v_priimki := array['Horvat','Kovačević','Babić','Marić','Jurić','Novak','Kovačić','Knežević',
      'Vuković','Marković','Petrović','Matić','Tomić','Pavlović','Kovač','Božić',
      'Blažević','Grgić','Pavić','Radić','Perić','Lovrić','Vidović','Šarić',
      'Jukić','Barišić','Kos','Mandić','Galić','Lončar','Filipović','Brkić'];
    v_vzdevki := array['Lukica','ivek','Maki','Jole','Pero','Matko','Fićo','Kale',
      'Antiša','Teo','Doma','Tomo','Darac','Niki','Štef','Mare',
      'Hrva','Krle','Leo','Franjo','Jaki','Tonči','Brune','Marinko',
      'Borna','Roki','Vito','Zvone','golgeter','klupaš','Purger','Dalmoš'];
  else
    v_imena := array['Luka','Matej','Marko','Rok','Jan','Miha','Nejc','Žan',
      'Andrej','Blaž','Jure','Tomaž','Gregor','Aljaž','David','Anže',
      'Nik','Tim','Gašper','Žiga','Urban','Lučka','Matic','Domen',
      'Nace','Jaka','Simon','Vid','Klemen','Primož','Tilen','Bor'];
    v_priimki := array['Novak','Horvat','Kovačič','Krajnc','Zupančič','Potočnik','Kovač','Mlakar',
      'Vidmar','Kos','Golob','Turk','Božič','Korošec','Zupan','Rozman',
      'Kavčič','Kralj','Zajc','Bizjak','Kastelic','Hribar','Hočevar','Kokalj',
      'Koren','Zver','Kotnik','Jerman','Medved','Dolenc','Bregar','Pirc'];
    v_vzdevki := array['Lukiii','mateyy','markec','Roki','janko','Mihc','nejko','Zanny',
      'blazko','Jurc','tomii','Grega','Aljo','Davy','Anzi','niko',
      'Timmy','Gaspo','Zigi','Urbii','Mati','Domc','nacek','Jaky',
      'Simi','Vidoo','Klemi','Primc','Tili','Borci','levica','rezervist'];
  end if;
  v_vzdevki := v_vzdevki || array['LilManni','elMago','NoLook','Vamos','Kappa',
    'baller','Ninoo','Rivoo','Zizouu','IlCapitano','Maverik','ChillBoy','Kiki',
    'Panenka','TikiTaka','TopBins','Rabona','lilmomo','Vamoss','ElPibe',
    'Nexxo','JogaBonito','Piksi','Futbolero'];

  for v_poskus in 0..255 loop
    v_hash := md5('slff-display-v2:' || p_competition_id || ':' || p_id || ':' || v_poskus);
    a := ('x' || substr(v_hash,1,8))::bit(32)::bigint;
    b := ('x' || substr(v_hash,9,8))::bit(32)::bigint;
    c := ('x' || substr(v_hash,17,8))::bit(32)::bigint;
    d := ('x' || substr(v_hash,25,8))::bit(32)::bigint;
    v_ime := v_imena[1 + (b % cardinality(v_imena))::int];
    v_priimek := v_priimki[1 + (c % cardinality(v_priimki))::int];
    if a % 100 < 30 then
      v_rezultat := v_ime || ' ' || v_priimek;
    elsif a % 100 < 50 then
      v_rezultat := case when d % 3 = 0 then lower(v_ime) else v_ime end;
    elsif a % 100 < 65 then
      v_rezultat := upper(left(v_ime,1) || left(v_priimek,1))
        || (array['7','10','11','9','21','99','23','77','08','18','01','04'])[1+(d%12)::int];
    else
      v_rezultat := v_vzdevki[1 + (b % cardinality(v_vzdevki))::int];
      if c % 4 = 0 then
        v_rezultat := v_rezultat || (array['7','10','11','9','21','99','23','77','08','18','01','04'])[1+(d%12)::int];
      elsif c % 4 = 1 then
        v_rezultat := lower(v_rezultat) || case when d % 2 = 0 then '_' else '' end || (1+d%98)::text;
      end if;
    end if;
    -- Isto ime v ligi ne sme pripadati drugi hišni ali človeški ekipi.
    if not exists (
      select 1 from fantasy_teams ft join profiles pr on pr.id = ft.owner_id
      where ft.competition_id = p_competition_id and ft.id <> p_id
        and lower(case when ft.hisna then ft.display_name else pr.display_name end) = lower(v_rezultat)
    ) then return v_rezultat; end if;
  end loop;
  raise exception 'Ni prostega prikaznega imena za hišno ekipo %.', p_id;
end;
$function$;

