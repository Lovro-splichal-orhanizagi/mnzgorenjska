-- Preizkus poti prevzema po e-pošti: žeton za EN čakajoč zahtevek, mail pa ne
-- gre klubu, ampak na naslov, ki ga poda servis (posli-prevzem {"test_zahtevek",
-- "test_na"}). Le servisni ključ. Žeton je enak pravemu (14 dni, enkraten), zato
-- povezava v testnem mailu zahtevek res potrdi ali zavrne.
create or replace function public.prevzem_zeton_test(p_zahtevek_id bigint)
returns table (
  zahtevek_id bigint, zeton text, email text, klub text, igralec text,
  liga_slug text, liga text, drzava text, prosilec text, expires_at timestamptz, klub_stik_id bigint
)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  r record;
  v_zeton text;
begin
  select z.id, p.full_name, t.name as klub, c.slug, c.name as liga, co.code as drzava, pf.display_name
    into r
    from zahtevki_igralca z
    join players p on p.id = z.player_id
    join teams t on t.id = p.team_id
    join competitions c on c.id = p.competition_id
    left join countries co on co.id = c.country_id
    left join profiles pf on pf.id = z.user_id
   where z.id = p_zahtevek_id and z.status = 'cakajoc' and not z.spor;
  if not found then
    raise exception 'zahtevek % ne čaka (ali je spor)', p_zahtevek_id;
  end if;
  v_zeton := encode(extensions.gen_random_bytes(32), 'hex');
  insert into zetoni_prevzema (zahtevek_id, hash, klub_stik_id)
  values (r.id, encode(sha256(convert_to(v_zeton, 'UTF8')), 'hex'), null);
  return query select r.id, v_zeton, null::text, r.klub, r.full_name, r.slug, r.liga, r.drzava,
                      r.display_name, now() + interval '14 days', null::bigint;
end;
$$;
revoke all on function public.prevzem_zeton_test(bigint) from public, anon, authenticated;
grant execute on function public.prevzem_zeton_test(bigint) to service_role;
