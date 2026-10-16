#!/usr/bin/env bash
# Nočni uvoz enega koša lig ene države (posel matrike v uvoz-zapisnikov.yml).
#
# Okolje: DRZAVA, KOS, KOSOV, URNIK (github.event.schedule), ROK_MIN
# (po koliko minutah ne začnemo nove lige; privzeto 190 — posel ima 240 in
# mora še shraniti predpomnilnik). SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
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
#   - Izhod 3 uvoza razporeda = razpored ima klub manj kot baza (izstop ali
#     okrnjena stran): uvoz je uspel, liga ni padla, koš izpiše opozorilo.
set -uo pipefail

: "${DRZAVA:?}" "${KOS:=1}" "${KOSOV:=1}" "${URNIK:=}" "${ROK_MIN:=190}"
# Urni zagon ob vikendih (ne tisti ob 05 UTC) dela le, kar je novo.
URNI=0
if [ "$URNIK" = '17 * * * 5,6,0' ] && [ "$(date -u +%H)" != "05" ]; then URNI=1; fi
STANJE="scripts/.predpomnilnik/nocni-stanje-${DRZAVA}-${KOS}.json"
LIGE=$(mktemp)

node scripts/nocni-kosi.mjs --drzava "$DRZAVA" --kos "$KOS" --kosov "$KOSOV" --stanje "$STANJE" > "$LIGE" || exit 1
echo "Koš $KOS/$KOSOV, lige (najdlje neosvežene prve): $(cut -d' ' -f1 "$LIGE" | tr '\n' ' ')"
[ -s "$LIGE" ] || { echo "Država $DRZAVA nima vklopljenih lig v tem košu."; exit 0; }
[ "$URNI" = 1 ] && echo "Urni zagon: preračun le dotaknjenih krogov"

zacetek=$(date +%s)
minut() { echo $(( ($(date +%s) - zacetek) / 60 )); }

zavrnjeni=" "   # viri, ki so ta zagon vrnili 403/429/izziv
zadnji_izhod=0
teci() { "$@" </dev/null; zadnji_izhod=$?; return "$zadnji_izhod"; }

# uvozi <liga> <faktor> <vir> → 0 v redu, 1 napaka, 4 vir je zavrnil
uvozi() {
  local liga=$1 ok=1 zavrnil=0
  export SLFF_PREMOR_FAKTOR=$2
  # Izhod 3: klub manjka v razporedu (izstop?) — odloči človek, liga ni padla.
  teci node scripts/uvoz-razporeda.mjs --tekmovanje "$liga" --pisi || case $zadnji_izhod in
    3) odlocitve="$odlocitve $liga" ;;
    4) ok=0; zavrnil=1 ;;
    *) ok=0 ;;
  esac
  node scripts/uvoz-delegiranja.mjs --tekmovanje "$liga" --pisi </dev/null || ok=0
  rm -f /tmp/uvozenih
  local dodatno=""
  [ "$URNI" = 1 ] && dodatno="--samo-dotaknjene"
  if [ "$zavrnil" = 0 ]; then
    teci node scripts/uvoz-zapisnikov.mjs --tekmovanje "$liga" --sveze 21 --porocilo /tmp/uvozenih $dodatno || { ok=0; [ "$zadnji_izhod" = 4 ] && zavrnil=1; }
  fi
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
  [ "$ok" = 1 ] && return 0
  return 1
}

padle=""
odlocitve=""   # razpored ima klub manj kot baza: izstop kluba ali --dovoli-manj-klubov
zacasno=""      # padle v prvem krogu, za ponovni poskus: "liga faktor vir"
preskocene=""
while read -r liga faktor vir; do
  [ -n "$liga" ] || continue
  if [ "$(minut)" -ge "$ROK_MIN" ]; then preskocene="$preskocene $liga"; continue; fi
  if [[ "$zavrnjeni" == *" $vir "* ]]; then
    echo "::warning title=Vir je zavrnil::$liga preskočena — vir $vir je ta zagon že zavrnil"
    padle="$padle $liga"; continue
  fi
  echo "::group::$liga ($vir, faktor premora $faktor, $(minut) min)"
  uvozi "$liga" "$faktor" "$vir"; izid=$?
  echo "::endgroup::"
  case $izid in
    0) echo "$liga: v redu"; node scripts/nocni-kosi.mjs --zabelezi "$liga" --stanje "$STANJE" ;;
    4) echo "::error title=Vir je zavrnil::$liga — vir $vir je vrnil 403/429 ali izziv; ostale lige tega vira preskočene, ne obhajamo"
       zavrnjeni="$zavrnjeni$vir "; padle="$padle $liga" ;;
    *) echo "::warning title=Uvoz lige::$liga ni uspela; poskusim še enkrat na koncu"
       zacasno="$zacasno$liga $faktor $vir"$'\n' ;;
  esac
done < "$LIGE"

# Drugi poskus: prehodne napake (omrežje, "lock timeout" ob hkratnem pisanju).
while read -r liga faktor vir; do
  [ -n "$liga" ] || continue
  if [ "$(minut)" -ge "$ROK_MIN" ] || [[ "$zavrnjeni" == *" $vir "* ]]; then padle="$padle $liga"; continue; fi
  echo "::group::$liga — drugi poskus ($(minut) min)"
  uvozi "$liga" "$faktor" "$vir"; izid=$?
  echo "::endgroup::"
  if [ "$izid" = 0 ]; then
    echo "$liga: v redu v drugem poskusu"
    node scripts/nocni-kosi.mjs --zabelezi "$liga" --stanje "$STANJE"
  else
    echo "::warning title=Uvoz lige::$liga ni uspela niti v drugem poskusu"
    padle="$padle $liga"
  fi
done <<< "$zacasno"

if [ -n "$preskocene" ]; then
  # Ni napaka: naslednji zagon začne prav pri njih (najdlje neosvežene prve).
  echo "::warning title=Zmanjkalo časa::po $ROK_MIN min niso prišle na vrsto:$preskocene"
fi
if [ -n "$odlocitve" ]; then
  echo "::warning title=Klub manjka v razporedu::$(echo $odlocitve | tr ' ' '\n' | sort -u | tr '\n' ' ')— izstop kluba (delovni tok Izstop kluba), uvoz z --dovoli-manj-klubov ali le okrnjena stran vira (naslednji zagon jo prebere znova)"
fi
echo "Koš $KOS/$KOSOV končan v $(minut) min."
if [ -n "$padle" ]; then
  echo "::error title=Neuspele lige::$padle"
  exit 1
fi
