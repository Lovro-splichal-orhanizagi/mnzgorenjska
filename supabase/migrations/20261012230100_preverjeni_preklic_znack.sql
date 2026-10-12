-- Preklicana pravica (preklic profila, anonimizacija, izbris računa, admin,
-- vračilo, spor) je pustila naročilo značke 'za_tisk' in značka bi šla v tisk.
-- Ob prehodu aktiven → preklican odprta naročila prekliče; natisnjene ali
-- poslane le javi na Discord (brez osebnih podatkov), odloči človek.
create or replace function public.preverjeni_preklic_znack()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update narocila_znack
     set status = 'preklicano', opomba = left(coalesce(opomba || ' · ', '') || 'pravica preklicana', 500)
   where preverjeni_racun_id = new.id and status = 'za_tisk';
  if exists (select 1 from narocila_znack where preverjeni_racun_id = new.id and status in ('natisnjeno', 'poslano')) then
    perform preverjeni_na_discord('⚠️ Natisnjena ali poslana značka pripada preklicani pravici: https://slff.eu/player/'
      || new.player_id);
  end if;
  return null;
end;
$$;
revoke all on function public.preverjeni_preklic_znack() from public, anon, authenticated;
create trigger preverjeni_racuni_preklic_znack after update of status on public.preverjeni_racuni
  for each row when (old.status = 'aktiven' and new.status = 'preklican')
  execute function public.preverjeni_preklic_znack();
