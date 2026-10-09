// Deutsche Übersetzung von `domov` (Quelle: src/i18n/sl/domov.ts).
import type { Prevod } from '../jedro.ts'

export const domov: NonNullable<Prevod['domov']> = {
  napakaNalaganja: 'Die Daten konnten nicht geladen werden.',
  delNiNalozen: 'Ein Teil der Daten wurde nicht geladen: {napaka}',
  uvod: {
    // Namen der Ligen bleiben unverändert.
    gorenjskaMladinci: 'Gorenjska nogometna liga, mladinci',
    gorenjskaClani: '1. Gorenjska nogometna liga',
    geslo: 'Team zusammenstellen. Punkte holen. Gewinnen.',
    opis: 'Die Punkte kommen aus den offiziellen Spielberichten von {zveza}: Tore, Minuten, weiße Westen, Karten. Alles außer den Torvorlagen, über die die Community entscheidet.',
    vecLig: 'Du kannst in mehreren Ligen spielen: <krepko>wähl die Liga links oben</krepko>, jede hat ihr eigenes Team und ihre eigene Tabelle.',
    zacetekSezone: '<krepko>Die Saison beginnt am {datum}</krepko>. Stell dein Team vor der Deadline zusammen.',
    zamudniki: '<krepko>Den Start verpasst?</krepko> In der <lestvica>Tabelle</lestvica> zählst du ab der Runde, in der du einsteigst.',
    sestaviEkipo: 'Team zusammenstellen',
    rezultati: 'Ergebnisse und Aufstellungen',
  },
  asistence: {
    cakajo: {
      one: '{n} Tor wartet auf eine Torvorlage',
      other: '{n} Tore warten auf eine Torvorlage',
    },
  },
  rok: {
    seZaklene: 'Runde {krog} wird gesperrt',
  },
  krog: 'Runde {krog}',
  brezKroga: 'Keine Runde',
  minut: '{n} Min.',
  zadnjiRezultati: {
    naslov: 'Letzte Ergebnisse',
    vsi: 'Alle Ergebnisse →',
    poglejTekmo: 'Aufstellungen und Punkte dieses Spiels ansehen',
  },
  najboljsi: {
    igralecSezone: 'Spieler der Saison',
    celaLestvica: 'Ganze Spielerwertung →',
    vodilni: {
      strelec: 'Bester Torschütze',
      podajalec: 'Bester Vorlagengeber',
      mreze: 'Meiste weiße Westen',
    },
  },
  idealna: {
    naslov: 'Elf der Runde',
    krogSezona: 'Runde {krog} · Saison {sezona}',
    opis: 'Die besten 11 der letzten Runde, die Punkte stehen unter jedem Trikot.',
  },
  povabi: {
    naslov: 'Lade Freunde in die Liga ein',
  },
  skupnost: {
    brezAsistence: '{goli} ohne Torvorlage',
    povejKdo: {
      one: 'Sag uns, wer aufgelegt hat: {n} Stimme bestätigt es',
      other: 'Sag uns, wer aufgelegt hat: {n} Stimmen bestätigen es',
    },
    ugibanaPozicija: '{igralci} mit geschätzter Position',
    pozicijaOdloca: 'Die Position entscheidet, wie viel ein Tor wert ist',
    odsotnosti: 'Verletzungen und Ausfälle',
    javi: 'Melde, wer nicht spielt: das erspart anderen eine verlorene Runde',
  },
  naslednje: {
    naslov: 'Nächste Spiele',
    proti: 'gegen',
  },
  kakoIgras: {
    naslov: 'So wird gespielt',
    registracija: '1. Registrieren',
    registracijaOpis: 'Leg ein Konto mit Google oder mit E-Mail und Passwort an und denk dir einen Teamnamen aus.',
    kader: '2. Kader zusammenstellen',
    kaderOpis: 'Wähl 15 Spieler: 2 Tormänner, 5 Verteidiger, 5 Mittelfeldspieler und 3 Stürmer, höchstens 3 aus demselben Klub, mit einem Budget von 100.',
    enajsterica: '3. Startelf wählen',
    enajstericaOpis: 'Elf stehen am Platz, vier auf der Bank. Der Kapitän holt dreifache Punkte; spielt er nicht, übernimmt der Vizekapitän die Schleife.',
    poKrogu: '4. Nach jeder Runde',
    poKroguOpis: 'Die Punkte werden aus den Spielberichten berechnet. Ein Spieler ohne Einsatzminuten wird automatisch durch einen Ersatzspieler auf derselben Position ersetzt, und einmal pro Saison kannst du mit Bank+ die ganze Bank mitzählen lassen.',
  },
  kakoSeTockuje: 'So werden Punkte vergeben',
  moja: {
    tocke: 'Punkte',
    mesto: 'Platz',
    mestoOd: '{mesto} von {n}',
    uredi: 'Mein Team →',
  },
  taTeden: 'Diese Woche',
  klepet: 'Chat und Ideen',
}
