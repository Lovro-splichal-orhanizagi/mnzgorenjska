-- Jezik avtentikacijske pošte za že registrirane Slovake.
--
-- Predloge potrditve, prijave s povezavo in ponastavitve gesla
-- (supabase/templates/) izberejo slovaščino po `jezik` v metapodatkih
-- uporabnika. Novi računi ga dobijo ob registraciji (Prijava.tsx), računi,
-- ustvarjeni prej, pa ga nimajo in bi ponastavitev gesla dobili v
-- slovenščini. Kdor ima ekipe SAMO v slovaških ligah, dobi `jezik = 'sk'`;
-- kdor igra tudi ali samo v Sloveniji, ostane pri privzeti slovenščini.
-- Že vpisanega jezika ne spreminjamo.
--
-- Shema se ne spremeni (samo podatki v auth.users), zato baza.types.ts ostane.
do $$
begin
  update auth.users u
     set raw_user_meta_data =
           coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('jezik', 'sk')
   where coalesce(u.raw_user_meta_data ->> 'jezik', '') = ''
     and exists (
       select 1
         from fantasy_teams ft
         join competitions c on c.id = ft.competition_id
         join countries d on d.id = c.country_id
        where ft.owner_id = u.id and d.code = 'SK'
     )
     and not exists (
       select 1
         from fantasy_teams ft
         join competitions c on c.id = ft.competition_id
         join countries d on d.id = c.country_id
        where ft.owner_id = u.id and d.code <> 'SK'
     );
exception
  -- Brez pravice do auth.users (drugačna vloga ob namestitvi) migracija ne
  -- sme pasti: brez tega popravka stari Slovaki dobijo slovensko pošto.
  when insufficient_privilege then
    raise notice 'eposta_jezik: ni pravice do auth.users, jezik ni vpisan.';
end $$;
