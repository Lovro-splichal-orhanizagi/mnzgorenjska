-- After restoring the Supabase Cloud dump: what a dump cannot carry
-- (docs/migracija-hetzner.md). Cron jobs verbatim from the migrations.
select cron.schedule('zakleni-zapadle-kroge', '*/5 * * * *', $$select public.zakleni_zapadle_kroge()$$);
select cron.schedule('uveljavi-cene', '30 3 * * *', $$select public.uveljavi_zapadle_cene()$$);
select cron.schedule('uveljavi-pozicije', '0 2 * * 1', $$select public.uveljavi_pozicije()$$);
select cron.schedule('obnovi-tocke-krogov', '15 3 * * *', $$select public.osvezi_vse_tocke_krogov()$$);
select cron.schedule('obnovi-statistiko-igralcev', '45 3 * * *', $$select public.osvezi_vso_statistiko_igralcev()$$);

-- Vault: the Cloud key can't decrypt the dump, so insert by hand (URL never in git):
--   select vault.create_secret('<discord webhook url>', 'discord_webhook');
