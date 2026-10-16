// Danski prevod: `tekme` (izvor: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  krog: '{n}. runde',
  moraPrijava: 'Du skal <prijava>logge ind</prijava> for at stemme.',

  // Poster i pointopgørelsen og regler (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: 'Spillede 60 minutter eller mere',
      nastopDo60: 'Spillede op til 60 minutter',
      gol: 'Mål',
      goli: 'Mål ({n})',
      asistenca: 'Assist',
      asistence: 'Assists ({n})',
      brezPrejetega: 'Rent bur',
      zmaga: 'Holdets sejr',
      prejetiGoli: 'Mål imod ({n})',
      obranjena: 'Reddet straffespark ({n})',
      zgresena: 'Brændt straffespark ({n})',
      avtogol: 'Selvmål ({n})',
      rumeni: 'Gult kort ({n})',
      rdeci: 'Rødt kort',
    },
    pravila: {
      igralniCas: 'Spilletid',
      nastopDo60: 'Spillede op til 60 minutter',
      nastopOd60: 'Spillede 60 minutter eller mere',
      goliInAsistence: 'Mål og assists',
      golVratarja: 'Mål af en målmand',
      golBranilca: 'Mål af en forsvarsspiller',
      golVezista: 'Mål af en midtbanespiller',
      golNapadalca: 'Mål af en angriber',
      asistenca: 'Assist',
      obramba: 'Forsvar',
      csVratar: 'Rent bur: målmand',
      csBranilec: 'Rent bur: forsvarsspiller',
      csVezist: 'Rent bur: midtbanespiller',
      zmaga: 'Holdets sejr: målmand, forsvarsspiller',
      prejeta2: 'For hver 2 mål imod: målmand, forsvarsspiller',
      // Under regeltabellen på forsiden.
      opomba:
        'Rent bur tæller med mindst 60 spillede minutter; kun mål imod, mens spilleren er på banen, tæller.',
      obranjena:
        'Reddet straffespark: målmand (kamprapporten registrerer det som modstanderens brændte straffespark)',
      kazni: 'Fradrag',
      zgresena: 'Brændt straffespark',
      avtogol: 'Selvmål',
      rumeni: 'Gult kort',
      rdeci: 'Rødt kort',
    },
  },

  rezultati: {
    naslov: 'Resultater',
    uvod:
      'Spillede kampe fra kamprapporterne fra {zveza}. Klik på en kamp for at se begge opstillinger på banen; hver trøje viser de point, spilleren fik.',
    niZacetka: 'Sæsonen er ikke begyndt endnu.',
    prazenKrog: 'Der er ikke spillet nogen kampe i denne runde.',
    prejsnji: 'Forrige runde',
    naslednji: 'Næste runde',
  },

  // Stran Lestvica lige (/table): prava lestvica iz izidov in strelci.
  tabela: {
    naslov: 'Stilling',
    zavihek: '{liga} · stilling',
    uvod: 'Stillingen for {sezona}, beregnet ud fra resultaterne i kamprapporterne fra {zveza}.',
    opomba: 'Tilnærmelse: 3 point for en sejr, 1 for uafgjort; hold med lige mange point skilles af måldifferencen og derefter scorede mål. Forbundene kan bruge andre regler (indbyrdes opgør, pointfradrag); den officielle stilling findes hos {zveza}.',
    niTekem: 'Der er ikke spillet nogen kampe i denne liga endnu.',
    stolpci: {
      klub: 'Klub',
      tekme: 'K',
      zmage: 'V',
      remiji: 'U',
      porazi: 'T',
      goli: 'Mål',
      razlika: 'MF',
      tocke: 'P',
      forma: 'Form',
    },
    stolpciOpis: {
      tekme: 'Kampe',
      zmage: 'Vundne',
      remiji: 'Uafgjorte',
      porazi: 'Tabte',
      goli: 'Mål for : imod',
      razlika: 'Måldifference',
      tocke: 'Point',
    },
    forma: { W: 'V', D: 'U', L: 'T' },
    formaOpis: { W: 'sejr', D: 'uafgjort', L: 'nederlag' },
    strelci: 'Topscorere',
    niStrelcev: 'Der er ikke scoret nogen mål i denne sæson endnu.',
    stolpciStrelcev: {
      igralec: 'Spiller',
      klub: 'Klub',
      goli: 'Mål',
      tekme: 'Kampe',
      minute: 'Min.',
    },
  },

  tekma: {
    naslov: 'Kamp',
    niTekme: 'Denne kamp findes ikke i kamprapporterne.',
    nazaj: '← Resultater',
    brezPostav:
      'Kamprapporten viser ikke opstillingerne, så point pr. spiller kan ikke vises.',
    naDresu:
      'Hver trøje viser, hvor mange point spilleren fik i denne kamp. Klik på en spiller for at åbne hans side.',
    cakajo: {
      one: '{n} mål i denne kamp venter på en assist. Indtil det får en, går den, der lagde op, glip af +3 point. Fortæl os nedenfor, hvem der lagde op.',
      other: '{n} mål i denne kamp venter på en assist. Indtil de får en, går dem, der lagde op, glip af +3 point. Fortæl os nedenfor, hvem der lagde op.',
    },
    goliInAsistence: 'Mål og assists',
    prijaviSe: 'Log ind for at stemme',
  },

  // Siden Assists (afstemning om assists).
  glasovanje: {
    naslov: 'Assists',
    kdoJePodal: 'Hvem lavede assisten?',
    uvod:
      'Kamprapporterne fra {zveza} registrerer målscorerne, men ikke assists. Fællesskabet afgør det: når samme spiller får <b>{glasov}</b> for et mål, tildeles assisten, og den giver <b>+3 point</b>.',
    pragGlasov: { one: '{n} stemme', other: '{n} stemmer' },
    niTekem: 'Der er ikke spillet nogen kampe i denne sæson endnu',
    niTekemOpis:
      'Afstemningen om assists åbner, så snart første runde er spillet. Kom tilbage, når kamprapporterne er kommet.',
    arhiv: 'arkiv',
    preteklaSezona:
      'Du stemmer om en tidligere sæson. Det påvirker ikke pointene i den aktuelle liga; det retter kun historikken.',
    izberiKrog: '1. Vælg en runde',
    izberiTekmo: '2. Vælg en kamp',
    vsePotrjeno: 'Alt bekræftet',
    zaprto: 'lukket',
    poglejTekmo: 'Se opstillinger og point for denne kamp →',
    niGolov: 'Der blev ikke scoret i denne kamp.',
    vsePotrjene: 'Alle assists i denne kamp er bekræftet. 🎉',
    zaprtoOpis: 'Afstemningen om denne kamp er lukket; den er åben frem til næste rundes deadline.',
    brezPotrjene: 'Ingen bekræftet assist: {goli}.',
  },

  // Målkort med afstemning (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'ukendt målscorer',
    avtogol: 'Selvmål: {ime}',
    enajstmetrovka: '{ime}: straffespark',
    brezAsistenceOpomba: 'ingen assist',
    potrjena: 'assist bekræftet og låst',
    brezAsistence: 'Ingen assist',
    odlocilaSkupnost: 'som fællesskabet har afgjort',
    morasSePrijaviti: 'Du skal være logget ind for at stemme',
    spremeniGlas: 'Skift stemme',
    kdoJePodal: 'Hvem lavede assisten?',
    vodiBrez: 'Fører: "ingen assist"',
    vodi: 'Fører: <b>{ime}</b>',
    igralecBrezZapisa: 'spiller ikke i rapporten',
    doOdlocitve: '· {n} mere for at afgøre',
    ostali: 'Andre:',
    brezGlasovi: 'ingen ({n})',
    izberiPodajalca: 'Vælg den, der lavede assisten: {ekipa}',
    nihce: 'Ingen: mål uden assist',
  },

  // Siden Positioner (afstemning om positioner).
  pozicije: {
    naslov: 'Positioner',
    kjeKdoIgra: 'Hvem spiller hvor?',
    uvod:
      'Kamprapporterne markerer kun målmanden og viser opstillingerne efter trøjenummer, så positionerne kan ikke aflæses af dem. Fællesskabet afgør det. Nødvendige stemmer: <b>{prag}</b>; tallet falder (ned til {minPrag}), hvis den statistiske forhåndsvurdering (trøjenummer, mål, kort) peger kraftigt i én retning. Stemmer fra <b>klubinsidere</b> og brugere med <b>høj træfsikkerhed</b> vejer mere.',
    enkratNaTeden:
      'Positioner, der er stemt igennem, træder i kraft <b>én gang om ugen, mandag morgen</b>, alle på én gang. Så flytter ligaen sig ikke under fingrene på dig i løbet af ugen: det, du ser tirsdag, gælder stadig lørdag, når runden låses. En spiller, der allerede har nok stemmer, er indtil da markeret med et timeglas <ikona>⏳</ikona>.',
    klub: 'Klub',
    poznavalecOznaka: '  ★ insider',
    samoIzStatistike: 'Kun statistik ({n})',
    vsiPotrjeni: 'Alle spillere i denne klub har en bekræftet position. 🎉',
    niIgralcev: 'Ingen spillere.',
    status: {
      naslov: 'Min status som stemmegiver',
      utezOpis:
        'Vægten af hver stemme; insiderbonussen lægges til, når du stemmer om en spiller fra din klub.',
      utez: 'vægt {utez}×',
      tocnih: '({pravilni}/{vsi} rigtige)',
      klubPoznam: 'En klub, jeg kender godt (insider); min stemme om denne klubs spillere vejer mere:',
      nisemPoznavalec: '(ikke insider i nogen klub)',
      opomba:
        'En insider vælger kun én klub. Vægtene indstiller sig over tid: viser dine stemmer sig at være forkerte, falder tilliden til dig. Tilliden genberegnes ud fra tidligere stemmer, når positionen er kendt.',
    },
    igralec: {
      statistika: '{tekme} · {minute} min. · {goli} · {cs} rene bure',
      izZapisnika: 'Fra kamprapporten: målmanden er markeret med (V)',
      odKluba: 'Positionen er sat af klubben',
      klub: ' · klub',
      izStatistike: 'Fra statistik (trøjenr., mål, kort); stemmer kan rette den',
      potrdilaSkupnost: 'Bekræftet af fællesskabet',
      zapisnik: ' · kamprapport',
      uveljavitevOpis:
        'Positioner træder i kraft én gang om ugen, mandag morgen, så ligaen ikke flytter sig under fingrene på dig i løbet af ugen.',
      izglasovano: 'stemt igennem: {pozicija} · fra mandag',
      neIgraOpis: 'Spiller ikke længere og er ikke på markedet. Dukker han op i en kamprapport, vender han automatisk tilbage.',
      neIgra: 'spiller ikke længere',
      vrniOpis: 'Gør spilleren aktiv igen',
      vrni: 'gendan',
      odhodOpis:
        'Spilleren spiller ikke længere for denne klub; det fjerner ham fra markedet. En kamp i en kamprapport bringer ham automatisk tilbage.',
      statistikaKaze:
        'Statistikken peger på <b>{pozicija} ({odstotek} %)</b>: en stemme i den retning tæller mod en lavere tærskel ({nizji} i stedet for {prag}).',
      dolocenaIzStatistike: 'Positionen er sat ud fra statistik. Er den forkert, så klik på den rigtige.',
      dolocilaSkupnost: 'Positionen er sat af fællesskabet; stemmer kan rette den.',
      gumbUtez: 'Vægt {utez} / tærskel {prag}',
      gumbPrior: ' · forhåndsvurdering {odstotek} %',
      gumbPoznavalec: ' · din insiderstemme vejer mere',
      vodi: 'Fører: {pozicija}, vægt {utez} / {prag}',
    },
  },
  // Razlaga točk in cene na mestu (components/Razlaga.tsx).
  razlaga: {
    zakaj: 'Hvorfor {tocke}? Pointopgørelse',
    zapri: 'Luk',
    ostalo: 'Andet',
    brezPozicije: 'Positionen er ikke sat endnu, så mål giver endnu ikke point. Når fællesskabet bekræfter positionen, genberegnes pointene.',
    pravila1: 'Denne runde bruger de ældre regler: rent bur for målmand +4, ingen sejrsbonus.',
    asistence: 'Assists bekræftes ved fællesskabets afstemning; en ubekræftet assist giver endnu ikke point.',
    zadnjiKrog: 'Seneste kamp: {krog}. runde',
    cena: {
      zakaj: 'Hvorfor denne pris?',
      zdaj: 'Nuværende pris',
      izhodisce: 'Startpris',
      izhodisceOpis: 'Startprisen bygger på sidste sæsons minutter og point, sammenlignet med de andre spillere i ligaen.',
      privzeta: 'Spillere med færre end {minut} minutter i sidste sæson starter på {cena}, medmindre de spillede i en højere liga; så kommer prisen derfra.',
      borza: 'Efter hver runde flytter prisen sig: +{korak} for hver to point over 2 (op til +{najvec} pr. runde), −{korak} efter en dårlig runde eller dårlig form, og −{korak}, hvis spilleren misser endnu en runde i træk, mens hans klub spiller.',
      razpon: 'Prisen ligger altid mellem {od} og {do}.',
    },
  },
}
