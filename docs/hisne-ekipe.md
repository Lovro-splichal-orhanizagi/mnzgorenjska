# Hišne ekipe

V slovaških ligah (`sk-…`) je po 10 ± 2 **hišnih ekip** (`fantasy_teams.hisna`,
migracija 20260930130000). Vse ima en sistemski lastnik, profil **SLFF**
(`hisa@slff.eu`, `brez_opomnikov`, prijave ni). Neobvezni `display_name` je
izmišljeno prikazno ime samo za hišne ekipe: obe ligaški lestvici in stran
ekipe ga uporabijo namesto imena sistemskega profila. Piše ga le servis;
`NULL` ime skrije. Migracija 20260930160000 ga dodeli obstoječim hišnim
ekipam, sprožilec ob nastanku pa novim. Migracija 20260930180000 zamenja
prejšnja generirana imena z mešanico vzdevkov, začetnic s številkami, imen
in polnih imen; neodvisna izbira prepreči bloke enakih priimkov. Ime se
shrani, generator pa preskoči že zasedena prikazna imena v isti ligi.
Prave ekipe tega polja ne smejo imeti; njihovo ime ostane iz profila. En
lastnik ima zato več ekip v ligi: unikatni indeks ena-ekipa-na-ligo velja le
`where not hisna`, sprožilec pa lastniku hišnih ekip prepove človeške ekipe (in
obratno). V ligi štejejo povsod (lestvica, število ekip, točke kroga); **ne
štejejo** v izbranosti (`owners` in imenovalec deleža na strani Igralci),
državni lestvici, e-pošti (`kandidati_za_*`, popravek pozicij), mini ligah
(sprožilec na `mini_liga_clani`), admin statistiki in `skupaj_uporabnikov`.
Nova poizvedba, ki šteje ljudi ali ekipe čez lige, naj izpusti `hisna`.

Ustvari in odstrani jih samo delovni tok *Hisne ekipe* (`hisne-ekipe.yml` →
`scripts/hisne-ekipe.mjs`), najprej brez `pisi` za načrt. Kader shrani baza
(`ustvari_hisno_ekipo` → `shrani_ekipo` kot sistemski lastnik) in zavrne
neveljavnega. Točke zbirajo od prvega roka po nastanku, nazaj ne. Ponoven
zagon le dopolni do cilja (cilj je stalen po ligi). **Odstranitev:** isti tok
z `odstrani` (in `pisi`) → `odstrani_hisne_ekipe`, ki zavrne ves paket, če
kateri id ni hišna ekipa. Lokalno:

```bash
node scripts/hisne-ekipe.mjs --liga sk-za-1trieda          # načrt
node scripts/hisne-ekipe.mjs --odstrani --pisi             # vse SK hišne ekipe proč
```

Hišna ekipa, ki ji igralec odide, postane neveljavna in ostane brez točk;
skripta jih ob zagonu našteje.
