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
]

export function prevediNapako(sporocilo: string): string {
  const zadetek = ZNANE.find(([vzorec]) => vzorec.test(sporocilo))
  return zadetek ? t(zadetek[1]) : sporocilo
}
