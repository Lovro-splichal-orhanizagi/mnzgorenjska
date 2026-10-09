-- Discord ob vsakih 100 uporabnikih (2000, 2100 …).
--
-- Šteje kot admin (`skupaj_uporabnikov`, brez hišnega profila). Webhook je
-- isti kot pri prošnjah (Vault `discord_webhook`); brez njega tiho nič.
-- ponytail: izbris računa lahko isti mejnik sproži dvakrat; ni škode.

create or replace function public.trg_mejnik_uporabnikov()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_n int;
begin
  v_n := skupaj_uporabnikov();
  if v_n % 100 <> 0 then
    return new;
  end if;

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'discord_webhook' limit 1;
  if v_url is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('content', '🎉 **' || v_n || ' uporabnikov** na SLFF'),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  -- Obvestilo ni razlog, da bi registracija padla.
  return new;
end;
$$;

drop trigger if exists profiles_mejnik_discord on public.profiles;
create trigger profiles_mejnik_discord
  after insert on public.profiles
  for each row execute function public.trg_mejnik_uporabnikov();
