// Kdaj smeta dva ročna uvoza (uvoz-lige.yml) iste države teči hkrati.
// Rabi ga scripts/cakaj-na-uvoze.mjs; pravilo je tu, da ga smoke preveri brez
// GitHuba in baze.
//
// Države, kjer zveze pod državno nimajo skupnih klubov. Državne zveze
// (`drzavne`, mešajo vse) čakajo na vse in vsi nanje.
// Avstrija: deželne zveze, državna ÖFB (Bundesliga, 2. Liga, Regionalliga).
// Romunija: vsaka županijska zveza (`ajf-<judet>`, vira hlf in frf) je svoja
// piramida; državni sta LPF (SuperLiga) in FRF (Liga 2, Liga 3). Lige iste
// županije si lahko delijo klube (rezerve, II. ekipe) in strežnik frf-ajf.ro (arhiv
// ~10 s na tekmo), zato županija uvaža eno ligo naenkrat.
// Srbija: regionalne zveze (FSV, FSRZS, FSRIS, FS Beograd) so ločene piramide,
// državna je FSS (Superliga, Prva liga); vse fssid lige bere fss.rs, zato koliko
// jih teče hkrati omeji veriga, ki jih zažene (dve naenkrat, 2 s premora vsaka).
// Madžarska: vármegye zveze (BLSZ in 19 županij) so ločene piramide, državna
// je MLSZ (NB I–III). Vse bere isti Adatbank, zato hkratnost omeji veriga.
// Slovaška (od 13. 10. 2026): regionalne (BFZ, ZsFZ, SsFZ, VsFZ) in okresne
// zveze (ObFZ …) pod državno SFZ. Klub ima lahko A-moštvo v regionalni in
// B-moštvo v okresni ligi, zato teče hkrati le različna zveza; vse bere
// futbalnet, koliko jih teče hkrati omeji veriga.
//
// `istaZveza`: dve NEVKLOPLJENI ligi iste zveze smeta hkrati.
export const LOCENE_ZVEZE = {
  AT: { drzavne: ['oefb'], istaZveza: true },
  RO: { drzavne: ['lpf', 'frf'], istaZveza: false },
  RS: { drzavne: ['fss'], istaZveza: true },
  HU: { drzavne: ['mlsz'], istaZveza: true },
  SK: { drzavne: ['sfz'], istaZveza: false },
}

/**
 * Ali ročna uvoza dveh lig iste države smeta teči hkrati.
 * `moja`, `druga`: { zveza, aktivna }.
 *
 * Različni zvezi tečeta hkrati tudi pri vklopljenih ligah (od 13. 10. 2026):
 * nočni uvoz v treh koših madžarske države že piše vklopljene lige različnih
 * zvez hkrati. Vklopljena liga še vedno čaka na nočni posel svoje države
 * (to preveri cakaj-na-uvoze.mjs posebej). Ista zveza teče hkrati le, če sta
 * obe ligi nevklopljeni in država to dovoli (`istaZveza`).
 */
export function locenaHkrati(drzava, moja, druga) {
  const l = LOCENE_ZVEZE[drzava]
  if (!l || !moja?.zveza || !druga?.zveza) return false
  if (l.drzavne.includes(moja.zveza) || l.drzavne.includes(druga.zveza)) return false
  if (moja.zveza !== druga.zveza) return true
  return l.istaZveza && !moja.aktivna && !druga.aktivna
}
