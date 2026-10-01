-- Zamenjamo samo imena prejšnjega generatorja, ne ročno urejenih ali skritih.
create temporary table hisna_imena_za_popravek as
select id from public.fantasy_teams
where hisna and display_name = public.ime_hisnega_lastnika(id, competition_id);

-- Neodvisni deli zgoščene vrednosti preprečijo bloke enakih priimkov.
-- Ime se shrani ob nastanku; ne spreminja se ob vsakem branju lestvice.
create or replace function public.ime_hisnega_lastnika(p_id bigint, p_competition_id bigint)
returns text language plpgsql volatile set search_path = public as $$
declare
  v_sk boolean;
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
  select coalesce(drz.code = 'SK', false) into v_sk
    from competitions tek left join countries drz on drz.id = tek.country_id
    where tek.id = p_competition_id;
  if not found then return null; end if;
  if v_sk then
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
$$;

update public.fantasy_teams ft
set display_name = public.ime_hisnega_lastnika(ft.id, ft.competition_id)
where ft.hisna and ft.id in (select id from hisna_imena_za_popravek);
drop table hisna_imena_za_popravek;
