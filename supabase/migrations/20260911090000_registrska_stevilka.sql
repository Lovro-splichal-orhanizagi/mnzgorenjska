-- Registrska številka NZS kot zanesljiva identiteta igralca.
--
-- Doslej smo igralca prepoznavali po imenu, klubu in številki dresa. To je
-- najboljše, kar Kranj, Ljubljana in Celje ponujajo — in premalo: Niko
-- Železniki imajo tri igralce "Potočnik Matic", številke dresov pa se med
-- sezonami menjajo. Enajst arhivskih tekem je zato tiho izpadlo, ker sta dva
-- nastopa pokazala na istega igralca.
--
-- Ptuj, Murska Sobota in Lendava v zapisniku objavijo `Reg. št.` — številko iz
-- registra NZS. Ta je enolična za človeka, preživi prestop in menjavo dresa.
-- Kjer jo vir da, naj odloča ona; kjer je ni, ostane staro ugibanje po imenu.
alter table players add column if not exists reg_st bigint;

comment on column players.reg_st is
  'Registrska stevilka NZS. Kjer jo vir objavi, je zanesljivejsa od imena in dresa. Nicelna je dovoljena — vsi viri je ne dajejo.';

-- Enolična je le, kadar obstaja, in le znotraj tekmovanja: ista oseba je pri
-- članih in mladincih dve vrstici z ločeno statistiko in ceno.
create unique index if not exists players_tekmovanje_reg_st_idx
  on players (competition_id, reg_st)
  where reg_st is not null;
