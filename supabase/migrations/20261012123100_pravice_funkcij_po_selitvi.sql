-- Pravice funkcij po selitvi baze na Hetzner.
--
-- Obnova baze (6. 10. 2026) je funkcije ustvarila na novo, privzete pravice
-- slike Supabase za lastnika postgres v shemi public pa so vsaki dodale
-- EXECUTE za anon in authenticated. REVOKE iz izvoza je odvzel le PUBLIC, zato
-- so v produkciji odprte tudi servisne funkcije (uveljavi_cene, izstop_kluba,
-- recompute_round_scores, odstrani_hisne_ekipe …), ki jih migracije zapirajo.
-- Isto privzeto pravilo odpre vsako novo funkcijo, ki je migracija izrecno ne
-- zapre (20260913100000 ga je izklopila, obnova ga je vrnila).
--
-- Seznam je razlika med produkcijo (11. 10. 2026) in bazo, zgrajeno iz vseh
-- migracij: tu funkcija dobi natanko pravice, ki jih ima tam. Lokalno in v CI
-- je migracija brez učinka.

-- 1. Nove funkcije ne dobijo več EXECUTE samodejno (kot 20260913100000).
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges revoke execute on functions from public;

-- 2. Obstoječe funkcije nazaj na nameravane pravice.
do $$
declare
  f text;
begin
  -- Samo servis (cron, delovni tokovi, sprožilci, pomožne funkcije).
  foreach f in array array[
    'public.anonimizacijski_kljuc(text)',
    'public.dodeli_ime_hisnega_lastnika()',
    'public.handle_new_user()',
    'public.ime_hisnega_lastnika(bigint, bigint)',
    'public.izstop_kluba(bigint, bigint)',
    'public.klub_stik_ob_posti()',
    'public.klub_stik_ob_spremembi()',
    'public.meje_borze()',
    'public.mini_liga_brez_hisnih()',
    'public.napaka_prikaznega_imena(text)',
    'public.nova_koda_mini_lige()',
    'public.odstrani_hisne_ekipe(bigint[])',
    'public.osvezi_statistiko_igralcev(bigint[])',
    'public.osvezi_tocke_krogov(bigint[])',
    'public.osvezi_vse_tocke_krogov()',
    'public.osvezi_vso_statistiko_igralcev()',
    'public.podpora_brez_sumnikov(text)',
    'public.podpora_kandidati(text, text, text)',
    'public.podpora_lige(text)',
    'public.podpora_najdaljsa_beseda(text)',
    'public.podpora_ujema(text, text)',
    'public.potrdi_asistenco(bigint)',
    'public.potrdi_pozicijo(bigint)',
    'public.preracunaj_cene(bigint)',
    'public.preracunaj_igralca(bigint, interval)',
    'public.preveri_rok_pripomocka()',
    'public.preveri_vklop_lige()',
    'public.prevzem_ob_anonimizaciji()',
    'public.prevzem_zeton_hash(text)',
    'public.pripisi_obranjene_enajstmetrovke(bigint)',
    'public.pripomocek_sezona()',
    'public.profil_igralca_ob_spremembi()',
    'public.recompute_round_scores(bigint)',
    'public.statistika_po_igralcih()',
    'public.statistika_po_igralcu()',
    'public.statistika_po_tekmi()',
    'public.statistika_po_tekmi_sami()',
    'public.tocke_krogov_po_krogu()',
    'public.tocke_krogov_po_nastopu()',
    'public.trg_asistenca_preracun()',
    'public.trg_assist_vote()',
    'public.trg_assist_vote_zaklep()',
    'public.trg_audit_assist_delete()',
    'public.trg_audit_position_vote_delete()',
    'public.trg_mejnik_uporabnikov()',
    'public.trg_nastop_obudi_igralca()',
    'public.trg_position_vote()',
    'public.trg_pozicija_preracun()',
    'public.trg_prosnja_na_discord()',
    'public.ustvari_hisno_ekipo(uuid, bigint, text, jsonb)',
    'public.uveljavi_cene(bigint)',
    'public.uveljavi_pozicije()',
    'public.uveljavi_zapadle_cene(interval)',
    'public.varuj_hisno_ekipo()',
    'public.zakleni_krog(bigint)',
    'public.zakleni_zapadle_kroge(interval)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;

  -- Le prijavljeni (funkcije same preverijo uporabnika ali admina).
  foreach f in array array[
    'public.admin_nastavi_poznavalca(uuid, bigint)',
    'public.admin_odloci_prosnjo(bigint, text)',
    'public.admin_preracunaj_krog(bigint)',
    'public.admin_prosnje_poznavalcev()',
    'public.admin_rast_lig(integer)',
    'public.admin_sponzorji()',
    'public.admin_sponzorji_po_mestih()',
    'public.admin_tedenska_aktivnost(integer)',
    'public.admin_uporabniki(bigint)',
    'public.admin_zivost()',
    'public.izbrisi_moj_racun()',
    'public.je_lastnik_profila(bigint)',
    'public.je_poznavalec_lige(bigint)',
    'public.koncani_krogi_mini_lige(bigint)',
    'public.oznaci_odhod_igralca(bigint, boolean)',
    'public.prevzem_sme_pisati_foto(text)',
    'public.pridruzi_mini_ligi(text, bigint)',
    'public.razlog_neveljavne_ekipe(bigint)',
    'public.shrani_ekipo(bigint, jsonb)',
    'public.shrani_push_zeton(text, text)',
    'public.stanje_mojih_ekip()',
    'public.tedenski_pregled_mini_lige(bigint, integer)',
    'public.ustvari_mini_ligo(text, bigint)',
    'public.zaprosi_za_poznavalca(bigint, bigint, text, text)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from public, anon', f);
      execute format('grant execute on function %s to authenticated, service_role', f);
    end if;
  end loop;
end $$;
