-- Preklicana pravica (preklic profila, anonimizacija, izbris računa, admin,
-- vračilo, spor) je pustila naročilo značke 'za_tisk' in značka bi šla v tisk.
-- Ob prehodu aktiven → preklican odprta naročila prekliče; natisnjene ali
-- poslane le javi na Discord (brez osebnih podatkov), odloči človek.
create or replace function public.preverjeni_preklic_znack()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_n int;
begin
  update narocila_znack
     set status = 'preklicano', opomba = left(coalesce(opomba || ' · ', '') || 'pravica preklicana', 500)
   where preverjeni_racun_id = new.id and status = 'za_tisk';
  get diagnostics v_n = row_count;
  if v_n > 0 then
    perform preverjeni_na_discord('↩️ Značka preklicana s pravico (' || v_n
      || '), preveri vračilo značke: https://slff.eu/player/' || new.player_id);
  end if;
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

-- Vračilo in spor najprej prekličeta naročila (z 'vračilo'/'spor'), nato
-- pravico: sprožilec zgoraj tako ne povozi opombe in ne pošlje drugega
-- sporočila; ostane mu le že poslana značka.
create or replace function public.preverjen_vracilo(
  p_payment_intent text, p_subscription text, p_vrnjeno int, p_znesek int, p_spor boolean)
returns text language plpgsql security definer set search_path = public
as $$
declare
  r preverjeni_racuni;
  v_odprto boolean;
begin
  r := preverjen_vrstica_placila(p_payment_intent, p_subscription);
  if r.id is null then
    return 'neznano';
  end if;
  perform pg_advisory_xact_lock(hashtext('preverjen:' || r.player_id));
  v_odprto := exists (select 1 from narocila_znack where preverjeni_racun_id = r.id and status in ('za_tisk', 'natisnjeno'));
  if p_spor or p_vrnjeno >= p_znesek
     or (r.vir = 'dozivljenjska' and r.znesek_pravice is not null and p_vrnjeno >= r.znesek_pravice) then
    update narocila_znack set status = 'preklicano', opomba = coalesce(opomba || ' · ', '') || case when p_spor then 'spor' else 'vračilo' end
     where preverjeni_racun_id = r.id and status in ('za_tisk', 'natisnjeno');
    update preverjeni_racuni set status = 'preklican', updated_at = now() where id = r.id and status = 'aktiven';
    perform preverjeni_na_discord('↩️ Pravica preklicana (' || case when p_spor then 'spor' else 'vračilo' end
      || case when v_odprto then ', tudi značka' else '' end || '): https://slff.eu/player/' || r.player_id);
    return 'preklican';
  end if;
  if v_odprto then
    update narocila_znack set status = 'preklicano', opomba = coalesce(opomba || ' · ', '') || 'delno vračilo'
     where preverjeni_racun_id = r.id and status in ('za_tisk', 'natisnjeno');
    perform preverjeni_na_discord('↩️ Značka preklicana (delno vračilo): https://slff.eu/player/' || r.player_id);
    return 'znacka';
  end if;
  perform preverjeni_na_discord('ℹ️ Delno vračilo (' || p_vrnjeno || ' od ' || p_znesek || ' centov), pravica ostane: https://slff.eu/player/' || r.player_id);
  return 'delno';
end;
$$;

-- Spor dobljen: pravica se vrne, naročilo značke ostane preklicano — človek
-- odloči, ali jo natisne.
create or replace function public.preverjen_spor_dobljen(p_payment_intent text, p_subscription text)
returns text language plpgsql security definer set search_path = public
as $$
declare
  r preverjeni_racuni;
  v_znacka text;
begin
  r := preverjen_vrstica_placila(p_payment_intent, p_subscription);
  if r.id is null then
    return 'neznano';
  end if;
  perform pg_advisory_xact_lock(hashtext('preverjen:' || r.player_id));
  if r.status <> 'preklican' then
    return 'nespremenjeno';
  end if;
  v_znacka := case when exists (select 1 from narocila_znack where preverjeni_racun_id = r.id)
                   then ', naročilo značke preveri ročno' else '' end;
  update preverjeni_racuni set status = 'potekel', updated_at = now()
   where player_id = r.player_id and status = 'aktiven' and velja_do <= now();
  if (r.velja_do is null or r.velja_do > now()) and preverjen_lahko_velja(r.user_id, r.player_id, r.id) then
    -- Naročnina ostane preklicana (tudi če preklic še čaka): letna velja do roka.
    update preverjeni_racuni set status = 'aktiven', updated_at = now() where id = r.id;
    perform preverjeni_na_discord('✅ Spor dobljen, pravica vrnjena'
      || case when r.vir = 'letna' then ' do ' || to_char(r.velja_do, 'DD. MM. YYYY')
              || ' (naročnina je bila ob sporu preklicana in se ne obnovi)' else '' end
      || v_znacka || ': https://slff.eu/player/' || r.player_id);
    return 'obnovljen';
  end if;
  perform preverjeni_na_discord('ℹ️ Spor dobljen, pravice ni mogoče vrniti (profil, ime ali rok)'
    || v_znacka || ', preveri ročno: https://slff.eu/player/' || r.player_id);
  return 'ne';
end;
$$;
