// Deutsche Übersetzung von `skupno` (Quelle: src/i18n/sl/skupno.ts).
// Begriffe, wie man sie am Sportplatz in Österreich sagt: Tormann, Verteidiger, Mittelfeldspieler, Stürmer.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Tormann',
    DEF: 'Verteidiger',
    MID: 'Mittelfeldspieler',
    FWD: 'Stürmer',
  },
  pozicijaKratko: {
    GK: 'TOR',
    DEF: 'VER',
    MID: 'MIT',
    FWD: 'STÜ',
  },
  // Deutsch: one = 1, other = alles andere (auch 0 und Dezimalzahlen).
  besede: {
    tocke: { one: 'Punkt', other: 'Punkte' },
    tockRodilnik: { one: 'Punkt', other: 'Punkte' },
    tockeTozilnik: { one: 'Punkt', other: 'Punkte' },
    igralci: { one: 'Spieler', other: 'Spieler' },
    ekipe: { one: 'Team', other: 'Teams' },
    tekme: { one: 'Spiel', other: 'Spiele' },
    goli: { one: 'Tor', other: 'Tore' },
    glasovi: { one: 'Stimme', other: 'Stimmen' },
    krogi: { one: 'Runde', other: 'Runden' },
  },
  cena: '{v} Mio. €',
  nalaganje: 'Wird geladen …',
  shrani: 'Speichern',
  preklici: 'Abbrechen',
  zapri: 'Schließen',
  nazaj: 'Zurück',
  napaka: 'Fehler: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Eine Mini-Liga mit diesem Code gibt es nicht.',
    niTvojaEkipa: 'Das ist nicht dein Team.',
    imeMiniLige: 'Der Name der Mini-Liga muss 2 bis 40 Zeichen haben.',
    prijavaMiniLiga: 'Für Mini-Ligen musst du dich anmelden.',
    niDovoljenja: 'Du darfst dieses Team nicht bearbeiten.',
    kodaNeUstvarjena: 'Der Code für die Mini-Liga konnte nicht erstellt werden. Versuch es noch einmal.',
    golOdlocen: 'Über dieses Tor ist schon entschieden, die Abstimmung ist beendet.',
    zePoznavalec: 'Du bist schon Insider dieser Liga.',
    prosnjaCaka: 'Deine Anfrage für diese Liga wartet bereits.',
    prosnjaZavrnjena: 'Deine Anfrage für diese Liga wurde kürzlich abgelehnt. Eine neue kannst du 14 Tage nach der Ablehnung stellen.',
    klubNeIgra: 'Der gewählte Klub spielt nicht in dieser Liga.',
  },
}
