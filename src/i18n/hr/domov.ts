// Hrvatski prijevod područja `domov` (izvor: src/i18n/sl/domov.ts).
import type { Prevod } from '../jedro.ts'

export const domov: NonNullable<Prevod['domov']> = {
  napakaNalaganja: 'Podatke nije bilo moguće učitati.',
  delNiNalozen: 'Dio podataka se nije učitao: {napaka}',
  uvod: {
    gorenjskaMladinci: 'Gorenjska nogometna liga — juniori',
    gorenjskaClani: '1. Gorenjska nogometna liga',
    geslo: 'Složi momčad. Skupljaj bodove. Pobijedi.',
    opis: 'Bodovi dolaze iz službenih zapisnika ({zveza}): golovi, minute, čiste mreže, kartoni. Sve osim asistencija, njih određuje zajednica.',
    vecLig: 'Možeš igrati u više liga — <krepko>ligu biraš gore lijevo</krepko>, svaka ima svoju momčad i ljestvicu.',
    zacetekSezone: '<krepko>Sezona počinje {datum}</krepko> — složi momčad prije roka.',
    zamudniki: '<krepko>Propustio si početak?</krepko> Na <lestvica>Ljestvici</lestvica> natječeš se od kola kad se pridružiš.',
    sestaviEkipo: 'Složi momčad',
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
    celaLestvica: 'Cijela ljestvica igrača →',
    vodilni: {
      strelec: 'Prvi strijelac',
      podajalec: 'Prvi asistent',
      mreze: 'Najviše čistih mreža',
    },
  },
  idealna: {
    naslov: 'Idealna momčad',
    krogSezona: '{krog}. kolo · sezona {sezona}',
    opis: 'Najboljih 11 posljednjeg kola; ispod dresa su bodovi.',
  },
  povabi: {
    naslov: 'Pozovi prijatelja u ligu',
  },
  skupnost: {
    brezAsistence: '{goli} bez asistencije',
    povejKdo: {
      one: 'Reci tko je asistirao — {n} glas potvrđuje',
      few: 'Reci tko je asistirao — {n} glasa potvrđuju',
      other: 'Reci tko je asistirao — {n} glasova potvrđuje',
    },
    ugibanaPozicija: '{igralci} s pretpostavljenom pozicijom',
    pozicijaOdloca: 'Pozicija određuje koliko vrijedi gol',
    odsotnosti: 'Ozljede i izostanci',
    javi: 'Javi tko neće igrati — drugima ćeš spasiti kolo',
  },
  naslednje: {
    naslov: 'Sljedeće utakmice',
    proti: 'vs',
  },
  kakoIgras: {
    naslov: 'Kako se igra',
    registracija: '1. Registracija',
    registracijaOpis: 'Napravi račun preko Googlea ili e-pošte i lozinke te smisli ime momčadi.',
    kader: '2. Složi momčad',
    kaderOpis: 'Na terenu biraš 15 igrača: 2 vratara, 5 braniča, 5 veznih i 3 napadača — najviše 3 iz istog kluba, unutar proračuna od 100 mil.',
    enajsterica: '3. Postavi prvih 11',
    enajstericaOpis: 'Jedanaest ih ide na teren, četvorica na klupu. Kapetan donosi trostruke bodove; ako ne igra, traku preuzima zamjenik.',
    poKrogu: '4. Nakon svakog kola',
    poKroguOpis: 'Bodovi se računaju iz zapisnika. Igrača bez minuta automatski mijenja rezerva iste pozicije, a jednom u sezoni s Klupa+ možeš u bodove uračunati cijelu klupu.',
  },
  kakoSeTockuje: 'Kako se boduje',
  moja: {
    tocke: 'Bodovi',
    mesto: 'Mjesto',
    mestoOd: '{mesto}. od {n}',
    uredi: 'Moja momčad →',
  },
  taTeden: 'Ovaj tjedan',
  klepet: 'Chat i prijedlozi',
}
