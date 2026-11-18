#!/usr/bin/env bash
# Nočni uvoz enega koša lig ene države (posel matrike v uvoz-zapisnikov.yml).
#
# Okolje: DRZAVA, KOS, KOSOV, URNIK (github.event.schedule), ROK_MIN
# (po koliko minutah od začetka POSLA ne začnemo nove lige; privzeto 190 —
# posel ima 240 in mora še shraniti predpomnilnik), ZACETEK_POSLA (epoch
# sekunde prvega koraka posla; brez njega šteje od zagona skripte).
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
#
# Kar se je naučilo:
#   - Ena liga ne sme podreti ostalih. Spletišča zvez so različno zanesljiva
#     (Nova Gorica okrnjena stran zvečer, Ljubljana in NZS občasno počasni);
#     pod `set -e` je prva napaka ustavila zanko in vse NASLEDNJE lige tisti
#     dan sploh niso bile uvožene. Vsak ukaz preverimo posebej (`|| ok=0`).
#   - Vrstni red ni stalen: najprej lige, ki jih nočni uvoz najdlje ni uspešno
#     obdelal (nocni-kosi.mjs). 13. 10. 2026 je avstrijski posel vsak zagon
#     obdelal istih 42 lig od 162 in ga je GitHub po 240 minutah preklical.
#   - Liga, ki pade (omrežje, zaklep vrstice v bazi), dobi na koncu še en
#     poskus, če je čas.
#   - Izhod 4 = vir je zavrnil (403, 429, izziv): tega vira ne beremo naprej,
#     drugih virov koša pa.
#   - Izhod 5 = vir je nedosegljiv (HTTP 5xx/522 tudi po ponovitvah): to ni
#     napaka naše kode. Koš ga javi kot opozorilo "vir ne dela", ne pade, lige
#     tega vira ta zagon preskoči; liga ni zabeležena kot osvežena, zato je
#     naslednji zagon spet prvi na vrsti.
#   - Zavrnitev in izpad ustavita spletišče (4. stolpec nocni-kosi.mjs), ne
#     celega vira: eps je ~30 spletišč regionalnih zvez in 403 Dodekaneza je
#     16. 11. 2026 ustavil še 11 lig drugih zvez (SLF-500).
#   - Liga z znano napako (5. stolpec nocni-kosi.mjs, ZNANE_NAPAKE) ima svojo
#     nalogo: poskusimo jo, neuspeh (razen zavrnitve) je opozorilo. Ena liga
#     (de-verbandsliga-baden) je dneve barvala cel DE rdeče (SLF-557).
#   - Rok šteje od začetka posla, ne skripte: 17. 11. 2026 so HU, AT in SK
#     105 min čakali na tedensko prevrednotenje, nato 190 min uvažali in GitHub
#     jih je po 240 min preklical (rdeče, brez shranjenega stanja; SLF-557).
#   - Izhod 3 uvoza razporeda = razpored ima klub manj kot baza (izstop ali
#     okrnjena stran): uvoz je uspel, liga ni padla, koš izpiše opozorilo.
set -uo pipefail

: "${DRZAVA:?}" "${KOS:=1}" "${KOSOV:=1}" "${URNIK:=}" "${ROK_MIN:=190}"
# Urni zagon ob vikendih (ne tisti ob 05 UTC) dela le, kar je novo.
URNI=0
case "$URNIK" in
  '17 17,21 * * 5,6,0'|'17 0-4,6-16,18-20,22-23 * * 5,6,0') URNI=1 ;;
esac
STANJE="scripts/.predpomnilnik/nocni-stanje-${DRZAVA}-${KOS}.json"
# Malta: zapisnik, ki mu vir ne objavi minute izključitve, nočni uvoz preskoči in
# izpiše (kot pri ostalih ligah mfa); strogi ostanejo le pregledani zgodovinski
# uvozi. 15. 11. 2026 je en tak zapisnik podrl celo mt-nl2 (SLF-452).
export SLFF_MFA_NESTROGO=1
LIGE=$(mktemp)

node scripts/nocni-kosi.mjs --drzava "$DRZAVA" --kos "$KOS" --kosov "$KOSOV" --stanje "$STANJE" > "$LIGE" || exit 1
echo "Koš $KOS/$KOSOV, lige (najdlje neosvežene prve): $(cut -d' ' -f1 "$LIGE" | tr '\n' ' ')"
[ -s "$LIGE" ] || { echo "Država $DRZAVA nima vklopljenih lig v tem košu."; exit 0; }
[ "$URNI" = 1 ] && echo "Urni zagon: preračun le dotaknjenih krogov"

zacetek=${ZACETEK_POSLA:-$(date +%s)}
minut() { echo $(( ($(date +%s) - zacetek) / 60 )); }

zavrnjeni=" "   # ključi virov (spletišča), ki so ta zagon vrnili 401/403/429/izziv ali porabili proračun zahtev
nedosegljivi=" " # ključi virov (spletišča), ki so ta zagon vrnili 5xx (vir je dol)
zadnji_izhod=0
teci() { "$@" </dev/null; zadnji_izhod=$?; return "$zadnji_izhod"; }

# uvozi <liga> <faktor> <vir> → 0 v redu, 1 napaka, 4 vir je zavrnil, 5 vir je dol
uvozi() {
  local liga=$1 ok=1 zavrnil=0 dol=0 pending=0
  export SLFF_PREMOR_FAKTOR=$2
  unset SLFF_FUSSBALL_CAPTURE SLFF_FCF_CURRENT_FIXTURES
  if [ "$3" = fussball-public ]; then
    # Capture/replay the complete current source before any native write. Source
    # refusals stop this provider for the run; no second attempt or fallback.
    # Only exit 4 of the capture is a refusal; the reader gate (GitHub API) and a
    # transport or parse failure fail this league alone, retried at the end.
    node scripts/bulk-source-coordination.mjs </dev/null || return 1
    local capture_dir
    capture_dir=$(mktemp -d)
    rmdir "$capture_dir" || return 1
    teci node scripts/prepare-fussball-nightly.mjs --tekmovanje "$liga" --output "$capture_dir" --max-requests 3000 || { case $zadnji_izhod in 4|5) return "$zadnji_izhod" ;; *) return 1 ;; esac; }
    export SLFF_FUSSBALL_CAPTURE="$capture_dir"
  fi
  # Current FCF calendars already exist. Do not refresh thousands of future
  # report pages merely to collect this week's results; manual calendar setup
  # stays available outside this scheduled current-fixture path.
  if [ "$3" = fcf ]; then
    export SLFF_FCF_CURRENT_FIXTURES=1
  else
  # Izhod 3: klub manjka v razporedu (izstop?) — odloči človek, liga ni padla.
  teci node scripts/uvoz-razporeda.mjs --tekmovanje "$liga" --pisi || case $zadnji_izhod in
    3) odlocitve="$odlocitve $liga" ;;
    4) ok=0; zavrnil=1 ;;
    5) dol=1 ;;
    *) ok=0 ;;
  esac
  node scripts/uvoz-delegiranja.mjs --tekmovanje "$liga" --pisi </dev/null || ok=0
  fi
  rm -f /tmp/uvozenih
  local dodatno=""
  local dfb_pending=()
  [ "$3" = dfb ] && dfb_pending=(--dfb-pending)
  [ "$URNI" = 1 ] && dodatno="--samo-dotaknjene"
  if [ "$zavrnil" = 0 ] && [ "$dol" = 0 ]; then
    teci node scripts/uvoz-zapisnikov.mjs --tekmovanje "$liga" --sveze 21 --porocilo /tmp/uvozenih $dodatno "${dfb_pending[@]}" || case $zadnji_izhod in
      4) ok=0; zavrnil=1 ;;
      5) dol=1 ;;
      6) pending=1 ;;
      *) ok=0 ;;
    esac
  fi
  unset SLFF_FCF_CURRENT_FIXTURES
  # Vir je dol: ostali koraki bi bili brez zapisnikov, liga ni uvožena.
  [ "$dol" = 1 ] && return 5
  # Prestopi so poročilo; vir, ki jih ne objavlja, se konča z 0.
  node scripts/uvoz-registracij.mjs --tekmovanje "$liga" </dev/null || ok=0
  # Novi igralci pridejo le z novimi zapisniki. Brez poročila (uvoz je padel
  # pred koncem) ugibamo za vsak primer.
  if [ "$URNI" = 1 ] && [ "$(cat /tmp/uvozenih 2>/dev/null || echo x)" = "0" ]; then
    echo "Ni novih tekem — ugibanje pozicij preskočeno"
  else
    # Vir, ki vratarja označi na tekmo (Srbija): igralca iz polja, ki ga je ena
    # oznaka prekrstila v GK, vrne v polje (drugi viri: preskoči).
    node scripts/lazni-vratarji.mjs --tekmovanje "$liga" --pisi </dev/null || ok=0
    node scripts/ugani-pozicije.mjs --tekmovanje "$liga" --pisi --samo-nove </dev/null || ok=0
  fi
  [ "$zavrnil" = 1 ] && return 4
  [ "$ok" = 1 ] && [ "$pending" = 1 ] && return 6
  [ "$ok" = 1 ] && return 0
  return 1
}

padle=""
vir_dol=""     # vir vrača 5xx: povzetek na koncu, koš zaradi tega ne pade
cakajoci=""    # DFB podatki čakajo; brez takojšnje ponovitve cele lige
odlocitve=""   # razpored ima klub manj kot baza: izstop kluba ali --dovoli-manj-klubov
zacasno=""      # padle v prvem krogu, za ponovni poskus: "liga faktor vir ključ"
preskocene=""
znane=""        # lige z znano napako (ZNANE_NAPAKE v nocni-kosi.mjs): opozorilo, ne padec
while read -r liga faktor vir kljuc znana; do
  [ -n "$liga" ] || continue
  kljuc=${kljuc:-$vir}
  if [ "$(minut)" -ge "$ROK_MIN" ]; then preskocene="$preskocene $liga"; continue; fi
  if [[ "$nedosegljivi" == *" $kljuc "* ]]; then
    echo "::warning title=Vir ne dela::$liga preskočena — vir $kljuc je ta zagon vrnil 5xx"
    vir_dol="$vir_dol $liga"; continue
  fi
  if [[ "$zavrnjeni" == *" $kljuc "* ]]; then
    echo "::warning title=Vir je zavrnil::$liga preskočena — vir $kljuc je ta zagon že zavrnil"
    padle="$padle $liga"; continue
  fi
  echo "::group::$liga ($vir, faktor premora $faktor, $(minut) min)"
  uvozi "$liga" "$faktor" "$vir"; izid=$?
  echo "::endgroup::"
  case $izid in
    6) echo "::warning title=DFB podatki čakajo::$liga — DFB pending; veljavni zapisniki uvoženi, zavrnjeni v karanteni, ponovitev posameznih zapisnikov v poznejšem zagonu"
       cakajoci="$cakajoci $liga" ;;
    5) echo "::warning title=Vir ne dela::$liga — vir $kljuc vrača 5xx (nedosegljiv); ostale lige tega vira preskočene, ni napaka uvoza"
       nedosegljivi="$nedosegljivi$kljuc "; vir_dol="$vir_dol $liga" ;;
    0) echo "$liga: v redu"; node scripts/nocni-kosi.mjs --zabelezi "$liga" --stanje "$STANJE" ;;
    4) echo "::error title=Vir je zavrnil::$liga — vir $kljuc je vrnil 401/403/429, izziv ali preusmeritev, ali je zmanjkalo proračuna zahtev; ostale lige tega vira preskočene, ne obhajamo"
       zavrnjeni="$zavrnjeni$kljuc "; padle="$padle $liga" ;;
    *) echo "::warning title=Uvoz lige::$liga ni uspela; poskusim še enkrat na koncu"
       zacasno="$zacasno$liga $faktor $vir $kljuc $znana"$'\n' ;;
  esac
done < "$LIGE"

# Drugi poskus: prehodne napake (omrežje, "lock timeout" ob hkratnem pisanju).
# Vir, ki je med tem zavrnil (4) ali je dol (5), ne dobi novih zahtev: ostale
# njegove lige čakajo brez poskusa, enako kot v prvem krogu.
while read -r liga faktor vir kljuc znana; do
  [ -n "$liga" ] || continue
  kljuc=${kljuc:-$vir}
  # Brez časa za drugi poskus: liga ni zabeležena kot osvežena, naslednji
  # zagon jo vzame prvo. 16. 11. 2026 je en prehoden padec baze (520,
  # "terminated") po 165 min obarval AT in HU rdeče (SLF-524).
  if [ "$(minut)" -ge "$ROK_MIN" ]; then preskocene="$preskocene $liga"; continue; fi
  if [[ "$nedosegljivi" == *" $kljuc "* ]]; then
    echo "::warning title=Vir ne dela::$liga preskočena — vir $kljuc je ta zagon vrnil 5xx"
    vir_dol="$vir_dol $liga"; continue
  fi
  if [[ "$zavrnjeni" == *" $kljuc "* ]]; then
    echo "::warning title=Vir je zavrnil::$liga preskočena — vir $kljuc je ta zagon že zavrnil"
    padle="$padle $liga"; continue
  fi
  echo "::group::$liga — drugi poskus ($(minut) min)"
  uvozi "$liga" "$faktor" "$vir"; izid=$?
  echo "::endgroup::"
  case $izid in
    0) echo "$liga: v redu v drugem poskusu"
       node scripts/nocni-kosi.mjs --zabelezi "$liga" --stanje "$STANJE" ;;
    6) echo "::warning title=DFB podatki čakajo::$liga — brez nadaljnje ponovitve"
       cakajoci="$cakajoci $liga" ;;
    5) echo "::warning title=Vir ne dela::$liga — vir $kljuc vrača 5xx (nedosegljiv); ostale lige tega vira preskočene, ni napaka uvoza"
       nedosegljivi="$nedosegljivi$kljuc "; vir_dol="$vir_dol $liga" ;;
    4) echo "::error title=Vir je zavrnil::$liga — vir $kljuc je vrnil 401/403/429, izziv ali preusmeritev, ali je zmanjkalo proračuna zahtev; ostale lige tega vira preskočene, ne obhajamo"
       zavrnjeni="$zavrnjeni$kljuc "; padle="$padle $liga" ;;
    *) if [ -n "$znana" ]; then
         echo "::warning title=Znana napaka::$liga ni uspela niti v drugem poskusu — znana napaka $znana, koš zaradi nje ne pade"
         znane="$znane $liga ($znana)"
       else
         echo "::warning title=Uvoz lige::$liga ni uspela niti v drugem poskusu"
         padle="$padle $liga"
       fi ;;
  esac
done <<< "$zacasno"

if [ -n "$preskocene" ]; then
  # Ni napaka: naslednji zagon začne prav pri njih (najdlje neosvežene prve).
  echo "::warning title=Zmanjkalo časa::po $ROK_MIN min niso prišle na vrsto (ali na drugi poskus):$preskocene"
fi
if [ -n "$vir_dol" ]; then
  # Ni padec: vir je dol, ne mi. Ostane viden v povzetku zagona.
  echo "::warning title=Viri ne delajo::lige brez uvoza, ker vir vrača 5xx:$vir_dol"
  [ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "### Viri ne delajo (5xx) — koš $DRZAVA $KOS/$KOSOV"$'\n'"Lige brez uvoza:$vir_dol" >> "$GITHUB_STEP_SUMMARY"
fi
if [ -n "$odlocitve" ]; then
  echo "::warning title=Klub manjka v razporedu::$(echo $odlocitve | tr ' ' '\n' | sort -u | tr '\n' ' ')— izstop kluba (delovni tok Izstop kluba), uvoz z --dovoli-manj-klubov ali le okrnjena stran vira (naslednji zagon jo prebere znova)"
fi
if [ -n "$cakajoci" ]; then
  echo "::warning title=DFB pending::Zavrnjeni zapisniki in nepopolni krogi:$cakajoci"
  [ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "DFB podatki čakajo (zavrnjen zapisnik ni popoln uvoz):$cakajoci" >> "$GITHUB_STEP_SUMMARY"
fi
if [ -n "$znane" ]; then
  echo "::warning title=Znane napake::niso uspele, a imajo svojo nalogo:$znane"
  [ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "### Znane napake — koš $DRZAVA $KOS/$KOSOV"$'\n'"Niso uspele (naloga v oklepaju):$znane" >> "$GITHUB_STEP_SUMMARY"
fi
echo "Koš $KOS/$KOSOV končan v $(minut) min."
if [ -n "$padle" ]; then
  echo "::error title=Neuspele lige::$padle"
  exit 1
fi
