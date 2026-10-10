// Traducere în română: `racun` (sursa: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Autentificare',
    naslovRegistracija: 'Înregistrare',
    naslovPozabljeno: 'Parolă uitată',
    googleNiNaVoljo: 'Autentificarea cu Google nu este disponibilă momentan. Folosește e-mailul.',
    appleNiNaVoljo: 'Autentificarea cu Apple nu este disponibilă momentan. Folosește e-mailul.',
    poslanaPonastavitev:
      'Ți-am trimis un link pentru resetarea parolei. Verifică-ți e-mailul (și folderul spam).',
    racunUstvarjen:
      'Contul a fost creat. Ți-am trimis pe e-mail un link de confirmare: deschide-l și revino aici.',
    prijavljenKot: 'Ești autentificat ca {email}.',
    zGooglom: 'Continuă cu Google',
    zApplom: 'Continuă cu Apple',
    aliZEposto: 'sau cu e-mail',
    prikaznoIme: 'Nume afișat',
    eposta: 'E-mail',
    geslo: 'Parolă',
    posiljam: 'Se trimite …',
    ustvariRacun: 'Creează cont',
    posljiPovezavo: 'Trimite linkul',
    gumbPrijava: 'Autentificare',
    zeImasRacun: 'Ai deja cont? Autentifică-te',
    nimasRacuna: 'Nu ai cont? Înregistrează-te',
    pozabljenoGeslo: 'Ți-ai uitat parola?',
    nazajNaPrijavo: '← Înapoi la autentificare',
  },
  napake: {
    napacnaPrijava: 'E-mail sau parolă greșită.',
    niPotrjen: 'Adresa de e-mail nu este încă confirmată. Apasă linkul din mesajul pe care ți l-am trimis.',
    zeRegistriran: 'Această adresă de e-mail este deja înregistrată. Autentifică-te sau resetează parola.',
    prevecPoskusov: 'Prea multe încercări. Așteaptă câteva minute și încearcă din nou.',
    sibkoGeslo: 'Parola e prea slabă. Folosește cel puțin 6 caractere, ideal un amestec de litere și cifre.',
    istoGeslo: 'Parola nouă trebuie să fie diferită de cea veche.',
    neveljavenNaslov: 'Adresa de e-mail nu este validă.',
  },
  novoGeslo: {
    naslov: 'Parolă nouă',
    gesliSeNeUjemata: 'Parolele nu se potrivesc.',
    preverjam: 'Se verifică linkul …',
    neveljavna:
      'Linkul nu este valid sau a expirat. Cere din nou resetarea parolei pe pagina de <prijava>autentificare</prijava>.',
    novoGeslo: 'Parolă nouă',
    ponovi: 'Repetă parola',
    shranjujem: 'Se salvează …',
    shrani: 'Salvează parola',
  },
  opomniki: {
    naslov: 'Notificări',
    napakaNalaganja: 'Setările nu au putut fi încărcate.',
    napakaShranjevanja: 'Salvarea nu a reușit. Încearcă din nou.',
    nalagam: 'Se încarcă …',
    moraPrijava: 'Ca să îți gestionezi mementourile, trebuie să te <prijava>autentifici</prijava>.',
    opis: 'Înainte de termenul etapei îți trimitem un mesaj scurt la {email}, ca să nu uiți să-ți aranjezi echipa.',
    posiljaj: 'Mementouri pe e-mail',
    shranjujem: 'Se salvează …',
    vklopljeni: 'Mementourile sunt activate.',
    izklopljeni: 'Nu-ți mai trimitem mementouri.',
    odjavaVprasanje: 'Nu mai vrei să primești e-mailuri SLFF (mementouri înainte de termen și notificări despre echipă)?',
    odjavaGumb: 'Dezabonează-mă',
    odjavaNapaka: 'Linkul nu este valid. Autentifică-te și dezactivează mementourile din setări.',
    push: 'Notificări push (aplicația mobilă)',
    pushOpis: 'Cu o zi înainte de termen, telefonul îți spune dacă echipa nu e încă pregătită.',
    pushVklopljena: 'Notificările push sunt activate.',
    pushIzklopljena: 'Nu-ți mai trimitem notificări push.',
    pushZavrnjeno: 'Notificările sunt dezactivate pe telefon. Activează-le în Setări → SLFF → Notificări.',
    pushDovoli: 'Permite notificările',
    povezava: 'Setări notificări',
  },
  potrditev: {
    naslov: 'Se confirmă …',
    preverjam: 'Se verifică linkul …',
    neveljavna: 'Linkul nu mai este valid sau a fost deja folosit. <prijava>Autentifică-te</prijava> sau cere unul nou.',
  },
  izbris: {
    naslov: 'Ștergerea contului',
    moraPrijava: 'Ca să îți ștergi contul, trebuie să te <prijava>autentifici</prijava>.',
    opis: 'Vom șterge contul {email}: profilul, toate echipele tale cu istoricul punctelor, voturile și miniligile pe care le-ai creat. Ștergerea nu poate fi anulată.',
    gumb: 'Șterge contul',
    potrdi: 'Da, șterge definitiv',
    preklici: 'Anulează',
    brisem: 'Se șterge …',
    napaka: 'Contul nu a putut fi șters: {napaka}',
  },
  pravno: {
    naslov: 'Confidențialitate și termeni',
    zadnjaSprememba: 'Ultima modificare: 9 octombrie 2026',
    kajJeNaslov: 'Ce este SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) este o ligă fantasy a suporterilor pentru ligile de fotbal amator. O facem din pasiune și nu are legătură cu Federația Română de Fotbal (FRF), asociațiile județene de fotbal sau cu cluburile. Jocul este gratuit, fără mize în bani și fără premii.',
    podatkiNaslov: 'Ce date se păstrează',
    podatkiEposta:
      '<b>Adresa de e-mail și parola.</b> Ne trebuie pentru autentificare. Parola este stocată criptat și nu o vedem.',
    podatkiIme:
      '<b>Numele afișat și numele echipei.</b> Sunt vizibile în clasament. Dacă nu vrei să-ți folosești numele, folosește o poreclă.',
    podatkiEkipa:
      '<b>Echipa ta și voturile tale.</b> Componența lotului, căpitanul, transferurile și voturile despre pase decisive sau poziții.',
    podatkiNaprava:
      '<b>Tokenul dispozitivului pentru notificări.</b> Dacă permiți notificările în aplicația mobilă, păstrăm un token prin care îți trimitem un memento înainte de termenul etapei. La deconectare îl ștergem.',
    neHranimo:
      'Nu păstrăm adresa poștală, numărul de telefon sau date despre plăți. Nu folosim cookie-uri de urmărire sau instrumente de publicitate. În browser sunt salvate sesiunea ta de autentificare, identificatorul conversației din chatul de ajutor, dacă îl deschizi, și identificatori de sesiune cu care numărăm o singură dată vizita unei pagini. Câți oameni au deschis o anumită pagină numărăm doar ca total zilnic, fără numele, contul, dispozitivul sau adresa ta IP. Statisticile generale de vizitare (ce pagini, de unde vin vizitatorii, tipul dispozitivului și țara, câteva acțiuni precum alcătuirea echipei) le înregistrează <b>Umami</b> pe serverul nostru: fără cookie-uri, nu salvează adresa IP și nu leagă vizita de contul tău. Dacă browserul are activată opțiunea „Nu urmări”, nu se înregistrează nimic.',
    dostopNaslov: 'Cine are acces la date',
    dostop:
      'Datele sunt pe serverul nostru la furnizorul <b>Hetzner</b> (Germania, UE), iar traficul către el trece prin <b>Cloudflare</b> (protecție și livrarea paginilor). E-mailurile de confirmare și de resetare trec prin serverul nostru de e-mail (tot la Hetzner), notificările din aplicația mobilă prin <b>Google Firebase Cloud Messaging</b> (doar tokenul dispozitivului și textul notificării). Chatul de ajutor din colțul din dreapta jos funcționează prin <b>HelpStack</b>: acolo ajunge ce scrii în el și, dacă ești autentificat, numele tău afișat, ca să știm cui răspundem. Când asistentul din chat te ajută, poate vedea și pe ce pagină și în ce ligă ești și dacă echipa ta e validă. Adresa de e-mail nu i-o transmitem. Nu transmitem datele nimănui altcuiva și nu le vindem.',
    statistikaNaslov: 'Date despre fotbaliști',
    statistika:
      'Pentru fotbaliștii din ligile pe care le acoperim afișăm numele, clubul, numărul de pe tricou, meciurile jucate, minutele, golurile și cartonașele. Sursa sunt foile de joc oficiale publicate public de federația menționată în subsolul paginii. Pozițiile și pasele decisive, care nu apar în foaia de joc, le stabilește comunitatea prin vot, așa că pot fi greșite. Din acestea calculăm punctele și prețul jucătorului în joc. Dacă ceva e greșit, apasă pe jucător și anunță-ne.',
    statistikaPodlaga:
      'Scopul este un joc fantasy gratuit pentru suporteri. Temeiul legal este interesul legitim (articolul 6 alineatul (1) litera (f) din GDPR): să le oferim suporterilor un joc cu rezultatele publicate public ale ligii lor. Afișăm datele cât timp jucătorul evoluează într-o ligă pe care o acoperim. În ligile austriece, la fel ca ÖFB, ascundem numele jucătorului la 18 luni după ultimul său meci.',
    statistikaUgovor:
      'Jucătorul se poate opune prelucrării sau poate cere ștergerea: scrie la <eposta>info@slff.eu</eposta> și adaugă linkul către pagina jucătorului. În 14 zile îi înlocuim numele cu o etichetă neutră în toate ligile noastre din acea țară în care îl găsim, și la importurile ulterioare. Statisticile rămân fără nume. Facem la fel la cererea federației.',
    grbi:
      'Emblemele cluburilor aparțin cluburilor respective și sunt afișate doar pentru recunoașterea echipei. Clubul care nu dorește acest lucru să ne scrie și vom elimina emblema.',
    fotografijeNaslov: 'Fotografii',
    fotografije:
      'Fotografia de pe pagina principală este realizată de Abigail Keenan și publicată pe <unsplash>Unsplash</unsplash> sub licența lor, care permite utilizarea liberă. Nu înfățișează jucători din ligile noastre.',
    praviceNaslov: 'Drepturile tale',
    pravice:
      'Îți poți șterge oricând singur contul și toate datele: în meniul contului alege <b>Ștergerea contului</b> (slff.eu/account). Pentru corectarea numelui afișat sau dacă ștergerea nu reușește, scrie-ne la <eposta>info@slff.eu</eposta>. La ștergere dispare și echipa ta din clasament.',
    pravilaNaslov: 'Regulile jocului',
    pravila:
      'Un om, un cont. Votul pentru pase decisive și poziții este pentru corecturi reale: votul greșit intenționat strică jocul pentru toți și poate duce la eliminarea contului. Punctajul și prețurile se pot schimba în timpul sezonului dacă se dovedește că ceva e nedrept; astfel de schimbări le vom anunța.',
    jamstvoNaslov: 'Fără garanție',
    jamstvo:
      'Site-ul merge așa cum merge. Ne străduim ca datele să fie corecte și site-ul să fie disponibil, dar nu putem garanta asta: foile de joc pot întârzia, iar statisticile pot conține greșeli.',
  },
}
