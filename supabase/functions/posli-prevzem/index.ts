// Edge Function: posli-prevzem
//
// Klubu pošlje zahtevek "To sem jaz" v potrditev: enkratna povezava
// (`/claim#<žeton>`, velja 14 dni) z imenom in e-naslovom prosilca. Pošlje
// le na ukaz admina (Administracija → Prevzemi profilov → "pošlji klubu"):
// `{"zahtevek": <id>, "na"?: "<naslov kluba>"}`. Žeton in naslov da SQL
// `admin_prevzem_zeton_za_klub` (admin, sicer prvi uporaben naslov iz
// `klub_stik`; žeton v bazi le zgoščen). Mail gre v `email_log` in
// `klub_stik_posta` (vrsta `drugo`), da ga vidijo vsi, ki pišejo klubom.
// Samodejnega pošiljanja ni (migracija 20261012141100).
//
// Kliče admin (Bearer <access_token>, preveri `is_admin`) ali servis.
// Preizkus brez kluba (servis): {"test_zahtevek": <id>, "test_na": "<naslov>"};
// nič ne gre v stike kluba.
//
// Skrivnosti so iste kot pri posli-opomnik (SMTP_HOST, SMTP_USER, SMTP_PASS,
// EMAIL_FROM); novih ni. Objava: scripts/hetzner/objavi-funkcije.sh posli-prevzem
//
// Jezik: država lige (BESEDILA), neznana država angleško. Odgovori na info@.
//
// `{"obvesti": true}` (kdorkoli, tudi brez prijave): vsem potrjenim, še
// neobveščenim igralcem pošlje "profil je potrjen" s povezavo na profil
// (`prevzem_neobvesceni`, nato `prevzem_obvescen`) — vsak zahtevek enkrat,
// zato je klic brez prijave neškodljiv. Vmesnik ga sproži po potrditvi.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4'
import nodemailer from 'npm:nodemailer@6.9.16'
import { postavi } from '../_shared/mail.ts'

interface Vrstica {
  zahtevek_id: number
  zeton: string
  email: string
  klub: string
  igralec: string
  liga_slug: string
  liga: string
  drzava: string | null
  prosilec: string | null
  prosilec_email: string | null
  expires_at: string
  klub_stik_id: number | null
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const smtp = nodemailer.createTransport({
  host: Deno.env.get('SMTP_HOST') ?? 'mail.slff.eu',
  port: 465,
  secure: true,
  auth: { user: Deno.env.get('SMTP_USER') ?? 'noreply@slff.eu', pass: Deno.env.get('SMTP_PASS') },
})

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// Besedila po jeziku države lige. {p} prosilec, {i} igralec, {k} klub, {l} liga, {d} datum.
// Brez pomišljajev. Neznana država: angleščina.
const BESEDILA: Record<string, { jezik: string; naslov: string; uvod: string; prosnja: string; gumb: string; velja: string; pozdrav: string; podpis: string }> = {
  SI: { jezik: 'sl-SI', naslov: 'Je {i} vaš igralec?', pozdrav: 'Pozdravljeni,',
    uvod: 'SLFF (slff.eu) je brezplačna fantasy liga za amaterski nogomet, točke se računajo iz uradnih zapisnikov.',
    prosnja: 'Uporabnik {p} trdi, da je igralec {i} vašega kluba {k} ({l}). Če ga poznate, prosimo, potrdite ali zavrnite:',
    gumb: 'Potrdite ali zavrnite', velja: 'Povezava velja do {d} in le enkrat. Potrjen igralec lahko na svojem profilu doda vzdevek, fotografijo in opis; uradnih podatkov iz zapisnikov ne more spreminjati. Za vprašanja odgovorite na ta mail.', podpis: 'Jernej, SLFF' },
  HR: { jezik: 'hr-HR', naslov: 'Je li {i} vaš igrač?', pozdrav: 'Poštovani,',
    uvod: 'SLFF (slff.eu) je besplatna fantasy liga za amaterski nogomet, bodovi se računaju iz službenih zapisnika.',
    prosnja: 'Korisnik {p} tvrdi da je igrač {i} vašeg kluba {k} ({l}). Ako ga poznajete, molimo potvrdite ili odbijte:',
    gumb: 'Potvrdite ili odbijte', velja: 'Poveznica vrijedi do {d} i samo jednom. Potvrđeni igrač na svom profilu može dodati nadimak, fotografiju i opis; službene podatke iz zapisnika ne može mijenjati. Za pitanja odgovorite na ovaj e-mail.', podpis: 'Jernej, SLFF' },
  SK: { jezik: 'sk-SK', naslov: 'Je {i} váš hráč?', pozdrav: 'Dobrý deň,',
    uvod: 'SLFF (slff.eu) je bezplatná fantasy liga pre amatérsky futbal, body sa počítajú z oficiálnych zápisov.',
    prosnja: 'Používateľ {p} tvrdí, že je hráč {i} vášho klubu {k} ({l}). Ak ho poznáte, prosím, potvrďte alebo zamietnite:',
    gumb: 'Potvrdiť alebo zamietnuť', velja: 'Odkaz platí do {d} a len raz. Potvrdený hráč si môže na profil pridať prezývku, fotku a popis; oficiálne údaje zo zápisov meniť nemôže. S otázkami odpovedzte na tento e-mail.', podpis: 'Jernej, SLFF' },
  CZ: { jezik: 'cs-CZ', naslov: 'Je {i} váš hráč?', pozdrav: 'Dobrý den,',
    uvod: 'SLFF (slff.eu) je bezplatná fantasy liga pro amatérský fotbal, body se počítají z oficiálních zápisů.',
    prosnja: 'Uživatel {p} tvrdí, že je hráč {i} vašeho klubu {k} ({l}). Pokud ho znáte, prosím potvrďte nebo zamítněte:',
    gumb: 'Potvrdit nebo zamítnout', velja: 'Odkaz platí do {d} a jen jednou. Potvrzený hráč si může na profil přidat přezdívku, fotku a popis; oficiální údaje ze zápisů měnit nemůže. S dotazy odpovězte na tento e-mail.', podpis: 'Jernej, SLFF' },
  HU: { jezik: 'hu-HU', naslov: '{i} az önök játékosa?', pozdrav: 'Tisztelt Klub!',
    uvod: 'Az SLFF (slff.eu) ingyenes fantasy liga az amatőr labdarúgáshoz, a pontok a hivatalos jegyzőkönyvekből számítódnak.',
    prosnja: '{p} felhasználó azt állítja, hogy ő {i}, a(z) {k} játékosa ({l}). Ha ismerik, kérjük, erősítsék meg vagy utasítsák el:',
    gumb: 'Megerősítés vagy elutasítás', velja: 'A link {d}-ig és csak egyszer érvényes. A megerősített játékos becenevet, fényképet és bemutatkozást adhat a profiljához; a jegyzőkönyvek hivatalos adatait nem módosíthatja. Kérdés esetén válaszoljanak erre az e-mailre.', podpis: 'Jernej, SLFF' },
  AT: { jezik: 'de-AT', naslov: 'Ist {i} Ihr Spieler?', pozdrav: 'Sehr geehrte Damen und Herren,',
    uvod: 'SLFF (slff.eu) ist eine kostenlose Fantasy-Liga für den Amateurfußball, die Punkte stammen aus den offiziellen Spielberichten.',
    prosnja: 'Der Nutzer {p} gibt an, {i} zu sein, Spieler Ihres Vereins {k} ({l}). Wenn Sie ihn kennen, bestätigen oder lehnen Sie bitte ab:',
    gumb: 'Bestätigen oder ablehnen', velja: 'Der Link gilt bis {d} und nur einmal. Ein bestätigter Spieler kann seinem Profil Spitzname, Foto und Beschreibung hinzufügen; die offiziellen Daten aus den Spielberichten kann er nicht ändern. Bei Fragen antworten Sie einfach auf diese E-Mail.', podpis: 'Jernej, SLFF' },
  RS: { jezik: 'sr-Latn-RS', naslov: 'Da li je {i} vaš igrač?', pozdrav: 'Poštovani,',
    uvod: 'SLFF (slff.eu) je besplatna fantasy liga za amaterski fudbal, bodovi se računaju iz zvaničnih zapisnika.',
    prosnja: 'Korisnik {p} tvrdi da je igrač {i} vašeg kluba {k} ({l}). Ako ga poznajete, molimo potvrdite ili odbijte:',
    gumb: 'Potvrdite ili odbijte', velja: 'Link važi do {d} i samo jednom. Potvrđeni igrač na svom profilu može da doda nadimak, fotografiju i opis; zvanične podatke iz zapisnika ne može da menja. Za pitanja odgovorite na ovaj mejl.', podpis: 'Jernej, SLFF' },
  RO: { jezik: 'ro-RO', naslov: 'Este {i} jucătorul dumneavoastră?', pozdrav: 'Bună ziua,',
    uvod: 'SLFF (slff.eu) este o ligă fantasy gratuită pentru fotbalul amator, punctele se calculează din rapoartele oficiale de meci.',
    prosnja: 'Utilizatorul {p} afirmă că este {i}, jucător al clubului dumneavoastră {k} ({l}). Dacă îl cunoașteți, vă rugăm să confirmați sau să respingeți:',
    gumb: 'Confirmați sau respingeți', velja: 'Linkul este valabil până la {d} și o singură dată. Un jucător confirmat își poate adăuga porecla, fotografia și o descriere; datele oficiale din rapoarte nu le poate modifica. Pentru întrebări, răspundeți la acest e-mail.', podpis: 'Jernej, SLFF' },
  EE: { jezik: 'et-EE', naslov: 'Kas {i} on teie mängija?', pozdrav: 'Tere,',
    uvod: 'SLFF (slff.eu) on tasuta fantasy-liiga amatöörjalgpallile, punktid arvutatakse ametlikest mänguprotokollidest.',
    prosnja: 'Kasutaja {p} väidab, et ta on {i}, teie klubi {k} mängija ({l}). Kui tunnete teda, palun kinnitage või lükake tagasi:',
    gumb: 'Kinnita või lükka tagasi', velja: 'Link kehtib kuni {d} ja ainult üks kord. Kinnitatud mängija saab lisada hüüdnime, foto ja tutvustuse; protokollide ametlikke andmeid ta muuta ei saa. Küsimuste korral vastake sellele e-kirjale.', podpis: 'Jernej, SLFF' },
  PL: { jezik: 'pl-PL', naslov: 'Czy {i} to wasz zawodnik?', pozdrav: 'Dzień dobry,',
    uvod: 'SLFF (slff.eu) to darmowa liga fantasy dla piłki amatorskiej, punkty liczone są z oficjalnych protokołów meczowych.',
    prosnja: 'Użytkownik {p} twierdzi, że jest zawodnikiem {i} waszego klubu {k} ({l}). Jeśli go znacie, prosimy o potwierdzenie lub odrzucenie:',
    gumb: 'Potwierdź lub odrzuć', velja: 'Link jest ważny do {d} i tylko raz. Potwierdzony zawodnik może dodać pseudonim, zdjęcie i opis; oficjalnych danych z protokołów nie może zmieniać. W razie pytań prosimy odpowiedzieć na tego e-maila.', podpis: 'Jernej, SLFF' },
  ES: { jezik: 'es-ES', naslov: '¿Es {i} jugador de su club?', pozdrav: 'Buenos días:',
    uvod: 'SLFF (slff.eu) es una liga fantasy gratuita para el fútbol aficionado, los puntos salen de las actas oficiales.',
    prosnja: 'El usuario {p} afirma ser {i}, jugador de su club {k} ({l}). Si lo conocen, por favor confirmen o rechacen:',
    gumb: 'Confirmar o rechazar', velja: 'El enlace es válido hasta el {d} y una sola vez. Un jugador confirmado puede añadir apodo, foto y descripción; no puede cambiar los datos oficiales de las actas. Para cualquier duda, respondan a este correo.', podpis: 'Jernej, SLFF' },
  LV: { jezik: 'lv-LV', naslov: 'Vai {i} ir jūsu spēlētājs?', pozdrav: 'Labdien!',
    uvod: 'SLFF (slff.eu) ir bezmaksas fantasy līga amatieru futbolam, punkti tiek aprēķināti no oficiālajiem spēļu protokoliem.',
    prosnja: 'Lietotājs {p} apgalvo, ka ir {i}, jūsu kluba {k} spēlētājs ({l}). Ja jūs viņu pazīstat, lūdzu, apstipriniet vai noraidiet:',
    gumb: 'Apstiprināt vai noraidīt', velja: 'Saite ir derīga līdz {d} un tikai vienu reizi. Apstiprināts spēlētājs var pievienot iesauku, foto un aprakstu; oficiālos protokolu datus viņš mainīt nevar. Jautājumu gadījumā atbildiet uz šo e-pastu.', podpis: 'Jernej, SLFF' },
  MK: { jezik: 'mk-MK', naslov: 'Дали {i} е ваш играч?', pozdrav: 'Почитувани,',
    uvod: 'SLFF (slff.eu) е бесплатна фантази лига за аматерски фудбал, поените се пресметуваат од официјалните записници.',
    prosnja: 'Корисникот {p} тврди дека е {i}, играч на вашиот клуб {k} ({l}). Ако го познавате, ве молиме потврдете или одбијте:',
    gumb: 'Потврдете или одбијте', velja: 'Врската важи до {d} и само еднаш. Потврдениот играч може да додаде прекар, фотографија и опис; официјалните податоци од записниците не може да ги менува. За прашања одговорете на оваа порака.', podpis: 'Jernej, SLFF' },
  GR: { jezik: 'el-GR', naslov: 'Είναι ο {i} παίκτης σας;', pozdrav: 'Καλησπέρα σας,',
    uvod: 'Το SLFF (slff.eu) είναι ένα δωρεάν fantasy πρωτάθλημα για το ερασιτεχνικό ποδόσφαιρο. Οι πόντοι υπολογίζονται από τα επίσημα φύλλα αγώνα.',
    prosnja: 'Ο χρήστης {p} δηλώνει ότι είναι ο {i}, παίκτης του συλλόγου σας {k} ({l}). Αν τον γνωρίζετε, παρακαλούμε επιβεβαιώστε ή απορρίψτε:',
    gumb: 'Επιβεβαίωση ή απόρριψη', velja: 'Ο σύνδεσμος ισχύει έως {d} και μόνο μία φορά. Ένας επιβεβαιωμένος παίκτης μπορεί να προσθέσει ψευδώνυμο, φωτογραφία και περιγραφή, αλλά δεν μπορεί να αλλάξει τα επίσημα στοιχεία των φύλλων αγώνα. Για ερωτήσεις απαντήστε σε αυτό το email.', podpis: 'Jernej, SLFF' },
  TR: { jezik: 'tr-TR', naslov: '{i} sizin oyuncunuz mu?', pozdrav: 'Sayın yetkili,',
    uvod: 'SLFF (slff.eu), amatör futbol için ücretsiz bir fantezi ligidir; puanlar resmi maç raporlarından hesaplanır.',
    prosnja: 'Kullanıcı {p}, kulübünüzün oyuncusu {i} olduğunu belirtiyor (kulüp: {k}, lig: {l}). Kendisini tanıyorsanız lütfen onaylayın veya reddedin:',
    gumb: 'Onaylayın veya reddedin', velja: 'Bağlantı {d} tarihine kadar ve yalnızca bir kez geçerlidir. Onaylanan oyuncu profiline takma ad, fotoğraf ve açıklama ekleyebilir; maç raporlarındaki resmi bilgileri değiştiremez. Sorularınız için bu e-postayı yanıtlayın.', podpis: 'Jernej, SLFF' },
  UA: { jezik: 'uk-UA', naslov: '{i} ваш гравець?', pozdrav: 'Добрий день,',
    uvod: 'SLFF (slff.eu) це безкоштовна фентезі-ліга для аматорського футболу, очки рахуються за офіційними протоколами матчів.',
    prosnja: 'Користувач {p} стверджує, що він {i}, гравець вашого клубу {k} ({l}). Якщо ви його знаєте, будь ласка, підтвердьте або відхиліть:',
    gumb: 'Підтвердити або відхилити', velja: 'Посилання дійсне до {d} і лише один раз. Підтверджений гравець може додати до профілю нік, фото й опис; офіційні дані з протоколів він змінити не може. Із запитаннями просто відповідайте на цей лист.', podpis: 'Jernej, SLFF' },
  AM: { jezik: 'hy-AM', naslov: 'Արդյո՞ք {i} ձեր խաղացողն է', pozdrav: 'Հարգելի գործընկերներ,',
    uvod: 'SLFF-ը (slff.eu) անվճար ֆենթեզի լիգա է սիրողական ֆուտբոլի համար, միավորները հաշվարկվում են պաշտոնական արձանագրություններից։',
    prosnja: 'Օգտատերը ({p}) հայտնում է, որ ինքը ձեր ակումբի խաղացողն է՝ {i} (ակումբ՝ {k}, լիգա՝ {l})։ Եթե ճանաչում եք նրան, խնդրում ենք հաստատել կամ մերժել։',
    gumb: 'Հաստատել կամ մերժել', velja: 'Հղումը գործում է մինչև {d} և միայն մեկ անգամ։ Հաստատված խաղացողը կարող է իր պրոֆիլում ավելացնել մականուն, լուսանկար և նկարագրություն, բայց չի կարող փոխել արձանագրությունների պաշտոնական տվյալները։ Հարցերի դեպքում պատասխանեք այս նամակին։', podpis: 'Jernej, SLFF' },
  AZ: { jezik: 'az-Latn-AZ', naslov: '{i} sizin oyunçunuzdur?', pozdrav: 'Salam,',
    uvod: 'SLFF (slff.eu) həvəskar futbol üçün pulsuz fantasy liqadır, xallar rəsmi oyun protokollarından hesablanır.',
    prosnja: '{p} istifadəçisi sizin {k} ({l}) klubunuzun oyunçusu {i} olduğunu bildirir. Onu tanıyırsınızsa, zəhmət olmasa təsdiqləyin və ya rədd edin:',
    gumb: 'Təsdiqləyin və ya rədd edin', velja: 'Keçid {d} tarixinə qədər və yalnız bir dəfə etibarlıdır. Təsdiqlənmiş oyunçu profilinə ləqəb, şəkil və təsvir əlavə edə bilər; oyun protokollarındakı rəsmi məlumatları dəyişə bilməz. Suallarınız üçün bu məktuba cavab yazın.', podpis: 'Jernej, SLFF' },
  DK: { jezik: 'da-DK', naslov: 'Er {i} jeres spiller?', pozdrav: 'Hej,',
    uvod: 'SLFF (slff.eu) er en gratis fantasyliga for amatørfodbold; pointene beregnes ud fra de officielle kamprapporter.',
    prosnja: 'Brugeren {p} oplyser at være {i}, spiller i jeres klub {k} ({l}). Hvis I kender ham, så bekræft eller afvis venligst:',
    gumb: 'Bekræft eller afvis', velja: 'Linket gælder til {d} og kun én gang. En bekræftet spiller kan tilføje kaldenavn, foto og beskrivelse til sin profil, men kan ikke ændre de officielle data fra kamprapporterne. Har I spørgsmål, så svar blot på denne mail.', podpis: 'Jernej, SLFF' },
  EN: { jezik: 'en-GB', naslov: 'Is {i} your player?', pozdrav: 'Hello,',
    uvod: 'SLFF (slff.eu) is a free fantasy league for amateur football; points come from the official match reports.',
    prosnja: 'The user {p} says they are {i}, a player of your club {k} ({l}). If you know them, please confirm or reject:',
    gumb: 'Confirm or reject', velja: 'The link is valid until {d} and works once. A confirmed player can add a nickname, photo and short bio to their profile; official match report data cannot be changed. For questions, just reply to this email.', podpis: 'Jernej, SLFF' },
}

// Črna gora, Bosna in Hercegovina in Moldavija pišejo v jeziku sosede (kot
// vmesnik), datum po svoje. Združeno kraljestvo in Malta dobita angleščino (EN).
BESEDILA.ME = { ...BESEDILA.RS, jezik: 'sr-Latn-ME' }
BESEDILA.BA = { ...BESEDILA.HR, jezik: 'hr-BA' }
BESEDILA.MD = { ...BESEDILA.RO, jezik: 'ro-MD' }

function sestavi(v: Vrstica): { naslov: string; html: string; besedilo: string } {
  const b = BESEDILA[v.drzava ?? ''] ?? BESEDILA.EN
  const povezava = `https://slff.eu/claim#${v.zeton}`
  const d = new Date(v.expires_at).toLocaleDateString(b.jezik)
  // Klub prosilca prepozna po e-naslovu, ne po prikaznem imenu. Pomišljaj iz
  // imena lige ("1. GNL — člani") v mailu zamenja vejica.
  const prosilec = v.prosilec_email ? `${v.prosilec ?? '?'} (${v.prosilec_email})` : (v.prosilec ?? '?')
  const liga = v.liga.replaceAll(' — ', ', ')
  const vstavi = (t: string, h: (x: string) => string = (x) => x) =>
    t.replaceAll('{p}', h(prosilec)).replaceAll('{i}', h(v.igralec)).replaceAll('{k}', h(v.klub))
      .replaceAll('{l}', h(liga)).replaceAll('{d}', d)
  const krepko = (x: string) => `<b>${esc(x)}</b>`
  return {
    naslov: vstavi(b.naslov),
    besedilo: `${b.pozdrav}\n\n${b.uvod}\n\n${vstavi(b.prosnja)}\n\n${povezava}\n\n${vstavi(b.velja)}\n\n${b.podpis}`,
    // Skupna oblika (_shared/mail.ts); čistopis zgoraj ostane ročno napisan.
    html: postavi({
      jezik: b.jezik,
      zadeva: vstavi(b.naslov),
      predglava: vstavi(b.prosnja).replace(/:$/, '.'),
      naslov: esc(vstavi(b.naslov)),
      uvod: `${esc(b.pozdrav)} ${vstavi(esc(b.prosnja), krepko)}`,
      gumb: { label: b.gumb, url: povezava },
      potem: esc(vstavi(b.velja)),
      opomba: `${esc(b.uvod)}<br>${esc(b.podpis)}`,
      noga: {},
    }).html,
  }
}

// Mail potrjenemu igralcu. {i} igralec, {k} klub, {l} liga, {u} povezava. Brez pomišljajev.
const POTRJEN: Record<string, { naslov: string; telo: string; gumb: string }> = {
  SI: { naslov: 'Tvoj profil na SLFF je potrjen', gumb: 'Odpri svoj profil',
    telo: 'Živjo,\n\npotrdili smo, da si {i} ({k}, {l}). Profil je zdaj tvoj.\n\nNanj lahko dodaš fotografijo, vzdevek, kratek opis ter Instagram, TikTok ali Facebook. Prijavi se z istim računom in odpri svoj profil:\n{u}\n\nUradnih podatkov iz zapisnikov (ime, klub, statistika) ni mogoče spreminjati. Če kaj ni prav, odgovori na ta mail.' },
  HR: { naslov: 'Tvoj profil na SLFF je potvrđen', gumb: 'Otvori svoj profil',
    telo: 'Bok,\n\npotvrdili smo da si {i} ({k}, {l}). Profil je sada tvoj.\n\nNa njega možeš dodati fotografiju, nadimak, kratak opis te Instagram, TikTok ili Facebook. Prijavi se istim računom i otvori svoj profil:\n{u}\n\nSlužbeni podaci iz zapisnika (ime, klub, statistika) ne mogu se mijenjati. Ako nešto nije u redu, odgovori na ovaj e-mail.' },
  SK: { naslov: 'Tvoj profil na SLFF je potvrdený', gumb: 'Otvoriť môj profil',
    telo: 'Ahoj,\n\npotvrdili sme, že si {i} ({k}, {l}). Profil je teraz tvoj.\n\nMôžeš si naň pridať fotku, prezývku, krátky popis a Instagram, TikTok alebo Facebook. Prihlás sa tým istým účtom a otvor svoj profil:\n{u}\n\nOficiálne údaje zo zápisov (meno, klub, štatistiky) sa meniť nedajú. Ak niečo nesedí, odpovedz na tento e-mail.' },
  CZ: { naslov: 'Tvůj profil na SLFF je potvrzený', gumb: 'Otevřít můj profil',
    telo: 'Ahoj,\n\npotvrdili jsme, že jsi {i} ({k}, {l}). Profil je teď tvůj.\n\nMůžeš si na něj přidat fotku, přezdívku, krátký popis a Instagram, TikTok nebo Facebook. Přihlas se stejným účtem a otevři svůj profil:\n{u}\n\nOficiální údaje ze zápisů (jméno, klub, statistiky) měnit nelze. Pokud něco nesedí, odpověz na tento e-mail.' },
  HU: { naslov: 'Az SLFF-profilod megerősítve', gumb: 'Profilom megnyitása',
    telo: 'Szia!\n\nMegerősítettük, hogy te vagy {i} ({k}, {l}). A profil mostantól a tiéd.\n\nHozzáadhatsz fényképet, becenevet, rövid bemutatkozást, valamint Instagramot, TikTokot vagy Facebookot. Jelentkezz be ugyanazzal a fiókkal, és nyisd meg a profilodat:\n{u}\n\nA jegyzőkönyvek hivatalos adatai (név, klub, statisztika) nem módosíthatók. Ha valami nem stimmel, válaszolj erre az e-mailre.' },
  AT: { naslov: 'Dein SLFF-Profil ist bestätigt', gumb: 'Mein Profil öffnen',
    telo: 'Hallo,\n\nwir haben bestätigt, dass du {i} bist ({k}, {l}). Das Profil gehört jetzt dir.\n\nDu kannst ein Foto, einen Spitznamen, eine kurze Beschreibung sowie Instagram, TikTok oder Facebook hinzufügen. Melde dich mit demselben Konto an und öffne dein Profil:\n{u}\n\nDie offiziellen Daten aus den Spielberichten (Name, Verein, Statistik) können nicht geändert werden. Wenn etwas nicht stimmt, antworte einfach auf diese E-Mail.' },
  RS: { naslov: 'Tvoj profil na SLFF je potvrđen', gumb: 'Otvori svoj profil',
    telo: 'Zdravo,\n\npotvrdili smo da si {i} ({k}, {l}). Profil je sada tvoj.\n\nNa njega možeš da dodaš fotografiju, nadimak, kratak opis i Instagram, TikTok ili Facebook. Prijavi se istim nalogom i otvori svoj profil:\n{u}\n\nZvanični podaci iz zapisnika (ime, klub, statistika) ne mogu da se menjaju. Ako nešto nije u redu, odgovori na ovaj mejl.' },
  RO: { naslov: 'Profilul tău SLFF este confirmat', gumb: 'Deschide profilul meu',
    telo: 'Salut,\n\nam confirmat că ești {i} ({k}, {l}). Profilul este acum al tău.\n\nPoți adăuga o fotografie, o poreclă, o scurtă descriere și Instagram, TikTok sau Facebook. Conectează-te cu același cont și deschide-ți profilul:\n{u}\n\nDatele oficiale din rapoarte (nume, club, statistici) nu pot fi modificate. Dacă ceva nu e în regulă, răspunde la acest e-mail.' },
  EE: { naslov: 'Sinu SLFF-i profiil on kinnitatud', gumb: 'Ava minu profiil',
    telo: 'Tere,\n\nkinnitasime, et oled {i} ({k}, {l}). Profiil on nüüd sinu.\n\nSaad lisada foto, hüüdnime, lühikese tutvustuse ning Instagrami, TikToki või Facebooki. Logi sisse sama kontoga ja ava oma profiil:\n{u}\n\nProtokollide ametlikke andmeid (nimi, klubi, statistika) muuta ei saa. Kui midagi on valesti, vasta sellele e-kirjale.' },
  PL: { naslov: 'Twój profil w SLFF jest potwierdzony', gumb: 'Otwórz mój profil',
    telo: 'Cześć,\n\npotwierdziliśmy, że jesteś {i} ({k}, {l}). Profil jest teraz Twój.\n\nMożesz dodać zdjęcie, pseudonim, krótki opis oraz Instagram, TikTok lub Facebook. Zaloguj się tym samym kontem i otwórz swój profil:\n{u}\n\nOficjalnych danych z protokołów (imię, klub, statystyki) nie można zmieniać. Jeśli coś się nie zgadza, odpowiedz na tego e-maila.' },
  ES: { naslov: 'Tu perfil en SLFF está confirmado', gumb: 'Abrir mi perfil',
    telo: 'Hola,\n\nhemos confirmado que eres {i} ({k}, {l}). El perfil ya es tuyo.\n\nPuedes añadir una foto, un apodo, una breve descripción e Instagram, TikTok o Facebook. Inicia sesión con la misma cuenta y abre tu perfil:\n{u}\n\nLos datos oficiales de las actas (nombre, club, estadísticas) no se pueden cambiar. Si algo no está bien, responde a este correo.' },
  LV: { naslov: 'Tavs SLFF profils ir apstiprināts', gumb: 'Atvērt manu profilu',
    telo: 'Sveiks,\n\nmēs apstiprinājām, ka tu esi {i} ({k}, {l}). Profils tagad ir tavs.\n\nTu vari pievienot foto, iesauku, īsu aprakstu un Instagram, TikTok vai Facebook. Pieslēdzies ar to pašu kontu un atver savu profilu:\n{u}\n\nOficiālos protokolu datus (vārds, klubs, statistika) mainīt nevar. Ja kaut kas nav pareizi, atbildi uz šo e-pastu.' },
  MK: { naslov: 'Твојот профил на SLFF е потврден', gumb: 'Отвори го мојот профил',
    telo: 'Здраво,\n\nпотврдивме дека си {i} ({k}, {l}). Профилот сега е твој.\n\nМожеш да додадеш фотографија, прекар, краток опис и Instagram, TikTok или Facebook. Најави се со истата сметка и отвори го својот профил:\n{u}\n\nОфицијалните податоци од записниците (име, клуб, статистика) не може да се менуваат. Ако нешто не е во ред, одговори на оваа порака.' },
  GR: { naslov: 'Το προφίλ σου στο SLFF επιβεβαιώθηκε', gumb: 'Άνοιξε το προφίλ μου',
    telo: 'Γεια σου,\n\nεπιβεβαιώσαμε ότι είσαι ο {i} ({k}, {l}). Το προφίλ είναι πλέον δικό σου.\n\nΜπορείς να προσθέσεις φωτογραφία, ψευδώνυμο, σύντομη περιγραφή και Instagram, TikTok ή Facebook. Συνδέσου με τον ίδιο λογαριασμό και άνοιξε το προφίλ σου:\n{u}\n\nΤα επίσημα στοιχεία των φύλλων αγώνα (όνομα, σύλλογος, στατιστικά) δεν αλλάζουν. Αν κάτι δεν είναι σωστό, απάντησε σε αυτό το email.' },
  TR: { naslov: 'SLFF profilin onaylandı', gumb: 'Profilimi aç',
    telo: 'Merhaba,\n\n{i} olduğunu onayladık ({k}, {l}). Profil artık senin.\n\nProfiline fotoğraf, takma ad, kısa bir açıklama ve Instagram, TikTok veya Facebook ekleyebilirsin. Aynı hesapla giriş yap ve profilini aç:\n{u}\n\nMaç raporlarındaki resmi bilgiler (ad, kulüp, istatistikler) değiştirilemez. Bir şey yanlışsa bu e-postayı yanıtla.' },
  UA: { naslov: 'Твій профіль у SLFF підтверджено', gumb: 'Відкрити мій профіль',
    telo: 'Привіт,\n\nми підтвердили, що ти {i} ({k}, {l}). Тепер профіль твій.\n\nМожеш додати фото, нік, короткий опис та Instagram, TikTok чи Facebook. Увійди з тим самим акаунтом і відкрий свій профіль:\n{u}\n\nОфіційні дані з протоколів (ім’я, клуб, статистика) змінити не можна. Якщо щось не так, відповідай на цей лист.' },
  AM: { naslov: 'Քո SLFF պրոֆիլը հաստատված է', gumb: 'Բացել իմ պրոֆիլը',
    telo: 'Բարև,\n\nհաստատեցինք, որ դու {i} ես ({k}, {l})։ Պրոֆիլն այժմ քոնն է։\n\nԿարող ես ավելացնել լուսանկար, մականուն, կարճ նկարագրություն և Instagram, TikTok կամ Facebook։ Մուտք գործիր նույն հաշվով և բացիր քո պրոֆիլը:\n{u}\n\nԱրձանագրությունների պաշտոնական տվյալները (անուն, ակումբ, վիճակագրություն) հնարավոր չէ փոխել։ Եթե ինչ-որ բան ճիշտ չէ, պատասխանիր այս նամակին։' },
  AZ: { naslov: 'SLFF profilin təsdiqləndi', gumb: 'Profilimi aç',
    telo: 'Salam,\n\n{i} ({k}, {l}) olduğunu təsdiqlədik. Profil artıq sənindir.\n\nOna şəkil, ləqəb, qısa təsvir və Instagram, TikTok və ya Facebook əlavə edə bilərsən. Eyni hesabla daxil ol və profilini aç:\n{u}\n\nOyun protokollarındakı rəsmi məlumatları (ad, klub, statistika) dəyişmək olmaz. Nəsə düz deyilsə, bu məktuba cavab yaz.' },
  DK: { naslov: 'Din SLFF-profil er bekræftet', gumb: 'Åbn min profil',
    telo: 'Hej,\n\nvi har bekræftet, at du er {i} ({k}, {l}). Profilen er nu din.\n\nDu kan tilføje et foto, et kaldenavn, en kort beskrivelse og Instagram, TikTok eller Facebook. Log ind med den samme konto, og åbn din profil:\n{u}\n\nDe officielle data fra kamprapporterne (navn, klub, statistik) kan ikke ændres. Er der noget, der ikke passer, så svar på denne mail.' },
  EN: { naslov: 'Your SLFF profile is confirmed', gumb: 'Open my profile',
    telo: 'Hi,\n\nwe have confirmed that you are {i} ({k}, {l}). The profile is now yours.\n\nYou can add a photo, a nickname, a short bio and your Instagram, TikTok or Facebook. Sign in with the same account and open your profile:\n{u}\n\nOfficial data from the match reports (name, club, stats) cannot be changed. If something is not right, just reply to this email.' },
}

POTRJEN.ME = POTRJEN.RS
POTRJEN.BA = POTRJEN.HR
POTRJEN.MD = POTRJEN.RO

interface Neobvescen {
  zahtevek_id: number
  email: string
  igralec: string
  player_id: number
  liga_slug: string
  liga: string
  klub: string
  drzava: string | null
}

function sestaviPotrjen(v: Neobvescen): { naslov: string; html: string; besedilo: string } {
  const b = POTRJEN[v.drzava ?? ''] ?? POTRJEN.EN
  const u = `https://slff.eu/player/${v.player_id}?t=${encodeURIComponent(v.liga_slug)}`
  const liga = v.liga.replaceAll(' — ', ', ')
  const vstavi = (t: string) => t.replaceAll('{i}', v.igralec).replaceAll('{k}', v.klub).replaceAll('{l}', liga)
  const besedilo = `${vstavi(b.telo).replaceAll('{u}', u)}\n\nJernej, SLFF`
  // Odstavki telesa: pozdrav, potrditev, kaj lahko dodaš (s povezavo), uradni podatki.
  const [pozdrav, potrditev, dodaj, uradno] = vstavi(b.telo).split('\n\n')
  const html = postavi({
    jezik: (BESEDILA[v.drzava ?? ''] ?? BESEDILA.EN).jezik,
    zadeva: b.naslov,
    predglava: potrditev,
    naslov: esc(b.naslov),
    uvod: `${esc(pozdrav)} ${esc(potrditev)}<br><br>${esc(dodaj.replace('\n{u}', ''))}`,
    gumb: { label: b.gumb, url: u },
    opomba: `${esc(uradno ?? '')}<br>Jernej, SLFF`,
    noga: {},
  }).html
  return { naslov: b.naslov, besedilo, html }
}

async function obvestiPotrjene(service: SupabaseClient): Promise<Response> {
  const { data, error } = await service.rpc('prevzem_neobvesceni')
  if (error) return json({ error: error.message }, 500)
  let poslano = 0
  const napake: string[] = []
  for (const v of (data ?? []) as Neobvescen[]) {
    const s = sestaviPotrjen(v)
    let napaka: string | null = null
    let id: string | null = null
    try {
      const r = await smtp.sendMail({
        from: Deno.env.get('EMAIL_FROM') || 'SLFF <noreply@slff.eu>',
        to: v.email,
        subject: s.naslov,
        html: s.html,
        text: s.besedilo,
        replyTo: Deno.env.get('EMAIL_REPLY_TO') || 'SLFF <info@slff.eu>',
      })
      id = r.messageId
    } catch (e) {
      napaka = String(e)
    }
    await service.from('email_log').insert({ email: v.email, vrsta: 'prevzem-potrjen', resend_id: id, napaka })
    if (napaka) napake.push(`zahtevek ${v.zahtevek_id}: ${napaka}`)
    else {
      await service.rpc('prevzem_obvescen', { p_zahtevek_id: v.zahtevek_id })
      poslano++
    }
  }
  return json({ poslano, napake })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  const URL_ = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const SECRET_KEY = Deno.env.get('SUPABASE_SECRET_KEY')
  const auth = req.headers.get('Authorization') ?? ''
  const jeStroj = [SERVICE_KEY, SECRET_KEY].filter(Boolean).some((k) => auth === `Bearer ${k}`)
  const service = createClient(URL_, SERVICE_KEY)
  const vhod = (await req.json().catch(() => ({}))) as {
    zahtevek?: number
    na?: string
    // Preizkus (servis): mail za EN zahtevek gre na test_na, ne klubu; nič ne gre v stike kluba.
    test_zahtevek?: number
    test_na?: string
    obvesti?: boolean
  }
  if (!Deno.env.get('SMTP_PASS')) return json({ error: 'Pomanjkljiva nastavitev: SMTP_PASS.' }, 500)
  if (vhod.obvesti === true) return await obvestiPotrjene(service)
  // Admin kliče s svojim žetonom; RPC `admin_prevzem_zeton_za_klub` sam preveri is_admin().
  const uporabnik = createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  if (!jeStroj) {
    const { data: admin, error } = await uporabnik.rpc('is_admin')
    if (error) return json({ error: error.message }, 500)
    if (!admin) return json({ error: 'Samo administrator.' }, 403)
  }

  const test = vhod.test_zahtevek != null
  if (test && !jeStroj) return json({ error: 'Preizkus le s servisnim ključem.' }, 403)
  if (test && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vhod.test_na ?? '')) return json({ error: 'test_na: veljaven naslov.' }, 400)
  if (!test && !Number.isInteger(vhod.zahtevek)) return json({ error: 'zahtevek: številka zahtevka.' }, 400)
  // Servis nima auth.uid(), zato admin pot teče z admin žetonom.
  if (!test && jeStroj) return json({ error: 'Pošiljanje klubu sproži admin iz Administracije.' }, 400)

  // Žeton nastane ob klicu; mail, ki ne uspe, pusti žeton neuporabljen
  // (admin lahko pošlje znova, prejšnja povezava takrat poteče).
  const { data, error } = test
    ? await service.rpc('prevzem_zeton_test', { p_zahtevek_id: vhod.test_zahtevek })
    : await uporabnik.rpc('admin_prevzem_zeton_za_klub', { p_zahtevek_id: vhod.zahtevek, p_na: vhod.na ?? null })
  if (error) return json({ error: error.message }, 400)
  const v0 = ((data ?? []) as Vrstica[])[0]
  if (!v0) return json({ error: 'Zahtevek ni odprt.' }, 400)
  const v = test ? { ...v0, email: vhod.test_na! } : v0
  const s = sestavi(v)
  const FROM = Deno.env.get('EMAIL_FROM') || 'SLFF <noreply@slff.eu>'
  let napaka: string | null = null
  let id: string | null = null
  try {
    const r = await smtp.sendMail({
      from: FROM,
      to: v.email,
      subject: s.naslov,
      html: s.html,
      text: s.besedilo,
      // Odgovori klubov pridejo k nam (info@ gre tudi v Discord).
      replyTo: Deno.env.get('EMAIL_REPLY_TO') || 'SLFF <info@slff.eu>',
    })
    id = r.messageId
  } catch (e) {
    napaka = String(e)
  }
  await service.from('email_log').insert({ email: v.email, vrsta: test ? 'prevzem-test' : 'prevzem-klub', resend_id: id, napaka })
  if (!napaka && !test && v.klub_stik_id != null)
    await service.from('klub_stik_posta').insert({
      stik_id: v.klub_stik_id,
      vrsta: 'drugo',
      zadeva: s.naslov,
      poslal: 'SLFF (admin, prevzem profila)',
      opomba: `zahtevek ${v.zahtevek_id}`,
      za: v.email,
      // Brez žetona: v bazi je le njegova zgoščena vrednost.
      telo: s.besedilo.replaceAll(v.zeton, '…'),
    })
  if (napaka) return json({ error: `Mail ni odšel: ${napaka}` }, 502)
  return json({ poslano: 1, na: v.email })
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}
