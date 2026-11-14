-- SLF-383: `izlozba_odrasla_oseba` za vsak prevzem išče isto osebo po imenu
-- ali šifri v vseh mladinskih ligah države. Šifra ima indeks
-- (`players_tekmovanje_reg_st_idx`), ime ne, zato je vsaka mladinska liga
-- pregledana v celoti (SK ~32.000 mladincev, 95 lig). Pri ~900 prevzemih
-- `promo_preverjen_kohorta()` presega 30 s (edge funkcija in prehod jo
-- prekineta, suhi tek promocije vrne "upstream request timeout"). Z
-- indeksom (tekmovanje, ime) postane vsako iskanje dva skoka po indeksu.
create index if not exists players_tekmovanje_ime_idx
  on public.players (competition_id, full_name);

analyze public.players;
