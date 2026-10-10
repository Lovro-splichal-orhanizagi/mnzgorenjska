-- Ena vrstica številk pod vsakim poročilom na Discord (mejnik uporabnikov,
-- mejnik namestitev, stanje App Store): uporabniki, novi v 7 dneh, ekipe,
-- aktivne lige, namestitve po trgovinah. Le servis (sprožilec, scripts/trgovine.mjs).

create or replace function public.povzetek_rasti()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select format('👥 %s uporabnikov (+%s v 7 dneh) · ⚽ %s ekip · 🏆 %s aktivnih lig · 📱 iOS %s · Android %s',
    skupaj_uporabnikov(),
    (select count(*) from profiles p join auth.users u on u.id = p.id
      where u.created_at > now() - interval '7 days'
        and not exists (select 1 from fantasy_teams f where f.owner_id = p.id and f.hisna)),
    (select count(*) from fantasy_teams where not hisna),
    (select count(*) from competitions where active),
    coalesce((select skupaj from trgovine_dnevno where trgovina = 'ios' order by dan desc limit 1)::text, '–'),
    coalesce((select skupaj from trgovine_dnevno where trgovina = 'android' order by dan desc limit 1)::text, '–'))
$$;

revoke all on function public.povzetek_rasti() from public, anon, authenticated;
grant execute on function public.povzetek_rasti() to service_role;

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
    body := jsonb_build_object('content', '🎉 **' || v_n || ' uporabnikov** na SLFF' || E'\n' || povzetek_rasti()),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  -- Obvestilo ni razlog, da bi registracija padla.
  return new;
end;
$$;
