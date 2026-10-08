// Magyar fordítás: `skupno` (forrás: src/i18n/sl/skupno.ts).
// Kifejezések, ahogy a megyei focipályák mellett mondják: kapus, védő, középpályás, támadó.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Kapus',
    DEF: 'Védő',
    MID: 'Középpályás',
    FWD: 'Támadó',
  },
  pozicijaKratko: {
    GK: 'KAP',
    DEF: 'VÉD',
    MID: 'KÖZ',
    FWD: 'TÁM',
  },
  // Magyar: one = 1, other = minden más. Számnév után a főnév egyes számban
  // marad ("3 pont", "5 játékos"), ezért a két alak többnyire azonos.
  besede: {
    tocke: { one: 'pont', other: 'pont' },
    tockRodilnik: { one: 'pont', other: 'pont' },
    // Tárgyeset ("1 pontot hozott").
    tockeTozilnik: { one: 'pontot', other: 'pontot' },
    igralci: { one: 'játékos', other: 'játékos' },
    ekipe: { one: 'csapat', other: 'csapat' },
    tekme: { one: 'meccs', other: 'meccs' },
    goli: { one: 'gól', other: 'gól' },
    glasovi: { one: 'szavazat', other: 'szavazat' },
    krogi: { one: 'forduló', other: 'forduló' },
  },
  cena: '{v} M€',
  nalaganje: 'Betöltés …',
  shrani: 'Mentés',
  preklici: 'Mégse',
  zapri: 'Bezárás',
  nazaj: 'Vissza',
  napaka: 'Hiba: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Ilyen kódú miniliga nincs.',
    niTvojaEkipa: 'Ez nem a te csapatod.',
    imeMiniLige: 'A miniliga neve 2 és 40 karakter között legyen.',
    prijavaMiniLiga: 'A minibajnoksághoz be kell jelentkezned.',
    niDovoljenja: 'Nincs jogod szerkeszteni ezt a csapatot.',
    kodaNeUstvarjena: 'Nem sikerült létrehozni a miniliga kódját. Próbáld újra.',
    golOdlocen: 'Erről a gólról már döntöttek, a szavazás lezárult.',
    zePoznavalec: 'Már szakértője vagy ennek a bajnokságnak.',
    prosnjaCaka: 'A kérelmed ehhez a bajnoksághoz már elbírálásra vár.',
    prosnjaZavrnjena: 'A kérelmedet ehhez a bajnoksághoz nemrég elutasították. Újat az elutasítás után 14 nappal küldhetsz.',
    klubNeIgra: 'A kiválasztott klub nem ebben a bajnokságban játszik.',
  },
}
