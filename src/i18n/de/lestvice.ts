// Deutsche Übersetzung von `lestvice` (Quelle: src/i18n/sl/lestvice.ts).
// Ordnungszahlen mit Punkt: "4. Runde", "3. Platz". Ligennamen stehen nach
// einem Doppelpunkt, damit sie nicht dekliniert werden müssen.
import type { Prevod } from '../jedro.ts'

export const lestvice: NonNullable<Prevod['lestvice']> = {
  /** "4. Runde": Rundenknöpfe und -beschriftungen. */
  krog: '{n}. Runde',
  mesto: '{mesto}. Platz',
  /** "von 5 Teams". */
  odEkip: { one: 'von {n} Team', other: 'von {n} Teams' },
  pokaziVec: 'Mehr anzeigen ({n})',
  mojeMesto: 'Mein Platz ↓',

  lestvica: {
    naslov: 'Fantasy-Tabelle',
    prazna: 'Die Tabelle ist noch leer. Stell das erste Team auf!',
    napakaKrogov:
      'Die Ergebnisse der Runden konnten nicht geladen werden ({napaka}). Die Gesamttabelle unten stimmt trotzdem.',
    tvojRezultatZadnji: 'Dein Ergebnis in der letzten Runde',
    mojaEkipa: 'Mein Team',
    zmagovalecKroga: 'Sieger der {krog}. Runde',
    zmagovalciPoKrogih: 'Sieger nach Runden',
    odigraniKrogi: {
      one: '{n} gespielte Runde',
      other: '{n} gespielte Runden',
    },
    pozneje: 'Später eingestiegen? Wähl deine Runde und spiel ab dort mit.',
    celotnaSezona: 'Ganze Saison',
    odKroga: 'Ab der {n}. Runde',
    igraOd: '· spielt seit {datum}',
    zavihekEkipe: 'Teams',
    zavihekNavijaci: 'Vereinsfans',
  },

  navijaciKlubov: {
    naslov: 'Vereinsfans',
    opis: 'Welcher Verein hat die besten Manager? Es zählt der Punkteschnitt der Fans, die in dieser Liga ein Team haben.',
    /** "Ein Verein kommt mit mindestens 3 Fans in die Tabelle." */
    pogoj: {
      one: 'Ein Verein kommt mit mindestens {n} Fan in die Tabelle.',
      other: 'Ein Verein kommt mit mindestens {n} Fans in die Tabelle.',
    },
    povprecjeSezona: 'Ø Saison',
    povprecjeKroga: 'Ø {n}. Runde',
    navijaci: 'Fans',
    tvojKlub: 'dein Verein',
    stranKluba: 'Vereinsseite →',
    premalo: 'Zu wenige Fans',
    brezNavijacev: 'Noch ohne Fans: {klubi}',
    prazno: 'In dieser Liga hat noch niemand seinen Verein gewählt. Sei der Erste!',
    izbira: {
      naslov: 'Für welchen Verein bist du?',
      opis: 'Wähl einen Verein und deine Punkte zählen in der Fantabelle für ihn.',
      izberi: 'Verein wählen',
      shrani: 'Ich bin für diesen Verein',
      spremeni: 'Den Verein kannst du jederzeit hier in der Fantabelle wechseln.',
      mojKlub: 'Du bist für <b>{klub}</b>.',
      zamenjaj: 'Verein wechseln',
    },
    klub: {
      naslov: 'Fans dieses Vereins',
      mesto: '{mesto}. Platz',
      odKlubov: {
        one: 'von {n} Verein in der Fantabelle',
        other: 'von {n} Vereinen in der Fantabelle',
      },
      manjka: {
        one: 'Für einen Platz in der Fantabelle fehlt noch {n} Fan.',
        other: 'Für einen Platz in der Fantabelle fehlen noch {n} Fans.',
      },
      brez: 'Dieser Verein hat in der Liga noch keine Fans mit Team.',
      navijam: 'Ich bin für {klub}',
      vsiKlubi: 'Alle Vereine der Liga',
    },
  },

  slovenija: {
    naslovStrani: 'Landesweite Tabelle',
    naslov: 'Landesweit',
    pripravlja: 'Die landesweite Tabelle wird vorbereitet. Versuch es in ein paar Minuten noch einmal.',
    povzetek: 'Alle Teams aller Ligen zusammen: {ekip} aus {lig} und {zvez}.',
    lig: { one: '{n} Liga', other: '{n} Ligen' },
    zvez: { one: '{n} Verband', other: '{n} Verbänden' },
    skupno: 'Gesamt',
    naKrog: 'Pro Runde',
    povprecjeRazlaga:
      'Die Ligen starten nicht gleichzeitig, deshalb sammelt ein Team aus einer früher gestarteten Liga schon allein dadurch mehr Punkte. Der Schnitt gleicht das aus; es zählen Teams mit mindestens {krogov}.',
    /** "mit mindestens 3 gespielten Runden". */
    zOdigranimiKrogi: {
      one: '{n} gespielten Runde',
      other: '{n} gespielten Runden',
    },
    premaloKrogov: 'Für den Schnitt muss ein Team mindestens {krogov} spielen. So viele hat noch keines gespielt.',
    /** "mindestens 3 Runden spielen". */
    krogovTozilnik: { one: '{n} Runde', other: '{n} Runden' },
    nobenaEkipa: 'Noch kein Team hat eine Runde gespielt.',
    lestvicaLige: 'Tabelle deiner Liga',
    zavihekEkipe: 'Teams',
    zavihekIgralci: 'Spieler',
    zavihekKlubi: 'Vereine',
    klubiUvod: 'Echte Vereinsteams, keine Fantasy-Teams: Punkte, die Spieler für das Team geholt haben · Saison {sezona}',
    klubiIgralcev: { one: '{n} Spieler', other: '{n} Spieler' },
    klubiPovprecje:
      'Die Ligen starten nicht gleichzeitig, der Schnitt pro Runde gleicht das aus; es zählen Teams mit mindestens {krogov}.',
    klubiVec: 'Mehr anzeigen',
    klubiOpomba:
      'Kampfmannschaft und Nachwuchs eines Vereins stehen getrennt. Punkte ohne Assists. Wer wechselt, beginnt beim neuen Verein bei null; zuvor geholte Punkte bleiben beim alten Verein.',
    vrhNaslov: 'Wer ist landesweit vorne?',
    vrhPoglejVse: 'Die Top 10 ansehen →',
    vrhUvod: 'Top 10 aus allen Ligen · Saison {sezona}',
    vrhTocke: 'Meiste Punkte',
    vrhGoli: 'Torschützen',
    vrhCisteMreze: 'Weiße Westen: Tormänner',
    vrhOpomba:
      'Punkte ohne Assists: Assists werden per Abstimmung bestätigt, die in den meisten Ligen noch nicht läuft, sonst wären die Ligen ungleich gestellt. Die Ligen haben unterschiedlich viele Runden gespielt.',
    vrhPrazno: 'In der laufenden Saison wurden noch keine Spiele gespielt.',
  },

  miniLige: {
    naslov: 'Mini-Ligen',
    pridruzenDobrodosel: 'Beigetreten. Willkommen in der Liga.',
    pridruzen: 'Beigetreten.',
    zeOdPrej: 'Dieses Team ist schon in dieser Mini-Liga.',
    prekratkoIme: 'Der Name der Mini-Liga braucht mindestens 2 Zeichen.',
    ustvarjena: 'Mini-Liga "{ime}" wurde erstellt. Code: {koda}',
    najprejEkipa: 'Stell zuerst in einer der Ligen ein Team auf.',
    prijava: 'Für Mini-Ligen musst du dich <prijava>anmelden</prijava>.',
    opis: 'Ein privater Wettbewerb unter Freunden. Die Teams können aus verschiedenen Ligen sein.',
    ustvari: 'Erstellen',
    imeLige: 'Name der Mini-Liga',
    ustvariLigo: 'Mini-Liga erstellen',
    novaAliKoda: 'Neue Mini-Liga oder Beitritt mit Code',
    pridruziSe: 'Beitreten',
    koda: 'Code ({n} Zeichen)',
    nisiVNobeni: 'Du bist noch in keiner Mini-Liga. Wer ist der bessere Manager: du oder deine Freunde?',
    ustvariLigoIme: 'Liga „{ime}“ erstellen',
    najprejSestavi: 'Zuerst ein Team aufstellen',
    povabilo: 'Einladung: <povezava>{povezava}</povezava><koda>Code {koda}</koda>',
    deliPovabilo: 'Einladung teilen',
    prazna: 'In dieser Mini-Liga ist noch kein Team.',
    // Ergebnis beim Teilen der Einladung (auch PovabiSoigralce).
    poslano: 'Einladung gesendet.',
    kopirano: 'Einladung kopiert. Füg sie in deine Gruppe ein.',
    neuspelo: 'Teilen hat nicht geklappt.',
    neuspeloPovezava: 'Teilen hat nicht geklappt. Den Link findest du auf der Seite Mini-Ligen.',
    // lib/miniLige
    vpisiKodo: 'Gib den Code der Mini-Liga ein.',
    dolzinaKode: 'Der Code hat {dolzina} Zeichen, du hast {vpisal} eingegeben.',
    slabiZnaki: 'Der Code enthält die Zeichen {znaki} nicht. Schau, ob du 0 und O oder 1 und I verwechselt hast.',
    besediloVabila: 'Komm in meine Mini-Liga "{ime}" bei SLFF und schlag mich: {povezava}',
    naslovVabila: 'Mini-Liga {ime} · SLFF',
    privzetoIme: '{ime} und Freunde',
    privzetoImeBrez: 'Meine Mini-Liga',
  },

  // Einladung teilen (DeliMiniLigo): nach dem Erstellen und auf der Ligaseite.
  deli: {
    naslovNova: 'Die Liga steht. Jetzt braucht sie Gegner!',
    opisNova:
      'Eine Mini-Liga mit nur einem Mitglied ist ein Tagebuch, kein Wettbewerb. Schick den Link in deine Gruppe: Wer draufklickt, ist in Sekunden in der Liga, ganz ohne Code.',
    naslovSam: 'Allein gegen dich selbst? Ohne Gegner kein Sieg.',
    opisSam: 'Schick den Link an Mitspieler, Kollegen oder an den, der bei jedem Spiel weiß, wer hätte spielen sollen.',
    naslov: 'Noch jemanden einladen',
    povezava: 'Link zum Beitreten',
    deli: 'Teilen',
    whatsapp: 'WhatsApp',
    viber: 'Viber',
    kopiraj: 'Link kopieren',
    kopirano: 'Link kopiert. Füg ihn in deine Gruppe ein.',
    koda: 'Code für die manuelle Eingabe: {koda}',
  },

  // Wochenrückblick der Mini-Liga: Geschichten der abgeschlossenen Runde.
  pregled: {
    naslov: 'Wochenrückblick',
    krog: 'Runde',
    nalaganje: 'Ich wühle mich durch die Spielberichte …',
    prazno:
      'Sobald die erste Runde gespielt ist, stehen hier die Geschichten der Woche: wer gewonnen hat, wer den Kapitän auf der Bank gelassen hat und wer den Holzlöffel mitgenommen hat.',
    samoEna: 'Sobald noch jemand beitritt, gibt es hier auch einen Sieger und einen Verlierer.',
    tockeKroga: 'Punkte der Runde',
    deliPregled: 'In die Gruppe schicken',
    kopiran: 'Rückblick kopiert. Füg ihn in deine Gruppe ein.',
    sporociloNaslov: '📊 {ime} · {krog}. Runde',
    manager: 'Manager der Runde',
    managerOpis: '{ekipa} · {tocke}. Das Recht zum Angeben gilt bis zur nächsten Runde.',
    kapetan: 'Kapitän der Runde',
    kapetanOpis: '{igralec} hat mit der Binde {tocke} geholt ({ekipa}).',
    adut: 'Geheimtipp',
    adutOpis: '{igralec} ({tocke}): außer {ekipa} hatte ihn niemand in der Startelf.',
    skok: 'Aufzug',
    skokOpis: {
      one: '{ekipa}: {n} Platz nach oben, jetzt {mesto}. Platz.',
      other: '{ekipa}: {n} Plätze nach oben, jetzt {mesto}. Platz.',
    },
    padec: 'Freier Fall',
    padecOpis: {
      one: '{ekipa}: {n} Platz nach unten, jetzt {mesto}. Platz. Der Fallschirm ist nicht aufgegangen.',
      other: '{ekipa}: {n} Plätze nach unten, jetzt {mesto}. Platz. Der Fallschirm ist nicht aufgegangen.',
    },
    klop: 'Gold auf der Bank',
    klopOpis: '{ekipa} · {tocke} auf der Bank. Trainer, wo warst du?',
    zlica: 'Holzlöffel',
    zlicaOpis: '{ekipa} · {tocke}. Die nächste Runde wird besser. Vielleicht.',
  },

  mojeMiniLige: {
    povabilo: 'Eine Tabelle unter Freunden macht mehr Spaß als unter Fremden.',
    ustvari: 'Mini-Liga erstellen',
    naslov: 'Meine Mini-Ligen',
    vse: 'alle →',
    vodi: ' · {ime} führt',
    sam: '· du bist allein, lad jemanden ein →',
  },

  povabiSoigralce: {
    naslovLiga: 'Noch jemanden in {ime} einladen',
    naslovNova: 'Aufgestellt. Jetzt lad deine Mitspieler ein.',
    opisLiga: 'Wer den Link anklickt, ist mit einem Klick in der Liga.',
    opisNova: 'Wer ist der bessere Manager? Eine Mini-Liga ist eine Tabelle nur für deine Runde.',
    trenutek: 'Einen Moment …',
    deliPovabilo: 'Einladung teilen',
    ustvariInPovabi: 'Mini-Liga erstellen und einladen',
    miniLige: 'Mini-Ligen',
  },

  vstop: {
    naslovLiga: 'Einladung: {ime}',
    naslov: 'Einladung in eine Mini-Liga',
    niLige: 'Diese Mini-Liga gibt es nicht',
    niLigeOpis:
      'Der Link ist unvollständig oder die Liga wurde gelöscht. Bitte um einen neuen oder <ustvari>erstell deine eigene</ustvari>.',
    ustvaril: 'Erstellt von {ime}',
    miniLiga: 'Mini-Liga',
    prijaviSe: 'Melde dich an oder erstell ein Konto. Nach der Anmeldung bringen wir dich hierher zurück und tragen dich in die Liga ein, ganz ohne Code.',
    prijavaAliRegistracija: 'Anmelden oder registrieren',
    nalaganjeEkip: 'Deine Teams werden geladen …',
    potrebujesEkipo:
      'Für eine Mini-Liga brauchst du ein Team. Stell eines auf, das dauert eine Minute, und beim Speichern bist du automatisch in der Liga.',
    sestaviEkipo: 'Team aufstellen',
    sKateroEkipo: 'Mit welchem Team?',
    vstopam: 'Trete bei …',
    pridruziSe: 'Mit dem Team {ime} beitreten',
  },

  ekipa: {
    naslov: 'Team',
    niEkipe: 'Dieses Team gibt es nicht.',
    okvara: 'Die Aufstellung konnte nicht geladen werden.',
    nazaj: 'Zurück zur Tabelle',
    skupaj: 'insgesamt {tocke} {beseda}',
    brezKrogov:
      'In dieser Liga ist noch keine Runde abgeschlossen. Fremde Teams werden sichtbar, sobald die Deadline vorbei ist. Bis dahin sieht sie niemand.',
    nalaganjePostave: 'Aufstellung wird geladen …',
    brezPostave: 'Dieses Team hatte in der gewählten Runde keine Aufstellung.',
    vTemKrogu: '{beseda} in dieser Runde',
    kazen: '(−{kazen} für Transfers)',
    namestnik: 'Der Kapitän hat nicht gespielt, deshalb hat der Vizekapitän den Multiplikator übernommen.',
    klop: 'Bank',
  },

  klub: {
    naslov: 'Verein',
    niKluba: 'Diesen Verein gibt es nicht.',
    brezLige: 'Dieser Verein spielt heuer in keiner Liga, die wir verfolgen.',
    naNaslovnico: 'Zur Startseite',
    liga: 'Liga',
    podnaslov: '{liga} · {igralci} im Spiel',
    uvod:
      'Die Spieler von {klub} sind Teil von <b>SLFF</b>, der Fantasy-Liga für {liga}. Fans stellen ihr eigenes Team aus echten Spielern auf, die Punkte kommen aus den <b>offiziellen Spielberichten</b>: Tore, Minuten, weiße Westen, Karten.',
    toLigo: 'diese Liga',
    navijaci: {
      one: 'Eure Spieler hat derzeit <b>{navijacev}</b> im Team.',
      other: 'Eure Spieler haben derzeit <b>{navijacev}</b> im Team.',
    },
    sestaviEkipo: 'Stell dein Team auf',
    lestvica: 'Tabelle',
    zaObjavo: 'Bilder zum Posten',
    napoved: 'Ankündigung: zum Posten beim Start',
    nasiIgralci: 'Unsere Spieler mit Punkten',
    brezStatistike: 'Für diesen Verein gibt es heuer noch keine Statistik.',
    pozicije: {
      GK: 'Tormänner',
      DEF: 'Verteidiger',
      MID: 'Mittelfeldspieler',
      FWD: 'Stürmer',
    },
    goli: '{n} T · ',
    minute: '{n} Min.',
    opomba: 'Die Punkte werden aus den offiziellen Spielberichten berechnet. Wenn etwas nicht stimmt, sagt es uns, wir korrigieren die Daten.',
  },

  plakat: {
    navijaci: { one: '{n} Fan', other: '{n} Fans' },
    stavekNavijacev: {
      one: '{navijacev} hat schon unsere Spieler im Team.',
      other: '{navijacev} haben schon unsere Spieler im Team.',
    },
    // Text auf der Leinwand.
    izNasihIgralcev: 'Stell dein Team aus unseren Spielern auf.',
    najvecTock: 'Meiste Punkte diese Saison',
    pridi: 'KOMM',
    sestavit: 'STELL DEIN',
    ekipo: 'TEAM AUF.',
    jeOdprta: 'Die Fantasy-Liga ist eröffnet: {liga}. Gratis.',
    zapisnikiMnz: 'Punkte aus offiziellen Spielberichten',
    fantasyLigaZa: 'Fantasy-Liga:',
    jeLive: 'IST LIVE.',
    pravihIgralcev: 'Stell ein Team aus echten Spielern auf. Punkte aus offiziellen Spielberichten.',
    brezplacno: 'gratis',
    mestoOd: {
      one: '{mesto}. Platz von {n} Team',
      other: '{mesto}. Platz von {n} Teams',
    },
    mojiNajboljsi: 'Meine Besten der Runde',
    premagajMe: 'Stell dein Team auf und schlag mich.',
    // Text beim Teilen.
    deliKlub: '{klub} ist in der SLFF-Fantasy-Liga. Stell dein Team aus unseren Spielern auf.',
    deliNapoved:
      'Komm und stell ein Team auf! Die Fantasy-Liga ist eröffnet: {liga}. Gratis, mit echten Spielern von {klub}.',
    deliLive: 'Die Fantasy-Liga ist live: {liga}. Stell ein Team aus echten Spielern auf, gratis.',
    deliKrog: '{ekipa}: {tocke} {beseda} in der {krog}. Runde. Stell dein Team auf und schlag mich.',
  },

  // Wochenrückblick des Teams: Hochformat-Bild für die Story (Mein Team, fremdes Team).
  zgodba: {
    naslov: 'Wochenrückblick: {krog}. Runde',
    opis: 'Ein Bild für deine Instagram- oder WhatsApp-Story: Punkte, Platz in der Liga, Kapitän und bester Spieler der Runde.',
    deli: 'Wochenrückblick teilen',
    prenesi: 'Wochenrückblick herunterladen',
    // Text auf der Leinwand.
    nadnaslov: 'WOCHENRÜCKBLICK · {krog}. RUNDE',
    vKrogu: 'in der {krog}. Runde',
    gor: '▲ {n}',
    dol: '▼ {n}',
    enako: '=',
    kapetan: 'KAPITÄN',
    namestnik: 'VIZEKAPITÄN',
    kapetanInNajboljsi: '{trak} · BESTER IM TEAM',
    najboljsi: 'BESTER IM TEAM',
    // Text beim Teilen.
    deliBesedilo: '{ekipa}: {tocke} {beseda} in der {krog}. Runde. Stell dein Team auf und schlag mich.',
    deliBesediloMesto: '{ekipa}: {tocke} {beseda} in der {krog}. Runde, {mesto}. Platz in der Liga. Stell dein Team auf und schlag mich.',
  },

  deliSliko: {
    naslov: '{naslov} · SLFF',
    kopirana: 'Link kopiert.',
    niPripravljena: 'Das Bild konnte nicht vorbereitet werden.',
    seEnkrat: 'Tipp noch einmal, um das Teilen-Menü zu öffnen.',
    niIzrisa: 'das Bild konnte nicht gezeichnet werden',
    shranjena: 'Bild gespeichert. Poste es auf Instagram, Facebook oder WhatsApp.',
    napaka: 'Das Bild konnte nicht vorbereitet werden: {napaka}',
    pripravljam: 'Wird vorbereitet …',
    deliSliko: 'Bild teilen',
    prenesi: 'Bild zum Posten herunterladen',
    deliPovezavo: 'Link teilen',
    shrani: 'Bild speichern',
    namig: 'WhatsApp, Instagram, Facebook …: wähl im Menü, das sich öffnet.',
  },
}
