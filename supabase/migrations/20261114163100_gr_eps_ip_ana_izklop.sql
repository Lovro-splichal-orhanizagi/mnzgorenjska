-- Grčija, vir `eps`: Epir (epsip.gr) in Vzhodna Atika (epsana.gr) izklopljeni.
--
-- Obe strani sta se okoli 6. 11. 2026 preselili na novo platformo in
-- `/results/display_schedule.php` zdaj vrne HTTP 404 (domači strani 200).
-- Nočni uvoz GR 2/6, 3/6 in 5/6 zato pada pri vsaki od sedmih lig. Parser
-- `scripts/viri/eps.mjs` novih strani ne bere; do novega parserja ostanejo
-- lige izklopljene, že uvoženi podatki ostanejo (SLF-326).
update competitions
   set active = false
 where slug in (
   'gr-ip-a', 'gr-ip-b', 'gr-ip-g-a', 'gr-ip-g-b',
   'gr-ana-a', 'gr-ana-b', 'gr-ana-g'
 )
   and active;
