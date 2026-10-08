-- Vklop Hrvaške: drugi val, 51 lig (pregled 8. 10. 2026 zvečer).
--
-- Prvi fantasy krog = prvi krog ZA zadnjim krogom z zapisniki (pravilo iz
-- CLAUDE.md, Hrvaška), ne "najnižji krog z rokom v prihodnosti" — krog s
-- prestavljeno tekmo ima lahko rok čez mesec (Koprivnica, 20261008033100).
-- Izračunano ob uveljavitvi; liga, katere naslednji krog ni v razporedu ali
-- mu je rok že potekel, se ne vklopi.
--
-- Ostanejo izklopljene (17):
-- - menjave niso vpisane (s klopi 1–4 % nastopov, drugod 20–29 %): vsi
--   začetniki bi dobili 90 minut, rezerve nič. hr-zg-2liga (že prej),
--   hr-bj-treca-znl-jug, hr-bj-treca-znl-sjever, hr-bm-baranjska-liga,
--   hr-da-liga-nsd, hr-is-2znl-jug, hr-is-2znl-sjever, hr-na-2-znl-nasice,
--   hr-na-lns-nasice, hr-ps-2-znl, hr-sm-2-znl-novska, hr-va-iii-znl-valpovo;
-- - cenik brez razlik (en arhiv premalo): hr-zd-2-znl (87 % privzetih),
--   hr-ls-ns-lsz (najvišja cena 5.8);
-- - jesenski razpored že odigran, naslednjega kroga ni: hr-ng-2znl-zapad,
--   hr-vp-druga-znl-istok, hr-vp-druga-znl-zapad.
--
-- 1. ŽNL Karlovac (hr-ka-1-znl-nskz) je bila v prvem valu izločena, ker
-- zapisnikov ni vnašala; po ponovnem uvozu ima zapisnike vseh odigranih
-- krogov in menjave (29 % s klopi), zato gre zraven.
update public.competitions c
   set prvi_fantasy_krog = n.krog,
       active = true
  from (
    select z.competition_id, z.zadnji + 1 as krog
      from (
        select r.competition_id, max(r.number) as zadnji
          from public.rounds r
         where r.season = '2026/27'
           and exists (select 1 from public.matches m
                        join public.appearances a on a.match_id = m.id
                       where m.round_id = r.id)
         group by r.competition_id
      ) z
     where exists (select 1 from public.rounds r
                    where r.competition_id = z.competition_id
                      and r.season = '2026/27'
                      and r.number = z.zadnji + 1
                      and r.deadline_at > now())
  ) n
 where n.competition_id = c.id
   and not c.active
   and c.slug in (
     'hr-bj-druga-znl', 'hr-bj-prva-znl', 'hr-bm-ii-znl-beli-manastir',
     'hr-bp-1znl', 'hr-bp-2znl-istok', 'hr-bp-2znl-zapad', 'hr-bp-3znl-istok', 'hr-bp-3znl-zapad',
     'hr-da-2-znl-dakovo', 'hr-dm-ii-znl-donji-miholjac', 'hr-du-1-znl', 'hr-du-2-znl',
     'hr-hns-4nl-zagreb-a', 'hr-hns-treca-nl-istok', 'hr-hns-treca-nl-jug',
     'hr-is-1znl', 'hr-ka-1-znl-nskz', 'hr-ka-2-znl-nskz',
     'hr-kc-1znl', 'hr-kc-2znl', 'hr-kc-3znl', 'hr-ku-2-znl-kt', 'hr-kz-1znl',
     'hr-ob-prva-znl-ob', 'hr-os-2-znl-osijek', 'hr-os-lns-osijek', 'hr-ps-1-znl',
     'hr-ri-1-znl', 'hr-ri-2-znl', 'hr-sa-2znl-zapad', 'hr-si-1-znl',
     'hr-sm-1-znl', 'hr-sm-2-znl', 'hr-sm-4nl-srediste-b',
     'hr-st-1-znl-nszsd', 'hr-st-2-znl-nszsd', 'hr-va-ii-znl-valpovo',
     'hr-vp-premijer-znl', 'hr-vp-prva-znl',
     'hr-vs-druga-znl-vinkovci', 'hr-vs-druga-znl-vukovar', 'hr-vs-druga-znl-zupanja',
     'hr-vs-prva-znl', 'hr-vs-treca-znl-vinkovci',
     'hr-vz-2-znl-varazdin', 'hr-vz-3znl-ludbreg', 'hr-vz-3znl-varazdin',
     'hr-zd-1-znl', 'hr-zg-1liga', 'hr-zz-1zl', 'hr-zz-premier'
   );
