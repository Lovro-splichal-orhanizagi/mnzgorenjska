// Český překlad oblasti `domov` (zdroj: src/i18n/sl/domov.ts).
import type { Prevod } from '../jedro.ts'

export const domov: NonNullable<Prevod['domov']> = {
  napakaNalaganja: 'Údaje se nepodařilo načíst.',
  delNiNalozen: 'Část údajů se nenačetla: {napaka}',
  uvod: {
    gorenjskaMladinci: 'Gorenjská fotbalová liga, dorost',
    gorenjskaClani: '1. Gorenjská fotbalová liga',
    geslo: 'Poskládej tým. Sbírej body. Vyhraj.',
    opis: 'Body se počítají z oficiálních zápisů o utkání {zveza}: góly, minuty, čistá konta, karty. Všechno kromě asistencí, o těch rozhoduje komunita.',
    vecLig: 'Můžeš hrát ve více ligách. <krepko>Ligu si vybereš vlevo nahoře</krepko>, každá má vlastní tým a žebříček.',
    zacetekSezone: '<krepko>Sezóna začíná {datum}</krepko>, poskládej si tým před uzávěrkou.',
    zamudniki: '<krepko>Zmeškal jsi start?</krepko> V <lestvica>Žebříčku</lestvica> soutěžíš od kola, kdy se přidáš.',
    sestaviEkipo: 'Poskládej tým',
    rezultati: 'Výsledky a sestavy',
  },
  asistence: {
    cakajo: {
      one: '{n} gól čeká na asistenci',
      few: '{n} góly čekají na asistenci',
      many: '{n} gólu čeká na asistenci',
      other: '{n} gólů čeká na asistenci',
    },
  },
  rok: {
    seZaklene: '{krog}. kolo se uzavře',
  },
  krog: '{krog}. kolo',
  brezKroga: 'Bez kola',
  minut: '{n} min',
  zadnjiRezultati: {
    naslov: 'Poslední výsledky',
    vsi: 'Všechny výsledky →',
    poglejTekmo: 'Podívej se na sestavy a body z tohoto zápasu',
  },
  najboljsi: {
    igralecSezone: 'Hráč sezóny',
    celaLestvica: 'Celé pořadí hráčů →',
    vodilni: {
      strelec: 'Nejlepší střelec',
      podajalec: 'Nejlepší nahrávač',
      mreze: 'Nejvíc čistých kont',
    },
  },
  idealna: {
    naslov: 'Ideální jedenáctka',
    krogSezona: '{krog}. kolo · sezóna {sezona}',
    opis: 'Nejlepších 11 posledního kola; pod dresem jsou body.',
  },
  povabi: {
    naslov: 'Pozvi kamaráda do ligy',
  },
  skupnost: {
    brezAsistence: '{goli} bez asistence',
    povejKdo: {
      one: 'Řekni, kdo nahrával. Potvrdí to {n} hlas',
      few: 'Řekni, kdo nahrával. Potvrdí to {n} hlasy',
      many: 'Řekni, kdo nahrával. Potvrdí to {n} hlasu',
      other: 'Řekni, kdo nahrával. Potvrdí to {n} hlasů',
    },
    ugibanaPozicija: '{igralci} s odhadovanou pozicí',
    pozicijaOdloca: 'Pozice rozhoduje, kolik je gól hodný',
    odsotnosti: 'Zranění a absence',
    javi: 'Nahlas, kdo nebude hrát, ostatním ušetříš kolo',
  },
  naslednje: {
    naslov: 'Nejbližší zápasy',
    proti: 'vs',
  },
  kakoIgras: {
    naslov: 'Jak se hraje',
    registracija: '1. Registrace',
    registracijaOpis: 'Vytvoř si účet přes Google nebo e-mailem a heslem a vymysli název týmu.',
    kader: '2. Poskládej soupisku',
    kaderOpis: 'Na hřišti vybereš 15 hráčů: 2 brankáře, 5 obránců, 5 záložníků a 3 útočníky, nejvýš 3 z jednoho klubu, v rámci rozpočtu 100.',
    enajsterica: '3. Postav jedenáctku',
    enajstericaOpis: 'Jedenáct jde na hřiště, čtyři na lavičku. Kapitán přináší trojnásobné body; když nehraje, pásku přebírá zástupce.',
    poKrogu: '4. Po každém kole',
    poKroguOpis: 'Body se spočítají ze zápisů. Hráče bez odehraných minut automaticky nahradí náhradník na stejné pozici a jednou za sezónu můžeš s Lavičkou+ započítat body celé lavičky.',
  },
  kakoSeTockuje: 'Jak se získávají body',
  moja: {
    tocke: 'Body',
    mesto: 'Místo',
    mestoOd: '{mesto}. z {n}',
    uredi: 'Můj tým →',
  },
  taTeden: 'Tento týden',
  klepet: 'Chat a návrhy',
}
