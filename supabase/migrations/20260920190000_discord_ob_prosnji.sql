-- Discord ob novi prosnji za poznavalca.
--
-- Prosnja brez obvestila caka, dokler admin slucajno ne odpre strani —
-- clovek, ki se je ponudil, pa medtem izgubi voljo. pg_net poslje sporocilo
-- na Discord neposredno iz baze, ob vpisu, brez crona in brez strezanja.
--
-- Webhook zivi v Vaultu pod imenom `discord_webhook`. Ce ga ni, sprozilec
-- tiho ne naredi nic: obvestilo ni razlog, da bi prosnja padla.

create extension if not exists pg_net with schema extensions;

create or replace function public.trg_prosnja_na_discord()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_kdo text;
  v_klub text;
  v_liga text;
  v_vloga text;
  v_besedilo text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'discord_webhook' limit 1;
  if v_url is null then
    return new;
  end if;

  select coalesce(display_name, 'neznan') into v_kdo from profiles where id = new.user_id;
  select name into v_klub from teams where id = new.team_id;
  select name into v_liga from competitions where id = new.competition_id;
  v_vloga := case new.vloga
    when 'igralec' then 'igralec' when 'trener' then 'trener/štab'
    when 'vodstvo' then 'vodstvo kluba' else 'navijač' end;

  v_besedilo :=
    '🙋 **Nova prošnja za poznavalca**' || E'\n' ||
    v_kdo || ' · ' || v_vloga || ' · ' || coalesce(v_klub, 'brez kluba') || ' · ' || coalesce(v_liga, '') ||
    case when new.sporocilo is not null then E'\n> ' || left(new.sporocilo, 300) else '' end ||
    E'\n' || 'https://slff.eu/admin';

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('content', v_besedilo),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  -- Obvestilo ni razlog, da bi prosnja padla.
  return new;
end;
$$;

drop trigger if exists poznavalec_prosnje_discord on public.poznavalec_prosnje;
create trigger poznavalec_prosnje_discord
  after insert on public.poznavalec_prosnje
  for each row execute function public.trg_prosnja_na_discord();
