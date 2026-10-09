// Deutsche Übersetzung von `mojaEkipa` (Quelle: src/i18n/sl/mojaEkipa.ts).
// Begriffe wie im Fantasy-Fußball: Kader, Startelf, Bank, Kapitän, Transfers, Runde.
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Mein Team',
  /** Ersatz, wenn der Name des Spielers unbekannt ist. */
  igralec: 'Spieler',
  vprasanjeZapustitve: 'Du hast ungespeicherte Änderungen am Team. Seite trotzdem verlassen?',
  /** Kapitänsbinde am Trikot. */
  oznaka: {
    kapetan: 'K',
    namestnik: 'V',
  },

  // Kaderregeln (lib/pravila.ts): Gründe am Transfermarkt und in der Fehlerliste.
  pravila: {
    pozicije: {
      GK: 'Tormänner',
      DEF: 'Verteidiger',
      MID: 'Mittelfeldspieler',
      FWD: 'Stürmer',
    },
    kaderPoln: 'Dein Kader ist voll ({n} Spieler).',
    pozicijaPolna: '{pozicija}: Du hast schon {n} im Kader.',
    premaloProracuna: 'Zu wenig Budget: Der Spieler kostet {cena}, dir bleiben {preostalo}.',
    izKluba: 'Du hast schon {n} Spieler von {klub}.',
    velikostEkipe: 'Dein Kader muss {n} Spieler haben (aktuell {trenutno}).',
    velikostPostave: 'Deine Startelf muss {n} Spieler haben (aktuell {trenutno}).',
    brezPozicije: {
      one: '{n} ausgewählter Spieler hat noch keine bestätigte Position. Hilf im Bereich Positionen mit.',
      other: '{n} ausgewählte Spieler haben noch keine bestätigte Position. Hilf im Bereich Positionen mit.',
    },
    niVecVLigi: '{ime} ist nicht mehr in der Liga. Ersetze ihn.',
    pozicijaVKadru: '{pozicija} im Kader: {n}, erforderlich sind {kader}.',
    pozicijaVPostavi: '{pozicija} in der Startelf: {n}, erlaubt sind {min} bis {max}.',
    dolociKapetana: 'Wähle einen Kapitän: Er holt in der Runde {n}× Punkte.',
    enKapetan: 'Du kannst nur einen Kapitän haben.',
    dolociNamestnika: 'Wähle einen Vizekapitän, der die Binde übernimmt, wenn der Kapitän nicht spielt.',
    istiKlub: 'Du kannst höchstens {n} Spieler vom selben Klub wählen.',
    presegelProracun: 'Du hast das Budget um {cena} überschritten.',
  },

  napake: {
    zeImas: 'Du hast in dieser Liga schon ein Team. Lade die Seite neu.',
    dovoljenje: 'Dafür fehlt dir die Berechtigung. Melde dich neu an und versuch es noch einmal.',
    povezava: 'Keine Verbindung zum Server. Prüfe dein Internet und versuch es noch einmal.',
    shranjevanje: 'Speichern fehlgeschlagen. Bitte versuch es noch einmal.',
    nalaganjePovezava: 'Keine Verbindung zum Server. Prüfe dein Internet.',
    nalaganje: 'Die Daten deines Teams konnten nicht geladen werden.',
    nalaganjeNiCelo:
      'Dein Team kann erst gespeichert werden, wenn es vollständig geladen ist. Sonst würde das Speichern Spieler entfernen, die nicht geladen wurden.',
    poskusiZnova: 'Nochmal versuchen',
    vpisiIme: 'Gib zuerst einen Teamnamen ein.',
    osvezitev:
      'Dein Team ist gespeichert, aber das Aktualisieren ist fehlgeschlagen. Lade die Seite neu, bevor du es weiter bearbeitest.',
    najprejShrani: 'Speichere zuerst dein Team.',
    izberiKrog: 'Wähle die Runde, für die der Chip gelten soll.',
    prihodnjiKrog: 'Wähle eine kommende, noch nicht gesperrte Runde mit festgelegter Deadline.',
    zeUporabil: 'Diesen Chip hast du in dieser Saison schon eingesetzt.',
    niPreklica: 'Der Chip für diese Runde kann nicht mehr zurückgenommen werden.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'In dieser Liga sind noch keine Spieler am Transfermarkt.',
    pocakaj: 'Warte, bis das Speichern fertig ist.',
    niPredloga: 'Aus dieser Liga lässt sich noch kein gültiges Team zusammenstellen.',
    predlogSestavljen: 'Dein Team steht. Tausche aus, wen du willst, und drück Speichern.',
    kaderDopolnjen: 'Die freien Plätze sind gefüllt. Prüfe sie und drück Speichern.',
    niDopolnitve:
      'Mit dem restlichen Geld lässt sich dein Kader nicht vervollständigen. Ersetze einen der teuren Spieler und versuch es noch einmal.',
    kapetanNaKlop: '{ime} sitzt jetzt auf der Bank. Wähle einen neuen Kapitän.',
    namestnikNaKlop: '{ime} sitzt jetzt auf der Bank. Wähle einen neuen Vizekapitän.',
    brezPozicije: 'Dieser Spieler hat noch keine bestätigte Position und kann daher nicht aufs Feld.',
    niProstora:
      'In der Startelf ist kein Platz für einen weiteren Spieler auf dieser Position. Setz zuerst jemanden auf die Bank.',
    niVecNamestnik: '{ime} ist nicht mehr Vizekapitän. Wähle einen neuen.',
    niVecKapetan: '{ime} ist nicht mehr Kapitän. Wähle einen neuen.',
    rokPotekel: 'Die Deadline für Runde {krog} ist vorbei, Änderungen gelten ab der nächsten Runde.',
    shranjenaZaKrog: 'Dein Team ist gespeichert und bereit für Runde {krog}.',
    shranjenaVeljavna: 'Dein Team ist gespeichert und entspricht den Regeln.',
    osnutekShranjen:
      'Entwurf gespeichert. Dein Team entspricht noch nicht den Regeln und würde in dieser Runde keine Punkte holen.',
    prodaja: 'Der Verkauf hat dir +{cena} gebracht.',
    nakupi: 'Die Käufe haben {cena} gekostet.',
    wildcardVlozen: 'Wildcard eingesetzt: Transfers in dieser Runde sind gratis.',
    klopPlusVlozen: 'Bank+ eingesetzt.',
    wildcardPreklican: 'Wildcard zurückgenommen. Du kannst sie in einer anderen Runde einsetzen.',
    klopPlusPreklican: 'Bank+ zurückgenommen. Du kannst ihn in einer anderen Runde einsetzen.',
    zapriOpozorilo: 'Warnung schließen',
    zapriObvestilo: 'Hinweis schließen',
    odstranjen: '{ime} entfernt.',
    razveljavi: 'Rückgängig',
  },

  prijavaPotrebna: 'Um ein Team zusammenzustellen, musst du dich anmelden.',
  prijava: 'Anmelden',
  locenaLiga:
    'Dein Team in <liga>{liga}</liga> ist von deinen Teams in anderen Ligen getrennt, mit eigenem Budget und eigener Tabelle. Punkte zählen ab Runde {krog}, weil bis dahin noch Transfers und Wechsel zwischen den Altersklassen laufen.',

  /** Aufklappbarer Bereich unter dem Spielfeld. */
  vec: 'Mehr: Chips, Verlauf, Regeln',

  prestopi: {
    stevec: 'Transfers: {n}/{prosti}',
    wildcard: 'Wildcard, kein Abzug',
    odbitek: '{tock} Abzug in dieser Runde',
    prosti: {
      one: 'noch {n} gratis, danach je −{kazen}',
      other: 'noch {n} gratis, danach je −{kazen}',
    },
  },

  // Transfertipps (lib/namigiEkipe.ts): wer in der nächsten Runde nicht spielt
  // und wen du dir stattdessen leisten kannst.
  namigi: {
    naslov: 'Transfertipps',
    zaKrog: 'Wer in Runde {krog} wahrscheinlich nicht spielt und wen du dir stattdessen leisten kannst.',
    razlog: {
      neaktiven: 'nicht mehr in der Liga',
      poskodba: 'verletzt',
      odsotnost: 'nicht verfügbar',
      brezTekme: 'Klub spielt nicht',
    },
    kandidat: '{cena} · Form {forma}',
    zamenjajNamig: 'Ersetze {ime} in deinem Kader durch {novi}',
    niZamenjave: 'Kein Ersatz passt zu deinem Budget und den Regeln.',
    opomba: 'Ein Klick bereitet den Tausch nur vor, speichern musst du selbst. Jeder Tipp gilt für sich.',
    skrij: 'Bis zur nächsten Runde ausblenden',
    zamenjano: '{novi} ist statt {ime} in deinem Kader. Speichere dein Team, wenn du zufrieden bist.',
  },

  // Preisänderungen der Kaderspieler seit dem letzten Besuch.
  odZadnjegaObiska: {
    naslov: 'Seit deinem letzten Besuch',
    naslovTeden: 'In der letzten Woche',
    vrednost: 'Teamwert <znesek>{znak}{cena}</znesek>',
    gor: 'Preisanstieg',
    dol: 'Preisrückgang',
    zapri: 'Schließen',
  },

  povzetek: {
    urediIme: 'Teamnamen {ime} bearbeiten',
    bogastvo:
      'Vermögen <vrednost>{bogastvo}</vrednost><razlika></razlika> · Kader {kader} <placano>bezahlt</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Wird gespeichert …',
    shraniEkipo: 'Team speichern',
    neshranjeno: 'Ungespeicherte Änderungen',
    imeEkipe: 'Teamname',
    privzetoIme: 'FC {ime}',
    primerImena: 'z. B. Sonntagshelden',
  },

  // Starthilfe für ein leeres Team.
  zacetek: {
    naslov: 'Wo anfangen?',
    sestaviMi: 'Stell mir ein Team zusammen',
    opisPredloga:
      'Wir wählen ein zufälliges, gültiges Team im Rahmen des Budgets, bei jedem Klick ein anderes. Dann tauschst du aus, wen du willst, und speicherst.',
    sam: 'Ich stelle es lieber selbst zusammen',
    drugPredlog: 'Anderer Vorschlag',
    opisDrugegaPredloga: 'Gefällt es dir nicht? Zieh ein neues Team, bis zum Speichern ist das gratis.',
    dopolni: 'Mein Team vervollständigen',
    opisDopolnitve:
      'Freie Kaderplätze: {n}. Deine Auswahl bleibt, den Rest füllen wir zufällig im Rahmen des Budgets.',
    korak1: 'Oben haben wir dir einen Teamnamen vorgeschlagen. Du kannst ihn jederzeit ändern.',
    korak2:
      'Klick auf <krepko>＋</krepko> bei einem freien Platz am Spielfeld. Am Handy gibt es in der unteren Leiste auch den Knopf <krepko>＋ Hinzufügen</krepko>, am Computer wählst du rechts am <krepko>Transfermarkt</krepko>.',
    korak3:
      'Der Kader hat {n} Spieler: {gk} TOR, {def} VER, {mid} MIT, {fwd} STÜ. Höchstens {klub} vom selben Klub.',
    korak4:
      'Wenn alle Plätze besetzt sind, wähle einen <krepko>Kapitän</krepko> und einen <krepko>Vizekapitän</krepko> und drück <krepko>Team speichern</krepko> (am Handy <krepko>Speichern</krepko> in der unteren Leiste).',
  },

  trak: {
    naslov: 'Kapitänsbinde',
    kapetan: 'Kapitän (×{n})',
    namestnik: 'Vizekapitän',
    nihce: 'niemand',
  },

  // "Was wäre, wenn": was die aktuelle Aufstellung in der letzten Runde geholt hätte.
  kajCe: {
    prinesla: 'Deine aktuelle Aufstellung hätte in <krog>Runde {krog}</krog> ({sezona}) geholt',
    opis: 'Eine "Was wäre, wenn"-Ansicht, kein historisches Ergebnis; sie ändert sich mit jedem Tausch. Die tatsächlichen Punkte vergangener Runden findest du in der Tabelle und im Aufstellungs-Schnappschuss.',
  },

  status: {
    manjka: 'Für ein endgültiges Speichern fehlt noch einiges:',
    vpisiIme: 'Gib einen Teamnamen ein (im Feld oben).',
    osnutekZdaj: 'Du kannst auch jetzt schon einen Entwurf speichern und die Regeln später erfüllen.',
    brezTock: 'In diesem Zustand holst du <krepko>KEINE Punkte</krepko> <krepko>in Runde {krog}</krepko>.',
    kajPomeni:
      '<krepko>Was macht "Speichern"?</krepko> Deine Änderungen (Kader, Aufstellung, Kapitän) werden in die Datenbank geschrieben. Für die laufende Runde zählt der Stand zur Deadline. Bis zur Deadline kannst du ändern und so oft speichern, wie du willst; es zählt die letzte Version. <krepko>"Entwurf speichern"</krepko> macht dasselbe, merkt aber an, dass das Team noch nicht alle Regeln erfüllt (für Punkte brauchst du Korrekturen, siehe Liste oben).',
    kajPomeniRok:
      '<krepko>Was macht "Speichern"?</krepko> Deine Änderungen (Kader, Aufstellung, Kapitän) werden in die Datenbank geschrieben. Für die laufende Runde zählt der Stand zur Deadline (<krepko>Runde {krog}: {rok}</krepko>). Bis zur Deadline kannst du ändern und so oft speichern, wie du willst; es zählt die letzte Version. <krepko>"Entwurf speichern"</krepko> macht dasselbe, merkt aber an, dass das Team noch nicht alle Regeln erfüllt (für Punkte brauchst du Korrekturen, siehe Liste oben).',
  },

  pripomocki: {
    klopPlusNaslov: 'Chip Bank+',
    klopPlusVlozenZa: 'Eingesetzt für Runde {krog} ({sezona}): Auch die Punkte der Bank zählen.',
    klopPlusVlozen: 'Bank+ ist schon eingesetzt: Auch die Punkte der Bank zählen.',
    klopPlusOpis:
      'Einmal pro Saison: In der gewählten Runde werden auch die Punkte aller vier Ersatzspieler dazugezählt.',
    wildcardNaslov: 'Chip Wildcard',
    wildcardVlozenZa: 'Eingesetzt für Runde {krog} ({sezona}): Transfers darin sind gratis.',
    wildcardVlozen: 'Wildcard ist schon eingesetzt: Transfers darin sind gratis.',
    wildcardOpis:
      'Einmal pro Saison: In dieser Runde kannst du beliebig viele Spieler ersetzen, ohne Punkteabzug.',
    zaklenjen: 'gesperrt',
    preklici: 'zurücknehmen',
    prekliciDo: 'Zurücknehmen möglich bis <odstevanje></odstevanje>',
    izberiKrog: 'Runde wählen …',
    niKroga: 'Keine kommende Runde mit Deadline',
    krogSezona: 'Runde {krog} ({sezona})',
    vlozi: 'Einsetzen',
    vloziZa: 'Für Runde {krog} einsetzen',
    potrdiWildcard: 'Wildcard für Runde {krog} einsetzen? Du hast nur eine pro Saison.',
  },

  zgodovina: {
    naslov: 'Verlauf der Aufstellungen',
    posnetkov: {
      one: '{n} Runde mit Schnappschuss',
      other: '{n} Runden mit Schnappschuss',
    },
    krog: 'Runde {krog}',
    podrobnost: 'Runde {krog} · Saison {sezona}',
    podrobnostSkupaj: 'Runde {krog} · Saison {sezona} · gesamt <krepko>{tocke}</krepko>',
    deli: 'Runde {krog} teilen',
  },

  // Untere Leiste und Transfermarkt-Schublade am Handy.
  telefon: {
    ostane: 'übrig',
    predalPovzetek: '<krepko>{cena}</krepko> übrig · {n}/{velikost}',
    popravi: 'korrigieren ↑',
    neshranjeno: 'ungespeichert',
    dodaj: '＋ Hinzufügen',
    osnutekNamig: 'Dein Team entspricht noch nicht den Regeln und wird als Entwurf gespeichert.',
    neIzpolnjuje: 'Team entspricht noch nicht den Regeln',
    zapriTrg: 'Transfermarkt schließen',
    zapri: '✕ Schließen',
  },

  trg: {
    naslov: 'Transfermarkt',
    iskanje: 'Nach Namen suchen …',
    pocistiIskanje: 'Suche löschen',
    vsi: 'alle',
    vsiKlubi: 'Alle Klubs',
    niZadetkov: 'Keine Treffer.',
    pocistiFiltre: 'Filter zurücksetzen',
    statLetos: '{goli} T · {minute} Min.',
    statLani: 'letzte Saison {goli} T',
    brezNastopov: 'keine Einsätze',
    niVecVLigi: 'nicht mehr in der Liga',
    tockeZadnjiKrog: 'Punkte in der zuletzt gespielten Runde',
    podatki: 'Details zu {ime}',
    podatkiNamig: 'Statistik, Preisverlauf, kommende Spiele',
    profilVNovemZavihku: 'Spielerprofil in neuem Tab öffnen',
    odstrani: '✕ entfernen',
    dodaj: '⊕ hinzufügen',
    prvih: 'Es werden die ersten {n} angezeigt. Grenze die Auswahl mit der Suche ein.',
    noga: 'Du kannst höchstens {n} Spieler vom selben Klub wählen. Tore und Minuten sind aus der laufenden Saison.',
  },

  rok: {
    krog: 'Runde {krog}',
    potekel: 'Deadline vorbei: <krepko>{rok}</krepko>',
    rok: 'Deadline: <krepko>{rok}</krepko>',
    niDolocen: 'Noch keine Deadline festgelegt.',
  },

  // Spielfeld im Team-Editor (components/Igrisce.tsx).
  igrisce: {
    naKlop: 'Auf die Bank',
    vPostavo: 'In die Startelf',
    niVecVLigiNamig: 'Dieser Spieler ist nicht mehr in der Liga. Ein Kader mit ihm holt keine Punkte.',
    niVecVLigi: 'nicht mehr in der Liga',
    poskodba: 'Verletzung',
    odsoten: 'nicht verfügbar',
    kapetan: 'Kapitän: dreifache Punkte',
    namestnik: 'Vizekapitän',
    tockeKroga: 'Punkte in der letzten Runde: {tocke}',
    tockeKrogaKapetan: 'Punkte in der letzten Runde: {tocke} × 3 (Kapitän)',
    odstraniIzKadra: 'Aus dem Kader entfernen',
    odstrani: '{ime} entfernen',
    prej: 'Früher in der Wechselreihenfolge',
    prejIme: '{ime}: früher in der Wechselreihenfolge',
    pozneje: 'Später in der Wechselreihenfolge',
    poznejeIme: '{ime}: später in der Wechselreihenfolge',
    izberi: 'Wählen: {pozicija}',
    klop: 'Bank',
    klopOpis:
      'Spielt ein Spieler der Startelf nicht, ersetzt ihn der erste Bankspieler auf derselben Position, in der Reihenfolge von links nach rechts.',
    brezPozicije: 'Keine bestätigte Position, kann nicht aufs Feld',
  },

  // Spielfeld mit den Punkten eines Teams in einem Spiel (components/IgrisceTocke.tsx).
  igrisceTocke: {
    opis: '{ime}: {deli}',
    minut: '{n} Min.',
    goli: '{n} × Tor',
    asistence: '{n} × Assist',
    brezPrejetega: 'zu null',
    prejetih: '{n} Gegentore',
    rumeni: 'Gelbe Karte',
    rdeci: 'Rote Karte',
    skupaj: '{tocke} Pkt.',
    brezPostave: 'Der Spielbericht enthält für dieses Team keine Aufstellung.',
    klop: 'Bank',
    vstopilo: '{n} eingewechselt',
  },

  // Elf der Runde und Aufstellung eines anderen Managers am Spielfeld.
  enajsterica: {
    kapetan: 'Kapitän',
    namestnik: 'Vizekapitän mit Binde',
  },

  // Leiste mit Hinweisen zu meinen Teams (components/OpozoriloEkipe.tsx, lib/stanjeEkip.ts).
  opozorila: {
    naslov: 'Warnungen zu deinen Teams',
    naslovNapakEna: 'Eines deiner Teams holt keine Punkte',
    naslovNapak: {
      one: '{n} deiner Teams holt keine Punkte',
      other: '{n} deiner Teams holen keine Punkte',
    },
    nimasEkipe: 'Du hast noch kein Team<liga>({liga})</liga>. Ohne Team holst du in der nächsten Runde keine Punkte.',
    sestavi: 'Team zusammenstellen →',
    popravi: 'Korrigieren →',
    poglej: 'Ansehen →',
    skrij: 'Warnung ausblenden: {besedilo}',
    skrijNamig: 'Ausblenden, bis es eine neue Meldung gibt',
    pokaziVse: 'Alle anzeigen ({n})',
    razlog: 'Das Team entspricht nicht den Regeln.',
    brezTockKrog: 'Es holt in Runde {krog} keine Punkte.',
    brezTockRok: 'Es holt zur nächsten Deadline keine Punkte.',
    nepopolna:
      'Das Team ist unvollständig. Diese Runde wird trotzdem gesperrt, ab der nächsten holt es aber keine Punkte.',
    igralec: {
      kapetan: {
        poskodba: 'Kapitän {ime} ist verletzt.',
        odsotnost: 'Kapitän {ime} ist nicht verfügbar.',
        izstop: 'Kapitän {ime} spielt nicht mehr: Sein Klub hat sich aus der Liga zurückgezogen.',
      },
      namestnik: {
        poskodba: 'Vizekapitän {ime} ist verletzt.',
        odsotnost: 'Vizekapitän {ime} ist nicht verfügbar.',
        izstop: 'Vizekapitän {ime} spielt nicht mehr: Sein Klub hat sich aus der Liga zurückgezogen.',
      },
      vPostavi: {
        poskodba: '{ime} ist verletzt und steht in deiner Startelf.',
        odsotnost: '{ime} ist nicht verfügbar und steht in deiner Startelf.',
        izstop: '{ime} aus deiner Startelf spielt nicht mehr: Sein Klub hat sich aus der Liga zurückgezogen.',
      },
      naKlopi: {
        poskodba: '{ime} auf deiner Bank ist verletzt.',
        odsotnost: '{ime} auf deiner Bank ist nicht verfügbar.',
        izstop: '{ime} auf deiner Bank spielt nicht mehr: Sein Klub hat sich aus der Liga zurückgezogen.',
      },
    },
    posledica: {
      kapetan: 'Spielt er nicht, übernimmt der Vizekapitän die Binde. Wähle eventuell einen anderen Kapitän.',
      namestnik: 'Spielen weder Kapitän noch Vizekapitän, gibt es keine dreifachen Punkte.',
      vPostavi: 'Spielt er nicht, ersetzt ihn der erste Bankspieler auf derselben Position.',
      naKlopi: 'Die automatische Einwechslung überspringt ihn, wenn er nicht spielt.',
      izstop: 'Er holt keine Punkte mehr, ersetze ihn. Behältst du ihn, bleibt dein Team gültig.',
    },
  },
}
