-- Stiki s klubi: vsebina mailov in naslov, na katerega je šel.
--
-- Klub ima lahko več naslovov (vrstica `klub_stik` na naslov; administracija
-- jih združi po klubu). Pri vsakem mailu hranimo, na kateri naslov je šel,
-- celotno besedilo in povezavo na nit v Gmailu — da je vidno, kaj je klub
-- točno dobil, ne le da je nekaj dobil.
alter table public.klub_stik_posta
  add column za text,
  add column telo text,
  add column gmail_nit text;
