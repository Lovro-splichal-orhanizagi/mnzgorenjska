// Český překlad oblasti `tekme` (zdroj: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  krog: '{n}. kolo',
  moraPrijava: 'Pokud chceš hlasovat, musíš se <prijava>přihlásit</prijava>.',

  // Postavke razčlenitve točk in pravila (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: 'Odehráno 60 minut a víc',
      nastopDo60: 'Start do 60 minut',
      gol: 'Gól',
      goli: 'Góly ({n})',
      asistenca: 'Asistence',
      asistence: 'Asistence ({n})',
      brezPrejetega: 'Čisté konto',
      zmaga: 'Výhra týmu',
      prejetiGoli: 'Obdržené góly ({n})',
      obranjena: 'Chycená penalta ({n})',
      zgresena: 'Neproměněná penalta ({n})',
      avtogol: 'Vlastní gól ({n})',
      rumeni: 'Žlutá karta ({n})',
      rdeci: 'Červená karta',
    },
    pravila: {
      igralniCas: 'Herní čas',
      nastopDo60: 'Start do 60 minut',
      nastopOd60: 'Odehráno 60 minut a víc',
      goliInAsistence: 'Góly a asistence',
      golVratarja: 'Gól brankáře',
      golBranilca: 'Gól obránce',
      golVezista: 'Gól záložníka',
      golNapadalca: 'Gól útočníka',
      asistenca: 'Asistence',
      obramba: 'Obrana',
      csVratar: 'Čisté konto: brankář',
      csBranilec: 'Čisté konto: obránce',
      csVezist: 'Čisté konto: záložník',
      zmaga: 'Výhra týmu: brankář, obránce',
      prejeta2: 'Každé 2 obdržené góly: brankář, obránce',
      // Pod tabelo pravil na naslovnici.
      opomba:
        'Obrana se počítá při alespoň 60 odehraných minutách a obdržené góly jen ty, které padnou, když je hráč na hřišti.',
      obranjena:
        'Chycená penalta: brankář (zápis o utkání ji vede jako neproměněnou penaltu soupeře)',
      kazni: 'Tresty',
      zgresena: 'Neproměněná penalta',
      avtogol: 'Vlastní gól',
      rumeni: 'Žlutá karta',
      rdeci: 'Červená karta',
    },
  },

  rezultati: {
    naslov: 'Výsledky',
    uvod:
      'Odehrané zápasy ze zápisů o utkání {zveza}. Klikni na zápas a uvidíš obě sestavy na hřišti, na každém dresu body, které hráč získal.',
    niZacetka: 'Sezóna ještě nezačala.',
    prazenKrog: 'V tomto kole se neodehrály žádné zápasy.',
    prejsnji: 'Předchozí kolo',
    naslednji: 'Další kolo',
  },

  tekma: {
    naslov: 'Zápas',
    niTekme: 'Tento zápas v zápisech o utkání není.',
    nazaj: '← Výsledky',
    brezPostav:
      'Zápis o utkání tohoto zápasu neuvádí sestavy, proto body jednotlivých hráčů nejde zobrazit.',
    naDresu:
      'Na dresu je uvedeno, kolik bodů hráč v tomto zápase získal. Kliknutím na hráče otevřeš jeho stránku.',
    cakajo: {
      one: '{n} gól v tomto zápase čeká na asistenci. Dokud ji nemá, nahrávač zůstane bez +3 bodů. Napiš níže, kdo nahrával.',
      few: '{n} góly v tomto zápase čekají na asistenci. Dokud ji nemají, nahrávač zůstane bez +3 bodů. Napiš níže, kdo nahrával.',
      many: '{n} gólu v tomto zápase čeká na asistenci. Dokud ji nemá, nahrávač zůstane bez +3 bodů. Napiš níže, kdo nahrával.',
      other: '{n} gólů v tomto zápase čeká na asistenci. Dokud ji nemají, nahrávač zůstane bez +3 bodů. Napiš níže, kdo nahrával.',
    },
    goliInAsistence: 'Góly a asistence',
    prijaviSe: 'Přihlas se a hlasuj',
  },

  // Stran Asistence (glasovanje o asistencah).
  glasovanje: {
    naslov: 'Asistence',
    kdoJePodal: 'Kdo nahrával?',
    uvod:
      'Zápisy o utkání {zveza} zaznamenávají střelce, ale asistence ne. Určuje je komunita: když stejný hráč u gólu získá <b>{glasov}</b>, asistence se mu uzná a přinese <b>+3 body</b>.',
    // Akuzativ: „získá 3 hlasy“.
    pragGlasov: { one: '{n} hlas', few: '{n} hlasy', many: '{n} hlasu', other: '{n} hlasů' },
    niTekem: 'V aktuální sezóně se zatím neodehrály žádné zápasy',
    niTekemOpis:
      'Hlasování o asistencích se otevře hned, jak se odehraje první kolo. Vrať se, až dorazí zápisy o utkání.',
    arhiv: 'archiv',
    preteklaSezona:
      'Hlasuješ o minulé sezóně. Na body aktuální ligy to nemá vliv, opraví se jen historie.',
    izberiKrog: '1. Vyber kolo',
    izberiTekmo: '2. Vyber zápas',
    vsePotrjeno: 'Vše potvrzeno',
    zaprto: 'uzavřeno',
    poglejTekmo: 'Podívej se na sestavy a body tohoto zápasu →',
    niGolov: 'V tomto zápase nepadly žádné góly.',
    vsePotrjene: 'Všechny asistence v tomto zápase jsou potvrzené. 🎉',
    zaprtoOpis: 'Hlasování o tomto zápase je uzavřené. Je otevřené do uzávěrky dalšího kola.',
    brezPotrjene: 'Bez potvrzené asistence: {goli}.',
  },

  // Kartica gola z glasovanjem (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'neznámý střelec',
    avtogol: 'Vlastní gól: {ime}',
    enajstmetrovka: '{ime} (penalta)',
    brezAsistenceOpomba: 'bez asistence',
    potrjena: 'asistence potvrzena, uzamčeno',
    brezAsistence: 'Bez asistence',
    odlocilaSkupnost: 'tak rozhodla komunita',
    morasSePrijaviti: 'Pokud chceš hlasovat, musíš se přihlásit',
    spremeniGlas: 'Změnit hlas',
    kdoJePodal: 'Kdo nahrával?',
    vodiBrez: 'Vede „bez asistence“',
    vodi: 'Vede <b>{ime}</b>',
    igralecBrezZapisa: 'hráč bez záznamu',
    doOdlocitve: '(ještě {n} do rozhodnutí)',
    ostali: 'Ostatní:',
    brezGlasovi: 'bez ({n})',
    izberiPodajalca: 'Vyber nahrávače: {ekipa}',
    nihce: 'Nikdo, gól bez asistence',
  },

  // Stran Pozicije (glasovanje o pozicijah).
  pozicije: {
    naslov: 'Pozice',
    kjeKdoIgra: 'Kdo kde hraje?',
    uvod:
      'Zápisy o utkání označují jen brankáře a sestavy uvádějí podle čísel dresů, takže se z nich pozice vyčíst nedají. Určuje je komunita. Potřebný počet hlasů: <b>{prag}</b>. Číslo se sníží (až na {minPrag}), pokud statistický prior (číslo dresu, góly, karty) silně ukazuje daným směrem. Hlasy <b>znalců klubu</b> a uživatelů s <b>vysokou přesností</b> mají větší váhu.',
    enkratNaTeden:
      'Odhlasované pozice se uplatní <b>jednou týdně, v pondělí ráno</b>, všechny najednou. Liga se ti tak během týdne nemění pod rukama: co vidíš v úterý, platí i v sobotu, kdy se kolo uzamkne. Hráč, který už získal dost hlasů, je do té doby označený přesýpacími hodinami <ikona>⏳</ikona>.',
    klub: 'Klub',
    poznavalecOznaka: '  ★ znalec',
    samoIzStatistike: 'Jen ze statistik ({n})',
    vsiPotrjeni: 'Všichni hráči tohoto klubu mají potvrzenou pozici. 🎉',
    niIgralcev: 'Žádní hráči.',
    status: {
      naslov: 'Můj status hlasujícího',
      utezOpis:
        'Váha jednotlivého hlasu. Sčítá se s insider bonusem, pokud hlasuješ pro hráče svého klubu.',
      utez: 'váha {utez}×',
      tocnih: '({pravilni}/{vsi} správně)',
      klubPoznam: 'Klub, který dobře znám (znalec). Můj hlas pro hráče tohoto klubu má větší váhu:',
      nisemPoznavalec: '- nejsem znalcem žádného klubu -',
      opomba:
        'Znalec si označí jen jeden klub. Váhy se časem ustálí: pokud se tvoje hlasy ukážou jako nesprávné, důvěra klesá. Důvěra se přepočítá z minulých hlasů, jakmile je pozice známá.',
    },
    igralec: {
      statistika: '{tekme} · {minute} min · {goli} · čistá konta: {cs}',
      izZapisnika: 'Ze zápisu o utkání (brankář je v něm označený)',
      izStatistike: 'Ze statistik (č. dresu, góly, karty), hlasy ji můžou opravit',
      potrdilaSkupnost: 'Potvrdila komunita',
      zapisnik: ' · zápis o utkání',
      uveljavitevOpis:
        'Pozice se uplatní jednou týdně, v pondělí ráno, aby se liga během týdne neměnila pod rukama.',
      izglasovano: 'odhlasováno: {pozicija} · v pondělí',
      neIgraOpis: 'Už nehraje, není na trhu. Pokud se objeví v zápisu o utkání, vrátí se sám.',
      neIgra: 'už nehraje',
      vrniOpis: 'Vrátit hráče mezi aktivní',
      vrni: 'vrátit',
      odhodOpis:
        'Hráč už v tomto klubu nehraje, stáhne ho to z trhu. Start v zápisu o utkání ho vrátí sám.',
      statistikaKaze:
        'Statistiky ukazují na <b>{pozicija} ({odstotek} %)</b>. Hlas tímto směrem se počítá s nižší hranicí ({nizji} místo {prag}).',
      dolocenaIzStatistike: 'Pozice je určená ze statistik. Pokud není správná, klikni na správnou.',
      dolocilaSkupnost: 'Pozici určila komunita, hlasy ji můžou opravit.',
      gumbUtez: 'Váha {utez} / hranice {prag}',
      gumbPrior: ' · prior {odstotek} %',
      gumbPoznavalec: ' · tvůj hlas jako znalce má větší váhu',
      vodi: 'Vede {pozicija}: váha {utez} / {prag}',
    },
  },
}
