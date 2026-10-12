// Napake iz baze (RPC) so slovenske. Tiste, ki jih vidi navaden uporabnik,
// prevedemo; neznano sporočilo ostane, kot je (admin ostaja slovenski).
import { t } from '../i18n'

const ZNANE: [RegExp, Parameters<typeof t>[0]][] = [
  [/^Mini lige s to kodo ni/, 'skupno.napakeRpc.miniLigaNi'],
  [/^To ni tvoja ekipa/, 'skupno.napakeRpc.niTvojaEkipa'],
  [/^Ime mini lige naj ima/, 'skupno.napakeRpc.imeMiniLige'],
  [/^Za mini ligo se je treba prijaviti/, 'skupno.napakeRpc.prijavaMiniLiga'],
  [/^Ni dovoljenja za urejanje te ekipe/, 'skupno.napakeRpc.niDovoljenja'],
  [/^Kode mini lige ni bilo mogo/, 'skupno.napakeRpc.kodaNeUstvarjena'],
  [/^O tem golu je že odločeno/, 'skupno.napakeRpc.golOdlocen'],
  [/^Ze si poznavalec/, 'skupno.napakeRpc.zePoznavalec'],
  [/^Tvoja prosnja za to ligo ze caka/, 'skupno.napakeRpc.prosnjaCaka'],
  [/^Prošnja za to ligo je bila nedavno zavrnjena/, 'skupno.napakeRpc.prosnjaZavrnjena'],
  [/^Izbrani klub ne igra v tej ligi/, 'skupno.napakeRpc.klubNeIgra'],
  [/^Že imaš potrjen profil igralca/, 'igralci.prevzem.napake.zePotrjen'],
  [/^Tvoj zahtevek že čaka/, 'igralci.prevzem.napake.zeCaka'],
  [/^Ime tega igralca je skrito/, 'igralci.prevzem.napake.skrito'],
  [/^Preveč zahtevkov/, 'igralci.prevzem.napake.prevec'],
  [/^V mladinski ligi moraš potrditi/, 'igralci.prevzem.napake.star16'],
  [/^Dokaz mora biti povezava/, 'igralci.prevzem.napake.dokaz'],
  [/^Ta profil si že prijavil/, 'igralci.prevzem.napake.zePrijavil'],
  [/^Besedilo vsebuje nedovoljene znake/, 'igralci.preverjen.napake.znaki'],
  [/^To besedilo ni dovoljeno/, 'igralci.preverjen.napake.neprimerno'],
  [/^Izpostavi lahko le svojo tekmo/, 'igralci.preverjen.napake.tekma'],
  [/^Plačilo trenutno ni na voljo/, 'igralci.preverjen.napake.niNaVoljo'],
  [/^Preveriš lahko le svoj potrjen profil/, 'igralci.preverjen.napake.niTvoj'],
  [/^Profil je že preverjen/, 'igralci.preverjen.napake.zePreverjen'],
  [/^Ime na znački ima lahko/, 'igralci.preverjen.napake.imeZnacke'],
  [/^Plačila ni bilo mogoče začeti/, 'igralci.preverjen.ponudba.napaka'],
  [/^Uradno odsotnost lahko javi le potrjeni/, 'igralci.uradno.napake.niLastnik'],
  [/^To ni tvoja uradna odsotnost/, 'igralci.uradno.napake.niLastnik'],
  [/^Uradno odsotnost že imaš odprto/, 'igralci.uradno.napake.odprta'],
  [/^Dva opomina v tej sezoni/, 'igralci.uradno.napake.blokiran'],
  [/^Začetek odsotnosti je lahko/, 'igralci.uradno.napake.zacetek'],
  [/^Vrnitev mora biti po začetku/, 'igralci.uradno.napake.vrnitev'],
  [/^Opomba ima lahko največ/, 'igralci.uradno.napake.opomba'],
  [/^Preveč uradnih odsotnosti/, 'igralci.uradno.napake.prevec'],
  [/^Uradna odsotnost ni več odprta/, 'igralci.uradno.napake.niOdprta'],
  [/^Ta mini liga ni javna/, 'lestvice.javneLige.napake.niJavna'],
  [/^Za to mini ligo potrebuješ ekipo v njeni ligi/, 'lestvice.javneLige.napake.ekipaVLigi'],
  [/^To mini ligo si že prijavil/, 'lestvice.javneLige.napake.zePrijavil'],
  [/^Preveč odprtih prijav/, 'lestvice.javneLige.napake.prevecPrijav'],
  [/^Javnost mini lige nastavi le/, 'lestvice.javneLige.napake.leUstvarjalec'],
  [/^To mini ligo je skril administrator/, 'lestvice.javneLige.napake.zaklenjena'],
]

export function prevediNapako(sporocilo: string): string {
  const zadetek = ZNANE.find(([vzorec]) => vzorec.test(sporocilo))
  return zadetek ? t(zadetek[1]) : sporocilo
}
