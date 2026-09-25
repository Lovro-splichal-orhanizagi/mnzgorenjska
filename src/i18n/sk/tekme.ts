// Slovenský preklad oblasti `tekme` (zdroj: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  krog: '{n}. kolo',
  moraPrijava: 'Ak chceš hlasovať, musíš sa <prijava>prihlásiť</prijava>.',

  tockovanje: {
    postavke: {
      nastopOd60: 'Odohraných 60 minút a viac',
      nastopDo60: 'Nástup do 60 minút',
      gol: 'Gól',
      goli: 'Góly ({n})',
      asistenca: 'Asistencia',
      asistence: 'Asistencie ({n})',
      brezPrejetega: 'Čisté konto',
      prejetiGoli: 'Inkasované góly ({n})',
      obranjena: 'Chytená penalta ({n})',
      zgresena: 'Nepremenená penalta ({n})',
      avtogol: 'Vlastný gól ({n})',
      rumeni: 'Žltá karta ({n})',
      rdeci: 'Červená karta',
    },
    pravila: {
      igralniCas: 'Herný čas',
      nastopDo60: 'Nástup do 60 minút',
      nastopOd60: 'Odohraných 60 minút a viac',
      goliInAsistence: 'Góly a asistencie',
      golVratarja: 'Gól brankára',
      golBranilca: 'Gól obrancu',
      golVezista: 'Gól záložníka',
      golNapadalca: 'Gól útočníka',
      asistenca: 'Asistencia',
      obramba: 'Obrana',
      csVratarBranilec: 'Čisté konto — brankár, obranca',
      csVezist: 'Čisté konto — záložník',
      prejeta2: 'Každé 2 inkasované góly — brankár, obranca',
      obranjena:
        'Chytená penalta — brankár (zápis o stretnutí ju vedie ako nepremenenú penaltu súpera)',
      kazni: 'Tresty',
      zgresena: 'Nepremenená penalta',
      avtogol: 'Vlastný gól',
      rumeni: 'Žltá karta',
      rdeci: 'Červená karta',
    },
  },

  rezultati: {
    naslov: 'Výsledky',
    uvod:
      'Odohrané zápasy zo zápisov o stretnutí {zveza}. Klikni na zápas a uvidíš obe zostavy na ihrisku — na každom drese body, ktoré hráč získal.',
    niZacetka: 'Sezóna sa ešte nezačala.',
    prazenKrog: 'V tomto kole sa neodohrali žiadne zápasy.',
  },

  tekma: {
    naslov: 'Zápas',
    niTekme: 'Tento zápas v zápisoch o stretnutí nie je.',
    nazaj: '← Výsledky',
    brezPostav:
      'Zápis o stretnutí tohto zápasu neuvádza zostavy, preto body jednotlivých hráčov nie je možné zobraziť.',
    naDresu:
      'Na drese je uvedené, koľko bodov hráč v tomto zápase získal. Kliknutím na hráča otvoríš jeho stránku.',
    cakajo: {
      one: '{n} gól v tomto zápase čaká na asistenciu — kým ju nemá, prihrávajúci zostane bez +3 bodov. Povedz nižšie, kto prihrával.',
      few: '{n} góly v tomto zápase čakajú na asistenciu — kým ju nemajú, prihrávajúci zostane bez +3 bodov. Povedz nižšie, kto prihrával.',
      many: '{n} gólu v tomto zápase čaká na asistenciu — kým ju nemá, prihrávajúci zostane bez +3 bodov. Povedz nižšie, kto prihrával.',
      other: '{n} gólov v tomto zápase čaká na asistenciu — kým ju nemajú, prihrávajúci zostane bez +3 bodov. Povedz nižšie, kto prihrával.',
    },
    goliInAsistence: 'Góly a asistencie',
    prijaviSe: 'Prihlás sa a hlasuj',
  },

  glasovanje: {
    naslov: 'Asistencie',
    kdoJePodal: 'Kto prihrával?',
    uvod:
      'Zápisy o stretnutí {zveza} zaznamenávajú strelcov, ale asistencie nie. Určuje ich komunita: keď ten istý hráč pri góle získa <b>{glasov}</b>, asistencia sa mu uzná a prinesie <b>+3 body</b>.',
    // Akuzatív: „získa 3 hlasy“.
    pragGlasov: { one: '{n} hlas', few: '{n} hlasy', many: '{n} hlasu', other: '{n} hlasov' },
    niTekem: 'V aktuálnej sezóne sa ešte neodohrali žiadne zápasy',
    niTekemOpis:
      'Hlasovanie o asistenciách sa otvorí hneď, ako sa odohrá prvé kolo. Vráť sa, keď prídu zápisy o stretnutí.',
    arhiv: 'archív',
    preteklaSezona:
      'Hlasuješ o minulej sezóne. Body aktuálnej ligy to neovplyvní — opraví sa len história.',
    izberiKrog: '1. Vyber kolo',
    izberiTekmo: '2. Vyber zápas',
    vsePotrjeno: 'Všetko potvrdené',
    zaprto: 'uzavreté',
    poglejTekmo: 'Pozri si zostavy a body tohto zápasu →',
    niGolov: 'V tomto zápase nepadli žiadne góly.',
    vsePotrjene: 'Všetky asistencie v tomto zápase sú potvrdené. 🎉',
    zaprtoOpis: 'Hlasovanie o tomto zápase je uzavreté — je otvorené do uzávierky nasledujúceho kola.',
    brezPotrjene: 'Bez potvrdenej asistencie: {goli}.',
  },

  gol: {
    neznanStrelec: 'neznámy strelec',
    avtogol: 'Vlastný gól — {ime}',
    enajstmetrovka: '{ime} — penalta',
    brezAsistenceOpomba: 'bez asistencie',
    potrjena: 'asistencia potvrdená — uzamknuté',
    brezAsistence: 'Bez asistencie',
    odlocilaSkupnost: 'tak rozhodla komunita',
    morasSePrijaviti: 'Ak chceš hlasovať, musíš sa prihlásiť',
    spremeniGlas: 'Zmeniť hlas',
    kdoJePodal: 'Kto prihrával?',
    vodiBrez: 'Vedie „bez asistencie“',
    vodi: 'Vedie <b>{ime}</b>',
    igralecBrezZapisa: 'hráč bez záznamu',
    doOdlocitve: '— ešte {n} do rozhodnutia',
    ostali: 'Ostatní:',
    brezGlasovi: 'bez ({n})',
    izberiPodajalca: 'Vyber prihrávajúceho — {ekipa}',
    nihce: 'Nikto — gól bez asistencie',
  },

  pozicije: {
    naslov: 'Pozície',
    kjeKdoIgra: 'Kto kde hrá?',
    uvod:
      'Zápisy o stretnutí označujú len brankára a zostavy uvádzajú podľa čísel dresov — pozície sa z nich teda vyčítať nedajú. Určuje ich komunita. Potrebný počet hlasov: <b>{prag}</b> — číslo sa zníži (až na {minPrag}), ak štatistický prior (číslo dresu, góly, karty) silno ukazuje daným smerom. Hlasy <b>znalcov klubu</b> a používateľov s <b>vysokou presnosťou</b> majú väčšiu váhu.',
    enkratNaTeden:
      'Odhlasované pozície sa uplatnia <b>raz týždenne, v pondelok ráno</b>, všetky naraz. Liga sa ti tak počas týždňa nemení pod rukami: čo vidíš v utorok, platí aj v sobotu, keď sa kolo uzamkne. Hráč, ktorý už získal dosť hlasov, je dovtedy označený presýpacími hodinami <ikona>⏳</ikona>.',
    klub: 'Klub',
    poznavalecOznaka: '  ★ znalec',
    samoIzStatistike: 'Iba zo štatistiky ({n})',
    vsiPotrjeni: 'Všetci hráči tohto klubu majú potvrdenú pozíciu. 🎉',
    niIgralcev: 'Žiadni hráči.',
    status: {
      naslov: 'Môj status hlasujúceho',
      utezOpis:
        'Váha jednotlivého hlasu — sčíta sa s insider bonusom, ak hlasuješ za hráča svojho klubu.',
      utez: 'váha {utez}×',
      tocnih: '({pravilni}/{vsi} správnych)',
      klubPoznam: 'Klub, ktorý dobre poznám (znalec) — môj hlas za hráčov tohto klubu má väčšiu váhu:',
      nisemPoznavalec: '— nie som znalcom žiadneho klubu —',
      opomba:
        'Znalec si označí len jeden klub. Váhy sa časom ustália — ak sa tvoje hlasy ukážu ako nesprávne, dôvera klesá. Dôvera sa prepočíta z minulých hlasov, keď je pozícia známa.',
    },
    igralec: {
      statistika: '{tekme} · {minute} min · {goli} · čisté kontá: {cs}',
      izZapisnika: 'Zo zápisu o stretnutí',
      izStatistike: 'Zo štatistiky (č. dresu, góly, karty) — hlasy ju môžu opraviť',
      potrdilaSkupnost: 'Potvrdila komunita',
      zapisnik: ' · zápis o stretnutí',
      uveljavitevOpis:
        'Pozície sa uplatnia raz týždenne, v pondelok ráno — liga sa tak počas týždňa nemení pod rukami.',
      izglasovano: 'odhlasované: {pozicija} · v pondelok',
      neIgraOpis: 'Už nehrá — nie je na trhu. Ak sa objaví v zápise o stretnutí, vráti sa sám.',
      neIgra: 'už nehrá',
      vrniOpis: 'Vrátiť hráča medzi aktívnych',
      vrni: 'vrátiť',
      odhodOpis:
        'Hráč už v tomto klube nehrá — stiahne ho z trhu. Nástup v zápise o stretnutí ho vráti sám.',
      statistikaKaze:
        'Štatistika ukazuje na <b>{pozicija} ({odstotek} %)</b> — hlas týmto smerom sa počíta s nižšou hranicou ({nizji} namiesto {prag}).',
      dolocenaIzStatistike: 'Pozícia je určená zo štatistiky — ak nie je správna, klikni na správnu.',
      dolocilaSkupnost: 'Pozíciu určila komunita — hlasmi ju možno opraviť.',
      gumbUtez: 'Váha {utez} / hranica {prag}',
      gumbPrior: ' · prior {odstotek} %',
      gumbPoznavalec: ' · tvoj hlas ako znalca má väčšiu váhu',
      vodi: 'Vedie {pozicija} — váha {utez} / {prag}',
    },
  },
}
