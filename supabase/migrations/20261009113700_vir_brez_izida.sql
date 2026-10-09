-- Tekma, ki je vir ne kaže kot odigrane.
--
-- Preverba podatkov javi vsako tekmo, ki je tri dni po datumu še brez
-- zapisnika. Predpostavka je bila, da prestavljena tekma dobi nov datum in
-- stara vrstica ne ostane viseti. Zveza pa tekmo lahko prestavi tudi brez
-- novega datuma: Bled Bohinj : Sava Kranj (mladinci, 6. krog, 4. 10. 2026)
-- stoji v razporedu MNZ Kranj pri starem datumu brez izida, enako še sedem
-- tekem v Ljubljani, na Hrvaškem in Slovaškem. Preverba jih je javljala vsak
-- dan in bi jih do konca sezone.
--
-- Uvoz razporeda zato zapiše, kadar vir za minulo, neuvoženo tekmo NE kaže
-- izida. Preverba javi le tekmo, ki ima pri viru izid (ali vir tega ne pove),
-- pri nas pa zapisnika ne — to je zamujen uvoz. Viri, ki izida v razporedu ne
-- povedo, polja ne pišejo in zanje velja staro pravilo.
alter table public.matches
  add column vir_brez_izida boolean not null default false;

comment on column public.matches.vir_brez_izida is
  'Ob zadnjem uvozu razporeda vir za to minulo, neuvozeno tekmo ni kazal izida (prestavljena brez novega datuma). Preverba je ne javlja kot zamujen uvoz.';
