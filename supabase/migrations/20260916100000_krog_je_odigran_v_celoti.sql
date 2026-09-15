-- Krog je odigran sele, ko so uvozene VSE njegove tekme.
--
-- Doslej je zadostovala ena sama: `exists (imported_at is not null)`. V
-- amaterski ligi zapisniki ne pridejo hkrati — nekateri v nedeljo zvecer,
-- drugi cez tri dni. Nocna borza (`uveljavi_zapadle_cene`, pg_cron ob 3:30)
-- je tak krog obravnavala kot koncan in ovrednotila tudi igralce, katerih
-- tekme se ni bilo v bazi. Ti so v obdobju forme steli nic tock, dobili
-- -0.1 ali -0.2 in — ker `preracunaj_cene` izpusti igralca, ki za ta krog ze
-- ima vrstico v `price_changes` — popravka pozneje ni bilo. Kdor je v soboto
-- zabil hat-trick, zapisnik pa je izsel v sredo, je zaradi tega padel v ceni
-- in ostal padel.
--
-- Ce kaksna tekma ne pride nikoli (prelozena, razveljavljena), krog ostane
-- neodigran in `uveljavi_zapadle_cene` ga po stirinajstih dneh preskoci.
-- Borza torej tak krog raje izpusti, kot da bi ga obracunala narobe.
create or replace function public.krog_je_odigran(p_round_id bigint)
returns boolean
language sql
stable
as $function$
  select exists (
           select 1 from matches m where m.round_id = p_round_id
         )
     and not exists (
           select 1 from matches m
            where m.round_id = p_round_id and m.imported_at is null
         );
$function$;

comment on function public.krog_je_odigran(bigint) is
  'Ali so uvozene vse tekme kroga. Delno uvozen krog ni odigran — borza bi sicer ovrednotila igralce brez zapisnika.';
