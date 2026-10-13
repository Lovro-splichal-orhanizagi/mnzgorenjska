-- Vklop 227 lig (odločitev lastnika 13. 10. 2026: "sure turn on those
-- leagues"): hrvaške U19 in VP, madžarske (prvi vklop Madžarske) in slovaške
-- lige, ki jih je potrdila pripravljenost (oceniPripravljenost na stanje_lige
-- 13. 10. 2026 ob 09:00). Madžarske lige, ki še čakajo na arhiv (19, cena), in
-- slovaške brez krogov ostanejo izklopljene.
--
-- vklopi_ligo_sredi_sezone postavi prvi fantasy krog na prvi krog za zadnjim
-- krogom z zapisniki; zavrnjen vklop pusti ligo izklopljeno in izpiše razlog.
do $$
declare
  s text;
  r jsonb;
begin
  foreach s in array array[
    'hr-bj-u19-jug', 'hr-bj-u19-sjever', 'hr-bp-u19', 'hr-is-u19-a',
    'hr-is-u19-b', 'hr-ka-u19', 'hr-ku-u19', 'hr-kz-u19', 'hr-na-u19',
    'hr-sm-u19', 'hr-u19-1hnl', 'hr-u19-1nl-centar', 'hr-u19-1nl-istok',
    'hr-u19-1nl-rijeka', 'hr-u19-1nl-sjever', 'hr-u19-1nl-split', 'hr-u19-2nl',
    'hr-u19-2nl-b', 'hr-u19-2nl-centar', 'hr-u19-2nl-split',
    'hr-u19-3nl-centar', 'hr-vp-druga-znl-istok', 'hr-vp-druga-znl-zapad',
    'hr-vs-u19', 'hr-vz-u19', 'hr-zg-u19-1znl', 'hr-zg-u19-2znl',
    'hr-zz-u19-1liga', 'hr-zz-u19-2liga', 'hu-ba-1', 'hu-ba-2', 'hu-ba-3-b',
    'hu-ba-u19-1', 'hu-baz-1', 'hu-baz-2-eszak', 'hu-baz-2-kelet',
    'hu-baz-2-kozep', 'hu-baz-3-del', 'hu-baz-3-eszak', 'hu-baz-3-kelet',
    'hu-baz-u19-1', 'hu-baz-u19-2-eszak', 'hu-baz-u19-2-kelet', 'hu-be-1',
    'hu-be-2', 'hu-be-3-del', 'hu-be-3-eszak', 'hu-be-u19-del',
    'hu-be-u19-eszak', 'hu-bk-1', 'hu-bk-2-del', 'hu-bk-2-eszak',
    'hu-bk-3-del', 'hu-bk-3-eszak', 'hu-bk-3-nyugat', 'hu-bp-1', 'hu-bp-2',
    'hu-bp-3-1', 'hu-bp-3-2', 'hu-bp-3-3', 'hu-bp-4-1', 'hu-bp-4-2',
    'hu-bp-4-3', 'hu-cs-1', 'hu-cs-2', 'hu-cs-3', 'hu-cs-4-homokhat',
    'hu-cs-4-tisza-maros', 'hu-fe-1', 'hu-fe-2-del', 'hu-fe-2-eszak',
    'hu-fe-3-del', 'hu-fe-3-eszak', 'hu-fe-u19-1', 'hu-fe-u19-2-del',
    'hu-fe-u19-2-eszak', 'hu-fe-u19-2-nyugat', 'hu-gy-1', 'hu-gy-2-eszak',
    'hu-gy-2-kelet', 'hu-gy-2-nyugat', 'hu-gy-3-eszak', 'hu-gy-3-kelet-a',
    'hu-gy-3-kelet-b', 'hu-gy-3-nyugat-a', 'hu-gy-3-nyugat-b', 'hu-hb-1',
    'hu-hb-2-del', 'hu-hb-2-eszak', 'hu-hb-3-del', 'hu-hb-3-eszak', 'hu-he-1',
    'hu-he-2', 'hu-he-3', 'hu-jn-1', 'hu-jn-2', 'hu-jn-3', 'hu-jn-u19-1',
    'hu-jn-u19-teruleti', 'hu-ke-1', 'hu-ke-2', 'hu-ke-3-del', 'hu-ke-3-eszak',
    'hu-ke-u19-1', 'hu-ke-u19-2', 'hu-nb1', 'hu-nb2', 'hu-nb3-del-kelet',
    'hu-nb3-del-nyugat', 'hu-nb3-eszak-kelet', 'hu-nb3-eszak-nyugat',
    'hu-no-1', 'hu-no-2', 'hu-no-3-kelet', 'hu-no-3-nyugat', 'hu-pe-1',
    'hu-pe-2-del', 'hu-pe-2-eszak', 'hu-pe-3-del', 'hu-pe-3-eszak',
    'hu-pe-3-kelet', 'hu-pe-4-delkelet', 'hu-pe-4-eszak', 'hu-pe-4-kelet',
    'hu-pe-4-nyugat', 'hu-pe-u19-b', 'hu-pe-u19-e', 'hu-so-1', 'hu-so-2',
    'hu-so-3-del', 'hu-so-3-eszak', 'hu-so-4-del', 'hu-so-4-eszak',
    'hu-so-u19-1', 'hu-so-u19-2-del', 'hu-so-u19-2-eszak', 'hu-sz-1',
    'hu-sz-2-1', 'hu-sz-2-2', 'hu-sz-3-kelet', 'hu-sz-3-kozep',
    'hu-sz-3-nyugat', 'hu-sz-u19-1', 'hu-sz-u19-2-1', 'hu-sz-u19-2-2',
    'hu-to-3-kelet', 'hu-to-u19', 'hu-u19-delkelet', 'hu-u19-delnyugat',
    'hu-u19-eszakkelet', 'hu-u19-eszaknyugat', 'hu-u19-kelet',
    'hu-u19-kiemelt-kelet', 'hu-u19-kiemelt-nyugat', 'hu-u19-kozepkelet',
    'hu-u19-kozepnyugat', 'hu-va-1', 'hu-va-2-sarvar', 'hu-va-2-szombathely',
    'hu-va-3-kormend', 'hu-va-3-sarvar', 'hu-va-3-szombathely', 'hu-ve-1',
    'hu-ve-3-eszak', 'hu-ve-3-kelet', 'hu-ve-3-nyugat', 'hu-ve-u19', 'hu-za-1',
    'hu-za-2', 'hu-za-3-del', 'hu-za-3-eszak', 'hu-za-3-kelet',
    'hu-za-3-kozep', 'hu-za-3-nyugat', 'hu-za-u19', 'sk-ba-6liga',
    'sk-ba-7liga', 'sk-bav-6liga', 'sk-bav-7liga', 'sk-bav-u19',
    'sk-bfz-4liga', 'sk-bfz-5liga', 'sk-bfz-u19-3liga', 'sk-ds-7liga',
    'sk-ds-8liga', 'sk-ga-7liga-a', 'sk-ga-7liga-b', 'sk-kn-7liga',
    'sk-lc-u19', 'sk-lv-7liga', 'sk-lv-8liga', 'sk-nike-liga', 'sk-nr-7liga',
    'sk-nr-8liga-a', 'sk-nr-8liga-b', 'sk-nz-7liga', 'sk-nz-8liga',
    'sk-rs-7liga', 'sk-sfz-2liga', 'sk-sfz-3liga-stred', 'sk-sfz-3liga-vychod',
    'sk-sfz-3liga-zapad', 'sk-sfz-u19-1liga', 'sk-sfz-u19-2liga-vychod',
    'sk-sfz-u19-2liga-zapad', 'sk-tn-7liga', 'sk-tn-8liga-juh',
    'sk-tn-8liga-sever', 'sk-tn-9liga', 'sk-tt-7liga', 'sk-tt-8liga-maxima',
    'sk-tt-8liga-rubbex', 'sk-tt-9liga', 'sk-zsfz-4liga',
    'sk-zsfz-5liga-juhovychod', 'sk-zsfz-5liga-severozapad',
    'sk-zsfz-6liga-juh', 'sk-zsfz-6liga-sever', 'sk-zsfz-6liga-severovychod',
    'sk-zsfz-6liga-stred', 'sk-zsfz-6liga-vychod', 'sk-zsfz-6liga-zapad',
    'sk-zsfz-u19-3liga-jv', 'sk-zsfz-u19-3liga-sz', 'sk-zsfz-u19-4liga-a',
    'sk-zsfz-u19-4liga-b', 'sk-zsfz-u19-4liga-c1'
  ] loop
    r := public.vklopi_ligo_sredi_sezone(s);
    raise notice 'vklop %: %', s, r;
  end loop;
end $$;
