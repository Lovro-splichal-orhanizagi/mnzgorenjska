// Slovenský preklad oblasti `domov` (zdroj: src/i18n/sl/domov.ts).
import type { Prevod } from '../jedro.ts'

export const domov: NonNullable<Prevod['domov']> = {
  napakaNalaganja: 'Údaje sa nepodarilo načítať.',
  delNiNalozen: 'Časť údajov sa nenačítala: {napaka}',
  uvod: {
    gorenjskaMladinci: 'Gorenjská futbalová liga — dorast',
    gorenjskaClani: '1. Gorenjská futbalová liga',
    geslo: 'Poskladaj tím. Zbieraj body. Vyhraj.',
    opis: 'Body sa počítajú z oficiálnych zápisov o stretnutí {zveza} — góly, minúty, čisté kontá, karty. Všetko okrem asistencií, o tých rozhoduje komunita.',
    vecLig: 'Môžeš hrať vo viacerých ligách — <krepko>ligu si vyberieš vľavo hore</krepko>, každá má vlastný tím a tabuľku.',
    zacetekSezone: '<krepko>Sezóna začína {datum}</krepko> — poskladaj si tím pred uzávierkou.',
    zamudniki: '<krepko>Zmeškal si štart?</krepko> V <lestvica>Tabuľke</lestvica> súťažíš od kola, keď sa pridáš.',
    sestaviEkipo: 'Poskladaj tím',
    rezultati: 'Výsledky a zostavy',
  },
  asistence: {
    cakajo: {
      one: '{n} gól čaká na asistenciu',
      few: '{n} góly čakajú na asistenciu',
      many: '{n} gólu čaká na asistenciu',
      other: '{n} gólov čaká na asistenciu',
    },
  },
  rok: {
    seZaklene: '{krog}. kolo sa uzavrie',
  },
  krog: '{krog}. kolo',
  brezKroga: 'Bez kola',
  minut: '{n} min',
  zadnjiRezultati: {
    naslov: 'Posledné výsledky',
    vsi: 'Všetky výsledky →',
    poglejTekmo: 'Pozri si zostavy a body z tohto zápasu',
  },
  najboljsi: {
    igralecSezone: 'Hráč sezóny',
    celaLestvica: 'Celé poradie hráčov →',
    vodilni: {
      strelec: 'Najlepší strelec',
      podajalec: 'Najlepší nahrávač',
      mreze: 'Najviac čistých kont',
    },
  },
  idealna: {
    naslov: 'Ideálna jedenástka',
    krogSezona: '{krog}. kolo · sezóna {sezona}',
    opis: 'Najlepších 11 posledného kola; pod dresom sú body.',
  },
  povabi: {
    naslov: 'Pozvi kamaráta do ligy',
  },
  skupnost: {
    brezAsistence: '{goli} bez asistencie',
    povejKdo: {
      one: 'Povedz, kto nahral — {n} hlas potvrdí',
      few: 'Povedz, kto nahral — {n} hlasy potvrdia',
      many: 'Povedz, kto nahral — {n} hlasu potvrdí',
      other: 'Povedz, kto nahral — {n} hlasov potvrdí',
    },
    ugibanaPozicija: '{igralci} s odhadovanou pozíciou',
    pozicijaOdloca: 'Pozícia rozhoduje, koľko je gól hodný',
    odsotnosti: 'Zranenia a absencie',
    javi: 'Nahlás, kto nebude hrať — ostatným ušetríš kolo',
  },
  naslednje: {
    naslov: 'Najbližšie zápasy',
    proti: 'vs',
  },
  kakoIgras: {
    naslov: 'Ako sa hrá',
    registracija: '1. Registrácia',
    registracijaOpis: 'Vytvor si účet cez Google alebo e-mailom a heslom a vymysli názov tímu.',
    kader: '2. Poskladaj káder',
    kaderOpis: 'Na ihrisku vyberieš 15 hráčov: 2 brankárov, 5 obrancov, 5 záložníkov a 3 útočníkov — najviac 3 z jedného klubu, v rámci rozpočtu 100.',
    enajsterica: '3. Postav jedenástku',
    enajstericaOpis: 'Jedenásť ide na ihrisko, štyria na lavičku. Kapitán prináša trojnásobné body; ak nehrá, pásku preberá zástupca.',
    poKrogu: '4. Po každom kole',
    poKroguOpis: 'Body sa vypočítajú zo zápisov. Hráča bez odohraných minút automaticky nahradí náhradník na rovnakej pozícii a raz za sezónu môžeš s Lavičkou+ započítať body celej lavičky.',
  },
  kakoSeTockuje: 'Ako sa získavajú body',
  moja: {
    tocke: 'Body',
    mesto: 'Miesto',
    mestoOd: '{mesto}. z {n}',
    uredi: 'Môj tím →',
  },
  taTeden: 'Tento týždeň',
  klepet: 'Chat a návrhy',
}
