-- Discord ob novem zahtevku "To sem jaz" in ob prijavi lažnega profila.
--
-- Zahtevek zdaj najprej čaka na admina (20261012141100), zato mora admin
-- zanj izvedeti takoj, ne šele ob obisku administracije. Isti vzorec kot
-- prošnja za poznavalca: pg_net iz baze, webhook v Vaultu (`discord_webhook`),
-- brez webhooka ali ob napaki tiho nič — obvestilo ni razlog, da bi vpis padel.
-- E-naslova prosilca na Discord ne pošiljamo (vidi ga admin v administraciji).

create or replace function public.trg_prevzem_na_discord()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_kdo text;
  v_igralec text;
  v_klub text;
  v_liga text;
  v_besedilo text;
  v_player bigint;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'discord_webhook' limit 1;
  if v_url is null then
    return new;
  end if;

  -- Polja NEW se razlikujejo po tabeli: vsaka veja bere le svoja.
  if tg_table_name = 'zahtevki_igralca' then
    v_player := new.player_id;
  else
    select z.player_id into v_player from zahtevki_igralca z where z.id = new.zahtevek_id;
  end if;
  select coalesce(p.first_name || ' ' || p.last_name, p.full_name), t.name, c.name
    into v_igralec, v_klub, v_liga
    from players p
    left join teams t on t.id = p.team_id
    left join competitions c on c.id = p.competition_id
   where p.id = v_player;

  if tg_table_name = 'zahtevki_igralca' then
    select coalesce(display_name, 'neznan') into v_kdo from profiles where id = new.user_id;
    v_besedilo :=
      '🪪 **Nov zahtevek "To sem jaz"**' || case when new.spor then ' (spor)' else '' end || E'\n' ||
      v_kdo || ' → ' || coalesce(v_igralec, '?') || ' · ' || coalesce(v_klub, '') || ' · ' || coalesce(v_liga, '') ||
      E'\n' || 'https://slff.eu/admin';
  else
    v_besedilo :=
      '🚩 **Prijava lažnega profila**' || E'\n' ||
      coalesce(v_igralec, '?') || ' · ' || coalesce(v_klub, '') || ' · ' || coalesce(v_liga, '') ||
      case when new.razlog is not null then E'\n> ' || left(new.razlog, 300) else '' end ||
      E'\n' || 'https://slff.eu/admin';
  end if;

  perform net.http_post(
    url := v_url,
    -- Brez omemb: imena in razlog so uporabnikovo besedilo.
    body := jsonb_build_object(
      'content', v_besedilo,
      'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb)
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  return new;
end;
$$;
revoke all on function public.trg_prevzem_na_discord() from public, anon, authenticated;

drop trigger if exists zahtevki_igralca_discord on public.zahtevki_igralca;
create trigger zahtevki_igralca_discord
  after insert on public.zahtevki_igralca
  for each row execute function public.trg_prevzem_na_discord();

drop trigger if exists prijave_profila_discord on public.prijave_profila_igralca;
create trigger prijave_profila_discord
  after insert on public.prijave_profila_igralca
  for each row execute function public.trg_prevzem_na_discord();
