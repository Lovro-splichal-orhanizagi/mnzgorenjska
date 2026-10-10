// Eestikeelne `domov` (allikas: src/i18n/sl/domov.ts).
import type { Prevod } from '../jedro.ts'

export const domov: NonNullable<Prevod['domov']> = {
  napakaNalaganja: 'Andmeid ei õnnestunud laadida.',
  delNiNalozen: 'Osa andmeid jäi laadimata: {napaka}',
  uvod: {
    // Liigade nimed jäävad muutmata.
    gorenjskaMladinci: 'Gorenjska nogometna liga - mladinci',
    gorenjskaClani: '1. Gorenjska nogometna liga',
    geslo: 'Pane kokku meeskond. Kogu punkte. Võida.',
    opis: 'Punktid tulevad ametlikest mänguprotokollidest ({zveza}): väravad, minutid, nullid, kaardid. Kõik peale resultatiivsete söötude, need otsustab kogukond.',
    vecLig: 'Võid mängida mitmes liigas: <krepko>vali liiga üleval vasakul</krepko>; igal on oma meeskond ja edetabel.',
    zacetekSezone: '<krepko>Hooaeg algab {datum}</krepko>, pane meeskond kokku enne tähtaega.',
    zamudniki: '<krepko>Jäid algusest maha?</krepko> <lestvica>Edetabelis</lestvica> võistled alates voorust, millega liitusid.',
    sestaviEkipo: 'Pane meeskond kokku',
    rezultati: 'Tulemused ja koosseisud',
  },
  asistence: {
    cakajo: {
      one: '{n} värav ootab resultatiivset söötu',
      other: '{n} väravat ootab resultatiivset söötu',
    },
  },
  rok: {
    seZaklene: '{krog}. voor lukustub',
  },
  krog: '{krog}. voor',
  brezKroga: 'Voor puudub',
  minut: '{n} min',
  zadnjiRezultati: {
    naslov: 'Viimased tulemused',
    vsi: 'Kõik tulemused →',
    poglejTekmo: 'Vaata selle mängu koosseise ja punkte',
  },
  najboljsi: {
    igralecSezone: 'Hooaja mängija',
    celaLestvica: 'Kogu mängijate edetabel →',
    vodilni: {
      strelec: 'Parim väravakütt',
      podajalec: 'Parim söötja',
      mreze: 'Kõige rohkem nulle',
    },
  },
  idealna: {
    naslov: 'Vooru meeskond',
    krogSezona: '{krog}. voor · hooaeg {sezona}',
    opis: 'Viimase vooru parim 11; punktid iga särgi all.',
  },
  povabi: {
    naslov: 'Kutsu sõber liigasse',
  },
  skupnost: {
    brezAsistence: '{goli} ilma resultatiivse söödu andjata',
    povejKdo: {
      one: 'Ütle, kes selle ette valmistas: {n} hääl kinnitab',
      other: 'Ütle, kes selle ette valmistas: {n} häält kinnitavad',
    },
    ugibanaPozicija: '{igralci} oletatud positsiooniga',
    pozicijaOdloca: 'Positsioon otsustab, kui palju värav väärt on',
    odsotnosti: 'Vigastused ja puudumised',
    javi: 'Anna teada, kes ei mängi: see säästab teistele vooru',
  },
  naslednje: {
    naslov: 'Järgmised mängud',
    proti: 'vs',
  },
  kakoIgras: {
    naslov: 'Kuidas mängida',
    registracija: '1. Registreeru',
    registracijaOpis: 'Loo konto Google’iga või e-posti ja parooliga ning mõtle meeskonnale nimi.',
    kader: '2. Pane kokku koosseis',
    kaderOpis: 'Vali 15 mängijat: 2 väravavahti, 5 kaitsjat, 5 poolkaitsjat ja 3 ründajat, ühest klubist kõige rohkem 3, eelarve on 100.',
    enajsterica: '3. Vali algkoosseis',
    enajstericaOpis: 'Üksteist lähevad väljakule, neli jäävad pingile. Kapten saab kolmekordsed punktid; kui ta ei mängi, võtab kaptenipaela asekapten.',
    poKrogu: '4. Pärast igat vooru',
    poKroguOpis: 'Punktid arvutatakse mänguprotokollidest. Mängija, kellel minuteid pole, asendatakse automaatselt sama positsiooni varumängijaga, ja kord hooajas saad kasutada Pink+, et lugeda kogu pinki.',
  },
  kakoSeTockuje: 'Kuidas punkte antakse',
  moja: {
    tocke: 'Punktid',
    mesto: 'Koht',
    mestoOd: '{mesto}. / {n}',
    uredi: 'Minu meeskond →',
  },
  taTeden: 'Sel nädalal',
  klepet: 'Vestlus ja ideed',
}
