-- Ustvarjalec mini lige naj bo v njej.
--
-- Prva različica je ligo le ustvarila. Človek je dobil kodo in prazno
-- lestvico, v svojo ligo pa bi se moral pridružiti s svojo kodo — kar je
-- videti kot okvara, ne kot korak. Pokazalo se je šele ob uporabi strani;
-- iz kode tega ni bilo videti.
--
-- Ekipo podamo, ker jih ima lahko človek več (po eno v vsaki ligi) in je
-- izbira njegova. Če je ne poda, ostane liga prazna — to je veljavno stanje
-- za nekoga, ki ekipe še nima.
create or replace function ustvari_mini_ligo(p_ime text, p_ekipa bigint default null)
returns table (id bigint, code text)
language plpgsql security definer set search_path = public as $$
declare
  v_ime text := btrim(p_ime);
  v_id bigint;
  v_koda text;
begin
  if auth.uid() is null then
    raise exception 'Za mini ligo se je treba prijaviti.';
  end if;
  if length(v_ime) < 2 or length(v_ime) > 40 then
    raise exception 'Ime mini lige naj ima med 2 in 40 znaki.';
  end if;

  insert into mini_lige (name, code, owner_id)
  values (v_ime, nova_koda_mini_lige(), auth.uid())
  returning mini_lige.id, mini_lige.code into v_id, v_koda;

  if p_ekipa is not null then
    -- Ista zahteva kot pri pridružitvi: samo svojo ekipo.
    if not exists (select 1 from fantasy_teams ft
                    where ft.id = p_ekipa and ft.owner_id = auth.uid()) then
      raise exception 'To ni tvoja ekipa.';
    end if;
    insert into mini_liga_clani (mini_liga_id, fantasy_team_id)
    values (v_id, p_ekipa) on conflict do nothing;
  end if;

  return query select v_id, v_koda;
end $$;

revoke all on function ustvari_mini_ligo(text, bigint) from public;
grant execute on function ustvari_mini_ligo(text, bigint) to authenticated;
-- Stara enoargumentna oblika ne sme ostati: odjemalec bi jo lahko klical in
-- spet ustvaril prazno ligo.
drop function if exists ustvari_mini_ligo(text);
