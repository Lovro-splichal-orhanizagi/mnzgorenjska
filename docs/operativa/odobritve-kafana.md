# Odobritve v #kafana

Lovro, Nejc in Luka odobrijo delo SLFF v Discordu (#kafana), ne s karticami v
Paperclipu. Ni novega strežnika in ni gumbov: Discordovi gumbi potrebujejo
poslušalca na javnem naslovu, tega pa je Luka 20. 10. opustil (SLF-38, PR #454).
Odobritev je odgovor z natančno kodo. Desk (Pivko v Discordu) jo prenese na
zadevo v Paperclipu, izvajalec pa jo preveri s `scripts/odobritev.mjs`.

## Kdo sme kaj

| Akcija | Kdo odobri |
|---|---|
| `zgodba` (zgodba IG/FB) | kdorkoli v #kafana; ostane tudi neposredni "go" v klepetu in `ssh slff-social post-custom story` |
| `merge-deploy`, `email`, `objava`, `poraba`, `preizkus` | samo Luka, Lovro ali Nejc (njihovi Discord ID-ji) |

Nejasen "go", "ok" ali odobritev brez kode ne sproži ničesar. Desk jo lahko
zapiše kot komentar, izvajalec pa nato objavi kartico in počaka na kodo.

## Potek

1. **Izvajalec** (agent, ki je lastnik zadeve) zapiše zahtevo v JSON:

   ```json
   {
     "zadeva": "SLF-211",
     "akcija": "merge-deploy",
     "cilj": "PR #607, namestitev posli-opomnik in spletne strani",
     "verzija": "<celotni SHA glave PR ali sha256 vsebine>",
     "prejemniki": "do 20 uporabnikov, ki jih izbere Lovro (le število)",
     "platforme": "ig+fb",
     "tveganje": "kratko, kaj se lahko zgodi",
     "potece": "2026-10-31T20:00:00Z"
   }
   ```

   `node scripts/odobritev.mjs kartica zahteva.json` izpiše kartico in kodo
   (`SLF-211-merge-deploy-1a2b3c4d`). Koda je sha256 vseh polj, zato vsaka
   sprememba verzije, prejemnikov ali roka da novo kodo. Skript zavrne
   e-poštne naslove, žetone in dolge ključe, ker kartica gre v Discord.
   Izvajalec shrani JSON kot dokument `odobritev` na zadevi in kartico objavi
   v komentarju z naslovom `Za #kafana`.
2. **Desk** kartico nespremenjeno objavi v #kafana.
3. Odobritelj odgovori natanko `ODOBRIM <koda>` ali `ZAVRNEM <koda>`.
4. **Desk** preveri, da je sporočilo v #kafana in da je avtorjev Discord ID na
   seznamu (razen pri zgodbah), nato zapiše komentar na zadevo iz kode:

   ```
   [odobritev] ODOBRIM SLF-211-merge-deploy-1a2b3c4d
   odobril: Lovro, discord <ID uporabnika>
   sporocilo: <ID sporočila v Discordu>
   cas: <čas sporočila, ISO>
   ```

   Desk ne zapiše odobritve za drugo zadevo, kot jo ima koda, in istega
   sporočila ne prenese dvakrat.
5. **Izvajalec** prebere komentarje zadeve in požene

   ```
   node scripts/odobritev.mjs preveri zahteva.json komentarji.json --odobritelji <ID,ID,ID>
   ```

   Izhod 0 pomeni veljavno odobritev, 3 zavrnitev, 1 nič veljavnega. Preverba
   zavrne kodo, ki ne ustreza trenutni zahtevi (stara kartica, druga zadeva),
   prenos, ki ga ni zapisal človeški račun, manjkajoč ID sporočila, potekel
   rok, nepooblaščen ID in že porabljeno kodo. Pred izvedbo izvajalec še
   enkrat preveri, da se cilj ni spremenil (npr. glava PR je še vedno `verzija`).
6. Izvajalec **najprej** zapiše `[odobritev-porabljena] <koda>`, šele nato
   izvede obstoječi varni postopek (združitev, `ssh slff-ops deploy`, pošiljanje
   z obstoječimi omejitvami). Ponovna izvedba zahteva novo kartico.
7. Uspeh sporoči šele po preverbi učinka (npr. združen commit na main, zdrav
   vsebnik, število vrstic v `email_log`). Desk to sporoči v #kafana.

Seznam Discord ID-jev Luke, Lovra in Nejca je dokument `odobritelji` na
SLF-213, ne v tem repozitoriju. V Discord nikoli ne gredo ključi, žetoni,
e-poštni naslovi prejemnikov ali vsebina `.env`.
