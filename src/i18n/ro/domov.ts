// Traducere în română: `domov` (sursa: src/i18n/sl/domov.ts).
import type { Prevod } from '../jedro.ts'

export const domov: NonNullable<Prevod['domov']> = {
  napakaNalaganja: 'Datele nu au putut fi încărcate.',
  delNiNalozen: 'O parte din date nu s-a încărcat: {napaka}',
  uvod: {
    // Numele ligilor din Gorenjska nu se traduc.
    gorenjskaMladinci: 'Gorenjska nogometna liga, juniori',
    gorenjskaClani: '1. Gorenjska nogometna liga',
    geslo: 'Fă-ți echipa. Strânge puncte. Câștigă.',
    opis: 'Punctele vin din rapoartele oficiale de meci ale {zveza}: goluri, minute, meciuri fără gol primit, cartonașe. Totul în afară de pasele decisive, pe care le stabilește comunitatea.',
    vecLig: 'Poți juca în mai multe ligi: <krepko>alegi liga sus în stânga</krepko>, fiecare are echipa și clasamentul ei.',
    zacetekSezone: '<krepko>Sezonul începe pe {datum}</krepko>. Fă-ți echipa înainte de termen.',
    zamudniki: '<krepko>Ai ratat startul?</krepko> În <lestvica>Clasament</lestvica> concurezi din etapa în care te alături.',
    sestaviEkipo: 'Fă-ți echipa',
    rezultati: 'Rezultate și echipe de start',
  },
  asistence: {
    cakajo: {
      one: '{n} gol așteaptă pasa decisivă',
      few: '{n} goluri așteaptă pasa decisivă',
      other: '{n} de goluri așteaptă pasa decisivă',
    },
  },
  rok: {
    seZaklene: 'Etapa {krog} se blochează',
  },
  krog: 'Etapa {krog}',
  brezKroga: 'Fără etapă',
  minut: '{n} min',
  zadnjiRezultati: {
    naslov: 'Ultimele rezultate',
    vsi: 'Toate rezultatele →',
    poglejTekmo: 'Vezi echipele de start și punctele acestui meci',
  },
  najboljsi: {
    igralecSezone: 'Jucătorul sezonului',
    celaLestvica: 'Tot clasamentul jucătorilor →',
    vodilni: {
      strelec: 'Golgheter',
      podajalec: 'Cele mai multe pase decisive',
      mreze: 'Cele mai multe meciuri fără gol primit',
    },
  },
  idealna: {
    naslov: 'Echipa ideală',
    krogSezona: 'Etapa {krog} · sezonul {sezona}',
    opis: 'Cei mai buni 11 din ultima etapă; sub tricou sunt punctele.',
  },
  povabi: {
    naslov: 'Invită un prieten în ligă',
  },
  skupnost: {
    brezAsistence: '{goli} fără pasă decisivă',
    povejKdo: {
      one: 'Spune cine a dat pasa: {n} vot confirmă',
      few: 'Spune cine a dat pasa: {n} voturi confirmă',
      other: 'Spune cine a dat pasa: {n} de voturi confirmă',
    },
    ugibanaPozicija: '{igralci} cu poziție ghicită',
    pozicijaOdloca: 'Poziția decide cât valorează un gol',
    odsotnosti: 'Accidentări și absențe',
    javi: 'Spune cine nu va juca: le salvezi altora etapa',
  },
  naslednje: {
    naslov: 'Meciurile următoare',
    proti: 'vs',
  },
  kakoIgras: {
    naslov: 'Cum se joacă',
    registracija: '1. Înregistrare',
    registracijaOpis: 'Creează-ți un cont cu Google sau cu e-mail și parolă și alege un nume pentru echipă.',
    kader: '2. Alcătuiește lotul',
    kaderOpis: 'Pe teren alegi 15 jucători: 2 portari, 5 fundași, 5 mijlocași și 3 atacanți, cel mult 3 de la același club, într-un buget de 100.',
    enajsterica: '3. Alege primul unsprezece',
    enajstericaOpis: 'Unsprezece intră pe teren, patru stau pe bancă. Căpitanul aduce puncte triple; dacă nu joacă, banderola o preia vicecăpitanul.',
    poKrogu: '4. După fiecare etapă',
    poKroguOpis: 'Punctele se calculează din rapoartele de meci. Un jucător fără minute e înlocuit automat de o rezervă de pe aceeași poziție, iar o dată pe sezon poți folosi Bancă+ ca să-ți numere puncte toată banca.',
  },
  kakoSeTockuje: 'Cum se punctează',
  moja: {
    tocke: 'Puncte',
    mesto: 'Loc',
    mestoOd: '{mesto} din {n}',
    uredi: 'Echipa mea →',
  },
  taTeden: 'Săptămâna aceasta',
  klepet: 'Chat și sugestii',
}
