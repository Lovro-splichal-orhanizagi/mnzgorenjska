// Edge Function: posli-prevzem
//
// Klubu sporoči, da je kdo prevzel profil njegovega igralca ("To sem jaz"),
// z enkratno povezavo za potrditev ali zavrnitev (`/claim#<žeton>`, velja 14
// dni). Komu in kateri zahtevki, odloči SQL `prevzem_za_posto_klubu`: naslov
// iz `klub_stik` (brez `ne_zeli` in `napacen_mail`), en mail na klub na dan,
// žeton v bazi le zgoščen. Vsak mail gre v `email_log` in `klub_stik_posta`
// (vrsta `drugo`), da ga vidijo vsi, ki pišejo klubom.
//
// Kliče ga le stroj (servisni ključ). URNIKA ŠE NI: preden ga vklopiš, se
// odloči, ali samodejni mail klubu velja kot stik po pravilih iz CLAUDE.md
// (Pošta klubom). Ročni zagon:
//   curl -X POST https://api.slff.eu/functions/v1/posli-prevzem \
//     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -d '{"suho":true}'
//
// Skrivnosti so iste kot pri posli-opomnik (SMTP_HOST, SMTP_USER, SMTP_PASS,
// EMAIL_FROM); novih ni. Objava: scripts/hetzner/objavi-funkcije.sh posli-prevzem
//
// Jezik: država lige (BESEDILA), neznana država angleško. Odgovori na info@.
// Preizkus brez kluba: {"test_zahtevek": <id>, "test_na": "<naslov>"}.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import nodemailer from 'npm:nodemailer@6.9.16'

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
  expires_at: string
  klub_stik_id: number
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
  EN: { jezik: 'en-GB', naslov: 'Is {i} your player?', pozdrav: 'Hello,',
    uvod: 'SLFF (slff.eu) is a free fantasy league for amateur football; points come from the official match reports.',
    prosnja: 'The user {p} says they are {i}, a player of your club {k} ({l}). If you know them, please confirm or reject:',
    gumb: 'Confirm or reject', velja: 'The link is valid until {d} and works once. A confirmed player can add a nickname, photo and short bio to their profile; official match report data cannot be changed. For questions, just reply to this email.', podpis: 'Jernej, SLFF' },
}

function sestavi(v: Vrstica): { naslov: string; html: string; besedilo: string } {
  const b = BESEDILA[v.drzava ?? ''] ?? BESEDILA.EN
  const povezava = `https://slff.eu/claim#${v.zeton}`
  const d = new Date(v.expires_at).toLocaleDateString(b.jezik)
  const vstavi = (t: string, h: (x: string) => string = (x) => x) =>
    t.replaceAll('{p}', h(v.prosilec ?? '?')).replaceAll('{i}', h(v.igralec)).replaceAll('{k}', h(v.klub))
      .replaceAll('{l}', h(v.liga)).replaceAll('{d}', d)
  const krepko = (x: string) => `<b>${esc(x)}</b>`
  return {
    naslov: vstavi(b.naslov),
    besedilo: `${b.pozdrav}\n\n${b.uvod}\n\n${vstavi(b.prosnja)}\n\n${povezava}\n\n${vstavi(b.velja)}\n\n${b.podpis}`,
    html:
      `<p>${esc(b.pozdrav)}</p><p>${esc(b.uvod)}</p><p>${vstavi(esc(b.prosnja), krepko)}</p>` +
      `<p><a href="${povezava}">${esc(b.gumb)}</a></p><p>${esc(vstavi(b.velja))}</p><p>${esc(b.podpis)}</p>`,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null)
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const SECRET_KEY = Deno.env.get('SUPABASE_SECRET_KEY')
  const auth = req.headers.get('Authorization') ?? ''
  if (![SERVICE_KEY, SECRET_KEY].filter(Boolean).some((k) => auth === `Bearer ${k}`))
    return json({ error: 'Samo servisni ključ.' }, 403)

  const vhod = (await req.json().catch(() => ({}))) as {
    suho?: boolean
    najvec?: number
    // Preizkus: mail za EN zahtevek gre na test_na, ne klubu; nič ne gre v stike kluba.
    test_zahtevek?: number
    test_na?: string
  }
  const service = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY)
  if (vhod.suho) {
    const { count, error } = await service
      .from('zahtevki_igralca')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cakajoc')
      .eq('spor', false)
    if (error) return json({ error: error.message }, 500)
    return json({ suho: true, cakajocih: count })
  }
  if (!Deno.env.get('SMTP_PASS')) return json({ error: 'Pomanjkljiva nastavitev: SMTP_PASS.' }, 500)

  // Žetoni nastanejo ob klicu; mail, ki ne uspe, pusti žeton neuporabljen
  // (zahtevek čaka naprej na poznavalca, soigralce ali admina).
  const test = vhod.test_zahtevek != null
  if (test && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vhod.test_na ?? '')) return json({ error: 'test_na: veljaven naslov.' }, 400)
  const { data, error } = test
    ? await service.rpc('prevzem_zeton_test', { p_zahtevek_id: vhod.test_zahtevek })
    : await service.rpc('prevzem_za_posto_klubu', { p_najvec: vhod.najvec ?? 20 })
  if (error) return json({ error: error.message }, 500)
  const vrstice = ((data ?? []) as Vrstica[]).map((v) => (test ? { ...v, email: vhod.test_na! } : v))
  const FROM = Deno.env.get('EMAIL_FROM') || 'SLFF <noreply@slff.eu>'
  let poslano = 0
  for (const v of vrstice) {
    const s = sestavi(v)
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
      poslano++
    } catch (e) {
      napaka = String(e)
    }
    await service.from('email_log').insert({ email: v.email, vrsta: test ? 'prevzem-test' : 'prevzem-klub', resend_id: id, napaka })
    if (!napaka && !test)
      await service.from('klub_stik_posta').insert({
        stik_id: v.klub_stik_id,
        vrsta: 'drugo',
        zadeva: s.naslov,
        poslal: 'SLFF (samodejno, prevzem profila)',
        opomba: `zahtevek ${v.zahtevek_id}`,
        za: v.email,
        // Brez žetona: v bazi je le njegova zgoščena vrednost.
        telo: s.besedilo.replaceAll(v.zeton, '…'),
      })
  }
  return json({ kandidati: vrstice.length, poslano })
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}
