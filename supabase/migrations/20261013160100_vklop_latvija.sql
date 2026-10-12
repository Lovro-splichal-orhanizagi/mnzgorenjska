-- Vklop osmih latvijskih lig LFF (odločitev lastnika 12. 10. 2026: "just push
-- it live"). Uvoz 2025 + 2026 je uspel, pripravljenost-lige je vse potrdila:
-- Virslīga 372 igralcev (29.8 % privzeta cena, vrh 12), 1. līga 577, 2. līga
-- A/B, 3. līga Centrs/Ziemeļi/Austrumi/Rietumi (46–50 % privzeta cena).
--
-- vklopi_ligo_sredi_sezone postavi prvi fantasy krog na prvi krog za zadnjim
-- krogom z zapisniki; liga brez takega kroga (sezona končana) ostane
-- izklopljena in razlog se izpiše — tak vklop odloči človek. U19 ni tu
-- (uvoz še teče, sezona 2026 je odigrana).
do $$
declare
  s text;
  r jsonb;
begin
  foreach s in array array['lv-virsliga', 'lv-1-liga', 'lv-2-liga-a', 'lv-2-liga-b',
                           'lv-3-liga-centrs', 'lv-3-liga-ziemeli',
                           'lv-3-liga-austrumi', 'lv-3-liga-rietumi'] loop
    r := public.vklopi_ligo_sredi_sezone(s);
    raise notice 'vklop %: %', s, r;
  end loop;
end $$;
