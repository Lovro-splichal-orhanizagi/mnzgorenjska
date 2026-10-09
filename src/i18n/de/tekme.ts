// Deutsche Übersetzung von `tekme` (Quelle: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  krog: '{n}. Runde',
  moraPrijava: 'Zum Abstimmen musst du dich <prijava>anmelden</prijava>.',

  // Posten der Punkteaufschlüsselung und Regeln (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: '60 Minuten oder mehr gespielt',
      nastopDo60: 'Einsatz bis 60 Minuten',
      gol: 'Tor',
      goli: 'Tore ({n})',
      asistenca: 'Torvorlage',
      asistence: 'Torvorlagen ({n})',
      brezPrejetega: 'Kein Gegentor',
      zmaga: 'Sieg der Mannschaft',
      prejetiGoli: 'Gegentore ({n})',
      obranjena: 'Gehaltener Elfmeter ({n})',
      zgresena: 'Verschossener Elfmeter ({n})',
      avtogol: 'Eigentor ({n})',
      rumeni: 'Gelbe Karte ({n})',
      rdeci: 'Rote Karte',
    },
    pravila: {
      igralniCas: 'Spielzeit',
      nastopDo60: 'Einsatz bis 60 Minuten',
      nastopOd60: '60 Minuten oder mehr gespielt',
      goliInAsistence: 'Tore und Torvorlagen',
      golVratarja: 'Tor eines Tormanns',
      golBranilca: 'Tor eines Verteidigers',
      golVezista: 'Tor eines Mittelfeldspielers',
      golNapadalca: 'Tor eines Stürmers',
      asistenca: 'Torvorlage',
      obramba: 'Defensive',
      csVratar: 'Kein Gegentor: Tormann',
      csBranilec: 'Kein Gegentor: Verteidiger',
      csVezist: 'Kein Gegentor: Mittelfeldspieler',
      zmaga: 'Sieg der Mannschaft: Tormann, Verteidiger',
      prejeta2: 'Je 2 Gegentore: Tormann, Verteidiger',
      // Unter der Regeltabelle auf der Startseite.
      opomba:
        'Die Defensive zählt ab mindestens 60 Minuten, Gegentore nur jene, die fallen, während der Spieler am Platz steht.',
      obranjena:
        'Gehaltener Elfmeter: Tormann (der Spielbericht führt ihn als verschossenen Elfmeter des Gegners)',
      kazni: 'Strafen',
      zgresena: 'Verschossener Elfmeter',
      avtogol: 'Eigentor',
      rumeni: 'Gelbe Karte',
      rdeci: 'Rote Karte',
    },
  },

  rezultati: {
    naslov: 'Ergebnisse',
    uvod:
      'Gespielte Spiele aus den Spielberichten von {zveza}. Klick auf ein Spiel und du siehst beide Aufstellungen am Platz, auf jedem Trikot die Punkte, die der Spieler geholt hat.',
    niZacetka: 'Die Saison hat noch nicht begonnen.',
    prazenKrog: 'In dieser Runde wurden keine Spiele gespielt.',
    prejsnji: 'Vorige Runde',
    naslednji: 'Nächste Runde',
  },

  tekma: {
    naslov: 'Spiel',
    niTekme: 'Dieses Spiel ist in den Spielberichten nicht vorhanden.',
    nazaj: '← Ergebnisse',
    brezPostav:
      'Der Spielbericht dieses Spiels enthält keine Aufstellungen, deshalb lassen sich keine Punkte pro Spieler anzeigen.',
    naDresu:
      'Auf dem Trikot steht, wie viele Punkte der Spieler in diesem Spiel geholt hat. Ein Klick auf den Spieler öffnet seine Seite.',
    cakajo: {
      one: '{n} Tor in diesem Spiel wartet auf eine Torvorlage: Solange sie fehlt, bekommt der Vorlagengeber keine +3 Punkte. Sag unten, wer vorgelegt hat.',
      other: '{n} Tore in diesem Spiel warten auf eine Torvorlage: Solange sie fehlt, bekommt der Vorlagengeber keine +3 Punkte. Sag unten, wer vorgelegt hat.',
    },
    goliInAsistence: 'Tore und Torvorlagen',
    prijaviSe: 'Zum Abstimmen anmelden',
  },

  // Seite Torvorlagen (Abstimmung über Torvorlagen).
  glasovanje: {
    naslov: 'Torvorlagen',
    kdoJePodal: 'Wer hat vorgelegt?',
    uvod:
      'Die Spielberichte von {zveza} halten die Torschützen fest, Torvorlagen aber nicht. Die bestimmt die Community: Sobald derselbe Spieler bei einem Tor <b>{glasov}</b> sammelt, wird ihm die Torvorlage zuerkannt und bringt <b>+3 Punkte</b>.',
    pragGlasov: { one: '{n} Stimme', other: '{n} Stimmen' },
    niTekem: 'In der laufenden Saison wurden noch keine Spiele gespielt',
    niTekemOpis:
      'Die Abstimmung über Torvorlagen öffnet, sobald die erste Runde gespielt ist. Schau wieder vorbei, wenn die Spielberichte da sind.',
    arhiv: 'Archiv',
    preteklaSezona:
      'Du stimmst über eine vergangene Saison ab. Auf die Punkte der laufenden Liga hat das keinen Einfluss, es korrigiert nur die Geschichte.',
    izberiKrog: '1. Runde wählen',
    izberiTekmo: '2. Spiel wählen',
    vsePotrjeno: 'Alles bestätigt',
    zaprto: 'geschlossen',
    poglejTekmo: 'Aufstellungen und Punkte dieses Spiels ansehen →',
    niGolov: 'In diesem Spiel fielen keine Tore.',
    vsePotrjene: 'Alle Torvorlagen in diesem Spiel sind bestätigt. 🎉',
    zaprtoOpis: 'Die Abstimmung über dieses Spiel ist geschlossen: Sie ist bis zur Deadline der nächsten Runde offen.',
    brezPotrjene: 'Ohne bestätigte Torvorlage: {goli}.',
  },

  // Torkarte mit Abstimmung (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'unbekannter Torschütze',
    avtogol: 'Eigentor: {ime}',
    enajstmetrovka: '{ime}: Elfmeter',
    brezAsistenceOpomba: 'ohne Torvorlage',
    potrjena: 'Torvorlage bestätigt, gesperrt',
    brezAsistence: 'Ohne Torvorlage',
    odlocilaSkupnost: 'so hat die Community entschieden',
    morasSePrijaviti: 'Zum Abstimmen musst du angemeldet sein',
    spremeniGlas: 'Stimme ändern',
    kdoJePodal: 'Wer hat vorgelegt?',
    vodiBrez: 'Vorne: „ohne Torvorlage“',
    vodi: 'Vorne: <b>{ime}</b>',
    igralecBrezZapisa: 'Spieler ohne Eintrag',
    doOdlocitve: 'noch {n} bis zur Entscheidung',
    ostali: 'Andere:',
    brezGlasovi: 'ohne ({n})',
    izberiPodajalca: 'Vorlagengeber wählen: {ekipa}',
    nihce: 'Niemand: Tor ohne Torvorlage',
  },

  // Seite Positionen (Abstimmung über Positionen).
  pozicije: {
    naslov: 'Positionen',
    kjeKdoIgra: 'Wer spielt wo?',
    uvod:
      'Die Spielberichte markieren nur den Tormann und listen die Aufstellungen nach Rückennummern auf, die Positionen lassen sich also nicht ablesen. Die bestimmt die Community. Benötigte Stimmen: <b>{prag}</b>. Die Zahl sinkt (bis {minPrag}), wenn die statistische Vorannahme (Rückennummer, Tore, Karten) stark in diese Richtung zeigt. Stimmen von <b>Vereinskennern</b> und Nutzern mit <b>hoher Trefferquote</b> zählen mehr.',
    enkratNaTeden:
      'Abgestimmte Positionen werden <b>einmal pro Woche, am Montag in der Früh</b> übernommen, alle auf einmal. So ändert sich die Liga unter der Woche nicht unter den Fingern: Was du am Dienstag siehst, gilt auch am Samstag, wenn die Runde gesperrt wird. Ein Spieler, der schon genug Stimmen hat, ist bis dahin mit einer Sanduhr <ikona>⏳</ikona> markiert.',
    klub: 'Verein',
    poznavalecOznaka: '  ★ Kenner',
    samoIzStatistike: 'Nur aus der Statistik ({n})',
    vsiPotrjeni: 'Alle Spieler dieses Vereins haben eine bestätigte Position. 🎉',
    niIgralcev: 'Keine Spieler.',
    status: {
      naslov: 'Mein Status als Abstimmender',
      utezOpis:
        'Gewicht einer einzelnen Stimme: Es wird mit dem Insider-Bonus addiert, wenn du für einen Spieler deines Vereins stimmst.',
      utez: 'Gewicht {utez}×',
      tocnih: '({pravilni}/{vsi} richtig)',
      klubPoznam: 'Verein, den ich gut kenne (Kenner): Meine Stimme für Spieler dieses Vereins zählt mehr:',
      nisemPoznavalec: 'Ich bin bei keinem Verein Kenner',
      opomba:
        'Ein Kenner markiert nur einen Verein. Die Gewichte pendeln sich mit der Zeit ein: Wenn sich deine Stimmen als falsch herausstellen, sinkt das Vertrauen. Das Vertrauen wird aus früheren Stimmen neu berechnet, sobald die Position bekannt ist.',
    },
    igralec: {
      statistika: '{tekme} · {minute} Min. · {goli} · {cs} ohne Gegentor',
      izZapisnika: 'Aus dem Spielbericht: Der Tormann ist mit (V) markiert',
      izStatistike: 'Aus der Statistik (Rückennummer, Tore, Karten): Stimmen können sie korrigieren',
      potrdilaSkupnost: 'Von der Community bestätigt',
      zapisnik: ' · Spielbericht',
      uveljavitevOpis:
        'Positionen werden einmal pro Woche, am Montag in der Früh, übernommen. So ändert sich die Liga unter der Woche nicht unter den Fingern.',
      izglasovano: 'abgestimmt: {pozicija} · am Montag',
      neIgraOpis: 'Spielt nicht mehr: nicht am Transfermarkt. Taucht er im Spielbericht auf, kommt er von selbst zurück.',
      neIgra: 'spielt nicht mehr',
      vrniOpis: 'Spieler wieder aktiv setzen',
      vrni: 'zurück',
      odhodOpis:
        'Der Spieler spielt nicht mehr bei diesem Verein: Er wird vom Transfermarkt genommen. Ein Einsatz im Spielbericht bringt ihn von selbst zurück.',
      statistikaKaze:
        'Die Statistik deutet auf <b>{pozicija} ({odstotek}%)</b>: Eine Stimme in diese Richtung zählt mit niedrigerer Schwelle ({nizji} statt {prag}).',
      dolocenaIzStatistike: 'Die Position wurde aus der Statistik bestimmt: Wenn sie nicht stimmt, klick auf die richtige.',
      dolocilaSkupnost: 'Die Position hat die Community bestimmt: Mit Stimmen lässt sie sich korrigieren.',
      gumbUtez: 'Gewicht {utez} / Schwelle {prag}',
      gumbPrior: ' · Vorannahme {odstotek}%',
      gumbPoznavalec: ' · deine Stimme als Kenner zählt mehr',
      vodi: 'Vorne: {pozicija}, Gewicht {utez} / {prag}',
    },
  },
}
