-- Verified identities only: no imports or activation. Nordost is untouched.
insert into federations(country_id,code,name,short_name,site_url,sort_order)
select d.id,v.* from countries d cross join (values
 ('nfv-nord','Norddeutscher Fußballverband e.V.','NFV','https://www.nordfv.de/spielbetrieb/ligen/',1402),
 ('wdfv','Westdeutscher Fußballverband e.V.','WDFV','https://wdfv.de/spielbetrieb/herren-regionalliga-west',1403),
 ('rlsw','Regionalliga Südwest GmbH','RLSW','https://www.regionalliga-suedwest.de/Spielbetrieb/',1404),
 ('bfv-bayern','Bayerischer Fußball-Verband','BFV','https://www.bfv.de/spielbetrieb-verbandsleben/ligabetrieb/regionalliga-bayern',1405)
) v(code,name,short_name,site_url,sort_order) where d.code='DE'
on conflict(code) do nothing;
insert into competitions(slug,name,short_name,country_id,federation_id,source,source_league_code,prvi_fantasy_krog,sort_order,rok_pomak_ur,active,vir_ime,vir_url,sezona_koledarska)
select 'de-regionalliga-'||v.region,'Regionalliga '||v.name,'RL '||v.name,d.id,f.id,'dfb',
 'regionalliga-'||v.region||'/2026-2027',1,v.ord,6,false,'DFB Datencenter',
 'https://datencenter.dfb.de/competitions/regionalliga-'||v.region||'/seasons/2026-2027/teams/'||v.seed,false
from countries d cross join (values
 ('nord','Nord','nfv-nord','vfb-oldenburg',2),('west','West','wdfv','rot-weiss-oberhausen',3),
 ('suedwest','Südwest','rlsw','fsv-frankfurt',4),('bayern','Bayern','bfv-bayern','bayern-muenchen-ii',5)
) v(region,name,federation,seed,ord) join federations f on f.code=v.federation and f.country_id=d.id
where d.code='DE' on conflict(slug) do nothing;
