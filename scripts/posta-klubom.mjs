// Pošta klubom iz vrste (delavec `slff-posta` na strežniku, scripts/hetzner/posta/).
//
// NE v GitHub Actions: dnevniki javnega repozitorija bi pokazali naslove.
// Vrsto napolni scripts/vrsta-poste-klubom.mjs (`klub_stik.v_vrsti`). Vsak
// krog (z --zanka vsakih 10 minut) pošlje vsak dejaven pošiljatelj (POSILJATELJI)
// največ `--najvec` mailov (privzeto 2; med vsemi maili 60–150 s): najprej
// opomnike, nato prve maile. Pravila kot v CLAUDE.md *Pošta klubom*:
//
// - pišemo le v oknu prejemnikove države (08–18, pon–sob, `OKNA`), vsak
//   pošiljatelj do svoje dnevne meje (`dnevnaMeja`, ogrevanje; dunajski dan,
//   šteje klub_stik_posta.poslal tega pošiljatelja);
// - prvi mail dobi pošiljatelj z največ prostora danes, opomnik in preverjanje
//   nabiralnika pa vedno tisti, ki je poslal prvi mail (sicer opomnik čaka);
// - prvi mail: stanje `nov`, brez kakršnekoli pošte, `poslji_od` mimo,
//   liga aktivna (neaktivna liga čaka — tako Estonija do vklopa);
// - opomnik: en sam, ≥ 3 dni po našem prvem mailu, brez pošte drugih in brez
//   odgovora; pred njim pogledamo v nabiralnik (IMAP), ali je klub odgovoril
//   (→ `odgovor`) ali se je mail odbil (→ `napacen_mail`);
// - SMTP zavrne naslov → `napacen_mail`.
// - klub (isti team_id ali isto ime v državi) je v zadnjih 3 dneh dobil
//   pošto od kogarkoli ali v 7 dneh od drugega pošiljatelja → čaka;
// - pred SMTP vrstico prevzamemo (`v_vrsti = false`), v vrsto se vrne šele po
//   vpisu v klub_stik_posta. Napaka po začetku DATA ali neuspel vpis jo pusti
//   zunaj vrste z opombo "poslano? preveri ročno" — nikoli samodejno znova;
// - v dnevniku ni naslovov (stik #id, klub).
//
// Številke v mailu so sveže (igralci z nastopi letos, najboljši igralec,
// število človeških fantasy ekip z igralcem kluba). Besedila so po državi.
// SMTP in IMAP sta tu na roko prek node:tls (brez nove odvisnosti).
//
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, vsaj eno od LUKA_SMTP_GESLO,
//   LOVRO_SMTP_GESLO, NEJC_SMTP_GESLO, KLUBI_SMTP_GESLO (pošiljatelj brez gesla ne pošilja)
//   node scripts/posta-klubom.mjs --zanka   (delavec: krog vsakih 10 minut, do zavrnjene prijave)
//   node scripts/posta-klubom.mjs [--najvec 2]   (en krog)
//   node scripts/posta-klubom.mjs --suho     (izpiše, kaj bi šlo; nič ne pošlje in ne piše, gesla ne rabi)
import tls from 'node:tls'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { vseVrstice } from './strani.mjs'

// Nabiralniki, iz katerih pošilja vrsta (vsi na Mailcowu). Pošiljatelj je
// dejaven le, če je v okolju njegovo geslo. `zacetek`: ogrevanje — dnevna meja
// 20 + 10 na vsak dunajski dan od začetka, največ 100; brez začetka 100.
// `ekipa`: piše v imenu ekipe ("smo ekipa SLFF"), ne v prvi osebi.
export const POSILJATELJI = [
  { kljuc: 'luka', od: 'luka@slff.eu', ime: 'Luka', poslal: 'Luka (luka@slff.eu)', env: 'LUKA_SMTP_GESLO', zacetek: null },
  { kljuc: 'lovro', od: 'lovro@slff.eu', ime: 'Lovro', poslal: 'Lovro (lovro@slff.eu)', env: 'LOVRO_SMTP_GESLO', zacetek: '2026-10-19' },
  { kljuc: 'nejc', od: 'nejc@slff.eu', ime: 'Nejc', poslal: 'Nejc (nejc@slff.eu)', env: 'NEJC_SMTP_GESLO', zacetek: '2026-10-19' },
  { kljuc: 'klubi', od: 'klubi@slff.eu', ime: 'Ekipa SLFF', poslal: 'Ekipa SLFF (klubi@slff.eu)', env: 'KLUBI_SMTP_GESLO', zacetek: '2026-10-19', ekipa: true },
]
export const OD = POSILJATELJI[0].od
export const POSLAL = POSILJATELJI[0].poslal
const GOSTITELJ = 'mail.slff.eu'
const NA_DAN = 100
const DNI_DO_OPOMNIKA = 3

/** Dejavni pošiljatelji (z geslom v `env`), v vrstnem redu nastavitve. */
export const aktivniPosiljatelji = (env) => POSILJATELJI.filter((po) => env[po.env]).map((po) => ({ ...po, geslo: env[po.env] }))

/** Dnevna meja pošiljatelja: ogrevanje od `zacetek` (dunajski dnevi), pred začetkom 0. */
export function dnevnaMeja(po, zdaj = new Date()) {
  if (!po.zacetek) return NA_DAN
  const dni = Math.round((Date.parse(danDunaj(zdaj)) - Date.parse(po.zacetek)) / DAN)
  return dni < 0 ? 0 : Math.min(NA_DAN, 20 + 10 * dni)
}

/**
 * Pošiljatelj za prvi mail: dejaven, z dnevnim prostorom in prostorom v krogu,
 * največ dnevnega prostora; enako → prej v nastavitvi. `prostor`: kljuc → { dan, krog }.
 */
export function izberiPosiljatelja(aktivni, prostor) {
  let naj = null
  for (const po of aktivni) {
    const x = prostor.get(po.kljuc)
    if (x && x.dan > 0 && x.krog > 0 && (!naj || x.dan > prostor.get(naj.kljuc).dan)) naj = po
  }
  return naj
}

const DAN = 86400e3

// Okno pošiljanja po državi prejemnika; država brez okna (in besedil) ne dobi nič.
export const OKNA = {
  AT: 'Europe/Vienna', BA: 'Europe/Sarajevo', EE: 'Europe/Tallinn', GI: 'Europe/Gibraltar', GR: 'Europe/Athens', HK: 'Asia/Hong_Kong',
  HR: 'Europe/Zagreb', HU: 'Europe/Budapest', JP: 'Asia/Tokyo', LV: 'Europe/Riga', MD: 'Europe/Chisinau', ME: 'Europe/Podgorica',
  MK: 'Europe/Skopje', MT: 'Europe/Malta', RO: 'Europe/Bucharest', RS: 'Europe/Belgrade', TH: 'Asia/Bangkok',
}

/** Je čas `zdaj` v oknu države (08–18, pon–sob, krajevni čas)? */
export function vOknu(drzava, zdaj = new Date()) {
  const pas = OKNA[drzava]
  if (!pas) return false
  const d = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: pas, weekday: 'short', hour: 'numeric', hourCycle: 'h23' })
      .formatToParts(zdaj).map((p) => [p.type, p.value]),
  )
  return d.weekday !== 'Sun' && Number(d.hour) >= 8 && Number(d.hour) < 18
}

export const danDunaj = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(d)

// --- besedila ----------------------------------------------------------------

const tocke = (n) => {
  n = Number(n ?? 0)
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}

// Kratko (prenova 10/2026): kdo smo in vir točk, koliko igralcev kluba je že v
// igri in povezava na stran kluba, povabilo k deljenju, odjava. Opomnik je
// tri vrstice z eno novico (koliko ekip) in je zadnji. Brez pomišljajev.
function nemsko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub } = k
  const ekipa = po.ekipa
  const podpis = ekipa ? 'Das SLFF-Team' : po.ime
  const naj = p.naj ? `${p.naj} mit ${tocke(p.tocke)} ${Number(p.tocke) === 1 ? 'Punkt' : 'Punkten'}` : null
  if (vrsta === 'prvi') {
    return {
      zadeva: `${klub}: ${p.igralcev} Spieler schon im Fantasy-Spiel der ${liga}`,
      telo: `Guten Tag,

${ekipa ? 'wir sind das Team von SLFF' : `ich bin ${po.ime} von SLFF`}, einem kostenlosen Fantasy-Fußballspiel für Amateurligen. Seit Kurzem ist auch die ${liga} dabei, die Punkte kommen aus den offiziellen Spielberichten auf oefb.at.

${p.igralcev} Spieler von ${klub} sind schon im Spiel${naj ? `, bisher bester: ${naj}` : ''}. Ihre Vereinsseite mit Statistik und einem fertigen Bild zum Teilen:
${url}

Wenn es Ihnen gefällt, teilen Sie den Link gern in der Vereinsgruppe oder auf Facebook. Nach jeder Runde sieht man, wer Punkte sammelt.

Möchte ein Spieler nicht namentlich aufscheinen oder wollen Sie keine weiteren E-Mails, genügt eine kurze Antwort.

Mit freundlichen Grüßen
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  return {
    zadeva: ekip >= 5 ? `${klub}: Ihre Spieler sind schon in ${ekip} Fantasy-Teams` : `${klub} im Fantasy-Spiel: so läuft es für Ihre Spieler`,
    telo: `Guten Tag,

kurz nachgefragt zu ${ekipa ? 'unserer' : 'meiner'} letzten Nachricht: ${ekip >= 5 ? `Die Spieler von ${klub} stehen inzwischen in ${ekip} Fantasy-Teams` : `Die Spieler von ${klub} sind im Spiel und sammeln Punkte`}${naj ? `, bisher bester ist ${naj}` : ''}.
${url}

Wenn das für Ihre Vereinsgruppe oder Facebook passt, freut es uns. Das ist ${ekipa ? 'unsere' : 'meine'} letzte Nachricht dazu; für Fragen oder Wünsche genügt eine kurze Antwort.

Mit freundlichen Grüßen
${podpis}
slff.eu
`,
  }
}

// Estonščina sklanja, zato ime lige stoji samo za dvopičjem ali v oklepaju,
// klub za besedo "klubi"/"klubist" (glej docs/viri/estonija.md). Brez pomišljajev.
// Besedila ne trdijo, da imamo dovoljenje zveze.
function estonsko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub } = k
  const ekipa = po.ekipa
  const podpis = ekipa ? 'SLFF meeskond' : po.ime
  const naj = p.naj ? `${p.naj}, ${tocke(p.tocke)} ${Number(p.tocke) === 1 ? 'punkt' : 'punkti'}` : null
  const mangijat = p.igralcev === 1 ? 'mängija' : 'mängijat'
  if (vrsta === 'prvi') {
    return {
      zadeva: `Klubi ${klub} ${p.igralcev} ${mangijat} on juba fantaasiajalgpallis (${liga})`,
      telo: `Tere!

${ekipa ? 'Oleme SLFF-i meeskond. SLFF on' : `Olen ${po.ime} SLFF-ist. See on`} tasuta fantaasiajalgpalli mäng amatöörliigadele. Nüüd on mängus ka uus liiga: ${liga}. Punktid tulevad ametlikest mänguprotokollidest lehel jalgpall.ee.

Mängus on juba ${p.igralcev} ${mangijat} klubist ${klub}${naj ? ` (seni parim: ${naj})` : ''}. Klubi leht statistika ja jagamiseks valmis pildiga:
${url}

Kui see Teile meeldib, jagage linki julgelt klubi grupis või Facebookis. Pärast iga vooru on näha, kes punkte kogub.

Kui mõni mängija ei soovi oma nimega mängus olla või Te ei soovi rohkem kirju, piisab lühikesest vastusest.

Lugupidamisega
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  return {
    zadeva: ekip >= 5 ? `Klubi ${klub} mängijad on juba ${ekip} fantaasiameeskonnas` : `Klubi ${klub} fantaasiamängus: nii läheb Teie mängijatel`,
    telo: `Tere!

Lühike järelpärimine ${ekipa ? 'meie' : 'minu'} eelmisele kirjale: ${ekip >= 5 ? `klubi ${klub} mängijad on juba ${ekip} fantaasiameeskonnas` : `klubi ${klub} mängijad on mängus ja koguvad punkte`}${naj ? ` (seni parim: ${naj})` : ''}.
${url}

Kui see sobib klubi gruppi või Facebooki, on meil hea meel. See on ${ekipa ? 'meie' : 'minu'} viimane kiri sel teemal; küsimuste või soovide korral piisab lühikesest vastusest.

Lugupidamisega
${podpis}
slff.eu
`,
  }
}

// Hrvaščina in srbščina: 1, 21 … ednina, 2–4 (22–24 …) dvojina, sicer rodilnik množine.
const slovansko = (n, ena, dve, pet) => {
  n = Math.abs(Number(n ?? 0))
  if (!Number.isInteger(n)) return dve
  const e = n % 10
  const d = n % 100
  return e === 1 && d !== 11 ? ena : e >= 2 && e <= 4 && (d < 12 || d > 14) ? dve : pet
}

// Ime lige stoji v imenovalniku ("Odnedavno je u igri i 1. ŽNL Karlovac"),
// klub za besedo "kluba"; števila ekip ne sklanjamo ("… s njima već ima 7").
// Besedila ne trdijo, da imamo dovoljenje zveze.
function hrvasko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub } = k
  const ekipa = po.ekipa
  const podpis = ekipa ? 'SLFF tim' : po.ime
  const naj = p.naj ? `${p.naj}, ${tocke(p.tocke)} ${slovansko(p.tocke, 'bod', 'boda', 'bodova')}` : null
  const igracev = `${p.igralcev} ${slovansko(p.igralcev, 'igrač', 'igrača', 'igrača')}`
  if (vrsta === 'prvi') {
    return {
      zadeva: `${klub}: ${igracev} već u fantasy nogometu (${liga})`,
      telo: `Poštovani,

${ekipa ? 'mi smo tim SLFF-a' : `ja sam ${po.ime} iz SLFF-a`}, besplatne fantasy nogometne igre za amaterske lige. Odnedavno je u igri i ${liga}, a bodovi dolaze iz službenih zapisnika utakmica na semafor.hns.family.

U igri je već ${igracev} kluba ${klub}${naj ? `, dosad najbolji: ${naj}` : ''}. Stranica kluba sa statistikom i gotovom slikom za dijeljenje:
${url}

Ako vam se sviđa, slobodno podijelite poveznicu u klupskoj grupi ili na Facebooku. Nakon svakog kola vidi se tko skuplja bodove.

Ako neki igrač ne želi biti u igri pod svojim imenom ili ne želite više poruka, dovoljan je kratak odgovor.

Lijep pozdrav
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  return {
    zadeva: ekip >= 5 ? `${klub}: vaši igrači su već u fantasy momčadima (${ekip})` : `${klub} u fantasy igri: kako stoje vaši igrači`,
    telo: `Poštovani,

kratko se javljam${ekipa ? 'o na našu' : ' na moju'} prethodnu poruku: igrači kluba ${klub} su u igri i skupljaju bodove${ekip >= 5 ? `, a fantasy momčadi s njima već ima ${ekip}` : ''}${naj ? `. Dosad najbolji: ${naj}` : ''}.
${url}

Ako vam to odgovara za klupsku grupu ili Facebook, drago nam je. Ovo ${ekipa ? 'nam' : 'mi'} je posljednja poruka o tome; za pitanja ili želje dovoljan je kratak odgovor.

Lijep pozdrav
${podpis}
slff.eu
`,
  }
}

// Srbščina: ekavica, latinica (kot vmesnik). Vir zapisnikov je fsb.org.rs za
// beograjske lige, sicer fss.rs.
function srbsko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub } = k
  const ekipa = po.ekipa
  const podpis = ekipa ? 'SLFF tim' : po.ime
  const vir = /^rs-(u19-)?bg-/.test(k.liga_slug ?? '') ? 'fsb.org.rs' : 'fss.rs'
  const naj = p.naj ? `${p.naj}, ${tocke(p.tocke)} ${slovansko(p.tocke, 'poen', 'poena', 'poena')}` : null
  const igracev = `${p.igralcev} ${slovansko(p.igralcev, 'igrač', 'igrača', 'igrača')}`
  if (vrsta === 'prvi') {
    return {
      zadeva: `${klub}: ${igracev} već u fantasy fudbalu (${liga})`,
      telo: `Poštovani,

${ekipa ? 'mi smo tim SLFF-a' : `ja sam ${po.ime} iz SLFF-a`}, besplatne fantasy fudbalske igre za amaterske lige. Odnedavno je u igri i ${liga}, a poeni se računaju iz zvaničnih zapisnika na ${vir}.

U igri je već ${igracev} kluba ${klub}${naj ? `, do sada najbolji: ${naj}` : ''}. Stranica kluba sa statistikom i slikom spremnom za deljenje:
${url}

Ako Vam se dopada, slobodno podelite link u klupskoj grupi ili na Fejsbuku. Posle svakog kola se vidi ko skuplja poene.

Ako neki igrač ne želi da bude u igri pod svojim imenom ili ne želite više poruka, dovoljan je kratak odgovor.

Srdačan pozdrav
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  return {
    zadeva: ekip >= 5 ? `${klub}: Vaši igrači su već u fantasy timovima (${ekip})` : `${klub} u fantasy igri: kako stoje Vaši igrači`,
    telo: `Poštovani,

kratko se javljam${ekipa ? 'o povodom naše' : ' povodom moje'} prethodne poruke: igrači kluba ${klub} su u igri i skupljaju poene${ekip >= 5 ? `, a fantasy timova sa njima već ima ${ekip}` : ''}${naj ? `. Do sada najbolji: ${naj}` : ''}.
${url}

Ako Vam to odgovara za klupsku grupu ili Fejsbuk, drago nam je. Ovo ${ekipa ? 'nam' : 'mi'} je poslednja poruka o tome; za pitanja ili želje dovoljan je kratak odgovor.

Srdačan pozdrav
${podpis}
slff.eu
`,
  }
}

// Madžarščina sklanja s priponami, zato ime lige in kluba stojita brez njih:
// za dvopičjem, v oklepaju ali pred "játékosai" / "közül". Za številom ednina
// ("55 pont"). Vikanje kluba (Önök).
function madzarsko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub } = k
  const ekipa = po.ekipa
  const podpis = ekipa ? 'Az SLFF csapata' : po.ime
  const naj = p.naj ? `${p.naj}, ${tocke(p.tocke)} pont` : null
  if (vrsta === 'prvi') {
    return {
      zadeva: `${klub}: már ${p.igralcev} játékos a fantasy fociban (${liga})`,
      telo: `${ekipa ? 'Jó napot kívánunk!' : 'Jó napot kívánok!'}

${ekipa ? 'Az SLFF csapata vagyunk. Az SLFF' : `${po.ime} vagyok az SLFF-től, amely`} egy ingyenes fantasy futballjáték amatőr bajnokságoknak. Nemrég bekerült a játékba ez a bajnokság is: ${liga}. A pontok a hivatalos mérkőzés-jegyzőkönyvekből származnak (adatbank.mlsz.hu).

${klub} játékosai közül már ${p.igralcev} szerepel a játékban${naj ? ` (eddigi legjobb: ${naj})` : ''}. A klub oldala statisztikákkal és megosztásra kész képpel:
${url}

Ha tetszik Önöknek, nyugodtan osszák meg a linket a klub csoportjában vagy a Facebookon. Minden forduló után látszik, ki gyűjti a pontokat.

Ha valamelyik játékos nem szeretne a saját nevével szerepelni, vagy nem kérnek több levelet, elég egy rövid válasz.

Üdvözlettel
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  return {
    zadeva: ekip >= 5 ? `${klub} játékosai már ${ekip} fantasy csapatban szerepelnek` : `${klub} a fantasy játékban: így állnak a játékosok`,
    telo: `${ekipa ? 'Jó napot kívánunk!' : 'Jó napot kívánok!'}

Röviden ${ekipa ? 'jelentkezünk az előző levelünk' : 'jelentkezem az előző levelem'} kapcsán: ${klub} játékosai a játékban vannak és pontokat gyűjtenek${ekip >= 5 ? `, és már ${ekip} fantasy csapatban szerepelnek` : ''}${naj ? ` (eddig a legjobb: ${naj})` : ''}.
${url}

Ha ez illik a klub csoportjába vagy a Facebookra, örülünk neki. Ez az utolsó ${ekipa ? 'levelünk' : 'levelem'} ebben a témában; kérdés vagy kérés esetén elég egy rövid válasz.

Üdvözlettel
${podpis}
slff.eu
`,
  }
}

// Spodnja besedila vir točk vzamejo iz `k.vir`: domena competitions.vir_url (navedba
// lige, kot VirPodatkov.tsx), sicer federations.site_url, sicer privzeta domena v BESEDILA.

// Bosanščina (BA) in črnogorščina (ME): ijekavica, latinica; BA "nogomet", ME "fudbal".
function ijekavsko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub, vir } = k
  const ekipa = po.ekipa
  const me = k.drzava === 'ME'
  const podpis = ekipa ? 'SLFF tim' : po.ime
  const naj = p.naj ? `${p.naj}, ${tocke(p.tocke)} ${slovansko(p.tocke, 'bod', 'boda', 'bodova')}` : null
  const igraca = `${p.igralcev} ${slovansko(p.igralcev, 'igrač', 'igrača', 'igrača')}`
  if (vrsta === 'prvi') {
    return {
      zadeva: `${klub}: ${igraca} već u fantasy ${me ? 'fudbalu' : 'nogometu'} (${liga})`,
      telo: `Poštovani,

${ekipa ? 'mi smo tim SLFF-a' : `ja sam ${po.ime} iz SLFF-a`}, besplatne fantasy ${me ? 'fudbalske' : 'nogometne'} igre za amaterske lige. Odnedavno je u igri i ${liga}, a bodovi se računaju iz zvaničnih zapisnika utakmica na ${vir}.

U igri je već ${igraca} kluba ${klub}${naj ? `, dosad najbolji: ${naj}` : ''}. Stranica kluba sa statistikom i slikom spremnom za dijeljenje:
${url}

Ako Vam se sviđa, slobodno podijelite link u klupskoj grupi ili na Facebooku. Nakon svakog kola vidi se ko skuplja bodove.

Ako neki igrač ne želi da bude u igri pod svojim imenom ili ne želite više poruka, dovoljan je kratak odgovor.

Srdačan pozdrav
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  return {
    zadeva: ekip >= 5 ? `${klub}: Vaši igrači su već u fantasy timovima (${ekip})` : `${klub} u fantasy igri: kako stoje Vaši igrači`,
    telo: `Poštovani,

kratko se javljam${ekipa ? 'o povodom naše' : ' povodom moje'} prethodne poruke: igrači kluba ${klub} su u igri i skupljaju bodove${ekip >= 5 ? `, a fantasy timova sa njima već ima ${ekip}` : ''}${naj ? `. Dosad najbolji: ${naj}` : ''}.
${url}

Ako Vam to odgovara za klupsku grupu ili Facebook, drago ${ekipa ? 'nam' : 'mi'} je. Ovo ${ekipa ? 'nam' : 'mi'} je posljednja poruka o tome; za pitanja ili želje dovoljan je kratak odgovor.

Srdačan pozdrav
${podpis}
slff.eu
`,
  }
}

// Romunščina (RO, MD): "1 punct", "0/2–19 puncte" (tudi 102–119 …), sicer "20 de puncte".
const roStevilo = (n, ena, vec) => {
  const x = Math.abs(Number(n ?? 0))
  const de = Number.isInteger(x) && x !== 0 && (x % 100 === 0 || x % 100 > 19)
  return `${tocke(n)} ${de ? 'de ' : ''}${x === 1 ? ena : vec}`
}

function romunsko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub, vir } = k
  const ekipa = po.ekipa
  const podpis = ekipa ? 'Echipa SLFF' : po.ime
  const naj = p.naj ? `${p.naj}, ${roStevilo(p.tocke, 'punct', 'puncte')}` : null
  const jucatori = roStevilo(p.igralcev, 'jucător', 'jucători')
  if (vrsta === 'prvi') {
    return {
      zadeva: `${klub}: ${jucatori} deja în fantasy fotbal (${liga})`,
      telo: `Bună ziua,

${ekipa ? 'Suntem echipa SLFF' : `Sunt ${po.ime} de la SLFF`}, un joc gratuit de fantasy fotbal pentru ligile de amatori. De curând a intrat în joc și ${liga}, iar punctele vin din foile de joc oficiale de pe ${vir}.

În joc sunt deja ${jucatori} de la ${klub}${naj ? `, cel mai bun până acum: ${naj}` : ''}. Pagina clubului, cu statistici și o imagine gata de distribuit:
${url}

Dacă vă place, distribuiți linkul în grupul clubului sau pe Facebook. După fiecare etapă se vede cine adună puncte.

Dacă un jucător nu dorește să apară cu numele său sau nu mai doriți mesaje, este suficient un răspuns scurt.

Cu stimă
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  return {
    zadeva: ekip >= 5 ? `${klub}: jucătorii dvs. sunt deja în ${roStevilo(ekip, 'echipă', 'echipe')} fantasy` : `${klub} în jocul fantasy: cum stau jucătorii dvs.`,
    telo: `Bună ziua,

${ekipa ? 'Revenim pe scurt la mesajul nostru anterior' : 'Revin pe scurt la mesajul meu anterior'}: jucătorii de la ${klub} sunt în joc și adună puncte${ekip >= 5 ? `, iar acum apar deja în ${roStevilo(ekip, 'echipă', 'echipe')} fantasy` : ''}${naj ? `. Cel mai bun până acum: ${naj}` : ''}.
${url}

Dacă se potrivește pentru grupul clubului sau pentru Facebook, ${ekipa ? 'ne bucurăm' : 'mă bucur'}. Acesta este ultimul ${ekipa ? 'nostru' : 'meu'} mesaj pe această temă; pentru întrebări sau dorințe este suficient un răspuns scurt.

Cu stimă
${podpis}
slff.eu
`,
  }
}

// Latvijščina in makedonščina: 1, 21 … ednina (ne 11), sicer množina.
const ednina = (n, ena, vec) => {
  const x = Math.abs(Number(n ?? 0))
  return Number.isInteger(x) && x % 10 === 1 && x % 100 !== 11 ? ena : vec
}

// Latvijščina sklanja, zato ime lige stoji za dvopičjem ali v oklepaju, klub
// za "kluba"/"klubs" v imenovalniku (kot estonsko).
function latvijsko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub, vir } = k
  const ekipa = po.ekipa
  const podpis = ekipa ? 'SLFF komanda' : po.ime
  const naj = p.naj ? `${p.naj}, ${tocke(p.tocke)} ${ednina(p.tocke, 'punkts', 'punkti')}` : null
  const speletaji = `${p.igralcev} ${ednina(p.igralcev, 'spēlētājs', 'spēlētāji')}`
  if (vrsta === 'prvi') {
    return {
      zadeva: `${klub}: fantāzijas futbolā jau ${speletaji} (${liga})`,
      telo: `Labdien!

${ekipa ? 'Mēs esam SLFF komanda. SLFF ir' : `Esmu ${po.ime} no SLFF. Tā ir`} bezmaksas fantāzijas futbola spēle amatieru līgām. Tagad spēlē ir arī jauna līga: ${liga}. Punkti tiek aprēķināti no oficiālajiem spēļu protokoliem vietnē ${vir}.

Spēlē jau ir ${speletaji} no kluba ${klub}${naj ? ` (līdz šim labākais: ${naj})` : ''}. Kluba lapa ar statistiku un attēlu, kas gatavs kopīgošanai:
${url}

Ja Jums patīk, droši dalieties ar saiti kluba grupā vai Facebook. Pēc katras kārtas redzams, kurš krāj punktus.

Ja kāds spēlētājs nevēlas būt spēlē ar savu vārdu vai Jūs nevēlaties vairāk vēstuļu, pietiek ar īsu atbildi.

Ar cieņu
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  const komandas = `${ekip} fantāzijas ${ednina(ekip, 'komandā', 'komandās')}`
  return {
    zadeva: ekip >= 5 ? `Kluba ${klub} spēlētāji jau ir ${komandas}` : `Klubs ${klub} fantāzijas spēlē: kā veicas Jūsu spēlētājiem`,
    telo: `Labdien!

Īsi ${ekipa ? 'atgādinām par mūsu' : 'atgādinu par savu'} iepriekšējo vēstuli: ${ekip >= 5 ? `kluba ${klub} spēlētāji jau ir ${komandas}` : `kluba ${klub} spēlētāji ir spēlē un krāj punktus`}${naj ? ` (līdz šim labākais: ${naj})` : ''}.
${url}

Ja tas der kluba grupai vai Facebook, ${ekipa ? 'mēs būsim priecīgi' : 'es būšu priecīgs'}. Šī ir ${ekipa ? 'mūsu' : 'mana'} pēdējā vēstule par šo tēmu; jautājumu vai vēlmju gadījumā pietiek ar īsu atbildi.

Ar cieņu
${podpis}
slff.eu
`,
  }
}

// Makedonščina (cirilica), vikanje (Вие). Za številom števna oblika ("55 поена", "7 тима"), ljudje v množini ("19 играчи").
function makedonsko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub, vir } = k
  const ekipa = po.ekipa
  const podpis = ekipa ? 'Тимот на SLFF' : po.ime
  const naj = p.naj ? `${p.naj}, ${tocke(p.tocke)} ${ednina(p.tocke, 'поен', 'поена')}` : null
  const igraci = `${p.igralcev} ${ednina(p.igralcev, 'играч', 'играчи')}`
  if (vrsta === 'prvi') {
    return {
      zadeva: `${klub}: веќе ${igraci} во фантази фудбал (${liga})`,
      telo: `Почитувани,

${ekipa ? 'ние сме тимот на SLFF' : `јас сум ${po.ime} од SLFF`}, бесплатна фантази фудбалска игра за аматерски лиги. Неодамна во играта влезе и ${liga}, а поените се пресметуваат од официјалните записници од натпреварите на ${vir}.

Во играта веќе има ${igraci} од ${klub}${naj ? `, досега најдобар: ${naj}` : ''}. Страница на клубот со статистика и слика подготвена за споделување:
${url}

Ако Ви се допаѓа, слободно споделете го линкот во клупската група или на Фејсбук. По секое коло се гледа кој собира поени.

Ако некој играч не сака да биде во играта со своето име или не сакате повеќе пораки, доволен е краток одговор.

Со почит
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  const timovi = `${ekip} фантази ${ednina(ekip, 'тим', 'тима')}`
  return {
    zadeva: ekip >= 5 ? `${klub}: Вашите играчи се веќе во ${timovi}` : `${klub} во фантази играта: како стојат Вашите играчи`,
    telo: `Почитувани,

накратко ${ekipa ? 'се надоврзуваме на нашата' : 'се надоврзувам на мојата'} претходна порака: играчите од ${klub} се во играта и собираат поени${ekip >= 5 ? `, а веќе се во ${timovi}` : ''}${naj ? `. Досега најдобар: ${naj}` : ''}.
${url}

Ако Ви одговара за клупската група или Фејсбук, ќе ни биде драго. Ова ${ekipa ? 'ни' : 'ми'} е последна порака за ова; за прашања или желби доволен е краток одговор.

Со почит
${podpis}
slff.eu
`,
  }
}

// Grščina: klub za "του συλλόγου" (ime brez sklona); "·" je grško podpičje.
function grsko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub, vir } = k
  const ekipa = po.ekipa
  const podpis = ekipa ? 'Η ομάδα του SLFF' : po.ime
  const naj = p.naj ? `${p.naj}, ${tocke(p.tocke)} ${Number(p.tocke) === 1 ? 'πόντος' : 'πόντοι'}` : null
  const paiktes = `${p.igralcev} ${p.igralcev === 1 ? 'παίκτης' : 'παίκτες'}`
  if (vrsta === 'prvi') {
    return {
      zadeva: `${klub}: ήδη ${paiktes} στο fantasy ποδόσφαιρο (${liga})`,
      telo: `Χαίρετε,

${ekipa ? 'Είμαστε η ομάδα του SLFF' : `Είμαι ο ${po.ime} από το SLFF`}, ένα δωρεάν παιχνίδι fantasy ποδοσφαίρου για ερασιτεχνικά πρωταθλήματα. Πρόσφατα μπήκε στο παιχνίδι και το πρωτάθλημα ${liga}, και οι πόντοι προέρχονται από τα επίσημα φύλλα αγώνα στο ${vir}.

Στο παιχνίδι είναι ήδη ${paiktes} του συλλόγου ${klub}${naj ? `, μέχρι στιγμής ο καλύτερος: ${naj}` : ''}. Η σελίδα του συλλόγου με στατιστικά και έτοιμη εικόνα για κοινοποίηση:
${url}

Αν σας αρέσει, μοιραστείτε ελεύθερα τον σύνδεσμο στο γκρουπ του συλλόγου ή στο Facebook. Μετά από κάθε αγωνιστική φαίνεται ποιος μαζεύει πόντους.

Αν κάποιος παίκτης δεν θέλει να εμφανίζεται με το όνομά του ή δεν θέλετε άλλα μηνύματα, αρκεί μια σύντομη απάντηση.

Με εκτίμηση
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  return {
    zadeva: ekip >= 5 ? `${klub}: οι παίκτες σας είναι ήδη σε ${ekip} ομάδες fantasy` : `${klub} στο fantasy: πώς τα πάνε οι παίκτες σας`,
    telo: `Χαίρετε,

${ekipa ? 'Επανερχόμαστε σύντομα στο προηγούμενο μήνυμά μας' : 'Επανέρχομαι σύντομα στο προηγούμενο μήνυμά μου'}: οι παίκτες του συλλόγου ${klub} είναι στο παιχνίδι και μαζεύουν πόντους${ekip >= 5 ? `, και βρίσκονται ήδη σε ${ekip} ομάδες fantasy` : ''}${naj ? `. Μέχρι στιγμής ο καλύτερος: ${naj}` : ''}.
${url}

Αν σας ταιριάζει για το γκρουπ του συλλόγου ή το Facebook, θα χαρούμε. Αυτό είναι το τελευταίο ${ekipa ? 'μας' : 'μου'} μήνυμα για το θέμα· για ερωτήσεις ή επιθυμίες αρκεί μια σύντομη απάντηση.

Με εκτίμηση
${podpis}
slff.eu
`,
  }
}

// Angleščina (en-GB; MT, HK, GI, JP, TH): decimalna pika. Ne "amaterske lige",
// ker sta Thai League in HKPL poklicni ("leagues like yours").
function anglesko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub, vir } = k
  const ekipa = po.ekipa
  const podpis = ekipa ? 'The SLFF team' : po.ime
  const naj = p.naj ? `${p.naj} with ${tocke(p.tocke).replace(',', '.')} ${Number(p.tocke) === 1 ? 'point' : 'points'}` : null
  const igralcev = `${p.igralcev} ${p.igralcev === 1 ? 'player' : 'players'}`
  if (vrsta === 'prvi') {
    return {
      zadeva: `${klub}: ${igralcev} already in fantasy football (${liga})`,
      telo: `Hello,

${ekipa ? "We're the team behind SLFF" : `I'm ${po.ime} from SLFF`}, a free fantasy football game for leagues like yours. ${liga} has just joined, and the points come from the official match reports on ${vir}.

${klub} already has ${igralcev} in the game${naj ? `, the best so far: ${naj}` : ''}. Your club page with stats and a ready-made image to share:
${url}

If you like it, feel free to share the link in your club group or on Facebook. After every round you can see who is picking up points.

If a player would rather not appear under their own name, or you would prefer no further emails, a short reply is enough.

Kind regards
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  return {
    zadeva: ekip >= 5 ? `${klub}: your players are already in ${ekip} fantasy teams` : `${klub} in the fantasy game: how your players are doing`,
    telo: `Hello,

Just a quick follow-up to ${ekipa ? 'our' : 'my'} last message: ${ekip >= 5 ? `${klub} players are now in ${ekip} fantasy teams` : `${klub} players are in the game and picking up points`}${naj ? `, the best so far being ${naj}` : ''}.
${url}

If it suits your club group or Facebook page, ${ekipa ? 'we' : 'I'} would be delighted. This is ${ekipa ? 'our' : 'my'} last message about it; for questions or requests, a short reply is enough.

Kind regards
${podpis}
slff.eu
`,
  }
}

// `vir`: privzeta domena, ko liga nima zveze s site_url (le besedila s `k.vir`).
const BESEDILA = {
  AT: { sestavi: nemsko, odjava: 'Abmelden', jezik: 'de' },
  BA: { sestavi: ijekavsko, odjava: 'Odjava', jezik: 'bs', vir: 'nfsbih.ba' },
  EE: { sestavi: estonsko, odjava: 'Loobu', jezik: 'et' },
  GI: { sestavi: anglesko, odjava: 'Unsubscribe', jezik: 'en-GB', vir: 'gibraltarfa.com' },
  GR: { sestavi: grsko, odjava: 'Διαγραφή', jezik: 'el', vir: 'epo.gr' },
  HK: { sestavi: anglesko, odjava: 'Unsubscribe', jezik: 'en-GB', vir: 'hkfa.com' },
  HR: { sestavi: hrvasko, odjava: 'Odjava', jezik: 'hr' },
  HU: { sestavi: madzarsko, odjava: 'Leiratkozás', jezik: 'hu' },
  JP: { sestavi: anglesko, odjava: 'Unsubscribe', jezik: 'en-GB', vir: 'jfl.or.jp' },
  LV: { sestavi: latvijsko, odjava: 'Atteikties', jezik: 'lv', vir: 'lff.lv' },
  MD: { sestavi: romunsko, odjava: 'Dezabonare', jezik: 'ro', vir: 'fmf.md' },
  ME: { sestavi: ijekavsko, odjava: 'Odjava', jezik: 'sr-Latn-ME', vir: 'fscg.me' },
  MK: { sestavi: makedonsko, odjava: 'Одјава', jezik: 'mk', vir: 'ffm.mk' },
  MT: { sestavi: anglesko, odjava: 'Unsubscribe', jezik: 'en-GB', vir: 'mfa.com.mt' },
  RO: { sestavi: romunsko, odjava: 'Dezabonare', jezik: 'ro', vir: 'hailafotbal.ro' },
  RS: { sestavi: srbsko, odjava: 'Odjava', jezik: 'sr-Latn' },
  TH: { sestavi: anglesko, odjava: 'Unsubscribe', jezik: 'en-GB', vir: 'thaileague.co.th' },
}

/** Domena za navedbo vira iz federations.site_url ("https://www.epspeir.gr/" → "epspeir.gr"), sicer null. */
export const domenaVira = (url) => {
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : null } catch { return null }
}

/**
 * Zadeva, telo in zadeva odjave za mail klubu, ali null za državo brez besedil.
 * `k`: { drzava, team_id, liga_slug, ime_lige, klub, vir? }; `p`: { igralcev, naj, tocke, ekip };
 * `po`: pošiljatelj (POSILJATELJI), ime v podpisu ali besedilo ekipe.
 */
export function besedilo(k, p, vrsta, po = POSILJATELJI[0]) {
  const b = BESEDILA[k.drzava]
  if (!b) return null
  const { zadeva, telo } = b.sestavi({ ...k, vir: k.vir ?? b.vir }, p, vrsta, `https://slff.eu/club/${k.team_id}?t=${k.liga_slug}`, po)
  return { zadeva, telo: telo.replace(/\n{3,}/g, '\n\n'), odjava: b.odjava, jezik: b.jezik }
}

// --- MIME --------------------------------------------------------------------

/** Glava po RFC 2047 (UTF-8, base64), v kosih po največ 39 bajtov (vrstica z "Subject: " ostane ≤ 78 znakov). */
export function kodirajGlavo(s) {
  if (/^[\x20-\x7e]*$/.test(s)) return s
  const kosi = ['']
  for (const znak of s) {
    if (Buffer.byteLength(kosi.at(-1) + znak) > 39) kosi.push('')
    kosi[kosi.length - 1] += znak
  }
  return kosi.map((k) => `=?UTF-8?B?${Buffer.from(k).toString('base64')}?=`).join('\r\n ')
}

const escHtml = (t) => String(t).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/**
 * Lahek HTML iz čistopisa: videti kot navaden osebni mail (brez glave in
 * gumba), povezava krepko, podpis z drobnim logom. Vsebina je ista kot v
 * text/plain, ki ostane prvi del.
 */
export function vHtml(telo, jezik = 'en') {
  const P = 'Arial, Helvetica, sans-serif'
  const bloki = telo.trim().split(/\n{2,}/)
  const podpis = bloki.at(-1).split('\n')
  const vrstica = (v) => /^https:\/\/\S+$/.test(v)
    ? `<a href="${escHtml(v)}" style="color: #1a73e8; font-weight: bold;">${escHtml(v.replace(/^https:\/\//, ''))}</a>`
    : escHtml(v)
  const odstavki = bloki.slice(0, -1).map((b) => `<p style="margin: 0 0 14px;">${b.split('\n').map(vrstica).join('<br>')}</p>`)
  return `<!doctype html>
<html lang="${jezik}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"></head>
<body style="margin: 0; padding: 16px;">
<div style="max-width: 560px; font-family: ${P}; font-size: 15px; line-height: 22px;">
${odstavki.join('\n')}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top: 6px;"><tr>
  <td valign="top" style="padding-right: 10px;"><img src="https://slff.eu/logo/slff-ikona-180.png" width="32" height="32" alt="" style="display: block; border: 0;"></td>
  <td valign="top" style="font-family: ${P}; font-size: 14px; line-height: 18px;">${podpis.map(vrstica).join('<br>')}</td>
</tr></table>
</div></body></html>`
}

const b64 = (t) => Buffer.from(t.replace(/\r?\n/g, '\r\n')).toString('base64').match(/.{1,76}/g) ?? []

/**
 * Celoten mail (CRLF): multipart/alternative, najprej text/plain (`telo`), nato
 * lahek HTML iz istega besedila; oba dela v base64. Opomnik gre kot nov mail:
 * Message-ID prvega se ne hrani (klub_stik_posta ga nima), zato ni niti.
 */
// Ekipa (klubi@) se podpiše kot "SLFF", ne "Ekipa SLFF (SLFF)".
export function sporocilo({ na, zadeva, telo, odjava, jezik = 'en', po = POSILJATELJI[0], zdaj = new Date(), id = randomUUID() }) {
  const meja = `slff-${id}`
  return [
    `From: "${po.ekipa ? 'SLFF' : `${po.ime} (SLFF)`}" <${po.od}>`,
    `To: <${na}>`,
    `Subject: ${kodirajGlavo(zadeva)}`,
    `Date: ${zdaj.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@slff.eu>`,
    `List-Unsubscribe: <mailto:${po.od}?subject=${encodeURIComponent(odjava)}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${meja}"`,
    '',
    `--${meja}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    ...b64(telo),
    `--${meja}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    ...b64(vHtml(telo, jezik)),
    `--${meja}--`,
    '',
  ].join('\r\n')
}

// --- SMTP in IMAP (node:tls) ----------------------------------------------------

/** Povezava TLS z branjem po vrsticah: { vrstica(), pisi(t), zapri() }. */
export function povezi(host, port) {
  return new Promise((ok, ne) => {
    const s = tls.connect({ host, port, servername: host, timeout: 60000 })
    s.setEncoding('utf8')
    let buf = ''
    let napaka = null
    const cakajo = []
    const daj = () => {
      while (cakajo.length) {
        const i = buf.indexOf('\r\n')
        if (i < 0) break
        const v = buf.slice(0, i)
        buf = buf.slice(i + 2)
        cakajo.shift().ok(v)
      }
      if (napaka) while (cakajo.length) cakajo.shift().ne(napaka)
    }
    s.on('data', (d) => { buf += d; daj() })
    s.on('timeout', () => s.destroy(new Error(`${host}:${port}: časovna omejitev`)))
    s.on('error', (e) => { napaka = e; daj(); ne(e) })
    s.on('close', () => { napaka ??= new Error(`${host}:${port}: povezava zaprta`); daj() })
    s.once('secureConnect', () =>
      ok({
        vrstica: () => new Promise((ok_, ne_) => { cakajo.push({ ok: ok_, ne: ne_ }); daj() }),
        pisi: (t) => s.write(t),
        zapri: () => s.end(),
      }),
    )
  })
}

export class ZavrnjenNaslov extends Error {}
export class NapakaPrijave extends Error {}

/** Pošlje `sporocilo` prek odprte povezave `p` (SMTP, implicitni TLS). */
// Napaka po začetku DATA nosi `poDATA`: mail je morda šel, zato ga ne pošiljamo znova.
export async function posljiSmtp(p, { od, na, geslo, sporocilo: m }) {
  let poDATA = false
  const ukaz = async (t, razred = 2, ime = t?.split(' ')[0] ?? 'pozdrav') => {
    if (t != null) p.pisi(t + '\r\n')
    const vrstice = []
    let v
    do vrstice.push((v = await p.vrstica()))
    while (/^\d{3}-/.test(v))
    const koda = Number(v.slice(0, 3))
    // V napaki je le ime ukaza in odgovor strežnika, nikoli geslo.
    if (Math.floor(koda / 100) !== razred) throw Object.assign(new Error(`SMTP ${ime}: ${vrstice.join(' | ')}`), { koda })
  }
  try {
    await ukaz(null)
    await ukaz('EHLO slff.eu')
    await ukaz(`AUTH PLAIN ${Buffer.from(`\0${od}\0${geslo}`).toString('base64')}`, 2, 'AUTH').catch((e) => {
      throw new NapakaPrijave(`SMTP prijava ${od} zavrnjena (${e.koda ?? e.message})`)
    })
    await ukaz(`MAIL FROM:<${od}>`)
    await ukaz(`RCPT TO:<${na}>`).catch((e) => {
      throw e.koda >= 500 ? new ZavrnjenNaslov(e.message) : e
    })
    poDATA = true
    await ukaz('DATA', 3)
    await ukaz(`${m.replace(/^\./gm, '..')}\r\n.`, 2, 'konec DATA')
    await ukaz('QUIT').catch(() => {})
  } catch (e) {
    if (!(e instanceof NapakaPrijave) && !(e instanceof ZavrnjenNaslov)) e.poDATA = poDATA
    throw e
  } finally {
    p.zapri()
  }
}

const navednice = (s) => `"${String(s).replace(/[\\"]/g, '\\$&')}"`
const MESECI = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const datumImap = (d) => `${d.getUTCDate()}-${MESECI[d.getUTCMonth()]}-${d.getUTCFullYear()}`

/** IMAP nad odprto povezavo: ukaz(t, literal?) vrne nepoimenovane vrstice odgovora. */
export function imap(p) {
  let n = 0
  return async function ukaz(t, literal = null) {
    const oznaka = `A${++n}`
    p.pisi(`${oznaka} ${t}\r\n`)
    if (literal != null) {
      const v = await p.vrstica()
      if (!v.startsWith('+')) throw new Error(`IMAP ${t.split(' ')[0]}: ${v}`)
      p.pisi(`${literal}\r\n`)
    }
    const vrstice = []
    // ponytail: literalov v odgovorih ne beremo — rabimo le SEARCH, SELECT in APPEND.
    for (;;) {
      const v = await p.vrstica()
      if (!v.startsWith(`${oznaka} `)) { vrstice.push(v); continue }
      if (!/^\S+ OK/i.test(v)) throw new Error(`IMAP ${t.split(' ')[0]}: ${v.slice(oznaka.length + 1)}`)
      return vrstice
    }
  }
}

const iskanje = (vrstice) => vrstice.filter((v) => /^\* SEARCH/i.test(v)).flatMap((v) => v.slice(8).trim().split(/\s+/)).filter(Boolean)

/** IMAP kot pošiljatelj `po` (njegov nabiralnik, njegovo geslo). */
async function zImap(po, delo) {
  const p = await povezi(GOSTITELJ, 993)
  try {
    await p.vrstica() // pozdrav
    const ukaz = imap(p)
    await ukaz(`LOGIN ${navednice(po.od)} ${navednice(po.geslo)}`).catch(() => {
      throw new NapakaPrijave(`IMAP prijava ${po.od} zavrnjena`)
    })
    const out = await delo(ukaz)
    await ukaz('LOGOUT').catch(() => {})
    return out
  } finally {
    p.zapri()
  }
}

/**
 * Je klub odgovoril (mail z naslova ali mail, ki citira povezavo na stran
 * kluba) ali se je mail odbil? INBOX in Junk, od dneva prvega maila.
 */
export async function preveriNabiralnik(ukaz, { naslov, povezava, od }) {
  const out = { odgovor: false, odboj: false }
  const s = datumImap(od)
  for (const mapa of ['INBOX', 'Junk']) {
    try {
      await ukaz(`EXAMINE ${navednice(mapa)}`)
    } catch {
      continue // mape ni
    }
    if (iskanje(await ukaz(`UID SEARCH OR FROM "MAILER-DAEMON" FROM "postmaster" BODY ${navednice(naslov)} SINCE ${s}`)).length) out.odboj = true
    if (iskanje(await ukaz(`UID SEARCH FROM ${navednice(naslov)} SINCE ${s}`)).length) out.odgovor = true
    if (iskanje(await ukaz(`UID SEARCH BODY ${navednice(povezava)} NOT FROM "MAILER-DAEMON" NOT FROM "postmaster" SINCE ${s}`)).length) out.odgovor = true
  }
  return out
}

// --- izbira in pošiljanje ------------------------------------------------------

/** Naslov v dnevniku: "k***@domena". */
export const zakrij = (t) => String(t ?? '').replace(/([^\s<>"'(),;:@]+)@([^\s<>"'(),;:@]+\.[a-z]{2,})/gi, (_, u, d) => `${u[0]}***@${d}`)

const normKlub = (ime) => String(ime ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')

/** Vrstice istega kluba: isti team_id ali isto ime (brez šumnikov in ločil) v isti državi. */
export function istiKlub(s, vsi) {
  const ime = normKlub(s.klub)
  return vsi.filter((o) => o.id === s.id || (s.team_id != null && o.team_id === s.team_id) || (ime && o.drzava === s.drzava && normKlub(o.klub) === ime))
}

/**
 * Pošta istega kluba blokira: v zadnjih 3 dneh kdorkoli, v zadnjih 7 dneh drug
 * pošiljatelj kot `poslal` (pri prvem mailu ga še ne poznamo: null, blokira
 * vsakdo). Prvi mail pa le, če klub (na katerikoli naslov) še ni dobil
 * nobenega prvega maila ali opomnika — en stik na klub. Parkirana vrstica z
 * opombo "poslano…" (mail je šel ali morda šel, v klub_stik_posta ga ni)
 * blokira klub, dokler je človek ne razreši.
 */
function klubBlokiran(s, vsi, poStiku, zdaj, prviMail, poslal) {
  for (const o of istiKlub(s, vsi)) {
    if (/^poslano/i.test(o.opomba ?? '')) return true
    for (const r of poStiku.get(o.id) ?? []) {
      const starost = zdaj.getTime() - Date.parse(r.poslano_at)
      if (starost < 3 * DAN) return true
      if (starost < 7 * DAN && r.vrsta !== 'odgovor' && r.poslal !== poslal) return true
      if (prviMail && o.id !== s.id && ['prvi', 'opomnik'].includes(r.vrsta)) return true
    }
  }
  return false
}

/**
 * Stare avstrijske vrstice (prvi mail poslan pred vrsto, lokalno) za opomnik iz
 * vrste. Le brez pošiljatelja (vrsta ga vpiše ob prevzemu v vrsto, zato
 * pozneje parkirana vrstica nikoli več ne ustreza), stanje `poslano`, brez
 * opombe "poslano…" in le, če je vso pošto poslal Luka.
 */
export function stareZaOpomnik(stiki, posta) {
  const poStiku = new Map()
  for (const r of posta) (poStiku.get(r.stik_id) ?? poStiku.set(r.stik_id, []).get(r.stik_id)).push(r)
  return stiki.filter((s) => {
    const r = (poStiku.get(s.id) ?? []).filter((x) => x.vrsta !== 'odgovor')
    return s.drzava === 'AT' && !s.v_vrsti && s.posiljatelj == null && s.stanje === 'poslano' && !/^poslano/i.test(s.opomba ?? '') &&
      r.some((x) => x.vrsta === 'prvi') && r.every((x) => x.poslal === POSLAL)
  })
}

/**
 * Kandidati v vrstnem redu pošiljanja: najprej opomniki, nato prvi maili.
 * `vrsta`: vrstice v vrsti; `vsi`: vse vrstice klub_stik (pravilo kluba).
 * Opomnik nosi `posiljatelj` (kljuc iz POSILJATELJI): pošlje ga, kdor je poslal prvi mail.
 */
export function kandidati(vrsta, posta, aktivne, zdaj = new Date(), vsi = vrsta) {
  const poStiku = new Map()
  for (const r of posta) (poStiku.get(r.stik_id) ?? poStiku.set(r.stik_id, []).get(r.stik_id)).push(r)
  const opomniki = []
  const prvi = []
  for (const s of vrsta) {
    if (!s.v_vrsti || !s.email || !BESEDILA[s.drzava] || !aktivne.has(s.liga_slug)) continue
    const r = poStiku.get(s.id) ?? []
    const p = r.filter((x) => x.vrsta === 'prvi')
    const po = s.stanje === 'poslano' && p.length === 1 ? POSILJATELJI.find((x) => x.poslal === p[0].poslal) : null
    if (klubBlokiran(s, vsi, poStiku, zdaj, s.stanje === 'nov', po?.poslal ?? null)) continue
    if (s.stanje === 'nov') {
      if (!r.length && (!s.poslji_od || Date.parse(s.poslji_od) <= zdaj.getTime())) prvi.push(s)
      continue
    }
    // Prvi mail ni iz vrste (človek) ali vsaka pošta drugega pošiljatelja (tudi klic, drugo) za vedno zapre opomnik.
    if (!po || r.some((x) => x.vrsta !== 'odgovor' && x.poslal !== po.poslal) || r.some((x) => ['opomnik', 'odgovor'].includes(x.vrsta))) continue
    if (Date.parse(p[0].poslano_at) > zdaj.getTime() - DNI_DO_OPOMNIKA * DAN) continue
    opomniki.push({ s, prvi_at: p[0].poslano_at, posiljatelj: po.kljuc })
  }
  opomniki.sort((a, b) => Date.parse(a.prvi_at) - Date.parse(b.prvi_at))
  return [...opomniki.map(({ s, posiljatelj }) => ({ s, vrsta: 'opomnik', posiljatelj })), ...izmenicno(prvi).map((s) => ({ s, vrsta: 'prvi' }))]
}

/**
 * Prvi maili izmenično po državah (AT, EE, AT, EE …), vsaka v svojem vrstnem
 * redu: nova država ne čaka za zaostankom druge (1300 avstrijskih ob 100 na dan).
 */
export function izmenicno(vrstice) {
  const poDrzavi = new Map()
  for (const s of vrstice) (poDrzavi.get(s.drzava) ?? poDrzavi.set(s.drzava, []).get(s.drzava)).push(s)
  const vrste = [...poDrzavi.values()]
  const izid = []
  for (let i = 0; izid.length < vrstice.length; i++) for (const v of vrste) if (i < v.length) izid.push(v[i])
  return izid
}

// V dnevnik nikoli naslov kluba: stik #id (klub, liga).
const log = (t) => console.log(zakrij(t))
const oznaka = (s) => `stik #${s.id} (${s.klub}, ${s.liga_slug})`
const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * En krog: vsak dejaven pošiljatelj največ `najvec` mailov. Vrne true, če je kaj
 * ostalo neurejeno (opozorilo). Pošiljatelj z zavrnjeno prijavo gre v
 * `zavrnjeni` (do ponovnega zagona); ko so zavrnjeni vsi, krog vrže NapakaPrijave.
 */
async function krog(db, { posiljatelji, suho, najvec, zavrnjeni = new Set() }) {
  const preveri = ({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
  }
  let opozorilo = false
  const zdaj = new Date()
  const vceraj = new Date(zdaj.getTime() - 30 * 3600e3).toISOString()
  const aktivni = posiljatelji.filter((po) => !zavrnjeni.has(po.kljuc))
  if (!aktivni.length) throw new NapakaPrijave('vsi pošiljatelji imajo zavrnjeno prijavo')
  // Danes poslano po pošiljatelju (klub_stik_posta.poslal, dunajski dan).
  const danes = new Map(POSILJATELJI.map((po) => [po.kljuc, 0]))
  for (const r of await vseVrstice((od, do_) => db.from('klub_stik_posta').select('id, poslal, poslano_at').in('poslal', POSILJATELJI.map((po) => po.poslal))
    .in('vrsta', ['prvi', 'opomnik']).gte('poslano_at', vceraj).order('id').range(od, do_))) {
    if (danDunaj(new Date(r.poslano_at)) !== danDunaj(zdaj)) continue
    const po = POSILJATELJI.find((x) => x.poslal === r.poslal)
    danes.set(po.kljuc, danes.get(po.kljuc) + 1)
  }
  // Parkirani "morda poslani" maili današnjega dne štejejo v mejo pošiljatelja iz
  // opombe (starejše opombe brez naslova štejejo Luki).
  for (const r of preveri(await db.from('klub_stik').select('updated_at, opomba').ilike('opomba', 'poslano%').gte('updated_at', vceraj))) {
    if (danDunaj(new Date(r.updated_at)) !== danDunaj(zdaj)) continue
    const po = POSILJATELJI.find((x) => r.opomba.includes(x.od)) ?? POSILJATELJI[0]
    danes.set(po.kljuc, danes.get(po.kljuc) + 1)
  }
  const prostor = new Map(aktivni.map((po) => [po.kljuc, { dan: dnevnaMeja(po, zdaj) - danes.get(po.kljuc), krog: najvec }]))
  const stanjeDneva = () => aktivni.map((po) => `${po.kljuc} ${danes.get(po.kljuc)}/${dnevnaMeja(po, zdaj)}`).join(', ')
  if (aktivni.every((po) => prostor.get(po.kljuc).dan <= 0)) {
    log(`Danes poslano: ${stanjeDneva()} — dnevna meja`)
    if (!suho) return false
  }

  const lige = await vseVrstice((od, do_) =>
    db.from('competitions').select('id, slug, name, active, vir_url, federations(site_url)').order('id').range(od, do_),
  )
  const poSlugu = new Map(lige.map((l) => [l.slug, l]))
  const aktivne = new Set(lige.filter((l) => l.active).map((l) => l.slug))
  const vsi = await vseVrstice((od, do_) =>
    db.from('klub_stik').select('id, team_id, klub, drzava, liga_slug, email, stanje, v_vrsti, poslji_od, opomba').order('id').range(od, do_),
  )
  const vrsta = vsi.filter((s) => s.v_vrsti && ['nov', 'poslano'].includes(s.stanje))
  const posta = await vseVrstice((od, do_) =>
    db.from('klub_stik_posta').select('id, stik_id, vrsta, poslal, poslano_at').order('id').range(od, do_),
  )
  const vsiKandidati = kandidati(vrsta, posta, aktivne, zdaj, vsi)
  const vOknuZdaj = vsiKandidati.filter(({ s }) => vOknu(s.drzava, zdaj))
  // --suho pokaže naslednje maile tudi zunaj okna, da se besedilo da pregledati kadarkoli.
  const izbor = suho ? vsiKandidati : vOknuZdaj
  if (suho || izbor.length)
    log(`Danes ${stanjeDneva()}; v vrsti ${vsiKandidati.filter((x) => x.vrsta === 'opomnik').length} opomnikov, ${vsiKandidati.filter((x) => x.vrsta === 'prvi').length} prvih; v oknu zdaj ${vOknuZdaj.length}`)
  const sezone = new Map()

  async function podatki(s) {
    const liga = poSlugu.get(s.liga_slug)
    if (!sezone.has(liga.id)) sezone.set(liga.id, preveri(await db.rpc('sezona_lige', { p_competition_id: liga.id })))
    const st = preveri(await db.from('player_season_standings').select('id, points')
      .eq('competition_id', liga.id).eq('team_id', s.team_id).eq('season', sezone.get(liga.id)).gt('matches', 0)
      .order('points', { ascending: false, nullsFirst: false }).order('id'))
    const igralci = preveri(await db.from('players').select('id, first_name, last_name, anonimiziran_at')
      .eq('competition_id', liga.id).eq('team_id', s.team_id).order('id'))
    const poId = new Map(igralci.map((x) => [x.id, x]))
    const naj = st.find((x) => poId.get(x.id) && !poId.get(x.id).anonimiziran_at)
    const ekipe = new Set()
    for (let i = 0; i < igralci.length; i += 300) {
      const kos = igralci.slice(i, i + 300).map((x) => x.id)
      for (const r of await vseVrstice((od, do_) =>
        db.from('fantasy_roster').select('fantasy_team_id, player_id, fantasy_teams!inner(hisna)')
          .in('player_id', kos).eq('fantasy_teams.hisna', false).order('fantasy_team_id').order('player_id').range(od, do_),
      )) ekipe.add(r.fantasy_team_id)
    }
    const ime = naj ? `${poId.get(naj.id).first_name ?? ''} ${poId.get(naj.id).last_name ?? ''}`.trim() : null
    return { igralcev: st.length, naj: ime || null, tocke: naj?.points ?? 0, ekip: ekipe.size, ime_lige: liga.name, vir: domenaVira(liga.vir_url) ?? domenaVira(liga.federations?.site_url) }
  }

  // Vrstica, ki je ne smemo poslati znova, ostane zunaj vrste z opombo za človeka.
  async function parkiraj(s, opomba) {
    const { error } = await db.from('klub_stik').update({ v_vrsti: false, opomba: opomba.slice(0, 500) }).eq('id', s.id)
    if (error) log(`  ! ${oznaka(s)}: opombe ni bilo mogoče zapisati (${error.message}); vrstica je že zunaj vrste`)
  }
  async function vrniVVrsto(s) {
    const { error } = await db.from('klub_stik').update({ v_vrsti: true }).eq('id', s.id)
    if (error) log(`  ! ${oznaka(s)}: vrnitev v vrsto ni uspela (${error.message}); mail NI šel`)
  }

  // Zavrnjena prijava izklopi le tega pošiljatelja; ko so zavrnjeni vsi, napaka gre naprej.
  const zavrni = (po, e) => {
    zavrnjeni.add(po.kljuc)
    prostor.get(po.kljuc).dan = 0
    log(`Prijava ${po.kljuc} zavrnjena (${e.message}) — izklopljen do ponovnega zagona`)
    if (posiljatelji.every((x) => zavrnjeni.has(x.kljuc))) throw e
  }

  let poslanih = 0
  for (const { s, vrsta: vrstaMaila, posiljatelj } of izbor) {
    if (!izberiPosiljatelja(aktivni, prostor)) break
    // Opomnik pošlje le, kdor je poslal prvi mail; če ni dejaven ali je poln, opomnik čaka.
    const po = vrstaMaila === 'opomnik' ? aktivni.find((x) => x.kljuc === posiljatelj) : izberiPosiljatelja(aktivni, prostor)
    const pr = po && prostor.get(po.kljuc)
    if (!pr || pr.dan <= 0 || pr.krog <= 0) continue
    // Pred prevzemom vrstice: nič ni poslano, napaka le preskoči kandidata.
    let b
    try {
      const p = await podatki(s)
      if (!p.igralcev) {
        log(`preskok ${oznaka(s)}: klub nima igralcev z nastopi`)
        continue
      }
      if (vrstaMaila === 'opomnik' && !suho) {
        const prvi = posta.find((r) => r.stik_id === s.id && r.vrsta === 'prvi')
        const n = await zImap(po, (ukaz) => preveriNabiralnik(ukaz, {
          naslov: s.email, povezava: `slff.eu/club/${s.team_id}?t=${s.liga_slug}`, od: new Date(prvi.poslano_at),
        }))
        if (n.odgovor) {
          const zapis = { stik_id: s.id, vrsta: 'odgovor', poslal: s.email, za: po.od, opomba: `odgovor v ${po.od}` }
          preveri(await db.from('klub_stik_posta').insert(zapis))
          posta.push({ ...zapis, poslano_at: new Date().toISOString() })
          log(`odgovor: ${oznaka(s)} — brez opomnika`)
          continue
        }
        if (n.odboj) {
          preveri(await db.from('klub_stik').update({ stanje: 'napacen_mail', opomba: `odboj v ${po.od} (${danDunaj(zdaj)})` }).eq('id', s.id))
          log(`odboj: ${oznaka(s)} — napacen_mail`)
          continue
        }
      }
      b = besedilo({ ...s, ime_lige: p.ime_lige, vir: p.vir }, p, vrstaMaila, po)
    } catch (e) {
      if (e instanceof NapakaPrijave) {
        zavrni(po, e)
        continue
      }
      log(`preskok ${oznaka(s)}: ${e.message}`)
      continue
    }
    if (!b) continue
    if (suho) {
      log(`\n--- ${vrstaMaila} (${po.kljuc}) → ${oznaka(s)} ${s.email}${vOknu(s.drzava, zdaj) ? '' : ' [zunaj okna]'}\n${b.zadeva}\n\n${b.telo}`)
      poslanih++
      pr.dan--
      pr.krog--
      continue
    }
    if (poslanih) await cakaj((60 + Math.random() * 90) * 1000)
    // Tik pred pošiljanjem znova: okno, pošta kluba (tudi tega kroga), prevzem vrstice.
    // Pošta kluba sveže iz baze (drug pošiljatelj je morda pisal med krogom).
    let sveze
    try {
      const vrsticeDrzave = await vseVrstice((od, do_) =>
        db.from('klub_stik').select('id, team_id, klub, drzava, opomba').eq('drzava', s.drzava).order('id').range(od, do_))
      const idji = istiKlub(s, vrsticeDrzave).map((o) => o.id)
      const postaKluba = preveri(await db.from('klub_stik_posta').select('id, stik_id, vrsta, poslal, poslano_at').in('stik_id', idji).order('id'))
      sveze = kandidati([s], postaKluba, aktivne, new Date(), vrsticeDrzave).length > 0
    } catch (e) {
      log(`preskok ${oznaka(s)}: sveža pošta kluba ni prebrana (${e.message})`)
      continue
    }
    if (!vOknu(s.drzava, new Date()) || !sveze) {
      log(`preskok ${oznaka(s)}: zunaj okna ali klub je medtem dobil pošto`)
      continue
    }
    const prevzem = await db.from('klub_stik').update({ v_vrsti: false }).eq('id', s.id).eq('v_vrsti', true).in('stanje', ['nov', 'poslano']).select('id')
    if (prevzem.error || !prevzem.data?.length) {
      log(`preskok ${oznaka(s)}: ${prevzem.error ? `prevzem ni uspel (${prevzem.error.message})` : 'vrstico je vzel drug zagon'}`)
      continue
    }
    const m = sporocilo({ na: s.email, zadeva: b.zadeva, telo: b.telo, odjava: b.odjava, jezik: b.jezik, po })
    try {
      await posljiSmtp(await povezi(GOSTITELJ, 465), { od: po.od, na: s.email, geslo: po.geslo, sporocilo: m })
    } catch (e) {
      if (e instanceof NapakaPrijave) {
        await vrniVVrsto(s)
        zavrni(po, e)
        continue
      }
      if (e instanceof ZavrnjenNaslov) {
        const { error } = await db.from('klub_stik').update({ stanje: 'napacen_mail', opomba: `SMTP zavrnil naslov: ${e.message}`.slice(0, 500) }).eq('id', s.id)
        log(`zavrnjen naslov: ${oznaka(s)} — napacen_mail${error ? ` (zapis ni uspel: ${error.message}; vrstica zunaj vrste)` : ''}`)
        continue
      }
      if (e.poDATA) {
        // Mail je morda šel: nikoli samodejno znova, in šteje v mejo pošiljatelja.
        pr.dan--
        pr.krog--
        await parkiraj(s, `poslano? preveri ročno (${vrstaMaila}, ${danDunaj(new Date())}, ${po.od}): ${e.message}`)
        log(`NEZNANO, ali je šel: ${oznaka(s)} — zunaj vrste, preveri Sent (${e.message})`)
        opozorilo = true
        continue
      }
      if (e.koda >= 500) {
        await parkiraj(s, `SMTP zavrnil (${vrstaMaila}): ${e.message}`)
        log(`zavrnjeno: ${oznaka(s)} — zunaj vrste (${e.message})`)
        continue
      }
      // Pred DATA (povezava, 4xx): nič ni šlo — vrstica nazaj v vrsto, krog konča.
      await vrniVVrsto(s)
      log(`SMTP ni dosegljiv (${e.message}) — konec kroga`)
      return true
    }
    poslanih++
    pr.dan--
    pr.krog--
    const zapis = { stik_id: s.id, vrsta: vrstaMaila, poslal: po.poslal, za: s.email, zadeva: b.zadeva, telo: b.telo }
    let vpis
    for (let i = 0; i < 3; i++) {
      vpis = await db.from('klub_stik_posta').insert(zapis)
      if (!vpis.error) break
      await cakaj(5000)
    }
    if (vpis.error) {
      await parkiraj(s, `poslano (${vrstaMaila}, ${danDunaj(new Date())}, ${po.od}), a vpis v klub_stik_posta ni uspel — vpiši ročno`)
      log(`POSLANO, A NI VPISANO: ${oznaka(s)} (${vpis.error.message}) — zunaj vrste`)
      opozorilo = true
      continue
    }
    posta.push({ ...zapis, poslano_at: new Date().toISOString() })
    // Nazaj v vrsto šele po vpisu (za opomnik čez tri dni); posiljatelj = nabiralnik, ki je poslal.
    const { error: eVrsta } = await db.from('klub_stik').update({ v_vrsti: true, posiljatelj: po.od }).eq('id', s.id)
    log(`${vrstaMaila} (${po.kljuc}) → ${oznaka(s)}${eVrsta ? ` (vrnitev v vrsto ni uspela: ${eVrsta.message})` : ''}`)
    try {
      await zImap(po, (ukaz) => ukaz(`APPEND "Sent" (\\Seen) {${Buffer.byteLength(m)}}`, m))
    } catch (e) {
      log(`  (kopija v Sent ni uspela: ${e.message})`)
    }
  }
  if (suho) log(`\n--suho: ${poslanih} mailov bi šlo (nič poslano, nič vpisano).`)
  else if (poslanih) log(`Poslano: ${poslanih}`)
  return opozorilo
}

const KROG_MS = 10 * 60e3
const PO_PRIJAVI_MS = 60 * 60e3

async function main() {
  const arg = (ime) => {
    const i = process.argv.indexOf(ime)
    return i >= 0 ? process.argv[i + 1] : undefined
  }
  const suho = process.argv.includes('--suho')
  const zanka = process.argv.includes('--zanka') && !suho
  const najvec = Number(arg('--najvec') ?? 2)
  const env = process.env
  const posiljatelji = aktivniPosiljatelji(env)
  // V zanki (Docker restart) pred izhodom počakamo, da manjkajoča nastavitev ne vrti ponovnih zagonov.
  const konec = async (sporocilo) => {
    console.error(sporocilo)
    if (zanka) await cakaj(10 * 60e3)
    process.exit(1)
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) await konec('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY.')
  if (!suho && !posiljatelji.length) await konec(`Manjka geslo nabiralnika (${POSILJATELJI.map((po) => po.env).join(', ')}).`)
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  if (!zanka) {
    try {
      // --suho brez gesel pokaže razdelitev med vse pošiljatelje.
      if (await krog(db, { posiljatelji: suho && !posiljatelji.length ? POSILJATELJI : posiljatelji, suho, najvec })) process.exitCode = 1
    } catch (e) {
      console.error(zakrij(e instanceof NapakaPrijave ? `Prijava v nabiralnik ni uspela: ${e.message}` : `Napaka: ${e.message}`))
      process.exit(1)
    }
    return
  }
  // Delavec na strežniku (slff-posta): krog vsakih 10 minut; prehodne napake
  // le zabeleži. Zavrnjena prijava: ura premora, nato izhod (Docker ga
  // znova zažene) — da napačno geslo ne tolče po strežniku.
  log(`Pošta klubom: zanka teče (krog vsakih 10 minut; ${posiljatelji.map((po) => po.kljuc).join(', ')}).`)
  const zavrnjeni = new Set()
  for (;;) {
    const zacetek = Date.now()
    try {
      await krog(db, { posiljatelji, suho: false, najvec, zavrnjeni })
    } catch (e) {
      if (e instanceof NapakaPrijave) {
        console.error(zakrij(`Prijava v nabiralnik ni uspela: ${e.message} — premor 1 h, nato izhod`))
        await cakaj(PO_PRIJAVI_MS)
        process.exit(1)
      }
      console.error(zakrij(`Krog ni uspel: ${e.message}`))
    }
    await cakaj(Math.max(0, KROG_MS - (Date.now() - zacetek)))
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}
