-- Kdaj je bil igralec nazadnje prevrednoten.
--
-- Tedensko prevrednotenje premakne ceno proti izračunani, največ za 1.0 na
-- zagon, in z njo potuje tudi sidro borze `value_start`. Zagon torej NI
-- idempotenten: dvakrat v istem tednu pomeni premik za 2.0. Prav zato je bil
-- urnik izklopljen — tok se je dalo pognati le ročno in previdno.
--
-- Zapomnimo si, kdaj je bil igralec nazadnje prevrednoten, in ga v istem
-- tednu ne premaknemo drugič.
--
-- Zakaj TEDEN in ne samo časovni žig: ponovni zagon v torek zvečer ali v
-- sredo mora zadeti isti ključ. Merilo "manj kot sedem dni nazaj" bi se z
-- vsakim zagonom premikalo naprej in bi zaporedje zagonov ob 6., 5. in 4.
-- dnevu ceno premaknilo trikrat.
--
-- Žig hranimo poleg tedna, ker pove, kdaj natanko se je zgodilo — teden sam
-- je ključ, žig je sled.
alter table players add column if not exists repriced_at timestamptz;
alter table players add column if not exists repriced_week text;

comment on column players.repriced_at is
  'Kdaj je bil igralec nazadnje tedensko prevrednoten.';
comment on column players.repriced_week is
  'ISO teden zadnjega prevrednotenja (npr. 2026-W38). Ključ proti dvojnemu premiku cene v istem tednu.';

-- Iskanje "kdo v tem tednu še ni bil prevrednoten" tece po tem stolpcu.
create index if not exists players_repriced_week_idx
  on players (competition_id, repriced_week);
