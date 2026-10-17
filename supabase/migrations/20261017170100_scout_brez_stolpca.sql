-- SLFF Scout: odstrani players.scout_skrit. Ugovori so od 20261016160100 v
-- zaprti scout.ugovori, nov delavec stolpca ne bere. Javno berljiv stolpec bi
-- razkril seznam ugovornikov. Pred odstranitvijo še enkrat prenese morebitne
-- ugovore, vpisane v stolpec po prvi migraciji.
insert into scout.ugovori (player_id, kljuc)
select k.player_id, k.kljuc
  from scout.kljuci_vrstic(array(select id from public.players where scout_skrit)) k
on conflict do nothing;
alter table public.players drop column scout_skrit;
