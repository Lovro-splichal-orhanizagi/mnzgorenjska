-- Trgovina: še štirje personalizirani izdelki (pulover z imenom in številko,
-- šal z imenom ekipe, pivski kozarec z imenom, nalepke ekipe), osnovne cene
-- personaliziranih izdelkov enake kot pri navadnih (majica 27, skodelica 14)
-- in kratki opisi, kjer jih še ni. Novi izdelki so neaktivni; vklopi jih admin
-- (ko imajo slike). Cene in doplačila so v centih z DDV.

insert into trgovina.izdelki (slug, ime_sl, ime_en, kategorija, tax_code, pismo, po_narocilu, digitalni, vrstni_red) values
  ('pulover-ime-stevilka', 'Pulover z imenom in številko', 'Name and number hoodie', 'oblacila', 'txcd_30011000', false, true, false, 125),
  ('sal-ime-ekipe', 'Šal z imenom ekipe', 'Fantasy team scarf', 'dodatki', 'txcd_99999999', false, true, false, 127),
  ('kozarec-ime', 'Pivski kozarec z imenom', 'Personalised beer glass', 'dom', 'txcd_99999999', false, true, false, 135),
  ('nalepke-ekipa', 'Nalepke tvoje ekipe', 'Your team sticker pack', 'nalepke', 'txcd_99999999', true, true, false, 137)
on conflict (slug) do nothing;

insert into trgovina.razlicice (izdelek_id, oznaka_sl, oznaka_en, sku, cena, teza_g, vrstni_red)
select i.id, 'Črna / ' || v.v, 'Black / ' || v.v, 'PIS-CRN-' || v.v, 5500, 550, 10 + v.n
from trgovina.izdelki i,
     (values ('S', 1), ('M', 2), ('L', 3), ('XL', 4), ('XXL', 5)) v(v, n)
where i.slug = 'pulover-ime-stevilka'
  and not exists (select 1 from trgovina.razlicice r where r.izdelek_id = i.id);

insert into trgovina.razlicice (izdelek_id, oznaka_sl, oznaka_en, sku, cena, teza_g, vrstni_red)
select i.id, x.sl, x.en, x.sku, x.cena, x.teza, 0
from trgovina.izdelki i
join (values ('sal-ime-ekipe', 'Ena velikost', 'One size', 'SIE-1', 2200, 150),
             ('kozarec-ime', '0,5 l', '0.5 l', 'KOI-1', 1200, 300),
             ('nalepke-ekipa', 'Komplet', 'Set', 'NAE-1', 500, 20)) x(slug, sl, en, sku, cena, teza)
  on x.slug = i.slug
where not exists (select 1 from trgovina.razlicice r where r.izdelek_id = i.id);

insert into trgovina.personalizacije (izdelek_id, vrsta, doplacilo, obvezna)
select i.id, x.vrsta, x.doplacilo, x.obvezna
from trgovina.izdelki i
join (values ('pulover-ime-stevilka', 'poljubno_ime', 500, true), ('pulover-ime-stevilka', 'stevilka', 300, false),
             ('sal-ime-ekipe', 'ime_ekipe', 500, true),
             ('kozarec-ime', 'poljubno_ime', 500, true),
             ('nalepke-ekipa', 'ime_ekipe', 300, true)) x(slug, vrsta, doplacilo, obvezna)
  on x.slug = i.slug
where not exists (select 1 from trgovina.personalizacije p where p.izdelek_id = i.id and p.vrsta = x.vrsta);

-- Personalizirana majica ni cenejša od navadne: osnova kot navadna, doplačilo za tisk.
update trgovina.razlicice r set cena = 2700
from trgovina.izdelki i
where i.id = r.izdelek_id and i.slug in ('majica-ime-ekipe', 'majica-ime-stevilka', 'majica-prvak') and r.cena = 2500;

update trgovina.razlicice r set cena = 1400
from trgovina.izdelki i
where i.id = r.izdelek_id and i.slug in ('skodelica-ime', 'skodelica-prvak') and r.cena = 1200;

-- Opisi (le kjer jih admin še ni vpisal).
update trgovina.izdelki i set opis_sl = x.sl, opis_en = x.en
from (values
  ('majica', 'Bombažna majica z grbom SLFF na prsih. Udoben kroj za tekmo, trening ali kafano.',
             'Cotton T-shirt with the SLFF crest on the chest. A comfortable fit for match day, training or the pub.'),
  ('pulover', 'Topel pulover s kapuco in grbom SLFF. Za hladne nedeljske tekme ob igrišču.',
              'Warm hoodie with the SLFF crest. For cold Sunday matches on the touchline.'),
  ('sal', 'Navijaški šal v barvah SLFF z napisom Sunday League.',
          'Supporter scarf in SLFF colours with the Sunday League lettering.'),
  ('kapa', 'Zimska kapa z grbom SLFF.', 'Winter beanie with the SLFF crest.'),
  ('skodelica', 'Keramična skodelica z grbom SLFF, 330 ml. Za jutranjo kavo in pregled točk kroga.',
                'Ceramic mug with the SLFF crest, 330 ml. For the morning coffee and checking the round''s points.'),
  ('pivski-kozarec', 'Pivski kozarec 0,5 l z grbom SLFF. Za tretji polčas.',
                     'Half-litre beer glass with the SLFF crest. For the third half.'),
  ('nalepke', 'Komplet nalepk SLFF: grb, logotip in maskota. Pošljemo s pismom.',
              'SLFF sticker set: crest, logo and mascot. Sent by letter.'),
  ('majica-ime-ekipe', 'Majica z imenom tvoje fantasy ekipe na hrbtu in po želji s številko. Izbereš eno od svojih ekip.',
                       'T-shirt with your fantasy team''s name on the back and an optional number. Pick one of your teams.'),
  ('majica-ime-stevilka', 'Majica s poljubnim imenom (do 12 znakov) in po želji številko na hrbtu.',
                          'T-shirt with a name of your choice (up to 12 characters) and an optional number on the back.'),
  ('pulover-ime-stevilka', 'Pulover s kapuco in grbom SLFF, na hrbtu tvoje ime (do 12 znakov) in po želji številka.',
                           'SLFF hoodie with your name (up to 12 characters) and an optional number on the back.'),
  ('skodelica-ime', 'Skodelica z grbom SLFF in tvojim imenom (do 12 znakov).',
                    'SLFF mug with your name (up to 12 characters).'),
  ('kozarec-ime', 'Pivski kozarec 0,5 l z grbom SLFF in tvojim imenom (do 12 znakov).',
                  'Half-litre SLFF beer glass with your name (up to 12 characters).'),
  ('sal-ime-ekipe', 'Navijaški šal SLFF z imenom tvoje fantasy ekipe.',
                    'SLFF supporter scarf with your fantasy team''s name.'),
  ('nalepke-ekipa', 'Komplet nalepk z grbom SLFF in imenom tvoje fantasy ekipe. Pošljemo s pismom.',
                    'Sticker set with the SLFF crest and your fantasy team''s name. Sent by letter.'),
  ('majica-prvak', 'Majica za prvaka mini lige: na hrbtu ime lige in sezona. Kupi jo lahko le lastnik zmagovalne ekipe končane sezone.',
                   'Shirt for a mini league champion, with the league name and season on the back. Only the owner of the winning team of a finished season can buy it.'),
  ('skodelica-prvak', 'Skodelica prvaka mini lige z imenom lige in sezono. Le za lastnika zmagovalne ekipe.',
                      'Mini league champion mug with the league name and season. Only for the owner of the winning team.'),
  ('znacka', 'Natisnjena značka preverjenega igralca z imenom s tvojega profila. Za igralce z doživljenjsko preverjenostjo.',
             'Printed verified player badge with the name from your profile. For players with lifetime verification.'),
  ('darilni-bon', 'Darilni bon za trgovino SLFF. Kodo pošljemo po e-pošti takoj po plačilu, velja eno leto.',
                  'Gift card for the SLFF shop. We email the code right after payment; it is valid for one year.')
) x(slug, sl, en)
where i.slug = x.slug and coalesce(i.opis_sl, '') = '';
