-- Vklop 67 lig (odločitev lastnika 13. 10. 2026: "yes switch them all on"):
-- vse izklopljene lige, ki jih potrdi pripravljenost na stanje_lige (cenik:
-- največ 70 % privzetih cen, vrh vsaj 8; menjave prebrane; noben gol brez
-- nastopa; krogi v tekoči sezoni) 13. 10. 2026 zvečer. EE 11, HR 3, HU 9, LV 7, MK 5, PL 8, RO 17, RS 1, SK 6.
-- Prvi vklop Estonije, Poljske in Romunije (izbirnik držav jih pokaže sam).
-- Izpuščeno: Katalonija (ES, do privolitve FCF) in sk-vsfz-u19-3liga-a (uvoz
-- je med pisanjem še tekel).
--
-- vklopi_ligo_sredi_sezone postavi prvi fantasy krog na prvi krog za zadnjim
-- krogom z zapisniki; ligo, ki ne prestane varovalke vklopa (kader, cenik,
-- klop …), pusti izklopljeno in izpiše razlog.
do $$
declare
  s text;
  r jsonb;
begin
  foreach s in array array[
    'ee-esiliiga', 'ee-esiliiga-b', 'ee-ii-liiga', 'ee-ii-liiga-b-louna-ida',
    'ee-ii-liiga-b-pohi-laas', 'ee-iii-liiga-louna-ida',
    'ee-iii-liiga-pohi-ida', 'ee-iii-liiga-pohi-laas', 'ee-iv-liiga-pohja-ida',
    'ee-iv-liiga-pohja-laane', 'ee-premium-liiga', 'hr-bp-u19',
    'hr-vp-druga-znl-istok', 'hr-vp-druga-znl-zapad', 'hu-ba-3-a',
    'hu-bk-3-kozep', 'hu-bp-4-1', 'hu-bp-4-2', 'hu-pe-u19-e',
    'hu-u19-kozepkelet', 'hu-va-2-kormend', 'hu-ve-2', 'hu-za-3-kozep',
    'lv-2-liga-a', 'lv-2-liga-b', 'lv-3-liga-austrumi', 'lv-3-liga-centrs',
    'lv-3-liga-rietumi', 'lv-3-liga-ziemeli', 'lv-u19', 'mk-region-2',
    'mk-region-4', 'mk-u19-super', 'mk-u19-vtora', 'mk-vtora-mfl',
    'pl-sk-4-liga', 'pl-sk-a-kielce-1', 'pl-sk-a-kielce-2',
    'pl-sk-a-sandomierz', 'pl-sk-b-kielce-1', 'pl-sk-b-kielce-2',
    'pl-sk-b-sandomierz', 'pl-sk-okregowa', 'ro-ab-l4-s2', 'ro-ab-superliga',
    'ro-cj-l4', 'ro-cj-l5-g2', 'ro-hd-l4', 'ro-liga2', 'ro-liga3-s1',
    'ro-liga3-s2', 'ro-liga3-s3', 'ro-liga3-s4', 'ro-liga3-s5', 'ro-liga3-s6',
    'ro-liga3-s7', 'ro-liga3-s8', 'ro-ph-l4', 'ro-sb-superliga', 'ro-superliga',
    'rs-bg-mladenovac', 'sk-nz-u19', 'sk-tt-u19', 'sk-zsfz-u19-4liga-c2',
    'sk-zsfz-u19-4liga-d', 'sk-zsfz-u19-4liga-e', 'sk-zsfz-u19-4liga-f'
  ] loop
    r := vklopi_ligo_sredi_sezone(s);
    raise notice '% → %', s, r;
  end loop;
end;
$$;
