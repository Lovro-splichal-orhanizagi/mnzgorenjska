-- Koliko je posameznik prispeval k statistiki.
--
-- Zakaj: pozicije in asistence za slovenske amaterske lige NE OBSTAJAJO,
-- dokler jih skupnost ne ustvari — zapisnik označi le vratarja. 948 glasov za
-- pozicije in 406 za asistence je torej podatek, ki ga ni nikjer drugje, in
-- naredili so ga uporabniki. Doslej tega nihče ni videl.
--
-- Pomembnejši od števila oddanih glasov je, koliko jih je OBVELJALO: glas,
-- ki se je pridružil večini in prestopil prag, je resnično nekaj spremenil.
-- Zato štejemo oboje.
create or replace view moj_prispevek as
  select v.voter_id,
         count(*) filter (where v.vrsta = 'pozicija') as glasov_pozicij,
         count(*) filter (where v.vrsta = 'asistenca') as glasov_asistenc,
         count(*) filter (where v.vrsta = 'pozicija' and v.obveljal) as obveljalo_pozicij,
         count(*) filter (where v.vrsta = 'asistenca' and v.obveljal) as obveljalo_asistenc
    from (
      -- Glas za pozicijo obvelja, kadar je igralčeva potrjena pozicija enaka
      -- tisti, ki jo je človek izbral.
      select pv.voter_id, 'pozicija'::text vrsta,
             (p.position is not null and p.position = pv.position) obveljal
        from position_votes pv
        join players p on p.id = pv.player_id
      union all
      -- Asistenca obvelja, kadar je gol dobil prav tega podajalca.
      select av.voter_id, 'asistenca'::text,
             (g.assist_player_id is not null and g.assist_player_id = av.player_id)
        from assist_votes av
        join goals g on g.id = av.goal_id
    ) v
   group by v.voter_id;

comment on view moj_prispevek is
  'Koliko glasov je človek oddal in koliko jih je obveljalo — pozicije in asistence za te lige obstajajo samo zato, ker jih skupnost ustvari.';

grant select on moj_prispevek to anon, authenticated;
