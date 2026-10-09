// Deutsche Übersetzung von `racun` (Quelle: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Anmelden',
    naslovRegistracija: 'Registrieren',
    naslovPozabljeno: 'Passwort vergessen',
    googleNiNaVoljo: 'Die Anmeldung mit Google ist gerade nicht möglich. Verwende deine E-Mail-Adresse.',
    appleNiNaVoljo: 'Die Anmeldung mit Apple ist gerade nicht möglich. Verwende deine E-Mail-Adresse.',
    poslanaPonastavitev:
      'Wir haben dir einen Link zum Zurücksetzen des Passworts geschickt. Schau in dein Postfach (auch in den Spam-Ordner).',
    racunUstvarjen:
      'Dein Konto ist angelegt. Wir haben dir einen Bestätigungslink per E-Mail geschickt: öffne ihn und komm zurück.',
    prijavljenKot: 'Du bist angemeldet als {email}.',
    zGooglom: 'Weiter mit Google',
    zApplom: 'Weiter mit Apple',
    aliZEposto: 'oder mit E-Mail',
    prikaznoIme: 'Anzeigename',
    eposta: 'E-Mail',
    geslo: 'Passwort',
    posiljam: 'Wird gesendet …',
    ustvariRacun: 'Konto anlegen',
    posljiPovezavo: 'Link senden',
    gumbPrijava: 'Anmelden',
    zeImasRacun: 'Schon ein Konto? Anmelden',
    nimasRacuna: 'Noch kein Konto? Registrieren',
    pozabljenoGeslo: 'Passwort vergessen?',
    nazajNaPrijavo: '← Zurück zur Anmeldung',
  },
  napake: {
    napacnaPrijava: 'Falsche E-Mail-Adresse oder falsches Passwort.',
    niPotrjen: 'Deine E-Mail-Adresse ist noch nicht bestätigt. Klick auf den Link in der Nachricht, die wir dir geschickt haben.',
    zeRegistriran: 'Diese E-Mail-Adresse ist schon registriert. Melde dich an oder setz dein Passwort zurück.',
    prevecPoskusov: 'Zu viele Versuche. Warte ein paar Minuten und versuch es noch einmal.',
    sibkoGeslo: 'Das Passwort ist zu schwach. Verwende mindestens 6 Zeichen, am besten Buchstaben und Zahlen gemischt.',
    istoGeslo: 'Das neue Passwort muss sich vom alten unterscheiden.',
    neveljavenNaslov: 'Die E-Mail-Adresse ist ungültig.',
  },
  novoGeslo: {
    naslov: 'Neues Passwort',
    gesliSeNeUjemata: 'Die Passwörter stimmen nicht überein.',
    preverjam: 'Link wird geprüft …',
    neveljavna:
      'Der Link ist ungültig oder abgelaufen. Fordere auf der Seite <prijava>Anmelden</prijava> ein neues Passwort an.',
    novoGeslo: 'Neues Passwort',
    ponovi: 'Passwort wiederholen',
    shranjujem: 'Wird gespeichert …',
    shrani: 'Passwort speichern',
  },
  opomniki: {
    naslov: 'Benachrichtigungen',
    napakaNalaganja: 'Die Einstellungen konnten nicht geladen werden.',
    napakaShranjevanja: 'Speichern fehlgeschlagen. Versuch es noch einmal.',
    nalagam: 'Wird geladen …',
    moraPrijava: 'Um Erinnerungen zu bearbeiten, musst du dich <prijava>anmelden</prijava>.',
    opis: 'Vor jeder Deadline schicken wir eine kurze Nachricht an {email}, damit du nicht vergisst, dein Team anzupassen.',
    posiljaj: 'Erinnerungen per E-Mail',
    shranjujem: 'Wird gespeichert …',
    vklopljeni: 'Erinnerungen sind eingeschaltet.',
    izklopljeni: 'Wir schicken dir keine Erinnerungen mehr.',
    odjavaVprasanje: 'Willst du keine E-Mails von SLFF mehr (Erinnerungen an die Deadline und Hinweise zum Team)?',
    odjavaGumb: 'Abmelden',
    odjavaNapaka: 'Dieser Link ist ungültig. Melde dich an und schalte die Erinnerungen in den Einstellungen aus.',
    push: 'Push-Benachrichtigungen (mobile App)',
    pushOpis: 'Am Tag vor der Deadline meldet sich dein Handy, wenn dein Kader nicht bereit ist.',
    pushVklopljena: 'Push-Benachrichtigungen sind eingeschaltet.',
    pushIzklopljena: 'Wir schicken dir keine Push-Benachrichtigungen mehr.',
    pushZavrnjeno: 'Benachrichtigungen sind auf deinem Handy ausgeschaltet. Schalte sie unter Einstellungen → SLFF → Mitteilungen ein.',
    pushDovoli: 'Benachrichtigungen erlauben',
    povezava: 'Benachrichtigungseinstellungen',
  },
  // Povezava iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Wird bestätigt …',
    preverjam: 'Link wird geprüft …',
    neveljavna: 'Dieser Link ist nicht mehr gültig oder wurde schon verwendet. <prijava>Melde dich an</prijava> oder fordere einen neuen an.',
  },
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Konto löschen',
    moraPrijava: 'Um dein Konto zu löschen, musst du dich <prijava>anmelden</prijava>.',
    opis: 'Wir löschen das Konto {email}: dein Profil, alle deine Kader mit ihrem Punkteverlauf, deine Stimmen und die Mini-Ligen, die du angelegt hast. Das lässt sich nicht rückgängig machen.',
    gumb: 'Konto löschen',
    potrdi: 'Ja, endgültig löschen',
    preklici: 'Abbrechen',
    brisem: 'Wird gelöscht …',
    napaka: 'Das Konto konnte nicht gelöscht werden: {napaka}',
  },
  pravno: {
    naslov: 'Datenschutz und Nutzungsbedingungen',
    zadnjaSprememba: 'Zuletzt geändert: 9. Oktober 2026',
    kajJeNaslov: 'Was SLFF ist',
    kajJe:
      'SLFF (Sunday League Fantasy Football) ist eine Fantasy-Liga von Fans für den regionalen Amateurfußball. Sie wird von Freiwilligen betrieben und steht in keiner Verbindung zu den Landes- oder Regionalverbänden, zum nationalen Fußballverband oder zu den Klubs. Das Spiel ist gratis, ohne Einsätze und ohne Preise.',
    podatkiNaslov: 'Welche Daten wir speichern',
    podatkiEposta:
      '<b>E-Mail-Adresse und Passwort.</b> Wir brauchen sie für die Anmeldung. Das Passwort wird verschlüsselt gespeichert, wir können es nicht sehen.',
    podatkiIme:
      '<b>Anzeigename und Teamname.</b> Beide sind in der Tabelle sichtbar. Wenn du deinen Namen nicht verwenden willst, nimm einen Spitznamen.',
    podatkiEkipa:
      '<b>Dein Team und deine Stimmen.</b> Dein Kader, Kapitän, Transfers und Stimmen zu Torvorlagen oder Positionen.',
    podatkiNaprava:
      '<b>Gerätetoken für Benachrichtigungen.</b> Wenn du in der mobilen App Benachrichtigungen erlaubst, speichern wir einen Token, mit dem wir dir vor der Deadline eine Erinnerung schicken. Beim Abmelden wird er gelöscht.',
    neHranimo:
      'Wir speichern weder deine Adresse noch deine Telefonnummer oder Zahlungsdaten. Wir verwenden keine Tracking-Cookies und keine Werbetools. Dein Browser speichert deine Anmeldesitzung, eine Kennung für das Gespräch im Hilfe-Chat, falls du ihn öffnest, und Markierungen der Sitzung, damit eine Seite nicht doppelt gezählt wird. Wie viele Leute welche Seite geöffnet haben, wird nur als Tagessumme gespeichert: ohne deinen Namen, dein Konto, dein Gerät oder deine IP-Adresse. Allgemeine Besuchsstatistiken (welche Seiten, woher die Besucher kommen, Gerätetyp und Land, einige Aktionen wie das Zusammenstellen eines Teams) erfasst <b>Umami</b> auf unserem eigenen Server: ohne Cookies, ohne gespeicherte IP-Adresse, und Besuche werden nicht mit deinem Konto verknüpft. Wenn in deinem Browser "Do Not Track" eingeschaltet ist, wird nichts erfasst.',
    dostopNaslov: 'Wer Zugriff auf die Daten hat',
    dostop:
      'Die Daten liegen auf unserem eigenen Server bei <b>Hetzner</b> (Deutschland, EU); der Verkehr dorthin läuft über <b>Cloudflare</b> (Schutz und Auslieferung der Seite). E-Mails zur Bestätigung und zum Zurücksetzen des Passworts verschicken wir über unseren eigenen Mailserver (ebenfalls bei Hetzner), Benachrichtigungen in der mobilen App über <b>Google Firebase Cloud Messaging</b> (nur Gerätetoken und Text der Benachrichtigung). Der Hilfe-Chat rechts unten läuft über <b>HelpStack</b>: er bekommt, was du hineinschreibst, und, wenn du angemeldet bist, deinen Anzeigenamen, damit wir wissen, wem wir antworten. Wenn dir der Assistent im Chat hilft, sieht er auch, auf welcher Seite und in welcher Liga du bist und ob dein Team gültig ist. Deine E-Mail-Adresse geben wir nicht weiter. Wir teilen deine Daten mit niemandem sonst und verkaufen sie nicht.',
    statistikaNaslov: 'Daten über die Fußballer',
    statistika:
      'Für die Fußballer der Ligen, die wir abdecken, zeigen wir Name, Klub, Rückennummer, Einsätze, Minuten, Tore und Karten. Quelle sind die öffentlich zugänglichen offiziellen Spielberichte des Verbands, der in der Fußzeile der Seite genannt ist. Positionen und Torvorlagen, die in den Spielberichten nicht stehen, bestimmt die Community per Abstimmung, deshalb können sie falsch sein. Daraus berechnen wir Punkte und Preis des Spielers im Spiel. Wenn etwas nicht stimmt, klick auf den Spieler und sag es uns.',
    statistikaPodlaga:
      'Zweck ist ein kostenloses Fantasy-Spiel von Fans für Fans. Rechtsgrundlage ist das berechtigte Interesse (Art. 6 Abs. 1 lit. f DSGVO): Fans ein Spiel mit den veröffentlichten Ergebnissen ihrer Liga zu ermöglichen. Wir zeigen die Daten, solange der Spieler in einer von uns abgedeckten Liga spielt; 18 Monate nach seinem letzten Einsatz blenden wir seinen Namen aus.',
    statistikaUgovor:
      'Ein Spieler kann der Verarbeitung widersprechen oder die Löschung verlangen: schreib an <eposta>info@slff.eu</eposta> mit einem Link zur Seite des Spielers. Innerhalb von 14 Tagen ersetzen wir seinen Namen überall durch eine neutrale Kennung, die Statistik bleibt ohne Namen. Dasselbe tun wir auf Verlangen des Verbands.',
    grbi:
      'Die Klubwappen sind Eigentum der jeweiligen Klubs und werden nur zur Kennzeichnung der Mannschaft gezeigt. Ein Klub, der das nicht möchte, kann uns schreiben, und wir entfernen das Wappen.',
    fotografijeNaslov: 'Fotos',
    fotografije:
      'Das Foto auf der Startseite stammt von Abigail Keenan und ist auf <unsplash>Unsplash</unsplash> unter deren Lizenz veröffentlicht, die eine freie Nutzung erlaubt. Es zeigt keine Spieler aus unseren Ligen.',
    praviceNaslov: 'Deine Rechte',
    pravice:
      'Du kannst dein Konto und alle deine Daten jederzeit selbst löschen: wähl im Kontomenü <b>Konto löschen</b> (slff.eu/account). Um deinen Anzeigenamen zu ändern oder falls das Löschen nicht klappt, schreib uns an <eposta>info@slff.eu</eposta>. Mit dem Löschen des Kontos verschwindet auch dein Team aus der Tabelle.',
    pravilaNaslov: 'Spielregeln',
    pravila:
      'Eine Person, ein Konto. Die Abstimmung über Torvorlagen und Positionen ist für echte Korrekturen gedacht: absichtlich falsche Stimmen verderben allen das Spiel und können zur Löschung des Kontos führen. Punktevergabe und Preise können sich während der Saison ändern, wenn sich etwas als unfair herausstellt; solche Änderungen kündigen wir an.',
    jamstvoNaslov: 'Keine Gewähr',
    jamstvo:
      'Die Seite läuft, wie sie läuft. Wir bemühen uns, dass die Daten stimmen und die Seite erreichbar ist, garantieren können wir es aber nicht: Spielberichte können verspätet sein und Statistiken Fehler enthalten.',
  },
}
