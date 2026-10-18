-- Grb Põhja-Tallinna JK Volta, kot ga je poslal klub (vodja kluba, 15. 10. 2026):
-- prej sta prvi in druga ekipa imeli začetnice, skupna ekipa z Arsenalom pa
-- Arsenalov grb. Volta dobi svojega; skupni ekipi, kjer je Volta prva v imenu,
-- tudi. `logo_vir = 'klub'` prepreči, da bi ga skripte za grbe povozile.
-- Ime v pogoju varuje druge baze, kjer ti id-ji pomenijo kaj drugega.
update public.teams
   set logo_url = '/grbi/ee-pohja-tallinna-jk-volta.png', logo_vir = 'klub'
 where id in (6943, 7197)
   and name like 'Põhja-Tallinna JK Volta%';
