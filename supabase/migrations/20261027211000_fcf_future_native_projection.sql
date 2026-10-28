-- Read-only actual post-import projection, never a source/launch authorization.
-- Fixed reviewed schema contract. Any later dependency DDL MUST extend the
-- catalog, protected-row predicate and writer locks together; unknown shapes hold.
-- Concrete future-import receipt interface. LIKE copies the identity, complete
-- columns/indexes/checks; the competition FK is deliberately added explicitly.
create schema private_fcf_future_target_release;
revoke all on schema private_fcf_future_target_release from public,anon,authenticated,service_role;
create table private_fcf_future_target_release.receipts(
 like private_fcf_six_target_release.receipts including all,
 check(competition_id=797),foreign key(competition_id)references public.competitions(id)
);
revoke all on all tables in schema private_fcf_future_target_release from public,anon,authenticated,service_role;
revoke all on all sequences in schema private_fcf_future_target_release from public,anon,authenticated,service_role;
create schema private_fcf_future_projection;
revoke all on schema private_fcf_future_projection from public,anon,authenticated,service_role;
create function private_fcf_future_projection.capture(p_slug text,p_privacy_keys text[])returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $projection$
#variable_conflict use_column
declare
 c public.competitions%rowtype; cid constant bigint:=797; stamp timestamptz:=statement_timestamp();
 pids bigint[];rids bigint[];mids bigint[];ftids bigint[];tids bigint[];goalrefs jsonb;
 registry jsonb:='{
"public.goals":{"where":"x.match_id=any($3) or x.scorer_id=any($1) or x.assist_player_id=any($1)","user":false,"round":"false","match":"false"},
"public.teams":{"where":"x.id=any($6)","user":false,"round":"false","match":"false"},
"scout.drzave":{"where":"x.country_id=(select country_id from public.competitions where id=797)","user":false,"round":"false","match":"false"},
"scout.indeks":{"where":"x.player_id=any($1)","user":false,"round":"false","match":"false"},
"scout.modeli":{"where":"true","user":false,"round":"false","match":"false"},
"scout.sedezi":{"where":"x.team_id=any($6)","user":false,"round":"false","match":"false"},
"scout.vrzeli":{"where":"x.competition_id=797 or x.player_id=any($1)","user":false,"round":"false","match":"false"},
"public.rounds":{"where":"x.id=any($2)","user":false,"round":"false","match":"false"},
"scout.dnevnik":{"where":"x.player_id=any($1) or x.parametri->>''selekcija''=''797'' or x.parametri->>''competition_id''=''797'' or exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(x.parametri->''igralci'')=''array'' then x.parametri->''igralci'' else ''[]''::jsonb end) a where a=any(array(select p::text from unnest($1)p))) or x.parametri->>''dogodek'' in(select id::text from scout.dogodki where competition_id=797)","user":true,"round":"false","match":"false"},
"scout.dogodki":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"scout.ugovori":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.matches":{"where":"x.id=any($3)","user":false,"round":"false","match":"false"},
"public.players":{"where":"x.id=any($1)","user":false,"round":"false","match":"false"},
"scout.lige_moc":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"},
"scout.vektorji":{"where":"x.player_id=any($1) or x.podobni && $1","user":false,"round":"false","match":"false"},
"public.napovedi":{"where":"x.match_id=any($3)","user":true,"round":"false","match":"x.match_id=$8"},
"public.profiles":{"where":"x.insider_competition_id=797","user":true,"round":"false","match":"false"},
"public.settings":{"where":"true","user":false,"round":"false","match":"false"},
"public.sponsors":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"},
"scout.ekipe_elo":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"},
"scout.kazalniki":{"where":"x.player_id=any($1) or x.competition_id=797","user":false,"round":"false","match":"false"},
"scout.narocnine":{"where":"x.team_id=any($6)","user":false,"round":"false","match":"false"},
"scout.opazovani":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.countries":{"where":"x.id=(select country_id from public.competitions where id=797)","user":false,"round":"false","match":"false"},
"public.email_log":{"where":"x.competition_id=797 or x.round_id=any($2)","user":true,"round":"x.round_id=$7","match":"false"},
"public.klub_stik":{"where":"x.team_id=any($6)","user":false,"round":"false","match":"false"},
"public.mini_lige":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"public.zelje_lig":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"scout.prisotnost":{"where":"x.player_id=any($1) or x.dogodek_id in(select id from scout.dogodki where competition_id=797)","user":true,"round":"false","match":"false"},
"scout.privolitve":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.appearances":{"where":"x.match_id=any($3) or x.player_id=any($1)","user":false,"round":"false","match":"false"},
"public.federations":{"where":"x.country_id=(select country_id from public.competitions where id=797)","user":false,"round":"false","match":"false"},
"public.assist_votes":{"where":"x.player_id=any($1) or exists(select 1 from jsonb_array_elements($5) g where g->>''id''=x.goal_id::text)","user":true,"round":"false","match":"exists(select 1 from jsonb_array_elements($5)g where g->>''id''=x.goal_id::text and g->>''match_id''=$8::text)"},
"public.competitions":{"where":"x.id=797","user":false,"round":"false","match":"false"},
"public.ponovne_cene":{"where":"x.player_id=any($1) or x.competition_id=797","user":true,"round":"false","match":"false"},
"public.tocke_krogov":{"where":"x.fantasy_team_id=any($4) or x.round_id=any($2)","user":true,"round":"x.round_id=$7","match":"false"},
"public.fantasy_chips":{"where":"x.fantasy_team_id=any($4) or x.round_id=any($2)","user":true,"round":"x.round_id=$7","match":"false"},
"public.fantasy_teams":{"where":"x.id=any($4)","user":true,"round":"false","match":"false"},
"public.player_scores":{"where":"x.round_id=any($2) or x.player_id=any($1)","user":false,"round":"x.round_id=$7","match":"false"},
"public.price_changes":{"where":"x.player_id=any($1) or x.round_id=any($2)","user":false,"round":"x.round_id=$7","match":"false"},
"public.sponsor_stats":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"},
"public.fantasy_roster":{"where":"x.fantasy_team_id=any($4) or x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.klubski_racuni":{"where":"x.team_id=any($6)","user":false,"round":"false","match":"false"},
"public.narocila_znack":{"where":"x.player_id=any($1) or x.preverjeni_racun_id in(select id from public.preverjeni_racuni where player_id=any($1))","user":true,"round":"false","match":"false"},
"public.player_reports":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.position_votes":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.profil_igralca":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.zadrzani_padci":{"where":"x.player_id=any($1) or x.round_id=any($2)","user":true,"round":"x.round_id=$7","match":"false"},
"public.fantasy_lineups":{"where":"x.round_id=any($2) or x.fantasy_team_id=any($4) or x.player_id=any($1)","user":true,"round":"x.round_id=$7","match":"false"},
"public.klub_stik_posta":{"where":"x.stik_id in(select id from public.klub_stik where team_id=any($6))","user":false,"round":"false","match":"false"},
"public.mini_liga_clani":{"where":"x.fantasy_team_id=any($4) or x.mini_liga_id in(select id from public.mini_lige where competition_id=797)","user":true,"round":"false","match":"false"},
"public.position_priors":{"where":"x.player_id=any($1)","user":false,"round":"false","match":"false"},
"public.zetoni_prevzema":{"where":"x.zahtevek_id in(select id from public.zahtevki_igralca where player_id=any($1))","user":true,"round":"false","match":"false"},
"public.klubski_zahtevki":{"where":"x.team_id=any($6)","user":false,"round":"false","match":"false"},
"public.povezani_igralci":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.prijave_mini_lig":{"where":"x.mini_liga_id in(select id from public.mini_lige where competition_id=797)","user":true,"round":"false","match":"false"},
"public.zahtevki_igralca":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.fantasy_transfers":{"where":"x.fantasy_team_id=any($4) or x.round_id=any($2)","user":true,"round":"x.round_id=$7","match":"false"},
"public.klub_predstavitev":{"where":"x.team_id=any($6)","user":false,"round":"false","match":"false"},
"public.mini_liga_dvoboji":{"where":"x.mini_liga_id in(select id from public.mini_lige where competition_id=797) or x.ekipa_a=any($4) or x.ekipa_b=any($4)","user":true,"round":"false","match":"false"},
"public.popravki_podatkov":{"where":"x.competition_id=797 or x.player_id=any($1) or x.match_id=any($3) or x.gol_strelec_id=any($1) or x.asistent_id=any($1)","user":true,"round":"false","match":"x.match_id=$8"},
"public.preverjeni_racuni":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.uradne_odsotnosti":{"where":"x.player_id=any($1) or x.ni_drzalo_match_id=any($3)","user":true,"round":"false","match":"x.ni_drzalo_match_id=$8"},
"public.poznavalec_prosnje":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"public.klub_dodani_igralci":{"where":"x.player_id=any($1) or x.competition_id=797","user":true,"round":"false","match":"false"},
"public.profil_igralca_plus":{"where":"x.player_id=any($1) or x.tekma_id=any($3)","user":true,"round":"false","match":"x.tekma_id=$8"},
"public.statistika_igralcev":{"where":"x.player_id=any($1) or x.competition_id=797","user":false,"round":"false","match":"false"},
"private_dfb_pending.pending":{"where":"x.match_id=any($3) or x.competition_id=797 or x.round_id=any($2)","user":true,"round":"x.round_id=$7","match":"x.match_id=$8"},
"private_fussball.card_heads":{"where":"x.match_id=any($3)","user":true,"round":"false","match":"x.match_id=$8"},
"private_fussball.card_votes":{"where":"x.player_id=any($1) or x.event_id in(select e.id from private_fussball.card_events e join private_fussball.card_reports r on r.id=e.report_id where r.competition_id=797 or r.match_id=any($3))","user":true,"round":"false","match":"false"},
"public.assist_votes_deleted":{"where":"x.player_id=any($1) or exists(select 1 from jsonb_array_elements($5) g where g->>''id''=x.goal_id::text)","user":true,"round":"false","match":"exists(select 1 from jsonb_array_elements($5)g where g->>''id''=x.goal_id::text and g->>''match_id''=$8::text)"},
"public.competition_settings":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"},
"public.potrditve_soigralcev":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.pozicije_klub_cakajo":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"public.samodejni_poznavalci":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_dfb_pending.evidence":{"where":"x.competition_id=797 or x.match_id=any($3)","user":true,"round":"false","match":"x.match_id=$8"},
"private_fussball.card_events":{"where":"x.official_player_id=any($1) or x.confirmed_player_id=any($1) or x.report_id in(select id from private_fussball.card_reports where competition_id=797 or match_id=any($3))","user":true,"round":"false","match":"false"},
"public.anonimizirani_igralci":{"where":"x.player_id=any($1)","user":false,"round":"false","match":"false"},
"public.pozicije_klub_dnevnik":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"private_fussball.card_reports":{"where":"x.competition_id=797 or x.match_id=any($3)","user":true,"round":"false","match":"x.match_id=$8"},
"public.position_votes_deleted":{"where":"x.player_id=any($1)","user":true,"round":"false","match":"false"},
"private_fussball.card_policies":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"public.prijave_profila_igralca":{"where":"x.zahtevek_id in(select id from public.zahtevki_igralca where player_id=any($1))","user":true,"round":"false","match":"false"},
"private_fussball.card_admissions":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_fcf_target_release.receipts":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"},
"private_fussball.card_write_context":{"where":"x.match_id=any($3)","user":true,"round":"false","match":"x.match_id=$8"},
"private_mfa_nl_history.price_receipt":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_historical_statistics.markers":{"where":"x.competition_id=797 or x.round_id=any($2)","user":false,"round":"false","match":"false"},
"private_mfa_nl_history.import_receipt":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_historical_statistics.policies":{"where":"x.document->>''sourcePolicy''=''es-fcf-six-reviewed-history-v1''","user":false,"round":"false","match":"false"},
"private_mfa_nl_history.release_receipt":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_mfa_nl_history.source_contract":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_fcf_six_target_release.receipts":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"},
"private_hns_women_release.club_bindings":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_hns_women_release.round_sources":{"where":"x.round_id=any($2) or x.competition_id=797","user":true,"round":"x.round_id=$7","match":"false"},
"private_fcf_target_release.club_bindings":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"},
"private_fussball.card_activation_context":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_mfa_nl_history.bootstrap_receipt":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_hns_women_release.bootstrap_state":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_hns_women_release.fixture_catalog":{"where":"false","user":true,"round":"false","match":"false"},
"private_fcf_future_history.cleanup_receipt":{"where":"true","user":false,"round":"false","match":"false"},
"private_fcf_future_target_release.receipts":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"},
"private_fcf_target_release.cleanup_receipt":{"where":"true","user":false,"round":"false","match":"false"},
"private_hns_women_release.prepared_packets":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_fcf_six_target_release.club_bindings":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"},
"private_fcf_six_history.restore_authorizations":{"where":"true","user":false,"round":"false","match":"false"},
"private_fcf_six_target_release.cleanup_receipt":{"where":"true","user":false,"round":"false","match":"false"},
"private_hns_women_release.round_authorizations":{"where":"x.competition_id=797","user":true,"round":"false","match":"false"},
"private_historical_statistics.installed_policies":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"},
"private_historical_statistics.source_club_bindings":{"where":"x.provider=''fcf''","user":false,"round":"false","match":"false"},
"private_historical_statistics.release_authorizations":{"where":"x.competition_id=797","user":false,"round":"false","match":"false"}
}'; shapes jsonb:='{
"public.goals":[["id","bigint"],["match_id","bigint"],["scorer_id","bigint"],["team_id","bigint"],["minute","integer"],["is_own_goal","boolean"],["is_penalty","boolean"],["score_home","integer"],["score_away","integer"],["assist_player_id","bigint"],["assist_confirmed_at","timestamp with time zone"],["assist_none_confirmed_at","timestamp with time zone"]],
"public.teams":[["id","bigint"],["name","text"],["short_name","text"],["logo_url","text"],["country_id","bigint"],["logo_vir","text"]],
"scout.drzave":[["country_id","bigint"],["stanje","text"]],
"scout.indeks":[["model_id","bigint"],["player_id","bigint"],["skupina","text"],["indeks","double precision"],["percentil","double precision"],["zaupanje","double precision"]],
"scout.modeli":[["id","bigint"],["ustvarjen_at","timestamp with time zone"],["leto","integer"],["backtest","jsonb"],["parametri","jsonb"],["objavljen","boolean"]],
"scout.sedezi":[["user_id","uuid"],["team_id","bigint"],["created_at","timestamp with time zone"]],
"scout.vrzeli":[["model_id","bigint"],["team_id","bigint"],["competition_id","bigint"],["skupina","text"],["vrsta","text"],["player_id","bigint"],["vrednost","double precision"]],
"public.rounds":[["id","bigint"],["season","text"],["number","integer"],["played_on","date"],["voting_opens_at","timestamp with time zone"],["voting_closes_at","timestamp with time zone"],["deadline_at","timestamp with time zone"],["competition_id","bigint"],["lineups_locked_at","timestamp with time zone"],["borza_po_starem","boolean"],["borza_z_odmikom","boolean"],["pravila_tockovanja","smallint"],["datum_ocenjen","boolean"]],
"scout.dnevnik":[["id","bigint"],["team_id","bigint"],["user_id","uuid"],["vrsta","text"],["player_id","bigint"],["parametri","jsonb"],["created_at","timestamp with time zone"]],
"scout.dogodki":[["id","bigint"],["team_id","bigint"],["competition_id","bigint"],["vrsta","text"],["zacetek","timestamp with time zone"],["trajanje_min","integer"],["kraj","text"],["opomba","text"],["serija","uuid"],["ustvaril","uuid"],["created_at","timestamp with time zone"]],
"scout.ugovori":[["player_id","bigint"],["kljuc","text"],["created_at","timestamp with time zone"]],
"public.matches":[["id","bigint"],["round_id","bigint"],["home_team_id","bigint"],["away_team_id","bigint"],["home_goals","integer"],["away_goals","integer"],["played_on","date"],["zapisnik_id","text"],["source_url","text"],["imported_at","timestamp with time zone"],["import_warnings","text[]"],["kontumacija","boolean"],["vir_brez_izida","boolean"],["statistics_status","text"],["statistics_reason","text"],["source_phase","text"],["source_round","integer"]],
"public.players":[["id","bigint"],["team_id","bigint"],["first_name","text"],["last_name","text"],["position","text"],["active","boolean"],["position_source","text"],["shirt_number","integer"],["full_name","text"],["value","numeric"],["value_locked","boolean"],["nzs_url","text"],["nzs_birth_year","integer"],["nzs_top_league","text"],["nzs_top_league_minutes","integer"],["nzs_confirmed_at","timestamp with time zone"],["value_start","numeric"],["competition_id","bigint"],["reg_st","bigint"],["repriced_at","timestamp with time zone"],["repriced_week","text"],["odsel_at","timestamp with time zone"],["odsel_by","uuid"],["izstopil_at","timestamp with time zone"],["anonimiziran_at","timestamp with time zone"],["anonimiziran_razlog","text"],["dodal_klub_at","timestamp with time zone"]],
"scout.lige_moc":[["model_id","bigint"],["competition_id","bigint"],["moc","double precision"],["vir","text"],["prestopov","integer"],["izracunano_at","timestamp with time zone"]],
"scout.vektorji":[["model_id","bigint"],["player_id","bigint"],["skupina","text"],["vektor","double precision[]"],["podobni","bigint[]"],["podobnost","double precision[]"]],
"public.napovedi":[["user_id","uuid"],["match_id","bigint"],["home_goals","smallint"],["away_goals","smallint"],["created_at","timestamp with time zone"],["updated_at","timestamp with time zone"]],
"public.profiles":[["id","uuid"],["display_name","text"],["created_at","timestamp with time zone"],["is_admin","boolean"],["insider_team_id","bigint"],["insider_competition_id","bigint"],["brez_opomnikov","boolean"],["navijam_team_id","bigint"],["brez_push","boolean"],["avatar_barva","smallint"],["avatar_ikona","text"],["javni_profil","boolean"],["display_name_changed_at","timestamp with time zone"]],
"public.settings":[["key","text"],["value","jsonb"]],
"public.sponsors":[["id","bigint"],["name","text"],["logo_url","text"],["url","text"],["claim","text"],["country_id","bigint"],["federation_id","bigint"],["competition_id","bigint"],["starts_on","date"],["ends_on","date"],["utez","integer"],["active","boolean"],["opomba","text"],["created_at","timestamp with time zone"],["updated_at","timestamp with time zone"],["slika_url","text"],["mesta","text[]"]],
"scout.ekipe_elo":[["model_id","bigint"],["team_id","bigint"],["competition_id","bigint"],["leto","integer"],["elo","double precision"]],
"scout.kazalniki":[["model_id","bigint"],["player_id","bigint"],["competition_id","bigint"],["sezona","text"],["leto","integer"],["team_id","bigint"],["skupina","text"],["minute","integer"],["delez_minut","double precision"],["zacetki_delez","double precision"],["cele_delez","double precision"],["goli_ref_90","double precision"],["delez_golov","double precision"],["enajstm","integer"],["onoff_ref_90","double precision"],["prejeti_ref_90","double precision"],["ciste_delez","double precision"],["kartoni_90","double precision"],["vratar_ref_90","double precision"],["stalnost","double precision"],["trend_minut","double precision"],["prehod_ravni","double precision"],["zaupanje","double precision"]],
"scout.narocnine":[["team_id","bigint"],["country_id","bigint"],["paket","text"],["obdobje","text"],["velja_do","timestamp with time zone"],["pogoji_sprejeti_at","timestamp with time zone"],["pogoje_sprejel","uuid"],["stripe_customer_id","text"],["stripe_subscription_id","text"],["placal","uuid"],["zaprt_at","timestamp with time zone"],["created_at","timestamp with time zone"],["updated_at","timestamp with time zone"],["prejsnja_subscription_id","text"]],
"scout.opazovani":[["team_id","bigint"],["player_id","bigint"],["dodal","uuid"],["created_at","timestamp with time zone"]],
"public.countries":[["id","bigint"],["code","text"],["name","text"],["sort_order","integer"],["active","boolean"]],
"public.email_log":[["id","bigint"],["user_id","uuid"],["email","text"],["vrsta","text"],["competition_id","bigint"],["poslano_at","timestamp with time zone"],["resend_id","text"],["napaka","text"],["round_id","bigint"],["kanal","text"]],
"public.klub_stik":[["id","bigint"],["team_id","bigint"],["klub","text"],["drzava","text"],["liga_slug","text"],["email","text"],["kontakt","text"],["vir_url","text"],["stanje","text"],["odgovorni","text"],["opomba","text"],["zadnji_mail_at","timestamp with time zone"],["mailov","integer"],["created_at","timestamp with time zone"],["updated_at","timestamp with time zone"],["updated_by","uuid"],["v_vrsti","boolean"],["poslji_od","timestamp with time zone"],["posiljatelj","text"]],
"public.mini_lige":[["id","bigint"],["name","text"],["code","text"],["owner_id","uuid"],["created_at","timestamp with time zone"],["javna","boolean"],["opis","text"],["competition_id","bigint"],["javna_zaklenjena_at","timestamp with time zone"],["saljive_nagrade","boolean"]],
"public.zelje_lig":[["id","bigint"],["user_id","uuid"],["email","text"],["drzava","text"],["ime_lige","text"],["competition_id","bigint"],["jezik","text"],["created_at","timestamp with time zone"],["obvescen_at","timestamp with time zone"],["poskusov","integer"]],
"scout.prisotnost":[["dogodek_id","bigint"],["player_id","bigint"],["stanje","text"],["oznacil","uuid"],["updated_at","timestamp with time zone"]],
"scout.privolitve":[["player_id","bigint"],["odprt_za_prestop","boolean"],["letnik","integer"],["regije","bigint[]"],["kontakt_dovoljen","boolean"],["updated_at","timestamp with time zone"]],
"public.appearances":[["id","bigint"],["match_id","bigint"],["player_id","bigint"],["team_id","bigint"],["shirt_number","integer"],["started","boolean"],["minute_on","integer"],["minute_off","integer"],["minutes_played","integer"],["goals","integer"],["own_goals","integer"],["penalties_scored","integer"],["penalties_missed","integer"],["penalties_saved","integer"],["yellow_cards","integer"],["red_cards","integer"],["goals_conceded","integer"],["clean_sheet","boolean"],["is_goalkeeper","boolean"],["red_card_minute","integer"]],
"public.federations":[["id","bigint"],["country_id","bigint"],["code","text"],["name","text"],["short_name","text"],["site_url","text"],["sort_order","integer"],["active","boolean"]],
"public.assist_votes":[["id","bigint"],["goal_id","bigint"],["voter_id","uuid"],["player_id","bigint"],["created_at","timestamp with time zone"]],
"public.competitions":[["id","bigint"],["slug","text"],["name","text"],["short_name","text"],["mnzg_liga","text"],["prvi_fantasy_krog","integer"],["sort_order","integer"],["active","boolean"],["rok_pomak_ur","integer"],["country_id","bigint"],["source","text"],["source_league_code","text"],["federation_id","bigint"],["vir_ime","text"],["vir_url","text"],["sezona_koledarska","boolean"],["source_policy","text"],["date_only_deadline_policy","text"]],
"public.ponovne_cene":[["id","bigint"],["player_id","bigint"],["competition_id","bigint"],["user_id","uuid"],["stanje","text"],["izid","text"],["stara_cena","numeric"],["nova_cena","numeric"],["podlaga","jsonb"],["opomba","text"],["stripe_seja","text"],["stripe_placilo","text"],["created_at","timestamp with time zone"],["placano_at","timestamp with time zone"],["predlog_at","timestamp with time zone"],["odlocil","uuid"],["odloceno_at","timestamp with time zone"]],
"public.tocke_krogov":[["fantasy_team_id","bigint"],["round_id","bigint"],["points","numeric"],["transfers","integer"],["penalty","integer"]],
"public.fantasy_chips":[["fantasy_team_id","bigint"],["chip","text"],["round_id","bigint"],["played_at","timestamp with time zone"],["season","text"]],
"public.fantasy_teams":[["id","bigint"],["owner_id","uuid"],["name","text"],["created_at","timestamp with time zone"],["budget","numeric"],["cash","numeric"],["competition_id","bigint"],["roster_updated_at","timestamp with time zone"],["hisna","boolean"],["display_name","text"]],
"public.player_scores":[["round_id","bigint"],["player_id","bigint"],["points","numeric"],["computed_at","timestamp with time zone"]],
"public.price_changes":[["id","bigint"],["player_id","bigint"],["round_id","bigint"],["old_value","numeric"],["new_value","numeric"],["form","numeric"],["changed_at","timestamp with time zone"]],
"public.sponsor_stats":[["sponsor_id","bigint"],["dan","date"],["competition_id","bigint"],["prikazov","integer"],["klikov","integer"],["id","bigint"],["mesto","text"]],
"public.fantasy_roster":[["fantasy_team_id","bigint"],["player_id","bigint"],["is_starter","boolean"],["is_captain","boolean"],["is_vice","boolean"],["bench_order","integer"],["buy_value","numeric"],["buy_position","text"]],
"public.klubski_racuni":[["id","bigint"],["user_id","uuid"],["team_id","bigint"],["klub_stik_id","bigint"],["created_at","timestamp with time zone"],["preklican_at","timestamp with time zone"],["preklical","uuid"]],
"public.narocila_znack":[["id","bigint"],["preverjeni_racun_id","bigint"],["user_id","uuid"],["player_id","bigint"],["ime_na_znacki","text"],["naslov","jsonb"],["postnina","text"],["status","text"],["stripe_checkout_id","text"],["created_at","timestamp with time zone"],["poslano_at","timestamp with time zone"],["opomba","text"]],
"public.player_reports":[["id","bigint"],["player_id","bigint"],["user_id","uuid"],["kind","text"],["content","text"],["created_at","timestamp with time zone"]],
"public.position_votes":[["id","bigint"],["player_id","bigint"],["voter_id","uuid"],["position","text"],["created_at","timestamp with time zone"]],
"public.profil_igralca":[["player_id","bigint"],["vzdevek","text"],["opis","text"],["instagram","text"],["tiktok","text"],["facebook","text"],["fotografija","text"],["skrij_ime","boolean"],["updated_at","timestamp with time zone"]],
"public.zadrzani_padci":[["player_id","bigint"],["round_id","bigint"],["odsotnost_id","bigint"],["znesek","numeric"],["created_at","timestamp with time zone"],["uveljavljeno_at","timestamp with time zone"]],
"public.fantasy_lineups":[["round_id","bigint"],["fantasy_team_id","bigint"],["player_id","bigint"],["is_starter","boolean"],["is_captain","boolean"],["is_vice","boolean"],["bench_order","integer"],["captured_at","timestamp with time zone"],["position","text"]],
"public.klub_stik_posta":[["id","bigint"],["stik_id","bigint"],["poslano_at","timestamp with time zone"],["vrsta","text"],["zadeva","text"],["poslal","text"],["opomba","text"],["created_by","uuid"],["za","text"],["telo","text"],["gmail_nit","text"]],
"public.mini_liga_clani":[["mini_liga_id","bigint"],["fantasy_team_id","bigint"],["joined_at","timestamp with time zone"]],
"public.position_priors":[["player_id","bigint"],["position","text"],["score","numeric"],["updated_at","timestamp with time zone"]],
"public.zetoni_prevzema":[["id","bigint"],["zahtevek_id","bigint"],["hash","text"],["klub_stik_id","bigint"],["created_at","timestamp with time zone"],["expires_at","timestamp with time zone"],["porabljen_at","timestamp with time zone"],["odlocitev","text"]],
"public.klubski_zahtevki":[["id","bigint"],["user_id","uuid"],["email","text"],["vrsta","text"],["team_id","bigint"],["klub_stik_id","bigint"],["vloga","text"],["dokaz_url","text"],["opomba","text"],["status","text"],["razlog","text"],["created_at","timestamp with time zone"],["decided_at","timestamp with time zone"],["decided_by","uuid"]],
"public.povezani_igralci":[["player_id","bigint"],["zahtevek_id","bigint"],["povezal","uuid"],["created_at","timestamp with time zone"]],
"public.prijave_mini_lig":[["id","bigint"],["mini_liga_id","bigint"],["user_id","uuid"],["razlog","text"],["created_at","timestamp with time zone"],["resena_at","timestamp with time zone"],["resil","uuid"]],
"public.zahtevki_igralca":[["id","bigint"],["player_id","bigint"],["user_id","uuid"],["status","text"],["potrdil","text"],["spor","boolean"],["star_vsaj_16","boolean"],["dokaz_url","text"],["note","text"],["created_at","timestamp with time zone"],["decided_at","timestamp with time zone"],["decided_by","uuid"],["klubu_poslano_at","timestamp with time zone"],["klubu_na","text"],["obvescen_at","timestamp with time zone"]],
"public.fantasy_transfers":[["fantasy_team_id","bigint"],["round_id","bigint"],["transfers","integer"],["free_transfers","integer"],["penalty","integer"],["created_at","timestamp with time zone"]],
"public.klub_predstavitev":[["team_id","bigint"],["opis","text"],["spletna_stran","text"],["instagram","text"],["facebook","text"],["updated_at","timestamp with time zone"],["updated_by","uuid"]],
"public.mini_liga_dvoboji":[["id","bigint"],["mini_liga_id","bigint"],["sezona","text"],["krog","integer"],["ekipa_a","bigint"],["ekipa_b","bigint"],["created_at","timestamp with time zone"]],
"public.popravki_podatkov":[["id","bigint"],["vrsta","text"],["competition_id","bigint"],["team_id","bigint"],["player_id","bigint"],["pozicija","text"],["match_id","bigint"],["gol_minuta","integer"],["gol_strelec_id","bigint"],["gol_avtogol","boolean"],["gol_enajstmetrovka","boolean"],["asistent_id","bigint"],["opomba","text"],["user_id","uuid"],["created_at","timestamp with time zone"],["stanje","text"],["odlocil","uuid"],["odloceno_at","timestamp with time zone"],["razlog","text"]],
"public.preverjeni_racuni":[["id","bigint"],["user_id","uuid"],["player_id","bigint"],["vir","text"],["status","text"],["velja_do","timestamp with time zone"],["star_vsaj_18","boolean"],["stripe_customer_id","text"],["stripe_subscription_id","text"],["ustvaril","uuid"],["created_at","timestamp with time zone"],["updated_at","timestamp with time zone"],["odpoved_pravici","boolean"],["stripe_checkout_id","text"],["stripe_payment_intent","text"],["znesek_pravice","integer"],["stripe_preklic","text"]],
"public.uradne_odsotnosti":[["id","bigint"],["player_id","bigint"],["zahtevek_id","bigint"],["user_id","uuid"],["vrsta","text"],["od","date"],["vrnitev","date"],["opomba","text"],["sezona","text"],["status","text"],["created_at","timestamp with time zone"],["zaprto_at","timestamp with time zone"],["ni_drzalo_datum","date"],["ni_drzalo_match_id","bigint"],["klub_potrdil_at","timestamp with time zone"],["klub_potrdil","uuid"]],
"public.poznavalec_prosnje":[["id","bigint"],["user_id","uuid"],["competition_id","bigint"],["team_id","bigint"],["vloga","text"],["sporocilo","text"],["status","text"],["created_at","timestamp with time zone"],["decided_at","timestamp with time zone"],["decided_by","uuid"]],
"public.klub_dodani_igralci":[["id","bigint"],["player_id","bigint"],["team_id","bigint"],["competition_id","bigint"],["sezona","text"],["full_name","text"],["user_id","uuid"],["created_at","timestamp with time zone"],["odstranjen_at","timestamp with time zone"]],
"public.profil_igralca_plus":[["player_id","bigint"],["opis","text"],["youtube","text"],["x","text"],["splet","text"],["pasica","text"],["barva","text"],["tekma_id","bigint"],["statistika","text"],["sporocilo","text"],["updated_at","timestamp with time zone"]],
"public.statistika_igralcev":[["player_id","bigint"],["competition_id","bigint"],["season","text"],["matches","integer"],["minutes","integer"],["goals","integer"],["own_goals","integer"],["yellow_cards","integer"],["red_cards","integer"],["clean_sheets","integer"],["points","numeric"],["assists","integer"],["last_round","numeric"],["form","numeric"]],
"private_dfb_pending.pending":[["match_id","bigint"],["competition_id","bigint"],["round_id","bigint"],["report_id","text"],["source_code","text"],["raw_sha256","text"],["evidence_id","bigint"],["observed_at","timestamp with time zone"],["next_retry_at","timestamp with time zone"],["attempts","integer"]],
"private_fussball.card_heads":[["match_id","bigint"],["report_id","bigint"],["saved_assists","jsonb"],["applied_resolution_sha256","text"],["applied_at","timestamp with time zone"],["deferred_resolution_sha256","text"],["retry_at","timestamp with time zone"],["replay_error","text"]],
"private_fussball.card_votes":[["event_id","bigint"],["voter_id","uuid"],["player_id","bigint"],["updated_at","timestamp with time zone"]],
"public.assist_votes_deleted":[["id","bigint"],["goal_id","bigint"],["voter_id","uuid"],["player_id","bigint"],["created_at","timestamp with time zone"],["deleted_at","timestamp with time zone"],["deleted_by","text"],["reason","text"]],
"public.competition_settings":[["competition_id","bigint"],["key","text"],["value","jsonb"]],
"public.potrditve_soigralcev":[["zahtevek_id","bigint"],["user_id","uuid"],["player_id","bigint"],["created_at","timestamp with time zone"]],
"public.pozicije_klub_cakajo":[["player_id","bigint"],["position","text"],["user_id","uuid"],["created_at","timestamp with time zone"]],
"public.samodejni_poznavalci":[["user_id","uuid"],["competition_id","bigint"],["glasov","integer"],["pravilnih","integer"],["podeljeno_at","timestamp with time zone"],["odvzeto_at","timestamp with time zone"],["odvzel","uuid"],["razlog","text"]],
"private_dfb_pending.evidence":[["id","bigint"],["competition_id","bigint"],["match_id","bigint"],["report_id","text"],["source_code","text"],["fixture","jsonb"],["status","text"],["reason","text"],["raw_sha256","text"],["raw_bytes","bytea"],["observed_at","timestamp with time zone"]],
"private_fussball.card_events":[["id","bigint"],["report_id","bigint"],["event_key","text"],["ordinal","integer"],["event_type","text"],["side","integer"],["minute","integer"],["added","integer"],["official_player_id","bigint"],["confirmed_player_id","bigint"]],
"public.anonimizirani_igralci":[["player_id","bigint"],["kljuc","text"]],
"public.pozicije_klub_dnevnik":[["id","bigint"],["player_id","bigint"],["staro","text"],["novo","text"],["user_id","uuid"],["created_at","timestamp with time zone"]],
"private_fussball.card_reports":[["id","bigint"],["competition_id","bigint"],["match_id","bigint"],["source_code","text"],["revision_sha256","text"],["envelope","jsonb"],["candidates","jsonb"],["registered_at","timestamp with time zone"]],
"public.position_votes_deleted":[["id","bigint"],["player_id","bigint"],["voter_id","uuid"],["position","text"],["created_at","timestamp with time zone"],["deleted_at","timestamp with time zone"],["deleted_by","text"],["reason","text"]],
"private_fussball.card_policies":[["competition_id","bigint"],["current_code","text"],["archive_codes","text[]"],["installed_at","timestamp with time zone"]],
"public.prijave_profila_igralca":[["id","bigint"],["zahtevek_id","bigint"],["user_id","uuid"],["razlog","text"],["created_at","timestamp with time zone"],["resena_at","timestamp with time zone"],["resil","uuid"]],
"private_fussball.card_admissions":[["competition_id","bigint"],["manifest","jsonb"],["manifest_sha256","text"],["state_sha256","text"],["registered_at","timestamp with time zone"]],
"private_fcf_target_release.receipts":[["id","bigint"],["competition_id","bigint"],["inventory_key","text"],["packet_sha256","text"],["packet_text","text"],["rollout_text","text"],["rollout_sha256","text"],["source_fingerprint","text"],["cleanup_before_sha256","text"],["imported_state_sha256","text"],["stage","text"],["activation_result","jsonb"],["created_at","timestamp with time zone"]],
"private_fussball.card_write_context":[["match_id","bigint"],["xid","bigint"]],
"private_mfa_nl_history.price_receipt":[["competition_id","bigint"],["main_sha","text"],["contract_sha","text"],["football_sha","text"],["state_sha","text"],["recorded_at","timestamp with time zone"]],
"private_historical_statistics.markers":[["competition_id","bigint"],["source_match_id","text"],["source_report_id","text"],["fixture","jsonb"],["raw_sha256","text"],["round_id","bigint"],["home_team_id","bigint"],["away_team_id","bigint"]],
"private_mfa_nl_history.import_receipt":[["competition_id","bigint"],["main_sha","text"],["contract_sha","text"],["bootstrap_before_sha","text"],["football_sha","text"],["football_image_text","text"],["recorded_at","timestamp with time zone"]],
"private_historical_statistics.policies":[["id","text"],["policy_sha256","text"],["document","jsonb"]],
"private_mfa_nl_history.release_receipt":[["competition_id","bigint"],["main_sha","text"],["contract_sha","text"],["preview_sha","text"],["result","jsonb"],["activated_at","timestamp with time zone"]],
"private_mfa_nl_history.source_contract":[["competition_id","bigint"],["contract_sha256","text"],["document","jsonb"]],
"private_fcf_six_target_release.receipts":[["id","bigint"],["competition_id","bigint"],["inventory_key","text"],["packet_sha256","text"],["packet_text","text"],["rollout_text","text"],["rollout_sha256","text"],["source_fingerprint","text"],["cleanup_before_sha256","text"],["imported_state_sha256","text"],["stage","text"],["activation_result","jsonb"],["created_at","timestamp with time zone"]],
"private_hns_women_release.club_bindings":[["competition_id","bigint"],["source_club_id","text"],["canonical_name","text"],["team_id","bigint"],["country_id","bigint"]],
"private_hns_women_release.round_sources":[["round_id","bigint"],["competition_id","bigint"],["season","text"],["number","integer"],["effective_document","jsonb"],["latest_document","jsonb"]],
"private_fcf_target_release.club_bindings":[["competition_id","bigint"],["club_id","text"],["category_id","text"],["team_id","bigint"],["country_id","bigint"],["source_fingerprint","text"]],
"private_fussball.card_activation_context":[["competition_id","bigint"],["xid","bigint"],["state_sha256","text"]],
"private_mfa_nl_history.bootstrap_receipt":[["competition_id","bigint"],["main_sha","text"],["policy_sha","text"],["before_sha","text"],["before_image_text","text"],["result","jsonb"],["installed_at","timestamp with time zone"]],
"private_hns_women_release.bootstrap_state":[["competition_id","bigint"],["first_fantasy_played_on","date"],["initial_manifest_sha256","text"],["created_at","timestamp with time zone"]],
"private_hns_women_release.fixture_catalog":[["source_match_id","text"],["source_competition_id","text"],["season","text"],["internal_round","integer"],["document","jsonb"]],
"private_fcf_future_history.cleanup_receipt":[["singleton","boolean"],["main_commit","text"],["policy_hashes","jsonb"],["before_sha256","text"],["before_image_text","text"],["result","jsonb"],["after_image","jsonb"],["restored","boolean"]],
"private_fcf_future_target_release.receipts":[["id","bigint"],["competition_id","bigint"],["inventory_key","text"],["packet_sha256","text"],["packet_text","text"],["rollout_text","text"],["rollout_sha256","text"],["source_fingerprint","text"],["cleanup_before_sha256","text"],["imported_state_sha256","text"],["stage","text"],["activation_result","jsonb"],["created_at","timestamp with time zone"]],
"private_fcf_target_release.cleanup_receipt":[["singleton","boolean"],["main_commit","text"],["policy_hashes","jsonb"],["before_sha256","text"],["before_image_text","text"],["result","jsonb"]],
"private_hns_women_release.prepared_packets":[["competition_id","bigint"],["manifest_sha256","text"],["document","jsonb"],["prepared_at","timestamp with time zone"]],
"private_fcf_six_target_release.club_bindings":[["competition_id","bigint"],["club_id","text"],["category_id","text"],["team_id","bigint"],["country_id","bigint"],["source_fingerprint","text"]],
"private_fcf_six_history.restore_authorizations":[["authorized_xid","bigint"],["before_sha","text"]],
"private_fcf_six_target_release.cleanup_receipt":[["singleton","boolean"],["main_commit","text"],["policy_hashes","jsonb"],["before_sha256","text"],["before_image_text","text"],["result","jsonb"],["after_image","jsonb"],["restored","boolean"]],
"private_hns_women_release.round_authorizations":[["competition_id","bigint"],["season","text"],["number","integer"],["authorized_xid","bigint"],["played_on","date"],["deadline_at","timestamp with time zone"]],
"private_historical_statistics.installed_policies":[["competition_id","bigint"],["policy_id","text"],["policy_sha256","text"],["first_fantasy_played_on","date"],["installed_at","timestamp with time zone"]],
"private_historical_statistics.source_club_bindings":[["provider","text"],["source_club_id","text"],["source_category_id","text"],["country_code","text"],["canonical_names","text[]"],["proofs","jsonb"],["bound_team_id","bigint"]],
"private_historical_statistics.release_authorizations":[["competition_id","bigint"],["manifest_sha256","text"],["policy_id","text"],["state_sha256","text"],["authorized_xid","bigint"],["recorded_at","timestamp with time zone"]]
}'; expected_fk jsonb:='[
{"rel":"anonimizirani_igralci","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"appearances","parent":"matches","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE"},
{"rel":"appearances","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"appearances","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT"},
{"rel":"assist_votes","parent":"goals","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE"},
{"rel":"assist_votes","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"assist_votes","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (voter_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"competition_settings","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"competitions","parent":"countries","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (country_id) REFERENCES countries(id)"},
{"rel":"competitions","parent":"federations","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (federation_id) REFERENCES federations(id)"},
{"rel":"email_log","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"email_log","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE SET NULL"},
{"rel":"email_log","parent":"auth.users","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL"},
{"rel":"fantasy_chips","parent":"fantasy_teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (fantasy_team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE"},
{"rel":"fantasy_chips","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE"},
{"rel":"fantasy_lineups","parent":"fantasy_teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (fantasy_team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE"},
{"rel":"fantasy_lineups","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"fantasy_lineups","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE"},
{"rel":"fantasy_roster","parent":"fantasy_teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (fantasy_team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE"},
{"rel":"fantasy_roster","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"fantasy_teams","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"fantasy_teams","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"fantasy_transfers","parent":"fantasy_teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (fantasy_team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE"},
{"rel":"fantasy_transfers","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE"},
{"rel":"federations","parent":"countries","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE"},
{"rel":"goals","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (assist_player_id) REFERENCES players(id) ON DELETE SET NULL"},
{"rel":"goals","parent":"matches","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE"},
{"rel":"goals","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (scorer_id) REFERENCES players(id) ON DELETE SET NULL"},
{"rel":"goals","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT"},
{"rel":"klub_dodani_igralci","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"klub_dodani_igralci","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL"},
{"rel":"klub_dodani_igralci","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE"},
{"rel":"klub_dodani_igralci","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"klub_predstavitev","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE"},
{"rel":"klub_predstavitev","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"klub_stik","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL"},
{"rel":"klub_stik_posta","parent":"klub_stik","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (stik_id) REFERENCES klub_stik(id) ON DELETE CASCADE"},
{"rel":"klubski_racuni","parent":"klub_stik","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (klub_stik_id) REFERENCES klub_stik(id) ON DELETE SET NULL"},
{"rel":"klubski_racuni","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (preklical) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"klubski_racuni","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE"},
{"rel":"klubski_racuni","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"klubski_zahtevki","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (decided_by) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"klubski_zahtevki","parent":"klub_stik","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (klub_stik_id) REFERENCES klub_stik(id) ON DELETE SET NULL"},
{"rel":"klubski_zahtevki","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL"},
{"rel":"klubski_zahtevki","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"matches","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE RESTRICT"},
{"rel":"matches","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE RESTRICT"},
{"rel":"matches","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE"},
{"rel":"mini_liga_clani","parent":"fantasy_teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (fantasy_team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE"},
{"rel":"mini_liga_clani","parent":"mini_lige","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (mini_liga_id) REFERENCES mini_lige(id) ON DELETE CASCADE"},
{"rel":"mini_liga_dvoboji","parent":"fantasy_teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (ekipa_a) REFERENCES fantasy_teams(id) ON DELETE CASCADE"},
{"rel":"mini_liga_dvoboji","parent":"fantasy_teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (ekipa_b) REFERENCES fantasy_teams(id) ON DELETE CASCADE"},
{"rel":"mini_liga_dvoboji","parent":"mini_lige","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (mini_liga_id) REFERENCES mini_lige(id) ON DELETE CASCADE"},
{"rel":"mini_lige","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL"},
{"rel":"mini_lige","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"napovedi","parent":"matches","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE"},
{"rel":"napovedi","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"narocila_znack","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL"},
{"rel":"narocila_znack","parent":"preverjeni_racuni","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (preverjeni_racun_id) REFERENCES preverjeni_racuni(id) ON DELETE SET NULL"},
{"rel":"narocila_znack","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"player_reports","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"player_reports","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"player_scores","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"player_scores","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE"},
{"rel":"players","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"players","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (odsel_by) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"players","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE"},
{"rel":"ponovne_cene","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"ponovne_cene","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (odlocil) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"ponovne_cene","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"ponovne_cene","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"popravki_podatkov","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (asistent_id) REFERENCES players(id) ON DELETE SET NULL"},
{"rel":"popravki_podatkov","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"popravki_podatkov","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (gol_strelec_id) REFERENCES players(id) ON DELETE SET NULL"},
{"rel":"popravki_podatkov","parent":"matches","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE"},
{"rel":"popravki_podatkov","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (odlocil) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"popravki_podatkov","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"popravki_podatkov","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE"},
{"rel":"popravki_podatkov","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"position_priors","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"position_votes","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"position_votes","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (voter_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"potrditve_soigralcev","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"potrditve_soigralcev","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"potrditve_soigralcev","parent":"zahtevki_igralca","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (zahtevek_id) REFERENCES zahtevki_igralca(id) ON DELETE CASCADE"},
{"rel":"povezani_igralci","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"povezani_igralci","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (povezal) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"povezani_igralci","parent":"zahtevki_igralca","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (zahtevek_id) REFERENCES zahtevki_igralca(id) ON DELETE CASCADE"},
{"rel":"pozicije_klub_cakajo","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"pozicije_klub_cakajo","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"pozicije_klub_dnevnik","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"pozicije_klub_dnevnik","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"poznavalec_prosnje","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"poznavalec_prosnje","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (decided_by) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"poznavalec_prosnje","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL"},
{"rel":"poznavalec_prosnje","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"preverjeni_racuni","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"preverjeni_racuni","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"preverjeni_racuni","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (ustvaril) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"price_changes","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"price_changes","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE"},
{"rel":"prijave_mini_lig","parent":"mini_lige","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (mini_liga_id) REFERENCES mini_lige(id) ON DELETE CASCADE"},
{"rel":"prijave_mini_lig","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (resil) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"prijave_mini_lig","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"prijave_profila_igralca","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (resil) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"prijave_profila_igralca","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"prijave_profila_igralca","parent":"zahtevki_igralca","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (zahtevek_id) REFERENCES zahtevki_igralca(id) ON DELETE CASCADE"},
{"rel":"private_dfb_pending.evidence","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_dfb_pending.evidence","parent":"matches","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (match_id) REFERENCES matches(id)"},
{"rel":"private_dfb_pending.pending","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_dfb_pending.pending","parent":"private_dfb_pending.evidence","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (evidence_id) REFERENCES private_dfb_pending.evidence(id)"},
{"rel":"private_dfb_pending.pending","parent":"matches","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (match_id) REFERENCES matches(id)"},
{"rel":"private_dfb_pending.pending","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (round_id) REFERENCES rounds(id)"},
{"rel":"private_fcf_future_target_release.receipts","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_fcf_six_target_release.club_bindings","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_fcf_six_target_release.club_bindings","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id)"},
{"rel":"private_fcf_six_target_release.receipts","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_fcf_target_release.club_bindings","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_fcf_target_release.club_bindings","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id)"},
{"rel":"private_fcf_target_release.receipts","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_fussball.card_admissions","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_fussball.card_events","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (confirmed_player_id) REFERENCES players(id)"},
{"rel":"private_fussball.card_events","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (official_player_id) REFERENCES players(id)"},
{"rel":"private_fussball.card_events","parent":"private_fussball.card_reports","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (report_id) REFERENCES private_fussball.card_reports(id)"},
{"rel":"private_fussball.card_heads","parent":"matches","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (match_id) REFERENCES matches(id)"},
{"rel":"private_fussball.card_heads","parent":"private_fussball.card_reports","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (report_id) REFERENCES private_fussball.card_reports(id)"},
{"rel":"private_fussball.card_policies","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_fussball.card_reports","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_fussball.card_reports","parent":"matches","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (match_id) REFERENCES matches(id)"},
{"rel":"private_fussball.card_votes","parent":"private_fussball.card_events","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (event_id) REFERENCES private_fussball.card_events(id)"},
{"rel":"private_fussball.card_votes","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id)"},
{"rel":"private_fussball.card_votes","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (voter_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"private_historical_statistics.installed_policies","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_historical_statistics.installed_policies","parent":"private_historical_statistics.policies","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (policy_id) REFERENCES private_historical_statistics.policies(id)"},
{"rel":"private_historical_statistics.markers","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (away_team_id) REFERENCES teams(id)"},
{"rel":"private_historical_statistics.markers","parent":"private_historical_statistics.installed_policies","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES private_historical_statistics.installed_policies(competition_id)"},
{"rel":"private_historical_statistics.markers","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (home_team_id) REFERENCES teams(id)"},
{"rel":"private_historical_statistics.markers","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (round_id) REFERENCES rounds(id)"},
{"rel":"private_historical_statistics.release_authorizations","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id)"},
{"rel":"private_historical_statistics.source_club_bindings","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (bound_team_id) REFERENCES teams(id)"},
{"rel":"private_mfa_nl_history.import_receipt","parent":"private_mfa_nl_history.source_contract","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES private_mfa_nl_history.source_contract(competition_id)"},
{"rel":"private_mfa_nl_history.price_receipt","parent":"private_mfa_nl_history.import_receipt","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id, main_sha) REFERENCES private_mfa_nl_history.import_receipt(competition_id, main_sha)"},
{"rel":"private_mfa_nl_history.release_receipt","parent":"private_mfa_nl_history.source_contract","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES private_mfa_nl_history.source_contract(competition_id)"},
{"rel":"profil_igralca","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"profil_igralca_plus","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"profil_igralca_plus","parent":"matches","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (tekma_id) REFERENCES matches(id) ON DELETE SET NULL"},
{"rel":"profiles","parent":"auth.users","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE"},
{"rel":"profiles","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (insider_competition_id) REFERENCES competitions(id) ON DELETE SET NULL"},
{"rel":"profiles","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (insider_team_id) REFERENCES teams(id) ON DELETE SET NULL"},
{"rel":"profiles","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (navijam_team_id) REFERENCES teams(id) ON DELETE SET NULL"},
{"rel":"rounds","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"samodejni_poznavalci","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"samodejni_poznavalci","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (odvzel) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"samodejni_poznavalci","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"scout.dnevnik","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"scout.dogodki","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"scout.dogodki","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE"},
{"rel":"scout.dogodki","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (ustvaril) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"scout.drzave","parent":"countries","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE"},
{"rel":"scout.ekipe_elo","parent":"scout.modeli","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (model_id) REFERENCES scout.modeli(id) ON DELETE CASCADE"},
{"rel":"scout.indeks","parent":"scout.modeli","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (model_id) REFERENCES scout.modeli(id) ON DELETE CASCADE"},
{"rel":"scout.kazalniki","parent":"scout.modeli","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (model_id) REFERENCES scout.modeli(id) ON DELETE CASCADE"},
{"rel":"scout.lige_moc","parent":"scout.modeli","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (model_id) REFERENCES scout.modeli(id) ON DELETE CASCADE"},
{"rel":"scout.narocnine","parent":"countries","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (country_id) REFERENCES countries(id)"},
{"rel":"scout.narocnine","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (placal) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"scout.narocnine","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (pogoje_sprejel) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"scout.narocnine","parent":"teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES teams(id)"},
{"rel":"scout.opazovani","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (dodal) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"scout.opazovani","parent":"scout.narocnine","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES scout.narocnine(team_id) ON DELETE CASCADE"},
{"rel":"scout.prisotnost","parent":"scout.dogodki","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (dogodek_id) REFERENCES scout.dogodki(id) ON DELETE CASCADE"},
{"rel":"scout.prisotnost","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (oznacil) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"scout.prisotnost","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"scout.privolitve","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"scout.sedezi","parent":"scout.narocnine","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (team_id) REFERENCES scout.narocnine(team_id) ON DELETE CASCADE"},
{"rel":"scout.sedezi","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"scout.vektorji","parent":"scout.modeli","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (model_id) REFERENCES scout.modeli(id) ON DELETE CASCADE"},
{"rel":"scout.vrzeli","parent":"scout.modeli","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (model_id) REFERENCES scout.modeli(id) ON DELETE CASCADE"},
{"rel":"sponsor_stats","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"sponsor_stats","parent":"sponsors","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE"},
{"rel":"sponsors","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE"},
{"rel":"sponsors","parent":"countries","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE"},
{"rel":"sponsors","parent":"federations","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (federation_id) REFERENCES federations(id) ON DELETE CASCADE"},
{"rel":"statistika_igralcev","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"teams","parent":"countries","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (country_id) REFERENCES countries(id)"},
{"rel":"tocke_krogov","parent":"fantasy_teams","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (fantasy_team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE"},
{"rel":"tocke_krogov","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE"},
{"rel":"uradne_odsotnosti","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (klub_potrdil) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"uradne_odsotnosti","parent":"matches","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (ni_drzalo_match_id) REFERENCES matches(id) ON DELETE SET NULL"},
{"rel":"uradne_odsotnosti","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"uradne_odsotnosti","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"uradne_odsotnosti","parent":"zahtevki_igralca","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (zahtevek_id) REFERENCES zahtevki_igralca(id) ON DELETE CASCADE"},
{"rel":"zadrzani_padci","parent":"uradne_odsotnosti","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (odsotnost_id) REFERENCES uradne_odsotnosti(id) ON DELETE CASCADE"},
{"rel":"zadrzani_padci","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"zadrzani_padci","parent":"rounds","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE"},
{"rel":"zahtevki_igralca","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (decided_by) REFERENCES profiles(id) ON DELETE SET NULL"},
{"rel":"zahtevki_igralca","parent":"players","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE"},
{"rel":"zahtevki_igralca","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"zelje_lig","parent":"competitions","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL"},
{"rel":"zelje_lig","parent":"profiles","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
{"rel":"zetoni_prevzema","parent":"klub_stik","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (klub_stik_id) REFERENCES klub_stik(id) ON DELETE SET NULL"},
{"rel":"zetoni_prevzema","parent":"zahtevki_igralca","deferred":false,"validated":true,"deferrable":false,"definition":"FOREIGN KEY (zahtevek_id) REFERENCES zahtevki_igralca(id) ON DELETE CASCADE"}
]';
 catalog jsonb;actual_shape jsonb;q record;rr record;mm record;rows jsonb;stats jsonb:='{}';
 round_counts jsonb:='[]';match_counts jsonb:='[]';global_users bigint:=0;n bigint;rn bigint;mn bigint;
 inventory jsonb;native jsonb;before_text text;price_text text;rosters bigint;event_resolution text;
begin
 select * into c from public.competitions where id=cid;
 perform private_fcf_six_target_release.require(p_slug='es-ct-tercera-g9' and c.slug=p_slug and c.source='fcf' and c.source_league_code='4118349-4118588' and c.source_policy='es-fcf-six-reviewed-history-v1' and not c.active and not c.sezona_koledarska and c.rok_pomak_ur=6 and c.date_only_deadline_policy is null and exists(select 1 from public.countries where id=c.country_id and code='ES'),'future projection exact inactive G9 route');
 perform private_fcf_six_target_release.require(p_privacy_keys is not null and cardinality(p_privacy_keys)<=20000 and cardinality(p_privacy_keys)=(select count(distinct k)from unnest(p_privacy_keys)k)and not exists(select 1 from unnest(p_privacy_keys)k where k is null or k!~'^[a-f0-9]{64}$'),'unique bounded SHA256 privacy keys required');
 -- Both event tables are either the exact reviewed Scout delta or absent.
 perform private_fcf_six_target_release.require((to_regclass('scout.dogodki')is null)=(to_regclass('scout.prisotnost')is null),'incomplete Scout event schema');
 if to_regclass('scout.dogodki')is null then
  registry:=registry-'scout.dogodki'-'scout.prisotnost';shapes:=shapes-'scout.dogodki'-'scout.prisotnost';
  registry:=jsonb_set(registry,array['scout.dnevnik','where'],to_jsonb(replace(registry#>>'{scout.dnevnik,where}', ' or x.parametri->>''dogodek'' in(select id::text from scout.dogodki where competition_id=797)','')));
  select coalesce(jsonb_agg(j),'[]')into expected_fk from jsonb_array_elements(expected_fk)j where j->>'rel'not in('scout.dogodki','scout.prisotnost');
 end if;
 -- Close every relevant FK and every reviewed relation's complete column/type
 -- shape. This check runs even on empty tables. No row-count inference of coverage.
 select coalesce(jsonb_agg(jsonb_build_object('rel',c.conrelid::regclass::text,'parent',c.confrelid::regclass::text,'definition',pg_get_constraintdef(c.oid),'validated',c.convalidated,'deferrable',c.condeferrable,'deferred',c.condeferred)order by c.conrelid::regclass::text,pg_get_constraintdef(c.oid)),'[]'::jsonb) from pg_constraint c where c.contype='f' and (c.conrelid in(select to_regclass(key)from jsonb_each(shapes))or c.confrelid in(select oid from pg_class where relnamespace in('public'::regnamespace,'scout'::regnamespace,'private_fussball'::regnamespace)and relname in('competitions','rounds','teams','players','matches','appearances','goals','fantasy_teams','mini_lige','zahtevki_igralca','preverjeni_racuni','uradne_odsotnosti','player_scores','statistika_igralcev','tocke_krogov','dogodki','card_reports','card_events'))) into catalog;
 perform private_fcf_six_target_release.require(catalog=expected_fk,'unknown/missing relevant FK definition, validation or deferrability');
 for q in select key,value from jsonb_each(shapes)order by key loop
  perform private_fcf_six_target_release.require(to_regclass(q.key)is not null,'missing required dependency relation: '||q.key);
  select jsonb_agg(jsonb_build_array(a.attname,a.atttypid::regtype::text)order by a.attnum)into actual_shape from pg_attribute a where a.attrelid=to_regclass(q.key)and a.attnum>0 and not a.attisdropped;
  perform private_fcf_six_target_release.require(actual_shape=q.value,'unreviewed dependency shape: '||q.key);
 end loop;
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_attribute a join pg_class t on t.oid=a.attrelid join pg_namespace ns on ns.oid=t.relnamespace where t.relkind in('r','p')and a.attnum>0 and not a.attisdropped and(ns.nspname in('public','scout')or ns.nspname like 'private\_%'escape '\')and(ns.nspname='scout'or a.attname~'(^|_)(competition|round|match|player|goal|appearance|fantasy_team|dogodek)_id$'or a.attname in('podobni','igralci','tekma_id','gol_strelec_id','asistent_id'))and not shapes ? (ns.nspname||'.'||t.relname)),'unknown relevant non-FK/Scout relation');
 select coalesce(array_agg(id order by id),'{}')into pids from public.players where competition_id=cid;
 select coalesce(array_agg(id order by id),'{}')into rids from public.rounds where competition_id=cid;
 select coalesce(array_agg(id order by id),'{}')into mids from public.matches where round_id=any(rids);
 select coalesce(array_agg(id order by id),'{}')into ftids from public.fantasy_teams where competition_id=cid;
 select array_agg(id order by id)into tids from(select home_team_id id from public.matches where id=any(mids)union select away_team_id from public.matches where id=any(mids))s;
 perform private_fcf_six_target_release.require(cardinality(rids)=30 and cardinality(mids)=240 and cardinality(tids)=16 and(select count(distinct number)=30 and min(number)=1 and max(number)=30 and bool_and(season='2026/27')from public.rounds where competition_id=cid),'exact actual30/240/16 current calendar required');
 -- Removed cleanup goal identities retain target/match association for deleted
 -- assist audits even after legitimate cleanup/import has replaced those goals.
 select coalesce(jsonb_agg(g order by g::text),'[]')into goalrefs from(select jsonb_build_object('id',id,'match_id',match_id)g from public.goals where match_id=any(mids)or scorer_id=any(pids)or assist_player_id=any(pids)union select jsonb_build_object('id',(g->>'id')::bigint,'match_id',(g->>'match_id')::bigint)from private_fcf_future_history.cleanup_receipt r cross join lateral jsonb_array_elements(r.before_image_text::jsonb->'goals')g where(g->>'match_id')::bigint=any(mids))s;
 perform private_fcf_six_target_release.require(not exists(select 1 from scout.dnevnik x where(x.player_id=any(pids)or x.team_id=any(tids)or x.parametri->>'selekcija'='797'or x.parametri->>'competition_id'='797')and x.parametri ? 'igralci'and(jsonb_typeof(x.parametri->'igralci')<>'array'or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(x.parametri->'igralci')='array'then x.parametri->'igralci'else '[]'::jsonb end)j where jsonb_typeof(j)<>'number'or j::text!~'^[1-9][0-9]{0,18}$'))),'unreviewed target-associated Scout player-array payload');
 -- A target-club event audit needs an actual event, player or selection
 -- association in BOTH reviewed Scout variants. Empty/null metadata is not an
 -- association; unrelated shared-club events remain outside the target scope.
 event_resolution:=case when to_regclass('scout.dogodki')is not null then
  ' and not exists(select 1 from scout.dogodki e where e.id::text=x.parametri->>''dogodek'')'else ''end;
 execute 'select count(*)from scout.dnevnik x where x.team_id=any($1) and x.parametri ? ''dogodek''
  and not exists(select 1 from public.players p where p.id=x.player_id or p.id::text in(
   select jsonb_array_elements_text(case when jsonb_typeof(x.parametri->''igralci'')=''array''then x.parametri->''igralci''else ''[]''::jsonb end)))
  and not exists(select 1 from public.competitions co where co.id::text in(x.parametri->>''selekcija'',x.parametri->>''competition_id''))'
  ||event_resolution into n using tids;
 perform private_fcf_six_target_release.require(n=0,'unresolved target-club Scout event audit association');

 for q in select key,value from jsonb_each(registry)order by key loop
  execute format('select coalesce(jsonb_agg(to_jsonb(x)order by to_jsonb(x)::text collate "C"),''[]''::jsonb)from %s x where %s',q.key,q.value->>'where')into rows using pids,rids,mids,ftids,goalrefs,tids,null::bigint,null::bigint;
  n:=jsonb_array_length(rows);
  stats:=stats||jsonb_build_object(q.key,jsonb_build_object('count',n,'rowsSha256',encode(sha256(convert_to(rows::text,'UTF8')),'hex'),'globalUser',q.value->'user'));
  if(q.value->>'user')::boolean then global_users:=global_users+n;end if;
 end loop;
 global_users:=global_users+(select count(*)from public.goals where(match_id=any(mids)or scorer_id=any(pids)or assist_player_id=any(pids))and(assist_player_id is not null or assist_confirmed_at is not null or assist_none_confirmed_at is not null));
 select count(*)into rosters from public.fantasy_roster where fantasy_team_id=any(ftids)or player_id=any(pids);
 for rr in select *from public.rounds where id=any(rids)order by id loop
  rn:=0;
  for q in select key,value from jsonb_each(registry)where value->>'round'<>'false'and key not in('public.fantasy_lineups','public.fantasy_transfers','public.fantasy_chips')loop
   execute format('select count(*)from %s x where %s',q.key,q.value->>'round')into n using pids,rids,mids,ftids,goalrefs,tids,rr.id,null::bigint;rn:=rn+n;
  end loop;
  round_counts:=round_counts||jsonb_build_array(jsonb_build_object('roundId',rr.id,'lineupRows',(select count(*)from public.fantasy_lineups where round_id=rr.id),'rosterRows',rosters,'transferRows',(select count(*)from public.fantasy_transfers where round_id=rr.id),'chipRows',(select count(*)from public.fantasy_chips where round_id=rr.id),'userRows',rn));
 end loop;
 for mm in select *from public.matches where id=any(mids)order by id loop
  mn:=0;
  for q in select key,value from jsonb_each(registry)where value->>'match'<>'false'loop
   execute format('select count(*)from %s x where %s',q.key,q.value->>'match')into n using pids,rids,mids,ftids,goalrefs,tids,null::bigint,mm.id;mn:=mn+n;
  end loop;
  mn:=mn+(select count(*)from public.goals where match_id=mm.id and(assist_player_id is not null or assist_confirmed_at is not null or assist_none_confirmed_at is not null));
  match_counts:=match_counts||jsonb_build_array(jsonb_build_object('matchId',mm.id,'appearances',(select count(*)from public.appearances where match_id=mm.id),'goals',(select count(*)from public.goals where match_id=mm.id),'userRows',mn));
 end loop;
 -- Return only mapper identity/football/privacy facts. Full player rows,
 -- including private departure actors, remain in the protected relation hash.
 select jsonb_build_object('capturedUTC',stamp,'method','explicitBEGIN_READ_ONLY_ROLLBACK','groups',(select jsonb_agg(jsonb_build_object('id',co.id,'slug',co.slug,'country_id',co.country_id,'active',co.active,'source',co.source,'sourceLeagueCode',co.source_league_code,'sezona_koledarska',co.sezona_koledarska,'source_policy',co.source_policy,'nativeImportedIDs',coalesce((select jsonb_agg(substring(m.zapisnik_id from 3)order by m.zapisnik_id)from matches m join rounds r on r.id=m.round_id where r.competition_id=co.id and m.imported_at is not null and m.zapisnik_id is not null),'[]')))from competitions co where co.id in(783,790,797)),'teams',(select jsonb_agg(to_jsonb(t)||jsonb_build_object('competition_id',cid)order by t.id)from teams t where t.id in(select m.home_team_id from matches m join rounds r on r.id=m.round_id where r.competition_id=cid union select m.away_team_id from matches m join rounds r on r.id=m.round_id where r.competition_id=cid)),'rounds',(select jsonb_agg(to_jsonb(r)order by number)from rounds r where competition_id=cid),'matches',(select jsonb_agg(to_jsonb(m)order by m.id)from matches m join rounds r on r.id=m.round_id where r.competition_id=cid),'players',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'competition_id',p.competition_id,'team_id',p.team_id,'reg_st',p.reg_st,'full_name',p.full_name,'position',p.position,'position_source',p.position_source,'anonimiziran_at',p.anonimiziran_at,'anonimiziran_razlog',p.anonimiziran_razlog)order by p.id),'[]')from players p where competition_id=cid),'installedMarkers',(select jsonb_agg(public.get_installed_historical_statistics_markers(co.id)order by co.id)from competitions co where co.id in(783,790,797)),'existingExceptionBindings',(select jsonb_agg(to_jsonb(b)order by source_club_id,source_category_id)from private_historical_statistics.source_club_bindings b where provider='fcf'),'identityPrivacy',jsonb_build_object('schemaVersion',1,'kind','fcf-native-privacy-projection','countryCode','ES','countryId',c.country_id,'targetCompetitionId',cid,'method','explicitBEGIN_READ_ONLY_ROLLBACK','capturedUTC',stamp,'complete',true,'checkedKeys',to_jsonb(p_privacy_keys),'matches',(select coalesce(jsonb_agg(jsonb_build_object('player_id',p.id,'competition_id',p.competition_id,'country_id',co.country_id,'kljuc',k.kljuc,'anonimiziran_at',p.anonimiziran_at,'anonimiziran_razlog',p.anonimiziran_razlog)order by p.id,k.kljuc),'[]')from anonimizirani_igralci k join players p on p.id=k.player_id join competitions co on co.id=p.competition_id where co.country_id=c.country_id and k.kljuc=any(p_privacy_keys)and p.anonimiziran_at is not null)))into inventory;
 native:=jsonb_build_object('competition',to_jsonb(c),'rounds',(select jsonb_agg(to_jsonb(r)order by id)from public.rounds r where id=any(rids)),'matches',(select jsonb_agg(to_jsonb(m)order by id)from public.matches m where id=any(mids)),'dependencies',jsonb_build_object('complete',true,'competitionUserRows',global_users,'rounds',round_counts,'matches',match_counts));
 price_text:=private_fcf_six_target_release.pricing_snapshot(797)::text;
 before_text:=jsonb_build_object('schemaVersion',1,'classification','fcf-future-projection-current-v1','native',native,'catalog',catalog,'shapes',shapes,'relations',stats,'goalAssociations',goalrefs,'privacy',(inventory->'identityPrivacy')-'capturedUTC','pricingSnapshotText',price_text)::text;
 return jsonb_build_object('schemaVersion',1,'kind','fcf-future-native-projection','capturedUTC',stamp,'method','explicitBEGIN_READ_ONLY_ROLLBACK','databaseInventory',inventory,'native',native,'dependencySnapshotText',before_text,'dependencySnapshotSha256',encode(sha256(convert_to(before_text,'UTF8')),'hex'),'pricingSnapshot',jsonb_build_object('snapshotText',price_text,'snapshotSha256',encode(sha256(convert_to(price_text,'UTF8')),'hex')));
end $projection$;
revoke all on function private_fcf_future_projection.capture(text,text[])from public,anon,authenticated,service_role;
create function public.fcf_future_current_target_projection(p_slug text,p_privacy_keys text[])returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$begin
 perform private_fcf_six_target_release.require(current_setting('transaction_read_only')='on','explicit readonly transaction required');
 return private_fcf_future_projection.capture(p_slug,p_privacy_keys);
end$$;
revoke all on function public.fcf_future_current_target_projection(text,text[])from public,anon,authenticated;
grant execute on function public.fcf_future_current_target_projection(text,text[])to service_role;
