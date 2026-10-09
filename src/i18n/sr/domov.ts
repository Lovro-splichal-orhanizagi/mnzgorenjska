// Srpski prevod: `domov` (izvor: src/i18n/sl/domov.ts).
import type { Prevod } from '../jedro.ts'

export const domov: NonNullable<Prevod['domov']> = {
  napakaNalaganja: 'Podatke nije bilo moguće učitati.',
  delNiNalozen: 'Deo podataka se nije učitao: {napaka}',
  uvod: {
    gorenjskaMladinci: 'Gorenjska fudbalska liga, juniori',
    gorenjskaClani: '1. Gorenjska fudbalska liga',
    geslo: 'Sastavi tim. Skupljaj bodove. Pobedi.',
    opis: 'Bodovi dolaze iz zvaničnih zapisnika ({zveza}): golovi, minuti, mreže bez primljenog gola, kartoni. Asistencije i pozicije igrača u polju određuje zajednica.',
    vecLig: 'Možeš da igraš u više liga: <krepko>ligu biraš gore levo</krepko>, svaka ima svoj tim i tabelu.',
    zacetekSezone: '<krepko>Sezona počinje {datum}</krepko>. Sastavi tim pre roka.',
    zamudniki: '<krepko>Propustio si početak?</krepko> Na <lestvica>Tabeli</lestvica> takmičiš se od kola kada se pridružiš.',
    sestaviEkipo: 'Sastavi tim',
    rezultati: 'Rezultati i postave',
  },
  asistence: {
    cakajo: {
      one: '{n} gol čeka asistenciju',
      few: '{n} gola čekaju asistenciju',
      other: '{n} golova čeka asistenciju',
    },
  },
  rok: {
    seZaklene: '{krog}. kolo se zaključava',
  },
  krog: '{krog}. kolo',
  brezKroga: 'Bez kola',
  minut: '{n} min',
  zadnjiRezultati: {
    naslov: 'Najnoviji rezultati',
    vsi: 'Svi rezultati →',
    poglejTekmo: 'Pogledaj postave i bodove ove utakmice',
  },
  najboljsi: {
    igralecSezone: 'Igrač sezone',
    celaLestvica: 'Cela tabela igrača →',
    vodilni: {
      strelec: 'Prvi strelac',
      podajalec: 'Prvi asistent',
      mreze: 'Najviše utakmica bez primljenog gola',
    },
  },
  idealna: {
    naslov: 'Idealni tim',
    krogSezona: '{krog}. kolo · sezona {sezona}',
    opis: 'Najboljih 11 poslednjeg kola; ispod dresa su bodovi.',
  },
  povabi: {
    naslov: 'Pozovi prijatelja u ligu',
  },
  skupnost: {
    brezAsistence: '{goli} bez asistencije',
    povejKdo: {
      one: 'Reci ko je asistirao: {n} glas potvrđuje',
      few: 'Reci ko je asistirao: {n} glasa potvrđuju',
      other: 'Reci ko je asistirao: {n} glasova potvrđuje',
    },
    ugibanaPozicija: '{igralci} sa pretpostavljenom pozicijom',
    pozicijaOdloca: 'Pozicija određuje koliko vredi gol',
    odsotnosti: 'Povrede i odsustva',
    javi: 'Javi ko neće igrati, drugima ćeš spasiti kolo',
  },
  naslednje: {
    naslov: 'Sledeće utakmice',
    proti: 'vs',
  },
  kakoIgras: {
    naslov: 'Kako se igra',
    registracija: '1. Registracija',
    registracijaOpis: 'Napravi nalog preko Googlea, Applea ili imejla i lozinke i smisli ime tima.',
    kader: '2. Sastavi tim',
    kaderOpis: 'Na terenu biraš 15 igrača: 2 golmana, 5 odbrambenih, 5 veznih i 3 napadača, najviše 3 iz istog kluba, u okviru budžeta od 100 mil.',
    enajsterica: '3. Postavi prvih 11',
    enajstericaOpis: 'Jedanaestorica idu na teren, četvorica na klupu. Kapiten donosi trostruke bodove; ako ne igra, traku preuzima zamenik.',
    poKrogu: '4. Posle svakog kola',
    poKroguOpis: 'Bodovi se računaju iz zapisnika. Igrača bez minuta automatski menja rezerva iste pozicije, a jednom u sezoni sa Klupa+ možeš u bodove da uračunaš celu klupu.',
  },
  kakoSeTockuje: 'Kako se boduje',
  moja: {
    tocke: 'Bodovi',
    mesto: 'Mesto',
    mestoOd: '{mesto}. od {n}',
    uredi: 'Moj tim →',
  },
  taTeden: 'Ove nedelje',
  klepet: 'Čet i predlozi',
}
