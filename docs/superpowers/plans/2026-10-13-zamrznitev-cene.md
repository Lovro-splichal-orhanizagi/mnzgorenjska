# Zamrznitev cene ob poškodbi — načrt izvedbe

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Padec cene "ni igral" se ne zgodi med uradno poškodbo/boleznijo (2 kroga, s potrditvijo kluba 6, do vrnitve + 1 krog); ob "ni držalo" se zadržani padci uveljavijo.

**Spec:** `docs/superpowers/specs/2026-10-13-zamrznitev-cene-design.md`

## Global Constraints
- Migracija `20261013233100_zamrznitev_cene.sql` (večja od prod in main, liha minuta).
- `preracunaj_cene` je zadnjič definirana v `20260927220000_kontumacije.sql`; nova različica je ista razen veje "ni igral" in CTE `zadrzano`.
- Testni id-ji v `varnost.sql`: `a2a10000-…`, igralci/klubi `-922…`.
- 13 jezikov, brez pomišljajev; nikoli `git add -A`.

## Review Focus
1. Zamrznitev nikoli ne prepreči dviga cene.
2. Krog, ki je že imel `price_changes`, se ne obračuna znova (zadržani padec se ne podvoji).
3. Ni držalo uveljavi le padce TE odsotnosti in vsakega le enkrat.
4. Povezana vrstica osebe (druga liga) je zamrznjena enako kot glavna.
5. Odsotnost preklicanega profila ne zamrzne.

### Task 1: Baza (zamrznitev, potrditev kluba, borza, kazen) + testi
- [ ] Testi v `varnost.sql` (padejo): 2 kroga brez potrditve, tretji pade; s potrditvijo 4. krog zamrznjen; krog po vrnitvi zamrznjen, drugi po vrnitvi ne; dopust ne zamrzne; dvig ostane; zadržani padec zapisan; ni_drzalo uveljavi vsoto enkrat; tuj klub/igralec ne potrdi.
- [ ] Migracija: `uradne_odsotnosti.klub_potrdil_at/klub_potrdil`, `zadrzani_padci`, `zamrznjena_odsotnost(player, round)`, `klub_potrdi_odsotnost`, `klub_odsotnosti(team)`, nova `preracunaj_cene`, `preveri_uradne_odsotnosti` z uveljavitvijo, pogled z `cena_zamrznjena`, `klub_potrdil`.
- [ ] `npm run test:varnost` zeleno; commit.

### Task 2: Vmesnik (13 jezikov)
- [ ] Obrazec uradne odsotnosti: pojasnilo pri poškodbi/bolezni.
- [ ] Oznaka "Cena zamrznjena" (in "potrdil klub") povsod, kjer se kaže uradna odsotnost.
- [ ] `KlubUrejanje`: razdelek odsotnosti s "Potrdi".
- [ ] tipi, typecheck, smoke; commit.

### Task 3: CLAUDE.md, celotna preverba, pregled, PR.
