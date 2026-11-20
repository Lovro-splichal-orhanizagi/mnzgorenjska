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
//   PONUDBA_SPONZOR=1   vklopi enkratno ponudbo pokrovitelja (PONUDBA; privzeto izklopljena)
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
  AT: 'Europe/Vienna', SI: 'Europe/Ljubljana', BA: 'Europe/Sarajevo', EE: 'Europe/Tallinn', GI: 'Europe/Gibraltar', GR: 'Europe/Athens', HK: 'Asia/Hong_Kong',
  HR: 'Europe/Zagreb', HU: 'Europe/Budapest', JP: 'Asia/Tokyo', LV: 'Europe/Riga', MD: 'Europe/Chisinau', ME: 'Europe/Podgorica',
  MK: 'Europe/Skopje', MT: 'Europe/Malta', RO: 'Europe/Bucharest', RS: 'Europe/Belgrade', TH: 'Asia/Bangkok', UA: 'Europe/Kyiv',
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
  // `p.kolega`: prvi mail je oktobra poslal kolega (ROCNI_PRVI), opomnik gre od drugega.
  const kol = p.kolega
  return {
    zadeva: ekip >= 5 ? `${klub}: Ihre Spieler sind schon in ${ekip} Fantasy-Teams` : `${klub} im Fantasy-Spiel: so läuft es für Ihre Spieler`,
    telo: `Guten Tag,

kurz nachgefragt ${kol ? `zur Nachricht meines Kollegen ${kol} aus dem Oktober` : `zu ${ekipa ? 'unserer' : 'meiner'} letzten Nachricht`}: ${ekip >= 5 ? `Die Spieler von ${klub} stehen inzwischen in ${ekip} Fantasy-Teams` : `Die Spieler von ${klub} sind im Spiel und sammeln Punkte`}${naj ? `, bisher bester ist ${naj}` : ''}.
${url}

Wenn das für Ihre Vereinsgruppe oder Facebook passt, freut es uns. Das ist ${ekipa || kol ? 'unsere' : 'meine'} letzte Nachricht dazu; für Fragen oder Wünsche genügt eine kurze Antwort.

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
  const kol = p.kolega
  return {
    zadeva: ekip >= 5 ? `${klub} játékosai már ${ekip} fantasy csapatban szerepelnek` : `${klub} a fantasy játékban: így állnak a játékosok`,
    telo: `${ekipa ? 'Jó napot kívánunk!' : 'Jó napot kívánok!'}

Röviden ${kol ? `jelentkezem kollégám, ${kol} októberi levele` : ekipa ? 'jelentkezünk az előző levelünk' : 'jelentkezem az előző levelem'} kapcsán: ${klub} játékosai a játékban vannak és pontokat gyűjtenek${ekip >= 5 ? `, és már ${ekip} fantasy csapatban szerepelnek` : ''}${naj ? ` (eddig a legjobb: ${naj})` : ''}.
${url}

Ha ez illik a klub csoportjába vagy a Facebookra, örülünk neki. Ez az utolsó ${ekipa || kol ? 'levelünk' : 'levelem'} ebben a témában; kérdés vagy kérés esetén elég egy rövid válasz.

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

// Ukrajinščina: prejemniki so večinoma poklicni klubi (UPL, Perša/Druha liha),
// zato "ліги, як Ваша", ne amaterske. Ime lige za dvopičjem (sklon), vikanje z
// veliko (Ви, Ваш). Število: 1/21 бал, 2–4 бали, 5+ балів, decimalno "7,5 бала".
const ukBali = (n) => (Number.isInteger(Number(n ?? 0)) ? slovansko(n, 'бал', 'бали', 'балів') : 'бала')

function ukrajinsko(k, p, vrsta, url, po) {
  const { ime_lige: liga, klub, vir } = k
  const ekipa = po.ekipa
  const podpis = ekipa ? 'Команда SLFF' : po.ime
  const naj = p.naj ? `${p.naj}, ${tocke(p.tocke)} ${ukBali(p.tocke)}` : null
  const gravciv = `${p.igralcev} ${slovansko(p.igralcev, 'гравець', 'гравці', 'гравців')}`
  if (vrsta === 'prvi') {
    return {
      zadeva: `${klub}: уже ${gravciv} у фентезі-футболі (${liga})`,
      telo: `Добрий день!

${ekipa ? 'Ми команда SLFF. SLFF є безкоштовною грою' : `Мене звати ${po.ime}, я з SLFF. Це безкоштовна гра`} у фентезі-футбол для таких ліг, як Ваша. Нещодавно до гри додано лігу: ${liga}. Бали нараховуються за офіційними протоколами матчів на сайті ${vir}.

У грі вже ${gravciv} клубу ${klub}${naj ? `, найкращий наразі: ${naj}` : ''}. Сторінка клубу зі статистикою та готовим зображенням для поширення:
${url}

Якщо Вам подобається, поділіться посиланням у клубній групі або у Facebook. Після кожного туру видно, хто набирає бали.

Якщо гравець не хоче бути в грі під своїм ім'ям або Ви не бажаєте отримувати листи, достатньо короткої відповіді.

З повагою
${podpis}
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  const komandah = `${ekip} фентезі-${slovansko(ekip, 'команді', 'командах', 'командах')}`
  return {
    zadeva: ekip >= 5 ? `${klub}: Ваші гравці вже у ${komandah}` : `${klub} у фентезі-грі: як справи у Ваших гравців`,
    telo: `Добрий день!

${ekipa ? 'Коротко нагадуємо про наш' : 'Коротко нагадую про мій'} попередній лист: гравці клубу ${klub} у грі й набирають бали${ekip >= 5 ? `, і вже є у ${komandah}` : ''}${naj ? `. Найкращий наразі: ${naj}` : ''}.
${url}

Якщо це підходить для клубної групи або Facebook, ${ekipa ? 'ми будемо раді' : 'я буду радий'}. Це ${ekipa ? 'наш' : 'мій'} останній лист на цю тему; для питань чи побажань достатньо короткої відповіді.

З повагою
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
  UA: { sestavi: ukrajinsko, odjava: 'Відписатися', jezik: 'uk', vir: 'upl.ua' },
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
// `golo`: le text/plain (brez HTML in loga), za maile, ki naj ne pristanejo med promocijami.
export function sporocilo({ na, zadeva, telo, odjava, jezik = 'en', po = POSILJATELJI[0], zdaj = new Date(), id = randomUUID(), golo = false }) {
  const meja = `slff-${id}`
  const glava = [
    `From: "${po.ekipa ? 'SLFF' : `${po.ime} (SLFF)`}" <${po.od}>`,
    `To: <${na}>`,
    `Subject: ${kodirajGlavo(zadeva)}`,
    `Date: ${zdaj.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@slff.eu>`,
    `List-Unsubscribe: <mailto:${po.od}?subject=${encodeURIComponent(odjava)}>`,
    'MIME-Version: 1.0',
  ]
  if (golo) return [...glava, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', ...b64(telo), ''].join('\r\n')
  return [
    ...glava,
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
    const ena = s.stanje === 'poslano' && p.length === 1
    const kolega = ena && ROCNI_PRVI.drzave.includes(s.drzava) ? ROCNI_PRVI.poslal[p[0].poslal] ?? null : null
    const po = !ena ? null : kolega ? POSILJATELJI.find((x) => x.kljuc === ROCNI_PRVI.posiljatelj) : POSILJATELJI.find((x) => x.poslal === p[0].poslal)
    if (klubBlokiran(s, vsi, poStiku, zdaj, s.stanje === 'nov', po?.poslal ?? null)) continue
    if (s.stanje === 'nov') {
      if (!r.length && (!s.poslji_od || Date.parse(s.poslji_od) <= zdaj.getTime())) prvi.push(s)
      continue
    }
    // Prvi mail ni iz vrste (človek, razen ROCNI_PRVI) ali vsaka pošta drugega pošiljatelja (tudi klic, drugo) za vedno zapre opomnik.
    if (!po || r.some((x) => x !== p[0] && x.vrsta !== 'odgovor' && x.poslal !== po.poslal) || r.some((x) => ['opomnik', 'odgovor'].includes(x.vrsta))) continue
    if (Date.parse(p[0].poslano_at) > zdaj.getTime() - DNI_DO_OPOMNIKA * DAN) continue
    opomniki.push({ s, prvi_at: p[0].poslano_at, posiljatelj: po.kljuc, kolega })
  }
  opomniki.sort((a, b) => Date.parse(a.prvi_at) - Date.parse(b.prvi_at))
  return [...opomniki.map(({ s, posiljatelj, kolega }) => ({ s, vrsta: 'opomnik', posiljatelj, kolega })), ...izmenicno(prvi).map((s) => ({ s, vrsta: 'prvi' }))]
}

/**
 * Prvi mail, ki so ga AT in HU klubom 16.–24. 10. 2026 poslali ljudje z info@
 * ali z Gmaila (zunaj vrste). Lastnik je 20. 11. 2026 odobril en opomnik iz
 * luka@ (osebno, podpis, odgovori gredo v HelpStack), ki pove, da je oktobra
 * pisal kolega. Nabiralnika prvega maila delavec ne bere, zato odgovor nanj
 * ustavi opomnik le, če je vpisan v klub_stik_posta (pregled IMAP gleda luka@).
 * Le ti točni zapisi `poslal`; stik z dvema prvima mailoma opomnika ne dobi.
 */
export const ROCNI_PRVI = {
  posiljatelj: 'luka',
  drzave: ['AT', 'HU'],
  poslal: { 'Nejc (info@slff.eu)': 'Nejc', 'Nejc (nejcjen@gmail.com)': 'Nejc', 'Lovro (splih.94@gmail.com)': 'Lovro' },
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

// --- enkratno: sponzor 1. GNL (SLF-485, SLF-491) --------------------------------
// Besedilo, ki ga je Nejc 15. 11. 2026 potrdil na SLF-485 ("send it to the 7
// clubs exactly as written"), enkrat vsakemu od sedmih SI klubov lige `clani`
// (klub_stik id), iz nejc@slff.eu. Gre skozi isti krog kot vrsta (okno, dnevna
// meja, razmik, pravilo kluba tik pred pošiljanjem, pregled nabiralnika pred
// pisanjem), v klub_stik_posta se zapiše kot vrsta `drugo`; stanje stika in
// `posiljatelj` se ne spremenita. Klub, ki je to zadevo že dobil, ne dobi
// ničesar več, zato po sedmih mailih koda miruje; po tem jo odstrani.
export const SPONZOR = {
  ids: [12, 15, 16, 17, 19, 21, 22],
  drzava: 'SI',
  liga: 'clani',
  posiljatelj: 'nejc',
  zadeva: "Pokrovitelj 1. GNL na SLFF: 37,50 EUR za klub",
  telo: `Pozdravljeni,

pišem iz SLFF (slff.eu), fantasy nogometne igre za slovenske amaterske lige. Ta teden se nam je pridružilo več kot 2.800 novih uporabnikov, skupaj jih je že več kot 11.000, aktivnih pa je okoli 3.100 na teden.

Iščemo enega pokrovitelja za celotno stran 1. GNL (člani) za sezono 2026/27. Če ga pripelje vaš klub, prejme klub 25 % zneska, to je 37,50 EUR.

Pokrovitelj, na primer podjetje, ki že podpira vaš klub, dobi:
- logotip in napis "Predstavlja: [podjetje]" na vrhu strani 1. GNL,
- svoj logotip na vsaki kartički igralca te lige, ki jo igralci in navijači delijo na družbenih omrežjih,
- omembo v tedenskih objavah o ligi,
- poročilo o dosegu ob koncu sezone.

Cena: 150 EUR za sezono (brez DDV).

Če poznate podjetje, ki bi to želelo, mi odgovorite na ta mail, pa uredimo ostalo.

Lep pozdrav,
Nejc
SLFF
`,
}

/**
 * Kluba iz SPONZOR, ki mu ga lahko pošljemo zdaj: stanje poslano ali opomnik
 * (ne odgovoril, ne_zeli, napacen_mail), še brez te zadeve, pošta kluba po
 * pravilu (3 dni od kogarkoli, 7 dni od drugega kot pošiljatelj). `v_vrsti`
 * se NE gleda: teh sedem vrstic je bilo vpisanih ročno, brez vrste, in mail
 * jih vrste ne spremeni. Parkirana vrstica ("poslano…" v opombi) blokira.
 */
export function kandidatiSponzor(vsi, posta, zdaj = new Date(), sp = SPONZOR) {
  const poStiku = new Map()
  for (const r of posta) (poStiku.get(r.stik_id) ?? poStiku.set(r.stik_id, []).get(r.stik_id)).push(r)
  const po = POSILJATELJI.find((x) => x.kljuc === sp.posiljatelj)
  return vsi.filter((s) =>
    sp.ids.includes(s.id) && s.drzava === sp.drzava && s.liga_slug === sp.liga && s.email &&
    ['poslano', 'opomnik'].includes(s.stanje) &&
    !istiKlub(s, vsi).some((o) => (poStiku.get(o.id) ?? []).some((r) => r.vrsta === 'drugo' && r.zadeva === sp.zadeva)) &&
    !klubBlokiran(s, vsi, poStiku, zdaj, false, po.poslal))
}

/**
 * Nabiralnik, v katerem bi bil odgovor ali odboj na prejšnji mail kluba: prvi
 * `prvi`/`opomnik` zapis, ki ga je poslal dejaven nabiralnik delavca (po
 * naslovu v `poslal`, tudi pri ročno vpisanem "--poslal"). Brez takega zapisa
 * (poslano z Gmaila ali drugače) vrne null: velja le pravilo kluba iz baze.
 */
export function nabiralnikPrejsnjega(posta, stikId, aktivni) {
  const prej = posta.filter((r) => r.stik_id === stikId && ['prvi', 'opomnik'].includes(r.vrsta))
    .sort((a, b) => Date.parse(a.poslano_at) - Date.parse(b.poslano_at))
  for (const r of prej) {
    const po = aktivni.find((x) => String(r.poslal ?? '').toLowerCase().includes(x.od))
    if (po) return { po, od: new Date(r.poslano_at) }
  }
  return null
}

// --- enkratno: ponudba pokrovitelja klubom, ki so odgovorili ali sodelujejo ----
// Lastnik jo je odobril 20. 11. 2026 kot izjemo od pravila "odgovoril/sodeluje
// ne pišemo" (CLAUDE.md, *Pošta klubom*). Teče le s PONUDBA_SPONZOR=1 v okolju
// (privzeto izklopljeno). Enkrat na klub (tudi ne klubu, ki je dobil SPONZOR),
// ne SK in GB (ročno, Nejc), ne države brez okna (DE, PL, DK, ES) in ne
// mladinske lige (brez kartic in objav), ne ob
// ne_zeli na katerem koli naslovu kluba, ne ob naši pošti v 7 dneh ali odgovoru
// v 3 dneh. Pošlje nabiralnik delavca, ki je klubu nazadnje pisal, sicer klubi@
// s podpisom človeka iz niti. Le text/plain, brez povezave razen slff.eu v
// podpisu. Številke: auth.users in različni uporabniki v dejanja_uporabnikov v
// 7 dneh, 20. 11. 2026 (13.100 in 4.130), zaokroženo navzdol.
const PONUDBA_OZNAKA = 'ponudba sponzor 2026-11'
export const PONUDBA = {
  oznaka: PONUDBA_OZNAKA,
  stanja: ['odgovoril', 'sodeluje'],
  besedila: {
    SI: { jezik: 'sl', odjava: 'Odjava', sestavi: ({ liga, ime }) => ({
      zadeva: `Pokrovitelj za stran lige (${liga})`,
      telo: `Pozdravljeni,

ker smo si že dopisovali, vam pišem neposredno o možnosti, od katere ima nekaj tudi vaš klub.

SLFF ima zdaj več kot 13.000 uporabnikov, okoli 4.000 jih igra vsak teden. Za stran lige (${liga}) iščemo enega pokrovitelja za sezono. Če ga pripelje vaš klub, klub prejme 25 % zneska, to je 37,50 EUR.

Pokrovitelj, na primer podjetje, ki že podpira vaš klub, dobi:
- logotip in napis "Ligo predstavlja: [podjetje]" na strani lige,
- svoj logotip na vsaki kartici igralca te lige, ki jo delijo igralci in navijači,
- omembo v tedenskih objavah o ligi,
- poročilo o dosegu ob koncu sezone.

Cena: 150 EUR za sezono (brez DDV).

Če poznate podjetje, ki bi ga to zanimalo, mi odgovorite na ta mail, pa uredimo ostalo.

Lep pozdrav,
${ime}
slff.eu
` }) },
    AT: { jezik: 'de', odjava: 'Abmelden', sestavi: ({ liga, ime }) => ({
      zadeva: `Sponsor für die ${liga} auf SLFF`,
      telo: `Guten Tag,

wir hatten bereits Kontakt, deshalb schreibe ich Ihnen direkt wegen einer Möglichkeit, von der auch Ihr Verein etwas hat.

SLFF hat inzwischen über 13.000 Nutzer, rund 4.000 spielen jede Woche. Für die Seite der ${liga} suchen wir einen Sponsor für eine Saison. Wenn Ihr Verein ihn vermittelt, erhält der Verein 25 % des Betrags, also 37,50 EUR.

Der Sponsor, zum Beispiel eine Firma, die Ihren Verein schon unterstützt, bekommt:
- sein Logo und den Hinweis "Präsentiert von [Firma]" auf der Ligaseite,
- sein Logo auf jeder Spielerkarte dieser Liga, die Spieler und Fans teilen,
- eine Erwähnung in den wöchentlichen Beiträgen zur Liga,
- einen Bericht über die Reichweite am Saisonende.

Preis: 150 EUR pro Saison (zzgl. USt.).

Wenn Sie eine Firma kennen, die das interessieren könnte, antworten Sie einfach auf diese E-Mail, den Rest klären wir.

Mit freundlichen Grüßen
${ime}
slff.eu
` }) },
    HU: { jezik: 'hu', odjava: 'Leiratkozás', sestavi: ({ liga, ime }) => ({
      zadeva: `Szponzor a bajnokság oldalára (${liga})`,
      telo: `Jó napot kívánok!

Korábban már leveleztünk, ezért közvetlenül Önöknek írok egy lehetőségről, amelyből a klub is részesül.

Az SLFF-nek ma már több mint 13 000 felhasználója van, közülük nagyjából 4000 minden héten játszik. A bajnokság oldalára (${liga}) egy szponzort keresünk egy szezonra. Ha a szponzort a klub hozza, a klub megkapja az összeg 25%-át, azaz 37,50 eurót.

A szponzor, például egy cég, amely már most is támogatja a klubot, ezt kapja:
- logója és a "A bajnokságot bemutatja: [cég]" felirat a bajnokság oldalán,
- logója a bajnokság minden játékoskártyáján, amelyet a játékosok és a szurkolók megosztanak,
- említés a bajnokságról szóló heti bejegyzésekben,
- jelentés az elérésről a szezon végén.

Ár: 150 euró szezononként (áfa nélkül).

Ha ismernek olyan céget, amelyet ez érdekelhet, elég válaszolni erre a levélre, a többit megbeszéljük.

Üdvözlettel
${ime}
slff.eu
` }) },
    HR: { jezik: 'hr', odjava: 'Odjava', sestavi: ({ liga, ime }) => ({
      zadeva: `Sponzor za stranicu lige (${liga})`,
      telo: `Poštovani,

već smo bili u kontaktu pa vam se izravno javljam s prilikom od koje i vaš klub ima koristi.

SLFF danas ima više od 13.000 korisnika, a njih oko 4.000 igra svaki tjedan. Za stranicu lige (${liga}) tražimo jednog sponzora za sezonu. Ako ga dovede vaš klub, klub dobiva 25 % iznosa, odnosno 37,50 EUR.

Sponzor, na primjer tvrtka koja već podržava vaš klub, dobiva:
- logotip i natpis "Ligu predstavlja: [tvrtka]" na stranici lige,
- svoj logotip na svakoj kartici igrača ove lige koju dijele igrači i navijači,
- spominjanje u tjednim objavama o ligi,
- izvješće o dosegu na kraju sezone.

Cijena: 150 EUR po sezoni (bez PDV-a).

Ako znate tvrtku koju bi to moglo zanimati, samo odgovorite na ovaj mail, a ostalo ćemo dogovoriti.

Lijep pozdrav
${ime}
slff.eu
` }) },
    EE: { jezik: 'et', odjava: 'Loobu', sestavi: ({ liga, ime }) => ({
      zadeva: `Toetaja liiga lehele (${liga})`,
      telo: `Tere!

Oleme varem suhelnud, seega kirjutan otse ühest võimalusest, millest saab kasu ka Teie klubi.

SLFF-il on nüüd üle 13 000 kasutaja ja umbes 4000 neist mängib iga nädal. Liiga lehele (${liga}) otsime üheks hooajaks ühte toetajat. Kui toetaja tuleb Teie klubi kaudu, saab klubi 25% summast ehk 37,50 eurot.

Toetaja, näiteks ettevõte, kes juba toetab Teie klubi, saab:
- oma logo ja kirja "Liigat esitleb: [ettevõte]" liiga lehel,
- oma logo selle liiga igal mängijakaardil, mida mängijad ja fännid jagavad,
- mainimise iganädalastes postitustes liiga kohta,
- hooaja lõpus ülevaate, kui paljude inimesteni see jõudis.

Hind: 150 eurot hooaja eest (käibemaksuta).

Kui teate ettevõtet, keda see võiks huvitada, vastake lihtsalt sellele kirjale, ülejäänu lepime kokku.

Lugupidamisega
${ime}
slff.eu
` }) },
    GI: { jezik: 'en-GB', odjava: 'Unsubscribe', sestavi: ({ liga, ime }) => ({
      zadeva: `A sponsor for the ${liga} page on SLFF`,
      telo: `Hello,

We have been in touch before, so I am writing to you directly about something your club can benefit from.

SLFF now has more than 13,000 users, and around 4,000 of them play every week. We are looking for one sponsor for the ${liga} page for a season. If your club brings the sponsor, the club receives 25% of the amount, which is EUR 37.50.

The sponsor, for example a company that already supports your club, gets:
- its logo and "The league is presented by [company]" on the league page,
- its logo on every player card from this league that players and fans share,
- a mention in our weekly posts about the league,
- a reach report at the end of the season.

Price: EUR 150 per season (excluding VAT).

If you know a company that might be interested, just reply to this email and we will arrange the rest.

Kind regards
${ime}
slff.eu
` }) },
    GR: { jezik: 'el', odjava: 'Διαγραφή', sestavi: ({ liga, ime }) => ({
      zadeva: `Χορηγός για τη σελίδα του πρωταθλήματος (${liga})`,
      telo: `Χαίρετε,

Έχουμε ήδη επικοινωνήσει, γι' αυτό σας γράφω απευθείας για μια δυνατότητα από την οποία ωφελείται και ο σύλλογός σας.

Το SLFF έχει πλέον πάνω από 13.000 χρήστες και περίπου 4.000 από αυτούς παίζουν κάθε εβδομάδα. Για τη σελίδα του πρωταθλήματος (${liga}) αναζητούμε έναν χορηγό για μία σεζόν. Αν τον φέρει ο σύλλογός σας, ο σύλλογος λαμβάνει το 25% του ποσού, δηλαδή 37,50 ευρώ.

Ο χορηγός, για παράδειγμα μια εταιρεία που ήδη στηρίζει τον σύλλογό σας, λαμβάνει:
- το λογότυπό του και την ένδειξη "Το πρωτάθλημα παρουσιάζει: [εταιρεία]" στη σελίδα του πρωταθλήματος,
- το λογότυπό του σε κάθε κάρτα παίκτη του πρωταθλήματος που μοιράζονται παίκτες και φίλαθλοι,
- αναφορά στις εβδομαδιαίες αναρτήσεις για το πρωτάθλημα,
- έκθεση απήχησης στο τέλος της σεζόν.

Τιμή: 150 ευρώ ανά σεζόν (χωρίς ΦΠΑ).

Αν γνωρίζετε κάποια εταιρεία που μπορεί να ενδιαφέρεται, απαντήστε απλώς σε αυτό το μήνυμα και θα κανονίσουμε τα υπόλοιπα.

Με εκτίμηση
${ime}
slff.eu
` }) },
    RO: { jezik: 'ro', odjava: 'Dezabonare', sestavi: ({ liga, ime }) => ({
      zadeva: `Sponsor pentru pagina ligii (${liga})`,
      telo: `Bună ziua,

Am mai fost în legătură, așa că vă scriu direct despre o posibilitate din care câștigă și clubul dvs.

SLFF are acum peste 13.000 de utilizatori, iar aproximativ 4.000 dintre ei joacă în fiecare săptămână. Pentru pagina ligii (${liga}) căutăm un singur sponsor pentru un sezon. Dacă sponsorul vine prin clubul dvs., clubul primește 25% din sumă, adică 37,50 EUR.

Sponsorul, de exemplu o firmă care deja sprijină clubul dvs., primește:
- logoul și mențiunea "Liga este prezentată de: [firma]" pe pagina ligii,
- logoul pe fiecare card de jucător din această ligă pe care îl distribuie jucătorii și suporterii,
- o mențiune în postările săptămânale despre ligă,
- un raport de vizibilitate la final de sezon.

Preț: 150 EUR pe sezon (fără TVA).

Dacă știți o firmă care ar putea fi interesată, răspundeți pur și simplu la acest e-mail și ne ocupăm de rest.

Cu stimă
${ime}
slff.eu
` }) },
  },
}

/** Zadeva, telo, odjava, jezik ponudbe za državo stika ali null. */
export function besediloPonudbe(drzava, liga, ime) {
  const b = PONUDBA.besedila[drzava]
  return b ? { ...b.sestavi({ liga, ime }), odjava: b.odjava, jezik: b.jezik } : null
}

const IMENA_NITI = ['Luka', 'Lovro', 'Nejc', 'Jernej']
// Mladinske lige nimajo kartic in objav, ki jih ponudba obljublja (isto pravilo kot jeMladinskiSlug v src/lib/prevzem.ts).
const mladinskaLiga = (slug) => /(^|-)(u1[4-9]|mladinci|kadeti|kadetki|kadetska|juniori)($|-)/.test(slug ?? '') || /^sml[0-9]/.test(slug ?? '')

/**
 * Kdo pošlje ponudbo: nabiralnik delavca, ki je klubu nazadnje pisal (prvi,
 * opomnik, drugo), sicer klubi@ s podpisom človeka, ki je pisal z drugega
 * naslova (info@, Gmail), sicer Nejc. Vrne { kljuc, ime }.
 */
export function posiljateljPonudbe(posta, stikId) {
  const nasi = posta.filter((r) => r.stik_id === stikId && ['prvi', 'opomnik', 'drugo'].includes(r.vrsta))
    .sort((a, b) => Date.parse(b.poslano_at) - Date.parse(a.poslano_at))
  for (const r of nasi) {
    const po = POSILJATELJI.find((x) => String(r.poslal ?? '').toLowerCase().includes(x.od))
    if (po && !po.ekipa) return { kljuc: po.kljuc, ime: po.ime }
  }
  const ime = nasi.map((r) => String(r.poslal ?? '').split(' ')[0]).find((x) => IMENA_NITI.includes(x))
  return { kljuc: 'klubi', ime: ime ?? 'Nejc' }
}

/**
 * Stiki za ponudbo zdaj: stanje odgovoril/sodeluje, država z besedilom in
 * oknom, liga aktivna, en naslov na klub, klub brez ponudbe ali SPONZOR, brez
 * ne_zeli ali parkirane vrstice, brez naše pošte v 7 dneh in odgovora v 3 dneh.
 */
export function kandidatiPonudba(vsi, posta, aktivne, zdaj = new Date()) {
  const poStiku = new Map()
  for (const r of posta) (poStiku.get(r.stik_id) ?? poStiku.set(r.stik_id, []).get(r.stik_id)).push(r)
  const izbrani = []
  for (const s of vsi) {
    if (!PONUDBA.stanja.includes(s.stanje) || !s.email || !PONUDBA.besedila[s.drzava] || !OKNA[s.drzava] || !aktivne.has(s.liga_slug) || mladinskaLiga(s.liga_slug)) continue
    const klub = istiKlub(s, vsi)
    if (izbrani.some((x) => klub.includes(x))) continue
    const blok = klub.some((o) => o.stanje === 'ne_zeli' || /^poslano/i.test(o.opomba ?? '') || (poStiku.get(o.id) ?? []).some((r) => {
      const starost = zdaj.getTime() - Date.parse(r.poslano_at)
      return (r.vrsta === 'drugo' && (r.opomba === PONUDBA.oznaka || r.zadeva === SPONZOR.zadeva)) ||
        (r.vrsta === 'odgovor' ? starost < 3 * DAN : starost < 7 * DAN)
    }))
    if (!blok) izbrani.push(s)
  }
  return izbrani
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
async function krog(db, { posiljatelji, suho, najvec, zavrnjeni = new Set(), ponudba = false }) {
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
    .in('vrsta', ['prvi', 'opomnik', 'drugo']).gte('poslano_at', vceraj).order('id').range(od, do_))) {
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
    db.from('klub_stik_posta').select('id, stik_id, vrsta, poslal, poslano_at, zadeva, opomba').order('id').range(od, do_),
  )
  const vsiKandidati = [
    ...kandidatiSponzor(vsi, posta, zdaj).map((s) => ({ s, vrsta: 'sponzor', posiljatelj: SPONZOR.posiljatelj })),
    ...(ponudba ? kandidatiPonudba(vsi, posta, aktivne, zdaj) : []).map((s) => {
      const { kljuc, ime } = posiljateljPonudbe(posta, s.id)
      return { s, vrsta: 'ponudba', posiljatelj: kljuc, ime }
    }),
    ...kandidati(vrsta, posta, aktivne, zdaj, vsi),
  ]
  const vOknuZdaj = vsiKandidati.filter(({ s }) => vOknu(s.drzava, zdaj))
  // --suho pokaže naslednje maile tudi zunaj okna, da se besedilo da pregledati kadarkoli.
  const izbor = suho ? vsiKandidati : vOknuZdaj
  if (suho || izbor.length)
    log(`Danes ${stanjeDneva()}; v vrsti ${vsiKandidati.filter((x) => x.vrsta === 'opomnik').length} opomnikov, ${vsiKandidati.filter((x) => x.vrsta === 'prvi').length} prvih, ${vsiKandidati.filter((x) => x.vrsta === 'sponzor').length} sponzor, ${vsiKandidati.filter((x) => x.vrsta === 'ponudba').length} ponudba${ponudba ? '' : ' (izklopljena)'}, ${vsiKandidati.filter((x) => x.kolega).length} opomnikov za ročni prvi; v oknu zdaj ${vOknuZdaj.length}`)
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
  async function vrniVVrsto(s, vrstaMaila) {
    if (ENKRATNI.has(vrstaMaila)) return // sponzor in ponudba vrstice nista prevzela
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
  for (const { s, vrsta: vrstaMaila, posiljatelj, kolega, ime } of izbor) {
    if (!izberiPosiljatelja(aktivni, prostor)) break
    // Opomnik pošlje le, kdor je poslal prvi mail (sponzor: nejc; ROCNI_PRVI: luka); če ni dejaven ali je poln, mail čaka.
    let po = vrstaMaila !== 'prvi' ? aktivni.find((x) => x.kljuc === posiljatelj) : izberiPosiljatelja(aktivni, prostor)
    // Ponudba iz klubi@ je podpisana s človekom iz niti, ne z ekipo.
    if (po && vrstaMaila === 'ponudba') po = { ...po, ime, ekipa: false }
    const golo = vrstaMaila === 'ponudba' || !!kolega
    const pr = po && prostor.get(po.kljuc)
    if (!pr || pr.dan <= 0 || pr.krog <= 0) continue
    // Pred prevzemom vrstice: nič ni poslano, napaka le preskoči kandidata.
    let b
    try {
      const p = ENKRATNI.has(vrstaMaila) ? null : await podatki(s)
      if (p && !p.igralcev) {
        log(`preskok ${oznaka(s)}: klub nima igralcev z nastopi`)
        continue
      }
      // Ponudba gre klubom, ki so že odgovorili: pregled nabiralnika bi našel prav ta odgovor.
      if (!['prvi', 'ponudba'].includes(vrstaMaila) && !suho) {
        // Odgovor in odboj pride v nabiralnik, ki je poslal prvi mail (pri opomniku je to `po`).
        let prvi = posta.find((r) => r.stik_id === s.id && r.vrsta === 'prvi')
        let pregled = vrstaMaila === 'opomnik' ? po : aktivni.find((x) => x.poslal === prvi?.poslal)
        if (vrstaMaila === 'sponzor') {
          // Ročno vpisani stiki: nabiralnik po naslovu; brez njega velja le pravilo kluba iz baze.
          const prej = nabiralnikPrejsnjega(posta, s.id, aktivni)
          pregled = prej?.po
          prvi = prej && { poslano_at: prej.od }
          if (!prej) log(`${oznaka(s)}: prejšnji mail ni iz nabiralnika delavca, odgovor preverjen le v bazi`)
        } else if (!prvi || !pregled) {
          log(`preskok ${oznaka(s)}: nabiralnik prvega maila ni dejaven`)
          continue
        }
        const n = pregled ? await zImap(pregled, (ukaz) => preveriNabiralnik(ukaz, {
          naslov: s.email, povezava: `slff.eu/club/${s.team_id}?t=${s.liga_slug}`, od: new Date(prvi.poslano_at),
        })) : { odgovor: false, odboj: false }
        if (n.odgovor) {
          const zapis = { stik_id: s.id, vrsta: 'odgovor', poslal: s.email, za: pregled.od, opomba: `odgovor v ${pregled.od}` }
          preveri(await db.from('klub_stik_posta').insert(zapis))
          posta.push({ ...zapis, poslano_at: new Date().toISOString() })
          log(`odgovor: ${oznaka(s)} — brez opomnika`)
          continue
        }
        if (n.odboj) {
          preveri(await db.from('klub_stik').update({ stanje: 'napacen_mail', opomba: `odboj v ${pregled.od} (${danDunaj(zdaj)})` }).eq('id', s.id))
          log(`odboj: ${oznaka(s)} — napacen_mail`)
          continue
        }
      }
      b = vrstaMaila === 'sponzor' ? { zadeva: SPONZOR.zadeva, telo: SPONZOR.telo, odjava: 'Odjava', jezik: 'sl' }
        : vrstaMaila === 'ponudba' ? besediloPonudbe(s.drzava, poSlugu.get(s.liga_slug).name, po.ime)
          : besedilo({ ...s, ime_lige: p.ime_lige, vir: p.vir }, { ...p, kolega }, vrstaMaila, po)
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
      log(`\n--- ${vrstaMaila}${kolega ? ` (prvi: ${kolega})` : ''} (${po.kljuc}, podpis ${po.ime}${golo ? ', text/plain' : ''}) → ${s.drzava} ${oznaka(s)} ${s.email}${vOknu(s.drzava, zdaj) ? '' : ' [zunaj okna]'}\n${b.zadeva}\n\n${b.telo}`)
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
        db.from('klub_stik').select('id, team_id, klub, drzava, liga_slug, email, stanje, v_vrsti, opomba').eq('drzava', s.drzava).order('id').range(od, do_))
      const idji = istiKlub(s, vrsticeDrzave).map((o) => o.id)
      const postaKluba = preveri(await db.from('klub_stik_posta').select('id, stik_id, vrsta, poslal, poslano_at, zadeva, opomba').in('stik_id', idji).order('id'))
      sveze = vrstaMaila === 'sponzor'
        ? kandidatiSponzor(vrsticeDrzave, postaKluba).some((x) => x.id === s.id && x.email === s.email)
        : vrstaMaila === 'ponudba'
          ? kandidatiPonudba(vrsticeDrzave, postaKluba, aktivne).some((x) => x.id === s.id && x.email === s.email)
          : kandidati([s], postaKluba, aktivne, new Date(), vrsticeDrzave).length > 0
    } catch (e) {
      log(`preskok ${oznaka(s)}: sveža pošta kluba ni prebrana (${e.message})`)
      continue
    }
    if (!vOknu(s.drzava, new Date()) || !sveze) {
      log(`preskok ${oznaka(s)}: zunaj okna ali klub je medtem dobil pošto`)
      continue
    }
    // Sponzor: vrstice ne prevzamemo (v_vrsti je lahko false od vsega začetka); en zagon, svež pregled tik prej,
    // neznan izid parkira vrstico z opombo "poslano…", ki blokira klub.
    const prevzem = ENKRATNI.has(vrstaMaila) ? { data: [s] } : await db.from('klub_stik').update({ v_vrsti: false }).eq('id', s.id).eq('v_vrsti', true).in('stanje', ['nov', 'poslano']).select('id')
    if (prevzem.error || !prevzem.data?.length) {
      log(`preskok ${oznaka(s)}: ${prevzem.error ? `prevzem ni uspel (${prevzem.error.message})` : 'vrstico je vzel drug zagon'}`)
      continue
    }
    const m = sporocilo({ na: s.email, zadeva: b.zadeva, telo: b.telo, odjava: b.odjava, jezik: b.jezik, po, golo })
    try {
      await posljiSmtp(await povezi(GOSTITELJ, 465), { od: po.od, na: s.email, geslo: po.geslo, sporocilo: m })
    } catch (e) {
      if (e instanceof NapakaPrijave) {
        await vrniVVrsto(s, vrstaMaila)
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
      await vrniVVrsto(s, vrstaMaila)
      log(`SMTP ni dosegljiv (${e.message}) — konec kroga`)
      return true
    }
    poslanih++
    pr.dan--
    pr.krog--
    const zapis = { stik_id: s.id, vrsta: ENKRATNI.has(vrstaMaila) ? 'drugo' : vrstaMaila, poslal: po.poslal, za: s.email, zadeva: b.zadeva, telo: b.telo,
      ...(vrstaMaila === 'ponudba' ? { opomba: PONUDBA.oznaka } : {}) }
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
    const { error: eVrsta } = ENKRATNI.has(vrstaMaila) ? {} : await db.from('klub_stik').update({ v_vrsti: true, posiljatelj: po.od }).eq('id', s.id)
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
const ENKRATNI = new Set(['sponzor', 'ponudba'])
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
  // Enkratna ponudba pokrovitelja (PONUDBA): le izrecno vklopljena.
  const ponudba = env.PONUDBA_SPONZOR === '1'
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
      if (await krog(db, { posiljatelji: suho && !posiljatelji.length ? POSILJATELJI : posiljatelji, suho, najvec, ponudba })) process.exitCode = 1
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
      await krog(db, { posiljatelji, suho: false, najvec, zavrnjeni, ponudba })
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
